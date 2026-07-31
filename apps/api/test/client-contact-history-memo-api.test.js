import assert from "node:assert/strict";
import test from "node:test";

import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import {
  createCrmIntakeRuntimeContext,
  handleCrmIntakeApiRequest,
} from "../src/crm-intake-runtime-context.js";

const TENANT_A = "tenant_contact_history_a";
const TENANT_B = "tenant_contact_history_b";
const ACTOR = "user_contact_history_t05";
const LEAD_A = "lead_contact_history_t05";
const LEAD_B = "lead_contact_history_other_t05";
const PARTY_A = "party_client_contact_history_t05";
const PARTY_B = "party_other_contact_history_t05";
const OPPORTUNITY_A = "opportunity_contact_history_t05";

function lead({ tenantId = TENANT_A, leadId = LEAD_A, partyId = PARTY_A } = {}) {
  return {
    model_type: "Lead",
    lead_id: leadId,
    tenant_id: tenantId,
    party_id: partyId,
    display_name: `${leadId} inquiry`,
    status: "active",
    owner_user_id: ACTOR,
    inquiry_status: "new",
    source: "manual",
    received_at: "2026-07-30T00:00:00.000Z",
    next_action: "문의 확인",
    version: 1,
  };
}

function createRuntime({ activities = [] } = {}) {
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      lead(),
      lead({ tenantId: TENANT_B, leadId: LEAD_B, partyId: PARTY_B }),
      {
        model_type: "Opportunity",
        opportunity_id: OPPORTUNITY_A,
        tenant_id: TENANT_A,
        lead_id: LEAD_A,
        party_id: PARTY_A,
        display_name: "Contact history opportunity",
        stage: "qualified",
        status: "active",
        owner_user_id: ACTOR,
      },
      ...activities,
    ],
  });
  return createCrmIntakeRuntimeContext({ crmRepository });
}

function permissionContext({ objectAcl = [], actorId = ACTOR } = {}) {
  return {
    principal: {
      user_id: actorId,
      tenant_id: TENANT_A,
      role_ids: ["client_staff"],
    },
    rules: [{ id: "crm-contact-history-allow", effect: "allow", action: "*" }],
    object_acl: objectAcl,
  };
}

async function policyRequest({ runtime, context, body, requestId = "req_contact_history" } = {}) {
  return handleCrmIntakeApiRequest({
    pathname: "/api/crm/activities",
    method: "POST",
    query: {},
    body,
    context,
    requestId,
    runtime,
  });
}

function memoBody(overrides = {}) {
  return {
    tenant_id: TENANT_A,
    permission_ref: "crm-contact-history-write",
    audit_hint_ref: "crm-contact-history-audit",
    idempotency_key: "contact-history-memo-1",
    reason: "contact history memo recorded",
    activity: {
      crm_activity_id: "activity_contact_history_t05",
      lead_id: LEAD_A,
      activity_type: "note",
      subject: "Contact history memo",
      confidential: false,
      status: "active",
    },
    ...overrides,
  };
}

test("CL-P5-W02-T05 allowed memo links Lead and derives Party/Opportunity server-side", async () => {
  const runtime = createRuntime();
  const response = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody(),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.outcome, "created");
  assert.equal(response.body.item.lead_id, LEAD_A);
  assert.equal(response.body.item.opportunity_id, OPPORTUNITY_A);
  assert.equal("party_id" in response.body.item, false);
  assert.equal(response.body.item.party_id_included, false);
  assert.equal("matter_id" in response.body.item, false);
  assert.equal(response.body.item.direct_matter_reference_included, false);
  assert.equal(response.body.audit_event.tenant_id, TENANT_A);
  assert.equal(response.body.audit_event.metadata.linkage_type, "lead");
  assert.equal(response.body.audit_event.metadata.lead_id, LEAD_A);
  assert.equal(response.body.audit_event.metadata.opportunity_id, OPPORTUNITY_A);
  assert.equal(response.body.audit_event.metadata.raw_memo_content_included, false);
  assert.equal(JSON.stringify(response.body.audit_event).includes("Contact history memo"), false);

  const [stored] = runtime.crmRepository.list({
    tenant_id: TENANT_A,
    model_type: "CRMActivity",
  });
  assert.equal(stored.lead_id, LEAD_A);
  assert.equal(stored.party_id, PARTY_A);
  assert.equal(stored.opportunity_id, OPPORTUNITY_A);
});

test("CL-P5-W02-T05 denied and missing Lead writes are indistinguishable and side-effect free", async () => {
  const runtime = createRuntime();
  const denied = await policyRequest({
    runtime,
    context: permissionContext({
      objectAcl: [{
        id: "deny-contact-history-lead",
        principal_id: ACTOR,
        resource_id: LEAD_A,
        action: "crm:inquiry:read",
        effect: "deny",
      }],
    }),
    body: memoBody({
      idempotency_key: "contact-history-denied",
      activity: {
        ...memoBody().activity,
        crm_activity_id: "activity_contact_history_denied",
        subject: "Denied private memo",
      },
    }),
    requestId: "req_contact_history_denied",
  });
  const missing = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      idempotency_key: "contact-history-missing",
      activity: {
        ...memoBody().activity,
        crm_activity_id: "activity_contact_history_missing",
        lead_id: "lead_contact_history_missing",
        subject: "Missing private memo",
      },
    }),
    requestId: "req_contact_history_missing",
  });

  assert.equal(denied.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(denied.body.safe_error_codes, missing.body.safe_error_codes);
  assert.deepEqual(denied.body.items, []);
  assert.deepEqual(missing.body.items, []);
  assert.equal(JSON.stringify(denied.body).includes("Denied private memo"), false);
  assert.equal(JSON.stringify(missing.body).includes("Missing private memo"), false);
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 0);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 0);
});

test("CL-P5-W02-T05 cross-tenant and forged linkage bodies cannot write", async () => {
  const runtime = createRuntime();
  const crossTenant = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      tenant_id: TENANT_B,
      idempotency_key: "contact-history-cross-tenant-body",
      activity: { ...memoBody().activity, crm_activity_id: "activity_contact_history_cross_tenant_body" },
    }),
    requestId: "req_contact_history_cross_tenant_body",
  });
  const crossTenantLead = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      idempotency_key: "contact-history-cross-tenant-lead",
      activity: {
        ...memoBody().activity,
        crm_activity_id: "activity_contact_history_cross_tenant_lead",
        lead_id: LEAD_B,
      },
    }),
    requestId: "req_contact_history_cross_tenant_lead",
  });
  for (const response of [crossTenant, crossTenantLead]) {
    assert.equal(response.status, 404);
    assert.deepEqual(response.body.safe_error_codes, ["CRM_INTAKE_NOT_FOUND"]);
  }
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 0);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 0);
});

test("CL-P5-W02-T05 Lead-linked memo rejects every caller-supplied Party/Opportunity ID uniformly", async () => {
  const runtime = createRuntime();
  const suppliedLinkages = [
    { party_id: PARTY_A },
    { party_id: PARTY_B },
    { party_id: "party_unknown_contact_history" },
    { opportunity_id: OPPORTUNITY_A },
    { opportunity_id: "opportunity_wrong_contact_history" },
    { opportunity_id: "opportunity_unknown_contact_history" },
    { party_id: PARTY_A, opportunity_id: OPPORTUNITY_A },
  ];

  const responses = await Promise.all(suppliedLinkages.map((linkage, index) => (
    policyRequest({
      runtime,
      context: permissionContext(),
      body: memoBody({
        idempotency_key: `contact-history-supplied-linkage-${index}`,
        activity: {
          ...memoBody().activity,
          crm_activity_id: `activity_contact_history_supplied_linkage_${index}`,
          ...linkage,
        },
      }),
      requestId: `req_contact_history_supplied_linkage_${index}`,
    })
  )));
  const topLevelResponses = await Promise.all([
    policyRequest({
      runtime,
      context: permissionContext(),
      body: {
        ...memoBody({ idempotency_key: "contact-history-top-level-party" }),
        party_id: PARTY_A,
      },
      requestId: "req_contact_history_top_level_party",
    }),
    policyRequest({
      runtime,
      context: permissionContext(),
      body: {
        ...memoBody({ idempotency_key: "contact-history-top-level-opportunity" }),
        opportunity_id: OPPORTUNITY_A,
      },
      requestId: "req_contact_history_top_level_opportunity",
    }),
  ]);

  for (const response of [...responses, ...topLevelResponses]) {
    assert.equal(response.status, 400);
    assert.deepEqual(response.body.safe_error_codes, ["CRM_INTAKE_API_VALIDATION_ERROR"]);
    assert.deepEqual(response.body.items, []);
    assert.equal(response.body.ui_state, "blocked");
  }
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 0);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 0);
});

test("CL-P5-W02-T05 replay is bound to Lead, subject, confidentiality, actor, and reason", async () => {
  const runtime = createRuntime();
  const first = await policyRequest({ runtime, context: permissionContext(), body: memoBody() });
  const replay = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody(),
    requestId: "req_contact_history_replay",
  });
  const changedSubject = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      activity: { ...memoBody().activity, subject: "Changed contact history memo" },
    }),
    requestId: "req_contact_history_changed_subject",
  });
  const changedConfidentiality = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      activity: { ...memoBody().activity, confidential: true },
    }),
    requestId: "req_contact_history_changed_confidentiality",
  });
  const changedActivityId = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      activity: {
        ...memoBody().activity,
        crm_activity_id: "activity_contact_history_changed_id",
      },
    }),
    requestId: "req_contact_history_changed_id",
  });
  const changedActor = await policyRequest({
    runtime,
    context: permissionContext({ actorId: "user_contact_history_other_t05" }),
    body: memoBody(),
    requestId: "req_contact_history_changed_actor",
  });
  const changedReason = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({ reason: "RAW_SECRET_REASON_REPLAY_91f6" }),
    requestId: "req_contact_history_changed_reason",
  });

  assert.equal(first.status, 201);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(changedSubject.status, 409);
  assert.deepEqual(changedSubject.body.safe_error_codes, ["CRM_ACTIVITY_IDEMPOTENCY_CONFLICT"]);
  assert.equal(changedConfidentiality.status, 409);
  assert.deepEqual(changedConfidentiality.body.safe_error_codes, ["CRM_ACTIVITY_IDEMPOTENCY_CONFLICT"]);
  assert.equal(changedActivityId.status, 409);
  assert.deepEqual(changedActivityId.body.safe_error_codes, ["CRM_ACTIVITY_IDEMPOTENCY_CONFLICT"]);
  assert.equal(changedActor.status, 409);
  assert.deepEqual(changedActor.body.safe_error_codes, ["CRM_ACTIVITY_IDEMPOTENCY_CONFLICT"]);
  assert.equal(changedReason.status, 409);
  assert.deepEqual(changedReason.body.safe_error_codes, ["CRM_ACTIVITY_IDEMPOTENCY_CONFLICT"]);
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 1);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 1);
});

test("CL-P5-W02-T05 legacy replay response is sanitized before returning to the Client", async () => {
  const sourceRuntime = createRuntime();
  const body = memoBody({
    idempotency_key: "contact-history-legacy-response",
    activity: {
      ...memoBody().activity,
      crm_activity_id: "activity_contact_history_legacy_response",
    },
  });
  const source = await policyRequest({
    runtime: sourceRuntime,
    context: permissionContext(),
    body,
  });
  const legacyEntry = sourceRuntime.crmRepository
    .snapshot()
    .idempotency
    .find(({ idempotency_key }) => idempotency_key === body.idempotency_key);
  const runtime = createRuntime();
  runtime.crmRepository.recordIdempotency({
    ...legacyEntry,
    response: {
      ...source.body,
      item: { ...source.body.item, party_id: PARTY_A },
      audit_event: {
        ...source.body.audit_event,
        reason: "RAW_SECRET_LEGACY_REASON_91f6",
        metadata: {
          ...source.body.audit_event.metadata,
          raw_reason: "RAW_SECRET_LEGACY_REASON_91f6",
          raw_subject: "RAW_SECRET_LEGACY_SUBJECT_91f6",
        },
      },
    },
  });

  const replay = await policyRequest({ runtime, context: permissionContext(), body });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent_replay, true);
  assert.equal("party_id" in replay.body.item, false);
  assert.equal(replay.body.item.party_id_included, false);
  assert.equal(replay.body.audit_event.reason, "contact_memo_recorded");
  assert.equal(JSON.stringify(replay.body.audit_event).includes("RAW_SECRET_LEGACY_REASON_91f6"), false);
  assert.equal(JSON.stringify(replay.body.audit_event).includes("RAW_SECRET_LEGACY_SUBJECT_91f6"), false);
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 0);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 0);
});

test("CL-P5-W02-T05 omitted activity ID still replays deterministically by idempotency key", async () => {
  const runtime = createRuntime();
  const activity = { ...memoBody().activity };
  delete activity.crm_activity_id;
  const body = memoBody({
    idempotency_key: "contact-history-omitted-activity-id",
    activity,
  });
  const first = await policyRequest({
    runtime,
    context: permissionContext(),
    body,
    requestId: "req_contact_history_omitted_id_first",
  });
  const replay = await policyRequest({
    runtime,
    context: permissionContext(),
    body,
    requestId: "req_contact_history_omitted_id_replay",
  });

  assert.equal(first.status, 201);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent_replay, true);
  assert.equal(replay.body.item.crm_activity_id, first.body.item.crm_activity_id);
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 1);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 1);
});

test("CL-P5-W02-T05 lead-linked memo rejects consultation fields and unknown activity fields", async () => {
  const runtime = createRuntime();
  const invalidOverrides = [
    { activity_kind: "consultation" },
    { activity_type: "consultation" },
    { scheduled_start: "2026-08-01T01:00:00.000Z" },
    { scheduled_end: "2026-08-01T02:00:00.000Z" },
    { timezone: "Asia/Seoul" },
    { completed_at: "2026-08-01T02:00:00.000Z" },
    { outcome: "consultation completed" },
    { next_action: "send a follow-up" },
    { status: "review_required" },
    { activity_type: undefined },
    { status: undefined },
    { lead_id: "" },
    { unexpected_field: "reject this" },
    { subject: "" },
    { subject: "x".repeat(161) },
  ];

  for (const [index, override] of invalidOverrides.entries()) {
    const response = await policyRequest({
      runtime,
      context: permissionContext(),
      body: memoBody({
        idempotency_key: `contact-history-invalid-shape-${index}`,
        activity: {
          ...memoBody().activity,
          crm_activity_id: `activity_contact_history_invalid_shape_${index}`,
          ...override,
        },
      }),
      requestId: `req_contact_history_invalid_shape_${index}`,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body.safe_error_codes, ["CRM_INTAKE_API_VALIDATION_ERROR"]);
  }

  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 0);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 0);
});

test("CL-P5-W02-T05 lead-linked memo rejects legacy idempotency entries without a fingerprint", async () => {
  const runtime = createRuntime();
  runtime.crmRepository.recordIdempotency({
    tenant_id: TENANT_A,
    idempotency_key: "contact-history-legacy-null-fingerprint",
    operation: "crm_activity_create",
    request_fingerprint: null,
    response: {
      request_id: "req_legacy_activity",
      outcome: "created",
      item: { crm_activity_id: "activity_legacy_activity" },
      audit_event: null,
      safe_error_codes: [],
      audit_hint_ref: "legacy-audit",
      production_ready_claim: false,
    },
  });

  const response = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      idempotency_key: "contact-history-legacy-null-fingerprint",
      activity: {
        ...memoBody().activity,
        crm_activity_id: "activity_contact_history_legacy_reuse",
        subject: "Changed payload against legacy key",
      },
    }),
    requestId: "req_contact_history_legacy_reuse",
  });

  assert.equal(response.status, 409);
  assert.deepEqual(response.body.safe_error_codes, ["CRM_ACTIVITY_IDEMPOTENCY_CONFLICT"]);
  assert.equal(runtime.crmRepository.list({ model_type: "CRMActivity" }).length, 0);
  assert.equal(runtime.crmRepository.listAudit({ tenant_id: TENANT_A }).length, 0);
});

test("CL-P5-W02-T05 confidential memo is redacted and activity list omits unauthorized count", async () => {
  const runtime = createRuntime({
    activities: [{
      model_type: "CRMActivity",
      crm_activity_id: "activity_contact_history_acl_denied",
      tenant_id: TENANT_A,
      party_id: PARTY_A,
      lead_id: LEAD_A,
      activity_type: "note",
      subject: "Hidden list memo",
      confidential: false,
      status: "active",
      owner_user_id: ACTOR,
      version: 1,
    }],
  });
  const rawSubject = "RAW_SECRET_SUBJECT_91f6";
  const rawReason = "RAW_SECRET_REASON_91f6";
  const confidential = await policyRequest({
    runtime,
    context: permissionContext(),
    body: memoBody({
      idempotency_key: "contact-history-confidential",
      reason: rawReason,
      activity: {
        ...memoBody().activity,
        crm_activity_id: "activity_contact_history_confidential",
        subject: rawSubject,
        confidential: true,
      },
    }),
  });
  const list = await handleCrmIntakeApiRequest({
    pathname: "/api/crm/activities",
    method: "GET",
    query: {
      tenant_id: TENANT_A,
      permission_ref: "crm-contact-history-read",
      audit_hint_ref: "crm-contact-history-list-audit",
    },
    body: {},
    context: permissionContext({
      objectAcl: [{
        id: "deny-activity-list-item",
        principal_id: ACTOR,
        resource_id: "activity_contact_history_acl_denied",
        action: "crm:activity:read",
        effect: "deny",
      }],
    }),
    requestId: "req_contact_history_list",
    runtime,
  });

  assert.equal(confidential.status, 201);
  assert.equal(confidential.body.item.subject, "보호된 이력");
  assert.equal(confidential.body.item.confidential_subject_included, false);
  assert.equal(confidential.body.item.confidential_details_included, false);
  assert.equal(confidential.body.item.outcome, null);
  assert.equal(confidential.body.item.next_action, null);
  assert.equal(JSON.stringify(confidential.body).includes(rawSubject), false);
  assert.equal(JSON.stringify(confidential.body).includes(rawReason), false);
  assert.equal(confidential.body.audit_event.reason, "contact_memo_recorded");
  assert.equal(confidential.body.audit_event.metadata.raw_reason_included, false);
  assert.equal(confidential.body.audit_event.metadata.raw_subject_included, false);
  assert.equal(JSON.stringify(confidential.body.audit_event).includes(rawSubject), false);
  assert.equal(JSON.stringify(confidential.body.audit_event).includes(rawReason), false);
  const snapshot = runtime.crmRepository.snapshot();
  assert.equal(JSON.stringify(snapshot.audit_events).includes(rawSubject), false);
  assert.equal(JSON.stringify(snapshot.audit_events).includes(rawReason), false);
  assert.equal(JSON.stringify(snapshot.idempotency).includes(rawSubject), false);
  assert.equal(JSON.stringify(snapshot.idempotency).includes(rawReason), false);
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.page_info.omitted_item_count, null);
  assert.equal(list.body.count_leak_prevented, true);
});
