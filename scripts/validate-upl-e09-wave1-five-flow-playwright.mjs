#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "scripts/run-upl-e09-wave1-five-flow-playwright-suite.mjs",
  "apps/web/e2e/wave1-five-flow.spec.ts",
  "scripts/run-web-e2e.mjs",
  "docs/lazycodex/evidence/matter-web/artifacts/upl-c08-intake-completion-browser-proof.json",
  "artifacts/manual-qa/upl-b01-time-entry-browser-proof.json",
  "artifacts/manual-qa/upl-c13-client-portal-browser-proof.json",
  "artifacts/manual-qa/upl-e09-wave1-five-flow-playwright-suite.json",
  "artifacts/manual-qa/upl-e09-wave1-five-flow-playwright-suite.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const suite = read("scripts/run-upl-e09-wave1-five-flow-playwright-suite.mjs");
const spec = read("apps/web/e2e/wave1-five-flow.spec.ts");
const runner = read("scripts/run-web-e2e.mjs");
const artifact = JSON.parse(read("artifacts/manual-qa/upl-e09-wave1-five-flow-playwright-suite.json"));

for (const marker of [
  "run-upl-c08-intake-completion-browser-proof.mjs",
  "run-upl-b01-time-entry-browser-proof.mjs",
  "runLeaveFlow",
  "runDocumentFlow",
  "run-upl-c13-client-portal-browser-proof.mjs",
  "chromium.launch",
  "DOCUMENT_QUERY",
  "HIDDEN_DOCUMENT_TERM",
]) {
  assert.ok(suite.includes(marker), `suite missing marker: ${marker}`);
}

for (const marker of [
  "scripts/run-upl-e09-wave1-five-flow-playwright-suite.mjs",
  "opening",
  "time-to-billing",
  "leave",
  "document",
  "portal",
]) {
  assert.ok(spec.includes(marker), `spec missing marker: ${marker}`);
}

assert.ok(runner.includes("wave1-five-flow"), "run-web-e2e must expose wave1-five-flow case");
assert.equal(artifact.pass, true, "E09 artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-E-09"]);
assert.equal(artifact.playwright_suite, true);
assert.equal(artifact.command, "node scripts/run-web-e2e.mjs wave1-five-flow");
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.external_provider_claim, false);
assert.deepEqual(artifact.flows.map((flow) => flow.id), ["opening", "time-to-billing", "leave", "document", "portal"]);

for (const flow of artifact.flows) {
  assert.equal(flow.pass, true, `flow did not pass: ${flow.id}`);
}

for (const id of [
  "e09-five-required-flows-present",
  "e09-all-flows-pass",
  "e09-suite-runs-playwright-browser",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

const leaveFlow = artifact.flows.find((flow) => flow.id === "leave");
assert.ok(leaveFlow.checks.some((check) => check.id === "e09-leave-post-created" && check.passed === true));
assert.ok(leaveFlow.checks.some((check) => check.id === "e09-leave-api-readback" && check.passed === true));

const documentFlow = artifact.flows.find((flow) => flow.id === "document");
assert.ok(documentFlow.checks.some((check) => check.id === "e09-document-browser-search-hit" && check.passed === true));
assert.ok(documentFlow.checks.some((check) => check.id === "e09-document-raw-body-hidden" && check.passed === true));

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-e09-wave1-five-flow-playwright",
  artifact: "artifacts/manual-qa/upl-e09-wave1-five-flow-playwright-suite.json",
  flows: artifact.flows.map((flow) => flow.id),
}, null, 2));
