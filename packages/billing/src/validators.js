import {
  BILLING_CORE_CP364_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP364_PACK_BINDING,
  BILLING_CORE_CP364_REQUIREMENTS,
  BILLING_CORE_CP365_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP365_PACK_BINDING,
  BILLING_CORE_CP365_REQUIREMENTS,
  BILLING_CORE_CP366_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP366_PACK_BINDING,
  BILLING_CORE_CP366_REQUIREMENTS,
  BILLING_CORE_CP367_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP367_PACK_BINDING,
  BILLING_CORE_CP367_REQUIREMENTS,
  BILLING_CORE_CP368_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP368_PACK_BINDING,
  BILLING_CORE_CP368_REQUIREMENTS,
  BILLING_CORE_CP369_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP369_PACK_BINDING,
  BILLING_CORE_CP369_REQUIREMENTS,
  BILLING_CORE_CP370_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP370_PACK_BINDING,
  BILLING_CORE_CP370_REQUIREMENTS,
  BILLING_CORE_CP371_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP371_PACK_BINDING,
  BILLING_CORE_CP371_REQUIREMENTS,
  BILLING_CORE_CP372_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP372_PACK_BINDING,
  BILLING_CORE_CP372_REQUIREMENTS,
  BILLING_CORE_CP373_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP373_PACK_BINDING,
  BILLING_CORE_CP373_REQUIREMENTS,
  BILLING_CORE_CP374_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP374_PACK_BINDING,
  BILLING_CORE_CP374_REQUIREMENTS,
  BILLING_CORE_CP375_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP375_PACK_BINDING,
  BILLING_CORE_CP375_REQUIREMENTS,
  BILLING_CORE_CP376_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP376_PACK_BINDING,
  BILLING_CORE_CP376_REQUIREMENTS,
  BILLING_CORE_CP377_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP377_PACK_BINDING,
  BILLING_CORE_CP377_REQUIREMENTS,
  BILLING_CORE_CP378_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP378_PACK_BINDING,
  BILLING_CORE_CP378_REQUIREMENTS,
  BILLING_CORE_CP379_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP379_PACK_BINDING,
  BILLING_CORE_CP379_REQUIREMENTS,
  BILLING_CORE_CP380_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP380_PACK_BINDING,
  BILLING_CORE_CP380_REQUIREMENTS,
  BILLING_CORE_CP381_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP381_PACK_BINDING,
  BILLING_CORE_CP381_REQUIREMENTS,
  BILLING_CORE_CP382_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP382_PACK_BINDING,
  BILLING_CORE_CP382_REQUIREMENTS,
  BILLING_CORE_CP383_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP383_PACK_BINDING,
  BILLING_CORE_CP383_REQUIREMENTS,
  BILLING_CORE_CP384_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP384_PACK_BINDING,
  BILLING_CORE_CP384_REQUIREMENTS,
  BILLING_CORE_CP385_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP385_PACK_BINDING,
  BILLING_CORE_CP385_REQUIREMENTS,
  BILLING_CORE_CP386_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP386_PACK_BINDING,
  BILLING_CORE_CP386_REQUIREMENTS,
  BILLING_CORE_CP387_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP387_PACK_BINDING,
  BILLING_CORE_CP387_REQUIREMENTS,
  BILLING_CORE_CP388_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP388_PACK_BINDING,
  BILLING_CORE_CP388_REQUIREMENTS,
  BILLING_CORE_CP389_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP389_PACK_BINDING,
  BILLING_CORE_CP389_REQUIREMENTS,
  BILLING_CORE_CP390_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP390_PACK_BINDING,
  BILLING_CORE_CP390_REQUIREMENTS,
  BILLING_CORE_CP391_NO_WRITE_ATTESTATION,
  BILLING_CORE_CP391_PACK_BINDING,
  BILLING_CORE_CP391_REQUIREMENTS,
} from "./registry.js";
import {
  createBillingCoreCp364ScopeContractFoundationCaseSet,
  createBillingCoreCp364ScopeContractFoundationDescriptor,
  createBillingCoreCp365ModelFoundationSliceCaseSet,
  createBillingCoreCp365ModelFoundationSliceDescriptor,
  createBillingCoreCp366WorkflowPermissionSliceCaseSet,
  createBillingCoreCp366WorkflowPermissionSliceDescriptor,
  createBillingCoreCp367P01CloseoutP02FoundationCaseSet,
  createBillingCoreCp367P01CloseoutP02FoundationDescriptor,
  createBillingCoreCp368P02ImplementationSliceCaseSet,
  createBillingCoreCp368P02ImplementationSliceDescriptor,
  createBillingCoreCp369P02PermissionFixtureSliceCaseSet,
  createBillingCoreCp369P02PermissionFixtureSliceDescriptor,
  createBillingCoreCp370P02FixtureTestSliceCaseSet,
  createBillingCoreCp370P02FixtureTestSliceDescriptor,
  createBillingCoreCp371P02TestSliceCaseSet,
  createBillingCoreCp371P02TestSliceDescriptor,
  createBillingCoreCp372P02TestHermesSliceCaseSet,
  createBillingCoreCp372P02TestHermesSliceDescriptor,
  createBillingCoreCp373P02CloseoutP03FoundationCaseSet,
  createBillingCoreCp373P02CloseoutP03FoundationDescriptor,
  createBillingCoreCp374P03CloseoutP04FoundationCaseSet,
  createBillingCoreCp374P03CloseoutP04FoundationDescriptor,
  createBillingCoreCp375P04WorkflowPermissionSliceCaseSet,
  createBillingCoreCp375P04WorkflowPermissionSliceDescriptor,
  createBillingCoreCp376P04PermissionFixtureSliceCaseSet,
  createBillingCoreCp376P04PermissionFixtureSliceDescriptor,
  createBillingCoreCp377P04CloseoutP05FoundationCaseSet,
  createBillingCoreCp377P04CloseoutP05FoundationDescriptor,
  createBillingCoreCp378P05ImplementationSliceCaseSet,
  createBillingCoreCp378P05ImplementationSliceDescriptor,
  createBillingCoreCp379P05CloseoutP06FoundationCaseSet,
  createBillingCoreCp379P05CloseoutP06FoundationDescriptor,
  createBillingCoreCp380P06FoundationSliceCaseSet,
  createBillingCoreCp380P06FoundationSliceDescriptor,
  createBillingCoreCp381P06TestHermesSliceCaseSet,
  createBillingCoreCp381P06TestHermesSliceDescriptor,
  createBillingCoreCp382P06CloseoutP07FoundationCaseSet,
  createBillingCoreCp382P06CloseoutP07FoundationDescriptor,
  createBillingCoreCp383P07PermissionSliceCaseSet,
  createBillingCoreCp383P07PermissionSliceDescriptor,
  createBillingCoreCp384P07PermissionFixtureSliceCaseSet,
  createBillingCoreCp384P07PermissionFixtureSliceDescriptor,
  createBillingCoreCp385P07CloseoutP08FoundationCaseSet,
  createBillingCoreCp385P07CloseoutP08FoundationDescriptor,
  createBillingCoreCp386P08ImplementationSliceCaseSet,
  createBillingCoreCp386P08ImplementationSliceDescriptor,
  createBillingCoreCp387P08WorkflowPermissionSliceCaseSet,
  createBillingCoreCp387P08WorkflowPermissionSliceDescriptor,
  createBillingCoreCp388P08CloseoutP09FoundationCaseSet,
  createBillingCoreCp388P08CloseoutP09FoundationDescriptor,
  createBillingCoreCp389P09WorkflowPermissionSliceCaseSet,
  createBillingCoreCp389P09WorkflowPermissionSliceDescriptor,
  createBillingCoreCp390P09PermissionFixtureSliceCaseSet,
  createBillingCoreCp390P09PermissionFixtureSliceDescriptor,
  createBillingCoreCp391P09CloseoutSliceCaseSet,
  createBillingCoreCp391P09CloseoutSliceDescriptor,
  billingCoreRowKey,
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

function freezeCp364Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP364_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP364_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp364CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp364Validation({
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

export function validateBillingCoreCp364Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-364 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP364_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-364");
  if (planPack?.risk_class !== BILLING_CORE_CP364_PACK_BINDING.risk_class) errors.push("CP00-364 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP364_PACK_BINDING.unit_count) errors.push("CP00-364 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP364_PACK_BINDING.first_unit_id) errors.push("CP00-364 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP364_PACK_BINDING.last_unit_id) errors.push("CP00-364 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-364 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-364 must only include RP12 units");
  const summary = createBillingCoreCp364CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-364 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-364 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-364 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-364 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-364 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-364 ${microId} missing row ${title}`);
    }
  }
  return freezeCp364Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp364ScopeContractFoundationDescriptor(
  descriptor = createBillingCoreCp364ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createBillingCoreCp364ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp364ScopeContractFoundationDescriptor") errors.push("CP00-364 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP12") errors.push("CP00-364 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP11") errors.push("CP00-364 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows).length) errors.push("CP00-364 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-364 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-364 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-364 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-364 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-364 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-364 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-364 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP364_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.non_goal_boundary && rows.non_goal_boundary.billing_runtime_opened !== false) {
      errors.push(`CP00-364 ${microId} must not open billing runtime`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.permission_decision_detail_included !== false) {
      errors.push(`CP00-364 ${microId} permission baseline must not expose decisions`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-364 ${microId} permission baseline must deny cross-tenant access`);
    }
    if (rows.audit_baseline_note && rows.audit_baseline_note.audit_event_body_included !== false) {
      errors.push(`CP00-364 ${microId} audit baseline must not expose event bodies`);
    }
    if (rows.synthetic_data_policy && rows.synthetic_data_policy.real_client_data_loaded !== false) {
      errors.push(`CP00-364 ${microId} synthetic data policy drift`);
    }
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-364 ${microId} tenant scope must deny cross-tenant access`);
    }
    if (rows.matter_trace_reference && rows.matter_trace_reference.matter_trace_required !== true) {
      errors.push(`CP00-364 ${microId} matter trace must be required`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-364 ${microId} state transition map must not write state`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-364 ${microId} fixture model must not load real data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-364 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-364 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-364 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP364_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-364 must not promote Claude");
  if (BILLING_CORE_CP364_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-364 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-364 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-364 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP364_PACK_BINDING.pack_id, BILLING_CORE_CP365_PACK_BINDING.pack_id, BILLING_CORE_CP366_PACK_BINDING.pack_id, BILLING_CORE_CP367_PACK_BINDING.pack_id, BILLING_CORE_CP368_PACK_BINDING.pack_id, BILLING_CORE_CP369_PACK_BINDING.pack_id, BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-364 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-364 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP364_PACK_BINDING.next_pack_id) errors.push("CP00-364 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP364_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-364 next subphase drift");
  }
  return freezeCp364Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp364HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp364ScopeContractFoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp364Coverage(planPack);
  const foundation = validateBillingCoreCp364ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp364Validation({
    evidence_packet: "H12.CP00-364.billing_core_scope_contract_foundation_descriptor",
    gate: BILLING_CORE_CP364_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_time_expense_core_pack_id: BILLING_CORE_CP364_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP364_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP364_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP364_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createBillingCoreCp364ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp364Coverage(planPack);
  const foundation = validateBillingCoreCp364ScopeContractFoundationDescriptor(createBillingCoreCp364ScopeContractFoundationDescriptor(), {});
  return freezeCp364Validation({
    review_packet: "C12.CP00-364.billing_core_scope_contract_foundation_descriptor",
    gate: BILLING_CORE_CP364_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP364_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: BILLING_CORE_CP364_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-364 cover exactly the 150 planned RP12 units from RP12.P00.M00.S01 through RP12.P01.M02.S08?",
      "Do the twenty-one descriptor sections (P00 M00-M10 scope foundation cycle and P01 M00-M08 model foundation cycle with package directory layout, primary entity identifier, tenant scope field, matter trace reference, lifecycle status enum, ownership metadata, reference relationship map, field registries, state transition map, validation helper, fixture model, serialization shape, public export, model tests, Hermes model summary, Claude model review prompt, and closeout handoff) cover every planned row title as descriptor-only rows?",
      "Does CP00-364 avoid billing/proforma/invoice/write-down runtime, runtime permission evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, real data, permission decision leaks, audit event body leaks, fixture payload leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp364CloseoutHandoff() {
  return freezeCp364Validation({
    handoff_id: "CP00-364-to-CP00-365",
    from_pack_id: BILLING_CORE_CP364_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP364_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP364_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP364_PACK_BINDING.range,
    open_scope: "Continue RP12.P01.M02.S09 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP364_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp365Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP365_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP365_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp365CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp365Validation({
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

export function validateBillingCoreCp365Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-365 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP365_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-365");
  if (planPack?.risk_class !== BILLING_CORE_CP365_PACK_BINDING.risk_class) errors.push("CP00-365 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP365_PACK_BINDING.unit_count) errors.push("CP00-365 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP365_PACK_BINDING.first_unit_id) errors.push("CP00-365 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP365_PACK_BINDING.last_unit_id) errors.push("CP00-365 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-365 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-365 must only include RP12 units");
  const summary = createBillingCoreCp365CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-365 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-365 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-365 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-365 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-365 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-365 ${microId} missing row ${title}`);
    }
  }
  return freezeCp365Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp365ModelFoundationSliceDescriptor(
  descriptor = createBillingCoreCp365ModelFoundationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.model_foundation_slice_case_set ?? createBillingCoreCp365ModelFoundationSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp365ModelFoundationSliceDescriptor") errors.push("CP00-365 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "BillingCoreCp364ScopeContractFoundationDescriptor") {
    errors.push("CP00-365 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows).length) errors.push("CP00-365 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-365 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-365 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-365 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-365 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-365 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-365 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-365 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP365_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-365 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-365 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-365 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-365 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-365 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-365 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-365 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-365 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP365_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-365 must not promote Claude");
  if (BILLING_CORE_CP365_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-365 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-365 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-365 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP365_PACK_BINDING.pack_id, BILLING_CORE_CP366_PACK_BINDING.pack_id, BILLING_CORE_CP367_PACK_BINDING.pack_id, BILLING_CORE_CP368_PACK_BINDING.pack_id, BILLING_CORE_CP369_PACK_BINDING.pack_id, BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-365 contract current_pack drift");
  }
  if (
    contractProjection?.model_foundation_slice_descriptor?.descriptor &&
    contractProjection.model_foundation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-365 contract model_foundation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP365_PACK_BINDING.next_pack_id) errors.push("CP00-365 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP365_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-365 next subphase drift");
  }
  return freezeCp365Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp365HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp365ModelFoundationSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp365Coverage(planPack);
  const slice = validateBillingCoreCp365ModelFoundationSliceDescriptor(descriptor, contractProjection);
  return freezeCp365Validation({
    evidence_packet: "H12.CP00-365.billing_core_model_foundation_slice_descriptor",
    gate: BILLING_CORE_CP365_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    model_foundation_slice_valid: slice.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: BILLING_CORE_CP365_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP365_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP365_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP365_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp365ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp365Coverage(planPack);
  const slice = validateBillingCoreCp365ModelFoundationSliceDescriptor(createBillingCoreCp365ModelFoundationSliceDescriptor(), {});
  return freezeCp365Validation({
    review_packet: "C12.CP00-365.billing_core_model_foundation_slice_descriptor",
    gate: BILLING_CORE_CP365_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP365_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    model_foundation_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP365_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-365 cover exactly the 40 planned RP12 units from RP12.P01.M02.S09 through RP12.P01.M04.S06?",
      "Do the three descriptor sections (the M02 type-and-shape tail, the full M03 primary implementation model cycle with documentation entry and index export check, and the M04 secondary workflow head) cover every planned row title as a descriptor-only row?",
      "Does CP00-365 avoid state transition writes, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp365CloseoutHandoff() {
  return freezeCp365Validation({
    handoff_id: "CP00-365-to-CP00-366",
    from_pack_id: BILLING_CORE_CP365_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP365_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP365_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP365_PACK_BINDING.range,
    open_scope: "Continue RP12.P01.M04.S07 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP365_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp366Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP366_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP366_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp366CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp366Validation({
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

export function validateBillingCoreCp366Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-366 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP366_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-366");
  if (planPack?.risk_class !== BILLING_CORE_CP366_PACK_BINDING.risk_class) errors.push("CP00-366 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP366_PACK_BINDING.unit_count) errors.push("CP00-366 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP366_PACK_BINDING.first_unit_id) errors.push("CP00-366 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP366_PACK_BINDING.last_unit_id) errors.push("CP00-366 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-366 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-366 must only include RP12 units");
  const summary = createBillingCoreCp366CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-366 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-366 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-366 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-366 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-366 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-366 ${microId} missing row ${title}`);
    }
  }
  return freezeCp366Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp366WorkflowPermissionSliceDescriptor(
  descriptor = createBillingCoreCp366WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.workflow_permission_slice_case_set ?? createBillingCoreCp366WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp366WorkflowPermissionSliceDescriptor") errors.push("CP00-366 descriptor type drift");
  if (descriptor.source_model_foundation_slice_descriptor !== "BillingCoreCp365ModelFoundationSliceDescriptor") {
    errors.push("CP00-366 source model foundation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows).length) errors.push("CP00-366 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-366 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-366 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-366 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-366 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-366 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-366 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-366 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP366_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-366 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-366 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-366 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-366 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-366 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-366 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-366 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-366 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP366_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-366 must not promote Claude");
  if (BILLING_CORE_CP366_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-366 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-366 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-366 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP366_PACK_BINDING.pack_id, BILLING_CORE_CP367_PACK_BINDING.pack_id, BILLING_CORE_CP368_PACK_BINDING.pack_id, BILLING_CORE_CP369_PACK_BINDING.pack_id, BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-366 contract current_pack drift");
  }
  if (
    contractProjection?.workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-366 contract workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP366_PACK_BINDING.next_pack_id) errors.push("CP00-366 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP366_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-366 next subphase drift");
  }
  return freezeCp366Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp366HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp366WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp366Coverage(planPack);
  const slice = validateBillingCoreCp366WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp366Validation({
    evidence_packet: "H12.CP00-366.billing_core_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP366_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_model_foundation_slice_pack_id: BILLING_CORE_CP366_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP366_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP366_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP366_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp366ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp366Coverage(planPack);
  const slice = validateBillingCoreCp366WorkflowPermissionSliceDescriptor(createBillingCoreCp366WorkflowPermissionSliceDescriptor(), {});
  return freezeCp366Validation({
    review_packet: "C12.CP00-366.billing_core_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP366_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP366_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP366_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-366 cover exactly the 40 planned RP12 units from RP12.P01.M04.S07 through RP12.P01.M06.S04?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-366 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp366CloseoutHandoff() {
  return freezeCp366Validation({
    handoff_id: "CP00-366-to-CP00-367",
    from_pack_id: BILLING_CORE_CP366_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP366_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP366_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP366_PACK_BINDING.range,
    open_scope: "Continue RP12.P01.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP366_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp367Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP367_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP367_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp367CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp367Validation({
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

export function validateBillingCoreCp367Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-367 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP367_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-367");
  if (planPack?.risk_class !== BILLING_CORE_CP367_PACK_BINDING.risk_class) errors.push("CP00-367 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP367_PACK_BINDING.unit_count) errors.push("CP00-367 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP367_PACK_BINDING.first_unit_id) errors.push("CP00-367 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP367_PACK_BINDING.last_unit_id) errors.push("CP00-367 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-367 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-367 must only include RP12 units");
  const summary = createBillingCoreCp367CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-367 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-367 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-367 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-367 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-367 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-367 ${microId} missing row ${title}`);
    }
  }
  return freezeCp367Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp367P01CloseoutP02FoundationDescriptor(
  descriptor = createBillingCoreCp367P01CloseoutP02FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_foundation_case_set ?? createBillingCoreCp367P01CloseoutP02FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp367P01CloseoutP02FoundationDescriptor") errors.push("CP00-367 descriptor type drift");
  if (descriptor.source_workflow_permission_slice_descriptor !== "BillingCoreCp366WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-367 source workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows).length) errors.push("CP00-367 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-367 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-367 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-367 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-367 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-367 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-367 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-367 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP367_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-367 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-367 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-367 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-367 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-367 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-367 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-367 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-367 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP367_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-367 must not promote Claude");
  if (BILLING_CORE_CP367_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-367 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-367 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-367 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP367_PACK_BINDING.pack_id, BILLING_CORE_CP368_PACK_BINDING.pack_id, BILLING_CORE_CP369_PACK_BINDING.pack_id, BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-367 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-367 contract p01_closeout_p02_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP367_PACK_BINDING.next_pack_id) errors.push("CP00-367 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP367_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-367 next subphase drift");
  }
  return freezeCp367Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp367HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp367P01CloseoutP02FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp367Coverage(planPack);
  const slice = validateBillingCoreCp367P01CloseoutP02FoundationDescriptor(descriptor, contractProjection);
  return freezeCp367Validation({
    evidence_packet: "H12.CP00-367.billing_core_p01_closeout_p02_foundation_descriptor",
    gate: BILLING_CORE_CP367_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_foundation_valid: slice.valid,
    no_real_data: true,
    source_workflow_permission_slice_pack_id: BILLING_CORE_CP367_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP367_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP367_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP367_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp367ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp367Coverage(planPack);
  const slice = validateBillingCoreCp367P01CloseoutP02FoundationDescriptor(createBillingCoreCp367P01CloseoutP02FoundationDescriptor(), {});
  return freezeCp367Validation({
    review_packet: "C12.CP00-367.billing_core_p01_closeout_p02_foundation_descriptor",
    gate: BILLING_CORE_CP367_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP367_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP367_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-367 cover exactly the 150 planned RP12 units from RP12.P01.M06.S05 through RP12.P02.M02.S22?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-367 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp367CloseoutHandoff() {
  return freezeCp367Validation({
    handoff_id: "CP00-367-to-CP00-368",
    from_pack_id: BILLING_CORE_CP367_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP367_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP367_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP367_PACK_BINDING.range,
    open_scope: "Continue RP12.P02.M03.S01 onward with the P02 primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP367_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp368Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP368_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP368_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp368CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp368Validation({
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

export function validateBillingCoreCp368Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-368 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP368_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-368");
  if (planPack?.risk_class !== BILLING_CORE_CP368_PACK_BINDING.risk_class) errors.push("CP00-368 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP368_PACK_BINDING.unit_count) errors.push("CP00-368 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP368_PACK_BINDING.first_unit_id) errors.push("CP00-368 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP368_PACK_BINDING.last_unit_id) errors.push("CP00-368 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-368 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-368 must only include RP12 units");
  const summary = createBillingCoreCp368CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-368 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-368 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-368 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-368 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-368 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-368 ${microId} missing row ${title}`);
    }
  }
  return freezeCp368Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp368P02ImplementationSliceDescriptor(
  descriptor = createBillingCoreCp368P02ImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_implementation_slice_case_set ?? createBillingCoreCp368P02ImplementationSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp368P02ImplementationSliceDescriptor") errors.push("CP00-368 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_foundation_descriptor !== "BillingCoreCp367P01CloseoutP02FoundationDescriptor") {
    errors.push("CP00-368 source p01 closeout p02 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows).length) errors.push("CP00-368 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-368 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-368 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-368 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-368 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-368 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-368 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-368 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP368_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-368 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-368 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-368 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-368 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-368 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-368 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-368 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-368 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP368_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-368 must not promote Claude");
  if (BILLING_CORE_CP368_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-368 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-368 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-368 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP368_PACK_BINDING.pack_id, BILLING_CORE_CP369_PACK_BINDING.pack_id, BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-368 contract current_pack drift");
  }
  if (
    contractProjection?.p02_implementation_slice_descriptor?.descriptor &&
    contractProjection.p02_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-368 contract p02_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP368_PACK_BINDING.next_pack_id) errors.push("CP00-368 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP368_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-368 next subphase drift");
  }
  return freezeCp368Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp368HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp368P02ImplementationSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp368Coverage(planPack);
  const slice = validateBillingCoreCp368P02ImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp368Validation({
    evidence_packet: "H12.CP00-368.billing_core_p02_implementation_slice_descriptor",
    gate: BILLING_CORE_CP368_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_foundation_pack_id: BILLING_CORE_CP368_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP368_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP368_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP368_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp368ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp368Coverage(planPack);
  const slice = validateBillingCoreCp368P02ImplementationSliceDescriptor(createBillingCoreCp368P02ImplementationSliceDescriptor(), {});
  return freezeCp368Validation({
    review_packet: "C12.CP00-368.billing_core_p02_implementation_slice_descriptor",
    gate: BILLING_CORE_CP368_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP368_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_implementation_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP368_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-368 cover exactly the 40 planned RP12 units from RP12.P02.M03.S01 through RP12.P02.M04.S18?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-368 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp368CloseoutHandoff() {
  return freezeCp368Validation({
    handoff_id: "CP00-368-to-CP00-369",
    from_pack_id: BILLING_CORE_CP368_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP368_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP368_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP368_PACK_BINDING.range,
    open_scope: "Continue RP12.P02.M04.S19 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP368_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp369Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP369_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP369_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp369CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp369Validation({
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

export function validateBillingCoreCp369Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-369 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP369_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-369");
  if (planPack?.risk_class !== BILLING_CORE_CP369_PACK_BINDING.risk_class) errors.push("CP00-369 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP369_PACK_BINDING.unit_count) errors.push("CP00-369 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP369_PACK_BINDING.first_unit_id) errors.push("CP00-369 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP369_PACK_BINDING.last_unit_id) errors.push("CP00-369 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-369 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-369 must only include RP12 units");
  const summary = createBillingCoreCp369CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-369 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-369 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-369 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-369 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-369 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-369 ${microId} missing row ${title}`);
    }
  }
  return freezeCp369Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp369P02PermissionFixtureSliceDescriptor(
  descriptor = createBillingCoreCp369P02PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_permission_fixture_slice_case_set ?? createBillingCoreCp369P02PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp369P02PermissionFixtureSliceDescriptor") errors.push("CP00-369 descriptor type drift");
  if (descriptor.source_p02_implementation_slice_descriptor !== "BillingCoreCp368P02ImplementationSliceDescriptor") {
    errors.push("CP00-369 source p02 implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows).length) errors.push("CP00-369 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-369 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-369 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-369 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-369 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-369 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-369 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-369 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP369_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-369 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-369 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-369 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-369 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-369 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-369 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-369 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-369 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP369_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-369 must not promote Claude");
  if (BILLING_CORE_CP369_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-369 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-369 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-369 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP369_PACK_BINDING.pack_id, BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-369 contract current_pack drift");
  }
  if (
    contractProjection?.p02_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p02_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-369 contract p02_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP369_PACK_BINDING.next_pack_id) errors.push("CP00-369 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP369_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-369 next subphase drift");
  }
  return freezeCp369Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp369HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp369P02PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp369Coverage(planPack);
  const slice = validateBillingCoreCp369P02PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp369Validation({
    evidence_packet: "H12.CP00-369.billing_core_p02_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP369_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_implementation_slice_pack_id: BILLING_CORE_CP369_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP369_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP369_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP369_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp369ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp369Coverage(planPack);
  const slice = validateBillingCoreCp369P02PermissionFixtureSliceDescriptor(createBillingCoreCp369P02PermissionFixtureSliceDescriptor(), {});
  return freezeCp369Validation({
    review_packet: "C12.CP00-369.billing_core_p02_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP369_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP369_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP369_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-369 cover exactly the 40 planned RP12 units from RP12.P02.M04.S19 through RP12.P02.M06.S14?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-369 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp369CloseoutHandoff() {
  return freezeCp369Validation({
    handoff_id: "CP00-369-to-CP00-370",
    from_pack_id: BILLING_CORE_CP369_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP369_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP369_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP369_PACK_BINDING.range,
    open_scope: "Continue RP12.P02.M06.S15 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP369_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp370Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP370_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP370_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp370CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp370Validation({
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

export function validateBillingCoreCp370Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-370 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP370_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-370");
  if (planPack?.risk_class !== BILLING_CORE_CP370_PACK_BINDING.risk_class) errors.push("CP00-370 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP370_PACK_BINDING.unit_count) errors.push("CP00-370 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP370_PACK_BINDING.first_unit_id) errors.push("CP00-370 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP370_PACK_BINDING.last_unit_id) errors.push("CP00-370 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-370 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-370 must only include RP12 units");
  const summary = createBillingCoreCp370CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-370 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-370 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-370 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-370 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-370 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-370 ${microId} missing row ${title}`);
    }
  }
  return freezeCp370Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp370P02FixtureTestSliceDescriptor(
  descriptor = createBillingCoreCp370P02FixtureTestSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_fixture_test_slice_case_set ?? createBillingCoreCp370P02FixtureTestSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp370P02FixtureTestSliceDescriptor") errors.push("CP00-370 descriptor type drift");
  if (descriptor.source_p02_permission_fixture_slice_descriptor !== "BillingCoreCp369P02PermissionFixtureSliceDescriptor") {
    errors.push("CP00-370 source p02 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows).length) errors.push("CP00-370 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-370 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-370 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-370 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-370 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-370 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-370 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-370 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP370_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-370 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-370 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-370 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-370 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-370 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-370 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-370 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-370 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP370_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-370 must not promote Claude");
  if (BILLING_CORE_CP370_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-370 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-370 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-370 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP370_PACK_BINDING.pack_id, BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-370 contract current_pack drift");
  }
  if (
    contractProjection?.p02_fixture_test_slice_descriptor?.descriptor &&
    contractProjection.p02_fixture_test_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-370 contract p02_fixture_test_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP370_PACK_BINDING.next_pack_id) errors.push("CP00-370 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP370_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-370 next subphase drift");
  }
  return freezeCp370Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp370HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp370P02FixtureTestSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp370Coverage(planPack);
  const slice = validateBillingCoreCp370P02FixtureTestSliceDescriptor(descriptor, contractProjection);
  return freezeCp370Validation({
    evidence_packet: "H12.CP00-370.billing_core_p02_fixture_test_slice_descriptor",
    gate: BILLING_CORE_CP370_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_fixture_test_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_permission_fixture_slice_pack_id: BILLING_CORE_CP370_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP370_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP370_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP370_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp370ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp370Coverage(planPack);
  const slice = validateBillingCoreCp370P02FixtureTestSliceDescriptor(createBillingCoreCp370P02FixtureTestSliceDescriptor(), {});
  return freezeCp370Validation({
    review_packet: "C12.CP00-370.billing_core_p02_fixture_test_slice_descriptor",
    gate: BILLING_CORE_CP370_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP370_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_fixture_test_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP370_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-370 cover exactly the 10 planned RP12 units from RP12.P02.M06.S15 through RP12.P02.M07.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-370 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp370CloseoutHandoff() {
  return freezeCp370Validation({
    handoff_id: "CP00-370-to-CP00-371",
    from_pack_id: BILLING_CORE_CP370_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP370_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP370_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP370_PACK_BINDING.range,
    open_scope: "Continue RP12.P02.M07.S03 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP370_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp371Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP371_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP371_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp371CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp371Validation({
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

export function validateBillingCoreCp371Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-371 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP371_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-371");
  if (planPack?.risk_class !== BILLING_CORE_CP371_PACK_BINDING.risk_class) errors.push("CP00-371 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP371_PACK_BINDING.unit_count) errors.push("CP00-371 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP371_PACK_BINDING.first_unit_id) errors.push("CP00-371 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP371_PACK_BINDING.last_unit_id) errors.push("CP00-371 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-371 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-371 must only include RP12 units");
  const summary = createBillingCoreCp371CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-371 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-371 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-371 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-371 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-371 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-371 ${microId} missing row ${title}`);
    }
  }
  return freezeCp371Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp371P02TestSliceDescriptor(
  descriptor = createBillingCoreCp371P02TestSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_test_slice_case_set ?? createBillingCoreCp371P02TestSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp371P02TestSliceDescriptor") errors.push("CP00-371 descriptor type drift");
  if (descriptor.source_p02_fixture_test_slice_descriptor !== "BillingCoreCp370P02FixtureTestSliceDescriptor") {
    errors.push("CP00-371 source p02 fixture test slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows).length) errors.push("CP00-371 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-371 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-371 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-371 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-371 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-371 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-371 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-371 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP371_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-371 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-371 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-371 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-371 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-371 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-371 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-371 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-371 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP371_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-371 must not promote Claude");
  if (BILLING_CORE_CP371_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-371 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-371 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-371 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP371_PACK_BINDING.pack_id, BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-371 contract current_pack drift");
  }
  if (
    contractProjection?.p02_test_slice_descriptor?.descriptor &&
    contractProjection.p02_test_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-371 contract p02_test_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP371_PACK_BINDING.next_pack_id) errors.push("CP00-371 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP371_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-371 next subphase drift");
  }
  return freezeCp371Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp371HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp371P02TestSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp371Coverage(planPack);
  const slice = validateBillingCoreCp371P02TestSliceDescriptor(descriptor, contractProjection);
  return freezeCp371Validation({
    evidence_packet: "H12.CP00-371.billing_core_p02_test_slice_descriptor",
    gate: BILLING_CORE_CP371_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_test_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_fixture_test_slice_pack_id: BILLING_CORE_CP371_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP371_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP371_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP371_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp371ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp371Coverage(planPack);
  const slice = validateBillingCoreCp371P02TestSliceDescriptor(createBillingCoreCp371P02TestSliceDescriptor(), {});
  return freezeCp371Validation({
    review_packet: "C12.CP00-371.billing_core_p02_test_slice_descriptor",
    gate: BILLING_CORE_CP371_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP371_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_test_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP371_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-371 cover exactly the 10 planned RP12 units from RP12.P02.M07.S03 through RP12.P02.M07.S12?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-371 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp371CloseoutHandoff() {
  return freezeCp371Validation({
    handoff_id: "CP00-371-to-CP00-372",
    from_pack_id: BILLING_CORE_CP371_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP371_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP371_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP371_PACK_BINDING.range,
    open_scope: "Continue RP12.P02.M07.S13 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP371_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp372Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP372_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP372_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp372CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp372Validation({
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

export function validateBillingCoreCp372Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-372 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP372_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-372");
  if (planPack?.risk_class !== BILLING_CORE_CP372_PACK_BINDING.risk_class) errors.push("CP00-372 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP372_PACK_BINDING.unit_count) errors.push("CP00-372 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP372_PACK_BINDING.first_unit_id) errors.push("CP00-372 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP372_PACK_BINDING.last_unit_id) errors.push("CP00-372 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-372 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-372 must only include RP12 units");
  const summary = createBillingCoreCp372CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-372 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-372 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-372 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-372 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-372 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-372 ${microId} missing row ${title}`);
    }
  }
  return freezeCp372Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp372P02TestHermesSliceDescriptor(
  descriptor = createBillingCoreCp372P02TestHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_test_hermes_slice_case_set ?? createBillingCoreCp372P02TestHermesSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp372P02TestHermesSliceDescriptor") errors.push("CP00-372 descriptor type drift");
  if (descriptor.source_p02_test_slice_descriptor !== "BillingCoreCp371P02TestSliceDescriptor") {
    errors.push("CP00-372 source p02 test slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows).length) errors.push("CP00-372 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-372 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-372 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-372 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-372 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-372 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-372 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-372 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP372_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-372 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-372 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-372 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-372 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-372 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-372 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-372 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-372 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP372_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-372 must not promote Claude");
  if (BILLING_CORE_CP372_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-372 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-372 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-372 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP372_PACK_BINDING.pack_id, BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-372 contract current_pack drift");
  }
  if (
    contractProjection?.p02_test_hermes_slice_descriptor?.descriptor &&
    contractProjection.p02_test_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-372 contract p02_test_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP372_PACK_BINDING.next_pack_id) errors.push("CP00-372 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP372_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-372 next subphase drift");
  }
  return freezeCp372Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp372HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp372P02TestHermesSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp372Coverage(planPack);
  const slice = validateBillingCoreCp372P02TestHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp372Validation({
    evidence_packet: "H12.CP00-372.billing_core_p02_test_hermes_slice_descriptor",
    gate: BILLING_CORE_CP372_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_test_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_test_slice_pack_id: BILLING_CORE_CP372_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP372_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP372_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP372_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp372ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp372Coverage(planPack);
  const slice = validateBillingCoreCp372P02TestHermesSliceDescriptor(createBillingCoreCp372P02TestHermesSliceDescriptor(), {});
  return freezeCp372Validation({
    review_packet: "C12.CP00-372.billing_core_p02_test_hermes_slice_descriptor",
    gate: BILLING_CORE_CP372_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP372_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_test_hermes_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP372_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-372 cover exactly the 40 planned RP12 units from RP12.P02.M07.S13 through RP12.P02.M09.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-372 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp372CloseoutHandoff() {
  return freezeCp372Validation({
    handoff_id: "CP00-372-to-CP00-373",
    from_pack_id: BILLING_CORE_CP372_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP372_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP372_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP372_PACK_BINDING.range,
    open_scope: "Continue RP12.P02.M09.S09 onward with the remaining Claude review rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP372_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp373Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP373_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP373_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp373CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp373Validation({
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

export function validateBillingCoreCp373Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-373 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP373_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-373");
  if (planPack?.risk_class !== BILLING_CORE_CP373_PACK_BINDING.risk_class) errors.push("CP00-373 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP373_PACK_BINDING.unit_count) errors.push("CP00-373 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP373_PACK_BINDING.first_unit_id) errors.push("CP00-373 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP373_PACK_BINDING.last_unit_id) errors.push("CP00-373 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-373 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-373 must only include RP12 units");
  const summary = createBillingCoreCp373CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-373 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-373 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-373 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-373 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-373 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-373 ${microId} missing row ${title}`);
    }
  }
  return freezeCp373Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp373P02CloseoutP03FoundationDescriptor(
  descriptor = createBillingCoreCp373P02CloseoutP03FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_foundation_case_set ?? createBillingCoreCp373P02CloseoutP03FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp373P02CloseoutP03FoundationDescriptor") errors.push("CP00-373 descriptor type drift");
  if (descriptor.source_p02_test_hermes_slice_descriptor !== "BillingCoreCp372P02TestHermesSliceDescriptor") {
    errors.push("CP00-373 source p02 test hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows).length) errors.push("CP00-373 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-373 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-373 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-373 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-373 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-373 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-373 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-373 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(BILLING_CORE_CP373_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-373 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-373 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-373 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-373 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-373 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-373 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-373 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-373 ${microId} must not claim Claude final approval`);
    }
  }
  if (BILLING_CORE_CP373_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-373 must not promote Claude");
  if (BILLING_CORE_CP373_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-373 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-373 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-373 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP373_PACK_BINDING.pack_id, BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-373 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-373 contract p02_closeout_p03_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP373_PACK_BINDING.next_pack_id) errors.push("CP00-373 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP373_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-373 next subphase drift");
  }
  return freezeCp373Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp373HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp373P02CloseoutP03FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp373Coverage(planPack);
  const slice = validateBillingCoreCp373P02CloseoutP03FoundationDescriptor(descriptor, contractProjection);
  return freezeCp373Validation({
    evidence_packet: "H12.CP00-373.billing_core_p02_closeout_p03_foundation_descriptor",
    gate: BILLING_CORE_CP373_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_foundation_valid: slice.valid,
    no_real_data: true,
    source_p02_test_hermes_slice_pack_id: BILLING_CORE_CP373_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP373_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP373_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP373_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp373ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp373Coverage(planPack);
  const slice = validateBillingCoreCp373P02CloseoutP03FoundationDescriptor(createBillingCoreCp373P02CloseoutP03FoundationDescriptor(), {});
  return freezeCp373Validation({
    review_packet: "C12.CP00-373.billing_core_p02_closeout_p03_foundation_descriptor",
    gate: BILLING_CORE_CP373_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP373_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP373_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-373 cover exactly the 150 planned RP12 units from RP12.P02.M09.S09 through RP12.P03.M06.S12?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-373 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp373CloseoutHandoff() {
  return freezeCp373Validation({
    handoff_id: "CP00-373-to-CP00-374",
    from_pack_id: BILLING_CORE_CP373_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP373_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP373_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP373_PACK_BINDING.range,
    open_scope: "Continue RP12.P03.M06.S13 onward with the P03 test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP373_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp374Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP374_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP374_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp374CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp374Validation({
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

export function validateBillingCoreCp374Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-374 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP374_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-374");
  if (planPack?.risk_class !== BILLING_CORE_CP374_PACK_BINDING.risk_class) errors.push("CP00-374 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP374_PACK_BINDING.unit_count) errors.push("CP00-374 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP374_PACK_BINDING.first_unit_id) errors.push("CP00-374 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP374_PACK_BINDING.last_unit_id) errors.push("CP00-374 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-374 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-374 must only include RP12 units");
  const summary = createBillingCoreCp374CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-374 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-374 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-374 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-374 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-374 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-374 ${microId} missing row ${title}`);
    }
  }
  return freezeCp374Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp374P03CloseoutP04FoundationDescriptor(
  descriptor = createBillingCoreCp374P03CloseoutP04FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_closeout_p04_foundation_case_set ?? createBillingCoreCp374P03CloseoutP04FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp374P03CloseoutP04FoundationDescriptor") errors.push("CP00-374 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_foundation_descriptor !== "BillingCoreCp373P02CloseoutP03FoundationDescriptor") {
    errors.push("CP00-374 source p02 closeout p03 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP374_REQUIREMENTS.required_section_rows).length) errors.push("CP00-374 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP374_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-374 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-374 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-374 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-374 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-374 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-374 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-374 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP374_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-374 must not promote Claude");
  if (BILLING_CORE_CP374_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-374 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-374 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-374 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP374_PACK_BINDING.pack_id, BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-374 contract current_pack drift");
  }
  if (
    contractProjection?.p03_closeout_p04_foundation_descriptor?.descriptor &&
    contractProjection.p03_closeout_p04_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-374 contract p03_closeout_p04_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP374_PACK_BINDING.next_pack_id) errors.push("CP00-374 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP374_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-374 next subphase drift");
  }
  return freezeCp374Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp374HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp374P03CloseoutP04FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp374Coverage(planPack);
  const slice = validateBillingCoreCp374P03CloseoutP04FoundationDescriptor(descriptor, contractProjection);
  return freezeCp374Validation({
    evidence_packet: "H12.CP00-374.billing_core_p03_closeout_p04_foundation_descriptor",
    gate: BILLING_CORE_CP374_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_closeout_p04_foundation_valid: slice.valid,
    no_real_data: true,
    source_p02_closeout_p03_foundation_pack_id: BILLING_CORE_CP374_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP374_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP374_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP374_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp374ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp374Coverage(planPack);
  const slice = validateBillingCoreCp374P03CloseoutP04FoundationDescriptor(createBillingCoreCp374P03CloseoutP04FoundationDescriptor(), {});
  return freezeCp374Validation({
    review_packet: "C12.CP00-374.billing_core_p03_closeout_p04_foundation_descriptor",
    gate: BILLING_CORE_CP374_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP374_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_closeout_p04_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP374_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-374 cover exactly the 150 planned RP12 units from RP12.P03.M06.S13 through RP12.P04.M03.S20?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-374 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp374CloseoutHandoff() {
  return freezeCp374Validation({
    handoff_id: "CP00-374-to-CP00-375",
    from_pack_id: BILLING_CORE_CP374_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP374_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP374_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP374_PACK_BINDING.range,
    open_scope: "Continue RP12.P04.M03.S21 onward with the P04 secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP374_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp375Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP375_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP375_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp375CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp375Validation({
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

export function validateBillingCoreCp375Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-375 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP375_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-375");
  if (planPack?.risk_class !== BILLING_CORE_CP375_PACK_BINDING.risk_class) errors.push("CP00-375 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP375_PACK_BINDING.unit_count) errors.push("CP00-375 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP375_PACK_BINDING.first_unit_id) errors.push("CP00-375 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP375_PACK_BINDING.last_unit_id) errors.push("CP00-375 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-375 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-375 must only include RP12 units");
  const summary = createBillingCoreCp375CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-375 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-375 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-375 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-375 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-375 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-375 ${microId} missing row ${title}`);
    }
  }
  return freezeCp375Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor(
  descriptor = createBillingCoreCp375P04WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_workflow_permission_slice_case_set ?? createBillingCoreCp375P04WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp375P04WorkflowPermissionSliceDescriptor") errors.push("CP00-375 descriptor type drift");
  if (descriptor.source_p03_closeout_p04_foundation_descriptor !== "BillingCoreCp374P03CloseoutP04FoundationDescriptor") {
    errors.push("CP00-375 source p03 closeout p04 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP375_REQUIREMENTS.required_section_rows).length) errors.push("CP00-375 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP375_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-375 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-375 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-375 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-375 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-375 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-375 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-375 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP375_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-375 must not promote Claude");
  if (BILLING_CORE_CP375_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-375 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-375 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-375 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP375_PACK_BINDING.pack_id, BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-375 contract current_pack drift");
  }
  if (
    contractProjection?.p04_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p04_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-375 contract p04_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP375_PACK_BINDING.next_pack_id) errors.push("CP00-375 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP375_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-375 next subphase drift");
  }
  return freezeCp375Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp375HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp375P04WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp375Coverage(planPack);
  const slice = validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp375Validation({
    evidence_packet: "H12.CP00-375.billing_core_p04_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP375_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p03_closeout_p04_foundation_pack_id: BILLING_CORE_CP375_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP375_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP375_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP375_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp375ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp375Coverage(planPack);
  const slice = validateBillingCoreCp375P04WorkflowPermissionSliceDescriptor(createBillingCoreCp375P04WorkflowPermissionSliceDescriptor(), {});
  return freezeCp375Validation({
    review_packet: "C12.CP00-375.billing_core_p04_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP375_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP375_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP375_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-375 cover exactly the 40 planned RP12 units from RP12.P04.M03.S21 through RP12.P04.M05.S16?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-375 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp375CloseoutHandoff() {
  return freezeCp375Validation({
    handoff_id: "CP00-375-to-CP00-376",
    from_pack_id: BILLING_CORE_CP375_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP375_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP375_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP375_PACK_BINDING.range,
    open_scope: "Continue RP12.P04.M05.S17 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP375_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp376Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP376_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP376_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp376CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp376Validation({
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

export function validateBillingCoreCp376Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-376 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP376_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-376");
  if (planPack?.risk_class !== BILLING_CORE_CP376_PACK_BINDING.risk_class) errors.push("CP00-376 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP376_PACK_BINDING.unit_count) errors.push("CP00-376 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP376_PACK_BINDING.first_unit_id) errors.push("CP00-376 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP376_PACK_BINDING.last_unit_id) errors.push("CP00-376 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-376 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-376 must only include RP12 units");
  const summary = createBillingCoreCp376CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-376 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-376 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-376 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-376 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-376 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-376 ${microId} missing row ${title}`);
    }
  }
  return freezeCp376Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp376P04PermissionFixtureSliceDescriptor(
  descriptor = createBillingCoreCp376P04PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_permission_fixture_slice_case_set ?? createBillingCoreCp376P04PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp376P04PermissionFixtureSliceDescriptor") errors.push("CP00-376 descriptor type drift");
  if (descriptor.source_p04_workflow_permission_slice_descriptor !== "BillingCoreCp375P04WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-376 source p04 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP376_REQUIREMENTS.required_section_rows).length) errors.push("CP00-376 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP376_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-376 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-376 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-376 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-376 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-376 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-376 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-376 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP376_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-376 must not promote Claude");
  if (BILLING_CORE_CP376_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-376 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-376 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-376 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP376_PACK_BINDING.pack_id, BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-376 contract current_pack drift");
  }
  if (
    contractProjection?.p04_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p04_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-376 contract p04_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP376_PACK_BINDING.next_pack_id) errors.push("CP00-376 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP376_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-376 next subphase drift");
  }
  return freezeCp376Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp376HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp376P04PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp376Coverage(planPack);
  const slice = validateBillingCoreCp376P04PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp376Validation({
    evidence_packet: "H12.CP00-376.billing_core_p04_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP376_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_workflow_permission_slice_pack_id: BILLING_CORE_CP376_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP376_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP376_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP376_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp376ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp376Coverage(planPack);
  const slice = validateBillingCoreCp376P04PermissionFixtureSliceDescriptor(createBillingCoreCp376P04PermissionFixtureSliceDescriptor(), {});
  return freezeCp376Validation({
    review_packet: "C12.CP00-376.billing_core_p04_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP376_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP376_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP376_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-376 cover exactly the 10 planned RP12 units from RP12.P04.M05.S17 through RP12.P04.M06.S04?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-376 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp376CloseoutHandoff() {
  return freezeCp376Validation({
    handoff_id: "CP00-376-to-CP00-377",
    from_pack_id: BILLING_CORE_CP376_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP376_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP376_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP376_PACK_BINDING.range,
    open_scope: "Continue RP12.P04.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP376_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp377Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP377_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP377_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp377CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp377Validation({
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

export function validateBillingCoreCp377Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-377 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP377_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-377");
  if (planPack?.risk_class !== BILLING_CORE_CP377_PACK_BINDING.risk_class) errors.push("CP00-377 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP377_PACK_BINDING.unit_count) errors.push("CP00-377 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP377_PACK_BINDING.first_unit_id) errors.push("CP00-377 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP377_PACK_BINDING.last_unit_id) errors.push("CP00-377 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-377 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-377 must only include RP12 units");
  const summary = createBillingCoreCp377CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-377 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-377 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-377 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-377 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-377 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-377 ${microId} missing row ${title}`);
    }
  }
  return freezeCp377Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp377P04CloseoutP05FoundationDescriptor(
  descriptor = createBillingCoreCp377P04CloseoutP05FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_closeout_p05_foundation_case_set ?? createBillingCoreCp377P04CloseoutP05FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp377P04CloseoutP05FoundationDescriptor") errors.push("CP00-377 descriptor type drift");
  if (descriptor.source_p04_permission_fixture_slice_descriptor !== "BillingCoreCp376P04PermissionFixtureSliceDescriptor") {
    errors.push("CP00-377 source p04 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP377_REQUIREMENTS.required_section_rows).length) errors.push("CP00-377 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP377_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-377 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-377 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-377 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-377 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-377 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-377 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-377 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP377_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-377 must not promote Claude");
  if (BILLING_CORE_CP377_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-377 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-377 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-377 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP377_PACK_BINDING.pack_id, BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-377 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-377 contract p04_closeout_p05_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP377_PACK_BINDING.next_pack_id) errors.push("CP00-377 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP377_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-377 next subphase drift");
  }
  return freezeCp377Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp377HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp377P04CloseoutP05FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp377Coverage(planPack);
  const slice = validateBillingCoreCp377P04CloseoutP05FoundationDescriptor(descriptor, contractProjection);
  return freezeCp377Validation({
    evidence_packet: "H12.CP00-377.billing_core_p04_closeout_p05_foundation_descriptor",
    gate: BILLING_CORE_CP377_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_foundation_valid: slice.valid,
    no_real_data: true,
    source_p04_permission_fixture_slice_pack_id: BILLING_CORE_CP377_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP377_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP377_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP377_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp377ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp377Coverage(planPack);
  const slice = validateBillingCoreCp377P04CloseoutP05FoundationDescriptor(createBillingCoreCp377P04CloseoutP05FoundationDescriptor(), {});
  return freezeCp377Validation({
    review_packet: "C12.CP00-377.billing_core_p04_closeout_p05_foundation_descriptor",
    gate: BILLING_CORE_CP377_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP377_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP377_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-377 cover exactly the 150 planned RP12 units from RP12.P04.M06.S05 through RP12.P05.M03.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-377 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp377CloseoutHandoff() {
  return freezeCp377Validation({
    handoff_id: "CP00-377-to-CP00-378",
    from_pack_id: BILLING_CORE_CP377_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP377_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP377_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP377_PACK_BINDING.range,
    open_scope: "Continue RP12.P05.M03.S09 onward with the P05 primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP377_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp378Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP378_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP378_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp378CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp378Validation({
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

export function validateBillingCoreCp378Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-378 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP378_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-378");
  if (planPack?.risk_class !== BILLING_CORE_CP378_PACK_BINDING.risk_class) errors.push("CP00-378 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP378_PACK_BINDING.unit_count) errors.push("CP00-378 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP378_PACK_BINDING.first_unit_id) errors.push("CP00-378 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP378_PACK_BINDING.last_unit_id) errors.push("CP00-378 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-378 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-378 must only include RP12 units");
  const summary = createBillingCoreCp378CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-378 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-378 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-378 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-378 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-378 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-378 ${microId} missing row ${title}`);
    }
  }
  return freezeCp378Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp378P05ImplementationSliceDescriptor(
  descriptor = createBillingCoreCp378P05ImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_implementation_slice_case_set ?? createBillingCoreCp378P05ImplementationSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp378P05ImplementationSliceDescriptor") errors.push("CP00-378 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_foundation_descriptor !== "BillingCoreCp377P04CloseoutP05FoundationDescriptor") {
    errors.push("CP00-378 source p04 closeout p05 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP378_REQUIREMENTS.required_section_rows).length) errors.push("CP00-378 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP378_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-378 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-378 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-378 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-378 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-378 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-378 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-378 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP378_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-378 must not promote Claude");
  if (BILLING_CORE_CP378_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-378 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-378 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-378 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP378_PACK_BINDING.pack_id, BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-378 contract current_pack drift");
  }
  if (
    contractProjection?.p05_implementation_slice_descriptor?.descriptor &&
    contractProjection.p05_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-378 contract p05_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP378_PACK_BINDING.next_pack_id) errors.push("CP00-378 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP378_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-378 next subphase drift");
  }
  return freezeCp378Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp378HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp378P05ImplementationSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp378Coverage(planPack);
  const slice = validateBillingCoreCp378P05ImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp378Validation({
    evidence_packet: "H12.CP00-378.billing_core_p05_implementation_slice_descriptor",
    gate: BILLING_CORE_CP378_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_closeout_p05_foundation_pack_id: BILLING_CORE_CP378_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP378_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP378_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP378_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp378ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp378Coverage(planPack);
  const slice = validateBillingCoreCp378P05ImplementationSliceDescriptor(createBillingCoreCp378P05ImplementationSliceDescriptor(), {});
  return freezeCp378Validation({
    review_packet: "C12.CP00-378.billing_core_p05_implementation_slice_descriptor",
    gate: BILLING_CORE_CP378_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP378_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_implementation_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP378_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-378 cover exactly the 10 planned RP12 units from RP12.P05.M03.S09 through RP12.P05.M03.S18?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-378 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp378CloseoutHandoff() {
  return freezeCp378Validation({
    handoff_id: "CP00-378-to-CP00-379",
    from_pack_id: BILLING_CORE_CP378_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP378_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP378_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP378_PACK_BINDING.range,
    open_scope: "Continue RP12.P05.M03.S19 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP378_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp379Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP379_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP379_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp379CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp379Validation({
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

export function validateBillingCoreCp379Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-379 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP379_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-379");
  if (planPack?.risk_class !== BILLING_CORE_CP379_PACK_BINDING.risk_class) errors.push("CP00-379 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP379_PACK_BINDING.unit_count) errors.push("CP00-379 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP379_PACK_BINDING.first_unit_id) errors.push("CP00-379 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP379_PACK_BINDING.last_unit_id) errors.push("CP00-379 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-379 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-379 must only include RP12 units");
  const summary = createBillingCoreCp379CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-379 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-379 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-379 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-379 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-379 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-379 ${microId} missing row ${title}`);
    }
  }
  return freezeCp379Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp379P05CloseoutP06FoundationDescriptor(
  descriptor = createBillingCoreCp379P05CloseoutP06FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_foundation_case_set ?? createBillingCoreCp379P05CloseoutP06FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp379P05CloseoutP06FoundationDescriptor") errors.push("CP00-379 descriptor type drift");
  if (descriptor.source_p05_implementation_slice_descriptor !== "BillingCoreCp378P05ImplementationSliceDescriptor") {
    errors.push("CP00-379 source p05 implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP379_REQUIREMENTS.required_section_rows).length) errors.push("CP00-379 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP379_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-379 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-379 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-379 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-379 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-379 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-379 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-379 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP379_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-379 must not promote Claude");
  if (BILLING_CORE_CP379_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-379 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-379 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-379 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP379_PACK_BINDING.pack_id, BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-379 contract current_pack drift");
  }
  if (
    contractProjection?.p05_closeout_p06_foundation_descriptor?.descriptor &&
    contractProjection.p05_closeout_p06_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-379 contract p05_closeout_p06_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP379_PACK_BINDING.next_pack_id) errors.push("CP00-379 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP379_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-379 next subphase drift");
  }
  return freezeCp379Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp379HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp379P05CloseoutP06FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp379Coverage(planPack);
  const slice = validateBillingCoreCp379P05CloseoutP06FoundationDescriptor(descriptor, contractProjection);
  return freezeCp379Validation({
    evidence_packet: "H12.CP00-379.billing_core_p05_closeout_p06_foundation_descriptor",
    gate: BILLING_CORE_CP379_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_closeout_p06_foundation_valid: slice.valid,
    no_real_data: true,
    source_p05_implementation_slice_pack_id: BILLING_CORE_CP379_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP379_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP379_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP379_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp379ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp379Coverage(planPack);
  const slice = validateBillingCoreCp379P05CloseoutP06FoundationDescriptor(createBillingCoreCp379P05CloseoutP06FoundationDescriptor(), {});
  return freezeCp379Validation({
    review_packet: "C12.CP00-379.billing_core_p05_closeout_p06_foundation_descriptor",
    gate: BILLING_CORE_CP379_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP379_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_closeout_p06_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP379_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-379 cover exactly the 150 planned RP12 units from RP12.P05.M03.S19 through RP12.P06.M00.S06?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-379 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp379CloseoutHandoff() {
  return freezeCp379Validation({
    handoff_id: "CP00-379-to-CP00-380",
    from_pack_id: BILLING_CORE_CP379_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP379_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP379_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP379_PACK_BINDING.range,
    open_scope: "Continue RP12.P06.M00.S07 onward with the P06 scope inventory rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP379_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp380Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP380_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP380_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp380CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp380Validation({
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

export function validateBillingCoreCp380Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-380 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP380_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-380");
  if (planPack?.risk_class !== BILLING_CORE_CP380_PACK_BINDING.risk_class) errors.push("CP00-380 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP380_PACK_BINDING.unit_count) errors.push("CP00-380 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP380_PACK_BINDING.first_unit_id) errors.push("CP00-380 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP380_PACK_BINDING.last_unit_id) errors.push("CP00-380 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-380 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-380 must only include RP12 units");
  const summary = createBillingCoreCp380CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-380 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-380 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-380 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-380 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-380 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-380 ${microId} missing row ${title}`);
    }
  }
  return freezeCp380Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp380P06FoundationSliceDescriptor(
  descriptor = createBillingCoreCp380P06FoundationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_foundation_slice_case_set ?? createBillingCoreCp380P06FoundationSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp380P06FoundationSliceDescriptor") errors.push("CP00-380 descriptor type drift");
  if (descriptor.source_p05_closeout_p06_foundation_descriptor !== "BillingCoreCp379P05CloseoutP06FoundationDescriptor") {
    errors.push("CP00-380 source p05 closeout p06 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP380_REQUIREMENTS.required_section_rows).length) errors.push("CP00-380 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP380_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-380 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-380 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-380 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-380 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-380 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-380 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-380 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP380_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-380 must not promote Claude");
  if (BILLING_CORE_CP380_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-380 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-380 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-380 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP380_PACK_BINDING.pack_id, BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-380 contract current_pack drift");
  }
  if (
    contractProjection?.p06_foundation_slice_descriptor?.descriptor &&
    contractProjection.p06_foundation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-380 contract p06_foundation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP380_PACK_BINDING.next_pack_id) errors.push("CP00-380 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP380_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-380 next subphase drift");
  }
  return freezeCp380Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp380HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp380P06FoundationSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp380Coverage(planPack);
  const slice = validateBillingCoreCp380P06FoundationSliceDescriptor(descriptor, contractProjection);
  return freezeCp380Validation({
    evidence_packet: "H12.CP00-380.billing_core_p06_foundation_slice_descriptor",
    gate: BILLING_CORE_CP380_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_foundation_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_closeout_p06_foundation_pack_id: BILLING_CORE_CP380_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP380_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP380_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP380_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp380ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp380Coverage(planPack);
  const slice = validateBillingCoreCp380P06FoundationSliceDescriptor(createBillingCoreCp380P06FoundationSliceDescriptor(), {});
  return freezeCp380Validation({
    review_packet: "C12.CP00-380.billing_core_p06_foundation_slice_descriptor",
    gate: BILLING_CORE_CP380_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP380_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_foundation_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP380_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-380 cover exactly the 150 planned RP12 units from RP12.P06.M00.S07 through RP12.P06.M07.S06?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-380 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp380CloseoutHandoff() {
  return freezeCp380Validation({
    handoff_id: "CP00-380-to-CP00-381",
    from_pack_id: BILLING_CORE_CP380_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP380_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP380_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP380_PACK_BINDING.range,
    open_scope: "Continue RP12.P06.M07.S07 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP380_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp381Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP381_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP381_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp381CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp381Validation({
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

export function validateBillingCoreCp381Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-381 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP381_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-381");
  if (planPack?.risk_class !== BILLING_CORE_CP381_PACK_BINDING.risk_class) errors.push("CP00-381 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP381_PACK_BINDING.unit_count) errors.push("CP00-381 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP381_PACK_BINDING.first_unit_id) errors.push("CP00-381 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP381_PACK_BINDING.last_unit_id) errors.push("CP00-381 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-381 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-381 must only include RP12 units");
  const summary = createBillingCoreCp381CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-381 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-381 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-381 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-381 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-381 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-381 ${microId} missing row ${title}`);
    }
  }
  return freezeCp381Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp381P06TestHermesSliceDescriptor(
  descriptor = createBillingCoreCp381P06TestHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_test_hermes_slice_case_set ?? createBillingCoreCp381P06TestHermesSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp381P06TestHermesSliceDescriptor") errors.push("CP00-381 descriptor type drift");
  if (descriptor.source_p06_foundation_slice_descriptor !== "BillingCoreCp380P06FoundationSliceDescriptor") {
    errors.push("CP00-381 source p06 foundation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP381_REQUIREMENTS.required_section_rows).length) errors.push("CP00-381 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP381_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-381 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-381 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-381 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-381 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-381 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-381 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-381 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP381_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-381 must not promote Claude");
  if (BILLING_CORE_CP381_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-381 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-381 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-381 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP381_PACK_BINDING.pack_id, BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-381 contract current_pack drift");
  }
  if (
    contractProjection?.p06_test_hermes_slice_descriptor?.descriptor &&
    contractProjection.p06_test_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-381 contract p06_test_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP381_PACK_BINDING.next_pack_id) errors.push("CP00-381 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP381_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-381 next subphase drift");
  }
  return freezeCp381Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp381HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp381P06TestHermesSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp381Coverage(planPack);
  const slice = validateBillingCoreCp381P06TestHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp381Validation({
    evidence_packet: "H12.CP00-381.billing_core_p06_test_hermes_slice_descriptor",
    gate: BILLING_CORE_CP381_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_test_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_foundation_slice_pack_id: BILLING_CORE_CP381_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP381_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP381_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP381_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp381ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp381Coverage(planPack);
  const slice = validateBillingCoreCp381P06TestHermesSliceDescriptor(createBillingCoreCp381P06TestHermesSliceDescriptor(), {});
  return freezeCp381Validation({
    review_packet: "C12.CP00-381.billing_core_p06_test_hermes_slice_descriptor",
    gate: BILLING_CORE_CP381_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP381_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_test_hermes_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP381_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-381 cover exactly the 40 planned RP12 units from RP12.P06.M07.S07 through RP12.P06.M09.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-381 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp381CloseoutHandoff() {
  return freezeCp381Validation({
    handoff_id: "CP00-381-to-CP00-382",
    from_pack_id: BILLING_CORE_CP381_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP381_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP381_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP381_PACK_BINDING.range,
    open_scope: "Continue RP12.P06.M09.S03 onward with the remaining Claude review rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP381_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp382Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP382_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP382_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp382CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp382Validation({
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

export function validateBillingCoreCp382Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-382 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP382_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-382");
  if (planPack?.risk_class !== BILLING_CORE_CP382_PACK_BINDING.risk_class) errors.push("CP00-382 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP382_PACK_BINDING.unit_count) errors.push("CP00-382 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP382_PACK_BINDING.first_unit_id) errors.push("CP00-382 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP382_PACK_BINDING.last_unit_id) errors.push("CP00-382 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-382 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-382 must only include RP12 units");
  const summary = createBillingCoreCp382CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-382 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-382 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-382 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-382 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-382 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-382 ${microId} missing row ${title}`);
    }
  }
  return freezeCp382Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp382P06CloseoutP07FoundationDescriptor(
  descriptor = createBillingCoreCp382P06CloseoutP07FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_foundation_case_set ?? createBillingCoreCp382P06CloseoutP07FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp382P06CloseoutP07FoundationDescriptor") errors.push("CP00-382 descriptor type drift");
  if (descriptor.source_p06_test_hermes_slice_descriptor !== "BillingCoreCp381P06TestHermesSliceDescriptor") {
    errors.push("CP00-382 source p06 test hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP382_REQUIREMENTS.required_section_rows).length) errors.push("CP00-382 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP382_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-382 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-382 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-382 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-382 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-382 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-382 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-382 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP382_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-382 must not promote Claude");
  if (BILLING_CORE_CP382_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-382 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-382 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-382 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP382_PACK_BINDING.pack_id, BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-382 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-382 contract p06_closeout_p07_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP382_PACK_BINDING.next_pack_id) errors.push("CP00-382 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP382_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-382 next subphase drift");
  }
  return freezeCp382Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp382HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp382P06CloseoutP07FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp382Coverage(planPack);
  const slice = validateBillingCoreCp382P06CloseoutP07FoundationDescriptor(descriptor, contractProjection);
  return freezeCp382Validation({
    evidence_packet: "H12.CP00-382.billing_core_p06_closeout_p07_foundation_descriptor",
    gate: BILLING_CORE_CP382_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_foundation_valid: slice.valid,
    no_real_data: true,
    source_p06_test_hermes_slice_pack_id: BILLING_CORE_CP382_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP382_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP382_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP382_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp382ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp382Coverage(planPack);
  const slice = validateBillingCoreCp382P06CloseoutP07FoundationDescriptor(createBillingCoreCp382P06CloseoutP07FoundationDescriptor(), {});
  return freezeCp382Validation({
    review_packet: "C12.CP00-382.billing_core_p06_closeout_p07_foundation_descriptor",
    gate: BILLING_CORE_CP382_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP382_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP382_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-382 cover exactly the 150 planned RP12 units from RP12.P06.M09.S03 through RP12.P07.M05.S04?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-382 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp382CloseoutHandoff() {
  return freezeCp382Validation({
    handoff_id: "CP00-382-to-CP00-383",
    from_pack_id: BILLING_CORE_CP382_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP382_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP382_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP382_PACK_BINDING.range,
    open_scope: "Continue RP12.P07.M05.S05 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP382_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp383Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP383_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP383_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp383CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp383Validation({
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

export function validateBillingCoreCp383Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-383 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP383_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-383");
  if (planPack?.risk_class !== BILLING_CORE_CP383_PACK_BINDING.risk_class) errors.push("CP00-383 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP383_PACK_BINDING.unit_count) errors.push("CP00-383 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP383_PACK_BINDING.first_unit_id) errors.push("CP00-383 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP383_PACK_BINDING.last_unit_id) errors.push("CP00-383 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-383 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-383 must only include RP12 units");
  const summary = createBillingCoreCp383CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-383 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-383 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-383 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-383 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-383 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-383 ${microId} missing row ${title}`);
    }
  }
  return freezeCp383Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp383P07PermissionSliceDescriptor(
  descriptor = createBillingCoreCp383P07PermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_permission_slice_case_set ?? createBillingCoreCp383P07PermissionSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp383P07PermissionSliceDescriptor") errors.push("CP00-383 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_foundation_descriptor !== "BillingCoreCp382P06CloseoutP07FoundationDescriptor") {
    errors.push("CP00-383 source p06 closeout p07 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP383_REQUIREMENTS.required_section_rows).length) errors.push("CP00-383 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP383_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-383 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-383 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-383 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-383 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-383 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-383 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-383 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP383_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-383 must not promote Claude");
  if (BILLING_CORE_CP383_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-383 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-383 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-383 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP383_PACK_BINDING.pack_id, BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-383 contract current_pack drift");
  }
  if (
    contractProjection?.p07_permission_slice_descriptor?.descriptor &&
    contractProjection.p07_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-383 contract p07_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP383_PACK_BINDING.next_pack_id) errors.push("CP00-383 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP383_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-383 next subphase drift");
  }
  return freezeCp383Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp383HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp383P07PermissionSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp383Coverage(planPack);
  const slice = validateBillingCoreCp383P07PermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp383Validation({
    evidence_packet: "H12.CP00-383.billing_core_p07_permission_slice_descriptor",
    gate: BILLING_CORE_CP383_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_foundation_pack_id: BILLING_CORE_CP383_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP383_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP383_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP383_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp383ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp383Coverage(planPack);
  const slice = validateBillingCoreCp383P07PermissionSliceDescriptor(createBillingCoreCp383P07PermissionSliceDescriptor(), {});
  return freezeCp383Validation({
    review_packet: "C12.CP00-383.billing_core_p07_permission_slice_descriptor",
    gate: BILLING_CORE_CP383_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP383_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_permission_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP383_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-383 cover exactly the 10 planned RP12 units from RP12.P07.M05.S05 through RP12.P07.M05.S14?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-383 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp383CloseoutHandoff() {
  return freezeCp383Validation({
    handoff_id: "CP00-383-to-CP00-384",
    from_pack_id: BILLING_CORE_CP383_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP383_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP383_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP383_PACK_BINDING.range,
    open_scope: "Continue RP12.P07.M05.S15 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP383_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp384Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP384_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP384_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp384CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp384Validation({
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

export function validateBillingCoreCp384Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-384 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP384_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-384");
  if (planPack?.risk_class !== BILLING_CORE_CP384_PACK_BINDING.risk_class) errors.push("CP00-384 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP384_PACK_BINDING.unit_count) errors.push("CP00-384 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP384_PACK_BINDING.first_unit_id) errors.push("CP00-384 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP384_PACK_BINDING.last_unit_id) errors.push("CP00-384 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-384 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-384 must only include RP12 units");
  const summary = createBillingCoreCp384CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-384 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-384 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-384 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-384 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-384 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-384 ${microId} missing row ${title}`);
    }
  }
  return freezeCp384Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp384P07PermissionFixtureSliceDescriptor(
  descriptor = createBillingCoreCp384P07PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_permission_fixture_slice_case_set ?? createBillingCoreCp384P07PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp384P07PermissionFixtureSliceDescriptor") errors.push("CP00-384 descriptor type drift");
  if (descriptor.source_p07_permission_slice_descriptor !== "BillingCoreCp383P07PermissionSliceDescriptor") {
    errors.push("CP00-384 source p07 permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP384_REQUIREMENTS.required_section_rows).length) errors.push("CP00-384 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP384_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-384 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-384 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-384 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-384 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-384 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-384 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-384 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP384_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-384 must not promote Claude");
  if (BILLING_CORE_CP384_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-384 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-384 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-384 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP384_PACK_BINDING.pack_id, BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-384 contract current_pack drift");
  }
  if (
    contractProjection?.p07_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p07_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-384 contract p07_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP384_PACK_BINDING.next_pack_id) errors.push("CP00-384 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP384_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-384 next subphase drift");
  }
  return freezeCp384Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp384HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp384P07PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp384Coverage(planPack);
  const slice = validateBillingCoreCp384P07PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp384Validation({
    evidence_packet: "H12.CP00-384.billing_core_p07_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP384_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_permission_slice_pack_id: BILLING_CORE_CP384_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP384_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP384_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP384_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp384ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp384Coverage(planPack);
  const slice = validateBillingCoreCp384P07PermissionFixtureSliceDescriptor(createBillingCoreCp384P07PermissionFixtureSliceDescriptor(), {});
  return freezeCp384Validation({
    review_packet: "C12.CP00-384.billing_core_p07_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP384_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP384_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP384_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-384 cover exactly the 10 planned RP12 units from RP12.P07.M05.S15 through RP12.P07.M06.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-384 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp384CloseoutHandoff() {
  return freezeCp384Validation({
    handoff_id: "CP00-384-to-CP00-385",
    from_pack_id: BILLING_CORE_CP384_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP384_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP384_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP384_PACK_BINDING.range,
    open_scope: "Continue RP12.P07.M06.S03 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP384_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp385Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP385_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP385_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp385CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp385Validation({
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

export function validateBillingCoreCp385Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-385 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP385_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-385");
  if (planPack?.risk_class !== BILLING_CORE_CP385_PACK_BINDING.risk_class) errors.push("CP00-385 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP385_PACK_BINDING.unit_count) errors.push("CP00-385 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP385_PACK_BINDING.first_unit_id) errors.push("CP00-385 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP385_PACK_BINDING.last_unit_id) errors.push("CP00-385 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-385 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-385 must only include RP12 units");
  const summary = createBillingCoreCp385CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-385 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-385 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-385 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-385 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-385 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-385 ${microId} missing row ${title}`);
    }
  }
  return freezeCp385Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp385P07CloseoutP08FoundationDescriptor(
  descriptor = createBillingCoreCp385P07CloseoutP08FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_foundation_case_set ?? createBillingCoreCp385P07CloseoutP08FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp385P07CloseoutP08FoundationDescriptor") errors.push("CP00-385 descriptor type drift");
  if (descriptor.source_p07_permission_fixture_slice_descriptor !== "BillingCoreCp384P07PermissionFixtureSliceDescriptor") {
    errors.push("CP00-385 source p07 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP385_REQUIREMENTS.required_section_rows).length) errors.push("CP00-385 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP385_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-385 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-385 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-385 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-385 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-385 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-385 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-385 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP385_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-385 must not promote Claude");
  if (BILLING_CORE_CP385_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-385 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-385 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-385 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP385_PACK_BINDING.pack_id, BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-385 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-385 contract p07_closeout_p08_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP385_PACK_BINDING.next_pack_id) errors.push("CP00-385 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP385_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-385 next subphase drift");
  }
  return freezeCp385Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp385HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp385P07CloseoutP08FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp385Coverage(planPack);
  const slice = validateBillingCoreCp385P07CloseoutP08FoundationDescriptor(descriptor, contractProjection);
  return freezeCp385Validation({
    evidence_packet: "H12.CP00-385.billing_core_p07_closeout_p08_foundation_descriptor",
    gate: BILLING_CORE_CP385_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_foundation_valid: slice.valid,
    no_real_data: true,
    source_p07_permission_fixture_slice_pack_id: BILLING_CORE_CP385_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP385_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP385_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP385_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp385ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp385Coverage(planPack);
  const slice = validateBillingCoreCp385P07CloseoutP08FoundationDescriptor(createBillingCoreCp385P07CloseoutP08FoundationDescriptor(), {});
  return freezeCp385Validation({
    review_packet: "C12.CP00-385.billing_core_p07_closeout_p08_foundation_descriptor",
    gate: BILLING_CORE_CP385_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP385_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP385_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-385 cover exactly the 150 planned RP12 units from RP12.P07.M06.S03 through RP12.P08.M02.S14?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-385 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp385CloseoutHandoff() {
  return freezeCp385Validation({
    handoff_id: "CP00-385-to-CP00-386",
    from_pack_id: BILLING_CORE_CP385_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP385_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP385_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP385_PACK_BINDING.range,
    open_scope: "Continue RP12.P08.M02.S15 onward with the remaining type and shape rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP385_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp386Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP386_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP386_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp386CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp386Validation({
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

export function validateBillingCoreCp386Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-386 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP386_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-386");
  if (planPack?.risk_class !== BILLING_CORE_CP386_PACK_BINDING.risk_class) errors.push("CP00-386 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP386_PACK_BINDING.unit_count) errors.push("CP00-386 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP386_PACK_BINDING.first_unit_id) errors.push("CP00-386 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP386_PACK_BINDING.last_unit_id) errors.push("CP00-386 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-386 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-386 must only include RP12 units");
  const summary = createBillingCoreCp386CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-386 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-386 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-386 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-386 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-386 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-386 ${microId} missing row ${title}`);
    }
  }
  return freezeCp386Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp386P08ImplementationSliceDescriptor(
  descriptor = createBillingCoreCp386P08ImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_implementation_slice_case_set ?? createBillingCoreCp386P08ImplementationSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp386P08ImplementationSliceDescriptor") errors.push("CP00-386 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_foundation_descriptor !== "BillingCoreCp385P07CloseoutP08FoundationDescriptor") {
    errors.push("CP00-386 source p07 closeout p08 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP386_REQUIREMENTS.required_section_rows).length) errors.push("CP00-386 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP386_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-386 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-386 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-386 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-386 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-386 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-386 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-386 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP386_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-386 must not promote Claude");
  if (BILLING_CORE_CP386_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-386 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-386 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-386 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP386_PACK_BINDING.pack_id, BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-386 contract current_pack drift");
  }
  if (
    contractProjection?.p08_implementation_slice_descriptor?.descriptor &&
    contractProjection.p08_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-386 contract p08_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP386_PACK_BINDING.next_pack_id) errors.push("CP00-386 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP386_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-386 next subphase drift");
  }
  return freezeCp386Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp386HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp386P08ImplementationSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp386Coverage(planPack);
  const slice = validateBillingCoreCp386P08ImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp386Validation({
    evidence_packet: "H12.CP00-386.billing_core_p08_implementation_slice_descriptor",
    gate: BILLING_CORE_CP386_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_closeout_p08_foundation_pack_id: BILLING_CORE_CP386_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP386_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP386_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP386_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp386ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp386Coverage(planPack);
  const slice = validateBillingCoreCp386P08ImplementationSliceDescriptor(createBillingCoreCp386P08ImplementationSliceDescriptor(), {});
  return freezeCp386Validation({
    review_packet: "C12.CP00-386.billing_core_p08_implementation_slice_descriptor",
    gate: BILLING_CORE_CP386_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP386_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_implementation_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP386_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-386 cover exactly the 40 planned RP12 units from RP12.P08.M02.S15 through RP12.P08.M04.S12?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-386 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp386CloseoutHandoff() {
  return freezeCp386Validation({
    handoff_id: "CP00-386-to-CP00-387",
    from_pack_id: BILLING_CORE_CP386_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP386_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP386_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP386_PACK_BINDING.range,
    open_scope: "Continue RP12.P08.M04.S13 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP386_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp387Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP387_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP387_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp387CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp387Validation({
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

export function validateBillingCoreCp387Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-387 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP387_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-387");
  if (planPack?.risk_class !== BILLING_CORE_CP387_PACK_BINDING.risk_class) errors.push("CP00-387 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP387_PACK_BINDING.unit_count) errors.push("CP00-387 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP387_PACK_BINDING.first_unit_id) errors.push("CP00-387 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP387_PACK_BINDING.last_unit_id) errors.push("CP00-387 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-387 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-387 must only include RP12 units");
  const summary = createBillingCoreCp387CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-387 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-387 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-387 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-387 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-387 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-387 ${microId} missing row ${title}`);
    }
  }
  return freezeCp387Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor(
  descriptor = createBillingCoreCp387P08WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_workflow_permission_slice_case_set ?? createBillingCoreCp387P08WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp387P08WorkflowPermissionSliceDescriptor") errors.push("CP00-387 descriptor type drift");
  if (descriptor.source_p08_implementation_slice_descriptor !== "BillingCoreCp386P08ImplementationSliceDescriptor") {
    errors.push("CP00-387 source p08 implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP387_REQUIREMENTS.required_section_rows).length) errors.push("CP00-387 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP387_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-387 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-387 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-387 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-387 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-387 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-387 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-387 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP387_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-387 must not promote Claude");
  if (BILLING_CORE_CP387_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-387 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-387 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-387 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP387_PACK_BINDING.pack_id, BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-387 contract current_pack drift");
  }
  if (
    contractProjection?.p08_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p08_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-387 contract p08_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP387_PACK_BINDING.next_pack_id) errors.push("CP00-387 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP387_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-387 next subphase drift");
  }
  return freezeCp387Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp387HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp387P08WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp387Coverage(planPack);
  const slice = validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp387Validation({
    evidence_packet: "H12.CP00-387.billing_core_p08_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP387_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_implementation_slice_pack_id: BILLING_CORE_CP387_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP387_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP387_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP387_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp387ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp387Coverage(planPack);
  const slice = validateBillingCoreCp387P08WorkflowPermissionSliceDescriptor(createBillingCoreCp387P08WorkflowPermissionSliceDescriptor(), {});
  return freezeCp387Validation({
    review_packet: "C12.CP00-387.billing_core_p08_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP387_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP387_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP387_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-387 cover exactly the 40 planned RP12 units from RP12.P08.M04.S13 through RP12.P08.M06.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-387 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp387CloseoutHandoff() {
  return freezeCp387Validation({
    handoff_id: "CP00-387-to-CP00-388",
    from_pack_id: BILLING_CORE_CP387_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP387_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP387_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP387_PACK_BINDING.range,
    open_scope: "Continue RP12.P08.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP387_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp388Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP388_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP388_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp388CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp388Validation({
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

export function validateBillingCoreCp388Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-388 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP388_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-388");
  if (planPack?.risk_class !== BILLING_CORE_CP388_PACK_BINDING.risk_class) errors.push("CP00-388 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP388_PACK_BINDING.unit_count) errors.push("CP00-388 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP388_PACK_BINDING.first_unit_id) errors.push("CP00-388 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP388_PACK_BINDING.last_unit_id) errors.push("CP00-388 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-388 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-388 must only include RP12 units");
  const summary = createBillingCoreCp388CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-388 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-388 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-388 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-388 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-388 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-388 ${microId} missing row ${title}`);
    }
  }
  return freezeCp388Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp388P08CloseoutP09FoundationDescriptor(
  descriptor = createBillingCoreCp388P08CloseoutP09FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_foundation_case_set ?? createBillingCoreCp388P08CloseoutP09FoundationCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp388P08CloseoutP09FoundationDescriptor") errors.push("CP00-388 descriptor type drift");
  if (descriptor.source_p08_workflow_permission_slice_descriptor !== "BillingCoreCp387P08WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-388 source p08 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP388_REQUIREMENTS.required_section_rows).length) errors.push("CP00-388 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP388_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-388 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-388 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-388 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-388 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-388 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-388 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-388 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP388_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-388 must not promote Claude");
  if (BILLING_CORE_CP388_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-388 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-388 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-388 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP388_PACK_BINDING.pack_id, BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-388 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-388 contract p08_closeout_p09_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP388_PACK_BINDING.next_pack_id) errors.push("CP00-388 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP388_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-388 next subphase drift");
  }
  return freezeCp388Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp388HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp388P08CloseoutP09FoundationDescriptor(),
) {
  const coverage = validateBillingCoreCp388Coverage(planPack);
  const slice = validateBillingCoreCp388P08CloseoutP09FoundationDescriptor(descriptor, contractProjection);
  return freezeCp388Validation({
    evidence_packet: "H12.CP00-388.billing_core_p08_closeout_p09_foundation_descriptor",
    gate: BILLING_CORE_CP388_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_foundation_valid: slice.valid,
    no_real_data: true,
    source_p08_workflow_permission_slice_pack_id: BILLING_CORE_CP388_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP388_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP388_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP388_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp388ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp388Coverage(planPack);
  const slice = validateBillingCoreCp388P08CloseoutP09FoundationDescriptor(createBillingCoreCp388P08CloseoutP09FoundationDescriptor(), {});
  return freezeCp388Validation({
    review_packet: "C12.CP00-388.billing_core_p08_closeout_p09_foundation_descriptor",
    gate: BILLING_CORE_CP388_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP388_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_foundation_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP388_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-388 cover exactly the 150 planned RP12 units from RP12.P08.M06.S09 through RP12.P09.M03.S22?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-388 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp388CloseoutHandoff() {
  return freezeCp388Validation({
    handoff_id: "CP00-388-to-CP00-389",
    from_pack_id: BILLING_CORE_CP388_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP388_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP388_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP388_PACK_BINDING.range,
    open_scope: "Continue RP12.P09.M04.S01 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP388_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp389Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP389_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP389_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp389CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp389Validation({
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

export function validateBillingCoreCp389Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-389 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP389_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-389");
  if (planPack?.risk_class !== BILLING_CORE_CP389_PACK_BINDING.risk_class) errors.push("CP00-389 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP389_PACK_BINDING.unit_count) errors.push("CP00-389 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP389_PACK_BINDING.first_unit_id) errors.push("CP00-389 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP389_PACK_BINDING.last_unit_id) errors.push("CP00-389 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-389 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-389 must only include RP12 units");
  const summary = createBillingCoreCp389CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-389 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-389 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-389 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-389 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-389 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-389 ${microId} missing row ${title}`);
    }
  }
  return freezeCp389Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor(
  descriptor = createBillingCoreCp389P09WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_workflow_permission_slice_case_set ?? createBillingCoreCp389P09WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp389P09WorkflowPermissionSliceDescriptor") errors.push("CP00-389 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_foundation_descriptor !== "BillingCoreCp388P08CloseoutP09FoundationDescriptor") {
    errors.push("CP00-389 source p08 closeout p09 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP389_REQUIREMENTS.required_section_rows).length) errors.push("CP00-389 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP389_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-389 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-389 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-389 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-389 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-389 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-389 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-389 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP389_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-389 must not promote Claude");
  if (BILLING_CORE_CP389_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-389 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-389 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-389 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP389_PACK_BINDING.pack_id, BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-389 contract current_pack drift");
  }
  if (
    contractProjection?.p09_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p09_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-389 contract p09_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP389_PACK_BINDING.next_pack_id) errors.push("CP00-389 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP389_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-389 next subphase drift");
  }
  return freezeCp389Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp389HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp389P09WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp389Coverage(planPack);
  const slice = validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp389Validation({
    evidence_packet: "H12.CP00-389.billing_core_p09_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP389_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_foundation_pack_id: BILLING_CORE_CP389_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP389_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP389_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP389_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp389ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp389Coverage(planPack);
  const slice = validateBillingCoreCp389P09WorkflowPermissionSliceDescriptor(createBillingCoreCp389P09WorkflowPermissionSliceDescriptor(), {});
  return freezeCp389Validation({
    review_packet: "C12.CP00-389.billing_core_p09_workflow_permission_slice_descriptor",
    gate: BILLING_CORE_CP389_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP389_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP389_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-389 cover exactly the 40 planned RP12 units from RP12.P09.M04.S01 through RP12.P09.M05.S20?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-389 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp389CloseoutHandoff() {
  return freezeCp389Validation({
    handoff_id: "CP00-389-to-CP00-390",
    from_pack_id: BILLING_CORE_CP389_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP389_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP389_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP389_PACK_BINDING.range,
    open_scope: "Continue RP12.P09.M05.S21 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP389_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp390Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP390_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP390_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp390CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp390Validation({
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

export function validateBillingCoreCp390Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-390 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP390_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-390");
  if (planPack?.risk_class !== BILLING_CORE_CP390_PACK_BINDING.risk_class) errors.push("CP00-390 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP390_PACK_BINDING.unit_count) errors.push("CP00-390 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP390_PACK_BINDING.first_unit_id) errors.push("CP00-390 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP390_PACK_BINDING.last_unit_id) errors.push("CP00-390 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-390 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-390 must only include RP12 units");
  const summary = createBillingCoreCp390CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-390 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-390 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-390 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-390 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-390 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-390 ${microId} missing row ${title}`);
    }
  }
  return freezeCp390Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp390P09PermissionFixtureSliceDescriptor(
  descriptor = createBillingCoreCp390P09PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_permission_fixture_slice_case_set ?? createBillingCoreCp390P09PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp390P09PermissionFixtureSliceDescriptor") errors.push("CP00-390 descriptor type drift");
  if (descriptor.source_p09_workflow_permission_slice_descriptor !== "BillingCoreCp389P09WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-390 source p09 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP390_REQUIREMENTS.required_section_rows).length) errors.push("CP00-390 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP390_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-390 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-390 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-390 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-390 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-390 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-390 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-390 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP390_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-390 must not promote Claude");
  if (BILLING_CORE_CP390_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-390 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-390 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-390 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![BILLING_CORE_CP390_PACK_BINDING.pack_id, BILLING_CORE_CP391_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-390 contract current_pack drift");
  }
  if (
    contractProjection?.p09_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p09_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-390 contract p09_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP390_PACK_BINDING.next_pack_id) errors.push("CP00-390 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP390_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-390 next subphase drift");
  }
  return freezeCp390Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp390HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp390P09PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp390Coverage(planPack);
  const slice = validateBillingCoreCp390P09PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp390Validation({
    evidence_packet: "H12.CP00-390.billing_core_p09_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP390_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p09_workflow_permission_slice_pack_id: BILLING_CORE_CP390_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP390_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP390_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP390_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp390ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp390Coverage(planPack);
  const slice = validateBillingCoreCp390P09PermissionFixtureSliceDescriptor(createBillingCoreCp390P09PermissionFixtureSliceDescriptor(), {});
  return freezeCp390Validation({
    review_packet: "C12.CP00-390.billing_core_p09_permission_fixture_slice_descriptor",
    gate: BILLING_CORE_CP390_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP390_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP390_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-390 cover exactly the 10 planned RP12 units from RP12.P09.M05.S21 through RP12.P09.M06.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-390 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp390CloseoutHandoff() {
  return freezeCp390Validation({
    handoff_id: "CP00-390-to-CP00-391",
    from_pack_id: BILLING_CORE_CP390_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP390_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP390_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP390_PACK_BINDING.range,
    open_scope: "Continue RP12.P09.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP390_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp391Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: BILLING_CORE_CP391_PACK_BINDING.pack_id,
    no_write_attestation: BILLING_CORE_CP391_NO_WRITE_ATTESTATION,
  });
}

export function createBillingCoreCp391CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp391Validation({
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

export function validateBillingCoreCp391Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-391 plan pack is required");
  if (planPack?.pack_id !== BILLING_CORE_CP391_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-391");
  if (planPack?.risk_class !== BILLING_CORE_CP391_PACK_BINDING.risk_class) errors.push("CP00-391 risk class drift");
  if (planPack?.unit_count !== BILLING_CORE_CP391_PACK_BINDING.unit_count) errors.push("CP00-391 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== BILLING_CORE_CP391_PACK_BINDING.first_unit_id) errors.push("CP00-391 first unit drift");
  if (unitIds.at(-1) !== BILLING_CORE_CP391_PACK_BINDING.last_unit_id) errors.push("CP00-391 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-391 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP12")) errors.push("CP00-391 must only include RP12 units");
  const summary = createBillingCoreCp391CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-391 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-391 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-391 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-391 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-391 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-391 ${microId} missing row ${title}`);
    }
  }
  return freezeCp391Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateBillingCoreCp391P09CloseoutSliceDescriptor(
  descriptor = createBillingCoreCp391P09CloseoutSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_closeout_slice_case_set ?? createBillingCoreCp391P09CloseoutSliceCaseSet();
  if (descriptor.descriptor !== "BillingCoreCp391P09CloseoutSliceDescriptor") errors.push("CP00-391 descriptor type drift");
  if (descriptor.source_p09_permission_fixture_slice_descriptor !== "BillingCoreCp390P09PermissionFixtureSliceDescriptor") {
    errors.push("CP00-391 source p09 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(BILLING_CORE_CP391_REQUIREMENTS.required_section_rows).length) errors.push("CP00-391 section count drift");
  for (const [microId, titles] of Object.entries(BILLING_CORE_CP391_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-391 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-391 ${microId} row count drift`);
    for (const title of titles) {
      const key = billingCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-391 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-391 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-391 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-391 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-391 ${microId} ${key} must not include raw payload`);
    }
  }
  if (BILLING_CORE_CP391_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-391 must not promote Claude");
  if (BILLING_CORE_CP391_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-391 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-391 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-391 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== BILLING_CORE_CP391_PACK_BINDING.pack_id) {
    errors.push("CP00-391 contract current_pack drift");
  }
  if (
    contractProjection?.p09_closeout_slice_descriptor?.descriptor &&
    contractProjection.p09_closeout_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-391 contract p09_closeout_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== BILLING_CORE_CP391_PACK_BINDING.next_pack_id) errors.push("CP00-391 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== BILLING_CORE_CP391_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-391 next subphase drift");
  }
  return freezeCp391Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBillingCoreCp391HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createBillingCoreCp391P09CloseoutSliceDescriptor(),
) {
  const coverage = validateBillingCoreCp391Coverage(planPack);
  const slice = validateBillingCoreCp391P09CloseoutSliceDescriptor(descriptor, contractProjection);
  return freezeCp391Validation({
    evidence_packet: "H12.CP00-391.billing_core_p09_closeout_slice_descriptor",
    gate: BILLING_CORE_CP391_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_closeout_slice_valid: slice.valid,
    no_real_data: true,
    source_p09_permission_fixture_slice_pack_id: BILLING_CORE_CP391_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: BILLING_CORE_CP391_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: BILLING_CORE_CP391_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP391_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createBillingCoreCp391ClaudeReviewPacket(planPack) {
  const coverage = validateBillingCoreCp391Coverage(planPack);
  const slice = validateBillingCoreCp391P09CloseoutSliceDescriptor(createBillingCoreCp391P09CloseoutSliceDescriptor(), {});
  return freezeCp391Validation({
    review_packet: "C12.CP00-391.billing_core_p09_closeout_slice_descriptor",
    gate: BILLING_CORE_CP391_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: BILLING_CORE_CP391_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_closeout_slice_valid: slice.valid,
    invalid_review_blockers: BILLING_CORE_CP391_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-391 cover exactly the 84 planned RP12 units from RP12.P09.M06.S09 through RP12.P09.M10.S10?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared billing guards applied?",
      "Does CP00-391 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createBillingCoreCp391CloseoutHandoff() {
  return freezeCp391Validation({
    handoff_id: "CP00-391-to-CP00-392",
    from_pack_id: BILLING_CORE_CP391_PACK_BINDING.pack_id,
    to_pack_id: BILLING_CORE_CP391_PACK_BINDING.next_pack_id,
    next_subphase_id: BILLING_CORE_CP391_PACK_BINDING.next_subphase_id,
    closed_scope: BILLING_CORE_CP391_PACK_BINDING.range,
    open_scope: "Continue RP13.P00.M00.S01 onward with the next program while preserving descriptor-only billing boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: BILLING_CORE_CP391_PACK_BINDING.production_ready_flag,
  });
}
