import { executePermissionKernelCp110Workflow } from "./service-workflow.js";

export const PERMISSION_KERNEL_CP111_PACK_BINDING = Object.freeze({
  pack_id: "CP00-111",
  planned_pack_id: "CP00-111",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P02.M06.S03-RP02.P02.M06.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-110",
  next_pack_id: "CP00-112",
  next_subphase_id: "RP02.P02.M06.S13",
});

const CP111_TITLES = Object.freeze([
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
]);

const CP111_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp111_synthetic_fixture_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP111_PACK_BINDING.range,
  upstream_service_workflow_pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP111_PACK_BINDING.unit_count,
  synthetic_only: true,
  risk_a_boundary_pack: true,
  fixture_boundary_execution: true,
  permission_evaluator_invoked_only_after_boundary_prechecks: true,
  no_write_attestation: CP111_NO_WRITE_ATTESTATION,
  required_fixture_profiles: Object.freeze([
    "tenant_boundary_block",
    "matter_trace_block",
    "permission_allow",
    "permission_deny",
    "audit_hint_preview",
    "secondary_object_acl_allow",
    "state_transition_review_required",
    "idempotency_receipt_metadata_only",
    "lock_receipt_metadata_only",
    "persistence_boundary_metadata_only",
  ]),
  fail_closed_profiles: Object.freeze(["tenant_boundary_block", "matter_trace_block", "permission_deny"]),
  metadata_only_profiles: Object.freeze([
    "audit_hint_preview",
    "idempotency_receipt_metadata_only",
    "lock_receipt_metadata_only",
    "persistence_boundary_metadata_only",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP111_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 permission kernel synthetic fixture, validation error, review, and closeout units from RP02.P02.M06.S13 without widening tenant, matter, idempotency, lock, persistence, audit, or permission mutation boundaries.",
  }),
});

function unitIdFor(index) {
  return `RP02.P02.M06.S${String(index).padStart(2, "0")}`;
}

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function deliverableTypeFor(title) {
  if (title === "Permission precheck" || title === "Audit hint precheck") return "security_audit";
  if (title === "State transition enforcement" || title === "Lock acquisition rule") return "ui";
  return "implementation";
}

function coverageKindFor(title) {
  if (title.includes("Tenant")) return "tenant_boundary";
  if (title.includes("Matter")) return "matter_trace";
  if (title.includes("Permission")) return "permission_precheck";
  if (title.includes("Audit")) return "audit_hint_preview";
  if (title.includes("Primary")) return "primary_happy_path";
  if (title.includes("Secondary")) return "secondary_object_acl_path";
  if (title.includes("State")) return "state_transition_review_route";
  if (title.includes("Idempotency")) return "idempotency_metadata_receipt";
  if (title.includes("Lock")) return "lock_metadata_receipt";
  if (title.includes("Persistence")) return "persistence_boundary";
  return "synthetic_fixture_boundary";
}

function fixtureProfileFor(title) {
  if (title.includes("Tenant")) return "tenant_boundary_block";
  if (title.includes("Matter")) return "matter_trace_block";
  if (title.includes("Permission")) return "permission_deny";
  if (title.includes("Audit")) return "audit_hint_preview";
  if (title.includes("Primary")) return "permission_allow";
  if (title.includes("Secondary")) return "secondary_object_acl_allow";
  if (title.includes("State")) return "state_transition_review_required";
  if (title.includes("Idempotency")) return "idempotency_receipt_metadata_only";
  if (title.includes("Lock")) return "lock_receipt_metadata_only";
  if (title.includes("Persistence")) return "persistence_boundary_metadata_only";
  return "synthetic_fixture_boundary";
}

function freezeRow(row) {
  return Object.freeze({
    ...row,
    source_unit_ids: Object.freeze(row.source_unit_ids),
    required_assertions: Object.freeze(row.required_assertions),
    boundary_flags: CP111_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
  });
}

export function createPermissionKernelCp111SyntheticFixtureBoundaryCatalog() {
  return Object.freeze(
    CP111_TITLES.map((title, offset) => {
      const index = offset + 3;
      const fixtureProfile = fixtureProfileFor(title);
      return freezeRow({
        catalog_id: `RP02.P02.M06.${slugFor(title)}`,
        pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
        program_id: "RP02",
        area: "permission_synthetic_fixture_boundary",
        phase_id: "RP02.P02",
        micro_phase_id: "RP02.P02.M06",
        micro_title: "Synthetic Fixture Set",
        phase_role: "service_synthetic_fixture_boundary",
        title,
        fixture_profile: fixtureProfile,
        coverage_kind: coverageKindFor(title),
        deliverable_type: deliverableTypeFor(title),
        source_unit_ids: [unitIdFor(index)],
        required_assertions: [
          "synthetic_only",
          "no_real_data",
          "no_permission_policy_mutation",
          "no_audit_write",
          "no_product_state_write",
          "metadata_only_receipts",
        ],
        product_state_effect: "none",
      });
    }),
  );
}

export function createPermissionKernelCp111CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp111SyntheticFixtureBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

function basePrincipal() {
  return Object.freeze({ user_id: "u_fixture", tenant_id: "t_fixture", role_ids: Object.freeze(["attorney"]) });
}

function baseResource(overrides = {}) {
  return Object.freeze({
    resource_id: "d_fixture",
    resource_type: "Document",
    tenant_id: "t_fixture",
    matter_id: "m_fixture",
    ...overrides,
  });
}

export function runPermissionKernelCp111SyntheticFixtureProfile(profileName) {
  const principal = basePrincipal();
  const allowRule = { id: "cp111_allow_doc", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" };
  const denyRule = { id: "cp111_deny_doc", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view" };
  const reviewRule = {
    id: "cp111_review_transition",
    effect: "review_required",
    role_id: "attorney",
    resource_type: "Document",
    action: "document.transition.request",
  };

  const scenarios = {
    tenant_boundary_block: {
      synthetic: true,
      principal,
      resource: baseResource({ tenant_id: "t_other" }),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
    },
    matter_trace_block: {
      synthetic: true,
      principal,
      resource: baseResource({ matter_id: "m_other" }),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
    },
    permission_allow: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
      idempotency_key: "cp111:permission_allow",
      lock_token: "cp111-lock:permission_allow",
    },
    permission_deny: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule, denyRule],
    },
    audit_hint_preview: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
    },
    secondary_object_acl_allow: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [],
      objectAcl: [{ id: "cp111_acl_allow", effect: "allow", principal_id: "u_fixture", action: "document.view" }],
    },
    state_transition_review_required: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.transition.request",
      rules: [reviewRule],
    },
    idempotency_receipt_metadata_only: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
      idempotency_key: "cp111:idempotency_receipt_metadata_only",
    },
    lock_receipt_metadata_only: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
      lock_token: "cp111-lock:lock_receipt_metadata_only",
    },
    persistence_boundary_metadata_only: {
      synthetic: true,
      principal,
      resource: baseResource(),
      matter_id: "m_fixture",
      action: "document.view",
      rules: [allowRule],
      persistence_mode: "metadata_only",
    },
  };

  if (!scenarios[profileName]) {
    return Object.freeze({
      pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
      profile_name: profileName,
      status: "blocked_invalid_fixture_profile",
      evaluator_invoked: false,
      no_write_attestation: CP111_NO_WRITE_ATTESTATION,
    });
  }

  const workflow = executePermissionKernelCp110Workflow(scenarios[profileName]);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
    profile_name: profileName,
    workflow,
    status: workflow.status,
    decision_effect: workflow.decision.effect,
    decision_reason: workflow.decision.reason,
    evaluator_invoked: workflow.evaluator_invoked,
    audit_hint_preview_only: workflow.audit_hint_preview?.emitted_to_audit_ledger === false,
    idempotency_persisted: workflow.idempotency_receipt.persisted,
    lock_acquired: workflow.lock_receipt.acquired,
    writes_product_state: workflow.persistence_boundary.writes_product_state,
    writes_audit_event: workflow.persistence_boundary.writes_audit_event,
    creates_database_rows: workflow.persistence_boundary.creates_database_rows,
    no_write_attestation: CP111_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp111SyntheticFixtureBoundaryMatrix() {
  return Object.freeze(
    PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.required_fixture_profiles.map((profile) =>
      runPermissionKernelCp111SyntheticFixtureProfile(profile),
    ),
  );
}

export function createPermissionKernelCp111SyntheticFixtureBoundaryManifest() {
  const rows = createPermissionKernelCp111SyntheticFixtureBoundaryCatalog();
  const unitIds = createPermissionKernelCp111CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp111SyntheticFixtureBoundaryMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp111_synthetic_fixture_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP111_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    area_counts: Object.freeze({ permission_synthetic_fixture_boundary: rows.length }),
    deliverable_counts: Object.freeze(deliverableCounts),
    fixture_profile_count: matrix.length,
    fail_closed_profile_count: matrix.filter((profile) => profile.status === "blocked_before_permission_evaluation" || profile.status === "blocked_claim_output").length,
    metadata_only_profile_count: matrix.filter(
      (profile) =>
        profile.idempotency_persisted === false &&
        profile.lock_acquired === false &&
        profile.writes_product_state === false &&
        profile.writes_audit_event === false &&
        profile.creates_database_rows === false,
    ).length,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    no_write_attestation: CP111_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP111_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp111HermesEvidencePacket() {
  const manifest = createPermissionKernelCp111SyntheticFixtureBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp111_synthetic_fixture_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-111",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp111ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp111_synthetic_fixture_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-111 closes the planned Risk A RP02 synthetic fixture boundary units with fail-closed tenant and matter prechecks, permission allow/deny and object-ACL paths, audit hint preview only, metadata-only idempotency/lock/persistence receipts, no audit/product-state/database writes, no external share/export/AI/LDIP implementation, and handoff to CP00-112/RP02.P02.M06.S13.",
  });
}

export function createPermissionKernelCp111CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP111_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP111_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP111_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp111Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp111SyntheticFixtureBoundaryCatalog();
  const unitIds = createPermissionKernelCp111CoveredUnitIds();
  const manifest = createPermissionKernelCp111SyntheticFixtureBoundaryManifest();
  const matrix = createPermissionKernelCp111SyntheticFixtureBoundaryMatrix();
  const handoff = createPermissionKernelCp111CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP111_PACK_BINDING.unit_count) errors.push("CP00-111 row count must be 10");
  if (unitIds.length !== PERMISSION_KERNEL_CP111_PACK_BINDING.unit_count) errors.push("CP00-111 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-111 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P02.M06.S03") errors.push("CP00-111 first unit must be RP02.P02.M06.S03");
  if (unitIds.at(-1) !== "RP02.P02.M06.S12") errors.push("CP00-111 last unit must be RP02.P02.M06.S12");
  if (manifest.deliverable_counts.implementation !== 6) errors.push("CP00-111 implementation deliverable count must be 6");
  if (manifest.deliverable_counts.security_audit !== 2) errors.push("CP00-111 security_audit deliverable count must be 2");
  if (manifest.deliverable_counts.ui !== 2) errors.push("CP00-111 ui deliverable count must be 2");
  if (manifest.fixture_profile_count !== 10) errors.push("CP00-111 must have 10 fixture profiles");
  if (manifest.metadata_only_profile_count !== 10) errors.push("CP00-111 fixture profiles must all be metadata-only");
  for (const row of rows) {
    if (row.boundary_flags !== CP111_NO_WRITE_ATTESTATION) errors.push(`${row.catalog_id} must share no-write attestation`);
    if (!row.synthetic_only || !row.no_real_data || !row.risk_a_boundary_pack) errors.push(`${row.catalog_id} must stay Risk A synthetic boundary only`);
  }

  const byName = Object.fromEntries(matrix.map((profile) => [profile.profile_name, profile]));
  if (byName.tenant_boundary_block?.status !== "blocked_before_permission_evaluation") errors.push("tenant fixture must block before evaluator");
  if (byName.tenant_boundary_block?.evaluator_invoked !== false) errors.push("tenant fixture must not invoke evaluator");
  if (byName.matter_trace_block?.status !== "blocked_before_permission_evaluation") errors.push("matter fixture must block before evaluator");
  if (byName.matter_trace_block?.evaluator_invoked !== false) errors.push("matter fixture must not invoke evaluator");
  if (byName.permission_allow?.status !== "completed_metadata_only") errors.push("permission allow fixture must complete metadata-only");
  if (byName.permission_allow?.decision_effect !== "allow") errors.push("permission allow fixture must allow");
  if (byName.permission_deny?.status !== "blocked_claim_output") errors.push("permission deny fixture must route to blocked claim");
  if (byName.permission_deny?.decision_effect !== "deny") errors.push("permission deny fixture must deny");
  if (byName.audit_hint_preview?.audit_hint_preview_only !== true) errors.push("audit hint fixture must stay preview-only");
  if (byName.secondary_object_acl_allow?.decision_reason !== "object_acl_allow") errors.push("secondary fixture must exercise object ACL allow");
  if (byName.state_transition_review_required?.status !== "review_required_routing") errors.push("state transition fixture must route to review");
  for (const profile of matrix) {
    if (profile.idempotency_persisted !== false) errors.push(`${profile.profile_name} must not persist idempotency`);
    if (profile.lock_acquired !== false) errors.push(`${profile.profile_name} must not acquire lock`);
    if (profile.writes_product_state !== false) errors.push(`${profile.profile_name} must not write product state`);
    if (profile.writes_audit_event !== false) errors.push(`${profile.profile_name} must not write audit event`);
    if (profile.creates_database_rows !== false) errors.push(`${profile.profile_name} must not create database rows`);
  }
  if (handoff.next_pack_id !== "CP00-112" || handoff.next_subphase_id !== "RP02.P02.M06.S13") {
    errors.push("CP00-111 must hand off to CP00-112 / RP02.P02.M06.S13");
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
