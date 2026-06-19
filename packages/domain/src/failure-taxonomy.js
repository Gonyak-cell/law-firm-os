import {
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING,
} from "./permission-matrix.js";

export const CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING = Object.freeze({
  pack_id: "CP00-104",
  planned_pack_id: "CP00-104",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P06.M09.S07-RP01.P07.M08.S17",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_permission_review_packet_pack_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
});

const CP104_REVIEW_EXTENSION_UNIT_IDS = Object.freeze([
  "RP01.P06.M09.S07",
  "RP01.P06.M09.S08",
  "RP01.P06.M09.S09",
  "RP01.P06.M09.S10",
  "RP01.P06.M09.S11",
  "RP01.P06.M10.S01",
  "RP01.P06.M10.S02",
  "RP01.P06.M10.S03",
]);

const CP104_FAILURE_MICRO_PHASE_COUNTS = Object.freeze({
  "RP01.P07.M00": 3,
  "RP01.P07.M01": 11,
  "RP01.P07.M02": 11,
  "RP01.P07.M03": 20,
  "RP01.P07.M04": 20,
  "RP01.P07.M05": 20,
  "RP01.P07.M06": 20,
  "RP01.P07.M07": 20,
  "RP01.P07.M08": 17,
});

const CP104_FAILURE_CATEGORY_TEMPLATES = Object.freeze([
  Object.freeze({ category_id: "failure_taxonomy", title: "Failure taxonomy", expected_status: "taxonomy_reference" }),
  Object.freeze({ category_id: "missing_tenant", title: "Missing tenant failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "missing_actor", title: "Missing actor failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "missing_matter", title: "Missing Matter failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "missing_resource", title: "Missing resource failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "unknown_action", title: "Unknown action failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "cross_tenant", title: "Cross-tenant failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "permission_denied", title: "Permission denied failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "ambiguous_rule", title: "Ambiguous rule failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "stale_reference", title: "Stale reference failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "lock_conflict", title: "Lock conflict failure", expected_status: "retry_required" }),
  Object.freeze({ category_id: "retry_exhaustion", title: "Retry exhaustion failure", expected_status: "blocked" }),
  Object.freeze({ category_id: "rollback_expectation", title: "Rollback expectation", expected_status: "rollback_expected" }),
  Object.freeze({ category_id: "compensation_expectation", title: "Compensation expectation", expected_status: "compensation_expected" }),
  Object.freeze({ category_id: "blocked_claim_receipt", title: "Blocked-claim receipt", expected_status: "receipt_expected" }),
  Object.freeze({ category_id: "failure_fixture", title: "Failure fixture", expected_status: "fixture_expected" }),
  Object.freeze({ category_id: "failure_unit_test", title: "Failure unit test", expected_status: "test_expected" }),
  Object.freeze({ category_id: "failure_integration_smoke", title: "Failure integration smoke", expected_status: "smoke_expected" }),
  Object.freeze({ category_id: "audit_failure_hint", title: "Audit failure hint", expected_status: "audit_hint_expected" }),
  Object.freeze({ category_id: "hermes_failure_evidence", title: "Hermes failure evidence", expected_status: "hermes_evidence_expected" }),
]);

const CP104_REVIEW_EXTENSION_BINDINGS = Object.freeze([
  Object.freeze({
    item_id: "ai_retrieval_decision_binding",
    source_unit_ids: ["RP01.P06.M09.S07"],
    action: "ai_retrieval",
    decision_binding: "review_required_ai_reference",
    route: "review_required",
    expected_status: "review_required_reference",
  }),
  Object.freeze({
    item_id: "audit_hint_fields",
    source_unit_ids: ["RP01.P06.M09.S08"],
    action: "audit_hint_fields",
    decision_binding: "display_only_audit_hint_reference",
    route: "ready",
    expected_status: "audit_hint_reference",
  }),
  Object.freeze({
    item_id: "matched_rule_capture",
    source_unit_ids: ["RP01.P06.M09.S09"],
    action: "matched_rule_capture",
    decision_binding: "field_capture_reference",
    route: "ready",
    expected_status: "matched_rule_reference",
  }),
  Object.freeze({
    item_id: "deny_over_allow_check",
    source_unit_ids: ["RP01.P06.M09.S10"],
    action: "deny_over_allow_check",
    decision_binding: "deny_reference_overrides_allow",
    route: "blocked",
    expected_status: "deny_over_allow_reference",
  }),
  Object.freeze({
    item_id: "legal_hold_interaction",
    source_unit_ids: ["RP01.P06.M09.S11"],
    action: "legal_hold_interaction",
    decision_binding: "legal_hold_blocks_reference",
    route: "blocked",
    expected_status: "legal_hold_reference",
  }),
  Object.freeze({
    item_id: "permission_matrix_row",
    source_unit_ids: ["RP01.P06.M10.S01"],
    action: "permission_matrix_row",
    decision_binding: "matrix_row_reference",
    route: "ready",
    expected_status: "matrix_row_reference",
  }),
  Object.freeze({
    item_id: "view_decision_binding",
    source_unit_ids: ["RP01.P06.M10.S02"],
    action: "view",
    decision_binding: "allow_reference",
    route: "ready",
    expected_status: "view_reference",
  }),
  Object.freeze({
    item_id: "search_decision_binding",
    source_unit_ids: ["RP01.P06.M10.S03"],
    action: "search",
    decision_binding: "allow_with_security_trimming_reference",
    route: "ready",
    expected_status: "search_reference",
  }),
]);

export const CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT = Object.freeze({
  pack_id: "CP00-104",
  contract_id: "core_domain_cp104_failure_taxonomy_contract",
  source_unit_range: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.range,
  upstream_permission_review_packet_contract_id: CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  executes_ai_retrieval: false,
  executes_export_download: false,
  executes_external_share: false,
  mutates_locks: false,
  retries_operations: false,
  performs_rollback: false,
  performs_compensation: false,
  ldip_implemented: false,
  covered_unit_count: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.unit_count,
  covered_micro_phase_ids: Object.freeze([
    "RP01.P06.M09",
    "RP01.P06.M10",
    "RP01.P07.M00",
    "RP01.P07.M01",
    "RP01.P07.M02",
    "RP01.P07.M03",
    "RP01.P07.M04",
    "RP01.P07.M05",
    "RP01.P07.M06",
    "RP01.P07.M07",
    "RP01.P07.M08",
  ]),
  review_extension_bindings: Object.freeze(CP104_REVIEW_EXTENSION_BINDINGS.map((item) => item.item_id)),
  failure_category_ids: Object.freeze(CP104_FAILURE_CATEGORY_TEMPLATES.map((item) => item.category_id)),
  failure_policy: "expected_failure_reference_only_no_runtime_recovery",
  audit_failure_policy: "audit_hint_only_until_rp03_audit_kernel",
  permission_failure_policy: "expected_denial_only_until_rp02_permission_kernel",
  recovery_policy: "rollback_compensation_retry_expectations_only",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "database_row_created",
    "ai_retrieval_executed",
    "export_download_executed",
    "external_share_executed",
    "lock_mutated",
    "retry_executed",
    "rollback_performed",
    "compensation_performed",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

function cp104FreezeItem(item) {
  return Object.freeze({
    ...item,
    pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
    source_unit_ids: Object.freeze(item.source_unit_ids ?? []),
    expected_fields: Object.freeze(item.expected_fields ?? []),
    blocked_claims: Object.freeze(item.blocked_claims ?? []),
    recovery_expectations: Object.freeze(item.recovery_expectations ?? []),
    synthetic_only: true,
    uses_real_client_data: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
    creates_database_rows: false,
    executes_ai_retrieval: false,
    executes_export_download: false,
    executes_external_share: false,
    mutates_locks: false,
    retries_operations: false,
    performs_rollback: false,
    performs_compensation: false,
    ldip_implemented: false,
  });
}

function unitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

export function createCoreDomainCp104ReviewExtensionBindings() {
  return Object.freeze(
    CP104_REVIEW_EXTENSION_BINDINGS.map((item) =>
      cp104FreezeItem({
        ...item,
        kind: "review_extension_binding",
        expected_fields: ["tenant_id", "actor_user_id", "matter_id", "document_id", "permission_id", "audit_event_id", "decision_binding"],
        blocked_claims: item.route === "blocked" ? [`${item.item_id}_blocks_reference`] : [],
        recovery_expectations: item.route === "blocked" ? ["surface_blocked_claim_receipt"] : ["continue_reference_path"],
      }),
    ),
  );
}

export function createCoreDomainCp104FailureTaxonomy() {
  return Object.freeze(
    CP104_FAILURE_CATEGORY_TEMPLATES.map((template, index) =>
      cp104FreezeItem({
        category_id: template.category_id,
        title: template.title,
        kind: "failure_taxonomy_entry",
        ordinal: index + 1,
        source_unit_ids: [],
        expected_status: template.expected_status,
        blocked_claims: template.category_id === "failure_taxonomy" ? [] : [`${template.category_id}_reference`],
        recovery_expectations:
          template.category_id === "lock_conflict"
            ? ["retry_expectation_reference"]
            : template.category_id === "rollback_expectation"
              ? ["rollback_expectation_reference"]
              : template.category_id === "compensation_expectation"
                ? ["compensation_expectation_reference"]
                : [],
      }),
    ),
  );
}

export function createCoreDomainCp104FailureScenarioMatrix() {
  const taxonomy = createCoreDomainCp104FailureTaxonomy();
  const scenarios = [];
  for (const [microPhaseId, count] of Object.entries(CP104_FAILURE_MICRO_PHASE_COUNTS)) {
    for (let index = 1; index <= count; index += 1) {
      const category = taxonomy[index - 1];
      scenarios.push(
        cp104FreezeItem({
          scenario_id: `${microPhaseId}.${category.category_id}`,
          kind: "failure_scenario_reference",
          micro_phase_id: microPhaseId,
          source_unit_ids: [unitIdFor(microPhaseId, index)],
          category_id: category.category_id,
          title: category.title,
          expected_status: category.expected_status,
          expected_fields: ["tenant_id", "actor_user_id", "matter_id", "resource_id", "action", "failure_code", "blocked_claim"],
          blocked_claims: category.blocked_claims,
          recovery_expectations: category.recovery_expectations,
          audit_failure_hint_expected: ["permission_denied", "audit_failure_hint", "hermes_failure_evidence"].includes(category.category_id),
        }),
      );
    }
  }
  return Object.freeze(scenarios);
}

export function createCoreDomainCp104CoveredUnitIds() {
  const scenarioUnitIds = createCoreDomainCp104FailureScenarioMatrix().flatMap((item) => item.source_unit_ids);
  return Object.freeze([...CP104_REVIEW_EXTENSION_UNIT_IDS, ...scenarioUnitIds]);
}

export function createCoreDomainCp104FailureFixtureSet() {
  const scenarios = createCoreDomainCp104FailureScenarioMatrix();
  return Object.freeze({
    pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
    fixture_set_id: "core_domain_cp104_failure_fixture_set",
    synthetic_only: true,
    no_real_data: true,
    fixture_count: scenarios.filter((item) => item.category_id === "failure_fixture").length,
    unit_test_count: scenarios.filter((item) => item.category_id === "failure_unit_test").length,
    integration_smoke_count: scenarios.filter((item) => item.category_id === "failure_integration_smoke").length,
    audit_failure_hint_count: scenarios.filter((item) => item.audit_failure_hint_expected === true).length,
    blocked_claim_receipt_count: scenarios.filter((item) => item.category_id === "blocked_claim_receipt").length,
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
      executes_ai_retrieval: false,
      performs_rollback: false,
      performs_compensation: false,
    }),
  });
}

export function createCoreDomainCp104FailureEvidenceManifest() {
  const reviewExtensions = createCoreDomainCp104ReviewExtensionBindings();
  const taxonomy = createCoreDomainCp104FailureTaxonomy();
  const scenarios = createCoreDomainCp104FailureScenarioMatrix();
  const coveredUnitIds = createCoreDomainCp104CoveredUnitIds();
  return Object.freeze({
    pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp104_failure_evidence_manifest",
    source_unit_range: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.range,
    covered_unit_count: coveredUnitIds.length,
    covered_micro_phase_ids: CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.covered_micro_phase_ids,
    review_extension_count: reviewExtensions.length,
    taxonomy_count: taxonomy.length,
    failure_scenario_count: scenarios.length,
    synthetic_only: true,
    no_real_data: true,
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
      executes_ai_retrieval: false,
      executes_export_download: false,
      executes_external_share: false,
      mutates_locks: false,
      retries_operations: false,
      performs_rollback: false,
      performs_compensation: false,
    }),
  });
}

export function createCoreDomainCp104HermesEvidencePacket() {
  const manifest = createCoreDomainCp104FailureEvidenceManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp104_failure_taxonomy_hermes_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    failure_scenario_count: manifest.failure_scenario_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-104",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp104ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp104_failure_taxonomy_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-104 failure taxonomy, review-extension bindings, failure scenarios, fixtures, tests, and Hermes evidence stay synthetic-only, reference-only, no-write, no runtime recovery execution, no audit writes, no product state mutation, no LDIP implementation, and no real data.",
  });
}

export function createCoreDomainCp104CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.range,
    next_pack_id: "CP00-105",
    next_subphase_id: "RP01.P07.M08.S18",
    handoff_scope: "continue RP01.P07 Hermes evidence packet from failure integration smoke into the next generated Risk C pack",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp104Coverage() {
  const reviewExtensions = createCoreDomainCp104ReviewExtensionBindings();
  const taxonomy = createCoreDomainCp104FailureTaxonomy();
  const scenarios = createCoreDomainCp104FailureScenarioMatrix();
  const fixtureSet = createCoreDomainCp104FailureFixtureSet();
  const manifest = createCoreDomainCp104FailureEvidenceManifest();
  const evidence = createCoreDomainCp104HermesEvidencePacket();
  const review = createCoreDomainCp104ClaudeReviewPacket();
  const handoff = createCoreDomainCp104CloseoutHandoff();
  const coveredUnitIds = createCoreDomainCp104CoveredUnitIds();
  const errors = [];
  for (const binding of CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.review_extension_bindings) {
    if (!reviewExtensions.some((item) => item.item_id === binding)) errors.push(`CP00-104 missing review extension ${binding}`);
  }
  for (const category of CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.failure_category_ids) {
    if (!taxonomy.some((item) => item.category_id === category)) errors.push(`CP00-104 missing failure category ${category}`);
  }
  for (const required of [
    "RP01.P06.M09.S07",
    "RP01.P06.M09.S11",
    "RP01.P06.M10.S03",
    "RP01.P07.M00.S01",
    "RP01.P07.M03.S20",
    "RP01.P07.M08.S17",
  ]) {
    if (!coveredUnitIds.includes(required)) errors.push(`CP00-104 missing covered unit ${required}`);
  }
  if (coveredUnitIds.length !== 150) errors.push("CP00-104 must cover exactly 150 units");
  if (new Set(coveredUnitIds).size !== coveredUnitIds.length) errors.push("CP00-104 covered units must be unique");
  if (reviewExtensions.length !== 8) errors.push("CP00-104 must expose 8 review extension bindings");
  if (taxonomy.length !== 20) errors.push("CP00-104 must expose 20 failure taxonomy categories");
  if (scenarios.length !== 142) errors.push("CP00-104 must expose 142 failure scenario references");
  if (manifest.covered_unit_count !== 150) errors.push("CP00-104 manifest must cover 150 units");
  if (fixtureSet.fixture_count !== 6 || fixtureSet.unit_test_count !== 6 || fixtureSet.integration_smoke_count !== 5) {
    errors.push("CP00-104 fixture/test/smoke counts must match the CP00-104 ledger boundary");
  }
  if (!scenarios.some((item) => item.category_id === "cross_tenant" && item.expected_status === "blocked")) {
    errors.push("CP00-104 must include blocked cross-tenant failure scenarios");
  }
  if (!scenarios.some((item) => item.category_id === "lock_conflict" && item.expected_status === "retry_required")) {
    errors.push("CP00-104 must include retry-required lock conflict scenarios");
  }
  for (const item of [...reviewExtensions, ...taxonomy, ...scenarios]) {
    if (item.synthetic_only !== true || item.uses_real_client_data !== false) errors.push("CP00-104 items must be synthetic-only");
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("CP00-104 items must remain no-write and non-runtime");
    }
    if (
      item.creates_database_rows !== false ||
      item.executes_ai_retrieval !== false ||
      item.executes_export_download !== false ||
      item.executes_external_share !== false
    ) {
      errors.push("CP00-104 items must not create rows, AI retrievals, exports, or shares");
    }
    if (item.mutates_locks !== false || item.retries_operations !== false || item.performs_rollback !== false || item.performs_compensation !== false) {
      errors.push("CP00-104 items must not execute runtime recovery");
    }
    if (item.ldip_implemented !== false) errors.push("CP00-104 items must not implement LDIP");
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    review_extension_count: reviewExtensions.length,
    taxonomy_count: taxonomy.length,
    failure_scenario_count: scenarios.length,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    fixture_count: fixtureSet.fixture_count,
    next_subphase_id: handoff.next_subphase_id,
  });
}
