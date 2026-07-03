#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function assertExists(path) {
  assert.ok(existsSync(join(ROOT, path)), `${path} must exist`);
}

function assertPatterns(path, patterns) {
  const source = read(path);
  for (const pattern of patterns) assert.match(source, pattern, `${path} must match ${pattern}`);
}

assertPatterns("apps/web/src/data/apiClient.js", [
  /export function createCrmOpportunity/,
  /path: "\/api\/crm\/opportunities"/,
  /permission_ref: "ui_upl_c08_intake_completion_write"/,
  /reason: "intake_pipeline_opportunity_created"/,
  /requested_scope_summary: requestedScopeSummary/,
  /stage: "new"/,
  /openMatterFromIntakeClearance/,
]);

assertPatterns("apps/web/src/components/ClientsSurface.jsx", [
  /export function IntakeSurface/,
  /data-upl-c08-intake-completion-surface="true"/,
  /data-upl-c08-new-inquiry-intake="true"/,
  /data-upl-c08-intake-pipeline="consultation-conflict-opening"/,
  /function handleCreateIntakePipeline/,
  /createCrmOpportunity\(/,
  /handoffCrmOpportunityToIntake\(/,
  /const activeIntake/,
  /createIntakeConflictCheck\(\{ intakeRequest: activeIntake/,
  /openMatterFromIntakeClearance\(\{/,
  /title="인테이크"/,
]);

assertPatterns("apps/web/src/components/Shell.jsx", [
  /\{ label: "인테이크", view: "clients", section: "client-intake"/,
]);

assertExists("scripts/run-upl-c08-intake-completion-browser-proof.mjs");
const proof = readJson("docs/lazycodex/evidence/matter-web/artifacts/upl-c08-intake-completion-browser-proof.json");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.contract_ref, "UPL-C-08");
assert.deepEqual(proof.observed.write_order, ["opportunity", "handoff", "conflict_check", "decision", "engagement", "clearance", "matter_opening"]);
assert.equal(proof.observed.manual_input_count, 0);
assert.ok(proof.checks.every((check) => check.passed === true));
const opportunityWrite = proof.observed.writes.find((write) => write.kind === "opportunity");
const conflictWrite = proof.observed.writes.find((write) => write.kind === "conflict_check");
const matterWrite = proof.observed.writes.find((write) => write.kind === "matter_opening");
assert.equal(opportunityWrite.payload.opportunity.display_name, "신규 의뢰");
assert.equal("matter_id" in opportunityWrite.payload.opportunity, false);
assert.equal("matter_open_command" in opportunityWrite.payload.opportunity, false);
assert.equal(conflictWrite.payload.conflict_check.intake_request_id, "intake_upl_c08_ui");
assert.equal(matterWrite.payload.permission_ref, "ui_cmp_g6_intake_matter_open");
assert.equal(matterWrite.payload.clearance_token.clearance_token_id, "clearance_upl_c08_ui");
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c08-intake-completion-browser-proof.md");
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c08-screenshots/upl-c08-intake-completion.png");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-08", proof: proof.contract_ref }, null, 2));
