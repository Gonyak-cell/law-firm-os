import { createHash } from "node:crypto";

export const JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION = "law-firm-os.json-postgres-program-stage-result.v1";
export const JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES = Object.freeze([
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
  "source-freeze",
  "first-write-boundary",
  "cut-009",
  "cut-010",
  "cut-011",
  "cut-012",
  "macos-signing",
  "windows-signing",
  "formal-release",
  "go-live",
  "w15-relational-projection",
]);

const STAGES = new Set(JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES);
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const FORBIDDEN_KEY = /(^|_)(?:password|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const ZERO_AUTHORITY_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);
const RULES = Object.freeze({
  "source-inventory-adjudication": Object.freeze({
    predecessors: [],
    checks: [
      "approved_source_roots_only", "every_candidate_dispositioned",
      "duplicate_candidates_resolved", "canonical_sources_selected",
      "manual_reviews_closed", "roster_gaps_closed", "email_collisions_closed",
      "matter_code_collisions_closed", "source_content_hashes_frozen",
      "source_mutation_prohibited",
    ],
    zeroCounts: [
      "unresolved_candidate_count", "manual_review_pending_count",
      "roster_gap_count", "duplicate_email_count", "duplicate_matter_code_count",
      "unexpected_source_count", "source_mutation_count",
    ],
  }),
  "record-type-and-reference": Object.freeze({
    predecessors: ["source-inventory-adjudication"],
    checks: [
      "record_type_catalog_verified", "field_crosswalk_verified",
      "transform_digest_verified", "every_selected_source_mapped",
      "logical_reference_rules_verified", "unique_key_rules_verified",
      "identity_employee_linkage_verified", "all_product_domains_covered",
    ],
    zeroCounts: [
      "unapproved_record_type_count", "unmapped_field_count",
      "missing_logical_reference_count", "field_type_drift_count",
      "reference_rule_drift_count", "unique_key_drift_count",
      "employee_without_link_count", "link_without_employee_count",
      "link_without_account_count",
    ],
  }),
  "w12-infrastructure": Object.freeze({
    predecessors: ["source-inventory-adjudication"],
    checks: [
      "isolated_target_verified", "private_rds_verified", "tls_verify_full_verified",
      "forced_rls_verified", "tenant_hmac_verified", "least_privilege_roles_verified",
      "backup_target_verified", "cleanup_disposition_verified",
      "production_resources_unchanged",
    ],
    zeroCounts: [
      "public_resource_count", "excess_iam_allow_count",
      "production_resource_mutation_count", "temporary_eni_allow_count",
    ],
  }),
  "w12-sink": Object.freeze({
    predecessors: ["w12-infrastructure"],
    checks: [
      "non_delivery_sink_verified", "external_recipient_denied",
      "individual_reset_delivery_disabled", "sink_audit_verified",
    ],
    zeroCounts: ["external_email_send_count", "real_recipient_count"],
  }),
  "w12-migration": Object.freeze({
    predecessors: [
      "source-inventory-adjudication", "record-type-and-reference",
      "w12-infrastructure", "w12-sink",
    ],
    checks: [
      "signed_inventory_only", "all_selected_rows_processed",
      "all_product_domains_imported", "identity_imported", "hrx_imported",
      "dms_metadata_imported", "canonical_hashes_matched",
      "state_versions_matched", "expected_rejections_matched",
      "checkpoint_persisted", "complete_readback_passed",
    ],
    zeroCounts: [
      ...ZERO_AUTHORITY_COUNTERS, "unexpected_rejection_count",
      "unexplained_variance_count", "tenant_negative_visible_count",
      "production_write_count", "external_email_send_count",
    ],
  }),
  "w12-replay": Object.freeze({
    predecessors: ["w12-migration"],
    checks: [
      "replay_completed", "replay_noop_verified", "idempotency_rows_stable",
      "audit_rows_stable", "outbox_rows_stable", "canonical_hashes_stable",
    ],
    zeroCounts: [
      "replay_new_record_count", "replay_new_audit_count",
      "replay_new_outbox_count", "unexplained_variance_count",
    ],
  }),
  "w12-tenant-rls": Object.freeze({
    predecessors: ["w12-migration"],
    checks: [
      "forced_rls_verified", "tenant_hmac_verified",
      "wrong_tenant_reads_denied", "wrong_tenant_writes_denied",
      "cross_tenant_transaction_denied",
    ],
    zeroCounts: ["tenant_negative_visible_count", "cross_tenant_write_count"],
  }),
  "w12-failure-injection": Object.freeze({
    predecessors: ["w12-migration"],
    checks: [
      "transaction_rollback_verified", "partial_commit_prevented",
      "checkpoint_resume_verified", "optimistic_conflict_verified",
      "outbox_atomicity_verified", "source_content_unchanged",
    ],
    zeroCounts: [
      "partial_commit_count", "source_mutation_count",
      "unrecovered_checkpoint_count",
    ],
  }),
  "w12-capacity": Object.freeze({
    predecessors: ["w12-migration", "w12-replay"],
    checks: [
      "records_per_tenant_measured", "batch_sizes_measured",
      "latency_percentiles_measured", "retry_conflict_rate_measured",
      "connection_pool_saturation_measured", "outbox_lag_measured",
      "production_limits_derived", "capacity_acceptance_passed",
    ],
    zeroCounts: ["capacity_acceptance_failure_count"],
  }),
  "w12-dms": Object.freeze({
    predecessors: ["w12-migration"],
    checks: [
      "tenant_namespace_verified", "source_digest_verified",
      "provider_digest_readback_verified", "object_lock_verified",
      "retention_verified", "legal_hold_verified",
      "canonical_document_guard_verified", "delete_guard_verified",
    ],
    zeroCounts: [
      "dms_digest_mismatch_count", "dms_retention_failure_count",
      "dms_legal_hold_failure_count", "dms_tenant_leak_count",
      "dms_delete_guard_failure_count",
    ],
  }),
  "w12-reconciliation": Object.freeze({
    predecessors: ["w12-migration", "w12-replay", "w12-tenant-rls", "w12-dms"],
    checks: [
      "source_target_counts_matched", "canonical_hashes_matched",
      "state_versions_matched", "logical_references_matched",
      "identity_hrx_links_matched", "all_expected_rejections_explained",
      "cross_domain_reconciliation_passed",
    ],
    zeroCounts: [
      "unexplained_variance_count", "unexpected_rejection_count",
      "missing_logical_reference_count", "identity_hrx_link_gap_count",
    ],
  }),
  "w12-restore": Object.freeze({
    predecessors: ["w12-reconciliation"],
    checks: [
      "isolated_restore_target_verified", "postgres_restore_passed",
      "dms_reference_restore_passed", "object_lock_preserved",
      "legal_hold_preserved", "complete_reconciliation_passed",
      "rpo_measured", "rto_measured",
    ],
    zeroCounts: ["restore_variance_count", "dms_restore_mismatch_count"],
  }),
  "w12-owner-sampling": Object.freeze({
    predecessors: ["w12-reconciliation", "w12-restore"],
    checks: [
      "owner_sample_set_frozen", "employee_samples_verified",
      "client_samples_verified", "matter_samples_verified",
      "document_samples_verified", "sample_variances_closed",
    ],
    zeroCounts: ["owner_sample_variance_count"],
  }),
  "w12-terminal": Object.freeze({
    predecessors: [
      "source-inventory-adjudication", "record-type-and-reference",
      "w12-infrastructure", "w12-sink", "w12-migration", "w12-replay",
      "w12-tenant-rls", "w12-failure-injection", "w12-capacity", "w12-dms",
      "w12-reconciliation", "w12-restore", "w12-owner-sampling",
    ],
    checks: [
      "all_component_receipts_verified", "inventory_adjudication_complete",
      "rehearsal_reconciliation_passed", "replay_noop_passed",
      "tenant_isolation_passed", "failure_injection_passed",
      "capacity_acceptance_passed", "dms_controls_passed",
      "isolated_restore_passed", "owner_sampling_passed",
      "production_unchanged", "external_delivery_absent",
    ],
    zeroCounts: [
      ...ZERO_AUTHORITY_COUNTERS, "receipt_verification_failure_count",
      "unresolved_candidate_count", "unexplained_variance_count",
      "unexpected_rejection_count", "production_write_count",
      "external_email_send_count",
    ],
  }),
  "cut-008": Object.freeze({
    predecessors: ["w12-terminal"],
    checks: [
      "exact_main_verified", "exact_head_ci_passed", "security_passed", "required_postgres_tests_executed",
      "private_rds_verified", "multi_az_verified", "deletion_protection_verified", "encrypted_storage_verified",
      "pitr_verified", "tls_verify_full_verified", "least_privilege_roles_verified", "sensitive_reference_rotation_auditable",
      "lambda_vpc_verified", "production_role_separation_verified", "dms_public_access_blocked",
      "dms_sse_kms_verified", "dms_versioning_verified", "dms_object_lock_verified",
      "dms_digest_readback_verified", "dms_legal_hold_verified", "dms_retention_verified",
      "backup_target_verified", "schema_migrations_verified", "forced_rls_verified",
      "tenant_hmac_verified", "identity_schema_verified", "audit_outbox_verified",
      "readonly_auditor_verified", "protected_resource_unchanged",
    ],
    zeroCounts: ["required_postgres_test_skip_count", "temporary_eni_allow_count", "public_resource_count", "excess_iam_allow_count", "protected_resource_mutation_count"],
  }),
  "source-freeze": Object.freeze({
    predecessors: ["w12-terminal", "cut-008"],
    checks: [
      "immutable_source_backup_created", "off_device_backup_uploaded", "isolated_backup_restore_passed",
      "operational_json_writers_frozen", "competing_imports_frozen", "base_delta_inventory_verified",
      "final_dry_run_passed", "w12_capacity_acceptance_matched", "source_content_unchanged",
    ],
    zeroCounts: ["unexpected_source_count", "unexpected_rejection_count", "external_email_send_count", "raw_pii_evidence_count", "source_mutation_count"],
  }),
  "first-write-boundary": Object.freeze({
    predecessors: ["source-freeze"],
    checks: ["first_production_write_not_started", "pre_write_rollback_available", "post_write_runbook_verified", "json_writers_frozen"],
    zeroCounts: ["production_write_count"],
  }),
  "cut-009": Object.freeze({
    predecessors: ["w12-terminal", "cut-008", "source-freeze", "first-write-boundary"],
    checks: [
      "first_production_write_recorded", "signed_inventory_only", "identity_registered_email_preserved",
      "active_accounts_reset_required", "disabled_accounts_denied", "legacy_authenticator_material_absent",
      "all_domains_imported", "hrx_imported", "dms_object_lock_imported", "complete_readback_passed",
      "logical_references_passed", "cross_domain_reconciliation_passed", "postgres_authority_activated",
      "warm_start_passed", "cold_start_passed", "individual_reset_only",
    ],
    zeroCounts: [
      ...ZERO_AUTHORITY_COUNTERS,
      "unexpected_rejection_count", "unexplained_variance_count", "tenant_negative_visible_count",
      "dms_digest_mismatch_count", "dms_retention_failure_count", "dms_legal_hold_failure_count",
      "bulk_reset_send_count",
    ],
  }),
  "cut-010": Object.freeze({
    predecessors: ["cut-009"],
    checks: [
      "isolated_restore_target_verified", "postgres_restore_passed", "dms_reference_restore_passed",
      "object_lock_preserved", "legal_hold_preserved", "complete_reconciliation_passed",
      "missing_json_startup_passed", "representative_reads_passed", "rpo_measured",
      "rto_measured", "rpo_target_met", "rto_target_met", "readonly_auditor_verified",
    ],
    zeroCounts: ["restore_variance_count", "dms_restore_mismatch_count", "tenant_negative_visible_count"],
  }),
  "cut-011": Object.freeze({
    predecessors: ["cut-010"],
    checks: [
      "operational_store_path_absent", "missing_json_warm_start_passed", "missing_json_cold_start_passed",
      "representative_write_passed", "representative_read_passed", "background_jobs_passed",
      "audit_passed", "outbox_passed", "legacy_json_immutable_only",
    ],
    zeroCounts: [...ZERO_AUTHORITY_COUNTERS, "operational_json_path_count"],
  }),
  "cut-012": Object.freeze({
    predecessors: ["cut-008", "cut-009", "cut-010", "cut-011"],
    checks: [
      "real_data_reconciliation_passed", "tenant_rls_passed", "tenant_hmac_passed",
      "role_access_control_passed", "transaction_atomicity_passed", "audit_idempotency_outbox_passed",
      "individual_first_use_setup_passed", "disabled_account_denial_passed", "dms_controls_passed",
      "isolated_restore_passed", "missing_json_operation_passed", "critical_flows_passed",
      "all_component_receipts_verified",
    ],
    zeroCounts: [...ZERO_AUTHORITY_COUNTERS, "unexplained_variance_count", "unexpected_rejection_count", "receipt_verification_failure_count"],
  }),
  "macos-signing": Object.freeze({
    predecessors: ["cut-012"],
    checks: ["exact_main_package", "developer_id_signed", "notarization_passed", "stapling_passed", "signature_verified"],
    zeroCounts: ["signing_failure_count", "sensitive_material_finding_count"],
  }),
  "windows-signing": Object.freeze({
    predecessors: ["cut-012"],
    checks: ["exact_main_package", "authenticode_signed", "timestamp_verified", "signature_verified"],
    zeroCounts: ["signing_failure_count", "sensitive_material_finding_count"],
  }),
  "formal-release": Object.freeze({
    predecessors: ["cut-012", "macos-signing", "windows-signing"],
    checks: [
      "exact_main_package", "deterministic_build_verified", "sbom_verified", "checksums_verified",
      "provenance_verified", "dependency_inventory_verified", "sensitive_material_scan_passed",
      "tag_created", "artifacts_published",
    ],
    zeroCounts: ["artifact_binding_failure_count", "publication_failure_count"],
  }),
  "go-live": Object.freeze({
    predecessors: ["cut-012", "formal-release"],
    checks: [
      "signed_artifacts_deployed", "production_smoke_passed", "tenant_isolation_passed",
      "internal_email_auth_passed", "critical_domain_flows_passed", "dms_passed",
      "audit_outbox_passed", "backup_visible", "cut_012_verified", "traffic_activated",
      "event_based_acceptance_passed",
    ],
    zeroCounts: [...ZERO_AUTHORITY_COUNTERS, "critical_flow_failure_count", "active_stop_condition_count"],
  }),
  "w15-relational-projection": Object.freeze({
    predecessors: ["w12-terminal", "cut-012", "go-live"],
    checks: [
      "one_way_outbox_projection_verified", "selected_table_contract_verified",
      "shadow_count_hash_ordering_passed", "logical_reference_readback_passed",
      "projection_performance_accepted", "tenant_rls_passed", "transaction_rollback_passed",
      "append_only_conflict_guard_passed", "generic_ledger_authority_preserved",
      "projection_consumers_read_only", "authority_promotion_not_granted",
      "projection_receipt_set_verified",
    ],
    zeroCounts: [
      "source_authority_write_count", "dual_write_count", "partial_commit_count",
      "shadow_difference_count", "tenant_negative_visible_count",
      "projection_authority_promotion_count", "receipt_verification_failure_count",
    ],
  }),
});

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

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function assertNoSensitiveKeys(value, path = "result") {
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) fail("PROGRAM_STAGE_EVIDENCE", `${path} contains bytes`);
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoSensitiveKeys(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) fail("PROGRAM_STAGE_EVIDENCE", `${path} contains a sensitive field`);
    assertNoSensitiveKeys(item, `${path}.${key}`);
  }
}

function validateCounts(counts = {}) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) fail("PROGRAM_STAGE_COUNTS", "stage safe_counts must be an object");
  for (const [key, value] of Object.entries(counts)) {
    if (!/^[a-z][a-z0-9_]{1,95}$/u.test(key) || FORBIDDEN_KEY.test(key)
      || !Number.isSafeInteger(value) || value < 0) {
      fail("PROGRAM_STAGE_COUNTS", "stage safe_counts are invalid", { key });
    }
  }
}

function receiptMap(predecessors = []) {
  const byKind = new Map();
  for (const receipt of predecessors) {
    if (receipt?.valid !== true || receipt.execution_state !== "PASS" || !SHA256.test(receipt.canonical_sha256 ?? "")) {
      fail("PROGRAM_STAGE_PREDECESSOR", "stage predecessor is not a verified PASS receipt");
    }
    if (byKind.has(receipt.receipt_kind)) fail("PROGRAM_STAGE_PREDECESSOR", "stage predecessor kind is duplicated");
    byKind.set(receipt.receipt_kind, receipt);
  }
  return byKind;
}

function expectedClaims(stage) {
  const cut009 = stage === "cut-009";
  const w12 = stage === "source-inventory-adjudication"
    || stage === "record-type-and-reference"
    || stage.startsWith("w12-");
  const production = !w12 && !["macos-signing", "windows-signing"].includes(stage);
  return Object.freeze({
    real_data_read: w12 || ["source-freeze", "cut-009", "cut-010", "cut-012", "go-live", "w15-relational-projection"].includes(stage),
    real_data_mutated: cut009 || stage === "w12-migration",
    production_contacted: production,
    production_write: cut009,
    first_production_write_started: cut009 || ["cut-010", "cut-011", "cut-012", "formal-release", "go-live", "w15-relational-projection"].includes(stage),
    json_authority_disabled: ["cut-011", "cut-012", "go-live", "w15-relational-projection"].includes(stage),
    external_email_sent: false,
    dms_bytes_in_evidence: false,
    release: ["formal-release", "go-live"].includes(stage),
    go_live: stage === "go-live",
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
}

export function validateJsonPostgresProgramStage({
  stage,
  packet,
  observed,
  predecessors = [],
} = {}) {
  if (!STAGES.has(stage) || !packet?.authorized_stages?.includes(stage)) {
    fail("PROGRAM_STAGE_SCOPE", "stage is not authorized by the exact program packet");
  }
  if (!SHA1.test(packet.source_sha ?? "") || !SHA1.test(packet.source_tree ?? "") || !SHA256.test(packet.packet_sha256 ?? "")) {
    fail("PROGRAM_STAGE_SOURCE", "program packet source or digest binding is invalid");
  }
  const expectedPhase = stage === "w15-relational-projection"
    ? "w15-relational-projection"
    : stage === "source-inventory-adjudication"
      || stage === "record-type-and-reference"
      || stage.startsWith("w12-")
      ? "w12-real-data-rehearsal"
      : "w13-production-cutover";
  if (packet.phase !== expectedPhase) fail("PROGRAM_STAGE_SCOPE", "stage packet phase is invalid");
  const rule = RULES[stage];
  if (observed?.schema_version !== JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION
    || observed.stage !== stage
    || observed.outcome !== "PASS"
    || observed.source_sha !== packet.source_sha
    || observed.source_tree !== packet.source_tree
    || observed.packet_sha256 !== packet.packet_sha256) {
    fail("PROGRAM_STAGE_RESULT", "observed stage result is not an exact PASS");
  }
  assertNoSensitiveKeys(observed);
  if (!observed.checks || typeof observed.checks !== "object" || Array.isArray(observed.checks)) {
    fail("PROGRAM_STAGE_CHECKS", "observed stage checks are missing");
  }
  const missingChecks = rule.checks.filter((key) => observed.checks[key] !== true);
  if (missingChecks.length > 0) fail("PROGRAM_STAGE_CHECKS", "required stage checks did not pass", { missing: missingChecks });
  validateCounts(observed.safe_counts);
  const nonzero = rule.zeroCounts.filter((key) => observed.safe_counts[key] !== 0);
  if (nonzero.length > 0) fail("PROGRAM_STAGE_COUNTS", "required zero stage counters are nonzero or absent", { nonzero });
  if (!Number.isSafeInteger(observed.safe_counts.monthly_cost_forecast_krw)
    || observed.safe_counts.monthly_cost_forecast_krw > 300_000) {
    fail("PROGRAM_STAGE_COST", "monthly cost forecast is missing or exceeds KRW 300,000");
  }
  const byKind = receiptMap(predecessors);
  const missingPredecessors = rule.predecessors.filter((kind) => !byKind.has(kind));
  if (missingPredecessors.length > 0) {
    fail("PROGRAM_STAGE_PREDECESSOR", "required stage predecessors are missing", { missing: missingPredecessors });
  }
  const externalPredecessors = new Set([
    ...(["w13-production-cutover", "w15-relational-projection"].includes(packet.phase)
      ? ["w12-terminal"]
      : []),
    ...(stage === "w15-relational-projection" ? ["cut-012", "go-live"] : []),
  ]);
  if (stage !== "cut-008") {
    for (const kind of rule.predecessors.filter((candidate) => !externalPredecessors.has(candidate))) {
      const receipt = byKind.get(kind);
      if (receipt.source_sha !== packet.source_sha || receipt.source_tree !== packet.source_tree || receipt.packet_sha256 !== packet.packet_sha256) {
        fail("PROGRAM_STAGE_PREDECESSOR", "same-program predecessor binding drifted", { kind });
      }
    }
  }
  if (byKind.has("w12-terminal")
    && packet.bindings?.w12_terminal_receipt_sha256
    && byKind.get("w12-terminal").canonical_sha256 !== packet.bindings.w12_terminal_receipt_sha256) {
    fail("PROGRAM_STAGE_PREDECESSOR", "W12 terminal receipt binding drifted");
  }
  if (stage === "w15-relational-projection") {
    if (byKind.get("cut-012").canonical_sha256 !== packet.bindings?.cut012_terminal_receipt_sha256
      || byKind.get("go-live").canonical_sha256 !== packet.bindings?.go_live_receipt_sha256) {
      fail("PROGRAM_STAGE_PREDECESSOR", "W15 terminal predecessor binding drifted");
    }
  }
  const bindingsSha256 = sha256({ bindings: packet.bindings, target: packet.target });
  if (observed.bindings_sha256 !== bindingsSha256) fail("PROGRAM_STAGE_BINDING", "stage target/bindings digest drifted");
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
    stage,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: bindingsSha256,
    predecessor_receipt_sha256: Object.freeze(rule.predecessors.map((kind) => byKind.get(kind).canonical_sha256)),
    safe_counts: Object.freeze({ ...observed.safe_counts }),
    claims: expectedClaims(stage),
    checks_sha256: sha256(observed.checks),
  });
  return Object.freeze({ ...value, result_sha256: sha256(value) });
}

export function jsonPostgresProgramBindingsSha256(packet = {}) {
  return sha256({ bindings: packet.bindings, target: packet.target });
}

export function jsonPostgresProgramStageRequirements(stage) {
  if (!STAGES.has(stage)) fail("PROGRAM_STAGE_SCOPE", "stage is invalid");
  return Object.freeze({
    checks: Object.freeze([...RULES[stage].checks]),
    zero_counts: Object.freeze([...RULES[stage].zeroCounts]),
    predecessor_kinds: Object.freeze([...RULES[stage].predecessors]),
  });
}

export { ZERO_AUTHORITY_COUNTERS as JSON_POSTGRES_ZERO_AUTHORITY_COUNTERS };
