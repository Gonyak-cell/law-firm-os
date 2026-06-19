import { evaluatePermission, trimSearchResults } from "./evaluate.js";
import {
  PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT,
  createPermissionKernelCp118UiSyntheticFixtureMatrix,
} from "./ui-synthetic-fixture-golden-case-catalog.js";

export const PERMISSION_KERNEL_CP119_PACK_BINDING = Object.freeze({
  pack_id: "CP00-119",
  planned_pack_id: "CP00-119",
  risk_class: "B",
  unit_count: 40,
  range: "RP02.P05.M04.S08-RP02.P05.M06.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-118",
  next_pack_id: "CP00-120",
  next_subphase_id: "RP02.P05.M06.S06",
});

const FIXTURE_WORKFLOW_TITLES = Object.freeze([
  "Base tenant fixture",
  "Base user fixture",
  "Base matter fixture",
  "Base document fixture",
  "Primary golden case",
  "Secondary golden case",
  "Review-required case",
  "Denied case",
  "Cross-tenant case",
  "Missing context case",
  "Audit hint case",
  "Security trimming case",
  "AI retrieval or analytics case",
  "Fixture manifest",
  "Golden test",
  "Failure test",
  "Hermes fixture evidence",
  "Claude missing-test prompt",
  "Closeout handoff",
  "No-real-data check",
  "Stable ID check",
  "Replay command",
]);

const CP119_PHASES = Object.freeze({
  "RP02.P05.M04": Object.freeze({
    start_index: 8,
    count: 13,
    micro_title: "Secondary Workflow Slice",
    phase_role: "fixture_workflow_edge_case_terminal",
    area: "permission_fixture_workflow_edge_cases",
  }),
  "RP02.P05.M05": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Permission And Audit Binding",
    phase_role: "fixture_permission_audit_binding_workflow",
    area: "permission_fixture_permission_audit_binding",
  }),
  "RP02.P05.M06": Object.freeze({
    start_index: 1,
    count: 5,
    micro_title: "Synthetic Fixture Set",
    phase_role: "fixture_synthetic_fixture_opening",
    area: "permission_fixture_synthetic_fixture_opening",
  }),
});

const CP119_DELIVERABLE_TYPES = Object.freeze({
  "Base tenant fixture": "fixture",
  "Base user fixture": "fixture",
  "Base matter fixture": "fixture",
  "Base document fixture": "fixture",
  "Primary golden case": "fixture",
  "Secondary golden case": "fixture",
  "Review-required case": "claude_review",
  "Denied case": "implementation",
  "Cross-tenant case": "implementation",
  "Missing context case": "implementation",
  "Audit hint case": "security_audit",
  "Security trimming case": "security_audit",
  "AI retrieval or analytics case": "implementation",
  "Fixture manifest": "fixture",
  "Golden test": "test",
  "Failure test": "test",
  "Hermes fixture evidence": "hermes_evidence",
  "Claude missing-test prompt": "test",
  "Closeout handoff": "implementation",
  "No-real-data check": "implementation",
  "Stable ID check": "implementation",
  "Replay command": "implementation",
});

const CP119_NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  mutates_permission_policy: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  acquires_locks: false,
  executes_rollback: false,
  executes_retry: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  executes_export_download: false,
  executes_external_share: false,
  grants_human_approval: false,
  executes_claude_review: false,
  implements_ldip: false,
});

const CP119_WORKFLOW_CASE_IDS = Object.freeze([
  "primary_golden_case",
  "secondary_golden_case",
  "review_required_case",
  "denied_case",
  "cross_tenant_case",
  "missing_context_case",
  "audit_hint_case",
  "security_trimming_case",
  "ai_retrieval_or_analytics_case",
]);

const SYNTHETIC_PRINCIPAL = Object.freeze({
  user_id: "u_cp119_attorney",
  tenant_id: "t_cp119",
  role_ids: Object.freeze(["attorney"]),
});

const SYNTHETIC_RESOURCE = Object.freeze({
  resource_id: "d_cp119_document",
  resource_type: "Document",
  tenant_id: "t_cp119",
  matter_id: "m_cp119",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function freezeWorkflowRow({ microPhaseId, phase, title, index }) {
  return Object.freeze({
    catalog_id: `${microPhaseId}.${slugFor(title)}`,
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    program_id: "RP02",
    area: phase.area,
    phase_id: "RP02.P05",
    micro_phase_id: microPhaseId,
    micro_title: phase.micro_title,
    phase_role: phase.phase_role,
    title,
    coverage_kind: slugFor(title),
    deliverable_type: CP119_DELIVERABLE_TYPES[title],
    source_unit_ids: Object.freeze([sourceUnitIdFor(microPhaseId, index)]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "metadata_only_fixture_workflow",
      "permission_audit_binding_reference_only",
      "denied_cross_tenant_missing_context_fail_closed",
      "security_trimming_omits_unauthorized_results",
      "ai_analytics_case_blocked_without_execution",
      "stable_id_deterministic",
      "replay_command_reference_only",
      "no_real_data",
      "no_runtime_ui_or_api_route",
      "no_permission_policy_mutation",
      "no_audit_write",
      "no_product_state_write",
      "no_export_or_external_share",
      "no_ldip_implementation",
    ]),
    boundary_flags: CP119_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_fixture_workflow: true,
    product_state_effect: "none",
  });
}

function buildRowsFromPhases() {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(CP119_PHASES)) {
    for (let offset = 0; offset < phase.count; offset += 1) {
      const index = phase.start_index + offset;
      rows.push(freezeWorkflowRow({ microPhaseId, phase, title: FIXTURE_WORKFLOW_TITLES[index - 1], index }));
    }
  }
  return rows;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_fixture_workflow: true,
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_rollback: false,
    executes_retry: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    grants_human_approval: false,
    executes_claude_review: false,
    implements_ldip: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP119_NO_WRITE_ATTESTATION,
  });
}

function createFixtureRequest(caseId, overrides = {}) {
  const base = {
    case_id: caseId,
    synthetic: true,
    principal: SYNTHETIC_PRINCIPAL,
    resource: SYNTHETIC_RESOURCE,
    matter_id: "m_cp119",
    action: "document.view",
    rules: [{ id: "cp119_allow_view", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
    objectAcl: [],
  };

  if (caseId === "secondary_golden_case") {
    base.rules = [];
    base.objectAcl = [{ id: "cp119_acl_allow", effect: "allow", principal_id: "u_cp119_attorney", action: "document.view" }];
  }
  if (caseId === "review_required_case") {
    base.action = "document.download";
    base.rules = [
      { id: "cp119_review_download", effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" },
    ];
  }
  if (caseId === "denied_case") {
    base.rules = [
      { id: "cp119_deny_wall", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "ethical_wall" },
    ];
  }
  if (caseId === "cross_tenant_case") {
    base.resource = { ...SYNTHETIC_RESOURCE, resource_id: "d_cp119_cross_tenant", tenant_id: "t_other" };
  }
  if (caseId === "missing_context_case") {
    base.resource = { ...SYNTHETIC_RESOURCE, matter_id: null };
  }
  if (caseId === "audit_hint_case") {
    base.rules = [
      { id: "cp119_allow_audit_hint", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "audit_hint_preview" },
    ];
  }
  if (caseId === "security_trimming_case") {
    base.search_results = Object.freeze([
      SYNTHETIC_RESOURCE,
      Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp119_cross_tenant", tenant_id: "t_other", matter_id: "m_other" }),
      Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp119_acl_denied" }),
    ]);
    base.objectAcl = (resource) =>
      resource.resource_id === "d_cp119_acl_denied"
        ? [{ id: "cp119_acl_deny", effect: "deny", principal_id: "u_cp119_attorney", action: "search.view" }]
        : [];
    base.action = "search.view";
    base.rules = [{ id: "cp119_allow_search", effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" }];
  }
  if (caseId === "ai_retrieval_or_analytics_case") {
    base.action = "ai.retrieval.preview";
    base.requested_ai_retrieval = true;
    base.requested_analytics_query = true;
  }

  return Object.freeze({ ...base, ...overrides });
}

function precheckFixtureRequest(request) {
  if (request.synthetic !== true) return { ok: false, reason: "non_synthetic_request_blocked" };
  if (request.requested_ai_retrieval || request.requested_analytics_query) return { ok: false, reason: "ai_analytics_boundary_blocked" };
  if (!request.principal?.tenant_id || !request.resource?.tenant_id || request.principal.tenant_id !== request.resource.tenant_id) {
    return { ok: false, reason: "tenant_boundary_precheck_failed" };
  }
  if (!request.matter_id || !request.resource?.matter_id || request.matter_id !== request.resource.matter_id) {
    return { ok: false, reason: "matter_trace_precheck_failed" };
  }
  return { ok: true, reason: "synthetic_fixture_precheck_passed" };
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp119.${caseId}`,
    stable_id_check: Object.freeze({
      deterministic: true,
      source: "case_id",
      persisted: false,
    }),
    replay_command: `node --test packages/authz/test/*.test.js --test-name-pattern=CP00-119`,
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

export const PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp119_fixture_workflow_binding_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP119_PACK_BINDING.range,
  upstream_ui_synthetic_fixture_golden_case_pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP119_PACK_BINDING.unit_count,
  risk_b_workflow_binding: true,
  synthetic_only: true,
  metadata_only_fixture_workflow: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  inherited_ui_synthetic_fixture_golden_case_contract_id:
    PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.contract_id,
  edge_case_unit_count: 13,
  permission_audit_binding_unit_count: 22,
  synthetic_fixture_opening_unit_count: 5,
  workflow_case_ids: CP119_WORKFLOW_CASE_IDS,
  decision_routes: Object.freeze({
    allow: "completed_metadata_only",
    deny: "blocked_claim_output",
    review_required: "review_required_routing",
    precheck_blocked: "blocked_before_permission_evaluation",
    ai_analytics_blocked: "blocked_ai_analytics_boundary",
  }),
  no_write_attestation: CP119_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP119_PACK_BINDING",
    "PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT",
    "createPermissionKernelCp119FixtureWorkflowBindingCatalog",
    "createPermissionKernelCp119CoveredUnitIds",
    "createPermissionKernelCp119FixtureWorkflowMatrix",
    "runPermissionKernelCp119FixtureWorkflowCase",
    "createPermissionKernelCp119FixtureWorkflowBindingManifest",
    "createPermissionKernelCp119HermesEvidencePacket",
    "createPermissionKernelCp119ClaudeReviewPacket",
    "createPermissionKernelCp119CloseoutHandoff",
    "validatePermissionKernelCp119Coverage",
  ]),
  hidden_source_fields: PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.hidden_source_fields,
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP119_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel synthetic fixture set at RP02.P05.M06.S06 as Risk C; extend remaining synthetic fixture, test/golden, evidence, review, closeout, and next permission-kernel phase surfaces without runtime writes or AI/analytics execution.",
  }),
});

export function createPermissionKernelCp119FixtureWorkflowBindingCatalog() {
  return Object.freeze(buildRowsFromPhases());
}

export function createPermissionKernelCp119CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp119FixtureWorkflowBindingCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp119FixtureWorkflowCase(caseId, overrides = {}) {
  if (!CP119_WORKFLOW_CASE_IDS.includes(caseId)) {
    return freezeNoWriteResult({
      case_id: caseId,
      status: "blocked_before_permission_evaluation",
      reason: "unknown_fixture_case",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }

  const request = createFixtureRequest(caseId, overrides);

  if (caseId === "security_trimming_case") {
    const trimmed = trimSearchResults(request.principal, request.search_results, request.rules, request.objectAcl, "search.view");
    return freezeNoWriteResult({
      case_id: caseId,
      status: "completed_metadata_only",
      reason: "security_trimmed_before_display",
      evaluator_invoked: true,
      decision: { effect: "allow", reason: "security_trimmed" },
      trimmed_result_ids: Object.freeze(trimmed.map((resource) => resource.resource_id)),
      omitted_result_policy: "do_not_count_or_render_unauthorized_results",
      audit_hint: Object.freeze({
        preview_only: true,
        emitted_to_audit_ledger: false,
        reason: "security_trimming_preview",
      }),
      ...createStableReplay(caseId, "completed_metadata_only"),
    });
  }

  const precheck = precheckFixtureRequest(request);
  if (!precheck.ok) {
    return freezeNoWriteResult({
      case_id: caseId,
      status: precheck.reason === "ai_analytics_boundary_blocked" ? "blocked_ai_analytics_boundary" : "blocked_before_permission_evaluation",
      reason: precheck.reason,
      evaluator_invoked: false,
      decision: null,
      audit_hint: Object.freeze({
        preview_only: true,
        emitted_to_audit_ledger: false,
        reason: precheck.reason,
      }),
      ...createStableReplay(
        caseId,
        precheck.reason === "ai_analytics_boundary_blocked" ? "blocked_ai_analytics_boundary" : "blocked_before_permission_evaluation",
      ),
    });
  }

  const decision = evaluatePermission({
    principal: request.principal,
    resource: request.resource,
    action: request.action,
    rules: request.rules,
    objectAcl: request.objectAcl,
  });
  const status =
    decision.effect === "allow"
      ? "completed_metadata_only"
      : decision.effect === "review_required"
        ? "review_required_routing"
        : "blocked_claim_output";

  return freezeNoWriteResult({
    case_id: caseId,
    status,
    reason: decision.reason,
    evaluator_invoked: true,
    decision: Object.freeze(decision),
    audit_hint: Object.freeze({
      preview_only: true,
      emitted_to_audit_ledger: false,
      hint: Object.freeze(decision.audit_hint),
    }),
    ...createStableReplay(caseId, status),
  });
}

export function createPermissionKernelCp119FixtureWorkflowMatrix() {
  const inheritedMatrix = createPermissionKernelCp118UiSyntheticFixtureMatrix();
  const workflowCases = Object.freeze(CP119_WORKFLOW_CASE_IDS.map((caseId) => runPermissionKernelCp119FixtureWorkflowCase(caseId)));
  const baseFixtureBindings = Object.freeze(
    inheritedMatrix.base_fixtures.map((fixture) =>
      freezeNoWriteResult({
        fixture_id: fixture.fixture_id,
        inherited_stable_id: fixture.stable_id,
        binding_id: `cp119.${fixture.fixture}.binding`,
        status: "bound_metadata_only",
        reason: "inherited_cp118_base_fixture_bound",
        evaluator_invoked: false,
        decision: null,
        ...createStableReplay(`base_${fixture.fixture}_fixture`, "bound_metadata_only"),
      }),
    ),
  );

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    inherited_pack_id: "CP00-118",
    inherited_golden_case_count: inheritedMatrix.golden_case_count,
    inherited_base_fixture_count: inheritedMatrix.base_fixture_count,
    workflow_case_count: workflowCases.length,
    base_fixture_binding_count: baseFixtureBindings.length,
    workflow_cases: workflowCases,
    base_fixture_bindings: baseFixtureBindings,
    hidden_source_fields: PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.hidden_source_fields,
    no_write_attestation: CP119_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp119FixtureWorkflowBindingManifest() {
  const rows = createPermissionKernelCp119FixtureWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp119CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const areaCounts = rows.reduce((counts, row) => {
    counts[row.area] = (counts[row.area] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp119FixtureWorkflowMatrix();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp119_fixture_workflow_binding_manifest",
    source_unit_range: PERMISSION_KERNEL_CP119_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    workflow_case_count: matrix.workflow_case_count,
    base_fixture_binding_count: matrix.base_fixture_binding_count,
    synthetic_only: true,
    no_real_data: true,
    risk_b_workflow_binding: true,
    metadata_only_fixture_workflow: true,
    no_write_attestation: CP119_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP119_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp119HermesEvidencePacket() {
  const manifest = createPermissionKernelCp119FixtureWorkflowBindingManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp119_fixture_workflow_binding_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-119",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp119ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp119_fixture_workflow_binding_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-119 closes the planned Risk B RP02 fixture workflow binding units, inherits CP118 synthetic fixture/golden cases, fail-closes denied/cross-tenant/missing-context/AI analytics cases, security-trims unauthorized results without count leakage, keeps audit hints preview-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, external share/export, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp119CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP119_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP119_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP119_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp119Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp119FixtureWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp119CoveredUnitIds();
  const manifest = createPermissionKernelCp119FixtureWorkflowBindingManifest();
  const matrix = createPermissionKernelCp119FixtureWorkflowMatrix();
  const handoff = createPermissionKernelCp119CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP119_PACK_BINDING.unit_count) errors.push("CP00-119 row count must be 40");
  if (unitIds.length !== PERMISSION_KERNEL_CP119_PACK_BINDING.unit_count) errors.push("CP00-119 covered unit count must be 40");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-119 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P05.M04.S08") errors.push("CP00-119 first unit must be RP02.P05.M04.S08");
  if (unitIds.at(-1) !== "RP02.P05.M06.S05") errors.push("CP00-119 last unit must be RP02.P05.M06.S05");
  if (manifest.covered_micro_phase_count !== 3) errors.push("CP00-119 must cover three micro phases");
  if (manifest.area_counts.permission_fixture_workflow_edge_cases !== 13) errors.push("CP00-119 edge-case area count must be 13");
  if (manifest.area_counts.permission_fixture_permission_audit_binding !== 22) errors.push("CP00-119 binding area count must be 22");
  if (manifest.area_counts.permission_fixture_synthetic_fixture_opening !== 5) errors.push("CP00-119 synthetic opening area count must be 5");
  if (manifest.deliverable_counts.implementation !== 14) errors.push("CP00-119 implementation deliverable count must be 14");
  if (manifest.deliverable_counts.security_audit !== 4) errors.push("CP00-119 security_audit deliverable count must be 4");
  if (manifest.deliverable_counts.fixture !== 13) errors.push("CP00-119 fixture deliverable count must be 13");
  if (manifest.deliverable_counts.test !== 6) errors.push("CP00-119 test deliverable count must be 6");
  if (manifest.deliverable_counts.hermes_evidence !== 2) errors.push("CP00-119 hermes_evidence deliverable count must be 2");
  if (manifest.deliverable_counts.claude_review !== 1) errors.push("CP00-119 claude_review deliverable count must be 1");
  if (matrix.inherited_golden_case_count !== 9) errors.push("CP00-119 must inherit nine CP118 golden cases");
  if (matrix.inherited_base_fixture_count !== 4) errors.push("CP00-119 must inherit four CP118 base fixtures");
  if (matrix.workflow_case_count !== CP119_WORKFLOW_CASE_IDS.length) errors.push("CP00-119 workflow case count must be 9");
  if (matrix.base_fixture_binding_count !== 4) errors.push("CP00-119 base fixture binding count must be 4");

  const caseById = Object.fromEntries(matrix.workflow_cases.map((item) => [item.case_id, item]));
  if (caseById.primary_golden_case?.status !== "completed_metadata_only") errors.push("CP00-119 primary golden case must complete metadata-only");
  if (caseById.secondary_golden_case?.reason !== "object_acl_allow") errors.push("CP00-119 secondary golden case must exercise object ACL allow");
  if (caseById.review_required_case?.status !== "review_required_routing") errors.push("CP00-119 review case must route to review_required");
  if (caseById.denied_case?.status !== "blocked_claim_output") errors.push("CP00-119 denied case must block claim output");
  if (caseById.cross_tenant_case?.reason !== "tenant_boundary_precheck_failed") errors.push("CP00-119 cross-tenant case must fail precheck");
  if (caseById.missing_context_case?.reason !== "matter_trace_precheck_failed") errors.push("CP00-119 missing-context case must fail precheck");
  if (caseById.audit_hint_case?.audit_hint?.emitted_to_audit_ledger !== false) errors.push("CP00-119 audit hint must remain preview-only");
  if (caseById.security_trimming_case?.trimmed_result_ids?.join(",") !== "d_cp119_document") {
    errors.push("CP00-119 security trimming must omit unauthorized resources without rendering counts");
  }
  if (caseById.ai_retrieval_or_analytics_case?.status !== "blocked_ai_analytics_boundary") {
    errors.push("CP00-119 AI analytics case must be blocked without execution");
  }

  for (const profile of [...matrix.workflow_cases, ...matrix.base_fixture_bindings]) {
    if (
      profile.unauthorized_count_exposed ||
      profile.hidden_field_names_exposed ||
      profile.mutates_permission_policy ||
      profile.writes_product_state ||
      profile.writes_audit_event ||
      profile.creates_database_rows ||
      profile.persists_idempotency_keys ||
      profile.acquires_locks ||
      profile.executes_rollback ||
      profile.executes_retry ||
      profile.executes_export_download ||
      profile.executes_external_share ||
      profile.executes_ai_retrieval ||
      profile.executes_analytics_query ||
      profile.grants_human_approval ||
      profile.implements_ldip
    ) {
      errors.push(`CP00-119 profile ${profile.case_id ?? profile.fixture_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-120" || handoff.next_subphase_id !== "RP02.P05.M06.S06") {
    errors.push("CP00-119 must hand off to CP00-120 / RP02.P05.M06.S06");
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    covered_unit_count: unitIds.length,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    next_pack_id: handoff.next_pack_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
