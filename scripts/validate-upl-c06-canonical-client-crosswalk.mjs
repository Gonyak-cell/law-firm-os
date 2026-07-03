#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { AMIC_CURRENT_CLIENT_CANDIDATES } from "../packages/master-data/src/index.js";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

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

assert.equal(AMIC_CURRENT_CLIENT_CANDIDATES.length, 99);
assertPatterns("packages/master-data/src/model.js", [
  /export function createAmicCurrentClientCandidateRecords/,
  /canonical_client_crosswalk_ref/,
  /canonical_client_group_id/,
  /rp05_client_ref/,
  /single_tenant_migration_state: "canonical_crosswalk_ready"/,
]);
assertPatterns("packages/master-data/src/registry.js", [
  /canonical_client_crosswalk_ref/,
  /canonical_client_group_id/,
  /rp05_client_ref/,
  /single_tenant_migration_state/,
]);
assertPatterns("packages/intake/src/conflict-search-service.js", [
  /Party", "Organization", "Person", "Entity", "ClientGroup", "PartyAlias/,
  /hit_source: "party_master"/,
  /caller_supplied_hit_count_ignored/,
]);
assertPatterns("packages/master-data/test/model.test.js", [
  /currentClientEntities\.length, 99/,
  /currentClientGroups\.length, 99/,
  /canonical_client_crosswalk_ref/,
]);

assertExists("scripts/run-upl-c06-canonical-client-crosswalk-proof.mjs");
await assertNodeProofPass("scripts/run-upl-c06-canonical-client-crosswalk-proof.mjs");
const proof = readJson("artifacts/manual-qa/upl-c06-canonical-client-crosswalk-proof.json");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.contract_ref, "UPL-C-06");
assert.equal(proof.counts.candidate_count, 99);
assert.equal(proof.counts.crosswalk_row_count, 99);
assert.equal(proof.counts.linked_row_count, 99);
assert.ok(proof.checks.every((check) => check.passed === true));
assert.ok(proof.observed.target_hits.length >= 1);
assert.ok(proof.observed.target_hits.some((hit) => hit.hit_source === "party_master"));
assert.ok(
  proof.observed.target_hits.some((hit) => ["exact_normalized", "partial_normalized", "fuzzy_normalized"].includes(hit.match_kind)),
);
assert.ok(proof.observed.audit_actions.includes("conflict.search.executed"));
assertExists("artifacts/manual-qa/upl-c06-canonical-client-crosswalk-proof.md");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-06", proof: proof.contract_ref }, null, 2));
