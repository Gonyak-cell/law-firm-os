import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

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
    const headers = await apiSessionHeaders(baseUrl);
    const profile = await json(baseUrl, profilePath(), { headers });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.outcome, "passed");
    assert.equal(profile.body.ui_state, "populated");
    assert.equal(profile.body.item.actor_ref, "user_amic_jwsuh");
    assert.equal(profile.body.item.display_name, "서지원");
    assert.equal(profile.body.item.primary_role_label, "대표변호사");
    assert.equal(profile.body.item.tenant_ref, "tenant_amic_matter_vault");
    assert.equal(profile.body.item.contract_summary.source_ref, "hrx-member-roster-source-of-truth");
    assert.equal(profile.body.item.account_summary.session_principal_source, "api_signed_session");
    assert.equal(profile.body.item.secret_material_included, false);
    assert.equal(profile.body.item.direct_identifier_included, false);
    assert.equal(profile.body.production_ready_claim, false);
  });
});

test("Profile API rejects unsigned review and denied permission contexts", async () => {
  await withServer(async (baseUrl) => {
    const review = await json(baseUrl, profilePath(), { headers: permissionHeaders({ effect: "review" }) });
    assert.equal(review.status, 401);
    assert.equal(review.body.outcome, "blocked");
    assert.deepEqual(review.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);

    const denied = await json(baseUrl, profilePath(), { headers: permissionHeaders({ effect: "denied" }) });
    assert.equal(denied.status, 401);
    assert.equal(denied.body.outcome, "blocked");
    assert.deepEqual(denied.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);
  });
});
