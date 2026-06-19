import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATFORM_G7G_TUW_COVERAGE,
  createPlatformG7BackupRestoreDrillDescriptor,
  createPlatformG7GReleaseReadinessCloseoutDescriptor,
  createPlatformG7PerformanceSmokeDescriptor,
  createPlatformG7SecurityRegressionDescriptor,
  createPlatformG7StateTransitionTestDescriptor,
  createPlatformG7UatScriptPackageDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7g_platform";

test("G7-G state transition tests require blocked invalid transitions without runtime execution", () => {
  const descriptor = createPlatformG7StateTransitionTestDescriptor({
    tenant_id,
    state_transition_suite: {
      suite_ref: "state_transition_suite_g7g",
      invalid_transition_matrix_ref: "invalid_transition_matrix_g7g",
      state_machine_model_ref: "state_machine_model_g7g",
      invalid_transitions_blocked: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.state_transition_receipt.invalid_transitions_blocked, true);
  assert.equal(descriptor.state_transition_receipt.runtime_executed, false);

  const blocked = createPlatformG7StateTransitionTestDescriptor({
    tenant_id,
    state_transition_suite: {
      suite_ref: "state_transition_bad",
      invalid_transition_allowed: true,
      executes_state_machine_runtime: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("state_transition_invalid_transition_blocked_required"));
  assert.ok(blocked.blocked_claims.includes("state_transition_invalid_transition_allowed_blocked"));
  assert.ok(blocked.blocked_claims.includes("state_transition_runtime_execution_blocked"));
});

test("G7-G security regression requires tenant leak absence and blocks customer payloads", () => {
  const descriptor = createPlatformG7SecurityRegressionDescriptor({
    tenant_id,
    security_regression: {
      suite_ref: "security_regression_g7g",
      tenant_isolation_matrix_ref: "tenant_isolation_matrix_g7g",
      privilege_regression_ref: "privilege_regression_g7g",
      tenant_leak_absent: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.security_regression_receipt.tenant_leak_absent, true);
  assert.equal(descriptor.security_regression_receipt.includes_customer_data_payload, false);

  const blocked = createPlatformG7SecurityRegressionDescriptor({
    tenant_id,
    security_regression: {
      suite_ref: "security_regression_bad",
      tenant_leak_detected: true,
      includes_customer_data_payload: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("security_regression_tenant_leak_absent_required"));
  assert.ok(blocked.blocked_claims.includes("security_regression_tenant_leak_blocked"));
  assert.ok(blocked.blocked_claims.includes("security_regression_customer_payload_blocked"));
});

test("G7-G performance smoke and backup restore require threshold and restore evidence", () => {
  const performance = createPlatformG7PerformanceSmokeDescriptor({
    tenant_id,
    performance_smoke: {
      smoke_report_ref: "performance_smoke_g7g",
      latency_threshold_ref: "latency_threshold_g7g",
      agreed_latency_threshold_ms: 500,
      threshold_reviewed: true,
      sample_window_ref: "sample_window_g7g",
    },
  });
  const backup = createPlatformG7BackupRestoreDrillDescriptor({
    tenant_id,
    backup_restore: {
      drill_report_ref: "backup_restore_g7g",
      restore_point_ref: "restore_point_g7g",
      rollback_runbook_ref: "rollback_runbook_g7g",
      rpo_rto_review_ref: "rpo_rto_review_g7g",
      restore_verified: true,
    },
  });

  assert.equal(performance.outcome, "review_required");
  assert.equal(performance.performance_smoke_receipt.latency_threshold_reviewed, true);
  assert.equal(backup.outcome, "review_required");
  assert.equal(backup.backup_restore_receipt.restore_verified, true);

  const blocked = createPlatformG7BackupRestoreDrillDescriptor({
    tenant_id,
    backup_restore: {
      drill_report_ref: "backup_restore_bad",
      production_restore_executed: true,
      executes_backup_restore_runtime: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("backup_restore_restore_verified_required"));
  assert.ok(blocked.blocked_claims.includes("backup_restore_runtime_execution_blocked"));
  assert.ok(blocked.blocked_claims.includes("backup_restore_production_restore_blocked"));
});

test("G7-G UAT package records user signoff while blocking full UAT completion claims", () => {
  const descriptor = createPlatformG7UatScriptPackageDescriptor({
    tenant_id,
    uat_package: {
      script_package_ref: "uat_script_package_g7g",
      role_scenario_matrix_ref: "role_scenario_matrix_g7g",
      signoff_tracker_ref: "signoff_tracker_g7g",
      representative_user_signoff_ref: "representative_user_signoff_g7g",
      user_signoff_recorded: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.uat_package_receipt.user_signoff_recorded, true);
  assert.equal(descriptor.uat_package_receipt.uat_completion_claimed, false);

  const blocked = createPlatformG7UatScriptPackageDescriptor({
    tenant_id,
    uat_package: {
      script_package_ref: "uat_bad",
      claims_full_uat_completion: true,
      executes_uat_runtime: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("uat_script_user_signoff_required"));
  assert.ok(blocked.blocked_claims.includes("uat_completion_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("uat_script_runtime_execution_blocked"));
});

test("G7-G release readiness closeout keeps approval and go-live as human review boundaries", () => {
  const descriptors = PLATFORM_G7G_TUW_COVERAGE.map((tuw_id) => ({ tuw_id, outcome: "review_required" }));
  const closeout = createPlatformG7GReleaseReadinessCloseoutDescriptor({
    tenant_id,
    g7f_handoff_validated: true,
    rp27_contract_validated: true,
    rp29_contract_validated: true,
    descriptors,
    readiness_review_packet_ref: "readiness_review_packet_g7g",
    unresolved_findings_register_ref: "unresolved_findings_register_g7g",
    waiver_register_ref: "waiver_register_g7g",
    human_readiness_disposition_required: true,
    human_disposition_tracker_ref: "human_disposition_tracker_g7g",
  });

  assert.deepEqual(closeout.tuw_coverage, PLATFORM_G7G_TUW_COVERAGE);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.human_readiness_disposition_required, true);
  assert.equal(closeout.closeout_receipt.g7_approval_claimed, false);
  assert.equal(closeout.closeout_receipt.production_readiness_claim, "open");
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createPlatformG7GReleaseReadinessCloseoutDescriptor({
    tenant_id,
    descriptors: [{ tuw_id: "LFOS-G7-W15-T007", outcome: "review_required" }],
    claims_g7_approval: true,
    claims_security_approval: true,
    claims_uat_completion: true,
    claims_production_readiness: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("release_readiness_requires_g7f_handoff"));
  assert.ok(blocked.blocked_claims.includes("release_readiness_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("release_readiness_human_disposition_required"));
  assert.ok(blocked.blocked_claims.includes("release_readiness_g7_approval_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("release_readiness_go_live_claim_blocked"));
});
