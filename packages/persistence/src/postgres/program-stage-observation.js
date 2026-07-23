import { createHash } from "node:crypto";
import {
  JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
  jsonPostgresProgramBindingsSha256,
  jsonPostgresProgramStageRequirements,
} from "./program-stage-gates.js";

export const JSON_POSTGRES_STAGE_PROBE_VERSION =
  "law-firm-os.json-postgres-stage-probe.v1";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const SENSITIVE_KEY =
  /(^|_)(?:password|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;

const PROBES = Object.freeze({
  "source-inventory-adjudication": Object.freeze({
    "source-inventory-adjudication": Object.freeze([
      "approved_source_roots_only", "every_candidate_dispositioned",
      "duplicate_candidates_resolved", "canonical_sources_selected",
      "manual_reviews_closed", "roster_gaps_closed", "email_collisions_closed",
      "matter_code_collisions_closed", "source_content_hashes_frozen",
      "source_mutation_prohibited",
    ]),
  }),
  "record-type-and-reference": Object.freeze({
    "record-type-and-reference": Object.freeze([
      "record_type_catalog_verified", "field_crosswalk_verified",
      "transform_digest_verified", "every_selected_source_mapped",
      "logical_reference_rules_verified", "unique_key_rules_verified",
      "identity_employee_linkage_verified", "all_product_domains_covered",
    ]),
  }),
  "w12-infrastructure": Object.freeze({
    "w12-infrastructure": Object.freeze([
      "isolated_target_verified", "private_rds_verified",
      "tls_verify_full_verified", "forced_rls_verified", "tenant_hmac_verified",
      "least_privilege_roles_verified", "backup_target_verified",
      "cleanup_disposition_verified", "production_resources_unchanged",
    ]),
  }),
  "w12-sink": Object.freeze({
    "w12-sink": Object.freeze([
      "non_delivery_sink_verified", "external_recipient_denied",
      "individual_reset_delivery_disabled", "sink_audit_verified",
    ]),
  }),
  "w12-migration": Object.freeze({
    "w12-migration": Object.freeze([
      "signed_inventory_only", "all_selected_rows_processed",
      "all_product_domains_imported", "identity_imported", "hrx_imported",
      "dms_metadata_imported", "canonical_hashes_matched",
      "state_versions_matched", "expected_rejections_matched",
      "checkpoint_persisted", "complete_readback_passed",
    ]),
  }),
  "w12-replay": Object.freeze({
    "w12-replay": Object.freeze([
      "replay_completed", "replay_noop_verified", "idempotency_rows_stable",
      "audit_rows_stable", "outbox_rows_stable", "canonical_hashes_stable",
    ]),
  }),
  "w12-tenant-rls": Object.freeze({
    "w12-tenant-rls": Object.freeze([
      "forced_rls_verified", "tenant_hmac_verified",
      "wrong_tenant_reads_denied", "wrong_tenant_writes_denied",
      "cross_tenant_transaction_denied",
    ]),
  }),
  "w12-failure-injection": Object.freeze({
    "w12-failure-injection": Object.freeze([
      "transaction_rollback_verified", "partial_commit_prevented",
      "checkpoint_resume_verified", "optimistic_conflict_verified",
      "outbox_atomicity_verified", "source_content_unchanged",
    ]),
  }),
  "w12-capacity": Object.freeze({
    "w12-capacity": Object.freeze([
      "records_per_tenant_measured", "batch_sizes_measured",
      "latency_percentiles_measured", "retry_conflict_rate_measured",
      "connection_pool_saturation_measured", "outbox_lag_measured",
      "production_limits_derived", "capacity_acceptance_passed",
    ]),
  }),
  "w12-dms": Object.freeze({
    "w12-dms": Object.freeze([
      "tenant_namespace_verified", "source_digest_verified",
      "provider_digest_readback_verified", "object_lock_verified",
      "retention_verified", "legal_hold_verified",
      "canonical_document_guard_verified", "delete_guard_verified",
    ]),
  }),
  "w12-reconciliation": Object.freeze({
    "w12-reconciliation": Object.freeze([
      "source_target_counts_matched", "canonical_hashes_matched",
      "state_versions_matched", "logical_references_matched",
      "identity_hrx_links_matched", "all_expected_rejections_explained",
      "cross_domain_reconciliation_passed",
    ]),
  }),
  "w12-restore": Object.freeze({
    "w12-restore": Object.freeze([
      "isolated_restore_target_verified", "postgres_restore_passed",
      "dms_reference_restore_passed", "object_lock_preserved",
      "legal_hold_preserved", "complete_reconciliation_passed",
      "rpo_measured", "rto_measured",
    ]),
  }),
  "w12-owner-sampling": Object.freeze({
    "w12-owner-sampling": Object.freeze([
      "owner_sample_set_frozen", "employee_samples_verified",
      "client_samples_verified", "matter_samples_verified",
      "document_samples_verified", "sample_variances_closed",
    ]),
  }),
  "w12-terminal": Object.freeze({
    "w12-terminal": Object.freeze([
      "all_component_receipts_verified", "inventory_adjudication_complete",
      "rehearsal_reconciliation_passed", "replay_noop_passed",
      "tenant_isolation_passed", "failure_injection_passed",
      "capacity_acceptance_passed", "dms_controls_passed",
      "isolated_restore_passed", "owner_sampling_passed",
      "production_unchanged", "external_delivery_absent",
    ]),
  }),
  "cut-008": Object.freeze({
    "exact-main-gates": Object.freeze([
      "exact_main_verified", "exact_head_ci_passed", "security_passed",
      "required_postgres_tests_executed",
    ]),
    "production-infrastructure": Object.freeze([
      "private_rds_verified", "multi_az_verified", "deletion_protection_verified",
      "encrypted_storage_verified", "pitr_verified", "tls_verify_full_verified",
      "least_privilege_roles_verified", "sensitive_reference_rotation_auditable",
      "lambda_vpc_verified", "production_role_separation_verified",
      "dms_public_access_blocked", "dms_sse_kms_verified", "dms_versioning_verified",
      "dms_object_lock_verified", "backup_target_verified", "readonly_auditor_verified",
      "protected_resource_unchanged",
    ]),
    "database-bootstrap": Object.freeze([
      "schema_migrations_verified", "forced_rls_verified", "tenant_hmac_verified",
      "identity_schema_verified", "audit_outbox_verified",
    ]),
    "dms-controls": Object.freeze([
      "dms_digest_readback_verified", "dms_legal_hold_verified",
      "dms_retention_verified",
    ]),
  }),
  "source-freeze": Object.freeze({
    "immutable-backup": Object.freeze([
      "immutable_source_backup_created", "off_device_backup_uploaded",
      "isolated_backup_restore_passed",
    ]),
    "source-freeze-control": Object.freeze([
      "operational_json_writers_frozen", "competing_imports_frozen",
      "base_delta_inventory_verified", "source_content_unchanged",
    ]),
    "final-dry-run": Object.freeze([
      "final_dry_run_passed", "w12_capacity_acceptance_matched",
    ]),
  }),
  "first-write-boundary": Object.freeze({
    "first-write-control": Object.freeze([
      "first_production_write_not_started", "pre_write_rollback_available",
      "post_write_runbook_verified", "json_writers_frozen",
    ]),
  }),
  "cut-009": Object.freeze({
    "migration-commit": Object.freeze([
      "first_production_write_recorded", "signed_inventory_only",
      "all_domains_imported", "hrx_imported", "dms_object_lock_imported",
      "postgres_authority_activated",
    ]),
    "identity-flow": Object.freeze([
      "identity_registered_email_preserved", "active_accounts_reset_required",
      "disabled_accounts_denied", "legacy_authenticator_material_absent",
      "individual_reset_only",
    ]),
    "migration-readback": Object.freeze([
      "complete_readback_passed", "logical_references_passed",
      "warm_start_passed", "cold_start_passed",
    ]),
    "migration-reconciliation": Object.freeze([
      "cross_domain_reconciliation_passed",
    ]),
  }),
  "cut-010": Object.freeze({
    "isolated-dr-restore": Object.freeze([
      "isolated_restore_target_verified", "postgres_restore_passed",
      "dms_reference_restore_passed", "object_lock_preserved",
      "legal_hold_preserved", "complete_reconciliation_passed",
      "missing_json_startup_passed", "representative_reads_passed",
      "rpo_measured", "rto_measured", "rpo_target_met", "rto_target_met",
      "readonly_auditor_verified",
    ]),
  }),
  "cut-011": Object.freeze({
    "json-retirement-smoke": Object.freeze([
      "operational_store_path_absent", "missing_json_warm_start_passed",
      "missing_json_cold_start_passed", "representative_write_passed",
      "representative_read_passed", "background_jobs_passed", "audit_passed",
      "outbox_passed", "legacy_json_immutable_only",
    ]),
  }),
  "cut-012": Object.freeze({
    "terminal-validation": Object.freeze([
      "real_data_reconciliation_passed", "tenant_rls_passed",
      "tenant_hmac_passed", "role_access_control_passed",
      "transaction_atomicity_passed", "audit_idempotency_outbox_passed",
      "individual_first_use_setup_passed", "disabled_account_denial_passed",
      "dms_controls_passed", "isolated_restore_passed",
      "missing_json_operation_passed", "critical_flows_passed",
      "all_component_receipts_verified",
    ]),
  }),
  "macos-signing": Object.freeze({
    "macos-signing": Object.freeze([
      "exact_main_package", "developer_id_signed", "notarization_passed",
      "stapling_passed", "signature_verified",
    ]),
  }),
  "windows-signing": Object.freeze({
    "windows-signing": Object.freeze([
      "exact_main_package", "authenticode_signed", "timestamp_verified",
      "signature_verified",
    ]),
  }),
  "formal-release": Object.freeze({
    "formal-release": Object.freeze([
      "exact_main_package", "deterministic_build_verified", "sbom_verified",
      "checksums_verified", "provenance_verified",
      "dependency_inventory_verified", "sensitive_material_scan_passed",
      "tag_created", "artifacts_published",
    ]),
  }),
  "go-live": Object.freeze({
    "go-live": Object.freeze([
      "signed_artifacts_deployed", "production_smoke_passed",
      "tenant_isolation_passed", "internal_email_auth_passed",
      "critical_domain_flows_passed", "dms_passed", "audit_outbox_passed",
      "backup_visible", "cut_012_verified", "traffic_activated",
      "event_based_acceptance_passed",
    ]),
  }),
  "w15-relational-projection": Object.freeze({
    "relational-projection": Object.freeze([
      "one_way_outbox_projection_verified", "selected_table_contract_verified",
      "shadow_count_hash_ordering_passed", "logical_reference_readback_passed",
      "projection_performance_accepted", "tenant_rls_passed",
      "transaction_rollback_passed", "append_only_conflict_guard_passed",
      "generic_ledger_authority_preserved", "projection_consumers_read_only",
      "authority_promotion_not_granted", "projection_receipt_set_verified",
    ]),
  }),
});

const GENERIC_COLLECTOR_STAGES = new Set([
  "source-inventory-adjudication",
  "record-type-and-reference",
  "w12-infrastructure",
  "w12-sink",
  "w12-migration",
  "w12-replay",
  "w12-tenant-rls",
  "w12-failure-injection",
  "w12-capacity",
  "w12-dms",
  "w12-reconciliation",
  "w12-restore",
  "w12-owner-sampling",
  "w12-terminal",
  "cut-008",
  "cut-009",
]);
const STAGE_COLLECTORS = Object.freeze(Object.fromEntries(
  Object.entries(PROBES).map(([stage, probeKinds]) => {
    const collector = GENERIC_COLLECTOR_STAGES.has(stage)
      ? "collect-json-postgres-program-stage-probe.mjs"
      : ["source-freeze", "first-write-boundary"].includes(stage)
        ? "run-json-postgres-production-controls.mjs"
        : stage === "cut-010"
          ? "run-json-postgres-dr-recovery.mjs"
          : stage === "cut-011"
            ? "run-json-postgres-json-retirement.mjs"
            : stage === "cut-012"
              ? "run-json-postgres-terminal-closeout.mjs"
              : ["macos-signing", "windows-signing", "formal-release", "go-live"]
                  .includes(stage)
                ? "collect-json-postgres-release-probe.mjs"
                : stage === "w15-relational-projection"
                  ? "collect-json-postgres-relational-projection-probe.mjs"
                  : null;
    if (!collector) fail(`program stage collector is missing for ${stage}`);
    return [
      stage,
      Object.freeze(Object.fromEntries(
        Object.keys(probeKinds).map((probeKind) => [probeKind, collector]),
      )),
    ];
  }),
));

const PROBE_KEYS = Object.freeze([
  "schema_version", "probe_id", "stage", "probe_kind", "collector_ref",
  "source_sha", "source_tree", "packet_sha256", "bindings_sha256",
  "started_at", "finished_at", "command", "exit_code", "outcome",
  "checks", "safe_counts", "evidence_sha256", "claims", "result_sha256",
]);
const CLAIM_KEYS = Object.freeze([
  "raw_value_returned", "pii_returned", "secret_material_returned",
  "document_bytes_returned",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length) fail(`${label} contains unsupported fields: ${extras.join(",")}`);
}

function validateCounts(counts, label) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    fail(`${label} safe_counts must be an object`);
  }
  for (const [key, value] of Object.entries(counts)) {
    if (!/^[a-z][a-z0-9_]{1,95}$/u.test(key)
      || SENSITIVE_KEY.test(key)
      || !Number.isSafeInteger(value)
      || value < 0) {
      fail(`${label} contains an invalid safe count`);
    }
  }
}

function probeMaterial(probe) {
  return Object.fromEntries(PROBE_KEYS
    .filter((key) => key !== "result_sha256")
    .map((key) => [key, probe[key]]));
}

export function createJsonPostgresStageProbe({
  probeId,
  stage,
  probeKind,
  collectorRef,
  sourceSha,
  sourceTree,
  packetSha256,
  bindingsSha256,
  startedAt,
  finishedAt,
  command,
  checks,
  safeCounts,
  evidenceSha256,
} = {}) {
  const probe = {
    schema_version: JSON_POSTGRES_STAGE_PROBE_VERSION,
    probe_id: probeId,
    stage,
    probe_kind: probeKind,
    collector_ref: collectorRef,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packetSha256,
    bindings_sha256: bindingsSha256,
    started_at: startedAt,
    finished_at: finishedAt,
    command,
    exit_code: 0,
    outcome: "PASS",
    checks: { ...checks },
    safe_counts: { ...safeCounts },
    evidence_sha256: evidenceSha256,
    claims: {
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      document_bytes_returned: false,
    },
  };
  probe.result_sha256 = sha256(probeMaterial(probe));
  validateJsonPostgresStageProbe(probe, {
    stage,
    sourceSha,
    sourceTree,
    packetSha256,
    bindingsSha256,
  });
  return Object.freeze(probe);
}

export function validateJsonPostgresStageProbe(probe, {
  stage,
  sourceSha,
  sourceTree,
  packetSha256,
  bindingsSha256,
} = {}) {
  closed(probe, PROBE_KEYS, "stage probe");
  const expectedKinds = PROBES[stage];
  const expectedChecks = expectedKinds?.[probe.probe_kind];
  const expectedCollector = STAGE_COLLECTORS[stage]?.[probe.probe_kind];
  if (probe.schema_version !== JSON_POSTGRES_STAGE_PROBE_VERSION
    || !TOKEN.test(probe.probe_id ?? "")
    || probe.collector_ref !== expectedCollector
    || probe.stage !== stage
    || !expectedChecks
    || probe.source_sha !== sourceSha
    || probe.source_tree !== sourceTree
    || probe.packet_sha256 !== packetSha256
    || probe.bindings_sha256 !== bindingsSha256
    || !SHA1.test(probe.source_sha ?? "")
    || !SHA1.test(probe.source_tree ?? "")
    || !SHA256.test(probe.packet_sha256 ?? "")
    || !SHA256.test(probe.bindings_sha256 ?? "")
    || !TIME.test(probe.started_at ?? "")
    || !TIME.test(probe.finished_at ?? "")
    || Date.parse(probe.finished_at) < Date.parse(probe.started_at)
    || typeof probe.command !== "string"
    || !probe.command.trim()
    || /(?:postgres(?:ql)?:\/\/[^\s@]+@|bearer\s+|--password\b)/iu.test(probe.command)
    || probe.exit_code !== 0
    || probe.outcome !== "PASS"
    || !SHA256.test(probe.evidence_sha256 ?? "")) {
    fail("stage probe binding or execution contract drifted");
  }
  closed(probe.checks, expectedChecks, "stage probe checks");
  if (JSON.stringify(Object.keys(probe.checks).sort())
    !== JSON.stringify([...expectedChecks].sort())
    || Object.values(probe.checks).some((value) => value !== true)) {
    fail("stage probe check set is incomplete or failed");
  }
  validateCounts(probe.safe_counts, "stage probe");
  closed(probe.claims, CLAIM_KEYS, "stage probe claims");
  if (CLAIM_KEYS.some((key) => probe.claims[key] !== false)) {
    fail("stage probe contains unsafe evidence claims");
  }
  if (probe.result_sha256 !== sha256(probeMaterial(probe))) {
    fail("stage probe result digest drifted");
  }
  return Object.freeze({
    valid: true,
    probe_id: probe.probe_id,
    probe_kind: probe.probe_kind,
    result_sha256: probe.result_sha256,
  });
}

export function deriveJsonPostgresProgramStageObservation({
  stage,
  packet,
  probes,
} = {}) {
  const expectedKinds = PROBES[stage];
  if (!expectedKinds || !Array.isArray(probes)) fail("stage probe set is invalid");
  const bindingsSha256 = jsonPostgresProgramBindingsSha256(packet);
  const byKind = new Map();
  const safeCounts = {};
  const costs = new Set();
  let startedAt = null;
  let finishedAt = null;
  for (const probe of probes) {
    validateJsonPostgresStageProbe(probe, {
      stage,
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      packetSha256: packet.packet_sha256,
      bindingsSha256,
    });
    if (byKind.has(probe.probe_kind)) fail("stage probe kind is duplicated");
    byKind.set(probe.probe_kind, probe);
    startedAt = !startedAt || Date.parse(probe.started_at) < Date.parse(startedAt)
      ? probe.started_at
      : startedAt;
    finishedAt = !finishedAt || Date.parse(probe.finished_at) > Date.parse(finishedAt)
      ? probe.finished_at
      : finishedAt;
    for (const [key, value] of Object.entries(probe.safe_counts)) {
      if (key === "monthly_cost_forecast_krw") {
        costs.add(value);
      } else if (Object.hasOwn(safeCounts, key)) {
        fail(`stage safe count ownership is duplicated: ${key}`);
      } else {
        safeCounts[key] = value;
      }
    }
  }
  const missingKinds = Object.keys(expectedKinds).filter((kind) => !byKind.has(kind));
  if (missingKinds.length || byKind.size !== Object.keys(expectedKinds).length) {
    fail(`stage probe set is incomplete: ${missingKinds.join(",")}`);
  }
  if (costs.size !== 1) fail("stage probes must agree on one monthly cost forecast");
  safeCounts.monthly_cost_forecast_krw = [...costs][0];
  const requirements = jsonPostgresProgramStageRequirements(stage);
  const checks = Object.fromEntries(
    Object.values(expectedKinds).flat().map((check) => [check, true]),
  );
  if (JSON.stringify(Object.keys(checks).sort())
    !== JSON.stringify([...requirements.checks].sort())) {
    fail("stage probe/check routing is incomplete");
  }
  const observed = Object.freeze({
    schema_version: JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
    stage,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: bindingsSha256,
    checks,
    safe_counts: Object.freeze(safeCounts),
  });
  return Object.freeze({
    observed,
    started_at: startedAt,
    finished_at: finishedAt,
    probe_result_sha256: Object.freeze(
      [...byKind.values()].map((probe) => probe.result_sha256),
    ),
  });
}

export function jsonPostgresStageProbeRequirements(stage) {
  const expected = PROBES[stage];
  if (!expected) fail("program stage is invalid");
  return Object.freeze(structuredClone(expected));
}

export function jsonPostgresStageProbeCollectorRef(stage, probeKind) {
  const collector = STAGE_COLLECTORS[stage]?.[probeKind];
  if (!collector) fail("program stage probe collector route is invalid");
  return collector;
}
