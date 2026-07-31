import { projectPeoplePrivateDetails } from "../../../../../packages/hrx/src/people-operations-authz.js";
import { trimItemsByPermission } from "../../permission-gate.js";

function forbidden() {
  const error = new Error("People tenant boundary denied");
  error.status = 403;
  error.safe_error_code = "PEOPLE_CROSS_TENANT_DENIED";
  error.fail_closed = true;
  return error;
}

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${field} is required`);
    error.status = 400;
    error.safe_error_code = "PEOPLE_REQUEST_INVALID";
    throw error;
  }
  return value.trim();
}

function visibleAssignments({
  tenantId,
  targetEmployeeId,
  assignments,
  matters,
  permissionContext,
}) {
  const matterById = new Map(
    (Array.isArray(matters) ? matters : [])
      .filter((matter) => matter?.tenant_id === tenantId)
      .map((matter) => [matter.matter_id, matter]),
  );
  const candidates = [];
  const seen = new Set();
  for (const assignment of Array.isArray(assignments) ? assignments : []) {
    if (
      assignment?.tenant_id !== tenantId
      || assignment?.employee_id !== targetEmployeeId
      || seen.has(assignment.matter_id)
    ) continue;
    const matter = matterById.get(assignment.matter_id);
    if (!matter) continue;
    seen.add(assignment.matter_id);
    candidates.push({
      ...matter,
      role: assignment.role ?? null,
      resource_id: matter.matter_id,
    });
  }
  return trimItemsByPermission({
    context: permissionContext,
    items: candidates,
    action: "matter:read",
    resourceType: "Matter",
  }).allowed.map(({ resource_id: _resourceId, ...matter }) => Object.freeze(matter));
}

export function projectAuthorizedPeopleOperations({
  request_context,
  permission_context,
  target,
  assignments = [],
  matters = [],
  meetings = [],
  leave_requests = [],
  payroll_records = [],
} = {}) {
  const tenantId = requiredText(request_context?.tenant_id, "request_context.tenant_id");
  if (target?.tenant_id !== tenantId) throw forbidden();
  const targetEmployeeId = requiredText(target?.employee_id, "target.employee_id");
  const assignedMatters = visibleAssignments({
    tenantId,
    targetEmployeeId,
    assignments,
    matters,
    permissionContext: permission_context,
  });
  const privateDetails = projectPeoplePrivateDetails({
    tenant_id: tenantId,
    viewer_employee_id: request_context?.actor_employee_id ?? null,
    target_employee_id: targetEmployeeId,
    granted_scopes: Array.isArray(request_context?.hrx_scopes) ? request_context.hrx_scopes : [],
    meetings,
    leave_requests,
    payroll_records,
  });
  return Object.freeze({
    target_employee_id: targetEmployeeId,
    assigned_matter_count: assignedMatters.length,
    assigned_matters: Object.freeze(assignedMatters),
    empty_state: assignedMatters.length === 0 ? "no_visible_assignments" : null,
    meetings: privateDetails.meetings,
    leave_requests: privateDetails.leave_requests,
    payroll_records: privateDetails.payroll_records,
    existence_hidden: true,
    permission_filter_applied_before_aggregation: true,
  });
}
