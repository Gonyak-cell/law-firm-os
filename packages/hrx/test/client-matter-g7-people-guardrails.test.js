import assert from "node:assert/strict";
import test from "node:test";

import {
  HRX_G7C_TUW_COVERAGE,
  createHrxG7CPeopleGuardrailsCloseoutDescriptor,
  createHrxG7CandidateSeparationDescriptor,
  createHrxG7CapacityProfileDescriptor,
  createHrxG7EmployeeSchemaDescriptor,
  createHrxG7EvaluationAccessDescriptor,
  createHrxG7HrDocumentGuardrailDescriptor,
  createHrxG7UserEmployeeSeparationDescriptor,
  createHrxG7WorkloadReadModelDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7c_hrx";

test("G7-C User and Employee descriptors preserve no-conflation boundaries", () => {
  const separation = createHrxG7UserEmployeeSeparationDescriptor({
    tenant_id,
    separation_review: {
      no_conflation_reviewed: true,
      user_identity_source: "iam_user",
      employee_identity_source: "hrx_employee",
    },
  });
  const employee = createHrxG7EmployeeSchemaDescriptor({
    tenant_id,
    employee: {
      employee_id: "employee_g7c",
      user_ref: "user_g7c",
      user_ref_controlled: true,
      user_ref_purpose: "login_mapping",
    },
  });

  assert.equal(separation.outcome, "review_required");
  assert.equal(separation.separation_receipt.no_conflation_reviewed, true);
  assert.equal(employee.outcome, "review_required");
  assert.equal(employee.employee_schema_receipt.user_ref_optional_or_controlled, true);

  const blocked = createHrxG7EmployeeSchemaDescriptor({
    tenant_id,
    employee: {
      employee_id: "employee_bad",
      user_ref: "user_bad",
      user_ref_controlled: false,
      user_account_required: true,
      may_authorize_user_session: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("employee_user_ref_optional_controlled_required"));
  assert.ok(blocked.blocked_claims.includes("employee_user_account_requirement_blocked"));
  assert.ok(blocked.blocked_claims.includes("employee_user_session_authority_blocked"));
});

test("G7-C capacity and workload descriptors require denominator and aggregate evidence", () => {
  const capacity = createHrxG7CapacityProfileDescriptor({
    tenant_id,
    capacity_profile: {
      employee_id: "employee_g7c",
      denominator_hours: 160,
      utilization_denominator_ref: "capacity_policy_g7c",
    },
  });
  const workload = createHrxG7WorkloadReadModelDescriptor({
    tenant_id,
    workload_read_model: {
      model_id: "workload_g7c",
      matter_time_aggregation_ref: "matter_time_rollup_g7c",
      time_entry_aggregation_tested: true,
    },
  });

  assert.equal(capacity.capacity_profile_receipt.utilization_denominator_tested, true);
  assert.equal(workload.workload_read_model_receipt.matter_time_aggregation_tested, true);

  const blocked = createHrxG7WorkloadReadModelDescriptor({
    tenant_id,
    workload_read_model: {
      model_id: "workload_bad",
      raw_time_entries_included: true,
      client_detail_leak: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("workload_matter_time_aggregation_required"));
  assert.ok(blocked.blocked_claims.includes("workload_client_detail_leak_blocked"));
});

test("G7-C HR document and evaluation descriptors enforce ACL and audit-on-read", () => {
  const document = createHrxG7HrDocumentGuardrailDescriptor({
    tenant_id,
    hr_document: {
      document_id: "hr_doc_g7c",
      hr_acl_checked: true,
      non_hr_denied: true,
    },
  });
  const evaluation = createHrxG7EvaluationAccessDescriptor({
    tenant_id,
    evaluation_record: {
      evaluation_id: "evaluation_g7c",
      authorized_reviewer: true,
      audit_on_read: true,
      audit_hint_ref: "audit_hint_g7c",
    },
  });

  assert.equal(document.hr_document_guardrail_receipt.non_hr_denied_tested, true);
  assert.equal(evaluation.evaluation_access_receipt.audit_on_read_tested, true);

  const blocked = createHrxG7EvaluationAccessDescriptor({
    tenant_id,
    evaluation_record: {
      evaluation_id: "evaluation_bad",
      authorized_reviewer: false,
      score_finalized: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("evaluation_access_authorized_reviewer_required"));
  assert.ok(blocked.blocked_claims.includes("evaluation_access_audit_on_read_required"));
  assert.ok(blocked.blocked_claims.includes("evaluation_score_finalization_blocked"));
});

test("G7-C candidate separation and closeout block CRM Party contamination and overclaims", () => {
  const candidate = createHrxG7CandidateSeparationDescriptor({
    tenant_id,
    candidate: {
      candidate_id: "candidate_g7c",
      separated_from_crm_party: true,
      no_crm_party_contamination: true,
    },
  });
  const closeout = createHrxG7CPeopleGuardrailsCloseoutDescriptor({
    tenant_id,
    g7b_handoff_validated: true,
    rp30_contract_validated: true,
    descriptors: [
      { tuw_id: "LFOS-G7-W13-T001", outcome: "review_required" },
      { tuw_id: "LFOS-G7-W13-T002", outcome: "review_required" },
      { tuw_id: "LFOS-G7-W13-T003", outcome: "review_required" },
      { tuw_id: "LFOS-G7-W13-T004", outcome: "review_required" },
      { tuw_id: "LFOS-G7-W13-T005", outcome: "review_required" },
      { tuw_id: "LFOS-G7-W13-T006", outcome: "review_required" },
      candidate,
      { tuw_id: "LFOS-G7-W13-T008", outcome: "review_required" },
    ],
  });

  assert.deepEqual(closeout.tuw_coverage, HRX_G7C_TUW_COVERAGE);
  assert.equal(candidate.candidate_separation_receipt.crm_party_contamination_tested, true);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.enterprise_trust_claimed, false);
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createHrxG7CPeopleGuardrailsCloseoutDescriptor({
    tenant_id,
    descriptors: [candidate],
    claims_enterprise_trust: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("hrx_guardrails_requires_g7b_handoff"));
  assert.ok(blocked.blocked_claims.includes("hrx_guardrails_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("hrx_guardrails_enterprise_trust_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("hrx_guardrails_go_live_claim_blocked"));
});
