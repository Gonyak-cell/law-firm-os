const EMPLOYEE_STATUSES = ["active", "inactive", "on_leave", "terminated"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "intern"];
const EMPLOYMENT_PROFILE_STATUSES = ["active", "future", "on_leave", "terminated"];
const EMPLOYEE_USER_LINK_PURPOSES = ["login_mapping"];
const RESERVED_IDENTITY_FIELDS = ["user_id", "iam_user_id", "user_account_id", "account_id"];

export const HRX_CORE_SCHEMA_VERSION = "law-firm-os.hrx-core-schema.v0.1";
export const HRX_EMPLOYEE_STATUSES = Object.freeze([...EMPLOYEE_STATUSES]);
export const HRX_EMPLOYMENT_TYPES = Object.freeze([...EMPLOYMENT_TYPES]);
export const HRX_EMPLOYMENT_PROFILE_STATUSES = Object.freeze([...EMPLOYMENT_PROFILE_STATUSES]);
export const HRX_EMPLOYEE_USER_LINK_PURPOSES = Object.freeze([...EMPLOYEE_USER_LINK_PURPOSES]);

export const HRX_CORE_SCHEMAS = deepFreeze({
  Employee: {
    required: ["tenant_id", "employee_id", "display_name", "status"],
    reserved_identity_fields: RESERVED_IDENTITY_FIELDS,
  },
  EmploymentProfile: {
    required: ["tenant_id", "profile_id", "employee_id", "employment_type", "status", "effective_from"],
    reserved_identity_fields: RESERVED_IDENTITY_FIELDS,
  },
  EmployeeUserLink: {
    required: ["tenant_id", "link_id", "employee_id", "user_id", "purpose"],
    purpose_values: EMPLOYEE_USER_LINK_PURPOSES,
  },
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(input, field, errors, { optional = false } = {}) {
  const value = input?.[field];
  if (value === undefined || value === null) {
    if (optional) return null;
    errors.push(`${field} is required`);
    return "";
  }
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
    return "";
  }
  return value.trim();
}

function enumField(input, field, allowed, errors, { defaultValue } = {}) {
  const value = input?.[field] ?? defaultValue;
  if (!allowed.includes(value)) {
    errors.push(`${field} must be one of: ${allowed.join(", ")}`);
    return defaultValue ?? allowed[0];
  }
  return value;
}

function optionalIsoDate(input, field, errors) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${field} must be an ISO date (YYYY-MM-DD)`);
    return null;
  }
  return value;
}

function requiredIsoDate(input, field, errors) {
  const value = optionalIsoDate(input, field, errors);
  if (!value) errors.push(`${field} is required`);
  return value ?? "";
}

function rejectReservedIdentityFields(input, entityName, errors) {
  for (const field of RESERVED_IDENTITY_FIELDS) {
    if (Object.hasOwn(input, field)) {
      errors.push(`${entityName} must not include ${field}; use EmployeeUserLink`);
    }
  }
}

function result(errors, value) {
  const ok = errors.length === 0;
  return {
    ok,
    errors: Object.freeze([...errors]),
    value: ok ? deepFreeze(value) : undefined,
  };
}

function requirePlainObject(input, entityName, errors) {
  if (!isPlainObject(input)) {
    errors.push(`${entityName} must be a plain object`);
    return false;
  }
  return true;
}

export function validateEmployee(input) {
  const errors = [];
  if (!requirePlainObject(input, "Employee", errors)) return result(errors);
  rejectReservedIdentityFields(input, "Employee", errors);
  const value = {
    schema_version: HRX_CORE_SCHEMA_VERSION,
    tenant_id: stringField(input, "tenant_id", errors),
    employee_id: stringField(input, "employee_id", errors),
    display_name: stringField(input, "display_name", errors),
    legal_name: stringField(input, "legal_name", errors, { optional: true }),
    work_email: stringField(input, "work_email", errors, { optional: true }),
    status: enumField(input, "status", EMPLOYEE_STATUSES, errors, { defaultValue: "active" }),
    source_ref: stringField(input, "source_ref", errors, { optional: true }),
  };
  return result(errors, value);
}

export function createEmployee(input) {
  const validation = validateEmployee(input);
  if (!validation.ok) throw new TypeError(`Invalid Employee: ${validation.errors.join("; ")}`);
  return validation.value;
}

export function validateEmploymentProfile(input) {
  const errors = [];
  if (!requirePlainObject(input, "EmploymentProfile", errors)) return result(errors);
  rejectReservedIdentityFields(input, "EmploymentProfile", errors);
  const value = {
    schema_version: HRX_CORE_SCHEMA_VERSION,
    tenant_id: stringField(input, "tenant_id", errors),
    profile_id: stringField(input, "profile_id", errors),
    employee_id: stringField(input, "employee_id", errors),
    employment_type: enumField(input, "employment_type", EMPLOYMENT_TYPES, errors),
    status: enumField(input, "status", EMPLOYMENT_PROFILE_STATUSES, errors, { defaultValue: "active" }),
    title: stringField(input, "title", errors, { optional: true }),
    org_unit_id: stringField(input, "org_unit_id", errors, { optional: true }),
    manager_employee_id: stringField(input, "manager_employee_id", errors, { optional: true }),
    effective_from: requiredIsoDate(input, "effective_from", errors),
    effective_to: optionalIsoDate(input, "effective_to", errors),
    source_ref: stringField(input, "source_ref", errors, { optional: true }),
  };
  if (value.effective_to && value.effective_to < value.effective_from) {
    errors.push("effective_to must be on or after effective_from");
  }
  return result(errors, value);
}

export function createEmploymentProfile(input) {
  const validation = validateEmploymentProfile(input);
  if (!validation.ok) throw new TypeError(`Invalid EmploymentProfile: ${validation.errors.join("; ")}`);
  return validation.value;
}

export function validateEmployeeUserLink(input) {
  const errors = [];
  if (!requirePlainObject(input, "EmployeeUserLink", errors)) return result(errors);
  const value = {
    schema_version: HRX_CORE_SCHEMA_VERSION,
    tenant_id: stringField(input, "tenant_id", errors),
    link_id: stringField(input, "link_id", errors),
    employee_id: stringField(input, "employee_id", errors),
    user_id: stringField(input, "user_id", errors),
    purpose: enumField(input, "purpose", EMPLOYEE_USER_LINK_PURPOSES, errors),
    source_ref: stringField(input, "source_ref", errors, { optional: true }),
  };
  if (value.employee_id && value.user_id && value.employee_id === value.user_id) {
    errors.push("EmployeeUserLink employee_id must not equal user_id");
  }
  return result(errors, value);
}

export function createEmployeeUserLink(input) {
  const validation = validateEmployeeUserLink(input);
  if (!validation.ok) throw new TypeError(`Invalid EmployeeUserLink: ${validation.errors.join("; ")}`);
  return validation.value;
}
