const OUTLOOK_ITEM_MODES = new Set(["read", "compose"]);
const OUTLOOK_ITEM_PROVENANCE = new Set(["received", "sent", "draft"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function outlookItemIdentityKey(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "";
  const values = [
    text(snapshot.rest_message_id) || text(snapshot.graph_message_id),
    text(snapshot.internet_message_id),
    text(snapshot.conversation_id),
  ];
  return values.every(Boolean) ? values.join("\u001f") : "";
}

export function outlookItemContextKey({ item, mode, provenance } = {}) {
  const itemKey = outlookItemIdentityKey(item);
  const nextMode = text(mode);
  const nextProvenance = text(provenance);
  return itemKey
    && OUTLOOK_ITEM_MODES.has(nextMode)
    && OUTLOOK_ITEM_PROVENANCE.has(nextProvenance)
    ? [itemKey, nextMode, nextProvenance].join("\u001e")
    : "";
}

function requiredText(value, field, maxLength = 2048) {
  const next = text(value);
  if (!next || next.length > maxLength) throw new TypeError(`${field} is required`);
  return next;
}

export function createOutlookOperationSnapshot({
  item,
  mode,
  provenance,
  matterId,
  operationStartKey,
} = {}) {
  const itemContextKey = outlookItemContextKey({ item, mode, provenance });
  if (!itemContextKey) throw new TypeError("stable Outlook item context is required");
  const nextMatterId = requiredText(matterId, "matter_id", 512);
  const nextOperationStartKey = requiredText(
    operationStartKey,
    "operation_start_key",
    512,
  );
  const restMessageId = requiredText(
    item?.rest_message_id ?? item?.graph_message_id,
    "rest_message_id",
  );
  const canonicalGraphMessageId = text(item?.canonical_graph_message_id);
  const itemIdentity = Object.freeze({
    rest_message_id: restMessageId,
    internet_message_id: requiredText(item?.internet_message_id, "internet_message_id"),
    conversation_id: requiredText(item?.conversation_id, "conversation_id"),
    immutable_item_key: outlookItemIdentityKey(item),
    ...(canonicalGraphMessageId
      ? { canonical_graph_message_id: canonicalGraphMessageId }
      : {}),
  });
  return Object.freeze({
    item_identity: itemIdentity,
    item_context_key: itemContextKey,
    mode: text(mode),
    provenance: text(provenance),
    matter_id: nextMatterId,
    operation_start_key: nextOperationStartKey,
    operation_context_key: [
      itemContextKey,
      nextMatterId,
      nextOperationStartKey,
    ].join("\u001d"),
  });
}

export function isOutlookOperationSnapshotCurrent({
  snapshot,
  currentItem,
  currentMode,
  currentProvenance,
  currentMatterId,
  currentOperationStartKey,
  currentCanonicalGraphMessageId,
} = {}) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (
    snapshot.item_context_key !== outlookItemContextKey({
      item: currentItem,
      mode: currentMode,
      provenance: currentProvenance,
    })
    || snapshot.matter_id !== text(currentMatterId)
    || snapshot.operation_start_key !== text(currentOperationStartKey)
  ) return false;
  const expectedCanonical = text(
    snapshot.item_identity?.canonical_graph_message_id,
  );
  const currentCanonical = text(
    currentCanonicalGraphMessageId
      ?? currentItem?.canonical_graph_message_id,
  );
  return !expectedCanonical || expectedCanonical === currentCanonical;
}

export function reconcileOutlookOperationResult(input = {}) {
  const current = isOutlookOperationSnapshotCurrent(input);
  const matterChanged = input?.snapshot?.matter_id !== text(input.currentMatterId);
  return Object.freeze({
    state: current ? "complete" : "stale_item",
    apply_to_current_view: current,
    server_write_completed: input.receipt != null,
    rollback_requested: false,
    recovery_action: current
      ? null
      : matterChanged
        ? "reselect_matter"
        : "retry_current_item",
    receipt: input.receipt ?? null,
    original_operation: input.snapshot ?? null,
  });
}

export function outlookItemChangeDisposition({
  previousContext,
  currentContext,
  openerId,
} = {}) {
  const previousKey = outlookItemContextKey(previousContext);
  const currentKey = outlookItemContextKey(currentContext);
  const changed = Boolean(previousKey) && previousKey !== currentKey;
  return Object.freeze({
    context_changed: changed,
    close_overlay: changed,
    clear_matter_selection: changed,
    restore_focus_to: changed ? text(openerId) || null : null,
    result_state: changed ? "stale_item" : "current",
  });
}

export function isSameOutlookItem(left, right) {
  const leftKey = outlookItemIdentityKey(left);
  return Boolean(leftKey) && leftKey === outlookItemIdentityKey(right);
}

export function isOutlookActionContextCurrent({
  sourceItem,
  currentItem,
  sourceMatterId,
  currentMatterId,
} = {}) {
  const matterId = text(sourceMatterId);
  return Boolean(matterId)
    && matterId === text(currentMatterId)
    && isSameOutlookItem(sourceItem, currentItem);
}

export function isFiledEmailContextCurrent({ emailResult, currentItem, matterId } = {}) {
  const currentKey = outlookItemIdentityKey(currentItem);
  return Boolean(currentKey)
    && emailResult?.local_outlook_item_key === currentKey
    && emailResult?.local_matter_id === text(matterId);
}

/**
 * Keep a pinned Outlook task pane synchronized with the currently selected
 * message. Unsupported hosts safely keep the initial item snapshot.
 */
export function subscribeToOutlookItemChanges({
  Office = globalThis.Office,
  onChange,
} = {}) {
  if (typeof onChange !== "function") {
    throw new TypeError("onChange is required");
  }
  const mailbox = Office?.context?.mailbox;
  if (typeof mailbox?.addHandlerAsync !== "function") return () => {};

  const eventType = Office?.EventType?.ItemChanged ?? "itemChanged";
  let active = true;
  const handler = () => {
    if (active) onChange();
  };
  try {
    mailbox.addHandlerAsync(eventType, handler);
  } catch {
    active = false;
    return () => {};
  }

  return () => {
    if (!active) return;
    active = false;
    try {
      mailbox.removeHandlerAsync?.(eventType, { handler });
    } catch {
      // Best effort during task-pane teardown.
    }
  };
}
