import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

export const OUTLOOK_VAULT_DELIVERY_TOKEN_PREFIX = "lawos_ovd_v1";
export const OUTLOOK_VAULT_DELIVERY_TOKEN_MAX_TTL_MS = 60_000;

const SCHEMA = "law-firm-os.outlook-vault-delivery-token.v1";
const AAD = Buffer.from(`${SCHEMA}\u0000`, "utf8");
const HKDF_SALT = Buffer.from("lawos:outlook-vault-delivery:hkdf-salt:v1", "utf8");
const HKDF_INFO = Buffer.from("lawos:outlook-vault-delivery:aes-256-gcm:v1", "utf8");
const TOKEN_MAX_LENGTH = 1_800;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const PAYLOAD_FIELDS = Object.freeze([
  "schema",
  "tenant_id",
  "user_id",
  "entra_subject_id",
  "operation_id",
  "installation_ref_sha256",
  "compose_target_sha256",
  "exact_version_ref_sha256",
  "iat",
  "exp",
]);

function secretBytes(value) {
  if (!(typeof value === "string" || Buffer.isBuffer(value))) {
    throw new TypeError("Outlook Vault delivery token secret is required");
  }
  const bytes = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value, "utf8");
  if (bytes.byteLength < 32) {
    throw new TypeError("Outlook Vault delivery token secret must contain at least 32 bytes");
  }
  return bytes;
}

function keyBytes(secret) {
  return Buffer.from(hkdfSync("sha256", secretBytes(secret), HKDF_SALT, HKDF_INFO, 32));
}

function clockMs(now) {
  const value = typeof now === "function" ? now() : now;
  const milliseconds = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("Outlook Vault delivery token clock is invalid");
  }
  return milliseconds;
}

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function requiredSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function exactPayloadKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...PAYLOAD_FIELDS].sort();
  return actual.length === expected.length
    && actual.every((field, index) => field === expected[index]);
}

function invalid(reason = "OUTLOOK_VAULT_DELIVERY_TOKEN_INVALID", status = 403) {
  return Object.freeze({
    ok: false,
    status,
    safe_error_code: reason,
  });
}

function validatedPayload(value, nowMs, maxTtlMs) {
  if (!exactPayloadKeys(value)
      || value.schema !== SCHEMA
      || !SAFE_ID.test(value.tenant_id ?? "")
      || !SAFE_ID.test(value.user_id ?? "")
      || !SAFE_ID.test(value.entra_subject_id ?? "")
      || !OPERATION_ID.test(value.operation_id ?? "")
      || !SHA256.test(value.installation_ref_sha256 ?? "")
      || !SHA256.test(value.compose_target_sha256 ?? "")
      || !SHA256.test(value.exact_version_ref_sha256 ?? "")
      || !Number.isSafeInteger(value.iat)
      || !Number.isSafeInteger(value.exp)
      || value.exp <= value.iat
      || value.exp - value.iat > maxTtlMs
      || value.iat > nowMs + 30_000) {
    return invalid();
  }
  if (value.exp <= nowMs) {
    return invalid("OUTLOOK_VAULT_DELIVERY_TOKEN_EXPIRED", 410);
  }
  return Object.freeze({
    ok: true,
    status: 200,
    claims: Object.freeze({ ...value }),
  });
}

export function createOutlookVaultDeliveryTokenAuthority({
  secret,
  maxTtlMs = OUTLOOK_VAULT_DELIVERY_TOKEN_MAX_TTL_MS,
  now = Date.now,
  randomBytesFn = randomBytes,
} = {}) {
  const key = keyBytes(secret);
  if (!Number.isSafeInteger(maxTtlMs) || maxTtlMs < 1_000
      || maxTtlMs > OUTLOOK_VAULT_DELIVERY_TOKEN_MAX_TTL_MS) {
    throw new TypeError("Outlook Vault delivery token TTL must be between 1 and 60 seconds");
  }
  if (typeof randomBytesFn !== "function") {
    throw new TypeError("Outlook Vault delivery token random source is required");
  }

  function issue(input = {}) {
    const issuedAt = clockMs(now);
    const providerExpiry = Date.parse(String(input.expires_at ?? ""));
    if (!Number.isFinite(providerExpiry) || providerExpiry <= issuedAt) {
      throw new TypeError("Outlook Vault delivery authorization expiry is invalid");
    }
    const expiresAt = Math.min(providerExpiry, issuedAt + maxTtlMs);
    const principal = input.principal;
    const payload = Object.freeze({
      schema: SCHEMA,
      tenant_id: requiredId(principal?.tenant_id, "principal.tenant_id"),
      user_id: requiredId(principal?.user_id, "principal.user_id"),
      entra_subject_id: requiredId(
        principal?.entra_subject_id,
        "principal.entra_subject_id",
      ),
      operation_id: OPERATION_ID.test(input.operation_id ?? "")
        ? input.operation_id
        : (() => { throw new TypeError("operation_id is invalid"); })(),
      installation_ref_sha256: requiredSha256(
        input.installation_ref_sha256,
        "installation_ref_sha256",
      ),
      compose_target_sha256: requiredSha256(
        input.compose_target_sha256,
        "compose_target_sha256",
      ),
      exact_version_ref_sha256: requiredSha256(
        input.exact_version_ref_sha256,
        "exact_version_ref_sha256",
      ),
      iat: issuedAt,
      exp: expiresAt,
    });
    const iv = randomBytesFn(12);
    if (!Buffer.isBuffer(iv) || iv.byteLength !== 12) {
      throw new TypeError("Outlook Vault delivery token IV must contain 12 bytes");
    }
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    const token = [
      OUTLOOK_VAULT_DELIVERY_TOKEN_PREFIX,
      iv.toString("base64url"),
      ciphertext.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join(".");
    if (token.length > TOKEN_MAX_LENGTH) {
      throw new TypeError("Outlook Vault delivery token exceeds the Office URI budget");
    }
    return Object.freeze({
      token,
      expires_at: new Date(expiresAt).toISOString(),
      token_length: token.length,
    });
  }

  function verify(token) {
    try {
      const value = String(token ?? "");
      if (!value || value.length > TOKEN_MAX_LENGTH) return invalid();
      const [prefix, ivPart, ciphertextPart, tagPart, extra] = value.split(".");
      if (prefix !== OUTLOOK_VAULT_DELIVERY_TOKEN_PREFIX
          || !ivPart || !ciphertextPart || !tagPart || extra) {
        return invalid();
      }
      const iv = Buffer.from(ivPart, "base64url");
      const ciphertext = Buffer.from(ciphertextPart, "base64url");
      const tag = Buffer.from(tagPart, "base64url");
      if (iv.byteLength !== 12 || ciphertext.byteLength < 1 || tag.byteLength !== 16) {
        return invalid();
      }
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(AAD);
      decipher.setAuthTag(tag);
      const payload = JSON.parse(Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8"));
      return validatedPayload(payload, clockMs(now), maxTtlMs);
    } catch {
      return invalid();
    }
  }

  return Object.freeze({
    issue,
    verify,
    schema: SCHEMA,
    token_prefix: OUTLOOK_VAULT_DELIVERY_TOKEN_PREFIX,
    max_ttl_ms: maxTtlMs,
    token_max_length: TOKEN_MAX_LENGTH,
  });
}
