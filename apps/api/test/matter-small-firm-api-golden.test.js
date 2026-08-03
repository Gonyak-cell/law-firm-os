import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { handleMatterSmallFirmApiRequest } from "../src/matter-small-firm-api.js";
import { createMatterSmallFirmRuntimeContext } from "../src/matter-small-firm-runtime-context.js";

const TENANT = "tenant_matter_golden";
const OTHER_TENANT = "tenant_matter_golden_other";
const ACTOR = "user_matter_golden";
const BACKUP = "user_matter_golden_backup";
const NOW = "2026-07-30T02:00:00.000Z";
const BASE_QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "rfd_tuw_025_golden",
  audit_hint_ref: "rfd_tuw_025_golden_audit",
});

function matter({ matterId, tenantId = TENANT, title = matterId } = {}) {
  return {
    model_type: "Matter",
    matter_id: matterId,
    tenant_id: tenantId,
    client_id: `client_${matterId}`,
    matter_code: `M-${matterId}`,
    title,
    status: "open",
    created_by: ACTOR,
    created_at: "2026-07-01T00:00:00.000Z",
    responsible_lawyer: ACTOR,
    backup_user_id: BACKUP,
  };
}

function task({ taskId, matterId, dueAt, status = "todo", waitState = null, tenantId = TENANT } = {}) {
  return {
    model_type: "MatterTask",
    task_id: taskId,
    tenant_id: tenantId,
    matter_id: matterId,
    title: `Title ${taskId}`,
    status,
    created_by: ACTOR,
    assigned_to: ACTOR,
    wait_state: waitState,
    due_at: dueAt,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

function calendarEvent({ eventId, matterId, startsAt, tenantId = TENANT } = {}) {
  return {
    model_type: "MatterCalendarEvent",
    event_id: eventId,
    tenant_id: tenantId,
    matter_id: matterId,
    title: `Title ${eventId}`,
    status: "scheduled",
    starts_at: startsAt,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

function buildRecords() {
  return [
    matter({ matterId: "matter_golden" }),
    matter({ matterId: "matter_empty", title: "Empty Matter" }),
    matter({ matterId: "matter_other_tenant", tenantId: OTHER_TENANT }),
    task({
      taskId: "task_overdue",
      matterId: "matter_golden",
      dueAt: "2026-07-29T03:00:00.000Z",
    }),
    task({
      taskId: "task_today",
      matterId: "matter_golden",
      dueAt: "2026-07-30T03:00:00.000Z",
    }),
    task({
      taskId: "task_waiting",
      matterId: "matter_golden",
      dueAt: "2026-08-01T03:00:00.000Z",
      status: "todo",
      waitState: "client",
    }),
    task({
      taskId: "task_other_tenant",
      matterId: "matter_other_tenant",
      dueAt: "2026-07-30T03:00:00.000Z",
      tenantId: OTHER_TENANT,
    }),
    calendarEvent({
      eventId: "event_today",
      matterId: "matter_golden",
      startsAt: "2026-07-30T05:00:00.000Z",
    }),
    calendarEvent({
      eventId: "event_upcoming",
      matterId: "matter_golden",
      startsAt: "2026-08-01T05:00:00.000Z",
    }),
    calendarEvent({
      eventId: "event_other_tenant",
      matterId: "matter_other_tenant",
      startsAt: "2026-07-30T05:00:00.000Z",
      tenantId: OTHER_TENANT,
    }),
    {
      model_type: "MatterFollowUp",
      resource_id: "followup_firm_reply",
      followup_id: "followup_firm_reply",
      tenant_id: TENANT,
      matter_id: "matter_golden",
      title: "Title followup_firm_reply",
      channel: "email",
      status: "open",
      queue: "firm_reply",
      owner_id: ACTOR,
      next_action: "Reply",
      next_action_at: "2026-07-30T04:00:00.000Z",
      created_by: ACTOR,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_by: ACTOR,
      updated_at: "2026-07-01T00:00:00.000Z",
    },
    {
      model_type: "Person",
      resource_id: ACTOR,
      person_id: ACTOR,
      tenant_id: TENANT,
      status: "active",
      display_name: "Golden Owner",
    },
    {
      model_type: "Person",
      resource_id: BACKUP,
      person_id: BACKUP,
      tenant_id: TENANT,
      status: "active",
      display_name: "Golden Backup",
    },
    {
      model_type: "MatterMember",
      member_id: "member_golden_owner",
      tenant_id: TENANT,
      matter_id: "matter_golden",
      user_id: ACTOR,
      role: "owner",
      status: "active",
      display_name: "Golden Owner",
    },
    {
      model_type: "MatterMember",
      member_id: "member_golden_backup",
      tenant_id: TENANT,
      matter_id: "matter_golden",
      user_id: BACKUP,
      role: "backup",
      status: "active",
      display_name: "Golden Backup",
    },
  ];
}

function readRepository(records = buildRecords()) {
  const values = [...records];
  return Object.freeze({
    list(query = {}) {
      return values.filter((record) =>
        (!query.tenant_id || record.tenant_id === query.tenant_id)
          && (!query.model_type || record.model_type === query.model_type)
          && (!query.matter_id || record.matter_id === query.matter_id));
    },
    get(query = {}) {
      const identityFields = [
        "matter_id",
        "task_id",
        "event_id",
        "followup_id",
        "resource_id",
        "person_id",
        "member_id",
      ];
      return values.find((record) =>
        (!query.tenant_id || record.tenant_id === query.tenant_id)
          && (!query.model_type || record.model_type === query.model_type)
          && identityFields
            .filter((field) => query[field] !== undefined)
            .every((field) => record[field] === query[field]));
    },
  });
}

function runtime({ matterRepository = readRepository(), financeRepository = readRepository([]) } = {}) {
  return createMatterSmallFirmRuntimeContext({
    matterRepository,
    financeRepository,
    now: () => new Date(NOW),
  });
}

function allowedContext(tenantId = TENANT) {
  return {
    principal: { tenant_id: tenantId, user_id: ACTOR, role_ids: ["lawyer"] },
    rules: [{ id: "allow_matter_ops_golden", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function request({ pathname, query = {}, context = allowedContext(), requestId = "rfd-tuw-025-request", requestRuntime = runtime() } = {}) {
  return handleMatterSmallFirmApiRequest({
    pathname,
    method: "GET",
    query: { ...BASE_QUERY, ...query },
    context,
    requestId,
    runtime: requestRuntime,
  });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

function bodyObservable(result) {
  if (result.rawBody !== undefined) {
    return { status: result.status, raw_body: result.rawBody };
  }
  const { request_id: _requestId, ...body } = result.body;
  return { status: result.status, body };
}

async function readCase({ name, pathname, query, context, requestRuntime } = {}) {
  const result = await request({ pathname, query, context, requestRuntime, requestId: `request-${name}` });
  return { name, result, hash: digest(bodyObservable(result)) };
}

// RFD-TUW-025 baseline hashes. The body is canonicalized by key and only the
// generated request ID is normalized; caller-supplied audit hints, item order,
// and IDs remain part of each digest.
const GOLDEN_HASHES = Object.freeze({
  today: "019cd8dbf832039913bc0d2be3d4cf5c6093caa9ff676b5eaa073113e957e7f7",
  tasks: "ee82a77b9dbf8328bc653efff1caf285e11079a82f5b38ba61c27efb62558c85",
  calendar: "cc99f10cc2d224fe8ead054f6fa8a18e7ec507c8e0f82d8594123fd4dad860b2",
  detail: "c3c47bb1d883533764a9d923edc683ff47b2990dcdb898ea215b3f24a3b98448",
  closeout: "98edc2627d9872bea57e836a5a78facb64850bb361fa5e8dfe5d23558627480a",
  csv: "24e5c0b4885594f7a62189a97b2956f7b26515f13b136194fb155b87d259ca0d",
  empty: "c294cf3271f8eca5427a5cdcbc700339523efb95da51d7dbc180674cbc6faef0",
  denied: "07b20129fff19e81afdbda37d1ceb63ed4b350d0143cc6a972863934df9ab2f8",
  cross_tenant: "ebcfb31d9ed7ff65ac2f82ec7b09bc12a54efaf41c576f4b18c927b33041f4a1",
  runtime_503: "774670363779be42567adb5f412d10bdd09ab0291847bb81fd10c35f295f90d5",
  runtime_503_csv: "774670363779be42567adb5f412d10bdd09ab0291847bb81fd10c35f295f90d5",
});

test("RFD-TUW-025 freezes deterministic Matter read outputs and safe failure mapping", async () => {
  const cases = [
    await readCase({ name: "today", pathname: "/api/matter/ops/today", query: { as_of: NOW } }),
    await readCase({
      name: "tasks",
      pathname: "/api/matter/ops/tasks",
      query: { view: "board", as_of: NOW },
    }),
    await readCase({
      name: "calendar",
      pathname: "/api/matter/ops/calendar",
      query: { week_start: "2026-07-27" },
    }),
    await readCase({
      name: "detail",
      pathname: "/api/matter/ops/matters/matter_golden",
    }),
    await readCase({
      name: "closeout",
      pathname: "/api/matter/ops/matters/matter_golden/closeout",
    }),
    await readCase({ name: "csv", pathname: "/api/matter/ops/report.csv" }),
    await readCase({
      name: "empty",
      pathname: "/api/matter/ops/tasks",
      query: { matter_id: "matter_empty", as_of: NOW },
    }),
    await readCase({
      name: "denied",
      pathname: "/api/matter/ops/today",
      query: { as_of: NOW },
      context: { principal: allowedContext().principal, rules: [], object_acl: [] },
    }),
    await readCase({
      name: "cross_tenant",
      pathname: "/api/matter/ops/matters/matter_other_tenant",
      query: { tenant_id: OTHER_TENANT },
    }),
    await readCase({
      name: "runtime_503",
      pathname: "/api/matter/ops/today",
      requestRuntime: runtime({
        matterRepository: Object.freeze({
          list() {
            throw new Error("synthetic repository outage");
          },
          get() {
            throw new Error("synthetic repository outage");
          },
        }),
      }),
    }),
    await readCase({
      name: "runtime_503_csv",
      pathname: "/api/matter/ops/report.csv",
      requestRuntime: runtime({
        matterRepository: Object.freeze({
          list() {
            throw new Error("synthetic repository outage");
          },
          get() {
            throw new Error("synthetic repository outage");
          },
        }),
      }),
    }),
  ];

  for (const current of cases) {
    assert.equal(current.hash, GOLDEN_HASHES[current.name], `${current.name} public contract changed`);
  }

  for (const current of cases) {
    if (current.result.rawBody === undefined) {
      assert.equal(current.result.body.audit_hint_ref, BASE_QUERY.audit_hint_ref);
    }
  }

  const mutatedAuditHint = structuredClone(bodyObservable(cases.find(({ name }) => name === "today").result));
  mutatedAuditHint.body.audit_hint_ref = "mutated-audit-hint";
  assert.notEqual(
    digest(mutatedAuditHint),
    GOLDEN_HASHES.today,
    "changing the deterministic audit hint must invalidate the Today golden",
  );

  const today = cases.find(({ name }) => name === "today").result;
  assert.equal(today.status, 200);
  assert.deepEqual(
    today.body.item.lanes.map(({ id, items }) => [id, items.map(({ item_id }) => item_id)]),
    [
      ["overdue", ["task_overdue"]],
      ["due_today", ["task_today"]],
      ["our_response", ["followup_firm_reply"]],
      ["blocked", []],
      ["unassigned", []],
      ["missing_time", []],
      ["wip", []],
      ["ar", []],
    ],
  );

  const tasks = cases.find(({ name }) => name === "tasks").result;
  assert.deepEqual(tasks.body.items.map(({ id }) => id), ["task_overdue", "task_today", "task_waiting"]);

  const calendar = cases.find(({ name }) => name === "calendar").result;
  assert.deepEqual(calendar.body.items.map(({ id }) => id), ["task_overdue", "task_today", "event_today", "task_waiting", "event_upcoming"]);

  const closeout = cases.find(({ name }) => name === "closeout").result;
  assert.deepEqual(
    closeout.body.items.map(({ blocker_id }) => blocker_id),
    [
      "open_task:task_overdue",
      "open_task:task_today",
      "open_task:task_waiting",
      "open_deadline:event_today",
      "open_deadline:event_upcoming",
    ],
  );

  const empty = cases.find(({ name }) => name === "empty").result;
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.items, []);
  assert.equal(empty.body.count, 0);
  assert.equal(empty.body.ui_state, "empty");

  for (const name of ["denied", "cross_tenant", "runtime_503", "runtime_503_csv"]) {
    const current = cases.find((entry) => entry.name === name).result;
    assert.deepEqual(current.body.items, []);
    assert.equal(current.body.count_leak_prevented, true);
    assert.equal(current.body.item, undefined);
    assert.equal(current.body.count, undefined);
  }
  assert.equal(cases.find(({ name }) => name === "denied").result.status, 403);
  assert.equal(cases.find(({ name }) => name === "cross_tenant").result.status, 403);
  assert.equal(cases.find(({ name }) => name === "runtime_503").result.status, 503);
  assert.deepEqual(
    cases.find(({ name }) => name === "denied").result.body.safe_error_codes,
    ["MATTER_API_UNAUTHORIZED_OMISSION"],
  );
  assert.deepEqual(
    cases.find(({ name }) => name === "cross_tenant").result.body.safe_error_codes,
    ["MATTER_API_CROSS_TENANT_DENIED"],
  );
  assert.equal(cases.find(({ name }) => name === "runtime_503_csv").result.status, 503);
  assert.equal(cases.find(({ name }) => name === "runtime_503_csv").result.rawBody, undefined);
  assert.deepEqual(
    cases.find(({ name }) => name === "runtime_503").result.body.safe_error_codes,
    ["MATTER_OPS_RUNTIME_UNAVAILABLE"],
  );
});
