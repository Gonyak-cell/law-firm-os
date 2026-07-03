#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

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

const searchService = read("packages/intake/src/conflict-search-service.js");
assert.match(searchService, /normalizeConflictName/);
assert.match(searchService, /CORPORATE_SUFFIXES/);
assert.match(searchService, /scoreConflictNameMatch/);
assert.match(searchService, /partial_normalized|fuzzy_normalized/);
assert.match(searchService, /CONFLICT_MATTER_PARTY_ROLES/);
assert.match(searchService, /MatterParty/);
assert.match(searchService, /caller_supplied_hit_count_ignored/);

const crmRuntime = read("apps/api/src/crm-intake-runtime-context.js");
assert.match(crmRuntime, /executeConflictSearch/);
assert.match(crmRuntime, /conflictCheckSearchPayload/);
assert.match(crmRuntime, /conflict_hits/);
assert.match(crmRuntime, /hit_count/);

const intakeTests = read("packages/intake/test/runtime-services.test.js");
assert.match(intakeTests, /normalized adverse parties/);
assert.match(intakeTests, /hit_count/);
assert.match(intakeTests, /former_matter/);

const apiTests = read("apps/api/test/cmp-r4-g6-crm-intake.test.js");
assert.match(apiTests, /conflict_search/);
assert.match(apiTests, /caller_supplied_hit_count_ignored/);
assert.match(apiTests, /former_matter/);

const apiClient = read("apps/web/src/data/apiClient.js");
assert.match(apiClient, /createIntakeConflictCheck/);
assert.match(apiClient, /\/api\/intake\/conflict-checks/);
assert.match(apiClient, /party_snapshot/);

const clientsSurface = read("apps/web/src/components/ClientsSurface.jsx");
assert.match(clientsSurface, /data-intake-conflict-review-flow="true"/);
assert.match(clientsSurface, /data-intake-conflict-hit-list="true"/);
assert.match(clientsSurface, /conflictHits/);
assert.match(clientsSurface, /conflictSourceLabel/);

assertExists("scripts/run-upl-c02-conflict-search-proof.mjs");
assertExists("scripts/run-upl-c02-conflict-search-browser-proof.mjs");

const apiProof = readJson("artifacts/manual-qa/upl-c02-conflict-search-proof.json");
assert.equal(apiProof.verdict, "PASS");
assert.equal(apiProof.contract_ref, "UPL-C-02");
assert.ok(apiProof.observed.conflict_search.hit_count === 1);
assert.ok(apiProof.observed.conflict_search.caller_supplied_hit_count_ignored === true);
assert.equal(apiProof.observed.conflict_hits[0].hit_source, "former_matter");
assert.equal(apiProof.observed.conflict_hits[0].matched_party_role, "adverse_party");

const browserProofPath = "docs/lazycodex/evidence/matter-web/artifacts/upl-c02-conflict-search-browser-proof.json";
const browserProof = readJson(browserProofPath);
assert.equal(browserProof.verdict, "PASS");
assert.equal(browserProof.contract_ref, "UPL-C-02");
assert.match(browserProof.observed.hit_list_text, /상대방 테크 주식회사/);
assert.ok(browserProof.observed.writes.length === 1);
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c02-conflict-search-browser-proof.md");
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c02-screenshots/upl-c02-conflict-search-hit-list.png");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-02", proofs: [apiProof.contract_ref, browserProof.contract_ref] }, null, 2));
