import { createHash } from "node:crypto";
import { DOMAIN_IDS, hashDomainValue } from "../domain-ledger.js";
import {
  JSON_POSTGRES_MIGRATION_SCHEMA_VERSION,
  runJsonPostgresMigration,
} from "./json-postgres-migration.js";
import { createPostgresDomainLedger } from "./domain-ledger.js";

const ORDERED_DOMAINS = Object.freeze([
  "hrx",
  "master-data",
  "crm",
  "intake",
  "matter",
  "dms",
  "dms-auxiliary",
  "finance",
  "client-portal",
  "ai-governance",
  "analytics",
  "ui-readiness",
  "enterprise-readiness",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function recordType(domainId) {
  return `SyntheticCut005${domainId.replaceAll(/[^a-z0-9]/gu, "_")}Record`;
}

function legacySchemaPayload(domainId, runRef) {
  const suffix = runRef.slice(0, 12);
  const clientId = `synthetic-client-${suffix}`;
  const matterId = `synthetic-matter-${suffix}`;
  const employeeId = `synthetic-employee-${suffix}`;
  const userId = `synthetic-user-${suffix}`;
  const documentId = `synthetic-document-${suffix}`;
  const byDomain = {
    hrx: {
      employee_id: employeeId,
      user_id: userId,
      employment_profile: { title: "Synthetic Attorney", status: "active", start_date: "2026-07-20" },
      professional_profile: {
        experience: ["Synthetic prior role", "Synthetic current role"],
        education: ["Synthetic law school"],
        qualifications: ["Synthetic bar qualification"],
        practice_areas: ["Synthetic client advisory"],
      },
    },
    "master-data": {
      party_id: `synthetic-party-${suffix}`,
      person_id: `synthetic-person-${suffix}`,
      organization_id: `synthetic-organization-${suffix}`,
      entity_id: `synthetic-entity-${suffix}`,
      client_id: clientId,
      client_group_id: `synthetic-group-${suffix}`,
      billing_profile: { currency: "KRW", synthetic_only: true },
    },
    crm: {
      opportunity_id: `synthetic-opportunity-${suffix}`,
      client_id: clientId,
      stage: "synthetic-qualified",
    },
    intake: {
      intake_id: `synthetic-intake-${suffix}`,
      client_id: clientId,
      conflict_check_status: "synthetic-clear",
      clearance_status: "synthetic-approved",
    },
    matter: {
      matter_id: matterId,
      client_id: clientId,
      matter_code: `SYN-${runRef.slice(0, 8)}`,
      members: [{ employee_id: employeeId, user_id: userId, role: "synthetic-owner" }],
      assignments: [{ assignment_id: `synthetic-assignment-${suffix}`, employee_id: employeeId }],
      tasks: [{ task_id: `synthetic-task-${suffix}`, status: "open" }],
      status_history: [{ status: "open", effective_at: "2026-07-20T00:00:00.000Z" }],
    },
    dms: {
      document_id: documentId,
      object_id: `synthetic-object-${suffix}`,
      version_id: `synthetic-version-${suffix}`,
      matter_id: matterId,
      digest_sha256: hashDomainValue({ documentId, runRef }),
      legal_hold_status: "none",
      retention_class: "synthetic-test",
    },
    "dms-auxiliary": {
      document_id: documentId,
      matter_id: matterId,
      source_link_count: 1,
    },
    finance: {
      matter_id: matterId,
      time_entry_id: `synthetic-time-${suffix}`,
      expense_id: `synthetic-expense-${suffix}`,
      billing_status: "synthetic-draft",
    },
    "client-portal": {
      matter_id: matterId,
      document_id: documentId,
      projection_status: "synthetic-visible",
    },
    "ai-governance": { matter_id: matterId, policy_state: "synthetic-review-required" },
    analytics: { matter_id: matterId, projection_state: "derived-recompute" },
    "ui-readiness": { matter_id: matterId, workflow_state: "synthetic-ready" },
    "enterprise-readiness": { matter_id: matterId, readiness_state: "synthetic-only" },
  };
  return byDomain[domainId] ?? {};
}

function createSyntheticCorpus({ tenantId, runId }) {
  const runRef = createHash("sha256").update(runId).digest("hex");
  const domains = ORDERED_DOMAINS.map((domainId, index) => {
    const previous = ORDERED_DOMAINS[index - 1] ?? null;
    return {
      domain_id: domainId,
      records: [{
        record_type: recordType(domainId),
        record_id: `synthetic-${domainId}-${runId}`,
        state_version: 1,
        unique_key: `synthetic-cut005:${runId}`,
        payload: {
          model_type: recordType(domainId),
          synthetic_only: true,
          environment: "lawos-staging",
          domain_id: domainId,
          run_ref: runRef,
          phase: "final_delta",
          ...legacySchemaPayload(domainId, runRef),
        },
        references: previous ? [{
          reference_name: "previous_foundation",
          target_domain_id: previous,
          target_record_type: recordType(previous),
          target_record_id: `synthetic-${previous}-${runId}`,
        }] : [],
      }],
      idempotency_entries: [{
        key: `synthetic-cut005:${runId}`,
        request_hash: hashDomainValue({ domainId, runId, operation: "synthetic-cut005-final-delta" }),
        response: { accepted: true, synthetic_only: true },
      }],
      audit_events: [{
        event_id: `synthetic-cut005:${runId}`,
        event_type: "runtime_safety.synthetic_cut005_final_delta",
        actor_id: "lawos-private-staging-cut005",
        object_type: recordType(domainId),
        object_id: `synthetic-${domainId}-${runId}`,
        payload: { synthetic_only: true, phase: "final_delta" },
      }],
    };
  });
  domains.find((domain) => domain.domain_id === "matter").records.push({
    record_type: "SyntheticExpectedRejection",
    record_id: `synthetic-rejected-${runId}`,
    payload: { api_key: "synthetic-forbidden-field" },
  });
  domains.find((domain) => domain.domain_id === "matter").records.push(
    {
      tenant_id: "tenant_lawos_staging_unapproved",
      record_type: "SyntheticWrongTenantRejection",
      record_id: `synthetic-wrong-tenant-${runId}`,
      payload: { synthetic_only: true },
    },
    {
      record_type: "SyntheticInvalidVersionRejection",
      record_id: `synthetic-invalid-version-${runId}`,
      state_version: -1,
      payload: { synthetic_only: true },
    },
    {
      record_type: recordType("matter"),
      record_id: `synthetic-matter-${runId}`,
      payload: { synthetic_only: true, duplicate_candidate: true },
    },
    {
      record_type: "SyntheticMalformedRejection",
      payload: { synthetic_only: true },
    },
    {
      record_type: "SyntheticMissingReferenceRejection",
      record_id: `synthetic-missing-reference-${runId}`,
      payload: { synthetic_only: true },
      references: [{
        reference_name: "missing_client",
        target_domain_id: "master-data",
        target_record_type: "SyntheticMissingClient",
        target_record_id: `synthetic-missing-client-${runId}`,
      }],
    },
  );
  return Object.freeze({
    schema_version: JSON_POSTGRES_MIGRATION_SCHEMA_VERSION,
    data_scope: "synthetic-only",
    tenant_id: tenantId,
    accounts: Object.freeze([{
      user_id: `synthetic-cut005-user-${runRef.slice(0, 12)}`,
      email: `cut005-${runRef.slice(0, 12)}@example.test`,
      status: "active",
      profile: {
        display_name: "Synthetic CUT-005 User",
        source_title: "Synthetic Staff",
        source_ref: `synthetic-cut005:${runRef}`,
      },
      membership: {
        tenant_id: tenantId,
        status: "active",
        role_profile_id: "lawos_synthetic_staff",
        role_ids: ["lawos_staff"],
        group_ids: ["group_synthetic_cut005"],
        scopes: ["matter.read", "vault.read"],
        hrx_scopes: ["hrx.self.read"],
        source_ref: `synthetic-cut005:${runRef}`,
      },
    }, {
      user_id: `synthetic-cut005-wrong-tenant-${runRef.slice(0, 12)}`,
      email: `cut005-wrong-tenant-${runRef.slice(0, 12)}@example.test`,
      status: "active",
      membership: {
        tenant_id: "tenant_lawos_staging_unapproved",
        role_ids: ["lawos_staff"],
      },
    }]),
    domains: Object.freeze(domains),
  });
}

async function verifyTransactionalRollback({ pool, tenantId, runId }) {
  const ledger = createPostgresDomainLedger({ pool });
  const domainId = "ui-readiness";
  const type = "SyntheticCut005RollbackProbe";
  const recordId = `synthetic-rollback-${runId}`;
  const eventId = `synthetic-rollback-${runId}`;
  const expected = new Error("synthetic CUT-005 rollback probe");
  try {
    await ledger.transaction({ tenant_id: tenantId, domain_id: domainId }, async (tx) => {
      await tx.write({
        expected_version: 0,
        record_type: type,
        record_id: recordId,
        payload: { synthetic_only: true, rollback_probe: true },
      });
      await tx.claimIdempotency({
        key: eventId,
        request_hash: hashDomainValue({ eventId, operation: "rollback-probe" }),
        response: { synthetic_only: true },
      });
      await tx.appendAudit({
        event_id: eventId,
        event_type: "runtime_safety.synthetic_cut005_rollback_probe",
        object_type: type,
        object_id: recordId,
        payload: { synthetic_only: true },
      });
      await tx.enqueueOutbox({
        event_id: eventId,
        topic: "lawos.ui-readiness.synthetic-cut005.rollback-probe",
        aggregate_type: type,
        aggregate_id: recordId,
        payload: { synthetic_only: true },
      });
      throw expected;
    });
    throw new Error("CUT-005 rollback probe did not interrupt the transaction");
  } catch (error) {
    if (error !== expected) throw error;
  }
  const [record, idempotency, audit, outbox] = await Promise.all([
    ledger.read({ tenant_id: tenantId, domain_id: domainId, record_type: type, record_id: recordId }),
    ledger.listIdempotency({ tenant_id: tenantId, domain_id: domainId }),
    ledger.listAudit({ tenant_id: tenantId, domain_id: domainId, object_id: recordId }),
    ledger.listOutbox({ tenant_id: tenantId, domain_id: domainId }),
  ]);
  const visibleCount = Number(Boolean(record))
    + idempotency.filter((item) => item.key === eventId).length
    + audit.filter((item) => item.event_id === eventId).length
    + outbox.filter((item) => item.event_id === eventId).length;
  if (visibleCount !== 0) throw new Error("CUT-005 rollback probe left PostgreSQL residue");
  return Object.freeze({ interrupted: true, residual_item_count: 0 });
}

async function verifyResumeEquivalence({ pool, tenantId, negativeTenantId, runId }) {
  const corpus = createSyntheticCorpus({ tenantId, runId: `${runId}-resume` });
  const dryRun = await runJsonPostgresMigration({ corpus, mode: "dry-run" });
  const prior = await runJsonPostgresMigration({ pool, corpus, mode: "readback", negativeTenantId });
  let checkpoint = null;
  const expected = new Error("synthetic CUT-005 resume interruption");
  try {
    await runJsonPostgresMigration({
      pool,
      corpus,
      mode: "import",
      negativeTenantId,
      onCheckpoint: async (current) => {
        checkpoint = current;
        if (current.completed_steps.includes("domain:crm")) throw expected;
      },
    });
    throw new Error("CUT-005 resume probe did not interrupt the migration");
  } catch (error) {
    if (error !== expected) throw error;
  }
  if (!checkpoint?.completed_steps.includes("domain:crm")) throw new Error("CUT-005 resume checkpoint was not durable");
  const resumed = await runJsonPostgresMigration({
    pool,
    corpus,
    mode: "resume",
    checkpoint,
    negativeTenantId,
  });
  const replay = await runJsonPostgresMigration({ pool, corpus, mode: "import", negativeTenantId });
  if (
    resumed.outcome !== "PASS"
    || resumed.invariant_hash !== dryRun.invariant_hash
    || replay.invariant_hash !== dryRun.invariant_hash
    || replay.domains.some((domain) => domain.initial_import_applied)
  ) throw new Error("CUT-005 resume result differs from uninterrupted deterministic result");
  return Object.freeze({
    interrupted: true,
    checkpoint_step_count: checkpoint.completed_steps.length,
    completed_step_count: resumed.checkpoint.completed_steps.length,
    expected_step_count: DOMAIN_IDS.length + 1,
    prior_complete: prior.outcome === "PASS",
    resume_equal: true,
    immediate_replay_noop: true,
    invariant_hash: resumed.invariant_hash,
  });
}

export async function runPrivateStagingCut005({ pool, tenantIds, runId } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const tenants = [...new Set((tenantIds ?? []).map((value) => requiredText(value, "tenant id")))].sort();
  if (tenants.length < 2 || tenants.some((tenantId) => !/^tenant_lawos_staging_[a-z0-9_-]+$/u.test(tenantId))) {
    throw new TypeError("CUT-005 requires at least two approved synthetic LawOS staging tenants");
  }
  const id = requiredText(runId, "runId");
  if (!/^[a-z0-9-]{8,80}$/u.test(id)) throw new TypeError("runId is invalid");
  const rollback = await verifyTransactionalRollback({ pool, tenantId: tenants[1], runId: id });
  const resume = await verifyResumeEquivalence({
    pool,
    tenantId: tenants[1],
    negativeTenantId: tenants[0],
    runId: id,
  });
  const migration = await runJsonPostgresMigration({
    pool,
    corpus: createSyntheticCorpus({ tenantId: tenants[0], runId: id }),
    mode: "import",
    negativeTenantId: tenants[1],
  });
  if (migration.outcome !== "PASS" || migration.domains.length !== DOMAIN_IDS.length) throw new Error("CUT-005 migration invariant failed");
  const domains = migration.domains;
  const acceptedCount = domains.reduce((total, domain) => total + domain.accepted_count, 0);
  const expectedRejectedReasons = {
    DUPLICATE_RECORD_ID: 1,
    FORBIDDEN_SECRET_OR_RAW_BYTES: 1,
    INVALID_STATE_VERSION: 1,
    MISSING_REFERENCE_TARGET: 1,
    REQUIRED_FIELD_MISSING: 1,
    TENANT_SCOPE_MISMATCH: 2,
  };
  if (
    migration.safe_counts.source_record_count !== acceptedCount + migration.safe_counts.rejected_record_count
    || migration.directory.source_count !== migration.directory.accepted_count + migration.directory.rejected_count
    || JSON.stringify(migration.rejected_reason_counts) !== JSON.stringify(expectedRejectedReasons)
  ) throw new Error("CUT-005 rejected-row accounting invariant failed");
  return Object.freeze({
    outcome: "PASS",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    domain_count: domains.length,
    source_record_count: migration.safe_counts.source_record_count,
    accepted_record_count: acceptedCount,
    initial_import_applied_count: domains.filter((domain) => domain.initial_import_applied).length,
    immediate_replay_noop_count: domains.filter((domain) => domain.replayed_noop_count === domain.accepted_count).length,
    shadow_equal_count: domains.filter((domain) => domain.readback_equal).length,
    shadow_difference_count: domains.filter((domain) => !domain.readback_equal).length,
    state_version_one_count: domains.filter((domain) => domain.state_version_distribution["1"] === domain.accepted_count).length,
    tenant_negative_visible_count: migration.safe_counts.tenant_negative_visible_count,
    rejected_row_count: migration.safe_counts.rejected_item_count,
    rejected_reason_counts: migration.rejected_reason_counts,
    unexpected_rejection_count: 0,
    transactional_rollback: rollback,
    resume_equivalence: resume,
    directory_result: migration.directory,
    domain_results: domains,
    source_manifest_sha256: migration.source_manifest_sha256,
    safe_hash_summary_sha256: migration.invariant_hash,
    json_fallback_count: migration.json_fallback_count,
    json_writer_count: migration.json_writer_count,
    dual_write_count: migration.dual_write_count,
    real_data_count: 0,
    raw_value_returned: false,
    secret_material_returned: false,
    production_contacted: false,
  });
}
