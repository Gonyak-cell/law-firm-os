import { appendFinanceAuditEvent } from "./finance-audit.js";
import { lockWipSnapshot } from "./wip-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function snapshotCurrency(snapshot) {
  const currencies = new Set(
    [
      snapshot.currency,
      ...(snapshot.item_snapshots ?? []).map((item) => item.currency),
    ]
      .filter((value) => typeof value === "string" && value.trim() !== "")
      .map((value) => value.trim().toUpperCase()),
  );
  if (currencies.size > 1) throw new Error("WIP snapshot currencies must agree");
  return currencies.values().next().value ?? "KRW";
}

const PREBILL_TRANSITIONS = Object.freeze({
  partner_review_required: Object.freeze({
    approve_with_adjustment: "partner_approved",
    approve_without_adjustment: "partner_approved",
    reject: "rejected",
  }),
  partner_approved: Object.freeze({}),
  rejected: Object.freeze({}),
});

function requirePreBillTransition(repository, prebill, action) {
  const linkedInvoice = repository
    .list({ tenant_id: prebill.tenant_id, model_type: "Invoice" })
    .find((invoice) => invoice.prebill_id === prebill.prebill_id);
  if (linkedInvoice) throw new Error("PreBill linked to an Invoice is immutable");
  const targetStatus = PREBILL_TRANSITIONS[prebill.status]?.[action];
  if (!targetStatus) throw new Error(`invalid PreBill transition: ${prebill.status ?? "unknown"} -> ${action}`);
  return targetStatus;
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
  if (snapshot.matter_id !== prebill.matter_id) throw new Error("PreBill matter must match WIP snapshot");
  const idempotency = {
    tenant_id: prebill.tenant_id,
    idempotency_key,
    operation: "prebill_create",
    actor_id,
    object_type: "WipSnapshot",
    object_id: prebill.wip_snapshot_id,
    request: { prebill },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const existing = repository
    .list({ tenant_id: prebill.tenant_id, model_type: "PreBill", matter_id: prebill.matter_id })
    .find((item) => item.wip_snapshot_id === prebill.wip_snapshot_id);
  if (existing) throw new Error("WIP snapshot already has a PreBill");
  return repository.transaction((tx) => {
    const record = tx.create({
      ...prebill,
      model_type: "PreBill",
      status: "partner_review_required",
      total_amount: Number(snapshot.total_amount),
      standard_amount: Number(snapshot.standard_amount ?? snapshot.total_amount),
      retainer_drawdown_total: Number(snapshot.retainer_drawdown_total ?? 0),
      success_fee_applied: snapshot.success_fee_applied === true,
      fee_arrangement_id: snapshot.fee_arrangement_id ?? null,
      fee_arrangement_type: snapshot.fee_arrangement_type ?? "hourly",
      currency: snapshotCurrency(snapshot),
      adjustments_total: 0,
      adjustment_total: 0,
      approved_without_adjustment: false,
      partner_approved_by: null,
      partner_approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason_code: null,
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
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function createMatterPreBillFromWip({
  repository,
  tenant_id,
  matter_id,
  wip_item_ids,
  wip_snapshot_id,
  prebill = {},
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const matterId = requiredString({ matter_id }, "matter_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const prebillId = requiredString(prebill, "prebill_id");
  requiredString(prebill, "partner_reviewer_id");
  const selectedWipItemIds = [...(wip_item_ids ?? [])].sort();
  const idempotency = {
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation: "matter_prebill_create",
    actor_id: actorId,
    object_type: "Matter",
    object_id: matterId,
    request: {
      tenant_id: tenantId,
      matter_id: matterId,
      wip_item_ids: selectedWipItemIds,
      wip_snapshot_id: wip_snapshot_id ?? null,
      prebill,
    },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const locked = lockWipSnapshot({
      repository: tx,
      tenant_id: tenantId,
      matter_id: matterId,
      wip_item_ids: selectedWipItemIds,
      wip_snapshot_id: wip_snapshot_id ?? `snapshot:${tenantId}:${matterId}:${prebillId}`,
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:snapshot`,
    });
    const created = createPreBill({
      repository: tx,
      prebill: {
        ...prebill,
        prebill_id: prebillId,
        tenant_id: tenantId,
        matter_id: matterId,
        wip_snapshot_id: locked.wip_snapshot.wip_snapshot_id,
      },
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:prebill`,
    });
    const response = Object.freeze({
      outcome: "created",
      wip_snapshot: locked.wip_snapshot,
      prebill: created.prebill,
      audit_events: Object.freeze([locked.audit_event, created.audit_event]),
      idempotent_replay: false,
    });
    tx.recordIdempotency({ ...idempotency, response });
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
  const idempotency = {
    tenant_id: adjustment.tenant_id,
    idempotency_key,
    operation: "prebill_adjustment_approve",
    actor_id,
    object_type: "PreBill",
    object_id: adjustment.prebill_id,
    request: { adjustment },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const prebill = tx.get({ tenant_id: adjustment.tenant_id, model_type: "PreBill", prebill_id: adjustment.prebill_id });
    if (!prebill) throw new Error("PreBill not found");
    const targetStatus = requirePreBillTransition(tx, prebill, "approve_with_adjustment");
    const currentAdjustmentsTotal = Number(prebill.adjustments_total ?? prebill.adjustment_total ?? 0);
    const remainingAmount = Number(prebill.total_amount ?? 0);
    if (amount > remainingAmount) throw new Error("adjustment amount exceeds PreBill remaining amount");
    const adjustmentsTotal = currentAdjustmentsTotal + amount;
    const record = tx.create({
      ...adjustment,
      model_type: "BillingAdjustment",
      status: "approved",
      adjustment_type: adjustment.adjustment_type ?? "write_down",
    });
    const updated = tx.update(
      { tenant_id: adjustment.tenant_id, model_type: "PreBill", prebill_id: adjustment.prebill_id },
      {
        adjustments_total: adjustmentsTotal,
        adjustment_total: adjustmentsTotal,
        total_amount: remainingAmount - amount,
        status: targetStatus,
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
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function approvePreBillWithoutAdjustment({ repository, tenant_id, prebill_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ prebill_id }, "prebill_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const idempotency = {
    tenant_id,
    idempotency_key,
    operation: "prebill_approve_without_adjustment",
    actor_id,
    object_type: "PreBill",
    object_id: prebill_id,
    request: { tenant_id, prebill_id },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const prebill = tx.get({ tenant_id, model_type: "PreBill", prebill_id });
    if (!prebill) throw new Error("PreBill not found");
    const targetStatus = requirePreBillTransition(tx, prebill, "approve_without_adjustment");
    const updated = tx.update(
      { tenant_id, model_type: "PreBill", prebill_id },
      {
        status: targetStatus,
        approved_without_adjustment: true,
        partner_approved_by: actor_id,
        partner_approved_at: new Date().toISOString(),
        adjustments_total: Number(prebill.adjustments_total ?? prebill.adjustment_total ?? 0),
        adjustment_total: Number(prebill.adjustments_total ?? prebill.adjustment_total ?? 0),
        total_amount: Number(prebill.total_amount ?? 0),
        updates_database_rows: true,
      },
    );
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "prebill.approve_without_adjustment",
        object_type: "PreBill",
        object_id: prebill_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "approved", prebill: updated, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function rejectPreBill({ repository, tenant_id, prebill_id, reason_code, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ prebill_id }, "prebill_id");
  requiredString({ reason_code }, "reason_code");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const idempotency = {
    tenant_id,
    idempotency_key,
    operation: "prebill_reject",
    actor_id,
    object_type: "PreBill",
    object_id: prebill_id,
    request: { tenant_id, prebill_id, reason_code },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const prebill = tx.get({ tenant_id, model_type: "PreBill", prebill_id });
    if (!prebill) throw new Error("PreBill not found");
    const targetStatus = requirePreBillTransition(tx, prebill, "reject");
    const updated = tx.update(
      { tenant_id, model_type: "PreBill", prebill_id },
      {
        status: targetStatus,
        rejected_by: actor_id,
        rejected_at: new Date().toISOString(),
        rejection_reason_code: reason_code,
        updates_database_rows: true,
      },
    );
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "prebill.reject",
        object_type: "PreBill",
        object_id: prebill_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "rejected", prebill: updated, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}
