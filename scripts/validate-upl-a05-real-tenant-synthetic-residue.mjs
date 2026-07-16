#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AMIC_CURRENT_CLIENT_CANDIDATES } from "../packages/master-data/src/index.js";

const ROOT = process.cwd();
const requiredFiles = [
  "scripts/run-upl-a05-real-tenant-synthetic-residue-proof.mjs",
  "scripts/run-upl-c06-canonical-client-crosswalk-proof.mjs",
  "scripts/validate-upl-c06-canonical-client-crosswalk.mjs",
  "artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.json",
  "artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.md",
  "artifacts/manual-qa/upl-c06-canonical-client-crosswalk-proof.json",
  "packages/master-data/src/model.js",
  "apps/api/test/master-data-api.test.js",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function run(command, args) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => resolveRun({ status, stdout, stderr }));
  });
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const proofScript = read("scripts/run-upl-a05-real-tenant-synthetic-residue-proof.mjs");
const modelSource = read("packages/master-data/src/model.js");
const apiTest = read("apps/api/test/master-data-api.test.js");
const artifact = JSON.parse(read("artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.json"));
const c06 = JSON.parse(read("artifacts/manual-qa/upl-c06-canonical-client-crosswalk-proof.json"));

for (const marker of [
  "MATTER_VAULT_REGISTERED_TENANT_ID",
  "RESIDUE_PATTERN",
  "synthetic_only !== false",
  "readAllClientGroups",
  "/master-data/records",
]) {
  assert.ok(proofScript.includes(marker), `proof script missing marker: ${marker}`);
}
assert.ok(proofScript.includes("apiSessionHeaders"), "proof script must use signed session headers");
assert.ok(proofScript.includes("a05-forged-permission-context-blocked"), "proof script must include forged-header negative check");

const executed = await run("node", ["scripts/run-upl-a05-real-tenant-synthetic-residue-proof.mjs"]);
assert.equal(executed.status, 0, executed.stderr || executed.stdout);

const refreshedArtifact = JSON.parse(read("artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.json"));
Object.assign(artifact, refreshedArtifact);

for (const marker of [
  "createAmicCurrentClientCandidateRecords",
  "synthetic_only: false",
  "canonical_client_crosswalk_ref",
  "rp05_client_ref",
]) {
  assert.ok(modelSource.includes(marker), `master-data model missing marker: ${marker}`);
}

assert.ok(apiTest.includes("ClientGroup records include current AMIC client names without legacy archive rows"));
assert.equal(AMIC_CURRENT_CLIENT_CANDIDATES.length, 99);
assert.equal(c06.verdict, "PASS", "C06 crosswalk proof must remain PASS");
assert.equal(c06.counts.crosswalk_row_count, 99);

assert.equal(artifact.pass, true, "A05 proof artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-A-05"]);
assert.equal(artifact.tenant_id, "tenant_amic_matter_vault");
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.readback.current_client_group_count, 99);
assert.equal(artifact.readback.wrong_tenant_count, 0);
assert.equal(artifact.readback.synthetic_only_true_count, 0);
assert.equal(artifact.readback.display_residue_count, 0);
assert.equal(artifact.readback.removed_name_hit_count, 0);
assert.ok(artifact.readback.known_names_present.includes("롯데에너지머티리얼즈"));
assert.ok(artifact.readback.sample_current_client_groups.every((row) => row.tenant_id === "tenant_amic_matter_vault"));
assert.ok(artifact.readback.sample_current_client_groups.every((row) => row.synthetic_only === false));

for (const id of [
  "a05-forged-permission-context-blocked",
  "a05-api-readback-uses-registered-tenant",
  "a05-current-client-count-99",
  "a05-synthetic-only-zero",
  "a05-display-residue-zero",
  "a05-current-client-known-names-present",
  "a05-removed-project-seller-names-absent",
  "a05-crosswalk-real-tenant-links-present",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-a05-real-tenant-synthetic-residue",
  artifact: "artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.json",
  current_client_group_count: artifact.readback.current_client_group_count,
}, null, 2));
