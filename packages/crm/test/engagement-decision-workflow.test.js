import assert from "node:assert/strict";
import test from "node:test";

import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import { createMasterDataRepository } from "../../master-data/src/repository.js";
import {
  CRM_ENGAGEMENT_ERROR_CODES,
  createCrmRuntimeRepository,
  decideInquiryEngagement,
  repairInquiryEngagement,
} from "../src/index.js";

const TENANT = "tenant_client_engagement_t01";
const ACTOR = "user_client_engagement_t01";

function lead({
  lead_id = "lead_client_engagement_t01",
  party_id = "party_client_engagement_t01",
  opportunity_id = "opportunity_client_engagement_t01",
} = {}) {
  return {
    model_type: "Lead",
    lead_id,
    tenant_id: TENANT,
    party_id,
    opportunity_id,
    display_name: "한빛건설 법률 문의",
    status: "active",
    owner_user_id: ACTOR,
    assigned_user_id: ACTOR,
    inquiry_status: "reviewing",
    source: "manual",
    received_at: "2026-07-30T00:00:00.000Z",
    next_action: "수임 여부 검토",
    version: 2,
  };
}

function opportunity({
  opportunity_id = "opportunity_client_engagement_t01",
  lead_id = "lead_client_engagement_t01",
  party_id = "party_client_engagement_t01",
} = {}) {
  return {
    model_type: "Opportunity",
    opportunity_id,
    lead_id,
    tenant_id: TENANT,
    party_id,
    display_name: "한빛건설 자문 기회",
    stage: "qualified",
    engagement_decision: "pending",
    engagement_decision_version: 1,
    status: "active",
    owner_user_id: ACTOR,
  };
}

function repositories(overrides = {}) {
  const inquiry = lead(overrides);
  const salesOpportunity = opportunity(overrides);
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [inquiry, salesOpportunity],
  });
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [{
      model_type: "Party",
      party_id: inquiry.party_id,
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "한빛건설",
      status: "active",
      owner_user_id: ACTOR,
    }],
  });
  const financeRepository = createFinanceRepository();
  return {
    crmRepository,
    masterDataRepository,
    financeRepository,
    lead: inquiry,
    opportunity: salesOpportunity,
  };
}

function decide(runtime, overrides = {}) {
  return decideInquiryEngagement({
    crm_repository: runtime.crmRepository,
    master_data_repository: runtime.masterDataRepository,
    finance_repository: runtime.financeRepository,
    tenant_id: TENANT,
    lead_id: runtime.lead.lead_id,
    engagement_decision: "accepted",
    expected_inquiry_version: 2,
    expected_engagement_version: 1,
    agreed_amount: 12_000_000,
    due_date: "2026-08-31",
    reason: "내부 수임 결정을 확정함",
    permission_ref: "client-engagement-decide",
    audit_hint_ref: "client-engagement-audit",
    actor_id: ACTOR,
    idempotency_key: "client-engagement-decision-1",
    clock: () => new Date("2026-07-31T00:00:00.000Z"),
    ...overrides,
  });
}

function failingOnce(repository) {
  let shouldFail = true;
  return {
    ...repository,
    transaction(callback) {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("synthetic finance step failure");
      }
      return repository.transaction(callback);
    },
  };
}

function crashAfterFirstCommittedTransaction(repository) {
  let shouldCrash = true;
  return {
    ...repository,
    transaction(callback) {
      const result = repository.transaction(callback);
      if (shouldCrash) {
        shouldCrash = false;
        throw new Error("synthetic process interruption after commit");
      }
      return result;
    },
  };
}

test("VC-CL-ENG-001 / CL-P3-W03-T01 수임 확정은 결정·ClientGroup·FeeCommitment를 단계별로 한 번씩 반영한다", () => {
  const runtime = repositories();
  const result = decide(runtime);

  assert.equal(result.outcome, "completed");
  assert.equal(result.opportunity.engagement_decision, "accepted");
  assert.equal(result.opportunity.engagement_decision_version, 2);
  assert.equal(result.opportunity.stage, "qualified");
  assert.equal(result.process.workflow_status, "completed");
  assert.deepEqual(result.process.completed_steps, [
    "decision_recorded",
    "client_group_resolved",
    "fee_commitment_created",
  ]);
  assert.equal(
    new Set(result.process.completed_steps).size,
    result.process.completed_steps.length,
  );

  const clientGroups = runtime.masterDataRepository.list({
    tenant_id: TENANT,
    model_type: "ClientGroup",
  });
  const feeCommitments = runtime.financeRepository.list({
    tenant_id: TENANT,
    model_type: "FeeCommitment",
  });
  assert.equal(clientGroups.length, 1);
  assert.equal(clientGroups[0].primary_party_id, runtime.lead.party_id);
  assert.equal(feeCommitments.length, 1);
  assert.equal(feeCommitments[0].client_group_id, clientGroups[0].client_group_id);
  assert.equal(feeCommitments[0].opportunity_id, runtime.opportunity.opportunity_id);
  assert.equal(feeCommitments[0].agreed_amount, 12_000_000);
  assert.equal(
    runtime.crmRepository.list({
      tenant_id: TENANT,
      model_type: "Matter",
    }).length,
    0,
  );

  const replay = decide(runtime);
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.idempotent_replay, true);
  assert.equal(
    runtime.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "ClientGroup",
    }).length,
    1,
  );
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    1,
  );
});

test("CL-P3-W03-T01 결정 저장 직후 중단된 같은 명령은 완료된 결정을 반복하지 않고 남은 단계만 이어간다", () => {
  const runtime = repositories({
    lead_id: "lead_client_engagement_resume_t01",
    opportunity_id: "opportunity_client_engagement_resume_t01",
    party_id: "party_client_engagement_resume_t01",
  });
  assert.throws(
    () => decide(runtime, {
      lead_id: runtime.lead.lead_id,
      crm_repository: crashAfterFirstCommittedTransaction(
        runtime.crmRepository,
      ),
      idempotency_key: "client-engagement-decision-resume-1",
    }),
    /synthetic process interruption after commit/,
  );
  const interrupted = runtime.crmRepository.list({
    tenant_id: TENANT,
    model_type: "EngagementDecisionProcess",
  })[0];
  assert.equal(interrupted.workflow_status, "in_progress");
  assert.deepEqual(interrupted.completed_steps, ["decision_recorded"]);
  assert.equal(
    runtime.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "ClientGroup",
    }).length,
    0,
  );
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    0,
  );

  const resumed = decide(runtime, {
    lead_id: runtime.lead.lead_id,
    idempotency_key: "client-engagement-decision-resume-1",
  });
  assert.equal(resumed.outcome, "idempotent_replay");
  assert.equal(resumed.process.workflow_status, "completed");
  assert.deepEqual(resumed.process.completed_steps, [
    "decision_recorded",
    "client_group_resolved",
    "fee_commitment_created",
  ]);
  assert.equal(
    runtime.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "ClientGroup",
    }).length,
    1,
  );
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    1,
  );
});

test("VC-CL-ENG-002 / CL-P3-W03-T01 금액 미입력을 명시적으로 확인하면 null 약정과 자연스러운 표시값을 남긴다", () => {
  const runtime = repositories({
    lead_id: "lead_client_engagement_unknown_t01",
    opportunity_id: "opportunity_client_engagement_unknown_t01",
    party_id: "party_client_engagement_unknown_t01",
  });
  assert.throws(
    () => decide(runtime, {
      lead_id: runtime.lead.lead_id,
      agreed_amount: undefined,
      due_date: undefined,
      idempotency_key: "client-engagement-decision-unknown-unconfirmed",
    }),
    /amount_unknown_confirmed must be true/,
  );
  assert.throws(
    () => decide(runtime, {
      lead_id: runtime.lead.lead_id,
      amount_unknown_confirmed: true,
      idempotency_key: "client-engagement-decision-amount-contradiction",
    }),
    /cannot be true/,
  );
  assert.equal(
    runtime.crmRepository.get({
      tenant_id: TENANT,
      model_type: "Opportunity",
      opportunity_id: runtime.opportunity.opportunity_id,
    }).engagement_decision,
    "pending",
  );
  const result = decide(runtime, {
    lead_id: runtime.lead.lead_id,
    agreed_amount: undefined,
    amount_unknown_confirmed: true,
    due_date: undefined,
    idempotency_key: "client-engagement-decision-unknown-1",
  });

  assert.equal(result.outcome, "completed");
  assert.equal(result.process.agreed_amount, null);
  assert.equal(result.process.agreed_amount_state, "not_entered");
  assert.equal(result.process_summary.agreed_amount_display, "금액 미입력");
  const commitment = runtime.financeRepository.list({
    tenant_id: TENANT,
    model_type: "FeeCommitment",
  })[0];
  assert.equal(commitment.agreed_amount, null);
  assert.equal(commitment.due_date, null);
});

test("VC-CL-ENG-003 / CL-P3-W03-T01 Finance 실패 뒤 명시적 재처리는 완료 단계를 건너뛰고 한 건으로 복구한다", () => {
  const runtime = repositories({
    lead_id: "lead_client_engagement_repair_t01",
    opportunity_id: "opportunity_client_engagement_repair_t01",
    party_id: "party_client_engagement_repair_t01",
  });
  runtime.financeRepository = failingOnce(runtime.financeRepository);

  const first = decide(runtime, {
    lead_id: runtime.lead.lead_id,
    idempotency_key: "client-engagement-decision-repair-1",
  });
  assert.equal(first.outcome, "repair_required");
  assert.equal(first.process.workflow_status, "repair_required");
  assert.deepEqual(first.process.completed_steps, [
    "decision_recorded",
    "client_group_resolved",
  ]);
  assert.equal(first.process.failed_step, "fee_commitment_created");
  assert.equal(
    first.process.safe_error_code,
    CRM_ENGAGEMENT_ERROR_CODES.finance_step_failed,
  );
  assert.equal(
    runtime.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "ClientGroup",
    }).length,
    1,
  );
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    0,
  );
  assert.throws(
    () => decide(runtime, {
      lead_id: runtime.lead.lead_id,
      engagement_decision: "pending",
      expected_inquiry_version: first.lead.version,
      expected_engagement_version:
        first.opportunity.engagement_decision_version,
      agreed_amount: undefined,
      due_date: undefined,
      reason: "실패한 반영을 건너뛰고 결정을 변경하려 함",
      idempotency_key: "client-engagement-decision-before-repair",
    }),
    (error) => (
      error.safe_error_code
      === CRM_ENGAGEMENT_ERROR_CODES.workflow_incomplete
    ),
  );

  const repairCommand = {
    master_data_repository: runtime.masterDataRepository,
    finance_repository: runtime.financeRepository,
    tenant_id: TENANT,
    lead_id: runtime.lead.lead_id,
    expected_workflow_version: first.process.workflow_version,
    reason: "수임 금액 반영을 다시 실행함",
    permission_ref: "client-engagement-repair",
    audit_hint_ref: "client-engagement-repair-audit",
    actor_id: ACTOR,
    idempotency_key: "client-engagement-repair-1",
    clock: () => new Date("2026-07-31T00:05:00.000Z"),
  };
  assert.throws(
    () => repairInquiryEngagement({
      ...repairCommand,
      crm_repository: crashAfterFirstCommittedTransaction(
        runtime.crmRepository,
      ),
    }),
    /synthetic process interruption after commit/,
  );
  assert.equal(
    runtime.crmRepository.get({
      tenant_id: TENANT,
      model_type: "EngagementDecisionProcess",
      resource_id: first.process.engagement_workflow_id,
    }).workflow_status,
    "in_progress",
  );

  const repaired = repairInquiryEngagement({
    ...repairCommand,
    crm_repository: runtime.crmRepository,
  });
  assert.equal(repaired.outcome, "idempotent_replay");
  assert.equal(repaired.process.workflow_status, "completed");
  assert.deepEqual(repaired.process.completed_steps, [
    "decision_recorded",
    "client_group_resolved",
    "fee_commitment_created",
  ]);
  assert.equal(
    new Set(repaired.process.completed_steps).size,
    repaired.process.completed_steps.length,
  );
  assert.equal(
    runtime.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "ClientGroup",
    }).length,
    1,
  );
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    1,
  );

  const replay = repairInquiryEngagement({
    ...repairCommand,
    crm_repository: runtime.crmRepository,
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    1,
  );
});

test("VC-CL-ENG-004 / CL-P3-W03-T01 수임하지 않음은 종료 사유를 요구하고 Opportunity를 closed_lost로 닫는다", () => {
  const runtime = repositories({
    lead_id: "lead_client_engagement_declined_t01",
    opportunity_id: "opportunity_client_engagement_declined_t01",
    party_id: "party_client_engagement_declined_t01",
  });
  assert.throws(
    () => decide(runtime, {
      lead_id: runtime.lead.lead_id,
      engagement_decision: "declined",
      agreed_amount: undefined,
      due_date: undefined,
      close_reason: undefined,
      idempotency_key: "client-engagement-declined-missing-reason",
    }),
    /close_reason is required/,
  );
  assert.equal(
    runtime.crmRepository.get({
      tenant_id: TENANT,
      model_type: "Opportunity",
      opportunity_id: runtime.opportunity.opportunity_id,
    }).engagement_decision,
    "pending",
  );

  const result = decide(runtime, {
    lead_id: runtime.lead.lead_id,
    engagement_decision: "declined",
    agreed_amount: undefined,
    due_date: undefined,
    close_reason: "업무 범위와 일정이 맞지 않음",
    idempotency_key: "client-engagement-declined-1",
  });
  assert.equal(result.outcome, "completed");
  assert.equal(result.opportunity.engagement_decision, "declined");
  assert.equal(result.opportunity.stage, "closed_lost");
  assert.equal(
    result.opportunity.engagement_close_reason,
    "업무 범위와 일정이 맞지 않음",
  );
  assert.equal(result.lead.inquiry_status, "closed");
  assert.equal(result.lead.next_action, null);
  assert.deepEqual(result.process.completed_steps, ["decision_recorded"]);
  assert.equal(
    runtime.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "ClientGroup",
    }).length,
    0,
  );
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    }).length,
    0,
  );
  assert.equal(
    JSON.stringify(result.decision_audit_event).includes(
      "업무 범위와 일정이 맞지 않음",
    ),
    false,
  );
});

test("CL-P3-W03-T01 수임 확정을 검토 중으로 되돌리면 기존 약정을 취소하고 Matter는 만들지 않는다", () => {
  const runtime = repositories({
    lead_id: "lead_client_engagement_reopen_t01",
    opportunity_id: "opportunity_client_engagement_reopen_t01",
    party_id: "party_client_engagement_reopen_t01",
  });
  const accepted = decide(runtime, {
    lead_id: runtime.lead.lead_id,
    idempotency_key: "client-engagement-accepted-before-reopen",
  });
  const reopened = decide(runtime, {
    lead_id: runtime.lead.lead_id,
    engagement_decision: "pending",
    expected_inquiry_version: accepted.lead.version,
    expected_engagement_version:
      accepted.opportunity.engagement_decision_version,
    agreed_amount: undefined,
    due_date: undefined,
    reason: "수임 조건을 다시 확인하기로 함",
    idempotency_key: "client-engagement-reopen-1",
  });

  assert.equal(reopened.outcome, "completed");
  assert.equal(reopened.opportunity.engagement_decision, "pending");
  assert.equal(reopened.opportunity.stage, "qualified");
  assert.equal(reopened.lead.inquiry_status, "reviewing");
  assert.equal(reopened.lead.next_action, "수임 여부 검토");
  assert.equal(
    runtime.financeRepository.list({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
    })[0].status,
    "cancelled",
  );
  assert.equal(
    runtime.crmRepository.list({
      tenant_id: TENANT,
      model_type: "Matter",
    }).length,
    0,
  );
});
