import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g8_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g8_read&audit_hint_ref=audit_hint_cmp_g8_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g8_analytics", tenant_id: TENANT, role_ids: ["analytics_user"] },
    rules: [{ id: `rule_analytics_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

test("G8 Analytics API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const analytics = body.bounded_contexts.find((item) => item.bounded_context === "analytics");
    assert.equal(status, 200);
    assert.equal(analytics.runtime_write_ready, true);
    assert.equal(analytics.r5_r6_owner_decision_ready, true);
    assert.equal(analytics.production_ready_claim, false);
  });
});

test("G8 dashboard API is permission gated and omits raw matter detail", async () => {
  await withServer(async (baseUrl) => {
    const dashboards = await json(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`);
    assert.equal(dashboards.status, 200);
    assert.equal(dashboards.body.items.length, 2);
    assert.equal(dashboards.body.items[0].raw_matter_detail_included, false);
    assert.equal(dashboards.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G8 refresh and profitability writes persist across restart", async () => {
  const analyticsStorePath = join(mkdtempSync(join(tmpdir(), "analytics-api-g8-")), "analytics.json");
  await withServer(async (baseUrl) => {
    const refresh = await json(baseUrl, "/api/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-refresh-g8-1",
      }),
    });
    assert.equal(refresh.status, 201);
    assert.equal(refresh.body.items.length, 3);
    assert.equal(refresh.body.items[0].source_payload_included, false);

    const profit = await json(baseUrl, "/api/analytics/matter-profitability", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_write",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-profit-g8-1",
        matter_id: "matter_rp05_synthetic_opening",
        time_entries: [{ standard_value: 400000 }],
        invoices: [{ amount_due: 400000 }],
        payments: [{ amount: 100000 }],
      }),
    });
    assert.equal(profit.status, 201);
    assert.equal(profit.body.item.profitability_amount, -300000);
  }, { analyticsStorePath });

  await withServer(async (baseUrl) => {
    const dashboards = await json(baseUrl, `/api/analytics/dashboards?${BASE_QUERY}`);
    assert.ok(dashboards.body.items.some((item) => item.dashboard_id === "dashboard-practice-pnl"));
    const audit = await json(baseUrl, `/api/analytics/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "analytics.matter_profitability.refresh"));
  }, { analyticsStorePath });
});

test("G8 export control requires permission and never exposes credential material", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/analytics/exports", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-export-g8-blocked",
        analytics_export: {
          analytics_export_id: "export_cmp_g8_blocked",
          tenant_id: TENANT,
          dashboard_id: "dashboard-ar-aging",
        },
      }),
    });
    assert.equal(blocked.status, 400);

    const created = await json(baseUrl, "/api/analytics/exports", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g8_export",
        audit_hint_ref: "audit_hint_cmp_g8_write",
        actor_id: "user_cmp_g8_analytics",
        idempotency_key: "api-export-g8-1",
        analytics_export: {
          analytics_export_id: "export_cmp_g8_api_001",
          tenant_id: TENANT,
          dashboard_id: "dashboard-ar-aging",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.credential_material_included, false);
    assert.equal(created.body.production_ready_claim, false);
  });
});
