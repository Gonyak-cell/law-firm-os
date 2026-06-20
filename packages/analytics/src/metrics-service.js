import { appendAnalyticsAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function sum(items, field) {
  return (items ?? []).reduce((total, item) => total + Number(item?.[field] ?? 0), 0);
}

function writeMetric({ repository, model_type, id_field, record, actor_id, idempotency_key, action }) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(record, "tenant_id");
  const replay = repository.getIdempotency({ tenant_id: record.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const persisted = tx.upsert({ ...record, model_type });
    const auditEvent = appendAnalyticsAuditEvent({
      repository: tx,
      event: {
        tenant_id: persisted.tenant_id,
        actor_id,
        action,
        object_type: model_type,
        object_id: persisted[id_field],
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "updated", item: persisted, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: persisted.tenant_id, idempotency_key, operation: action, response });
    return response;
  });
}

export function createMatterProfitability({ repository, tenant_id, matter_id, time_entries = [], invoices = [], payments = [], actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  if (time_entries.length === 0 || invoices.length === 0 || payments.length === 0) throw new Error("matter profitability requires time, invoice, and payment evidence");
  const standardValue = sum(time_entries, "standard_value") || sum(time_entries, "amount");
  const billedValue = sum(invoices, "amount_due") || sum(invoices, "invoice_total");
  const collectedValue = sum(payments, "amount") || sum(payments, "payment_total");
  return writeMetric({
    repository,
    model_type: "MatterProfitability",
    id_field: "matter_profitability_id",
    record: {
      matter_profitability_id: `matter-profit:${tenant_id}:${matter_id}`,
      tenant_id,
      matter_id,
      standard_value: standardValue,
      billed_value: billedValue,
      collected_value: collectedValue,
      profitability_amount: collectedValue - standardValue,
      source_object_mutated: false,
    },
    actor_id,
    idempotency_key,
    action: "analytics.matter_profitability.refresh",
  });
}

export function createClientProfitability({ repository, tenant_id, client_group_id, matter_rows = [], actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ client_group_id }, "client_group_id");
  if (matter_rows.length === 0) throw new Error("client profitability requires matter rows");
  return writeMetric({
    repository,
    model_type: "ClientProfitability",
    id_field: "client_profitability_id",
    record: {
      client_profitability_id: `client-profit:${tenant_id}:${client_group_id}`,
      tenant_id,
      client_group_id,
      matter_count: matter_rows.length,
      profitability_amount: sum(matter_rows, "profitability_amount"),
      created_client_identity: false,
      source_object_mutated: false,
    },
    actor_id,
    idempotency_key,
    action: "analytics.client_profitability.refresh",
  });
}

export function createEmployeeUtilization({ repository, tenant_id, employee_id, period_id, capacity_hours, billable_hours, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ employee_id }, "employee_id");
  requiredString({ period_id }, "period_id");
  if (Number(capacity_hours) <= 0) throw new Error("capacity denominator is required");
  return writeMetric({
    repository,
    model_type: "EmployeeUtilization",
    id_field: "employee_utilization_id",
    record: {
      employee_utilization_id: `util:${tenant_id}:${employee_id}:${period_id}`,
      tenant_id,
      employee_id,
      period_id,
      capacity_hours: Number(capacity_hours),
      billable_hours: Number(billable_hours ?? 0),
      utilization_rate: Number((Number(billable_hours ?? 0) / Number(capacity_hours)).toFixed(4)),
      source_object_mutated: false,
    },
    actor_id,
    idempotency_key,
    action: "analytics.employee_utilization.refresh",
  });
}

export function createRealizationMetric({ repository, tenant_id, matter_id, billed_value, standard_value, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  if (Number(standard_value) <= 0) throw new Error("standard value denominator is required");
  return writeMetric({
    repository,
    model_type: "RealizationMetric",
    id_field: "realization_metric_id",
    record: {
      realization_metric_id: `realization:${tenant_id}:${matter_id}`,
      tenant_id,
      matter_id,
      billed_value: Number(billed_value ?? 0),
      standard_value: Number(standard_value),
      realization_rate: Number((Number(billed_value ?? 0) / Number(standard_value)).toFixed(4)),
      source_object_mutated: false,
    },
    actor_id,
    idempotency_key,
    action: "analytics.realization.refresh",
  });
}
