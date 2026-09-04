const EMPLOYEE_STATUSES = ["onboarding", "probation", "active", "inactive", "on_leave", "notice", "terminated"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "intern"];
const EMPLOYMENT_PROFILE_STATUSES = ["active", "future", "on_leave", "terminated"];
const EMPLOYEE_USER_LINK_PURPOSES = ["login_mapping"];
const RESERVED_IDENTITY_FIELDS = ["user_id", "iam_user_id", "user_account_id", "account_id"];
const SAFE_SCOPE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;

export const HRX_CORE_SCHEMA_VERSION = "law-firm-os.hrx-core-schema.v0.1";
export const HRX_EMPLOYEE_STATUSES = Object.freeze([...EMPLOYEE_STATUSES]);
export const HRX_EMPLOYMENT_TYPES = Object.freeze([...EMPLOYMENT_TYPES]);
export const HRX_EMPLOYMENT_PROFILE_STATUSES = Object.freeze([...EMPLOYMENT_PROFILE_STATUSES]);
export const HRX_EMPLOYEE_USER_LINK_PURPOSES = Object.freeze([...EMPLOYEE_USER_LINK_PURPOSES]);

export const HRX_CORE_SCHEMAS = deepFreeze({
  Employee: {
    required: ["tenant_id", "employee_id", "display_name", "status"],
    status_values: EMPLOYEE_STATUSES,
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

function optionalSafeScopeRef(input, field, errors) {
  const value = stringField(input, field, errors, { optional: true });
  if (value !== null && !SAFE_SCOPE_REF.test(value)) {
    errors.push(`${field} must be a safe scope reference`);
    return null;
  }
  return value;
}

function employeePhotoFields(input, errors) {
  const objectId = stringField(input, "photo_object_id", errors, {
    optional: true,
  });
  const digest = stringField(input, "photo_sha256", errors, { optional: true });
  const contentType = stringField(input, "photo_content_type", errors, {
    optional: true,
  });
  const versionId = stringField(input, "photo_version_id", errors, {
    optional: true,
  });
  const rawByteSize = input?.photo_byte_size;
  const byteSize = rawByteSize === undefined || rawByteSize === null
    ? null
    : Number(rawByteSize);
  const present = [objectId, digest, contentType, byteSize]
    .filter((value) => value !== null).length;
  if (present !== 0 && present !== 4) {
    errors.push("employee photo metadata must be complete or absent");
  }
  if (objectId !== null && !/^employee-photo:[a-f0-9]{64}$/u.test(objectId)) {
    errors.push("photo_object_id must be an opaque employee photo reference");
  }
  if (digest !== null && !/^[a-f0-9]{64}$/u.test(digest)) {
    errors.push("photo_sha256 must be a SHA-256 digest");
  }
  if (contentType !== null && contentType !== "image/png") {
    errors.push("photo_content_type must be image/png");
  }
  if (byteSize !== null
      && (!Number.isSafeInteger(byteSize) || byteSize < 8 || byteSize > 5 * 1024 * 1024)) {
    errors.push("photo_byte_size must be between 8 bytes and 5 MiB");
  }
  return {
    photo_object_id: objectId,
    photo_sha256: digest,
    photo_byte_size: byteSize,
    photo_content_type: contentType,
    photo_version_id: versionId,
  };
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

function professionalProfileField(input, errors) {
  const profile = input?.professional_profile;
  if (profile === undefined || profile === null) return null;
  if (!isPlainObject(profile)) {
    errors.push("professional_profile must be a plain object");
    return null;
  }
  if (profile.schema_version !== "law-firm-os.people-professional-profile.v0.1") {
    errors.push("professional_profile schema_version is invalid");
  }
  const arrays = ["public_role_labels", "practice_areas", "experience", "education", "qualifications", "source_refs", "source_notes", "excluded_claim_refs"];
  const normalized = {};
  for (const field of arrays) {
    const values = profile[field] ?? [];
    if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.trim() === "")) {
      errors.push(`professional_profile.${field} must be a string array`);
      normalized[field] = [];
    } else {
      normalized[field] = values.map((value) => value.trim());
    }
  }
  if (typeof profile.profile_kind !== "string" || profile.profile_kind.trim() === "") {
    errors.push("professional_profile.profile_kind must be a non-empty string");
  }
  if (["password", "secret", "token", "private_key", "credential"].some((field) => Object.hasOwn(profile, field))) {
    errors.push("professional_profile contains forbidden credential material");
  }
  return {
    schema_version: profile.schema_version,
    profile_kind: String(profile.profile_kind ?? "").trim(),
    ...normalized,
  };
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
    mobile_phone: stringField(input, "mobile_phone", errors, { optional: true }),
    status: enumField(input, "status", EMPLOYEE_STATUSES, errors, { defaultValue: "active" }),
    source_ref: stringField(input, "source_ref", errors, { optional: true }),
    ...employeePhotoFields(input, errors),
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
    legal_entity_id: optionalSafeScopeRef(input, "legal_entity_id", errors),
    affiliation: stringField(input, "affiliation", errors, { optional: true }),
    department: stringField(input, "department", errors, { optional: true }),
    organization_group: stringField(
      input,
      "organization_group",
      errors,
      { optional: true },
    ),
    country: stringField(input, "country", errors, { optional: true }),
    manager_employee_id: stringField(input, "manager_employee_id", errors, { optional: true }),
    start_date: optionalIsoDate(input, "start_date", errors),
    effective_from: requiredIsoDate(input, "effective_from", errors),
    effective_to: optionalIsoDate(input, "effective_to", errors),
    source_ref: stringField(input, "source_ref", errors, { optional: true }),
    professional_profile: professionalProfileField(input, errors),
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
