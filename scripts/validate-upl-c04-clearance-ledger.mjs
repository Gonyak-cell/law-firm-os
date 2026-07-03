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

function sliceFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const nextExport = source.indexOf("\nexport function", start + 1);
  const nextPlain = source.indexOf("\nfunction ", start + 1);
  const candidates = [nextExport, nextPlain].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

const openingService = read("packages/matter/src/opening-service.js");
assert.match(openingService, /ledgerClearanceToken/);
assert.match(openingService, /clearance_repository\.get/);
assert.match(openingService, /model_type: "ClearanceToken"/);
assert.match(openingService, /Matter opening clearance token was not issued by Intake ledger/);
assert.match(openingService, /Matter opening clearance ledger mismatch: \$\{field\}/);
assert.match(openingService, /verifiedClearanceToken/);
assert.match(openingService, /clearance_snapshot_hash: verifiedClearanceToken\.snapshot_hash/);

const orchestrator = read("packages/matter/src/matter-opening-orchestrator.js");
assert.match(orchestrator, /clearance_repository/);
assert.match(orchestrator, /openMatterTransaction/);

const matterRuntime = read("apps/api/src/matter-runtime-context.js");
assert.match(matterRuntime, /clearance_repository: runtime\.clearanceRepository/);
assert.match(matterRuntime, /ui_state: "blocked"/);

const server = read("apps/api/src/server.js");
assert.match(server, /matterRuntimeWithClearanceLedger/);
assert.match(server, /clearanceRepository: crmIntakeRuntime\.intakeRepository/);
assert.match(server, /const resolvedMatterRepository/);
assert.match(server, /const crmIntakeRuntime/);

const apiClient = read("apps/web/src/data/apiClient.js");
const openFromClearance = sliceFunction(apiClient, "openMatterFromIntakeClearance");
assert.match(openFromClearance, /clearanceToken/);
assert.match(openFromClearance, /clearance_token: clearanceToken/);
assert.doesNotMatch(openFromClearance, /token_state\s*:/);
assert.doesNotMatch(openFromClearance, /engagement_id\s*:/);
assert.doesNotMatch(apiClient, /engagement:\$\{clearanceId\}/);

const clientsSurface = read("apps/web/src/components/ClientsSurface.jsx");
assert.match(clientsSurface, /clearanceResult\.validation\?\.valid/);
assert.match(clientsSurface, /clearanceResult\.item/);
assert.match(clientsSurface, /openMatterFromIntakeClearance/);
assert.match(clientsSurface, /data-intake-matter-opening-flow="true"/);

const apiTests = read("apps/api/test/cmp-r4-g6-crm-intake.test.js");
assert.match(apiTests, /api-matter-open-c04-missing/);
assert.match(apiTests, /engagement:forged-by-client/);

assertExists("scripts/run-upl-c04-clearance-ledger-proof.mjs");
assertExists("scripts/run-upl-c04-clearance-ledger-browser-proof.mjs");

const apiProof = readJson("artifacts/manual-qa/upl-c04-clearance-ledger-proof.json");
assert.equal(apiProof.verdict, "PASS");
assert.equal(apiProof.contract_ref, "UPL-C-04");
assert.equal(apiProof.observed.never_issued_token.status, 400);
assert.equal(apiProof.observed.never_issued_token.ui_state, "blocked");
assert.ok(apiProof.observed.never_issued_token.safe_error_codes.includes("MATTER_API_VALIDATION_ERROR"));
assert.equal(apiProof.observed.forged_engagement.status, 400);
assert.equal(apiProof.observed.forged_engagement.ui_state, "blocked");
assert.ok(apiProof.observed.forged_engagement.safe_error_codes.includes("MATTER_API_VALIDATION_ERROR"));
assert.equal(apiProof.observed.forged_snapshot.status, 400);
assert.equal(apiProof.observed.forged_snapshot.ui_state, "blocked");
assert.ok(apiProof.observed.forged_snapshot.safe_error_codes.includes("MATTER_API_VALIDATION_ERROR"));
assert.equal(apiProof.observed.ledger_only_open.status, 201);
assert.equal(apiProof.observed.ledger_only_open.persisted.clearance_token_id, apiProof.observed.clearance.item.clearance_token_id);
assert.equal(apiProof.observed.ledger_only_open.persisted.engagement_id, apiProof.observed.clearance.item.engagement_id);
assert.equal(apiProof.observed.ledger_only_open.persisted.clearance_snapshot_hash, apiProof.observed.clearance.item.snapshot_hash);
assertExists("artifacts/manual-qa/upl-c04-clearance-ledger-proof.md");

const browserProof = readJson("docs/lazycodex/evidence/matter-web/artifacts/upl-c04-clearance-ledger-browser-proof.json");
assert.equal(browserProof.verdict, "PASS");
assert.equal(browserProof.contract_ref, "UPL-C-04");
assert.ok(browserProof.observed.writes.some((write) => write.kind === "matter_opening"));
const openingWrite = browserProof.observed.writes.find((write) => write.kind === "matter_opening");
assert.equal(openingWrite.payload.clearance_token.clearance_token_id, "clearance_upl_c04_ui_issued");
assert.equal(openingWrite.payload.clearance_token.engagement_id, "engagement_upl_c04_ui");
assert.equal(openingWrite.payload.clearance_token.token_state, "active");
assert.doesNotMatch(JSON.stringify(openingWrite.payload), /engagement:forged-by-client|"token_state":"valid"/);
assert.match(browserProof.observed.panel_text, /Matter가 개설되었습니다/);
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c04-clearance-ledger-browser-proof.md");
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c04-screenshots/upl-c04-clearance-ledger-matter-opening.png");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-04", proofs: [apiProof.contract_ref, browserProof.contract_ref] }, null, 2));
