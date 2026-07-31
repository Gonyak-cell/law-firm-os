import { assertOpaqueTokenRef } from "./outlook-token-vault-port.js";
import {
  normalizeOutlookConsentRecord,
  normalizeOutlookConsentState,
  normalizeStableOutlookConsent,
} from "./outlook-consent-repository.js";

const OPERATION_INTENT_LEASE_MS = 5 * 60_000;

function failure(code, message, fields = {}) {
  const error = new Error(message);
  error.safe_error_code = code;
  Object.assign(error, fields);
  return error;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function transitionError(error, operationId) {
  return failure(
    "OUTLOOK_CONSENT_TRANSITION_PENDING",
    "Outlook consent transition is pending durable recovery",
    {
      cause: error,
      repair_operation_id: operationId,
      repair_required: true,
    },
  );
}

export function createOutlookConsentTransitionCoordinator({
  vault,
  repository,
  operationIdFactory,
  clock = () => new Date().toISOString(),
} = {}) {
  let state = normalizeOutlookConsentState(repository.loadState());
  const startupRecoveryFailures = [];

  function commit(nextState) {
    const normalized = normalizeOutlookConsentState(nextState);
    try {
      repository.replaceState(normalized);
      state = normalized;
    } catch (error) {
      const reloaded = normalizeOutlookConsentState(repository.loadState());
      for (const record of reloaded.records) validateRecordRefs(record);
      state = reloaded;
      throw error;
    }
  }

  function recordIndex(tenantId, consentRef) {
    return state.records.findIndex((record) => (
      record.tenant_id === tenantId && record.consent_ref === consentRef
    ));
  }

  function intentIndex(tenantId, operationId) {
    return state.operation_intents.findIndex((intent) => (
      intent.tenant_id === tenantId && intent.operation_id === operationId
    ));
  }

  function intentForConsent(tenantId, consentRef) {
    return state.operation_intents.find((intent) => (
      intent.tenant_id === tenantId && intent.consent_ref === consentRef
    )) ?? null;
  }

  function addIntent({ tenantId, consentRef, operationId, transition, createdAt }) {
    const recoverAfter = new Date(
      Date.parse(createdAt) + OPERATION_INTENT_LEASE_MS,
    ).toISOString();
    commit({
      ...state,
      operation_intents: [...state.operation_intents, {
        tenant_id: tenantId,
        consent_ref: consentRef,
        operation_id: operationId,
        transition,
        created_at: createdAt,
        recover_after: recoverAfter,
      }],
    });
  }

  function removeIntent(tenantId, operationId) {
    const operationIntents = state.operation_intents.filter((intent) => (
      intent.tenant_id !== tenantId || intent.operation_id !== operationId
    ));
    if (operationIntents.length === state.operation_intents.length) return false;
    commit({ ...state, operation_intents: operationIntents });
    return true;
  }

  function rawRecord(tenantId, consentRef) {
    const record = state.records[recordIndex(tenantId, consentRef)];
    if (!record) throw failure("OUTLOOK_CONSENT_NOT_FOUND", "Outlook consent was not found");
    return record;
  }

  function stableRecords(record) {
    return record.connection_state === "transition_pending"
      ? [
        record.pending_operation.previous_record,
        record.pending_operation.target_record,
      ].filter(Boolean)
      : [record];
  }

  function validateStableRecordRefs(record) {
    for (const [field, kind] of [
      ["access_token_ref", "outlook-access"],
      ["refresh_token_ref", "outlook-refresh"],
    ]) {
      try {
        const described = vault.describeRef({
          tenant_id: record.tenant_id,
          ref: record[field],
          kind,
        });
        assertOpaqueTokenRef(described, {
          tenant_id: record.tenant_id,
          kind,
          field,
          expected_ref: record[field],
          reference_prefix: vault.reference_prefix,
        });
      } catch {
        throw failure(
          "OUTLOOK_CONSENT_TOKEN_REF_INVALID",
          "Stored Outlook credential reference is invalid",
        );
      }
    }
    return record;
  }

  function validateRecordRefs(record) {
    for (const stable of stableRecords(record)) validateStableRecordRefs(stable);
    return record;
  }

  function reloadState() {
    const reloaded = normalizeOutlookConsentState(repository.loadState());
    for (const record of reloaded.records) validateRecordRefs(record);
    state = reloaded;
    return state;
  }

  function auditFor(pending) {
    return {
      audit_event_id: `outlook-consent-audit:${pending.operation_id}`,
      tenant_id: pending.target_record.tenant_id,
      provider_identity_id: pending.target_record.provider_identity_id,
      consent_ref: pending.target_record.consent_ref,
      action: pending.audit_action,
      actor_id: pending.actor_id,
      occurred_at: pending.occurred_at,
    };
  }

  function replaceRecord(record, auditEvent = null, removeOperationId = null) {
    validateRecordRefs(record);
    const index = recordIndex(record.tenant_id, record.consent_ref);
    const records = [...state.records];
    if (index === -1) records.push(record);
    else records[index] = record;
    const auditEvents = auditEvent && !state.audit_events.some((event) => (
      event.audit_event_id === auditEvent.audit_event_id
    ))
      ? [...state.audit_events, auditEvent]
      : state.audit_events;
    const operationIntents = removeOperationId === null
      ? state.operation_intents
      : state.operation_intents.filter((intent) => (
        intent.tenant_id !== record.tenant_id
        || intent.operation_id !== removeOperationId
      ));
    commit({
      ...state,
      records,
      audit_events: auditEvents,
      operation_intents: operationIntents,
    });
  }

  function removeRecord(tenantId, consentRef) {
    commit({
      ...state,
      records: state.records.filter((record) => (
        record.tenant_id !== tenantId || record.consent_ref !== consentRef
      )),
    });
  }

  function recoverPendingRecord(record) {
    validateRecordRefs(record);
    if (record.connection_state !== "transition_pending") return record;
    const pending = record.pending_operation;
    let vaultTransition = vault.getTransition({
      tenant_id: record.tenant_id,
      operation_id: pending.operation_id,
    });
    if (vaultTransition.status === "staged") {
      vaultTransition = vault.commitTransition({
        tenant_id: record.tenant_id,
        operation_id: pending.operation_id,
      });
    }
    if (vaultTransition.status === "committed") {
      const target = normalizeStableOutlookConsent(pending.target_record);
      validateStableRecordRefs(target);
      replaceRecord(target, auditFor(pending));
      return target;
    }
    if (vaultTransition.status === "aborted") {
      if (pending.previous_record) {
        const previous = normalizeStableOutlookConsent(pending.previous_record);
        validateStableRecordRefs(previous);
        replaceRecord(previous);
        return previous;
      }
      removeRecord(record.tenant_id, record.consent_ref);
      return null;
    }
    throw transitionError(
      failure("OUTLOOK_VAULT_TRANSITION_INVALID", "Vault transition state is invalid"),
      pending.operation_id,
    );
  }

  function stableRecord(tenantId, consentRef) {
    recoverOperationIntents();
    const activeIntent = intentForConsent(tenantId, consentRef);
    if (activeIntent) {
      throw transitionError(
        failure(
          "OUTLOOK_CONSENT_OPERATION_IN_PROGRESS",
          "Outlook consent operation is awaiting durable recovery",
        ),
        activeIntent.operation_id,
      );
    }
    let record = rawRecord(tenantId, consentRef);
    if (record.connection_state === "transition_pending") {
      try {
        record = recoverPendingRecord(record);
      } catch (error) {
        throw error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING"
          ? error
          : transitionError(error, record.pending_operation.operation_id);
      }
    }
    if (!record) throw failure("OUTLOOK_CONSENT_NOT_FOUND", "Outlook consent was not found");
    return validateStableRecordRefs(record);
  }

  function abortStaged({ tenantId, operationId, originalError }) {
    try {
      vault.abortTransition({
        tenant_id: tenantId,
        operation_id: operationId,
      });
    } catch (cleanupError) {
      originalError.repair_required = true;
      originalError.repair_operation_id = operationId;
      originalError.cleanup_safe_error_code = cleanupError.safe_error_code ?? "OUTLOOK_VAULT_ABORT_FAILED";
      throw originalError;
    }
    try {
      removeIntent(tenantId, operationId);
    } catch (cleanupError) {
      originalError.repair_required = true;
      originalError.repair_operation_id = operationId;
      originalError.cleanup_safe_error_code = cleanupError.safe_error_code
        ?? cleanupError.code
        ?? "OUTLOOK_CONSENT_INTENT_CLEANUP_FAILED";
    }
    throw originalError;
  }

  function execute({
    tenantId,
    consentRef,
    transition,
    previousRecord,
    creates,
    revokeRefs,
    targetFromRefs,
    auditAction,
    actorId,
    occurredAt,
  }) {
    const existingIntent = intentForConsent(tenantId, consentRef);
    if (existingIntent) {
      throw transitionError(
        failure(
          "OUTLOOK_CONSENT_OPERATION_IN_PROGRESS",
          "Outlook consent operation is awaiting durable recovery",
        ),
        existingIntent.operation_id,
      );
    }
    const operationId = operationIdFactory();
    addIntent({
      tenantId,
      consentRef,
      operationId,
      transition,
      createdAt: occurredAt,
    });
    let staged;
    try {
      staged = vault.stageTransition({
        tenant_id: tenantId,
        operation_id: operationId,
        creates,
        revoke_refs: revokeRefs,
      });
    } catch (error) {
      let discovered;
      try {
        discovered = vault.getTransition({
          tenant_id: tenantId,
          operation_id: operationId,
        });
      } catch (lookupError) {
        if (lookupError.safe_error_code === "OUTLOOK_VAULT_TRANSITION_NOT_FOUND") {
          removeIntent(tenantId, operationId);
          throw error;
        }
        throw transitionError(error, operationId);
      }
      if (discovered?.status === "staged") {
        return abortStaged({ tenantId, operationId, originalError: error });
      }
      if (discovered?.status === "committed") throw transitionError(error, operationId);
      if (discovered?.status === "aborted") {
        removeIntent(tenantId, operationId);
        throw error;
      }
      throw transitionError(error, operationId);
    }
    if (staged?.status !== "staged") {
      return abortStaged({
        tenantId,
        operationId,
        originalError: failure("OUTLOOK_VAULT_TRANSITION_INVALID", "Vault did not stage the transition"),
      });
    }
    const refs = {};
    let target;
    try {
      for (const create of creates) {
        refs[create.key] = assertOpaqueTokenRef(staged.refs?.[create.key], {
          tenant_id: tenantId,
          kind: create.kind,
          field: `${create.key}_token_ref`,
          raw_value: create.value ?? null,
          reference_prefix: vault.reference_prefix,
        });
      }
      target = normalizeStableOutlookConsent(targetFromRefs(refs));
    } catch (error) {
      return abortStaged({ tenantId, operationId, originalError: error });
    }
    const pending = normalizeOutlookConsentRecord({
      ...target,
      connection_state: "transition_pending",
      pending_operation: {
        operation_id: operationId,
        transition,
        previous_record: previousRecord ? clone(previousRecord) : null,
        target_record: target,
        audit_action: auditAction,
        actor_id: actorId,
        occurred_at: occurredAt,
      },
    });
    try {
      replaceRecord(pending, null, operationId);
    } catch (error) {
      return abortStaged({ tenantId, operationId, originalError: error });
    }
    try {
      vault.commitTransition({
        tenant_id: tenantId,
        operation_id: operationId,
      });
    } catch (error) {
      throw transitionError(error, operationId);
    }
    try {
      return recoverPendingRecord(rawRecord(tenantId, consentRef));
    } catch (error) {
      throw error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING"
        ? error
        : transitionError(error, operationId);
    }
  }

  function recoverOperationIntents() {
    const results = [];
    reloadState();
    const now = Date.parse(String(clock()));
    if (!Number.isFinite(now)) throw new TypeError("clock must return an ISO timestamp");
    for (const intent of [...state.operation_intents]) {
      if (now < Date.parse(intent.recover_after)) continue;
      let vaultTransition;
      try {
        vaultTransition = vault.getTransition({
          tenant_id: intent.tenant_id,
          operation_id: intent.operation_id,
        });
      } catch (error) {
        if (error.safe_error_code !== "OUTLOOK_VAULT_TRANSITION_NOT_FOUND") {
          results.push(Object.freeze({
            operation_id: intent.operation_id,
            outcome: "pending",
            safe_error_code: error.safe_error_code ?? "OUTLOOK_VAULT_TRANSITION_LOOKUP_FAILED",
          }));
          continue;
        }
        try {
          removeIntent(intent.tenant_id, intent.operation_id);
          results.push(Object.freeze({
            operation_id: intent.operation_id,
            outcome: "removed",
          }));
        } catch (cleanupError) {
          results.push(Object.freeze({
            operation_id: intent.operation_id,
            outcome: "pending",
            safe_error_code: cleanupError.safe_error_code
              ?? cleanupError.code
              ?? "OUTLOOK_CONSENT_INTENT_CLEANUP_FAILED",
          }));
        }
        continue;
      }
      if (vaultTransition.status === "committed") {
        results.push(Object.freeze({
          operation_id: intent.operation_id,
          outcome: "pending",
          safe_error_code: "OUTLOOK_VAULT_ORPHAN_COMMITTED",
        }));
        continue;
      }
      try {
        if (vaultTransition.status === "staged") {
          vault.abortTransition({
            tenant_id: intent.tenant_id,
            operation_id: intent.operation_id,
          });
        } else if (vaultTransition.status !== "aborted") {
          throw failure(
            "OUTLOOK_VAULT_TRANSITION_INVALID",
            "Vault transition state is invalid",
          );
        }
        removeIntent(intent.tenant_id, intent.operation_id);
        results.push(Object.freeze({
          operation_id: intent.operation_id,
          outcome: "removed",
        }));
      } catch (error) {
        results.push(Object.freeze({
          operation_id: intent.operation_id,
          outcome: "pending",
          safe_error_code: error.safe_error_code
            ?? error.code
            ?? "OUTLOOK_CONSENT_INTENT_RECOVERY_FAILED",
        }));
      }
    }
    return results;
  }

  function recoverPendingTransitions() {
    const results = recoverOperationIntents();
    for (const candidate of [...state.records]) {
      if (candidate.connection_state !== "transition_pending") continue;
      try {
        const record = recoverPendingRecord(candidate);
        results.push(Object.freeze({
          operation_id: candidate.pending_operation.operation_id,
          outcome: record ? record.connection_state : "removed",
        }));
      } catch (error) {
        results.push(Object.freeze({
          operation_id: candidate.pending_operation.operation_id,
          outcome: "pending",
          safe_error_code: error.safe_error_code ?? "OUTLOOK_CONSENT_RECOVERY_FAILED",
        }));
      }
    }
    return Object.freeze(results);
  }

  for (const record of state.records) validateRecordRefs(record);
  startupRecoveryFailures.push(
    ...recoverPendingTransitions().filter(({ outcome }) => outcome === "pending"),
  );

  return Object.freeze({
    execute,
    stableRecord,
    recordExists(tenantId, consentRef) {
      recoverOperationIntents();
      return recordIndex(tenantId, consentRef) !== -1
        || intentForConsent(tenantId, consentRef) !== null;
    },
    recoverPendingTransitions,
    snapshotRecords() {
      recoverOperationIntents();
      for (const record of state.records) validateRecordRefs(record);
      return clone(state.records);
    },
    snapshotAudit() {
      return clone(state.audit_events);
    },
    startupRecoveryFailures() {
      return clone(startupRecoveryFailures);
    },
  });
}
