import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp05_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_rp05_read&audit_hint_ref=audit_hint_rp05_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_rp05_owner", tenant_id: TENANT, role_ids: ["matter_runtime_user"] },
    rules: [{ id: `rule_matter_${effect}`, effect, action: "*" }],
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

function openingPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_write",
    audit_hint_ref: "audit_hint_rp05_write",
    actor_id: "user_rp05_owner",
    idempotency_key: "matter-api-open-001",
    matter_number_seed: "API-OPEN-001",
    matter: {
      matter_id: "matter_api_open_001",
      tenant_id: TENANT,
      legal_client_party_id: "party_rp04_amic",
      billing_client_party_id: "party_rp04_amic",
      title: "API opened matter",
      status: "opening",
      matter_number: "M-TENANT-RP05-API-OPEN-001",
      created_by: "user_rp05_owner",
      created_at: "2026-06-20T00:00:00.000Z",
      permission_envelope_id: "perm_matter_api_open_001",
      audit_trace_id: "audit_matter_api_open_001",
    },
    clearance_token: {
      clearance_token_id: "clearance_api_open_001",
      tenant_id: TENANT,
      intake_request_id: "intake_api_open_001",
      conflict_check_id: "conflict_api_open_001",
      engagement_id: "engagement_api_open_001",
      snapshot_hash: "sha256:clearance-api-open-001",
      token_state: "valid",
      outcome: "passed",
    },
    ...overrides,
  };
}

test("G4 Matter API health descriptor exposes matter-core runtime without production-ready claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const matter = body.bounded_contexts.find((context) => context.bounded_context === "matter-core");
    assert.equal(status, 200);
    assert.equal(matter.runtime_write_ready, true);
    assert.equal(matter.r5_r6_owner_decision_ready, true);
    assert.equal(matter.production_ready_claim, false);
  });
});

test("G4 Matter list is repository-backed, permission-trimmed, and count-leak safe", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, `/api/matters?${BASE_QUERY}`);
    assert.equal(status, 200);
    assert.equal(body.outcome, "passed");
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].matter_id, "matter_rp05_synthetic_opening");
    assert.equal(body.page_info.omitted_matter_count, null);
    assert.equal(body.count_leak_prevented, true);
    assert.equal(body.production_ready_claim, false);
    assert.equal(JSON.stringify(body).includes("descriptor-only"), false);
  });
});

test("G4 Matter permission gate fails closed and routes review-required without leaking rows", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, `/api/matters?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.items.length, 0);
    assert.equal(denied.body.count_leak_prevented, true);

    const review = await json(baseUrl, `/api/matters?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("review_required") },
    });
    assert.equal(review.status, 200);
    assert.equal(review.body.outcome, "review_required");
    assert.equal(review.body.items.length, 0);
  });
});

test("G4 Matter opening write persists, audits, and replays idempotently across restarts", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-api-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(openingPayload()),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.matter_id, "matter_api_open_001");
    assert.equal(created.body.item.matter_number, "M-TENANT-RP05-API-OPEN-001");
    assert.equal(created.body.state_idempotent, true);
    assert.equal(created.body.audit_event.action, "matter.open");

    const replay = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(openingPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const detail = await json(baseUrl, `/api/matters/matter_api_open_001?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.matter_id, "matter_api_open_001");
    assert.equal(detail.body.client_report.unauthorized_count_leaked, false);
  }, { matterStorePath: storePath });
});

test("G4 Matter team write requires employee-backed staffing and records audit", async () => {
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/team-members", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_rp05_team",
        audit_hint_ref: "audit_hint_rp05_team",
        actor_id: "user_rp05_owner",
        member: {
          member_id: "member_api_associate",
          tenant_id: TENANT,
          employee_id: "emp-002",
          user_id: "user_rp05_associate",
          role: "associate",
          status: "active",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.employee_id, "emp-002");

    const blocked = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/team-members", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_rp05_team",
        audit_hint_ref: "audit_hint_rp05_team",
        actor_id: "user_rp05_owner",
        member: {
          member_id: "member_api_user_only",
          tenant_id: TENANT,
          user_id: "user_rp05_user_only",
          role: "associate",
          status: "active",
        },
      }),
    });
    assert.equal(blocked.status, 400);
    assert.deepEqual(blocked.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.team.member.add"));
  });
});
