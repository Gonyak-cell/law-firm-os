import { createHash, randomBytes } from "node:crypto";

const RENDERER_FORBIDDEN_FIELDS = new Set([
  "access_token",
  "refresh_token",
  "id_token",
  "operator_token",
  "operatorToken",
  "password",
  "secret"
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
    const response = sanitizeRendererPayload(
      (await this.#runtimeClient?.login?.({ email, password })) ?? {
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
    const response = await this.#runtimeClient?.features?.({ email });
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
    const response = await this.#runtimeClient?.smoke?.({ email, featureId });
    return sanitizeRendererPayload(
      response ?? {
        ok: false,
        reason: "runtime_client_not_configured",
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
