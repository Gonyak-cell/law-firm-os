import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g11_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g11_read&audit_hint_ref=audit_hint_cmp_g11_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g11_readiness", tenant_id: TENANT, role_ids: ["ui_readiness_reviewer"] },
    rules: [{ id: `rule_ui_${effect}`, effect, action: "*" }],
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

test("G11 UI readiness API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const ui = body.bounded_contexts.find((item) => item.bounded_context === "cmp-ui-readiness");
    assert.equal(status, 200);
    assert.equal(ui.runtime_write_ready, true);
    assert.equal(ui.r5_r6_owner_decision_ready, true);
    assert.equal(ui.production_ready_claim, false);
  });
});

test("G11 UI readiness reads return 48 TUW checks and remain permission gated", async () => {
  await withServer(async (baseUrl) => {
    const readiness = await json(baseUrl, `/api/ui/readiness?${BASE_QUERY}`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.items.length, 48);
    assert.equal(readiness.body.items.every((item) => item.api_backed_surface === true), true);
    assert.equal(readiness.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/ui/readiness?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G11 UI writes persist readiness checks, critical paths, adjudication, and audit across restart", async () => {
  const uiReadinessStorePath = join(mkdtempSync(join(tmpdir(), "ui-api-g11-")), "ui-readiness.json");
  await withServer(async (baseUrl) => {
    const check = await json(baseUrl, "/api/ui/checks", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g11_write",
        audit_hint_ref: "audit_hint_cmp_g11_write",
        actor_id: "user_cmp_g11_readiness",
        idempotency_key: "api-ui-check-g11-1",
        ui_check: {
          ui_check_id: "ui_check_cmp_g11_api_001",
          tenant_id: TENANT,
          tuw_id: "CMP-G11-W11-T036",
          route_id: "ask",
          ui_surface_id: "ai-review-queue",
          api_backed_surface: true,
          permission_states_covered: true,
          review_states_covered: true,
          responsive_states_covered: true,
        },
      }),
    });
    assert.equal(check.status, 201);
    assert.equal(check.body.item.screenshot_payload_included, false);

    const run = await json(baseUrl, "/api/ui/critical-path-runs", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g11_write",
        audit_hint_ref: "audit_hint_cmp_g11_write",
        actor_id: "user_cmp_g11_readiness",
        idempotency_key: "api-critical-path-g11-1",
        critical_path_run: {
          critical_path_run_id: "critical_path_cmp_g11_api_001",
          tenant_id: TENANT,
          route_id: "ask",
          evidence_refs: ["apps/web/test/ui-regression.test.mjs"],
          permission_gate_verified: true,
        },
      }),
    });
    assert.equal(run.status, 201);

    const adjudication = await json(baseUrl, "/api/ui/adjudications", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g11_write",
        audit_hint_ref: "audit_hint_cmp_g11_write",
        actor_id: "user_cmp_g11_readiness",
        idempotency_key: "api-ui-adjudication-g11-1",
        ui_adjudication: {
          ui_adjudication_id: "ui_adjudication_cmp_g11_api_001",
          tenant_id: TENANT,
          ui_check_id: "ui_check_cmp_g11_api_001",
          decision: "approve_with_findings",
          reviewer_id: "owner-g11",
        },
      }),
    });
    assert.equal(adjudication.status, 201);
  }, { uiReadinessStorePath });

  await withServer(async (baseUrl) => {
    const readiness = await json(baseUrl, `/api/ui/readiness?${BASE_QUERY}&route_id=ask`);
    assert.ok(readiness.body.items.some((item) => item.ui_check_id === "ui_check_cmp_g11_api_001"));
    const audit = await json(baseUrl, `/api/ui/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "ui.readiness.adjudicate"));
  }, { uiReadinessStorePath });
});

test("G11 UI write APIs reject non-runtime-backed checks", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/ui/checks", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g11_write",
        audit_hint_ref: "audit_hint_cmp_g11_write",
        actor_id: "user_cmp_g11_readiness",
        idempotency_key: "api-ui-check-g11-blocked",
        ui_check: {
          ui_check_id: "ui_check_cmp_g11_blocked",
          tenant_id: TENANT,
          tuw_id: "CMP-G11-W11-T003",
          route_id: "home",
          ui_surface_id: "api-client",
          api_backed_surface: false,
          permission_states_covered: true,
          responsive_states_covered: true,
        },
      }),
    });
    assert.equal(blocked.status, 400);
  });
});
