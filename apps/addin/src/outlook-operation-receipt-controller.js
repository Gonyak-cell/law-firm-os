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

  function clear({ rotateScope = true } = {}) {
    archive.clear();
    if (rotateScope) archive.setScope(nextScope());
  }

  function setSessionScope() {
    archive.setScope(nextScope());
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
    const body = await requestJson("/api/outlook/operation-receipts/readback", {
      method: "POST",
      body: { matter_id: matterId, current_item: currentItemFields(currentItem) },
    });
    if (!isCurrent()) return Object.freeze([]);
    for (const summary of Array.isArray(body?.items) ? body.items : []) {
      const sanitized = sanitizeOutlookOperationReceiptSummary(summary);
      if (sanitized?.item_context_ref === ref && sanitized.matter_id === matterId) {
        archive.recordSummary(sanitized);
      }
    }
    return archive.listForContext({ itemContextRef: ref, matterId });
  }

  return Object.freeze({
    archive,
    clear,
    setSessionScope,
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
