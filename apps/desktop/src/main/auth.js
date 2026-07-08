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
const PERSISTED_SECURE_STORE_KEYS = new Set(["session_token", "session_snapshot"]);

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
      removeFile();
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
    mkdirSyncImpl(dirname(filePath), { recursive: true });
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

export async function wipeSessionCaches({ secureStore, cacheStores = [] } = {}) {
  await secureStore?.clear?.();
  for (const cache of cacheStores) {
    if (typeof cache.clear === "function") await cache.clear();
    else if (typeof cache.delete === "function") await cache.delete();
  }
  return {
    secureStoreCleared: Boolean(secureStore),
    cacheStoresCleared: cacheStores.length
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

export class MainProcessAuthCoordinator {
  #pending = null;
  #session = { state: "signed_out" };
  #logoIntroClaimed = false;
  #secureStore;
  #cacheStores;
  #now;
  #runtimeClient;

  constructor({ secureStore = memorySecureStore(), cacheStores = [], now = () => Date.now(), runtimeClient = null } = {}) {
    this.#secureStore = secureStore;
    this.#cacheStores = cacheStores;
    this.#now = now;
    this.#runtimeClient = runtimeClient;
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
    } else {
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
      const rawResponse = await this.#runtimeClient?.features?.({ sessionToken });
      const response = sanitizeRendererPayload(
        rawResponse ?? {
          ok: false,
          reason: "runtime_client_not_configured",
          token_material_returned: false
        }
      );
      if (response.ok && response.session) {
        this.#session = sanitizeRendererPayload(response.session);
        return this.sessionStatus();
      }
      await this.#secureStore.delete("session_token");
      this.#session = {
        state: "signed_out",
        reason: response.reason ?? "session_restore_failed"
      };
      return this.sessionStatus();
    }
    const sessionSnapshot = await this.#secureStore.get("session_snapshot");
    if (!sessionSnapshot?.email) return this.sessionStatus();
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

  async logout() {
    await wipeSessionCaches({ secureStore: this.#secureStore, cacheStores: this.#cacheStores });
    this.#pending = null;
    this.#session = { state: "signed_out" };
    return this.sessionStatus();
  }
}
