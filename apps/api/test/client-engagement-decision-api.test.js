import assert from "node:assert/strict";
import test from "node:test";

import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import {
  createCrmIntakeRuntimeContext,
} from "../src/crm-intake-runtime-context.js";
import { createFinanceRuntimeContext } from "../src/finance-runtime-context.js";
import { createMasterDataRuntimeContext } from "../src/master-data-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import {
  apiSessionHeaders,
  registeredAccount,
} from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const LEAD_ID = "lead_client_engagement_api_t01";
const OPPORTUNITY_ID = "opportunity_client_engagement_api_t01";
const PARTY_ID = "party_client_engagement_api_t01";

function runtimeSet() {
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      {
        model_type: "Lead",
        lead_id: LEAD_ID,
        tenant_id: TENANT,
        party_id: PARTY_ID,
        opportunity_id: OPPORTUNITY_ID,
        display_name: "한빛건설 법률 문의",
        status: "active",
        owner_user_id: "user_client_engagement_api_t01",
        inquiry_status: "reviewing",
        source: "manual",
        received_at: "2026-07-30T00:00:00.000Z",
        next_action: "수임 여부 검토",
        version: 2,
      },
      {
        model_type: "Opportunity",
        opportunity_id: OPPORTUNITY_ID,
        lead_id: LEAD_ID,
        tenant_id: TENANT,
        party_id: PARTY_ID,
        display_name: "한빛건설 자문 기회",
        stage: "qualified",
        engagement_decision: "pending",
        engagement_decision_version: 1,
        status: "active",
        owner_user_id: "user_client_engagement_api_t01",
      },
    ],
  });
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [{
      model_type: "Party",
      party_id: PARTY_ID,
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "한빛건설",
      status: "active",
      owner_user_id: "user_client_engagement_api_t01",
    }],
  });
  const financeRepository = createFinanceRepository();
  return {
    crmRepository,
    masterDataRepository,
    financeRepository,
    crmIntakeRuntime: createCrmIntakeRuntimeContext({
      crmRepository,
      masterDataRepository,
    }),
    masterDataRuntime: createMasterDataRuntimeContext({
      repository: masterDataRepository,
    }),
    financeRuntime: createFinanceRuntimeContext({
      repository: financeRepository,
      masterDataRepository,
      crmRepository,
    }),
  };
}

async function withServer(runtime, callback) {
  const started = await startApiServer({
    port: 0,
    crmIntakeRuntime: runtime.crmIntakeRuntime,
    masterDataRuntime: runtime.masterDataRuntime,
    financeRuntime: runtime.financeRuntime,
  });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function request(baseUrl, headers, path, {
  method = "GET",
  body,
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function decisionBody(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "client-engagement-decision-api",
    audit_hint_ref: "client-engagement-decision-api-audit",
    engagement_decision: "accepted",
    expected_inquiry_version: 2,
    expected_engagement_version: 1,
    agreed_amount: 12_000_000,
    due_date: "2026-08-31",
    reason: "내부 수임 결정을 확정함",
    idempotency_key: "client-engagement-decision-api-1",
    ...overrides,
  };
}

function failingOnce(repository) {
  let shouldFail = true;
  return {
    ...repository,
    transaction(callback) {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("synthetic Finance failure");
      }
      return repository.transaction(callback);
    },
  };
}

test("CL-P3-W03-T01 실제 API는 변호사 수임 결정을 단계별로 반영하고 일반 직원을 선차단한다", async () => {
  const runtime = runtimeSet();
  await withServer(runtime, async (baseUrl) => {
    const attorneyHeaders = await apiSessionHeaders(
      baseUrl,
      registeredAccount("jh731@amic.kr"),
    );
    const staffHeaders = await apiSessionHeaders(
      baseUrl,
      registeredAccount("yjlee@amic.kr"),
    );
    const health = await request(baseUrl, attorneyHeaders, "/api/health");
    const crm = health.body.bounded_contexts.find(
      ({ bounded_context }) => bounded_context === "crm-intake",
    );
    assert.ok(
      crm.endpoints.includes(
        "POST /api/crm/inquiries/:id/engagement-decisions",
      ),
    );
    assert.ok(
      crm.endpoints.includes(
        "POST /api/crm/inquiries/:id/engagement-repair",
      ),
    );

    const denied = await request(
      baseUrl,
      staffHeaders,
      `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
      {
        method: "POST",
        body: decisionBody({
          idempotency_key: "client-engagement-decision-api-denied",
        }),
      },
    );
    assert.equal(denied.status, 403);
    assert.deepEqual(
      denied.body.safe_error_codes,
      ["CRM_INTAKE_UNAUTHORIZED_OMISSION"],
    );
    assert.equal(
      runtime.crmRepository.get({
        tenant_id: TENANT,
        model_type: "Opportunity",
        opportunity_id: OPPORTUNITY_ID,
      }).engagement_decision,
      "pending",
    );

    const created = await request(
      baseUrl,
      attorneyHeaders,
      `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
      { method: "POST", body: decisionBody() },
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.outcome, "completed");
    assert.equal(created.body.item.engagement_decision, "accepted");
    assert.equal(created.body.item.engagement_decision_version, 2);
    assert.equal(created.body.item.stage, "qualified");
    assert.equal(created.body.inquiry.version, 3);
    assert.equal(created.body.processing.workflow_status, "completed");
    assert.equal(created.body.processing.workflow_status_label, "반영 완료");
    assert.deepEqual(created.body.processing.completed_steps, [
      "decision_recorded",
      "client_group_resolved",
      "fee_commitment_created",
    ]);
    assert.equal(created.body.processing.agreed_amount, 12_000_000);
    assert.equal(created.body.automatic_matter_creation, false);
    assert.equal(created.body.direct_matter_reference_included, false);
    assert.equal(
      "request_fingerprint" in created.body.processing,
      false,
    );
    assert.equal(
      JSON.stringify(created.body).includes(
        "client-engagement-decision-api-1",
      ),
      false,
    );

    const replay = await request(
      baseUrl,
      attorneyHeaders,
      `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
      { method: "POST", body: decisionBody() },
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);
    assert.equal(
      runtime.masterDataRepository.list({
        tenant_id: TENANT,
        model_type: "ClientGroup",
      }).filter(
        ({ member_party_ids }) => member_party_ids.includes(PARTY_ID),
      ).length,
      1,
    );
    assert.equal(
      runtime.financeRepository.list({
        tenant_id: TENANT,
        model_type: "FeeCommitment",
      }).filter(
        ({ opportunity_id }) => opportunity_id === OPPORTUNITY_ID,
      ).length,
      1,
    );
    assert.equal(
      runtime.crmRepository.list({
        tenant_id: TENANT,
        model_type: "Matter",
      }).length,
      0,
    );

    const query = new URLSearchParams({
      tenant_id: TENANT,
      permission_ref: "client-engagement-inquiry-read",
      audit_hint_ref: "client-engagement-inquiry-read-audit",
    });
    const detail = await request(
      baseUrl,
      attorneyHeaders,
      `/api/crm/inquiries/${LEAD_ID}?${query}`,
    );
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.visible_status_label, "수임 확정");
    assert.equal(
      detail.body.item.opportunity.engagement_workflow_status_label,
      "반영 완료",
    );
    assert.equal(
      detail.body.item.client_group_id,
      created.body.processing.client_group_id,
    );
  });
});

test("CL-P3-W03-T01 실제 API는 Matter 지정과 알 수 없는 명령 필드를 상태 변경 전에 거절한다", async () => {
  const runtime = runtimeSet();
  await withServer(runtime, async (baseUrl) => {
    const headers = await apiSessionHeaders(
      baseUrl,
      registeredAccount("jh731@amic.kr"),
    );
    for (const body of [
      decisionBody({
        matter_id: "matter_shortcut_forbidden",
        idempotency_key: "client-engagement-matter-shortcut",
      }),
      decisionBody({
        hidden_auto_create: true,
        idempotency_key: "client-engagement-unknown-field",
      }),
    ]) {
      const blocked = await request(
        baseUrl,
        headers,
        `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
        { method: "POST", body },
      );
      assert.equal(blocked.status, 400);
      assert.deepEqual(
        blocked.body.safe_error_codes,
        ["CRM_INTAKE_API_VALIDATION_ERROR"],
      );
    }
    const crossTenant = await request(
      baseUrl,
      headers,
      `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
      {
        method: "POST",
        body: decisionBody({
          tenant_id: "tenant_not_signed",
          idempotency_key: "client-engagement-cross-tenant",
        }),
      },
    );
    assert.equal(crossTenant.status, 403);
    assert.deepEqual(
      crossTenant.body.safe_error_codes,
      ["CRM_INTAKE_UNAUTHORIZED_OMISSION"],
    );
    assert.equal(
      runtime.crmRepository.get({
        tenant_id: TENANT,
        model_type: "Opportunity",
        opportunity_id: OPPORTUNITY_ID,
      }).engagement_decision,
      "pending",
    );
    assert.equal(
      runtime.masterDataRepository.list({
        tenant_id: TENANT,
        model_type: "ClientGroup",
      }).filter(
        ({ member_party_ids }) => member_party_ids.includes(PARTY_ID),
      ).length,
      0,
    );
    assert.equal(
      runtime.financeRepository.list({
        tenant_id: TENANT,
        model_type: "FeeCommitment",
      }).length,
      0,
    );

    const closeReason = "업무 범위와 일정이 맞지 않음";
    const declined = await request(
      baseUrl,
      headers,
      `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
      {
        method: "POST",
        body: decisionBody({
          engagement_decision: "declined",
          agreed_amount: undefined,
          due_date: undefined,
          close_reason: closeReason,
          idempotency_key: "client-engagement-declined-api",
        }),
      },
    );
    assert.equal(declined.status, 201, JSON.stringify(declined.body));
    assert.equal(declined.body.item.engagement_decision, "declined");
    assert.equal("engagement_close_reason" in declined.body.item, false);
    assert.equal(JSON.stringify(declined.body).includes(closeReason), false);
    assert.equal(
      runtime.crmRepository.get({
        tenant_id: TENANT,
        model_type: "Opportunity",
        opportunity_id: OPPORTUNITY_ID,
      }).engagement_close_reason,
      closeReason,
    );

    const query = new URLSearchParams({
      tenant_id: TENANT,
      permission_ref: "client-engagement-inquiry-read",
      audit_hint_ref: "client-engagement-inquiry-read-audit",
    });
    const detail = await request(
      baseUrl,
      headers,
      `/api/crm/inquiries/${LEAD_ID}?${query}`,
    );
    assert.equal(detail.status, 200);
    assert.equal(JSON.stringify(detail.body).includes(closeReason), false);
  });
});

test("VC-CL-ENG-003 / CL-P3-W03-T01 실제 API 재처리는 실패한 Finance 단계만 이어서 완료한다", async () => {
  const runtime = runtimeSet();
  runtime.financeRuntime = createFinanceRuntimeContext({
    repository: failingOnce(runtime.financeRepository),
    masterDataRepository: runtime.masterDataRepository,
    crmRepository: runtime.crmRepository,
  });
  await withServer(runtime, async (baseUrl) => {
    const headers = await apiSessionHeaders(
      baseUrl,
      registeredAccount("jh731@amic.kr"),
    );
    const first = await request(
      baseUrl,
      headers,
      `/api/crm/inquiries/${LEAD_ID}/engagement-decisions`,
      { method: "POST", body: decisionBody() },
    );
    assert.equal(first.status, 202);
    assert.equal(first.body.outcome, "repair_required");
    assert.equal(first.body.ui_state, "repair_required");
    assert.equal(first.body.processing.workflow_status_label, "반영 확인 필요");
    assert.equal(first.body.processing.failed_step, "fee_commitment_created");
    assert.deepEqual(first.body.processing.completed_steps, [
      "decision_recorded",
      "client_group_resolved",
    ]);

    const repairBody = {
      tenant_id: TENANT,
      permission_ref: "client-engagement-repair-api",
      audit_hint_ref: "client-engagement-repair-api-audit",
      expected_workflow_version: first.body.processing.workflow_version,
      reason: "수임 금액 반영을 다시 실행함",
      idempotency_key: "client-engagement-repair-api-1",
    };
    const repaired = await request(
      baseUrl,
      headers,
      `/api/crm/inquiries/${LEAD_ID}/engagement-repair`,
      { method: "POST", body: repairBody },
    );
    assert.equal(repaired.status, 200);
    assert.equal(repaired.body.outcome, "completed");
    assert.equal(repaired.body.processing.workflow_status, "completed");
    assert.deepEqual(repaired.body.processing.completed_steps, [
      "decision_recorded",
      "client_group_resolved",
      "fee_commitment_created",
    ]);
    assert.equal(
      new Set(repaired.body.processing.completed_steps).size,
      repaired.body.processing.completed_steps.length,
    );
    assert.equal(
      runtime.masterDataRepository.list({
        tenant_id: TENANT,
        model_type: "ClientGroup",
      }).filter(
        ({ member_party_ids }) => member_party_ids.includes(PARTY_ID),
      ).length,
      1,
    );
    assert.equal(
      runtime.financeRepository.list({
        tenant_id: TENANT,
        model_type: "FeeCommitment",
      }).filter(
        ({ opportunity_id }) => opportunity_id === OPPORTUNITY_ID,
      ).length,
      1,
    );

    const replay = await request(
      baseUrl,
      headers,
      `/api/crm/inquiries/${LEAD_ID}/engagement-repair`,
      { method: "POST", body: repairBody },
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(
      runtime.financeRepository.list({
        tenant_id: TENANT,
        model_type: "FeeCommitment",
      }).length,
      1,
    );
  });
});
