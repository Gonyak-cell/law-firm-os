import { createEmployeeUserLink, validateEmployeeUserLink } from "./schema.js";

export const HRX_EMPLOYEE_USER_LINK_PURPOSE = "login_mapping";

export function assertEmployeeUserSeparation(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Employee/User link input must be an object");
  }
  if (input.employee_id === input.user_id) {
    throw new TypeError("Employee and IAM User identifiers must remain separate");
  }
  if (input.purpose !== undefined && input.purpose !== HRX_EMPLOYEE_USER_LINK_PURPOSE) {
    throw new TypeError("Employee/User link purpose must be login_mapping");
  }
}

export function createLoginMapping(input) {
  assertEmployeeUserSeparation(input);
  return createEmployeeUserLink({
    ...input,
    purpose: HRX_EMPLOYEE_USER_LINK_PURPOSE,
  });
}

export function validateLoginMapping(input) {
  const errors = [];
  try {
    assertEmployeeUserSeparation(input);
  } catch (error) {
    errors.push(error.message);
  }
  const validation = validateEmployeeUserLink({
    ...input,
    purpose: input?.purpose ?? HRX_EMPLOYEE_USER_LINK_PURPOSE,
  });
  errors.push(...validation.errors);
  const uniqueErrors = [...new Set(errors)];
  return {
    ok: uniqueErrors.length === 0,
    errors: Object.freeze(uniqueErrors),
    value: uniqueErrors.length === 0 ? validation.value : undefined,
  };
}
