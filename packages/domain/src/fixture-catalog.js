import { buildCoreDomainGoldenCaseSet } from "./golden-cases.js";
import { createCoreDomainSyntheticFixtureSet, executeCoreDomainSyntheticFixtureWorkflow } from "./fixtures.js";
import {
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING,
  createCoreDomainPermissionAuditFixtureBinding,
} from "./ui-surfaces.js";

export const CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING = Object.freeze({
  pack_id: "CP00-101",
  planned_pack_id: "CP00-101",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P04.M06.S05-RP01.P05.M09.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_permission_audit_fixture_pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
});

const CP101_MICRO_PHASES = Object.freeze([
  "RP01.P04.M06",
  "RP01.P04.M07",
  "RP01.P04.M08",
  "RP01.P04.M09",
  "RP01.P04.M10",
  "RP01.P05.M00",
  "RP01.P05.M01",
  "RP01.P05.M02",
  "RP01.P05.M03",
  "RP01.P05.M04",
  "RP01.P05.M05",
  "RP01.P05.M06",
  "RP01.P05.M07",
  "RP01.P05.M08",
  "RP01.P05.M09",
]);

const CP101_FIXTURE_CASE_IDS = Object.freeze([
  "base_tenant_fixture",
  "base_user_fixture",
  "base_matter_fixture",
  "base_document_fixture",
  "primary_golden_case",
  "secondary_golden_case",
  "review_required_case",
  "denied_case",
  "cross_tenant_case",
  "missing_context_case",
  "audit_hint_case",
  "security_trimming_case",
  "ai_retrieval_or_analytics_case",
  "fixture_manifest",
  "golden_test",
  "failure_test",
  "hermes_fixture_evidence",
  "claude_missing_test_prompt",
  "closeout_handoff",
  "no_real_data_check",
]);

export const CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT = Object.freeze({
  pack_id: "CP00-101",
  contract_id: "core_domain_cp101_synthetic_fixture_catalog_contract",
  source_unit_range: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.range,
  upstream_permission_audit_fixture_contract_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  ldip_implemented: false,
  ui_fixture_states: Object.freeze(["denied", "review_required"]),
  responsive_modes: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.responsive_modes,
  base_fixture_types: Object.freeze(["Tenant", "User", "Matter", "DocumentReference"]),
  fixture_case_ids: CP101_FIXTURE_CASE_IDS,
  covered_micro_phase_ids: CP101_MICRO_PHASES,
  coverage_policy: "risk_c_fixture_and_evidence_catalog",
  evidence_policy: "command_evidence_only_no_runtime_side_effects",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "database_row_created",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

function freezeCatalogItem(item) {
  return Object.freeze({
    ...item,
    source_micro_phase_ids: Object.freeze(item.source_micro_phase_ids ?? []),
    covered_case_ids: Object.freeze(item.covered_case_ids ?? []),
    evidence_refs: Object.freeze(item.evidence_refs ?? []),
    blocked_claims: Object.freeze(item.blocked_claims ?? []),
  });
}

export function createCoreDomainCp101UiFixtureState(state = "denied", options = {}) {
  if (!CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.ui_fixture_states.includes(state)) {
    throw new Error(
      `CP00-101 fixture UI state must be one of ${CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.ui_fixture_states.join(", ")}`,
    );
  }
  const responsive_mode = options.responsive_mode ?? "desktop_dense";
  if (!CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.responsive_modes.includes(responsive_mode)) {
    throw new Error(
      `CP00-101 fixture responsive_mode must be one of ${CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.responsive_modes.join(", ")}`,
    );
  }
  const denied = state === "denied";
  const fixture = createCoreDomainPermissionAuditFixtureBinding({
    request_id: `req_rp01_cp101_${state}`,
    permission_id: `perm_rp01_cp101_${denied ? "deny" : "review"}_reference`,
    audit_event_id: `audit_ref_rp01_cp101_${state}`,
    permission_effect: denied ? "deny" : "review",
  });
  return Object.freeze({
    pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
    upstream_permission_audit_fixture_pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    surface_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.surface_id,
    source_micro_phase_id: "RP01.P04.M06",
    state,
    responsive_mode,
    primary_interaction: denied ? "inspect_permission_badge" : "open_review_reference",
    secondary_interaction: "inspect_audit_hint",
    actions: Object.freeze(denied ? ["inspect_permission_badge", "inspect_audit_hint"] : ["open_review_reference", "inspect_permission_badge", "inspect_audit_hint"]),
    permission_badge: Object.freeze({
      label: denied ? "Denied" : "Review required",
      effect: denied ? "deny" : "review",
      permission_id: fixture.permission_id,
      evaluated: false,
      approval_implied: false,
      policy: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.permission_badge_policy,
      writes_product_state: false,
    }),
    audit_hint: Object.freeze({
      action: `ui.permission_audit_synthetic_fixture_panel.${state}`,
      audit_event_id: fixture.audit_event_id,
      display_only: true,
      writes_audit_event: false,
      ledger_event_created: false,
      policy: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.audit_hint_policy,
      writes_product_state: false,
    }),
    layout: Object.freeze({
      responsive_mode,
      density: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.visual_density_policy,
      min_touch_target_px: responsive_mode === "mobile_single_column" ? 44 : 32,
      max_columns: responsive_mode === "mobile_single_column" ? 1 : 3,
    }),
    focus_order: Object.freeze(denied ? ["inspect_permission_badge", "inspect_audit_hint"] : ["open_review_reference", "inspect_permission_badge", "inspect_audit_hint"]),
    keyboard_behavior: "tab_order_matches_visible_fixture_actions",
    synthetic_only: true,
    uses_real_client_data: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
    ldip_implemented: false,
  });
}

export function createCoreDomainCp101UiFixtureStateMatrix() {
  return Object.freeze(
    CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.responsive_modes.flatMap((responsive_mode) =>
      CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.ui_fixture_states.map((state) =>
        createCoreDomainCp101UiFixtureState(state, { responsive_mode }),
      ),
    ),
  );
}

export function createCoreDomainCp101FixtureCaseCatalog() {
  const fixture = createCoreDomainSyntheticFixtureSet({ request_id: "req_rp01_cp101" });
  const goldenCases = buildCoreDomainGoldenCaseSet();
  const workflow = executeCoreDomainSyntheticFixtureWorkflow({ request_id: "req_rp01_cp101_workflow" });
  const goldenCaseIds = goldenCases.map((item) => item.id);
  const caseGoldenCaseMap = Object.freeze({
    secondary_golden_case: Object.freeze(["workflow_approval_required"]),
    review_required_case: Object.freeze(["workflow_review_required"]),
    denied_case: Object.freeze(["permission_reference_denied"]),
    cross_tenant_case: Object.freeze(["api_unauthorized_data_omission"]),
    missing_context_case: Object.freeze(["persistence_boundary_violation"]),
    audit_hint_case: Object.freeze(["workflow_happy_path", "workflow_review_required"]),
    security_trimming_case: Object.freeze(["api_unauthorized_data_omission"]),
    ai_retrieval_or_analytics_case: Object.freeze(["api_unauthorized_data_omission"]),
    fixture_manifest: Object.freeze(["workflow_happy_path"]),
    golden_test: Object.freeze(goldenCaseIds),
    failure_test: Object.freeze(["permission_reference_denied", "lock_retry", "persistence_boundary_violation"]),
    hermes_fixture_evidence: Object.freeze(goldenCaseIds),
    claude_missing_test_prompt: Object.freeze(goldenCaseIds),
    closeout_handoff: Object.freeze(["workflow_happy_path"]),
    no_real_data_check: Object.freeze(goldenCaseIds),
  });
  return Object.freeze([
    freezeCatalogItem({
      case_id: "base_tenant_fixture",
      source_micro_phase_ids: ["RP01.P05.M00", "RP01.P05.M01", "RP01.P05.M02", "RP01.P05.M03", "RP01.P05.M04", "RP01.P05.M05", "RP01.P05.M06", "RP01.P05.M07", "RP01.P05.M08", "RP01.P05.M09"],
      primary_ref: fixture.tenant.tenant_id,
      fixture_type: "Tenant",
      synthetic_only: true,
      writes_product_state: false,
    }),
    freezeCatalogItem({
      case_id: "base_user_fixture",
      source_micro_phase_ids: ["RP01.P05.M00", "RP01.P05.M01", "RP01.P05.M02", "RP01.P05.M03", "RP01.P05.M04", "RP01.P05.M05", "RP01.P05.M06", "RP01.P05.M07", "RP01.P05.M08", "RP01.P05.M09"],
      primary_ref: fixture.actor.user_id,
      fixture_type: "User",
      synthetic_only: true,
      writes_product_state: false,
    }),
    freezeCatalogItem({
      case_id: "base_matter_fixture",
      source_micro_phase_ids: ["RP01.P05.M00", "RP01.P05.M01", "RP01.P05.M02", "RP01.P05.M03", "RP01.P05.M04", "RP01.P05.M05", "RP01.P05.M06", "RP01.P05.M07", "RP01.P05.M08", "RP01.P05.M09"],
      primary_ref: fixture.matter.matter_id,
      fixture_type: "Matter",
      synthetic_only: true,
      writes_product_state: false,
    }),
    freezeCatalogItem({
      case_id: "base_document_fixture",
      source_micro_phase_ids: ["RP01.P05.M00", "RP01.P05.M01", "RP01.P05.M02", "RP01.P05.M03", "RP01.P05.M04", "RP01.P05.M05", "RP01.P05.M06", "RP01.P05.M07", "RP01.P05.M08"],
      primary_ref: fixture.document.document_id,
      fixture_type: "DocumentReference",
      synthetic_only: true,
      writes_product_state: false,
    }),
    freezeCatalogItem({
      case_id: "primary_golden_case",
      source_micro_phase_ids: ["RP01.P05.M02", "RP01.P05.M03", "RP01.P05.M04", "RP01.P05.M05", "RP01.P05.M06", "RP01.P05.M07", "RP01.P05.M08"],
      covered_case_ids: goldenCaseIds,
      expected_status: workflow.result.status,
      synthetic_only: true,
      writes_product_state: false,
    }),
    ...CP101_FIXTURE_CASE_IDS.filter((case_id) => !["base_tenant_fixture", "base_user_fixture", "base_matter_fixture", "base_document_fixture", "primary_golden_case"].includes(case_id)).map((case_id) =>
      freezeCatalogItem({
        case_id,
        source_micro_phase_ids: CP101_MICRO_PHASES.filter((micro) => micro.startsWith("RP01.P05")),
        covered_case_ids: caseGoldenCaseMap[case_id] ?? goldenCaseIds,
        expected_status: case_id.includes("denied") || case_id.includes("failure") || case_id.includes("missing") || case_id.includes("cross_tenant") ? "blocked" : "cataloged",
        synthetic_only: true,
        uses_real_client_data: false,
        evaluates_runtime_permission: false,
        writes_audit_event: false,
        writes_product_state: false,
        creates_database_rows: false,
        ldip_implemented: false,
      }),
    ),
  ]);
}

export function createCoreDomainCp101FixtureManifest() {
  const catalog = createCoreDomainCp101FixtureCaseCatalog();
  const matrix = createCoreDomainCp101UiFixtureStateMatrix();
  return Object.freeze({
    pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
    manifest_id: "core_domain_cp101_synthetic_fixture_catalog_manifest",
    source_unit_range: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.range,
    covered_unit_count: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.unit_count,
    covered_micro_phase_ids: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.covered_micro_phase_ids,
    fixture_case_count: catalog.length,
    ui_state_count: matrix.length,
    golden_case_count: buildCoreDomainGoldenCaseSet().length,
    synthetic_only: true,
    no_real_data: true,
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
    }),
  });
}

export function createCoreDomainCp101HermesEvidencePacket() {
  const manifest = createCoreDomainCp101FixtureManifest();
  return Object.freeze({
    pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp101_hermes_fixture_catalog_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    fixture_case_count: manifest.fixture_case_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-101",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createCoreDomainCp101ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp101_claude_fixture_catalog_review_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-101 Risk C fixture catalog, UI fixture states, golden-case manifest, Hermes evidence, and handoff remain synthetic-only, no-write, no-real-data, and LDIP-planning-only.",
  });
}

export function createCoreDomainCp101CloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.range,
    next_pack_id: "CP00-102",
    next_subphase_id: "RP01.P05.M09.S04",
    handoff_scope: "continue RP01.P05 Claude review packet from base document fixture through the next generated pack boundary",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp101Coverage() {
  const catalog = createCoreDomainCp101FixtureCaseCatalog();
  const matrix = createCoreDomainCp101UiFixtureStateMatrix();
  const manifest = createCoreDomainCp101FixtureManifest();
  const evidence = createCoreDomainCp101HermesEvidencePacket();
  const review = createCoreDomainCp101ClaudeReviewPacket();
  const handoff = createCoreDomainCp101CloseoutHandoff();
  const errors = [];
  if (catalog.length !== CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.fixture_case_ids.length) {
    errors.push("CP00-101 fixture catalog must cover every declared fixture case");
  }
  for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.fixture_case_ids) {
    if (!catalog.some((item) => item.case_id === required)) errors.push(`CP00-101 fixture catalog missing ${required}`);
  }
  if (matrix.length !== 4) errors.push("CP00-101 UI fixture matrix must cover denied/review states across two responsive modes");
  if (manifest.covered_unit_count !== 150) errors.push("CP00-101 manifest must cover 150 units");
  if (manifest.covered_micro_phase_ids.length !== 15) errors.push("CP00-101 manifest must cover 15 micro phases");
  if (catalog.some((item) => item.synthetic_only !== true || item.writes_product_state !== false)) {
    errors.push("CP00-101 fixture cases must remain synthetic-only and no-write");
  }
  for (const item of matrix) {
    if (item.permission_badge.evaluated !== false || item.permission_badge.approval_implied !== false) {
      errors.push("CP00-101 permission badge must not evaluate or imply approval");
    }
    if (item.audit_hint.display_only !== true || item.audit_hint.writes_audit_event !== false || item.audit_hint.ledger_event_created !== false) {
      errors.push("CP00-101 audit hint must remain display-only");
    }
    if (item.uses_real_client_data !== false || item.ldip_implemented !== false) {
      errors.push("CP00-101 UI fixture states must remain no-real-data and LDIP-free");
    }
    if (item.actions.some((action) => !item.focus_order.includes(action))) {
      errors.push("CP00-101 focus order must include every visible action");
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    fixture_case_count: catalog.length,
    ui_state_count: matrix.length,
    covered_unit_count: manifest.covered_unit_count,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
