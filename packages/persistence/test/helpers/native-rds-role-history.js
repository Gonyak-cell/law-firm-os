import { hashDomainValue } from "../../src/domain-ledger.js";
import { lawosOutlookRoleBootstrapDigest } from "../../src/postgres/outlook-authority-roles.js";

export function syntheticNativeRdsReadiness(original, {
  grantorOid = 20_001, superuserOid = 20_002, platformOid = 20_003,
  tenantAuthorityCount = 3,
  pauseExpectation = {
    schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
    role_bootstrap_sha256: "a".repeat(64),
    authority_manifest_sha256: "b".repeat(64),
    database_target_receipt_sha256: "c".repeat(64),
    migration_catalog_sha256: "d".repeat(64),
  },
} = {}) {
  const bootstrap = structuredClone(original);
  const role = (oid, name, inherit) => ({
    oid, name, can_login: false, superuser: false, createdb: false,
    createrole: false, inherit, replication: false, bypass_rls: false,
    connection_limit: -1, valid_until_present: false, valid_until: null,
    config_count: 0, config: [],
  });
  const grantor = role(grantorOid, "lawos_outlook_bootstrap_grantor", false);
  const rdsSuperuser = role(superuserOid, "rds_superuser", true);
  const rdsadmin = { oid: platformOid, name: "rdsadmin", can_login: true,
    superuser: true, createdb: true, createrole: true, inherit: true,
    replication: true, bypass_rls: true };
  const ref = ({ oid, name }) => ({ oid, name });
  bootstrap.migration_admin.inherit = true;
  bootstrap.bootstrap_grantor = ref(grantor);
  bootstrap.memberships = bootstrap.memberships
    .filter(({ granted_role: granted }) => granted.name !== "lawos_app")
    .map((edge) => ({ ...edge, grantor: ref(grantor) }));
  const edge = (granted, member, admin, inherit) => ({
    granted_role: ref(granted), member: ref(member), grantor: ref(rdsadmin),
    admin_option: admin, inherit_option: inherit, set_option: true,
  });
  const history = {
    pause_expectation: { ...pauseExpectation }, bootstrap_grantor: grantor,
    rds_superuser: rdsSuperuser, rdsadmin,
    memberships: [...bootstrap.memberships,
      ...bootstrap.roles.filter(({ name }) => name !== "lawos_app")
        .map((managed) => edge(managed, grantor, true, false)),
      edge(grantor, bootstrap.migration_admin, true, false),
      edge(rdsSuperuser, bootstrap.migration_admin, false, true)],
  };
  const digest = lawosOutlookRoleBootstrapDigest(bootstrap, { nativeRdsHistory: history });
  history.pause_expectation.role_bootstrap_sha256 = digest;
  return {
    receipt: {
      schema_version: "law-firm-os.outlook-role-readiness.native-rds-history.v1",
      role_count: 4, login_role_count: 3, tenant_authority_count: tenantAuthorityCount,
      membership_edge_count: 4, protected_membership_edge_count: 4,
      application_membership_edge_count: 0, synthetic_wildcard_count: 0,
      role_bootstrap: bootstrap, role_bootstrap_sha256: digest,
      password_returned: false, secret_material_returned: false,
      native_rds_history: history,
    },
    historicalOutlookBootstrapSha256: hashDomainValue(history.pause_expectation),
  };
}
