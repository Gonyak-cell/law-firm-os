import {
  TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP342_PACK_BINDING,
  TIME_EXPENSE_CORE_CP342_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP343_PACK_BINDING,
  TIME_EXPENSE_CORE_CP343_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP344_PACK_BINDING,
  TIME_EXPENSE_CORE_CP344_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP345_PACK_BINDING,
  TIME_EXPENSE_CORE_CP345_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP346_PACK_BINDING,
  TIME_EXPENSE_CORE_CP346_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP347_PACK_BINDING,
  TIME_EXPENSE_CORE_CP347_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP348_PACK_BINDING,
  TIME_EXPENSE_CORE_CP348_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP349_PACK_BINDING,
  TIME_EXPENSE_CORE_CP349_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP350_PACK_BINDING,
  TIME_EXPENSE_CORE_CP350_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP351_PACK_BINDING,
  TIME_EXPENSE_CORE_CP351_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP352_PACK_BINDING,
  TIME_EXPENSE_CORE_CP352_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP353_PACK_BINDING,
  TIME_EXPENSE_CORE_CP353_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP354_PACK_BINDING,
  TIME_EXPENSE_CORE_CP354_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP355_PACK_BINDING,
  TIME_EXPENSE_CORE_CP355_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP356_PACK_BINDING,
  TIME_EXPENSE_CORE_CP356_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP357_PACK_BINDING,
  TIME_EXPENSE_CORE_CP357_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP358_PACK_BINDING,
  TIME_EXPENSE_CORE_CP358_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP359_PACK_BINDING,
  TIME_EXPENSE_CORE_CP359_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP360_PACK_BINDING,
  TIME_EXPENSE_CORE_CP360_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP361_PACK_BINDING,
  TIME_EXPENSE_CORE_CP361_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP362_PACK_BINDING,
  TIME_EXPENSE_CORE_CP362_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP363_PACK_BINDING,
  TIME_EXPENSE_CORE_CP363_REQUIREMENTS,
} from "./registry.js";
import {
  createTimeExpenseCoreCp342ScopeContractFoundationCaseSet,
  createTimeExpenseCoreCp342ScopeContractFoundationDescriptor,
  createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet,
  createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor,
  createTimeExpenseCoreCp344ServiceSliceCaseSet,
  createTimeExpenseCoreCp344ServiceSliceDescriptor,
  createTimeExpenseCoreCp345ServiceBindingSliceCaseSet,
  createTimeExpenseCoreCp345ServiceBindingSliceDescriptor,
  createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet,
  createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  createTimeExpenseCoreCp347UiWorkflowSliceCaseSet,
  createTimeExpenseCoreCp347UiWorkflowSliceDescriptor,
  createTimeExpenseCoreCp348UiBindingSliceCaseSet,
  createTimeExpenseCoreCp348UiBindingSliceDescriptor,
  createTimeExpenseCoreCp349UiBindingTailCaseSet,
  createTimeExpenseCoreCp349UiBindingTailDescriptor,
  createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet,
  createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor,
  createTimeExpenseCoreCp351FixtureSliceCaseSet,
  createTimeExpenseCoreCp351FixtureSliceDescriptor,
  createTimeExpenseCoreCp352FixtureBindingSliceCaseSet,
  createTimeExpenseCoreCp352FixtureBindingSliceDescriptor,
  createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet,
  createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor,
  createTimeExpenseCoreCp354PermissionSliceCaseSet,
  createTimeExpenseCoreCp354PermissionSliceDescriptor,
  createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet,
  createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor,
  createTimeExpenseCoreCp356FailureSliceCaseSet,
  createTimeExpenseCoreCp356FailureSliceDescriptor,
  createTimeExpenseCoreCp357FailureBindingSliceCaseSet,
  createTimeExpenseCoreCp357FailureBindingSliceDescriptor,
  createTimeExpenseCoreCp358FailureTailSliceCaseSet,
  createTimeExpenseCoreCp358FailureTailSliceDescriptor,
  createTimeExpenseCoreCp359FailureFixtureSliceCaseSet,
  createTimeExpenseCoreCp359FailureFixtureSliceDescriptor,
  createTimeExpenseCoreCp360FailureHermesSliceCaseSet,
  createTimeExpenseCoreCp360FailureHermesSliceDescriptor,
  createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet,
  createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor,
  createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet,
  createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor,
  createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet,
  createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor,
  timeExpenseCoreRowKey,
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

function freezeCp342Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION,
  });
}

function freezeCp343Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION,
  });
}

function freezeCp344Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION,
  });
}

function freezeCp345Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION,
  });
}

function freezeCp346Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION,
  });
}

function freezeCp347Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION,
  });
}

function freezeCp348Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION,
  });
}

function freezeCp349Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION,
  });
}

function freezeCp350Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION,
  });
}

function freezeCp351Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION,
  });
}

function freezeCp352Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION,
  });
}

function freezeCp353Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION,
  });
}

function freezeCp354Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION,
  });
}

function freezeCp355Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION,
  });
}

function freezeCp356Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION,
  });
}

function freezeCp357Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION,
  });
}

function freezeCp358Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION,
  });
}

function freezeCp359Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION,
  });
}

function freezeCp360Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION,
  });
}

function freezeCp361Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION,
  });
}

function freezeCp362Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION,
  });
}

function freezeCp363Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    no_write_attestation: TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION,
  });
}

export function createTimeExpenseCoreCp342CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp342Validation({
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

export function validateTimeExpenseCoreCp342Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-342 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-342");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.risk_class) errors.push("CP00-342 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.unit_count) errors.push("CP00-342 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.first_unit_id) errors.push("CP00-342 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.last_unit_id) errors.push("CP00-342 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-342 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-342 must only include RP11 units");
  const summary = createTimeExpenseCoreCp342CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-342 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-342 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-342 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-342 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-342 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-342 ${microId} missing row ${title}`);
    }
  }
  return freezeCp342Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp342ScopeContractFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp342ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createTimeExpenseCoreCp342ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp342ScopeContractFoundationDescriptor") errors.push("CP00-342 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP11") errors.push("CP00-342 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP10") errors.push("CP00-342 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows).length) errors.push("CP00-342 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-342 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-342 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-342 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-342 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-342 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-342 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-342 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.non_goal_boundary && rows.non_goal_boundary.time_entry_runtime_opened !== false) {
      errors.push(`CP00-342 ${microId} must not open time entry runtime`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.permission_decision_detail_included !== false) {
      errors.push(`CP00-342 ${microId} permission baseline must not expose decisions`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-342 ${microId} permission baseline must deny cross-tenant access`);
    }
    if (rows.audit_baseline_note && rows.audit_baseline_note.audit_event_body_included !== false) {
      errors.push(`CP00-342 ${microId} audit baseline must not expose event bodies`);
    }
    if (rows.synthetic_data_policy && rows.synthetic_data_policy.real_client_data_loaded !== false) {
      errors.push(`CP00-342 ${microId} synthetic data policy drift`);
    }
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-342 ${microId} tenant scope must deny cross-tenant access`);
    }
    if (rows.matter_trace_reference && rows.matter_trace_reference.matter_trace_required !== true) {
      errors.push(`CP00-342 ${microId} matter trace must be required`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-342 ${microId} state transition map must not write state`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-342 ${microId} fixture model must not load real data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-342 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-342 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-342 ${microId} must not claim Claude final approval`);
    }
  }
  if (TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-342 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-342 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-342 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-342 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-342 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-342 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_pack_id) errors.push("CP00-342 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-342 next subphase drift");
  }
  return freezeCp342Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp342HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp342ScopeContractFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp342Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp342ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp342Validation({
    evidence_packet: "H11.CP00-342.time_expense_core_scope_contract_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP342_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_intake_core_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp342ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp342Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp342ScopeContractFoundationDescriptor(createTimeExpenseCoreCp342ScopeContractFoundationDescriptor(), {});
  return freezeCp342Validation({
    review_packet: "C11.CP00-342.time_expense_core_scope_contract_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP342_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP342_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-342 cover exactly the 150 planned RP11 units from RP11.P00.M00.S01 through RP11.P01.M08.S05?",
      "Do the twenty descriptor sections (P00 M00-M10 scope foundation cycle and P01 M00-M08 model foundation cycle with package directory layout, primary entity identifier, tenant scope field, matter trace reference, lifecycle status enum, ownership metadata, reference relationship map, field registries, state transition map, validation helper, fixture model, serialization shape, public export, model tests, Hermes model summary, Claude model review prompt, and closeout handoff) cover every planned row title as descriptor-only rows?",
      "Does CP00-342 avoid time-entry/rate-card/expense/disbursement runtime, runtime permission evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, real data, permission decision leaks, audit event body leaks, fixture payload leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp342CloseoutHandoff() {
  return freezeCp342Validation({
    handoff_id: "CP00-342-to-CP00-343",
    from_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP342_PACK_BINDING.range,
    open_scope: "Continue RP11.P01.M08.S06 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP342_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp343CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp343Validation({
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

export function validateTimeExpenseCoreCp343Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-343 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-343");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.risk_class) errors.push("CP00-343 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.unit_count) errors.push("CP00-343 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.first_unit_id) errors.push("CP00-343 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.last_unit_id) errors.push("CP00-343 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-343 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-343 must only include RP11 units");
  const summary = createTimeExpenseCoreCp343CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-343 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-343 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-343 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-343 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-343 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-343 ${microId} missing row ${title}`);
    }
  }
  return freezeCp343Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_service_foundation_case_set ?? createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor") errors.push("CP00-343 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "TimeExpenseCoreCp342ScopeContractFoundationDescriptor") {
    errors.push("CP00-343 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows).length) errors.push("CP00-343 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-343 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-343 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-343 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-343 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-343 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-343 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-343 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-343 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.matter_trace_precheck && rows.matter_trace_precheck.matter_trace_required !== true) {
      errors.push(`CP00-343 ${microId} matter trace must be required`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-343 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-343 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-343 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-343 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-343 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-343 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-343 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-343 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-343 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-343 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-343 ${microId} must not execute test runtime`);
    }
    if (rows.integration_smoke_case && rows.integration_smoke_case.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-343 ${microId} must not dispatch integration smoke runtime`);
    }
  }
  if (TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-343 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-343 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-343 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-343 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-343 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_service_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_service_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-343 contract p01_closeout_p02_service_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_pack_id) errors.push("CP00-343 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-343 next subphase drift");
  }
  return freezeCp343Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp343HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp343Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(descriptor, contractProjection);
  return freezeCp343Validation({
    evidence_packet: "H11.CP00-343.time_expense_core_p01_closeout_p02_service_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP343_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp343ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp343Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(), {});
  return freezeCp343Validation({
    review_packet: "C11.CP00-343.time_expense_core_p01_closeout_p02_service_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP343_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP343_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-343 cover exactly the 150 planned RP11 units from RP11.P01.M08.S06 through RP11.P02.M07.S10?",
      "Do the eleven descriptor sections (P01 M08 Hermes tail, M09 Claude review packet, M10 closeout head, and eight P02 service micros with service entrypoint contracts, request normalization, tenant/matter/permission/audit prechecks, happy and workflow paths, state transition enforcement, idempotency key handling, lock acquisition rules, persistence boundaries, validation error mapping, review/approval routing, blocked-claim outputs, rollback/retry behavior, unit tests, and integration smoke cases) cover every planned row title as descriptor-only rows?",
      "Does CP00-343 avoid time-entry/rate-card/expense/disbursement runtime, runtime permission evaluation, state writes, idempotency key persistence, runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, integration smoke runtime, Hermes runtime receipts, permission decision leaks, audit hint leaks, validation error leaks, blocked-claim detail leaks, lock token leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp343CloseoutHandoff() {
  return freezeCp343Validation({
    handoff_id: "CP00-343-to-CP00-344",
    from_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP343_PACK_BINDING.range,
    open_scope: "RP11.P01 descriptor scope is closed; continue RP11.P02.M07.S11 onward with the remaining service rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP343_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp344CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp344Validation({
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

export function validateTimeExpenseCoreCp344Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-344 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-344");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.risk_class) errors.push("CP00-344 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.unit_count) errors.push("CP00-344 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.first_unit_id) errors.push("CP00-344 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.last_unit_id) errors.push("CP00-344 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-344 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-344 must only include RP11 units");
  const summary = createTimeExpenseCoreCp344CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-344 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-344 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-344 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-344 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-344 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-344 ${microId} missing row ${title}`);
    }
  }
  return freezeCp344Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp344ServiceSliceDescriptor(
  descriptor = createTimeExpenseCoreCp344ServiceSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_slice_case_set ?? createTimeExpenseCoreCp344ServiceSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp344ServiceSliceDescriptor") errors.push("CP00-344 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_service_foundation_descriptor !== "TimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor") {
    errors.push("CP00-344 source p01 closeout p02 service foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows).length) errors.push("CP00-344 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-344 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-344 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-344 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-344 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-344 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-344 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-344 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-344 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-344 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-344 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-344 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-344 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-344 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-344 ${microId} must not execute test runtime`);
    }
    if (rows.unit_test_denied_path && rows.unit_test_denied_path.expected_outcome !== "denied_customer_safe") {
      errors.push(`CP00-344 ${microId} denied path outcome drift`);
    }
  }
  if (TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-344 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-344 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-344 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-344 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-344 contract current_pack drift");
  }
  if (
    contractProjection?.service_slice_descriptor?.descriptor &&
    contractProjection.service_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-344 contract service_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_pack_id) errors.push("CP00-344 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-344 next subphase drift");
  }
  return freezeCp344Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp344HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp344ServiceSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp344Coverage(planPack);
  const slice = validateTimeExpenseCoreCp344ServiceSliceDescriptor(descriptor, contractProjection);
  return freezeCp344Validation({
    evidence_packet: "H11.CP00-344.time_expense_core_service_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP344_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_service_foundation_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp344ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp344Coverage(planPack);
  const slice = validateTimeExpenseCoreCp344ServiceSliceDescriptor(createTimeExpenseCoreCp344ServiceSliceDescriptor(), {});
  return freezeCp344Validation({
    review_packet: "C11.CP00-344.time_expense_core_service_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP344_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP344_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-344 cover exactly the 10 planned RP11 units from RP11.P02.M07.S11 through RP11.P02.M07.S20?",
      "Does the single descriptor section (M07 test/golden tail with lock acquisition rule, persistence boundary, validation error mapping, review/approval-required routing, blocked-claim output, rollback/retry behavior, and happy/denied unit tests) cover every planned row title as a descriptor-only row, with the shared service guards applied?",
      "Does CP00-344 avoid runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, validation error leaks, blocked-claim detail leaks, lock token leaks, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp344CloseoutHandoff() {
  return freezeCp344Validation({
    handoff_id: "CP00-344-to-CP00-345",
    from_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP344_PACK_BINDING.range,
    open_scope: "Continue RP11.P02.M07.S21 onward with the remaining service test rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP344_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp345CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp345Validation({
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

export function validateTimeExpenseCoreCp345Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-345 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-345");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.risk_class) errors.push("CP00-345 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.unit_count) errors.push("CP00-345 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.first_unit_id) errors.push("CP00-345 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.last_unit_id) errors.push("CP00-345 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-345 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-345 must only include RP11 units");
  const summary = createTimeExpenseCoreCp345CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-345 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-345 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-345 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-345 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-345 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-345 ${microId} missing row ${title}`);
    }
  }
  return freezeCp345Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp345ServiceBindingSliceDescriptor(
  descriptor = createTimeExpenseCoreCp345ServiceBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_binding_slice_case_set ?? createTimeExpenseCoreCp345ServiceBindingSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp345ServiceBindingSliceDescriptor") errors.push("CP00-345 descriptor type drift");
  if (descriptor.source_service_slice_descriptor !== "TimeExpenseCoreCp344ServiceSliceDescriptor") {
    errors.push("CP00-345 source service slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows).length) errors.push("CP00-345 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-345 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-345 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-345 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-345 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-345 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-345 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-345 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.unit_test_review_path && rows.unit_test_review_path.expected_outcome !== "review_required") {
      errors.push(`CP00-345 ${microId} review path outcome drift`);
    }
    if (rows.integration_smoke_case && rows.integration_smoke_case.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-345 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-345 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-345 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-345 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-345 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-345 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-345 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-345 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-345 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-345 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-345 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-345 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-345 ${microId} must not execute test runtime`);
    }
  }
  if (TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-345 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-345 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-345 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-345 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-345 contract current_pack drift");
  }
  if (
    contractProjection?.service_binding_slice_descriptor?.descriptor &&
    contractProjection.service_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-345 contract service_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_pack_id) errors.push("CP00-345 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-345 next subphase drift");
  }
  return freezeCp345Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp345HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp345ServiceBindingSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp345Coverage(planPack);
  const slice = validateTimeExpenseCoreCp345ServiceBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp345Validation({
    evidence_packet: "H11.CP00-345.time_expense_core_service_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP345_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_service_slice_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp345ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp345Coverage(planPack);
  const slice = validateTimeExpenseCoreCp345ServiceBindingSliceDescriptor(createTimeExpenseCoreCp345ServiceBindingSliceDescriptor(), {});
  return freezeCp345Validation({
    review_packet: "C11.CP00-345.time_expense_core_service_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP345_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_binding_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP345_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-345 cover exactly the 40 planned RP11 units from RP11.P02.M07.S21 through RP11.P02.M09.S18?",
      "Do the three descriptor sections (M07 test/golden tail with review-path unit test and integration smoke case, M08 full Hermes service cycle, M09 Claude review packet head) cover every planned row title as descriptor-only rows, with the shared service guards applied across every section that carries them?",
      "Does CP00-345 avoid runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, integration smoke runtime, state writes, idempotency key persistence, permission decision leaks, audit hint leaks, validation error leaks, blocked-claim detail leaks, lock token leaks, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp345CloseoutHandoff() {
  return freezeCp345Validation({
    handoff_id: "CP00-345-to-CP00-346",
    from_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP345_PACK_BINDING.range,
    open_scope: "Continue RP11.P02.M09.S19 onward with the remaining service review rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP345_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp346CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp346Validation({
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

export function validateTimeExpenseCoreCp346Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-346 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-346");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.risk_class) errors.push("CP00-346 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.unit_count) errors.push("CP00-346 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.first_unit_id) errors.push("CP00-346 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.last_unit_id) errors.push("CP00-346 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-346 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-346 must only include RP11 units");
  const summary = createTimeExpenseCoreCp346CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-346 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-346 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-346 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-346 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-346 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-346 ${microId} missing row ${title}`);
    }
  }
  return freezeCp346Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_interface_p04_ui_foundation_case_set ?? createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor") errors.push("CP00-346 descriptor type drift");
  if (descriptor.source_service_binding_slice_descriptor !== "TimeExpenseCoreCp345ServiceBindingSliceDescriptor") {
    errors.push("CP00-346 source service binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows).length) errors.push("CP00-346 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-346 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-346 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-346 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-346 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-346 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-346 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-346 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_annotation && rows.permission_annotation.permission_decision_detail_included !== false) {
      errors.push(`CP00-346 ${microId} permission annotation must not expose decisions`);
    }
    if (rows.audit_annotation && rows.audit_annotation.audit_hint_detail_included !== false) {
      errors.push(`CP00-346 ${microId} audit annotation must not expose hints`);
    }
    if (rows.pagination_or_filtering_contract && rows.pagination_or_filtering_contract.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-346 ${microId} pagination must not leak unauthorized counts`);
    }
    if (rows.unauthorized_data_omission && rows.unauthorized_data_omission.unauthorized_data_omitted !== true) {
      errors.push(`CP00-346 ${microId} unauthorized data must be omitted`);
    }
    if (rows.api_fixture && rows.api_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-346 ${microId} API fixture must not load real data`);
    }
    if (rows.contract_test && rows.contract_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-346 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_api_evidence && rows.hermes_api_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-346 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_interface_prompt && rows.claude_interface_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-346 ${microId} must not claim Claude final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-346 ${microId} command rerun must not execute runtime`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-346 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-346 ${microId} denied state must not expose decisions`);
    }
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-346 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-346 ${microId} must not acquire runtime locks`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-346 ${microId} must not execute test runtime paths`);
    }
  }
  if (TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-346 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-346 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-346 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-346 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-346 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_interface_p04_ui_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_interface_p04_ui_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-346 contract p02_closeout_p03_interface_p04_ui_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_pack_id) errors.push("CP00-346 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-346 next subphase drift");
  }
  return freezeCp346Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp346HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp346Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(descriptor, contractProjection);
  return freezeCp346Validation({
    evidence_packet: "H11.CP00-346.time_expense_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP346_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_p04_ui_foundation_valid: foundation.valid,
    no_real_data: true,
    source_service_binding_slice_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp346ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp346Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(), {});
  return freezeCp346Validation({
    review_packet: "C11.CP00-346.time_expense_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP346_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_p04_ui_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP346_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-346 cover exactly the 150 planned RP11 units from RP11.P02.M09.S19 through RP11.P04.M03.S05?",
      "Do the seventeen descriptor sections (P02 M09 test tail and M10 closeout, the full P03 interface cycle M00-M10 with public export maps, request/response contracts, error code taxonomies, permission/audit annotations, pagination contracts with no unauthorized count leak, serialization guards, unauthorized data omission, API fixtures, contract/invalid/denied tests, Hermes API evidence, Claude interface prompts, documentation examples, versioning notes, downstream consumer notes, and command reruns, plus the P04 UI head M00-M03 with UI surface inventories, data dependency maps, and loading/empty/denied/review-required states and interactions) cover every planned row title as descriptor-only rows?",
      "Does CP00-346 avoid API handler execution, UI runtime, test runtime paths, permission decision leaks, audit hint leaks, unauthorized count leaks, fixture payload leaks, state writes, object storage, command runtime execution, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp346CloseoutHandoff() {
  return freezeCp346Validation({
    handoff_id: "CP00-346-to-CP00-347",
    from_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP346_PACK_BINDING.range,
    open_scope: "RP11.P02 and RP11.P03 descriptor scopes are closed; continue RP11.P04.M03.S06 onward with the remaining UI rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP346_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp347CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp347Validation({
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

export function validateTimeExpenseCoreCp347Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-347 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-347");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.risk_class) errors.push("CP00-347 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.unit_count) errors.push("CP00-347 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.first_unit_id) errors.push("CP00-347 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.last_unit_id) errors.push("CP00-347 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-347 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-347 must only include RP11 units");
  const summary = createTimeExpenseCoreCp347CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-347 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-347 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-347 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-347 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-347 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-347 ${microId} missing row ${title}`);
    }
  }
  return freezeCp347Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp347UiWorkflowSliceDescriptor(
  descriptor = createTimeExpenseCoreCp347UiWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_workflow_slice_case_set ?? createTimeExpenseCoreCp347UiWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp347UiWorkflowSliceDescriptor") errors.push("CP00-347 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_interface_p04_ui_foundation_descriptor !== "TimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor") {
    errors.push("CP00-347 source p02 closeout p03 interface p04 ui foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows).length) errors.push("CP00-347 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-347 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-347 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-347 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-347 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-347 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-347 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-347 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-347 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-347 ${microId} audit hint display must not expose hints`);
    }
    if (rows.error_message_copy && rows.error_message_copy.validation_error_detail_included !== false) {
      errors.push(`CP00-347 ${microId} error message copy must be customer-safe`);
    }
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-347 ${microId} fixture binding must not load real data`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-347 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.hermes_ui_evidence && rows.hermes_ui_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-347 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-347 ${microId} UI leak detected`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-347 ${microId} must not claim Claude final approval`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-347 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-347 ${microId} denied state must not expose decisions`);
    }
  }
  if (TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-347 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-347 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-347 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-347 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-347 contract current_pack drift");
  }
  if (
    contractProjection?.ui_workflow_slice_descriptor?.descriptor &&
    contractProjection.ui_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-347 contract ui_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_pack_id) errors.push("CP00-347 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-347 next subphase drift");
  }
  return freezeCp347Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp347HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp347UiWorkflowSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp347Coverage(planPack);
  const slice = validateTimeExpenseCoreCp347UiWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp347Validation({
    evidence_packet: "H11.CP00-347.time_expense_core_ui_workflow_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP347_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_closeout_p03_interface_p04_ui_foundation_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp347ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp347Coverage(planPack);
  const slice = validateTimeExpenseCoreCp347UiWorkflowSliceDescriptor(createTimeExpenseCoreCp347UiWorkflowSliceDescriptor(), {});
  return freezeCp347Validation({
    review_packet: "C11.CP00-347.time_expense_core_ui_workflow_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP347_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP347_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-347 cover exactly the 40 planned RP11 units from RP11.P04.M03.S06 through RP11.P04.M05.S05?",
      "Do the three descriptor sections (M03 primary UI tail with permission badge, audit hint display, error message copy, responsive layouts, keyboard/focus behavior, visual density, synthetic fixture binding, build smoke, Hermes UI evidence, Claude UI leak prompt, and closeout handoff; M04 full secondary workflow UI cycle; M05 permission/audit binding head) cover every planned row title as descriptor-only rows, with the shared UI guards applied?",
      "Does CP00-347 avoid UI runtime execution, permission decision leaks, audit hint leaks, validation error leaks, unauthorized count leaks, fixture payload leaks, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp347CloseoutHandoff() {
  return freezeCp347Validation({
    handoff_id: "CP00-347-to-CP00-348",
    from_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP347_PACK_BINDING.range,
    open_scope: "Continue RP11.P04.M05.S06 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP347_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp348CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp348Validation({
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

export function validateTimeExpenseCoreCp348Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-348 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-348");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.risk_class) errors.push("CP00-348 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.unit_count) errors.push("CP00-348 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.first_unit_id) errors.push("CP00-348 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.last_unit_id) errors.push("CP00-348 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-348 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-348 must only include RP11 units");
  const summary = createTimeExpenseCoreCp348CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-348 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-348 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-348 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-348 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-348 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-348 ${microId} missing row ${title}`);
    }
  }
  return freezeCp348Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp348UiBindingSliceDescriptor(
  descriptor = createTimeExpenseCoreCp348UiBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_binding_slice_case_set ?? createTimeExpenseCoreCp348UiBindingSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp348UiBindingSliceDescriptor") errors.push("CP00-348 descriptor type drift");
  if (descriptor.source_ui_workflow_slice_descriptor !== "TimeExpenseCoreCp347UiWorkflowSliceDescriptor") {
    errors.push("CP00-348 source ui workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows).length) errors.push("CP00-348 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-348 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-348 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-348 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-348 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-348 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-348 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-348 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-348 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-348 ${microId} audit hint display must not expose hints`);
    }
    if (rows.error_message_copy && rows.error_message_copy.validation_error_detail_included !== false) {
      errors.push(`CP00-348 ${microId} error message copy must be customer-safe`);
    }
  }
  if (TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-348 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-348 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-348 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-348 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-348 contract current_pack drift");
  }
  if (
    contractProjection?.ui_binding_slice_descriptor?.descriptor &&
    contractProjection.ui_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-348 contract ui_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_pack_id) errors.push("CP00-348 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-348 next subphase drift");
  }
  return freezeCp348Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp348HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp348UiBindingSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp348Coverage(planPack);
  const slice = validateTimeExpenseCoreCp348UiBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp348Validation({
    evidence_packet: "H11.CP00-348.time_expense_core_ui_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP348_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_ui_workflow_slice_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp348ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp348Coverage(planPack);
  const slice = validateTimeExpenseCoreCp348UiBindingSliceDescriptor(createTimeExpenseCoreCp348UiBindingSliceDescriptor(), {});
  return freezeCp348Validation({
    review_packet: "C11.CP00-348.time_expense_core_ui_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP348_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_binding_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP348_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-348 cover exactly the 10 planned RP11 units from RP11.P04.M05.S06 through RP11.P04.M05.S15?",
      "Does the single descriptor section (M05 permission/audit binding UI middle with review-required state, interactions, permission badge, audit hint display, error message copy, responsive layouts, keyboard/focus behavior, and visual density check) cover every planned row title as a descriptor-only row, with the shared UI guards applied?",
      "Does CP00-348 avoid UI runtime execution, permission decision leaks, audit hint leaks, validation error leaks, unauthorized count leaks, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp348CloseoutHandoff() {
  return freezeCp348Validation({
    handoff_id: "CP00-348-to-CP00-349",
    from_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP348_PACK_BINDING.range,
    open_scope: "Continue RP11.P04.M05.S16 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP348_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp349CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp349Validation({
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

export function validateTimeExpenseCoreCp349Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-349 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-349");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.risk_class) errors.push("CP00-349 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.unit_count) errors.push("CP00-349 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.first_unit_id) errors.push("CP00-349 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.last_unit_id) errors.push("CP00-349 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-349 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-349 must only include RP11 units");
  const summary = createTimeExpenseCoreCp349CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-349 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-349 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-349 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-349 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-349 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-349 ${microId} missing row ${title}`);
    }
  }
  return freezeCp349Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp349UiBindingTailDescriptor(
  descriptor = createTimeExpenseCoreCp349UiBindingTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_binding_tail_case_set ?? createTimeExpenseCoreCp349UiBindingTailCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp349UiBindingTailDescriptor") errors.push("CP00-349 descriptor type drift");
  if (descriptor.source_ui_binding_slice_descriptor !== "TimeExpenseCoreCp348UiBindingSliceDescriptor") {
    errors.push("CP00-349 source ui binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows).length) errors.push("CP00-349 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-349 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-349 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-349 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-349 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-349 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-349 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-349 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-349 ${microId} fixture binding must not load real data`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-349 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.hermes_ui_evidence && rows.hermes_ui_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-349 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-349 ${microId} UI leak detected`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-349 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-349 ${microId} denied state must not expose decisions`);
    }
  }
  if (TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-349 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-349 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-349 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-349 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-349 contract current_pack drift");
  }
  if (
    contractProjection?.ui_binding_tail_descriptor?.descriptor &&
    contractProjection.ui_binding_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-349 contract ui_binding_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_pack_id) errors.push("CP00-349 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-349 next subphase drift");
  }
  return freezeCp349Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp349HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp349UiBindingTailDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp349Coverage(planPack);
  const tail = validateTimeExpenseCoreCp349UiBindingTailDescriptor(descriptor, contractProjection);
  return freezeCp349Validation({
    evidence_packet: "H11.CP00-349.time_expense_core_ui_binding_tail_descriptor",
    gate: TIME_EXPENSE_CORE_CP349_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_binding_tail_valid: tail.valid,
    no_real_data: true,
    source_ui_binding_slice_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createTimeExpenseCoreCp349ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp349Coverage(planPack);
  const tail = validateTimeExpenseCoreCp349UiBindingTailDescriptor(createTimeExpenseCoreCp349UiBindingTailDescriptor(), {});
  return freezeCp349Validation({
    review_packet: "C11.CP00-349.time_expense_core_ui_binding_tail_descriptor",
    gate: TIME_EXPENSE_CORE_CP349_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_binding_tail_valid: tail.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP349_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-349 cover exactly the 10 planned RP11 units from RP11.P04.M05.S16 through RP11.P04.M06.S05?",
      "Do the two descriptor sections (M05 permission/audit binding UI tail with synthetic fixture binding, build smoke, Hermes UI evidence, Claude UI leak prompt, and closeout handoff; M06 synthetic fixture head with UI surface inventory, data dependency map, and loading/empty/denied states) cover every planned row title as descriptor-only rows, with the shared UI guards applied?",
      "Does CP00-349 avoid UI runtime execution, fixture payload leaks, permission decision leaks, audit hint leaks, unauthorized count leaks, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp349CloseoutHandoff() {
  return freezeCp349Validation({
    handoff_id: "CP00-349-to-CP00-350",
    from_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP349_PACK_BINDING.range,
    open_scope: "Continue RP11.P04.M06.S06 onward with the remaining UI fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP349_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp350CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp350Validation({
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

export function validateTimeExpenseCoreCp350Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-350 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-350");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.risk_class) errors.push("CP00-350 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.unit_count) errors.push("CP00-350 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.first_unit_id) errors.push("CP00-350 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.last_unit_id) errors.push("CP00-350 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-350 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-350 must only include RP11 units");
  const summary = createTimeExpenseCoreCp350CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-350 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-350 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-350 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-350 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-350 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-350 ${microId} missing row ${title}`);
    }
  }
  return freezeCp350Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_closeout_p05_fixture_foundation_case_set ?? createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor") errors.push("CP00-350 descriptor type drift");
  if (descriptor.source_ui_binding_tail_descriptor !== "TimeExpenseCoreCp349UiBindingTailDescriptor") {
    errors.push("CP00-350 source ui binding tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows).length) errors.push("CP00-350 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-350 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-350 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-350 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-350 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-350 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-350 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-350 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.base_tenant_fixture && rows.base_tenant_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-350 ${microId} base tenant fixture must not load real data`);
    }
    if (rows.denied_case && rows.denied_case.permission_decision_detail_included !== false) {
      errors.push(`CP00-350 ${microId} denied case must not expose decisions`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-350 ${microId} cross-tenant case must deny access`);
    }
    if (rows.audit_hint_case && rows.audit_hint_case.audit_hint_detail_included !== false) {
      errors.push(`CP00-350 ${microId} audit hint case must not expose hints`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-350 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-350 ${microId} must not dispatch AI runtime`);
    }
    if (rows.golden_test && rows.golden_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-350 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_fixture_evidence && rows.hermes_fixture_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-350 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_missing_test_prompt && rows.claude_missing_test_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-350 ${microId} must not claim Claude final approval`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-350 ${microId} no-real-data check drift`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-350 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-350 ${microId} UI leak detected`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-350 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-350 ${microId} denied state must not expose decisions`);
    }
  }
  if (TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-350 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-350 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-350 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-350 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-350 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_fixture_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_fixture_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-350 contract p04_closeout_p05_fixture_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_pack_id) errors.push("CP00-350 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-350 next subphase drift");
  }
  return freezeCp350Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp350HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp350Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp350Validation({
    evidence_packet: "H11.CP00-350.time_expense_core_p04_closeout_p05_fixture_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP350_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_fixture_foundation_valid: foundation.valid,
    no_real_data: true,
    source_ui_binding_tail_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp350ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp350Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(), {});
  return freezeCp350Validation({
    review_packet: "C11.CP00-350.time_expense_core_p04_closeout_p05_fixture_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP350_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_fixture_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP350_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-350 cover exactly the 150 planned RP11 units from RP11.P04.M06.S06 through RP11.P05.M05.S07?",
      "Do the eleven descriptor sections (P04 M06 fixture tail, M07-M09 full UI cycles, M10 closeout head, and six P05 fixture micros with base tenant/user/matter/document fixtures, golden/review/denied/cross-tenant/missing-context cases, audit hint cases, security trimming cases, AI retrieval or analytics cases, fixture manifests, golden/failure tests, Hermes fixture evidence, Claude missing-test prompts, closeout handoffs, and no-real-data checks) cover every planned row title as descriptor-only rows?",
      "Does CP00-350 avoid UI runtime execution, AI runtime dispatch, test runtime paths, fixture payload leaks, permission decision leaks, audit hint leaks, unauthorized count leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp350CloseoutHandoff() {
  return freezeCp350Validation({
    handoff_id: "CP00-350-to-CP00-351",
    from_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP350_PACK_BINDING.range,
    open_scope: "RP11.P04 descriptor scope is closed; continue RP11.P05.M05.S08 onward with the remaining fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP350_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp351CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp351Validation({
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

export function validateTimeExpenseCoreCp351Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-351 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-351");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.risk_class) errors.push("CP00-351 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.unit_count) errors.push("CP00-351 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.first_unit_id) errors.push("CP00-351 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.last_unit_id) errors.push("CP00-351 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-351 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-351 must only include RP11 units");
  const summary = createTimeExpenseCoreCp351CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-351 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-351 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-351 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-351 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-351 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-351 ${microId} missing row ${title}`);
    }
  }
  return freezeCp351Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp351FixtureSliceDescriptor(
  descriptor = createTimeExpenseCoreCp351FixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_slice_case_set ?? createTimeExpenseCoreCp351FixtureSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp351FixtureSliceDescriptor") errors.push("CP00-351 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_fixture_foundation_descriptor !== "TimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor") {
    errors.push("CP00-351 source p04 closeout p05 fixture foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows).length) errors.push("CP00-351 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-351 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-351 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-351 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-351 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-351 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-351 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-351 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.denied_case && rows.denied_case.permission_decision_detail_included !== false) {
      errors.push(`CP00-351 ${microId} denied case must not expose decisions`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-351 ${microId} cross-tenant case must deny access`);
    }
    if (rows.audit_hint_case && rows.audit_hint_case.audit_hint_detail_included !== false) {
      errors.push(`CP00-351 ${microId} audit hint case must not expose hints`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-351 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-351 ${microId} must not dispatch AI runtime`);
    }
    if (rows.golden_test && rows.golden_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-351 ${microId} must not execute test runtime`);
    }
    if (rows.failure_test && rows.failure_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-351 ${microId} failure test outcome drift`);
    }
    if (rows.hermes_fixture_evidence && rows.hermes_fixture_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-351 ${microId} must not emit Hermes receipts`);
    }
  }
  if (TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-351 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-351 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-351 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-351 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-351 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_slice_descriptor?.descriptor &&
    contractProjection.fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-351 contract fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_pack_id) errors.push("CP00-351 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-351 next subphase drift");
  }
  return freezeCp351Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp351HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp351FixtureSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp351Coverage(planPack);
  const slice = validateTimeExpenseCoreCp351FixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp351Validation({
    evidence_packet: "H11.CP00-351.time_expense_core_fixture_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP351_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_closeout_p05_fixture_foundation_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp351ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp351Coverage(planPack);
  const slice = validateTimeExpenseCoreCp351FixtureSliceDescriptor(createTimeExpenseCoreCp351FixtureSliceDescriptor(), {});
  return freezeCp351Validation({
    review_packet: "C11.CP00-351.time_expense_core_fixture_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP351_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP351_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-351 cover exactly the 10 planned RP11 units from RP11.P05.M05.S08 through RP11.P05.M05.S17?",
      "Does the single descriptor section (M05 permission/audit binding fixture middle with denied/cross-tenant/missing-context cases, audit hint case, security trimming case, AI retrieval or analytics case, fixture manifest, golden/failure tests, and Hermes fixture evidence) cover every planned row title as a descriptor-only row, with the shared fixture guards applied?",
      "Does CP00-351 avoid AI runtime dispatch, test runtime paths, fixture payload leaks, permission decision leaks, audit hint leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp351CloseoutHandoff() {
  return freezeCp351Validation({
    handoff_id: "CP00-351-to-CP00-352",
    from_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP351_PACK_BINDING.range,
    open_scope: "Continue RP11.P05.M05.S18 onward with the remaining fixture binding rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP351_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp352CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp352Validation({
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

export function validateTimeExpenseCoreCp352Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-352 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-352");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.risk_class) errors.push("CP00-352 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.unit_count) errors.push("CP00-352 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.first_unit_id) errors.push("CP00-352 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.last_unit_id) errors.push("CP00-352 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-352 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-352 must only include RP11 units");
  const summary = createTimeExpenseCoreCp352CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-352 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-352 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-352 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-352 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-352 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-352 ${microId} missing row ${title}`);
    }
  }
  return freezeCp352Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp352FixtureBindingSliceDescriptor(
  descriptor = createTimeExpenseCoreCp352FixtureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_binding_slice_case_set ?? createTimeExpenseCoreCp352FixtureBindingSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp352FixtureBindingSliceDescriptor") errors.push("CP00-352 descriptor type drift");
  if (descriptor.source_fixture_slice_descriptor !== "TimeExpenseCoreCp351FixtureSliceDescriptor") {
    errors.push("CP00-352 source fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows).length) errors.push("CP00-352 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-352 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-352 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-352 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-352 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-352 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-352 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-352 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.claude_missing_test_prompt && rows.claude_missing_test_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-352 ${microId} must not claim Claude final approval`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-352 ${microId} no-real-data check drift`);
    }
    if (rows.base_tenant_fixture && rows.base_tenant_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-352 ${microId} base tenant fixture must not load real data`);
    }
    if (rows.review_required_case && rows.review_required_case.expected_outcome !== "review_required") {
      errors.push(`CP00-352 ${microId} review-required case outcome drift`);
    }
  }
  if (TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-352 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-352 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-352 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-352 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-352 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_binding_slice_descriptor?.descriptor &&
    contractProjection.fixture_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-352 contract fixture_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_pack_id) errors.push("CP00-352 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-352 next subphase drift");
  }
  return freezeCp352Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp352HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp352FixtureBindingSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp352Coverage(planPack);
  const slice = validateTimeExpenseCoreCp352FixtureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp352Validation({
    evidence_packet: "H11.CP00-352.time_expense_core_fixture_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP352_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_fixture_slice_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp352ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp352Coverage(planPack);
  const slice = validateTimeExpenseCoreCp352FixtureBindingSliceDescriptor(createTimeExpenseCoreCp352FixtureBindingSliceDescriptor(), {});
  return freezeCp352Validation({
    review_packet: "C11.CP00-352.time_expense_core_fixture_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP352_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_binding_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP352_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-352 cover exactly the 10 planned RP11 units from RP11.P05.M05.S18 through RP11.P05.M06.S07?",
      "Do the two descriptor sections (M05 permission/audit binding fixture tail with Claude missing-test prompt, closeout handoff, and no-real-data check; M06 synthetic fixture head with base tenant/user/matter/document fixtures and golden/review-required cases) cover every planned row title as descriptor-only rows, with the shared fixture guards applied?",
      "Does CP00-352 avoid AI runtime dispatch, test runtime paths, fixture payload leaks, permission decision leaks, audit hint leaks, real data, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp352CloseoutHandoff() {
  return freezeCp352Validation({
    handoff_id: "CP00-352-to-CP00-353",
    from_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP352_PACK_BINDING.range,
    open_scope: "Continue RP11.P05.M06.S08 onward with the remaining fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP352_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp353CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp353Validation({
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

export function validateTimeExpenseCoreCp353Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-353 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-353");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.risk_class) errors.push("CP00-353 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.unit_count) errors.push("CP00-353 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.first_unit_id) errors.push("CP00-353 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.last_unit_id) errors.push("CP00-353 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-353 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-353 must only include RP11 units");
  const summary = createTimeExpenseCoreCp353CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-353 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-353 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-353 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-353 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-353 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-353 ${microId} missing row ${title}`);
    }
  }
  return freezeCp353Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_permission_foundation_case_set ?? createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor") errors.push("CP00-353 descriptor type drift");
  if (descriptor.source_fixture_binding_slice_descriptor !== "TimeExpenseCoreCp352FixtureBindingSliceDescriptor") {
    errors.push("CP00-353 source fixture binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows).length) errors.push("CP00-353 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-353 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-353 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-353 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-353 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-353 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-353 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-353 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.deny_over_allow_enforced !== true) {
      errors.push(`CP00-353 ${microId} permission matrix must enforce deny-over-allow`);
    }
    if (rows.view_decision_binding && rows.view_decision_binding.permission_decision_detail_included !== false) {
      errors.push(`CP00-353 ${microId} view decision must not expose details`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-353 ${microId} AI retrieval binding must not dispatch AI runtime`);
    }
    if (rows.audit_hint_fields && rows.audit_hint_fields.audit_hint_detail_included !== false) {
      errors.push(`CP00-353 ${microId} audit hint fields must not expose hints`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-353 ${microId} deny-over-allow check drift`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-353 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.writes_audit_event !== false) {
      errors.push(`CP00-353 ${microId} audit event expectation must not write events`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-353 ${microId} permission fixture must not load real data`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-353 ${microId} must not execute test runtime`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-353 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-353 ${microId} leak detected`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-353 ${microId} cross-tenant case must deny access`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-353 ${microId} security trimming case must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-353 ${microId} must not dispatch AI runtime`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-353 ${microId} no-real-data check drift`);
    }
  }
  if (TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-353 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-353 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-353 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-353 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-353 contract current_pack drift");
  }
  if (
    contractProjection?.p05_closeout_p06_permission_foundation_descriptor?.descriptor &&
    contractProjection.p05_closeout_p06_permission_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-353 contract p05_closeout_p06_permission_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_pack_id) errors.push("CP00-353 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-353 next subphase drift");
  }
  return freezeCp353Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp353HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp353Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(descriptor, contractProjection);
  return freezeCp353Validation({
    evidence_packet: "H11.CP00-353.time_expense_core_p05_closeout_p06_permission_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP353_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_closeout_p06_permission_foundation_valid: foundation.valid,
    no_real_data: true,
    source_fixture_binding_slice_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp353ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp353Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(), {});
  return freezeCp353Validation({
    review_packet: "C11.CP00-353.time_expense_core_p05_closeout_p06_permission_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP353_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_closeout_p06_permission_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP353_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-353 cover exactly the 150 planned RP11 units from RP11.P05.M06.S08 through RP11.P06.M04.S05?",
      "Do the ten descriptor sections (P05 M06 fixture tail, M07-M09 full fixture cycles, M10 closeout head, and five P06 permission micros with permission matrix rows, view/search/mutation/export-download/share/AI-retrieval decision bindings, audit hint fields, matched rule captures, deny-over-allow checks, legal hold/ethical wall/object ACL interactions, review/approval routes, security trimming proofs, audit event expectations, permission fixtures, and allowed/denied/cross-tenant/leak-prevention tests) cover every planned row title as descriptor-only rows?",
      "Does CP00-353 avoid runtime permission evaluation, audit event writes, AI runtime dispatch, test runtime paths, permission decision leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp353CloseoutHandoff() {
  return freezeCp353Validation({
    handoff_id: "CP00-353-to-CP00-354",
    from_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP353_PACK_BINDING.range,
    open_scope: "RP11.P05 descriptor scope is closed; continue RP11.P06.M04.S06 onward with the remaining permission rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP353_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp354CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp354Validation({
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

export function validateTimeExpenseCoreCp354Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-354 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-354");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.risk_class) errors.push("CP00-354 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.unit_count) errors.push("CP00-354 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.first_unit_id) errors.push("CP00-354 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.last_unit_id) errors.push("CP00-354 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-354 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-354 must only include RP11 units");
  const summary = createTimeExpenseCoreCp354CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-354 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-354 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-354 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-354 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-354 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-354 ${microId} missing row ${title}`);
    }
  }
  return freezeCp354Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp354PermissionSliceDescriptor(
  descriptor = createTimeExpenseCoreCp354PermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_slice_case_set ?? createTimeExpenseCoreCp354PermissionSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp354PermissionSliceDescriptor") errors.push("CP00-354 descriptor type drift");
  if (descriptor.source_p05_closeout_p06_permission_foundation_descriptor !== "TimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor") {
    errors.push("CP00-354 source p05 closeout p06 permission foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows).length) errors.push("CP00-354 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-354 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-354 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-354 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-354 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-354 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-354 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-354 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.deny_over_allow_enforced !== true) {
      errors.push(`CP00-354 ${microId} permission matrix must enforce deny-over-allow`);
    }
    if (rows.view_decision_binding && rows.view_decision_binding.permission_decision_detail_included !== false) {
      errors.push(`CP00-354 ${microId} view decision must not expose details`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-354 ${microId} AI retrieval binding must not dispatch AI runtime`);
    }
    if (rows.audit_hint_fields && rows.audit_hint_fields.audit_hint_detail_included !== false) {
      errors.push(`CP00-354 ${microId} audit hint fields must not expose hints`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-354 ${microId} deny-over-allow check drift`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-354 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.writes_audit_event !== false) {
      errors.push(`CP00-354 ${microId} audit event expectation must not write events`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-354 ${microId} permission fixture must not load real data`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-354 ${microId} must not execute test runtime`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-354 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-354 ${microId} leak detected`);
    }
  }
  if (TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-354 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-354 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-354 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-354 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-354 contract current_pack drift");
  }
  if (
    contractProjection?.permission_slice_descriptor?.descriptor &&
    contractProjection.permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-354 contract permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_pack_id) errors.push("CP00-354 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-354 next subphase drift");
  }
  return freezeCp354Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp354HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp354PermissionSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp354Coverage(planPack);
  const slice = validateTimeExpenseCoreCp354PermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp354Validation({
    evidence_packet: "H11.CP00-354.time_expense_core_permission_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP354_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_closeout_p06_permission_foundation_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp354ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp354Coverage(planPack);
  const slice = validateTimeExpenseCoreCp354PermissionSliceDescriptor(createTimeExpenseCoreCp354PermissionSliceDescriptor(), {});
  return freezeCp354Validation({
    review_packet: "C11.CP00-354.time_expense_core_permission_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP354_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP354_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-354 cover exactly the 40 planned RP11 units from RP11.P06.M04.S06 through RP11.P06.M06.S03?",
      "Do the three descriptor sections (M04 secondary workflow permission tail, M05 full permission/audit binding cycle with cross-tenant and leak prevention tests, M06 synthetic fixture head) cover every planned row title as descriptor-only rows, with the shared permission guards applied across every section that carries them?",
      "Does CP00-354 avoid runtime permission evaluation, audit event writes, AI runtime dispatch, test runtime paths, permission decision leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp354CloseoutHandoff() {
  return freezeCp354Validation({
    handoff_id: "CP00-354-to-CP00-355",
    from_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP354_PACK_BINDING.range,
    open_scope: "Continue RP11.P06.M06.S04 onward with the remaining permission fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP354_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp355CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp355Validation({
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

export function validateTimeExpenseCoreCp355Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-355 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-355");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.risk_class) errors.push("CP00-355 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.unit_count) errors.push("CP00-355 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.first_unit_id) errors.push("CP00-355 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.last_unit_id) errors.push("CP00-355 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-355 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-355 must only include RP11 units");
  const summary = createTimeExpenseCoreCp355CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-355 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-355 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-355 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-355 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-355 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-355 ${microId} missing row ${title}`);
    }
  }
  return freezeCp355Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_failure_foundation_case_set ?? createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor") errors.push("CP00-355 descriptor type drift");
  if (descriptor.source_permission_slice_descriptor !== "TimeExpenseCoreCp354PermissionSliceDescriptor") {
    errors.push("CP00-355 source permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows).length) errors.push("CP00-355 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-355 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-355 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-355 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-355 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-355 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-355 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-355 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.deny_over_allow_enforced !== true) {
      errors.push(`CP00-355 ${microId} permission matrix must enforce deny-over-allow`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-355 ${microId} AI retrieval binding must not dispatch AI runtime`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-355 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-355 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-355 ${microId} leak detected`);
    }
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-355 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-355 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.ambiguous_rule_failure && rows.ambiguous_rule_failure.deny_over_allow_enforced !== true) {
      errors.push(`CP00-355 ${microId} ambiguous rule failure must enforce deny-over-allow`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-355 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-355 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-355 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-355 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-355 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-355 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-355 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-355 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-355 ${microId} must not emit Hermes failure receipts`);
    }
  }
  if (TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-355 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-355 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-355 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-355 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-355 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_failure_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_failure_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-355 contract p06_closeout_p07_failure_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_pack_id) errors.push("CP00-355 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-355 next subphase drift");
  }
  return freezeCp355Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp355HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp355Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp355Validation({
    evidence_packet: "H11.CP00-355.time_expense_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP355_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    no_real_data: true,
    source_permission_slice_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp355ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp355Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(), {});
  return freezeCp355Validation({
    review_packet: "C11.CP00-355.time_expense_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP355_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP355_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-355 cover exactly the 150 planned RP11 units from RP11.P06.M06.S04 through RP11.P07.M03.S18?",
      "Do the nine descriptor sections (P06 M06 fixture tail, M07-M09 full permission cycles, M10 closeout head, and four P07 failure micros with failure taxonomies, missing tenant/actor/matter/resource failures, unknown action/cross-tenant/permission-denied/ambiguous-rule/stale-reference/lock-conflict/retry-exhaustion failures, rollback and compensation expectations, blocked-claim receipts, failure fixtures/tests, integration smokes, audit failure hints, and Hermes failure evidence) cover every planned row title as descriptor-only rows?",
      "Does CP00-355 avoid rollback/retry runtime, lock acquisition, runtime permission evaluation, audit event writes, AI runtime dispatch, test runtime paths, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp355CloseoutHandoff() {
  return freezeCp355Validation({
    handoff_id: "CP00-355-to-CP00-356",
    from_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP355_PACK_BINDING.range,
    open_scope: "RP11.P06 descriptor scope is closed; continue RP11.P07.M03.S19 onward with the remaining failure rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP355_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp356CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp356Validation({
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

export function validateTimeExpenseCoreCp356Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-356 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-356");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.risk_class) errors.push("CP00-356 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.unit_count) errors.push("CP00-356 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.first_unit_id) errors.push("CP00-356 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.last_unit_id) errors.push("CP00-356 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-356 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-356 must only include RP11 units");
  const summary = createTimeExpenseCoreCp356CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-356 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-356 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-356 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-356 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-356 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-356 ${microId} missing row ${title}`);
    }
  }
  return freezeCp356Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp356FailureSliceDescriptor(
  descriptor = createTimeExpenseCoreCp356FailureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_slice_case_set ?? createTimeExpenseCoreCp356FailureSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp356FailureSliceDescriptor") errors.push("CP00-356 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_failure_foundation_descriptor !== "TimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor") {
    errors.push("CP00-356 source p06 closeout p07 failure foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows).length) errors.push("CP00-356 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-356 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-356 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-356 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-356 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-356 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-356 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-356 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-356 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-356 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-356 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-356 ${microId} human escalation boundary missing`);
    }
    if (rows.missing_tenant_failure && rows.missing_tenant_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-356 ${microId} missing tenant failure outcome drift`);
    }
    if (rows.unknown_action_failure && rows.unknown_action_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-356 ${microId} unknown action failure outcome drift`);
    }
  }
  if (TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-356 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-356 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-356 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-356 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-356 contract current_pack drift");
  }
  if (
    contractProjection?.failure_slice_descriptor?.descriptor &&
    contractProjection.failure_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-356 contract failure_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_pack_id) errors.push("CP00-356 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-356 next subphase drift");
  }
  return freezeCp356Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp356HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp356FailureSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp356Coverage(planPack);
  const slice = validateTimeExpenseCoreCp356FailureSliceDescriptor(descriptor, contractProjection);
  return freezeCp356Validation({
    evidence_packet: "H11.CP00-356.time_expense_core_failure_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP356_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_failure_foundation_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp356ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp356Coverage(planPack);
  const slice = validateTimeExpenseCoreCp356FailureSliceDescriptor(createTimeExpenseCoreCp356FailureSliceDescriptor(), {});
  return freezeCp356Validation({
    review_packet: "C11.CP00-356.time_expense_core_failure_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP356_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP356_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-356 cover exactly the 10 planned RP11 units from RP11.P07.M03.S19 through RP11.P07.M04.S06?",
      "Do the two descriptor sections (M03 primary failure tail with audit failure hint, Hermes failure evidence, Claude edge-case prompt, and human escalation note; M04 secondary workflow head with failure taxonomy and missing tenant/actor/matter/resource and unknown action failures) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-356 avoid rollback/retry runtime, audit hint leaks, Hermes runtime receipts, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp356CloseoutHandoff() {
  return freezeCp356Validation({
    handoff_id: "CP00-356-to-CP00-357",
    from_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP356_PACK_BINDING.range,
    open_scope: "Continue RP11.P07.M04.S07 onward with the remaining failure rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP356_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp357CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp357Validation({
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

export function validateTimeExpenseCoreCp357Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-357 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-357");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.risk_class) errors.push("CP00-357 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.unit_count) errors.push("CP00-357 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.first_unit_id) errors.push("CP00-357 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.last_unit_id) errors.push("CP00-357 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-357 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-357 must only include RP11 units");
  const summary = createTimeExpenseCoreCp357CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-357 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-357 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-357 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-357 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-357 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-357 ${microId} missing row ${title}`);
    }
  }
  return freezeCp357Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp357FailureBindingSliceDescriptor(
  descriptor = createTimeExpenseCoreCp357FailureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_binding_slice_case_set ?? createTimeExpenseCoreCp357FailureBindingSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp357FailureBindingSliceDescriptor") errors.push("CP00-357 descriptor type drift");
  if (descriptor.source_failure_slice_descriptor !== "TimeExpenseCoreCp356FailureSliceDescriptor") {
    errors.push("CP00-357 source failure slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows).length) errors.push("CP00-357 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-357 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-357 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-357 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-357 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-357 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-357 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-357 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-357 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-357 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.ambiguous_rule_failure && rows.ambiguous_rule_failure.deny_over_allow_enforced !== true) {
      errors.push(`CP00-357 ${microId} ambiguous rule failure must enforce deny-over-allow`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-357 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-357 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-357 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-357 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-357 ${microId} failure fixture must not load real data`);
    }
  }
  if (TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-357 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-357 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-357 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-357 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-357 contract current_pack drift");
  }
  if (
    contractProjection?.failure_binding_slice_descriptor?.descriptor &&
    contractProjection.failure_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-357 contract failure_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_pack_id) errors.push("CP00-357 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-357 next subphase drift");
  }
  return freezeCp357Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp357HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp357FailureBindingSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp357Coverage(planPack);
  const slice = validateTimeExpenseCoreCp357FailureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp357Validation({
    evidence_packet: "H11.CP00-357.time_expense_core_failure_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP357_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_slice_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp357ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp357Coverage(planPack);
  const slice = validateTimeExpenseCoreCp357FailureBindingSliceDescriptor(createTimeExpenseCoreCp357FailureBindingSliceDescriptor(), {});
  return freezeCp357Validation({
    review_packet: "C11.CP00-357.time_expense_core_failure_binding_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP357_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP357_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-357 cover exactly the 10 planned RP11 units from RP11.P07.M04.S07 through RP11.P07.M04.S16?",
      "Does the single descriptor section (M04 secondary workflow failure middle with cross-tenant/permission-denied/ambiguous-rule/stale-reference/lock-conflict/retry-exhaustion failures, rollback and compensation expectations, blocked-claim receipt, and failure fixture) cover every planned row title as a descriptor-only row, with the shared failure guards applied?",
      "Does CP00-357 avoid rollback/retry runtime, lock acquisition, permission decision leaks, blocked-claim detail leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp357CloseoutHandoff() {
  return freezeCp357Validation({
    handoff_id: "CP00-357-to-CP00-358",
    from_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP357_PACK_BINDING.range,
    open_scope: "Continue RP11.P07.M04.S17 onward with the remaining failure rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP357_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp358CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp358Validation({
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

export function validateTimeExpenseCoreCp358Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-358 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-358");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.risk_class) errors.push("CP00-358 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.unit_count) errors.push("CP00-358 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.first_unit_id) errors.push("CP00-358 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.last_unit_id) errors.push("CP00-358 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-358 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-358 must only include RP11 units");
  const summary = createTimeExpenseCoreCp358CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-358 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-358 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-358 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-358 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-358 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-358 ${microId} missing row ${title}`);
    }
  }
  return freezeCp358Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp358FailureTailSliceDescriptor(
  descriptor = createTimeExpenseCoreCp358FailureTailSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_tail_slice_case_set ?? createTimeExpenseCoreCp358FailureTailSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp358FailureTailSliceDescriptor") errors.push("CP00-358 descriptor type drift");
  if (descriptor.source_failure_binding_slice_descriptor !== "TimeExpenseCoreCp357FailureBindingSliceDescriptor") {
    errors.push("CP00-358 source failure binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows).length) errors.push("CP00-358 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-358 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-358 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-358 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-358 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-358 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-358 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-358 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-358 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-358 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-358 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-358 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-358 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-358 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-358 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-358 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-358 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-358 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-358 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-358 ${microId} human escalation boundary missing`);
    }
  }
  if (TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-358 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-358 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-358 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-358 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-358 contract current_pack drift");
  }
  if (
    contractProjection?.failure_tail_slice_descriptor?.descriptor &&
    contractProjection.failure_tail_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-358 contract failure_tail_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_pack_id) errors.push("CP00-358 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-358 next subphase drift");
  }
  return freezeCp358Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp358HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp358FailureTailSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp358Coverage(planPack);
  const slice = validateTimeExpenseCoreCp358FailureTailSliceDescriptor(descriptor, contractProjection);
  return freezeCp358Validation({
    evidence_packet: "H11.CP00-358.time_expense_core_failure_tail_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP358_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_tail_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_binding_slice_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp358ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp358Coverage(planPack);
  const slice = validateTimeExpenseCoreCp358FailureTailSliceDescriptor(createTimeExpenseCoreCp358FailureTailSliceDescriptor(), {});
  return freezeCp358Validation({
    review_packet: "C11.CP00-358.time_expense_core_failure_tail_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP358_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_tail_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP358_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-358 cover exactly the 40 planned RP11 units from RP11.P07.M04.S17 through RP11.P07.M06.S14?",
      "Do the three descriptor sections (M04 secondary workflow failure tail with failure unit test, integration smoke, audit failure hint, and Hermes failure evidence; M05 full permission/audit binding failure cycle including Claude edge-case prompt and human escalation note; M06 synthetic fixture head through compensation expectation) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-358 avoid rollback/retry runtime, lock acquisition, test runtime paths, integration smoke runtime, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp358CloseoutHandoff() {
  return freezeCp358Validation({
    handoff_id: "CP00-358-to-CP00-359",
    from_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP358_PACK_BINDING.range,
    open_scope: "Continue RP11.P07.M06.S15 onward with the remaining failure fixture rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP358_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp359CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp359Validation({
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

export function validateTimeExpenseCoreCp359Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-359 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-359");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.risk_class) errors.push("CP00-359 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.unit_count) errors.push("CP00-359 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.first_unit_id) errors.push("CP00-359 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.last_unit_id) errors.push("CP00-359 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-359 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-359 must only include RP11 units");
  const summary = createTimeExpenseCoreCp359CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-359 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-359 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-359 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-359 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-359 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-359 ${microId} missing row ${title}`);
    }
  }
  return freezeCp359Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp359FailureFixtureSliceDescriptor(
  descriptor = createTimeExpenseCoreCp359FailureFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_fixture_slice_case_set ?? createTimeExpenseCoreCp359FailureFixtureSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp359FailureFixtureSliceDescriptor") errors.push("CP00-359 descriptor type drift");
  if (descriptor.source_failure_tail_slice_descriptor !== "TimeExpenseCoreCp358FailureTailSliceDescriptor") {
    errors.push("CP00-359 source failure tail slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows).length) errors.push("CP00-359 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-359 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-359 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-359 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-359 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-359 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-359 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-359 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-359 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-359 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-359 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-359 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-359 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-359 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.missing_tenant_failure && rows.missing_tenant_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-359 ${microId} missing tenant failure outcome drift`);
    }
  }
  if (TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-359 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-359 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-359 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-359 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-359 contract current_pack drift");
  }
  if (
    contractProjection?.failure_fixture_slice_descriptor?.descriptor &&
    contractProjection.failure_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-359 contract failure_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_pack_id) errors.push("CP00-359 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-359 next subphase drift");
  }
  return freezeCp359Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp359HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp359FailureFixtureSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp359Coverage(planPack);
  const slice = validateTimeExpenseCoreCp359FailureFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp359Validation({
    evidence_packet: "H11.CP00-359.time_expense_core_failure_fixture_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP359_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_tail_slice_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp359ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp359Coverage(planPack);
  const slice = validateTimeExpenseCoreCp359FailureFixtureSliceDescriptor(createTimeExpenseCoreCp359FailureFixtureSliceDescriptor(), {});
  return freezeCp359Validation({
    review_packet: "C11.CP00-359.time_expense_core_failure_fixture_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP359_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_fixture_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP359_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-359 cover exactly the 10 planned RP11 units from RP11.P07.M06.S15 through RP11.P07.M07.S04?",
      "Do the two descriptor sections (M06 synthetic fixture failure tail with blocked-claim receipt, failure fixture, failure unit test, integration smoke, audit failure hint, and Hermes failure evidence; M07 test/golden head with failure taxonomy and missing tenant/actor/matter failures) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-359 avoid test runtime paths, integration smoke runtime, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, real data, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp359CloseoutHandoff() {
  return freezeCp359Validation({
    handoff_id: "CP00-359-to-CP00-360",
    from_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP359_PACK_BINDING.range,
    open_scope: "Continue RP11.P07.M07.S05 onward with the remaining failure test rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP359_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp360CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp360Validation({
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

export function validateTimeExpenseCoreCp360Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-360 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-360");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.risk_class) errors.push("CP00-360 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.unit_count) errors.push("CP00-360 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.first_unit_id) errors.push("CP00-360 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.last_unit_id) errors.push("CP00-360 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-360 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-360 must only include RP11 units");
  const summary = createTimeExpenseCoreCp360CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-360 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-360 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-360 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-360 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-360 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-360 ${microId} missing row ${title}`);
    }
  }
  return freezeCp360Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp360FailureHermesSliceDescriptor(
  descriptor = createTimeExpenseCoreCp360FailureHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_hermes_slice_case_set ?? createTimeExpenseCoreCp360FailureHermesSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp360FailureHermesSliceDescriptor") errors.push("CP00-360 descriptor type drift");
  if (descriptor.source_failure_fixture_slice_descriptor !== "TimeExpenseCoreCp359FailureFixtureSliceDescriptor") {
    errors.push("CP00-360 source failure fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows).length) errors.push("CP00-360 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-360 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-360 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-360 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-360 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-360 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-360 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-360 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-360 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-360 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-360 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-360 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-360 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-360 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-360 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-360 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-360 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-360 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-360 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-360 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-360 ${microId} human escalation boundary missing`);
    }
  }
  if (TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-360 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-360 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-360 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-360 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
      TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-360 contract current_pack drift");
  }
  if (
    contractProjection?.failure_hermes_slice_descriptor?.descriptor &&
    contractProjection.failure_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-360 contract failure_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_pack_id) errors.push("CP00-360 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-360 next subphase drift");
  }
  return freezeCp360Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp360HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp360FailureHermesSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp360Coverage(planPack);
  const slice = validateTimeExpenseCoreCp360FailureHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp360Validation({
    evidence_packet: "H11.CP00-360.time_expense_core_failure_hermes_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP360_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_fixture_slice_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp360ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp360Coverage(planPack);
  const slice = validateTimeExpenseCoreCp360FailureHermesSliceDescriptor(createTimeExpenseCoreCp360FailureHermesSliceDescriptor(), {});
  return freezeCp360Validation({
    review_packet: "C11.CP00-360.time_expense_core_failure_hermes_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP360_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_hermes_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP360_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-360 cover exactly the 40 planned RP11 units from RP11.P07.M07.S05 through RP11.P07.M09.S02?",
      "Do the three descriptor sections (M07 test/golden failure tail including Claude edge-case prompt and human escalation note, M08 full Hermes failure evidence cycle, M09 Claude review packet head) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-360 avoid rollback/retry runtime, lock acquisition, test runtime paths, integration smoke runtime, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp360CloseoutHandoff() {
  return freezeCp360Validation({
    handoff_id: "CP00-360-to-CP00-361",
    from_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP360_PACK_BINDING.range,
    open_scope: "Continue RP11.P07.M09.S03 onward with the remaining failure review rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP360_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp361CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp361Validation({
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

export function validateTimeExpenseCoreCp361Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-361 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-361");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.risk_class) errors.push("CP00-361 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.unit_count) errors.push("CP00-361 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.first_unit_id) errors.push("CP00-361 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.last_unit_id) errors.push("CP00-361 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-361 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-361 must only include RP11 units");
  const summary = createTimeExpenseCoreCp361CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-361 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-361 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-361 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-361 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-361 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-361 ${microId} missing row ${title}`);
    }
  }
  return freezeCp361Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_hermes_foundation_case_set ?? createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor") errors.push("CP00-361 descriptor type drift");
  if (descriptor.source_failure_hermes_slice_descriptor !== "TimeExpenseCoreCp360FailureHermesSliceDescriptor") {
    errors.push("CP00-361 source failure hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows).length) errors.push("CP00-361 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-361 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-361 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-361 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-361 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-361 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-361 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-361 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-361 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-361 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-361 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-361 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-361 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-361 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.command_result_receipt && rows.command_result_receipt.executes_command_runtime !== false) {
      errors.push(`CP00-361 ${microId} command result receipt must not execute runtime`);
    }
    if (rows.fixture_summary_receipt && rows.fixture_summary_receipt.fixture_payload_included !== false) {
      errors.push(`CP00-361 ${microId} fixture summary receipt must not include payloads`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-361 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_hint_detail_included !== false) {
      errors.push(`CP00-361 ${microId} audit summary receipt must not expose hints`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-361 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-361 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-361 ${microId} human approval marker boundary missing`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-361 ${microId} validation command check must not execute runtime`);
    }
  }
  if (TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-361 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-361 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-361 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-361 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id, TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id, TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-361 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_hermes_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_hermes_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-361 contract p07_closeout_p08_hermes_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_pack_id) errors.push("CP00-361 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-361 next subphase drift");
  }
  return freezeCp361Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp361HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp361Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(descriptor, contractProjection);
  return freezeCp361Validation({
    evidence_packet: "H11.CP00-361.time_expense_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP361_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    no_real_data: true,
    source_failure_hermes_slice_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp361ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp361Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(), {});
  return freezeCp361Validation({
    review_packet: "C11.CP00-361.time_expense_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP361_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP361_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-361 cover exactly the 150 planned RP11 units from RP11.P07.M09.S03 through RP11.P08.M08.S01?",
      "Do the eleven descriptor sections (P07 M09 Claude review failure tail, M10 closeout head, and nine P08 Hermes micros with command matrices, evidence field lists, changed-file/command-result/fixture-summary/blocked-claim/permission-summary/audit-summary/no-real-data receipts, Claude dependency markers, human approval markers, PASS/PASS_WITH_FINDINGS/BLOCK semantics, evidence templates, validation command checks, harness boundary notes, closeout handoffs, regression receipts, and next-gate readiness rows) cover every planned row title as descriptor-only rows?",
      "Does CP00-361 avoid Hermes runtime receipts, command runtime execution, rollback/retry runtime, lock acquisition, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp361CloseoutHandoff() {
  return freezeCp361Validation({
    handoff_id: "CP00-361-to-CP00-362",
    from_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP361_PACK_BINDING.range,
    open_scope: "RP11.P07 descriptor scope is closed; continue RP11.P08.M08.S02 onward with the remaining Hermes receipt rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP361_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp362CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp362Validation({
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

export function validateTimeExpenseCoreCp362Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-362 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-362");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.risk_class) errors.push("CP00-362 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.unit_count) errors.push("CP00-362 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.first_unit_id) errors.push("CP00-362 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.last_unit_id) errors.push("CP00-362 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-362 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-362 must only include RP11 units");
  const summary = createTimeExpenseCoreCp362CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-362 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-362 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-362 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-362 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-362 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-362 ${microId} missing row ${title}`);
    }
  }
  return freezeCp362Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(
  descriptor = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_review_foundation_case_set ?? createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor") errors.push("CP00-362 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_hermes_foundation_descriptor !== "TimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor") {
    errors.push("CP00-362 source p07 closeout p08 hermes foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows).length) errors.push("CP00-362 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-362 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-362 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-362 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-362 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-362 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-362 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-362 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-362 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-362 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-362 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-362 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-362 ${microId} human approval marker boundary missing`);
    }
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-362 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-362 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-362 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-362 ${microId} human approval summary drift`);
    }
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-362 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-362 ${microId} command rerun must not execute runtime`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-362 ${microId} validation command check must not execute runtime`);
    }
  }
  if (TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-362 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-362 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-362 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-362 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id, TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-362 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_review_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_review_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-362 contract p08_closeout_p09_review_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_pack_id) errors.push("CP00-362 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-362 next subphase drift");
  }
  return freezeCp362Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp362HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp362Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(descriptor, contractProjection);
  return freezeCp362Validation({
    evidence_packet: "H11.CP00-362.time_expense_core_p08_closeout_p09_review_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP362_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    no_real_data: true,
    source_p07_closeout_p08_hermes_foundation_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createTimeExpenseCoreCp362ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp362Coverage(planPack);
  const foundation = validateTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(), {});
  return freezeCp362Validation({
    review_packet: "C11.CP00-362.time_expense_core_p08_closeout_p09_review_foundation_descriptor",
    gate: TIME_EXPENSE_CORE_CP362_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP362_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-362 cover exactly the 150 planned RP11 units from RP11.P08.M08.S02 through RP11.P09.M08.S08?",
      "Do the twelve descriptor sections (P08 M08 Hermes tail, M09 Claude review packet cycle, M10 closeout head, and nine P09 review micros with architecture/security/permission-bypass/audit-completeness/missing-test/UI-leak/downstream-readiness questions, risk registers, severity taxonomies, go/no-go verdict formats, finding routing maps, human approval summaries, Claude review packets, closeout criteria, PASS/PASS_WITH_FINDINGS/BLOCK closeout notes, next RP dependencies, documentation updates, and command reruns) cover every planned row title as descriptor-only rows?",
      "Does CP00-362 avoid Hermes runtime receipts, command runtime execution, permission bypass, UI leaks, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp362CloseoutHandoff() {
  return freezeCp362Validation({
    handoff_id: "CP00-362-to-CP00-363",
    from_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP362_PACK_BINDING.range,
    open_scope: "RP11.P08 descriptor scope is closed; continue RP11.P09.M09.S01 onward with the remaining review rows and downstream micros while preserving descriptor-only time-expense boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP362_PACK_BINDING.production_ready_flag,
  });
}

export function createTimeExpenseCoreCp363CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp363Validation({
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

export function validateTimeExpenseCoreCp363Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-363 plan pack is required");
  if (planPack?.pack_id !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-363");
  if (planPack?.risk_class !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.risk_class) errors.push("CP00-363 risk class drift");
  if (planPack?.unit_count !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.unit_count) errors.push("CP00-363 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.first_unit_id) errors.push("CP00-363 first unit drift");
  if (unitIds.at(-1) !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.last_unit_id) errors.push("CP00-363 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-363 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP11")) errors.push("CP00-363 must only include RP11 units");
  const summary = createTimeExpenseCoreCp363CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-363 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-363 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-363 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-363 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-363 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-363 ${microId} missing row ${title}`);
    }
  }
  return freezeCp363Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(
  descriptor = createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_closeout_slice_case_set ?? createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet();
  if (descriptor.descriptor !== "TimeExpenseCoreCp363ReviewCloseoutSliceDescriptor") errors.push("CP00-363 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_review_foundation_descriptor !== "TimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor") {
    errors.push("CP00-363 source p08 closeout p09 review foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows).length) errors.push("CP00-363 section count drift");
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-363 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-363 ${microId} row count drift`);
    for (const title of titles) {
      const key = timeExpenseCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-363 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-363 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-363 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-363 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-363 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-363 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-363 ${microId} UI leak detected`);
    }
  }
  if (TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-363 must not promote Claude");
  if (TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-363 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-363 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-363 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id) {
    errors.push("CP00-363 contract current_pack drift");
  }
  if (
    contractProjection?.review_closeout_slice_descriptor?.descriptor &&
    contractProjection.review_closeout_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-363 contract review_closeout_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_pack_id) errors.push("CP00-363 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-363 next subphase drift");
  }
  return freezeCp363Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createTimeExpenseCoreCp363HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(),
) {
  const coverage = validateTimeExpenseCoreCp363Coverage(planPack);
  const slice = validateTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(descriptor, contractProjection);
  return freezeCp363Validation({
    evidence_packet: "H11.CP00-363.time_expense_core_review_closeout_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP363_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_closeout_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_review_foundation_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createTimeExpenseCoreCp363ClaudeReviewPacket(planPack) {
  const coverage = validateTimeExpenseCoreCp363Coverage(planPack);
  const slice = validateTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(), {});
  return freezeCp363Validation({
    review_packet: "C11.CP00-363.time_expense_core_review_closeout_slice_descriptor",
    gate: TIME_EXPENSE_CORE_CP363_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_closeout_slice_valid: slice.valid,
    invalid_review_blockers: TIME_EXPENSE_CORE_CP363_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-363 cover exactly the 12 planned RP11 units from RP11.P09.M09.S01 through RP11.P09.M10.S04?",
      "Do the two descriptor sections (P09 M09 Claude review packet head with architecture/security/permission-bypass/audit-completeness/missing-test/UI-leak/downstream-readiness questions and risk register, and M10 closeout head with the four core review question rows) cover every planned row title as descriptor-only rows?",
      "Does CP00-363 avoid permission bypass, UI leaks, Hermes runtime receipts, command runtime execution, permission decision leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack close the RP11 descriptor scope and hand off to RP12.P00.M00.S01 without treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createTimeExpenseCoreCp363CloseoutHandoff() {
  return freezeCp363Validation({
    handoff_id: "CP00-363-to-CP00-364",
    from_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
    to_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_pack_id,
    next_subphase_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_subphase_id,
    closed_scope: TIME_EXPENSE_CORE_CP363_PACK_BINDING.range,
    open_scope: "RP11 descriptor scope is closed; continue RP12.P00.M00.S01 onward with the next program while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: TIME_EXPENSE_CORE_CP363_PACK_BINDING.production_ready_flag,
  });
}
