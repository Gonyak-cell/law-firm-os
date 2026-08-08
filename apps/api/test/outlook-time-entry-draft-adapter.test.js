import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import {
  OUTLOOK_ADDIN_BOUNDED_CONTEXT,
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";
import {
  OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES,
  OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH,
} from "../src/outlook-time-entry-draft-adapter.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_outlook_time_entry_test";
const MATTER = "matter_outlook_time_entry_test";
const ACTOR = "user_outlook_time_entry_test";

function permissionContext({ finance = true, matter = true } = {}) {
  return Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT,
      user_id: ACTOR,
      actor_id: ACTOR,
      role_ids: Object.freeze(["outlook_addin_user"]),
      scopes: Object.freeze(["matter.read", "finance.time.write"]),
    }),
    rules: Object.freeze([
      ...(matter ? [Object.freeze({
        id: "outlook-time-entry-matter-read",
        effect: "allow",
        action: "outlook:matter:read",
      })] : []),
      ...(finance ? [Object.freeze({
        id: "outlook-time-entry-finance-write",
        effect: "allow",
        action: "finance:time:write",
      })] : []),
    ]),
    object_acl: Object.freeze([]),
  });
}

function matterRepository() {
  return createMatterRepository({
    seedRecords: [{
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      matter_code: "OUTLOOK/TIME/001",
      client_id: "client_outlook_time_entry_test",
      title: "Outlook time-entry draft test",
      status: "open",
      created_by: ACTOR,
      created_at: "2026-08-08T00:00:00.000Z",
      permission_envelope_id: "perm:outlook:time-entry",
      audit_trace_id: "audit:outlook:time-entry",
    }],
  });
}

function employee(overrides = {}) {
  return Object.freeze({
    tenant_id: TENANT,
    user_id: ACTOR,
    employee_id: "employee_outlook_time_entry_test",
    status: "active",
    payroll_category: "partner",
    ...overrides,
  });
}

function runtime({ financeRepository, matters, employees = [employee()] }) {
  return Object.freeze({
    financeRuntime: Object.freeze({
      repository: financeRepository,
      matterRepository: matters,
      employees: Object.freeze([...employees]),
    }),
    matterRuntime: Object.freeze({ repository: matters }),
  });
}

function requestBody(overrides = {}) {
  return {
    tenant_id: TENANT,
    actor_id: "browser-spoofed-actor",
    audit_hint_ref: "audit:outlook:time-entry-request",
    idempotency_key: "outlook-time-entry-draft-001",
    matter_id: MATTER,
    work_date: "2026-08-08",
    narrative: "상대방 이메일 검토 및 대응 방향 정리",
    duration_minutes: 30,
    billable: true,
    item_context_key: "outlook-item-context-001",
    internet_message_id: "<outlook-time-entry-001@amic.kr>",
    conversation_id: "outlook-conversation-001",
    ...overrides,
  };
}

function invoke({ body = requestBody(), context = permissionContext(), runtime: routeRuntime }) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/time-entry-drafts",
    method: "POST",
    body,
    context,
    requestId: "request-outlook-time-entry-test",
    runtime: routeRuntime,
  });
}

test("Outlook adapter creates one finance draft, replays it, rejects changed payload, and reads it after restart", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-outlook-time-entry-"));
  const filePath = join(dir, "finance.json");
  const matters = matterRepository();
  let finance = createFinanceRepository({ filePath });
  t.after(() => {
    try { finance.close(); } catch {}
    matters.close();
  });

  const first = await invoke({
    runtime: runtime({ financeRepository: finance, matters }),
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.outcome, "created");
  assert.equal(first.body.copyable_time_entry_id, first.body.item.time_entry_id);
  assert.equal(first.body.item.tenant_id, TENANT);
  assert.equal(first.body.item.actor_id, ACTOR);
  assert.equal(first.body.item.role_id, "partner");
  assert.equal(first.body.item.matter_id, MATTER);
  assert.equal(first.body.item.status, "draft");
  assert.equal(first.body.item.approved_for_wip, false);
  assert.equal(first.body.item.duration_minutes, 30);
  assert.equal(first.body.item.billable, true);
  assert.equal(first.body.item.source_email_ref.item_context_key, "outlook-item-context-001");
  assert.match(first.body.item.source_ref, /^OutlookEmail:[a-f0-9]{64}$/u);
  assert.equal(first.body.safe_error_codes.length, 0);

  const replay = await invoke({
    runtime: runtime({ financeRepository: finance, matters }),
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.copyable_time_entry_id, first.body.copyable_time_entry_id);
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 1);
  const audit = finance.listAudit({ tenant_id: TENANT, object_id: first.body.item.time_entry_id });
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actor_id, ACTOR);
  assert.equal(audit[0].action, "time.entry.create");
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "WipItem" }).length, 0);
  assert.equal(audit.some((event) => event.action === "time.entry.approve_for_wip"), false);
  const idempotency = finance.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: requestBody().idempotency_key,
  });
  assert.equal(idempotency.operation, "time_entry_create");
  assert.match(idempotency.request_fingerprint, /^[a-f0-9]{64}$/u);

  const conflict = await invoke({
    body: requestBody({ duration_minutes: 45 }),
    runtime: runtime({ financeRepository: finance, matters }),
  });
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.idempotency_conflict,
  ]);
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 1);

  finance.close();
  finance = createFinanceRepository({ filePath });
  const afterRestart = await invoke({
    runtime: runtime({ financeRepository: finance, matters }),
  });
  assert.equal(afterRestart.status, 200);
  assert.equal(afterRestart.body.outcome, "idempotent_replay");
  assert.equal(afterRestart.body.item.time_entry_id, first.body.item.time_entry_id);
  assert.equal(
    finance.get({
      tenant_id: TENANT,
      model_type: "TimeEntry",
      time_entry_id: first.body.item.time_entry_id,
    }).approved_for_wip,
    false,
  );
});

test("Outlook adapter fails closed for invalid, unauthorized, or browser-controlled finance fields", async (t) => {
  const matters = matterRepository();
  const finance = createFinanceRepository();
  t.after(() => {
    finance.close();
    matters.close();
  });
  const routeRuntime = runtime({ financeRepository: finance, matters });
  const invalidCases = [
    requestBody({ matter_id: "" }),
    requestBody({ duration_minutes: 0 }),
    requestBody({ duration_minutes: -30 }),
    requestBody({ duration_minutes: 1.5 }),
    requestBody({ duration_minutes: "30" }),
    requestBody({ narrative: "첫 줄\n둘째 줄" }),
    requestBody({ narrative: "가".repeat(OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH + 1) }),
    requestBody({ billable: "true" }),
    requestBody({ work_date: "2026-02-30" }),
    requestBody({ item_context_key: "" }),
    requestBody({ status: "approved" }),
    requestBody({ approved_for_wip: true }),
    requestBody({ role_id: "partner" }),
    requestBody({ hourly_rate: 999999 }),
  ];
  for (const body of invalidCases) {
    const result = await invoke({ body, runtime: routeRuntime });
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.deepEqual(result.body.safe_error_codes, [
      OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.invalid,
    ]);
  }

  const foreignTenant = await invoke({
    body: requestBody({ tenant_id: "tenant_foreign" }),
    runtime: routeRuntime,
  });
  assert.equal(foreignTenant.status, 403);
  assert.deepEqual(foreignTenant.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.tenant_mismatch,
  ]);

  const denied = await invoke({
    context: permissionContext({ finance: false }),
    runtime: routeRuntime,
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.denied,
  ]);
  assert.equal(denied.body.permission_decision, undefined);

  const matterDenied = await invoke({
    context: permissionContext({ matter: false }),
    runtime: routeRuntime,
  });
  assert.equal(matterDenied.status, 403);
  assert.deepEqual(matterDenied.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.denied,
  ]);

  const missingMatter = await invoke({
    body: requestBody({ matter_id: "matter_missing" }),
    runtime: routeRuntime,
  });
  assert.equal(missingMatter.status, 404);
  assert.deepEqual(missingMatter.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.matter_not_found,
  ]);

  const missingRole = await invoke({
    runtime: runtime({ financeRepository: finance, matters, employees: [] }),
  });
  assert.equal(missingRole.status, 422);
  assert.deepEqual(missingRole.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.role_required,
  ]);
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 0);
});

test("Outlook adapter reports retryable persistence failure and never imports an approval writer", async (t) => {
  const matters = matterRepository();
  t.after(() => matters.close());
  const failingRepository = {
    getIdempotency() { return null; },
    transaction() { throw new Error("synthetic offline finance store"); },
  };
  const result = await invoke({
    runtime: runtime({
      financeRepository: failingRepository,
      matters,
    }),
  });
  assert.equal(result.status, 503);
  assert.equal(result.body.retryable, true);
  assert.deepEqual(result.body.safe_error_codes, [
    OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES.persistence_unavailable,
  ]);

  const source = readFileSync(
    new URL("../src/outlook-time-entry-draft-adapter.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /approveTimeEntryForWip|finance\/time-entries\/approve/u);
  assert.equal(
    OUTLOOK_ADDIN_BOUNDED_CONTEXT.endpoints.includes(
      "POST /api/outlook/time-entry-drafts",
    ),
    true,
  );
  const postgresAuthoritySource = readFileSync(
    new URL("../src/postgres-api-runtime-authority.js", import.meta.url),
    "utf8",
  );
  assert.match(
    postgresAuthoritySource,
    /OUTLOOK_IDEMPOTENT_MUTATION_PATHS[\s\S]*"\/api\/outlook\/time-entry-drafts"/u,
  );
});

test("HTTP route injects Finance runtime and keeps the signed actor authoritative", async (t) => {
  const matters = matterRepository();
  const finance = createFinanceRepository();
  const context = permissionContext();
  const started = await startApiServer({
    port: 0,
    matterRuntime: { repository: matters },
    financeRuntime: runtime({ financeRepository: finance, matters }).financeRuntime,
    sessionAuth: {
      async resolvePermissionContextFromHeaders(headers) {
        if (headers.authorization !== "Bearer outlook-time-entry-session") {
          return Object.freeze({ ok: false, status: 401 });
        }
        return Object.freeze({
          ok: true,
          principal: context.principal,
          context,
          token_payload: Object.freeze({ surface: "outlook_addin" }),
        });
      },
    },
  });
  t.after(async () => {
    await new Promise((resolve) => started.server.close(resolve));
    finance.close();
    matters.close();
  });

  const response = await fetch(
    `http://${started.host}:${started.port}/api/outlook/time-entry-drafts`,
    {
      method: "POST",
      headers: {
        authorization: "Bearer outlook-time-entry-session",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody()),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.item.actor_id, ACTOR);
  assert.notEqual(body.item.actor_id, "browser-spoofed-actor");
  assert.equal(body.item.status, "draft");
  assert.equal(body.item.approved_for_wip, false);
});
