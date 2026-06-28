import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_sf_b_w06_synthetic";
const ACTOR_ID = "matter_admin_operator";
const PERMISSION_SET_ID = "permission_set_sf_b_w06";

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["security_admin"] },
    rules: [{ id: `rule_sf_b_w06_${effect}`, effect, action: "*" }],
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
    permission_ref: `perm_ref_sf_b_w06_${permission}`,
    audit_hint_ref: `audit_hint_sf_b_w06_${permission}`,
  }).toString();
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_sf_b_w06_write",
    audit_hint_ref: "audit_hint_sf_b_w06_write",
    actor_id: ACTOR_ID,
    ...overrides,
  };
}

async function createPermissionSet(baseUrl) {
  return json(baseUrl, "/api/admin/permission-sets", {
    method: "POST",
    body: body({
      idempotency_key: "sf-b-w06-permission-set-create",
      permission_set_id: PERMISSION_SET_ID,
      label: "Client Matter Admin Review",
      rule_refs: ["client:read", "matter:read", "audit:read"],
      object_acl_refs: ["Client", "Matter"],
    }),
  });
}

test("SF-B-W06R health and permission set read routes are mounted and safe", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const boundedContext = health.body.bounded_contexts.find((item) => item.bounded_context === "admin-permission-setup");
    assert.equal(health.status, 200);
    assert.ok(boundedContext);
    assert.equal(boundedContext.production_ready_claim, false);
    assert.equal(boundedContext.owner_gated_effects, true);
    assert.equal(boundedContext.provider_gated_effects, true);
    assert.ok(boundedContext.endpoints.includes("GET /api/admin/permission-sets"));
    assert.ok(boundedContext.endpoints.includes("POST /api/admin/connected-apps/:appId/disable"));

    const sets = await json(baseUrl, `/api/admin/permission-sets?${query("permission_set_read")}`);
    assert.equal(sets.status, 200);
    assert.equal(sets.body.items.some((item) => item.permission_set_id === "permission_set_client_matter_reviewer"), true);
    assert.equal(sets.body.items[0].raw_policy_json_included, false);
    assert.equal(sets.body.items[0].direct_principal_identifiers_included, false);
    assert.equal(JSON.stringify(sets.body).includes(ACTOR_ID), false);

    const denied = await json(baseUrl, `/api/admin/permission-sets?${query("denied")}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("SF-B-W06R creates and patches permission-set metadata without silent access broadening", async () => {
  await withServer(async (baseUrl) => {
    const created = await createPermissionSet(baseUrl);
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "owner_blocked");
    assert.equal(created.body.ui_state, "owner_blocked");
    assert.equal(created.body.item.permission_set_id, PERMISSION_SET_ID);
    assert.equal(created.body.item.owner_approval_required, true);
    assert.equal(created.body.item.raw_policy_json_included, false);
    assert.equal(created.body.production_ready_claim, false);

    const replay = await createPermissionSet(baseUrl);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const patched = await json(baseUrl, `/api/admin/permission-sets/${PERMISSION_SET_ID}`, {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w06-permission-set-patch",
        patch: { label: "Client Matter Admin Review Updated", status: "owner_review_required" },
      }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.outcome, "owner_blocked");
    assert.equal(patched.body.item.label, "Client Matter Admin Review Updated");
    assert.equal(patched.body.audit_event.raw_policy_json_included, false);

    const wildcard = await json(baseUrl, `/api/admin/permission-sets/${PERMISSION_SET_ID}`, {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w06-permission-set-wildcard",
        patch: { rule_refs: ["*"] },
      }),
    });
    assert.equal(wildcard.status, 400);
    assert.equal(wildcard.body.ui_state, "blocked");
  });
});

test("SF-B-W06R assignment and object manager routes expose owner-blocked effects", async () => {
  await withServer(async (baseUrl) => {
    await createPermissionSet(baseUrl);

    const assigned = await json(baseUrl, "/api/admin/permission-assignments", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w06-assignment-create",
        assignment_id: "permission_assignment_sf_b_w06",
        permission_set_id: PERMISSION_SET_ID,
        target_actor_id: "raw-target-actor-should-not-return",
        target_label: "Matter admin review group",
      }),
    });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.outcome, "owner_blocked");
    assert.equal(assigned.body.item.grant_applied, false);
    assert.equal(assigned.body.item.direct_actor_identifier_included, false);
    assert.equal(JSON.stringify(assigned.body).includes("raw-target-actor-should-not-return"), false);

    const revoked = await json(baseUrl, "/api/admin/permission-assignments/permission_assignment_sf_b_w06", {
      method: "DELETE",
      body: body({ idempotency_key: "sf-b-w06-assignment-revoke" }),
    });
    assert.equal(revoked.status, 200);
    assert.equal(revoked.body.outcome, "owner_blocked");
    assert.equal(revoked.body.item.revoke_applied, false);

    const objects = await json(baseUrl, `/api/admin/object-manager/objects?${query("objects")}`);
    assert.equal(objects.status, 200);
    assert.equal(objects.body.items.some((item) => item.object_name === "Matter"), true);
    assert.equal(objects.body.physical_schema_mutation_allowed, false);

    const fields = await json(baseUrl, `/api/admin/object-manager/objects/Matter/fields?${query("fields")}`);
    assert.equal(fields.status, 200);
    assert.equal(fields.body.items.some((item) => item.field_name === "risk_level"), true);
    assert.equal(fields.body.items[0].physical_schema_mutated, false);

    const patchedField = await json(baseUrl, "/api/admin/object-manager/objects/Matter/fields/risk_level", {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w06-field-policy-patch",
        visibility: "review_required",
        field_permission_ref: "matter:risk_level:read",
      }),
    });
    assert.equal(patchedField.status, 200);
    assert.equal(patchedField.body.outcome, "owner_blocked");
    assert.equal(patchedField.body.physical_schema_mutated, false);
    assert.equal(patchedField.body.item.restricted_fields_exposed, false);

    const readBackFields = await json(baseUrl, `/api/admin/object-manager/objects/Matter/fields?${query("fields_readback")}`);
    const riskLevel = readBackFields.body.items.find((item) => item.field_name === "risk_level");
    assert.equal(readBackFields.status, 200);
    assert.equal(riskLevel.visibility, "review_required");
    assert.equal(riskLevel.ui_state, "owner_blocked");
    assert.equal(riskLevel.physical_schema_mutated, false);
  });
});

test("SF-B-W06R connected app routes are provider-blocked and audit-safe", async () => {
  await withServer(async (baseUrl) => {
    const apps = await json(baseUrl, `/api/admin/connected-apps?${query("connected_apps")}`);
    assert.equal(apps.status, 200);
    assert.equal(apps.body.items.some((item) => item.app_id === "connected_app_microsoft_graph"), true);
    assert.equal(apps.body.items[0].oauth_client_secret_included, false);
    assert.equal(apps.body.items[0].provider_tokens_included, false);

    const created = await json(baseUrl, "/api/admin/connected-apps", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w06-connected-app-create",
        app_id: "connected_app_sf_b_w06",
        label: "Owner reviewed integration",
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "provider_blocked");
    assert.equal(created.body.item.status, "disabled");
    assert.equal(created.body.item.provider_configured, false);

    const disabled = await json(baseUrl, "/api/admin/connected-apps/connected_app_microsoft_graph/disable", {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w06-connected-app-disable" }),
    });
    assert.equal(disabled.status, 200);
    assert.equal(disabled.body.outcome, "provider_blocked");
    assert.equal(disabled.body.ui_state, "provider_blocked");
    assert.equal(disabled.body.item.provider_revocation_applied, false);
    assert.equal(disabled.body.item.provider_tokens_included, false);

    const audit = await json(baseUrl, `/api/admin/audit?${query("audit")}`);
    assert.equal(audit.status, 200);
    assert.equal(audit.body.items.length >= 2, true);
    assert.equal(audit.body.items.some((item) => item.provider_tokens_included === true), false);
    assert.equal(audit.body.items.some((item) => item.raw_policy_json_included === true), false);
  });
});
