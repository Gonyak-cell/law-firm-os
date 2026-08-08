import {
  assertExactOutlookSourceIdentity,
  parseCapturedOutlookSourceIdentity,
  parseExactOutlookSourceIdentity,
} from "../../../packages/email-dms/src/outlook-source-identity.js";
import {
  parseExactDmsDocumentId,
  parseExactDmsDocumentIdSingleton,
} from "../../../packages/email-dms/src/exact-document-id.js";

export const OUTLOOK_EMAIL_FILING_PATH = "/api/outlook/email/file";
export const OUTLOOK_SENT_FILING_PATH = "/api/outlook/sent/file";

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function hasText(value) {
  return typeof value === "string" && Boolean(value.trim());
}

/**
 * Build the request for an explicit filing action.
 *
 * The ordinary action stays on the received-mail endpoint. The sent-mail
 * endpoint is selected only by the explicit user action; the server remains
 * responsible for proving that the current Graph item is in Sent Items and
 * was sent by the authenticated mailbox.
 */
export function createOutlookFilingRequest({
  matterId,
  email,
  mode = "manual",
  priorAttachmentReceipts,
} = {}) {
  const nextMatterId = requiredText(matterId, "matter_id");
  if (!email || typeof email !== "object") throw new TypeError("email is required");
  parseCapturedOutlookSourceIdentity(email);
  if (mode !== "manual" && mode !== "sent") throw new TypeError("mode must be manual or sent");
  const sent = mode === "sent";
  let attachmentReceipts;
  if (priorAttachmentReceipts !== undefined) {
    if (!Array.isArray(priorAttachmentReceipts)) {
      throw new TypeError("attachment_receipts must be an array");
    }
    attachmentReceipts = priorAttachmentReceipts.map((receipt) => Object.freeze({
      receipt_ref: requiredText(receipt?.receipt_ref, "receipt_ref"),
      receipt_token: requiredText(receipt?.receipt_token, "receipt_token"),
    }));
  }
  const body = {
    matter_id: nextMatterId,
    email,
    ...(attachmentReceipts ? { attachment_receipts: Object.freeze(attachmentReceipts) } : {}),
  };
  return Object.freeze({
    path: sent ? OUTLOOK_SENT_FILING_PATH : OUTLOOK_EMAIL_FILING_PATH,
    method: "POST",
    body: Object.freeze(body),
    mode,
  });
}

export async function fileOutlookEmail({
  matterId,
  email,
  mode = "manual",
  priorAttachmentReceipts,
  requestJson,
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  const request = createOutlookFilingRequest({ matterId, email, mode, priorAttachmentReceipts });
  const body = await requestJson(request.path, {
    method: request.method,
    body: request.body,
  });
  const thread = body?.email_thread ?? body?.item;
  const requestSourceIdentity = parseCapturedOutlookSourceIdentity(email);
  const responseSourceIdentity = assertExactOutlookSourceIdentity(
    requestSourceIdentity,
    body?.source_identity,
    { exactShape: true },
  );
  const responseThreadSourceIdentity = parseCapturedOutlookSourceIdentity(thread);
  assertExactOutlookSourceIdentity(requestSourceIdentity, responseThreadSourceIdentity);
  assertExactOutlookSourceIdentity(responseSourceIdentity, responseThreadSourceIdentity);
  const outcome = body?.outcome;
  const documentIds = parseExactDmsDocumentIdSingleton(thread?.filed_document_ids);
  const expectedTimelineType = mode === "sent"
    ? "outlook.email.sent_filed"
    : "outlook.email.filed";
  const filedAt = Date.parse(thread?.filing_time);
  const attachmentState = body?.attachment_state;
  const attachmentReceipts = Array.isArray(attachmentState?.receipts)
    ? attachmentState.receipts
    : null;
  const retryAttachmentIds = Array.isArray(attachmentState?.retry_attachment_ids)
    ? attachmentState.retry_attachment_ids
    : null;
  const normalizedReceipts = attachmentReceipts?.map((receipt) => {
    const normalized = {
      attachment_id: requiredText(receipt?.attachment_id, "attachment_id"),
      name: requiredText(receipt?.name, "attachment.name"),
      outcome: receipt?.outcome,
      matter_id: requiredText(receipt?.matter_id, "attachment.matter_id"),
      email_thread_id: requiredText(receipt?.email_thread_id, "attachment.email_thread_id"),
      document_id: parseExactDmsDocumentId(receipt?.document_id),
      version_id: requiredText(receipt?.version_id, "version_id"),
      sha256: requiredText(receipt?.sha256, "sha256"),
      receipt_ref: requiredText(receipt?.receipt_ref, "receipt_ref"),
      receipt_token: requiredText(receipt?.receipt_token, "receipt_token"),
    };
    if (!["created", "duplicate"].includes(normalized.outcome) || !/^[a-f0-9]{64}$/u.test(normalized.sha256)) {
      throw new TypeError("Outlook attachment receipt is incomplete or mismatched");
    }
    return Object.freeze(normalized);
  });
  const normalizedRetryIds = retryAttachmentIds?.map((value) => requiredText(value, "retry_attachment_id"));
  const receiptIds = new Set(normalizedReceipts?.map(({ attachment_id }) => attachment_id));
  const retryIds = new Set(normalizedRetryIds);
  if (
    !["created", "idempotent_replay"].includes(outcome)
    || !hasText(body?.request_id)
    || body?.filing_operation !== mode
    || body?.timeline_event?.type !== expectedTimelineType
    || !hasText(body?.timeline_event?.event_id)
    || body?.timeline_event?.matter_id !== request.body.matter_id
    || body?.timeline_event?.source_ref !== thread?.email_thread_id
    || body?.external_send_state !== (mode === "sent" ? "provider_gated_no_external_send_claim" : "not_applicable")
    || thread?.status !== "active"
    || thread?.matter_id !== request.body.matter_id
    || !hasText(thread?.email_thread_id)
    || !hasText(thread?.filing_user)
    || !Number.isFinite(filedAt)
    || !normalizedReceipts
    || !normalizedRetryIds
    || receiptIds.size !== normalizedReceipts.length
    || retryIds.size !== normalizedRetryIds.length
    || normalizedRetryIds.some((id) => receiptIds.has(id))
    || normalizedReceipts.some((receipt) => (
      receipt.matter_id !== request.body.matter_id
      || receipt.email_thread_id !== thread.email_thread_id
    ))
  ) {
    throw new TypeError("Outlook filing response is incomplete or mismatched");
  }
  return Object.freeze({
    request_id: body.request_id,
    outcome,
    duplicate: outcome === "idempotent_replay" || body.idempotent_replay === true,
    mode,
    matter_id: request.body.matter_id,
    item_key: requestSourceIdentity.item_key,
    email_thread_id: thread.email_thread_id,
    document_ids: Object.freeze([...documentIds]),
    timeline_event_id: body.timeline_event?.event_id ?? null,
    timeline_event_type: body.timeline_event?.type ?? null,
    filing_actor_id: thread.filing_user ?? null,
    filed_at: thread.filing_time ?? null,
    attachment_state: Object.freeze({
      receipts: Object.freeze(normalizedReceipts),
      retry_attachment_ids: Object.freeze(normalizedRetryIds),
    }),
  });
}
