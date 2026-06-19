#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createIntakeCoreConflictCheck,
  createIntakeCoreConflictHit,
  createIntakeCoreIntakeRequest,
  createIntakeCoreRecord,
  listIntakeCoreModelTypes,
  validateIntakeCoreRecord,
} from "../packages/intake/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G3-W04-T001", "LFOS-G3-W04-T002", "LFOS-G3-W04-T003"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "28-g3-crm-intake-entry-plan.md"),
  path.join(ROOT, "30-g3-b-crm-service-ui-closeout-report.md"),
  path.join(ROOT, "31-g3-c-intake-conflict-schema-report.md"),
  path.resolve("packages/intake/src/model.js"),
  path.resolve("packages/intake/src/index.js"),
  path.resolve("packages/intake/test/client-matter-g3-schema.test.js"),
  path.resolve("contracts/intake-core-contract.json"),
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

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G3-C validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const g3bReport = await readText(path.join(ROOT, "30-g3-b-crm-service-ui-closeout-report.md"));
  const report = await readText(path.join(ROOT, "31-g3-c-intake-conflict-schema-report.md"));
  const modelSource = await readText(path.resolve("packages/intake/src/model.js"));
  const indexSource = await readText(path.resolve("packages/intake/src/index.js"));
  const testSource = await readText(path.resolve("packages/intake/test/client-matter-g3-schema.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/intake-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G3-C TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G3-C TUW missing from G3 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G3-C TUW missing from G3-C report.");
  }

  for (const phrase of [
    "G3-C Intake Conflict Schema Report",
    "This slice does not claim G3 runtime readiness",
    "IntakeRequest, ConflictCheck, and ConflictHit",
    "required Party references",
    "immutable conflict snapshots",
    "audited conflict-hit source references",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G3-C report missing required boundary or scope phrase.");
  }

  requireIncludes(g3bReport, "G3-B CRM Service UI Closeout Report", "G3B_DEPENDENCY", "G3-C must build on the CRM G3-B slice.");

  for (const symbol of [
    "createIntakeCoreIntakeRequest",
    "createIntakeCoreConflictCheck",
    "createIntakeCoreConflictHit",
    "createIntakeCoreRecord",
    "listIntakeCoreModelTypes",
    "validateIntakeCoreRecord",
  ]) {
    requireIncludes(modelSource, `export function ${symbol}`, "MISSING_MODEL_EXPORT", "G3-C model export missing.");
    requireIncludes(testSource, symbol, "MISSING_MODEL_TEST", "G3-C model export missing test coverage.");
  }

  requireIncludes(indexSource, `export * from "./model.js";`, "MISSING_INDEX_EXPORT", "Intake package must export G3-C model layer.");

  for (const marker of [
    "INTAKE_CORE_MODEL_DEFINITIONS",
    "immutable_snapshot",
    "hit_source_audit_required",
    "intake_to_matter_clearance_required",
    "g3_runtime_readiness_claim",
  ]) {
    requireIncludes(modelSource, marker, "MISSING_MODEL_MARKER", "G3-C model source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g3c:validate"] !== "node scripts/validate-client-matter-os-g3-c.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g3c:validate.");
  }

  if (contract.program?.program_id !== "RP10" || contract.program?.descriptor_only !== true) {
    addFinding("INTAKE_CONTRACT_BOUNDARY", "Intake contract must remain RP10 descriptor-only evidence.");
  }

  const modelTypes = listIntakeCoreModelTypes();
  for (const modelType of ["IntakeRequest", "ConflictCheck", "ConflictHit"]) {
    if (!modelTypes.includes(modelType)) addFinding("MODEL_TYPE_LIST", "Intake model type list missing G3-C model.", { modelType });
  }

  const tenant_id = "tenant_g3c_validator";
  const owner_user_id = "user_g3c_validator";
  const party_ids = ["party_g3c_client", "party_g3c_counterparty"];
  const intakeRequest = createIntakeCoreIntakeRequest({
    intake_request_id: "intake_g3c_validator",
    tenant_id,
    opportunity_id: "opportunity_g3c_validator",
    requesting_party_id: party_ids[0],
    party_ids,
    status: "open",
    owner_user_id,
  });

  const snapshotSource = {
    party_ids,
    aliases: [{ party_id: party_ids[0], alias_value: "Validator Client" }],
  };
  const conflictCheck = createIntakeCoreConflictCheck({
    conflict_check_id: "conflict_check_g3c_validator",
    tenant_id,
    intake_request_id: intakeRequest.intake_request_id,
    party_snapshot: snapshotSource,
    snapshot_recorded_at: "2026-06-19T00:00:00.000Z",
    status: "snapshot_recorded",
    owner_user_id,
  });
  snapshotSource.aliases[0].alias_value = "MUTATED";

  const conflictHit = createIntakeCoreConflictHit({
    conflict_hit_id: "conflict_hit_g3c_validator",
    tenant_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    matched_party_id: party_ids[1],
    hit_source: "former_matter",
    source_record_ref: "former_matter:validator",
    severity: "high",
    audit_hint_ref: "audit_hint_g3c_validator",
    status: "review_required",
    owner_user_id,
  });

  const records = [
    ["IntakeRequest", intakeRequest],
    ["ConflictCheck", conflictCheck],
    ["ConflictHit", conflictHit],
  ];

  for (const [modelType, record] of records) {
    const validation = validateIntakeCoreRecord(modelType, record);
    if (!validation.valid) addFinding("MODEL_VALIDATION", "G3-C record must validate.", { modelType, errors: validation.errors });
    if (record.tenant_id !== tenant_id) addFinding("TENANT_SCOPE", "G3-C record must preserve tenant_id.", { modelType });
    if (record.writes_product_state !== false) addFinding("WRITE_BOUNDARY", "G3-C record must remain no-write.", { modelType });
    if (record.dispatches_intake_runtime !== false) addFinding("RUNTIME_BOUNDARY", "G3-C record must not claim Intake runtime.", { modelType });
    if (record.g3_runtime_readiness_claim !== "open") addFinding("G3_READINESS_BOUNDARY", "G3 readiness must remain open.", { modelType });
  }

  if (intakeRequest.party_ids.length !== 2 || intakeRequest.matter_id !== null || intakeRequest.creates_matter !== false) {
    addFinding("INTAKE_REQUEST_PARTIES", "IntakeRequest must preserve required Party references and block Matter creation.");
  }

  if (
    conflictCheck.immutable_snapshot !== true ||
    !Object.isFrozen(conflictCheck.party_snapshot) ||
    conflictCheck.party_snapshot.aliases[0].alias_value !== "Validator Client"
  ) {
    addFinding("CONFLICT_SNAPSHOT", "ConflictCheck snapshot must be immutable and isolated from source mutation.");
  }

  const hitValidation = validateIntakeCoreRecord("ConflictHit", conflictHit);
  if (!hitValidation.review_required_claims.includes("conflict_hit_source_audit_required")) {
    addFinding("CONFLICT_HIT_AUDIT", "ConflictHit must preserve hit-source audit review claim.");
  }

  const factoryRecord = createIntakeCoreRecord("IntakeRequest", {
    intake_request_id: "intake_g3c_factory",
    tenant_id,
    opportunity_id: "opportunity_g3c_factory",
    requesting_party_id: party_ids[0],
    party_ids,
    status: "open",
    owner_user_id,
  });
  if (factoryRecord.model_type !== "IntakeRequest") addFinding("FACTORY_DISPATCH", "createIntakeCoreRecord must dispatch IntakeRequest.");
}

if (findings.length > 0) {
  console.error("Client-Matter OS G3-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G3-C validation passed.");
console.log("g3c_tuws: LFOS-G3-W04-T001/LFOS-G3-W04-T002/LFOS-G3-W04-T003");
console.log("intake_schema_models: IntakeRequest/ConflictCheck/ConflictHit");
console.log("party_references: intake_request_required_parties");
console.log("conflict_snapshot: immutable");
console.log("hit_source_audit: required");
console.log("g3_runtime_readiness_claim: open");
