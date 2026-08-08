import { saveOutlookAttachments } from "./outlook-attachment-actions.js";
import { outlookActionErrorMessage } from "./inquiry-actions.js";
import { fileOutlookEmail } from "./outlook-filing.js";

function array(value) {
  return Array.isArray(value) ? value : [];
}

function id(value) {
  return typeof value?.attachment_id === "string" ? value.attachment_id.trim() : "";
}

function unique(items, label) {
  const ids = new Set();
  for (const item of items) {
    const itemId = id(item);
    if (!itemId || ids.has(itemId)) throw new TypeError(`${label} contains an invalid or duplicate attachment_id`);
    ids.add(itemId);
  }
  return items;
}

function priorTokens(previousReceipt) {
  const receipts = previousReceipt?.attachments?.receipts;
  if (receipts === undefined) return [];
  if (!Array.isArray(receipts)) throw new TypeError("Previous attachment receipts are invalid");
  return receipts.map((receipt) => {
    const receipt_ref = typeof receipt?.receipt_ref === "string" ? receipt.receipt_ref.trim() : "";
    const receipt_token = typeof receipt?.receipt_token === "string" ? receipt.receipt_token.trim() : "";
    if (!receipt_ref || !receipt_token) throw new TypeError("Previous attachment receipt is incomplete");
    return Object.freeze({ receipt_ref, receipt_token });
  });
}

function issuedReceipt(saved) {
  const receipt = saved?.body?.attachment_receipt;
  if (
    !receipt
    || id(receipt) !== saved.attachment_id
    || !["created", "duplicate"].includes(receipt.outcome)
    || typeof receipt.document_id !== "string"
    || typeof receipt.version_id !== "string"
    || !/^[a-f0-9]{64}$/u.test(receipt.sha256 ?? "")
    || typeof receipt.receipt_ref !== "string"
    || typeof receipt.receipt_token !== "string"
  ) {
    throw new TypeError("Outlook attachment response has no authoritative receipt");
  }
  return receipt;
}

function failure(value, fallback = "attachment content is unavailable") {
  return Object.freeze({
    attachment_id: id(value),
    name: (value?.name ?? id(value)) || "attachment",
    message: value?.message ?? fallback,
    safe_error_code: value?.safe_error_code ?? null,
    retryable: true,
  });
}

function operationReceipt({ matterId, itemKey, email, failures, skipped, requestCount }) {
  const receipts = email.attachment_state.receipts;
  const retryIds = email.attachment_state.retry_attachment_ids;
  const failureById = new Map([...failures, ...skipped].map((item) => [id(item), item]));
  const authoritativeFailures = retryIds.map((attachmentId) => (
    failureById.get(attachmentId) ?? failure({ attachment_id: attachmentId, name: attachmentId })
  ));
  const status = retryIds.length > 0 ? "partial" : "complete";
  return Object.freeze({
    status,
    outcome: status === "complete" ? "attachments_saved" : "partial",
    matter_id: matterId,
    item_key: itemKey,
    email,
    attachments: Object.freeze({
      created_count: receipts.filter(({ outcome }) => outcome === "created").length,
      duplicate_count: receipts.filter(({ outcome }) => outcome === "duplicate").length,
      failed_count: authoritativeFailures.length,
      skipped_count: skipped.length,
      receipts,
      failed: Object.freeze(authoritativeFailures),
      skipped: Object.freeze(skipped),
      request_count: requestCount,
    }),
    retry_attachment_ids: retryIds,
  });
}

export async function fileOutlookEmailWithAttachments({
  matterId,
  email,
  requestJson,
  readAttachments,
  previousReceipt = null,
  errorMessage = outlookActionErrorMessage,
  assertOperationCurrent = () => {},
  onReceipt = () => {},
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  if (typeof readAttachments !== "function") throw new TypeError("readAttachments is required");
  if (
    typeof assertOperationCurrent !== "function"
    || typeof onReceipt !== "function"
  ) throw new TypeError("operation callbacks are required");
  const nextMatterId = typeof matterId === "string" ? matterId.trim() : "";
  let emailReceipt = await fileOutlookEmail({
    matterId: nextMatterId,
    email,
    requestJson,
    priorAttachmentReceipts: priorTokens(previousReceipt),
    assertOperationCurrent,
    onReceipt,
  });
  const itemKey = emailReceipt.item_key;
  const retryIds = [...emailReceipt.attachment_state.retry_attachment_ids];
  if (retryIds.length === 0) {
    return operationReceipt({
      matterId: nextMatterId,
      itemKey,
      email: emailReceipt,
      failures: [],
      skipped: [],
      requestCount: 0,
    });
  }

  const loaded = await readAttachments({
    attachmentIds: retryIds,
    matterId: nextMatterId,
    emailThreadId: emailReceipt.email_thread_id,
  });
  const attachments = unique(array(loaded?.attachments), "Loaded attachments");
  const unsupported = unique(array(loaded?.unsupported), "Unsupported attachments");
  unique([...attachments, ...unsupported], "Loaded attachment result");
  const represented = new Set([...attachments, ...unsupported].map(id));
  if ([...represented].some((attachmentId) => !retryIds.includes(attachmentId))) {
    throw new TypeError("Loaded attachment does not match the authoritative retry set");
  }
  const missing = retryIds
    .filter((attachmentId) => !represented.has(attachmentId))
    .map((attachmentId) => failure({ attachment_id: attachmentId, name: attachmentId }));
  let saved = { result: { saved_attachments: [], failed_attachments: [], request_count: 0 } };
  if (attachments.length > 0) {
    saved = await saveOutlookAttachments({
      currentItem: {
        conversation_id: email.conversation_id,
        canonical_graph_message_id: email.canonical_graph_message_id,
        attachments,
        unsupported: [],
      },
      matterId: nextMatterId,
      emailThreadId: emailReceipt.email_thread_id,
      requestJson,
      errorMessage,
      allowAllFailedResult: true,
      assertOperationCurrent,
      onReceipt,
    });
  }
  const successfulTokens = array(saved.result?.saved_attachments)
    .map(issuedReceipt)
    .map(({ receipt_ref, receipt_token }) => ({ receipt_ref, receipt_token }));
  emailReceipt = await fileOutlookEmail({
    matterId: nextMatterId,
    email,
    requestJson,
    priorAttachmentReceipts: [
      ...emailReceipt.attachment_state.receipts.map(({ receipt_ref, receipt_token }) => ({ receipt_ref, receipt_token })),
      ...successfulTokens,
    ],
    assertOperationCurrent,
    onReceipt,
  });
  return operationReceipt({
    matterId: nextMatterId,
    itemKey,
    email: emailReceipt,
    failures: [...array(saved.result?.failed_attachments).map(failure), ...missing],
    skipped: unsupported.map(failure),
    requestCount: saved.result?.request_count ?? 0,
  });
}
