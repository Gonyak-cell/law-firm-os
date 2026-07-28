import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { findHrxPublicProfessionalProfileByEmployeeId } from "../src/hrx-member-roster-registry.js";
import { resolveHrxEmployeeProfileByUserId } from "../src/hrx-runtime-context.js";
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
    assert.equal(profileContext.data_source, "authenticated_hrx_member_projection");
    assert.deepEqual(profileContext.contact_policy, {
      visibility: "authenticated_internal",
      allowed_fields: ["work_email", "mobile_phone"],
      public_renderer_literals_allowed: false,
    });
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
    assert.equal(profile.body.item.english_name, "Jiwon Suh");
    assert.equal(profile.body.item.primary_role_label, "대표변호사");
    assert.equal(profile.body.item.title, "대표변호사");
    assert.equal(profile.body.item.employee_id, "emp_amic_jwsuh");
    assert.equal(profile.body.item.work_email, "jwsuh@amic.kr");
    assert.equal(profile.body.item.mobile_phone, "");
    assert.equal(profile.body.item.department, "Legal");
    assert.equal(profile.body.item.affiliation, "AMIC Law");
    assert.equal(profile.body.item.organization_group, "AMIC Law");
    assert.equal(profile.body.item.country, "대한민국");
    assert.equal(profile.body.item.professional_profile.profile_kind, "attorney");
    assert.match(profile.body.item.photo_url, /^data:image\/png;base64,/);
    assert.equal(profile.body.item.photo_included, true);
    assert.equal(profile.body.item.contact_policy.visibility, "authenticated_internal");
    assert.equal(profile.body.item.tenant_ref, "tenant_amic_matter_vault");
    assert.equal(profile.body.item.contract_summary.source_ref, "hrx-member-roster-source-of-truth");
    assert.equal(profile.body.item.account_summary.session_principal_source, "api_signed_session");
    assert.equal(profile.body.item.account_summary.employee_user_link_resolved, true);
    assert.equal(profile.body.item.secret_material_included, false);
    assert.equal(profile.body.item.direct_identifier_included, true);
    assert.equal(profile.body.production_ready_claim, false);

    for (const [surface, path] of [
      ["home", "/api/home/action-inbox?tenant_id=tenant_amic_matter_vault&permission_ref=ui_home_dashboard_live&audit_hint_ref=ui_home_dashboard_probe&type=approval"],
      ["matters", "/api/matters?tenant_id=tenant_amic_matter_vault&permission_ref=ui_cmp_g4_matter_live&audit_hint_ref=ui_cmp_g4_matter_probe&limit=1"],
      ["people leave", "/api/hrx/leave/me"],
    ]) {
      const protectedRead = await json(baseUrl, path, { headers });
      assert.equal(protectedRead.status, 200, `${surface} must remain readable for jwsuh@amic.kr`);
      assert.notEqual(protectedRead.body.ui_state, "denied", `${surface} must not emit a denied UI state`);
    }
  });
});

test("Profile resolver joins the signed account to its durable HRX employee", () => {
  const tenantId = "tenant_amic_matter_vault";
  const repository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: tenantId,
      employee_id: "emp_runtime_jwsuh",
      display_name: "서지원",
      legal_name: "서지원",
      work_email: "jwsuh@amic.kr",
      status: "active",
      source_ref: "durable-hrx-runtime",
    }],
    employment_profiles: [{
      tenant_id: tenantId,
      profile_id: "profile_runtime_jwsuh",
      employee_id: "emp_runtime_jwsuh",
      employment_type: "full_time",
      status: "active",
      title: "대표변호사",
      org_unit_id: "org_legal",
      manager_employee_id: null,
      effective_from: "2026-06-22",
      source_ref: "durable-hrx-runtime",
    }],
    employee_user_links: [{
      tenant_id: tenantId,
      link_id: "link_runtime_jwsuh",
      employee_id: "emp_runtime_jwsuh",
      user_id: "user_amic_jwsuh",
      purpose: "login_mapping",
      source_ref: "durable-hrx-runtime",
    }],
  });
  const profile = resolveHrxEmployeeProfileByUserId({ repository }, {
    tenant_id: tenantId,
    user_id: "user_amic_jwsuh",
  });
  assert.equal(profile.employee_id, "emp_runtime_jwsuh");
  assert.equal(profile.display_name, "서지원");
  assert.equal(profile.work_email, "jwsuh@amic.kr");
  assert.equal(profile.title, "대표변호사");
  assert.equal(profile.department, "Legal");
  assert.equal(profile.affiliation, "AMIC Law");
  assert.equal(profile.organization_group, "AMIC Law");
});

test("Packaged public professional profile catalog exposes only the employee join and public profile", () => {
  const profile = findHrxPublicProfessionalProfileByEmployeeId("emp_amic_jwsuh", {
    profiles: [{
      employee_id: "emp_amic_jwsuh",
      professional_profile: {
        profile_kind: "attorney",
        experience: ["법무법인 아믹 대표변호사"],
        education: ["서울대학교 교육학과 학사"],
        qualifications: ["대한민국 변호사"],
      },
    }],
  });
  assert.deepEqual(Object.keys(profile).sort(), ["employee_id", "professional_profile", "source_ref"]);
  assert.equal(profile.professional_profile.profile_kind, "attorney");
  assert.equal("work_email" in profile, false);
  assert.equal("mobile_phone" in profile, false);
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
