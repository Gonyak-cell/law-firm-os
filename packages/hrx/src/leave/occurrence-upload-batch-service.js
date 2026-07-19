import { createHash, randomUUID } from "node:crypto";
import { assertHrxStorePort } from "../store/port.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function safeErrorCode(error) {
  return error?.safe_error_code ?? "HRX_LEAVE_OCCURRENCE_UPLOAD_ROW_EXECUTION_FAILED";
}

function parseJson(text) {
  return JSON.parse(text || "{}");
}

function publicRow(row) {
  const executionResult = parseJson(row.execution_result_json);
  return Object.freeze({
    row_number: row.row_number,
    row_key: row.row_key,
    employee_id: row.employee_id,
    preview_status: row.preview_status,
    execution_status: row.execution_status,
    error_code: row.preview_error_code ?? row.execution_error_code ?? null,
    error_message: row.preview_error_message ?? executionResult.error_message ?? null,
    duplicate_of_row_number: row.duplicate_of_row_number,
    attempt_count: row.attempt_count,
    result: Object.keys(executionResult).length > 0 ? executionResult : null,
  });
}

function batchRows(store, tenantId, batchId) {
  return store
    .query("select", { table: "hrx_leave_occurrence_upload_rows", where: { tenant_id: tenantId, upload_batch_id: batchId } })
    .sort((left, right) => left.row_number - right.row_number);
}

function batchApproval(store, row) {
  const receipt = store.query("selectOne", {
    table: "hrx_leave_command_receipts",
    where: { tenant_id: row.tenant_id, idempotency_key: `leave-manual-approval:occurrence_upload:${row.upload_batch_id}` },
  });
  if (!receipt || receipt.command_type !== "leave_manual_approval") return null;
  const result = parseJson(receipt.result_json);
  if (result.object_id !== row.upload_batch_id || result.snapshot_hash !== row.preview_hash) return null;
  return Object.freeze({ approval_receipt_id: receipt.command_receipt_id, approved_by_actor_id: result.approved_by_actor_id ?? null });
}

function batchView(store, row, { replayed = false, newEntries = 0 } = {}) {
  if (!row) return undefined;
  const rows = batchRows(store, row.tenant_id, row.upload_batch_id);
  const approval = batchApproval(store, row);
  return Object.freeze({
    tenant_id: row.tenant_id,
    upload_batch_id: row.upload_batch_id,
    template_version: row.template_version,
    file_hash: row.file_hash,
    preview_hash: row.preview_hash,
    schedule_only: row.schedule_only,
    as_of: row.as_of,
    status: row.status,
    row_count: row.row_count,
    created_by_actor_id: row.created_by_actor_id,
    approved_by_actor_id: row.approved_by_actor_id ?? approval?.approved_by_actor_id ?? null,
    approval_receipt_id: approval?.approval_receipt_id ?? null,
    state_version: row.state_version,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    replayed,
    counts: Object.freeze({
      ready: row.ready_count,
      preview_errors: row.error_count,
      duplicates: row.duplicate_count,
      completed: rows.filter((item) => item.execution_status === "completed").length,
      failed: rows.filter((item) => item.execution_status === "failed").length,
      pending: rows.filter((item) => ["pending", "running"].includes(item.execution_status)).length,
      new_entries: newEntries,
    }),
    rows: Object.freeze(rows.map(publicRow)),
  });
}

export function createLeaveOccurrenceUploadBatchService({
  store,
  manualService,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  assertHrxStorePort(store);
  if (!manualService || typeof manualService.prepareManualUpload !== "function" || typeof manualService.executeApprovedUploadRow !== "function" || typeof manualService.recordManualApproval !== "function" || typeof manualService.assertManualApprovalReceipt !== "function") {
    throw new TypeError("leave occurrence upload batch service requires the manual accrual service");
  }

  function get(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const batchId = requiredString(input, "upload_batch_id");
    return store.query("selectOne", { table: "hrx_leave_occurrence_upload_batches", where: { tenant_id: tenantId, upload_batch_id: batchId } });
  }

  function requireBatch(context, input) {
    const batch = get(context, input);
    if (!batch) throw guardedError("Leave occurrence upload batch not found", "HRX_LEAVE_OCCURRENCE_UPLOAD_BATCH_NOT_FOUND", 404);
    return batch;
  }

  function read(context, input) {
    return batchView(store, requireBatch(context, input));
  }

  function preview(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const idempotencyKey = requiredString(input, "idempotency_key");
    if (!input.csv_text && !input.xlsx_content_base64 && !(input.format === "xlsx" && input.content_base64)) {
      throw new TypeError("csv_text or xlsx_content_base64 is required");
    }
    const prepared = manualService.prepareManualUpload(context, input);
    if (!prepared.template_version) {
      throw guardedError("A versioned occurrence upload template is required", "HRX_LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_REQUIRED", 400);
    }
    const inputHash = hash({
      file_hash: prepared.file_hash,
      template_version: prepared.template_version,
      schedule_only: prepared.schedule_only,
      as_of: prepared.as_of,
    });
    const existing = store.query("selectOne", { table: "hrx_leave_occurrence_upload_batches", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) {
      if (existing.input_hash !== inputHash) throw guardedError("Idempotency key was reused with a different upload", "HRX_LEAVE_OCCURRENCE_UPLOAD_IDEMPOTENCY_CONFLICT");
      return batchView(store, existing, { replayed: true });
    }
    const previewHash = hash({ file_hash: prepared.file_hash, snapshot_hash: prepared.snapshot_hash, schedule_only: prepared.schedule_only, as_of: prepared.as_of });
    const batchId = input.upload_batch_id ?? idFactory("leave_occurrence_upload_batch");
    const now = clock();
    return store.transaction((tx) => {
      const parent = tx.query("insert", {
        table: "hrx_leave_occurrence_upload_batches",
        row: {
          tenant_id: tenantId,
          upload_batch_id: batchId,
          template_version: prepared.template_version,
          file_hash: prepared.file_hash,
          preview_hash: previewHash,
          input_hash: inputHash,
          idempotency_key: idempotencyKey,
          execute_idempotency_key: null,
          schedule_only: prepared.schedule_only,
          as_of: prepared.as_of,
          status: "previewed",
          row_count: prepared.rows.length,
          ready_count: prepared.counts.ready,
          error_count: prepared.counts.errors,
          duplicate_count: prepared.counts.duplicates,
          created_by_actor_id: actorId,
          approved_by_actor_id: null,
          state_version: 1,
          created_at: now,
          updated_at: now,
          completed_at: null,
        },
      });
      for (const row of prepared.rows) {
        const ready = row.status === "ready";
        tx.query("insert", {
          table: "hrx_leave_occurrence_upload_rows",
          row: {
            tenant_id: tenantId,
            upload_row_id: idFactory("leave_occurrence_upload_row"),
            upload_batch_id: batchId,
            row_number: row.row_number,
            row_key: row.row_key ?? null,
            employee_id: row.employee_id ?? null,
            payload_json: ready ? JSON.stringify(row) : "{}",
            preview_status: row.status,
            preview_error_code: row.error_code ?? null,
            preview_error_message: row.error_message ?? null,
            duplicate_of_row_number: row.duplicate_of_row_number ?? null,
            execution_status: ready ? "pending" : "invalid",
            execution_result_json: "{}",
            execution_error_code: null,
            attempt_count: 0,
            state_version: 1,
            created_at: now,
            updated_at: now,
            completed_at: null,
          },
        });
      }
      return batchView(tx, parent);
    });
  }

  function updateBatch(batch, patch) {
    return store.query("updateOne", {
      table: "hrx_leave_occurrence_upload_batches",
      where: { tenant_id: batch.tenant_id, upload_batch_id: batch.upload_batch_id },
      expected_version: batch.state_version,
      patch: { ...patch, state_version: batch.state_version + 1, updated_at: clock() },
    });
  }

  function updateRow(row, patch) {
    return store.query("updateOne", {
      table: "hrx_leave_occurrence_upload_rows",
      where: { tenant_id: row.tenant_id, upload_row_id: row.upload_row_id },
      expected_version: row.state_version,
      patch: { ...patch, state_version: row.state_version + 1, updated_at: clock() },
    });
  }

  function assertPreviewHash(batch, input) {
    const previewHash = requiredString(input, "preview_hash");
    if (previewHash !== batch.preview_hash) throw guardedError("Upload preview hash does not match", "HRX_LEAVE_OCCURRENCE_UPLOAD_PREVIEW_MISMATCH");
  }

  function runRows(context, batch, statuses) {
    let newEntries = 0;
    for (const pending of batchRows(store, batch.tenant_id, batch.upload_batch_id).filter((row) => statuses.includes(row.execution_status))) {
      let running = updateRow(pending, {
        execution_status: "running",
        execution_error_code: null,
        attempt_count: pending.attempt_count + 1,
        completed_at: null,
      });
      try {
        const result = manualService.executeApprovedUploadRow(context, {
          row: parseJson(running.payload_json),
          schedule_only: batch.schedule_only,
          as_of: batch.as_of,
          approval_receipt_id: batchApproval(store, batch)?.approval_receipt_id,
          upload_batch_id: batch.upload_batch_id,
          preview_hash: batch.preview_hash,
          idempotency_key: `${batch.execute_idempotency_key}:${running.row_key}`,
        });
        const rowResult = result.rows[0];
        if (rowResult?.status !== "created") {
          updateRow(running, {
            execution_status: "failed",
            execution_result_json: JSON.stringify(rowResult ?? {}),
            execution_error_code: rowResult?.error_code ?? "HRX_LEAVE_OCCURRENCE_UPLOAD_ROW_EXECUTION_FAILED",
            completed_at: clock(),
          });
          continue;
        }
        updateRow(running, {
          execution_status: "completed",
          execution_result_json: JSON.stringify(rowResult),
          execution_error_code: null,
          completed_at: clock(),
        });
        newEntries += 1;
      } catch (error) {
        updateRow(running, {
          execution_status: "failed",
          execution_result_json: JSON.stringify({ error_message: error.message }),
          execution_error_code: safeErrorCode(error),
          completed_at: clock(),
        });
      }
    }
    return newEntries;
  }

  function finish(batch, newEntries) {
    const rows = batchRows(store, batch.tenant_id, batch.upload_batch_id);
    const status = rows.some((row) => row.execution_status === "failed") ? "completed_with_errors" : "completed";
    const current = requireBatch({ tenant_id: batch.tenant_id }, { upload_batch_id: batch.upload_batch_id });
    const completed = updateBatch(current, { status, completed_at: clock() });
    return batchView(store, completed, { newEntries });
  }

  function approve(context, input) {
    const batch = requireBatch(context, input);
    assertPreviewHash(batch, input);
    if (batch.status !== "previewed") throw guardedError("Upload batch is not ready for approval", "HRX_LEAVE_OCCURRENCE_UPLOAD_STATE_INVALID");
    if (batch.error_count > 0) throw guardedError("Upload preview errors must be fixed before approval", "HRX_LEAVE_OCCURRENCE_UPLOAD_PREVIEW_HAS_ERRORS");
    return manualService.recordManualApproval(context, {
      approval_kind: "occurrence_upload",
      object_id: batch.upload_batch_id,
      snapshot_hash: batch.preview_hash,
      initiated_by_actor_id: batch.created_by_actor_id,
    });
  }

  function execute(context, input) {
    const batch = requireBatch(context, input);
    assertPreviewHash(batch, input);
    const executeIdempotencyKey = requiredString(input, "idempotency_key");
    const approval = manualService.assertManualApprovalReceipt(context, { approval_receipt_id: input.approval_receipt_id, approval_kind: "occurrence_upload", object_id: batch.upload_batch_id, snapshot_hash: batch.preview_hash });
    if (batch.execute_idempotency_key) {
      if (batch.execute_idempotency_key !== executeIdempotencyKey || batch.approved_by_actor_id !== approval.approved_by_actor_id || batchApproval(store, batch)?.approval_receipt_id !== approval.approval_receipt_id) {
        throw guardedError("Upload execution idempotency key was reused with different approval", "HRX_LEAVE_OCCURRENCE_UPLOAD_EXECUTION_CONFLICT");
      }
      return batchView(store, batch, { replayed: true });
    }
    if (batch.status !== "previewed") throw guardedError("Upload batch is not ready to execute", "HRX_LEAVE_OCCURRENCE_UPLOAD_STATE_INVALID");
    if (batch.error_count > 0) throw guardedError("Upload preview errors must be fixed before execution", "HRX_LEAVE_OCCURRENCE_UPLOAD_PREVIEW_HAS_ERRORS");
    const running = updateBatch(batch, {
      status: "running",
      execute_idempotency_key: executeIdempotencyKey,
      approved_by_actor_id: approval.approved_by_actor_id,
      completed_at: null,
    });
    return finish(running, runRows(context, running, ["pending"]));
  }

  function resume(context, input) {
    let batch = requireBatch(context, input);
    assertPreviewHash(batch, input);
    requiredString(context, "actor_id");
    if (context.step_up_verified !== true) throw guardedError("Fresh MFA is required", "HRX_STEP_UP_REQUIRED", 403);
    if (batch.status === "completed") return batchView(store, batch, { replayed: true });
    if (!batch.execute_idempotency_key || !batch.approved_by_actor_id || !batchApproval(store, batch) || !["running", "completed_with_errors"].includes(batch.status)) {
      throw guardedError("Upload batch has no retryable execution", "HRX_LEAVE_OCCURRENCE_UPLOAD_STATE_INVALID");
    }
    if (batch.status !== "running") batch = updateBatch(batch, { status: "running", completed_at: null });
    return finish(batch, runRows(context, batch, ["failed", "running"]));
  }

  return Object.freeze({ preview, read, approve, execute, resume });
}
