#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import { AMIC_CURRENT_MATTER_CODE_CANDIDATES } from "../packages/matter/src/amic-matter-code-candidates.js";
import { matterProfileFields, profileKindForMatter } from "../packages/matter/src/matter-profile-service.js";

const SOURCE_REVISION = "amic-1-2026-07-10";
const MAX_REVIEWABLE_FIELD_VALUE_LENGTH = 160;
const FIELD_VALUE_LENGTH_LIMITS = Object.freeze({ delivery_reference: 80 });
const MAX_FIELD_CANDIDATES_PER_GROUP = 25;
const MAX_STAKEHOLDER_CANDIDATES_PER_MATTER = 20;
const STAKEHOLDER_ROLES_BY_PROFILE = Object.freeze({
  civil_litigation: new Set(["court_contact", "court_clerk"]),
  criminal_litigation: new Set(["police_officer", "prosecutor"]),
  administrative_litigation: new Set(["agency_officer", "court_clerk"]),
  deal: new Set(["counterparty_lawyer", "sell_side_advisor_lawyer", "buy_side_advisor_lawyer", "accountant", "company_contact", "shareholder"]),
  corporate_advisory: new Set(["client_contact"]),
});

function requiredPath(value, label) {
  if (!value) throw new Error(`${label} is required`);
  return path.resolve(value);
}

export function flattenSourceRef(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replaceAll("\\", "-")
    .replaceAll("/", "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "")
    .toLocaleLowerCase("ko");
}

export function comparisonSourceKey(value) {
  return flattenSourceRef(value)
    .split("-")
    .map((part) => part.replace(/^\d+[._\s]*/, ""))
    .filter((part) => part && !/^(종료사건|archives?|사건기록|소송기록|소송문서|첨부|자료|문서)$/.test(part))
    .join("-");
}

export function isReviewableFieldValue(value, field = "") {
  const limit = FIELD_VALUE_LENGTH_LIMITS[field] ?? MAX_REVIEWABLE_FIELD_VALUE_LENGTH;
  return typeof value !== "string" || value.length <= limit;
}

function profileMatter(matter) {
  const profileKind = profileKindForMatter(matter);
  return Object.freeze({
    ...matter,
    profile_kind: profileKind,
    allowed_fields: new Set(matterProfileFields(profileKind)),
    allowed_stakeholder_roles: STAKEHOLDER_ROLES_BY_PROFILE[profileKind] ?? new Set(),
    flattened_source_ref: flattenSourceRef(matter.source_ref),
    comparison_source_key: comparisonSourceKey(matter.source_ref),
  });
}

function projectionState(matter) {
  return {
    matter,
    source_record_ids: new Set(),
    evidence_record_ids: new Set(),
    mapping_methods: new Set(),
    fields: new Map(),
    stakeholders: new Map(),
    discarded_oversized_field_candidate_count: 0,
  };
}

function fieldState(state, field, value, evidenceRef) {
  if (!state.matter.allowed_fields.has(field)) return;
  if (!isReviewableFieldValue(value, field)) {
    state.discarded_oversized_field_candidate_count += 1;
    return;
  }
  const values = state.fields.get(field) ?? new Map();
  const key = JSON.stringify(value);
  const item = values.get(key) ?? { value, evidence_record_ids: new Set() };
  item.evidence_record_ids.add(evidenceRef);
  values.set(key, item);
  state.fields.set(field, values);
}

function stakeholderState(state, stakeholder, evidenceRef) {
  if (!state.matter.allowed_stakeholder_roles.has(stakeholder.relationship_role)) return;
  const key = `${stakeholder.relationship_role}\u0000${stakeholder.display_name}`;
  const item = state.stakeholders.get(key) ?? { ...stakeholder, evidence_record_ids: new Set() };
  item.evidence_record_ids.add(evidenceRef);
  state.stakeholders.set(key, item);
}

function sortedValues(values) {
  return [...values.values()]
    .map((item) => ({
      value: item.value,
      evidence_count: item.evidence_record_ids.size,
      evidence_record_ids: [...item.evidence_record_ids].sort().slice(0, 25),
    }))
    .sort((left, right) => right.evidence_count - left.evidence_count || String(left.value).localeCompare(String(right.value), "ko"));
}

function serializeProjection(state) {
  const fields = [...state.fields.entries()]
    .map(([field, values]) => {
      const candidates = sortedValues(values);
      return {
        field,
        candidates: candidates.slice(0, MAX_FIELD_CANDIDATES_PER_GROUP),
        candidate_total: candidates.length,
        candidate_truncated_count: Math.max(candidates.length - MAX_FIELD_CANDIDATES_PER_GROUP, 0),
        conflict: values.size > 1,
      };
    })
    .sort((left, right) => left.field.localeCompare(right.field));
  const stakeholderCandidates = [...state.stakeholders.values()]
    .map((item) => ({
      relationship_role: item.relationship_role,
      display_name: item.display_name,
      evidence_count: item.evidence_record_ids.size,
      evidence_record_ids: [...item.evidence_record_ids].sort().slice(0, 25),
    }))
    .sort((left, right) => left.relationship_role.localeCompare(right.relationship_role) || left.display_name.localeCompare(right.display_name, "ko"));
  const stakeholders = stakeholderCandidates.slice(0, MAX_STAKEHOLDER_CANDIDATES_PER_MATTER);
  return {
    matter_id: state.matter.matter_id,
    client_id: state.matter.client_id,
    matter_code: state.matter.matter_code,
    profile_kind: state.matter.profile_kind,
    mapping_methods: [...state.mapping_methods].sort(),
    source_record_count: state.source_record_ids.size,
    evidence_record_count: state.evidence_record_ids.size,
    profile_field_candidates: fields,
    stakeholder_candidates: stakeholders,
    conflicting_field_count: fields.filter((field) => field.conflict).length,
    discarded_oversized_field_candidate_count: state.discarded_oversized_field_candidate_count,
    suppressed_field_candidate_count: fields.reduce((count, field) => count + field.candidate_truncated_count, 0),
    stakeholder_candidate_total: stakeholderCandidates.length,
    suppressed_stakeholder_candidate_count: Math.max(stakeholderCandidates.length - stakeholders.length, 0),
    review_required: true,
    write_eligible: false,
    raw_contact_values_included: false,
  };
}

async function sourceRecords(manifestPath) {
  const records = new Map();
  for await (const line of createInterface({ input: createReadStream(manifestPath) })) {
    if (!line) continue;
    const record = JSON.parse(line);
    if (record.source_scope === "current") records.set(record.source_record_id, Object.freeze({ flattened_path: flattenSourceRef(record.relative_path), comparison_key: comparisonSourceKey(record.relative_path) }));
  }
  return records;
}

async function projectEvidence({ manifestPath, evidencePath }) {
  const sources = await sourceRecords(manifestPath);
  const matters = AMIC_CURRENT_MATTER_CODE_CANDIDATES.map(profileMatter);
  const projections = new Map();
  const unmappedEvidence = new Set();
  const ambiguousEvidence = new Map();
  let evidenceRecords = 0;
  for await (const line of createInterface({ input: createReadStream(evidencePath) })) {
    if (!line) continue;
    const evidence = JSON.parse(line);
    evidenceRecords += 1;
    const source = sources.get(evidence.source_record_id);
    if (!source) throw new Error(`missing source record: ${evidence.source_record_id}`);
    const directMatches = matters.filter((matter) => source.flattened_path.startsWith(matter.flattened_source_ref));
    const matched = directMatches.length === 1
      ? directMatches
      : matters.filter((matter) => source.comparison_key.includes(matter.comparison_source_key));
    if (matched.length === 0) {
      unmappedEvidence.add(evidence.source_record_id);
      continue;
    }
    if (matched.length > 1) {
      ambiguousEvidence.set(evidence.source_record_id, matched.map((matter) => matter.matter_id).sort());
      continue;
    }
    const matter = matched[0];
    const state = projections.get(matter.matter_id) ?? projectionState(matter);
    state.source_record_ids.add(evidence.source_record_id);
    state.evidence_record_ids.add(evidence.source_record_id);
    state.mapping_methods.add(directMatches.length === 1 ? "flattened_source_ref_prefix" : "normalized_path_substring_review");
    for (const field of evidence.profile_field_candidates) fieldState(state, field.field, field.value, evidence.source_record_id);
    for (const stakeholder of evidence.stakeholder_candidates) stakeholderState(state, stakeholder, evidence.source_record_id);
    projections.set(matter.matter_id, state);
  }
  return {
    evidenceRecords,
    projections: [...projections.values()].map(serializeProjection).sort((left, right) => left.matter_code.localeCompare(right.matter_code, "ko")),
    unmatchedMatters: matters.filter((matter) => !projections.has(matter.matter_id)).map((matter) => ({ matter_id: matter.matter_id, client_id: matter.client_id, matter_code: matter.matter_code, profile_kind: matter.profile_kind, review_reason: "source_ref_not_directly_mapped" })),
    unmappedEvidence: [...unmappedEvidence].sort(),
    ambiguousEvidence: [...ambiguousEvidence.entries()].map(([source_record_id, matter_ids]) => ({ source_record_id, matter_ids })),
  };
}

async function main() {
  const [manifestArgument, evidenceArgument, outputArgument] = process.argv.slice(2);
  const manifestPath = requiredPath(manifestArgument, "source manifest");
  const evidencePath = requiredPath(evidenceArgument, "evidence candidates");
  const outputRoot = requiredPath(outputArgument, "output root");
  const projection = await projectEvidence({ manifestPath, evidencePath });
  await mkdir(outputRoot, { recursive: true });
  const report = {
    schema_version: "law-firm-os.matter_profile_review_candidates.v1",
    source_revision: SOURCE_REVISION,
    evidence_record_count: projection.evidenceRecords,
    mapped_matter_count: projection.projections.length,
    direct_prefix_matter_count: projection.projections.filter((matter) => matter.mapping_methods.includes("flattened_source_ref_prefix")).length,
    normalized_path_review_matter_count: projection.projections.filter((matter) => matter.mapping_methods.includes("normalized_path_substring_review")).length,
    unmatched_existing_matter_count: projection.unmatchedMatters.length,
    unmapped_evidence_count: projection.unmappedEvidence.length,
    ambiguous_evidence_count: projection.ambiguousEvidence.length,
    discarded_oversized_field_candidate_count: projection.projections.reduce((count, matter) => count + matter.discarded_oversized_field_candidate_count, 0),
    suppressed_field_candidate_count: projection.projections.reduce((count, matter) => count + matter.suppressed_field_candidate_count, 0),
    suppressed_stakeholder_candidate_count: projection.projections.reduce((count, matter) => count + matter.suppressed_stakeholder_candidate_count, 0),
    review_required_for_all: true,
    write_eligible_for_any: false,
    raw_contact_values_included: false,
    matter_profile_candidates: projection.projections,
    unmatched_existing_matters: projection.unmatchedMatters,
    ambiguous_evidence: projection.ambiguousEvidence,
  };
  await writeFile(path.join(outputRoot, "matter-profile-review-candidates.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputRoot, "matter-profile-mapping-summary.json"), `${JSON.stringify({ ...report, matter_profile_candidates: undefined, unmatched_existing_matters: undefined, ambiguous_evidence: undefined }, null, 2)}\n`);
  console.log(JSON.stringify({ verdict: "PASS", evidence_record_count: report.evidence_record_count, mapped_matter_count: report.mapped_matter_count, direct_prefix_matter_count: report.direct_prefix_matter_count, normalized_path_review_matter_count: report.normalized_path_review_matter_count, unmatched_existing_matter_count: report.unmatched_existing_matter_count, unmapped_evidence_count: report.unmapped_evidence_count, ambiguous_evidence_count: report.ambiguous_evidence_count, write_eligible_for_any: false }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
