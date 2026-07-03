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

const runtime = read("apps/api/src/crm-intake-runtime-context.js");
assert.match(runtime, /handleConflictDecisionRecord/);
assert.match(runtime, /handleWaiverApprove/);
assert.match(runtime, /handleClearanceTokenIssue/);
assert.match(runtime, /clearance_link_ready/);
assert.match(runtime, /conflict_hits/);

const decisionService = read("packages/intake/src/conflict-decision-service.js");
assert.match(decisionService, /reviewer_id/);
assert.match(decisionService, /conflict\.decision\.record/);
assert.match(decisionService, /clearance_link_ready/);

const waiverService = read("packages/intake/src/waiver-service.js");
assert.match(waiverService, /consent_document_id/);
assert.match(waiverService, /waiver\.approved/);
assert.match(waiverService, /clearance_link_ready/);

const clearanceService = read("packages/intake/src/clearance-token-service.js");
assert.match(clearanceService, /conflictReviewLedgerState/);
assert.match(clearanceService, /engagementLedgerState/);
assert.match(clearanceService, /missing_clear_decision_or_waiver/);
assert.match(clearanceService, /clearance\.token\.issue/);

const apiClient = read("apps/web/src/data/apiClient.js");
assert.match(apiClient, /recordIntakeConflictDecision/);
assert.match(apiClient, /approveIntakeConflictWaiver/);
assert.match(apiClient, /issueIntakeClearanceToken/);

const clientsSurface = read("apps/web/src/components/ClientsSurface.jsx");
assert.match(clientsSurface, /data-intake-conflict-review-flow="true"/);
assert.match(clientsSurface, /검토 결정/);
assert.match(clientsSurface, /Waiver 승인/);
assert.match(clientsSurface, /통과 처리/);

const apiTests = read("apps/api/test/cmp-r4-g6-crm-intake.test.js");
assert.match(apiTests, /conflict-decisions/);
assert.match(apiTests, /api-conflict-decision-1/);
assert.match(apiTests, /waiver\.approved/);
assert.match(apiTests, /clearance\.token\.issue/);

assertExists("scripts/run-upl-c03-conflict-review-proof.mjs");
assertExists("scripts/run-upl-c03-conflict-review-browser-proof.mjs");

const apiProof = readJson("artifacts/manual-qa/upl-c03-conflict-review-proof.json");
assert.equal(apiProof.verdict, "PASS");
assert.equal(apiProof.contract_ref, "UPL-C-03");
assert.equal(apiProof.observed.decision.clearance_link_ready, true);
assert.equal(apiProof.observed.waiver.clearance_link_ready, true);
assert.equal(apiProof.observed.clearance.validation.valid, true);
assert.equal(apiProof.observed.clearance.conflict_review.review_satisfied, true);
assert.equal(apiProof.observed.clearance.engagement_review.engagement_satisfied, true);
for (const action of ["conflict.search.executed", "conflict.hit.create", "conflict.decision.record", "waiver.approved", "engagement.approved", "clearance.token.issue"]) {
  assert.ok(apiProof.observed.audit.actions.includes(action), `audit action missing: ${action}`);
}
assertExists("artifacts/manual-qa/upl-c03-conflict-review-proof.md");

const browserProof = readJson("docs/lazycodex/evidence/matter-web/artifacts/upl-c03-conflict-review-browser-proof.json");
assert.equal(browserProof.verdict, "PASS");
assert.equal(browserProof.contract_ref, "UPL-C-03");
assert.match(browserProof.observed.panel_text, /검토 결정이 기록되었습니다/);
assert.match(browserProof.observed.panel_text, /Waiver 승인 기록/);
assert.match(browserProof.observed.panel_text, /통과 처리되었습니다/);
assert.ok(browserProof.observed.writes.some((write) => write.kind === "decision"));
assert.ok(browserProof.observed.writes.some((write) => write.kind === "waiver"));
assert.ok(browserProof.observed.writes.some((write) => write.kind === "clearance"));
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c03-conflict-review-browser-proof.md");
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c03-screenshots/upl-c03-conflict-review-flow.png");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-03", proofs: [apiProof.contract_ref, browserProof.contract_ref] }, null, 2));
