import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_API_SESSION_STORAGE_KEY,
  LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
  LAWOS_SESSION_ENVELOPE_STORAGE_KEY,
  completeCrmConsultation,
  createCrmContactActivityMemo,
  createCrmConsultation,
  decideCrmEngagement,
  fetchCrmInquiryDetail,
  fetchCrmInquiries,
  fetchCrmClientActivities,
  linkCrmConsultationOutlookEvent,
  repairCrmEngagement,
  updateCrmConsultation
} from "../src/data/apiClient.js";
import {
  buildClientConsultationModel,
  CLIENT_CONSULTATION_STATUS_TABS,
  clientConsultationStatusLabel,
  normalizeClientConsultation,
  resolveClientConsultationSelection
} from "../src/components/ClientConsultationModel.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function activity(overrides = {}) {
  return {
    resource_id: "consultation-today",
    tenant_id: "tenant_client_consultation",
    crm_activity_id: "consultation-today",
    activity_type: "meeting",
    activity_kind: "consultation",
    party_id: "party-today",
    party_display_name: "새봄테크",
    lead_id: "lead-today",
    opportunity_id: null,
    subject: "초기 상담",
    confidential: false,
    confidential_subject_included: true,
    confidential_details_included: true,
    scheduled_start: "2026-07-31T01:00:00.000Z",
    scheduled_end: "2026-07-31T02:00:00.000Z",
    timezone: "Asia/Seoul",
    completed_at: null,
    outcome: null,
    next_action: "상담 준비",
    outlook_calendar: {
      state: "not_created",
      web_link: null,
      created_at: null,
      mailbox_scope: "me",
      automatic_sync_enabled: false,
      provider_event_identifier_included: false,
      transaction_identifier_included: false
    },
    version: 1,
    status: "active",
    owner_user_id: "user_client_consultation",
    occurred_at: "2026-07-31T00:00:00.000Z",
    created_at: "2026-07-31T00:00:00.000Z",
    updated_at: "2026-07-31T00:00:00.000Z",
    direct_matter_reference_included: false,
    production_ready_claim: false,
    ...overrides
  };
}

function memoActivity(overrides = {}) {
  return activity({
    resource_id: "activity-memo",
    crm_activity_id: "activity-memo",
    activity_type: "note",
    activity_kind: null,
    subject: "전화 메모",
    scheduled_start: null,
    scheduled_end: null,
    timezone: null,
    outlook_calendar: null,
    ...overrides
  });
}

function safeConsultation(overrides = {}) {
  const raw = activity(overrides);
  return {
    consultationId: raw.crm_activity_id,
    activityId: raw.crm_activity_id,
    activityKind: "consultation",
    activityType: raw.activity_type,
    leadId: raw.lead_id,
    opportunityId: raw.opportunity_id,
    partyDisplayName: raw.party_display_name,
    subject: raw.subject,
    confidential: raw.confidential,
    confidentialSubjectIncluded: raw.confidential_subject_included,
    confidentialDetailsIncluded: raw.confidential_details_included,
    scheduledStart: raw.scheduled_start,
    scheduledEnd: raw.scheduled_end,
    timezone: raw.timezone,
    completedAt: raw.completed_at,
    outcome: raw.outcome,
    nextAction: raw.next_action,
    outlookCalendar: raw.outlook_calendar,
    version: raw.version,
    status: raw.status,
    ...overrides
  };
}

function inquiry(version = 2) {
  return {
    tenant_id: "tenant_client_consultation",
    lead_id: "lead-today",
    version,
    next_action: "상담 준비"
  };
}

function inquirySummaryFixture(overrides = {}) {
  return {
    tenant_id: "tenant_client_consultation",
    lead_id: "lead-today",
    display_name: "새봄테크 문의",
    visible_status: "engagement_review",
    visible_status_label: "수임 검토 중",
    source: "outlook_addin",
    received_at: "2026-07-31T00:00:00.000Z",
    assigned_user_id: null,
    next_action: "수임 여부 확인",
    version: 7,
    opportunity_id: "opportunity-today",
    engagement_decision: "pending",
    engagement_workflow_status: "completed",
    direct_matter_reference_included: false,
    production_ready_claim: false,
    ...overrides
  };
}

function inquiryDetailFixture(overrides = {}) {
  const summary = inquirySummaryFixture();
  return {
    ...summary,
    party_id: "party-internal-must-not-expose",
    owner_user_id: "owner-internal-must-not-expose",
    client_group_id: "client-group-internal-must-not-expose",
    opportunity: {
      opportunity_id: "opportunity-today",
      stage: "qualified",
      engagement_decision: "pending",
      engagement_decision_version: 9,
      engagement_workflow_status: "completed",
      engagement_client_group_id: "client-group-internal-must-not-expose",
      engagement_fee_commitment_id: "fee-internal-must-not-expose",
      owner_user_id: "owner-internal-must-not-expose",
      direct_matter_reference_included: false,
      production_ready_claim: false
    },
    consultations_access: "allowed",
    consultations: [],
    evidence: {
      access: "allowed",
      source_status: "complete",
      items: [],
      page_info: { returned_count: 0, omitted_item_count: null },
      count_leak_prevented: true
    },
    ...overrides
  };
}

function inquiryListBody(items = [inquirySummaryFixture()], overrides = {}) {
  return {
    outcome: "passed",
    data_status: "complete",
    items,
    page_info: { returned_count: items.length, omitted_item_count: null },
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: [],
    ...overrides
  };
}

function inquiryDetailBody(item = inquiryDetailFixture(), overrides = {}) {
  return {
    outcome: "passed",
    data_status: "complete",
    item,
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete",
      email_evidence: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: [],
    ...overrides
  };
}

function consultationBody(overrides = {}) {
  return {
    outcome: "scheduled",
    item: activity(),
    inquiry: inquiry(3),
    audit_event: { action: "crm.consultation.scheduled", metadata: { raw_consultation_content_included: false } },
    safe_error_codes: [],
    idempotent_replay: false,
    ...overrides
  };
}

function engagementBody(overrides = {}) {
  return {
    outcome: "completed",
    item: {
      tenant_id: "tenant_client_consultation",
      resource_id: "opportunity-today",
      opportunity_id: "opportunity-today",
      stage: "qualified",
      engagement_decision: "accepted",
      engagement_decision_version: 2,
      engagement_workflow_id: "workflow-today",
      engagement_workflow_status: "completed",
      direct_matter_reference_included: false,
      production_ready_claim: false
    },
    inquiry: { tenant_id: "tenant_client_consultation", lead_id: "lead-today", version: 4, next_action: "수임 절차 확인" },
    processing: {
      engagement_workflow_id: "workflow-today",
      lead_id: "lead-today",
      opportunity_id: "opportunity-today",
      decision: "accepted",
      engagement_decision_version: 2,
      workflow_status: "completed",
      workflow_version: 1,
      completed_steps: ["decision_recorded", "client_group_resolved", "fee_commitment_created"],
      failed_step: null,
      safe_error_code: null,
      automatic_matter_creation: false
    },
    automatic_matter_creation: false,
    direct_matter_reference_included: false,
    safe_error_codes: [],
    idempotent_replay: false,
    ...overrides
  };
}

function repairRequiredBody(overrides = {}) {
  const base = engagementBody();
  return {
    ...base,
    ...overrides,
    outcome: "repair_required",
    ui_state: "repair_required",
    item: {
      ...base.item,
      engagement_workflow_status: "repair_required",
      ...overrides.item
    },
    processing: {
      ...base.processing,
      workflow_status: "repair_required",
      workflow_version: 2,
      completed_steps: ["decision_recorded", "client_group_resolved"],
      failed_step: "fee_commitment_created",
      safe_error_code: "CRM_ENGAGEMENT_FINANCE_STEP_FAILED",
      ...overrides.processing
    }
  };
}

function installSignedSession() {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const storage = memoryStorage();
  const expiresAt = "2099-01-01T00:00:00.000Z";
  storage.setItem(LAWOS_API_SESSION_STORAGE_KEY, JSON.stringify({
    token_type: "Bearer",
    session_token: "lawos_session_v1.client_consultation_test",
    expires_at: expiresAt,
    session: { user_id: "user_client_consultation", tenant_id: "tenant_client_consultation" }
  }));
  storage.setItem(LAWOS_SESSION_ENVELOPE_STORAGE_KEY, JSON.stringify({
    schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    state: "signed_in",
    session_ref: "session_client_consultation",
    source: "api_signed_session",
    actor_ref: "user_client_consultation",
    tenant_refs: {
      default: "tenant_client_consultation",
      crm: "tenant_client_consultation"
    },
    role_ids: ["crm_operator"],
    scopes: ["crm.inquiry.write", "crm.activity.write"],
    review_state: "allow",
    expires_at: expiresAt
  }));
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  return () => {
    if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage);
    else delete globalThis.sessionStorage;
  };
}

test("상담·수임 명령 어댑터는 signed tenant/version/요청키를 보내고 canonical 결과만 반환한다", async () => {
  const restoreStorage = installSignedSession();
  const originalFetch = globalThis.fetch;
  const calls = [];
  let mode = "allow";
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://lawos.test");
    calls.push({ url, init });
    if (mode === "denied") return jsonResponse({ outcome: "denied", ui_state: "denied", safe_error_codes: ["CRM_INTAKE_UNAUTHORIZED_OMISSION"] }, 403);
    if (mode === "review") return jsonResponse({ outcome: "review_required", ui_state: "review_required", safe_error_codes: ["CRM_INTAKE_REVIEW_REQUIRED"] }, 200);
    if (mode === "conflict") return jsonResponse({ outcome: "blocked", ui_state: "conflict", safe_error_codes: ["CRM_CONSULTATION_VERSION_CONFLICT"] }, 409);
    if (mode === "error") return jsonResponse({ outcome: "blocked", safe_error_codes: ["CRM_RUNTIME_FAILURE"] }, 503);
    if (url.pathname === "/api/crm/inquiries" && (init?.method ?? "GET") === "GET") return jsonResponse(inquiryListBody());
    if (url.pathname === "/api/crm/inquiries/lead-today" && (init?.method ?? "GET") === "GET") return jsonResponse(inquiryDetailBody());
    if (url.pathname === "/api/crm/activities" && (init?.method ?? "GET") === "GET") return jsonResponse({
      request_id: "request-client-activities",
      outcome: "passed",
      items: [activity(), memoActivity()],
      page_info: { returned_count: 2, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: url.searchParams.get("audit_hint_ref"),
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false
    });
    if (url.pathname.endsWith("/consultations") && init.method === "POST") return jsonResponse(consultationBody(), 201);
    if (url.pathname.includes("/activities/") && init.method === "PATCH") {
      const payload = JSON.parse(init.body);
      if (payload.field_updates.completed_at) {
        return jsonResponse({
          ...consultationBody({ outcome: "completed", item: activity({ version: 3, completed_at: "2026-07-31T02:00:00.000Z", outcome: "후속 절차를 안내함", next_action: "수임 여부 검토" }), inquiry: inquiry(4) }),
          idempotent_replay: true
        });
      }
      return jsonResponse(consultationBody({ outcome: "updated", item: activity({ version: 2, scheduled_start: "2026-07-31T02:30:00.000Z", scheduled_end: "2026-07-31T03:30:00.000Z" }), inquiry: inquiry(3) }));
    }
    if (url.pathname.endsWith("/outlook-event")) return jsonResponse(consultationBody({
      outcome: "outlook_event_created",
      provider_call_executed: true,
      credential_material_included: false,
      production_ready_claim: false,
      item: activity({ version: 2, outlook_calendar: {
        state: "linked",
        web_link: "https://outlook.office.com/calendar/item/synthetic",
        created_at: "2026-07-31T00:00:00.000Z",
        mailbox_scope: "me",
        automatic_sync_enabled: false,
        provider_event_identifier_included: false,
        transaction_identifier_included: false
      } })
    }), 201);
    if (url.pathname.endsWith("/engagement-decisions")) return jsonResponse(engagementBody(), 201);
    if (url.pathname.endsWith("/engagement-repair")) {
      if (mode === "repair_required") return jsonResponse(engagementBody({
        outcome: "repair_required",
        ui_state: "repair_required",
        item: {
          tenant_id: "tenant_client_consultation",
          resource_id: "opportunity-today",
          opportunity_id: "opportunity-today",
          stage: "qualified",
          engagement_decision: "accepted",
          engagement_decision_version: 2,
          engagement_workflow_id: "workflow-today",
          engagement_workflow_status: "repair_required",
          direct_matter_reference_included: false,
          production_ready_claim: false
        },
        processing: {
          engagement_workflow_id: "workflow-today",
          lead_id: "lead-today",
          opportunity_id: "opportunity-today",
          decision: "accepted",
          engagement_decision_version: 2,
          workflow_status: "repair_required",
          workflow_version: 2,
          completed_steps: ["decision_recorded", "client_group_resolved"],
          failed_step: "fee_commitment_created",
          safe_error_code: "CRM_ENGAGEMENT_FINANCE_STEP_FAILED",
          automatic_matter_creation: false
        },
        safe_error_codes: ["CRM_ENGAGEMENT_FINANCE_STEP_FAILED"],
        idempotent_replay: false
      }), 202);
      return jsonResponse(engagementBody({ outcome: "idempotent_replay", idempotent_replay: true }), 200);
    }
    if (url.pathname === "/api/crm/activities") return jsonResponse({
      outcome: "created",
      item: memoActivity(),
      audit_event: { action: "crm.activity.created" },
      safe_error_codes: [],
      idempotent_replay: false
    }, 201);
    throw new Error(`unexpected request: ${url.pathname}`);
  };
  try {
    const inquiryList = await fetchCrmInquiries();
    assert.equal(inquiryList.kind, "data");
    assert.equal(inquiryList.items[0].version, 7);
    assert.equal(inquiryList.items[0].opportunity_id, "opportunity-today");
    const inquiryDetail = await fetchCrmInquiryDetail({ inquiryId: "lead-today" });
    assert.equal(inquiryDetail.kind, "data");
    assert.equal(inquiryDetail.item.version, 7);
    assert.equal(inquiryDetail.item.opportunity.engagement_decision_version, 9);
    assert.equal("party_id" in inquiryDetail.item, false);
    assert.equal("owner_user_id" in inquiryDetail.item, false);
    assert.equal("engagement_client_group_id" in inquiryDetail.item.opportunity, false);
    assert.equal("engagement_fee_commitment_id" in inquiryDetail.item.opportunity, false);

    const scheduled = await createCrmConsultation({
      inquiryId: "lead-today",
      expectedInquiryVersion: inquiryDetail.item.version,
      consultation: { scheduled_start: "2026-07-31T10:00:00+09:00", scheduled_end: "2026-07-31T11:00:00+09:00", timezone: "Asia/Seoul" },
      idempotencyKey: "consultation-schedule-fixed",
      reason: "상담 일정을 확정함"
    });
    assert.equal(scheduled.kind, "data");
    assert.equal(scheduled.item.consultationId, "consultation-today");
    const scheduledCall = calls.find(({ url }) => url.pathname.endsWith("/consultations"));
    const scheduledPayload = JSON.parse(scheduledCall.init.body);
    assert.equal(scheduledCall.init.headers.authorization, "Bearer lawos_session_v1.client_consultation_test");
    assert.equal(scheduledPayload.expected_inquiry_version, inquiryDetail.item.version);
    assert.equal(scheduledPayload.tenant_id, "tenant_client_consultation");
    assert.equal(scheduledPayload.idempotency_key, "consultation-schedule-fixed");
    assert.equal(scheduledPayload.reason, "상담 일정을 확정함");
    assert.equal(scheduledPayload.consultation.matter_id, undefined);

    const updated = await updateCrmConsultation({
      consultationId: "consultation-today",
      expectedVersion: 1,
      fieldUpdates: {
        scheduled_start: "2026-07-31T11:30:00+09:00",
        scheduled_end: "2026-07-31T12:30:00+09:00",
        timezone: "Asia/Seoul"
      },
      idempotencyKey: "consultation-update-fixed",
      reason: "상담 시간을 조정함"
    });
    assert.equal(updated.kind, "data");
    assert.equal(updated.outcome, "updated");
    assert.equal(updated.item.version, 2);

    const completed = await completeCrmConsultation({
      consultationId: "consultation-today",
      expectedVersion: 2,
      completedAt: "2026-07-31T11:00:00+09:00",
      outcome: "후속 절차를 안내함",
      nextAction: "수임 여부 검토",
      idempotencyKey: "consultation-complete-fixed",
      reason: "상담 결과를 기록함"
    });
    assert.equal(completed.kind, "data");
    assert.equal(completed.idempotentReplay, true);
    assert.equal(completed.item.version, 3);
    assert.equal(completed.inquiry.version, 4);

    const outlook = await linkCrmConsultationOutlookEvent({
      consultationId: "consultation-today",
      expectedVersion: 1,
      idempotencyKey: "consultation-outlook-fixed",
      reason: "Outlook 일정 연결"
    });
    assert.equal(outlook.kind, "data");
    assert.equal(outlook.outlookCalendarState, "linked");
    assert.equal(outlook.item.outlookCalendar.webLink.startsWith("https://"), true);

    const engagement = await decideCrmEngagement({
      inquiryId: "lead-today",
      engagementDecision: "accepted",
      expectedInquiryVersion: inquiryDetail.item.version,
      expectedEngagementVersion: inquiryDetail.item.opportunity.engagement_decision_version,
      agreedAmount: 12_000_000,
      idempotencyKey: "engagement-decision-fixed",
      reason: "수임 여부를 확정함"
    });
    assert.equal(engagement.kind, "data");
    assert.equal(engagement.automaticMatterCreation, false);
    assert.equal(engagement.processing.automaticMatterCreation, false);
    assert.equal("ownerUserId" in engagement.item, false);
    assert.equal("partyId" in engagement.item, false);
    const engagementCall = calls.find(({ url }) => url.pathname.endsWith("/engagement-decisions"));
    const engagementPayload = JSON.parse(engagementCall.init.body);
    assert.equal(engagementPayload.expected_inquiry_version, inquiryDetail.item.version);
    assert.equal(engagementPayload.expected_engagement_version, inquiryDetail.item.opportunity.engagement_decision_version);

    mode = "repair_required";
    const repairRequired = await repairCrmEngagement({
      inquiryId: "lead-today",
      expectedWorkflowVersion: 1,
      idempotencyKey: "engagement-repair-required-fixed",
      reason: "수임료 반영 상태를 확인함"
    });
    assert.equal(repairRequired.kind, "data");
    assert.equal(repairRequired.outcome, "repair_required");
    assert.equal(repairRequired.uiState, "repair_required");
    assert.equal(repairRequired.processing.workflowVersion, 2);
    assert.equal(repairRequired.processing.failedStep, "fee_commitment_created");
    assert.equal(repairRequired.processing.safeErrorCode, "CRM_ENGAGEMENT_FINANCE_STEP_FAILED");
    assert.deepEqual(repairRequired.repairCommand, { inquiryId: "lead-today", expectedWorkflowVersion: 2 });
    mode = "allow";

    const repaired = await repairCrmEngagement({
      inquiryId: "lead-today",
      expectedWorkflowVersion: 1,
      idempotencyKey: "engagement-repair-fixed",
      reason: "수임 반영 상태를 재확인함"
    });
    assert.equal(repaired.kind, "data");
    assert.equal(repaired.idempotentReplay, true);

    const activities = await fetchCrmClientActivities();
    assert.equal(activities.kind, "data");
    assert.equal(activities.items.length, 2);
    assert.equal(activities.consultations.length, 1);
    assert.equal(activities.contactActivities.length, 1);
    assert.equal(activities.contactActivities[0].activityType, "note");
    assert.equal("partyId" in activities.items[0], false);
    assert.equal("ownerUserId" in activities.items[0], false);
    assert.equal("tenantId" in activities.items[0], false);

    const memo = await createCrmContactActivityMemo({
      inquiryId: "lead-today",
      activityId: "activity-memo",
      subject: "전화 메모",
      idempotencyKey: "activity-memo-fixed",
      reason: "전화 내용을 기록함"
    });
    assert.equal(memo.kind, "data");
    assert.equal(memo.item.activityType, "note");
    assert.equal("matterId" in memo.item, false);
    const memoCall = calls.find(({ url, init }) => url.pathname === "/api/crm/activities" && init.method === "POST");
    const memoPayload = JSON.parse(memoCall.init.body);
    assert.equal(memoPayload.activity.lead_id, "lead-today");
    assert.equal(memoPayload.activity.party_id, undefined);
    assert.equal(memoPayload.activity.opportunity_id, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("어댑터는 권한 없음·확인 필요·version 충돌·서버 오류를 서로 다른 상태로 반환하고 입력 누락은 요청하지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  const restoreStorage = installSignedSession();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return jsonResponse({ outcome: "denied", ui_state: "denied", safe_error_codes: ["CRM_INTAKE_UNAUTHORIZED_OMISSION"] }, 403);
  };
  try {
    const invalid = await completeCrmConsultation({ consultationId: "consultation-today", expectedVersion: 1, completedAt: "2026-07-31T11:00:00Z", outcome: "결과", nextAction: "다음", reason: "사유" });
    assert.equal(invalid.kind, "error");
    assert.equal(calls, 0);

    const denied = await createCrmConsultation({
      inquiryId: "lead-today",
      expectedInquiryVersion: 2,
      consultation: { scheduled_start: "2026-07-31T10:00:00+09:00", scheduled_end: "2026-07-31T11:00:00+09:00", timezone: "Asia/Seoul" },
      idempotencyKey: "consultation-denied-fixed",
      reason: "권한 확인"
    });
    assert.equal(denied.kind, "denied");
    globalThis.fetch = async () => jsonResponse({ outcome: "review_required", ui_state: "review_required", safe_error_codes: ["CRM_INTAKE_REVIEW_REQUIRED"] });
    const review = await createCrmConsultation({
      inquiryId: "lead-today",
      expectedInquiryVersion: 2,
      consultation: { scheduled_start: "2026-07-31T10:00:00+09:00", scheduled_end: "2026-07-31T11:00:00+09:00", timezone: "Asia/Seoul" },
      idempotencyKey: "consultation-review-fixed",
      reason: "검토 요청"
    });
    assert.equal(review.kind, "review_required");
    globalThis.fetch = async () => jsonResponse({ outcome: "blocked", ui_state: "conflict", safe_error_codes: ["CRM_CONSULTATION_VERSION_CONFLICT"] }, 409);
    const conflict = await createCrmConsultation({
      inquiryId: "lead-today",
      expectedInquiryVersion: 2,
      consultation: { scheduled_start: "2026-07-31T10:00:00+09:00", scheduled_end: "2026-07-31T11:00:00+09:00", timezone: "Asia/Seoul" },
      idempotencyKey: "consultation-conflict-fixed",
      reason: "충돌 확인"
    });
    assert.equal(conflict.kind, "conflict");
    globalThis.fetch = async () => jsonResponse({ outcome: "blocked", safe_error_codes: ["CRM_RUNTIME_FAILURE"] }, 503);
    const error = await createCrmConsultation({
      inquiryId: "lead-today",
      expectedInquiryVersion: 2,
      consultation: { scheduled_start: "2026-07-31T10:00:00+09:00", scheduled_end: "2026-07-31T11:00:00+09:00", timezone: "Asia/Seoul" },
      idempotencyKey: "consultation-error-fixed",
      reason: "오류 확인"
    });
    assert.equal(error.kind, "error");
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("활동 조회와 Outlook·메모 응답은 허용 목록과 완전성 검사를 통과한 경우만 화면에 전달한다", async () => {
  const restoreStorage = installSignedSession();
  const originalFetch = globalThis.fetch;
  const listBody = (items) => ({
    request_id: "request-activity-read",
    outcome: "passed",
    items,
    page_info: { returned_count: items.length, omitted_item_count: null },
    safe_error_codes: [],
    audit_hint_ref: "ui_cmp_g6_crm_activity_read_probe",
    ui_state: null,
    count_leak_prevented: true,
    production_ready_claim: false
  });
  let readPayload = listBody([activity(), memoActivity()]);
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://lawos.test");
    if (url.pathname === "/api/crm/activities" && (init?.method ?? "GET") === "GET") return jsonResponse(readPayload);
    throw new Error(`unexpected request: ${url.pathname}`);
  };
  try {
    const read = await fetchCrmClientActivities();
    assert.equal(read.kind, "data");
    assert.equal(read.consultations.length, 1);
    assert.equal(read.contactActivities.length, 1);
    assert.equal("partyId" in read.consultations[0], false);
    assert.equal("ownerUserId" in read.consultations[0], false);

    readPayload = listBody([activity(), activity()]);
    const duplicate = await fetchCrmClientActivities();
    assert.equal(duplicate.kind, "error");

    readPayload = listBody([activity({ tenant_id: "tenant-other" })]);
    const crossTenant = await fetchCrmClientActivities();
    assert.equal(crossTenant.kind, "error");

    const linkedBase = {
      state: "linked",
      web_link: "https://evil.example/calendar/item/blocked",
      created_at: "2026-07-31T00:00:00.000Z",
      mailbox_scope: "me",
      automatic_sync_enabled: false,
      provider_event_identifier_included: false,
      transaction_identifier_included: false
    };
    globalThis.fetch = async () => jsonResponse(consultationBody({
      outcome: "outlook_event_created",
      provider_call_executed: true,
      credential_material_included: false,
      production_ready_claim: false,
      item: activity({ outlook_calendar: linkedBase })
    }), 201);
    const badHost = await linkCrmConsultationOutlookEvent({
      consultationId: "consultation-today",
      expectedVersion: 1,
      idempotencyKey: "outlook-bad-host",
      reason: "허용 호스트 검사"
    });
    assert.equal(badHost.kind, "error");

    const missingReceipt = { ...linkedBase, web_link: "https://outlook.office.com/calendar/item/ok", created_at: null };
    globalThis.fetch = async () => jsonResponse(consultationBody({
      outcome: "outlook_event_created",
      provider_call_executed: true,
      credential_material_included: false,
      production_ready_claim: false,
      item: activity({ outlook_calendar: missingReceipt })
    }), 201);
    const incomplete = await linkCrmConsultationOutlookEvent({
      consultationId: "consultation-today",
      expectedVersion: 1,
      idempotencyKey: "outlook-missing-receipt",
      reason: "Outlook 영수증 완전성 검사"
    });
    assert.equal(incomplete.kind, "error");

    globalThis.fetch = async () => jsonResponse(consultationBody({
      outcome: "outlook_event_created",
      provider_call_executed: true,
      credential_material_included: true,
      production_ready_claim: false,
      item: activity({ outlook_calendar: { ...linkedBase, web_link: "https://outlook.office.com/calendar/item/ok" } })
    }), 201);
    const credentialLeak = await linkCrmConsultationOutlookEvent({
      consultationId: "consultation-today",
      expectedVersion: 1,
      idempotencyKey: "outlook-credential-leak",
      reason: "자격 증명 비노출 검사"
    });
    assert.equal(credentialLeak.kind, "error");

    globalThis.fetch = async () => jsonResponse({
      outcome: "created",
      item: memoActivity({ activity_type: "call" }),
      audit_event: { action: "crm.activity.created" },
      safe_error_codes: [],
      idempotent_replay: false,
      production_ready_claim: false
    }, 201);
    const wrongMemoType = await createCrmContactActivityMemo({
      inquiryId: "lead-today",
      activityId: "activity-memo",
      subject: "전화 메모",
      idempotencyKey: "memo-wrong-type",
      reason: "메모 type allowlist 검사"
    });
    assert.equal(wrongMemoType.kind, "error");

    globalThis.fetch = async () => jsonResponse({
      outcome: "created",
      item: memoActivity({ crm_activity_id: "activity-confidential-memo", resource_id: "activity-confidential-memo", confidential: true, subject: "보호된 이력", confidential_subject_included: false, confidential_details_included: false, outcome: null, next_action: null }),
      audit_event: { action: "crm.activity.created" },
      safe_error_codes: [],
      idempotent_replay: false,
      production_ready_claim: false
    }, 201);
    const confidentialMemo = await createCrmContactActivityMemo({
      inquiryId: "lead-today",
      activityId: "activity-confidential-memo",
      subject: "민감한 메모",
      confidential: true,
      idempotencyKey: "memo-confidential",
      reason: "비밀 메모 경계 검사"
    });
    assert.equal(confidentialMemo.kind, "data");
    assert.equal(confidentialMemo.item.subject, "보호된 이력");
    assert.equal(confidentialMemo.item.outcome, null);
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("malformed 활동 응답과 수임 반영 불일치는 Promise rejection 없이 fail-closed 한다", async () => {
  const restoreStorage = installSignedSession();
  const originalFetch = globalThis.fetch;
  const consultationRequest = {
    inquiryId: "lead-today",
    expectedInquiryVersion: 2,
    consultation: {
      scheduled_start: "2026-07-31T10:00:00+09:00",
      scheduled_end: "2026-07-31T11:00:00+09:00",
      timezone: "Asia/Seoul"
    },
    idempotencyKey: "malformed-consultation-response",
    reason: "malformed 응답 차단"
  };
  try {
    let forbiddenMemoCalls = 0;
    globalThis.fetch = async () => {
      forbiddenMemoCalls += 1;
      throw new Error("party/opportunity input must not reach API");
    };
    const forbiddenInternalIds = await createCrmContactActivityMemo({
      inquiryId: "lead-today",
      partyId: "party-internal",
      opportunityId: "opportunity-internal",
      subject: "내부 ID 입력 차단",
      idempotencyKey: "memo-internal-id-rejected",
      reason: "authoritative lead 연결"
    });
    assert.equal(forbiddenInternalIds.kind, "error");
    assert.equal(forbiddenMemoCalls, 0);

    globalThis.fetch = async () => jsonResponse(consultationBody({ item: activity({ outcome: { raw: "must-not-escape" } }) }), 201);
    const malformedWrite = await createCrmConsultation(consultationRequest);
    assert.equal(malformedWrite.kind, "error");

    globalThis.fetch = async () => jsonResponse(consultationBody({ outcome: "updated", item: activity({ outcome: { raw: "must-not-escape" } }) }), 200);
    const malformedPatch = await updateCrmConsultation({
      consultationId: "consultation-today",
      expectedVersion: 1,
      fieldUpdates: { subject: "상담 제목 수정" },
      idempotencyKey: "malformed-consultation-patch",
      reason: "malformed patch 응답 차단"
    });
    assert.equal(malformedPatch.kind, "error");

    globalThis.fetch = async () => jsonResponse({
      request_id: "malformed-activity-read",
      outcome: "passed",
      items: [activity({ outcome: { raw: "must-not-escape" } })],
      page_info: { returned_count: 1, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: "ui_cmp_g6_crm_activity_read_probe",
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false
    });
    const malformedRead = await fetchCrmClientActivities();
    assert.equal(malformedRead.kind, "error");

    globalThis.fetch = async () => jsonResponse(repairRequiredBody({
      item: { engagement_workflow_id: "workflow-other" }
    }), 202);
    const workflowMismatch = await repairCrmEngagement({
      inquiryId: "lead-today",
      expectedWorkflowVersion: 2,
      idempotencyKey: "repair-workflow-mismatch",
      reason: "workflow ID 불일치 차단"
    });
    assert.equal(workflowMismatch.kind, "error");

    globalThis.fetch = async () => jsonResponse(repairRequiredBody({
      item: { engagement_workflow_status: "completed" }
    }), 202);
    const statusMismatch = await repairCrmEngagement({
      inquiryId: "lead-today",
      expectedWorkflowVersion: 2,
      idempotencyKey: "repair-status-mismatch",
      reason: "workflow 상태 불일치 차단"
    });
    assert.equal(statusMismatch.kind, "error");

    globalThis.fetch = async () => jsonResponse(repairRequiredBody({
      item: { engagement_decision: "declined" }
    }), 202);
    const decisionMismatch = await repairCrmEngagement({
      inquiryId: "lead-today",
      expectedWorkflowVersion: 2,
      idempotencyKey: "repair-decision-mismatch",
      reason: "수임 결정 불일치 차단"
    });
    assert.equal(decisionMismatch.kind, "error");

    globalThis.fetch = async () => jsonResponse(repairRequiredBody({
      processing: { failed_step: null, safe_error_code: null }
    }), 202);
    const missingRepairReceipt = await repairCrmEngagement({
      inquiryId: "lead-today",
      expectedWorkflowVersion: 2,
      idempotencyKey: "repair-missing-receipt",
      reason: "복구 영수증 필수값 차단"
    });
    assert.equal(missingRepairReceipt.kind, "error");
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("상담·Outlook·수임·메모 성공 응답은 요청 대상·signed tenant·safe code 전건을 검증한다", async () => {
  const restoreStorage = installSignedSession();
  const originalFetch = globalThis.fetch;
  let responseBody;
  let responseStatus = 200;
  globalThis.fetch = async () => jsonResponse(responseBody, responseStatus);

  const scheduleArgs = {
    inquiryId: "lead-today",
    expectedInquiryVersion: 7,
    consultation: {
      scheduled_start: "2026-07-31T10:00:00+09:00",
      scheduled_end: "2026-07-31T11:00:00+09:00",
      timezone: "Asia/Seoul"
    },
    idempotencyKey: "binding-schedule",
    reason: "응답 결속 검사"
  };
  const updateArgs = {
    consultationId: "consultation-today",
    expectedVersion: 1,
    fieldUpdates: { subject: "제목 수정" },
    idempotencyKey: "binding-update",
    reason: "응답 결속 검사"
  };
  const completeArgs = {
    consultationId: "consultation-today",
    expectedVersion: 2,
    completedAt: "2026-07-31T11:00:00+09:00",
    outcome: "상담 결과",
    nextAction: "후속 연락",
    idempotencyKey: "binding-complete",
    reason: "응답 결속 검사"
  };
  const outlookArgs = {
    consultationId: "consultation-today",
    expectedVersion: 1,
    idempotencyKey: "binding-outlook",
    reason: "응답 결속 검사"
  };
  const engagementArgs = {
    inquiryId: "lead-today",
    engagementDecision: "accepted",
    expectedInquiryVersion: 7,
    expectedEngagementVersion: 9,
    agreedAmount: 12_000_000,
    idempotencyKey: "binding-engagement",
    reason: "응답 결속 검사"
  };
  const repairArgs = {
    inquiryId: "lead-today",
    expectedWorkflowVersion: 1,
    idempotencyKey: "binding-repair",
    reason: "응답 결속 검사"
  };
  const memoArgs = {
    inquiryId: "lead-today",
    activityId: "activity-memo",
    subject: "전화 메모",
    idempotencyKey: "binding-memo",
    reason: "응답 결속 검사"
  };

  const validOutlookBody = () => consultationBody({
    outcome: "outlook_event_created",
    provider_call_executed: true,
    credential_material_included: false,
    production_ready_claim: false,
    item: activity({
      outlook_calendar: {
        state: "linked",
        web_link: "https://outlook.office.com/calendar/item/binding",
        created_at: "2026-07-31T00:00:00.000Z",
        mailbox_scope: "me",
        automatic_sync_enabled: false,
        provider_event_identifier_included: false,
        transaction_identifier_included: false
      }
    })
  });
  const validMemoBody = () => ({
    outcome: "created",
    item: memoActivity(),
    audit_event: { action: "crm.activity.created" },
    safe_error_codes: [],
    idempotent_replay: false,
    production_ready_claim: false
  });
  const validByOperation = {
    schedule: () => consultationBody(),
    update: () => consultationBody({
      outcome: "updated",
      item: activity({ version: 2 }),
      inquiry: inquiry(3)
    }),
    complete: () => consultationBody({
      outcome: "completed",
      item: activity({ version: 3, completed_at: "2026-07-31T02:00:00.000Z", outcome: "상담 결과", next_action: "후속 연락" }),
      inquiry: inquiry(4)
    }),
    outlook: validOutlookBody,
    engagement: () => engagementBody(),
    repair: () => engagementBody(),
    memo: validMemoBody
  };
  const callByOperation = {
    schedule: () => createCrmConsultation(scheduleArgs),
    update: () => updateCrmConsultation(updateArgs),
    complete: () => completeCrmConsultation(completeArgs),
    outlook: () => linkCrmConsultationOutlookEvent(outlookArgs),
    engagement: () => decideCrmEngagement(engagementArgs),
    repair: () => repairCrmEngagement(repairArgs),
    memo: () => createCrmContactActivityMemo(memoArgs)
  };
  const operationNames = Object.keys(validByOperation);
  const assertRejected = async (operation, mutate, label) => {
    responseStatus = operation === "outlook" || operation === "engagement" || operation === "schedule" ? 201 : 200;
    responseBody = mutate(validByOperation[operation]());
    const result = await callByOperation[operation]();
    assert.equal(result.kind, "error", operation + ": " + label);
  };

  try {
    for (const operation of operationNames) {
      await assertRejected(operation, (body) => operation === "schedule" || operation === "engagement" || operation === "repair"
        ? { ...body, inquiry: { ...(body.inquiry ?? {}), lead_id: "lead-other" } }
        : operation === "memo"
          ? { ...body, item: memoActivity({ lead_id: "lead-other" }) }
          : { ...body, item: activity({ crm_activity_id: "consultation-other", version: operation === "complete" ? 3 : operation === "update" ? 2 : 2 }) }, "target mismatch");

      await assertRejected(operation, (body) => operation === "engagement" || operation === "repair"
        ? { ...body, item: { ...body.item, tenant_id: "tenant-other" } }
        : operation === "memo"
          ? { ...body, item: memoActivity({ tenant_id: "tenant-other" }) }
          : { ...body, item: activity({ tenant_id: "tenant-other", version: operation === "complete" ? 3 : operation === "update" ? 2 : 2 }) }, "cross-tenant response");

      await assertRejected(operation, (body) => ({ ...body, safe_error_codes: ["CRM_SAFE_CODE", "not-safe"] }), "malformed safe_error_codes");
    }
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("오늘 상담 모델은 Asia/Seoul 날짜·비밀 상담 경계와 명시 선택만 사용한다", () => {
  const today = {
    ...safeConsultation(),
    consultationId: "consultation-visible",
    activityId: "consultation-visible"
  };
  const confidential = safeConsultation({
    consultationId: "consultation-confidential",
    activityId: "consultation-confidential",
    partyDisplayName: "한빛건설",
    subject: "보호된 상담",
    confidential: true,
    confidentialSubjectIncluded: false,
    confidentialDetailsIncluded: false,
    outcome: null,
    nextAction: null,
    scheduledStart: "2026-07-31T08:00:00.000Z"
  });
  const tomorrow = safeConsultation({
    consultationId: "consultation-tomorrow",
    activityId: "consultation-tomorrow",
    scheduledStart: "2026-08-01T01:00:00.000Z",
    timezone: "America/Los_Angeles"
  });
  const result = {
    kind: "data",
    outcome: "passed",
    items: [today, confidential, tomorrow]
  };
  const idle = buildClientConsultationModel({ consultationsResult: result, today: "2026-07-31" });
  assert.deepEqual(CLIENT_CONSULTATION_STATUS_TABS.map(({ code, label }) => ({ code, label })), [
    { code: "today", label: "오늘 상담" },
    { code: "all", label: "전체" },
    { code: "upcoming", label: "예정" },
    { code: "completed", label: "완료" }
  ]);
  assert.equal(idle.selectedConsultation, null);
  assert.equal(idle.todayConsultations.length, 2);
  assert.equal(idle.consultations.length, 2);
  assert.equal(idle.consultations.some((item) => item.consultationId === "consultation-tomorrow"), false);
  assert.equal(idle.todayConsultations[1].subject, "보호된 상담");
  assert.equal(idle.todayConsultations[1].outcome, null);
  assert.equal(idle.todayConsultations[1].nextAction, null);
  assert.equal(idle.todayConsultations[0].status, "scheduled");
  assert.equal(idle.todayConsultations[0].statusLabel, "상담 예정");
  assert.equal(clientConsultationStatusLabel(idle.todayConsultations[0].status), "상담 예정");
  assert.equal(clientConsultationStatusLabel("completed"), "상담 완료");
  const completed = normalizeClientConsultation(safeConsultation({
    consultationId: "consultation-completed",
    activityId: "consultation-completed",
    completedAt: "2026-07-31T03:00:00.000Z",
    outcome: "요청 범위를 확인함",
    nextAction: "견적 검토 후 회신"
  }));
  assert.equal(completed?.status, "completed");
  assert.equal(completed?.statusLabel, "상담 완료");
  assert.equal(completed?.outcome, "요청 범위를 확인함");
  assert.equal(completed?.nextAction, "견적 검토 후 회신");
  const confidentialCompleted = normalizeClientConsultation(safeConsultation({
    consultationId: "consultation-confidential-completed",
    activityId: "consultation-confidential-completed",
    subject: "보호된 상담",
    confidential: true,
    confidentialSubjectIncluded: false,
    confidentialDetailsIncluded: false,
    completedAt: "2026-07-31T03:00:00.000Z",
    outcome: null,
    nextAction: null
  }));
  assert.equal(confidentialCompleted?.status, "completed");
  assert.equal(confidentialCompleted?.outcome, null);
  assert.equal(confidentialCompleted?.nextAction, null);
  assert.equal("partyId" in idle.todayConsultations[0], false);
  assert.equal("ownerUserId" in idle.todayConsultations[0], false);
  assert.equal("matterId" in idle.todayConsultations[0], false);
  assert.equal(resolveClientConsultationSelection("consultation-visible", idle.authorizedConsultationIds), "consultation-visible");
  assert.equal(resolveClientConsultationSelection("consultation-hidden", idle.authorizedConsultationIds), null);
  const selected = buildClientConsultationModel({ consultationsResult: result, requestedConsultationId: "consultation-visible", today: "2026-07-31" });
  assert.equal(selected.selectedConsultation?.consultationId, "consultation-visible");
  const hiddenSelection = buildClientConsultationModel({ consultationsResult: result, requestedConsultationId: "consultation-tomorrow", today: "2026-07-31" });
  assert.equal(hiddenSelection.selectedConsultation, null);
  assert.equal(hiddenSelection.requestedConsultationAvailable, false);
  const malformed = buildClientConsultationModel({ consultationsResult: { kind: "data", items: [safeConsultation({ subject: "보호된 상담", confidential: true, confidentialSubjectIncluded: false, confidentialDetailsIncluded: false, outcome: "원문 노출", nextAction: null })] }, today: "2026-07-31" });
  assert.equal(malformed.state, "error");
  assert.deepEqual(malformed.consultations, []);
  assert.equal(normalizeClientConsultation({ ...today, matter_id: "matter-must-not-pass" }), null);
});
