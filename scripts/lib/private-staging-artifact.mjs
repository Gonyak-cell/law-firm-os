import { hrxScopesForRoleProfile } from "../../apps/api/src/hrx-role-scope-matrix.js";
import {
  PRIVATE_STAGING_APPROVED_SYNTHETIC_AMIC_EMAIL_PATTERN,
  PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN,
} from "../../packages/runtime-auth/src/private-staging-synthetic-email.js";

const FORBIDDEN_ENTRY = /(^|\/)(\.env(?:\.|$)|test|tests|__tests__|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx)$/iu;
const FORBIDDEN_ARCHIVE_ENTRY = /(^|\/)(\.env(?:\.|$)|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx)$/iu;
const SYNTHETIC_USER_ID = /^synthetic-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_EMPLOYEE_ID = /^emp-lawos-staging-[a-z0-9-]+$/u;
const ALLOWED_ROLES = new Set(["attorney", "firm_admin", "matter_vault_admin", "matter_vault_user"]);
const SYNTHETIC_ADMIN_FINANCE_SCOPES = Object.freeze([
  "analytics.finance.read",
  "finance.time.write",
  "finance.expense.write",
  "finance.billing.write",
  "finance.approve",
  "finance.payment.write",
  "finance.export",
  "finance.audit.read",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const GIT_OID_PATTERN = /^[a-f0-9]{40}$/u;
const REAL_IDENTITY_SOURCE_PATTERN = /@amic\.(?:kr|law)|\b(?:user|emp)_amic_[a-z0-9_]+\b/iu;

export const PRIVATE_STAGING_SOURCE_REDACTION_TARGETS = Object.freeze([
  "apps/api/src/hrx-member-roster-registry.js",
  "apps/api/src/lambda.js",
  "apps/api/src/outlook-addin-runtime-context.js",
  "packages/matter/src/worktree-template-model.js",
]);

export const PRIVATE_STAGING_SOURCE_OVERRIDES = Object.freeze([
  Object.freeze({
    source_path: "packages/master-data/src/private-staging-client-candidates.js",
    target_path: "packages/master-data/src/amic-client-candidates.js",
    purpose: "remove-real-client-candidates",
  }),
  Object.freeze({
    source_path: "apps/api/src/private-staging-lawos-role-registry.js",
    target_path: "apps/api/src/lawos-role-registry.js",
    purpose: "remove-real-user-role-assignments",
  }),
]);

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

function containsRealIdentitySourceMarker(value) {
  const text = String(value ?? "").replace(PRIVATE_STAGING_APPROVED_SYNTHETIC_AMIC_EMAIL_PATTERN, "");
  return REAL_IDENTITY_SOURCE_PATTERN.test(text);
}

export function redactPrivateStagingRuntimeSource({ targetPath, text, syntheticSources } = {}) {
  const path = requiredText(targetPath, "private staging redaction target");
  if (!PRIVATE_STAGING_SOURCE_REDACTION_TARGETS.includes(path)) throw new TypeError(`unsupported private staging redaction target: ${path}`);
  const admin = syntheticSources?.account_seed?.users?.[0];
  const members = syntheticSources?.roster?.members ?? [];
  if (!admin?.email || !admin?.user_id || members.length < 3) throw new TypeError("synthetic source identities are incomplete");
  let output = String(text ?? "");
  if (path === "apps/api/src/hrx-member-roster-registry.js") {
    output = output.replace(
      /const MEMBER_PHOTO_FILE_BY_EMPLOYEE_ID = new Map\(\[[\s\S]*?\]\);/u,
      "const MEMBER_PHOTO_FILE_BY_EMPLOYEE_ID = new Map();",
    );
  } else if (path === "apps/api/src/lambda.js") {
    const employeeReplacements = new Map();
    output = output
      .replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, admin.email)
      .replace(/\buser_amic_[a-z0-9_]+\b/giu, admin.user_id)
      .replace(/\bemp_amic_[a-z0-9_]+\b/giu, (source) => {
        if (!employeeReplacements.has(source)) {
          employeeReplacements.set(source, members[employeeReplacements.size % members.length].employee_id);
        }
        return employeeReplacements.get(source);
      });
  } else if (path === "apps/api/src/outlook-addin-runtime-context.js") {
    output = output.replaceAll("@amic.law", "@lawos-staging.invalid");
  } else if (path === "packages/matter/src/worktree-template-model.js") {
    output = output.replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, admin.email);
  }
  if (output === text) throw new Error(`private staging source redaction made no change: ${path}`);
  if (containsRealIdentitySourceMarker(output)) throw new Error(`private staging source redaction left a real identity marker: ${path}`);
  return Object.freeze({
    target_path: path,
    purpose: "remove-real-identity-source-markers",
    text: output,
    byte_size: Buffer.byteLength(output),
  });
}

export function validatePrivateStagingSourceIdentityBoundary(entries = []) {
  const violations = entries
    .filter((entry) => containsRealIdentitySourceMarker(entry?.text))
    .map((entry) => requiredText(entry.path, "private staging source path"));
  if (violations.length) throw new Error(`private staging artifact source contains real identity markers: ${violations.slice(0, 5).join(", ")}`);
  return Object.freeze({ scanned_source_count: entries.length, real_identity_marker_count: 0 });
}

export function validatePrivateStagingSyntheticIdentityManifestBinding(manifest, { sourceSha, sourceTree } = {}) {
  if (!GIT_OID_PATTERN.test(String(sourceSha ?? "")) || !GIT_OID_PATTERN.test(String(sourceTree ?? ""))) {
    throw new TypeError("exact source SHA/tree binding is invalid");
  }
  if (manifest?.source_sha !== sourceSha || manifest?.source_tree !== sourceTree) {
    throw new Error("synthetic identity manifest source SHA/tree drifted");
  }
  return Object.freeze({ source_sha: sourceSha, source_tree: sourceTree, accounts_approved: manifest.accounts_approved === true });
}

export function buildPrivateStagingSyntheticSources(manifest) {
  if (manifest?.schema_version !== "law-firm-os.private-staging.synthetic-account-directory.v1") throw new TypeError("synthetic account manifest schema is invalid");
  if (manifest.data_scope !== "synthetic-only" || manifest.real_identity_count !== 0 || manifest.accounts_approved !== true) {
    throw new TypeError("approved synthetic-only account entries are required");
  }
  if (manifest.tenant_id !== "tenant_lawos_staging_cut007_a") throw new TypeError("synthetic identity tenant is invalid");
  assertNoSensitiveIdentityMaterial(manifest);
  const accounts = (manifest.accounts ?? []).map((account, index) => {
    const userId = requiredText(account.user_id, `accounts[${index}].user_id`);
    const employeeId = requiredText(account.employee_id, `accounts[${index}].employee_id`);
    const email = requiredText(account.email, `accounts[${index}].email`).toLowerCase();
    const displayName = requiredText(account.display_name, `accounts[${index}].display_name`);
    const accountStatus = account.account_status ?? "active";
    const roles = [...new Set((account.role_ids ?? []).map((role) => requiredText(role, `accounts[${index}].role_id`)))].sort();
    if (!SYNTHETIC_USER_ID.test(userId) || !SYNTHETIC_EMPLOYEE_ID.test(employeeId) || !PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test(email)) {
      throw new TypeError("synthetic identity identifiers are invalid");
    }
    if (!/^LawOS Staging Pilot [A-Z0-9-]+$/u.test(displayName)) throw new TypeError("synthetic identity display name is invalid");
    if (!["active", "disabled"].includes(accountStatus)) throw new TypeError("synthetic identity account status is invalid");
    if (!roles.length || roles.some((role) => !ALLOWED_ROLES.has(role))) throw new TypeError("synthetic identity role is invalid");
    return Object.freeze({ userId, employeeId, email, displayName, roles, accountStatus });
  });
  if (accounts.length < 3
    || accounts.filter((account) => account.accountStatus === "active").length < 2
    || accounts.filter((account) => account.accountStatus === "disabled").length < 1) {
    throw new TypeError("CUT-007 requires at least two active and one disabled approved synthetic staging accounts");
  }
  for (const key of ["userId", "employeeId", "email"]) {
    if (new Set(accounts.map((account) => account[key])).size !== accounts.length) throw new TypeError(`synthetic identity ${key} values must be unique`);
  }
  const users = accounts.map((account, index) => {
    const admin = account.roles.includes("firm_admin");
    const roleIds = [...new Set([...account.roles, admin ? "lawos_admin" : "lawos_attorney"])].sort();
    const hrxScopes = [...hrxScopesForRoleProfile(admin ? "admin" : "manager")];
    const productScopes = admin
      ? ["audit.read", "matter.read", "matter.write", "security.admin", "tenant.admin", "user.admin", "vault.governance", "vault.read", "vault.write", ...SYNTHETIC_ADMIN_FINANCE_SCOPES]
      : ["matter.read", "matter.write", "vault.read", "vault.write"];
    const scopes = [...new Set([...productScopes, ...hrxScopes])].sort();
    const groupIds = admin
      ? ["group_firm_operations", "group_matter_vault_admins", "group_matter_vault_users"]
      : ["group_attorneys", "group_matter_vault_users"];
    return {
      user_id: account.userId,
      email: account.email,
      display_name: account.displayName,
      english_name: account.displayName,
      source_title: "synthetic LawOS private staging internal account",
      status: account.accountStatus,
      production_status: "disabled",
      qa_tenant_scope: "synthetic_only",
      registration_state: "registered_seed",
      highest_privilege: index === 0,
      privilege_rank: admin ? 700 : 500,
      assurance_level: "internal-password-first-use-setup-required",
      mfa_required: false,
      credential_provider: "lawos-internal-password-provider-v1",
      credential_status: account.accountStatus === "disabled" ? "disabled" : "reset_required",
      password_setup_required: account.accountStatus === "active",
      role_profile_id: admin ? "lawos_synthetic_staging_admin" : "lawos_synthetic_staging_attorney",
      role_ids: roleIds,
      group_ids: groupIds,
      scopes,
      hrx_scopes: hrxScopes,
      tenant_memberships: [{
        tenant_id: manifest.tenant_id,
        status: account.accountStatus,
        role_profile_id: admin ? "lawos_synthetic_staging_admin" : "lawos_synthetic_staging_attorney",
        role_ids: roleIds,
        group_ids: groupIds,
        scopes,
        hrx_scopes: hrxScopes,
        source_ref: "private-synthetic-identity-manifest",
      }],
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
      external_identity_account_creation: false,
      external_directory_user_write: false,
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
      external_identity_account_creation: false,
      passwords_or_real_tokens_included: false,
    },
    members: accounts.map((account, index) => ({
      user_id: account.userId,
      employee_id: account.employeeId,
      display_name: account.displayName,
      legal_name: account.displayName,
      work_email: account.email,
      title: index === 0 ? "Synthetic Staging Administrator" : "Synthetic Staging Attorney",
      employment_type: "full_time",
      start_date: "2026-07-20",
      status: "active",
      profile_status: "active",
      affiliation: "LawOS Private Staging",
      department: "Synthetic Pilot",
      organization_group: "Synthetic Pilot",
      org_unit_id: "org-lawos-staging-pilot",
      manager_employee_id: index === 0 ? null : accounts[0].employeeId,
      country: "대한민국",
      professional_profile: {
        schema_version: "law-firm-os.people-professional-profile.v0.1",
        profile_kind: index === 0 ? "synthetic_staging_administrator" : "synthetic_staging_attorney",
        public_role_labels: [index === 0 ? "Synthetic Staging Administrator" : "Synthetic Staging Attorney"],
        practice_areas: ["Synthetic Client Advisory", "Synthetic Matter Operations"],
        experience: [
          `LawOS private staging synthetic role (${index === 0 ? "administrator" : "attorney"})`,
          "Synthetic-only PostgreSQL migration and critical-flow validation",
        ],
        education: ["LawOS synthetic staging academy"],
        qualifications: index === 0 ? ["Synthetic staging administrator"] : ["Synthetic staging attorney"],
        source_refs: [],
        source_notes: ["Synthetic-only profile; it does not describe a real person."],
        excluded_claim_refs: [],
      },
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

export function parsePrivateStagingGitTree(value) {
  const records = (Buffer.isBuffer(value) ? value : Buffer.from(value ?? ""))
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const accepted = [];
  const seen = new Set();
  for (const record of records) {
    const match = /^(\d{6}) ([a-z]+) ([a-f0-9]{40})\t([^\r\n\0]+)$/u.exec(record);
    if (!match) throw new Error("private staging Git tree contains an invalid entry");
    const [, mode, type, oid, path] = match;
    if (!privateStagingArtifactSourcePathAllowed(path)) continue;
    if (!(["100644", "100755"].includes(mode) && type === "blob")) {
      throw new Error(`private staging artifact source must be a regular Git blob: ${path}`);
    }
    if (seen.has(path)) throw new Error(`private staging Git tree contains a duplicate path: ${path}`);
    seen.add(path);
    accepted.push(Object.freeze({ mode, type, oid, path }));
  }
  return Object.freeze(accepted.sort((left, right) => left.path.localeCompare(right.path, "en")));
}

export function assertPrivateStagingGitBlobMaterialization(entry, exactBlobBytes, stagedBytes) {
  if (!entry || entry.type !== "blob" || !["100644", "100755"].includes(entry.mode) || !GIT_OID_PATTERN.test(entry.oid ?? "")) {
    throw new Error("private staging artifact source identity is invalid");
  }
  const exact = Buffer.isBuffer(exactBlobBytes) ? exactBlobBytes : Buffer.from(exactBlobBytes ?? "");
  const staged = Buffer.isBuffer(stagedBytes) ? stagedBytes : Buffer.from(stagedBytes ?? "");
  if (!exact.equals(staged)) throw new Error(`private staging staged bytes differ from the exact Git blob: ${entry.path}`);
  return Object.freeze({ path: entry.path, oid: entry.oid, byte_size: exact.byteLength });
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
  const raw = entries.map((entry) => String(entry).replace(/^\.\//u, ""));
  if (raw.some((entry) => !entry || entry.includes("\\") || entry.startsWith("/") || entry.split("/").includes(".."))) {
    throw new Error("private staging artifact contains an unsafe archive path");
  }
  if (new Set(raw).size !== raw.length) throw new Error("private staging artifact contains a duplicate entry");
  const normalized = [...raw].sort();
  const required = [
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/private-staging-cut006.js",
    "apps/api/src/private-staging-cut007-readback.js",
    "apps/api/src/private-staging-synthetic-baseline.js",
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
  const runtimeStoreEntries = normalized.filter((entry) => /(^|\/)(?:runtime-stores?|runtime_store|store-data)(\/|$)|\.(?:sqlite|sqlite3|db)$/iu.test(entry));
  const realJsonStoreEntries = normalized.filter((entry) =>
    /(^|\/)(?:runtime-stores?|runtime_store|store-data)(\/|$)/iu.test(entry)
    || /(?:^|\/)(?:hrx|master-data|matter|dms|crm|intake|finance|analytics|portal|auth)-(?:store|runtime)\.json$/iu.test(entry));
  if (runtimeStoreEntries.length || realJsonStoreEntries.length) throw new Error("private staging artifact contains a legacy runtime store");
  return Object.freeze({
    entry_count: normalized.length,
    forbidden_entry_count: 0,
    runtime_store_entry_count: 0,
    real_json_store_count: 0,
  });
}

export function validatePrivateStagingSourceOverrides(overrides) {
  if (!Array.isArray(overrides) || overrides.length !== PRIVATE_STAGING_SOURCE_OVERRIDES.length) {
    throw new Error("private staging source override set is incomplete");
  }
  const expected = new Map(PRIVATE_STAGING_SOURCE_OVERRIDES.map((entry) => [entry.target_path, entry]));
  for (const override of overrides) {
    const contract = expected.get(override?.target_path);
    if (!contract || override.source_path !== contract.source_path || override.purpose !== contract.purpose) {
      throw new Error("private staging source override binding is invalid");
    }
    if (!SHA256_PATTERN.test(String(override.sha256 ?? "")) || !Number.isSafeInteger(override.byte_size) || override.byte_size < 1) {
      throw new Error("private staging source override digest is invalid");
    }
    const text = String(override.text ?? "");
    if (Buffer.byteLength(text) !== override.byte_size || /user_amic_|emp_amic_|@amic\.law/iu.test(text)) {
      throw new Error("private staging source override contains real identity material");
    }
    if (override.target_path.endsWith("amic-client-candidates.js")
      && !/AMIC_CURRENT_CLIENT_CANDIDATES\s*=\s*Object\.freeze\(\[\]\)/u.test(text)) {
      throw new Error("private staging client candidate override must be empty");
    }
    if (override.target_path.endsWith("lawos-role-registry.js")
      && !text.includes('LAWOS_ROLE_REGISTRY_SOURCE = "private-synthetic-identity-manifest"')) {
      throw new Error("private staging role registry override must be synthetic-manifest backed");
    }
    expected.delete(override.target_path);
  }
  if (expected.size) throw new Error("private staging source override target is missing");
  return Object.freeze({ override_count: overrides.length, real_identity_match_count: 0, real_client_candidate_count: 0 });
}
