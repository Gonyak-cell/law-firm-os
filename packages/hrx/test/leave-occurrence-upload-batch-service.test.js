import assert from "node:assert/strict";
import test from "node:test";
import { createLeaveAccrualService } from "../src/leave/accrual-service.js";
import { createLeaveOccurrenceUploadBatchService } from "../src/leave/occurrence-upload-batch-service.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-occurrence-upload";
const NOW = "2026-07-14T08:00:00.000Z";
const CONTEXT = Object.freeze({ tenant_id: TENANT, actor_id: "hr-operator", step_up_verified: true });

function fixture() {
  const store = createFileHrxStore();
  for (const employeeId of ["emp-001", "emp-002"]) {
    store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id: employeeId, display_name: `합성 ${employeeId}`, status: "active" } });
    store.query("insert", { table: "hrx_documents", row: { tenant_id: TENANT, document_id: `proof-${employeeId}`, employee_id: employeeId, document_type: "leave_adjustment_evidence", source_ref: `Synthetic:${employeeId}`, source_status: "verified", source_metadata_json: "{}", title: "합성 증빙", document_body_included: false } });
  }
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  const manualService = createLeaveAccrualService({
    store,
    clock: () => NOW,
    approverAuthorizer: ({ tenant_id, actor_id, required_scope }) => tenant_id === TENANT && actor_id === "hr-approver" && required_scope === "hrx.leave.ledger.adjust",
  });
  return { store, manualService };
}

function csv(manualService) {
  return Buffer.from(manualService.manualTemplate().content_base64, "base64").toString("utf8")
    + "emp-001,annual,annual-v1,credit,480,2026-08-01,2027-07-31,예약 발생 1,proof-emp-001\r\n"
    + "emp-002,annual,annual-v1,credit,240,2026-08-02,2027-08-01,예약 발생 2,proof-emp-002\r\n";
}

test("LV-OCC-007 executes an approved upload exactly once from its matching preview", () => {
  const { store, manualService } = fixture();
  const service = createLeaveOccurrenceUploadBatchService({ store, manualService, clock: () => NOW });
  const preview = service.preview(CONTEXT, { csv_text: csv(manualService), schedule_only: true, as_of: "2026-07-14", idempotency_key: "upload-preview-1" });
  assert.equal(preview.status, "previewed");
  assert.deepEqual(preview.counts, { ready: 2, preview_errors: 0, duplicates: 0, completed: 0, failed: 0, pending: 2, new_entries: 0 });
  assert.doesNotMatch(JSON.stringify(preview), /예약 발생|proof-emp/);
  assert.throws(
    () => service.execute({ ...CONTEXT, step_up_verified: false }, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash, approved_by_actor_id: "hr-approver", idempotency_key: "upload-execute-1" }),
    (error) => error.safe_error_code === "HRX_STEP_UP_REQUIRED" && error.status === 403,
  );
  assert.equal(service.read(CONTEXT, { upload_batch_id: preview.upload_batch_id }).status, "previewed");
  assert.throws(
    () => service.execute(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: "0".repeat(64), approved_by_actor_id: "hr-approver", idempotency_key: "upload-execute-1" }),
    (error) => error.safe_error_code === "HRX_LEAVE_OCCURRENCE_UPLOAD_PREVIEW_MISMATCH",
  );

  const executed = service.execute(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash, approved_by_actor_id: "hr-approver", idempotency_key: "upload-execute-1" });
  assert.equal(executed.status, "completed");
  assert.deepEqual(executed.rows.map((row) => [row.execution_status, row.attempt_count]), [["completed", 1], ["completed", 1]]);
  assert.equal(executed.counts.new_entries, 2);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 2);

  const replay = service.execute(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash, approved_by_actor_id: "hr-approver", idempotency_key: "upload-execute-1" });
  assert.equal(replay.replayed, true);
  assert.equal(replay.counts.new_entries, 0);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 2);
  assert.throws(
    () => service.execute(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash, approved_by_actor_id: "hr-approver", idempotency_key: "upload-execute-different" }),
    (error) => error.safe_error_code === "HRX_LEAVE_OCCURRENCE_UPLOAD_EXECUTION_CONFLICT",
  );
  store.close();
});

test("LV-OCC-007 resumes only a failed upload row after durable reopen", () => {
  const first = fixture();
  let failSecond = true;
  const faultedManualService = {
    ...first.manualService,
    executeManual(context, input) {
      if (failSecond && input.rows[0]?.employee_id === "emp-002") {
        failSecond = false;
        const error = new Error("synthetic upload interruption");
        error.safe_error_code = "SYNTHETIC_UPLOAD_INTERRUPTION";
        throw error;
      }
      return first.manualService.executeManual(context, input);
    },
  };
  const service = createLeaveOccurrenceUploadBatchService({ store: first.store, manualService: faultedManualService, clock: () => NOW });
  const preview = service.preview(CONTEXT, { csv_text: csv(first.manualService), schedule_only: true, as_of: "2026-07-14", idempotency_key: "upload-preview-resume" });
  const partial = service.execute(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash, approved_by_actor_id: "hr-approver", idempotency_key: "upload-execute-resume" });
  assert.equal(partial.status, "completed_with_errors");
  assert.deepEqual(partial.rows.map((row) => [row.execution_status, row.attempt_count]), [["completed", 1], ["failed", 1]]);
  assert.equal(first.store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 1);
  const snapshot = first.store.snapshot();
  first.store.close();

  const store = createFileHrxStore({ initialState: snapshot });
  const manualService = createLeaveAccrualService({
    store,
    clock: () => NOW,
    approverAuthorizer: ({ tenant_id, actor_id, required_scope }) => tenant_id === TENANT && actor_id === "hr-approver" && required_scope === "hrx.leave.ledger.adjust",
  });
  const resumedService = createLeaveOccurrenceUploadBatchService({ store, manualService, clock: () => NOW });
  const resumed = resumedService.resume(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash });
  assert.equal(resumed.status, "completed");
  assert.deepEqual(resumed.rows.map((row) => [row.execution_status, row.attempt_count]), [["completed", 1], ["completed", 2]]);
  assert.equal(resumed.counts.new_entries, 1);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 2);
  assert.equal(resumedService.resume(CONTEXT, { upload_batch_id: preview.upload_batch_id, preview_hash: preview.preview_hash }).replayed, true);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 2);
  store.close();
});
