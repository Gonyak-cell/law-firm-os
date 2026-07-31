import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant_cmp_g6_synthetic";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-crm-intake-api-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function permissionContext() {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g6_owner", tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer"] },
    rules: [{ id: "crm-intake-api-allow", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const signed = await apiSessionHeaders(baseUrl);
  const headers = {
    ...signed,
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.body === undefined ? {} : { "content-type": "application/json" }),
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: await response.json() };
}

test("CRM handoff blocks a Matter shortcut and persists one Intake request across restart", async (t) => {
  const root = fixtureRoot(t);
  const crmStorePath = join(root, "crm.json");
  const intakeStorePath = join(root, "intake.json");

  await withServer({ crmStorePath, intakeStorePath }, async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/crm/opportunities", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "crm-intake-api-write",
        audit_hint_ref: "crm-intake-api-audit",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "crm-intake-direct-matter",
        opportunity: {
          opportunity_id: "opp_crm_intake_direct_matter",
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          display_name: "Direct Matter shortcut",
          stage: "qualified",
          status: "active",
          owner_user_id: "user_cmp_g6_owner",
          matter_id: "matter_forbidden",
        },
      },
    });
    assert.equal(blocked.status, 400);

    const opportunityId = "opp_crm_intake_restart_handoff";
    const created = await json(baseUrl, "/api/crm/opportunities", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "crm-intake-api-write",
        audit_hint_ref: "crm-intake-api-audit",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "crm-intake-restart-opportunity",
        opportunity: {
          opportunity_id: opportunityId,
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          display_name: "Restart handoff opportunity",
          stage: "qualified",
          status: "active",
          owner_user_id: "user_cmp_g6_owner",
        },
      },
    });
    assert.equal(created.status, 201);

    const handoff = await json(baseUrl, `/api/crm/opportunities/${opportunityId}/handoff`, {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "crm-intake-api-write",
        audit_hint_ref: "crm-intake-api-audit",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "crm-intake-handoff",
        intake_request_id: "intake_crm_api_restart",
      },
    });
    assert.equal(handoff.status, 201);
    assert.equal(handoff.body.item.creates_matter, false);
  });

  await withServer({ crmStorePath, intakeStorePath }, async (baseUrl) => {
    const list = await json(
      baseUrl,
      `/api/intake/requests?tenant_id=${TENANT}&permission_ref=crm-intake-api-read&audit_hint_ref=crm-intake-api-read`,
    );
    assert.equal(list.status, 200);
    assert.equal(list.body.items.filter(({ intake_request_id }) => intake_request_id === "intake_crm_api_restart").length, 1);
    assert.equal(list.body.items.every(({ tenant_id }) => tenant_id === TENANT), true);
  });
});
