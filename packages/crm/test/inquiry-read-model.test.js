import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CRM_INQUIRY_VISIBLE_STATUSES,
  compareCrmInquirySummaries,
  normalizeCrmInquiryVisibleStatus,
  projectCrmInquiry,
  summarizeCrmInquiry,
} from "../src/index.js";

const input = JSON.parse(readFileSync(
  new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/input.json",
    import.meta.url,
  ),
  "utf8",
));

const expectedDashboard = JSON.parse(readFileSync(
  new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/expected-dashboard.json",
    import.meta.url,
  ),
  "utf8",
));

const TENANT = "tenant_client_inquiry_t02";

function leadRecord(inquiry, overrides = {}) {
  return {
    model_type: "Lead",
    tenant_id: TENANT,
    party_id: `party_${inquiry.client_group_id}`,
    display_name: inquiry.lead_id,
    status: "active",
    owner_user_id: inquiry.assigned_user_id ?? "user_unassigned",
    next_action:
      inquiry.inquiry_status === "closed"
        ? null
        : "문의 확인",
    version: 1,
    ...inquiry,
    ...overrides,
  };
}

const opportunities = input.inquiries
  .filter(({ opportunity_id }) => opportunity_id)
  .map((inquiry) => ({
    model_type: "Opportunity",
    tenant_id: TENANT,
    opportunity_id: inquiry.opportunity_id,
    lead_id: inquiry.lead_id,
    party_id: `party_${inquiry.client_group_id}`,
    display_name: inquiry.opportunity_id,
    stage:
      inquiry.engagement_decision === "declined"
        ? "closed_lost"
        : "qualified",
    engagement_decision: inquiry.engagement_decision,
    status: "active",
    owner_user_id: inquiry.assigned_user_id,
  }));

const activities = input.consultations.map((consultation) => {
  const inquiry = input.inquiries.find(
    ({ lead_id }) => lead_id === consultation.lead_id,
  );
  return {
    model_type: "CRMActivity",
    tenant_id: TENANT,
    crm_activity_id: consultation.activity_id,
    lead_id: consultation.lead_id,
    party_id: `party_${inquiry.client_group_id}`,
    activity_type: "meeting",
    activity_kind: "consultation",
    subject: "수임 상담",
    confidential: false,
    status: "active",
    owner_user_id: inquiry.assigned_user_id,
    scheduled_start: consultation.scheduled_start,
    scheduled_end: consultation.scheduled_end,
    timezone: consultation.timezone,
    completed_at: consultation.completed_at,
  };
});

test("CL-P3-W02-T02 기준 fixture의 문의를 여섯 사용자 상태와 같은 규칙으로 조합한다", () => {
  assert.deepEqual(
    CRM_INQUIRY_VISIBLE_STATUSES.map(({ label }) => label),
    ["새 문의", "확인 중", "상담 예정", "수임 검토 중", "수임 확정", "수임하지 않음"],
  );
  const counts = Object.fromEntries(
    CRM_INQUIRY_VISIBLE_STATUSES.map(({ label }) => [label, 0]),
  );
  for (const inquiry of input.inquiries) {
    const projection = projectCrmInquiry({
      lead: leadRecord(inquiry),
      opportunities,
      activities,
    });
    counts[projection.visible_status_label] += 1;
    assert.equal(
      summarizeCrmInquiry(projection).visible_status,
      projection.visible_status,
    );
  }
  assert.deepEqual(counts, expectedDashboard.inquiry_status_counts);
  assert.equal(normalizeCrmInquiryVisibleStatus("상담 예정").code, "consultation_scheduled");
  assert.equal(normalizeCrmInquiryVisibleStatus("engaged").label, "수임 확정");
  assert.equal(normalizeCrmInquiryVisibleStatus("없는 상태"), null);
});

test("CL-P3-W02-T02 상태 우선순위는 수임 결정→종료→수임 검토→상담→Lead 순이다", () => {
  const accepted = input.inquiries.find(
    ({ engagement_decision }) => engagement_decision === "accepted",
  );
  const acceptedProjection = projectCrmInquiry({
    lead: leadRecord(accepted, {
      inquiry_status: "closed",
      next_action: null,
    }),
    opportunities,
    activities,
  });
  assert.equal(acceptedProjection.visible_status_label, "수임 확정");
  assert.equal(acceptedProjection.needs_review, true);
  assert.deepEqual(
    acceptedProjection.review_codes,
    ["accepted_inquiry_is_closed"],
  );

  const reviewing = leadRecord({
    lead_id: "lead_reviewing_only",
    client_group_id: "client_reviewing_only",
    inquiry_status: "reviewing",
    assigned_user_id: "user_attorney",
    source: "manual",
    received_at: "2026-07-29T00:30:00.000Z",
    opportunity_id: null,
    engagement_decision: null,
  });
  assert.equal(
    projectCrmInquiry({
      lead: reviewing,
      opportunities: [],
      activities: [],
    }).visible_status_label,
    "확인 중",
  );

  const unassigned = projectCrmInquiry({
    lead: leadRecord({
      lead_id: "lead_unassigned",
      client_group_id: "client_unassigned",
      inquiry_status: "new",
      assigned_user_id: null,
      source: "manual",
      received_at: "2026-07-29T00:20:00.000Z",
      opportunity_id: null,
      engagement_decision: null,
    }, {
      owner_user_id: "user_record_owner",
      assigned_user_id: null,
    }),
    opportunities: [],
    activities: [],
  });
  assert.equal(unassigned.assigned_user_id, null);
});

test("CL-P3-W02-T02 같은 고객의 다른 문의 Activity를 섞지 않고 비밀 상담 내용을 가린다", () => {
  const lead = leadRecord({
    lead_id: "lead_private_consultation",
    client_group_id: "client_shared",
    inquiry_status: "reviewing",
    assigned_user_id: "user_attorney",
    source: "manual",
    received_at: "2026-07-29T00:30:00.000Z",
    opportunity_id: null,
    engagement_decision: null,
  });
  const projection = projectCrmInquiry({
    lead,
    activities: [
      {
        model_type: "CRMActivity",
        tenant_id: TENANT,
        crm_activity_id: "consultation_other_lead",
        lead_id: "lead_other",
        party_id: lead.party_id,
        activity_type: "meeting",
        scheduled_start: "2026-07-31T01:00:00.000Z",
        completed_at: null,
        status: "active",
      },
      {
        model_type: "CRMActivity",
        tenant_id: TENANT,
        crm_activity_id: "consultation_private",
        lead_id: lead.lead_id,
        party_id: lead.party_id,
        activity_type: "meeting",
        scheduled_start: "2026-07-30T01:00:00.000Z",
        completed_at: null,
        confidential: true,
        subject: "노출되면 안 되는 상담 내용",
        outcome: "노출되면 안 되는 결과",
        next_action: "노출되면 안 되는 행동",
        status: "active",
      },
    ],
  });
  assert.equal(projection.visible_status_label, "상담 예정");
  assert.equal(projection.consultations.length, 1);
  assert.equal(projection.consultations[0].subject, "보호된 상담");
  assert.equal(projection.consultations[0].outcome, null);
  assert.equal(projection.consultations[0].next_action, null);
  assert.equal(
    JSON.stringify(projection).includes("노출되면 안 되는"),
    false,
  );
});

test("CL-P3-W02-T02 목록은 접수 시각 내림차순·Lead ID 오름차순으로 안정 정렬한다", () => {
  const summaries = [
    { lead_id: "lead_b", received_at: "2026-07-30T00:00:00.000Z" },
    { lead_id: "lead_c", received_at: "2026-07-31T00:00:00.000Z" },
    { lead_id: "lead_a", received_at: "2026-07-30T00:00:00.000Z" },
  ].sort(compareCrmInquirySummaries);
  assert.deepEqual(
    summaries.map(({ lead_id }) => lead_id),
    ["lead_c", "lead_a", "lead_b"],
  );
});
