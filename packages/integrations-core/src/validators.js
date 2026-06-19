import {
  EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING,
  EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS,
  EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES,
  EXTERNAL_INTEGRATIONS_I_PROGRAM_CONTRACT,
} from "./registry.js";
import {
  createExternalIntegrationsICp667DomainModelContinuationDescriptor,
  createExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor,
  createExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor,
  createExternalIntegrationsICp670ServiceImplementationSliceDescriptor,
  createExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor,
  createExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor,
  createExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor,
  createExternalIntegrationsICp674EvidenceReviewBridgeDescriptor,
  createExternalIntegrationsICp675Phase3FoundationBridgeDescriptor,
  createExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor,
  createExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor,
  createExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor,
  createExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor,
  createExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor,
  createExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor,
  createExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor,
  createExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor,
  createExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor,
  createExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor,
  createExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor,
  createExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor,
  createExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor,
  createExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor,
  createExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor,
  createExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor,
  createExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor,
  createExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor,
  createExternalIntegrationsICp666ScopeDomainFoundationDescriptor,
  createExternalIntegrationsICoreContractProjection,
  externalIntegrationsIRowKey,
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

function freezeCp666Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.pack_id,
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function createExternalIntegrationsICp666CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp666Validation({
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

export function validateExternalIntegrationsICp666Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-666 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-666");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.risk_class) errors.push("CP00-666 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.unit_count) errors.push("CP00-666 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.first_unit_id) errors.push("CP00-666 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP666_PACK_BINDING.last_unit_id) errors.push("CP00-666 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-666 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-666 must only include RP22 units");
  const summary = createExternalIntegrationsICp666CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-666 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-666 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-666 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-666 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-666 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-666 ${microId} missing row ${title}`);
    }
  }
  return freezeCp666Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp667CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp667Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-667 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-667");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.risk_class) errors.push("CP00-667 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.unit_count) errors.push("CP00-667 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.first_unit_id) errors.push("CP00-667 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP667_PACK_BINDING.last_unit_id) errors.push("CP00-667 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-667 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-667 must only include RP22 units");
  const summary = createExternalIntegrationsICp667CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-667 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-667 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-667 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-667 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-667 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-667 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp668CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp668Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-668 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-668");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.risk_class) errors.push("CP00-668 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.unit_count) errors.push("CP00-668 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.first_unit_id) errors.push("CP00-668 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP668_PACK_BINDING.last_unit_id) errors.push("CP00-668 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-668 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-668 must only include RP22 units");
  const summary = createExternalIntegrationsICp668CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-668 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-668 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-668 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-668 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-668 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-668 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp669CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp669Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-669 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-669");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.risk_class) errors.push("CP00-669 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.unit_count) errors.push("CP00-669 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.first_unit_id) errors.push("CP00-669 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP669_PACK_BINDING.last_unit_id) errors.push("CP00-669 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-669 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-669 must only include RP22 units");
  const summary = createExternalIntegrationsICp669CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-669 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-669 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-669 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-669 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-669 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-669 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}
export function createExternalIntegrationsICp670CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp670Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-670 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-670");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.risk_class) errors.push("CP00-670 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.unit_count) errors.push("CP00-670 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.first_unit_id) errors.push("CP00-670 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP670_PACK_BINDING.last_unit_id) errors.push("CP00-670 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-670 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-670 must only include RP22 units");
  const summary = createExternalIntegrationsICp670CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-670 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-670 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-670 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-670 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-670 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-670 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}
export function createExternalIntegrationsICp671CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp671Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-671 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-671");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.risk_class) errors.push("CP00-671 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.unit_count) errors.push("CP00-671 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.first_unit_id) errors.push("CP00-671 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP671_PACK_BINDING.last_unit_id) errors.push("CP00-671 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-671 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-671 must only include RP22 units");
  const summary = createExternalIntegrationsICp671CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-671 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-671 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-671 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-671 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-671 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-671 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp672CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp672Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-672 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-672");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.risk_class) errors.push("CP00-672 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.unit_count) errors.push("CP00-672 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.first_unit_id) errors.push("CP00-672 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP672_PACK_BINDING.last_unit_id) errors.push("CP00-672 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-672 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-672 must only include RP22 units");
  const summary = createExternalIntegrationsICp672CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-672 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-672 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-672 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-672 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-672 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-672 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp673CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp673Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-673 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-673");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.risk_class) errors.push("CP00-673 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.unit_count) errors.push("CP00-673 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.first_unit_id) errors.push("CP00-673 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP673_PACK_BINDING.last_unit_id) errors.push("CP00-673 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-673 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-673 must only include RP22 units");
  const summary = createExternalIntegrationsICp673CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-673 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-673 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-673 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-673 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-673 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-673 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp674CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp674Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-674 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-674");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.risk_class) errors.push("CP00-674 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.unit_count) errors.push("CP00-674 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.first_unit_id) errors.push("CP00-674 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP674_PACK_BINDING.last_unit_id) errors.push("CP00-674 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-674 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-674 must only include RP22 units");
  const summary = createExternalIntegrationsICp674CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-674 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-674 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-674 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-674 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-674 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-674 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}
export function createExternalIntegrationsICp675CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp675Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-675 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-675");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.risk_class) errors.push("CP00-675 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.unit_count) errors.push("CP00-675 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.first_unit_id) errors.push("CP00-675 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP675_PACK_BINDING.last_unit_id) errors.push("CP00-675 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-675 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-675 must only include RP22 units");
  const summary = createExternalIntegrationsICp675CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-675 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-675 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-675 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-675 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-675 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-675 ${microId} missing row ${title}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp676CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp676Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-676 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-676");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.risk_class) errors.push("CP00-676 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.unit_count) errors.push("CP00-676 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.first_unit_id) errors.push("CP00-676 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP676_PACK_BINDING.last_unit_id) errors.push("CP00-676 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-676 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-676 must only include RP22 units");
  const summary = createExternalIntegrationsICp676CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-676 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-676 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-676 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-676 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-676 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push("CP00-676 " + microId + " missing row " + title);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp677CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({
    pack_id: EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: countBy(units, "deliverable_type"),
    by_phase: countBy(units, "phase_id"),
    by_micro_phase: countBy(units, "source_micro_phase_id"),
    by_micro_title: countBy(units, "micro_title"),
    unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]),
    no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION,
  });
}

export function validateExternalIntegrationsICp677Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-677 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-677");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.risk_class) errors.push("CP00-677 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.unit_count) errors.push("CP00-677 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.first_unit_id) errors.push("CP00-677 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP677_PACK_BINDING.last_unit_id) errors.push("CP00-677 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-677 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-677 must only include RP22 units");
  const summary = createExternalIntegrationsICp677CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-677 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-677 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-677 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-677 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-677 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push("CP00-677 " + microId + " missing row " + title);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp678CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp678Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-678 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-678");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.risk_class) errors.push("CP00-678 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.unit_count) errors.push("CP00-678 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.first_unit_id) errors.push("CP00-678 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP678_PACK_BINDING.last_unit_id) errors.push("CP00-678 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-678 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-678 must only include RP22 units");
  const summary = createExternalIntegrationsICp678CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-678 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-678 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-678 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-678 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-678 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-678 " + microId + " missing row " + title);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp679CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp679Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-679 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-679");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.risk_class) errors.push("CP00-679 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.unit_count) errors.push("CP00-679 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.first_unit_id) errors.push("CP00-679 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP679_PACK_BINDING.last_unit_id) errors.push("CP00-679 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-679 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-679 must only include RP22 units");
  const summary = createExternalIntegrationsICp679CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-679 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-679 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-679 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-679 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-679 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-679 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp680CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp680Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-680 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-680");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.risk_class) errors.push("CP00-680 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.unit_count) errors.push("CP00-680 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.first_unit_id) errors.push("CP00-680 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP680_PACK_BINDING.last_unit_id) errors.push("CP00-680 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-680 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-680 must only include RP22 units");
  const summary = createExternalIntegrationsICp680CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-680 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-680 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-680 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-680 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-680 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-680 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp681CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp681Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-681 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-681");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.risk_class) errors.push("CP00-681 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.unit_count) errors.push("CP00-681 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.first_unit_id) errors.push("CP00-681 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP681_PACK_BINDING.last_unit_id) errors.push("CP00-681 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-681 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-681 must only include RP22 units");
  const summary = createExternalIntegrationsICp681CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-681 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-681 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-681 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-681 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-681 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-681 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp682CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp682Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-682 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-682");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.risk_class) errors.push("CP00-682 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.unit_count) errors.push("CP00-682 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.first_unit_id) errors.push("CP00-682 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP682_PACK_BINDING.last_unit_id) errors.push("CP00-682 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-682 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-682 must only include RP22 units");
  const summary = createExternalIntegrationsICp682CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-682 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-682 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-682 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-682 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-682 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-682 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp683CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp683Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-683 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-683");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.risk_class) errors.push("CP00-683 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.unit_count) errors.push("CP00-683 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.first_unit_id) errors.push("CP00-683 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP683_PACK_BINDING.last_unit_id) errors.push("CP00-683 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-683 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-683 must only include RP22 units");
  const summary = createExternalIntegrationsICp683CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-683 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-683 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-683 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-683 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-683 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-683 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp684CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp684Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-684 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-684");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.risk_class) errors.push("CP00-684 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.unit_count) errors.push("CP00-684 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.first_unit_id) errors.push("CP00-684 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP684_PACK_BINDING.last_unit_id) errors.push("CP00-684 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-684 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-684 must only include RP22 units");
  const summary = createExternalIntegrationsICp684CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-684 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-684 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-684 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-684 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-684 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-684 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp685CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp685Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-685 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-685");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.risk_class) errors.push("CP00-685 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.unit_count) errors.push("CP00-685 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.first_unit_id) errors.push("CP00-685 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP685_PACK_BINDING.last_unit_id) errors.push("CP00-685 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-685 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-685 must only include RP22 units");
  const summary = createExternalIntegrationsICp685CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-685 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-685 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-685 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-685 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-685 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-685 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp686CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp686Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-686 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-686");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.risk_class) errors.push("CP00-686 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.unit_count) errors.push("CP00-686 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.first_unit_id) errors.push("CP00-686 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP686_PACK_BINDING.last_unit_id) errors.push("CP00-686 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-686 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-686 must only include RP22 units");
  const summary = createExternalIntegrationsICp686CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-686 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-686 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-686 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-686 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-686 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-686 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp687CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp687Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-687 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-687");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.risk_class) errors.push("CP00-687 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.unit_count) errors.push("CP00-687 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.first_unit_id) errors.push("CP00-687 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP687_PACK_BINDING.last_unit_id) errors.push("CP00-687 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-687 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-687 must only include RP22 units");
  const summary = createExternalIntegrationsICp687CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-687 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-687 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-687 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-687 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-687 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-687 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}


export function createExternalIntegrationsICp688CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp688Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-688 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-688");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.risk_class) errors.push("CP00-688 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.unit_count) errors.push("CP00-688 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.first_unit_id) errors.push("CP00-688 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP688_PACK_BINDING.last_unit_id) errors.push("CP00-688 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-688 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-688 must only include RP22 units");
  const summary = createExternalIntegrationsICp688CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-688 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-688 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-688 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-688 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-688 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-688 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}


export function createExternalIntegrationsICp689CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp689Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-689 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-689");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.risk_class) errors.push("CP00-689 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.unit_count) errors.push("CP00-689 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.first_unit_id) errors.push("CP00-689 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP689_PACK_BINDING.last_unit_id) errors.push("CP00-689 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-689 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-689 must only include RP22 units");
  const summary = createExternalIntegrationsICp689CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-689 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-689 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-689 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-689 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-689 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-689 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp690CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp690Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-690 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-690");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.risk_class) errors.push("CP00-690 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.unit_count) errors.push("CP00-690 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.first_unit_id) errors.push("CP00-690 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP690_PACK_BINDING.last_unit_id) errors.push("CP00-690 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-690 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-690 must only include RP22 units");
  const summary = createExternalIntegrationsICp690CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-690 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-690 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-690 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-690 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-690 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-690 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp691CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp691Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-691 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-691");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.risk_class) errors.push("CP00-691 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.unit_count) errors.push("CP00-691 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.first_unit_id) errors.push("CP00-691 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP691_PACK_BINDING.last_unit_id) errors.push("CP00-691 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-691 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-691 must only include RP22 units");
  const summary = createExternalIntegrationsICp691CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-691 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-691 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-691 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-691 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-691 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-691 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp692CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp692Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-692 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-692");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.risk_class) errors.push("CP00-692 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.unit_count) errors.push("CP00-692 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.first_unit_id) errors.push("CP00-692 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP692_PACK_BINDING.last_unit_id) errors.push("CP00-692 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-692 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-692 must only include RP22 units");
  const summary = createExternalIntegrationsICp692CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-692 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-692 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-692 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-692 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-692 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-692 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createExternalIntegrationsICp693CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return Object.freeze({ pack_id: EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id, first_unit_id: units.at(0)?.id, last_unit_id: units.at(-1)?.id, unit_count: units.length, by_deliverable: countBy(units, "deliverable_type"), by_phase: countBy(units, "phase_id"), by_micro_phase: countBy(units, "source_micro_phase_id"), by_micro_title: countBy(units, "micro_title"), unit_titles: Object.freeze([...new Set(units.map((unit) => unit.title))]), no_write_attestation: EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION });
}

export function validateExternalIntegrationsICp693Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-693 plan pack is required");
  if (planPack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-693");
  if (planPack?.risk_class !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.risk_class) errors.push("CP00-693 risk class drift");
  if (planPack?.unit_count !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.unit_count) errors.push("CP00-693 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.first_unit_id) errors.push("CP00-693 first unit drift");
  if (unitIds.at(-1) !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.last_unit_id) errors.push("CP00-693 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-693 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP22")) errors.push("CP00-693 must only include RP22 units");
  const summary = createExternalIntegrationsICp693CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-693 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-693 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-693 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-693 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.required_section_rows)) { const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId); if (sectionUnits.length !== titles.length) errors.push("CP00-693 " + microId + " row count drift"); const sectionTitles = sectionUnits.map((unit) => unit.title); for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-693 " + microId + " missing row " + title); }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

function assertFalse(value, message, errors) {
  if (value !== false) errors.push(message);
}

function assertTrue(value, message, errors) {
  if (value !== true) errors.push(message);
}

export function validateExternalIntegrationsICp666ScopeDomainFoundationDescriptor(
  descriptor = createExternalIntegrationsICp666ScopeDomainFoundationDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.scope_domain_foundation_case_set ?? createExternalIntegrationsICp666ScopeDomainFoundationDescriptor().scope_domain_foundation_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp666ScopeDomainFoundationDescriptor") errors.push("CP00-666 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-666 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP21") errors.push("CP00-666 upstream program drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-666 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-666 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-666 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-666 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-666 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-666 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-666 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-666 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-666 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  for (const guard of EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-666 missing no-leak guard ${guard}`);
  }
  const runtime = descriptor.runtime_boundary ?? {};
  assertTrue(runtime.descriptor_only, "CP00-666 runtime boundary must be descriptor-only", errors);
  assertFalse(runtime.external_api_runtime_opened, "CP00-666 must not open external API runtime", errors);
  assertFalse(runtime.oauth_runtime_opened, "CP00-666 must not open OAuth runtime", errors);
  assertFalse(runtime.sync_runtime_opened, "CP00-666 must not open sync runtime", errors);
  assertFalse(runtime.message_capture_runtime_opened, "CP00-666 must not open message capture runtime", errors);
  assertFalse(runtime.e_sign_runtime_opened, "CP00-666 must not open e-sign runtime", errors);
  assertFalse(runtime.webhook_runtime_opened, "CP00-666 must not open webhook runtime", errors);
  assertFalse(runtime.credential_persistence_opened, "CP00-666 must not persist credentials", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-666 must not promote Claude to final approval", errors);
  assertFalse(
    descriptor.authority_boundary?.local_validation_claims_enterprise_trust,
    "CP00-666 must not claim enterprise trust from local validation",
    errors,
  );
  assertTrue(
    descriptor.authority_boundary?.human_final_approval_required_for_runtime_opening,
    "CP00-666 must require human approval before runtime opening",
    errors,
  );
  for (const risk of ["token_exposure", "overbroad_sync", "webhook_spoof"]) {
    if (!descriptor.blocked_claim_contract?.must_block_or_review?.includes(risk)) {
      errors.push(`CP00-666 blocked claim contract missing ${risk}`);
    }
  }
  for (const [entity, shape] of Object.entries(EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES)) {
    const projectedShape = descriptor.entity_shapes?.[entity];
    if (!projectedShape) {
      errors.push(`CP00-666 missing entity shape ${entity}`);
      continue;
    }
    if (projectedShape.owner !== shape.owner) errors.push(`CP00-666 ${entity} owner drift`);
    for (const field of shape.required_fields) {
      if (!projectedShape.required_fields?.includes(field)) errors.push(`CP00-666 ${entity} missing required field ${field}`);
    }
    if (!projectedShape.required_fields?.includes("tenant_id")) errors.push(`CP00-666 ${entity} must be tenant scoped`);
  }
  return freezeCp666Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp667DomainModelContinuationDescriptor(
  descriptor = createExternalIntegrationsICp667DomainModelContinuationDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.domain_model_continuation_case_set ??
    createExternalIntegrationsICp667DomainModelContinuationDescriptor().domain_model_continuation_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp667DomainModelContinuationDescriptor") errors.push("CP00-667 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-667 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-667") errors.push("CP00-667 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-667 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-667 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-667 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-667 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-667 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-667 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-667 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-667 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-667 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  if (descriptor.model_continuation_contract?.validates_required_fields !== true) errors.push("CP00-667 must validate required fields");
  if (descriptor.model_continuation_contract?.serialization_hides_raw_external_payload !== true) {
    errors.push("CP00-667 serialization must hide raw external payload");
  }
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-667 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-667 must not persist credentials", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-667 must not promote Claude to final approval", errors);
  assertFalse(
    descriptor.authority_boundary?.local_validation_claims_enterprise_trust,
    "CP00-667 must not claim enterprise trust from local validation",
    errors,
  );
  for (const [entity, shape] of Object.entries(EXTERNAL_INTEGRATIONS_I_ENTITY_SHAPES)) {
    const projectedShape = descriptor.entity_shapes?.[entity];
    if (!projectedShape) {
      errors.push(`CP00-667 missing entity shape ${entity}`);
      continue;
    }
    for (const field of shape.required_fields) {
      if (!projectedShape.required_fields?.includes(field)) errors.push(`CP00-667 ${entity} missing required field ${field}`);
    }
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor(
  descriptor = createExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.permission_audit_fixture_bridge_case_set ??
    createExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor().permission_audit_fixture_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor") errors.push("CP00-668 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-668 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-668") errors.push("CP00-668 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-668 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-668 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-668 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-668 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-668 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-668 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-668 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-668 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-668 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.permission_audit_fixture_contract ?? {};
  assertTrue(contract.permission_decision_required_before_runtime, "CP00-668 must require permission decisions before runtime", errors);
  assertTrue(contract.audit_hint_required, "CP00-668 must require audit hints", errors);
  assertFalse(contract.fixture_payload_included, "CP00-668 must not include fixture payloads", errors);
  assertFalse(contract.cross_tenant_access_allowed, "CP00-668 must deny cross-tenant access", errors);
  assertTrue(contract.serialization_hides_raw_external_payload, "CP00-668 serialization must hide raw external payload", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-668 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-668 must not open audit runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-668 must not open external API runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-668 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor(
  descriptor = createExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.service_contract_type_shape_foundation_case_set ??
    createExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor().service_contract_type_shape_foundation_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor") errors.push("CP00-669 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-669 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-669") errors.push("CP00-669 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-669 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-669 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-669 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-669 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-669 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-669 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-669 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-669 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-669 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.service_contract_type_shape_contract ?? {};
  assertTrue(contract.service_entrypoint_contract_defined, "CP00-669 must define service entrypoint contract", errors);
  assertTrue(contract.request_normalization_descriptor_only, "CP00-669 request normalization must be descriptor-only", errors);
  assertTrue(contract.tenant_boundary_precheck_required, "CP00-669 must require tenant boundary precheck", errors);
  assertTrue(contract.matter_trace_precheck_required, "CP00-669 must require Matter trace precheck", errors);
  assertTrue(contract.permission_precheck_required, "CP00-669 must require permission precheck", errors);
  assertTrue(contract.audit_hint_precheck_required, "CP00-669 must require audit hint precheck", errors);
  assertTrue(contract.idempotency_key_required, "CP00-669 must require idempotency key", errors);
  assertTrue(contract.persistence_boundary_no_write, "CP00-669 must keep persistence boundary no-write", errors);
  assertTrue(contract.validation_errors_customer_safe, "CP00-669 must keep validation errors customer-safe", errors);
  assertTrue(contract.type_shape_definition_opened, "CP00-669 must open type-shape definition descriptor", errors);
  assertFalse(contract.runtime_execution_opened, "CP00-669 must not open runtime execution", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-669 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-669 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-669 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-669 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-669 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
export function validateExternalIntegrationsICp670ServiceImplementationSliceDescriptor(
  descriptor = createExternalIntegrationsICp670ServiceImplementationSliceDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.service_implementation_slice_case_set ??
    createExternalIntegrationsICp670ServiceImplementationSliceDescriptor().service_implementation_slice_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp670ServiceImplementationSliceDescriptor") errors.push("CP00-670 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-670 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-670") errors.push("CP00-670 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-670 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-670 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-670 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-670 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-670 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-670 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-670 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-670 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-670 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.service_implementation_slice_contract ?? {};
  assertTrue(contract.service_entrypoint_contract_bound, "CP00-670 must bind service entrypoint contract", errors);
  assertTrue(contract.request_normalization_bound, "CP00-670 must bind request normalization", errors);
  assertTrue(contract.tenant_boundary_precheck_required, "CP00-670 must require tenant boundary precheck", errors);
  assertTrue(contract.matter_trace_precheck_required, "CP00-670 must require Matter trace precheck", errors);
  assertTrue(contract.permission_precheck_required, "CP00-670 must require permission precheck", errors);
  assertTrue(contract.audit_hint_precheck_required, "CP00-670 must require audit hint precheck", errors);
  assertTrue(contract.persistence_boundary_no_write, "CP00-670 must keep persistence no-write", errors);
  assertFalse(contract.implementation_runtime_opened, "CP00-670 must not open implementation runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-670 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-670 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-670 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-670 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-670 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
export function validateExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor(
  descriptor = createExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.permission_audit_fixture_bridge_v2_case_set ??
    createExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor().permission_audit_fixture_bridge_v2_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor") errors.push("CP00-671 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-671 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-671") errors.push("CP00-671 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-671 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-671 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-671 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-671 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-671 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-671 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-671 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-671 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-671 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.permission_audit_fixture_bridge_v2_contract ?? {};
  assertTrue(contract.permission_decision_required_before_runtime, "CP00-671 must require permission decisions before runtime", errors);
  assertTrue(contract.audit_hint_required, "CP00-671 must require audit hints", errors);
  assertFalse(contract.fixture_payload_included, "CP00-671 must not include fixture payloads", errors);
  assertTrue(contract.synthetic_fixture_only, "CP00-671 must stay synthetic fixture only", errors);
  assertTrue(contract.tenant_boundary_precheck_required, "CP00-671 must require tenant boundary precheck", errors);
  assertTrue(contract.matter_trace_precheck_required, "CP00-671 must require Matter trace precheck", errors);
  assertTrue(contract.persistence_boundary_no_write, "CP00-671 must keep persistence no-write", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-671 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-671 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-671 must not open fixture runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-671 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-671 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-671 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-671 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-671 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor(
  descriptor = createExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.synthetic_fixture_test_golden_bridge_case_set ??
    createExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor().synthetic_fixture_test_golden_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor") {
    errors.push("CP00-672 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-672 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-672") errors.push("CP00-672 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-672 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-672 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-672 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-672 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-672 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-672 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-672 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-672 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-672 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.synthetic_fixture_test_golden_bridge_contract ?? {};
  assertTrue(contract.approval_required_routing_descriptor_only, "CP00-672 approval routing must be descriptor-only", errors);
  assertTrue(contract.blocked_claim_output_descriptor_only, "CP00-672 blocked-claim output must be descriptor-only", errors);
  assertTrue(contract.rollback_behavior_descriptor_only, "CP00-672 rollback behavior must be descriptor-only", errors);
  assertTrue(contract.retry_behavior_descriptor_only, "CP00-672 retry behavior must be descriptor-only", errors);
  assertTrue(contract.happy_path_test_descriptor_only, "CP00-672 happy path test must be descriptor-only", errors);
  assertTrue(contract.denied_path_test_descriptor_only, "CP00-672 denied path test must be descriptor-only", errors);
  assertTrue(contract.review_path_test_descriptor_only, "CP00-672 review path test must be descriptor-only", errors);
  assertTrue(contract.integration_smoke_case_descriptor_only, "CP00-672 smoke case must be descriptor-only", errors);
  assertTrue(contract.service_entrypoint_contract_defined, "CP00-672 must define service entrypoint contract", errors);
  assertTrue(contract.request_normalization_descriptor_only, "CP00-672 request normalization must be descriptor-only", errors);
  assertFalse(contract.golden_case_payload_included, "CP00-672 must not include golden case payloads", errors);
  assertTrue(contract.synthetic_fixture_only, "CP00-672 must stay synthetic fixture only", errors);
  assertTrue(contract.tenant_boundary_precheck_required, "CP00-672 must require tenant boundary precheck", errors);
  assertTrue(contract.matter_trace_precheck_required, "CP00-672 must require Matter trace precheck", errors);
  assertTrue(contract.persistence_boundary_no_write, "CP00-672 must keep persistence no-write", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-672 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-672 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-672 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-672 must not open test runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-672 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-672 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-672 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-672 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-672 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor(
  descriptor = createExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.test_golden_boundary_precheck_case_set ??
    createExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor().test_golden_boundary_precheck_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor") {
    errors.push("CP00-673 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-673 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-673") errors.push("CP00-673 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-673 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-673 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-673 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-673 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-673 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-673 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-673 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-673 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-673 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.test_golden_boundary_precheck_contract ?? {};
  assertTrue(contract.tenant_boundary_precheck_required, "CP00-673 must require tenant boundary precheck", errors);
  assertTrue(contract.matter_trace_precheck_required, "CP00-673 must require Matter trace precheck", errors);
  assertTrue(contract.permission_precheck_required, "CP00-673 must require permission precheck", errors);
  assertTrue(contract.audit_hint_precheck_required, "CP00-673 must require audit hint precheck", errors);
  assertTrue(contract.primary_happy_path_descriptor_only, "CP00-673 primary happy path must be descriptor-only", errors);
  assertTrue(contract.secondary_workflow_path_descriptor_only, "CP00-673 secondary workflow path must be descriptor-only", errors);
  assertTrue(contract.state_transition_enforcement_descriptor_only, "CP00-673 state transition must be descriptor-only", errors);
  assertTrue(contract.idempotency_key_required, "CP00-673 must require idempotency key", errors);
  assertTrue(contract.lock_acquisition_rule_required, "CP00-673 must require lock acquisition rule", errors);
  assertTrue(contract.persistence_boundary_no_write, "CP00-673 must keep persistence no-write", errors);
  assertFalse(contract.golden_case_payload_included, "CP00-673 must not include golden case payloads", errors);
  assertTrue(contract.validation_errors_customer_safe, "CP00-673 validation errors must be customer-safe", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-673 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-673 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-673 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-673 must not open test runtime", errors);
  assertFalse(contract.persistence_runtime_opened, "CP00-673 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-673 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-673 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-673 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-673 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-673 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp674EvidenceReviewBridgeDescriptor(
  descriptor = createExternalIntegrationsICp674EvidenceReviewBridgeDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.evidence_review_bridge_case_set ??
    createExternalIntegrationsICp674EvidenceReviewBridgeDescriptor().evidence_review_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp674EvidenceReviewBridgeDescriptor") {
    errors.push("CP00-674 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-674 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-674") errors.push("CP00-674 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-674 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-674 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-674 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-674 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-674 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-674 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-674 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-674 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-674 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.evidence_review_bridge_contract ?? {};
  assertTrue(contract.validation_error_mapping_customer_safe, "CP00-674 validation errors must be customer-safe", errors);
  assertTrue(contract.review_required_routing_descriptor_only, "CP00-674 review routing must be descriptor-only", errors);
  assertTrue(contract.approval_required_routing_descriptor_only, "CP00-674 approval routing must be descriptor-only", errors);
  assertTrue(contract.blocked_claim_output_descriptor_only, "CP00-674 blocked-claim output must be descriptor-only", errors);
  assertTrue(contract.rollback_behavior_descriptor_only, "CP00-674 rollback behavior must be descriptor-only", errors);
  assertTrue(contract.retry_behavior_descriptor_only, "CP00-674 retry behavior must be descriptor-only", errors);
  assertTrue(contract.unit_tests_descriptor_only, "CP00-674 unit tests must be descriptor-only", errors);
  assertTrue(contract.integration_smoke_case_descriptor_only, "CP00-674 integration smoke must be descriptor-only", errors);
  assertTrue(contract.hermes_evidence_packet_descriptor_only, "CP00-674 Hermes evidence packet must be descriptor-only", errors);
  assertTrue(contract.claude_review_packet_descriptor_only, "CP00-674 Claude review packet must be descriptor-only", errors);
  assertTrue(contract.service_entrypoint_contract_defined, "CP00-674 must define service entrypoint contract", errors);
  assertTrue(contract.request_normalization_descriptor_only, "CP00-674 request normalization must be descriptor-only", errors);
  assertTrue(contract.tenant_boundary_precheck_required, "CP00-674 must require tenant boundary precheck", errors);
  assertTrue(contract.matter_trace_precheck_required, "CP00-674 must require Matter trace precheck", errors);
  assertTrue(contract.permission_precheck_required, "CP00-674 must require permission precheck", errors);
  assertTrue(contract.audit_hint_precheck_required, "CP00-674 must require audit hint precheck", errors);
  assertTrue(contract.primary_happy_path_descriptor_only, "CP00-674 primary happy path must be descriptor-only", errors);
  assertTrue(contract.secondary_workflow_path_descriptor_only, "CP00-674 secondary workflow path must be descriptor-only", errors);
  assertTrue(contract.state_transition_enforcement_descriptor_only, "CP00-674 state transition must be descriptor-only", errors);
  assertTrue(contract.idempotency_key_required, "CP00-674 must require idempotency key", errors);
  assertTrue(contract.lock_acquisition_rule_required, "CP00-674 must require lock acquisition rule", errors);
  assertTrue(contract.persistence_boundary_no_write, "CP00-674 must keep persistence no-write", errors);
  assertFalse(contract.golden_case_payload_included, "CP00-674 must not include golden case payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-674 must not open Hermes runtime", errors);
  assertFalse(contract.claude_runtime_opened, "CP00-674 must not open Claude runtime", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-674 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-674 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-674 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-674 must not open test runtime", errors);
  assertFalse(contract.persistence_runtime_opened, "CP00-674 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-674 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-674 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-674 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-674 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-674 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
export function validateExternalIntegrationsICp675Phase3FoundationBridgeDescriptor(
  descriptor = createExternalIntegrationsICp675Phase3FoundationBridgeDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.phase3_foundation_bridge_case_set ??
    createExternalIntegrationsICp675Phase3FoundationBridgeDescriptor().phase3_foundation_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp675Phase3FoundationBridgeDescriptor") {
    errors.push("CP00-675 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-675 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-675") errors.push("CP00-675 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-675 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-675 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-675 ${microId} micro title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-675 ${microId} row count drift`);
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-675 ${microId} missing row ${key}`);
        continue;
      }
      assertTrue(row.descriptor_only, `CP00-675 ${microId} ${key} must be descriptor-only`, errors);
      assertFalse(row.runtime_execution, `CP00-675 ${microId} ${key} must not execute runtime`, errors);
      assertTrue(row.customer_safe_errors_only, `CP00-675 ${microId} ${key} must be customer-safe`, errors);
      assertFalse(row.raw_payload_included, `CP00-675 ${microId} ${key} must not include raw payload`, errors);
    }
  }
  const contract = descriptor.phase3_foundation_bridge_contract ?? {};
  for (const [key, message] of Object.entries({
    claude_review_packet_tail_descriptor_only: "CP00-675 Claude review packet tail must be descriptor-only",
    closeout_next_handoff_descriptor_only: "CP00-675 closeout next handoff must be descriptor-only",
    scope_inventory_descriptor_only: "CP00-675 scope inventory must be descriptor-only",
    contract_draft_descriptor_only: "CP00-675 contract draft must be descriptor-only",
    type_shape_definition_descriptor_only: "CP00-675 type shape definition must be descriptor-only",
    primary_implementation_slice_descriptor_only: "CP00-675 primary implementation slice must be descriptor-only",
    secondary_workflow_slice_descriptor_only: "CP00-675 secondary workflow slice must be descriptor-only",
    permission_audit_binding_descriptor_only: "CP00-675 permission/audit binding must be descriptor-only",
    synthetic_fixture_descriptor_only: "CP00-675 synthetic fixture must be descriptor-only",
    public_export_map_descriptor_only: "CP00-675 public export map must be descriptor-only",
    request_contract_defined: "CP00-675 request contract must be defined",
    response_contract_defined: "CP00-675 response contract must be defined",
    error_code_taxonomy_descriptor_only: "CP00-675 error taxonomy must be descriptor-only",
    permission_annotation_required: "CP00-675 permission annotation must be required",
    audit_annotation_required: "CP00-675 audit annotation must be required",
    pagination_or_filtering_contract_defined: "CP00-675 pagination/filtering contract must be defined",
    serialization_guard_required: "CP00-675 serialization guard must be required",
    unauthorized_data_omission_required: "CP00-675 unauthorized data omission must be required",
    api_fixture_synthetic_only: "CP00-675 API fixture must be synthetic-only",
    contract_tests_descriptor_only: "CP00-675 contract tests must be descriptor-only",
    invalid_request_test_descriptor_only: "CP00-675 invalid request test must be descriptor-only",
    denied_response_test_descriptor_only: "CP00-675 denied response test must be descriptor-only",
    hermes_api_evidence_descriptor_only: "CP00-675 Hermes API evidence must be descriptor-only",
    claude_interface_prompt_read_only: "CP00-675 Claude interface prompt must be read-only",
    documentation_example_no_real_data: "CP00-675 documentation example must be no-real-data",
    versioning_note_descriptor_only: "CP00-675 versioning note must be descriptor-only",
    closeout_handoff_descriptor_only: "CP00-675 closeout handoff must be descriptor-only",
    downstream_consumer_note_descriptor_only: "CP00-675 downstream consumer note must be descriptor-only",
    command_rerun_recorded_only: "CP00-675 command rerun must be recorded-only",
    schema_drift_check_descriptor_only: "CP00-675 schema drift check must be descriptor-only",
    backward_compatibility_check_descriptor_only: "CP00-675 backward compatibility check must be descriptor-only",
  })) {
    assertTrue(contract[key], message, errors);
  }
  assertFalse(contract.golden_case_payload_included, "CP00-675 must not include golden case payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-675 must not open Hermes runtime", errors);
  assertFalse(contract.claude_runtime_opened, "CP00-675 must not open Claude runtime", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-675 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-675 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-675 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-675 must not open test runtime", errors);
  assertFalse(contract.persistence_runtime_opened, "CP00-675 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-675 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-675 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-675 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-675 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-675 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}


export function validateExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor(
  descriptor = createExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.ui_evidence_foundation_bridge_case_set ??
    createExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor().ui_evidence_foundation_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor") {
    errors.push("CP00-676 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-676 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-676") errors.push("CP00-676 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-676 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push("CP00-676 missing section " + microId);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push("CP00-676 " + microId + " micro title drift");
    }
    if (section.row_count !== titles.length) errors.push("CP00-676 " + microId + " row count drift");
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push("CP00-676 " + microId + " missing row " + key);
        continue;
      }
      assertTrue(row.descriptor_only, "CP00-676 " + microId + " " + key + " must be descriptor-only", errors);
      assertFalse(row.runtime_execution, "CP00-676 " + microId + " " + key + " must not execute runtime", errors);
      assertTrue(row.customer_safe_errors_only, "CP00-676 " + microId + " " + key + " must be customer-safe", errors);
      assertFalse(row.raw_payload_included, "CP00-676 " + microId + " " + key + " must not include raw payload", errors);
    }
  }
  const contract = descriptor.ui_evidence_foundation_bridge_contract ?? {};
  for (const [key, message] of Object.entries({
    synthetic_fixture_tail_descriptor_only: "CP00-676 synthetic fixture tail must be descriptor-only",
    test_golden_case_set_descriptor_only: "CP00-676 test/golden case set must be descriptor-only",
    hermes_evidence_packet_descriptor_only: "CP00-676 Hermes evidence packet must be descriptor-only",
    claude_review_packet_descriptor_only: "CP00-676 Claude review packet must be descriptor-only",
    closeout_next_handoff_descriptor_only: "CP00-676 closeout next handoff must be descriptor-only",
    scope_inventory_descriptor_only: "CP00-676 scope inventory must be descriptor-only",
    contract_draft_descriptor_only: "CP00-676 contract draft must be descriptor-only",
    type_shape_definition_descriptor_only: "CP00-676 type shape definition must be descriptor-only",
    primary_implementation_slice_descriptor_only: "CP00-676 primary implementation slice must be descriptor-only",
    public_export_map_descriptor_only: "CP00-676 public export map must be descriptor-only",
    request_contract_defined: "CP00-676 request contract must be defined",
    response_contract_defined: "CP00-676 response contract must be defined",
    error_code_taxonomy_descriptor_only: "CP00-676 error taxonomy must be descriptor-only",
    permission_annotation_required: "CP00-676 permission annotation must be required",
    audit_annotation_required: "CP00-676 audit annotation must be required",
    pagination_or_filtering_contract_defined: "CP00-676 pagination/filtering contract must be defined",
    serialization_guard_required: "CP00-676 serialization guard must be required",
    unauthorized_data_omission_required: "CP00-676 unauthorized data omission must be required",
    api_fixture_synthetic_only: "CP00-676 API fixture must be synthetic-only",
    contract_tests_descriptor_only: "CP00-676 contract tests must be descriptor-only",
    invalid_request_test_descriptor_only: "CP00-676 invalid request test must be descriptor-only",
    denied_response_test_descriptor_only: "CP00-676 denied response test must be descriptor-only",
    hermes_api_evidence_descriptor_only: "CP00-676 Hermes API evidence must be descriptor-only",
    claude_interface_prompt_read_only: "CP00-676 Claude interface prompt must be read-only",
    documentation_example_no_real_data: "CP00-676 documentation example must be no-real-data",
    versioning_note_descriptor_only: "CP00-676 versioning note must be descriptor-only",
    closeout_handoff_descriptor_only: "CP00-676 closeout handoff must be descriptor-only",
    downstream_consumer_note_descriptor_only: "CP00-676 downstream consumer note must be descriptor-only",
    command_rerun_recorded_only: "CP00-676 command rerun must be recorded-only",
    schema_drift_check_descriptor_only: "CP00-676 schema drift check must be descriptor-only",
    backward_compatibility_check_descriptor_only: "CP00-676 backward compatibility check must be descriptor-only",
    ui_surface_inventory_descriptor_only: "CP00-676 UI surface inventory must be descriptor-only",
    data_dependency_map_descriptor_only: "CP00-676 data dependency map must be descriptor-only",
    loading_state_descriptor_only: "CP00-676 loading state must be descriptor-only",
    empty_state_descriptor_only: "CP00-676 empty state must be descriptor-only",
    denied_state_descriptor_only: "CP00-676 denied state must be descriptor-only",
    review_required_state_descriptor_only: "CP00-676 review-required state must be descriptor-only",
    primary_interaction_descriptor_only: "CP00-676 primary interaction must be descriptor-only",
    secondary_interaction_descriptor_only: "CP00-676 secondary interaction must be descriptor-only",
    permission_badge_descriptor_only: "CP00-676 permission badge must be descriptor-only",
    audit_hint_display_descriptor_only: "CP00-676 audit hint display must be descriptor-only",
    error_message_copy_customer_safe: "CP00-676 error message copy must be customer-safe",
    responsive_desktop_layout_descriptor_only: "CP00-676 responsive desktop layout must be descriptor-only",
    responsive_mobile_layout_descriptor_only: "CP00-676 responsive mobile layout must be descriptor-only",
    keyboard_focus_behavior_descriptor_only: "CP00-676 keyboard/focus behavior must be descriptor-only",
    visual_density_check_descriptor_only: "CP00-676 visual density check must be descriptor-only",
    synthetic_fixture_binding_synthetic_only: "CP00-676 synthetic fixture binding must be synthetic-only",
    build_smoke_descriptor_only: "CP00-676 build smoke must be descriptor-only",
    hermes_ui_evidence_descriptor_only: "CP00-676 Hermes UI evidence must be descriptor-only",
    claude_ui_leak_prompt_read_only: "CP00-676 Claude UI leak prompt must be read-only",
  })) {
    assertTrue(contract[key], message, errors);
  }
  assertFalse(contract.golden_case_payload_included, "CP00-676 must not include golden case payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-676 must not open Hermes runtime", errors);
  assertFalse(contract.claude_runtime_opened, "CP00-676 must not open Claude runtime", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-676 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-676 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-676 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-676 must not open test runtime", errors);
  assertFalse(contract.ui_runtime_opened, "CP00-676 must not open UI runtime", errors);
  assertFalse(contract.persistence_runtime_opened, "CP00-676 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-676 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-676 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-676 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-676 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-676 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor(
  descriptor = createExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor(),
) {
  const errors = [];
  const caseSet =
    descriptor.ui_workflow_permission_audit_bridge_case_set ??
    createExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor().ui_workflow_permission_audit_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor") {
    errors.push("CP00-677 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-677 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-677") errors.push("CP00-677 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-677 section count drift");
  }
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push("CP00-677 missing section " + microId);
      continue;
    }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push("CP00-677 " + microId + " micro title drift");
    }
    if (section.row_count !== titles.length) errors.push("CP00-677 " + microId + " row count drift");
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push("CP00-677 " + microId + " missing row " + key);
        continue;
      }
      assertTrue(row.descriptor_only, "CP00-677 " + microId + " " + key + " must be descriptor-only", errors);
      assertFalse(row.runtime_execution, "CP00-677 " + microId + " " + key + " must not execute runtime", errors);
      assertTrue(row.customer_safe_errors_only, "CP00-677 " + microId + " " + key + " must be customer-safe", errors);
      assertFalse(row.raw_payload_included, "CP00-677 " + microId + " " + key + " must not include raw payload", errors);
    }
  }
  const contract = descriptor.ui_workflow_permission_audit_bridge_contract ?? {};
  for (const [key, message] of Object.entries({
    primary_implementation_tail_descriptor_only: "CP00-677 primary implementation tail must be descriptor-only",
    secondary_workflow_slice_descriptor_only: "CP00-677 secondary workflow slice must be descriptor-only",
    permission_audit_binding_descriptor_only: "CP00-677 permission/audit binding must be descriptor-only",
    state_snapshot_descriptor_only: "CP00-677 state snapshot must be descriptor-only",
    no_unauthorized_count_leak_required: "CP00-677 unauthorized count leak guard must be required",
    ui_surface_inventory_descriptor_only: "CP00-677 UI surface inventory must be descriptor-only",
    data_dependency_map_descriptor_only: "CP00-677 data dependency map must be descriptor-only",
    loading_state_descriptor_only: "CP00-677 loading state must be descriptor-only",
    empty_state_descriptor_only: "CP00-677 empty state must be descriptor-only",
    denied_state_descriptor_only: "CP00-677 denied state must be descriptor-only",
    review_required_state_descriptor_only: "CP00-677 review-required state must be descriptor-only",
    primary_interaction_descriptor_only: "CP00-677 primary interaction must be descriptor-only",
    secondary_interaction_descriptor_only: "CP00-677 secondary interaction must be descriptor-only",
    permission_badge_descriptor_only: "CP00-677 permission badge must be descriptor-only",
    audit_hint_display_descriptor_only: "CP00-677 audit hint display must be descriptor-only",
    error_message_copy_customer_safe: "CP00-677 error message copy must be customer-safe",
    responsive_desktop_layout_descriptor_only: "CP00-677 responsive desktop layout must be descriptor-only",
    responsive_mobile_layout_descriptor_only: "CP00-677 responsive mobile layout must be descriptor-only",
    keyboard_focus_behavior_descriptor_only: "CP00-677 keyboard/focus behavior must be descriptor-only",
    visual_density_check_descriptor_only: "CP00-677 visual density check must be descriptor-only",
    synthetic_fixture_binding_synthetic_only: "CP00-677 synthetic fixture binding must be synthetic-only",
    build_smoke_descriptor_only: "CP00-677 build smoke must be descriptor-only",
    hermes_ui_evidence_descriptor_only: "CP00-677 Hermes UI evidence must be descriptor-only",
    claude_ui_leak_prompt_read_only: "CP00-677 Claude UI leak prompt must be read-only",
  })) {
    assertTrue(contract[key], message, errors);
  }
  assertFalse(contract.golden_case_payload_included, "CP00-677 must not include golden case payloads", errors);
  assertFalse(contract.unauthorized_count_included, "CP00-677 must not include unauthorized counts", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-677 must not open Hermes runtime", errors);
  assertFalse(contract.claude_runtime_opened, "CP00-677 must not open Claude runtime", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-677 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-677 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-677 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-677 must not open test runtime", errors);
  assertFalse(contract.ui_runtime_opened, "CP00-677 must not open UI runtime", errors);
  assertFalse(contract.persistence_runtime_opened, "CP00-677 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-677 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-677 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-677 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-677 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-677 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor(descriptor = createExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor()) {
  const errors = [];
  const caseSet = descriptor.permission_audit_fixture_boundary_case_set ?? createExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor().permission_audit_fixture_boundary_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor") errors.push("CP00-678 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-678 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-678") errors.push("CP00-678 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.required_section_rows).length) errors.push("CP00-678 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-678 missing section " + microId); continue; }
    if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-678 " + microId + " micro title drift");
    if (section.row_count !== titles.length) errors.push("CP00-678 " + microId + " row count drift");
    for (const title of titles) {
      const key = externalIntegrationsIRowKey(title);
      const row = section.rows?.[key];
      if (!row) { errors.push("CP00-678 " + microId + " missing row " + key); continue; }
      assertTrue(row.descriptor_only, "CP00-678 " + microId + " " + key + " must be descriptor-only", errors);
      assertFalse(row.runtime_execution, "CP00-678 " + microId + " " + key + " must not execute runtime", errors);
      assertTrue(row.customer_safe_errors_only, "CP00-678 " + microId + " " + key + " must be customer-safe", errors);
      assertFalse(row.raw_payload_included, "CP00-678 " + microId + " " + key + " must not include raw payload", errors);
    }
  }
  const contract = descriptor.permission_audit_fixture_boundary_contract ?? {};
  for (const [key, message] of Object.entries({ permission_audit_binding_tail_descriptor_only: "CP00-678 permission/audit tail must be descriptor-only", synthetic_fixture_set_descriptor_only: "CP00-678 synthetic fixture set must be descriptor-only", build_smoke_descriptor_only: "CP00-678 build smoke must be descriptor-only", hermes_ui_evidence_descriptor_only: "CP00-678 Hermes UI evidence must be descriptor-only", claude_ui_leak_prompt_read_only: "CP00-678 Claude UI leak prompt must be read-only", closeout_handoff_descriptor_only: "CP00-678 closeout handoff must be descriptor-only", state_snapshot_descriptor_only: "CP00-678 state snapshot must be descriptor-only", no_unauthorized_count_leak_required: "CP00-678 unauthorized count leak guard must be required", ui_surface_inventory_descriptor_only: "CP00-678 UI surface inventory must be descriptor-only", data_dependency_map_descriptor_only: "CP00-678 data dependency map must be descriptor-only", loading_state_descriptor_only: "CP00-678 loading state must be descriptor-only", empty_state_descriptor_only: "CP00-678 empty state must be descriptor-only" })) assertTrue(contract[key], message, errors);
  assertFalse(contract.unauthorized_count_included, "CP00-678 must not include unauthorized counts", errors);
  assertFalse(contract.golden_case_payload_included, "CP00-678 must not include golden case payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-678 must not open Hermes runtime", errors);
  assertFalse(contract.claude_runtime_opened, "CP00-678 must not open Claude runtime", errors);
  assertFalse(contract.permission_runtime_opened, "CP00-678 must not open permission runtime", errors);
  assertFalse(contract.audit_runtime_opened, "CP00-678 must not open audit runtime", errors);
  assertFalse(contract.fixture_runtime_opened, "CP00-678 must not open fixture runtime", errors);
  assertFalse(contract.test_runtime_opened, "CP00-678 must not open test runtime", errors);
  assertFalse(contract.ui_runtime_opened, "CP00-678 must not open UI runtime", errors);
  assertFalse(contract.persistence_runtime_opened, "CP00-678 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-678 must not open external API runtime", errors);
  assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-678 must not persist credentials", errors);
  assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-678 must not open permission runtime", errors);
  assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-678 must not open audit runtime", errors);
  assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-678 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor(descriptor = createExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p05_fixture_foundation_bridge_case_set ?? createExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor().p05_fixture_foundation_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor") errors.push("CP00-679 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-679 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-679") errors.push("CP00-679 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.required_section_rows).length) errors.push("CP00-679 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-679 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-679 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-679 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-679 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-679 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-679 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-679 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-679 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p05_fixture_foundation_bridge_contract ?? {};
  for (const [key, message] of Object.entries({ p04_ui_evidence_tail_descriptor_only: "CP00-679 P04 UI evidence tail must be descriptor-only", p05_fixture_foundation_descriptor_only: "CP00-679 P05 fixture foundation must be descriptor-only", synthetic_fixture_set_descriptor_only: "CP00-679 synthetic fixture set must be descriptor-only", test_golden_case_set_descriptor_only: "CP00-679 test/golden set must be descriptor-only", hermes_evidence_packet_descriptor_only: "CP00-679 Hermes evidence packet must be descriptor-only", claude_review_packet_descriptor_only: "CP00-679 Claude review packet must be descriptor-only", closeout_next_handoff_descriptor_only: "CP00-679 closeout handoff must be descriptor-only", scope_inventory_descriptor_only: "CP00-679 scope inventory must be descriptor-only", contract_draft_descriptor_only: "CP00-679 contract draft must be descriptor-only", type_shape_definition_descriptor_only: "CP00-679 type shape definition must be descriptor-only", primary_implementation_slice_descriptor_only: "CP00-679 primary implementation slice must be descriptor-only", no_unauthorized_count_leak_required: "CP00-679 unauthorized count leak guard must be required", base_tenant_fixture_synthetic_only: "CP00-679 tenant fixture must be synthetic", base_user_fixture_synthetic_only: "CP00-679 user fixture must be synthetic", base_matter_fixture_synthetic_only: "CP00-679 matter fixture must be synthetic", base_document_fixture_synthetic_only: "CP00-679 document fixture must be synthetic", no_real_data_check_required: "CP00-679 no-real-data check must be required" })) assertTrue(contract[key], message, errors);
  assertFalse(contract.unauthorized_count_included, "CP00-679 must not include unauthorized counts", errors);
  assertFalse(contract.golden_case_payload_included, "CP00-679 must not include golden case payloads", errors);
  assertFalse(contract.real_fixture_payload_included, "CP00-679 must not include real fixture payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-679 must not open Hermes runtime", errors); assertFalse(contract.claude_runtime_opened, "CP00-679 must not open Claude runtime", errors); assertFalse(contract.permission_runtime_opened, "CP00-679 must not open permission runtime", errors); assertFalse(contract.audit_runtime_opened, "CP00-679 must not open audit runtime", errors); assertFalse(contract.fixture_runtime_opened, "CP00-679 must not open fixture runtime", errors); assertFalse(contract.test_runtime_opened, "CP00-679 must not open test runtime", errors); assertFalse(contract.ui_runtime_opened, "CP00-679 must not open UI runtime", errors); assertFalse(contract.persistence_runtime_opened, "CP00-679 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-679 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-679 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-679 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-679 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-679 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor(descriptor = createExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p05_primary_implementation_fixture_boundary_case_set ?? createExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor().p05_primary_implementation_fixture_boundary_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor") errors.push("CP00-680 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-680 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-680") errors.push("CP00-680 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.required_section_rows).length) errors.push("CP00-680 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-680 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-680 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-680 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-680 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-680 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-680 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-680 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-680 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p05_primary_implementation_fixture_boundary_contract ?? {};
  for (const [key, message] of Object.entries({ primary_implementation_slice_descriptor_only: "CP00-680 primary implementation slice must be descriptor-only", cross_tenant_case_descriptor_only: "CP00-680 cross-tenant case must be descriptor-only", missing_context_case_descriptor_only: "CP00-680 missing context case must be descriptor-only", audit_hint_case_descriptor_only: "CP00-680 audit hint case must be descriptor-only", security_trimming_case_descriptor_only: "CP00-680 security trimming case must be descriptor-only", ai_retrieval_or_analytics_case_descriptor_only: "CP00-680 AI retrieval or analytics case must be descriptor-only", fixture_manifest_descriptor_only: "CP00-680 fixture manifest must be descriptor-only", golden_test_descriptor_only: "CP00-680 golden test must be descriptor-only", failure_test_descriptor_only: "CP00-680 failure test must be descriptor-only", hermes_fixture_evidence_descriptor_only: "CP00-680 Hermes fixture evidence must be descriptor-only", claude_missing_test_prompt_read_only: "CP00-680 Claude missing-test prompt must be read-only", tenant_boundary_precheck_required: "CP00-680 tenant boundary precheck must be required", permission_precheck_required: "CP00-680 permission precheck must be required", audit_hint_required: "CP00-680 audit hint must be required", security_trimming_required: "CP00-680 security trimming must be required", no_real_data_check_required: "CP00-680 no-real-data check must be required" })) assertTrue(contract[key], message, errors);
  assertFalse(contract.cross_tenant_access_allowed, "CP00-680 must not allow cross-tenant access", errors);
  assertFalse(contract.missing_context_runtime_fallback_allowed, "CP00-680 must not allow missing-context runtime fallback", errors);
  assertFalse(contract.ai_retrieval_runtime_opened, "CP00-680 must not open AI retrieval runtime", errors);
  assertFalse(contract.analytics_runtime_opened, "CP00-680 must not open analytics runtime", errors);
  assertFalse(contract.fixture_payload_included, "CP00-680 must not include fixture payloads", errors);
  assertFalse(contract.golden_case_payload_included, "CP00-680 must not include golden case payloads", errors);
  assertFalse(contract.real_fixture_payload_included, "CP00-680 must not include real fixture payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-680 must not open Hermes runtime", errors); assertFalse(contract.claude_runtime_opened, "CP00-680 must not open Claude runtime", errors); assertFalse(contract.permission_runtime_opened, "CP00-680 must not open permission runtime", errors); assertFalse(contract.audit_runtime_opened, "CP00-680 must not open audit runtime", errors); assertFalse(contract.fixture_runtime_opened, "CP00-680 must not open fixture runtime", errors); assertFalse(contract.test_runtime_opened, "CP00-680 must not open test runtime", errors); assertFalse(contract.ui_runtime_opened, "CP00-680 must not open UI runtime", errors); assertFalse(contract.persistence_runtime_opened, "CP00-680 must not open persistence runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-680 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-680 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-680 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-680 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-680 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor(descriptor = createExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_scope_inventory_bridge_case_set ?? createExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor().p05_closeout_p06_scope_inventory_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor") errors.push("CP00-681 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-681 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-681") errors.push("CP00-681 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.required_section_rows).length) errors.push("CP00-681 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-681 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-681 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-681 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-681 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-681 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-681 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-681 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-681 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p05_closeout_p06_scope_inventory_bridge_contract ?? {};
  for (const [key, message] of Object.entries({ p05_primary_implementation_closeout_descriptor_only: "CP00-681 P05 primary implementation closeout must be descriptor-only", p05_secondary_workflow_slice_descriptor_only: "CP00-681 secondary workflow slice must be descriptor-only", p05_permission_audit_binding_descriptor_only: "CP00-681 permission/audit binding must be descriptor-only", p05_synthetic_fixture_set_descriptor_only: "CP00-681 synthetic fixture set must be descriptor-only", p05_test_golden_case_set_descriptor_only: "CP00-681 test/golden case set must be descriptor-only", p05_hermes_evidence_packet_descriptor_only: "CP00-681 Hermes evidence packet must be descriptor-only", p05_claude_review_packet_descriptor_only: "CP00-681 Claude review packet must be descriptor-only", p05_closeout_next_handoff_descriptor_only: "CP00-681 closeout handoff must be descriptor-only", p06_scope_inventory_descriptor_only: "CP00-681 P06 scope inventory must be descriptor-only", closeout_handoff_descriptor_only: "CP00-681 closeout handoff must be descriptor-only", no_real_data_check_required: "CP00-681 no-real-data check must be required", stable_id_check_required: "CP00-681 stable ID check must be required", replay_command_descriptor_only: "CP00-681 replay command must be descriptor-only", permission_matrix_row_descriptor_only: "CP00-681 permission matrix row must be descriptor-only", view_decision_binding_descriptor_only: "CP00-681 view decision binding must be descriptor-only", search_decision_binding_descriptor_only: "CP00-681 search decision binding must be descriptor-only", mutation_decision_binding_descriptor_only: "CP00-681 mutation decision binding must be descriptor-only", export_download_decision_binding_descriptor_only: "CP00-681 export/download decision binding must be descriptor-only", share_decision_binding_descriptor_only: "CP00-681 share decision binding must be descriptor-only", tenant_boundary_precheck_required: "CP00-681 tenant boundary precheck must be required", permission_precheck_required: "CP00-681 permission precheck must be required", audit_hint_required: "CP00-681 audit hint must be required", security_trimming_required: "CP00-681 security trimming must be required" })) assertTrue(contract[key], message, errors);
  assertFalse(contract.cross_tenant_access_allowed, "CP00-681 must not allow cross-tenant access", errors); assertFalse(contract.missing_context_runtime_fallback_allowed, "CP00-681 must not allow missing-context runtime fallback", errors); assertFalse(contract.ai_retrieval_runtime_opened, "CP00-681 must not open AI retrieval runtime", errors); assertFalse(contract.analytics_runtime_opened, "CP00-681 must not open analytics runtime", errors); assertFalse(contract.fixture_payload_included, "CP00-681 must not include fixture payloads", errors); assertFalse(contract.golden_case_payload_included, "CP00-681 must not include golden case payloads", errors); assertFalse(contract.real_fixture_payload_included, "CP00-681 must not include real fixture payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-681 must not open Hermes runtime", errors); assertFalse(contract.claude_runtime_opened, "CP00-681 must not open Claude runtime", errors); assertFalse(contract.permission_runtime_opened, "CP00-681 must not open permission runtime", errors); assertFalse(contract.audit_runtime_opened, "CP00-681 must not open audit runtime", errors); assertFalse(contract.fixture_runtime_opened, "CP00-681 must not open fixture runtime", errors); assertFalse(contract.test_runtime_opened, "CP00-681 must not open test runtime", errors); assertFalse(contract.ui_runtime_opened, "CP00-681 must not open UI runtime", errors); assertFalse(contract.persistence_runtime_opened, "CP00-681 must not open persistence runtime", errors); assertFalse(contract.command_runtime_opened, "CP00-681 must not open command runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-681 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-681 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-681 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-681 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-681 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor(descriptor = createExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p06_scope_contract_implementation_fixture_bridge_case_set ?? createExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor().p06_scope_contract_implementation_fixture_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor") errors.push("CP00-682 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-682 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-682") errors.push("CP00-682 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.required_section_rows).length) errors.push("CP00-682 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-682 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-682 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-682 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-682 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-682 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-682 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-682 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-682 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p06_scope_contract_implementation_fixture_bridge_contract ?? {};
  for (const [key, message] of Object.entries({ p06_scope_inventory_descriptor_only: "CP00-682 scope inventory must be descriptor-only", p06_contract_draft_descriptor_only: "CP00-682 contract draft must be descriptor-only", p06_type_shape_definition_descriptor_only: "CP00-682 type/shape definition must be descriptor-only", p06_primary_implementation_slice_descriptor_only: "CP00-682 primary implementation must be descriptor-only", p06_secondary_workflow_slice_descriptor_only: "CP00-682 secondary workflow must be descriptor-only", p06_permission_audit_binding_descriptor_only: "CP00-682 permission/audit binding must be descriptor-only", p06_synthetic_fixture_set_descriptor_only: "CP00-682 synthetic fixture set must be descriptor-only", p06_test_golden_case_set_descriptor_only: "CP00-682 test/golden case set must be descriptor-only", permission_matrix_row_descriptor_only: "CP00-682 permission matrix row must be descriptor-only", view_decision_binding_descriptor_only: "CP00-682 view decision binding must be descriptor-only", search_decision_binding_descriptor_only: "CP00-682 search decision binding must be descriptor-only", mutation_decision_binding_descriptor_only: "CP00-682 mutation decision binding must be descriptor-only", export_download_decision_binding_descriptor_only: "CP00-682 export/download decision binding must be descriptor-only", share_decision_binding_descriptor_only: "CP00-682 share decision binding must be descriptor-only", ai_retrieval_decision_binding_descriptor_only: "CP00-682 AI retrieval decision binding must be descriptor-only", audit_hint_fields_descriptor_only: "CP00-682 audit hint fields must be descriptor-only", matched_rule_capture_descriptor_only: "CP00-682 matched rule capture must be descriptor-only", deny_over_allow_check_required: "CP00-682 deny-over-allow check must be required", legal_hold_interaction_descriptor_only: "CP00-682 legal hold interaction must be descriptor-only", ethical_wall_interaction_descriptor_only: "CP00-682 ethical wall interaction must be descriptor-only", object_acl_interaction_descriptor_only: "CP00-682 object ACL interaction must be descriptor-only", review_required_route_descriptor_only: "CP00-682 review-required route must be descriptor-only", approval_required_route_descriptor_only: "CP00-682 approval-required route must be descriptor-only", security_trimming_proof_required: "CP00-682 security trimming proof must be required", audit_event_expectation_descriptor_only: "CP00-682 audit event expectation must be descriptor-only", permission_fixture_descriptor_only: "CP00-682 permission fixture must be descriptor-only", allowed_denied_tests_descriptor_only: "CP00-682 allowed/denied tests must be descriptor-only", cross_tenant_leak_prevention_tests_descriptor_only: "CP00-682 cross-tenant/leak-prevention tests must be descriptor-only" })) assertTrue(contract[key], message, errors);
  assertFalse(contract.cross_tenant_access_allowed, "CP00-682 must not allow cross-tenant access", errors); assertFalse(contract.missing_context_runtime_fallback_allowed, "CP00-682 must not allow missing-context runtime fallback", errors); assertFalse(contract.ai_retrieval_runtime_opened, "CP00-682 must not open AI retrieval runtime", errors); assertFalse(contract.analytics_runtime_opened, "CP00-682 must not open analytics runtime", errors); assertFalse(contract.fixture_payload_included, "CP00-682 must not include fixture payloads", errors); assertFalse(contract.golden_case_payload_included, "CP00-682 must not include golden case payloads", errors); assertFalse(contract.real_fixture_payload_included, "CP00-682 must not include real fixture payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-682 must not open Hermes runtime", errors); assertFalse(contract.claude_runtime_opened, "CP00-682 must not open Claude runtime", errors); assertFalse(contract.permission_runtime_opened, "CP00-682 must not open permission runtime", errors); assertFalse(contract.audit_runtime_opened, "CP00-682 must not open audit runtime", errors); assertFalse(contract.fixture_runtime_opened, "CP00-682 must not open fixture runtime", errors); assertFalse(contract.test_runtime_opened, "CP00-682 must not open test runtime", errors); assertFalse(contract.ui_runtime_opened, "CP00-682 must not open UI runtime", errors); assertFalse(contract.persistence_runtime_opened, "CP00-682 must not open persistence runtime", errors); assertFalse(contract.command_runtime_opened, "CP00-682 must not open command runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-682 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-682 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-682 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-682 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-682 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor(descriptor = createExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p06_test_golden_evidence_review_bridge_case_set ?? createExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor().p06_test_golden_evidence_review_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor") errors.push("CP00-683 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-683 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-683") errors.push("CP00-683 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.required_section_rows).length) errors.push("CP00-683 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-683 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-683 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-683 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-683 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-683 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-683 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-683 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-683 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p06_test_golden_evidence_review_bridge_contract ?? {};
  for (const [key, message] of Object.entries({ p06_test_golden_case_set_descriptor_only: "CP00-683 test/golden case set must be descriptor-only", p06_hermes_evidence_packet_descriptor_only: "CP00-683 Hermes evidence packet must be descriptor-only", p06_claude_review_packet_descriptor_only: "CP00-683 Claude review packet must be descriptor-only", permission_matrix_row_descriptor_only: "CP00-683 permission matrix row must be descriptor-only", view_decision_binding_descriptor_only: "CP00-683 view decision binding must be descriptor-only", ai_retrieval_decision_binding_descriptor_only: "CP00-683 AI retrieval decision binding must be descriptor-only", audit_hint_fields_descriptor_only: "CP00-683 audit hint fields must be descriptor-only", matched_rule_capture_descriptor_only: "CP00-683 matched rule capture must be descriptor-only", deny_over_allow_check_required: "CP00-683 deny-over-allow check must be required", legal_hold_interaction_descriptor_only: "CP00-683 legal hold interaction must be descriptor-only", ethical_wall_interaction_descriptor_only: "CP00-683 ethical wall interaction must be descriptor-only", object_acl_interaction_descriptor_only: "CP00-683 object ACL interaction must be descriptor-only", review_required_route_descriptor_only: "CP00-683 review-required route must be descriptor-only", approval_required_route_descriptor_only: "CP00-683 approval-required route must be descriptor-only", security_trimming_proof_required: "CP00-683 security trimming proof must be required", audit_event_expectation_descriptor_only: "CP00-683 audit event expectation must be descriptor-only", permission_fixture_descriptor_only: "CP00-683 permission fixture must be descriptor-only", allowed_denied_tests_descriptor_only: "CP00-683 allowed/denied tests must be descriptor-only", cross_tenant_leak_prevention_tests_descriptor_only: "CP00-683 cross-tenant/leak-prevention tests must be descriptor-only" })) assertTrue(contract[key], message, errors);
  assertFalse(contract.cross_tenant_access_allowed, "CP00-683 must not allow cross-tenant access", errors); assertFalse(contract.missing_context_runtime_fallback_allowed, "CP00-683 must not allow missing-context runtime fallback", errors); assertFalse(contract.ai_retrieval_runtime_opened, "CP00-683 must not open AI retrieval runtime", errors); assertFalse(contract.analytics_runtime_opened, "CP00-683 must not open analytics runtime", errors); assertFalse(contract.fixture_payload_included, "CP00-683 must not include fixture payloads", errors); assertFalse(contract.golden_case_payload_included, "CP00-683 must not include golden case payloads", errors); assertFalse(contract.real_fixture_payload_included, "CP00-683 must not include real fixture payloads", errors);
  assertFalse(contract.hermes_runtime_opened, "CP00-683 must not open Hermes runtime", errors); assertFalse(contract.claude_runtime_opened, "CP00-683 must not open Claude runtime", errors); assertFalse(contract.permission_runtime_opened, "CP00-683 must not open permission runtime", errors); assertFalse(contract.audit_runtime_opened, "CP00-683 must not open audit runtime", errors); assertFalse(contract.fixture_runtime_opened, "CP00-683 must not open fixture runtime", errors); assertFalse(contract.test_runtime_opened, "CP00-683 must not open test runtime", errors); assertFalse(contract.ui_runtime_opened, "CP00-683 must not open UI runtime", errors); assertFalse(contract.persistence_runtime_opened, "CP00-683 must not open persistence runtime", errors); assertFalse(contract.command_runtime_opened, "CP00-683 must not open command runtime", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-683 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-683 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-683 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-683 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-683 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
export function validateExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor(descriptor = createExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p06_review_closeout_p07_failure_foundation_bridge_case_set ?? createExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor().p06_review_closeout_p07_failure_foundation_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor") errors.push("CP00-684 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-684 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-684") errors.push("CP00-684 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.required_section_rows).length) errors.push("CP00-684 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-684 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-684 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-684 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-684 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-684 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-684 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-684 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-684 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p06_review_closeout_p07_failure_foundation_bridge_contract ?? {};
  for (const key of ["p06_claude_review_packet_tail_descriptor_only", "p06_closeout_handoff_descriptor_only", "p07_scope_inventory_descriptor_only", "p07_contract_draft_descriptor_only", "p07_type_shape_definition_descriptor_only", "p07_primary_implementation_slice_descriptor_only", "p07_secondary_workflow_slice_descriptor_only", "p07_permission_audit_binding_descriptor_only", "search_decision_binding_descriptor_only", "mutation_decision_binding_descriptor_only", "export_download_decision_binding_descriptor_only", "share_decision_binding_descriptor_only", "ai_retrieval_decision_binding_descriptor_only", "audit_hint_fields_descriptor_only", "matched_rule_capture_descriptor_only", "deny_over_allow_check_required", "legal_hold_interaction_descriptor_only", "ethical_wall_interaction_descriptor_only", "object_acl_interaction_descriptor_only", "review_required_route_descriptor_only", "approval_required_route_descriptor_only", "security_trimming_proof_required", "audit_event_expectation_descriptor_only", "permission_fixture_descriptor_only", "allowed_denied_tests_descriptor_only", "cross_tenant_leak_prevention_tests_descriptor_only", "failure_taxonomy_descriptor_only", "missing_tenant_failure_descriptor_only", "missing_actor_failure_descriptor_only", "missing_matter_failure_descriptor_only", "missing_resource_failure_descriptor_only", "unknown_action_failure_descriptor_only", "cross_tenant_failure_descriptor_only", "permission_denied_failure_descriptor_only", "ambiguous_rule_failure_descriptor_only", "stale_reference_failure_descriptor_only", "lock_conflict_failure_descriptor_only", "retry_exhaustion_failure_descriptor_only", "rollback_expectation_descriptor_only", "compensation_expectation_descriptor_only", "blocked_claim_receipt_descriptor_only", "failure_fixture_descriptor_only", "failure_unit_test_descriptor_only", "failure_integration_smoke_descriptor_only", "audit_failure_hint_descriptor_only", "hermes_failure_evidence_descriptor_only", "claude_edge_case_prompt_descriptor_only", "human_escalation_note_descriptor_only"]) assertTrue(contract[key], "CP00-684 " + key + " must be true", errors);
  for (const key of ["cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "ai_retrieval_runtime_opened", "analytics_runtime_opened", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "hermes_runtime_opened", "claude_runtime_opened", "permission_runtime_opened", "audit_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "blocked_claim_runtime_receipt_emitted"]) assertFalse(contract[key], "CP00-684 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-684 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-684 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-684 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-684 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-684 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor(descriptor = createExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p07_permission_audit_failure_slice_case_set ?? createExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor().p07_permission_audit_failure_slice_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor") errors.push("CP00-685 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-685 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-685") errors.push("CP00-685 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.required_section_rows).length) errors.push("CP00-685 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-685 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-685 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-685 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-685 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-685 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-685 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-685 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-685 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p07_permission_audit_failure_slice_contract ?? {};
  for (const key of ["p07_permission_audit_binding_descriptor_only", "missing_resource_failure_descriptor_only", "unknown_action_failure_descriptor_only", "cross_tenant_failure_descriptor_only", "permission_denied_failure_descriptor_only", "ambiguous_rule_failure_descriptor_only", "stale_reference_failure_descriptor_only", "lock_conflict_failure_descriptor_only", "retry_exhaustion_failure_descriptor_only", "rollback_expectation_descriptor_only", "compensation_expectation_descriptor_only", "permission_denied_security_audit_descriptor_only"]) assertTrue(contract[key], "CP00-685 " + key + " must be true", errors);
  for (const key of ["cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "real_failure_payload_included", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-685 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-685 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-685 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-685 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-685 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-685 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor(descriptor = createExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p07_blocked_claim_fixture_taxonomy_bridge_case_set ?? createExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor().p07_blocked_claim_fixture_taxonomy_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor") errors.push("CP00-686 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-686 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-686") errors.push("CP00-686 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.required_section_rows).length) errors.push("CP00-686 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-686 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-686 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-686 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-686 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-686 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-686 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-686 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-686 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p07_blocked_claim_fixture_taxonomy_bridge_contract ?? {};
  for (const key of ["p07_permission_audit_binding_descriptor_only", "blocked_claim_receipt_descriptor_only", "failure_fixture_descriptor_only", "failure_unit_test_descriptor_only", "failure_integration_smoke_descriptor_only", "audit_failure_hint_descriptor_only", "hermes_failure_evidence_descriptor_only", "claude_edge_case_prompt_descriptor_only", "human_escalation_note_descriptor_only", "failure_taxonomy_descriptor_only", "missing_tenant_failure_descriptor_only"]) assertTrue(contract[key], "CP00-686 " + key + " must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-686 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-686 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-686 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-686 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-686 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-686 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor(descriptor = createExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p07_fixture_evidence_review_p08_foundation_bridge_case_set ?? createExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor().p07_fixture_evidence_review_p08_foundation_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor") errors.push("CP00-687 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-687 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-687") errors.push("CP00-687 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.required_section_rows).length) errors.push("CP00-687 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-687 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-687 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-687 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-687 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-687 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-687 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-687 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-687 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p07_fixture_evidence_review_p08_foundation_bridge_contract ?? {};
  for (const key of ["p07_synthetic_fixture_set_descriptor_only", "p07_test_and_golden_case_set_descriptor_only", "p07_hermes_evidence_packet_descriptor_only", "p07_claude_review_packet_descriptor_only", "p07_closeout_handoff_descriptor_only", "p08_scope_inventory_descriptor_only", "p08_contract_draft_descriptor_only", "p08_type_shape_definition_descriptor_only"]) assertTrue(contract[key], "CP00-687 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-687 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-687 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-687 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-687 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-687 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-687 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-687 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}


export function validateExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor(descriptor = createExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p08_evidence_implementation_workflow_bridge_case_set ?? createExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor().p08_evidence_implementation_workflow_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor") errors.push("CP00-688 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-688 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-688") errors.push("CP00-688 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.required_section_rows).length) errors.push("CP00-688 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-688 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-688 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-688 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-688 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-688 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-688 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-688 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-688 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p08_evidence_implementation_workflow_bridge_contract ?? {};
  for (const key of ["p08_type_shape_definition_descriptor_only", "p08_primary_implementation_slice_descriptor_only", "p08_secondary_workflow_slice_descriptor_only"]) assertTrue(contract[key], "CP00-688 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-688 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-688 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-688 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-688 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-688 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-688 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-688 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}


export function validateExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor(descriptor = createExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p08_workflow_permission_fixture_bridge_case_set ?? createExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor().p08_workflow_permission_fixture_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor") errors.push("CP00-689 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-689 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-689") errors.push("CP00-689 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.required_section_rows).length) errors.push("CP00-689 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-689 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-689 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-689 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-689 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-689 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-689 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-689 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-689 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p08_workflow_permission_fixture_bridge_contract ?? {};
  for (const key of ["p08_secondary_workflow_slice_descriptor_only", "p08_permission_audit_binding_descriptor_only", "p08_synthetic_fixture_set_descriptor_only"]) assertTrue(contract[key], "CP00-689 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-689 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-689 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-689 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-689 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-689 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-689 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-689 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor(descriptor = createExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p08_p09_review_handoff_foundation_bridge_case_set ?? createExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor().p08_p09_review_handoff_foundation_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor") errors.push("CP00-690 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-690 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-690") errors.push("CP00-690 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.required_section_rows).length) errors.push("CP00-690 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-690 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-690 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-690 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-690 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-690 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-690 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-690 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-690 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p08_p09_review_handoff_foundation_bridge_contract ?? {};
  for (const key of ["p08_synthetic_fixture_set_descriptor_only", "p08_test_and_golden_case_set_descriptor_only", "p08_hermes_evidence_packet_descriptor_only", "p08_claude_review_packet_descriptor_only", "p08_closeout_and_next_handoff_descriptor_only", "p09_scope_inventory_descriptor_only", "p09_contract_draft_descriptor_only", "p09_type_and_shape_definition_descriptor_only", "p09_primary_implementation_slice_descriptor_only"]) assertTrue(contract[key], "CP00-690 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-690 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-690 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-690 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-690 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-690 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-690 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-690 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor(descriptor = createExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p09_workflow_permission_audit_bridge_case_set ?? createExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor().p09_workflow_permission_audit_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor") errors.push("CP00-691 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-691 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-691") errors.push("CP00-691 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.required_section_rows).length) errors.push("CP00-691 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-691 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-691 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-691 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-691 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-691 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-691 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-691 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-691 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p09_workflow_permission_audit_bridge_contract ?? {};
  for (const key of ["p09_secondary_workflow_slice_descriptor_only", "p09_permission_and_audit_binding_descriptor_only"]) assertTrue(contract[key], "CP00-691 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-691 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "security_audit_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-691 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-691 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-691 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-691 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-691 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-691 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor(descriptor = createExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p09_permission_audit_synthetic_fixture_bridge_case_set ?? createExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor().p09_permission_audit_synthetic_fixture_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor") errors.push("CP00-692 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-692 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-692") errors.push("CP00-692 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.required_section_rows).length) errors.push("CP00-692 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-692 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-692 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-692 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-692 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-692 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-692 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-692 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-692 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p09_permission_audit_synthetic_fixture_bridge_contract ?? {};
  for (const key of ["p09_permission_and_audit_binding_tail_descriptor_only", "p09_synthetic_fixture_set_foundation_descriptor_only"]) assertTrue(contract[key], "CP00-692 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-692 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "security_audit_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-692 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-692 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-692 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-692 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-692 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-692 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor(descriptor = createExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor()) {
  const errors = [];
  const caseSet = descriptor.p09_synthetic_fixture_evidence_review_closeout_bridge_case_set ?? createExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor().p09_synthetic_fixture_evidence_review_closeout_bridge_case_set;
  if (descriptor.descriptor !== "ExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor") errors.push("CP00-693 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP22") errors.push("CP00-693 program id drift");
  if (descriptor.pack_binding?.pack_id !== "CP00-693") errors.push("CP00-693 pack binding drift");
  if (caseSet.section_count !== Object.keys(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.required_section_rows).length) errors.push("CP00-693 section count drift");
  for (const [microId, titles] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.required_section_rows)) { const section = caseSet.sections?.[microId]; if (!section) { errors.push("CP00-693 missing section " + microId); continue; } if (section.micro_title !== EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-693 " + microId + " micro title drift"); if (section.row_count !== titles.length) errors.push("CP00-693 " + microId + " row count drift"); for (const title of titles) { const key = externalIntegrationsIRowKey(title); const row = section.rows?.[key]; if (!row) { errors.push("CP00-693 " + microId + " missing row " + key); continue; } assertTrue(row.descriptor_only, "CP00-693 " + microId + " " + key + " must be descriptor-only", errors); assertFalse(row.runtime_execution, "CP00-693 " + microId + " " + key + " must not execute runtime", errors); assertTrue(row.customer_safe_errors_only, "CP00-693 " + microId + " " + key + " must be customer-safe", errors); assertFalse(row.raw_payload_included, "CP00-693 " + microId + " " + key + " must not include raw payload", errors); } }
  const contract = descriptor.p09_synthetic_fixture_evidence_review_closeout_bridge_contract ?? {};
  for (const key of ["p09_synthetic_fixture_set_tail_descriptor_only","p09_test_and_golden_case_set_descriptor_only","p09_hermes_evidence_packet_descriptor_only","p09_claude_review_packet_descriptor_only","p09_closeout_and_next_handoff_head_descriptor_only"]) assertTrue(contract[key], "CP00-693 " + key + " must be true", errors);
  for (const title of [...new Set(Object.values(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS.required_section_rows).flat())]) assertTrue(contract[externalIntegrationsIRowKey(title) + "_descriptor_only"], "CP00-693 " + externalIntegrationsIRowKey(title) + "_descriptor_only must be true", errors);
  for (const key of ["blocked_claim_runtime_receipt_emitted", "fixture_payload_included", "golden_case_payload_included", "real_fixture_payload_included", "real_failure_payload_included", "cross_tenant_access_allowed", "missing_context_runtime_fallback_allowed", "permission_runtime_opened", "audit_runtime_opened", "failure_recovery_runtime_opened", "rollback_runtime_opened", "compensation_runtime_opened", "fixture_runtime_opened", "test_runtime_opened", "ui_runtime_opened", "security_audit_runtime_opened", "persistence_runtime_opened", "command_runtime_opened", "hermes_runtime_opened", "claude_runtime_opened"]) assertFalse(contract[key], "CP00-693 " + key + " must remain false", errors);
  assertFalse(descriptor.runtime_boundary?.external_api_runtime_opened, "CP00-693 must not open external API runtime", errors); assertFalse(descriptor.runtime_boundary?.credential_persistence_opened, "CP00-693 must not persist credentials", errors); assertFalse(descriptor.runtime_boundary?.permission_runtime_opened, "CP00-693 must not open permission runtime", errors); assertFalse(descriptor.runtime_boundary?.audit_runtime_opened, "CP00-693 must not open audit runtime", errors); assertFalse(descriptor.authority_boundary?.claude_is_final_approval, "CP00-693 must not promote Claude to final approval", errors);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateExternalIntegrationsICoreContractProjection(
  contractProjection = createExternalIntegrationsICoreContractProjection(),
  options = {},
) {
  const errors = [];
  if (contractProjection.schema_version !== "law-firm-os.external-integrations-i.contract.v0.1") {
    errors.push("External Integrations I contract schema version drift");
  }
  if (contractProjection.generated_from_pack_id !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id) {
    errors.push("External Integrations I generated pack drift");
  }
  if (contractProjection.program?.program_id !== EXTERNAL_INTEGRATIONS_I_PROGRAM_CONTRACT.program_id) {
    errors.push("External Integrations I program id drift");
  }
  if (contractProjection.program?.package_path !== "packages/integrations-core") {
    errors.push("External Integrations I package path drift");
  }
  if (contractProjection.current_pack?.pack_id !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.pack_id) {
    errors.push("External Integrations I current pack drift");
  }
  if (contractProjection.current_pack?.next_subphase_id !== EXTERNAL_INTEGRATIONS_I_CP693_PACK_BINDING.next_subphase_id) {
    errors.push("External Integrations I next subphase drift");
  }
  const descriptorValidation = validateExternalIntegrationsICp666ScopeDomainFoundationDescriptor(contractProjection.cp666_descriptor);
  if (!descriptorValidation.valid) errors.push(...descriptorValidation.errors);
  const cp667DescriptorValidation = validateExternalIntegrationsICp667DomainModelContinuationDescriptor(contractProjection.cp667_descriptor);
  if (!cp667DescriptorValidation.valid) errors.push(...cp667DescriptorValidation.errors);
  const cp668DescriptorValidation = validateExternalIntegrationsICp668PermissionAuditFixtureBridgeDescriptor(contractProjection.cp668_descriptor);
  if (!cp668DescriptorValidation.valid) errors.push(...cp668DescriptorValidation.errors);
  const cp669DescriptorValidation = validateExternalIntegrationsICp669ServiceContractTypeShapeFoundationDescriptor(contractProjection.cp669_descriptor);
  if (!cp669DescriptorValidation.valid) errors.push(...cp669DescriptorValidation.errors);
  const cp670DescriptorValidation = validateExternalIntegrationsICp670ServiceImplementationSliceDescriptor(contractProjection.cp670_descriptor);
  if (!cp670DescriptorValidation.valid) errors.push(...cp670DescriptorValidation.errors);
  const cp671DescriptorValidation = validateExternalIntegrationsICp671PermissionAuditFixtureBridgeV2Descriptor(contractProjection.cp671_descriptor);
  if (!cp671DescriptorValidation.valid) errors.push(...cp671DescriptorValidation.errors);
  const cp672DescriptorValidation = validateExternalIntegrationsICp672SyntheticFixtureTestGoldenBridgeDescriptor(contractProjection.cp672_descriptor);
  if (!cp672DescriptorValidation.valid) errors.push(...cp672DescriptorValidation.errors);
  const cp673DescriptorValidation = validateExternalIntegrationsICp673TestGoldenBoundaryPrecheckDescriptor(contractProjection.cp673_descriptor);
  if (!cp673DescriptorValidation.valid) errors.push(...cp673DescriptorValidation.errors);
  const cp674DescriptorValidation = validateExternalIntegrationsICp674EvidenceReviewBridgeDescriptor(contractProjection.cp674_descriptor);
  if (!cp674DescriptorValidation.valid) errors.push(...cp674DescriptorValidation.errors);
  const cp675DescriptorValidation = validateExternalIntegrationsICp675Phase3FoundationBridgeDescriptor(contractProjection.cp675_descriptor);
  if (!cp675DescriptorValidation.valid) errors.push(...cp675DescriptorValidation.errors);
  const cp676DescriptorValidation = validateExternalIntegrationsICp676UiEvidenceFoundationBridgeDescriptor(contractProjection.cp676_descriptor);
  if (!cp676DescriptorValidation.valid) errors.push(...cp676DescriptorValidation.errors);
  const cp677DescriptorValidation = validateExternalIntegrationsICp677UiWorkflowPermissionAuditBridgeDescriptor(contractProjection.cp677_descriptor);
  if (!cp677DescriptorValidation.valid) errors.push(...cp677DescriptorValidation.errors);
  const cp678DescriptorValidation = validateExternalIntegrationsICp678PermissionAuditFixtureBoundaryDescriptor(contractProjection.cp678_descriptor);
  if (!cp678DescriptorValidation.valid) errors.push(...cp678DescriptorValidation.errors);
  const cp679DescriptorValidation = validateExternalIntegrationsICp679P05FixtureFoundationBridgeDescriptor(contractProjection.cp679_descriptor);
  if (!cp679DescriptorValidation.valid) errors.push(...cp679DescriptorValidation.errors);
  const cp680DescriptorValidation = validateExternalIntegrationsICp680P05PrimaryImplementationFixtureBoundaryDescriptor(contractProjection.cp680_descriptor);
  if (!cp680DescriptorValidation.valid) errors.push(...cp680DescriptorValidation.errors);
  const cp681DescriptorValidation = validateExternalIntegrationsICp681P05CloseoutP06ScopeInventoryBridgeDescriptor(contractProjection.cp681_descriptor);
  if (!cp681DescriptorValidation.valid) errors.push(...cp681DescriptorValidation.errors);
  const cp682DescriptorValidation = validateExternalIntegrationsICp682P06ScopeContractImplementationFixtureBridgeDescriptor(contractProjection.cp682_descriptor);
  if (!cp682DescriptorValidation.valid) errors.push(...cp682DescriptorValidation.errors);
  const cp683DescriptorValidation = validateExternalIntegrationsICp683P06TestGoldenEvidenceReviewBridgeDescriptor(contractProjection.cp683_descriptor);
  if (!cp683DescriptorValidation.valid) errors.push(...cp683DescriptorValidation.errors);
  const cp684DescriptorValidation = validateExternalIntegrationsICp684P06ReviewCloseoutP07FailureFoundationBridgeDescriptor(contractProjection.cp684_descriptor);
  if (!cp684DescriptorValidation.valid) errors.push(...cp684DescriptorValidation.errors);
  const cp685DescriptorValidation = validateExternalIntegrationsICp685P07PermissionAuditFailureSliceDescriptor(contractProjection.cp685_descriptor);
  if (!cp685DescriptorValidation.valid) errors.push(...cp685DescriptorValidation.errors);
  const cp686DescriptorValidation = validateExternalIntegrationsICp686P07BlockedClaimFixtureTaxonomyBridgeDescriptor(contractProjection.cp686_descriptor);
  if (!cp686DescriptorValidation.valid) errors.push(...cp686DescriptorValidation.errors);
  const cp687DescriptorValidation = validateExternalIntegrationsICp687P07FixtureEvidenceReviewP08FoundationBridgeDescriptor(contractProjection.cp687_descriptor);
  if (!cp687DescriptorValidation.valid) errors.push(...cp687DescriptorValidation.errors);
  const cp688DescriptorValidation = validateExternalIntegrationsICp688P08EvidenceImplementationWorkflowBridgeDescriptor(contractProjection.cp688_descriptor);
  if (!cp688DescriptorValidation.valid) errors.push(...cp688DescriptorValidation.errors);
  const cp689DescriptorValidation = validateExternalIntegrationsICp689P08WorkflowPermissionFixtureBridgeDescriptor(contractProjection.cp689_descriptor);
  if (!cp689DescriptorValidation.valid) errors.push(...cp689DescriptorValidation.errors);
  const cp690DescriptorValidation = validateExternalIntegrationsICp690P08P09ReviewHandoffFoundationBridgeDescriptor(contractProjection.cp690_descriptor);
  if (!cp690DescriptorValidation.valid) errors.push(...cp690DescriptorValidation.errors);
  const cp691DescriptorValidation = validateExternalIntegrationsICp691P09WorkflowPermissionAuditBridgeDescriptor(contractProjection.cp691_descriptor);
  if (!cp691DescriptorValidation.valid) errors.push(...cp691DescriptorValidation.errors);
  const cp692DescriptorValidation = validateExternalIntegrationsICp692P09PermissionAuditSyntheticFixtureBridgeDescriptor(contractProjection.cp692_descriptor);
  if (!cp692DescriptorValidation.valid) errors.push(...cp692DescriptorValidation.errors);
  const cp693DescriptorValidation = validateExternalIntegrationsICp693P09SyntheticFixtureEvidenceReviewCloseoutBridgeDescriptor(contractProjection.cp693_descriptor);
  if (!cp693DescriptorValidation.valid) errors.push(...cp693DescriptorValidation.errors);
  if (JSON.stringify(contractProjection.cp666_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP666_REQUIREMENTS)) {
    errors.push("CP00-666 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp667_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP667_REQUIREMENTS)) {
    errors.push("CP00-667 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp668_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP668_REQUIREMENTS)) {
    errors.push("CP00-668 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp669_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP669_REQUIREMENTS)) {
    errors.push("CP00-669 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp670_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP670_REQUIREMENTS)) {
    errors.push("CP00-670 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp671_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP671_REQUIREMENTS)) {
    errors.push("CP00-671 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp672_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP672_REQUIREMENTS)) {
    errors.push("CP00-672 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp673_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP673_REQUIREMENTS)) {
    errors.push("CP00-673 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp674_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP674_REQUIREMENTS)) {
    errors.push("CP00-674 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp675_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP675_REQUIREMENTS)) {
    errors.push("CP00-675 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp676_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP676_REQUIREMENTS)) {
    errors.push("CP00-676 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp677_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP677_REQUIREMENTS)) {
    errors.push("CP00-677 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp678_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP678_REQUIREMENTS)) {
    errors.push("CP00-678 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp679_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP679_REQUIREMENTS)) {
    errors.push("CP00-679 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp680_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP680_REQUIREMENTS)) {
    errors.push("CP00-680 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp681_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP681_REQUIREMENTS)) {
    errors.push("CP00-681 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp682_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP682_REQUIREMENTS)) {
    errors.push("CP00-682 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp683_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP683_REQUIREMENTS)) {
    errors.push("CP00-683 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp684_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP684_REQUIREMENTS)) {
    errors.push("CP00-684 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp685_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP685_REQUIREMENTS)) {
    errors.push("CP00-685 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp686_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP686_REQUIREMENTS)) {
    errors.push("CP00-686 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp687_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP687_REQUIREMENTS)) {
    errors.push("CP00-687 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp688_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP688_REQUIREMENTS)) {
    errors.push("CP00-688 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp689_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP689_REQUIREMENTS)) {
    errors.push("CP00-689 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp690_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP690_REQUIREMENTS)) {
    errors.push("CP00-690 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp691_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP691_REQUIREMENTS)) {
    errors.push("CP00-691 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp692_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP692_REQUIREMENTS)) {
    errors.push("CP00-692 requirements projection drift");
  }
  if (JSON.stringify(contractProjection.cp693_requirements) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP693_REQUIREMENTS)) {
    errors.push("CP00-693 requirements projection drift");
  }
  for (const packNumber of [666, 667, 668, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693]) {
    const attestationKey = `cp${packNumber}_no_write_attestation`;
    if (JSON.stringify(contractProjection[attestationKey]) !== JSON.stringify(EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION)) {
      errors.push(`CP00-${packNumber} no-write attestation projection drift`);
    }
    for (const [key, value] of Object.entries(EXTERNAL_INTEGRATIONS_I_CP666_NO_WRITE_ATTESTATION)) {
      if (value === false && contractProjection[attestationKey]?.[key] !== false) {
        errors.push(`CP00-${packNumber} no-write attestation must keep ${key}=false`);
      }
      if (value === true && contractProjection[attestationKey]?.[key] !== true) {
        errors.push(`CP00-${packNumber} no-write attestation must keep ${key}=true`);
      }
    }
  }
  if (options.expectedProjection) {
    const actual = JSON.parse(JSON.stringify(contractProjection));
    const expected = JSON.parse(JSON.stringify(options.expectedProjection));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push("External Integrations I contract projection does not match expected projection");
  }
  return freezeCp666Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
