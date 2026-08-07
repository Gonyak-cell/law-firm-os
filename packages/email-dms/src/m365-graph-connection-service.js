import { createHash } from "node:crypto";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
  m365ConnectionStatus,
  normalizeM365Connection,
} from "./m365-connection-model.js";

export const M365_GRAPH_FEATURE_FLAG = "m365_graph_connection_v1";
export const M365_GRAPH_CALLBACK_MODES = Object.freeze({
  legacy: "legacy_message_parent_v1",
  server_complete: "server_complete_v1",
});

export const M365_GRAPH_ERROR_CODES = Object.freeze({
  completion_conflict: "M365_AUTHORIZATION_COMPLETION_CONFLICT",
  completion_in_progress: "M365_AUTHORIZATION_COMPLETION_IN_PROGRESS",
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
const AUTHORIZATION_ATTEMPT_REF_PATTERN = /^[a-f0-9]{64}$/u;
const M365_CONNECTION_OPERATION = "m365.connection.connect";
const LEGACY_DURABLE_OPERATION_PATTERN = /^request-hash:[a-f0-9]{64}$/u;

function isConnectionCompletionEntry(entry) {
  const operation = entry?.operation;
  const responseOperation = entry?.response?.operation;
  if (operation === M365_CONNECTION_OPERATION) {
    return responseOperation == null
      || responseOperation === M365_CONNECTION_OPERATION;
  }
  return responseOperation == null
    && LEGACY_DURABLE_OPERATION_PATTERN.test(operation ?? "");
}

function assertCompletionFingerprint(entry, expected) {
  if (entry?.request_fingerprint !== expected) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.completion_conflict,
      "Microsoft authorization completion is bound to another request",
      409,
    );
  }
}

function assertCompletionClaim(entry, {
  requestFingerprint,
  attemptRef,
  principal,
}) {
  assertCompletionFingerprint(entry, requestFingerprint);
  if (
    entry.operation !== "m365.connection.completion.claim"
    || entry.response?.attempt_ref !== attemptRef
    || entry.response?.m365_connection_id !== m365ConnectionId(principal)
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft authorization completion claim is invalid",
      409,
    );
  }
}

function authorizationCallbackMode(value) {
  const mode = value ?? M365_GRAPH_CALLBACK_MODES.legacy;
  if (!Object.values(M365_GRAPH_CALLBACK_MODES).includes(mode)) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft authorization callback mode is invalid",
      400,
    );
  }
  return mode;
}

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

function hashValue(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
}

function authorizationAttemptKey(value) {
  const attemptRef = requiredString({ value }, "value");
  if (!AUTHORIZATION_ATTEMPT_REF_PATTERN.test(attemptRef)) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft authorization attempt reference is invalid",
      400,
    );
  }
  return `m365-connect:${attemptRef}`;
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

function cleanupReferences(connection, ...references) {
  return Object.freeze([...new Set([
    ...(connection?.pending_vault_cleanup_refs ?? []),
    ...references.filter(Boolean),
  ])]);
}

function credentialGeneration(stateVersion) {
  return `m365-connection-state-${wholeVersion(
    stateVersion,
    "credential state version",
  )}`;
}

function stagedCredentialReference(credentialVault, principal, stateVersion) {
  return credentialVault.referenceForGeneration({
    tenant_id: principal.tenant_id,
    user_id: principal.user_id,
    entra_subject_id: principal.entra_subject_id,
    credential_generation: credentialGeneration(stateVersion),
  });
}

function authorizationCredentialReference(
  credentialVault,
  principal,
  attemptRef,
) {
  return credentialVault.referenceForGeneration({
    ...principal,
    credential_generation: `m365-authorization-attempt-${attemptRef}`,
  });
}

function assertCredentialVault(credentialVault) {
  for (const method of [
    "resolveDelegatedCredential",
    "storeDelegatedCredential",
    "deleteDelegatedCredential",
    "referenceForGeneration",
  ]) {
    if (typeof credentialVault?.[method] !== "function") {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
        "Microsoft 365 credential vault is unavailable",
        503,
      );
    }
  }
}

function registerCredentialCleanup({
  request_failure_compensator,
  credential_vault,
  credential_refs,
  reason,
}) {
  if (
    typeof request_failure_compensator?.registerPostCommit !== "function"
    || typeof credential_vault?.deleteDelegatedCredential !== "function"
    || credential_refs.length === 0
  ) return;
  request_failure_compensator.registerPostCommit(async () => {
    for (const credentialRef of credential_refs) {
      await credential_vault.deleteDelegatedCredential({
        credential_ref: credentialRef,
        reason,
      });
    }
  });
}

function requireM365Reauthorization({
  repository,
  credential_vault,
  request_failure_compensator,
  connection,
  principal,
  occurred_at,
}) {
  assertCredentialVault(credential_vault);
  const stagedRef = stagedCredentialReference(
    credential_vault,
    principal,
    connection.state_version + 1,
  );
  const cleanupRefs = cleanupReferences(
    connection,
    connection.credential_ref,
    stagedRef,
  );
  const revoked = normalizeM365Connection({
    ...connection,
    revoked_at: occurred_at,
    pending_vault_cleanup_refs: cleanupRefs,
    state_version: connection.state_version + 1,
  });
  repository.transaction((tx) => {
    const saved = tx.update(connectionRef(principal), revoked);
    appendConnectionAudit(tx, {
      connection: saved,
      principal,
      action: "m365.connection.reauthorization_required",
      occurred_at,
      payload: {
        credential_cleanup_requested: true,
        credential_cleanup_requested_count: cleanupRefs.length,
      },
    });
    tx.recordIdempotency({
      tenant_id: principal.tenant_id,
      idempotency_key:
        `m365-reauthorize:${saved.m365_connection_id}:${connection.state_version}`,
      operation: "m365.connection.reauthorization_required",
      response: {
        outcome: "reauthorization_required",
        m365_connection_id: saved.m365_connection_id,
        state_version: saved.state_version,
        credential_material_included: false,
      },
      created_at: occurred_at,
    });
    return saved;
  });
  registerCredentialCleanup({
    request_failure_compensator,
    credential_vault,
    credential_refs: cleanupRefs,
    reason: "credential_reauthorization_committed",
  });
  throw commandError(
    M365_GRAPH_ERROR_CODES.reauthorization_required,
    "Microsoft 365 connection requires reauthorization",
    401,
  );
}

function stagedCredentialRequiresReauthorization(error) {
  return [
    M365_GRAPH_ERROR_CODES.reauthorization_required,
    M365_GRAPH_ERROR_CODES.provider_invalid,
    M365_GRAPH_ERROR_CODES.scope_insufficient,
    M365_GRAPH_ERROR_CODES.subject_mismatch,
  ].includes(error?.safe_error_code);
}

async function drainCredentialCleanup({
  repository,
  credential_vault,
  connection,
  principal,
  clock,
}) {
  if (
    connection.pending_vault_cleanup_refs.length === 0
    || typeof credential_vault?.deleteDelegatedCredential !== "function"
  ) return connection;
  const remaining = [];
  let deletedCount = 0;
  for (const credentialRef of connection.pending_vault_cleanup_refs) {
    try {
      await credential_vault.deleteDelegatedCredential({
        credential_ref: credentialRef,
        reason: "retired_credential_cleanup_retry",
      });
      deletedCount += 1;
    } catch {
      remaining.push(credentialRef);
    }
  }
  if (deletedCount === 0) return connection;
  const occurredAt = timestamp(clock);
  const next = normalizeM365Connection({
    ...connection,
    pending_vault_cleanup_refs: remaining,
  });
  const cleanupFingerprint = createHash("sha256")
    .update(JSON.stringify(connection.pending_vault_cleanup_refs))
    .digest("hex")
    .slice(0, 24);
  return repository.transaction((tx) => {
    const saved = tx.update(connectionRef(principal), next);
    appendConnectionAudit(tx, {
      connection: saved,
      principal,
      action: "m365.connection.credential.cleanup_completed",
      event_discriminator: cleanupFingerprint,
      occurred_at: occurredAt,
      payload: {
        credential_cleanup_completed_count: deletedCount,
        credential_cleanup_remaining_count: remaining.length,
      },
    });
    tx.recordIdempotency({
      tenant_id: principal.tenant_id,
      idempotency_key:
        `m365-cleanup:${saved.m365_connection_id}:${connection.state_version}:${cleanupFingerprint}`,
      operation: "m365.connection.credential.cleanup",
      response: {
        outcome: "cleanup_completed",
        m365_connection_id: saved.m365_connection_id,
        state_version: connection.state_version,
        credential_cleanup_completed_count: deletedCount,
        credential_material_included: false,
      },
      created_at: occurredAt,
    });
    return saved;
  });
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
  event_discriminator = null,
}) {
  if (typeof repository.appendAudit !== "function") return null;
  return repository.appendAudit({
    tenant_id: principal.tenant_id,
    event_id:
      `audit:${connection.m365_connection_id}:${connection.state_version}:${action}${
        event_discriminator ? `:${event_discriminator}` : ""
      }`,
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
  try {
    return Object.freeze({
      ...structuredClone(value),
      access_token: requiredString(value, "access_token"),
      refresh_token: requiredString(value, "refresh_token"),
      refresh_profile: refreshProfile,
      refresh_profile_proof: refreshProfileProof,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch {
    throw commandError(
      M365_GRAPH_ERROR_CODES.reauthorization_required,
      "Microsoft 365 delegated credential requires reauthorization",
      401,
    );
  }
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

function credentialReferenceMissing(error) {
  const code = error?.name ?? error?.Code ?? error?.code;
  return code === "ResourceNotFoundException";
}

function deterministicCredentialFailure(error) {
  return credentialReferenceMissing(error)
    || stagedCredentialRequiresReauthorization(error);
}

function stagedCredentialMetadata(value, principal) {
  const credential = clientCredential(value);
  let mailboxAddress;
  let consentedAt;
  let subjectId;
  try {
    mailboxAddress = requiredString(
      credential,
      "mailbox_address",
    ).normalize("NFKC").toLowerCase();
    consentedAt = requiredInstant(credential, "consented_at");
    subjectId = requiredString(credential, "entra_subject_id");
  } catch {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Stored Microsoft credential metadata is incomplete",
      502,
    );
  }
  if (subjectId !== principal.entra_subject_id) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.subject_mismatch,
      "Stored Microsoft credential belongs to another Entra subject",
      403,
    );
  }
  if (Date.parse(credential.expires_at) <= Date.parse(consentedAt)) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Stored Microsoft credential expiry is invalid",
      502,
    );
  }
  const grantedScopes = refreshScopes(credential.granted_scopes, {
    granted_scopes: M365_GRAPH_REQUIRED_SCOPES,
  });
  return Object.freeze({
    credential,
    mailbox_address: mailboxAddress,
    mailbox_address_hash: hashMailboxAddress(mailboxAddress),
    consented_at: consentedAt,
    granted_scopes: grantedScopes,
  });
}

function validateStagedCredential(value, connection, principal, now) {
  const metadata = stagedCredentialMetadata(value, principal);
  if (
    metadata.mailbox_address_hash !== connection.mailbox_address_hash
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Stored Microsoft credential mailbox identity does not reconcile",
      502,
    );
  }
  refreshScopes(metadata.granted_scopes, connection);
  return Object.freeze({
    ...metadata,
    expired:
      Date.parse(metadata.credential.expires_at) <= Date.parse(now),
  });
}

function validateAuthorizationCredential(
  value,
  principal,
  attemptRef,
  redirectUri,
) {
  const metadata = stagedCredentialMetadata(value, principal);
  const binding = metadata.credential;
  let tenantId;
  let userId;
  let storedAttemptRef;
  let redirectUriHash;
  let callbackMode;
  try {
    tenantId = requiredString(binding, "tenant_id");
    userId = requiredString(binding, "user_id");
    storedAttemptRef = requiredString(
      binding,
      "authorization_attempt_ref",
    );
    redirectUriHash = requiredString(binding, "redirect_uri_hash");
    callbackMode = requiredString(binding, "callback_mode");
  } catch {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Stored Microsoft authorization credential binding is incomplete",
      502,
    );
  }
  if (
    tenantId !== principal.tenant_id
    || userId !== principal.user_id
    || storedAttemptRef !== attemptRef
    || redirectUriHash !== hashValue(redirectUri)
    || callbackMode !== M365_GRAPH_CALLBACK_MODES.server_complete
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Stored Microsoft authorization credential binding is invalid",
      502,
    );
  }
  return metadata;
}

export async function acquireActiveM365Credential({
  repository,
  credential_vault,
  provider,
  request_failure_compensator = null,
  tenant_id,
  user_id,
  entra_subject_id,
  required_scope,
  clock = () => new Date(),
  refresh_skew_ms = CLIENT_CREDENTIAL_REFRESH_SKEW_MS,
} = {}) {
  assertRepository(repository);
  if (
    request_failure_compensator != null
    && (
      typeof request_failure_compensator.register !== "function"
      || (
        request_failure_compensator.registerPostCommit != null
        && typeof request_failure_compensator.registerPostCommit !== "function"
      )
    )
  ) {
    throw new TypeError("Microsoft request failure compensator is invalid");
  }
  const principal = assertEntraPrincipal({
    tenant_id,
    user_id,
    entra_subject_id,
  });
  let connection = findConnection(repository, principal);
  if (!connection) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.connection_not_found,
      "Microsoft 365 connection was not found",
      404,
    );
  }
  assertSubject(connection, principal);
  if (connection.revoked_at) {
    await drainCredentialCleanup({
      repository,
      credential_vault,
      connection,
      principal,
      clock,
    });
    throw commandError(
      M365_GRAPH_ERROR_CODES.connection_not_found,
      "Microsoft 365 connection was not found",
      404,
    );
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
  if (
    !Number.isSafeInteger(refresh_skew_ms)
    || refresh_skew_ms < 0
    || refresh_skew_ms > 5 * 60_000
  ) {
    throw new TypeError("refresh_skew_ms must be between 0 and 300000");
  }
  if (typeof credential_vault?.resolveDelegatedCredential !== "function") {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
      "Microsoft 365 credential vault is unavailable",
      503,
    );
  }
  const now = timestamp(clock);

  const requireReauthorization = () => requireM365Reauthorization({
    repository,
    credential_vault,
    request_failure_compensator,
    connection,
    principal,
    occurred_at: now,
  });

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
    connection = await drainCredentialCleanup({
      repository,
      credential_vault,
      connection,
      principal,
      clock,
    });
    return Object.freeze({ connection, credential, refreshed: false });
  }
  assertCredentialVault(credential_vault);
  const nextStateVersion = connection.state_version + 1;
  const refreshedCredentialRef = stagedCredentialReference(
    credential_vault,
    principal,
    nextStateVersion,
  );
  let staged;
  try {
    staged = validateStagedCredential(
      await credential_vault.resolveDelegatedCredential({
        credential_ref: refreshedCredentialRef,
      }),
      connection,
      principal,
      now,
    );
  } catch (error) {
    if (credentialReferenceMissing(error)) {
      staged = null;
    } else if (stagedCredentialRequiresReauthorization(error)) {
      return requireReauthorization();
    } else {
      throw error;
    }
  }
  if (!staged) {
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
    refreshScopes(refreshed.granted_scopes, connection);
    if (Date.parse(refreshed.expires_at) <= Date.parse(now)) {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_invalid,
        "Microsoft refreshed credential expiry is invalid",
        502,
      );
    }
    const mailboxAddress = requiredString(
      credential,
      "mailbox_address",
    ).normalize("NFKC").toLowerCase();
    await credential_vault.storeDelegatedCredential({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      token_bundle: {
        ...refreshed,
        entra_subject_id: principal.entra_subject_id,
        mailbox_address: mailboxAddress,
        consented_at: connection.consented_at,
        granted_scopes: refreshScopes(
          refreshed.granted_scopes,
          connection,
        ),
      },
      credential_generation: credentialGeneration(nextStateVersion),
    });
    try {
      staged = validateStagedCredential(
        await credential_vault.resolveDelegatedCredential({
          credential_ref: refreshedCredentialRef,
        }),
        connection,
        principal,
        now,
      );
    } catch (error) {
      if (stagedCredentialRequiresReauthorization(error)) {
        return requireReauthorization();
      }
      throw error;
    }
  }
  if (staged.expired) {
    return requireReauthorization();
  }
  const stagedCredential = staged.credential;
  const grantedScopes = staged.granted_scopes;
  const next = normalizeM365Connection({
      ...connection,
      credential_ref: refreshedCredentialRef,
      pending_vault_cleanup_refs: cleanupReferences(
        connection,
        connection.credential_ref,
      ),
      expires_at: stagedCredential.expires_at,
      granted_scopes: grantedScopes,
      consented_at: staged.consented_at,
      mailbox_address_hash: staged.mailbox_address_hash,
      state_version: nextStateVersion,
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
          credential_cleanup_requested: true,
          credential_cleanup_requested_count: 1,
          refresh_token_rotated:
            stagedCredential.refresh_token !== credential.refresh_token,
        },
      });
      tx.recordIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key:
          `m365-refresh:${saved.m365_connection_id}:${connection.state_version}`,
        operation: "m365.connection.refresh",
        response: {
          outcome: "refreshed",
          m365_connection_id: saved.m365_connection_id,
          state_version: saved.state_version,
          credential_material_included: false,
        },
        created_at: now,
      });
      return saved;
  });
  registerCredentialCleanup({
    request_failure_compensator,
    credential_vault,
    credential_refs: persisted.pending_vault_cleanup_refs,
    reason: "credential_refresh_committed",
  });
  return Object.freeze({
    connection: persisted,
    credential: stagedCredential,
    refreshed: true,
  });
}

function validateAuthorizationStart(result) {
  const authorizationUrl = requiredString(result, "authorization_url");
  const attemptRef = requiredString(result, "attempt_ref");
  const callbackMode = authorizationCallbackMode(result.callback_mode);
  if (
    !authorizationUrl.startsWith("https://")
    || !AUTHORIZATION_ATTEMPT_REF_PATTERN.test(attemptRef)
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
    attempt_ref: attemptRef,
    callback_mode: callbackMode,
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
  request_failure_compensator = null,
  completion_checkpoint: completionCheckpoint = null,
} = {}) {
  assertRepository(repository);
  if (
    request_failure_compensator != null
    && (
      typeof request_failure_compensator.register !== "function"
      || (
        request_failure_compensator.registerPostCommit != null
        && typeof request_failure_compensator.registerPostCommit !== "function"
      )
    )
  ) {
    throw new TypeError("Microsoft request failure compensator is invalid");
  }
  if (
    completionCheckpoint != null
    && ["claim", "finalize", "fail"].some(
      (method) => typeof completionCheckpoint[method] !== "function",
    )
  ) {
    throw new TypeError("Microsoft completion checkpoint is invalid");
  }
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

  function getAuthorizationAttemptStatus(input = {}) {
    const principal = assertEntraPrincipal(input);
    const attemptKey = authorizationAttemptKey(input.attempt_ref);
    const completion = repository.getIdempotency({
      tenant_id: principal.tenant_id,
      idempotency_key: attemptKey,
    });
    if (!completion) return Object.freeze({ status: "pending" });
    const connection = findConnection(repository, principal);
    if (
      !isConnectionCompletionEntry(completion)
      || completion.response?.m365_connection_id !== m365ConnectionId(principal)
      || !connection
    ) {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_invalid,
        "Microsoft authorization completion does not match its connection",
      );
    }
    assertSubject(connection, principal);
    return Object.freeze({
      status: m365ConnectionStatus(connection, { clock }).active
        ? "complete"
        : "pending",
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
      callback_mode: authorizationCallbackMode(input.callback_mode),
    });
    return validateAuthorizationStart(result);
  }

  async function completeAuthorizationWithCheckpoint(input, principal) {
    assertCredentialVault(credential_vault);
    const state = requiredString(input, "state");
    const code = requiredString(input, "code");
    const redirectUri = allowedRedirectUri(
      input.redirect_uri,
      allowed_redirect_uris,
    );
    const idempotencyKey = operationKey("m365-connect", state);
    const attemptRef = idempotencyKey.slice("m365-connect:".length);
    const claimKey = `${idempotencyKey}:claim`;
    const failedKey = `${idempotencyKey}:failed`;
    const cleanupKey = `${failedKey}:cleanup`;
    const claimantHash = hashValue(requiredString(
      input,
      "completion_claimant",
    ));
    const requestFingerprint = hashValue({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      attempt_ref: attemptRef,
      authorization_code_hash: hashValue(code),
      redirect_uri_hash: hashValue(redirectUri),
      callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
    });
    const attemptCredentialRef = authorizationCredentialReference(
      credential_vault,
      principal,
      attemptRef,
    );
    const runStage = (stage, apply) => completionCheckpoint[stage]({
      tenant_id: principal.tenant_id,
      apply,
    });

    async function cleanupAttempt(reason) {
      try {
        await credential_vault.deleteDelegatedCredential({
          credential_ref: attemptCredentialRef,
          reason,
        });
        await runStage("fail", (tx) => {
          if (!tx.getIdempotency({
            tenant_id: principal.tenant_id,
            idempotency_key: cleanupKey,
          })) {
            tx.recordIdempotency({
              tenant_id: principal.tenant_id,
              idempotency_key: cleanupKey,
              operation: "m365.connection.completion.cleanup",
              request_fingerprint: requestFingerprint,
              response: {
                outcome: "cleanup_completed",
                attempt_ref: attemptRef,
                credential_material_included: false,
              },
              created_at: timestamp(clock),
            });
          }
          return true;
        });
        return true;
      } catch {
        return false;
      }
    }

    async function markFailed() {
      await runStage("fail", (tx) => {
        if (!tx.getIdempotency({
          tenant_id: principal.tenant_id,
          idempotency_key: failedKey,
        })) {
          const current = findConnection(tx, principal);
          tx.recordIdempotency({
            tenant_id: principal.tenant_id,
            idempotency_key: failedKey,
            operation: "m365.connection.completion.failed",
            request_fingerprint: requestFingerprint,
            response: {
              outcome: "authorization_restart_required",
              attempt_ref: attemptRef,
              credential_cleanup_pending: true,
              credential_material_included: false,
            },
            created_at: timestamp(clock),
          });
          if (current) {
            appendConnectionAudit(tx, {
              connection: current,
              principal,
              action: "m365.connection.authorization.failed",
              event_discriminator: attemptRef,
              occurred_at: timestamp(clock),
              payload: {
                authorization_attempt_ref: attemptRef,
                credential_cleanup_pending: true,
              },
            });
          }
        }
        return true;
      });
      await cleanupAttempt("authorization_completion_failed");
    }

    async function retireCompletedAttempt() {
      const retired = await runStage("fail", (tx) => {
        const current = findConnection(tx, principal);
        if (
          !current
          || current.credential_ref !== attemptCredentialRef
          || current.revoked_at
        ) return current;
        const occurredAt = timestamp(clock);
        const cleanupRefs = cleanupReferences(
          current,
          current.credential_ref,
          stagedCredentialReference(
            credential_vault,
            principal,
            current.state_version + 1,
          ),
        );
        const revoked = normalizeM365Connection({
          ...current,
          revoked_at: occurredAt,
          pending_vault_cleanup_refs: cleanupRefs,
          state_version: current.state_version + 1,
        });
        const saved = tx.update(connectionRef(principal), revoked);
        appendConnectionAudit(tx, {
          connection: saved,
          principal,
          action: "m365.connection.reauthorization_required",
          event_discriminator: attemptRef,
          occurred_at: occurredAt,
          payload: {
            authorization_attempt_ref: attemptRef,
            credential_cleanup_requested: true,
            credential_cleanup_requested_count: cleanupRefs.length,
          },
        });
        return saved;
      });
      await markFailed();
      for (const credentialRef of retired?.pending_vault_cleanup_refs ?? []) {
        try {
          await credential_vault.deleteDelegatedCredential({
            credential_ref: credentialRef,
            reason: "completed_authorization_credential_invalid",
          });
        } catch {
          // The revoked connection retains the durable cleanup marker.
        }
      }
    }

    const claim = await runStage("claim", (tx) => {
      const completed = tx.getIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: idempotencyKey,
      });
      const failed = tx.getIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: failedKey,
      });
      const existing = tx.getIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: claimKey,
      });
      if (existing) {
        assertCompletionClaim(existing, {
          requestFingerprint,
          attemptRef,
          principal,
        });
      }
      if (completed) {
        assertCompletionFingerprint(completed, requestFingerprint);
        assertCompletionClaim(existing, {
          requestFingerprint,
          attemptRef,
          principal,
        });
      }
      if (completed || failed || existing) {
        const current = completed ? findConnection(tx, principal) : null;
        return Object.freeze({
          completed,
          failed,
          claim: existing,
          current,
          should_exchange: false,
        });
      }
      tx.recordIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: claimKey,
        operation: "m365.connection.completion.claim",
        request_fingerprint: requestFingerprint,
        response: {
          outcome: "claimed",
          attempt_ref: attemptRef,
          claimant_hash: claimantHash,
          m365_connection_id: m365ConnectionId(principal),
          credential_material_included: false,
        },
        created_at: timestamp(clock),
      });
      return Object.freeze({
        completed: null,
        failed: null,
        claim: null,
        should_exchange: true,
      });
    });

    if (claim.failed) {
      await cleanupAttempt("authorization_completion_retry_failed");
      throw commandError(
        M365_GRAPH_ERROR_CODES.reauthorization_required,
        "Microsoft authorization must be restarted",
        409,
      );
    }

    let staged;
    if (claim.completed) {
      try {
        staged = validateAuthorizationCredential(
          await credential_vault.resolveDelegatedCredential({
            credential_ref: attemptCredentialRef,
          }),
          principal,
          attemptRef,
          redirectUri,
        );
      } catch (error) {
        if (deterministicCredentialFailure(error)) {
          await retireCompletedAttempt();
        }
        throw error;
      }
      const current = claim.current;
      if (
        !isConnectionCompletionEntry(claim.completed)
        || !current
        || current.credential_ref !== attemptCredentialRef
      ) {
        if (current?.credential_ref === attemptCredentialRef) {
          await retireCompletedAttempt();
        } else {
          await markFailed();
        }
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_invalid,
          "Microsoft connection replay record is incomplete",
        );
      }
      return Object.freeze({
        outcome: claim.completed.response?.outcome ?? "connected",
        connection: presentConnection(current, { clock }),
        release_readiness: readiness,
        credential_material_included: false,
        production_ready_claim: false,
        replayed: true,
      });
    }

    if (!claim.should_exchange) {
      try {
        staged = validateAuthorizationCredential(
          await credential_vault.resolveDelegatedCredential({
            credential_ref: attemptCredentialRef,
          }),
          principal,
          attemptRef,
          redirectUri,
        );
      } catch (error) {
        if (credentialReferenceMissing(error)) {
          throw commandError(
            M365_GRAPH_ERROR_CODES.completion_in_progress,
            "Microsoft authorization completion is in progress",
            409,
          );
        }
        if (stagedCredentialRequiresReauthorization(error)) {
          await markFailed();
          throw commandError(
            M365_GRAPH_ERROR_CODES.reauthorization_required,
            "Microsoft authorization must be restarted",
            409,
          );
        }
        throw error;
      }
    } else {
      let authorization;
      let vaultStageStarted = false;
      try {
        authorization = validateAuthorizationResult(
          await provider.completeDelegatedAuthorization({
            ...principal,
            code,
            state,
            redirect_uri: redirectUri,
            expected_entra_subject_id: principal.entra_subject_id,
            mailbox_scope: "me",
          }),
          principal,
        );
        vaultStageStarted = true;
        await credential_vault.storeDelegatedCredential({
          ...principal,
          token_bundle: {
            ...authorization.token_bundle,
            ...principal,
            authorization_attempt_ref: attemptRef,
            redirect_uri_hash: hashValue(redirectUri),
            callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
            mailbox_address: authorization.mailbox_address,
            consented_at: authorization.consented_at,
            expires_at: authorization.expires_at,
            granted_scopes: authorization.granted_scopes,
          },
          credential_generation:
            `m365-authorization-attempt-${attemptRef}`,
        });
        staged = validateAuthorizationCredential(
          await credential_vault.resolveDelegatedCredential({
            credential_ref: attemptCredentialRef,
          }),
          principal,
          attemptRef,
          redirectUri,
        );
        if (
          staged.mailbox_address_hash
            !== authorization.mailbox_address_hash
        ) {
          throw commandError(
            M365_GRAPH_ERROR_CODES.provider_invalid,
            "Stored Microsoft authorization mailbox mismatched",
            502,
          );
        }
      } catch (error) {
        if (
          vaultStageStarted
          && !deterministicCredentialFailure(error)
        ) {
          throw error;
        }
        await markFailed();
        if (stagedCredentialRequiresReauthorization(error)) throw error;
        throw commandError(
          M365_GRAPH_ERROR_CODES.reauthorization_required,
          "Microsoft authorization must be restarted",
          409,
        );
      }
    }

    const occurredAt = timestamp(clock);
    const finalized = await runStage("finalize", (tx) => {
      const durableClaim = tx.getIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: claimKey,
      });
      assertCompletionClaim(durableClaim, {
        requestFingerprint,
        attemptRef,
        principal,
      });
      const replay = tx.getIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: idempotencyKey,
      });
      if (replay) {
        assertCompletionFingerprint(replay, requestFingerprint);
        const current = findConnection(tx, principal);
        if (
          !isConnectionCompletionEntry(replay)
          || !current
          || current.credential_ref !== attemptCredentialRef
        ) {
          throw commandError(
            M365_GRAPH_ERROR_CODES.provider_invalid,
            "Microsoft connection replay record is incomplete",
          );
        }
        return Object.freeze({
          connection: current,
          outcome: replay.response?.outcome ?? "connected",
          replayed: true,
        });
      }
      if (tx.getIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: failedKey,
      })) {
        throw commandError(
          M365_GRAPH_ERROR_CODES.reauthorization_required,
          "Microsoft authorization must be restarted",
          409,
        );
      }
      const current = findConnection(tx, principal);
      if (current) assertSubject(current, principal);
      const nextStateVersion = (current?.state_version ?? 0) + 1;
      const predictedStateRef = stagedCredentialReference(
        credential_vault,
        principal,
        nextStateVersion,
      );
      const connection = normalizeM365Connection({
        model_type: "M365Connection",
        m365_connection_id: m365ConnectionId(principal),
        ...principal,
        mailbox_address_hash: staged.mailbox_address_hash,
        credential_ref: attemptCredentialRef,
        pending_vault_cleanup_refs: cleanupReferences(
          current,
          current?.credential_ref,
          predictedStateRef,
        ),
        granted_scopes: staged.granted_scopes,
        consented_at: staged.consented_at,
        expires_at: staged.credential.expires_at,
        revoked_at: null,
        state_version: nextStateVersion,
      });
      const saved = current
        ? tx.update(connectionRef(principal), connection)
        : tx.create(connection);
      const outcome = current ? "reconnected" : "connected";
      appendConnectionAudit(tx, {
        connection: saved,
        principal,
        action: "m365.connection.connected",
        occurred_at: occurredAt,
        payload: {
          previous_connection_present: Boolean(current),
          token_replaced_in_vault: Boolean(current),
          authorization_attempt_ref: attemptRef,
          credential_cleanup_requested_count:
            saved.pending_vault_cleanup_refs.length,
        },
      });
      tx.recordIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: idempotencyKey,
        operation: M365_CONNECTION_OPERATION,
        request_fingerprint: requestFingerprint,
        response: {
          operation: M365_CONNECTION_OPERATION,
          outcome,
          attempt_ref: attemptRef,
          m365_connection_id: saved.m365_connection_id,
          state_version: saved.state_version,
          credential_material_included: false,
        },
        created_at: occurredAt,
      });
      return Object.freeze({ connection: saved, outcome, replayed: false });
    });

    for (const credentialRef of finalized.connection
      .pending_vault_cleanup_refs) {
      try {
        await credential_vault.deleteDelegatedCredential({
          credential_ref: credentialRef,
          reason: "authorization_completion_committed",
        });
      } catch {
        // The durable pending marker retries cleanup on the next M365 request.
      }
    }
    return Object.freeze({
      outcome: finalized.outcome,
      connection: presentConnection(finalized.connection, { clock }),
      release_readiness: readiness,
      credential_material_included: false,
      production_ready_claim: false,
      ...(finalized.replayed ? { replayed: true } : {}),
    });
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
    ) {
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
        "Microsoft authorization provider is unavailable",
        503,
      );
    }
    if (completionCheckpoint) {
      return completeAuthorizationWithCheckpoint(input, principal);
    }
    assertCredentialVault(credential_vault);
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
      if (
        !isConnectionCompletionEntry(replay)
        || replay.response?.m365_connection_id !== m365ConnectionId(principal)
        || !replayedConnection
      ) {
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
    let current = findConnection(repository, principal);
    if (current) assertSubject(current, principal);
    const providerResult = await provider.completeDelegatedAuthorization({
      ...principal,
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
    const credentialRef = await credential_vault.storeDelegatedCredential({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      token_bundle: {
        ...authorization.token_bundle,
        entra_subject_id: principal.entra_subject_id,
        mailbox_address: authorization.mailbox_address,
        consented_at: authorization.consented_at,
        expires_at: authorization.expires_at,
        granted_scopes: authorization.granted_scopes,
      },
      credential_generation: credentialGeneration(nextStateVersion),
    });
    const occurredAt = timestamp(clock);
    let staged;
    try {
      staged = stagedCredentialMetadata(
        await credential_vault.resolveDelegatedCredential({
          credential_ref: credentialRef,
        }),
        principal,
      );
    } catch (error) {
      if (current && stagedCredentialRequiresReauthorization(error)) {
        return requireM365Reauthorization({
          repository,
          credential_vault,
          request_failure_compensator,
          connection: current,
          principal,
          occurred_at: occurredAt,
        });
      }
      throw error;
    }
    if (
      staged.mailbox_address_hash !== authorization.mailbox_address_hash
    ) {
      if (current) {
        return requireM365Reauthorization({
          repository,
          credential_vault,
          request_failure_compensator,
          connection: current,
          principal,
          occurred_at: occurredAt,
        });
      }
      throw commandError(
        M365_GRAPH_ERROR_CODES.provider_invalid,
        "Stored Microsoft authorization credential mailbox mismatched",
        502,
      );
    }
    const draft = {
      m365_connection_id: m365ConnectionId(principal),
      ...principal,
      mailbox_address_hash: staged.mailbox_address_hash,
      granted_scopes: staged.granted_scopes,
      consented_at: staged.consented_at,
      expires_at: staged.credential.expires_at,
      revoked_at: null,
      state_version: nextStateVersion,
    };
    const connection = normalizeM365Connection({
        ...draft,
        credential_ref: credentialRef,
        pending_vault_cleanup_refs: cleanupReferences(
          current,
          current?.credential_ref,
        ),
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
              credential_cleanup_requested_count:
                connection.pending_vault_cleanup_refs.length,
            },
          });
          tx.recordIdempotency({
            tenant_id: principal.tenant_id,
            idempotency_key: idempotencyKey,
            operation: M365_CONNECTION_OPERATION,
            request_fingerprint: idempotencyKey.slice("m365-connect:".length),
            response: {
              operation: M365_CONNECTION_OPERATION,
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
    registerCredentialCleanup({
      request_failure_compensator,
      credential_vault,
      credential_refs: persisted.pending_vault_cleanup_refs,
      reason: "connection_replacement_committed",
    });
    return Object.freeze({
      outcome: current ? "reconnected" : "connected",
      connection: presentConnection(persisted, { clock }),
      release_readiness: readiness,
      credential_material_included: false,
      production_ready_claim: false,
    });
  }

  async function revokeConnection(input = {}) {
    const principal = assertEntraPrincipal(input);
    let current = findConnection(repository, principal);
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
    assertCredentialVault(credential_vault);
    if (current.revoked_at) {
      current = await drainCredentialCleanup({
        repository,
        credential_vault,
        connection: current,
        principal,
        clock,
      });
      return Object.freeze({
        outcome: "already_disconnected",
        connection: presentConnection(current, { clock }),
        credential_material_included: false,
        production_ready_claim: false,
      });
    }
    const occurredAt = timestamp(clock);
    const stagedRef = stagedCredentialReference(
      credential_vault,
      principal,
      current.state_version + 1,
    );
    const cleanupRefs = cleanupReferences(
      current,
      current.credential_ref,
      stagedRef,
    );
    const revoked = normalizeM365Connection({
      ...current,
      revoked_at: occurredAt,
      pending_vault_cleanup_refs: cleanupRefs,
      state_version: current.state_version + 1,
    });
    assertProviderRuntime({
      feature_enabled: true,
      provider_runtime_enabled,
      provider,
      credentialVault: credential_vault,
    });
    if (
      typeof provider.revokeDelegatedCredential !== "function"
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
    const reason = requiredString(input, "reason");
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
            credential_cleanup_requested: true,
            credential_cleanup_requested_count:
              cleanupRefs.length,
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
            credential_cleanup_requested: true,
          },
          created_at: occurredAt,
        });
        return saved;
      })
      : repository.update(connectionRef(principal), revoked);
    registerCredentialCleanup({
      request_failure_compensator,
      credential_vault,
      credential_refs: persisted.pending_vault_cleanup_refs,
      reason,
    });
    return Object.freeze({
      outcome: "disconnected",
      connection: presentConnection(persisted, { clock }),
      credential_material_included: false,
      production_ready_claim: false,
    });
  }

  return Object.freeze({
    getConnectionStatus,
    getAuthorizationAttemptStatus,
    beginAuthorization,
    completeAuthorization,
    revokeConnection,
    readiness,
    feature_enabled: feature_enabled === true,
    provider_runtime_enabled: provider_runtime_enabled === true,
    production_ready_claim: false,
  });
}
