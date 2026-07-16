#!/usr/bin/env node
import assert from "node:assert/strict";
import { PLAN_PATH, TRACEABILITY_PATH, extractTraceability, fileExists, readText } from "./lcx-full-helpers.mjs";

assert.equal(fileExists(PLAN_PATH), true, `${PLAN_PATH} is required`);
assert.equal(fileExists(TRACEABILITY_PATH), true, `${TRACEABILITY_PATH} is required`);

const plan = readText(PLAN_PATH);
const traceabilitySource = readText(TRACEABILITY_PATH);
const traceability = extractTraceability();

assert.equal(plan.includes(TRACEABILITY_PATH), true, "parent plan must link detailed traceability backlog");
assert.equal(traceability.parentCount, 21, "expected 21 LCX-FULL parent TUWs");
assert.equal(traceability.childCount, 110, "expected 110 LCX-FULL child TUWs");
assert.deepEqual(traceability.missingParents, [], "all LCX-FULL-00..20 parent TUWs must be present");
assert.equal(traceabilitySource.includes("No row may be silently skipped."), true);
assert.equal(traceabilitySource.includes("LCX-FULL-COMPLETE"), true);
assert.equal(traceabilitySource.includes("| Total | 110 | all rows required |"), true);

for (const childId of traceability.childIds) {
  assert.match(traceabilitySource, new RegExp(`\\| ${childId.replace(".", "\\.")} \\|`), `${childId} must appear as a table row`);
}

for (const required of [
  "production go-live",
  "public release",
  "provider production write",
  "owner approval inferred by an agent",
  "Agent cannot close go-live/public release."
]) {
  assert.equal(traceabilitySource.includes(required), true, `traceability missing boundary text: ${required}`);
}

console.log(JSON.stringify({
  verdict: "PASS",
  parent_count: traceability.parentCount,
  child_count: traceability.childCount,
  missing_parents: traceability.missingParents,
  traceability: TRACEABILITY_PATH
}, null, 2));
