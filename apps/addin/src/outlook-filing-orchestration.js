import { saveOutlookAttachments } from "./outlook-attachment-actions.js";
import { outlookActionErrorMessage } from "./inquiry-actions.js";
import { fileOutlookEmail } from "./outlook-filing.js";
import { assertStableOutlookItemIdentity } from "./outlook-item-content.js";
import { outlookItemIdentityKey } from "./outlook-item-events.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function attachmentId(value) {
  return typeof value?.attachment_id === "string" ? value.attachment_id.trim() : "";
}

function uniqueByAttachmentId(items) {
  const byId = new Map();
  for (const item of items) {
    const id = attachmentId(item);
    if (id) byId.set(id, item);
  }
  return [...byId.values()];
}

function attachmentReceipt(saved) {
  const created = saved?.body?.items?.[0];
  const duplicate = saved?.body?.duplicate_attachments?.[0];
  if (created?.document?.document_id) {
    return Object.freeze({
      attachment_id: saved.attachment_id,
      name: saved.name,
      outcome: "created",
      document_id: created.document.document_id,
      version_id: created.version?.version_id ?? null,
      sha256: created.version?.sha256 ?? null,
    });
  }
  if (duplicate?.duplicate_document_id) {
    return Object.freeze({
      attachment_id: saved.attachment_id,
      name: saved.name,
      outcome: "duplicate",
      document_id: duplicate.duplicate_document_id,
      version_id: null,
      sha256: duplicate.sha256 ?? null,
    });
  }
  throw new TypeError("Outlook attachment response has no document receipt");
}

function retryableFailure(value) {
  return Object.freeze({
    attachment_id: attachmentId(value),
    name: value?.name ?? "attachment",
    message: value?.message ?? "attachment filing failed",
    retryable: true,
  });
}

function skippedFailure(value) {
  return Object.freeze({
    attachment_id: attachmentId(value),
    name: value?.name ?? "attachment",
    message: value?.message ?? "attachment is unsupported",
    safe_error_code: value?.safe_error_code ?? null,
    retryable: false,
  });
}

function operationReceipt({
  matterId,
  itemKey,
  email,
  previousReceipt,
  nextReceipts,
  nextFailures,
  nextSkipped,
  requestCount,
}) {
  const receipts = uniqueByAttachmentId([
    ...asArray(previousReceipt?.attachments?.receipts),
    ...nextReceipts,
  ]);
  const attemptedIds = new Set([
    ...nextReceipts.map(attachmentId),
    ...nextFailures.map(attachmentId),
    ...nextSkipped.map(attachmentId),
  ]);
  const failed = uniqueByAttachmentId([
    ...asArray(previousReceipt?.attachments?.failed)
      .filter((entry) => !attemptedIds.has(attachmentId(entry))),
    ...nextFailures,
  ]);
  const skipped = uniqueByAttachmentId([
    ...asArray(previousReceipt?.attachments?.skipped),
    ...nextSkipped,
  ]);
  const retryAttachmentIds = failed
    .filter((entry) => entry.retryable === true)
    .map(attachmentId);
  const failedCount = failed.length + skipped.length;
  return Object.freeze({
    status: failedCount > 0 ? "partial" : "complete",
    matter_id: matterId,
    item_key: itemKey,
    email,
    attachments: Object.freeze({
      created_count: receipts.filter((entry) => entry.outcome === "created").length,
      duplicate_count: receipts.filter((entry) => entry.outcome === "duplicate").length,
      failed_count: failedCount,
      skipped_count: skipped.length,
      receipts: Object.freeze(receipts),
      failed: Object.freeze(failed),
      skipped: Object.freeze(skipped),
      request_count: (previousReceipt?.attachments?.request_count ?? 0) + requestCount,
    }),
    retry_attachment_ids: Object.freeze(retryAttachmentIds),
  });
}

export async function fileOutlookEmailWithAttachments({
  matterId,
  email,
  requestJson,
  readAttachments,
  previousReceipt = null,
  errorMessage = outlookActionErrorMessage,
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  if (typeof readAttachments !== "function") throw new TypeError("readAttachments is required");
  assertStableOutlookItemIdentity(email);
  const itemKey = outlookItemIdentityKey(email);
  const nextMatterId = typeof matterId === "string" ? matterId.trim() : "";
  let emailReceipt;
  let retryIds = null;
  if (previousReceipt) {
    if (
      previousReceipt.matter_id !== nextMatterId
      || previousReceipt.item_key !== itemKey
      || previousReceipt.email?.matter_id !== nextMatterId
    ) {
      throw new TypeError("Previous filing receipt does not match the current Outlook item context");
    }
    emailReceipt = previousReceipt.email;
    retryIds = [...asArray(previousReceipt.retry_attachment_ids)];
    if (retryIds.length === 0) return previousReceipt;
  } else {
    emailReceipt = await fileOutlookEmail({
      matterId: nextMatterId,
      email,
      requestJson,
    });
  }

  const loaded = await readAttachments({
    attachmentIds: retryIds,
    matterId: nextMatterId,
    emailThreadId: emailReceipt.email_thread_id,
  });
  const retrySet = retryIds ? new Set(retryIds) : null;
  const attachments = uniqueByAttachmentId(asArray(loaded?.attachments))
    .filter((entry) => !retrySet || retrySet.has(attachmentId(entry)));
  const unsupported = uniqueByAttachmentId(asArray(loaded?.unsupported))
    .filter((entry) => !retrySet || retrySet.has(attachmentId(entry)));
  const representedIds = new Set([
    ...attachments.map(attachmentId),
    ...unsupported.map(attachmentId),
  ]);
  const missingFailures = retryIds
    ? retryIds
      .filter((id) => !representedIds.has(id))
      .map((id) => retryableFailure({
        attachment_id: id,
        name: id,
        message: "attachment content is unavailable",
      }))
    : [];

  let saved = { result: { saved_attachments: [], failed_attachments: [], request_count: 0 } };
  if (attachments.length > 0) {
    saved = await saveOutlookAttachments({
      currentItem: {
        conversation_id: email.conversation_id,
        attachments,
        unsupported: [],
      },
      matterId: nextMatterId,
      emailThreadId: emailReceipt.email_thread_id,
      requestJson,
      errorMessage,
      allowAllFailedResult: true,
    });
  }
  return operationReceipt({
    matterId: nextMatterId,
    itemKey,
    email: emailReceipt,
    previousReceipt,
    nextReceipts: asArray(saved.result?.saved_attachments).map(attachmentReceipt),
    nextFailures: [
      ...asArray(saved.result?.failed_attachments).map(retryableFailure),
      ...missingFailures,
    ],
    nextSkipped: unsupported.map(skippedFailure),
    requestCount: saved.result?.request_count ?? 0,
  });
}
