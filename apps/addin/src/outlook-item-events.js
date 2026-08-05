const ITEM_IDENTITY_FIELDS = Object.freeze([
  "graph_message_id",
  "internet_message_id",
  "conversation_id",
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function outlookItemIdentityKey(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "";
  const values = ITEM_IDENTITY_FIELDS.map((field) => text(snapshot[field]));
  return values.every(Boolean) ? values.join("\u001f") : "";
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
