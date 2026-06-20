const HRX_SENSITIVE_REF_FIELDS = Object.freeze([
  "compensation",
  "salary",
  "evaluation",
  "discipline",
  "national_id",
  "personal_email",
  "home_address",
]);

function assertNoSensitiveFields(input, refType) {
  for (const field of HRX_SENSITIVE_REF_FIELDS) {
    if (Object.hasOwn(input, field)) {
      throw new TypeError(`${refType} reference must not include HR sensitive field: ${field}`);
    }
  }
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function makeRef(type, input, idField) {
  assertNoSensitiveFields(input, type);
  return Object.freeze({
    ref_type: type,
    tenant_id: requiredString(input, "tenant_id"),
    ref_id: requiredString(input, idField),
    display_name: requiredString(input, "display_name"),
  });
}

export function createHrxPersonRef(input) {
  return makeRef("Person", input, "person_id");
}

export function createHrxOrganizationRef(input) {
  return makeRef("Organization", input, "organization_id");
}

export function createHrxPracticeGroupRef(input) {
  return makeRef("PracticeGroup", input, "practice_group_id");
}

export function resolveHrxMasterDataRefs(input = {}) {
  return Object.freeze({
    person: input.person ? createHrxPersonRef(input.person) : null,
    organization: input.organization ? createHrxOrganizationRef(input.organization) : null,
    practice_group: input.practice_group ? createHrxPracticeGroupRef(input.practice_group) : null,
  });
}
