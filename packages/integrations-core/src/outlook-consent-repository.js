import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";

export const OUTLOOK_CONSENT_STATE_SCHEMA_VERSION = "outlook-consent-metadata.v3";

function safeId(value, field) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,200}$/.test(value.trim())) {
    throw new TypeError(`${field} must be a safe identifier`);
  }
  return value.trim();
}

function optionalId(value, field) {
  return value == null ? null : safeId(value, field);
}

function failure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function timestamp(value, field, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const result = String(value ?? "");
  if (!Number.isFinite(Date.parse(result))) throw new TypeError(`${field} must be an ISO timestamp`);
  return result;
}

export function normalizeStableOutlookConsent(input = {}) {
  const connectionState = input.connection_state ?? "active";
  if (!["active", "revoked"].includes(connectionState)) {
    throw new TypeError("stable Outlook consent state must be active or revoked");
  }
  const revokedAt = timestamp(input.revoked_at, "revoked_at", { nullable: true });
  if (connectionState === "revoked" && revokedAt === null) {
    throw new TypeError("revoked consent requires revoked_at");
  }
  if (connectionState === "active" && revokedAt !== null) {
    throw new TypeError("active consent must not have revoked_at");
  }
  const scopeHash = String(input.scope_hash ?? "");
  if (!/^sha256:[a-f0-9]{64}$/.test(scopeHash)) {
    throw new TypeError("scope_hash must be a SHA-256 reference");
  }
  const accessTokenRef = safeId(input.access_token_ref, "access_token_ref");
  const refreshTokenRef = safeId(input.refresh_token_ref, "refresh_token_ref");
  if (accessTokenRef === refreshTokenRef) {
    throw failure("OUTLOOK_TOKEN_REF_DUPLICATE", "Access and refresh token references must differ");
  }
  return {
    tenant_id: safeId(input.tenant_id, "tenant_id"),
    provider_identity_id: safeId(input.provider_identity_id, "provider_identity_id"),
    consent_ref: safeId(input.consent_ref, "consent_ref"),
    connection_state: connectionState,
    access_token_ref: accessTokenRef,
    refresh_token_ref: refreshTokenRef,
    expires_at: timestamp(input.expires_at, "expires_at"),
    scope_hash: scopeHash,
    key_version: safeId(input.key_version, "key_version"),
    revoked_at: revokedAt,
  };
}

function normalizePendingOperation(input = {}) {
  const transition = safeId(input.transition, "pending_operation.transition");
  if (!["grant", "refresh", "rotate", "revoke"].includes(transition)) {
    throw new TypeError("pending Outlook transition is invalid");
  }
  const previous = input.previous_record == null
    ? null
    : normalizeStableOutlookConsent(input.previous_record);
  const target = normalizeStableOutlookConsent(input.target_record);
  if (
    previous
    && (previous.tenant_id !== target.tenant_id || previous.consent_ref !== target.consent_ref)
  ) {
    throw new TypeError("pending Outlook transition records must share tenant and consent");
  }
  return {
    operation_id: safeId(input.operation_id, "pending_operation.operation_id"),
    transition,
    previous_record: previous,
    target_record: target,
    audit_action: safeId(input.audit_action, "pending_operation.audit_action"),
    actor_id: optionalId(input.actor_id, "pending_operation.actor_id"),
    occurred_at: timestamp(input.occurred_at, "pending_operation.occurred_at"),
  };
}

export function normalizeOutlookConsentRecord(input = {}) {
  if (input.connection_state !== "transition_pending") {
    return normalizeStableOutlookConsent(input);
  }
  const pendingOperation = normalizePendingOperation(input.pending_operation);
  const target = pendingOperation.target_record;
  if (input.tenant_id !== target.tenant_id || input.consent_ref !== target.consent_ref) {
    throw new TypeError("pending Outlook consent must match its target record");
  }
  return {
    ...target,
    connection_state: "transition_pending",
    pending_operation: pendingOperation,
  };
}

function normalizeAuditEvent(input = {}) {
  return {
    audit_event_id: safeId(input.audit_event_id, "audit_event_id"),
    tenant_id: safeId(input.tenant_id, "tenant_id"),
    provider_identity_id: safeId(input.provider_identity_id, "provider_identity_id"),
    consent_ref: safeId(input.consent_ref, "consent_ref"),
    action: safeId(input.action, "action"),
    actor_id: optionalId(input.actor_id, "actor_id"),
    occurred_at: timestamp(input.occurred_at, "occurred_at"),
  };
}

function normalizeOperationIntent(input = {}) {
  const transition = safeId(input.transition, "operation_intent.transition");
  if (!["grant", "refresh", "rotate", "revoke"].includes(transition)) {
    throw new TypeError("Outlook operation intent transition is invalid");
  }
  const createdAt = timestamp(input.created_at, "operation_intent.created_at");
  const recoverAfter = timestamp(input.recover_after, "operation_intent.recover_after");
  if (Date.parse(recoverAfter) <= Date.parse(createdAt)) {
    throw new TypeError("Outlook operation intent recovery must be after creation");
  }
  return {
    operation_id: safeId(input.operation_id, "operation_intent.operation_id"),
    tenant_id: safeId(input.tenant_id, "operation_intent.tenant_id"),
    consent_ref: safeId(input.consent_ref, "operation_intent.consent_ref"),
    transition,
    created_at: createdAt,
    recover_after: recoverAfter,
  };
}

function emptyState() {
  return {
    schema_version: OUTLOOK_CONSENT_STATE_SCHEMA_VERSION,
    records: [],
    audit_events: [],
    operation_intents: [],
  };
}

export function normalizeOutlookConsentState(input) {
  const value = input && typeof input === "object" ? input : emptyState();
  const state = {
    ...emptyState(),
    schema_version: OUTLOOK_CONSENT_STATE_SCHEMA_VERSION,
    records: (value.records ?? []).map(normalizeOutlookConsentRecord),
    audit_events: (value.audit_events ?? []).map(normalizeAuditEvent),
    operation_intents: (value.operation_intents ?? []).map(normalizeOperationIntent),
  };
  const consentKeys = new Set();
  const auditIds = new Set();
  const tokenRefOwners = new Map();
  const operationIds = new Set();
  const intentConsentKeys = new Set();
  for (const record of state.records) {
    const key = `${record.tenant_id}\u0000${record.consent_ref}`;
    if (consentKeys.has(key)) throw failure("OUTLOOK_CONSENT_DUPLICATE", "Consent reference must be tenant-unique");
    consentKeys.add(key);
    const stableRecords = record.connection_state === "transition_pending"
      ? [
        record.pending_operation.previous_record,
        record.pending_operation.target_record,
      ].filter(Boolean)
      : [record];
    for (const stable of stableRecords) {
      for (const ref of [stable.access_token_ref, stable.refresh_token_ref]) {
        const refKey = `${stable.tenant_id}\u0000${ref}`;
        if (tokenRefOwners.has(refKey) && tokenRefOwners.get(refKey) !== key) {
          throw failure("OUTLOOK_TOKEN_REF_DUPLICATE", "Opaque token reference must not be shared");
        }
        tokenRefOwners.set(refKey, key);
      }
    }
  }
  for (const event of state.audit_events) {
    if (auditIds.has(event.audit_event_id)) {
      throw failure("OUTLOOK_CONSENT_AUDIT_DUPLICATE", "Consent audit id must be unique");
    }
    auditIds.add(event.audit_event_id);
  }
  for (const intent of state.operation_intents) {
    const operationKey = `${intent.tenant_id}\u0000${intent.operation_id}`;
    const consentKey = `${intent.tenant_id}\u0000${intent.consent_ref}`;
    if (operationIds.has(operationKey) || intentConsentKeys.has(consentKey)) {
      throw failure(
        "OUTLOOK_CONSENT_OPERATION_INTENT_DUPLICATE",
        "Outlook operation intent must be unique",
      );
    }
    operationIds.add(operationKey);
    intentConsentKeys.add(consentKey);
  }
  return state;
}

export function assertOutlookConsentRepository(repository, { operational = false } = {}) {
  if (
    !repository
    || typeof repository.loadState !== "function"
    || typeof repository.replaceState !== "function"
  ) {
    throw new TypeError("Outlook consent repository must implement loadState and replaceState");
  }
  if (operational && (repository.test_only === true || repository.durable !== true)) {
    throw failure(
      "OUTLOOK_CONSENT_DURABLE_REPOSITORY_REQUIRED",
      "Operational Outlook consent metadata requires a durable repository",
    );
  }
  return repository;
}

export function assertOperationalOutlookConsentRepository(repository) {
  return assertOutlookConsentRepository(repository, { operational: true });
}

export function createTestOutlookConsentRepository({ state } = {}) {
  let current = normalizeOutlookConsentState(state);
  return Object.freeze({
    durable: false,
    test_only: true,
    loadState() {
      return clone(current);
    },
    replaceState(nextState) {
      current = normalizeOutlookConsentState(nextState);
      return clone(current);
    },
  });
}

export function createDurableOutlookConsentRepository({ filePath, file_path } = {}) {
  const resolvedFilePath = filePath ?? file_path;
  if (typeof resolvedFilePath !== "string" || resolvedFilePath.trim() === "") {
    throw new TypeError("filePath is required");
  }
  const controller = createDurableJsonStateController({
    filePath: resolvedFilePath,
    defaultValue: emptyState(),
    normalizeValue: normalizeOutlookConsentState,
  });
  return Object.freeze({
    durable: true,
    test_only: false,
    loadState() {
      return clone(controller.reload().value);
    },
    replaceState(nextState) {
      try {
        controller.commit(normalizeOutlookConsentState(nextState));
        return clone(controller.value);
      } catch (error) {
        controller.reload();
        throw error;
      }
    },
  });
}
