import {
  ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP453_PACK_BINDING,
  ANALYTICS_CORE_CP453_REQUIREMENTS,
  ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP454_PACK_BINDING,
  ANALYTICS_CORE_CP454_REQUIREMENTS,
  ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP455_PACK_BINDING,
  ANALYTICS_CORE_CP455_REQUIREMENTS,
  ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP456_PACK_BINDING,
  ANALYTICS_CORE_CP456_REQUIREMENTS,
  ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP457_PACK_BINDING,
  ANALYTICS_CORE_CP457_REQUIREMENTS,
  ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP458_PACK_BINDING,
  ANALYTICS_CORE_CP458_REQUIREMENTS,
  ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP459_PACK_BINDING,
  ANALYTICS_CORE_CP459_REQUIREMENTS,
  ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP460_PACK_BINDING,
  ANALYTICS_CORE_CP460_REQUIREMENTS,
  ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP461_PACK_BINDING,
  ANALYTICS_CORE_CP461_REQUIREMENTS,
  ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP462_PACK_BINDING,
  ANALYTICS_CORE_CP462_REQUIREMENTS,
  ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP463_PACK_BINDING,
  ANALYTICS_CORE_CP463_REQUIREMENTS,
  ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP464_PACK_BINDING,
  ANALYTICS_CORE_CP464_REQUIREMENTS,
  ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP465_PACK_BINDING,
  ANALYTICS_CORE_CP465_REQUIREMENTS,
  ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP466_PACK_BINDING,
  ANALYTICS_CORE_CP466_REQUIREMENTS,
  ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP467_PACK_BINDING,
  ANALYTICS_CORE_CP467_REQUIREMENTS,
  ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP468_PACK_BINDING,
  ANALYTICS_CORE_CP468_REQUIREMENTS,
  ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP469_PACK_BINDING,
  ANALYTICS_CORE_CP469_REQUIREMENTS,
  ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP470_PACK_BINDING,
  ANALYTICS_CORE_CP470_REQUIREMENTS,
  ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP471_PACK_BINDING,
  ANALYTICS_CORE_CP471_REQUIREMENTS,
  ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP472_PACK_BINDING,
  ANALYTICS_CORE_CP472_REQUIREMENTS,
  ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP473_PACK_BINDING,
  ANALYTICS_CORE_CP473_REQUIREMENTS,
  ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP474_PACK_BINDING,
  ANALYTICS_CORE_CP474_REQUIREMENTS,
  ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP475_PACK_BINDING,
  ANALYTICS_CORE_CP475_REQUIREMENTS,
  ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP476_PACK_BINDING,
  ANALYTICS_CORE_CP476_REQUIREMENTS,
  ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP477_PACK_BINDING,
  ANALYTICS_CORE_CP477_REQUIREMENTS,
  ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP478_PACK_BINDING,
  ANALYTICS_CORE_CP478_REQUIREMENTS,
  ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION,
  ANALYTICS_CORE_CP479_PACK_BINDING,
  ANALYTICS_CORE_CP479_REQUIREMENTS,
} from "./registry.js";
import {
  createAnalyticsCoreCp453ScopeContractFoundationCaseSet,
  createAnalyticsCoreCp453ScopeContractFoundationDescriptor,
  createAnalyticsCoreCp454P01CloseoutP02FoundationCaseSet,
  createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor,
  createAnalyticsCoreCp455P02WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp456P02FixtureSliceCaseSet,
  createAnalyticsCoreCp456P02FixtureSliceDescriptor,
  createAnalyticsCoreCp457P02CloseoutP03FoundationCaseSet,
  createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor,
  createAnalyticsCoreCp458P03PermissionSliceCaseSet,
  createAnalyticsCoreCp458P03PermissionSliceDescriptor,
  createAnalyticsCoreCp459P03PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp460P03CloseoutP04FoundationCaseSet,
  createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor,
  createAnalyticsCoreCp461P04PermissionSliceCaseSet,
  createAnalyticsCoreCp461P04PermissionSliceDescriptor,
  createAnalyticsCoreCp462P04PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp463P04CloseoutP05FoundationCaseSet,
  createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor,
  createAnalyticsCoreCp464P05WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp465P05CloseoutP06FoundationCaseSet,
  createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor,
  createAnalyticsCoreCp466P06ImplementationWorkflowSliceCaseSet,
  createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor,
  createAnalyticsCoreCp467P06WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp468P06PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp469P06CloseoutP07FoundationCaseSet,
  createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor,
  createAnalyticsCoreCp470P07ImplementationSliceCaseSet,
  createAnalyticsCoreCp470P07ImplementationSliceDescriptor,
  createAnalyticsCoreCp471P07WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp472P07PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp473P07CloseoutP08FoundationCaseSet,
  createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor,
  createAnalyticsCoreCp474P08WorkflowPermissionSliceCaseSet,
  createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor,
  createAnalyticsCoreCp475P08PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp476P08FixtureSliceCaseSet,
  createAnalyticsCoreCp476P08FixtureSliceDescriptor,
  createAnalyticsCoreCp477P08CloseoutP09FoundationCaseSet,
  createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor,
  createAnalyticsCoreCp478P09PermissionFixtureSliceCaseSet,
  createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor,
  createAnalyticsCoreCp479P09CloseoutSliceCaseSet,
  createAnalyticsCoreCp479P09CloseoutSliceDescriptor,
  analyticsCoreRowKey,
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

function freezeCp453Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP453_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp453CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp453Validation({
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

export function validateAnalyticsCoreCp453Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-453 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP453_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-453");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP453_PACK_BINDING.risk_class) errors.push("CP00-453 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP453_PACK_BINDING.unit_count) errors.push("CP00-453 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP453_PACK_BINDING.first_unit_id) errors.push("CP00-453 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP453_PACK_BINDING.last_unit_id) errors.push("CP00-453 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-453 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-453 must only include RP15 units");
  const summary = createAnalyticsCoreCp453CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-453 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-453 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-453 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-453 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-453 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-453 ${microId} missing row ${title}`);
    }
  }
  return freezeCp453Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp453ScopeContractFoundationDescriptor(
  descriptor = createAnalyticsCoreCp453ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createAnalyticsCoreCp453ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp453ScopeContractFoundationDescriptor") errors.push("CP00-453 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP15") errors.push("CP00-453 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP14") errors.push("CP00-453 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows).length) errors.push("CP00-453 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-453 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-453 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-453 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-453 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-453 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-453 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-453 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(ANALYTICS_CORE_CP453_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.non_goal_boundary && rows.non_goal_boundary.analytics_runtime_opened !== false) {
      errors.push(`CP00-453 ${microId} must not open analytics runtime`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.permission_decision_detail_included !== false) {
      errors.push(`CP00-453 ${microId} permission baseline must not expose decisions`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-453 ${microId} permission baseline must deny cross-tenant access`);
    }
    if (rows.audit_baseline_note && rows.audit_baseline_note.audit_event_body_included !== false) {
      errors.push(`CP00-453 ${microId} audit baseline must not expose event bodies`);
    }
    if (rows.synthetic_data_policy && rows.synthetic_data_policy.real_client_data_loaded !== false) {
      errors.push(`CP00-453 ${microId} synthetic data policy drift`);
    }
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-453 ${microId} tenant scope must deny cross-tenant access`);
    }
    if (rows.matter_trace_reference && rows.matter_trace_reference.matter_trace_required !== true) {
      errors.push(`CP00-453 ${microId} matter trace must be required`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-453 ${microId} state transition map must not write state`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-453 ${microId} fixture model must not load real data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-453 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-453 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-453 ${microId} must not claim Claude final approval`);
    }
  }
  if (ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-453 must not promote Claude");
  if (ANALYTICS_CORE_CP453_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-453 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-453 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-453 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP453_PACK_BINDING.pack_id, ANALYTICS_CORE_CP454_PACK_BINDING.pack_id, ANALYTICS_CORE_CP455_PACK_BINDING.pack_id, ANALYTICS_CORE_CP456_PACK_BINDING.pack_id, ANALYTICS_CORE_CP457_PACK_BINDING.pack_id, ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-453 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-453 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP453_PACK_BINDING.next_pack_id) errors.push("CP00-453 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP453_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-453 next subphase drift");
  }
  return freezeCp453Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp453HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp453ScopeContractFoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp453Coverage(planPack);
  const foundation = validateAnalyticsCoreCp453ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp453Validation({
    evidence_packet: "H15.CP00-453.analytics_core_scope_contract_foundation_descriptor",
    gate: ANALYTICS_CORE_CP453_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_settlement_core_pack_id: ANALYTICS_CORE_CP453_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP453_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP453_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP453_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createAnalyticsCoreCp453ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp453Coverage(planPack);
  const foundation = validateAnalyticsCoreCp453ScopeContractFoundationDescriptor(createAnalyticsCoreCp453ScopeContractFoundationDescriptor(), {});
  return freezeCp453Validation({
    review_packet: "C15.CP00-453.analytics_core_scope_contract_foundation_descriptor",
    gate: ANALYTICS_CORE_CP453_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP453_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP453_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-453 cover exactly the 150 planned RP15 units from RP15.P00.M00.S01 through RP15.P01.M05.S20?",
      "Do the twenty-one descriptor sections (P00 M00-M10 scope foundation cycle and P01 M00-M08 model foundation cycle with package directory layout, primary entity identifier, tenant scope field, matter trace reference, lifecycle status enum, ownership metadata, reference relationship map, field registries, state transition map, validation helper, fixture model, serialization shape, public export, model tests, Hermes model summary, Claude model review prompt, and closeout handoff) cover every planned row title as descriptor-only rows?",
      "Does CP00-453 avoid analytics/matter-pnl/forecast/wip runtime, runtime permission evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, real data, permission decision leaks, audit event body leaks, fixture payload leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp453CloseoutHandoff() {
  return freezeCp453Validation({
    handoff_id: "CP00-453-to-CP00-454",
    from_pack_id: ANALYTICS_CORE_CP453_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP453_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP453_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP453_PACK_BINDING.range,
    open_scope: "Continue RP15.P01.M06.S01 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP453_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp454Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP454_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp454CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp454Validation({
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

export function validateAnalyticsCoreCp454Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-454 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP454_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-454");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP454_PACK_BINDING.risk_class) errors.push("CP00-454 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP454_PACK_BINDING.unit_count) errors.push("CP00-454 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP454_PACK_BINDING.first_unit_id) errors.push("CP00-454 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP454_PACK_BINDING.last_unit_id) errors.push("CP00-454 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-454 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-454 must only include RP15 units");
  const summary = createAnalyticsCoreCp454CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-454 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-454 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-454 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-454 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-454 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-454 ${microId} missing row ${title}`);
    }
  }
  return freezeCp454Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(
  descriptor = createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_foundation_case_set ?? createAnalyticsCoreCp454P01CloseoutP02FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp454P01CloseoutP02FoundationDescriptor") errors.push("CP00-454 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "AnalyticsCoreCp453ScopeContractFoundationDescriptor") {
    errors.push("CP00-454 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP454_REQUIREMENTS.required_section_rows).length) errors.push("CP00-454 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-454 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-454 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-454 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-454 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-454 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-454 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-454 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(ANALYTICS_CORE_CP454_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-454 ${microId} must not allow cross-tenant access`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-454 ${microId} must not write state transitions`);
    }
    if (rows.validation_helper && rows.validation_helper.validation_error_detail_included !== false) {
      errors.push(`CP00-454 ${microId} must not expose validation error details`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-454 ${microId} must not load real fixture data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-454 ${microId} must not execute test runtime`);
    }
    if (rows.invalid_reference_test && rows.invalid_reference_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-454 ${microId} invalid reference outcome drift`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-454 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-454 ${microId} must not claim Claude final approval`);
    }
  }
  if (ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-454 must not promote Claude");
  if (ANALYTICS_CORE_CP454_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-454 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-454 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-454 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP454_PACK_BINDING.pack_id, ANALYTICS_CORE_CP455_PACK_BINDING.pack_id, ANALYTICS_CORE_CP456_PACK_BINDING.pack_id, ANALYTICS_CORE_CP457_PACK_BINDING.pack_id, ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-454 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-454 contract p01_closeout_p02_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP454_PACK_BINDING.next_pack_id) errors.push("CP00-454 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP454_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-454 next subphase drift");
  }
  return freezeCp454Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp454HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp454Coverage(planPack);
  const slice = validateAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(descriptor, contractProjection);
  return freezeCp454Validation({
    evidence_packet: "H15.CP00-454.analytics_core_p01_closeout_p02_foundation_descriptor",
    gate: ANALYTICS_CORE_CP454_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_foundation_valid: slice.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: ANALYTICS_CORE_CP454_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP454_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP454_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP454_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp454ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp454Coverage(planPack);
  const slice = validateAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(createAnalyticsCoreCp454P01CloseoutP02FoundationDescriptor(), {});
  return freezeCp454Validation({
    review_packet: "C15.CP00-454.analytics_core_p01_closeout_p02_foundation_descriptor",
    gate: ANALYTICS_CORE_CP454_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP454_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP454_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-454 cover exactly the 150 planned RP15 units from RP15.P01.M06.S01 through RP15.P02.M04.S06?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-454 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp454CloseoutHandoff() {
  return freezeCp454Validation({
    handoff_id: "CP00-454-to-CP00-455",
    from_pack_id: ANALYTICS_CORE_CP454_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP454_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP454_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP454_PACK_BINDING.range,
    open_scope: "Continue RP15.P02.M04.S07 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP454_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp455Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP455_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp455CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp455Validation({
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

export function validateAnalyticsCoreCp455Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-455 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP455_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-455");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP455_PACK_BINDING.risk_class) errors.push("CP00-455 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP455_PACK_BINDING.unit_count) errors.push("CP00-455 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP455_PACK_BINDING.first_unit_id) errors.push("CP00-455 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP455_PACK_BINDING.last_unit_id) errors.push("CP00-455 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-455 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-455 must only include RP15 units");
  const summary = createAnalyticsCoreCp455CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-455 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-455 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-455 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-455 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-455 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-455 ${microId} missing row ${title}`);
    }
  }
  return freezeCp455Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_workflow_permission_slice_case_set ?? createAnalyticsCoreCp455P02WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor") errors.push("CP00-455 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_foundation_descriptor !== "AnalyticsCoreCp454P01CloseoutP02FoundationDescriptor") {
    errors.push("CP00-455 source p01 closeout p02 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP455_REQUIREMENTS.required_section_rows).length) errors.push("CP00-455 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP455_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-455 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-455 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-455 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-455 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-455 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-455 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-455 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-455 must not promote Claude");
  if (ANALYTICS_CORE_CP455_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-455 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-455 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-455 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP455_PACK_BINDING.pack_id, ANALYTICS_CORE_CP456_PACK_BINDING.pack_id, ANALYTICS_CORE_CP457_PACK_BINDING.pack_id, ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-455 contract current_pack drift");
  }
  if (
    contractProjection?.p02_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p02_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-455 contract p02_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP455_PACK_BINDING.next_pack_id) errors.push("CP00-455 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP455_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-455 next subphase drift");
  }
  return freezeCp455Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp455HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp455Coverage(planPack);
  const slice = validateAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp455Validation({
    evidence_packet: "H15.CP00-455.analytics_core_p02_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP455_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_foundation_pack_id: ANALYTICS_CORE_CP455_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP455_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP455_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP455_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp455ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp455Coverage(planPack);
  const slice = validateAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(createAnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor(), {});
  return freezeCp455Validation({
    review_packet: "C15.CP00-455.analytics_core_p02_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP455_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP455_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP455_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-455 cover exactly the 40 planned RP15 units from RP15.P02.M04.S07 through RP15.P02.M06.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-455 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp455CloseoutHandoff() {
  return freezeCp455Validation({
    handoff_id: "CP00-455-to-CP00-456",
    from_pack_id: ANALYTICS_CORE_CP455_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP455_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP455_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP455_PACK_BINDING.range,
    open_scope: "Continue RP15.P02.M06.S03 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP455_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp456Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP456_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp456CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp456Validation({
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

export function validateAnalyticsCoreCp456Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-456 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP456_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-456");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP456_PACK_BINDING.risk_class) errors.push("CP00-456 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP456_PACK_BINDING.unit_count) errors.push("CP00-456 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP456_PACK_BINDING.first_unit_id) errors.push("CP00-456 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP456_PACK_BINDING.last_unit_id) errors.push("CP00-456 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-456 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-456 must only include RP15 units");
  const summary = createAnalyticsCoreCp456CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-456 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-456 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-456 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-456 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-456 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-456 ${microId} missing row ${title}`);
    }
  }
  return freezeCp456Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp456P02FixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp456P02FixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_fixture_slice_case_set ?? createAnalyticsCoreCp456P02FixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp456P02FixtureSliceDescriptor") errors.push("CP00-456 descriptor type drift");
  if (descriptor.source_p02_workflow_permission_slice_descriptor !== "AnalyticsCoreCp455P02WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-456 source p02 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP456_REQUIREMENTS.required_section_rows).length) errors.push("CP00-456 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP456_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-456 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-456 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-456 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-456 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-456 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-456 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-456 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-456 must not promote Claude");
  if (ANALYTICS_CORE_CP456_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-456 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-456 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-456 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP456_PACK_BINDING.pack_id, ANALYTICS_CORE_CP457_PACK_BINDING.pack_id, ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-456 contract current_pack drift");
  }
  if (
    contractProjection?.p02_fixture_slice_descriptor?.descriptor &&
    contractProjection.p02_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-456 contract p02_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP456_PACK_BINDING.next_pack_id) errors.push("CP00-456 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP456_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-456 next subphase drift");
  }
  return freezeCp456Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp456HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp456P02FixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp456Coverage(planPack);
  const slice = validateAnalyticsCoreCp456P02FixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp456Validation({
    evidence_packet: "H15.CP00-456.analytics_core_p02_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP456_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_workflow_permission_slice_pack_id: ANALYTICS_CORE_CP456_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP456_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP456_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP456_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp456ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp456Coverage(planPack);
  const slice = validateAnalyticsCoreCp456P02FixtureSliceDescriptor(createAnalyticsCoreCp456P02FixtureSliceDescriptor(), {});
  return freezeCp456Validation({
    review_packet: "C15.CP00-456.analytics_core_p02_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP456_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP456_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP456_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-456 cover exactly the 10 planned RP15 units from RP15.P02.M06.S03 through RP15.P02.M06.S12?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-456 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp456CloseoutHandoff() {
  return freezeCp456Validation({
    handoff_id: "CP00-456-to-CP00-457",
    from_pack_id: ANALYTICS_CORE_CP456_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP456_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP456_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP456_PACK_BINDING.range,
    open_scope: "Continue RP15.P02.M06.S13 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP456_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp457Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP457_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp457CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp457Validation({
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

export function validateAnalyticsCoreCp457Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-457 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP457_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-457");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP457_PACK_BINDING.risk_class) errors.push("CP00-457 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP457_PACK_BINDING.unit_count) errors.push("CP00-457 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP457_PACK_BINDING.first_unit_id) errors.push("CP00-457 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP457_PACK_BINDING.last_unit_id) errors.push("CP00-457 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-457 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-457 must only include RP15 units");
  const summary = createAnalyticsCoreCp457CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-457 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-457 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-457 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-457 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-457 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-457 ${microId} missing row ${title}`);
    }
  }
  return freezeCp457Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(
  descriptor = createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_foundation_case_set ?? createAnalyticsCoreCp457P02CloseoutP03FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp457P02CloseoutP03FoundationDescriptor") errors.push("CP00-457 descriptor type drift");
  if (descriptor.source_p02_fixture_slice_descriptor !== "AnalyticsCoreCp456P02FixtureSliceDescriptor") {
    errors.push("CP00-457 source p02 fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP457_REQUIREMENTS.required_section_rows).length) errors.push("CP00-457 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP457_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-457 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-457 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-457 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-457 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-457 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-457 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-457 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-457 must not promote Claude");
  if (ANALYTICS_CORE_CP457_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-457 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-457 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-457 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP457_PACK_BINDING.pack_id, ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-457 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-457 contract p02_closeout_p03_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP457_PACK_BINDING.next_pack_id) errors.push("CP00-457 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP457_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-457 next subphase drift");
  }
  return freezeCp457Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp457HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp457Coverage(planPack);
  const slice = validateAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(descriptor, contractProjection);
  return freezeCp457Validation({
    evidence_packet: "H15.CP00-457.analytics_core_p02_closeout_p03_foundation_descriptor",
    gate: ANALYTICS_CORE_CP457_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_foundation_valid: slice.valid,
    no_real_data: true,
    source_p02_fixture_slice_pack_id: ANALYTICS_CORE_CP457_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP457_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP457_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP457_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp457ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp457Coverage(planPack);
  const slice = validateAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(createAnalyticsCoreCp457P02CloseoutP03FoundationDescriptor(), {});
  return freezeCp457Validation({
    review_packet: "C15.CP00-457.analytics_core_p02_closeout_p03_foundation_descriptor",
    gate: ANALYTICS_CORE_CP457_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP457_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP457_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-457 cover exactly the 150 planned RP15 units from RP15.P02.M06.S13 through RP15.P03.M05.S06?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-457 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp457CloseoutHandoff() {
  return freezeCp457Validation({
    handoff_id: "CP00-457-to-CP00-458",
    from_pack_id: ANALYTICS_CORE_CP457_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP457_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP457_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP457_PACK_BINDING.range,
    open_scope: "Continue RP15.P03.M05.S07 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP457_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp458Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP458_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp458CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp458Validation({
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

export function validateAnalyticsCoreCp458Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-458 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP458_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-458");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP458_PACK_BINDING.risk_class) errors.push("CP00-458 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP458_PACK_BINDING.unit_count) errors.push("CP00-458 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP458_PACK_BINDING.first_unit_id) errors.push("CP00-458 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP458_PACK_BINDING.last_unit_id) errors.push("CP00-458 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-458 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-458 must only include RP15 units");
  const summary = createAnalyticsCoreCp458CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-458 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-458 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-458 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-458 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-458 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-458 ${microId} missing row ${title}`);
    }
  }
  return freezeCp458Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp458P03PermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp458P03PermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_permission_slice_case_set ?? createAnalyticsCoreCp458P03PermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp458P03PermissionSliceDescriptor") errors.push("CP00-458 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_foundation_descriptor !== "AnalyticsCoreCp457P02CloseoutP03FoundationDescriptor") {
    errors.push("CP00-458 source p02 closeout p03 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP458_REQUIREMENTS.required_section_rows).length) errors.push("CP00-458 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP458_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-458 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-458 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-458 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-458 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-458 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-458 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-458 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-458 must not promote Claude");
  if (ANALYTICS_CORE_CP458_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-458 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-458 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-458 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP458_PACK_BINDING.pack_id, ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-458 contract current_pack drift");
  }
  if (
    contractProjection?.p03_permission_slice_descriptor?.descriptor &&
    contractProjection.p03_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-458 contract p03_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP458_PACK_BINDING.next_pack_id) errors.push("CP00-458 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP458_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-458 next subphase drift");
  }
  return freezeCp458Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp458HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp458P03PermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp458Coverage(planPack);
  const slice = validateAnalyticsCoreCp458P03PermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp458Validation({
    evidence_packet: "H15.CP00-458.analytics_core_p03_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP458_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_closeout_p03_foundation_pack_id: ANALYTICS_CORE_CP458_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP458_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP458_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP458_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp458ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp458Coverage(planPack);
  const slice = validateAnalyticsCoreCp458P03PermissionSliceDescriptor(createAnalyticsCoreCp458P03PermissionSliceDescriptor(), {});
  return freezeCp458Validation({
    review_packet: "C15.CP00-458.analytics_core_p03_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP458_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP458_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP458_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-458 cover exactly the 10 planned RP15 units from RP15.P03.M05.S07 through RP15.P03.M05.S16?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-458 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp458CloseoutHandoff() {
  return freezeCp458Validation({
    handoff_id: "CP00-458-to-CP00-459",
    from_pack_id: ANALYTICS_CORE_CP458_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP458_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP458_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP458_PACK_BINDING.range,
    open_scope: "Continue RP15.P03.M05.S17 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP458_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp459Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP459_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp459CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp459Validation({
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

export function validateAnalyticsCoreCp459Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-459 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP459_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-459");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP459_PACK_BINDING.risk_class) errors.push("CP00-459 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP459_PACK_BINDING.unit_count) errors.push("CP00-459 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP459_PACK_BINDING.first_unit_id) errors.push("CP00-459 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP459_PACK_BINDING.last_unit_id) errors.push("CP00-459 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-459 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-459 must only include RP15 units");
  const summary = createAnalyticsCoreCp459CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-459 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-459 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-459 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-459 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-459 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-459 ${microId} missing row ${title}`);
    }
  }
  return freezeCp459Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_permission_fixture_slice_case_set ?? createAnalyticsCoreCp459P03PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp459P03PermissionFixtureSliceDescriptor") errors.push("CP00-459 descriptor type drift");
  if (descriptor.source_p03_permission_slice_descriptor !== "AnalyticsCoreCp458P03PermissionSliceDescriptor") {
    errors.push("CP00-459 source p03 permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP459_REQUIREMENTS.required_section_rows).length) errors.push("CP00-459 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP459_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-459 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-459 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-459 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-459 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-459 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-459 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-459 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-459 must not promote Claude");
  if (ANALYTICS_CORE_CP459_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-459 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-459 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-459 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP459_PACK_BINDING.pack_id, ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-459 contract current_pack drift");
  }
  if (
    contractProjection?.p03_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p03_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-459 contract p03_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP459_PACK_BINDING.next_pack_id) errors.push("CP00-459 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP459_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-459 next subphase drift");
  }
  return freezeCp459Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp459HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp459Coverage(planPack);
  const slice = validateAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp459Validation({
    evidence_packet: "H15.CP00-459.analytics_core_p03_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP459_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p03_permission_slice_pack_id: ANALYTICS_CORE_CP459_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP459_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP459_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP459_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp459ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp459Coverage(planPack);
  const slice = validateAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(createAnalyticsCoreCp459P03PermissionFixtureSliceDescriptor(), {});
  return freezeCp459Validation({
    review_packet: "C15.CP00-459.analytics_core_p03_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP459_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP459_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP459_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-459 cover exactly the 10 planned RP15 units from RP15.P03.M05.S17 through RP15.P03.M06.S06?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-459 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp459CloseoutHandoff() {
  return freezeCp459Validation({
    handoff_id: "CP00-459-to-CP00-460",
    from_pack_id: ANALYTICS_CORE_CP459_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP459_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP459_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP459_PACK_BINDING.range,
    open_scope: "Continue RP15.P03.M06.S07 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP459_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp460Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP460_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp460CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp460Validation({
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

export function validateAnalyticsCoreCp460Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-460 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP460_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-460");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP460_PACK_BINDING.risk_class) errors.push("CP00-460 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP460_PACK_BINDING.unit_count) errors.push("CP00-460 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP460_PACK_BINDING.first_unit_id) errors.push("CP00-460 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP460_PACK_BINDING.last_unit_id) errors.push("CP00-460 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-460 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-460 must only include RP15 units");
  const summary = createAnalyticsCoreCp460CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-460 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-460 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-460 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-460 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-460 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-460 ${microId} missing row ${title}`);
    }
  }
  return freezeCp460Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(
  descriptor = createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_closeout_p04_foundation_case_set ?? createAnalyticsCoreCp460P03CloseoutP04FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp460P03CloseoutP04FoundationDescriptor") errors.push("CP00-460 descriptor type drift");
  if (descriptor.source_p03_permission_fixture_slice_descriptor !== "AnalyticsCoreCp459P03PermissionFixtureSliceDescriptor") {
    errors.push("CP00-460 source p03 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP460_REQUIREMENTS.required_section_rows).length) errors.push("CP00-460 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP460_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-460 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-460 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-460 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-460 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-460 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-460 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-460 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-460 must not promote Claude");
  if (ANALYTICS_CORE_CP460_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-460 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-460 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-460 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP460_PACK_BINDING.pack_id, ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-460 contract current_pack drift");
  }
  if (
    contractProjection?.p03_closeout_p04_foundation_descriptor?.descriptor &&
    contractProjection.p03_closeout_p04_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-460 contract p03_closeout_p04_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP460_PACK_BINDING.next_pack_id) errors.push("CP00-460 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP460_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-460 next subphase drift");
  }
  return freezeCp460Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp460HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp460Coverage(planPack);
  const slice = validateAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(descriptor, contractProjection);
  return freezeCp460Validation({
    evidence_packet: "H15.CP00-460.analytics_core_p03_closeout_p04_foundation_descriptor",
    gate: ANALYTICS_CORE_CP460_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_closeout_p04_foundation_valid: slice.valid,
    no_real_data: true,
    source_p03_permission_fixture_slice_pack_id: ANALYTICS_CORE_CP460_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP460_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP460_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP460_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp460ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp460Coverage(planPack);
  const slice = validateAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(createAnalyticsCoreCp460P03CloseoutP04FoundationDescriptor(), {});
  return freezeCp460Validation({
    review_packet: "C15.CP00-460.analytics_core_p03_closeout_p04_foundation_descriptor",
    gate: ANALYTICS_CORE_CP460_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP460_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_closeout_p04_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP460_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-460 cover exactly the 150 planned RP15 units from RP15.P03.M06.S07 through RP15.P04.M05.S07?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-460 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp460CloseoutHandoff() {
  return freezeCp460Validation({
    handoff_id: "CP00-460-to-CP00-461",
    from_pack_id: ANALYTICS_CORE_CP460_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP460_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP460_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP460_PACK_BINDING.range,
    open_scope: "Continue RP15.P04.M05.S08 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP460_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp461Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP461_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp461CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp461Validation({
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

export function validateAnalyticsCoreCp461Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-461 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP461_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-461");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP461_PACK_BINDING.risk_class) errors.push("CP00-461 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP461_PACK_BINDING.unit_count) errors.push("CP00-461 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP461_PACK_BINDING.first_unit_id) errors.push("CP00-461 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP461_PACK_BINDING.last_unit_id) errors.push("CP00-461 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-461 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-461 must only include RP15 units");
  const summary = createAnalyticsCoreCp461CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-461 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-461 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-461 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-461 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-461 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-461 ${microId} missing row ${title}`);
    }
  }
  return freezeCp461Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp461P04PermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp461P04PermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_permission_slice_case_set ?? createAnalyticsCoreCp461P04PermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp461P04PermissionSliceDescriptor") errors.push("CP00-461 descriptor type drift");
  if (descriptor.source_p03_closeout_p04_foundation_descriptor !== "AnalyticsCoreCp460P03CloseoutP04FoundationDescriptor") {
    errors.push("CP00-461 source p03 closeout p04 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP461_REQUIREMENTS.required_section_rows).length) errors.push("CP00-461 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP461_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-461 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-461 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-461 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-461 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-461 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-461 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-461 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-461 must not promote Claude");
  if (ANALYTICS_CORE_CP461_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-461 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-461 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-461 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP461_PACK_BINDING.pack_id, ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-461 contract current_pack drift");
  }
  if (
    contractProjection?.p04_permission_slice_descriptor?.descriptor &&
    contractProjection.p04_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-461 contract p04_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP461_PACK_BINDING.next_pack_id) errors.push("CP00-461 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP461_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-461 next subphase drift");
  }
  return freezeCp461Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp461HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp461P04PermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp461Coverage(planPack);
  const slice = validateAnalyticsCoreCp461P04PermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp461Validation({
    evidence_packet: "H15.CP00-461.analytics_core_p04_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP461_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p03_closeout_p04_foundation_pack_id: ANALYTICS_CORE_CP461_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP461_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP461_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP461_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp461ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp461Coverage(planPack);
  const slice = validateAnalyticsCoreCp461P04PermissionSliceDescriptor(createAnalyticsCoreCp461P04PermissionSliceDescriptor(), {});
  return freezeCp461Validation({
    review_packet: "C15.CP00-461.analytics_core_p04_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP461_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP461_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP461_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-461 cover exactly the 10 planned RP15 units from RP15.P04.M05.S08 through RP15.P04.M05.S17?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-461 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp461CloseoutHandoff() {
  return freezeCp461Validation({
    handoff_id: "CP00-461-to-CP00-462",
    from_pack_id: ANALYTICS_CORE_CP461_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP461_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP461_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP461_PACK_BINDING.range,
    open_scope: "Continue RP15.P04.M05.S18 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP461_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp462Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP462_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp462CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp462Validation({
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

export function validateAnalyticsCoreCp462Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-462 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP462_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-462");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP462_PACK_BINDING.risk_class) errors.push("CP00-462 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP462_PACK_BINDING.unit_count) errors.push("CP00-462 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP462_PACK_BINDING.first_unit_id) errors.push("CP00-462 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP462_PACK_BINDING.last_unit_id) errors.push("CP00-462 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-462 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-462 must only include RP15 units");
  const summary = createAnalyticsCoreCp462CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-462 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-462 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-462 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-462 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-462 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-462 ${microId} missing row ${title}`);
    }
  }
  return freezeCp462Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_permission_fixture_slice_case_set ?? createAnalyticsCoreCp462P04PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp462P04PermissionFixtureSliceDescriptor") errors.push("CP00-462 descriptor type drift");
  if (descriptor.source_p04_permission_slice_descriptor !== "AnalyticsCoreCp461P04PermissionSliceDescriptor") {
    errors.push("CP00-462 source p04 permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP462_REQUIREMENTS.required_section_rows).length) errors.push("CP00-462 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP462_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-462 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-462 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-462 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-462 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-462 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-462 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-462 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-462 must not promote Claude");
  if (ANALYTICS_CORE_CP462_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-462 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-462 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-462 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP462_PACK_BINDING.pack_id, ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-462 contract current_pack drift");
  }
  if (
    contractProjection?.p04_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p04_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-462 contract p04_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP462_PACK_BINDING.next_pack_id) errors.push("CP00-462 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP462_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-462 next subphase drift");
  }
  return freezeCp462Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp462HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp462Coverage(planPack);
  const slice = validateAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp462Validation({
    evidence_packet: "H15.CP00-462.analytics_core_p04_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP462_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_permission_slice_pack_id: ANALYTICS_CORE_CP462_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP462_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP462_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP462_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp462ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp462Coverage(planPack);
  const slice = validateAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(createAnalyticsCoreCp462P04PermissionFixtureSliceDescriptor(), {});
  return freezeCp462Validation({
    review_packet: "C15.CP00-462.analytics_core_p04_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP462_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP462_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP462_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-462 cover exactly the 10 planned RP15 units from RP15.P04.M05.S18 through RP15.P04.M06.S05?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-462 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp462CloseoutHandoff() {
  return freezeCp462Validation({
    handoff_id: "CP00-462-to-CP00-463",
    from_pack_id: ANALYTICS_CORE_CP462_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP462_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP462_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP462_PACK_BINDING.range,
    open_scope: "Continue RP15.P04.M06.S06 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP462_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp463Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP463_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp463CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp463Validation({
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

export function validateAnalyticsCoreCp463Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-463 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP463_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-463");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP463_PACK_BINDING.risk_class) errors.push("CP00-463 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP463_PACK_BINDING.unit_count) errors.push("CP00-463 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP463_PACK_BINDING.first_unit_id) errors.push("CP00-463 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP463_PACK_BINDING.last_unit_id) errors.push("CP00-463 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-463 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-463 must only include RP15 units");
  const summary = createAnalyticsCoreCp463CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-463 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-463 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-463 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-463 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-463 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-463 ${microId} missing row ${title}`);
    }
  }
  return freezeCp463Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(
  descriptor = createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_closeout_p05_foundation_case_set ?? createAnalyticsCoreCp463P04CloseoutP05FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp463P04CloseoutP05FoundationDescriptor") errors.push("CP00-463 descriptor type drift");
  if (descriptor.source_p04_permission_fixture_slice_descriptor !== "AnalyticsCoreCp462P04PermissionFixtureSliceDescriptor") {
    errors.push("CP00-463 source p04 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP463_REQUIREMENTS.required_section_rows).length) errors.push("CP00-463 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP463_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-463 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-463 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-463 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-463 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-463 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-463 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-463 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-463 must not promote Claude");
  if (ANALYTICS_CORE_CP463_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-463 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-463 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-463 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP463_PACK_BINDING.pack_id, ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-463 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-463 contract p04_closeout_p05_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP463_PACK_BINDING.next_pack_id) errors.push("CP00-463 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP463_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-463 next subphase drift");
  }
  return freezeCp463Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp463HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp463Coverage(planPack);
  const slice = validateAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(descriptor, contractProjection);
  return freezeCp463Validation({
    evidence_packet: "H15.CP00-463.analytics_core_p04_closeout_p05_foundation_descriptor",
    gate: ANALYTICS_CORE_CP463_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_foundation_valid: slice.valid,
    no_real_data: true,
    source_p04_permission_fixture_slice_pack_id: ANALYTICS_CORE_CP463_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP463_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP463_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP463_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp463ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp463Coverage(planPack);
  const slice = validateAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(createAnalyticsCoreCp463P04CloseoutP05FoundationDescriptor(), {});
  return freezeCp463Validation({
    review_packet: "C15.CP00-463.analytics_core_p04_closeout_p05_foundation_descriptor",
    gate: ANALYTICS_CORE_CP463_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP463_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP463_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-463 cover exactly the 150 planned RP15 units from RP15.P04.M06.S06 through RP15.P05.M04.S07?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-463 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp463CloseoutHandoff() {
  return freezeCp463Validation({
    handoff_id: "CP00-463-to-CP00-464",
    from_pack_id: ANALYTICS_CORE_CP463_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP463_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP463_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP463_PACK_BINDING.range,
    open_scope: "Continue RP15.P05.M04.S08 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP463_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp464Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP464_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp464CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp464Validation({
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

export function validateAnalyticsCoreCp464Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-464 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP464_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-464");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP464_PACK_BINDING.risk_class) errors.push("CP00-464 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP464_PACK_BINDING.unit_count) errors.push("CP00-464 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP464_PACK_BINDING.first_unit_id) errors.push("CP00-464 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP464_PACK_BINDING.last_unit_id) errors.push("CP00-464 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-464 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-464 must only include RP15 units");
  const summary = createAnalyticsCoreCp464CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-464 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-464 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-464 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-464 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-464 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-464 ${microId} missing row ${title}`);
    }
  }
  return freezeCp464Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_workflow_permission_slice_case_set ?? createAnalyticsCoreCp464P05WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor") errors.push("CP00-464 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_foundation_descriptor !== "AnalyticsCoreCp463P04CloseoutP05FoundationDescriptor") {
    errors.push("CP00-464 source p04 closeout p05 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP464_REQUIREMENTS.required_section_rows).length) errors.push("CP00-464 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP464_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-464 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-464 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-464 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-464 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-464 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-464 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-464 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-464 must not promote Claude");
  if (ANALYTICS_CORE_CP464_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-464 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-464 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-464 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP464_PACK_BINDING.pack_id, ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-464 contract current_pack drift");
  }
  if (
    contractProjection?.p05_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p05_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-464 contract p05_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP464_PACK_BINDING.next_pack_id) errors.push("CP00-464 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP464_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-464 next subphase drift");
  }
  return freezeCp464Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp464HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp464Coverage(planPack);
  const slice = validateAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp464Validation({
    evidence_packet: "H15.CP00-464.analytics_core_p05_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP464_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_closeout_p05_foundation_pack_id: ANALYTICS_CORE_CP464_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP464_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP464_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP464_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp464ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp464Coverage(planPack);
  const slice = validateAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(createAnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor(), {});
  return freezeCp464Validation({
    review_packet: "C15.CP00-464.analytics_core_p05_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP464_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP464_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP464_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-464 cover exactly the 40 planned RP15 units from RP15.P05.M04.S08 through RP15.P05.M06.S05?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-464 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp464CloseoutHandoff() {
  return freezeCp464Validation({
    handoff_id: "CP00-464-to-CP00-465",
    from_pack_id: ANALYTICS_CORE_CP464_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP464_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP464_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP464_PACK_BINDING.range,
    open_scope: "Continue RP15.P05.M06.S06 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP464_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp465Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP465_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp465CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp465Validation({
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

export function validateAnalyticsCoreCp465Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-465 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP465_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-465");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP465_PACK_BINDING.risk_class) errors.push("CP00-465 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP465_PACK_BINDING.unit_count) errors.push("CP00-465 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP465_PACK_BINDING.first_unit_id) errors.push("CP00-465 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP465_PACK_BINDING.last_unit_id) errors.push("CP00-465 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-465 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-465 must only include RP15 units");
  const summary = createAnalyticsCoreCp465CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-465 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-465 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-465 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-465 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-465 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-465 ${microId} missing row ${title}`);
    }
  }
  return freezeCp465Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(
  descriptor = createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_foundation_case_set ?? createAnalyticsCoreCp465P05CloseoutP06FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp465P05CloseoutP06FoundationDescriptor") errors.push("CP00-465 descriptor type drift");
  if (descriptor.source_p05_workflow_permission_slice_descriptor !== "AnalyticsCoreCp464P05WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-465 source p05 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP465_REQUIREMENTS.required_section_rows).length) errors.push("CP00-465 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP465_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-465 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-465 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-465 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-465 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-465 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-465 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-465 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-465 must not promote Claude");
  if (ANALYTICS_CORE_CP465_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-465 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-465 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-465 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP465_PACK_BINDING.pack_id, ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-465 contract current_pack drift");
  }
  if (
    contractProjection?.p05_closeout_p06_foundation_descriptor?.descriptor &&
    contractProjection.p05_closeout_p06_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-465 contract p05_closeout_p06_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP465_PACK_BINDING.next_pack_id) errors.push("CP00-465 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP465_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-465 next subphase drift");
  }
  return freezeCp465Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp465HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp465Coverage(planPack);
  const slice = validateAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(descriptor, contractProjection);
  return freezeCp465Validation({
    evidence_packet: "H15.CP00-465.analytics_core_p05_closeout_p06_foundation_descriptor",
    gate: ANALYTICS_CORE_CP465_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_closeout_p06_foundation_valid: slice.valid,
    no_real_data: true,
    source_p05_workflow_permission_slice_pack_id: ANALYTICS_CORE_CP465_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP465_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP465_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP465_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp465ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp465Coverage(planPack);
  const slice = validateAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(createAnalyticsCoreCp465P05CloseoutP06FoundationDescriptor(), {});
  return freezeCp465Validation({
    review_packet: "C15.CP00-465.analytics_core_p05_closeout_p06_foundation_descriptor",
    gate: ANALYTICS_CORE_CP465_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP465_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_closeout_p06_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP465_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-465 cover exactly the 150 planned RP15 units from RP15.P05.M06.S06 through RP15.P06.M03.S14?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-465 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp465CloseoutHandoff() {
  return freezeCp465Validation({
    handoff_id: "CP00-465-to-CP00-466",
    from_pack_id: ANALYTICS_CORE_CP465_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP465_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP465_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP465_PACK_BINDING.range,
    open_scope: "Continue RP15.P06.M03.S15 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP465_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp466Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP466_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp466CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp466Validation({
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

export function validateAnalyticsCoreCp466Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-466 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP466_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-466");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP466_PACK_BINDING.risk_class) errors.push("CP00-466 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP466_PACK_BINDING.unit_count) errors.push("CP00-466 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP466_PACK_BINDING.first_unit_id) errors.push("CP00-466 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP466_PACK_BINDING.last_unit_id) errors.push("CP00-466 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-466 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-466 must only include RP15 units");
  const summary = createAnalyticsCoreCp466CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-466 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-466 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-466 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-466 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-466 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-466 ${microId} missing row ${title}`);
    }
  }
  return freezeCp466Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(
  descriptor = createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_implementation_workflow_slice_case_set ?? createAnalyticsCoreCp466P06ImplementationWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor") errors.push("CP00-466 descriptor type drift");
  if (descriptor.source_p05_closeout_p06_foundation_descriptor !== "AnalyticsCoreCp465P05CloseoutP06FoundationDescriptor") {
    errors.push("CP00-466 source p05 closeout p06 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP466_REQUIREMENTS.required_section_rows).length) errors.push("CP00-466 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP466_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-466 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-466 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-466 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-466 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-466 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-466 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-466 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-466 must not promote Claude");
  if (ANALYTICS_CORE_CP466_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-466 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-466 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-466 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP466_PACK_BINDING.pack_id, ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-466 contract current_pack drift");
  }
  if (
    contractProjection?.p06_implementation_workflow_slice_descriptor?.descriptor &&
    contractProjection.p06_implementation_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-466 contract p06_implementation_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP466_PACK_BINDING.next_pack_id) errors.push("CP00-466 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP466_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-466 next subphase drift");
  }
  return freezeCp466Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp466HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp466Coverage(planPack);
  const slice = validateAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp466Validation({
    evidence_packet: "H15.CP00-466.analytics_core_p06_implementation_workflow_slice_descriptor",
    gate: ANALYTICS_CORE_CP466_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_implementation_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_closeout_p06_foundation_pack_id: ANALYTICS_CORE_CP466_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP466_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP466_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP466_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp466ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp466Coverage(planPack);
  const slice = validateAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(createAnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor(), {});
  return freezeCp466Validation({
    review_packet: "C15.CP00-466.analytics_core_p06_implementation_workflow_slice_descriptor",
    gate: ANALYTICS_CORE_CP466_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP466_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_implementation_workflow_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP466_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-466 cover exactly the 10 planned RP15 units from RP15.P06.M03.S15 through RP15.P06.M04.S02?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-466 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp466CloseoutHandoff() {
  return freezeCp466Validation({
    handoff_id: "CP00-466-to-CP00-467",
    from_pack_id: ANALYTICS_CORE_CP466_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP466_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP466_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP466_PACK_BINDING.range,
    open_scope: "Continue RP15.P06.M04.S03 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP466_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp467Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP467_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp467CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp467Validation({
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

export function validateAnalyticsCoreCp467Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-467 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP467_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-467");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP467_PACK_BINDING.risk_class) errors.push("CP00-467 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP467_PACK_BINDING.unit_count) errors.push("CP00-467 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP467_PACK_BINDING.first_unit_id) errors.push("CP00-467 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP467_PACK_BINDING.last_unit_id) errors.push("CP00-467 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-467 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-467 must only include RP15 units");
  const summary = createAnalyticsCoreCp467CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-467 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-467 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-467 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-467 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-467 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-467 ${microId} missing row ${title}`);
    }
  }
  return freezeCp467Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_workflow_permission_slice_case_set ?? createAnalyticsCoreCp467P06WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor") errors.push("CP00-467 descriptor type drift");
  if (descriptor.source_p06_implementation_workflow_slice_descriptor !== "AnalyticsCoreCp466P06ImplementationWorkflowSliceDescriptor") {
    errors.push("CP00-467 source p06 implementation workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP467_REQUIREMENTS.required_section_rows).length) errors.push("CP00-467 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP467_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-467 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-467 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-467 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-467 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-467 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-467 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-467 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-467 must not promote Claude");
  if (ANALYTICS_CORE_CP467_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-467 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-467 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-467 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP467_PACK_BINDING.pack_id, ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-467 contract current_pack drift");
  }
  if (
    contractProjection?.p06_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p06_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-467 contract p06_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP467_PACK_BINDING.next_pack_id) errors.push("CP00-467 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP467_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-467 next subphase drift");
  }
  return freezeCp467Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp467HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp467Coverage(planPack);
  const slice = validateAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp467Validation({
    evidence_packet: "H15.CP00-467.analytics_core_p06_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP467_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_implementation_workflow_slice_pack_id: ANALYTICS_CORE_CP467_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP467_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP467_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP467_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp467ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp467Coverage(planPack);
  const slice = validateAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(createAnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor(), {});
  return freezeCp467Validation({
    review_packet: "C15.CP00-467.analytics_core_p06_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP467_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP467_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP467_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-467 cover exactly the 40 planned RP15 units from RP15.P06.M04.S03 through RP15.P06.M05.S20?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-467 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp467CloseoutHandoff() {
  return freezeCp467Validation({
    handoff_id: "CP00-467-to-CP00-468",
    from_pack_id: ANALYTICS_CORE_CP467_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP467_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP467_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP467_PACK_BINDING.range,
    open_scope: "Continue RP15.P06.M05.S21 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP467_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp468Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP468_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp468CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp468Validation({
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

export function validateAnalyticsCoreCp468Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-468 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP468_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-468");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP468_PACK_BINDING.risk_class) errors.push("CP00-468 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP468_PACK_BINDING.unit_count) errors.push("CP00-468 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP468_PACK_BINDING.first_unit_id) errors.push("CP00-468 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP468_PACK_BINDING.last_unit_id) errors.push("CP00-468 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-468 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-468 must only include RP15 units");
  const summary = createAnalyticsCoreCp468CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-468 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-468 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-468 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-468 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-468 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-468 ${microId} missing row ${title}`);
    }
  }
  return freezeCp468Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_permission_fixture_slice_case_set ?? createAnalyticsCoreCp468P06PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp468P06PermissionFixtureSliceDescriptor") errors.push("CP00-468 descriptor type drift");
  if (descriptor.source_p06_workflow_permission_slice_descriptor !== "AnalyticsCoreCp467P06WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-468 source p06 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP468_REQUIREMENTS.required_section_rows).length) errors.push("CP00-468 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP468_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-468 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-468 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-468 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-468 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-468 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-468 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-468 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-468 must not promote Claude");
  if (ANALYTICS_CORE_CP468_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-468 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-468 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-468 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP468_PACK_BINDING.pack_id, ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-468 contract current_pack drift");
  }
  if (
    contractProjection?.p06_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p06_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-468 contract p06_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP468_PACK_BINDING.next_pack_id) errors.push("CP00-468 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP468_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-468 next subphase drift");
  }
  return freezeCp468Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp468HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp468Coverage(planPack);
  const slice = validateAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp468Validation({
    evidence_packet: "H15.CP00-468.analytics_core_p06_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP468_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_workflow_permission_slice_pack_id: ANALYTICS_CORE_CP468_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP468_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP468_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP468_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp468ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp468Coverage(planPack);
  const slice = validateAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(createAnalyticsCoreCp468P06PermissionFixtureSliceDescriptor(), {});
  return freezeCp468Validation({
    review_packet: "C15.CP00-468.analytics_core_p06_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP468_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP468_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP468_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-468 cover exactly the 10 planned RP15 units from RP15.P06.M05.S21 through RP15.P06.M06.S08?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-468 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp468CloseoutHandoff() {
  return freezeCp468Validation({
    handoff_id: "CP00-468-to-CP00-469",
    from_pack_id: ANALYTICS_CORE_CP468_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP468_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP468_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP468_PACK_BINDING.range,
    open_scope: "Continue RP15.P06.M06.S09 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP468_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp469Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP469_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp469CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp469Validation({
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

export function validateAnalyticsCoreCp469Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-469 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP469_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-469");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP469_PACK_BINDING.risk_class) errors.push("CP00-469 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP469_PACK_BINDING.unit_count) errors.push("CP00-469 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP469_PACK_BINDING.first_unit_id) errors.push("CP00-469 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP469_PACK_BINDING.last_unit_id) errors.push("CP00-469 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-469 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-469 must only include RP15 units");
  const summary = createAnalyticsCoreCp469CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-469 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-469 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-469 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-469 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-469 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-469 ${microId} missing row ${title}`);
    }
  }
  return freezeCp469Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(
  descriptor = createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_foundation_case_set ?? createAnalyticsCoreCp469P06CloseoutP07FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp469P06CloseoutP07FoundationDescriptor") errors.push("CP00-469 descriptor type drift");
  if (descriptor.source_p06_permission_fixture_slice_descriptor !== "AnalyticsCoreCp468P06PermissionFixtureSliceDescriptor") {
    errors.push("CP00-469 source p06 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP469_REQUIREMENTS.required_section_rows).length) errors.push("CP00-469 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP469_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-469 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-469 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-469 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-469 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-469 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-469 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-469 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-469 must not promote Claude");
  if (ANALYTICS_CORE_CP469_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-469 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-469 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-469 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP469_PACK_BINDING.pack_id, ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-469 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-469 contract p06_closeout_p07_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP469_PACK_BINDING.next_pack_id) errors.push("CP00-469 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP469_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-469 next subphase drift");
  }
  return freezeCp469Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp469HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp469Coverage(planPack);
  const slice = validateAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(descriptor, contractProjection);
  return freezeCp469Validation({
    evidence_packet: "H15.CP00-469.analytics_core_p06_closeout_p07_foundation_descriptor",
    gate: ANALYTICS_CORE_CP469_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_foundation_valid: slice.valid,
    no_real_data: true,
    source_p06_permission_fixture_slice_pack_id: ANALYTICS_CORE_CP469_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP469_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP469_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP469_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp469ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp469Coverage(planPack);
  const slice = validateAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(createAnalyticsCoreCp469P06CloseoutP07FoundationDescriptor(), {});
  return freezeCp469Validation({
    review_packet: "C15.CP00-469.analytics_core_p06_closeout_p07_foundation_descriptor",
    gate: ANALYTICS_CORE_CP469_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP469_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP469_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-469 cover exactly the 150 planned RP15 units from RP15.P06.M06.S09 through RP15.P07.M03.S10?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-469 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp469CloseoutHandoff() {
  return freezeCp469Validation({
    handoff_id: "CP00-469-to-CP00-470",
    from_pack_id: ANALYTICS_CORE_CP469_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP469_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP469_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP469_PACK_BINDING.range,
    open_scope: "Continue RP15.P07.M03.S11 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP469_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp470Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP470_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp470CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp470Validation({
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

export function validateAnalyticsCoreCp470Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-470 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP470_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-470");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP470_PACK_BINDING.risk_class) errors.push("CP00-470 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP470_PACK_BINDING.unit_count) errors.push("CP00-470 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP470_PACK_BINDING.first_unit_id) errors.push("CP00-470 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP470_PACK_BINDING.last_unit_id) errors.push("CP00-470 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-470 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-470 must only include RP15 units");
  const summary = createAnalyticsCoreCp470CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-470 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-470 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-470 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-470 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-470 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-470 ${microId} missing row ${title}`);
    }
  }
  return freezeCp470Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp470P07ImplementationSliceDescriptor(
  descriptor = createAnalyticsCoreCp470P07ImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_implementation_slice_case_set ?? createAnalyticsCoreCp470P07ImplementationSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp470P07ImplementationSliceDescriptor") errors.push("CP00-470 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_foundation_descriptor !== "AnalyticsCoreCp469P06CloseoutP07FoundationDescriptor") {
    errors.push("CP00-470 source p06 closeout p07 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP470_REQUIREMENTS.required_section_rows).length) errors.push("CP00-470 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP470_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-470 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-470 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-470 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-470 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-470 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-470 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-470 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-470 must not promote Claude");
  if (ANALYTICS_CORE_CP470_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-470 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-470 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-470 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP470_PACK_BINDING.pack_id, ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-470 contract current_pack drift");
  }
  if (
    contractProjection?.p07_implementation_slice_descriptor?.descriptor &&
    contractProjection.p07_implementation_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-470 contract p07_implementation_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP470_PACK_BINDING.next_pack_id) errors.push("CP00-470 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP470_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-470 next subphase drift");
  }
  return freezeCp470Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp470HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp470P07ImplementationSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp470Coverage(planPack);
  const slice = validateAnalyticsCoreCp470P07ImplementationSliceDescriptor(descriptor, contractProjection);
  return freezeCp470Validation({
    evidence_packet: "H15.CP00-470.analytics_core_p07_implementation_slice_descriptor",
    gate: ANALYTICS_CORE_CP470_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_implementation_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_foundation_pack_id: ANALYTICS_CORE_CP470_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP470_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP470_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP470_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp470ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp470Coverage(planPack);
  const slice = validateAnalyticsCoreCp470P07ImplementationSliceDescriptor(createAnalyticsCoreCp470P07ImplementationSliceDescriptor(), {});
  return freezeCp470Validation({
    review_packet: "C15.CP00-470.analytics_core_p07_implementation_slice_descriptor",
    gate: ANALYTICS_CORE_CP470_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP470_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_implementation_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP470_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-470 cover exactly the 10 planned RP15 units from RP15.P07.M03.S11 through RP15.P07.M03.S20?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-470 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp470CloseoutHandoff() {
  return freezeCp470Validation({
    handoff_id: "CP00-470-to-CP00-471",
    from_pack_id: ANALYTICS_CORE_CP470_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP470_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP470_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP470_PACK_BINDING.range,
    open_scope: "Continue RP15.P07.M03.S21 onward with the remaining primary implementation rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP470_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp471Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP471_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp471CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp471Validation({
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

export function validateAnalyticsCoreCp471Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-471 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP471_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-471");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP471_PACK_BINDING.risk_class) errors.push("CP00-471 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP471_PACK_BINDING.unit_count) errors.push("CP00-471 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP471_PACK_BINDING.first_unit_id) errors.push("CP00-471 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP471_PACK_BINDING.last_unit_id) errors.push("CP00-471 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-471 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-471 must only include RP15 units");
  const summary = createAnalyticsCoreCp471CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-471 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-471 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-471 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-471 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-471 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-471 ${microId} missing row ${title}`);
    }
  }
  return freezeCp471Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_workflow_permission_slice_case_set ?? createAnalyticsCoreCp471P07WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor") errors.push("CP00-471 descriptor type drift");
  if (descriptor.source_p07_implementation_slice_descriptor !== "AnalyticsCoreCp470P07ImplementationSliceDescriptor") {
    errors.push("CP00-471 source p07 implementation slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP471_REQUIREMENTS.required_section_rows).length) errors.push("CP00-471 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP471_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-471 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-471 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-471 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-471 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-471 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-471 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-471 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-471 must not promote Claude");
  if (ANALYTICS_CORE_CP471_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-471 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-471 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-471 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP471_PACK_BINDING.pack_id, ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-471 contract current_pack drift");
  }
  if (
    contractProjection?.p07_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p07_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-471 contract p07_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP471_PACK_BINDING.next_pack_id) errors.push("CP00-471 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP471_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-471 next subphase drift");
  }
  return freezeCp471Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp471HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp471Coverage(planPack);
  const slice = validateAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp471Validation({
    evidence_packet: "H15.CP00-471.analytics_core_p07_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP471_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_implementation_slice_pack_id: ANALYTICS_CORE_CP471_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP471_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP471_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP471_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp471ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp471Coverage(planPack);
  const slice = validateAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(createAnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor(), {});
  return freezeCp471Validation({
    review_packet: "C15.CP00-471.analytics_core_p07_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP471_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP471_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP471_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-471 cover exactly the 40 planned RP15 units from RP15.P07.M03.S21 through RP15.P07.M05.S16?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-471 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp471CloseoutHandoff() {
  return freezeCp471Validation({
    handoff_id: "CP00-471-to-CP00-472",
    from_pack_id: ANALYTICS_CORE_CP471_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP471_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP471_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP471_PACK_BINDING.range,
    open_scope: "Continue RP15.P07.M05.S17 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP471_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp472Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP472_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp472CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp472Validation({
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

export function validateAnalyticsCoreCp472Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-472 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP472_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-472");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP472_PACK_BINDING.risk_class) errors.push("CP00-472 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP472_PACK_BINDING.unit_count) errors.push("CP00-472 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP472_PACK_BINDING.first_unit_id) errors.push("CP00-472 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP472_PACK_BINDING.last_unit_id) errors.push("CP00-472 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-472 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-472 must only include RP15 units");
  const summary = createAnalyticsCoreCp472CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-472 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-472 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-472 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-472 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-472 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-472 ${microId} missing row ${title}`);
    }
  }
  return freezeCp472Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_permission_fixture_slice_case_set ?? createAnalyticsCoreCp472P07PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp472P07PermissionFixtureSliceDescriptor") errors.push("CP00-472 descriptor type drift");
  if (descriptor.source_p07_workflow_permission_slice_descriptor !== "AnalyticsCoreCp471P07WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-472 source p07 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP472_REQUIREMENTS.required_section_rows).length) errors.push("CP00-472 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP472_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-472 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-472 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-472 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-472 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-472 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-472 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-472 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-472 must not promote Claude");
  if (ANALYTICS_CORE_CP472_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-472 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-472 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-472 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP472_PACK_BINDING.pack_id, ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-472 contract current_pack drift");
  }
  if (
    contractProjection?.p07_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p07_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-472 contract p07_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP472_PACK_BINDING.next_pack_id) errors.push("CP00-472 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP472_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-472 next subphase drift");
  }
  return freezeCp472Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp472HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp472Coverage(planPack);
  const slice = validateAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp472Validation({
    evidence_packet: "H15.CP00-472.analytics_core_p07_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP472_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_workflow_permission_slice_pack_id: ANALYTICS_CORE_CP472_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP472_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP472_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP472_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp472ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp472Coverage(planPack);
  const slice = validateAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(createAnalyticsCoreCp472P07PermissionFixtureSliceDescriptor(), {});
  return freezeCp472Validation({
    review_packet: "C15.CP00-472.analytics_core_p07_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP472_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP472_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP472_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-472 cover exactly the 10 planned RP15 units from RP15.P07.M05.S17 through RP15.P07.M06.S04?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-472 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp472CloseoutHandoff() {
  return freezeCp472Validation({
    handoff_id: "CP00-472-to-CP00-473",
    from_pack_id: ANALYTICS_CORE_CP472_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP472_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP472_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP472_PACK_BINDING.range,
    open_scope: "Continue RP15.P07.M06.S05 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP472_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp473Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP473_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp473CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp473Validation({
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

export function validateAnalyticsCoreCp473Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-473 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP473_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-473");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP473_PACK_BINDING.risk_class) errors.push("CP00-473 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP473_PACK_BINDING.unit_count) errors.push("CP00-473 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP473_PACK_BINDING.first_unit_id) errors.push("CP00-473 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP473_PACK_BINDING.last_unit_id) errors.push("CP00-473 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-473 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-473 must only include RP15 units");
  const summary = createAnalyticsCoreCp473CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-473 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-473 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-473 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-473 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-473 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-473 ${microId} missing row ${title}`);
    }
  }
  return freezeCp473Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(
  descriptor = createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_foundation_case_set ?? createAnalyticsCoreCp473P07CloseoutP08FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp473P07CloseoutP08FoundationDescriptor") errors.push("CP00-473 descriptor type drift");
  if (descriptor.source_p07_permission_fixture_slice_descriptor !== "AnalyticsCoreCp472P07PermissionFixtureSliceDescriptor") {
    errors.push("CP00-473 source p07 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP473_REQUIREMENTS.required_section_rows).length) errors.push("CP00-473 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP473_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-473 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-473 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-473 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-473 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-473 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-473 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-473 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-473 must not promote Claude");
  if (ANALYTICS_CORE_CP473_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-473 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-473 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-473 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP473_PACK_BINDING.pack_id, ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-473 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-473 contract p07_closeout_p08_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP473_PACK_BINDING.next_pack_id) errors.push("CP00-473 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP473_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-473 next subphase drift");
  }
  return freezeCp473Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp473HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp473Coverage(planPack);
  const slice = validateAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(descriptor, contractProjection);
  return freezeCp473Validation({
    evidence_packet: "H15.CP00-473.analytics_core_p07_closeout_p08_foundation_descriptor",
    gate: ANALYTICS_CORE_CP473_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_foundation_valid: slice.valid,
    no_real_data: true,
    source_p07_permission_fixture_slice_pack_id: ANALYTICS_CORE_CP473_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP473_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP473_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP473_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp473ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp473Coverage(planPack);
  const slice = validateAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(createAnalyticsCoreCp473P07CloseoutP08FoundationDescriptor(), {});
  return freezeCp473Validation({
    review_packet: "C15.CP00-473.analytics_core_p07_closeout_p08_foundation_descriptor",
    gate: ANALYTICS_CORE_CP473_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP473_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP473_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-473 cover exactly the 150 planned RP15 units from RP15.P07.M06.S05 through RP15.P08.M03.S21?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-473 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp473CloseoutHandoff() {
  return freezeCp473Validation({
    handoff_id: "CP00-473-to-CP00-474",
    from_pack_id: ANALYTICS_CORE_CP473_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP473_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP473_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP473_PACK_BINDING.range,
    open_scope: "Continue RP15.P08.M03.S22 onward with the remaining secondary workflow rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP473_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp474Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP474_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp474CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp474Validation({
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

export function validateAnalyticsCoreCp474Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-474 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP474_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-474");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP474_PACK_BINDING.risk_class) errors.push("CP00-474 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP474_PACK_BINDING.unit_count) errors.push("CP00-474 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP474_PACK_BINDING.first_unit_id) errors.push("CP00-474 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP474_PACK_BINDING.last_unit_id) errors.push("CP00-474 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-474 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-474 must only include RP15 units");
  const summary = createAnalyticsCoreCp474CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-474 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-474 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-474 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-474 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-474 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-474 ${microId} missing row ${title}`);
    }
  }
  return freezeCp474Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(
  descriptor = createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_workflow_permission_slice_case_set ?? createAnalyticsCoreCp474P08WorkflowPermissionSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor") errors.push("CP00-474 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_foundation_descriptor !== "AnalyticsCoreCp473P07CloseoutP08FoundationDescriptor") {
    errors.push("CP00-474 source p07 closeout p08 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP474_REQUIREMENTS.required_section_rows).length) errors.push("CP00-474 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP474_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-474 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-474 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-474 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-474 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-474 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-474 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-474 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-474 must not promote Claude");
  if (ANALYTICS_CORE_CP474_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-474 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-474 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-474 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP474_PACK_BINDING.pack_id, ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-474 contract current_pack drift");
  }
  if (
    contractProjection?.p08_workflow_permission_slice_descriptor?.descriptor &&
    contractProjection.p08_workflow_permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-474 contract p08_workflow_permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP474_PACK_BINDING.next_pack_id) errors.push("CP00-474 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP474_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-474 next subphase drift");
  }
  return freezeCp474Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp474HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp474Coverage(planPack);
  const slice = validateAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp474Validation({
    evidence_packet: "H15.CP00-474.analytics_core_p08_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP474_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_workflow_permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_closeout_p08_foundation_pack_id: ANALYTICS_CORE_CP474_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP474_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP474_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP474_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp474ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp474Coverage(planPack);
  const slice = validateAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(createAnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor(), {});
  return freezeCp474Validation({
    review_packet: "C15.CP00-474.analytics_core_p08_workflow_permission_slice_descriptor",
    gate: ANALYTICS_CORE_CP474_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP474_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_workflow_permission_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP474_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-474 cover exactly the 40 planned RP15 units from RP15.P08.M03.S22 through RP15.P08.M05.S19?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-474 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp474CloseoutHandoff() {
  return freezeCp474Validation({
    handoff_id: "CP00-474-to-CP00-475",
    from_pack_id: ANALYTICS_CORE_CP474_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP474_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP474_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP474_PACK_BINDING.range,
    open_scope: "Continue RP15.P08.M05.S20 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP474_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp475Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP475_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp475CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp475Validation({
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

export function validateAnalyticsCoreCp475Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-475 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP475_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-475");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP475_PACK_BINDING.risk_class) errors.push("CP00-475 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP475_PACK_BINDING.unit_count) errors.push("CP00-475 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP475_PACK_BINDING.first_unit_id) errors.push("CP00-475 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP475_PACK_BINDING.last_unit_id) errors.push("CP00-475 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-475 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-475 must only include RP15 units");
  const summary = createAnalyticsCoreCp475CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-475 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-475 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-475 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-475 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-475 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-475 ${microId} missing row ${title}`);
    }
  }
  return freezeCp475Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_permission_fixture_slice_case_set ?? createAnalyticsCoreCp475P08PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp475P08PermissionFixtureSliceDescriptor") errors.push("CP00-475 descriptor type drift");
  if (descriptor.source_p08_workflow_permission_slice_descriptor !== "AnalyticsCoreCp474P08WorkflowPermissionSliceDescriptor") {
    errors.push("CP00-475 source p08 workflow permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP475_REQUIREMENTS.required_section_rows).length) errors.push("CP00-475 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP475_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-475 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-475 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-475 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-475 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-475 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-475 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-475 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-475 must not promote Claude");
  if (ANALYTICS_CORE_CP475_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-475 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-475 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-475 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP475_PACK_BINDING.pack_id, ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-475 contract current_pack drift");
  }
  if (
    contractProjection?.p08_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p08_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-475 contract p08_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP475_PACK_BINDING.next_pack_id) errors.push("CP00-475 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP475_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-475 next subphase drift");
  }
  return freezeCp475Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp475HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp475Coverage(planPack);
  const slice = validateAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp475Validation({
    evidence_packet: "H15.CP00-475.analytics_core_p08_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP475_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_workflow_permission_slice_pack_id: ANALYTICS_CORE_CP475_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP475_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP475_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP475_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp475ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp475Coverage(planPack);
  const slice = validateAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(createAnalyticsCoreCp475P08PermissionFixtureSliceDescriptor(), {});
  return freezeCp475Validation({
    review_packet: "C15.CP00-475.analytics_core_p08_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP475_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP475_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP475_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-475 cover exactly the 10 planned RP15 units from RP15.P08.M05.S20 through RP15.P08.M06.S07?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-475 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp475CloseoutHandoff() {
  return freezeCp475Validation({
    handoff_id: "CP00-475-to-CP00-476",
    from_pack_id: ANALYTICS_CORE_CP475_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP475_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP475_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP475_PACK_BINDING.range,
    open_scope: "Continue RP15.P08.M06.S08 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP475_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp476Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP476_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp476CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp476Validation({
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

export function validateAnalyticsCoreCp476Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-476 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP476_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-476");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP476_PACK_BINDING.risk_class) errors.push("CP00-476 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP476_PACK_BINDING.unit_count) errors.push("CP00-476 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP476_PACK_BINDING.first_unit_id) errors.push("CP00-476 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP476_PACK_BINDING.last_unit_id) errors.push("CP00-476 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-476 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-476 must only include RP15 units");
  const summary = createAnalyticsCoreCp476CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-476 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-476 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-476 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-476 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-476 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-476 ${microId} missing row ${title}`);
    }
  }
  return freezeCp476Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp476P08FixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp476P08FixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_fixture_slice_case_set ?? createAnalyticsCoreCp476P08FixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp476P08FixtureSliceDescriptor") errors.push("CP00-476 descriptor type drift");
  if (descriptor.source_p08_permission_fixture_slice_descriptor !== "AnalyticsCoreCp475P08PermissionFixtureSliceDescriptor") {
    errors.push("CP00-476 source p08 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP476_REQUIREMENTS.required_section_rows).length) errors.push("CP00-476 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP476_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-476 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-476 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-476 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-476 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-476 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-476 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-476 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-476 must not promote Claude");
  if (ANALYTICS_CORE_CP476_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-476 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-476 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-476 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP476_PACK_BINDING.pack_id, ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-476 contract current_pack drift");
  }
  if (
    contractProjection?.p08_fixture_slice_descriptor?.descriptor &&
    contractProjection.p08_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-476 contract p08_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP476_PACK_BINDING.next_pack_id) errors.push("CP00-476 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP476_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-476 next subphase drift");
  }
  return freezeCp476Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp476HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp476P08FixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp476Coverage(planPack);
  const slice = validateAnalyticsCoreCp476P08FixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp476Validation({
    evidence_packet: "H15.CP00-476.analytics_core_p08_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP476_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_permission_fixture_slice_pack_id: ANALYTICS_CORE_CP476_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP476_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP476_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP476_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp476ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp476Coverage(planPack);
  const slice = validateAnalyticsCoreCp476P08FixtureSliceDescriptor(createAnalyticsCoreCp476P08FixtureSliceDescriptor(), {});
  return freezeCp476Validation({
    review_packet: "C15.CP00-476.analytics_core_p08_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP476_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP476_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP476_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-476 cover exactly the 10 planned RP15 units from RP15.P08.M06.S08 through RP15.P08.M06.S17?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-476 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp476CloseoutHandoff() {
  return freezeCp476Validation({
    handoff_id: "CP00-476-to-CP00-477",
    from_pack_id: ANALYTICS_CORE_CP476_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP476_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP476_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP476_PACK_BINDING.range,
    open_scope: "Continue RP15.P08.M06.S18 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP476_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp477Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP477_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp477CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp477Validation({
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

export function validateAnalyticsCoreCp477Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-477 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP477_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-477");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP477_PACK_BINDING.risk_class) errors.push("CP00-477 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP477_PACK_BINDING.unit_count) errors.push("CP00-477 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP477_PACK_BINDING.first_unit_id) errors.push("CP00-477 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP477_PACK_BINDING.last_unit_id) errors.push("CP00-477 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-477 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-477 must only include RP15 units");
  const summary = createAnalyticsCoreCp477CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-477 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-477 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-477 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-477 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-477 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-477 ${microId} missing row ${title}`);
    }
  }
  return freezeCp477Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(
  descriptor = createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_foundation_case_set ?? createAnalyticsCoreCp477P08CloseoutP09FoundationCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp477P08CloseoutP09FoundationDescriptor") errors.push("CP00-477 descriptor type drift");
  if (descriptor.source_p08_fixture_slice_descriptor !== "AnalyticsCoreCp476P08FixtureSliceDescriptor") {
    errors.push("CP00-477 source p08 fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP477_REQUIREMENTS.required_section_rows).length) errors.push("CP00-477 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP477_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-477 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-477 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-477 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-477 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-477 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-477 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-477 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-477 must not promote Claude");
  if (ANALYTICS_CORE_CP477_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-477 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-477 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-477 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP477_PACK_BINDING.pack_id, ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-477 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-477 contract p08_closeout_p09_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP477_PACK_BINDING.next_pack_id) errors.push("CP00-477 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP477_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-477 next subphase drift");
  }
  return freezeCp477Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp477HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp477Coverage(planPack);
  const slice = validateAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(descriptor, contractProjection);
  return freezeCp477Validation({
    evidence_packet: "H15.CP00-477.analytics_core_p08_closeout_p09_foundation_descriptor",
    gate: ANALYTICS_CORE_CP477_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_foundation_valid: slice.valid,
    no_real_data: true,
    source_p08_fixture_slice_pack_id: ANALYTICS_CORE_CP477_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP477_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP477_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP477_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp477ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp477Coverage(planPack);
  const slice = validateAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(createAnalyticsCoreCp477P08CloseoutP09FoundationDescriptor(), {});
  return freezeCp477Validation({
    review_packet: "C15.CP00-477.analytics_core_p08_closeout_p09_foundation_descriptor",
    gate: ANALYTICS_CORE_CP477_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP477_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_foundation_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP477_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-477 cover exactly the 150 planned RP15 units from RP15.P08.M06.S18 through RP15.P09.M05.S17?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-477 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp477CloseoutHandoff() {
  return freezeCp477Validation({
    handoff_id: "CP00-477-to-CP00-478",
    from_pack_id: ANALYTICS_CORE_CP477_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP477_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP477_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP477_PACK_BINDING.range,
    open_scope: "Continue RP15.P09.M05.S18 onward with the remaining permission and audit binding rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP477_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp478Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP478_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp478CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp478Validation({
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

export function validateAnalyticsCoreCp478Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-478 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP478_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-478");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP478_PACK_BINDING.risk_class) errors.push("CP00-478 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP478_PACK_BINDING.unit_count) errors.push("CP00-478 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP478_PACK_BINDING.first_unit_id) errors.push("CP00-478 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP478_PACK_BINDING.last_unit_id) errors.push("CP00-478 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-478 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-478 must only include RP15 units");
  const summary = createAnalyticsCoreCp478CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-478 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-478 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-478 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-478 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-478 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-478 ${microId} missing row ${title}`);
    }
  }
  return freezeCp478Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(
  descriptor = createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_permission_fixture_slice_case_set ?? createAnalyticsCoreCp478P09PermissionFixtureSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp478P09PermissionFixtureSliceDescriptor") errors.push("CP00-478 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_foundation_descriptor !== "AnalyticsCoreCp477P08CloseoutP09FoundationDescriptor") {
    errors.push("CP00-478 source p08 closeout p09 foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP478_REQUIREMENTS.required_section_rows).length) errors.push("CP00-478 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP478_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-478 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-478 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-478 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-478 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-478 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-478 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-478 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-478 must not promote Claude");
  if (ANALYTICS_CORE_CP478_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-478 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-478 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-478 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![ANALYTICS_CORE_CP478_PACK_BINDING.pack_id, ANALYTICS_CORE_CP479_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-478 contract current_pack drift");
  }
  if (
    contractProjection?.p09_permission_fixture_slice_descriptor?.descriptor &&
    contractProjection.p09_permission_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-478 contract p09_permission_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP478_PACK_BINDING.next_pack_id) errors.push("CP00-478 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP478_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-478 next subphase drift");
  }
  return freezeCp478Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp478HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp478Coverage(planPack);
  const slice = validateAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp478Validation({
    evidence_packet: "H15.CP00-478.analytics_core_p09_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP478_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_permission_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_foundation_pack_id: ANALYTICS_CORE_CP478_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP478_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP478_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP478_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp478ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp478Coverage(planPack);
  const slice = validateAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(createAnalyticsCoreCp478P09PermissionFixtureSliceDescriptor(), {});
  return freezeCp478Validation({
    review_packet: "C15.CP00-478.analytics_core_p09_permission_fixture_slice_descriptor",
    gate: ANALYTICS_CORE_CP478_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP478_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_permission_fixture_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP478_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-478 cover exactly the 10 planned RP15 units from RP15.P09.M05.S18 through RP15.P09.M06.S07?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-478 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp478CloseoutHandoff() {
  return freezeCp478Validation({
    handoff_id: "CP00-478-to-CP00-479",
    from_pack_id: ANALYTICS_CORE_CP478_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP478_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP478_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP478_PACK_BINDING.range,
    open_scope: "Continue RP15.P09.M06.S08 onward with the remaining synthetic fixture rows and downstream micros while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP478_PACK_BINDING.production_ready_flag,
  });
}

function freezeCp479Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ANALYTICS_CORE_CP479_PACK_BINDING.pack_id,
    no_write_attestation: ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION,
  });
}

export function createAnalyticsCoreCp479CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp479Validation({
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

export function validateAnalyticsCoreCp479Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-479 plan pack is required");
  if (planPack?.pack_id !== ANALYTICS_CORE_CP479_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-479");
  if (planPack?.risk_class !== ANALYTICS_CORE_CP479_PACK_BINDING.risk_class) errors.push("CP00-479 risk class drift");
  if (planPack?.unit_count !== ANALYTICS_CORE_CP479_PACK_BINDING.unit_count) errors.push("CP00-479 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ANALYTICS_CORE_CP479_PACK_BINDING.first_unit_id) errors.push("CP00-479 first unit drift");
  if (unitIds.at(-1) !== ANALYTICS_CORE_CP479_PACK_BINDING.last_unit_id) errors.push("CP00-479 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-479 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP15")) errors.push("CP00-479 must only include RP15 units");
  const summary = createAnalyticsCoreCp479CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-479 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-479 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-479 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-479 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-479 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-479 ${microId} missing row ${title}`);
    }
  }
  return freezeCp479Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateAnalyticsCoreCp479P09CloseoutSliceDescriptor(
  descriptor = createAnalyticsCoreCp479P09CloseoutSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_closeout_slice_case_set ?? createAnalyticsCoreCp479P09CloseoutSliceCaseSet();
  if (descriptor.descriptor !== "AnalyticsCoreCp479P09CloseoutSliceDescriptor") errors.push("CP00-479 descriptor type drift");
  if (descriptor.source_p09_permission_fixture_slice_descriptor !== "AnalyticsCoreCp478P09PermissionFixtureSliceDescriptor") {
    errors.push("CP00-479 source p09 permission fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(ANALYTICS_CORE_CP479_REQUIREMENTS.required_section_rows).length) errors.push("CP00-479 section count drift");
  for (const [microId, titles] of Object.entries(ANALYTICS_CORE_CP479_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-479 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-479 ${microId} row count drift`);
    for (const title of titles) {
      const key = analyticsCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-479 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-479 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-479 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-479 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-479 ${microId} ${key} must not include raw payload`);
    }
  }
  if (ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-479 must not promote Claude");
  if (ANALYTICS_CORE_CP479_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-479 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-479 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-479 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== ANALYTICS_CORE_CP479_PACK_BINDING.pack_id) {
    errors.push("CP00-479 contract current_pack drift");
  }
  if (
    contractProjection?.p09_closeout_slice_descriptor?.descriptor &&
    contractProjection.p09_closeout_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-479 contract p09_closeout_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ANALYTICS_CORE_CP479_PACK_BINDING.next_pack_id) errors.push("CP00-479 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ANALYTICS_CORE_CP479_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-479 next subphase drift");
  }
  return freezeCp479Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createAnalyticsCoreCp479HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createAnalyticsCoreCp479P09CloseoutSliceDescriptor(),
) {
  const coverage = validateAnalyticsCoreCp479Coverage(planPack);
  const slice = validateAnalyticsCoreCp479P09CloseoutSliceDescriptor(descriptor, contractProjection);
  return freezeCp479Validation({
    evidence_packet: "H15.CP00-479.analytics_core_p09_closeout_slice_descriptor",
    gate: ANALYTICS_CORE_CP479_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_closeout_slice_valid: slice.valid,
    no_real_data: true,
    source_p09_permission_fixture_slice_pack_id: ANALYTICS_CORE_CP479_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: ANALYTICS_CORE_CP479_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: ANALYTICS_CORE_CP479_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP479_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createAnalyticsCoreCp479ClaudeReviewPacket(planPack) {
  const coverage = validateAnalyticsCoreCp479Coverage(planPack);
  const slice = validateAnalyticsCoreCp479P09CloseoutSliceDescriptor(createAnalyticsCoreCp479P09CloseoutSliceDescriptor(), {});
  return freezeCp479Validation({
    review_packet: "C15.CP00-479.analytics_core_p09_closeout_slice_descriptor",
    gate: ANALYTICS_CORE_CP479_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: ANALYTICS_CORE_CP479_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_closeout_slice_valid: slice.valid,
    invalid_review_blockers: ANALYTICS_CORE_CP479_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-479 cover exactly the 65 planned RP15 units from RP15.P09.M06.S08 through RP15.P09.M10.S04?",
      "Do the descriptor sections cover every planned row title as a descriptor-only row with the shared analytics guards applied?",
      "Does CP00-479 avoid state writes, permission bypass, validation error leaks, real fixture data, test runtime paths, Hermes runtime receipts, cross-tenant access, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createAnalyticsCoreCp479CloseoutHandoff() {
  return freezeCp479Validation({
    handoff_id: "CP00-479-to-CP00-480",
    from_pack_id: ANALYTICS_CORE_CP479_PACK_BINDING.pack_id,
    to_pack_id: ANALYTICS_CORE_CP479_PACK_BINDING.next_pack_id,
    next_subphase_id: ANALYTICS_CORE_CP479_PACK_BINDING.next_subphase_id,
    closed_scope: ANALYTICS_CORE_CP479_PACK_BINDING.range,
    open_scope: "Continue RP16.P00.M00.S01 onward with the next program while preserving descriptor-only analytics boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: ANALYTICS_CORE_CP479_PACK_BINDING.production_ready_flag,
  });
}
