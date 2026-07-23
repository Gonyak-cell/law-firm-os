import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../../../packages/master-data/src/central-ledger.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN } from "../../../packages/runtime-auth/src/private-staging-synthetic-email.js";

const ACCOUNT_SEED_URL = new URL("./matter-vault-user-registration-seed.json", import.meta.url);
const ROSTER_URL = new URL("./hrx-member-roster-source-of-truth.json", import.meta.url);
const INTERNAL_PASSWORD_PROVIDER = "lawos-internal-password-provider-v1";
const SYNTHETIC_USER_ID = /^synthetic-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_EMPLOYEE_ID = /^emp-lawos-staging-[a-z0-9-]+$/u;
const BASELINE_CLOCK = "2026-07-20T00:00:00.000Z";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function uniqueStrings(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const items = [...new Set(value.map((item) => requiredText(item, name)))];
  if (items.length !== value.length) throw new TypeError(`${name} must not contain duplicates`);
  return Object.freeze(items);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function loadJson(url, name) {
  try {
    return JSON.parse(readFileSync(url, "utf8"));
  } catch (error) {
    throw new Error(`${name} must be packaged with the private-staging artifact`, { cause: error });
  }
}

function assertSyntheticProfessionalProfile(profile, name) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError(`${name} is required`);
  if (profile.schema_version !== "law-firm-os.people-professional-profile.v0.1") throw new TypeError(`${name} schema is invalid`);
  for (const field of ["public_role_labels", "practice_areas", "experience", "education", "qualifications"]) {
    if (!Array.isArray(profile[field]) || (field !== "qualifications" && profile[field].length === 0)) {
      throw new TypeError(`${name}.${field} must be a synthetic array`);
    }
  }
  if (!JSON.stringify(profile).toLowerCase().includes("synthetic")) throw new TypeError(`${name} must be visibly synthetic`);
}

export function validatePrivateStagingSyntheticBaseline({ accountSeed, roster, tenantIds } = {}) {
  const tenants = uniqueStrings(tenantIds, "CUT-007 tenant id");
  if (tenants.length !== 2 || tenants[0] === tenants[1]) throw new TypeError("CUT-007 requires two distinct synthetic tenants");
  const primaryTenantId = tenants[0];
  const negativeTenantId = tenants[1];
  if (accountSeed?.schema_version !== "law-firm-os.matter-vault-user-registration-seed.v0.1"
    || accountSeed?.status !== "registered-synthetic-staging-seed"
    || accountSeed?.tenant_id !== primaryTenantId) {
    throw new TypeError("packaged synthetic account seed is invalid");
  }
  if (roster?.schema_version !== "law-firm-os.hrx-member-roster-source-of-truth.v0.1"
    || roster?.status !== "registered-synthetic-staging-source"
    || roster?.tenant_id !== primaryTenantId) {
    throw new TypeError("packaged synthetic HRX roster is invalid");
  }
  if (accountSeed.registration_boundary?.passwords_or_real_tokens_included !== false
    || roster.change_control?.passwords_or_real_tokens_included !== false) {
    throw new TypeError("synthetic baseline may not contain passwords or real tokens");
  }
  const users = accountSeed.users ?? [];
  const members = roster.members ?? [];
  if (users.length < 3 || users.length !== members.length) throw new TypeError("synthetic account and roster counts must match and contain the CUT-007 principals");
  const membersByUser = new Map(members.map((member) => [member.user_id, member]));
  if (membersByUser.size !== members.length) throw new TypeError("synthetic roster user ids must be unique");
  const seen = { user: new Set(), employee: new Set(), email: new Set() };
  const normalizedUsers = users.map((user, index) => {
    const member = membersByUser.get(user.user_id);
    const userId = requiredText(user.user_id, `users[${index}].user_id`);
    const email = requiredText(user.email, `users[${index}].email`).toLowerCase();
    const displayName = requiredText(user.display_name, `users[${index}].display_name`);
    const employeeId = requiredText(member?.employee_id, `members[${index}].employee_id`);
    if (!SYNTHETIC_USER_ID.test(userId) || !SYNTHETIC_EMPLOYEE_ID.test(employeeId) || !PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test(email)) {
      throw new TypeError("synthetic baseline identifiers are invalid");
    }
    if (!/^LawOS Staging Pilot [A-Z0-9-]+$/u.test(displayName)
      || member.display_name !== displayName
      || String(member.work_email ?? "").toLowerCase() !== email) {
      throw new TypeError("synthetic account and roster identity mapping is invalid");
    }
    if (seen.user.has(userId) || seen.employee.has(employeeId) || seen.email.has(email)) throw new TypeError("synthetic baseline identifiers must be unique");
    seen.user.add(userId);
    seen.employee.add(employeeId);
    seen.email.add(email);
    if (!["active", "disabled"].includes(user.status) || user.production_status !== "disabled" || user.qa_tenant_scope !== "synthetic_only"
      || user.credential_provider !== INTERNAL_PASSWORD_PROVIDER
      || user.credential_status !== (user.status === "disabled" ? "disabled" : "reset_required")
      || user.password_setup_required !== (user.status === "active") || user.local_dev?.synthetic_only !== true || user.local_dev?.synthetic_token != null
      || Object.hasOwn(user, "password_hash")) {
      throw new TypeError("synthetic account must require first-use password setup and remain production-disabled");
    }
    const memberships = user.tenant_memberships ?? [];
    if (memberships.length !== 1 || memberships[0]?.tenant_id !== primaryTenantId || memberships[0]?.status !== user.status) {
      throw new TypeError("synthetic account must have one matching CUT-007 tenant membership");
    }
    const membership = memberships[0];
    const roleIds = uniqueStrings(membership.role_ids ?? user.role_ids, "synthetic role id");
    const groupIds = uniqueStrings(membership.group_ids ?? user.group_ids, "synthetic group id");
    const scopes = uniqueStrings(membership.scopes ?? user.scopes, "synthetic scope");
    const hrxScopes = uniqueStrings(membership.hrx_scopes ?? user.hrx_scopes, "synthetic HRX scope");
    if (!roleIds.length || !scopes.length || !hrxScopes.length || hrxScopes.some((scope) => !scopes.includes(scope))) {
      throw new TypeError("synthetic membership scopes are incomplete");
    }
    if (!["full_time", "part_time", "contractor", "intern"].includes(member.employment_type)
      || member.status !== "active" || member.profile_status !== "active") {
      throw new TypeError("synthetic HRX employment status is invalid");
    }
    assertSyntheticProfessionalProfile(member.professional_profile, `members[${index}].professional_profile`);
    return Object.freeze({ user, member, membership: Object.freeze({ ...membership, role_ids: roleIds, group_ids: groupIds, scopes, hrx_scopes: hrxScopes }) });
  });
  if (normalizedUsers.filter(({ user }) => user.status === "active").length < 2
    || normalizedUsers.filter(({ user }) => user.status === "disabled").length < 1
    || normalizedUsers[0].user.status !== "active") {
    throw new TypeError("CUT-007 requires an active administrator, a second active user, and a disabled user");
  }
  const sourceFingerprint = hashDomainValue({
    account_seed: accountSeed,
    roster,
    tenant_ids: tenants,
  });
  return Object.freeze({
    primary_tenant_id: primaryTenantId,
    negative_tenant_id: negativeTenantId,
    users: Object.freeze(normalizedUsers),
    source_fingerprint: sourceFingerprint,
  });
}

function buildHrxSnapshot({ tenantId, users = [] }) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const repository = createSqlHrxRepository({ store, clock: () => BASELINE_CLOCK });
    repository.transaction((tx) => {
      for (const { user, member } of users) {
        tx.createEmployee({
          tenant_id: tenantId,
          employee_id: member.employee_id,
          display_name: member.display_name,
          legal_name: member.legal_name,
          work_email: member.work_email,
          status: member.status,
          source_ref: "private-synthetic-identity-manifest",
        });
        tx.createEmploymentProfile({
          tenant_id: tenantId,
          profile_id: `profile-${member.employee_id}`,
          employee_id: member.employee_id,
          employment_type: member.employment_type,
          status: member.profile_status,
          title: member.title,
          org_unit_id: member.org_unit_id,
          manager_employee_id: member.manager_employee_id,
          effective_from: member.start_date,
          source_ref: "private-synthetic-identity-manifest",
          professional_profile: member.professional_profile,
        });
        tx.createEmployeeUserLink({
          tenant_id: tenantId,
          link_id: `link-${member.employee_id}`,
          employee_id: member.employee_id,
          user_id: user.user_id,
          purpose: "login_mapping",
          source_ref: "private-synthetic-identity-manifest",
        });
      }
    });
    return createHrxDomainSnapshot({ store, tenant_id: tenantId });
  } finally {
    store.close();
  }
}

function buildMasterDataSnapshot({ tenantId, ownerUserId, includeRecords = false }) {
  const repository = createMasterDataRepository();
  try {
    if (includeRecords) {
      const records = [
        {
          model_type: "Entity",
          entity_id: "entity-lawos-staging-client",
          tenant_id: tenantId,
          entity_kind: "organization",
          display_name: "LawOS Staging Synthetic Client",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "Party",
          party_id: "party-lawos-staging-client",
          tenant_id: tenantId,
          party_type: "organization",
          display_name: "LawOS Staging Synthetic Client",
          canonical_entity_id: "entity-lawos-staging-client",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "Organization",
          organization_id: "organization-lawos-staging-client",
          tenant_id: tenantId,
          entity_id: "entity-lawos-staging-client",
          party_id: "party-lawos-staging-client",
          display_name: "LawOS Staging Synthetic Client",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "Entity",
          entity_id: "entity-lawos-staging-contact",
          tenant_id: tenantId,
          entity_kind: "person",
          display_name: "LawOS Staging Synthetic Contact",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "Party",
          party_id: "party-lawos-staging-contact",
          tenant_id: tenantId,
          party_type: "person",
          display_name: "LawOS Staging Synthetic Contact",
          canonical_entity_id: "entity-lawos-staging-contact",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "Person",
          person_id: "person-lawos-staging-contact",
          tenant_id: tenantId,
          entity_id: "entity-lawos-staging-contact",
          party_id: "party-lawos-staging-contact",
          display_name: "LawOS Staging Synthetic Contact",
          email: "lawos-staging-contact@example.test",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "ClientGroup",
          client_group_id: "client-group-lawos-staging",
          tenant_id: tenantId,
          display_name: "LawOS Staging Synthetic Client Group",
          member_entity_ids: ["entity-lawos-staging-client", "entity-lawos-staging-contact"],
          member_party_ids: ["party-lawos-staging-client", "party-lawos-staging-contact"],
          primary_entity_id: "entity-lawos-staging-client",
          primary_party_id: "party-lawos-staging-client",
          billing_profile_id: "billing-profile-lawos-staging",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "Relationship",
          relationship_id: "relationship-lawos-staging-contact",
          tenant_id: tenantId,
          from_entity_id: "entity-lawos-staging-contact",
          to_entity_id: "entity-lawos-staging-client",
          from_party_id: "party-lawos-staging-contact",
          to_party_id: "party-lawos-staging-client",
          relationship_type: "primary_contact",
          direction: "person_to_organization",
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "ContactPoint",
          contact_point_id: "contact-point-lawos-staging",
          tenant_id: tenantId,
          owner_entity_id: "entity-lawos-staging-contact",
          owner_party_id: "party-lawos-staging-contact",
          contact_type: "email",
          value: "lawos-staging-contact@example.test",
          is_primary: true,
          verified: true,
          status: "active",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
        {
          model_type: "BillingProfile",
          billing_profile_id: "billing-profile-lawos-staging",
          tenant_id: tenantId,
          billing_entity_id: "entity-lawos-staging-client",
          display_name: "LawOS Staging Synthetic Billing",
          client_group_id: "client-group-lawos-staging",
          legal_client_party_id: "party-lawos-staging-client",
          billing_client_party_id: "party-lawos-staging-client",
          billing_contact_point_id: "contact-point-lawos-staging",
          status: "draft",
          owner_user_id: ownerUserId,
          synthetic_only: true,
        },
      ];
      for (const record of records) repository.create(record);
    }
    return createRecordRepositoryDomainSnapshot({
      descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "private-staging-synthetic-master-data", repository }],
      tenant_id: tenantId,
    });
  } finally {
    repository.close();
  }
}

function buildCrmSnapshot({ tenantId, ownerUserId, includeRecords = false }) {
  const repository = createCrmRuntimeRepository();
  try {
    if (includeRecords) {
      repository.create({
        model_type: "Opportunity",
        opportunity_id: "opportunity-lawos-staging",
        tenant_id: tenantId,
        party_id: "party-lawos-staging-client",
        display_name: "LawOS Staging Synthetic Opportunity",
        stage: "qualified",
        status: "active",
        owner_user_id: ownerUserId,
        created_at: BASELINE_CLOCK,
        updated_at: BASELINE_CLOCK,
        synthetic_only: true,
      });
    }
    return createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "private-staging-synthetic-crm", repository }],
      tenant_id: tenantId,
    });
  } finally {
    repository.close();
  }
}

export async function runPrivateStagingSyntheticBaseline({
  pool,
  tenantIds,
  accountSeed = loadJson(ACCOUNT_SEED_URL, "synthetic account seed"),
  roster = loadJson(ROSTER_URL, "synthetic HRX roster"),
  clock = () => Date.parse(BASELINE_CLOCK),
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const validated = validatePrivateStagingSyntheticBaseline({ accountSeed, roster, tenantIds });
  const primaryHrx = buildHrxSnapshot({ tenantId: validated.primary_tenant_id, users: validated.users });
  const negativeHrx = buildHrxSnapshot({ tenantId: validated.negative_tenant_id });
  const ownerUserId = validated.users[0].user.user_id;
  const primaryMasterData = buildMasterDataSnapshot({ tenantId: validated.primary_tenant_id, ownerUserId, includeRecords: true });
  const negativeMasterData = buildMasterDataSnapshot({ tenantId: validated.negative_tenant_id, ownerUserId });
  const primaryCrm = buildCrmSnapshot({ tenantId: validated.primary_tenant_id, ownerUserId, includeRecords: true });
  const negativeCrm = buildCrmSnapshot({ tenantId: validated.negative_tenant_id, ownerUserId });
  const identityLedger = createPostgresIdentityLedger({ pool, clock });
  const domainLedger = createPostgresDomainLedger({ pool, clock: () => new Date(clock()) });
  const firstProvisionResults = [];
  const replayProvisionResults = [];
  for (const { user, membership } of validated.users) {
    const requestPayload = {
      source_fingerprint: validated.source_fingerprint,
      tenant_id: validated.primary_tenant_id,
      user_id: user.user_id,
      email: user.email.toLowerCase(),
      membership,
    };
    const idempotencyKey = `private-staging-cut007-baseline:${user.user_id}:v1`;
    const input = {
      tenant_id: validated.primary_tenant_id,
      actor_id: "lawos-private-staging-cut007-baseline",
      data_scope: "synthetic-only",
      idempotency_key: idempotencyKey,
      request_hash: sha256(JSON.stringify(requestPayload)),
      user: {
        ...user,
        email: user.email.toLowerCase(),
        source_ref: "private-synthetic-identity-manifest",
      },
      membership,
    };
    firstProvisionResults.push(await identityLedger.provisionDirectoryUser(input));
    replayProvisionResults.push(await identityLedger.provisionDirectoryUser(input));
  }
  const primaryImport = await domainLedger.importSnapshot(primaryHrx.snapshot);
  const primaryReplay = await domainLedger.importSnapshot(primaryHrx.snapshot);
  const negativeImport = await domainLedger.importSnapshot(negativeHrx.snapshot);
  const negativeReplay = await domainLedger.importSnapshot(negativeHrx.snapshot);
  const primaryMasterDataImport = await domainLedger.importSnapshot(primaryMasterData.snapshot);
  const primaryMasterDataReplay = await domainLedger.importSnapshot(primaryMasterData.snapshot);
  const negativeMasterDataImport = await domainLedger.importSnapshot(negativeMasterData.snapshot);
  const negativeMasterDataReplay = await domainLedger.importSnapshot(negativeMasterData.snapshot);
  const primaryCrmImport = await domainLedger.importSnapshot(primaryCrm.snapshot);
  const primaryCrmReplay = await domainLedger.importSnapshot(primaryCrm.snapshot);
  const negativeCrmImport = await domainLedger.importSnapshot(negativeCrm.snapshot);
  const negativeCrmReplay = await domainLedger.importSnapshot(negativeCrm.snapshot);
  const [directoryUsers, identityOutbox, identityAudit, identityIdempotency, primaryEmployees, primaryProfiles, primaryLinks, negativeEmployees, primaryMasterDataRecords, negativeMasterDataRecords, primaryCrmRecords, negativeCrmRecords] = await Promise.all([
    identityLedger.listDirectoryUsers({ tenant_id: validated.primary_tenant_id }),
    identityLedger.listDirectoryOutbox({ tenant_id: validated.primary_tenant_id }),
    identityLedger.listSecurityAudit({ tenant_id: validated.primary_tenant_id }),
    identityLedger.listDirectoryIdempotency({ tenant_id: validated.primary_tenant_id }),
    domainLedger.list({ tenant_id: validated.primary_tenant_id, domain_id: "hrx", record_type: "hrx_employees" }),
    domainLedger.list({ tenant_id: validated.primary_tenant_id, domain_id: "hrx", record_type: "hrx_employment_profiles" }),
    domainLedger.list({ tenant_id: validated.primary_tenant_id, domain_id: "hrx", record_type: "hrx_employee_user_links" }),
    domainLedger.list({ tenant_id: validated.negative_tenant_id, domain_id: "hrx", record_type: "hrx_employees" }),
    domainLedger.list({ tenant_id: validated.primary_tenant_id, domain_id: "master-data" }),
    domainLedger.list({ tenant_id: validated.negative_tenant_id, domain_id: "master-data" }),
    domainLedger.list({ tenant_id: validated.primary_tenant_id, domain_id: "crm" }),
    domainLedger.list({ tenant_id: validated.negative_tenant_id, domain_id: "crm" }),
  ]);
  const wrongTenantVisibleCount = (await Promise.all(validated.users.map(({ user }) => identityLedger.findDirectoryUserByEmail({
    tenant_id: validated.negative_tenant_id,
    email: user.email,
  })))).filter(Boolean).length + negativeEmployees.length + negativeMasterDataRecords.length + negativeCrmRecords.length;
  const expectedCount = validated.users.length;
  const expectedCrmRecordKeys = new Set(primaryCrm.snapshot.records.map((record) => `${record.record_type}:${record.record_id}`));
  const baselineCrmRecordCount = primaryCrmRecords.filter((record) => expectedCrmRecordKeys.has(`${record.record_type}:${record.record_id}`)).length;
  const additionalCrmRecords = primaryCrmRecords.filter((record) => !expectedCrmRecordKeys.has(`${record.record_type}:${record.record_id}`));
  const invalidAdditionalCrmRecordCount = additionalCrmRecords.filter((record) => record.record_type !== "Opportunity"
    || !/^opportunity-cut007-[a-f0-9]{12}$/u.test(record.record_id)
    || record.payload?.opportunity_id !== record.record_id
    || record.payload?.tenant_id !== validated.primary_tenant_id
    || record.payload?.party_id !== "party-lawos-staging-client"
    || record.payload?.owner_user_id !== ownerUserId
    || !String(record.payload?.display_name ?? "").startsWith("LawOS Staging CUT-007 Opportunity ")
    || record.payload?.synthetic_only !== true).length;
  const safeInvariantCounts = Object.freeze({
    directory_user_count: directoryUsers.length,
    employee_count: primaryEmployees.length,
    employment_profile_count: primaryProfiles.length,
    employee_user_link_count: primaryLinks.length,
    identity_outbox_count: identityOutbox.length,
    identity_idempotency_count: identityIdempotency.length,
    identity_provision_audit_count: identityAudit.filter((event) => event.action === "auth.directory.user.provisioned").length,
    master_data_record_count: primaryMasterDataRecords.length,
    crm_baseline_record_count: baselineCrmRecordCount,
    crm_total_record_count: primaryCrmRecords.length,
    crm_boundary_violation_count: invalidAdditionalCrmRecordCount,
    wrong_tenant_visible_count: wrongTenantVisibleCount,
  });
  const pass = directoryUsers.length === expectedCount
    && primaryEmployees.length === expectedCount
    && primaryProfiles.length === expectedCount
    && primaryProfiles.every((record) => record.payload?.professional_profile?.schema_version === "law-firm-os.people-professional-profile.v0.1")
    && primaryLinks.length === expectedCount
    && identityOutbox.length === expectedCount
    && identityIdempotency.length === expectedCount
    && identityAudit.filter((event) => event.action === "auth.directory.user.provisioned").length === expectedCount
    && replayProvisionResults.every((result) => result.replayed && result.idempotency_replayed)
    && primaryReplay.replayed && negativeReplay.replayed
    && primaryMasterDataReplay.replayed && negativeMasterDataReplay.replayed
    && primaryCrmReplay.replayed && negativeCrmReplay.replayed
    && primaryMasterDataRecords.length === 10
    && primaryMasterDataRecords.every((record) => record.payload?.synthetic_only === true)
    && baselineCrmRecordCount === expectedCrmRecordKeys.size
    && primaryCrmRecords.every((record) => record.payload?.synthetic_only === true)
    && invalidAdditionalCrmRecordCount === 0
    && wrongTenantVisibleCount === 0;
  if (!pass) throw Object.assign(new Error(`private staging synthetic baseline invariants failed: ${JSON.stringify(safeInvariantCounts)}`), {
    code: "LAWOS_PRIVATE_STAGING_SYNTHETIC_BASELINE_FAILED",
    safe_error_code: "PRIVATE_STAGING_SYNTHETIC_BASELINE_FAILED",
    safe_counts: safeInvariantCounts,
  });
  return Object.freeze({
    outcome: "PASS",
    data_scope: "synthetic-only",
    tenant_count: 2,
    account_count: expectedCount,
    employee_count: primaryEmployees.length,
    employment_profile_count: primaryProfiles.length,
    professional_profile_count: primaryProfiles.filter((record) => record.payload?.professional_profile).length,
    employee_user_link_count: primaryLinks.length,
    master_data_record_count: primaryMasterDataRecords.length,
    crm_record_count: baselineCrmRecordCount,
    crm_total_record_count: primaryCrmRecords.length,
    crm_additional_synthetic_record_count: primaryCrmRecords.length - baselineCrmRecordCount,
    identity_audit_count: identityAudit.filter((event) => event.action === "auth.directory.user.provisioned").length,
    identity_outbox_count: identityOutbox.length,
    identity_idempotency_count: identityIdempotency.length,
    first_run_changed_count: firstProvisionResults.filter((result) => !result.replayed).length,
    immediate_replay_noop_count: replayProvisionResults.filter((result) => result.replayed && result.idempotency_replayed).length
      + [primaryReplay, negativeReplay, primaryMasterDataReplay, negativeMasterDataReplay, primaryCrmReplay, negativeCrmReplay]
        .filter((result) => result.replayed).length,
    wrong_tenant_visible_count: wrongTenantVisibleCount,
    primary_import_replayed: primaryImport.replayed,
    negative_import_replayed: negativeImport.replayed,
    primary_master_data_import_replayed: primaryMasterDataImport.replayed,
    negative_master_data_import_replayed: negativeMasterDataImport.replayed,
    primary_crm_import_replayed: primaryCrmImport.replayed,
    negative_crm_import_replayed: negativeCrmImport.replayed,
    source_fingerprint: validated.source_fingerprint,
    primary_hrx_snapshot_hash: primaryHrx.snapshot.snapshot_hash,
    negative_hrx_snapshot_hash: negativeHrx.snapshot.snapshot_hash,
    primary_master_data_snapshot_hash: primaryMasterData.snapshot.snapshot_hash,
    negative_master_data_snapshot_hash: negativeMasterData.snapshot.snapshot_hash,
    primary_crm_snapshot_hash: primaryCrm.snapshot.snapshot_hash,
    negative_crm_snapshot_hash: negativeCrm.snapshot.snapshot_hash,
    synthetic_email_value_returned: false,
    password_material_returned: false,
    secret_material_returned: false,
    real_data_count: 0,
    production_contacted: false,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    production_ready_claim: false,
  });
}
