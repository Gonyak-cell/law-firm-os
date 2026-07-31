export const PEOPLE_PRIVATE_FIELD_RULES = Object.freeze({
  meeting: Object.freeze({
    visibility: "self_only",
    fields: Object.freeze(["title", "body_preview", "attendees"]),
  }),
  leave: Object.freeze({
    visibility: "self_only",
    fields: Object.freeze(["reason", "attachment_ref"]),
  }),
  payroll: Object.freeze({
    required_scope: "hrx.payroll.preview",
    fields: Object.freeze(["gross_pay", "net_pay", "bank_account_ref", "tax_profile_ref"]),
  }),
});

function targetRows(rows, tenantId, employeeId) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.tenant_id === tenantId && row?.employee_id === employeeId);
}

function maskFields(row, fields, replacements = {}) {
  const masked = { ...row };
  for (const field of fields) {
    if (Object.hasOwn(masked, field)) masked[field] = Object.hasOwn(replacements, field) ? replacements[field] : null;
  }
  return Object.freeze({
    ...masked,
    masked: true,
    masked_fields: Object.freeze(fields.filter((field) => Object.hasOwn(row, field))),
  });
}

export function projectPeoplePrivateDetails({
  tenant_id,
  viewer_employee_id,
  target_employee_id,
  granted_scopes = [],
  meetings = [],
  leave_requests = [],
  payroll_records = [],
} = {}) {
  const self = viewer_employee_id === target_employee_id;
  const meetingRows = targetRows(meetings, tenant_id, target_employee_id);
  const leaveRows = targetRows(leave_requests, tenant_id, target_employee_id);
  const payrollRows = targetRows(payroll_records, tenant_id, target_employee_id);
  return Object.freeze({
    meetings: Object.freeze(meetingRows.map((row) => self
      ? Object.freeze({ ...row })
      : maskFields(row, PEOPLE_PRIVATE_FIELD_RULES.meeting.fields, { title: "일정 있음" }))),
    leave_requests: Object.freeze(leaveRows.map((row) => self
      ? Object.freeze({ ...row })
      : maskFields(row, PEOPLE_PRIVATE_FIELD_RULES.leave.fields))),
    payroll_records: Object.freeze(payrollRows.map((row) => (
      self || granted_scopes.includes(PEOPLE_PRIVATE_FIELD_RULES.payroll.required_scope)
        ? Object.freeze({ ...row })
        : maskFields(row, PEOPLE_PRIVATE_FIELD_RULES.payroll.fields)
    ))),
  });
}
