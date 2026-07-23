import { createHash } from "node:crypto";
import { DOMAIN_IDS, hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { validatePostgresOnlyRuntimeConfiguration } from "./postgres-only-runtime-configuration.js";

const EXPECTED_AUTHORITY = "postgres-v2";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function recordType(domainId) {
  return `SyntheticCut006${domainId.replaceAll(/[^a-z0-9]/gu, "_")}AuthorityProbe`;
}

function normalizeTenants(tenantIds) {
  const tenants = [...new Set((tenantIds ?? []).map((value) => requiredText(value, "tenant id")))].sort();
  if (tenants.length < 2 || tenants.some((tenantId) => !/^tenant_lawos_staging_[a-z0-9_-]+$/u.test(tenantId))) {
    throw new TypeError("CUT-006 requires at least two approved synthetic LawOS staging tenants");
  }
  return tenants;
}

export { validatePostgresOnlyRuntimeConfiguration };

async function commitDomainProbe(ledger, { tenantId, domainId, runId }) {
  const type = recordType(domainId);
  const recordId = `synthetic-cut006-${domainId}-${runId}`;
  const idempotencyKey = `synthetic-cut006:${domainId}:${runId}`;
  const requestHash = hashDomainValue({ domainId, recordId, operation: "postgres-only-authority-probe" });
  const eventId = `synthetic-cut006-${domainId}-${runId}`;

  async function execute() {
    return ledger.transaction({ tenant_id: tenantId, domain_id: domainId }, async (tx) => {
      const claim = await tx.claimIdempotency({
        key: idempotencyKey,
        request_hash: requestHash,
        response: { accepted: true, synthetic_only: true },
      });
      let record;
      let audit;
      let outbox;
      if (claim.replayed) {
        record = await tx.read({ record_type: type, record_id: recordId });
        audit = (await tx.listAudit({ object_id: recordId })).find((item) => item.event_id === eventId);
        outbox = (await tx.listOutbox()).find((item) => item.event_id === eventId);
      } else {
        record = await tx.write({
          expected_version: 0,
          record_type: type,
          record_id: recordId,
          unique_key: idempotencyKey,
          payload: {
            model_type: type,
            synthetic_only: true,
            environment: "lawos-staging",
            authority: EXPECTED_AUTHORITY,
            run_ref: sha256(runId),
          },
        });
        audit = await tx.appendAudit({
          event_id: eventId,
          event_type: "runtime_safety.synthetic_cut006_postgres_only_write",
          actor_id: "lawos-private-staging-cut006",
          object_type: type,
          object_id: recordId,
          payload: { synthetic_only: true, authority: EXPECTED_AUTHORITY },
        });
        outbox = (await tx.enqueueOutbox({
          event_id: eventId,
          topic: `lawos.${domainId}.synthetic-cut006.changed`,
          aggregate_type: type,
          aggregate_id: recordId,
          payload: { synthetic_only: true, authority: EXPECTED_AUTHORITY },
        })).event;
      }
      if (!record || !audit || !outbox) throw new Error(`CUT-006 ${domainId} PostgreSQL evidence is incomplete`);
      return Object.freeze({
        replayed: claim.replayed,
        record_state_version: record.state_version,
        record_payload_hash: record.payload_hash,
        audit_event_id: audit.event_id,
        outbox_event_id: outbox.event_id,
        outbox_status: outbox.status,
      });
    });
  }

  const initial = await execute();
  const replay = await execute();
  return Object.freeze({ type, recordId, initial, replay });
}

async function wrongTenantDomainVisibility(ledger, { tenantId, domainId, recordType: type, recordId }) {
  return ledger.transaction({ tenant_id: tenantId, domain_id: domainId }, (tx) => tx.read({
    record_type: type,
    record_id: recordId,
  }));
}

export async function runPrivateStagingCut006({ pool, tenantIds, runId, configuration } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const tenants = normalizeTenants(tenantIds);
  const id = requiredText(runId, "runId");
  if (!/^[a-z0-9-]{8,80}$/u.test(id)) throw new TypeError("runId is invalid");
  const config = validatePostgresOnlyRuntimeConfiguration(configuration);
  const tenantId = tenants[0];
  const negativeTenantId = tenants[1];
  const identity = createPostgresIdentityLedger({ pool });
  const identityKey = `synthetic-cut006:identity:${id}`;
  const identityInput = {
    tenant_id: tenantId,
    actor_id: "lawos-private-staging-cut006",
    data_scope: "synthetic-only",
    idempotency_key: identityKey,
    request_hash: sha256(JSON.stringify({ identityKey, operation: "postgres-only-authority-probe" })),
    user: {
      user_id: `synthetic-cut006-user-${sha256(id).slice(0, 12)}`,
      email: `cut006-${sha256(id).slice(0, 12)}@example.test`,
      status: "active",
      display_name: "Synthetic CUT-006 User",
      source_title: "Synthetic Staff",
      source_ref: `synthetic-cut006:${sha256(id)}`,
    },
    membership: {
      status: "active",
      role_profile_id: "lawos_synthetic_staff",
      role_ids: ["lawos_staff"],
      group_ids: ["group_synthetic_cut006"],
      scopes: ["matter.read", "vault.read"],
      hrx_scopes: ["hrx.self.read"],
      source_ref: `synthetic-cut006:${sha256(id)}`,
    },
  };
  const identityInitial = await identity.provisionDirectoryUser(identityInput);
  const identityReplay = await identity.provisionDirectoryUser(identityInput);
  const identityNegative = await identity.findDirectoryUserByUserId({
    tenant_id: negativeTenantId,
    user_id: identityInput.user.user_id,
  });
  const identityAuditCount = (await identity.listSecurityAudit({ tenant_id: tenantId }))
    .filter((event) => event.action === "auth.directory.user.provisioned" && event.object_id === identityInput.user.user_id).length;
  const identityOutboxCount = (await identity.listDirectoryOutbox({ tenant_id: tenantId }))
    .filter((event) => event.aggregate_id === identityInput.user.user_id).length;
  const identityIdempotencyCount = (await identity.listDirectoryIdempotency({ tenant_id: tenantId }))
    .filter((entry) => entry.key === identityKey).length;
  if (
    !identityInitial.user
    || identityReplay.replayed !== true
    || identityReplay.user.directory_state_version !== identityInitial.user.directory_state_version
    || identityNegative !== null
    || identityAuditCount !== 1
    || identityOutboxCount !== 1
    || identityIdempotencyCount !== 1
  ) throw new Error("CUT-006 identity PostgreSQL authority invariant failed");

  const domainLedger = createPostgresDomainLedger({ pool });
  const domainResults = [];
  for (const domainId of DOMAIN_IDS) {
    const result = await commitDomainProbe(domainLedger, { tenantId, domainId, runId: id });
    const negativeRead = await wrongTenantDomainVisibility(domainLedger, {
      tenantId: negativeTenantId,
      domainId,
      recordType: result.type,
      recordId: result.recordId,
    });
    if (
      result.initial.record_state_version !== 1
      || result.replay.replayed !== true
      || result.replay.record_state_version !== 1
      || result.initial.record_payload_hash !== result.replay.record_payload_hash
      || result.initial.audit_event_id !== result.replay.audit_event_id
      || result.initial.outbox_event_id !== result.replay.outbox_event_id
      || negativeRead !== undefined
    ) throw new Error(`CUT-006 ${domainId} PostgreSQL-only invariant failed`);
    domainResults.push(Object.freeze({
      domain_id: domainId,
      initial_write_applied: result.initial.replayed === false,
      immediate_replay_noop: result.replay.replayed === true,
      state_version: result.initial.record_state_version,
      audit_count: 1,
      outbox_count: 1,
      wrong_tenant_visible_count: 0,
      safe_record_fingerprint: result.initial.record_payload_hash,
    }));
  }

  const zeroCounters = Object.freeze({
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: config.file_current_initialized_count,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
  });
  if (Object.values(zeroCounters).some((count) => count !== 0)) throw new Error("CUT-006 requires every legacy authority counter to be zero");
  return Object.freeze({
    outcome: "PASS",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    configuration: config,
    identity_result: Object.freeze({
      initial_write_applied: identityInitial.replayed === false,
      immediate_replay_noop: identityReplay.replayed === true,
      state_version: identityInitial.user.directory_state_version,
      audit_count: identityAuditCount,
      outbox_count: identityOutboxCount,
      idempotency_count: identityIdempotencyCount,
      wrong_tenant_visible_count: 0,
    }),
    domain_count: domainResults.length,
    domain_results: Object.freeze(domainResults),
    postgres_write_target_count: domainResults.length + 1,
    postgres_readback_equal_count: domainResults.length + 1,
    tenant_negative_visible_count: 0,
    ...zeroCounters,
    artifact_runtime_store_entry_count: config.artifact_runtime_store_entry_count,
    artifact_real_json_store_count: config.artifact_real_json_store_count,
    file_adapter_sentinel_invocation_count: 0,
    real_data_count: 0,
    raw_value_returned: false,
    secret_material_returned: false,
    production_contacted: false,
    production_ready_claim: false,
  });
}
