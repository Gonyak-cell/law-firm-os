import {
  isOutlookOperationSnapshotContextCurrent,
  outlookItemContextKey,
  outlookOperationReceiptCanonicalGraphMessageId,
  reconcileOutlookOperationResult,
} from "./outlook-item-events.js";
import {
  createOutlookOperationItemContextRef,
  createOutlookOperationReceiptArchive,
} from "./outlook-operation-receipts.js";
import { sanitizeOutlookOperationReceiptSummary } from "./outlook-operation-receipt-readback.js";

let scopeSequence = 0;
function nextScope() {
  scopeSequence += 1;
  return `addin-session-generation:${scopeSequence}`;
}

function itemContextRef(item) {
  return createOutlookOperationItemContextRef({
    itemContextKey: outlookItemContextKey({
      item,
      mode: item?.mode,
      provenance: item?.provenance,
    }),
    canonicalGraphMessageId: item?.canonical_graph_message_id,
  });
}

function currentItemFields(item) {
  return Object.freeze({
    rest_message_id: item?.rest_message_id,
    canonical_graph_message_id: item?.canonical_graph_message_id,
    internet_message_id: item?.internet_message_id,
    conversation_id: item?.conversation_id,
    mode: item?.mode,
    provenance: item?.provenance,
  });
}

export function createOutlookOperationReceiptController({
  requestJson,
  archive = createOutlookOperationReceiptArchive({ scopeRef: nextScope() }),
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");

  let ownerGeneration = 0;
  let contextGeneration = 0;
  let scopeGeneration = nextScope();
  let contextKey = "";
  let disposed = false;

  function rotateOwnerScope() {
    scopeGeneration = nextScope();
    archive.setScope(scopeGeneration);
  }

  function contextSignature({ currentItem, matterId } = {}) {
    return `${itemContextRef(currentItem)}\u001f${matterId ?? ""}`;
  }

  function captureContext({ currentItem, matterId } = {}) {
    const nextKey = contextSignature({ currentItem, matterId });
    if (nextKey !== contextKey) {
      contextKey = nextKey;
      contextGeneration += 1;
    }
    return Object.freeze({
      key: nextKey,
      generation: contextGeneration,
    });
  }

  function currentContext({ key, generation } = {}) {
    return !disposed
      && key === contextKey
      && generation === contextGeneration;
  }

  function clear({ rotateScope = true } = {}) {
    archive.clear();
    ownerGeneration += 1;
    if (rotateScope) rotateOwnerScope();
  }

  function setSessionScope() {
    clear();
  }

  function invalidateContext() {
    contextKey = "";
    contextGeneration += 1;
  }

  function dispose() {
    if (disposed) return;
    clear({ rotateScope: false });
    invalidateContext();
    disposed = true;
  }

  function recordCompletion({
    operationSnapshot,
    receipt,
    operation = "operation",
    currentItem,
    currentMatterId,
    currentOperationStartKey,
  } = {}) {
    const stored = archive.record({ operationSnapshot, receipt, operation });
    const result = reconcileOutlookOperationResult({
      snapshot: operationSnapshot,
      currentItem,
      currentMode: currentItem?.mode,
      currentProvenance: currentItem?.provenance,
      currentMatterId,
      currentOperationStartKey,
      currentCanonicalGraphMessageId: currentItem?.canonical_graph_message_id,
      actualCanonicalGraphMessageId: outlookOperationReceiptCanonicalGraphMessageId(receipt),
      receipt,
    });
    return Object.freeze({ stored, result });
  }

  function sync({ currentItem, matterId, timeline, documents } = {}) {
    const ref = itemContextRef(currentItem);
    if (!ref || !matterId) return Object.freeze([]);
    const receipts = Array.isArray(timeline) || Array.isArray(documents)
      ? archive.reconcileReadback({ itemContextRef: ref, matterId, timeline, documents })
      : archive.listForContext({ itemContextRef: ref, matterId });
    return receipts;
  }

  async function restore({ matterId, currentItem, isCurrent = () => true } = {}) {
    const ref = itemContextRef(currentItem);
    if (!ref || !matterId) return Object.freeze([]);
    const owner = Object.freeze({
      generation: ownerGeneration,
      scope: scopeGeneration,
    });
    const context = captureContext({ currentItem, matterId });
    const body = await requestJson("/api/outlook/operation-receipts/readback", {
      method: "POST",
      body: { matter_id: matterId, current_item: currentItemFields(currentItem) },
    });
    if (
      disposed
      || owner.generation !== ownerGeneration
      || owner.scope !== scopeGeneration
      || !currentContext(context)
      || !isCurrent()
    ) return Object.freeze([]);
    for (const summary of Array.isArray(body?.items) ? body.items : []) {
      const sanitized = sanitizeOutlookOperationReceiptSummary(summary);
      if (
        sanitized?.item_context_ref === ref
        && sanitized.matter_id === matterId
        && owner.generation === ownerGeneration
        && owner.scope === scopeGeneration
        && currentContext(context)
      ) {
        archive.recordSummary(sanitized);
      }
    }
    if (
      disposed
      || owner.generation !== ownerGeneration
      || owner.scope !== scopeGeneration
      || !currentContext(context)
      || !isCurrent()
    ) return Object.freeze([]);
    return archive.listForContext({ itemContextRef: ref, matterId });
  }

  return Object.freeze({
    archive,
    clear,
    setSessionScope,
    invalidateContext,
    dispose,
    recordCompletion,
    sync,
    restore,
    itemContextRef,
    isCurrentSnapshot({ snapshot, currentItem, currentMatterId, currentOperationStartKey } = {}) {
      return isOutlookOperationSnapshotContextCurrent({
        snapshot,
        currentItem,
        currentMode: currentItem?.mode,
        currentProvenance: currentItem?.provenance,
        currentMatterId,
        currentOperationStartKey,
        currentCanonicalGraphMessageId: currentItem?.canonical_graph_message_id,
      });
    },
  });
}
