#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PEOPLE_FEATURE_ITEMS, getPeopleFeatureBySection } from "../apps/web/src/people/peopleFeatureCatalog.js";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fileExists(path) {
  return existsSync(resolve(path));
}

const ledgerPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-task-ledger.json";
const browserProofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-navigation-browser-proof.json";
const packageJson = readJson("package.json");
const ledger = readJson(ledgerPath);
const browserProof = readJson(browserProofPath);

assert.equal(ledger.schema_version, "lawos.lcx_hrx_sft.task_ledger.v0.1");
assert.equal(ledger.claim_boundary.roster_source_of_truth_preserved, true);
assert.equal(ledger.claim_boundary.people_navigation_catalog_complete, true);
assert.equal(ledger.claim_boundary.external_schedule_under_work_schedule, true);
assert.equal(ledger.claim_boundary.runtime_ui_validated, true);
assert.equal(ledger.claim_boundary.browser_qa_complete, true);
assert.equal(ledger.claim_boundary.payroll_provider_live, false);
assert.equal(ledger.claim_boundary.electronic_contract_provider_live, false);
assert.equal(ledger.claim_boundary.production_ready, false);
assert.equal(ledger.claim_boundary.go_live_approved, false);

assert.equal(packageJson.scripts?.["lcx:hrx-sft:catalog:validate"], "node scripts/validate-lcx-hrx-sft-feature-catalog.mjs");
assert.equal(packageJson.scripts?.["lcx:hrx-sft:roster:validate"], "node scripts/validate-lcx-hrx-sft-roster-source.mjs");
assert.equal(packageJson.scripts?.["lcx:hrx-sft:validate"], "node scripts/validate-lcx-hrx-sft-completion.mjs");

for (const path of [
  ledger.evidence.plan,
  ledger.evidence.baseline_receipt,
  ledger.evidence.feature_catalog,
  ledger.evidence.catalog_validator,
  ledger.evidence.roster_validator,
  ledger.evidence.browser_proof,
  ledger.evidence.roster_source_of_truth,
  ledger.evidence.roster_registry
]) {
  assert.ok(fileExists(path), `missing evidence file: ${path}`);
}

for (const task of ledger.tasks) {
  assert.notEqual(task.status, "pending", `${task.id} is still pending`);
  assert.notEqual(task.status, "unclassified", `${task.id} is still unclassified`);
}

assert.equal(PEOPLE_FEATURE_ITEMS.length, 71);
assert.equal(getPeopleFeatureBySection("people-work-schedule-external")?.groupLabel, "근무일정");
assert.equal(browserProof.verdict, "PASS");
assert.equal(browserProof.roster.has_kim_yang_tae, true);
assert.equal(browserProof.roster.has_petra_bridge_partners, true);
assert.equal(browserProof.roster.has_finance, true);
assert.equal(browserProof.external_schedule.has_court, true);
assert.equal(browserProof.external_schedule.has_prosecutor, true);
assert.equal(browserProof.external_schedule.has_post_office, true);
assert.equal(browserProof.external_schedule.has_tax_office, true);
assert.equal(browserProof.external_schedule.has_agency, true);
assert.equal(browserProof.external_schedule.has_setup_state, true);
assert.ok(fileExists(browserProof.roster.screenshot), "roster screenshot missing");
assert.ok(fileExists(browserProof.external_schedule.screenshot), "external schedule screenshot missing");

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: ledger.program_id,
  task_count: ledger.tasks.length,
  feature_items: PEOPLE_FEATURE_ITEMS.length,
  no_pending_tasks: ledger.tasks.every((task) => task.status !== "pending" && task.status !== "unclassified"),
  browser_qa_complete: ledger.claim_boundary.browser_qa_complete,
  provider_claims_live: {
    payroll: ledger.claim_boundary.payroll_provider_live,
    electronic_contract: ledger.claim_boundary.electronic_contract_provider_live
  },
  production_ready: ledger.claim_boundary.production_ready,
  go_live_approved: ledger.claim_boundary.go_live_approved
}, null, 2));
