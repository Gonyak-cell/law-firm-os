import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import {
  createApiServer,
  createDefaultFinanceRuntime,
  createDefaultMatterRuntime,
} from "../src/server.js";
import {
  MATTER_SMALL_FIRM_OPS_ENDPOINTS,
  MATTER_SMALL_FIRM_OPS_VIEWS,
} from "../src/matter-small-firm-api-catalog.js";
import {
  createMatterSmallFirmRuntimeContext,
} from "../src/matter-small-firm-runtime-context.js";
import {
  handleMatterSmallFirmApiRequest,
  matterBusinessDate,
} from "../src/matter-small-firm-api.js";
import {
  highestPrivilegeRegisteredAccount,
  MATTER_VAULT_REGISTERED_TENANT_ID,
} from "../src/matter-vault-account-registry.js";
import { apiSessionHeaders, registeredAccount } from "./helpers/session.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  generateWipFromApprovedItems,
} from "../../../packages/billing/src/wip-service.js";
import {
  approvePreBillWithoutAdjustment,
  createMatterPreBillFromWip,
} from "../../../packages/billing/src/prebill-service.js";
import {
  applyMatterPayment,
  importPayment,
} from "../../../packages/payments/src/index.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const OTHER_TENANT = "tenant_matter_ops_cross_boundary";
const ACCOUNT = highestPrivilegeRegisteredAccount();
const READ_ONLY_ACCOUNT = registeredAccount("sypark@amic.kr");
const ACTOR = ACCOUNT.user_id;
const NOW = "2026-07-30T02:00:00.000Z";
const COMMON_QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "ui_matter_small_firm_ops",
  audit_hint_ref: "api_test_matter_small_firm_ops",
});

function matterRecord({
  matterId,
  status = "open",
  owner = ACTOR,
  title = `Matter ${matterId}`,
} = {}) {
  return {
    model_type: "Matter",
    matter_id: matterId,
    tenant_id: TENANT,
    client_id: `client_${matterId}`,
    matter_code: `M-${matterId}`,
    title,
    status,
    created_by: ACTOR,
    created_at: "2026-07-01T00:00:00.000Z",
    responsible_lawyer: owner,
    permission_envelope_id: `perm_${matterId}`,
    audit_trace_id: `audit_${matterId}`,
  };
}

function taskRecord({
  taskId,
  matterId = "matter_ops_1",
  assignedTo = ACTOR,
  dueAt,
  waitState = null,
  status = "todo",
} = {}) {
  return {
    model_type: "MatterTask",
    task_id: taskId,
    tenant_id: TENANT,
    matter_id: matterId,
    title: `Task ${taskId}`,
    status,
    created_by: ACTOR,
    assigned_to: assignedTo,
    due_at: dueAt,
    wait_state: waitState,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: `perm_${matterId}`,
    audit_trace_id: `audit_${taskId}`,
  };
}

function buildMatterRepository(filePath) {
  return createMatterRepository({
    filePath,
    seedRecords: [
      matterRecord({ matterId: "matter_ops_1" }),
      matterRecord({ matterId: "matter_ops_clear" }),
      matterRecord({ matterId: "matter_ops_cross_source" }),
      matterRecord({ matterId: "matter_ops_archived", status: "archived" }),
      matterRecord({ matterId: "matter_ops_archive_lifecycle", status: "closed" }),
      matterRecord({ matterId: "matter_ops_billed_clear" }),
      matterRecord({ matterId: "matter_ops_integrity" }),
      taskRecord({
        taskId: "task_my",
        dueAt: "2026-07-30T03:00:00.000Z",
      }),
      taskRecord({
        taskId: "task_integrity",
        matterId: "matter_ops_integrity",
      }),
      taskRecord({
        taskId: "task_overdue",
        assignedTo: "user_other",
        dueAt: "2026-07-20T03:00:00.000Z",
      }),
      taskRecord({
        taskId: "task_waiting",
        assignedTo: "user_other",
        waitState: "client",
      }),
      taskRecord({
        taskId: "task_unassigned",
        assignedTo: null,
      }),
      taskRecord({
        taskId: "task_done_board",
        assignedTo: ACTOR,
        dueAt: "2026-07-30T04:00:00.000Z",
        status: "done",
      }),
      taskRecord({
        taskId: "task_cancelled_board",
        assignedTo: ACTOR,
        dueAt: "2026-07-30T05:00:00.000Z",
        status: "cancelled",
      }),
      {
        model_type: "MatterCalendarEvent",
        event_id: "deadline_existing",
        tenant_id: TENANT,
        matter_id: "matter_ops_1",
        title: "Existing deadline",
        status: "scheduled",
        starts_at: "2026-07-31T03:00:00.000Z",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        permission_envelope_id: "perm_matter_ops_1",
        audit_trace_id: "audit_deadline_existing",
      },
      {
        model_type: "MatterFollowUp",
        resource_id: "followup_existing",
        followup_id: "followup_existing",
        tenant_id: TENANT,
        matter_id: "matter_ops_1",
        title: "Existing client wait",
        channel: "email",
        status: "waiting_client",
        owner_id: ACTOR,
        backup_owner_id: null,
        next_action: "Call client",
        next_action_at: "2026-07-30T03:00:00.000Z",
        snoozed_until: null,
        closed_at: null,
        linked_task_id: null,
        source_ref: "fixture:followup",
        created_by: ACTOR,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_by: ACTOR,
        updated_at: "2026-07-01T00:00:00.000Z",
      },
      {
        model_type: "MatterFollowUp",
        resource_id: "followup_integrity",
        followup_id: "followup_integrity",
        tenant_id: TENANT,
        matter_id: "matter_ops_integrity",
        title: "Integrity handoff",
        channel: "note",
        status: "waiting_firm",
        owner_id: ACTOR,
        backup_owner_id: null,
        next_action: "Assign coverage",
        next_action_at: "2026-08-01T03:00:00.000Z",
        client_id: null,
        created_by: ACTOR,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_by: ACTOR,
        updated_at: "2026-07-01T00:00:00.000Z",
      },
      {
        model_type: "MatterFollowUp",
        resource_id: "followup_client_guard",
        followup_id: "followup_client_guard",
        tenant_id: TENANT,
        matter_id: "matter_ops_integrity",
        client_id: "client_A",
        title: "Client-scoped contact",
        channel: "email",
        status: "waiting_client",
        owner_id: ACTOR,
        backup_owner_id: null,
        next_action: "Confirm response",
        next_action_at: "2026-08-01T03:00:00.000Z",
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
      },
      {
        model_type: "Person",
        resource_id: "user_case_new",
        person_id: "user_case_new",
        tenant_id: TENANT,
        status: "active",
      },
      {
        model_type: "Person",
        resource_id: "user_inactive",
        person_id: "user_inactive",
        tenant_id: TENANT,
        status: "inactive",
      },
      {
        model_type: "MatterMember",
        member_id: "member_followup_backup",
        tenant_id: TENANT,
        matter_id: "matter_ops_1",
        user_id: "user_followup_backup",
        role: "lawyer",
        status: "active",
      },
      {
        model_type: "MatterMember",
        member_id: "member_integrity_backup",
        tenant_id: TENANT,
        matter_id: "matter_ops_integrity",
        user_id: "user_integrity_member",
        role: "lawyer",
        status: "active",
      },
    ],
  });
}

function buildFinanceRepository(filePath) {
  const repository = createFinanceRepository({
    filePath,
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate_ops",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-01-01",
        role_rates: [{ role_id: "partner", hourly_rate: 100_000 }],
        status: "active",
      },
      {
        model_type: "FeeArrangement",
        fee_arrangement_id: "fee_ops",
        tenant_id: TENANT,
        matter_id: "matter_ops_1",
        billing_profile_id: "billing_profile_ops",
        rate_card_id: "rate_ops",
        type: "hourly",
        arrangement_type: "hourly",
        status: "active",
      },
      {
        model_type: "FeeArrangement",
        fee_arrangement_id: "fee_closeout",
        tenant_id: TENANT,
        matter_id: "matter_ops_billed_clear",
        billing_profile_id: "billing_profile_closeout",
        rate_card_id: "rate_ops",
        type: "hourly",
        arrangement_type: "hourly",
        status: "active",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_prebill",
        tenant_id: TENANT,
        matter_id: "matter_ops_1",
        actor_id: ACTOR,
        role_id: "partner",
        work_date: "2026-07-28",
        duration_minutes: 60,
        narrative: "Prebill source",
        billable: true,
        status: "approved",
        approved_for_wip: true,
        submitted_at: "2026-07-29T00:00:00.000Z",
        locked_at: "2026-07-29T01:00:00.000Z",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_api_wip",
        tenant_id: TENANT,
        matter_id: "matter_ops_1",
        actor_id: ACTOR,
        role_id: "partner",
        work_date: "2026-07-29",
        duration_minutes: 30,
        narrative: "API WIP source",
        billable: true,
        status: "approved",
        approved_for_wip: true,
        submitted_at: "2026-07-29T00:00:00.000Z",
        locked_at: "2026-07-29T01:00:00.000Z",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_cross_matter",
        tenant_id: TENANT,
        matter_id: "matter_ops_cross_source",
        actor_id: ACTOR,
        role_id: "partner",
        work_date: "2026-07-29",
        duration_minutes: 30,
        narrative: "Other Matter source",
        billable: true,
        status: "approved",
        approved_for_wip: true,
        submitted_at: "2026-07-29T00:00:00.000Z",
        locked_at: "2026-07-29T01:00:00.000Z",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_cross_tenant",
        tenant_id: OTHER_TENANT,
        matter_id: "matter_ops_1",
        actor_id: "user_other_tenant",
        role_id: "partner",
        work_date: "2026-07-29",
        duration_minutes: 30,
        narrative: "Other tenant source",
        billable: true,
        status: "approved",
        approved_for_wip: true,
        submitted_at: "2026-07-29T00:00:00.000Z",
        locked_at: "2026-07-29T01:00:00.000Z",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_closeout_paid",
        tenant_id: TENANT,
        matter_id: "matter_ops_billed_clear",
        actor_id: ACTOR,
        role_id: "partner",
        work_date: "2026-07-29",
        duration_minutes: 60,
        narrative: "Fully billed closeout source",
        billable: true,
        status: "approved",
        approved_for_wip: true,
        submitted_at: "2026-07-29T00:00:00.000Z",
        locked_at: "2026-07-29T01:00:00.000Z",
      },
    ],
  });
  const rateCard = repository.get({
    tenant_id: TENANT,
    model_type: "RateCard",
    rate_card_id: "rate_ops",
  });
  const source = repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: "time_prebill",
  });
  const wip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: "matter_ops_1",
    source_items: [source],
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "setup_wip_prebill",
  });
  const prebill = createMatterPreBillFromWip({
    repository,
    tenant_id: TENANT,
    matter_id: "matter_ops_1",
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    prebill: {
      prebill_id: "prebill_ready",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "setup_prebill",
  });
  approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "setup_prebill_approve",
  });
  const closeoutSource = repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: "time_closeout_paid",
  });
  const closeoutWip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: "matter_ops_billed_clear",
    source_items: [closeoutSource],
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "setup_wip_closeout",
  });
  const closeoutPrebill = createMatterPreBillFromWip({
    repository,
    tenant_id: TENANT,
    matter_id: "matter_ops_billed_clear",
    wip_item_ids: closeoutWip.wip_items.map((item) => item.wip_item_id),
    prebill: {
      prebill_id: "prebill_closeout_ready",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "setup_prebill_closeout",
  });
  approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: closeoutPrebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "setup_prebill_closeout_approve",
  });
  return repository;
}

let matterRepository;
let financeRepository;
let server;
let baseUrl;
let signedHeaders;
let readOnlyHeaders;
let testStateDir;

function scopeQuery(extra = {}, tenantId = TENANT) {
  return new URLSearchParams({
    ...COMMON_QUERY,
    tenant_id: tenantId,
    ...extra,
  });
}

async function api(path, {
  method = "GET",
  body,
  query = {},
  tenantId = TENANT,
  includeContract = true,
  headers = signedHeaders,
} = {}) {
  const [pathname, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  if (includeContract) {
    for (const [key, value] of scopeQuery(query, tenantId)) params.set(key, value);
  } else {
    for (const [key, value] of Object.entries(query)) params.set(key, value);
  }
  const response = await fetch(`${baseUrl}${pathname}${params.size ? `?${params}` : ""}`, {
    method,
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.startsWith("application/json")
    ? await response.json()
    : await response.text();
  return { response, body: responseBody, contentType };
}

before(async () => {
  testStateDir = mkdtempSync(join(tmpdir(), "lawos-matter-small-firm-api-"));
  matterRepository = buildMatterRepository(join(testStateDir, "matter.json"));
  financeRepository = buildFinanceRepository(join(testStateDir, "finance.json"));
  server = createApiServer({
    matterRuntime: createDefaultMatterRuntime({ repository: matterRepository }),
    financeRuntime: createDefaultFinanceRuntime({
      repository: financeRepository,
      matterRepository,
    }),
    now: () => new Date(NOW),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  signedHeaders = await apiSessionHeaders(baseUrl, ACCOUNT);
  readOnlyHeaders = await apiSessionHeaders(baseUrl, READ_ONLY_ACCOUNT);
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  matterRepository?.close();
  financeRepository?.close();
  if (testStateDir) rmSync(testStateDir, { recursive: true, force: true });
});

test("endpoint catalog exposes canonical aliases and every small-firm mutation family", () => {
  assert.deepEqual(MATTER_SMALL_FIRM_OPS_VIEWS.tasks, ["my", "overdue", "waiting", "unassigned"]);
  assert.deepEqual(MATTER_SMALL_FIRM_OPS_VIEWS.followups, ["today", "waiting_client", "stale_7d"]);
  const routes = new Set(MATTER_SMALL_FIRM_OPS_ENDPOINTS.map(({ method, path }) => `${method} ${path}`));
  for (const expected of [
    "GET /api/matter/ops/today",
    "GET /api/matter/ops/tasks",
    "PATCH /api/matter/ops/tasks/:task_id",
    "PATCH /api/matter/ops/deadlines/:deadline_id",
    "GET /api/matter/ops/deadlines/:deadline_id/history",
    "POST /api/matter/ops/followups/contacts",
    "GET /api/matter/ops/followups/:followup_id",
    "DELETE /api/matter/ops/followups/:followup_id",
    "POST /api/matter/ops/time-weeks/submit",
    "POST /api/matter/ops/time-weeks/lock",
    "POST /api/matter/ops/time-weeks/unlock",
    "GET /api/matter/ops/matters",
    "POST /api/matter/ops/matters/:matter_id/archive",
    "POST /api/matter/ops/matters/:matter_id/restore",
    "PATCH /api/matter/ops/invoices/:invoice_id/lifecycle",
    "POST /api/matter/ops/payments/:payment_id/allocations",
    "POST /api/matter/ops/payments/:payment_id/allocations/:payment_allocation_id/reversal",
    "GET /api/matter/ops/report.csv",
  ]) {
    assert.ok(routes.has(expected), `missing endpoint ${expected}`);
  }
});

test("business dates use the injected instant and requested IANA timezone", () => {
  const boundary = "2026-07-30T15:30:00.000Z";
  assert.equal(matterBusinessDate(boundary, "UTC"), "2026-07-30");
  assert.equal(matterBusinessDate(boundary, "Asia/Seoul"), "2026-07-31");
  assert.throws(
    () => matterBusinessDate(boundary, "Not/A_Timezone"),
    /time_zone must be a valid IANA timezone/,
  );
});

test("authenticated HTTP reads return populated, empty-safe operational projections", async () => {
  const today = await api("/api/matter/ops/today", { query: { as_of: NOW } });
  assert.equal(today.response.status, 200);
  assert.equal(today.body.outcome, "passed");
  assert.equal(today.body.item.by_id.due_today.count, 1);

  const expectedViews = new Map([
    ["my", "task_my"],
    ["overdue", "task_overdue"],
    ["waiting", "task_waiting"],
    ["unassigned", "task_unassigned"],
  ]);
  for (const [view, expectedTaskId] of expectedViews) {
    const tasks = await api("/api/matter/ops/tasks", {
      query: { view, as_of: NOW },
    });
    assert.equal(tasks.response.status, 200);
    assert.ok(tasks.body.items.some((item) => item.id === expectedTaskId), `${view} should contain ${expectedTaskId}`);
  }

  const calendar = await api("/api/matter/ops/calendar", {
    query: { week_start: "2026-07-27" },
  });
  assert.equal(calendar.response.status, 200);
  assert.ok(calendar.body.items.some((item) => item.id === "deadline_existing"));

  const followups = await api("/api/matter/ops/followups", {
    query: { view: "today", as_of: NOW },
  });
  assert.equal(followups.response.status, 200);
  assert.equal(followups.body.items[0].followup_id, "followup_existing");

  const followupDetail = await api("/api/matter/ops/followups/followup_existing");
  assert.equal(followupDetail.response.status, 200);
  assert.equal(followupDetail.body.item.followup_id, "followup_existing");
  assert.equal(followupDetail.body.item.matter_id, "matter_ops_1");

  const activeTaskQueue = await api("/api/matter/ops/tasks", {
    query: { view: "my", as_of: NOW },
  });
  assert.equal(activeTaskQueue.body.items.some(({ id }) => id === "task_done_board"), false);
  assert.equal(activeTaskQueue.body.items.some(({ id }) => id === "task_cancelled_board"), false);

  const boardTaskQueue = await api("/api/matter/ops/tasks", {
    query: { view: "board", as_of: NOW },
  });
  assert.equal(boardTaskQueue.response.status, 200);
  assert.equal(boardTaskQueue.body.view, "board");
  assert.equal(boardTaskQueue.body.include_terminal, true);
  assert.equal(boardTaskQueue.body.items.some(({ id, status }) => id === "task_done_board" && status === "done"), true);
  assert.equal(boardTaskQueue.body.items.some(({ id, status }) => id === "task_cancelled_board" && status === "cancelled"), true);

  const explicitTerminalTaskQueue = await api("/api/matter/ops/tasks", {
    query: { view: "my", include_terminal: "true", as_of: NOW },
  });
  assert.equal(explicitTerminalTaskQueue.response.status, 200);
  assert.equal(explicitTerminalTaskQueue.body.include_terminal, true);
  assert.equal(explicitTerminalTaskQueue.body.items.some(({ id }) => id === "task_done_board"), true);

  const detail = await api("/api/matter/ops/matters/matter_ops_1");
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.item.matter_id, "matter_ops_1");
  assert.ok(detail.body.item.tabs.some((tab) => tab.id === "time_billing"));

  const timeBilling = await api("/api/matter/ops/time-billing", {
    query: { matter_id: "matter_ops_1", as_of_date: "2026-07-30" },
  });
  assert.equal(timeBilling.response.status, 200);
  assert.equal(timeBilling.body.item.wip.matter_id, "matter_ops_1");
  assert.equal(timeBilling.body.item.bank_reference_included, false);
});

test("follow-up GET-by-id is count-safe for unknown, cross-tenant, and missing route scope", async () => {
  const unknown = await api("/api/matter/ops/followups/followup_missing");
  assert.equal(unknown.response.status, 404);
  assert.deepEqual(unknown.body.items, []);
  assert.equal(unknown.body.item, undefined);
  assert.equal(unknown.body.count, undefined);
  assert.equal(unknown.body.count_leak_prevented, true);

  const crossTenant = await api("/api/matter/ops/followups/followup_existing", {
    tenantId: OTHER_TENANT,
  });
  assert.equal(crossTenant.response.status, 404);
  assert.deepEqual(crossTenant.body.items, []);
  assert.equal(crossTenant.body.item, undefined);
  assert.equal(crossTenant.body.count_leak_prevented, true);

  const missingRouteScope = await handleMatterSmallFirmApiRequest({
    pathname: "/api/matter/ops/followups/followup_existing",
    method: "GET",
    query: COMMON_QUERY,
    context: {
      principal: { tenant_id: TENANT, user_id: ACTOR, role_ids: ["lawyer"] },
      rules: [],
      object_acl: [],
    },
    requestId: "req_followup_get_missing_scope",
    runtime: createMatterSmallFirmRuntimeContext({
      matterRepository,
      financeRepository,
      now: () => new Date(NOW),
    }),
  });
  assert.equal(missingRouteScope.status, 403);
  assert.deepEqual(missingRouteScope.body.items, []);
  assert.equal(missingRouteScope.body.item, undefined);
  assert.equal(missingRouteScope.body.count_leak_prevented, true);
});

test("follow-up GET-by-id fails closed on Matter visibility and required_scope, and maps read failures to 503", async () => {
  const followupId = "followup_get_security";
  const matterId = "matter_get_security";
  const localMatterRepository = createMatterRepository({
    seedRecords: [
      matterRecord({ matterId }),
      {
        model_type: "MatterFollowUp",
        resource_id: followupId,
        followup_id: followupId,
        tenant_id: TENANT,
        matter_id: matterId,
        title: "Scoped follow-up",
        channel: "email",
        status: "waiting_client",
        owner_id: ACTOR,
        next_action: "Confirm scope",
        next_action_at: "2026-07-31T03:00:00.000Z",
        required_scope: "matter:internal",
        created_by: ACTOR,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_by: ACTOR,
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ],
  });
  const localFinanceRepository = createFinanceRepository();
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository: localMatterRepository,
    financeRepository: localFinanceRepository,
    now: () => new Date(NOW),
  });
  const readRule = { id: "allow_followup_read", effect: "allow", action: "matter:ops:read" };
  const readContext = {
    principal: { tenant_id: TENANT, user_id: ACTOR, role_ids: ["lawyer"] },
    rules: [readRule],
    object_acl: [],
  };
  const internalContext = {
    ...readContext,
    rules: [
      readRule,
      { id: "allow_internal", effect: "allow", action: "matter:internal", resource_type: "matter" },
    ],
  };
  const call = (context, requestId, repository = localMatterRepository) =>
    handleMatterSmallFirmApiRequest({
      pathname: `/api/matter/ops/followups/${followupId}`,
      method: "GET",
      query: COMMON_QUERY,
      context,
      requestId,
      runtime: createMatterSmallFirmRuntimeContext({
        matterRepository: repository,
        financeRepository: localFinanceRepository,
        now: () => new Date(NOW),
      }),
    });

  try {
    const missingRequiredScope = await call(readContext, "req_followup_get_scope_denied");
    assert.equal(missingRequiredScope.status, 404);
    assert.deepEqual(missingRequiredScope.body.items, []);
    assert.equal(missingRequiredScope.body.item, undefined);
    assert.equal(missingRequiredScope.body.count_leak_prevented, true);

    const allowedInternal = await call(internalContext, "req_followup_get_scope_allowed");
    assert.equal(allowedInternal.status, 200);
    assert.equal(allowedInternal.body.item.followup_id, followupId);

    const hiddenContext = {
      ...internalContext,
      rules: [
        ...internalContext.rules,
        {
          id: "deny_security_matter",
          effect: "deny",
          action: "matter:ops:read",
          ethical_wall_matter_id: matterId,
        },
      ],
    };
    const hidden = await call(hiddenContext, "req_followup_get_matter_denied");
    assert.equal(hidden.status, 404);
    assert.deepEqual(hidden.body.items, []);
    assert.equal(hidden.body.item, undefined);

    const failingRepository = {
      ...localMatterRepository,
      get() {
        throw new Error("repository unavailable");
      },
    };
    const failed = await call(internalContext, "req_followup_get_repository_failure", failingRepository);
    assert.equal(failed.status, 503);
    assert.deepEqual(failed.body.safe_error_codes, ["MATTER_OPS_RUNTIME_UNAVAILABLE"]);
    assert.deepEqual(failed.body.items, []);
    assert.equal(failed.body.item, undefined);
  } finally {
    localMatterRepository.close();
    localFinanceRepository.close();
  }
});

test("task mutation is durable, list/board compatible, replay-safe, and fingerprint-conflict safe", async () => {
  const request = {
    idempotency_key: "api_task_create_1",
    task: {
      matter_id: "matter_ops_1",
      title: "Prepare client update",
      assigned_to: ACTOR,
      due_at: "2026-07-31T03:00:00.000Z",
      priority: "high",
    },
  };
  const created = await api("/api/matter/ops/tasks", { method: "POST", body: request });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.item.title, request.task.title);
  assert.equal(created.body.item.ledger_ref.model_type, "MatterTask");
  const taskId = created.body.item.id;

  const replay = await api("/api/matter/ops/tasks", { method: "POST", body: request });
  assert.equal(replay.response.status, 201);
  assert.equal(replay.body.item.id, taskId);
  assert.equal(replay.body.idempotent_replay, true);

  const conflict = await api("/api/matter/ops/tasks", {
    method: "POST",
    body: {
      ...request,
      task: { ...request.task, title: "Changed request" },
    },
  });
  assert.equal(conflict.response.status, 409);
  assert.deepEqual(conflict.body.safe_error_codes, ["MATTER_OPS_IDEMPOTENCY_CONFLICT"]);

  const transitioned = await api(`/api/matter/ops/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: {
      idempotency_key: "api_task_transition_1",
      status: "in_progress",
      matter_id: "matter_ops_1",
    },
  });
  assert.equal(transitioned.response.status, 200);
  assert.equal(transitioned.body.task.status, "in_progress");
  assert.equal(transitioned.body.item.status, "in_progress");

  const listed = await api("/api/matter/ops/tasks", {
    query: { view: "my", as_of: NOW },
  });
  assert.equal(listed.body.items.find((item) => item.id === taskId).status, "in_progress");

  const completed = await api(`/api/matter/ops/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: {
      idempotency_key: "api_task_complete_1",
      status: "done",
      matter_id: "matter_ops_1",
    },
  });
  assert.equal(completed.response.status, 200);
  assert.equal(completed.body.task.status, "done");
  assert.deepEqual(
    matterRepository
      .listAudit({ tenant_id: TENANT, object_id: taskId })
      .filter(({ action }) => action === "matter.task.transition")
      .map(({ reason }) => reason),
    ["matter_task_started", "matter_task_completed"],
  );
});

test("task block and reopen require an explicit reason before writes or evidence", async () => {
  const taskRef = {
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: "task_integrity",
  };
  const assertRejectedAtomically = async (idempotencyKey, status) => {
    const before = matterRepository.snapshot();
    const result = await api("/api/matter/ops/tasks/task_integrity", {
      method: "PATCH",
      body: {
        idempotency_key: idempotencyKey,
        matter_id: "matter_ops_integrity",
        status,
      },
    });
    assert.equal(result.response.status, 422);
    assert.equal(result.body.ui_state, "blocked");
    assert.deepEqual(result.body.safe_error_codes, ["MATTER_TASK_TRANSITION_REASON_REQUIRED"]);
    assert.equal(result.body.message, undefined);
    assert.equal(result.body.stack, undefined);
    assert.equal(result.rawBody, undefined);
    assert.deepEqual(matterRepository.snapshot(), before);
    assert.equal(matterRepository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: `matter-ops-api:${idempotencyKey}`,
    }), undefined);
    assert.equal(matterRepository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: `matter-ops-domain:matter.task.transition:${idempotencyKey}`,
    }), undefined);
  };

  await assertRejectedAtomically("api_task_block_missing_reason", "blocked");
  assert.equal(matterRepository.get(taskRef).status, "todo");

  const blockReason = "Waiting for signed client approval";
  const blocked = await api("/api/matter/ops/tasks/task_integrity", {
    method: "PATCH",
    body: {
      idempotency_key: "api_task_block_with_reason",
      matter_id: "matter_ops_integrity",
      status: "blocked",
      reason: blockReason,
    },
  });
  assert.equal(blocked.response.status, 200);
  assert.equal(blocked.body.task.blocked_reason, blockReason);
  assert.equal(matterRepository.get(taskRef).blocked_reason, blockReason);

  await assertRejectedAtomically("api_task_reopen_missing_reason", "in_progress");
  assert.equal(matterRepository.get(taskRef).status, "blocked");

  const reopenReason = "Signed approval received";
  const reopened = await api("/api/matter/ops/tasks/task_integrity", {
    method: "PATCH",
    body: {
      idempotency_key: "api_task_reopen_with_reason",
      matter_id: "matter_ops_integrity",
      status: "in_progress",
      reason: reopenReason,
    },
  });
  assert.equal(reopened.response.status, 200);
  assert.equal(matterRepository.get(taskRef).status, "in_progress");
  assert.deepEqual(
    matterRepository
      .listAudit({ tenant_id: TENANT, object_id: "task_integrity" })
      .filter(({ action }) => action === "matter.task.transition")
      .map(({ reason }) => reason),
    [blockReason, reopenReason],
  );
});

test("validation, domain rejection, tenant boundary, unknown route, and method errors are explicit", async () => {
  const timezoneLessToday = await api("/api/matter/ops/today", {
    query: { as_of: "2026-07-30T02:00:00" },
  });
  assert.equal(timezoneLessToday.response.status, 400);
  assert.equal(timezoneLessToday.body.ui_state, "blocked");

  const invalid = await api("/api/matter/ops/tasks", {
    method: "POST",
    body: {
      idempotency_key: "api_task_invalid",
      task: { matter_id: "matter_ops_1" },
    },
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.ui_state, "blocked");

  const rejected = await api("/api/matter/ops/tasks/task_my", {
    method: "PATCH",
    body: {
      idempotency_key: "api_task_rejected",
      status: "unsupported",
      matter_id: "matter_ops_1",
      reason: "Unsupported transition probe",
    },
  });
  assert.equal(rejected.response.status, 422);
  assert.equal(rejected.body.ui_state, "blocked");
  assert.deepEqual(rejected.body.safe_error_codes, ["MATTER_TASK_TRANSITION_INVALID"]);
  assert.equal(rejected.body.message, undefined);
  assert.equal(rejected.body.stack, undefined);
  assert.equal(rejected.rawBody, undefined);
  assert.deepEqual(rejected.body.items, []);

  const crossTenant = await api("/api/matter/ops/tasks", {
    tenantId: OTHER_TENANT,
    query: { view: "my" },
  });
  assert.equal(crossTenant.response.status, 403);
  assert.equal(crossTenant.body.ui_state, "denied");

  const mismatchedBodyTenant = await api("/api/matter/ops/tasks", {
    method: "POST",
    body: {
      tenant_id: OTHER_TENANT,
      idempotency_key: "api_task_mismatched_tenant",
      task: { matter_id: "matter_ops_1", title: "Must not persist" },
    },
  });
  assert.equal(mismatchedBodyTenant.response.status, 400);

  const unknown = await api("/api/matter/ops/unknown");
  assert.equal(unknown.response.status, 404);

  const method = await api("/api/matter/ops/today", {
    method: "POST",
    body: { idempotency_key: "api_wrong_method" },
  });
  assert.equal(method.response.status, 405);

  const missingContract = await api("/api/matter/ops/today", {
    includeContract: false,
    query: { tenant_id: TENANT },
  });
  assert.equal(missingContract.response.status, 400);
});

test("Matter detail derives internal-note visibility from the exact policy decision", async () => {
  const matterIds = ["matter_internal_allowed", "matter_internal_other"];
  const localMatterRepository = createMatterRepository({
    seedRecords: [
      ...matterIds.map((matterId) => matterRecord({ matterId })),
      ...matterIds.map((matterId) => ({
        model_type: "MatterTimelineEvent",
        resource_id: `internal_note_${matterId}`,
        event_id: `internal_note_${matterId}`,
        tenant_id: TENANT,
        matter_id: matterId,
        occurred_at: NOW,
        type: "matter.followup.internal_note",
        title: `INTERNAL_${matterId}`,
        source_ref: `note:${matterId}`,
        required_scope: "matter:internal",
        safe_summary: { safe_excerpt: `INTERNAL_${matterId}` },
      })),
    ],
  });
  const localFinanceRepository = createFinanceRepository();
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository: localMatterRepository,
    financeRepository: localFinanceRepository,
    now: () => new Date(NOW),
  });
  const principal = {
    tenant_id: TENANT,
    user_id: ACTOR,
    role_ids: ["lawyer"],
  };
  const readRule = {
    id: "allow_matter_detail_read",
    effect: "allow",
    action: "matter:ops:read",
    resource_type: "matter",
  };
  const readDetail = (matterId, context, requestId) => handleMatterSmallFirmApiRequest({
    pathname: `/api/matter/ops/matters/${matterId}`,
    method: "GET",
    query: {
      ...COMMON_QUERY,
      granted_scopes: "matter:internal",
    },
    body: {},
    context,
    requestId,
    runtime,
  });

  try {
    const withoutGrant = await readDetail("matter_internal_allowed", {
      principal,
      rules: [readRule],
      object_acl: [],
    }, "req_detail_without_internal");
    assert.equal(withoutGrant.status, 200);
    assert.equal(JSON.stringify(withoutGrant.body).includes("INTERNAL_matter_internal_allowed"), false);

    const exactGrantContext = {
      principal,
      rules: [
        readRule,
        {
          id: "allow_exact_matter_internal",
          effect: "allow",
          action: "matter:internal",
          resource_type: "matter",
          ethical_wall_matter_id: "matter_internal_allowed",
        },
      ],
      object_acl: [],
    };
    const withGrant = await readDetail(
      "matter_internal_allowed",
      exactGrantContext,
      "req_detail_with_internal",
    );
    assert.equal(withGrant.status, 200);
    assert.equal(JSON.stringify(withGrant.body).includes("INTERNAL_matter_internal_allowed"), true);

    const otherMatter = await readDetail(
      "matter_internal_other",
      exactGrantContext,
      "req_detail_other_matter",
    );
    assert.equal(otherMatter.status, 200);
    assert.equal(JSON.stringify(otherMatter.body).includes("INTERNAL_matter_internal_other"), false);
  } finally {
    localMatterRepository.close();
    localFinanceRepository.close();
  }
});

test("canonical Matter trimming prevents wall, cross-owner, and aggregate leaks", async () => {
  const compositeSecrets = Object.freeze([
    "SECRET_TIME_NARRATIVE",
    "SECRET_WIP_TITLE",
    "SECRET_INVOICE_NUMBER",
    "SECRET_PAYMENT_MEMO",
  ]);
  const localMatterRepository = createMatterRepository({
    seedRecords: [
      matterRecord({ matterId: "matter_auth_clear" }),
      matterRecord({ matterId: "matter_auth_walled" }),
      taskRecord({
        taskId: "task_auth_clear",
        matterId: "matter_auth_clear",
        assignedTo: ACTOR,
        dueAt: "2026-07-30T03:00:00.000Z",
      }),
      taskRecord({
        taskId: "task_auth_walled",
        matterId: "matter_auth_walled",
        assignedTo: ACTOR,
        dueAt: "2026-07-30T03:00:00.000Z",
      }),
      {
        model_type: "MatterFollowUp",
        resource_id: "followup_auth_walled",
        followup_id: "followup_auth_walled",
        tenant_id: TENANT,
        matter_id: "matter_auth_walled",
        title: "Protected follow-up",
        channel: "email",
        status: "waiting_client",
        owner_id: ACTOR,
        next_action: "Wait",
        next_action_at: "2026-07-30T03:00:00.000Z",
        source_ref: "fixture:auth-wall",
        created_by: ACTOR,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_by: ACTOR,
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ],
  });
  const localFinanceRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "TimeEntry",
        time_entry_id: "time_auth_clear",
        tenant_id: TENANT,
        matter_id: "matter_auth_clear",
        actor_id: ACTOR,
        work_date: "2026-07-30",
        duration_minutes: 30,
        narrative: compositeSecrets[0],
        billable: true,
        status: "draft",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_auth_walled",
        tenant_id: TENANT,
        matter_id: "matter_auth_walled",
        actor_id: ACTOR,
        work_date: "2026-07-30",
        duration_minutes: 30,
        narrative: "Protected entry",
        billable: true,
        status: "draft",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "time_auth_other_owner",
        tenant_id: TENANT,
        matter_id: "matter_auth_clear",
        actor_id: "user_other_timekeeper",
        work_date: "2026-07-30",
        duration_minutes: 30,
        narrative: "Another timekeeper entry",
        billable: true,
        status: "draft",
      },
      {
        model_type: "WipItem",
        wip_item_id: "wip_auth_clear",
        tenant_id: TENANT,
        matter_id: "matter_auth_clear",
        source_model_type: "TimeEntry",
        source_id: "time_auth_clear",
        title: compositeSecrets[1],
        amount: 10_000,
        currency: "KRW",
        status: "ready",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice_auth_clear",
        tenant_id: TENANT,
        matter_id: "matter_auth_clear",
        invoice_number: compositeSecrets[2],
        billing_client_party_id: "client_matter_auth_clear",
        amount_due: 10_000,
        amount_paid: 0,
        outstanding_amount: 10_000,
        currency: "KRW",
        due_date: "2026-07-31",
        lifecycle_status: "sent",
        status: "sent",
      },
      {
        model_type: "Payment",
        payment_id: "payment_auth_clear",
        tenant_id: TENANT,
        matter_id: "matter_auth_clear",
        memo: compositeSecrets[3],
        bank_reference: "bank:composite-auth",
        amount: 10_000,
        currency: "KRW",
        received_at: NOW,
        status: "imported",
      },
    ],
  });
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository: localMatterRepository,
    financeRepository: localFinanceRepository,
    now: () => new Date(NOW),
  });
  const call = ({
    pathname,
    method = "GET",
    query = {},
    body = {},
    context,
    requestId,
  }) => handleMatterSmallFirmApiRequest({
    pathname,
    method,
    query: { ...COMMON_QUERY, ...query },
    body,
    context,
    requestId,
    runtime,
  });
  const principal = {
    tenant_id: TENANT,
    user_id: ACTOR,
    role_ids: ["lawyer"],
  };
  const readContext = {
    principal,
    rules: [
      { id: "allow_visible_reads", effect: "allow", action: "*" },
      {
        id: "deny_walled_matter",
        effect: "deny",
        action: "*",
        ethical_wall_matter_id: "matter_auth_walled",
      },
    ],
    object_acl: [],
  };

  try {
    const timeRows = await call({
      pathname: "/api/matter/ops/time-entries",
      context: readContext,
      requestId: "req_auth_time_rows",
    });
    assert.equal(timeRows.status, 200);
    assert.deepEqual(
      timeRows.body.items.map(({ time_entry_id }) => time_entry_id).sort(),
      ["time_auth_clear", "time_auth_other_owner"],
    );
    assert.equal(timeRows.body.count, timeRows.body.items.length);
    assert.equal(JSON.stringify(timeRows.body).includes("Protected entry"), false);

    const taskRows = await call({
      pathname: "/api/matter/ops/tasks",
      query: { view: "my", as_of: NOW },
      context: readContext,
      requestId: "req_auth_task_rows",
    });
    assert.equal(taskRows.status, 200);
    assert.deepEqual(taskRows.body.items.map(({ id }) => id), ["task_auth_clear"]);
    assert.deepEqual(taskRows.body.summary, {
      overdue: 0,
      due_today: 1,
      upcoming: 0,
      undated: 0,
    });
    assert.equal(
      Object.values(taskRows.body.summary).reduce((sum, count) => sum + count, 0),
      taskRows.body.items.length,
    );

    const compositeDenyContext = {
      principal,
      rules: [
        { id: "allow_composite_matter", effect: "allow", action: "matter:ops:read" },
        { id: "allow_composite_ar", effect: "allow", action: "finance:ar:read" },
        { id: "deny_composite_time", effect: "deny", action: "finance:time:read" },
        { id: "deny_composite_wip", effect: "deny", action: "finance:wip:read" },
        { id: "deny_composite_invoice", effect: "deny", action: "finance:invoice:read" },
        { id: "deny_composite_payment", effect: "deny", action: "finance:payment:read" },
      ],
      object_acl: [],
    };
    const todayComposite = await call({
      pathname: "/api/matter/ops/today",
      query: { as_of: NOW },
      context: compositeDenyContext,
      requestId: "req_composite_today_deny",
    });
    const detailComposite = await call({
      pathname: "/api/matter/ops/matters/matter_auth_clear",
      context: compositeDenyContext,
      requestId: "req_composite_detail_deny",
    });
    const closeoutComposite = await call({
      pathname: "/api/matter/ops/matters/matter_auth_clear/closeout",
      context: compositeDenyContext,
      requestId: "req_composite_closeout_deny",
    });
    const timeBillingComposite = await call({
      pathname: "/api/matter/ops/time-billing",
      query: {
        matter_id: "matter_auth_clear",
        as_of: NOW,
        as_of_date: "2026-07-30",
      },
      context: compositeDenyContext,
      requestId: "req_composite_time_billing_deny",
    });
    for (const result of [
      todayComposite,
      detailComposite,
      closeoutComposite,
      timeBillingComposite,
    ]) {
      assert.equal(result.status, 200);
      const serialized = JSON.stringify(result.body);
      for (const secret of compositeSecrets) {
        assert.equal(serialized.includes(secret), false, `${secret} leaked from composite response`);
      }
    }
    assert.equal(todayComposite.body.item.by_id.missing_time.count, 0);
    assert.equal(todayComposite.body.item.by_id.wip.count, 0);
    assert.equal(todayComposite.body.item.by_id.ar.count, 0);
    assert.deepEqual(detailComposite.body.item.tab_data.time_billing, []);
    assert.equal(
      detailComposite.body.item.tabs.find(({ id }) => id === "time_billing").count,
      0,
    );
    assert.deepEqual(
      closeoutComposite.body.items.map(({ blocker_type }) => blocker_type),
      ["open_task"],
    );
    assert.equal(timeBillingComposite.body.item.weekly_time.summary.entry_count, 0);
    assert.equal(timeBillingComposite.body.item.wip.totals.item_count, 0);
    assert.equal(timeBillingComposite.body.item.ar.totals.invoice_count, 0);
    assert.deepEqual(timeBillingComposite.body.item.invoices, []);
    assert.deepEqual(timeBillingComposite.body.item.payments, []);

    const walledMatterWriteContext = {
      principal,
      rules: [
        { id: "allow_matter_write", effect: "allow", action: "matter:ops:write" },
        {
          id: "deny_walled_matter_write",
          effect: "deny",
          action: "matter:ops:write",
          ethical_wall_matter_id: "matter_auth_walled",
        },
      ],
      object_acl: [],
    };
    const archiveDeniedBefore = localMatterRepository.snapshot();
    const archiveDenied = await call({
      pathname: "/api/matter/ops/matters/matter_auth_walled/archive",
      method: "POST",
      body: {
        idempotency_key: "auth_walled_archive",
        reason: "Must not archive",
      },
      context: walledMatterWriteContext,
      requestId: "req_auth_walled_archive",
    });
    const archiveDeniedAfter = localMatterRepository.snapshot();
    assert.equal(archiveDenied.status, 403);
    assert.equal(localMatterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: "matter_auth_walled",
    }).status, "open");
    assert.deepEqual(archiveDeniedAfter, archiveDeniedBefore);

    const followupDeleteDenied = await call({
      pathname: "/api/matter/ops/followups/followup_auth_walled",
      method: "DELETE",
      body: {
        idempotency_key: "auth_walled_followup_delete",
        matter_id: "matter_auth_clear",
      },
      context: walledMatterWriteContext,
      requestId: "req_auth_walled_followup_delete",
    });
    assert.equal(followupDeleteDenied.status, 403);
    assert.equal(localMatterRepository.get({
      tenant_id: TENANT,
      model_type: "MatterFollowUp",
      resource_id: "followup_auth_walled",
    }).followup_id, "followup_auth_walled");

    const walledWriteContext = {
      principal,
      rules: [
        { id: "allow_time_write", effect: "allow", action: "finance:time:write" },
        {
          id: "deny_walled_time_write",
          effect: "deny",
          action: "finance:time:write",
          ethical_wall_matter_id: "matter_auth_walled",
        },
      ],
      object_acl: [],
    };
    const walledSubmit = await call({
      pathname: "/api/matter/ops/time-weeks/submit",
      method: "POST",
      body: {
        idempotency_key: "auth_walled_submit",
        week_start: "2026-07-27",
        time_entry_ids: ["time_auth_walled"],
      },
      context: walledWriteContext,
      requestId: "req_auth_walled_submit",
    });
    assert.equal(walledSubmit.status, 403);
    assert.equal(localFinanceRepository.get({
      tenant_id: TENANT,
      model_type: "TimeEntry",
      time_entry_id: "time_auth_walled",
    }).status, "draft");

    const ownerOnlyContext = {
      principal,
      rules: [
        { id: "allow_owner_time_write", effect: "allow", action: "finance:time:write" },
      ],
      object_acl: [],
    };
    const crossOwnerSubmit = await call({
      pathname: "/api/matter/ops/time-weeks/submit",
      method: "POST",
      body: {
        idempotency_key: "auth_cross_owner_submit",
        week_start: "2026-07-27",
        time_entry_ids: ["time_auth_other_owner"],
      },
      context: ownerOnlyContext,
      requestId: "req_auth_cross_owner_submit",
    });
    assert.equal(crossOwnerSubmit.status, 403);
    assert.deepEqual(
      crossOwnerSubmit.body.safe_error_codes,
      ["MATTER_OPS_OWNER_OR_MANAGER_REQUIRED"],
    );
    assert.equal(localFinanceRepository.get({
      tenant_id: TENANT,
      model_type: "TimeEntry",
      time_entry_id: "time_auth_other_owner",
    }).status, "draft");

    const managerContext = {
      principal,
      rules: [
        { id: "allow_manager_time_write", effect: "allow", action: "finance:time:write" },
        { id: "allow_manager_time_manage", effect: "allow", action: "finance:time:manage" },
      ],
      object_acl: [],
    };
    const managerSubmit = await call({
      pathname: "/api/matter/ops/time-weeks/submit",
      method: "POST",
      body: {
        idempotency_key: "auth_manager_submit",
        week_start: "2026-07-27",
        time_entry_ids: ["time_auth_other_owner"],
      },
      context: managerContext,
      requestId: "req_auth_manager_submit",
    });
    assert.equal(managerSubmit.status, 200);
    assert.equal(managerSubmit.body.items[0].status, "submitted");
  } finally {
    localMatterRepository.close();
    localFinanceRepository.close();
  }
});

test("Matter and follow-up handoffs validate active references atomically", async () => {
  const rejectAtomically = async (path, body) => {
    const before = matterRepository.snapshot();
    const result = await api(path, { method: "POST", body });
    assert.equal(result.response.status, 400);
    assert.deepEqual(matterRepository.snapshot(), before);
    return result;
  };

  const invalidMatterOwner = await rejectAtomically(
    "/api/matter/ops/matters/matter_ops_integrity/handoffs",
    {
      idempotency_key: "api_matter_handoff_invalid_owner",
      new_owner_user_id: "user_missing",
      new_backup_user_id: ACTOR,
      note: "Invalid owner probe",
    },
  );
  assert.deepEqual(
    invalidMatterOwner.body.safe_error_codes,
    ["MATTER_HANDOFF_ASSIGNEE_INVALID"],
  );

  await rejectAtomically(
    "/api/matter/ops/matters/matter_ops_integrity/handoffs",
    {
      idempotency_key: "api_matter_handoff_inactive_backup",
      new_owner_user_id: "user_case_new",
      new_backup_user_id: "user_inactive",
      note: "Inactive backup probe",
    },
  );

  const validMatterHandoff = await api(
    "/api/matter/ops/matters/matter_ops_integrity/handoffs",
    {
      method: "POST",
      body: {
        idempotency_key: "api_matter_handoff_valid_refs",
        new_owner_user_id: "user_case_new",
        new_backup_user_id: "user_integrity_member",
        note: "Validated coverage rotation",
      },
    },
  );
  assert.equal(validMatterHandoff.response.status, 200);
  assert.equal(validMatterHandoff.body.matter.owner_user_id, "user_case_new");
  assert.equal(validMatterHandoff.body.matter.backup_user_id, "user_integrity_member");

  await rejectAtomically(
    "/api/matter/ops/followups/followup_integrity/handoffs",
    {
      idempotency_key: "api_followup_handoff_inactive_owner",
      matter_id: "matter_ops_integrity",
      to_owner_id: "user_inactive",
      backup_owner_id: ACTOR,
      reason: "Inactive owner probe",
    },
  );

  await rejectAtomically(
    "/api/matter/ops/followups/followup_integrity/handoffs",
    {
      idempotency_key: "api_followup_handoff_invalid_backup",
      matter_id: "matter_ops_integrity",
      to_owner_id: "user_integrity_member",
      backup_owner_id: "user_missing",
      reason: "Invalid backup probe",
    },
  );

  const validFollowupHandoff = await api(
    "/api/matter/ops/followups/followup_integrity/handoffs",
    {
      method: "POST",
      body: {
        idempotency_key: "api_followup_handoff_valid_refs",
        matter_id: "matter_ops_integrity",
        to_owner_id: "user_integrity_member",
        backup_owner_id: ACTOR,
        reason: "Validated follow-up coverage",
      },
    },
  );
  assert.equal(validFollowupHandoff.response.status, 200);
  assert.equal(validFollowupHandoff.body.item.owner_id, "user_integrity_member");
  assert.equal(validFollowupHandoff.body.item.backup_owner_id, ACTOR);
});

test("owner-only Matter handoff validates retained backup and preserves explicit clear semantics", async () => {
  for (const { matterId, backupUserId } of [
    { matterId: "matter_ops_retain_unknown", backupUserId: "user_missing_backup" },
    { matterId: "matter_ops_retain_inactive", backupUserId: "user_inactive" },
  ]) {
    matterRepository.create({
      ...matterRecord({ matterId }),
      backup_user_id: backupUserId,
    });
    const before = matterRepository.snapshot();
    const result = await api(`/api/matter/ops/matters/${matterId}/handoffs`, {
      method: "POST",
      body: {
        idempotency_key: `api_matter_handoff_retain_${matterId}`,
        new_owner_user_id: "user_case_new",
        note: "Retained backup validation probe",
      },
    });

    assert.equal(result.response.status, 400);
    assert.deepEqual(result.body.safe_error_codes, ["MATTER_HANDOFF_ASSIGNEE_INVALID"]);
    assert.deepEqual(matterRepository.snapshot(), before);
  }

  matterRepository.create({
    ...matterRecord({ matterId: "matter_ops_retain_valid" }),
    backup_user_id: ACTOR,
  });
  const retained = await api("/api/matter/ops/matters/matter_ops_retain_valid/handoffs", {
    method: "POST",
    body: {
      idempotency_key: "api_matter_handoff_retain_valid",
      new_owner_user_id: "user_case_new",
      note: "Retain active current backup",
    },
  });
  assert.equal(retained.response.status, 200);
  assert.equal(retained.body.matter.owner_user_id, "user_case_new");
  assert.equal(retained.body.matter.backup_user_id, ACTOR);
  assert.equal(
    matterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: "matter_ops_retain_valid",
    }).backup_user_id,
    ACTOR,
  );

  matterRepository.create({
    ...matterRecord({ matterId: "matter_ops_explicit_clear" }),
    backup_user_id: ACTOR,
  });
  const cleared = await api("/api/matter/ops/matters/matter_ops_explicit_clear/handoffs", {
    method: "POST",
    body: {
      idempotency_key: "api_matter_handoff_explicit_clear",
      new_owner_user_id: "user_case_new",
      new_backup_user_id: null,
      backup_user_id: ACTOR,
      note: "Explicitly clear current backup",
    },
  });
  assert.equal(cleared.response.status, 200);
  assert.equal(cleared.body.matter.owner_user_id, "user_case_new");
  assert.equal(cleared.body.matter.backup_user_id, null);
  assert.equal(
    matterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: "matter_ops_explicit_clear",
    }).backup_user_id,
    null,
  );
});

test("follow-up contact rejects a cross-client caller atomically", async () => {
  const before = matterRepository.snapshot();
  const result = await api("/api/matter/ops/followups/contacts", {
    method: "POST",
    body: {
      idempotency_key: "api_followup_contact_cross_client",
      matter_id: "matter_ops_integrity",
      client_id: "client_B",
      contact: {
        followup_id: "followup_client_guard",
        client_id: "client_A",
        channel: "email",
        direction: "outbound",
        visibility: "client",
        delivery_state: "sent",
        summary: "Must not persist across clients",
        occurred_at: NOW,
      },
    },
  });
  assert.equal(result.response.status, 400);
  assert.deepEqual(matterRepository.snapshot(), before);
});

test("follow-up contact rejects matching forged clients against the canonical Matter atomically", async () => {
  const before = matterRepository.snapshot();
  const contactCountBefore = matterRepository.list({
    tenant_id: TENANT,
    model_type: "MatterFollowUpContact",
  }).length;
  const projectionCountBefore = matterRepository.list({
    tenant_id: TENANT,
    model_type: "MatterLastContactProjection",
  }).length;
  const auditCountBefore = matterRepository.listAudit({ tenant_id: TENANT }).length;
  const result = await api("/api/matter/ops/followups/contacts", {
    method: "POST",
    body: {
      idempotency_key: "api_followup_contact_forged_canonical_client",
      matter_id: "matter_ops_integrity",
      client_id: "client_A",
      contact: {
        contact_id: "contact_forged_canonical_client",
        followup_id: "followup_client_guard",
        client_id: "client_A",
        channel: "email",
        direction: "outbound",
        visibility: "client",
        delivery_state: "sent",
        summary: "Must not persist under a forged client projection",
        occurred_at: NOW,
      },
    },
  });

  assert.equal(result.response.status, 400);
  assert.deepEqual(matterRepository.snapshot(), before);
  assert.equal(matterRepository.list({
    tenant_id: TENANT,
    model_type: "MatterFollowUpContact",
  }).length, contactCountBefore);
  assert.equal(matterRepository.list({
    tenant_id: TENANT,
    model_type: "MatterLastContactProjection",
  }).length, projectionCountBefore);
  assert.equal(matterRepository.listAudit({ tenant_id: TENANT }).length, auditCountBefore);
  assert.equal(matterRepository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "api_followup_contact_forged_canonical_client",
  }), undefined);
});

test("deadline, follow-up, meeting, closeout, and archive restore dispatch real Matter services", async () => {
  const deadlineCreated = await api("/api/matter/ops/deadlines", {
    method: "POST",
    body: {
      idempotency_key: "api_deadline_create",
      deadline: {
        matter_id: "matter_ops_1",
        title: "Court filing",
        starts_at: "2026-08-03T03:00:00.000Z",
        responsible_user_id: ACTOR,
      },
    },
  });
  assert.equal(deadlineCreated.response.status, 201);
  const deadlineId = deadlineCreated.body.item.id;

  const deadlineMoved = await api(`/api/matter/ops/deadlines/${encodeURIComponent(deadlineId)}`, {
    method: "PATCH",
    body: {
      idempotency_key: "api_deadline_move",
      matter_id: "matter_ops_1",
      new_starts_at: "2026-08-04T03:00:00.000Z",
      reason: "Court order",
    },
  });
  assert.equal(deadlineMoved.response.status, 200);
  assert.equal(deadlineMoved.body.deadline.starts_at, "2026-08-04T03:00:00.000Z");

  const history = await api(`/api/matter/ops/deadlines/${encodeURIComponent(deadlineId)}/history`);
  assert.equal(history.response.status, 200);
  assert.equal(history.body.items.length, 2);

  const followupCreated = await api("/api/matter/ops/followups", {
    method: "POST",
    body: {
      idempotency_key: "api_followup_create",
      matter_id: "matter_ops_1",
      followup: {
        title: "Confirm client documents",
        channel: "call",
        status: "waiting_client",
        owner_id: ACTOR,
        next_action: "Call again",
        next_action_at: "2026-08-01T03:00:00.000Z",
      },
    },
  });
  assert.equal(followupCreated.response.status, 201);
  assert.match(followupCreated.body.item.followup_id, /^followup_/);
  const followupId = followupCreated.body.item.followup_id;

  const followupUpdated = await api(`/api/matter/ops/followups/${encodeURIComponent(followupId)}`, {
    method: "PATCH",
    body: {
      idempotency_key: "api_followup_update",
      matter_id: "matter_ops_1",
      patch: {
        status: "waiting_firm",
        owner_id: ACTOR,
        next_action: "Draft response",
        next_action_at: "2026-08-02T03:00:00.000Z",
      },
    },
  });
  assert.equal(followupUpdated.response.status, 200);
  assert.equal(followupUpdated.body.item.status, "waiting_firm");

  const contact = await api("/api/matter/ops/followups/contacts", {
    method: "POST",
    body: {
      idempotency_key: "api_followup_contact",
      matter_id: "matter_ops_1",
      contact: {
        followup_id: followupId,
        channel: "call",
        direction: "inbound",
        visibility: "client",
        delivery_state: "received",
        summary: "Client confirmed receipt",
        occurred_at: NOW,
      },
    },
  });
  assert.equal(contact.response.status, 201);
  assert.equal(contact.body.item.raw_body_included, false);

  const converted = await api(`/api/matter/ops/followups/${encodeURIComponent(followupId)}/convert-to-task`, {
    method: "POST",
    body: {
      idempotency_key: "api_followup_convert",
      matter_id: "matter_ops_1",
      task: { title: "Draft client reply", assigned_to: ACTOR },
    },
  });
  assert.equal(converted.response.status, 200);
  assert.equal(converted.body.task.source_ref, `followup:${followupId}`);

  const handedOff = await api(`/api/matter/ops/followups/${encodeURIComponent(followupId)}/handoffs`, {
    method: "POST",
    body: {
      idempotency_key: "api_followup_handoff",
      matter_id: "matter_ops_1",
      to_owner_id: "user_followup_backup",
      backup_owner_id: ACTOR,
      reason: "Coverage rotation",
    },
  });
  assert.equal(handedOff.response.status, 200);
  assert.equal(handedOff.body.item.owner_id, "user_followup_backup");

  const deletedFollowup = await api(`/api/matter/ops/followups/${encodeURIComponent(followupId)}`, {
    method: "DELETE",
    body: {
      idempotency_key: "api_followup_delete",
      matter_id: "matter_ops_cross_source",
    },
  });
  assert.equal(deletedFollowup.response.status, 200);
  assert.equal(deletedFollowup.body.deleted, true);
  assert.equal(deletedFollowup.body.item.followup_id, followupId);
  assert.equal(matterRepository.get({
    tenant_id: TENANT,
    model_type: "MatterFollowUp",
    resource_id: followupId,
  }), undefined);

  const deletedFollowupReplay = await api(`/api/matter/ops/followups/${encodeURIComponent(followupId)}`, {
    method: "DELETE",
    body: {
      idempotency_key: "api_followup_delete",
      matter_id: "matter_ops_cross_source",
    },
  });
  assert.equal(deletedFollowupReplay.response.status, 200);
  assert.equal(deletedFollowupReplay.body.idempotent_replay, true);
  assert.equal(
    matterRepository
      .listAudit({ tenant_id: TENANT, object_id: followupId })
      .filter(({ action }) => action === "matter.followup.delete")
      .length,
    1,
  );

  const matterHandoff = await api("/api/matter/ops/matters/matter_ops_1/handoffs", {
    method: "POST",
    body: {
      idempotency_key: "api_matter_handoff",
      new_owner_user_id: "user_case_new",
      new_backup_user_id: ACTOR,
      note: "Primary lawyer rotation",
    },
  });
  assert.equal(matterHandoff.response.status, 200);
  assert.equal(matterHandoff.body.matter.owner_user_id, "user_case_new");
  assert.equal(matterHandoff.body.matter.backup_user_id, ACTOR);
  assert.equal(
    matterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: "matter_ops_1",
    }).owner_user_id,
    "user_case_new",
  );

  const meeting = await api("/api/matter/ops/matters/matter_ops_1/meetings", {
    method: "POST",
    body: {
      idempotency_key: "api_meeting_create",
      meeting: {
        title: "Weekly case meeting",
        attendee_ids: [ACTOR],
        decisions: ["File on Monday"],
        follow_up_task_ids: ["task_my"],
        occurred_at: NOW,
      },
    },
  });
  assert.equal(meeting.response.status, 201);
  assert.equal(meeting.body.meeting.activity_type, "meeting");
  assert.deepEqual(meeting.body.meeting.follow_up_task_ids, ["task_my"]);

  const closeout = await api("/api/matter/ops/matters/matter_ops_1/closeout");
  assert.equal(closeout.response.status, 200);
  assert.equal(closeout.body.can_close, false);
  assert.ok(closeout.body.items.some((item) => item.blocker_type === "open_task"));

  const blockedClose = await api("/api/matters/matter_ops_1/status-transitions", {
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "ui_matter_small_firm_close",
      audit_hint_ref: "api_test_matter_close_blocked",
      idempotency_key: "api_matter_close_blocked",
      target_status: "closed",
      reason: "status_complete",
    },
  });
  assert.equal(blockedClose.response.status, 422);
  assert.deepEqual(blockedClose.body.safe_error_codes, ["MATTER_CLOSEOUT_BLOCKED"]);
  assert.deepEqual(blockedClose.body.closeout, {
    can_close: false,
    guard_available: true,
    blocked_matter_ids: ["matter_ops_1"],
  });

  const allClearClose = await api("/api/matters/matter_ops_clear/status-transitions", {
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "ui_matter_small_firm_close",
      audit_hint_ref: "api_test_matter_close_allowed",
      idempotency_key: "api_matter_close_allowed",
      target_status: "closed",
      reason: "status_complete",
    },
  });
  assert.equal(allClearClose.response.status, 200);
  assert.equal(allClearClose.body.item.status, "closed");

  const restored = await api("/api/matter/ops/matters/matter_ops_archived/restore", {
    method: "POST",
    body: {
      idempotency_key: "api_matter_restore",
      target_status: "closed",
      reason: "Client reopened discussion",
    },
  });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.body.matter.status, "closed");
});

test("Matter archive list and restore are authorized, audited, and replay-safe end to end", async () => {
  const openBefore = matterRepository.snapshot();
  const openRejected = await api("/api/matter/ops/matters/matter_ops_1/archive", {
    method: "POST",
    body: {
      idempotency_key: "api_matter_archive_open_rejected",
      reason: "Must close first",
    },
  });
  assert.equal(openRejected.response.status, 422);
  assert.equal(openRejected.body.ui_state, "blocked");
  assert.deepEqual(openRejected.body.safe_error_codes, ["MATTER_ARCHIVE_REQUIRES_CLOSED"]);
  assert.deepEqual(matterRepository.snapshot(), openBefore);

  const before = await api("/api/matter/ops/matters", {
    query: { view: "archived" },
  });
  assert.equal(before.response.status, 200);
  assert.equal(
    before.body.items.some(({ matter_id }) => matter_id === "matter_ops_archive_lifecycle"),
    false,
  );

  const archiveRequest = {
    idempotency_key: "api_matter_archive_lifecycle",
    reason: "Retention lifecycle",
  };
  const archived = await api("/api/matter/ops/matters/matter_ops_archive_lifecycle/archive", {
    method: "POST",
    body: archiveRequest,
  });
  assert.equal(archived.response.status, 200);
  assert.equal(archived.body.matter.status, "archived");
  assert.equal(archived.body.matter.pre_archive_status, "closed");
  assert.equal(archived.body.matter.archived_at, NOW);

  const archiveReplay = await api("/api/matter/ops/matters/matter_ops_archive_lifecycle/archive", {
    method: "POST",
    body: archiveRequest,
  });
  assert.equal(archiveReplay.response.status, 200);
  assert.equal(archiveReplay.body.idempotent_replay, true);
  const archiveConflict = await api("/api/matter/ops/matters/matter_ops_archive_lifecycle/archive", {
    method: "POST",
    body: {
      ...archiveRequest,
      reason: "Changed retention lifecycle",
    },
  });
  assert.equal(archiveConflict.response.status, 409);
  assert.equal(archiveConflict.body.ui_state, "conflict");
  assert.deepEqual(archiveConflict.body.safe_error_codes, ["MATTER_OPS_IDEMPOTENCY_CONFLICT"]);
  assert.equal(
    matterRepository
      .listAudit({ tenant_id: TENANT, object_id: "matter_ops_archive_lifecycle" })
      .filter(({ action }) => action === "matter.archive")
      .length,
    1,
  );

  const listed = await api("/api/matter/ops/matters", {
    query: { view: "archived" },
  });
  assert.equal(listed.response.status, 200);
  assert.equal(
    listed.body.items.find(({ matter_id }) => matter_id === "matter_ops_archive_lifecycle")
      .restore_action.target_status,
    "closed",
  );
  assert.equal(listed.body.count, listed.body.items.length);

  const restored = await api("/api/matter/ops/matters/matter_ops_archive_lifecycle/restore", {
    method: "POST",
    body: {
      idempotency_key: "api_matter_archive_lifecycle_restore",
      reason: "Client returned",
    },
  });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.body.matter.status, "closed");

  const after = await api("/api/matter/ops/matters", {
    query: { view: "archived" },
  });
  assert.equal(
    after.body.items.some(({ matter_id }) => matter_id === "matter_ops_archive_lifecycle"),
    false,
  );
});

test("Matter archive API delegates closed-only validation and rolls back denied or failed writes", async () => {
  const localMatterRepository = createMatterRepository({
    filePath: join(testStateDir, "matter-archive-api-rf11.json"),
    seedRecords: [
      matterRecord({ matterId: "matter_api_archive_open", status: "open" }),
      matterRecord({ matterId: "matter_api_archive_active", status: "opening" }),
      matterRecord({ matterId: "matter_api_archive_closed", status: "closed" }),
    ],
  });
  const localFinanceRepository = createFinanceRepository({
    filePath: join(testStateDir, "finance-archive-api-rf11.json"),
  });
  const principal = {
    tenant_id: TENANT,
    user_id: ACTOR,
    role_ids: ["lawyer"],
  };
  const writeContext = {
    principal,
    rules: [{ id: "allow_archive_write", effect: "allow", action: "matter:ops:write" }],
    object_acl: [],
  };
  const call = ({ matterId, idempotencyKey, reason, context = writeContext, repository = localMatterRepository }) =>
    handleMatterSmallFirmApiRequest({
      pathname: `/api/matter/ops/matters/${matterId}/archive`,
      method: "POST",
      query: COMMON_QUERY,
      body: { idempotency_key: idempotencyKey, reason },
      context,
      requestId: `req_archive_api_rf11_${idempotencyKey}`,
      runtime: createMatterSmallFirmRuntimeContext({
        matterRepository: repository,
        financeRepository: localFinanceRepository,
        now: () => new Date(NOW),
      }),
    });

  try {
    for (const [matterId, idempotencyKey] of [
      ["matter_api_archive_open", "archive_api_open"],
      ["matter_api_archive_active", "archive_api_active"],
    ]) {
      const before = localMatterRepository.snapshot();
      const rejected = await call({
        matterId,
        idempotencyKey,
        reason: "Must close before archive",
      });
      assert.equal(rejected.status, 422);
      assert.deepEqual(rejected.body.safe_error_codes, ["MATTER_ARCHIVE_REQUIRES_CLOSED"]);
      assert.deepEqual(localMatterRepository.snapshot(), before);
    }

    const deniedContext = {
      ...writeContext,
      rules: [
        ...writeContext.rules,
        {
          id: "deny_archive_matter",
          effect: "deny",
          action: "matter:ops:write",
          ethical_wall_matter_id: "matter_api_archive_closed",
        },
      ],
    };
    const deniedBefore = localMatterRepository.snapshot();
    const denied = await call({
      matterId: "matter_api_archive_closed",
      idempotencyKey: "archive_api_denied",
      reason: "Must not archive",
      context: deniedContext,
    });
    assert.equal(denied.status, 403);
    assert.deepEqual(localMatterRepository.snapshot(), deniedBefore);

    const failingRepository = Object.freeze({
      ...localMatterRepository,
      transaction(execute) {
        return localMatterRepository.transaction((transaction) => {
          execute(transaction);
          throw new Error("simulated archive API repository failure");
        });
      },
    });
    const failedBefore = localMatterRepository.snapshot();
    const failed = await call({
      matterId: "matter_api_archive_closed",
      idempotencyKey: "archive_api_repository_failure",
      reason: "Storage failure probe",
      repository: failingRepository,
    });
    assert.equal(failed.status, 503);
    assert.equal(failed.body.ui_state, "error");
    assert.deepEqual(failed.body.safe_error_codes, ["MATTER_OPS_RUNTIME_UNAVAILABLE"]);
    assert.equal(failed.body.message, undefined);
    assert.equal(failed.body.stack, undefined);
    assert.equal(failed.rawBody, undefined);
    assert.equal(JSON.stringify(failed.body).includes("simulated archive API repository failure"), false);
    assert.deepEqual(localMatterRepository.snapshot(), failedBefore);
  } finally {
    localMatterRepository.close();
    localFinanceRepository.close();
  }
});

test("payment allocation reversal API requires a reason and returns byte-equivalent state after repository failure", async () => {
  const matterFilePath = join(testStateDir, "matter-payment-reversal-api-rollback.json");
  const financeFilePath = join(testStateDir, "finance-payment-reversal-api-rollback.json");
  const localMatterRepository = createMatterRepository({
    filePath: matterFilePath,
    seedRecords: [
      matterRecord({
        matterId: "matter_api_payment_reversal_rollback",
        status: "open",
      }),
      matterRecord({
        matterId: "matter_api_payment_reversal_hidden",
        status: "open",
      }),
    ],
  });
  const localFinanceRepository = createFinanceRepository({
    filePath: financeFilePath,
    seedRecords: [
      {
        model_type: "Invoice",
        invoice_id: "invoice_api_payment_reversal_rollback",
        invoice_number: "INV-API-REVERSAL-ROLLBACK",
        tenant_id: TENANT,
        matter_id: "matter_api_payment_reversal_rollback",
        billing_client_party_id: "client_matter_api_payment_reversal_rollback",
        amount_due: 100_000,
        amount_paid: 0,
        currency: "KRW",
        status: "sent",
        lifecycle_status: "sent",
        lifecycle_contract: "small_firm_v1",
        issued_at: "2026-07-01T00:00:00.000Z",
        sent_at: "2026-07-01T00:00:00.000Z",
        due_date: "2026-07-20",
      },
    ],
  });
  const payment = importPayment({
    repository: localFinanceRepository,
    payment: {
      payment_id: "payment_api_reversal_rollback",
      tenant_id: TENANT,
      matter_id: "matter_api_payment_reversal_rollback",
      bank_reference: "bank:api-reversal-rollback",
      amount: 100_000,
      currency: "KRW",
      received_at: NOW,
    },
    actor_id: ACTOR,
    idempotency_key: "setup_api_payment_reversal_rollback",
  }).payment;
  const applied = applyMatterPayment({
    repository: localFinanceRepository,
    tenant_id: TENANT,
    matter_id: "matter_api_payment_reversal_rollback",
    payment_id: payment.payment_id,
    invoice_id: "invoice_api_payment_reversal_rollback",
    amount: 100_000,
    payment_allocation_id: "allocation_api_reversal_rollback",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "setup_api_payment_allocation_reversal_rollback",
  });
  localFinanceRepository.create({
    model_type: "Invoice",
    invoice_id: "invoice_api_payment_reversal_hidden",
    invoice_number: "INV-API-REVERSAL-HIDDEN",
    tenant_id: TENANT,
    matter_id: "matter_api_payment_reversal_hidden",
    billing_client_party_id: "client_matter_api_payment_reversal_hidden",
    amount_due: 75_000,
    amount_paid: 0,
    currency: "KRW",
    status: "sent",
    lifecycle_status: "sent",
    lifecycle_contract: "small_firm_v1",
    issued_at: "2026-07-01T00:00:00.000Z",
    sent_at: "2026-07-01T00:00:00.000Z",
    due_date: "2026-07-20",
  });
  const hiddenPayment = importPayment({
    repository: localFinanceRepository,
    payment: {
      payment_id: "payment_api_reversal_hidden",
      tenant_id: TENANT,
      matter_id: "matter_api_payment_reversal_hidden",
      bank_reference: "bank:api-reversal-hidden",
      amount: 75_000,
      currency: "KRW",
      received_at: NOW,
    },
    actor_id: ACTOR,
    idempotency_key: "setup_api_payment_reversal_hidden",
  }).payment;
  const hiddenApplied = applyMatterPayment({
    repository: localFinanceRepository,
    tenant_id: TENANT,
    matter_id: "matter_api_payment_reversal_hidden",
    payment_id: hiddenPayment.payment_id,
    invoice_id: "invoice_api_payment_reversal_hidden",
    amount: 75_000,
    payment_allocation_id: "allocation_api_reversal_hidden",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "setup_api_payment_allocation_reversal_hidden",
  });
  localFinanceRepository.update(
    {
      tenant_id: TENANT,
      model_type: "PaymentAllocation",
      payment_allocation_id: hiddenApplied.payment_allocation.payment_allocation_id,
    },
    { matter_id: "matter_api_payment_reversal_rollback" },
  );
  localFinanceRepository.create({
    model_type: "Invoice",
    invoice_id: "invoice_api_payment_reversal_recovery",
    invoice_number: "INV-API-REVERSAL-RECOVERY",
    tenant_id: TENANT,
    matter_id: "matter_api_payment_reversal_rollback",
    billing_client_party_id: "client_matter_api_payment_reversal_rollback",
    amount_due: 60_000,
    amount_paid: 0,
    currency: "KRW",
    status: "sent",
    lifecycle_status: "sent",
    lifecycle_contract: "small_firm_v1",
    issued_at: "2026-07-01T00:00:00.000Z",
    sent_at: "2026-07-01T00:00:00.000Z",
    due_date: "2026-07-20",
  });
  const recoveryPayment = importPayment({
    repository: localFinanceRepository,
    payment: {
      payment_id: "payment_api_reversal_recovery",
      tenant_id: TENANT,
      matter_id: "matter_api_payment_reversal_rollback",
      bank_reference: "bank:api-reversal-recovery",
      amount: 60_000,
      currency: "KRW",
      received_at: NOW,
    },
    actor_id: ACTOR,
    idempotency_key: "setup_api_payment_reversal_recovery",
  }).payment;
  const recoveryApplied = applyMatterPayment({
    repository: localFinanceRepository,
    tenant_id: TENANT,
    matter_id: "matter_api_payment_reversal_rollback",
    payment_id: recoveryPayment.payment_id,
    invoice_id: "invoice_api_payment_reversal_recovery",
    amount: 60_000,
    payment_allocation_id: "allocation_api_reversal_recovery",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "setup_api_payment_allocation_reversal_recovery",
  });
  const principal = {
    tenant_id: TENANT,
    user_id: ACTOR,
    role_ids: ["lawyer"],
  };
  const writeContext = {
    principal,
    rules: [{
      id: "allow_payment_allocation_reversal",
      effect: "allow",
      action: "finance:payment_allocation:write",
    }, {
      id: "deny_hidden_payment_matter",
      effect: "deny",
      action: "finance:payment_allocation:write",
      ethical_wall_matter_id: "matter_api_payment_reversal_hidden",
    }],
    object_acl: [],
  };
  const call = ({
    body,
    financeRepository = localFinanceRepository,
    matterRepository = localMatterRepository,
    requestId,
    paymentId = payment.payment_id,
    paymentAllocationId = applied.payment_allocation.payment_allocation_id,
    runtimeNow = NOW,
  }) =>
    handleMatterSmallFirmApiRequest({
      pathname: `/api/matter/ops/payments/${paymentId}/allocations/${paymentAllocationId}/reversal`,
      method: "POST",
      query: COMMON_QUERY,
      body,
      context: writeContext,
      requestId,
      runtime: createMatterSmallFirmRuntimeContext({
        matterRepository,
        financeRepository,
        now: () => new Date(runtimeNow),
      }),
    });

  try {
    const beforeMissingReasonSnapshot = localFinanceRepository.snapshot();
    const beforeMissingReasonBytes = readFileSync(financeFilePath);
    const missingReason = await call({
      requestId: "req_payment_reversal_missing_reason",
      body: {
        idempotency_key: "api_payment_reversal_missing_reason",
        matter_id: "matter_api_payment_reversal_rollback",
      },
    });
    assert.equal(missingReason.status, 400);
    assert.equal(missingReason.body.ui_state, "blocked");
    assert.deepEqual(missingReason.body.safe_error_codes, ["MATTER_OPS_VALIDATION_ERROR"]);
    assert.deepEqual(localFinanceRepository.snapshot(), beforeMissingReasonSnapshot);
    assert.deepEqual(readFileSync(financeFilePath), beforeMissingReasonBytes);

    const beforeHiddenSnapshot = localFinanceRepository.snapshot();
    const beforeHiddenBytes = readFileSync(financeFilePath);
    const hiddenScopeMismatch = await call({
      requestId: "req_payment_reversal_hidden_matter",
      paymentId: hiddenPayment.payment_id,
      paymentAllocationId: hiddenApplied.payment_allocation.payment_allocation_id,
      body: {
        idempotency_key: "api_payment_reversal_hidden_matter",
        matter_id: "matter_api_payment_reversal_rollback",
        reason: "숨겨진 사건 원장 경계 검증",
        reversal_payment_allocation_id: "allocation_api_reversal_hidden_fault",
      },
    });
    assert.equal(hiddenScopeMismatch.status, 404);
    assert.deepEqual(
      hiddenScopeMismatch.body.safe_error_codes,
      ["MATTER_OPS_NOT_FOUND"],
    );
    assert.deepEqual(localFinanceRepository.snapshot(), beforeHiddenSnapshot);
    assert.deepEqual(readFileSync(financeFilePath), beforeHiddenBytes);
    assert.equal(
      localFinanceRepository.get({
        tenant_id: TENANT,
        model_type: "Invoice",
        invoice_id: "invoice_api_payment_reversal_hidden",
      }).amount_paid,
      75_000,
    );
    assert.equal(
      localFinanceRepository.get({
        tenant_id: TENANT,
        model_type: "Payment",
        payment_id: hiddenPayment.payment_id,
      }).allocated_amount,
      75_000,
    );

    const matterReceiptFailureRepository = Object.freeze({
      ...localMatterRepository,
      recordIdempotency() {
        throw new Error("simulated Matter API receipt failure");
      },
    });
    const beforeRecoveryMatterSnapshot = localMatterRepository.snapshot();
    const beforeRecoveryMatterBytes = readFileSync(matterFilePath);
    const recoveryRequest = {
      idempotency_key: "api_payment_reversal_domain_recovery",
      matter_id: "matter_api_payment_reversal_rollback",
      reason: "Matter 영수증 장애 복구 검증",
      reversal_payment_allocation_id: "allocation_api_reversal_recovery_entry",
    };
    const recovered = await call({
      requestId: "req_payment_reversal_domain_recovery",
      matterRepository: matterReceiptFailureRepository,
      paymentId: recoveryPayment.payment_id,
      paymentAllocationId: recoveryApplied.payment_allocation.payment_allocation_id,
      body: recoveryRequest,
      runtimeNow: "2026-07-31T14:59:00.000Z",
    });
    assert.equal(recovered.status, 200);
    assert.equal(recovered.body.idempotent_replay, false);
    assert.equal(recovered.body.invoice.amount_paid, 0);
    assert.equal(recovered.body.payment.allocated_amount, 0);
    assert.equal(recovered.body.ar_balance.balance, 60_000);
    assert.equal(recovered.body.ar_queue.as_of_date, "2026-07-31");
    assert.deepEqual(localMatterRepository.snapshot(), beforeRecoveryMatterSnapshot);
    assert.deepEqual(readFileSync(matterFilePath), beforeRecoveryMatterBytes);
    const afterRecoveredFinanceSnapshot = localFinanceRepository.snapshot();
    const afterRecoveredFinanceBytes = readFileSync(financeFilePath);

    const recoveredReplay = await call({
      requestId: "req_payment_reversal_domain_recovery_replay",
      matterRepository: matterReceiptFailureRepository,
      paymentId: recoveryPayment.payment_id,
      paymentAllocationId: recoveryApplied.payment_allocation.payment_allocation_id,
      body: recoveryRequest,
      runtimeNow: "2026-07-31T15:01:00.000Z",
    });
    assert.equal(recoveredReplay.status, 200);
    assert.equal(recoveredReplay.body.idempotent_replay, true);
    assert.equal(recoveredReplay.body.ar_queue.as_of_date, "2026-07-31");
    assert.deepEqual(localFinanceRepository.snapshot(), afterRecoveredFinanceSnapshot);
    assert.deepEqual(readFileSync(financeFilePath), afterRecoveredFinanceBytes);
    assert.deepEqual(localMatterRepository.snapshot(), beforeRecoveryMatterSnapshot);
    assert.deepEqual(readFileSync(matterFilePath), beforeRecoveryMatterBytes);

    const explicitDateConflict = await call({
      requestId: "req_payment_reversal_domain_recovery_explicit_date",
      matterRepository: matterReceiptFailureRepository,
      paymentId: recoveryPayment.payment_id,
      paymentAllocationId: recoveryApplied.payment_allocation.payment_allocation_id,
      body: {
        ...recoveryRequest,
        as_of_date: "2026-08-01",
      },
      runtimeNow: "2026-07-31T15:01:00.000Z",
    });
    assert.equal(explicitDateConflict.status, 409);
    assert.deepEqual(
      explicitDateConflict.body.safe_error_codes,
      ["IDEMPOTENCY_CONFLICT"],
    );
    assert.deepEqual(localFinanceRepository.snapshot(), afterRecoveredFinanceSnapshot);
    assert.deepEqual(readFileSync(financeFilePath), afterRecoveredFinanceBytes);
    assert.deepEqual(localMatterRepository.snapshot(), beforeRecoveryMatterSnapshot);
    assert.deepEqual(readFileSync(matterFilePath), beforeRecoveryMatterBytes);

    let mutationProbe;
    const failingFinanceRepository = Object.freeze({
      ...localFinanceRepository,
      transaction(execute) {
        return localFinanceRepository.transaction((transaction) => {
          const result = execute(transaction);
          mutationProbe = {
            reversal_count: transaction.list({
              tenant_id: TENANT,
              model_type: "PaymentAllocation",
            }).filter((row) =>
              row.reverses_payment_allocation_id === applied.payment_allocation.payment_allocation_id
            ).length,
            invoice_paid: transaction.get({
              tenant_id: TENANT,
              model_type: "Invoice",
              invoice_id: "invoice_api_payment_reversal_rollback",
            }).amount_paid,
            payment_allocated: transaction.get({
              tenant_id: TENANT,
              model_type: "Payment",
              payment_id: payment.payment_id,
            }).allocated_amount,
            ar_balance: transaction.list({
              tenant_id: TENANT,
              model_type: "ARBalance",
              invoice_id: "invoice_api_payment_reversal_rollback",
            })[0].balance,
          };
          assert.ok(result);
          throw new Error("simulated payment reversal repository failure");
        });
      },
    });
    const beforeFinanceSnapshot = localFinanceRepository.snapshot();
    const beforeMatterSnapshot = localMatterRepository.snapshot();
    const beforeFinanceBytes = readFileSync(financeFilePath);
    const beforeMatterBytes = readFileSync(matterFilePath);
    const failed = await call({
      requestId: "req_payment_reversal_repository_failure",
      financeRepository: failingFinanceRepository,
      body: {
        idempotency_key: "api_payment_reversal_repository_failure",
        matter_id: "matter_api_payment_reversal_rollback",
        reason: "저장소 장애 원자성 검증",
        reversal_payment_allocation_id: "allocation_api_reversal_rollback_fault",
      },
    });
    assert.equal(failed.status, 503);
    assert.equal(failed.body.ui_state, "error");
    assert.deepEqual(failed.body.safe_error_codes, ["MATTER_OPS_RUNTIME_UNAVAILABLE"]);
    assert.deepEqual(mutationProbe, {
      reversal_count: 1,
      invoice_paid: 0,
      payment_allocated: 0,
      ar_balance: 100_000,
    });
    assert.equal(failed.body.message, undefined);
    assert.equal(failed.body.stack, undefined);
    assert.equal(
      JSON.stringify(failed.body).includes("simulated payment reversal repository failure"),
      false,
    );
    assert.deepEqual(localFinanceRepository.snapshot(), beforeFinanceSnapshot);
    assert.deepEqual(localMatterRepository.snapshot(), beforeMatterSnapshot);
    assert.deepEqual(readFileSync(financeFilePath), beforeFinanceBytes);
    assert.deepEqual(readFileSync(matterFilePath), beforeMatterBytes);
  } finally {
    localMatterRepository.close();
    localFinanceRepository.close();
  }
});

test("time, WIP, invoice, payment, and AR mutations use finance services without leaking bank references", async () => {
  const quickTime = await api("/api/matter/ops/time-entries", {
    method: "POST",
    body: {
      idempotency_key: "api_quick_time",
      time_entry: {
        matter_id: "matter_ops_1",
        role_id: "partner",
        work_date: "2026-07-30",
        duration_minutes: 25,
        narrative: "Draft response",
        billable: true,
        status: "approved",
        approved_for_wip: true,
        actor_id: "attacker_supplied_actor",
      },
    },
  });
  assert.equal(quickTime.response.status, 201);
  assert.equal(quickTime.body.item.status, "draft");
  assert.equal(quickTime.body.item.approved_for_wip, false);
  assert.equal(quickTime.body.item.actor_id, ACTOR);
  const quickTimeEntryId = quickTime.body.item.time_entry_id;

  const submittedWeek = await api("/api/matter/ops/time-weeks/submit", {
    method: "POST",
    body: {
      idempotency_key: "api_time_week_submit",
      week_start: "2026-07-27",
      time_entry_ids: [quickTimeEntryId],
    },
  });
  assert.equal(submittedWeek.response.status, 200);
  assert.equal(submittedWeek.body.items[0].status, "submitted");

  const lockedWeek = await api("/api/matter/ops/time-weeks/lock", {
    method: "POST",
    body: {
      idempotency_key: "api_time_week_lock",
      week_start: "2026-07-27",
      time_entry_ids: [quickTimeEntryId],
      grace_minutes: 15,
    },
  });
  assert.equal(lockedWeek.response.status, 200);
  assert.equal(lockedWeek.body.items[0].status, "locked");
  assert.equal(lockedWeek.body.items[0].approved_for_wip, true);

  const unlockedWeek = await api("/api/matter/ops/time-weeks/unlock", {
    method: "POST",
    body: {
      idempotency_key: "api_time_week_unlock",
      week_start: "2026-07-27",
      time_entry_ids: [quickTimeEntryId],
      reason: "Correct narrative",
      grace_minutes: 15,
    },
  });
  assert.equal(unlockedWeek.response.status, 200);
  assert.equal(unlockedWeek.body.items[0].locked_at, null);

  const tenantlessSourceRejected = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "generate",
      idempotency_key: "api_wip_tenantless_source_rejected",
      matter_id: "matter_ops_1",
      source_items: [{
        model_type: "TimeEntry",
        time_entry_id: "time_api_wip",
        matter_id: "matter_ops_1",
        status: "approved",
      }],
      fee_arrangement_id: "fee_ops",
    },
  });
  assert.equal(tenantlessSourceRejected.response.status, 400);

  const crossTenantSourceRejected = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "generate",
      idempotency_key: "api_wip_cross_tenant_rejected",
      matter_id: "matter_ops_1",
      source_refs: [{ model_type: "TimeEntry", source_id: "time_cross_tenant" }],
      fee_arrangement_id: "fee_ops",
    },
  });
  assert.equal(crossTenantSourceRejected.response.status, 400);

  const crossMatterSourceRejected = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "generate",
      idempotency_key: "api_wip_cross_matter_rejected",
      matter_id: "matter_ops_1",
      source_refs: [{ model_type: "TimeEntry", source_id: "time_cross_matter" }],
      fee_arrangement_id: "fee_ops",
    },
  });
  assert.equal(crossMatterSourceRejected.response.status, 400);

  const forgedPricingRejected = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "generate",
      idempotency_key: "api_wip_forged_pricing_rejected",
      matter_id: "matter_ops_1",
      source_refs: [{ model_type: "TimeEntry", source_id: "time_api_wip" }],
      fee_arrangement_id: "fee_ops",
      rate_card: {
        rate_card_id: "rate_forged",
        role_rates: [{ role_id: "partner", hourly_rate: 1 }],
      },
    },
  });
  assert.equal(forgedPricingRejected.response.status, 400);

  const mismatchedRateSelectionRejected = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "generate",
      idempotency_key: "api_wip_rate_selection_rejected",
      matter_id: "matter_ops_1",
      source_refs: [{ model_type: "TimeEntry", source_id: "time_api_wip" }],
      fee_arrangement_id: "fee_ops",
      rate_card_id: "rate_forged",
    },
  });
  assert.equal(mismatchedRateSelectionRejected.response.status, 400);

  const generatedWip = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "generate",
      idempotency_key: "api_wip_generate",
      matter_id: "matter_ops_1",
      source_refs: [{ model_type: "TimeEntry", source_id: "time_api_wip" }],
      fee_arrangement_id: "fee_ops",
      rate_card_id: "rate_ops",
    },
  });
  assert.equal(generatedWip.response.status, 201);
  assert.equal(generatedWip.body.wip_items.length, 1);
  assert.equal(generatedWip.body.wip_items[0].amount, 50_000);

  const apiPrebill = await api("/api/matter/ops/wip", {
    method: "POST",
    body: {
      action: "prebill",
      idempotency_key: "api_wip_prebill",
      matter_id: "matter_ops_1",
      wip_item_ids: generatedWip.body.wip_items.map((item) => item.wip_item_id),
      prebill: {
        prebill_id: "prebill_api_wip",
        partner_reviewer_id: ACTOR,
        currency: "KRW",
      },
    },
  });
  assert.equal(apiPrebill.response.status, 201);
  assert.equal(apiPrebill.body.wip_snapshot.immutable_snapshot, true);

  const invoiceCreated = await api("/api/matter/ops/invoices", {
    method: "POST",
    body: {
      idempotency_key: "api_invoice_create",
      invoice: {
        invoice_id: "invoice_api",
        matter_id: "matter_ops_1",
        prebill_id: "prebill_ready",
        billing_client_party_id: "client_matter_ops_1",
        currency: "KRW",
      },
    },
  });
  assert.equal(invoiceCreated.response.status, 201);
  assert.equal(invoiceCreated.body.invoice.lifecycle_status, "draft");

  const invoiceSent = await api("/api/matter/ops/invoices/invoice_api/lifecycle", {
    method: "PATCH",
    body: {
      idempotency_key: "api_invoice_send",
      matter_id: "matter_ops_1",
      to_status: "sent",
      transition_at: NOW,
    },
  });
  assert.equal(invoiceSent.response.status, 200);
  assert.equal(invoiceSent.body.invoice.lifecycle_status, "sent");

  const imported = await api("/api/matter/ops/payments", {
    method: "POST",
    body: {
      idempotency_key: "api_payment_import",
      payment: {
        payment_id: "payment_api",
        matter_id: "matter_ops_1",
        bank_reference: "bank:must-not-leak",
        amount: 50_000,
        currency: "KRW",
        received_at: NOW,
      },
    },
  });
  assert.equal(imported.response.status, 201);
  assert.equal(imported.body.payment.bank_reference, undefined);
  assert.equal(imported.body.bank_reference_included, false);

  const allocated = await api("/api/matter/ops/payments/payment_api/allocations", {
    method: "POST",
    body: {
      idempotency_key: "api_payment_allocate",
      matter_id: "matter_ops_1",
      invoice_id: "invoice_api",
      amount: 50_000,
      as_of_date: "2026-07-30",
    },
  });
  assert.equal(allocated.response.status, 201);
  assert.equal(allocated.body.invoice.lifecycle_status, "partial");
  assert.equal(allocated.body.payment.bank_reference, undefined);
  const allocationId = allocated.body.payment_allocation.payment_allocation_id;

  const beforeDenied = financeRepository.snapshot();
  const deniedReversal = await api(
    `/api/matter/ops/payments/payment_api/allocations/${encodeURIComponent(allocationId)}/reversal`,
    {
      method: "POST",
      headers: readOnlyHeaders,
      body: {
        idempotency_key: "api_payment_reversal_denied",
        matter_id: "matter_ops_1",
        reason: "권한 없는 취소",
      },
    },
  );
  assert.equal(deniedReversal.response.status, 403);
  assert.deepEqual(financeRepository.snapshot(), beforeDenied);

  const crossMatterReversal = await api(
    `/api/matter/ops/payments/payment_api/allocations/${encodeURIComponent(allocationId)}/reversal`,
    {
      method: "POST",
      body: {
        idempotency_key: "api_payment_reversal_cross_matter",
        matter_id: "matter_ops_cross_source",
        reason: "다른 사건에서 취소 시도",
      },
    },
  );
  assert.equal(crossMatterReversal.response.status, 404);
  assert.deepEqual(
    crossMatterReversal.body.safe_error_codes,
    ["MATTER_OPS_NOT_FOUND"],
  );
  assert.deepEqual(financeRepository.snapshot(), beforeDenied);

  const reversalRequest = {
    idempotency_key: "api_payment_reversal",
    matter_id: "matter_ops_1",
    reason: "중복 입금 배정 정정",
    reversal_payment_allocation_id: "allocation_api_reversal",
    amount: 1,
    currency: "USD",
    invoice_id: "invoice_forged",
  };
  const reversed = await api(
    `/api/matter/ops/payments/payment_api/allocations/${encodeURIComponent(allocationId)}/reversal`,
    { method: "POST", body: reversalRequest },
  );
  assert.equal(reversed.response.status, 200);
  assert.deepEqual(
    {
      matter_id: reversed.body.reversed_allocation.matter_id,
      payment_id: reversed.body.reversed_allocation.payment_id,
      invoice_id: reversed.body.reversed_allocation.invoice_id,
      amount: reversed.body.reversed_allocation.amount,
      currency: reversed.body.reversed_allocation.currency,
      reason_code: reversed.body.reversed_allocation.reason_code,
    },
    {
      matter_id: "matter_ops_1",
      payment_id: "payment_api",
      invoice_id: "invoice_api",
      amount: 50_000,
      currency: "KRW",
      reason_code: "중복 입금 배정 정정",
    },
  );
  assert.equal(reversed.body.invoice.amount_paid, 0);
  assert.equal(reversed.body.payment.allocated_amount, 0);
  assert.equal(reversed.body.ar_balance.balance, 100_000);
  assert.equal(reversed.body.ar_balance.status, "open");
  assert.equal(reversed.body.ar_queue.totals.bucket_current, 100_000);

  const reloadedBilling = await api("/api/matter/ops/time-billing", {
    query: { matter_id: "matter_ops_1", as_of_date: "2026-07-30" },
  });
  assert.equal(reloadedBilling.response.status, 200);
  assert.equal(reloadedBilling.body.item.ar.totals.bucket_current, 100_000);
  assert.equal(
    reloadedBilling.body.item.payment_allocations.filter(
      (row) => row.reverses_payment_allocation_id === allocationId,
    ).length,
    1,
  );

  const replayedReversal = await api(
    `/api/matter/ops/payments/payment_api/allocations/${encodeURIComponent(allocationId)}/reversal`,
    { method: "POST", body: reversalRequest },
  );
  assert.equal(replayedReversal.response.status, 200);
  assert.equal(replayedReversal.body.idempotent_replay, true);

  const reallocated = await api("/api/matter/ops/payments/payment_api/allocations", {
    method: "POST",
    body: {
      idempotency_key: "api_payment_reallocate_after_reversal",
      matter_id: "matter_ops_1",
      invoice_id: "invoice_api",
      amount: 10_000,
      as_of_date: "2026-07-30",
    },
  });
  assert.equal(reallocated.response.status, 201);
  const beforePathIdentityConflict = financeRepository.snapshot();
  const pathIdentityConflict = await api(
    `/api/matter/ops/payments/payment_api/allocations/${encodeURIComponent(reallocated.body.payment_allocation.payment_allocation_id)}/reversal`,
    { method: "POST", body: reversalRequest },
  );
  assert.equal(pathIdentityConflict.response.status, 409);
  assert.deepEqual(
    pathIdentityConflict.body.safe_error_codes,
    ["IDEMPOTENCY_CONFLICT"],
  );
  assert.deepEqual(financeRepository.snapshot(), beforePathIdentityConflict);

  const beforeConflict = financeRepository.snapshot();
  const conflictReversal = await api(
    `/api/matter/ops/payments/payment_api/allocations/${encodeURIComponent(allocationId)}/reversal`,
    {
      method: "POST",
      body: { ...reversalRequest, reason: "다른 취소 사유" },
    },
  );
  assert.equal(conflictReversal.response.status, 409);
  assert.deepEqual(financeRepository.snapshot(), beforeConflict);

  const paymentRows = await api("/api/matter/ops/payments", {
    query: { matter_id: "matter_ops_1" },
  });
  assert.equal(paymentRows.response.status, 200);
  assert.equal(JSON.stringify(paymentRows.body).includes("must-not-leak"), false);
});

test("fully paid API billing lineage clears the Matter closeout guard", async () => {
  const invoiceCreated = await api("/api/matter/ops/invoices", {
    method: "POST",
    body: {
      idempotency_key: "api_closeout_invoice_create",
      invoice: {
        invoice_id: "invoice_closeout_paid",
        matter_id: "matter_ops_billed_clear",
        prebill_id: "prebill_closeout_ready",
        billing_client_party_id: "client_matter_ops_billed_clear",
        currency: "KRW",
      },
    },
  });
  assert.equal(invoiceCreated.response.status, 201);
  assert.equal(invoiceCreated.body.invoice.amount_due, 100_000);

  const invoiceSent = await api("/api/matter/ops/invoices/invoice_closeout_paid/lifecycle", {
    method: "PATCH",
    body: {
      idempotency_key: "api_closeout_invoice_send",
      to_status: "sent",
      transition_at: NOW,
    },
  });
  assert.equal(invoiceSent.response.status, 200);

  const paymentImported = await api("/api/matter/ops/payments", {
    method: "POST",
    body: {
      idempotency_key: "api_closeout_payment_import",
      payment: {
        payment_id: "payment_closeout_paid",
        matter_id: "matter_ops_billed_clear",
        bank_reference: "bank:closeout-paid",
        amount: 100_000,
        currency: "KRW",
        received_at: NOW,
      },
    },
  });
  assert.equal(paymentImported.response.status, 201);

  const paymentApplied = await api("/api/matter/ops/payments/payment_closeout_paid/allocations", {
    method: "POST",
    body: {
      idempotency_key: "api_closeout_payment_apply",
      matter_id: "matter_ops_billed_clear",
      invoice_id: "invoice_closeout_paid",
      amount: 100_000,
      as_of_date: "2026-07-30",
    },
  });
  assert.equal(paymentApplied.response.status, 201);
  assert.equal(paymentApplied.body.invoice.lifecycle_status, "paid");

  const closeout = await api("/api/matter/ops/matters/matter_ops_billed_clear/closeout");
  assert.equal(closeout.response.status, 200);
  assert.equal(closeout.body.can_close, true);
  assert.deepEqual(closeout.body.items, []);

  const closed = await api("/api/matters/matter_ops_billed_clear/status-transitions", {
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "ui_matter_small_firm_close",
      audit_hint_ref: "api_test_paid_matter_close",
      idempotency_key: "api_matter_paid_close",
      target_status: "closed",
      reason: "status_complete",
      time_zone: "Asia/Seoul",
    },
  });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.body.item.status, "closed");
});

test("CSV is raw text/csv and uses the same weekly-report lane counts as GET today", async () => {
  const today = await api("/api/matter/ops/today");
  const csv = await api("/api/matter/ops/report.csv");
  assert.equal(csv.response.status, 200);
  assert.equal(csv.contentType, "text/csv; charset=utf-8");
  assert.match(csv.body, /^row_type,question_id,question,count,/);
  assert.equal(csv.body.startsWith("\""), false);
  const overdue = csv.body
    .split("\r\n")
    .find((line) => line.startsWith("question,overdue_deadlines,"));
  assert.ok(overdue);
  assert.equal(Number(overdue.split(",")[3]), today.body.item.by_id.overdue.count);
  assert.equal(csv.response.headers.get("x-lawos-report-row-count"), "7");
});

test("repository read failures return explicit 503/error rather than a false empty state", async () => {
  const healthyMatterRepository = createMatterRepository({
    seedRecords: [matterRecord({ matterId: "matter_error_probe" })],
  });
  const localFinanceRepository = createFinanceRepository();
  const brokenRepository = Object.freeze({
    ...healthyMatterRepository,
    list() {
      throw new Error("simulated repository outage");
    },
  });
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository: brokenRepository,
    financeRepository: localFinanceRepository,
    now: () => new Date(NOW),
  });
  try {
    for (const pathname of ["/api/matter/ops/today", "/api/matter/ops/report.csv"]) {
      const result = await handleMatterSmallFirmApiRequest({
        pathname,
        method: "GET",
        query: COMMON_QUERY,
        body: {},
        context: {
          principal: { tenant_id: TENANT, user_id: ACTOR, role_ids: ["administrator"] },
          rules: [{ id: "allow_test", effect: "allow", action: "*" }],
          object_acl: [],
        },
        requestId: `req_repository_error_${pathname.endsWith(".csv") ? "csv" : "today"}`,
        runtime,
      });
      assert.equal(result.status, 503);
      assert.equal(result.body.ui_state, "error");
      assert.deepEqual(result.body.items, []);
      assert.deepEqual(result.body.safe_error_codes, ["MATTER_OPS_RUNTIME_UNAVAILABLE"]);
      assert.equal(result.rawBody, undefined);
    }
  } finally {
    healthyMatterRepository.close();
    localFinanceRepository.close();
  }
});
