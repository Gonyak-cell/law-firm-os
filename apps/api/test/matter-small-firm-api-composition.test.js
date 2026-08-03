import assert from "node:assert/strict";
import test from "node:test";
import {
  MATTER_SMALL_FIRM_OPS_CATALOG_VALIDATION,
  MATTER_SMALL_FIRM_OPS_ENDPOINTS,
  MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG,
  createMatterSmallFirmOpsRouteResolver,
  resolveMatterSmallFirmOpsRoute,
  validateMatterSmallFirmOpsCatalog,
} from "../src/matter-small-firm-api-catalog.js";
import {
  handleMatterSmallFirmApiRequest,
} from "../src/matter-small-firm-api.js";
import {
  createMatterSmallFirmRuntimeContext,
} from "../src/matter-small-firm-runtime-context.js";
const EXPECTED_ENDPOINTS = [
  "GET /api/matter/ops/today",
  "GET /api/matter/ops/tasks",
  "POST /api/matter/ops/tasks",
  "PATCH /api/matter/ops/tasks/:task_id",
  "GET /api/matter/ops/calendar",
  "GET /api/matter/ops/deadlines",
  "POST /api/matter/ops/deadlines",
  "PATCH /api/matter/ops/deadlines/:deadline_id",
  "GET /api/matter/ops/deadlines/:deadline_id/history",
  "GET /api/matter/ops/matters",
  "GET /api/matter/ops/matters/:matter_id",
  "POST /api/matter/ops/matters/:matter_id/archive",
  "GET /api/matter/ops/matters/:matter_id/closeout",
  "POST /api/matter/ops/matters/:matter_id/handoffs",
  "POST /api/matter/ops/matters/:matter_id/meetings",
  "POST /api/matter/ops/matters/:matter_id/restore",
  "GET /api/matter/ops/followups",
  "POST /api/matter/ops/followups",
  "GET /api/matter/ops/followups/:followup_id",
  "PATCH /api/matter/ops/followups/:followup_id",
  "DELETE /api/matter/ops/followups/:followup_id",
  "GET /api/matter/ops/followups/contacts",
  "POST /api/matter/ops/followups/contacts",
  "POST /api/matter/ops/followups/:followup_id/convert-to-task",
  "POST /api/matter/ops/followups/:followup_id/handoffs",
  "GET /api/matter/ops/time-billing",
  "GET /api/matter/ops/time-entries",
  "POST /api/matter/ops/time-entries",
  "POST /api/matter/ops/time-weeks/submit",
  "POST /api/matter/ops/time-weeks/lock",
  "POST /api/matter/ops/time-weeks/unlock",
  "GET /api/matter/ops/wip",
  "POST /api/matter/ops/wip",
  "GET /api/matter/ops/invoices",
  "POST /api/matter/ops/invoices",
  "PATCH /api/matter/ops/invoices/:invoice_id/lifecycle",
  "GET /api/matter/ops/payments",
  "POST /api/matter/ops/payments",
  "POST /api/matter/ops/payments/:payment_id/allocations",
  "POST /api/matter/ops/payments/:payment_id/allocations/:payment_allocation_id/reversal",
  "GET /api/matter/ops/report.csv",
];

test("RFD-TUW-028 catalog is executable, validated, and preserves the 41 endpoint list", () => {
  assert.deepEqual(MATTER_SMALL_FIRM_OPS_CATALOG_VALIDATION, {
    valid: true,
    route_count: 31,
    endpoint_count: 41,
  });
  assert.deepEqual(
    validateMatterSmallFirmOpsCatalog(MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG),
    MATTER_SMALL_FIRM_OPS_CATALOG_VALIDATION,
  );
  assert.deepEqual(
    MATTER_SMALL_FIRM_OPS_ENDPOINTS.map(({ method, path }) => `${method} ${path}`),
    EXPECTED_ENDPOINTS,
  );
  assert.throws(
    () => validateMatterSmallFirmOpsCatalog([
      ...MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG,
      MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG[0],
    ]),
    /duplicated: today/,
  );
});

test("RFD-TUW-028 route resolver parses dynamic IDs without changing URI error semantics", () => {
  const staticRoute = resolveMatterSmallFirmOpsRoute("/api/matter/ops/followups/contacts");
  assert.equal(staticRoute.route.id, "followupContacts");
  assert.deepEqual(staticRoute.params, {});

  const dynamicRoute = resolveMatterSmallFirmOpsRoute("/api/matter/ops/followups/id%2Fwith%2Fslash");
  assert.equal(dynamicRoute.route.id, "followup");
  assert.deepEqual(dynamicRoute.params, { followup_id: "id%2Fwith%2Fslash" });
  assert.equal(resolveMatterSmallFirmOpsRoute("/api/matter/ops/no-such-route"), null);
  assert.equal(resolveMatterSmallFirmOpsRoute(undefined), null);
});

test("RFD-TUW-028 catalog validation rejects semantic duplicates and ambiguous patterns", () => {
  const entry = (id, path) => ({ id, path, methods: ["GET"] });
  assert.throws(
    () => validateMatterSmallFirmOpsCatalog([
      entry("probeA", "/api/matter/ops/probe/:a"),
      entry("probeB", "/api/matter/ops/probe/:b"),
    ]),
    /semantic path is duplicated/,
  );
  assert.throws(
    () => validateMatterSmallFirmOpsCatalog([entry("probe", "/api/matter/ops/probe/")]),
    /path is malformed/,
  );
  assert.throws(
    () => validateMatterSmallFirmOpsCatalog([entry("probe", "/api/matter/ops/probe/:")]),
    /parameter is malformed/,
  );
  assert.throws(
    () => validateMatterSmallFirmOpsCatalog([entry("probe", "/api/matter/ops/probe/:id/:id")]),
    /parameter is duplicated/,
  );
  assert.throws(
    () => validateMatterSmallFirmOpsCatalog([
      entry("left", "/api/matter/ops/probe/:id/final"),
      entry("right", "/api/matter/ops/probe/start/:id"),
    ]),
    /precedence is ambiguous/,
  );
  assert.deepEqual(
    validateMatterSmallFirmOpsCatalog([
      entry("parameter", "/api/matter/ops/probe/:id"),
      entry("static", "/api/matter/ops/probe/contacts"),
    ]),
    { valid: true, route_count: 2, endpoint_count: 2 },
  );
});

function createRouteDispatchFixture() {
  const tenantId = "tenant_rfd_tuw_028";
  const actorId = "user_rfd_tuw_028";
  const records = [
    {
      model_type: "Matter",
      tenant_id: tenantId,
      matter_id: "matter_route_table",
      matter_code: "RFD028-ROUTE",
      title: "Route table Matter",
      status: "open",
    },
    {
      model_type: "MatterTask",
      tenant_id: tenantId,
      matter_id: "matter_route_table",
      task_id: "task_route_table",
      title: "Route table task",
      status: "todo",
      created_by: actorId,
      assigned_to: actorId,
      due_at: "2026-07-30T03:00:00.000Z",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
  ];
  const repository = Object.freeze({
    list(query = {}) {
      return records.filter((record) => Object.entries(query).every(([key, value]) =>
        value === undefined || record[key] === value));
    },
    get(query = {}) {
      return this.list(query)[0];
    },
  });
  return {
    tenantId,
    actorId,
    runtime: createMatterSmallFirmRuntimeContext({
      matterRepository: repository,
      financeRepository: Object.freeze({ list: () => [], get: () => undefined }),
      now: () => new Date("2026-07-30T02:00:00.000Z"),
    }),
    context: {
      principal: { tenant_id: tenantId, user_id: actorId, role_ids: ["lawyer"] },
      rules: [{ id: "allow_rfd028", effect: "allow", action: "*" }],
      object_acl: [],
    },
  };
}

async function dispatchFixture() {
  const fixture = createRouteDispatchFixture();
  return handleMatterSmallFirmApiRequest({
    pathname: "/api/matter/ops/tasks",
    method: "GET",
    query: {
      tenant_id: fixture.tenantId,
      permission_ref: "rfd_tuw_028_route_dispatch",
      audit_hint_ref: "rfd_tuw_028_route_dispatch_audit",
      as_of: "2026-07-30T02:00:00.000Z",
    },
    context: fixture.context,
    requestId: "rfd_tuw_028_route_dispatch_request",
    runtime: fixture.runtime,
  });
}

test("RFD-TUW-028 route dispatch is behaviorally covered and resolver mutations are caught", async () => {
  const expected = await dispatchFixture();
  assert.equal(expected.status, 200);
  assert.deepEqual(expected.body.items.map(({ id }) => id), ["task_route_table"]);

  const expectedRoute = resolveMatterSmallFirmOpsRoute("/api/matter/ops/tasks");
  const mutatedCatalog = MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG
    .filter((entry) => entry.id !== "tasks")
    .map((entry) => entry.id === "calendar"
      ? { ...entry, path: "/api/matter/ops/tasks" }
      : entry);
  const mutatedResolver = createMatterSmallFirmOpsRouteResolver(mutatedCatalog);
  const mutatedRoute = mutatedResolver("/api/matter/ops/tasks");
  assert.equal(mutatedRoute.route.id, "calendar");
  assert.notEqual(mutatedRoute.route.id, expectedRoute.route.id);
  assert.throws(() => assert.equal(mutatedRoute.route.id, expectedRoute.route.id));
});

test("RFD-TUW-028 preserves the existing public API exports", async () => {
  const api = await import("../src/matter-small-firm-api.js");
  assert.deepEqual(Object.keys(api).sort(), [
    "handleMatterSmallFirmApiRequest",
    "matterBusinessDate",
    "resolveMatterCloseoutBlockers",
  ]);
});
