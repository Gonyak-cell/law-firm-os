import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import { docusignFailure, docusignRequiredText, docusignTimestamp } from "./docusign-envelope-model.js";

export const DOCUSIGN_CONNECT_SIGNATURE_HEADER = "x-docusign-signature-1";
export const DOCUSIGN_MIN_POLL_INTERVAL_MS = 15 * 60 * 1000;

export const DOCUSIGN_PROVIDER_STATUS_STATES = Object.freeze({
  created: "draft_created", draft: "draft_created", draft_created: "draft_created",
  sent: "sent", delivered: "delivered", completed: "completed_artifacts_pending",
  declined: "declined", voided: "voided",
});
export const DOCUSIGN_PROVIDER_STATE_RANK = Object.freeze({ approved: 1, provider_pending: 2, reconciliation_required: 2, draft_created: 3, sent: 4, delivered: 5, completed_artifacts_pending: 6, completed: 7 });
export const DOCUSIGN_PROVIDER_TERMINAL_STATES = new Set(["completed_artifacts_pending", "completed", "declined", "voided", "provider_blocked"]);

export function docusignRawBytes(value) {
  const bytes = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value ?? []);
  if (bytes.length === 0) throw docusignFailure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook body is required", 400);
  return bytes;
}

export function docusignSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function docusignHeader(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
}

export function verifyDocusignConnectHmac({ raw_body, signature, secret } = {}) {
  const bytes = docusignRawBytes(raw_body);
  const encoded = typeof signature === "string" ? signature.trim() : "";
  if (!/^[A-Za-z0-9+/]{43}=$/u.test(encoded)) throw docusignFailure("DOCUSIGN_WEBHOOK_SIGNATURE_INVALID", "DocuSign webhook signature is invalid", 401);
  const supplied = Buffer.from(encoded, "base64");
  const key = Buffer.isBuffer(secret) ? Buffer.from(secret) : Buffer.from(docusignRequiredText(secret, "resolved HMAC secret"));
  const expected = createHmac("sha256", key).update(bytes).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw docusignFailure("DOCUSIGN_WEBHOOK_SIGNATURE_INVALID", "DocuSign webhook signature is invalid", 401);
  return true;
}

export function parseDocusignConnectEvent(rawBody) {
  let payload;
  try { payload = JSON.parse(rawBody.toString("utf8")); } catch { throw docusignFailure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook body is invalid", 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw docusignFailure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook body is invalid", 400);
  const summary = payload.data?.envelopeSummary ?? {};
  const status = docusignRequiredText(summary.status ?? payload.status ?? payload.event, "provider status").replace(/^envelope-/u, "").toLowerCase();
  const sequenceValue = payload.sequence ?? payload.data?.sequence ?? summary.sequence;
  const sequence = sequenceValue == null || sequenceValue === "" ? null : Number(sequenceValue);
  if (sequence != null && (!Number.isSafeInteger(sequence) || sequence < 0)) throw docusignFailure("DOCUSIGN_WEBHOOK_BODY_INVALID", "DocuSign webhook sequence is invalid", 400);
  const event = Object.freeze({
    account_id: docusignRequiredText(payload.data?.accountId ?? payload.accountId, "provider account_id"),
    envelope_id: docusignRequiredText(payload.data?.envelopeId ?? payload.envelopeId, "provider envelope_id"),
    status,
    occurred_at: docusignTimestamp(summary.statusChangedDateTime ?? payload.generatedDateTime ?? payload.createdDateTime, "provider occurred_at"),
    sequence,
    provider_event: typeof payload.event === "string" ? payload.event.trim().toLowerCase() : null,
  });
  return Object.freeze({ ...event, event_hash: docusignSha256(Buffer.from(stableJsonStringify(event))) });
}

function compareCursor(current, event) {
  if (!current) return 1;
  const time = Date.parse(event.occurred_at) - Date.parse(current.occurred_at);
  if (time !== 0) return Math.sign(time);
  if (event.sequence != null && current.sequence != null) return Math.sign(event.sequence - current.sequence);
  if (event.sequence != null && current.sequence == null) return 1;
  if (event.sequence == null && current.sequence != null) return -1;
  return 0;
}

// Terminal policy: the first accepted terminal state is immutable. A newer terminal is
// valid only while the local state is non-terminal; provider time/sequence must also be newer.
export function projectDocusignProviderEvent(request, event, localTimestamp) {
  const target = DOCUSIGN_PROVIDER_STATUS_STATES[event.status];
  if (!target) return Object.freeze({ request, changed: false, accepted: false });
  const order = compareCursor(request.provider_cursor, event);
  if (order < 0 || (order === 0 && request.provider_cursor?.status !== event.status)) return Object.freeze({ request, changed: false, accepted: false });
  if (DOCUSIGN_PROVIDER_TERMINAL_STATES.has(request.state)) return Object.freeze({ request, changed: false, accepted: false });
  const cursor = { occurred_at: event.occurred_at, sequence: event.sequence ?? null, status: event.status };
  if (["declined", "voided"].includes(target)) {
    return Object.freeze({ accepted: true, changed: true, request: { ...request, state: target, attempt_phase: target, provider_cursor: cursor, last_provider_status: event.status, last_safe_error_code: null, updated_at: localTimestamp } });
  }
  const currentRank = DOCUSIGN_PROVIDER_STATE_RANK[request.state] ?? -1;
  const targetRank = DOCUSIGN_PROVIDER_STATE_RANK[target] ?? -1;
  // A newer provider observation cannot move the local request backwards. Keep
  // the durable cursor unchanged too, so reconciliation and webhook delivery
  // share one monotonic/first-terminal lattice.
  if (targetRank < currentRank) return Object.freeze({ accepted: true, changed: false, request });
  return Object.freeze({
    accepted: true,
    changed: target !== request.state || request.last_provider_status !== event.status,
    request: { ...request, state: target, attempt_phase: target, provider_cursor: cursor, last_provider_status: event.status, last_safe_error_code: null, updated_at: localTimestamp },
  });
}
