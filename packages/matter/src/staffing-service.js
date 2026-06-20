import { createMatterMember } from "./model.js";
import { evaluateMatterRolePermission } from "./role-policy.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function assertMatterStaffingAvailable({ employee, member } = {}) {
  if (!member?.employee_id) throw new Error("MatterTeam member requires employee_id; user_id-only member is blocked");
  if (member.user_id && member.user_id === member.employee_id) {
    throw new Error("MatterTeam member must not conflate user_id and employee_id");
  }
  if (!employee) throw new Error(`Employee not found for MatterTeam member: ${member.employee_id}`);
  if (employee.tenant_id !== member.tenant_id) throw new Error("Employee tenant must match MatterTeam member tenant");
  if (["terminated", "offboarded"].includes(employee.status)) throw new Error("Offboarded employee cannot be staffed to Matter");
  if (employee.availability === "unavailable") throw new Error("Unavailable employee cannot be staffed to Matter");
}

export function addMatterTeamMember({ repository, employeeDirectory, matter, member, actor_id, audit } = {}) {
  requiredString({ actor_id }, "actor_id");
  const employee = employeeDirectory?.get?.({ tenant_id: member?.tenant_id, employee_id: member?.employee_id })
    ?? employeeDirectory?.find?.((candidate) => candidate.tenant_id === member?.tenant_id && candidate.employee_id === member?.employee_id);
  assertMatterStaffingAvailable({ employee, member });
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
