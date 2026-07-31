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

function isActiveLoginMapping(link) {
  if (!link || typeof link !== "object") return false;
  // Current HRX rows are deleted on revoke and always carry login_mapping.
  // Legacy/backfill inputs can omit purpose, while historical projections can
  // retain an explicit revocation marker.
  if (Object.hasOwn(link, "purpose") && link.purpose !== HRX_EMPLOYEE_USER_LINK_PURPOSE) return false;
  if (link.revoked_at !== undefined && link.revoked_at !== null) return false;
  if (link.revoked === true || link.active === false) return false;
  if (link.status !== undefined && link.status !== null && link.status !== "active") return false;
  if (link.state !== undefined && link.state !== null && link.state !== "active") return false;
  return true;
}

export function resolveUniqueEmployeeUserLink({ tenant_id, user_id, links = [] } = {}) {
  const matches = (Array.isArray(links) ? links : []).filter(
    (link) =>
      link?.tenant_id === tenant_id &&
      link?.user_id === user_id &&
      isActiveLoginMapping(link),
  );
  if (matches.length === 0) return Object.freeze({ state: "unresolved_missing" });
  if (matches.length !== 1) return Object.freeze({ state: "unresolved_ambiguous" });
  return Object.freeze({
    state: "resolved",
    employee_id: matches[0].employee_id,
    link_id: matches[0].link_id,
  });
}

export function resolveUniqueUserForEmployee({ tenant_id, employee_id, links = [] } = {}) {
  const matches = (Array.isArray(links) ? links : []).filter(
    (link) =>
      link?.tenant_id === tenant_id &&
      link?.employee_id === employee_id &&
      isActiveLoginMapping(link),
  );
  if (matches.length === 0) return Object.freeze({ state: "unresolved_missing" });
  if (matches.length !== 1) return Object.freeze({ state: "unresolved_ambiguous" });
  return Object.freeze({
    state: "resolved",
    user_id: matches[0].user_id,
    link_id: matches[0].link_id,
  });
}
