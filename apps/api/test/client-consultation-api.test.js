import assert from "node:assert/strict";
import test from "node:test";

import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import {
  createCrmIntakeRuntimeContext,
} from "../src/crm-intake-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const LEAD_ID = "lead_client_consultation_api_t03";
const SECRET_LEAD_ID = "lead_client_consultation_secret_api_t03";
const USER = "user_client_consultation_api_t03";

function reviewedInquiry(overrides = {}) {
  return {
    model_type: "Lead",
    lead_id: LEAD_ID,
    tenant_id: TENANT,
    party_id: "party_client_consultation_api_t03",
    display_name: "가나다 주식회사 법률 상담 문의",
    status: "active",
    owner_user_id: USER,
    assigned_user_id: USER,
    inquiry_status: "reviewing",
    source: "outlook_addin",
    received_at: "2026-07-30T08:55:00.000Z",
    next_action: "상담 일정 확인",
    version: 2,
    ...overrides,
  };
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function createClient(baseUrl) {
  const sessionHeaders = await apiSessionHeaders(baseUrl);
  return async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...sessionHeaders,
        ...(options.body === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    });
    return { status: response.status, body: await response.json() };
  };
}

function commonBody(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "client-consultation-write",
    audit_hint_ref: "client-consultation-audit",
    ...overrides,
  };
}

function scheduleBody(overrides = {}) {
  return commonBody({
    expected_inquiry_version: 2,
    consultation: {
      subject: "초기 법률 상담",
      scheduled_start: "2026-08-01T10:00:00+09:00",
      scheduled_end: "2026-08-01T11:00:00+09:00",
      timezone: "Asia/Seoul",
      next_action: "상담 준비",
    },
    reason: "의뢰인과 상담 일정을 확정함",
    idempotency_key: "client-consultation-schedule-api-1",
    ...overrides,
  });
}

function inquiryQuery() {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: "client-consultation-read",
    audit_hint_ref: "client-consultation-read-audit",
  });
}

test("VC-CL-CON-001 / CL-P3-W02-T03 실제 API는 앱 기준 상담 예약·완료와 문의 상태 재계산을 일관되게 수행한다", async () => {
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      reviewedInquiry(),
      reviewedInquiry({
        lead_id: SECRET_LEAD_ID,
        party_id: "party_client_consultation_secret_api_t03",
        display_name: "비밀 상담 문의",
      }),
    ],
  });
  const crmIntakeRuntime = createCrmIntakeRuntimeContext({ crmRepository });

  await withServer({ crmIntakeRuntime }, async (baseUrl) => {
    const request = await createClient(baseUrl);
    const health = await request("/api/health");
    const crm = health.body.bounded_contexts.find(
      ({ bounded_context }) => bounded_context === "crm-intake",
    );
    assert.ok(
      crm.endpoints.includes(
        "POST /api/crm/inquiries/:id/consultations",
      ),
    );

    const scheduled = await request(
      `/api/crm/inquiries/${LEAD_ID}/consultations`,
      { method: "POST", body: scheduleBody() },
    );
    assert.equal(scheduled.status, 201);
    assert.equal(scheduled.body.outcome, "scheduled");
    assert.equal(scheduled.body.item.activity_kind, "consultation");
    assert.equal(scheduled.body.item.lead_id, LEAD_ID);
    assert.equal(
      scheduled.body.item.scheduled_start,
      "2026-08-01T01:00:00.000Z",
    );
    assert.equal(
      scheduled.body.item.scheduled_end,
      "2026-08-01T02:00:00.000Z",
    );
    assert.equal(scheduled.body.item.timezone, "Asia/Seoul");
    assert.equal(scheduled.body.item.version, 1);
    assert.equal(scheduled.body.inquiry.version, 3);
    assert.equal(scheduled.body.inquiry.next_action, "상담 준비");
    assert.equal(scheduled.body.item.direct_matter_reference_included, false);
    assert.equal(
      JSON.stringify(scheduled.body.audit_event).includes("초기 법률 상담"),
      false,
    );

    const replay = await request(
      `/api/crm/inquiries/${LEAD_ID}/consultations`,
      { method: "POST", body: scheduleBody() },
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);
    assert.equal(replay.body.item.version, 1);

    const common = inquiryQuery();
    const detailScheduled = await request(
      `/api/crm/inquiries/${LEAD_ID}?${common}`,
    );
    assert.equal(detailScheduled.status, 200);
    assert.equal(
      detailScheduled.body.item.visible_status_label,
      "상담 예정",
    );
    assert.equal(
      detailScheduled.body.item.consultations[0].scheduled_start,
      "2026-08-01T01:00:00.000Z",
    );

    const activityId = scheduled.body.item.crm_activity_id;
    const completionBody = commonBody({
      expected_version: 1,
      field_updates: {
        completed_at: "2026-08-01T11:05:00+09:00",
        outcome: "수임 범위와 다음 절차를 안내함",
        next_action: "수임 여부 검토",
      },
      reason: "상담을 완료하고 후속 조치를 기록함",
      idempotency_key: "client-consultation-complete-api-1",
    });
    const completed = await request(
      `/api/crm/activities/${activityId}`,
      {
        method: "PATCH",
        body: completionBody,
      },
    );
    assert.equal(completed.status, 200);
    assert.equal(completed.body.outcome, "completed");
    assert.equal(
      completed.body.item.completed_at,
      "2026-08-01T02:05:00.000Z",
    );
    assert.equal(completed.body.item.outcome, "수임 범위와 다음 절차를 안내함");
    assert.equal(completed.body.item.next_action, "수임 여부 검토");
    assert.equal(completed.body.item.version, 2);
    assert.equal(completed.body.inquiry.version, 4);
    assert.equal(completed.body.inquiry.next_action, "수임 여부 검토");
    assert.equal(
      JSON.stringify(completed.body.audit_event).includes(
        "수임 범위와 다음 절차",
      ),
      false,
    );
    const completionReplay = await request(
      `/api/crm/activities/${activityId}`,
      { method: "PATCH", body: completionBody },
    );
    assert.equal(completionReplay.status, 200);
    assert.equal(completionReplay.body.outcome, "idempotent_replay");
    assert.equal(completionReplay.body.item.version, 2);

    const confidentialConsultation = {
      ...scheduleBody().consultation,
      subject: "응답에 노출되면 안 되는 비밀 상담",
      confidential: true,
      next_action: "응답에 노출되면 안 되는 준비 사항",
    };
    const matterShortcut = await request(
      `/api/crm/inquiries/${SECRET_LEAD_ID}/consultations`,
      {
        method: "POST",
        body: scheduleBody({
          consultation: {
            ...confidentialConsultation,
            matter_id: "matter_shortcut_must_be_rejected",
          },
          idempotency_key: "client-consultation-matter-shortcut-api-1",
        }),
      },
    );
    assert.equal(matterShortcut.status, 400);
    assert.deepEqual(
      matterShortcut.body.safe_error_codes,
      ["CRM_INTAKE_API_VALIDATION_ERROR"],
    );

    const confidentialScheduled = await request(
      `/api/crm/inquiries/${SECRET_LEAD_ID}/consultations`,
      {
        method: "POST",
        body: scheduleBody({
          consultation: confidentialConsultation,
          reason: "응답에 노출되면 안 되는 예약 사유",
          idempotency_key: "client-consultation-secret-schedule-api-1",
        }),
      },
    );
    assert.equal(confidentialScheduled.status, 201);
    assert.equal(confidentialScheduled.body.item.subject, "보호된 상담");
    assert.equal(confidentialScheduled.body.item.outcome, null);
    assert.equal(confidentialScheduled.body.item.next_action, null);
    assert.equal(
      confidentialScheduled.body.item.confidential_details_included,
      false,
    );
    assert.equal(
      JSON.stringify(confidentialScheduled.body).includes(
        "응답에 노출되면 안 되는",
      ),
      false,
    );

    const confidentialCompleted = await request(
      `/api/crm/activities/${confidentialScheduled.body.item.crm_activity_id}`,
      {
        method: "PATCH",
        body: commonBody({
          expected_version: 1,
          field_updates: {
            completed_at: "2026-08-01T11:05:00+09:00",
            outcome: "응답에 노출되면 안 되는 상담 결과",
            next_action: "응답에 노출되면 안 되는 후속 행동",
          },
          reason: "응답에 노출되면 안 되는 완료 사유",
          idempotency_key: "client-consultation-secret-complete-api-1",
        }),
      },
    );
    assert.equal(confidentialCompleted.status, 200);
    assert.equal(confidentialCompleted.body.item.subject, "보호된 상담");
    assert.equal(confidentialCompleted.body.item.outcome, null);
    assert.equal(confidentialCompleted.body.item.next_action, null);
    assert.equal(
      JSON.stringify(confidentialCompleted.body).includes(
        "응답에 노출되면 안 되는",
      ),
      false,
    );

    const detailCompleted = await request(
      `/api/crm/inquiries/${LEAD_ID}?${common}`,
    );
    assert.equal(detailCompleted.status, 200);
    assert.equal(detailCompleted.body.item.visible_status_label, "확인 중");
    const list = await request(`/api/crm/inquiries?${common}`);
    const listed = list.body.items.find(({ lead_id }) => lead_id === LEAD_ID);
    assert.equal(listed.visible_status, detailCompleted.body.item.visible_status);

    const stale = await request(
      `/api/crm/activities/${activityId}`,
      {
        method: "PATCH",
        body: commonBody({
          expected_version: 1,
          field_updates: { next_action: "다시 연락" },
          reason: "stale 변경 시도",
          idempotency_key: "client-consultation-stale-api-1",
        }),
      },
    );
    assert.equal(stale.status, 409);
    assert.deepEqual(
      stale.body.safe_error_codes,
      ["CRM_CONSULTATION_VERSION_CONFLICT"],
    );

    const crossTenant = await request(
      `/api/crm/inquiries/${LEAD_ID}/consultations`,
      {
        method: "POST",
        body: scheduleBody({
          tenant_id: "tenant_not_signed",
          idempotency_key: "client-consultation-cross-tenant",
        }),
      },
    );
    assert.equal(crossTenant.status, 403);
    assert.deepEqual(
      crossTenant.body.safe_error_codes,
      ["CRM_INTAKE_UNAUTHORIZED_OMISSION"],
    );

    for (const responseBody of [
      scheduled.body,
      completed.body,
      detailCompleted.body,
      list.body,
    ]) {
      assert.equal(JSON.stringify(responseBody).includes("\"matter_id\""), false);
    }
  });
});
