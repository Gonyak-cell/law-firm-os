import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

const artifactPath = "artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.json";
const matrixPath = "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md";

await assertNodeProofPass("scripts/run-upl-a08-packaged-desktop-restart-proof.mjs");

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const matrix = readFileSync(matrixPath, "utf8");

assert.equal(artifact.row_id, "UPL-A-08");
assert.equal(artifact.status, "PASS");
assert.equal(artifact.packaged_desktop_resolution.packaged_entry_resolved, true);
assert.equal(artifact.packaged_desktop_resolution.local_api_start_count, 2);
assert.equal(artifact.restart_boundary.direct_store_write_from_script, false);
assert.equal(artifact.checks.same_store_paths, true);
assert.equal(artifact.checks.matter_survived_restart, true);
assert.equal(artifact.checks.leave_survived_restart, true);
assert.match(artifact.second_launch.store_paths.matterStorePath, /runtime-stores\/matter-store\.json$/);
assert.match(artifact.second_launch.store_paths.hrxStorePath, /runtime-stores\/hrx-store\.json$/);
assert.match(
  matrix,
  /\| UPL-A-08 \| PASS \| Packaged desktop local API restart receipt proves matter and leave readback survives restart/,
);

console.log("UPL-A-08 packaged desktop restart validator PASS");
