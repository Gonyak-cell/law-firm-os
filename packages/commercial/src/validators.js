import {
  COMMERCIAL_CP873_PACK_BINDING,
  COMMERCIAL_CP873_REQUIREMENTS,
  COMMERCIAL_CP874_PACK_BINDING,
  COMMERCIAL_CP874_REQUIREMENTS,
  COMMERCIAL_CP875_PACK_BINDING,
  COMMERCIAL_CP875_REQUIREMENTS,
  COMMERCIAL_CP876_PACK_BINDING,
  COMMERCIAL_CP876_REQUIREMENTS,
  COMMERCIAL_CP877_PACK_BINDING,
  COMMERCIAL_CP877_REQUIREMENTS,
  COMMERCIAL_CP878_PACK_BINDING,
  COMMERCIAL_CP878_REQUIREMENTS,
  COMMERCIAL_CP879_PACK_BINDING,
  COMMERCIAL_CP879_REQUIREMENTS,
  COMMERCIAL_CP880_PACK_BINDING,
  COMMERCIAL_CP880_REQUIREMENTS,
  COMMERCIAL_CP881_PACK_BINDING,
  COMMERCIAL_CP881_REQUIREMENTS,
  COMMERCIAL_CP882_PACK_BINDING,
  COMMERCIAL_CP882_REQUIREMENTS,
  COMMERCIAL_CP883_PACK_BINDING,
  COMMERCIAL_CP883_REQUIREMENTS,
  COMMERCIAL_CP884_PACK_BINDING,
  COMMERCIAL_CP884_REQUIREMENTS,
  COMMERCIAL_CP885_PACK_BINDING,
  COMMERCIAL_CP885_REQUIREMENTS,
  COMMERCIAL_CP886_PACK_BINDING,
  COMMERCIAL_CP886_REQUIREMENTS,
  COMMERCIAL_CP887_PACK_BINDING,
  COMMERCIAL_CP887_REQUIREMENTS,
  COMMERCIAL_CP888_PACK_BINDING,
  COMMERCIAL_CP888_REQUIREMENTS,
  COMMERCIAL_CP889_PACK_BINDING,
  COMMERCIAL_CP889_REQUIREMENTS,
  COMMERCIAL_CP890_PACK_BINDING,
  COMMERCIAL_CP890_REQUIREMENTS,
  COMMERCIAL_CP891_PACK_BINDING,
  COMMERCIAL_CP891_REQUIREMENTS,
  COMMERCIAL_CP892_PACK_BINDING,
  COMMERCIAL_CP892_REQUIREMENTS,
  COMMERCIAL_CP893_PACK_BINDING,
  COMMERCIAL_CP893_REQUIREMENTS,
  COMMERCIAL_CP894_PACK_BINDING,
  COMMERCIAL_CP894_REQUIREMENTS,
  COMMERCIAL_CP895_PACK_BINDING,
  COMMERCIAL_CP895_REQUIREMENTS,
  COMMERCIAL_CP896_PACK_BINDING,
  COMMERCIAL_CP896_REQUIREMENTS,
  COMMERCIAL_NO_WRITE_ATTESTATION,
  COMMERCIAL_READINESS_PROGRAM_CONTRACT,
  commercialRowKey,
  createCommercialCp873ContractAcceptanceDomainFoundationCaseSet,
  createCommercialCp873ContractAcceptanceDomainFoundationDescriptor,
  createCommercialCp874IncidentRunbookRelationshipTailCaseSet,
  createCommercialCp874IncidentRunbookRelationshipTailDescriptor,
  createCommercialCp875RelationshipServiceFoundationCaseSet,
  createCommercialCp875RelationshipServiceFoundationDescriptor,
  createCommercialCp876ServiceTailCaseSet,
  createCommercialCp876ServiceTailDescriptor,
  createCommercialCp877SecondaryWorkflowBoundaryCaseSet,
  createCommercialCp877SecondaryWorkflowBoundaryDescriptor,
  createCommercialCp878PermissionAuditFixtureCaseSet,
  createCommercialCp878PermissionAuditFixtureDescriptor,
  createCommercialCp879FixtureInterfaceBridgeCaseSet,
  createCommercialCp879FixtureInterfaceBridgeDescriptor,
  createCommercialCp880InterfacePermissionFixtureTailCaseSet,
  createCommercialCp880InterfacePermissionFixtureTailDescriptor,
  createCommercialCp881InterfaceEvidenceUiFoundationCaseSet,
  createCommercialCp881InterfaceEvidenceUiFoundationDescriptor,
  createCommercialCp882UiFixtureGoldenCaseBridgeCaseSet,
  createCommercialCp882UiFixtureGoldenCaseBridgeDescriptor,
  createCommercialCp883UiFixtureGoldenCaseTailCaseSet,
  createCommercialCp883UiFixtureGoldenCaseTailDescriptor,
  createCommercialCp884UiFixturePermissionAuditSliceCaseSet,
  createCommercialCp884UiFixturePermissionAuditSliceDescriptor,
  createCommercialCp885UiFixtureCloseoutPermissionFoundationCaseSet,
  createCommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor,
  createCommercialCp886PermissionMatrixSecondaryHeadCaseSet,
  createCommercialCp886PermissionMatrixSecondaryHeadDescriptor,
  createCommercialCp887PermissionMatrixBoundaryTailCaseSet,
  createCommercialCp887PermissionMatrixBoundaryTailDescriptor,
  createCommercialCp888PermissionFailureBridgeCaseSet,
  createCommercialCp888PermissionFailureBridgeDescriptor,
  createCommercialCp889FailureRecoverySliceCaseSet,
  createCommercialCp889FailureRecoverySliceDescriptor,
  createCommercialCp890FailureHermesBridgeCaseSet,
  createCommercialCp890FailureHermesBridgeDescriptor,
  createCommercialCp891HermesReceiptShapeCaseSet,
  createCommercialCp891HermesReceiptShapeDescriptor,
  createCommercialCp892HermesSemanticsCaseSet,
  createCommercialCp892HermesSemanticsDescriptor,
  createCommercialCp893HermesEvidenceSweepCaseSet,
  createCommercialCp893HermesEvidenceSweepDescriptor,
  createCommercialCp894ReviewScopeBridgeCaseSet,
  createCommercialCp894ReviewScopeBridgeDescriptor,
  createCommercialCp895ReviewPacketTailCaseSet,
  createCommercialCp895ReviewPacketTailDescriptor,
  createCommercialCp896ReviewCloseoutHandoffCaseSet,
  createCommercialCp896ReviewCloseoutHandoffDescriptor,
} from "./registry.js";
import { COMMERCIAL_INTERFACE_ERROR_CODES, COMMERCIAL_INTERFACE_PUBLIC_EXPORTS, createCommercialInterfaceContract } from "./interface.js";
import { validateCommercialModelRegistry } from "./model.js";
import { COMMERCIAL_UI_FIXTURE_CASE_NAMES, createCommercialUiFixtureGoldenCaseMatrix, createCommercialUiSurfaceMatrix } from "./ui.js";

function countBy(units, field) {
  const counts = {};
  for (const unit of units) {
    const value = unit?.[field];
    if (value !== undefined) counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function freezeValidation(binding, result) {
  return Object.freeze({
    ...result,
    pack_id: binding.pack_id,
    no_write_attestation: COMMERCIAL_NO_WRITE_ATTESTATION,
  });
}

export function createCommercialCp873ContractAcceptanceDomainFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP873_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp873ContractAcceptanceDomainFoundationCoverage(planPack) {
  const binding = COMMERCIAL_CP873_PACK_BINDING;
  const requirements = COMMERCIAL_CP873_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp873ContractAcceptanceDomainFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp873ContractAcceptanceDomainFoundationDescriptor(
  descriptor = createCommercialCp873ContractAcceptanceDomainFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP873_PACK_BINDING;
  const requirements = COMMERCIAL_CP873_REQUIREMENTS;
  const caseSet = descriptor.contract_acceptance_domain_foundation_case_set ?? createCommercialCp873ContractAcceptanceDomainFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp873ContractAcceptanceDomainFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.program_contract?.upstream_program_id !== "RP28") errors.push(`${binding.pack_id} upstream program drift`);
  if (descriptor.program_contract?.downstream_program_id !== "RP30") errors.push(`${binding.pack_id} downstream program drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.release_candidate_created === true ||
        row.deployment_run_created === true ||
        row.observability_signal_written === true ||
        row.compliance_report_generated === true ||
        row.incident_runbook_activated === true ||
        row.customer_plan_mutated === true ||
        row.ci_cd_pipeline_triggered === true ||
        row.deployment_executed === true ||
        row.runtime_receipt_emitted === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Commercial Readiness runtime`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["ReleaseCandidate", "DeploymentRun", "ObservabilitySignal", "ComplianceReport", "IncidentRunbook"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (descriptor.implemented_model_names?.includes("CustomerPlan")) errors.push(`${binding.pack_id} CustomerPlan must remain contract-shell only in CP873`);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp874IncidentRunbookRelationshipTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP874_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp874IncidentRunbookRelationshipTailCoverage(planPack) {
  const binding = COMMERCIAL_CP874_PACK_BINDING;
  const requirements = COMMERCIAL_CP874_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp874IncidentRunbookRelationshipTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp874IncidentRunbookRelationshipTailDescriptor(
  descriptor = createCommercialCp874IncidentRunbookRelationshipTailDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP874_PACK_BINDING;
  const requirements = COMMERCIAL_CP874_REQUIREMENTS;
  const caseSet = descriptor.incident_runbook_relationship_tail_case_set ?? createCommercialCp874IncidentRunbookRelationshipTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp874IncidentRunbookRelationshipTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp873ContractAcceptanceDomainFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.incident_runbook_activated !== false || row.customer_plan_mutated !== false) errors.push(`${binding.pack_id} ${key} must not activate runbooks or mutate customer plans`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
    }
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (!descriptor.relationship_map?.IncidentRunbook?.includes("AuditEvent")) errors.push(`${binding.pack_id} IncidentRunbook relationship map must include AuditEvent`);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp875RelationshipServiceFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP875_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp875RelationshipServiceFoundationCoverage(planPack) {
  const binding = COMMERCIAL_CP875_PACK_BINDING;
  const requirements = COMMERCIAL_CP875_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp875RelationshipServiceFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

function validateCommercialServiceMatrix(binding, matrix = {}) {
  const errors = [];
  const requiredKeys = [
    "release_candidate_creation",
    "ci_cd_validation",
    "observability_review",
    "approval_required",
    "rollback_behavior",
    "retry_behavior",
    "secondary_workflow",
    "unverified_release",
    "missing_observability",
    "compliance_evidence_gap",
    "unsafe_deploy",
    "customer_plan_mismatch",
    "cross_tenant_denied",
  ];
  for (const key of requiredKeys) {
    const row = matrix[key];
    if (!row) {
      errors.push(`${binding.pack_id} service matrix missing ${key}`);
      continue;
    }
    if (row.request_normalized !== true) errors.push(`${binding.pack_id} ${key} must normalize requests`);
    if (row.tenant_boundary_checked !== true) errors.push(`${binding.pack_id} ${key} must check tenant boundary`);
    if (key !== "cross_tenant_denied" && row.tenant_boundary_precheck !== true) errors.push(`${binding.pack_id} ${key} tenant precheck must pass`);
    if (row.matter_trace_checked !== true) errors.push(`${binding.pack_id} ${key} must check matter trace`);
    if (row.matter_trace_precheck !== true) errors.push(`${binding.pack_id} ${key} Matter trace precheck must pass`);
    if (row.audit_hint_precheck !== true) errors.push(`${binding.pack_id} ${key} must expose audit hint precheck`);
    if (row.permission_binding_descriptor !== "descriptor_only_no_write") errors.push(`${binding.pack_id} ${key} permission binding descriptor drift`);
    if (row.review_required_routing !== (row.permission_precheck === "review_required")) errors.push(`${binding.pack_id} ${key} review-required routing drift`);
    if (!Array.isArray(row.validation_error_mapping)) errors.push(`${binding.pack_id} ${key} validation error mapping must be present`);
    if (row.state_transition_enforced !== true) errors.push(`${binding.pack_id} ${key} must enforce state transition`);
    if (row.state_transition_descriptor !== "enforced_descriptor_only") errors.push(`${binding.pack_id} ${key} state transition descriptor drift`);
    if (row.idempotency_key_required !== true) errors.push(`${binding.pack_id} ${key} must require idempotency key`);
    if (row.idempotency_scope !== "tenant_matter_action") errors.push(`${binding.pack_id} ${key} idempotency scope drift`);
    if (row.runtime_lock_acquired !== false) errors.push(`${binding.pack_id} ${key} must not acquire runtime lock`);
    if (row.lock_acquisition_rule !== "declared_not_acquired") errors.push(`${binding.pack_id} ${key} lock rule drift`);
    if (row.rollback_executes_now !== false || row.retry_executes_now !== false) errors.push(`${binding.pack_id} ${key} must not execute rollback or retry`);
    if (row.persistence_boundary !== "no_persistence") errors.push(`${binding.pack_id} ${key} persistence boundary drift`);
    if (row.persists_product_state !== false || row.writes_product_state !== false) errors.push(`${binding.pack_id} ${key} must not persist or write product state`);
    if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
    if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
    if (row.audit_hint?.writes_audit_event_now !== false) errors.push(`${binding.pack_id} ${key} audit hint must remain no-write`);
  }
  for (const key of ["release_candidate_creation", "ci_cd_validation", "observability_review"]) {
    if (matrix[key]?.permission_precheck !== "allowed_descriptor") errors.push(`${binding.pack_id} ${key} expected allowed descriptor precheck`);
  }
  if (matrix.cross_tenant_denied?.permission_precheck !== "denied_descriptor") errors.push(`${binding.pack_id} cross-tenant access must be denied`);
  if (matrix.cross_tenant_denied?.tenant_boundary_precheck !== false) errors.push(`${binding.pack_id} cross-tenant tenant precheck must fail`);
  if (!matrix.cross_tenant_denied?.validation_errors?.includes("cross_tenant_release_access")) errors.push(`${binding.pack_id} cross-tenant denial must preserve blocked claim`);
  if (matrix.approval_required?.permission_precheck !== "approval_required") errors.push(`${binding.pack_id} approval-required route must require approval`);
  if (matrix.approval_required?.approval_required_routing !== true) errors.push(`${binding.pack_id} approval-required route must expose approval routing`);
  if (matrix.approval_required?.permission_decision_written !== false) errors.push(`${binding.pack_id} approval-required route must not write permission decision`);
  if (matrix.rollback_behavior?.rollback_behavior_descriptor !== true || matrix.rollback_behavior?.rollback_executes_now !== false) errors.push(`${binding.pack_id} rollback behavior must be descriptor-only`);
  if (matrix.retry_behavior?.retry_behavior_descriptor !== true || matrix.retry_behavior?.retry_executes_now !== false) errors.push(`${binding.pack_id} retry behavior must be descriptor-only`);
  if (matrix.secondary_workflow?.workflow_name !== "secondary_compliance_review") errors.push(`${binding.pack_id} secondary workflow name drift`);
  if (matrix.secondary_workflow?.secondary_workflow_path !== true) errors.push(`${binding.pack_id} secondary workflow path drift`);
  for (const [key, claim] of [
    ["unverified_release", "unverified_release"],
    ["missing_observability", "missing_observability"],
    ["compliance_evidence_gap", "compliance_evidence_gap"],
    ["unsafe_deploy", "unsafe_deploy"],
    ["customer_plan_mismatch", "customer_plan_mismatch"],
  ]) {
    if (matrix[key]?.permission_precheck !== "review_required") errors.push(`${binding.pack_id} ${claim} must route to review`);
    if (matrix[key]?.review_required_routing !== true) errors.push(`${binding.pack_id} ${claim} must expose review-required routing`);
    if (!matrix[key]?.validation_errors?.includes(claim)) errors.push(`${binding.pack_id} ${claim} must preserve blocked claim`);
    if (!matrix[key]?.validation_error_mapping?.some((mapping) => mapping.claim === claim && mapping.route === "review_required")) {
      errors.push(`${binding.pack_id} ${claim} validation error mapping drift`);
    }
  }
  return errors;
}

function validateCommercialSyntheticFixtureMatrix(binding, matrix = {}) {
  const errors = [];
  const requiredKeys = [
    "service_entrypoint_contract",
    "request_normalization",
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck",
    "audit_hint_precheck",
    "primary_happy_path",
    "secondary_workflow_path",
  ];
  for (const key of requiredKeys) {
    const row = matrix[key];
    if (!row) {
      errors.push(`${binding.pack_id} synthetic fixture matrix missing ${key}`);
      continue;
    }
    if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} fixture must be descriptor-only`);
    if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} fixture must not execute runtime`);
    if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} fixture must not include real data or credentials`);
    if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} fixture must not write permission or audit state`);
    if (row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} fixture must not emit runtime receipts`);
  }
  if (matrix.service_entrypoint_contract?.permission_binding_descriptor !== "descriptor_only_no_write") errors.push(`${binding.pack_id} fixture service entrypoint permission binding drift`);
  if (matrix.request_normalization?.request_normalized !== true) errors.push(`${binding.pack_id} fixture request normalization drift`);
  if (matrix.tenant_boundary_precheck?.pass_fixture !== true || matrix.tenant_boundary_precheck?.denied_fixture !== false) errors.push(`${binding.pack_id} fixture tenant boundary drift`);
  if (!matrix.tenant_boundary_precheck?.denied_claims?.includes("cross_tenant_release_access")) errors.push(`${binding.pack_id} fixture tenant denial claim drift`);
  if (matrix.matter_trace_precheck?.pass_fixture !== true || matrix.matter_trace_precheck?.denied_fixture !== false) errors.push(`${binding.pack_id} fixture Matter trace drift`);
  if (!matrix.matter_trace_precheck?.denied_claims?.includes("missing_context")) errors.push(`${binding.pack_id} fixture Matter trace denial claim drift`);
  if (matrix.permission_precheck?.allowed_descriptor !== "allowed_descriptor") errors.push(`${binding.pack_id} fixture allowed permission precheck drift`);
  if (matrix.permission_precheck?.review_required !== "review_required") errors.push(`${binding.pack_id} fixture review-required precheck drift`);
  if (matrix.permission_precheck?.approval_required !== "approval_required") errors.push(`${binding.pack_id} fixture approval-required precheck drift`);
  if (matrix.permission_precheck?.denied_descriptor !== "denied_descriptor") errors.push(`${binding.pack_id} fixture denied precheck drift`);
  if (matrix.audit_hint_precheck?.writes_audit_event_now !== false) errors.push(`${binding.pack_id} fixture audit hint must remain no-write`);
  if (matrix.primary_happy_path?.primary_happy_path !== true) errors.push(`${binding.pack_id} fixture primary happy path drift`);
  if (matrix.secondary_workflow_path?.workflow_name !== "secondary_compliance_review" || matrix.secondary_workflow_path?.secondary_workflow_path !== true) {
    errors.push(`${binding.pack_id} fixture secondary workflow path drift`);
  }
  return errors;
}

export function validateCommercialInterfaceContract(contract = createCommercialInterfaceContract()) {
  const errors = [];
  if (contract.schema_version !== "law-firm-os.commercial-interface-contract.v0.1") errors.push("commercial interface schema_version drift");
  if (contract.descriptor_only !== true || contract.runtime_execution !== false) errors.push("commercial interface must be descriptor-only and runtime-closed");
  for (const exportName of COMMERCIAL_INTERFACE_PUBLIC_EXPORTS) {
    if (!contract.public_export_map?.exports?.includes(exportName)) errors.push(`commercial interface missing export ${exportName}`);
  }
  for (const field of ["tenant_id", "actor_tenant_id", "actor_role", "matter_trace_ref", "action", "idempotency_key"]) {
    if (!contract.request_contract?.required_fields?.includes(field)) errors.push(`commercial interface request contract missing ${field}`);
  }
  for (const field of ["decision", "blocked_claims", "validation_errors", "audit_hint", "runtime_execution"]) {
    if (!contract.response_contract?.fields?.includes(field)) errors.push(`commercial interface response contract missing ${field}`);
  }
  for (const code of COMMERCIAL_INTERFACE_ERROR_CODES) {
    if (!contract.error_code_taxonomy?.includes(code)) errors.push(`commercial interface missing error code ${code}`);
  }
  if (contract.permission_annotation?.permission_precheck_required !== true) errors.push("commercial interface permission precheck must be required");
  if (contract.permission_annotation?.permission_decision_written !== false) errors.push("commercial interface must not write permission decisions");
  if (contract.audit_annotation?.audit_hint_required !== true || contract.audit_annotation?.audit_event_written !== false) errors.push("commercial interface audit annotation drift");
  if (contract.pagination_or_filtering_contract?.descriptor_only !== true || contract.pagination_or_filtering_contract?.cursor_runtime_opened !== false) errors.push("commercial interface pagination/filtering must remain descriptor-only");
  if (contract.serialization_guard?.unauthorized_data_omitted !== true) errors.push("commercial interface must omit unauthorized data");
  if (contract.serialization_guard?.credential_or_secret_included !== false || contract.serialization_guard?.real_client_data_included !== false) errors.push("commercial interface serialization guard must exclude real data and secrets");
  if (contract.api_fixture?.synthetic_only !== true || contract.api_fixture?.integration_smoke_executes_runtime !== false) errors.push("commercial interface API fixture must be synthetic and runtime-closed");
  if (contract.interface_test_matrix?.contract_test?.runtime_execution !== false) errors.push("commercial interface contract test must remain runtime-closed");
  if (contract.interface_test_matrix?.invalid_request_test?.decision !== "denied_descriptor") errors.push("commercial interface invalid request test must deny");
  if (!contract.interface_test_matrix?.invalid_request_test?.validation_errors?.includes("cross_tenant_release_access")) errors.push("commercial interface invalid request test must preserve denial claim");
  if (contract.interface_test_matrix?.invalid_request_test?.permission_decision_written !== false || contract.interface_test_matrix?.invalid_request_test?.audit_event_written !== false) {
    errors.push("commercial interface invalid request test must not write permission or audit state");
  }
  if (contract.interface_test_matrix?.denied_response_test?.denied_response_omits_unauthorized_data !== true) errors.push("commercial interface denied response must omit unauthorized data");
  if (contract.interface_test_matrix?.denied_response_test?.runtime_receipt_emitted !== false) errors.push("commercial interface denied response must not emit runtime receipt");
  if (contract.interface_test_matrix?.review_required_response_test?.decision !== "review_required") errors.push("commercial interface review-required response test drift");
  if (contract.hermes_api_evidence?.gate !== "H29" || contract.hermes_api_evidence?.emits_runtime_receipt !== false) errors.push("commercial interface Hermes API evidence drift");
  if (contract.claude_interface_prompt?.gate !== "C29" || contract.claude_interface_prompt?.read_only !== true) errors.push("commercial interface Claude prompt drift");
  if (contract.no_write_attestation?.writes_product_state !== false) errors.push("commercial interface no-write attestation drift");
  if (contract.no_write_attestation?.permission_decision_written !== false || contract.no_write_attestation?.audit_event_written !== false) errors.push("commercial interface must not write permission or audit state");
  if (contract.no_write_attestation?.runtime_receipt_emitted !== false) errors.push("commercial interface must not emit runtime receipts");
  if (contract.no_write_attestation?.real_client_data_included !== false || contract.no_write_attestation?.credential_or_secret_included !== false) errors.push("commercial interface must not include real data or credentials");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), contract });
}

export function validateCommercialUiSurfaceMatrix(matrix = createCommercialUiSurfaceMatrix()) {
  const errors = [];
  if (matrix.schema_version !== "law-firm-os.commercial-ui-surface.v0.1") errors.push("commercial UI schema_version drift");
  if (matrix.descriptor_only !== true || matrix.runtime_execution !== false) errors.push("commercial UI matrix must be descriptor-only and runtime-closed");
  if (matrix.ui_surface_inventory?.opens_runtime_surface !== false || matrix.ui_surface_inventory?.runtime_endpoint_bound !== false) errors.push("commercial UI surface must not open runtime endpoints");
  if (matrix.data_dependency_map?.real_client_data_included !== false || matrix.data_dependency_map?.credential_or_secret_included !== false) errors.push("commercial UI data dependency map must exclude real data and secrets");
  if (matrix.data_dependency_map?.unauthorized_count_leak !== false) errors.push("commercial UI data dependency map must not leak unauthorized counts");
  if (matrix.loading_state?.fetches_runtime_data !== false || matrix.loading_state?.exposes_record_count !== false) errors.push("commercial UI loading state must not fetch runtime data or counts");
  if (matrix.empty_state?.exposes_customer_or_matter_names !== false || matrix.empty_state?.exposes_record_count !== false) errors.push("commercial UI empty state must not expose names or counts");
  if (matrix.denied_state?.fail_closed !== true || matrix.denied_state?.unauthorized_data_omitted !== true) errors.push("commercial UI denied state must fail closed and omit unauthorized data");
  if (matrix.denied_state?.unauthorized_count_leak !== false || matrix.denied_state?.permission_decision_written !== false) errors.push("commercial UI denied state must not leak counts or write permission decisions");
  if (matrix.review_required_state?.routes_to_human_review !== true || matrix.review_required_state?.claude_is_final_approval !== false) errors.push("commercial UI review-required state authority drift");
  if (matrix.primary_interaction?.dispatches_runtime_action !== false || matrix.primary_interaction?.writes_product_state !== false) errors.push("commercial UI primary interaction must not dispatch runtime writes");
  if (matrix.secondary_interaction?.dispatches_runtime_action !== false || matrix.secondary_interaction?.writes_product_state !== false) errors.push("commercial UI secondary interaction must not dispatch runtime writes");
  if (matrix.permission_badge?.permission_decision_written !== false || matrix.permission_badge?.exposes_permission_decision_body !== false) errors.push("commercial UI permission badge must not write or expose permission decisions");
  if (matrix.audit_hint_display?.audit_event_written !== false || matrix.audit_hint_display?.exposes_audit_event_body !== false) errors.push("commercial UI audit hint must not write or expose audit events");
  if (matrix.error_message_copy?.sensitive_detail_included !== false || matrix.error_message_copy?.credential_or_secret_included !== false) errors.push("commercial UI error copy must exclude sensitive detail and secrets");
  if (matrix.responsive_desktop_layout?.unauthorized_count_leak !== false || matrix.responsive_mobile_layout?.unauthorized_count_leak !== false) errors.push("commercial UI responsive layouts must not leak unauthorized counts");
  if (matrix.keyboard_focus_behavior?.keyboard_shortcut_dispatches_runtime !== false) errors.push("commercial UI keyboard shortcuts must not dispatch runtime");
  if (matrix.visual_density_check?.visual_density_runtime_bound !== false) errors.push("commercial UI visual density check must not bind runtime");
  if (matrix.synthetic_fixture_binding?.synthetic_only !== true || matrix.synthetic_fixture_binding?.real_client_data_included !== false) errors.push("commercial UI synthetic fixtures must stay synthetic-only");
  if (matrix.build_smoke?.executes_runtime_smoke !== false || matrix.build_smoke?.opens_runtime_endpoint !== false) errors.push("commercial UI build smoke must not execute runtime");
  if (matrix.hermes_ui_evidence?.gate !== "H29" || matrix.hermes_ui_evidence?.emits_runtime_receipt !== false) errors.push("commercial UI Hermes evidence drift");
  if (matrix.claude_ui_leak_prompt?.gate !== "C29" || matrix.claude_ui_leak_prompt?.read_only !== true) errors.push("commercial UI Claude leak prompt drift");
  if (matrix.state_snapshot?.unauthorized_data_omitted !== true || matrix.state_snapshot?.unauthorized_count_leak !== false) errors.push("commercial UI state snapshot must omit unauthorized data and counts");
  if (matrix.no_unauthorized_count_leak?.enforced !== true || matrix.no_unauthorized_count_leak?.count_values_included !== false) errors.push("commercial UI count leak guard drift");
  if (matrix.no_write_attestation?.writes_product_state !== false) errors.push("commercial UI no-write attestation drift");
  if (matrix.no_write_attestation?.permission_decision_written !== false || matrix.no_write_attestation?.audit_event_written !== false) errors.push("commercial UI must not write permission or audit state");
  if (matrix.no_write_attestation?.runtime_receipt_emitted !== false) errors.push("commercial UI must not emit runtime receipts");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), matrix });
}

export function validateCommercialUiFixtureGoldenCaseMatrix(matrix = createCommercialUiFixtureGoldenCaseMatrix()) {
  const errors = [];
  if (matrix.schema_version !== "law-firm-os.commercial-ui-fixture-golden-case.v0.1") errors.push("commercial UI fixture schema_version drift");
  if (matrix.descriptor_only !== true || matrix.runtime_execution !== false) errors.push("commercial UI fixture matrix must be descriptor-only and runtime-closed");
  if (matrix.fixture_scope?.opens_runtime_ui !== false || matrix.fixture_scope?.binds_runtime_endpoint !== false) errors.push("commercial UI fixture scope must not open runtime UI");
  if (matrix.fixture_scope?.real_client_data_included !== false || matrix.fixture_scope?.credential_or_secret_included !== false) errors.push("commercial UI fixture scope must exclude real data and secrets");
  for (const tenant of ["tenant-synthetic-alpha", "tenant-synthetic-beta"]) {
    if (!matrix.fixture_scope?.synthetic_tenants?.includes(tenant)) errors.push(`commercial UI fixture missing synthetic tenant ${tenant}`);
  }
  if (matrix.fixture_manifest?.case_count !== COMMERCIAL_UI_FIXTURE_CASE_NAMES.length) errors.push("commercial UI fixture case count drift");
  if (matrix.fixture_manifest?.manifest_descriptor_only !== true) errors.push("commercial UI fixture manifest must be descriptor-only");
  if (matrix.fixture_manifest?.exposes_customer_or_matter_names !== false || matrix.fixture_manifest?.aggregate_count_included !== false) {
    errors.push("commercial UI fixture manifest must omit customer/matter names and counts");
  }
  for (const caseName of COMMERCIAL_UI_FIXTURE_CASE_NAMES) {
    const fixtureCase = matrix.cases?.[caseName];
    if (!fixtureCase) {
      errors.push(`commercial UI fixture missing case ${caseName}`);
      continue;
    }
    if (fixtureCase.synthetic_only !== true || fixtureCase.descriptor_only !== true) errors.push(`commercial UI fixture ${caseName} must be synthetic descriptor-only`);
    if (fixtureCase.runtime_execution !== false || fixtureCase.writes_product_state !== false) errors.push(`commercial UI fixture ${caseName} must not run or write`);
    if (fixtureCase.permission_decision_written !== false || fixtureCase.audit_event_written !== false) errors.push(`commercial UI fixture ${caseName} must not write permission or audit state`);
    if (fixtureCase.runtime_receipt_emitted !== false) errors.push(`commercial UI fixture ${caseName} must not emit runtime receipt`);
    if (fixtureCase.real_client_data_included !== false || fixtureCase.credential_or_secret_included !== false) errors.push(`commercial UI fixture ${caseName} must exclude real data and credentials`);
    if (fixtureCase.unauthorized_data_omitted !== true || fixtureCase.unauthorized_count_leak !== false) errors.push(`commercial UI fixture ${caseName} must omit unauthorized data and counts`);
  }
  if (matrix.golden_test?.executes_runtime_test !== false || matrix.golden_test?.unauthorized_count_leak !== false) errors.push("commercial UI golden test must stay descriptor-only and count-safe");
  if (matrix.failure_test?.executes_runtime_test !== false) errors.push("commercial UI failure test must not execute runtime");
  if (matrix.failure_test?.permission_decision_written !== false || matrix.failure_test?.audit_event_written !== false) errors.push("commercial UI failure test must not write permission or audit state");
  for (const caseName of ["denied_case", "cross_tenant_case", "missing_context_case"]) {
    if (!matrix.failure_test?.fail_closed_cases?.includes(caseName)) errors.push(`commercial UI failure test missing fail-closed case ${caseName}`);
  }
  if (matrix.hermes_fixture_evidence?.gate !== "H29" || matrix.hermes_fixture_evidence?.emits_runtime_receipt !== false) errors.push("commercial UI Hermes fixture evidence drift");
  if (matrix.hermes_fixture_evidence?.runtime_execution !== false) errors.push("commercial UI Hermes fixture evidence must not execute runtime");
  if (matrix.claude_missing_test_prompt?.gate !== "C29" || matrix.claude_missing_test_prompt?.read_only !== true) errors.push("commercial UI missing-test prompt drift");
  if (matrix.claude_missing_test_prompt?.promotes_claude_to_final_approval !== false || matrix.claude_missing_test_prompt?.runtime_execution !== false) {
    errors.push("commercial UI missing-test prompt must remain read-only and runtime-closed");
  }
  if (matrix.closeout_handoff?.runtime_opening_allowed !== false || matrix.closeout_handoff?.writes_product_state !== false) errors.push("commercial UI fixture handoff must not open runtime or write state");
  if (matrix.no_real_data_check?.enforced !== true || matrix.no_real_data_check?.real_client_data_included !== false) errors.push("commercial UI no-real-data check drift");
  if (matrix.no_real_data_check?.credential_or_secret_included !== false || matrix.no_real_data_check?.customer_or_matter_names_included !== false) {
    errors.push("commercial UI no-real-data check must exclude credentials and customer/matter names");
  }
  if (matrix.stable_id_check?.deterministic_case_ids !== true || matrix.stable_id_check?.uses_runtime_generated_ids !== false) errors.push("commercial UI stable ID check drift");
  if (matrix.stable_id_check?.exposes_customer_or_matter_ids !== false) errors.push("commercial UI stable ID check must not expose customer or Matter IDs");
  if (matrix.replay_command?.descriptor_only !== true || matrix.replay_command?.executes_replay !== false) errors.push("commercial UI replay command must stay descriptor-only");
  if (matrix.replay_command?.emits_runtime_receipt !== false || matrix.replay_command?.writes_product_state !== false) errors.push("commercial UI replay command must not emit receipts or write state");
  if (matrix.no_write_attestation?.writes_product_state !== false) errors.push("commercial UI fixture no-write attestation drift");
  if (matrix.no_write_attestation?.permission_decision_written !== false || matrix.no_write_attestation?.audit_event_written !== false) errors.push("commercial UI fixture must not write permission or audit state");
  if (matrix.no_write_attestation?.runtime_receipt_emitted !== false) errors.push("commercial UI fixture must not emit runtime receipts");
  if (matrix.no_write_attestation?.real_client_data_included !== false || matrix.no_write_attestation?.credential_or_secret_included !== false) errors.push("commercial UI fixture must exclude real data and credentials");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), matrix });
}

export function validateCommercialCp875RelationshipServiceFoundationDescriptor(
  descriptor = createCommercialCp875RelationshipServiceFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP875_PACK_BINDING;
  const requirements = COMMERCIAL_CP875_REQUIREMENTS;
  const caseSet = descriptor.relationship_service_foundation_case_set ?? createCommercialCp875RelationshipServiceFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp875RelationshipServiceFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp874IncidentRunbookRelationshipTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.release_candidate_created !== false || row.deployment_run_created !== false) errors.push(`${binding.pack_id} ${key} must not create releases or deployments`);
      if (row.ci_cd_pipeline_triggered !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not trigger CI/CD or deployment`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} must not emit runtime receipts`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (!descriptor.relationship_map?.IncidentRunbook?.includes("AuditEvent")) errors.push(`${binding.pack_id} IncidentRunbook relationship map must include AuditEvent`);
  if (!descriptor.relationship_map?.ReleaseCandidate?.includes("DeploymentRun")) errors.push(`${binding.pack_id} ReleaseCandidate relationship map must include DeploymentRun`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp876ServiceTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP876_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp876ServiceTailCoverage(planPack) {
  const binding = COMMERCIAL_CP876_PACK_BINDING;
  const requirements = COMMERCIAL_CP876_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp876ServiceTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp876ServiceTailDescriptor(
  descriptor = createCommercialCp876ServiceTailDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP876_PACK_BINDING;
  const requirements = COMMERCIAL_CP876_REQUIREMENTS;
  const caseSet = descriptor.service_tail_case_set ?? createCommercialCp876ServiceTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp876ServiceTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp875RelationshipServiceFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.release_candidate_created !== false || row.deployment_run_created !== false) errors.push(`${binding.pack_id} ${key} must not create releases or deployments`);
      if (row.ci_cd_pipeline_triggered !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not trigger CI/CD or deployment`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} must not emit runtime receipts`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp877SecondaryWorkflowBoundaryCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP877_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp877SecondaryWorkflowBoundaryCoverage(planPack) {
  const binding = COMMERCIAL_CP877_PACK_BINDING;
  const requirements = COMMERCIAL_CP877_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp877SecondaryWorkflowBoundaryCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp877SecondaryWorkflowBoundaryDescriptor(
  descriptor = createCommercialCp877SecondaryWorkflowBoundaryDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP877_PACK_BINDING;
  const requirements = COMMERCIAL_CP877_REQUIREMENTS;
  const caseSet = descriptor.secondary_workflow_boundary_case_set ?? createCommercialCp877SecondaryWorkflowBoundaryCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp877SecondaryWorkflowBoundaryDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp876ServiceTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  const secondary = descriptor.service_matrix?.secondary_workflow;
  if (secondary?.tenant_boundary_precheck !== true) errors.push(`${binding.pack_id} secondary workflow tenant boundary must pass`);
  if (secondary?.matter_trace_precheck !== true) errors.push(`${binding.pack_id} secondary workflow Matter trace must pass`);
  if (secondary?.audit_hint?.writes_audit_event_now !== false) errors.push(`${binding.pack_id} secondary workflow audit hint must remain no-write`);
  if (secondary?.idempotency_scope !== "tenant_matter_action") errors.push(`${binding.pack_id} secondary workflow idempotency scope drift`);
  if (secondary?.lock_acquisition_rule !== "declared_not_acquired" || secondary?.runtime_lock_acquired !== false) errors.push(`${binding.pack_id} secondary workflow lock rule must not acquire runtime lock`);
  if (secondary?.persistence_boundary !== "no_persistence" || secondary?.persists_product_state !== false || secondary?.writes_product_state !== false) errors.push(`${binding.pack_id} secondary workflow persistence boundary must remain no-write`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp878PermissionAuditFixtureCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP878_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp878PermissionAuditFixtureCoverage(planPack) {
  const binding = COMMERCIAL_CP878_PACK_BINDING;
  const requirements = COMMERCIAL_CP878_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp878PermissionAuditFixtureCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp878PermissionAuditFixtureDescriptor(
  descriptor = createCommercialCp878PermissionAuditFixtureDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP878_PACK_BINDING;
  const requirements = COMMERCIAL_CP878_REQUIREMENTS;
  const caseSet = descriptor.permission_audit_fixture_case_set ?? createCommercialCp878PermissionAuditFixtureCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp878PermissionAuditFixtureDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp877SecondaryWorkflowBoundaryDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const unverified = descriptor.service_matrix?.unverified_release;
  if (!unverified?.validation_error_mapping?.some((mapping) => mapping.claim === "unverified_release" && mapping.route === "review_required")) {
    errors.push(`${binding.pack_id} unverified release validation mapping drift`);
  }
  if (descriptor.service_matrix?.approval_required?.approval_required_routing !== true) errors.push(`${binding.pack_id} approval-required route drift`);
  if (descriptor.service_matrix?.approval_required?.permission_decision_written !== false) errors.push(`${binding.pack_id} approval-required route must remain no-write`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp879FixtureInterfaceBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP879_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp879FixtureInterfaceBridgeCoverage(planPack) {
  const binding = COMMERCIAL_CP879_PACK_BINDING;
  const requirements = COMMERCIAL_CP879_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp879FixtureInterfaceBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp879FixtureInterfaceBridgeDescriptor(
  descriptor = createCommercialCp879FixtureInterfaceBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP879_PACK_BINDING;
  const requirements = COMMERCIAL_CP879_REQUIREMENTS;
  const caseSet = descriptor.fixture_interface_bridge_case_set ?? createCommercialCp879FixtureInterfaceBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp879FixtureInterfaceBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp878PermissionAuditFixtureDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp880InterfacePermissionFixtureTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP880_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp880InterfacePermissionFixtureTailCoverage(planPack) {
  const binding = COMMERCIAL_CP880_PACK_BINDING;
  const requirements = COMMERCIAL_CP880_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp880InterfacePermissionFixtureTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp880InterfacePermissionFixtureTailDescriptor(
  descriptor = createCommercialCp880InterfacePermissionFixtureTailDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP880_PACK_BINDING;
  const requirements = COMMERCIAL_CP880_REQUIREMENTS;
  const caseSet = descriptor.interface_permission_fixture_tail_case_set ?? createCommercialCp880InterfacePermissionFixtureTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp880InterfacePermissionFixtureTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp879FixtureInterfaceBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const interfaceMatrix = descriptor.interface_contract?.interface_test_matrix;
  if (interfaceMatrix?.invalid_request_test?.decision !== "denied_descriptor") errors.push(`${binding.pack_id} interface invalid request decision drift`);
  if (!interfaceMatrix?.invalid_request_test?.validation_errors?.includes("cross_tenant_release_access")) errors.push(`${binding.pack_id} interface invalid request missing cross-tenant denial`);
  if (interfaceMatrix?.denied_response_test?.denied_response_omits_unauthorized_data !== true) errors.push(`${binding.pack_id} interface denied response omission drift`);
  if (interfaceMatrix?.contract_test?.runtime_execution !== false) errors.push(`${binding.pack_id} interface contract test must remain runtime-closed`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp881InterfaceEvidenceUiFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP881_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp881InterfaceEvidenceUiFoundationCoverage(planPack) {
  const binding = COMMERCIAL_CP881_PACK_BINDING;
  const requirements = COMMERCIAL_CP881_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp881InterfaceEvidenceUiFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp881InterfaceEvidenceUiFoundationDescriptor(
  descriptor = createCommercialCp881InterfaceEvidenceUiFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP881_PACK_BINDING;
  const requirements = COMMERCIAL_CP881_REQUIREMENTS;
  const caseSet = descriptor.interface_evidence_ui_foundation_case_set ?? createCommercialCp881InterfaceEvidenceUiFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp881InterfaceEvidenceUiFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp880InterfacePermissionFixtureTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  if (descriptor.ui_surface_matrix?.denied_state?.unauthorized_count_leak !== false) errors.push(`${binding.pack_id} UI denied state count leak drift`);
  if (descriptor.ui_surface_matrix?.permission_badge?.permission_decision_written !== false) errors.push(`${binding.pack_id} UI permission badge no-write drift`);
  if (descriptor.ui_surface_matrix?.audit_hint_display?.audit_event_written !== false) errors.push(`${binding.pack_id} UI audit hint no-write drift`);
  if (descriptor.ui_surface_matrix?.build_smoke?.executes_runtime_smoke !== false) errors.push(`${binding.pack_id} UI build smoke runtime drift`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp882UiFixtureGoldenCaseBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP882_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp882UiFixtureGoldenCaseBridgeCoverage(planPack) {
  const binding = COMMERCIAL_CP882_PACK_BINDING;
  const requirements = COMMERCIAL_CP882_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp882UiFixtureGoldenCaseBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp882UiFixtureGoldenCaseBridgeDescriptor(
  descriptor = createCommercialCp882UiFixtureGoldenCaseBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP882_PACK_BINDING;
  const requirements = COMMERCIAL_CP882_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_golden_case_bridge_case_set ?? createCommercialCp882UiFixtureGoldenCaseBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp882UiFixtureGoldenCaseBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp881InterfaceEvidenceUiFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  if (descriptor.ui_fixture_golden_case_matrix?.golden_test?.executes_runtime_test !== false) errors.push(`${binding.pack_id} golden test runtime drift`);
  if (descriptor.ui_fixture_golden_case_matrix?.failure_test?.permission_decision_written !== false) errors.push(`${binding.pack_id} failure test permission write drift`);
  if (descriptor.ui_fixture_golden_case_matrix?.fixture_manifest?.aggregate_count_included !== false) errors.push(`${binding.pack_id} fixture manifest count leak drift`);
  if (descriptor.ui_fixture_golden_case_matrix?.hermes_fixture_evidence?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes fixture evidence receipt drift`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp883UiFixtureGoldenCaseTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP883_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp883UiFixtureGoldenCaseTailCoverage(planPack) {
  const binding = COMMERCIAL_CP883_PACK_BINDING;
  const requirements = COMMERCIAL_CP883_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp883UiFixtureGoldenCaseTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp883UiFixtureGoldenCaseTailDescriptor(
  descriptor = createCommercialCp883UiFixtureGoldenCaseTailDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP883_PACK_BINDING;
  const requirements = COMMERCIAL_CP883_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_golden_case_tail_case_set ?? createCommercialCp883UiFixtureGoldenCaseTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp883UiFixtureGoldenCaseTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp882UiFixtureGoldenCaseBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  if (descriptor.ui_fixture_golden_case_matrix?.claude_missing_test_prompt?.read_only !== true) errors.push(`${binding.pack_id} missing-test prompt read-only drift`);
  if (descriptor.ui_fixture_golden_case_matrix?.no_real_data_check?.enforced !== true) errors.push(`${binding.pack_id} no-real-data check drift`);
  if (descriptor.ui_fixture_golden_case_matrix?.stable_id_check?.exposes_customer_or_matter_ids !== false) errors.push(`${binding.pack_id} stable ID leak drift`);
  if (descriptor.ui_fixture_golden_case_matrix?.replay_command?.executes_replay !== false) errors.push(`${binding.pack_id} replay command runtime drift`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp884UiFixturePermissionAuditSliceCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP884_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp884UiFixturePermissionAuditSliceCoverage(planPack) {
  const binding = COMMERCIAL_CP884_PACK_BINDING;
  const requirements = COMMERCIAL_CP884_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp884UiFixturePermissionAuditSliceCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp884UiFixturePermissionAuditSliceDescriptor(
  descriptor = createCommercialCp884UiFixturePermissionAuditSliceDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP884_PACK_BINDING;
  const requirements = COMMERCIAL_CP884_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_permission_audit_slice_case_set ?? createCommercialCp884UiFixturePermissionAuditSliceCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp884UiFixturePermissionAuditSliceDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp883UiFixtureGoldenCaseTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
    }
  }
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  if (descriptor.ui_surface_matrix?.closeout_handoff?.next_ui_rows?.includes("RP29.P04.M04")) errors.push(`${binding.pack_id} shared UI surface handoff must not retain stale P04 reference`);
  if (descriptor.ui_fixture_golden_case_matrix?.cases?.audit_hint_case?.audit_event_written !== false) errors.push(`${binding.pack_id} audit hint fixture must not write audit event`);
  if (descriptor.ui_fixture_golden_case_matrix?.cases?.security_trimming_case?.unauthorized_data_omitted !== true) errors.push(`${binding.pack_id} security trimming fixture must omit unauthorized data`);
  if (descriptor.ui_fixture_golden_case_matrix?.hermes_fixture_evidence?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes fixture evidence receipt drift`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp885UiFixtureCloseoutPermissionFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP885_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp885UiFixtureCloseoutPermissionFoundationCoverage(planPack) {
  const binding = COMMERCIAL_CP885_PACK_BINDING;
  const requirements = COMMERCIAL_CP885_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp885UiFixtureCloseoutPermissionFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor(
  descriptor = createCommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP885_PACK_BINDING;
  const requirements = COMMERCIAL_CP885_REQUIREMENTS;
  const caseSet =
    descriptor.ui_fixture_closeout_permission_foundation_case_set ??
    createCommercialCp885UiFixtureCloseoutPermissionFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp884UiFixturePermissionAuditSliceDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== COMMERCIAL_READINESS_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must not write permission or audit state`);
      if (row.runtime_receipt_emitted !== false || row.deployment_executed !== false) errors.push(`${binding.pack_id} ${key} must not execute deployment or emit receipts`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or credentials`);
      if (microId.startsWith("RP29.P06")) {
        if (row.permission_matrix_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be a permission matrix descriptor`);
        if (row.legal_hold_bypassed !== false || row.ethical_wall_bypassed !== false || row.object_acl_bypassed !== false) {
          errors.push(`${binding.pack_id} ${key} must not bypass hold, wall, or ACL boundaries`);
        }
        if (row.matched_rule_contains_secret !== false || row.audit_event_body_written !== false) errors.push(`${binding.pack_id} ${key} must not expose rule secrets or audit bodies`);
        if (row.allowed_test_executes_runtime !== false || row.denied_test_executes_runtime !== false) errors.push(`${binding.pack_id} ${key} permission tests must not execute runtime`);
        if (row.cross_tenant_data_exposed !== false) errors.push(`${binding.pack_id} ${key} cross-tenant data exposure drift`);
      }
    }
  }
  const p06Primary = caseSet.sections?.["RP29.P06.M03"]?.rows ?? {};
  if (p06Primary.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push(`${binding.pack_id} deny-over-allow proof drift`);
  if (p06Primary.security_trimming_proof?.security_trimming_omits_unauthorized_data !== true) errors.push(`${binding.pack_id} security trimming proof drift`);
  if (p06Primary.leak_prevention_test?.security_trimming_omits_unauthorized_data !== true) errors.push(`${binding.pack_id} leak prevention proof drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  if (descriptor.ui_fixture_golden_case_matrix?.replay_command?.executes_replay !== false) errors.push(`${binding.pack_id} replay command runtime drift`);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp886PermissionMatrixSecondaryHeadCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP886_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp886PermissionMatrixSecondaryHeadCoverage(planPack) {
  const binding = COMMERCIAL_CP886_PACK_BINDING;
  const requirements = COMMERCIAL_CP886_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  const summary = createCommercialCp886PermissionMatrixSecondaryHeadCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionTitles = units.filter((unit) => unit.source_micro_phase_id === microId).map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp886PermissionMatrixSecondaryHeadDescriptor(
  descriptor = createCommercialCp886PermissionMatrixSecondaryHeadDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP886_PACK_BINDING;
  const requirements = COMMERCIAL_CP886_REQUIREMENTS;
  const caseSet = descriptor.permission_matrix_secondary_head_case_set ?? createCommercialCp886PermissionMatrixSecondaryHeadCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp886PermissionMatrixSecondaryHeadDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp885UiFixtureCloseoutPermissionFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  const rows = caseSet.sections?.["RP29.P06.M04"]?.rows ?? {};
  for (const title of requirements.required_section_rows["RP29.P06.M04"]) {
    const key = commercialRowKey(title);
    const row = rows[key];
    if (!row) {
      errors.push(`${binding.pack_id} missing row ${key}`);
      continue;
    }
    if (row.permission_matrix_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be permission matrix descriptor`);
    if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) {
      errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
    }
    if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
    if (row.matched_rule_contains_secret !== false || row.audit_event_body_written !== false) errors.push(`${binding.pack_id} ${key} must omit rule secrets and audit bodies`);
  }
  if (rows.view_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} view decision binding drift`);
  if (rows.search_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} search decision binding drift`);
  if (rows.mutation_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} mutation decision binding drift`);
  if (rows.export_download_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} export/download decision binding drift`);
  if (rows.share_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} share decision binding drift`);
  if (rows.ai_retrieval_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} AI retrieval decision binding drift`);
  if (rows.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push(`${binding.pack_id} deny-over-allow drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp887PermissionMatrixBoundaryTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP887_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp887PermissionMatrixBoundaryTailCoverage(planPack) {
  const binding = COMMERCIAL_CP887_PACK_BINDING;
  const requirements = COMMERCIAL_CP887_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp887PermissionMatrixBoundaryTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp887PermissionMatrixBoundaryTailDescriptor(
  descriptor = createCommercialCp887PermissionMatrixBoundaryTailDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP887_PACK_BINDING;
  const requirements = COMMERCIAL_CP887_REQUIREMENTS;
  const caseSet = descriptor.permission_matrix_boundary_tail_case_set ?? createCommercialCp887PermissionMatrixBoundaryTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp887PermissionMatrixBoundaryTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp886PermissionMatrixSecondaryHeadDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.permission_matrix_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be permission matrix descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (row.legal_hold_bypassed !== false || row.ethical_wall_bypassed !== false || row.object_acl_bypassed !== false) errors.push(`${binding.pack_id} ${key} hold/wall/ACL bypass drift`);
      if (row.cross_tenant_data_exposed !== false) errors.push(`${binding.pack_id} ${key} cross-tenant exposure drift`);
    }
  }
  const secondaryRows = caseSet.sections?.["RP29.P06.M04"]?.rows ?? {};
  const bindingRows = caseSet.sections?.["RP29.P06.M05"]?.rows ?? {};
  if (secondaryRows.legal_hold_interaction?.legal_hold_bypassed !== false) errors.push(`${binding.pack_id} legal hold boundary drift`);
  if (secondaryRows.ethical_wall_interaction?.ethical_wall_bypassed !== false) errors.push(`${binding.pack_id} ethical wall boundary drift`);
  if (secondaryRows.object_acl_interaction?.object_acl_bypassed !== false) errors.push(`${binding.pack_id} object ACL boundary drift`);
  if (secondaryRows.security_trimming_proof?.security_trimming_omits_unauthorized_data !== true) errors.push(`${binding.pack_id} security trimming drift`);
  if (secondaryRows.leak_prevention_test?.security_trimming_omits_unauthorized_data !== true) errors.push(`${binding.pack_id} leak prevention drift`);
  if (bindingRows.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push(`${binding.pack_id} deny-over-allow drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp888PermissionFailureBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP888_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp888PermissionFailureBridgeCoverage(planPack) {
  const binding = COMMERCIAL_CP888_PACK_BINDING;
  const requirements = COMMERCIAL_CP888_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp888PermissionFailureBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp888PermissionFailureBridgeDescriptor(
  descriptor = createCommercialCp888PermissionFailureBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP888_PACK_BINDING;
  const requirements = COMMERCIAL_CP888_REQUIREMENTS;
  const caseSet = descriptor.permission_failure_bridge_case_set ?? createCommercialCp888PermissionFailureBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp888PermissionFailureBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp887PermissionMatrixBoundaryTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (row.cross_tenant_data_exposed !== false) errors.push(`${binding.pack_id} ${key} cross-tenant exposure drift`);
      if (microId.startsWith("RP29.P06")) {
        if (row.permission_matrix_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be permission matrix descriptor`);
        if (row.legal_hold_bypassed !== false || row.ethical_wall_bypassed !== false || row.object_acl_bypassed !== false) errors.push(`${binding.pack_id} ${key} hold/wall/ACL bypass drift`);
        if (row.matched_rule_contains_secret !== false || row.audit_event_body_written !== false) errors.push(`${binding.pack_id} ${key} matched-rule/audit body drift`);
      } else {
        if (row.failure_recovery_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be failure recovery descriptor`);
        if (row.recovery_action_executed !== false || row.rollback_executes_now !== false || row.retry_executes_now !== false || row.compensation_executed !== false) errors.push(`${binding.pack_id} ${key} recovery execution drift`);
        if (["Failure unit test", "Failure integration smoke"].includes(title) && row.failure_test_executes_runtime !== false) errors.push(`${binding.pack_id} ${key} failure test execution drift`);
      }
    }
  }
  const permissionTailRows = caseSet.sections?.["RP29.P06.M06"]?.rows ?? {};
  const failureScopeRows = caseSet.sections?.["RP29.P07.M00"]?.rows ?? {};
  const failureContractRows = caseSet.sections?.["RP29.P07.M01"]?.rows ?? {};
  const failureTypeRows = caseSet.sections?.["RP29.P07.M02"]?.rows ?? {};
  if (permissionTailRows.ai_retrieval_decision_binding?.decision_binding_descriptor !== true) errors.push(`${binding.pack_id} AI retrieval binding drift`);
  if (permissionTailRows.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push(`${binding.pack_id} deny-over-allow drift`);
  if (permissionTailRows.security_trimming_proof?.security_trimming_omits_unauthorized_data !== true) errors.push(`${binding.pack_id} security trimming drift`);
  if (failureScopeRows.permission_denied_failure?.permission_denied_is_terminal_descriptor !== true) errors.push(`${binding.pack_id} permission denied terminal drift`);
  if (failureContractRows.blocked_claim_receipt?.blocked_claim_receipt_descriptor !== true) errors.push(`${binding.pack_id} blocked-claim receipt drift`);
  if (failureContractRows.hermes_failure_evidence?.hermes_failure_evidence_descriptor !== true) errors.push(`${binding.pack_id} Hermes failure evidence drift`);
  if (failureContractRows.audit_failure_hint?.audit_failure_hint_omits_body !== true) errors.push(`${binding.pack_id} audit failure hint drift`);
  if (failureTypeRows.failure_fixture?.failure_fixture_descriptor !== true) errors.push(`${binding.pack_id} failure fixture drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp889FailureRecoverySliceCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP889_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp889FailureRecoverySliceCoverage(planPack) {
  const binding = COMMERCIAL_CP889_PACK_BINDING;
  const requirements = COMMERCIAL_CP889_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp889FailureRecoverySliceCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp889FailureRecoverySliceDescriptor(
  descriptor = createCommercialCp889FailureRecoverySliceDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP889_PACK_BINDING;
  const requirements = COMMERCIAL_CP889_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_slice_case_set ?? createCommercialCp889FailureRecoverySliceCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp889FailureRecoverySliceDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp888PermissionFailureBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.failure_recovery_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be failure recovery descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.recovery_action_executed !== false || row.rollback_executes_now !== false || row.retry_executes_now !== false || row.compensation_executed !== false) errors.push(`${binding.pack_id} ${key} recovery execution drift`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (row.cross_tenant_data_exposed !== false) errors.push(`${binding.pack_id} ${key} cross-tenant exposure drift`);
    }
  }
  const typeTailRows = caseSet.sections?.["RP29.P07.M02"]?.rows ?? {};
  const primaryRows = caseSet.sections?.["RP29.P07.M03"]?.rows ?? {};
  const secondaryRows = caseSet.sections?.["RP29.P07.M04"]?.rows ?? {};
  if (typeTailRows.failure_integration_smoke?.failure_integration_smoke_executes_runtime !== false) errors.push(`${binding.pack_id} failure integration smoke execution drift`);
  if (typeTailRows.audit_failure_hint?.audit_failure_hint_omits_body !== true) errors.push(`${binding.pack_id} type-tail audit failure hint drift`);
  if (typeTailRows.hermes_failure_evidence?.hermes_failure_evidence_descriptor !== true) errors.push(`${binding.pack_id} type-tail Hermes failure evidence drift`);
  if (primaryRows.blocked_claim_receipt?.blocked_claim_receipt_descriptor !== true) errors.push(`${binding.pack_id} primary blocked-claim receipt drift`);
  if (primaryRows.claude_edge_case_prompt?.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} Claude edge-case prompt runtime receipt drift`);
  if (primaryRows.human_escalation_note?.runtime_execution !== false) errors.push(`${binding.pack_id} human escalation note runtime drift`);
  if (secondaryRows.permission_denied_failure?.permission_denied_is_terminal_descriptor !== true) errors.push(`${binding.pack_id} secondary permission denied terminal drift`);
  if (secondaryRows.blocked_claim_receipt?.blocked_claim_receipt_descriptor !== true) errors.push(`${binding.pack_id} secondary blocked-claim receipt drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp890FailureHermesBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP890_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp890FailureHermesBridgeCoverage(planPack) {
  const binding = COMMERCIAL_CP890_PACK_BINDING;
  const requirements = COMMERCIAL_CP890_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp890FailureHermesBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp890FailureHermesBridgeDescriptor(
  descriptor = createCommercialCp890FailureHermesBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP890_PACK_BINDING;
  const requirements = COMMERCIAL_CP890_REQUIREMENTS;
  const caseSet = descriptor.failure_hermes_bridge_case_set ?? createCommercialCp890FailureHermesBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp890FailureHermesBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp889FailureRecoverySliceDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (microId.startsWith("RP29.P07")) {
        if (row.failure_recovery_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be failure recovery descriptor`);
        if (row.recovery_action_executed !== false || row.rollback_executes_now !== false || row.retry_executes_now !== false || row.compensation_executed !== false) errors.push(`${binding.pack_id} ${key} recovery execution drift`);
        if (row.cross_tenant_data_exposed !== false) errors.push(`${binding.pack_id} ${key} cross-tenant exposure drift`);
      } else {
        if (row.hermes_evidence_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be Hermes evidence descriptor`);
        if (row.hermes_command_executes_now !== false || row.hermes_receipt_emitted !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} Hermes runtime receipt drift`);
        if (row.changed_file_receipt_contains_secret !== false || row.command_result_receipt_contains_secret !== false) errors.push(`${binding.pack_id} ${key} Hermes secret leakage drift`);
        if (row.fixture_summary_uses_real_data !== false || row.permission_summary_writes_decision !== false || row.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} ${key} Hermes summary boundary drift`);
      }
    }
  }
  const failureTailRows = caseSet.sections?.["RP29.P07.M04"]?.rows ?? {};
  const hermesScopeRows = caseSet.sections?.["RP29.P08.M00"]?.rows ?? {};
  const hermesContractRows = caseSet.sections?.["RP29.P08.M01"]?.rows ?? {};
  if (failureTailRows.failure_fixture?.failure_fixture_descriptor !== true) errors.push(`${binding.pack_id} failure fixture drift`);
  if (failureTailRows.hermes_failure_evidence?.hermes_failure_evidence_descriptor !== true) errors.push(`${binding.pack_id} failure Hermes evidence drift`);
  if (failureTailRows.claude_edge_case_prompt?.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} Claude edge-case runtime receipt drift`);
  if (hermesScopeRows.hermes_command_matrix?.hermes_command_executes_now !== false) errors.push(`${binding.pack_id} Hermes command matrix execution drift`);
  if (hermesScopeRows.changed_file_receipt?.changed_file_receipt_contains_secret !== false) errors.push(`${binding.pack_id} changed-file receipt secret drift`);
  if (hermesScopeRows.permission_summary_receipt?.permission_summary_writes_decision !== false) errors.push(`${binding.pack_id} permission summary write drift`);
  if (hermesScopeRows.audit_summary_receipt?.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} audit summary write drift`);
  if (hermesContractRows.fixture_summary_receipt?.fixture_summary_uses_real_data !== false) errors.push(`${binding.pack_id} contract fixture summary real-data drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp891HermesReceiptShapeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP891_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp891HermesReceiptShapeCoverage(planPack) {
  const binding = COMMERCIAL_CP891_PACK_BINDING;
  const requirements = COMMERCIAL_CP891_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp891HermesReceiptShapeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp891HermesReceiptShapeDescriptor(
  descriptor = createCommercialCp891HermesReceiptShapeDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP891_PACK_BINDING;
  const requirements = COMMERCIAL_CP891_REQUIREMENTS;
  const caseSet = descriptor.hermes_receipt_shape_case_set ?? createCommercialCp891HermesReceiptShapeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp891HermesReceiptShapeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp890FailureHermesBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.hermes_evidence_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be Hermes evidence descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.hermes_command_executes_now !== false || row.hermes_receipt_emitted !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} Hermes runtime receipt drift`);
      if (row.changed_file_receipt_contains_secret !== false || row.command_result_receipt_contains_secret !== false) errors.push(`${binding.pack_id} ${key} Hermes secret leakage drift`);
      if (row.fixture_summary_uses_real_data !== false || row.permission_summary_writes_decision !== false || row.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} ${key} Hermes summary boundary drift`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
    }
  }
  const contractTailRows = caseSet.sections?.["RP29.P08.M01"]?.rows ?? {};
  const typeShapeRows = caseSet.sections?.["RP29.P08.M02"]?.rows ?? {};
  if (contractTailRows.blocked_claim_receipt?.blocked_claim_receipt_descriptor !== true) errors.push(`${binding.pack_id} blocked-claim receipt descriptor drift`);
  if (contractTailRows.permission_summary_receipt?.permission_summary_writes_decision !== false) errors.push(`${binding.pack_id} contract permission summary write drift`);
  if (contractTailRows.audit_summary_receipt?.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} contract audit summary write drift`);
  if (typeShapeRows.hermes_command_matrix?.hermes_command_executes_now !== false) errors.push(`${binding.pack_id} type-shape command execution drift`);
  if (typeShapeRows.changed_file_receipt?.changed_file_receipt_contains_secret !== false) errors.push(`${binding.pack_id} type-shape changed-file secret drift`);
  if (typeShapeRows.command_result_receipt?.command_result_receipt_contains_secret !== false) errors.push(`${binding.pack_id} type-shape command-result secret drift`);
  if (typeShapeRows.fixture_summary_receipt?.fixture_summary_uses_real_data !== false) errors.push(`${binding.pack_id} type-shape fixture real-data drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp892HermesSemanticsCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP892_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp892HermesSemanticsCoverage(planPack) {
  const binding = COMMERCIAL_CP892_PACK_BINDING;
  const requirements = COMMERCIAL_CP892_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp892HermesSemanticsCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp892HermesSemanticsDescriptor(
  descriptor = createCommercialCp892HermesSemanticsDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP892_PACK_BINDING;
  const requirements = COMMERCIAL_CP892_REQUIREMENTS;
  const caseSet = descriptor.hermes_semantics_case_set ?? createCommercialCp892HermesSemanticsCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp892HermesSemanticsDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp891HermesReceiptShapeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.hermes_evidence_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be Hermes evidence descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.hermes_command_executes_now !== false || row.hermes_receipt_emitted !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} Hermes runtime receipt drift`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (row.permission_summary_writes_decision !== false || row.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} ${key} summary write drift`);
    }
  }
  const rows = caseSet.sections?.["RP29.P08.M02"]?.rows ?? {};
  if (rows.audit_summary_receipt?.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} audit summary write drift`);
  if (rows.no_real_data_receipt?.real_client_data_included !== false) errors.push(`${binding.pack_id} no-real-data receipt drift`);
  if (rows.claude_dependency_marker?.human_final_approval_required !== true) errors.push(`${binding.pack_id} Claude dependency must preserve human approval`);
  if (rows.human_approval_marker?.human_final_approval_required !== true) errors.push(`${binding.pack_id} human approval marker drift`);
  for (const key of ["pass_semantics", "pass_with_findings_semantics", "block_semantics"]) {
    if (rows[key]?.runtime_execution !== false || rows[key]?.hermes_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} execution drift`);
  }
  if (rows.validation_command_check?.hermes_command_executes_now !== false) errors.push(`${binding.pack_id} validation command execution drift`);
  if (rows.harness_boundary_note?.runtime_execution !== false) errors.push(`${binding.pack_id} harness boundary runtime drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp893HermesEvidenceSweepCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP893_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp893HermesEvidenceSweepCoverage(planPack) {
  const binding = COMMERCIAL_CP893_PACK_BINDING;
  const requirements = COMMERCIAL_CP893_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  const summary = createCommercialCp893HermesEvidenceSweepCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp893HermesEvidenceSweepDescriptor(
  descriptor = createCommercialCp893HermesEvidenceSweepDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP893_PACK_BINDING;
  const requirements = COMMERCIAL_CP893_REQUIREMENTS;
  const caseSet = descriptor.hermes_evidence_sweep_case_set ?? createCommercialCp893HermesEvidenceSweepCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp893HermesEvidenceSweepDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp892HermesSemanticsDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.hermes_evidence_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be Hermes evidence descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.hermes_command_executes_now !== false || row.hermes_receipt_emitted !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} Hermes runtime receipt drift`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false) errors.push(`${binding.pack_id} ${key} must not include real data or secrets`);
      if (row.permission_summary_writes_decision !== false || row.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} ${key} summary write drift`);
    }
  }
  const tailRows = caseSet.sections?.["RP29.P08.M02"]?.rows ?? {};
  const primaryRows = caseSet.sections?.["RP29.P08.M03"]?.rows ?? {};
  const closeoutRows = caseSet.sections?.["RP29.P08.M10"]?.rows ?? {};
  if (tailRows.closeout_handoff?.runtime_execution !== false) errors.push(`${binding.pack_id} closeout handoff runtime drift`);
  if (tailRows.regression_receipt?.runtime_execution !== false) errors.push(`${binding.pack_id} regression receipt runtime drift`);
  if (tailRows.next_gate_readiness?.human_final_approval_required !== true) errors.push(`${binding.pack_id} next-gate readiness approval drift`);
  if (primaryRows.hermes_command_matrix?.hermes_command_executes_now !== false) errors.push(`${binding.pack_id} primary command matrix execution drift`);
  if (primaryRows.operator_summary?.real_client_data_included !== false) errors.push(`${binding.pack_id} operator summary real-data drift`);
  if (closeoutRows.hermes_command_matrix?.hermes_command_executes_now !== false) errors.push(`${binding.pack_id} closeout command matrix execution drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp894ReviewScopeBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP894_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp894ReviewScopeBridgeCoverage(planPack) {
  const binding = COMMERCIAL_CP894_PACK_BINDING;
  const requirements = COMMERCIAL_CP894_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp894ReviewScopeBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp894ReviewScopeBridgeDescriptor(
  descriptor = createCommercialCp894ReviewScopeBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP894_PACK_BINDING;
  const requirements = COMMERCIAL_CP894_REQUIREMENTS;
  const caseSet = descriptor.review_scope_bridge_case_set ?? createCommercialCp894ReviewScopeBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp894ReviewScopeBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp893HermesEvidenceSweepDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} must not include real data, secrets, or runtime receipts`);
      if (microId.startsWith("RP29.P08")) {
        if (row.hermes_evidence_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be Hermes evidence descriptor`);
        if (row.hermes_command_executes_now !== false || row.hermes_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} Hermes execution drift`);
        if (row.permission_summary_writes_decision !== false || row.audit_summary_writes_event !== false) errors.push(`${binding.pack_id} ${key} summary write drift`);
      } else {
        if (row.review_packet_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be review packet descriptor`);
        if (row.claude_is_final_approval !== false || row.human_final_approval_required !== true) errors.push(`${binding.pack_id} ${key} review authority drift`);
        if (row.command_rerun_executes !== false) errors.push(`${binding.pack_id} ${key} command rerun execution drift`);
      }
    }
  }
  const hermesTailRows = caseSet.sections?.["RP29.P08.M10"]?.rows ?? {};
  const scopeRows = caseSet.sections?.["RP29.P09.M00"]?.rows ?? {};
  const primaryRows = caseSet.sections?.["RP29.P09.M03"]?.rows ?? {};
  const lastRows = caseSet.sections?.["RP29.P09.M09"]?.rows ?? {};
  if (hermesTailRows.changed_file_receipt?.changed_file_receipt_contains_secret !== false) errors.push(`${binding.pack_id} changed-file receipt secret drift`);
  if (hermesTailRows.permission_summary_receipt?.permission_summary_writes_decision !== false) errors.push(`${binding.pack_id} permission summary write drift`);
  if (scopeRows.architecture_review_questions?.claude_review_question_descriptor !== true) errors.push(`${binding.pack_id} architecture review question descriptor drift`);
  if (scopeRows.permission_bypass_questions?.permission_bypass_question_descriptor !== true) errors.push(`${binding.pack_id} permission bypass question descriptor drift`);
  if (scopeRows.audit_completeness_questions?.audit_completeness_question_descriptor !== true) errors.push(`${binding.pack_id} audit completeness question descriptor drift`);
  if (primaryRows.command_rerun?.command_rerun_executes !== false) errors.push(`${binding.pack_id} command rerun must not execute`);
  if (lastRows.permission_bypass_questions?.permission_bypass_question_descriptor !== true) errors.push(`${binding.pack_id} final tail permission bypass descriptor drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.claude_packet?.promotes_claude_to_final_approval !== false) errors.push(`${binding.pack_id} Claude packet approval drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp895ReviewPacketTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP895_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp895ReviewPacketTailCoverage(planPack) {
  const binding = COMMERCIAL_CP895_PACK_BINDING;
  const requirements = COMMERCIAL_CP895_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp895ReviewPacketTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp895ReviewPacketTailDescriptor(
  descriptor = createCommercialCp895ReviewPacketTailDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP895_PACK_BINDING;
  const requirements = COMMERCIAL_CP895_REQUIREMENTS;
  const caseSet = descriptor.review_packet_tail_case_set ?? createCommercialCp895ReviewPacketTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp895ReviewPacketTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp894ReviewScopeBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.review_packet_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be review packet descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} must not include real data, secrets, or runtime receipts`);
      if (row.claude_is_final_approval !== false || row.human_final_approval_required !== true) errors.push(`${binding.pack_id} ${key} review authority drift`);
      if (row.command_rerun_executes !== false) errors.push(`${binding.pack_id} ${key} command rerun execution drift`);
    }
  }
  const rows = caseSet.sections?.["RP29.P09.M09"]?.rows ?? {};
  if (rows.audit_completeness_questions?.audit_completeness_question_descriptor !== true) errors.push(`${binding.pack_id} audit completeness descriptor drift`);
  if (rows.missing_test_questions?.missing_test_question_descriptor !== true) errors.push(`${binding.pack_id} missing-test descriptor drift`);
  if (rows.ui_leak_questions?.ui_leak_question_descriptor !== true) errors.push(`${binding.pack_id} UI leak descriptor drift`);
  if (rows.downstream_readiness_questions?.downstream_readiness_question_descriptor !== true) errors.push(`${binding.pack_id} downstream readiness descriptor drift`);
  if (rows.risk_register?.risk_register_descriptor !== true) errors.push(`${binding.pack_id} risk register descriptor drift`);
  if (rows.severity_taxonomy?.severity_taxonomy_descriptor !== true) errors.push(`${binding.pack_id} severity taxonomy descriptor drift`);
  if (rows.go_no_go_verdict_format?.go_no_go_verdict_descriptor !== true) errors.push(`${binding.pack_id} go/no-go descriptor drift`);
  if (rows.finding_routing_map?.finding_routing_map_descriptor !== true) errors.push(`${binding.pack_id} finding routing descriptor drift`);
  if (rows.human_approval_summary?.human_approval_summary_descriptor !== true) errors.push(`${binding.pack_id} human approval descriptor drift`);
  if (rows.claude_review_packet?.claude_review_packet_descriptor !== true) errors.push(`${binding.pack_id} Claude review packet descriptor drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.claude_packet?.promotes_claude_to_final_approval !== false) errors.push(`${binding.pack_id} Claude packet approval drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createCommercialCp896ReviewCloseoutHandoffCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(COMMERCIAL_CP896_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateCommercialCp896ReviewCloseoutHandoffCoverage(planPack) {
  const binding = COMMERCIAL_CP896_PACK_BINDING;
  const requirements = COMMERCIAL_CP896_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(`${binding.pack_id} plan pack is required`);
  if (planPack?.pack_id !== binding.pack_id) errors.push(`plan pack must be ${binding.pack_id}`);
  if (planPack?.risk_class !== binding.risk_class) errors.push(`${binding.pack_id} risk class drift`);
  if (planPack?.unit_count !== binding.unit_count) errors.push(`${binding.pack_id} unit count drift`);
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(`${binding.pack_id} first unit drift`);
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(`${binding.pack_id} last unit drift`);
  if (new Set(unitIds).size !== unitIds.length) errors.push(`${binding.pack_id} duplicate unit IDs`);
  if (units.some((unit) => unit.program_id !== "RP29")) errors.push(`${binding.pack_id} must only include RP29 units`);
  const summary = createCommercialCp896ReviewCloseoutHandoffCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[name] !== count) errors.push(`${binding.pack_id} ${name} deliverable distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[name] !== count) errors.push(`${binding.pack_id} ${name} phase distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[name] !== count) errors.push(`${binding.pack_id} ${name} micro distribution drift`);
  }
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[name] !== count) errors.push(`${binding.pack_id} ${name} title distribution drift`);
  }
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
    }
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateCommercialCp896ReviewCloseoutHandoffDescriptor(
  descriptor = createCommercialCp896ReviewCloseoutHandoffDescriptor(),
  contractProjection = {},
) {
  const binding = COMMERCIAL_CP896_PACK_BINDING;
  const requirements = COMMERCIAL_CP896_REQUIREMENTS;
  const caseSet = descriptor.review_closeout_handoff_case_set ?? createCommercialCp896ReviewCloseoutHandoffCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "CommercialCp896ReviewCloseoutHandoffDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "CommercialCp895ReviewPacketTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (descriptor.authority_boundary?.runtime_opening_pack_id !== binding.next_pack_id) errors.push(`${binding.pack_id} runtime opening pack drift`);
  if (caseSet.row_count !== binding.unit_count) errors.push(`${binding.pack_id} case row count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const rows = caseSet.sections?.[microId]?.rows ?? {};
    for (const title of titles) {
      const key = commercialRowKey(title);
      const row = rows[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.review_packet_descriptor !== true) errors.push(`${binding.pack_id} ${key} must be review packet descriptor`);
      if (row.runtime_execution !== false || row.permission_decision_written !== false || row.audit_event_written !== false) errors.push(`${binding.pack_id} ${key} must remain no-runtime/no-write`);
      if (row.real_client_data_included !== false || row.credential_or_secret_included !== false || row.runtime_receipt_emitted !== false) errors.push(`${binding.pack_id} ${key} must not include real data, secrets, or runtime receipts`);
      if (row.claude_is_final_approval !== false || row.human_final_approval_required !== true) errors.push(`${binding.pack_id} ${key} review authority drift`);
      if (row.command_rerun_executes !== false) errors.push(`${binding.pack_id} ${key} command rerun execution drift`);
    }
  }
  const closeoutRows = caseSet.sections?.["RP29.P09.M09"]?.rows ?? {};
  const handoffRows = caseSet.sections?.["RP29.P09.M10"]?.rows ?? {};
  if (closeoutRows.closeout_criteria?.closeout_criteria_descriptor !== true) errors.push(`${binding.pack_id} closeout criteria descriptor drift`);
  if (closeoutRows.pass_closeout_note?.pass_closeout_note_descriptor !== true) errors.push(`${binding.pack_id} PASS closeout note descriptor drift`);
  if (closeoutRows.pass_with_findings_closeout_note?.pass_with_findings_closeout_note_descriptor !== true) errors.push(`${binding.pack_id} PASS_WITH_FINDINGS closeout note descriptor drift`);
  if (closeoutRows.block_closeout_note?.block_closeout_note_descriptor !== true) errors.push(`${binding.pack_id} BLOCK closeout note descriptor drift`);
  if (closeoutRows.next_rp_dependency?.next_rp_dependency_descriptor !== true) errors.push(`${binding.pack_id} next RP dependency descriptor drift`);
  if (closeoutRows.documentation_update?.documentation_update_descriptor !== true) errors.push(`${binding.pack_id} documentation update descriptor drift`);
  if (closeoutRows.command_rerun?.command_rerun_executes !== false) errors.push(`${binding.pack_id} command rerun must not execute`);
  if (handoffRows.architecture_review_questions?.claude_review_question_descriptor !== true) errors.push(`${binding.pack_id} architecture review question descriptor drift`);
  if (handoffRows.security_review_questions?.claude_review_question_descriptor !== true) errors.push(`${binding.pack_id} security review question descriptor drift`);
  if (handoffRows.permission_bypass_questions?.permission_bypass_question_descriptor !== true) errors.push(`${binding.pack_id} permission bypass descriptor drift`);
  if (handoffRows.audit_completeness_questions?.audit_completeness_question_descriptor !== true) errors.push(`${binding.pack_id} audit completeness descriptor drift`);
  if (handoffRows.risk_register?.risk_register_descriptor !== true) errors.push(`${binding.pack_id} risk register descriptor drift`);
  errors.push(...validateCommercialServiceMatrix(binding, descriptor.service_matrix));
  errors.push(...validateCommercialSyntheticFixtureMatrix(binding, descriptor.synthetic_fixture_matrix));
  const interfaceValidation = validateCommercialInterfaceContract(descriptor.interface_contract);
  if (!interfaceValidation.valid) errors.push(...interfaceValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const uiValidation = validateCommercialUiSurfaceMatrix(descriptor.ui_surface_matrix);
  if (!uiValidation.valid) errors.push(...uiValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const fixtureValidation = validateCommercialUiFixtureGoldenCaseMatrix(descriptor.ui_fixture_golden_case_matrix);
  if (!fixtureValidation.valid) errors.push(...fixtureValidation.errors.map((error) => `${binding.pack_id} ${error}`));
  const modelValidation = validateCommercialModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.claude_packet?.promotes_claude_to_final_approval !== false) errors.push(`${binding.pack_id} Claude packet approval drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  for (const capability of requirements.required_capabilities) {
    if (!descriptor.required_capabilities?.includes(capability)) errors.push(`${binding.pack_id} descriptor missing capability ${capability}`);
  }
  for (const gate of requirements.safety_gates) {
    if (!descriptor.safety_gates?.includes(gate)) errors.push(`${binding.pack_id} descriptor missing safety gate ${gate}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function validateCommercialReadinessContract(contract = {}, planPack) {
  const errors = [];
  if (contract.schema_version !== "law-firm-os.commercial-readiness-contract.v0.1") errors.push("schema_version mismatch");
  if (contract.program_contract?.program_id !== "RP29") errors.push("program contract must be RP29");
  if (contract.latest_pack?.pack_id !== COMMERCIAL_CP896_PACK_BINDING.pack_id) errors.push("latest pack must be CP00-896");
  if (contract.latest_projection?.descriptor !== "CommercialCp896ReviewCloseoutHandoffDescriptor") errors.push("latest projection descriptor drift");
  if (contract.validation?.valid !== true) errors.push("contract validation marker must be true");
  for (const artifact of COMMERCIAL_CP896_REQUIREMENTS.mandatory_artifacts) {
    if (!contract.mandatory_artifacts?.includes(artifact)) errors.push(`contract missing mandatory artifact ${artifact}`);
  }
  for (const guard of COMMERCIAL_CP896_REQUIREMENTS.required_no_leak_guards) {
    if (!contract.no_leak_guards?.includes(guard)) errors.push(`contract missing no-leak guard ${guard}`);
  }
  const coverage = validateCommercialCp896ReviewCloseoutHandoffCoverage(planPack);
  if (!coverage.valid) errors.push(...coverage.errors);
  const descriptorValidation = validateCommercialCp896ReviewCloseoutHandoffDescriptor(undefined, contract);
  if (!descriptorValidation.valid) errors.push(...descriptorValidation.errors);
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    coverage,
    descriptor: descriptorValidation,
  });
}
