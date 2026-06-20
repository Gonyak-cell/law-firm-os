import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g6_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g6_read&audit_hint_ref=audit_hint_cmp_g6_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g6_owner", tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer"] },
    rules: [{ id: `rule_crm_intake_${effect}`, effect, action: "*" }],
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

test("G6 CRM/Intake API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const context = body.bounded_contexts.find((item) => item.bounded_context === "crm-intake");
    assert.equal(status, 200);
    assert.equal(context.runtime_write_ready, true);
    assert.equal(context.r5_r6_owner_decision_ready, true);
    assert.equal(context.production_ready_claim, false);
  });
});

test("G6 CRM list is permission gated and omits Matter shortcut fields", async () => {
  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/crm/opportunities?${BASE_QUERY}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.outcome, "passed");
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].direct_matter_reference_included, false);
    assert.equal("matter_id" in list.body.items[0], false);
    assert.equal(list.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/crm/opportunities?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.items.length, 0);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G6 opportunity create blocks direct Matter and handoff persists Intake across restart", async () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-api-g6-")), "crm.json");
  const intakeStorePath = join(mkdtempSync(join(tmpdir(), "intake-api-g6-")), "intake.json");
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/crm/opportunities", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-opp-shortcut",
        opportunity: {
          opportunity_id: "opp_cmp_g6_direct_matter",
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          display_name: "Direct Matter shortcut",
          stage: "qualified",
          status: "active",
          owner_user_id: "user_cmp_g6_owner",
          matter_id: "matter_forbidden",
        },
      }),
    });
    assert.equal(blocked.status, 400);

    const handoff = await json(baseUrl, "/api/crm/opportunities/opp_cmp_g6_synthetic_001/handoff", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-handoff-1",
        intake_request_id: "intake_cmp_g6_api_handoff_001",
      }),
    });
    assert.equal(handoff.status, 201);
    assert.equal(handoff.body.item.intake_request_id, "intake_cmp_g6_api_handoff_001");
    assert.equal(handoff.body.item.creates_matter, false);

    const replay = await json(baseUrl, "/api/crm/opportunities/opp_cmp_g6_synthetic_001/handoff", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-handoff-1",
        intake_request_id: "intake_cmp_g6_api_handoff_001",
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
  }, { crmStorePath, intakeStorePath });

  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/intake/requests?${BASE_QUERY}`);
    assert.ok(list.body.items.some((item) => item.intake_request_id === "intake_cmp_g6_api_handoff_001"));
  }, { crmStorePath, intakeStorePath });
});

test("G6 conflict check, clearance token, and audit routes stay safe and tenant scoped", async () => {
  await withServer(async (baseUrl) => {
    const check = await json(baseUrl, "/api/intake/conflict-checks", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-conflict-check-1",
        conflict_check: {
          conflict_check_id: "conflict_cmp_g6_api_001",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          party_snapshot: { party_ids: ["party_cmp_g6_client_001"] },
          status: "snapshot_recorded",
          owner_user_id: "user_cmp_g6_owner",
        },
      }),
    });
    assert.equal(check.status, 201);
    assert.equal(check.body.item.raw_conflict_memo_included, false);
    assert.ok(check.body.item.snapshot_hash);

    const token = await json(baseUrl, "/api/intake/clearance-tokens", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-clearance-token-1",
        now: "2026-06-20T00:00:00.000Z",
        token: {
          clearance_token_id: "clearance_cmp_g6_api_001",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          conflict_check_id: "conflict_cmp_g6_api_001",
          engagement_id: "engagement_cmp_g6_api_001",
          snapshot_hash: check.body.item.snapshot_hash,
          expires_at: "2026-06-27T00:00:00.000Z",
        },
      }),
    });
    assert.equal(token.status, 201);
    assert.equal(token.body.validation.valid, true);
    assert.equal(token.body.production_ready_claim, false);

    const audit = await json(baseUrl, `/api/intake/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "clearance.token.issue"));
  });
});
