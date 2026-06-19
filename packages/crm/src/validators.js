import {
  CRM_CORE_CP299_NO_WRITE_ATTESTATION,
  CRM_CORE_CP299_PACK_BINDING,
  CRM_CORE_CP299_REQUIREMENTS,
  CRM_CORE_CP300_NO_WRITE_ATTESTATION,
  CRM_CORE_CP300_PACK_BINDING,
  CRM_CORE_CP300_REQUIREMENTS,
  CRM_CORE_CP301_NO_WRITE_ATTESTATION,
  CRM_CORE_CP301_PACK_BINDING,
  CRM_CORE_CP301_REQUIREMENTS,
  CRM_CORE_CP302_NO_WRITE_ATTESTATION,
  CRM_CORE_CP302_PACK_BINDING,
  CRM_CORE_CP302_REQUIREMENTS,
  CRM_CORE_CP303_NO_WRITE_ATTESTATION,
  CRM_CORE_CP303_PACK_BINDING,
  CRM_CORE_CP303_REQUIREMENTS,
  CRM_CORE_CP304_NO_WRITE_ATTESTATION,
  CRM_CORE_CP304_PACK_BINDING,
  CRM_CORE_CP304_REQUIREMENTS,
  CRM_CORE_CP305_NO_WRITE_ATTESTATION,
  CRM_CORE_CP305_PACK_BINDING,
  CRM_CORE_CP305_REQUIREMENTS,
  CRM_CORE_CP306_NO_WRITE_ATTESTATION,
  CRM_CORE_CP306_PACK_BINDING,
  CRM_CORE_CP306_REQUIREMENTS,
  CRM_CORE_CP307_NO_WRITE_ATTESTATION,
  CRM_CORE_CP307_PACK_BINDING,
  CRM_CORE_CP307_REQUIREMENTS,
  CRM_CORE_CP308_NO_WRITE_ATTESTATION,
  CRM_CORE_CP308_PACK_BINDING,
  CRM_CORE_CP308_REQUIREMENTS,
  CRM_CORE_CP309_NO_WRITE_ATTESTATION,
  CRM_CORE_CP309_PACK_BINDING,
  CRM_CORE_CP309_REQUIREMENTS,
  CRM_CORE_CP310_NO_WRITE_ATTESTATION,
  CRM_CORE_CP310_PACK_BINDING,
  CRM_CORE_CP310_REQUIREMENTS,
  CRM_CORE_CP311_NO_WRITE_ATTESTATION,
  CRM_CORE_CP311_PACK_BINDING,
  CRM_CORE_CP311_REQUIREMENTS,
  CRM_CORE_CP312_NO_WRITE_ATTESTATION,
  CRM_CORE_CP312_PACK_BINDING,
  CRM_CORE_CP312_REQUIREMENTS,
  CRM_CORE_CP313_NO_WRITE_ATTESTATION,
  CRM_CORE_CP313_PACK_BINDING,
  CRM_CORE_CP313_REQUIREMENTS,
  CRM_CORE_CP314_NO_WRITE_ATTESTATION,
  CRM_CORE_CP314_PACK_BINDING,
  CRM_CORE_CP314_REQUIREMENTS,
  CRM_CORE_CP315_NO_WRITE_ATTESTATION,
  CRM_CORE_CP315_PACK_BINDING,
  CRM_CORE_CP315_REQUIREMENTS,
  CRM_CORE_CP316_NO_WRITE_ATTESTATION,
  CRM_CORE_CP316_PACK_BINDING,
  CRM_CORE_CP316_REQUIREMENTS,
  CRM_CORE_CP317_NO_WRITE_ATTESTATION,
  CRM_CORE_CP317_PACK_BINDING,
  CRM_CORE_CP317_REQUIREMENTS,
  CRM_CORE_CP318_NO_WRITE_ATTESTATION,
  CRM_CORE_CP318_PACK_BINDING,
  CRM_CORE_CP318_REQUIREMENTS,
  CRM_CORE_CP319_NO_WRITE_ATTESTATION,
  CRM_CORE_CP319_PACK_BINDING,
  CRM_CORE_CP319_REQUIREMENTS,
  CRM_CORE_CP320_NO_WRITE_ATTESTATION,
  CRM_CORE_CP320_PACK_BINDING,
  CRM_CORE_CP320_REQUIREMENTS,
} from "./registry.js";
import {
  createCrmCoreCp299ScopeContractFoundationCaseSet,
  createCrmCoreCp299ScopeContractFoundationDescriptor,
  createCrmCoreCp300P01CloseoutP02ServiceFoundationCaseSet,
  createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor,
  createCrmCoreCp301ServiceSliceCaseSet,
  createCrmCoreCp301ServiceSliceDescriptor,
  createCrmCoreCp302ServiceBindingSliceCaseSet,
  createCrmCoreCp302ServiceBindingSliceDescriptor,
  createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationCaseSet,
  createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  createCrmCoreCp304UiWorkflowSliceCaseSet,
  createCrmCoreCp304UiWorkflowSliceDescriptor,
  createCrmCoreCp305UiBindingSliceCaseSet,
  createCrmCoreCp305UiBindingSliceDescriptor,
  createCrmCoreCp306UiBindingTailCaseSet,
  createCrmCoreCp306UiBindingTailDescriptor,
  createCrmCoreCp307P04CloseoutP05FixtureFoundationCaseSet,
  createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor,
  createCrmCoreCp308FixtureSliceCaseSet,
  createCrmCoreCp308FixtureSliceDescriptor,
  createCrmCoreCp309FixtureBindingSliceCaseSet,
  createCrmCoreCp309FixtureBindingSliceDescriptor,
  createCrmCoreCp310P05CloseoutP06PermissionFoundationCaseSet,
  createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor,
  createCrmCoreCp311PermissionSliceCaseSet,
  createCrmCoreCp311PermissionSliceDescriptor,
  createCrmCoreCp312P06CloseoutP07FailureFoundationCaseSet,
  createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor,
  createCrmCoreCp313FailureSliceCaseSet,
  createCrmCoreCp313FailureSliceDescriptor,
  createCrmCoreCp314FailureBindingSliceCaseSet,
  createCrmCoreCp314FailureBindingSliceDescriptor,
  createCrmCoreCp315FailureTailSliceCaseSet,
  createCrmCoreCp315FailureTailSliceDescriptor,
  createCrmCoreCp316FailureFixtureSliceCaseSet,
  createCrmCoreCp316FailureFixtureSliceDescriptor,
  createCrmCoreCp317FailureHermesSliceCaseSet,
  createCrmCoreCp317FailureHermesSliceDescriptor,
  createCrmCoreCp318P07CloseoutP08HermesFoundationCaseSet,
  createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor,
  createCrmCoreCp319P08CloseoutP09ReviewFoundationCaseSet,
  createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor,
  createCrmCoreCp320ReviewCloseoutSliceCaseSet,
  createCrmCoreCp320ReviewCloseoutSliceDescriptor,
  crmCoreRowKey,
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

function freezeCp299Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP299_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP299_NO_WRITE_ATTESTATION,
  });
}

function freezeCp300Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP300_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP300_NO_WRITE_ATTESTATION,
  });
}

function freezeCp301Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP301_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP301_NO_WRITE_ATTESTATION,
  });
}

function freezeCp302Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP302_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP302_NO_WRITE_ATTESTATION,
  });
}

function freezeCp303Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP303_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP303_NO_WRITE_ATTESTATION,
  });
}

function freezeCp304Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP304_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP304_NO_WRITE_ATTESTATION,
  });
}

function freezeCp305Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP305_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP305_NO_WRITE_ATTESTATION,
  });
}

function freezeCp306Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP306_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP306_NO_WRITE_ATTESTATION,
  });
}

function freezeCp307Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP307_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP307_NO_WRITE_ATTESTATION,
  });
}

function freezeCp308Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP308_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP308_NO_WRITE_ATTESTATION,
  });
}

function freezeCp309Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP309_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP309_NO_WRITE_ATTESTATION,
  });
}

function freezeCp310Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP310_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP310_NO_WRITE_ATTESTATION,
  });
}

function freezeCp311Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP311_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP311_NO_WRITE_ATTESTATION,
  });
}

function freezeCp312Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP312_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP312_NO_WRITE_ATTESTATION,
  });
}

function freezeCp313Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP313_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP313_NO_WRITE_ATTESTATION,
  });
}

function freezeCp314Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP314_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP314_NO_WRITE_ATTESTATION,
  });
}

function freezeCp315Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP315_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP315_NO_WRITE_ATTESTATION,
  });
}

function freezeCp316Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP316_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP316_NO_WRITE_ATTESTATION,
  });
}

function freezeCp317Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP317_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP317_NO_WRITE_ATTESTATION,
  });
}

function freezeCp318Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP318_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP318_NO_WRITE_ATTESTATION,
  });
}

function freezeCp319Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP319_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP319_NO_WRITE_ATTESTATION,
  });
}

function freezeCp320Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: CRM_CORE_CP320_PACK_BINDING.pack_id,
    no_write_attestation: CRM_CORE_CP320_NO_WRITE_ATTESTATION,
  });
}

export function createCrmCoreCp299CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp299Validation({
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

export function validateCrmCoreCp299Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-299 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP299_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-299");
  if (planPack?.risk_class !== CRM_CORE_CP299_PACK_BINDING.risk_class) errors.push("CP00-299 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP299_PACK_BINDING.unit_count) errors.push("CP00-299 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP299_PACK_BINDING.first_unit_id) errors.push("CP00-299 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP299_PACK_BINDING.last_unit_id) errors.push("CP00-299 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-299 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-299 must only include RP09 units");
  const summary = createCrmCoreCp299CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-299 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-299 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-299 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-299 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-299 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-299 ${microId} missing row ${title}`);
    }
  }
  return freezeCp299Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp299ScopeContractFoundationDescriptor(
  descriptor = createCrmCoreCp299ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createCrmCoreCp299ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp299ScopeContractFoundationDescriptor") errors.push("CP00-299 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP09") errors.push("CP00-299 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP08") errors.push("CP00-299 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP299_REQUIREMENTS.required_section_rows).length) errors.push("CP00-299 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-299 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-299 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-299 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-299 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-299 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-299 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-299 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP299_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.non_goal_boundary && rows.non_goal_boundary.crm_runtime_opened !== false) {
      errors.push(`CP00-299 ${microId} must not open CRM runtime`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.permission_decision_detail_included !== false) {
      errors.push(`CP00-299 ${microId} permission baseline must not expose decisions`);
    }
    if (rows.permission_baseline_note && rows.permission_baseline_note.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-299 ${microId} permission baseline must deny cross-tenant access`);
    }
    if (rows.audit_baseline_note && rows.audit_baseline_note.audit_event_body_included !== false) {
      errors.push(`CP00-299 ${microId} audit baseline must not expose event bodies`);
    }
    if (rows.synthetic_data_policy && rows.synthetic_data_policy.real_client_data_loaded !== false) {
      errors.push(`CP00-299 ${microId} synthetic data policy drift`);
    }
    if (rows.tenant_scope_field && rows.tenant_scope_field.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-299 ${microId} tenant scope must deny cross-tenant access`);
    }
    if (rows.matter_trace_reference && rows.matter_trace_reference.matter_trace_required !== true) {
      errors.push(`CP00-299 ${microId} matter trace must be required`);
    }
    if (rows.state_transition_map && rows.state_transition_map.writes_state_transition !== false) {
      errors.push(`CP00-299 ${microId} state transition map must not write state`);
    }
    if (rows.fixture_model && rows.fixture_model.real_client_data_loaded !== false) {
      errors.push(`CP00-299 ${microId} fixture model must not load real data`);
    }
    if (rows.model_unit_test && rows.model_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-299 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_model_summary && rows.hermes_model_summary.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-299 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_model_review_prompt && rows.claude_model_review_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-299 ${microId} must not claim Claude final approval`);
    }
  }
  if (CRM_CORE_CP299_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-299 must not promote Claude");
  if (CRM_CORE_CP299_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-299 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-299 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-299 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP299_PACK_BINDING.pack_id,
      CRM_CORE_CP300_PACK_BINDING.pack_id,
      CRM_CORE_CP301_PACK_BINDING.pack_id,
      CRM_CORE_CP302_PACK_BINDING.pack_id,
      CRM_CORE_CP303_PACK_BINDING.pack_id,
      CRM_CORE_CP304_PACK_BINDING.pack_id,
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-299 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-299 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP299_PACK_BINDING.next_pack_id) errors.push("CP00-299 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP299_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-299 next subphase drift");
  }
  return freezeCp299Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp299HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp299ScopeContractFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp299Coverage(planPack);
  const foundation = validateCrmCoreCp299ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp299Validation({
    evidence_packet: "H09.CP00-299.crm_core_scope_contract_foundation_descriptor",
    gate: CRM_CORE_CP299_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_email_dms_core_pack_id: CRM_CORE_CP299_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP299_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP299_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP299_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp299ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp299Coverage(planPack);
  const foundation = validateCrmCoreCp299ScopeContractFoundationDescriptor(createCrmCoreCp299ScopeContractFoundationDescriptor(), {});
  return freezeCp299Validation({
    review_packet: "C09.CP00-299.crm_core_scope_contract_foundation_descriptor",
    gate: CRM_CORE_CP299_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP299_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP299_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-299 cover exactly the 150 planned RP09 units from RP09.P00.M00.S01 through RP09.P01.M08.S05?",
      "Do the twenty descriptor sections (P00 M00-M10 scope foundation cycle and P01 M00-M08 model foundation cycle with package directory layout, primary entity identifier, tenant scope field, matter trace reference, lifecycle status enum, ownership metadata, reference relationship map, field registries, state transition map, validation helper, fixture model, serialization shape, public export, model tests, Hermes model summary, Claude model review prompt, and closeout handoff) cover every planned row title as descriptor-only rows?",
      "Does CP00-299 avoid CRM/campaign/proposal/referral runtime, runtime permission evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, real data, permission decision leaks, audit event body leaks, fixture payload leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp299CloseoutHandoff() {
  return freezeCp299Validation({
    handoff_id: "CP00-299-to-CP00-300",
    from_pack_id: CRM_CORE_CP299_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP299_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP299_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP299_PACK_BINDING.range,
    open_scope: "Continue RP09.P01.M08.S06 onward with the remaining model foundation rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP299_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp300CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp300Validation({
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

export function validateCrmCoreCp300Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-300 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP300_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-300");
  if (planPack?.risk_class !== CRM_CORE_CP300_PACK_BINDING.risk_class) errors.push("CP00-300 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP300_PACK_BINDING.unit_count) errors.push("CP00-300 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP300_PACK_BINDING.first_unit_id) errors.push("CP00-300 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP300_PACK_BINDING.last_unit_id) errors.push("CP00-300 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-300 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-300 must only include RP09 units");
  const summary = createCrmCoreCp300CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-300 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-300 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-300 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-300 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-300 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-300 ${microId} missing row ${title}`);
    }
  }
  return freezeCp300Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(
  descriptor = createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_service_foundation_case_set ?? createCrmCoreCp300P01CloseoutP02ServiceFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor") errors.push("CP00-300 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "CrmCoreCp299ScopeContractFoundationDescriptor") {
    errors.push("CP00-300 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP300_REQUIREMENTS.required_section_rows).length) errors.push("CP00-300 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-300 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-300 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-300 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-300 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-300 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-300 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-300 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP300_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-300 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.matter_trace_precheck && rows.matter_trace_precheck.matter_trace_required !== true) {
      errors.push(`CP00-300 ${microId} matter trace must be required`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-300 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-300 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-300 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-300 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-300 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-300 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-300 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-300 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-300 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-300 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-300 ${microId} must not execute test runtime`);
    }
    if (rows.integration_smoke_case && rows.integration_smoke_case.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-300 ${microId} must not dispatch integration smoke runtime`);
    }
  }
  if (CRM_CORE_CP300_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-300 must not promote Claude");
  if (CRM_CORE_CP300_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-300 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-300 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-300 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP300_PACK_BINDING.pack_id,
      CRM_CORE_CP301_PACK_BINDING.pack_id,
      CRM_CORE_CP302_PACK_BINDING.pack_id,
      CRM_CORE_CP303_PACK_BINDING.pack_id,
      CRM_CORE_CP304_PACK_BINDING.pack_id,
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-300 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_service_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_service_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-300 contract p01_closeout_p02_service_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP300_PACK_BINDING.next_pack_id) errors.push("CP00-300 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP300_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-300 next subphase drift");
  }
  return freezeCp300Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp300HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp300Coverage(planPack);
  const foundation = validateCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(descriptor, contractProjection);
  return freezeCp300Validation({
    evidence_packet: "H09.CP00-300.crm_core_p01_closeout_p02_service_foundation_descriptor",
    gate: CRM_CORE_CP300_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: CRM_CORE_CP300_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP300_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP300_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP300_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp300ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp300Coverage(planPack);
  const foundation = validateCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(createCrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor(), {});
  return freezeCp300Validation({
    review_packet: "C09.CP00-300.crm_core_p01_closeout_p02_service_foundation_descriptor",
    gate: CRM_CORE_CP300_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP300_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP300_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-300 cover exactly the 150 planned RP09 units from RP09.P01.M08.S06 through RP09.P02.M07.S10?",
      "Do the eleven descriptor sections (P01 M08 Hermes tail, M09 Claude review packet, M10 closeout head, and eight P02 service micros with service entrypoint contracts, request normalization, tenant/matter/permission/audit prechecks, happy and workflow paths, state transition enforcement, idempotency key handling, lock acquisition rules, persistence boundaries, validation error mapping, review/approval routing, blocked-claim outputs, rollback/retry behavior, unit tests, and integration smoke cases) cover every planned row title as descriptor-only rows?",
      "Does CP00-300 avoid CRM/campaign/proposal/referral runtime, runtime permission evaluation, state writes, idempotency key persistence, runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, integration smoke runtime, Hermes runtime receipts, permission decision leaks, audit hint leaks, validation error leaks, blocked-claim detail leaks, lock token leaks, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp300CloseoutHandoff() {
  return freezeCp300Validation({
    handoff_id: "CP00-300-to-CP00-301",
    from_pack_id: CRM_CORE_CP300_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP300_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP300_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP300_PACK_BINDING.range,
    open_scope: "RP09.P01 descriptor scope is closed; continue RP09.P02.M07.S11 onward with the remaining service rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP300_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp301CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp301Validation({
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

export function validateCrmCoreCp301Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-301 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP301_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-301");
  if (planPack?.risk_class !== CRM_CORE_CP301_PACK_BINDING.risk_class) errors.push("CP00-301 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP301_PACK_BINDING.unit_count) errors.push("CP00-301 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP301_PACK_BINDING.first_unit_id) errors.push("CP00-301 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP301_PACK_BINDING.last_unit_id) errors.push("CP00-301 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-301 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-301 must only include RP09 units");
  const summary = createCrmCoreCp301CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-301 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-301 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-301 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-301 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-301 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-301 ${microId} missing row ${title}`);
    }
  }
  return freezeCp301Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp301ServiceSliceDescriptor(
  descriptor = createCrmCoreCp301ServiceSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_slice_case_set ?? createCrmCoreCp301ServiceSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp301ServiceSliceDescriptor") errors.push("CP00-301 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_service_foundation_descriptor !== "CrmCoreCp300P01CloseoutP02ServiceFoundationDescriptor") {
    errors.push("CP00-301 source p01 closeout p02 service foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP301_REQUIREMENTS.required_section_rows).length) errors.push("CP00-301 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-301 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-301 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-301 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-301 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-301 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-301 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-301 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP301_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-301 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-301 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-301 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-301 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-301 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-301 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-301 ${microId} must not execute test runtime`);
    }
    if (rows.unit_test_denied_path && rows.unit_test_denied_path.expected_outcome !== "denied_customer_safe") {
      errors.push(`CP00-301 ${microId} denied path outcome drift`);
    }
  }
  if (CRM_CORE_CP301_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-301 must not promote Claude");
  if (CRM_CORE_CP301_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-301 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-301 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-301 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP301_PACK_BINDING.pack_id,
      CRM_CORE_CP302_PACK_BINDING.pack_id,
      CRM_CORE_CP303_PACK_BINDING.pack_id,
      CRM_CORE_CP304_PACK_BINDING.pack_id,
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-301 contract current_pack drift");
  }
  if (
    contractProjection?.service_slice_descriptor?.descriptor &&
    contractProjection.service_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-301 contract service_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP301_PACK_BINDING.next_pack_id) errors.push("CP00-301 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP301_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-301 next subphase drift");
  }
  return freezeCp301Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp301HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp301ServiceSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp301Coverage(planPack);
  const slice = validateCrmCoreCp301ServiceSliceDescriptor(descriptor, contractProjection);
  return freezeCp301Validation({
    evidence_packet: "H09.CP00-301.crm_core_service_slice_descriptor",
    gate: CRM_CORE_CP301_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_service_foundation_pack_id: CRM_CORE_CP301_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP301_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP301_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP301_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp301ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp301Coverage(planPack);
  const slice = validateCrmCoreCp301ServiceSliceDescriptor(createCrmCoreCp301ServiceSliceDescriptor(), {});
  return freezeCp301Validation({
    review_packet: "C09.CP00-301.crm_core_service_slice_descriptor",
    gate: CRM_CORE_CP301_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP301_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP301_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-301 cover exactly the 10 planned RP09 units from RP09.P02.M07.S11 through RP09.P02.M07.S20?",
      "Does the single descriptor section (M07 test/golden tail with lock acquisition rule, persistence boundary, validation error mapping, review/approval-required routing, blocked-claim output, rollback/retry behavior, and happy/denied unit tests) cover every planned row title as a descriptor-only row, with the shared service guards applied?",
      "Does CP00-301 avoid runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, validation error leaks, blocked-claim detail leaks, lock token leaks, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp301CloseoutHandoff() {
  return freezeCp301Validation({
    handoff_id: "CP00-301-to-CP00-302",
    from_pack_id: CRM_CORE_CP301_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP301_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP301_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP301_PACK_BINDING.range,
    open_scope: "Continue RP09.P02.M07.S21 onward with the remaining service test rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP301_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp302CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp302Validation({
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

export function validateCrmCoreCp302Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-302 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP302_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-302");
  if (planPack?.risk_class !== CRM_CORE_CP302_PACK_BINDING.risk_class) errors.push("CP00-302 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP302_PACK_BINDING.unit_count) errors.push("CP00-302 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP302_PACK_BINDING.first_unit_id) errors.push("CP00-302 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP302_PACK_BINDING.last_unit_id) errors.push("CP00-302 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-302 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-302 must only include RP09 units");
  const summary = createCrmCoreCp302CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-302 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-302 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-302 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-302 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-302 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-302 ${microId} missing row ${title}`);
    }
  }
  return freezeCp302Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp302ServiceBindingSliceDescriptor(
  descriptor = createCrmCoreCp302ServiceBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_binding_slice_case_set ?? createCrmCoreCp302ServiceBindingSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp302ServiceBindingSliceDescriptor") errors.push("CP00-302 descriptor type drift");
  if (descriptor.source_service_slice_descriptor !== "CrmCoreCp301ServiceSliceDescriptor") {
    errors.push("CP00-302 source service slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP302_REQUIREMENTS.required_section_rows).length) errors.push("CP00-302 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-302 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-302 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-302 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-302 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-302 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-302 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-302 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP302_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.unit_test_review_path && rows.unit_test_review_path.expected_outcome !== "review_required") {
      errors.push(`CP00-302 ${microId} review path outcome drift`);
    }
    if (rows.integration_smoke_case && rows.integration_smoke_case.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-302 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-302 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.permission_precheck && rows.permission_precheck.permission_decision_detail_included !== false) {
      errors.push(`CP00-302 ${microId} permission precheck must not expose decisions`);
    }
    if (rows.audit_hint_precheck && rows.audit_hint_precheck.audit_hint_detail_included !== false) {
      errors.push(`CP00-302 ${microId} audit hint precheck must not expose hints`);
    }
    if (rows.state_transition_enforcement && rows.state_transition_enforcement.writes_state_transition !== false) {
      errors.push(`CP00-302 ${microId} must not write state transitions`);
    }
    if (rows.idempotency_key_handling && rows.idempotency_key_handling.persists_idempotency_key !== false) {
      errors.push(`CP00-302 ${microId} must not persist idempotency keys`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-302 ${microId} must not acquire runtime locks`);
    }
    if (rows.persistence_boundary && rows.persistence_boundary.creates_database_rows !== false) {
      errors.push(`CP00-302 ${microId} must not create database rows`);
    }
    if (rows.validation_error_mapping && rows.validation_error_mapping.validation_error_detail_included !== false) {
      errors.push(`CP00-302 ${microId} must not expose validation error details`);
    }
    if (rows.blocked_claim_output && rows.blocked_claim_output.blocked_claim_detail_included !== false) {
      errors.push(`CP00-302 ${microId} blocked-claim output must not expose details`);
    }
    if (rows.rollback_behavior && rows.rollback_behavior.performs_rollback_runtime !== false) {
      errors.push(`CP00-302 ${microId} must not perform rollback runtime`);
    }
    if (rows.retry_behavior && rows.retry_behavior.performs_retry_runtime !== false) {
      errors.push(`CP00-302 ${microId} must not perform retry runtime`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-302 ${microId} must not execute test runtime`);
    }
  }
  if (CRM_CORE_CP302_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-302 must not promote Claude");
  if (CRM_CORE_CP302_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-302 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-302 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-302 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP302_PACK_BINDING.pack_id,
      CRM_CORE_CP303_PACK_BINDING.pack_id,
      CRM_CORE_CP304_PACK_BINDING.pack_id,
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-302 contract current_pack drift");
  }
  if (
    contractProjection?.service_binding_slice_descriptor?.descriptor &&
    contractProjection.service_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-302 contract service_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP302_PACK_BINDING.next_pack_id) errors.push("CP00-302 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP302_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-302 next subphase drift");
  }
  return freezeCp302Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp302HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp302ServiceBindingSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp302Coverage(planPack);
  const slice = validateCrmCoreCp302ServiceBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp302Validation({
    evidence_packet: "H09.CP00-302.crm_core_service_binding_slice_descriptor",
    gate: CRM_CORE_CP302_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_service_slice_pack_id: CRM_CORE_CP302_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP302_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP302_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP302_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp302ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp302Coverage(planPack);
  const slice = validateCrmCoreCp302ServiceBindingSliceDescriptor(createCrmCoreCp302ServiceBindingSliceDescriptor(), {});
  return freezeCp302Validation({
    review_packet: "C09.CP00-302.crm_core_service_binding_slice_descriptor",
    gate: CRM_CORE_CP302_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP302_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_binding_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP302_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-302 cover exactly the 40 planned RP09 units from RP09.P02.M07.S21 through RP09.P02.M09.S18?",
      "Do the three descriptor sections (M07 test/golden tail with review-path unit test and integration smoke case, M08 full Hermes service cycle, M09 Claude review packet head) cover every planned row title as descriptor-only rows, with the shared service guards applied across every section that carries them?",
      "Does CP00-302 avoid runtime lock acquisition, database writes, rollback/retry runtime, test runtime paths, integration smoke runtime, state writes, idempotency key persistence, permission decision leaks, audit hint leaks, validation error leaks, blocked-claim detail leaks, lock token leaks, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp302CloseoutHandoff() {
  return freezeCp302Validation({
    handoff_id: "CP00-302-to-CP00-303",
    from_pack_id: CRM_CORE_CP302_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP302_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP302_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP302_PACK_BINDING.range,
    open_scope: "Continue RP09.P02.M09.S19 onward with the remaining service review rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP302_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp303CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp303Validation({
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

export function validateCrmCoreCp303Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-303 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP303_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-303");
  if (planPack?.risk_class !== CRM_CORE_CP303_PACK_BINDING.risk_class) errors.push("CP00-303 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP303_PACK_BINDING.unit_count) errors.push("CP00-303 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP303_PACK_BINDING.first_unit_id) errors.push("CP00-303 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP303_PACK_BINDING.last_unit_id) errors.push("CP00-303 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-303 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-303 must only include RP09 units");
  const summary = createCrmCoreCp303CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-303 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-303 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-303 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-303 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-303 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-303 ${microId} missing row ${title}`);
    }
  }
  return freezeCp303Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(
  descriptor = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_interface_p04_ui_foundation_case_set ?? createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor") errors.push("CP00-303 descriptor type drift");
  if (descriptor.source_service_binding_slice_descriptor !== "CrmCoreCp302ServiceBindingSliceDescriptor") {
    errors.push("CP00-303 source service binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP303_REQUIREMENTS.required_section_rows).length) errors.push("CP00-303 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-303 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-303 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-303 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-303 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-303 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-303 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-303 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP303_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_annotation && rows.permission_annotation.permission_decision_detail_included !== false) {
      errors.push(`CP00-303 ${microId} permission annotation must not expose decisions`);
    }
    if (rows.audit_annotation && rows.audit_annotation.audit_hint_detail_included !== false) {
      errors.push(`CP00-303 ${microId} audit annotation must not expose hints`);
    }
    if (rows.pagination_or_filtering_contract && rows.pagination_or_filtering_contract.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-303 ${microId} pagination must not leak unauthorized counts`);
    }
    if (rows.unauthorized_data_omission && rows.unauthorized_data_omission.unauthorized_data_omitted !== true) {
      errors.push(`CP00-303 ${microId} unauthorized data must be omitted`);
    }
    if (rows.api_fixture && rows.api_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-303 ${microId} API fixture must not load real data`);
    }
    if (rows.contract_test && rows.contract_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-303 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_api_evidence && rows.hermes_api_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-303 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_interface_prompt && rows.claude_interface_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-303 ${microId} must not claim Claude final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-303 ${microId} command rerun must not execute runtime`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-303 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-303 ${microId} denied state must not expose decisions`);
    }
    if (rows.tenant_boundary_precheck && rows.tenant_boundary_precheck.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-303 ${microId} tenant boundary must deny cross-tenant access`);
    }
    if (rows.lock_acquisition_rule && rows.lock_acquisition_rule.acquires_runtime_lock !== false) {
      errors.push(`CP00-303 ${microId} must not acquire runtime locks`);
    }
    if (rows.unit_test_happy_path && rows.unit_test_happy_path.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-303 ${microId} must not execute test runtime paths`);
    }
  }
  if (CRM_CORE_CP303_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-303 must not promote Claude");
  if (CRM_CORE_CP303_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-303 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-303 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-303 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP303_PACK_BINDING.pack_id,
      CRM_CORE_CP304_PACK_BINDING.pack_id,
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-303 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_interface_p04_ui_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_interface_p04_ui_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-303 contract p02_closeout_p03_interface_p04_ui_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP303_PACK_BINDING.next_pack_id) errors.push("CP00-303 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP303_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-303 next subphase drift");
  }
  return freezeCp303Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp303HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp303Coverage(planPack);
  const foundation = validateCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(descriptor, contractProjection);
  return freezeCp303Validation({
    evidence_packet: "H09.CP00-303.crm_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
    gate: CRM_CORE_CP303_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_p04_ui_foundation_valid: foundation.valid,
    no_real_data: true,
    source_service_binding_slice_pack_id: CRM_CORE_CP303_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP303_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP303_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP303_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp303ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp303Coverage(planPack);
  const foundation = validateCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(createCrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor(), {});
  return freezeCp303Validation({
    review_packet: "C09.CP00-303.crm_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor",
    gate: CRM_CORE_CP303_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP303_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_p04_ui_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP303_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-303 cover exactly the 150 planned RP09 units from RP09.P02.M09.S19 through RP09.P04.M03.S05?",
      "Do the seventeen descriptor sections (P02 M09 test tail and M10 closeout, the full P03 interface cycle M00-M10 with public export maps, request/response contracts, error code taxonomies, permission/audit annotations, pagination contracts with no unauthorized count leak, serialization guards, unauthorized data omission, API fixtures, contract/invalid/denied tests, Hermes API evidence, Claude interface prompts, documentation examples, versioning notes, downstream consumer notes, and command reruns, plus the P04 UI head M00-M03 with UI surface inventories, data dependency maps, and loading/empty/denied/review-required states and interactions) cover every planned row title as descriptor-only rows?",
      "Does CP00-303 avoid API handler execution, UI runtime, test runtime paths, permission decision leaks, audit hint leaks, unauthorized count leaks, fixture payload leaks, state writes, object storage, command runtime execution, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp303CloseoutHandoff() {
  return freezeCp303Validation({
    handoff_id: "CP00-303-to-CP00-304",
    from_pack_id: CRM_CORE_CP303_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP303_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP303_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP303_PACK_BINDING.range,
    open_scope: "RP09.P02 and RP09.P03 descriptor scopes are closed; continue RP09.P04.M03.S06 onward with the remaining UI rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP303_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp304CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp304Validation({
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

export function validateCrmCoreCp304Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-304 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP304_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-304");
  if (planPack?.risk_class !== CRM_CORE_CP304_PACK_BINDING.risk_class) errors.push("CP00-304 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP304_PACK_BINDING.unit_count) errors.push("CP00-304 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP304_PACK_BINDING.first_unit_id) errors.push("CP00-304 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP304_PACK_BINDING.last_unit_id) errors.push("CP00-304 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-304 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-304 must only include RP09 units");
  const summary = createCrmCoreCp304CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-304 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-304 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-304 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-304 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-304 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-304 ${microId} missing row ${title}`);
    }
  }
  return freezeCp304Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp304UiWorkflowSliceDescriptor(
  descriptor = createCrmCoreCp304UiWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_workflow_slice_case_set ?? createCrmCoreCp304UiWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp304UiWorkflowSliceDescriptor") errors.push("CP00-304 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_interface_p04_ui_foundation_descriptor !== "CrmCoreCp303P02CloseoutP03InterfaceP04UiFoundationDescriptor") {
    errors.push("CP00-304 source p02 closeout p03 interface p04 ui foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP304_REQUIREMENTS.required_section_rows).length) errors.push("CP00-304 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-304 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-304 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-304 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-304 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-304 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-304 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-304 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP304_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-304 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-304 ${microId} audit hint display must not expose hints`);
    }
    if (rows.error_message_copy && rows.error_message_copy.validation_error_detail_included !== false) {
      errors.push(`CP00-304 ${microId} error message copy must be customer-safe`);
    }
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-304 ${microId} fixture binding must not load real data`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-304 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.hermes_ui_evidence && rows.hermes_ui_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-304 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-304 ${microId} UI leak detected`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-304 ${microId} must not claim Claude final approval`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-304 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-304 ${microId} denied state must not expose decisions`);
    }
  }
  if (CRM_CORE_CP304_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-304 must not promote Claude");
  if (CRM_CORE_CP304_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-304 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-304 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-304 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP304_PACK_BINDING.pack_id,
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-304 contract current_pack drift");
  }
  if (
    contractProjection?.ui_workflow_slice_descriptor?.descriptor &&
    contractProjection.ui_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-304 contract ui_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP304_PACK_BINDING.next_pack_id) errors.push("CP00-304 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP304_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-304 next subphase drift");
  }
  return freezeCp304Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp304HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp304UiWorkflowSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp304Coverage(planPack);
  const slice = validateCrmCoreCp304UiWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp304Validation({
    evidence_packet: "H09.CP00-304.crm_core_ui_workflow_slice_descriptor",
    gate: CRM_CORE_CP304_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_p02_closeout_p03_interface_p04_ui_foundation_pack_id: CRM_CORE_CP304_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP304_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP304_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP304_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp304ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp304Coverage(planPack);
  const slice = validateCrmCoreCp304UiWorkflowSliceDescriptor(createCrmCoreCp304UiWorkflowSliceDescriptor(), {});
  return freezeCp304Validation({
    review_packet: "C09.CP00-304.crm_core_ui_workflow_slice_descriptor",
    gate: CRM_CORE_CP304_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP304_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP304_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-304 cover exactly the 40 planned RP09 units from RP09.P04.M03.S06 through RP09.P04.M05.S05?",
      "Do the three descriptor sections (M03 primary UI tail with permission badge, audit hint display, error message copy, responsive layouts, keyboard/focus behavior, visual density, synthetic fixture binding, build smoke, Hermes UI evidence, Claude UI leak prompt, and closeout handoff; M04 full secondary workflow UI cycle; M05 permission/audit binding head) cover every planned row title as descriptor-only rows, with the shared UI guards applied?",
      "Does CP00-304 avoid UI runtime execution, permission decision leaks, audit hint leaks, validation error leaks, unauthorized count leaks, fixture payload leaks, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp304CloseoutHandoff() {
  return freezeCp304Validation({
    handoff_id: "CP00-304-to-CP00-305",
    from_pack_id: CRM_CORE_CP304_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP304_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP304_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP304_PACK_BINDING.range,
    open_scope: "Continue RP09.P04.M05.S06 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP304_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp305CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp305Validation({
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

export function validateCrmCoreCp305Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-305 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP305_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-305");
  if (planPack?.risk_class !== CRM_CORE_CP305_PACK_BINDING.risk_class) errors.push("CP00-305 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP305_PACK_BINDING.unit_count) errors.push("CP00-305 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP305_PACK_BINDING.first_unit_id) errors.push("CP00-305 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP305_PACK_BINDING.last_unit_id) errors.push("CP00-305 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-305 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-305 must only include RP09 units");
  const summary = createCrmCoreCp305CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-305 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-305 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-305 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-305 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-305 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-305 ${microId} missing row ${title}`);
    }
  }
  return freezeCp305Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp305UiBindingSliceDescriptor(
  descriptor = createCrmCoreCp305UiBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_binding_slice_case_set ?? createCrmCoreCp305UiBindingSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp305UiBindingSliceDescriptor") errors.push("CP00-305 descriptor type drift");
  if (descriptor.source_ui_workflow_slice_descriptor !== "CrmCoreCp304UiWorkflowSliceDescriptor") {
    errors.push("CP00-305 source ui workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP305_REQUIREMENTS.required_section_rows).length) errors.push("CP00-305 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-305 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-305 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-305 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-305 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-305 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-305 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-305 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP305_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_badge && rows.permission_badge.permission_decision_detail_included !== false) {
      errors.push(`CP00-305 ${microId} permission badge must not expose decisions`);
    }
    if (rows.audit_hint_display && rows.audit_hint_display.audit_hint_detail_included !== false) {
      errors.push(`CP00-305 ${microId} audit hint display must not expose hints`);
    }
    if (rows.error_message_copy && rows.error_message_copy.validation_error_detail_included !== false) {
      errors.push(`CP00-305 ${microId} error message copy must be customer-safe`);
    }
  }
  if (CRM_CORE_CP305_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-305 must not promote Claude");
  if (CRM_CORE_CP305_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-305 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-305 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-305 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP305_PACK_BINDING.pack_id,
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-305 contract current_pack drift");
  }
  if (
    contractProjection?.ui_binding_slice_descriptor?.descriptor &&
    contractProjection.ui_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-305 contract ui_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP305_PACK_BINDING.next_pack_id) errors.push("CP00-305 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP305_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-305 next subphase drift");
  }
  return freezeCp305Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp305HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp305UiBindingSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp305Coverage(planPack);
  const slice = validateCrmCoreCp305UiBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp305Validation({
    evidence_packet: "H09.CP00-305.crm_core_ui_binding_slice_descriptor",
    gate: CRM_CORE_CP305_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_ui_workflow_slice_pack_id: CRM_CORE_CP305_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP305_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP305_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP305_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp305ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp305Coverage(planPack);
  const slice = validateCrmCoreCp305UiBindingSliceDescriptor(createCrmCoreCp305UiBindingSliceDescriptor(), {});
  return freezeCp305Validation({
    review_packet: "C09.CP00-305.crm_core_ui_binding_slice_descriptor",
    gate: CRM_CORE_CP305_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP305_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_binding_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP305_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-305 cover exactly the 10 planned RP09 units from RP09.P04.M05.S06 through RP09.P04.M05.S15?",
      "Does the single descriptor section (M05 permission/audit binding UI middle with review-required state, interactions, permission badge, audit hint display, error message copy, responsive layouts, keyboard/focus behavior, and visual density check) cover every planned row title as a descriptor-only row, with the shared UI guards applied?",
      "Does CP00-305 avoid UI runtime execution, permission decision leaks, audit hint leaks, validation error leaks, unauthorized count leaks, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp305CloseoutHandoff() {
  return freezeCp305Validation({
    handoff_id: "CP00-305-to-CP00-306",
    from_pack_id: CRM_CORE_CP305_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP305_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP305_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP305_PACK_BINDING.range,
    open_scope: "Continue RP09.P04.M05.S16 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP305_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp306CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp306Validation({
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

export function validateCrmCoreCp306Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-306 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP306_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-306");
  if (planPack?.risk_class !== CRM_CORE_CP306_PACK_BINDING.risk_class) errors.push("CP00-306 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP306_PACK_BINDING.unit_count) errors.push("CP00-306 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP306_PACK_BINDING.first_unit_id) errors.push("CP00-306 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP306_PACK_BINDING.last_unit_id) errors.push("CP00-306 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-306 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-306 must only include RP09 units");
  const summary = createCrmCoreCp306CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-306 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-306 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-306 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-306 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-306 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-306 ${microId} missing row ${title}`);
    }
  }
  return freezeCp306Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp306UiBindingTailDescriptor(
  descriptor = createCrmCoreCp306UiBindingTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_binding_tail_case_set ?? createCrmCoreCp306UiBindingTailCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp306UiBindingTailDescriptor") errors.push("CP00-306 descriptor type drift");
  if (descriptor.source_ui_binding_slice_descriptor !== "CrmCoreCp305UiBindingSliceDescriptor") {
    errors.push("CP00-306 source ui binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP306_REQUIREMENTS.required_section_rows).length) errors.push("CP00-306 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-306 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-306 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-306 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-306 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-306 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-306 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-306 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP306_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.synthetic_fixture_binding && rows.synthetic_fixture_binding.real_client_data_loaded !== false) {
      errors.push(`CP00-306 ${microId} fixture binding must not load real data`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-306 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.hermes_ui_evidence && rows.hermes_ui_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-306 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-306 ${microId} UI leak detected`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-306 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-306 ${microId} denied state must not expose decisions`);
    }
  }
  if (CRM_CORE_CP306_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-306 must not promote Claude");
  if (CRM_CORE_CP306_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-306 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-306 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-306 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP306_PACK_BINDING.pack_id,
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-306 contract current_pack drift");
  }
  if (
    contractProjection?.ui_binding_tail_descriptor?.descriptor &&
    contractProjection.ui_binding_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-306 contract ui_binding_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP306_PACK_BINDING.next_pack_id) errors.push("CP00-306 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP306_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-306 next subphase drift");
  }
  return freezeCp306Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp306HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp306UiBindingTailDescriptor(),
) {
  const coverage = validateCrmCoreCp306Coverage(planPack);
  const tail = validateCrmCoreCp306UiBindingTailDescriptor(descriptor, contractProjection);
  return freezeCp306Validation({
    evidence_packet: "H09.CP00-306.crm_core_ui_binding_tail_descriptor",
    gate: CRM_CORE_CP306_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_binding_tail_valid: tail.valid,
    no_real_data: true,
    source_ui_binding_slice_pack_id: CRM_CORE_CP306_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP306_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP306_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP306_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createCrmCoreCp306ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp306Coverage(planPack);
  const tail = validateCrmCoreCp306UiBindingTailDescriptor(createCrmCoreCp306UiBindingTailDescriptor(), {});
  return freezeCp306Validation({
    review_packet: "C09.CP00-306.crm_core_ui_binding_tail_descriptor",
    gate: CRM_CORE_CP306_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP306_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_binding_tail_valid: tail.valid,
    invalid_review_blockers: CRM_CORE_CP306_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-306 cover exactly the 10 planned RP09 units from RP09.P04.M05.S16 through RP09.P04.M06.S05?",
      "Do the two descriptor sections (M05 permission/audit binding UI tail with synthetic fixture binding, build smoke, Hermes UI evidence, Claude UI leak prompt, and closeout handoff; M06 synthetic fixture head with UI surface inventory, data dependency map, and loading/empty/denied states) cover every planned row title as descriptor-only rows, with the shared UI guards applied?",
      "Does CP00-306 avoid UI runtime execution, fixture payload leaks, permission decision leaks, audit hint leaks, unauthorized count leaks, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp306CloseoutHandoff() {
  return freezeCp306Validation({
    handoff_id: "CP00-306-to-CP00-307",
    from_pack_id: CRM_CORE_CP306_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP306_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP306_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP306_PACK_BINDING.range,
    open_scope: "Continue RP09.P04.M06.S06 onward with the remaining UI fixture rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP306_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp307CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp307Validation({
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

export function validateCrmCoreCp307Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-307 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP307_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-307");
  if (planPack?.risk_class !== CRM_CORE_CP307_PACK_BINDING.risk_class) errors.push("CP00-307 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP307_PACK_BINDING.unit_count) errors.push("CP00-307 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP307_PACK_BINDING.first_unit_id) errors.push("CP00-307 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP307_PACK_BINDING.last_unit_id) errors.push("CP00-307 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-307 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-307 must only include RP09 units");
  const summary = createCrmCoreCp307CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-307 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-307 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-307 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-307 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-307 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-307 ${microId} missing row ${title}`);
    }
  }
  return freezeCp307Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(
  descriptor = createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_closeout_p05_fixture_foundation_case_set ?? createCrmCoreCp307P04CloseoutP05FixtureFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor") errors.push("CP00-307 descriptor type drift");
  if (descriptor.source_ui_binding_tail_descriptor !== "CrmCoreCp306UiBindingTailDescriptor") {
    errors.push("CP00-307 source ui binding tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP307_REQUIREMENTS.required_section_rows).length) errors.push("CP00-307 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-307 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-307 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-307 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-307 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-307 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-307 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-307 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP307_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.base_tenant_fixture && rows.base_tenant_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-307 ${microId} base tenant fixture must not load real data`);
    }
    if (rows.denied_case && rows.denied_case.permission_decision_detail_included !== false) {
      errors.push(`CP00-307 ${microId} denied case must not expose decisions`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-307 ${microId} cross-tenant case must deny access`);
    }
    if (rows.audit_hint_case && rows.audit_hint_case.audit_hint_detail_included !== false) {
      errors.push(`CP00-307 ${microId} audit hint case must not expose hints`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-307 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-307 ${microId} must not dispatch AI runtime`);
    }
    if (rows.golden_test && rows.golden_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-307 ${microId} must not execute test runtime`);
    }
    if (rows.hermes_fixture_evidence && rows.hermes_fixture_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-307 ${microId} must not emit Hermes receipts`);
    }
    if (rows.claude_missing_test_prompt && rows.claude_missing_test_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-307 ${microId} must not claim Claude final approval`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-307 ${microId} no-real-data check drift`);
    }
    if (rows.build_smoke && rows.build_smoke.executes_ui_runtime !== false) {
      errors.push(`CP00-307 ${microId} build smoke must not execute UI runtime`);
    }
    if (rows.claude_ui_leak_prompt && rows.claude_ui_leak_prompt.leak_detected !== false) {
      errors.push(`CP00-307 ${microId} UI leak detected`);
    }
    if (rows.empty_state && rows.empty_state.no_unauthorized_count_leak !== true) {
      errors.push(`CP00-307 ${microId} empty state must not leak unauthorized counts`);
    }
    if (rows.denied_state && rows.denied_state.permission_decision_detail_included !== false) {
      errors.push(`CP00-307 ${microId} denied state must not expose decisions`);
    }
  }
  if (CRM_CORE_CP307_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-307 must not promote Claude");
  if (CRM_CORE_CP307_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-307 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-307 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-307 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP307_PACK_BINDING.pack_id,
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-307 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_fixture_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_fixture_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-307 contract p04_closeout_p05_fixture_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP307_PACK_BINDING.next_pack_id) errors.push("CP00-307 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP307_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-307 next subphase drift");
  }
  return freezeCp307Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp307HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp307Coverage(planPack);
  const foundation = validateCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp307Validation({
    evidence_packet: "H09.CP00-307.crm_core_p04_closeout_p05_fixture_foundation_descriptor",
    gate: CRM_CORE_CP307_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_fixture_foundation_valid: foundation.valid,
    no_real_data: true,
    source_ui_binding_tail_pack_id: CRM_CORE_CP307_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP307_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP307_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP307_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp307ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp307Coverage(planPack);
  const foundation = validateCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(createCrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor(), {});
  return freezeCp307Validation({
    review_packet: "C09.CP00-307.crm_core_p04_closeout_p05_fixture_foundation_descriptor",
    gate: CRM_CORE_CP307_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP307_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_fixture_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP307_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-307 cover exactly the 150 planned RP09 units from RP09.P04.M06.S06 through RP09.P05.M05.S07?",
      "Do the eleven descriptor sections (P04 M06 fixture tail, M07-M09 full UI cycles, M10 closeout head, and six P05 fixture micros with base tenant/user/matter/document fixtures, golden/review/denied/cross-tenant/missing-context cases, audit hint cases, security trimming cases, AI retrieval or analytics cases, fixture manifests, golden/failure tests, Hermes fixture evidence, Claude missing-test prompts, closeout handoffs, and no-real-data checks) cover every planned row title as descriptor-only rows?",
      "Does CP00-307 avoid UI runtime execution, AI runtime dispatch, test runtime paths, fixture payload leaks, permission decision leaks, audit hint leaks, unauthorized count leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp307CloseoutHandoff() {
  return freezeCp307Validation({
    handoff_id: "CP00-307-to-CP00-308",
    from_pack_id: CRM_CORE_CP307_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP307_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP307_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP307_PACK_BINDING.range,
    open_scope: "RP09.P04 descriptor scope is closed; continue RP09.P05.M05.S08 onward with the remaining fixture rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP307_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp308CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp308Validation({
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

export function validateCrmCoreCp308Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-308 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP308_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-308");
  if (planPack?.risk_class !== CRM_CORE_CP308_PACK_BINDING.risk_class) errors.push("CP00-308 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP308_PACK_BINDING.unit_count) errors.push("CP00-308 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP308_PACK_BINDING.first_unit_id) errors.push("CP00-308 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP308_PACK_BINDING.last_unit_id) errors.push("CP00-308 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-308 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-308 must only include RP09 units");
  const summary = createCrmCoreCp308CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-308 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-308 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-308 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-308 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-308 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-308 ${microId} missing row ${title}`);
    }
  }
  return freezeCp308Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp308FixtureSliceDescriptor(
  descriptor = createCrmCoreCp308FixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_slice_case_set ?? createCrmCoreCp308FixtureSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp308FixtureSliceDescriptor") errors.push("CP00-308 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_fixture_foundation_descriptor !== "CrmCoreCp307P04CloseoutP05FixtureFoundationDescriptor") {
    errors.push("CP00-308 source p04 closeout p05 fixture foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP308_REQUIREMENTS.required_section_rows).length) errors.push("CP00-308 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-308 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-308 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-308 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-308 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-308 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-308 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-308 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP308_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.denied_case && rows.denied_case.permission_decision_detail_included !== false) {
      errors.push(`CP00-308 ${microId} denied case must not expose decisions`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-308 ${microId} cross-tenant case must deny access`);
    }
    if (rows.audit_hint_case && rows.audit_hint_case.audit_hint_detail_included !== false) {
      errors.push(`CP00-308 ${microId} audit hint case must not expose hints`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-308 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-308 ${microId} must not dispatch AI runtime`);
    }
    if (rows.golden_test && rows.golden_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-308 ${microId} must not execute test runtime`);
    }
    if (rows.failure_test && rows.failure_test.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-308 ${microId} failure test outcome drift`);
    }
    if (rows.hermes_fixture_evidence && rows.hermes_fixture_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-308 ${microId} must not emit Hermes receipts`);
    }
  }
  if (CRM_CORE_CP308_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-308 must not promote Claude");
  if (CRM_CORE_CP308_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-308 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-308 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-308 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP308_PACK_BINDING.pack_id,
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-308 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_slice_descriptor?.descriptor &&
    contractProjection.fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-308 contract fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP308_PACK_BINDING.next_pack_id) errors.push("CP00-308 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP308_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-308 next subphase drift");
  }
  return freezeCp308Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp308HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp308FixtureSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp308Coverage(planPack);
  const slice = validateCrmCoreCp308FixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp308Validation({
    evidence_packet: "H09.CP00-308.crm_core_fixture_slice_descriptor",
    gate: CRM_CORE_CP308_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_closeout_p05_fixture_foundation_pack_id: CRM_CORE_CP308_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP308_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP308_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP308_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp308ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp308Coverage(planPack);
  const slice = validateCrmCoreCp308FixtureSliceDescriptor(createCrmCoreCp308FixtureSliceDescriptor(), {});
  return freezeCp308Validation({
    review_packet: "C09.CP00-308.crm_core_fixture_slice_descriptor",
    gate: CRM_CORE_CP308_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP308_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP308_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-308 cover exactly the 10 planned RP09 units from RP09.P05.M05.S08 through RP09.P05.M05.S17?",
      "Does the single descriptor section (M05 permission/audit binding fixture middle with denied/cross-tenant/missing-context cases, audit hint case, security trimming case, AI retrieval or analytics case, fixture manifest, golden/failure tests, and Hermes fixture evidence) cover every planned row title as a descriptor-only row, with the shared fixture guards applied?",
      "Does CP00-308 avoid AI runtime dispatch, test runtime paths, fixture payload leaks, permission decision leaks, audit hint leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp308CloseoutHandoff() {
  return freezeCp308Validation({
    handoff_id: "CP00-308-to-CP00-309",
    from_pack_id: CRM_CORE_CP308_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP308_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP308_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP308_PACK_BINDING.range,
    open_scope: "Continue RP09.P05.M05.S18 onward with the remaining fixture binding rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP308_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp309CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp309Validation({
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

export function validateCrmCoreCp309Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-309 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP309_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-309");
  if (planPack?.risk_class !== CRM_CORE_CP309_PACK_BINDING.risk_class) errors.push("CP00-309 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP309_PACK_BINDING.unit_count) errors.push("CP00-309 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP309_PACK_BINDING.first_unit_id) errors.push("CP00-309 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP309_PACK_BINDING.last_unit_id) errors.push("CP00-309 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-309 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-309 must only include RP09 units");
  const summary = createCrmCoreCp309CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-309 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-309 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-309 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-309 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-309 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-309 ${microId} missing row ${title}`);
    }
  }
  return freezeCp309Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp309FixtureBindingSliceDescriptor(
  descriptor = createCrmCoreCp309FixtureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_binding_slice_case_set ?? createCrmCoreCp309FixtureBindingSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp309FixtureBindingSliceDescriptor") errors.push("CP00-309 descriptor type drift");
  if (descriptor.source_fixture_slice_descriptor !== "CrmCoreCp308FixtureSliceDescriptor") {
    errors.push("CP00-309 source fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP309_REQUIREMENTS.required_section_rows).length) errors.push("CP00-309 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-309 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-309 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-309 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-309 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-309 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-309 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-309 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP309_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.claude_missing_test_prompt && rows.claude_missing_test_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-309 ${microId} must not claim Claude final approval`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-309 ${microId} no-real-data check drift`);
    }
    if (rows.base_tenant_fixture && rows.base_tenant_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-309 ${microId} base tenant fixture must not load real data`);
    }
    if (rows.review_required_case && rows.review_required_case.expected_outcome !== "review_required") {
      errors.push(`CP00-309 ${microId} review-required case outcome drift`);
    }
  }
  if (CRM_CORE_CP309_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-309 must not promote Claude");
  if (CRM_CORE_CP309_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-309 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-309 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-309 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP309_PACK_BINDING.pack_id,
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-309 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_binding_slice_descriptor?.descriptor &&
    contractProjection.fixture_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-309 contract fixture_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP309_PACK_BINDING.next_pack_id) errors.push("CP00-309 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP309_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-309 next subphase drift");
  }
  return freezeCp309Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp309HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp309FixtureBindingSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp309Coverage(planPack);
  const slice = validateCrmCoreCp309FixtureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp309Validation({
    evidence_packet: "H09.CP00-309.crm_core_fixture_binding_slice_descriptor",
    gate: CRM_CORE_CP309_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_fixture_slice_pack_id: CRM_CORE_CP309_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP309_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP309_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP309_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp309ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp309Coverage(planPack);
  const slice = validateCrmCoreCp309FixtureBindingSliceDescriptor(createCrmCoreCp309FixtureBindingSliceDescriptor(), {});
  return freezeCp309Validation({
    review_packet: "C09.CP00-309.crm_core_fixture_binding_slice_descriptor",
    gate: CRM_CORE_CP309_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP309_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_binding_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP309_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-309 cover exactly the 10 planned RP09 units from RP09.P05.M05.S18 through RP09.P05.M06.S07?",
      "Do the two descriptor sections (M05 permission/audit binding fixture tail with Claude missing-test prompt, closeout handoff, and no-real-data check; M06 synthetic fixture head with base tenant/user/matter/document fixtures and golden/review-required cases) cover every planned row title as descriptor-only rows, with the shared fixture guards applied?",
      "Does CP00-309 avoid AI runtime dispatch, test runtime paths, fixture payload leaks, permission decision leaks, audit hint leaks, real data, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp309CloseoutHandoff() {
  return freezeCp309Validation({
    handoff_id: "CP00-309-to-CP00-310",
    from_pack_id: CRM_CORE_CP309_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP309_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP309_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP309_PACK_BINDING.range,
    open_scope: "Continue RP09.P05.M06.S08 onward with the remaining fixture rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP309_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp310CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp310Validation({
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

export function validateCrmCoreCp310Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-310 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP310_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-310");
  if (planPack?.risk_class !== CRM_CORE_CP310_PACK_BINDING.risk_class) errors.push("CP00-310 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP310_PACK_BINDING.unit_count) errors.push("CP00-310 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP310_PACK_BINDING.first_unit_id) errors.push("CP00-310 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP310_PACK_BINDING.last_unit_id) errors.push("CP00-310 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-310 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-310 must only include RP09 units");
  const summary = createCrmCoreCp310CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-310 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-310 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-310 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-310 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-310 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-310 ${microId} missing row ${title}`);
    }
  }
  return freezeCp310Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(
  descriptor = createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_permission_foundation_case_set ?? createCrmCoreCp310P05CloseoutP06PermissionFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor") errors.push("CP00-310 descriptor type drift");
  if (descriptor.source_fixture_binding_slice_descriptor !== "CrmCoreCp309FixtureBindingSliceDescriptor") {
    errors.push("CP00-310 source fixture binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP310_REQUIREMENTS.required_section_rows).length) errors.push("CP00-310 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-310 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-310 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-310 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-310 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-310 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-310 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-310 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP310_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.deny_over_allow_enforced !== true) {
      errors.push(`CP00-310 ${microId} permission matrix must enforce deny-over-allow`);
    }
    if (rows.view_decision_binding && rows.view_decision_binding.permission_decision_detail_included !== false) {
      errors.push(`CP00-310 ${microId} view decision must not expose details`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-310 ${microId} AI retrieval binding must not dispatch AI runtime`);
    }
    if (rows.audit_hint_fields && rows.audit_hint_fields.audit_hint_detail_included !== false) {
      errors.push(`CP00-310 ${microId} audit hint fields must not expose hints`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-310 ${microId} deny-over-allow check drift`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-310 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.writes_audit_event !== false) {
      errors.push(`CP00-310 ${microId} audit event expectation must not write events`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-310 ${microId} permission fixture must not load real data`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-310 ${microId} must not execute test runtime`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-310 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-310 ${microId} leak detected`);
    }
    if (rows.cross_tenant_case && rows.cross_tenant_case.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-310 ${microId} cross-tenant case must deny access`);
    }
    if (rows.security_trimming_case && rows.security_trimming_case.unauthorized_data_omitted !== true) {
      errors.push(`CP00-310 ${microId} security trimming case must omit unauthorized data`);
    }
    if (rows.ai_retrieval_or_analytics_case && rows.ai_retrieval_or_analytics_case.dispatches_ai_runtime !== false) {
      errors.push(`CP00-310 ${microId} must not dispatch AI runtime`);
    }
    if (rows.no_real_data_check && rows.no_real_data_check.real_client_data_loaded !== false) {
      errors.push(`CP00-310 ${microId} no-real-data check drift`);
    }
  }
  if (CRM_CORE_CP310_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-310 must not promote Claude");
  if (CRM_CORE_CP310_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-310 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-310 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-310 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP310_PACK_BINDING.pack_id,
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-310 contract current_pack drift");
  }
  if (
    contractProjection?.p05_closeout_p06_permission_foundation_descriptor?.descriptor &&
    contractProjection.p05_closeout_p06_permission_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-310 contract p05_closeout_p06_permission_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP310_PACK_BINDING.next_pack_id) errors.push("CP00-310 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP310_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-310 next subphase drift");
  }
  return freezeCp310Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp310HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp310Coverage(planPack);
  const foundation = validateCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(descriptor, contractProjection);
  return freezeCp310Validation({
    evidence_packet: "H09.CP00-310.crm_core_p05_closeout_p06_permission_foundation_descriptor",
    gate: CRM_CORE_CP310_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_closeout_p06_permission_foundation_valid: foundation.valid,
    no_real_data: true,
    source_fixture_binding_slice_pack_id: CRM_CORE_CP310_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP310_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP310_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP310_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp310ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp310Coverage(planPack);
  const foundation = validateCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(createCrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor(), {});
  return freezeCp310Validation({
    review_packet: "C09.CP00-310.crm_core_p05_closeout_p06_permission_foundation_descriptor",
    gate: CRM_CORE_CP310_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP310_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_closeout_p06_permission_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP310_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-310 cover exactly the 150 planned RP09 units from RP09.P05.M06.S08 through RP09.P06.M04.S05?",
      "Do the ten descriptor sections (P05 M06 fixture tail, M07-M09 full fixture cycles, M10 closeout head, and five P06 permission micros with permission matrix rows, view/search/mutation/export-download/share/AI-retrieval decision bindings, audit hint fields, matched rule captures, deny-over-allow checks, legal hold/ethical wall/object ACL interactions, review/approval routes, security trimming proofs, audit event expectations, permission fixtures, and allowed/denied/cross-tenant/leak-prevention tests) cover every planned row title as descriptor-only rows?",
      "Does CP00-310 avoid runtime permission evaluation, audit event writes, AI runtime dispatch, test runtime paths, permission decision leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp310CloseoutHandoff() {
  return freezeCp310Validation({
    handoff_id: "CP00-310-to-CP00-311",
    from_pack_id: CRM_CORE_CP310_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP310_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP310_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP310_PACK_BINDING.range,
    open_scope: "RP09.P05 descriptor scope is closed; continue RP09.P06.M04.S06 onward with the remaining permission rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP310_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp311CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp311Validation({
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

export function validateCrmCoreCp311Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-311 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP311_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-311");
  if (planPack?.risk_class !== CRM_CORE_CP311_PACK_BINDING.risk_class) errors.push("CP00-311 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP311_PACK_BINDING.unit_count) errors.push("CP00-311 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP311_PACK_BINDING.first_unit_id) errors.push("CP00-311 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP311_PACK_BINDING.last_unit_id) errors.push("CP00-311 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-311 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-311 must only include RP09 units");
  const summary = createCrmCoreCp311CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-311 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-311 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-311 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-311 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-311 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-311 ${microId} missing row ${title}`);
    }
  }
  return freezeCp311Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp311PermissionSliceDescriptor(
  descriptor = createCrmCoreCp311PermissionSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_slice_case_set ?? createCrmCoreCp311PermissionSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp311PermissionSliceDescriptor") errors.push("CP00-311 descriptor type drift");
  if (descriptor.source_p05_closeout_p06_permission_foundation_descriptor !== "CrmCoreCp310P05CloseoutP06PermissionFoundationDescriptor") {
    errors.push("CP00-311 source p05 closeout p06 permission foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP311_REQUIREMENTS.required_section_rows).length) errors.push("CP00-311 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-311 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-311 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-311 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-311 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-311 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-311 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-311 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP311_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.deny_over_allow_enforced !== true) {
      errors.push(`CP00-311 ${microId} permission matrix must enforce deny-over-allow`);
    }
    if (rows.view_decision_binding && rows.view_decision_binding.permission_decision_detail_included !== false) {
      errors.push(`CP00-311 ${microId} view decision must not expose details`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-311 ${microId} AI retrieval binding must not dispatch AI runtime`);
    }
    if (rows.audit_hint_fields && rows.audit_hint_fields.audit_hint_detail_included !== false) {
      errors.push(`CP00-311 ${microId} audit hint fields must not expose hints`);
    }
    if (rows.deny_over_allow_check && rows.deny_over_allow_check.deny_over_allow_enforced !== true) {
      errors.push(`CP00-311 ${microId} deny-over-allow check drift`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-311 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.audit_event_expectation && rows.audit_event_expectation.writes_audit_event !== false) {
      errors.push(`CP00-311 ${microId} audit event expectation must not write events`);
    }
    if (rows.permission_fixture && rows.permission_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-311 ${microId} permission fixture must not load real data`);
    }
    if (rows.allowed_test && rows.allowed_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-311 ${microId} must not execute test runtime`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-311 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-311 ${microId} leak detected`);
    }
  }
  if (CRM_CORE_CP311_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-311 must not promote Claude");
  if (CRM_CORE_CP311_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-311 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-311 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-311 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP311_PACK_BINDING.pack_id,
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-311 contract current_pack drift");
  }
  if (
    contractProjection?.permission_slice_descriptor?.descriptor &&
    contractProjection.permission_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-311 contract permission_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP311_PACK_BINDING.next_pack_id) errors.push("CP00-311 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP311_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-311 next subphase drift");
  }
  return freezeCp311Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp311HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp311PermissionSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp311Coverage(planPack);
  const slice = validateCrmCoreCp311PermissionSliceDescriptor(descriptor, contractProjection);
  return freezeCp311Validation({
    evidence_packet: "H09.CP00-311.crm_core_permission_slice_descriptor",
    gate: CRM_CORE_CP311_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_slice_valid: slice.valid,
    no_real_data: true,
    source_p05_closeout_p06_permission_foundation_pack_id: CRM_CORE_CP311_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP311_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP311_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP311_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp311ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp311Coverage(planPack);
  const slice = validateCrmCoreCp311PermissionSliceDescriptor(createCrmCoreCp311PermissionSliceDescriptor(), {});
  return freezeCp311Validation({
    review_packet: "C09.CP00-311.crm_core_permission_slice_descriptor",
    gate: CRM_CORE_CP311_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP311_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP311_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-311 cover exactly the 40 planned RP09 units from RP09.P06.M04.S06 through RP09.P06.M06.S03?",
      "Do the three descriptor sections (M04 secondary workflow permission tail, M05 full permission/audit binding cycle with cross-tenant and leak prevention tests, M06 synthetic fixture head) cover every planned row title as descriptor-only rows, with the shared permission guards applied across every section that carries them?",
      "Does CP00-311 avoid runtime permission evaluation, audit event writes, AI runtime dispatch, test runtime paths, permission decision leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp311CloseoutHandoff() {
  return freezeCp311Validation({
    handoff_id: "CP00-311-to-CP00-312",
    from_pack_id: CRM_CORE_CP311_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP311_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP311_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP311_PACK_BINDING.range,
    open_scope: "Continue RP09.P06.M06.S04 onward with the remaining permission fixture rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP311_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp312CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp312Validation({
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

export function validateCrmCoreCp312Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-312 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP312_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-312");
  if (planPack?.risk_class !== CRM_CORE_CP312_PACK_BINDING.risk_class) errors.push("CP00-312 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP312_PACK_BINDING.unit_count) errors.push("CP00-312 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP312_PACK_BINDING.first_unit_id) errors.push("CP00-312 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP312_PACK_BINDING.last_unit_id) errors.push("CP00-312 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-312 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-312 must only include RP09 units");
  const summary = createCrmCoreCp312CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-312 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-312 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-312 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-312 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-312 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-312 ${microId} missing row ${title}`);
    }
  }
  return freezeCp312Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(
  descriptor = createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_failure_foundation_case_set ?? createCrmCoreCp312P06CloseoutP07FailureFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp312P06CloseoutP07FailureFoundationDescriptor") errors.push("CP00-312 descriptor type drift");
  if (descriptor.source_permission_slice_descriptor !== "CrmCoreCp311PermissionSliceDescriptor") {
    errors.push("CP00-312 source permission slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP312_REQUIREMENTS.required_section_rows).length) errors.push("CP00-312 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-312 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-312 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-312 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-312 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-312 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-312 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-312 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP312_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_matrix_row && rows.permission_matrix_row.deny_over_allow_enforced !== true) {
      errors.push(`CP00-312 ${microId} permission matrix must enforce deny-over-allow`);
    }
    if (rows.ai_retrieval_decision_binding && rows.ai_retrieval_decision_binding.dispatches_ai_runtime !== false) {
      errors.push(`CP00-312 ${microId} AI retrieval binding must not dispatch AI runtime`);
    }
    if (rows.security_trimming_proof && rows.security_trimming_proof.unauthorized_data_omitted !== true) {
      errors.push(`CP00-312 ${microId} security trimming must omit unauthorized data`);
    }
    if (rows.cross_tenant_test && rows.cross_tenant_test.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-312 ${microId} cross-tenant test must deny access`);
    }
    if (rows.leak_prevention_test && rows.leak_prevention_test.leak_detected !== false) {
      errors.push(`CP00-312 ${microId} leak detected`);
    }
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-312 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-312 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.ambiguous_rule_failure && rows.ambiguous_rule_failure.deny_over_allow_enforced !== true) {
      errors.push(`CP00-312 ${microId} ambiguous rule failure must enforce deny-over-allow`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-312 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-312 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-312 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-312 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-312 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-312 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-312 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-312 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-312 ${microId} must not emit Hermes failure receipts`);
    }
  }
  if (CRM_CORE_CP312_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-312 must not promote Claude");
  if (CRM_CORE_CP312_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-312 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-312 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-312 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP312_PACK_BINDING.pack_id,
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-312 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_failure_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_failure_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-312 contract p06_closeout_p07_failure_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP312_PACK_BINDING.next_pack_id) errors.push("CP00-312 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP312_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-312 next subphase drift");
  }
  return freezeCp312Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp312HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp312Coverage(planPack);
  const foundation = validateCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp312Validation({
    evidence_packet: "H09.CP00-312.crm_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: CRM_CORE_CP312_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    no_real_data: true,
    source_permission_slice_pack_id: CRM_CORE_CP312_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP312_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP312_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP312_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp312ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp312Coverage(planPack);
  const foundation = validateCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(createCrmCoreCp312P06CloseoutP07FailureFoundationDescriptor(), {});
  return freezeCp312Validation({
    review_packet: "C09.CP00-312.crm_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: CRM_CORE_CP312_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP312_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP312_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-312 cover exactly the 150 planned RP09 units from RP09.P06.M06.S04 through RP09.P07.M03.S18?",
      "Do the nine descriptor sections (P06 M06 fixture tail, M07-M09 full permission cycles, M10 closeout head, and four P07 failure micros with failure taxonomies, missing tenant/actor/matter/resource failures, unknown action/cross-tenant/permission-denied/ambiguous-rule/stale-reference/lock-conflict/retry-exhaustion failures, rollback and compensation expectations, blocked-claim receipts, failure fixtures/tests, integration smokes, audit failure hints, and Hermes failure evidence) cover every planned row title as descriptor-only rows?",
      "Does CP00-312 avoid rollback/retry runtime, lock acquisition, runtime permission evaluation, audit event writes, AI runtime dispatch, test runtime paths, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp312CloseoutHandoff() {
  return freezeCp312Validation({
    handoff_id: "CP00-312-to-CP00-313",
    from_pack_id: CRM_CORE_CP312_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP312_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP312_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP312_PACK_BINDING.range,
    open_scope: "RP09.P06 descriptor scope is closed; continue RP09.P07.M03.S19 onward with the remaining failure rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP312_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp313CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp313Validation({
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

export function validateCrmCoreCp313Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-313 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP313_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-313");
  if (planPack?.risk_class !== CRM_CORE_CP313_PACK_BINDING.risk_class) errors.push("CP00-313 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP313_PACK_BINDING.unit_count) errors.push("CP00-313 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP313_PACK_BINDING.first_unit_id) errors.push("CP00-313 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP313_PACK_BINDING.last_unit_id) errors.push("CP00-313 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-313 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-313 must only include RP09 units");
  const summary = createCrmCoreCp313CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-313 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-313 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-313 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-313 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-313 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-313 ${microId} missing row ${title}`);
    }
  }
  return freezeCp313Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp313FailureSliceDescriptor(
  descriptor = createCrmCoreCp313FailureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_slice_case_set ?? createCrmCoreCp313FailureSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp313FailureSliceDescriptor") errors.push("CP00-313 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_failure_foundation_descriptor !== "CrmCoreCp312P06CloseoutP07FailureFoundationDescriptor") {
    errors.push("CP00-313 source p06 closeout p07 failure foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP313_REQUIREMENTS.required_section_rows).length) errors.push("CP00-313 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-313 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-313 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-313 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-313 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-313 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-313 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-313 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP313_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-313 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-313 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-313 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-313 ${microId} human escalation boundary missing`);
    }
    if (rows.missing_tenant_failure && rows.missing_tenant_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-313 ${microId} missing tenant failure outcome drift`);
    }
    if (rows.unknown_action_failure && rows.unknown_action_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-313 ${microId} unknown action failure outcome drift`);
    }
  }
  if (CRM_CORE_CP313_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-313 must not promote Claude");
  if (CRM_CORE_CP313_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-313 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-313 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-313 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP313_PACK_BINDING.pack_id,
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-313 contract current_pack drift");
  }
  if (
    contractProjection?.failure_slice_descriptor?.descriptor &&
    contractProjection.failure_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-313 contract failure_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP313_PACK_BINDING.next_pack_id) errors.push("CP00-313 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP313_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-313 next subphase drift");
  }
  return freezeCp313Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp313HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp313FailureSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp313Coverage(planPack);
  const slice = validateCrmCoreCp313FailureSliceDescriptor(descriptor, contractProjection);
  return freezeCp313Validation({
    evidence_packet: "H09.CP00-313.crm_core_failure_slice_descriptor",
    gate: CRM_CORE_CP313_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_failure_foundation_pack_id: CRM_CORE_CP313_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP313_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP313_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP313_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp313ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp313Coverage(planPack);
  const slice = validateCrmCoreCp313FailureSliceDescriptor(createCrmCoreCp313FailureSliceDescriptor(), {});
  return freezeCp313Validation({
    review_packet: "C09.CP00-313.crm_core_failure_slice_descriptor",
    gate: CRM_CORE_CP313_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP313_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP313_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-313 cover exactly the 10 planned RP09 units from RP09.P07.M03.S19 through RP09.P07.M04.S06?",
      "Do the two descriptor sections (M03 primary failure tail with audit failure hint, Hermes failure evidence, Claude edge-case prompt, and human escalation note; M04 secondary workflow head with failure taxonomy and missing tenant/actor/matter/resource and unknown action failures) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-313 avoid rollback/retry runtime, audit hint leaks, Hermes runtime receipts, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp313CloseoutHandoff() {
  return freezeCp313Validation({
    handoff_id: "CP00-313-to-CP00-314",
    from_pack_id: CRM_CORE_CP313_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP313_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP313_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP313_PACK_BINDING.range,
    open_scope: "Continue RP09.P07.M04.S07 onward with the remaining failure rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP313_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp314CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp314Validation({
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

export function validateCrmCoreCp314Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-314 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP314_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-314");
  if (planPack?.risk_class !== CRM_CORE_CP314_PACK_BINDING.risk_class) errors.push("CP00-314 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP314_PACK_BINDING.unit_count) errors.push("CP00-314 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP314_PACK_BINDING.first_unit_id) errors.push("CP00-314 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP314_PACK_BINDING.last_unit_id) errors.push("CP00-314 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-314 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-314 must only include RP09 units");
  const summary = createCrmCoreCp314CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-314 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-314 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-314 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-314 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-314 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-314 ${microId} missing row ${title}`);
    }
  }
  return freezeCp314Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp314FailureBindingSliceDescriptor(
  descriptor = createCrmCoreCp314FailureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_binding_slice_case_set ?? createCrmCoreCp314FailureBindingSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp314FailureBindingSliceDescriptor") errors.push("CP00-314 descriptor type drift");
  if (descriptor.source_failure_slice_descriptor !== "CrmCoreCp313FailureSliceDescriptor") {
    errors.push("CP00-314 source failure slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP314_REQUIREMENTS.required_section_rows).length) errors.push("CP00-314 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-314 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-314 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-314 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-314 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-314 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-314 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-314 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP314_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-314 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-314 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.ambiguous_rule_failure && rows.ambiguous_rule_failure.deny_over_allow_enforced !== true) {
      errors.push(`CP00-314 ${microId} ambiguous rule failure must enforce deny-over-allow`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-314 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-314 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-314 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-314 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-314 ${microId} failure fixture must not load real data`);
    }
  }
  if (CRM_CORE_CP314_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-314 must not promote Claude");
  if (CRM_CORE_CP314_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-314 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-314 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-314 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP314_PACK_BINDING.pack_id,
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-314 contract current_pack drift");
  }
  if (
    contractProjection?.failure_binding_slice_descriptor?.descriptor &&
    contractProjection.failure_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-314 contract failure_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP314_PACK_BINDING.next_pack_id) errors.push("CP00-314 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP314_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-314 next subphase drift");
  }
  return freezeCp314Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp314HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp314FailureBindingSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp314Coverage(planPack);
  const slice = validateCrmCoreCp314FailureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp314Validation({
    evidence_packet: "H09.CP00-314.crm_core_failure_binding_slice_descriptor",
    gate: CRM_CORE_CP314_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_slice_pack_id: CRM_CORE_CP314_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP314_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP314_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP314_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp314ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp314Coverage(planPack);
  const slice = validateCrmCoreCp314FailureBindingSliceDescriptor(createCrmCoreCp314FailureBindingSliceDescriptor(), {});
  return freezeCp314Validation({
    review_packet: "C09.CP00-314.crm_core_failure_binding_slice_descriptor",
    gate: CRM_CORE_CP314_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP314_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP314_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-314 cover exactly the 10 planned RP09 units from RP09.P07.M04.S07 through RP09.P07.M04.S16?",
      "Does the single descriptor section (M04 secondary workflow failure middle with cross-tenant/permission-denied/ambiguous-rule/stale-reference/lock-conflict/retry-exhaustion failures, rollback and compensation expectations, blocked-claim receipt, and failure fixture) cover every planned row title as a descriptor-only row, with the shared failure guards applied?",
      "Does CP00-314 avoid rollback/retry runtime, lock acquisition, permission decision leaks, blocked-claim detail leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, real data, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp314CloseoutHandoff() {
  return freezeCp314Validation({
    handoff_id: "CP00-314-to-CP00-315",
    from_pack_id: CRM_CORE_CP314_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP314_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP314_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP314_PACK_BINDING.range,
    open_scope: "Continue RP09.P07.M04.S17 onward with the remaining failure rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP314_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp315CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp315Validation({
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

export function validateCrmCoreCp315Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-315 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP315_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-315");
  if (planPack?.risk_class !== CRM_CORE_CP315_PACK_BINDING.risk_class) errors.push("CP00-315 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP315_PACK_BINDING.unit_count) errors.push("CP00-315 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP315_PACK_BINDING.first_unit_id) errors.push("CP00-315 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP315_PACK_BINDING.last_unit_id) errors.push("CP00-315 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-315 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-315 must only include RP09 units");
  const summary = createCrmCoreCp315CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-315 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-315 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-315 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-315 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-315 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-315 ${microId} missing row ${title}`);
    }
  }
  return freezeCp315Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp315FailureTailSliceDescriptor(
  descriptor = createCrmCoreCp315FailureTailSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_tail_slice_case_set ?? createCrmCoreCp315FailureTailSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp315FailureTailSliceDescriptor") errors.push("CP00-315 descriptor type drift");
  if (descriptor.source_failure_binding_slice_descriptor !== "CrmCoreCp314FailureBindingSliceDescriptor") {
    errors.push("CP00-315 source failure binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP315_REQUIREMENTS.required_section_rows).length) errors.push("CP00-315 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-315 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-315 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-315 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-315 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-315 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-315 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-315 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP315_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-315 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-315 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-315 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-315 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-315 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-315 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-315 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-315 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-315 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-315 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-315 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-315 ${microId} human escalation boundary missing`);
    }
  }
  if (CRM_CORE_CP315_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-315 must not promote Claude");
  if (CRM_CORE_CP315_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-315 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-315 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-315 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP315_PACK_BINDING.pack_id,
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-315 contract current_pack drift");
  }
  if (
    contractProjection?.failure_tail_slice_descriptor?.descriptor &&
    contractProjection.failure_tail_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-315 contract failure_tail_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP315_PACK_BINDING.next_pack_id) errors.push("CP00-315 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP315_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-315 next subphase drift");
  }
  return freezeCp315Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp315HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp315FailureTailSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp315Coverage(planPack);
  const slice = validateCrmCoreCp315FailureTailSliceDescriptor(descriptor, contractProjection);
  return freezeCp315Validation({
    evidence_packet: "H09.CP00-315.crm_core_failure_tail_slice_descriptor",
    gate: CRM_CORE_CP315_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_tail_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_binding_slice_pack_id: CRM_CORE_CP315_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP315_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP315_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP315_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp315ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp315Coverage(planPack);
  const slice = validateCrmCoreCp315FailureTailSliceDescriptor(createCrmCoreCp315FailureTailSliceDescriptor(), {});
  return freezeCp315Validation({
    review_packet: "C09.CP00-315.crm_core_failure_tail_slice_descriptor",
    gate: CRM_CORE_CP315_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP315_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_tail_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP315_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-315 cover exactly the 40 planned RP09 units from RP09.P07.M04.S17 through RP09.P07.M06.S14?",
      "Do the three descriptor sections (M04 secondary workflow failure tail with failure unit test, integration smoke, audit failure hint, and Hermes failure evidence; M05 full permission/audit binding failure cycle including Claude edge-case prompt and human escalation note; M06 synthetic fixture head through compensation expectation) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-315 avoid rollback/retry runtime, lock acquisition, test runtime paths, integration smoke runtime, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp315CloseoutHandoff() {
  return freezeCp315Validation({
    handoff_id: "CP00-315-to-CP00-316",
    from_pack_id: CRM_CORE_CP315_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP315_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP315_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP315_PACK_BINDING.range,
    open_scope: "Continue RP09.P07.M06.S15 onward with the remaining failure fixture rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP315_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp316CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp316Validation({
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

export function validateCrmCoreCp316Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-316 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP316_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-316");
  if (planPack?.risk_class !== CRM_CORE_CP316_PACK_BINDING.risk_class) errors.push("CP00-316 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP316_PACK_BINDING.unit_count) errors.push("CP00-316 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP316_PACK_BINDING.first_unit_id) errors.push("CP00-316 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP316_PACK_BINDING.last_unit_id) errors.push("CP00-316 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-316 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-316 must only include RP09 units");
  const summary = createCrmCoreCp316CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-316 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-316 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-316 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-316 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-316 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-316 ${microId} missing row ${title}`);
    }
  }
  return freezeCp316Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp316FailureFixtureSliceDescriptor(
  descriptor = createCrmCoreCp316FailureFixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_fixture_slice_case_set ?? createCrmCoreCp316FailureFixtureSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp316FailureFixtureSliceDescriptor") errors.push("CP00-316 descriptor type drift");
  if (descriptor.source_failure_tail_slice_descriptor !== "CrmCoreCp315FailureTailSliceDescriptor") {
    errors.push("CP00-316 source failure tail slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP316_REQUIREMENTS.required_section_rows).length) errors.push("CP00-316 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-316 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-316 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-316 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-316 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-316 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-316 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-316 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP316_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-316 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-316 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-316 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-316 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-316 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-316 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.missing_tenant_failure && rows.missing_tenant_failure.expected_outcome !== "rejected_customer_safe") {
      errors.push(`CP00-316 ${microId} missing tenant failure outcome drift`);
    }
  }
  if (CRM_CORE_CP316_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-316 must not promote Claude");
  if (CRM_CORE_CP316_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-316 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-316 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-316 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP316_PACK_BINDING.pack_id,
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-316 contract current_pack drift");
  }
  if (
    contractProjection?.failure_fixture_slice_descriptor?.descriptor &&
    contractProjection.failure_fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-316 contract failure_fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP316_PACK_BINDING.next_pack_id) errors.push("CP00-316 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP316_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-316 next subphase drift");
  }
  return freezeCp316Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp316HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp316FailureFixtureSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp316Coverage(planPack);
  const slice = validateCrmCoreCp316FailureFixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp316Validation({
    evidence_packet: "H09.CP00-316.crm_core_failure_fixture_slice_descriptor",
    gate: CRM_CORE_CP316_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_tail_slice_pack_id: CRM_CORE_CP316_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP316_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP316_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP316_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp316ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp316Coverage(planPack);
  const slice = validateCrmCoreCp316FailureFixtureSliceDescriptor(createCrmCoreCp316FailureFixtureSliceDescriptor(), {});
  return freezeCp316Validation({
    review_packet: "C09.CP00-316.crm_core_failure_fixture_slice_descriptor",
    gate: CRM_CORE_CP316_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP316_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_fixture_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP316_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-316 cover exactly the 10 planned RP09 units from RP09.P07.M06.S15 through RP09.P07.M07.S04?",
      "Do the two descriptor sections (M06 synthetic fixture failure tail with blocked-claim receipt, failure fixture, failure unit test, integration smoke, audit failure hint, and Hermes failure evidence; M07 test/golden head with failure taxonomy and missing tenant/actor/matter failures) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-316 avoid test runtime paths, integration smoke runtime, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, real data, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp316CloseoutHandoff() {
  return freezeCp316Validation({
    handoff_id: "CP00-316-to-CP00-317",
    from_pack_id: CRM_CORE_CP316_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP316_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP316_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP316_PACK_BINDING.range,
    open_scope: "Continue RP09.P07.M07.S05 onward with the remaining failure test rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP316_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp317CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp317Validation({
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

export function validateCrmCoreCp317Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-317 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP317_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-317");
  if (planPack?.risk_class !== CRM_CORE_CP317_PACK_BINDING.risk_class) errors.push("CP00-317 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP317_PACK_BINDING.unit_count) errors.push("CP00-317 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP317_PACK_BINDING.first_unit_id) errors.push("CP00-317 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP317_PACK_BINDING.last_unit_id) errors.push("CP00-317 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-317 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-317 must only include RP09 units");
  const summary = createCrmCoreCp317CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-317 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-317 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-317 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-317 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-317 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-317 ${microId} missing row ${title}`);
    }
  }
  return freezeCp317Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp317FailureHermesSliceDescriptor(
  descriptor = createCrmCoreCp317FailureHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_hermes_slice_case_set ?? createCrmCoreCp317FailureHermesSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp317FailureHermesSliceDescriptor") errors.push("CP00-317 descriptor type drift");
  if (descriptor.source_failure_fixture_slice_descriptor !== "CrmCoreCp316FailureFixtureSliceDescriptor") {
    errors.push("CP00-317 source failure fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP317_REQUIREMENTS.required_section_rows).length) errors.push("CP00-317 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-317 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-317 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-317 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-317 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-317 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-317 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-317 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP317_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-317 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-317 ${microId} permission denied failure must not expose decisions`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-317 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-317 ${microId} retry exhaustion failure must not retry`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-317 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-317 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-317 ${microId} failure fixture must not load real data`);
    }
    if (rows.failure_unit_test && rows.failure_unit_test.executes_unit_test_runtime_paths !== false) {
      errors.push(`CP00-317 ${microId} must not execute test runtime`);
    }
    if (rows.failure_integration_smoke && rows.failure_integration_smoke.dispatches_integration_smoke_runtime !== false) {
      errors.push(`CP00-317 ${microId} must not dispatch integration smoke runtime`);
    }
    if (rows.audit_failure_hint && rows.audit_failure_hint.audit_hint_detail_included !== false) {
      errors.push(`CP00-317 ${microId} audit failure hint must not expose hints`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-317 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.claude_edge_case_prompt && rows.claude_edge_case_prompt.claude_final_approval_claimed !== false) {
      errors.push(`CP00-317 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_escalation_note && rows.human_escalation_note.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-317 ${microId} human escalation boundary missing`);
    }
  }
  if (CRM_CORE_CP317_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-317 must not promote Claude");
  if (CRM_CORE_CP317_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-317 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-317 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-317 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      CRM_CORE_CP317_PACK_BINDING.pack_id,
      CRM_CORE_CP318_PACK_BINDING.pack_id,
      CRM_CORE_CP319_PACK_BINDING.pack_id,
      CRM_CORE_CP320_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-317 contract current_pack drift");
  }
  if (
    contractProjection?.failure_hermes_slice_descriptor?.descriptor &&
    contractProjection.failure_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-317 contract failure_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP317_PACK_BINDING.next_pack_id) errors.push("CP00-317 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP317_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-317 next subphase drift");
  }
  return freezeCp317Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp317HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp317FailureHermesSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp317Coverage(planPack);
  const slice = validateCrmCoreCp317FailureHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp317Validation({
    evidence_packet: "H09.CP00-317.crm_core_failure_hermes_slice_descriptor",
    gate: CRM_CORE_CP317_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_fixture_slice_pack_id: CRM_CORE_CP317_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP317_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP317_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP317_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp317ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp317Coverage(planPack);
  const slice = validateCrmCoreCp317FailureHermesSliceDescriptor(createCrmCoreCp317FailureHermesSliceDescriptor(), {});
  return freezeCp317Validation({
    review_packet: "C09.CP00-317.crm_core_failure_hermes_slice_descriptor",
    gate: CRM_CORE_CP317_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP317_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_hermes_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP317_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-317 cover exactly the 40 planned RP09 units from RP09.P07.M07.S05 through RP09.P07.M09.S02?",
      "Do the three descriptor sections (M07 test/golden failure tail including Claude edge-case prompt and human escalation note, M08 full Hermes failure evidence cycle, M09 Claude review packet head) cover every planned row title as descriptor-only rows, with the shared failure guards applied?",
      "Does CP00-317 avoid rollback/retry runtime, lock acquisition, test runtime paths, integration smoke runtime, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, Hermes runtime receipts, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp317CloseoutHandoff() {
  return freezeCp317Validation({
    handoff_id: "CP00-317-to-CP00-318",
    from_pack_id: CRM_CORE_CP317_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP317_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP317_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP317_PACK_BINDING.range,
    open_scope: "Continue RP09.P07.M09.S03 onward with the remaining failure review rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP317_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp318CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp318Validation({
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

export function validateCrmCoreCp318Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-318 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP318_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-318");
  if (planPack?.risk_class !== CRM_CORE_CP318_PACK_BINDING.risk_class) errors.push("CP00-318 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP318_PACK_BINDING.unit_count) errors.push("CP00-318 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP318_PACK_BINDING.first_unit_id) errors.push("CP00-318 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP318_PACK_BINDING.last_unit_id) errors.push("CP00-318 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-318 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-318 must only include RP09 units");
  const summary = createCrmCoreCp318CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-318 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-318 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-318 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-318 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-318 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-318 ${microId} missing row ${title}`);
    }
  }
  return freezeCp318Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(
  descriptor = createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_hermes_foundation_case_set ?? createCrmCoreCp318P07CloseoutP08HermesFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp318P07CloseoutP08HermesFoundationDescriptor") errors.push("CP00-318 descriptor type drift");
  if (descriptor.source_failure_hermes_slice_descriptor !== "CrmCoreCp317FailureHermesSliceDescriptor") {
    errors.push("CP00-318 source failure hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP318_REQUIREMENTS.required_section_rows).length) errors.push("CP00-318 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-318 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-318 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-318 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-318 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-318 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-318 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-318 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP318_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-318 ${microId} cross-tenant failure must deny access`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-318 ${microId} lock conflict failure must not acquire locks`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-318 ${microId} rollback expectation must not perform rollback`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-318 ${microId} blocked-claim receipt must not expose details`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-318 ${microId} must not emit Hermes failure receipts`);
    }
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-318 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.command_result_receipt && rows.command_result_receipt.executes_command_runtime !== false) {
      errors.push(`CP00-318 ${microId} command result receipt must not execute runtime`);
    }
    if (rows.fixture_summary_receipt && rows.fixture_summary_receipt.fixture_payload_included !== false) {
      errors.push(`CP00-318 ${microId} fixture summary receipt must not include payloads`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-318 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_hint_detail_included !== false) {
      errors.push(`CP00-318 ${microId} audit summary receipt must not expose hints`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-318 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-318 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-318 ${microId} human approval marker boundary missing`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-318 ${microId} validation command check must not execute runtime`);
    }
  }
  if (CRM_CORE_CP318_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-318 must not promote Claude");
  if (CRM_CORE_CP318_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-318 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-318 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-318 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![CRM_CORE_CP318_PACK_BINDING.pack_id, CRM_CORE_CP319_PACK_BINDING.pack_id, CRM_CORE_CP320_PACK_BINDING.pack_id].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-318 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_hermes_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_hermes_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-318 contract p07_closeout_p08_hermes_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP318_PACK_BINDING.next_pack_id) errors.push("CP00-318 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP318_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-318 next subphase drift");
  }
  return freezeCp318Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp318HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp318Coverage(planPack);
  const foundation = validateCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(descriptor, contractProjection);
  return freezeCp318Validation({
    evidence_packet: "H09.CP00-318.crm_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: CRM_CORE_CP318_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    no_real_data: true,
    source_failure_hermes_slice_pack_id: CRM_CORE_CP318_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP318_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP318_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP318_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp318ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp318Coverage(planPack);
  const foundation = validateCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(createCrmCoreCp318P07CloseoutP08HermesFoundationDescriptor(), {});
  return freezeCp318Validation({
    review_packet: "C09.CP00-318.crm_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: CRM_CORE_CP318_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP318_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP318_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-318 cover exactly the 150 planned RP09 units from RP09.P07.M09.S03 through RP09.P08.M08.S01?",
      "Do the eleven descriptor sections (P07 M09 Claude review failure tail, M10 closeout head, and nine P08 Hermes micros with command matrices, evidence field lists, changed-file/command-result/fixture-summary/blocked-claim/permission-summary/audit-summary/no-real-data receipts, Claude dependency markers, human approval markers, PASS/PASS_WITH_FINDINGS/BLOCK semantics, evidence templates, validation command checks, harness boundary notes, closeout handoffs, regression receipts, and next-gate readiness rows) cover every planned row title as descriptor-only rows?",
      "Does CP00-318 avoid Hermes runtime receipts, command runtime execution, rollback/retry runtime, lock acquisition, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, cross-tenant access, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp318CloseoutHandoff() {
  return freezeCp318Validation({
    handoff_id: "CP00-318-to-CP00-319",
    from_pack_id: CRM_CORE_CP318_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP318_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP318_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP318_PACK_BINDING.range,
    open_scope: "RP09.P07 descriptor scope is closed; continue RP09.P08.M08.S02 onward with the remaining Hermes receipt rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP318_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp319CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp319Validation({
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

export function validateCrmCoreCp319Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-319 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP319_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-319");
  if (planPack?.risk_class !== CRM_CORE_CP319_PACK_BINDING.risk_class) errors.push("CP00-319 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP319_PACK_BINDING.unit_count) errors.push("CP00-319 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP319_PACK_BINDING.first_unit_id) errors.push("CP00-319 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP319_PACK_BINDING.last_unit_id) errors.push("CP00-319 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-319 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-319 must only include RP09 units");
  const summary = createCrmCoreCp319CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-319 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-319 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-319 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-319 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-319 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-319 ${microId} missing row ${title}`);
    }
  }
  return freezeCp319Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(
  descriptor = createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_review_foundation_case_set ?? createCrmCoreCp319P08CloseoutP09ReviewFoundationCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor") errors.push("CP00-319 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_hermes_foundation_descriptor !== "CrmCoreCp318P07CloseoutP08HermesFoundationDescriptor") {
    errors.push("CP00-319 source p07 closeout p08 hermes foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP319_REQUIREMENTS.required_section_rows).length) errors.push("CP00-319 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-319 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-319 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-319 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-319 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-319 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-319 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-319 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP319_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-319 ${microId} Hermes command matrix must not execute runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-319 ${microId} permission summary receipt must not expose decisions`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-319 ${microId} no-real-data receipt drift`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-319 ${microId} Claude dependency marker must not claim final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_approval_route_required_before_runtime !== true) {
      errors.push(`CP00-319 ${microId} human approval marker boundary missing`);
    }
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-319 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-319 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-319 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-319 ${microId} human approval summary drift`);
    }
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-319 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-319 ${microId} command rerun must not execute runtime`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-319 ${microId} validation command check must not execute runtime`);
    }
  }
  if (CRM_CORE_CP319_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-319 must not promote Claude");
  if (CRM_CORE_CP319_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-319 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-319 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-319 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![CRM_CORE_CP319_PACK_BINDING.pack_id, CRM_CORE_CP320_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-319 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_review_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_review_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-319 contract p08_closeout_p09_review_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP319_PACK_BINDING.next_pack_id) errors.push("CP00-319 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP319_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-319 next subphase drift");
  }
  return freezeCp319Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp319HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(),
) {
  const coverage = validateCrmCoreCp319Coverage(planPack);
  const foundation = validateCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(descriptor, contractProjection);
  return freezeCp319Validation({
    evidence_packet: "H09.CP00-319.crm_core_p08_closeout_p09_review_foundation_descriptor",
    gate: CRM_CORE_CP319_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    no_real_data: true,
    source_p07_closeout_p08_hermes_foundation_pack_id: CRM_CORE_CP319_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP319_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP319_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP319_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createCrmCoreCp319ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp319Coverage(planPack);
  const foundation = validateCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(createCrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor(), {});
  return freezeCp319Validation({
    review_packet: "C09.CP00-319.crm_core_p08_closeout_p09_review_foundation_descriptor",
    gate: CRM_CORE_CP319_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP319_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    invalid_review_blockers: CRM_CORE_CP319_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-319 cover exactly the 150 planned RP09 units from RP09.P08.M08.S02 through RP09.P09.M08.S08?",
      "Do the twelve descriptor sections (P08 M08 Hermes tail, M09 Claude review packet cycle, M10 closeout head, and nine P09 review micros with architecture/security/permission-bypass/audit-completeness/missing-test/UI-leak/downstream-readiness questions, risk registers, severity taxonomies, go/no-go verdict formats, finding routing maps, human approval summaries, Claude review packets, closeout criteria, PASS/PASS_WITH_FINDINGS/BLOCK closeout notes, next RP dependencies, documentation updates, and command reruns) cover every planned row title as descriptor-only rows?",
      "Does CP00-319 avoid Hermes runtime receipts, command runtime execution, permission bypass, UI leaks, permission decision leaks, blocked-claim detail leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp319CloseoutHandoff() {
  return freezeCp319Validation({
    handoff_id: "CP00-319-to-CP00-320",
    from_pack_id: CRM_CORE_CP319_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP319_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP319_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP319_PACK_BINDING.range,
    open_scope: "RP09.P08 descriptor scope is closed; continue RP09.P09.M09.S01 onward with the remaining review rows and downstream micros while preserving descriptor-only CRM boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP319_PACK_BINDING.production_ready_flag,
  });
}

export function createCrmCoreCp320CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp320Validation({
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

export function validateCrmCoreCp320Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-320 plan pack is required");
  if (planPack?.pack_id !== CRM_CORE_CP320_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-320");
  if (planPack?.risk_class !== CRM_CORE_CP320_PACK_BINDING.risk_class) errors.push("CP00-320 risk class drift");
  if (planPack?.unit_count !== CRM_CORE_CP320_PACK_BINDING.unit_count) errors.push("CP00-320 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== CRM_CORE_CP320_PACK_BINDING.first_unit_id) errors.push("CP00-320 first unit drift");
  if (unitIds.at(-1) !== CRM_CORE_CP320_PACK_BINDING.last_unit_id) errors.push("CP00-320 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-320 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP09")) errors.push("CP00-320 must only include RP09 units");
  const summary = createCrmCoreCp320CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-320 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-320 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-320 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-320 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-320 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-320 ${microId} missing row ${title}`);
    }
  }
  return freezeCp320Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCrmCoreCp320ReviewCloseoutSliceDescriptor(
  descriptor = createCrmCoreCp320ReviewCloseoutSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_closeout_slice_case_set ?? createCrmCoreCp320ReviewCloseoutSliceCaseSet();
  if (descriptor.descriptor !== "CrmCoreCp320ReviewCloseoutSliceDescriptor") errors.push("CP00-320 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_review_foundation_descriptor !== "CrmCoreCp319P08CloseoutP09ReviewFoundationDescriptor") {
    errors.push("CP00-320 source p08 closeout p09 review foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(CRM_CORE_CP320_REQUIREMENTS.required_section_rows).length) errors.push("CP00-320 section count drift");
  for (const [microId, titles] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-320 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-320 ${microId} row count drift`);
    for (const title of titles) {
      const key = crmCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-320 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-320 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-320 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-320 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-320 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(CRM_CORE_CP320_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-320 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-320 ${microId} UI leak detected`);
    }
  }
  if (CRM_CORE_CP320_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-320 must not promote Claude");
  if (CRM_CORE_CP320_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-320 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-320 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-320 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== CRM_CORE_CP320_PACK_BINDING.pack_id) {
    errors.push("CP00-320 contract current_pack drift");
  }
  if (
    contractProjection?.review_closeout_slice_descriptor?.descriptor &&
    contractProjection.review_closeout_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-320 contract review_closeout_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== CRM_CORE_CP320_PACK_BINDING.next_pack_id) errors.push("CP00-320 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== CRM_CORE_CP320_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-320 next subphase drift");
  }
  return freezeCp320Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createCrmCoreCp320HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createCrmCoreCp320ReviewCloseoutSliceDescriptor(),
) {
  const coverage = validateCrmCoreCp320Coverage(planPack);
  const slice = validateCrmCoreCp320ReviewCloseoutSliceDescriptor(descriptor, contractProjection);
  return freezeCp320Validation({
    evidence_packet: "H09.CP00-320.crm_core_review_closeout_slice_descriptor",
    gate: CRM_CORE_CP320_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_closeout_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_review_foundation_pack_id: CRM_CORE_CP320_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: CRM_CORE_CP320_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: CRM_CORE_CP320_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP320_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createCrmCoreCp320ClaudeReviewPacket(planPack) {
  const coverage = validateCrmCoreCp320Coverage(planPack);
  const slice = validateCrmCoreCp320ReviewCloseoutSliceDescriptor(createCrmCoreCp320ReviewCloseoutSliceDescriptor(), {});
  return freezeCp320Validation({
    review_packet: "C09.CP00-320.crm_core_review_closeout_slice_descriptor",
    gate: CRM_CORE_CP320_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: CRM_CORE_CP320_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_closeout_slice_valid: slice.valid,
    invalid_review_blockers: CRM_CORE_CP320_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-320 cover exactly the 12 planned RP09 units from RP09.P09.M09.S01 through RP09.P09.M10.S04?",
      "Do the two descriptor sections (P09 M09 Claude review packet head with architecture/security/permission-bypass/audit-completeness/missing-test/UI-leak/downstream-readiness questions and risk register, and M10 closeout head with the four core review question rows) cover every planned row title as descriptor-only rows?",
      "Does CP00-320 avoid permission bypass, UI leaks, Hermes runtime receipts, command runtime execution, permission decision leaks, audit hint leaks, fixture payload leaks, state writes, unauthorized data, Citation Ledger, and Loop execution?",
      "Does the pack close the RP09 descriptor scope and hand off to RP10.P00.M00.S01 without treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createCrmCoreCp320CloseoutHandoff() {
  return freezeCp320Validation({
    handoff_id: "CP00-320-to-CP00-321",
    from_pack_id: CRM_CORE_CP320_PACK_BINDING.pack_id,
    to_pack_id: CRM_CORE_CP320_PACK_BINDING.next_pack_id,
    next_subphase_id: CRM_CORE_CP320_PACK_BINDING.next_subphase_id,
    closed_scope: CRM_CORE_CP320_PACK_BINDING.range,
    open_scope: "RP09 descriptor scope is closed; continue RP10.P00.M00.S01 onward with the next program while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: CRM_CORE_CP320_PACK_BINDING.production_ready_flag,
  });
}
