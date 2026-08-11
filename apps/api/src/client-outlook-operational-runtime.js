import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

import {
  M365_GRAPH_REQUIRED_SCOPES,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  M365_GRAPH_CALLBACK_MODES,
} from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import {
  createMicrosoftGraphConversationProvider,
} from "../../../packages/email-dms/src/microsoft-graph-conversation-provider.js";
import {
  createMicrosoftGraphMailProvider,
} from "../../../packages/email-dms/src/microsoft-graph-mail-provider.js";
import {
  resolveAwsJsonSecret,
  resolveM365ConfigSecretId,
} from "./aws-secret-reference.js";
import { createAwsM365CredentialVault } from "./m365-credential-vault.js";
import {
  createMicrosoftDelegatedOAuthClient,
  normalizeMicrosoftDelegatedOAuthConfig,
} from "./microsoft-delegated-oauth-client.js";
import {
  MICROSOFT_EGRESS_REDIRECT_URIS,
  createMicrosoftEgressBrokerTransport,
} from "./microsoft-egress-broker-transport.js";
import {
  createMicrosoftOfficeSsoProvider,
} from "./microsoft-office-sso-provider.js";
import {
  parseOutlookDesktopAutoconnectRoster,
} from "./outlook-desktop-entitlement.js";

export const LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID_ENV =
  "LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID";
export const LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV =
  "LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED";
export const LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV =
  "LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED";
export const LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED_ENV =
  "LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED";

const OAUTH_STATE_SCHEMA = "lawos.client-outlook.oauth-state.v1";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const CLIENT_REFRESH_PROFILE = "client";
const REFRESH_PROFILE_PROOF = /^[A-Za-z0-9_-]{43}$/u;

function requiredText(value, name, maxLength = 4096) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) {
    throw new TypeError(`${name} is required`);
  }
  return text;
}

function requiredId(value, name) {
  const text = requiredText(value, name, 200);
  if (!SAFE_ID.test(text)) throw new TypeError(`${name} must be a safe identifier`);
  return text;
}

function instant(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("clock must return a valid date");
  }
  return date;
}

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function providerError(message, status = 400) {
  return Object.assign(new Error(message), {
    safe_error_code: "M365_PROVIDER_RESPONSE_INVALID",
    status,
  });
}

function authorizationCallbackMode(value) {
  const mode = value ?? M365_GRAPH_CALLBACK_MODES.legacy;
  if (!Object.values(M365_GRAPH_CALLBACK_MODES).includes(mode)) {
    throw providerError("Microsoft authorization callback mode is invalid");
  }
  return mode;
}

function clientRefreshBinding(input = {}) {
  const profile = requiredText(input.refresh_profile, "refresh_profile", 16);
  const proof = requiredText(
    input.refresh_profile_proof,
    "refresh_profile_proof",
    128,
  );
  if (
    profile !== CLIENT_REFRESH_PROFILE
    || !REFRESH_PROFILE_PROOF.test(proof)
  ) {
    throw providerError("Microsoft refresh credential profile is invalid", 401);
  }
  return Object.freeze({
    refresh_profile: profile,
    refresh_profile_proof: proof,
  });
}

function stateEncryptionKey(value) {
  const text = requiredText(value, "state_encryption_key", 256);
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(text)) {
    throw new TypeError("state_encryption_key must be base64");
  }
  const key = Buffer.from(text, "base64");
  if (key.byteLength !== 32) {
    throw new TypeError("state_encryption_key must decode to 32 bytes");
  }
  return key;
}

function approvedRedirectUris(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("redirect_uris are required");
  }
  const redirectUris = [...new Set(values.map((value) => {
    const url = new URL(requiredText(value, "redirect_uri", 2048));
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.hash
    ) {
      throw new TypeError("redirect_uri must be an approved HTTPS callback URI");
    }
    return url.toString();
  }))];
  if (
    redirectUris.length !== 1
    || redirectUris[0] !== MICROSOFT_EGRESS_REDIRECT_URIS.client
  ) {
    throw new TypeError("redirect_uris must match the client broker profile");
  }
  return Object.freeze(redirectUris);
}

function normalizeClientOutlookConfig(input = {}) {
  const redirectUris = approvedRedirectUris(input.redirect_uris);
  const oauth = normalizeMicrosoftDelegatedOAuthConfig({
    tenant_id: input.tenant_id,
    client_id: input.client_id,
    client_secret: requiredText(input.client_secret, "client_secret"),
    redirect_uri: redirectUris[0],
  });
  return Object.freeze({
    ...oauth,
    redirect_uris: redirectUris,
    state_encryption_key: stateEncryptionKey(input.state_encryption_key),
    credential_secret_prefix: requiredText(
      input.credential_secret_prefix,
      "credential_secret_prefix",
      512,
    ),
  });
}

function approvedRedirectUri(value, allowed) {
  let resolved;
  try {
    resolved = new URL(requiredText(value, "redirect_uri", 2048)).toString();
  } catch {
    throw providerError("Microsoft redirect URI is invalid");
  }
  if (!allowed.includes(resolved)) {
    throw providerError("Microsoft redirect URI is not approved");
  }
  return resolved;
}

function statePrincipal(input = {}) {
  return Object.freeze({
    tenant_id: requiredId(input.tenant_id, "tenant_id"),
    user_id: requiredId(input.user_id, "user_id"),
    entra_subject_id: requiredText(
      input.entra_subject_id,
      "entra_subject_id",
      512,
    ),
  });
}

function encryptState(payload, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(OAUTH_STATE_SCHEMA, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

function decryptState(value, key) {
  try {
    const [version, iv, ciphertext, tag, extra] = requiredText(
      value,
      "state",
      4096,
    ).split(".");
    if (version !== "v1" || !iv || !ciphertext || !tag || extra) {
      throw new TypeError("state envelope is invalid");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from(OAUTH_STATE_SCHEMA, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const payload = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8"));
    if (
      !payload
      || typeof payload !== "object"
      || Array.isArray(payload)
      || payload.schema !== OAUTH_STATE_SCHEMA
    ) {
      throw new TypeError("state payload is invalid");
    }
    return payload;
  } catch (error) {
    if (error?.safe_error_code) throw error;
    throw providerError("Microsoft authorization state is invalid");
  }
}

function enabledFlag(value, name) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new TypeError(`${name} must be true or false`);
}

function featureFlags(env) {
  return Object.freeze({
    feature_enabled: enabledFlag(
      env[LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV],
      LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV,
    ),
    inquiry_feature_enabled: enabledFlag(
      env[LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV],
      LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV,
    ),
    provider_runtime_enabled: enabledFlag(
      env[LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED_ENV],
      LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED_ENV,
    ),
  });
}

function disabledProviderConfig(flags) {
  return Object.freeze({
    ...flags,
    allowed_redirect_uris: Object.freeze([]),
    external_readiness: Object.freeze({}),
    office_sso_provider: null,
  });
}

function normalizeOutlookDesktopAutoconnectRoster(value) {
  if (value == null || value === "") return null;
  try {
    return parseOutlookDesktopAutoconnectRoster(value);
  } catch (error) {
    if (error?.safe_error_code !== "OUTLOOK_DESKTOP_ROSTER_INVALID") {
      throw error;
    }
    return null;
  }
}

export function createClientOutlookDelegatedProvider({
  config: rawConfig,
  oauth_client_factory = createMicrosoftDelegatedOAuthClient,
  microsoft_egress_transport,
  clock = () => new Date(),
} = {}) {
  const config = normalizeClientOutlookConfig(rawConfig);
  if (typeof oauth_client_factory !== "function") {
    throw new TypeError("oauth_client_factory is required");
  }
  if (typeof clock !== "function") throw new TypeError("clock is required");
  const clients = new Map();

  function oauthClient(redirectUri) {
    if (!clients.has(redirectUri)) {
      const client = oauth_client_factory({
        config: {
          tenant_id: config.tenant_id,
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: redirectUri,
        },
        microsoft_egress_transport,
        clock,
        scope_profile: "client_outlook_addin",
      });
      for (const method of ["authorizationUrl", "exchange", "refresh"]) {
        if (typeof client?.[method] !== "function") {
          throw new TypeError(`Client Outlook OAuth client ${method} is required`);
        }
      }
      clients.set(redirectUri, client);
    }
    return clients.get(redirectUri);
  }

  function validatedAuthorizationState(input = {}) {
    const state = decryptState(input.state, config.state_encryption_key);
    const redirectUri = approvedRedirectUri(
      input.redirect_uri ?? state.redirect_uri,
      config.redirect_uris,
    );
    const now = instant(clock);
    if (
      state.redirect_uri !== redirectUri
      || !Number.isFinite(Date.parse(state.issued_at))
      || !Number.isFinite(Date.parse(state.expires_at))
      || Date.parse(state.issued_at) > now.getTime() + 60_000
      || Date.parse(state.expires_at) <= now.getTime()
    ) {
      throw providerError("Microsoft authorization state is expired or invalid");
    }
    return Object.freeze({
      ...state,
      callback_mode: authorizationCallbackMode(state.callback_mode),
    });
  }

  return Object.freeze({
    async beginDelegatedAuthorization(input = {}) {
      const principal = statePrincipal(input);
      const redirectUri = approvedRedirectUri(
        input.redirect_uri,
        config.redirect_uris,
      );
      const now = instant(clock);
      const callbackMode = authorizationCallbackMode(input.callback_mode);
      const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_MS);
      const nonce = randomBytes(32).toString("base64url");
      const verifier = randomBytes(32).toString("base64url");
      const state = encryptState({
        schema: OAUTH_STATE_SCHEMA,
        ...principal,
        redirect_uri: redirectUri,
        nonce,
        code_verifier: verifier,
        ...(input.callback_mode === undefined
          ? {}
          : { callback_mode: callbackMode }),
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }, config.state_encryption_key);
      return Object.freeze({
        authorization_url: oauthClient(redirectUri).authorizationUrl({
          state,
          nonce,
          code_challenge: createHash("sha256")
            .update(verifier, "utf8")
            .digest("base64url"),
        }),
        attempt_ref: sha256(state),
        callback_mode: callbackMode,
        expires_at: expiresAt.toISOString(),
        pkce_used: true,
        state_bound: true,
        credential_material_included: false,
      });
    },

    resolveDelegatedAuthorizationState(input = {}) {
      const state = validatedAuthorizationState(input);
      return Object.freeze({
        ...statePrincipal(state),
        redirect_uri: state.redirect_uri,
        callback_mode: state.callback_mode,
      });
    },

    async completeDelegatedAuthorization(input = {}) {
      const principal = statePrincipal(input);
      const redirectUri = approvedRedirectUri(
        input.redirect_uri,
        config.redirect_uris,
      );
      const state = validatedAuthorizationState(input);
      const now = instant(clock);
      if (
        state.tenant_id !== principal.tenant_id
        || state.user_id !== principal.user_id
        || state.entra_subject_id !== principal.entra_subject_id
        || state.redirect_uri !== redirectUri
      ) {
        throw providerError("Microsoft authorization state does not match the signed session");
      }
      const result = await oauthClient(redirectUri).exchange({
        code: requiredText(input.code, "authorization code"),
        code_verifier: requiredText(
          state.code_verifier,
          "state.code_verifier",
          128,
        ),
        expected_nonce_hash: sha256(
          requiredText(state.nonce, "state.nonce", 200),
        ),
        expected_subject_id: principal.entra_subject_id,
      });
      if (result.provider_subject_id !== principal.entra_subject_id) {
        throw providerError(
          "Microsoft authorization subject does not match the signed session",
          403,
        );
      }
      const grantedByLowercase = new Set(
        result.granted_scopes.map((scope) => String(scope).toLowerCase()),
      );
      if (M365_GRAPH_REQUIRED_SCOPES.some(
        (scope) => !grantedByLowercase.has(scope.toLowerCase()),
      )) {
        throw providerError("Microsoft authorization scope is insufficient", 403);
      }
      return Object.freeze({
        authorization_attempt_consumed: true,
        entra_subject_id: principal.entra_subject_id,
        mailbox_address: requiredText(
          result.mailbox_address,
          "mailbox_address",
          320,
        ),
        granted_scopes: M365_GRAPH_REQUIRED_SCOPES,
        consented_at: now.toISOString(),
        expires_at: requiredText(result.expires_at, "expires_at", 100),
        token_bundle: Object.freeze({
          ...clientRefreshBinding(result),
          access_token: requiredText(
            result.access_token,
            "access_token",
            32 * 1024,
          ),
          refresh_token: requiredText(
            result.refresh_token,
            "refresh_token",
            32 * 1024,
          ),
          expires_at: requiredText(result.expires_at, "expires_at", 100),
          granted_scopes: M365_GRAPH_REQUIRED_SCOPES,
        }),
      });
    },

    async refreshDelegatedCredential({ credential } = {}) {
      const binding = clientRefreshBinding(credential);
      const result = await oauthClient(config.redirect_uris[0]).refresh({
        refresh_token: requiredText(
          credential?.refresh_token,
          "credential.refresh_token",
          32 * 1024,
        ),
        ...binding,
      });
      const grantedByLowercase = new Set(
        result.granted_scopes.map((scope) => String(scope).toLowerCase()),
      );
      if (M365_GRAPH_REQUIRED_SCOPES.some(
        (scope) => !grantedByLowercase.has(scope.toLowerCase()),
      )) {
        throw providerError("Microsoft authorization scope is insufficient", 403);
      }
      return Object.freeze({
        expires_at: requiredText(result.expires_at, "expires_at", 100),
        token_bundle: Object.freeze({
          ...credential,
          ...clientRefreshBinding(result),
          access_token: requiredText(
            result.access_token,
            "access_token",
            32 * 1024,
          ),
          refresh_token: requiredText(
            result.refresh_token,
            "refresh_token",
            32 * 1024,
          ),
          expires_at: requiredText(result.expires_at, "expires_at", 100),
          granted_scopes: M365_GRAPH_REQUIRED_SCOPES,
        }),
      });
    },

    async revokeDelegatedCredential({ credential } = {}) {
      requiredText(credential?.access_token, "credential.access_token", 32 * 1024);
      requiredText(credential?.refresh_token, "credential.refresh_token", 32 * 1024);
      return Object.freeze({
        revoked: true,
        revocation_mode: "credential_vault_invalidation",
        credential_material_included: false,
      });
    },
  });
}

export function createClientOutlookM365GraphConfig({
  config,
  flags,
  credential_vault,
  oauth_client_factory,
  graph_provider = null,
  microsoft_egress_transport,
  clock = () => new Date(),
  outlook_desktop_autoconnect_roster = null,
} = {}) {
  for (const method of [
    "storeDelegatedCredential",
    "resolveDelegatedCredential",
    "deleteDelegatedCredential",
  ]) {
    if (typeof credential_vault?.[method] !== "function") {
      throw new TypeError(`Client Outlook credential vault ${method} is required`);
    }
  }
  const normalized = normalizeClientOutlookConfig(config);
  const delegated = createClientOutlookDelegatedProvider({
    config,
    oauth_client_factory,
    microsoft_egress_transport,
    clock,
  });
  const graph = graph_provider ?? createMicrosoftGraphMailProvider({
    microsoft_egress_transport,
  });
  const conversation = createMicrosoftGraphConversationProvider({
    microsoft_egress_transport,
  });
  const officeSsoProvider = createMicrosoftOfficeSsoProvider({
    config: {
      tenant_id: normalized.tenant_id,
      client_id: normalized.client_id,
      callback_uri: normalized.redirect_uris[0],
    },
    microsoft_egress_transport,
    clock,
  });
  const runtimeConfig = {
    feature_enabled: flags?.feature_enabled === true,
    inquiry_feature_enabled: flags?.inquiry_feature_enabled === true,
    provider_runtime_enabled: flags?.provider_runtime_enabled === true,
    entra_tenant_id: normalized.tenant_id,
    allowed_redirect_uris: normalized.redirect_uris,
    external_readiness: Object.freeze({}),
    credential_vault,
    office_sso_provider: officeSsoProvider,
    provider: Object.freeze({
      ...graph,
      ...conversation,
      ...delegated,
      provider: "microsoft-graph-delegated",
    }),
    clock,
  };
  Object.defineProperty(runtimeConfig, "outlook_desktop_autoconnect_roster", {
    value: outlook_desktop_autoconnect_roster,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(runtimeConfig);
}

export async function createClientOutlookM365GraphConfigFromSecretReference({
  env = process.env,
  flags = featureFlags(env),
  secrets_client = null,
  oauth_client_factory,
  graph_provider,
  microsoft_egress_transport = null,
  clock = () => new Date(),
} = {}) {
  const secretId = resolveM365ConfigSecretId({
    env,
    specificEnvName: LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID_ENV,
  });
  const region = requiredText(
    env.AWS_REGION
      ?? env.AWS_DEFAULT_REGION
      ?? env.LAWOS_AWS_REGION
      ?? "ap-northeast-2",
    "AWS region",
  );
  const client = secrets_client ?? new SecretsManagerClient({ region });
  const secret = await resolveAwsJsonSecret({
    secretId,
    region,
    client,
  });
  const config = secret.client_outlook;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("client_outlook secret configuration is required");
  }
  const credentialVault = createAwsM365CredentialVault({
    region,
    secret_prefix: config.credential_secret_prefix,
    client,
  });
  const transport = microsoft_egress_transport
    ?? createMicrosoftEgressBrokerTransport({ region });
  return createClientOutlookM365GraphConfig({
    config,
    flags,
    credential_vault: credentialVault,
    oauth_client_factory,
    graph_provider,
    microsoft_egress_transport: transport,
    clock,
    outlook_desktop_autoconnect_roster:
      normalizeOutlookDesktopAutoconnectRoster(
        secret.outlook_desktop_autoconnect_roster,
      ),
  });
}

export async function resolveLambdaClientOutlookM365GraphConfig({
  env = process.env,
  ...options
} = {}) {
  const flags = featureFlags(env);
  if (
    !flags.feature_enabled
    && !flags.inquiry_feature_enabled
    && !flags.provider_runtime_enabled
  ) {
    return null;
  }
  if (
    (flags.inquiry_feature_enabled || flags.provider_runtime_enabled)
    && !flags.feature_enabled
  ) {
    throw new TypeError(
      `${LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV} must be true before Client Outlook inquiry or provider runtime`,
    );
  }
  if (!flags.provider_runtime_enabled) return disabledProviderConfig(flags);
  return createClientOutlookM365GraphConfigFromSecretReference({
    env,
    flags,
    ...options,
  });
}
