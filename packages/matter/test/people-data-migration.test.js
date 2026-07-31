import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeDurableJsonFile } from "../../persistence/src/durable-file.js";
import {
  executePeopleDataMigration,
  PEOPLE_DATA_MIGRATION_QUARANTINE_MODEL,
  PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
  planPeopleDataMigration,
} from "../src/people-data-migration.js";
import { runPeopleDataMigrationCommand } from "../src/migrations/run-people-data-migration.js";
import { createMatterRepository } from "../src/repository.js";

const TENANT = "tenant-people-migration";
const NOW = "2026-07-31T09:30:00.000Z";

function tempPath(name) {
  return join(mkdtempSync(join(tmpdir(), `${name}-`)), "matter-store.json");
}

function member(memberId, userId, overrides = {}) {
  return {
    model_type: "MatterMember",
    tenant_id: TENANT,
    matter_id: "matter-1",
    member_id: memberId,
    employee_id: null,
    user_id: userId,
    role: "responsible_attorney",
    status: "active",
    ...overrides,
  };
}

function calendarEvent(eventId, overrides = {}) {
  return {
    model_type: "MatterCalendarEvent",
    tenant_id: TENANT,
    matter_id: "matter-1",
    event_id: eventId,
    title: "재판 준비",
    status: "scheduled",
    starts_at: "2026-08-01T01:00:00.000Z",
    ...overrides,
  };
}

function task(taskId, assignedTo, overrides = {}) {
  return {
    model_type: "MatterTask",
    tenant_id: TENANT,
    matter_id: "matter-1",
    task_id: taskId,
    title: "서면 제출",
    status: "todo",
    created_by: "user-operator",
    assigned_to: assignedTo,
    due_at: "2026-08-01T09:00:00.000Z",
    ...overrides,
  };
}

function sourceSnapshot() {
  return {
    members: [
      member("member-resolved", "user-resolved"),
      member("member-date-review", "user-date-review", { employee_id: "employee-date-review" }),
      member("member-identity-review", "user-missing"),
    ],
    calendar_events: [
      calendarEvent("event-hearing"),
      calendarEvent("event-provider-conflict"),
      calendarEvent("event-unknown"),
    ],
    tasks: [
      task("task-resolved", "user-resolved"),
      task("task-review", "user-missing"),
    ],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-resolved",
      purpose: "login_mapping",
      status: "active",
      user_id: "user-resolved",
      employee_id: "employee-resolved",
    }],
    audit_events: [{
      tenant_id: TENANT,
      event_id: "audit-member-resolved",
      action: "matter.team.member.add",
      object_id: "member-resolved",
      occurred_at: "2026-07-01T09:00:00.000Z",
    }],
    calendar_source_metadata: [
      {
        tenant_id: TENANT,
        event_id: "event-hearing",
        event_kind: "court_hearing",
        provider: "outlook",
        provider_event_id: "graph-event-1",
      },
      {
        tenant_id: TENANT,
        event_id: "event-provider-conflict",
        event_kind: "meeting",
        provider: "outlook",
        provider_event_id: "graph-event-1",
      },
    ],
    users: [{ tenant_id: TENANT, user_id: "user-resolved" }],
  };
}

function seedLegacyRows(repository, snapshot) {
  for (const row of snapshot.members) repository.create(row);
  for (const row of snapshot.calendar_events) repository.create(row);
  for (const row of snapshot.tasks) repository.create(row);
}

test("operator dry-run is deterministic, reports quarantine, and writes nothing", () => {
  const filePath = tempPath("matter-people-migration-dry-run");
  const repository = createMatterRepository({ filePath });
  const snapshot = sourceSnapshot();
  seedLegacyRows(repository, snapshot);
  const before = repository.snapshot();

  const first = executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot_id: "snapshot-2026-07-31",
    source_snapshot: snapshot,
    mode: "dry_run",
  });
  const second = executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot_id: "snapshot-2026-07-31",
    source_snapshot: {
      ...snapshot,
      tasks: [...snapshot.tasks].reverse(),
      members: [...snapshot.members].reverse(),
    },
    mode: "dry_run",
  });

  assert.deepEqual(second, first);
  assert.equal(first.applied, false);
  assert.equal(first.counts.member_rows, 3);
  assert.equal(first.counts.calendar_event_rows, 3);
  assert.equal(first.counts.task_rows, 2);
  assert.equal(first.quarantine.some(({ reason }) => reason === "valid_from_unverified"), true);
  assert.equal(first.quarantine.some(({ reason }) => reason === "provider_event_id_conflict"), true);
  assert.deepEqual(repository.snapshot(), before);
});

test("apply atomically persists every model, quarantine, receipt, idempotency, and audit across restart", () => {
  const filePath = tempPath("matter-people-migration-apply");
  const snapshot = sourceSnapshot();
  const repository = createMatterRepository({ filePath });
  seedLegacyRows(repository, snapshot);

  const dryRun = executePeopleDataMigration({
    tenant_id: TENANT,
    source_snapshot_id: "snapshot-apply",
    source_snapshot: snapshot,
    mode: "dry_run",
  });
  const applied = executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot_id: "snapshot-apply",
    source_snapshot: snapshot,
    expected_source_snapshot_hash: dryRun.source_snapshot_hash,
    mode: "apply",
    idempotency_key: "people-migration-apply-1",
    actor_id: "user-operator",
    now: NOW,
  });

  assert.equal(applied.applied, true);
  assert.equal(applied.replayed, false);
  assert.equal(applied.receipt.counts.quarantine_rows, dryRun.counts.quarantine_rows);
  assert.equal(
    repository.get({
      tenant_id: TENANT,
      model_type: "MatterMember",
      member_id: "member-resolved",
    }).valid_from,
    "2026-07-01T09:00:00.000Z",
  );
  assert.equal(
    repository.get({
      tenant_id: TENANT,
      model_type: "MatterCalendarEvent",
      event_id: "event-hearing",
    }).event_kind,
    "court_hearing",
  );
  assert.equal(
    repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-resolved",
    }).assigned_to_user_id,
    "user-resolved",
  );
  repository.close();

  const reopened = createMatterRepository({ filePath });
  const receipt = reopened.get({
    tenant_id: TENANT,
    model_type: PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
    resource_id: applied.receipt.resource_id,
  });
  const quarantine = reopened.list({
    tenant_id: TENANT,
    model_type: PEOPLE_DATA_MIGRATION_QUARANTINE_MODEL,
  });
  assert.equal(receipt.source_snapshot_hash, dryRun.source_snapshot_hash);
  assert.equal(receipt.output_snapshot_hash, dryRun.output_snapshot_hash);
  assert.equal(quarantine.length, dryRun.counts.quarantine_rows);
  assert.equal(quarantine.some(({ reason }) => reason === "valid_from_unverified"), true);
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).length, 1);
  assert.equal(
    reopened.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: "people-migration-apply-1",
    }).object_id,
    receipt.resource_id,
  );
  const beforeReplay = reopened.snapshot();
  const replayed = executePeopleDataMigration({
    repository: reopened,
    tenant_id: TENANT,
    source_snapshot_id: "snapshot-apply",
    source_snapshot: snapshot,
    mode: "apply",
    idempotency_key: "people-migration-apply-1",
    actor_id: "user-operator",
    now: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.receipt.applied_at, NOW);
  assert.deepEqual(reopened.snapshot(), beforeReplay);
});

test("source hashes and idempotency keys are bound to one tenant snapshot", () => {
  const filePath = tempPath("matter-people-migration-idempotency");
  const repository = createMatterRepository({ filePath });
  const snapshot = sourceSnapshot();
  seedLegacyRows(repository, snapshot);
  const dryRun = executePeopleDataMigration({
    tenant_id: TENANT,
    source_snapshot: snapshot,
    mode: "dry_run",
  });

  assert.throws(() => executePeopleDataMigration({
    tenant_id: TENANT,
    source_snapshot: snapshot,
    expected_source_snapshot_hash: "sha256:wrong",
    mode: "dry_run",
  }), ({ code }) => code === "MATTER_PEOPLE_MIGRATION_SOURCE_HASH_MISMATCH");

  executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot: snapshot,
    mode: "apply",
    idempotency_key: "bound-key",
    actor_id: "user-operator",
    now: NOW,
  });
  assert.throws(() => executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot: {
      ...snapshot,
      tasks: snapshot.tasks.map((row) => (
        row.task_id === "task-review" ? { ...row, title: "변경된 원본" } : row
      )),
    },
    mode: "apply",
    idempotency_key: "bound-key",
    actor_id: "user-operator",
    now: NOW,
  }), ({ code }) => code === "MATTER_PEOPLE_MIGRATION_IDEMPOTENCY_CONFLICT");
  assert.equal(dryRun.source_snapshot_hash.startsWith("sha256:"), true);
});

test("migration boundary rejects cross-tenant rows and reversed member/task intervals", () => {
  const snapshot = sourceSnapshot();
  assert.throws(() => planPeopleDataMigration({
    tenant_id: TENANT,
    source_snapshot: {
      ...snapshot,
      users: [{ tenant_id: "tenant-other", user_id: "user-resolved" }],
    },
  }), ({ code }) => code === "MATTER_PEOPLE_MIGRATION_TENANT_MISMATCH");

  assert.throws(() => planPeopleDataMigration({
    tenant_id: TENANT,
    source_snapshot: {
      ...snapshot,
      members: [member("member-reversed", "user-resolved", {
        valid_from: "2026-07-02T00:00:00.000Z",
        valid_to: "2026-07-01T00:00:00.000Z",
      })],
    },
  }), /valid_to must be on or after valid_from/);

  assert.throws(() => planPeopleDataMigration({
    tenant_id: TENANT,
    source_snapshot: {
      ...snapshot,
      tasks: [task("task-reversed", "user-resolved", {
        starts_at: "2026-07-02T00:00:00.000Z",
        ends_at: "2026-07-01T00:00:00.000Z",
      })],
    },
  }), ({ code }) => code === "MATTER_PEOPLE_MIGRATION_REVERSED_INTERVAL");
});

test("a failed durable commit rolls back rows, receipt, quarantine, audit, and idempotency together", () => {
  const filePath = tempPath("matter-people-migration-rollback");
  const snapshot = sourceSnapshot();
  const seeded = createMatterRepository({ filePath });
  seedLegacyRows(seeded, snapshot);
  seeded.close();

  let failNextWrite = true;
  const repository = createMatterRepository({
    filePath,
    writeState(input) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error("injected migration commit failure");
      }
      return writeDurableJsonFile(input);
    },
  });
  assert.throws(() => executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot: snapshot,
    mode: "apply",
    idempotency_key: "rollback-key",
    actor_id: "user-operator",
    now: NOW,
  }), /injected migration commit failure/);

  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_DATA_MIGRATION_RECEIPT_MODEL,
  }).length, 0);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_DATA_MIGRATION_QUARANTINE_MODEL,
  }).length, 0);
  assert.equal(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "rollback-key",
  }), undefined);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 0);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "MatterMember",
    member_id: "member-resolved",
  }).employee_id, null);

  const applied = executePeopleDataMigration({
    repository,
    tenant_id: TENANT,
    source_snapshot: snapshot,
    mode: "apply",
    idempotency_key: "rollback-key",
    actor_id: "user-operator",
    now: NOW,
  });
  assert.equal(applied.applied, true);
});

test("the operator command keeps dry-run independent from a writable store", () => {
  const dir = mkdtempSync(join(tmpdir(), "matter-people-migration-command-"));
  const snapshotPath = join(dir, "snapshot.json");
  const absentStorePath = join(dir, "must-not-be-created.json");
  writeFileSync(snapshotPath, JSON.stringify({
    tenant_id: TENANT,
    source_snapshot_id: "snapshot-command",
    source_snapshot: sourceSnapshot(),
  }));
  const output = [];

  const result = runPeopleDataMigrationCommand([
    "--snapshot", snapshotPath,
    "--store", absentStorePath,
    "--mode", "dry_run",
  ], {
    write(value) {
      output.push(value);
    },
  });

  assert.equal(result.mode, "dry_run");
  assert.equal(output.length, 1);
  assert.equal(existsSync(absentStorePath), false);
});
