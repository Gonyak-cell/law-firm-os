// Test inputs only. This module never reads company source files or Git history.
// These existing policy references exercise the real local role registry. Identity
// attributes below are invented; the fixture does not change production policy.
export const SYNTHETIC_RUNTIME_TENANT = "tenant_amic_matter_vault";
export const SYNTHETIC_OTHER_TENANT = "tenant_b_qa_synthetic";
const policyUserIds = [
  "user_amic_ytkim", "user_amic_wsjo", "user_amic_sypark", "user_amic_bj_park",
  "user_amic_yhlim", "user_amic_jwsuh", "user_amic_smcho", "user_amic_jhhan",
  "user_amic_tryoon", "user_amic_yjlee", "user_amic_matter_desktop_qa", "user_qa_tenant_b",
];
export const SYNTHETIC_PROFILE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const readScopes = ["matter.read", "vault.read"];
const writeScopes = ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read"];
const roleProfiles = [
  { rank: 900, roles: ["tenant_owner", "managing_partner", "matter_vault_admin", "matter_vault_user"], groups: ["group_firm_leadership", "group_matter_vault_admins"], scopes: ["tenant.admin", ...writeScopes] },
  { rank: 700, roles: ["firm_admin", "matter_vault_admin", "matter_vault_user"], groups: ["group_firm_operations", "group_matter_vault_admins"], scopes: writeScopes },
  { rank: 100, roles: ["matter_vault_user"], groups: ["group_matter_vault_users"], scopes: readScopes },
  { rank: 800, roles: ["managing_partner", "attorney", "matter_vault_user"], groups: ["group_firm_leadership", "group_attorneys", "group_matter_vault_users"], scopes: writeScopes },
  { rank: 1000, roles: ["system_super_admin", "tenant_owner", "managing_partner", "security_admin", "matter_vault_admin", "matter_vault_user"], groups: ["group_system_admins", "group_firm_leadership", "group_matter_vault_admins"], scopes: ["tenant.admin", "user.admin", "security.admin", "cutover.execute", ...writeScopes, "audit.export"] },
  { rank: 500, roles: ["attorney", "matter_vault_user"], groups: ["group_attorneys", "group_matter_vault_users"], scopes: writeScopes },
  { rank: 400, roles: ["operations_lead", "matter_vault_user"], groups: ["group_firm_operations", "group_matter_vault_users"], scopes: writeScopes },
  { rank: 200, roles: ["support_user", "matter_vault_user"], groups: ["group_firm_operations", "group_matter_vault_users"], scopes: readScopes },
  { rank: 100, roles: ["matter_vault_user"], groups: ["group_qa_isolation"], scopes: readScopes },
];
const roleIndexes = [0, 1, 2, 3, 3, 4, 3, 5, 6, 7, 2, 8];
const titles = ["대표이사", "이사", "차장", "대표변호사", "대표변호사", "대표변호사", "대표변호사", "고문변호사", "실장", "대리"];
const kinds = ["cpa", "deal_advisor", "cpa", "attorney", "attorney", "attorney", "attorney", "attorney", null, null];

export function createSyntheticPrivateRuntimeSources() {
  const users = roleIndexes.map((roleIndex, index) => {
    const number = String(index + 1).padStart(2, "0");
    const profile = roleProfiles[roleIndex];
    const email = `member${number}@runtime.example.test`;
    const membership = {
      tenant_id: index === 11 ? SYNTHETIC_OTHER_TENANT : SYNTHETIC_RUNTIME_TENANT,
      role_ids: [...profile.roles], group_ids: [...profile.groups], scopes: [...profile.scopes],
    };
    return {
      user_id: policyUserIds[index], email,
      display_name: index >= 10 ? `Fixture Member ${number}` : `테스트 구성원 ${number}`,
      english_name: `Fixture Member ${number}`,
      source_title: titles[index] ?? "QA", status: "active", registration_state: "registered_seed",
      mfa_required: true, highest_privilege: profile.rank === 1000, privilege_rank: profile.rank,
      role_ids: [...profile.roles], group_ids: [...profile.groups], scopes: [...profile.scopes],
      assurance_level: "mfa",
      ...(index >= 10 ? { production_status: "disabled", qa_tenant_scope: "synthetic_only" } : {}),
      local_dev: { synthetic_only: true, synthetic_token: `local-dev-only:${email}` },
      tenant_memberships: [membership],
    };
  });
  const members = users.slice(0, 10).map((user, index) => {
    const number = String(index + 1).padStart(2, "0");
    const department = index < 3 ? "Finance" : index < 8 ? "Legal" : "Staff";
    const organization = index < 3 ? "Fixture Advisory" : index < 8 ? "Fixture Legal" : "Fixture Operations";
    return {
      user_id: user.user_id, employee_id: user.user_id.replace(/^user_/u, "emp_"),
      display_name: user.display_name, legal_name: user.display_name, work_email: user.email,
      title: titles[index], employment_type: "full_time", status: "active", profile_status: "active",
      affiliation: organization, department, organization_group: organization,
      org_unit_id: `org_${department.toLowerCase()}`, country: "대한민국",
      ...(index === 7 ? { start_date: "2026-07-06" } : {}),
      manager_employee_id: [1, 2].includes(index) ? "emp_amic_ytkim" : index === 9 ? "emp_amic_tryoon" : null,
      professional_profile: kinds[index] ? {
        schema_version: "law-firm-os.people-professional-profile.v0.1", profile_kind: kinds[index],
        public_role_labels: [titles[index]], practice_areas: ["Synthetic practice"],
        experience: ["Synthetic experience"], education: ["Synthetic education"],
        qualifications: index === 7 ? ["대한민국 변호사", "대한민국 공인회계사"]
          : kinds[index] === "attorney" ? ["대한민국 변호사"] : kinds[index] === "cpa" ? ["대한민국 공인회계사"] : [],
        source_refs: ["synthetic-runtime-fixture"], source_notes: ["Synthetic test data"], excluded_claim_refs: [],
      } : null,
    };
  });
  return {
    registration: {
      schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
      status: "registered-local-seed", created_at: "2026-01-01T00:00:00.000Z",
      tenant_id: SYNTHETIC_RUNTIME_TENANT,
      source: { source_ref: "synthetic-runtime-fixture", account_count: users.length, phone_numbers_imported: false },
      registration_boundary: { production_idp_account_creation: false, m365_graph_user_write: false, passwords_or_real_tokens_included: false, local_dev_synthetic_tokens_only: true },
      fixture_only: true,
      highest_privilege_account: { email: users.find((user) => user.highest_privilege).email, role_id: "system_super_admin", privilege_rank: 1000 },
      users,
    },
    roster: {
      schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
      status: "synthetic-test-fixture", created_at: "2026-01-01T00:00:00.000Z",
      tenant_id: SYNTHETIC_RUNTIME_TENANT, source_ref: "hrx-member-roster-source-of-truth",
      members,
    },
  };
}
