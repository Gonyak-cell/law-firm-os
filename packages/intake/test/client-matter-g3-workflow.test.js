import assert from "node:assert/strict";
import test from "node:test";

import {
  CRM_INTAKE_HANDOFF_ERROR_CODES,
  createCrmRuntimeRepository,
  handoffOpportunityToIntake,
} from "../../crm/src/index.js";
import {
  openMatterTransaction,
} from "../../matter/src/opening-service.js";
import { createMatterRepository } from "../../matter/src/repository.js";
import {
  createIntakeClearanceTokenDescriptor,
  createIntakeConflictDecisionWorkflowDescriptor,
  createIntakeConflictSearchDescriptor,
  createIntakeCoreConflictCheck,
  createIntakeCoreConflictHit,
  createIntakeEngagementDescriptor,
  createIntakeFeeTermsDescriptor,
  createIntakeG3DWorkflowCloseoutDescriptor,
  createIntakeRequest,
  createIntakeRuntimeRepository,
  createIntakeRiskApprovalQueueDescriptor,
  createIntakeWaiverDescriptor,
  INTAKE_G3D_FEE_TERM_TYPES,
} from "../src/index.js";

const tenant_id = "tenant_g3d_validator";
const actor_id = "actor_g3d_validator";
const owner_user_id = "user_g3d_owner";
const party_ids = ["party_g3d_client", "party_g3d_counterparty"];

function conflictCheck() {
  return createIntakeCoreConflictCheck({
    conflict_check_id: "conflict_check_g3d",
    tenant_id,
    intake_request_id: "intake_g3d",
    party_snapshot: {
      party_ids,
      aliases: [{ party_id: party_ids[0], alias_value: "AMIC Client" }],
      relationships: [{ from_party_id: party_ids[0], to_party_id: party_ids[1], relationship_type: "adverse" }],
      former_matters: [{ matter_ref: "former_matter:g3d", party_id: party_ids[1] }],
    },
    snapshot_recorded_at: "2026-06-19T00:00:00.000Z",
    status: "snapshot_recorded",
    owner_user_id,
  });
}

function conflictHit() {
  return createIntakeCoreConflictHit({
    conflict_hit_id: "conflict_hit_g3d",
    tenant_id,
    conflict_check_id: "conflict_check_g3d",
    matched_party_id: party_ids[1],
    hit_source: "former_matter",
    source_record_ref: "former_matter:g3d",
    severity: "high",
    audit_hint_ref: "audit_hint_g3d",
    status: "review_required",
    owner_user_id,
  });
}

test("VC-CL-MAT-001 / CL-P3-W03-T02 수임 확정 문의는 증거·활동 참조만 Intake로 넘기고 clearance 전 Matter 개설을 막는다", () => {
  const inquiryId = "lead_client_mat_t02";
  const opportunityId = "opportunity_client_mat_t02";
  const intakeRequestId = "intake_client_mat_t02";
  const activityId = "activity_client_mat_t02";
  const evidenceId = "evidence_client_mat_t02";
  const crm = createCrmRuntimeRepository({
    seedRecords: [
      {
        model_type: "Lead",
        lead_id: inquiryId,
        tenant_id,
        party_id: party_ids[0],
        opportunity_id: opportunityId,
        display_name: "한빛건설 법률 문의",
        status: "active",
        inquiry_status: "reviewing",
        source: "outlook_addin",
        received_at: "2026-07-30T00:00:00.000Z",
        next_action: "수임 절차 확인",
        version: 3,
        owner_user_id,
      },
      {
        model_type: "Opportunity",
        opportunity_id: opportunityId,
        lead_id: inquiryId,
        tenant_id,
        party_id: party_ids[0],
        display_name: "한빛건설 자문 기회",
        stage: "qualified",
        engagement_decision: "accepted",
        engagement_decision_version: 2,
        engagement_workflow_id: "engagement_workflow_client_mat_t02",
        engagement_workflow_status: "completed",
        engagement_client_group_id: "client_group_client_mat_t02",
        engagement_fee_commitment_id: "fee_commitment_client_mat_t02",
        status: "active",
        owner_user_id,
      },
      {
        model_type: "CRMActivity",
        crm_activity_id: activityId,
        tenant_id,
        lead_id: inquiryId,
        opportunity_id: opportunityId,
        party_id: party_ids[0],
        activity_type: "meeting",
        subject: "외부에 복사하면 안 되는 상담 제목",
        confidential: true,
        status: "active",
        owner_user_id,
      },
    ],
  });
  const intake = createIntakeRuntimeRepository();
  const evidenceRepository = {
    list(query) {
      assert.equal(query.tenant_id, tenant_id);
      assert.equal(query.lead_id, inquiryId);
      return [{
        model_type: "InquiryEmailEvidence",
        inquiry_email_evidence_id: evidenceId,
        tenant_id,
        lead_id: inquiryId,
        capture_status: "complete",
        subject: "외부에 복사하면 안 되는 메일 제목",
        raw_mime: "복사 금지 원문",
      }];
    },
  };
  const intakeService = {
    createIntakeRequest: ({ request, actor_id, idempotency_key }) =>
      createIntakeRequest({
        repository: intake,
        request,
        actor_id,
        idempotency_key,
      }),
  };

  const handoff = handoffOpportunityToIntake({
    crmRepository: crm,
    intakeRepository: intake,
    evidenceRepository,
    intakeService,
    tenant_id,
    opportunity_id: opportunityId,
    actor_id,
    idempotency_key: "client-mat-handoff-t02",
    intake_request_id: intakeRequestId,
    requested_scope_summary: "상사 자문",
    clock: () => new Date("2026-07-31T01:00:00.000Z"),
  });

  assert.equal(handoff.outcome, "created");
  assert.equal(handoff.opportunity.stage, "intake_requested");
  assert.equal(handoff.intake_request.conflict_check_required, true);
  assert.equal(handoff.intake_request.signed_engagement_required, true);
  assert.equal(
    handoff.intake_request.matter_opening_state,
    "waiting_for_intake_clearance",
  );
  assert.deepEqual(
    handoff.intake_request.source_inquiry_evidence_ids,
    [evidenceId],
  );
  assert.deepEqual(
    handoff.intake_request.source_crm_activity_ids,
    [activityId],
  );
  assert.equal(handoff.handoff.evidence_bytes_copied, false);
  assert.equal(handoff.handoff.activity_content_copied, false);
  assert.equal(
    JSON.stringify(handoff.intake_request).includes("복사 금지"),
    false,
  );
  assert.equal(
    intake.list({
      tenant_id,
      model_type: "ConflictCheck",
    }).length,
    0,
  );

  const matter = createMatterRepository();
  assert.throws(
    () => openMatterTransaction({
      repository: matter,
      clearance_repository: intake,
      matter: {
        matter_id: "matter_client_mat_t02",
        tenant_id,
        opportunity_id: opportunityId,
      },
      clearance_token: {},
      actor_id,
      idempotency_key: "client-mat-open-before-clearance-t02",
    }),
    /clearance_token_id is required/,
  );
  assert.equal(
    matter.list({ tenant_id, model_type: "Matter" }).length,
    0,
  );
  assert.equal(
    crm.get({
      tenant_id,
      model_type: "Opportunity",
      opportunity_id: opportunityId,
    }).engagement_decision,
    "accepted",
  );
  assert.equal(
    crm.get({
      tenant_id,
      model_type: "Lead",
      lead_id: inquiryId,
    }).inquiry_status,
    "reviewing",
  );

  const replay = handoffOpportunityToIntake({
    crmRepository: crm,
    intakeRepository: intake,
    evidenceRepository: {
      list() {
        throw new Error("replay must use the stored Intake snapshot");
      },
    },
    intakeService,
    tenant_id,
    opportunity_id: opportunityId,
    actor_id,
    idempotency_key: "client-mat-handoff-t02",
    intake_request_id: intakeRequestId,
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.idempotent_replay, true);
  assert.equal(
    intake.list({
      tenant_id,
      model_type: "IntakeRequest",
    }).length,
    1,
  );

  assert.throws(
    () => handoffOpportunityToIntake({
      crmRepository: crm,
      intakeRepository: intake,
      evidenceRepository,
      intakeService,
      tenant_id,
      opportunity_id: opportunityId,
      actor_id,
      idempotency_key: "client-mat-direct-matter-t02",
      intake_request_id: intakeRequestId,
      matter_id: "matter_forbidden_t02",
    }),
    (error) => (
      error.status === 409
      && error.safe_error_code
        === CRM_INTAKE_HANDOFF_ERROR_CODES.direct_matter_blocked
    ),
  );

  intake.update({
    tenant_id,
    model_type: "IntakeRequest",
    id: intakeRequestId,
  }, {
    source_fee_commitment_id: "fee_commitment_other",
  });
  assert.throws(
    () => handoffOpportunityToIntake({
      crmRepository: crm,
      intakeRepository: intake,
      evidenceRepository,
      intakeService,
      tenant_id,
      opportunity_id: opportunityId,
      actor_id,
      idempotency_key: "client-mat-tampered-intake-t02",
      intake_request_id: intakeRequestId,
    }),
    (error) => (
      error.status === 409
      && error.safe_error_code
        === CRM_INTAKE_HANDOFF_ERROR_CODES.intake_conflict
    ),
  );
});

test("G3-D conflict search covers aliases, relationships, and former matters without writes", () => {
  const check = conflictCheck();
  const descriptor = createIntakeConflictSearchDescriptor({
    tenant_id,
    actor_id,
    conflict_check: check,
    party_snapshot: check.party_snapshot,
    search_sources: {
      alias_index: [{ alias_ref: "alias:amic-client", party_id: party_ids[0] }],
      relationship_graph: [{ relationship_ref: "relationship:adverse", party_ids }],
      former_matter: [{ matter_ref: "former_matter:g3d", party_id: party_ids[1] }],
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.source_coverage.alias_index, true);
  assert.equal(descriptor.source_coverage.relationship_graph, true);
  assert.equal(descriptor.source_coverage.former_matter, true);
  assert.deepEqual(descriptor.potential_hit_sources, ["alias_index", "relationship_graph", "former_matter"]);
  assert.equal(descriptor.search_receipt.executed, false);
  assert.equal(descriptor.writes_product_state, false);
  assert.equal(descriptor.g3_runtime_readiness_claim, "open");
});

test("G3-D conflict search blocks missing source coverage and Matter shortcut", () => {
  const descriptor = createIntakeConflictSearchDescriptor({
    tenant_id,
    actor_id,
    conflict_check: conflictCheck(),
    party_snapshot: { party_ids },
    search_sources: {
      alias_index: [{ alias_ref: "alias:amic-client" }],
      relationship_graph: [{ relationship_ref: "relationship:adverse" }],
    },
    create_matter: true,
  });

  assert.equal(descriptor.outcome, "blocked");
  assert.ok(descriptor.blocked_claims.includes("conflict_search_former_matter_source_missing"));
  assert.ok(descriptor.blocked_claims.includes("intake_to_matter_shortcut_blocked"));
});

test("G3-D conflict decision workflow requires reviewer and audited hit schemas", () => {
  const blocked = createIntakeConflictDecisionWorkflowDescriptor({
    tenant_id,
    actor_id,
    conflict_check: conflictCheck(),
    conflict_hits: [conflictHit()],
    requested_decision: "waiver_required",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("conflict_decision_reviewer_required"));

  const descriptor = createIntakeConflictDecisionWorkflowDescriptor({
    tenant_id,
    actor_id,
    conflict_check: conflictCheck(),
    conflict_hits: [conflictHit()],
    requested_decision: "waiver_required",
    reviewer_user_id: "reviewer_g3d",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.decision_receipt.decision_persisted, false);
  assert.ok(descriptor.review_required_claims.includes("conflict_decision_human_review_required"));
});

test("G3-D waiver descriptor requires consent document evidence", () => {
  const blocked = createIntakeWaiverDescriptor({
    tenant_id,
    actor_id,
    waiver_id: "waiver_g3d",
    intake_request_id: "intake_g3d",
    conflict_hit_ids: ["conflict_hit_g3d"],
    approver_user_id: "approver_g3d",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("waiver_consent_document_required"));

  const descriptor = createIntakeWaiverDescriptor({
    tenant_id,
    actor_id,
    waiver_id: "waiver_g3d",
    intake_request_id: "intake_g3d",
    conflict_hit_ids: ["conflict_hit_g3d"],
    consent_document_ref: "dms:consent-document:g3d",
    approver_user_id: "approver_g3d",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.consent_document_evidence_required, true);
  assert.equal(descriptor.creates_matter, false);
});

test("G3-D engagement descriptor requires legal client and scope before Matter opening", () => {
  const blocked = createIntakeEngagementDescriptor({
    tenant_id,
    actor_id,
    engagement_id: "engagement_g3d",
    intake_request_id: "intake_g3d",
    fee_terms_id: "fee_terms_g3d",
    create_matter: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("engagement_legal_client_required"));
  assert.ok(blocked.blocked_claims.includes("engagement_scope_required"));
  assert.ok(blocked.blocked_claims.includes("intake_to_matter_shortcut_blocked"));

  const descriptor = createIntakeEngagementDescriptor({
    tenant_id,
    actor_id,
    engagement_id: "engagement_g3d",
    intake_request_id: "intake_g3d",
    legal_client_party_id: party_ids[0],
    scope_summary: "Represent client in commercial dispute intake scope.",
    fee_terms_id: "fee_terms_g3d",
    approval_state: "approved",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.legal_client_party_id, party_ids[0]);
  assert.equal(descriptor.matter_id, null);
});

test("G3-D FeeTerms descriptor accepts hourly, fixed, cap, and retainer variants", () => {
  const variants = [
    ["hourly", { rate_card_ref: "rate_card:g3d" }],
    ["fixed", { fixed_fee_amount: 5000000 }],
    ["cap", { cap_amount: 10000000 }],
    ["retainer", { retainer_amount: 3000000 }],
  ];

  assert.deepEqual(INTAKE_G3D_FEE_TERM_TYPES, ["hourly", "fixed", "cap", "retainer"]);

  for (const [fee_type, detail] of variants) {
    const descriptor = createIntakeFeeTermsDescriptor({
      tenant_id,
      actor_id,
      fee_terms_id: `fee_terms_g3d_${fee_type}`,
      intake_request_id: "intake_g3d",
      fee_type,
      currency: "KRW",
      ...detail,
    });

    assert.equal(descriptor.outcome, "review_required");
    assert.equal(descriptor.fee_type, fee_type);
    assert.equal(descriptor.writes_product_state, false);
  }
}
);

test("G3-D risk approval queue requires approval audit evidence", () => {
  const blocked = createIntakeRiskApprovalQueueDescriptor({
    tenant_id,
    actor_id,
    risk_approval_id: "risk_approval_g3d",
    intake_request_id: "intake_g3d",
    conflict_check_id: "conflict_check_g3d",
    reviewer_user_id: "risk_reviewer_g3d",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("risk_approval_audit_required"));

  const descriptor = createIntakeRiskApprovalQueueDescriptor({
    tenant_id,
    actor_id,
    risk_approval_id: "risk_approval_g3d",
    intake_request_id: "intake_g3d",
    conflict_check_id: "conflict_check_g3d",
    reviewer_user_id: "risk_reviewer_g3d",
    approval_audit_ref: "audit:risk-approval:g3d",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.queue_receipt.approval_audit_required, true);
  assert.equal(descriptor.queue_receipt.enqueued, false);
});

test("G3-D clearance token blocks expired, stale, and runtime Matter-opening claims", () => {
  const descriptor = createIntakeClearanceTokenDescriptor({
    tenant_id,
    actor_id,
    clearance_token_id: "clearance_g3d",
    intake_request_id: "intake_g3d",
    conflict_check_id: "conflict_check_g3d",
    engagement_id: "engagement_g3d",
    issued_at: "2026-06-19T00:00:00.000Z",
    expires_at: "2026-06-20T00:00:00.000Z",
    current_time: "2026-06-19T01:00:00.000Z",
    snapshot_hash: "snapshot:g3d",
    current_snapshot_hash: "snapshot:g3d",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.token_state, "candidate");
  assert.equal(descriptor.clearance_receipt.valid_for_runtime_matter_opening, false);
  assert.equal(descriptor.persists_clearance_token, false);

  const expired = createIntakeClearanceTokenDescriptor({
    tenant_id,
    actor_id,
    clearance_token_id: "clearance_g3d_expired",
    intake_request_id: "intake_g3d",
    conflict_check_id: "conflict_check_g3d",
    engagement_id: "engagement_g3d",
    issued_at: "2026-06-18T00:00:00.000Z",
    expires_at: "2026-06-18T01:00:00.000Z",
    current_time: "2026-06-19T01:00:00.000Z",
    snapshot_hash: "snapshot:g3d",
    current_snapshot_hash: "snapshot:g3d",
  });
  assert.equal(expired.token_state, "expired");
  assert.ok(expired.blocked_claims.includes("clearance_token_expired"));

  const stale = createIntakeClearanceTokenDescriptor({
    tenant_id,
    actor_id,
    clearance_token_id: "clearance_g3d_stale",
    intake_request_id: "intake_g3d",
    conflict_check_id: "conflict_check_g3d",
    engagement_id: "engagement_g3d",
    issued_at: "2026-06-19T00:00:00.000Z",
    expires_at: "2026-06-20T00:00:00.000Z",
    current_time: "2026-06-19T01:00:00.000Z",
    snapshot_hash: "snapshot:old",
    current_snapshot_hash: "snapshot:new",
    create_matter: true,
  });
  assert.equal(stale.token_state, "stale");
  assert.ok(stale.blocked_claims.includes("clearance_token_stale_snapshot"));
  assert.ok(stale.blocked_claims.includes("intake_to_matter_runtime_still_closed"));
});

test("G3-D workflow closeout records evidence and keeps runtime readiness open", () => {
  const descriptor = createIntakeG3DWorkflowCloseoutDescriptor({
    conflict_search_evidence: ["alias/relationship/former matter search test"],
    decision_workflow_evidence: ["reviewer required decision test"],
    waiver_evidence: ["consent document required test"],
    engagement_evidence: ["legal client and scope required test"],
    fee_terms_evidence: ["hourly/fixed/cap/retainer test"],
    risk_approval_evidence: ["approval audit test"],
    clearance_token_evidence: ["expired/stale token blocked test"],
    command_evidence: ["npm run client-matter:g3d:validate"],
    pr_state: {
      branch: "codex/lawos-g3-conflict-engagement-workflow",
      base_branch: "codex/lawos-g3-intake-conflict-schema",
      draft: true,
      clean: true,
      merge_authority: "human_only",
    },
    human_review_disposition: "pending",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.missing_evidence.length, 0);
  assert.equal(descriptor.intake_to_matter_runtime_readiness_claim, "open");
  assert.equal(descriptor.g3_runtime_readiness_claim, "open");

  const blocked = createIntakeG3DWorkflowCloseoutDescriptor({
    pr_state: { draft: true, merge_authority: "human_only" },
  });
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("g3d_workflow_closeout_evidence_missing"));
});
