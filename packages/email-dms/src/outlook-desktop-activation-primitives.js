import { createHash, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { assertStrictUtcTimestamp } from "../../runtime-auth/src/external-release-trust.js";
import { canonicalizeJson } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  BASE64URL,
  CHALLENGE_NONCE_BYTES,
  FORBIDDEN_PRIVACY_KEY,
} from "./outlook-desktop-activation-schema.js";

export class OutlookDesktopActivationContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutlookDesktopActivationContractError";
    this.code = code;
    this.details = details;
  }
}

export function fail(code, message, details) {
  throw new OutlookDesktopActivationContractError(code, message, details);
}

export function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function assertPrivacyTree(value) {
  const pending = [{ depth: 0, value }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop();
    if (++visited > 2_000 || current.depth > 32) {
      fail("OUTLOOK_ACTIVATION_INPUT_INVALID", "activation input JSON exceeds the bounded shape");
    }
    if (Buffer.isBuffer(current.value) || current.value === null) continue;
    if (typeof current.value !== "object") continue;
    for (const [key, child] of Object.entries(current.value)) {
      if (FORBIDDEN_PRIVACY_KEY.test(key)) {
        fail(
          "OUTLOOK_ACTIVATION_PRIVACY_FIELD_FORBIDDEN",
          "activation material contains a forbidden privacy or secret field",
          { field: key },
        );
      }
      pending.push({ depth: current.depth + 1, value: child });
    }
  }
}

export function assertExactKeys(value, expected, code, label) {
  if (!isRecord(value)) fail(code, `${label} must be a plain object with a closed schema`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    fail(code, `${label} fields do not match the closed schema`, {
      extras: actual.filter((key) => !wanted.includes(key)),
      missing: wanted.filter((key) => !actual.includes(key)),
    });
  }
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function pureObject(value) {
  return JSON.parse(canonicalizeJson(value));
}

export function canonicalBytes(value) {
  try {
    return Buffer.from(`${canonicalizeJson(value)}\n`);
  } catch {
    fail("OUTLOOK_ACTIVATION_CANONICAL_INVALID", "activation JSON cannot be canonicalized");
  }
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseTime(value, code, field) {
  try {
    assertStrictUtcTimestamp(value, field);
  } catch {
    fail(code, `${field} must be a canonical RFC 3339 UTC timestamp`);
  }
  return Date.parse(value);
}

export function validationNow(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("OUTLOOK_ACTIVATION_CLOCK_INVALID", "activation validation clock is invalid");
  }
  return value;
}

export function canonicalNonce(value) {
  if (typeof value !== "string" || !BASE64URL.test(value)) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_NONCE_INVALID", "challenge nonce is not canonical base64url");
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length !== CHALLENGE_NONCE_BYTES || bytes.toString("base64url") !== value) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_NONCE_INVALID", "challenge nonce must contain exactly 32 canonical base64url bytes");
  }
  return bytes;
}

export function assertFalseAttestations(value) {
  if (value.remote_app_attested !== false
      || value.hardware_key_attested !== false
      || value.mdm_attested !== false) {
    fail(
      "OUTLOOK_ACTIVATION_ATTESTATION_CLAIM_FORBIDDEN",
      "operator-controlled activation cannot claim remote, hardware-key, or MDM attestation",
    );
  }
}

export function parseCanonicalObject(bytes, maxBytes, prefix, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > maxBytes) {
    fail(`${prefix}_BYTES_REQUIRED`, `${label} must contain bounded raw bytes`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${prefix}_JSON_INVALID`, `${label} must contain valid JSON`);
  }
  assertPrivacyTree(value);
  if (!isRecord(value)) fail(`${prefix}_JSON_INVALID`, `${label} must contain one JSON object`);
  const expectedBytes = canonicalBytes(value);
  if (bytes.length !== expectedBytes.length || !timingSafeEqual(bytes, expectedBytes)) {
    fail(`${prefix}_CANONICAL_INVALID`, `${label} must use exact canonical JSON bytes`);
  }
  return value;
}

export function requireScope(key, field, value, code) {
  if (!Array.isArray(key[field]) || !key[field].includes(value)) {
    fail(code, `trusted signer scope does not authorize ${field}`);
  }
}

export function validateSelectedKey(key, { issuedAt, keyId, now, prefix }) {
  if (!key) {
    fail(`${prefix}_SIGNER_UNKNOWN`, "signer key is absent from the verified trust registry", {
      key_id: keyId,
    });
  }
  if (key.algorithm !== "Ed25519" || typeof key.public_key_spki_pem !== "string") {
    fail(`${prefix}_SIGNER_INVALID`, "signer key is not an Ed25519 trust-registry key");
  }
  if (key.revoked_at != null) fail(`${prefix}_SIGNER_REVOKED`, "signer key is revoked");
  const validFrom = parseTime(
    key.valid_from,
    `${prefix}_SIGNER_INVALID`,
    `${prefix}.key.valid_from`,
  );
  const validUntil = parseTime(
    key.valid_until,
    `${prefix}_SIGNER_INVALID`,
    `${prefix}.key.valid_until`,
  );
  if (now < validFrom || now >= validUntil || issuedAt < validFrom || issuedAt >= validUntil) {
    fail(`${prefix}_SIGNER_EXPIRED`, "signer key is outside its validity interval");
  }
}
