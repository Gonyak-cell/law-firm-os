import assert from "node:assert/strict";
import test from "node:test";
import {
  createLegalPeopleEthicsReadModel,
  createLegalPeopleEthicsSeed,
  LCX_PPL_ETHICS_BOUNDARY
} from "../src/legal-people-ethics.js";
import { createLegalPeoplePermissionContext } from "../src/legal-people-api.js";

const tenant_id = "tenant_lcx_ppl_ethics_test";

function createHarness() {
  const seed = createLegalPeopleEthicsSeed(tenant_id);
  return { readModel: createLegalPeopleEthicsReadModel({ seed }) };
}

function restrictedPermission() {
  return createLegalPeoplePermissionContext({ actor_id: "people-ops-001", actor_role: "people_ops" });
}

function privilegedPermission() {
  return createLegalPeoplePermissionContext({
    actor_id: "conflicts-reviewer-001",
    actor_role: "legal_ops,conflicts_reviewer"
  });
}

test("lists conflict review queue with pending, reviewed, escalated, and blocked states", () => {
  const { readModel } = createHarness();
  const result = readModel.getEthicsOverview({ tenant_id }, privilegedPermission());
  assert.equal(result.review_queue.length, 4);
  assert.deepEqual(result.state_counts, {
    pending_review: 1,
    reviewed: 1,
    escalated: 1,
    blocked: 1
  });
  assert.ok(result.review_queue.every((item) => item.reviewer_required === true));
  assert.ok(result.review_queue.every((item) => item.ai_final_decision_allowed === false));
});

test("renders ethical wall evidence and never final AI decisions", () => {
  const { readModel } = createHarness();
  const result = readModel.getEthicsOverview({ tenant_id, matter_id: "matter_lcx_001" }, privilegedPermission());
  assert.equal(result.ethical_walls.length, 2);
  assert.ok(result.ethical_walls.some((wall) => wall.wall_status === "blocked"));
  assert.ok(result.ethical_walls.every((wall) => wall.raw_reason_payload_included === false));
  assert.ok(result.ethical_walls.every((wall) => wall.final_decision === false));
  assert.equal(result.claim_boundary.ethical_wall_ui_complete, true);
  assert.equal(result.claim_boundary.ai_final_decision_allowed, false);
});

test("redacts reviewer receipt details for restricted actors", () => {
  const { readModel } = createHarness();
  const result = readModel.getEthicsOverview({ tenant_id }, restrictedPermission());
  assert.ok(result.reviewer_receipts.length >= 1);
  assert.ok(result.reviewer_receipts.every((receipt) => receipt.access_state === "restricted"));
  assert.equal(JSON.stringify(result).includes("reviewer-legal-001"), false);
  assert.equal(JSON.stringify(result).includes("Rollback:"), false);
});

test("links People sensitivity to permission admin controls", () => {
  const { readModel } = createHarness();
  const result = readModel.getEthicsOverview({ tenant_id }, privilegedPermission());
  assert.equal(result.permission_links.length, 2);
  assert.ok(result.permission_links.some((link) => link.sensitive_field === "conflict_references"));
  assert.ok(result.permission_links.every((link) => link.admin_surface_ref === "People:permission-admin"));
  assert.ok(result.permission_links.every((link) => link.agrees_with_people_permission === true));
});

test("LCX-PPL-06 ethics boundary remains local and does not claim production or enterprise trust", () => {
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.ethical_wall_ui_complete, true);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.conflict_review_queue_complete, true);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.permission_admin_linkage_complete, true);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.reviewer_receipt_model_complete, true);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.runtime_ready_candidate_complete, false);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.production_ready, false);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.go_live_approved, false);
  assert.equal(LCX_PPL_ETHICS_BOUNDARY.enterprise_trust_approved, false);
});
