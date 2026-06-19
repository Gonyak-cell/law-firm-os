import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMERCIAL_G7B_TUW_COVERAGE,
  createCommercialG7ComplianceReportDescriptor,
  createCommercialG7DeploymentRunDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7b_commercial";

function deploymentRun(overrides = {}) {
  return {
    tenant_id,
    deployment_run_id: "deploy_g7b",
    rollback_record_ref: "rollback_record_g7b",
    rollback_tested: true,
    ...overrides,
  };
}

function complianceReport(overrides = {}) {
  return {
    tenant_id,
    report_id: "compliance_g7b",
    evidence_items: [
      { evidence_ref: "soc2_control_mapping", status: "ready_for_review" },
      { evidence_ref: "ismsp_policy_mapping", status: "ready_for_review" },
    ],
    ...overrides,
  };
}

test("G7-B deployment run descriptor requires rollback record without executing deploy", () => {
  const descriptor = createCommercialG7DeploymentRunDescriptor({
    tenant_id,
    deployment_run: deploymentRun(),
  });

  assert.deepEqual(COMMERCIAL_G7B_TUW_COVERAGE, ["LFOS-G7-W12-T006", "LFOS-G7-W12-T007"]);
  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.deployment_run_receipt.rollback_record_tested, true);
  assert.equal(descriptor.deployment_run_receipt.deployment_executed, false);
  assert.equal(descriptor.g7_runtime_readiness_claim, "open");

  const blocked = createCommercialG7DeploymentRunDescriptor({
    tenant_id,
    deployment_run: deploymentRun({
      rollback_record_ref: "",
      rollback_tested: false,
      failed_deploy_masked: true,
      deploy_executed: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("deployment_run_rollback_record_required"));
  assert.ok(blocked.blocked_claims.includes("deployment_run_failed_deploy_masking_blocked"));
  assert.ok(blocked.blocked_claims.includes("deployment_run_execution_blocked"));
  assert.ok(blocked.blocked_claims.includes("deployment_run_runtime_dispatch_blocked"));
});

test("G7-B compliance report descriptor requires evidence checklist and blocks certification claims", () => {
  const descriptor = createCommercialG7ComplianceReportDescriptor({
    tenant_id,
    compliance_report: complianceReport(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.compliance_report_receipt.evidence_checklist_tested, true);
  assert.equal(descriptor.compliance_report_receipt.soc2_approval_claimed, false);
  assert.equal(descriptor.compliance_report_receipt.enterprise_approval_claimed, false);

  const blocked = createCommercialG7ComplianceReportDescriptor({
    tenant_id,
    compliance_report: complianceReport({
      evidence_items: [{ evidence_ref: "", status: "" }],
      claims_soc2_approval: true,
      claims_ismsp_approval: true,
      claims_enterprise_approval: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("compliance_report_evidence_checklist_required"));
  assert.ok(blocked.blocked_claims.includes("compliance_report_certification_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("compliance_report_enterprise_approval_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("compliance_report_runtime_dispatch_blocked"));
});
