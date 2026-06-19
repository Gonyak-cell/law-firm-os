#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMatterG4AOpeningFoundationCloseoutDescriptor,
  createMatterG4Member,
  createMatterG4OpeningRecord,
  createMatterMemberPermissionDescriptor,
  createMatterNumberReservationDescriptor,
  createMatterOpeningTransactionDescriptor,
  MATTER_G4A_MEMBER_ROLES,
  validateMatterCoreRecord,
} from "../packages/matter/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G4-W05-T001",
  "LFOS-G4-W05-T002",
  "LFOS-G4-W05-T003",
  "LFOS-G4-W05-T004",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "34-g4-matter-dms-entry-plan.md"),
  path.join(ROOT, "35-g4-a-matter-opening-foundation-report.md"),
  path.resolve("packages/matter/src/client-matter-g4.js"),
  path.resolve("packages/matter/src/index.js"),
  path.resolve("packages/matter/test/client-matter-g4-opening.test.js"),
  path.resolve("contracts/matter-core-contract.json"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

function clearanceToken(overrides = {}) {
  return {
    clearance_token_id: "clearance_g4a_validator",
    tenant_id: "tenant_g4a_validator",
    intake_request_id: "intake_g4a_validator",
    conflict_check_id: "conflict_check_g4a_validator",
    engagement_id: "engagement_g4a_validator",
    snapshot_hash: "snapshot:g4a_validator",
    token_state: "candidate",
    outcome: "review_required",
    blocked_claims: [],
    clearance_receipt: {
      valid_for_runtime_matter_opening: false,
    },
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G4-A validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const report = await readText(path.join(ROOT, "35-g4-a-matter-opening-foundation-report.md"));
  const source = await readText(path.resolve("packages/matter/src/client-matter-g4.js"));
  const indexSource = await readText(path.resolve("packages/matter/src/index.js"));
  const testSource = await readText(path.resolve("packages/matter/test/client-matter-g4-opening.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/matter-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G4-A TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G4-A TUW missing from G4 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G4-A TUW missing from G4-A report.");
  }

  for (const phrase of [
    "G4-A Matter Opening Foundation Report",
    "This slice does not claim G4 runtime readiness",
    "Matter opening requires G3 clearance token evidence",
    "matter number idempotency",
    "ACL, DMS workspace, and Billing refs",
    "MatterMember role permission",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G4-A report missing required boundary or scope phrase.");
  }

  requireIncludes(indexSource, `export * from "./client-matter-g4.js";`, "MISSING_INDEX_EXPORT", "Matter package must export G4 descriptor layer.");

  for (const symbol of [
    "createMatterG4OpeningRecord",
    "createMatterNumberReservationDescriptor",
    "createMatterOpeningTransactionDescriptor",
    "createMatterMemberPermissionDescriptor",
    "createMatterG4AOpeningFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G4-A descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G4-A descriptor export missing test coverage.");
  }

  for (const marker of [
    "MATTER_G4A_MEMBER_ROLES",
    "g3_clearance_required_before_matter_opening",
    "matter_number_idempotency_conflict",
    "matter_number_duplicate_detected",
    "opening_transaction_atomic_refs_required",
    "member_role_permission_required",
    "g4_runtime_readiness_claim",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G4-A source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g4a:validate"] !== "node scripts/validate-client-matter-os-g4-a.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g4a:validate.");
  }

  if (contract.program?.program_id !== "RP05" || contract.service_boundary?.descriptor_only !== true) {
    addFinding("MATTER_CONTRACT_BOUNDARY", "Matter contract must remain RP05 descriptor-only evidence.");
  }

  const tenant_id = "tenant_g4a_validator";
  const actor_id = "actor_g4a_validator";
  const matter = createMatterG4OpeningRecord({
    matter_id: "matter_g4a_validator",
    tenant_id,
    legal_client_party_id: "party_g4a_legal_client",
    billing_profile_id: "billing_profile_g4a",
    title: "G4-A validator matter opening",
    created_by: actor_id,
    created_at: "2026-06-19T00:00:00.000Z",
    permission_envelope_id: "perm_g4a_validator",
    audit_trace_id: "audit_g4a_validator",
    matter_number: "M-G4A-VALIDATOR",
    clearance_token: clearanceToken(),
  });

  const matterValidation = validateMatterCoreRecord("Matter", matter, { expected_tenant_id: tenant_id });
  if (
    !matterValidation.valid ||
    matter.clearance_token_id !== "clearance_g4a_validator" ||
    matter.g3_clearance_required_before_matter_opening !== true ||
    matter.writes_product_state !== false ||
    matter.g4_runtime_readiness_claim !== "open"
  ) {
    addFinding("MATTER_OPENING_RECORD", "Matter opening record must validate with G3 clearance and open G4 readiness.");
  }

  try {
    createMatterG4OpeningRecord({
      matter_id: "matter_g4a_missing_clearance",
      tenant_id,
      legal_client_party_id: "party_g4a_legal_client",
      title: "Missing clearance",
      created_by: actor_id,
      created_at: "2026-06-19T00:00:00.000Z",
      permission_envelope_id: "perm_g4a_validator",
      audit_trace_id: "audit_g4a_validator",
    });
    addFinding("CLEARANCE_REQUIRED", "Matter opening must reject missing G3 clearance.");
  } catch (error) {
    if (!String(error.message).includes("G3 clearance token")) {
      addFinding("CLEARANCE_REQUIRED_ERROR", "Missing clearance error must identify G3 clearance token requirement.");
    }
  }

  const reservation = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 validator matter 0001",
    idempotency_key: "idem:g4a:number",
  });
  const replay = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 validator matter 0001",
    idempotency_key: "idem:g4a:number",
    existing_reservations: [reservation],
  });
  const duplicate = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 validator matter 0001",
    idempotency_key: "idem:g4a:duplicate",
    existing_reservations: [reservation],
  });
  if (
    reservation.outcome !== "review_required" ||
    replay.idempotent_replay_detected !== true ||
    duplicate.outcome !== "blocked" ||
    !duplicate.blocked_claims.includes("matter_number_duplicate_detected")
  ) {
    addFinding("MATTER_NUMBER_IDEMPOTENCY", "Matter number reservation must prove idempotency and duplicate blocking.");
  }

  const transaction = createMatterOpeningTransactionDescriptor({
    tenant_id,
    actor_id,
    matter,
    matter_number_reservation: reservation,
    acl_ref: "acl:g4a",
    dms_workspace_ref: "dms-workspace:g4a",
    billing_ref: "billing:g4a",
    idempotency_key: "idem:g4a:opening",
  });
  if (
    transaction.outcome !== "review_required" ||
    transaction.transaction_receipt.atomic_commit_required !== true ||
    transaction.transaction_receipt.partial_state_allowed !== false ||
    transaction.transaction_receipt.transaction_persisted !== false
  ) {
    addFinding("OPENING_TRANSACTION", "Opening transaction must require atomic refs without persisting state.");
  }

  const member = createMatterG4Member({
    member_id: "member_g4a_validator",
    tenant_id,
    matter_id: matter.matter_id,
    user_id: "user_g4a_owner",
    role: "responsible_attorney",
    status: "active",
    permission_envelope_id: "perm_g4a_member",
    audit_trace_id: "audit_g4a_member",
  });
  const memberPermission = createMatterMemberPermissionDescriptor({
    tenant_id,
    actor_id,
    matter,
    member,
    role_permissions: {
      responsible_attorney: true,
    },
  });
  if (
    !MATTER_G4A_MEMBER_ROLES.includes("responsible_attorney") ||
    memberPermission.outcome !== "review_required" ||
    memberPermission.permission_receipt.permission_evaluated !== false ||
    memberPermission.permission_receipt.member_write_persisted !== false
  ) {
    addFinding("MEMBER_PERMISSION", "MatterMember permission descriptor must validate role permission without runtime evaluation.");
  }

  const closeout = createMatterG4AOpeningFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [matter, reservation, transaction, memberPermission],
  });
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 4 ||
    closeout.matter_number_idempotency_tested !== true ||
    closeout.opening_transaction_atomic_refs_tested !== true ||
    closeout.matter_member_role_permission_tested !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G4A_CLOSEOUT", "G4-A closeout must summarize all opening foundation evidence and keep readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4-A validation passed.");
console.log("g4a_tuws: LFOS-G4-W05-T001/LFOS-G4-W05-T002/LFOS-G4-W05-T003/LFOS-G4-W05-T004");
console.log("matter_opening: g3_clearance_required");
console.log("matter_number: idempotent_duplicate_safe");
console.log("opening_transaction: acl_dms_billing_refs_atomic");
console.log("matter_member: role_permission_required");
console.log("g4_runtime_readiness_claim: open");
