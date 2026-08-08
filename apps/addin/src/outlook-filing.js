import { assertStableOutlookItemIdentity } from "./outlook-item-content.js";
import { outlookItemIdentityKey } from "./outlook-item-events.js";

export const OUTLOOK_EMAIL_FILING_PATH = "/api/outlook/email/file";
export const OUTLOOK_SENT_FILING_PATH = "/api/outlook/sent/file";

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new TypeError(`${field} is required`);
  return text;
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
} = {}) {
  const nextMatterId = requiredText(matterId, "matter_id");
  if (!email || typeof email !== "object") throw new TypeError("email is required");
  if (mode !== "manual" && mode !== "sent") throw new TypeError("mode must be manual or sent");
  const sent = mode === "sent";
  const body = { matter_id: nextMatterId, email };
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
  requestJson,
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  assertStableOutlookItemIdentity(email);
  const request = createOutlookFilingRequest({ matterId, email, mode });
  const body = await requestJson(request.path, {
    method: request.method,
    body: request.body,
  });
  const thread = body?.email_thread ?? body?.item;
  const outcome = body?.outcome;
  const documentIds = Array.isArray(thread?.filed_document_ids)
    ? thread.filed_document_ids.filter((value) => typeof value === "string" && value.trim())
    : [];
  if (
    !["created", "idempotent_replay"].includes(outcome)
    || thread?.status !== "active"
    || thread?.matter_id !== request.body.matter_id
    || typeof thread?.email_thread_id !== "string"
    || documentIds.length !== 1
  ) {
    throw new TypeError("Outlook filing response is incomplete or mismatched");
  }
  return Object.freeze({
    request_id: typeof body.request_id === "string" ? body.request_id : null,
    outcome,
    duplicate: outcome === "idempotent_replay" || body.idempotent_replay === true,
    mode,
    matter_id: request.body.matter_id,
    item_key: outlookItemIdentityKey(email),
    email_thread_id: thread.email_thread_id,
    document_ids: Object.freeze([...documentIds]),
    timeline_event_id: body.timeline_event?.event_id ?? null,
    timeline_event_type: body.timeline_event?.type ?? null,
    filing_actor_id: thread.filing_user ?? null,
    filed_at: thread.filing_time ?? null,
  });
}
