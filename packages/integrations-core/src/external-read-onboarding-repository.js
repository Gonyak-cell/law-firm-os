import { createHash } from "node:crypto";
import { assertRepositoryPortV2 } from "../../persistence/src/repository-port-v2.js";
import { EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION } from "./external-read-provider-onboarding.js";

export const EXTERNAL_READ_CONNECTION_RECORD_TYPE = "external_read_connection";
export const EXTERNAL_READ_SNAPSHOT_RECORD_TYPE = "external_read_snapshot";
export const EXTERNAL_READ_OPERATION_RECORD_TYPE = "external_read_operation";

const FINAL_STATES = new Set(["ready", "failed", "repair_required", "disabled", "revoked"]);
const ACTIVE_STATES = new Set(["provisioning", "credential_pending", "cleanup_pending"]);
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
const HASH = /^[a-f0-9]{64}$/u;

function failure(code, message, status = 409) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function timestamp(value, field) {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function auditReceipt(connectionId, eventType, occurredAt) {
  return `AuditReceipt:external-read/${digest(`${connectionId}\u001f${eventType}\u001f${occurredAt}`)}`;
}

function snapshotId(connectionId, capability) {
  return `external-read-snapshot:${digest(`${connectionId}\u001f${capability}`)}`;
}

function lifecycleSnapshotId(connectionId, capability, operationId) {
  return `external-read-snapshot:${digest(`${connectionId}\u001f${capability}\u001f${operationId}`)}`;
}

function normalizeStoredConnection(value) {
  if (!value || value.schema_version !== EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION) {
    throw failure("EXTERNAL_READ_CONNECTION_INVALID", "External read connection is invalid", 500);
  }
  if (!ACTIVE_STATES.has(value.state) && !FINAL_STATES.has(value.state)) {
    throw failure("EXTERNAL_READ_CONNECTION_INVALID", "External read connection state is invalid", 500);
  }
  return clone(value);
}

function normalizeStoredOperation(value) {
  if (!value
    || value.schema_version !== EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION
    || !LIFECYCLE_KINDS.has(value.kind)
    || (!LIFECYCLE_FINAL_STATES.has(value.state) && value.state !== "running")) {
    throw failure("EXTERNAL_READ_OPERATION_INVALID", "External read operation is invalid", 500);
  }
  return clone(value);
}

function assertOwned(record, input, states) {
  if (!record
    || record.tenant_id !== input.tenant_id
    || record.connection_id !== input.connection_id
    || record.lease_token !== input.lease_token
    || !states.includes(record.state)) {
    throw failure(
      "EXTERNAL_READ_ONBOARDING_LEASE_LOST",
      "External provider onboarding lease was lost",
      409,
    );
  }
  return record;
}

async function appendAudit(tx, record, eventType, occurredAt, payload = {}, actorId = record.created_by) {
  const receipt = auditReceipt(record.connection_id, eventType, occurredAt);
  await tx.appendAudit({
    tenant_id: record.tenant_id,
    event_id: receipt,
    event_type: eventType,
    actor_id: actorId,
    object_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
    object_id: record.connection_id,
    payload: {
      ...payload,
      legal_entity_id: record.legal_entity_id,
      provider_id: record.provider_id,
      state: record.state,
      credential_material_included: false,
      raw_provider_payload_included: false,
    },
    created_at: occurredAt,
  });
  return receipt;
}

async function enqueueLifecycleCompletion(tx, connection, operation, topic, occurredAt, payload = {}) {
  if (typeof tx.enqueueOutbox !== "function") return;
  await tx.enqueueOutbox({
    tenant_id: connection.tenant_id,
    event_id: `external-read-${operation.kind}:${digest(`${connection.connection_id}\u001f${operation.operation_id}\u001f${topic}`)}`,
    topic,
    payload: {
      tenant_id: connection.tenant_id,
      legal_entity_id: connection.legal_entity_id,
      connection_id: connection.connection_id,
      provider_id: connection.provider_id,
      connection_state: connection.state,
      operation_id: operation.operation_id,
      operation_kind: operation.kind,
      ...payload,
      credential_material_included: false,
      raw_provider_payload_included: false,
    },
    created_at: occurredAt,
  });
}

export function createRepositoryPortV2ExternalReadOnboardingRepository({ repository } = {}) {
  const port = assertRepositoryPortV2(repository);
  const operational = port.capabilities?.authority === "postgres-v2"
    && port.capabilities?.tenant_scoped === true
    && port.capabilities?.async_transactions === true;

  async function readConnection(tx, tenantId, connectionId) {
    const stored = await tx.read({
      tenant_id: tenantId,
      record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
      record_id: connectionId,
    });
    return stored ? { stored, data: normalizeStoredConnection(stored.data) } : null;
  }

  async function readOperation(tx, tenantId, operationId) {
    const stored = await tx.read({
      tenant_id: tenantId,
      record_type: EXTERNAL_READ_OPERATION_RECORD_TYPE,
      record_id: operationId,
    });
    return stored ? { stored, data: normalizeStoredOperation(stored.data) } : null;
  }

  function assertLifecycleScope(record, input, allowedStates) {
    if (!record
      || record.tenant_id !== input.tenant_id
      || record.connection_id !== input.connection_id
      || record.legal_entity_id !== input.legal_entity_id
      || !allowedStates.includes(record.state)) {
      throw failure(
        "EXTERNAL_READ_CONNECTION_NOT_AVAILABLE",
        "External provider connection is not available for this operation",
        409,
      );
    }
    return record;
  }

  function assertLifecycleOwned(connection, operation, input, kinds = null, phases = null) {
    if (!connection
      || !operation
      || connection.active_operation_id !== operation.operation_id
      || operation.connection_id !== connection.connection_id
      || operation.lease_token !== input.lease_token
      || operation.state !== "running"
      || (kinds && !kinds.includes(operation.kind))
      || (phases && !phases.includes(operation.phase))) {
      throw failure(
        "EXTERNAL_READ_OPERATION_LEASE_LOST",
        "External provider operation lease was lost",
        409,
      );
    }
    return { connection, operation };
  }

  function operationSummary(operation) {
    return {
      operation_id: operation.operation_id,
      kind: operation.kind,
      state: operation.state,
      safe_error_code: operation.safe_error_code ?? null,
      result: clone(operation.result ?? null),
      completed_at: operation.completed_at ?? null,
    };
  }

  async function writeLifecyclePair(tx, currentConnection, currentOperation, {
    connection,
    operation,
    occurredAt,
    eventType,
    payload = {},
  }) {
    await tx.write({
      tenant_id: connection.tenant_id,
      record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
      record_id: connection.connection_id,
      expected_version: currentConnection.stored.state_version,
      data: connection,
      updated_at: occurredAt,
    });
    await tx.write({
      tenant_id: operation.tenant_id,
      record_type: EXTERNAL_READ_OPERATION_RECORD_TYPE,
      record_id: operation.operation_id,
      expected_version: currentOperation.stored.state_version,
      data: operation,
      updated_at: occurredAt,
    });
    const auditReceiptRef = await appendAudit(
      tx,
      connection,
      eventType,
      occurredAt,
      { operation_id: operation.operation_id, operation_kind: operation.kind, ...payload },
      operation.actor_id,
    );
    return { connection: clone(connection), operation: clone(operation), audit_receipt_ref: auditReceiptRef };
  }

  function validateLifecycleSync(record, sync) {
    const value = clone(sync);
    if (!value
      || value.tenant_id !== record.tenant_id
      || value.legal_entity_id !== record.legal_entity_id
      || value.connection_id !== record.connection_id
      || value.provider_id !== record.provider_id
      || value.capability !== record.probe_capability
      || !Array.isArray(value.items)
      || value.item_count !== value.items.length) {
      throw failure("EXTERNAL_READ_SYNC_SCOPE_MISMATCH", "External read sync scope did not match the connection", 409);
    }
    return value;
  }

  async function writeLifecycleSnapshot(tx, record, operation, sync, occurredAt) {
    const syncDigest = digest(JSON.stringify({
      operation_id: operation.operation_id,
      connection_id: record.connection_id,
      capability: sync.capability,
      provider_receipt_ref: sync.provider_receipt_ref,
      items: sync.items,
    }));
    const syncReceiptRef = `SyncReceipt:${record.provider_id}/${syncDigest}`;
    const recordId = lifecycleSnapshotId(record.connection_id, sync.capability, operation.operation_id);
    await tx.write({
      tenant_id: record.tenant_id,
      record_type: EXTERNAL_READ_SNAPSHOT_RECORD_TYPE,
      record_id: recordId,
      expected_version: 0,
      data: {
        schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
        tenant_id: record.tenant_id,
        legal_entity_id: record.legal_entity_id,
        connection_id: record.connection_id,
        provider_id: record.provider_id,
        capability: sync.capability,
        item_count: sync.item_count,
        items: sync.items,
        next_checkpoint_ref: sync.next_checkpoint_ref,
        metrics: sync.metrics ?? null,
        provider_receipt_ref: sync.provider_receipt_ref,
        sync_receipt_ref: syncReceiptRef,
        observed_at: sync.observed_at,
        committed_at: occurredAt,
      },
      created_at: occurredAt,
      updated_at: occurredAt,
    });
    return {
      capability: sync.capability,
      item_count: sync.item_count,
      provider_receipt_ref: sync.provider_receipt_ref,
      sync_receipt_ref: syncReceiptRef,
      next_checkpoint_ref: sync.next_checkpoint_ref,
      metrics: sync.metrics ?? null,
      observed_at: sync.observed_at,
      committed_at: occurredAt,
      snapshot_record_id: recordId,
    };
  }

  async function transition(input, states, mutate, eventType) {
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const connectionId = requiredText(input.connection_id, "connection_id");
    const occurredAt = timestamp(input.occurred_at, "occurred_at");
    return port.transaction({ tenant_id: tenantId }, async (tx) => {
      const current = await readConnection(tx, tenantId, connectionId);
      const record = assertOwned(current?.data, input, states);
      const next = mutate(clone(record));
      const receipt = auditReceipt(connectionId, eventType, occurredAt);
      next.audit_receipt_ref = receipt;
      next.updated_at = occurredAt;
      await tx.write({
        tenant_id: tenantId,
        record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
        record_id: connectionId,
        expected_version: current.stored.state_version,
        data: next,
        updated_at: occurredAt,
      });
      await appendAudit(tx, next, eventType, occurredAt);
      return clone(next);
    });
  }

  return Object.freeze({
    operational,
    durable: operational,
    authority: port.capabilities?.authority ?? "unknown",
    async claim(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const requestHash = requiredText(input.request_hash, "request_hash");
      if (!HASH.test(requestHash)) throw new TypeError("request_hash is invalid");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      const idempotencyKey = `external-read:onboard:${digest(requiredText(input.idempotency_key, "idempotency_key"))}`;
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const claim = await tx.claimIdempotency({
          tenant_id: tenantId,
          key: idempotencyKey,
          request_hash: requestHash,
          response: { connection_id: requiredText(input.connection_id, "connection_id") },
          created_at: occurredAt,
        });
        const connectionId = requiredText(claim.record.response?.connection_id, "claimed connection_id");
        const current = await readConnection(tx, tenantId, connectionId);
        if (!current) {
          if (claim.replayed) {
            throw failure(
              "EXTERNAL_READ_IDEMPOTENCY_RECORD_INCOMPLETE",
              "External read idempotency record has no connection",
              500,
            );
          }
          const record = {
            schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
            tenant_id: tenantId,
            legal_entity_id: requiredText(input.legal_entity_id, "legal_entity_id"),
            connection_id: connectionId,
            provider_id: requiredText(input.provider_id, "provider_id"),
            adapter_version: requiredText(input.adapter_version, "adapter_version"),
            state: "provisioning",
            consent_state: "not_required",
            credential_ref: null,
            credential_generation: null,
            probe_capability: requiredText(input.probe_capability, "probe_capability"),
            request_hash: requestHash,
            attempt_number: 1,
            lease_token: requiredText(input.lease_token, "lease_token"),
            lease_expires_at: timestamp(input.lease_expires_at, "lease_expires_at"),
            first_sync: null,
            safe_error_code: null,
            latest_sync: null,
            active_operation_id: null,
            last_operation: null,
            repair_context: null,
            audit_receipt_ref: auditReceipt(connectionId, "external_read.onboarding.claimed", occurredAt),
            created_by: requiredText(input.actor_id, "actor_id"),
            created_at: occurredAt,
            updated_at: occurredAt,
          };
          await tx.write({
            tenant_id: tenantId,
            record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
            record_id: connectionId,
            expected_version: 0,
            data: record,
            created_at: occurredAt,
            updated_at: occurredAt,
          });
          await appendAudit(tx, record, "external_read.onboarding.claimed", occurredAt);
          return { outcome: "claimed", record: clone(record), lease_token: record.lease_token };
        }
        const record = current.data;
        if (record.request_hash !== requestHash) {
          throw failure("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with a different request", 409);
        }
        if (FINAL_STATES.has(record.state)) {
          return { outcome: "replayed", record: clone(record), lease_token: null };
        }
        if (record.state === "cleanup_pending"
          && Date.parse(record.lease_expires_at) <= Date.parse(occurredAt)) {
          const stranded = {
            ...record,
            state: "repair_required",
            safe_error_code: "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED",
            lease_token: null,
            lease_expires_at: null,
            audit_receipt_ref: auditReceipt(connectionId, "external_read.onboarding.cleanup_stranded", occurredAt),
            updated_at: occurredAt,
          };
          await tx.write({
            tenant_id: tenantId,
            record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
            record_id: connectionId,
            expected_version: current.stored.state_version,
            data: stranded,
            updated_at: occurredAt,
          });
          await appendAudit(tx, stranded, "external_read.onboarding.cleanup_stranded", occurredAt);
          return { outcome: "replayed", record: clone(stranded), lease_token: null };
        }
        if (Date.parse(record.lease_expires_at) > Date.parse(occurredAt)) {
          return { outcome: "in_progress", record: clone(record), lease_token: null };
        }
        const resumed = {
          ...record,
          lease_token: requiredText(input.lease_token, "lease_token"),
          lease_expires_at: timestamp(input.lease_expires_at, "lease_expires_at"),
          attempt_number: record.attempt_number + 1,
          audit_receipt_ref: auditReceipt(connectionId, "external_read.onboarding.resumed", occurredAt),
          updated_at: occurredAt,
        };
        await tx.write({
          tenant_id: tenantId,
          record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
          record_id: connectionId,
          expected_version: current.stored.state_version,
          data: resumed,
          updated_at: occurredAt,
        });
        await appendAudit(tx, resumed, "external_read.onboarding.resumed", occurredAt);
        return { outcome: "claimed", record: clone(resumed), lease_token: resumed.lease_token };
      });
    },
    stageCredential(input = {}) {
      return transition(input, ["provisioning", "credential_pending"], (record) => ({
        ...record,
        state: "credential_pending",
        credential_ref: requiredText(input.credential_ref, "credential_ref"),
      }), "external_read.onboarding.credential_staged");
    },
    beginCleanup(input = {}) {
      return transition(input, ["provisioning", "credential_pending"], (record) => ({
        ...record,
        state: "cleanup_pending",
        safe_error_code: requiredText(input.safe_error_code, "safe_error_code"),
      }), "external_read.onboarding.cleanup_started");
    },
    async complete(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const current = await readConnection(tx, tenantId, connectionId);
        const record = assertOwned(current?.data, input, ["credential_pending"]);
        const sync = clone(input.first_sync);
        if (!sync
          || sync.tenant_id !== record.tenant_id
          || sync.legal_entity_id !== record.legal_entity_id
          || sync.connection_id !== record.connection_id
          || sync.provider_id !== record.provider_id
          || sync.capability !== record.probe_capability
          || !Array.isArray(sync.items)
          || sync.item_count !== sync.items.length) {
          throw failure("EXTERNAL_READ_FIRST_SYNC_SCOPE_MISMATCH", "First sync scope did not match the connection", 409);
        }
        const syncDigest = digest(JSON.stringify({
          connection_id: connectionId,
          capability: sync.capability,
          provider_receipt_ref: sync.provider_receipt_ref,
          items: sync.items,
        }));
        const syncReceiptRef = `SyncReceipt:${record.provider_id}/${syncDigest}`;
        const snapshotRecordId = snapshotId(connectionId, sync.capability);
        const previousSnapshot = await tx.read({
          tenant_id: tenantId,
          record_type: EXTERNAL_READ_SNAPSHOT_RECORD_TYPE,
          record_id: snapshotRecordId,
        });
        await tx.write({
          tenant_id: tenantId,
          record_type: EXTERNAL_READ_SNAPSHOT_RECORD_TYPE,
          record_id: snapshotRecordId,
          expected_version: previousSnapshot?.state_version ?? 0,
          data: {
            schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
            tenant_id: tenantId,
            legal_entity_id: record.legal_entity_id,
            connection_id: connectionId,
            provider_id: record.provider_id,
            capability: sync.capability,
            item_count: sync.item_count,
            items: sync.items,
            next_checkpoint_ref: sync.next_checkpoint_ref,
            metrics: sync.metrics ?? null,
            provider_receipt_ref: sync.provider_receipt_ref,
            sync_receipt_ref: syncReceiptRef,
            observed_at: sync.observed_at,
            committed_at: occurredAt,
          },
          updated_at: occurredAt,
        });
        const next = {
          ...record,
          state: "ready",
          credential_generation: "initial",
          first_sync: {
            capability: sync.capability,
            item_count: sync.item_count,
            provider_receipt_ref: sync.provider_receipt_ref,
            sync_receipt_ref: syncReceiptRef,
            next_checkpoint_ref: sync.next_checkpoint_ref,
            metrics: sync.metrics ?? null,
            observed_at: sync.observed_at,
            committed_at: occurredAt,
          },
          latest_sync: {
            capability: sync.capability,
            item_count: sync.item_count,
            provider_receipt_ref: sync.provider_receipt_ref,
            sync_receipt_ref: syncReceiptRef,
            next_checkpoint_ref: sync.next_checkpoint_ref,
            metrics: sync.metrics ?? null,
            observed_at: sync.observed_at,
            committed_at: occurredAt,
            snapshot_record_id: snapshotRecordId,
          },
          safe_error_code: null,
          lease_token: null,
          lease_expires_at: null,
          audit_receipt_ref: auditReceipt(connectionId, "external_read.onboarding.completed", occurredAt),
          updated_at: occurredAt,
        };
        await tx.write({
          tenant_id: tenantId,
          record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
          record_id: connectionId,
          expected_version: current.stored.state_version,
          data: next,
          updated_at: occurredAt,
        });
        await appendAudit(tx, next, "external_read.onboarding.completed", occurredAt, {
          capability: sync.capability,
          item_count: sync.item_count,
          provider_receipt_ref: sync.provider_receipt_ref,
          sync_receipt_ref: syncReceiptRef,
        });
        if (typeof tx.enqueueOutbox === "function") {
          await tx.enqueueOutbox({
            tenant_id: tenantId,
            event_id: `external-read-ready:${digest(`${connectionId}\u001f${syncReceiptRef}`)}`,
            topic: "external_read.connection.ready",
            payload: {
              tenant_id: tenantId,
              legal_entity_id: record.legal_entity_id,
              connection_id: connectionId,
              provider_id: record.provider_id,
              sync_receipt_ref: syncReceiptRef,
              credential_material_included: false,
              raw_provider_payload_included: false,
            },
            created_at: occurredAt,
          });
        }
        return clone(next);
      });
    },
    fail(input = {}) {
      if (!new Set(["failed", "repair_required"]).has(input.state)) {
        throw new TypeError("failure state is invalid");
      }
      return transition(input, ["cleanup_pending"], (record) => ({
        ...record,
        state: input.state,
        credential_ref: input.state === "failed" ? null : record.credential_ref,
        credential_generation: input.state === "failed" ? null : record.credential_generation,
        safe_error_code: requiredText(input.safe_error_code, "safe_error_code"),
        cleanup_receipt_ref: input.cleanup_receipt_ref ?? null,
        repair_context: input.state === "repair_required" ? {
          target_state: "failed",
          cleanup_credential_ref: record.credential_ref,
          source_operation_id: null,
        } : null,
        lease_token: null,
        lease_expires_at: null,
      }), input.state === "failed"
        ? "external_read.onboarding.failed"
        : "external_read.onboarding.repair_required");
    },
    async claimLifecycle(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const legalEntityId = requiredText(input.legal_entity_id, "legal_entity_id");
      const kind = requiredText(input.kind, "kind");
      if (!LIFECYCLE_KINDS.has(kind)) throw new TypeError("lifecycle kind is invalid");
      const requestHash = requiredText(input.request_hash, "request_hash");
      if (!HASH.test(requestHash)) throw new TypeError("request_hash is invalid");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      const leaseExpiresAt = timestamp(input.lease_expires_at, "lease_expires_at");
      const idempotencyKey = `external-read:${kind}:${digest(requiredText(input.idempotency_key, "idempotency_key"))}`;
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const claim = await tx.claimIdempotency({
          tenant_id: tenantId,
          key: idempotencyKey,
          request_hash: requestHash,
          response: { operation_id: requiredText(input.operation_id, "operation_id") },
          created_at: occurredAt,
        });
        const operationId = requiredText(claim.record.response?.operation_id, "claimed operation_id");
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const connection = assertLifecycleScope(
          currentConnection?.data,
          { tenant_id: tenantId, connection_id: connectionId, legal_entity_id: legalEntityId },
          claim.replayed
            ? [...FINAL_STATES, ...ACTIVE_STATES]
            : LIFECYCLE_ALLOWED_STATES[kind],
        );
        const currentOperation = await readOperation(tx, tenantId, operationId);
        if (claim.replayed) {
          if (!currentOperation
            || currentOperation.data.request_hash !== requestHash
            || currentOperation.data.connection_id !== connectionId) {
            throw failure(
              "EXTERNAL_READ_IDEMPOTENCY_RECORD_INCOMPLETE",
              "External read lifecycle idempotency record is incomplete",
              500,
            );
          }
          const operation = currentOperation.data;
          if (LIFECYCLE_FINAL_STATES.has(operation.state)) {
            return { outcome: "replayed", record: clone(connection), operation: clone(operation), lease_token: null };
          }
          if (Date.parse(operation.lease_expires_at) > Date.parse(occurredAt)) {
            return { outcome: "in_progress", record: clone(connection), operation: clone(operation), lease_token: null };
          }
          if (connection.active_operation_id !== operationId) {
            throw failure(
              "EXTERNAL_READ_OPERATION_REPAIR_REQUIRED",
              "External read lifecycle operation requires repair",
              503,
            );
          }
          const resumed = {
            ...operation,
            lease_token: requiredText(input.lease_token, "lease_token"),
            lease_expires_at: leaseExpiresAt,
            attempt_number: operation.attempt_number + 1,
            updated_at: occurredAt,
          };
          await tx.write({
            tenant_id: tenantId,
            record_type: EXTERNAL_READ_OPERATION_RECORD_TYPE,
            record_id: operationId,
            expected_version: currentOperation.stored.state_version,
            data: resumed,
            updated_at: occurredAt,
          });
          await appendAudit(tx, connection, `external_read.lifecycle.${kind}.resumed`, occurredAt, {
            operation_id: operationId,
            operation_kind: kind,
          }, resumed.actor_id);
          return { outcome: "claimed", record: clone(connection), operation: clone(resumed), lease_token: resumed.lease_token };
        }
        if (currentOperation || connection.active_operation_id) {
          throw failure(
            "EXTERNAL_READ_OPERATION_IN_PROGRESS",
            "Another external read lifecycle operation is in progress",
            409,
          );
        }
        const operation = {
          schema_version: EXTERNAL_READ_ONBOARDING_SCHEMA_VERSION,
          tenant_id: tenantId,
          legal_entity_id: legalEntityId,
          connection_id: connectionId,
          operation_id: operationId,
          kind,
          state: "running",
          phase: "claimed",
          request_hash: requestHash,
          actor_id: requiredText(input.actor_id, "actor_id"),
          resume_state: connection.state,
          candidate_credential_ref: input.candidate_credential_ref ?? null,
          candidate_credential_generation: input.candidate_credential_generation ?? null,
          cleanup_credential_ref: null,
          lease_token: requiredText(input.lease_token, "lease_token"),
          lease_expires_at: leaseExpiresAt,
          attempt_number: 1,
          safe_error_code: null,
          result: null,
          completed_at: null,
          created_at: occurredAt,
          updated_at: occurredAt,
        };
        const nextConnection = {
          ...connection,
          state: kind === "revoke" ? "disabled" : connection.state,
          active_operation_id: operationId,
          safe_error_code: null,
          updated_at: occurredAt,
        };
        await tx.write({
          tenant_id: tenantId,
          record_type: EXTERNAL_READ_OPERATION_RECORD_TYPE,
          record_id: operationId,
          expected_version: 0,
          data: operation,
          created_at: occurredAt,
          updated_at: occurredAt,
        });
        await tx.write({
          tenant_id: tenantId,
          record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
          record_id: connectionId,
          expected_version: currentConnection.stored.state_version,
          data: nextConnection,
          updated_at: occurredAt,
        });
        await appendAudit(tx, nextConnection, `external_read.lifecycle.${kind}.claimed`, occurredAt, {
          operation_id: operationId,
          operation_kind: kind,
        }, operation.actor_id);
        return { outcome: "claimed", record: clone(nextConnection), operation: clone(operation), lease_token: operation.lease_token };
      });
    },
    async completeLifecycleSync(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["sync", "reconnect"],
          ["claimed"],
        );
        const sync = validateLifecycleSync(connection, input.sync);
        const latestSync = await writeLifecycleSnapshot(tx, connection, operation, sync, occurredAt);
        const result = {
          outcome: "synchronized",
          capability: latestSync.capability,
          item_count: latestSync.item_count,
          provider_receipt_ref: latestSync.provider_receipt_ref,
          sync_receipt_ref: latestSync.sync_receipt_ref,
          committed_at: latestSync.committed_at,
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
        const nextConnection = {
          ...connection,
          state: "ready",
          latest_sync: latestSync,
          active_operation_id: null,
          last_operation: operationSummary(completedOperation),
          safe_error_code: null,
          audit_receipt_ref: auditReceipt(connectionId, `external_read.lifecycle.${operation.kind}.completed`, occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: completedOperation,
          occurredAt,
          eventType: `external_read.lifecycle.${operation.kind}.completed`,
          payload: {
            capability: latestSync.capability,
            item_count: latestSync.item_count,
            provider_receipt_ref: latestSync.provider_receipt_ref,
            sync_receipt_ref: latestSync.sync_receipt_ref,
          },
        });
        await enqueueLifecycleCompletion(
          tx,
          nextConnection,
          completedOperation,
          operation.kind === "reconnect"
            ? "external_read.connection.reconnected"
            : "external_read.connection.synchronized",
          occurredAt,
          { sync_receipt_ref: latestSync.sync_receipt_ref },
        );
        return { record: clone(nextConnection), operation: clone(completedOperation) };
      });
    },
    async failLifecycle(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      const safeErrorCode = requiredText(input.safe_error_code, "safe_error_code");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["sync", "reconnect", "rotate"],
          ["claimed", "candidate_cleanup_pending"],
        );
        const result = {
          outcome: "failed",
          safe_error_code: safeErrorCode,
          credential_material_included: false,
          raw_provider_payload_included: false,
        };
        const failedOperation = {
          ...operation,
          state: "failed",
          phase: "completed",
          lease_token: null,
          lease_expires_at: null,
          safe_error_code: safeErrorCode,
          result,
          completed_at: occurredAt,
          updated_at: occurredAt,
        };
        const nextConnection = {
          ...connection,
          state: operation.resume_state,
          active_operation_id: null,
          last_operation: operationSummary(failedOperation),
          repair_context: null,
          safe_error_code: safeErrorCode,
          audit_receipt_ref: auditReceipt(connectionId, `external_read.lifecycle.${operation.kind}.failed`, occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: failedOperation,
          occurredAt,
          eventType: `external_read.lifecycle.${operation.kind}.failed`,
          payload: { safe_error_code: safeErrorCode },
        });
        return { record: clone(nextConnection), operation: clone(failedOperation) };
      });
    },
    async completeDisable(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["disable"],
          ["claimed"],
        );
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
        const nextConnection = {
          ...connection,
          state: "disabled",
          active_operation_id: null,
          last_operation: operationSummary(completedOperation),
          safe_error_code: null,
          audit_receipt_ref: auditReceipt(connectionId, "external_read.lifecycle.disable.completed", occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: completedOperation,
          occurredAt,
          eventType: "external_read.lifecycle.disable.completed",
        });
        await enqueueLifecycleCompletion(
          tx,
          nextConnection,
          completedOperation,
          "external_read.connection.disabled",
          occurredAt,
        );
        return { record: clone(nextConnection), operation: clone(completedOperation) };
      });
    },
    async beginLifecycleCleanup(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["rotate"],
          ["claimed"],
        );
        const nextOperation = {
          ...operation,
          phase: "candidate_cleanup_pending",
          cleanup_credential_ref: requiredText(input.cleanup_credential_ref, "cleanup_credential_ref"),
          safe_error_code: requiredText(input.safe_error_code, "safe_error_code"),
          updated_at: occurredAt,
        };
        const nextConnection = {
          ...connection,
          state: "repair_required",
          safe_error_code: nextOperation.safe_error_code,
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: nextOperation,
          occurredAt,
          eventType: "external_read.lifecycle.rotate.cleanup_started",
          payload: { safe_error_code: nextOperation.safe_error_code },
        });
        return { record: clone(nextConnection), operation: clone(nextOperation) };
      });
    },
    async activateRotation(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["rotate"],
          ["claimed"],
        );
        const sync = validateLifecycleSync(connection, input.sync);
        const latestSync = await writeLifecycleSnapshot(tx, connection, operation, sync, occurredAt);
        const oldCredentialRef = requiredText(connection.credential_ref, "current credential_ref");
        const candidateCredentialRef = requiredText(operation.candidate_credential_ref, "candidate credential_ref");
        const nextOperation = {
          ...operation,
          phase: "old_cleanup_pending",
          cleanup_credential_ref: oldCredentialRef,
          activated_sync: latestSync,
          updated_at: occurredAt,
        };
        const nextConnection = {
          ...connection,
          state: "repair_required",
          credential_ref: candidateCredentialRef,
          credential_generation: requiredText(operation.candidate_credential_generation, "candidate credential_generation"),
          latest_sync: latestSync,
          safe_error_code: "EXTERNAL_READ_ROTATION_CLEANUP_PENDING",
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: nextOperation,
          occurredAt,
          eventType: "external_read.lifecycle.rotate.activated",
          payload: {
            capability: latestSync.capability,
            item_count: latestSync.item_count,
            provider_receipt_ref: latestSync.provider_receipt_ref,
            sync_receipt_ref: latestSync.sync_receipt_ref,
          },
        });
        return { record: clone(nextConnection), operation: clone(nextOperation) };
      });
    },
    async completeRotation(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["rotate"],
          ["old_cleanup_pending"],
        );
        const result = {
          outcome: "rotated",
          credential_generation: connection.credential_generation,
          sync_receipt_ref: operation.activated_sync?.sync_receipt_ref ?? null,
          credential_material_included: false,
          raw_provider_payload_included: false,
        };
        const completedOperation = {
          ...operation,
          state: "completed",
          phase: "completed",
          lease_token: null,
          lease_expires_at: null,
          cleanup_credential_ref: null,
          result,
          completed_at: occurredAt,
          updated_at: occurredAt,
        };
        const nextConnection = {
          ...connection,
          state: "ready",
          active_operation_id: null,
          last_operation: operationSummary(completedOperation),
          repair_context: null,
          safe_error_code: null,
          audit_receipt_ref: auditReceipt(connectionId, "external_read.lifecycle.rotate.completed", occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: completedOperation,
          occurredAt,
          eventType: "external_read.lifecycle.rotate.completed",
          payload: { sync_receipt_ref: result.sync_receipt_ref },
        });
        await enqueueLifecycleCompletion(
          tx,
          nextConnection,
          completedOperation,
          "external_read.connection.rotated",
          occurredAt,
          { sync_receipt_ref: result.sync_receipt_ref },
        );
        return { record: clone(nextConnection), operation: clone(completedOperation) };
      });
    },
    async completeRevoke(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["revoke"],
          ["claimed"],
        );
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
        const nextConnection = {
          ...connection,
          state: "revoked",
          credential_ref: null,
          credential_generation: null,
          active_operation_id: null,
          last_operation: operationSummary(completedOperation),
          repair_context: null,
          safe_error_code: null,
          audit_receipt_ref: auditReceipt(connectionId, "external_read.lifecycle.revoke.completed", occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: completedOperation,
          occurredAt,
          eventType: "external_read.lifecycle.revoke.completed",
        });
        await enqueueLifecycleCompletion(
          tx,
          nextConnection,
          completedOperation,
          "external_read.connection.revoked",
          occurredAt,
        );
        return { record: clone(nextConnection), operation: clone(completedOperation) };
      });
    },
    async markLifecycleRepairRequired(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      const targetState = requiredText(input.target_state, "target_state");
      if (!["ready", "failed", "revoked"].includes(targetState)) {
        throw new TypeError("repair target_state is invalid");
      }
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["rotate", "revoke"],
          ["claimed", "candidate_cleanup_pending", "old_cleanup_pending"],
        );
        const safeErrorCode = requiredText(input.safe_error_code, "safe_error_code");
        const cleanupCredentialRef = requiredText(input.cleanup_credential_ref, "cleanup_credential_ref");
        const result = {
          outcome: "repair_required",
          safe_error_code: safeErrorCode,
          credential_material_included: false,
          raw_provider_payload_included: false,
        };
        const repairOperation = {
          ...operation,
          state: "repair_required",
          phase: "completed",
          lease_token: null,
          lease_expires_at: null,
          cleanup_credential_ref: null,
          safe_error_code: safeErrorCode,
          result,
          completed_at: occurredAt,
          updated_at: occurredAt,
        };
        const nextConnection = {
          ...connection,
          state: "repair_required",
          active_operation_id: null,
          last_operation: operationSummary(repairOperation),
          repair_context: {
            target_state: targetState,
            cleanup_credential_ref: cleanupCredentialRef,
            source_operation_id: operationId,
          },
          safe_error_code: safeErrorCode,
          audit_receipt_ref: auditReceipt(connectionId, `external_read.lifecycle.${operation.kind}.repair_required`, occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: repairOperation,
          occurredAt,
          eventType: `external_read.lifecycle.${operation.kind}.repair_required`,
          payload: { safe_error_code: safeErrorCode, target_state: targetState },
        });
        return { record: clone(nextConnection), operation: clone(repairOperation) };
      });
    },
    async completeRepair(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const operationId = requiredText(input.operation_id, "operation_id");
      const occurredAt = timestamp(input.occurred_at, "occurred_at");
      return port.transaction({ tenant_id: tenantId }, async (tx) => {
        const currentConnection = await readConnection(tx, tenantId, connectionId);
        const currentOperation = await readOperation(tx, tenantId, operationId);
        const { connection, operation } = assertLifecycleOwned(
          currentConnection?.data,
          currentOperation?.data,
          input,
          ["repair"],
          ["claimed"],
        );
        const targetState = connection.repair_context?.target_state;
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
        const nextConnection = {
          ...connection,
          state: targetState,
          credential_ref: discardCredential ? null : connection.credential_ref,
          credential_generation: discardCredential ? null : connection.credential_generation,
          active_operation_id: null,
          last_operation: operationSummary(completedOperation),
          repair_context: null,
          safe_error_code: null,
          audit_receipt_ref: auditReceipt(connectionId, "external_read.lifecycle.repair.completed", occurredAt),
          updated_at: occurredAt,
        };
        await writeLifecyclePair(tx, currentConnection, currentOperation, {
          connection: nextConnection,
          operation: completedOperation,
          occurredAt,
          eventType: "external_read.lifecycle.repair.completed",
          payload: { target_state: targetState },
        });
        await enqueueLifecycleCompletion(
          tx,
          nextConnection,
          completedOperation,
          "external_read.connection.repaired",
          occurredAt,
          { target_state: targetState },
        );
        return { record: clone(nextConnection), operation: clone(completedOperation) };
      });
    },
    async get({ tenant_id, connection_id } = {}) {
      const tenantId = requiredText(tenant_id, "tenant_id");
      const current = await port.read({
        tenant_id: tenantId,
        record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
        record_id: requiredText(connection_id, "connection_id"),
      });
      return current ? normalizeStoredConnection(current.data) : null;
    },
    async readLatestSnapshot(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const current = await port.read({
        tenant_id: tenantId,
        record_type: EXTERNAL_READ_CONNECTION_RECORD_TYPE,
        record_id: connectionId,
      });
      const connection = current ? normalizeStoredConnection(current.data) : null;
      if (!connection
        || connection.legal_entity_id !== input.legal_entity_id
        || !connection.latest_sync?.snapshot_record_id) return null;
      const stored = await port.read({
        tenant_id: tenantId,
        record_type: EXTERNAL_READ_SNAPSHOT_RECORD_TYPE,
        record_id: connection.latest_sync.snapshot_record_id,
      });
      const snapshot = stored?.data;
      if (!snapshot
        || snapshot.tenant_id !== tenantId
        || snapshot.legal_entity_id !== input.legal_entity_id
        || snapshot.connection_id !== connectionId) return null;
      return Object.freeze({
        ...clone(snapshot),
        credential_material_included: false,
        raw_provider_payload_included: false,
      });
    },
    async readSnapshot(input = {}) {
      const tenantId = requiredText(input.tenant_id, "tenant_id");
      const connectionId = requiredText(input.connection_id, "connection_id");
      const capability = requiredText(input.capability, "capability");
      const stored = await port.read({
        tenant_id: tenantId,
        record_type: EXTERNAL_READ_SNAPSHOT_RECORD_TYPE,
        record_id: snapshotId(connectionId, capability),
      });
      const snapshot = stored?.data;
      if (!snapshot
        || snapshot.tenant_id !== tenantId
        || snapshot.legal_entity_id !== input.legal_entity_id
        || snapshot.connection_id !== connectionId
        || snapshot.capability !== capability) return null;
      return Object.freeze({
        ...clone(snapshot),
        credential_material_included: false,
        raw_provider_payload_included: false,
      });
    },
  });
}
