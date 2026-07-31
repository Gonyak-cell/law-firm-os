import { createHash } from "node:crypto";
import { backfillPeopleCalendarEvents } from "./people-calendar-migration.js";
import { backfillPeopleMatterMembers } from "./people-member-migration.js";
import { backfillPeopleMatterTasks } from "./people-task-migration.js";

export const PEOPLE_DATA_MIGRATION_SCHEMA_VERSION = "matter.people-data-migration.v1";
export const PEOPLE_DATA_MIGRATION_RECEIPT_MODEL = "MatterPeopleMigrationReceipt";
export const PEOPLE_DATA_MIGRATION_QUARANTINE_MODEL = "MatterPeopleMigrationQuarantine";

const SOURCE_COLLECTIONS = Object.freeze([
  "members",
  "calendar_events",
  "tasks",
  "employee_user_links",
  "audit_events",
  "calendar_source_metadata",
  "users",
]);

function migrationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function normalizeText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function normalizeRows(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new TypeError(`source_snapshot.${field} must be an array`);
  return [...value]
    .map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new TypeError(`source_snapshot.${field} rows must be objects`);
      }
      return { ...row };
    })
    .sort((left, right) => {
      const leftJson = stableJson(left);
      const rightJson = stableJson(right);
      return leftJson < rightJson ? -1 : (leftJson > rightJson ? 1 : 0);
    });
}

function normalizeSourceSnapshot(sourceSnapshot = {}) {
  if (!sourceSnapshot || typeof sourceSnapshot !== "object" || Array.isArray(sourceSnapshot)) {
    throw new TypeError("source_snapshot must be an object");
  }
  return Object.freeze(Object.fromEntries(
    SOURCE_COLLECTIONS.map((field) => [field, Object.freeze(normalizeRows(sourceSnapshot[field], field))]),
  ));
}

function assertTenantRows(tenantId, snapshot) {
  for (const field of SOURCE_COLLECTIONS) {
    for (const row of snapshot[field]) {
      if (row.tenant_id !== tenantId) {
        throw migrationError(
          `source_snapshot.${field} contains a cross-tenant row`,
          "MATTER_PEOPLE_MIGRATION_TENANT_MISMATCH",
        );
      }
    }
  }
}

function assertUniqueSourceIds(rows, field, idField) {
  const seen = new Set();
  for (const row of rows) {
    const id = normalizeText(row[idField], `source_snapshot.${field}.${idField}`);
    if (seen.has(id)) {
      throw migrationError(
        `source_snapshot.${field} contains duplicate ${idField}: ${id}`,
        "MATTER_PEOPLE_MIGRATION_DUPLICATE_SOURCE_ID",
      );
    }
    seen.add(id);
  }
}

function assertInterval({ startsAt, endsAt, label, startsRequired = false }) {
  if (startsRequired && (typeof startsAt !== "string" || startsAt.trim() === "")) {
    throw new TypeError(`${label} starts_at is required`);
  }
  if (
    startsAt != null
    && (typeof startsAt !== "string" || startsAt.trim() === "" || !Number.isFinite(Date.parse(startsAt)))
  ) {
    throw new TypeError(`${label} starts_at must be an ISO date`);
  }
  if (
    endsAt != null
    && (typeof endsAt !== "string" || endsAt.trim() === "" || !Number.isFinite(Date.parse(endsAt)))
  ) {
    throw new TypeError(`${label} ends_at must be an ISO date`);
  }
  if (endsAt && !startsAt) throw new TypeError(`${label} starts_at is required when ends_at is set`);
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    throw migrationError(
      `${label} ends_at must be on or after starts_at`,
      "MATTER_PEOPLE_MIGRATION_REVERSED_INTERVAL",
    );
  }
}

function assertMigrationBoundary(snapshot) {
  assertUniqueSourceIds(snapshot.members, "members", "member_id");
  assertUniqueSourceIds(snapshot.calendar_events, "calendar_events", "event_id");
  assertUniqueSourceIds(snapshot.tasks, "tasks", "task_id");

  for (const event of snapshot.calendar_events) {
    assertInterval({
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      label: `MatterCalendarEvent ${event.event_id}`,
      startsRequired: true,
    });
  }
  for (const task of snapshot.tasks) {
    assertInterval({
      startsAt: task.starts_at,
      endsAt: task.ends_at,
      label: `MatterTask ${task.task_id}`,
    });
  }
}

function quarantineRow({
  sourceModelType,
  sourceId,
  matterId,
  reason,
  actionLabel,
}) {
  return Object.freeze({
    source_model_type: sourceModelType,
    source_id: sourceId,
    matter_id: matterId ?? null,
    reason,
    action_label: actionLabel,
  });
}

function uniqueQuarantine(rows) {
  const seen = new Set();
  return Object.freeze(rows.filter((row) => {
    const key = `${row.source_model_type}:${row.source_id}:${row.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}

function targetRefs(rows) {
  return Object.freeze({
    members: Object.freeze(rows.members.map(({ member_id }) => member_id)),
    calendar_events: Object.freeze(rows.calendar_events.map(({ event_id }) => event_id)),
    tasks: Object.freeze(rows.tasks.map(({ task_id }) => task_id)),
  });
}

function publicPlan(plan) {
  return Object.freeze({
    schema_version: plan.schema_version,
    mode: "dry_run",
    applied: false,
    replayed: false,
    tenant_id: plan.tenant_id,
    source_snapshot_id: plan.source_snapshot_id,
    source_snapshot_hash: plan.source_snapshot_hash,
    output_snapshot_hash: plan.output_snapshot_hash,
    counts: plan.counts,
    quarantine: plan.quarantine,
    target_refs: plan.target_refs,
  });
}

function appliedAt(value) {
  const current = typeof value === "function" ? value() : (value ?? new Date());
  const date = current instanceof Date ? current : new Date(current);
  if (!Number.isFinite(date.getTime())) throw new TypeError("now must resolve to a valid date");
  return date.toISOString();
}

function assertRepository(repository) {
  const required = [
    "upsert",
    "create",
    "get",
    "recordIdempotency",
    "getIdempotency",
    "appendAudit",
    "transaction",
  ];
  if (!repository || required.some((method) => typeof repository[method] !== "function")) {
    throw new TypeError("a Matter repository with transaction support is required");
  }
  if (!repository.durable) {
    throw migrationError(
      "People data migration apply requires a durable Matter repository",
      "MATTER_PEOPLE_MIGRATION_DURABLE_REPOSITORY_REQUIRED",
    );
  }
}

export function planPeopleDataMigration({
  tenant_id,
  source_snapshot_id = null,
  source_snapshot = {},
  expected_source_snapshot_hash = null,
} = {}) {
  const tenantId = normalizeText(tenant_id, "tenant_id");
  const snapshotId = source_snapshot_id == null
    ? null
    : normalizeText(source_snapshot_id, "source_snapshot_id");
  const snapshot = normalizeSourceSnapshot(source_snapshot);
  assertTenantRows(tenantId, snapshot);
  assertMigrationBoundary(snapshot);

  const sourceSnapshotHash = sha256({
    schema_version: PEOPLE_DATA_MIGRATION_SCHEMA_VERSION,
    tenant_id: tenantId,
    source_snapshot_id: snapshotId,
    source_snapshot: snapshot,
  });
  if (expected_source_snapshot_hash && expected_source_snapshot_hash !== sourceSnapshotHash) {
    throw migrationError(
      "People data migration source snapshot hash does not match the operator-provided hash",
      "MATTER_PEOPLE_MIGRATION_SOURCE_HASH_MISMATCH",
    );
  }

  const memberResult = backfillPeopleMatterMembers({
    tenant_id: tenantId,
    members: snapshot.members,
    employee_user_links: snapshot.employee_user_links,
    audit_events: snapshot.audit_events,
  });
  const calendarResult = backfillPeopleCalendarEvents({
    tenant_id: tenantId,
    events: snapshot.calendar_events,
    source_metadata: snapshot.calendar_source_metadata,
  });
  const taskResult = backfillPeopleMatterTasks({
    tenant_id: tenantId,
    tasks: snapshot.tasks,
    users: snapshot.users,
    members: memberResult.rows,
    employee_user_links: snapshot.employee_user_links,
  });

  const rows = Object.freeze({
    members: Object.freeze(memberResult.rows.map((row) => Object.freeze({
      ...row,
      model_type: "MatterMember",
    }))),
    calendar_events: Object.freeze(calendarResult.rows.map((row) => Object.freeze({
      ...row,
      model_type: "MatterCalendarEvent",
    }))),
    tasks: Object.freeze(taskResult.rows.map((row) => Object.freeze({
      ...row,
      model_type: "MatterTask",
    }))),
  });

  const quarantine = uniqueQuarantine([
    ...memberResult.unresolved.map((row) => quarantineRow({
      sourceModelType: "MatterMember",
      sourceId: row.member_id,
      matterId: row.matter_id,
      reason: row.reason,
      actionLabel: row.action_label,
    })),
    ...memberResult.validity_review_required.map((row) => quarantineRow({
      sourceModelType: "MatterMember",
      sourceId: row.member_id,
      matterId: row.matter_id,
      reason: row.reason,
      actionLabel: row.action_label,
    })),
    ...calendarResult.review_required.map((row) => quarantineRow({
      sourceModelType: "MatterCalendarEvent",
      sourceId: row.event_id,
      matterId: rows.calendar_events.find(({ event_id }) => event_id === row.event_id)?.matter_id,
      reason: row.reason,
      actionLabel: row.action_label,
    })),
    ...taskResult.unresolved.map((row) => quarantineRow({
      sourceModelType: "MatterTask",
      sourceId: row.task_id,
      matterId: row.matter_id,
      reason: row.reason,
      actionLabel: row.action_label,
    })),
  ]);
  const counts = Object.freeze({
    member_rows: rows.members.length,
    calendar_event_rows: rows.calendar_events.length,
    task_rows: rows.tasks.length,
    resolved_members: memberResult.report.resolved_count,
    classified_calendar_events: calendarResult.report.classified_count,
    resolved_tasks: taskResult.report.resolved_count,
    quarantine_rows: quarantine.length,
  });
  const refs = targetRefs(rows);
  const outputSnapshotHash = sha256({
    rows,
    quarantine,
  });

  return Object.freeze({
    schema_version: PEOPLE_DATA_MIGRATION_SCHEMA_VERSION,
    tenant_id: tenantId,
    source_snapshot_id: snapshotId,
    source_snapshot_hash: sourceSnapshotHash,
    output_snapshot_hash: outputSnapshotHash,
    counts,
    quarantine,
    target_refs: refs,
    rows,
  });
}

export function executePeopleDataMigration({
  repository,
  tenant_id,
  source_snapshot_id = null,
  source_snapshot = {},
  expected_source_snapshot_hash = null,
  mode = "dry_run",
  idempotency_key = null,
  actor_id = null,
  now,
} = {}) {
  if (!["dry_run", "apply"].includes(mode)) {
    throw new TypeError("mode must be dry_run or apply");
  }
  const plan = planPeopleDataMigration({
    tenant_id,
    source_snapshot_id,
    source_snapshot,
    expected_source_snapshot_hash,
  });
  if (mode === "dry_run") return publicPlan(plan);

  assertRepository(repository);
  const actorId = normalizeText(actor_id, "actor_id");
  const snapshotDigest = plan.source_snapshot_hash.slice("sha256:".length);
  const idempotencyKey = idempotency_key == null
    ? `${PEOPLE_DATA_MIGRATION_SCHEMA_VERSION}:${snapshotDigest}`
    : normalizeText(idempotency_key, "idempotency_key");
  const receiptId = `${PEOPLE_DATA_MIGRATION_SCHEMA_VERSION}:${snapshotDigest}`;
  const requestFingerprint = sha256({
    schema_version: PEOPLE_DATA_MIGRATION_SCHEMA_VERSION,
    tenant_id: plan.tenant_id,
    source_snapshot_hash: plan.source_snapshot_hash,
  });

  const existingIdempotency = repository.getIdempotency({
    tenant_id: plan.tenant_id,
    idempotency_key: idempotencyKey,
  });
  if (existingIdempotency) {
    if (
      existingIdempotency.operation !== PEOPLE_DATA_MIGRATION_SCHEMA_VERSION
      || existingIdempotency.request_fingerprint !== requestFingerprint
    ) {
      throw migrationError(
        "People data migration idempotency key is already bound to another source snapshot",
        "MATTER_PEOPLE_MIGRATION_IDEMPOTENCY_CONFLICT",
      );
    }
    return Object.freeze({
      ...existingIdempotency.response,
      replayed: true,
    });
  }

  const existingReceipt = repository.get({
    tenant_id: plan.tenant_id,
    model_type: PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
    resource_id: receiptId,
  });
  if (existingReceipt) {
    throw migrationError(
      "People data migration receipt exists without its idempotency record",
      "MATTER_PEOPLE_MIGRATION_RECEIPT_INCONSISTENT",
    );
  }

  const migratedAt = appliedAt(now);
  const auditEventId = `${receiptId}:audit`;
  const quarantineRecords = plan.quarantine.map((row) => {
    const quarantineId = `${receiptId}:quarantine:${row.source_model_type}:${row.source_id}:${row.reason}`;
    return Object.freeze({
      model_type: PEOPLE_DATA_MIGRATION_QUARANTINE_MODEL,
      tenant_id: plan.tenant_id,
      resource_id: quarantineId,
      migration_receipt_id: receiptId,
      source_snapshot_hash: plan.source_snapshot_hash,
      source_model_type: row.source_model_type,
      source_id: row.source_id,
      matter_id: row.matter_id,
      reason: row.reason,
      action_label: row.action_label,
      status: "review_required",
      quarantined_at: migratedAt,
    });
  });
  const receipt = Object.freeze({
    model_type: PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
    tenant_id: plan.tenant_id,
    resource_id: receiptId,
    schema_version: PEOPLE_DATA_MIGRATION_SCHEMA_VERSION,
    source_snapshot_id: plan.source_snapshot_id,
    source_snapshot_hash: plan.source_snapshot_hash,
    output_snapshot_hash: plan.output_snapshot_hash,
    idempotency_key: idempotencyKey,
    actor_id: actorId,
    status: "applied",
    counts: plan.counts,
    target_refs: plan.target_refs,
    quarantine_refs: Object.freeze(quarantineRecords.map(({ resource_id }) => resource_id)),
    audit_event_id: auditEventId,
    applied_at: migratedAt,
  });
  const response = Object.freeze({
    schema_version: PEOPLE_DATA_MIGRATION_SCHEMA_VERSION,
    mode: "apply",
    applied: true,
    replayed: false,
    tenant_id: plan.tenant_id,
    source_snapshot_id: plan.source_snapshot_id,
    source_snapshot_hash: plan.source_snapshot_hash,
    output_snapshot_hash: plan.output_snapshot_hash,
    counts: plan.counts,
    receipt,
  });

  return repository.transaction((transaction) => {
    for (const row of plan.rows.members) transaction.upsert(row);
    for (const row of plan.rows.calendar_events) transaction.upsert(row);
    for (const row of plan.rows.tasks) transaction.upsert(row);
    for (const row of quarantineRecords) transaction.upsert(row);
    transaction.create(receipt);
    transaction.recordIdempotency({
      tenant_id: plan.tenant_id,
      idempotency_key: idempotencyKey,
      operation: PEOPLE_DATA_MIGRATION_SCHEMA_VERSION,
      object_type: PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
      object_id: receiptId,
      actor_id: actorId,
      request_fingerprint: requestFingerprint,
      response,
      created_at: migratedAt,
    });
    transaction.appendAudit({
      tenant_id: plan.tenant_id,
      event_id: auditEventId,
      action: "matter.people.data_migration.apply",
      object_type: PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
      object_id: receiptId,
      actor_id: actorId,
      idempotency_key: idempotencyKey,
      source_snapshot_id: plan.source_snapshot_id,
      source_snapshot_hash: plan.source_snapshot_hash,
      output_snapshot_hash: plan.output_snapshot_hash,
      counts: plan.counts,
      occurred_at: migratedAt,
    });
    return response;
  });
}
