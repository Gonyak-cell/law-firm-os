import {
  MIGRATION_PLATFORM_CP756_PACK_BINDING,
  MIGRATION_PLATFORM_CP756_REQUIREMENTS,
  MIGRATION_PLATFORM_CP757_PACK_BINDING,
  MIGRATION_PLATFORM_CP757_REQUIREMENTS,
  MIGRATION_PLATFORM_CP758_PACK_BINDING,
  MIGRATION_PLATFORM_CP758_REQUIREMENTS,
  MIGRATION_PLATFORM_CP759_PACK_BINDING,
  MIGRATION_PLATFORM_CP759_REQUIREMENTS,
  MIGRATION_PLATFORM_CP760_PACK_BINDING,
  MIGRATION_PLATFORM_CP760_REQUIREMENTS,
  MIGRATION_PLATFORM_CP761_PACK_BINDING,
  MIGRATION_PLATFORM_CP761_REQUIREMENTS,
  MIGRATION_PLATFORM_CP762_PACK_BINDING,
  MIGRATION_PLATFORM_CP762_REQUIREMENTS,
  MIGRATION_PLATFORM_CP763_PACK_BINDING,
  MIGRATION_PLATFORM_CP763_REQUIREMENTS,
  MIGRATION_PLATFORM_CP764_PACK_BINDING,
  MIGRATION_PLATFORM_CP764_REQUIREMENTS,
  MIGRATION_PLATFORM_CP765_PACK_BINDING,
  MIGRATION_PLATFORM_CP765_REQUIREMENTS,
  MIGRATION_PLATFORM_CP766_PACK_BINDING,
  MIGRATION_PLATFORM_CP766_REQUIREMENTS,
  MIGRATION_PLATFORM_CP767_PACK_BINDING,
  MIGRATION_PLATFORM_CP767_REQUIREMENTS,
  MIGRATION_PLATFORM_CP768_PACK_BINDING,
  MIGRATION_PLATFORM_CP768_REQUIREMENTS,
  MIGRATION_PLATFORM_CP769_PACK_BINDING,
  MIGRATION_PLATFORM_CP769_REQUIREMENTS,
  MIGRATION_PLATFORM_CP770_PACK_BINDING,
  MIGRATION_PLATFORM_CP770_REQUIREMENTS,
  MIGRATION_PLATFORM_CP771_PACK_BINDING,
  MIGRATION_PLATFORM_CP771_REQUIREMENTS,
  MIGRATION_PLATFORM_CP772_PACK_BINDING,
  MIGRATION_PLATFORM_CP772_REQUIREMENTS,
  MIGRATION_PLATFORM_CP773_PACK_BINDING,
  MIGRATION_PLATFORM_CP773_REQUIREMENTS,
  MIGRATION_PLATFORM_CP774_PACK_BINDING,
  MIGRATION_PLATFORM_CP774_REQUIREMENTS,
  MIGRATION_PLATFORM_CP775_PACK_BINDING,
  MIGRATION_PLATFORM_CP775_REQUIREMENTS,
  MIGRATION_PLATFORM_CP776_PACK_BINDING,
  MIGRATION_PLATFORM_CP776_REQUIREMENTS,
  MIGRATION_PLATFORM_CP777_PACK_BINDING,
  MIGRATION_PLATFORM_CP777_REQUIREMENTS,
  MIGRATION_PLATFORM_CP778_PACK_BINDING,
  MIGRATION_PLATFORM_CP778_REQUIREMENTS,
  MIGRATION_PLATFORM_CP779_PACK_BINDING,
  MIGRATION_PLATFORM_CP779_REQUIREMENTS,
  MIGRATION_PLATFORM_CP780_PACK_BINDING,
  MIGRATION_PLATFORM_CP780_REQUIREMENTS,
  MIGRATION_PLATFORM_CP781_PACK_BINDING,
  MIGRATION_PLATFORM_CP781_REQUIREMENTS,
  MIGRATION_PLATFORM_CP782_PACK_BINDING,
  MIGRATION_PLATFORM_CP782_REQUIREMENTS,
  MIGRATION_PLATFORM_CP783_PACK_BINDING,
  MIGRATION_PLATFORM_CP783_REQUIREMENTS,
  MIGRATION_PLATFORM_CP784_PACK_BINDING,
  MIGRATION_PLATFORM_CP784_REQUIREMENTS,
  MIGRATION_PLATFORM_CP785_PACK_BINDING,
  MIGRATION_PLATFORM_CP785_REQUIREMENTS,
  MIGRATION_PLATFORM_CP786_PACK_BINDING,
  MIGRATION_PLATFORM_CP786_REQUIREMENTS,
  MIGRATION_PLATFORM_CP787_PACK_BINDING,
  MIGRATION_PLATFORM_CP787_REQUIREMENTS,
  MIGRATION_PLATFORM_NO_WRITE_ATTESTATION,
} from "./registry.js";
import {
  createMigrationPlatformCp756ScopeContractFoundationCaseSet,
  createMigrationPlatformCp756ScopeContractFoundationDescriptor,
  createMigrationPlatformCp757DomainImplementationCaseSet,
  createMigrationPlatformCp757DomainImplementationDescriptor,
  createMigrationPlatformCp758PermissionFixtureCaseSet,
  createMigrationPlatformCp758PermissionFixtureDescriptor,
  createMigrationPlatformCp759ServiceFoundationCaseSet,
  createMigrationPlatformCp759ServiceFoundationDescriptor,
  createMigrationPlatformCp760PrimaryServiceCaseSet,
  createMigrationPlatformCp760PrimaryServiceDescriptor,
  createMigrationPlatformCp761SecondaryServiceCaseSet,
  createMigrationPlatformCp761SecondaryServiceDescriptor,
  createMigrationPlatformCp762PermissionAuditServiceCaseSet,
  createMigrationPlatformCp762PermissionAuditServiceDescriptor,
  createMigrationPlatformCp763FixtureInterfaceFoundationCaseSet,
  createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor,
  createMigrationPlatformCp764InterfaceImplementationCaseSet,
  createMigrationPlatformCp764InterfaceImplementationDescriptor,
  createMigrationPlatformCp765InterfacePermissionFixtureCaseSet,
  createMigrationPlatformCp765InterfacePermissionFixtureDescriptor,
  createMigrationPlatformCp766InterfaceUiFoundationCaseSet,
  createMigrationPlatformCp766InterfaceUiFoundationDescriptor,
  createMigrationPlatformCp767UiWorkflowCaseSet,
  createMigrationPlatformCp767UiWorkflowDescriptor,
  createMigrationPlatformCp768UiPermissionFixtureCaseSet,
  createMigrationPlatformCp768UiPermissionFixtureDescriptor,
  createMigrationPlatformCp769UiFixtureFoundationCaseSet,
  createMigrationPlatformCp769UiFixtureFoundationDescriptor,
  createMigrationPlatformCp770FixtureImplementationCaseSet,
  createMigrationPlatformCp770FixtureImplementationDescriptor,
  createMigrationPlatformCp771FixturePermissionAuditCaseSet,
  createMigrationPlatformCp771FixturePermissionAuditDescriptor,
  createMigrationPlatformCp772SyntheticFixtureTailCaseSet,
  createMigrationPlatformCp772SyntheticFixtureTailDescriptor,
  createMigrationPlatformCp773FixtureEvidenceUiFoundationCaseSet,
  createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor,
  createMigrationPlatformCp774PermissionMatrixPrimaryCaseSet,
  createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor,
  createMigrationPlatformCp775PermissionMatrixWorkflowCaseSet,
  createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor,
  createMigrationPlatformCp776PermissionMatrixAuditBindingCaseSet,
  createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor,
  createMigrationPlatformCp777PermissionMatrixFixtureFoundationCaseSet,
  createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor,
  createMigrationPlatformCp778PermissionFixtureFailureFoundationCaseSet,
  createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor,
  createMigrationPlatformCp779FailureRecoveryPrimaryCaseSet,
  createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor,
  createMigrationPlatformCp780FailureRecoveryWorkflowCaseSet,
  createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor,
  createMigrationPlatformCp781FailureRecoveryAuditBindingCaseSet,
  createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor,
  createMigrationPlatformCp782FailureRecoveryAuditTailCaseSet,
  createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor,
  createMigrationPlatformCp783FailureRecoveryAuditCloseoutCaseSet,
  createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor,
  createMigrationPlatformCp784FailureFixtureReviewBridgeCaseSet,
  createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor,
  createMigrationPlatformCp785ReviewReceiptImplementationBridgeCaseSet,
  createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor,
  createMigrationPlatformCp786ReviewPacketRiskBridgeCaseSet,
  createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor,
  createMigrationPlatformCp787ReviewRiskCloseoutCaseSet,
  createMigrationPlatformCp787ReviewRiskCloseoutDescriptor,
  migrationPlatformRowKey,
} from "./service.js";

function countBy(units, field) {
  const counts = {};
  for (const unit of units) {
    const value = unit?.[field];
    if (value !== undefined) counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function freezeValidation(binding, result) {
  return Object.freeze({ ...result, pack_id: binding.pack_id, no_write_attestation: MIGRATION_PLATFORM_NO_WRITE_ATTESTATION });
}

export function createMigrationPlatformCp756ScopeContractFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP756_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp756ScopeContractFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP756_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP756_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp756ScopeContractFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp756ScopeContractFoundationDescriptor(descriptor = createMigrationPlatformCp756ScopeContractFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP756_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP756_REQUIREMENTS;
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createMigrationPlatformCp756ScopeContractFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp756ScopeContractFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp757DomainImplementationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP757_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp757DomainImplementationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP757_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP757_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp757DomainImplementationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp757DomainImplementationDescriptor(descriptor = createMigrationPlatformCp757DomainImplementationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP757_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP757_REQUIREMENTS;
  const caseSet = descriptor.domain_implementation_case_set ?? createMigrationPlatformCp757DomainImplementationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp757DomainImplementationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp758PermissionFixtureCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP758_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp758PermissionFixtureCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP758_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP758_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp758PermissionFixtureCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp758PermissionFixtureDescriptor(descriptor = createMigrationPlatformCp758PermissionFixtureDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP758_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP758_REQUIREMENTS;
  const caseSet = descriptor.permission_fixture_case_set ?? createMigrationPlatformCp758PermissionFixtureCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp758PermissionFixtureDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp759ServiceFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP759_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp759ServiceFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP759_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP759_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp759ServiceFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp759ServiceFoundationDescriptor(descriptor = createMigrationPlatformCp759ServiceFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP759_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP759_REQUIREMENTS;
  const caseSet = descriptor.service_foundation_case_set ?? createMigrationPlatformCp759ServiceFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp759ServiceFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp760PrimaryServiceCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP760_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp760PrimaryServiceCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP760_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP760_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp760PrimaryServiceCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp760PrimaryServiceDescriptor(descriptor = createMigrationPlatformCp760PrimaryServiceDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP760_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP760_REQUIREMENTS;
  const caseSet = descriptor.primary_service_case_set ?? createMigrationPlatformCp760PrimaryServiceCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp760PrimaryServiceDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp761SecondaryServiceCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP761_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp761SecondaryServiceCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP761_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP761_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp761SecondaryServiceCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp761SecondaryServiceDescriptor(descriptor = createMigrationPlatformCp761SecondaryServiceDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP761_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP761_REQUIREMENTS;
  const caseSet = descriptor.secondary_service_case_set ?? createMigrationPlatformCp761SecondaryServiceCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp761SecondaryServiceDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp762PermissionAuditServiceCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP762_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp762PermissionAuditServiceCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP762_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP762_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp762PermissionAuditServiceCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp762PermissionAuditServiceDescriptor(descriptor = createMigrationPlatformCp762PermissionAuditServiceDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP762_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP762_REQUIREMENTS;
  const caseSet = descriptor.permission_audit_service_case_set ?? createMigrationPlatformCp762PermissionAuditServiceCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp762PermissionAuditServiceDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp763FixtureInterfaceFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP763_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp763FixtureInterfaceFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP763_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP763_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp763FixtureInterfaceFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp763FixtureInterfaceFoundationDescriptor(descriptor = createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP763_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP763_REQUIREMENTS;
  const caseSet = descriptor.fixture_interface_foundation_case_set ?? createMigrationPlatformCp763FixtureInterfaceFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp763FixtureInterfaceFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp764InterfaceImplementationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP764_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp764InterfaceImplementationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP764_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP764_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp764InterfaceImplementationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp764InterfaceImplementationDescriptor(descriptor = createMigrationPlatformCp764InterfaceImplementationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP764_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP764_REQUIREMENTS;
  const caseSet = descriptor.interface_implementation_case_set ?? createMigrationPlatformCp764InterfaceImplementationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp764InterfaceImplementationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp765InterfacePermissionFixtureCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP765_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp765InterfacePermissionFixtureCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP765_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP765_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp765InterfacePermissionFixtureCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp765InterfacePermissionFixtureDescriptor(descriptor = createMigrationPlatformCp765InterfacePermissionFixtureDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP765_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP765_REQUIREMENTS;
  const caseSet = descriptor.interface_permission_fixture_case_set ?? createMigrationPlatformCp765InterfacePermissionFixtureCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp765InterfacePermissionFixtureDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp766InterfaceUiFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP766_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp766InterfaceUiFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP766_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP766_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp766InterfaceUiFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp766InterfaceUiFoundationDescriptor(descriptor = createMigrationPlatformCp766InterfaceUiFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP766_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP766_REQUIREMENTS;
  const caseSet = descriptor.interface_ui_foundation_case_set ?? createMigrationPlatformCp766InterfaceUiFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp766InterfaceUiFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp767UiWorkflowCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP767_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp767UiWorkflowCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP767_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP767_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp767UiWorkflowCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp767UiWorkflowDescriptor(descriptor = createMigrationPlatformCp767UiWorkflowDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP767_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP767_REQUIREMENTS;
  const caseSet = descriptor.ui_workflow_case_set ?? createMigrationPlatformCp767UiWorkflowCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp767UiWorkflowDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp768UiPermissionFixtureCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP768_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp768UiPermissionFixtureCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP768_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP768_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp768UiPermissionFixtureCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp768UiPermissionFixtureDescriptor(descriptor = createMigrationPlatformCp768UiPermissionFixtureDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP768_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP768_REQUIREMENTS;
  const caseSet = descriptor.ui_permission_fixture_case_set ?? createMigrationPlatformCp768UiPermissionFixtureCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp768UiPermissionFixtureDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp769UiFixtureFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP769_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp769UiFixtureFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP769_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP769_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp769UiFixtureFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp769UiFixtureFoundationDescriptor(descriptor = createMigrationPlatformCp769UiFixtureFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP769_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP769_REQUIREMENTS;
  const caseSet = descriptor.ui_fixture_foundation_case_set ?? createMigrationPlatformCp769UiFixtureFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp769UiFixtureFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp770FixtureImplementationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP770_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp770FixtureImplementationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP770_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP770_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp770FixtureImplementationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp770FixtureImplementationDescriptor(descriptor = createMigrationPlatformCp770FixtureImplementationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP770_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP770_REQUIREMENTS;
  const caseSet = descriptor.fixture_implementation_case_set ?? createMigrationPlatformCp770FixtureImplementationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp770FixtureImplementationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (rows.some((row) => row.runtime_execution === true)) errors.push(binding.pack_id + " fixture rows must not execute replay commands");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp771FixturePermissionAuditCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP771_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp771FixturePermissionAuditCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP771_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP771_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp771FixturePermissionAuditCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp771FixturePermissionAuditDescriptor(descriptor = createMigrationPlatformCp771FixturePermissionAuditDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP771_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP771_REQUIREMENTS;
  const caseSet = descriptor.fixture_permission_audit_case_set ?? createMigrationPlatformCp771FixturePermissionAuditCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp771FixturePermissionAuditDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (rows.some((row) => row.runtime_execution === true)) errors.push(binding.pack_id + " fixture rows must not execute replay commands");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp772SyntheticFixtureTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP772_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp772SyntheticFixtureTailCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP772_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP772_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp772SyntheticFixtureTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp772SyntheticFixtureTailDescriptor(descriptor = createMigrationPlatformCp772SyntheticFixtureTailDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP772_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP772_REQUIREMENTS;
  const caseSet = descriptor.synthetic_fixture_tail_case_set ?? createMigrationPlatformCp772SyntheticFixtureTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp772SyntheticFixtureTailDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (rows.some((row) => row.runtime_execution === true)) errors.push(binding.pack_id + " fixture rows must not execute replay commands");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp773FixtureEvidenceUiFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP773_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp773FixtureEvidenceUiFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP773_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP773_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp773FixtureEvidenceUiFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor(descriptor = createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP773_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP773_REQUIREMENTS;
  const caseSet = descriptor.fixture_evidence_ui_foundation_case_set ?? createMigrationPlatformCp773FixtureEvidenceUiFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (rows.some((row) => row.runtime_execution === true)) errors.push(binding.pack_id + " fixture rows must not execute replay commands");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp774PermissionMatrixPrimaryCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP774_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp774PermissionMatrixPrimaryCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP774_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP774_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp774PermissionMatrixPrimaryCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp774PermissionMatrixPrimaryDescriptor(descriptor = createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP774_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP774_REQUIREMENTS;
  const caseSet = descriptor.permission_matrix_primary_case_set ?? createMigrationPlatformCp774PermissionMatrixPrimaryCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp774PermissionMatrixPrimaryDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp775PermissionMatrixWorkflowCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP775_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp775PermissionMatrixWorkflowCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP775_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP775_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp775PermissionMatrixWorkflowCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp775PermissionMatrixWorkflowDescriptor(descriptor = createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP775_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP775_REQUIREMENTS;
  const caseSet = descriptor.permission_matrix_workflow_case_set ?? createMigrationPlatformCp775PermissionMatrixWorkflowCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp775PermissionMatrixWorkflowDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp776PermissionMatrixAuditBindingCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP776_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp776PermissionMatrixAuditBindingCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP776_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP776_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp776PermissionMatrixAuditBindingCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor(descriptor = createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP776_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP776_REQUIREMENTS;
  const caseSet = descriptor.permission_matrix_audit_binding_case_set ?? createMigrationPlatformCp776PermissionMatrixAuditBindingCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp776PermissionMatrixAuditBindingDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp777PermissionMatrixFixtureFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP777_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp777PermissionMatrixFixtureFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP777_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP777_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp777PermissionMatrixFixtureFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor(descriptor = createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP777_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP777_REQUIREMENTS;
  const caseSet = descriptor.permission_matrix_fixture_foundation_case_set ?? createMigrationPlatformCp777PermissionMatrixFixtureFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp778PermissionFixtureFailureFoundationCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP778_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp778PermissionFixtureFailureFoundationCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP778_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP778_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp778PermissionFixtureFailureFoundationCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor(descriptor = createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP778_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP778_REQUIREMENTS;
  const caseSet = descriptor.permission_fixture_failure_foundation_case_set ?? createMigrationPlatformCp778PermissionFixtureFailureFoundationCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp779FailureRecoveryPrimaryCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP779_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp779FailureRecoveryPrimaryCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP779_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP779_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp779FailureRecoveryPrimaryCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp779FailureRecoveryPrimaryDescriptor(descriptor = createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP779_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP779_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_primary_case_set ?? createMigrationPlatformCp779FailureRecoveryPrimaryCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp779FailureRecoveryPrimaryDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp780FailureRecoveryWorkflowCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP780_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp780FailureRecoveryWorkflowCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP780_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP780_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp780FailureRecoveryWorkflowCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp780FailureRecoveryWorkflowDescriptor(descriptor = createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP780_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP780_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_workflow_case_set ?? createMigrationPlatformCp780FailureRecoveryWorkflowCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp780FailureRecoveryWorkflowDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp781FailureRecoveryAuditBindingCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP781_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp781FailureRecoveryAuditBindingCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP781_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP781_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp781FailureRecoveryAuditBindingCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor(descriptor = createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP781_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP781_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_audit_binding_case_set ?? createMigrationPlatformCp781FailureRecoveryAuditBindingCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp781FailureRecoveryAuditBindingDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp782FailureRecoveryAuditTailCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP782_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp782FailureRecoveryAuditTailCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP782_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP782_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp782FailureRecoveryAuditTailCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp782FailureRecoveryAuditTailDescriptor(descriptor = createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP782_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP782_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_audit_tail_case_set ?? createMigrationPlatformCp782FailureRecoveryAuditTailCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp782FailureRecoveryAuditTailDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp783FailureRecoveryAuditCloseoutCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP783_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp783FailureRecoveryAuditCloseoutCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP783_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP783_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp783FailureRecoveryAuditCloseoutCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor(descriptor = createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP783_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP783_REQUIREMENTS;
  const caseSet = descriptor.failure_recovery_audit_closeout_case_set ?? createMigrationPlatformCp783FailureRecoveryAuditCloseoutCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp784FailureFixtureReviewBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP784_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp784FailureFixtureReviewBridgeCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP784_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP784_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp784FailureFixtureReviewBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor(descriptor = createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP784_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP784_REQUIREMENTS;
  const caseSet = descriptor.failure_fixture_review_bridge_case_set ?? createMigrationPlatformCp784FailureFixtureReviewBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp784FailureFixtureReviewBridgeDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp785ReviewReceiptImplementationBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP785_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp785ReviewReceiptImplementationBridgeCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP785_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP785_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp785ReviewReceiptImplementationBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor(descriptor = createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP785_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP785_REQUIREMENTS;
  const caseSet = descriptor.review_receipt_implementation_bridge_case_set ?? createMigrationPlatformCp785ReviewReceiptImplementationBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp786ReviewPacketRiskBridgeCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP786_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp786ReviewPacketRiskBridgeCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP786_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP786_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp786ReviewPacketRiskBridgeCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor(descriptor = createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP786_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP786_REQUIREMENTS;
  const caseSet = descriptor.review_packet_risk_bridge_case_set ?? createMigrationPlatformCp786ReviewPacketRiskBridgeCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp786ReviewPacketRiskBridgeDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}

export function createMigrationPlatformCp787ReviewRiskCloseoutCoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeValidation(MIGRATION_PLATFORM_CP787_PACK_BINDING, {
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
  });
}

export function validateMigrationPlatformCp787ReviewRiskCloseoutCoverage(planPack) {
  const binding = MIGRATION_PLATFORM_CP787_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP787_REQUIREMENTS;
  const errors = [];
  if (!planPack) errors.push(binding.pack_id + " plan pack is required");
  if (planPack?.pack_id !== binding.pack_id) errors.push("plan pack must be " + binding.pack_id);
  if (planPack?.risk_class !== binding.risk_class) errors.push(binding.pack_id + " risk class drift");
  if (planPack?.unit_count !== binding.unit_count) errors.push(binding.pack_id + " unit count drift");
  const units = planPack?.included_units ?? [];
  const unitIds = units.map((unit) => unit.id);
  if (unitIds[0] !== binding.first_unit_id) errors.push(binding.pack_id + " first unit drift");
  if (unitIds.at(-1) !== binding.last_unit_id) errors.push(binding.pack_id + " last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push(binding.pack_id + " duplicate unit IDs");
  if (units.some((unit) => unit.program_id !== "RP25")) errors.push(binding.pack_id + " must only include RP25 units");
  const summary = createMigrationPlatformCp787ReviewRiskCloseoutCoverageSummary(planPack);
  for (const [name, count] of Object.entries(requirements.deliverable_counts)) if (summary.by_deliverable[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.phase_counts)) if (summary.by_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_phase_row_counts)) if (summary.by_micro_phase[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [name, count] of Object.entries(requirements.micro_title_row_counts)) if (summary.by_micro_title[name] !== count) errors.push(binding.pack_id + " " + name + " distribution drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const sectionUnits = units.filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push(binding.pack_id + " " + microId + " missing row " + title);
  }
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateMigrationPlatformCp787ReviewRiskCloseoutDescriptor(descriptor = createMigrationPlatformCp787ReviewRiskCloseoutDescriptor(), contractProjection = {}) {
  const binding = MIGRATION_PLATFORM_CP787_PACK_BINDING;
  const requirements = MIGRATION_PLATFORM_CP787_REQUIREMENTS;
  const caseSet = descriptor.review_risk_closeout_case_set ?? createMigrationPlatformCp787ReviewRiskCloseoutCaseSet();
  const errors = [];
  if (descriptor.descriptor !== "MigrationPlatformCp787ReviewRiskCloseoutDescriptor") errors.push(binding.pack_id + " descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP25") errors.push(binding.pack_id + " program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP24") errors.push(binding.pack_id + " upstream program drift");
  if (descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening !== true) errors.push(binding.pack_id + " must require human runtime approval");
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push(binding.pack_id + " Claude must not be final approval");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) errors.push(binding.pack_id + " local validation must not claim enterprise trust");
  if (caseSet.section_count !== Object.keys(requirements.required_section_rows).length) errors.push(binding.pack_id + " section count drift");
  for (const [microId, titles] of Object.entries(requirements.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(binding.pack_id + " missing section " + microId);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(binding.pack_id + " " + microId + " row count drift");
    for (const title of titles) {
      const rowKey = migrationPlatformRowKey(title);
      const row = section.rows?.[rowKey];
      if (!row) {
        errors.push(binding.pack_id + " " + microId + " missing row " + rowKey);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(binding.pack_id + " " + rowKey + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push(binding.pack_id + " " + rowKey + " must not execute runtime");
      if (row.raw_payload_included !== false || row.source_system_payload_included !== false || row.external_credential_included !== false || row.real_client_data_included !== false) errors.push(binding.pack_id + " " + rowKey + " must not include sensitive payloads");
    }
  }
  const rows = Object.values(caseSet.sections ?? {}).flatMap((section) => Object.values(section.rows ?? {}));
  if (rows.some((row) => row.file_server_runtime_opened || row.sharepoint_runtime_opened || row.google_drive_runtime_opened || row.imanage_runtime_opened || row.import_runtime_opened)) errors.push(binding.pack_id + " must not open source-system import runtime");
  if (rows.some((row) => row.permission_decision_detail_included === true || row.cross_tenant_access_allowed === true)) errors.push(binding.pack_id + " permission baseline must not expose decisions or cross-tenant access");
  if (rows.some((row) => row.audit_event_body_included === true)) errors.push(binding.pack_id + " audit baseline must not expose event bodies");
  if (rows.some((row) => row.runtime_render_claimed === true)) errors.push(binding.pack_id + " UI rows must not claim runtime rendering");
  if (rows.some((row) => row.unauthorized_records_omitted === false)) errors.push(binding.pack_id + " unauthorized count leak guard drift");
  if (rows.some((row) => row.unverified_knowledge_creation_allowed === true)) errors.push(binding.pack_id + " fixture rows must not allow unverified knowledge creation");
  if (descriptor.hermes_packet?.gate !== binding.hermes_gate) errors.push(binding.pack_id + " Hermes gate drift");
  if (descriptor.claude_packet?.gate !== binding.claude_gate || descriptor.claude_packet?.read_only !== true) errors.push(binding.pack_id + " Claude packet drift");
  if (descriptor.closeout_handoff?.to_pack_id !== binding.next_pack_id || descriptor.closeout_handoff?.next_subphase_id !== binding.next_subphase_id) errors.push(binding.pack_id + " handoff drift");
  if (contractProjection.latest_pack?.pack_id && contractProjection.latest_pack.pack_id !== binding.pack_id) errors.push(binding.pack_id + " contract projection pack drift");
  return freezeValidation(binding, { valid: errors.length === 0, errors: Object.freeze(errors), descriptor, contractProjection });
}
