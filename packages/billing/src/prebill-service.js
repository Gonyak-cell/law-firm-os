import { appendFinanceAuditEvent } from "./finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createPreBill({ repository, prebill, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(prebill, "tenant_id");
  requiredString(prebill, "matter_id");
  requiredString(prebill, "wip_snapshot_id");
  requiredString(prebill, "partner_reviewer_id");
  const snapshot = repository.get({ tenant_id: prebill.tenant_id, model_type: "WipSnapshot", wip_snapshot_id: prebill.wip_snapshot_id });
  if (!snapshot?.immutable_snapshot) throw new Error("PreBill requires immutable WIP snapshot");
  const replay = repository.getIdempotency({ tenant_id: prebill.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...prebill,
      model_type: "PreBill",
      status: prebill.status ?? "partner_review_required",
      total_amount: prebill.total_amount ?? snapshot.total_amount,
      adjustments_total: 0,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "prebill.create",
        object_type: "PreBill",
        object_id: record.prebill_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", prebill: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "prebill_create", response });
    return response;
  });
}

export function applyWriteDownOff({ repository, adjustment, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(adjustment, "tenant_id");
  requiredString(adjustment, "prebill_id");
  requiredString(adjustment, "reason_code");
  const amount = Number(adjustment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("adjustment amount must be positive");
  const replay = repository.getIdempotency({ tenant_id: adjustment.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const prebill = tx.get({ tenant_id: adjustment.tenant_id, model_type: "PreBill", prebill_id: adjustment.prebill_id });
    if (!prebill) throw new Error("PreBill not found");
    const record = tx.create({
      ...adjustment,
      model_type: "BillingAdjustment",
      status: "approved",
      adjustment_type: adjustment.adjustment_type ?? "write_down",
    });
    const updated = tx.update(
      { tenant_id: adjustment.tenant_id, model_type: "PreBill", prebill_id: adjustment.prebill_id },
      {
        adjustments_total: Number(prebill.adjustments_total ?? 0) + amount,
        total_amount: Math.max(0, Number(prebill.total_amount ?? 0) - amount),
        status: "partner_approved",
        updates_database_rows: true,
      },
    );
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "prebill.adjustment.approve",
        object_type: "BillingAdjustment",
        object_id: record.adjustment_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "approved", adjustment: record, prebill: updated, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "prebill_adjustment_approve", response });
    return response;
  });
}
