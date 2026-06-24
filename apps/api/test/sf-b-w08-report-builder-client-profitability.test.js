import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g8_synthetic";
const ACTOR_ID = "report_builder_operator";
const REPORT_ID = "report_sf_b_w08_client_profitability";

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["report_builder"] },
    rules: [{ id: `rule_sf_b_w08_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...headers,
  };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function query(permission = "read") {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: `perm_ref_sf_b_w08_${permission}`,
    audit_hint_ref: `audit_hint_sf_b_w08_${permission}`,
  }).toString();
}

function reportBody(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_sf_b_w08_write",
    audit_hint_ref: "audit_hint_sf_b_w08_write",
    actor_id: ACTOR_ID,
    ...overrides,
  };
}

async function createReport(baseUrl) {
  return json(baseUrl, "/api/reports", {
    method: "POST",
    body: reportBody({
      idempotency_key: "sf-b-w08-report-create",
      report_id: REPORT_ID,
      name: "Client profitability route report",
      object_scope: "Client",
      column_refs: ["client_group", "matter_count", "profitability_amount", "not_allowed"],
      filter_manifest: [{ field: "period", operator: "current", value_label: "현재" }],
      grouping_manifest: ["client_group"],
      chart_manifest: { type: "bar", metric: "profitability_amount" },
    }),
  });
}

async function refreshClientProfitability(baseUrl) {
  return json(baseUrl, "/api/analytics/client-profitability", {
    method: "POST",
    body: reportBody({
      idempotency_key: "sf-b-w08-client-profitability-refresh",
      client_group_id: "client_group_sf_b_w08",
      client_group_label: "Client Group",
    }),
  });
}

test("SF-B-W08R health descriptor exposes report builder and client profitability routes", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const reportsContext = health.body.bounded_contexts.find((item) => item.bounded_context === "report-builder");
    const analyticsContext = health.body.bounded_contexts.find((item) => item.bounded_context === "analytics");
    assert.equal(health.status, 200);
    assert.ok(reportsContext);
    assert.equal(reportsContext.production_ready_claim, false);
    assert.equal(reportsContext.safe_query_runtime_enabled, true);
    assert.equal(reportsContext.arbitrary_sql_enabled, false);
    assert.ok(reportsContext.endpoints.includes("POST /api/reports/:reportId/run"));
    assert.ok(reportsContext.endpoints.includes("POST /api/reports/:reportId/share"));
    assert.ok(analyticsContext.endpoints.includes("GET /api/analytics/client-profitability"));
    assert.ok(analyticsContext.endpoints.includes("POST /api/analytics/client-profitability"));
  });
});

test("SF-B-W08R report definition routes are mounted, allowlisted, idempotent, and safe", async () => {
  await withServer(async (baseUrl) => {
    const listBefore = await json(baseUrl, `/api/reports?${query("reports")}`);
    assert.equal(listBefore.status, 200);
    assert.equal(listBefore.body.outcome, "passed");
    assert.equal(listBefore.body.items.some((item) => item.report_id === "report-client-profitability"), true);
    assert.equal(listBefore.body.items[0].raw_sql_included, false);
    assert.equal(listBefore.body.items[0].row_data_included, false);
    assert.equal(JSON.stringify(listBefore.body).includes(TENANT), false);

    const created = await createReport(baseUrl);
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "passed");
    assert.equal(created.body.ui_state, "route_mounted");
    assert.deepEqual(created.body.item.column_refs, ["client_group", "matter_count", "profitability_amount"]);
    assert.equal(created.body.item.raw_sql_included, false);
    assert.equal(created.body.item.source_payload_included, false);

    const replay = await createReport(baseUrl);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const patched = await json(baseUrl, `/api/reports/${REPORT_ID}`, {
      method: "PATCH",
      body: reportBody({
        idempotency_key: "sf-b-w08-report-patch",
        name: "Client profitability reviewed report",
        chart_manifest: { type: "line", metric: "profitability_amount" },
      }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.item.chart_manifest.type, "line");
    assert.equal(patched.body.item.tenant_id_included, false);
  });
});

test("SF-B-W08R client profitability refresh/read and report run return bounded aggregate results", async () => {
  await withServer(async (baseUrl) => {
    await createReport(baseUrl);
    const refreshed = await refreshClientProfitability(baseUrl);
    assert.equal(refreshed.status, 201);
    assert.equal(refreshed.body.outcome, "created");
    assert.equal(refreshed.body.item.created_client_identity, false);
    assert.equal(refreshed.body.item.source_object_mutated, false);
    assert.equal(refreshed.body.item.matter_level_rows_included, false);
    assert.equal(refreshed.body.item.row_level_billing_payload_included, false);

    const clientProfitability = await json(baseUrl, `/api/analytics/client-profitability?${query("client-profitability")}`);
    assert.equal(clientProfitability.status, 200);
    assert.equal(clientProfitability.body.items.some((item) => item.client_profitability_id.includes("client_group_sf_b_w08")), true);
    assert.equal(JSON.stringify(clientProfitability.body).includes(ACTOR_ID), false);

    const run = await json(baseUrl, `/api/reports/${REPORT_ID}/run`, {
      method: "POST",
      body: reportBody({ idempotency_key: "sf-b-w08-report-run" }),
    });
    assert.equal(run.status, 200);
    assert.equal(run.body.outcome, "passed");
    assert.equal(run.body.item.bounded_result, true);
    assert.equal(run.body.item.arbitrary_sql_executed, false);
    assert.equal(run.body.item.raw_query_payload_included, false);
    assert.equal(run.body.item.row_level_billing_payload_included, false);
    assert.equal(run.body.item.source_object_mutated, false);
    assert.equal(run.body.item.table_rows.length > 0, true);
  });
});

test("SF-B-W08R report sharing is owner-blocked and audit/denied envelopes stay safe", async () => {
  await withServer(async (baseUrl) => {
    await createReport(baseUrl);
    const shared = await json(baseUrl, `/api/reports/${REPORT_ID}/share`, {
      method: "POST",
      body: reportBody({
        idempotency_key: "sf-b-w08-report-share",
        target_type: "role",
        target_ref_label: "파트너 그룹",
      }),
    });
    assert.equal(shared.status, 200);
    assert.equal(shared.body.outcome, "owner_blocked");
    assert.equal(shared.body.ui_state, "owner_blocked");
    assert.equal(shared.body.item.share_grant_applied, false);
    assert.equal(shared.body.item.direct_recipient_contact_values_included, false);
    assert.equal(shared.body.item.row_level_permission_bypass_performed, false);

    const audit = await json(baseUrl, `/api/reports/${REPORT_ID}/audit?${query("audit")}`);
    assert.equal(audit.status, 200);
    assert.equal(audit.body.items.some((item) => item.action === "report.share.owner_blocked"), true);
    assert.equal(audit.body.items.some((item) => item.raw_query_payload_included === true), false);

    const denied = await json(baseUrl, `/api/reports?${query("denied")}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});
