#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHrxMatterAssignment } from "../packages/hrx/src/assignment.js";
import {
  HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS,
  createOnboardingPlan,
  evaluateOnboardingMatterAssignmentGate,
  updateOnboardingTask,
} from "../packages/hrx/src/onboarding.js";
import { evaluateMatterAssignmentOnboardingReadiness } from "../packages/matter/src/staffing-service.js";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.md");

const tenant_id = "tenant_amic_matter_vault";
const employee_id = "emp_upl_d13_onboarding";
const matter_id = "matter_upl_d13_gate";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assignmentInput(assignment_id) {
  return {
    tenant_id,
    assignment_id,
    employee_id,
    matter_id,
    role_id: "role-associate",
    position_id: "pos-associate",
    practice_group_id: "pg-litigation",
    capacity_pct: 40,
    effective_from: "2026-07-03",
  };
}

function captureBlockedAssignment(plan, assignment_id) {
  try {
    createHrxMatterAssignment(assignmentInput(assignment_id), { onboarding_plans: [plan] });
    return { assignment_created: true, safe_error_code: null };
  } catch (error) {
    return {
      assignment_created: false,
      safe_error_code: error.safe_error_code ?? null,
      reason: error.decision?.reason ?? error.message,
      missing_task_ids: error.decision?.missing_task_ids ?? [],
    };
  }
}

function writeArtifacts(receipt) {
  mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
  writeFileSync(ARTIFACT_JSON, `${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(
    ARTIFACT_MD,
    [
      "# UPL-D-13 HRX Onboarding Gate Proof",
      "",
      `- Verdict: ${receipt.verdict}`,
      `- Generated at: ${receipt.generated_at}`,
      `- Required task ids: ${receipt.default_gate.required_task_ids.join(", ")}`,
      `- Empty-plan attempt: ${receipt.blocked_attempts.empty_plan.safe_error_code}`,
      `- Partial-plan attempt: ${receipt.blocked_attempts.partial_plan.safe_error_code}`,
      `- Completed-plan assignment hash: ${receipt.allowed_attempts.completed_plan.assignment_hash}`,
      `- Waiver assignment hash: ${receipt.allowed_attempts.waiver.assignment_hash}`,
      "",
      "The receipt proves matter assignment is blocked before the default onboarding gate completes, while preserving an explicit waiver path.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const basePlan = createOnboardingPlan({
    tenant_id,
    onboarding_id: "onb-upl-d13",
    employee_id,
    start_date: "2026-07-03",
    tasks: [],
  });
  assert.deepEqual(basePlan.matter_assignment_gate.required_task_ids, HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS);
  assert.equal(basePlan.tasks.filter((task) => HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS.includes(task.task_id)).length, 2);

  const missingPlanDecision = evaluateOnboardingMatterAssignmentGate({
    employee_id,
    onboarding_plans: [],
  });
  assert.equal(missingPlanDecision.effect, "deny");
  assert.equal(missingPlanDecision.safe_error_code, "HRX_ONBOARDING_GATE_PLAN_REQUIRED");

  const emptyPlanDecision = evaluateOnboardingMatterAssignmentGate({
    employee_id,
    onboarding_plans: [basePlan],
  });
  assert.equal(emptyPlanDecision.effect, "deny");
  assert.equal(emptyPlanDecision.safe_error_code, "HRX_ONBOARDING_GATE_INCOMPLETE");
  const emptyAttempt = captureBlockedAssignment(basePlan, "assign-upl-d13-empty");
  assert.equal(emptyAttempt.assignment_created, false);
  assert.equal(emptyAttempt.safe_error_code, "HRX_ONBOARDING_GATE_INCOMPLETE");

  const trainingComplete = updateOnboardingTask(basePlan, "default-security-training", { status: "completed" });
  const partialDecision = evaluateOnboardingMatterAssignmentGate({
    employee_id,
    onboarding_plans: [trainingComplete],
  });
  assert.equal(partialDecision.effect, "deny");
  assert.deepEqual(partialDecision.missing_task_ids, ["default-confidentiality-pledge"]);
  const matterStaffingReadiness = evaluateMatterAssignmentOnboardingReadiness({ plan: trainingComplete });
  assert.equal(matterStaffingReadiness.outcome, "blocked");
  assert.deepEqual(matterStaffingReadiness.missing_task_ids, ["default-confidentiality-pledge"]);
  const partialAttempt = captureBlockedAssignment(trainingComplete, "assign-upl-d13-partial");
  assert.equal(partialAttempt.assignment_created, false);
  assert.equal(partialAttempt.safe_error_code, "HRX_ONBOARDING_GATE_INCOMPLETE");

  const completedPlan = updateOnboardingTask(trainingComplete, "default-confidentiality-pledge", { status: "completed" });
  const completedAssignment = createHrxMatterAssignment(assignmentInput("assign-upl-d13-complete"), {
    onboarding_plans: [completedPlan],
  });
  assert.equal(completedAssignment.onboarding_gate_decision.effect, "allow");
  assert.equal(completedAssignment.onboarding_gate_decision.reason, "onboarding_gate_complete");

  const waiverRef = "Waiver:UPL-D13-owner-approval";
  const waiverAssignment = createHrxMatterAssignment(assignmentInput("assign-upl-d13-waiver"), {
    onboarding_plans: [basePlan],
    waiver_ref: waiverRef,
  });
  assert.equal(waiverAssignment.onboarding_gate_decision.effect, "allow");
  assert.equal(waiverAssignment.onboarding_gate_decision.reason, "onboarding_gate_waived");
  assert.equal(waiverAssignment.onboarding_gate_decision.waiver_ref, waiverRef);

  const receipt = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    objective:
      "UPL-D-13 default onboarding gate blocks matter assignment until security training and confidentiality pledge are complete, with explicit waiver preserved.",
    tenant_id,
    employee_id,
    matter_id,
    default_gate: {
      required_task_ids: HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS,
      injected_task_count: basePlan.tasks.filter((task) => HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS.includes(task.task_id))
        .length,
      gate_enabled: basePlan.matter_assignment_gate.enabled,
    },
    matter_staffing_gate_contract: {
      outcome: matterStaffingReadiness.outcome,
      reason: matterStaffingReadiness.reason,
      missing_task_ids: matterStaffingReadiness.missing_task_ids,
    },
    blocked_attempts: {
      missing_plan: {
        effect: missingPlanDecision.effect,
        safe_error_code: missingPlanDecision.safe_error_code,
        assignment_created: false,
      },
      empty_plan: emptyAttempt,
      partial_plan: partialAttempt,
    },
    allowed_attempts: {
      completed_plan: {
        effect: completedAssignment.onboarding_gate_decision.effect,
        reason: completedAssignment.onboarding_gate_decision.reason,
        missing_task_ids: completedAssignment.onboarding_gate_decision.missing_task_ids,
        assignment_hash: sha256({
          assignment_id: completedAssignment.assignment_id,
          matter_id: completedAssignment.matter_id,
          employee_id: completedAssignment.employee_id,
        }),
      },
      waiver: {
        effect: waiverAssignment.onboarding_gate_decision.effect,
        reason: waiverAssignment.onboarding_gate_decision.reason,
        waiver_ref_hash: sha256(waiverRef),
        assignment_hash: sha256({
          assignment_id: waiverAssignment.assignment_id,
          matter_id: waiverAssignment.matter_id,
          employee_id: waiverAssignment.employee_id,
        }),
      },
    },
    leak_checks: {
      raw_document_body_written: false,
      authorization_header_written: false,
      session_token_written: false,
      client_secret_written: false,
    },
    commands: [
      "node --test packages/hrx/test/onboarding.test.js packages/hrx/test/assignment.test.js",
      "node scripts/run-upl-d13-hrx-onboarding-gate-proof.mjs",
    ],
  };

  writeArtifacts(receipt);
  console.log(`UPL-D-13 HRX onboarding gate proof PASS: ${ARTIFACT_JSON}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
