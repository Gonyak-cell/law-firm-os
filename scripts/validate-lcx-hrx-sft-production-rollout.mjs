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
const ciWorkflowPath = ".github/workflows/hrx-production-rollout.yml";
const ciReceiptPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-production-tuw12-ci-receipt-2026-06-28.json";
const productionDeploySuccessReceiptPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-production-deploy-success-receipt-2026-06-28.json";
const stagingDeployReceiptPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-staging-deploy-receipt-2026-06-28.json";
const stagingApiSmokeReceiptPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-staging-api-smoke-receipt-2026-06-28.json";
const stagingBrowserProofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-hrx-sft-staging-browser-proof-2026-06-28.json";
const securityProviderDispositionPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-security-provider-disposition-2026-06-28.json";
const uatGoLiveReceiptPath = "docs/lazycodex/people-reflection/lcx-hrx-sft-uat-go-live-receipt-2026-06-28.json";
const packageJson = readJson("package.json");
const ledger = readJson(ledgerPath);
const plan = read(planPath);
const navigationBrowserProof = readJson(navigationBrowserProofPath);
const localBrowserProof = readJson(localBrowserProofPath);
const ciWorkflow = read(ciWorkflowPath);
const ciReceipt = readJson(ciReceiptPath);
const productionDeploySuccessReceipt = fileExists(productionDeploySuccessReceiptPath)
  ? readJson(productionDeploySuccessReceiptPath)
  : null;
const stagingDeployReceipt = readJson(stagingDeployReceiptPath);
const stagingApiSmokeReceipt = readJson(stagingApiSmokeReceiptPath);
const stagingBrowserProof = readJson(stagingBrowserProofPath);
const securityProviderDisposition = readJson(securityProviderDispositionPath);
const uatGoLiveReceipt = readJson(uatGoLiveReceiptPath);

const expectedIds = Array.from({ length: 21 }, (_, index) => `LCX-HRX-PROD-${String(index).padStart(2, "0")}`);
const tuwIds = ledger.tuws.map((tuw) => tuw.id);

assert.equal(ledger.schema_version, "lawos.lcx_hrx_sft.production_rollout_execution.v0.1");
assert.equal(ledger.source_plan, planPath);
assert.equal(packageJson.scripts?.["lcx:hrx-sft:production-rollout:validate"], "node scripts/validate-lcx-hrx-sft-production-rollout.mjs");
assert.deepEqual(tuwIds, expectedIds, "production rollout ledger must enumerate every TUW exactly once and in order");

for (const id of expectedIds) {
  assert.ok(plan.includes(id), `source TUW plan missing ${id}`);
}

const ciRemoteGreen = ciReceipt.claim_boundary?.remote_check_green === true;
const ciBillingBlocked =
  ciReceipt.status === "remote_check_blocked_account_billing" &&
  /payments have failed|spending limit/i.test(ciReceipt.remote_check?.annotation_message ?? "");
const stagingDeployed = stagingDeployReceipt.claim_boundary?.staging_deployed === true;
const stagingValidated =
  stagingApiSmokeReceipt.claim_boundary?.staging_validated === true &&
  stagingBrowserProof.verdict === "PASS";
const providerDispositionReady =
  securityProviderDisposition.disposition?.production_ready_with_disabled_provider_execution === true &&
  securityProviderDisposition.provider_boundaries?.payroll_provider_live === false &&
  securityProviderDisposition.provider_boundaries?.electronic_contract_provider_live === false;
const uatGoLiveApproved =
  uatGoLiveReceipt.decision?.production_ready === true &&
  uatGoLiveReceipt.decision?.go_live_approved === true;
const productionReadyExpected =
  Boolean(productionDeploySuccessReceipt) &&
  ciRemoteGreen &&
  stagingDeployed &&
  stagingValidated &&
  providerDispositionReady &&
  uatGoLiveApproved;
const claimExpectations = {
  production_deployed: Boolean(productionDeploySuccessReceipt),
  staging_deployed: stagingDeployed,
  staging_validated: stagingValidated,
  payroll_provider_live: false,
  electronic_contract_provider_live: false,
  production_ready: productionReadyExpected,
  go_live_approved: productionReadyExpected
};
for (const [claim, expected] of Object.entries(claimExpectations)) {
  assert.equal(ledger.claim_boundary[claim], expected, `${claim} claim boundary drift`);
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
const tuw12 = tuwById.get("LCX-HRX-PROD-12");
if (ciRemoteGreen) {
  assert.equal(tuw12?.status, "done-remote", "LCX-HRX-PROD-12 must be done-remote after remote CI green evidence");
  assert.match(tuw12?.check_url ?? "", /^https:\/\/github\.com\/.+/);
} else if (ciBillingBlocked) {
  assert.equal(tuw12?.status, "blocked", "LCX-HRX-PROD-12 must stay blocked while GitHub Actions billing prevents runner start");
  assert.match(tuw12?.blocked_by ?? "", /billing|spending limit/i);
} else {
  assert.equal(tuw12?.status, "ready", "LCX-HRX-PROD-12 must stay ready while the first remote CI run is pending");
  assert.equal(tuw12?.remote_check_status, "pending_first_pr_run");
}
for (const id of expectedIds.slice(13, 18)) {
  assert.equal(tuwById.get(id)?.status, "done-remote", `${id} must be closed by its external/staging/go-live receipt`);
  assert.ok(Array.isArray(tuwById.get(id)?.proof) && tuwById.get(id).proof.length > 0, `${id} requires proof paths`);
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
  } else if (name === "ci_workflow_installed") {
    assert.ok(["PASS", "BLOCKED_EXTERNAL_BILLING"].includes(receipt.status), "CI receipt must be pass or an explicit external billing blocker");
    if (receipt.status === "BLOCKED_EXTERNAL_BILLING") {
      assert.match(receipt.workflow_run_url ?? "", /^https:\/\/github\.com\/.+/);
      assert.match(receipt.blocking_reason ?? "", /billing|spending limit/i);
    }
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

assert.equal(ciReceipt.schema_version, "lawos.lcx_hrx_sft.production_rollout_tuw12_ci_receipt.v0.1");
assert.equal(ciReceipt.workflow.path, ciWorkflowPath);
assert.ok([
  "workflow_installed_local_equivalent_pass_pending_remote_check",
  "remote_check_green",
  "remote_check_blocked_account_billing"
].includes(ciReceipt.status));
for (const command of ciReceipt.workflow.required_commands) {
  assert.ok(ciWorkflow.includes(command), `CI workflow missing required command: ${command}`);
}
assert.ok(ciWorkflow.includes("pull_request:"), "CI workflow must run on pull_request");
assert.ok(ciWorkflow.includes("push:"), "CI workflow must run on main push");
if (ciRemoteGreen) {
  assert.match(ciReceipt.pr?.url ?? "", /^https:\/\/github\.com\/.+\/pull\/\d+$/);
  assert.match(ciReceipt.remote_check?.url ?? "", /^https:\/\/github\.com\/.+/);
  assert.equal(ciReceipt.remote_check?.conclusion, "success");
} else {
  assert.ok(["pending_first_pr_run", "blocked_account_billing"].includes(ciReceipt.workflow.remote_check_status));
  assert.equal(ciReceipt.claim_boundary.production_ready, false);
  assert.equal(ciReceipt.claim_boundary.go_live_approved, false);
  if (ciBillingBlocked) {
    assert.equal(ciReceipt.remote_check.conclusion, "failure");
    assert.equal(ciReceipt.remote_check.failure_class, "github_account_billing_or_spending_limit");
    assert.match(ciReceipt.remote_check.url, /^https:\/\/github\.com\/.+/);
  }
}

assert.equal(stagingDeployReceipt.schema_version, "lawos.lcx_hrx_sft.staging_deploy_receipt.v0.1");
assert.match(stagingDeployReceipt.source.runtime_deploy_commit, /^[0-9a-f]{40}$/);
assert.equal(stagingDeployReceipt.web_deployment.bucket_public_access_block.BlockPublicPolicy, true);
assert.equal(stagingDeployReceipt.web_deployment.bucket_encryption, "AES256");
assert.equal(stagingDeployReceipt.web_deployment.cloudfront_distribution_id, "E2M91XZ7D3ZSH5");
assert.equal(stagingDeployReceipt.web_deployment.cloudfront_status, "Deployed");
assert.equal(stagingDeployReceipt.api_deployment.lambda_function_name, "matter-lawos-api-staging");
assert.equal(stagingDeployReceipt.api_deployment.lambda_state, "Active");
assert.equal(stagingDeployReceipt.api_deployment.lambda_last_update_status, "Successful");
assert.equal(stagingDeployReceipt.api_deployment.lambda_environment.LAWOS_DEPLOYMENT_ENV, "staging");
assert.equal(stagingDeployReceipt.claim_boundary.staging_deployed, true);

assert.equal(stagingApiSmokeReceipt.schema_version, "lawos.lcx_hrx_sft.staging_api_smoke_receipt.v0.1");
assert.equal(stagingApiSmokeReceipt.web_root.status, 200);
assert.equal(stagingApiSmokeReceipt.web_root.asset_js, "assets/index-BrLnLC97.js");
assert.equal(stagingApiSmokeReceipt.web_root.asset_css, "assets/index-x40NzoCF.css");
assert.equal(stagingApiSmokeReceipt.api_health.status, 200);
assert.equal(stagingApiSmokeReceipt.hrx_employees.status, 200);
assert.equal(stagingApiSmokeReceipt.hrx_employees.count, 9);
assert.equal(stagingApiSmokeReceipt.hrx_employees.sample.source_ref, "hrx-member-roster-source-of-truth");
assert.equal(stagingApiSmokeReceipt.hrx_lifecycle.onboarding_status, 200);
assert.equal(stagingApiSmokeReceipt.hrx_lifecycle.offboarding_status, 200);
assert.equal(stagingApiSmokeReceipt.negative_security_smoke.missing_context_status, 400);
assert.equal(stagingApiSmokeReceipt.negative_security_smoke.missing_context_safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");
assert.equal(stagingApiSmokeReceipt.negative_security_smoke.documents_missing_scope_status, 403);
assert.equal(stagingApiSmokeReceipt.negative_security_smoke.documents_missing_scope_safe_error_code, "HRX_AUTHZ_DENIED");

assert.equal(stagingBrowserProof.schema_version, "lawos.lcx_hrx_sft.staging_browser_proof.v0.1");
assert.equal(stagingBrowserProof.verdict, "PASS");
assert.equal(stagingBrowserProof.checks.members_has_roster_source_terms, true);
assert.equal(stagingBrowserProof.checks.drawer_parity.same_width, true);
assert.equal(stagingBrowserProof.checks.drawer_parity.same_right_edge, true);
assert.equal(stagingBrowserProof.checks.drawer_parity.same_animation, true);
assert.equal(stagingBrowserProof.api_5xx_count, 0);
assert.deepEqual(stagingBrowserProof.page_errors, []);
assert.deepEqual(stagingBrowserProof.unexpected_console_messages, []);
for (const screenshot of Object.values(stagingBrowserProof.screenshots)) {
  assert.ok(fileExists(screenshot), `missing staging browser screenshot: ${screenshot}`);
}

assert.equal(securityProviderDisposition.schema_version, "lawos.lcx_hrx_sft.security_provider_disposition.v0.1");
assert.equal(securityProviderDisposition.disposition.blocking_findings, 0);
assert.equal(securityProviderDisposition.disposition.production_ready_with_disabled_provider_execution, true);
assert.equal(securityProviderDisposition.provider_boundaries.payroll_provider_live, false);
assert.equal(securityProviderDisposition.provider_boundaries.payroll_execution_enabled, false);
assert.equal(securityProviderDisposition.provider_boundaries.electronic_contract_provider_live, false);
assert.equal(securityProviderDisposition.provider_boundaries.electronic_signature_send_enabled, false);
assert.equal(securityProviderDisposition.provider_boundaries.provider_live_claim_allowed, false);

assert.equal(uatGoLiveReceipt.schema_version, "lawos.lcx_hrx_sft.uat_go_live_receipt.v0.1");
assert.match(uatGoLiveReceipt.approval.approval_ref, /^approval:codex-thread-/);
assert.equal(uatGoLiveReceipt.uat_evidence.blocking_findings, 0);
assert.equal(uatGoLiveReceipt.decision.production_ready, true);
assert.equal(uatGoLiveReceipt.decision.go_live_approved, true);
assert.equal(uatGoLiveReceipt.claim_boundary.payroll_provider_live, false);
assert.equal(uatGoLiveReceipt.claim_boundary.electronic_contract_provider_live, false);

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
  staging_deployed: ledger.claim_boundary.staging_deployed,
  staging_validated: ledger.claim_boundary.staging_validated,
  ci_remote_green: ciRemoteGreen,
  local_browser_proof: localBrowserProof.verdict
}, null, 2));
