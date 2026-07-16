import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const LAWOS_AUTH_PASSWORD_RESET_STORE_ENV = "LAWOS_AUTH_PASSWORD_RESET_STORE_PATH";
export const LAWOS_AUTH_PASSWORD_RESET_STORE_SCHEMA_VERSION = "law-firm-os.auth-password-reset-store.v0.1";
export const DEFAULT_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(token) {
  return createHash("sha256").update(String(token ?? ""), "utf8").digest("hex");
}

function normalizeRecord(record = {}) {
  return Object.freeze({
    token_hash: String(record.token_hash ?? "").trim(),
    user_id: String(record.user_id ?? "").trim(),
    email: String(record.email ?? "").trim().toLowerCase(),
    requested_at: record.requested_at ?? null,
    expires_at: record.expires_at ?? null,
    used_at: record.used_at ?? null,
    revoked_at: record.revoked_at ?? null,
  });
}

function readStoreRecords(filePath) {
  if (!filePath || !existsSync(filePath)) return [];
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  if (parsed.schema_version !== LAWOS_AUTH_PASSWORD_RESET_STORE_SCHEMA_VERSION) {
    throw new Error(`Unsupported auth password reset store schema: ${parsed.schema_version ?? "missing"}`);
  }
  return Array.isArray(parsed.records) ? parsed.records : [];
}

function persistStoreRecords({ filePath, records, now }) {
  if (!filePath) return;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        schema_version: LAWOS_AUTH_PASSWORD_RESET_STORE_SCHEMA_VERSION,
        updated_at: new Date(now()).toISOString(),
        records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function createAuthPasswordResetStore({
  filePath = process.env[LAWOS_AUTH_PASSWORD_RESET_STORE_ENV],
  records,
  now = () => Date.now(),
} = {}) {
  const byTokenHash = new Map((records ?? readStoreRecords(filePath)).map(normalizeRecord).map((record) => [record.token_hash, record]));

  function persist() {
    persistStoreRecords({ filePath, records: [...byTokenHash.values()], now });
  }

  function revokeOutstandingForUser(userId) {
    const normalizedUserId = String(userId ?? "");
    const revokedAt = new Date(now()).toISOString();
    for (const [hash, record] of byTokenHash.entries()) {
      if (record.user_id === normalizedUserId && !record.used_at && !record.revoked_at) {
        byTokenHash.set(hash, normalizeRecord({ ...record, revoked_at: revokedAt }));
      }
    }
  }

  function create({ user, token, ttlMs = DEFAULT_PASSWORD_RESET_TTL_MS } = {}) {
    if (!user?.user_id || !user?.email) throw new Error("password reset user is required");
    if (!token) throw new Error("password reset token is required");
    revokeOutstandingForUser(user.user_id);
    const requestedAt = now();
    const record = normalizeRecord({
      token_hash: hashPasswordResetToken(token),
      user_id: user.user_id,
      email: user.email,
      requested_at: new Date(requestedAt).toISOString(),
      expires_at: new Date(requestedAt + ttlMs).toISOString(),
      used_at: null,
      revoked_at: null,
    });
    byTokenHash.set(record.token_hash, record);
    persist();
    return record;
  }

  function consume({ token } = {}) {
    const tokenHash = hashPasswordResetToken(token);
    const record = byTokenHash.get(tokenHash);
    if (!record) return Object.freeze({ ok: false, reason: "invalid_reset_token", safe_error_code: "AUTH_PASSWORD_RESET_TOKEN_INVALID", status: 401 });
    if (record.revoked_at) return Object.freeze({ ok: false, reason: "reset_token_revoked", safe_error_code: "AUTH_PASSWORD_RESET_TOKEN_INVALID", status: 401 });
    if (record.used_at) return Object.freeze({ ok: false, reason: "reset_token_used", safe_error_code: "AUTH_PASSWORD_RESET_TOKEN_USED", status: 401 });
    if (!record.expires_at || Date.parse(record.expires_at) <= now()) {
      return Object.freeze({ ok: false, reason: "reset_token_expired", safe_error_code: "AUTH_PASSWORD_RESET_TOKEN_EXPIRED", status: 401 });
    }
    const consumed = normalizeRecord({ ...record, used_at: new Date(now()).toISOString() });
    byTokenHash.set(tokenHash, consumed);
    persist();
    return Object.freeze({ ok: true, record: consumed });
  }

  function revokeForUser({ userId, reason = "reset_delivery_failed" } = {}) {
    const normalizedUserId = String(userId ?? "");
    const revokedAt = new Date(now()).toISOString();
    let revokedCount = 0;
    for (const [hash, record] of byTokenHash.entries()) {
      if (record.user_id === normalizedUserId && !record.used_at && !record.revoked_at) {
        byTokenHash.set(hash, normalizeRecord({ ...record, revoked_at: revokedAt, revoke_reason: reason }));
        revokedCount += 1;
      }
    }
    if (revokedCount > 0) persist();
    return Object.freeze({ revoked_count: revokedCount, token_material_returned: false });
  }

  return Object.freeze({
    schema_version: LAWOS_AUTH_PASSWORD_RESET_STORE_SCHEMA_VERSION,
    source: filePath ? "file" : "in_memory_fixture",
    filePath: filePath ?? null,
    count: byTokenHash.size,
    create,
    consume,
    revokeForUser,
  });
}
