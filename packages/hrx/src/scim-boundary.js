const SCIM_BLOCKED_EMPLOYEE_FIELDS = Object.freeze([
  "employee_id",
  "employment_type",
  "employment_status",
  "manager_employee_id",
  "department_ref",
  "compensation_ref",
  "salary",
  "document_body",
  "performance_rating",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function rejectEmployeeFields(input = {}) {
  for (const field of SCIM_BLOCKED_EMPLOYEE_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`SCIM boundary must not include ${field}`);
  }
}

export function createHrxScimUserProvisioningEvent(input = {}) {
  rejectEmployeeFields(input);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    scim_event_id: requiredString(input, "scim_event_id"),
    scim_user_id: requiredString(input, "scim_user_id"),
    external_id: requiredString(input, "external_id"),
    user_id: requiredString(input, "user_id"),
    user_name: optionalString(input, "user_name"),
    provisioned_object_type: "User",
    employee_created: false,
    employee_profile_created: false,
    employee_workflow_required: true,
  });
}

export function createHrxScimEmployeeLinkRequest(input = {}) {
  const event = createHrxScimUserProvisioningEvent(input);
  return Object.freeze({
    tenant_id: event.tenant_id,
    link_request_id: requiredString(input, "link_request_id"),
    user_id: event.user_id,
    external_id: event.external_id,
    requested_object_type: "EmployeeUserLink",
    employee_workflow_required: true,
    status: "pending_hrx_workflow",
  });
}
