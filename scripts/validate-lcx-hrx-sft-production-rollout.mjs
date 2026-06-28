#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fileExists(path) {
  return existsSync(resolve(path));
}

const ledgerPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-production-execution-ledger-2026-06-28.json";
const planPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-production-rollout-tuw-plan-2026-06-28.md";
const navigationBrowserProofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-people-navigation-browser-proof.json";
const localBrowserProofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-production-local-browser-proof-2026-06-28.json";
const productionDeploySuccessReceiptPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-production-deploy-success-receipt-2026-06-28.json";
const packageJson = readJson("package.json");
const ledger = readJson(ledgerPath);
const plan = read(planPath);
const navigationBrowserProof = readJson(navigationBrowserProofPath);
const localBrowserProof = readJson(localBrowserProofPath);
const productionDeploySuccessReceipt = fileExists(productionDeploySuccessReceiptPath)
  ? readJson(productionDeploySuccessReceiptPath)
  : null;

const expectedIds = Array.from({ length: 21 }, (_, index) => `LCX-HRX-PROD-${String(index).padStart(2, "0")}`);
const tuwIds = ledger.tuws.map((tuw) => tuw.id);

assert.equal(ledger.schema_version, "lawos.lcx_hrx_sft.production_rollout_execution.v0.1");
assert.equal(ledger.source_plan, planPath);
assert.equal(packageJson.scripts?.["lcx:hrx-sft:production-rollout:validate"], "node scripts/validate-lcx-hrx-sft-production-rollout.mjs");
assert.deepEqual(tuwIds, expectedIds, "production rollout ledger must enumerate every TUW exactly once and in order");

for (const id of expectedIds) {
  assert.ok(plan.includes(id), `source TUW plan missing ${id}`);
}

for (const [claim, value] of Object.entries(ledger.claim_boundary)) {
  if (claim === "production_deployed" && productionDeploySuccessReceipt) {
    assert.equal(value, true, "production_deployed may be true only with the production deploy success receipt");
  } else {
    assert.equal(value, false, `${claim} must remain false until its external receipt exists`);
  }
}

const tuwById = new Map(ledger.tuws.map((tuw) => [tuw.id, tuw]));
for (const id of expectedIds.slice(0, 11)) {
  assert.equal(tuwById.get(id)?.status, "done-local", `${id} must be closed locally before release-candidate work`);
}
const tuw11 = tuwById.get("LCX-HRX-PROD-11");
assert.ok(["ready", "done-remote"].includes(tuw11?.status), "LCX-HRX-PROD-11 must be ready or backed by commit/PR evidence");
if (tuw11?.status === "done-remote") {
  assert.match(tuw11.release_candidate_commit_sha ?? "", /^[0-9a-f]{7,40}$/);
  assert.match(tuw11.pr_url ?? "", /^https:\/\/github\.com\/.+\/pull\/\d+$/);
  assert.equal(tuw11.production_claims_remain_false, true);
  assert.equal(tuw11.go_live_claim_remains_false, true);
}
const blockedAfterRelease = productionDeploySuccessReceipt
  ? expectedIds.slice(12, 18)
  : expectedIds.slice(12);
for (const id of blockedAfterRelease) {
  assert.equal(tuwById.get(id)?.status, "blocked", `${id} must remain blocked until its upstream external receipt exists`);
  assert.ok(tuwById.get(id)?.blocked_by, `${id} requires a blocked_by explanation`);
}
if (productionDeploySuccessReceipt) {
  for (const id of expectedIds.slice(18)) {
    assert.equal(tuwById.get(id)?.status, "done-remote", `${id} must be done-remote when production deployment succeeded`);
    assert.ok(
      tuwById.get(id)?.proof?.includes(productionDeploySuccessReceiptPath),
      `${id} must cite the production deploy success receipt`
    );
  }
}

const proofPaths = new Set();
for (const tuw of ledger.tuws) {
  for (const path of tuw.proof ?? []) proofPaths.add(path);
}
for (const path of [
  ledgerPath,
  ledger.source_plan,
  ledger.parent_plan,
  ...ledger.release_payload.in_scope,
  ...proofPaths
]) {
  assert.ok(fileExists(path), `missing production rollout evidence: ${path}`);
}

const excludedPaths = ledger.release_payload.excluded.map((entry) => entry.path);
assert.ok(excludedPaths.includes("docs/ui-reference/prototypes/matter-launch-login-dashboard-2026-06-25.html"), "prototype HTML must stay excluded");
assert.ok(excludedPaths.includes("scripts/generate-sf-client-matter-surface-ledger.mjs"), "SF/client-matter tooling must stay excluded");

for (const [name, receipt] of Object.entries(ledger.local_validation_receipts)) {
  if (name === "sloplint_changed") {
    assert.equal(receipt.status, "REVIEWED");
    assert.equal(receipt.blocking_findings, 0);
  } else {
    assert.equal(receipt.status, "PASS", `${name} must pass before TUW-11`);
  }
}

assert.equal(localBrowserProof.verdict, "PASS");
assert.equal(navigationBrowserProof.verdict, "PASS");
assert.ok(fileExists(navigationBrowserProof.roster.screenshot), `missing roster screenshot: ${navigationBrowserProof.roster.screenshot}`);
assert.ok(
  fileExists(navigationBrowserProof.external_schedule.screenshot),
  `missing external schedule screenshot: ${navigationBrowserProof.external_schedule.screenshot}`
);
assert.equal(localBrowserProof.checks.members.has_kim_yang_tae, true);
assert.equal(localBrowserProof.checks.external_schedule.has_court, true);
assert.equal(localBrowserProof.checks.external_schedule.has_prosecutor, true);
assert.equal(localBrowserProof.checks.external_schedule.has_post_office, true);
assert.equal(localBrowserProof.checks.external_schedule.has_tax_office, true);
assert.equal(localBrowserProof.checks.external_schedule.has_agency, true);
assert.equal(localBrowserProof.checks.lifecycle.body_overflow_clear, true);
assert.equal(localBrowserProof.checks.drawer_parity.notification_right_edge_zero, true);
assert.equal(localBrowserProof.checks.drawer_parity.people_detail_right_edge_zero, true);
assert.equal(localBrowserProof.checks.drawer_parity.same_width, true);
assert.equal(localBrowserProof.checks.drawer_parity.same_layer_z_index, true);
assert.equal(localBrowserProof.checks.drawer_parity.same_animation_name, true);
assert.equal(localBrowserProof.api_5xx_count, 0);
assert.deepEqual(localBrowserProof.unexpected_console_messages, []);
assert.deepEqual(localBrowserProof.page_errors, []);
assert.ok(localBrowserProof.non_claims.includes("no production deployment claim"));
assert.ok(localBrowserProof.non_claims.includes("no go-live approval claim"));

if (productionDeploySuccessReceipt) {
  assert.equal(productionDeploySuccessReceipt.schema_version, "lawos.lcx_hrx_sft.production_deploy_success_receipt.v0.1");
  assert.equal(productionDeploySuccessReceipt.source.runtime_deploy_ref, "origin/main");
  assert.match(productionDeploySuccessReceipt.source.runtime_deploy_commit, /^[0-9a-f]{40}$/);
  assert.equal(productionDeploySuccessReceipt.web_deployment.s3_sync_executed, true);
  assert.equal(productionDeploySuccessReceipt.web_deployment.cloudfront_invalidation_status, "Completed");
  assert.equal(productionDeploySuccessReceipt.web_deployment.root_status, 200);
  assert.equal(productionDeploySuccessReceipt.web_deployment.root_asset_js, "assets/index-BrLnLC97.js");
  assert.equal(productionDeploySuccessReceipt.web_deployment.root_asset_css, "assets/index-x40NzoCF.css");
  assert.equal(productionDeploySuccessReceipt.api_deployment.lambda_state, "Active");
  assert.equal(productionDeploySuccessReceipt.api_deployment.lambda_last_update_status, "Successful");
  assert.equal(
    productionDeploySuccessReceipt.api_deployment.lambda_environment.LAWOS_DEPLOYMENT_COMMIT,
    productionDeploySuccessReceipt.source.runtime_deploy_commit
  );
  assert.equal(productionDeploySuccessReceipt.production_smoke.api_health_status, 200);
  assert.equal(productionDeploySuccessReceipt.production_smoke.hrx_employees_status, 200);
  assert.equal(productionDeploySuccessReceipt.production_smoke.hrx_employees_roster_source_ref, "hrx-member-roster-source-of-truth");
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_external_schedule_required_terms_visible["외부일정"], true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_external_schedule_required_terms_visible["법원"], true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_external_schedule_required_terms_visible["검찰"], true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_external_schedule_required_terms_visible["우체국"], true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_external_schedule_required_terms_visible["세무서"], true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_external_schedule_required_terms_visible["관청"], true);
  for (const visible of Object.values(productionDeploySuccessReceipt.production_smoke.removed_people_terms_visible)) {
    assert.equal(visible, false, "removed People label must not be visible in production smoke");
  }
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_detail_drawer_parity.same_width, true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_detail_drawer_parity.same_right_edge, true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.people_detail_drawer_parity.same_animation, true);
  assert.equal(productionDeploySuccessReceipt.production_smoke.browser_api_5xx_count, 0);
  assert.deepEqual(productionDeploySuccessReceipt.production_smoke.browser_page_errors, []);
  assert.deepEqual(productionDeploySuccessReceipt.production_smoke.browser_unexpected_console_messages, []);
  assert.equal(productionDeploySuccessReceipt.claim_boundary.production_deployed, true);
  assert.equal(productionDeploySuccessReceipt.claim_boundary.production_ready, false);
  assert.equal(productionDeploySuccessReceipt.claim_boundary.go_live_approved, false);
}

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: ledger.program_id,
  tuw_count: ledger.tuws.length,
  done_local: ledger.tuws.filter((tuw) => tuw.status === "done-local").length,
  done_remote: ledger.tuws.filter((tuw) => tuw.status === "done-remote").length,
  ready: ledger.tuws.filter((tuw) => tuw.status === "ready").length,
  blocked: ledger.tuws.filter((tuw) => tuw.status === "blocked").length,
  production_ready: ledger.claim_boundary.production_ready,
  production_deployed: ledger.claim_boundary.production_deployed,
  go_live_approved: ledger.claim_boundary.go_live_approved,
  local_browser_proof: localBrowserProof.verdict
}, null, 2));
