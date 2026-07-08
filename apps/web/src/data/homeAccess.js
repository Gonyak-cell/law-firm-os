export const HOME_COMPANY_ADMIN_ROLE_IDS = Object.freeze([
  "admin",
  "administrator",
  "tenant_admin",
  "firm_admin",
  "system_admin",
  "company_admin",
  "managing_partner"
]);

const HOME_COMPANY_ADMIN_ROLE_SET = new Set(HOME_COMPANY_ADMIN_ROLE_IDS);

function normalizeRole(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") : "";
}

function collectRoleValues(record, values) {
  if (!record || typeof record !== "object") return;
  for (const key of ["role", "role_id", "actor_role", "user_role", "account_role"]) {
    const value = normalizeRole(record[key]);
    if (value) values.add(value);
  }
  for (const key of ["roles", "role_ids"]) {
    if (!Array.isArray(record[key])) continue;
    for (const role of record[key]) {
      const value = normalizeRole(role);
      if (value) values.add(value);
    }
  }
}

export function homeCompanyRoleValues(records = []) {
  const values = new Set();
  for (const record of records) collectRoleValues(record, values);
  return [...values];
}

export function canAccessHomeCompany(records = []) {
  return homeCompanyRoleValues(records).some((role) => HOME_COMPANY_ADMIN_ROLE_SET.has(role));
}
