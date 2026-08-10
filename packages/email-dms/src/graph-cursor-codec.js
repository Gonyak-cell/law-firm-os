import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requiredSyncString } from "./conversation-sync-model.js";

const VERSION = "sealed:v1";

function keyBytes(value) {
  const key = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value ?? "", "base64");
  if (key.byteLength !== 32) throw new TypeError("Graph cursor encryption key must contain 32 bytes");
  return key;
}

function bindingText(input = {}) {
  return JSON.stringify([
    requiredSyncString(input, "tenant_id"),
    requiredSyncString(input, "m365_connection_id"),
    requiredSyncString(input, "resource"),
  ]);
}

function cursorText(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 16 * 1024) {
    throw new TypeError("Graph delta cursor is invalid");
  }
  return value;
}

export function createGraphCursorCodec({ key, random_bytes = randomBytes } = {}) {
  const encryptionKey = keyBytes(key);
  if (typeof random_bytes !== "function") throw new TypeError("random_bytes is required");
  return Object.freeze({
    seal(value, binding = {}) {
      const iv = random_bytes(12);
      if (!Buffer.isBuffer(iv) || iv.byteLength !== 12) throw new TypeError("Graph cursor IV must contain 12 bytes");
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
      cipher.setAAD(Buffer.from(bindingText(binding), "utf8"));
      const encrypted = Buffer.concat([cipher.update(cursorText(value), "utf8"), cipher.final()]);
      return [VERSION, iv.toString("base64url"), encrypted.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(":");
    },
    open(reference, binding = {}) {
      try {
        const [prefix, version, iv, encrypted, tag, extra] = String(reference ?? "").split(":");
        if (`${prefix}:${version}` !== VERSION || !iv || !encrypted || !tag || extra) throw new Error("invalid envelope");
        const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
        decipher.setAAD(Buffer.from(bindingText(binding), "utf8"));
        decipher.setAuthTag(Buffer.from(tag, "base64url"));
        return cursorText(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"));
      } catch {
        throw Object.assign(new Error("Graph delta cursor reference is invalid"), { safe_error_code: "GRAPH_DELTA_CURSOR_INVALID" });
      }
    },
  });
}
