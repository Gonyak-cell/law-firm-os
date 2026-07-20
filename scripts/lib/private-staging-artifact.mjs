const FORBIDDEN_ENTRY = /(^|\/)(\.env(?:\.|$)|test|tests|__tests__|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx)$/iu;
const FORBIDDEN_ARCHIVE_ENTRY = /(^|\/)(\.env(?:\.|$)|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx)$/iu;
const SYNTHETIC_USER_ID = /^synthetic-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_EMPLOYEE_ID = /^emp-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_EMAIL = /^lawos-staging-[a-z0-9-]+@[^@\s]+$/u;
const ALLOWED_ROLES = new Set(["attorney", "firm_admin", "matter_vault_admin", "matter_vault_user"]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function assertNoSensitiveIdentityMaterial(value) {
  const text = JSON.stringify(value);
  if (/password|passwd|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|cookie/iu.test(text)) {
    throw new Error("synthetic identity manifest contains a forbidden credential field");
  }
}

export function buildPrivateStagingSyntheticSources(manifest) {
  if (manifest?.schema_version !== "law-firm-os.private-staging.synthetic-identities.v1") throw new TypeError("synthetic identity manifest schema is invalid");
  if (manifest.data_scope !== "synthetic-only" || manifest.real_identity_count !== 0 || manifest.accounts_provisioned !== true) {
    throw new TypeError("provisioned synthetic-only Entra identities are required");
  }
  if (manifest.tenant_id !== "tenant_lawos_staging_a") throw new TypeError("synthetic identity tenant is invalid");
  assertNoSensitiveIdentityMaterial(manifest);
  const accounts = (manifest.accounts ?? []).map((account, index) => {
    const userId = requiredText(account.user_id, `accounts[${index}].user_id`);
    const employeeId = requiredText(account.employee_id, `accounts[${index}].employee_id`);
    const email = requiredText(account.email, `accounts[${index}].email`).toLowerCase();
    const displayName = requiredText(account.display_name, `accounts[${index}].display_name`);
    const roles = [...new Set((account.role_ids ?? []).map((role) => requiredText(role, `accounts[${index}].role_id`)))].sort();
    if (!SYNTHETIC_USER_ID.test(userId) || !SYNTHETIC_EMPLOYEE_ID.test(employeeId) || !SYNTHETIC_EMAIL.test(email)) {
      throw new TypeError("synthetic identity identifiers are invalid");
    }
    if (!/^LawOS Staging Pilot [A-Z0-9-]+$/u.test(displayName)) throw new TypeError("synthetic identity display name is invalid");
    if (!roles.length || roles.some((role) => !ALLOWED_ROLES.has(role))) throw new TypeError("synthetic identity role is invalid");
    return Object.freeze({ userId, employeeId, email, displayName, roles });
  });
  if (accounts.length < 2) throw new TypeError("at least two provisioned synthetic pilot identities are required");
  for (const key of ["userId", "employeeId", "email"]) {
    if (new Set(accounts.map((account) => account[key])).size !== accounts.length) throw new TypeError(`synthetic identity ${key} values must be unique`);
  }
  const users = accounts.map((account, index) => {
    const admin = account.roles.includes("firm_admin");
    const scopes = admin
      ? ["audit.read", "matter.read", "matter.write", "security.admin", "tenant.admin", "user.admin", "vault.read", "vault.write"]
      : ["matter.read", "matter.write", "vault.read", "vault.write"];
    const groupIds = admin
      ? ["group_firm_operations", "group_matter_vault_admins", "group_matter_vault_users"]
      : ["group_attorneys", "group_matter_vault_users"];
    return {
      user_id: account.userId,
      email: account.email,
      display_name: account.displayName,
      english_name: account.displayName,
      source_title: "synthetic LawOS private staging pilot",
      status: "active",
      production_status: "disabled",
      qa_tenant_scope: "synthetic_only",
      registration_state: "registered_seed",
      highest_privilege: index === 0,
      privilege_rank: admin ? 700 : 500,
      assurance_level: "entra-phishing-resistant-mfa-required",
      mfa_required: true,
      role_ids: account.roles,
      group_ids: groupIds,
      scopes,
      tenant_memberships: [{ tenant_id: manifest.tenant_id, role_ids: account.roles, group_ids: groupIds, scopes }],
      local_dev: { synthetic_only: true, synthetic_token: null },
    };
  });
  const accountSeed = {
    schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
    created_at: "2026-07-20T00:00:00.000Z",
    status: "registered-synthetic-staging-seed",
    tenant_id: manifest.tenant_id,
    source: { kind: "private-synthetic-identity-manifest", account_count: accounts.length },
    registration_boundary: {
      production_idp_account_creation: false,
      m365_graph_user_write: false,
      passwords_or_real_tokens_included: false,
      local_dev_synthetic_tokens_only: true,
      operator_approval_required_for_production_invites: true,
    },
    role_rank: {
      system_super_admin: 1000,
      tenant_owner: 900,
      managing_partner: 800,
      firm_admin: 700,
      matter_vault_admin: 650,
      attorney: 500,
      operations_lead: 400,
      support_user: 200,
      matter_vault_user: 100,
    },
    highest_privilege_account: { email: users[0].email, role_id: users[0].role_ids[0], privilege_rank: users[0].privilege_rank },
    users,
  };
  const roster = {
    schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
    created_at: "2026-07-20T00:00:00.000Z",
    status: "registered-synthetic-staging-source",
    tenant_id: manifest.tenant_id,
    source_ref: "hrx-member-roster-source-of-truth",
    change_control: {
      default_persistence: "synthetic-staging-only",
      implicit_regeneration_allowed: false,
      production_idp_account_creation: false,
      passwords_or_real_tokens_included: false,
    },
    members: accounts.map((account, index) => ({
      user_id: account.userId,
      employee_id: account.employeeId,
      display_name: account.displayName,
      legal_name: account.displayName,
      work_email: account.email,
      title: index === 0 ? "Synthetic Staging Administrator" : "Synthetic Staging Attorney",
      employment_type: "synthetic",
      start_date: "2026-07-20",
      status: "active",
      profile_status: "active",
      affiliation: "LawOS Private Staging",
      department: "Synthetic Pilot",
      organization_group: "Synthetic Pilot",
      org_unit_id: "org-lawos-staging-pilot",
      manager_employee_id: index === 0 ? null : accounts[0].employeeId,
      country: "대한민국",
      professional_profile: null,
    })),
  };
  return Object.freeze({
    account_seed: Object.freeze(accountSeed),
    roster: Object.freeze(roster),
    safe_counts: Object.freeze({ account_count: accounts.length, employee_count: accounts.length, real_identity_count: 0 }),
  });
}

export function privateStagingArtifactSourcePathAllowed(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
  if (!normalized || normalized.includes("..") || FORBIDDEN_ENTRY.test(normalized)) return false;
  if (["package.json", "package-lock.json"].includes(normalized)) return true;
  if (normalized === "apps/desktop/build/icon.png") return true;
  if (/^apps\/api\/(?:package\.json|src\/)/u.test(normalized)) return true;
  return /^packages\/[^/]+\/(?:package\.json|src\/)/u.test(normalized);
}

export function validateRdsCaBundle(bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes ?? "");
  const text = value.toString("utf8");
  const certificateCount = (text.match(/-----BEGIN CERTIFICATE-----/gu) ?? []).length;
  if (value.byteLength < 10_000 || certificateCount < 5 || !text.endsWith("\n")) {
    throw new Error("RDS global CA bundle is incomplete");
  }
  return Object.freeze({ byte_size: value.byteLength, certificate_count: certificateCount });
}

export function validatePrivateStagingArtifactEntries(entries) {
  const normalized = [...new Set(entries.map((entry) => String(entry).replace(/^\.\//u, "")))].sort();
  const required = [
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/persistence/src/postgres/migration-runner.js",
  ];
  for (const path of required) {
    if (!normalized.includes(path)) throw new Error(`private staging artifact is missing ${path}`);
  }
  const forbidden = normalized.filter((entry) =>
    (entry !== "certs/global-bundle.pem" && FORBIDDEN_ARCHIVE_ENTRY.test(entry))
    || (!entry.startsWith("node_modules/") && /(^|\/)(test|tests|__tests__)(\/|$)/iu.test(entry))
    || entry.startsWith("infra/")
    || entry.startsWith("scripts/"));
  if (forbidden.length) throw new Error(`private staging artifact contains forbidden entries: ${forbidden.slice(0, 5).join(", ")}`);
  return Object.freeze({ entry_count: normalized.length, forbidden_entry_count: 0 });
}
