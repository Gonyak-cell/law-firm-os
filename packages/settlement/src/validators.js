import {
  SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP426_PACK_BINDING,
  SETTLEMENT_CORE_CP426_REQUIREMENTS,
  SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP427_PACK_BINDING,
  SETTLEMENT_CORE_CP427_REQUIREMENTS,
  SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP428_PACK_BINDING,
  SETTLEMENT_CORE_CP428_REQUIREMENTS,
  SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP429_PACK_BINDING,
  SETTLEMENT_CORE_CP429_REQUIREMENTS,
  SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP430_PACK_BINDING,
  SETTLEMENT_CORE_CP430_REQUIREMENTS,
  SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP431_PACK_BINDING,
  SETTLEMENT_CORE_CP431_REQUIREMENTS,
  SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP432_PACK_BINDING,
  SETTLEMENT_CORE_CP432_REQUIREMENTS,
  SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP433_PACK_BINDING,
  SETTLEMENT_CORE_CP433_REQUIREMENTS,
  SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP434_PACK_BINDING,
  SETTLEMENT_CORE_CP434_REQUIREMENTS,
  SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP435_PACK_BINDING,
  SETTLEMENT_CORE_CP435_REQUIREMENTS,
  SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP436_PACK_BINDING,
  SETTLEMENT_CORE_CP436_REQUIREMENTS,
  SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP437_PACK_BINDING,
  SETTLEMENT_CORE_CP437_REQUIREMENTS,
  SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP438_PACK_BINDING,
  SETTLEMENT_CORE_CP438_REQUIREMENTS,
  SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP439_PACK_BINDING,
  SETTLEMENT_CORE_CP439_REQUIREMENTS,
  SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP440_PACK_BINDING,
  SETTLEMENT_CORE_CP440_REQUIREMENTS,
  SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP441_PACK_BINDING,
  SETTLEMENT_CORE_CP441_REQUIREMENTS,
  SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP442_PACK_BINDING,
  SETTLEMENT_CORE_CP442_REQUIREMENTS,
  SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP443_PACK_BINDING,
  SETTLEMENT_CORE_CP443_REQUIREMENTS,
  SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP444_PACK_BINDING,
  SETTLEMENT_CORE_CP444_REQUIREMENTS,
  SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP445_PACK_BINDING,
  SETTLEMENT_CORE_CP445_REQUIREMENTS,
  SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP446_PACK_BINDING,
  SETTLEMENT_CORE_CP446_REQUIREMENTS,
  SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP447_PACK_BINDING,
  SETTLEMENT_CORE_CP447_REQUIREMENTS,
  SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP448_PACK_BINDING,
  SETTLEMENT_CORE_CP448_REQUIREMENTS,
  SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP449_PACK_BINDING,
  SETTLEMENT_CORE_CP449_REQUIREMENTS,
  SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP450_PACK_BINDING,
  SETTLEMENT_CORE_CP450_REQUIREMENTS,
  SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP451_PACK_BINDING,
  SETTLEMENT_CORE_CP451_REQUIREMENTS,
  SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION,
  SETTLEMENT_CORE_CP452_PACK_BINDING,
  SETTLEMENT_CORE_CP452_REQUIREMENTS,
} from "./registry.js";
import {
  createSettlementCoreCp426ScopeContractFoundationCaseSet,
  createSettlementCoreCp426ScopeContractFoundationDescriptor,
  createSettlementCoreCp427P01CloseoutP02FoundationCaseSet,
  createSettlementCoreCp427P01CloseoutP02FoundationDescriptor,
  createSettlementCoreCp428P02ContractImplementationSliceCaseSet,
  createSettlementCoreCp428P02ContractImplementationSliceDescriptor,
  createSettlementCoreCp429P02ImplementationWorkflowSliceCaseSet,
  createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor,
  createSettlementCoreCp430P02WorkflowSliceCaseSet,
  createSettlementCoreCp430P02WorkflowSliceDescriptor,
  createSettlementCoreCp431P02WorkflowPermissionSliceCaseSet,
  createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor,
  createSettlementCoreCp432P02CloseoutP03FoundationCaseSet,
  createSettlementCoreCp432P02CloseoutP03FoundationDescriptor,
  createSettlementCoreCp433P03WorkflowSliceCaseSet,
  createSettlementCoreCp433P03WorkflowSliceDescriptor,
  createSettlementCoreCp434P03CloseoutP04FoundationCaseSet,
  createSettlementCoreCp434P03CloseoutP04FoundationDescriptor,
  createSettlementCoreCp435P04ImplementationSliceCaseSet,
  createSettlementCoreCp435P04ImplementationSliceDescriptor,
  createSettlementCoreCp436P04WorkflowSliceCaseSet,
  createSettlementCoreCp436P04WorkflowSliceDescriptor,
  createSettlementCoreCp437P04CloseoutP05FoundationCaseSet,
  createSettlementCoreCp437P04CloseoutP05FoundationDescriptor,
  createSettlementCoreCp438P05ImplementationSliceCaseSet,
  createSettlementCoreCp438P05ImplementationSliceDescriptor,
  createSettlementCoreCp439P05WorkflowPermissionSliceCaseSet,
  createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor,
  createSettlementCoreCp440P05CloseoutP06FoundationCaseSet,
  createSettlementCoreCp440P05CloseoutP06FoundationDescriptor,
  createSettlementCoreCp441P06ImplementationWorkflowSliceCaseSet,
  createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor,
  createSettlementCoreCp442P06WorkflowPermissionSliceCaseSet,
  createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor,
  createSettlementCoreCp443P06PermissionSliceCaseSet,
  createSettlementCoreCp443P06PermissionSliceDescriptor,
  createSettlementCoreCp444P06PermissionFixtureSliceCaseSet,
  createSettlementCoreCp444P06PermissionFixtureSliceDescriptor,
  createSettlementCoreCp445P06CloseoutP07FoundationCaseSet,
  createSettlementCoreCp445P06CloseoutP07FoundationDescriptor,
  createSettlementCoreCp446P07FoundationSliceCaseSet,
  createSettlementCoreCp446P07FoundationSliceDescriptor,
  createSettlementCoreCp447P07CloseoutP08FoundationCaseSet,
  createSettlementCoreCp447P07CloseoutP08FoundationDescriptor,
  createSettlementCoreCp448P08FixtureTestSliceCaseSet,
  createSettlementCoreCp448P08FixtureTestSliceDescriptor,
  createSettlementCoreCp449P08TestHermesSliceCaseSet,
  createSettlementCoreCp449P08TestHermesSliceDescriptor,
  createSettlementCoreCp450P08CloseoutP09FoundationCaseSet,
  createSettlementCoreCp450P08CloseoutP09FoundationDescriptor,
  createSettlementCoreCp451P09TestHermesSliceCaseSet,
  createSettlementCoreCp451P09TestHermesSliceDescriptor,
  createSettlementCoreCp452P09ReviewCloseoutSliceCaseSet,
  createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor,
  settlementCoreRowKey,
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

function freezeCp426Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP426_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp426CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp426Validation({
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

export function validateSettlementCoreCp426Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-426 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP426_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-426");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP426_PACK_BINDING.risk_class) errors.push("CP00-426 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP426_PACK_BINDING.unit_count) errors.push("CP00-426 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP426_PACK_BINDING.first_unit_id) errors.push("CP00-426 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP426_PACK_BINDING.last_unit_id) errors.push("CP00-426 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-426 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-426 must only include RP14 units");
  const summary = createSettlementCoreCp426CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-426 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-426 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-426 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-426 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-426 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-426 ${microId} missing row ${title}`);
    }
  }
  return freezeCp426Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp426ScopeContractFoundationDescriptor(
  descriptor = createSettlementCoreCp426ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createSettlementCoreCp426ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp426ScopeContractFoundationDescriptor") errors.push("CP00-426 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP14") errors.push("CP00-426 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP13") errors.push("CP00-426 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows).length) errors.push("CP00-426 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-426 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-426 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-426 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-426 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-426 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-426 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-426 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SETTLEMENT_CORE_CP426_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.non_goal_boundary && rows.non_goal_boundary.settlement_runtime_opened !== false) {
      errors.push(`CP00-426 ${microId} must not open settlement runtime`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.permission_decision_detail_included !== false) {
      errors.push(`CP00-426 ${microId} permission baseline must not expose decisions`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-426 ${microId} permission baseline must deny cross-tenant access`);
    }
    if (rows.audit_baseline_note && rows.audit_baseline_note.audit_event_body_included !== false) {
      errors.push(`CP00-426 ${microId} audit baseline must not expose event bodies`);
    }
    if (rows.synthetic_data_policy && rows.synthetic_data_policy.real_client_data_loaded !== false) {
      errors.push(`CP00-426 ${microId} synthetic data policy drift`);
    }
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-426 ${microId} tenant scope must deny cross-tenant access`);
    }
    if (rows.matter_trace_reference && rows.matter_trace_reference.matter_trace_required !== true) {
      errors.push(`CP00-426 ${microId} matter trace must be required`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-426 ${microId} state transition map must not write state`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-426 ${microId} fixture model must not load real data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-426 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-426 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-426 ${microId} must not claim Claude final approval`);
    }
  }
  if (SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-426 must not promote Claude");
  if (SETTLEMENT_CORE_CP426_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-426 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-426 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-426 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP426_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP427_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-426 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-426 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP426_PACK_BINDING.next_pack_id) errors.push("CP00-426 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP426_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-426 next subphase drift");
  }
  return freezeCp426Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp426HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp426ScopeContractFoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp426Coverage(planPack);
  const foundation = validateSettlementCoreCp426ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp426Validation({
    evidence_packet: "H14.CP00-426.settlement_core_scope_contract_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP426_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_payments_core_pack_id: SETTLEMENT_CORE_CP426_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP426_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP426_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP426_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSettlementCoreCp426ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp426Coverage(planPack);
  const foundation = validateSettlementCoreCp426ScopeContractFoundationDescriptor(createSettlementCoreCp426ScopeContractFoundationDescriptor(), {});
  return freezeCp426Validation({
    review_packet: "C14.CP00-426.settlement_core_scope_contract_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP426_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP426_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP426_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-426 cover exactly the 150 planned RP14 units from RP14.P00.M00.S01 through RP14.P01.M04.S13?",
      "Do the twenty-one descriptor sections (P00 M00-M10 scope foundation cycle and P01 M00-M08 model foundation cycle with package directory layout, primary entity identifier, tenant scope field, matter trace reference, lifecycle status enum, ownership metadata, reference relationship map, field registries, state transition map, validation helper, fixture model, serialization shape, public export, model tests, Hermes model summary, Claude model review prompt, and closeout handoff) cover every planned row title as descriptor-only rows?",
      "Does CP00-426 avoid settlement/origination/allocation/working-credit runtime, runtime permission evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, real data, permission decision leaks, audit event body leaks, fixture payload leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp426CloseoutHandoff() {
  return freezeCp426Validation({
    handoff_id: "CP00-426-to-CP00-427",
    from_pack_id: SETTLEMENT_CORE_CP426_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP426_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP426_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP426_PACK_BINDING.range,
    open_scope: "Continue RP14.P01.M04.S14 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP426_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp427Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP427_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp427CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp427Validation({
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

export function validateSettlementCoreCp427Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-427 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP427_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-427");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP427_PACK_BINDING.risk_class) errors.push("CP00-427 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP427_PACK_BINDING.unit_count) errors.push("CP00-427 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP427_PACK_BINDING.first_unit_id) errors.push("CP00-427 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP427_PACK_BINDING.last_unit_id) errors.push("CP00-427 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-427 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-427 must only include RP14 units");
  const summary = createSettlementCoreCp427CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-427 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-427 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-427 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-427 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-427 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-427 ${microId} missing row ${title}`);
    }
  }
  return freezeCp427Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp427P01CloseoutP02FoundationDescriptor(
  descriptor = createSettlementCoreCp427P01CloseoutP02FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_foundation_case_set ?? createSettlementCoreCp427P01CloseoutP02FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp427P01CloseoutP02FoundationDescriptor") errors.push("CP00-427 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "SettlementCoreCp426ScopeContractFoundationDescriptor") {
    errors.push("CP00-427 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP427_REQUIREMENTS.required_section_rows).length) errors.push("CP00-427 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-427 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-427 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-427 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-427 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-427 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-427 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-427 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SETTLEMENT_CORE_CP427_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-427 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-427 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-427 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-427 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-427 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-427 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-427 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-427 ${microId} must not claim Claude final approval`);
    }
  }
  if (SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-427 must not promote Claude");
  if (SETTLEMENT_CORE_CP427_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-427 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-427 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-427 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP427_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-427 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-427 contract p01_closeout_p02_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP427_PACK_BINDING.next_pack_id) errors.push("CP00-427 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP427_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-427 next subphase drift");
  }
  return freezeCp427Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp427HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp427P01CloseoutP02FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp427Coverage(planPack);
  const slice = validateSettlementCoreCp427P01CloseoutP02FoundationDescriptor(descriptor, contractProjection);
  return freezeCp427Validation({
    evidence_packet: "H14.CP00-427.settlement_core_p01_closeout_p02_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP427_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_foundation_valid: slice.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: SETTLEMENT_CORE_CP427_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP427_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP427_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP427_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp427ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp427Coverage(planPack);
  const slice = validateSettlementCoreCp427P01CloseoutP02FoundationDescriptor(createSettlementCoreCp427P01CloseoutP02FoundationDescriptor(), {});
  return freezeCp427Validation({
    review_packet: "C14.CP00-427.settlement_core_p01_closeout_p02_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP427_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP427_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP427_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-427 cover exactly the 150 planned RP14 units from RP14.P01.M04.S14 through RP14.P02.M01.S16?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-427 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp427CloseoutHandoff() {
  return freezeCp427Validation({
    handoff_id: "CP00-427-to-CP00-428",
    from_pack_id: SETTLEMENT_CORE_CP427_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP427_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP427_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP427_PACK_BINDING.range,
    open_scope: "Continue RP14.P02.M01.S17 onward with the remaining contract draft rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP427_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp428Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp428CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp428Validation({
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

export function validateSettlementCoreCp428Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-428 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-428");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP428_PACK_BINDING.risk_class) errors.push("CP00-428 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP428_PACK_BINDING.unit_count) errors.push("CP00-428 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP428_PACK_BINDING.first_unit_id) errors.push("CP00-428 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP428_PACK_BINDING.last_unit_id) errors.push("CP00-428 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-428 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-428 must only include RP14 units");
  const summary = createSettlementCoreCp428CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-428 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-428 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-428 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-428 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-428 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-428 ${microId} missing row ${title}`);
    }
  }
  return freezeCp428Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp428P02ContractImplementationSliceDescriptor(
  descriptor = createSettlementCoreCp428P02ContractImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_contract_implementation_slice_case_set ?? createSettlementCoreCp428P02ContractImplementationSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp428P02ContractImplementationSliceDescriptor") errors.push("CP00-428 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_foundation_descriptor !== "SettlementCoreCp427P01CloseoutP02FoundationDescriptor") {
    errors.push("CP00-428 source p01 closeout p02 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP428_REQUIREMENTS.required_section_rows).length) errors.push("CP00-428 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP428_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-428 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-428 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-428 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-428 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-428 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-428 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-428 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-428 must not promote Claude");
  if (SETTLEMENT_CORE_CP428_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-428 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-428 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-428 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-428 contract current_pack drift");
  }
  if (
    contractProjection?.p02_contract_implementation_slice_descriptor?.descriptor &&
    contractProjection.p02_contract_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-428 contract p02_contract_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP428_PACK_BINDING.next_pack_id) errors.push("CP00-428 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP428_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-428 next subphase drift");
  }
  return freezeCp428Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp428HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp428P02ContractImplementationSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp428Coverage(planPack);
  const slice = validateSettlementCoreCp428P02ContractImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp428Validation({
    evidence_packet: "H14.CP00-428.settlement_core_p02_contract_implementation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP428_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_contract_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_foundation_pack_id: SETTLEMENT_CORE_CP428_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP428_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP428_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP428_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp428ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp428Coverage(planPack);
  const slice = validateSettlementCoreCp428P02ContractImplementationSliceDescriptor(createSettlementCoreCp428P02ContractImplementationSliceDescriptor(), {});
  return freezeCp428Validation({
    review_packet: "C14.CP00-428.settlement_core_p02_contract_implementation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP428_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP428_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_contract_implementation_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP428_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-428 cover exactly the 40 planned RP14 units from RP14.P02.M01.S17 through RP14.P02.M03.S14?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-428 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp428CloseoutHandoff() {
  return freezeCp428Validation({
    handoff_id: "CP00-428-to-CP00-429",
    from_pack_id: SETTLEMENT_CORE_CP428_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP428_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP428_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP428_PACK_BINDING.range,
    open_scope: "Continue RP14.P02.M03.S15 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP428_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp429Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp429CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp429Validation({
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

export function validateSettlementCoreCp429Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-429 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-429");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP429_PACK_BINDING.risk_class) errors.push("CP00-429 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP429_PACK_BINDING.unit_count) errors.push("CP00-429 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP429_PACK_BINDING.first_unit_id) errors.push("CP00-429 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP429_PACK_BINDING.last_unit_id) errors.push("CP00-429 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-429 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-429 must only include RP14 units");
  const summary = createSettlementCoreCp429CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-429 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-429 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-429 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-429 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-429 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-429 ${microId} missing row ${title}`);
    }
  }
  return freezeCp429Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(
  descriptor = createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_implementation_workflow_slice_case_set ?? createSettlementCoreCp429P02ImplementationWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp429P02ImplementationWorkflowSliceDescriptor") errors.push("CP00-429 descriptor type drift");
  if (descriptor.source_p02_contract_implementation_slice_descriptor !== "SettlementCoreCp428P02ContractImplementationSliceDescriptor") {
    errors.push("CP00-429 source p02 contract implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP429_REQUIREMENTS.required_section_rows).length) errors.push("CP00-429 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP429_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-429 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-429 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-429 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-429 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-429 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-429 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-429 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-429 must not promote Claude");
  if (SETTLEMENT_CORE_CP429_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-429 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-429 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-429 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-429 contract current_pack drift");
  }
  if (
    contractProjection?.p02_implementation_workflow_slice_descriptor?.descriptor &&
    contractProjection.p02_implementation_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-429 contract p02_implementation_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP429_PACK_BINDING.next_pack_id) errors.push("CP00-429 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP429_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-429 next subphase drift");
  }
  return freezeCp429Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp429HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp429Coverage(planPack);
  const slice = validateSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp429Validation({
    evidence_packet: "H14.CP00-429.settlement_core_p02_implementation_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP429_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_implementation_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_contract_implementation_slice_pack_id: SETTLEMENT_CORE_CP429_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP429_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP429_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP429_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp429ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp429Coverage(planPack);
  const slice = validateSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(createSettlementCoreCp429P02ImplementationWorkflowSliceDescriptor(), {});
  return freezeCp429Validation({
    review_packet: "C14.CP00-429.settlement_core_p02_implementation_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP429_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP429_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_implementation_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP429_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-429 cover exactly the 10 planned RP14 units from RP14.P02.M03.S15 through RP14.P02.M04.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-429 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp429CloseoutHandoff() {
  return freezeCp429Validation({
    handoff_id: "CP00-429-to-CP00-430",
    from_pack_id: SETTLEMENT_CORE_CP429_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP429_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP429_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP429_PACK_BINDING.range,
    open_scope: "Continue RP14.P02.M04.S03 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP429_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp430Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp430CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp430Validation({
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

export function validateSettlementCoreCp430Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-430 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-430");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP430_PACK_BINDING.risk_class) errors.push("CP00-430 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP430_PACK_BINDING.unit_count) errors.push("CP00-430 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP430_PACK_BINDING.first_unit_id) errors.push("CP00-430 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP430_PACK_BINDING.last_unit_id) errors.push("CP00-430 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-430 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-430 must only include RP14 units");
  const summary = createSettlementCoreCp430CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-430 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-430 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-430 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-430 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-430 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-430 ${microId} missing row ${title}`);
    }
  }
  return freezeCp430Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp430P02WorkflowSliceDescriptor(
  descriptor = createSettlementCoreCp430P02WorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_workflow_slice_case_set ?? createSettlementCoreCp430P02WorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp430P02WorkflowSliceDescriptor") errors.push("CP00-430 descriptor type drift");
  if (descriptor.source_p02_implementation_workflow_slice_descriptor !== "SettlementCoreCp429P02ImplementationWorkflowSliceDescriptor") {
    errors.push("CP00-430 source p02 implementation workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP430_REQUIREMENTS.required_section_rows).length) errors.push("CP00-430 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP430_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-430 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-430 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-430 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-430 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-430 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-430 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-430 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-430 must not promote Claude");
  if (SETTLEMENT_CORE_CP430_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-430 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-430 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-430 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-430 contract current_pack drift");
  }
  if (
    contractProjection?.p02_workflow_slice_descriptor?.descriptor &&
    contractProjection.p02_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-430 contract p02_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP430_PACK_BINDING.next_pack_id) errors.push("CP00-430 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP430_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-430 next subphase drift");
  }
  return freezeCp430Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp430HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp430P02WorkflowSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp430Coverage(planPack);
  const slice = validateSettlementCoreCp430P02WorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp430Validation({
    evidence_packet: "H14.CP00-430.settlement_core_p02_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP430_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_implementation_workflow_slice_pack_id: SETTLEMENT_CORE_CP430_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP430_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP430_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP430_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp430ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp430Coverage(planPack);
  const slice = validateSettlementCoreCp430P02WorkflowSliceDescriptor(createSettlementCoreCp430P02WorkflowSliceDescriptor(), {});
  return freezeCp430Validation({
    review_packet: "C14.CP00-430.settlement_core_p02_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP430_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP430_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP430_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-430 cover exactly the 10 planned RP14 units from RP14.P02.M04.S03 through RP14.P02.M04.S12?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-430 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp430CloseoutHandoff() {
  return freezeCp430Validation({
    handoff_id: "CP00-430-to-CP00-431",
    from_pack_id: SETTLEMENT_CORE_CP430_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP430_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP430_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP430_PACK_BINDING.range,
    open_scope: "Continue RP14.P02.M04.S13 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP430_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp431Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp431CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp431Validation({
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

export function validateSettlementCoreCp431Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-431 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-431");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP431_PACK_BINDING.risk_class) errors.push("CP00-431 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP431_PACK_BINDING.unit_count) errors.push("CP00-431 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP431_PACK_BINDING.first_unit_id) errors.push("CP00-431 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP431_PACK_BINDING.last_unit_id) errors.push("CP00-431 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-431 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-431 must only include RP14 units");
  const summary = createSettlementCoreCp431CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-431 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-431 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-431 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-431 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-431 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-431 ${microId} missing row ${title}`);
    }
  }
  return freezeCp431Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(
  descriptor = createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_workflow_permission_slice_case_set ?? createSettlementCoreCp431P02WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp431P02WorkflowPermissionSliceDescriptor") errors.push("CP00-431 descriptor type drift");
  if (descriptor.source_p02_workflow_slice_descriptor !== "SettlementCoreCp430P02WorkflowSliceDescriptor") {
    errors.push("CP00-431 source p02 workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP431_REQUIREMENTS.required_section_rows).length) errors.push("CP00-431 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP431_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-431 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-431 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-431 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-431 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-431 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-431 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-431 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-431 must not promote Claude");
  if (SETTLEMENT_CORE_CP431_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-431 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-431 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-431 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-431 contract current_pack drift");
  }
  if (
    contractProjection?.p02_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p02_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-431 contract p02_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP431_PACK_BINDING.next_pack_id) errors.push("CP00-431 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP431_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-431 next subphase drift");
  }
  return freezeCp431Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp431HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp431Coverage(planPack);
  const slice = validateSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp431Validation({
    evidence_packet: "H14.CP00-431.settlement_core_p02_workflow_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP431_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_workflow_slice_pack_id: SETTLEMENT_CORE_CP431_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP431_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP431_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP431_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp431ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp431Coverage(planPack);
  const slice = validateSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(createSettlementCoreCp431P02WorkflowPermissionSliceDescriptor(), {});
  return freezeCp431Validation({
    review_packet: "C14.CP00-431.settlement_core_p02_workflow_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP431_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP431_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP431_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-431 cover exactly the 40 planned RP14 units from RP14.P02.M04.S13 through RP14.P02.M06.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-431 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp431CloseoutHandoff() {
  return freezeCp431Validation({
    handoff_id: "CP00-431-to-CP00-432",
    from_pack_id: SETTLEMENT_CORE_CP431_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP431_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP431_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP431_PACK_BINDING.range,
    open_scope: "Continue RP14.P02.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP431_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp432Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp432CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp432Validation({
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

export function validateSettlementCoreCp432Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-432 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-432");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP432_PACK_BINDING.risk_class) errors.push("CP00-432 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP432_PACK_BINDING.unit_count) errors.push("CP00-432 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP432_PACK_BINDING.first_unit_id) errors.push("CP00-432 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP432_PACK_BINDING.last_unit_id) errors.push("CP00-432 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-432 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-432 must only include RP14 units");
  const summary = createSettlementCoreCp432CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-432 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-432 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-432 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-432 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-432 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-432 ${microId} missing row ${title}`);
    }
  }
  return freezeCp432Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp432P02CloseoutP03FoundationDescriptor(
  descriptor = createSettlementCoreCp432P02CloseoutP03FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_foundation_case_set ?? createSettlementCoreCp432P02CloseoutP03FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp432P02CloseoutP03FoundationDescriptor") errors.push("CP00-432 descriptor type drift");
  if (descriptor.source_p02_workflow_permission_slice_descriptor !== "SettlementCoreCp431P02WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-432 source p02 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP432_REQUIREMENTS.required_section_rows).length) errors.push("CP00-432 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP432_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-432 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-432 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-432 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-432 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-432 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-432 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-432 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-432 must not promote Claude");
  if (SETTLEMENT_CORE_CP432_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-432 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-432 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-432 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-432 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-432 contract p02_closeout_p03_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP432_PACK_BINDING.next_pack_id) errors.push("CP00-432 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP432_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-432 next subphase drift");
  }
  return freezeCp432Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp432HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp432P02CloseoutP03FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp432Coverage(planPack);
  const slice = validateSettlementCoreCp432P02CloseoutP03FoundationDescriptor(descriptor, contractProjection);
  return freezeCp432Validation({
    evidence_packet: "H14.CP00-432.settlement_core_p02_closeout_p03_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP432_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_foundation_valid: slice.valid,
    no_real_data: true,
    source_p02_workflow_permission_slice_pack_id: SETTLEMENT_CORE_CP432_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP432_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP432_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP432_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp432ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp432Coverage(planPack);
  const slice = validateSettlementCoreCp432P02CloseoutP03FoundationDescriptor(createSettlementCoreCp432P02CloseoutP03FoundationDescriptor(), {});
  return freezeCp432Validation({
    review_packet: "C14.CP00-432.settlement_core_p02_closeout_p03_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP432_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP432_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP432_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-432 cover exactly the 150 planned RP14 units from RP14.P02.M06.S09 through RP14.P03.M04.S05?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-432 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp432CloseoutHandoff() {
  return freezeCp432Validation({
    handoff_id: "CP00-432-to-CP00-433",
    from_pack_id: SETTLEMENT_CORE_CP432_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP432_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP432_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP432_PACK_BINDING.range,
    open_scope: "Continue RP14.P03.M04.S06 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP432_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp433Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp433CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp433Validation({
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

export function validateSettlementCoreCp433Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-433 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-433");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP433_PACK_BINDING.risk_class) errors.push("CP00-433 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP433_PACK_BINDING.unit_count) errors.push("CP00-433 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP433_PACK_BINDING.first_unit_id) errors.push("CP00-433 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP433_PACK_BINDING.last_unit_id) errors.push("CP00-433 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-433 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-433 must only include RP14 units");
  const summary = createSettlementCoreCp433CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-433 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-433 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-433 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-433 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-433 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-433 ${microId} missing row ${title}`);
    }
  }
  return freezeCp433Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp433P03WorkflowSliceDescriptor(
  descriptor = createSettlementCoreCp433P03WorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_workflow_slice_case_set ?? createSettlementCoreCp433P03WorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp433P03WorkflowSliceDescriptor") errors.push("CP00-433 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_foundation_descriptor !== "SettlementCoreCp432P02CloseoutP03FoundationDescriptor") {
    errors.push("CP00-433 source p02 closeout p03 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP433_REQUIREMENTS.required_section_rows).length) errors.push("CP00-433 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP433_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-433 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-433 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-433 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-433 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-433 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-433 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-433 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-433 must not promote Claude");
  if (SETTLEMENT_CORE_CP433_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-433 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-433 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-433 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-433 contract current_pack drift");
  }
  if (
    contractProjection?.p03_workflow_slice_descriptor?.descriptor &&
    contractProjection.p03_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-433 contract p03_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP433_PACK_BINDING.next_pack_id) errors.push("CP00-433 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP433_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-433 next subphase drift");
  }
  return freezeCp433Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp433HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp433P03WorkflowSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp433Coverage(planPack);
  const slice = validateSettlementCoreCp433P03WorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp433Validation({
    evidence_packet: "H14.CP00-433.settlement_core_p03_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP433_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_closeout_p03_foundation_pack_id: SETTLEMENT_CORE_CP433_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP433_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP433_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP433_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp433ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp433Coverage(planPack);
  const slice = validateSettlementCoreCp433P03WorkflowSliceDescriptor(createSettlementCoreCp433P03WorkflowSliceDescriptor(), {});
  return freezeCp433Validation({
    review_packet: "C14.CP00-433.settlement_core_p03_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP433_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP433_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP433_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-433 cover exactly the 10 planned RP14 units from RP14.P03.M04.S06 through RP14.P03.M04.S15?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-433 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp433CloseoutHandoff() {
  return freezeCp433Validation({
    handoff_id: "CP00-433-to-CP00-434",
    from_pack_id: SETTLEMENT_CORE_CP433_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP433_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP433_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP433_PACK_BINDING.range,
    open_scope: "Continue RP14.P03.M04.S16 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP433_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp434Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp434CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp434Validation({
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

export function validateSettlementCoreCp434Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-434 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-434");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP434_PACK_BINDING.risk_class) errors.push("CP00-434 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP434_PACK_BINDING.unit_count) errors.push("CP00-434 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP434_PACK_BINDING.first_unit_id) errors.push("CP00-434 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP434_PACK_BINDING.last_unit_id) errors.push("CP00-434 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-434 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-434 must only include RP14 units");
  const summary = createSettlementCoreCp434CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-434 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-434 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-434 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-434 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-434 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-434 ${microId} missing row ${title}`);
    }
  }
  return freezeCp434Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp434P03CloseoutP04FoundationDescriptor(
  descriptor = createSettlementCoreCp434P03CloseoutP04FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_closeout_p04_foundation_case_set ?? createSettlementCoreCp434P03CloseoutP04FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp434P03CloseoutP04FoundationDescriptor") errors.push("CP00-434 descriptor type drift");
  if (descriptor.source_p03_workflow_slice_descriptor !== "SettlementCoreCp433P03WorkflowSliceDescriptor") {
    errors.push("CP00-434 source p03 workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP434_REQUIREMENTS.required_section_rows).length) errors.push("CP00-434 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP434_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-434 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-434 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-434 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-434 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-434 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-434 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-434 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-434 must not promote Claude");
  if (SETTLEMENT_CORE_CP434_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-434 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-434 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-434 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-434 contract current_pack drift");
  }
  if (
    contractProjection?.p03_closeout_p04_foundation_descriptor?.descriptor &&
    contractProjection.p03_closeout_p04_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-434 contract p03_closeout_p04_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP434_PACK_BINDING.next_pack_id) errors.push("CP00-434 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP434_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-434 next subphase drift");
  }
  return freezeCp434Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp434HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp434P03CloseoutP04FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp434Coverage(planPack);
  const slice = validateSettlementCoreCp434P03CloseoutP04FoundationDescriptor(descriptor, contractProjection);
  return freezeCp434Validation({
    evidence_packet: "H14.CP00-434.settlement_core_p03_closeout_p04_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP434_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_closeout_p04_foundation_valid: slice.valid,
    no_real_data: true,
    source_p03_workflow_slice_pack_id: SETTLEMENT_CORE_CP434_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP434_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP434_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP434_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp434ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp434Coverage(planPack);
  const slice = validateSettlementCoreCp434P03CloseoutP04FoundationDescriptor(createSettlementCoreCp434P03CloseoutP04FoundationDescriptor(), {});
  return freezeCp434Validation({
    review_packet: "C14.CP00-434.settlement_core_p03_closeout_p04_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP434_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP434_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_closeout_p04_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP434_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-434 cover exactly the 150 planned RP14 units from RP14.P03.M04.S16 through RP14.P04.M02.S11?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-434 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp434CloseoutHandoff() {
  return freezeCp434Validation({
    handoff_id: "CP00-434-to-CP00-435",
    from_pack_id: SETTLEMENT_CORE_CP434_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP434_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP434_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP434_PACK_BINDING.range,
    open_scope: "Continue RP14.P04.M02.S12 onward with the remaining type and shape rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP434_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp435Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp435CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp435Validation({
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

export function validateSettlementCoreCp435Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-435 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-435");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP435_PACK_BINDING.risk_class) errors.push("CP00-435 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP435_PACK_BINDING.unit_count) errors.push("CP00-435 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP435_PACK_BINDING.first_unit_id) errors.push("CP00-435 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP435_PACK_BINDING.last_unit_id) errors.push("CP00-435 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-435 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-435 must only include RP14 units");
  const summary = createSettlementCoreCp435CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-435 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-435 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-435 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-435 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-435 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-435 ${microId} missing row ${title}`);
    }
  }
  return freezeCp435Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp435P04ImplementationSliceDescriptor(
  descriptor = createSettlementCoreCp435P04ImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_implementation_slice_case_set ?? createSettlementCoreCp435P04ImplementationSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp435P04ImplementationSliceDescriptor") errors.push("CP00-435 descriptor type drift");
  if (descriptor.source_p03_closeout_p04_foundation_descriptor !== "SettlementCoreCp434P03CloseoutP04FoundationDescriptor") {
    errors.push("CP00-435 source p03 closeout p04 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP435_REQUIREMENTS.required_section_rows).length) errors.push("CP00-435 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP435_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-435 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-435 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-435 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-435 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-435 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-435 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-435 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-435 must not promote Claude");
  if (SETTLEMENT_CORE_CP435_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-435 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-435 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-435 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-435 contract current_pack drift");
  }
  if (
    contractProjection?.p04_implementation_slice_descriptor?.descriptor &&
    contractProjection.p04_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-435 contract p04_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP435_PACK_BINDING.next_pack_id) errors.push("CP00-435 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP435_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-435 next subphase drift");
  }
  return freezeCp435Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp435HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp435P04ImplementationSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp435Coverage(planPack);
  const slice = validateSettlementCoreCp435P04ImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp435Validation({
    evidence_packet: "H14.CP00-435.settlement_core_p04_implementation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP435_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p03_closeout_p04_foundation_pack_id: SETTLEMENT_CORE_CP435_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP435_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP435_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP435_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp435ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp435Coverage(planPack);
  const slice = validateSettlementCoreCp435P04ImplementationSliceDescriptor(createSettlementCoreCp435P04ImplementationSliceDescriptor(), {});
  return freezeCp435Validation({
    review_packet: "C14.CP00-435.settlement_core_p04_implementation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP435_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP435_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_implementation_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP435_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-435 cover exactly the 40 planned RP14 units from RP14.P04.M02.S12 through RP14.P04.M04.S09?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-435 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp435CloseoutHandoff() {
  return freezeCp435Validation({
    handoff_id: "CP00-435-to-CP00-436",
    from_pack_id: SETTLEMENT_CORE_CP435_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP435_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP435_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP435_PACK_BINDING.range,
    open_scope: "Continue RP14.P04.M04.S10 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP435_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp436Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp436CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp436Validation({
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

export function validateSettlementCoreCp436Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-436 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-436");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP436_PACK_BINDING.risk_class) errors.push("CP00-436 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP436_PACK_BINDING.unit_count) errors.push("CP00-436 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP436_PACK_BINDING.first_unit_id) errors.push("CP00-436 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP436_PACK_BINDING.last_unit_id) errors.push("CP00-436 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-436 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-436 must only include RP14 units");
  const summary = createSettlementCoreCp436CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-436 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-436 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-436 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-436 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-436 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-436 ${microId} missing row ${title}`);
    }
  }
  return freezeCp436Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp436P04WorkflowSliceDescriptor(
  descriptor = createSettlementCoreCp436P04WorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_workflow_slice_case_set ?? createSettlementCoreCp436P04WorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp436P04WorkflowSliceDescriptor") errors.push("CP00-436 descriptor type drift");
  if (descriptor.source_p04_implementation_slice_descriptor !== "SettlementCoreCp435P04ImplementationSliceDescriptor") {
    errors.push("CP00-436 source p04 implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP436_REQUIREMENTS.required_section_rows).length) errors.push("CP00-436 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP436_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-436 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-436 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-436 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-436 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-436 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-436 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-436 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-436 must not promote Claude");
  if (SETTLEMENT_CORE_CP436_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-436 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-436 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-436 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-436 contract current_pack drift");
  }
  if (
    contractProjection?.p04_workflow_slice_descriptor?.descriptor &&
    contractProjection.p04_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-436 contract p04_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP436_PACK_BINDING.next_pack_id) errors.push("CP00-436 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP436_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-436 next subphase drift");
  }
  return freezeCp436Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp436HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp436P04WorkflowSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp436Coverage(planPack);
  const slice = validateSettlementCoreCp436P04WorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp436Validation({
    evidence_packet: "H14.CP00-436.settlement_core_p04_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP436_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_implementation_slice_pack_id: SETTLEMENT_CORE_CP436_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP436_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP436_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP436_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp436ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp436Coverage(planPack);
  const slice = validateSettlementCoreCp436P04WorkflowSliceDescriptor(createSettlementCoreCp436P04WorkflowSliceDescriptor(), {});
  return freezeCp436Validation({
    review_packet: "C14.CP00-436.settlement_core_p04_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP436_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP436_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP436_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-436 cover exactly the 10 planned RP14 units from RP14.P04.M04.S10 through RP14.P04.M04.S19?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-436 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp436CloseoutHandoff() {
  return freezeCp436Validation({
    handoff_id: "CP00-436-to-CP00-437",
    from_pack_id: SETTLEMENT_CORE_CP436_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP436_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP436_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP436_PACK_BINDING.range,
    open_scope: "Continue RP14.P04.M04.S20 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP436_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp437Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp437CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp437Validation({
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

export function validateSettlementCoreCp437Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-437 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-437");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP437_PACK_BINDING.risk_class) errors.push("CP00-437 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP437_PACK_BINDING.unit_count) errors.push("CP00-437 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP437_PACK_BINDING.first_unit_id) errors.push("CP00-437 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP437_PACK_BINDING.last_unit_id) errors.push("CP00-437 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-437 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-437 must only include RP14 units");
  const summary = createSettlementCoreCp437CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-437 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-437 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-437 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-437 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-437 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-437 ${microId} missing row ${title}`);
    }
  }
  return freezeCp437Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp437P04CloseoutP05FoundationDescriptor(
  descriptor = createSettlementCoreCp437P04CloseoutP05FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_closeout_p05_foundation_case_set ?? createSettlementCoreCp437P04CloseoutP05FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp437P04CloseoutP05FoundationDescriptor") errors.push("CP00-437 descriptor type drift");
  if (descriptor.source_p04_workflow_slice_descriptor !== "SettlementCoreCp436P04WorkflowSliceDescriptor") {
    errors.push("CP00-437 source p04 workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP437_REQUIREMENTS.required_section_rows).length) errors.push("CP00-437 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP437_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-437 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-437 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-437 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-437 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-437 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-437 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-437 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-437 must not promote Claude");
  if (SETTLEMENT_CORE_CP437_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-437 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-437 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-437 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-437 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-437 contract p04_closeout_p05_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP437_PACK_BINDING.next_pack_id) errors.push("CP00-437 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP437_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-437 next subphase drift");
  }
  return freezeCp437Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp437HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp437P04CloseoutP05FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp437Coverage(planPack);
  const slice = validateSettlementCoreCp437P04CloseoutP05FoundationDescriptor(descriptor, contractProjection);
  return freezeCp437Validation({
    evidence_packet: "H14.CP00-437.settlement_core_p04_closeout_p05_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP437_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_foundation_valid: slice.valid,
    no_real_data: true,
    source_p04_workflow_slice_pack_id: SETTLEMENT_CORE_CP437_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP437_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP437_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP437_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp437ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp437Coverage(planPack);
  const slice = validateSettlementCoreCp437P04CloseoutP05FoundationDescriptor(createSettlementCoreCp437P04CloseoutP05FoundationDescriptor(), {});
  return freezeCp437Validation({
    review_packet: "C14.CP00-437.settlement_core_p04_closeout_p05_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP437_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP437_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP437_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-437 cover exactly the 150 planned RP14 units from RP14.P04.M04.S20 through RP14.P05.M02.S09?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-437 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp437CloseoutHandoff() {
  return freezeCp437Validation({
    handoff_id: "CP00-437-to-CP00-438",
    from_pack_id: SETTLEMENT_CORE_CP437_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP437_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP437_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP437_PACK_BINDING.range,
    open_scope: "Continue RP14.P05.M02.S10 onward with the remaining type and shape rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP437_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp438Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp438CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp438Validation({
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

export function validateSettlementCoreCp438Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-438 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-438");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP438_PACK_BINDING.risk_class) errors.push("CP00-438 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP438_PACK_BINDING.unit_count) errors.push("CP00-438 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP438_PACK_BINDING.first_unit_id) errors.push("CP00-438 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP438_PACK_BINDING.last_unit_id) errors.push("CP00-438 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-438 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-438 must only include RP14 units");
  const summary = createSettlementCoreCp438CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-438 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-438 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-438 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-438 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-438 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-438 ${microId} missing row ${title}`);
    }
  }
  return freezeCp438Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp438P05ImplementationSliceDescriptor(
  descriptor = createSettlementCoreCp438P05ImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_implementation_slice_case_set ?? createSettlementCoreCp438P05ImplementationSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp438P05ImplementationSliceDescriptor") errors.push("CP00-438 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_foundation_descriptor !== "SettlementCoreCp437P04CloseoutP05FoundationDescriptor") {
    errors.push("CP00-438 source p04 closeout p05 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP438_REQUIREMENTS.required_section_rows).length) errors.push("CP00-438 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP438_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-438 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-438 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-438 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-438 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-438 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-438 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-438 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-438 must not promote Claude");
  if (SETTLEMENT_CORE_CP438_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-438 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-438 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-438 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-438 contract current_pack drift");
  }
  if (
    contractProjection?.p05_implementation_slice_descriptor?.descriptor &&
    contractProjection.p05_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-438 contract p05_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP438_PACK_BINDING.next_pack_id) errors.push("CP00-438 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP438_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-438 next subphase drift");
  }
  return freezeCp438Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp438HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp438P05ImplementationSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp438Coverage(planPack);
  const slice = validateSettlementCoreCp438P05ImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp438Validation({
    evidence_packet: "H14.CP00-438.settlement_core_p05_implementation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP438_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_closeout_p05_foundation_pack_id: SETTLEMENT_CORE_CP438_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP438_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP438_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP438_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp438ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp438Coverage(planPack);
  const slice = validateSettlementCoreCp438P05ImplementationSliceDescriptor(createSettlementCoreCp438P05ImplementationSliceDescriptor(), {});
  return freezeCp438Validation({
    review_packet: "C14.CP00-438.settlement_core_p05_implementation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP438_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP438_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_implementation_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP438_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-438 cover exactly the 40 planned RP14 units from RP14.P05.M02.S10 through RP14.P05.M04.S07?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-438 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp438CloseoutHandoff() {
  return freezeCp438Validation({
    handoff_id: "CP00-438-to-CP00-439",
    from_pack_id: SETTLEMENT_CORE_CP438_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP438_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP438_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP438_PACK_BINDING.range,
    open_scope: "Continue RP14.P05.M04.S08 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP438_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp439Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp439CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp439Validation({
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

export function validateSettlementCoreCp439Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-439 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-439");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP439_PACK_BINDING.risk_class) errors.push("CP00-439 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP439_PACK_BINDING.unit_count) errors.push("CP00-439 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP439_PACK_BINDING.first_unit_id) errors.push("CP00-439 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP439_PACK_BINDING.last_unit_id) errors.push("CP00-439 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-439 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-439 must only include RP14 units");
  const summary = createSettlementCoreCp439CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-439 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-439 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-439 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-439 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-439 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-439 ${microId} missing row ${title}`);
    }
  }
  return freezeCp439Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(
  descriptor = createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_workflow_permission_slice_case_set ?? createSettlementCoreCp439P05WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp439P05WorkflowPermissionSliceDescriptor") errors.push("CP00-439 descriptor type drift");
  if (descriptor.source_p05_implementation_slice_descriptor !== "SettlementCoreCp438P05ImplementationSliceDescriptor") {
    errors.push("CP00-439 source p05 implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP439_REQUIREMENTS.required_section_rows).length) errors.push("CP00-439 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP439_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-439 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-439 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-439 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-439 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-439 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-439 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-439 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-439 must not promote Claude");
  if (SETTLEMENT_CORE_CP439_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-439 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-439 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-439 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-439 contract current_pack drift");
  }
  if (
    contractProjection?.p05_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p05_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-439 contract p05_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP439_PACK_BINDING.next_pack_id) errors.push("CP00-439 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP439_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-439 next subphase drift");
  }
  return freezeCp439Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp439HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp439Coverage(planPack);
  const slice = validateSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp439Validation({
    evidence_packet: "H14.CP00-439.settlement_core_p05_workflow_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP439_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_implementation_slice_pack_id: SETTLEMENT_CORE_CP439_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP439_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP439_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP439_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp439ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp439Coverage(planPack);
  const slice = validateSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(createSettlementCoreCp439P05WorkflowPermissionSliceDescriptor(), {});
  return freezeCp439Validation({
    review_packet: "C14.CP00-439.settlement_core_p05_workflow_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP439_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP439_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP439_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-439 cover exactly the 40 planned RP14 units from RP14.P05.M04.S08 through RP14.P05.M06.S03?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-439 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp439CloseoutHandoff() {
  return freezeCp439Validation({
    handoff_id: "CP00-439-to-CP00-440",
    from_pack_id: SETTLEMENT_CORE_CP439_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP439_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP439_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP439_PACK_BINDING.range,
    open_scope: "Continue RP14.P05.M06.S04 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP439_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp440Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp440CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp440Validation({
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

export function validateSettlementCoreCp440Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-440 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-440");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP440_PACK_BINDING.risk_class) errors.push("CP00-440 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP440_PACK_BINDING.unit_count) errors.push("CP00-440 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP440_PACK_BINDING.first_unit_id) errors.push("CP00-440 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP440_PACK_BINDING.last_unit_id) errors.push("CP00-440 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-440 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-440 must only include RP14 units");
  const summary = createSettlementCoreCp440CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-440 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-440 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-440 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-440 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-440 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-440 ${microId} missing row ${title}`);
    }
  }
  return freezeCp440Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp440P05CloseoutP06FoundationDescriptor(
  descriptor = createSettlementCoreCp440P05CloseoutP06FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_foundation_case_set ?? createSettlementCoreCp440P05CloseoutP06FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp440P05CloseoutP06FoundationDescriptor") errors.push("CP00-440 descriptor type drift");
  if (descriptor.source_p05_workflow_permission_slice_descriptor !== "SettlementCoreCp439P05WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-440 source p05 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP440_REQUIREMENTS.required_section_rows).length) errors.push("CP00-440 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP440_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-440 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-440 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-440 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-440 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-440 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-440 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-440 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-440 must not promote Claude");
  if (SETTLEMENT_CORE_CP440_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-440 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-440 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-440 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-440 contract current_pack drift");
  }
  if (
    contractProjection?.p05_closeout_p06_foundation_descriptor?.descriptor &&
    contractProjection.p05_closeout_p06_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-440 contract p05_closeout_p06_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP440_PACK_BINDING.next_pack_id) errors.push("CP00-440 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP440_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-440 next subphase drift");
  }
  return freezeCp440Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp440HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp440P05CloseoutP06FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp440Coverage(planPack);
  const slice = validateSettlementCoreCp440P05CloseoutP06FoundationDescriptor(descriptor, contractProjection);
  return freezeCp440Validation({
    evidence_packet: "H14.CP00-440.settlement_core_p05_closeout_p06_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP440_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_closeout_p06_foundation_valid: slice.valid,
    no_real_data: true,
    source_p05_workflow_permission_slice_pack_id: SETTLEMENT_CORE_CP440_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP440_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP440_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP440_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp440ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp440Coverage(planPack);
  const slice = validateSettlementCoreCp440P05CloseoutP06FoundationDescriptor(createSettlementCoreCp440P05CloseoutP06FoundationDescriptor(), {});
  return freezeCp440Validation({
    review_packet: "C14.CP00-440.settlement_core_p05_closeout_p06_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP440_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP440_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_closeout_p06_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP440_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-440 cover exactly the 150 planned RP14 units from RP14.P05.M06.S04 through RP14.P06.M03.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-440 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp440CloseoutHandoff() {
  return freezeCp440Validation({
    handoff_id: "CP00-440-to-CP00-441",
    from_pack_id: SETTLEMENT_CORE_CP440_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP440_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP440_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP440_PACK_BINDING.range,
    open_scope: "Continue RP14.P06.M03.S03 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP440_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp441Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp441CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp441Validation({
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

export function validateSettlementCoreCp441Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-441 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-441");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP441_PACK_BINDING.risk_class) errors.push("CP00-441 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP441_PACK_BINDING.unit_count) errors.push("CP00-441 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP441_PACK_BINDING.first_unit_id) errors.push("CP00-441 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP441_PACK_BINDING.last_unit_id) errors.push("CP00-441 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-441 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-441 must only include RP14 units");
  const summary = createSettlementCoreCp441CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-441 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-441 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-441 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-441 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-441 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-441 ${microId} missing row ${title}`);
    }
  }
  return freezeCp441Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(
  descriptor = createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_implementation_workflow_slice_case_set ?? createSettlementCoreCp441P06ImplementationWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp441P06ImplementationWorkflowSliceDescriptor") errors.push("CP00-441 descriptor type drift");
  if (descriptor.source_p05_closeout_p06_foundation_descriptor !== "SettlementCoreCp440P05CloseoutP06FoundationDescriptor") {
    errors.push("CP00-441 source p05 closeout p06 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP441_REQUIREMENTS.required_section_rows).length) errors.push("CP00-441 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP441_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-441 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-441 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-441 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-441 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-441 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-441 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-441 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-441 must not promote Claude");
  if (SETTLEMENT_CORE_CP441_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-441 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-441 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-441 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-441 contract current_pack drift");
  }
  if (
    contractProjection?.p06_implementation_workflow_slice_descriptor?.descriptor &&
    contractProjection.p06_implementation_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-441 contract p06_implementation_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP441_PACK_BINDING.next_pack_id) errors.push("CP00-441 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP441_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-441 next subphase drift");
  }
  return freezeCp441Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp441HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp441Coverage(planPack);
  const slice = validateSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp441Validation({
    evidence_packet: "H14.CP00-441.settlement_core_p06_implementation_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP441_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_implementation_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_closeout_p06_foundation_pack_id: SETTLEMENT_CORE_CP441_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP441_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP441_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP441_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp441ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp441Coverage(planPack);
  const slice = validateSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(createSettlementCoreCp441P06ImplementationWorkflowSliceDescriptor(), {});
  return freezeCp441Validation({
    review_packet: "C14.CP00-441.settlement_core_p06_implementation_workflow_slice_descriptor",
    gate: SETTLEMENT_CORE_CP441_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP441_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_implementation_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP441_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-441 cover exactly the 40 planned RP14 units from RP14.P06.M03.S03 through RP14.P06.M04.S20?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-441 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp441CloseoutHandoff() {
  return freezeCp441Validation({
    handoff_id: "CP00-441-to-CP00-442",
    from_pack_id: SETTLEMENT_CORE_CP441_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP441_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP441_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP441_PACK_BINDING.range,
    open_scope: "Continue RP14.P06.M04.S21 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP441_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp442Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp442CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp442Validation({
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

export function validateSettlementCoreCp442Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-442 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-442");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP442_PACK_BINDING.risk_class) errors.push("CP00-442 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP442_PACK_BINDING.unit_count) errors.push("CP00-442 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP442_PACK_BINDING.first_unit_id) errors.push("CP00-442 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP442_PACK_BINDING.last_unit_id) errors.push("CP00-442 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-442 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-442 must only include RP14 units");
  const summary = createSettlementCoreCp442CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-442 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-442 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-442 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-442 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-442 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-442 ${microId} missing row ${title}`);
    }
  }
  return freezeCp442Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(
  descriptor = createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_workflow_permission_slice_case_set ?? createSettlementCoreCp442P06WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp442P06WorkflowPermissionSliceDescriptor") errors.push("CP00-442 descriptor type drift");
  if (descriptor.source_p06_implementation_workflow_slice_descriptor !== "SettlementCoreCp441P06ImplementationWorkflowSliceDescriptor") {
    errors.push("CP00-442 source p06 implementation workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP442_REQUIREMENTS.required_section_rows).length) errors.push("CP00-442 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP442_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-442 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-442 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-442 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-442 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-442 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-442 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-442 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-442 must not promote Claude");
  if (SETTLEMENT_CORE_CP442_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-442 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-442 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-442 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-442 contract current_pack drift");
  }
  if (
    contractProjection?.p06_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p06_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-442 contract p06_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP442_PACK_BINDING.next_pack_id) errors.push("CP00-442 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP442_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-442 next subphase drift");
  }
  return freezeCp442Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp442HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp442Coverage(planPack);
  const slice = validateSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp442Validation({
    evidence_packet: "H14.CP00-442.settlement_core_p06_workflow_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP442_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_implementation_workflow_slice_pack_id: SETTLEMENT_CORE_CP442_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP442_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP442_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP442_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp442ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp442Coverage(planPack);
  const slice = validateSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(createSettlementCoreCp442P06WorkflowPermissionSliceDescriptor(), {});
  return freezeCp442Validation({
    review_packet: "C14.CP00-442.settlement_core_p06_workflow_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP442_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP442_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP442_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-442 cover exactly the 10 planned RP14 units from RP14.P06.M04.S21 through RP14.P06.M05.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-442 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp442CloseoutHandoff() {
  return freezeCp442Validation({
    handoff_id: "CP00-442-to-CP00-443",
    from_pack_id: SETTLEMENT_CORE_CP442_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP442_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP442_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP442_PACK_BINDING.range,
    open_scope: "Continue RP14.P06.M05.S09 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP442_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp443Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp443CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp443Validation({
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

export function validateSettlementCoreCp443Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-443 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-443");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP443_PACK_BINDING.risk_class) errors.push("CP00-443 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP443_PACK_BINDING.unit_count) errors.push("CP00-443 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP443_PACK_BINDING.first_unit_id) errors.push("CP00-443 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP443_PACK_BINDING.last_unit_id) errors.push("CP00-443 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-443 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-443 must only include RP14 units");
  const summary = createSettlementCoreCp443CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-443 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-443 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-443 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-443 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-443 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-443 ${microId} missing row ${title}`);
    }
  }
  return freezeCp443Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp443P06PermissionSliceDescriptor(
  descriptor = createSettlementCoreCp443P06PermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_permission_slice_case_set ?? createSettlementCoreCp443P06PermissionSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp443P06PermissionSliceDescriptor") errors.push("CP00-443 descriptor type drift");
  if (descriptor.source_p06_workflow_permission_slice_descriptor !== "SettlementCoreCp442P06WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-443 source p06 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP443_REQUIREMENTS.required_section_rows).length) errors.push("CP00-443 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP443_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-443 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-443 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-443 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-443 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-443 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-443 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-443 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-443 must not promote Claude");
  if (SETTLEMENT_CORE_CP443_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-443 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-443 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-443 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-443 contract current_pack drift");
  }
  if (
    contractProjection?.p06_permission_slice_descriptor?.descriptor &&
    contractProjection.p06_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-443 contract p06_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP443_PACK_BINDING.next_pack_id) errors.push("CP00-443 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP443_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-443 next subphase drift");
  }
  return freezeCp443Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp443HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp443P06PermissionSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp443Coverage(planPack);
  const slice = validateSettlementCoreCp443P06PermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp443Validation({
    evidence_packet: "H14.CP00-443.settlement_core_p06_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP443_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_workflow_permission_slice_pack_id: SETTLEMENT_CORE_CP443_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP443_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP443_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP443_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp443ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp443Coverage(planPack);
  const slice = validateSettlementCoreCp443P06PermissionSliceDescriptor(createSettlementCoreCp443P06PermissionSliceDescriptor(), {});
  return freezeCp443Validation({
    review_packet: "C14.CP00-443.settlement_core_p06_permission_slice_descriptor",
    gate: SETTLEMENT_CORE_CP443_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP443_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_permission_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP443_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-443 cover exactly the 10 planned RP14 units from RP14.P06.M05.S09 through RP14.P06.M05.S18?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-443 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp443CloseoutHandoff() {
  return freezeCp443Validation({
    handoff_id: "CP00-443-to-CP00-444",
    from_pack_id: SETTLEMENT_CORE_CP443_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP443_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP443_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP443_PACK_BINDING.range,
    open_scope: "Continue RP14.P06.M05.S19 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP443_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp444Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp444CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp444Validation({
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

export function validateSettlementCoreCp444Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-444 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-444");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP444_PACK_BINDING.risk_class) errors.push("CP00-444 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP444_PACK_BINDING.unit_count) errors.push("CP00-444 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP444_PACK_BINDING.first_unit_id) errors.push("CP00-444 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP444_PACK_BINDING.last_unit_id) errors.push("CP00-444 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-444 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-444 must only include RP14 units");
  const summary = createSettlementCoreCp444CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-444 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-444 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-444 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-444 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-444 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-444 ${microId} missing row ${title}`);
    }
  }
  return freezeCp444Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp444P06PermissionFixtureSliceDescriptor(
  descriptor = createSettlementCoreCp444P06PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_permission_fixture_slice_case_set ?? createSettlementCoreCp444P06PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp444P06PermissionFixtureSliceDescriptor") errors.push("CP00-444 descriptor type drift");
  if (descriptor.source_p06_permission_slice_descriptor !== "SettlementCoreCp443P06PermissionSliceDescriptor") {
    errors.push("CP00-444 source p06 permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP444_REQUIREMENTS.required_section_rows).length) errors.push("CP00-444 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP444_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-444 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-444 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-444 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-444 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-444 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-444 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-444 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-444 must not promote Claude");
  if (SETTLEMENT_CORE_CP444_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-444 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-444 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-444 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-444 contract current_pack drift");
  }
  if (
    contractProjection?.p06_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p06_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-444 contract p06_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP444_PACK_BINDING.next_pack_id) errors.push("CP00-444 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP444_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-444 next subphase drift");
  }
  return freezeCp444Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp444HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp444P06PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp444Coverage(planPack);
  const slice = validateSettlementCoreCp444P06PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp444Validation({
    evidence_packet: "H14.CP00-444.settlement_core_p06_permission_fixture_slice_descriptor",
    gate: SETTLEMENT_CORE_CP444_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_permission_slice_pack_id: SETTLEMENT_CORE_CP444_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP444_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP444_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP444_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp444ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp444Coverage(planPack);
  const slice = validateSettlementCoreCp444P06PermissionFixtureSliceDescriptor(createSettlementCoreCp444P06PermissionFixtureSliceDescriptor(), {});
  return freezeCp444Validation({
    review_packet: "C14.CP00-444.settlement_core_p06_permission_fixture_slice_descriptor",
    gate: SETTLEMENT_CORE_CP444_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP444_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP444_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-444 cover exactly the 10 planned RP14 units from RP14.P06.M05.S19 through RP14.P06.M06.S06?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-444 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp444CloseoutHandoff() {
  return freezeCp444Validation({
    handoff_id: "CP00-444-to-CP00-445",
    from_pack_id: SETTLEMENT_CORE_CP444_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP444_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP444_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP444_PACK_BINDING.range,
    open_scope: "Continue RP14.P06.M06.S07 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP444_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp445Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp445CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp445Validation({
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

export function validateSettlementCoreCp445Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-445 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-445");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP445_PACK_BINDING.risk_class) errors.push("CP00-445 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP445_PACK_BINDING.unit_count) errors.push("CP00-445 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP445_PACK_BINDING.first_unit_id) errors.push("CP00-445 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP445_PACK_BINDING.last_unit_id) errors.push("CP00-445 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-445 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-445 must only include RP14 units");
  const summary = createSettlementCoreCp445CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-445 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-445 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-445 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-445 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-445 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-445 ${microId} missing row ${title}`);
    }
  }
  return freezeCp445Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp445P06CloseoutP07FoundationDescriptor(
  descriptor = createSettlementCoreCp445P06CloseoutP07FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_foundation_case_set ?? createSettlementCoreCp445P06CloseoutP07FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp445P06CloseoutP07FoundationDescriptor") errors.push("CP00-445 descriptor type drift");
  if (descriptor.source_p06_permission_fixture_slice_descriptor !== "SettlementCoreCp444P06PermissionFixtureSliceDescriptor") {
    errors.push("CP00-445 source p06 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP445_REQUIREMENTS.required_section_rows).length) errors.push("CP00-445 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP445_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-445 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-445 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-445 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-445 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-445 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-445 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-445 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-445 must not promote Claude");
  if (SETTLEMENT_CORE_CP445_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-445 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-445 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-445 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-445 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-445 contract p06_closeout_p07_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP445_PACK_BINDING.next_pack_id) errors.push("CP00-445 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP445_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-445 next subphase drift");
  }
  return freezeCp445Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp445HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp445P06CloseoutP07FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp445Coverage(planPack);
  const slice = validateSettlementCoreCp445P06CloseoutP07FoundationDescriptor(descriptor, contractProjection);
  return freezeCp445Validation({
    evidence_packet: "H14.CP00-445.settlement_core_p06_closeout_p07_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP445_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_foundation_valid: slice.valid,
    no_real_data: true,
    source_p06_permission_fixture_slice_pack_id: SETTLEMENT_CORE_CP445_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP445_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP445_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP445_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp445ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp445Coverage(planPack);
  const slice = validateSettlementCoreCp445P06CloseoutP07FoundationDescriptor(createSettlementCoreCp445P06CloseoutP07FoundationDescriptor(), {});
  return freezeCp445Validation({
    review_packet: "C14.CP00-445.settlement_core_p06_closeout_p07_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP445_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP445_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP445_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-445 cover exactly the 150 planned RP14 units from RP14.P06.M06.S07 through RP14.P07.M02.S15?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-445 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp445CloseoutHandoff() {
  return freezeCp445Validation({
    handoff_id: "CP00-445-to-CP00-446",
    from_pack_id: SETTLEMENT_CORE_CP445_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP445_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP445_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP445_PACK_BINDING.range,
    open_scope: "Continue RP14.P07.M02.S16 onward with the remaining type and shape rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP445_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp446Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp446CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp446Validation({
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

export function validateSettlementCoreCp446Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-446 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-446");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP446_PACK_BINDING.risk_class) errors.push("CP00-446 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP446_PACK_BINDING.unit_count) errors.push("CP00-446 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP446_PACK_BINDING.first_unit_id) errors.push("CP00-446 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP446_PACK_BINDING.last_unit_id) errors.push("CP00-446 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-446 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-446 must only include RP14 units");
  const summary = createSettlementCoreCp446CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-446 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-446 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-446 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-446 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-446 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-446 ${microId} missing row ${title}`);
    }
  }
  return freezeCp446Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp446P07FoundationSliceDescriptor(
  descriptor = createSettlementCoreCp446P07FoundationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_foundation_slice_case_set ?? createSettlementCoreCp446P07FoundationSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp446P07FoundationSliceDescriptor") errors.push("CP00-446 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_foundation_descriptor !== "SettlementCoreCp445P06CloseoutP07FoundationDescriptor") {
    errors.push("CP00-446 source p06 closeout p07 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP446_REQUIREMENTS.required_section_rows).length) errors.push("CP00-446 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP446_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-446 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-446 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-446 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-446 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-446 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-446 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-446 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-446 must not promote Claude");
  if (SETTLEMENT_CORE_CP446_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-446 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-446 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-446 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-446 contract current_pack drift");
  }
  if (
    contractProjection?.p07_foundation_slice_descriptor?.descriptor &&
    contractProjection.p07_foundation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-446 contract p07_foundation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP446_PACK_BINDING.next_pack_id) errors.push("CP00-446 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP446_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-446 next subphase drift");
  }
  return freezeCp446Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp446HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp446P07FoundationSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp446Coverage(planPack);
  const slice = validateSettlementCoreCp446P07FoundationSliceDescriptor(descriptor, contractProjection);
  return freezeCp446Validation({
    evidence_packet: "H14.CP00-446.settlement_core_p07_foundation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP446_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_foundation_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_foundation_pack_id: SETTLEMENT_CORE_CP446_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP446_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP446_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP446_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp446ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp446Coverage(planPack);
  const slice = validateSettlementCoreCp446P07FoundationSliceDescriptor(createSettlementCoreCp446P07FoundationSliceDescriptor(), {});
  return freezeCp446Validation({
    review_packet: "C14.CP00-446.settlement_core_p07_foundation_slice_descriptor",
    gate: SETTLEMENT_CORE_CP446_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP446_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_foundation_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP446_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-446 cover exactly the 150 planned RP14 units from RP14.P07.M02.S16 through RP14.P07.M09.S11?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-446 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp446CloseoutHandoff() {
  return freezeCp446Validation({
    handoff_id: "CP00-446-to-CP00-447",
    from_pack_id: SETTLEMENT_CORE_CP446_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP446_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP446_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP446_PACK_BINDING.range,
    open_scope: "Continue RP14.P07.M09.S12 onward with the remaining Claude review rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP446_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp447Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp447CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp447Validation({
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

export function validateSettlementCoreCp447Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-447 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-447");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP447_PACK_BINDING.risk_class) errors.push("CP00-447 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP447_PACK_BINDING.unit_count) errors.push("CP00-447 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP447_PACK_BINDING.first_unit_id) errors.push("CP00-447 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP447_PACK_BINDING.last_unit_id) errors.push("CP00-447 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-447 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-447 must only include RP14 units");
  const summary = createSettlementCoreCp447CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-447 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-447 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-447 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-447 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-447 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-447 ${microId} missing row ${title}`);
    }
  }
  return freezeCp447Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp447P07CloseoutP08FoundationDescriptor(
  descriptor = createSettlementCoreCp447P07CloseoutP08FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_foundation_case_set ?? createSettlementCoreCp447P07CloseoutP08FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp447P07CloseoutP08FoundationDescriptor") errors.push("CP00-447 descriptor type drift");
  if (descriptor.source_p07_foundation_slice_descriptor !== "SettlementCoreCp446P07FoundationSliceDescriptor") {
    errors.push("CP00-447 source p07 foundation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP447_REQUIREMENTS.required_section_rows).length) errors.push("CP00-447 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP447_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-447 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-447 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-447 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-447 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-447 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-447 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-447 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-447 must not promote Claude");
  if (SETTLEMENT_CORE_CP447_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-447 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-447 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-447 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-447 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-447 contract p07_closeout_p08_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP447_PACK_BINDING.next_pack_id) errors.push("CP00-447 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP447_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-447 next subphase drift");
  }
  return freezeCp447Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp447HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp447P07CloseoutP08FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp447Coverage(planPack);
  const slice = validateSettlementCoreCp447P07CloseoutP08FoundationDescriptor(descriptor, contractProjection);
  return freezeCp447Validation({
    evidence_packet: "H14.CP00-447.settlement_core_p07_closeout_p08_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP447_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_foundation_valid: slice.valid,
    no_real_data: true,
    source_p07_foundation_slice_pack_id: SETTLEMENT_CORE_CP447_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP447_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP447_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP447_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp447ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp447Coverage(planPack);
  const slice = validateSettlementCoreCp447P07CloseoutP08FoundationDescriptor(createSettlementCoreCp447P07CloseoutP08FoundationDescriptor(), {});
  return freezeCp447Validation({
    review_packet: "C14.CP00-447.settlement_core_p07_closeout_p08_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP447_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP447_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP447_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-447 cover exactly the 150 planned RP14 units from RP14.P07.M09.S12 through RP14.P08.M06.S13?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-447 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp447CloseoutHandoff() {
  return freezeCp447Validation({
    handoff_id: "CP00-447-to-CP00-448",
    from_pack_id: SETTLEMENT_CORE_CP447_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP447_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP447_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP447_PACK_BINDING.range,
    open_scope: "Continue RP14.P08.M06.S14 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP447_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp448Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp448CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp448Validation({
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

export function validateSettlementCoreCp448Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-448 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-448");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP448_PACK_BINDING.risk_class) errors.push("CP00-448 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP448_PACK_BINDING.unit_count) errors.push("CP00-448 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP448_PACK_BINDING.first_unit_id) errors.push("CP00-448 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP448_PACK_BINDING.last_unit_id) errors.push("CP00-448 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-448 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-448 must only include RP14 units");
  const summary = createSettlementCoreCp448CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-448 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-448 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-448 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-448 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-448 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-448 ${microId} missing row ${title}`);
    }
  }
  return freezeCp448Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp448P08FixtureTestSliceDescriptor(
  descriptor = createSettlementCoreCp448P08FixtureTestSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_fixture_test_slice_case_set ?? createSettlementCoreCp448P08FixtureTestSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp448P08FixtureTestSliceDescriptor") errors.push("CP00-448 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_foundation_descriptor !== "SettlementCoreCp447P07CloseoutP08FoundationDescriptor") {
    errors.push("CP00-448 source p07 closeout p08 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP448_REQUIREMENTS.required_section_rows).length) errors.push("CP00-448 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP448_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-448 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-448 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-448 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-448 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-448 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-448 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-448 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-448 must not promote Claude");
  if (SETTLEMENT_CORE_CP448_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-448 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-448 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-448 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-448 contract current_pack drift");
  }
  if (
    contractProjection?.p08_fixture_test_slice_descriptor?.descriptor &&
    contractProjection.p08_fixture_test_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-448 contract p08_fixture_test_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP448_PACK_BINDING.next_pack_id) errors.push("CP00-448 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP448_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-448 next subphase drift");
  }
  return freezeCp448Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp448HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp448P08FixtureTestSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp448Coverage(planPack);
  const slice = validateSettlementCoreCp448P08FixtureTestSliceDescriptor(descriptor, contractProjection);
  return freezeCp448Validation({
    evidence_packet: "H14.CP00-448.settlement_core_p08_fixture_test_slice_descriptor",
    gate: SETTLEMENT_CORE_CP448_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_fixture_test_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_closeout_p08_foundation_pack_id: SETTLEMENT_CORE_CP448_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP448_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP448_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP448_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp448ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp448Coverage(planPack);
  const slice = validateSettlementCoreCp448P08FixtureTestSliceDescriptor(createSettlementCoreCp448P08FixtureTestSliceDescriptor(), {});
  return freezeCp448Validation({
    review_packet: "C14.CP00-448.settlement_core_p08_fixture_test_slice_descriptor",
    gate: SETTLEMENT_CORE_CP448_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP448_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_fixture_test_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP448_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-448 cover exactly the 10 planned RP14 units from RP14.P08.M06.S14 through RP14.P08.M07.S01?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-448 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp448CloseoutHandoff() {
  return freezeCp448Validation({
    handoff_id: "CP00-448-to-CP00-449",
    from_pack_id: SETTLEMENT_CORE_CP448_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP448_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP448_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP448_PACK_BINDING.range,
    open_scope: "Continue RP14.P08.M07.S02 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP448_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp449Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp449CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp449Validation({
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

export function validateSettlementCoreCp449Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-449 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-449");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP449_PACK_BINDING.risk_class) errors.push("CP00-449 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP449_PACK_BINDING.unit_count) errors.push("CP00-449 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP449_PACK_BINDING.first_unit_id) errors.push("CP00-449 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP449_PACK_BINDING.last_unit_id) errors.push("CP00-449 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-449 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-449 must only include RP14 units");
  const summary = createSettlementCoreCp449CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-449 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-449 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-449 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-449 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-449 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-449 ${microId} missing row ${title}`);
    }
  }
  return freezeCp449Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp449P08TestHermesSliceDescriptor(
  descriptor = createSettlementCoreCp449P08TestHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_test_hermes_slice_case_set ?? createSettlementCoreCp449P08TestHermesSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp449P08TestHermesSliceDescriptor") errors.push("CP00-449 descriptor type drift");
  if (descriptor.source_p08_fixture_test_slice_descriptor !== "SettlementCoreCp448P08FixtureTestSliceDescriptor") {
    errors.push("CP00-449 source p08 fixture test slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP449_REQUIREMENTS.required_section_rows).length) errors.push("CP00-449 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP449_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-449 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-449 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-449 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-449 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-449 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-449 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-449 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-449 must not promote Claude");
  if (SETTLEMENT_CORE_CP449_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-449 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-449 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-449 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-449 contract current_pack drift");
  }
  if (
    contractProjection?.p08_test_hermes_slice_descriptor?.descriptor &&
    contractProjection.p08_test_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-449 contract p08_test_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP449_PACK_BINDING.next_pack_id) errors.push("CP00-449 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP449_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-449 next subphase drift");
  }
  return freezeCp449Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp449HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp449P08TestHermesSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp449Coverage(planPack);
  const slice = validateSettlementCoreCp449P08TestHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp449Validation({
    evidence_packet: "H14.CP00-449.settlement_core_p08_test_hermes_slice_descriptor",
    gate: SETTLEMENT_CORE_CP449_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_test_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_fixture_test_slice_pack_id: SETTLEMENT_CORE_CP449_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP449_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP449_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP449_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp449ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp449Coverage(planPack);
  const slice = validateSettlementCoreCp449P08TestHermesSliceDescriptor(createSettlementCoreCp449P08TestHermesSliceDescriptor(), {});
  return freezeCp449Validation({
    review_packet: "C14.CP00-449.settlement_core_p08_test_hermes_slice_descriptor",
    gate: SETTLEMENT_CORE_CP449_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP449_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_test_hermes_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP449_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-449 cover exactly the 40 planned RP14 units from RP14.P08.M07.S02 through RP14.P08.M08.S19?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-449 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp449CloseoutHandoff() {
  return freezeCp449Validation({
    handoff_id: "CP00-449-to-CP00-450",
    from_pack_id: SETTLEMENT_CORE_CP449_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP449_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP449_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP449_PACK_BINDING.range,
    open_scope: "Continue RP14.P08.M08.S20 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP449_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp450Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp450CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp450Validation({
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

export function validateSettlementCoreCp450Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-450 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-450");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP450_PACK_BINDING.risk_class) errors.push("CP00-450 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP450_PACK_BINDING.unit_count) errors.push("CP00-450 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP450_PACK_BINDING.first_unit_id) errors.push("CP00-450 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP450_PACK_BINDING.last_unit_id) errors.push("CP00-450 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-450 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-450 must only include RP14 units");
  const summary = createSettlementCoreCp450CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-450 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-450 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-450 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-450 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-450 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-450 ${microId} missing row ${title}`);
    }
  }
  return freezeCp450Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp450P08CloseoutP09FoundationDescriptor(
  descriptor = createSettlementCoreCp450P08CloseoutP09FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_foundation_case_set ?? createSettlementCoreCp450P08CloseoutP09FoundationCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp450P08CloseoutP09FoundationDescriptor") errors.push("CP00-450 descriptor type drift");
  if (descriptor.source_p08_test_hermes_slice_descriptor !== "SettlementCoreCp449P08TestHermesSliceDescriptor") {
    errors.push("CP00-450 source p08 test hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP450_REQUIREMENTS.required_section_rows).length) errors.push("CP00-450 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP450_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-450 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-450 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-450 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-450 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-450 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-450 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-450 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-450 must not promote Claude");
  if (SETTLEMENT_CORE_CP450_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-450 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-450 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-450 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-450 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-450 contract p08_closeout_p09_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP450_PACK_BINDING.next_pack_id) errors.push("CP00-450 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP450_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-450 next subphase drift");
  }
  return freezeCp450Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp450HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp450P08CloseoutP09FoundationDescriptor(),
) {
  const coverage = validateSettlementCoreCp450Coverage(planPack);
  const slice = validateSettlementCoreCp450P08CloseoutP09FoundationDescriptor(descriptor, contractProjection);
  return freezeCp450Validation({
    evidence_packet: "H14.CP00-450.settlement_core_p08_closeout_p09_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP450_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_foundation_valid: slice.valid,
    no_real_data: true,
    source_p08_test_hermes_slice_pack_id: SETTLEMENT_CORE_CP450_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP450_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP450_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP450_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp450ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp450Coverage(planPack);
  const slice = validateSettlementCoreCp450P08CloseoutP09FoundationDescriptor(createSettlementCoreCp450P08CloseoutP09FoundationDescriptor(), {});
  return freezeCp450Validation({
    review_packet: "C14.CP00-450.settlement_core_p08_closeout_p09_foundation_descriptor",
    gate: SETTLEMENT_CORE_CP450_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP450_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_foundation_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP450_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-450 cover exactly the 150 planned RP14 units from RP14.P08.M08.S20 through RP14.P09.M07.S09?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-450 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp450CloseoutHandoff() {
  return freezeCp450Validation({
    handoff_id: "CP00-450-to-CP00-451",
    from_pack_id: SETTLEMENT_CORE_CP450_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP450_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP450_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP450_PACK_BINDING.range,
    open_scope: "Continue RP14.P09.M07.S10 onward with the remaining test and golden case rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP450_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp451Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp451CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp451Validation({
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

export function validateSettlementCoreCp451Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-451 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-451");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP451_PACK_BINDING.risk_class) errors.push("CP00-451 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP451_PACK_BINDING.unit_count) errors.push("CP00-451 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP451_PACK_BINDING.first_unit_id) errors.push("CP00-451 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP451_PACK_BINDING.last_unit_id) errors.push("CP00-451 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-451 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-451 must only include RP14 units");
  const summary = createSettlementCoreCp451CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-451 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-451 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-451 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-451 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-451 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-451 ${microId} missing row ${title}`);
    }
  }
  return freezeCp451Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp451P09TestHermesSliceDescriptor(
  descriptor = createSettlementCoreCp451P09TestHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_test_hermes_slice_case_set ?? createSettlementCoreCp451P09TestHermesSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp451P09TestHermesSliceDescriptor") errors.push("CP00-451 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_foundation_descriptor !== "SettlementCoreCp450P08CloseoutP09FoundationDescriptor") {
    errors.push("CP00-451 source p08 closeout p09 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP451_REQUIREMENTS.required_section_rows).length) errors.push("CP00-451 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP451_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-451 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-451 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-451 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-451 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-451 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-451 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-451 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-451 must not promote Claude");
  if (SETTLEMENT_CORE_CP451_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-451 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-451 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-451 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id, SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-451 contract current_pack drift");
  }
  if (
    contractProjection?.p09_test_hermes_slice_descriptor?.descriptor &&
    contractProjection.p09_test_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-451 contract p09_test_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP451_PACK_BINDING.next_pack_id) errors.push("CP00-451 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP451_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-451 next subphase drift");
  }
  return freezeCp451Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp451HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp451P09TestHermesSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp451Coverage(planPack);
  const slice = validateSettlementCoreCp451P09TestHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp451Validation({
    evidence_packet: "H14.CP00-451.settlement_core_p09_test_hermes_slice_descriptor",
    gate: SETTLEMENT_CORE_CP451_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_test_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_foundation_pack_id: SETTLEMENT_CORE_CP451_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP451_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP451_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP451_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp451ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp451Coverage(planPack);
  const slice = validateSettlementCoreCp451P09TestHermesSliceDescriptor(createSettlementCoreCp451P09TestHermesSliceDescriptor(), {});
  return freezeCp451Validation({
    review_packet: "C14.CP00-451.settlement_core_p09_test_hermes_slice_descriptor",
    gate: SETTLEMENT_CORE_CP451_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP451_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_test_hermes_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP451_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-451 cover exactly the 40 planned RP14 units from RP14.P09.M07.S10 through RP14.P09.M09.S07?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-451 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp451CloseoutHandoff() {
  return freezeCp451Validation({
    handoff_id: "CP00-451-to-CP00-452",
    from_pack_id: SETTLEMENT_CORE_CP451_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP451_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP451_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP451_PACK_BINDING.range,
    open_scope: "Continue RP14.P09.M09.S08 onward with the remaining Claude review rows and downstream micros while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP451_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp452Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id,
    no_write_attestation: SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION,
  });
}

export function createSettlementCoreCp452CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp452Validation({
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

export function validateSettlementCoreCp452Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-452 plan pack is required");
  if (planPack?.pack_id !== SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-452");
  if (planPack?.risk_class !== SETTLEMENT_CORE_CP452_PACK_BINDING.risk_class) errors.push("CP00-452 risk class drift");
  if (planPack?.unit_count !== SETTLEMENT_CORE_CP452_PACK_BINDING.unit_count) errors.push("CP00-452 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SETTLEMENT_CORE_CP452_PACK_BINDING.first_unit_id) errors.push("CP00-452 first unit drift");
  if (unitIds.at(-1) !== SETTLEMENT_CORE_CP452_PACK_BINDING.last_unit_id) errors.push("CP00-452 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-452 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP14")) errors.push("CP00-452 must only include RP14 units");
  const summary = createSettlementCoreCp452CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-452 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-452 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-452 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-452 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-452 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-452 ${microId} missing row ${title}`);
    }
  }
  return freezeCp452Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(
  descriptor = createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_review_closeout_slice_case_set ?? createSettlementCoreCp452P09ReviewCloseoutSliceCaseSet();
  if (descriptor.descriptor !== "SettlementCoreCp452P09ReviewCloseoutSliceDescriptor") errors.push("CP00-452 descriptor type drift");
  if (descriptor.source_p09_test_hermes_slice_descriptor !== "SettlementCoreCp451P09TestHermesSliceDescriptor") {
    errors.push("CP00-452 source p09 test hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SETTLEMENT_CORE_CP452_REQUIREMENTS.required_section_rows).length) errors.push("CP00-452 section count drift");
  for (const [microId, titles] of Object.entries(SETTLEMENT_CORE_CP452_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-452 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-452 ${microId} row count drift`);
    for (const title of titles) {
      const key = settlementCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-452 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-452 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-452 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-452 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-452 ${microId} ${key} must not include raw payload`);
    }
  }
  if (SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-452 must not promote Claude");
  if (SETTLEMENT_CORE_CP452_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-452 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-452 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-452 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id) {
    errors.push("CP00-452 contract current_pack drift");
  }
  if (
    contractProjection?.p09_review_closeout_slice_descriptor?.descriptor &&
    contractProjection.p09_review_closeout_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-452 contract p09_review_closeout_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SETTLEMENT_CORE_CP452_PACK_BINDING.next_pack_id) errors.push("CP00-452 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SETTLEMENT_CORE_CP452_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-452 next subphase drift");
  }
  return freezeCp452Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSettlementCoreCp452HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(),
) {
  const coverage = validateSettlementCoreCp452Coverage(planPack);
  const slice = validateSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(descriptor, contractProjection);
  return freezeCp452Validation({
    evidence_packet: "H14.CP00-452.settlement_core_p09_review_closeout_slice_descriptor",
    gate: SETTLEMENT_CORE_CP452_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_review_closeout_slice_valid: slice.valid,
    no_real_data: true,
    source_p09_test_hermes_slice_pack_id: SETTLEMENT_CORE_CP452_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SETTLEMENT_CORE_CP452_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SETTLEMENT_CORE_CP452_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP452_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSettlementCoreCp452ClaudeReviewPacket(planPack) {
  const coverage = validateSettlementCoreCp452Coverage(planPack);
  const slice = validateSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(createSettlementCoreCp452P09ReviewCloseoutSliceDescriptor(), {});
  return freezeCp452Validation({
    review_packet: "C14.CP00-452.settlement_core_p09_review_closeout_slice_descriptor",
    gate: SETTLEMENT_CORE_CP452_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SETTLEMENT_CORE_CP452_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_review_closeout_slice_valid: slice.valid,
    invalid_review_blockers: SETTLEMENT_CORE_CP452_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-452 cover exactly the 23 planned RP14 units from RP14.P09.M09.S08 through RP14.P09.M10.S10?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared settlement guards applied?",
      "Does CP00-452 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSettlementCoreCp452CloseoutHandoff() {
  return freezeCp452Validation({
    handoff_id: "CP00-452-to-CP00-453",
    from_pack_id: SETTLEMENT_CORE_CP452_PACK_BINDING.pack_id,
    to_pack_id: SETTLEMENT_CORE_CP452_PACK_BINDING.next_pack_id,
    next_subphase_id: SETTLEMENT_CORE_CP452_PACK_BINDING.next_subphase_id,
    closed_scope: SETTLEMENT_CORE_CP452_PACK_BINDING.range,
    open_scope: "Continue RP15.P00.M00.S01 onward with the next program while preserving descriptor-only settlement boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SETTLEMENT_CORE_CP452_PACK_BINDING.production_ready_flag,
  });
}
