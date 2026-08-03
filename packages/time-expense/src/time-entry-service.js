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

// Workflow fields are owned by the submit/approve/lock commands.  Keeping
// the create/update allowlists next to the service boundary prevents API
// payloads from smuggling repository metadata or privileged state changes into
// a TimeEntry record.
const TIME_ENTRY_CREATE_FIELDS = Object.freeze([
  "time_entry_id",
  "tenant_id",
  "matter_id",
  "role_id",
  "work_date",
  "narrative",
  "duration_minutes",
  "billable",
  "currency",
]);

const TIME_ENTRY_UPDATE_FIELDS = Object.freeze([
  "matter_id",
  "role_id",
  "work_date",
  "narrative",
  "duration_minutes",
  "billable",
  "currency",
]);

function pickAllowedFields(value, fields) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));
}

function rejectUnsupportedUpdateFields(patch) {
  const unsupported = Object.keys(patch ?? {}).filter((field) => !TIME_ENTRY_UPDATE_FIELDS.includes(field));
  if (unsupported.length > 0) {
    throw new TypeError(`time entry update field is not editable: ${unsupported[0]}`);
  }
}

function canonicalRequest(value) {
  if (Array.isArray(value)) return value.map(canonicalRequest);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalRequest(value[key])]),
    );
  }
  return value;
}

function responseWithTimeEntryAliases(response, replayed = response?.idempotent_replay === true) {
  const item = response?.item ?? response?.time_entry ?? null;
  return Object.freeze({
    ...response,
    item,
    time_entry: item,
    summary: response?.summary ?? timeEntrySummary(item),
    replayed,
    idempotent_replay: replayed,
  });
}

function timeEntrySummary(item) {
  return Object.freeze({
    entry_count: item ? 1 : 0,
    total_minutes: Number(item?.duration_minutes ?? 0),
    billable_minutes: item?.billable === true ? Number(item?.duration_minutes ?? 0) : 0,
    matter_id: item?.matter_id ?? null,
  });
}

export function findTimeEntryBillingConsumption({ repository, tenant_id, time_entry_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ time_entry_id }, "time_entry_id");
  const entry = repository.get({ tenant_id, model_type: "TimeEntry", time_entry_id });
  if (entry && (entry.invoice_id || entry.invoice_line_id || entry.invoiced_at || entry.billed_at || entry.billed === true)) {
    return Object.freeze({ stage: "invoice", model_type: "TimeEntry", resource_id: time_entry_id });
  }
  const records = repository.list({ tenant_id });
  const wipItem = records.find((record) =>
    record.model_type === "WipItem"
    && record.source_model_type === "TimeEntry"
    && record.source_id === time_entry_id);
  if (wipItem) {
    return Object.freeze({ stage: "wip", model_type: "WipItem", resource_id: wipItem.wip_item_id });
  }
  const snapshot = records.find((record) =>
    record.model_type === "WipSnapshot"
    && record.item_snapshots?.some((item) =>
      item.source_model_type === "TimeEntry"
      && (item.source_id ?? item.time_entry_id) === time_entry_id));
  if (snapshot) {
    return Object.freeze({ stage: "wip_snapshot", model_type: "WipSnapshot", resource_id: snapshot.wip_snapshot_id });
  }
  const invoiceLine = records.find((record) =>
    record.model_type === "InvoiceLine"
    && (
      record.time_entry_id === time_entry_id
      || (record.source_model_type === "TimeEntry" && record.source_id === time_entry_id)
    ));
  if (invoiceLine) {
    return Object.freeze({ stage: "invoice", model_type: "InvoiceLine", resource_id: invoiceLine.invoice_line_id });
  }
  return null;
}

function timeEntryConsumedError(action) {
  const error = new Error(`time entry consumed by WIP or later billing lineage cannot be ${action}`);
  error.code = "TIME_ENTRY_BILLING_LINEAGE_CONFLICT";
  error.status = 409;
  error.status_code = 409;
  return error;
}

export function createTimeEntry({ repository, time_entry, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const userFields = pickAllowedFields(time_entry, TIME_ENTRY_CREATE_FIELDS);
  requiredString(userFields, "tenant_id");
  requiredString(userFields, "matter_id");
  requiredString(userFields, "role_id");
  requiredString(userFields, "work_date");
  requiredString(userFields, "narrative");
  const durationMinutes = positiveNumber(userFields.duration_minutes, "duration_minutes");
  if (typeof userFields.billable !== "boolean") throw new TypeError("billable is required");
  const timeEntryId = userFields.time_entry_id ?? `time:${userFields.tenant_id}:${idempotency_key}`;
  const request = canonicalRequest({ ...userFields, time_entry_id: timeEntryId });
  const replay = repository.getIdempotency({
    tenant_id: userFields.tenant_id,
    idempotency_key,
    operation: "time_entry_create",
    actor_id,
    object_type: "TimeEntry",
    object_id: timeEntryId,
    request,
  });
  if (replay) return responseWithTimeEntryAliases(replay.response, true);

  return repository.transaction((tx) => {
    const record = tx.create({
      ...userFields,
      time_entry_id: timeEntryId,
      model_type: "TimeEntry",
      status: "draft",
      actor_id,
      duration_minutes: durationMinutes,
      approved_for_wip: false,
      submitted_at: null,
      locked_at: null,
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
    const response = responseWithTimeEntryAliases({ outcome: "created", item: record, summary: timeEntrySummary(record), audit_event: auditEvent }, false);
    tx.recordIdempotency({
      tenant_id: record.tenant_id,
      idempotency_key,
      operation: "time_entry_create",
      actor_id,
      object_type: "TimeEntry",
      object_id: record.time_entry_id,
      request,
      response,
    });
    return response;
  });
}

export function approveTimeEntryForWip({ repository, tenant_id, time_entry_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ time_entry_id }, "time_entry_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const request = canonicalRequest({ tenant_id, time_entry_id });
  const replay = repository.getIdempotency({
    tenant_id,
    idempotency_key,
    operation: "time_entry_approve",
    actor_id,
    object_type: "TimeEntry",
    object_id: time_entry_id,
    request,
  });
  if (replay) return responseWithTimeEntryAliases(replay.response, true);
  const lockedAt = new Date().toISOString();
  return repository.transaction((tx) => {
    const updated = tx.update(
      { tenant_id, model_type: "TimeEntry", time_entry_id },
      { status: "approved", approved_for_wip: true, locked_at: lockedAt, updates_database_rows: true },
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
    const response = responseWithTimeEntryAliases({ outcome: "approved", item: updated, summary: timeEntrySummary(updated), audit_event: auditEvent }, false);
    tx.recordIdempotency({
      tenant_id,
      idempotency_key,
      operation: "time_entry_approve",
      actor_id,
      object_type: "TimeEntry",
      object_id: time_entry_id,
      request,
      response,
    });
    return response;
  });
}

/**
 * Fast path used by the small-firm Matter surface. It accepts either a
 * `time_entry` object or flat fields and supplies a deterministic id when the
 * caller only has an idempotency key.
 */
export function createQuickTimeEntry(input = {}) {
  const nested = input.time_entry ?? input.item ?? input.entry;
  const source = nested ?? input;
  const tenantId = source.tenant_id ?? input.tenant_id;
  const actorId = input.actor_id ?? source.actor_id ?? source.timekeeper_actor_id;
  const idempotencyKey = input.idempotency_key ?? source.idempotency_key;
  requiredString({ tenant_id: tenantId }, "tenant_id");
  requiredString({ actor_id: actorId }, "actor_id");
  requiredString({ idempotency_key: idempotencyKey }, "idempotency_key");
  const timeEntry = pickAllowedFields({
    ...source,
    tenant_id: tenantId,
    matter_id: source.matter_id ?? input.matter_id,
    role_id: source.role_id ?? input.role_id,
    work_date: source.work_date ?? input.work_date,
    narrative: source.narrative ?? input.narrative,
    duration_minutes: source.duration_minutes ?? input.duration_minutes,
    billable: source.billable ?? input.billable,
    time_entry_id: source.time_entry_id ?? input.time_entry_id ?? `time:${tenantId}:${idempotencyKey}`,
  }, TIME_ENTRY_CREATE_FIELDS);
  return createTimeEntry({ repository: input.repository, time_entry: timeEntry, actor_id: actorId, idempotency_key: idempotencyKey });
}

/**
 * Update the editable fields of a time entry. Lock state is checked here so
 * all callers (including future API adapters) share the same mutation guard.
 */
export function updateTimeEntry({ repository, tenant_id, time_entry_id, patch = {}, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ time_entry_id }, "time_entry_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  rejectUnsupportedUpdateFields(patch);
  const next = pickAllowedFields(patch, TIME_ENTRY_UPDATE_FIELDS);
  if (next.duration_minutes !== undefined) next.duration_minutes = positiveNumber(next.duration_minutes, "duration_minutes");
  if (next.narrative !== undefined) requiredString(next, "narrative");
  if (next.matter_id !== undefined) requiredString(next, "matter_id");
  if (next.role_id !== undefined) requiredString(next, "role_id");
  if (next.work_date !== undefined) requiredString(next, "work_date");
  if (next.billable !== undefined && typeof next.billable !== "boolean") throw new TypeError("billable must be boolean");
  const request = canonicalRequest({ tenant_id, time_entry_id, patch: next });
  const replay = repository.getIdempotency({
    tenant_id,
    idempotency_key,
    operation: "time_entry_update",
    actor_id,
    object_type: "TimeEntry",
    object_id: time_entry_id,
    request,
  });
  if (replay) return responseWithTimeEntryAliases(replay.response, true);
  const current = repository.get({ tenant_id, model_type: "TimeEntry", time_entry_id });
  if (!current) throw new Error("TimeEntry not found");
  if (findTimeEntryBillingConsumption({ repository, tenant_id, time_entry_id })) {
    throw timeEntryConsumedError("modified");
  }
  if (current.status === "locked" || current.locked_at) throw new Error("locked time entry cannot be modified");
  return repository.transaction((tx) => {
    const updated = tx.update(
      { tenant_id, model_type: "TimeEntry", time_entry_id },
      { ...next, updates_database_rows: true },
    );
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "time.entry.update",
        object_type: "TimeEntry",
        object_id: time_entry_id,
        idempotency_key,
      },
    });
    const response = responseWithTimeEntryAliases({ outcome: "updated", item: updated, summary: timeEntrySummary(updated), audit_event: auditEvent }, false);
    tx.recordIdempotency({
      tenant_id,
      idempotency_key,
      operation: "time_entry_update",
      actor_id,
      object_type: "TimeEntry",
      object_id: time_entry_id,
      request,
      response,
    });
    return response;
  });
}
