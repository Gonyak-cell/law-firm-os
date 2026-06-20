#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MV_ROOT = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4");
const LAUNCH_ROOT = path.join(MV_ROOT, "launch");

const errors = [];
const currentBoundary = "repo_implementation_evidence_closeout_complete__owner_authority_received__external_receipts_absent";
const targetState = "owner_authorized_launch_with_external_smoke_and_migration_receipts";
const currentDecision = "owner_authorized_release_cutover_pending_external_receipts";

function add(message) {
  errors.push(message);
}

function read(file) {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function exists(file) {
  return existsSync(path.join(ROOT, file));
}

function requireFile(file) {
  if (!exists(file)) add(`${file}: missing`);
}

function requireText(file, phrases) {
  if (!exists(file)) return;
  const text = read(file);
  for (const phrase of phrases) {
    if (!text.includes(phrase)) add(`${file}: missing phrase ${phrase}`);
  }
}

function requireRegex(file, patterns) {
  if (!exists(file)) return;
  const text = read(file);
  for (const pattern of patterns) {
    if (!pattern.test(text)) add(`${file}: missing marker ${pattern.source}`);
  }
}

function assert(condition, message) {
  if (!condition) add(message);
}

const requiredFiles = [
  "contracts/matter-vault-r4-launch-readiness.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/package-manifest.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/launch-readiness.md",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/go-no-go-checklist.md",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/cutover-rollback-runbook.md",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/production-smoke-plan.md",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/uat-results.md",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/owner-decision-template.md",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/owner-release-authority-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/launch-readiness-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/migration-dry-run-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/rollback-rehearsal-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/backfill-matter-vault-links-dry-run.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/backfill-vault-workspaces-dry-run.json",
];

for (const file of requiredFiles) requireFile(file);

if (errors.length === 0) {
  const contract = readJson("contracts/matter-vault-r4-launch-readiness.json");
  const manifest = readJson("docs/reorganization/client-matter-os/matter-vault-r4/package-manifest.json");
  const receipt = readJson("docs/reorganization/client-matter-os/matter-vault-r4/launch/launch-readiness-receipt.json");
  const ownerReceipt = readJson("docs/reorganization/client-matter-os/matter-vault-r4/launch/owner-release-authority-receipt.json");
  const migrationReceipt = readJson("docs/reorganization/client-matter-os/matter-vault-r4/launch/migration-dry-run-receipt.json");
  const rollbackReceipt = readJson("docs/reorganization/client-matter-os/matter-vault-r4/launch/rollback-rehearsal-receipt.json");
  const linkDryRun = readJson("docs/reorganization/client-matter-os/matter-vault-r4/backfill-matter-vault-links-dry-run.json");
  const workspaceDryRun = readJson("docs/reorganization/client-matter-os/matter-vault-r4/backfill-vault-workspaces-dry-run.json");
  const packageJson = readJson("package.json");

  assert(contract.schema_version === "law-firm-os.matter-vault-r4-launch-readiness.v0.1", "launch contract schema mismatch");
  assert(contract.current_boundary === currentBoundary, "launch contract current boundary mismatch");
  assert(contract.target_state === targetState, "launch contract target state mismatch");
  assert(contract.claim_policy?.owner_signoff_required === true, "launch contract must require owner signoff");
  assert(contract.claim_policy?.external_production_smoke_required === true, "launch contract must require external production smoke");
  assert(contract.claim_policy?.migration_operator_receipt_required === true, "launch contract must require migration operator receipt");
  assert(contract.claim_policy?.rollback_rehearsal_receipt_required === true, "launch contract must require rollback rehearsal receipt");
  assert(contract.claim_policy?.launch_authorization_claim_allowed === false, "launch authorization claim must remain false");
  assert(contract.claim_policy?.go_live_claim_allowed === false, "go live claim must remain false");
  assert(contract.claim_policy?.production_ready_claim_allowed === false, "production ready claim must remain false");

  const gateIds = new Set((contract.required_gates ?? []).map((gate) => gate.id));
  for (const id of ["MV-LG-01", "MV-LG-02", "MV-LG-03", "MV-LG-04", "MV-LG-05", "MV-LG-06", "MV-LG-07", "MV-LG-08", "MV-LG-09", "MV-LG-10", "MV-LG-11"]) {
    assert(gateIds.has(id), `launch contract missing gate ${id}`);
  }

  assert(manifest.closed_tuws === 118, "manifest closed_tuws must remain 118");
  assert(manifest.not_closed_tuws === 0, "manifest not_closed_tuws must remain 0");
  assert(manifest.production_ready_claim === false, "manifest production_ready_claim must remain false");
  assert(manifest.go_live_claim === false, "manifest go_live_claim must remain false");
  assert(manifest.launch_readiness_lane?.current_boundary === currentBoundary, "manifest launch readiness boundary mismatch");
  assert(manifest.launch_readiness_lane?.owner_release_authority_received === true, "manifest owner release authority must be received");
  assert(manifest.launch_readiness_lane?.external_production_smoke_receipt_received === false, "manifest external production smoke must remain false");
  assert(manifest.launch_readiness_lane?.migration_operator_receipt_received === false, "manifest migration operator receipt must remain false");
  assert(manifest.launch_readiness_lane?.launch_authorization_claim === false, "manifest launch authorization claim must remain false");

  assert(receipt.current_boundary === currentBoundary, "launch receipt boundary mismatch");
  assert(receipt.repo_evidence_complete === true, "launch receipt must record repo evidence complete");
  assert(receipt.closed_tuws === 118 && receipt.not_closed_tuws === 0, "launch receipt TUW counts mismatch");
  assert(receipt.external_production_smoke_receipt_received === false, "external production smoke receipt must remain false");
  assert(receipt.owner_release_authority_received === true, "owner release authority must be received");
  assert(receipt.current_decision === currentDecision, "launch receipt current decision mismatch");
  assert(receipt.launch_authorization_claim === false, "launch receipt launch authorization claim must remain false");
  assert(receipt.go_live_claim === false, "launch receipt go_live_claim must remain false");
  assert(receipt.production_ready_claim === false, "launch receipt production_ready_claim must remain false");

  assert(ownerReceipt.schema_version === "law-firm-os.matter-vault-r4-owner-release-authority-receipt.v0.1", "owner receipt schema mismatch");
  assert(ownerReceipt.owner_release_authority_received === true, "owner receipt must record authority received");
  assert(ownerReceipt.scope === "release_cutover_progression", "owner receipt scope mismatch");
  assert(ownerReceipt.approved_baseline?.merge_commit === "75f82b3b87f45e95ffbb3d50f2f39982fc3ea239", "owner receipt baseline merge commit mismatch");
  assert(ownerReceipt.external_production_smoke_receipt_received === false, "owner receipt must keep external production smoke false");
  assert(ownerReceipt.production_migration_operator_receipt_received === false, "owner receipt must keep production migration operator false");
  assert(ownerReceipt.launch_authorization_claim === false, "owner receipt launch authorization claim must remain false");
  assert(ownerReceipt.go_live_claim === false, "owner receipt go_live_claim must remain false");
  assert(ownerReceipt.production_ready_claim === false, "owner receipt production_ready_claim must remain false");

  assert(migrationReceipt.dry_run === true, "migration receipt must be dry-run");
  assert(Array.isArray(migrationReceipt.failed_rows) && migrationReceipt.failed_rows.length === 0, "migration receipt failed_rows must be empty");
  assert(migrationReceipt.production_migration_operator_receipt_received === false, "migration operator receipt must remain false");
  assert(rollbackReceipt.production_restore_evidence_claimed === false, "rollback receipt must not claim production restore evidence");
  assert(rollbackReceipt.owner_release_authority_received === false, "rollback receipt must not claim owner authority");

  assert(linkDryRun.dry_run === true, "MatterVaultLink backfill receipt must be dry-run");
  assert(Array.isArray(linkDryRun.failed_rows) && linkDryRun.failed_rows.length === 0, "MatterVaultLink backfill failed_rows must be empty");
  assert(workspaceDryRun.dry_run === true, "Vault workspace backfill receipt must be dry-run");
  assert(Array.isArray(workspaceDryRun.failed_rows) && workspaceDryRun.failed_rows.length === 0, "Vault workspace backfill failed_rows must be empty");

  assert(packageJson.scripts?.["matter-vault:r4:launch:validate"] === "node scripts/validate-matter-vault-r4-launch-readiness.mjs", "package script matter-vault:r4:launch:validate missing");

  requireText("docs/reorganization/client-matter-os/matter-vault-r4/launch/launch-readiness.md", [
    currentBoundary,
    "It does not authorize actual launch/go-live completed or production-ready completed claims.",
  ]);
  requireText("docs/reorganization/client-matter-os/matter-vault-r4/launch/go-no-go-checklist.md", [
    `Current decision: \`${currentDecision}\``,
    "Automation cannot convert this checklist into a launch decision.",
  ]);
  requireText("docs/reorganization/client-matter-os/matter-vault-r4/launch/cutover-rollback-runbook.md", [
    "This runbook is a release-control template.",
    "Owner release authority makes the launch decision outside automation.",
  ]);
  requireRegex("docs/reorganization/client-matter-os/matter-vault-r4/launch/production-smoke-plan.md", [
    /External production smoke receipt is absent|not an external production receipt|Pending smoke cases do not authorize launch/,
  ]);
  requireText("docs/reorganization/client-matter-os/matter-vault-r4/launch/owner-decision-template.md", [
    `Current decision | \`${currentDecision}\``,
    "Owner release authority received | true",
    "External production smoke receipt received | false",
  ]);
}

const forbidden = [
  /"launch_authorization_claim"\s*:\s*true/i,
  /"go_live_claim"\s*:\s*true/i,
  /"production_ready_claim"\s*:\s*true/i,
  /current_decision"\s*:\s*"authorized/i,
];

for (const file of [
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/launch-readiness-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/owner-release-authority-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/migration-dry-run-receipt.json",
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/rollback-rehearsal-receipt.json",
]) {
  if (!exists(file)) continue;
  const source = read(file);
  for (const pattern of forbidden) {
    if (pattern.test(source)) add(`${file}: forbidden launch claim ${pattern.source}`);
  }
}

if (errors.length > 0) {
  console.error("Matter-Vault R4 launch readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault R4 launch readiness validation passed.");
console.log(`current_boundary: ${currentBoundary}`);
console.log("closed_tuws: 118");
console.log("launch_authorization_claim: false");
console.log("owner_release_authority_received: true");
console.log("external_production_smoke_receipt_received: false");
console.log("production_migration_operator_receipt_received: false");
