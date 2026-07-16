#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  BASELINE_PROOF_PATH,
  INVENTORY_MD_PATH,
  INVENTORY_PATH,
  TRACEABILITY_PATH,
  extractTraceability,
  fileExists,
  readJson,
  readText
} from "./lcx-full-helpers.mjs";

for (const path of [INVENTORY_PATH, INVENTORY_MD_PATH, BASELINE_PROOF_PATH, TRACEABILITY_PATH]) {
  assert.equal(fileExists(path), true, `${path} is required`);
}

const inventory = readJson(INVENTORY_PATH);
const baselineProof = readJson(BASELINE_PROOF_PATH);
const traceability = extractTraceability();

assert.equal(inventory.schema_version, "law-firm-os.lazycodex.lcx_full.current_gap_inventory.v0.1");
assert.equal(inventory.tuw_id, "LCX-FULL-00.01");
assert.equal(inventory.status, "current_gap_frozen");
assert.equal(inventory.traceability.parent_count, 21);
assert.equal(inventory.traceability.child_count, 110);
assert.deepEqual(inventory.traceability.missing_parents, []);
assert.equal(traceability.parentCount, 21);
assert.equal(traceability.childCount, 110);

for (const [key, value] of Object.entries(inventory.release_claims)) {
  assert.equal(value, false, `${key} must remain false`);
}

assert.equal(inventory.people_catalog.total, 71);
assert.equal(inventory.people_catalog.active, 15);
assert.equal(inventory.people_catalog.setup_required, 35);
assert.equal(inventory.people_catalog.integration_required, 11);
assert.equal(inventory.people_catalog.audit_required, 10);
assert.equal(inventory.global_utilities.conditional_global_count, 4);
assert.equal(inventory.global_utilities.audit_required_sections.length, 2);
assert.equal(inventory.routes.length >= 10, true, "route inventory must include key blocked routes");
assert.equal(inventory.baseline_browser_proof.exists, true);
assert.equal(inventory.baseline_browser_proof.verdict, "PASS");

assert.equal(baselineProof.schema_version, "law-firm-os.lazycodex.lcx_full.baseline_browser_proof.v0.1");
assert.equal(baselineProof.verdict, "PASS");
assert.equal(baselineProof.routes.length, inventory.routes.length);
for (const route of baselineProof.routes) {
  assert.equal(route.forbidden_text_detected, false, `${route.id} must not leak forbidden text`);
  assert.equal(route.console_unexpected_errors.length, 0, `${route.id} unexpected console errors`);
  assert.equal(route.unexpected_http_failures.length, 0, `${route.id} unexpected HTTP failures`);
  assert.equal(route.page_errors.length, 0, `${route.id} page errors`);
}

const markdown = readText(INVENTORY_MD_PATH);
assert.equal(markdown.includes("Public release, production go-live, owner approval"), true);
assert.equal(markdown.includes("Child TUWs: 110"), true);

console.log(JSON.stringify({
  verdict: "PASS",
  inventory: INVENTORY_PATH,
  baseline_browser_proof: BASELINE_PROOF_PATH,
  route_count: baselineProof.routes.length
}, null, 2));
