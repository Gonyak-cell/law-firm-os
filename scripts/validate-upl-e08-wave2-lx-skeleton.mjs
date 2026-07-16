#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const artifactPath = "artifacts/manual-qa/upl-e08-wave2-lx-skeleton-mapping.json";
const markdownPath = "artifacts/manual-qa/upl-e08-wave2-lx-skeleton-mapping.md";
const backlogPath = "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md";

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of [artifactPath, markdownPath, backlogPath]) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const artifact = JSON.parse(read(artifactPath));
const markdown = read(markdownPath);
const backlog = read(backlogPath);

assert.equal(artifact.pass, true, "artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-E-08"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.source_register, backlogPath);
assert.match(backlog, /UPL-E-08/);

const expectedLxIds = [
  "LX-01",
  "LX-02",
  "LX-03",
  "LX-04",
  "LX-05",
  "LX-06",
  "LX-07",
  "LX-08",
  "LX-09",
  "LX-10",
  "LX-11",
  "LX-12",
];

assert.deepEqual(artifact.coverage_claims.lx_ids_expected, expectedLxIds);
assert.equal(artifact.mappings.length, expectedLxIds.length, "must map exactly 12 LX rows");
assert.deepEqual(
  artifact.mappings.map((mapping) => mapping.lx_id).sort(),
  expectedLxIds,
  "must map LX-01 through LX-12 exactly once",
);

const fullText = JSON.stringify(artifact).toLowerCase();
for (const keyword of ["sso", "scim", "dlp", "monthly", "screening", "multi-tenancy", "pentest"]) {
  assert.ok(fullText.includes(keyword), `missing required UPL-E-08 keyword: ${keyword}`);
}

for (const lxId of expectedLxIds) {
  assert.ok(markdown.includes(lxId), `markdown missing ${lxId}`);
  assert.match(backlog, new RegExp(`\\| ${lxId} \\|`));
}

for (const mapping of artifact.mappings) {
  assert.equal(mapping.planned_not_wave1_execution, true, `${mapping.lx_id} must be planned-only`);
  assert.equal(mapping.production_ready_claim, false, `${mapping.lx_id} must not claim production readiness`);
  assert.ok(mapping.area, `${mapping.lx_id} missing area`);
  assert.ok(mapping.enterprise_original, `${mapping.lx_id} missing enterprise original`);
  assert.ok(mapping.wave1_internal_profile, `${mapping.lx_id} missing Wave-1 profile`);
  assert.ok(mapping.wave2_reinforcement_path, `${mapping.lx_id} missing Wave-2 path`);
  assert.ok(mapping.owner_decision_gate, `${mapping.lx_id} missing owner gate`);
  assert.ok(Array.isArray(mapping.wave2_tuw_skeletons), `${mapping.lx_id} skeletons must be an array`);
  assert.ok(mapping.wave2_tuw_skeletons.length > 0, `${mapping.lx_id} missing skeletons`);

  for (const skeleton of mapping.wave2_tuw_skeletons) {
    assert.match(skeleton.tuw_id, /^W2-LX-\d{2}-T\d{2}$/);
    assert.ok(skeleton.title, `${skeleton.tuw_id} missing title`);
    assert.ok(skeleton.objective, `${skeleton.tuw_id} missing objective`);
    assert.ok(skeleton.entry_gate.length > 0, `${skeleton.tuw_id} missing entry gates`);
    assert.ok(skeleton.implementation_slices.length > 0, `${skeleton.tuw_id} missing slices`);
    assert.ok(skeleton.acceptance_evidence.length > 0, `${skeleton.tuw_id} missing acceptance evidence`);
    assert.ok(Array.isArray(skeleton.dependencies), `${skeleton.tuw_id} dependencies must be an array`);
    assert.ok(Array.isArray(skeleton.external_receipts_required), `${skeleton.tuw_id} external receipts must be an array`);
    assert.equal(skeleton.not_wave1_exit_gate, true, `${skeleton.tuw_id} must not be a Wave-1 exit gate`);
  }
}

const pentest = artifact.cross_cutting_external_leadtime.find((item) => item.id === "W2-XC-PENTEST-01");
assert.ok(pentest, "missing cross-cutting pentest gate");
assert.equal(pentest.production_ready_claim, false);
assert.ok(pentest.applies_to.includes("LX-02"), "pentest gate must cover tenant isolation");
assert.ok(pentest.acceptance_evidence.some((item) => /final pentest report/.test(item)), "pentest final report evidence missing");
assert.ok(markdown.includes("W2-XC-PENTEST-01"), "markdown missing pentest gate");

for (const checkId of [
  "e08-lx-01-12-complete",
  "e08-required-keywords-covered",
  "e08-each-lx-has-wave2-tuw-skeleton",
  "e08-no-production-ready-claim",
]) {
  assert.equal(artifact.checks.find((check) => check.id === checkId)?.passed, true, `artifact check failed: ${checkId}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-e08-wave2-lx-skeleton",
  artifact: artifactPath,
  lx_count: artifact.mappings.length,
  cross_cutting_external_leadtime: artifact.cross_cutting_external_leadtime.map((item) => item.id),
}, null, 2));
