import { createHash, randomUUID } from "node:crypto";
import { EXTERNAL_READ_PROVIDER_SCHEMA_VERSION } from "./external-read-provider-registry.js";

export const EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION =
  "law-firm-os.external-read-onboarding.v1";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const PROVIDER_ID = /^[a-z][a-z0-9._-]{1,63}$/u;
const OPAQUE_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s@]{1,511}$/u;
const FINAL_STATES = new Set(["ready", "failed", "repair_required", "disabled", "revoked"]);
const LIFECYCLE_KINDS = new Set(["sync", "rotate", "disable", "reconnect", "revoke", "repair"]);
const LIFECYCLE_FINAL_STATES = new Set(["completed", "failed", "repair_required"]);
const LIFECYCLE_ALLOWED_STATES = Object.freeze({
  sync: Object.freeze(["ready"]),
  rotate: Object.freeze(["ready"]),
  disable: Object.freeze(["ready"]),
  reconnect: Object.freeze(["disabled"]),
  revoke: Object.freeze(["ready", "disabled"]),
  repair: Object.freeze(["repair_required"]),
});

function failure(code, message, status = 409, extra = {}) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
    ...extra,
  });
}

function requiredText(value, field, pattern = SAFE_ID) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || (pattern && !pattern.test(text))) {
    throw new TypeError(`${field} is invalid`);
  }
  return text;
}

function apiKey(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 8192) {
    throw new TypeError("api_key is invalid");
  }
  if (value !== value.trim() || /[\r\n\0]/u.test(value)) {
    throw new TypeError("api_key is invalid");
  }
  return value;
}

function timestamp(value, field) {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function opaqueRef(value, field) {
  return requiredText(value, field, OPAQUE_REF);
}

function assertPort(value, name, methods, { operational = false } = {}) {
  for (const method of methods) {
    if (typeof value?.[method] !== "function") {
      throw new TypeError(`${name} method is required: ${method}`);
    }
  }
  if (operational && value?.operational !== true) {
    throw new TypeError(`${name} must be operational`);
  }
  return value;
}

function publicConnection(record, { replayed = false } = {}) {
  const publicSync = (sync) => sync ? Object.freeze({
    capability: sync.capability,
    item_count: sync.item_count,
    provider_receipt_ref: sync.provider_receipt_ref,
    sync_receipt_ref: sync.sync_receipt_ref,
    observed_at: sync.observed_at,
    committed_at: sync.committed_at,
    metrics: sync.metrics ? Object.freeze({ ...sync.metrics }) : null,
  }) : null;
  const publicOperation = record.last_operation ? Object.freeze({
    operation_id: record.last_operation.operation_id,
    kind: record.last_operation.kind,
    state: record.last_operation.state,
    safe_error_code: record.last_operation.safe_error_code ?? null,
    result: record.last_operation.result ?? null,
    completed_at: record.last_operation.completed_at ?? null,
  }) : null;
  return Object.freeze({
    schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
    tenant_id: record.tenant_id,
    legal_entity_id: record.legal_entity_id,
    connection_id: record.connection_id,
    provider_id: record.provider_id,
    adapter_version: record.adapter_version,
    state: record.state,
    consent_state: record.consent_state,
    credential_configured: Boolean(record.credential_ref),
    first_sync: publicSync(record.first_sync),
    latest_sync: publicSync(record.latest_sync ?? record.first_sync),
    last_operation: publicOperation,
    audit_receipt_ref: record.audit_receipt_ref ?? null,
    safe_error_code: record.safe_error_code ?? null,
    replayed,
    credential_material_included: false,
    raw_provider_payload_included: false,
  });
}

function publicSnapshot(snapshot) {
  if (!snapshot) return null;
  return Object.freeze({
    schema_version: snapshot.schema_version,
    tenant_id: snapshot.tenant_id,
    legal_entity_id: snapshot.legal_entity_id,
    connection_id: snapshot.connection_id,
    provider_id: snapshot.provider_id,
    capability: snapshot.capability,
    item_count: snapshot.item_count,
    items: Object.freeze([...(snapshot.items ?? [])]),
    provider_receipt_ref: snapshot.provider_receipt_ref,
    sync_receipt_ref: snapshot.sync_receipt_ref,
    observed_at: snapshot.observed_at,
    committed_at: snapshot.committed_at,
    metrics: snapshot.metrics ? Object.freeze({ ...snapshot.metrics }) : null,
    credential_material_included: false,
    raw_provider_payload_included: false,
  });
}

function publicLifecycle(record, operation, { replayed = false } = {}) {
  return Object.freeze({
    connection: publicConnection(record, { replayed }),
    operation: Object.freeze({
      operation_id: operation.operation_id,
      kind: operation.kind,
      state: operation.state,
      safe_error_code: operation.safe_error_code ?? null,
      result: operation.result ?? null,
      completed_at: operation.completed_at ?? null,
      replayed,
      credential_material_included: false,
      raw_provider_payload_included: false,
    }),
    replayed,
    credential_material_included: false,
    raw_provider_payload_included: false,
  });
}

function requestFingerprint(input, key) {
  return digest(JSON.stringify({
    schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
    tenant_id: input.tenant_id,
    legal_entity_id: input.legal_entity_id,
    provider_id: input.provider_id,
    actor_id: input.actor_id,
    api_key_sha256: digest(key),
  }));
}

function lifecycleFingerprint(input, kind, extras = {}) {
  return digest(JSON.stringify({
    schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
    kind,
    tenant_id: input.tenant_id,
    legal_entity_id: input.legal_entity_id,
    connection_id: input.connection_id,
    actor_id: input.actor_id,
    ...extras,
  }));
}

function providerConnection(record, credentialRef) {
  return Object.freeze({
    schema_version: EXTERNAL_READ_PROVIDER_SCHEMA_VERSION,
    tenant_id: record.tenant_id,
    legal_entity_id: record.legal_entity_id,
    connection_id: record.connection_id,
    provider_id: record.provider_id,
    state: "ready",
    consent_state: "not_required",
    credential_ref: credentialRef,
  });
}

function safeCauseCode(error, fallback) {
  const code = String(error?.safe_error_code ?? "");
  return /^[A-Z][A-Z0-9_]{2,127}$/u.test(code) ? code : fallback;
}

export function createExternalReadProviderOnboardingService({
  catalog,
  provider_registry,
  credential_vault,
  repository,
  idFactory = randomUUID,
  clock = () => new Date().toISOString(),
  operational = false,
  lease_milliseconds = 120_000,
} = {}) {
  const providerCatalog = assertPort(catalog, "provider catalog", ["get"]);
  const registry = assertPort(provider_registry, "provider registry", ["read"]);
  const vault = assertPort(credential_vault, "credential vault", [
    "referenceForConnection",
    "storeApiKey",
    "revokeApiKey",
  ], { operational });
  const records = assertPort(repository, "onboarding repository", [
    "claim",
    "stageCredential",
    "beginCleanup",
    "complete",
    "fail",
    "get",
    "readSnapshot",
    "claimLifecycle",
    "completeLifecycleSync",
    "failLifecycle",
    "completeDisable",
    "beginLifecycleCleanup",
    "activateRotation",
    "completeRotation",
    "completeRevoke",
    "markLifecycleRepairRequired",
    "completeRepair",
    "readLatestSnapshot",
  ], { operational });
  if (!Number.isSafeInteger(lease_milliseconds)
    || lease_milliseconds < 30_000
    || lease_milliseconds > 10 * 60_000) {
    throw new TypeError("lease_milliseconds must be between 30000 and 600000");
  }

  async function recordFailure({ claim, credentialRef, cause, fallbackCode }) {
    const safeErrorCode = safeCauseCode(cause, fallbackCode);
    await records.beginCleanup({
      tenant_id: claim.record.tenant_id,
      connection_id: claim.record.connection_id,
      lease_token: claim.lease_token,
      safe_error_code: safeErrorCode,
      occurred_at: timestamp(clock(), "clock"),
    });
    let cleanupReceipt = null;
    let cleanupError = null;
    if (credentialRef) {
      try {
        cleanupReceipt = await vault.revokeApiKey({
          tenant_id: claim.record.tenant_id,
          legal_entity_id: claim.record.legal_entity_id,
          connection_id: claim.record.connection_id,
          provider_id: claim.record.provider_id,
          credential_ref: credentialRef,
          reason: safeErrorCode,
        });
      } catch (error) {
        cleanupError = error;
      }
    }
    const state = cleanupError ? "repair_required" : "failed";
    const failed = await records.fail({
      tenant_id: claim.record.tenant_id,
      connection_id: claim.record.connection_id,
      lease_token: claim.lease_token,
      state,
      safe_error_code: cleanupError
        ? "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED"
        : safeErrorCode,
      cleanup_receipt_ref: cleanupReceipt?.credential_ref ?? null,
      occurred_at: timestamp(clock(), "clock"),
    });
    if (cleanupError) {
      throw failure(
        "EXTERNAL_READ_ONBOARDING_REPAIR_REQUIRED",
        "External provider onboarding requires credential cleanup repair",
        503,
        { cause: cleanupError, connection: publicConnection(failed) },
      );
    }
    throw failure(
      "EXTERNAL_READ_PROVIDER_VALIDATION_FAILED",
      "External provider rejected or could not validate the credential",
      422,
      { cause, connection: publicConnection(failed) },
    );
  }

  function normalizeLifecycleInput(input, kind) {
    return Object.freeze({
      tenant_id: requiredText(input.tenant_id, "tenant_id"),
      legal_entity_id: requiredText(input.legal_entity_id, "legal_entity_id"),
      connection_id: requiredText(input.connection_id, "connection_id"),
      actor_id: requiredText(input.actor_id, "actor_id"),
      idempotency_key: requiredText(input.idempotency_key, "idempotency_key"),
      kind,
    });
  }

  async function connectionForLifecycle(input, states) {
    const record = await records.get({
      tenant_id: input.tenant_id,
      connection_id: input.connection_id,
    });
    if (!record
      || record.legal_entity_id !== input.legal_entity_id
      || !states.includes(record.state)) {
      throw failure(
        "EXTERNAL_READ_CONNECTION_NOT_AVAILABLE",
        "External provider connection is not available for this operation",
        409,
      );
    }
    const provider = providerCatalog.get(record.provider_id);
    if (!provider || provider.adapter_version !== record.adapter_version) {
      throw failure(
        "EXTERNAL_READ_PROVIDER_VERSION_UNAVAILABLE",
        "The connection provider version is not admitted",
        409,
      );
    }
    return { record, provider };
  }

  async function claimLifecycle(normalized, requestHash, extra = {}) {
    const occurredAt = timestamp(clock(), "clock");
    return records.claimLifecycle({
      ...normalized,
      ...extra,
      request_hash: requestHash,
      operation_id: `external-operation:${requiredText(idFactory(), "operation id")}`,
      lease_token: `external-operation-lease:${requiredText(idFactory(), "operation lease")}`,
      lease_expires_at: new Date(Date.parse(occurredAt) + lease_milliseconds).toISOString(),
      occurred_at: occurredAt,
    });
  }

  function lifecycleInProgress(claim) {
    throw failure(
      "EXTERNAL_READ_OPERATION_IN_PROGRESS",
      "External provider lifecycle operation is already in progress",
      409,
      { connection: publicConnection(claim.record, { replayed: true }) },
    );
  }

  function assertCredential(record) {
    if (!record.credential_ref) {
      throw failure(
        "EXTERNAL_READ_CREDENTIAL_UNAVAILABLE",
        "External provider credential is unavailable",
        409,
      );
    }
    return opaqueRef(record.credential_ref, "credential_ref");
  }

  async function providerRead(record, provider, credentialRef = assertCredential(record)) {
    return registry.read({
      connection: providerConnection(record, credentialRef),
      scope: {
        tenant_id: record.tenant_id,
        legal_entity_id: record.legal_entity_id,
      },
      capability: provider.probe_capability,
      checkpoint_ref: record.latest_sync?.next_checkpoint_ref ?? null,
    });
  }

  async function runSyncLifecycle(input, kind) {
    const normalized = normalizeLifecycleInput(input, kind);
    const expectedStates = kind === "reconnect" ? ["disabled"] : ["ready"];
    const { record, provider } = await connectionForLifecycle(normalized, expectedStates);
    assertCredential(record);
    const requestHash = lifecycleFingerprint(normalized, kind, {
      provider_id: record.provider_id,
      adapter_version: record.adapter_version,
    });
    const claim = await claimLifecycle(normalized, requestHash);
    if (claim.outcome === "replayed") return publicLifecycle(claim.record, claim.operation, { replayed: true });
    if (claim.outcome === "in_progress") return lifecycleInProgress(claim);
    let sync;
    try {
      sync = await providerRead(claim.record, provider);
    } catch (cause) {
      const safeErrorCode = safeCauseCode(cause, "EXTERNAL_READ_SYNC_FAILED");
      const failed = await records.failLifecycle({
        tenant_id: normalized.tenant_id,
        connection_id: normalized.connection_id,
        operation_id: claim.operation.operation_id,
        lease_token: claim.lease_token,
        safe_error_code: safeErrorCode,
        occurred_at: timestamp(clock(), "clock"),
      });
      throw failure(
        kind === "reconnect" ? "EXTERNAL_READ_RECONNECT_FAILED" : "EXTERNAL_READ_SYNC_FAILED",
        "External provider synchronization failed",
        502,
        { cause, connection: publicConnection(failed.record) },
      );
    }
    const completed = await records.completeLifecycleSync({
      tenant_id: normalized.tenant_id,
      connection_id: normalized.connection_id,
      operation_id: claim.operation.operation_id,
      lease_token: claim.lease_token,
      sync,
      occurred_at: timestamp(clock(), "clock"),
    });
    return publicLifecycle(completed.record, completed.operation);
  }

  return Object.freeze({
    async onboardApiKey(input = {}) {
      const normalized = Object.freeze({
        tenant_id: requiredText(input.tenant_id, "tenant_id"),
        legal_entity_id: requiredText(input.legal_entity_id, "legal_entity_id"),
        provider_id: requiredText(input.provider_id, "provider_id", PROVIDER_ID),
        actor_id: requiredText(input.actor_id, "actor_id"),
        idempotency_key: requiredText(input.idempotency_key, "idempotency_key"),
      });
      const key = apiKey(input.api_key);
      const provider = providerCatalog.get(normalized.provider_id);
      if (!provider || provider.auth_type !== "api_key") {
        throw failure(
          "EXTERNAL_READ_PROVIDER_UNAVAILABLE",
          "External provider is not approved for API-key onboarding",
          409,
        );
      }
      const occurredAt = timestamp(clock(), "clock");
      const claim = await records.claim({
        ...normalized,
        adapter_version: provider.adapter_version,
        probe_capability: provider.probe_capability,
        request_hash: requestFingerprint(normalized, key),
        connection_id: `external-connection:${requiredText(idFactory(), "connection id")}`,
        lease_token: `external-lease:${requiredText(idFactory(), "lease token")}`,
        lease_expires_at: new Date(Date.parse(occurredAt) + lease_milliseconds).toISOString(),
        occurred_at: occurredAt,
      });
      if (claim.outcome === "replayed") {
        return publicConnection(claim.record, { replayed: true });
      }
      if (claim.outcome === "in_progress") {
        throw failure(
          "EXTERNAL_READ_ONBOARDING_IN_PROGRESS",
          "External provider onboarding is already in progress",
          409,
          { connection: publicConnection(claim.record, { replayed: true }) },
        );
      }

      const expectedRef = opaqueRef(vault.referenceForConnection({
        tenant_id: normalized.tenant_id,
        legal_entity_id: normalized.legal_entity_id,
        connection_id: claim.record.connection_id,
        provider_id: normalized.provider_id,
      }), "credential_ref");
      await records.stageCredential({
        tenant_id: normalized.tenant_id,
        connection_id: claim.record.connection_id,
        lease_token: claim.lease_token,
        credential_ref: expectedRef,
        occurred_at: timestamp(clock(), "clock"),
      });

      let storedRef;
      try {
        storedRef = opaqueRef(await vault.storeApiKey({
          tenant_id: normalized.tenant_id,
          legal_entity_id: normalized.legal_entity_id,
          connection_id: claim.record.connection_id,
          provider_id: normalized.provider_id,
          api_key: key,
        }), "stored credential_ref");
        if (storedRef !== expectedRef) {
          throw failure(
            "EXTERNAL_READ_CREDENTIAL_REFERENCE_MISMATCH",
            "Credential vault returned an unexpected reference",
            500,
          );
        }
      } catch (cause) {
        return recordFailure({
          claim,
          credentialRef: expectedRef,
          cause,
          fallbackCode: "EXTERNAL_READ_CREDENTIAL_STORE_FAILED",
        });
      }

      let firstSync;
      try {
        firstSync = await registry.read({
          connection: providerConnection(claim.record, storedRef),
          scope: {
            tenant_id: normalized.tenant_id,
            legal_entity_id: normalized.legal_entity_id,
          },
          capability: provider.probe_capability,
        });
      } catch (cause) {
        return recordFailure({
          claim,
          credentialRef: storedRef,
          cause,
          fallbackCode: "EXTERNAL_READ_PROVIDER_VALIDATION_FAILED",
        });
      }

      const completed = await records.complete({
        tenant_id: normalized.tenant_id,
        connection_id: claim.record.connection_id,
        lease_token: claim.lease_token,
        first_sync: firstSync,
        occurred_at: timestamp(clock(), "clock"),
      });
      return publicConnection(completed);
    },

    syncConnection(input = {}) {
      return runSyncLifecycle(input, "sync");
    },

    reconnectConnection(input = {}) {
      return runSyncLifecycle(input, "reconnect");
    },

    async disableConnection(input = {}) {
      const normalized = normalizeLifecycleInput(input, "disable");
      const { record } = await connectionForLifecycle(normalized, ["ready", "disabled"]);
      const reasonCode = requiredText(input.reason_code ?? "ADMIN_DISABLED", "reason_code");
      const claim = await claimLifecycle(normalized, lifecycleFingerprint(normalized, "disable", {
        provider_id: record.provider_id,
        reason_sha256: digest(reasonCode),
      }));
      if (claim.outcome === "replayed") return publicLifecycle(claim.record, claim.operation, { replayed: true });
      if (claim.outcome === "in_progress") return lifecycleInProgress(claim);
      const completed = await records.completeDisable({
        tenant_id: normalized.tenant_id,
        connection_id: normalized.connection_id,
        operation_id: claim.operation.operation_id,
        lease_token: claim.lease_token,
        occurred_at: timestamp(clock(), "clock"),
      });
      return publicLifecycle(completed.record, completed.operation);
    },

    async revokeConnection(input = {}) {
      const normalized = normalizeLifecycleInput(input, "revoke");
      const { record } = await connectionForLifecycle(normalized, ["ready", "disabled", "revoked", "repair_required"]);
      const credentialRef = record.credential_ref ? opaqueRef(record.credential_ref, "credential_ref") : null;
      const reasonCode = requiredText(input.reason_code ?? "ADMIN_REVOKED", "reason_code");
      const claim = await claimLifecycle(normalized, lifecycleFingerprint(normalized, "revoke", {
        provider_id: record.provider_id,
        reason_sha256: digest(reasonCode),
      }));
      if (claim.outcome === "replayed") return publicLifecycle(claim.record, claim.operation, { replayed: true });
      if (claim.outcome === "in_progress") return lifecycleInProgress(claim);
      const activeCredentialRef = claim.record.credential_ref
        ? opaqueRef(claim.record.credential_ref, "credential_ref")
        : credentialRef;
      if (!activeCredentialRef) {
        throw failure("EXTERNAL_READ_CREDENTIAL_UNAVAILABLE", "External provider credential is unavailable", 409);
      }
      try {
        await vault.revokeApiKey({
          tenant_id: normalized.tenant_id,
          legal_entity_id: normalized.legal_entity_id,
          connection_id: normalized.connection_id,
          provider_id: claim.record.provider_id,
          credential_ref: activeCredentialRef,
          reason: reasonCode,
        });
      } catch (cause) {
        const repaired = await records.markLifecycleRepairRequired({
          tenant_id: normalized.tenant_id,
          connection_id: normalized.connection_id,
          operation_id: claim.operation.operation_id,
          lease_token: claim.lease_token,
          target_state: "revoked",
          cleanup_credential_ref: activeCredentialRef,
          safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
          occurred_at: timestamp(clock(), "clock"),
        });
        throw failure(
          "EXTERNAL_READ_OPERATION_REPAIR_REQUIRED",
          "External provider credential revocation requires repair",
          503,
          { cause, connection: publicConnection(repaired.record) },
        );
      }
      const completed = await records.completeRevoke({
        tenant_id: normalized.tenant_id,
        connection_id: normalized.connection_id,
        operation_id: claim.operation.operation_id,
        lease_token: claim.lease_token,
        occurred_at: timestamp(clock(), "clock"),
      });
      return publicLifecycle(completed.record, completed.operation);
    },

    async rotateApiKey(input = {}) {
      const normalized = normalizeLifecycleInput(input, "rotate");
      const key = apiKey(input.api_key);
      const { record, provider } = await connectionForLifecycle(normalized, ["ready", "repair_required"]);
      const requestHash = lifecycleFingerprint(normalized, "rotate", {
        provider_id: record.provider_id,
        adapter_version: record.adapter_version,
        api_key_sha256: digest(key),
      });
      const generation = `rotation-${digest(`${normalized.idempotency_key}\u001f${requestHash}`).slice(0, 32)}`;
      const candidateRef = opaqueRef(vault.referenceForConnection({
        tenant_id: normalized.tenant_id,
        legal_entity_id: normalized.legal_entity_id,
        connection_id: normalized.connection_id,
        provider_id: record.provider_id,
        credential_generation: generation,
      }), "candidate credential_ref");
      const claim = await claimLifecycle(normalized, requestHash, {
        candidate_credential_ref: candidateRef,
        candidate_credential_generation: generation,
      });
      if (claim.outcome === "replayed") return publicLifecycle(claim.record, claim.operation, { replayed: true });
      if (claim.outcome === "in_progress") return lifecycleInProgress(claim);
      const operationInput = {
        tenant_id: normalized.tenant_id,
        connection_id: normalized.connection_id,
        operation_id: claim.operation.operation_id,
        lease_token: claim.lease_token,
      };

      if (claim.operation.phase === "candidate_cleanup_pending") {
        try {
          await vault.revokeApiKey({
            tenant_id: normalized.tenant_id,
            legal_entity_id: normalized.legal_entity_id,
            connection_id: normalized.connection_id,
            provider_id: claim.record.provider_id,
            credential_ref: claim.operation.cleanup_credential_ref,
            reason: claim.operation.safe_error_code,
          });
        } catch (cause) {
          const repaired = await records.markLifecycleRepairRequired({
            ...operationInput,
            target_state: "ready",
            cleanup_credential_ref: claim.operation.cleanup_credential_ref,
            safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
            occurred_at: timestamp(clock(), "clock"),
          });
          throw failure("EXTERNAL_READ_OPERATION_REPAIR_REQUIRED", "External provider rotation requires repair", 503, {
            cause,
            connection: publicConnection(repaired.record),
          });
        }
        const failed = await records.failLifecycle({
          ...operationInput,
          safe_error_code: claim.operation.safe_error_code,
          occurred_at: timestamp(clock(), "clock"),
        });
        throw failure("EXTERNAL_READ_ROTATION_VALIDATION_FAILED", "External provider rejected the rotated credential", 422, {
          connection: publicConnection(failed.record),
        });
      }

      if (claim.operation.phase === "old_cleanup_pending") {
        try {
          await vault.revokeApiKey({
            tenant_id: normalized.tenant_id,
            legal_entity_id: normalized.legal_entity_id,
            connection_id: normalized.connection_id,
            provider_id: claim.record.provider_id,
            credential_ref: claim.operation.cleanup_credential_ref,
            reason: "ROTATION_REPLACED",
          });
        } catch (cause) {
          const repaired = await records.markLifecycleRepairRequired({
            ...operationInput,
            target_state: "ready",
            cleanup_credential_ref: claim.operation.cleanup_credential_ref,
            safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
            occurred_at: timestamp(clock(), "clock"),
          });
          throw failure("EXTERNAL_READ_OPERATION_REPAIR_REQUIRED", "External provider rotation requires repair", 503, {
            cause,
            connection: publicConnection(repaired.record),
          });
        }
        const completed = await records.completeRotation({
          ...operationInput,
          occurred_at: timestamp(clock(), "clock"),
        });
        return publicLifecycle(completed.record, completed.operation);
      }

      let candidateStored = false;
      let sync;
      try {
        const storedRef = opaqueRef(await vault.storeApiKey({
          tenant_id: normalized.tenant_id,
          legal_entity_id: normalized.legal_entity_id,
          connection_id: normalized.connection_id,
          provider_id: claim.record.provider_id,
          credential_generation: generation,
          api_key: key,
        }), "stored candidate credential_ref");
        candidateStored = true;
        if (storedRef !== candidateRef) {
          throw failure("EXTERNAL_READ_CREDENTIAL_REFERENCE_MISMATCH", "Credential vault returned an unexpected reference", 500);
        }
        sync = await providerRead(claim.record, provider, candidateRef);
      } catch (cause) {
        const safeErrorCode = safeCauseCode(cause, "EXTERNAL_READ_ROTATION_VALIDATION_FAILED");
        const cleaning = await records.beginLifecycleCleanup({
          ...operationInput,
          cleanup_credential_ref: candidateRef,
          safe_error_code: safeErrorCode,
          occurred_at: timestamp(clock(), "clock"),
        });
        try {
          await vault.revokeApiKey({
            tenant_id: normalized.tenant_id,
            legal_entity_id: normalized.legal_entity_id,
            connection_id: normalized.connection_id,
            provider_id: claim.record.provider_id,
            credential_ref: candidateRef,
            reason: safeErrorCode,
          });
        } catch (cleanupCause) {
          const repaired = await records.markLifecycleRepairRequired({
            ...operationInput,
            target_state: "ready",
            cleanup_credential_ref: candidateRef,
            safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
            occurred_at: timestamp(clock(), "clock"),
          });
          throw failure("EXTERNAL_READ_OPERATION_REPAIR_REQUIRED", "External provider rotation requires repair", 503, {
            cause: cleanupCause,
            connection: publicConnection(repaired.record),
          });
        }
        const failed = await records.failLifecycle({
          ...operationInput,
          safe_error_code: safeErrorCode,
          occurred_at: timestamp(clock(), "clock"),
        });
        throw failure("EXTERNAL_READ_ROTATION_VALIDATION_FAILED", "External provider rejected the rotated credential", 422, {
          cause,
          connection: publicConnection(failed.record),
          candidate_credential_stored: candidateStored,
          cleanup_started: cleaning.operation.phase === "candidate_cleanup_pending",
        });
      }

      const activated = await records.activateRotation({
        ...operationInput,
        sync,
        occurred_at: timestamp(clock(), "clock"),
      });
      const oldCredentialRef = activated.operation.cleanup_credential_ref;
      try {
        await vault.revokeApiKey({
          tenant_id: normalized.tenant_id,
          legal_entity_id: normalized.legal_entity_id,
          connection_id: normalized.connection_id,
          provider_id: claim.record.provider_id,
          credential_ref: oldCredentialRef,
          reason: "ROTATION_REPLACED",
        });
      } catch (cause) {
        const repaired = await records.markLifecycleRepairRequired({
          ...operationInput,
          target_state: "ready",
          cleanup_credential_ref: oldCredentialRef,
          safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
          occurred_at: timestamp(clock(), "clock"),
        });
        throw failure("EXTERNAL_READ_OPERATION_REPAIR_REQUIRED", "External provider rotation requires repair", 503, {
          cause,
          connection: publicConnection(repaired.record),
        });
      }
      const completed = await records.completeRotation({
        ...operationInput,
        occurred_at: timestamp(clock(), "clock"),
      });
      return publicLifecycle(completed.record, completed.operation);
    },

    async repairConnection(input = {}) {
      const normalized = normalizeLifecycleInput(input, "repair");
      const { record } = await connectionForLifecycle(normalized, ["repair_required", "ready", "failed", "revoked"]);
      const requestHash = lifecycleFingerprint(normalized, "repair", {
        provider_id: record.provider_id,
      });
      const claim = await claimLifecycle(normalized, requestHash);
      if (claim.outcome === "replayed") return publicLifecycle(claim.record, claim.operation, { replayed: true });
      if (claim.outcome === "in_progress") return lifecycleInProgress(claim);
      const cleanupCredentialRef = opaqueRef(
        claim.record.repair_context?.cleanup_credential_ref,
        "repair cleanup_credential_ref",
      );
      try {
        await vault.revokeApiKey({
          tenant_id: normalized.tenant_id,
          legal_entity_id: normalized.legal_entity_id,
          connection_id: normalized.connection_id,
          provider_id: claim.record.provider_id,
          credential_ref: cleanupCredentialRef,
          reason: "REPAIR_CLEANUP",
        });
      } catch (cause) {
        throw failure("EXTERNAL_READ_REPAIR_FAILED", "External provider credential repair failed", 503, {
          cause,
          connection: publicConnection(claim.record),
        });
      }
      const completed = await records.completeRepair({
        tenant_id: normalized.tenant_id,
        connection_id: normalized.connection_id,
        operation_id: claim.operation.operation_id,
        lease_token: claim.lease_token,
        occurred_at: timestamp(clock(), "clock"),
      });
      return publicLifecycle(completed.record, completed.operation);
    },

    async getConnection({ tenant_id, legal_entity_id, connection_id } = {}) {
      const legalEntityId = requiredText(legal_entity_id, "legal_entity_id");
      const record = await records.get({
        tenant_id: requiredText(tenant_id, "tenant_id"),
        connection_id: requiredText(connection_id, "connection_id"),
      });
      if (!record || record.legal_entity_id !== legalEntityId) {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_FOUND", "External provider connection was not found", 404);
      }
      return publicConnection(record);
    },

    async readLatestSync({ tenant_id, legal_entity_id, connection_id } = {}) {
      const scope = {
        tenant_id: requiredText(tenant_id, "tenant_id"),
        legal_entity_id: requiredText(legal_entity_id, "legal_entity_id"),
      };
      const record = await records.get({
        tenant_id: scope.tenant_id,
        connection_id: requiredText(connection_id, "connection_id"),
      });
      if (!record || record.legal_entity_id !== scope.legal_entity_id) {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_FOUND", "External provider connection was not found", 404);
      }
      if (!["ready", "disabled"].includes(record.state)) {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_READY", "External provider connection is not ready", 409);
      }
      return publicSnapshot(await records.readLatestSnapshot({
        tenant_id: scope.tenant_id,
        legal_entity_id: scope.legal_entity_id,
        connection_id: record.connection_id,
      }));
    },

    async readFirstSync({ tenant_id, legal_entity_id, connection_id } = {}) {
      const scope = {
        tenant_id: requiredText(tenant_id, "tenant_id"),
        legal_entity_id: requiredText(legal_entity_id, "legal_entity_id"),
      };
      const record = await records.get({
        tenant_id: scope.tenant_id,
        connection_id: requiredText(connection_id, "connection_id"),
      });
      if (!record || record.legal_entity_id !== scope.legal_entity_id) {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_FOUND", "External provider connection was not found", 404);
      }
      if (record.state !== "ready") {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_READY", "External provider connection is not ready", 409);
      }
      return publicSnapshot(await records.readSnapshot({
        tenant_id: scope.tenant_id,
        legal_entity_id: scope.legal_entity_id,
        connection_id: record.connection_id,
        capability: record.first_sync.capability,
      }));
    },
  });
}

export function createTestExternalReadOnboardingRepository({
  clock = () => new Date().toISOString(),
} = {}) {
  const connections = new Map();
  const idempotency = new Map();
  const snapshots = new Map();
  const operations = new Map();
  const keyFor = (tenantId, connectionId) => `${tenantId}\u001f${connectionId}`;
  const operationKeyFor = (tenantId, operationId) => `${tenantId}\u001f${operationId}`;
  const clone = (value) => value == null ? value : structuredClone(value);

  function owned(input, states) {
    const key = keyFor(input.tenant_id, input.connection_id);
    const current = connections.get(key);
    if (!current || current.lease_token !== input.lease_token || !states.includes(current.state)) {
      throw failure("EXTERNAL_READ_ONBOARDING_LEASE_LOST", "External provider onboarding lease was lost", 409);
    }
    return { key, current };
  }

  function lifecycleOwned(input, kinds, phases) {
    const key = keyFor(input.tenant_id, input.connection_id);
    const operationKey = operationKeyFor(input.tenant_id, input.operation_id);
    const current = connections.get(key);
    const operation = operations.get(operationKey);
    if (!current
      || !operation
      || current.active_operation_id !== operation.operation_id
      || operation.lease_token !== input.lease_token
      || operation.state !== "running"
      || !kinds.includes(operation.kind)
      || !phases.includes(operation.phase)) {
      throw failure("EXTERNAL_READ_OPERATION_LEASE_LOST", "External provider operation lease was lost", 409);
    }
    return { key, operationKey, current, operation };
  }

  function testOperationSummary(operation) {
    return {
      operation_id: operation.operation_id,
      kind: operation.kind,
      state: operation.state,
      safe_error_code: operation.safe_error_code ?? null,
      result: clone(operation.result ?? null),
      completed_at: operation.completed_at ?? null,
    };
  }

  function testLifecycleSync(current, operation, sync, occurredAt) {
    if (!sync
      || sync.tenant_id !== current.tenant_id
      || sync.legal_entity_id !== current.legal_entity_id
      || sync.connection_id !== current.connection_id
      || sync.provider_id !== current.provider_id
      || sync.capability !== current.probe_capability
      || !Array.isArray(sync.items)
      || sync.item_count !== sync.items.length) {
      throw failure("EXTERNAL_READ_SYNC_SCOPE_MISMATCH", "External read sync scope did not match the connection", 409);
    }
    const syncDigest = digest(JSON.stringify({
      operation_id: operation.operation_id,
      connection_id: current.connection_id,
      capability: sync.capability,
      provider_receipt_ref: sync.provider_receipt_ref,
      items: sync.items,
    }));
    const syncReceiptRef = `SyncReceipt:${current.provider_id}/${syncDigest}`;
    const snapshotRecordId = `external-read-snapshot:${digest(`${current.connection_id}\u001f${sync.capability}\u001f${operation.operation_id}`)}`;
    const latestSync = {
      capability: sync.capability,
      item_count: sync.item_count,
      provider_receipt_ref: sync.provider_receipt_ref,
      sync_receipt_ref: syncReceiptRef,
      next_checkpoint_ref: sync.next_checkpoint_ref,
      metrics: sync.metrics ?? null,
      observed_at: sync.observed_at,
      committed_at: occurredAt,
      snapshot_record_id: snapshotRecordId,
    };
    snapshots.set(`${current.tenant_id}\u001f${snapshotRecordId}`, {
      ...clone(sync),
      sync_receipt_ref: syncReceiptRef,
      committed_at: occurredAt,
    });
    return latestSync;
  }

  return Object.freeze({
    operational: false,
    async claim(input) {
      const idempotencyKey = `${input.tenant_id}\u001f${input.idempotency_key}`;
      const previousId = idempotency.get(idempotencyKey);
      if (previousId) {
        const previous = connections.get(keyFor(input.tenant_id, previousId));
        if (!previous || previous.request_hash !== input.request_hash) {
          throw failure("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with a different request", 409);
        }
        if (FINAL_STATES.has(previous.state)) {
          return { outcome: "replayed", record: clone(previous), lease_token: null };
        }
        if (previous.state === "cleanup_pending"
          && Date.parse(previous.lease_expires_at) <= Date.parse(input.occurred_at)) {
          const stranded = {
            ...previous,
            state: "repair_required",
            safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
            lease_token: null,
            lease_expires_at: null,
            updated_at: input.occurred_at,
          };
          connections.set(keyFor(input.tenant_id, previousId), stranded);
          return { outcome: "replayed", record: clone(stranded), lease_token: null };
        }
        if (Date.parse(previous.lease_expires_at) > Date.parse(input.occurred_at)) {
          return { outcome: "in_progress", record: clone(previous), lease_token: null };
        }
        const resumed = {
          ...previous,
          lease_token: input.lease_token,
          lease_expires_at: input.lease_expires_at,
          attempt_number: previous.attempt_number + 1,
          updated_at: input.occurred_at,
        };
        connections.set(keyFor(input.tenant_id, previousId), resumed);
        return { outcome: "claimed", record: clone(resumed), lease_token: resumed.lease_token };
      }
      const record = {
        schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
        tenant_id: input.tenant_id,
        legal_entity_id: input.legal_entity_id,
        connection_id: input.connection_id,
        provider_id: input.provider_id,
        adapter_version: input.adapter_version,
        state: "provisioning",
        consent_state: "not_required",
        credential_ref: null,
        credential_generation: null,
        probe_capability: input.probe_capability,
        request_hash: input.request_hash,
        attempt_number: 1,
        lease_token: input.lease_token,
        lease_expires_at: input.lease_expires_at,
        first_sync: null,
        latest_sync: null,
        safe_error_code: null,
        active_operation_id: null,
        last_operation: null,
        repair_context: null,
        audit_receipt_ref: null,
        created_by: input.actor_id,
        created_at: input.occurred_at,
        updated_at: input.occurred_at,
      };
      connections.set(keyFor(input.tenant_id, input.connection_id), record);
      idempotency.set(idempotencyKey, input.connection_id);
      return { outcome: "claimed", record: clone(record), lease_token: record.lease_token };
    },
    async stageCredential(input) {
      const { key, current } = owned(input, ["provisioning", "credential_pending"]);
      const next = {
        ...current,
        state: "credential_pending",
        credential_ref: opaqueRef(input.credential_ref, "credential_ref"),
        updated_at: input.occurred_at,
      };
      connections.set(key, next);
      return clone(next);
    },
    async beginCleanup(input) {
      const { key, current } = owned(input, ["provisioning", "credential_pending"]);
      const next = {
        ...current,
        state: "cleanup_pending",
        safe_error_code: input.safe_error_code,
        updated_at: input.occurred_at,
      };
      connections.set(key, next);
      return clone(next);
    },
    async complete(input) {
      const { key, current } = owned(input, ["credential_pending"]);
      if (input.first_sync.connection_id !== current.connection_id
        || input.first_sync.provider_id !== current.provider_id
        || input.first_sync.tenant_id !== current.tenant_id
        || input.first_sync.legal_entity_id !== current.legal_entity_id
        || input.first_sync.capability !== current.probe_capability) {
        throw failure("EXTERNAL_READ_FIRST_SYNC_SCOPE_MISMATCH", "First sync scope did not match the connection", 409);
      }
      const snapshotRef = `${current.tenant_id}\u001f${current.legal_entity_id}\u001f${current.connection_id}\u001f${input.first_sync.capability}`;
      const committedAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const syncDigest = digest(JSON.stringify({
        connection_id: current.connection_id,
        capability: input.first_sync.capability,
        provider_receipt_ref: input.first_sync.provider_receipt_ref,
        items: input.first_sync.items,
      }));
      snapshots.set(snapshotRef, {
        ...clone(input.first_sync),
        sync_receipt_ref: `SyncReceipt:${current.provider_id}/${syncDigest}`,
        committed_at: committedAt,
      });
      const next = {
        ...current,
        state: "ready",
        credential_generation: "initial",
        first_sync: {
          capability: input.first_sync.capability,
          item_count: input.first_sync.item_count,
          provider_receipt_ref: input.first_sync.provider_receipt_ref,
          sync_receipt_ref: `SyncReceipt:${current.provider_id}/${syncDigest}`,
          next_checkpoint_ref: input.first_sync.next_checkpoint_ref,
          metrics: input.first_sync.metrics ?? null,
          observed_at: input.first_sync.observed_at,
          committed_at: committedAt,
        },
        latest_sync: {
          capability: input.first_sync.capability,
          item_count: input.first_sync.item_count,
          provider_receipt_ref: input.first_sync.provider_receipt_ref,
          sync_receipt_ref: `SyncReceipt:${current.provider_id}/${syncDigest}`,
          next_checkpoint_ref: input.first_sync.next_checkpoint_ref,
          metrics: input.first_sync.metrics ?? null,
          observed_at: input.first_sync.observed_at,
          committed_at: committedAt,
          snapshot_record_id: snapshotRef,
        },
        safe_error_code: null,
        audit_receipt_ref: `AuditReceipt:external-read/${digest(`${current.connection_id}\u001f${committedAt}`)}`,
        lease_token: null,
        lease_expires_at: null,
        updated_at: committedAt,
      };
      connections.set(key, next);
      return clone(next);
    },
    async fail(input) {
      const { key, current } = owned(input, ["cleanup_pending"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const next = {
        ...current,
        state: input.state,
        credential_ref: input.state === "failed" ? null : current.credential_ref,
        credential_generation: input.state === "failed" ? null : current.credential_generation,
        safe_error_code: input.safe_error_code,
        cleanup_receipt_ref: input.cleanup_receipt_ref,
        repair_context: input.state === "repair_required" ? {
          target_state: "failed",
          cleanup_credential_ref: current.credential_ref,
          source_operation_id: null,
        } : null,
        audit_receipt_ref: `AuditReceipt:external-read/${digest(`${current.connection_id}\u001f${occurredAt}\u001f${input.state}`)}`,
        lease_token: null,
        lease_expires_at: null,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      return clone(next);
    },
    async claimLifecycle(input) {
      if (!LIFECYCLE_KINDS.has(input.kind)) throw new TypeError("lifecycle kind is invalid");
      const idempotencyKey = `${input.tenant_id}\u001f${input.kind}\u001f${input.idempotency_key}`;
      const previousOperationId = idempotency.get(idempotencyKey);
      const connectionKey = keyFor(input.tenant_id, input.connection_id);
      const current = connections.get(connectionKey);
      if (!current || current.legal_entity_id !== input.legal_entity_id) {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_AVAILABLE", "External provider connection is not available for this operation", 409);
      }
      if (previousOperationId) {
        const operation = operations.get(operationKeyFor(input.tenant_id, previousOperationId));
        if (!operation || operation.request_hash !== input.request_hash || operation.connection_id !== input.connection_id) {
          throw failure("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with a different request", 409);
        }
        if (LIFECYCLE_FINAL_STATES.has(operation.state)) {
          return { outcome: "replayed", record: clone(current), operation: clone(operation), lease_token: null };
        }
        if (Date.parse(operation.lease_expires_at) > Date.parse(input.occurred_at)) {
          return { outcome: "in_progress", record: clone(current), operation: clone(operation), lease_token: null };
        }
        if (current.active_operation_id !== operation.operation_id) {
          throw failure("EXTERNAL_READ_OPERATION_REPAIR_REQUIRED", "External read lifecycle operation requires repair", 503);
        }
        const resumed = {
          ...operation,
          lease_token: input.lease_token,
          lease_expires_at: input.lease_expires_at,
          attempt_number: operation.attempt_number + 1,
          updated_at: input.occurred_at,
        };
        operations.set(operationKeyFor(input.tenant_id, operation.operation_id), resumed);
        return { outcome: "claimed", record: clone(current), operation: clone(resumed), lease_token: resumed.lease_token };
      }
      if (!LIFECYCLE_ALLOWED_STATES[input.kind].includes(current.state)) {
        throw failure("EXTERNAL_READ_CONNECTION_NOT_AVAILABLE", "External provider connection is not available for this operation", 409);
      }
      if (current.active_operation_id) {
        throw failure("EXTERNAL_READ_OPERATION_IN_PROGRESS", "Another external read lifecycle operation is in progress", 409);
      }
      const operation = {
        schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
        tenant_id: input.tenant_id,
        legal_entity_id: input.legal_entity_id,
        connection_id: input.connection_id,
        operation_id: input.operation_id,
        kind: input.kind,
        state: "running",
        phase: "claimed",
        request_hash: input.request_hash,
        actor_id: input.actor_id,
        resume_state: current.state,
        candidate_credential_ref: input.candidate_credential_ref ?? null,
        candidate_credential_generation: input.candidate_credential_generation ?? null,
        cleanup_credential_ref: null,
        lease_token: input.lease_token,
        lease_expires_at: input.lease_expires_at,
        attempt_number: 1,
        safe_error_code: null,
        result: null,
        completed_at: null,
        created_at: input.occurred_at,
        updated_at: input.occurred_at,
      };
      const next = {
        ...current,
        state: input.kind === "revoke" ? "disabled" : current.state,
        active_operation_id: operation.operation_id,
        safe_error_code: null,
        updated_at: input.occurred_at,
      };
      operations.set(operationKeyFor(input.tenant_id, operation.operation_id), operation);
      connections.set(connectionKey, next);
      idempotency.set(idempotencyKey, operation.operation_id);
      return { outcome: "claimed", record: clone(next), operation: clone(operation), lease_token: operation.lease_token };
    },
    async completeLifecycleSync(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["sync", "reconnect"], ["claimed"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const latestSync = testLifecycleSync(current, operation, input.sync, occurredAt);
      const result = {
        outcome: "synchronized",
        capability: latestSync.capability,
        item_count: latestSync.item_count,
        provider_receipt_ref: latestSync.provider_receipt_ref,
        sync_receipt_ref: latestSync.sync_receipt_ref,
        committed_at: occurredAt,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const completedOperation = {
        ...operation,
        state: "completed",
        phase: "completed",
        lease_token: null,
        lease_expires_at: null,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: "ready",
        latest_sync: latestSync,
        active_operation_id: null,
        last_operation: testOperationSummary(completedOperation),
        safe_error_code: null,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, completedOperation);
      return { record: clone(next), operation: clone(completedOperation) };
    },
    async failLifecycle(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(
        input,
        ["sync", "reconnect", "rotate"],
        ["claimed", "candidate_cleanup_pending"],
      );
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const result = {
        outcome: "failed",
        safe_error_code: input.safe_error_code,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const failedOperation = {
        ...operation,
        state: "failed",
        phase: "completed",
        lease_token: null,
        lease_expires_at: null,
        safe_error_code: input.safe_error_code,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: operation.resume_state,
        active_operation_id: null,
        last_operation: testOperationSummary(failedOperation),
        repair_context: null,
        safe_error_code: input.safe_error_code,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, failedOperation);
      return { record: clone(next), operation: clone(failedOperation) };
    },
    async completeDisable(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["disable"], ["claimed"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const result = {
        outcome: "disabled",
        credential_retained: true,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const completedOperation = {
        ...operation,
        state: "completed",
        phase: "completed",
        lease_token: null,
        lease_expires_at: null,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: "disabled",
        active_operation_id: null,
        last_operation: testOperationSummary(completedOperation),
        safe_error_code: null,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, completedOperation);
      return { record: clone(next), operation: clone(completedOperation) };
    },
    async beginLifecycleCleanup(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["rotate"], ["claimed"]);
      const nextOperation = {
        ...operation,
        phase: "candidate_cleanup_pending",
        cleanup_credential_ref: input.cleanup_credential_ref,
        safe_error_code: input.safe_error_code,
        updated_at: input.occurred_at,
      };
      const next = {
        ...current,
        state: "repair_required",
        safe_error_code: input.safe_error_code,
        updated_at: input.occurred_at,
      };
      connections.set(key, next);
      operations.set(operationKey, nextOperation);
      return { record: clone(next), operation: clone(nextOperation) };
    },
    async activateRotation(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["rotate"], ["claimed"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const latestSync = testLifecycleSync(current, operation, input.sync, occurredAt);
      const nextOperation = {
        ...operation,
        phase: "old_cleanup_pending",
        cleanup_credential_ref: current.credential_ref,
        activated_sync: latestSync,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: "repair_required",
        credential_ref: operation.candidate_credential_ref,
        credential_generation: operation.candidate_credential_generation,
        latest_sync: latestSync,
        safe_error_code: "EXTERNAL_READ_ROTATION_CLEANUP_PENDING",
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, nextOperation);
      return { record: clone(next), operation: clone(nextOperation) };
    },
    async completeRotation(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["rotate"], ["old_cleanup_pending"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const result = {
        outcome: "rotated",
        credential_generation: current.credential_generation,
        sync_receipt_ref: operation.activated_sync?.sync_receipt_ref ?? null,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const completedOperation = {
        ...operation,
        state: "completed",
        phase: "completed",
        cleanup_credential_ref: null,
        lease_token: null,
        lease_expires_at: null,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: "ready",
        active_operation_id: null,
        last_operation: testOperationSummary(completedOperation),
        repair_context: null,
        safe_error_code: null,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, completedOperation);
      return { record: clone(next), operation: clone(completedOperation) };
    },
    async completeRevoke(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["revoke"], ["claimed"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const result = {
        outcome: "revoked",
        credential_configured: false,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const completedOperation = {
        ...operation,
        state: "completed",
        phase: "completed",
        lease_token: null,
        lease_expires_at: null,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: "revoked",
        credential_ref: null,
        credential_generation: null,
        active_operation_id: null,
        last_operation: testOperationSummary(completedOperation),
        repair_context: null,
        safe_error_code: null,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, completedOperation);
      return { record: clone(next), operation: clone(completedOperation) };
    },
    async markLifecycleRepairRequired(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(
        input,
        ["rotate", "revoke"],
        ["claimed", "candidate_cleanup_pending", "old_cleanup_pending"],
      );
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const result = {
        outcome: "repair_required",
        safe_error_code: input.safe_error_code,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const repairOperation = {
        ...operation,
        state: "repair_required",
        phase: "completed",
        cleanup_credential_ref: null,
        lease_token: null,
        lease_expires_at: null,
        safe_error_code: input.safe_error_code,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const next = {
        ...current,
        state: "repair_required",
        active_operation_id: null,
        last_operation: testOperationSummary(repairOperation),
        repair_context: {
          target_state: input.target_state,
          cleanup_credential_ref: input.cleanup_credential_ref,
          source_operation_id: operation.operation_id,
        },
        safe_error_code: input.safe_error_code,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, repairOperation);
      return { record: clone(next), operation: clone(repairOperation) };
    },
    async completeRepair(input) {
      const { key, operationKey, current, operation } = lifecycleOwned(input, ["repair"], ["claimed"]);
      const occurredAt = timestamp(input.occurred_at ?? clock(), "occurred_at");
      const targetState = current.repair_context?.target_state;
      if (!["ready", "failed", "revoked"].includes(targetState)) {
        throw failure("EXTERNAL_READ_REPAIR_CONTEXT_INVALID", "External read repair context is invalid", 500);
      }
      const result = {
        outcome: "repaired",
        connection_state: targetState,
        credential_material_included: false,
        raw_provider_payload_included: false,
      };
      const completedOperation = {
        ...operation,
        state: "completed",
        phase: "completed",
        lease_token: null,
        lease_expires_at: null,
        result,
        completed_at: occurredAt,
        updated_at: occurredAt,
      };
      const discardCredential = ["failed", "revoked"].includes(targetState);
      const next = {
        ...current,
        state: targetState,
        credential_ref: discardCredential ? null : current.credential_ref,
        credential_generation: discardCredential ? null : current.credential_generation,
        active_operation_id: null,
        last_operation: testOperationSummary(completedOperation),
        repair_context: null,
        safe_error_code: null,
        updated_at: occurredAt,
      };
      connections.set(key, next);
      operations.set(operationKey, completedOperation);
      return { record: clone(next), operation: clone(completedOperation) };
    },
    async get({ tenant_id, connection_id }) {
      return clone(connections.get(keyFor(tenant_id, connection_id)) ?? null);
    },
    async readLatestSnapshot(input) {
      const connection = connections.get(keyFor(input.tenant_id, input.connection_id));
      if (!connection
        || connection.legal_entity_id !== input.legal_entity_id
        || !connection.latest_sync?.snapshot_record_id) return null;
      const direct = snapshots.get(connection.latest_sync.snapshot_record_id)
        ?? snapshots.get(`${input.tenant_id}\u001f${connection.latest_sync.snapshot_record_id}`);
      return direct ? Object.freeze({
        ...clone(direct),
        credential_material_included: false,
        raw_provider_payload_included: false,
      }) : null;
    },
    async readSnapshot(input) {
      const value = snapshots.get(`${input.tenant_id}\u001f${input.legal_entity_id}\u001f${input.connection_id}\u001f${input.capability}`);
      return value ? Object.freeze({
        ...clone(value),
        credential_material_included: false,
        raw_provider_payload_included: false,
      }) : null;
    },
    snapshot() {
      return clone({
        connections: [...connections.values()],
        snapshots: [...snapshots.values()],
        operations: [...operations.values()],
      });
    },
  });
}
