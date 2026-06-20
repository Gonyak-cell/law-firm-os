import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g7_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g7_read&audit_hint_ref=audit_hint_cmp_g7_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g7_finance", tenant_id: TENANT, role_ids: ["finance_user"] },
    rules: [{ id: `rule_finance_${effect}`, effect, action: "*" }],
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

test("G7 Finance API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const finance = body.bounded_contexts.find((item) => item.bounded_context === "finance");
    assert.equal(status, 200);
    assert.equal(finance.runtime_write_ready, true);
    assert.equal(finance.r5_r6_owner_decision_ready, true);
    assert.equal(finance.production_ready_claim, false);
  });
});

test("G7 Finance list routes are permission gated and hide finance secrets", async () => {
  await withServer(async (baseUrl) => {
    const time = await json(baseUrl, `/api/finance/time-entries?${BASE_QUERY}`);
    assert.equal(time.status, 200);
    assert.equal(time.body.items.length, 1);
    assert.equal(time.body.production_ready_claim, false);

    const invoices = await json(baseUrl, `/api/finance/invoices?${BASE_QUERY}`);
    assert.equal(invoices.status, 200);
    assert.equal(invoices.body.items[0].credential_material_included, false);

    const denied = await json(baseUrl, `/api/finance/invoices?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G7 Finance write routes persist time/payment state across restart", async () => {
  const financeStorePath = join(mkdtempSync(join(tmpdir(), "finance-api-g7-")), "finance.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/finance/time-entries", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-1",
        time_entry: {
          time_entry_id: "time_cmp_g7_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          role_id: "partner",
          work_date: "2026-06-20",
          narrative: "API time",
          duration_minutes: 30,
          billable: true,
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.time_entry_id, "time_cmp_g7_api_001");

    const replay = await json(baseUrl, "/api/finance/time-entries", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-1",
        time_entry: {
          time_entry_id: "time_cmp_g7_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          role_id: "partner",
          work_date: "2026-06-20",
          narrative: "API time",
          duration_minutes: 30,
          billable: true,
        },
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const payment = await json(baseUrl, "/api/finance/payments", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-payment-g7-1",
        payment: {
          payment_id: "payment_cmp_g7_api_001",
          tenant_id: TENANT,
          bank_reference: "should-not-leak",
          amount: 100000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(payment.status, 201);
    assert.equal(payment.body.item.bank_reference_included, false);
    assert.equal("bank_reference" in payment.body.item, false);
  }, { financeStorePath });

  await withServer(async (baseUrl) => {
    const time = await json(baseUrl, `/api/finance/time-entries?${BASE_QUERY}`);
    assert.ok(time.body.items.some((item) => item.time_entry_id === "time_cmp_g7_api_001"));
    const audit = await json(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "payment.import"));
  }, { financeStorePath });
});

test("G7 Finance WIP and AR aging routes stay safe-source", async () => {
  await withServer(async (baseUrl) => {
    const wip = await json(baseUrl, "/api/finance/wip", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-wip-g7-1",
        matter_id: "matter_rp05_synthetic_opening",
        rate_card_id: "rate_cmp_g7_seed",
      }),
    });
    assert.equal(wip.status, 201);
    assert.equal(wip.body.items.length, 1);
    assert.equal(wip.body.items[0].production_ready_claim, false);

    const aging = await json(baseUrl, `/api/finance/ar-aging?${BASE_QUERY}`);
    assert.equal(aging.status, 200);
    assert.equal(aging.body.items[0].production_ready_claim, false);
  });
});
