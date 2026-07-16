import { appendFinanceAuditEvent } from "./finance-audit.js";
import { rateForRole } from "../../time-expense/src/rate-card-service.js";
import { findFeeArrangementForMatter, normalizeFeeArrangementType } from "../../time-expense/src/fee-arrangement-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function amountForSource(item, rateCard) {
  if (item.model_type === "TimeEntry") return Number(((Number(item.duration_minutes) / 60) * rateForRole(rateCard, item.role_id)).toFixed(2));
  return Number(item.amount ?? 0);
}

function moneyValue(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function retainerAvailableAmount(feeArrangement) {
  return moneyValue(feeArrangement?.retainer_available_amount ?? feeArrangement?.retainer_balance_amount ?? feeArrangement?.retainer_amount);
}

function calculateWipAmountForSource({ item, rateCard, feeArrangement, feeSourceIndex, retainerRemaining }) {
  const standardAmount = amountForSource(item, rateCard);
  if (!feeArrangement || item.model_type !== "TimeEntry") {
    return Object.freeze({
      amount: moneyValue(standardAmount),
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: 0,
      success_fee_applied: false,
      billing_calculation_source: feeArrangement ? "fee_arrangement.pass_through" : "rate_card",
      fee_arrangement_type: feeArrangement ? normalizeFeeArrangementType(feeArrangement) : "hourly",
    });
  }

  const type = normalizeFeeArrangementType(feeArrangement);
  if (type === "fixed") {
    return Object.freeze({
      amount: feeSourceIndex === 0 ? moneyValue(feeArrangement.fixed_fee_amount) : 0,
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: 0,
      success_fee_applied: false,
      billing_calculation_source: "fee_arrangement.fixed",
      fee_arrangement_type: type,
    });
  }
  if (type === "success_fee") {
    const successAmount = feeArrangement.success_condition_met === true ? moneyValue(feeArrangement.success_fee_amount) : 0;
    return Object.freeze({
      amount: feeSourceIndex === 0 ? moneyValue(feeArrangement.upfront_fee_amount) + successAmount : 0,
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: 0,
      success_fee_applied: successAmount > 0,
      billing_calculation_source: "fee_arrangement.success_fee",
      fee_arrangement_type: type,
    });
  }
  if (type === "retainer") {
    const drawdown = Math.min(moneyValue(standardAmount), Math.max(0, moneyValue(retainerRemaining)));
    return Object.freeze({
      amount: moneyValue(standardAmount - drawdown),
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: drawdown,
      success_fee_applied: false,
      billing_calculation_source: "fee_arrangement.retainer_drawdown",
      fee_arrangement_type: type,
    });
  }
  return Object.freeze({
    amount: moneyValue(standardAmount),
    standard_amount: moneyValue(standardAmount),
    retainer_drawdown_amount: 0,
    success_fee_applied: false,
    billing_calculation_source: "fee_arrangement.hourly",
    fee_arrangement_type: type,
  });
}

export function generateWipFromApprovedItems({
  repository,
  tenant_id,
  matter_id,
  source_items,
  rate_card,
  fee_arrangement,
  fee_arrangement_id,
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
  const arrangement = fee_arrangement ?? findFeeArrangementForMatter({ repository, tenant_id, matter_id, fee_arrangement_id });
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    let feeSourceIndex = 0;
    let retainerRemaining = retainerAvailableAmount(arrangement);
    const wip_items = approved.map((item, index) => {
      const calculation = calculateWipAmountForSource({
        item,
        rateCard: rate_card,
        feeArrangement: arrangement,
        feeSourceIndex,
        retainerRemaining,
      });
      if (item.model_type === "TimeEntry") {
        feeSourceIndex += 1;
        retainerRemaining = moneyValue(retainerRemaining - calculation.retainer_drawdown_amount);
      }
      return tx.create({
        model_type: "WipItem",
        wip_item_id: `wip:${tenant_id}:${matter_id}:${item.resource_id ?? item.time_entry_id ?? item.expense_id ?? item.disbursement_id}:${index}`,
        tenant_id,
        matter_id,
        source_model_type: item.model_type,
        source_id: item.resource_id ?? item.time_entry_id ?? item.expense_id ?? item.disbursement_id,
        amount: calculation.amount,
        standard_amount: calculation.standard_amount,
        fee_arrangement_id: arrangement?.fee_arrangement_id ?? null,
        fee_arrangement_type: calculation.fee_arrangement_type,
        billing_calculation_source: calculation.billing_calculation_source,
        retainer_drawdown_amount: calculation.retainer_drawdown_amount,
        success_fee_applied: calculation.success_fee_applied,
        currency: rate_card?.currency ?? item.currency ?? "KRW",
        status: "open",
      });
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "wip.generate",
        object_type: "Matter",
        object_id: matter_id,
        idempotency_key,
        metadata: {
          wip_item_count: wip_items.length,
          fee_arrangement_id: arrangement?.fee_arrangement_id ?? null,
          fee_arrangement_type: arrangement ? normalizeFeeArrangementType(arrangement) : "hourly",
        },
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
    const feeArrangementIds = new Set(items.map((item) => item.fee_arrangement_id).filter(Boolean));
    const feeArrangementTypes = new Set(items.map((item) => item.fee_arrangement_type).filter(Boolean));
    const snapshot = tx.create({
      model_type: "WipSnapshot",
      wip_snapshot_id: wip_snapshot_id ?? `snapshot:${tenant_id}:${matter_id}:${Date.now()}`,
      tenant_id,
      matter_id,
      item_refs: Object.freeze([...wip_item_ids]),
      locked_at: new Date().toISOString(),
      immutable_snapshot: true,
      total_amount: moneyValue(items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)),
      standard_amount: moneyValue(items.reduce((sum, item) => sum + Number(item.standard_amount ?? item.amount ?? 0), 0)),
      retainer_drawdown_total: moneyValue(items.reduce((sum, item) => sum + Number(item.retainer_drawdown_amount ?? 0), 0)),
      success_fee_applied: items.some((item) => item.success_fee_applied === true),
      fee_arrangement_id: feeArrangementIds.size === 1 ? feeArrangementIds.values().next().value : null,
      fee_arrangement_type: feeArrangementTypes.size === 1 ? feeArrangementTypes.values().next().value : "mixed",
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
