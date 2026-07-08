#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-build-s3-s4-code-prep";
const APPROVAL_REF = "I10-CTI-BUILD-S3-S4-CODE-PREP-OWNER-APPROVAL-2026-07-06";
const CANONICAL_TENANT_ID = "tenant_amic_matter_vault";
const CLOSEOUT_DIR = path.join(ROOT, "docs/goal-closeout/cti-build-s3-s4-code-prep");
const CROSSWALK_JSON_PATH = path.join(ROOT, "docs/launch/cti-build-s3-s4-code-prep-crosswalk-2026-07-06.json");

const errors = [];

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(filePath) {
  if (!existsSync(filePath)) {
    errors.push(`missing file: ${rel(filePath)}`);
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  const text = read(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`invalid JSON: ${rel(filePath)}: ${error.message}`);
    return null;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const approval = readJson(path.join(ROOT, "docs/launch/cti-i10-owner-approval-receipt-2026-07-06.json"));
assert(approval?.approval_signature_ref === APPROVAL_REF, "I10 approval_ref missing or mismatched");
assert(approval?.status === "recorded", "I10 approval must be recorded");
assert(approval?.production_tenant_migration_executed === false, "I10 receipt must not record tenant migration execution");
assert(approval?.production_account_permission_injection_executed === false, "I10 receipt must not record account/permission injection execution");
assert(approval?.cutover_executed === false, "I10 receipt must not record CUTOVER execution");

const candidateModulePath = path.join(ROOT, "packages/matter/src/amic-matter-code-candidates.js");
const candidatesSource = read(candidateModulePath);
const candidatesModule = await import(`${pathToFileURL(candidateModulePath).href}?validate=${Date.now()}`);
assert(
  candidatesModule.AMIC_CURRENT_MATTER_CODES_SCHEMA_VERSION === "lawos.amic_matter_codes.v1",
  "AMIC current matter code schema version must be lawos.amic_matter_codes.v1",
);
const currentMatterCandidates = candidatesModule.AMIC_CURRENT_MATTER_CODE_CANDIDATES ?? [];
assert(currentMatterCandidates.length === 148, "AMIC current matter candidate count must be 148");
assert(
  currentMatterCandidates.every((matter) => !Object.hasOwn(matter, "tenant_id")),
  "AMIC current matter candidates must not carry tenant_id",
);
assert(!candidatesSource.includes('"tenant_id": "tenant_rp05_synthetic"'), "candidate source still contains synthetic tenant_id");

const generatorSource = read(path.join(ROOT, "scripts/generate-amic-matter-code-candidates.mjs"));
assert(generatorSource.includes("AMIC_CURRENT_MATTER_CODES_SCHEMA_VERSION"), "candidate generator must emit schema version");
assert(!generatorSource.includes('tenant_id: "tenant_rp05_synthetic"'), "candidate generator must not emit fixed synthetic tenant_id");

const runtimeSource = read(path.join(ROOT, "apps/api/src/matter-runtime-context.js"));
assert(!runtimeSource.includes("const DEFAULT_TENANT"), "matter runtime must not keep DEFAULT_TENANT");
assert(runtimeSource.includes("MATTER_RUNTIME_CANONICAL_TENANT_ID"), "matter runtime must expose canonical tenant constant");
assert(runtimeSource.includes("LAWOS_CURRENT_MATTER_CODE_SEED_TENANT"), "matter runtime must expose seed tenant env");
assert(runtimeSource.includes("current_matter_code_tenant_id"), "matter runtime seed must record current matter code tenant");
assert(runtimeSource.includes("LAWOS_VAULT_BRIDGE_ENABLED"), "bridge enabled control env missing");
assert(runtimeSource.includes("LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS"), "bridge tenant allow-list env missing");
assert(runtimeSource.includes("LAWOS_VAULT_BRIDGE_SERVICE_ACTOR_ID"), "bridge service actor env missing");
assert(runtimeSource.includes("tenantAllowedByVaultBridge"), "bridge tenant allow-list check missing");
assert(runtimeSource.includes("actor_id: controls.serviceActorId"), "bridge upserts must use service actor identity");
assert(!runtimeSource.includes("actor_id: body?.migrationOperatorRef"), "bridge upserts must not trust caller-supplied actor identity");

const sessionSource = read(path.join(ROOT, "apps/api/src/session-auth.js"));
assert(sessionSource.includes("tenant_refs: tenantRefsForSession"), "session envelope must expose tenant_refs");
assert(sessionSource.includes("tenant_ids: Object.freeze([...tenantIds])"), "session envelope must expose tenant_ids");
assert(sessionSource.includes("synthetic_only: !tenantIds.includes"), "session synthetic_only must derive from tenant membership");

const accountRegistrySource = read(path.join(ROOT, "apps/api/src/matter-vault-account-registry.js"));
assert(accountRegistrySource.includes("tenant_ids: Object.freeze(tenantIds)"), "account registry public refs must expose tenant_ids");
assert(accountRegistrySource.includes("production_status"), "account registry public refs must expose production_status");
assert(accountRegistrySource.includes("qa_tenant_scope"), "account registry public refs must expose qa_tenant_scope");

const bridgeScriptSource = read(path.join(ROOT, "scripts/run-current-matter-codes-production-bridge-upsert.mjs"));
assert(bridgeScriptSource.includes(`?? "${CANONICAL_TENANT_ID}"`), "bridge upsert script default tenant must be canonical");
assert(!bridgeScriptSource.includes('?? "tenant_rp05_synthetic"'), "bridge upsert script must not default to synthetic tenant");
assert(bridgeScriptSource.includes("LAWOS_CURRENT_MATTER_CODE_BRIDGE_EXECUTE"), "bridge upsert script must require explicit execute env");
assert(bridgeScriptSource.includes("dryRunReport"), "bridge upsert script must have a dry-run report path");
assert(bridgeScriptSource.includes("remote_production_bridge_write_executed: false"), "bridge dry-run must record no remote production write");

const seedPath = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json");
const userSeed = readJson(seedPath);
const users = userSeed?.users ?? [];
const qaUsers = users.filter((user) => ["matter.desktop.qa@amic.kr", "qa.tenant-b@amic.kr"].includes(user.email));
assert(qaUsers.length === 2, "two QA accounts must be present");
for (const user of qaUsers) {
  assert(user.status === "active", `${user.email}: status must remain active for existing validators`);
  assert(user.production_status === "disabled", `${user.email}: production_status must be disabled`);
  assert(user.qa_tenant_scope === "synthetic_only", `${user.email}: qa_tenant_scope must be synthetic_only`);
}

const seedValidatorSource = read(path.join(ROOT, "scripts/validate-matter-vault-user-registration-seed.mjs"));
assert(seedValidatorSource.includes("QA production_status must be disabled"), "seed validator must enforce QA production disabled guard");
assert(seedValidatorSource.includes("QA tenant scope must be synthetic_only"), "seed validator must enforce QA tenant scope guard");

const closeoutFiles = [
  "packet.json",
  "command-evidence.json",
  "adjudication.md",
  "construction-inspection.json",
  "claude-review-result.json",
];
for (const file of closeoutFiles) assert(existsSync(path.join(CLOSEOUT_DIR, file)), `missing closeout file: ${file}`);

const packet = readJson(path.join(CLOSEOUT_DIR, "packet.json"));
assert(packet?.goal_id === GOAL_ID, "closeout packet goal_id mismatch");
assert(packet?.approval_signature_refs?.includes(APPROVAL_REF), "closeout packet must include I10 approval_ref");
assert(packet?.build_g?.status === "PASS", "closeout packet BUILD-G status must be PASS");
assert(packet?.authority_boundary?.s3_tenant_migration_executed === false, "packet must record no S3 tenant migration execution");
assert(packet?.authority_boundary?.s4_production_account_permission_injection_executed === false, "packet must record no S4 production account/permission injection execution");
assert(packet?.authority_boundary?.cutover_executed === false, "packet must record no CUTOVER execution");
assert(packet?.authority_boundary?.production_ready_claim === false, "packet must not claim production_ready");
assert(packet?.authority_boundary?.go_live_claim === false, "packet must not claim go-live");
assert(packet?.pii_safe_evidence?.plaintext_pii_recorded === false, "packet must record no plaintext PII evidence");
assert(packet?.pii_safe_evidence?.secret_or_token_value_recorded === false, "packet must record no secret/token evidence");

const commandEvidence = readJson(path.join(CLOSEOUT_DIR, "command-evidence.json"));
assert(commandEvidence?.goal_id === GOAL_ID, "command evidence goal_id mismatch");
assert(commandEvidence?.boundary?.s3_execution === false, "command evidence must record s3_execution=false");
assert(commandEvidence?.boundary?.s4_execution === false, "command evidence must record s4_execution=false");
assert(commandEvidence?.boundary?.cutover_execution === false, "command evidence must record cutover_execution=false");
assert(commandEvidence?.boundary?.production_ready_claim === false, "command evidence must record production_ready_claim=false");
assert(commandEvidence?.boundary?.go_live_claim === false, "command evidence must record go_live_claim=false");

const bridgeDryRunEvidence = readJson(path.join(CLOSEOUT_DIR, "bridge-upsert-dry-run-evidence.json"));
assert(bridgeDryRunEvidence?.dry_run === true, "bridge dry-run evidence must record dry_run=true");
assert(bridgeDryRunEvidence?.tenant_id === CANONICAL_TENANT_ID, "bridge dry-run evidence must use canonical tenant");
assert(bridgeDryRunEvidence?.client_upserts?.total === 99, "bridge dry-run evidence must count 99 client upserts");
assert(bridgeDryRunEvidence?.matter_upserts?.total === 148, "bridge dry-run evidence must count 148 matter upserts");
assert(
  bridgeDryRunEvidence?.boundary?.remote_production_bridge_write_executed === false,
  "bridge dry-run evidence must record remote_production_bridge_write_executed=false",
);

const crosswalk = readJson(CROSSWALK_JSON_PATH);
assert(crosswalk?.goal_id === GOAL_ID, "crosswalk goal_id mismatch");
assert(crosswalk?.work_package === "LT-PRE-W14", "crosswalk work package must be LT-PRE-W14");
for (const ctiId of ["S3-T01", "S3-T05", "S3-T06", "S3-T07", "S3-T08", "S4-T02", "S4-T04a"]) {
  assert(crosswalk?.cti_to_tuw?.[ctiId], `crosswalk missing ${ctiId}`);
}
assert(crosswalk?.non_execution_boundary?.s3_execution === false, "crosswalk must record no S3 execution");
assert(crosswalk?.non_execution_boundary?.s4_execution === false, "crosswalk must record no S4 execution");
assert(crosswalk?.non_execution_boundary?.cutover_execution === false, "crosswalk must record no CUTOVER execution");

const ledger = readJson(path.join(ROOT, "workbook/launch-tuw/launch-tuw-ledger.json"));
assert(ledger?.work_packages?.some((wp) => wp.wp_id === "LT-PRE-W14" && wp.goal_id === GOAL_ID), "launch-TUW ledger missing LT-PRE-W14 work package");
for (let index = 1; index <= 6; index += 1) {
  assert(ledger?.tuws?.some((tuw) => tuw.id === `LT-PRE-W14-T0${index}`), `launch-TUW ledger missing LT-PRE-W14-T0${index}`);
}

if (errors.length > 0) {
  console.error("CTI BUILD S3/S4 code-only prep validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const result = {
  schema_version: "law-firm-os.cti-build-s3-s4-code-prep-validator.v0.1",
  goal_id: GOAL_ID,
  verdict: "PASS",
  build_g: "PASS",
  approval_ref: APPROVAL_REF,
  candidate_count: currentMatterCandidates.length,
  candidate_source_hash: sha256(candidatesSource),
  closeout_dir: rel(CLOSEOUT_DIR),
  crosswalk_json: rel(CROSSWALK_JSON_PATH),
  boundary: {
    s3_execution: false,
    s4_execution: false,
    cutover_execution: false,
    production_migration_write: false,
    password_issuance_distribution: false,
    bridge_token_actual_rotation: false,
    production_ready_claim: false,
    go_live_claim: false,
  },
};
console.log(JSON.stringify(result, null, 2));
