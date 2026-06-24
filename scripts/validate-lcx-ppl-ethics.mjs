#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { handleHrxApiRequest } from "../apps/api/src/hrx-runtime-context.js";
import { resolveHrxRoutePolicy } from "../apps/api/src/routes/hrx/route-policy-map.js";
import {
  createLegalPeopleEthicsReadModel,
  createLegalPeopleEthicsSeed,
  LCX_PPL_ETHICS_BOUNDARY
} from "../packages/hrx/src/legal-people-ethics.js";
import { createLegalPeoplePermissionContext } from "../packages/hrx/src/legal-people-api.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireText(path, text) {
  assert.ok(read(path).includes(text), `${path} missing ${text}`);
}

const contractPath = "docs/lazycodex/people-reflection/legal-people-ethics-contract.json";
const summaryPath = "docs/lazycodex/people-reflection/legal-people-ethics-contract.md";
const evidencePath = "docs/lazycodex/people-reflection/lcx-ppl-06-evidence.json";
const sourcePath = "packages/hrx/src/legal-people-ethics.js";
const packageTestPath = "packages/hrx/test/legal-people-ethics.test.js";
const runtimePath = "apps/api/src/hrx-runtime-context.js";
const policyPath = "apps/api/src/routes/hrx/route-policy-map.js";
const apiTestPath = "apps/api/test/hrx/legal-people-api.test.js";
const routeAuthzTestPath = "apps/api/test/hrx/route-authz.test.js";
const apiClientPath = "apps/web/src/people/hrxApiClient.ts";
const workspacePath = "apps/web/src/people/legal/LegalPeopleWorkspace.tsx";
const permissionAdminPath = "apps/web/src/people/admin/PermissionAdminPanel.jsx";
const stylesPath = "apps/web/src/styles.css";

for (const path of [
  contractPath,
  summaryPath,
  evidencePath,
  sourcePath,
  packageTestPath,
  runtimePath,
  policyPath,
  apiTestPath,
  routeAuthzTestPath,
  apiClientPath,
  workspacePath,
  permissionAdminPath,
  stylesPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:ppl:ethics:validate"], "node scripts/validate-lcx-ppl-ethics.mjs");

const contract = readJson(contractPath);
const evidence = readJson(evidencePath);

assert.equal(contract.schema_version, "lawos.lcx_ppl.legal_people_ethics_contract.v0.1");
assert.equal(contract.program_id, "LCX-PPL Full Reflection");
assert.deepEqual(contract.scope, ["LCX-PPL-06.01", "LCX-PPL-06.02", "LCX-PPL-06.03", "LCX-PPL-06.04"]);
assert.equal(contract.status, "local_ethics_permission_surface_ready");
assert.equal(contract.claim_boundary.ethical_wall_ui_complete, true);
assert.equal(contract.claim_boundary.conflict_review_queue_complete, true);
assert.equal(contract.claim_boundary.permission_admin_linkage_complete, true);
assert.equal(contract.claim_boundary.reviewer_receipt_model_complete, true);
assert.equal(contract.claim_boundary.browser_qa_complete, false);
assert.equal(contract.claim_boundary.runtime_ready_candidate_complete, false);
assert.equal(contract.claim_boundary.production_ready, false);
assert.equal(contract.claim_boundary.go_live_approved, false);
assert.equal(contract.claim_boundary.enterprise_trust_approved, false);
assert.equal(contract.claim_boundary.ai_final_decision_allowed, false);

for (const exportName of [
  "createEthicsReviewQueueItem",
  "createEthicalWallDisplay",
  "createEthicsPermissionLink",
  "createReviewerReceipt",
  "createLegalPeopleEthicsSeed",
  "createLegalPeopleEthicsReadModel"
]) {
  requireText(sourcePath, `export function ${exportName}`);
}
requireText(sourcePath, "export const LCX_PPL_ETHICS_BOUNDARY");

for (const marker of [
  "pending, reviewed, escalated, and blocked states",
  "redacts reviewer receipt details for restricted actors",
  "links People sensitivity to permission admin controls",
  "does not claim production or enterprise trust"
]) {
  requireText(packageTestPath, marker);
}

for (const marker of [
  "/api/hrx/legal-people/ethics",
  "createLegalPeopleEthicsReadModel",
  "hrx.legal_people.ethics.read"
]) {
  requireText(runtimePath, marker);
}

assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/ethics" })?.required_scope, "hrx.legal_people.read");
requireText(policyPath, "hrx.legal_people.ethics");
requireText(apiTestPath, "GET /api/hrx/legal-people/ethics");
requireText(routeAuthzTestPath, "/api/hrx/legal-people/ethics");

for (const marker of [
  "fetchLegalPeopleEthics",
  "/api/hrx/legal-people/ethics",
  "reviewer_receipts"
]) {
  requireText(apiClientPath, marker);
}

for (const marker of [
  "data-lcx-ppl-06-conflict-review-queue",
  "data-lcx-ppl-06-ethical-wall-ui",
  "data-lcx-ppl-06-reviewer-receipts",
  "fetchLegalPeopleEthics"
]) {
  requireText(workspacePath, marker);
}

for (const marker of [
  "data-lcx-ppl-06-permission-linkage",
  "data-lcx-ppl-06-permission-receipt-link",
  "fetchLegalPeopleEthics"
]) {
  requireText(permissionAdminPath, marker);
}
requireText(stylesPath, ".legal-ethics-row");

const seed = createLegalPeopleEthicsSeed("tenant-validator");
const readModel = createLegalPeopleEthicsReadModel({ seed });
const restricted = createLegalPeoplePermissionContext({ actor_id: "people-ops", actor_role: "people_ops" });
const privileged = createLegalPeoplePermissionContext({ actor_id: "legal-ops", actor_role: "legal_ops,conflicts_reviewer" });
const restrictedOverview = readModel.getEthicsOverview({ tenant_id: "tenant-validator" }, restricted);
const privilegedOverview = readModel.getEthicsOverview({ tenant_id: "tenant-validator", matter_id: "matter_lcx_001" }, privileged);
assert.equal(restrictedOverview.review_queue.length, 4);
assert.equal(restrictedOverview.permission_links.length, 2);
assert.equal(restrictedOverview.reviewer_receipts[0].access_state, "restricted");
assert.equal(JSON.stringify(restrictedOverview).includes("reviewer-legal-001"), false);
assert.equal(privilegedOverview.permission_summary.can_view_reviewer_details, true);
assert.ok(privilegedOverview.reviewer_receipts.some((receipt) => receipt.rollback_ref));

const runtime = {
  legalPeopleEthicsReadModel: createLegalPeopleEthicsReadModel({
    seed: createLegalPeopleEthicsSeed("tenant-a")
  }),
  audit: {
    append(event) {
      return event;
    }
  }
};
const runtimeResult = handleHrxApiRequest({
  pathname: "/api/hrx/legal-people/ethics",
  method: "GET",
  context: runtime,
  requestContext: { tenant_id: "tenant-a", actor_id: "validator-user", actor_role: "people_ops" }
});
assert.equal(runtimeResult.status, 200);
assert.equal(runtimeResult.body.review_queue.length, 4);
assert.equal(runtimeResult.body.claim_boundary.ai_final_decision_allowed, false);

assert.deepEqual(evidence.scope, contract.scope);
assert.equal(evidence.claim_boundary.ethical_wall_ui_complete, true);
assert.equal(evidence.claim_boundary.conflict_review_queue_complete, true);
assert.equal(evidence.claim_boundary.permission_admin_linkage_complete, true);
assert.equal(evidence.claim_boundary.reviewer_receipt_model_complete, true);
assert.equal(evidence.claim_boundary.browser_qa_complete, false);
assert.equal(evidence.claim_boundary.people_legal_relationship_runtime_ready_candidate_complete, false);
assert.equal(evidence.claim_boundary.production_ready, false);
assert.equal(evidence.claim_boundary.go_live_approved, false);
assert.equal(evidence.claim_boundary.enterprise_trust_approved, false);

assert.equal(LCX_PPL_ETHICS_BOUNDARY.runtime_ready_candidate_complete, false);
assert.equal(LCX_PPL_ETHICS_BOUNDARY.production_ready, false);
assert.equal(LCX_PPL_ETHICS_BOUNDARY.enterprise_trust_approved, false);

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  scope: contract.scope,
  review_queue_count: restrictedOverview.review_queue.length,
  ethical_wall_count: restrictedOverview.ethical_walls.length,
  permission_link_count: restrictedOverview.permission_links.length,
  reviewer_receipt_count: privilegedOverview.reviewer_receipts.length,
  ethical_wall_ui_complete: contract.claim_boundary.ethical_wall_ui_complete,
  conflict_review_queue_complete: contract.claim_boundary.conflict_review_queue_complete,
  permission_admin_linkage_complete: contract.claim_boundary.permission_admin_linkage_complete,
  reviewer_receipt_model_complete: contract.claim_boundary.reviewer_receipt_model_complete,
  runtime_ready_candidate_complete: contract.claim_boundary.runtime_ready_candidate_complete,
  production_ready: contract.claim_boundary.production_ready,
  enterprise_trust_approved: contract.claim_boundary.enterprise_trust_approved
}, null, 2));
