import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../src/server.js";

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function permissionHeaders({ tenant = "tenant_rp04_synthetic", effect = "allow" } = {}) {
  const rules = effect === "denied" ? [] : [{ id: `profile-${effect}`, effect: effect === "review" ? "review_required" : "allow", action: "*" }];
  return {
    "x-lawos-permission-context": JSON.stringify({
      principal: {
        user_id: "user_profile_session",
        tenant_id: tenant,
        role_ids: ["master_data_reader", "matter_runtime_user"],
        session_principal_source: "desktop_web_session_envelope",
        session_source_ref: "desktop_offline_login",
      },
      rules,
      object_acl: [],
    }),
  };
}

function profilePath(overrides = {}) {
  const params = new URLSearchParams({
    tenant_id: "tenant_rp04_synthetic",
    permission_ref: "ui_profile_me",
    audit_hint_ref: "ui_profile_me_probe",
    ...overrides,
  });
  return `/api/profile/me?${params.toString()}`;
}

test("Profile API descriptor is exposed and keeps production claim false", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    assert.equal(health.status, 200);
    const profileContext = health.body.bounded_contexts.find((context) => context.bounded_context === "profile");
    assert.ok(profileContext, "profile bounded context missing");
    assert.deepEqual(profileContext.endpoints, ["GET /api/profile/me"]);
    assert.equal(profileContext.production_ready_claim, false);
  });
});

test("Profile API returns session-derived safe profile read model", async () => {
  await withServer(async (baseUrl) => {
    const profile = await json(baseUrl, profilePath(), { headers: permissionHeaders() });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.outcome, "passed");
    assert.equal(profile.body.ui_state, "populated");
    assert.equal(profile.body.item.actor_ref, "user_profile_session");
    assert.equal(profile.body.item.tenant_ref, "tenant_rp04_synthetic");
    assert.equal(profile.body.item.account_summary.session_principal_source, "desktop_web_session_envelope");
    assert.equal(profile.body.item.secret_material_included, false);
    assert.equal(profile.body.item.direct_identifier_included, false);
    assert.equal(profile.body.production_ready_claim, false);
  });
});

test("Profile API fails closed for review and denied permission contexts", async () => {
  await withServer(async (baseUrl) => {
    const review = await json(baseUrl, profilePath(), { headers: permissionHeaders({ effect: "review" }) });
    assert.equal(review.status, 403);
    assert.equal(review.body.outcome, "review_required");
    assert.equal(review.body.ui_state, "review");
    assert.equal(review.body.item, null);
    assert.deepEqual(review.body.safe_error_codes, ["PROFILE_REVIEW_REQUIRED"]);

    const denied = await json(baseUrl, profilePath(), { headers: permissionHeaders({ effect: "denied" }) });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.outcome, "denied");
    assert.equal(denied.body.ui_state, "denied");
    assert.equal(denied.body.item, null);
    assert.deepEqual(denied.body.safe_error_codes, ["PROFILE_PERMISSION_DENIED"]);
  });
});
