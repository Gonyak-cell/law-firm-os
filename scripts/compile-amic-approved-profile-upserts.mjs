#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AMIC_CURRENT_MATTER_CODE_CANDIDATES } from "../packages/matter/src/amic-matter-code-candidates.js";
import { createMatterRepository } from "../packages/matter/src/repository.js";
import { profileKindForMatter, registerMatterStakeholder, updateMatterProfile } from "../packages/matter/src/matter-profile-service.js";

const MANIFEST_SCHEMA_VERSION = "law-firm-os.amic_profile_approval_manifest.v1";
const PLAN_SCHEMA_VERSION = "law-firm-os.amic_profile_approved_upsert_plan.v1";
const VALIDATION_TENANT_ID = "tenant_amic_profile_preflight";

function required(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} is invalid`);
  return value;
}

function onlyKeys(value, allowed, label) {
  const extras = Object.keys(plainObject(value, label)).filter((key) => !allowed.has(key));
  if (extras.length > 0) throw new TypeError(`${label} has unsupported field ${extras[0]}`);
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} is invalid`);
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(filePath) {
  return readFile(filePath).then((value) => sha256(value));
}

function safeId(value) {
  const text = required(value, "identifier");
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(text)) throw new TypeError("identifier is invalid");
  return text;
}

function assertNoRawContactValue(value, label) {
  const text = String(value ?? "").trim();
  if (!text) return;
  const normalized = text.replaceAll(/[()\s.-]/g, "");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || (/^[+]?\d{7,15}$/.test(normalized) && /[+()\s.-]/.test(text))) {
    throw new TypeError(`${label} must not contain a raw contact value`);
  }
}

function uniqueEvidenceIds(value, label) {
  const ids = array(value, label).map((item) => required(item, `${label} item`));
  if (ids.length === 0) throw new TypeError(`${label} is required`);
  if (new Set(ids).size !== ids.length) throw new TypeError(`${label} contains duplicates`);
  return ids.sort();
}

function assertEvidenceSubset({ requested, available, label }) {
  const allowed = new Set(available);
  if (requested.some((id) => !allowed.has(id))) throw new TypeError(`${label} must belong to the selected evidence candidate`);
}

function profileCandidateIndex(projection) {
  const matters = new Map();
  for (const candidate of array(projection.matter_profile_candidates, "projection.matter_profile_candidates")) {
    matters.set(required(candidate.matter_id, "candidate.matter_id"), candidate);
  }
  return matters;
}

function fieldCandidate(candidate, field, value) {
  const group = array(candidate.profile_field_candidates, "candidate.profile_field_candidates")
    .find((item) => item.field === field);
  const matched = group?.candidates?.find((item) => stableJson(item.value) === stableJson(value));
  if (!matched) throw new TypeError(`approved field ${field} is not an evidence-backed candidate`);
  return matched;
}

function stakeholderCandidate(candidate, role, displayName) {
  const matched = array(candidate.stakeholder_candidates, "candidate.stakeholder_candidates")
    .find((item) => item.relationship_role === role && item.display_name === displayName);
  if (!matched) throw new TypeError(`approved stakeholder ${role}/${displayName} is not an evidence-backed candidate`);
  return matched;
}

function operationsForProfile({ approved, candidate, matter, approval, planHash }) {
  onlyKeys(approved, new Set(["matter_id", "profile_fields", "stakeholders"]), "approved profile");
  const profileFields = array(approved.profile_fields ?? [], "approved.profile_fields");
  const stakeholders = array(approved.stakeholders ?? [], "approved.stakeholders");
  if (profileFields.length === 0 && stakeholders.length === 0) throw new TypeError("approved profile has no approved fields or stakeholders");

  const profileData = {};
  const approvedFieldEvidence = [];
  const seenFields = new Set();
  for (const item of profileFields) {
    onlyKeys(item, new Set(["field", "value", "evidence_record_ids"]), "approved field");
    const field = required(item.field, "approved field");
    if (field.endsWith("_stakeholder_id")) throw new TypeError(`${field} must bind through an approved stakeholder`);
    if (seenFields.has(field)) throw new TypeError(`approved field ${field} is duplicated`);
    const matched = fieldCandidate(candidate, field, item.value);
    const evidenceRecordIds = uniqueEvidenceIds(item.evidence_record_ids, `approved field ${field}.evidence_record_ids`);
    assertEvidenceSubset({ requested: evidenceRecordIds, available: array(matched.evidence_record_ids, "field candidate evidence"), label: `approved field ${field}.evidence_record_ids` });
    seenFields.add(field);
    profileData[field] = item.value;
    approvedFieldEvidence.push({ field, evidence_record_ids: evidenceRecordIds });
  }

  const stakeholderOperations = [];
  const bindings = [];
  const seenStakeholderKeys = new Set();
  for (const item of stakeholders) {
    onlyKeys(item, new Set(["approval_key", "relationship_role", "display_name", "organization_name", "entity_kind", "side", "phase", "evidence_record_ids", "profile_fields"]), "approved stakeholder");
    const approvalKey = safeId(required(item.approval_key, "stakeholder.approval_key"));
    if (!approvalKey || seenStakeholderKeys.has(approvalKey)) throw new TypeError("stakeholder.approval_key is duplicated or invalid");
    seenStakeholderKeys.add(approvalKey);
    const relationshipRole = required(item.relationship_role, "stakeholder.relationship_role");
    const displayName = required(item.display_name, "stakeholder.display_name");
    assertNoRawContactValue(displayName, "stakeholder.display_name");
    assertNoRawContactValue(item.organization_name, "stakeholder.organization_name");
    assertNoRawContactValue(item.phase, "stakeholder.phase");
    const matched = stakeholderCandidate(candidate, relationshipRole, displayName);
    const evidenceRecordIds = uniqueEvidenceIds(item.evidence_record_ids, `stakeholder ${approvalKey}.evidence_record_ids`);
    assertEvidenceSubset({ requested: evidenceRecordIds, available: array(matched.evidence_record_ids, "stakeholder candidate evidence"), label: `stakeholder ${approvalKey}.evidence_record_ids` });
    const linkFields = array(item.profile_fields ?? [], `stakeholder ${approvalKey}.profile_fields`);
    const idempotencyKey = `amic_stakeholder_${sha256(`${approval.approval_ref}:${matter.matter_id}:${approvalKey}:${planHash}`).slice(0, 32)}`;
    stakeholderOperations.push({
      operation_id: `stakeholder_${approvalKey}`,
      idempotency_key: idempotencyKey,
      endpoint: `/api/matters/${matter.matter_id}/stakeholders`,
      body: {
        idempotency_key: idempotencyKey,
        stakeholder: {
          display_name: displayName,
          organization_name: item.organization_name ?? null,
          entity_kind: item.entity_kind ?? "person",
          relationship_role: relationshipRole,
          side: item.side ?? "other",
          phase: item.phase ?? null,
          contact_mode: "no_contact",
          source_ref: `review-workbook://${approval.reviewed_workbook_sha256}#${matter.matter_id}:${approvalKey}`,
          confidence: "manual_verified",
          review_status: "verified",
        },
      },
      evidence_record_ids: evidenceRecordIds,
      profile_fields: linkFields,
    });
    for (const field of linkFields) {
      if (seenFields.has(field)) throw new TypeError(`approved field ${field} is duplicated`);
      seenFields.add(field);
      bindings.push({ field, stakeholder_operation_id: `stakeholder_${approvalKey}` });
    }
  }

  const idempotencyKey = `amic_profile_${sha256(`${approval.approval_ref}:${matter.matter_id}:${planHash}`).slice(0, 32)}`;
  const profileOperation = {
    operation_id: "patch_profile",
    idempotency_key: idempotencyKey,
    endpoint: `/api/matters/${matter.matter_id}/profile`,
    body: {
      idempotency_key: idempotencyKey,
      profile: {
        profile_kind: profileKindForMatter(matter),
        data: profileData,
        evidence: {
          source_ref: `review-workbook://${approval.reviewed_workbook_sha256}#${matter.matter_id}`,
          confidence: "manual_verified",
          review_status: "verified",
        },
      },
    },
    field_evidence: approvedFieldEvidence,
    stakeholder_bindings: bindings,
  };

  validateInMemory({ matter, profileOperation, stakeholderOperations });
  return {
    matter_id: matter.matter_id,
    client_id: matter.client_id,
    matter_code: matter.matter_code,
    profile_kind: profileKindForMatter(matter),
    source_record_count: candidate.source_record_count,
    review_required: false,
    execution_requires_explicit_user_confirmation: true,
    operations: [...stakeholderOperations, profileOperation],
  };
}

function validateInMemory({ matter, profileOperation, stakeholderOperations }) {
  const repository = createMatterRepository({ seedRecords: [] });
  const validationMatter = { ...matter, tenant_id: VALIDATION_TENANT_ID };
  const bindings = {};
  for (const operation of stakeholderOperations) {
    const stakeholder = registerMatterStakeholder({
      repository,
      matter: validationMatter,
      actor_id: "amic_approval_preflight",
      stakeholder: operation.body.stakeholder,
      occurred_at: "2026-07-10T00:00:00.000Z",
    });
    for (const field of operation.profile_fields) bindings[field] = stakeholder.stakeholder_id;
  }
  const data = { ...profileOperation.body.profile.data, ...bindings };
  updateMatterProfile({
    repository,
    matter: validationMatter,
    actor_id: "amic_approval_preflight",
    patch: { ...profileOperation.body.profile, data },
    occurred_at: "2026-07-10T00:00:00.000Z",
  });
}

export async function compileApprovedProfileUpserts({ projection, workbookPath, approvalManifest }) {
  const manifest = plainObject(approvalManifest, "approval manifest");
  onlyKeys(manifest, new Set(["schema_version", "source_revision", "reviewer_id", "approval_ref", "reviewed_workbook_sha256", "approved_profiles"]), "approval manifest");
  if (manifest.schema_version !== MANIFEST_SCHEMA_VERSION) throw new TypeError("approval manifest schema_version is unsupported");
  if (manifest.source_revision !== projection.source_revision) throw new TypeError("approval manifest source_revision does not match projection");
  const reviewerId = required(manifest.reviewer_id, "approval manifest reviewer_id");
  const approvalRef = required(manifest.approval_ref, "approval manifest approval_ref");
  const approvedProfiles = array(manifest.approved_profiles, "approval manifest approved_profiles");
  if (approvedProfiles.length === 0) throw new TypeError("approval manifest approved_profiles is required");
  const actualWorkbookHash = await fileSha256(workbookPath);
  if (required(manifest.reviewed_workbook_sha256, "approval manifest reviewed_workbook_sha256") !== actualWorkbookHash) {
    throw new TypeError("approval manifest reviewed_workbook_sha256 does not match the workbook");
  }

  const approval = { reviewer_id: reviewerId, approval_ref: approvalRef, reviewed_workbook_sha256: actualWorkbookHash };
  const candidateByMatter = profileCandidateIndex(projection);
  const matterById = new Map(AMIC_CURRENT_MATTER_CODE_CANDIDATES.map((matter) => [matter.matter_id, matter]));
  const manifestHash = sha256(stableJson(manifest));
  const planHash = sha256(`${manifestHash}:${actualWorkbookHash}:${sha256(stableJson(projection))}`);
  const seenMatterIds = new Set();
  const matterPlans = approvedProfiles.map((approved) => {
    const matterId = required(approved.matter_id, "approved profile matter_id");
    if (seenMatterIds.has(matterId)) throw new TypeError(`approved profile ${matterId} is duplicated`);
    seenMatterIds.add(matterId);
    const candidate = candidateByMatter.get(matterId);
    const matter = matterById.get(matterId);
    if (!candidate || !matter) throw new TypeError(`approved profile ${matterId} is not mapped to a current Matter`);
    if (candidate.review_required !== true || candidate.write_eligible !== false) throw new TypeError(`approved profile ${matterId} has an invalid review state`);
    return operationsForProfile({ approved, candidate, matter, approval, planHash });
  });

  return {
    schema_version: PLAN_SCHEMA_VERSION,
    plan_status: "preflight_passed_no_write",
    source_revision: projection.source_revision,
    approval: approval,
    projection_sha256: sha256(stableJson(projection)),
    approval_manifest_sha256: manifestHash,
    plan_sha256: planHash,
    approved_matter_count: matterPlans.length,
    approved_operation_count: matterPlans.reduce((count, item) => count + item.operations.length, 0),
    matter_plans: matterPlans,
    no_data_write_executed: true,
    latest_package_rebuild_executed: false,
    latest_package_qa_executed: false,
    raw_contact_values_included: false,
    execute_eligible_after_explicit_user_confirmation: true,
  };
}

async function main() {
  const [projectionArgument, workbookArgument, manifestArgument, outputArgument] = process.argv.slice(2);
  if (![projectionArgument, workbookArgument, manifestArgument, outputArgument].every(Boolean)) {
    throw new Error("usage: compile-amic-approved-profile-upserts.mjs <projection.json> <review-workbook.xlsx> <approval-manifest.json> <output.json>");
  }
  const projection = JSON.parse(await readFile(path.resolve(projectionArgument), "utf8"));
  const approvalManifest = JSON.parse(await readFile(path.resolve(manifestArgument), "utf8"));
  const outputPath = path.resolve(outputArgument);
  const plan = await compileApprovedProfileUpserts({ projection, workbookPath: path.resolve(workbookArgument), approvalManifest });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(JSON.stringify({ verdict: "PASS", output_path: outputPath, plan_status: plan.plan_status, approved_matter_count: plan.approved_matter_count, approved_operation_count: plan.approved_operation_count, no_data_write_executed: true, execute_eligible_after_explicit_user_confirmation: true }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
