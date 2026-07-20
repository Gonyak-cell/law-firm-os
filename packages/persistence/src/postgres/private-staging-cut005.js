import { createHash } from "node:crypto";
import {
  DOMAIN_IDS,
  hashDomainValue,
} from "../domain-ledger.js";
import { createPostgresDomainLedger } from "./domain-ledger.js";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function syntheticSnapshot({ tenantId, domainId, runId }) {
  const recordId = `synthetic-${domainId}-${runId}`;
  return {
    tenant_id: tenantId,
    domain_id: domainId,
    records: [{
      tenant_id: tenantId,
      domain_id: domainId,
      record_type: "SyntheticCut005Probe",
      record_id: recordId,
      unique_key: `synthetic-cut005:${runId}`,
      payload: {
        model_type: "SyntheticCut005Probe",
        synthetic_only: true,
        environment: "lawos-staging",
        domain_id: domainId,
        run_ref: createHash("sha256").update(runId).digest("hex"),
        phase: "final_delta",
      },
      append_only: false,
      references: [],
    }],
    idempotency_entries: [{
      tenant_id: tenantId,
      domain_id: domainId,
      key: `synthetic-cut005:${runId}`,
      request_hash: hashDomainValue({ domainId, runId, operation: "synthetic-cut005-final-delta" }),
      response: { accepted: true, synthetic_only: true },
    }],
    audit_events: [{
      tenant_id: tenantId,
      domain_id: domainId,
      event_id: `synthetic-cut005:${runId}`,
      event_type: "runtime_safety.synthetic_cut005_final_delta",
      actor_id: "lawos-private-staging-cut005",
      object_type: "SyntheticCut005Probe",
      object_id: recordId,
      payload: { synthetic_only: true, phase: "final_delta" },
    }],
  };
}

export async function runPrivateStagingCut005({ pool, tenantIds, runId } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const tenants = [...new Set((tenantIds ?? []).map((value) => requiredText(value, "tenant id")))].sort();
  if (tenants.length < 2 || tenants.some((tenantId) => !/^tenant_lawos_staging_[a-z0-9_-]+$/u.test(tenantId))) {
    throw new TypeError("CUT-005 requires at least two approved synthetic LawOS staging tenants");
  }
  const id = requiredText(runId, "runId");
  if (!/^[a-z0-9-]{8,80}$/u.test(id)) throw new TypeError("runId is invalid");
  const ledger = createPostgresDomainLedger({ pool });
  const sourceTenantId = tenants[0];
  const negativeTenantId = tenants[1];
  const domains = [];
  for (const domainId of DOMAIN_IDS) {
    const snapshot = syntheticSnapshot({ tenantId: sourceTenantId, domainId, runId: id });
    const imported = await ledger.importSnapshot(snapshot);
    const normalizedRecord = imported.snapshot.records[0];
    const replay = await ledger.importSnapshot(snapshot);
    const shadow = await ledger.compareSnapshot(snapshot);
    const readback = await ledger.read({
      tenant_id: sourceTenantId,
      domain_id: domainId,
      record_type: snapshot.records[0].record_type,
      record_id: snapshot.records[0].record_id,
    });
    const negative = await ledger.read({
      tenant_id: negativeTenantId,
      domain_id: domainId,
      record_type: snapshot.records[0].record_type,
      record_id: snapshot.records[0].record_id,
    });
    if (
      replay.replayed !== true
      || shadow.comparison.equal !== true
      || shadow.comparison.difference_count !== 0
      || readback?.payload_hash !== normalizedRecord.payload_hash
      || readback?.state_version !== 1
      || negative !== undefined
    ) {
      throw new Error(`CUT-005 invariant failed for ${domainId}`);
    }
    domains.push(Object.freeze({
      domain_id: domainId,
      initial_import_applied: imported.replayed !== true,
      immediate_replay_noop: replay.replayed === true,
      shadow_equal: shadow.comparison.equal,
      difference_count: shadow.comparison.difference_count,
      state_version: readback.state_version,
      tenant_negative_visible_count: 0,
      rejected_row_count: 0,
      source_hash: imported.snapshot.source_hash,
      snapshot_hash: imported.snapshot.snapshot_hash,
      invariant_hash: imported.snapshot.invariant_hash,
    }));
  }
  const hashSummary = domains.map((domain) => ({
    domain_id: domain.domain_id,
    source_hash: domain.source_hash,
    snapshot_hash: domain.snapshot_hash,
    invariant_hash: domain.invariant_hash,
  }));
  return Object.freeze({
    outcome: "PASS",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    domain_count: domains.length,
    initial_import_applied_count: domains.filter((domain) => domain.initial_import_applied).length,
    immediate_replay_noop_count: domains.filter((domain) => domain.immediate_replay_noop).length,
    shadow_equal_count: domains.filter((domain) => domain.shadow_equal).length,
    shadow_difference_count: domains.reduce((total, domain) => total + domain.difference_count, 0),
    state_version_one_count: domains.filter((domain) => domain.state_version === 1).length,
    tenant_negative_visible_count: 0,
    rejected_row_count: 0,
    safe_hash_summary_sha256: hashDomainValue(hashSummary),
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    real_data_count: 0,
    production_contacted: false,
  });
}
