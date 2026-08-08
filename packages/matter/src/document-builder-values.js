import { createHash } from "node:crypto";

export const DOCX_GENERATOR_VERSION = "amic-matter-agreement-docx/1";
export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function requiredString(value, field, { max = 240 } = {}) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > max) throw new TypeError(`${field} is too long`);
  return text;
}

export function safeText(value, field, { min = 1, max = 4_000 } = {}) {
  const text = requiredString(value, field, { max }).replace(/\r\n?/g, "\n");
  if (text.length < min) throw new TypeError(`${field} is invalid`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) {
    throw new TypeError(`${field} includes unsupported control characters`);
  }
  return text;
}

export function safeId(value, fallback, field = "identifier") {
  const text = requiredString(value ?? fallback, field, { max: 160 });
  const normalized = text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  if (!normalized) throw new TypeError(`${field} is invalid`);
  return normalized;
}

export function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

export function hashValue(value) {
  const input = Buffer.isBuffer(value) ? value : JSON.stringify(canonicalValue(value));
  return createHash("sha256").update(input).digest("hex");
}

export function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

export function idempotencyConflict(message = "idempotency key cannot be reused for changed input") {
  return Object.assign(new Error(message), {
    code: "MATTER_IDEMPOTENCY_CONFLICT",
    safe_error_code: "MATTER_IDEMPOTENCY_CONFLICT",
    status: 409,
  });
}
