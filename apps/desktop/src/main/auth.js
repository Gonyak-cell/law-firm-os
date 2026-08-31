import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RENDERER_FORBIDDEN_FIELDS = new Set([
  "access_token",
  "refresh_token",
  "id_token",
  "operator_token",
  "operatorToken",
  "session_token",
  "sessionToken",
  "outlook_desktop_principal_ref",
  "reset_token",
  "resetToken",
  "reset_url",
  "resetUrl",
  "reset_open_url",
  "resetOpenUrl",
  "password",
  "password_hash",
  "credential_hash",
  "digest",
  "secret"
]);

const ENCRYPTED_SECURE_STORE_SCHEMA_VERSION = "law-firm-os.desktop-secure-store.v1";
const PERSISTED_SECURE_STORE_KEYS = new Set([
  "session_token",
  "session_snapshot",
  "pending_vault_uploads",
]);
const PENDING_VAULT_UPLOAD_SCHEMA = "law-firm-os.desktop-vault-upload-pending.v1";
const PENDING_VAULT_UPLOAD_LIMIT = 32;
const VAULT_UPLOAD_OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const VAULT_UPLOAD_SHA256 = /^[a-f0-9]{64}$/u;
const VAULT_UPLOAD_MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const TERMINAL_SESSION_RESTORE_SAFE_ERROR_CODES = new Set([
  "AUTH_SESSION_INVALID",
  "AUTH_SESSION_EXPIRED",
  "AUTH_SESSION_REVOKED",
  "AUTH_SESSION_UNKNOWN_USER",
  "AUTH_SESSION_TENANT_DENIED",
  "AUTH_ACCOUNT_DISABLED",
  "AUTH_CREDENTIAL_REVOKED",
  "AUTH_CREDENTIAL_MISSING",
  "AUTH_CREDENTIAL_DISABLED",
  "AUTH_PASSWORD_RESET_REQUIRED"
]);
const TERMINAL_SESSION_RESTORE_REASONS = new Set([
  "auth_session_invalid",
  "auth_session_expired",
  "auth_session_revoked",
  "auth_session_unknown_user",
  "auth_session_tenant_denied",
  "auth_account_disabled",
  "account_disabled",
  "credential_missing",
  "credential_disabled",
  "password_reset_required",
  "credential_inactive",
  "credential_revision_mismatch",
  "session_not_active",
  "session_revoked",
  "tenant_membership_inactive",
  "membership_revision_mismatch"
]);
const SAFE_SESSION_RESTORE_REASONS = new Set([
  ...TERMINAL_SESSION_RESTORE_REASONS,
  "runtime_client_not_configured",
  "runtime_auth_not_configured",
  "runtime_request_failed",
  "runtime_response_not_json",
  "session_restore_deferred",
  "session_restore_failed",
  "runtime_server_error",
  "dependency_unavailable",
  "internal_error"
]);

export const FORBIDDEN_RENDERER_TOKEN_FIELDS = Object.freeze(["access_token", "refresh_token", "id_token"]);

export function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkcePair({ randomBytesFn = randomBytes } = {}) {
  const verifier = base64Url(randomBytesFn(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge, method: "S256" };
}

export function memorySecureStore() {
  const entries = new Map();
  return {
    async set(key, value) {
      entries.set(key, value);
    },
    async get(key) {
      return entries.get(key);
    },
    async delete(key) {
      entries.delete(key);
    },
    async clear() {
      entries.clear();
    },
    snapshot() {
      return Object.fromEntries(entries);
    }
  };
}

export function encryptedFileSecureStore({
  filePath,
  safeStorage,
  existsSyncImpl = existsSync,
  readFileSyncImpl = readFileSync,
  writeFileSyncImpl = writeFileSync,
  mkdirSyncImpl = mkdirSync,
  rmSyncImpl = rmSync
} = {}) {
  const entries = new Map();

  const encryptionAvailable = () => {
    try {
      return Boolean(filePath && safeStorage?.isEncryptionAvailable?.());
    } catch {
      return false;
    }
  };

  const removeFile = () => {
    if (!filePath) return;
    try {
      rmSyncImpl(filePath, { force: true });
    } catch {
      return;
    }
  };

  const loadPersisted = () => {
    if (!encryptionAvailable()) return;
    if (!existsSyncImpl(filePath)) return;
    try {
      const parsed = JSON.parse(readFileSyncImpl(filePath, "utf8"));
      if (parsed?.schema_version !== ENCRYPTED_SECURE_STORE_SCHEMA_VERSION) return;
      const storedEntries = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {};
      for (const [key, encryptedValue] of Object.entries(storedEntries)) {
        if (!PERSISTED_SECURE_STORE_KEYS.has(key) || typeof encryptedValue !== "string") continue;
        const decrypted = safeStorage.decryptString(Buffer.from(encryptedValue, "base64"));
        entries.set(key, JSON.parse(decrypted));
      }
    } catch {
      entries.clear();
      // A transient Keychain or file parse failure must not destroy the only persisted session copy.
    }
  };

  const persist = () => {
    if (!encryptionAvailable()) return;
    const persistedEntries = {};
    for (const [key, value] of entries.entries()) {
      if (!PERSISTED_SECURE_STORE_KEYS.has(key) || value == null || value === "") continue;
      persistedEntries[key] = Buffer.from(safeStorage.encryptString(JSON.stringify(value))).toString("base64");
    }
    if (Object.keys(persistedEntries).length === 0) {
      removeFile();
      return;
    }
    const parentDir = dirname(filePath);
    if (!existsSyncImpl(parentDir)) mkdirSyncImpl(parentDir);
    writeFileSyncImpl(
      filePath,
      JSON.stringify({
        schema_version: ENCRYPTED_SECURE_STORE_SCHEMA_VERSION,
        entries: persistedEntries
      }, null, 2)
    );
  };

  loadPersisted();

  return {
    async set(key, value) {
      entries.set(key, value);
      persist();
    },
    async get(key) {
      return entries.get(key);
    },
    async delete(key) {
      entries.delete(key);
      persist();
    },
    async clear() {
      entries.clear();
      removeFile();
    },
    snapshot() {
      return Object.fromEntries(entries);
    }
  };
}

function isTerminalSessionRestoreFailure(response) {
  const httpStatus = Number(response?.http_status ?? response?.status ?? 0);
  if (![401, 403].includes(httpStatus)) return false;
  const payloads = [response, response?.body].filter((payload) => payload && typeof payload === "object");
  return payloads.some((payload) => {
    const safeErrorCodes = [
      ...(Array.isArray(payload.safe_error_codes) ? payload.safe_error_codes : []),
      payload.safe_error_code
    ];
    return safeErrorCodes.some((code) => TERMINAL_SESSION_RESTORE_SAFE_ERROR_CODES.has(code))
      || TERMINAL_SESSION_RESTORE_REASONS.has(payload.reason);
  });
}

function safeSessionRestoreReason(response, fallback) {
  const reason = typeof response?.reason === "string" ? response.reason : "";
  return SAFE_SESSION_RESTORE_REASONS.has(reason) ? reason : fallback;
}

export async function wipeSessionCaches({ secureStore, cacheStores = [] } = {}) {
  let secureStoreCleared = !secureStore;
  let cacheStoresCleared = 0;
  let failureCount = 0;
  if (secureStore) {
    try {
      if (typeof secureStore.clear !== "function") throw new TypeError("secure store clear is required");
      await secureStore.clear();
      secureStoreCleared = true;
    } catch {
      failureCount += 1;
    }
  }
  for (const cache of cacheStores) {
    try {
      if (typeof cache?.clear === "function") await cache.clear();
      else if (typeof cache?.delete === "function") await cache.delete();
      else throw new TypeError("cache clear is required");
      cacheStoresCleared += 1;
    } catch {
      failureCount += 1;
    }
  }
  return {
    ok: secureStoreCleared && cacheStoresCleared === cacheStores.length && failureCount === 0,
    secureStoreCleared,
    cacheStoresCleared,
    failureCount
  };
}

export function sanitizeRendererPayload(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeRendererPayload(item));
  if (typeof value !== "object") return value;

  const sanitized = {};
  for (const [key, nested] of Object.entries(value)) {
    if (RENDERER_FORBIDDEN_FIELDS.has(key)) continue;
    sanitized[key] = sanitizeRendererPayload(nested);
  }
  return sanitized;
}

function normalizePendingVaultUpload(value = {}, now = Date.now) {
  const operationId = value.operationId ?? value.operation_id;
  const expected = value.expected ?? {};
  const sha256 = expected.sha256;
  const byteSize = Number(expected.byteSize ?? expected.byte_size);
  const mimeType = typeof (expected.mimeType ?? expected.mime_type) === "string"
    ? (expected.mimeType ?? expected.mime_type).trim().toLowerCase()
    : "";
  if (!VAULT_UPLOAD_OPERATION_ID.test(operationId ?? "")
      || !VAULT_UPLOAD_SHA256.test(sha256 ?? "")
      || !Number.isSafeInteger(byteSize)
      || byteSize < 1
      || !VAULT_UPLOAD_MIME_TYPE.test(mimeType)) {
    throw new TypeError("Pending Vault upload binding is invalid");
  }
  const createdAt = Number(value.createdAt ?? value.created_at ?? now());
  const updatedAt = Number(value.updatedAt ?? value.updated_at ?? now());
  if (!Number.isSafeInteger(createdAt) || createdAt < 0
      || !Number.isSafeInteger(updatedAt) || updatedAt < createdAt) {
    throw new TypeError("Pending Vault upload timestamps are invalid");
  }
  return Object.freeze({
    schema_version: PENDING_VAULT_UPLOAD_SCHEMA,
    operation_id: operationId,
    expected: Object.freeze({
      sha256,
      byte_size: byteSize,
      mime_type: mimeType,
    }),
    created_at: createdAt,
    updated_at: updatedAt,
    raw_path_included: false,
    raw_bytes_included: false,
    filename_included: false,
  });
}

function validPendingVaultUploads(value, now) {
  const entries = Array.isArray(value) ? value : [];
  const valid = [];
  for (const entry of entries) {
    try {
      if (entry?.schema_version !== PENDING_VAULT_UPLOAD_SCHEMA
          || entry?.raw_path_included !== false
          || entry?.raw_bytes_included !== false
          || entry?.filename_included !== false) continue;
      valid.push(normalizePendingVaultUpload(entry, now));
    } catch {
      // Corrupt or obsolete entries are ignored instead of being sent to the runtime.
    }
  }
  return valid
    .sort((left, right) => right.updated_at - left.updated_at)
    .slice(0, PENDING_VAULT_UPLOAD_LIMIT);
}

export class MainProcessAuthCoordinator {
  #pending = null;
  #session = { state: "signed_out" };
  #logoIntroClaimed = false;
  #secureStore;
  #cacheStores;
  #now;
  #runtimeClient;
  #outlookLifecycle;

  constructor({ secureStore = memorySecureStore(), cacheStores = [], now = () => Date.now(), runtimeClient = null, outlookLifecycle = null } = {}) {
    this.#secureStore = secureStore;
    this.#cacheStores = cacheStores;
    this.#now = now;
    this.#runtimeClient = runtimeClient;
    this.#outlookLifecycle = outlookLifecycle;
  }

  async #synchronizeOutlookLifecycle(session) {
    if (typeof this.#outlookLifecycle?.sessionAvailable !== "function") return;
    try {
      await this.#outlookLifecycle.sessionAvailable(session);
    } catch {
      // Outlook lifecycle failure must not invalidate an otherwise valid LawOS session.
    }
  }

  #stopOutlookLifecycle(reason) {
    try {
      this.#outlookLifecycle?.stop?.({ reason });
    } catch {
      return;
    }
  }

  startLogin({ issuerUrl, clientId, redirectUri, scope = "openid profile email", tenantIdHash = "tenant_pending" }) {
    const pkce = createPkcePair();
    const state = base64Url(randomBytes(24));
    const nonce = base64Url(randomBytes(24));
    const authorizationUrl = new URL("/authorize", issuerUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("scope", scope);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("code_challenge", pkce.challenge);
    authorizationUrl.searchParams.set("code_challenge_method", pkce.method);

    this.#pending = { pkce, state, nonce, tenantIdHash };

    return {
      authorizationUrl: authorizationUrl.toString(),
      state,
      codeChallenge: pkce.challenge,
      codeChallengeMethod: pkce.method
    };
  }

  async completeCallback({ code, state, tokenSet }) {
    if (!this.#pending) throw new Error("No pending PKCE auth request");
    if (state !== this.#pending.state) throw new Error("Auth callback state mismatch");
    if (!code) throw new Error("Auth callback code is required");

    const localCleanup = await wipeSessionCaches({
      secureStore: this.#secureStore,
      cacheStores: this.#cacheStores,
    });
    if (!localCleanup.ok) {
      const error = new Error("Local session cache cleanup failed");
      error.code = "LOCAL_SESSION_CLEANUP_FAILED";
      throw error;
    }
    await this.#secureStore.set("token_set", {
      ...tokenSet,
      pkce_verifier: this.#pending.pkce.verifier
    });

    this.#session = {
      state: "signed_in",
      tenantIdHash: this.#pending.tenantIdHash,
      expiresAt: tokenSet.expires_at ?? this.#now() + 3600_000
    };
    this.#pending = null;
    return this.sessionStatus();
  }

  sessionStatus() {
    return { ...this.#session };
  }

  claimLogoIntro() {
    const play = !this.#logoIntroClaimed;
    this.#logoIntroClaimed = true;
    return {
      ok: true,
      play_logo_animation: play,
      animation_scope: "app_process",
      token_material_returned: false
    };
  }

  runtimeStatus() {
    return this.#runtimeClient?.runtimeStatus?.() ?? {
      configured: false,
      mode: "aws-temporary-execute-api",
      reason: "runtime_client_not_configured",
      operatorTokenMaterialExposed: false
    };
  }

  async accounts() {
    const response = await this.#runtimeClient?.accounts?.();
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
  }

  async login(input = {}) {
    const email = typeof input === "string" ? input : input.email;
    const password = typeof input === "string" ? undefined : input.password;
    const localCleanup = await wipeSessionCaches({
      secureStore: this.#secureStore,
      cacheStores: this.#cacheStores,
    });
    if (!localCleanup.ok) {
      this.#stopOutlookLifecycle("login_local_cleanup_failed");
      this.#session = {
        state: "signed_out",
        reason: "local_session_cleanup_failed",
      };
      return {
        ok: false,
        reason: "local_session_cleanup_failed",
        session: this.sessionStatus(),
        token_material_returned: false,
      };
    }
    const rawResponse = await this.#runtimeClient?.login?.({ email, password });
    if (rawResponse?.ok && typeof rawResponse.session_token === "string" && rawResponse.session_token) {
      await this.#secureStore.set("session_token", rawResponse.session_token);
      await this.#secureStore.delete("session_snapshot");
    } else if (rawResponse?.ok && rawResponse.session) {
      await this.#secureStore.delete("session_token");
      await this.#secureStore.set("session_snapshot", sanitizeRendererPayload(rawResponse.session));
    } else {
      await this.#secureStore.delete("session_token");
      await this.#secureStore.delete("session_snapshot");
    }
    const response = sanitizeRendererPayload(
      rawResponse ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
    if (response.ok && response.session) {
      this.#session = sanitizeRendererPayload(response.session);
      await this.#synchronizeOutlookLifecycle(rawResponse.session);
    } else {
      this.#stopOutlookLifecycle("login_failed");
      this.#session = {
        state: "signed_out",
        reason: response.reason ?? "login_failed"
      };
    }
    return {
      ...response,
      session: this.sessionStatus(),
      token_material_returned: false
    };
  }

  async restoreSession() {
    const sessionToken = await this.#secureStore.get("session_token");
    if (sessionToken) {
      let rawResponse;
      try {
        rawResponse = await this.#runtimeClient?.features?.({ sessionToken });
      } catch {
        rawResponse = {
          ok: false,
          reason: "runtime_request_failed",
          http_status: 0,
          token_material_returned: false
        };
      }
      const response = sanitizeRendererPayload(
        rawResponse ?? {
          ok: false,
          reason: "runtime_client_not_configured",
          http_status: 0,
          token_material_returned: false
        }
      );
      if (response.ok && response.session) {
        this.#session = sanitizeRendererPayload(response.session);
        await this.#synchronizeOutlookLifecycle(rawResponse.session);
        return this.sessionStatus();
      }
      const terminalFailure = isTerminalSessionRestoreFailure(response);
      if (terminalFailure) await this.#secureStore.delete("session_token");
      this.#session = {
        state: "signed_out",
        reason: safeSessionRestoreReason(
          response,
          terminalFailure ? "session_restore_failed" : "session_restore_deferred"
        )
      };
      this.#stopOutlookLifecycle("session_restore_failed");
      return this.sessionStatus();
    }
    const sessionSnapshot = await this.#secureStore.get("session_snapshot");
    if (!sessionSnapshot?.email) {
      this.#stopOutlookLifecycle("signed_out");
      return this.sessionStatus();
    }
    this.#stopOutlookLifecycle("unverified_session_snapshot");
    const accounts = await this.accounts();
    if (!accounts.ok) {
      this.#session = {
        state: "signed_out",
        reason: accounts.reason ?? "session_restore_deferred"
      };
      return this.sessionStatus();
    }
    const account = (accounts.users ?? []).find((user) => String(user.email).toLowerCase() === String(sessionSnapshot.email).toLowerCase());
    if (account && account.status === "active") {
      this.#session = sanitizeRendererPayload({
        ...sessionSnapshot,
        state: "signed_in",
        role_ids: account.role_ids ?? sessionSnapshot.role_ids,
        scopes: account.scopes ?? sessionSnapshot.scopes,
        tenant_id: sessionSnapshot.tenant_id ?? account.tenant_ids?.[0],
        highest_privilege: account.highest_privilege ?? sessionSnapshot.highest_privilege
      });
      return this.sessionStatus();
    }
    await this.#secureStore.delete("session_snapshot");
    this.#session = {
      state: "signed_out",
      reason: "session_restore_account_inactive"
    };
    return this.sessionStatus();
  }

  async requestPasswordReset(input = {}) {
    const response = await this.#runtimeClient?.requestPasswordReset?.({ email: input.email });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
  }

  async latestResetEmail(input = {}) {
    const response = await this.#runtimeClient?.latestResetEmail?.({ email: input.email });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
  }

  async confirmPasswordReset(input = {}) {
    const response = await this.#runtimeClient?.confirmPasswordReset?.({
      token: input.token ?? input.reset_token,
      password: input.password ?? input.new_password
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
  }

  async features(input = {}) {
    const email = input.email ?? this.#session.email;
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.features?.({ email, sessionToken });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
  }

  async smoke(input = {}) {
    const email = input.email ?? this.#session.email;
    const featureId = input.featureId ?? input.feature_id;
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.smoke?.({ email, featureId, sessionToken });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        token_material_returned: false
      }
    );
  }

  async api(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.api?.({
      path: input.path,
      method: input.method,
      headers: input.headers,
      body: input.body,
      sessionToken
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        http_status: 0,
        token_material_returned: false
      }
    );
  }

  async precheckVaultUpload(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.precheckVaultUpload?.({
      matterId: input.matterId,
      workspaceId: input.workspaceId ?? null,
      folderId: input.folderId ?? null,
      sessionToken,
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        http_status: 0,
        token_material_returned: false,
      },
    );
  }

  async uploadVaultFile(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.uploadVaultFile?.({
      stream: input.stream,
      openStream: input.openStream,
      assertUnchanged: input.assertUnchanged,
      file: input.file,
      operationId: input.operationId,
      sessionToken,
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        http_status: 0,
        token_material_returned: false,
      },
    );
  }

  async continueVaultUpload(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.continueVaultUpload?.({
      operationId: input.operationId,
      expected: input.expected,
      sessionToken,
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        http_status: 0,
        token_material_returned: false,
      },
    );
  }

  async rememberPendingVaultUpload(input = {}) {
    const next = normalizePendingVaultUpload(input, this.#now);
    const current = validPendingVaultUploads(
      await this.#secureStore.get("pending_vault_uploads"),
      this.#now,
    ).filter((entry) => entry.operation_id !== next.operation_id);
    const entries = [next, ...current].slice(0, PENDING_VAULT_UPLOAD_LIMIT);
    await this.#secureStore.set("pending_vault_uploads", entries);
    return next;
  }

  async pendingVaultUploads() {
    const entries = validPendingVaultUploads(
      await this.#secureStore.get("pending_vault_uploads"),
      this.#now,
    );
    return Object.freeze(entries);
  }

  async forgetPendingVaultUpload(input = {}) {
    const operationId = input.operationId ?? input.operation_id;
    if (!VAULT_UPLOAD_OPERATION_ID.test(operationId ?? "")) {
      throw new TypeError("Pending Vault upload operation ID is invalid");
    }
    const current = validPendingVaultUploads(
      await this.#secureStore.get("pending_vault_uploads"),
      this.#now,
    );
    const entries = current.filter((entry) => entry.operation_id !== operationId);
    if (entries.length === 0) await this.#secureStore.delete("pending_vault_uploads");
    else await this.#secureStore.set("pending_vault_uploads", entries);
    return Object.freeze({ forgotten: entries.length !== current.length, operation_id: operationId });
  }

  async precheckVaultExport(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.precheckVaultExport?.({
      matterId: input.matterId,
      exactVersion: input.exactVersion,
      sessionToken,
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        http_status: 0,
        token_material_returned: false,
      },
    );
  }

  async downloadVaultExactVersion(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    if (typeof this.#runtimeClient?.downloadVaultExactVersion !== "function") {
      const error = new Error("Desktop Vault exact export runtime is not configured");
      error.code = "VAULT_EXPORT_RUNTIME_UNAVAILABLE";
      throw error;
    }
    return this.#runtimeClient.downloadVaultExactVersion({
      matterId: input.matterId,
      exactVersion: input.exactVersion,
      operationKind: input.operationKind,
      requestNonceSha256: input.requestNonceSha256,
      installationRefSha256: input.installationRefSha256,
      composeTargetSha256: input.composeTargetSha256,
      sessionToken,
    });
  }

  async completeVaultExport(input = {}) {
    const sessionToken = await this.#secureStore.get("session_token");
    const response = await this.#runtimeClient?.completeVaultExport?.({
      operationId: input.operationId,
      exactVersion: input.exactVersion,
      operationKind: input.operationKind,
      completionStage: input.completionStage,
      installationRefSha256: input.installationRefSha256,
      composeTargetSha256: input.composeTargetSha256,
      sessionToken,
    });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
        http_status: 0,
        token_material_returned: false,
      },
    );
  }

  async refreshOutlookLifecycle() {
    if (typeof this.#outlookLifecycle?.refresh !== "function") {
      return {
        state: "idle",
        next_action: null,
        browser_required: false,
        safe_error_codes: [],
        token_material_returned: false,
        private_key_material_returned: false,
        production_ready_claim: false
      };
    }
    try {
      return sanitizeRendererPayload(await this.#outlookLifecycle.refresh());
    } catch {
      return {
        state: "unknown",
        next_action: "retry",
        browser_required: false,
        safe_error_codes: ["OUTLOOK_DESKTOP_LIFECYCLE_UNAVAILABLE"],
        token_material_returned: false,
        private_key_material_returned: false,
        production_ready_claim: false
      };
    }
  }

  outlookLifecycleStatus() {
    const status = this.#outlookLifecycle?.status?.();
    return sanitizeRendererPayload(status ?? {
      state: "idle",
      next_action: null,
      browser_required: false,
      safe_error_codes: [],
      retry_scheduled: false,
      token_material_returned: false,
      private_key_material_returned: false,
      production_ready_claim: false
    });
  }

  retryOutlookLifecycle() {
    return this.refreshOutlookLifecycle();
  }

  async confirmOutlookMicrosoft(input = {}, handoff = null) {
    if (typeof this.#outlookLifecycle?.confirmMicrosoft !== "function") {
      return {
        handoff_accepted: false,
        reason: "microsoft_handoff_unavailable",
        token_material_returned: false
      };
    }
    try {
      return sanitizeRendererPayload(await this.#outlookLifecycle.confirmMicrosoft({
        confirmed: input?.confirmed === true
      }, handoff));
    } catch {
      return {
        handoff_accepted: false,
        reason: "microsoft_handoff_failed",
        token_material_returned: false
      };
    }
  }

  async disconnectOutlookDevice(input = {}) {
    if (input?.confirmed !== true) {
      return {
        retired: false,
        reason: "explicit_confirmation_required",
        token_material_returned: false
      };
    }
    if (typeof this.#outlookLifecycle?.disconnectDevice !== "function") {
      return {
        retired: false,
        reason: "device_disconnect_unavailable",
        token_material_returned: false
      };
    }
    try {
      return sanitizeRendererPayload(await this.#outlookLifecycle.disconnectDevice());
    } catch {
      return {
        retired: false,
        reason: "device_disconnect_failed",
        token_material_returned: false
      };
    }
  }

  async logout() {
    this.#stopOutlookLifecycle("logout");
    let serverRevoke = {
      attempted: false,
      ok: false,
      reason: "signed_session_not_available",
      http_status: 0
    };
    let localCleanup;
    try {
      const sessionToken = await this.#secureStore.get("session_token");
      if (sessionToken) {
        serverRevoke = { attempted: true, ok: false, reason: "server_session_revoke_unavailable", http_status: 0 };
        if (typeof this.#runtimeClient?.logout === "function") {
          const response = sanitizeRendererPayload(await this.#runtimeClient.logout({ sessionToken }));
          serverRevoke = {
            attempted: true,
            ok: response?.ok === true,
            reason: response?.ok === true ? null : "server_session_revoke_failed",
            http_status: Number(response?.http_status ?? 0)
          };
        }
      }
    } catch {
      serverRevoke = {
        attempted: true,
        ok: false,
        reason: "server_session_revoke_failed",
        http_status: 0
      };
    } finally {
      localCleanup = await wipeSessionCaches({ secureStore: this.#secureStore, cacheStores: this.#cacheStores });
      this.#pending = null;
      this.#session = { state: "signed_out" };
    }
    return {
      ...this.sessionStatus(),
      server_revoke: serverRevoke,
      local_cache_cleared: localCleanup.ok,
      token_material_returned: false
    };
  }
}
