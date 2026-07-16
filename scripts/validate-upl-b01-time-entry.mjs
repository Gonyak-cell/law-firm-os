#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "apps/web/src/components/MattersSurface.jsx",
  "apps/web/src/data/apiClient.js",
  "apps/api/src/finance-runtime-context.js",
  "packages/time-expense/src/time-entry-service.js",
  "scripts/run-upl-b01-time-entry-browser-proof.mjs",
  "artifacts/manual-qa/upl-b01-time-entry-browser-proof.json",
  "artifacts/manual-qa/upl-b01-time-entry-browser-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const surface = read("apps/web/src/components/MattersSurface.jsx");
for (const marker of [
  "data-upl-b01-time-entry-form",
  "data-upl-b01-time-entry-work-date",
  "data-upl-b01-time-entry-duration",
  "data-upl-b01-time-entry-narrative",
  "data-upl-b01-time-entry-role",
  "data-upl-b01-time-entry-billable",
  "data-upl-b01-time-entry-submit",
  "data-upl-b01-time-entry-readback-count",
  "handleCreateTimeEntry",
]) {
  assert.ok(surface.includes(marker), `Matter surface missing marker: ${marker}`);
}
assert.doesNotMatch(surface, /mockData|time_entry_id:\s*"time_cmp_g7_seed"/);

const apiClient = read("apps/web/src/data/apiClient.js");
assert.match(apiClient, /createFinanceTimeEntry/);
assert.match(apiClient, /uiRuntimeId\("time_ui"\)/);
assert.match(apiClient, /idempotency_key:\s*timeEntryId/);
assert.doesNotMatch(apiClient, /idempotency_key:\s*["'`]time_cmp_g7_seed/);

const runtime = read("apps/api/src/finance-runtime-context.js");
assert.match(runtime, /POST \/api\/finance\/time-entries/);
assert.match(runtime, /handleFinanceTimeEntryCreate/);

const service = read("packages/time-expense/src/time-entry-service.js");
assert.match(service, /createTimeEntry/);
assert.match(service, /duration_minutes/);
assert.match(service, /billable is required/);
assert.match(service, /repository\.getIdempotency/);

const artifact = JSON.parse(read("artifacts/manual-qa/upl-b01-time-entry-browser-proof.json"));
assert.equal(artifact.pass, true, "browser proof must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-B-01"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.input_cases.length, 2);
assert.equal(new Set(artifact.readback.created_rows.map((row) => row.time_entry_id)).size, 2);
assert.equal(new Set(artifact.readback.created_rows.map((row) => row.matter_id)).size, 1);
for (const id of [
  "b01-form-mounted",
  "b01-first-arbitrary-values-posted",
  "b01-second-arbitrary-values-posted",
  "b01-multiple-entries-same-matter",
  "b01-distinct-runtime-ids",
  "b01-ui-renders-both-narratives",
  "b01-api-readback-succeeded",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-b01-time-entry",
  artifact: "artifacts/manual-qa/upl-b01-time-entry-browser-proof.json",
}, null, 2));
