import { hashDomainValue } from "../../persistence/src/domain-ledger.js";

const OWNER = "lawos_outlook_authority_owner";
const ROLE_ATTRIBUTES = Object.freeze({
  lawos_app: Object.freeze({
    login: true,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypassrls: false,
  }),
  lawos_outlook_authority_owner: Object.freeze({
    login: false,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypassrls: false,
  }),
  lawos_outlook_control_operator: Object.freeze({
    login: true,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypassrls: false,
  }),
  lawos_outlook_assignment_worker: Object.freeze({
    login: true,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypassrls: false,
  }),
  lawos_outlook_lifecycle_verifier: Object.freeze({
    login: true,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypassrls: false,
  }),
});
const ROLES = Object.freeze([
  "PUBLIC",
  ...Object.keys(ROLE_ATTRIBUTES),
]);
export const OUTLOOK_DESKTOP_ASSIGNMENT_ROLE_CATALOG = Object.freeze(
  Object.entries(ROLE_ATTRIBUTES).sort(([left], [right]) =>
    left.localeCompare(right)).map(([name, attributes]) => Object.freeze({
    name,
    ...attributes,
  })),
);
export const OUTLOOK_DESKTOP_ASSIGNMENT_ROLE_CATALOG_SHA256 =
  hashDomainValue(OUTLOOK_DESKTOP_ASSIGNMENT_ROLE_CATALOG);
const BOOTSTRAP_CANONICAL_SEGMENT_ORDER = Object.freeze([
  "digest_domain",
  "receipt_schema_version",
  "postgres_major",
  "database.oid",
  "database.name",
  "migration.catalog_id",
  "migration.schema_version",
  "migration.target_schema",
  "schemas.lawos_email_dms.owner_oid",
  "schemas.lawos_email_dms.owner_name",
  "schemas.lawos_meta.owner_oid",
  "schemas.lawos_meta.owner_name",
  "migration_admin.complete_role_row",
  "bootstrap_grantor.oid",
  "bootstrap_grantor.name",
  "protected_role_count",
  "protected_roles.name_sorted_complete_role_rows",
  "lawos_app_membership_present",
  "membership_count",
  "memberships.granted_role_member_grantor_sorted_complete_rows",
]);

const TABLE_NAMES = Object.freeze([
  "outlook_desktop_installations",
  "outlook_desktop_installation_nonces",
  "outlook_desktop_installation_idempotency",
  "outlook_desktop_installation_audit_events",
  "outlook_desktop_release_artifacts",
  "outlook_desktop_release_trust_audit_events",
  "outlook_desktop_release_import_receipts",
  "outlook_desktop_release_revocation_receipts",
  "outlook_desktop_activation_issue_authorities",
  "outlook_desktop_activation_challenges",
  "outlook_desktop_activation_operator_packet_evidence",
  "outlook_desktop_activation_authorizations",
  "outlook_desktop_lifecycle_challenges",
  "outlook_desktop_lifecycle_authorizations",
  "outlook_desktop_installation_release_bindings",
  "outlook_desktop_assignment_canary_principals",
  "outlook_desktop_assignment_rosters",
  "outlook_desktop_assignment_roster_members",
  "outlook_desktop_assignment_expansion_authorizations",
  "outlook_desktop_assignment_policy_approvals",
  "outlook_desktop_assignment_policies",
  "outlook_desktop_assignment_states",
  "outlook_desktop_assignment_audit_events",
  "outlook_desktop_assignment_outbox",
  "outlook_desktop_assignment_outbox_receipts",
]);
const immutableTrigger = (name, functionName =
  "reject_outlook_desktop_immutable_mutation()") => Object.freeze({
  name,
  function_signature: `lawos_email_dms.${functionName}`,
  type: 27,
  enabled: "O",
  constraint_oid: 0,
  deferrable: false,
  initially_deferred: false,
});
const trigger = (name, functionName, type) => Object.freeze({
  name,
  function_signature: `lawos_email_dms.${functionName}`,
  type,
  enabled: "O",
  constraint_oid: 0,
  deferrable: false,
  initially_deferred: false,
});
const TRIGGERS_BY_TABLE = Object.freeze({
  outlook_desktop_installation_nonces: Object.freeze([
    immutableTrigger("outlook_desktop_nonces_immutable"),
  ]),
  outlook_desktop_installation_idempotency: Object.freeze([
    immutableTrigger("outlook_desktop_idempotency_immutable"),
  ]),
  outlook_desktop_installation_audit_events: Object.freeze([
    immutableTrigger("outlook_desktop_audit_immutable"),
  ]),
  outlook_desktop_release_artifacts: Object.freeze([
    immutableTrigger("outlook_desktop_release_revocation_only",
      "enforce_outlook_desktop_release_revocation()"),
  ]),
  outlook_desktop_release_trust_audit_events: Object.freeze([
    trigger("outlook_desktop_release_audit_binding",
      "enforce_outlook_desktop_release_audit_binding()", 7),
    immutableTrigger("outlook_desktop_release_audit_immutable"),
  ]),
  outlook_desktop_release_import_receipts: Object.freeze([
    immutableTrigger("outlook_desktop_release_import_receipt_immutable"),
  ]),
  outlook_desktop_release_revocation_receipts: Object.freeze([
    immutableTrigger("outlook_desktop_release_revocation_receipt_immutable"),
  ]),
  outlook_desktop_activation_issue_authorities: Object.freeze([
    immutableTrigger("outlook_desktop_activation_issue_authority_immutable"),
  ]),
  outlook_desktop_activation_challenges: Object.freeze([
    trigger("outlook_desktop_activation_challenge_binding",
      "enforce_outlook_desktop_activation_challenge()", 31),
  ]),
  outlook_desktop_activation_operator_packet_evidence: Object.freeze([
    immutableTrigger(
      "outlook_desktop_activation_operator_packet_evidence_immutable",
    ),
  ]),
  outlook_desktop_activation_authorizations: Object.freeze([
    trigger("outlook_desktop_activation_authorization_binding",
      "enforce_outlook_desktop_activation_authorization()", 23),
    trigger("outlook_desktop_activation_authorization_no_delete",
      "reject_outlook_desktop_immutable_mutation()", 11),
  ]),
  outlook_desktop_lifecycle_authorizations: Object.freeze([
    immutableTrigger("outlook_desktop_lifecycle_authorization_immutable",
      "enforce_outlook_desktop_lifecycle_authorization()"),
  ]),
  outlook_desktop_lifecycle_challenges: Object.freeze([
    trigger("outlook_desktop_lifecycle_challenge_binding",
      "enforce_outlook_desktop_lifecycle_challenge()", 31),
  ]),
  outlook_desktop_installation_release_bindings: Object.freeze([
    immutableTrigger("outlook_desktop_installation_release_binding_immutable"),
  ]),
  outlook_desktop_assignment_canary_principals: Object.freeze([
    immutableTrigger("outlook_desktop_assignment_canary_principal_immutable"),
  ]),
  outlook_desktop_assignment_rosters: Object.freeze([
    immutableTrigger("outlook_desktop_assignment_roster_immutable"),
  ]),
  outlook_desktop_assignment_roster_members: Object.freeze([
    immutableTrigger("outlook_desktop_assignment_roster_member_immutable"),
  ]),
  outlook_desktop_assignment_expansion_authorizations: Object.freeze([
    immutableTrigger("outlook_desktop_assignment_expansion_authorization_immutable",
      "enforce_outlook_desktop_expansion_authorization()"),
  ]),
  outlook_desktop_assignment_policy_approvals: Object.freeze([
    trigger("outlook_desktop_policy_approval_binding",
      "enforce_outlook_desktop_policy_approval()", 23),
    trigger("outlook_desktop_policy_approval_immutable",
      "reject_outlook_desktop_immutable_mutation()", 11),
  ]),
  outlook_desktop_assignment_policies: Object.freeze([
    trigger("outlook_desktop_policy_binding",
      "enforce_outlook_desktop_policy()", 23),
    trigger("outlook_desktop_policy_no_delete",
      "reject_outlook_desktop_immutable_mutation()", 11),
  ]),
  outlook_desktop_assignment_audit_events: Object.freeze([
    immutableTrigger("outlook_desktop_assignment_audit_immutable"),
  ]),
  outlook_desktop_assignment_outbox_receipts: Object.freeze([
    immutableTrigger("outlook_desktop_assignment_receipt_immutable"),
  ]),
});

const APP_SELECT = new Set([
  "outlook_desktop_release_artifacts",
  "outlook_desktop_release_trust_audit_events",
]);

const APP_FUNCTIONS = Object.freeze([
  "issue_outlook_desktop_lifecycle_challenge(text,jsonb)",
  "register_outlook_desktop_installation(text,jsonb)",
  "heartbeat_outlook_desktop_installation(text,jsonb)",
  "retire_outlook_desktop_installation(text,jsonb)",
  "read_outlook_desktop_installation(text,text,text,text)",
  "read_current_outlook_desktop_installation(text,text,text)",
  "read_outlook_desktop_assignment_state(text,text,text)",
  "read_outlook_desktop_activation_proof_seed(text,jsonb)",
]);
const CONTROL_FUNCTIONS = Object.freeze([
  "replay_outlook_desktop_release_import(text,text,jsonb)",
  "import_outlook_desktop_release_artifact(text,text,jsonb)",
  "replay_outlook_desktop_release_revocation(text,text,jsonb)",
  "revoke_outlook_desktop_release(text,text,jsonb)",
  "authorize_outlook_desktop_assignment_expansion(text,jsonb)",
  "import_outlook_desktop_assignment_roster(text,jsonb)",
  "approve_outlook_desktop_assignment_policy(text,jsonb)",
  "revoke_outlook_desktop_assignment_policy(text,jsonb)",
  "publish_outlook_desktop_activation_issue_authority(text,jsonb)",
  "load_current_outlook_desktop_activation_issue_authority(text,jsonb)",
  "issue_outlook_desktop_activation_challenge(text,jsonb)",
  "attach_outlook_desktop_activation_evidence(text,jsonb)",
  "load_outlook_desktop_activation_reservation(text,text)",
  "authorize_outlook_desktop_activation(text,jsonb)",
]);
const WORKER_FUNCTIONS = Object.freeze([
  "sweep_outlook_desktop_assignments(text,integer)",
  "claim_outlook_desktop_assignment_jobs(text,text,integer,integer,integer)",
  "begin_outlook_desktop_assignment_dispatch(text,text,text,text)",
  "complete_outlook_desktop_assignment_job(text,jsonb)",
  "fail_outlook_desktop_assignment_job(text,jsonb,integer,integer)",
  "extend_outlook_desktop_assignment_lease(text,text,text,text,integer)",
  "recover_outlook_desktop_assignment_removals(text,integer)",
]);
const VERIFIER_FUNCTIONS = Object.freeze([
  "mint_outlook_desktop_lifecycle_verifier_receipt(text,jsonb)",
]);
const INTERNAL_FUNCTIONS = Object.freeze([
  "reject_outlook_desktop_immutable_mutation()",
  "outlook_desktop_release_audit_binding_sha256(text,text,text,text,text,text,text,timestamp with time zone)",
  "enforce_outlook_desktop_release_audit_binding()",
  "enforce_outlook_desktop_release_revocation()",
  "project_outlook_desktop_assignment_at(text,text,text,text,timestamp with time zone)",
  "outlook_desktop_binding_sha256(text[])",
  "outlook_desktop_canonical_json_text(jsonb)",
  "outlook_desktop_assert_tenant(text)",
  "outlook_desktop_exact_millisecond_utc(text)",
  "outlook_desktop_release_artifact_authority_sha256(text,text)",
  "outlook_desktop_release_revocation_authority_sha256(text,text)",
  "consume_outlook_desktop_activation_authorization_at(text,jsonb,timestamp with time zone)",
  "enforce_outlook_desktop_policy_approval()",
  "enforce_outlook_desktop_policy()",
  "enforce_outlook_desktop_activation_authorization()",
  "enforce_outlook_desktop_activation_challenge()",
  "enforce_outlook_desktop_lifecycle_challenge()",
  "enforce_outlook_desktop_lifecycle_authorization()",
  "enforce_outlook_desktop_expansion_authorization()",
]);
const LEGACY_FUNCTIONS = Object.freeze([
  "reject_email_filing_placement_mutation()",
  "reject_email_filing_correction_audit_mutation()",
  "reject_graph_sync_immutable_mutation()",
]);

function matrix(allowedRole = null) {
  return Object.fromEntries(ROLES.map((role) => [
    role,
    Object.freeze(role === allowedRole ? ["EXECUTE"] : []),
  ]));
}

const allowedByFunction = new Map([
  ...APP_FUNCTIONS.map((name) => [name, "lawos_app"]),
  ...CONTROL_FUNCTIONS.map((name) => [name, "lawos_outlook_control_operator"]),
  ...WORKER_FUNCTIONS.map((name) => [name, "lawos_outlook_assignment_worker"]),
  ...VERIFIER_FUNCTIONS.map((name) => [name, "lawos_outlook_lifecycle_verifier"]),
]);
const READ_ONLY_FUNCTIONS = new Set([
  "read_outlook_desktop_installation(text,text,text,text)",
  "read_current_outlook_desktop_installation(text,text,text)",
  "replay_outlook_desktop_release_import(text,text,jsonb)",
  "replay_outlook_desktop_release_revocation(text,text,jsonb)",
  "load_current_outlook_desktop_activation_issue_authority(text,jsonb)",
  "load_outlook_desktop_activation_reservation(text,text)",
  "read_outlook_desktop_activation_proof_seed(text,jsonb)",
]);

export const OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS =
  Object.freeze([...allowedByFunction].map(([name, role]) => Object.freeze({
    signature: `lawos_email_dms.${name}`,
    owner: OWNER,
    allowed_roles: Object.freeze([role]),
    transaction_mode: READ_ONLY_FUNCTIONS.has(name)
      ? "serializable_read"
      : "serializable_write",
  })));
export const OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256 =
  hashDomainValue(OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS);
const transactionModeBySignature = new Map(
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS.map((entry) => [
    entry.signature,
    entry.transaction_mode,
  ]),
);

export const OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG = Object.freeze({
  database: Object.freeze({ name: "lawos" }),
  schema: Object.freeze({
    name: "lawos_email_dms",
    owner: "lawos_admin",
    privileges: Object.freeze(Object.fromEntries(ROLES.map((role) => [
      role,
      Object.freeze(role === "PUBLIC" ? [] : ["USAGE"]),
    ]))),
  }),
  meta_schema: Object.freeze({
    name: "lawos_meta",
    owner: "lawos_admin",
    preserves_existing_non_grantable_usage: true,
    privileges: Object.freeze({
      PUBLIC: Object.freeze([]),
      lawos_app: Object.freeze(["USAGE"]),
      lawos_outlook_authority_owner: Object.freeze(["USAGE"]),
      lawos_outlook_control_operator: Object.freeze([]),
      lawos_outlook_assignment_worker: Object.freeze([]),
      lawos_outlook_lifecycle_verifier: Object.freeze([]),
    }),
  }),
  tenant_context_authority: Object.freeze({
    schema_version: "lawos.outlook-tenant-context-authority-catalog.v1",
    signature: "lawos_security.current_tenant_id()",
    owner: "lawos_admin",
    oid_binding: "live_exact",
    schema: Object.freeze({
      name: "lawos_security",
      owner: "lawos_admin",
      privileges: Object.freeze({ PUBLIC: Object.freeze(["USAGE"]) }),
      grant_options: false,
    }),
    authority_table: Object.freeze({
      name: "lawos_security.tenant_context_authorities",
      owner: "lawos_admin",
      relkind: "r",
      rls_enabled: false,
      rls_forced: false,
      privileges: Object.freeze({ PUBLIC: Object.freeze([]) }),
      column_privileges: Object.freeze([]),
    }),
    language: "plpgsql",
    volatility: "stable",
    security_definer: true,
    search_path: "search_path=pg_catalog, lawos_security",
    search_paths: Object.freeze({
      pre_migration: "search_path=pg_catalog, lawos_security, public",
      post_migration: "search_path=pg_catalog, lawos_security",
    }),
    body_sha256:
      "e1e33ef1f4b60203f6b0ab68461ce85df5bc7d13d0c17fa665f8c825b4ddc260",
    privileges: Object.freeze({ PUBLIC: Object.freeze(["EXECUTE"]) }),
    grant_options: false,
    hmac: Object.freeze({
      signature: "public.hmac(bytea,bytea,text)",
      oid_binding: "live_exact",
      owner_binding: "live_exact",
      extension_oid_binding: "live_exact",
      extension: "pgcrypto",
      extension_version: "1.3",
      privileges: Object.freeze({ PUBLIC: Object.freeze(["EXECUTE"]) }),
      grant_options: false,
      disallowed_owners: Object.freeze([
        "lawos_app",
        "lawos_outlook_control_operator",
        "lawos_outlook_assignment_worker",
        "lawos_outlook_lifecycle_verifier",
      ]),
    }),
    core_functions: Object.freeze([
      Object.freeze({ signature: "pg_catalog.sha256(bytea)", oid: 3420 }),
      Object.freeze({ signature: "pg_catalog.gen_random_uuid()", oid: 3432 }),
    ]),
    runtime_public_create: false,
    public_schema: Object.freeze({
      name: "public",
      public_usage: true,
      runtime_create: false,
      runtime_usage: true,
      runtime_roles: Object.freeze(Object.keys(ROLE_ATTRIBUTES)),
    }),
  }),
  owner: OWNER,
  migration_admin: "lawos_admin",
  roles: ROLES,
  role_attributes: ROLE_ATTRIBUTES,
  role_catalog: OUTLOOK_DESKTOP_ASSIGNMENT_ROLE_CATALOG,
  role_catalog_sha256: OUTLOOK_DESKTOP_ASSIGNMENT_ROLE_CATALOG_SHA256,
  security_definer_functions:
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
  security_definer_functions_sha256:
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
  bootstrap_receipt: Object.freeze({
    name: "lawos_meta.outlook_authority_bootstrap_receipts",
    owner: OWNER,
    schema_owner: "lawos_admin",
    schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
    migration_catalog_id: "007_outlook_desktop_assignment",
    migration_schema_version:
      "lawos.email-dms.outlook-desktop-assignment-migration.v1",
    digest_domain:
      "lawos.outlook-authority-role-bootstrap-receipt.sha256.v1",
    postgres_major: "16",
    expected_receipt_relation:
      "pg_temp.outlook_authority_expected_receipt",
    expected_digest_fields: Object.freeze([
      "role_bootstrap_sha256",
      "authority_manifest_sha256",
      "database_target_receipt_sha256",
      "migration_catalog_sha256",
    ]),
    lawos_app_membership_policy: Object.freeze({
      presence: "zero_or_one",
      member: "lawos_admin",
      grantor_binding: "shared_bootstrap_grantor_live_exact",
      admin_option: true,
      inherit_option: false,
      set_option: false,
    }),
    canonical_encoding: "u32be-length-prefixed-utf8",
    canonical_segment_order: BOOTSTRAP_CANONICAL_SEGMENT_ORDER,
    captured_at_in_digest: false,
    rls_enabled: false,
    rls_forced: false,
    policy: null,
    privileges: Object.freeze({
      PUBLIC: Object.freeze([]),
      lawos_admin: Object.freeze(["SELECT"]),
      lawos_app: Object.freeze([]),
      lawos_outlook_authority_owner: Object.freeze([]),
      lawos_outlook_control_operator: Object.freeze([]),
      lawos_outlook_assignment_worker: Object.freeze([]),
      lawos_outlook_lifecycle_verifier: Object.freeze([]),
    }),
  }),
  tables: Object.freeze(TABLE_NAMES.map((name) => Object.freeze({
    name: `lawos_email_dms.${name}`,
    owner: OWNER,
    rls_enabled: true,
    rls_forced: true,
    policy: "tenant_isolation",
    triggers: TRIGGERS_BY_TABLE[name] ?? Object.freeze([]),
    privileges: Object.freeze(Object.fromEntries(ROLES.map((role) => [
      role,
      Object.freeze(role === "lawos_app" && APP_SELECT.has(name)
        ? ["SELECT"]
        : []),
    ]))),
  }))),
  functions: Object.freeze([
    ...LEGACY_FUNCTIONS.map((name) => Object.freeze({
      signature: `lawos_email_dms.${name}`,
      owner: "lawos_admin",
      transaction_mode: null,
      privileges: Object.freeze(matrix()),
    })),
    ...[
    ...INTERNAL_FUNCTIONS,
    ...APP_FUNCTIONS,
    ...CONTROL_FUNCTIONS,
    ...WORKER_FUNCTIONS,
    ...VERIFIER_FUNCTIONS,
    ].map((name) => Object.freeze({
    signature: `lawos_email_dms.${name}`,
    owner: OWNER,
    transaction_mode: transactionModeBySignature.get(
      `lawos_email_dms.${name}`,
    ) ?? null,
    privileges: Object.freeze(matrix(allowedByFunction.get(name))),
    })),
  ]),
});

export const OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256 =
  hashDomainValue(OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG);

export function assertOutlookDesktopAssignmentAuthorityCatalog(
  value,
  { database_name: expectedDatabaseName = "lawos" } = {},
) {
  if (typeof expectedDatabaseName !== "string"
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/u.test(expectedDatabaseName)
      || value?.database?.name !== expectedDatabaseName) {
    throw new TypeError("Outlook desktop assignment authority catalog is invalid");
  }
  let digest;
  try {
    digest = hashDomainValue({
      ...value,
      database: OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.database,
    });
  } catch {
    digest = null;
  }
  if (digest !== OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256) {
    throw new TypeError("Outlook desktop assignment authority catalog is invalid");
  }
  return value;
}

export function createOutlookDesktopAssignmentAuthorityCatalogExpectation({
  database_name,
} = {}) {
  const value = Object.freeze({
    ...OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
    database: Object.freeze({ name: database_name }),
  });
  return assertOutlookDesktopAssignmentAuthorityCatalog(value, {
    database_name,
  });
}

export function normalizeOutlookDesktopAssignmentAuthorityCatalog(
  value,
  options,
) {
  return assertOutlookDesktopAssignmentAuthorityCatalog(value, options);
}
