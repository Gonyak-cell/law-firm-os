import { createHmacEnvelopeAuthority } from "../../../packages/persistence/src/hmac-envelope.js";
import {
  OUTLOOK_SOURCE_IDENTITY_FIELDS,
  parseExactOutlookSourceIdentity,
} from "../../../packages/email-dms/src/outlook-source-identity.js";
import { parseExactDmsDocumentId } from "../../../packages/email-dms/src/exact-document-id.js";

export const OUTLOOK_ATTACHMENT_LOCAL_RECEIPT_SECRET =
  "lawos-local-outlook-attachment-receipt-secret-v1";

export const OUTLOOK_ATTACHMENT_RECEIPT_CLAIM_FIELDS = Object.freeze([
  "version",
  "receipt_ref",
  "tenant_id",
  "matter_id",
  "email_thread_id",
  "attachment_id",
  "name",
  "outcome",
  "document_id",
  "version_id",
  "sha256",
  "source_byte_size",
  "source_message_ref",
  "source_provenance_authority",
  ...OUTLOOK_SOURCE_IDENTITY_FIELDS,
]);

function text(value, field, max = 512) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > max
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError(`Outlook attachment receipt ${field} is invalid`);
  }
  return value;
}

function byteSize(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Outlook attachment receipt source_byte_size is invalid");
  }
  return value;
}

export function outlookAttachmentReceiptClaims(input = {}) {
  const sourceIdentity = parseExactOutlookSourceIdentity(input);
  const value = Object.freeze({
    version: input.version ?? 1,
    receipt_ref: text(input.receipt_ref ?? input.mapping_id, "receipt_ref"),
    tenant_id: text(input.tenant_id, "tenant_id"),
    matter_id: text(input.matter_id, "matter_id"),
    email_thread_id: text(input.email_thread_id, "email_thread_id"),
    attachment_id: text(input.attachment_id, "attachment_id"),
    name: text(input.name, "name", 1024),
    outcome: input.attachment_outcome ?? input.outcome,
    document_id: parseExactDmsDocumentId(input.document_id),
    version_id: text(input.version_id, "version_id"),
    sha256: text(input.sha256, "sha256"),
    source_byte_size: byteSize(input.source_byte_size),
    source_message_ref: text(input.source_message_ref, "source_message_ref", 2048),
    source_provenance_authority: text(
      input.source_provenance_authority,
      "source_provenance_authority",
    ),
    ...sourceIdentity,
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
    const payload = outlookAttachmentReceiptClaims(input);
    return Object.freeze({
      ...payload,
      receipt_token: envelope.issue(payload),
    });
  }

  function verify(receipt, expected = {}) {
    try {
      const payload = outlookAttachmentReceiptClaims(envelope.verify(receipt?.receipt_token));
      if (receipt?.receipt_ref !== payload.receipt_ref) {
        throw new TypeError("Outlook attachment receipt ref is invalid");
      }
      for (const field of OUTLOOK_ATTACHMENT_RECEIPT_CLAIM_FIELDS) {
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
