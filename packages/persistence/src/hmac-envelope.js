import { createHmac, timingSafeEqual } from "node:crypto";

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function sameText(left, right) {
  const leftBytes = Buffer.from(String(left));
  const rightBytes = Buffer.from(String(right));
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function plainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

export function createHmacEnvelopeAuthority({ secret, context, prefix } = {}) {
  const nextContext = requiredText(context, "context");
  const nextPrefix = requiredText(prefix, "prefix");
  if (!/^[a-z0-9_]+$/u.test(nextPrefix)) throw new TypeError("prefix is invalid");
  if (!(typeof secret === "string" || Buffer.isBuffer(secret)) || Buffer.byteLength(secret) < 32) {
    throw new TypeError("HMAC envelope secret must contain at least 32 bytes");
  }

  function sign(payloadPart) {
    return createHmac("sha256", secret)
      .update(`${nextContext}\u0000`, "utf8")
      .update(payloadPart, "utf8")
      .digest("base64url");
  }

  function issue(payload) {
    if (!plainRecord(payload)) throw new TypeError("HMAC envelope payload is invalid");
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${nextPrefix}.${payloadPart}.${sign(payloadPart)}`;
  }

  function verify(token) {
    const value = typeof token === "string" ? token : "";
    const parts = value.length <= 8_192 ? value.split(".") : [];
    if (parts.length !== 3 || parts[0] !== nextPrefix || !sameText(parts[2], sign(parts[1] ?? ""))) {
      throw new TypeError("HMAC envelope token is invalid");
    }
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (!plainRecord(payload)) throw new TypeError("HMAC envelope token is invalid");
      return Object.freeze(payload);
    } catch (error) {
      if (error instanceof TypeError && error.message === "HMAC envelope token is invalid") throw error;
      throw new TypeError("HMAC envelope token is invalid");
    }
  }

  return Object.freeze({ issue, verify, prefix: nextPrefix });
}
