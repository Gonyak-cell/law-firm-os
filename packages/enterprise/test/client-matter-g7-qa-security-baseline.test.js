import assert from "node:assert/strict";
import test from "node:test";

import {
  ENTERPRISE_G7F_TUW_COVERAGE,
  createEnterpriseG7AuditCompletenessDescriptor,
  createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor,
  createEnterpriseG7IdempotencyBaselineDescriptor,
  createEnterpriseG7IntegrationBaselineDescriptor,
  createEnterpriseG7PermissionNegativeDescriptor,
  createEnterpriseG7TestStrategyDescriptor,
  createEnterpriseG7UnitBaselineDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7f_enterprise";

test("G7-F test strategy requires PM/QA review marker without final approval claim", () => {
  const strategy = createEnterpriseG7TestStrategyDescriptor({
    tenant_id,
    test_strategy: {
      strategy_doc_ref: "test_strategy_g7f",
      pm_qa_review_required: true,
      pm_qa_review_marker_ref: "pm_qa_marker_g7f",
      risk_matrix_ref: "risk_matrix_g7f",
      workflow_coverage_matrix_ref: "workflow_coverage_g7f",
    },
  });

  assert.equal(strategy.outcome, "review_required");
  assert.equal(strategy.test_strategy_receipt.pm_qa_review_required, true);
  assert.equal(strategy.test_strategy_receipt.risk_coverage_matrix_present, true);

  const blocked = createEnterpriseG7TestStrategyDescriptor({
    tenant_id,
    test_strategy: {
      strategy_doc_ref: "test_strategy_bad",
      pm_qa_final_approval_claimed: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("test_strategy_pm_qa_review_required"));
  assert.ok(blocked.blocked_claims.includes("test_strategy_risk_coverage_matrix_required"));
  assert.ok(blocked.blocked_claims.includes("test_strategy_final_approval_claim_blocked"));
});

test("G7-F unit and integration baselines require threshold and key workflow evidence", () => {
  const unit = createEnterpriseG7UnitBaselineDescriptor({
    tenant_id,
    unit_baseline: {
      unit_suite_ref: "unit_suite_g7f",
      unit_suite_inventory_reviewed: true,
      coverage_threshold_ref: "coverage_threshold_g7f",
      coverage_threshold_percent: 80,
      coverage_threshold_reviewed: true,
      failure_budget_ref: "failure_budget_g7f",
    },
  });
  const integration = createEnterpriseG7IntegrationBaselineDescriptor({
    tenant_id,
    integration_baseline: {
      integration_suite_ref: "integration_suite_g7f",
      workflow_list_ref: "key_workflows_g7f",
      key_workflows_passed: true,
      environment_isolated: true,
    },
  });

  assert.equal(unit.outcome, "review_required");
  assert.equal(unit.unit_baseline_receipt.coverage_threshold_reviewed, true);
  assert.equal(integration.outcome, "review_required");
  assert.equal(integration.integration_baseline_receipt.key_workflows_passed, true);

  const blocked = createEnterpriseG7IntegrationBaselineDescriptor({
    tenant_id,
    integration_baseline: {
      integration_suite_ref: "integration_bad",
      calls_external_provider_api: true,
      live_customer_data_used: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("integration_baseline_key_workflow_pass_required"));
  assert.ok(blocked.blocked_claims.includes("integration_baseline_isolated_environment_required"));
  assert.ok(blocked.blocked_claims.includes("integration_baseline_external_runtime_blocked"));
});

test("G7-F permission negative and audit completeness descriptors block bypass and unaudited writes", () => {
  const permission = createEnterpriseG7PermissionNegativeDescriptor({
    tenant_id,
    permission_negative: {
      negative_suite_ref: "permission_negative_g7f",
      unauthorized_access_blocked: true,
      deny_matrix_ref: "deny_matrix_g7f",
      deny_over_allow_tested: true,
    },
  });
  const audit = createEnterpriseG7AuditCompletenessDescriptor({
    tenant_id,
    audit_completeness: {
      write_event_matrix_ref: "write_event_matrix_g7f",
      every_write_has_event: true,
      audit_event_schema_ref: "audit_schema_g7f",
      audit_event_schema_reviewed: true,
    },
  });

  assert.equal(permission.outcome, "review_required");
  assert.equal(permission.permission_negative_receipt.unauthorized_access_blocked, true);
  assert.equal(audit.outcome, "review_required");
  assert.equal(audit.audit_completeness_receipt.every_write_has_event, true);

  const blocked = createEnterpriseG7AuditCompletenessDescriptor({
    tenant_id,
    audit_completeness: {
      writes_without_audit_allowed: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("audit_completeness_every_write_event_required"));
  assert.ok(blocked.blocked_claims.includes("audit_completeness_schema_review_required"));
  assert.ok(blocked.blocked_claims.includes("audit_completeness_write_without_audit_blocked"));
});

test("G7-F idempotency baseline requires duplicate command safety without key persistence", () => {
  const idempotency = createEnterpriseG7IdempotencyBaselineDescriptor({
    tenant_id,
    idempotency_baseline: {
      idempotency_suite_ref: "idempotency_suite_g7f",
      duplicate_commands_safe: true,
      idempotency_key_ref: "idempotency_key_g7f",
      replay_protection_tested: true,
    },
  });

  assert.equal(idempotency.outcome, "review_required");
  assert.equal(idempotency.idempotency_baseline_receipt.duplicate_commands_safe, true);
  assert.equal(idempotency.idempotency_baseline_receipt.replay_protection_tested, true);

  const blocked = createEnterpriseG7IdempotencyBaselineDescriptor({
    tenant_id,
    idempotency_baseline: {
      idempotency_suite_ref: "idempotency_bad",
      duplicate_side_effect_allowed: true,
      persists_idempotency_key: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("idempotency_duplicate_command_safe_required"));
  assert.ok(blocked.blocked_claims.includes("idempotency_replay_protection_required"));
  assert.ok(blocked.blocked_claims.includes("idempotency_key_persistence_blocked"));
});

test("G7-F closeout summarizes six QA/security TUWs without security approval or go-live", () => {
  const descriptors = ENTERPRISE_G7F_TUW_COVERAGE.map((tuw_id) => ({ tuw_id, outcome: "review_required" }));
  const closeout = createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor({
    tenant_id,
    g7e_handoff_validated: true,
    rp26_contract_validated: true,
    descriptors,
  });

  assert.deepEqual(closeout.tuw_coverage, ENTERPRISE_G7F_TUW_COVERAGE);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.security_approval_claimed, false);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor({
    tenant_id,
    descriptors: [{ tuw_id: "LFOS-G7-W15-T001", outcome: "review_required" }],
    claims_security_approval: true,
    claims_uat_completion: true,
    claims_runtime_readiness: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("qa_security_baseline_requires_g7e_handoff"));
  assert.ok(blocked.blocked_claims.includes("qa_security_baseline_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("qa_security_baseline_security_approval_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("qa_security_baseline_go_live_claim_blocked"));
});
