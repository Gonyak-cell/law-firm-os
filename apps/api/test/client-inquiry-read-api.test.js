import assert from "node:assert/strict";
import test from "node:test";

import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { inquiryEmailEvidenceId } from "../../../packages/email-dms/src/inquiry-evidence-model.js";
import {
  createCrmIntakeRuntimeContext,
  handleCrmIntakeApiRequest,
} from "../src/crm-intake-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const USER = "user_client_inquiry_read";

function lead({
  id,
  inquiryStatus,
  receivedAt,
  opportunityId = null,
} = {}) {
  return {
    model_type: "Lead",
    lead_id: id,
    tenant_id: TENANT,
    party_id: `party_${id}`,
    display_name: `${id} 의뢰인 문의`,
    status: "active",
    owner_user_id: USER,
    assigned_user_id: USER,
    inquiry_status: inquiryStatus,
    source: id === "lead_new" ? "outlook_addin" : "manual",
    received_at: receivedAt,
    next_action: inquiryStatus === "closed" ? null : "문의 확인",
    version: 1,
    opportunity_id: opportunityId,
  };
}

function inquiryRecords() {
  const leads = [
    lead({
      id: "lead_new",
      inquiryStatus: "new",
      receivedAt: "2026-07-30T06:00:00.000Z",
    }),
    lead({
      id: "lead_reviewing",
      inquiryStatus: "reviewing",
      receivedAt: "2026-07-30T05:00:00.000Z",
    }),
    lead({
      id: "lead_consultation",
      inquiryStatus: "reviewing",
      receivedAt: "2026-07-30T04:00:00.000Z",
    }),
    lead({
      id: "lead_engagement_review",
      inquiryStatus: "reviewing",
      receivedAt: "2026-07-30T03:00:00.000Z",
      opportunityId: "opportunity_review",
    }),
    lead({
      id: "lead_engaged",
      inquiryStatus: "reviewing",
      receivedAt: "2026-07-30T02:00:00.000Z",
      opportunityId: "opportunity_engaged",
    }),
    lead({
      id: "lead_not_engaged",
      inquiryStatus: "closed",
      receivedAt: "2026-07-30T01:00:00.000Z",
      opportunityId: "opportunity_declined",
    }),
  ];
  const opportunities = [
    {
      id: "opportunity_review",
      leadId: "lead_engagement_review",
      decision: "pending",
      stage: "qualified",
    },
    {
      id: "opportunity_engaged",
      leadId: "lead_engaged",
      decision: "accepted",
      stage: "qualified",
    },
    {
      id: "opportunity_declined",
      leadId: "lead_not_engaged",
      decision: "declined",
      stage: "closed_lost",
    },
  ].map(({ id, leadId, decision, stage }) => ({
    model_type: "Opportunity",
    opportunity_id: id,
    tenant_id: TENANT,
    lead_id: leadId,
    party_id: `party_${leadId}`,
    display_name: `${id} 수임 검토`,
    stage,
    engagement_decision: decision,
    status: "active",
    owner_user_id: USER,
  }));
  const activities = [{
    model_type: "CRMActivity",
    crm_activity_id: "consultation_private",
    tenant_id: TENANT,
    lead_id: "lead_consultation",
    party_id: "party_lead_consultation",
    activity_type: "meeting",
    activity_kind: "consultation",
    subject: "노출되면 안 되는 비밀 상담",
    next_action: "노출되면 안 되는 다음 행동",
    confidential: true,
    status: "active",
    owner_user_id: USER,
    scheduled_start: "2026-07-31T01:00:00.000Z",
    scheduled_end: "2026-07-31T02:00:00.000Z",
    timezone: "Asia/Seoul",
    completed_at: null,
  }];
  return [...leads, ...opportunities, ...activities];
}

function evidenceRecord() {
  const mailboxAddress = "private-mailbox@example.test";
  const internetMessageId = "<client-inquiry-read@example.test>";
  const evidenceId = inquiryEmailEvidenceId({
    tenant_id: TENANT,
    mailbox_address: mailboxAddress,
    internet_message_id: internetMessageId,
  });
  return {
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: evidenceId,
    tenant_id: TENANT,
    mailbox_address: mailboxAddress,
    lead_id: "lead_new",
    internet_message_id: internetMessageId,
    graph_immutable_message_id: "graph-private-message-id",
    conversation_id: "graph-private-conversation-id",
    mime_file_object_id: "inquiry_evidence_mime_private",
    mime_sha256: "a".repeat(64),
    mime_byte_size: 512,
    subject: "법률 상담 문의",
    sender: {
      display_name: "문의 고객",
      address: "sender-private@example.test",
    },
    recipients: [],
    received_at: "2026-07-30T06:00:00.000Z",
    display_file_object_id: "inquiry_evidence_display_private",
    attachment_manifest: [],
    capture_status: "complete",
    retention_policy_ref: "retention_inquiry_email_7y",
    legal_hold_state: "none",
    captured_by: USER,
    captured_at: "2026-07-30T06:01:00.000Z",
  };
}

function directContext({ deniedLeadId = null } = {}) {
  return {
    principal: {
      user_id: USER,
      tenant_id: TENANT,
      role_ids: ["client_staff"],
    },
    rules: [{
      id: "allow-inquiry-read-only",
      effect: "allow",
      action: "crm:inquiry:read",
    }],
    object_acl: deniedLeadId ? [{
      id: "deny-one-inquiry",
      principal_id: USER,
      resource_id: deniedLeadId,
      action: "crm:inquiry:read",
      effect: "deny",
    }] : [],
  };
}

function query(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "client-inquiry-read",
    audit_hint_ref: "client-inquiry-read-audit",
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

test("CL-P3-W02-T02 실제 API 목록과 상세는 여섯 문의 상태를 같은 projection으로 반환한다", async () => {
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: inquiryRecords(),
  });
  const emailDmsRepository = createEmailDmsRepository({
    seedRecords: [evidenceRecord()],
  });
  const crmIntakeRuntime = createCrmIntakeRuntimeContext({
    crmRepository,
  });

  await withServer({
    crmIntakeRuntime,
    emailDmsRepository,
  }, async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const get = async (path) => {
      const response = await fetch(`${baseUrl}${path}`, { headers });
      return { status: response.status, body: await response.json() };
    };
    const health = await get("/api/health");
    const crm = health.body.bounded_contexts.find(
      ({ bounded_context }) => bounded_context === "crm-intake",
    );
    assert.ok(crm.endpoints.includes("GET /api/crm/inquiries"));
    assert.ok(crm.endpoints.includes("GET /api/crm/inquiries/:id"));

    const common = new URLSearchParams(query());
    const list = await get(`/api/crm/inquiries?${common}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.data_status, "complete");
    assert.equal(list.body.page_info.returned_count, 6);
    assert.equal(list.body.page_info.omitted_item_count, null);
    assert.deepEqual(
      new Set(list.body.items.map(({ visible_status_label }) => visible_status_label)),
      new Set([
        "새 문의",
        "확인 중",
        "상담 예정",
        "수임 검토 중",
        "수임 확정",
        "수임하지 않음",
      ]),
    );
    assert.deepEqual(
      list.body.items.map(({ lead_id }) => lead_id),
      [
        "lead_new",
        "lead_reviewing",
        "lead_consultation",
        "lead_engagement_review",
        "lead_engaged",
        "lead_not_engaged",
      ],
    );

    const statusByLead = new Map(
      list.body.items.map((item) => [item.lead_id, item.visible_status]),
    );
    for (const item of list.body.items) {
      const detail = await get(
        `/api/crm/inquiries/${item.lead_id}?${common}`,
      );
      assert.equal(detail.status, 200);
      assert.equal(
        detail.body.item.visible_status,
        statusByLead.get(item.lead_id),
      );
      assert.equal(detail.body.item.direct_matter_reference_included, false);
    }

    const filteredQuery = new URLSearchParams(
      query({ visible_status: "상담 예정" }),
    );
    const filtered = await get(`/api/crm/inquiries?${filteredQuery}`);
    assert.deepEqual(
      filtered.body.items.map(({ lead_id }) => lead_id),
      ["lead_consultation"],
    );

    const consultation = await get(
      `/api/crm/inquiries/lead_consultation?${common}`,
    );
    assert.equal(
      consultation.body.item.consultations[0].subject,
      "보호된 상담",
    );
    assert.equal(consultation.body.item.consultations[0].outcome, null);
    assert.equal(
      JSON.stringify(consultation.body).includes("노출되면 안 되는"),
      false,
    );

    const newInquiry = await get(`/api/crm/inquiries/lead_new?${common}`);
    assert.equal(newInquiry.body.item.evidence.access, "allowed");
    assert.equal(newInquiry.body.item.evidence.page_info.returned_count, 1);
    const safeEvidence = newInquiry.body.item.evidence.items[0];
    assert.deepEqual(
      Object.keys(safeEvidence).sort(),
      [
        "capture_status",
        "display_content_path",
        "inquiry_email_evidence_id",
        "mailbox_address_included",
        "original_content_path",
        "production_ready_claim",
        "provider_message_identifiers_included",
        "raw_content_included",
        "received_at",
        "sender_display_name",
        "storage_object_identifiers_included",
        "subject",
      ],
    );
    const serialized = JSON.stringify(newInquiry.body);
    for (const secret of [
      "private-mailbox@example.test",
      "sender-private@example.test",
      "<client-inquiry-read@example.test>",
      "graph-private-message-id",
      "graph-private-conversation-id",
      "inquiry_evidence_mime_private",
      "inquiry_evidence_display_private",
      "a".repeat(64),
    ]) {
      assert.equal(serialized.includes(secret), false);
    }
    assert.equal(serialized.includes("\"matter_id\""), false);
  });
});

test("CL-P3-W02-T02 권한 없는 상담·증거는 조회하지 않고 특정 문의 차단은 목록 전체를 막지 않는다", async () => {
  let evidenceListCalls = 0;
  const records = inquiryRecords().filter((record) => (
    record.lead_id === "lead_consultation"
    || record.lead_id === "lead_reviewing"
    || record.crm_activity_id === "consultation_private"
  ));
  const runtime = createCrmIntakeRuntimeContext({
    crmRepository: createCrmRuntimeRepository({ seedRecords: records }),
    emailDmsRepository: {
      list() {
        evidenceListCalls += 1;
        throw new Error("evidence repository must not be called");
      },
    },
  });
  const context = directContext({ deniedLeadId: "lead_reviewing" });
  const list = await handleCrmIntakeApiRequest({
    pathname: "/api/crm/inquiries",
    method: "GET",
    query: query(),
    context,
    requestId: "request-client-inquiry-read-list",
    runtime,
  });
  assert.equal(list.status, 200);
  assert.deepEqual(
    list.body.items.map(({ lead_id }) => lead_id),
    ["lead_consultation"],
  );
  assert.equal(list.body.items[0].visible_status_label, "확인 중");
  assert.equal(list.body.source_status.crm_consultations, "permission_denied");
  assert.equal(list.body.page_info.omitted_item_count, null);

  for (const invalidQuery of [
    query({ visible_status: "없는 상태" }),
    query({ limit: 101 }),
  ]) {
    const invalid = await handleCrmIntakeApiRequest({
      pathname: "/api/crm/inquiries",
      method: "GET",
      query: invalidQuery,
      context,
      requestId: "request-client-inquiry-read-invalid-filter",
      runtime,
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(
      invalid.body.safe_error_codes,
      ["CRM_INTAKE_API_VALIDATION_ERROR"],
    );
  }

  const detail = await handleCrmIntakeApiRequest({
    pathname: "/api/crm/inquiries/lead_consultation",
    method: "GET",
    query: query(),
    context,
    requestId: "request-client-inquiry-read-detail",
    runtime,
  });
  assert.equal(detail.status, 200);
  assert.equal(
    detail.body.item.visible_status,
    list.body.items[0].visible_status,
  );
  assert.equal(detail.body.item.consultations_access, "denied");
  assert.deepEqual(detail.body.item.consultations, []);
  assert.equal(detail.body.item.evidence.access, "denied");
  assert.equal(detail.body.item.evidence.page_info.returned_count, null);
  assert.equal(evidenceListCalls, 0);

  const evidenceFailure = await handleCrmIntakeApiRequest({
    pathname: "/api/crm/inquiries/lead_consultation",
    method: "GET",
    query: query(),
    context: {
      ...directContext(),
      rules: [
        ...directContext().rules,
        {
          id: "allow-inquiry-evidence-read",
          effect: "allow",
          action: "email_dms:inquiry_evidence:read",
        },
      ],
    },
    requestId: "request-client-inquiry-evidence-unavailable",
    runtime,
  });
  assert.equal(evidenceFailure.status, 200);
  assert.equal(evidenceFailure.body.item.evidence.access, "unavailable");
  assert.equal(evidenceFailure.body.source_status.email_evidence, "error");
  assert.equal(evidenceListCalls, 1);

  const deniedDetail = await handleCrmIntakeApiRequest({
    pathname: "/api/crm/inquiries/lead_reviewing",
    method: "GET",
    query: query(),
    context,
    requestId: "request-client-inquiry-read-denied-detail",
    runtime,
  });
  assert.equal(deniedDetail.status, 403);
  assert.equal(deniedDetail.body.count_leak_prevented, true);
});
