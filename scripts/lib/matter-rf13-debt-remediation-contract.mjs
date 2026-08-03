export const RF13_PROGRESS_SCHEMA = "law-firm-os.rf13-dist.goal-progress.v1";
export const RF13_EVIDENCE_SCHEMA = "law-firm-os.rf13-dist.goal-evidence.v1";
export const RF13_GOAL_ID = "RF13-DIST";
export const RF13_PLAN_PATH = "workbook/matter-rf13-maintenance-debt-remediation-plan-2026-07-31.md";
export const RF13_EVIDENCE_ROOT = ".omo/evidence/rf13-debt-remediation-20260731";
export const RF13_RFD010_RECEIPT_PATH = ".omo/evidence/rfd010-release-candidate/current-receipt.json";
export const RFD_COLD_START_PERCENTILE_METHOD = "linear_interpolation_(n-1)";
export const RFD_PERFORMANCE_GAIN_DECIMALS = 2;
export const RFD039_CHANGED_PATH_ALLOWLIST = Object.freeze(["apps/web/src/App.jsx"]);

export const RFD_STATUSES = Object.freeze([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
  "BLOCKED_BY_AUTHORITY",
  "BLOCKED_BY_ARTIFACT",
  "BLOCKED_BY_EVIDENCE",
]);

export const RFD_TUW_IDS = Object.freeze(
  Array.from({ length: 42 }, (_, index) => `RFD-TUW-${String(index + 1).padStart(3, "0")}`),
);

const oneOf = (...values) => Object.freeze({ one_of: Object.freeze(values) });
const number = (minimum, maximum) => Object.freeze({ number: Object.freeze([minimum, maximum]) });
const specialized = (kind) => Object.freeze({ specialized: kind });
const c = (dependencies, runner, producerPaths, observations, options = {}) => Object.freeze({
  dependencies: Object.freeze(dependencies),
  runner,
  producer_paths: Object.freeze(
    producerPaths === null ? [] : Array.isArray(producerPaths) ? producerPaths : [producerPaths],
  ),
  implementation_dependency_paths: Object.freeze(options.implementationDependencyPaths ?? []),
  evidence_kind: options.evidenceKind,
  observations: Object.freeze(observations),
  clean_source: options.cleanSource === true,
  source_lineage: options.sourceLineage ?? "CURRENT",
});

export function calculateRfdPerformanceImprovementPercent(baselineMs, candidateMs) {
  if (!Number.isFinite(baselineMs) || baselineMs <= 0 || !Number.isFinite(candidateMs) || candidateMs < 0) {
    throw new TypeError("cold-start comparison requires finite non-negative timings and a positive baseline");
  }
  const scale = 10 ** RFD_PERFORMANCE_GAIN_DECIMALS;
  return Math.round(((baselineMs - candidateMs) / baselineMs) * 100 * scale) / scale;
}

export const RFD_TUW_CONTRACTS = Object.freeze({
  "RFD-TUW-001": c([], "GIT_READ_ONLY", [
    "scripts/capture-rf13-debt-remediation-baseline.mjs",
    "scripts/validate-rf13-debt-remediation-baseline.mjs",
  ], {
    captures_byte_equivalent: true,
    historical_artifact_qa_only: true,
    historical_artifact_not_distributable: true,
  }, { evidenceKind: "baseline_capture" }),
  "RFD-TUW-002": c(["RFD-TUW-001"], "NODE_TEST", "apps/desktop/test/runtime-package.test.mjs", {
    internal_non_distributable: true,
    candidate_formal_private_runtime_zero: true,
    policy_receipt_parity: true,
  }),
  "RFD-TUW-003": c(["RFD-TUW-001"], "VALIDATOR", "scripts/validate-rf13-dist-authority-checkpoint.mjs", {
    authority_dimensions_separated: true,
    credential_values_absent: true,
    mutation_not_authorized: true,
    rollback_owner_recorded: true,
  }),
  "RFD-TUW-004": c(["RFD-TUW-002"], "NODE_TEST", "scripts/test/matter-desktop-synthetic-runtime.test.mjs", {
    synthetic_people_count: 10,
    protected_roster_findings: 0,
    restart_inputs_present: true,
  }),
  "RFD-TUW-005": c(["RFD-TUW-002", "RFD-TUW-004"], "NODE_TEST", "apps/desktop/test/runtime-package.test.mjs", {
    private_local_explicit_opt_in: true,
    private_local_non_distributable: true,
    formal_runtime_entries: 0,
  }),
  "RFD-TUW-006": c(["RFD-TUW-004"], "VALIDATOR", "scripts/validate-matter-desktop-private-data-boundary.mjs", {
    negative_bundle_rejected: true,
    formal_fixture_accepted: true,
    sensitive_values_redacted: true,
  }),
  "RFD-TUW-007": c(["RFD-TUW-005", "RFD-TUW-006"], "VALIDATOR", "scripts/validate-matter-desktop-private-data-boundary.mjs", {
    artifact_formats_scanned: 4,
    internal_private_release_rejected: true,
    artifact_hashes_recorded: true,
  }),
  "RFD-TUW-008": c(["RFD-TUW-006"], "VALIDATOR", "scripts/validate-public-renderer-no-hrx-roster-pii.mjs", {
    scanner_corpus_shared: true,
    untracked_bad_file_rejected: true,
    protected_findings: 0,
    omitted_directories: 0,
  }),
  "RFD-TUW-009": c(["RFD-TUW-007"], "VALIDATOR", "scripts/validate-pv003-clean-sha-build-gate.mjs", {
    dirty_and_sha_mismatch_rejected: true,
    clean_exact_sha_accepted: true,
  }, { cleanSource: true }),
  "RFD-TUW-010": c(["RFD-TUW-009"], "GIT_READ_ONLY", "scripts/prepare-rfd010-release-candidate.mjs", {
    source_commit_sealed: true,
    release_sha_unique: true,
    remote_states_separated: true,
    artifact_collisions: 0,
  }, { cleanSource: true, evidenceKind: "rfd010_release_candidate" }),
  "RFD-TUW-011": c(["RFD-TUW-003", "RFD-TUW-010"], "FORMAL_RELEASE_VALIDATOR", "scripts/validate-matter-desktop-formal-release-bundle.mjs", {
    package_remote_mutations: 0,
    platform_manifests_same_source: true,
    private_runtime_findings: 0,
  }, { cleanSource: true }),
  "RFD-TUW-012": c(["RFD-TUW-011"], "MACOS_NATIVE_QA", "scripts/run-formal-macos-package-qa.sh", {
    app_signature_verified: true,
    dmg_signature_verified: true,
    notarization_stapled: true,
    gatekeeper_accepted: true,
  }, { cleanSource: true, implementationDependencyPaths: [
    "scripts/run-formal-macos-package-qa.mjs",
    "scripts/lib/formal-package-loopback-launcher.mjs",
  ] }),
  "RFD-TUW-013": c(["RFD-TUW-011"], "WINDOWS_NATIVE_QA", "scripts/run-formal-windows-package-qa.ps1", {
    native_install_uninstall_verified: true,
    native_qa: "PASS",
    windows_release: oneOf("PASS", "BLOCKED_BY_AUTHORITY"),
  }, { cleanSource: true, implementationDependencyPaths: [
    "scripts/run-formal-windows-package-qa.mjs",
    "scripts/lib/formal-package-loopback-launcher.mjs",
  ] }),
  "RFD-TUW-014": c(["RFD-TUW-011", "RFD-TUW-012", "RFD-TUW-013"], "MULTI_PLATFORM_PACKAGE_QA", [
    "scripts/run-formal-macos-package-qa.sh",
    "scripts/run-formal-windows-package-qa.ps1",
  ], {
    production_auth_http: true,
    bundled_api_entries: 0,
    operator_token_entries: 0,
    synthetic_people_count: 10,
    matter_scenario_verified: true,
    console_errors: 0,
    macos_native_qa: true,
    windows_native_qa: true,
    node_options_bypass_rejected: true,
    node_path_bypass_rejected: true,
    preload_bypass_rejected: true,
  }, { cleanSource: true, implementationDependencyPaths: [
    "scripts/run-formal-macos-package-qa.mjs",
    "scripts/run-formal-windows-package-qa.mjs",
    "scripts/lib/formal-package-loopback-launcher.mjs",
    "scripts/lib/formal-package-renderer-url.mjs",
  ] }),
  "RFD-TUW-015": c(["RFD-TUW-003", "RFD-TUW-010", "RFD-TUW-014"], "DEPLOYED_API_PACKAGE_QA", [
    "scripts/run-formal-deployed-api-package-qa.sh",
    "scripts/run-formal-deployed-api-package-qa.ps1",
  ], {
    non_loopback_api: true,
    source_api_artifact_bound: true,
    tenant_people_count: 10,
    profile_or_initials_count: 10,
    cross_tenant_rows: 0,
    durable_write_duplicates: 0,
    production_writes: 0,
    console_errors: 0,
  }, { cleanSource: true }),
  "RFD-TUW-016": c(["RFD-TUW-015"], "DEPLOYED_API_RESTART_QA", "scripts/run-formal-deployed-api-restart-qa.mjs", {
    initial_logins: 1,
    second_launch_session_restored: true,
    matter_state_equal: true,
    cross_userdata_tenant_mix: 0,
  }, { cleanSource: true }),
  "RFD-TUW-017": c(["RFD-TUW-011", "RFD-TUW-015", "RFD-TUW-016"], "ROLLBACK_EXECUTOR", "scripts/validate-matter-rollback-receipt.mjs", {
    api_roundtrip_a_b_a: true,
    desktop_roundtrip_b_a: true,
    target_sha_verified: true,
    data_rollback_writes: 0,
    production_rollback_claimed: false,
  }, { cleanSource: true }),
  "RFD-TUW-018": c(["RFD-TUW-012", "RFD-TUW-013", "RFD-TUW-014", "RFD-TUW-015", "RFD-TUW-016", "RFD-TUW-017"], "CANARY_QA", "scripts/run-rfd018-canary-monitor.mjs", {
    canary_people_count: oneOf(1, 2),
    rollback_trigger_injected: true,
    rf13_dist_manifest_sealed: true,
    internal_artifact_references: 0,
  }, { cleanSource: true }),
  "RFD-TUW-019": c(["RFD-TUW-018"], "NODE_TEST", "packages/payments/test/payment-allocation-service.test.js", {
    migration_output_byte_equivalent: true,
    idempotency_receipt_byte_equivalent: true,
    failure_fixture_writes: 0,
  }),
  "RFD-TUW-020": c(["RFD-TUW-019"], "NODE_TEST", "packages/payments/test/payment-allocation-service.test.js", {
    public_exports_equal: true,
    caller_results_equal: true,
    transaction_code_not_moved: true,
  }),
  "RFD-TUW-021": c(["RFD-TUW-020"], "NODE_TEST", "packages/payments/test/payment-allocation-service.test.js", {
    plan_hash_equal: true,
    replay_new_writes: 0,
    unmatched_inflow_auto_revenue: 0,
  }),
  "RFD-TUW-022": c(["RFD-TUW-018"], "NODE_TEST", "apps/web/test/matter-payment-reversal-browser.test.mjs", {
    user_messages_equal: true,
    refresh_targets_equal: true,
    stable_ids_equal: true,
    failure_and_success_paths_verified: true,
  }),
  "RFD-TUW-023": c(["RFD-TUW-022"], "BROWSER_QA", "apps/web/test/matter-payment-reversal-browser.test.mjs", {
    production_handler_rendered: true,
    negative_mutation_rejected: true,
    production_change_detected: true,
  }),
  "RFD-TUW-024": c(["RFD-TUW-023"], "NODE_TEST", "apps/web/test/matter-payment-reversal-browser.test.mjs", {
    three_states_equal: true,
    api_requests_equal: true,
    implementation_copy_absent: true,
  }),
  "RFD-TUW-025": c(["RFD-TUW-018"], "NODE_TEST", "apps/api/test/matter-small-firm-api.test.js", {
    response_hash_equal: true,
    denied_count_leaks: 0,
    cross_tenant_and_error_verified: true,
  }),
  "RFD-TUW-026": c(["RFD-TUW-025"], "NODE_TEST", "apps/api/test/matter-small-firm-api.test.js", {
    route_contract_equal: true,
    mutation_code_not_moved: true,
    performance_contract_verified: true,
  }),
  "RFD-TUW-027": c(["RFD-TUW-026"], "NODE_TEST", "apps/api/test/matter-small-firm-api.test.js", {
    timeline_scope_equal: true,
    canonical_client_equal: true,
    blocker_equal: true,
    csv_totals_equal: true,
  }),
  "RFD-TUW-028": c(["RFD-TUW-026", "RFD-TUW-027"], "NODE_TEST", "apps/api/test/matter-small-firm-api.test.js", {
    route_list_equal: true,
    status_mapping_equal: true,
    safe_error_codes_equal: true,
    pure_loc_reduced: true,
  }),
  "RFD-TUW-029": c(["RFD-TUW-028"], "NODE_TEST", "apps/api/test/cmp-r4-g7-finance.test.js", {
    authorization_matrix_equal: true,
    error_matrix_equal: true,
    audit_matrix_equal: true,
    failed_writes: 0,
  }),
  "RFD-TUW-030": c(["RFD-TUW-029"], "NODE_TEST", "apps/api/test/cmp-r4-g7-finance.test.js", {
    prebill_results_equal: true,
    error_mapping_equal: true,
    transaction_auth_not_moved: true,
  }),
  "RFD-TUW-031": c(["RFD-TUW-030"], "NODE_TEST", "apps/api/test/cmp-r4-g7-finance.test.js", {
    raw_provenance_equal: true,
    review_history_equal: true,
    idempotency_equal: true,
    unmatched_inflow_auto_revenue: 0,
  }),
  "RFD-TUW-032": c(["RFD-TUW-031"], "NODE_TEST", "apps/api/test/cmp-r4-g7-finance.test.js", {
    lineage_equal: true,
    reversal_equal: true,
    ar_results_equal: true,
    transaction_boundary_preserved: true,
  }),
  "RFD-TUW-033": c(["RFD-TUW-032"], "NODE_TEST", "apps/api/test/cmp-r4-g7-finance.test.js", {
    amounts_equal: true,
    buckets_equal: true,
    csv_hash_equal: true,
    audit_count_equal: true,
    permission_trim_preserved: true,
  }),
  "RFD-TUW-034": c(["RFD-TUW-030", "RFD-TUW-031", "RFD-TUW-032", "RFD-TUW-033"], "NODE_TEST", "apps/api/test/cmp-r4-g7-finance.test.js", {
    public_exports_compatible: true,
    server_imports_compatible: true,
    route_response_drift: 0,
    source_size_reduced: true,
  }),
  "RFD-TUW-035": c(["RFD-TUW-028"], "NODE_TEST", "apps/api/test/matter-current-seed-worktree.test.js", {
    startup_byte_equivalent: true,
    explicit_fixture_opt_in_isolated: true,
    independent_failure_verified: true,
  }),
  "RFD-TUW-036": c(["RFD-TUW-024", "RFD-TUW-034"], "BROWSER_QA", "apps/web/test/matter-small-firm-live-http-e2e.test.mjs", {
    people_count: 10,
    duplicates: 0,
    ar_balance: 0,
    closed_verified: true,
    unexpected: 0,
    product_assertion_not_copied: true,
  }),
  "RFD-TUW-037": c(["RFD-TUW-024", "RFD-TUW-028", "RFD-TUW-034", "RFD-TUW-035", "RFD-TUW-036"], "ARCHITECTURE_EVIDENCE", "scripts/generate-matter-rf13-architecture-evidence.mjs", {
    manifest_deterministic: true,
    pure_loc_measured: true,
    public_exports_measured: true,
    route_count_measured: true,
    file_split_not_success_condition: true,
  }),
  "RFD-TUW-038": c(["RFD-TUW-018"], "PERFORMANCE_PROBE", "scripts/run-matter-desktop-cold-start-probe.mjs", {
    cold_start_receipt: specialized("RFD038_COLD_START_PRODUCER_RECEIPT"),
  }, { cleanSource: true, sourceLineage: "BASELINE", implementationDependencyPaths: [
    "scripts/lib/matter-rf13-operational-evidence.mjs",
    "scripts/lib/matter-desktop-cold-start-contract.mjs",
  ] }),
  "RFD-TUW-039": c(["RFD-TUW-037", "RFD-TUW-038"], "PACKAGE_QA", "scripts/run-formal-macos-package-qa.mjs", {
    dependency_receipts: specialized("RFD039_DEPENDENCY_RECEIPTS"),
    package_qa_receipt: specialized("RFD039_FORMAL_PACKAGE_QA_RECEIPT"),
    package_qa_transcript: specialized("RFD039_FORMAL_PACKAGE_QA_TRANSCRIPT"),
    parent_baseline_source: specialized("RFD039_PARENT_BASELINE_SOURCE"),
    changed_paths: specialized("RFD039_EXACT_CHANGED_PATHS"),
  }, { cleanSource: true, sourceLineage: "CANDIDATE", implementationDependencyPaths: [
    "scripts/lib/formal-package-renderer-url.mjs",
    "scripts/lib/formal-package-loopback-evidence.mjs",
    "scripts/lib/formal-package-loopback-transcript.mjs",
    "scripts/lib/matter-rf13-operational-evidence.mjs",
  ] }),
  "RFD-TUW-040": c(["RFD-TUW-039"], "PERFORMANCE_PROBE", "scripts/run-matter-desktop-cold-start-probe.mjs", {
    decision: oneOf("ADOPTED_MEASURED_GAIN", "REVERTED_NO_GAIN"),
    lineage_receipts: specialized("RFD040_LINEAGE_RECEIPTS"),
    candidate_cold_start_receipt: specialized("RFD040_CANDIDATE_COLD_START_PRODUCER_RECEIPT"),
    web_full_receipt: specialized("RFD040_WEB_FULL_RECEIPT"),
    package_qa_receipt: specialized("RFD040_FORMAL_PACKAGE_QA_RECEIPT"),
    package_qa_transcript: specialized("RFD040_FORMAL_PACKAGE_QA_TRANSCRIPT"),
    final_state: specialized("RFD040_FINAL_STATE"),
  }, { cleanSource: true, sourceLineage: "FINAL_DECISION", implementationDependencyPaths: [
    "scripts/lib/matter-rf13-operational-evidence.mjs",
    "scripts/lib/matter-rf13-operational-attestation.mjs",
    "scripts/lib/matter-desktop-cold-start-contract.mjs",
    "scripts/lib/formal-package-loopback-evidence.mjs",
  ] }),
  "RFD-TUW-041": c(["RFD-TUW-018"], "PROFILE_PHOTO_MANIFEST", "scripts/validate-profile-photo-replacement-manifest.mjs", {
    profile_operation_receipt: specialized("RFD041_PROFILE_API_OPERATION_RECEIPT"),
    measurement_receipt: specialized("RFD041_PROFILE_MEASUREMENT_RECEIPT"),
  }, { implementationDependencyPaths: [
    "scripts/lib/matter-rf13-operational-evidence.mjs",
    "scripts/lib/matter-rf13-operational-attestation.mjs",
    "scripts/lib/json-postgres-production-execution.mjs",
    "scripts/lib/profile-media-measurement-validator.mjs",
  ] }),
  "RFD-TUW-042": c(["RFD-TUW-041"], "VALIDATOR", "scripts/validate-profile-media-operability-decision.mjs", {
    rfd041_receipt: specialized("RFD042_RFD041_ACCEPTANCE_RECEIPT"),
    decision_receipt: specialized("RFD042_PROFILE_DECISION_RECEIPT"),
  }, { implementationDependencyPaths: [
    "scripts/lib/matter-rf13-operational-evidence.mjs",
    "scripts/lib/matter-rf13-operational-attestation.mjs",
    "scripts/lib/json-postgres-production-execution.mjs",
    "scripts/lib/profile-media-production-evidence-files.mjs",
    "scripts/lib/profile-media-admin-goal.mjs",
    "scripts/lib/profile-media-measurement-validator.mjs",
  ] }),
});

for (const id of RFD_TUW_IDS) {
  if (!RFD_TUW_CONTRACTS[id]) throw new Error(`missing RF13 progress contract for ${id}`);
}

export const RFD_GATE_RANGES = Object.freeze({
  G0: Object.freeze(RFD_TUW_IDS.slice(0, 3)),
  G1: Object.freeze(RFD_TUW_IDS.slice(3, 9)),
  G2: Object.freeze(RFD_TUW_IDS.slice(9, 18)),
  G3: Object.freeze(RFD_TUW_IDS.slice(18, 24)),
  G4: Object.freeze(RFD_TUW_IDS.slice(24, 28)),
  G5: Object.freeze(RFD_TUW_IDS.slice(28, 34)),
  G6: Object.freeze(RFD_TUW_IDS.slice(34, 40)),
  G7: Object.freeze(RFD_TUW_IDS.slice(40, 42)),
});

export function expectedEvidenceKind(id) {
  return RFD_TUW_CONTRACTS[id].evidence_kind ?? `${id.toLowerCase().replaceAll("-", "_")}_acceptance`;
}

export function buildRf13ProgressTemplate({ planSha256, source } = {}) {
  return {
    schema_version: RF13_PROGRESS_SCHEMA,
    goal_id: RF13_GOAL_ID,
    plan: { path: RF13_PLAN_PATH, sha256: planSha256 },
    source: {
      head_sha: source?.source_sha,
      tree_sha: source?.source_tree,
      source_manifest_sha256: source?.source_manifest_sha256,
      working_tree_sha256: source?.working_tree_sha256,
      source_dirty: source?.source_dirty,
    },
    units: RFD_TUW_IDS.map((id) => ({
      id,
      dependencies: [...RFD_TUW_CONTRACTS[id].dependencies],
      status: "NOT_STARTED",
      evidence: [],
    })),
  };
}

export function deriveRf13Gates(units, evidenceOutcomes = new Map(), { sourceSealed = false } = {}) {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const satisfied = (id) => sourceSealed
    && byId.get(id)?.status === "COMPLETE"
    && evidenceOutcomes.get(id)?.accepted === true
    && evidenceOutcomes.get(id)?.source_sealed === true;
  const windowsHold = satisfied("RFD-TUW-013")
    && evidenceOutcomes.get("RFD-TUW-013")?.native_qa === "PASS"
    && evidenceOutcomes.get("RFD-TUW-013")?.windows_release === "BLOCKED_BY_AUTHORITY";
  const gates = Object.fromEntries(Object.entries(RFD_GATE_RANGES).map(([gate, ids]) => [
    gate,
    ids.every(satisfied) ? "PASS" : "FAIL",
  ]));
  if (gates.G2 === "PASS" && windowsHold) gates.G2 = "PASS_MACOS_PRIMARY";
  return Object.freeze(gates);
}
