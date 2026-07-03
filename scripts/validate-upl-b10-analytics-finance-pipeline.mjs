#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const runtime = read("apps/api/src/analytics-runtime-context.js");
const apiTest = read("apps/api/test/cmp-r4-g8-analytics.test.js");
const proofScript = read("scripts/run-upl-b10-analytics-finance-pipeline-proof.mjs");
await assertNodeProofPass("scripts/run-upl-b10-analytics-finance-pipeline-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-b10-analytics-finance-pipeline-proof.json"));

assert.match(runtime, /ANALYTICS_CALLER_SOURCE_PAYLOAD_REJECTED/);
assert.match(runtime, /selectFinanceRowsForMatter/);
assert.match(runtime, /selectFinanceRowsForEmployeeUtilization/);
assert.doesNotMatch(runtime, /Array\.isArray\(body\.(time_entries|invoices|payments|matter_rows)/);
assert.doesNotMatch(runtime, /body\.(billed_value|standard_value|capacity_hours|billable_hours)\s*\?\?/);
assert.match(apiTest, /G8 analytics metric routes reject caller-supplied source payloads/);
assert.match(apiTest, /ANALYTICS_CALLER_SOURCE_PAYLOAD_REJECTED/);
assert.match(proofScript, /caller-source-payload-rejected/);
assert.equal(proof.contract_ref, "UPL-B-10");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);

console.log("UPL-B-10 analytics finance pipeline validation passed.");
console.log(`proof: artifacts/manual-qa/upl-b10-analytics-finance-pipeline-proof.json`);
