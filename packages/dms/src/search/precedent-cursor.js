import { createHmac, timingSafeEqual } from "node:crypto";
import { codedError, requiredText } from "./precedent-common.js";

function secretBytes(secret) {
  const bytes = Buffer.isBuffer(secret) ? Buffer.from(secret) : Buffer.from(String(secret ?? ""), "utf8");
  if (bytes.byteLength < 32) throw new TypeError("precedent cursor secret must contain at least 32 bytes");
  return bytes;
}

function stale() {
  throw codedError("precedent cursor is stale", "PRECEDENT_CURSOR_STALE", 409);
}

export function createPrecedentCursorAuthority({ secret, indexVersion, keyId = "v1" } = {}) {
  const key = secretBytes(secret);
  const expectedVersion = requiredText(indexVersion, "indexVersion", 80);
  const expectedKeyId = requiredText(keyId, "keyId", 32);

  function sign(encoded) {
    return createHmac("sha256", key)
      .update(`precedent-cursor\x1f${expectedKeyId}\x1f${encoded}`)
      .digest("base64url");
  }

  return Object.freeze({
    issue(payload = {}) {
      const envelope = {
        v: 1,
        kid: expectedKeyId,
        index_version: expectedVersion,
        ...payload,
      };
      const encoded = Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
      return `${encoded}.${sign(encoded)}`;
    },
    verify(value, fingerprint) {
      if (value == null || value === "") return null;
      const token = requiredText(value, "cursor", 4096);
      const [encoded, signature, extra] = token.split(".");
      if (!encoded || !signature || extra) return stale();
      const expected = sign(encoded);
      const actualBytes = Buffer.from(signature);
      const expectedBytes = Buffer.from(expected);
      if (actualBytes.byteLength !== expectedBytes.byteLength
          || !timingSafeEqual(actualBytes, expectedBytes)) return stale();
      let parsed;
      try {
        parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      } catch {
        return stale();
      }
      if (parsed?.v !== 1 || parsed.kid !== expectedKeyId
          || parsed.index_version !== expectedVersion
          || parsed.fingerprint !== fingerprint
          || typeof parsed.snapshot_at !== "string"
          || typeof parsed.rank !== "string"
          || typeof parsed.source_id !== "string"
          || !Number.isFinite(new Date(parsed.snapshot_at).getTime())
          || !/^-?\d+(?:\.\d+)?$/u.test(parsed.rank)) return stale();
      return Object.freeze(parsed);
    },
  });
}
