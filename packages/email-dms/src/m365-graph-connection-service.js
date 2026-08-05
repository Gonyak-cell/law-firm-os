import { createHash } from "node:crypto";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
  m365ConnectionStatus,
  normalizeM365Connection,
} from "./m365-connection-model.js";

export const M365_GRAPH_FEATURE_FLAG = "m365_graph_connection_v1";

export const M365_GRAPH_ERROR_CODES = Object.freeze({
  connection_not_found: "M365_CONNECTION_NOT_FOUND",
  credential_delete_failed: "M365_CREDENTIAL_DELETE_FAILED",
  entra_session_required: "M365_ENTRA_SESSION_REQUIRED",
  external_not_ready: "M365_EXTERNAL_READINESS_BLOCKED",
  feature_disabled: "M365_GRAPH_FEATURE_DISABLED",
  mailbox_override: "M365_MAILBOX_OVERRIDE_BLOCKED",
  provider_invalid: "M365_PROVIDER_RESPONSE_INVALID",
  provider_runtime_disabled: "M365_PROVIDER_RUNTIME_DISABLED",
  redirect_uri_invalid: "M365_REDIRECT_URI_INVALID",
  reauthorization_required: "M365_REAUTHORIZATION_REQUIRED",
  scope_insufficient: "M365_SCOPE_INSUFFICIENT",
  state_version_conflict: "M365_CONNECTION_VERSION_CONFLICT",
  subject_mismatch: "M365_ENTRA_SUBJECT_MISMATCH",
});

const EXTERNAL_READINESS_FIELDS = Object.freeze([
  "entra_app_registration_receipt",
  "redirect_uri_receipt",
  "admin_consent_receipt",
  "synthetic_mailbox_receipt",
  "mime_round_trip_receipt",
  "calendar_idempotency_receipt",
  "negative_provider_receipt",
  "no_secret_log_receipt",
]);
const CLIENT_CREDENTIAL_REFRESH_SKEW_MS = 60_000;
const REFRESH_PROFILE_PROOF_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function requiredInstant(input, field) {
  const value = requiredString(input, field);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return new Date(milliseconds).toISOString();
}

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function wholeVersion(value, field = "expected_state_version") {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.state_version_conflict,
      `${field} must be a positive integer`,
      400,
    );
  }
  return value;
}

function timestamp(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("clock must return a valid date");
  }
  return date.toISOString();
}

function assertRepository(repository) {
  for (const method of [
    "create",
    "update",
    "get",
    "list",
    "recordIdempotency",
    "getIdempotency",
    "appendAudit",
    "transaction",
  ]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError("M365 connection repository is required");
    }
  }
}

function operationKey(prefix, value) {
  return `${prefix}:${createHash("sha256")
    .update(requiredString({ value }, "value"))
    .digest("hex")}`;
}

function assertEntraPrincipal(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const userId = requiredString(input, "user_id");
  let entraSubjectId;
  try {
    entraSubjectId = requiredString(input, "entra_subject_id");
  } catch {
    throw commandError(
      M365_GRAPH_ERROR_CODES.entra_session_required,
      "A Microsoft Entra signed session is required",
      403,
    );
  }
  return Object.freeze({
    tenant_id: tenantId,
    user_id: userId,
    entra_subject_id: entraSubjectId,
  });
}

function connectionRef(principal) {
  return {
    tenant_id: principal.tenant_id,
    model_type: "M365Connection",
    m365_connection_id: m365ConnectionId(principal),
  };
}

function findConnection(repository, principal) {
  const expectedId = m365ConnectionId(principal);
  const matches = repository
    .list({
      tenant_id: principal.tenant_id,
      model_type: "M365Connection",
    })
    .filter((record) => (
      record.user_id === principal.user_id
      || record.m365_connection_id === expectedId
    ))
    .map(normalizeM365Connection);
  if (matches.length > 1) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Multiple M365 connections exist for one user",
    );
  }
  const connection = matches[0] ?? null;
  if (
    connection
    && (
      connection.m365_connection_id !== expectedId
      || connection.tenant_id !== principal.tenant_id
      || connection.user_id !== principal.user_id
    )
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "M365 connection identity does not reconcile",
    );
  }
  return connection;
}

function assertSubject(connection, principal) {
  if (connection.entra_subject_id !== principal.entra_subject_id) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.subject_mismatch,
      "The M365 connection belongs to another Entra subject",
      403,
    );
  }
}

function assertProviderRuntime({
  feature_enabled,
  provider_runtime_enabled,
  provider,
  credentialVault,
}) {
  if (feature_enabled !== true) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.feature_disabled,
      "Microsoft 365 connection is disabled",
      503,
    );
  }
  if (
    provider_runtime_enabled !== true
    || !provider
    || !credentialVault
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
      "Microsoft 365 provider runtime is not ready",
      503,
    );
  }
}

function allowedRedirectUri(value, allowedRedirectUris) {
  const redirectUri = requiredString({ redirect_uri: value }, "redirect_uri");
  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw commandError(
      M365_GRAPH_ERROR_CODES.redirect_uri_invalid,
      "Microsoft redirect URI is invalid",
      400,
    );
  }
  const allowed = Array.isArray(allowedRedirectUris)
    ? allowedRedirectUris
    : [];
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.hash
    || !allowed.includes(parsed.toString())
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.redirect_uri_invalid,
      "Microsoft redirect URI is not approved",
      400,
    );
  }
  return parsed.toString();
}

function appendConnectionAudit(repository, {
  connection,
  principal,
  action,
  occurred_at,
  payload = {},
}) {
  if (typeof repository.appendAudit !== "function") return null;
  return repository.appendAudit({
    tenant_id: principal.tenant_id,
    event_id:
      `audit:${connection.m365_connection_id}:${connection.state_version}:${action}`,
    event_type: action,
    actor_id: principal.user_id,
    object_type: "M365Connection",
    object_id: connection.m365_connection_id,
    payload: {
      state_version: connection.state_version,
      granted_scopes: connection.granted_scopes,
      mailbox_address_hash: connection.mailbox_address_hash,
      credential_material_included: false,
      ...payload,
    },
    created_at: occurred_at,
  });
}

function presentConnection(connection, options) {
  if (!connection) {
    return Object.freeze({
      connection_id: null,
      status: "not_connected",
      active: false,
      granted_scopes: Object.freeze([]),
      missing_scopes: M365_GRAPH_REQUIRED_SCOPES,
      expires_at: null,
      revoked_at: null,
      state_version: null,
      mailbox_scope: "me",
      credential_material_included: false,
      token_refresh_pending: false,
      production_ready_claim: false,
    });
  }
  const status = m365ConnectionStatus(connection, options);
  const credentialRefreshPending = status.status === "expired"
    && connection.revoked_at === null
    && status.missing_scopes.length === 0;
  return Object.freeze({
    connection_id: connection.m365_connection_id,
    status: credentialRefreshPending ? "connected" : status.status,
    active: status.active || credentialRefreshPending,
    granted_scopes: connection.granted_scopes,
    missing_scopes: status.missing_scopes,
    expires_at: connection.expires_at,
    revoked_at: connection.revoked_at,
    state_version: connection.state_version,
    mailbox_scope: "me",
    credential_material_included: false,
    token_refresh_pending: credentialRefreshPending,
    production_ready_claim: false,
  });
}

function clientCredential(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.reauthorization_required,
      "Microsoft 365 delegated credential requires reauthorization",
      401,
    );
  }
  const refreshProfile = typeof value.refresh_profile === "string"
    ? value.refresh_profile
    : "";
  const refreshProfileProof = typeof value.refresh_profile_proof === "string"
    ? value.refresh_profile_proof
    : "";
  const expiresAt = Date.parse(value.expires_at);
  if (
    refreshProfile !== "client"
    || !REFRESH_PROFILE_PROOF_PATTERN.test(refreshProfileProof)
    || !Number.isFinite(expiresAt)
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.reauthorization_required,
      "Microsoft 365 delegated credential requires reauthorization",
      401,
    );
  }
  return Object.freeze({
    ...structuredClone(value),
    access_token: requiredString(value, "access_token"),
    refresh_token: requiredString(value, "refresh_token"),
    refresh_profile: refreshProfile,
    refresh_profile_proof: refreshProfileProof,
    expires_at: new Date(expiresAt).toISOString(),
  });
}

function refreshScopes(value, connection) {
  const scopes = Array.isArray(value) ? [...new Set(value)] : [];
  if (
    connection.granted_scopes.some((scope) => !scopes.includes(scope))
    || scopes.some((scope) => !M365_GRAPH_REQUIRED_SCOPES.includes(scope))
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.scope_insufficient,
      "Microsoft authorization scope is insufficient",
      403,
    );
  }
  return Object.freeze(scopes);
}

export async function acquireActiveM365Credential({
  repository,
  credential_vault,
  provider,
  tenant_id,
  user_id,
  entra_subject_id,
  required_scope,
  clock = () => new Date(),
  refresh_skew_ms = CLIENT_CREDENTIAL_REFRESH_SKEW_MS,
} = {}) {
  assertRepository(repository);
  const principal = assertEntraPrincipal({
    tenant_id,
    user_id,
    entra_subject_id,
  });
  const connection = findConnection(repository, principal);
  if (!connection || connection.revoked_at) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.connection_not_found,
      "Microsoft 365 connection was not found",
      404,
    );
  }
  assertSubject(connection, principal);
  if (
    required_scope
    && !connection.granted_scopes.includes(required_scope)
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.scope_insufficient,
      `Microsoft 365 connection is missing ${required_scope}`,
      403,
    );
  }
  if (
    !Number.isSafeInteger(refresh_skew_ms)
    || refresh_skew_ms < 0
    || refresh_skew_ms > 5 * 60_000
  ) {
    throw new TypeError("refresh_skew_ms must be between 0 and 300000");
  }
  if (
    typeof credential_vault?.resolveDelegatedCredential !== "function"
    || typeof credential_vault?.storeDelegatedCredential !== "function"
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
      "Microsoft 365 credential vault is unavailable",
      503,
    );
  }
  const now = timestamp(clock);

  async function requireReauthorization() {
    const revoked = normalizeM365Connection({
      ...connection,
      revoked_at: now,
      state_version: connection.state_version + 1,
    });
    repository.transaction((tx) => {
      const saved = tx.update(connectionRef(principal), revoked);
      appendConnectionAudit(tx, {
        connection: saved,
        principal,
        action: "m365.connection.reauthorization_required",
        occurred_at: now,
        payload: { credential_cleanup_requested: true },
      });
      return saved;
    });
    await credential_vault.deleteDelegatedCredential?.({
      credential_ref: connection.credential_ref,
      reason: "microsoft_reauthorization_required",
    }).catch(() => {});
    throw commandError(
      M365_GRAPH_ERROR_CODES.reauthorization_required,
      "Microsoft 365 connection requires reauthorization",
      401,
    );
  }

  let credential;
  try {
    credential = clientCredential(
      await credential_vault.resolveDelegatedCredential({
        credential_ref: connection.credential_ref,
      }),
    );
  } catch (error) {
    if (
      error?.safe_error_code
      === M365_GRAPH_ERROR_CODES.reauthorization_required
    ) {
      return requireReauthorization();
    }
    throw error;
  }
  const refreshAt = Math.min(
    Date.parse(credential.expires_at),
    Date.parse(connection.expires_at),
  );
  if (refreshAt > Date.parse(now) + refresh_skew_ms) {
    return Object.freeze({ connection, credential, refreshed: false });
  }
  if (typeof provider?.refreshDelegatedCredential !== "function") {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
      "Microsoft credential refresh provider is unavailable",
      503,
    );
  }
  let refreshedResult;
  try {
    refreshedResult = await provider.refreshDelegatedCredential({
      credential,
      entra_subject_id: principal.entra_subject_id,
      mailbox_scope: "me",
    });
  } catch (error) {
    if (error?.status === 401) return requireReauthorization();
    throw error;
  }
  const refreshed = clientCredential(refreshedResult?.token_bundle);
  const grantedScopes = refreshScopes(
    refreshed.granted_scopes,
    connection,
  );
  if (Date.parse(refreshed.expires_at) <= Date.parse(now)) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft refreshed credential expiry is invalid",
      502,
    );
  }
  await credential_vault.storeDelegatedCredential({
    tenant_id: principal.tenant_id,
    user_id: principal.user_id,
    token_bundle: refreshed,
    credential_ref: connection.credential_ref,
  });
  const next = normalizeM365Connection({
    ...connection,
    expires_at: refreshed.expires_at,
    granted_scopes: grantedScopes,
    state_version: connection.state_version + 1,
  });
  const persisted = repository.transaction((tx) => {
    const saved = tx.update(connectionRef(principal), next);
    appendConnectionAudit(tx, {
      connection: saved,
      principal,
      action: "m365.connection.credential.refreshed",
      occurred_at: now,
      payload: {
        credential_rotated_in_vault: true,
        refresh_token_rotated:
          refreshed.refresh_token !== credential.refresh_token,
      },
    });
    return saved;
  });
  return Object.freeze({
    connection: persisted,
    credential: refreshed,
    refreshed: true,
  });
}

function validateAuthorizationStart(result) {
  const authorizationUrl = requiredString(result, "authorization_url");
  if (
    !authorizationUrl.startsWith("https://")
    || result.pkce_used !== true
    || result.state_bound !== true
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft authorization start response is invalid",
      502,
    );
  }
  return Object.freeze({
    authorization_url: authorizationUrl,
    expires_at: requiredString(result, "expires_at"),
    pkce_used: true,
    state_bound: true,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function validateAuthorizationResult(result, principal) {
  if (
    !result
    || typeof result !== "object"
    || result.authorization_attempt_consumed !== true
    || !result.token_bundle
    || typeof result.token_bundle !== "object"
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft authorization callback response is invalid",
      502,
    );
  }
  const subjectId = requiredString(result, "entra_subject_id");
  if (subjectId !== principal.entra_subject_id) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.subject_mismatch,
      "Microsoft authorization subject does not match the signed session",
      403,
    );
  }
  const grantedScopes = Array.isArray(result.granted_scopes)
    ? [...result.granted_scopes]
    : [];
  const missingScopes = M365_GRAPH_REQUIRED_SCOPES.filter(
    (scope) => !grantedScopes.includes(scope),
  );
  if (missingScopes.length > 0) {
    throw Object.assign(commandError(
      M365_GRAPH_ERROR_CODES.scope_insufficient,
      "Microsoft authorization did not grant every required scope",
      403,
    ), { missing_scopes: Object.freeze(missingScopes) });
  }
  const consentedAt = requiredInstant(result, "consented_at");
  const expiresAt = requiredInstant(result, "expires_at");
  if (Date.parse(expiresAt) <= Date.parse(consentedAt)) {
    throw new TypeError("expires_at must be after consented_at");
  }
  const mailboxAddress = requiredString(result, "mailbox_address")
    .normalize("NFKC")
    .toLowerCase();
  const mailboxAddressHash = hashMailboxAddress(mailboxAddress);
  return Object.freeze({
    entra_subject_id: subjectId,
    mailbox_address: mailboxAddress,
    mailbox_address_hash: mailboxAddressHash,
    token_bundle: result.token_bundle,
    granted_scopes: Object.freeze(grantedScopes),
    consented_at: consentedAt,
    expires_at: expiresAt,
  });
}

export function assessM365ExternalReadiness(input = {}) {
  const missing = EXTERNAL_READINESS_FIELDS.filter(
    (field) => input[field] !== true,
  );
  return Object.freeze({
    status: missing.length === 0 ? "ready" : "blocked",
    release_allowed: missing.length === 0,
    missing_evidence: Object.freeze(missing),
    external_receipts_required: true,
    production_ready_claim: false,
  });
}

export function resolveActiveM365Connection({
  repository,
  tenant_id,
  user_id,
  entra_subject_id,
  required_scope,
  clock = () => new Date(),
} = {}) {
  assertRepository(repository);
  const principal = assertEntraPrincipal({
    tenant_id,
    user_id,
    entra_subject_id,
  });
  const connection = findConnection(repository, principal);
  if (!connection) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.connection_not_found,
      "Microsoft 365 connection was not found",
      404,
    );
  }
  assertSubject(connection, principal);
  const status = m365ConnectionStatus(connection, { clock });
  if (!status.active) {
    const code = status.status === "scope_insufficient"
      ? M365_GRAPH_ERROR_CODES.scope_insufficient
      : M365_GRAPH_ERROR_CODES.connection_not_found;
    throw commandError(code, `Microsoft 365 connection is ${status.status}`);
  }
  if (
    required_scope
    && !connection.granted_scopes.includes(required_scope)
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.scope_insufficient,
      `Microsoft 365 connection is missing ${required_scope}`,
      403,
    );
  }
  return Object.freeze({ principal, connection });
}

export function createM365GraphConnectionService({
  repository,
  credential_vault,
  provider,
  feature_enabled = false,
  provider_runtime_enabled = false,
  external_readiness = {},
  allowed_redirect_uris = [],
  clock = () => new Date(),
} = {}) {
  assertRepository(repository);
  const readiness = assessM365ExternalReadiness(external_readiness);

  function getConnectionStatus(input = {}) {
    const principal = assertEntraPrincipal(input);
    const connection = findConnection(repository, principal);
    if (connection) assertSubject(connection, principal);
    return Object.freeze({
      feature_flag: M365_GRAPH_FEATURE_FLAG,
      feature_enabled: feature_enabled === true,
      provider_runtime_enabled: provider_runtime_enabled === true,
      connection: presentConnection(connection, { clock }),
      release_readiness: readiness,
      automatic_mailbox_scan_enabled: false,
      shared_mailbox_enabled: false,
      production_ready_claim: false,
    });
  }

  async function beginAuthorization(input = {}) {
    const principal = assertEntraPrincipal(input);
    assertProviderRuntime({
      feature_enabled,
      provider_runtime_enabled,
      provider,
      credentialVault: credential_vault,
    });
    if (typeof provider.beginDelegatedAuthorization !== "function") {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
        "Microsoft authorization provider is unavailable",
        503,
      );
    }
    const result = await provider.beginDelegatedAuthorization({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      redirect_uri: allowedRedirectUri(
        input.redirect_uri,
        allowed_redirect_uris,
      ),
      scopes: M365_GRAPH_REQUIRED_SCOPES,
      mailbox_scope: "me",
    });
    return validateAuthorizationStart(result);
  }

  async function completeAuthorization(input = {}) {
    const principal = assertEntraPrincipal(input);
    assertProviderRuntime({
      feature_enabled,
      provider_runtime_enabled,
      provider,
      credentialVault: credential_vault,
    });
    if (
      typeof provider.completeDelegatedAuthorization !== "function"
      || typeof credential_vault.storeDelegatedCredential !== "function"
    ) {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
        "Microsoft authorization provider is unavailable",
        503,
      );
    }
    const idempotencyKey = operationKey(
      "m365-connect",
      requiredString(input, "state"),
    );
    const replay = repository.getIdempotency({
      tenant_id: principal.tenant_id,
      idempotency_key: idempotencyKey,
    });
    if (replay) {
      const replayedConnection = findConnection(repository, principal);
      if (!replayedConnection) {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_invalid,
          "Microsoft connection replay record is incomplete",
        );
      }
      assertSubject(replayedConnection, principal);
      return Object.freeze({
        outcome: replay.response?.outcome ?? "connected",
        connection: presentConnection(replayedConnection, { clock }),
        release_readiness: readiness,
        credential_material_included: false,
        production_ready_claim: false,
        replayed: true,
      });
    }
    const current = findConnection(repository, principal);
    if (current) assertSubject(current, principal);
    const providerResult = await provider.completeDelegatedAuthorization({
      code: requiredString(input, "code"),
      state: requiredString(input, "state"),
      redirect_uri: allowedRedirectUri(
        input.redirect_uri,
        allowed_redirect_uris,
      ),
      expected_entra_subject_id: principal.entra_subject_id,
      mailbox_scope: "me",
    });
    const authorization = validateAuthorizationResult(
      providerResult,
      principal,
    );
    const nextStateVersion = (current?.state_version ?? 0) + 1;
    const draft = {
      m365_connection_id: m365ConnectionId(principal),
      ...principal,
      mailbox_address_hash: authorization.mailbox_address_hash,
      granted_scopes: authorization.granted_scopes,
      consented_at: authorization.consented_at,
      expires_at: authorization.expires_at,
      revoked_at: null,
      state_version: nextStateVersion,
    };
    const credentialRef = await credential_vault.storeDelegatedCredential({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      token_bundle: {
        ...authorization.token_bundle,
        mailbox_address: authorization.mailbox_address,
      },
      credential_ref: current?.credential_ref ?? null,
    });
    const occurredAt = timestamp(clock);
    try {
      const connection = normalizeM365Connection({
        ...draft,
        credential_ref: credentialRef,
      });
      const persisted = repository.transaction
        ? repository.transaction((tx) => {
          const saved = current
            ? tx.update(connectionRef(principal), connection)
            : tx.create(connection);
          appendConnectionAudit(tx, {
            connection: saved,
            principal,
            action: "m365.connection.connected",
            occurred_at: occurredAt,
            payload: {
              previous_connection_present: Boolean(current),
              token_replaced_in_vault: Boolean(current),
            },
          });
          tx.recordIdempotency({
            tenant_id: principal.tenant_id,
            idempotency_key: idempotencyKey,
            operation: "m365.connection.connect",
            response: {
              outcome: current ? "reconnected" : "connected",
              m365_connection_id: saved.m365_connection_id,
              state_version: saved.state_version,
              credential_material_included: false,
            },
            created_at: occurredAt,
          });
          return saved;
        })
        : current
          ? repository.update(connectionRef(principal), connection)
          : repository.create(connection);
      return Object.freeze({
        outcome: current ? "reconnected" : "connected",
        connection: presentConnection(persisted, { clock }),
        release_readiness: readiness,
        credential_material_included: false,
        production_ready_claim: false,
      });
    } catch (error) {
      if (!current) {
        await credential_vault.deleteDelegatedCredential?.({
          credential_ref: credentialRef,
          reason: "connection_persistence_failed",
        }).catch(() => {});
      }
      throw error;
    }
  }

  async function revokeConnection(input = {}) {
    const principal = assertEntraPrincipal(input);
    const current = findConnection(repository, principal);
    if (!current) {
      return Object.freeze({
        outcome: "not_connected",
        connection: presentConnection(null, { clock }),
        credential_material_included: false,
        production_ready_claim: false,
      });
    }
    assertSubject(current, principal);
    if (
      current.state_version
      !== wholeVersion(input.expected_state_version)
    ) {
      throw commandError(
        M365_GRAPH_ERROR_CODES.state_version_conflict,
        "M365 connection changed after the screen was loaded",
      );
    }
    if (current.revoked_at) {
      return Object.freeze({
        outcome: "already_disconnected",
        connection: presentConnection(current, { clock }),
        credential_material_included: false,
        production_ready_claim: false,
      });
    }
    const occurredAt = timestamp(clock);
    const revoked = normalizeM365Connection({
      ...current,
      revoked_at: occurredAt,
      state_version: current.state_version + 1,
    });
    assertProviderRuntime({
      feature_enabled: true,
      provider_runtime_enabled,
      provider,
      credentialVault: credential_vault,
    });
    if (
      typeof credential_vault.resolveDelegatedCredential !== "function"
      || typeof credential_vault.deleteDelegatedCredential !== "function"
      || typeof provider.revokeDelegatedCredential !== "function"
    ) {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
        "Microsoft revocation provider is unavailable",
        503,
      );
    }
    const credential = await credential_vault.resolveDelegatedCredential({
      credential_ref: current.credential_ref,
    });
    await provider.revokeDelegatedCredential({
      credential,
      entra_subject_id: principal.entra_subject_id,
      mailbox_scope: "me",
    });
    let credentialDeleteError = null;
    try {
      await credential_vault.deleteDelegatedCredential({
        credential_ref: current.credential_ref,
        reason: requiredString(input, "reason"),
      });
    } catch (error) {
      credentialDeleteError = error;
    }
    const persisted = repository.transaction
      ? repository.transaction((tx) => {
        const saved = tx.update(connectionRef(principal), revoked);
        appendConnectionAudit(tx, {
          connection: saved,
          principal,
          action: "m365.connection.revoked",
          occurred_at: occurredAt,
          payload: {
            provider_revoked_first: true,
            credential_reference_deleted: credentialDeleteError === null,
          },
        });
        tx.recordIdempotency({
          tenant_id: principal.tenant_id,
          idempotency_key:
            `m365-revoke:${saved.m365_connection_id}:${current.state_version}`,
          operation: "m365.connection.revoke",
          response: {
            outcome: "disconnected",
            m365_connection_id: saved.m365_connection_id,
            state_version: saved.state_version,
            credential_reference_deleted: credentialDeleteError === null,
          },
          created_at: occurredAt,
        });
        return saved;
      })
      : repository.update(connectionRef(principal), revoked);
    if (credentialDeleteError) {
      throw Object.assign(commandError(
        M365_GRAPH_ERROR_CODES.credential_delete_failed,
        "Microsoft credential cleanup requires operator attention",
        502,
      ), { cause: credentialDeleteError });
    }
    return Object.freeze({
      outcome: "disconnected",
      connection: presentConnection(persisted, { clock }),
      credential_material_included: false,
      production_ready_claim: false,
    });
  }

  return Object.freeze({
    getConnectionStatus,
    beginAuthorization,
    completeAuthorization,
    revokeConnection,
    readiness,
    feature_enabled: feature_enabled === true,
    provider_runtime_enabled: provider_runtime_enabled === true,
    production_ready_claim: false,
  });
}
