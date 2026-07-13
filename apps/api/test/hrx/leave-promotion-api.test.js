import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest, seedHrxDurableRuntimeStore } from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { createSqlLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const EMPLOYEES = ["emp_amic_yjlee", "emp_amic_ytkim"];

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "promotion-group", code: "PROMOTION_ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "promotion-policy-v1", group_id: "promotion-group", policy_code: "PROMOTION-ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: JSON.stringify({ promotion: { standard_day_minutes: 480, minimum_unused_minutes: 4800 } }) } });
  const ledger = createSqlLeaveBalanceLedger({ store });
  for (const employeeId of EMPLOYEES) {
    store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: `promotion-entitlement-${employeeId}`, employee_id: employeeId, group_id: "promotion-group", policy_version_id: "promotion-policy-v1", granted_minutes: 5760, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: `LeaveAccrualRun:LV06:${employeeId}`, idempotency_key: `promotion-entitlement-${employeeId}`, state_version: 1 } });
    ledger.append({ tenant_id: TENANT, entry_id: `promotion-earned-${employeeId}`, employee_id: employeeId, policy_id: "PROMOTION-ANNUAL-2026", group_id: "promotion-group", policy_version_id: "promotion-policy-v1", entitlement_id: `promotion-entitlement-${employeeId}`, idempotency_key: `promotion-earned-${employeeId}`, entry_type: "earned", amount_minutes: 5760, occurred_on: "2026-06-30", source_ref: `LeaveAccrualRun:LV06:${employeeId}` });
  }
  let now = "2026-07-05T01:00:00.000Z";
  return { store, context: createHrxRuntimeContext({ store, clock: () => now }), setNow(value) { now = value; } };
}

function hrActor() {
  return { tenant_id: TENANT, actor_id: "user_amic_jwsuh", actor_role: "lawos_admin", hrx_scopes: ["hrx.leave.promotion.manage", "hrx.leave.report.export"], session_bound: true };
}

function staffActor() {
  return { tenant_id: TENANT, actor_id: "user_amic_yjlee", actor_role: "lawos_staff", hrx_scopes: ["hrx.leave.self.read"], session_bound: true };
}

function request(context, pathname, method = "GET", body = {}, requestContext = hrActor()) {
  return handleHrxApiRequest({ pathname, method, body, context, requestContext });
}

test("LV-06 route policies bind every campaign and recipient command to promotion scope", () => {
  for (const [method, pathname, action] of [
    ["GET", "/api/hrx/leave/promotion-campaigns", "hrx.leave.promotion.read"],
    ["POST", "/api/hrx/leave/promotion-campaigns/preview", "hrx.leave.promotion.preview"],
    ["POST", "/api/hrx/leave/promotion-campaigns", "hrx.leave.promotion.manage"],
    ["POST", "/api/hrx/leave/promotion-recipients/recipient-1/evidence", "hrx.leave.promotion.manage"],
  ]) {
    const policy = resolveHrxRoutePolicy({ method, pathname });
    assert.equal(policy?.required_scope, "hrx.leave.promotion.manage");
    assert.equal(policy?.action, action);
  }
});

test("LV-06 API creates reproducible targets and separates first response from second delivery evidence", () => {
  const { store, context, setNow } = setup();
  const input = { policy_version_id: "promotion-policy-v1", entitlement_period_end: "2026-12-31", schedule_profile_id: "kr_lsa61_standard_v2025_10_23", idempotency_key: "promotion-api-2026" };
  const preview = request(context, "/api/hrx/leave/promotion-campaigns/preview", "POST", input);
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.preview.target_count, 2);
  assert.equal(preview.body.preview.targets[0].unused_days, 12);
  const created = request(context, "/api/hrx/leave/promotion-campaigns", "POST", input);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const [first, second] = created.body.campaign.recipients;

  request(context, `/api/hrx/leave/promotion-recipients/${first.recipient_id}/first-notice`, "POST", { document_version: "notice-v1" });
  const firstDelivered = request(context, `/api/hrx/leave/promotion-recipients/${first.recipient_id}/evidence`, "POST", { stage: "first", event_type: "delivered", evidence_hash: "a".repeat(64), provider_receipt_ref: "receipt-api-1", occurred_at: "2026-07-05T01:00:00.000Z" });
  assert.equal(firstDelivered.body.recipient.state, "awaiting_employee_response");
  const responded = request(context, `/api/hrx/leave/promotion-recipients/${first.recipient_id}/response`, "POST", { selected_dates: ["2026-09-14"], responded_at: "2026-07-08T01:00:00.000Z" });
  assert.equal(responded.body.recipient.state, "employee_responded");

  request(context, `/api/hrx/leave/promotion-recipients/${second.recipient_id}/first-notice`, "POST", { document_version: "notice-v1" });
  request(context, `/api/hrx/leave/promotion-recipients/${second.recipient_id}/evidence`, "POST", { stage: "first", event_type: "delivered", evidence_hash: "b".repeat(64), provider_receipt_ref: "receipt-api-2", occurred_at: "2026-07-05T01:00:00.000Z" });
  setNow("2026-07-16T01:00:00.000Z");
  const secondIssued = request(context, `/api/hrx/leave/promotion-recipients/${second.recipient_id}/second-notice`, "POST", { document_version: "designation-v1" });
  assert.equal(secondIssued.body.recipient.second_delivery_state, "pending");
  const secondDelivered = request(context, `/api/hrx/leave/promotion-recipients/${second.recipient_id}/evidence`, "POST", { stage: "second", event_type: "delivered", evidence_hash: "c".repeat(64), provider_receipt_ref: "receipt-api-3" });
  assert.equal(secondDelivered.body.recipient.compliance_state, "delivery_verified_view_pending");
  const secondViewed = request(context, `/api/hrx/leave/promotion-recipients/${second.recipient_id}/evidence`, "POST", { stage: "second", event_type: "viewed", evidence_hash: "d".repeat(64) });
  assert.equal(secondViewed.body.recipient.compliance_state, "evidence_complete_pending_legal_review");
  assert.equal(store.query("select", { table: "hrx_documents", where: { tenant_id: TENANT, source_status: "verified" } }).filter((document) => document.document_type === "annual_leave_promotion_notice").length, 3);
  store.close();
});

test("LV-06 API denies staff without leaking campaign or recipient counts", () => {
  const { store, context } = setup();
  const denied = request(context, "/api/hrx/leave/promotion-campaigns", "GET", {}, staffActor());
  assert.equal(denied.status, 403);
  assert.equal(denied.body.count_leak_prevented, true);
  assert.equal("campaigns" in denied.body, false);
  store.close();
});
