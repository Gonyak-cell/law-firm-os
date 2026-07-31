import { createHmac, timingSafeEqual } from "node:crypto";

export const BANK_IMPORT_PREVIEW_TOKEN_PREFIX = "lawos_bank_import_preview_v1";
export const BANK_IMPORT_PREVIEW_TOKEN_TTL_MS = 10 * 60 * 1000;
export const BANK_IMPORT_PREVIEW_LOCAL_SECRET = "lawos-local-bank-import-preview-secret-material-v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_TYPES = new Set(["xlsx", "pdf"]);
const SIGNING_CONTEXT = "lawos:finance:bank-import-preview:v1\u0000";

function requiredText(value, field) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function digest(value, field) {
  const normalized = requiredText(value, field);
  if (!SHA256.test(normalized)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return normalized;
}

function currentMs(now) {
  const value = typeof now === "function" ? now() : now;
  const parsed = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError("preview token clock is invalid");
  return parsed;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodedJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodedJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

export function createBankImportPreviewTokenAuthority({
  secret = BANK_IMPORT_PREVIEW_LOCAL_SECRET,
  ttlMs = BANK_IMPORT_PREVIEW_TOKEN_TTL_MS,
  now = () => Date.now(),
} = {}) {
  if (!(typeof secret === "string" || Buffer.isBuffer(secret)) || Buffer.byteLength(secret) < 32) {
    throw new TypeError("bank import preview token secret must contain at least 32 bytes");
  }
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 60_000 || ttlMs > 30 * 60_000) {
    throw new TypeError("bank import preview token ttl must be between 1 and 30 minutes");
  }

  function sign(payloadPart) {
    return createHmac("sha256", secret)
      .update(SIGNING_CONTEXT, "utf8")
      .update(payloadPart, "utf8")
      .digest("base64url");
  }

  function issue(input = {}) {
    const issuedAt = currentMs(now);
    const sourceType = requiredText(input.source_type, "source_type");
    if (!SOURCE_TYPES.has(sourceType)) throw new TypeError("source_type is invalid");
    const payload = Object.freeze({
      typ: BANK_IMPORT_PREVIEW_TOKEN_PREFIX,
      preview_id: requiredText(input.preview_id, "preview_id"),
      preview_manifest_sha256: digest(input.preview_manifest_sha256, "preview_manifest_sha256"),
      source_file_sha256: digest(input.source_file_sha256, "source_file_sha256"),
      source_type: sourceType,
      account_ref: requiredText(input.account_ref, "account_ref"),
      tenant_id: requiredText(input.tenant_id, "tenant_id"),
      actor_id: requiredText(input.actor_id, "actor_id"),
      iat: issuedAt,
      exp: issuedAt + ttlMs,
    });
    const payloadPart = encodedJson(payload);
    return Object.freeze({
      token: `${BANK_IMPORT_PREVIEW_TOKEN_PREFIX}.${payloadPart}.${sign(payloadPart)}`,
      expires_at: new Date(payload.exp).toISOString(),
      payload,
    });
  }

  function verify(token, expected = {}) {
    const value = String(token ?? "");
    if (value.length < 1 || value.length > 8_192) {
      return Object.freeze({ ok: false, reason: "bank_import_preview_token_invalid" });
    }
    const parts = value.split(".");
    if (parts.length !== 3 || parts[0] !== BANK_IMPORT_PREVIEW_TOKEN_PREFIX) {
      return Object.freeze({ ok: false, reason: "bank_import_preview_token_invalid" });
    }
    const [, payloadPart, signature] = parts;
    if (!safeEqual(signature, sign(payloadPart))) {
      return Object.freeze({ ok: false, reason: "bank_import_preview_token_invalid" });
    }

    let payload;
    try {
      payload = decodedJson(payloadPart);
    } catch {
      return Object.freeze({ ok: false, reason: "bank_import_preview_token_invalid" });
    }
    const nowMs = currentMs(now);
    if (payload?.typ !== BANK_IMPORT_PREVIEW_TOKEN_PREFIX
        || !SHA256.test(String(payload.preview_manifest_sha256 ?? ""))
        || !SHA256.test(String(payload.source_file_sha256 ?? ""))
        || !SOURCE_TYPES.has(payload.source_type)
        || !String(payload.preview_id ?? "").startsWith("bank_import_preview_")
        || !String(payload.account_ref ?? "").trim()
        || !String(payload.tenant_id ?? "").trim()
        || !String(payload.actor_id ?? "").trim()
        || !Number.isFinite(payload.iat)
        || !Number.isFinite(payload.exp)
        || payload.exp <= payload.iat
        || payload.exp - payload.iat > ttlMs
        || payload.iat > nowMs + 30_000) {
      return Object.freeze({ ok: false, reason: "bank_import_preview_token_invalid" });
    }
    for (const field of [
      "tenant_id",
      "actor_id",
      "account_ref",
      "source_type",
      "source_file_sha256",
      "preview_manifest_sha256",
    ]) {
      if (expected[field] !== undefined && !safeEqual(payload[field], expected[field])) {
        return Object.freeze({ ok: false, reason: "bank_import_preview_token_mismatch" });
      }
    }
    if (payload.exp <= nowMs) {
      return Object.freeze({
        ok: false,
        reason: "bank_import_preview_token_expired",
        payload: Object.freeze({ ...payload }),
      });
    }
    return Object.freeze({ ok: true, payload: Object.freeze({ ...payload }) });
  }

  return Object.freeze({
    issue,
    verify,
    token_prefix: BANK_IMPORT_PREVIEW_TOKEN_PREFIX,
    ttl_ms: ttlMs,
    uses_local_default_secret: secret === BANK_IMPORT_PREVIEW_LOCAL_SECRET,
  });
}
