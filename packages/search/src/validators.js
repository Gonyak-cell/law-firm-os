import {
  SEARCH_CORE_CP235_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP235_PACK_BINDING,
  SEARCH_CORE_CP235_REQUIREMENTS,
  SEARCH_CORE_CP236_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP236_PACK_BINDING,
  SEARCH_CORE_CP236_REQUIREMENTS,
  SEARCH_CORE_CP237_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP237_PACK_BINDING,
  SEARCH_CORE_CP237_REQUIREMENTS,
  SEARCH_CORE_CP238_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP238_PACK_BINDING,
  SEARCH_CORE_CP238_REQUIREMENTS,
  SEARCH_CORE_CP239_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP239_PACK_BINDING,
  SEARCH_CORE_CP239_REQUIREMENTS,
  SEARCH_CORE_CP240_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP240_PACK_BINDING,
  SEARCH_CORE_CP240_REQUIREMENTS,
  SEARCH_CORE_CP241_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP241_PACK_BINDING,
  SEARCH_CORE_CP241_REQUIREMENTS,
  SEARCH_CORE_CP242_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP242_PACK_BINDING,
  SEARCH_CORE_CP242_REQUIREMENTS,
  SEARCH_CORE_CP243_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP243_PACK_BINDING,
  SEARCH_CORE_CP243_REQUIREMENTS,
  SEARCH_CORE_CP244_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP244_PACK_BINDING,
  SEARCH_CORE_CP244_REQUIREMENTS,
  SEARCH_CORE_CP245_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP245_PACK_BINDING,
  SEARCH_CORE_CP245_REQUIREMENTS,
  SEARCH_CORE_CP246_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP246_PACK_BINDING,
  SEARCH_CORE_CP246_REQUIREMENTS,
  SEARCH_CORE_CP247_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP247_PACK_BINDING,
  SEARCH_CORE_CP247_REQUIREMENTS,
  SEARCH_CORE_CP248_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP248_PACK_BINDING,
  SEARCH_CORE_CP248_REQUIREMENTS,
  SEARCH_CORE_CP249_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP249_PACK_BINDING,
  SEARCH_CORE_CP249_REQUIREMENTS,
  SEARCH_CORE_CP250_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP250_PACK_BINDING,
  SEARCH_CORE_CP250_REQUIREMENTS,
  SEARCH_CORE_CP251_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP251_PACK_BINDING,
  SEARCH_CORE_CP251_REQUIREMENTS,
  SEARCH_CORE_CP252_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP252_PACK_BINDING,
  SEARCH_CORE_CP252_REQUIREMENTS,
  SEARCH_CORE_CP253_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP253_PACK_BINDING,
  SEARCH_CORE_CP253_REQUIREMENTS,
  SEARCH_CORE_CP254_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP254_PACK_BINDING,
  SEARCH_CORE_CP254_REQUIREMENTS,
  SEARCH_CORE_CP255_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP255_PACK_BINDING,
  SEARCH_CORE_CP255_REQUIREMENTS,
  SEARCH_CORE_CP256_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP256_PACK_BINDING,
  SEARCH_CORE_CP256_REQUIREMENTS,
  SEARCH_CORE_CP257_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP257_PACK_BINDING,
  SEARCH_CORE_CP257_REQUIREMENTS,
  SEARCH_CORE_CP258_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP258_PACK_BINDING,
  SEARCH_CORE_CP258_REQUIREMENTS,
  SEARCH_CORE_CP259_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP259_PACK_BINDING,
  SEARCH_CORE_CP259_REQUIREMENTS,
  SEARCH_CORE_CP260_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP260_PACK_BINDING,
  SEARCH_CORE_CP260_REQUIREMENTS,
  SEARCH_CORE_CP261_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP261_PACK_BINDING,
  SEARCH_CORE_CP261_REQUIREMENTS,
  SEARCH_CORE_CP262_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP262_PACK_BINDING,
  SEARCH_CORE_CP262_REQUIREMENTS,
  SEARCH_CORE_CP263_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP263_PACK_BINDING,
  SEARCH_CORE_CP263_REQUIREMENTS,
  SEARCH_CORE_CP264_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP264_PACK_BINDING,
  SEARCH_CORE_CP264_REQUIREMENTS,
  SEARCH_CORE_CP265_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP265_PACK_BINDING,
  SEARCH_CORE_CP265_REQUIREMENTS,
  SEARCH_CORE_CP266_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP266_PACK_BINDING,
  SEARCH_CORE_CP266_REQUIREMENTS,
  SEARCH_CORE_CP267_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP267_PACK_BINDING,
  SEARCH_CORE_CP267_REQUIREMENTS,
  SEARCH_CORE_CP268_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP268_PACK_BINDING,
  SEARCH_CORE_CP268_REQUIREMENTS,
  SEARCH_CORE_CP269_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP269_PACK_BINDING,
  SEARCH_CORE_CP269_REQUIREMENTS,
  SEARCH_CORE_CP270_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP270_PACK_BINDING,
  SEARCH_CORE_CP270_REQUIREMENTS,
  SEARCH_CORE_CP271_NO_WRITE_ATTESTATION,
  SEARCH_CORE_CP271_PACK_BINDING,
  SEARCH_CORE_CP271_REQUIREMENTS,
  SEARCH_CORE_PROGRAM_CONTRACT,
} from "./registry.js";
import {
  createSearchCoreCp235ScopeContractFoundationCaseSet,
  createSearchCoreCp235ScopeContractFoundationDescriptor,
  createSearchCoreCp236ModelStorageSliceCaseSet,
  createSearchCoreCp236ModelStorageSliceDescriptor,
  createSearchCoreCp237ModelBindingSliceCaseSet,
  createSearchCoreCp237ModelBindingSliceDescriptor,
  createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet,
  createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor,
  createSearchCoreCp239ServiceSliceCaseSet,
  createSearchCoreCp239ServiceSliceDescriptor,
  createSearchCoreCp240ServiceWorkflowTailCaseSet,
  createSearchCoreCp240ServiceWorkflowTailDescriptor,
  createSearchCoreCp241ServiceAuditBindingCaseSet,
  createSearchCoreCp241ServiceAuditBindingDescriptor,
  createSearchCoreCp242ServiceBindingMidCaseSet,
  createSearchCoreCp242ServiceBindingMidDescriptor,
  createSearchCoreCp243ServiceFixtureHeadCaseSet,
  createSearchCoreCp243ServiceFixtureHeadDescriptor,
  createSearchCoreCp244ServiceFixtureMidCaseSet,
  createSearchCoreCp244ServiceFixtureMidDescriptor,
  createSearchCoreCp245ServiceGoldenHeadCaseSet,
  createSearchCoreCp245ServiceGoldenHeadDescriptor,
  createSearchCoreCp246GoldenHermesSliceCaseSet,
  createSearchCoreCp246GoldenHermesSliceDescriptor,
  createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet,
  createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor,
  createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet,
  createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor,
  createSearchCoreCp249UiSliceMidCaseSet,
  createSearchCoreCp249UiSliceMidDescriptor,
  createSearchCoreCp250UiWorkflowSliceCaseSet,
  createSearchCoreCp250UiWorkflowSliceDescriptor,
  createSearchCoreCp251UiBindingTailCaseSet,
  createSearchCoreCp251UiBindingTailDescriptor,
  createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet,
  createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor,
  createSearchCoreCp253FixtureSliceCaseSet,
  createSearchCoreCp253FixtureSliceDescriptor,
  createSearchCoreCp254FixtureBindingSliceCaseSet,
  createSearchCoreCp254FixtureBindingSliceDescriptor,
  createSearchCoreCp255FixtureSetMidCaseSet,
  createSearchCoreCp255FixtureSetMidDescriptor,
  createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet,
  createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor,
  createSearchCoreCp257PermissionSliceHeadCaseSet,
  createSearchCoreCp257PermissionSliceHeadDescriptor,
  createSearchCoreCp258PermissionWorkflowSliceCaseSet,
  createSearchCoreCp258PermissionWorkflowSliceDescriptor,
  createSearchCoreCp259PermissionBindingSliceCaseSet,
  createSearchCoreCp259PermissionBindingSliceDescriptor,
  createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet,
  createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor,
  createSearchCoreCp261FailureSliceCaseSet,
  createSearchCoreCp261FailureSliceDescriptor,
  createSearchCoreCp262FailureBindingSliceCaseSet,
  createSearchCoreCp262FailureBindingSliceDescriptor,
  createSearchCoreCp263FailureBindingTailCaseSet,
  createSearchCoreCp263FailureBindingTailDescriptor,
  createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet,
  createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor,
  createSearchCoreCp265HermesSliceCaseSet,
  createSearchCoreCp265HermesSliceDescriptor,
  createSearchCoreCp266HermesBindingSliceCaseSet,
  createSearchCoreCp266HermesBindingSliceDescriptor,
  createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet,
  createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor,
  createSearchCoreCp268ReviewSliceCaseSet,
  createSearchCoreCp268ReviewSliceDescriptor,
  createSearchCoreCp269ReviewBindingMidCaseSet,
  createSearchCoreCp269ReviewBindingMidDescriptor,
  createSearchCoreCp270ReviewBindingTailCaseSet,
  createSearchCoreCp270ReviewBindingTailDescriptor,
  createSearchCoreCp271P09CloseoutCaseSet,
  createSearchCoreCp271P09CloseoutDescriptor,
  searchCoreRowKey,
} from "./service.js";

function countBy(units, field) {
  const counts = {};
  for (const unit of units) {
    const key = unit?.[field];
    if (key === undefined || key === null) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function freezeCp235Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP235_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP235_NO_WRITE_ATTESTATION,
  });
}

function freezeCp236Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP236_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP236_NO_WRITE_ATTESTATION,
  });
}

function freezeCp237Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP237_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP237_NO_WRITE_ATTESTATION,
  });
}

function freezeCp238Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP238_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP238_NO_WRITE_ATTESTATION,
  });
}

function freezeCp239Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP239_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP239_NO_WRITE_ATTESTATION,
  });
}

function freezeCp240Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP240_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP240_NO_WRITE_ATTESTATION,
  });
}

function freezeCp241Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP241_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP241_NO_WRITE_ATTESTATION,
  });
}

function freezeCp242Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP242_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP242_NO_WRITE_ATTESTATION,
  });
}

function freezeCp243Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP243_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP243_NO_WRITE_ATTESTATION,
  });
}

function freezeCp244Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP244_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP244_NO_WRITE_ATTESTATION,
  });
}

function freezeCp245Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP245_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP245_NO_WRITE_ATTESTATION,
  });
}

function freezeCp246Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP246_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP246_NO_WRITE_ATTESTATION,
  });
}

function freezeCp247Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP247_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP247_NO_WRITE_ATTESTATION,
  });
}

function freezeCp248Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP248_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP248_NO_WRITE_ATTESTATION,
  });
}

function freezeCp249Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP249_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP249_NO_WRITE_ATTESTATION,
  });
}

function freezeCp250Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP250_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP250_NO_WRITE_ATTESTATION,
  });
}

function freezeCp251Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP251_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP251_NO_WRITE_ATTESTATION,
  });
}

function freezeCp252Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP252_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP252_NO_WRITE_ATTESTATION,
  });
}

function freezeCp253Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP253_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP253_NO_WRITE_ATTESTATION,
  });
}

function freezeCp254Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP254_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP254_NO_WRITE_ATTESTATION,
  });
}

function freezeCp255Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP255_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP255_NO_WRITE_ATTESTATION,
  });
}

function freezeCp256Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP256_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP256_NO_WRITE_ATTESTATION,
  });
}

function freezeCp257Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP257_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP257_NO_WRITE_ATTESTATION,
  });
}

function freezeCp258Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP258_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP258_NO_WRITE_ATTESTATION,
  });
}

function freezeCp259Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP259_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP259_NO_WRITE_ATTESTATION,
  });
}

function freezeCp260Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP260_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP260_NO_WRITE_ATTESTATION,
  });
}

function freezeCp261Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP261_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP261_NO_WRITE_ATTESTATION,
  });
}

function freezeCp262Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP262_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP262_NO_WRITE_ATTESTATION,
  });
}

function freezeCp263Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP263_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP263_NO_WRITE_ATTESTATION,
  });
}

function freezeCp264Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP264_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP264_NO_WRITE_ATTESTATION,
  });
}

function freezeCp265Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP265_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP265_NO_WRITE_ATTESTATION,
  });
}

function freezeCp266Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP266_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP266_NO_WRITE_ATTESTATION,
  });
}

function freezeCp267Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP267_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP267_NO_WRITE_ATTESTATION,
  });
}

function freezeCp268Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP268_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP268_NO_WRITE_ATTESTATION,
  });
}

function freezeCp269Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP269_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP269_NO_WRITE_ATTESTATION,
  });
}

function freezeCp270Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP270_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP270_NO_WRITE_ATTESTATION,
  });
}

function freezeCp271Validation(result) {
  return Object.freeze({
    ...result,
    pack_id: SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    no_write_attestation: SEARCH_CORE_CP271_NO_WRITE_ATTESTATION,
  });
}

export function createSearchCoreCp235CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp235Validation({
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

export function validateSearchCoreCp235Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-235 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP235_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-235");
  if (planPack?.risk_class !== SEARCH_CORE_CP235_PACK_BINDING.risk_class) errors.push("CP00-235 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP235_PACK_BINDING.unit_count) errors.push("CP00-235 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP235_PACK_BINDING.first_unit_id) errors.push("CP00-235 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP235_PACK_BINDING.last_unit_id) errors.push("CP00-235 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-235 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-235 must only include RP07 units");
  const summary = createSearchCoreCp235CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-235 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-235 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-235 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-235 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-235 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-235 ${microId} missing row ${title}`);
    }
  }
  return freezeCp235Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp235ScopeContractFoundationDescriptor(
  descriptor = createSearchCoreCp235ScopeContractFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.scope_contract_foundation_case_set ?? createSearchCoreCp235ScopeContractFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp235ScopeContractFoundationDescriptor") errors.push("CP00-235 descriptor type drift");
  if (descriptor.program_contract?.program_id !== "RP07") errors.push("CP00-235 program drift");
  if (descriptor.program_contract?.upstream_program_id !== "RP06") errors.push("CP00-235 upstream program drift");
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows).length) errors.push("CP00-235 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP235_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-235 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-235 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-235 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-235 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-235 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-235 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-235 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const scopeSection of ["RP07.P00.M00", "RP07.P00.M01", "RP07.P00.M10"]) {
    const rows = sections[scopeSection]?.rows ?? {};
    if (rows.non_goal_boundary?.search_runtime_opened !== false) errors.push(`CP00-235 ${scopeSection} must not open search runtime`);
    if (rows.non_goal_boundary?.ocr_runtime_opened !== false) errors.push(`CP00-235 ${scopeSection} must not open OCR runtime`);
    if (rows.non_goal_boundary?.index_runtime_opened !== false) errors.push(`CP00-235 ${scopeSection} must not open index runtime`);
    if (rows.acceptance_gate_definition?.hermes_gate !== "H07") errors.push(`CP00-235 ${scopeSection} Hermes gate drift`);
    if (rows.acceptance_gate_definition?.claude_gate !== "C07") errors.push(`CP00-235 ${scopeSection} Claude gate drift`);
  }
  const m03 = sections["RP07.P00.M03"]?.rows ?? {};
  if (m03.permission_baseline_note?.deny_over_allow_enforced !== true) errors.push("CP00-235 deny-over-allow drift");
  if (m03.permission_baseline_note?.cross_tenant_access_allowed !== false) errors.push("CP00-235 must not allow cross-tenant access");
  if (m03.audit_baseline_note?.audit_event_body_included !== false) errors.push("CP00-235 must not expose audit bodies");
  if (m03.synthetic_data_policy?.real_client_data_loaded !== false) errors.push("CP00-235 must not load real data");
  if (m03.blocked_claim_rule?.blocked_claim_detail_included !== false) errors.push("CP00-235 must not expose blocked-claim detail");
  if (m03.claude_review_prompts?.claude_final_approval_claimed !== false) errors.push("CP00-235 must not claim Claude final approval");
  if (m03.human_approval_note?.human_approval_route_required_before_runtime !== true) errors.push("CP00-235 human approval boundary missing");
  if (m03.command_matrix?.executes_command_runtime !== false) errors.push("CP00-235 must not execute command runtime");
  const p01m00 = sections["RP07.P01.M00"]?.rows ?? {};
  if (p01m00.tenant_scope_field?.cross_tenant_access_allowed !== false) errors.push("CP00-235 tenant scope drift");
  if (p01m00.matter_trace_reference?.matter_trace_required !== true) errors.push("CP00-235 matter trace drift");
  if (p01m00.state_transition_map?.writes_state_transition !== false) errors.push("CP00-235 must not write state transitions");
  if (SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_search_runtime !== false) errors.push("CP00-235 must not dispatch search runtime");
  if (SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_ocr_runtime !== false) errors.push("CP00-235 must not dispatch OCR runtime");
  if (SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.dispatches_index_runtime !== false) errors.push("CP00-235 must not dispatch index runtime");
  if (SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-235 must not promote Claude");
  if (SEARCH_CORE_CP235_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-235 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-235 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-235 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP235_PACK_BINDING.pack_id,
      SEARCH_CORE_CP236_PACK_BINDING.pack_id,
      SEARCH_CORE_CP237_PACK_BINDING.pack_id,
      SEARCH_CORE_CP238_PACK_BINDING.pack_id,
      SEARCH_CORE_CP239_PACK_BINDING.pack_id,
      SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-235 contract current_pack drift");
  }
  if (
    contractProjection?.scope_contract_foundation_descriptor?.descriptor &&
    contractProjection.scope_contract_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-235 contract scope_contract_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP235_PACK_BINDING.next_pack_id) errors.push("CP00-235 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP235_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-235 next subphase drift");
  }
  return freezeCp235Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp235HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp235ScopeContractFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp235Coverage(planPack);
  const foundation = validateSearchCoreCp235ScopeContractFoundationDescriptor(descriptor, contractProjection);
  return freezeCp235Validation({
    evidence_packet: "H07.CP00-235.search_core_scope_contract_foundation_descriptor",
    gate: SEARCH_CORE_CP235_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    no_real_data: true,
    source_dms_core_pack_id: SEARCH_CORE_CP235_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP235_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP235_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP235_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp235ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp235Coverage(planPack);
  const foundation = validateSearchCoreCp235ScopeContractFoundationDescriptor(createSearchCoreCp235ScopeContractFoundationDescriptor(), {});
  return freezeCp235Validation({
    review_packet: "C07.CP00-235.search_core_scope_contract_foundation_descriptor",
    gate: SEARCH_CORE_CP235_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP235_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    scope_contract_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP235_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-235 cover exactly the 150 planned RP07 units from RP07.P00.M00.S01 through RP07.P01.M02.S08?",
      "Do the fourteen descriptor sections (eleven RP07.P00 scope-and-contract micros and three RP07.P01 model/storage foundation micros) cover every planned row title as descriptor-only rows, including scope inventories, acceptance gates, non-goal boundaries, target file maps, baseline notes, synthetic data policies, risk registers, blocked-claim rules, Hermes preflight fields, Claude review prompts, human approval notes, dependency lists, command matrices, receipt shapes, package layout, entity identifiers, tenant scope, matter traces, lifecycle enums, and field registries?",
      "Does CP00-235 avoid search/OCR/index/embedding runtime dispatch, permission runtime evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit bodies, blocked-claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp235CloseoutHandoff() {
  return freezeCp235Validation({
    handoff_id: "CP00-235-to-CP00-236",
    from_pack_id: SEARCH_CORE_CP235_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP235_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP235_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP235_PACK_BINDING.range,
    open_scope: "Continue RP07.P01.M02.S09 onward with the remaining model/storage foundation rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP235_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp236CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp236Validation({
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

export function validateSearchCoreCp236Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-236 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP236_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-236");
  if (planPack?.risk_class !== SEARCH_CORE_CP236_PACK_BINDING.risk_class) errors.push("CP00-236 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP236_PACK_BINDING.unit_count) errors.push("CP00-236 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP236_PACK_BINDING.first_unit_id) errors.push("CP00-236 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP236_PACK_BINDING.last_unit_id) errors.push("CP00-236 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-236 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-236 must only include RP07 units");
  const summary = createSearchCoreCp236CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-236 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-236 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-236 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-236 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-236 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-236 ${microId} missing row ${title}`);
    }
  }
  return freezeCp236Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp236ModelStorageSliceDescriptor(
  descriptor = createSearchCoreCp236ModelStorageSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.model_storage_slice_case_set ?? createSearchCoreCp236ModelStorageSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp236ModelStorageSliceDescriptor") errors.push("CP00-236 descriptor type drift");
  if (descriptor.source_scope_contract_foundation_descriptor !== "SearchCoreCp235ScopeContractFoundationDescriptor") {
    errors.push("CP00-236 source scope contract foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP236_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-236 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-236 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-236 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-236 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-236 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-236 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-236 ${microId} ${key} must not include raw payload`);
    }
  }
  const m03 = sections["RP07.P01.M03"]?.rows ?? {};
  if (m03.validation_helper?.validation_error_detail_included !== false) errors.push("CP00-236 must not expose validation error detail");
  if (m03.fixture_model?.real_client_data_loaded !== false) errors.push("CP00-236 must not load real data");
  if (m03.model_unit_test?.executes_unit_test_runtime_paths !== false) errors.push("CP00-236 must not execute unit test runtime paths");
  if (m03.invalid_reference_test?.expected_outcome !== "rejected_customer_safe") errors.push("CP00-236 invalid reference outcome drift");
  if (m03.ownership_drift_test?.ownership_drift_detected !== false) errors.push("CP00-236 ownership drift detected");
  if (m03.hermes_model_summary?.emits_hermes_runtime_receipt !== false) errors.push("CP00-236 must not emit Hermes runtime receipts");
  if (m03.claude_model_review_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-236 must not claim Claude final approval");
  if (m03.documentation_entry?.documentation_entry !== "packages/search/README.md#cp00-236") errors.push("CP00-236 documentation anchor drift");
  if (m03.index_export_check?.index_export_check !== true) errors.push("CP00-236 index export check drift");
  const m04 = sections["RP07.P01.M04"]?.rows ?? {};
  if (m04.tenant_scope_field?.cross_tenant_access_allowed !== false) errors.push("CP00-236 must not allow cross-tenant access");
  if (m04.matter_trace_reference?.matter_trace_required !== true) errors.push("CP00-236 matter trace drift");
  if (SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.ownership_drift_detected !== false) errors.push("CP00-236 ownership drift attestation drift");
  if (SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-236 must not promote Claude");
  if (SEARCH_CORE_CP236_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-236 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-236 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-236 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP236_PACK_BINDING.pack_id,
      SEARCH_CORE_CP237_PACK_BINDING.pack_id,
      SEARCH_CORE_CP238_PACK_BINDING.pack_id,
      SEARCH_CORE_CP239_PACK_BINDING.pack_id,
      SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-236 contract current_pack drift");
  }
  if (
    contractProjection?.model_storage_slice_descriptor?.descriptor &&
    contractProjection.model_storage_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-236 contract model_storage_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP236_PACK_BINDING.next_pack_id) errors.push("CP00-236 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP236_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-236 next subphase drift");
  }
  return freezeCp236Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp236HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp236ModelStorageSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp236Coverage(planPack);
  const slice = validateSearchCoreCp236ModelStorageSliceDescriptor(descriptor, contractProjection);
  return freezeCp236Validation({
    evidence_packet: "H07.CP00-236.search_core_model_storage_slice_descriptor",
    gate: SEARCH_CORE_CP236_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    model_storage_slice_valid: slice.valid,
    no_real_data: true,
    source_scope_contract_foundation_pack_id: SEARCH_CORE_CP236_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP236_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP236_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP236_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp236ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp236Coverage(planPack);
  const slice = validateSearchCoreCp236ModelStorageSliceDescriptor(createSearchCoreCp236ModelStorageSliceDescriptor(), {});
  return freezeCp236Validation({
    review_packet: "C07.CP00-236.search_core_model_storage_slice_descriptor",
    gate: SEARCH_CORE_CP236_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP236_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    model_storage_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP236_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-236 cover exactly the 40 planned RP07 units from RP07.P01.M02.S09 through RP07.P01.M04.S06?",
      "Do the three descriptor sections (M02 type/shape tail with validation helper through closeout handoff rows, M03 primary slice with documentation entry and index export check, M04 secondary workflow head) cover every planned row title as descriptor-only rows?",
      "Does CP00-236 avoid search/OCR/index/embedding runtime dispatch, unit-test runtime paths, ownership drift, permission runtime evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, validation error details, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp236CloseoutHandoff() {
  return freezeCp236Validation({
    handoff_id: "CP00-236-to-CP00-237",
    from_pack_id: SEARCH_CORE_CP236_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP236_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP236_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP236_PACK_BINDING.range,
    open_scope: "Continue RP07.P01.M04.S07 onward with the remaining model/storage rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP236_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp237CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp237Validation({
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

export function validateSearchCoreCp237Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-237 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP237_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-237");
  if (planPack?.risk_class !== SEARCH_CORE_CP237_PACK_BINDING.risk_class) errors.push("CP00-237 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP237_PACK_BINDING.unit_count) errors.push("CP00-237 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP237_PACK_BINDING.first_unit_id) errors.push("CP00-237 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP237_PACK_BINDING.last_unit_id) errors.push("CP00-237 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-237 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-237 must only include RP07 units");
  const summary = createSearchCoreCp237CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-237 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-237 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-237 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-237 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-237 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-237 ${microId} missing row ${title}`);
    }
  }
  return freezeCp237Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp237ModelBindingSliceDescriptor(
  descriptor = createSearchCoreCp237ModelBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.model_binding_slice_case_set ?? createSearchCoreCp237ModelBindingSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp237ModelBindingSliceDescriptor") errors.push("CP00-237 descriptor type drift");
  if (descriptor.source_model_storage_slice_descriptor !== "SearchCoreCp236ModelStorageSliceDescriptor") {
    errors.push("CP00-237 source model storage slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP237_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-237 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-237 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-237 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-237 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-237 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-237 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-237 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P01.M05"]?.rows ?? {};
  if (m05.tenant_scope_field?.cross_tenant_access_allowed !== false) errors.push("CP00-237 must not allow cross-tenant access");
  if (m05.matter_trace_reference?.matter_trace_required !== true) errors.push("CP00-237 matter trace drift");
  if (m05.ownership_drift_test?.ownership_drift_detected !== false) errors.push("CP00-237 ownership drift detected");
  if (m05.hermes_model_summary?.emits_hermes_runtime_receipt !== false) errors.push("CP00-237 must not emit Hermes runtime receipts");
  if (m05.claude_model_review_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-237 must not claim Claude final approval");
  if (m05.documentation_entry?.documentation_entry !== "packages/search/README.md#cp00-237") errors.push("CP00-237 documentation anchor drift");
  const m04 = sections["RP07.P01.M04"]?.rows ?? {};
  if (m04.state_transition_map?.writes_state_transition !== false) errors.push("CP00-237 must not write state transitions");
  if (m04.invalid_reference_test?.expected_outcome !== "rejected_customer_safe") errors.push("CP00-237 invalid reference outcome drift");
  if (SEARCH_CORE_CP237_NO_WRITE_ATTESTATION.ownership_drift_detected !== false) errors.push("CP00-237 ownership drift attestation drift");
  if (SEARCH_CORE_CP237_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-237 must not promote Claude");
  if (SEARCH_CORE_CP237_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-237 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-237 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-237 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP237_PACK_BINDING.pack_id,
      SEARCH_CORE_CP238_PACK_BINDING.pack_id,
      SEARCH_CORE_CP239_PACK_BINDING.pack_id,
      SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-237 contract current_pack drift");
  }
  if (
    contractProjection?.model_binding_slice_descriptor?.descriptor &&
    contractProjection.model_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-237 contract model_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP237_PACK_BINDING.next_pack_id) errors.push("CP00-237 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP237_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-237 next subphase drift");
  }
  return freezeCp237Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp237HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp237ModelBindingSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp237Coverage(planPack);
  const slice = validateSearchCoreCp237ModelBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp237Validation({
    evidence_packet: "H07.CP00-237.search_core_model_binding_slice_descriptor",
    gate: SEARCH_CORE_CP237_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    model_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_model_storage_slice_pack_id: SEARCH_CORE_CP237_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP237_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP237_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP237_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp237ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp237Coverage(planPack);
  const slice = validateSearchCoreCp237ModelBindingSliceDescriptor(createSearchCoreCp237ModelBindingSliceDescriptor(), {});
  return freezeCp237Validation({
    review_packet: "C07.CP00-237.search_core_model_binding_slice_descriptor",
    gate: SEARCH_CORE_CP237_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP237_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    model_binding_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP237_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-237 cover exactly the 40 planned RP07 units from RP07.P01.M04.S07 through RP07.P01.M06.S04?",
      "Do the three descriptor sections (M04 secondary workflow tail, M05 permission/audit binding cycle, M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-237 avoid search/OCR/index/embedding runtime dispatch, unit-test runtime paths, ownership drift, permission runtime evaluation, audit event writes, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, validation error details, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp237CloseoutHandoff() {
  return freezeCp237Validation({
    handoff_id: "CP00-237-to-CP00-238",
    from_pack_id: SEARCH_CORE_CP237_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP237_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP237_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP237_PACK_BINDING.range,
    open_scope: "Continue RP07.P01.M06.S05 onward with the remaining model fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP237_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp238CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp238Validation({
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

export function validateSearchCoreCp238Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-238 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP238_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-238");
  if (planPack?.risk_class !== SEARCH_CORE_CP238_PACK_BINDING.risk_class) errors.push("CP00-238 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP238_PACK_BINDING.unit_count) errors.push("CP00-238 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP238_PACK_BINDING.first_unit_id) errors.push("CP00-238 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP238_PACK_BINDING.last_unit_id) errors.push("CP00-238 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-238 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-238 must only include RP07 units");
  const summary = createSearchCoreCp238CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-238 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-238 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-238 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-238 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-238 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-238 ${microId} missing row ${title}`);
    }
  }
  return freezeCp238Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(
  descriptor = createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p01_closeout_p02_service_foundation_case_set ?? createSearchCoreCp238P01CloseoutP02ServiceFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor") errors.push("CP00-238 descriptor type drift");
  if (descriptor.source_model_binding_slice_descriptor !== "SearchCoreCp237ModelBindingSliceDescriptor") {
    errors.push("CP00-238 source model binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows).length) errors.push("CP00-238 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP238_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-238 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-238 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-238 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-238 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-238 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-238 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-238 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const svcSection of ["RP07.P02.M00", "RP07.P02.M01", "RP07.P02.M02"]) {
    const rows = sections[svcSection]?.rows ?? {};
    if (rows.service_entrypoint_contract?.dispatches_search_runtime !== false) errors.push(`CP00-238 ${svcSection} must not dispatch search runtime`);
    if (rows.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push(`CP00-238 ${svcSection} must not allow cross-tenant access`);
    if (rows.permission_precheck?.deny_over_allow_enforced !== true) errors.push(`CP00-238 ${svcSection} deny-over-allow drift`);
    if (rows.state_transition_enforcement?.writes_state_transition !== false) errors.push(`CP00-238 ${svcSection} must not write state transitions`);
    if (rows.idempotency_key_handling?.persists_idempotency_key !== false) errors.push(`CP00-238 ${svcSection} must not persist idempotency keys`);
    if (rows.lock_acquisition_rule?.acquires_runtime_lock !== false) errors.push(`CP00-238 ${svcSection} must not acquire locks`);
    if (rows.rollback_behavior?.performs_rollback_runtime !== false) errors.push(`CP00-238 ${svcSection} must not perform rollback runtime`);
    if (rows.retry_behavior?.performs_retry_runtime !== false) errors.push(`CP00-238 ${svcSection} must not perform retry runtime`);
    if (rows.review_required_routing?.dispatches_review_route_runtime !== false) errors.push(`CP00-238 ${svcSection} must not dispatch review routes`);
    if (rows.approval_required_routing?.dispatches_approval_route_runtime !== false) errors.push(`CP00-238 ${svcSection} must not dispatch approval routes`);
    if (rows.blocked_claim_output?.blocked_claim_detail_included !== false) errors.push(`CP00-238 ${svcSection} must not expose blocked-claim detail`);
  }
  const m02 = sections["RP07.P02.M02"]?.rows ?? {};
  if (m02.unit_test_review_path?.expected_outcome !== "review_required") errors.push("CP00-238 review path outcome drift");
  if (m02.integration_smoke_case?.dispatches_integration_smoke_runtime !== false) errors.push("CP00-238 must not dispatch integration smoke runtime");
  if (SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.performs_rollback_runtime !== false) errors.push("CP00-238 rollback attestation drift");
  if (SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-238 lock attestation drift");
  if (SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-238 must not promote Claude");
  if (SEARCH_CORE_CP238_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-238 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-238 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-238 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP238_PACK_BINDING.pack_id,
      SEARCH_CORE_CP239_PACK_BINDING.pack_id,
      SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-238 contract current_pack drift");
  }
  if (
    contractProjection?.p01_closeout_p02_service_foundation_descriptor?.descriptor &&
    contractProjection.p01_closeout_p02_service_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-238 contract p01_closeout_p02_service_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP238_PACK_BINDING.next_pack_id) errors.push("CP00-238 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP238_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-238 next subphase drift");
  }
  return freezeCp238Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp238HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp238Coverage(planPack);
  const foundation = validateSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(descriptor, contractProjection);
  return freezeCp238Validation({
    evidence_packet: "H07.CP00-238.search_core_p01_closeout_p02_service_foundation_descriptor",
    gate: SEARCH_CORE_CP238_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    no_real_data: true,
    source_model_binding_slice_pack_id: SEARCH_CORE_CP238_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP238_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP238_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP238_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp238ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp238Coverage(planPack);
  const foundation = validateSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(createSearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor(), {});
  return freezeCp238Validation({
    review_packet: "C07.CP00-238.search_core_p01_closeout_p02_service_foundation_descriptor",
    gate: SEARCH_CORE_CP238_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP238_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p01_closeout_p02_service_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP238_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-238 cover exactly the 150 planned RP07 units from RP07.P01.M06.S05 through RP07.P02.M02.S22?",
      "Do the eight descriptor sections (five RP07.P01 model micros and three RP07.P02 service-foundation micros) cover every planned row title as descriptor-only rows, including service entrypoint contracts, prechecks, happy/denied/review paths, state transition enforcement, idempotency, lock rules, persistence boundaries, validation error mapping, review/approval routing, blocked-claim outputs, rollback/retry behavior, and integration smoke cases?",
      "Does CP00-238 avoid search/OCR/index/embedding runtime dispatch, review/approval route runtime, rollback/retry runtime, lock acquisition, idempotency persistence, state writes, unit-test runtime paths, integration smoke runtime, permission runtime evaluation, audit event writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, lock tokens, blocked-claim details, validation error details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp238CloseoutHandoff() {
  return freezeCp238Validation({
    handoff_id: "CP00-238-to-CP00-239",
    from_pack_id: SEARCH_CORE_CP238_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP238_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP238_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP238_PACK_BINDING.range,
    open_scope: "RP07.P01 descriptor scope is closed; continue RP07.P02.M03.S01 onward with the remaining service rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP238_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp239CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp239Validation({
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

export function validateSearchCoreCp239Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-239 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP239_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-239");
  if (planPack?.risk_class !== SEARCH_CORE_CP239_PACK_BINDING.risk_class) errors.push("CP00-239 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP239_PACK_BINDING.unit_count) errors.push("CP00-239 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP239_PACK_BINDING.first_unit_id) errors.push("CP00-239 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP239_PACK_BINDING.last_unit_id) errors.push("CP00-239 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-239 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-239 must only include RP07 units");
  const summary = createSearchCoreCp239CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-239 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-239 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-239 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-239 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-239 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-239 ${microId} missing row ${title}`);
    }
  }
  return freezeCp239Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp239ServiceSliceDescriptor(
  descriptor = createSearchCoreCp239ServiceSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_slice_case_set ?? createSearchCoreCp239ServiceSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp239ServiceSliceDescriptor") errors.push("CP00-239 descriptor type drift");
  if (descriptor.source_p01_closeout_p02_service_foundation_descriptor !== "SearchCoreCp238P01CloseoutP02ServiceFoundationDescriptor") {
    errors.push("CP00-239 source p01 closeout p02 service foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP239_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-239 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-239 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-239 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-239 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-239 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-239 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-239 ${microId} ${key} must not include raw payload`);
    }
  }
  const m03 = sections["RP07.P02.M03"]?.rows ?? {};
  if (m03.golden_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-239 must not load real data");
  if (m03.hermes_service_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-239 must not emit Hermes runtime receipts");
  if (m03.claude_service_review_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-239 must not claim Claude final approval");
  if (m03.lock_acquisition_rule?.acquires_runtime_lock !== false) errors.push("CP00-239 must not acquire locks");
  if (m03.rollback_behavior?.performs_rollback_runtime !== false) errors.push("CP00-239 must not perform rollback runtime");
  const m04 = sections["RP07.P02.M04"]?.rows ?? {};
  if (m04.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push("CP00-239 must not allow cross-tenant access");
  if (m04.permission_precheck?.deny_over_allow_enforced !== true) errors.push("CP00-239 deny-over-allow drift");
  if (m04.review_required_routing?.dispatches_review_route_runtime !== false) errors.push("CP00-239 must not dispatch review routes");
  if (SEARCH_CORE_CP239_NO_WRITE_ATTESTATION.performs_rollback_runtime !== false) errors.push("CP00-239 rollback attestation drift");
  if (SEARCH_CORE_CP239_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-239 must not promote Claude");
  if (SEARCH_CORE_CP239_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-239 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-239 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-239 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP239_PACK_BINDING.pack_id,
      SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-239 contract current_pack drift");
  }
  if (
    contractProjection?.service_slice_descriptor?.descriptor &&
    contractProjection.service_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-239 contract service_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP239_PACK_BINDING.next_pack_id) errors.push("CP00-239 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP239_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-239 next subphase drift");
  }
  return freezeCp239Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp239HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp239ServiceSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp239Coverage(planPack);
  const slice = validateSearchCoreCp239ServiceSliceDescriptor(descriptor, contractProjection);
  return freezeCp239Validation({
    evidence_packet: "H07.CP00-239.search_core_service_slice_descriptor",
    gate: SEARCH_CORE_CP239_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    no_real_data: true,
    source_p01_closeout_p02_service_foundation_pack_id: SEARCH_CORE_CP239_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP239_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP239_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP239_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp239ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp239Coverage(planPack);
  const slice = validateSearchCoreCp239ServiceSliceDescriptor(createSearchCoreCp239ServiceSliceDescriptor(), {});
  return freezeCp239Validation({
    review_packet: "C07.CP00-239.search_core_service_slice_descriptor",
    gate: SEARCH_CORE_CP239_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP239_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP239_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-239 cover exactly the 40 planned RP07 units from RP07.P02.M03.S01 through RP07.P02.M04.S15?",
      "Do the two descriptor sections (M03 primary slice with golden fixture binding, Hermes service evidence, and Claude service review prompt; M04 secondary workflow head) cover every planned row title as descriptor-only rows?",
      "Does CP00-239 avoid search/OCR/index/embedding runtime dispatch, review/approval route runtime, rollback/retry runtime, lock acquisition, idempotency persistence, state writes, unit-test runtime paths, integration smoke runtime, permission runtime evaluation, audit event writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp239CloseoutHandoff() {
  return freezeCp239Validation({
    handoff_id: "CP00-239-to-CP00-240",
    from_pack_id: SEARCH_CORE_CP239_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP239_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP239_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP239_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M04.S16 onward with the remaining service rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP239_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp240CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp240Validation({
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

export function validateSearchCoreCp240Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-240 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP240_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-240");
  if (planPack?.risk_class !== SEARCH_CORE_CP240_PACK_BINDING.risk_class) errors.push("CP00-240 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP240_PACK_BINDING.unit_count) errors.push("CP00-240 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP240_PACK_BINDING.first_unit_id) errors.push("CP00-240 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP240_PACK_BINDING.last_unit_id) errors.push("CP00-240 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-240 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-240 must only include RP07 units");
  const summary = createSearchCoreCp240CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-240 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-240 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-240 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-240 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-240 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-240 ${microId} missing row ${title}`);
    }
  }
  return freezeCp240Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp240ServiceWorkflowTailDescriptor(
  descriptor = createSearchCoreCp240ServiceWorkflowTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_workflow_tail_case_set ?? createSearchCoreCp240ServiceWorkflowTailCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp240ServiceWorkflowTailDescriptor") errors.push("CP00-240 descriptor type drift");
  if (descriptor.source_service_slice_descriptor !== "SearchCoreCp239ServiceSliceDescriptor") {
    errors.push("CP00-240 source service slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP240_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-240 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-240 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-240 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-240 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-240 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-240 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-240 ${microId} ${key} must not include raw payload`);
    }
  }
  const m04 = sections["RP07.P02.M04"]?.rows ?? {};
  if (m04.blocked_claim_output?.blocked_claim_detail_included !== false) errors.push("CP00-240 must not expose blocked-claim detail");
  if (m04.rollback_behavior?.performs_rollback_runtime !== false) errors.push("CP00-240 must not perform rollback runtime");
  if (m04.retry_behavior?.performs_retry_runtime !== false) errors.push("CP00-240 must not perform retry runtime");
  if (m04.unit_test_denied_path?.expected_outcome !== "denied_customer_safe") errors.push("CP00-240 denied path outcome drift");
  if (m04.integration_smoke_case?.dispatches_integration_smoke_runtime !== false) errors.push("CP00-240 must not dispatch integration smoke runtime");
  if (m04.golden_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-240 must not load real data");
  if (m04.hermes_service_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-240 must not emit Hermes runtime receipts");
  if (m04.claude_service_review_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-240 must not claim Claude final approval");
  if (SEARCH_CORE_CP240_NO_WRITE_ATTESTATION.performs_rollback_runtime !== false) errors.push("CP00-240 rollback attestation drift");
  if (SEARCH_CORE_CP240_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-240 must not promote Claude");
  if (SEARCH_CORE_CP240_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-240 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-240 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-240 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP240_PACK_BINDING.pack_id,
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-240 contract current_pack drift");
  }
  if (
    contractProjection?.service_workflow_tail_descriptor?.descriptor &&
    contractProjection.service_workflow_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-240 contract service_workflow_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP240_PACK_BINDING.next_pack_id) errors.push("CP00-240 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP240_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-240 next subphase drift");
  }
  return freezeCp240Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp240HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp240ServiceWorkflowTailDescriptor(),
) {
  const coverage = validateSearchCoreCp240Coverage(planPack);
  const tail = validateSearchCoreCp240ServiceWorkflowTailDescriptor(descriptor, contractProjection);
  return freezeCp240Validation({
    evidence_packet: "H07.CP00-240.search_core_service_workflow_tail_descriptor",
    gate: SEARCH_CORE_CP240_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_workflow_tail_valid: tail.valid,
    no_real_data: true,
    source_service_slice_pack_id: SEARCH_CORE_CP240_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP240_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP240_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP240_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createSearchCoreCp240ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp240Coverage(planPack);
  const tail = validateSearchCoreCp240ServiceWorkflowTailDescriptor(createSearchCoreCp240ServiceWorkflowTailDescriptor(), {});
  return freezeCp240Validation({
    review_packet: "C07.CP00-240.search_core_service_workflow_tail_descriptor",
    gate: SEARCH_CORE_CP240_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP240_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_workflow_tail_valid: tail.valid,
    invalid_review_blockers: SEARCH_CORE_CP240_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-240 cover exactly the 10 planned RP07 units from RP07.P02.M04.S16 through RP07.P02.M04.S25?",
      "Does the M04 secondary workflow tail section cover every planned row title as descriptor-only rows, including blocked-claim output, rollback/retry behavior, happy/denied/review/integration test rows, golden fixture binding, Hermes service evidence, and Claude service review prompt?",
      "Does CP00-240 avoid search/OCR/index/embedding runtime dispatch, rollback/retry runtime, unit-test runtime paths, integration smoke runtime, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, blocked-claim details, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp240CloseoutHandoff() {
  return freezeCp240Validation({
    handoff_id: "CP00-240-to-CP00-241",
    from_pack_id: SEARCH_CORE_CP240_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP240_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP240_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP240_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M05.S01 onward with the remaining service binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP240_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp241CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp241Validation({
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

export function validateSearchCoreCp241Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-241 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP241_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-241");
  if (planPack?.risk_class !== SEARCH_CORE_CP241_PACK_BINDING.risk_class) errors.push("CP00-241 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP241_PACK_BINDING.unit_count) errors.push("CP00-241 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP241_PACK_BINDING.first_unit_id) errors.push("CP00-241 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP241_PACK_BINDING.last_unit_id) errors.push("CP00-241 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-241 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-241 must only include RP07 units");
  const summary = createSearchCoreCp241CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-241 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-241 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-241 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-241 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-241 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-241 ${microId} missing row ${title}`);
    }
  }
  return freezeCp241Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp241ServiceAuditBindingDescriptor(
  descriptor = createSearchCoreCp241ServiceAuditBindingDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_audit_binding_case_set ?? createSearchCoreCp241ServiceAuditBindingCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp241ServiceAuditBindingDescriptor") errors.push("CP00-241 descriptor type drift");
  if (descriptor.source_service_workflow_tail_descriptor !== "SearchCoreCp240ServiceWorkflowTailDescriptor") {
    errors.push("CP00-241 source service workflow tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP241_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-241 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-241 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-241 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-241 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-241 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-241 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-241 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P02.M05"]?.rows ?? {};
  if (m05.service_entrypoint_contract?.dispatches_search_runtime !== false) errors.push("CP00-241 must not dispatch search runtime");
  if (m05.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push("CP00-241 must not allow cross-tenant access");
  if (m05.matter_trace_precheck?.matter_trace_required !== true) errors.push("CP00-241 matter trace drift");
  if (m05.permission_precheck?.deny_over_allow_enforced !== true) errors.push("CP00-241 deny-over-allow drift");
  if (m05.audit_hint_precheck?.audit_event_body_included !== false) errors.push("CP00-241 must not expose audit bodies");
  if (m05.state_transition_enforcement?.writes_state_transition !== false) errors.push("CP00-241 must not write state transitions");
  if (m05.idempotency_key_handling?.persists_idempotency_key !== false) errors.push("CP00-241 must not persist idempotency keys");
  if (SEARCH_CORE_CP241_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-241 must not promote Claude");
  if (SEARCH_CORE_CP241_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-241 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-241 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-241 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP241_PACK_BINDING.pack_id,
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-241 contract current_pack drift");
  }
  if (
    contractProjection?.service_audit_binding_descriptor?.descriptor &&
    contractProjection.service_audit_binding_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-241 contract service_audit_binding_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP241_PACK_BINDING.next_pack_id) errors.push("CP00-241 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP241_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-241 next subphase drift");
  }
  return freezeCp241Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp241HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp241ServiceAuditBindingDescriptor(),
) {
  const coverage = validateSearchCoreCp241Coverage(planPack);
  const binding = validateSearchCoreCp241ServiceAuditBindingDescriptor(descriptor, contractProjection);
  return freezeCp241Validation({
    evidence_packet: "H07.CP00-241.search_core_service_audit_binding_descriptor",
    gate: SEARCH_CORE_CP241_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_audit_binding_valid: binding.valid,
    no_real_data: true,
    source_service_workflow_tail_pack_id: SEARCH_CORE_CP241_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP241_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP241_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP241_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && binding.valid,
  });
}

export function createSearchCoreCp241ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp241Coverage(planPack);
  const binding = validateSearchCoreCp241ServiceAuditBindingDescriptor(createSearchCoreCp241ServiceAuditBindingDescriptor(), {});
  return freezeCp241Validation({
    review_packet: "C07.CP00-241.search_core_service_audit_binding_descriptor",
    gate: SEARCH_CORE_CP241_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP241_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_audit_binding_valid: binding.valid,
    invalid_review_blockers: SEARCH_CORE_CP241_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-241 cover exactly the 10 planned RP07 units from RP07.P02.M05.S01 through RP07.P02.M05.S10?",
      "Does the M05 permission/audit binding section cover every planned row title as descriptor-only rows, including the service entrypoint contract, prechecks, happy/secondary paths, state transition enforcement, and idempotency key handling?",
      "Does CP00-241 avoid search/OCR/index/embedding runtime dispatch, permission runtime evaluation, audit event writes, state writes, idempotency persistence, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit hints/bodies, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp241CloseoutHandoff() {
  return freezeCp241Validation({
    handoff_id: "CP00-241-to-CP00-242",
    from_pack_id: SEARCH_CORE_CP241_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP241_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP241_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP241_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M05.S11 onward with the remaining service binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP241_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp242CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp242Validation({
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

export function validateSearchCoreCp242Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-242 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP242_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-242");
  if (planPack?.risk_class !== SEARCH_CORE_CP242_PACK_BINDING.risk_class) errors.push("CP00-242 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP242_PACK_BINDING.unit_count) errors.push("CP00-242 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP242_PACK_BINDING.first_unit_id) errors.push("CP00-242 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP242_PACK_BINDING.last_unit_id) errors.push("CP00-242 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-242 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-242 must only include RP07 units");
  const summary = createSearchCoreCp242CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-242 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-242 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-242 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-242 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-242 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-242 ${microId} missing row ${title}`);
    }
  }
  return freezeCp242Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp242ServiceBindingMidDescriptor(
  descriptor = createSearchCoreCp242ServiceBindingMidDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_binding_mid_case_set ?? createSearchCoreCp242ServiceBindingMidCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp242ServiceBindingMidDescriptor") errors.push("CP00-242 descriptor type drift");
  if (descriptor.source_service_audit_binding_descriptor !== "SearchCoreCp241ServiceAuditBindingDescriptor") {
    errors.push("CP00-242 source service audit binding descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP242_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-242 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-242 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-242 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-242 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-242 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-242 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-242 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P02.M05"]?.rows ?? {};
  if (m05.lock_acquisition_rule?.acquires_runtime_lock !== false) errors.push("CP00-242 must not acquire locks");
  if (m05.persistence_boundary?.creates_database_rows !== false) errors.push("CP00-242 must not create database rows");
  if (m05.validation_error_mapping?.validation_error_detail_included !== false) errors.push("CP00-242 must not expose validation error detail");
  if (m05.review_required_routing?.dispatches_review_route_runtime !== false) errors.push("CP00-242 must not dispatch review routes");
  if (m05.approval_required_routing?.dispatches_approval_route_runtime !== false) errors.push("CP00-242 must not dispatch approval routes");
  if (m05.blocked_claim_output?.blocked_claim_detail_included !== false) errors.push("CP00-242 must not expose blocked-claim detail");
  if (m05.rollback_behavior?.performs_rollback_runtime !== false) errors.push("CP00-242 must not perform rollback runtime");
  if (m05.retry_behavior?.performs_retry_runtime !== false) errors.push("CP00-242 must not perform retry runtime");
  if (m05.unit_test_denied_path?.expected_outcome !== "denied_customer_safe") errors.push("CP00-242 denied path outcome drift");
  if (SEARCH_CORE_CP242_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-242 must not promote Claude");
  if (SEARCH_CORE_CP242_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-242 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-242 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-242 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP242_PACK_BINDING.pack_id,
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-242 contract current_pack drift");
  }
  if (
    contractProjection?.service_binding_mid_descriptor?.descriptor &&
    contractProjection.service_binding_mid_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-242 contract service_binding_mid_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP242_PACK_BINDING.next_pack_id) errors.push("CP00-242 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP242_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-242 next subphase drift");
  }
  return freezeCp242Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp242HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp242ServiceBindingMidDescriptor(),
) {
  const coverage = validateSearchCoreCp242Coverage(planPack);
  const binding = validateSearchCoreCp242ServiceBindingMidDescriptor(descriptor, contractProjection);
  return freezeCp242Validation({
    evidence_packet: "H07.CP00-242.search_core_service_binding_mid_descriptor",
    gate: SEARCH_CORE_CP242_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_binding_mid_valid: binding.valid,
    no_real_data: true,
    source_service_audit_binding_pack_id: SEARCH_CORE_CP242_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP242_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP242_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP242_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && binding.valid,
  });
}

export function createSearchCoreCp242ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp242Coverage(planPack);
  const binding = validateSearchCoreCp242ServiceBindingMidDescriptor(createSearchCoreCp242ServiceBindingMidDescriptor(), {});
  return freezeCp242Validation({
    review_packet: "C07.CP00-242.search_core_service_binding_mid_descriptor",
    gate: SEARCH_CORE_CP242_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP242_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_binding_mid_valid: binding.valid,
    invalid_review_blockers: SEARCH_CORE_CP242_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-242 cover exactly the 10 planned RP07 units from RP07.P02.M05.S11 through RP07.P02.M05.S20?",
      "Does the M05 permission/audit binding middle section cover every planned row title as descriptor-only rows, including lock acquisition rule, persistence boundary, validation error mapping, review/approval routing, blocked-claim output, rollback/retry behavior, and happy/denied unit tests?",
      "Does CP00-242 avoid search/OCR/index/embedding runtime dispatch, review/approval route runtime, rollback/retry runtime, lock acquisition, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, lock tokens, blocked-claim details, validation error details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp242CloseoutHandoff() {
  return freezeCp242Validation({
    handoff_id: "CP00-242-to-CP00-243",
    from_pack_id: SEARCH_CORE_CP242_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP242_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP242_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP242_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M05.S21 onward with the remaining service binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP242_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp243CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp243Validation({
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

export function validateSearchCoreCp243Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-243 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP243_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-243");
  if (planPack?.risk_class !== SEARCH_CORE_CP243_PACK_BINDING.risk_class) errors.push("CP00-243 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP243_PACK_BINDING.unit_count) errors.push("CP00-243 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP243_PACK_BINDING.first_unit_id) errors.push("CP00-243 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP243_PACK_BINDING.last_unit_id) errors.push("CP00-243 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-243 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-243 must only include RP07 units");
  const summary = createSearchCoreCp243CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-243 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-243 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-243 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-243 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-243 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-243 ${microId} missing row ${title}`);
    }
  }
  return freezeCp243Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp243ServiceFixtureHeadDescriptor(
  descriptor = createSearchCoreCp243ServiceFixtureHeadDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_fixture_head_case_set ?? createSearchCoreCp243ServiceFixtureHeadCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp243ServiceFixtureHeadDescriptor") errors.push("CP00-243 descriptor type drift");
  if (descriptor.source_service_binding_mid_descriptor !== "SearchCoreCp242ServiceBindingMidDescriptor") {
    errors.push("CP00-243 source service binding mid descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP243_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-243 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-243 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-243 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-243 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-243 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-243 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-243 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P02.M05"]?.rows ?? {};
  if (m05.unit_test_review_path?.expected_outcome !== "review_required") errors.push("CP00-243 review path outcome drift");
  if (m05.integration_smoke_case?.dispatches_integration_smoke_runtime !== false) errors.push("CP00-243 must not dispatch integration smoke runtime");
  if (m05.golden_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-243 must not load real data");
  if (m05.hermes_service_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-243 must not emit Hermes runtime receipts");
  if (m05.claude_service_review_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-243 must not claim Claude final approval");
  const m06 = sections["RP07.P02.M06"]?.rows ?? {};
  if (m06.service_entrypoint_contract?.dispatches_search_runtime !== false) errors.push("CP00-243 must not dispatch search runtime");
  if (m06.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push("CP00-243 must not allow cross-tenant access");
  if (m06.matter_trace_precheck?.matter_trace_required !== true) errors.push("CP00-243 matter trace drift");
  if (m06.permission_precheck?.deny_over_allow_enforced !== true) errors.push("CP00-243 deny-over-allow drift");
  if (SEARCH_CORE_CP243_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-243 must not promote Claude");
  if (SEARCH_CORE_CP243_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-243 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-243 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-243 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP243_PACK_BINDING.pack_id,
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-243 contract current_pack drift");
  }
  if (
    contractProjection?.service_fixture_head_descriptor?.descriptor &&
    contractProjection.service_fixture_head_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-243 contract service_fixture_head_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP243_PACK_BINDING.next_pack_id) errors.push("CP00-243 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP243_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-243 next subphase drift");
  }
  return freezeCp243Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp243HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp243ServiceFixtureHeadDescriptor(),
) {
  const coverage = validateSearchCoreCp243Coverage(planPack);
  const head = validateSearchCoreCp243ServiceFixtureHeadDescriptor(descriptor, contractProjection);
  return freezeCp243Validation({
    evidence_packet: "H07.CP00-243.search_core_service_fixture_head_descriptor",
    gate: SEARCH_CORE_CP243_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_fixture_head_valid: head.valid,
    no_real_data: true,
    source_service_binding_mid_pack_id: SEARCH_CORE_CP243_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP243_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP243_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP243_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && head.valid,
  });
}

export function createSearchCoreCp243ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp243Coverage(planPack);
  const head = validateSearchCoreCp243ServiceFixtureHeadDescriptor(createSearchCoreCp243ServiceFixtureHeadDescriptor(), {});
  return freezeCp243Validation({
    review_packet: "C07.CP00-243.search_core_service_fixture_head_descriptor",
    gate: SEARCH_CORE_CP243_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP243_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_fixture_head_valid: head.valid,
    invalid_review_blockers: SEARCH_CORE_CP243_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-243 cover exactly the 10 planned RP07 units from RP07.P02.M05.S21 through RP07.P02.M06.S05?",
      "Do the two descriptor sections (M05 permission/audit binding tail and M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-243 avoid search/OCR/index/embedding runtime dispatch, integration smoke runtime, unit-test runtime paths, permission runtime evaluation, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, fixture payloads, permission decisions, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp243CloseoutHandoff() {
  return freezeCp243Validation({
    handoff_id: "CP00-243-to-CP00-244",
    from_pack_id: SEARCH_CORE_CP243_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP243_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP243_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP243_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M06.S06 onward with the remaining service fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP243_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp244CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp244Validation({
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

export function validateSearchCoreCp244Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-244 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP244_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-244");
  if (planPack?.risk_class !== SEARCH_CORE_CP244_PACK_BINDING.risk_class) errors.push("CP00-244 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP244_PACK_BINDING.unit_count) errors.push("CP00-244 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP244_PACK_BINDING.first_unit_id) errors.push("CP00-244 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP244_PACK_BINDING.last_unit_id) errors.push("CP00-244 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-244 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-244 must only include RP07 units");
  const summary = createSearchCoreCp244CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-244 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-244 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-244 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-244 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-244 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-244 ${microId} missing row ${title}`);
    }
  }
  return freezeCp244Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp244ServiceFixtureMidDescriptor(
  descriptor = createSearchCoreCp244ServiceFixtureMidDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_fixture_mid_case_set ?? createSearchCoreCp244ServiceFixtureMidCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp244ServiceFixtureMidDescriptor") errors.push("CP00-244 descriptor type drift");
  if (descriptor.source_service_fixture_head_descriptor !== "SearchCoreCp243ServiceFixtureHeadDescriptor") {
    errors.push("CP00-244 source service fixture head descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP244_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-244 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-244 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-244 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-244 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-244 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-244 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-244 ${microId} ${key} must not include raw payload`);
    }
  }
  const m06 = sections["RP07.P02.M06"]?.rows ?? {};
  if (m06.audit_hint_precheck?.audit_event_body_included !== false) errors.push("CP00-244 must not expose audit bodies");
  if (m06.state_transition_enforcement?.writes_state_transition !== false) errors.push("CP00-244 must not write state transitions");
  if (m06.idempotency_key_handling?.persists_idempotency_key !== false) errors.push("CP00-244 must not persist idempotency keys");
  if (m06.lock_acquisition_rule?.acquires_runtime_lock !== false) errors.push("CP00-244 must not acquire locks");
  if (m06.persistence_boundary?.creates_database_rows !== false) errors.push("CP00-244 must not create database rows");
  if (m06.validation_error_mapping?.validation_error_detail_included !== false) errors.push("CP00-244 must not expose validation error detail");
  if (m06.review_required_routing?.dispatches_review_route_runtime !== false) errors.push("CP00-244 must not dispatch review routes");
  if (m06.approval_required_routing?.dispatches_approval_route_runtime !== false) errors.push("CP00-244 must not dispatch approval routes");
  if (SEARCH_CORE_CP244_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-244 must not promote Claude");
  if (SEARCH_CORE_CP244_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-244 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-244 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-244 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP244_PACK_BINDING.pack_id,
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-244 contract current_pack drift");
  }
  if (
    contractProjection?.service_fixture_mid_descriptor?.descriptor &&
    contractProjection.service_fixture_mid_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-244 contract service_fixture_mid_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP244_PACK_BINDING.next_pack_id) errors.push("CP00-244 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP244_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-244 next subphase drift");
  }
  return freezeCp244Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp244HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp244ServiceFixtureMidDescriptor(),
) {
  const coverage = validateSearchCoreCp244Coverage(planPack);
  const mid = validateSearchCoreCp244ServiceFixtureMidDescriptor(descriptor, contractProjection);
  return freezeCp244Validation({
    evidence_packet: "H07.CP00-244.search_core_service_fixture_mid_descriptor",
    gate: SEARCH_CORE_CP244_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_fixture_mid_valid: mid.valid,
    no_real_data: true,
    source_service_fixture_head_pack_id: SEARCH_CORE_CP244_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP244_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP244_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP244_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && mid.valid,
  });
}

export function createSearchCoreCp244ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp244Coverage(planPack);
  const mid = validateSearchCoreCp244ServiceFixtureMidDescriptor(createSearchCoreCp244ServiceFixtureMidDescriptor(), {});
  return freezeCp244Validation({
    review_packet: "C07.CP00-244.search_core_service_fixture_mid_descriptor",
    gate: SEARCH_CORE_CP244_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP244_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_fixture_mid_valid: mid.valid,
    invalid_review_blockers: SEARCH_CORE_CP244_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-244 cover exactly the 10 planned RP07 units from RP07.P02.M06.S06 through RP07.P02.M06.S15?",
      "Does the M06 synthetic fixture middle section cover every planned row title as descriptor-only rows, including audit hint precheck, primary/secondary paths, state transition enforcement, idempotency, lock rule, persistence boundary, validation error mapping, and review/approval routing?",
      "Does CP00-244 avoid search/OCR/index/embedding runtime dispatch, review/approval route runtime, lock acquisition, idempotency persistence, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, lock tokens, audit hints/bodies, validation error details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp244CloseoutHandoff() {
  return freezeCp244Validation({
    handoff_id: "CP00-244-to-CP00-245",
    from_pack_id: SEARCH_CORE_CP244_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP244_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP244_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP244_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M06.S16 onward with the remaining service fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP244_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp245CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp245Validation({
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

export function validateSearchCoreCp245Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-245 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP245_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-245");
  if (planPack?.risk_class !== SEARCH_CORE_CP245_PACK_BINDING.risk_class) errors.push("CP00-245 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP245_PACK_BINDING.unit_count) errors.push("CP00-245 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP245_PACK_BINDING.first_unit_id) errors.push("CP00-245 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP245_PACK_BINDING.last_unit_id) errors.push("CP00-245 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-245 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-245 must only include RP07 units");
  const summary = createSearchCoreCp245CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-245 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-245 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-245 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-245 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-245 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-245 ${microId} missing row ${title}`);
    }
  }
  return freezeCp245Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp245ServiceGoldenHeadDescriptor(
  descriptor = createSearchCoreCp245ServiceGoldenHeadDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.service_golden_head_case_set ?? createSearchCoreCp245ServiceGoldenHeadCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp245ServiceGoldenHeadDescriptor") errors.push("CP00-245 descriptor type drift");
  if (descriptor.source_service_fixture_mid_descriptor !== "SearchCoreCp244ServiceFixtureMidDescriptor") {
    errors.push("CP00-245 source service fixture mid descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP245_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-245 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-245 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-245 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-245 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-245 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-245 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-245 ${microId} ${key} must not include raw payload`);
    }
  }
  const m06 = sections["RP07.P02.M06"]?.rows ?? {};
  if (m06.blocked_claim_output?.blocked_claim_detail_included !== false) errors.push("CP00-245 must not expose blocked-claim detail");
  if (m06.rollback_behavior?.performs_rollback_runtime !== false) errors.push("CP00-245 must not perform rollback runtime");
  if (m06.retry_behavior?.performs_retry_runtime !== false) errors.push("CP00-245 must not perform retry runtime");
  if (m06.unit_test_review_path?.expected_outcome !== "review_required") errors.push("CP00-245 review path outcome drift");
  if (m06.integration_smoke_case?.dispatches_integration_smoke_runtime !== false) errors.push("CP00-245 must not dispatch integration smoke runtime");
  const m07 = sections["RP07.P02.M07"]?.rows ?? {};
  if (m07.service_entrypoint_contract?.dispatches_search_runtime !== false) errors.push("CP00-245 must not dispatch search runtime");
  if (m07.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push("CP00-245 must not allow cross-tenant access");
  if (SEARCH_CORE_CP245_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-245 must not promote Claude");
  if (SEARCH_CORE_CP245_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-245 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-245 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-245 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP245_PACK_BINDING.pack_id,
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-245 contract current_pack drift");
  }
  if (
    contractProjection?.service_golden_head_descriptor?.descriptor &&
    contractProjection.service_golden_head_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-245 contract service_golden_head_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP245_PACK_BINDING.next_pack_id) errors.push("CP00-245 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP245_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-245 next subphase drift");
  }
  return freezeCp245Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp245HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp245ServiceGoldenHeadDescriptor(),
) {
  const coverage = validateSearchCoreCp245Coverage(planPack);
  const head = validateSearchCoreCp245ServiceGoldenHeadDescriptor(descriptor, contractProjection);
  return freezeCp245Validation({
    evidence_packet: "H07.CP00-245.search_core_service_golden_head_descriptor",
    gate: SEARCH_CORE_CP245_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    service_golden_head_valid: head.valid,
    no_real_data: true,
    source_service_fixture_mid_pack_id: SEARCH_CORE_CP245_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP245_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP245_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP245_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && head.valid,
  });
}

export function createSearchCoreCp245ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp245Coverage(planPack);
  const head = validateSearchCoreCp245ServiceGoldenHeadDescriptor(createSearchCoreCp245ServiceGoldenHeadDescriptor(), {});
  return freezeCp245Validation({
    review_packet: "C07.CP00-245.search_core_service_golden_head_descriptor",
    gate: SEARCH_CORE_CP245_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP245_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    service_golden_head_valid: head.valid,
    invalid_review_blockers: SEARCH_CORE_CP245_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-245 cover exactly the 10 planned RP07 units from RP07.P02.M06.S16 through RP07.P02.M07.S03?",
      "Do the two descriptor sections (M06 synthetic fixture tail and M07 test/golden head) cover every planned row title as descriptor-only rows?",
      "Does CP00-245 avoid search/OCR/index/embedding runtime dispatch, rollback/retry runtime, unit-test runtime paths, integration smoke runtime, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, blocked-claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp245CloseoutHandoff() {
  return freezeCp245Validation({
    handoff_id: "CP00-245-to-CP00-246",
    from_pack_id: SEARCH_CORE_CP245_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP245_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP245_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP245_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M07.S04 onward with the remaining golden case rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP245_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp246CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp246Validation({
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

export function validateSearchCoreCp246Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-246 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP246_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-246");
  if (planPack?.risk_class !== SEARCH_CORE_CP246_PACK_BINDING.risk_class) errors.push("CP00-246 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP246_PACK_BINDING.unit_count) errors.push("CP00-246 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP246_PACK_BINDING.first_unit_id) errors.push("CP00-246 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP246_PACK_BINDING.last_unit_id) errors.push("CP00-246 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-246 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-246 must only include RP07 units");
  const summary = createSearchCoreCp246CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-246 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-246 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-246 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-246 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-246 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-246 ${microId} missing row ${title}`);
    }
  }
  return freezeCp246Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp246GoldenHermesSliceDescriptor(
  descriptor = createSearchCoreCp246GoldenHermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.golden_hermes_slice_case_set ?? createSearchCoreCp246GoldenHermesSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp246GoldenHermesSliceDescriptor") errors.push("CP00-246 descriptor type drift");
  if (descriptor.source_service_golden_head_descriptor !== "SearchCoreCp245ServiceGoldenHeadDescriptor") {
    errors.push("CP00-246 source service golden head descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP246_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-246 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-246 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-246 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-246 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-246 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-246 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-246 ${microId} ${key} must not include raw payload`);
    }
  }
  const m07 = sections["RP07.P02.M07"]?.rows ?? {};
  if (m07.permission_precheck?.deny_over_allow_enforced !== true) errors.push("CP00-246 deny-over-allow drift");
  if (m07.golden_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-246 must not load real data");
  if (m07.hermes_service_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-246 must not emit Hermes runtime receipts");
  if (m07.claude_service_review_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-246 must not claim Claude final approval");
  if (m07.rollback_behavior?.performs_rollback_runtime !== false) errors.push("CP00-246 must not perform rollback runtime");
  const m08 = sections["RP07.P02.M08"]?.rows ?? {};
  if (m08.service_entrypoint_contract?.dispatches_search_runtime !== false) errors.push("CP00-246 must not dispatch search runtime");
  if (m08.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push("CP00-246 must not allow cross-tenant access");
  if (m08.lock_acquisition_rule?.acquires_runtime_lock !== false) errors.push("CP00-246 must not acquire locks");
  if (m08.retry_behavior?.performs_retry_runtime !== false) errors.push("CP00-246 must not perform retry runtime");
  if (SEARCH_CORE_CP246_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-246 must not promote Claude");
  if (SEARCH_CORE_CP246_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-246 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-246 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-246 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP246_PACK_BINDING.pack_id,
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-246 contract current_pack drift");
  }
  if (
    contractProjection?.golden_hermes_slice_descriptor?.descriptor &&
    contractProjection.golden_hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-246 contract golden_hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP246_PACK_BINDING.next_pack_id) errors.push("CP00-246 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP246_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-246 next subphase drift");
  }
  return freezeCp246Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp246HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp246GoldenHermesSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp246Coverage(planPack);
  const slice = validateSearchCoreCp246GoldenHermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp246Validation({
    evidence_packet: "H07.CP00-246.search_core_golden_hermes_slice_descriptor",
    gate: SEARCH_CORE_CP246_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    golden_hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_service_golden_head_pack_id: SEARCH_CORE_CP246_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP246_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP246_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP246_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp246ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp246Coverage(planPack);
  const slice = validateSearchCoreCp246GoldenHermesSliceDescriptor(createSearchCoreCp246GoldenHermesSliceDescriptor(), {});
  return freezeCp246Validation({
    review_packet: "C07.CP00-246.search_core_golden_hermes_slice_descriptor",
    gate: SEARCH_CORE_CP246_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP246_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    golden_hermes_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP246_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-246 cover exactly the 40 planned RP07 units from RP07.P02.M07.S04 through RP07.P02.M08.S18?",
      "Do the two descriptor sections (M07 test/golden tail and M08 Hermes evidence head) cover every planned row title as descriptor-only rows?",
      "Does CP00-246 avoid search/OCR/index/embedding runtime dispatch, review/approval route runtime, rollback/retry runtime, lock acquisition, idempotency persistence, state writes, unit-test runtime paths, integration smoke runtime, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit hints/bodies, blocked-claim details, fixture payloads, lock tokens, validation error details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp246CloseoutHandoff() {
  return freezeCp246Validation({
    handoff_id: "CP00-246-to-CP00-247",
    from_pack_id: SEARCH_CORE_CP246_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP246_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP246_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP246_PACK_BINDING.range,
    open_scope: "Continue RP07.P02.M08.S19 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP246_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp247CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp247Validation({
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

export function validateSearchCoreCp247Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-247 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP247_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-247");
  if (planPack?.risk_class !== SEARCH_CORE_CP247_PACK_BINDING.risk_class) errors.push("CP00-247 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP247_PACK_BINDING.unit_count) errors.push("CP00-247 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP247_PACK_BINDING.first_unit_id) errors.push("CP00-247 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP247_PACK_BINDING.last_unit_id) errors.push("CP00-247 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-247 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-247 must only include RP07 units");
  const summary = createSearchCoreCp247CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-247 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-247 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-247 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-247 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-247 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-247 ${microId} missing row ${title}`);
    }
  }
  return freezeCp247Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(
  descriptor = createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p02_closeout_p03_interface_foundation_case_set ?? createSearchCoreCp247P02CloseoutP03InterfaceFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor") errors.push("CP00-247 descriptor type drift");
  if (descriptor.source_golden_hermes_slice_descriptor !== "SearchCoreCp246GoldenHermesSliceDescriptor") {
    errors.push("CP00-247 source golden hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows).length) errors.push("CP00-247 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP247_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-247 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-247 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-247 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-247 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-247 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-247 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-247 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const apiSection of ["RP07.P03.M00", "RP07.P03.M01", "RP07.P03.M02", "RP07.P03.M03", "RP07.P03.M04", "RP07.P03.M05"]) {
    const rows = sections[apiSection]?.rows ?? {};
    if (rows.permission_annotation?.deny_over_allow_enforced !== true) errors.push(`CP00-247 ${apiSection} deny-over-allow drift`);
    if (rows.audit_annotation?.audit_event_body_included !== false) errors.push(`CP00-247 ${apiSection} must not expose audit bodies`);
    if (rows.unauthorized_data_omission?.unauthorized_data_omitted !== true) errors.push(`CP00-247 ${apiSection} unauthorized data drift`);
    if (rows.api_fixture?.real_client_data_loaded !== false) errors.push(`CP00-247 ${apiSection} must not load real data`);
  }
  const m03 = sections["RP07.P03.M03"]?.rows ?? {};
  if (m03.schema_drift_check?.schema_drift_detected !== false) errors.push("CP00-247 schema drift detected");
  if (m03.backward_compatibility_check?.breaking_change_detected !== false) errors.push("CP00-247 breaking change detected");
  if (m03.hermes_api_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-247 must not emit Hermes runtime receipts");
  if (m03.claude_interface_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-247 must not claim Claude final approval");
  if (m03.command_rerun?.executes_command_runtime !== false) errors.push("CP00-247 must not execute command runtime");
  const m09 = sections["RP07.P02.M09"]?.rows ?? {};
  if (m09.tenant_boundary_precheck?.cross_tenant_access_allowed !== false) errors.push("CP00-247 must not allow cross-tenant access");
  if (m09.rollback_behavior?.performs_rollback_runtime !== false) errors.push("CP00-247 must not perform rollback runtime");
  if (SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.schema_drift_detected !== false) errors.push("CP00-247 schema drift attestation drift");
  if (SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.breaking_change_detected !== false) errors.push("CP00-247 breaking change attestation drift");
  if (SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-247 must not promote Claude");
  if (SEARCH_CORE_CP247_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-247 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-247 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-247 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP247_PACK_BINDING.pack_id,
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-247 contract current_pack drift");
  }
  if (
    contractProjection?.p02_closeout_p03_interface_foundation_descriptor?.descriptor &&
    contractProjection.p02_closeout_p03_interface_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-247 contract p02_closeout_p03_interface_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP247_PACK_BINDING.next_pack_id) errors.push("CP00-247 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP247_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-247 next subphase drift");
  }
  return freezeCp247Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp247HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp247Coverage(planPack);
  const foundation = validateSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(descriptor, contractProjection);
  return freezeCp247Validation({
    evidence_packet: "H07.CP00-247.search_core_p02_closeout_p03_interface_foundation_descriptor",
    gate: SEARCH_CORE_CP247_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_foundation_valid: foundation.valid,
    no_real_data: true,
    source_golden_hermes_slice_pack_id: SEARCH_CORE_CP247_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP247_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP247_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP247_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp247ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp247Coverage(planPack);
  const foundation = validateSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(createSearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor(), {});
  return freezeCp247Validation({
    review_packet: "C07.CP00-247.search_core_p02_closeout_p03_interface_foundation_descriptor",
    gate: SEARCH_CORE_CP247_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP247_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p02_closeout_p03_interface_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP247_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-247 cover exactly the 150 planned RP07 units from RP07.P02.M08.S19 through RP07.P03.M05.S22?",
      "Do the nine descriptor sections (three P02 closeout micros and six P03 interface micros) cover every planned row title as descriptor-only rows, including request/response contracts, error code taxonomies, permission/audit annotations, pagination contracts, serialization guards, unauthorized data omission, API fixtures, contract/invalid/denied tests, Hermes API evidence, Claude interface prompts, versioning notes, downstream consumer notes, schema drift checks, and backward compatibility checks?",
      "Does CP00-247 avoid search/OCR/index/embedding runtime dispatch, API handler execution, schema drift, breaking changes, review/approval route runtime, rollback/retry runtime, lock acquisition, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit bodies, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp247CloseoutHandoff() {
  return freezeCp247Validation({
    handoff_id: "CP00-247-to-CP00-248",
    from_pack_id: SEARCH_CORE_CP247_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP247_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP247_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP247_PACK_BINDING.range,
    open_scope: "RP07.P02 descriptor scope is closed; continue RP07.P03.M06.S01 onward with the remaining interface rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP247_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp248CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp248Validation({
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

export function validateSearchCoreCp248Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-248 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP248_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-248");
  if (planPack?.risk_class !== SEARCH_CORE_CP248_PACK_BINDING.risk_class) errors.push("CP00-248 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP248_PACK_BINDING.unit_count) errors.push("CP00-248 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP248_PACK_BINDING.first_unit_id) errors.push("CP00-248 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP248_PACK_BINDING.last_unit_id) errors.push("CP00-248 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-248 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-248 must only include RP07 units");
  const summary = createSearchCoreCp248CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-248 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-248 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-248 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-248 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-248 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-248 ${microId} missing row ${title}`);
    }
  }
  return freezeCp248Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(
  descriptor = createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p03_closeout_p04_ui_foundation_case_set ?? createSearchCoreCp248P03CloseoutP04UiFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp248P03CloseoutP04UiFoundationDescriptor") errors.push("CP00-248 descriptor type drift");
  if (descriptor.source_p02_closeout_p03_interface_foundation_descriptor !== "SearchCoreCp247P02CloseoutP03InterfaceFoundationDescriptor") {
    errors.push("CP00-248 source p02 closeout p03 interface foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows).length) errors.push("CP00-248 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP248_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-248 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-248 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-248 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-248 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-248 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-248 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-248 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const uiSection of ["RP07.P04.M00", "RP07.P04.M01", "RP07.P04.M02", "RP07.P04.M03"]) {
    const rows = sections[uiSection]?.rows ?? {};
    if (rows.denied_state?.expected_outcome !== "denied_customer_safe") errors.push(`CP00-248 ${uiSection} denied state drift`);
    if (rows.review_required_state?.expected_outcome !== "review_required") errors.push(`CP00-248 ${uiSection} review state drift`);
    if (rows.ui_surface_inventory?.executes_ui_runtime !== false) errors.push(`CP00-248 ${uiSection} must not execute UI runtime`);
  }
  const m01 = sections["RP07.P04.M01"]?.rows ?? {};
  if (m01.permission_badge?.permission_decision_detail_included !== false) errors.push("CP00-248 must not expose permission decisions");
  if (m01.audit_hint_display?.audit_hint_detail_included !== false) errors.push("CP00-248 must not expose audit hints");
  if (m01.error_message_copy?.validation_error_detail_included !== false) errors.push("CP00-248 must not expose validation error detail");
  if (m01.synthetic_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-248 must not load real data");
  if (m01.build_smoke?.executes_command_runtime !== false) errors.push("CP00-248 must not execute command runtime");
  if (m01.hermes_ui_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-248 must not emit Hermes runtime receipts");
  if (m01.claude_ui_leak_prompt?.leak_detected !== false) errors.push("CP00-248 UI leak detected");
  if (m01.claude_ui_leak_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-248 must not claim Claude final approval");
  if (SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.ui_leak_detected !== false) errors.push("CP00-248 UI leak attestation drift");
  if (SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-248 must not promote Claude");
  if (SEARCH_CORE_CP248_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-248 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-248 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-248 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP248_PACK_BINDING.pack_id,
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-248 contract current_pack drift");
  }
  if (
    contractProjection?.p03_closeout_p04_ui_foundation_descriptor?.descriptor &&
    contractProjection.p03_closeout_p04_ui_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-248 contract p03_closeout_p04_ui_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP248_PACK_BINDING.next_pack_id) errors.push("CP00-248 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP248_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-248 next subphase drift");
  }
  return freezeCp248Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp248HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp248Coverage(planPack);
  const foundation = validateSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(descriptor, contractProjection);
  return freezeCp248Validation({
    evidence_packet: "H07.CP00-248.search_core_p03_closeout_p04_ui_foundation_descriptor",
    gate: SEARCH_CORE_CP248_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p03_closeout_p04_ui_foundation_valid: foundation.valid,
    no_real_data: true,
    source_p02_closeout_p03_interface_foundation_pack_id: SEARCH_CORE_CP248_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP248_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP248_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP248_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp248ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp248Coverage(planPack);
  const foundation = validateSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(createSearchCoreCp248P03CloseoutP04UiFoundationDescriptor(), {});
  return freezeCp248Validation({
    review_packet: "C07.CP00-248.search_core_p03_closeout_p04_ui_foundation_descriptor",
    gate: SEARCH_CORE_CP248_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP248_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p03_closeout_p04_ui_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP248_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-248 cover exactly the 150 planned RP07 units from RP07.P03.M06.S01 through RP07.P04.M03.S08?",
      "Do the nine descriptor sections (five P03 interface micros and four P04 UI micros) cover every planned row title as descriptor-only rows, including UI surface inventories, data dependency maps, loading/empty/denied/review states, interactions, permission badges, audit hint displays, error message copy, responsive layouts, keyboard/focus behavior, fixture bindings, build smoke, Hermes UI evidence, and Claude UI leak prompts?",
      "Does CP00-248 avoid UI runtime execution, search/OCR/index/embedding runtime dispatch, API handler execution, UI leaks, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit hints/bodies, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp248CloseoutHandoff() {
  return freezeCp248Validation({
    handoff_id: "CP00-248-to-CP00-249",
    from_pack_id: SEARCH_CORE_CP248_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP248_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP248_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP248_PACK_BINDING.range,
    open_scope: "RP07.P03 descriptor scope is closed; continue RP07.P04.M03.S09 onward with the remaining UI rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP248_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp249CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp249Validation({
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

export function validateSearchCoreCp249Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-249 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP249_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-249");
  if (planPack?.risk_class !== SEARCH_CORE_CP249_PACK_BINDING.risk_class) errors.push("CP00-249 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP249_PACK_BINDING.unit_count) errors.push("CP00-249 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP249_PACK_BINDING.first_unit_id) errors.push("CP00-249 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP249_PACK_BINDING.last_unit_id) errors.push("CP00-249 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-249 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-249 must only include RP07 units");
  const summary = createSearchCoreCp249CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-249 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-249 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-249 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-249 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-249 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-249 ${microId} missing row ${title}`);
    }
  }
  return freezeCp249Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp249UiSliceMidDescriptor(
  descriptor = createSearchCoreCp249UiSliceMidDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_slice_mid_case_set ?? createSearchCoreCp249UiSliceMidCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp249UiSliceMidDescriptor") errors.push("CP00-249 descriptor type drift");
  if (descriptor.source_p03_closeout_p04_ui_foundation_descriptor !== "SearchCoreCp248P03CloseoutP04UiFoundationDescriptor") {
    errors.push("CP00-249 source p03 closeout p04 ui foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP249_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-249 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-249 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-249 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-249 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-249 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-249 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-249 ${microId} ${key} must not include raw payload`);
    }
  }
  const m03 = sections["RP07.P04.M03"]?.rows ?? {};
  if (m03.permission_badge?.permission_decision_detail_included !== false) errors.push("CP00-249 must not expose permission decisions");
  if (m03.audit_hint_display?.audit_hint_detail_included !== false) errors.push("CP00-249 must not expose audit hints");
  if (m03.error_message_copy?.validation_error_detail_included !== false) errors.push("CP00-249 must not expose validation error detail");
  if (m03.synthetic_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-249 must not load real data");
  if (m03.build_smoke?.executes_command_runtime !== false) errors.push("CP00-249 must not execute command runtime");
  if (m03.hermes_ui_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-249 must not emit Hermes runtime receipts");
  if (SEARCH_CORE_CP249_NO_WRITE_ATTESTATION.ui_leak_detected !== false) errors.push("CP00-249 UI leak attestation drift");
  if (SEARCH_CORE_CP249_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-249 must not promote Claude");
  if (SEARCH_CORE_CP249_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-249 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-249 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-249 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP249_PACK_BINDING.pack_id,
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-249 contract current_pack drift");
  }
  if (
    contractProjection?.ui_slice_mid_descriptor?.descriptor &&
    contractProjection.ui_slice_mid_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-249 contract ui_slice_mid_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP249_PACK_BINDING.next_pack_id) errors.push("CP00-249 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP249_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-249 next subphase drift");
  }
  return freezeCp249Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp249HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp249UiSliceMidDescriptor(),
) {
  const coverage = validateSearchCoreCp249Coverage(planPack);
  const mid = validateSearchCoreCp249UiSliceMidDescriptor(descriptor, contractProjection);
  return freezeCp249Validation({
    evidence_packet: "H07.CP00-249.search_core_ui_slice_mid_descriptor",
    gate: SEARCH_CORE_CP249_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_slice_mid_valid: mid.valid,
    no_real_data: true,
    source_p03_closeout_p04_ui_foundation_pack_id: SEARCH_CORE_CP249_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP249_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP249_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP249_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && mid.valid,
  });
}

export function createSearchCoreCp249ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp249Coverage(planPack);
  const mid = validateSearchCoreCp249UiSliceMidDescriptor(createSearchCoreCp249UiSliceMidDescriptor(), {});
  return freezeCp249Validation({
    review_packet: "C07.CP00-249.search_core_ui_slice_mid_descriptor",
    gate: SEARCH_CORE_CP249_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP249_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_slice_mid_valid: mid.valid,
    invalid_review_blockers: SEARCH_CORE_CP249_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-249 cover exactly the 10 planned RP07 units from RP07.P04.M03.S09 through RP07.P04.M03.S18?",
      "Does the M03 primary implementation slice middle section cover every planned row title as descriptor-only rows, including permission badge, audit hint display, error message copy, responsive layouts, keyboard/focus behavior, visual density check, synthetic fixture binding, build smoke, and Hermes UI evidence?",
      "Does CP00-249 avoid UI runtime execution, search/OCR/index/embedding runtime dispatch, UI leaks, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit hints, validation error details, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp249CloseoutHandoff() {
  return freezeCp249Validation({
    handoff_id: "CP00-249-to-CP00-250",
    from_pack_id: SEARCH_CORE_CP249_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP249_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP249_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP249_PACK_BINDING.range,
    open_scope: "Continue RP07.P04.M03.S19 onward with the remaining UI rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP249_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp250CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp250Validation({
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

export function validateSearchCoreCp250Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-250 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP250_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-250");
  if (planPack?.risk_class !== SEARCH_CORE_CP250_PACK_BINDING.risk_class) errors.push("CP00-250 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP250_PACK_BINDING.unit_count) errors.push("CP00-250 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP250_PACK_BINDING.first_unit_id) errors.push("CP00-250 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP250_PACK_BINDING.last_unit_id) errors.push("CP00-250 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-250 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-250 must only include RP07 units");
  const summary = createSearchCoreCp250CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-250 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-250 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-250 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-250 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-250 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-250 ${microId} missing row ${title}`);
    }
  }
  return freezeCp250Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp250UiWorkflowSliceDescriptor(
  descriptor = createSearchCoreCp250UiWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_workflow_slice_case_set ?? createSearchCoreCp250UiWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp250UiWorkflowSliceDescriptor") errors.push("CP00-250 descriptor type drift");
  if (descriptor.source_ui_slice_mid_descriptor !== "SearchCoreCp249UiSliceMidDescriptor") {
    errors.push("CP00-250 source ui slice mid descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP250_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-250 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-250 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-250 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-250 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-250 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-250 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-250 ${microId} ${key} must not include raw payload`);
    }
  }
  const m04 = sections["RP07.P04.M04"]?.rows ?? {};
  if (m04.state_snapshot?.writes_state_transition !== false) errors.push("CP00-250 must not write state transitions");
  if (m04.no_unauthorized_count_leak?.unauthorized_count_leak_detected !== false) errors.push("CP00-250 unauthorized count leak detected");
  if (m04.claude_ui_leak_prompt?.leak_detected !== false) errors.push("CP00-250 UI leak detected");
  if (m04.permission_badge?.permission_decision_detail_included !== false) errors.push("CP00-250 must not expose permission decisions");
  if (m04.hermes_ui_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-250 must not emit Hermes runtime receipts");
  const m05 = sections["RP07.P04.M05"]?.rows ?? {};
  if (m05.denied_state?.expected_outcome !== "denied_customer_safe") errors.push("CP00-250 denied state drift");
  if (m05.audit_hint_display?.audit_hint_detail_included !== false) errors.push("CP00-250 must not expose audit hints");
  if (SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.unauthorized_count_leak_detected !== false) errors.push("CP00-250 count leak attestation drift");
  if (SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-250 must not promote Claude");
  if (SEARCH_CORE_CP250_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-250 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-250 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-250 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP250_PACK_BINDING.pack_id,
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-250 contract current_pack drift");
  }
  if (
    contractProjection?.ui_workflow_slice_descriptor?.descriptor &&
    contractProjection.ui_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-250 contract ui_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP250_PACK_BINDING.next_pack_id) errors.push("CP00-250 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP250_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-250 next subphase drift");
  }
  return freezeCp250Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp250HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp250UiWorkflowSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp250Coverage(planPack);
  const slice = validateSearchCoreCp250UiWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp250Validation({
    evidence_packet: "H07.CP00-250.search_core_ui_workflow_slice_descriptor",
    gate: SEARCH_CORE_CP250_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_ui_slice_mid_pack_id: SEARCH_CORE_CP250_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP250_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP250_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP250_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp250ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp250Coverage(planPack);
  const slice = validateSearchCoreCp250UiWorkflowSliceDescriptor(createSearchCoreCp250UiWorkflowSliceDescriptor(), {});
  return freezeCp250Validation({
    review_packet: "C07.CP00-250.search_core_ui_workflow_slice_descriptor",
    gate: SEARCH_CORE_CP250_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP250_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP250_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-250 cover exactly the 40 planned RP07 units from RP07.P04.M03.S19 through RP07.P04.M05.S14?",
      "Do the three descriptor sections (M03 primary slice tail with state snapshot and no-unauthorized-count-leak rows, M04 secondary workflow cycle, M05 permission/audit binding head) cover every planned row title as descriptor-only rows?",
      "Does CP00-250 avoid UI runtime execution, search/OCR/index/embedding runtime dispatch, UI leaks, unauthorized count leaks, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decisions, audit hints, validation error details, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp250CloseoutHandoff() {
  return freezeCp250Validation({
    handoff_id: "CP00-250-to-CP00-251",
    from_pack_id: SEARCH_CORE_CP250_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP250_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP250_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP250_PACK_BINDING.range,
    open_scope: "Continue RP07.P04.M05.S15 onward with the remaining UI binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP250_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp251CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp251Validation({
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

export function validateSearchCoreCp251Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-251 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP251_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-251");
  if (planPack?.risk_class !== SEARCH_CORE_CP251_PACK_BINDING.risk_class) errors.push("CP00-251 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP251_PACK_BINDING.unit_count) errors.push("CP00-251 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP251_PACK_BINDING.first_unit_id) errors.push("CP00-251 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP251_PACK_BINDING.last_unit_id) errors.push("CP00-251 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-251 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-251 must only include RP07 units");
  const summary = createSearchCoreCp251CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-251 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-251 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-251 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-251 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-251 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-251 ${microId} missing row ${title}`);
    }
  }
  return freezeCp251Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp251UiBindingTailDescriptor(
  descriptor = createSearchCoreCp251UiBindingTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.ui_binding_tail_case_set ?? createSearchCoreCp251UiBindingTailCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp251UiBindingTailDescriptor") errors.push("CP00-251 descriptor type drift");
  if (descriptor.source_ui_workflow_slice_descriptor !== "SearchCoreCp250UiWorkflowSliceDescriptor") {
    errors.push("CP00-251 source ui workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP251_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-251 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-251 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-251 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-251 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-251 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-251 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-251 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P04.M05"]?.rows ?? {};
  if (m05.synthetic_fixture_binding?.real_client_data_loaded !== false) errors.push("CP00-251 must not load real data");
  if (m05.build_smoke?.executes_command_runtime !== false) errors.push("CP00-251 must not execute command runtime");
  if (m05.hermes_ui_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-251 must not emit Hermes runtime receipts");
  if (m05.claude_ui_leak_prompt?.leak_detected !== false) errors.push("CP00-251 UI leak detected");
  if (m05.state_snapshot?.writes_state_transition !== false) errors.push("CP00-251 must not write state transitions");
  if (m05.no_unauthorized_count_leak?.unauthorized_count_leak_detected !== false) errors.push("CP00-251 unauthorized count leak detected");
  const m06 = sections["RP07.P04.M06"]?.rows ?? {};
  if (m06.ui_surface_inventory?.executes_ui_runtime !== false) errors.push("CP00-251 must not execute UI runtime");
  if (SEARCH_CORE_CP251_NO_WRITE_ATTESTATION.unauthorized_count_leak_detected !== false) errors.push("CP00-251 count leak attestation drift");
  if (SEARCH_CORE_CP251_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-251 must not promote Claude");
  if (SEARCH_CORE_CP251_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-251 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-251 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-251 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP251_PACK_BINDING.pack_id,
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-251 contract current_pack drift");
  }
  if (
    contractProjection?.ui_binding_tail_descriptor?.descriptor &&
    contractProjection.ui_binding_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-251 contract ui_binding_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP251_PACK_BINDING.next_pack_id) errors.push("CP00-251 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP251_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-251 next subphase drift");
  }
  return freezeCp251Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp251HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp251UiBindingTailDescriptor(),
) {
  const coverage = validateSearchCoreCp251Coverage(planPack);
  const tail = validateSearchCoreCp251UiBindingTailDescriptor(descriptor, contractProjection);
  return freezeCp251Validation({
    evidence_packet: "H07.CP00-251.search_core_ui_binding_tail_descriptor",
    gate: SEARCH_CORE_CP251_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    ui_binding_tail_valid: tail.valid,
    no_real_data: true,
    source_ui_workflow_slice_pack_id: SEARCH_CORE_CP251_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP251_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP251_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP251_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createSearchCoreCp251ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp251Coverage(planPack);
  const tail = validateSearchCoreCp251UiBindingTailDescriptor(createSearchCoreCp251UiBindingTailDescriptor(), {});
  return freezeCp251Validation({
    review_packet: "C07.CP00-251.search_core_ui_binding_tail_descriptor",
    gate: SEARCH_CORE_CP251_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP251_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    ui_binding_tail_valid: tail.valid,
    invalid_review_blockers: SEARCH_CORE_CP251_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-251 cover exactly the 10 planned RP07 units from RP07.P04.M05.S15 through RP07.P04.M06.S02?",
      "Do the two descriptor sections (M05 permission/audit binding tail and M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-251 avoid UI runtime execution, search/OCR/index/embedding runtime dispatch, UI leaks, unauthorized count leaks, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp251CloseoutHandoff() {
  return freezeCp251Validation({
    handoff_id: "CP00-251-to-CP00-252",
    from_pack_id: SEARCH_CORE_CP251_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP251_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP251_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP251_PACK_BINDING.range,
    open_scope: "Continue RP07.P04.M06.S03 onward with the remaining UI fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP251_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp252CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp252Validation({
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

export function validateSearchCoreCp252Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-252 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP252_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-252");
  if (planPack?.risk_class !== SEARCH_CORE_CP252_PACK_BINDING.risk_class) errors.push("CP00-252 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP252_PACK_BINDING.unit_count) errors.push("CP00-252 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP252_PACK_BINDING.first_unit_id) errors.push("CP00-252 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP252_PACK_BINDING.last_unit_id) errors.push("CP00-252 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-252 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-252 must only include RP07 units");
  const summary = createSearchCoreCp252CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-252 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-252 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-252 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-252 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-252 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-252 ${microId} missing row ${title}`);
    }
  }
  return freezeCp252Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(
  descriptor = createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p04_closeout_p05_fixture_foundation_case_set ?? createSearchCoreCp252P04CloseoutP05FixtureFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor") errors.push("CP00-252 descriptor type drift");
  if (descriptor.source_ui_binding_tail_descriptor !== "SearchCoreCp251UiBindingTailDescriptor") {
    errors.push("CP00-252 source ui binding tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows).length) errors.push("CP00-252 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP252_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-252 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-252 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-252 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-252 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-252 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-252 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-252 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const fixSection of ["RP07.P05.M00", "RP07.P05.M01", "RP07.P05.M02"]) {
    const rows = sections[fixSection]?.rows ?? {};
    if (rows.base_tenant_fixture?.real_client_data_loaded !== false) errors.push(`CP00-252 ${fixSection} must not load real data`);
    if (rows.cross_tenant_case?.cross_tenant_access_allowed !== false) errors.push(`CP00-252 ${fixSection} must not allow cross-tenant access`);
    if (rows.denied_case?.expected_outcome !== "denied_customer_safe") errors.push(`CP00-252 ${fixSection} denied case drift`);
    if (rows.review_required_case?.expected_outcome !== "review_required") errors.push(`CP00-252 ${fixSection} review case drift`);
  }
  const m01 = sections["RP07.P05.M01"]?.rows ?? {};
  if (m01.security_trimming_case?.unauthorized_data_omitted !== true) errors.push("CP00-252 security trimming drift");
  if (m01.ai_retrieval_or_analytics_case?.dispatches_ai_runtime !== false) errors.push("CP00-252 must not dispatch AI runtime");
  if (m01.hermes_fixture_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-252 must not emit Hermes runtime receipts");
  if (m01.claude_missing_test_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-252 must not claim Claude final approval");
  if (m01.no_real_data_check?.real_client_data_loaded !== false) errors.push("CP00-252 no-real-data check drift");
  if (SEARCH_CORE_CP252_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-252 must not promote Claude");
  if (SEARCH_CORE_CP252_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-252 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-252 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-252 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP252_PACK_BINDING.pack_id,
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-252 contract current_pack drift");
  }
  if (
    contractProjection?.p04_closeout_p05_fixture_foundation_descriptor?.descriptor &&
    contractProjection.p04_closeout_p05_fixture_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-252 contract p04_closeout_p05_fixture_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP252_PACK_BINDING.next_pack_id) errors.push("CP00-252 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP252_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-252 next subphase drift");
  }
  return freezeCp252Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp252HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp252Coverage(planPack);
  const foundation = validateSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp252Validation({
    evidence_packet: "H07.CP00-252.search_core_p04_closeout_p05_fixture_foundation_descriptor",
    gate: SEARCH_CORE_CP252_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p04_closeout_p05_fixture_foundation_valid: foundation.valid,
    no_real_data: true,
    source_ui_binding_tail_pack_id: SEARCH_CORE_CP252_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP252_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP252_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP252_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp252ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp252Coverage(planPack);
  const foundation = validateSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(createSearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor(), {});
  return freezeCp252Validation({
    review_packet: "C07.CP00-252.search_core_p04_closeout_p05_fixture_foundation_descriptor",
    gate: SEARCH_CORE_CP252_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP252_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p04_closeout_p05_fixture_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP252_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-252 cover exactly the 150 planned RP07 units from RP07.P04.M06.S03 through RP07.P05.M02.S14?",
      "Do the eight descriptor sections (five P04 UI micros and three P05 fixture micros) cover every planned row title as descriptor-only rows, including base tenant/user/matter/document fixtures, golden/review/denied/cross-tenant/missing-context cases, audit hint cases, security trimming, AI retrieval cases, fixture manifests, golden/failure tests, Hermes fixture evidence, Claude missing-test prompts, and no-real-data checks?",
      "Does CP00-252 avoid UI runtime execution, AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp252CloseoutHandoff() {
  return freezeCp252Validation({
    handoff_id: "CP00-252-to-CP00-253",
    from_pack_id: SEARCH_CORE_CP252_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP252_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP252_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP252_PACK_BINDING.range,
    open_scope: "RP07.P04 descriptor scope is closed; continue RP07.P05.M02.S15 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP252_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp253CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp253Validation({
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

export function validateSearchCoreCp253Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-253 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP253_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-253");
  if (planPack?.risk_class !== SEARCH_CORE_CP253_PACK_BINDING.risk_class) errors.push("CP00-253 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP253_PACK_BINDING.unit_count) errors.push("CP00-253 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP253_PACK_BINDING.first_unit_id) errors.push("CP00-253 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP253_PACK_BINDING.last_unit_id) errors.push("CP00-253 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-253 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-253 must only include RP07 units");
  const summary = createSearchCoreCp253CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-253 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-253 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-253 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-253 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-253 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-253 ${microId} missing row ${title}`);
    }
  }
  return freezeCp253Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp253FixtureSliceDescriptor(
  descriptor = createSearchCoreCp253FixtureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_slice_case_set ?? createSearchCoreCp253FixtureSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp253FixtureSliceDescriptor") errors.push("CP00-253 descriptor type drift");
  if (descriptor.source_p04_closeout_p05_fixture_foundation_descriptor !== "SearchCoreCp252P04CloseoutP05FixtureFoundationDescriptor") {
    errors.push("CP00-253 source p04 closeout p05 fixture foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP253_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-253 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-253 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-253 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-253 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-253 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-253 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-253 ${microId} ${key} must not include raw payload`);
    }
  }
  const m03 = sections["RP07.P05.M03"]?.rows ?? {};
  if (m03.stable_id_check?.id_drift_detected !== false) errors.push("CP00-253 stable ID drift detected");
  if (m03.replay_command?.executes_command_runtime !== false) errors.push("CP00-253 must not execute command runtime");
  if (m03.cross_tenant_case?.cross_tenant_access_allowed !== false) errors.push("CP00-253 must not allow cross-tenant access");
  if (m03.ai_retrieval_or_analytics_case?.dispatches_ai_runtime !== false) errors.push("CP00-253 must not dispatch AI runtime");
  if (m03.hermes_fixture_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-253 must not emit Hermes runtime receipts");
  if (m03.claude_missing_test_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-253 must not claim Claude final approval");
  if (m03.no_real_data_check?.real_client_data_loaded !== false) errors.push("CP00-253 no-real-data check drift");
  const m04 = sections["RP07.P05.M04"]?.rows ?? {};
  if (m04.security_trimming_case?.unauthorized_data_omitted !== true) errors.push("CP00-253 security trimming drift");
  if (SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.id_drift_detected !== false) errors.push("CP00-253 id drift attestation drift");
  if (SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-253 must not promote Claude");
  if (SEARCH_CORE_CP253_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-253 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-253 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-253 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP253_PACK_BINDING.pack_id,
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-253 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_slice_descriptor?.descriptor &&
    contractProjection.fixture_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-253 contract fixture_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP253_PACK_BINDING.next_pack_id) errors.push("CP00-253 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP253_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-253 next subphase drift");
  }
  return freezeCp253Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp253HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp253FixtureSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp253Coverage(planPack);
  const slice = validateSearchCoreCp253FixtureSliceDescriptor(descriptor, contractProjection);
  return freezeCp253Validation({
    evidence_packet: "H07.CP00-253.search_core_fixture_slice_descriptor",
    gate: SEARCH_CORE_CP253_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_slice_valid: slice.valid,
    no_real_data: true,
    source_p04_closeout_p05_fixture_foundation_pack_id: SEARCH_CORE_CP253_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP253_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP253_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP253_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp253ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp253Coverage(planPack);
  const slice = validateSearchCoreCp253FixtureSliceDescriptor(createSearchCoreCp253FixtureSliceDescriptor(), {});
  return freezeCp253Validation({
    review_packet: "C07.CP00-253.search_core_fixture_slice_descriptor",
    gate: SEARCH_CORE_CP253_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP253_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP253_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-253 cover exactly the 40 planned RP07 units from RP07.P05.M02.S15 through RP07.P05.M04.S12?",
      "Do the three descriptor sections (M02 type/shape tail, M03 primary fixture cycle with stable ID check and replay command, M04 secondary fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-253 avoid AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, command runtime execution, stable ID drift, state writes, object storage, Hermes runtime receipts, raw payloads, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp253CloseoutHandoff() {
  return freezeCp253Validation({
    handoff_id: "CP00-253-to-CP00-254",
    from_pack_id: SEARCH_CORE_CP253_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP253_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP253_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP253_PACK_BINDING.range,
    open_scope: "Continue RP07.P05.M04.S13 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP253_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp254CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp254Validation({
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

export function validateSearchCoreCp254Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-254 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP254_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-254");
  if (planPack?.risk_class !== SEARCH_CORE_CP254_PACK_BINDING.risk_class) errors.push("CP00-254 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP254_PACK_BINDING.unit_count) errors.push("CP00-254 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP254_PACK_BINDING.first_unit_id) errors.push("CP00-254 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP254_PACK_BINDING.last_unit_id) errors.push("CP00-254 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-254 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-254 must only include RP07 units");
  const summary = createSearchCoreCp254CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-254 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-254 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-254 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-254 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-254 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-254 ${microId} missing row ${title}`);
    }
  }
  return freezeCp254Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp254FixtureBindingSliceDescriptor(
  descriptor = createSearchCoreCp254FixtureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_binding_slice_case_set ?? createSearchCoreCp254FixtureBindingSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp254FixtureBindingSliceDescriptor") errors.push("CP00-254 descriptor type drift");
  if (descriptor.source_fixture_slice_descriptor !== "SearchCoreCp253FixtureSliceDescriptor") {
    errors.push("CP00-254 source fixture slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP254_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-254 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-254 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-254 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-254 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-254 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-254 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-254 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P05.M05"]?.rows ?? {};
  if (m05.cross_tenant_case?.cross_tenant_access_allowed !== false) errors.push("CP00-254 must not allow cross-tenant access");
  if (m05.security_trimming_case?.unauthorized_data_omitted !== true) errors.push("CP00-254 security trimming drift");
  if (m05.ai_retrieval_or_analytics_case?.dispatches_ai_runtime !== false) errors.push("CP00-254 must not dispatch AI runtime");
  if (m05.stable_id_check?.id_drift_detected !== false) errors.push("CP00-254 stable ID drift detected");
  if (m05.replay_command?.executes_command_runtime !== false) errors.push("CP00-254 must not execute command runtime");
  if (m05.hermes_fixture_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-254 must not emit Hermes runtime receipts");
  if (m05.claude_missing_test_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-254 must not claim Claude final approval");
  if (m05.no_real_data_check?.real_client_data_loaded !== false) errors.push("CP00-254 no-real-data check drift");
  const m06 = sections["RP07.P05.M06"]?.rows ?? {};
  if (m06.denied_case?.expected_outcome !== "denied_customer_safe") errors.push("CP00-254 denied case drift");
  if (m06.base_tenant_fixture?.real_client_data_loaded !== false) errors.push("CP00-254 must not load real data");
  if (SEARCH_CORE_CP254_NO_WRITE_ATTESTATION.id_drift_detected !== false) errors.push("CP00-254 id drift attestation drift");
  if (SEARCH_CORE_CP254_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-254 must not promote Claude");
  if (SEARCH_CORE_CP254_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-254 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-254 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-254 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP254_PACK_BINDING.pack_id,
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-254 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_binding_slice_descriptor?.descriptor &&
    contractProjection.fixture_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-254 contract fixture_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP254_PACK_BINDING.next_pack_id) errors.push("CP00-254 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP254_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-254 next subphase drift");
  }
  return freezeCp254Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp254HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp254FixtureBindingSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp254Coverage(planPack);
  const slice = validateSearchCoreCp254FixtureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp254Validation({
    evidence_packet: "H07.CP00-254.search_core_fixture_binding_slice_descriptor",
    gate: SEARCH_CORE_CP254_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_fixture_slice_pack_id: SEARCH_CORE_CP254_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP254_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP254_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP254_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp254ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp254Coverage(planPack);
  const slice = validateSearchCoreCp254FixtureBindingSliceDescriptor(createSearchCoreCp254FixtureBindingSliceDescriptor(), {});
  return freezeCp254Validation({
    review_packet: "C07.CP00-254.search_core_fixture_binding_slice_descriptor",
    gate: SEARCH_CORE_CP254_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP254_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_binding_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP254_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-254 cover exactly the 40 planned RP07 units from RP07.P05.M04.S13 through RP07.P05.M06.S08?",
      "Do the three descriptor sections (M04 secondary workflow tail, M05 permission/audit binding fixture cycle, M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-254 avoid AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, command runtime execution, stable ID drift, state writes, object storage, Hermes runtime receipts, raw payloads, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp254CloseoutHandoff() {
  return freezeCp254Validation({
    handoff_id: "CP00-254-to-CP00-255",
    from_pack_id: SEARCH_CORE_CP254_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP254_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP254_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP254_PACK_BINDING.range,
    open_scope: "Continue RP07.P05.M06.S09 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP254_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp255CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp255Validation({
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

export function validateSearchCoreCp255Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-255 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP255_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-255");
  if (planPack?.risk_class !== SEARCH_CORE_CP255_PACK_BINDING.risk_class) errors.push("CP00-255 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP255_PACK_BINDING.unit_count) errors.push("CP00-255 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP255_PACK_BINDING.first_unit_id) errors.push("CP00-255 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP255_PACK_BINDING.last_unit_id) errors.push("CP00-255 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-255 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-255 must only include RP07 units");
  const summary = createSearchCoreCp255CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-255 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-255 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-255 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-255 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-255 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-255 ${microId} missing row ${title}`);
    }
  }
  return freezeCp255Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp255FixtureSetMidDescriptor(
  descriptor = createSearchCoreCp255FixtureSetMidDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.fixture_set_mid_case_set ?? createSearchCoreCp255FixtureSetMidCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp255FixtureSetMidDescriptor") errors.push("CP00-255 descriptor type drift");
  if (descriptor.source_fixture_binding_slice_descriptor !== "SearchCoreCp254FixtureBindingSliceDescriptor") {
    errors.push("CP00-255 source fixture binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP255_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-255 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-255 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-255 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-255 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-255 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-255 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-255 ${microId} ${key} must not include raw payload`);
    }
  }
  const m06 = sections["RP07.P05.M06"]?.rows ?? {};
  if (m06.cross_tenant_case?.cross_tenant_access_allowed !== false) errors.push("CP00-255 must not allow cross-tenant access");
  if (m06.security_trimming_case?.unauthorized_data_omitted !== true) errors.push("CP00-255 security trimming drift");
  if (m06.ai_retrieval_or_analytics_case?.dispatches_ai_runtime !== false) errors.push("CP00-255 must not dispatch AI runtime");
  if (m06.golden_test?.executes_unit_test_runtime_paths !== false) errors.push("CP00-255 must not execute test runtime");
  if (m06.hermes_fixture_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-255 must not emit Hermes runtime receipts");
  if (m06.claude_missing_test_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-255 must not claim Claude final approval");
  if (m06.audit_hint_case?.audit_hint_detail_included !== false) errors.push("CP00-255 must not expose audit hints");
  if (SEARCH_CORE_CP255_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-255 must not promote Claude");
  if (SEARCH_CORE_CP255_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-255 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-255 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-255 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP255_PACK_BINDING.pack_id,
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-255 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_set_mid_descriptor?.descriptor &&
    contractProjection.fixture_set_mid_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-255 contract fixture_set_mid_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP255_PACK_BINDING.next_pack_id) errors.push("CP00-255 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP255_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-255 next subphase drift");
  }
  return freezeCp255Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp255HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp255FixtureSetMidDescriptor(),
) {
  const coverage = validateSearchCoreCp255Coverage(planPack);
  const mid = validateSearchCoreCp255FixtureSetMidDescriptor(descriptor, contractProjection);
  return freezeCp255Validation({
    evidence_packet: "H07.CP00-255.search_core_fixture_set_mid_descriptor",
    gate: SEARCH_CORE_CP255_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    fixture_set_mid_valid: mid.valid,
    no_real_data: true,
    source_fixture_binding_slice_pack_id: SEARCH_CORE_CP255_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP255_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP255_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP255_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && mid.valid,
  });
}

export function createSearchCoreCp255ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp255Coverage(planPack);
  const mid = validateSearchCoreCp255FixtureSetMidDescriptor(createSearchCoreCp255FixtureSetMidDescriptor(), {});
  return freezeCp255Validation({
    review_packet: "C07.CP00-255.search_core_fixture_set_mid_descriptor",
    gate: SEARCH_CORE_CP255_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP255_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    fixture_set_mid_valid: mid.valid,
    invalid_review_blockers: SEARCH_CORE_CP255_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-255 cover exactly the 10 planned RP07 units from RP07.P05.M06.S09 through RP07.P05.M06.S18?",
      "Does the M06 synthetic fixture set middle section cover every planned row title as descriptor-only rows, including cross-tenant/missing-context cases, audit hint case, security trimming, AI retrieval case, fixture manifest, golden/failure tests, Hermes fixture evidence, and Claude missing-test prompt?",
      "Does CP00-255 avoid AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp255CloseoutHandoff() {
  return freezeCp255Validation({
    handoff_id: "CP00-255-to-CP00-256",
    from_pack_id: SEARCH_CORE_CP255_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP255_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP255_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP255_PACK_BINDING.range,
    open_scope: "Continue RP07.P05.M06.S19 onward with the remaining fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP255_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp256CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp256Validation({
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

export function validateSearchCoreCp256Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-256 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP256_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-256");
  if (planPack?.risk_class !== SEARCH_CORE_CP256_PACK_BINDING.risk_class) errors.push("CP00-256 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP256_PACK_BINDING.unit_count) errors.push("CP00-256 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP256_PACK_BINDING.first_unit_id) errors.push("CP00-256 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP256_PACK_BINDING.last_unit_id) errors.push("CP00-256 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-256 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-256 must only include RP07 units");
  const summary = createSearchCoreCp256CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-256 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-256 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-256 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-256 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-256 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-256 ${microId} missing row ${title}`);
    }
  }
  return freezeCp256Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(
  descriptor = createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p05_closeout_p06_permission_foundation_case_set ?? createSearchCoreCp256P05CloseoutP06PermissionFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor") errors.push("CP00-256 descriptor type drift");
  if (descriptor.source_fixture_set_mid_descriptor !== "SearchCoreCp255FixtureSetMidDescriptor") {
    errors.push("CP00-256 source fixture set mid descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows).length) errors.push("CP00-256 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP256_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-256 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-256 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-256 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-256 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-256 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-256 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-256 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const permSection of ["RP07.P06.M00", "RP07.P06.M01", "RP07.P06.M02"]) {
    const rows = sections[permSection]?.rows ?? {};
    if (rows.permission_matrix_row?.permission_decision_detail_included !== false) errors.push(`CP00-256 ${permSection} must not expose permission decisions`);
    if (rows.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push(`CP00-256 ${permSection} deny-over-allow drift`);
    if (rows.ethical_wall_interaction?.cross_wall_access_allowed !== false) errors.push(`CP00-256 ${permSection} must not allow cross-wall access`);
    if (rows.matched_rule_capture?.matched_rule_detail_included !== false) errors.push(`CP00-256 ${permSection} must not expose matched rules`);
    if (rows.audit_event_expectation?.writes_audit_event !== false) errors.push(`CP00-256 ${permSection} must not write audit events`);
    if (rows.security_trimming_proof?.unauthorized_data_omitted !== true) errors.push(`CP00-256 ${permSection} security trimming drift`);
    if (rows.denied_test?.expected_outcome !== "denied_customer_safe") errors.push(`CP00-256 ${permSection} denied test drift`);
    if (rows.permission_fixture?.real_client_data_loaded !== false) errors.push(`CP00-256 ${permSection} must not load real data`);
  }
  const m07 = sections["RP07.P05.M07"]?.rows ?? {};
  if (m07.cross_tenant_case?.cross_tenant_access_allowed !== false) errors.push("CP00-256 must not allow cross-tenant access");
  if (m07.hermes_fixture_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-256 must not emit Hermes runtime receipts");
  if (m07.claude_missing_test_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-256 must not claim Claude final approval");
  if (SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.deny_over_allow_enforced !== true) errors.push("CP00-256 deny-over-allow attestation drift");
  if (SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-256 must not promote Claude");
  if (SEARCH_CORE_CP256_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-256 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-256 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-256 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP256_PACK_BINDING.pack_id,
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-256 contract current_pack drift");
  }
  if (
    contractProjection?.p05_closeout_p06_permission_foundation_descriptor?.descriptor &&
    contractProjection.p05_closeout_p06_permission_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-256 contract p05_closeout_p06_permission_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP256_PACK_BINDING.next_pack_id) errors.push("CP00-256 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP256_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-256 next subphase drift");
  }
  return freezeCp256Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp256HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp256Coverage(planPack);
  const foundation = validateSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(descriptor, contractProjection);
  return freezeCp256Validation({
    evidence_packet: "H07.CP00-256.search_core_p05_closeout_p06_permission_foundation_descriptor",
    gate: SEARCH_CORE_CP256_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p05_closeout_p06_permission_foundation_valid: foundation.valid,
    no_real_data: true,
    source_fixture_set_mid_pack_id: SEARCH_CORE_CP256_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP256_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP256_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP256_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp256ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp256Coverage(planPack);
  const foundation = validateSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(createSearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor(), {});
  return freezeCp256Validation({
    review_packet: "C07.CP00-256.search_core_p05_closeout_p06_permission_foundation_descriptor",
    gate: SEARCH_CORE_CP256_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP256_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p05_closeout_p06_permission_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP256_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-256 cover exactly the 150 planned RP07 units from RP07.P05.M06.S19 through RP07.P06.M02.S20?",
      "Do the eight descriptor sections (five P05 fixture micros and three P06 permission micros) cover every planned row title as descriptor-only rows, including permission matrix rows, view/search/mutation/export/share/AI-retrieval decision bindings, audit hint fields, matched rule capture, deny-over-allow checks, legal hold/ethical wall/object ACL interactions, review/approval routes, security trimming proofs, audit event expectations, permission fixtures, and allowed/denied tests?",
      "Does CP00-256 avoid runtime permission evaluation, audit event writes, AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decision details, matched rule details, fixture payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp256CloseoutHandoff() {
  return freezeCp256Validation({
    handoff_id: "CP00-256-to-CP00-257",
    from_pack_id: SEARCH_CORE_CP256_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP256_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP256_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP256_PACK_BINDING.range,
    open_scope: "RP07.P05 descriptor scope is closed; continue RP07.P06.M02.S21 onward with the remaining permission rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP256_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp257CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp257Validation({
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

export function validateSearchCoreCp257Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-257 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP257_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-257");
  if (planPack?.risk_class !== SEARCH_CORE_CP257_PACK_BINDING.risk_class) errors.push("CP00-257 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP257_PACK_BINDING.unit_count) errors.push("CP00-257 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP257_PACK_BINDING.first_unit_id) errors.push("CP00-257 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP257_PACK_BINDING.last_unit_id) errors.push("CP00-257 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-257 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-257 must only include RP07 units");
  const summary = createSearchCoreCp257CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-257 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-257 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-257 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-257 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-257 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-257 ${microId} missing row ${title}`);
    }
  }
  return freezeCp257Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp257PermissionSliceHeadDescriptor(
  descriptor = createSearchCoreCp257PermissionSliceHeadDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_slice_head_case_set ?? createSearchCoreCp257PermissionSliceHeadCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp257PermissionSliceHeadDescriptor") errors.push("CP00-257 descriptor type drift");
  if (descriptor.source_p05_closeout_p06_permission_foundation_descriptor !== "SearchCoreCp256P05CloseoutP06PermissionFoundationDescriptor") {
    errors.push("CP00-257 source p05 closeout p06 permission foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP257_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-257 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-257 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-257 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-257 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-257 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-257 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-257 ${microId} ${key} must not include raw payload`);
    }
  }
  const m02 = sections["RP07.P06.M02"]?.rows ?? {};
  if (m02.cross_tenant_test?.cross_tenant_access_allowed !== false) errors.push("CP00-257 must not allow cross-tenant access");
  if (m02.cross_tenant_test?.executes_unit_test_runtime_paths !== false) errors.push("CP00-257 must not execute test runtime");
  if (m02.leak_prevention_test?.leak_detected !== false) errors.push("CP00-257 leak detected");
  const m03 = sections["RP07.P06.M03"]?.rows ?? {};
  if (m03.permission_matrix_row?.permission_decision_detail_included !== false) errors.push("CP00-257 must not expose permission decisions");
  if (m03.ai_retrieval_decision_binding?.dispatches_ai_runtime !== false) errors.push("CP00-257 must not dispatch AI runtime");
  if (m03.audit_hint_fields?.audit_hint_detail_included !== false) errors.push("CP00-257 must not expose audit hints");
  if (SEARCH_CORE_CP257_NO_WRITE_ATTESTATION.deny_over_allow_enforced !== true) errors.push("CP00-257 deny-over-allow attestation drift");
  if (SEARCH_CORE_CP257_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-257 must not promote Claude");
  if (SEARCH_CORE_CP257_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-257 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-257 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-257 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP257_PACK_BINDING.pack_id,
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-257 contract current_pack drift");
  }
  if (
    contractProjection?.permission_slice_head_descriptor?.descriptor &&
    contractProjection.permission_slice_head_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-257 contract permission_slice_head_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP257_PACK_BINDING.next_pack_id) errors.push("CP00-257 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP257_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-257 next subphase drift");
  }
  return freezeCp257Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp257HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp257PermissionSliceHeadDescriptor(),
) {
  const coverage = validateSearchCoreCp257Coverage(planPack);
  const head = validateSearchCoreCp257PermissionSliceHeadDescriptor(descriptor, contractProjection);
  return freezeCp257Validation({
    evidence_packet: "H07.CP00-257.search_core_permission_slice_head_descriptor",
    gate: SEARCH_CORE_CP257_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_slice_head_valid: head.valid,
    no_real_data: true,
    source_p05_closeout_p06_permission_foundation_pack_id: SEARCH_CORE_CP257_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP257_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP257_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP257_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && head.valid,
  });
}

export function createSearchCoreCp257ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp257Coverage(planPack);
  const head = validateSearchCoreCp257PermissionSliceHeadDescriptor(createSearchCoreCp257PermissionSliceHeadDescriptor(), {});
  return freezeCp257Validation({
    review_packet: "C07.CP00-257.search_core_permission_slice_head_descriptor",
    gate: SEARCH_CORE_CP257_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP257_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_slice_head_valid: head.valid,
    invalid_review_blockers: SEARCH_CORE_CP257_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-257 cover exactly the 10 planned RP07 units from RP07.P06.M02.S21 through RP07.P06.M03.S08?",
      "Do the two descriptor sections (M02 type/shape tail with cross-tenant and leak prevention tests, M03 primary permission slice head) cover every planned row title as descriptor-only rows?",
      "Does CP00-257 avoid runtime permission evaluation, AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decision details, audit hints, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp257CloseoutHandoff() {
  return freezeCp257Validation({
    handoff_id: "CP00-257-to-CP00-258",
    from_pack_id: SEARCH_CORE_CP257_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP257_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP257_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP257_PACK_BINDING.range,
    open_scope: "Continue RP07.P06.M03.S09 onward with the remaining permission rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP257_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp258CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp258Validation({
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

export function validateSearchCoreCp258Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-258 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP258_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-258");
  if (planPack?.risk_class !== SEARCH_CORE_CP258_PACK_BINDING.risk_class) errors.push("CP00-258 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP258_PACK_BINDING.unit_count) errors.push("CP00-258 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP258_PACK_BINDING.first_unit_id) errors.push("CP00-258 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP258_PACK_BINDING.last_unit_id) errors.push("CP00-258 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-258 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-258 must only include RP07 units");
  const summary = createSearchCoreCp258CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-258 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-258 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-258 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-258 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-258 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-258 ${microId} missing row ${title}`);
    }
  }
  return freezeCp258Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp258PermissionWorkflowSliceDescriptor(
  descriptor = createSearchCoreCp258PermissionWorkflowSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_workflow_slice_case_set ?? createSearchCoreCp258PermissionWorkflowSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp258PermissionWorkflowSliceDescriptor") errors.push("CP00-258 descriptor type drift");
  if (descriptor.source_permission_slice_head_descriptor !== "SearchCoreCp257PermissionSliceHeadDescriptor") {
    errors.push("CP00-258 source permission slice head descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP258_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-258 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-258 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-258 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-258 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-258 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-258 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-258 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const permSection of ["RP07.P06.M03", "RP07.P06.M04"]) {
    const rows = sections[permSection]?.rows ?? {};
    if (rows.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push(`CP00-258 ${permSection} deny-over-allow drift`);
    if (rows.ethical_wall_interaction?.cross_wall_access_allowed !== false) errors.push(`CP00-258 ${permSection} must not allow cross-wall access`);
    if (rows.matched_rule_capture?.matched_rule_detail_included !== false) errors.push(`CP00-258 ${permSection} must not expose matched rules`);
    if (rows.audit_event_expectation?.writes_audit_event !== false) errors.push(`CP00-258 ${permSection} must not write audit events`);
    if (rows.security_trimming_proof?.unauthorized_data_omitted !== true) errors.push(`CP00-258 ${permSection} security trimming drift`);
    if (rows.cross_tenant_test?.cross_tenant_access_allowed !== false) errors.push(`CP00-258 ${permSection} must not allow cross-tenant access`);
    if (rows.leak_prevention_test?.leak_detected !== false) errors.push(`CP00-258 ${permSection} leak detected`);
    if (rows.hermes_security_evidence?.emits_hermes_runtime_receipt !== false) errors.push(`CP00-258 ${permSection} must not emit Hermes runtime receipts`);
  }
  const m03 = sections["RP07.P06.M03"]?.rows ?? {};
  if (m03.claude_bypass_prompt?.permission_bypass_detected !== false) errors.push("CP00-258 permission bypass detected");
  if (m03.claude_bypass_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-258 must not claim Claude final approval");
  if (m03.human_approval_note?.human_final_approval_required !== true) errors.push("CP00-258 human approval note drift");
  if (SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.permission_bypass_detected !== false) errors.push("CP00-258 bypass attestation drift");
  if (SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-258 must not promote Claude");
  if (SEARCH_CORE_CP258_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-258 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-258 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-258 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP258_PACK_BINDING.pack_id,
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-258 contract current_pack drift");
  }
  if (
    contractProjection?.permission_workflow_slice_descriptor?.descriptor &&
    contractProjection.permission_workflow_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-258 contract permission_workflow_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP258_PACK_BINDING.next_pack_id) errors.push("CP00-258 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP258_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-258 next subphase drift");
  }
  return freezeCp258Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp258HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp258PermissionWorkflowSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp258Coverage(planPack);
  const slice = validateSearchCoreCp258PermissionWorkflowSliceDescriptor(descriptor, contractProjection);
  return freezeCp258Validation({
    evidence_packet: "H07.CP00-258.search_core_permission_workflow_slice_descriptor",
    gate: SEARCH_CORE_CP258_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_workflow_slice_valid: slice.valid,
    no_real_data: true,
    source_permission_slice_head_pack_id: SEARCH_CORE_CP258_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP258_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP258_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP258_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp258ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp258Coverage(planPack);
  const slice = validateSearchCoreCp258PermissionWorkflowSliceDescriptor(createSearchCoreCp258PermissionWorkflowSliceDescriptor(), {});
  return freezeCp258Validation({
    review_packet: "C07.CP00-258.search_core_permission_workflow_slice_descriptor",
    gate: SEARCH_CORE_CP258_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP258_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_workflow_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP258_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-258 cover exactly the 40 planned RP07 units from RP07.P06.M03.S09 through RP07.P06.M04.S23?",
      "Do the two descriptor sections (M03 primary permission tail with Hermes security evidence, Claude bypass prompt, and human approval note; M04 secondary workflow head) cover every planned row title as descriptor-only rows?",
      "Does CP00-258 avoid runtime permission evaluation, permission bypass, audit event writes, AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decision details, matched rule details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp258CloseoutHandoff() {
  return freezeCp258Validation({
    handoff_id: "CP00-258-to-CP00-259",
    from_pack_id: SEARCH_CORE_CP258_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP258_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP258_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP258_PACK_BINDING.range,
    open_scope: "Continue RP07.P06.M04.S24 onward with the remaining permission rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP258_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp259CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp259Validation({
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

export function validateSearchCoreCp259Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-259 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP259_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-259");
  if (planPack?.risk_class !== SEARCH_CORE_CP259_PACK_BINDING.risk_class) errors.push("CP00-259 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP259_PACK_BINDING.unit_count) errors.push("CP00-259 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP259_PACK_BINDING.first_unit_id) errors.push("CP00-259 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP259_PACK_BINDING.last_unit_id) errors.push("CP00-259 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-259 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-259 must only include RP07 units");
  const summary = createSearchCoreCp259CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-259 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-259 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-259 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-259 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-259 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-259 ${microId} missing row ${title}`);
    }
  }
  return freezeCp259Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp259PermissionBindingSliceDescriptor(
  descriptor = createSearchCoreCp259PermissionBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.permission_binding_slice_case_set ?? createSearchCoreCp259PermissionBindingSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp259PermissionBindingSliceDescriptor") errors.push("CP00-259 descriptor type drift");
  if (descriptor.source_permission_workflow_slice_descriptor !== "SearchCoreCp258PermissionWorkflowSliceDescriptor") {
    errors.push("CP00-259 source permission workflow slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP259_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-259 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-259 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-259 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-259 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-259 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-259 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-259 ${microId} ${key} must not include raw payload`);
    }
  }
  const m04 = sections["RP07.P06.M04"]?.rows ?? {};
  if (m04.claude_bypass_prompt?.permission_bypass_detected !== false) errors.push("CP00-259 permission bypass detected");
  if (m04.human_approval_note?.human_final_approval_required !== true) errors.push("CP00-259 human approval note drift");
  const m05 = sections["RP07.P06.M05"]?.rows ?? {};
  if (m05.deny_over_allow_check?.deny_over_allow_enforced !== true) errors.push("CP00-259 deny-over-allow drift");
  if (m05.ethical_wall_interaction?.cross_wall_access_allowed !== false) errors.push("CP00-259 must not allow cross-wall access");
  if (m05.matched_rule_capture?.matched_rule_detail_included !== false) errors.push("CP00-259 must not expose matched rules");
  if (m05.audit_event_expectation?.writes_audit_event !== false) errors.push("CP00-259 must not write audit events");
  if (m05.security_trimming_proof?.unauthorized_data_omitted !== true) errors.push("CP00-259 security trimming drift");
  if (m05.cross_tenant_test?.cross_tenant_access_allowed !== false) errors.push("CP00-259 must not allow cross-tenant access");
  if (m05.leak_prevention_test?.leak_detected !== false) errors.push("CP00-259 leak detected");
  if (m05.hermes_security_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-259 must not emit Hermes runtime receipts");
  if (m05.permission_fixture?.real_client_data_loaded !== false) errors.push("CP00-259 must not load real data");
  const m06 = sections["RP07.P06.M06"]?.rows ?? {};
  if (m06.permission_matrix_row?.permission_decision_detail_included !== false) errors.push("CP00-259 must not expose permission decisions");
  if (m06.ai_retrieval_decision_binding?.dispatches_ai_runtime !== false) errors.push("CP00-259 must not dispatch AI runtime");
  if (SEARCH_CORE_CP259_NO_WRITE_ATTESTATION.permission_bypass_detected !== false) errors.push("CP00-259 bypass attestation drift");
  if (SEARCH_CORE_CP259_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-259 must not promote Claude");
  if (SEARCH_CORE_CP259_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-259 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-259 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-259 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP259_PACK_BINDING.pack_id,
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-259 contract current_pack drift");
  }
  if (
    contractProjection?.permission_binding_slice_descriptor?.descriptor &&
    contractProjection.permission_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-259 contract permission_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP259_PACK_BINDING.next_pack_id) errors.push("CP00-259 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP259_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-259 next subphase drift");
  }
  return freezeCp259Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp259HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp259PermissionBindingSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp259Coverage(planPack);
  const slice = validateSearchCoreCp259PermissionBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp259Validation({
    evidence_packet: "H07.CP00-259.search_core_permission_binding_slice_descriptor",
    gate: SEARCH_CORE_CP259_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    permission_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_permission_workflow_slice_pack_id: SEARCH_CORE_CP259_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP259_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP259_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP259_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp259ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp259Coverage(planPack);
  const slice = validateSearchCoreCp259PermissionBindingSliceDescriptor(createSearchCoreCp259PermissionBindingSliceDescriptor(), {});
  return freezeCp259Validation({
    review_packet: "C07.CP00-259.search_core_permission_binding_slice_descriptor",
    gate: SEARCH_CORE_CP259_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP259_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    permission_binding_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP259_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-259 cover exactly the 40 planned RP07 units from RP07.P06.M04.S24 through RP07.P06.M06.S13?",
      "Do the three descriptor sections (M04 secondary workflow tail, M05 permission/audit binding full cycle, M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-259 avoid runtime permission evaluation, permission bypass, audit event writes, AI runtime dispatch, search/OCR/index/embedding runtime, unit-test runtime paths, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, permission decision details, matched rule details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp259CloseoutHandoff() {
  return freezeCp259Validation({
    handoff_id: "CP00-259-to-CP00-260",
    from_pack_id: SEARCH_CORE_CP259_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP259_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP259_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP259_PACK_BINDING.range,
    open_scope: "Continue RP07.P06.M06.S14 onward with the remaining permission fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP259_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp260CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp260Validation({
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

export function validateSearchCoreCp260Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-260 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP260_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-260");
  if (planPack?.risk_class !== SEARCH_CORE_CP260_PACK_BINDING.risk_class) errors.push("CP00-260 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP260_PACK_BINDING.unit_count) errors.push("CP00-260 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP260_PACK_BINDING.first_unit_id) errors.push("CP00-260 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP260_PACK_BINDING.last_unit_id) errors.push("CP00-260 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-260 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-260 must only include RP07 units");
  const summary = createSearchCoreCp260CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-260 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-260 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-260 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-260 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-260 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-260 ${microId} missing row ${title}`);
    }
  }
  return freezeCp260Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(
  descriptor = createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p06_closeout_p07_failure_foundation_case_set ?? createSearchCoreCp260P06CloseoutP07FailureFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp260P06CloseoutP07FailureFoundationDescriptor") errors.push("CP00-260 descriptor type drift");
  if (descriptor.source_permission_binding_slice_descriptor !== "SearchCoreCp259PermissionBindingSliceDescriptor") {
    errors.push("CP00-260 source permission binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows).length) errors.push("CP00-260 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP260_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-260 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-260 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-260 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-260 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-260 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-260 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-260 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const failSection of ["RP07.P07.M00", "RP07.P07.M01", "RP07.P07.M02"]) {
    const rows = sections[failSection]?.rows ?? {};
    if (rows.cross_tenant_failure?.cross_tenant_access_allowed !== false) errors.push(`CP00-260 ${failSection} must not allow cross-tenant access`);
    if (rows.permission_denied_failure?.permission_decision_detail_included !== false) errors.push(`CP00-260 ${failSection} must not expose permission decisions`);
    if (rows.ambiguous_rule_failure?.deny_over_allow_enforced !== true) errors.push(`CP00-260 ${failSection} deny-over-allow drift`);
    if (rows.lock_conflict_failure?.acquires_runtime_lock !== false) errors.push(`CP00-260 ${failSection} must not acquire locks`);
    if (rows.retry_exhaustion_failure?.performs_retry_runtime !== false) errors.push(`CP00-260 ${failSection} must not perform retry runtime`);
  }
  const m01 = sections["RP07.P07.M01"]?.rows ?? {};
  if (m01.rollback_expectation?.performs_rollback_runtime !== false) errors.push("CP00-260 must not perform rollback runtime");
  if (m01.blocked_claim_receipt?.blocked_claim_detail_included !== false) errors.push("CP00-260 must not expose blocked claims");
  if (m01.failure_fixture?.real_client_data_loaded !== false) errors.push("CP00-260 must not load real data");
  if (m01.failure_integration_smoke?.dispatches_integration_smoke_runtime !== false) errors.push("CP00-260 must not dispatch smoke runtime");
  if (m01.audit_failure_hint?.audit_hint_detail_included !== false) errors.push("CP00-260 must not expose audit hints");
  if (m01.hermes_failure_evidence?.emits_hermes_runtime_receipt !== false) errors.push("CP00-260 must not emit Hermes runtime receipts");
  const m07 = sections["RP07.P06.M07"]?.rows ?? {};
  if (m07.claude_bypass_prompt?.permission_bypass_detected !== false) errors.push("CP00-260 permission bypass detected");
  if (m07.human_approval_note?.human_final_approval_required !== true) errors.push("CP00-260 human approval note drift");
  if (SEARCH_CORE_CP260_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-260 must not promote Claude");
  if (SEARCH_CORE_CP260_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-260 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-260 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-260 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP260_PACK_BINDING.pack_id,
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-260 contract current_pack drift");
  }
  if (
    contractProjection?.p06_closeout_p07_failure_foundation_descriptor?.descriptor &&
    contractProjection.p06_closeout_p07_failure_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-260 contract p06_closeout_p07_failure_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP260_PACK_BINDING.next_pack_id) errors.push("CP00-260 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP260_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-260 next subphase drift");
  }
  return freezeCp260Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp260HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp260Coverage(planPack);
  const foundation = validateSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(descriptor, contractProjection);
  return freezeCp260Validation({
    evidence_packet: "H07.CP00-260.search_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: SEARCH_CORE_CP260_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    no_real_data: true,
    source_permission_binding_slice_pack_id: SEARCH_CORE_CP260_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP260_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP260_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP260_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp260ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp260Coverage(planPack);
  const foundation = validateSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(createSearchCoreCp260P06CloseoutP07FailureFoundationDescriptor(), {});
  return freezeCp260Validation({
    review_packet: "C07.CP00-260.search_core_p06_closeout_p07_failure_foundation_descriptor",
    gate: SEARCH_CORE_CP260_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP260_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p06_closeout_p07_failure_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP260_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-260 cover exactly the 150 planned RP07 units from RP07.P06.M06.S14 through RP07.P07.M02.S12?",
      "Do the eight descriptor sections (five P06 permission micros and three P07 failure micros) cover every planned row title as descriptor-only rows, including failure taxonomies, missing tenant/actor/Matter/resource failures, unknown action/cross-tenant/permission denied/ambiguous rule/stale reference failures, lock conflict and retry exhaustion failures, rollback/compensation expectations, blocked-claim receipts, failure fixtures/tests, audit failure hints, and Hermes failure evidence?",
      "Does CP00-260 avoid runtime permission evaluation, lock acquisition, retry/rollback runtime, integration smoke dispatch, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, blocked claim details, validation error details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp260CloseoutHandoff() {
  return freezeCp260Validation({
    handoff_id: "CP00-260-to-CP00-261",
    from_pack_id: SEARCH_CORE_CP260_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP260_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP260_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP260_PACK_BINDING.range,
    open_scope: "RP07.P06 descriptor scope is closed; continue RP07.P07.M02.S13 onward with the remaining failure rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP260_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp261CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp261Validation({
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

export function validateSearchCoreCp261Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-261 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP261_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-261");
  if (planPack?.risk_class !== SEARCH_CORE_CP261_PACK_BINDING.risk_class) errors.push("CP00-261 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP261_PACK_BINDING.unit_count) errors.push("CP00-261 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP261_PACK_BINDING.first_unit_id) errors.push("CP00-261 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP261_PACK_BINDING.last_unit_id) errors.push("CP00-261 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-261 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-261 must only include RP07 units");
  const summary = createSearchCoreCp261CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-261 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-261 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-261 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-261 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-261 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-261 ${microId} missing row ${title}`);
    }
  }
  return freezeCp261Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp261FailureSliceDescriptor(
  descriptor = createSearchCoreCp261FailureSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_slice_case_set ?? createSearchCoreCp261FailureSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp261FailureSliceDescriptor") errors.push("CP00-261 descriptor type drift");
  if (descriptor.source_p06_closeout_p07_failure_foundation_descriptor !== "SearchCoreCp260P06CloseoutP07FailureFoundationDescriptor") {
    errors.push("CP00-261 source p06 closeout p07 failure foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-261 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-261 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-261 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-261 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-261 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-261 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-261 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP261_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-261 ${microId} must not allow cross-tenant access`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-261 ${microId} must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-261 ${microId} must not perform retry runtime`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-261 ${microId} must not perform rollback runtime`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-261 ${microId} must not expose blocked claims`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-261 ${microId} must not emit Hermes runtime receipts`);
    }
  }
  const m03 = sections["RP07.P07.M03"]?.rows ?? {};
  if (m03.claude_edge_case_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-261 must not claim Claude final approval");
  if (m03.human_escalation_note?.human_final_approval_required !== true) errors.push("CP00-261 human escalation note drift");
  if (m03.no_silent_success_check?.silent_success_detected !== false) errors.push("CP00-261 silent success detected");
  if (m03.no_data_leak_check?.leak_detected !== false) errors.push("CP00-261 data leak detected");
  if (SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.silent_success_detected !== false) errors.push("CP00-261 silent success attestation drift");
  if (SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-261 must not promote Claude");
  if (SEARCH_CORE_CP261_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-261 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-261 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-261 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP261_PACK_BINDING.pack_id,
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-261 contract current_pack drift");
  }
  if (
    contractProjection?.failure_slice_descriptor?.descriptor &&
    contractProjection.failure_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-261 contract failure_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP261_PACK_BINDING.next_pack_id) errors.push("CP00-261 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP261_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-261 next subphase drift");
  }
  return freezeCp261Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp261HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp261FailureSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp261Coverage(planPack);
  const slice = validateSearchCoreCp261FailureSliceDescriptor(descriptor, contractProjection);
  return freezeCp261Validation({
    evidence_packet: "H07.CP00-261.search_core_failure_slice_descriptor",
    gate: SEARCH_CORE_CP261_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    no_real_data: true,
    source_p06_closeout_p07_failure_foundation_pack_id: SEARCH_CORE_CP261_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP261_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP261_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP261_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp261ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp261Coverage(planPack);
  const slice = validateSearchCoreCp261FailureSliceDescriptor(createSearchCoreCp261FailureSliceDescriptor(), {});
  return freezeCp261Validation({
    review_packet: "C07.CP00-261.search_core_failure_slice_descriptor",
    gate: SEARCH_CORE_CP261_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP261_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP261_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-261 cover exactly the 40 planned RP07 units from RP07.P07.M02.S13 through RP07.P07.M04.S05?",
      "Do the three descriptor sections (M02 type/shape tail with Claude edge-case prompt and human escalation note, M03 primary failure cycle with no-silent-success and no-data-leak checks, M04 secondary failure head) cover every planned row title as descriptor-only rows, with the shared failure-row guards applied across every section that carries them?",
      "Does CP00-261 avoid lock acquisition, retry/rollback runtime, integration smoke dispatch, silent success, data leaks, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp261CloseoutHandoff() {
  return freezeCp261Validation({
    handoff_id: "CP00-261-to-CP00-262",
    from_pack_id: SEARCH_CORE_CP261_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP261_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP261_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP261_PACK_BINDING.range,
    open_scope: "Continue RP07.P07.M04.S06 onward with the remaining failure rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP261_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp262CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp262Validation({
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

export function validateSearchCoreCp262Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-262 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP262_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-262");
  if (planPack?.risk_class !== SEARCH_CORE_CP262_PACK_BINDING.risk_class) errors.push("CP00-262 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP262_PACK_BINDING.unit_count) errors.push("CP00-262 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP262_PACK_BINDING.first_unit_id) errors.push("CP00-262 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP262_PACK_BINDING.last_unit_id) errors.push("CP00-262 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-262 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-262 must only include RP07 units");
  const summary = createSearchCoreCp262CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-262 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-262 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-262 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-262 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-262 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-262 ${microId} missing row ${title}`);
    }
  }
  return freezeCp262Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp262FailureBindingSliceDescriptor(
  descriptor = createSearchCoreCp262FailureBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_binding_slice_case_set ?? createSearchCoreCp262FailureBindingSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp262FailureBindingSliceDescriptor") errors.push("CP00-262 descriptor type drift");
  if (descriptor.source_failure_slice_descriptor !== "SearchCoreCp261FailureSliceDescriptor") {
    errors.push("CP00-262 source failure slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-262 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-262 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-262 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-262 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-262 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-262 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-262 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP262_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-262 ${microId} must not allow cross-tenant access`);
    }
    if (rows.permission_denied_failure && rows.permission_denied_failure.permission_decision_detail_included !== false) {
      errors.push(`CP00-262 ${microId} must not expose permission decisions`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-262 ${microId} must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-262 ${microId} must not perform retry runtime`);
    }
    if (rows.rollback_expectation && rows.rollback_expectation.performs_rollback_runtime !== false) {
      errors.push(`CP00-262 ${microId} must not perform rollback runtime`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-262 ${microId} must not expose blocked claims`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-262 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.failure_fixture && rows.failure_fixture.real_client_data_loaded !== false) {
      errors.push(`CP00-262 ${microId} must not load real data`);
    }
  }
  const m04 = sections["RP07.P07.M04"]?.rows ?? {};
  if (m04.claude_edge_case_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-262 must not claim Claude final approval");
  if (m04.human_escalation_note?.human_final_approval_required !== true) errors.push("CP00-262 human escalation note drift");
  if (m04.no_silent_success_check?.silent_success_detected !== false) errors.push("CP00-262 silent success detected");
  if (m04.no_data_leak_check?.leak_detected !== false) errors.push("CP00-262 data leak detected");
  if (SEARCH_CORE_CP262_NO_WRITE_ATTESTATION.silent_success_detected !== false) errors.push("CP00-262 silent success attestation drift");
  if (SEARCH_CORE_CP262_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-262 must not promote Claude");
  if (SEARCH_CORE_CP262_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-262 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-262 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-262 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP262_PACK_BINDING.pack_id,
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-262 contract current_pack drift");
  }
  if (
    contractProjection?.failure_binding_slice_descriptor?.descriptor &&
    contractProjection.failure_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-262 contract failure_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP262_PACK_BINDING.next_pack_id) errors.push("CP00-262 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP262_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-262 next subphase drift");
  }
  return freezeCp262Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp262HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp262FailureBindingSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp262Coverage(planPack);
  const slice = validateSearchCoreCp262FailureBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp262Validation({
    evidence_packet: "H07.CP00-262.search_core_failure_binding_slice_descriptor",
    gate: SEARCH_CORE_CP262_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_failure_slice_pack_id: SEARCH_CORE_CP262_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP262_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP262_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP262_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp262ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp262Coverage(planPack);
  const slice = validateSearchCoreCp262FailureBindingSliceDescriptor(createSearchCoreCp262FailureBindingSliceDescriptor(), {});
  return freezeCp262Validation({
    review_packet: "C07.CP00-262.search_core_failure_binding_slice_descriptor",
    gate: SEARCH_CORE_CP262_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP262_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_binding_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP262_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-262 cover exactly the 40 planned RP07 units from RP07.P07.M04.S06 through RP07.P07.M05.S20?",
      "Do the two descriptor sections (M04 secondary failure tail with no-silent-success and no-data-leak checks, M05 permission/audit failure binding cycle) cover every planned row title as descriptor-only rows, with the shared failure-row guards applied across every section that carries them?",
      "Does CP00-262 avoid lock acquisition, retry/rollback runtime, integration smoke dispatch, silent success, data leaks, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp262CloseoutHandoff() {
  return freezeCp262Validation({
    handoff_id: "CP00-262-to-CP00-263",
    from_pack_id: SEARCH_CORE_CP262_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP262_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP262_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP262_PACK_BINDING.range,
    open_scope: "Continue RP07.P07.M05.S21 onward with the remaining failure binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP262_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp263CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp263Validation({
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

export function validateSearchCoreCp263Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-263 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP263_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-263");
  if (planPack?.risk_class !== SEARCH_CORE_CP263_PACK_BINDING.risk_class) errors.push("CP00-263 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP263_PACK_BINDING.unit_count) errors.push("CP00-263 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP263_PACK_BINDING.first_unit_id) errors.push("CP00-263 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP263_PACK_BINDING.last_unit_id) errors.push("CP00-263 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-263 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-263 must only include RP07 units");
  const summary = createSearchCoreCp263CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-263 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-263 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-263 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-263 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-263 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-263 ${microId} missing row ${title}`);
    }
  }
  return freezeCp263Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp263FailureBindingTailDescriptor(
  descriptor = createSearchCoreCp263FailureBindingTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.failure_binding_tail_case_set ?? createSearchCoreCp263FailureBindingTailCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp263FailureBindingTailDescriptor") errors.push("CP00-263 descriptor type drift");
  if (descriptor.source_failure_binding_slice_descriptor !== "SearchCoreCp262FailureBindingSliceDescriptor") {
    errors.push("CP00-263 source failure binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP263_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-263 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-263 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-263 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-263 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-263 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-263 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-263 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P07.M05"]?.rows ?? {};
  if (m05.claude_edge_case_prompt?.claude_final_approval_claimed !== false) errors.push("CP00-263 must not claim Claude final approval");
  if (m05.human_escalation_note?.human_final_approval_required !== true) errors.push("CP00-263 human escalation note drift");
  if (m05.no_silent_success_check?.silent_success_detected !== false) errors.push("CP00-263 silent success detected");
  if (m05.no_data_leak_check?.leak_detected !== false) errors.push("CP00-263 data leak detected");
  const m06 = sections["RP07.P07.M06"]?.rows ?? {};
  if (m06.missing_tenant_failure?.expected_outcome !== "rejected_customer_safe") errors.push("CP00-263 missing tenant failure drift");
  if (m06.failure_taxonomy?.validation_error_detail_included !== false) errors.push("CP00-263 must not expose validation error detail");
  if (SEARCH_CORE_CP263_NO_WRITE_ATTESTATION.silent_success_detected !== false) errors.push("CP00-263 silent success attestation drift");
  if (SEARCH_CORE_CP263_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-263 must not promote Claude");
  if (SEARCH_CORE_CP263_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-263 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-263 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-263 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP263_PACK_BINDING.pack_id,
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-263 contract current_pack drift");
  }
  if (
    contractProjection?.failure_binding_tail_descriptor?.descriptor &&
    contractProjection.failure_binding_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-263 contract failure_binding_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP263_PACK_BINDING.next_pack_id) errors.push("CP00-263 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP263_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-263 next subphase drift");
  }
  return freezeCp263Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp263HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp263FailureBindingTailDescriptor(),
) {
  const coverage = validateSearchCoreCp263Coverage(planPack);
  const tail = validateSearchCoreCp263FailureBindingTailDescriptor(descriptor, contractProjection);
  return freezeCp263Validation({
    evidence_packet: "H07.CP00-263.search_core_failure_binding_tail_descriptor",
    gate: SEARCH_CORE_CP263_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    failure_binding_tail_valid: tail.valid,
    no_real_data: true,
    source_failure_binding_slice_pack_id: SEARCH_CORE_CP263_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP263_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP263_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP263_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createSearchCoreCp263ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp263Coverage(planPack);
  const tail = validateSearchCoreCp263FailureBindingTailDescriptor(createSearchCoreCp263FailureBindingTailDescriptor(), {});
  return freezeCp263Validation({
    review_packet: "C07.CP00-263.search_core_failure_binding_tail_descriptor",
    gate: SEARCH_CORE_CP263_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP263_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    failure_binding_tail_valid: tail.valid,
    invalid_review_blockers: SEARCH_CORE_CP263_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-263 cover exactly the 10 planned RP07 units from RP07.P07.M05.S21 through RP07.P07.M06.S05?",
      "Do the two descriptor sections (M05 permission/audit binding tail with Claude edge-case prompt, human escalation note, closeout handoff, no-silent-success and no-data-leak checks; M06 synthetic fixture head) cover every planned row title as descriptor-only rows?",
      "Does CP00-263 avoid silent success, data leaks, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, command runtime execution, Hermes runtime receipts, raw payloads, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp263CloseoutHandoff() {
  return freezeCp263Validation({
    handoff_id: "CP00-263-to-CP00-264",
    from_pack_id: SEARCH_CORE_CP263_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP263_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP263_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP263_PACK_BINDING.range,
    open_scope: "Continue RP07.P07.M06.S06 onward with the remaining failure fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP263_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp264CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp264Validation({
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

export function validateSearchCoreCp264Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-264 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP264_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-264");
  if (planPack?.risk_class !== SEARCH_CORE_CP264_PACK_BINDING.risk_class) errors.push("CP00-264 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP264_PACK_BINDING.unit_count) errors.push("CP00-264 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP264_PACK_BINDING.first_unit_id) errors.push("CP00-264 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP264_PACK_BINDING.last_unit_id) errors.push("CP00-264 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-264 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-264 must only include RP07 units");
  const summary = createSearchCoreCp264CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-264 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-264 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-264 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-264 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-264 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-264 ${microId} missing row ${title}`);
    }
  }
  return freezeCp264Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(
  descriptor = createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p07_closeout_p08_hermes_foundation_case_set ?? createSearchCoreCp264P07CloseoutP08HermesFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp264P07CloseoutP08HermesFoundationDescriptor") errors.push("CP00-264 descriptor type drift");
  if (descriptor.source_failure_binding_tail_descriptor !== "SearchCoreCp263FailureBindingTailDescriptor") {
    errors.push("CP00-264 source failure binding tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows).length) errors.push("CP00-264 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-264 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-264 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-264 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-264 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-264 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-264 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-264 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP264_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.cross_tenant_failure && rows.cross_tenant_failure.cross_tenant_access_allowed !== false) {
      errors.push(`CP00-264 ${microId} must not allow cross-tenant access`);
    }
    if (rows.lock_conflict_failure && rows.lock_conflict_failure.acquires_runtime_lock !== false) {
      errors.push(`CP00-264 ${microId} must not acquire locks`);
    }
    if (rows.retry_exhaustion_failure && rows.retry_exhaustion_failure.performs_retry_runtime !== false) {
      errors.push(`CP00-264 ${microId} must not perform retry runtime`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-264 ${microId} must not expose blocked claims`);
    }
    if (rows.hermes_failure_evidence && rows.hermes_failure_evidence.emits_hermes_runtime_receipt !== false) {
      errors.push(`CP00-264 ${microId} must not emit Hermes runtime receipts`);
    }
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-264 ${microId} must not execute command runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-264 ${microId} must not expose permission decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_event_body_included !== false) {
      errors.push(`CP00-264 ${microId} must not expose audit bodies`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-264 ${microId} must not load real data`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-264 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_final_approval_required !== true) {
      errors.push(`CP00-264 ${microId} human approval marker drift`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-264 ${microId} validation command check must not execute runtime`);
    }
  }
  if (SEARCH_CORE_CP264_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-264 must not promote Claude");
  if (SEARCH_CORE_CP264_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-264 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-264 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-264 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP264_PACK_BINDING.pack_id,
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-264 contract current_pack drift");
  }
  if (
    contractProjection?.p07_closeout_p08_hermes_foundation_descriptor?.descriptor &&
    contractProjection.p07_closeout_p08_hermes_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-264 contract p07_closeout_p08_hermes_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP264_PACK_BINDING.next_pack_id) errors.push("CP00-264 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP264_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-264 next subphase drift");
  }
  return freezeCp264Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp264HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp264Coverage(planPack);
  const foundation = validateSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(descriptor, contractProjection);
  return freezeCp264Validation({
    evidence_packet: "H07.CP00-264.search_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: SEARCH_CORE_CP264_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    no_real_data: true,
    source_failure_binding_tail_pack_id: SEARCH_CORE_CP264_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP264_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP264_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP264_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp264ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp264Coverage(planPack);
  const foundation = validateSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(createSearchCoreCp264P07CloseoutP08HermesFoundationDescriptor(), {});
  return freezeCp264Validation({
    review_packet: "C07.CP00-264.search_core_p07_closeout_p08_hermes_foundation_descriptor",
    gate: SEARCH_CORE_CP264_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP264_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p07_closeout_p08_hermes_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP264_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-264 cover exactly the 150 planned RP07 units from RP07.P07.M06.S06 through RP07.P08.M02.S14?",
      "Do the eight descriptor sections (five P07 failure micros and three P08 Hermes evidence micros) cover every planned row title as descriptor-only rows, including Hermes command matrices, evidence field lists, changed-file/command-result/fixture-summary/blocked-claim/permission-summary/audit-summary/no-real-data receipts, Claude dependency and human approval markers, PASS/PASS_WITH_FINDINGS/BLOCK semantics, evidence templates, validation command checks, harness boundary notes, regression receipts, and next gate readiness?",
      "Does CP00-264 avoid command runtime execution, Hermes runtime receipts, lock acquisition, retry/rollback runtime, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, permission decision details, audit bodies, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp264CloseoutHandoff() {
  return freezeCp264Validation({
    handoff_id: "CP00-264-to-CP00-265",
    from_pack_id: SEARCH_CORE_CP264_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP264_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP264_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP264_PACK_BINDING.range,
    open_scope: "RP07.P07 descriptor scope is closed; continue RP07.P08.M02.S15 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP264_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp265CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp265Validation({
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

export function validateSearchCoreCp265Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-265 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP265_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-265");
  if (planPack?.risk_class !== SEARCH_CORE_CP265_PACK_BINDING.risk_class) errors.push("CP00-265 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP265_PACK_BINDING.unit_count) errors.push("CP00-265 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP265_PACK_BINDING.first_unit_id) errors.push("CP00-265 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP265_PACK_BINDING.last_unit_id) errors.push("CP00-265 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-265 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-265 must only include RP07 units");
  const summary = createSearchCoreCp265CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-265 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-265 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-265 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-265 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-265 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-265 ${microId} missing row ${title}`);
    }
  }
  return freezeCp265Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp265HermesSliceDescriptor(
  descriptor = createSearchCoreCp265HermesSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.hermes_slice_case_set ?? createSearchCoreCp265HermesSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp265HermesSliceDescriptor") errors.push("CP00-265 descriptor type drift");
  if (descriptor.source_p07_closeout_p08_hermes_foundation_descriptor !== "SearchCoreCp264P07CloseoutP08HermesFoundationDescriptor") {
    errors.push("CP00-265 source p07 closeout p08 hermes foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-265 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-265 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-265 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-265 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-265 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-265 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-265 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP265_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-265 ${microId} must not execute command runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-265 ${microId} must not expose permission decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_event_body_included !== false) {
      errors.push(`CP00-265 ${microId} must not expose audit bodies`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-265 ${microId} must not expose blocked claims`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-265 ${microId} must not load real data`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-265 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_final_approval_required !== true) {
      errors.push(`CP00-265 ${microId} human approval marker drift`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-265 ${microId} validation command check must not execute runtime`);
    }
  }
  const m03 = sections["RP07.P08.M03"]?.rows ?? {};
  if (m03.documentation_update?.documentation_descriptor_only !== true) errors.push("CP00-265 documentation update drift");
  if (m03.operator_summary?.operator_summary_descriptor_only !== true) errors.push("CP00-265 operator summary drift");
  if (SEARCH_CORE_CP265_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-265 must not promote Claude");
  if (SEARCH_CORE_CP265_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-265 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-265 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-265 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP265_PACK_BINDING.pack_id,
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-265 contract current_pack drift");
  }
  if (
    contractProjection?.hermes_slice_descriptor?.descriptor &&
    contractProjection.hermes_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-265 contract hermes_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP265_PACK_BINDING.next_pack_id) errors.push("CP00-265 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP265_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-265 next subphase drift");
  }
  return freezeCp265Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp265HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp265HermesSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp265Coverage(planPack);
  const slice = validateSearchCoreCp265HermesSliceDescriptor(descriptor, contractProjection);
  return freezeCp265Validation({
    evidence_packet: "H07.CP00-265.search_core_hermes_slice_descriptor",
    gate: SEARCH_CORE_CP265_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    hermes_slice_valid: slice.valid,
    no_real_data: true,
    source_p07_closeout_p08_hermes_foundation_pack_id: SEARCH_CORE_CP265_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP265_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP265_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP265_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp265ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp265Coverage(planPack);
  const slice = validateSearchCoreCp265HermesSliceDescriptor(createSearchCoreCp265HermesSliceDescriptor(), {});
  return freezeCp265Validation({
    review_packet: "C07.CP00-265.search_core_hermes_slice_descriptor",
    gate: SEARCH_CORE_CP265_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP265_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    hermes_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP265_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-265 cover exactly the 40 planned RP07 units from RP07.P08.M02.S15 through RP07.P08.M04.S12?",
      "Do the three descriptor sections (M02 type/shape tail, M03 primary Hermes cycle with documentation update and operator summary rows, M04 secondary workflow head) cover every planned row title as descriptor-only rows, with the shared Hermes receipt guards applied across every section that carries them?",
      "Does CP00-265 avoid command runtime execution, Hermes runtime receipts, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, permission decision details, audit bodies, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp265CloseoutHandoff() {
  return freezeCp265Validation({
    handoff_id: "CP00-265-to-CP00-266",
    from_pack_id: SEARCH_CORE_CP265_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP265_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP265_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP265_PACK_BINDING.range,
    open_scope: "Continue RP07.P08.M04.S13 onward with the remaining Hermes evidence rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP265_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp266CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp266Validation({
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

export function validateSearchCoreCp266Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-266 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP266_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-266");
  if (planPack?.risk_class !== SEARCH_CORE_CP266_PACK_BINDING.risk_class) errors.push("CP00-266 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP266_PACK_BINDING.unit_count) errors.push("CP00-266 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP266_PACK_BINDING.first_unit_id) errors.push("CP00-266 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP266_PACK_BINDING.last_unit_id) errors.push("CP00-266 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-266 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-266 must only include RP07 units");
  const summary = createSearchCoreCp266CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-266 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-266 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-266 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-266 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-266 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-266 ${microId} missing row ${title}`);
    }
  }
  return freezeCp266Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp266HermesBindingSliceDescriptor(
  descriptor = createSearchCoreCp266HermesBindingSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.hermes_binding_slice_case_set ?? createSearchCoreCp266HermesBindingSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp266HermesBindingSliceDescriptor") errors.push("CP00-266 descriptor type drift");
  if (descriptor.source_hermes_slice_descriptor !== "SearchCoreCp265HermesSliceDescriptor") {
    errors.push("CP00-266 source hermes slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-266 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-266 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-266 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-266 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-266 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-266 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-266 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP266_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-266 ${microId} must not execute command runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-266 ${microId} must not expose permission decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_event_body_included !== false) {
      errors.push(`CP00-266 ${microId} must not expose audit bodies`);
    }
    if (rows.blocked_claim_receipt && rows.blocked_claim_receipt.blocked_claim_detail_included !== false) {
      errors.push(`CP00-266 ${microId} must not expose blocked claims`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-266 ${microId} must not load real data`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-266 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_final_approval_required !== true) {
      errors.push(`CP00-266 ${microId} human approval marker drift`);
    }
    if (rows.validation_command_check && rows.validation_command_check.executes_command_runtime !== false) {
      errors.push(`CP00-266 ${microId} validation command check must not execute runtime`);
    }
  }
  const m04 = sections["RP07.P08.M04"]?.rows ?? {};
  if (m04.documentation_update?.documentation_descriptor_only !== true) errors.push("CP00-266 documentation update drift");
  if (m04.operator_summary?.operator_summary_descriptor_only !== true) errors.push("CP00-266 operator summary drift");
  if (SEARCH_CORE_CP266_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-266 must not promote Claude");
  if (SEARCH_CORE_CP266_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-266 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-266 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-266 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP266_PACK_BINDING.pack_id,
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-266 contract current_pack drift");
  }
  if (
    contractProjection?.hermes_binding_slice_descriptor?.descriptor &&
    contractProjection.hermes_binding_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-266 contract hermes_binding_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP266_PACK_BINDING.next_pack_id) errors.push("CP00-266 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP266_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-266 next subphase drift");
  }
  return freezeCp266Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp266HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp266HermesBindingSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp266Coverage(planPack);
  const slice = validateSearchCoreCp266HermesBindingSliceDescriptor(descriptor, contractProjection);
  return freezeCp266Validation({
    evidence_packet: "H07.CP00-266.search_core_hermes_binding_slice_descriptor",
    gate: SEARCH_CORE_CP266_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    hermes_binding_slice_valid: slice.valid,
    no_real_data: true,
    source_hermes_slice_pack_id: SEARCH_CORE_CP266_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP266_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP266_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP266_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp266ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp266Coverage(planPack);
  const slice = validateSearchCoreCp266HermesBindingSliceDescriptor(createSearchCoreCp266HermesBindingSliceDescriptor(), {});
  return freezeCp266Validation({
    review_packet: "C07.CP00-266.search_core_hermes_binding_slice_descriptor",
    gate: SEARCH_CORE_CP266_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP266_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    hermes_binding_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP266_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-266 cover exactly the 40 planned RP07 units from RP07.P08.M04.S13 through RP07.P08.M06.S08?",
      "Do the three descriptor sections (M04 secondary workflow tail, M05 permission/audit Hermes binding cycle, M06 synthetic fixture head) cover every planned row title as descriptor-only rows, with the shared Hermes receipt guards applied across every section that carries them?",
      "Does CP00-266 avoid command runtime execution, Hermes runtime receipts, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, permission decision details, audit bodies, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp266CloseoutHandoff() {
  return freezeCp266Validation({
    handoff_id: "CP00-266-to-CP00-267",
    from_pack_id: SEARCH_CORE_CP266_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP266_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP266_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP266_PACK_BINDING.range,
    open_scope: "Continue RP07.P08.M06.S09 onward with the remaining Hermes fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP266_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp267CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp267Validation({
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

export function validateSearchCoreCp267Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-267 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP267_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-267");
  if (planPack?.risk_class !== SEARCH_CORE_CP267_PACK_BINDING.risk_class) errors.push("CP00-267 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP267_PACK_BINDING.unit_count) errors.push("CP00-267 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP267_PACK_BINDING.first_unit_id) errors.push("CP00-267 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP267_PACK_BINDING.last_unit_id) errors.push("CP00-267 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-267 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-267 must only include RP07 units");
  const summary = createSearchCoreCp267CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-267 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-267 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-267 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-267 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-267 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-267 ${microId} missing row ${title}`);
    }
  }
  return freezeCp267Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(
  descriptor = createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p08_closeout_p09_review_foundation_case_set ?? createSearchCoreCp267P08CloseoutP09ReviewFoundationCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor") errors.push("CP00-267 descriptor type drift");
  if (descriptor.source_hermes_binding_slice_descriptor !== "SearchCoreCp266HermesBindingSliceDescriptor") {
    errors.push("CP00-267 source hermes binding slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows).length) errors.push("CP00-267 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-267 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-267 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-267 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-267 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-267 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-267 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-267 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP267_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.hermes_command_matrix && rows.hermes_command_matrix.executes_command_runtime !== false) {
      errors.push(`CP00-267 ${microId} must not execute command runtime`);
    }
    if (rows.permission_summary_receipt && rows.permission_summary_receipt.permission_decision_detail_included !== false) {
      errors.push(`CP00-267 ${microId} must not expose permission decisions`);
    }
    if (rows.audit_summary_receipt && rows.audit_summary_receipt.audit_event_body_included !== false) {
      errors.push(`CP00-267 ${microId} must not expose audit bodies`);
    }
    if (rows.no_real_data_receipt && rows.no_real_data_receipt.real_client_data_loaded !== false) {
      errors.push(`CP00-267 ${microId} must not load real data`);
    }
    if (rows.claude_dependency_marker && rows.claude_dependency_marker.claude_final_approval_claimed !== false) {
      errors.push(`CP00-267 ${microId} must not claim Claude final approval`);
    }
    if (rows.human_approval_marker && rows.human_approval_marker.human_final_approval_required !== true) {
      errors.push(`CP00-267 ${microId} human approval marker drift`);
    }
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-267 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-267 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-267 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-267 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-267 ${microId} human approval summary drift`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-267 ${microId} command rerun must not execute runtime`);
    }
  }
  if (SEARCH_CORE_CP267_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-267 must not promote Claude");
  if (SEARCH_CORE_CP267_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-267 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-267 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-267 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP267_PACK_BINDING.pack_id,
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-267 contract current_pack drift");
  }
  if (
    contractProjection?.p08_closeout_p09_review_foundation_descriptor?.descriptor &&
    contractProjection.p08_closeout_p09_review_foundation_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-267 contract p08_closeout_p09_review_foundation_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP267_PACK_BINDING.next_pack_id) errors.push("CP00-267 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP267_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-267 next subphase drift");
  }
  return freezeCp267Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp267HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(),
) {
  const coverage = validateSearchCoreCp267Coverage(planPack);
  const foundation = validateSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(descriptor, contractProjection);
  return freezeCp267Validation({
    evidence_packet: "H07.CP00-267.search_core_p08_closeout_p09_review_foundation_descriptor",
    gate: SEARCH_CORE_CP267_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    no_real_data: true,
    source_hermes_binding_slice_pack_id: SEARCH_CORE_CP267_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP267_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP267_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP267_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createSearchCoreCp267ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp267Coverage(planPack);
  const foundation = validateSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(createSearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor(), {});
  return freezeCp267Validation({
    review_packet: "C07.CP00-267.search_core_p08_closeout_p09_review_foundation_descriptor",
    gate: SEARCH_CORE_CP267_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP267_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p08_closeout_p09_review_foundation_valid: foundation.valid,
    invalid_review_blockers: SEARCH_CORE_CP267_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-267 cover exactly the 150 planned RP07 units from RP07.P08.M06.S09 through RP07.P09.M03.S10?",
      "Do the nine descriptor sections (five P08 Hermes micros and four P09 review micros) cover every planned row title as descriptor-only rows, including architecture/security/permission-bypass/audit-completeness/missing-test/UI-leak/downstream-readiness review questions, risk registers, severity taxonomies, go/no-go verdict formats, finding routing maps, human approval summaries, Claude review packets, closeout criteria, PASS/PASS_WITH_FINDINGS/BLOCK closeout notes, next RP dependencies, documentation updates, and command reruns?",
      "Does CP00-267 avoid command runtime execution, Hermes runtime receipts, permission bypass, UI leaks, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, permission decision details, audit bodies, blocked claim details, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp267CloseoutHandoff() {
  return freezeCp267Validation({
    handoff_id: "CP00-267-to-CP00-268",
    from_pack_id: SEARCH_CORE_CP267_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP267_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP267_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP267_PACK_BINDING.range,
    open_scope: "RP07.P08 descriptor scope is closed; continue RP07.P09.M03.S11 onward with the remaining review rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP267_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp268CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp268Validation({
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

export function validateSearchCoreCp268Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-268 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP268_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-268");
  if (planPack?.risk_class !== SEARCH_CORE_CP268_PACK_BINDING.risk_class) errors.push("CP00-268 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP268_PACK_BINDING.unit_count) errors.push("CP00-268 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP268_PACK_BINDING.first_unit_id) errors.push("CP00-268 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP268_PACK_BINDING.last_unit_id) errors.push("CP00-268 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-268 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-268 must only include RP07 units");
  const summary = createSearchCoreCp268CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-268 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-268 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-268 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-268 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-268 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-268 ${microId} missing row ${title}`);
    }
  }
  return freezeCp268Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp268ReviewSliceDescriptor(
  descriptor = createSearchCoreCp268ReviewSliceDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_slice_case_set ?? createSearchCoreCp268ReviewSliceCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp268ReviewSliceDescriptor") errors.push("CP00-268 descriptor type drift");
  if (descriptor.source_p08_closeout_p09_review_foundation_descriptor !== "SearchCoreCp267P08CloseoutP09ReviewFoundationDescriptor") {
    errors.push("CP00-268 source p08 closeout p09 review foundation descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-268 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-268 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-268 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-268 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-268 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-268 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-268 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP268_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-268 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-268 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-268 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-268 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-268 ${microId} human approval summary drift`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-268 ${microId} command rerun must not execute runtime`);
    }
  }
  const m03 = sections["RP07.P09.M03"]?.rows ?? {};
  if (m03.review_receipt_placeholder?.review_receipt_placeholder_descriptor_only !== true) errors.push("CP00-268 review receipt placeholder drift");
  if (m03.future_correction_slot?.future_correction_slot_descriptor_only !== true) errors.push("CP00-268 future correction slot drift");
  if (SEARCH_CORE_CP268_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-268 must not promote Claude");
  if (SEARCH_CORE_CP268_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-268 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-268 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-268 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      SEARCH_CORE_CP268_PACK_BINDING.pack_id,
      SEARCH_CORE_CP269_PACK_BINDING.pack_id,
      SEARCH_CORE_CP270_PACK_BINDING.pack_id,
      SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-268 contract current_pack drift");
  }
  if (
    contractProjection?.review_slice_descriptor?.descriptor &&
    contractProjection.review_slice_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-268 contract review_slice_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP268_PACK_BINDING.next_pack_id) errors.push("CP00-268 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP268_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-268 next subphase drift");
  }
  return freezeCp268Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp268HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp268ReviewSliceDescriptor(),
) {
  const coverage = validateSearchCoreCp268Coverage(planPack);
  const slice = validateSearchCoreCp268ReviewSliceDescriptor(descriptor, contractProjection);
  return freezeCp268Validation({
    evidence_packet: "H07.CP00-268.search_core_review_slice_descriptor",
    gate: SEARCH_CORE_CP268_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_slice_valid: slice.valid,
    no_real_data: true,
    source_p08_closeout_p09_review_foundation_pack_id: SEARCH_CORE_CP268_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP268_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP268_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP268_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && slice.valid,
  });
}

export function createSearchCoreCp268ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp268Coverage(planPack);
  const slice = validateSearchCoreCp268ReviewSliceDescriptor(createSearchCoreCp268ReviewSliceDescriptor(), {});
  return freezeCp268Validation({
    review_packet: "C07.CP00-268.search_core_review_slice_descriptor",
    gate: SEARCH_CORE_CP268_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP268_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_slice_valid: slice.valid,
    invalid_review_blockers: SEARCH_CORE_CP268_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-268 cover exactly the 40 planned RP07 units from RP07.P09.M03.S11 through RP07.P09.M05.S08?",
      "Do the three descriptor sections (M03 primary review tail with review receipt placeholder and future correction slot, M04 secondary review cycle, M05 permission/audit review head) cover every planned row title as descriptor-only rows, with the shared review guards applied across every section that carries them?",
      "Does CP00-268 avoid permission bypass, UI leaks, command runtime execution, Hermes runtime receipts, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp268CloseoutHandoff() {
  return freezeCp268Validation({
    handoff_id: "CP00-268-to-CP00-269",
    from_pack_id: SEARCH_CORE_CP268_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP268_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP268_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP268_PACK_BINDING.range,
    open_scope: "Continue RP07.P09.M05.S09 onward with the remaining review binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP268_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp269CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp269Validation({
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

export function validateSearchCoreCp269Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-269 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP269_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-269");
  if (planPack?.risk_class !== SEARCH_CORE_CP269_PACK_BINDING.risk_class) errors.push("CP00-269 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP269_PACK_BINDING.unit_count) errors.push("CP00-269 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP269_PACK_BINDING.first_unit_id) errors.push("CP00-269 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP269_PACK_BINDING.last_unit_id) errors.push("CP00-269 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-269 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-269 must only include RP07 units");
  const summary = createSearchCoreCp269CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-269 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-269 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-269 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-269 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-269 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-269 ${microId} missing row ${title}`);
    }
  }
  return freezeCp269Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp269ReviewBindingMidDescriptor(
  descriptor = createSearchCoreCp269ReviewBindingMidDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_binding_mid_case_set ?? createSearchCoreCp269ReviewBindingMidCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp269ReviewBindingMidDescriptor") errors.push("CP00-269 descriptor type drift");
  if (descriptor.source_review_slice_descriptor !== "SearchCoreCp268ReviewSliceDescriptor") {
    errors.push("CP00-269 source review slice descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP269_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-269 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-269 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-269 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-269 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-269 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-269 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-269 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P09.M05"]?.rows ?? {};
  if (m05.go_no_go_verdict_format?.claude_final_approval_claimed !== false) errors.push("CP00-269 go/no-go must not claim Claude final approval");
  if (m05.claude_review_packet?.claude_final_approval_claimed !== false) errors.push("CP00-269 review packet must not claim Claude final approval");
  if (m05.human_approval_summary?.human_final_approval_required !== true) errors.push("CP00-269 human approval summary drift");
  if (SEARCH_CORE_CP269_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-269 must not promote Claude");
  if (SEARCH_CORE_CP269_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-269 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-269 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-269 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SEARCH_CORE_CP269_PACK_BINDING.pack_id, SEARCH_CORE_CP270_PACK_BINDING.pack_id, SEARCH_CORE_CP271_PACK_BINDING.pack_id].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-269 contract current_pack drift");
  }
  if (
    contractProjection?.review_binding_mid_descriptor?.descriptor &&
    contractProjection.review_binding_mid_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-269 contract review_binding_mid_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP269_PACK_BINDING.next_pack_id) errors.push("CP00-269 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP269_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-269 next subphase drift");
  }
  return freezeCp269Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp269HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp269ReviewBindingMidDescriptor(),
) {
  const coverage = validateSearchCoreCp269Coverage(planPack);
  const mid = validateSearchCoreCp269ReviewBindingMidDescriptor(descriptor, contractProjection);
  return freezeCp269Validation({
    evidence_packet: "H07.CP00-269.search_core_review_binding_mid_descriptor",
    gate: SEARCH_CORE_CP269_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_binding_mid_valid: mid.valid,
    no_real_data: true,
    source_review_slice_pack_id: SEARCH_CORE_CP269_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP269_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP269_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP269_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && mid.valid,
  });
}

export function createSearchCoreCp269ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp269Coverage(planPack);
  const mid = validateSearchCoreCp269ReviewBindingMidDescriptor(createSearchCoreCp269ReviewBindingMidDescriptor(), {});
  return freezeCp269Validation({
    review_packet: "C07.CP00-269.search_core_review_binding_mid_descriptor",
    gate: SEARCH_CORE_CP269_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP269_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_binding_mid_valid: mid.valid,
    invalid_review_blockers: SEARCH_CORE_CP269_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-269 cover exactly the 10 planned RP07 units from RP07.P09.M05.S09 through RP07.P09.M05.S18?",
      "Does the M05 permission/audit review binding middle section cover every planned row title as descriptor-only rows, including severity taxonomy, go/no-go verdict format, finding routing map, human approval summary, Claude review packet, closeout criteria, PASS/PASS_WITH_FINDINGS/BLOCK closeout notes, and next RP dependency?",
      "Does CP00-269 avoid command runtime execution, Hermes runtime receipts, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp269CloseoutHandoff() {
  return freezeCp269Validation({
    handoff_id: "CP00-269-to-CP00-270",
    from_pack_id: SEARCH_CORE_CP269_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP269_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP269_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP269_PACK_BINDING.range,
    open_scope: "Continue RP07.P09.M05.S19 onward with the remaining review binding rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP269_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp270CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp270Validation({
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

export function validateSearchCoreCp270Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-270 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP270_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-270");
  if (planPack?.risk_class !== SEARCH_CORE_CP270_PACK_BINDING.risk_class) errors.push("CP00-270 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP270_PACK_BINDING.unit_count) errors.push("CP00-270 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP270_PACK_BINDING.first_unit_id) errors.push("CP00-270 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP270_PACK_BINDING.last_unit_id) errors.push("CP00-270 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-270 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-270 must only include RP07 units");
  const summary = createSearchCoreCp270CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-270 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-270 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-270 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-270 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-270 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-270 ${microId} missing row ${title}`);
    }
  }
  return freezeCp270Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp270ReviewBindingTailDescriptor(
  descriptor = createSearchCoreCp270ReviewBindingTailDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.review_binding_tail_case_set ?? createSearchCoreCp270ReviewBindingTailCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp270ReviewBindingTailDescriptor") errors.push("CP00-270 descriptor type drift");
  if (descriptor.source_review_binding_mid_descriptor !== "SearchCoreCp269ReviewBindingMidDescriptor") {
    errors.push("CP00-270 source review binding mid descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP270_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-270 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-270 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-270 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-270 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-270 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-270 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-270 ${microId} ${key} must not include raw payload`);
    }
  }
  const m05 = sections["RP07.P09.M05"]?.rows ?? {};
  if (m05.command_rerun?.executes_command_runtime !== false) errors.push("CP00-270 command rerun must not execute runtime");
  if (m05.review_receipt_placeholder?.review_receipt_placeholder_descriptor_only !== true) errors.push("CP00-270 review receipt placeholder drift");
  if (m05.future_correction_slot?.future_correction_slot_descriptor_only !== true) errors.push("CP00-270 future correction slot drift");
  const m06 = sections["RP07.P09.M06"]?.rows ?? {};
  if (m06.permission_bypass_questions?.permission_bypass_detected !== false) errors.push("CP00-270 permission bypass detected");
  if (m06.ui_leak_questions?.leak_detected !== false) errors.push("CP00-270 UI leak detected");
  if (SEARCH_CORE_CP270_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-270 must not promote Claude");
  if (SEARCH_CORE_CP270_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-270 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-270 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-270 local validation trust boundary drift");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![SEARCH_CORE_CP270_PACK_BINDING.pack_id, SEARCH_CORE_CP271_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-270 contract current_pack drift");
  }
  if (
    contractProjection?.review_binding_tail_descriptor?.descriptor &&
    contractProjection.review_binding_tail_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-270 contract review_binding_tail_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP270_PACK_BINDING.next_pack_id) errors.push("CP00-270 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP270_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-270 next subphase drift");
  }
  return freezeCp270Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp270HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp270ReviewBindingTailDescriptor(),
) {
  const coverage = validateSearchCoreCp270Coverage(planPack);
  const tail = validateSearchCoreCp270ReviewBindingTailDescriptor(descriptor, contractProjection);
  return freezeCp270Validation({
    evidence_packet: "H07.CP00-270.search_core_review_binding_tail_descriptor",
    gate: SEARCH_CORE_CP270_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    review_binding_tail_valid: tail.valid,
    no_real_data: true,
    source_review_binding_mid_pack_id: SEARCH_CORE_CP270_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP270_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP270_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP270_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && tail.valid,
  });
}

export function createSearchCoreCp270ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp270Coverage(planPack);
  const tail = validateSearchCoreCp270ReviewBindingTailDescriptor(createSearchCoreCp270ReviewBindingTailDescriptor(), {});
  return freezeCp270Validation({
    review_packet: "C07.CP00-270.search_core_review_binding_tail_descriptor",
    gate: SEARCH_CORE_CP270_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP270_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    review_binding_tail_valid: tail.valid,
    invalid_review_blockers: SEARCH_CORE_CP270_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-270 cover exactly the 10 planned RP07 units from RP07.P09.M05.S19 through RP07.P09.M06.S06?",
      "Do the two descriptor sections (M05 permission/audit binding tail with documentation update, command rerun, review receipt placeholder, and future correction slot; M06 synthetic fixture head with review question rows) cover every planned row title as descriptor-only rows?",
      "Does CP00-270 avoid permission bypass, UI leaks, command runtime execution, Hermes runtime receipts, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust?",
    ]),
  });
}

export function createSearchCoreCp270CloseoutHandoff() {
  return freezeCp270Validation({
    handoff_id: "CP00-270-to-CP00-271",
    from_pack_id: SEARCH_CORE_CP270_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP270_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP270_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP270_PACK_BINDING.range,
    open_scope: "Continue RP07.P09.M06.S07 onward with the remaining review fixture rows and downstream micros while preserving descriptor-only search boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP270_PACK_BINDING.production_ready_flag,
  });
}

export function createSearchCoreCp271CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  return freezeCp271Validation({
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

export function validateSearchCoreCp271Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-271 plan pack is required");
  if (planPack?.pack_id !== SEARCH_CORE_CP271_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-271");
  if (planPack?.risk_class !== SEARCH_CORE_CP271_PACK_BINDING.risk_class) errors.push("CP00-271 risk class drift");
  if (planPack?.unit_count !== SEARCH_CORE_CP271_PACK_BINDING.unit_count) errors.push("CP00-271 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== SEARCH_CORE_CP271_PACK_BINDING.first_unit_id) errors.push("CP00-271 first unit drift");
  if (unitIds.at(-1) !== SEARCH_CORE_CP271_PACK_BINDING.last_unit_id) errors.push("CP00-271 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-271 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP07")) errors.push("CP00-271 must only include RP07 units");
  const summary = createSearchCoreCp271CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-271 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-271 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-271 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-271 ${microTitle} distribution drift`);
  }
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows)) {
    const sectionUnits = (planPack?.included_units ?? []).filter((unit) => unit.source_micro_phase_id === microId);
    if (sectionUnits.length !== titles.length) errors.push(`CP00-271 ${microId} row count drift`);
    const sectionTitles = sectionUnits.map((unit) => unit.title);
    for (const title of titles) {
      if (!sectionTitles.includes(title)) errors.push(`CP00-271 ${microId} missing row ${title}`);
    }
  }
  return freezeCp271Validation({ valid: errors.length === 0, errors: Object.freeze(errors), summary });
}

export function validateSearchCoreCp271P09CloseoutDescriptor(
  descriptor = createSearchCoreCp271P09CloseoutDescriptor(),
  contractProjection = {},
) {
  const errors = [];
  const caseSet = descriptor.p09_closeout_case_set ?? createSearchCoreCp271P09CloseoutCaseSet();
  if (descriptor.descriptor !== "SearchCoreCp271P09CloseoutDescriptor") errors.push("CP00-271 descriptor type drift");
  if (descriptor.source_review_binding_tail_descriptor !== "SearchCoreCp270ReviewBindingTailDescriptor") {
    errors.push("CP00-271 source review binding tail descriptor drift");
  }
  const sections = caseSet.sections ?? {};
  if (caseSet.section_count !== Object.keys(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows).length) errors.push("CP00-271 section count drift");
  for (const [microId, titles] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows)) {
    const section = sections[microId];
    if (!section) {
      errors.push(`CP00-271 missing section ${microId}`);
      continue;
    }
    if (section.row_count !== titles.length) errors.push(`CP00-271 ${microId} row count drift`);
    for (const title of titles) {
      const key = searchCoreRowKey(title);
      const row = section.rows?.[key];
      if (!row) {
        errors.push(`CP00-271 ${microId} missing row ${key}`);
        continue;
      }
      if (row.descriptor_only !== true) errors.push(`CP00-271 ${microId} ${key} must be descriptor-only`);
      if (row.runtime_execution !== false) errors.push(`CP00-271 ${microId} ${key} must not execute runtime`);
      if (row.customer_safe_errors_only !== true) errors.push(`CP00-271 ${microId} ${key} must be customer-safe`);
      if (row.raw_payload_included !== false) errors.push(`CP00-271 ${microId} ${key} must not include raw payload`);
    }
  }
  for (const [microId] of Object.entries(SEARCH_CORE_CP271_REQUIREMENTS.required_section_rows)) {
    const rows = sections[microId]?.rows ?? {};
    if (rows.permission_bypass_questions && rows.permission_bypass_questions.permission_bypass_detected !== false) {
      errors.push(`CP00-271 ${microId} permission bypass detected`);
    }
    if (rows.ui_leak_questions && rows.ui_leak_questions.leak_detected !== false) {
      errors.push(`CP00-271 ${microId} UI leak detected`);
    }
    if (rows.go_no_go_verdict_format && rows.go_no_go_verdict_format.claude_final_approval_claimed !== false) {
      errors.push(`CP00-271 ${microId} go/no-go must not claim Claude final approval`);
    }
    if (rows.claude_review_packet && rows.claude_review_packet.claude_final_approval_claimed !== false) {
      errors.push(`CP00-271 ${microId} review packet must not claim Claude final approval`);
    }
    if (rows.human_approval_summary && rows.human_approval_summary.human_final_approval_required !== true) {
      errors.push(`CP00-271 ${microId} human approval summary drift`);
    }
    if (rows.command_rerun && rows.command_rerun.executes_command_runtime !== false) {
      errors.push(`CP00-271 ${microId} command rerun must not execute runtime`);
    }
  }
  if (SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.closes_rp07_descriptor_scope !== true) errors.push("CP00-271 RP07 closeout attestation drift");
  if (SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) errors.push("CP00-271 must not promote Claude");
  if (SEARCH_CORE_CP271_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-271 must not claim enterprise trust");
  }
  if (descriptor.authority_boundary?.claude_is_final_approval !== false) errors.push("CP00-271 Claude authority boundary drift");
  if (descriptor.authority_boundary?.local_validation_claims_enterprise_trust !== false) {
    errors.push("CP00-271 local validation trust boundary drift");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== SEARCH_CORE_CP271_PACK_BINDING.pack_id) {
    errors.push("CP00-271 contract current_pack drift");
  }
  if (
    contractProjection?.p09_closeout_descriptor?.descriptor &&
    contractProjection.p09_closeout_descriptor.descriptor !== descriptor.descriptor
  ) {
    errors.push("CP00-271 contract p09_closeout_descriptor drift");
  }
  if (descriptor.closeout_handoff?.to_pack_id !== SEARCH_CORE_CP271_PACK_BINDING.next_pack_id) errors.push("CP00-271 handoff target drift");
  if (descriptor.closeout_handoff?.next_subphase_id !== SEARCH_CORE_CP271_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-271 next subphase drift");
  }
  return freezeCp271Validation({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createSearchCoreCp271HermesEvidencePacket(
  planPack,
  contractProjection = {},
  descriptor = createSearchCoreCp271P09CloseoutDescriptor(),
) {
  const coverage = validateSearchCoreCp271Coverage(planPack);
  const closeout = validateSearchCoreCp271P09CloseoutDescriptor(descriptor, contractProjection);
  return freezeCp271Validation({
    evidence_packet: "H07.CP00-271.search_core_p09_closeout_descriptor",
    gate: SEARCH_CORE_CP271_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    p09_closeout_valid: closeout.valid,
    no_real_data: true,
    source_review_binding_tail_pack_id: SEARCH_CORE_CP271_PACK_BINDING.upstream_pack_id,
    required_no_leak_guards: SEARCH_CORE_CP271_REQUIREMENTS.required_no_leak_guards,
    next_pack_id: SEARCH_CORE_CP271_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP271_PACK_BINDING.next_subphase_id,
    production_ready_candidate: coverage.valid && closeout.valid,
  });
}

export function createSearchCoreCp271ClaudeReviewPacket(planPack) {
  const coverage = validateSearchCoreCp271Coverage(planPack);
  const closeout = validateSearchCoreCp271P09CloseoutDescriptor(createSearchCoreCp271P09CloseoutDescriptor(), {});
  return freezeCp271Validation({
    review_packet: "C07.CP00-271.search_core_p09_closeout_descriptor",
    gate: SEARCH_CORE_CP271_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    source_inspection_basis: "read_tools_used",
    allowed_tools: SEARCH_CORE_CP271_REQUIREMENTS.allowed_claude_tools,
    coverage_valid: coverage.valid,
    p09_closeout_valid: closeout.valid,
    invalid_review_blockers: SEARCH_CORE_CP271_REQUIREMENTS.forbidden_review_evidence,
    questions: Object.freeze([
      "Does CP00-271 cover exactly the 86 planned RP07 units from RP07.P09.M06.S07 through RP07.P09.M10.S10, closing the RP07 descriptor scope?",
      "Do the five descriptor sections (M06 synthetic fixture tail, M07 test/golden cycle with review receipt placeholder and future correction slot, M08 Hermes packet, M09 Claude review packet, M10 closeout handoff head) cover every planned row title as descriptor-only rows, with the shared review guards applied across every section that carries them?",
      "Does CP00-271 avoid permission bypass, UI leaks, command runtime execution, Hermes runtime receipts, AI runtime dispatch, search/OCR/index/embedding runtime, state writes, object storage, raw payloads, unauthorized data, email, Citation Ledger, and Loop execution?",
      "Does the pack avoid treating Claude or local validation as final approval or enterprise trust, and does the handoff route to the RP08 program bootstrap at CP00-272?",
    ]),
  });
}

export function createSearchCoreCp271CloseoutHandoff() {
  return freezeCp271Validation({
    handoff_id: "CP00-271-to-CP00-272",
    from_pack_id: SEARCH_CORE_CP271_PACK_BINDING.pack_id,
    to_pack_id: SEARCH_CORE_CP271_PACK_BINDING.next_pack_id,
    next_subphase_id: SEARCH_CORE_CP271_PACK_BINDING.next_subphase_id,
    closed_scope: SEARCH_CORE_CP271_PACK_BINDING.range,
    open_scope: "RP07 descriptor scope is fully closed (P00-P09); CP00-272 opens the RP08 program with a fresh program bootstrap while preserving descriptor-only boundaries until downstream packs explicitly open runtime behavior.",
    production_ready_flag: SEARCH_CORE_CP271_PACK_BINDING.production_ready_flag,
  });
}
