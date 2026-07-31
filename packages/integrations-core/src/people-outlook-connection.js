import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  createDurableJsonStateController,
  isDurableStoreConflict,
} from "../../persistence/src/durable-file.js";
import { OUTLOOK_PEOPLE_DELEGATED_SCOPE } from "./outlook-token-vault.js";

const PROVIDER = "microsoft_graph";
const DEFAULT_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_STATE_SCHEMA_VERSION = "people-outlook-oauth-state.v1";
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value.trim())) {
    throw new TypeError(`${field} must be a safe identifier`);
  }
  return value.trim();
}

function failure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

function pendingKey(tenantId, employeeId) {
  return `${tenantId}\u0000${employeeId}`;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredStateRef(value) {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !SAFE_ID.test(value)
  ) {
    throw failure("OUTLOOK_OAUTH_STATE_INVALID", "Outlook authorization state is invalid");
  }
  return value;
}

function stateRefHash(value) {
  return `sha256:${createHash("sha256").update(requiredStateRef(value)).digest("hex")}`;
}

function sameStateRefHash(expected, actual) {
  const expectedBytes = Buffer.from(expected.slice("sha256:".length), "hex");
  const actualBytes = createHash("sha256").update(requiredStateRef(actual)).digest();
  return timingSafeEqual(expectedBytes, actualBytes);
}

function clockInstant(clock) {
  const instant = String(clock());
  const milliseconds = Date.parse(instant);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("clock must return an ISO timestamp");
  }
  return { instant, milliseconds };
}

function normalizeAuthorityRecord(input = {}) {
  const state = requiredId(input.state, "state");
  if (![
    "admin_consent_required",
    "consent_pending",
    "authorization_consuming",
    "reauthorization_required",
  ].includes(state)) {
    throw new TypeError("Outlook authorization state is invalid");
  }
  const createdAt = String(input.created_at ?? "");
  if (!Number.isFinite(Date.parse(createdAt))) {
    throw new TypeError("created_at must be an ISO timestamp");
  }
  const stateRefDigest = input.state_ref_hash == null
    ? (input.state_ref == null ? null : stateRefHash(input.state_ref))
    : String(input.state_ref_hash);
  if (stateRefDigest !== null && !/^sha256:[a-f0-9]{64}$/.test(stateRefDigest)) {
    throw new TypeError("state_ref_hash must be a SHA-256 reference");
  }
  const expiresAtMs = input.expires_at_ms == null ? null : Number(input.expires_at_ms);
  if (expiresAtMs !== null && !Number.isSafeInteger(expiresAtMs)) {
    throw new TypeError("expires_at_ms must be an integer");
  }
  if (state === "consent_pending") {
    if (!stateRefDigest) throw new TypeError("consent_pending state_ref is required");
    if (expiresAtMs === null) {
      throw new TypeError("consent_pending expires_at_ms is required");
    }
  }
  if (input.provider !== PROVIDER) {
    throw failure("PEOPLE_PROVIDER_UNSUPPORTED", "Only Microsoft Graph is supported");
  }
  return {
    provider: PROVIDER,
    tenant_id: requiredId(input.tenant_id, "tenant_id"),
    employee_id: requiredId(input.employee_id, "employee_id"),
    attempt_id: requiredId(input.attempt_id, "attempt_id"),
    state,
    state_ref_hash: stateRefDigest,
    created_at: createdAt,
    expires_at_ms: expiresAtMs,
    safe_error_code: input.safe_error_code == null
      ? null
      : requiredId(input.safe_error_code, "safe_error_code"),
  };
}

function emptyAuthorityState() {
  return {
    schema_version: OAUTH_STATE_SCHEMA_VERSION,
    records: [],
  };
}

function normalizeAuthorityState(input) {
  const value = input && typeof input === "object" ? input : emptyAuthorityState();
  const records = (value.records ?? []).map(normalizeAuthorityRecord);
  const bindings = new Set();
  for (const record of records) {
    const key = pendingKey(record.tenant_id, record.employee_id);
    if (bindings.has(key)) {
      throw failure("OUTLOOK_OAUTH_STATE_DUPLICATE", "Outlook authorization binding must be unique");
    }
    bindings.add(key);
  }
  return {
    schema_version: OAUTH_STATE_SCHEMA_VERSION,
    records,
  };
}

function recordFor(state, { tenant_id, employee_id, provider = PROVIDER }) {
  return state.records.find((record) => (
    record.provider === provider
    && record.tenant_id === tenant_id
    && record.employee_id === employee_id
  )) ?? null;
}

function replaceAuthorityRecord(state, record) {
  const key = pendingKey(record.tenant_id, record.employee_id);
  return normalizeAuthorityState({
    ...state,
    records: [
      ...state.records.filter((candidate) => (
        pendingKey(candidate.tenant_id, candidate.employee_id) !== key
      )),
      record,
    ],
  });
}

function deleteAuthorityRecord(state, {
  tenant_id,
  employee_id,
  provider = PROVIDER,
  attempt_id = null,
}) {
  return normalizeAuthorityState({
    ...state,
    records: state.records.filter((candidate) => !(
      candidate.provider === provider
      && candidate.tenant_id === tenant_id
      && candidate.employee_id === employee_id
      && (attempt_id === null || candidate.attempt_id === attempt_id)
    )),
  });
}

function createPeopleOutlookStateAuthority({
  durable,
  testOnly,
  readState,
  mutateState,
}) {
  function binding(input = {}) {
    const provider = input.provider ?? PROVIDER;
    if (provider !== PROVIDER) {
      throw failure("PEOPLE_PROVIDER_UNSUPPORTED", "Only Microsoft Graph is supported");
    }
    return {
      provider,
      tenant_id: requiredId(input.tenant_id, "tenant_id"),
      employee_id: requiredId(input.employee_id, "employee_id"),
    };
  }

  function read(input = {}) {
    const scoped = binding(input);
    const record = recordFor(readState(), scoped);
    return record ? Object.freeze(clone(record)) : null;
  }

  function put(input = {}) {
    const record = normalizeAuthorityRecord(input);
    return mutateState((state) => {
      const collision = record.state === "consent_pending" && state.records.some((candidate) => (
        candidate.provider === PROVIDER
        && candidate.state === "consent_pending"
        && candidate.state_ref_hash === record.state_ref_hash
        && (
          candidate.tenant_id !== record.tenant_id
          || candidate.employee_id !== record.employee_id
        )
      ));
      if (collision) {
        throw failure(
          "OUTLOOK_OAUTH_STATE_COLLISION",
          "Outlook authorization state must be unique",
        );
      }
      return {
        changed: true,
        state: replaceAuthorityRecord(state, record),
        value: record,
      };
    });
  }

  function issue(input = {}) {
    const record = normalizeAuthorityRecord(input);
    if (record.provider !== PROVIDER || record.state !== "consent_pending") {
      throw new TypeError("issued Outlook state must be a pending Microsoft Graph consent");
    }
    return put(record);
  }

  function remove(input = {}) {
    const scoped = binding(input);
    const attemptId = input.attempt_id == null
      ? null
      : requiredId(input.attempt_id, "attempt_id");
    return mutateState((state) => {
      const candidate = recordFor(state, scoped);
      if (!candidate || (attemptId !== null && candidate.attempt_id !== attemptId)) {
        return { changed: false, state, value: false };
      }
      return {
        changed: true,
        state: deleteAuthorityRecord(state, {
          ...scoped,
          attempt_id: attemptId,
        }),
        value: true,
      };
    });
  }

  function resetForBegin(input = {}) {
    const scoped = binding(input);
    return mutateState((state) => {
      const candidate = recordFor(state, scoped);
      if (candidate?.state === "authorization_consuming") {
        return { changed: false, state, value: false };
      }
      if (!candidate) return { changed: false, state, value: true };
      return {
        changed: true,
        state: deleteAuthorityRecord(state, scoped),
        value: true,
      };
    });
  }

  function replaceIfAttempt(input = {}) {
    const record = normalizeAuthorityRecord(input.record);
    const scoped = binding(record);
    const attemptId = requiredId(input.attempt_id, "attempt_id");
    return mutateState((state) => {
      const candidate = recordFor(state, scoped);
      if (!candidate || candidate.attempt_id !== attemptId) {
        return { changed: false, state, value: false };
      }
      return {
        changed: true,
        state: replaceAuthorityRecord(state, record),
        value: true,
      };
    });
  }

  function consume(input = {}) {
    const scoped = binding(input);
    const stateRef = requiredStateRef(input.state_ref);
    const nowMs = Number(input.now_ms);
    if (!Number.isSafeInteger(nowMs)) throw new TypeError("now_ms must be an integer");
    return mutateState((state) => {
      const candidate = recordFor(state, scoped);
      if (!candidate || candidate.state !== "consent_pending") {
        return {
          changed: false,
          state,
          value: { outcome: "invalid", record: null },
        };
      }
      if (candidate.expires_at_ms <= nowMs) {
        const expired = normalizeAuthorityRecord({
          ...candidate,
          state: "reauthorization_required",
          state_ref: null,
          safe_error_code: "OUTLOOK_OAUTH_STATE_EXPIRED",
        });
        return {
          changed: true,
          state: replaceAuthorityRecord(state, expired),
          value: { outcome: "expired", record: expired },
        };
      }
      if (!sameStateRefHash(candidate.state_ref_hash, stateRef)) {
        const restart = normalizeAuthorityRecord({
          ...candidate,
          state: "reauthorization_required",
          state_ref: null,
          safe_error_code: "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED",
        });
        return {
          changed: true,
          state: replaceAuthorityRecord(state, restart),
          value: { outcome: "invalid", record: restart },
        };
      }
      const consuming = normalizeAuthorityRecord({
        ...candidate,
        state: "authorization_consuming",
        state_ref: null,
        safe_error_code: null,
      });
      return {
        changed: true,
        state: replaceAuthorityRecord(state, consuming),
        value: { outcome: "consumed", record: consuming },
      };
    });
  }

  function expire(input = {}) {
    const scoped = binding(input);
    const nowMs = Number(input.now_ms);
    if (!Number.isSafeInteger(nowMs)) throw new TypeError("now_ms must be an integer");
    return mutateState((state) => {
      const candidate = recordFor(state, scoped);
      if (
        !candidate
        || candidate.state !== "consent_pending"
        || candidate.expires_at_ms > nowMs
      ) {
        return { changed: false, state, value: candidate ?? null };
      }
      const expired = normalizeAuthorityRecord({
        ...candidate,
        state: "reauthorization_required",
        state_ref: null,
        safe_error_code: "OUTLOOK_OAUTH_STATE_EXPIRED",
      });
      return {
        changed: true,
        state: replaceAuthorityRecord(state, expired),
        value: expired,
      };
    });
  }

  return Object.freeze({
    durable,
    test_only: testOnly,
    read,
    put,
    issue,
    remove,
    resetForBegin,
    replaceIfAttempt,
    consume,
    expire,
  });
}

export function createTestPeopleOutlookStateAuthority({ state } = {}) {
  let current = normalizeAuthorityState(state);
  return createPeopleOutlookStateAuthority({
    durable: false,
    testOnly: true,
    readState() {
      return normalizeAuthorityState(clone(current));
    },
    mutateState(operation) {
      const result = operation(normalizeAuthorityState(clone(current)));
      if (result.changed) current = normalizeAuthorityState(result.state);
      return clone(result.value);
    },
  });
}

export function createDurablePeopleOutlookStateAuthority({ filePath, file_path } = {}) {
  const resolvedFilePath = filePath ?? file_path;
  if (typeof resolvedFilePath !== "string" || resolvedFilePath.trim() === "") {
    throw new TypeError("filePath is required");
  }
  const controller = createDurableJsonStateController({
    filePath: resolvedFilePath,
    defaultValue: emptyAuthorityState(),
    normalizeValue: normalizeAuthorityState,
  });
  return createPeopleOutlookStateAuthority({
    durable: true,
    testOnly: false,
    readState() {
      return normalizeAuthorityState(controller.reload().value);
    },
    mutateState(operation) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const state = normalizeAuthorityState(controller.reload().value);
        const result = operation(state);
        if (!result.changed) return clone(result.value);
        try {
          controller.commit(result.state);
          return clone(result.value);
        } catch (error) {
          if (isDurableStoreConflict(error)) continue;
          throw error;
        }
      }
      throw failure(
        "OUTLOOK_OAUTH_STATE_CONFLICT",
        "Outlook authorization state changed concurrently",
      );
    },
  });
}

export function assertOperationalPeopleOutlookStateAuthority(authority) {
  if (
    !authority
    || authority.durable !== true
    || authority.test_only === true
    || typeof authority.consume !== "function"
  ) {
    throw failure(
      "OUTLOOK_OAUTH_DURABLE_STATE_REQUIRED",
      "Operational Outlook authorization requires a durable state authority",
    );
  }
  return authority;
}

const processPeopleOutlookStateAuthority = createTestPeopleOutlookStateAuthority();

function activeConsent(consentService, tenantId, consentRef) {
  return consentService.snapshot().find((record) => (
    record.tenant_id === tenantId
    && record.consent_ref === consentRef
    && record.connection_state === "active"
  )) ?? null;
}

function publicState({
  state,
  can_manage = false,
  connected_at = null,
  expires_at = null,
  safe_error_code = null,
} = {}) {
  return Object.freeze({
    provider: PROVIDER,
    connection_state: state,
    can_manage,
    delegated_scope: OUTLOOK_PEOPLE_DELEGATED_SCOPE,
    connected_at,
    expires_at,
    safe_error_code,
  });
}

export function createPeopleOutlookConnectionService({
  identityRegistry,
  consentService,
  calendarCache = null,
  oauthPort = null,
  clock = () => new Date().toISOString(),
  stateTtlMs = DEFAULT_OAUTH_STATE_TTL_MS,
  stateAuthority = processPeopleOutlookStateAuthority,
  operational = false,
} = {}) {
  if (!identityRegistry || typeof identityRegistry.get !== "function") {
    throw new TypeError("provider identity registry is required");
  }
  if (!consentService || typeof consentService.grant !== "function") {
    throw new TypeError("Outlook consent service is required");
  }
  if (!Number.isSafeInteger(stateTtlMs) || stateTtlMs <= 0) {
    throw new TypeError("stateTtlMs must be a positive integer");
  }
  if (
    !stateAuthority
    || typeof stateAuthority.read !== "function"
    || typeof stateAuthority.put !== "function"
    || typeof stateAuthority.issue !== "function"
    || typeof stateAuthority.consume !== "function"
    || typeof stateAuthority.replaceIfAttempt !== "function"
    || typeof stateAuthority.remove !== "function"
    || typeof stateAuthority.resetForBegin !== "function"
    || typeof stateAuthority.expire !== "function"
  ) {
    throw new TypeError("Outlook state authority is required");
  }
  const authorizationStates = operational
    ? assertOperationalPeopleOutlookStateAuthority(stateAuthority)
    : stateAuthority;

  function restartRequired({
    tenantId,
    employeeId,
    attemptId,
    safeErrorCode = "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED",
  }) {
    const current = authorizationStates.read({
      tenant_id: tenantId,
      employee_id: employeeId,
      provider: PROVIDER,
    });
    if (!current || current.attempt_id !== attemptId) return false;
    return authorizationStates.replaceIfAttempt({
      attempt_id: attemptId,
      record: {
        ...current,
        state_ref: null,
        state: "reauthorization_required",
        safe_error_code: safeErrorCode,
      },
    });
  }

  function consumePendingState({
    tenantId,
    employeeId,
    stateRef,
  }) {
    const consumed = authorizationStates.consume({
      provider: PROVIDER,
      tenant_id: tenantId,
      employee_id: employeeId,
      state_ref: stateRef,
      now_ms: clockInstant(clock).milliseconds,
    });
    if (consumed.outcome === "expired") {
      throw failure("OUTLOOK_OAUTH_STATE_EXPIRED", "Outlook authorization state has expired");
    }
    if (consumed.outcome !== "consumed" || !consumed.record?.attempt_id) {
      throw failure("OUTLOOK_OAUTH_STATE_INVALID", "Outlook authorization state is invalid");
    }
    return consumed.record.attempt_id;
  }

  function status({ tenant_id, employee_id, can_manage = false } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const employeeId = requiredId(employee_id, "employee_id");
    const identity = identityRegistry.get({ tenant_id: tenantId, employee_id: employeeId });
    if (!identity) {
      const pendingState = authorizationStates.expire({
        provider: PROVIDER,
        tenant_id: tenantId,
        employee_id: employeeId,
        now_ms: clockInstant(clock).milliseconds,
      });
      return publicState({
        state: pendingState?.state ?? "not_connected",
        can_manage,
        safe_error_code: pendingState?.safe_error_code ?? null,
      });
    }
    const consent = activeConsent(consentService, tenantId, identity.consent_ref);
    if (!consent) {
      return publicState({
        state: "reauthorization_required",
        can_manage,
        connected_at: identity.connected_at,
        safe_error_code: "OUTLOOK_CONSENT_NOT_ACTIVE",
      });
    }
    const expired = Date.parse(consent.expires_at) <= Date.parse(String(clock()));
    return publicState({
      state: expired ? "reauthorization_required" : "connected",
      can_manage,
      connected_at: identity.connected_at,
      expires_at: consent.expires_at,
      safe_error_code: expired ? "OUTLOOK_TOKEN_EXPIRED" : null,
    });
  }

  function begin({ tenant_id, employee_id, can_manage = false } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const employeeId = requiredId(employee_id, "employee_id");
    if (!can_manage) throw failure("OUTLOOK_CONNECTION_SELF_REQUIRED", "Only the linked employee can grant delegated calendar access");
    // Starting over invalidates any earlier callback even if the provider begin
    // call itself fails. The user can safely retry begin(), never an old state.
    const canBegin = authorizationStates.resetForBegin({
      provider: PROVIDER,
      tenant_id: tenantId,
      employee_id: employeeId,
    });
    if (!canBegin) {
      throw failure(
        "OUTLOOK_AUTHORIZATION_IN_PROGRESS",
        "Outlook authorization is already being completed",
      );
    }
    const now = clockInstant(clock);
    const attemptId = `outlook-auth-attempt:${randomUUID()}`;
    if (typeof oauthPort?.begin !== "function") {
      const next = {
        provider: PROVIDER,
        tenant_id: tenantId,
        employee_id: employeeId,
        attempt_id: attemptId,
        state: "admin_consent_required",
        state_ref: null,
        created_at: now.instant,
        expires_at_ms: null,
        safe_error_code: "OUTLOOK_ADMIN_CONSENT_REQUIRED",
      };
      authorizationStates.put(next);
      return publicState({ ...next, can_manage: true });
    }
    const authorization = oauthPort.begin({
      tenant_id: tenantId,
      employee_id: employeeId,
      scopes: [OUTLOOK_PEOPLE_DELEGATED_SCOPE],
      grant_type: "delegated",
    });
    const stateRef = requiredStateRef(authorization?.state_ref);
    const authorizeUrl = typeof authorization?.authorize_url === "string"
      ? authorization.authorize_url
      : null;
    authorizationStates.issue({
      provider: PROVIDER,
      tenant_id: tenantId,
      employee_id: employeeId,
      attempt_id: attemptId,
      state: "consent_pending",
      state_ref: stateRef,
      created_at: now.instant,
      expires_at_ms: now.milliseconds + stateTtlMs,
      safe_error_code: null,
    });
    return Object.freeze({
      ...publicState({ state: "consent_pending", can_manage: true }),
      state_ref: stateRef,
      authorize_url: authorizeUrl,
    });
  }

  function complete(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const employeeId = requiredId(input.employee_id, "employee_id");
    if (!input.can_manage) throw failure("OUTLOOK_CONNECTION_SELF_REQUIRED", "Only the linked employee can grant delegated calendar access");
    if (Object.hasOwn(input, "access_token") || Object.hasOwn(input, "refresh_token") || Object.hasOwn(input, "email")) {
      throw failure("OUTLOOK_OAUTH_BOUNDARY_INVALID", "OAuth tokens and email authority are not accepted from the client");
    }
    if (typeof oauthPort?.exchange !== "function") {
      throw failure("OUTLOOK_OAUTH_NOT_CONFIGURED", "Outlook OAuth exchange is not configured");
    }
    const authorizationCode = requiredId(input.authorization_code, "authorization_code");
    let stateRef;
    try {
      stateRef = requiredStateRef(input.state_ref);
    } catch (error) {
      const candidate = authorizationStates.read({
        provider: PROVIDER,
        tenant_id: tenantId,
        employee_id: employeeId,
      });
      if (candidate?.state === "consent_pending") {
        restartRequired({
          tenantId,
          employeeId,
          attemptId: candidate.attempt_id,
        });
      }
      throw error;
    }
    const attemptId = consumePendingState({
      tenantId,
      employeeId,
      stateRef,
    });
    try {
      const exchanged = oauthPort.exchange({
        tenant_id: tenantId,
        employee_id: employeeId,
        authorization_code: authorizationCode,
        state_ref: stateRef,
        scopes: [OUTLOOK_PEOPLE_DELEGATED_SCOPE],
        grant_type: "delegated",
      });
      const existing = identityRegistry.get({ tenant_id: tenantId, employee_id: employeeId });
      if (existing) {
        try {
          consentService.revoke({ tenant_id: tenantId, consent_ref: existing.consent_ref });
        } catch {
          // A missing old consent must not prevent a fresh delegated grant.
        }
        calendarCache?.deleteForIdentity?.({
          tenant_id: tenantId,
          employee_id: employeeId,
          provider_identity_id: existing.provider_identity_id,
        });
        identityRegistry.disconnect({
          tenant_id: tenantId,
          provider_identity_id: existing.provider_identity_id,
        });
      }
      const providerIdentityId = `provider-identity:${randomUUID()}`;
      const consentRef = `outlook-consent:${randomUUID()}`;
      const consent = consentService.grant({
        tenant_id: tenantId,
        provider_identity_id: providerIdentityId,
        consent_ref: consentRef,
        grant_type: exchanged?.grant_type,
        scopes: exchanged?.scopes,
        access_token: exchanged?.access_token,
        refresh_token: exchanged?.refresh_token,
        expires_at: exchanged?.expires_at,
        key_version: exchanged?.key_version ?? "v1",
      });
      try {
        identityRegistry.connect({
          provider_identity_id: providerIdentityId,
          tenant_id: tenantId,
          employee_id: employeeId,
          provider_subject_id: exchanged?.provider_subject_id,
          consent_ref: consentRef,
        });
      } catch (error) {
        consentService.revoke({ tenant_id: tenantId, consent_ref: consentRef });
        throw error;
      }
      authorizationStates.remove({
        provider: PROVIDER,
        tenant_id: tenantId,
        employee_id: employeeId,
        attempt_id: attemptId,
      });
      return publicState({
        state: "connected",
        can_manage: true,
        connected_at: String(clock()),
        expires_at: consent.expires_at,
      });
    } catch (error) {
      restartRequired({
        tenantId,
        employeeId,
        attemptId,
      });
      const restartError = failure(
        "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED",
        "Outlook authorization did not complete; start a new connection attempt",
      );
      restartError.cause = error;
      throw restartError;
    }
  }

  function disconnect({ tenant_id, employee_id, can_manage = false } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const employeeId = requiredId(employee_id, "employee_id");
    if (!can_manage) throw failure("OUTLOOK_CONNECTION_SELF_REQUIRED", "Only the linked employee can revoke delegated calendar access");
    const identity = identityRegistry.get({ tenant_id: tenantId, employee_id: employeeId });
    authorizationStates.remove({
      provider: PROVIDER,
      tenant_id: tenantId,
      employee_id: employeeId,
    });
    if (!identity) return publicState({ state: "not_connected", can_manage: true });
    try {
      consentService.revoke({ tenant_id: tenantId, consent_ref: identity.consent_ref });
    } finally {
      calendarCache?.deleteForIdentity?.({
        tenant_id: tenantId,
        employee_id: employeeId,
        provider_identity_id: identity.provider_identity_id,
      });
      identityRegistry.disconnect({
        tenant_id: tenantId,
        provider_identity_id: identity.provider_identity_id,
      });
    }
    return publicState({ state: "not_connected", can_manage: true });
  }

  return Object.freeze({ status, begin, complete, disconnect });
}
