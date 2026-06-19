import { evaluatePermission } from "./evaluate.js";

export const PERMISSION_KERNEL_CP110_PACK_BINDING = Object.freeze({
  pack_id: "CP00-110",
  planned_pack_id: "CP00-110",
  risk_class: "B",
  unit_count: 40,
  range: "RP02.P02.M04.S07-RP02.P02.M06.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-109",
  next_pack_id: "CP00-111",
  next_subphase_id: "RP02.P02.M06.S03",
});

const CP110_SERVICE_WORKFLOW_PHASES = Object.freeze({
  "RP02.P02.M04": Object.freeze({
    start_index: 7,
    count: 16,
    micro_title: "Secondary Workflow Slice",
    phase_role: "service_secondary_workflow_slice",
  }),
  "RP02.P02.M05": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Permission And Audit Binding",
    phase_role: "service_permission_audit_binding",
  }),
  "RP02.P02.M06": Object.freeze({
    start_index: 1,
    count: 2,
    micro_title: "Synthetic Fixture Set",
    phase_role: "service_synthetic_fixture_set",
  }),
});

const SERVICE_TITLES = Object.freeze([
  "Service entrypoint contract",
  "Request normalization",
  "Tenant boundary precheck",
  "Matter trace precheck",
  "Permission precheck",
  "Audit hint precheck",
  "Primary happy path",
  "Secondary workflow path",
  "State transition enforcement",
  "Idempotency key handling",
  "Lock acquisition rule",
  "Persistence boundary",
  "Validation error mapping",
  "Review-required routing",
  "Approval-required routing",
  "Blocked-claim output",
  "Rollback behavior",
  "Retry behavior",
  "Unit test: happy path",
  "Unit test: denied path",
  "Unit test: review path",
  "Integration smoke case",
]);

const CP110_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_export_download: false,
  executes_external_share: false,
  grants_human_approval: false,
  executes_claude_review: false,
  implements_ldip: false,
});

export const PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp110_service_workflow_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP110_PACK_BINDING.range,
  upstream_model_service_pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP110_PACK_BINDING.unit_count,
  synthetic_only: true,
  service_workflow_execution: true,
  permission_evaluator_invoked_on_synthetic_inputs: true,
  no_write_attestation: CP110_NO_WRITE_ATTESTATION,
  workflow_entrypoints: Object.freeze([
    "execute_permission_kernel_cp110_workflow",
    "normalize_synthetic_service_workflow_request",
    "evaluate_synthetic_permission_decision",
    "route_permission_decision",
  ]),
  precheck_order: Object.freeze([
    "request_normalization",
    "synthetic_request_guard",
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_evaluator_invocation",
    "audit_hint_preview",
  ]),
  workflow_states: Object.freeze([
    "received",
    "normalized",
    "blocked_before_permission_evaluation",
    "permission_evaluated",
    "review_required_routing",
    "approval_required_routing",
    "blocked_claim_output",
    "completed_metadata_only",
  ]),
  decision_routes: Object.freeze({
    allow: "completed_metadata_only",
    deny: "blocked_claim_output",
    review_required: "review_required_routing",
    approval_required: "approval_required_routing",
  }),
  metadata_receipts: Object.freeze([
    "idempotency_receipt_metadata_only",
    "lock_receipt_metadata_only",
    "persistence_boundary_metadata_only",
    "rollback_reference_metadata_only",
    "retry_reference_metadata_only",
  ]),
  failure_boundaries: Object.freeze([
    "non_synthetic_request_blocks_before_permission_evaluation",
    "tenant_boundary_blocks_before_permission_evaluation",
    "matter_trace_blocks_before_permission_evaluation",
    "idempotency_key_is_not_persisted",
    "lock_is_not_acquired",
    "rollback_and_retry_are_not_executed",
    "audit_hint_is_preview_only_until_rp03",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP110_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 permission kernel synthetic fixture and boundary units from RP02.P02.M06.S03 without widening Risk A permission enforcement boundaries.",
  }),
});

function unitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function phaseIdFor(microPhaseId) {
  return microPhaseId.slice(0, "RP02.P00".length);
}

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function deliverableTypeFor(title) {
  if (title === "Service entrypoint contract") return "contract";
  if (title === "Permission precheck" || title === "Audit hint precheck") return "security_audit";
  if (title === "State transition enforcement" || title === "Lock acquisition rule" || title === "Approval-required routing") return "ui";
  if (title === "Review-required routing") return "claude_review";
  if (title === "Rollback behavior" || title === "Retry behavior") return "failure_recovery";
  if (title.startsWith("Unit test") || title === "Integration smoke case") return "test";
  return "implementation";
}

function coverageKindFor(title) {
  if (title.includes("entrypoint")) return "service_workflow_contract";
  if (title.includes("normalization")) return "request_normalization";
  if (title.includes("Tenant")) return "tenant_boundary";
  if (title.includes("Matter")) return "matter_trace";
  if (title.includes("Permission")) return "permission_evaluator_invocation";
  if (title.includes("Audit")) return "audit_hint_preview";
  if (title.includes("Primary happy")) return "allow_route";
  if (title.includes("Secondary workflow")) return "object_acl_route";
  if (title.includes("State transition")) return "state_transition_enforcement";
  if (title.includes("Idempotency")) return "idempotency_metadata_receipt";
  if (title.includes("Lock")) return "lock_metadata_receipt";
  if (title.includes("Persistence")) return "persistence_boundary";
  if (title.includes("Validation")) return "validation_error_mapping";
  if (title.includes("Review-required")) return "review_required_routing";
  if (title.includes("Approval-required")) return "approval_required_routing";
  if (title.includes("Blocked-claim")) return "blocked_claim_output";
  if (title.includes("Rollback")) return "rollback_reference";
  if (title.includes("Retry")) return "retry_reference";
  if (title.includes("test") || title.includes("smoke")) return "test_reference";
  return "service_workflow_reference";
}

function freezeCatalogRow(row) {
  return Object.freeze({
    ...row,
    source_unit_ids: Object.freeze(row.source_unit_ids),
    required_fields: Object.freeze(row.required_fields),
    boundary_flags: CP110_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    service_workflow_execution: true,
    permission_evaluator_invoked_on_synthetic_inputs: true,
  });
}

function buildRowsFor(microPhaseId, phase) {
  const rows = [];
  for (let offset = 0; offset < phase.count; offset += 1) {
    const index = phase.start_index + offset;
    const title = SERVICE_TITLES[index - 1];
    rows.push(
      freezeCatalogRow({
        catalog_id: `${microPhaseId}.${slugFor(title)}`,
        pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
        program_id: "RP02",
        area: "permission_service_workflow",
        phase_id: phaseIdFor(microPhaseId),
        micro_phase_id: microPhaseId,
        micro_title: phase.micro_title,
        phase_role: phase.phase_role,
        title,
        coverage_kind: coverageKindFor(title),
        deliverable_type: deliverableTypeFor(title),
        source_unit_ids: [unitIdFor(microPhaseId, index)],
        required_fields: [
          "pack_id",
          "program_id",
          "tenant_id",
          "matter_trace_reference",
          "permission_decision",
          "audit_hint_preview",
          "metadata_only_receipts",
        ],
        permission_decision_source: "evaluatePermission synthetic invocation",
        audit_hint_reference: "preview_only_until_rp03",
        matter_trace_reference: "precheck_blocks_matter_drift_before_evaluator",
        product_state_effect: "none",
      }),
    );
  }
  return rows;
}

export function createPermissionKernelCp110ServiceWorkflowCatalog() {
  return Object.freeze(
    Object.entries(CP110_SERVICE_WORKFLOW_PHASES).flatMap(([microPhaseId, phase]) => buildRowsFor(microPhaseId, phase)),
  );
}

export function createPermissionKernelCp110CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp110ServiceWorkflowCatalog().flatMap((item) => item.source_unit_ids));
}

function normalizePermissionKernelCp110WorkflowRequest(request = {}) {
  const principal = request.principal ?? {
    user_id: request.actor_id ?? "u_synthetic",
    tenant_id: request.tenant_id ?? "t_synthetic",
    role_ids: request.role_ids ?? ["attorney"],
  };
  const resource = request.resource ?? {
    resource_id: request.resource_id ?? "d_synthetic",
    resource_type: request.resource_type ?? "Document",
    tenant_id: request.resource_tenant_id ?? principal.tenant_id ?? "t_synthetic",
    matter_id: request.resource_matter_id ?? request.matter_id ?? "m_synthetic",
  };
  const resourceMatterId = Object.hasOwn(resource, "matter_id")
    ? resource.matter_id
    : (request.resource_matter_id ?? request.matter_id ?? null);
  return Object.freeze({
    request_id: request.request_id ?? "pk_cp110_workflow_synthetic",
    synthetic: request.synthetic !== false,
    principal: Object.freeze({
      user_id: principal.user_id ?? "u_synthetic",
      tenant_id: principal.tenant_id ?? request.tenant_id ?? "t_synthetic",
      role_ids: Object.freeze(principal.role_ids ?? ["attorney"]),
    }),
    resource: Object.freeze({
      resource_id: resource.resource_id ?? resource.document_id ?? "d_synthetic",
      resource_type: resource.resource_type ?? "Document",
      tenant_id: resource.tenant_id ?? request.resource_tenant_id ?? principal.tenant_id ?? "t_synthetic",
      matter_id: resourceMatterId,
    }),
    matter_id: request.matter_id ?? resource.matter_id ?? null,
    action: request.action ?? "document.view",
    rules: Object.freeze(request.rules ?? []),
    objectAcl: Object.freeze(request.objectAcl ?? request.object_acl ?? []),
    idempotency_key: request.idempotency_key ?? `cp110:${request.request_id ?? "synthetic"}`,
    lock_token: request.lock_token ?? `cp110-lock:${request.request_id ?? "synthetic"}`,
    persistence_mode: request.persistence_mode ?? "metadata_only",
  });
}

function blockedWorkflow(normalized, reason) {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
    workflow_id: "permission_kernel_cp110_service_workflow",
    status: "blocked_before_permission_evaluation",
    reason,
    normalized_request: normalized,
    evaluator_invoked: false,
    decision: Object.freeze({
      effect: "deny",
      reason,
      action: normalized.action,
      matched_rule_id: null,
      audit_hint: Object.freeze({
        actor_id: normalized.principal.user_id,
        action: normalized.action,
        object_id: reason === "tenant_boundary_precheck_failed" ? "redacted_cross_tenant_object" : normalized.resource.resource_id,
        tenant_id: normalized.principal.tenant_id,
        reason,
        effect: "deny",
      }),
    }),
    state_transition_path: Object.freeze(["received", "normalized", "blocked_before_permission_evaluation"]),
    idempotency_receipt: Object.freeze({
      key: normalized.idempotency_key,
      persisted: false,
      mode: "metadata_only",
    }),
    lock_receipt: Object.freeze({
      token: normalized.lock_token,
      acquired: false,
      mode: "metadata_only",
    }),
    persistence_boundary: Object.freeze({
      mode: normalized.persistence_mode,
      writes_product_state: false,
      writes_audit_event: false,
      creates_database_rows: false,
    }),
    rollback_behavior: Object.freeze({ executed: false, mode: "reference_only" }),
    retry_behavior: Object.freeze({ executed: false, mode: "reference_only" }),
    audit_hint_preview: Object.freeze({ emitted_to_audit_ledger: false, reason, effect: "deny" }),
    no_write_attestation: CP110_NO_WRITE_ATTESTATION,
  });
}

function routeForDecision(effect) {
  return PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.decision_routes[effect] ?? "blocked_claim_output";
}

export function executePermissionKernelCp110Workflow(request = {}) {
  const normalized = normalizePermissionKernelCp110WorkflowRequest(request);
  if (!normalized.synthetic) return blockedWorkflow(normalized, "non_synthetic_request_blocked");
  if (normalized.principal.tenant_id !== normalized.resource.tenant_id) {
    return blockedWorkflow(normalized, "tenant_boundary_precheck_failed");
  }
  const hasMatterTrace = Boolean(normalized.matter_id || normalized.resource.matter_id);
  if (hasMatterTrace && normalized.matter_id !== normalized.resource.matter_id) {
    return blockedWorkflow(normalized, "matter_trace_precheck_failed");
  }

  const decision = evaluatePermission({
    principal: normalized.principal,
    resource: normalized.resource,
    action: normalized.action,
    rules: normalized.rules,
    objectAcl: normalized.objectAcl,
  });
  const route = routeForDecision(decision.effect);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
    workflow_id: "permission_kernel_cp110_service_workflow",
    status: route,
    reason: decision.reason,
    normalized_request: normalized,
    evaluator_invoked: true,
    decision: Object.freeze(decision),
    state_transition_path: Object.freeze(["received", "normalized", "permission_evaluated", route]),
    idempotency_receipt: Object.freeze({
      key: normalized.idempotency_key,
      persisted: false,
      mode: "metadata_only",
    }),
    lock_receipt: Object.freeze({
      token: normalized.lock_token,
      acquired: false,
      mode: "metadata_only",
    }),
    persistence_boundary: Object.freeze({
      mode: normalized.persistence_mode,
      writes_product_state: false,
      writes_audit_event: false,
      creates_database_rows: false,
    }),
    rollback_behavior: Object.freeze({ executed: false, mode: "reference_only" }),
    retry_behavior: Object.freeze({ executed: false, mode: "reference_only" }),
    audit_hint_preview: Object.freeze({
      ...decision.audit_hint,
      emitted_to_audit_ledger: false,
      preview_only_until_rp03: true,
    }),
    no_write_attestation: CP110_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp110ServiceWorkflowManifest() {
  const rows = createPermissionKernelCp110ServiceWorkflowCatalog();
  const unitIds = createPermissionKernelCp110CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp110_service_workflow_manifest",
    source_unit_range: PERMISSION_KERNEL_CP110_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    area_counts: Object.freeze({ permission_service_workflow: rows.length }),
    phase_counts: Object.freeze(phaseCounts),
    deliverable_counts: Object.freeze(deliverableCounts),
    workflow_entrypoint_count: PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.workflow_entrypoints.length,
    workflow_state_count: PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.workflow_states.length,
    decision_route_count: Object.keys(PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.decision_routes).length,
    synthetic_only: true,
    no_real_data: true,
    service_workflow_execution: true,
    no_write_attestation: CP110_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP110_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp110HermesEvidencePacket() {
  const manifest = createPermissionKernelCp110ServiceWorkflowManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp110_service_workflow_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-110",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp110ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp110_service_workflow_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-110 closes the planned RP02 service workflow units with synthetic-only permission evaluator invocation, route mapping for allow/deny/review/approval, metadata-only idempotency/lock/persistence/rollback/retry receipts, no audit/product-state writes, no external share/export/AI/LDIP implementation, and handoff to CP00-111/RP02.P02.M06.S03.",
  });
}

export function createPermissionKernelCp110CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP110_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP110_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP110_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp110Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp110ServiceWorkflowCatalog();
  const unitIds = createPermissionKernelCp110CoveredUnitIds();
  const manifest = createPermissionKernelCp110ServiceWorkflowManifest();
  const handoff = createPermissionKernelCp110CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP110_PACK_BINDING.unit_count) errors.push("CP00-110 row count must be 40");
  if (unitIds.length !== PERMISSION_KERNEL_CP110_PACK_BINDING.unit_count) errors.push("CP00-110 covered unit count must be 40");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-110 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P02.M04.S07") errors.push("CP00-110 first unit must be RP02.P02.M04.S07");
  if (unitIds.at(-1) !== "RP02.P02.M06.S02") errors.push("CP00-110 last unit must be RP02.P02.M06.S02");
  if (manifest.phase_counts["RP02.P02.M04"] !== 16) errors.push("CP00-110 RP02.P02.M04 count must be 16");
  if (manifest.phase_counts["RP02.P02.M05"] !== 22) errors.push("CP00-110 RP02.P02.M05 count must be 22");
  if (manifest.phase_counts["RP02.P02.M06"] !== 2) errors.push("CP00-110 RP02.P02.M06 count must be 2");
  if (manifest.deliverable_counts.contract !== 2) errors.push("CP00-110 contract deliverable count must be 2");
  if (manifest.deliverable_counts.implementation !== 16) errors.push("CP00-110 implementation deliverable count must be 16");
  if (manifest.deliverable_counts.security_audit !== 2) errors.push("CP00-110 security_audit deliverable count must be 2");
  if (manifest.deliverable_counts.ui !== 6) errors.push("CP00-110 ui deliverable count must be 6");
  if (manifest.deliverable_counts.claude_review !== 2) errors.push("CP00-110 Claude review deliverable count must be 2");
  if (manifest.deliverable_counts.failure_recovery !== 4) errors.push("CP00-110 failure recovery deliverable count must be 4");
  if (manifest.deliverable_counts.test !== 8) errors.push("CP00-110 test deliverable count must be 8");
  for (const row of rows) {
    if (row.boundary_flags !== CP110_NO_WRITE_ATTESTATION) errors.push(`${row.catalog_id} must share no-write attestation`);
    if (!row.synthetic_only || !row.no_real_data || !row.service_workflow_execution) {
      errors.push(`${row.catalog_id} must stay synthetic service workflow only`);
    }
  }

  const allowWorkflow = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
    resource: { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" },
    matter_id: "m_001",
    action: "document.view",
    rules: [{ id: "allow_doc", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
  });
  const blockedWorkflowResult = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
    resource: { resource_id: "d_002", resource_type: "Document", tenant_id: "t_other", matter_id: "m_001" },
    matter_id: "m_001",
    action: "document.view",
  });
  if (allowWorkflow.status !== "completed_metadata_only") errors.push("CP00-110 allow workflow must complete metadata-only");
  if (!allowWorkflow.evaluator_invoked) errors.push("CP00-110 allow workflow must invoke evaluator");
  if (allowWorkflow.persistence_boundary.writes_product_state) errors.push("CP00-110 allow workflow must not write product state");
  if (blockedWorkflowResult.status !== "blocked_before_permission_evaluation") {
    errors.push("CP00-110 tenant drift workflow must block before evaluator");
  }
  if (blockedWorkflowResult.evaluator_invoked) errors.push("CP00-110 tenant drift workflow must not invoke evaluator");
  if (handoff.next_pack_id !== "CP00-111" || handoff.next_subphase_id !== "RP02.P02.M06.S03") {
    errors.push("CP00-110 must hand off to CP00-111 / RP02.P02.M06.S03");
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
