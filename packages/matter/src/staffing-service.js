import { createMatterMember } from "./model.js";
import { evaluateMatterRolePermission } from "./role-policy.js";

export const MATTER_ONBOARDING_GATE_ERROR_CODE = "MATTER_ONBOARDING_GATE_REQUIRED";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function normalizedTaskText(task = {}) {
  return `${task.task_id ?? ""} ${task.title ?? ""}`.toLowerCase();
}

function hasAnyToken(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function isSecurityTrainingTask(task) {
  const text = normalizedTaskText(task);
  return hasAnyToken(text, ["security", "보안"]) && hasAnyToken(text, ["training", "교육"]);
}

function isSecurityPledgeTask(task) {
  const text = normalizedTaskText(task);
  return hasAnyToken(text, ["pledge", "acknowledgement", "acknowledgment", "서약", "동의"]);
}

function hasCompleted(tasks) {
  return tasks.some((task) => task.status === "completed");
}

export class MatterOnboardingGateError extends Error {
  constructor(readiness) {
    super("Onboarding gate blocks Matter assignment until security training and pledge tasks are completed");
    this.name = "MatterOnboardingGateError";
    this.code = MATTER_ONBOARDING_GATE_ERROR_CODE;
    this.readiness = readiness;
  }
}

export function evaluateMatterAssignmentOnboardingReadiness({ plan } = {}) {
  if (!plan) return Object.freeze({ outcome: "allow", reason: "no_onboarding_plan" });
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const trainingTasks = tasks.filter(isSecurityTrainingTask);
  const pledgeTasks = tasks.filter(isSecurityPledgeTask);
  const gateConfigured = plan.matter_assignment_gate === true || trainingTasks.length > 0 || pledgeTasks.length > 0;
  if (!gateConfigured) return Object.freeze({ outcome: "allow", reason: "legacy_onboarding_plan" });

  const missing_task_ids = [];
  if (!hasCompleted(trainingTasks)) missing_task_ids.push("security-training");
  if (!hasCompleted(pledgeTasks)) missing_task_ids.push("security-pledge");
  if (missing_task_ids.length === 0) {
    return Object.freeze({ outcome: "allow", reason: "onboarding_gate_completed" });
  }
  return Object.freeze({
    outcome: "blocked",
    reason: "onboarding_gate_incomplete",
    onboarding_id: plan.onboarding_id ?? null,
    employee_id: plan.employee_id ?? null,
    missing_task_ids: Object.freeze(missing_task_ids),
  });
}

function resolveOnboardingReadiness({ onboardingGate, member } = {}) {
  if (!onboardingGate) return null;
  const request = { tenant_id: member?.tenant_id, employee_id: member?.employee_id };
  if (typeof onboardingGate === "function") return onboardingGate(request);
  if (typeof onboardingGate.getMatterAssignmentReadiness === "function") {
    return onboardingGate.getMatterAssignmentReadiness(request);
  }
  return null;
}

export function assertMatterStaffingAvailable({ employee, member, onboardingGate } = {}) {
  if (!member?.employee_id) throw new Error("MatterTeam member requires employee_id; user_id-only member is blocked");
  if (member.user_id && member.user_id === member.employee_id) {
    throw new Error("MatterTeam member must not conflate user_id and employee_id");
  }
  if (!employee) throw new Error(`Employee not found for MatterTeam member: ${member.employee_id}`);
  if (employee.tenant_id !== member.tenant_id) throw new Error("Employee tenant must match MatterTeam member tenant");
  if (["terminated", "offboarded"].includes(employee.status)) throw new Error("Offboarded employee cannot be staffed to Matter");
  if (employee.availability === "unavailable") throw new Error("Unavailable employee cannot be staffed to Matter");
  const onboardingReadiness = resolveOnboardingReadiness({ onboardingGate, member });
  if (onboardingReadiness?.outcome === "blocked") throw new MatterOnboardingGateError(onboardingReadiness);
}

export function addMatterTeamMember({ repository, employeeDirectory, onboardingGate, matter, member, actor_id, audit } = {}) {
  requiredString({ actor_id }, "actor_id");
  const employee = employeeDirectory?.get?.({ tenant_id: member?.tenant_id, employee_id: member?.employee_id })
    ?? employeeDirectory?.find?.((candidate) => candidate.tenant_id === member?.tenant_id && candidate.employee_id === member?.employee_id);
  assertMatterStaffingAvailable({ employee, member, onboardingGate });
  const permission = evaluateMatterRolePermission({ role: member.role, action: "matter:team:write" });
  if (permission.outcome !== "allow") throw new Error(`Matter role is not allowed to write team membership: ${member.role}`);
  if (matter?.tenant_id && matter.tenant_id !== member.tenant_id) throw new Error("MatterTeam member tenant mismatch");
  if (matter?.matter_id && matter.matter_id !== member.matter_id) throw new Error("MatterTeam member matter mismatch");
  const record = createMatterMember(member);
  const persisted = repository.create({ ...record, model_type: "MatterMember" });
  audit?.append?.({
    tenant_id: persisted.tenant_id,
    actor_id,
    action: "matter.team.member.add",
    object_type: "MatterMember",
    object_id: persisted.member_id,
    decision: "allow",
    reason: "matter_team_member_added",
  });
  return persisted;
}
