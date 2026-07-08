import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const LAWOS_INTERNAL_PASSWORD_PROVIDER_ID = "lawos-internal-password-provider-v1";
export const LAWOS_AUTH_CREDENTIAL_STORE_ENV = "LAWOS_AUTH_CREDENTIAL_STORE_PATH";
export const LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION = "law-firm-os.auth-credential-store.v0.1";
export const LAWOS_AUTH_CREDENTIAL_STATUSES = Object.freeze(["active", "must_change", "reset_required", "locked", "disabled"]);
export const LAWOS_AUTH_SCRYPT_PARAMS = Object.freeze({
  N: 16_384,
  r: 8,
  p: 1,
  keylen: 64,
});

function normalizeStatus(status) {
  return LAWOS_AUTH_CREDENTIAL_STATUSES.includes(status) ? status : "disabled";
}

function normalizeRecord(record = {}) {
  return Object.freeze({
    user_id: String(record.user_id ?? "").trim(),
    email: record.email ? String(record.email).trim().toLowerCase() : null,
    status: normalizeStatus(record.status),
    credential_rev: Number.isInteger(record.credential_rev) && record.credential_rev > 0 ? record.credential_rev : 1,
    locked_until: record.locked_until ?? null,
    password_hash: Object.freeze({ ...(record.password_hash ?? record.password ?? {}) }),
  });
}

function recordsFromParsed(parsed = {}) {
  if (Array.isArray(parsed.records)) return parsed.records;
  if (parsed.credentials && typeof parsed.credentials === "object") return Object.values(parsed.credentials);
  return [];
}

function readStoreRecords(filePath) {
  if (!filePath || !existsSync(filePath)) return [];
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  if (parsed.schema_version !== LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION) {
    throw new Error(`Unsupported auth credential store schema: ${parsed.schema_version ?? "missing"}`);
  }
  if (parsed.provider_id && parsed.provider_id !== LAWOS_INTERNAL_PASSWORD_PROVIDER_ID) {
    throw new Error(`Unsupported auth credential provider: ${parsed.provider_id}`);
  }
  return recordsFromParsed(parsed);
}

function persistStoreRecords({ filePath, records, now }) {
  if (!filePath) return;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
        provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
        updated_at: new Date(now()).toISOString(),
        records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function digestForPassword(password, salt, params = LAWOS_AUTH_SCRYPT_PARAMS) {
  return scryptSync(String(password), salt, params.keylen, {
    N: params.N,
    r: params.r,
    p: params.p,
  });
}

export function createScryptPasswordHash(password, {
  salt = randomBytes(16).toString("base64url"),
  params = LAWOS_AUTH_SCRYPT_PARAMS,
} = {}) {
  return Object.freeze({
    algorithm: "node:crypto.scrypt",
    params: Object.freeze({ ...params }),
    salt,
    digest: digestForPassword(password, salt, params).toString("base64url"),
  });
}

export function verifyScryptPasswordHash(passwordHash = {}, password) {
  if (passwordHash.algorithm !== "node:crypto.scrypt" || !passwordHash.salt || !passwordHash.digest) return false;
  const params = Object.freeze({ ...LAWOS_AUTH_SCRYPT_PARAMS, ...(passwordHash.params ?? {}) });
  const expected = Buffer.from(String(passwordHash.digest), "base64url");
  const candidate = digestForPassword(password, passwordHash.salt, params);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function createAuthCredentialRecord({
  user_id,
  email,
  password,
  status = "active",
  credential_rev = 1,
  locked_until = null,
} = {}) {
  return normalizeRecord({
    user_id,
    email,
    status,
    credential_rev,
    locked_until,
    password_hash: createScryptPasswordHash(password),
  });
}

export function createAuthCredentialStore({
  filePath = process.env[LAWOS_AUTH_CREDENTIAL_STORE_ENV],
  records,
  now = () => Date.now(),
} = {}) {
  const normalized = (records ?? readStoreRecords(filePath)).map(normalizeRecord);
  const byUserId = new Map(normalized.filter((record) => record.user_id).map((record) => [record.user_id, record]));

  function getByUserId(userId) {
    return byUserId.get(String(userId ?? "")) ?? null;
  }

  function verifyPassword({ user, password } = {}) {
    const record = getByUserId(user?.user_id);
    if (!record) return Object.freeze({ ok: false, reason: "credential_missing", safe_error_code: "AUTH_CREDENTIAL_MISSING" });
    if (record.email && record.email !== String(user?.email ?? "").trim().toLowerCase()) {
      return Object.freeze({ ok: false, reason: "credential_account_mismatch", safe_error_code: "AUTH_CREDENTIAL_INVALID" });
    }
    if (record.status === "disabled") {
      return Object.freeze({ ok: false, reason: "credential_disabled", safe_error_code: "AUTH_CREDENTIAL_DISABLED", status: 403 });
    }
    if (record.status === "reset_required") {
      return Object.freeze({ ok: false, reason: "password_reset_required", safe_error_code: "AUTH_PASSWORD_RESET_REQUIRED", status: 403 });
    }
    if (record.status === "locked" && (!record.locked_until || Date.parse(record.locked_until) > now())) {
      return Object.freeze({ ok: false, reason: "credential_locked", safe_error_code: "AUTH_CREDENTIAL_LOCKED", status: 423 });
    }
    if (!verifyScryptPasswordHash(record.password_hash, password)) {
      return Object.freeze({ ok: false, reason: "credential_invalid", safe_error_code: "AUTH_CREDENTIAL_INVALID", status: 401 });
    }
    return Object.freeze({
      ok: true,
      credential_rev: record.credential_rev,
      credential_status: record.status,
      must_change_password: record.status === "must_change",
    });
  }

  function validateSessionCredential({ user, credentialRev } = {}) {
    const record = getByUserId(user?.user_id);
    if (!record) return Object.freeze({ ok: false, reason: "credential_missing", safe_error_code: "AUTH_CREDENTIAL_MISSING", status: 401 });
    if (record.status === "disabled") return Object.freeze({ ok: false, reason: "credential_disabled", safe_error_code: "AUTH_CREDENTIAL_DISABLED", status: 403 });
    if (record.status === "reset_required") return Object.freeze({ ok: false, reason: "password_reset_required", safe_error_code: "AUTH_PASSWORD_RESET_REQUIRED", status: 403 });
    if (record.status === "locked" && (!record.locked_until || Date.parse(record.locked_until) > now())) {
      return Object.freeze({ ok: false, reason: "credential_locked", safe_error_code: "AUTH_CREDENTIAL_LOCKED", status: 423 });
    }
    if (Number(credentialRev) !== record.credential_rev) {
      return Object.freeze({ ok: false, reason: "credential_revision_mismatch", safe_error_code: "AUTH_CREDENTIAL_REVOKED", status: 401 });
    }
    return Object.freeze({
      ok: true,
      credential_rev: record.credential_rev,
      credential_status: record.status,
      must_change_password: record.status === "must_change",
    });
  }

  function setPassword({ user, password, status = "active" } = {}) {
    const current = getByUserId(user?.user_id);
    const next = normalizeRecord({
      user_id: user?.user_id,
      email: user?.email,
      password_hash: createScryptPasswordHash(password),
      status,
      credential_rev: (current?.credential_rev ?? 0) + 1,
      locked_until: null,
    });
    byUserId.set(next.user_id, next);
    persistStoreRecords({ filePath, records: [...byUserId.values()], now });
    return next;
  }

  function requirePasswordReset({ user } = {}) {
    const current = getByUserId(user?.user_id);
    const next = normalizeRecord({
      user_id: user?.user_id,
      email: user?.email,
      password_hash: current?.password_hash ?? {},
      status: "reset_required",
      credential_rev: (current?.credential_rev ?? 0) + 1,
      locked_until: null,
    });
    byUserId.set(next.user_id, next);
    persistStoreRecords({ filePath, records: [...byUserId.values()], now });
    return next;
  }

  return Object.freeze({
    provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
    schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
    source: filePath ? "file" : "in_memory_fixture",
    filePath: filePath ?? null,
    count: byUserId.size,
    getByUserId,
    verifyPassword,
    validateSessionCredential,
    setPassword,
    requirePasswordReset,
  });
}
