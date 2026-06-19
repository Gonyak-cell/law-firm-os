import { validateMarketplaceModelRegistry } from "./model.js";
import {
  MARKETPLACE_CP845_PACK_BINDING,
  MARKETPLACE_CP845_REQUIREMENTS,
  MARKETPLACE_CP846_PACK_BINDING,
  MARKETPLACE_CP846_REQUIREMENTS,
  MARKETPLACE_CP847_PACK_BINDING,
  MARKETPLACE_CP847_REQUIREMENTS,
  MARKETPLACE_CP848_PACK_BINDING,
  MARKETPLACE_CP848_REQUIREMENTS,
  MARKETPLACE_CP849_PACK_BINDING,
  MARKETPLACE_CP849_REQUIREMENTS,
  MARKETPLACE_CP850_PACK_BINDING,
  MARKETPLACE_CP850_REQUIREMENTS,
  MARKETPLACE_CP851_PACK_BINDING,
  MARKETPLACE_CP851_REQUIREMENTS,
  MARKETPLACE_CP852_PACK_BINDING,
  MARKETPLACE_CP852_REQUIREMENTS,
  MARKETPLACE_CP853_PACK_BINDING,
  MARKETPLACE_CP853_REQUIREMENTS,
  MARKETPLACE_CP854_PACK_BINDING,
  MARKETPLACE_CP854_REQUIREMENTS,
  MARKETPLACE_CP855_PACK_BINDING,
  MARKETPLACE_CP855_REQUIREMENTS,
  MARKETPLACE_CP856_PACK_BINDING,
  MARKETPLACE_CP856_REQUIREMENTS,
  MARKETPLACE_CP857_PACK_BINDING,
  MARKETPLACE_CP857_REQUIREMENTS,
  MARKETPLACE_CP858_PACK_BINDING,
  MARKETPLACE_CP858_REQUIREMENTS,
  MARKETPLACE_CP859_PACK_BINDING,
  MARKETPLACE_CP859_REQUIREMENTS,
  MARKETPLACE_CP860_PACK_BINDING,
  MARKETPLACE_CP860_REQUIREMENTS,
  MARKETPLACE_CP861_PACK_BINDING,
  MARKETPLACE_CP861_REQUIREMENTS,
  MARKETPLACE_CP862_PACK_BINDING,
  MARKETPLACE_CP862_REQUIREMENTS,
  MARKETPLACE_CP863_PACK_BINDING,
  MARKETPLACE_CP863_REQUIREMENTS,
  MARKETPLACE_CP864_PACK_BINDING,
  MARKETPLACE_CP864_REQUIREMENTS,
  MARKETPLACE_CP865_PACK_BINDING,
  MARKETPLACE_CP865_REQUIREMENTS,
  MARKETPLACE_CP866_PACK_BINDING,
  MARKETPLACE_CP866_REQUIREMENTS,
  MARKETPLACE_CP867_PACK_BINDING,
  MARKETPLACE_CP867_REQUIREMENTS,
  MARKETPLACE_CP868_PACK_BINDING,
  MARKETPLACE_CP868_REQUIREMENTS,
  MARKETPLACE_CP869_PACK_BINDING,
  MARKETPLACE_CP869_REQUIREMENTS,
  MARKETPLACE_CP870_PACK_BINDING,
  MARKETPLACE_CP870_REQUIREMENTS,
  MARKETPLACE_CP871_PACK_BINDING,
  MARKETPLACE_CP871_REQUIREMENTS,
  MARKETPLACE_CP872_PACK_BINDING,
  MARKETPLACE_CP872_REQUIREMENTS,
  MARKETPLACE_NO_WRITE_ATTESTATION,
  MARKETPLACE_PROGRAM_CONTRACT,
  createMarketplaceCp846DomainCustomAiReviewGateCaseSet,
  createMarketplaceCp846DomainCustomAiReviewGateDescriptor,
  createMarketplaceCp847ReviewGatePermissionRelationshipCaseSet,
  createMarketplaceCp847ReviewGatePermissionRelationshipDescriptor,
  createMarketplaceCp848InstallReceiptSubmissionReviewCaseSet,
  createMarketplaceCp848InstallReceiptSubmissionReviewDescriptor,
  createMarketplaceCp849SubmissionReviewWorkflowCaseSet,
  createMarketplaceCp849SubmissionReviewWorkflowDescriptor,
  createMarketplaceCp850PermissionAuditFixtureCaseSet,
  createMarketplaceCp850PermissionAuditFixtureDescriptor,
  createMarketplaceCp851FixtureGoldenCaseSet,
  createMarketplaceCp851FixtureGoldenCaseDescriptor,
  createMarketplaceCp852GoldenCaseValidationCaseSet,
  createMarketplaceCp852GoldenCaseValidationDescriptor,
  createMarketplaceCp853EvidenceReviewPacketCaseSet,
  createMarketplaceCp853EvidenceReviewPacketDescriptor,
  createMarketplaceCp854CloseoutAppRegistryCaseSet,
  createMarketplaceCp854CloseoutAppRegistryDescriptor,
  createMarketplaceCp855ApiUiFoundationCaseSet,
  createMarketplaceCp855ApiUiFoundationDescriptor,
  createMarketplaceCp856UiPermissionBindingCaseSet,
  createMarketplaceCp856UiPermissionBindingDescriptor,
  createMarketplaceCp857UiFixtureTransitionCaseSet,
  createMarketplaceCp857UiFixtureTransitionDescriptor,
  createMarketplaceCp858UiFixtureGoldenCaseSet,
  createMarketplaceCp858UiFixtureGoldenCaseDescriptor,
  createMarketplaceCp859FixtureSecurityTestCaseSet,
  createMarketplaceCp859FixtureSecurityTestDescriptor,
  createMarketplaceCp860FixturePermissionMatrixBridgeCaseSet,
  createMarketplaceCp860FixturePermissionMatrixBridgeDescriptor,
  createMarketplaceCp861PermissionDecisionMatrixCaseSet,
  createMarketplaceCp861PermissionDecisionMatrixDescriptor,
  createMarketplaceCp862PermissionDecisionEvidenceBridgeCaseSet,
  createMarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor,
  createMarketplaceCp863FailureRecoveryFoundationBridgeCaseSet,
  createMarketplaceCp863FailureRecoveryFoundationBridgeDescriptor,
  createMarketplaceCp864FailureRecoveryPermissionAuditBridgeCaseSet,
  createMarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor,
  createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeCaseSet,
  createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor,
  createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeCaseSet,
  createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor,
  createMarketplaceCp867EvidenceReviewImplementationBridgeCaseSet,
  createMarketplaceCp867EvidenceReviewImplementationBridgeDescriptor,
  createMarketplaceCp868EvidenceReviewPermissionAuditBridgeCaseSet,
  createMarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor,
  createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeCaseSet,
  createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor,
  createMarketplaceCp870ClaudeReviewPermissionAuditBridgeCaseSet,
  createMarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor,
  createMarketplaceCp871ClaudeReviewFixtureTransitionCaseSet,
  createMarketplaceCp871ClaudeReviewFixtureTransitionDescriptor,
  createMarketplaceCp872ClaudeReviewCloseoutHandoffCaseSet,
  createMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor,
  createMarketplaceCp845ScopeDomainFoundationCaseSet,
  createMarketplaceCp845ScopeDomainFoundationDescriptor,
  marketplaceRowKey,
} from "./registry.js";

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
    no_write_attestation: MARKETPLACE_NO_WRITE_ATTESTATION,
  });
}

export function createMarketplaceCp845ScopeDomainFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP845_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp845ScopeDomainFoundationCoverage(planPack) {
  const binding = MARKETPLACE_CP845_PACK_BINDING;
  const requirements = MARKETPLACE_CP845_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp845ScopeDomainFoundationCoverageSummary(planPack);
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

export function validateMarketplaceCp845ScopeDomainFoundationDescriptor(
  descriptor = createMarketplaceCp845ScopeDomainFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP845_PACK_BINDING;
  const requirements = MARKETPLACE_CP845_REQUIREMENTS;
  const caseSet = descriptor.scope_domain_foundation_case_set ?? createMarketplaceCp845ScopeDomainFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp845ScopeDomainFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
  if (descriptor.program_contract?.upstream_program_id !== "RP27") errors.push(`${binding.pack_id} upstream program drift`);
  if (descriptor.program_contract?.downstream_program_id !== "RP29") errors.push(`${binding.pack_id} downstream program drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp846DomainCustomAiReviewGateCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP846_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp846DomainCustomAiReviewGateCoverage(planPack) {
  const binding = MARKETPLACE_CP846_PACK_BINDING;
  const requirements = MARKETPLACE_CP846_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp846DomainCustomAiReviewGateCoverageSummary(planPack);
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

export function validateMarketplaceCp846DomainCustomAiReviewGateDescriptor(
  descriptor = createMarketplaceCp846DomainCustomAiReviewGateDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP846_PACK_BINDING;
  const requirements = MARKETPLACE_CP846_REQUIREMENTS;
  const caseSet = descriptor.domain_custom_ai_review_gate_case_set ?? createMarketplaceCp846DomainCustomAiReviewGateCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp846DomainCustomAiReviewGateDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp845ScopeDomainFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp847ReviewGatePermissionRelationshipCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP847_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp847ReviewGatePermissionRelationshipCoverage(planPack) {
  const binding = MARKETPLACE_CP847_PACK_BINDING;
  const requirements = MARKETPLACE_CP847_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp847ReviewGatePermissionRelationshipCoverageSummary(planPack);
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

export function validateMarketplaceCp847ReviewGatePermissionRelationshipDescriptor(
  descriptor = createMarketplaceCp847ReviewGatePermissionRelationshipDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP847_PACK_BINDING;
  const requirements = MARKETPLACE_CP847_REQUIREMENTS;
  const caseSet = descriptor.review_gate_permission_relationship_case_set ?? createMarketplaceCp847ReviewGatePermissionRelationshipCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp847ReviewGatePermissionRelationshipDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp846DomainCustomAiReviewGateDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp848InstallReceiptSubmissionReviewCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP848_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp848InstallReceiptSubmissionReviewCoverage(planPack) {
  const binding = MARKETPLACE_CP848_PACK_BINDING;
  const requirements = MARKETPLACE_CP848_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp848InstallReceiptSubmissionReviewCoverageSummary(planPack);
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

export function validateMarketplaceCp848InstallReceiptSubmissionReviewDescriptor(
  descriptor = createMarketplaceCp848InstallReceiptSubmissionReviewDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP848_PACK_BINDING;
  const requirements = MARKETPLACE_CP848_REQUIREMENTS;
  const caseSet = descriptor.install_receipt_submission_review_case_set ?? createMarketplaceCp848InstallReceiptSubmissionReviewCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp848InstallReceiptSubmissionReviewDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp847ReviewGatePermissionRelationshipDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp849SubmissionReviewWorkflowCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP849_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp849SubmissionReviewWorkflowCoverage(planPack) {
  const binding = MARKETPLACE_CP849_PACK_BINDING;
  const requirements = MARKETPLACE_CP849_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp849SubmissionReviewWorkflowCoverageSummary(planPack);
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

export function validateMarketplaceCp849SubmissionReviewWorkflowDescriptor(
  descriptor = createMarketplaceCp849SubmissionReviewWorkflowDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP849_PACK_BINDING;
  const requirements = MARKETPLACE_CP849_REQUIREMENTS;
  const caseSet = descriptor.submission_review_workflow_case_set ?? createMarketplaceCp849SubmissionReviewWorkflowCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp849SubmissionReviewWorkflowDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp848InstallReceiptSubmissionReviewDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp850PermissionAuditFixtureCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP850_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp850PermissionAuditFixtureCoverage(planPack) {
  const binding = MARKETPLACE_CP850_PACK_BINDING;
  const requirements = MARKETPLACE_CP850_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp850PermissionAuditFixtureCoverageSummary(planPack);
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

export function validateMarketplaceCp850PermissionAuditFixtureDescriptor(
  descriptor = createMarketplaceCp850PermissionAuditFixtureDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP850_PACK_BINDING;
  const requirements = MARKETPLACE_CP850_REQUIREMENTS;
  const caseSet = descriptor.permission_audit_fixture_case_set ?? createMarketplaceCp850PermissionAuditFixtureCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp850PermissionAuditFixtureDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp849SubmissionReviewWorkflowDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp851FixtureGoldenCaseCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP851_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp851FixtureGoldenCaseCoverage(planPack) {
  const binding = MARKETPLACE_CP851_PACK_BINDING;
  const requirements = MARKETPLACE_CP851_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp851FixtureGoldenCaseCoverageSummary(planPack);
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

export function validateMarketplaceCp851FixtureGoldenCaseDescriptor(
  descriptor = createMarketplaceCp851FixtureGoldenCaseDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP851_PACK_BINDING;
  const requirements = MARKETPLACE_CP851_REQUIREMENTS;
  const caseSet = descriptor.fixture_golden_case_set ?? createMarketplaceCp851FixtureGoldenCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp851FixtureGoldenCaseDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp850PermissionAuditFixtureDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp852GoldenCaseValidationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP852_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp852GoldenCaseValidationCoverage(planPack) {
  const binding = MARKETPLACE_CP852_PACK_BINDING;
  const requirements = MARKETPLACE_CP852_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp852GoldenCaseValidationCoverageSummary(planPack);
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

export function validateMarketplaceCp852GoldenCaseValidationDescriptor(
  descriptor = createMarketplaceCp852GoldenCaseValidationDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP852_PACK_BINDING;
  const requirements = MARKETPLACE_CP852_REQUIREMENTS;
  const caseSet = descriptor.golden_case_validation_case_set ?? createMarketplaceCp852GoldenCaseValidationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp852GoldenCaseValidationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp851FixtureGoldenCaseDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp853EvidenceReviewPacketCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP853_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp853EvidenceReviewPacketCoverage(planPack) {
  const binding = MARKETPLACE_CP853_PACK_BINDING;
  const requirements = MARKETPLACE_CP853_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp853EvidenceReviewPacketCoverageSummary(planPack);
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

export function validateMarketplaceCp853EvidenceReviewPacketDescriptor(
  descriptor = createMarketplaceCp853EvidenceReviewPacketDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP853_PACK_BINDING;
  const requirements = MARKETPLACE_CP853_REQUIREMENTS;
  const caseSet = descriptor.evidence_review_packet_case_set ?? createMarketplaceCp853EvidenceReviewPacketCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp853EvidenceReviewPacketDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp852GoldenCaseValidationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp854CloseoutAppRegistryCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP854_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp854CloseoutAppRegistryCoverage(planPack) {
  const binding = MARKETPLACE_CP854_PACK_BINDING;
  const requirements = MARKETPLACE_CP854_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp854CloseoutAppRegistryCoverageSummary(planPack);
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

export function validateMarketplaceCp854CloseoutAppRegistryDescriptor(
  descriptor = createMarketplaceCp854CloseoutAppRegistryDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP854_PACK_BINDING;
  const requirements = MARKETPLACE_CP854_REQUIREMENTS;
  const caseSet = descriptor.closeout_app_registry_case_set ?? createMarketplaceCp854CloseoutAppRegistryCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp854CloseoutAppRegistryDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp853EvidenceReviewPacketDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp855ApiUiFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP855_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp855ApiUiFoundationCoverage(planPack) {
  const binding = MARKETPLACE_CP855_PACK_BINDING;
  const requirements = MARKETPLACE_CP855_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp855ApiUiFoundationCoverageSummary(planPack);
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

export function validateMarketplaceCp855ApiUiFoundationDescriptor(
  descriptor = createMarketplaceCp855ApiUiFoundationDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP855_PACK_BINDING;
  const requirements = MARKETPLACE_CP855_REQUIREMENTS;
  const caseSet = descriptor.api_ui_foundation_case_set ?? createMarketplaceCp855ApiUiFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp855ApiUiFoundationDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp854CloseoutAppRegistryDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp856UiPermissionBindingCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP856_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp856UiPermissionBindingCoverage(planPack) {
  const binding = MARKETPLACE_CP856_PACK_BINDING;
  const requirements = MARKETPLACE_CP856_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp856UiPermissionBindingCoverageSummary(planPack);
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

export function validateMarketplaceCp856UiPermissionBindingDescriptor(
  descriptor = createMarketplaceCp856UiPermissionBindingDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP856_PACK_BINDING;
  const requirements = MARKETPLACE_CP856_REQUIREMENTS;
  const caseSet = descriptor.ui_permission_binding_case_set ?? createMarketplaceCp856UiPermissionBindingCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp856UiPermissionBindingDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp855ApiUiFoundationDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp857UiFixtureTransitionCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP857_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp857UiFixtureTransitionCoverage(planPack) {
  const binding = MARKETPLACE_CP857_PACK_BINDING;
  const requirements = MARKETPLACE_CP857_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp857UiFixtureTransitionCoverageSummary(planPack);
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

export function validateMarketplaceCp857UiFixtureTransitionDescriptor(
  descriptor = createMarketplaceCp857UiFixtureTransitionDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP857_PACK_BINDING;
  const requirements = MARKETPLACE_CP857_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_transition_case_set ?? createMarketplaceCp857UiFixtureTransitionCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp857UiFixtureTransitionDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp856UiPermissionBindingDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp858UiFixtureGoldenCaseCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP858_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp858UiFixtureGoldenCaseCoverage(planPack) {
  const binding = MARKETPLACE_CP858_PACK_BINDING;
  const requirements = MARKETPLACE_CP858_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp858UiFixtureGoldenCaseCoverageSummary(planPack);
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

export function validateMarketplaceCp858UiFixtureGoldenCaseDescriptor(
  descriptor = createMarketplaceCp858UiFixtureGoldenCaseDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP858_PACK_BINDING;
  const requirements = MARKETPLACE_CP858_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_golden_case_set ?? createMarketplaceCp858UiFixtureGoldenCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp858UiFixtureGoldenCaseDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp857UiFixtureTransitionDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp859FixtureSecurityTestCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP859_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp859FixtureSecurityTestCoverage(planPack) {
  const binding = MARKETPLACE_CP859_PACK_BINDING;
  const requirements = MARKETPLACE_CP859_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp859FixtureSecurityTestCoverageSummary(planPack);
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

export function validateMarketplaceCp859FixtureSecurityTestDescriptor(
  descriptor = createMarketplaceCp859FixtureSecurityTestDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP859_PACK_BINDING;
  const requirements = MARKETPLACE_CP859_REQUIREMENTS;
  const caseSet = descriptor.fixture_security_test_case_set ?? createMarketplaceCp859FixtureSecurityTestCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp859FixtureSecurityTestDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp858UiFixtureGoldenCaseDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp860FixturePermissionMatrixBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP860_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp860FixturePermissionMatrixBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP860_PACK_BINDING;
  const requirements = MARKETPLACE_CP860_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp860FixturePermissionMatrixBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp860FixturePermissionMatrixBridgeDescriptor(
  descriptor = createMarketplaceCp860FixturePermissionMatrixBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP860_PACK_BINDING;
  const requirements = MARKETPLACE_CP860_REQUIREMENTS;
  const caseSet = descriptor.fixture_permission_matrix_bridge_case_set ?? createMarketplaceCp860FixturePermissionMatrixBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp860FixturePermissionMatrixBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp859FixtureSecurityTestDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp861PermissionDecisionMatrixCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP861_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp861PermissionDecisionMatrixCoverage(planPack) {
  const binding = MARKETPLACE_CP861_PACK_BINDING;
  const requirements = MARKETPLACE_CP861_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp861PermissionDecisionMatrixCoverageSummary(planPack);
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

export function validateMarketplaceCp861PermissionDecisionMatrixDescriptor(
  descriptor = createMarketplaceCp861PermissionDecisionMatrixDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP861_PACK_BINDING;
  const requirements = MARKETPLACE_CP861_REQUIREMENTS;
  const caseSet = descriptor.permission_decision_matrix_case_set ?? createMarketplaceCp861PermissionDecisionMatrixCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp861PermissionDecisionMatrixDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp860FixturePermissionMatrixBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp862PermissionDecisionEvidenceBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP862_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp862PermissionDecisionEvidenceBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP862_PACK_BINDING;
  const requirements = MARKETPLACE_CP862_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp862PermissionDecisionEvidenceBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor(
  descriptor = createMarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP862_PACK_BINDING;
  const requirements = MARKETPLACE_CP862_REQUIREMENTS;
  const caseSet = descriptor.permission_decision_evidence_bridge_case_set ?? createMarketplaceCp862PermissionDecisionEvidenceBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp861PermissionDecisionMatrixDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp863FailureRecoveryFoundationBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP863_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp863FailureRecoveryFoundationBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP863_PACK_BINDING;
  const requirements = MARKETPLACE_CP863_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp863FailureRecoveryFoundationBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp863FailureRecoveryFoundationBridgeDescriptor(
  descriptor = createMarketplaceCp863FailureRecoveryFoundationBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP863_PACK_BINDING;
  const requirements = MARKETPLACE_CP863_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_foundation_bridge_case_set ?? createMarketplaceCp863FailureRecoveryFoundationBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp863FailureRecoveryFoundationBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp862PermissionDecisionEvidenceBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp864FailureRecoveryPermissionAuditBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP864_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp864FailureRecoveryPermissionAuditBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP864_PACK_BINDING;
  const requirements = MARKETPLACE_CP864_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp864FailureRecoveryPermissionAuditBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor(
  descriptor = createMarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP864_PACK_BINDING;
  const requirements = MARKETPLACE_CP864_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_permission_audit_bridge_case_set ?? createMarketplaceCp864FailureRecoveryPermissionAuditBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp863FailureRecoveryFoundationBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP865_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp865FailureRecoveryFixtureTransitionBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP865_PACK_BINDING;
  const requirements = MARKETPLACE_CP865_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor(
  descriptor = createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP865_PACK_BINDING;
  const requirements = MARKETPLACE_CP865_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_fixture_transition_bridge_case_set ?? createMarketplaceCp865FailureRecoveryFixtureTransitionBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp864FailureRecoveryPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP866_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp866FailureRecoveryEvidenceReviewBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP866_PACK_BINDING;
  const requirements = MARKETPLACE_CP866_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor(
  descriptor = createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP866_PACK_BINDING;
  const requirements = MARKETPLACE_CP866_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_evidence_review_bridge_case_set ?? createMarketplaceCp866FailureRecoveryEvidenceReviewBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp865FailureRecoveryFixtureTransitionBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp867EvidenceReviewImplementationBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP867_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp867EvidenceReviewImplementationBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP867_PACK_BINDING;
  const requirements = MARKETPLACE_CP867_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp867EvidenceReviewImplementationBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp867EvidenceReviewImplementationBridgeDescriptor(
  descriptor = createMarketplaceCp867EvidenceReviewImplementationBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP867_PACK_BINDING;
  const requirements = MARKETPLACE_CP867_REQUIREMENTS;
  const caseSet = descriptor.evidence_review_implementation_bridge_case_set ?? createMarketplaceCp867EvidenceReviewImplementationBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp867EvidenceReviewImplementationBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp866FailureRecoveryEvidenceReviewBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp868EvidenceReviewPermissionAuditBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP868_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp868EvidenceReviewPermissionAuditBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP868_PACK_BINDING;
  const requirements = MARKETPLACE_CP868_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp868EvidenceReviewPermissionAuditBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor(
  descriptor = createMarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP868_PACK_BINDING;
  const requirements = MARKETPLACE_CP868_REQUIREMENTS;
  const caseSet = descriptor.evidence_review_permission_audit_bridge_case_set ?? createMarketplaceCp868EvidenceReviewPermissionAuditBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp867EvidenceReviewImplementationBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP869_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP869_PACK_BINDING;
  const requirements = MARKETPLACE_CP869_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor(
  descriptor = createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP869_PACK_BINDING;
  const requirements = MARKETPLACE_CP869_REQUIREMENTS;
  const caseSet = descriptor.evidence_review_closeout_claude_bridge_case_set ?? createMarketplaceCp869EvidenceReviewCloseoutClaudeBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp868EvidenceReviewPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp870ClaudeReviewPermissionAuditBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP870_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp870ClaudeReviewPermissionAuditBridgeCoverage(planPack) {
  const binding = MARKETPLACE_CP870_PACK_BINDING;
  const requirements = MARKETPLACE_CP870_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp870ClaudeReviewPermissionAuditBridgeCoverageSummary(planPack);
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

export function validateMarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor(
  descriptor = createMarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP870_PACK_BINDING;
  const requirements = MARKETPLACE_CP870_REQUIREMENTS;
  const caseSet = descriptor.claude_review_permission_audit_bridge_case_set ?? createMarketplaceCp870ClaudeReviewPermissionAuditBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp869EvidenceReviewCloseoutClaudeBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp871ClaudeReviewFixtureTransitionCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP871_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp871ClaudeReviewFixtureTransitionCoverage(planPack) {
  const binding = MARKETPLACE_CP871_PACK_BINDING;
  const requirements = MARKETPLACE_CP871_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp871ClaudeReviewFixtureTransitionCoverageSummary(planPack);
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

export function validateMarketplaceCp871ClaudeReviewFixtureTransitionDescriptor(
  descriptor = createMarketplaceCp871ClaudeReviewFixtureTransitionDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP871_PACK_BINDING;
  const requirements = MARKETPLACE_CP871_REQUIREMENTS;
  const caseSet = descriptor.claude_review_fixture_transition_case_set ?? createMarketplaceCp871ClaudeReviewFixtureTransitionCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp871ClaudeReviewFixtureTransitionDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp870ClaudeReviewPermissionAuditBridgeDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMarketplaceCp872ClaudeReviewCloseoutHandoffCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MARKETPLACE_CP872_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMarketplaceCp872ClaudeReviewCloseoutHandoffCoverage(planPack) {
  const binding = MARKETPLACE_CP872_PACK_BINDING;
  const requirements = MARKETPLACE_CP872_REQUIREMENTS;
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
  if (units.some((unit) => unit.program_id !== "RP28")) errors.push(`${binding.pack_id} must only include RP28 units`);
  const summary = createMarketplaceCp872ClaudeReviewCloseoutHandoffCoverageSummary(planPack);
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

export function validateMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor(
  descriptor = createMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor(),
  contractProjection = {},
) {
  const binding = MARKETPLACE_CP872_PACK_BINDING;
  const requirements = MARKETPLACE_CP872_REQUIREMENTS;
  const caseSet = descriptor.claude_review_closeout_handoff_case_set ?? createMarketplaceCp872ClaudeReviewCloseoutHandoffCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor") errors.push(`${binding.pack_id} descriptor type drift`);
  if (descriptor.source_descriptor !== "MarketplaceCp871ClaudeReviewFixtureTransitionDescriptor") errors.push(`${binding.pack_id} source descriptor drift`);
  if (descriptor.program_contract?.program_id !== MARKETPLACE_PROGRAM_CONTRACT.program_id) errors.push(`${binding.pack_id} program id drift`);
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
      const key = marketplaceRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`${binding.pack_id} ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`${binding.pack_id} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`${binding.pack_id} ${key} must not execute runtime`);
      if (row.connector_secret_included !== false || row.oauth_token_included !== false || row.prompt_or_completion_payload_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include connector secrets, OAuth tokens, or prompt/completion payloads`);
      }
      if (row.real_client_data_included !== false || row.permission_decision_detail_included !== false || row.audit_event_body_included !== false) {
        errors.push(`${binding.pack_id} ${key} must not include real data, permission details, or audit bodies`);
      }
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (
    rows.some(
      (row) =>
        row.app_submission_executed === true ||
        row.permission_review_executed === true ||
        row.ai_app_policy_check_executed === true ||
        row.tenant_install_performed === true ||
        row.app_update_review_executed === true ||
        row.install_receipt_emitted === true ||
        row.connector_runtime_loaded === true ||
        row.custom_ai_app_runtime_executed === true,
    )
  ) {
    errors.push(`${binding.pack_id} must not open Marketplace runtime`);
  }
  if (rows.some((row) => row.permission_decision_written === true || row.audit_event_written === true || row.writes_product_state === true)) {
    errors.push(`${binding.pack_id} must not write permission, audit, or product state`);
  }
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate || descriptor.hermes_packet?.emits_runtime_receipt !== false) errors.push(`${binding.pack_id} Hermes packet drift`);
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(`${binding.pack_id} Claude packet drift`);
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(`${binding.pack_id} handoff drift`);
  const modelValidation = validateMarketplaceModelRegistry(descriptor.models);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);
  for (const name of ["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AppPermission", "InstallReceipt"]) {
    if (!descriptor.implemented_model_names?.includes(name)) errors.push(`${binding.pack_id} implemented model missing ${name}`);
  }
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(`${binding.pack_id} contract projection pack drift`);
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function validateMarketplaceCustomAiAppsContract(contract = {}, planPack) {
  const errors = [];
  if (contract.schema_version !== "law-firm-os.marketplace-custom-ai-apps-contract.v0.1") errors.push("schema_version mismatch");
  if (contract.program_contract?.program_id !== "RP28") errors.push("program contract must be RP28");
  if (contract.latest_pack?.pack_id !== MARKETPLACE_CP872_PACK_BINDING.pack_id) errors.push("latest pack must be CP00-872");
  if (contract.latest_projection?.descriptor !== "MarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor") errors.push("latest projection descriptor drift");
  if (contract.validation?.valid !== true) errors.push("contract validation marker must be true");
  for (const artifact of MARKETPLACE_CP872_REQUIREMENTS.mandatory_artifacts) {
    if (!contract.mandatory_artifacts?.includes(artifact)) errors.push(`contract missing mandatory artifact ${artifact}`);
  }
  for (const guard of MARKETPLACE_CP872_REQUIREMENTS.required_no_leak_guards) {
    if (!contract.no_leak_guards?.includes(guard)) errors.push(`contract missing no-leak guard ${guard}`);
  }
  const coverage = validateMarketplaceCp872ClaudeReviewCloseoutHandoffCoverage(planPack);
  if (!coverage.valid) errors.push(...coverage.errors);
  const descriptorValidation = validateMarketplaceCp872ClaudeReviewCloseoutHandoffDescriptor(undefined, contract);
  if (!descriptorValidation.valid) errors.push(...descriptorValidation.errors);
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    coverage,
    descriptor: descriptorValidation,
  });
}
