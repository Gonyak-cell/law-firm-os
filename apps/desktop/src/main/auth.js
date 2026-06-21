import { createHash, randomBytes } from "node:crypto";

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

export class MainProcessAuthCoordinator {
  #pending = null;
  #session = { state: "signed_out" };
  #secureStore;
  #cacheStores;
  #now;

  constructor({ secureStore = memorySecureStore(), cacheStores = [], now = () => Date.now() } = {}) {
    this.#secureStore = secureStore;
    this.#cacheStores = cacheStores;
    this.#now = now;
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

  async logout() {
    await wipeSessionCaches({ secureStore: this.#secureStore, cacheStores: this.#cacheStores });
    this.#pending = null;
    this.#session = { state: "signed_out" };
    return this.sessionStatus();
  }
}
