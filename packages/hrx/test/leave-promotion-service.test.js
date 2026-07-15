import assert from "node:assert/strict";
import test from "node:test";
import { createSqlHrxDocumentStore } from "../src/documents.js";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeavePromotionService } from "../src/leave/promotion-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { scanHrxLegalRiskEvents } from "../src/risk-event.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-promotion";
const EMPLOYEE_ONE = "emp-promotion-1";
const EMPLOYEE_TWO = "emp-promotion-2";
const EMPLOYEE_THREE = "emp-promotion-3";
const EMPLOYEE_FOUR = "emp-promotion-4";

function fixture() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  for (const employee of [
    { employee_id: EMPLOYEE_ONE, display_name: "김하나", status: "active" },
    { employee_id: EMPLOYEE_TWO, display_name: "이두나", status: "active" },
    { employee_id: EMPLOYEE_THREE, display_name: "박비활성", status: "inactive" },
    { employee_id: EMPLOYEE_FOUR, display_name: "최소액", status: "active" },
  ]) {
    store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, ...employee, legal_name: employee.display_name, work_email: `${employee.employee_id}@example.test`, source_ref: `Synthetic:${employee.employee_id}` } });
  }
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual-group", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: {
    tenant_id: TENANT,
    policy_version_id: "annual-policy-v1",
    group_id: "annual-group",
    policy_code: "annual",
    version: 1,
    effective_from: "2026-01-01",
    effective_to: null,
    status: "active",
    rules_json: JSON.stringify({ promotion: { standard_day_minutes: 480, minimum_unused_minutes: 4800 } }),
  } });
  for (const employeeId of [EMPLOYEE_ONE, EMPLOYEE_TWO]) {
    store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: `entitlement-${employeeId}`, employee_id: employeeId, group_id: "annual-group", policy_version_id: "annual-policy-v1", granted_minutes: 7200, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: `SyntheticEntitlement:${employeeId}`, idempotency_key: `entitlement-${employeeId}`, state_version: 1 } });
  }
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: `entitlement-${EMPLOYEE_FOUR}`, employee_id: EMPLOYEE_FOUR, group_id: "annual-group", policy_version_id: "annual-policy-v1", granted_minutes: 480, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: `SyntheticEntitlement:${EMPLOYEE_FOUR}`, idempotency_key: `entitlement-${EMPLOYEE_FOUR}`, state_version: 1 } });
  const ledger = createSqlLeaveBalanceLedger({ store });
  function append(employeeId, suffix, entryType, amountMinutes, extra = {}) {
    ledger.append({ tenant_id: TENANT, entry_id: `${employeeId}-${suffix}`, employee_id: employeeId, policy_id: "annual", group_id: "annual-group", policy_version_id: "annual-policy-v1", entitlement_id: `entitlement-${employeeId}`, idempotency_key: `${employeeId}-${suffix}`, entry_type: entryType, amount_minutes: amountMinutes, occurred_on: "2026-06-30", source_ref: `SyntheticLedger:${employeeId}`, ...extra });
  }
  for (const employeeId of [EMPLOYEE_ONE, EMPLOYEE_TWO]) {
    append(employeeId, "earned", "earned", 7200);
    append(employeeId, "reserved", "reserved", 960);
    append(employeeId, "released", "released", 480);
    append(employeeId, "used", "used", 480);
    append(employeeId, "expired", "expired", 480);
  }
  append(EMPLOYEE_FOUR, "earned", "earned", 480);
  let now = "2026-07-05T01:00:00.000Z";
  let sequence = 0;
  const documents = createSqlHrxDocumentStore({ store });
  const service = createLeavePromotionService({
    store,
    documents,
    clock: () => now,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    employeeDirectory: () => [
      { employee_id: EMPLOYEE_ONE, display_name: "김하나", status: "active" },
      { employee_id: EMPLOYEE_TWO, display_name: "이두나", status: "active" },
      { employee_id: EMPLOYEE_THREE, display_name: "박비활성", status: "inactive" },
      { employee_id: EMPLOYEE_FOUR, display_name: "최소액", status: "active" },
    ],
  });
  return { store, documents, service, setNow(value) { now = value; } };
}

const context = Object.freeze({ tenant_id: TENANT, actor_id: "user-hr", authorized_employee_ids: [EMPLOYEE_ONE, EMPLOYEE_TWO, EMPLOYEE_THREE, EMPLOYEE_FOUR] });
const campaignInput = Object.freeze({
  policy_version_id: "annual-policy-v1",
  entitlement_period_end: "2026-12-31",
  schedule_profile_id: "kr_lsa61_standard_v2025_10_23",
  idempotency_key: "promotion-2026",
});

test("promotion target and deadlines are reproducible from released, expired, and net reservations", () => {
  const { store, service } = fixture();
  const preview = service.preview(context, campaignInput);
  assert.equal(preview.target_count, 2);
  assert.equal(preview.excluded_count, 2);
  assert.deepEqual(preview.exclusions.map((row) => [row.employee_id, row.reason, row.available_minutes]), [
    [EMPLOYEE_THREE, "employee_inactive", 0],
    [EMPLOYEE_FOUR, "below_threshold", 480],
  ]);
  assert.equal(preview.targets[0].available_minutes, 5760);
  assert.equal(preview.targets[0].reserved_minutes, 480);
  assert.equal(preview.targets[0].expired_minutes, 480);
  assert.equal(preview.targets[0].unused_days, 12);
  assert.equal(preview.legal_schedule.first_notice_window_start, "2026-07-01");
  assert.equal(preview.legal_schedule.first_notice_deadline_at, "2026-07-10T14:59:59.000Z");
  assert.equal(preview.legal_schedule.second_notice_deadline_at, "2026-10-31T14:59:59.000Z");
  const campaign = service.create(context, campaignInput);
  assert.equal(campaign.recipients.length, 2);
  assert.equal(campaign.excluded_count, 2);
  assert.deepEqual(campaign.exclusions.map((row) => row.reason), ["employee_inactive", "below_threshold"]);
  assert.equal(service.create(context, campaignInput).campaign_id, campaign.campaign_id);
  assert.equal(store.query("select", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: TENANT } }).length, 1);
  const deadlineEvents = store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT } });
  assert.equal(deadlineEvents.filter((row) => row.event_type === "leave.promotion.first_notice_deadline").length, 2);
  assert.equal(deadlineEvents.filter((row) => row.event_type === "leave.promotion.second_notice_deadline").length, 2);
  store.close();
});

test("delivery failures remain failures and first response is separated from second notice evidence", () => {
  const { store, documents, service, setNow } = fixture();
  const campaign = service.create(context, campaignInput);
  const [first, second] = campaign.recipients;
  const firstIssued = service.issueFirstNotice(context, first.recipient_id, { document_version: "notice-v1" });
  assert.equal(firstIssued.first_content_hash, "e355e3b3fd501eae327774fd7e954abc77537667f66d55cd12fb7d78d2888387");
  assert.equal(service.issueFirstNotice(context, first.recipient_id, { document_version: "notice-v1" }).first_content_hash, firstIssued.first_content_hash);
  assert.throws(
    () => service.issueFirstNotice(context, first.recipient_id, { document_version: "notice-v2" }),
    (error) => error.safe_error_code === "HRX_LEAVE_PROMOTION_DOCUMENT_VERSION_CONFLICT",
  );
  const firstDocument = documents.get({ tenant_id: TENANT, document_id: firstIssued.document_id });
  assert.equal(firstDocument.source_metadata.content_hash, firstIssued.first_content_hash);
  assert.equal(firstDocument.source_metadata.target_employee_ref, `HRXEmployee:${first.employee_id}`);
  assert.equal(firstDocument.source_metadata.deadline_at, "2026-07-10T14:59:59.000Z");
  assert.equal(firstDocument.source_metadata.document_version, "notice-v1");
  assert.equal(firstDocument.document_body_included, false);
  const failed = service.recordEvidence(context, first.recipient_id, { stage: "first", event_type: "failed", evidence_hash: "a".repeat(64) });
  assert.equal(failed.first_delivery_state, "failed");
  assert.equal(documents.get({ tenant_id: TENANT, document_id: firstIssued.document_id }).source_status, "unverified");
  const delivered = service.recordEvidence(context, first.recipient_id, { stage: "first", event_type: "delivered", evidence_hash: "b".repeat(64), provider_receipt_ref: "delivery-receipt-1", occurred_at: "2026-07-05T01:00:00.000Z" });
  assert.equal(delivered.response_due_at, "2026-07-15T01:00:00.000Z");
  assert.equal(documents.get({ tenant_id: TENANT, document_id: firstIssued.document_id }).source_status, "verified");
  const responded = service.recordResponse(context, first.recipient_id, { selected_dates: ["2026-09-14"], responded_at: "2026-07-08T01:00:00.000Z" });
  assert.equal(responded.state, "employee_responded");
  assert.equal(responded.compliance_state, "employee_response_recorded_pending_legal_review");
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.promotion.first_notice_issued" } }).length, 1);
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.promotion.response_recorded" } }).length, 1);
  assert.throws(() => service.issueSecondNotice(context, first.recipient_id, { document_version: "notice-v2" }), /response already recorded/);

  service.issueFirstNotice(context, second.recipient_id, { document_version: "notice-v1" });
  service.recordEvidence(context, second.recipient_id, { stage: "first", event_type: "delivered", evidence_hash: "c".repeat(64), provider_receipt_ref: "delivery-receipt-2", occurred_at: "2026-07-05T01:00:00.000Z" });
  setNow("2026-07-16T01:00:00.000Z");
  const secondIssued = service.issueSecondNotice(context, second.recipient_id, { document_version: "designation-v1" });
  assert.equal(secondIssued.second_delivery_state, "pending");
  assert.equal(secondIssued.second_content_hash, "d82a4690f6a05f25be902ceb042b71158f5cbe777a85bbf7d2da28ec2063740d");
  const secondDocument = documents.get({ tenant_id: TENANT, document_id: secondIssued.second_document_id });
  assert.equal(secondDocument.source_metadata.content_hash, secondIssued.second_content_hash);
  assert.equal(secondDocument.source_metadata.deadline_at, "2026-10-31T14:59:59.000Z");
  const secondDelivered = service.recordEvidence(context, second.recipient_id, { stage: "second", event_type: "delivered", evidence_hash: "d".repeat(64), provider_receipt_ref: "delivery-receipt-3" });
  assert.equal(secondDelivered.state, "second_notice_delivered");
  assert.equal(secondDelivered.compliance_state, "delivery_verified_view_pending");
  const secondViewed = service.recordEvidence(context, second.recipient_id, { stage: "second", event_type: "viewed", evidence_hash: "e".repeat(64) });
  assert.equal(secondViewed.state, "second_notice_viewed");
  assert.equal(secondViewed.compliance_state, "evidence_complete_pending_legal_review");
  assert.equal(secondViewed.legal_completion_claim, undefined);
  store.close();
});

test("promotion list and recipient actions fail closed to the authorized employee scope", () => {
  const { store, service } = fixture();
  const campaign = service.create(context, campaignInput);
  const scoped = { ...context, authorized_employee_ids: [EMPLOYEE_ONE] };
  assert.equal(service.list(scoped)[0].recipients.length, 1);
  const hidden = campaign.recipients.find((recipient) => recipient.employee_id === EMPLOYEE_TWO);
  assert.throws(() => service.issueFirstNotice(scoped, hidden.recipient_id, { document_version: "notice-v1" }), /not found/);
  store.close();
});

test("LV-PROM-004 batch issue is recipient-idempotent and evidence revocation keeps an immutable trail", () => {
  const { store, documents, service } = fixture();
  const campaign = service.create(context, campaignInput);
  const [versionFixed, batchReady] = campaign.recipients;
  service.issueFirstNotice(context, versionFixed.recipient_id, { document_version: "notice-v1" });

  const partial = service.issueBatch(context, {
    campaign_id: campaign.campaign_id,
    stage: "first",
    document_version: "notice-v2",
    recipient_ids: [versionFixed.recipient_id, batchReady.recipient_id],
    idempotency_key: "promotion-batch-partial",
  });
  assert.equal(partial.issued_count, 1);
  assert.equal(partial.failed_count, 1);
  assert.deepEqual(partial.results.map((row) => row.outcome), ["failed", "issued"]);
  assert.equal(partial.results[0].safe_error_code, "HRX_LEAVE_PROMOTION_DOCUMENT_VERSION_CONFLICT");

  const replay = service.issueBatch(context, {
    campaign_id: campaign.campaign_id,
    stage: "first",
    document_version: "notice-v2",
    recipient_ids: [batchReady.recipient_id],
    idempotency_key: "promotion-batch-replay",
  });
  assert.equal(replay.replayed_count, 1);
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.promotion.first_notice_issued" } }).length, 2);

  const delivered = service.recordEvidence(context, versionFixed.recipient_id, {
    stage: "first",
    event_type: "delivered",
    evidence_hash: "1".repeat(64),
    provider_receipt_ref: "provider-receipt-batch",
    idempotency_key: "promotion-evidence-delivered",
  });
  service.recordEvidence(context, versionFixed.recipient_id, {
    stage: "first",
    event_type: "viewed",
    evidence_hash: "2".repeat(64),
    idempotency_key: "promotion-evidence-viewed",
  });
  service.recordEvidence(context, versionFixed.recipient_id, {
    stage: "first",
    event_type: "delivered",
    evidence_hash: "1".repeat(64),
    provider_receipt_ref: "provider-receipt-batch",
    idempotency_key: "promotion-evidence-delivered",
  });
  assert.equal(store.query("select", { table: "hrx_leave_promotion_evidence_receipts", where: { tenant_id: TENANT, recipient_id: versionFixed.recipient_id } }).length, 2);

  const deliveryReceipt = delivered.evidence_receipts.find((receipt) => receipt.event_type === "delivered");
  const revoked = service.revokeEvidence(context, versionFixed.recipient_id, deliveryReceipt.receipt_id, { reason_code: "PROVIDER_RETRACTED" });
  assert.equal(revoked.first_delivery_state, "pending");
  assert.equal(revoked.first_delivered_at, null);
  assert.equal(revoked.first_viewed_at, null);
  assert.equal(revoked.evidence_receipts.filter((receipt) => receipt.state === "revoked").length, 2);
  assert.equal(documents.get({ tenant_id: TENANT, document_id: revoked.document_id }).source_status, "unverified");
  assert.equal(service.revokeEvidence(context, versionFixed.recipient_id, deliveryReceipt.receipt_id, { reason_code: "PROVIDER_RETRACTED" }).evidence_receipts.length, 2);
  store.close();
});

test("annual leave risk uses the same minute-ledger target and only verified delivery evidence resolves it", () => {
  const { store, documents, service } = fixture();
  const ledgerRows = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT } });
  const scan = (documentRows) => scanHrxLegalRiskEvents({
    tenant_id: TENANT,
    as_of: "2026-07-05",
    employees: [{ tenant_id: TENANT, employee_id: EMPLOYEE_ONE, status: "active" }],
    documents: documentRows,
    leave_balance_entries: ledgerRows,
    leave_policy_id: "annual",
    leave_promotion_threshold_days: 10,
    statutory_trainings: [],
    attendance_records: [],
    overtime_requests: [],
    offboarding_cases: [],
  }).filter((event) => event.risk_type === "annual_leave_promotion_target");
  assert.equal(scan([]).length, 1);
  const recipient = service.create(context, campaignInput).recipients.find((row) => row.employee_id === EMPLOYEE_ONE);
  service.issueFirstNotice(context, recipient.recipient_id, { document_version: "notice-v1" });
  assert.equal(scan(documents.list({ tenant_id: TENANT })).length, 1);
  service.recordEvidence(context, recipient.recipient_id, { stage: "first", event_type: "delivered", evidence_hash: "e".repeat(64), provider_receipt_ref: "delivery-receipt-risk" });
  assert.equal(scan(documents.list({ tenant_id: TENANT })).length, 1);
  service.recordEvidence(context, recipient.recipient_id, { stage: "first", event_type: "viewed", evidence_hash: "f".repeat(64) });
  assert.equal(scan(documents.list({ tenant_id: TENANT })).length, 0);
  store.close();
});
