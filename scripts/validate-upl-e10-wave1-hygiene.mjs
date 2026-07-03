#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

const ROOT = process.cwd();
const artifactPath = "artifacts/manual-qa/upl-e10-wave1-hygiene-proof.json";
const matrixPath = "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md";

assert.equal(existsSync(resolve(ROOT, artifactPath)), true, `missing ${artifactPath}`);
assert.equal(existsSync(resolve(ROOT, matrixPath)), true, `missing ${matrixPath}`);

await assertNodeProofPass("scripts/run-upl-e10-wave1-hygiene-proof.mjs");

const artifact = JSON.parse(readFileSync(resolve(ROOT, artifactPath), "utf8"));
const matrix = readFileSync(resolve(ROOT, matrixPath), "utf8");

assert.equal(artifact.row_id, "UPL-E-10");
assert.equal(artifact.status, "PASS");
assert.equal(artifact.whole_wave_completion_claim, false);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.sloplint.strong_count, 0);
assert.equal(artifact.sloplint.no_verify_count, 0);
assert.equal(artifact.hardcoded_badge_count_findings.length, 0);

for (const id of [
  "e10-ui-regression-16-of-16",
  "e10-sloplint-no-strong",
  "e10-sloplint-no-no-verify",
  "e10-static-badge-count-zero",
  "e10-c13-portal-preserved",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

for (const rowId of ["UPL-C-09", "UPL-B-13"]) {
  assert.ok(
    artifact.external_receipts_not_locally_generated.some((item) => item.row_id === rowId),
    `missing external blocker note for ${rowId}`,
  );
}
assert.equal(
  artifact.external_receipts_not_locally_generated.some((item) => item.row_id === "UPL-A-12"),
  false,
  "UPL-A-12 must not remain listed as an external blocker after local model receipt closure",
);
assert.deepEqual(artifact.inherited_rows_remaining_partial, ["UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]);
assert.ok(
  artifact.local_model_gateway_closures?.some((item) => item.row_id === "UPL-A-12"),
  "UPL-A-12 local model closure must be documented",
);

assert.match(
  matrix,
  /\| UPL-E-10 \| PASS \| Whole-wave hygiene proof passes UI regression 16\/16/,
);

console.log("UPL-E-10 Wave-1 hygiene validator PASS");
