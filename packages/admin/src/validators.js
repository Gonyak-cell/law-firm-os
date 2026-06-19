import {
  ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP645_PACK_BINDING,
  ADMIN_CONSOLE_CP645_REQUIREMENTS,
  ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP646_PACK_BINDING,
  ADMIN_CONSOLE_CP646_REQUIREMENTS,
  ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP647_PACK_BINDING,
  ADMIN_CONSOLE_CP647_REQUIREMENTS,
  ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP648_PACK_BINDING,
  ADMIN_CONSOLE_CP648_REQUIREMENTS,
  ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP649_PACK_BINDING,
  ADMIN_CONSOLE_CP649_REQUIREMENTS,
  ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP650_PACK_BINDING,
  ADMIN_CONSOLE_CP650_REQUIREMENTS,
  ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP651_PACK_BINDING,
  ADMIN_CONSOLE_CP651_REQUIREMENTS,
  ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP652_PACK_BINDING,
  ADMIN_CONSOLE_CP652_REQUIREMENTS,
  ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP653_PACK_BINDING,
  ADMIN_CONSOLE_CP653_REQUIREMENTS,
  ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP654_PACK_BINDING,
  ADMIN_CONSOLE_CP654_REQUIREMENTS,
  ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP655_PACK_BINDING,
  ADMIN_CONSOLE_CP655_REQUIREMENTS,
  ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP656_PACK_BINDING,
  ADMIN_CONSOLE_CP656_REQUIREMENTS,
  ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP657_PACK_BINDING,
  ADMIN_CONSOLE_CP657_REQUIREMENTS,
  ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP658_PACK_BINDING,
  ADMIN_CONSOLE_CP658_REQUIREMENTS,
  ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP659_PACK_BINDING,
  ADMIN_CONSOLE_CP659_REQUIREMENTS,
  ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP660_PACK_BINDING,
  ADMIN_CONSOLE_CP660_REQUIREMENTS,
  ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP661_PACK_BINDING,
  ADMIN_CONSOLE_CP661_REQUIREMENTS,
  ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP662_PACK_BINDING,
  ADMIN_CONSOLE_CP662_REQUIREMENTS,
  ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP663_PACK_BINDING,
  ADMIN_CONSOLE_CP663_REQUIREMENTS,
  ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP664_PACK_BINDING,
  ADMIN_CONSOLE_CP664_REQUIREMENTS,
  ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP665_PACK_BINDING,
  ADMIN_CONSOLE_CP665_REQUIREMENTS,
  ADMIN_CONSOLE_PROGRAM_CONTRACT,
} from "./registry.js";
import {
  adminConsoleRowKey,
  createAdminConsoleCoreContractProjection,
  createAdminConsoleCp665ReviewEvidenceCloseoutBridgeCaseSet,
  createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor,
  createAdminConsoleCp664TestGoldenReviewTailCaseSet,
  createAdminConsoleCp664TestGoldenReviewTailDescriptor,
  createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeCaseSet,
  createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor,
  createAdminConsoleCp662EvidencePermissionFixtureBridgeCaseSet,
  createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor,
  createAdminConsoleCp663ReviewReadinessBridgeCaseSet,
  createAdminConsoleCp663ReviewReadinessBridgeDescriptor,
  createAdminConsoleCp660FailureRecoveryFixtureTransitionCaseSet,
  createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor,
  createAdminConsoleCp659FailureRecoveryPermissionAuditBindingCaseSet,
  createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor,
  createAdminConsoleCp658FailureReceiptEscalationCaseSet,
  createAdminConsoleCp658FailureReceiptEscalationDescriptor,
  createAdminConsoleCp657SyntheticFailureRecoveryBridgeCaseSet,
  createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor,
  createAdminConsoleCp656PermissionAuditFixtureTransitionCaseSet,
  createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor,
  createAdminConsoleCp655PermissionMatrixWorkflowTailCaseSet,
  createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor,
  createAdminConsoleCp654SyntheticPermissionMatrixCaseSet,
  createAdminConsoleCp654SyntheticPermissionMatrixDescriptor,
  createAdminConsoleCp653PermissionFixtureTailCaseSet,
  createAdminConsoleCp653PermissionFixtureTailDescriptor,
  createAdminConsoleCp652FixtureGoldenCaseSet,
  createAdminConsoleCp652FixtureGoldenCaseDescriptor,
  createAdminConsoleCp651UiPermissionFixtureCaseSet,
  createAdminConsoleCp651UiPermissionFixtureDescriptor,
  createAdminConsoleCp650UiImplementationSliceCaseSet,
  createAdminConsoleCp650UiImplementationSliceDescriptor,
  createAdminConsoleCp649ReviewCloseoutApiUiCaseSet,
  createAdminConsoleCp649ReviewCloseoutApiUiDescriptor,
  createAdminConsoleCp648ClaudeReviewBoundaryCaseSet,
  createAdminConsoleCp648ClaudeReviewBoundaryDescriptor,
  createAdminConsoleCp647TestEvidenceReviewCaseSet,
  createAdminConsoleCp647TestEvidenceReviewPacketDescriptor,
  createAdminConsoleCp646DomainServiceBridgeCaseSet,
  createAdminConsoleCp646DomainServiceBridgeDescriptor,
  createAdminConsoleCp645ScopeDomainFoundationCaseSet,
  createAdminConsoleCp645ScopeDomainFoundationDescriptor,
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

function freezeCp645Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION,
  });
}

function freezeCp646Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION,
  });
}

function freezeCp647Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION,
  });
}

function freezeCp648Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION,
  });
}

function freezeCp649Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION,
  });
}

function freezeCp650Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION,
  });
}

function freezeCp651Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION,
  });
}

function freezeCp652Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION,
  });
}

function freezeCp653Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION,
  });
}

function freezeCp654Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION,
  });
}

function freezeCp655Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION,
  });
}

function freezeCp656Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION,
  });
}

function freezeCp657Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION,
  });
}

function freezeCp658Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION,
  });
}

function freezeCp659Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION,
  });
}

function freezeCp660Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION,
  });
}

function freezeCp661Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION,
  });
}

function freezeCp662Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION,
  });
}

function freezeCp663Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION,
  });
}

function freezeCp664Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION,
  });
}

function freezeCp665Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id,
    no_write_attestation: ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION,
  });
}

function resolveCoreProjectionPlanPacks(planPacks) {
  const bindings = {
    cp645PlanPack: ADMIN_CONSOLE_CP645_PACK_BINDING,
    cp646PlanPack: ADMIN_CONSOLE_CP646_PACK_BINDING,
    cp647PlanPack: ADMIN_CONSOLE_CP647_PACK_BINDING,
    cp648PlanPack: ADMIN_CONSOLE_CP648_PACK_BINDING,
    cp649PlanPack: ADMIN_CONSOLE_CP649_PACK_BINDING,
    cp650PlanPack: ADMIN_CONSOLE_CP650_PACK_BINDING,
    cp651PlanPack: ADMIN_CONSOLE_CP651_PACK_BINDING,
    cp652PlanPack: ADMIN_CONSOLE_CP652_PACK_BINDING,
    cp653PlanPack: ADMIN_CONSOLE_CP653_PACK_BINDING,
    cp654PlanPack: ADMIN_CONSOLE_CP654_PACK_BINDING,
    cp655PlanPack: ADMIN_CONSOLE_CP655_PACK_BINDING,
    cp656PlanPack: ADMIN_CONSOLE_CP656_PACK_BINDING,
    cp657PlanPack: ADMIN_CONSOLE_CP657_PACK_BINDING,
    cp658PlanPack: ADMIN_CONSOLE_CP658_PACK_BINDING,
    cp659PlanPack: ADMIN_CONSOLE_CP659_PACK_BINDING,
    cp660PlanPack: ADMIN_CONSOLE_CP660_PACK_BINDING,
    cp661PlanPack: ADMIN_CONSOLE_CP661_PACK_BINDING,
    cp662PlanPack: ADMIN_CONSOLE_CP662_PACK_BINDING,
    cp663PlanPack: ADMIN_CONSOLE_CP663_PACK_BINDING,
    cp664PlanPack: ADMIN_CONSOLE_CP664_PACK_BINDING,
    cp665PlanPack: ADMIN_CONSOLE_CP665_PACK_BINDING,
  };
  const resolved = Object.fromEntries(Object.keys(bindings).map((key) => [key, undefined]));
  if (Object.keys(bindings).some((key) => planPacks?.[key])) {
    for (const key of Object.keys(bindings)) resolved[key] = planPacks[key];
    return resolved;
  }
  const packs = Array.isArray(planPacks) ? planPacks : planPacks ? [planPacks] : [];
  for (const [key, binding] of Object.entries(bindings)) {
    resolved[key] = packs.find((pack) => pack?.pack_id === binding.pack_id);
  }
  return resolved;
}

export function createAdminConsoleCp645CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp645Validation({
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

export function validateAdminConsoleCp645Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-645 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-645");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP645_PACK_BINDING.risk_class) errors.push("CP00-645 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP645_PACK_BINDING.unit_count) errors.push("CP00-645 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP645_PACK_BINDING.first_unit_id) errors.push("CP00-645 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP645_PACK_BINDING.last_unit_id) errors.push("CP00-645 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-645 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-645 must only include RP21 units");
  }

  const summary = createAdminConsoleCp645CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP645_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-645 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP645_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-645 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP645_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-645 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP645_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-645 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP645_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-645 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-645 ${microId} missing row ${title}`);
    }
  }
  return freezeCp645Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp646CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp646Validation({
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

export function validateAdminConsoleCp646Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-646 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-646");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP646_PACK_BINDING.risk_class) errors.push("CP00-646 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP646_PACK_BINDING.unit_count) errors.push("CP00-646 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP646_PACK_BINDING.first_unit_id) errors.push("CP00-646 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP646_PACK_BINDING.last_unit_id) errors.push("CP00-646 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-646 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-646 must only include RP21 units");
  }

  const summary = createAdminConsoleCp646CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP646_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-646 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP646_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-646 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP646_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-646 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP646_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-646 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP646_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-646 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-646 ${microId} missing row ${title}`);
    }
  }
  return freezeCp646Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp647CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp647Validation({
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

export function validateAdminConsoleCp647Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-647 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-647");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP647_PACK_BINDING.risk_class) errors.push("CP00-647 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP647_PACK_BINDING.unit_count) errors.push("CP00-647 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP647_PACK_BINDING.first_unit_id) errors.push("CP00-647 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP647_PACK_BINDING.last_unit_id) errors.push("CP00-647 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-647 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-647 must only include RP21 units");
  }

  const summary = createAdminConsoleCp647CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP647_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-647 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP647_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-647 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP647_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-647 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP647_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-647 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP647_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-647 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-647 ${microId} missing row ${title}`);
    }
  }
  return freezeCp647Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp648CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp648Validation({
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

export function validateAdminConsoleCp648Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-648 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-648");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP648_PACK_BINDING.risk_class) errors.push("CP00-648 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP648_PACK_BINDING.unit_count) errors.push("CP00-648 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP648_PACK_BINDING.first_unit_id) errors.push("CP00-648 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP648_PACK_BINDING.last_unit_id) errors.push("CP00-648 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-648 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-648 must only include RP21 units");
  }

  const summary = createAdminConsoleCp648CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP648_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-648 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP648_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-648 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP648_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-648 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP648_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-648 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP648_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-648 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-648 ${microId} missing row ${title}`);
    }
  }
  return freezeCp648Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp649CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp649Validation({
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

export function validateAdminConsoleCp649Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-649 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-649");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP649_PACK_BINDING.risk_class) errors.push("CP00-649 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP649_PACK_BINDING.unit_count) errors.push("CP00-649 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP649_PACK_BINDING.first_unit_id) errors.push("CP00-649 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP649_PACK_BINDING.last_unit_id) errors.push("CP00-649 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-649 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-649 must only include RP21 units");
  }

  const summary = createAdminConsoleCp649CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP649_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-649 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP649_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-649 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP649_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-649 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP649_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-649 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP649_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-649 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-649 ${microId} missing row ${title}`);
    }
  }
  return freezeCp649Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp650CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp650Validation({
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

export function validateAdminConsoleCp650Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-650 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-650");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP650_PACK_BINDING.risk_class) errors.push("CP00-650 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP650_PACK_BINDING.unit_count) errors.push("CP00-650 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP650_PACK_BINDING.first_unit_id) errors.push("CP00-650 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP650_PACK_BINDING.last_unit_id) errors.push("CP00-650 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-650 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-650 must only include RP21 units");
  }

  const summary = createAdminConsoleCp650CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP650_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-650 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP650_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-650 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP650_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-650 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP650_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-650 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP650_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-650 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-650 ${microId} missing row ${title}`);
    }
  }
  return freezeCp650Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp651CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp651Validation({
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

export function validateAdminConsoleCp651Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-651 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-651");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP651_PACK_BINDING.risk_class) errors.push("CP00-651 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP651_PACK_BINDING.unit_count) errors.push("CP00-651 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP651_PACK_BINDING.first_unit_id) errors.push("CP00-651 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP651_PACK_BINDING.last_unit_id) errors.push("CP00-651 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-651 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-651 must only include RP21 units");
  }

  const summary = createAdminConsoleCp651CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP651_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-651 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP651_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-651 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP651_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-651 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP651_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-651 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP651_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-651 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-651 ${microId} missing row ${title}`);
    }
  }
  return freezeCp651Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp652CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp652Validation({
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

export function validateAdminConsoleCp652Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-652 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-652");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP652_PACK_BINDING.risk_class) errors.push("CP00-652 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP652_PACK_BINDING.unit_count) errors.push("CP00-652 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP652_PACK_BINDING.first_unit_id) errors.push("CP00-652 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP652_PACK_BINDING.last_unit_id) errors.push("CP00-652 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-652 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-652 must only include RP21 units");
  }

  const summary = createAdminConsoleCp652CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP652_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-652 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP652_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-652 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP652_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-652 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP652_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-652 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP652_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-652 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-652 ${microId} missing row ${title}`);
    }
  }
  return freezeCp652Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp653CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp653Validation({
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

export function validateAdminConsoleCp653Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-653 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-653");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP653_PACK_BINDING.risk_class) errors.push("CP00-653 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP653_PACK_BINDING.unit_count) errors.push("CP00-653 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP653_PACK_BINDING.first_unit_id) errors.push("CP00-653 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP653_PACK_BINDING.last_unit_id) errors.push("CP00-653 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-653 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-653 must only include RP21 units");
  }

  const summary = createAdminConsoleCp653CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP653_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-653 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP653_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-653 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP653_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-653 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP653_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-653 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP653_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-653 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-653 ${microId} missing row ${title}`);
    }
  }
  return freezeCp653Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp654CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp654Validation({
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

export function validateAdminConsoleCp654Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-654 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-654");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP654_PACK_BINDING.risk_class) errors.push("CP00-654 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP654_PACK_BINDING.unit_count) errors.push("CP00-654 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP654_PACK_BINDING.first_unit_id) errors.push("CP00-654 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP654_PACK_BINDING.last_unit_id) errors.push("CP00-654 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-654 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-654 must only include RP21 units");
  }

  const summary = createAdminConsoleCp654CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP654_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-654 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP654_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-654 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP654_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-654 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP654_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-654 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP654_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-654 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-654 ${microId} missing row ${title}`);
    }
  }
  return freezeCp654Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp655CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp655Validation({
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

export function validateAdminConsoleCp655Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-655 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-655");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP655_PACK_BINDING.risk_class) errors.push("CP00-655 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP655_PACK_BINDING.unit_count) errors.push("CP00-655 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP655_PACK_BINDING.first_unit_id) errors.push("CP00-655 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP655_PACK_BINDING.last_unit_id) errors.push("CP00-655 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-655 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-655 must only include RP21 units");
  }

  const summary = createAdminConsoleCp655CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP655_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-655 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP655_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-655 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP655_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-655 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP655_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-655 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP655_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-655 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-655 ${microId} missing row ${title}`);
    }
  }
  return freezeCp655Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp656CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp656Validation({
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

export function validateAdminConsoleCp656Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-656 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-656");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP656_PACK_BINDING.risk_class) errors.push("CP00-656 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP656_PACK_BINDING.unit_count) errors.push("CP00-656 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP656_PACK_BINDING.first_unit_id) errors.push("CP00-656 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP656_PACK_BINDING.last_unit_id) errors.push("CP00-656 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-656 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-656 must only include RP21 units");
  }

  const summary = createAdminConsoleCp656CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP656_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-656 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP656_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-656 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP656_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-656 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP656_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-656 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP656_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-656 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-656 ${microId} missing row ${title}`);
    }
  }
  return freezeCp656Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}


export function createAdminConsoleCp657CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp657Validation({
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

export function validateAdminConsoleCp657Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-657 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-657");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP657_PACK_BINDING.risk_class) errors.push("CP00-657 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP657_PACK_BINDING.unit_count) errors.push("CP00-657 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP657_PACK_BINDING.first_unit_id) errors.push("CP00-657 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP657_PACK_BINDING.last_unit_id) errors.push("CP00-657 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-657 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-657 must only include RP21 units");
  }

  const summary = createAdminConsoleCp657CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP657_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-657 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP657_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-657 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP657_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-657 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP657_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-657 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP657_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-657 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push("CP00-657 " + microId + " missing row " + title);
    }
  }
  return freezeCp657Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}


export function createAdminConsoleCp658CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp658Validation({
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

export function validateAdminConsoleCp658Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-658 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-658");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP658_PACK_BINDING.risk_class) errors.push("CP00-658 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP658_PACK_BINDING.unit_count) errors.push("CP00-658 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP658_PACK_BINDING.first_unit_id) errors.push("CP00-658 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP658_PACK_BINDING.last_unit_id) errors.push("CP00-658 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-658 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-658 must only include RP21 units");
  }
  const summary = createAdminConsoleCp658CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP658_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-658 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP658_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-658 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP658_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-658 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP658_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-658 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP658_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-658 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-658 " + microId + " missing row " + title);
  }
  return freezeCp658Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp659CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp659Validation({
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

export function validateAdminConsoleCp659Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-659 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-659");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP659_PACK_BINDING.risk_class) errors.push("CP00-659 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP659_PACK_BINDING.unit_count) errors.push("CP00-659 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP659_PACK_BINDING.first_unit_id) errors.push("CP00-659 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP659_PACK_BINDING.last_unit_id) errors.push("CP00-659 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-659 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-659 must only include RP21 units");
  }
  const summary = createAdminConsoleCp659CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP659_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-659 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP659_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-659 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP659_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-659 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP659_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-659 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP659_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-659 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-659 " + microId + " missing row " + title);
  }
  return freezeCp659Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp660CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp660Validation({
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

export function validateAdminConsoleCp660Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-660 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-660");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP660_PACK_BINDING.risk_class) errors.push("CP00-660 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP660_PACK_BINDING.unit_count) errors.push("CP00-660 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP660_PACK_BINDING.first_unit_id) errors.push("CP00-660 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP660_PACK_BINDING.last_unit_id) errors.push("CP00-660 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-660 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-660 must only include RP21 units");
  }
  const summary = createAdminConsoleCp660CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP660_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-660 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP660_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-660 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP660_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-660 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP660_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-660 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP660_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-660 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-660 " + microId + " missing row " + title);
  }
  return freezeCp660Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp661CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp663Validation({
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

export function validateAdminConsoleCp661Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-661 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-661");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP661_PACK_BINDING.risk_class) errors.push("CP00-661 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP661_PACK_BINDING.unit_count) errors.push("CP00-661 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP661_PACK_BINDING.first_unit_id) errors.push("CP00-661 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP661_PACK_BINDING.last_unit_id) errors.push("CP00-661 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-661 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-661 must only include RP21 units");
  }
  const summary = createAdminConsoleCp661CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP661_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-661 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP661_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-661 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP661_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-661 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP661_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-661 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP661_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-661 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-661 " + microId + " missing row " + title);
  }
  return freezeCp661Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}


export function createAdminConsoleCp662CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp662Validation({
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

export function validateAdminConsoleCp662Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-662 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-662");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP662_PACK_BINDING.risk_class) errors.push("CP00-662 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP662_PACK_BINDING.unit_count) errors.push("CP00-662 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP662_PACK_BINDING.first_unit_id) errors.push("CP00-662 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP662_PACK_BINDING.last_unit_id) errors.push("CP00-662 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-662 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) {
    errors.push("CP00-662 must only include RP21 units");
  }
  const summary = createAdminConsoleCp662CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP662_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-662 " + deliverable + " distribution drift");
  }
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP662_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push("CP00-662 " + phase + " distribution drift");
  }
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP662_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-662 " + microPhase + " distribution drift");
  }
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP662_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-662 " + microTitle + " distribution drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP662_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-662 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-662 " + microId + " missing row " + title);
  }
  return freezeCp662Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp663CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp663Validation({
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

export function validateAdminConsoleCp663Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-663 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-663");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP663_PACK_BINDING.risk_class) errors.push("CP00-663 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP663_PACK_BINDING.unit_count) errors.push("CP00-663 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP663_PACK_BINDING.first_unit_id) errors.push("CP00-663 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP663_PACK_BINDING.last_unit_id) errors.push("CP00-663 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-663 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) errors.push("CP00-663 must only include RP21 units");
  const summary = createAdminConsoleCp663CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP663_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-663 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP663_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-663 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP663_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-663 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP663_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-663 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP663_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-663 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-663 " + microId + " missing row " + title);
  }
  return freezeCp663Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp664CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp664Validation({
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

export function validateAdminConsoleCp664Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-664 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-664");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP664_PACK_BINDING.risk_class) errors.push("CP00-664 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP664_PACK_BINDING.unit_count) errors.push("CP00-664 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP664_PACK_BINDING.first_unit_id) errors.push("CP00-664 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP664_PACK_BINDING.last_unit_id) errors.push("CP00-664 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-664 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) errors.push("CP00-664 must only include RP21 units");
  const summary = createAdminConsoleCp664CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP664_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-664 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP664_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-664 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP664_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-664 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP664_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-664 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP664_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-664 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-664 " + microId + " missing row " + title);
  }
  return freezeCp664Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function createAdminConsoleCp665CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp665Validation({
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

export function validateAdminConsoleCp665Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-665 plan pack is required");
  if (planPack?.pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-665");
  if (planPack?.risk_class !== ADMIN_CONSOLE_CP665_PACK_BINDING.risk_class) errors.push("CP00-665 risk class drift");
  if (planPack?.unit_count !== ADMIN_CONSOLE_CP665_PACK_BINDING.unit_count) errors.push("CP00-665 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== ADMIN_CONSOLE_CP665_PACK_BINDING.first_unit_id) errors.push("CP00-665 first unit drift");
  if (unitIds.at(-1) !== ADMIN_CONSOLE_CP665_PACK_BINDING.last_unit_id) errors.push("CP00-665 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-665 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id)) errors.push("CP00-665 must only include RP21 units");
  const summary = createAdminConsoleCp665CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(ADMIN_CONSOLE_CP665_REQUIREMENTS.deliverable_counts)) if (summary.by_deliverable[deliverable] !== count) errors.push("CP00-665 " + deliverable + " distribution drift");
  for (const [phase, count] of Object.entries(ADMIN_CONSOLE_CP665_REQUIREMENTS.phase_counts)) if (summary.by_phase[phase] !== count) errors.push("CP00-665 " + phase + " distribution drift");
  for (const [microPhase, count] of Object.entries(ADMIN_CONSOLE_CP665_REQUIREMENTS.micro_phase_row_counts)) if (summary.by_micro_phase[microPhase] !== count) errors.push("CP00-665 " + microPhase + " distribution drift");
  for (const [microTitle, count] of Object.entries(ADMIN_CONSOLE_CP665_REQUIREMENTS.micro_title_row_counts)) if (summary.by_micro_title[microTitle] !== count) errors.push("CP00-665 " + microTitle + " distribution drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP665_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push("CP00-665 " + microId + " row count drift");
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) if (!sectionTitles.includes(title)) errors.push("CP00-665 " + microId + " missing row " + title);
  }
  return freezeCp665Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}
export function validateAdminConsoleCp645ScopeDomainFoundationDescriptor(
  descriptor = createAdminConsoleCp645ScopeDomainFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_domain_foundation_case_set ?? createAdminConsoleCp645ScopeDomainFoundationCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp645ScopeDomainFoundationDescriptor") errors.push("CP00-645 descriptor type drift");
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-645 program id drift");
  if (descriptor.program_contract?.upstream_program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.upstream_program_id) {
    errors.push("CP00-645 upstream program drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id) errors.push("CP00-645 pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP645_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-645 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP645_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-645 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP645_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-645 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-645 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-645 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-645 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-645 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-645 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP645_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-645 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-645 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-645 must not promote Claude to final approval");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.next_pack_id) {
    errors.push("CP00-645 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-645 handoff next subphase drift");
  }
  if (
    contractProjection.cp645_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp645_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-645 contract projection historical descriptor drift");
  }
  return freezeCp645Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp646DomainServiceBridgeDescriptor(
  descriptor = createAdminConsoleCp646DomainServiceBridgeDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.domain_service_bridge_case_set ?? createAdminConsoleCp646DomainServiceBridgeCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp646DomainServiceBridgeDescriptor") errors.push("CP00-646 descriptor type drift");
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-646 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-646 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id) errors.push("CP00-646 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-646 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP646_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-646 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP646_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-646 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP646_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-646 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-646 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-646 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-646 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-646 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-646 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP646_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-646 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-646 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-646 must not promote Claude to final approval");
  }
  if (descriptor.service_bridge_contract?.runtime_handler_opened !== false) {
    errors.push("CP00-646 service bridge must not open runtime handler");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.next_pack_id) {
    errors.push("CP00-646 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-646 handoff next subphase drift");
  }
  if (
    contractProjection.cp646_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp646_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-646 contract projection descriptor drift");
  }
  return freezeCp646Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp647TestEvidenceReviewPacketDescriptor(
  descriptor = createAdminConsoleCp647TestEvidenceReviewPacketDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.test_evidence_review_case_set ?? createAdminConsoleCp647TestEvidenceReviewCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp647TestEvidenceReviewPacketDescriptor") {
    errors.push("CP00-647 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-647 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-647 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id) errors.push("CP00-647 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-647 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP647_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-647 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP647_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-647 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP647_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-647 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-647 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-647 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-647 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-647 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-647 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP647_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-647 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-647 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-647 must not promote Claude to final approval");
  }
  if (descriptor.test_golden_contract?.runtime_case_execution_opened !== false) {
    errors.push("CP00-647 test golden cases must not execute runtime cases");
  }
  if (descriptor.evidence_review_contract?.hermes_runtime_receipt_emitted !== false) {
    errors.push("CP00-647 must not emit a Hermes runtime receipt");
  }
  if (descriptor.evidence_review_contract?.review_payload_persisted !== false) {
    errors.push("CP00-647 must not persist review payloads");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.next_pack_id) {
    errors.push("CP00-647 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-647 handoff next subphase drift");
  }
  if (
    contractProjection.cp647_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp647_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-647 contract projection descriptor drift");
  }
  return freezeCp647Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp648ClaudeReviewBoundaryDescriptor(
  descriptor = createAdminConsoleCp648ClaudeReviewBoundaryDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.claude_review_boundary_case_set ?? createAdminConsoleCp648ClaudeReviewBoundaryCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp648ClaudeReviewBoundaryDescriptor") {
    errors.push("CP00-648 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-648 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-648 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id) errors.push("CP00-648 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-648 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP648_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-648 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP648_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-648 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP648_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-648 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-648 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-648 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-648 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-648 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-648 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP648_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-648 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-648 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-648 must not promote Claude to final approval");
  }
  if (descriptor.claude_review_boundary_contract?.runtime_handler_opened !== false) {
    errors.push("CP00-648 Claude review boundary must not open a runtime handler");
  }
  if (descriptor.claude_review_boundary_contract?.review_payload_persisted !== false) {
    errors.push("CP00-648 must not persist review payloads");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.next_pack_id) {
    errors.push("CP00-648 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-648 handoff next subphase drift");
  }
  if (
    contractProjection.cp648_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp648_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-648 contract projection descriptor drift");
  }
  return freezeCp648Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp649ReviewCloseoutApiUiDescriptor(
  descriptor = createAdminConsoleCp649ReviewCloseoutApiUiDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_closeout_api_ui_case_set ?? createAdminConsoleCp649ReviewCloseoutApiUiCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp649ReviewCloseoutApiUiDescriptor") {
    errors.push("CP00-649 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-649 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-649 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id) errors.push("CP00-649 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-649 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP649_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-649 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP649_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-649 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP649_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-649 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-649 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-649 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-649 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-649 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-649 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP649_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-649 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-649 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-649 must not promote Claude to final approval");
  }
  if (descriptor.closeout_service_contract?.runtime_handler_opened !== false) {
    errors.push("CP00-649 closeout service must not open a runtime handler");
  }
  if (descriptor.api_surface_contract?.runtime_handler_opened !== false) {
    errors.push("CP00-649 API surface must not open a runtime handler");
  }
  if (descriptor.api_surface_contract?.unauthorized_data_omitted !== true) {
    errors.push("CP00-649 API surface must omit unauthorized data");
  }
  if (descriptor.ui_surface_contract?.interaction_runtime_opened !== false) {
    errors.push("CP00-649 UI surface must not open interaction runtime");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.next_pack_id) {
    errors.push("CP00-649 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-649 handoff next subphase drift");
  }
  if (
    contractProjection.cp649_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp649_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-649 contract projection descriptor drift");
  }
  return freezeCp649Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp650UiImplementationSliceDescriptor(
  descriptor = createAdminConsoleCp650UiImplementationSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_implementation_slice_case_set ?? createAdminConsoleCp650UiImplementationSliceCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp650UiImplementationSliceDescriptor") {
    errors.push("CP00-650 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-650 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-650 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id) errors.push("CP00-650 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-650 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP650_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-650 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP650_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-650 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP650_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-650 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-650 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-650 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-650 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-650 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-650 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP650_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-650 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-650 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-650 must not promote Claude to final approval");
  }
  if (descriptor.ui_interaction_contract?.interaction_runtime_opened !== false) {
    errors.push("CP00-650 UI interaction must not open runtime");
  }
  if (descriptor.ui_interaction_contract?.build_runtime_opened !== false) {
    errors.push("CP00-650 build smoke must not open runtime");
  }
  if (descriptor.ui_interaction_contract?.no_unauthorized_count_leak !== true) {
    errors.push("CP00-650 UI interaction must prevent unauthorized count leaks");
  }
  if (descriptor.ui_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-650 UI evidence must not emit runtime receipt");
  }
  if (descriptor.ui_evidence_contract?.review_payload_persisted !== false) {
    errors.push("CP00-650 UI evidence must not persist review payloads");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.next_pack_id) {
    errors.push("CP00-650 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-650 handoff next subphase drift");
  }
  if (
    contractProjection.cp650_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp650_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-650 contract projection descriptor drift");
  }
  return freezeCp650Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp651UiPermissionFixtureDescriptor(
  descriptor = createAdminConsoleCp651UiPermissionFixtureDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_permission_fixture_case_set ?? createAdminConsoleCp651UiPermissionFixtureCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp651UiPermissionFixtureDescriptor") {
    errors.push("CP00-651 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-651 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-651 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id) errors.push("CP00-651 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-651 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP651_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-651 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP651_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-651 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP651_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-651 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-651 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-651 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-651 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-651 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-651 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP651_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-651 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-651 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-651 must not promote Claude to final approval");
  }
  if (descriptor.ui_permission_audit_contract?.runtime_permission_evaluated !== false) {
    errors.push("CP00-651 permission badge must not evaluate runtime permission");
  }
  if (descriptor.ui_permission_audit_contract?.writes_permission_decision !== false) {
    errors.push("CP00-651 permission badge must not write permission decisions");
  }
  if (descriptor.ui_permission_audit_contract?.emits_audit_event !== false) {
    errors.push("CP00-651 audit hint must not emit audit events");
  }
  if (descriptor.ui_permission_audit_contract?.persists_audit_event !== false) {
    errors.push("CP00-651 audit hint must not persist audit events");
  }
  if (descriptor.ui_permission_audit_contract?.no_unauthorized_count_leak !== true) {
    errors.push("CP00-651 permission/audit contract must prevent unauthorized count leaks");
  }
  if (descriptor.ui_fixture_evidence_contract?.fixture_payload_included !== false) {
    errors.push("CP00-651 fixture contract must not include fixture payloads");
  }
  if (descriptor.ui_fixture_evidence_contract?.real_client_data_loaded !== false) {
    errors.push("CP00-651 fixture contract must not load real client data");
  }
  if (descriptor.ui_fixture_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-651 UI evidence must not emit runtime receipt");
  }
  if (descriptor.ui_fixture_evidence_contract?.review_payload_persisted !== false) {
    errors.push("CP00-651 UI evidence must not persist review payloads");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.next_pack_id) {
    errors.push("CP00-651 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-651 handoff next subphase drift");
  }
  if (
    contractProjection.cp651_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp651_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-651 contract projection descriptor drift");
  }
  return freezeCp651Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp652FixtureGoldenCaseDescriptor(
  descriptor = createAdminConsoleCp652FixtureGoldenCaseDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_golden_case_set ?? createAdminConsoleCp652FixtureGoldenCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp652FixtureGoldenCaseDescriptor") {
    errors.push("CP00-652 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-652 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-652 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id) errors.push("CP00-652 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-652 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP652_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-652 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP652_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-652 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP652_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-652 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-652 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-652 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-652 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-652 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-652 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP652_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-652 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-652 ${flag} must remain false`);
  }
  if (descriptor.no_write_attestation?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-652 must not promote Claude to final approval");
  }
  if (descriptor.fixture_golden_case_contract?.fixture_payload_included !== false) {
    errors.push("CP00-652 fixture contract must not include fixture payloads");
  }
  if (descriptor.fixture_golden_case_contract?.real_client_data_loaded !== false) {
    errors.push("CP00-652 fixture contract must not load real client data");
  }
  if (descriptor.fixture_golden_case_contract?.executes_golden_case_runtime !== false) {
    errors.push("CP00-652 golden cases must not execute runtime");
  }
  if (descriptor.fixture_golden_case_contract?.review_required_case_exposes_payload !== false) {
    errors.push("CP00-652 review-required case must not expose review payloads");
  }
  if (descriptor.fixture_golden_case_contract?.security_trimming_exposes_unauthorized_count !== false) {
    errors.push("CP00-652 security trimming must not expose unauthorized counts");
  }
  if (descriptor.fixture_golden_case_contract?.stable_id_persistence_opened !== false) {
    errors.push("CP00-652 stable ID checks must not open persistence");
  }
  if (descriptor.fixture_golden_case_contract?.replay_command_runtime_opened !== false) {
    errors.push("CP00-652 replay command must not open runtime");
  }
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-652 test evidence must not emit runtime receipt");
  }
  if (descriptor.test_evidence_contract?.review_payload_persisted !== false) {
    errors.push("CP00-652 test evidence must not persist review payloads");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.next_pack_id) {
    errors.push("CP00-652 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-652 handoff next subphase drift");
  }
  if (
    contractProjection.cp652_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp652_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-652 contract projection descriptor drift");
  }
  return freezeCp652Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp653PermissionFixtureTailDescriptor(
  descriptor = createAdminConsoleCp653PermissionFixtureTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_fixture_tail_case_set ?? createAdminConsoleCp653PermissionFixtureTailCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp653PermissionFixtureTailDescriptor") {
    errors.push("CP00-653 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-653 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-653 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id) errors.push("CP00-653 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-653 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP653_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-653 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP653_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-653 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP653_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-653 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-653 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-653 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-653 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-653 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-653 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP653_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-653 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-653 ${flag} must remain false`);
  }
  if (descriptor.permission_fixture_tail_contract?.fixture_payload_included !== false) {
    errors.push("CP00-653 fixture tail must not include fixture payloads");
  }
  if (descriptor.permission_fixture_tail_contract?.real_client_data_loaded !== false) {
    errors.push("CP00-653 fixture tail must not load real client data");
  }
  if (descriptor.permission_fixture_tail_contract?.executes_golden_case_runtime !== false) {
    errors.push("CP00-653 fixture tail must not execute golden-case runtime");
  }
  if (descriptor.permission_fixture_tail_contract?.emits_hermes_runtime_receipt !== false) {
    errors.push("CP00-653 fixture tail must not emit Hermes runtime receipts");
  }
  if (descriptor.permission_fixture_tail_contract?.persists_review_packet !== false) {
    errors.push("CP00-653 fixture tail must not persist review packets");
  }
  if (descriptor.permission_fixture_tail_contract?.persists_idempotency_key !== false) {
    errors.push("CP00-653 fixture tail must not persist stable IDs");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.next_pack_id) {
    errors.push("CP00-653 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-653 handoff next subphase drift");
  }
  if (
    contractProjection.cp653_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp653_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-653 contract projection descriptor drift");
  }
  return freezeCp653Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp654SyntheticPermissionMatrixDescriptor(
  descriptor = createAdminConsoleCp654SyntheticPermissionMatrixDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.synthetic_permission_matrix_case_set ?? createAdminConsoleCp654SyntheticPermissionMatrixCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp654SyntheticPermissionMatrixDescriptor") {
    errors.push("CP00-654 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-654 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-654 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id) errors.push("CP00-654 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-654 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP654_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-654 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP654_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-654 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP654_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-654 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-654 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-654 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-654 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-654 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-654 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP654_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-654 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-654 ${flag} must remain false`);
  }
  if (descriptor.synthetic_fixture_contract?.fixture_payload_included !== false) {
    errors.push("CP00-654 synthetic fixtures must not include payloads");
  }
  if (descriptor.synthetic_fixture_contract?.real_user_data_loaded !== false) {
    errors.push("CP00-654 synthetic fixtures must not load real user data");
  }
  if (descriptor.synthetic_fixture_contract?.real_matter_data_loaded !== false) {
    errors.push("CP00-654 synthetic fixtures must not load real matter data");
  }
  if (descriptor.synthetic_fixture_contract?.golden_case_runtime_opened !== false) {
    errors.push("CP00-654 synthetic fixtures must not open golden-case runtime");
  }
  if (descriptor.synthetic_fixture_contract?.review_required_case_exposes_payload !== false) {
    errors.push("CP00-654 review-required fixtures must not expose payloads");
  }
  if (descriptor.synthetic_fixture_contract?.security_trimming_exposes_unauthorized_count !== false) {
    errors.push("CP00-654 security trimming must not expose unauthorized counts");
  }
  if (descriptor.permission_matrix_contract?.evaluates_runtime_permission !== false) {
    errors.push("CP00-654 permission matrix must not evaluate runtime permissions");
  }
  if (descriptor.permission_matrix_contract?.writes_permission_decision !== false) {
    errors.push("CP00-654 permission matrix must not write permission decisions");
  }
  if (descriptor.permission_matrix_contract?.emits_audit_event !== false) {
    errors.push("CP00-654 permission matrix must not emit audit events");
  }
  if (descriptor.permission_matrix_contract?.persists_audit_event !== false) {
    errors.push("CP00-654 permission matrix must not persist audit events");
  }
  if (descriptor.permission_matrix_contract?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-654 must not promote Claude to final approval");
  }
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-654 test evidence must not emit runtime receipt");
  }
  if (descriptor.test_evidence_contract?.permission_decision_written !== false) {
    errors.push("CP00-654 test evidence must not write permission decisions");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.next_pack_id) {
    errors.push("CP00-654 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-654 handoff next subphase drift");
  }
  if (
    contractProjection.cp654_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp654_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-654 contract projection descriptor drift");
  }
  return freezeCp654Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor(
  descriptor = createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.permission_matrix_workflow_tail_case_set ?? createAdminConsoleCp655PermissionMatrixWorkflowTailCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp655PermissionMatrixWorkflowTailDescriptor") {
    errors.push("CP00-655 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-655 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-655 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id) errors.push("CP00-655 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-655 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP655_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-655 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP655_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-655 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP655_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-655 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-655 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-655 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-655 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-655 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-655 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP655_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-655 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-655 ${flag} must remain false`);
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.evaluates_runtime_permission !== false) {
    errors.push("CP00-655 workflow tail must not evaluate runtime permissions");
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.writes_permission_decision !== false) {
    errors.push("CP00-655 workflow tail must not write permission decisions");
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.emits_audit_event !== false) {
    errors.push("CP00-655 workflow tail must not emit audit events");
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.persists_audit_event !== false) {
    errors.push("CP00-655 workflow tail must not persist audit events");
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-655 must not promote Claude to final approval");
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.permission_bypass_detected !== false) {
    errors.push("CP00-655 must not record permission bypass");
  }
  if (descriptor.permission_matrix_workflow_tail_contract?.leak_detected !== false) {
    errors.push("CP00-655 must not record data leakage");
  }
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-655 test evidence must not emit runtime receipt");
  }
  if (descriptor.test_evidence_contract?.review_payload_persisted !== false) {
    errors.push("CP00-655 test evidence must not persist review payloads");
  }
  if (descriptor.test_evidence_contract?.permission_decision_written !== false) {
    errors.push("CP00-655 test evidence must not write permission decisions");
  }
  if (descriptor.test_evidence_contract?.unauthorized_count_exposed !== false) {
    errors.push("CP00-655 test evidence must not expose unauthorized counts");
  }
  if (descriptor.runtime_boundary?.workflow_runtime_opened !== false) {
    errors.push("CP00-655 workflow runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.permission_matrix_runtime_opened !== false) {
    errors.push("CP00-655 permission matrix runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) {
    errors.push("CP00-655 Hermes runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.claude_runtime_opened !== false) {
    errors.push("CP00-655 Claude runtime must remain closed");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.next_pack_id) {
    errors.push("CP00-655 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-655 handoff next subphase drift");
  }
  if (
    contractProjection.cp655_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp655_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-655 contract projection descriptor drift");
  }
  return freezeCp655Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor(
  descriptor = createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.permission_audit_fixture_transition_case_set ??
    createAdminConsoleCp656PermissionAuditFixtureTransitionCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp656PermissionAuditFixtureTransitionDescriptor") {
    errors.push("CP00-656 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-656 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-656 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id) errors.push("CP00-656 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-656 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP656_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-656 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP656_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push(`CP00-656 missing section ${microId}`);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP656_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push(`CP00-656 ${microId} title drift`);
    }
    if (section.row_count !== titles.length) errors.push(`CP00-656 ${microId} section row count drift`);
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push(`CP00-656 missing descriptor row ${microId} ${title}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-656 ${microId} ${title} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-656 ${microId} ${title} must not execute runtime`);
      if (row.raw_payload_included !== false) errors.push(`CP00-656 ${microId} ${title} must not include raw payload`);
    }
  }
  for (const guard of ADMIN_CONSOLE_CP656_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push(`CP00-656 missing no-leak guard ${guard}`);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push(`CP00-656 ${flag} must remain false`);
  }
  if (descriptor.permission_audit_fixture_transition_contract?.evaluates_runtime_permission !== false) {
    errors.push("CP00-656 transition must not evaluate runtime permissions");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.writes_permission_decision !== false) {
    errors.push("CP00-656 transition must not write permission decisions");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.emits_audit_event !== false) {
    errors.push("CP00-656 transition must not emit audit events");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.persists_audit_event !== false) {
    errors.push("CP00-656 transition must not persist audit events");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.fixture_payload_included !== false) {
    errors.push("CP00-656 fixture transition must not include payloads");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.real_tenant_data_loaded !== false) {
    errors.push("CP00-656 fixture transition must not load real tenant data");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.real_user_data_loaded !== false) {
    errors.push("CP00-656 fixture transition must not load real user data");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.real_matter_data_loaded !== false) {
    errors.push("CP00-656 fixture transition must not load real matter data");
  }
  if (descriptor.permission_audit_fixture_transition_contract?.exposes_unauthorized_count !== false) {
    errors.push("CP00-656 fixture transition must not expose unauthorized counts");
  }
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-656 test evidence must not emit runtime receipt");
  }
  if (descriptor.test_evidence_contract?.review_payload_persisted !== false) {
    errors.push("CP00-656 test evidence must not persist review payloads");
  }
  if (descriptor.test_evidence_contract?.permission_decision_written !== false) {
    errors.push("CP00-656 test evidence must not write permission decisions");
  }
  if (descriptor.test_evidence_contract?.unauthorized_count_exposed !== false) {
    errors.push("CP00-656 test evidence must not expose unauthorized counts");
  }
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) {
    errors.push("CP00-656 fixture runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.permission_matrix_runtime_opened !== false) {
    errors.push("CP00-656 permission matrix runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) {
    errors.push("CP00-656 Hermes runtime must remain closed");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.next_pack_id) {
    errors.push("CP00-656 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-656 handoff next subphase drift");
  }
  if (
    contractProjection.cp656_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp656_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-656 contract projection descriptor drift");
  }
  return freezeCp656Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}


export function validateAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor(
  descriptor = createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.synthetic_failure_recovery_bridge_case_set ??
    createAdminConsoleCp657SyntheticFailureRecoveryBridgeCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor") {
    errors.push("CP00-657 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-657 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-657 source descriptor ref drift");
  }
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id) errors.push("CP00-657 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.upstream_pack_id) {
    errors.push("CP00-657 upstream pack binding drift");
  }
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP657_REQUIREMENTS.required_section_rows).length) {
    errors.push("CP00-657 section count drift");
  }
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP657_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) {
      errors.push("CP00-657 missing section " + microId);
      continue;
    }
    if (section.micro_title !== ADMIN_CONSOLE_CP657_REQUIREMENTS.required_section_micro_titles[microId]) {
      errors.push("CP00-657 " + microId + " title drift");
    }
    if (section.row_count !== titles.length) errors.push("CP00-657 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) {
        errors.push("CP00-657 missing descriptor row " + microId + " " + title);
        continue;
      }
      if (row.descriptor_only !== true) errors.push("CP00-657 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-657 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-657 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP657_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-657 missing no-leak guard " + guard);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "executes_taxonomy_mutation_runtime",
    "executes_template_mutation_runtime",
    "executes_workflow_mutation_runtime",
    "executes_policy_mutation_runtime",
    "executes_usage_limit_runtime",
    "executes_billing_plan_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "executes_failure_recovery_runtime",
    "persists_failure_receipt",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) {
    if (descriptor[flag] !== false) errors.push("CP00-657 " + flag + " must remain false");
  }
  const bridge = descriptor.synthetic_failure_recovery_bridge_contract;
  if (bridge?.fixture_payload_included !== false) errors.push("CP00-657 bridge must not include fixture payloads");
  if (bridge?.real_tenant_data_loaded !== false) errors.push("CP00-657 bridge must not load real tenant data");
  if (bridge?.real_user_data_loaded !== false) errors.push("CP00-657 bridge must not load real user data");
  if (bridge?.real_matter_data_loaded !== false) errors.push("CP00-657 bridge must not load real matter data");
  if (bridge?.real_document_data_loaded !== false) errors.push("CP00-657 bridge must not load real document data");
  if (bridge?.executes_failure_recovery_runtime !== false) errors.push("CP00-657 bridge must not execute failure recovery runtime");
  if (bridge?.persists_failure_receipt !== false) errors.push("CP00-657 bridge must not persist failure receipts");
  if (bridge?.exposes_blocked_claim_detail !== false) errors.push("CP00-657 bridge must not expose blocked-claim details");
  if (bridge?.exposes_unauthorized_count !== false) errors.push("CP00-657 bridge must not expose unauthorized counts");
  if (bridge?.promotes_claude_to_final_approval !== false) errors.push("CP00-657 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) {
    errors.push("CP00-657 test evidence must not emit runtime receipt");
  }
  if (descriptor.test_evidence_contract?.review_payload_persisted !== false) {
    errors.push("CP00-657 test evidence must not persist review payloads");
  }
  if (descriptor.test_evidence_contract?.failure_recovery_runtime_opened !== false) {
    errors.push("CP00-657 test evidence must not open failure recovery runtime");
  }
  if (descriptor.runtime_boundary?.failure_recovery_runtime_opened !== false) {
    errors.push("CP00-657 failure recovery runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.permission_matrix_runtime_opened !== false) {
    errors.push("CP00-657 permission matrix runtime must remain closed");
  }
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) {
    errors.push("CP00-657 Hermes runtime must remain closed");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.next_pack_id) {
    errors.push("CP00-657 handoff target drift");
  }
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-657 handoff next subphase drift");
  }
  if (
    contractProjection.cp657_descriptor?.pack_binding?.pack_id &&
    contractProjection.cp657_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-657 contract projection descriptor drift");
  }
  return freezeCp657Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}


export function validateAdminConsoleCp658FailureReceiptEscalationDescriptor(
  descriptor = createAdminConsoleCp658FailureReceiptEscalationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_receipt_escalation_case_set ?? createAdminConsoleCp658FailureReceiptEscalationCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp658FailureReceiptEscalationDescriptor") errors.push("CP00-658 descriptor type drift");
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-658 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.upstream_pack_id) errors.push("CP00-658 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id) errors.push("CP00-658 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.upstream_pack_id) errors.push("CP00-658 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP658_REQUIREMENTS.required_section_rows).length) errors.push("CP00-658 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP658_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-658 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP658_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-658 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-658 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-658 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-658 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-658 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-658 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP658_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-658 missing no-leak guard " + guard);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "executes_failure_recovery_runtime",
    "persists_failure_receipt",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-658 " + flag + " must remain false");
  const contract = descriptor.failure_receipt_escalation_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-658 escalation must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-658 escalation must not load real tenant data");
  if (contract?.persists_failure_receipt !== false) errors.push("CP00-658 escalation must not persist failure receipts");
  if (contract?.exposes_blocked_claim_detail !== false) errors.push("CP00-658 escalation must not expose blocked-claim details");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-658 escalation must not emit Hermes runtime receipts");
  if (contract?.persists_review_packet !== false) errors.push("CP00-658 escalation must not persist review packets");
  if (contract?.executes_failure_recovery_runtime !== false) errors.push("CP00-658 escalation must not execute failure runtime");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-658 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-658 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.failure_recovery_runtime_opened !== false) errors.push("CP00-658 test evidence must not open failure runtime");
  if (descriptor.runtime_boundary?.failure_recovery_runtime_opened !== false) errors.push("CP00-658 failure runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-658 Hermes runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.next_pack_id) errors.push("CP00-658 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.next_subphase_id) errors.push("CP00-658 handoff next subphase drift");
  if (contractProjection.cp658_descriptor?.pack_binding?.pack_id && contractProjection.cp658_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id) errors.push("CP00-658 contract projection descriptor drift");
  return freezeCp658Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor(
  descriptor = createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.failure_recovery_permission_audit_binding_case_set ??
    createAdminConsoleCp659FailureRecoveryPermissionAuditBindingCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor") {
    errors.push("CP00-659 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-659 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.upstream_pack_id) errors.push("CP00-659 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id) errors.push("CP00-659 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.upstream_pack_id) errors.push("CP00-659 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP659_REQUIREMENTS.required_section_rows).length) errors.push("CP00-659 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP659_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-659 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP659_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-659 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-659 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-659 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-659 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-659 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-659 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP659_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-659 missing no-leak guard " + guard);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "executes_failure_recovery_runtime",
    "persists_failure_receipt",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-659 " + flag + " must remain false");
  const contract = descriptor.failure_recovery_permission_audit_binding_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-659 binding must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-659 binding must not load real tenant data");
  if (contract?.persists_failure_receipt !== false) errors.push("CP00-659 binding must not persist failure receipts");
  if (contract?.exposes_blocked_claim_detail !== false) errors.push("CP00-659 binding must not expose blocked-claim details");
  if (contract?.exposes_unauthorized_count !== false) errors.push("CP00-659 binding must not expose unauthorized counts");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-659 binding must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-659 binding must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-659 binding must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-659 binding must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-659 binding must not emit Hermes runtime receipts");
  if (contract?.persists_review_packet !== false) errors.push("CP00-659 binding must not persist review packets");
  if (contract?.executes_failure_recovery_runtime !== false) errors.push("CP00-659 binding must not execute failure runtime");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-659 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-659 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.failure_recovery_runtime_opened !== false) errors.push("CP00-659 test evidence must not open failure runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-659 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-659 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.failure_recovery_runtime_opened !== false) errors.push("CP00-659 failure runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-659 Hermes runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.next_pack_id) errors.push("CP00-659 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.next_subphase_id) errors.push("CP00-659 handoff next subphase drift");
  if (contractProjection.cp659_descriptor?.pack_binding?.pack_id && contractProjection.cp659_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id) errors.push("CP00-659 contract projection descriptor drift");
  return freezeCp659Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor(
  descriptor = createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.failure_recovery_fixture_transition_case_set ??
    createAdminConsoleCp660FailureRecoveryFixtureTransitionCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor") {
    errors.push("CP00-660 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-660 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.upstream_pack_id) errors.push("CP00-660 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id) errors.push("CP00-660 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.upstream_pack_id) errors.push("CP00-660 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP660_REQUIREMENTS.required_section_rows).length) errors.push("CP00-660 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP660_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-660 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP660_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-660 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-660 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-660 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-660 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-660 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-660 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP660_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-660 missing no-leak guard " + guard);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "executes_failure_recovery_runtime",
    "persists_failure_receipt",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-660 " + flag + " must remain false");
  const contract = descriptor.failure_recovery_fixture_transition_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-660 transition must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-660 transition must not load real tenant data");
  if (contract?.persists_failure_receipt !== false) errors.push("CP00-660 transition must not persist failure receipts");
  if (contract?.exposes_blocked_claim_detail !== false) errors.push("CP00-660 transition must not expose blocked-claim details");
  if (contract?.exposes_unauthorized_count !== false) errors.push("CP00-660 transition must not expose unauthorized counts");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-660 transition must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-660 transition must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-660 transition must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-660 transition must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-660 transition must not emit Hermes runtime receipts");
  if (contract?.persists_review_packet !== false) errors.push("CP00-660 transition must not persist review packets");
  if (contract?.executes_failure_recovery_runtime !== false) errors.push("CP00-660 transition must not execute failure runtime");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-660 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-660 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.failure_recovery_runtime_opened !== false) errors.push("CP00-660 test evidence must not open failure runtime");
  if (descriptor.test_evidence_contract?.fixture_runtime_opened !== false) errors.push("CP00-660 test evidence must not open fixture runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-660 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-660 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) errors.push("CP00-660 fixture runtime must remain closed");
  if (descriptor.runtime_boundary?.failure_recovery_runtime_opened !== false) errors.push("CP00-660 failure runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-660 Hermes runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.next_pack_id) errors.push("CP00-660 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.next_subphase_id) errors.push("CP00-660 handoff next subphase drift");
  if (contractProjection.cp660_descriptor?.pack_binding?.pack_id && contractProjection.cp660_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id) errors.push("CP00-660 contract projection descriptor drift");
  return freezeCp660Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor(
  descriptor = createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.failure_recovery_hermes_evidence_bridge_case_set ??
    createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor") {
    errors.push("CP00-661 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-661 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.upstream_pack_id) errors.push("CP00-661 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id) errors.push("CP00-661 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.upstream_pack_id) errors.push("CP00-661 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP661_REQUIREMENTS.required_section_rows).length) errors.push("CP00-661 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP661_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-661 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP661_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-661 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-661 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-661 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-661 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-661 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-661 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP661_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-661 missing no-leak guard " + guard);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "executes_failure_recovery_runtime",
    "persists_failure_receipt",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-661 " + flag + " must remain false");
  const contract = descriptor.failure_recovery_hermes_evidence_bridge_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-661 bridge must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-661 bridge must not load real tenant data");
  if (contract?.real_user_data_loaded !== false) errors.push("CP00-661 bridge must not load real user data");
  if (contract?.real_matter_data_loaded !== false) errors.push("CP00-661 bridge must not load real matter data");
  if (contract?.real_document_data_loaded !== false) errors.push("CP00-661 bridge must not load real document data");
  if (contract?.persists_failure_receipt !== false) errors.push("CP00-661 bridge must not persist failure receipts");
  if (contract?.exposes_blocked_claim_detail !== false) errors.push("CP00-661 bridge must not expose blocked-claim details");
  if (contract?.exposes_unauthorized_count !== false) errors.push("CP00-661 bridge must not expose unauthorized counts");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-661 bridge must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-661 bridge must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-661 bridge must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-661 bridge must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-661 bridge must not emit Hermes runtime receipts");
  if (contract?.persists_review_packet !== false) errors.push("CP00-661 bridge must not persist review packets");
  if (contract?.executes_failure_recovery_runtime !== false) errors.push("CP00-661 bridge must not execute failure runtime");
  if (contract?.executes_hermes_command_runtime !== false) errors.push("CP00-661 bridge must not execute Hermes command runtime");
  if (contract?.persists_command_result_receipt !== false) errors.push("CP00-661 bridge must not persist command receipts");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-661 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-661 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.failure_recovery_runtime_opened !== false) errors.push("CP00-661 test evidence must not open failure runtime");
  if (descriptor.test_evidence_contract?.fixture_runtime_opened !== false) errors.push("CP00-661 test evidence must not open fixture runtime");
  if (descriptor.test_evidence_contract?.hermes_runtime_opened !== false) errors.push("CP00-661 test evidence must not open Hermes runtime");
  if (descriptor.test_evidence_contract?.command_runtime_opened !== false) errors.push("CP00-661 test evidence must not open command runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-661 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-661 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) errors.push("CP00-661 fixture runtime must remain closed");
  if (descriptor.runtime_boundary?.failure_recovery_runtime_opened !== false) errors.push("CP00-661 failure runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-661 Hermes runtime must remain closed");
  if (descriptor.runtime_boundary?.command_runtime_opened !== false) errors.push("CP00-661 command runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.next_pack_id) errors.push("CP00-661 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.next_subphase_id) errors.push("CP00-661 handoff next subphase drift");
  if (contractProjection.cp661_descriptor?.pack_binding?.pack_id && contractProjection.cp661_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id) errors.push("CP00-661 contract projection descriptor drift");
  return freezeCp661Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}


export function validateAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor(
  descriptor = createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.evidence_permission_fixture_bridge_case_set ??
    createAdminConsoleCp662EvidencePermissionFixtureBridgeCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor") {
    errors.push("CP00-662 descriptor type drift");
  }
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-662 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.upstream_pack_id) errors.push("CP00-662 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id) errors.push("CP00-662 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.upstream_pack_id) errors.push("CP00-662 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP662_REQUIREMENTS.required_section_rows).length) errors.push("CP00-662 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP662_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-662 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP662_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-662 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-662 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-662 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-662 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-662 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-662 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP662_REQUIREMENTS.required_no_leak_guards) {
    if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-662 missing no-leak guard " + guard);
  }
  const falseFlags = [
    "writes_product_state",
    "executes_admin_console_runtime",
    "evaluates_runtime_permission",
    "writes_permission_decision",
    "emits_audit_event",
    "persists_audit_event",
    "creates_database_rows",
    "updates_database_rows",
    "deletes_database_rows",
    "reads_object_storage",
    "writes_object_storage",
    "opens_ui_runtime",
    "exposes_hidden_policy_internals",
    "exposes_unauthorized_admin_rows",
    "exposes_blocked_claim_detail",
    "persists_idempotency_key",
    "persists_workflow_attempt",
    "acquires_runtime_lock",
    "executes_golden_case_runtime",
    "emits_hermes_runtime_receipt",
    "exposes_review_payload",
    "persists_review_packet",
    "opens_api_runtime",
    "opens_contract_runtime",
    "opens_ui_data_runtime",
    "executes_ui_build_runtime",
    "exposes_unauthorized_count",
    "executes_failure_recovery_runtime",
    "persists_failure_receipt",
    "leak_detected",
    "permission_bypass_detected",
  ];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-662 " + flag + " must remain false");
  const contract = descriptor.evidence_permission_fixture_bridge_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-662 bridge must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-662 bridge must not load real tenant data");
  if (contract?.real_user_data_loaded !== false) errors.push("CP00-662 bridge must not load real user data");
  if (contract?.real_matter_data_loaded !== false) errors.push("CP00-662 bridge must not load real matter data");
  if (contract?.real_document_data_loaded !== false) errors.push("CP00-662 bridge must not load real document data");
  if (contract?.persists_failure_receipt !== false) errors.push("CP00-662 bridge must not persist failure receipts");
  if (contract?.exposes_blocked_claim_detail !== false) errors.push("CP00-662 bridge must not expose blocked-claim details");
  if (contract?.exposes_unauthorized_count !== false) errors.push("CP00-662 bridge must not expose unauthorized counts");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-662 bridge must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-662 bridge must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-662 bridge must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-662 bridge must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-662 bridge must not emit Hermes runtime receipts");
  if (contract?.persists_review_packet !== false) errors.push("CP00-662 bridge must not persist review packets");
  if (contract?.executes_failure_recovery_runtime !== false) errors.push("CP00-662 bridge must not execute failure runtime");
  if (contract?.executes_hermes_command_runtime !== false) errors.push("CP00-662 bridge must not execute Hermes command runtime");
  if (contract?.persists_command_result_receipt !== false) errors.push("CP00-662 bridge must not persist command receipts");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-662 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-662 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.permission_runtime_opened !== false) errors.push("CP00-662 test evidence must not open permission runtime");
  if (descriptor.test_evidence_contract?.audit_runtime_opened !== false) errors.push("CP00-662 test evidence must not open audit runtime");
  if (descriptor.test_evidence_contract?.fixture_runtime_opened !== false) errors.push("CP00-662 test evidence must not open fixture runtime");
  if (descriptor.test_evidence_contract?.hermes_runtime_opened !== false) errors.push("CP00-662 test evidence must not open Hermes runtime");
  if (descriptor.test_evidence_contract?.command_runtime_opened !== false) errors.push("CP00-662 test evidence must not open command runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-662 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-662 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) errors.push("CP00-662 fixture runtime must remain closed");
  if (descriptor.runtime_boundary?.failure_recovery_runtime_opened !== false) errors.push("CP00-662 failure runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-662 Hermes runtime must remain closed");
  if (descriptor.runtime_boundary?.command_runtime_opened !== false) errors.push("CP00-662 command runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.next_pack_id) errors.push("CP00-662 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.next_subphase_id) errors.push("CP00-662 handoff next subphase drift");
  if (contractProjection.cp662_descriptor?.pack_binding?.pack_id && contractProjection.cp662_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id) errors.push("CP00-662 contract projection descriptor drift");
  return freezeCp662Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp663ReviewReadinessBridgeDescriptor(
  descriptor = createAdminConsoleCp663ReviewReadinessBridgeDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_readiness_bridge_case_set ?? createAdminConsoleCp663ReviewReadinessBridgeCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp663ReviewReadinessBridgeDescriptor") errors.push("CP00-663 descriptor type drift");
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-663 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.upstream_pack_id) errors.push("CP00-663 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id) errors.push("CP00-663 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.upstream_pack_id) errors.push("CP00-663 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP663_REQUIREMENTS.required_section_rows).length) errors.push("CP00-663 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP663_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-663 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP663_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-663 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-663 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-663 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-663 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-663 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-663 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP663_REQUIREMENTS.required_no_leak_guards) if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-663 missing no-leak guard " + guard);
  const falseFlags = ["writes_product_state", "executes_admin_console_runtime", "evaluates_runtime_permission", "writes_permission_decision", "emits_audit_event", "persists_audit_event", "creates_database_rows", "updates_database_rows", "deletes_database_rows", "reads_object_storage", "writes_object_storage", "opens_ui_runtime", "exposes_hidden_policy_internals", "exposes_unauthorized_admin_rows", "exposes_blocked_claim_detail", "persists_idempotency_key", "persists_workflow_attempt", "acquires_runtime_lock", "executes_golden_case_runtime", "emits_hermes_runtime_receipt", "exposes_review_payload", "persists_review_packet", "opens_api_runtime", "opens_contract_runtime", "opens_ui_data_runtime", "executes_ui_build_runtime", "exposes_unauthorized_count", "executes_failure_recovery_runtime", "persists_failure_receipt", "leak_detected", "permission_bypass_detected"];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-663 " + flag + " must remain false");
  const contract = descriptor.review_readiness_bridge_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-663 bridge must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-663 bridge must not load real tenant data");
  if (contract?.real_user_data_loaded !== false) errors.push("CP00-663 bridge must not load real user data");
  if (contract?.real_matter_data_loaded !== false) errors.push("CP00-663 bridge must not load real matter data");
  if (contract?.real_document_data_loaded !== false) errors.push("CP00-663 bridge must not load real document data");
  if (contract?.persists_review_packet !== false) errors.push("CP00-663 bridge must not persist review packets");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-663 bridge must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-663 bridge must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-663 bridge must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-663 bridge must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-663 bridge must not emit Hermes runtime receipts");
  if (contract?.executes_hermes_command_runtime !== false) errors.push("CP00-663 bridge must not execute Hermes command runtime");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-663 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-663 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.permission_runtime_opened !== false) errors.push("CP00-663 test evidence must not open permission runtime");
  if (descriptor.test_evidence_contract?.audit_runtime_opened !== false) errors.push("CP00-663 test evidence must not open audit runtime");
  if (descriptor.test_evidence_contract?.fixture_runtime_opened !== false) errors.push("CP00-663 test evidence must not open fixture runtime");
  if (descriptor.test_evidence_contract?.hermes_runtime_opened !== false) errors.push("CP00-663 test evidence must not open Hermes runtime");
  if (descriptor.test_evidence_contract?.command_runtime_opened !== false) errors.push("CP00-663 test evidence must not open command runtime");
  if (descriptor.test_evidence_contract?.ui_runtime_opened !== false) errors.push("CP00-663 test evidence must not open UI runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-663 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-663 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) errors.push("CP00-663 fixture runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-663 Hermes runtime must remain closed");
  if (descriptor.runtime_boundary?.command_runtime_opened !== false) errors.push("CP00-663 command runtime must remain closed");
  if (descriptor.runtime_boundary?.ui_runtime_opened !== false) errors.push("CP00-663 UI runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.next_pack_id) errors.push("CP00-663 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.next_subphase_id) errors.push("CP00-663 handoff next subphase drift");
  if (contractProjection.cp663_descriptor?.pack_binding?.pack_id && contractProjection.cp663_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id) errors.push("CP00-663 contract projection descriptor drift");
  return freezeCp663Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp664TestGoldenReviewTailDescriptor(
  descriptor = createAdminConsoleCp664TestGoldenReviewTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.test_golden_review_tail_case_set ?? createAdminConsoleCp664TestGoldenReviewTailCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp664TestGoldenReviewTailDescriptor") errors.push("CP00-664 descriptor type drift");
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-664 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.upstream_pack_id) errors.push("CP00-664 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id) errors.push("CP00-664 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.upstream_pack_id) errors.push("CP00-664 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP664_REQUIREMENTS.required_section_rows).length) errors.push("CP00-664 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP664_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-664 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP664_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-664 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-664 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-664 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-664 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-664 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-664 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP664_REQUIREMENTS.required_no_leak_guards) if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-664 missing no-leak guard " + guard);
  const falseFlags = ["writes_product_state", "executes_admin_console_runtime", "evaluates_runtime_permission", "writes_permission_decision", "emits_audit_event", "persists_audit_event", "creates_database_rows", "updates_database_rows", "deletes_database_rows", "reads_object_storage", "writes_object_storage", "opens_ui_runtime", "exposes_hidden_policy_internals", "exposes_unauthorized_admin_rows", "exposes_blocked_claim_detail", "persists_idempotency_key", "persists_workflow_attempt", "acquires_runtime_lock", "executes_golden_case_runtime", "emits_hermes_runtime_receipt", "exposes_review_payload", "persists_review_packet", "opens_api_runtime", "opens_contract_runtime", "opens_ui_data_runtime", "executes_ui_build_runtime", "exposes_unauthorized_count", "executes_failure_recovery_runtime", "persists_failure_receipt", "leak_detected", "permission_bypass_detected"];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-664 " + flag + " must remain false");
  const contract = descriptor.test_golden_review_tail_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-664 tail must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-664 tail must not load real tenant data");
  if (contract?.real_user_data_loaded !== false) errors.push("CP00-664 tail must not load real user data");
  if (contract?.real_matter_data_loaded !== false) errors.push("CP00-664 tail must not load real matter data");
  if (contract?.real_document_data_loaded !== false) errors.push("CP00-664 tail must not load real document data");
  if (contract?.persists_review_packet !== false) errors.push("CP00-664 tail must not persist review packets");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-664 tail must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-664 tail must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-664 tail must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-664 tail must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-664 tail must not emit Hermes runtime receipts");
  if (contract?.executes_hermes_command_runtime !== false) errors.push("CP00-664 tail must not execute Hermes command runtime");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-664 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-664 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.permission_runtime_opened !== false) errors.push("CP00-664 test evidence must not open permission runtime");
  if (descriptor.test_evidence_contract?.audit_runtime_opened !== false) errors.push("CP00-664 test evidence must not open audit runtime");
  if (descriptor.test_evidence_contract?.fixture_runtime_opened !== false) errors.push("CP00-664 test evidence must not open fixture runtime");
  if (descriptor.test_evidence_contract?.hermes_runtime_opened !== false) errors.push("CP00-664 test evidence must not open Hermes runtime");
  if (descriptor.test_evidence_contract?.command_runtime_opened !== false) errors.push("CP00-664 test evidence must not open command runtime");
  if (descriptor.test_evidence_contract?.ui_runtime_opened !== false) errors.push("CP00-664 test evidence must not open UI runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-664 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-664 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) errors.push("CP00-664 fixture runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-664 Hermes runtime must remain closed");
  if (descriptor.runtime_boundary?.command_runtime_opened !== false) errors.push("CP00-664 command runtime must remain closed");
  if (descriptor.runtime_boundary?.ui_runtime_opened !== false) errors.push("CP00-664 UI runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.next_pack_id) errors.push("CP00-664 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.next_subphase_id) errors.push("CP00-664 handoff next subphase drift");
  if (contractProjection.cp664_descriptor?.pack_binding?.pack_id && contractProjection.cp664_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id) errors.push("CP00-664 contract projection descriptor drift");
  return freezeCp664Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}

export function validateAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor(
  descriptor = createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet =
    descriptor.review_evidence_closeout_bridge_case_set ??
    createAdminConsoleCp665ReviewEvidenceCloseoutBridgeCaseSet();
  if (descriptor.descriptor !== "AdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor") errors.push("CP00-665 descriptor type drift");
  if (descriptor.program_contract?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("CP00-665 program id drift");
  if (descriptor.source_descriptor_ref?.pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.upstream_pack_id) errors.push("CP00-665 source descriptor ref drift");
  if (descriptor.pack_binding?.pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) errors.push("CP00-665 pack binding drift");
  if (descriptor.upstream_pack_binding?.pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.upstream_pack_id) errors.push("CP00-665 upstream pack binding drift");
  if (caseSet.section_count !== Object.keys(ADMIN_CONSOLE_CP665_REQUIREMENTS.required_section_rows).length) errors.push("CP00-665 section count drift");
  for (const [microId, titles] of Object.entries(ADMIN_CONSOLE_CP665_REQUIREMENTS.required_section_rows)) {
    const section = caseSet.sections?.[microId];
    if (!section) { errors.push("CP00-665 missing section " + microId); continue; }
    if (section.micro_title !== ADMIN_CONSOLE_CP665_REQUIREMENTS.required_section_micro_titles[microId]) errors.push("CP00-665 " + microId + " title drift");
    if (section.row_count !== titles.length) errors.push("CP00-665 " + microId + " section row count drift");
    for (const title of titles) {
      const row = section.rows?.[adminConsoleRowKey(title)];
      if (!row) { errors.push("CP00-665 missing descriptor row " + microId + " " + title); continue; }
      if (row.descriptor_only !== true) errors.push("CP00-665 " + microId + " " + title + " must be descriptor-only");
      if (row.runtime_execution !== false) errors.push("CP00-665 " + microId + " " + title + " must not execute runtime");
      if (row.raw_payload_included !== false) errors.push("CP00-665 " + microId + " " + title + " must not include raw payload");
    }
  }
  for (const guard of ADMIN_CONSOLE_CP665_REQUIREMENTS.required_no_leak_guards) if (!descriptor.no_leak_guards?.includes(guard)) errors.push("CP00-665 missing no-leak guard " + guard);
  const falseFlags = ["writes_product_state", "executes_admin_console_runtime", "evaluates_runtime_permission", "writes_permission_decision", "emits_audit_event", "persists_audit_event", "creates_database_rows", "updates_database_rows", "deletes_database_rows", "reads_object_storage", "writes_object_storage", "opens_ui_runtime", "exposes_hidden_policy_internals", "exposes_unauthorized_admin_rows", "exposes_blocked_claim_detail", "persists_idempotency_key", "persists_workflow_attempt", "acquires_runtime_lock", "executes_golden_case_runtime", "emits_hermes_runtime_receipt", "exposes_review_payload", "persists_review_packet", "opens_api_runtime", "opens_contract_runtime", "opens_ui_data_runtime", "executes_ui_build_runtime", "exposes_unauthorized_count", "executes_failure_recovery_runtime", "persists_failure_receipt", "leak_detected", "permission_bypass_detected"];
  for (const flag of falseFlags) if (descriptor[flag] !== false) errors.push("CP00-665 " + flag + " must remain false");
  const contract = descriptor.review_evidence_closeout_bridge_contract;
  if (contract?.fixture_payload_included !== false) errors.push("CP00-665 bridge must not include fixture payloads");
  if (contract?.real_tenant_data_loaded !== false) errors.push("CP00-665 bridge must not load real tenant data");
  if (contract?.real_user_data_loaded !== false) errors.push("CP00-665 bridge must not load real user data");
  if (contract?.real_matter_data_loaded !== false) errors.push("CP00-665 bridge must not load real matter data");
  if (contract?.real_document_data_loaded !== false) errors.push("CP00-665 bridge must not load real document data");
  if (contract?.persists_review_packet !== false) errors.push("CP00-665 bridge must not persist review packets");
  if (contract?.evaluates_runtime_permission !== false) errors.push("CP00-665 bridge must not evaluate runtime permission");
  if (contract?.writes_permission_decision !== false) errors.push("CP00-665 bridge must not write permission decisions");
  if (contract?.emits_audit_event !== false) errors.push("CP00-665 bridge must not emit audit events");
  if (contract?.persists_audit_event !== false) errors.push("CP00-665 bridge must not persist audit events");
  if (contract?.emits_hermes_runtime_receipt !== false) errors.push("CP00-665 bridge must not emit Hermes runtime receipts");
  if (contract?.executes_hermes_command_runtime !== false) errors.push("CP00-665 bridge must not execute Hermes command runtime");
  if (contract?.promotes_claude_to_final_approval !== false) errors.push("CP00-665 must not promote Claude to final approval");
  if (descriptor.test_evidence_contract?.runtime_receipt_emitted !== false) errors.push("CP00-665 test evidence must not emit runtime receipt");
  if (descriptor.test_evidence_contract?.permission_runtime_opened !== false) errors.push("CP00-665 test evidence must not open permission runtime");
  if (descriptor.test_evidence_contract?.audit_runtime_opened !== false) errors.push("CP00-665 test evidence must not open audit runtime");
  if (descriptor.test_evidence_contract?.fixture_runtime_opened !== false) errors.push("CP00-665 test evidence must not open fixture runtime");
  if (descriptor.test_evidence_contract?.hermes_runtime_opened !== false) errors.push("CP00-665 test evidence must not open Hermes runtime");
  if (descriptor.test_evidence_contract?.command_runtime_opened !== false) errors.push("CP00-665 test evidence must not open command runtime");
  if (descriptor.test_evidence_contract?.ui_runtime_opened !== false) errors.push("CP00-665 test evidence must not open UI runtime");
  if (descriptor.runtime_boundary?.permission_runtime_opened !== false) errors.push("CP00-665 permission runtime must remain closed");
  if (descriptor.runtime_boundary?.audit_runtime_opened !== false) errors.push("CP00-665 audit runtime must remain closed");
  if (descriptor.runtime_boundary?.fixture_runtime_opened !== false) errors.push("CP00-665 fixture runtime must remain closed");
  if (descriptor.runtime_boundary?.hermes_runtime_opened !== false) errors.push("CP00-665 Hermes runtime must remain closed");
  if (descriptor.runtime_boundary?.command_runtime_opened !== false) errors.push("CP00-665 command runtime must remain closed");
  if (descriptor.runtime_boundary?.ui_runtime_opened !== false) errors.push("CP00-665 UI runtime must remain closed");
  if (descriptor.closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.next_pack_id) errors.push("CP00-665 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.next_subphase_id) errors.push("CP00-665 handoff next subphase drift");
  if (contractProjection.cp665_descriptor?.pack_binding?.pack_id && contractProjection.cp665_descriptor.pack_binding.pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) errors.push("CP00-665 contract projection descriptor drift");
  return freezeCp665Validation({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor, case_set: caseSet });
}
export function validateAdminConsoleCoreContractProjection(
  contractProjection = createAdminConsoleCoreContractProjection(),
  planPacks,
) {
  const errors = [];
  const {
    cp645PlanPack,
    cp646PlanPack,
    cp647PlanPack,
    cp648PlanPack,
    cp649PlanPack,
    cp650PlanPack,
    cp651PlanPack,
    cp652PlanPack,
    cp653PlanPack,
    cp654PlanPack,
    cp655PlanPack,
    cp656PlanPack,
    cp657PlanPack,
    cp658PlanPack,
    cp659PlanPack,
    cp660PlanPack,
    cp661PlanPack,
    cp662PlanPack,
    cp663PlanPack,
    cp664PlanPack,
    cp665PlanPack,
  } =
    resolveCoreProjectionPlanPacks(planPacks);
  const cp645Coverage = validateAdminConsoleCp645Coverage(cp645PlanPack);
  const cp646Coverage = validateAdminConsoleCp646Coverage(cp646PlanPack);
  const cp647Coverage = validateAdminConsoleCp647Coverage(cp647PlanPack);
  const cp648Coverage = validateAdminConsoleCp648Coverage(cp648PlanPack);
  const cp649Coverage = validateAdminConsoleCp649Coverage(cp649PlanPack);
  const cp650Coverage = validateAdminConsoleCp650Coverage(cp650PlanPack);
  const cp651Coverage = validateAdminConsoleCp651Coverage(cp651PlanPack);
  const cp652Coverage = validateAdminConsoleCp652Coverage(cp652PlanPack);
  const cp653Coverage = validateAdminConsoleCp653Coverage(cp653PlanPack);
  const cp654Coverage = validateAdminConsoleCp654Coverage(cp654PlanPack);
  const cp655Coverage = validateAdminConsoleCp655Coverage(cp655PlanPack);
  const cp656Coverage = validateAdminConsoleCp656Coverage(cp656PlanPack);
  const cp657Coverage = validateAdminConsoleCp657Coverage(cp657PlanPack);
  const cp658Coverage = validateAdminConsoleCp658Coverage(cp658PlanPack);
  const cp659Coverage = validateAdminConsoleCp659Coverage(cp659PlanPack);
  const cp660Coverage = validateAdminConsoleCp660Coverage(cp660PlanPack);
  const cp661Coverage = validateAdminConsoleCp661Coverage(cp661PlanPack);
  const cp662Coverage = validateAdminConsoleCp662Coverage(cp662PlanPack);
  const cp663Coverage = validateAdminConsoleCp663Coverage(cp663PlanPack);
  const cp664Coverage = validateAdminConsoleCp664Coverage(cp664PlanPack);
  const cp665Coverage = validateAdminConsoleCp665Coverage(cp665PlanPack);
  const cp645Descriptor = validateAdminConsoleCp645ScopeDomainFoundationDescriptor(contractProjection.cp645_descriptor, contractProjection);
  const cp646Descriptor = validateAdminConsoleCp646DomainServiceBridgeDescriptor(contractProjection.cp646_descriptor, contractProjection);
  const cp647Descriptor = validateAdminConsoleCp647TestEvidenceReviewPacketDescriptor(
    contractProjection.cp647_descriptor,
    contractProjection,
  );
  const cp648Descriptor = validateAdminConsoleCp648ClaudeReviewBoundaryDescriptor(
    contractProjection.cp648_descriptor,
    contractProjection,
  );
  const cp649Descriptor = validateAdminConsoleCp649ReviewCloseoutApiUiDescriptor(
    contractProjection.cp649_descriptor,
    contractProjection,
  );
  const cp650Descriptor = validateAdminConsoleCp650UiImplementationSliceDescriptor(
    contractProjection.cp650_descriptor,
    contractProjection,
  );
  const cp651Descriptor = validateAdminConsoleCp651UiPermissionFixtureDescriptor(
    contractProjection.cp651_descriptor,
    contractProjection,
  );
  const cp652Descriptor = validateAdminConsoleCp652FixtureGoldenCaseDescriptor(
    contractProjection.cp652_descriptor,
    contractProjection,
  );
  const cp653Descriptor = validateAdminConsoleCp653PermissionFixtureTailDescriptor(
    contractProjection.cp653_descriptor,
    contractProjection,
  );
  const cp654Descriptor = validateAdminConsoleCp654SyntheticPermissionMatrixDescriptor(
    contractProjection.cp654_descriptor,
    contractProjection,
  );
  const cp655Descriptor = validateAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor(
    contractProjection.cp655_descriptor,
    contractProjection,
  );
  const cp656Descriptor = validateAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor(
    contractProjection.cp656_descriptor,
    contractProjection,
  );
  const cp657Descriptor = validateAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor(
    contractProjection.cp657_descriptor,
    contractProjection,
  );
  const cp658Descriptor = validateAdminConsoleCp658FailureReceiptEscalationDescriptor(
    contractProjection.cp658_descriptor,
    contractProjection,
  );
  const cp659Descriptor = validateAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor(
    contractProjection.cp659_descriptor,
    contractProjection,
  );
  const cp660Descriptor = validateAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor(
    contractProjection.cp660_descriptor,
    contractProjection,
  );
  const cp661Descriptor = validateAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor(
    contractProjection.cp661_descriptor,
    contractProjection,
  );
  const cp662Descriptor = validateAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor(
    contractProjection.cp662_descriptor,
    contractProjection,
  );
  const cp663Descriptor = validateAdminConsoleCp663ReviewReadinessBridgeDescriptor(
    contractProjection.cp663_descriptor,
    contractProjection,
  );
  const cp664Descriptor = validateAdminConsoleCp664TestGoldenReviewTailDescriptor(
    contractProjection.cp664_descriptor,
    contractProjection,
  );
  const cp665Descriptor = validateAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor(
    contractProjection.cp665_descriptor,
    contractProjection,
  );
  if (!cp645Coverage.valid) errors.push(...cp645Coverage.errors);
  if (!cp646Coverage.valid) errors.push(...cp646Coverage.errors);
  if (!cp647Coverage.valid) errors.push(...cp647Coverage.errors);
  if (!cp648Coverage.valid) errors.push(...cp648Coverage.errors);
  if (!cp649Coverage.valid) errors.push(...cp649Coverage.errors);
  if (!cp650Coverage.valid) errors.push(...cp650Coverage.errors);
  if (!cp651Coverage.valid) errors.push(...cp651Coverage.errors);
  if (!cp652Coverage.valid) errors.push(...cp652Coverage.errors);
  if (!cp653Coverage.valid) errors.push(...cp653Coverage.errors);
  if (!cp654Coverage.valid) errors.push(...cp654Coverage.errors);
  if (!cp655Coverage.valid) errors.push(...cp655Coverage.errors);
  if (!cp656Coverage.valid) errors.push(...cp656Coverage.errors);
  if (!cp657Coverage.valid) errors.push(...cp657Coverage.errors);
  if (!cp658Coverage.valid) errors.push(...cp658Coverage.errors);
  if (!cp659Coverage.valid) errors.push(...cp659Coverage.errors);
  if (!cp660Coverage.valid) errors.push(...cp660Coverage.errors);
  if (!cp661Coverage.valid) errors.push(...cp661Coverage.errors);
  if (!cp662Coverage.valid) errors.push(...cp662Coverage.errors);
  if (!cp663Coverage.valid) errors.push(...cp663Coverage.errors);
  if (!cp664Coverage.valid) errors.push(...cp664Coverage.errors);
  if (!cp665Coverage.valid) errors.push(...cp665Coverage.errors);
  if (!cp645Descriptor.valid) errors.push(...cp645Descriptor.errors);
  if (!cp646Descriptor.valid) errors.push(...cp646Descriptor.errors);
  if (!cp647Descriptor.valid) errors.push(...cp647Descriptor.errors);
  if (!cp648Descriptor.valid) errors.push(...cp648Descriptor.errors);
  if (!cp649Descriptor.valid) errors.push(...cp649Descriptor.errors);
  if (!cp650Descriptor.valid) errors.push(...cp650Descriptor.errors);
  if (!cp651Descriptor.valid) errors.push(...cp651Descriptor.errors);
  if (!cp652Descriptor.valid) errors.push(...cp652Descriptor.errors);
  if (!cp653Descriptor.valid) errors.push(...cp653Descriptor.errors);
  if (!cp654Descriptor.valid) errors.push(...cp654Descriptor.errors);
  if (!cp655Descriptor.valid) errors.push(...cp655Descriptor.errors);
  if (!cp656Descriptor.valid) errors.push(...cp656Descriptor.errors);
  if (!cp657Descriptor.valid) errors.push(...cp657Descriptor.errors);
  if (!cp658Descriptor.valid) errors.push(...cp658Descriptor.errors);
  if (!cp659Descriptor.valid) errors.push(...cp659Descriptor.errors);
  if (!cp660Descriptor.valid) errors.push(...cp660Descriptor.errors);
  if (!cp661Descriptor.valid) errors.push(...cp661Descriptor.errors);
  if (!cp662Descriptor.valid) errors.push(...cp662Descriptor.errors);
  if (!cp663Descriptor.valid) errors.push(...cp663Descriptor.errors);
  if (!cp664Descriptor.valid) errors.push(...cp664Descriptor.errors);
  if (!cp665Descriptor.valid) errors.push(...cp665Descriptor.errors);
  if (contractProjection.schema_version !== "law-firm-os.admin-console.contract.v0.1") errors.push("Admin Console schema version drift");
  if (contractProjection.generated_from_pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) errors.push("Admin Console generated pack drift");
  if (contractProjection.program?.program_id !== ADMIN_CONSOLE_PROGRAM_CONTRACT.program_id) errors.push("Admin Console program projection drift");
  if (contractProjection.current_pack?.pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) errors.push("Admin Console current pack drift");
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-645");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-646");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-647");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-648");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-649");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-650");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-651");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-652");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-653");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-654");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-655");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-656");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-657");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-658");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-659");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-660");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-661");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-662");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-663");
  }
  if (!contractProjection.historical_pack_ids?.includes(ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id)) {
    errors.push("Admin Console historical pack ids missing CP00-664");
  }
  if (contractProjection.cp645_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console closeout handoff target drift");
  }
  if (contractProjection.cp645_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP645_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console closeout handoff subphase drift");
  }
  if (contractProjection.cp646_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-646 closeout handoff target drift");
  }
  if (contractProjection.cp646_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP646_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-646 closeout handoff subphase drift");
  }
  if (contractProjection.cp647_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-647 closeout handoff target drift");
  }
  if (contractProjection.cp647_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP647_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-647 closeout handoff subphase drift");
  }
  if (contractProjection.cp648_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-648 closeout handoff target drift");
  }
  if (contractProjection.cp648_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP648_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-648 closeout handoff subphase drift");
  }
  if (contractProjection.cp649_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-649 closeout handoff target drift");
  }
  if (contractProjection.cp649_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP649_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-649 closeout handoff subphase drift");
  }
  if (contractProjection.cp650_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-650 closeout handoff target drift");
  }
  if (contractProjection.cp650_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP650_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-650 closeout handoff subphase drift");
  }
  if (contractProjection.cp651_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-651 closeout handoff target drift");
  }
  if (contractProjection.cp651_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP651_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-651 closeout handoff subphase drift");
  }
  if (contractProjection.cp652_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-652 closeout handoff target drift");
  }
  if (contractProjection.cp652_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP652_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-652 closeout handoff subphase drift");
  }
  if (contractProjection.cp653_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-653 closeout handoff target drift");
  }
  if (contractProjection.cp653_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP653_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-653 closeout handoff subphase drift");
  }
  if (contractProjection.cp654_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-654 closeout handoff target drift");
  }
  if (contractProjection.cp654_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP654_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-654 closeout handoff subphase drift");
  }
  if (contractProjection.cp655_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-655 closeout handoff target drift");
  }
  if (contractProjection.cp655_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP655_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-655 closeout handoff subphase drift");
  }
  if (contractProjection.cp656_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-656 closeout handoff target drift");
  }
  if (contractProjection.cp656_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP656_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-656 closeout handoff subphase drift");
  }
  if (contractProjection.cp657_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-657 closeout handoff target drift");
  }
  if (contractProjection.cp657_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP657_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-657 closeout handoff subphase drift");
  }
  if (contractProjection.cp658_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-658 closeout handoff target drift");
  }
  if (contractProjection.cp658_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP658_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-658 closeout handoff subphase drift");
  }
  if (contractProjection.cp659_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-659 closeout handoff target drift");
  }
  if (contractProjection.cp659_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP659_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-659 closeout handoff subphase drift");
  }
  if (contractProjection.cp660_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-660 closeout handoff target drift");
  }
  if (contractProjection.cp660_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP660_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-660 closeout handoff subphase drift");
  }
  if (contractProjection.cp661_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-661 closeout handoff target drift");
  }
  if (contractProjection.cp661_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP661_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-661 closeout handoff subphase drift");
  }
  if (contractProjection.cp662_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-662 closeout handoff target drift");
  }
  if (contractProjection.cp662_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP662_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-662 closeout handoff subphase drift");
  }
  if (contractProjection.cp663_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-663 closeout handoff target drift");
  }
  if (contractProjection.cp663_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP663_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-663 closeout handoff subphase drift");
  }
  if (contractProjection.cp664_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-664 closeout handoff target drift");
  }
  if (contractProjection.cp664_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP664_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-664 closeout handoff subphase drift");
  }
  if (contractProjection.cp665_closeout_handoff?.to_pack_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.next_pack_id) {
    errors.push("Admin Console CP00-665 closeout handoff target drift");
  }
  if (contractProjection.cp665_closeout_handoff?.next_subphase_id !== ADMIN_CONSOLE_CP665_PACK_BINDING.next_subphase_id) {
    errors.push("Admin Console CP00-665 closeout handoff subphase drift");
  }
  if (contractProjection.runtime_opened !== false) errors.push("Admin Console runtime must remain closed");
  return freezeCp661Validation({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    cp645_coverage: cp645Coverage,
    cp646_coverage: cp646Coverage,
    cp647_coverage: cp647Coverage,
    cp648_coverage: cp648Coverage,
    cp649_coverage: cp649Coverage,
    cp650_coverage: cp650Coverage,
    cp651_coverage: cp651Coverage,
    cp652_coverage: cp652Coverage,
    cp653_coverage: cp653Coverage,
    cp654_coverage: cp654Coverage,
    cp655_coverage: cp655Coverage,
    cp656_coverage: cp656Coverage,
    cp657_coverage: cp657Coverage,
    cp658_coverage: cp658Coverage,
    cp659_coverage: cp659Coverage,
    cp660_coverage: cp660Coverage,
    cp661_coverage: cp661Coverage,
    cp662_coverage: cp662Coverage,
    cp663_coverage: cp663Coverage,
    cp664_coverage: cp664Coverage,
    cp665_coverage: cp665Coverage,
    cp645_descriptor: cp645Descriptor,
    cp646_descriptor: cp646Descriptor,
    cp647_descriptor: cp647Descriptor,
    cp648_descriptor: cp648Descriptor,
    cp649_descriptor: cp649Descriptor,
    cp650_descriptor: cp650Descriptor,
    cp651_descriptor: cp651Descriptor,
    cp652_descriptor: cp652Descriptor,
    cp653_descriptor: cp653Descriptor,
    cp654_descriptor: cp654Descriptor,
    cp655_descriptor: cp655Descriptor,
    cp656_descriptor: cp656Descriptor,
    cp657_descriptor: cp657Descriptor,
    cp658_descriptor: cp658Descriptor,
    cp659_descriptor: cp659Descriptor,
    cp660_descriptor: cp660Descriptor,
    cp661_descriptor: cp661Descriptor,
    cp662_descriptor: cp662Descriptor,
    cp663_descriptor: cp663Descriptor,
    cp664_descriptor: cp664Descriptor,
    cp665_descriptor: cp665Descriptor,
  });
}
