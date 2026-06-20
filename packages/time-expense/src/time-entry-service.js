import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function positiveNumber(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new TypeError(`${field} must be positive`);
  return parsed;
}

export function createTimeEntry({ repository, time_entry, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(time_entry, "tenant_id");
  requiredString(time_entry, "matter_id");
  requiredString(time_entry, "role_id");
  requiredString(time_entry, "work_date");
  requiredString(time_entry, "narrative");
  const durationMinutes = positiveNumber(time_entry.duration_minutes, "duration_minutes");
  if (typeof time_entry.billable !== "boolean") throw new TypeError("billable is required");
  const replay = repository.getIdempotency({ tenant_id: time_entry.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...time_entry,
      model_type: "TimeEntry",
      status: time_entry.status ?? "draft",
      actor_id: time_entry.actor_id ?? actor_id,
      duration_minutes: durationMinutes,
      approved_for_wip: false,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "time.entry.create",
        object_type: "TimeEntry",
        object_id: record.time_entry_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", time_entry: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "time_entry_create", response });
    return response;
  });
}

export function approveTimeEntryForWip({ repository, tenant_id, time_entry_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ time_entry_id }, "time_entry_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const updated = tx.update(
      { tenant_id, model_type: "TimeEntry", time_entry_id },
      { status: "approved", approved_for_wip: true, updates_database_rows: true },
    );
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "time.entry.approve_for_wip",
        object_type: "TimeEntry",
        object_id: time_entry_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "approved", time_entry: updated, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "time_entry_approve", response });
    return response;
  });
}
