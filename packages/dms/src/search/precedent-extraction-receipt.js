import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PRECEDENT_EXTRACTION_AUTHORITY,
  hashValue,
  requiredId,
  requiredSha256,
  requiredText,
  requiredTimestamp,
} from "./precedent-common.js";

function keyBytes(secret) {
  const bytes = Buffer.isBuffer(secret) ? Buffer.from(secret) : Buffer.from(String(secret ?? ""), "utf8");
  if (bytes.byteLength < 32) throw new TypeError("precedent extraction receipt secret must contain at least 32 bytes");
  return bytes;
}

function unsignedReceipt(input = {}) {
  const count = Number(input.character_count);
  if (!Number.isSafeInteger(count) || count < 0 || count > 1_004_000) {
    throw new TypeError("character_count is invalid");
  }
  const authority = requiredText(input.authority, "authority", 80);
  if (authority !== PRECEDENT_EXTRACTION_AUTHORITY) throw new TypeError("extraction receipt authority is invalid");
  return Object.freeze({
    receipt_id: requiredId(input.receipt_id, "receipt_id"),
    tenant_id: requiredId(input.tenant_id, "tenant_id"),
    source_id: requiredId(input.source_id, "source_id"),
    document_id: requiredId(input.document_id, "document_id"),
    version_id: requiredId(input.version_id, "version_id"),
    content_sha256: requiredSha256(input.content_sha256, "content_sha256"),
    extractor_id: requiredId(input.extractor_id, "extractor_id"),
    text_sha256: requiredSha256(input.text_sha256, "text_sha256"),
    character_count: count,
    issued_by: requiredId(input.issued_by, "issued_by"),
    issued_at: requiredTimestamp(input.issued_at, "issued_at"),
    authority,
  });
}

export function extractedTextSha256({ metadata_text, body_text } = {}) {
  return hashValue({ metadata_text: String(metadata_text ?? ""), body_text: String(body_text ?? "") });
}

export function createPrecedentExtractionReceiptAuthority({ secret } = {}) {
  const key = keyBytes(secret);
  function signature(receipt) {
    return createHmac("sha256", key)
      .update(`precedent-extraction-receipt\x1f${hashValue(receipt)}`)
      .digest("hex");
  }
  return Object.freeze({
    issue(input = {}) {
      const receipt = unsignedReceipt(input);
      return Object.freeze({ ...receipt, receipt_signature: signature(receipt) });
    },
    verify(input = {}) {
      const receipt = unsignedReceipt(input);
      const actual = Buffer.from(requiredSha256(input.receipt_signature, "receipt_signature"), "hex");
      const expected = Buffer.from(signature(receipt), "hex");
      if (!timingSafeEqual(actual, expected)) throw new TypeError("extraction receipt signature is invalid");
      return Object.freeze({ ...receipt, receipt_signature: input.receipt_signature });
    },
  });
}
