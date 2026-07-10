import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const tenant_id = "tenant-matter-profile-api";
const actor_id = "user-matter-profile-api";
const query = { tenant_id, permission_ref: "matter-profile-test", audit_hint_ref: "matter-profile-test-audit" };
const context = {
  principal: { user_id: actor_id, tenant_id, role_ids: ["matter_runtime_user"] },
  rules: [{ id: "allow-all-matter-profile", effect: "allow", action: "*" }],
  object_acl: [],
};

const fixtures = [
  ["civil", { matter_type_english: "LIT", matter_litigation_axis: "CIV" }, { jurisdiction_court: "서울중앙지방법원", case_number: "2026가합1001", case_name: "매매대금 청구" }],
  ["criminal", { matter_type_english: "LIT", matter_litigation_axis: "CRM" }, { prosecution_sibling_number: "2026형제123", prosecution_office: "서울중앙지방검찰청", criminal_case_number: "2026고단456" }],
  ["administrative", { matter_type_english: "LIT", matter_litigation_axis: "ADM" }, { agency_name: "공정거래위원회", administrative_case_number: "2026행심10", case_name: "시정명령 취소" }],
  ["deal", { matter_type_english: "DEAL" }, { transaction_value: { amount: 1000000000, currency: "KRW", basis: "equity_value" }, stage: "due_diligence", counterparty_name: "상대방 주식회사" }],
  ["advisory", { matter_type_english: "Advisory" }, { advisory_topic: "이사회 자문", engagement_mode: "retainer", stage: "drafting", request_scope: "이사회 운영" }],
];

async function request({ pathname, method, body, runtime, requestContext = context, requestId = `req-${method}-${pathname}` }) {
  return handleMatterApiRequest({ pathname, method, query, body, context: requestContext, requestId, runtime });
}

test("Matter profile API persists, authorizes, and returns each type-specific profile without raw contact values", async () => {
  const repository = createMatterRepository();
  for (const [label, classification] of fixtures) {
    repository.create({
      model_type: "Matter",
      matter_id: `matter-profile-api-${label}`,
      tenant_id,
      client_id: "client-matter-profile-api",
      title: `${label} profile API fixture`,
      status: "opening",
      created_by: actor_id,
      created_at: "2026-07-10T00:00:00.000Z",
      permission_envelope_id: `perm-${label}`,
      audit_trace_id: `audit-${label}`,
      ...classification,
    });
  }
  const runtime = createMatterRuntimeContext({ repository });

  for (const [label, , data] of fixtures) {
    const matterId = `matter-profile-api-${label}`;
    const saved = await request({
      pathname: `/api/matters/${matterId}/profile`,
      method: "PATCH",
      runtime,
      body: { ...query, actor_id, idempotency_key: `profile-${label}`, profile: { data, evidence: { source_ref: `fixtures/${label}.json`, confidence: "manual_verified", review_status: "verified" } } },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.outcome, "updated");
    assert.deepEqual(saved.body.item.data, data);

    const read = await request({ pathname: `/api/matters/${matterId}/profile`, method: "GET", runtime });
    assert.equal(read.status, 200);
    assert.deepEqual(read.body.item.data, data);

    const detail = await request({ pathname: `/api/matters/${matterId}`, method: "GET", runtime });
    assert.equal(detail.status, 200);
    assert.deepEqual(detail.body.matter_profile.data, data);
  }

  const stakeholder = await request({
    pathname: "/api/matters/matter-profile-api-deal/stakeholders",
    method: "POST",
    runtime,
    body: {
      ...query,
      actor_id,
      idempotency_key: "stakeholder-deal-001",
      stakeholder: {
        display_name: "매도자문 변호사",
        organization_name: "자문 법무법인",
        relationship_role: "sell_side_advisor_lawyer",
        side: "seller",
        contact_mode: "crm_contact",
        contact_id: "crm-contact-deal-001",
      },
    },
  });
  assert.equal(stakeholder.status, 201);
  assert.equal(stakeholder.body.item.contact_id, "crm-contact-deal-001");
  assert.equal(stakeholder.body.item.contact_value, undefined);

  const rawContact = await request({
    pathname: "/api/matters/matter-profile-api-deal/stakeholders",
    method: "POST",
    runtime,
    body: { ...query, actor_id, stakeholder: { display_name: "차단", relationship_role: "other", contact_value: "02-0000-0000" } },
  });
  assert.equal(rawContact.status, 400);
  assert.deepEqual(rawContact.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);

  const denied = await request({
    pathname: "/api/matters/matter-profile-api-deal/profile",
    method: "GET",
    runtime,
    requestContext: {
      ...context,
      rules: [{ id: "deny-profile-read", effect: "deny", action: "matter:profile:read" }],
    },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.item, undefined);

  const writeOnlyContext = {
    ...context,
    rules: [
      { id: "allow-profile-write", effect: "allow", action: "matter:profile:write" },
      { id: "allow-stakeholder-write", effect: "allow", action: "matter:stakeholder:write" },
      { id: "deny-stakeholder-read", effect: "deny", action: "matter:stakeholder:read" },
    ],
  };
  const writeOnlyProfile = await request({
    pathname: "/api/matters/matter-profile-api-deal/profile",
    method: "PATCH",
    runtime,
    requestContext: writeOnlyContext,
    requestId: "req-profile-write-only",
    body: {
      ...query,
      actor_id: "forged-actor",
      occurred_at: "2000-01-01T00:00:00.000Z",
      idempotency_key: "profile-write-only",
      profile: { data: { stage: "negotiation" } },
    },
  });
  assert.equal(writeOnlyProfile.status, 200);
  assert.equal(writeOnlyProfile.body.item.updated_by, actor_id);
  assert.notEqual(writeOnlyProfile.body.item.updated_at, "2000-01-01T00:00:00.000Z");
  assert.deepEqual(writeOnlyProfile.body.matter_stakeholders, []);
  assert.equal(
    runtime.repository.listAudit({ tenant_id, object_id: "matter_profile_matter-profile-api-deal" }).length,
    2,
    "two non-replay profile writes must preserve two audit events",
  );
  const sameRequestIdNewWrite = await request({
    pathname: "/api/matters/matter-profile-api-deal/profile",
    method: "PATCH",
    runtime,
    requestContext: writeOnlyContext,
    requestId: "req-profile-write-only",
    body: {
      ...query,
      idempotency_key: "profile-write-only-second",
      profile: { data: { stage: "signing" } },
    },
  });
  assert.equal(sameRequestIdNewWrite.status, 200);
  assert.equal(
    runtime.repository.listAudit({ tenant_id, object_id: "matter_profile_matter-profile-api-deal" }).length,
    3,
    "different writes with a reused request ID must preserve separate audit events",
  );

  const writeOnlyStakeholder = await request({
    pathname: "/api/matters/matter-profile-api-deal/stakeholders",
    method: "POST",
    runtime,
    requestContext: writeOnlyContext,
    body: {
      ...query,
      actor_id: "forged-actor",
      idempotency_key: "stakeholder-write-only",
      stakeholder: {
        display_name: "비공개 CRM 담당자",
        relationship_role: "company_contact",
        contact_mode: "crm_contact",
        contact_id: "crm-contact-hidden-001",
        contact_point_id: "crm-contact-point-hidden-001",
      },
    },
  });
  assert.equal(writeOnlyStakeholder.status, 201);
  assert.equal(writeOnlyStakeholder.body.item.contact_id, null);
  assert.equal(writeOnlyStakeholder.body.item.contact_point_id, null);
  assert.deepEqual(writeOnlyStakeholder.body.matter_stakeholders, []);
});
