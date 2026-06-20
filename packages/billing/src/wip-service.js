import { appendFinanceAuditEvent } from "./finance-audit.js";
import { rateForRole } from "../../time-expense/src/rate-card-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function amountForSource(item, rateCard) {
  if (item.model_type === "TimeEntry") return Number(((Number(item.duration_minutes) / 60) * rateForRole(rateCard, item.role_id)).toFixed(2));
  return Number(item.amount ?? 0);
}

export function generateWipFromApprovedItems({
  repository,
  tenant_id,
  matter_id,
  source_items,
  rate_card,
  actor_id,
  idempotency_key,
} = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const approved = (source_items ?? repository.list({ tenant_id, matter_id })).filter(
    (item) =>
      ["TimeEntry", "Expense", "Disbursement"].includes(item.model_type) &&
      item.matter_id === matter_id &&
      (item.status === "approved" || item.approved_for_wip === true) &&
      item.billable !== false,
  );
  if (approved.length === 0) throw new Error("approved billable source item is required");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const wip_items = approved.map((item, index) =>
      tx.create({
        model_type: "WipItem",
        wip_item_id: `wip:${tenant_id}:${matter_id}:${item.resource_id ?? item.time_entry_id ?? item.expense_id ?? item.disbursement_id}:${index}`,
        tenant_id,
        matter_id,
        source_model_type: item.model_type,
        source_id: item.resource_id ?? item.time_entry_id ?? item.expense_id ?? item.disbursement_id,
        amount: amountForSource(item, rate_card),
        currency: rate_card?.currency ?? item.currency ?? "KRW",
        status: "open",
      }),
    );
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "wip.generate",
        object_type: "Matter",
        object_id: matter_id,
        idempotency_key,
        metadata: { wip_item_count: wip_items.length },
      },
    });
    const response = Object.freeze({ outcome: "created", wip_items: Object.freeze(wip_items), audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "wip_generate", response });
    return response;
  });
}

export function lockWipSnapshot({ repository, tenant_id, matter_id, wip_item_ids, actor_id, idempotency_key, wip_snapshot_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const items = repository.list({ tenant_id, matter_id, model_type: "WipItem" }).filter((item) => (wip_item_ids ?? []).includes(item.wip_item_id));
  if (!Array.isArray(wip_item_ids) || wip_item_ids.length === 0 || items.length !== wip_item_ids.length) {
    throw new Error("WIP snapshot item refs must match source WIP items");
  }
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const snapshot = tx.create({
      model_type: "WipSnapshot",
      wip_snapshot_id: wip_snapshot_id ?? `snapshot:${tenant_id}:${matter_id}:${Date.now()}`,
      tenant_id,
      matter_id,
      item_refs: Object.freeze([...wip_item_ids]),
      locked_at: new Date().toISOString(),
      immutable_snapshot: true,
      total_amount: items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
      status: "locked",
    });
    for (const item of items) tx.update({ tenant_id, model_type: "WipItem", wip_item_id: item.wip_item_id }, { status: "locked", updates_database_rows: true });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "wip.snapshot.lock",
        object_type: "WipSnapshot",
        object_id: snapshot.wip_snapshot_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", wip_snapshot: snapshot, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "wip_snapshot_lock", response });
    return response;
  });
}
