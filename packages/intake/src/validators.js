import {
  INTAKE_CORE_CP321_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP321_PACK_BINDING,
  INTAKE_CORE_CP321_REQUIREMENTS,
  INTAKE_CORE_CP322_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP322_PACK_BINDING,
  INTAKE_CORE_CP322_REQUIREMENTS,
  INTAKE_CORE_CP323_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP323_PACK_BINDING,
  INTAKE_CORE_CP323_REQUIREMENTS,
  INTAKE_CORE_CP324_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP324_PACK_BINDING,
  INTAKE_CORE_CP324_REQUIREMENTS,
  INTAKE_CORE_CP325_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP325_PACK_BINDING,
  INTAKE_CORE_CP325_REQUIREMENTS,
  INTAKE_CORE_CP326_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP326_PACK_BINDING,
  INTAKE_CORE_CP326_REQUIREMENTS,
  INTAKE_CORE_CP327_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP327_PACK_BINDING,
  INTAKE_CORE_CP327_REQUIREMENTS,
  INTAKE_CORE_CP328_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP328_PACK_BINDING,
  INTAKE_CORE_CP328_REQUIREMENTS,
  INTAKE_CORE_CP329_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP329_PACK_BINDING,
  INTAKE_CORE_CP329_REQUIREMENTS,
  INTAKE_CORE_CP330_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP330_PACK_BINDING,
  INTAKE_CORE_CP330_REQUIREMENTS,
  INTAKE_CORE_CP331_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP331_PACK_BINDING,
  INTAKE_CORE_CP331_REQUIREMENTS,
  INTAKE_CORE_CP332_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP332_PACK_BINDING,
  INTAKE_CORE_CP332_REQUIREMENTS,
  INTAKE_CORE_CP333_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP333_PACK_BINDING,
  INTAKE_CORE_CP333_REQUIREMENTS,
  INTAKE_CORE_CP334_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP334_PACK_BINDING,
  INTAKE_CORE_CP334_REQUIREMENTS,
  INTAKE_CORE_CP335_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP335_PACK_BINDING,
  INTAKE_CORE_CP335_REQUIREMENTS,
  INTAKE_CORE_CP336_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP336_PACK_BINDING,
  INTAKE_CORE_CP336_REQUIREMENTS,
  INTAKE_CORE_CP337_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP337_PACK_BINDING,
  INTAKE_CORE_CP337_REQUIREMENTS,
  INTAKE_CORE_CP338_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP338_PACK_BINDING,
  INTAKE_CORE_CP338_REQUIREMENTS,
  INTAKE_CORE_CP339_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP339_PACK_BINDING,
  INTAKE_CORE_CP339_REQUIREMENTS,
  INTAKE_CORE_CP340_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP340_PACK_BINDING,
  INTAKE_CORE_CP340_REQUIREMENTS,
  INTAKE_CORE_CP341_NO_WRITE_ATTESTATION,
  INTAKE_CORE_CP341_PACK_BINDING,
  INTAKE_CORE_CP341_REQUIREMENTS,
} from "./registry.js";
import {
  createIntakeCoreCp321ScopeContractFoundationCaseSet,
  createIntakeCoreCp321ScopeContractFoundationDescriptor,
  createIntakeCoreCp322P01CloseoutP02ServiceFoundationCaseSet,
  createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor,
  createIntakeCoreCp323ServiceSliceCaseSet,
  createIntakeCoreCp323ServiceSliceDescriptor,
  createIntakeCoreCp324ServiceReviewSliceCaseSet,
  createIntakeCoreCp324ServiceReviewSliceDescriptor,
  createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationCaseSet,
  createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  createIntakeCoreCp326UiWorkflowSliceCaseSet,
  createIntakeCoreCp326UiWorkflowSliceDescriptor,
  createIntakeCoreCp327PermissionAuditFixtureCaseSet,
  createIntakeCoreCp327PermissionAuditFixtureDescriptor,
  createIntakeCoreCp328P04CloseoutP05PermissionFoundationCaseSet,
  createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor,
  createIntakeCoreCp329PermissionFixtureTailCaseSet,
  createIntakeCoreCp329PermissionFixtureTailDescriptor,
  createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationCaseSet,
  createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor,
  createIntakeCoreCp331PermissionMatrixSliceCaseSet,
  createIntakeCoreCp331PermissionMatrixSliceDescriptor,
  createIntakeCoreCp332PermissionBindingSliceCaseSet,
  createIntakeCoreCp332PermissionBindingSliceDescriptor,
  createIntakeCoreCp333P06CloseoutP07FailureFoundationCaseSet,
  createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor,
  createIntakeCoreCp334FailureSliceCaseSet,
  createIntakeCoreCp334FailureSliceDescriptor,
  createIntakeCoreCp335FailureBindingSliceCaseSet,
  createIntakeCoreCp335FailureBindingSliceDescriptor,
  createIntakeCoreCp336FailureTailSliceCaseSet,
  createIntakeCoreCp336FailureTailSliceDescriptor,
  createIntakeCoreCp337P07CloseoutP08HermesFoundationCaseSet,
  createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor,
  createIntakeCoreCp338HermesSliceCaseSet,
  createIntakeCoreCp338HermesSliceDescriptor,
  createIntakeCoreCp339P08CloseoutP09ReviewFoundationCaseSet,
  createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor,
  createIntakeCoreCp340ReviewSliceCaseSet,
  createIntakeCoreCp340ReviewSliceDescriptor,
  createIntakeCoreCp341ReviewCloseoutSliceCaseSet,
  createIntakeCoreCp341ReviewCloseoutSliceDescriptor,
  intakeCoreRowKey,
} from "./service.js";

function countBy(units, field) {
  const counts = {};
  for (const unit of units) {
    const key = unit?.[field];
    if (key === undefined) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function freezeCp321Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP321_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP321_NO_WRITE_ATTESTATION,
  });
}

function freezeCp322Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP322_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP322_NO_WRITE_ATTESTATION,
  });
}

export function createIntakeCoreCp321CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp321Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp321Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-321 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP321_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-321");
  if (planPack?.risk_class !== INTAKE_CORE_CP321_PACK_BINDING.risk_class) errors.push("CP00-321 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP321_PACK_BINDING.unit_count) errors.push("CP00-321 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP321_PACK_BINDING.first_unit_id) errors.push("CP00-321 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP321_PACK_BINDING.last_unit_id) errors.push("CP00-321 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-321 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-321 must only include RP10 units");
  const summary = createIntakeCoreCp321CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-321 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-321 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-321 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-321 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-321 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-321 ${microId} missing row ${title}`);
    }
  }
  return freezeCp321Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp321ScopeContractFoundationDescriptor(
  descriptor = createIntakeCoreCp321ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createIntakeCoreCp321ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp321ScopeContractFoundationDescriptor") errors.push("CP00-321 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP10") errors.push("CP00-321 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP08") errors.push("CP00-321 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows).length) errors.push("CP00-321 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-321 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-321 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-321 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-321 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-321 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-321 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-321 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP321_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.non_goal_boundary && rows.non_goal_boundary.intake_runtime_opened !== false) {
      errors.push(`CP00-321 ${microId} must not open intake runtime`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.permission_decision_detail_included !== false) {
      errors.push(`CP00-321 ${microId} permission baseline must not expose decisions`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-321 ${microId} permission baseline must deny cross-tenant access`);
    }
    if (rows.audit_baseline_note && rows.audit_baseline_note.audit_event_body_included !== false) {
      errors.push(`CP00-321 ${microId} audit baseline must not expose event bodies`);
    }
    if (rows.synthetic_data_policy && rows.synthetic_data_policy.real_client_data_loaded !== false) {
      errors.push(`CP00-321 ${microId} synthetic data policy drift`);
    }
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-321 ${microId} tenant scope must deny cross-tenant access`);
    }
    if (rows.matter_trace_reference && rows.matter_trace_reference.matter_trace_required !== true) {
      errors.push(`CP00-321 ${microId} matter trace must be required`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-321 ${microId} state transition map must not write state`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-321 ${microId} fixture model must not load real data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-321 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-321 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-321 ${microId} must not claim Claude final approval`);
    }
  }
  if (INTAKE_CORE_CP321_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-321 must not promote Claude");
  if (INTAKE_CORE_CP321_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-321 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-321 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-321 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP321_PACK_BINDING.pack_id,
      INTAKE_CORE_CP322_PACK_BINDING.pack_id,
      INTAKE_CORE_CP323_PACK_BINDING.pack_id,
      INTAKE_CORE_CP324_PACK_BINDING.pack_id,
      INTAKE_CORE_CP325_PACK_BINDING.pack_id,
      INTAKE_CORE_CP326_PACK_BINDING.pack_id,
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-321 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-321 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP321_PACK_BINDING.next_pack_id) errors.push("CP00-321 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP321_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-321 next subphase drift");
  }
  return freezeCp321Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp321HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp321ScopeContractFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp321Coverage(planPack);
  const foundation = validateIntakeCoreCp321ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp321Validation({
    evidence_packet: "H10.CP00-321.intake_core_scope_contract_foundation_descriptor",
    gate: INTAKE_CORE_CP321_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_email_dms_core_pack_id: INTAKE_CORE_CP321_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP321_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP321_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP321_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp321ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp321Coverage(planPack);
  const foundation = validateIntakeCoreCp321ScopeContractFoundationDescriptor(createIntakeCoreCp321ScopeContractFoundationDescriptor(), {});
  return freezeCp321Validation({
    review_packet: "C10.CP00-321.intake_core_scope_contract_foundation_descriptor",
    gate: INTAKE_CORE_CP321_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP321_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP321_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-321 cover exactly the 150 planned RP10 units from RP10.P00.M00.S01 through RP10.P01.M08.S05?",
      "Do the twenty descriptor sections (P00 M00-M10 scope foundation cycle and P01 M00-M08 model foundation cycle with package directory layout, primary entity identifier, tenant scope field, matter trace reference, lifecycle status enum, ownership metadata, reference relationship map, field registries, state transition map, validation helper, fixture model, serialization shape, public export, model tests, Hermes model summary, Claude model review prompt, and closeout handoff) cover every planned row title as descriptor-only rows?",
      "Does CP00-321 avoid intake/conflict-check/waiver/engagement runtime, runtime permission evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, real data, permission decision leaks, audit event body leaks, fixture payload leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp321CloseoutHandoff() {
  return freezeCp321Validation({
    handoff_id: "CP00-321-to-CP00-322",
    from_pack_id: INTAKE_CORE_CP321_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP321_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP321_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP321_PACK_BINDING.range,
    open_scope: "Continue RP10.P01.M08.S06 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP321_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp323Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP323_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP323_NO_WRITE_ATTESTATION,
  });
}

function freezeCp324Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP324_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP324_NO_WRITE_ATTESTATION,
  });
}

function freezeCp325Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP325_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP325_NO_WRITE_ATTESTATION,
  });
}

function freezeCp326Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP326_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP326_NO_WRITE_ATTESTATION,
  });
}

function freezeCp327Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP327_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP327_NO_WRITE_ATTESTATION,
  });
}

function freezeCp328Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP328_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP328_NO_WRITE_ATTESTATION,
  });
}

function freezeCp329Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP329_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP329_NO_WRITE_ATTESTATION,
  });
}

function freezeCp330Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP330_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP330_NO_WRITE_ATTESTATION,
  });
}

function freezeCp331Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP331_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP331_NO_WRITE_ATTESTATION,
  });
}

function freezeCp332Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP332_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP332_NO_WRITE_ATTESTATION,
  });
}

function freezeCp333Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP333_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP333_NO_WRITE_ATTESTATION,
  });
}

function freezeCp334Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP334_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP334_NO_WRITE_ATTESTATION,
  });
}

function freezeCp335Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP335_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP335_NO_WRITE_ATTESTATION,
  });
}

function freezeCp336Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP336_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP336_NO_WRITE_ATTESTATION,
  });
}

function freezeCp337Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP337_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP337_NO_WRITE_ATTESTATION,
  });
}

function freezeCp338Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP338_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP338_NO_WRITE_ATTESTATION,
  });
}

function freezeCp339Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP339_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP339_NO_WRITE_ATTESTATION,
  });
}

function freezeCp340Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP340_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP340_NO_WRITE_ATTESTATION,
  });
}

function freezeCp341Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    no_write_attestation: INTAKE_CORE_CP341_NO_WRITE_ATTESTATION,
  });
}

export function createIntakeCoreCp322CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp322Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp322Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-322 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP322_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-322");
  if (planPack?.risk_class !== INTAKE_CORE_CP322_PACK_BINDING.risk_class) errors.push("CP00-322 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP322_PACK_BINDING.unit_count) errors.push("CP00-322 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP322_PACK_BINDING.first_unit_id) errors.push("CP00-322 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP322_PACK_BINDING.last_unit_id) errors.push("CP00-322 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-322 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-322 must only include RP10 units");
  const summary = createIntakeCoreCp322CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-322 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-322 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-322 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-322 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-322 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-322 ${microId} missing row ${title}`);
    }
  }
  return freezeCp322Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(
  descriptor = createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_service_foundation_case_set ?? createIntakeCoreCp322P01CloseoutP02ServiceFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor") errors.push("CP00-322 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "IntakeCoreCp321ScopeContractFoundationDescriptor") {
    errors.push("CP00-322 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows).length) errors.push("CP00-322 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-322 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-322 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-322 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-322 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-322 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-322 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-322 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP322_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-322 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.matter_trace_precheck && rows.matter_trace_precheck.matter_trace_required !== true) {
      errors.push(`CP00-322 ${microId} matter trace must be required`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-322 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-322 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-322 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-322 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-322 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-322 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-322 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-322 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-322 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-322 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-322 ${microId} must not execute test runtime`);
    }
    if (rows.integration_smoke_case && rows.integration_smoke_case.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-322 ${microId} must not dispatch integration smoke runtime`);
    }
  }
  if (INTAKE_CORE_CP322_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-322 must not promote Claude");
  if (INTAKE_CORE_CP322_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-322 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-322 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-322 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP322_PACK_BINDING.pack_id,
      INTAKE_CORE_CP323_PACK_BINDING.pack_id,
      INTAKE_CORE_CP324_PACK_BINDING.pack_id,
      INTAKE_CORE_CP325_PACK_BINDING.pack_id,
      INTAKE_CORE_CP326_PACK_BINDING.pack_id,
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-322 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_service_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_service_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-322 contract p01_closeout_p02_service_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP322_PACK_BINDING.next_pack_id) errors.push("CP00-322 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP322_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-322 next subphase drift");
  }
  return freezeCp322Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp322HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp322Coverage(planPack);
  const foundation = validateIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(descriptor, contractProjection);
  return freezeCp322Validation({
    evidence_packet: "H10.CP00-322.intake_core_p01_closeout_p02_service_foundation_descriptor",
    gate: INTAKE_CORE_CP322_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: INTAKE_CORE_CP322_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP322_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP322_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP322_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp322ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp322Coverage(planPack);
  const foundation = validateIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(createIntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor(), {});
  return freezeCp322Validation({
    review_packet: "C10.CP00-322.intake_core_p01_closeout_p02_service_foundation_descriptor",
    gate: INTAKE_CORE_CP322_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP322_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP322_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-322 cover exactly the 150 planned RP10 units from RP10.P01.M08.S06 through RP10.P02.M07.S06?",
      "Do the eleven descriptor sections (P01 M08 Hermes tail, M09 Claude review packet, M10 closeout head, and eight P02 service micros with service entrypoint contracts, request normalization, tenant/matter/permission/audit prechecks, happy and workflow paths, state transition enforcement, idempotency key handling, lock acquisition rules, persistence boundaries, validation error mapping, review/approval routing, blocked-claim outputs, rollback/retry behavior, unit tests, and integration smoke cases) cover every planned row title as descriptor-only rows?",
      "Does CP00-322 avoid intake/conflict-check/waiver/engagement runtime, runtime permission evaluation, state writes, idempotency key persistence, runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, integration smoke runtime, Hermes runtime receipts, permission decision leaks, audit hint leaks, validation error leaks, blocked-claim detail leaks, lock token leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp322CloseoutHandoff() {
  return freezeCp322Validation({
    handoff_id: "CP00-322-to-CP00-323",
    from_pack_id: INTAKE_CORE_CP322_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP322_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP322_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP322_PACK_BINDING.range,
    open_scope: "RP10.P01 descriptor scope is closed; continue RP10.P02.M07.S07 onward with the remaining service rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP322_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp323CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp323Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp323Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-323 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP323_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-323");
  if (planPack?.risk_class !== INTAKE_CORE_CP323_PACK_BINDING.risk_class) errors.push("CP00-323 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP323_PACK_BINDING.unit_count) errors.push("CP00-323 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP323_PACK_BINDING.first_unit_id) errors.push("CP00-323 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP323_PACK_BINDING.last_unit_id) errors.push("CP00-323 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-323 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-323 must only include RP10 units");
  const summary = createIntakeCoreCp323CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-323 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-323 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-323 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-323 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-323 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-323 ${microId} missing row ${title}`);
    }
  }
  return freezeCp323Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp323ServiceSliceDescriptor(
  descriptor = createIntakeCoreCp323ServiceSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_slice_case_set ?? createIntakeCoreCp323ServiceSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp323ServiceSliceDescriptor") errors.push("CP00-323 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_service_foundation_descriptor !== "IntakeCoreCp322P01CloseoutP02ServiceFoundationDescriptor") {
    errors.push("CP00-323 source p01 closeout p02 service foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows).length) errors.push("CP00-323 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-323 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-323 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-323 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-323 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-323 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-323 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-323 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP323_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-323 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.matter_trace_precheck && rows.matter_trace_precheck.matter_trace_required !== true) {
      errors.push(`CP00-323 ${microId} matter trace must be required`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-323 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-323 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-323 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-323 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-323 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-323 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-323 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-323 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-323 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-323 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-323 ${microId} must not execute test runtime`);
    }
    if (rows.integration_smoke_case && rows.integration_smoke_case.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-323 ${microId} must not dispatch integration smoke runtime`);
    }
  }
  if (INTAKE_CORE_CP323_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-323 must not promote Claude");
  if (INTAKE_CORE_CP323_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-323 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-323 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-323 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP323_PACK_BINDING.pack_id,
      INTAKE_CORE_CP324_PACK_BINDING.pack_id,
      INTAKE_CORE_CP325_PACK_BINDING.pack_id,
      INTAKE_CORE_CP326_PACK_BINDING.pack_id,
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-323 contract current_pack drift");
  }
  if (
    contractProjection?.service_slice_descriptor?.descriptor &&
    contractProjection.service_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-323 contract service_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP323_PACK_BINDING.next_pack_id) errors.push("CP00-323 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP323_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-323 next subphase drift");
  }
  return freezeCp323Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp323HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp323ServiceSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp323Coverage(planPack);
  const slice = validateIntakeCoreCp323ServiceSliceDescriptor(descriptor, contractProjection);
  return freezeCp323Validation({
    evidence_packet: "H10.CP00-323.intake_core_service_slice_descriptor",
    gate: INTAKE_CORE_CP323_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_service_foundation_pack_id: INTAKE_CORE_CP323_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP323_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP323_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP323_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp323ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp323Coverage(planPack);
  const slice = validateIntakeCoreCp323ServiceSliceDescriptor(createIntakeCoreCp323ServiceSliceDescriptor(), {});
  return freezeCp323Validation({
    review_packet: "C10.CP00-323.intake_core_service_slice_descriptor",
    gate: INTAKE_CORE_CP323_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP323_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP323_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-323 cover exactly the 40 planned RP10 units from RP10.P02.M07.S07 through RP10.P02.M09.S02?",
      "Do the three descriptor sections (P02 M07 test/golden tail with the sixteen service rows from primary happy path through integration smoke case, M08 Hermes evidence packet full service cycle, and M09 Claude review packet head with service entrypoint contract and request normalization) cover every planned row title as descriptor-only rows?",
      "Does CP00-323 avoid intake/conflict-check/waiver/engagement runtime, state writes, idempotency key persistence, runtime locks, database writes, rollback/retry runtime, test runtime paths, integration smoke runtime, Hermes runtime receipts, permission decision leaks, audit hint leaks, validation error leaks, blocked-claim leaks, lock token leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp323CloseoutHandoff() {
  return freezeCp323Validation({
    handoff_id: "CP00-323-to-CP00-324",
    from_pack_id: INTAKE_CORE_CP323_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP323_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP323_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP323_PACK_BINDING.range,
    open_scope: "Continue RP10.P02.M09.S03 onward with the remaining service review rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP323_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp324CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp324Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp324Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-324 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP324_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-324");
  if (planPack?.risk_class !== INTAKE_CORE_CP324_PACK_BINDING.risk_class) errors.push("CP00-324 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP324_PACK_BINDING.unit_count) errors.push("CP00-324 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP324_PACK_BINDING.first_unit_id) errors.push("CP00-324 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP324_PACK_BINDING.last_unit_id) errors.push("CP00-324 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-324 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-324 must only include RP10 units");
  const summary = createIntakeCoreCp324CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-324 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-324 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-324 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-324 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-324 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-324 ${microId} missing row ${title}`);
    }
  }
  return freezeCp324Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp324ServiceReviewSliceDescriptor(
  descriptor = createIntakeCoreCp324ServiceReviewSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_review_slice_case_set ?? createIntakeCoreCp324ServiceReviewSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp324ServiceReviewSliceDescriptor") errors.push("CP00-324 descriptor type drift");
  if (descriptor.source_service_slice_descriptor !== "IntakeCoreCp323ServiceSliceDescriptor") {
    errors.push("CP00-324 source service slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows).length) errors.push("CP00-324 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-324 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-324 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-324 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-324 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-324 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-324 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-324 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP324_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-324 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.matter_trace_precheck && rows.matter_trace_precheck.matter_trace_required !== true) {
      errors.push(`CP00-324 ${microId} matter trace must be required`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-324 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-324 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-324 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-324 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-324 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-324 ${microId} must not create database rows`);
    }
  }
  if (INTAKE_CORE_CP324_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-324 must not promote Claude");
  if (INTAKE_CORE_CP324_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-324 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-324 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-324 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP324_PACK_BINDING.pack_id,
      INTAKE_CORE_CP325_PACK_BINDING.pack_id,
      INTAKE_CORE_CP326_PACK_BINDING.pack_id,
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-324 contract current_pack drift");
  }
  if (
    contractProjection?.service_review_slice_descriptor?.descriptor &&
    contractProjection.service_review_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-324 contract service_review_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP324_PACK_BINDING.next_pack_id) errors.push("CP00-324 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP324_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-324 next subphase drift");
  }
  return freezeCp324Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp324HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp324ServiceReviewSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp324Coverage(planPack);
  const slice = validateIntakeCoreCp324ServiceReviewSliceDescriptor(descriptor, contractProjection);
  return freezeCp324Validation({
    evidence_packet: "H10.CP00-324.intake_core_service_review_slice_descriptor",
    gate: INTAKE_CORE_CP324_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_review_slice_valid: slice.valid,
    no_real_data: true,
    source_service_slice_pack_id: INTAKE_CORE_CP324_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP324_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP324_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP324_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp324ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp324Coverage(planPack);
  const slice = validateIntakeCoreCp324ServiceReviewSliceDescriptor(createIntakeCoreCp324ServiceReviewSliceDescriptor(), {});
  return freezeCp324Validation({
    review_packet: "C10.CP00-324.intake_core_service_review_slice_descriptor",
    gate: INTAKE_CORE_CP324_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP324_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_review_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP324_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-324 cover exactly the 10 planned RP10 units from RP10.P02.M09.S03 through RP10.P02.M09.S12?",
      "Does the single descriptor section (P02 M09 Claude review packet middle rows from tenant boundary precheck through persistence boundary) cover every planned row title as descriptor-only rows?",
      "Does CP00-324 avoid intake/conflict-check/waiver/engagement runtime, state writes, idempotency key persistence, runtime locks, database writes, Hermes runtime receipts, permission decision leaks, audit hint leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp324CloseoutHandoff() {
  return freezeCp324Validation({
    handoff_id: "CP00-324-to-CP00-325",
    from_pack_id: INTAKE_CORE_CP324_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP324_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP324_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP324_PACK_BINDING.range,
    open_scope: "Continue RP10.P02.M09.S13 onward with the remaining service review rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP324_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp325CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp325Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp325Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-325 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP325_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-325");
  if (planPack?.risk_class !== INTAKE_CORE_CP325_PACK_BINDING.risk_class) errors.push("CP00-325 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP325_PACK_BINDING.unit_count) errors.push("CP00-325 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP325_PACK_BINDING.first_unit_id) errors.push("CP00-325 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP325_PACK_BINDING.last_unit_id) errors.push("CP00-325 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-325 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-325 must only include RP10 units");
  const summary = createIntakeCoreCp325CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-325 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-325 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-325 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-325 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-325 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-325 ${microId} missing row ${title}`);
    }
  }
  return freezeCp325Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(
  descriptor = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_interface_p04_ui_foundation_case_set ?? createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor") errors.push("CP00-325 descriptor type drift");
  if (descriptor.source_service_review_slice_descriptor !== "IntakeCoreCp324ServiceReviewSliceDescriptor") {
    errors.push("CP00-325 source service review slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows).length) errors.push("CP00-325 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-325 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-325 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-325 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-325 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-325 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-325 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-325 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP325_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-325 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.permission_annotation && rows.permission_annotation.permission_decision_detail_included !== false) {
      errors.push(`CP00-325 ${microId} permission annotation must not expose decisions`);
    }
    if (rows.audit_annotation && rows.audit_annotation.audit_hint_detail_included !== false) {
      errors.push(`CP00-325 ${microId} audit annotation must not expose hints`);
    }
    if (rows.pagination_or_filtering_contract && rows.pagination_or_filtering_contract.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-325 ${microId} pagination must not leak unauthorized counts`);
    }
    if (rows.unauthorized_data_omission && rows.unauthorized_data_omission.unauthorized_data_omitted !== true) {
      errors.push(`CP00-325 ${microId} unauthorized data must be omitted`);
    }
    if (rows.api_fixture && rows.api_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-325 ${microId} API fixture must stay synthetic`);
    }
    if (rows.contract_test && rows.contract_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-325 ${microId} contract test must not execute runtime`);
    }
    if (rows.hermes_api_evidence && rows.hermes_api_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-325 ${microId} must not emit Hermes API receipts`);
    }
    if (rows.claude_interface_prompt && rows.claude_interface_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-325 ${microId} interface prompt must not claim final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-325 ${microId} command rerun must not execute runtime`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-325 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-325 ${microId} denied state must not expose decisions`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-325 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-325 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-325 ${microId} must not perform rollback runtime`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-325 ${microId} must not acquire runtime locks`);
    }
  }
  if (INTAKE_CORE_CP325_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-325 must not promote Claude");
  if (INTAKE_CORE_CP325_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-325 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-325 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-325 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP325_PACK_BINDING.pack_id,
      INTAKE_CORE_CP326_PACK_BINDING.pack_id,
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-325 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_interface_p04_ui_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_interface_p04_ui_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-325 contract p02_closeout_p03_interface_p04_ui_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP325_PACK_BINDING.next_pack_id) errors.push("CP00-325 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP325_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-325 next subphase drift");
  }
  return freezeCp325Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp325HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp325Coverage(planPack);
  const foundation = validateIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(descriptor, contractProjection);
  return freezeCp325Validation({
    evidence_packet: "H10.CP00-325.intake_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
    gate: INTAKE_CORE_CP325_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_p04_ui_foundation_valid: foundation.valid,
    no_real_data: true,
    source_service_review_slice_pack_id: INTAKE_CORE_CP325_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP325_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP325_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP325_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp325ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp325Coverage(planPack);
  const foundation = validateIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(createIntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor(), {});
  return freezeCp325Validation({
    review_packet: "C10.CP00-325.intake_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
    gate: INTAKE_CORE_CP325_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP325_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_p04_ui_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP325_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-325 cover exactly the 150 planned RP10 units from RP10.P02.M09.S13 through RP10.P04.M02.S07?",
      "Do the sixteen descriptor sections (P02 M09 service review tail and M10 closeout head, the full P03 interface cycle M00-M10 with public export maps, request/response contracts, error code taxonomies, permission/audit annotations, pagination contracts, serialization guards, unauthorized data omission, API fixtures, contract/invalid/denied tests, Hermes API evidence, Claude interface prompts, documentation examples, versioning notes, closeout handoffs, downstream consumer notes, and command reruns, and the P04 UI head M00-M02 with UI surface inventories, data dependency maps, loading/empty/denied/review-required states, and primary/secondary interactions) cover every planned row title as descriptor-only rows?",
      "Does CP00-325 avoid API handler execution, UI runtime, permission decision leaks, audit hint leaks, unauthorized count leaks, fixture payload leaks, Hermes runtime receipts, command runtime execution, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp325CloseoutHandoff() {
  return freezeCp325Validation({
    handoff_id: "CP00-325-to-CP00-326",
    from_pack_id: INTAKE_CORE_CP325_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP325_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP325_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP325_PACK_BINDING.range,
    open_scope: "RP10.P02 and RP10.P03 descriptor scopes are closed; continue RP10.P04.M02.S08 onward with the remaining UI rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP325_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp326CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp326Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp326Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-326 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP326_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-326");
  if (planPack?.risk_class !== INTAKE_CORE_CP326_PACK_BINDING.risk_class) errors.push("CP00-326 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP326_PACK_BINDING.unit_count) errors.push("CP00-326 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP326_PACK_BINDING.first_unit_id) errors.push("CP00-326 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP326_PACK_BINDING.last_unit_id) errors.push("CP00-326 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-326 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-326 must only include RP10 units");
  const summary = createIntakeCoreCp326CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-326 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-326 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-326 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-326 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-326 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-326 ${microId} missing row ${title}`);
    }
  }
  return freezeCp326Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp326UiWorkflowSliceDescriptor(
  descriptor = createIntakeCoreCp326UiWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_workflow_slice_case_set ?? createIntakeCoreCp326UiWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp326UiWorkflowSliceDescriptor") errors.push("CP00-326 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_interface_p04_ui_foundation_descriptor !== "IntakeCoreCp325P02CloseoutP03InterfaceP04UiFoundationDescriptor") {
    errors.push("CP00-326 source p02 closeout p03 interface p04 ui foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows).length) errors.push("CP00-326 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-326 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-326 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-326 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-326 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-326 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-326 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-326 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP326_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-326 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-326 ${microId} audit hint display must not expose hints`);
    }
    if (rows.error_message_copy && rows.error_message_copy.validation_error_detail_included !== false) {
      errors.push(`CP00-326 ${microId} error message copy must stay customer-safe`);
    }
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-326 ${microId} fixture binding must stay synthetic`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-326 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.hermes_ui_evidence && rows.hermes_ui_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-326 ${microId} must not emit Hermes UI receipts`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-326 ${microId} UI leak detected`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-326 ${microId} denied state must not expose decisions`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-326 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.no_unauthorized_count_leak && rows.no_unauthorized_count_leak.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-326 ${microId} unauthorized count leak guard drift`);
    }
    if (rows.state_snapshot && rows.state_snapshot.raw_payload_included !== false) {
      errors.push(`CP00-326 ${microId} state snapshot must not include raw payload`);
    }
  }
  if (INTAKE_CORE_CP326_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-326 must not promote Claude");
  if (INTAKE_CORE_CP326_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-326 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-326 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-326 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP326_PACK_BINDING.pack_id,
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-326 contract current_pack drift");
  }
  if (
    contractProjection?.ui_workflow_slice_descriptor?.descriptor &&
    contractProjection.ui_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-326 contract ui_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP326_PACK_BINDING.next_pack_id) errors.push("CP00-326 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP326_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-326 next subphase drift");
  }
  return freezeCp326Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp326HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp326UiWorkflowSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp326Coverage(planPack);
  const slice = validateIntakeCoreCp326UiWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp326Validation({
    evidence_packet: "H10.CP00-326.intake_core_ui_workflow_slice_descriptor",
    gate: INTAKE_CORE_CP326_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_closeout_p03_interface_p04_ui_foundation_pack_id: INTAKE_CORE_CP326_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP326_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP326_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP326_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp326ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp326Coverage(planPack);
  const slice = validateIntakeCoreCp326UiWorkflowSliceDescriptor(createIntakeCoreCp326UiWorkflowSliceDescriptor(), {});
  return freezeCp326Validation({
    review_packet: "C10.CP00-326.intake_core_ui_workflow_slice_descriptor",
    gate: INTAKE_CORE_CP326_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP326_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP326_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-326 cover exactly the 40 planned RP10 units from RP10.P04.M02.S08 through RP10.P04.M04.S17?",
      "Do the three descriptor sections (P04 M02 secondary interaction tail, M03 primary implementation slice with the full 22-row UI cycle including permission badges, audit hint displays, error message copies, responsive layouts, keyboard/focus behavior, visual density checks, synthetic fixture bindings, build smokes, Hermes UI evidence, Claude UI leak prompts, closeout handoffs, state snapshots, and unauthorized count leak guards, and M04 secondary workflow slice with the 17-row head) cover every planned row title as descriptor-only rows?",
      "Does CP00-326 avoid UI runtime execution, permission decision leaks, audit hint leaks, validation error leaks, unauthorized count leaks, fixture payload leaks, Hermes runtime receipts, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp326CloseoutHandoff() {
  return freezeCp326Validation({
    handoff_id: "CP00-326-to-CP00-327",
    from_pack_id: INTAKE_CORE_CP326_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP326_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP326_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP326_PACK_BINDING.range,
    open_scope: "Continue RP10.P04.M04.S18 onward with the remaining UI rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP326_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp327CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp327Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp327Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-327 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP327_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-327");
  if (planPack?.risk_class !== INTAKE_CORE_CP327_PACK_BINDING.risk_class) errors.push("CP00-327 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP327_PACK_BINDING.unit_count) errors.push("CP00-327 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP327_PACK_BINDING.first_unit_id) errors.push("CP00-327 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP327_PACK_BINDING.last_unit_id) errors.push("CP00-327 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-327 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-327 must only include RP10 units");
  const summary = createIntakeCoreCp327CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-327 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-327 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-327 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-327 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-327 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-327 ${microId} missing row ${title}`);
    }
  }
  return freezeCp327Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp327PermissionAuditFixtureDescriptor(
  descriptor = createIntakeCoreCp327PermissionAuditFixtureDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_audit_fixture_case_set ?? createIntakeCoreCp327PermissionAuditFixtureCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp327PermissionAuditFixtureDescriptor") errors.push("CP00-327 descriptor type drift");
  if (descriptor.source_ui_workflow_slice_descriptor !== "IntakeCoreCp326UiWorkflowSliceDescriptor") {
    errors.push("CP00-327 source ui workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows).length) errors.push("CP00-327 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-327 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-327 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-327 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-327 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-327 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-327 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-327 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP327_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-327 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-327 ${microId} audit hint display must not expose hints`);
    }
    if (rows.error_message_copy && rows.error_message_copy.validation_error_detail_included !== false) {
      errors.push(`CP00-327 ${microId} error message copy must stay customer-safe`);
    }
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-327 ${microId} fixture binding must stay synthetic`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-327 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.hermes_ui_evidence && rows.hermes_ui_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-327 ${microId} must not emit Hermes UI receipts`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-327 ${microId} UI leak detected`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-327 ${microId} denied state must not expose decisions`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-327 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.no_unauthorized_count_leak && rows.no_unauthorized_count_leak.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-327 ${microId} unauthorized count leak guard drift`);
    }
    if (rows.state_snapshot && rows.state_snapshot.raw_payload_included !== false) {
      errors.push(`CP00-327 ${microId} state snapshot must not include raw payload`);
    }
  }
  if (INTAKE_CORE_CP327_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-327 must not promote Claude");
  if (INTAKE_CORE_CP327_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-327 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-327 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-327 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP327_PACK_BINDING.pack_id,
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-327 contract current_pack drift");
  }
  if (
    contractProjection?.permission_audit_fixture_descriptor?.descriptor &&
    contractProjection.permission_audit_fixture_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-327 contract permission_audit_fixture_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP327_PACK_BINDING.next_pack_id) errors.push("CP00-327 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP327_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-327 next subphase drift");
  }
  return freezeCp327Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp327HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp327PermissionAuditFixtureDescriptor(),
) {
  const coverage = validateIntakeCoreCp327Coverage(planPack);
  const slice = validateIntakeCoreCp327PermissionAuditFixtureDescriptor(descriptor, contractProjection);
  return freezeCp327Validation({
    evidence_packet: "H10.CP00-327.intake_core_permission_audit_fixture_descriptor",
    gate: INTAKE_CORE_CP327_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_audit_fixture_valid: slice.valid,
    no_real_data: true,
    source_ui_workflow_slice_pack_id: INTAKE_CORE_CP327_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP327_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP327_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP327_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp327ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp327Coverage(planPack);
  const slice = validateIntakeCoreCp327PermissionAuditFixtureDescriptor(createIntakeCoreCp327PermissionAuditFixtureDescriptor(), {});
  return freezeCp327Validation({
    review_packet: "C10.CP00-327.intake_core_permission_audit_fixture_descriptor",
    gate: INTAKE_CORE_CP327_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP327_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_audit_fixture_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP327_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-327 cover exactly the 40 planned RP10 units from RP10.P04.M04.S18 through RP10.P04.M06.S15?",
      "Do the three descriptor sections (P04 M04 secondary workflow tail, M05 permission and audit binding with the full UI cycle, and M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-327 avoid UI runtime execution, permission decision leaks, audit hint leaks, validation error leaks, unauthorized count leaks, fixture payload leaks, Hermes runtime receipts, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp327CloseoutHandoff() {
  return freezeCp327Validation({
    handoff_id: "CP00-327-to-CP00-328",
    from_pack_id: INTAKE_CORE_CP327_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP327_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP327_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP327_PACK_BINDING.range,
    open_scope: "Continue RP10.P04.M06.S16 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP327_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp328CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp328Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp328Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-328 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP328_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-328");
  if (planPack?.risk_class !== INTAKE_CORE_CP328_PACK_BINDING.risk_class) errors.push("CP00-328 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP328_PACK_BINDING.unit_count) errors.push("CP00-328 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP328_PACK_BINDING.first_unit_id) errors.push("CP00-328 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP328_PACK_BINDING.last_unit_id) errors.push("CP00-328 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-328 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-328 must only include RP10 units");
  const summary = createIntakeCoreCp328CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-328 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-328 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-328 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-328 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-328 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-328 ${microId} missing row ${title}`);
    }
  }
  return freezeCp328Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(
  descriptor = createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.p04_closeout_p05_permission_foundation_case_set ?? createIntakeCoreCp328P04CloseoutP05PermissionFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor") errors.push("CP00-328 descriptor type drift");
  if (descriptor.source_permission_audit_fixture_descriptor !== "IntakeCoreCp327PermissionAuditFixtureDescriptor") {
    errors.push("CP00-328 source permission audit fixture descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows).length) errors.push("CP00-328 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-328 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-328 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-328 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-328 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-328 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-328 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-328 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP328_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-328 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-328 ${microId} audit hint display must not expose hints`);
    }
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-328 ${microId} synthetic fixture binding must stay synthetic`);
    }
    if (rows.base_tenant_fixture && rows.base_tenant_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-328 ${microId} base tenant fixture must stay synthetic`);
    }
    if (rows.base_user_fixture && rows.base_user_fixture.fixture_payload_included !== false) {
      errors.push(`CP00-328 ${microId} base user fixture must not expose payload`);
    }
    if (rows.base_matter_fixture && rows.base_matter_fixture.matter_trace_required !== true) {
      errors.push(`CP00-328 ${microId} base matter fixture must preserve matter trace`);
    }
    if (rows.base_document_fixture && rows.base_document_fixture.document_payload_included !== false) {
      errors.push(`CP00-328 ${microId} base document fixture must not expose document payload`);
    }
    if (rows.denied_case && rows.denied_case.permission_decision_detail_included !== false) {
      errors.push(`CP00-328 ${microId} denied case must not expose decisions`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-328 ${microId} cross-tenant case must deny access`);
    }
    if (rows.audit_hint_case && rows.audit_hint_case.audit_hint_detail_included !== false) {
      errors.push(`CP00-328 ${microId} audit hint case must not expose hints`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-328 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-328 ${microId} AI retrieval case must not dispatch AI runtime`);
    }
    if (rows.fixture_manifest && rows.fixture_manifest.real_client_data_loaded !== false) {
      errors.push(`CP00-328 ${microId} fixture manifest must not load real data`);
    }
    if (rows.golden_test && rows.golden_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-328 ${microId} golden test must remain descriptor-only`);
    }
    if (rows.failure_test && rows.failure_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-328 ${microId} failure test must remain descriptor-only`);
    }
    if (rows.hermes_fixture_evidence && rows.hermes_fixture_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-328 ${microId} must not emit Hermes fixture receipts`);
    }
    if (rows.claude_missing_test_prompt && rows.claude_missing_test_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-328 ${microId} must not claim Claude final approval`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-328 ${microId} no-real-data check drift`);
    }
    if (rows.replay_command && rows.replay_command.executes_command_runtime !== false) {
      errors.push(`CP00-328 ${microId} replay command must not execute runtime`);
    }
  }
  if (INTAKE_CORE_CP328_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-328 must not promote Claude");
  if (INTAKE_CORE_CP328_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-328 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-328 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-328 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP328_PACK_BINDING.pack_id,
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-328 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_permission_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_permission_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-328 contract p04_closeout_p05_permission_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP328_PACK_BINDING.next_pack_id) errors.push("CP00-328 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP328_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-328 next subphase drift");
  }
  return freezeCp328Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp328HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp328Coverage(planPack);
  const foundation = validateIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(descriptor, contractProjection);
  return freezeCp328Validation({
    evidence_packet: "H10.CP00-328.intake_core_p04_closeout_p05_permission_foundation_descriptor",
    gate: INTAKE_CORE_CP328_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_permission_foundation_valid: foundation.valid,
    no_real_data: true,
    source_permission_audit_fixture_pack_id: INTAKE_CORE_CP328_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP328_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP328_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP328_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp328ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp328Coverage(planPack);
  const foundation = validateIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(
    createIntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor(),
    {},
  );
  return freezeCp328Validation({
    review_packet: "C10.CP00-328.intake_core_p04_closeout_p05_permission_foundation_descriptor",
    gate: INTAKE_CORE_CP328_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP328_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_permission_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP328_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-328 cover exactly the 150 planned RP10 units from RP10.P04.M06.S16 through RP10.P05.M05.S13?",
      "Do the eleven descriptor sections covering the P04 synthetic fixture/test/evidence/review/closeout tail and P05 permission foundation head cover every planned row title as descriptor-only rows?",
      "Does CP00-328 avoid UI/runtime execution, permission decision leaks, audit hint leaks, fixture payload leaks, real client or document data, Hermes runtime receipts, command runtime execution, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp328CloseoutHandoff() {
  return freezeCp328Validation({
    handoff_id: "CP00-328-to-CP00-329",
    from_pack_id: INTAKE_CORE_CP328_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP328_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP328_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP328_PACK_BINDING.range,
    open_scope: "Continue RP10.P05.M05.S14 onward with the remaining permission and audit binding rows while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP328_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp329CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp329Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp329Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-329 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP329_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-329");
  if (planPack?.risk_class !== INTAKE_CORE_CP329_PACK_BINDING.risk_class) errors.push("CP00-329 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP329_PACK_BINDING.unit_count) errors.push("CP00-329 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP329_PACK_BINDING.first_unit_id) errors.push("CP00-329 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP329_PACK_BINDING.last_unit_id) errors.push("CP00-329 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-329 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-329 must only include RP10 units");
  const summary = createIntakeCoreCp329CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-329 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-329 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-329 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-329 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-329 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-329 ${microId} missing row ${title}`);
    }
  }
  return freezeCp329Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp329PermissionFixtureTailDescriptor(
  descriptor = createIntakeCoreCp329PermissionFixtureTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_fixture_tail_case_set ?? createIntakeCoreCp329PermissionFixtureTailCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp329PermissionFixtureTailDescriptor") errors.push("CP00-329 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_permission_foundation_descriptor !== "IntakeCoreCp328P04CloseoutP05PermissionFoundationDescriptor") {
    errors.push("CP00-329 source permission foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP329_REQUIREMENTS.required_section_rows).length) errors.push("CP00-329 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP329_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-329 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-329 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-329 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-329 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-329 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-329 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-329 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05Rows = sections["RP10.P05.M05"]?.rows ?? {};
  const m06Rows = sections["RP10.P05.M06"]?.rows ?? {};
  if (m05Rows.fixture_manifest?.real_client_data_loaded !== false) errors.push("CP00-329 fixture manifest must not load real data");
  if (m05Rows.golden_test?.executes_unit_test_runtime_paths !== false) errors.push("CP00-329 golden test must remain descriptor-only");
  if (m05Rows.failure_test?.executes_unit_test_runtime_paths !== false) errors.push("CP00-329 failure test must remain descriptor-only");
  if (m05Rows.hermes_fixture_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-329 must not emit Hermes fixture receipts");
  if (m05Rows.claude_missing_test_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-329 must not claim Claude final approval");
  if (m05Rows.no_real_data_check?.real_client_data_loaded !== false) errors.push("CP00-329 no-real-data check drift");
  if (m05Rows.replay_command?.executes_command_runtime !== false) errors.push("CP00-329 replay command must not execute runtime");
  if (m06Rows.base_tenant_fixture?.real_client_data_loaded !== false) errors.push("CP00-329 base tenant fixture must stay synthetic");
  if (m06Rows.base_tenant_fixture?.cross_tenant_access_allowed !== false) errors.push("CP00-329 base tenant fixture must deny cross-tenant access");
  if (INTAKE_CORE_CP329_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-329 must not promote Claude");
  if (INTAKE_CORE_CP329_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-329 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-329 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-329 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP329_PACK_BINDING.pack_id,
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-329 contract current_pack drift");
  }
  if (
    contractProjection?.permission_fixture_tail_descriptor?.descriptor &&
    contractProjection.permission_fixture_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-329 contract permission_fixture_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP329_PACK_BINDING.next_pack_id) errors.push("CP00-329 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP329_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-329 next subphase drift");
  }
  return freezeCp329Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp329HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp329PermissionFixtureTailDescriptor(),
) {
  const coverage = validateIntakeCoreCp329Coverage(planPack);
  const tail = validateIntakeCoreCp329PermissionFixtureTailDescriptor(descriptor, contractProjection);
  return freezeCp329Validation({
    evidence_packet: "H10.CP00-329.intake_core_permission_fixture_tail_descriptor",
    gate: INTAKE_CORE_CP329_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_fixture_tail_valid: tail.valid,
    no_real_data: true,
    source_p04_closeout_p05_permission_foundation_pack_id: INTAKE_CORE_CP329_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP329_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP329_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP329_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createIntakeCoreCp329ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp329Coverage(planPack);
  const tail = validateIntakeCoreCp329PermissionFixtureTailDescriptor(createIntakeCoreCp329PermissionFixtureTailDescriptor(), {});
  return freezeCp329Validation({
    review_packet: "C10.CP00-329.intake_core_permission_fixture_tail_descriptor",
    gate: INTAKE_CORE_CP329_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP329_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_fixture_tail_valid: tail.valid,
    invalid_review_blockers: INTAKE_CORE_CP329_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-329 cover exactly the 10 planned RP10 units from RP10.P05.M05.S14 through RP10.P05.M06.S01?",
      "Do the permission binding tail and synthetic fixture head rows stay descriptor-only with no real fixture data, no runtime tests, no Hermes runtime receipts, and no command execution?",
      "Does CP00-329 avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp329CloseoutHandoff() {
  return freezeCp329Validation({
    handoff_id: "CP00-329-to-CP00-330",
    from_pack_id: INTAKE_CORE_CP329_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP329_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP329_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP329_PACK_BINDING.range,
    open_scope: "Continue RP10.P05.M06.S02 onward with the remaining synthetic fixture rows and downstream permission fixture slices while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP329_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp330CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp330Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp330Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-330 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP330_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-330");
  if (planPack?.risk_class !== INTAKE_CORE_CP330_PACK_BINDING.risk_class) errors.push("CP00-330 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP330_PACK_BINDING.unit_count) errors.push("CP00-330 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP330_PACK_BINDING.first_unit_id) errors.push("CP00-330 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP330_PACK_BINDING.last_unit_id) errors.push("CP00-330 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-330 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-330 must only include RP10 units");
  const summary = createIntakeCoreCp330CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-330 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-330 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-330 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-330 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-330 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-330 ${microId} missing row ${title}`);
    }
  }
  return freezeCp330Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

function validateCp330FixtureCloseoutRows(sections, errors) {
  for (const microId of ["RP10.P05.M06", "RP10.P05.M07", "RP10.P05.M08", "RP10.P05.M09", "RP10.P05.M10"]) {
    const rows = sections[microId]?.rows ?? {};
    for (const key of ["base_tenant_fixture", "base_user_fixture", "base_matter_fixture", "base_document_fixture", "fixture_manifest"]) {
      if (!rows[key]) continue;
      if (rows[key].fixture_payload_included !== false) errors.push(`CP00-330 ${microId} ${key} must not include fixture payload`);
      if (rows[key].real_client_data_loaded !== false) errors.push(`CP00-330 ${microId} ${key} must not load real data`);
    }
    for (const key of ["primary_golden_case", "secondary_golden_case", "review_required_case", "denied_case", "golden_test", "failure_test"]) {
      if (!rows[key]) continue;
      if (rows[key].executes_unit_test_runtime_paths !== false) errors.push(`CP00-330 ${microId} ${key} must not execute tests`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-330 ${microId} cross-tenant case must deny access`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-330 ${microId} security trimming case must omit unauthorized data`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-330 ${microId} security trimming case must prevent count leaks`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-330 ${microId} AI retrieval case must not dispatch AI runtime`);
    }
    if (rows.hermes_fixture_evidence && rows.hermes_fixture_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-330 ${microId} must not emit Hermes fixture receipts`);
    }
    if (rows.claude_missing_test_prompt && rows.claude_missing_test_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-330 ${microId} must not claim Claude final approval`);
    }
    if (rows.replay_command && rows.replay_command.executes_command_runtime !== false) {
      errors.push(`CP00-330 ${microId} replay command must not execute runtime`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-330 ${microId} no-real-data check drift`);
    }
  }
}

function validateCp330PermissionMatrixRows(sections, errors) {
  for (const microId of ["RP10.P06.M00", "RP10.P06.M01", "RP10.P06.M02", "RP10.P06.M03"]) {
    const rows = sections[microId]?.rows ?? {};
    for (const key of [
      "permission_matrix_row",
      "view_decision_binding",
      "search_decision_binding",
      "mutation_decision_binding",
      "export_download_decision_binding",
      "share_decision_binding",
      "ai_retrieval_decision_binding",
      "legal_hold_interaction",
      "ethical_wall_interaction",
      "object_acl_interaction",
    ]) {
      if (!rows[key]) continue;
      if (rows[key].evaluates_runtime_permission !== false) errors.push(`CP00-330 ${microId} ${key} must not evaluate runtime permission`);
    }
    for (const key of [
      "permission_matrix_row",
      "view_decision_binding",
      "search_decision_binding",
      "mutation_decision_binding",
      "export_download_decision_binding",
      "share_decision_binding",
      "ai_retrieval_decision_binding",
    ]) {
      if (!rows[key]) continue;
      if (rows[key].writes_permission_decision !== false) errors.push(`CP00-330 ${microId} ${key} must not write permission decisions`);
    }
    for (const key of [
      "view_decision_binding",
      "search_decision_binding",
      "mutation_decision_binding",
      "export_download_decision_binding",
      "share_decision_binding",
      "ai_retrieval_decision_binding",
      "matched_rule_capture",
    ]) {
      if (!rows[key]) continue;
      if (rows[key].exposes_permission_decision_detail !== false) {
        errors.push(`CP00-330 ${microId} ${key} must not expose permission decision detail`);
      }
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-330 ${microId} AI retrieval decision binding must not dispatch AI runtime`);
    }
    if (rows.audit_hint_fields && rows.audit_hint_fields.audit_hint_detail_included !== false) {
      errors.push(`CP00-330 ${microId} audit hint fields must not include hint detail`);
    }
    if (rows.audit_hint_fields && rows.audit_hint_fields.writes_audit_event !== false) {
      errors.push(`CP00-330 ${microId} audit hint fields must not write audit events`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.writes_audit_event !== false) {
      errors.push(`CP00-330 ${microId} audit event expectation must not write audit events`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.audit_event_body_included !== false) {
      errors.push(`CP00-330 ${microId} audit event expectation must not include audit body`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-330 ${microId} deny-over-allow check must stay enforced`);
    }
    if (rows.review_required_route && rows.review_required_route.claude_final_approval_claimed !== false) {
      errors.push(`CP00-330 ${microId} review-required route must not claim Claude final approval`);
    }
    if (rows.approval_required_route && rows.approval_required_route.claude_final_approval_claimed !== false) {
      errors.push(`CP00-330 ${microId} approval-required route must not claim Claude final approval`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-330 ${microId} security trimming proof must omit unauthorized data`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-330 ${microId} security trimming proof must prevent count leaks`);
    }
    if (rows.permission_fixture && rows.permission_fixture.fixture_payload_included !== false) {
      errors.push(`CP00-330 ${microId} permission fixture must not include payload`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-330 ${microId} permission fixture must not load real data`);
    }
    if (rows.permission_fixture && rows.permission_fixture.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-330 ${microId} permission fixture must deny cross-tenant access`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-330 ${microId} allowed test must not execute runtime`);
    }
    if (rows.denied_test && rows.denied_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-330 ${microId} denied test must not execute runtime`);
    }
    if (rows.denied_test && rows.denied_test.permission_decision_detail_included !== false) {
      errors.push(`CP00-330 ${microId} denied test must not include permission decision detail`);
    }
  }
}

export function validateIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(
  descriptor = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.p05_fixture_closeout_p06_permission_matrix_foundation_case_set ??
    createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor") {
    errors.push("CP00-330 descriptor type drift");
  }
  if (descriptor.source_permission_fixture_tail_descriptor !== "IntakeCoreCp329PermissionFixtureTailDescriptor") {
    errors.push("CP00-330 source permission fixture tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP330_REQUIREMENTS.required_section_rows).length) errors.push("CP00-330 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP330_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-330 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-330 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-330 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-330 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-330 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-330 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-330 ${microId} ${key} must not include raw payload`);
    }
  }
  validateCp330FixtureCloseoutRows(sections, errors);
  validateCp330PermissionMatrixRows(sections, errors);
  if (INTAKE_CORE_CP330_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-330 must not promote Claude");
  if (INTAKE_CORE_CP330_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-330 must not claim enterprise trust");
  }
  if (INTAKE_CORE_CP330_NO_WRITE_ATTESTATION.validates_p05_fixture_closeout_p06_permission_matrix_foundation_descriptor_only !== true) {
    errors.push("CP00-330 descriptor-only attestation drift");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-330 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-330 local validation trust boundary drift");
  }
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== INTAKE_CORE_CP330_PACK_BINDING.next_pack_id) {
    errors.push("CP00-330 runtime opening pack drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP330_PACK_BINDING.pack_id,
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-330 contract current_pack drift");
  }
  if (
    contractProjection?.p05_fixture_closeout_p06_permission_matrix_foundation_descriptor?.descriptor &&
    contractProjection.p05_fixture_closeout_p06_permission_matrix_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-330 contract p05_fixture_closeout_p06_permission_matrix_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP330_PACK_BINDING.next_pack_id) errors.push("CP00-330 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP330_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-330 next subphase drift");
  }
  return freezeCp330Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp330HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp330Coverage(planPack);
  const foundation = validateIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(descriptor, contractProjection);
  return freezeCp330Validation({
    evidence_packet: "H10.CP00-330.intake_core_p05_fixture_closeout_p06_permission_matrix_foundation_descriptor",
    gate: INTAKE_CORE_CP330_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_fixture_closeout_p06_permission_matrix_foundation_valid: foundation.valid,
    no_real_data: true,
    source_permission_fixture_tail_pack_id: INTAKE_CORE_CP330_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP330_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP330_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP330_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp330ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp330Coverage(planPack);
  const foundation = validateIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(
    createIntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor(),
    {},
  );
  return freezeCp330Validation({
    review_packet: "C10.CP00-330.intake_core_p05_fixture_closeout_p06_permission_matrix_foundation_descriptor",
    gate: INTAKE_CORE_CP330_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP330_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_fixture_closeout_p06_permission_matrix_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP330_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-330 cover exactly the 150 planned RP10 units from RP10.P05.M06.S02 through RP10.P06.M03.S19?",
      "Do the P05 fixture closeout rows stay descriptor-only with no real fixture data, runtime tests, commands, AI dispatch, or Hermes runtime receipts?",
      "Do the P06 permission matrix foundation rows avoid runtime permission evaluation, permission writes, audit body/detail exposure, unauthorized data leaks, count leaks, and Claude final approval claims?",
    ]),
  });
}

export function createIntakeCoreCp330CloseoutHandoff() {
  return freezeCp330Validation({
    handoff_id: "CP00-330-to-CP00-331",
    from_pack_id: INTAKE_CORE_CP330_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP330_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP330_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP330_PACK_BINDING.range,
    open_scope: "Continue RP10.P06.M03.S20 onward with denied tests and the remaining permission matrix foundation rows while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP330_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp331CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp331Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp331Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-331 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP331_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-331");
  if (planPack?.risk_class !== INTAKE_CORE_CP331_PACK_BINDING.risk_class) errors.push("CP00-331 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP331_PACK_BINDING.unit_count) errors.push("CP00-331 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP331_PACK_BINDING.first_unit_id) errors.push("CP00-331 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP331_PACK_BINDING.last_unit_id) errors.push("CP00-331 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-331 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-331 must only include RP10 units");
  const summary = createIntakeCoreCp331CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-331 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-331 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-331 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-331 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-331 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-331 ${microId} missing row ${title}`);
    }
  }
  return freezeCp331Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp331PermissionMatrixSliceDescriptor(
  descriptor = createIntakeCoreCp331PermissionMatrixSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_matrix_slice_case_set ?? createIntakeCoreCp331PermissionMatrixSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp331PermissionMatrixSliceDescriptor") errors.push("CP00-331 descriptor type drift");
  if (
    descriptor.source_p05_fixture_closeout_p06_permission_matrix_foundation_descriptor !==
    "IntakeCoreCp330P05FixtureCloseoutP06PermissionMatrixFoundationDescriptor"
  ) {
    errors.push("CP00-331 source p05 fixture closeout p06 permission matrix foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows).length) errors.push("CP00-331 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-331 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-331 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-331 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-331 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-331 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-331 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-331 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP331_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.evaluates_runtime_permission !== false) {
      errors.push(`CP00-331 ${microId} permission matrix row must not evaluate runtime permission`);
    }
    if (rows.view_decision_binding && rows.view_decision_binding.exposes_permission_decision_detail !== false) {
      errors.push(`CP00-331 ${microId} view decision binding must not expose decisions`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.exposes_permission_decision_detail !== false) {
      errors.push(`CP00-331 ${microId} AI retrieval decision binding must not expose decisions`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-331 ${microId} deny-over-allow check must stay enforced`);
    }
    if (rows.review_required_route && rows.review_required_route.claude_final_approval_claimed !== false) {
      errors.push(`CP00-331 ${microId} review-required route must not claim Claude final approval`);
    }
    if (rows.approval_required_route && rows.approval_required_route.claude_final_approval_claimed !== false) {
      errors.push(`CP00-331 ${microId} approval-required route must not claim Claude final approval`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-331 ${microId} security trimming proof must omit unauthorized data`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-331 ${microId} permission fixture must not load real data`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-331 ${microId} allowed test must not execute runtime`);
    }
    if (rows.denied_test && rows.denied_test.permission_decision_detail_included !== false) {
      errors.push(`CP00-331 ${microId} denied test must not include permission decision detail`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-331 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-331 ${microId} leak prevention test must not detect leaks`);
    }
  }
  if (INTAKE_CORE_CP331_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-331 must not promote Claude");
  if (INTAKE_CORE_CP331_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-331 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-331 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-331 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP331_PACK_BINDING.pack_id,
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-331 contract current_pack drift");
  }
  if (
    contractProjection?.permission_matrix_slice_descriptor?.descriptor &&
    contractProjection.permission_matrix_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-331 contract permission_matrix_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP331_PACK_BINDING.next_pack_id) errors.push("CP00-331 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP331_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-331 next subphase drift");
  }
  return freezeCp331Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp331HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp331PermissionMatrixSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp331Coverage(planPack);
  const slice = validateIntakeCoreCp331PermissionMatrixSliceDescriptor(descriptor, contractProjection);
  return freezeCp331Validation({
    evidence_packet: "H10.CP00-331.intake_core_permission_matrix_slice_descriptor",
    gate: INTAKE_CORE_CP331_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_matrix_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_fixture_closeout_p06_permission_matrix_foundation_pack_id: INTAKE_CORE_CP331_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP331_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP331_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP331_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp331ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp331Coverage(planPack);
  const slice = validateIntakeCoreCp331PermissionMatrixSliceDescriptor(createIntakeCoreCp331PermissionMatrixSliceDescriptor(), {});
  return freezeCp331Validation({
    review_packet: "C10.CP00-331.intake_core_permission_matrix_slice_descriptor",
    gate: INTAKE_CORE_CP331_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP331_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_matrix_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP331_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-331 cover exactly the 40 planned RP10 units from RP10.P06.M03.S20 through RP10.P06.M05.S15?",
      "Do the three descriptor sections (P06 M03 primary implementation tail with denied/cross-tenant/leak-prevention tests, M04 secondary workflow slice with the full 22-row permission matrix cycle, and M05 permission and audit binding head with the 15 matrix and routing rows) cover every planned row title as descriptor-only rows?",
      "Does CP00-331 avoid runtime permission evaluation, permission decision writes or leaks, audit event writes or hint leaks, cross-tenant access, unauthorized data, fixture payload leaks, test runtime paths, Hermes runtime receipts, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp331CloseoutHandoff() {
  return freezeCp331Validation({
    handoff_id: "CP00-331-to-CP00-332",
    from_pack_id: INTAKE_CORE_CP331_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP331_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP331_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP331_PACK_BINDING.range,
    open_scope: "Continue RP10.P06.M05.S16 onward with the remaining permission rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP331_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp332CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp332Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp332Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-332 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP332_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-332");
  if (planPack?.risk_class !== INTAKE_CORE_CP332_PACK_BINDING.risk_class) errors.push("CP00-332 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP332_PACK_BINDING.unit_count) errors.push("CP00-332 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP332_PACK_BINDING.first_unit_id) errors.push("CP00-332 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP332_PACK_BINDING.last_unit_id) errors.push("CP00-332 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-332 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-332 must only include RP10 units");
  const summary = createIntakeCoreCp332CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-332 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-332 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-332 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-332 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-332 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-332 ${microId} missing row ${title}`);
    }
  }
  return freezeCp332Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp332PermissionBindingSliceDescriptor(
  descriptor = createIntakeCoreCp332PermissionBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_binding_slice_case_set ?? createIntakeCoreCp332PermissionBindingSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp332PermissionBindingSliceDescriptor") errors.push("CP00-332 descriptor type drift");
  if (descriptor.source_permission_matrix_slice_descriptor !== "IntakeCoreCp331PermissionMatrixSliceDescriptor") {
    errors.push("CP00-332 source permission matrix slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows).length) errors.push("CP00-332 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-332 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-332 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-332 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-332 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-332 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-332 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-332 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP332_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-332 ${microId} security trimming proof must omit unauthorized data`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-332 ${microId} permission fixture must not load real data`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-332 ${microId} allowed test must not execute runtime`);
    }
    if (rows.denied_test && rows.denied_test.permission_decision_detail_included !== false) {
      errors.push(`CP00-332 ${microId} denied test must not include permission decision detail`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-332 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-332 ${microId} leak prevention test must not detect leaks`);
    }
    if (rows.permission_matrix_row && rows.permission_matrix_row.evaluates_runtime_permission !== false) {
      errors.push(`CP00-332 ${microId} permission matrix row must not evaluate runtime permission`);
    }
    if (rows.view_decision_binding && rows.view_decision_binding.exposes_permission_decision_detail !== false) {
      errors.push(`CP00-332 ${microId} view decision binding must not expose decisions`);
    }
    if (rows.search_decision_binding && rows.search_decision_binding.exposes_permission_decision_detail !== false) {
      errors.push(`CP00-332 ${microId} search decision binding must not expose decisions`);
    }
  }
  if (INTAKE_CORE_CP332_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-332 must not promote Claude");
  if (INTAKE_CORE_CP332_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-332 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-332 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-332 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP332_PACK_BINDING.pack_id,
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-332 contract current_pack drift");
  }
  if (
    contractProjection?.permission_binding_slice_descriptor?.descriptor &&
    contractProjection.permission_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-332 contract permission_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP332_PACK_BINDING.next_pack_id) errors.push("CP00-332 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP332_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-332 next subphase drift");
  }
  return freezeCp332Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp332HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp332PermissionBindingSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp332Coverage(planPack);
  const slice = validateIntakeCoreCp332PermissionBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp332Validation({
    evidence_packet: "H10.CP00-332.intake_core_permission_binding_slice_descriptor",
    gate: INTAKE_CORE_CP332_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_permission_matrix_slice_pack_id: INTAKE_CORE_CP332_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP332_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP332_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP332_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp332ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp332Coverage(planPack);
  const slice = validateIntakeCoreCp332PermissionBindingSliceDescriptor(createIntakeCoreCp332PermissionBindingSliceDescriptor(), {});
  return freezeCp332Validation({
    review_packet: "C10.CP00-332.intake_core_permission_binding_slice_descriptor",
    gate: INTAKE_CORE_CP332_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP332_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_binding_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP332_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-332 cover exactly the 10 planned RP10 units from RP10.P06.M05.S16 through RP10.P06.M06.S03?",
      "Do the two descriptor sections (P06 M05 permission and audit binding tail with security trimming proofs, audit event expectations, permission fixtures, and allowed/denied/cross-tenant/leak-prevention tests, and M06 synthetic fixture head with permission matrix rows and view/search decision bindings) cover every planned row title as descriptor-only rows?",
      "Does CP00-332 avoid runtime permission evaluation, permission decision writes or leaks, audit event writes or hint leaks, cross-tenant access, unauthorized data, fixture payload leaks, test runtime paths, Hermes runtime receipts, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp332CloseoutHandoff() {
  return freezeCp332Validation({
    handoff_id: "CP00-332-to-CP00-333",
    from_pack_id: INTAKE_CORE_CP332_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP332_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP332_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP332_PACK_BINDING.range,
    open_scope: "Continue RP10.P06.M06.S04 onward with the remaining permission fixture rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP332_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp333CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp333Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp333Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-333 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP333_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-333");
  if (planPack?.risk_class !== INTAKE_CORE_CP333_PACK_BINDING.risk_class) errors.push("CP00-333 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP333_PACK_BINDING.unit_count) errors.push("CP00-333 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP333_PACK_BINDING.first_unit_id) errors.push("CP00-333 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP333_PACK_BINDING.last_unit_id) errors.push("CP00-333 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-333 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-333 must only include RP10 units");
  const summary = createIntakeCoreCp333CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-333 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-333 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-333 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-333 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-333 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-333 ${microId} missing row ${title}`);
    }
  }
  return freezeCp333Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(
  descriptor = createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_failure_foundation_case_set ?? createIntakeCoreCp333P06CloseoutP07FailureFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor") errors.push("CP00-333 descriptor type drift");
  if (descriptor.source_permission_binding_slice_descriptor !== "IntakeCoreCp332PermissionBindingSliceDescriptor") {
    errors.push("CP00-333 source permission binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows).length) errors.push("CP00-333 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-333 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-333 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-333 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-333 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-333 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-333 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-333 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP333_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.evaluates_runtime_permission !== false) {
      errors.push(`CP00-333 ${microId} permission matrix row must not evaluate runtime permission`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-333 ${microId} deny-over-allow check must stay enforced`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-333 ${microId} security trimming proof must omit unauthorized data`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.audit_event_body_included !== undefined && rows.audit_event_expectation.audit_event_body_included !== false) {
      errors.push(`CP00-333 ${microId} audit event expectation must not include audit body`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-333 ${microId} permission fixture must not load real data`);
    }
    if (rows.denied_test && rows.denied_test.permission_decision_detail_included !== false) {
      errors.push(`CP00-333 ${microId} denied test must not include permission decision detail`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-333 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-333 ${microId} leak prevention test must not detect leaks`);
    }
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-333 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-333 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.ambiguous_rule_failure && rows.ambiguous_rule_failure.deny_over_allow_enforced !== true) {
      errors.push(`CP00-333 ${microId} ambiguous rule failure must deny over allow`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-333 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-333 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-333 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-333 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-333 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-333 ${microId} failure unit test must not execute runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-333 ${microId} failure integration smoke must not dispatch runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-333 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-333 ${microId} must not emit Hermes failure receipts`);
    }
  }
  if (INTAKE_CORE_CP333_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-333 must not promote Claude");
  if (INTAKE_CORE_CP333_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-333 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-333 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-333 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP333_PACK_BINDING.pack_id,
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-333 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_failure_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_failure_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-333 contract p06_closeout_p07_failure_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP333_PACK_BINDING.next_pack_id) errors.push("CP00-333 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP333_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-333 next subphase drift");
  }
  return freezeCp333Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp333HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp333Coverage(planPack);
  const foundation = validateIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp333Validation({
    evidence_packet: "H10.CP00-333.intake_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: INTAKE_CORE_CP333_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    no_real_data: true,
    source_permission_binding_slice_pack_id: INTAKE_CORE_CP333_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP333_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP333_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP333_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp333ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp333Coverage(planPack);
  const foundation = validateIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(createIntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor(), {});
  return freezeCp333Validation({
    review_packet: "C10.CP00-333.intake_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: INTAKE_CORE_CP333_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP333_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP333_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-333 cover exactly the 150 planned RP10 units from RP10.P06.M06.S04 through RP10.P07.M03.S14?",
      "Do the nine descriptor sections (P06 M06 synthetic fixture tail, M07 test/golden full cycle, M08 Hermes evidence full cycle, M09 Claude review 20-row head, M10 closeout 11-row head, and P07 M00/M01 failure scope and contract heads, M02 type/shape 20-row cycle, M03 primary implementation 14-row head) cover every planned row title as descriptor-only rows?",
      "Does CP00-333 avoid runtime permission evaluation, permission decision leaks, audit event writes or hint leaks, cross-tenant access, rollback/retry runtime, lock acquisition, blocked-claim detail leaks, fixture payload leaks, test runtime paths, integration smoke runtime, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack close the RP10.P06 descriptor scope and open the P07 failure foundation without treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp333CloseoutHandoff() {
  return freezeCp333Validation({
    handoff_id: "CP00-333-to-CP00-334",
    from_pack_id: INTAKE_CORE_CP333_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP333_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP333_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP333_PACK_BINDING.range,
    open_scope: "RP10.P06 descriptor scope is closed; continue RP10.P07.M03.S15 onward with the remaining failure rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP333_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp334CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp334Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp334Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-334 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP334_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-334");
  if (planPack?.risk_class !== INTAKE_CORE_CP334_PACK_BINDING.risk_class) errors.push("CP00-334 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP334_PACK_BINDING.unit_count) errors.push("CP00-334 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP334_PACK_BINDING.first_unit_id) errors.push("CP00-334 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP334_PACK_BINDING.last_unit_id) errors.push("CP00-334 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-334 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-334 must only include RP10 units");
  const summary = createIntakeCoreCp334CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-334 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-334 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-334 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-334 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-334 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-334 ${microId} missing row ${title}`);
    }
  }
  return freezeCp334Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp334FailureSliceDescriptor(
  descriptor = createIntakeCoreCp334FailureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_slice_case_set ?? createIntakeCoreCp334FailureSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp334FailureSliceDescriptor") errors.push("CP00-334 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_failure_foundation_descriptor !== "IntakeCoreCp333P06CloseoutP07FailureFoundationDescriptor") {
    errors.push("CP00-334 source p06 closeout p07 failure foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows).length) errors.push("CP00-334 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-334 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-334 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-334 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-334 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-334 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-334 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-334 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP334_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-334 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-334 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-334 ${microId} failure unit test must not execute runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-334 ${microId} failure integration smoke must not dispatch runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-334 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-334 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-334 ${microId} Claude edge-case prompt must not claim final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_final_approval_required !== true) {
      errors.push(`CP00-334 ${microId} human escalation note boundary missing`);
    }
    if (rows.missing_tenant_failure && rows.missing_tenant_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-334 ${microId} missing tenant failure outcome drift`);
    }
  }
  if (INTAKE_CORE_CP334_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-334 must not promote Claude");
  if (INTAKE_CORE_CP334_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-334 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-334 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-334 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP334_PACK_BINDING.pack_id,
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-334 contract current_pack drift");
  }
  if (
    contractProjection?.failure_slice_descriptor?.descriptor &&
    contractProjection.failure_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-334 contract failure_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP334_PACK_BINDING.next_pack_id) errors.push("CP00-334 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP334_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-334 next subphase drift");
  }
  return freezeCp334Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp334HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp334FailureSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp334Coverage(planPack);
  const slice = validateIntakeCoreCp334FailureSliceDescriptor(descriptor, contractProjection);
  return freezeCp334Validation({
    evidence_packet: "H10.CP00-334.intake_core_failure_slice_descriptor",
    gate: INTAKE_CORE_CP334_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_failure_foundation_pack_id: INTAKE_CORE_CP334_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP334_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP334_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP334_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp334ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp334Coverage(planPack);
  const slice = validateIntakeCoreCp334FailureSliceDescriptor(createIntakeCoreCp334FailureSliceDescriptor(), {});
  return freezeCp334Validation({
    review_packet: "C10.CP00-334.intake_core_failure_slice_descriptor",
    gate: INTAKE_CORE_CP334_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP334_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP334_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-334 cover exactly the 10 planned RP10 units from RP10.P07.M03.S15 through RP10.P07.M04.S02?",
      "Do the two descriptor sections (P07 M03 primary implementation tail with blocked-claim receipts, failure fixtures, failure unit/integration tests, audit failure hints, Hermes failure evidence, Claude edge-case prompts, and human escalation notes, and M04 secondary workflow head with failure taxonomy and missing tenant failure) cover every planned row title as descriptor-only rows?",
      "Does CP00-334 avoid rollback/retry runtime, lock acquisition, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, test runtime paths, integration smoke runtime, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp334CloseoutHandoff() {
  return freezeCp334Validation({
    handoff_id: "CP00-334-to-CP00-335",
    from_pack_id: INTAKE_CORE_CP334_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP334_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP334_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP334_PACK_BINDING.range,
    open_scope: "Continue RP10.P07.M04.S03 onward with the remaining failure rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP334_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp335CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp335Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp335Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-335 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP335_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-335");
  if (planPack?.risk_class !== INTAKE_CORE_CP335_PACK_BINDING.risk_class) errors.push("CP00-335 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP335_PACK_BINDING.unit_count) errors.push("CP00-335 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP335_PACK_BINDING.first_unit_id) errors.push("CP00-335 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP335_PACK_BINDING.last_unit_id) errors.push("CP00-335 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-335 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-335 must only include RP10 units");
  const summary = createIntakeCoreCp335CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-335 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-335 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-335 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-335 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-335 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-335 ${microId} missing row ${title}`);
    }
  }
  return freezeCp335Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp335FailureBindingSliceDescriptor(
  descriptor = createIntakeCoreCp335FailureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_binding_slice_case_set ?? createIntakeCoreCp335FailureBindingSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp335FailureBindingSliceDescriptor") errors.push("CP00-335 descriptor type drift");
  if (descriptor.source_failure_slice_descriptor !== "IntakeCoreCp334FailureSliceDescriptor") {
    errors.push("CP00-335 source failure slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows).length) errors.push("CP00-335 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-335 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-335 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-335 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-335 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-335 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-335 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-335 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP335_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-335 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-335 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.ambiguous_rule_failure && rows.ambiguous_rule_failure.deny_over_allow_enforced !== true) {
      errors.push(`CP00-335 ${microId} ambiguous rule failure must deny over allow`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-335 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-335 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-335 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-335 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-335 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-335 ${microId} failure unit test must not execute runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-335 ${microId} failure integration smoke must not dispatch runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-335 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-335 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-335 ${microId} Claude edge-case prompt must not claim final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_final_approval_required !== true) {
      errors.push(`CP00-335 ${microId} human escalation note boundary missing`);
    }
  }
  if (INTAKE_CORE_CP335_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-335 must not promote Claude");
  if (INTAKE_CORE_CP335_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-335 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-335 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-335 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP335_PACK_BINDING.pack_id,
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-335 contract current_pack drift");
  }
  if (
    contractProjection?.failure_binding_slice_descriptor?.descriptor &&
    contractProjection.failure_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-335 contract failure_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP335_PACK_BINDING.next_pack_id) errors.push("CP00-335 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP335_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-335 next subphase drift");
  }
  return freezeCp335Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp335HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp335FailureBindingSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp335Coverage(planPack);
  const slice = validateIntakeCoreCp335FailureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp335Validation({
    evidence_packet: "H10.CP00-335.intake_core_failure_binding_slice_descriptor",
    gate: INTAKE_CORE_CP335_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_slice_pack_id: INTAKE_CORE_CP335_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP335_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP335_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP335_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp335ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp335Coverage(planPack);
  const slice = validateIntakeCoreCp335FailureBindingSliceDescriptor(createIntakeCoreCp335FailureBindingSliceDescriptor(), {});
  return freezeCp335Validation({
    review_packet: "C10.CP00-335.intake_core_failure_binding_slice_descriptor",
    gate: INTAKE_CORE_CP335_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP335_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP335_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-335 cover exactly the 40 planned RP10 units from RP10.P07.M04.S03 through RP10.P07.M05.S20?",
      "Do the two descriptor sections (P07 M04 secondary workflow tail with the twenty failure rows from missing actor failure through human escalation note, and M05 permission and audit binding head with the twenty failure rows from failure taxonomy through Hermes failure evidence) cover every planned row title as descriptor-only rows?",
      "Does CP00-335 avoid rollback/retry runtime, lock acquisition, cross-tenant access, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, test runtime paths, integration smoke runtime, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp335CloseoutHandoff() {
  return freezeCp335Validation({
    handoff_id: "CP00-335-to-CP00-336",
    from_pack_id: INTAKE_CORE_CP335_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP335_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP335_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP335_PACK_BINDING.range,
    open_scope: "Continue RP10.P07.M05.S21 onward with the remaining failure rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP335_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp336CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp336Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp336Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-336 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP336_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-336");
  if (planPack?.risk_class !== INTAKE_CORE_CP336_PACK_BINDING.risk_class) errors.push("CP00-336 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP336_PACK_BINDING.unit_count) errors.push("CP00-336 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP336_PACK_BINDING.first_unit_id) errors.push("CP00-336 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP336_PACK_BINDING.last_unit_id) errors.push("CP00-336 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-336 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-336 must only include RP10 units");
  const summary = createIntakeCoreCp336CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-336 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-336 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-336 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-336 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-336 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-336 ${microId} missing row ${title}`);
    }
  }
  return freezeCp336Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp336FailureTailSliceDescriptor(
  descriptor = createIntakeCoreCp336FailureTailSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_tail_slice_case_set ?? createIntakeCoreCp336FailureTailSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp336FailureTailSliceDescriptor") errors.push("CP00-336 descriptor type drift");
  if (descriptor.source_failure_binding_slice_descriptor !== "IntakeCoreCp335FailureBindingSliceDescriptor") {
    errors.push("CP00-336 source failure binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows).length) errors.push("CP00-336 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-336 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-336 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-336 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-336 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-336 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-336 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-336 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP336_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-336 ${microId} Claude edge-case prompt must not claim final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_final_approval_required !== true) {
      errors.push(`CP00-336 ${microId} human escalation note boundary missing`);
    }
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-336 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-336 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.missing_tenant_failure && rows.missing_tenant_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-336 ${microId} missing tenant failure outcome drift`);
    }
  }
  if (INTAKE_CORE_CP336_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-336 must not promote Claude");
  if (INTAKE_CORE_CP336_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-336 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-336 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-336 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP336_PACK_BINDING.pack_id,
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-336 contract current_pack drift");
  }
  if (
    contractProjection?.failure_tail_slice_descriptor?.descriptor &&
    contractProjection.failure_tail_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-336 contract failure_tail_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP336_PACK_BINDING.next_pack_id) errors.push("CP00-336 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP336_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-336 next subphase drift");
  }
  return freezeCp336Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp336HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp336FailureTailSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp336Coverage(planPack);
  const slice = validateIntakeCoreCp336FailureTailSliceDescriptor(descriptor, contractProjection);
  return freezeCp336Validation({
    evidence_packet: "H10.CP00-336.intake_core_failure_tail_slice_descriptor",
    gate: INTAKE_CORE_CP336_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_tail_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_binding_slice_pack_id: INTAKE_CORE_CP336_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP336_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP336_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP336_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp336ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp336Coverage(planPack);
  const slice = validateIntakeCoreCp336FailureTailSliceDescriptor(createIntakeCoreCp336FailureTailSliceDescriptor(), {});
  return freezeCp336Validation({
    review_packet: "C10.CP00-336.intake_core_failure_tail_slice_descriptor",
    gate: INTAKE_CORE_CP336_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP336_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_tail_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP336_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-336 cover exactly the 10 planned RP10 units from RP10.P07.M05.S21 through RP10.P07.M06.S08?",
      "Do the two descriptor sections (P07 M05 permission and audit binding tail with Claude edge-case prompts and human escalation notes, and M06 synthetic fixture head with the eight failure rows from failure taxonomy through permission denied failure) cover every planned row title as descriptor-only rows?",
      "Does CP00-336 avoid rollback/retry runtime, lock acquisition, cross-tenant access, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, test runtime paths, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp336CloseoutHandoff() {
  return freezeCp336Validation({
    handoff_id: "CP00-336-to-CP00-337",
    from_pack_id: INTAKE_CORE_CP336_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP336_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP336_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP336_PACK_BINDING.range,
    open_scope: "Continue RP10.P07.M06.S09 onward with the remaining failure fixture rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP336_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp337CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp337Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp337Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-337 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP337_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-337");
  if (planPack?.risk_class !== INTAKE_CORE_CP337_PACK_BINDING.risk_class) errors.push("CP00-337 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP337_PACK_BINDING.unit_count) errors.push("CP00-337 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP337_PACK_BINDING.first_unit_id) errors.push("CP00-337 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP337_PACK_BINDING.last_unit_id) errors.push("CP00-337 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-337 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-337 must only include RP10 units");
  const summary = createIntakeCoreCp337CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-337 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-337 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-337 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-337 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-337 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-337 ${microId} missing row ${title}`);
    }
  }
  return freezeCp337Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(
  descriptor = createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_hermes_foundation_case_set ?? createIntakeCoreCp337P07CloseoutP08HermesFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor") errors.push("CP00-337 descriptor type drift");
  if (descriptor.source_failure_tail_slice_descriptor !== "IntakeCoreCp336FailureTailSliceDescriptor") {
    errors.push("CP00-337 source failure tail slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows).length) errors.push("CP00-337 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-337 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-337 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-337 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-337 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-337 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-337 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-337 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP337_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-337 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-337 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-337 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-337 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-337 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-337 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-337 ${microId} Claude edge-case prompt must not claim final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_final_approval_required !== true) {
      errors.push(`CP00-337 ${microId} human escalation note boundary missing`);
    }
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-337 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.command_result_receipt && rows.command_result_receipt.executes_command_runtime !== false) {
      errors.push(`CP00-337 ${microId} command result receipt must not execute runtime`);
    }
    if (rows.fixture_summary_receipt && rows.fixture_summary_receipt.fixture_payload_included !== false) {
      errors.push(`CP00-337 ${microId} fixture summary receipt must not include payloads`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-337 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_hint_detail_included !== false) {
      errors.push(`CP00-337 ${microId} audit summary receipt must not expose hints`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-337 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-337 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-337 ${microId} human approval marker boundary missing`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-337 ${microId} validation command check must not execute runtime`);
    }
  }
  if (INTAKE_CORE_CP337_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-337 must not promote Claude");
  if (INTAKE_CORE_CP337_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-337 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-337 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-337 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP337_PACK_BINDING.pack_id,
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-337 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_hermes_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_hermes_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-337 contract p07_closeout_p08_hermes_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP337_PACK_BINDING.next_pack_id) errors.push("CP00-337 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP337_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-337 next subphase drift");
  }
  return freezeCp337Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp337HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp337Coverage(planPack);
  const foundation = validateIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(descriptor, contractProjection);
  return freezeCp337Validation({
    evidence_packet: "H10.CP00-337.intake_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: INTAKE_CORE_CP337_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    no_real_data: true,
    source_failure_tail_slice_pack_id: INTAKE_CORE_CP337_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP337_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP337_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP337_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp337ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp337Coverage(planPack);
  const foundation = validateIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(createIntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor(), {});
  return freezeCp337Validation({
    review_packet: "C10.CP00-337.intake_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: INTAKE_CORE_CP337_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP337_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP337_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-337 cover exactly the 150 planned RP10 units from RP10.P07.M06.S09 through RP10.P08.M04.S19?",
      "Do the ten descriptor sections (P07 M06 synthetic fixture tail, M07 test/golden and M08 Hermes evidence full failure cycles, M09 Claude review 20-row head, M10 closeout 11-row head, and P08 M00 scope inventory, M01 contract draft, M02 type/shape Hermes heads, M03 primary implementation 22-row cycle with documentation updates and operator summaries, and M04 secondary workflow 19-row head) cover every planned row title as descriptor-only rows?",
      "Does CP00-337 avoid Hermes runtime receipts, command runtime execution, rollback/retry runtime, lock acquisition, cross-tenant access, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack close the RP10.P07 descriptor scope and open the P08 Hermes foundation without treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp337CloseoutHandoff() {
  return freezeCp337Validation({
    handoff_id: "CP00-337-to-CP00-338",
    from_pack_id: INTAKE_CORE_CP337_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP337_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP337_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP337_PACK_BINDING.range,
    open_scope: "RP10.P07 descriptor scope is closed; continue RP10.P08.M04.S20 onward with the remaining Hermes receipt rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP337_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp338CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp338Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp338Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-338 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP338_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-338");
  if (planPack?.risk_class !== INTAKE_CORE_CP338_PACK_BINDING.risk_class) errors.push("CP00-338 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP338_PACK_BINDING.unit_count) errors.push("CP00-338 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP338_PACK_BINDING.first_unit_id) errors.push("CP00-338 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP338_PACK_BINDING.last_unit_id) errors.push("CP00-338 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-338 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-338 must only include RP10 units");
  const summary = createIntakeCoreCp338CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-338 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-338 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-338 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-338 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-338 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-338 ${microId} missing row ${title}`);
    }
  }
  return freezeCp338Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp338HermesSliceDescriptor(
  descriptor = createIntakeCoreCp338HermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.hermes_slice_case_set ?? createIntakeCoreCp338HermesSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp338HermesSliceDescriptor") errors.push("CP00-338 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_hermes_foundation_descriptor !== "IntakeCoreCp337P07CloseoutP08HermesFoundationDescriptor") {
    errors.push("CP00-338 source p07 closeout p08 hermes foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows).length) errors.push("CP00-338 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-338 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-338 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-338 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-338 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-338 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-338 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-338 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP338_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-338 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.command_result_receipt && rows.command_result_receipt.executes_command_runtime !== false) {
      errors.push(`CP00-338 ${microId} command result receipt must not execute runtime`);
    }
    if (rows.fixture_summary_receipt && rows.fixture_summary_receipt.fixture_payload_included !== false) {
      errors.push(`CP00-338 ${microId} fixture summary receipt must not include payloads`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-338 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_hint_detail_included !== false) {
      errors.push(`CP00-338 ${microId} audit summary receipt must not expose hints`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-338 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-338 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-338 ${microId} human approval marker boundary missing`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-338 ${microId} validation command check must not execute runtime`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-338 ${microId} blocked-claim receipt must not expose details`);
    }
  }
  if (INTAKE_CORE_CP338_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-338 must not promote Claude");
  if (INTAKE_CORE_CP338_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-338 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-338 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-338 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP338_PACK_BINDING.pack_id,
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-338 contract current_pack drift");
  }
  if (
    contractProjection?.hermes_slice_descriptor?.descriptor &&
    contractProjection.hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-338 contract hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP338_PACK_BINDING.next_pack_id) errors.push("CP00-338 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP338_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-338 next subphase drift");
  }
  return freezeCp338Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp338HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp338HermesSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp338Coverage(planPack);
  const slice = validateIntakeCoreCp338HermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp338Validation({
    evidence_packet: "H10.CP00-338.intake_core_hermes_slice_descriptor",
    gate: INTAKE_CORE_CP338_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_closeout_p08_hermes_foundation_pack_id: INTAKE_CORE_CP338_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP338_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP338_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP338_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp338ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp338Coverage(planPack);
  const slice = validateIntakeCoreCp338HermesSliceDescriptor(createIntakeCoreCp338HermesSliceDescriptor(), {});
  return freezeCp338Validation({
    review_packet: "C10.CP00-338.intake_core_hermes_slice_descriptor",
    gate: INTAKE_CORE_CP338_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP338_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    hermes_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP338_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-338 cover exactly the 40 planned RP10 units from RP10.P08.M04.S20 through RP10.P08.M06.S17?",
      "Do the three descriptor sections (P08 M04 secondary workflow tail with next-gate readiness, M05 permission and audit binding with the full 22-row Hermes receipt cycle including documentation updates and operator summaries, and M06 synthetic fixture head with the 17-row Hermes cycle) cover every planned row title as descriptor-only rows?",
      "Does CP00-338 avoid Hermes runtime receipts, command runtime execution, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp338CloseoutHandoff() {
  return freezeCp338Validation({
    handoff_id: "CP00-338-to-CP00-339",
    from_pack_id: INTAKE_CORE_CP338_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP338_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP338_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP338_PACK_BINDING.range,
    open_scope: "Continue RP10.P08.M06.S18 onward with the remaining Hermes receipt rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP338_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp339CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp339Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp339Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-339 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP339_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-339");
  if (planPack?.risk_class !== INTAKE_CORE_CP339_PACK_BINDING.risk_class) errors.push("CP00-339 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP339_PACK_BINDING.unit_count) errors.push("CP00-339 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP339_PACK_BINDING.first_unit_id) errors.push("CP00-339 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP339_PACK_BINDING.last_unit_id) errors.push("CP00-339 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-339 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-339 must only include RP10 units");
  const summary = createIntakeCoreCp339CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-339 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-339 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-339 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-339 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-339 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-339 ${microId} missing row ${title}`);
    }
  }
  return freezeCp339Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(
  descriptor = createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_review_foundation_case_set ?? createIntakeCoreCp339P08CloseoutP09ReviewFoundationCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor") errors.push("CP00-339 descriptor type drift");
  if (descriptor.source_hermes_slice_descriptor !== "IntakeCoreCp338HermesSliceDescriptor") {
    errors.push("CP00-339 source hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows).length) errors.push("CP00-339 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-339 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-339 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-339 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-339 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-339 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-339 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-339 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP339_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-339 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-339 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-339 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-339 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-339 ${microId} human approval marker boundary missing`);
    }
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-339 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-339 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-339 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-339 ${microId} human approval summary drift`);
    }
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-339 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-339 ${microId} command rerun must not execute runtime`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-339 ${microId} validation command check must not execute runtime`);
    }
  }
  if (INTAKE_CORE_CP339_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-339 must not promote Claude");
  if (INTAKE_CORE_CP339_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-339 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-339 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-339 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      INTAKE_CORE_CP339_PACK_BINDING.pack_id,
      INTAKE_CORE_CP340_PACK_BINDING.pack_id,
      INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-339 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_review_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_review_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-339 contract p08_closeout_p09_review_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP339_PACK_BINDING.next_pack_id) errors.push("CP00-339 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP339_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-339 next subphase drift");
  }
  return freezeCp339Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp339HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(),
) {
  const coverage = validateIntakeCoreCp339Coverage(planPack);
  const foundation = validateIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(descriptor, contractProjection);
  return freezeCp339Validation({
    evidence_packet: "H10.CP00-339.intake_core_p08_closeout_p09_review_foundation_descriptor",
    gate: INTAKE_CORE_CP339_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    no_real_data: true,
    source_hermes_slice_pack_id: INTAKE_CORE_CP339_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP339_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP339_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP339_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createIntakeCoreCp339ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp339Coverage(planPack);
  const foundation = validateIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(createIntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor(), {});
  return freezeCp339Validation({
    review_packet: "C10.CP00-339.intake_core_p08_closeout_p09_review_foundation_descriptor",
    gate: INTAKE_CORE_CP339_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP339_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    invalid_review_blockers: INTAKE_CORE_CP339_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-339 cover exactly the 150 planned RP10 units from RP10.P08.M06.S18 through RP10.P09.M07.S02?",
      "Do the thirteen descriptor sections (P08 M06 synthetic fixture tail, M07 test/golden 22-row Hermes cycle, M08 Hermes evidence and M09 Claude review 20-row cycles, M10 closeout 8-row head, and P09 M00/M01 review scope and contract heads, M02 type/shape 8-row cycle, M03 primary implementation 20-row review cycle, M04 secondary workflow 11-row head, M05 permission and audit binding 20-row cycle, M06 synthetic fixture 8-row head, and M07 test/golden 2-row head) cover every planned row title as descriptor-only rows?",
      "Does CP00-339 avoid Hermes runtime receipts, command runtime execution, permission bypass, UI leaks, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack close the RP10.P08 descriptor scope and open the P09 review foundation without treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp339CloseoutHandoff() {
  return freezeCp339Validation({
    handoff_id: "CP00-339-to-CP00-340",
    from_pack_id: INTAKE_CORE_CP339_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP339_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP339_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP339_PACK_BINDING.range,
    open_scope: "RP10.P08 descriptor scope is closed; continue RP10.P09.M07.S03 onward with the remaining review rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP339_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp340CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp340Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp340Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-340 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP340_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-340");
  if (planPack?.risk_class !== INTAKE_CORE_CP340_PACK_BINDING.risk_class) errors.push("CP00-340 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP340_PACK_BINDING.unit_count) errors.push("CP00-340 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP340_PACK_BINDING.first_unit_id) errors.push("CP00-340 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP340_PACK_BINDING.last_unit_id) errors.push("CP00-340 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-340 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-340 must only include RP10 units");
  const summary = createIntakeCoreCp340CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-340 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-340 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-340 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-340 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-340 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-340 ${microId} missing row ${title}`);
    }
  }
  return freezeCp340Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp340ReviewSliceDescriptor(
  descriptor = createIntakeCoreCp340ReviewSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_slice_case_set ?? createIntakeCoreCp340ReviewSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp340ReviewSliceDescriptor") errors.push("CP00-340 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_review_foundation_descriptor !== "IntakeCoreCp339P08CloseoutP09ReviewFoundationDescriptor") {
    errors.push("CP00-340 source p08 closeout p09 review foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows).length) errors.push("CP00-340 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-340 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-340 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-340 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-340 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-340 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-340 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-340 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP340_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-340 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-340 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-340 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-340 ${microId} human approval summary drift`);
    }
  }
  if (INTAKE_CORE_CP340_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-340 must not promote Claude");
  if (INTAKE_CORE_CP340_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-340 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-340 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-340 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![INTAKE_CORE_CP340_PACK_BINDING.pack_id, INTAKE_CORE_CP341_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-340 contract current_pack drift");
  }
  if (
    contractProjection?.review_slice_descriptor?.descriptor &&
    contractProjection.review_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-340 contract review_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP340_PACK_BINDING.next_pack_id) errors.push("CP00-340 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP340_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-340 next subphase drift");
  }
  return freezeCp340Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp340HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp340ReviewSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp340Coverage(planPack);
  const slice = validateIntakeCoreCp340ReviewSliceDescriptor(descriptor, contractProjection);
  return freezeCp340Validation({
    evidence_packet: "H10.CP00-340.intake_core_review_slice_descriptor",
    gate: INTAKE_CORE_CP340_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_review_foundation_pack_id: INTAKE_CORE_CP340_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP340_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP340_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP340_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp340ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp340Coverage(planPack);
  const slice = validateIntakeCoreCp340ReviewSliceDescriptor(createIntakeCoreCp340ReviewSliceDescriptor(), {});
  return freezeCp340Validation({
    review_packet: "C10.CP00-340.intake_core_review_slice_descriptor",
    gate: INTAKE_CORE_CP340_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP340_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP340_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-340 cover exactly the 10 planned RP10 units from RP10.P09.M07.S03 through RP10.P09.M07.S12?",
      "Does the single descriptor section (P09 M07 test/golden middle rows from permission bypass questions through human approval summary) cover every planned row title as descriptor-only rows?",
      "Does CP00-340 avoid permission bypass, UI leaks, Hermes runtime receipts, command runtime execution, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp340CloseoutHandoff() {
  return freezeCp340Validation({
    handoff_id: "CP00-340-to-CP00-341",
    from_pack_id: INTAKE_CORE_CP340_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP340_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP340_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP340_PACK_BINDING.range,
    open_scope: "Continue RP10.P09.M07.S13 onward with the remaining review rows and downstream micros while preserving descriptor-only intake boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP340_PACK_BINDING.production_ready_flag,
  });
}

export function createIntakeCoreCp341CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp341Validation({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
  });
}

export function validateIntakeCoreCp341Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-341 plan pack is required");
  if (planPack?.pack_id !== INTAKE_CORE_CP341_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-341");
  if (planPack?.risk_class !== INTAKE_CORE_CP341_PACK_BINDING.risk_class) errors.push("CP00-341 risk class drift");
  if (planPack?.unit_count !== INTAKE_CORE_CP341_PACK_BINDING.unit_count) errors.push("CP00-341 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== INTAKE_CORE_CP341_PACK_BINDING.first_unit_id) errors.push("CP00-341 first unit drift");
  if (unitIds.at(-1) !== INTAKE_CORE_CP341_PACK_BINDING.last_unit_id) errors.push("CP00-341 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-341 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP10")) errors.push("CP00-341 must only include RP10 units");
  const summary = createIntakeCoreCp341CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-341 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-341 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-341 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-341 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-341 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-341 ${microId} missing row ${title}`);
    }
  }
  return freezeCp341Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateIntakeCoreCp341ReviewCloseoutSliceDescriptor(
  descriptor = createIntakeCoreCp341ReviewCloseoutSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_closeout_slice_case_set ?? createIntakeCoreCp341ReviewCloseoutSliceCaseSet();
  if (descriptor.descriptor !== "IntakeCoreCp341ReviewCloseoutSliceDescriptor") errors.push("CP00-341 descriptor type drift");
  if (descriptor.source_review_slice_descriptor !== "IntakeCoreCp340ReviewSliceDescriptor") {
    errors.push("CP00-341 source review slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows).length) errors.push("CP00-341 section count drift");
  for (const [microId, titles] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-341 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-341 ${microId} row count drift`);
    for (const title of titles) {
      const key = intakeCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-341 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-341 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-341 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-341 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-341 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(INTAKE_CORE_CP341_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-341 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-341 ${microId} command rerun must not execute runtime`);
    }
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-341 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-341 ${microId} UI leak detected`);
    }
  }
  if (INTAKE_CORE_CP341_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-341 must not promote Claude");
  if (INTAKE_CORE_CP341_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-341 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-341 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-341 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== INTAKE_CORE_CP341_PACK_BINDING.pack_id) {
    errors.push("CP00-341 contract current_pack drift");
  }
  if (
    contractProjection?.review_closeout_slice_descriptor?.descriptor &&
    contractProjection.review_closeout_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-341 contract review_closeout_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== INTAKE_CORE_CP341_PACK_BINDING.next_pack_id) errors.push("CP00-341 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== INTAKE_CORE_CP341_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-341 next subphase drift");
  }
  return freezeCp341Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createIntakeCoreCp341HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createIntakeCoreCp341ReviewCloseoutSliceDescriptor(),
) {
  const coverage = validateIntakeCoreCp341Coverage(planPack);
  const slice = validateIntakeCoreCp341ReviewCloseoutSliceDescriptor(descriptor, contractProjection);
  return freezeCp341Validation({
    evidence_packet: "H10.CP00-341.intake_core_review_closeout_slice_descriptor",
    gate: INTAKE_CORE_CP341_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_closeout_slice_valid: slice.valid,
    no_real_data: true,
    source_review_slice_pack_id: INTAKE_CORE_CP341_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: INTAKE_CORE_CP341_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: INTAKE_CORE_CP341_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP341_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createIntakeCoreCp341ClaudeReviewPacket(planPack) {
  const coverage = validateIntakeCoreCp341Coverage(planPack);
  const slice = validateIntakeCoreCp341ReviewCloseoutSliceDescriptor(createIntakeCoreCp341ReviewCloseoutSliceDescriptor(), {});
  return freezeCp341Validation({
    review_packet: "C10.CP00-341.intake_core_review_closeout_slice_descriptor",
    gate: INTAKE_CORE_CP341_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: INTAKE_CORE_CP341_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_closeout_slice_valid: slice.valid,
    invalid_review_blockers: INTAKE_CORE_CP341_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-341 cover exactly the 28 planned RP10 units from RP10.P09.M07.S13 through RP10.P09.M10.S04?",
      "Do the four descriptor sections (P09 M07 test/golden tail with Claude review packets, closeout criteria, PASS/PASS_WITH_FINDINGS/BLOCK closeout notes, next RP dependencies, documentation updates, and command reruns, M08 Hermes evidence and M09 Claude review 8-row heads, and M10 closeout 4-row head) cover every planned row title as descriptor-only rows?",
      "Does CP00-341 avoid permission bypass, UI leaks, Hermes runtime receipts, command runtime execution, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack close the RP10 descriptor scope and hand off to RP11.P00.M00.S01 without treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createIntakeCoreCp341CloseoutHandoff() {
  return freezeCp341Validation({
    handoff_id: "CP00-341-to-CP00-342",
    from_pack_id: INTAKE_CORE_CP341_PACK_BINDING.pack_id,
    to_pack_id: INTAKE_CORE_CP341_PACK_BINDING.next_pack_id,
    next_subphase_id: INTAKE_CORE_CP341_PACK_BINDING.next_subphase_id,
    closed_scope: INTAKE_CORE_CP341_PACK_BINDING.range,
    open_scope: "RP10 descriptor scope is closed; continue RP11.P00.M00.S01 onward with the next program while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: INTAKE_CORE_CP341_PACK_BINDING.production_ready_flag,
  });
}
