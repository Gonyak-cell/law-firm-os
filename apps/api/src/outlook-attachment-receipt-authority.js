import { createHmacEnvelopeAuthority } from "../../../packages/persistence/src/hmac-envelope.js";

export const OUTLOOK_ATTACHMENT_LOCAL_RECEIPT_SECRET =
  "lawos-local-outlook-attachment-receipt-secret-v1";

function text(value, field, max = 512) {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next || next.length > max || /[\u0000-\u001f\u007f]/u.test(next)) {
    throw new TypeError(`Outlook attachment receipt ${field} is invalid`);
  }
  return next;
}

function claims(input = {}) {
  const value = Object.freeze({
    version: input.version ?? 1,
    receipt_ref: text(input.receipt_ref ?? input.mapping_id, "receipt_ref"),
    tenant_id: text(input.tenant_id, "tenant_id"),
    matter_id: text(input.matter_id, "matter_id"),
    email_thread_id: text(input.email_thread_id, "email_thread_id"),
    attachment_id: text(input.attachment_id, "attachment_id"),
    name: text(input.name, "name", 1024),
    outcome: input.attachment_outcome ?? input.outcome,
    document_id: text(input.document_id, "document_id"),
    version_id: text(input.version_id, "version_id"),
    sha256: text(input.sha256, "sha256"),
  });
  if (
    value.version !== 1
    || !["created", "duplicate"].includes(value.outcome)
    || !/^[a-f0-9]{64}$/u.test(value.sha256)
  ) {
    throw new TypeError("Outlook attachment receipt claims are invalid");
  }
  return value;
}

export function createOutlookAttachmentReceiptAuthority({
  secret = OUTLOOK_ATTACHMENT_LOCAL_RECEIPT_SECRET,
} = {}) {
  const envelope = createHmacEnvelopeAuthority({
    secret,
    context: "lawos:outlook:attachment-receipt:v1",
    prefix: "lawos_outlook_attachment_v1",
  });

  function issue(input) {
    const payload = claims(input);
    return Object.freeze({
      ...payload,
      receipt_token: envelope.issue(payload),
    });
  }

  function verify(receipt, expected = {}) {
    try {
      const payload = claims(envelope.verify(receipt?.receipt_token));
      if (receipt?.receipt_ref !== payload.receipt_ref) {
        throw new TypeError("Outlook attachment receipt ref is invalid");
      }
      for (const field of [
        "tenant_id",
        "matter_id",
        "email_thread_id",
        "attachment_id",
        "document_id",
        "version_id",
        "sha256",
        "outcome",
      ]) {
        if (expected[field] !== undefined && payload[field] !== expected[field]) {
          throw new TypeError("Outlook attachment receipt is mismatched");
        }
      }
      return payload;
    } catch {
      throw new TypeError("Outlook attachment receipt is invalid");
    }
  }

  return Object.freeze({ issue, verify });
}
