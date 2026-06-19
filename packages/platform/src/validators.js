import {
  PLATFORM_EXTENSIBILITY_CP820_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP820_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP821_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP821_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP822_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP822_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP823_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP823_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP824_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP824_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP825_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP825_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP826_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP826_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP827_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP827_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP828_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP828_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP829_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP829_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP830_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP830_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP831_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP831_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP832_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP832_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP833_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP833_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP834_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP834_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP835_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP835_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP836_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP836_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP837_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP837_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP838_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP838_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP839_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP839_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP840_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP841_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP842_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP843_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING,
  PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS,
  PLATFORM_EXTENSIBILITY_NO_WRITE_ATTESTATION,
  PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT,
  createPlatformExtensibilityCp821DomainPermissionAuditCloseoutCaseSet,
  createPlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor,
  createPlatformExtensibilityCp822IndexExportFixtureFoundationCaseSet,
  createPlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor,
  createPlatformExtensibilityCp823FixtureServiceBridgeCaseSet,
  createPlatformExtensibilityCp823FixtureServiceBridgeDescriptor,
  createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeCaseSet,
  createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor,
  createPlatformExtensibilityCp825PermissionAuditTailCaseSet,
  createPlatformExtensibilityCp825PermissionAuditTailDescriptor,
  createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeCaseSet,
  createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor,
  createPlatformExtensibilityCp827InterfacePermissionAuditBridgeCaseSet,
  createPlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor,
  createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationCaseSet,
  createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor,
  createPlatformExtensibilityCp829FixtureReviewUiBridgeCaseSet,
  createPlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor,
  createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeCaseSet,
  createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor,
  createPlatformExtensibilityCp831UiFixtureFoundationBridgeCaseSet,
  createPlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor,
  createPlatformExtensibilityCp832FixturePermissionMatrixBridgeCaseSet,
  createPlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor,
  createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeCaseSet,
  createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor,
  createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeCaseSet,
  createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor,
  createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeCaseSet,
  createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor,
  createPlatformExtensibilityCp836FailureFoundationTransitionBridgeCaseSet,
  createPlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor,
  createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeCaseSet,
  createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor,
  createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeCaseSet,
  createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor,
  createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeCaseSet,
  createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor,
  createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeCaseSet,
  createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor,
  createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeCaseSet,
  createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor,
  createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeCaseSet,
  createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor,
  createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeCaseSet,
  createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor,
  createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCaseSet,
  createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor,
  createPlatformExtensibilityCp820ScopeDomainFoundationCaseSet,
  createPlatformExtensibilityCp820ScopeDomainFoundationDescriptor,
  platformExtensibilityRowKey,
} from "./registry.js";
import { validatePlatformExtensibilityModelRegistry } from "./model.js";

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
    no_write_attestation: PLATFORM_EXTENSIBILITY_NO_WRITE_ATTESTATION,
  });
}

export function createPlatformExtensibilityCp820ScopeDomainFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP820_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp820ScopeDomainFoundationCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP820_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP820_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp820ScopeDomainFoundationCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp820ScopeDomainFoundationDescriptor(
  descriptor = createPlatformExtensibilityCp820ScopeDomainFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP820_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP820_REQUIREMENTS;
  const caseSet = descriptor.scope_domain_foundation_case_set ?? createPlatformExtensibilityCp820ScopeDomainFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp820ScopeDomainFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.program_contract?.upstream_program_id !== "RP26") errors.push(`${binding.pack_id} upstream program drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp821DomainPermissionAuditCloseoutCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP821_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp821DomainPermissionAuditCloseoutCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP821_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP821_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp821DomainPermissionAuditCloseoutCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor(
  descriptor = createPlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP821_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP821_REQUIREMENTS;
  const caseSet = descriptor.domain_permission_audit_closeout_case_set ?? createPlatformExtensibilityCp821DomainPermissionAuditCloseoutCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp820ScopeDomainFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp822IndexExportFixtureFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP822_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp822IndexExportFixtureFoundationCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP822_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP822_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp822IndexExportFixtureFoundationCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor(
  descriptor = createPlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP822_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP822_REQUIREMENTS;
  const caseSet = descriptor.index_export_fixture_foundation_case_set ?? createPlatformExtensibilityCp822IndexExportFixtureFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp821DomainPermissionAuditCloseoutDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp823FixtureServiceBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP823_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp823FixtureServiceBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP823_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP823_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp823FixtureServiceBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp823FixtureServiceBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp823FixtureServiceBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP823_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP823_REQUIREMENTS;
  const caseSet = descriptor.fixture_service_bridge_case_set ?? createPlatformExtensibilityCp823FixtureServiceBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp823FixtureServiceBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp822IndexExportFixtureFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP824_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp824ServiceTailPermissionAuditBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP824_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP824_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP824_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP824_REQUIREMENTS;
  const caseSet = descriptor.service_tail_permission_audit_bridge_case_set ?? createPlatformExtensibilityCp824ServiceTailPermissionAuditBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp823FixtureServiceBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp825PermissionAuditTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP825_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp825PermissionAuditTailCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP825_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP825_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp825PermissionAuditTailCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp825PermissionAuditTailDescriptor(
  descriptor = createPlatformExtensibilityCp825PermissionAuditTailDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP825_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP825_REQUIREMENTS;
  const caseSet = descriptor.permission_audit_tail_case_set ?? createPlatformExtensibilityCp825PermissionAuditTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp825PermissionAuditTailDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp824ServiceTailPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP826_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP826_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP826_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP826_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP826_REQUIREMENTS;
  const caseSet = descriptor.synthetic_fixture_interface_bridge_case_set ?? createPlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp825PermissionAuditTailDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp827InterfacePermissionAuditBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP827_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp827InterfacePermissionAuditBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP827_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP827_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp827InterfacePermissionAuditBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP827_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP827_REQUIREMENTS;
  const caseSet = descriptor.interface_permission_audit_bridge_case_set ?? createPlatformExtensibilityCp827InterfacePermissionAuditBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp826SyntheticFixtureInterfaceBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP828_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP828_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP828_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor(
  descriptor = createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP828_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP828_REQUIREMENTS;
  const caseSet =
    descriptor.interface_tail_synthetic_fixture_foundation_case_set ??
    createPlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp827InterfacePermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp829FixtureReviewUiBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP829_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp829FixtureReviewUiBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP829_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP829_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp829FixtureReviewUiBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP829_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP829_REQUIREMENTS;
  const caseSet = descriptor.fixture_review_ui_bridge_case_set ?? createPlatformExtensibilityCp829FixtureReviewUiBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp828InterfaceTailSyntheticFixtureFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP830_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp830UiPermissionAuditFixtureBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP830_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP830_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP830_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP830_REQUIREMENTS;
  const caseSet = descriptor.ui_permission_audit_fixture_bridge_case_set ?? createPlatformExtensibilityCp830UiPermissionAuditFixtureBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp829FixtureReviewUiBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp831UiFixtureFoundationBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP831_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp831UiFixtureFoundationBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP831_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP831_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp831UiFixtureFoundationBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP831_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP831_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_foundation_bridge_case_set ?? createPlatformExtensibilityCp831UiFixtureFoundationBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp830UiPermissionAuditFixtureBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp832FixturePermissionMatrixBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP832_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp832FixturePermissionMatrixBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP832_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP832_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp832FixturePermissionMatrixBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP832_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP832_REQUIREMENTS;
  const caseSet = descriptor.fixture_permission_matrix_bridge_case_set ?? createPlatformExtensibilityCp832FixturePermissionMatrixBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp831UiFixtureFoundationBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP833_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp833PermissionMatrixContractShapeBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP833_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP833_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP833_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP833_REQUIREMENTS;
  const caseSet =
    descriptor.permission_matrix_contract_shape_bridge_case_set ?? createPlatformExtensibilityCp833PermissionMatrixContractShapeBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp832FixturePermissionMatrixBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP834_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP834_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP834_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP834_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP834_REQUIREMENTS;
  const caseSet =
    descriptor.permission_matrix_runtime_workflow_bridge_case_set ?? createPlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp833PermissionMatrixContractShapeBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP835_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP835_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP835_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP835_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP835_REQUIREMENTS;
  const caseSet =
    descriptor.permission_matrix_closeout_handoff_bridge_case_set ?? createPlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp834PermissionMatrixRuntimeWorkflowBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp836FailureFoundationTransitionBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP836_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp836FailureFoundationTransitionBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP836_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP836_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp836FailureFoundationTransitionBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP836_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP836_REQUIREMENTS;
  const caseSet = descriptor.failure_foundation_transition_bridge_case_set ?? createPlatformExtensibilityCp836FailureFoundationTransitionBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp835PermissionMatrixCloseoutHandoffBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP837_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP837_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP837_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP837_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP837_REQUIREMENTS;
  const caseSet = descriptor.failure_evidence_command_matrix_bridge_case_set ?? createPlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp836FailureFoundationTransitionBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP838_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP838_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP838_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP838_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP838_REQUIREMENTS;
  const caseSet = descriptor.hermes_evidence_secondary_workflow_bridge_case_set ?? createPlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp837FailureEvidenceCommandMatrixBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP839_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP839_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP839_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP839_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP839_REQUIREMENTS;
  const caseSet =
    descriptor.hermes_evidence_permission_audit_fixture_bridge_case_set ?? createPlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp838HermesEvidenceSecondaryWorkflowBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP840_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP840_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP840_REQUIREMENTS;
  const caseSet =
    descriptor.hermes_evidence_claude_review_foundation_bridge_case_set ?? createPlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp839HermesEvidencePermissionAuditFixtureBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP841_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP841_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP841_REQUIREMENTS;
  const caseSet = descriptor.claude_review_permission_audit_bridge_case_set ?? createPlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp840HermesEvidenceClaudeReviewFoundationBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP842_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP842_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP842_REQUIREMENTS;
  const caseSet = descriptor.claude_closeout_synthetic_fixture_bridge_case_set ?? createPlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp841ClaudeReviewPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP843_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP843_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP843_REQUIREMENTS;
  const caseSet = descriptor.synthetic_fixture_review_question_bridge_case_set ?? createPlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp842ClaudeCloseoutSyntheticFixtureBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverage(planPack) {
  const binding = PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP27")) errors.push(`${binding.pack_id} must only include RP27 units`);
  const summary = createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverageSummary(planPack);
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
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(`${binding.pack_id} ${microId} missing row ${title}`);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor(
  descriptor = createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING;
  const requirements = PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS;
  const caseSet = descriptor.review_evidence_closeout_bridge_case_set ?? createPlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "PlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "PlatformExtensibilityCp843SyntheticFixtureReviewQuestionBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== PLATFORM_EXTENSIBILITY_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(`${binding.pack_id} must require human runtime approval`);
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(`${binding.pack_id} Claude must not be final approval`);
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(`${binding.pack_id} local validation must not claim enterprise trust`);
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(`${binding.pack_id} section count drift`);
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`${binding.pack_id} missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`${binding.pack_id} ${microId} row count drift`);
    for (const title of titles) {
      const key = platformExtensibilityRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.api_key_secret_included !== false || row.webhook_secret_included !== false || row.workflow_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include API key, webhook, or workflow payload secrets`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.api_key_issued === true || row.webhook_delivered === true || row.workflow_executed === true)) {
    errors.push(`${binding.pack_id} must not open Platform Extensibility runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validatePlatformExtensibilityModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function validatePlatformExtensibilityContract(contract = {}, planPack) {
  const errors = [];
  if (contract.schema_version !== "law-firm-os.platform-extensibility-contract.v0.1") errors.push("schema_version mismatch");
  if (contract.program_contract?.program_id !== "RP27") errors.push("program contract must be RP27");
  if (contract.latest_pack?.pack_id !== PLATFORM_EXTENSIBILITY_CP844_PACK_BINDING.pack_id) errors.push("latest pack must be CP00-844");
  if (contract.latest_projection?.descriptor !== "PlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor") errors.push("latest projection descriptor drift");
  if (contract.validation?.valid !== true) errors.push("contract validation marker must be true");
  for (const artifact of PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS.mandatory_artifacts) {
    if (!contract.mandatory_artifacts?.includes(artifact)) errors.push(`contract missing mandatory artifact ${artifact}`);
  }
  for (const guard of PLATFORM_EXTENSIBILITY_CP844_REQUIREMENTS.required_no_leak_guards) {
    if (!contract.no_leak_guards?.includes(guard)) errors.push(`contract missing no-leak guard ${guard}`);
  }
  const coverage = validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeCoverage(planPack);
  if (!coverage.valid) errors.push(...coverage.errors);
  const descriptorValidation = validatePlatformExtensibilityCp844ReviewEvidenceCloseoutBridgeDescriptor(undefined, contract);
  if (!descriptorValidation.valid) errors.push(...descriptorValidation.errors);
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    coverage,
    descriptor: descriptorValidation,
  });
}
