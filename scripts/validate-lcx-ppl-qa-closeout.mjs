#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireText(path, text) {
  assert.ok(read(path).includes(text), `${path} missing ${text}`);
}

const browserReceiptPath = "docs/lazycodex/people-reflection/lcx-qa-08-browser-qa-receipt.json";
const browserReceiptMdPath = "docs/lazycodex/people-reflection/lcx-qa-08-browser-qa-receipt.md";
const finalEvidencePath = "docs/lazycodex/people-reflection/lcx-qa-08-final-evidence.json";
const finalEvidenceMdPath = "docs/lazycodex/people-reflection/lcx-qa-08-final-evidence.md";
const finalBoundaryPath = "docs/lazycodex/people-reflection/lcx-qa-08-final-boundary-review.json";
const finalBoundaryMdPath = "docs/lazycodex/people-reflection/lcx-qa-08-final-boundary-review.md";
const claimBoundaryPath = "docs/lazycodex/people-reflection/claim-boundary.md";
const tuwPlanPath = "docs/lazycodex/people-reflection/lcx-ppl-tuw-plan.md";

for (const path of [
  browserReceiptPath,
  browserReceiptMdPath,
  finalEvidencePath,
  finalEvidenceMdPath,
  finalBoundaryPath,
  finalBoundaryMdPath,
  claimBoundaryPath,
  tuwPlanPath,
  "scripts/run-lcx-ppl-browser-qa.mjs"
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:ppl:browser-qa"], "node scripts/run-lcx-ppl-browser-qa.mjs");
assert.equal(packageJson.scripts?.["lcx:ppl:qa:validate"], "node scripts/validate-lcx-ppl-qa-closeout.mjs");

for (const scriptName of [
  "lcx:ppl:contract:validate",
  "lcx:ppl:relationship:validate",
  "lcx:ppl:api:validate",
  "lcx:ppl:ui:validate",
  "lcx:ppl:ethics:validate",
  "lcx:hro:blocked:validate",
  "hro:deel-parity:validate",
  "sf:client-matter-parity:validate"
]) {
  assert.ok(packageJson.scripts?.[scriptName], `${scriptName} script is required`);
}

const receipt = readJson(browserReceiptPath);
const finalEvidence = readJson(finalEvidencePath);
const finalBoundary = readJson(finalBoundaryPath);

assert.equal(receipt.schema_version, "lawos.lcx_ppl.browser_qa_receipt.v0.1");
assert.equal(receipt.program, "LCX-PPL Full Reflection");
assert.equal(receipt.scope.lcx_qa_08_browser_qa_complete, true);
assert.equal(receipt.scope.browser_driven_local_surface, true);
assert.equal(receipt.scope.production_ready_claim, false);
assert.equal(receipt.scope.go_live_claim, false);
assert.equal(receipt.scope.enterprise_trust_claim, false);
assert.equal(receipt.scope.external_provider_ready_claim, false);
assert.equal(receipt.scope.legal_owner_approved_claim, false);
assert.equal(receipt.scope.ai_final_decision_allowed, false);
assert.equal(receipt.summary.route_count, 6);
assert.ok(receipt.summary.check_count >= 30, "browser QA must include at least 30 checks");
assert.equal(receipt.summary.failed_count, 0);
assert.equal(receipt.summary.passed_count, receipt.summary.check_count);

for (const label of [
  "People Directory",
  "People Relationships",
  "People Conflicts And Walls",
  "People Permission Linkage",
  "Client People Backlinks",
  "Matter People Backlinks"
]) {
  assert.ok(receipt.routes.some((route) => route.label === label), `${label} route is required`);
}

for (const path of Object.values(receipt.screenshots)) {
  assert.equal(existsSync(path), true, `${path} screenshot is required`);
}

assert.equal(finalEvidence.schema_version, "lawos.lcx_ppl.qa_08_final_evidence.v0.1");
assert.equal(finalEvidence.program_id, "LCX-PPL Full Reflection");
assert.deepEqual(finalEvidence.scope, ["LCX-QA-08.01", "LCX-QA-08.02", "LCX-QA-08.03", "LCX-QA-08.04"]);
assert.equal(finalEvidence.browser_qa_receipt, browserReceiptPath);
assert.equal(finalEvidence.browser_qa_summary.route_count, receipt.summary.route_count);
assert.equal(finalEvidence.browser_qa_summary.check_count, receipt.summary.check_count);
assert.equal(finalEvidence.browser_qa_summary.failed_count, 0);
assert.equal(finalEvidence.claim_boundary.people_legal_relationship_runtime_ready_candidate_complete, true);
assert.equal(finalEvidence.claim_boundary.local_runtime_ready_candidate_only, true);
assert.equal(finalEvidence.claim_boundary.production_ready, false);
assert.equal(finalEvidence.claim_boundary.go_live_approved, false);
assert.equal(finalEvidence.claim_boundary.enterprise_trust_approved, false);
assert.equal(finalEvidence.claim_boundary.external_provider_ready, false);
assert.equal(finalEvidence.claim_boundary.legal_owner_approved, false);
assert.equal(finalEvidence.claim_boundary.ai_final_decision_allowed, false);

for (const command of [
  "npm run lcx:ppl:contract:validate",
  "npm run lcx:ppl:relationship:validate",
  "npm run lcx:ppl:api:validate",
  "npm run lcx:ppl:ui:validate",
  "npm run lcx:ppl:ethics:validate",
  "npm run lcx:hro:blocked:validate",
  "npm run lcx:ppl:browser-qa",
  "npm run lcx:ppl:qa:validate",
  "npm run build"
]) {
  assert.ok(finalEvidence.validation_commands.some((item) => item.command === command && item.status === "passed"), `${command} passed evidence is required`);
}

assert.equal(finalBoundary.schema_version, "lawos.lcx_ppl.final_boundary_review.v0.1");
assert.equal(finalBoundary.program_id, "LCX-PPL Full Reflection");
assert.equal(finalBoundary.verdict, "local_runtime_ready_candidate_only");
assert.equal(finalBoundary.allowed_claim.local_runtime_ready_candidate, true);
assert.equal(finalBoundary.disallowed_claims.production_ready, false);
assert.equal(finalBoundary.disallowed_claims.go_live_approved, false);
assert.equal(finalBoundary.disallowed_claims.enterprise_trust_approved, false);
assert.equal(finalBoundary.disallowed_claims.external_provider_ready, false);
assert.equal(finalBoundary.disallowed_claims.legal_owner_approved, false);
assert.equal(finalBoundary.disallowed_claims.ai_final_decision_allowed, false);

for (const marker of [
  "Browser QA drives the relevant People workflows",
  "production",
  "go_live",
  "enterprise_trust"
]) {
  requireText(claimBoundaryPath, marker);
}

for (const marker of [
  "LCX-QA-08.01",
  "LCX-QA-08.02",
  "LCX-QA-08.03",
  "LCX-QA-08.04"
]) {
  requireText(tuwPlanPath, marker);
}

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: finalEvidence.program_id,
  scope: finalEvidence.scope,
  route_count: receipt.summary.route_count,
  check_count: receipt.summary.check_count,
  local_runtime_ready_candidate: finalEvidence.claim_boundary.people_legal_relationship_runtime_ready_candidate_complete,
  production_ready: finalEvidence.claim_boundary.production_ready,
  go_live_approved: finalEvidence.claim_boundary.go_live_approved,
  enterprise_trust_approved: finalEvidence.claim_boundary.enterprise_trust_approved
}, null, 2));
