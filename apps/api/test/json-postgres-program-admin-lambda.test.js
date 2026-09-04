import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import {
  LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
  LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
  LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
  LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
  LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION,
  lawosOutlookRoleBootstrapDigest,
  normalizeLawosOutlookAuthorityCatalog,
} from "../../../packages/persistence/src/postgres/outlook-authority-roles.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  bootstrapJsonPostgresRehearsalDatabase,
  bootstrapJsonPostgresProductionDatabase,
  createW15ProjectionWorkerMetric,
  ensureJsonPostgresRehearsalDatabase,
  executeJsonPostgresRelationalProjection,
  executeJsonPostgresW15InventoryBootstrap,
  executeJsonPostgresProgram,
  executeJsonPostgresRetirementSmoke,
  handler,
  loadApprovedDmsSourceObject,
  readJsonPostgresProductionSchemaLedger,
  safeJsonPostgresProgramErrorCode,
  writeJsonPostgresProgramEvidence,
} from "../src/json-postgres-program-admin-lambda.js";
import {
  JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
  JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
  JSON_POSTGRES_JSON_RETIREMENT_ACTION,
  JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
  JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
  resolveJsonPostgresScheduledProgramEvent,
} from "../src/json-postgres-program-inputs.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  listClientOperationsPostgresMigrations,
} from "../src/client-operations-schema.js";
import {
  authorization as outlookOperationAuthorization,
  boundAuthorization as boundOutlookOperationAuthorization,
  environment as outlookOperationEnvironment,
  NOW as OUTLOOK_OPERATION_NOW,
  operationEvent as outlookOperationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";
import {
  createOutlookAuthorityMigrationFailureSummary,
  createOutlookAuthorityMigrationRunReceipt,
} from "../../../packages/persistence/src/postgres/migration-runner.js";
import {
  JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
  createJsonPostgresOutlookAuthorityTerminal,
  jsonPostgresOutlookAuthorityTerminalSha256,
} from "../src/json-postgres-outlook-authority-terminal.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);
const ARTIFACT_SHA = "d".repeat(64);
const KMS = "arn:aws:kms:ap-northeast-2:770880870480:key/75868150-c892-47fc-8bea-17caa1808127";
const OFFICIAL_MIGRATION_CATALOG_COUNT = 79;
const OFFICIAL_MIGRATION_CATALOG_SHA256 =
  "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556";

assert.equal(
  CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  OFFICIAL_MIGRATION_CATALOG_SHA256,
);

function packet() {
  return {
    phase: "w13-production-cutover",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    bindings: {
      artifact_sha256: ARTIFACT_SHA,
      migration_catalog_sha256:
        OFFICIAL_MIGRATION_CATALOG_SHA256,
      dms_object_manifest_sha256: "e".repeat(64),
    },
    target: {
      approved_tenant_ids: ["tenant_amic"],
      program_input_bucket_name: "lawos-prod-program-input-770880870480",
      program_input_expected_bucket_owner: "770880870480",
      aws_account: "770880870480",
      aws_region: "ap-northeast-2",
      dms_bucket_name: "lawos-prod-dms-770880870480",
      dms_expected_bucket_owner: "770880870480",
      dms_prefix: "approved-real-migration",
      dms_kms_key_ref: "alias/lawos-prod-dms",
      dms_default_retention_days: 365,
    },
  };
}

function authorization() {
  return {
    exact: { sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA },
    packet: packet(),
    approval: {
      valid: true,
      decision: "approved",
      approval_id: "approval-001",
      key_id: "owner-key-1",
      receipt_sha256: "f".repeat(64),
      registry_sha256: "1".repeat(64),
      expires_at: "2026-07-30T00:00:00.000Z",
      phase: "w13-production-cutover",
      packet_sha256: PACKET_SHA,
    },
    trustRegistry: { schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1", keys: [] },
    authorization_input_sha256: "2".repeat(64),
  };
}

function w15BootstrapAuthorization() {
  const value = authorization();
  return {
    ...value,
    packet: {
      ...value.packet,
      phase: "w15-inventory-bootstrap",
      action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
      bindings: {
        ...value.packet.bindings,
        migration_catalog_sha256: "7".repeat(64),
      },
    },
  };
}

function env() {
  return {
    AWS_REGION: "ap-northeast-2",
    LAWOS_DATABASE_HOST: "lawos-private.example.rds.amazonaws.com",
    LAWOS_DATABASE_PORT: "5432",
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_MASTER_DATABASE_SECRET_ID: "lawos/master",
    LAWOS_APPLICATION_DATABASE_SECRET_ID: "lawos/application",
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/tenant-context",
    LAWOS_PROJECTION_DATABASE_SECRET_ID: "lawos/hrx-projection",
    LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID: "lawos/hrx-projection-auditor",
    LAWOS_APPROVAL_AUDIT_BUCKET: "lawos-prod-program-input-770880870480",
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: KMS,
  };
}

function outlookEnv() {
  return {
    ...env(),
    LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID: "lawos/outlook-control",
    LAWOS_OUTLOOK_ASSIGNMENT_DATABASE_SECRET_ID: "lawos/outlook-assignment",
    LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID:
      "lawos/outlook-lifecycle-verifier",
  };
}

function outlookCommitEnv() {
  const authorization = outlookOperationAuthorization();
  const databaseTarget = authorization.packet.target.database_target_receipt;
  return {
    ...outlookEnv(),
    ...outlookOperationEnvironment(),
    LAWOS_DATABASE_HOST: databaseTarget.endpoint_host,
    LAWOS_DATABASE_PORT: String(databaseTarget.endpoint_port),
    LAWOS_DATABASE_NAME: databaseTarget.database_name,
    LAWOS_MASTER_DATABASE_SECRET_ID:
      authorization.packet.target.database_secret_ref,
  };
}

function outlookSecretArn(secretId) {
  return `arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:${secretId}-a1b2c3`;
}

function outlookClaimEnvelope({ outcome = "replayed", attempted = true } = {}) {
  const event = outlookOperationEvent();
  const authorization = boundOutlookOperationAuthorization(event);
  return {
    outcome,
    claim_write_attempted: attempted,
    claim_write_committed: outcome === "claimed",
    receipt: {
      claim_sha256: "4".repeat(64),
      claim_ref_sha256: "5".repeat(64),
      request_sha256: "6".repeat(64),
      operation_binding_sha256: authorization.operation_binding_sha256,
      program_input_kms_key_ref:
        authorization.packet.target.program_input_kms_key_ref,
      approval_signature_sha256: authorization.approval.signature_sha256,
      approval_receipt_sha256: authorization.approval.receipt_sha256,
      registry_sha256: authorization.approval.registry_sha256,
      registry_serial: authorization.approval.registry_serial,
      trust_anchor_sha256: authorization.approval.trust_anchor_sha256,
      registry_signature_sha256:
        authorization.approval.registry_signature_sha256,
      external_authority_binding_sha256:
        authorization.approval.external_authority_binding_sha256,
      database_target_receipt: authorization.databaseTargetReceipt,
      database_target_receipt_sha256:
        authorization.database_target_receipt_sha256,
      claimed_at: new Date(OUTLOOK_OPERATION_NOW).toISOString(),
      expires_at: authorization.approval.expires_at,
    },
  };
}

const OUTLOOK_RECEIPT_IDENTITY = Object.freeze({
  session_user: "lawos_admin",
  current_user: "lawos_admin",
  database_name: "lawos",
  database_oid: "42",
  backend_pid: 7,
});
const OUTLOOK_RECEIPT_MIGRATIONS = Object.freeze([
  Object.freeze({ id: "001_alpha", checksum: "c".repeat(64), applied: true }),
  Object.freeze({ id: "002_beta", checksum: "d".repeat(64), applied: true }),
]);

function outlookPauseExpectation({ authorityCatalogSha256,
  databaseTargetReceiptSha256, migrationCatalogSha256, roleBootstrapSha256,
}) {
  return Object.freeze({
    schema_version: "lawos.outlook-authority-role-bootstrap-receipt.v1",
    authority_manifest_sha256: authorityCatalogSha256,
    database_target_receipt_sha256: databaseTargetReceiptSha256,
    migration_catalog_sha256: migrationCatalogSha256,
    role_bootstrap_sha256: roleBootstrapSha256,
  });
}

function outlookRunReceipt({ authorityCatalogSha256,
  databaseTargetReceiptSha256, migrationCatalogSha256, roleBootstrapSha256,
}) {
  const pauseExpectation = outlookPauseExpectation({ authorityCatalogSha256,
    databaseTargetReceiptSha256, migrationCatalogSha256, roleBootstrapSha256 });
  return createOutlookAuthorityMigrationRunReceipt({
    identity: OUTLOOK_RECEIPT_IDENTITY,
    migrations: OUTLOOK_RECEIPT_MIGRATIONS,
    progress: {
      outlook_authority_replay_verified: false,
      migration_applied_count: 2,
      postgres_transaction_attempted_count: 2,
      postgres_transaction_committed_count: 2,
      role_configuration_transaction_attempted_count: 1,
      role_configuration_transaction_committed_count: 1,
      outlook_assignment_transaction_committed: true,
    },
    pauseExpectation,
    postflight: Object.freeze({
      role_bootstrap_sha256: roleBootstrapSha256,
      authority_postflight_sha256: "a".repeat(64),
    }),
  });
}

function outlookFailureReceipt({ authorityCatalogSha256,
  databaseTargetReceiptSha256, migrationCatalogSha256,
  roleBootstrapSha256 = null,
}) {
  const observed = roleBootstrapSha256 !== null;
  return createOutlookAuthorityMigrationFailureSummary({
    identity: undefined,
    migrations: observed ? [OUTLOOK_RECEIPT_MIGRATIONS[0]] : [],
    progress: {
      migration_phase: observed
        ? "outlook_authority_migration" : "before_migrations",
      migration_applied_count: observed ? 1 : 0,
      postgres_transaction_attempted_count: observed ? 2 : 0,
      postgres_transaction_committed_count: observed ? 1 : 0,
      role_configuration_transaction_attempted_count: observed ? 1 : 0,
      role_configuration_transaction_committed_count: observed ? 1 : 0,
      outlook_assignment_transaction_committed: false,
    },
    ...(observed ? {
      pauseExpectation: outlookPauseExpectation({ authorityCatalogSha256,
        databaseTargetReceiptSha256, migrationCatalogSha256,
        roleBootstrapSha256 }),
    } : {}),
    authorityManifestSha256: authorityCatalogSha256,
    databaseTargetReceiptSha256,
    migrationCatalogSha256,
    safeErrorCode: "OUTLOOK_APPLICATION_ROLE_PRECONDITION",
  });
}

function outlookRoleCommitUnknownReceipt({ authorityCatalogSha256,
  databaseTargetReceiptSha256, migrationCatalogSha256,
  roleBootstrapSha256,
}) {
  return createOutlookAuthorityMigrationFailureSummary({
    identity: OUTLOOK_RECEIPT_IDENTITY,
    migrations: [],
    progress: {
      migration_phase: "outlook_authority_paused",
      migration_applied_count: 0,
      postgres_transaction_attempted_count: 0,
      postgres_transaction_committed_count: 0,
      role_configuration_transaction_attempted_count: 1,
      role_configuration_transaction_committed_count: null,
      outlook_assignment_transaction_committed: false,
    },
    pauseExpectation: outlookPauseExpectation({ authorityCatalogSha256,
      databaseTargetReceiptSha256, migrationCatalogSha256,
      roleBootstrapSha256 }),
    authorityManifestSha256: authorityCatalogSha256,
    databaseTargetReceiptSha256,
    migrationCatalogSha256,
    safeErrorCode: "OUTLOOK_POSTGRES_COMMIT_UNKNOWN",
  });
}

function outlookPausedFailureReceipt({ authorityCatalogSha256,
  databaseTargetReceiptSha256, migrationCatalogSha256,
}) {
  return createOutlookAuthorityMigrationFailureSummary({
    identity: OUTLOOK_RECEIPT_IDENTITY,
    migrations: [],
    progress: {
      migration_phase: "outlook_authority_paused",
      migration_applied_count: 0,
      postgres_transaction_attempted_count: 0,
      postgres_transaction_committed_count: 0,
      role_configuration_transaction_attempted_count: 1,
      role_configuration_transaction_committed_count: 0,
      outlook_assignment_transaction_committed: false,
    },
    authorityManifestSha256: authorityCatalogSha256,
    databaseTargetReceiptSha256,
    migrationCatalogSha256,
    safeErrorCode: "OUTLOOK_MIGRATION_RUN_DRIFT",
  });
}

function outlookPassTerminal({
  authorization,
  claimEnvelope,
  authorityCatalogSha256,
  migrationCatalogSha256,
}) {
  const receipt = outlookRunReceipt({
    authorityCatalogSha256,
    databaseTargetReceiptSha256:
      claimEnvelope.receipt.database_target_receipt_sha256,
    migrationCatalogSha256,
    roleBootstrapSha256: "7".repeat(64),
  });
  return createJsonPostgresOutlookAuthorityTerminal({
    schema_version: JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
    status: "PASS",
    bindings: {
      operation_binding_sha256:
        claimEnvelope.receipt.operation_binding_sha256,
      claim_sha256: claimEnvelope.receipt.claim_sha256,
      packet_sha256: authorization.packet.packet_sha256,
      approval_receipt_sha256:
        claimEnvelope.receipt.approval_receipt_sha256,
      registry_sha256: claimEnvelope.receipt.registry_sha256,
      database_target_receipt_sha256:
        claimEnvelope.receipt.database_target_receipt_sha256,
      authority_catalog_sha256: authorityCatalogSha256,
      migration_catalog_sha256: migrationCatalogSha256,
      role_bootstrap_sha256: "7".repeat(64),
    },
    recorded_at: new Date(OUTLOOK_OPERATION_NOW).toISOString(),
    authorization_claim_write_attempt_count: 1,
    authorization_claim_write_committed_count: 1,
    postgres_mutation_attempt_count: 3,
    postgres_mutation_committed_count: 3,
    secretsmanager_put_secret_value_attempt_count: 3,
    secretsmanager_put_secret_value_committed_count: 3,
    production_write_count: 7,
    result: {
      outcome: "PASS",
      migration_applied_count: 2,
      role_configuration_transaction_committed_count: 1,
      outlook_database_role_count: 4,
      outlook_login_role_count: 3,
      outlook_tenant_authority_count: 6,
      outlook_membership_edge_count: 5,
      synthetic_wildcard_count: 0,
      migration_run_receipt_sha256: receipt.migration_run_receipt_sha256,
      authority_postflight_sha256: receipt.authority_postflight_sha256,
      password_returned: false,
      secret_material_returned: false,
    },
    failure: null,
    postgres_receipt: { kind: "run", receipt },
  });
}

function outlookPartialTerminal({
  authorization,
  claimEnvelope,
  authorityCatalogSha256,
  migrationCatalogSha256,
}) {
  const receipt = outlookFailureReceipt({
    authorityCatalogSha256,
    databaseTargetReceiptSha256:
      claimEnvelope.receipt.database_target_receipt_sha256,
    migrationCatalogSha256,
  });
  return createJsonPostgresOutlookAuthorityTerminal({
    schema_version: JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION,
    status: "PARTIAL",
    bindings: {
      operation_binding_sha256:
        claimEnvelope.receipt.operation_binding_sha256,
      claim_sha256: claimEnvelope.receipt.claim_sha256,
      packet_sha256: authorization.packet.packet_sha256,
      approval_receipt_sha256:
        claimEnvelope.receipt.approval_receipt_sha256,
      registry_sha256: claimEnvelope.receipt.registry_sha256,
      database_target_receipt_sha256:
        claimEnvelope.receipt.database_target_receipt_sha256,
      authority_catalog_sha256: authorityCatalogSha256,
      migration_catalog_sha256: migrationCatalogSha256,
      role_bootstrap_sha256: null,
    },
    recorded_at: new Date(OUTLOOK_OPERATION_NOW).toISOString(),
    authorization_claim_write_attempt_count: 1,
    authorization_claim_write_committed_count: 1,
    postgres_mutation_attempt_count: 0,
    postgres_mutation_committed_count: 0,
    secretsmanager_put_secret_value_attempt_count: 0,
    secretsmanager_put_secret_value_committed_count: 0,
    production_write_count: 1,
    result: null,
    failure: {
      error_code: "LAWOS_OUTLOOK_APPLICATION_ROLE_PRECONDITION",
      failure_phase: "postgres-precondition",
      post_state_sha256: receipt.failure_receipt_sha256,
    },
    postgres_receipt: { kind: "failure", receipt },
  });
}

function outlookTerminalRead(outcome, terminal) {
  return {
    outcome,
    terminal,
    terminal_sha256: jsonPostgresOutlookAuthorityTerminalSha256(terminal),
  };
}

function outlookTerminalWrite(terminal, outcome = "written") {
  return {
    outcome,
    terminal,
    terminal_sha256: jsonPostgresOutlookAuthorityTerminalSha256(terminal),
  };
}

function outlookRoleState({ oid, name, canLogin, config = [] }) {
  return {
    oid,
    name,
    can_login: canLogin,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypass_rls: false,
    connection_limit: name === "lawos_app" ? 64 : -1,
    valid_until_present: false,
    valid_until: null,
    config_count: config.length,
    config,
  };
}

function outlookRoleReadiness(migration, tenantAuthorityCount = 6) {
  const migrationAdmin = {
    ...outlookRoleState({
      oid: 16_384,
      name: "lawos_admin",
      canLogin: true,
    }),
    createdb: true,
    createrole: true,
  };
  const roles = [
    outlookRoleState({
      oid: 16_390,
      name: "lawos_app",
      canLogin: true,
      config: [
        "idle_in_transaction_session_timeout=30s",
        "lock_timeout=5s",
        "statement_timeout=30s",
      ],
    }),
    outlookRoleState({
      oid: 16_391,
      name: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      canLogin: false,
    }),
    outlookRoleState({
      oid: 16_392,
      name: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      canLogin: true,
    }),
    outlookRoleState({
      oid: 16_393,
      name: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      canLogin: true,
    }),
    outlookRoleState({
      oid: 16_394,
      name: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      canLogin: true,
    }),
  ].sort((left, right) => left.name.localeCompare(right.name));
  const bootstrapGrantor = { oid: 10, name: "bootstrap_superuser" };
  const roleBootstrap = {
    schema_version: LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION,
    postgres_major: 16,
    database: { oid: 5, name: "lawos" },
    migration,
    schema_owners: {
      lawos_email_dms: { oid: migrationAdmin.oid, name: migrationAdmin.name },
      lawos_meta: { oid: migrationAdmin.oid, name: migrationAdmin.name },
    },
    migration_admin: migrationAdmin,
    bootstrap_grantor: bootstrapGrantor,
    roles,
    memberships: roles
      .filter(({ name }) => name !== "lawos_app")
      .map((role) => ({
        granted_role: { oid: role.oid, name: role.name },
        member: { oid: migrationAdmin.oid, name: migrationAdmin.name },
        grantor: bootstrapGrantor,
        admin_option: true,
        inherit_option: false,
        set_option: false,
      })),
  };
  return {
    schema_version: "law-firm-os.outlook-role-readiness.v2",
    role_count: 4,
    login_role_count: 3,
    tenant_authority_count: tenantAuthorityCount,
    membership_edge_count: 4,
    protected_membership_edge_count: 4,
    application_membership_edge_count: 0,
    synthetic_wildcard_count: 0,
    role_bootstrap: roleBootstrap,
    role_bootstrap_sha256: lawosOutlookRoleBootstrapDigest(roleBootstrap),
    password_returned: false,
    secret_material_returned: false,
  };
}

function syntheticOutlookFunctionProtection(identity) {
  return {
    language: "plpgsql",
    security_definer: true,
    configuration: ["search_path=pg_catalog"],
    body_sha256: createHash("sha256")
      .update(`synthetic:${identity}`)
      .digest("hex"),
  };
}

function syntheticOutlookAuthorityCatalog() {
  return {
    schema_version: "law-firm-os.outlook-authority-catalog.v1",
    catalog_id: "synthetic-email-dms-007",
    target_schema: "lawos_outlook_test",
    schemas: [{
      regnamespace: "lawos_outlook_test",
      owner: "lawos_outlook_authority_owner",
      grants: {
        lawos_outlook_authority_owner: [
          { privilege: "CREATE", grantable: false },
          { privilege: "USAGE", grantable: false },
        ],
        lawos_outlook_control_operator: [{
          privilege: "USAGE",
          grantable: false,
        }],
        lawos_outlook_assignment_worker: [{
          privilege: "USAGE",
          grantable: false,
        }],
        lawos_outlook_lifecycle_verifier: [{
          privilege: "USAGE",
          grantable: false,
        }],
        lawos_app: [{ privilege: "USAGE", grantable: false }],
      },
    }],
    tables: [{
      regclass: "lawos_outlook_test.lifecycle_receipts",
      regnamespace: "lawos_outlook_test",
      owner: "lawos_outlook_authority_owner",
      row_security: true,
      force_row_security: true,
      policies: [{
        name: "lifecycle_receipts_tenant_policy",
        permissive: true,
        command: "ALL",
        roles: ["public"],
        using_expression: "true",
        check_expression: "true",
      }],
      grants: {
        lawos_outlook_authority_owner: [
          "DELETE",
          "INSERT",
          "REFERENCES",
          "SELECT",
          "TRIGGER",
          "TRUNCATE",
          "UPDATE",
        ].map((privilege) => ({ privilege, grantable: false })),
      },
    }],
    functions: [{
      regprocedure: "lawos_outlook_test.claim_assignment(text)",
      regnamespace: "lawos_outlook_test",
      owner: "lawos_outlook_authority_owner",
      ...syntheticOutlookFunctionProtection("claim_assignment(text)"),
      grants: {
        lawos_outlook_authority_owner: [{
          privilege: "EXECUTE",
          grantable: true,
        }],
        lawos_outlook_assignment_worker: [{
          privilege: "EXECUTE",
          grantable: false,
        }],
      },
    }, {
      regprocedure: "lawos_outlook_test.consume_lifecycle_receipt(text)",
      regnamespace: "lawos_outlook_test",
      owner: "lawos_outlook_authority_owner",
      ...syntheticOutlookFunctionProtection(
        "consume_lifecycle_receipt(text)",
      ),
      grants: {
        lawos_outlook_authority_owner: [{
          privilege: "EXECUTE",
          grantable: true,
        }],
        lawos_app: [{ privilege: "EXECUTE", grantable: false }],
      },
    }, {
      regprocedure: "lawos_outlook_test.mint_lifecycle_receipt(text)",
      regnamespace: "lawos_outlook_test",
      owner: "lawos_outlook_authority_owner",
      ...syntheticOutlookFunctionProtection("mint_lifecycle_receipt(text)"),
      grants: {
        lawos_outlook_authority_owner: [{
          privilege: "EXECUTE",
          grantable: true,
        }],
        lawos_outlook_lifecycle_verifier: [{
          privilege: "EXECUTE",
          grantable: false,
        }],
      },
    }],
  };
}

function outlookSecretValues({
  controlUsername = "lawos_outlook_control_operator",
  assignmentUsername = "lawos_outlook_assignment_worker",
  lifecycleUsername = "lawos_outlook_lifecycle_verifier",
  controlPassword = "outlook-control-password",
  assignmentPassword = "outlook-assignment-password",
  lifecyclePassword = "outlook-lifecycle-password",
} = {}) {
  return new Map([
    ["lawos/master", { username: "master", password: "master-value" }],
    ["lawos/application", {
      username: "lawos_app",
      password: "application-value",
    }],
    ["lawos/tenant-context", {
      tenant_context_secret: "tenant-context-value-at-least-32-bytes",
    }],
    ["lawos/outlook-control", {
      username: controlUsername,
      password: controlPassword,
    }],
    ["lawos/outlook-assignment", {
      username: assignmentUsername,
      password: assignmentPassword,
    }],
    ["lawos/outlook-lifecycle-verifier", {
      username: lifecycleUsername,
      password: lifecyclePassword,
    }],
  ]);
}

function syntheticOutlookVerification({ catalog, phase, roleBootstrap }) {
  const objectCount = catalog.schemas.length
    + catalog.tables.length
    + catalog.functions.length;
  return {
    outcome: "PASS",
    phase,
    catalog_sha256: catalog.catalog_sha256,
    role_bootstrap_sha256: roleBootstrap.role_bootstrap_sha256,
    verified_schema_count:
      phase === "post-migration" ? catalog.schemas.length : 0,
    verified_table_count:
      phase === "post-migration" ? catalog.tables.length : 0,
    verified_function_count:
      phase === "post-migration" ? catalog.functions.length : 0,
    missing_schema_count:
      phase === "post-migration" ? 0 : catalog.schemas.length,
    missing_table_count:
      phase === "post-migration" ? 0 : catalog.tables.length,
    missing_function_count:
      phase === "post-migration" ? 0 : catalog.functions.length,
    missing_object_count: phase === "post-migration" ? 0 : objectCount,
    unknown_owned_object_count: 0,
    secret_material_returned: false,
  };
}

function syntheticOutlookMigrationCatalog({
  catalogSha256 = "9".repeat(64),
} = {}) {
  return {
    catalog_sha256: catalogSha256,
    catalog_id: "synthetic-email-dms-007",
    schema_version: "lawos.email-dms.synthetic-007.v1",
    target_schema: "lawos_email_dms",
  };
}

function outlookCommitBoundary({ authorityCatalog, migrationCatalog }) {
  return {
    outlookAuthorityManifestSha256: authorityCatalog.catalog_sha256,
    outlookMigrationCatalog: migrationCatalog,
    normalizeOutlookMigrationCatalog: (value) =>
      Object.freeze({ migration_catalog_sha256: value.catalog_sha256 }),
    createOutlookMigrationAdapter: () =>
      assert.fail("synthetic commit boundary must not create an adapter"),
    runOutlookAuthorityMigrations: async () =>
      assert.fail("synthetic commit boundary must not reach PostgreSQL"),
  };
}

function syntheticFreshOutlookHarness({
  applicationPreconditionError = null,
  postflightError = null,
  putFailureAt = null,
  putFailureReadback = "absent",
  credentialOverrides = {},
  clientDriftPhase = null,
} = {}) {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const migration = {
    catalog_id: migrationCatalog.catalog_id,
    schema_version: migrationCatalog.schema_version,
    target_schema: migrationCatalog.target_schema,
  };
  const readiness = outlookRoleReadiness(migration);
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  const claimEnvelope = outlookClaimEnvelope({ outcome: "claimed" });
  const secrets = new Map([
    [authorization.packet.target.database_secret_ref, {
      username: "lawos_admin",
      password: "master-value",
      host: authorization.databaseTargetReceipt.endpoint_host,
      port: authorization.databaseTargetReceipt.endpoint_port,
      dbname: authorization.databaseTargetReceipt.database_name,
      ...credentialOverrides.master,
    }],
    ["lawos/tenant-context", {
      tenant_context_secret: "tenant-context-value-at-least-32-bytes",
      ...credentialOverrides.tenantContext,
    }],
    ["lawos/outlook-control", {
      username: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      password: "outlook-control-password",
      ...credentialOverrides.control,
    }],
    ["lawos/outlook-assignment", {
      username: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      password: "outlook-assignment-password",
      ...credentialOverrides.assignment,
    }],
    ["lawos/outlook-lifecycle-verifier", {
      username: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      password: "outlook-lifecycle-password",
      ...credentialOverrides.lifecycle,
    }],
  ]);
  const sameClient = { query: async () => ({ rows: [], rowCount: 0 }) };
  const driftedClient = { query: async () => ({ rows: [], rowCount: 0 }) };
  const pool = { async end() { calls.push("pool:end"); } };
  let poolOptions;
  const terminalWrites = [];
  const secretWrites = [];
  let roleObserved = false;
  let writeIndex = 0;
  const options = {
    event: outlookOperationEvent(),
    env: outlookCommitEnv(),
    now: OUTLOOK_OPERATION_NOW,
    authorize: async () => authorization,
    claim: async () => claimEnvelope,
    ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
    createOutlookMigrationAdapter: (input) => {
      let callbackClient = null;
      let callbackPhase = "before";
      const drift = () => Object.assign(
        new Error("synthetic Outlook migration callback drift"),
        { code: "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT" },
      );
      return Object.freeze({
        runnerOptions: Object.freeze({
          authorityManifestSha256: input.authorityManifestSha256,
          databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
          migrationCatalogSha256: input.migrationCatalogSha256,
          async onBeforeMigrations(client, closedCatalog) {
            if (callbackPhase !== "before"
              || closedCatalog !== migrationCatalog) throw drift();
            callbackClient = client;
            if (applicationPreconditionError) throw applicationPreconditionError;
            callbackPhase = "paused";
          },
          async onOutlookAuthorityPaused(client, closedCatalog) {
            if (callbackPhase !== "paused" || client !== callbackClient
              || closedCatalog !== migrationCatalog) throw drift();
            roleObserved = true;
            callbackPhase = "post-migration";
            return readiness;
          },
          async onOutlookAuthorityPostMigration(client, closedCatalog) {
            if (callbackPhase !== "post-migration" || client !== callbackClient
              || closedCatalog !== migrationCatalog) throw drift();
            if (postflightError) throw postflightError;
            callbackPhase = "complete";
            return syntheticOutlookVerification({
              catalog: authorityCatalog,
              phase: "post-migration",
              roleBootstrap: readiness,
            });
          },
        }),
        normalizeRunReceipt(value) {
          if (callbackPhase !== "complete") throw drift();
          return value;
        },
        normalizeFailureReceipt() {
          if (callbackPhase === "paused" && !roleObserved) {
            return outlookPausedFailureReceipt({
              authorityCatalogSha256: authorityCatalog.catalog_sha256,
              databaseTargetReceiptSha256:
                authorization.database_target_receipt_sha256,
              migrationCatalogSha256: migrationCatalog.catalog_sha256,
            });
          }
          return outlookFailureReceipt({
            authorityCatalogSha256: authorityCatalog.catalog_sha256,
            databaseTargetReceiptSha256:
              authorization.database_target_receipt_sha256,
            migrationCatalogSha256: migrationCatalog.catalog_sha256,
            roleBootstrapSha256:
              roleObserved ? readiness.role_bootstrap_sha256 : null,
          });
        },
        getRoleReadiness() {
          if (callbackPhase !== "complete") throw drift();
          return readiness;
        },
        dispose() { input.tenantContextSecret.fill(0); },
      });
    },
    runOutlookAuthorityMigrations: async (_pool, callbacks) => {
      assert.equal(_pool, pool);
      await callbacks.onBeforeMigrations(sameClient, migrationCatalog);
      await callbacks.onOutlookAuthorityPaused(
        clientDriftPhase === "paused" ? driftedClient : sameClient,
        migrationCatalog,
      );
      await callbacks.onOutlookAuthorityPostMigration(
        clientDriftPhase === "post-migration" ? driftedClient : sameClient,
        migrationCatalog,
      );
      return outlookRunReceipt({
        authorityCatalogSha256: authorityCatalog.catalog_sha256,
        databaseTargetReceiptSha256:
          authorization.database_target_receipt_sha256,
        migrationCatalogSha256: migrationCatalog.catalog_sha256,
        roleBootstrapSha256: readiness.role_bootstrap_sha256,
      });
    },
    readOutlookTerminal: async () => ({ outcome: "absent" }),
    writeOutlookTerminal: async ({ terminal }) => {
      terminalWrites.push(terminal);
      return outlookTerminalWrite(terminal);
    },
    resolveSecret: async ({ secretId }) => {
      calls.push(`read:${secretId}`);
      assert.notEqual(secretId, "lawos/application");
      assert.ok(secrets.has(secretId));
      return secrets.get(secretId);
    },
    putSecret: async ({ secretId, secretString, clientRequestToken }) => {
      calls.push(`write:${secretId}`);
      secretWrites.push({
        secretId,
        secretString,
        clientRequestToken,
        value: JSON.parse(secretString),
      });
      const currentIndex = writeIndex;
      writeIndex += 1;
      if (currentIndex === putFailureAt) {
        throw Object.assign(new Error("synthetic secret publication failure"), {
          code: "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED",
        });
      }
      return {
        ARN: outlookSecretArn(secretId),
        VersionId: clientRequestToken,
        VersionStages: ["AWSCURRENT"],
      };
    },
    getSecret: async ({ secretId, versionId }) => {
      if (putFailureReadback === "absent") {
        throw Object.assign(new Error("synthetic secret version absent"), {
          name: "ResourceNotFoundException",
        });
      }
      if (putFailureReadback === "unavailable") {
        throw new Error("synthetic secret readback unavailable");
      }
      const attempted = secretWrites.findLast(
        (write) => write.secretId === secretId,
      );
      assert.ok(attempted);
      return {
        ARN: outlookSecretArn(secretId),
        VersionId: putFailureReadback === "wrong-version"
          ? "f".repeat(64)
          : (versionId ?? attempted.clientRequestToken),
        VersionStages: ["AWSCURRENT"],
        SecretString: putFailureReadback === "wrong-bytes"
          ? `${attempted.secretString} `
          : attempted.secretString,
      };
    },
    createPool: (value) => {
      poolOptions = value;
      return pool;
    },
  };
  return {
    options,
    authorityCatalog,
    migrationCatalog,
    authorization,
    claimEnvelope,
    readiness,
    calls,
    terminalWrites,
    secretWrites,
    poolOptions: () => poolOptions,
  };
}

test("Outlook commit validates the exact event before authorization or access", async () => {
  const calls = [];
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: { ...outlookOperationEvent(), unexpected: true },
      env: outlookCommitEnv(),
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => {
        calls.push("authorize");
        return boundOutlookOperationAuthorization();
      },
      claim: async () => {
        calls.push("claim");
        return outlookClaimEnvelope();
      },
      resolveSecret: async () => calls.push("secret"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
  );
  assert.deepEqual(calls, []);
});

test("Outlook commit binds the normalized authority catalog before claim access", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog({
    catalogSha256: OFFICIAL_MIGRATION_CATALOG_SHA256,
  });
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        migration_catalog_sha256: OFFICIAL_MIGRATION_CATALOG_SHA256,
        authority_manifest_sha256: "0".repeat(64),
      },
    },
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: outlookOperationEvent(),
      env: outlookCommitEnv(),
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => authorization,
      claim: async () => {
        calls.push("claim");
        return outlookClaimEnvelope();
      },
      ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
      resolveSecret: async () => calls.push("secret"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
  );
  assert.deepEqual(calls, []);
});

test("Outlook commit rejects incomplete, duplicate, or reserved role secret ids before claim", async () => {
  for (const localEnv of [
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID: "",
      LAWOS_OUTLOOK_ASSIGNMENT_DATABASE_SECRET_ID: "",
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID: "",
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_ASSIGNMENT_DATABASE_SECRET_ID: "",
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID:
        "lawos/outlook-assignment",
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID: "lawos/application",
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_ASSIGNMENT_DATABASE_SECRET_ID:
        outlookCommitEnv().LAWOS_MASTER_DATABASE_SECRET_ID,
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID:
        outlookSecretArn("lawos/application"),
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID:
        "lawos/tenant-context",
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID: "lawos/outlook!invalid",
    },
    {
      ...outlookCommitEnv(),
      LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID: {
        toString: () => "lawos/outlook-control",
      },
    },
  ]) {
    const calls = [];
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase({
        event: outlookOperationEvent(),
        env: localEnv,
        now: OUTLOOK_OPERATION_NOW,
        authorize: async () => {
          calls.push("authorize");
          return boundOutlookOperationAuthorization();
        },
        claim: async () => calls.push("claim"),
        resolveSecret: async () => calls.push("secret"),
        createPool: () => calls.push("database"),
      }),
      (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_SECRET_IDS",
    );
    assert.deepEqual(calls, ["authorize"]);
  }
});

test("Outlook commit binds the normalized migration catalog before claim access", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: "0".repeat(64),
      },
    },
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: outlookOperationEvent(),
      env: outlookCommitEnv(),
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => authorization,
      claim: async () => {
        calls.push("claim");
        return outlookClaimEnvelope();
      },
      ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
      resolveSecret: async () => calls.push("secret"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG",
  );
  assert.deepEqual(calls, []);
});

test("Outlook commit rejects a forged claim envelope before secret or database access", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: outlookOperationEvent(),
      env: outlookCommitEnv(),
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => authorization,
      claim: async () => {
        calls.push("claim");
        const envelope = outlookClaimEnvelope({ outcome: "claimed" });
        delete envelope.receipt.request_sha256;
        return envelope;
      },
      ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
      resolveSecret: async () => calls.push("secret"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CLAIM_BINDING",
  );
  assert.deepEqual(calls, ["claim"]);
});

test("Outlook commit rejects claim database-target drift before secret or database access", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: outlookOperationEvent(),
      env: outlookCommitEnv(),
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => authorization,
      claim: async () => {
        calls.push("claim");
        const envelope = outlookClaimEnvelope({ outcome: "claimed" });
        envelope.receipt.database_target_receipt_sha256 = "0".repeat(64);
        return envelope;
      },
      ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
      resolveSecret: async () => calls.push("secret"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CLAIM_BINDING",
  );
  assert.deepEqual(calls, ["claim"]);
});

test("Outlook commit binds the master secret ref before claim access", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: outlookOperationEvent(),
      env: {
        ...outlookCommitEnv(),
        LAWOS_MASTER_DATABASE_SECRET_ID: "wrong-master-secret",
      },
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => authorization,
      claim: async () => {
        calls.push("claim");
        return outlookClaimEnvelope();
      },
      ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
      resolveSecret: async () => calls.push("secret"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
  );
  assert.deepEqual(calls, []);
});

test("Outlook commit binds runtime host, port, and database to the signed target before claim", async () => {
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  for (const override of [
    { LAWOS_DATABASE_HOST: "wrong.example.rds.amazonaws.com" },
    { LAWOS_DATABASE_PORT: "6432" },
    { LAWOS_DATABASE_NAME: "wrong_database" },
  ]) {
    const calls = [];
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase({
        event: outlookOperationEvent(),
        env: { ...outlookCommitEnv(), ...override },
        now: OUTLOOK_OPERATION_NOW,
        authorize: async () => {
          calls.push("authorize");
          return authorization;
        },
        claim: async () => calls.push("claim"),
        ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
        resolveSecret: async () => calls.push("secret"),
        createPool: () => calls.push("database"),
      }),
      (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_TARGET",
    );
    assert.deepEqual(calls, ["authorize"]);
  }
});

test("Outlook commit binds resolved master host, port, database, and username before pool creation", async () => {
  for (const master of [
    { host: "wrong.example.rds.amazonaws.com" },
    { port: 6432 },
    { dbname: "wrong_database" },
    { username: "wrong_admin" },
  ]) {
    const harness = syntheticFreshOutlookHarness({
      credentialOverrides: { master },
    });
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase(harness.options),
      (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_TARGET",
    );
    assert.equal(harness.poolOptions(), undefined);
    assert.deepEqual(harness.calls, [
      `read:${harness.authorization.packet.target.database_secret_ref}`,
    ]);
    assert.equal(harness.terminalWrites.length, 1);
    assert.equal(harness.terminalWrites[0].status, "PARTIAL");
    assert.equal(
      harness.terminalWrites[0].bindings.database_target_receipt_sha256,
      harness.authorization.database_target_receipt_sha256,
    );
  }
});

test("Outlook exact claim replay returns immutable PASS with zero database or secret mutation", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  const claimEnvelope = outlookClaimEnvelope({
    outcome: "replayed",
    attempted: false,
  });
  const terminal = outlookPassTerminal({
    authorization,
    claimEnvelope,
    authorityCatalogSha256: authorityCatalog.catalog_sha256,
    migrationCatalogSha256: migrationCatalog.catalog_sha256,
  });
  const result = await bootstrapJsonPostgresProductionDatabase({
    event: outlookOperationEvent(),
    env: outlookCommitEnv(),
    now: OUTLOOK_OPERATION_NOW,
    authorize: async () => {
      calls.push("authorize");
      return authorization;
    },
    claim: async () => {
      calls.push("claim");
      return claimEnvelope;
    },
    ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
    readOutlookTerminal: async () => {
      calls.push("terminal:read");
      return outlookTerminalRead("pass", terminal);
    },
    resolveSecret: async () => calls.push("secret"),
    putSecret: async () => calls.push("secret:write"),
    createPool: () => calls.push("database"),
  });
  assert.deepEqual(calls, ["authorize", "claim", "terminal:read"]);
  assert.deepEqual(Object.keys(result).sort(), [
    "authorization_claim_write_attempt_count",
    "authorization_claim_write_committed_count",
    "operation_binding_sha256",
    "outcome",
    "postgres_mutation_attempt_count",
    "postgres_mutation_committed_count",
    "postgres_receipt",
    "production_write_count",
    "replay_receipt_sha256",
    "secretsmanager_put_secret_value_attempt_count",
    "secretsmanager_put_secret_value_committed_count",
    "terminal_sha256",
    "terminal_state",
  ]);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.operation_binding_sha256, authorization.operation_binding_sha256);
  assert.equal(result.authorization_claim_write_attempt_count, 0);
  assert.equal(result.authorization_claim_write_committed_count, 0);
  assert.equal(result.postgres_mutation_attempt_count, 0);
  assert.equal(result.postgres_mutation_committed_count, 0);
  assert.equal(result.secretsmanager_put_secret_value_attempt_count, 0);
  assert.equal(result.secretsmanager_put_secret_value_committed_count, 0);
  assert.equal(result.production_write_count, 0);
  assert.match(result.replay_receipt_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(result.terminal_state, "PASS");
  assert.equal(
    result.terminal_sha256,
    jsonPostgresOutlookAuthorityTerminalSha256(terminal),
  );
  assert.deepEqual(result.postgres_receipt, {
    kind: "run",
    receipt_sha256: terminal.result.migration_run_receipt_sha256,
  });
  assert.equal(JSON.stringify(result).includes("password"), false);
});

test("Outlook replay rejects a forged terminal digest before database or secret access", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  const claimEnvelope = outlookClaimEnvelope({
    outcome: "replayed",
    attempted: false,
  });
  const terminal = outlookPassTerminal({
    authorization,
    claimEnvelope,
    authorityCatalogSha256: authorityCatalog.catalog_sha256,
    migrationCatalogSha256: migrationCatalog.catalog_sha256,
  });
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: outlookOperationEvent(),
      env: outlookCommitEnv(),
      now: OUTLOOK_OPERATION_NOW,
      authorize: async () => authorization,
      claim: async () => claimEnvelope,
      ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
      readOutlookTerminal: async () => ({
        outcome: "pass",
        terminal,
        terminal_sha256: "0".repeat(64),
      }),
      resolveSecret: async () => calls.push("secret"),
      putSecret: async () => calls.push("secret:write"),
      createPool: () => calls.push("database"),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
  );
  assert.deepEqual(calls, []);
});

test("Outlook claim replay requires recovery for absent or PARTIAL terminal evidence", async () => {
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = syntheticOutlookMigrationCatalog();
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  const claimEnvelope = outlookClaimEnvelope({ outcome: "replayed" });
  const partial = outlookPartialTerminal({
    authorization,
    claimEnvelope,
    authorityCatalogSha256: authorityCatalog.catalog_sha256,
    migrationCatalogSha256: migrationCatalog.catalog_sha256,
  });
  for (const terminalRead of [
    { outcome: "absent" },
    outlookTerminalRead("partial", partial),
  ]) {
    const calls = [];
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase({
        event: outlookOperationEvent(),
        env: outlookCommitEnv(),
        now: OUTLOOK_OPERATION_NOW,
        authorize: async () => {
          calls.push("authorize");
          return authorization;
        },
        claim: async () => {
          calls.push("claim");
          return claimEnvelope;
        },
        ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
        readOutlookTerminal: async () => {
          calls.push("terminal:read");
          return terminalRead;
        },
        resolveSecret: async () => calls.push("secret"),
        putSecret: async () => calls.push("secret:write"),
        createPool: () => calls.push("database"),
      }),
      (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_RECOVERY_REQUIRED",
    );
    assert.deepEqual(calls, ["authorize", "claim", "terminal:read"]);
  }
});

test("Outlook fresh claim records terminal-read PARTIAL before any credential or database access", async () => {
  const harness = syntheticFreshOutlookHarness();
  const denied = Object.assign(new Error("must-not-return"), {
    name: "AccessDeniedException",
  });
  harness.options.readOutlookTerminal = async () => {
    throw denied;
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(harness.options),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_READ_ACCESS_DENIED"
      && !error.message.includes("must-not-return"),
  );
  assert.deepEqual(harness.calls, []);
  assert.equal(harness.secretWrites.length, 0);
  assert.equal(harness.terminalWrites.length, 1);
  const [terminal] = harness.terminalWrites;
  assert.equal(terminal.status, "PARTIAL");
  assert.equal(terminal.bindings.role_bootstrap_sha256, null);
  assert.equal(terminal.failure.failure_phase, "terminal-read");
  assert.equal(
    terminal.failure.error_code,
    "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_READ_ACCESS_DENIED",
  );
  assert.equal(terminal.failure.post_state_sha256, null);
  assert.equal(terminal.authorization_claim_write_attempt_count, 1);
  assert.equal(terminal.authorization_claim_write_committed_count, 1);
  assert.equal(terminal.postgres_mutation_attempt_count, 0);
  assert.equal(terminal.postgres_mutation_committed_count, 0);
  assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 0);
  assert.equal(terminal.secretsmanager_put_secret_value_committed_count, 0);
  assert.equal(terminal.production_write_count, 1);
});

test("Outlook terminal read fails closed on bucket and generic 404 errors", async () => {
  for (const failure of [
    Object.assign(new Error("missing bucket"), { name: "NoSuchBucket",
      $metadata: { httpStatusCode: 404 } }),
    Object.assign(new Error("generic 404"), {
      $metadata: { httpStatusCode: 404 } }),
  ]) {
    const harness = syntheticFreshOutlookHarness();
    harness.options.readOutlookTerminal = async () => { throw failure; };
    harness.options.writeOutlookTerminal = async () => { throw failure; };
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase(harness.options),
      (error) => error === failure,
    );
    assert.deepEqual(harness.calls, []);
    assert.equal(harness.secretWrites.length, 0);
    assert.equal(harness.poolOptions(), undefined);
  }
});

test("Outlook secret access denial records a terminal-safe credential PARTIAL", async () => {
  const harness = syntheticFreshOutlookHarness();
  const denied = Object.assign(new Error("must-not-return"), {
    name: "AccessDeniedException",
  });
  harness.options.resolveSecret = async ({ secretId }) => {
    harness.calls.push(`read:${secretId}`);
    throw denied;
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(harness.options),
    (error) => error?.code === "LAWOS_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED"
      && !error.message.includes("must-not-return"),
  );
  assert.equal(harness.secretWrites.length, 0);
  assert.equal(harness.terminalWrites.length, 1);
  const [terminal] = harness.terminalWrites;
  assert.equal(terminal.status, "PARTIAL");
  assert.equal(terminal.failure.failure_phase, "credential-input");
  assert.equal(
    terminal.failure.error_code,
    "LAWOS_OUTLOOK_AUTHORITY_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED",
  );
  assert.equal(terminal.postgres_receipt, null);
  assert.equal(terminal.postgres_mutation_attempt_count, 0);
  assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 0);
  assert.equal(terminal.production_write_count, 1);
});

test("Outlook fresh commit keeps one client through three phases and publishes only three role secrets", async () => {
  const calls = [];
  const authorityCatalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticOutlookAuthorityCatalog(),
  );
  const migrationCatalog = {
    catalog_sha256: "9".repeat(64),
    catalog_id: "synthetic-email-dms-007",
    schema_version: "lawos.email-dms.synthetic-007.v1",
    target_schema: "lawos_email_dms",
  };
  const migration = {
    catalog_id: migrationCatalog.catalog_id,
    schema_version: migrationCatalog.schema_version,
    target_schema: migrationCatalog.target_schema,
  };
  const readiness = outlookRoleReadiness(migration);
  const signed = boundOutlookOperationAuthorization();
  const authorization = {
    ...signed,
    packet: {
      ...signed.packet,
      bindings: {
        ...signed.packet.bindings,
        authority_manifest_sha256: authorityCatalog.catalog_sha256,
        migration_catalog_sha256: migrationCatalog.catalog_sha256,
      },
    },
  };
  const claimEnvelope = outlookClaimEnvelope({ outcome: "claimed" });
  const secrets = new Map([
    [authorization.packet.target.database_secret_ref, {
      username: "lawos_admin",
      password: "master-value",
      host: authorization.databaseTargetReceipt.endpoint_host,
      port: authorization.databaseTargetReceipt.endpoint_port,
      dbname: authorization.databaseTargetReceipt.database_name,
    }],
    ["lawos/tenant-context", {
      tenant_context_secret: "tenant-context-value-at-least-32-bytes",
    }],
    ["lawos/outlook-control", {
      username: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      password: "outlook-control-password",
    }],
    ["lawos/outlook-assignment", {
      username: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      password: "outlook-assignment-password",
    }],
    ["lawos/outlook-lifecycle-verifier", {
      username: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      password: "outlook-lifecycle-password",
    }],
  ]);
  const roleWrites = [];
  const sameClient = { query: async () => ({ rows: [], rowCount: 0 }) };
  const pool = { async end() { calls.push("pool:end"); } };
  let terminalWritten;
  const result = await bootstrapJsonPostgresProductionDatabase({
    event: outlookOperationEvent(),
    env: outlookCommitEnv(),
    now: OUTLOOK_OPERATION_NOW,
    authorize: async () => {
      calls.push("authorize");
      return authorization;
    },
    claim: async () => {
      calls.push("claim");
      return claimEnvelope;
    },
    ...outlookCommitBoundary({ authorityCatalog, migrationCatalog }),
    createOutlookMigrationAdapter: (input) => {
      let phase = "before";
      return Object.freeze({
        runnerOptions: Object.freeze({
          authorityManifestSha256: input.authorityManifestSha256,
          databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
          migrationCatalogSha256: input.migrationCatalogSha256,
          async onBeforeMigrations(client) {
            assert.equal(phase, "before");
            assert.equal(client, sameClient);
            calls.push("app-precondition", "authority-precondition");
            phase = "paused";
          },
          async onOutlookAuthorityPaused(client) {
            assert.equal(phase, "paused");
            assert.equal(client, sameClient);
            assert.equal(input.controlPassword, "outlook-control-password");
            assert.equal(input.assignmentPassword,
              "outlook-assignment-password");
            assert.equal(input.lifecycleVerifierPassword,
              "outlook-lifecycle-password");
            calls.push("roles:configure", "authority:pre-migration");
            phase = "post-migration";
            return readiness;
          },
          async onOutlookAuthorityPostMigration(client) {
            assert.equal(phase, "post-migration");
            assert.equal(client, sameClient);
            calls.push("roles:verify", "authority:post-migration");
            phase = "complete";
            return syntheticOutlookVerification({
              catalog: authorityCatalog,
              phase: "post-migration",
              roleBootstrap: readiness,
            });
          },
        }),
        normalizeRunReceipt(value) {
          assert.equal(phase, "complete");
          return value;
        },
        normalizeFailureReceipt: () =>
          assert.fail("successful migration run has no failure summary"),
        getRoleReadiness: () => readiness,
        dispose() { input.tenantContextSecret.fill(0); },
      });
    },
    runOutlookAuthorityMigrations: async (_pool, options) => {
      calls.push("runner:start");
      assert.equal(_pool, pool);
      assert.deepEqual(Object.keys(options).sort(), [
        "appliedBy", "authorityManifestSha256",
        "databaseTargetReceiptSha256", "migrationCatalogSha256",
        "onBeforeMigrations", "onOutlookAuthorityPaused",
        "onOutlookAuthorityPostMigration",
      ].sort());
      await options.onBeforeMigrations(sameClient, migrationCatalog);
      await options.onOutlookAuthorityPaused(sameClient, migrationCatalog);
      await options.onOutlookAuthorityPostMigration(
        sameClient,
        migrationCatalog,
      );
      return outlookRunReceipt({
        authorityCatalogSha256: authorityCatalog.catalog_sha256,
        databaseTargetReceiptSha256:
          authorization.database_target_receipt_sha256,
        migrationCatalogSha256: migrationCatalog.catalog_sha256,
        roleBootstrapSha256: readiness.role_bootstrap_sha256,
      });
    },
    readOutlookTerminal: async () => {
      calls.push("terminal:read");
      return { outcome: "absent" };
    },
    writeOutlookTerminal: async ({ terminal }) => {
      calls.push("terminal:write");
      terminalWritten = terminal;
      return outlookTerminalWrite(terminal);
    },
    resolveSecret: async ({ secretId }) => {
      calls.push(`read:${secretId}`);
      assert.notEqual(secretId, "lawos/application");
      assert.ok(secrets.has(secretId));
      return secrets.get(secretId);
    },
    putSecret: async ({ secretId, secretString, clientRequestToken }) => {
      calls.push(`write:${secretId}`);
      assert.notEqual(secretId, "lawos/application");
      roleWrites.push({ secretId, value: JSON.parse(secretString) });
      return {
        ARN: outlookSecretArn(secretId),
        VersionId: clientRequestToken,
        VersionStages: ["AWSCURRENT"],
      };
    },
    getSecret: async () => assert.fail("successful Put must not read back"),
    createPool: () => {
      calls.push("pool:create");
      return pool;
    },
  });
  assert.deepEqual(roleWrites.map(({ secretId }) => secretId), [
    "lawos/outlook-control",
    "lawos/outlook-assignment",
    "lawos/outlook-lifecycle-verifier",
  ]);
  assert.deepEqual(roleWrites.map(({ value }) => value.username), [
    LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
    LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
    LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
  ]);
  assert.deepEqual(calls, [
    "authorize",
    "claim",
    "terminal:read",
    `read:${authorization.packet.target.database_secret_ref}`,
    "read:lawos/tenant-context",
    "read:lawos/outlook-control",
    "read:lawos/outlook-assignment",
    "read:lawos/outlook-lifecycle-verifier",
    "pool:create",
    "runner:start",
    "app-precondition",
    "authority-precondition",
    "roles:configure",
    "authority:pre-migration",
    "roles:verify",
    "authority:post-migration",
    "write:lawos/outlook-control",
    "write:lawos/outlook-assignment",
    "write:lawos/outlook-lifecycle-verifier",
    "terminal:write",
    "pool:end",
  ]);
  assert.equal(terminalWritten.status, "PASS");
  assert.deepEqual(Object.keys(result).sort(), [
    "authorization_claim_write_attempt_count",
    "authorization_claim_write_committed_count",
    "operation_binding_sha256",
    "outcome",
    "postgres_mutation_attempt_count",
    "postgres_mutation_committed_count",
    "postgres_receipt",
    "production_write_count",
    "replay_receipt_sha256",
    "secretsmanager_put_secret_value_attempt_count",
    "secretsmanager_put_secret_value_committed_count",
    "terminal_sha256",
    "terminal_state",
  ]);
  assert.equal(result.authorization_claim_write_attempt_count, 1);
  assert.equal(result.authorization_claim_write_committed_count, 1);
  assert.equal(result.postgres_mutation_attempt_count, 3);
  assert.equal(result.postgres_mutation_committed_count, 3);
  assert.equal(result.secretsmanager_put_secret_value_attempt_count, 3);
  assert.equal(result.secretsmanager_put_secret_value_committed_count, 3);
  assert.equal(result.production_write_count, 7);
  assert.equal(result.operation_binding_sha256,
    authorization.operation_binding_sha256);
  assert.equal(result.terminal_state, "PASS");
  assert.equal(result.terminal_sha256,
    jsonPostgresOutlookAuthorityTerminalSha256(terminalWritten));
  assert.deepEqual(result.postgres_receipt, {
    kind: "run",
    receipt_sha256:
      terminalWritten.postgres_receipt.receipt.migration_run_receipt_sha256,
  });
  assert.equal(result.replay_receipt_sha256, null);
  assert.equal(JSON.stringify(result).includes("master-value"), false);
  assert.equal(JSON.stringify(result).includes("outlook-control-password"), false);
});

test("Outlook commit delegates only canonical adapter runner options and zeroizes the caller Buffer", async () => {
  const harness = syntheticFreshOutlookHarness();
  const rawRun = Object.freeze({ synthetic: "raw-run" });
  let adapterInput;
  let disposeCount = 0;
  let normalizeCount = 0;
  const callbacks = Object.freeze({
    onBeforeMigrations: async () => {},
    onOutlookAuthorityPaused: async () => {},
    onOutlookAuthorityPostMigration: async () => {},
  });
  harness.options.createOutlookMigrationAdapter = (input) => {
    adapterInput = input;
    return Object.freeze({
      runnerOptions: Object.freeze({
        authorityManifestSha256: input.authorityManifestSha256,
        databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
        migrationCatalogSha256: input.migrationCatalogSha256,
        ...callbacks,
      }),
      normalizeRunReceipt(value) {
        normalizeCount += 1;
        assert.equal(value, rawRun);
        return outlookRunReceipt({
          authorityCatalogSha256: input.authorityManifestSha256,
          databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
          migrationCatalogSha256: input.migrationCatalogSha256,
          roleBootstrapSha256: harness.readiness.role_bootstrap_sha256,
        });
      },
      normalizeFailureReceipt: () =>
        assert.fail("successful adapter run has no failure receipt"),
      getRoleReadiness: () => harness.readiness,
      dispose() {
        disposeCount += 1;
        input.tenantContextSecret.fill(0);
      },
    });
  };
  harness.options.runOutlookAuthorityMigrations = async (pool, options) => {
    assert.ok(pool);
    assert.deepEqual(Object.keys(options).sort(), [
      "appliedBy",
      "authorityManifestSha256",
      "databaseTargetReceiptSha256",
      "migrationCatalogSha256",
      "onBeforeMigrations",
      "onOutlookAuthorityPaused",
      "onOutlookAuthorityPostMigration",
    ].sort());
    assert.equal(options.authorityManifestSha256,
      adapterInput.authorityManifestSha256);
    assert.equal(options.databaseTargetReceiptSha256,
      adapterInput.databaseTargetReceiptSha256);
    assert.equal(options.migrationCatalogSha256,
      adapterInput.migrationCatalogSha256);
    assert.equal(options.onBeforeMigrations, callbacks.onBeforeMigrations);
    assert.equal(options.onOutlookAuthorityPaused,
      callbacks.onOutlookAuthorityPaused);
    assert.equal(options.onOutlookAuthorityPostMigration,
      callbacks.onOutlookAuthorityPostMigration);
    return rawRun;
  };

  const result = await bootstrapJsonPostgresProductionDatabase(
    harness.options,
  );
  assert.equal(result.outcome, "PASS");
  assert.equal(normalizeCount, 1);
  assert.equal(disposeCount, 1);
  assert.ok(Buffer.isBuffer(adapterInput.tenantContextSecret));
  assert.ok(adapterInput.tenantContextSecret.every((byte) => byte === 0));
});

test("Outlook role COMMIT response loss records an unknown PostgreSQL commit and zeroizes the caller Buffer", async () => {
  const harness = syntheticFreshOutlookHarness();
  const commitUnknown = Object.assign(
    new Error("synthetic role COMMIT response loss"),
    { code: "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN" },
  );
  let adapterInput;
  let disposeCount = 0;
  harness.options.createOutlookMigrationAdapter = (input) => {
    adapterInput = input;
    return Object.freeze({
      runnerOptions: Object.freeze({
        authorityManifestSha256: input.authorityManifestSha256,
        databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
        migrationCatalogSha256: input.migrationCatalogSha256,
        onBeforeMigrations: async () => {},
        onOutlookAuthorityPaused: async () => {},
        onOutlookAuthorityPostMigration: async () => {},
      }),
      normalizeRunReceipt: () =>
        assert.fail("COMMIT-unknown run cannot normalize as success"),
      normalizeFailureReceipt(error) {
        assert.equal(error, commitUnknown);
        return outlookRoleCommitUnknownReceipt({
          authorityCatalogSha256: input.authorityManifestSha256,
          databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
          migrationCatalogSha256: input.migrationCatalogSha256,
          roleBootstrapSha256: harness.readiness.role_bootstrap_sha256,
        });
      },
      getRoleReadiness: () =>
        assert.fail("COMMIT-unknown run has no verified readiness"),
      dispose() {
        disposeCount += 1;
        input.tenantContextSecret.fill(0);
      },
    });
  };
  harness.options.runOutlookAuthorityMigrations = async () => {
    throw commitUnknown;
  };

  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(harness.options),
    (error) => error === commitUnknown,
  );
  assert.equal(disposeCount, 1);
  assert.ok(Buffer.isBuffer(adapterInput.tenantContextSecret));
  assert.ok(adapterInput.tenantContextSecret.every((byte) => byte === 0));
  assert.equal(harness.secretWrites.length, 0);
  assert.equal(harness.terminalWrites.length, 1);
  const [terminal] = harness.terminalWrites;
  assert.equal(terminal.status, "PARTIAL");
  assert.equal(terminal.failure.error_code,
    "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
  assert.equal(terminal.failure.failure_phase, "postgres-bootstrap");
  assert.equal(terminal.postgres_mutation_attempt_count, 1);
  assert.equal(terminal.postgres_mutation_committed_count, null);
  assert.equal(terminal.production_write_count, null);
  assert.equal(terminal.postgres_receipt.kind, "failure");
  assert.equal(
    terminal.postgres_receipt.receipt.failure_phase,
    "outlook_authority_paused",
  );
});

test("production bootstrap preflight stays SELECT-only with or without Outlook IDs", async () => {
  for (const localEnv of [env(), outlookEnv()]) {
    const calls = [];
    const pool = {
      async end() { calls.push("pool:end"); },
    };
    const result = await bootstrapJsonPostgresProductionDatabase({
      event: {
        action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
        mode: "preflight",
      },
      env: localEnv,
      authorize: async () => {
        calls.push("authorize");
        return authorization();
      },
      claim: async () => assert.fail("preflight must not claim"),
      resolveSecret: async ({ secretId }) => {
        calls.push(`read:${secretId}`);
        assert.equal(secretId, "lawos/master");
        return { username: "master", password: "master-value" };
      },
      putSecret: async () => assert.fail("preflight must not write a secret"),
      createPool: () => {
        calls.push("pool:create");
        return pool;
      },
      runMigrations: async () => assert.fail("preflight must not migrate"),
      verifyMigrations: async (actualPool) => {
        assert.equal(actualPool, pool);
        calls.push("migrations:read");
        return CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.map(
          ({ id, checksum }) => ({ id, checksum, applied: true }),
        );
      },
      configureRole: async () => assert.fail("preflight must not alter app role"),
      createOutlookMigrationAdapter: () =>
        assert.fail("preflight must not create an Outlook migration adapter"),
    });
    assert.deepEqual(calls, [
      "authorize",
      "read:lawos/master",
      "pool:create",
      "migrations:read",
      "pool:end",
    ]);
    assert.equal(result.mode, "preflight");
    assert.equal(result.migration_applied_count, 0);
    for (const counter of [
      "authorization_claim_write_attempt_count",
      "authorization_claim_write_committed_count",
      "postgres_mutation_attempt_count",
      "postgres_mutation_committed_count",
      "secretsmanager_put_secret_value_attempt_count",
      "secretsmanager_put_secret_value_committed_count",
      "production_write_count",
    ]) assert.equal(result[counter], 0);
    assert.equal(result.secret_material_returned, false);
  }
});

test("Outlook commit records a zero-PostgreSQL PARTIAL when lawos_app precondition fails before 001", async () => {
  const preconditionError = Object.assign(
    new Error("synthetic missing application role"),
    { code: "LAWOS_OUTLOOK_APPLICATION_ROLE_PRECONDITION" },
  );
  const harness = syntheticFreshOutlookHarness({
    applicationPreconditionError: preconditionError,
  });
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(harness.options),
    (error) => error === preconditionError,
  );
  assert.equal(harness.secretWrites.length, 0);
  assert.equal(harness.terminalWrites.length, 1);
  const [terminal] = harness.terminalWrites;
  assert.equal(terminal.status, "PARTIAL");
  assert.equal(terminal.bindings.role_bootstrap_sha256, null);
  assert.equal(terminal.failure.failure_phase, "postgres-precondition");
  assert.equal(terminal.failure.error_code,
    "LAWOS_OUTLOOK_APPLICATION_ROLE_PRECONDITION");
  assert.equal(terminal.authorization_claim_write_attempt_count, 1);
  assert.equal(terminal.authorization_claim_write_committed_count, 1);
  assert.equal(terminal.postgres_mutation_attempt_count, 0);
  assert.equal(terminal.postgres_mutation_committed_count, 0);
  assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 0);
  assert.equal(terminal.secretsmanager_put_secret_value_committed_count, 0);
  assert.equal(terminal.production_write_count, 1);
  assert.equal(harness.calls.includes("read:lawos/application"), false);
});

test("Outlook commit rejects master, username, and password drift before pool creation with credential PARTIAL", async () => {
  for (const credentialOverrides of [
    { master: { username: "wrong_admin" } },
    { control: { username: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE } },
    { assignment: { username: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE } },
    { lifecycle: { username: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE } },
    {
      control: {
        username: {
          toString: () => LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
        },
      },
    },
    {
      assignment: {
        password: { toString: () => "outlook-assignment-password" },
      },
    },
    {
      tenantContext: {
        tenant_context_secret: {
          toString: () => "tenant-context-value-at-least-32-bytes",
        },
      },
    },
    {
      control: { password: "duplicate-password" },
      assignment: { password: "duplicate-password" },
    },
  ]) {
    const harness = syntheticFreshOutlookHarness({ credentialOverrides });
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase(harness.options),
      (error) => [
        "LAWOS_OUTLOOK_DATABASE_MASTER_ROLE",
        "LAWOS_OUTLOOK_DATABASE_TARGET",
        "LAWOS_OUTLOOK_DATABASE_SECRET",
      ].includes(error?.code),
    );
    assert.equal(harness.calls.includes("pool:end"), false);
    assert.equal(harness.calls.includes("read:lawos/application"), false);
    assert.equal(harness.secretWrites.length, 0);
    assert.equal(harness.terminalWrites.length, 1);
    const [terminal] = harness.terminalWrites;
    assert.equal(terminal.status, "PARTIAL");
    assert.equal(terminal.failure.failure_phase, "credential-input");
    assert.equal(terminal.bindings.role_bootstrap_sha256, null);
    assert.equal(terminal.postgres_mutation_attempt_count, 0);
    assert.equal(terminal.postgres_mutation_committed_count, 0);
    assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 0);
    assert.equal(terminal.secretsmanager_put_secret_value_committed_count, 0);
    assert.equal(terminal.production_write_count, 1);
  }
});

test("Outlook commit ignores alternate master URL aliases and connects only to the signed target", async () => {
  const harness = syntheticFreshOutlookHarness({
    credentialOverrides: {
      master: {
        url: "postgresql://wrong:wrong@attacker.invalid/wrong",
      },
    },
  });
  const result = await bootstrapJsonPostgresProductionDatabase(
    harness.options,
  );
  assert.equal(result.outcome, "PASS");
  const connection = new URL(harness.poolOptions().connectionString);
  assert.equal(connection.hostname, outlookCommitEnv().LAWOS_DATABASE_HOST);
  assert.equal(connection.port, outlookCommitEnv().LAWOS_DATABASE_PORT);
  assert.equal(connection.pathname, `/${outlookCommitEnv().LAWOS_DATABASE_NAME}`);
  assert.equal(connection.username, "lawos_admin");
  assert.equal(connection.password, "master-value");
  assert.notEqual(connection.hostname, "attacker.invalid");
});

test("Outlook post-migration failure rolls back before every credential publication and records observed PARTIAL", async () => {
  const postflightError = Object.assign(
    new Error("synthetic same-client postflight drift"),
    { code: "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT" },
  );
  const harness = syntheticFreshOutlookHarness({ postflightError });
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(harness.options),
    (error) => error === postflightError,
  );
  assert.equal(harness.secretWrites.length, 0);
  assert.equal(harness.terminalWrites.length, 1);
  const [terminal] = harness.terminalWrites;
  assert.equal(terminal.status, "PARTIAL");
  assert.equal(
    terminal.bindings.role_bootstrap_sha256,
    harness.readiness.role_bootstrap_sha256,
  );
  assert.equal(terminal.failure.failure_phase, "postgres-postflight");
  assert.equal(
    terminal.failure.post_state_sha256,
    terminal.postgres_receipt.receipt.failure_receipt_sha256,
  );
  assert.equal(terminal.postgres_mutation_attempt_count, 3);
  assert.equal(terminal.postgres_mutation_committed_count, 2);
  assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 0);
  assert.equal(terminal.production_write_count, 3);
});

test("Outlook migration callbacks reject client drift before secret publication", async () => {
  for (const clientDriftPhase of ["paused", "post-migration"]) {
    const harness = syntheticFreshOutlookHarness({ clientDriftPhase });
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase(harness.options),
      (error) => error?.code === "LAWOS_OUTLOOK_MIGRATION_RUN_DRIFT",
    );
    assert.equal(harness.secretWrites.length, 0);
    assert.equal(harness.terminalWrites.length, 1);
    const [terminal] = harness.terminalWrites;
    assert.equal(terminal.status, "PARTIAL");
    assert.equal(
      terminal.failure.failure_phase,
      clientDriftPhase === "paused"
        ? "postgres-bootstrap"
        : "postgres-postflight",
    );
    assert.equal(
      terminal.bindings.role_bootstrap_sha256,
      clientDriftPhase === "paused"
        ? null
        : harness.readiness.role_bootstrap_sha256,
    );
  }
});

test("each Outlook secret publication failure becomes immutable PARTIAL and exact replay requires recovery", async () => {
  for (const failAt of [0, 1, 2]) {
    const harness = syntheticFreshOutlookHarness({ putFailureAt: failAt });
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase(harness.options),
      (error) => error?.code === "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED",
    );
    assert.equal(harness.secretWrites.length, failAt + 1);
    assert.equal(harness.terminalWrites.length, 1);
    const [terminal] = harness.terminalWrites;
    assert.equal(terminal.status, "PARTIAL");
    assert.equal(terminal.failure.failure_phase, "secret-publication");
    assert.equal(terminal.postgres_mutation_attempt_count, 3);
    assert.equal(terminal.postgres_mutation_committed_count, 3);
    assert.equal(
      terminal.secretsmanager_put_secret_value_attempt_count,
      failAt + 1,
    );
    assert.equal(
      terminal.secretsmanager_put_secret_value_committed_count,
      failAt,
    );
    assert.equal(terminal.production_write_count, 4 + failAt);
    const replayEnvelope = {
      ...harness.claimEnvelope,
      outcome: "replayed",
      claim_write_committed: false,
    };
    const mutationCallCount = harness.calls.length;
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase({
        ...harness.options,
        claim: async () => replayEnvelope,
        readOutlookTerminal: async () =>
          outlookTerminalRead("partial", terminal),
      }),
      (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_RECOVERY_REQUIRED",
    );
    assert.equal(harness.calls.length, mutationCallCount);
    assert.equal(harness.secretWrites.length, failAt + 1);
  }
});

test("Outlook commit reconciles response loss and preserves unknown secret commit counts", async () => {
  const committed = syntheticFreshOutlookHarness({
    putFailureAt: 1,
    putFailureReadback: "committed",
  });
  const committedResult = await bootstrapJsonPostgresProductionDatabase(
    committed.options,
  );
  assert.equal(committedResult.outcome, "PASS");
  assert.equal(
    committedResult.secretsmanager_put_secret_value_attempt_count,
    3,
  );
  assert.equal(
    committedResult.secretsmanager_put_secret_value_committed_count,
    3,
  );
  assert.equal(committedResult.production_write_count, 7);
  assert.equal(committed.terminalWrites.at(-1).status, "PASS");

  for (const putFailureReadback of ["wrong-bytes", "wrong-version"]) {
    const mismatched = syntheticFreshOutlookHarness({
      putFailureAt: 1,
      putFailureReadback,
    });
    await assert.rejects(
      bootstrapJsonPostgresProductionDatabase(mismatched.options),
      (error) => error?.code === "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED"
        && error.outlook_secret_publication?.secret_write_committed === false,
    );
    assert.equal(mismatched.terminalWrites.length, 1);
    const [terminal] = mismatched.terminalWrites;
    assert.equal(terminal.status, "PARTIAL");
    assert.equal(terminal.failure.failure_phase, "secret-publication");
    assert.equal(
      terminal.failure.error_code,
      "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED",
    );
    assert.equal(terminal.postgres_mutation_committed_count, 3);
    assert.equal(
      terminal.secretsmanager_put_secret_value_attempt_count,
      2,
    );
    assert.equal(
      terminal.secretsmanager_put_secret_value_committed_count,
      1,
    );
    assert.equal(terminal.production_write_count, 5);
    const serializedTerminal = JSON.stringify(terminal);
    assert.equal(serializedTerminal.includes("outlook-control-password"), false);
    assert.equal(serializedTerminal.includes("lawos/outlook-control"), false);
  }

  const unknown = syntheticFreshOutlookHarness({
    putFailureAt: 1,
    putFailureReadback: "unavailable",
  });
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(unknown.options),
    (error) => error?.code === "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN"
      && error.outlook_secret_publication?.secret_write_committed === null,
  );
  assert.equal(unknown.terminalWrites.length, 1);
  const [terminal] = unknown.terminalWrites;
  assert.equal(terminal.status, "PARTIAL");
  assert.equal(terminal.failure.failure_phase, "secret-publication");
  assert.equal(terminal.failure.error_code, "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN");
  assert.equal(terminal.postgres_mutation_committed_count, 3);
  assert.equal(terminal.secretsmanager_put_secret_value_attempt_count, 2);
  assert.equal(terminal.secretsmanager_put_secret_value_committed_count, null);
  assert.equal(terminal.production_write_count, null);
  const serializedTerminal = JSON.stringify(terminal);
  assert.equal(serializedTerminal.includes("outlook-control-password"), false);
  assert.equal(serializedTerminal.includes("lawos/outlook-control"), false);
});

test("Outlook commit rejects a forged terminal write receipt and records terminal-evidence PARTIAL", async () => {
  const harness = syntheticFreshOutlookHarness();
  harness.options.writeOutlookTerminal = async ({ terminal }) => {
    harness.terminalWrites.push(terminal);
    if (terminal.status === "PASS") return undefined;
    return outlookTerminalWrite(terminal);
  };
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase(harness.options),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT",
  );
  assert.equal(harness.secretWrites.length, 3);
  assert.deepEqual(
    harness.terminalWrites.map(({ status }) => status),
    ["PASS", "PARTIAL"],
  );
  const partial = harness.terminalWrites[1];
  assert.equal(partial.failure.failure_phase, "terminal-evidence");
  assert.equal(partial.postgres_mutation_committed_count, 3);
  assert.equal(partial.secretsmanager_put_secret_value_committed_count, 3);
  assert.equal(partial.production_write_count, 7);
});

test("production schema ledger readback is SELECT-only and authoritative", async () => {
  const queries = [];
  const secretReads = [];
  let poolOptions;
  const pool = {
    async query(statement) {
      queries.push(String(statement));
      assert.match(String(statement), /^\s*SELECT\b/iu);
      return {
        rows: CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.map(
          ({ id, checksum }) => ({ migration_id: id, checksum }),
        ),
      };
    },
    async end() {},
  };
  const result = await readJsonPostgresProductionSchemaLedger({
    event: {
      action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
      mode: "readback",
    },
    env: env(),
    authorize: async () => authorization(),
    resolveSecret: async ({ secretId }) => {
      secretReads.push(secretId);
      return {
        username: "master",
        password: "master-value",
        url: "postgresql://wrong:wrong@attacker.invalid/wrong",
      };
    },
    createPool: (value) => {
      poolOptions = value;
      return pool;
    },
  });
  assert.deepEqual(secretReads, ["lawos/master"]);
  assert.equal(queries.length, 1);
  const connection = new URL(poolOptions.connectionString);
  assert.equal(connection.hostname, env().LAWOS_DATABASE_HOST);
  assert.equal(connection.port, env().LAWOS_DATABASE_PORT);
  assert.equal(connection.pathname, `/${env().LAWOS_DATABASE_NAME}`);
  assert.equal(connection.username, "master");
  assert.equal(connection.password, "master-value");
  assert.equal(result.migration_count, OFFICIAL_MIGRATION_CATALOG_COUNT);
  assert.equal(result.migration_applied_count, 0);
  assert.equal(result.migration_catalog_count, OFFICIAL_MIGRATION_CATALOG_COUNT);
  assert.equal(
    result.migration_catalog_sha256,
    OFFICIAL_MIGRATION_CATALOG_SHA256,
  );
  assert.equal(
    result.final_migration_id,
    "308_client_outlook_desktop_legacy_windows_compatibility",
  );
  assert.equal(
    result.final_migration_checksum,
    "64cbb3e6575e0af33b7b8e315797000ab5597498a0e9e5eed77c1ad19b23a715",
  );
  for (const key of [
    "production_data_write_count",
    "production_write_count",
    "external_email_send_count",
    "real_data_count",
    "legacy_authority_counter_total",
  ]) assert.equal(result[key], 0);
  for (const key of [
    "raw_value_returned",
    "raw_pii_returned",
    "raw_secret_returned",
    "pii_returned",
    "secret_material_returned",
  ]) assert.equal(result[key], false);
});

test("production schema ledger readback rejects a catalog mismatch before any write", async () => {
  let poolEnded = false;
  await assert.rejects(
    readJsonPostgresProductionSchemaLedger({
      event: {
        action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
        mode: "readback",
      },
      env: env(),
      authorize: async () => authorization(),
      resolveSecret: async () => ({ username: "master", password: "master-value" }),
      createPool: () => ({
        async query() { return { rows: [] }; },
        async end() { poolEnded = true; },
      }),
      verifyMigrations: async () => [{
        id: "001_repository_port_v2",
        checksum: "0".repeat(64),
      }],
    }),
    (error) => error?.code === "LAWOS_PROGRAM_MIGRATION_CATALOG",
  );
  assert.equal(poolEnded, true);
});

test("W13 packet catalog binding rejects a valid wrong digest before readback secrets or database access", async () => {
  const wrongCatalogDigest = "0".repeat(64);
  const invalidAuthorization = authorization();
  invalidAuthorization.packet = {
    ...invalidAuthorization.packet,
    bindings: {
      ...invalidAuthorization.packet.bindings,
      migration_catalog_sha256: wrongCatalogDigest,
    },
  };
  let secretReads = 0;
  let poolCreated = 0;
  await assert.rejects(
    readJsonPostgresProductionSchemaLedger({
      event: {
        action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
        mode: "readback",
      },
      env: env(),
      authorize: async () => invalidAuthorization,
      resolveSecret: async () => {
        secretReads += 1;
        return { username: "master", password: "master-value" };
      },
      createPool: () => {
        poolCreated += 1;
        return { async end() {} };
      },
    }),
    (error) => error?.code === "LAWOS_PROGRAM_MIGRATION_CATALOG",
  );
  assert.equal(secretReads, 0);
  assert.equal(poolCreated, 0);
});

test("W13 packet catalog binding rejects a valid wrong digest before preflight role or secret writes", async () => {
  const wrongCatalogDigest = "1".repeat(64);
  const invalidAuthorization = authorization();
  invalidAuthorization.packet = {
    ...invalidAuthorization.packet,
    bindings: {
      ...invalidAuthorization.packet.bindings,
      migration_catalog_sha256: wrongCatalogDigest,
    },
  };
  let claims = 0;
  let secretReads = 0;
  let roleCalls = 0;
  let secretWrites = 0;
  await assert.rejects(
    bootstrapJsonPostgresProductionDatabase({
      event: {
        action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
        mode: "preflight",
      },
      env: env(),
      authorize: async () => invalidAuthorization,
      claim: async () => {
        claims += 1;
        return { approval_receipt_sha256: "f".repeat(64), claim_sha256: "3".repeat(64) };
      },
      resolveSecret: async () => {
        secretReads += 1;
        return { username: "master", password: "master-value" };
      },
      putSecret: async () => {
        secretWrites += 1;
      },
      createPool: () => ({ async end() {} }),
      configureRole: async () => {
        roleCalls += 1;
        return {};
      },
    }),
    (error) => error?.code === "LAWOS_PROGRAM_MIGRATION_CATALOG",
  );
  assert.equal(claims, 0);
  assert.equal(secretReads, 0);
  assert.equal(roleCalls, 0);
  assert.equal(secretWrites, 0);
});

test("W15 inventory bootstrap separates schema authority from aggregate inventory", async () => {
  const secretWrites = [];
  const baseEvent = {
    action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    phase: "w15-inventory-bootstrap",
    mode: "schema-bootstrap",
    attempt_ref: "w15-bootstrap-schema-test",
    schema_bootstrap_result_sha256: null,
  };
  const result = await executeJsonPostgresW15InventoryBootstrap({
    event: baseEvent,
    env: env(),
    authorize: async () => w15BootstrapAuthorization(),
    claim: async () => ({
      approval_receipt_sha256: "8".repeat(64),
      claim_sha256: "9".repeat(64),
    }),
    loadInputs: async () => ({ predecessors: [{}, {}, {}] }),
    resolveSecret: async ({ secretId }) => {
      if (secretId === "lawos/master") {
        return { username: "master", password: "master-password" };
      }
      if (secretId === "lawos/hrx-projection") {
        return {
          username: "lawos_hrx_projection_writer",
          password: "writer-password",
        };
      }
      if (secretId === "lawos/hrx-projection-auditor") {
        return {
          username: "lawos_hrx_projection_auditor",
          password: "auditor-password",
        };
      }
      return { tenant_context_secret: "t".repeat(32) };
    },
    putSecret: async (value) => { secretWrites.push(value.secretId); },
    createPool: () => ({
      async connect() {
        return { release() {} };
      },
      async end() {},
    }),
    runMigrations: async () => [
      { id: "100", applied: true },
      { id: "101", applied: false },
    ],
    configureRole: async () => ({
      grant_statement_count: 12,
      consumer_write_grant_count: 0,
      auditor_write_grant_count: 0,
    }),
    writeEvidence: async () => ({ sha256: "a".repeat(64) }),
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.mode, "schema-bootstrap");
  assert.equal(result.safe_counts.migration_applied_count, 1);
  assert.equal(result.safe_counts.projection_data_write_count, 0);
  assert.deepEqual(secretWrites.sort(), [
    "lawos/hrx-projection",
    "lawos/hrx-projection-auditor",
  ]);

  let observedProvenance;
  const inventoryResult = await executeJsonPostgresW15InventoryBootstrap({
    event: {
      ...baseEvent,
      mode: "inventory-read",
      attempt_ref: "w15-bootstrap-inventory-test",
      schema_bootstrap_result_sha256: result.result_sha256,
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
    },
    authorize: async () => w15BootstrapAuthorization(),
    claim: async () => ({
      approval_receipt_sha256: "8".repeat(64),
      claim_sha256: "9".repeat(64),
    }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      schemaBootstrapResult: result,
    }),
    resolveSecret: async ({ secretId }) => secretId
      === "lawos/hrx-projection-auditor"
      ? {
          username: "lawos_hrx_projection_auditor",
          password: "auditor-password",
        }
      : { tenant_context_secret: "t".repeat(32) },
    createPool: () => ({ async end() {} }),
    collectInventory: async ({ inventoryProvenanceSha256 }) => {
      observedProvenance = inventoryProvenanceSha256;
      return {
        inventory_sha256: "b".repeat(64),
        inventory_provenance_sha256: inventoryProvenanceSha256,
        source_record_count: 17,
        table_count: 77,
      };
    },
    inspectSchema: async () => ({ columns: [], foreign_keys: [] }),
    writeEvidence: async () => ({ sha256: "c".repeat(64) }),
    s3Client: {},
  });
  assert.equal(inventoryResult.outcome, "PASS");
  assert.equal(inventoryResult.mode, "inventory-read");
  assert.equal(
    inventoryResult.inventory.inventory_provenance_sha256,
    observedProvenance,
  );
  assert.equal(inventoryResult.safe_counts.projection_data_write_count, 0);
  assert.equal(inventoryResult.claims.aggregate_inventory_only, true);
});

test("private rehearsal bootstrap creates only the isolated database and distinct app role", async () => {
  const pools = [];
  let writtenSecret;
  const result = await bootstrapJsonPostgresRehearsalDatabase({
    event: {
      action: JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
      mode: "preflight",
    },
    env: {
      ...env(),
      LAWOS_ADMIN_DATABASE_NAME: "lawos",
      LAWOS_DATABASE_NAME: "lawos_rehearsal",
    },
    authorize: async () => ({
      ...authorization(),
      packet: {
        ...packet(),
        phase: "w12-real-data-rehearsal",
      },
    }),
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    resolveSecret: async ({ secretId }) => {
      if (secretId === "lawos/master") {
        return { username: "master", password: "master-value" };
      }
      if (secretId === "lawos/application") {
        return {
          username: "lawos_rehearsal_app",
          password: "rehearsal-application-value",
        };
      }
      return { tenant_context_secret: "tenant-context-value-at-least-32-bytes" };
    },
    putSecret: async (value) => {
      writtenSecret = JSON.parse(value.secretString);
    },
    createPool: (options) => {
      const pool = {
        options,
        async connect() {
          return { async query() { return { rows: [], rowCount: 0 }; }, release() {} };
        },
        async end() {},
      };
      pools.push(pool);
      return pool;
    },
    ensureDatabase: async (_client, input) => {
      assert.equal(input.databaseName, "lawos_rehearsal");
      return { database_name: "lawos_rehearsal", database_created: true };
    },
    runMigrations: async () => [{ id: "001", applied: true }],
    verifyMigrations: async () => [],
    configureRole: async (_client, input) => {
      assert.deepEqual(input.approvedTenantIds, ["tenant_amic"]);
      return {
        role_name: "lawos_rehearsal_app",
        grant_statement_count: 41,
        tenant_authority_count: 1,
        synthetic_wildcard_count: 0,
      };
    },
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.phase, "w12-real-data-rehearsal");
  assert.equal(result.rehearsal_database_created_count, 1);
  assert.equal(result.production_data_write_count, 0);
  assert.equal(result.external_email_send_count, 0);
  for (const key of [
    "json_fallback_count",
    "json_writer_count",
    "dual_write_count",
    "file_current_authority_count",
    "offline_mutation_count",
    "memory_fallback_count",
  ]) {
    assert.equal(result[key], 0);
  }
  assert.equal(pools.length, 2);
  assert.match(pools[0].options.connectionString, /\/lawos$/u);
  assert.match(pools[1].options.connectionString, /\/lawos_rehearsal$/u);
  assert.equal(writtenSecret.dbname, "lawos_rehearsal");
  assert.equal(writtenSecret.username, "lawos_rehearsal_app");
  assert.equal(JSON.stringify(result).includes("rehearsal-application-value"), false);
});

test("private rehearsal bootstrap identifies AWS access denial at each early protected boundary", async () => {
  const rehearsalAuthorization = {
    ...authorization(),
    packet: {
      ...packet(),
      phase: "w12-real-data-rehearsal",
    },
  };
  const rehearsalEvent = {
    action: JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
    mode: "preflight",
  };
  const rehearsalEnv = {
    ...env(),
    LAWOS_ADMIN_DATABASE_NAME: "lawos",
    LAWOS_DATABASE_NAME: "lawos_rehearsal",
  };
  const denied = () => Object.assign(
    new Error("must-not-return"),
    { name: "AccessDeniedException" },
  );
  const assertStage = async (options, code) => assert.rejects(
    bootstrapJsonPostgresRehearsalDatabase({
      event: rehearsalEvent,
      env: rehearsalEnv,
      authorize: async () => rehearsalAuthorization,
      claim: async () => ({
        approval_receipt_sha256: "f".repeat(64),
        claim_sha256: "3".repeat(64),
      }),
      ...options,
    }),
    (error) => error?.code === code
      && error.message.includes("must-not-return") === false,
  );

  await assertStage({
    authorize: async () => { throw denied(); },
  }, "LAWOS_PROGRAM_AUTHORIZATION_READ_ACCESS_DENIED");
  await assertStage({
    claim: async () => { throw denied(); },
  }, "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_ACCESS_DENIED");

  const secretValues = new Map([
    ["lawos/master", { username: "master", password: "master-value" }],
    ["lawos/application", {
      username: "lawos_rehearsal_app",
      password: "rehearsal-application-value",
    }],
    ["lawos/tenant-context", {
      tenant_context_secret: "tenant-context-value-at-least-32-bytes",
    }],
  ]);
  for (const [secretId, code] of [
    ["lawos/master", "LAWOS_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED"],
    ["lawos/application", "LAWOS_PROGRAM_APPLICATION_SECRET_READ_ACCESS_DENIED"],
    ["lawos/tenant-context", "LAWOS_PROGRAM_TENANT_CONTEXT_SECRET_READ_ACCESS_DENIED"],
  ]) {
    await assertStage({
      resolveSecret: async ({ secretId: requested }) => {
        if (requested === secretId) throw denied();
        return secretValues.get(requested);
      },
    }, code);
  }
});

test("private rehearsal database creation is exact-name and idempotent", async () => {
  const queries = [];
  const client = {
    async query(statement, parameters = []) {
      queries.push({ statement, parameters });
      if (/FROM pg_database/u.test(statement)) return { rowCount: 0, rows: [] };
      return { rowCount: 0, rows: [] };
    },
  };
  const result = await ensureJsonPostgresRehearsalDatabase(client);
  assert.equal(result.database_created, true);
  assert.deepEqual(queries[0].parameters, ["lawos_rehearsal"]);
  assert.equal(queries[1].statement, "CREATE DATABASE lawos_rehearsal");
  await assert.rejects(
    ensureJsonPostgresRehearsalDatabase(client, { databaseName: "lawos" }),
    (error) => error?.code === "LAWOS_PROGRAM_DATABASE",
  );
});

test("program executor preserves the approval boundary in preflight and writes only safe evidence", async () => {
  const execution = {
    outcome: "PASS",
    phase: "w13-production-cutover",
    mode: "preflight",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "4".repeat(64),
    first_write_state: "FIRST_PRODUCTION_WRITE_NOT_STARTED",
    safe_counts: { reviewed_item_count: 1 },
    claims: {
      real_data_read: false,
      real_data_mutated: false,
      database_write: false,
      production_contacted: false,
      production_write: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      mode: "preflight",
      inputs: {},
    },
    env: env(),
    authorize: async () => authorization(),
    claim: async () => ({ approval_receipt_sha256: "f".repeat(64), claim_sha256: "3".repeat(64) }),
    loadInputs: async () => ({
      authorityBundle: { summary: { ready_for_owner_signature: true }, record_type_catalog: {} },
      corpus: null,
      predecessors: [],
    }),
    runExecution: async (input) => {
      assert.equal(input.mode, "preflight");
      assert.equal(input.dmsRunner, null);
      return execution;
    },
    writeEvidence: async ({ value }) => {
      assert.equal(value, execution);
      return { sha256: "5".repeat(64), byte_size: 100 };
    },
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.execution_evidence_sha256, "5".repeat(64));
  assert.equal(result.secret_material_returned, false);
});

test("W12 readback runs only the requested bounded rehearsal validation", async () => {
  const approved = authorization();
  approved.packet = {
    ...approved.packet,
    phase: "w12-real-data-rehearsal",
  };
  approved.approval.phase = "w12-real-data-rehearsal";
  const writes = [];
  let failureInput;
  let authorityBundleInput;
  const baseManifest = { manifest_sha256: "6".repeat(64) };
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      attempt_ref: "w12-failure-001",
      stage: "w12-failure-injection",
      rehearsal_validation_kind: "failure-injection",
      mode: "readback",
      negative_tenant_id: "tenant_negative",
      inputs: {},
    },
    env: env(),
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      authorityBundle: { summary: {}, record_type_catalog: {} },
      baseManifest,
      inventory: {},
      decisions: {},
      recordTypeCatalog: {},
      recordAuthority: {},
      corpus: {
        tenant_id: "tenant_amic",
      },
      sourceTransformResult: {},
      dmsManifest: {},
      predecessors: [],
      checkpoint: null,
      dmsCheckpoint: null,
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_rehearsal_app",
          password: "application-value",
          host: "rehearsal.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos_rehearsal",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: () => ({ async end() {} }),
    verifyMigrations: async () => [],
    createAuthorityBundle: async (input) => {
      authorityBundleInput = input;
      return {
        summary: { authority_manifest_sha256: "7".repeat(64) },
      };
    },
    prepareDmsManifest: () => ({
      manifest_sha256: approved.packet.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: "7".repeat(64),
    }),
    createDmsStorage: () => ({}),
    createDmsRuntime: () => ({}),
    runExecution: async () => ({
      outcome: "PASS",
      phase: "w12-real-data-rehearsal",
      mode: "readback",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: PACKET_SHA,
      result_sha256: "8".repeat(64),
      first_write_state: "NOT_PRODUCTION",
      safe_counts: {
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        file_current_authority_count: 0,
        offline_mutation_count: 0,
        memory_fallback_count: 0,
      },
      claims: {
        real_data_read: true,
        real_data_mutated: false,
        database_write: false,
        production_contacted: false,
        production_write: false,
        authority_activated: false,
        json_authority_disabled: false,
        dms_bytes_in_evidence: false,
        release: false,
        go_live: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    }),
    runFailureInjection: async (input) => {
      failureInput = input;
      return {
        outcome: "PASS",
        result_sha256: "a".repeat(64),
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      };
    },
    writeEvidence: async ({ kind }) => {
      writes.push(kind);
      return {
        sha256: kind === "execution-result"
          ? "9".repeat(64)
          : "b".repeat(64),
        byte_size: 100,
      };
    },
    s3Client: {},
  });
  assert.equal(failureInput.tenantId, "tenant_amic");
  assert.equal(failureInput.negativeTenantId, "tenant_negative");
  assert.deepEqual(writes, ["execution-result", "w12-failure-injection"]);
  assert.equal(authorityBundleInput.baseManifest, baseManifest);
  assert.equal(result.rehearsal_validation_kind, "failure-injection");
  assert.equal(
    result.rehearsal_validation_evidence_sha256,
    "b".repeat(64),
  );
});

test("deployed DMS source loader accepts only exact immutable KMS and Object Lock versions", async () => {
  const bytes = Buffer.from("approved object bytes");
  const object = {
    source_path: null,
    source_object: {
      bucket: "lawos-prod-program-input-770880870480",
      key: "dms/document-001",
      version_id: "version-001",
      expected_bucket_owner: "770880870480",
    },
    byte_size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const client = {
    async send() {
      return {
        VersionId: "version-001",
        ContentLength: bytes.byteLength,
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: KMS,
        ObjectLockMode: "COMPLIANCE",
        ObjectLockRetainUntilDate: new Date("2027-07-23T00:00:00.000Z"),
        Body: { async transformToByteArray() { return bytes; } },
      };
    },
  };
  assert.deepEqual(await loadApprovedDmsSourceObject({
    object,
    packet: packet(),
    env: env(),
    client,
    now: Date.parse("2026-07-23T00:00:00.000Z"),
  }), bytes);
  await assert.rejects(
    loadApprovedDmsSourceObject({
      object: { ...object, source_path: "/private/source" },
      packet: packet(),
      env: env(),
      client,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_DMS_SOURCE",
  );
});

test("program evidence writer rejects sensitive keys and handler returns a non-oracular safe block", async () => {
  const safeWrites = [];
  await writeJsonPostgresProgramEvidence({
    kind: "safe-negative-claims",
    value: {
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      dms_bytes_in_evidence: false,
    },
    event: { attempt_ref: "attempt-safe-negative" },
    authorization: authorization(),
    env: env(),
    client: { async send(command) { safeWrites.push(command); } },
    now: Date.parse("2026-07-23T00:00:00.000Z"),
  });
  assert.equal(safeWrites.length, 1);
  await assert.rejects(
    writeJsonPostgresProgramEvidence({
      kind: "unsafe",
      value: { api_key: "must-not-persist" },
      event: { attempt_ref: "attempt-001" },
      authorization: authorization(),
      env: env(),
      client: { async send() {} },
      now: Date.parse("2026-07-23T00:00:00.000Z"),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_EVIDENCE",
  );
  const blocked = await handler({ action: "unknown" });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.equal(blocked.secret_material_returned, false);
  assert.equal(Object.hasOwn(blocked, "message"), false);
});

test("program evidence writer safely reuses only exact immutable evidence after a conditional-write replay", async () => {
  const value = {
    outcome: "PASS",
    safe_counts: { projection_write_count: 0 },
  };
  let expectedBody;
  const commands = [];
  const replayAuthorization = authorization();
  replayAuthorization.packet = {
    ...replayAuthorization.packet,
    phase: "w15-relational-projection",
  };
  const result = await writeJsonPostgresProgramEvidence({
    kind: "w15-relational-projection-result",
    value,
    event: { attempt_ref: "w15-idempotent-replay", mode: "resume" },
    authorization: replayAuthorization,
    env: env(),
    client: {
      async send(command) {
        commands.push(command);
        if (command.constructor.name === "PutObjectCommand") {
          expectedBody = Buffer.from(command.input.Body);
          throw Object.assign(new Error("already exists"), {
            name: "PreconditionFailed",
            $metadata: { httpStatusCode: 412 },
          });
        }
        return {
          VersionId: "immutable-version-001",
          ContentLength: expectedBody.byteLength,
          ContentType: "application/json",
          ServerSideEncryption: "aws:kms",
          SSEKMSKeyId: KMS,
          ObjectLockMode: "COMPLIANCE",
          ObjectLockRetainUntilDate: new Date("2027-07-30T00:00:00.000Z"),
          Body: {
            async transformToByteArray() {
              return expectedBody;
            },
          },
        };
      },
    },
    now: Date.parse("2026-07-23T00:00:00.000Z"),
  });
  assert.equal(commands.length, 2);
  assert.equal(commands[0].input.IfNoneMatch, "*");
  assert.equal(commands[0].input.ExpectedBucketOwner, "770880870480");
  assert.equal(commands[1].constructor.name, "GetObjectCommand");
  assert.equal(commands[1].input.ExpectedBucketOwner, "770880870480");
  assert.equal(commands[1].input.ChecksumMode, "ENABLED");
  assert.equal(result.byte_size, expectedBody.byteLength);
  assert.equal(result.sha256, createHash("sha256").update(expectedBody).digest("hex"));
});

test("program evidence writer fails closed on immutable replay content or governance drift", async () => {
  const cases = [
    {
      name: "size",
      mutate(response) { response.ContentLength += 1; },
    },
    {
      name: "KMS key",
      mutate(response) { response.SSEKMSKeyId = `${KMS}-other`; },
    },
    {
      name: "Object Lock mode",
      mutate(response) { response.ObjectLockMode = "GOVERNANCE"; },
    },
    {
      name: "expired retention",
      mutate(response) {
        response.ObjectLockRetainUntilDate = new Date("2026-07-22T00:00:00.000Z");
      },
    },
    {
      name: "content",
      mutate(response, body) {
        const drifted = Buffer.from(body);
        drifted[0] ^= 1;
        response.Body = {
          async transformToByteArray() {
            return drifted;
          },
        };
      },
    },
  ];
  const replayAuthorization = authorization();
  replayAuthorization.packet = {
    ...replayAuthorization.packet,
    phase: "w15-relational-projection",
  };
  for (const scenario of cases) {
    let expectedBody;
    await assert.rejects(
      writeJsonPostgresProgramEvidence({
        kind: "w15-relational-projection-result",
        value: { outcome: "PASS", safe_counts: { projection_write_count: 0 } },
        event: {
          attempt_ref: `w15-drift-${scenario.name}`,
          mode: "resume",
        },
        authorization: replayAuthorization,
        env: env(),
        client: {
          async send(command) {
            if (command.constructor.name === "PutObjectCommand") {
              expectedBody = Buffer.from(command.input.Body);
              throw Object.assign(new Error("already exists"), {
                name: "PreconditionFailed",
                $metadata: { httpStatusCode: 412 },
              });
            }
            const response = {
              VersionId: "immutable-version-001",
              ContentLength: expectedBody.byteLength,
              ContentType: "application/json",
              ServerSideEncryption: "aws:kms",
              SSEKMSKeyId: KMS,
              ObjectLockMode: "COMPLIANCE",
              ObjectLockRetainUntilDate: new Date("2027-07-30T00:00:00.000Z"),
              Body: {
                async transformToByteArray() {
                  return expectedBody;
                },
              },
            };
            scenario.mutate(response, expectedBody);
            return response;
          },
        },
        now: Date.parse("2026-07-23T00:00:00.000Z"),
      }),
      (error) => error?.code === "LAWOS_PROGRAM_EVIDENCE_CONFLICT",
      scenario.name,
    );
  }
});

test("program evidence writer keeps non-worker conditional-write replays single-use", async () => {
  const replay = Object.assign(new Error("already exists"), {
    name: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 },
  });
  await assert.rejects(
    writeJsonPostgresProgramEvidence({
      kind: "execution-result",
      value: { outcome: "PASS" },
      event: { attempt_ref: "w12-single-use", mode: "commit" },
      authorization: authorization(),
      env: env(),
      client: {
        async send() {
          throw replay;
        },
      },
      now: Date.parse("2026-07-23T00:00:00.000Z"),
    }),
    (error) => error === replay,
  );
});

test("program evidence writer does not reinterpret non-precondition S3 failures", async () => {
  const denied = Object.assign(new Error("denied"), {
    name: "AccessDenied",
    $metadata: { httpStatusCode: 403 },
  });
  await assert.rejects(
    writeJsonPostgresProgramEvidence({
      kind: "w15-relational-projection-result",
      value: { outcome: "PASS" },
      event: { attempt_ref: "w15-access-denied" },
      authorization: authorization(),
      env: env(),
      client: {
        async send() {
          throw denied;
        },
      },
      now: Date.parse("2026-07-23T00:00:00.000Z"),
    }),
    (error) => error === denied,
  );
});

test("program error classification safely preserves AWS service error names without raw details", () => {
  assert.equal(
    safeJsonPostgresProgramErrorCode({
      name: "AccessDeniedException",
      message: "must-not-return",
      $metadata: { requestId: "must-not-return" },
    }),
    "ACCESSDENIEDEXCEPTION",
  );
  assert.equal(
    safeJsonPostgresProgramErrorCode({
      code: "LAWOS_PROGRAM_INPUT",
      name: "Error",
    }),
    "LAWOS_PROGRAM_INPUT",
  );
});

test("W15 worker emits only PII-safe lag and throughput metrics", () => {
  const metric = createW15ProjectionWorkerMetric({
    outcome: "PASS",
    action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
    mode: "incremental",
    safe_counts: {
      observed_outbox_lag_ms: 23,
      remaining_outbox_event_count: 1,
      consumed_outbox_event_count: 2,
    },
  }, { timestamp: 1_723_000_000_000 });
  assert.equal(metric._aws.Timestamp, 1_723_000_000_000);
  assert.equal(metric._aws.CloudWatchMetrics[0].Namespace, "LawOS/W15");
  assert.equal(metric.Worker, "relational-projection");
  assert.equal(metric.OutboxLagMilliseconds, 23);
  assert.equal(metric.RemainingOutboxEventCount, 1);
  assert.equal(metric.ConsumedOutboxEventCount, 2);
  assert.equal(JSON.stringify(metric).includes("payload"), false);
  assert.throws(() => createW15ProjectionWorkerMetric({
    outcome: "PASS",
    action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
    mode: "incremental",
    safe_counts: {
      observed_outbox_lag_ms: -1,
      remaining_outbox_event_count: 0,
      consumed_outbox_event_count: 0,
    },
  }), /non-negative safe integer/u);
});

test("W15 recurring worker failures propagate a safe error for Lambda retry and DLQ", async () => {
  const previousRole = process.env.LAWOS_PROGRAM_EXECUTION_ROLE;
  process.env.LAWOS_PROGRAM_EXECUTION_ROLE = "projection-writer";
  try {
    await assert.rejects(
      handler({ action: "unsupported" }),
      (error) =>
        error?.name === "LawOSProjectionWorkerInvocationError"
        && error?.code === "LAWOS_PROGRAM_ACTION"
        && error?.message
          === "W15 projection worker invocation failed at a protected boundary"
        && !Object.hasOwn(error, "cause"),
    );
  } finally {
    if (previousRole == null) {
      delete process.env.LAWOS_PROGRAM_EXECUTION_ROLE;
    } else {
      process.env.LAWOS_PROGRAM_EXECUTION_ROLE = previousRole;
    }
  }
});

test("scheduled W15 worker resolves only an exact immutable program-input locator", async () => {
  const scheduledEnv = {
    ...env(),
    LAWOS_AWS_ACCOUNT_ID: "770880870480",
    LAWOS_PROGRAM_INPUT_BUCKET:
      "lawos-prod-program-input-770880870480",
    LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
    LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: ARTIFACT_SHA,
  };
  const resolved = {
    action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
    phase: "w15-relational-projection",
    mode: "resume",
    attempt_ref: "w15-worker-window-001",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: ARTIFACT_SHA,
    packet_sha256: PACKET_SHA,
  };
  const bytes = Buffer.from(JSON.stringify(resolved));
  const digest = createHash("sha256").update(bytes).digest("hex");
  const locator = {
    schema_version: "law-firm-os.immutable-program-input-locator.v1",
    bucket: scheduledEnv.LAWOS_PROGRAM_INPUT_BUCKET,
    key:
      `program-input/${PACKET_SHA}/w15-worker-event/`
      + `${SOURCE_SHA}/${digest}.json`,
    version_id: "worker-event-version-001",
    expected_bucket_owner: "770880870480",
    sha256: digest,
    byte_size: bytes.byteLength,
  };
  const readJson = async (options) => {
    assert.equal(options.expectedBucket, scheduledEnv.LAWOS_PROGRAM_INPUT_BUCKET);
    assert.equal(options.expectedBucketOwner, "770880870480");
    assert.equal(options.expectedKmsKeyArn, KMS);
    assert.equal(options.maxBytes, 256 * 1024);
    return resolved;
  };
  assert.equal(
    await resolveJsonPostgresScheduledProgramEvent({
      event: resolved,
      env: scheduledEnv,
      readJson: async () => {
        throw new Error("direct events must not use S3");
      },
    }),
    resolved,
  );
  assert.equal(
    await resolveJsonPostgresScheduledProgramEvent({
      event: locator,
      env: scheduledEnv,
      readJson,
    }),
    resolved,
  );
  await assert.rejects(
    resolveJsonPostgresScheduledProgramEvent({
      event: { ...locator, key: `program-input/${PACKET_SHA}/other.json` },
      env: scheduledEnv,
      readJson,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_SCHEDULED_EVENT",
  );
  await assert.rejects(
    resolveJsonPostgresScheduledProgramEvent({
      event: locator,
      env: scheduledEnv,
      readJson: async () => ({ ...resolved, source_sha: "e".repeat(40) }),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_DEPLOYMENT_BINDING",
  );
  await assert.rejects(
    resolveJsonPostgresScheduledProgramEvent({
      event: { ...locator, bucket: "lawos-prod-program-input-000000000000" },
      env: scheduledEnv,
      readJson,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_INPUT_LOCATOR",
  );
});

test("W15 projection worker verifies the unified API/admin catalog without rewriting the ledger", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
    bindings: {
      ...w15Authorization.packet.bindings,
      w12_terminal_receipt_sha256: "6".repeat(64),
      cut012_terminal_receipt_sha256: "7".repeat(64),
      go_live_receipt_sha256: "8".repeat(64),
    },
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const pools = [];
  const ledgerQueries = [];
  const projectionPool = {
    async query(statement) {
      ledgerQueries.push(String(statement));
      assert.match(String(statement), /^\s*SELECT\b/iu);
      return {
        rows: CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.map(
          ({ id, checksum }) => ({ migration_id: id, checksum }),
        ),
      };
    },
    async end() {},
  };
  const resolvedSecrets = [];
  let projectedTenant;
  const mappingManifest = {
    manifest_sha256: "4".repeat(64),
  };
  const productionInventory = {
    inventory_sha256: "5".repeat(64),
    inventory_provenance_sha256: "b".repeat(64),
  };
  const performanceAcceptance = {
    acceptance_sha256: "a".repeat(64),
    connection_timeout_ms: 10_000,
    statement_timeout_ms: 120_000,
    pool_max: 2,
  };
  const result = await executeJsonPostgresRelationalProjection({
    event: {
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      mode: "commit",
      backfill_wave: 1,
      attempt_ref: "w15-test-attempt",
      inputs: { predecessors: [] },
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-admin",
    },
    authorize: async () => w15Authorization,
    claim: async () => ({ approval_receipt_sha256: "f".repeat(64), claim_sha256: "3".repeat(64) }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      mappingManifest,
      productionInventory,
      performanceAcceptance,
    }),
    resolveSecret: async ({ secretId }) => {
      resolvedSecrets.push(secretId);
      if (secretId === "lawos/hrx-projection") {
        return { username: "lawos_hrx_projection_writer", password: "projection-value" };
      }
      return { tenant_context_secret: "tenant-context-value-at-least-32-bytes" };
    },
    createPool: (options) => {
      pools.push(options);
      return projectionPool;
    },
    collectInventory: async () => productionInventory,
    project: async (input) => {
      projectedTenant = input;
      return {
        outcome: "PASS",
        mode: "backfill",
        backfill_wave: input.backfillWave,
        safe_counts: {
          source_record_count: 4,
          projected_insert_count: 4,
          projected_update_count: 0,
          projected_noop_count: 0,
          committed_batch_count: 1,
          completed_backfill_wave_count: 1,
          consumed_outbox_event_count: 2,
          observed_event_wave_1_count: 2,
          observed_event_wave_2_count: 0,
          observed_event_wave_3_count: 0,
          observed_event_wave_4_count: 0,
          observed_event_wave_5_count: 0,
          remaining_outbox_event_count: 0,
          tenant_negative_visible_count: 0,
          negative_tenant_context_denied_count: 1,
          unmapped_nonnull_field_count: 0,
          physical_delete_count: 0,
          source_authority_write_count: 0,
          dual_write_count: 0,
          partial_commit_count: 0,
        },
        claims: {
          one_way_projection: true,
          bounded_checkpoint_resume: true,
          event_scoped_incremental_projection: true,
          physical_delete_prohibited: true,
          operational_request_dual_write: false,
          generic_ledger_authority_preserved: true,
          projection_write_authority: false,
        },
      };
    },
    writeEvidence: async ({ value }) => {
      assert.equal(value.claims.secret_material_returned, false);
      return { sha256: "9".repeat(64), byte_size: 200 };
    },
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.mode, "backfill");
  assert.equal(result.safe_counts.projected_insert_count, 4);
  assert.equal(result.safe_counts.completed_backfill_wave_count, 1);
  assert.equal(result.safe_counts.observed_event_wave_1_count, 2);
  assert.equal(result.safe_counts.observed_event_wave_5_count, 0);
  assert.equal(result.safe_counts.observed_outbox_lag_ms, 0);
  assert.equal(result.safe_counts.source_authority_write_count, 0);
  assert.equal(result.safe_counts.consumer_write_grant_count, 0);
  assert.equal(result.safe_counts.authority_promotion_count, 0);
  assert.equal(result.execution_evidence_sha256, "9".repeat(64));
  assert.equal(result.bootstrap_performed, false);
  assert.equal(result.migration_count, 0);
  assert.equal(result.projection_role_grant_count, 0);
  assert.deepEqual(
    resolvedSecrets,
    ["lawos/hrx-projection", "lawos/tenant-context"],
  );
  assert.equal(projectedTenant.tenant_id, "tenant_amic");
  assert.equal(projectedTenant.mode, "backfill");
  assert.equal(projectedTenant.backfillWave, 1);
  assert.equal(projectedTenant.workerRef, "w15-test-attempt");
  assert.equal(projectedTenant.mappingManifest, mappingManifest);
  assert.notEqual(projectedTenant.negativeTenantId, "tenant_amic");
  assert.equal(pools[0].applicationName, "lawos-hrx-relational-projection");
  assert.equal(
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
    OFFICIAL_MIGRATION_CATALOG_COUNT,
  );
  assert.deepEqual(ledgerQueries, [
    "SELECT migration_id, checksum FROM lawos_meta.schema_migrations ORDER BY migration_id",
  ]);
  assert.equal(JSON.stringify(result).includes("projection-value"), false);
});

test("W15 readback uses only the projection auditor credential and independently observed evidence", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const resolved = [];
  let poolOptions;
  const validation = {
    schema_version: "law-firm-os.hrx-relational-projection-validation.v2",
    outcome: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "d".repeat(64),
    safe_counts: { shadow_difference_count: 0 },
    claims: {
      observations_collected_by_read_only_auditor: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = await executeJsonPostgresRelationalProjection({
    event: {
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      mode: "readback",
      attempt_ref: "w15-auditor-readback",
      inputs: {},
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
    },
    authorize: async () => w15Authorization,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      mappingManifest: { manifest_sha256: "4".repeat(64) },
      productionInventory: { inventory_sha256: "5".repeat(64) },
      performanceAcceptance: {
        acceptance_sha256: "a".repeat(64),
        connection_timeout_ms: 10_000,
        statement_timeout_ms: 120_000,
        pool_max: 2,
      },
    }),
    resolveSecret: async ({ secretId }) => {
      resolved.push(secretId);
      if (secretId === "lawos/hrx-projection-auditor") {
        return {
          username: "lawos_hrx_projection_auditor",
          password: "auditor-value",
        };
      }
      if (secretId === "lawos/tenant-context") {
        return {
          tenant_context_secret:
            "tenant-context-value-at-least-32-bytes",
        };
      }
      throw new Error(`unexpected secret: ${secretId}`);
    },
    createPool: (options) => {
      poolOptions = options;
      return { async end() {} };
    },
    verifyMigrations: async () => [],
    validateProjection: async (input) => {
      assert.equal(input.mappingManifest.manifest_sha256, "4".repeat(64));
      assert.equal(input.sourceSha, SOURCE_SHA);
      return validation;
    },
    writeEvidence: async ({ kind, value }) => {
      assert.equal(kind, "w15-relational-projection-validation");
      assert.equal(value, validation);
      return { sha256: "9".repeat(64) };
    },
    s3Client: {},
  });
  assert.deepEqual(resolved.sort(), [
    "lawos/hrx-projection-auditor",
    "lawos/tenant-context",
  ]);
  assert.equal(poolOptions.applicationName, "lawos-hrx-relational-auditor");
  assert.equal(poolOptions.max, 2);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.validation_evidence_sha256, "9".repeat(64));
});

test("W15 failed readback returns only bounded validation evidence for diagnosis", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const validation = {
    schema_version: "law-firm-os.hrx-relational-projection-validation.v2",
    outcome: "FAIL",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "d".repeat(64),
    table_observations: [],
    safe_counts: {
      shadow_difference_count: 0,
      validation_elapsed_ms: 607,
    },
    claims: {
      observations_collected_by_read_only_auditor: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  let evidenceWriteCount = 0;
  const result = await executeJsonPostgresRelationalProjection({
    event: {
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      mode: "readback",
      attempt_ref: "w15-auditor-failed-readback",
      inputs: {},
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
    },
    authorize: async () => w15Authorization,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      mappingManifest: { manifest_sha256: "4".repeat(64) },
      productionInventory: { inventory_sha256: "5".repeat(64) },
      performanceAcceptance: {
        acceptance_sha256: "a".repeat(64),
        connection_timeout_ms: 10_000,
        statement_timeout_ms: 120_000,
        pool_max: 2,
      },
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/hrx-projection-auditor"
      ? {
          username: "lawos_hrx_projection_auditor",
          password: "auditor-value",
        }
      : {
          tenant_context_secret:
            "tenant-context-value-at-least-32-bytes",
        },
    createPool: () => ({ async end() {} }),
    verifyMigrations: async () => [],
    validateProjection: async () => validation,
    writeEvidence: async () => {
      evidenceWriteCount += 1;
      return { sha256: "9".repeat(64) };
    },
    s3Client: {},
  });
  assert.equal(result.outcome, "FAIL");
  assert.equal(result.action, JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION);
  assert.equal(result.validation_evidence_sha256, null);
  assert.equal(result.safe_counts.validation_elapsed_ms, 607);
  assert.equal(result.claims.raw_value_returned, false);
  assert.equal(result.claims.pii_returned, false);
  assert.equal(result.claims.secret_material_returned, false);
  assert.equal(evidenceWriteCount, 0);
  assert.equal(JSON.stringify(result).includes("auditor-value"), false);
});

test("W15 projection auditor Lambda refuses bootstrap and projection writes", async () => {
  let authorizeCount = 0;
  await assert.rejects(
    executeJsonPostgresRelationalProjection({
      event: {
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        mode: "commit",
        attempt_ref: "w15-auditor-write-denial",
        inputs: {},
      },
      env: {
        ...env(),
        LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
      },
      authorize: async () => {
        authorizeCount += 1;
        return authorization();
      },
      s3Client: {},
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_EXECUTION_ROLE",
  );
  assert.equal(authorizeCount, 0);
});

test("W15 recurring projection writer accepts only bounded resume mode", async () => {
  let authorizeCount = 0;
  for (const mode of ["commit", "readback", "reconcile", "rollout"]) {
    await assert.rejects(
      executeJsonPostgresRelationalProjection({
        event: {
          action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
          mode,
          attempt_ref: `w15-writer-${mode}-denial`,
          inputs: {},
        },
        env: {
          ...env(),
          LAWOS_PROGRAM_EXECUTION_ROLE: "projection-writer",
        },
        authorize: async () => {
          authorizeCount += 1;
          return authorization();
        },
        s3Client: {},
      }),
      (error) => error?.code === "LAWOS_HRX_PROJECTION_EXECUTION_ROLE",
    );
  }
  assert.equal(authorizeCount, 0);
  const boundary = new Error("authorized resume boundary reached");
  await assert.rejects(
    executeJsonPostgresRelationalProjection({
      event: {
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        mode: "resume",
        attempt_ref: "w15-writer-resume",
        inputs: {},
      },
      env: {
        ...env(),
        LAWOS_PROGRAM_EXECUTION_ROLE: "projection-writer",
      },
      authorize: async () => {
        authorizeCount += 1;
        throw boundary;
      },
      s3Client: {},
    }),
    (error) => error === boundary,
  );
  assert.equal(authorizeCount, 1);
});

test("W15 resume evidence records the resolved incremental mode", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  let requestedMode;
  let refreshedTenant;
  const projectedResult = {
    outcome: "PASS",
    mode: "incremental",
    backfill_wave: null,
    safe_counts: {
      source_record_count: 0,
      projected_insert_count: 0,
      projected_update_count: 0,
      projected_noop_count: 0,
      committed_batch_count: 0,
      completed_backfill_wave_count: 5,
      consumed_outbox_event_count: 0,
      observed_event_wave_1_count: 0,
      observed_event_wave_2_count: 0,
      observed_event_wave_3_count: 0,
      observed_event_wave_4_count: 0,
      observed_event_wave_5_count: 0,
      remaining_outbox_event_count: 0,
      observed_outbox_lag_ms: 0,
      tenant_negative_visible_count: 0,
      negative_tenant_context_denied_count: 1,
      unmapped_nonnull_field_count: 0,
      physical_delete_count: 0,
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
    },
    claims: {
      one_way_projection: true,
      bounded_checkpoint_resume: true,
      event_scoped_incremental_projection: true,
      physical_delete_prohibited: true,
      operational_request_dual_write: false,
      generic_ledger_authority_preserved: true,
      projection_write_authority: false,
    },
  };
  const options = {
    event: {
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      mode: "resume",
      attempt_ref: "w15-resolved-incremental-mode",
      inputs: {},
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-writer",
    },
    authorize: async () => w15Authorization,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      mappingManifest: { manifest_sha256: "4".repeat(64) },
      productionInventory: { inventory_sha256: "5".repeat(64) },
      performanceAcceptance: {
        acceptance_sha256: "a".repeat(64),
        connection_timeout_ms: 10_000,
        statement_timeout_ms: 120_000,
        pool_max: 2,
      },
      validationEvidence: {
        outcome: "PASS",
        result_sha256: "d".repeat(64),
      },
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/hrx-projection"
      ? {
        username: "lawos_hrx_projection_writer",
        password: "projection-value",
      }
      : {
        tenant_context_secret:
          "tenant-context-value-at-least-32-bytes",
      },
    createPool: () => ({ async end() {} }),
    verifyMigrations: async () => [],
    transaction: async (_pool, options, callback) => {
      refreshedTenant = options.tenant_id;
      return callback({});
    },
    refreshConsumerRoutes: async () => ({
      refreshed_route_count: 4,
      authority_promoted: false,
    }),
    project: async ({ mode }) => {
      requestedMode = mode;
      return projectedResult;
    },
    writeEvidence: async () => ({
      sha256: "9".repeat(64),
      byte_size: 200,
    }),
    s3Client: {},
  };
  const result = await executeJsonPostgresRelationalProjection(options);
  assert.equal(requestedMode, "resume");
  assert.equal(refreshedTenant, "tenant_amic");
  assert.equal(result.mode, "incremental");
  assert.equal(result.safe_counts.consumer_route_refresh_count, 4);
  assert.equal(
    result.claims.consumer_route_refresh_requires_zero_backlog,
    true,
  );
  assert.equal(
    createW15ProjectionWorkerMetric(result, { timestamp: 1 })
      .OutboxLagMilliseconds,
    0,
  );
  assert.equal(JSON.stringify(result).includes("projection-value"), false);

  let unsafeRefreshCount = 0;
  await assert.rejects(
    executeJsonPostgresRelationalProjection({
      ...options,
      event: {
        ...options.event,
        attempt_ref: "w15-unsafe-incremental-route-refresh",
      },
      project: async () => ({
        ...projectedResult,
        safe_counts: {
          ...projectedResult.safe_counts,
          tenant_negative_visible_count: 1,
        },
      }),
      refreshConsumerRoutes: async () => {
        unsafeRefreshCount += 1;
      },
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_ROUTE_REFRESH_GATE",
  );
  assert.equal(unsafeRefreshCount, 0);
});

test("W15 consumer rollout is sequential, read-only, and rolls back to the generic PostgreSQL ledger", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const mappingManifest = { manifest_sha256: "4".repeat(64) };
  const performanceAcceptance = {
    acceptance_sha256: "a".repeat(64),
    connection_timeout_ms: 10_000,
    statement_timeout_ms: 120_000,
    pool_max: 2,
  };
  const validationEvidence = {
    result_sha256: "d".repeat(64),
  };
  const execute = async (rolloutAction) => {
    const resolved = [];
    let ended = false;
    let transactionTenant;
    let activation;
    let disabled;
    const result = await executeJsonPostgresRelationalProjection({
      event: {
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        mode: "rollout",
        rollout_action: rolloutAction,
        ...(rolloutAction === "enable" ? {
          query_family: "core-employee-roster",
          rollout_wave: 1,
          max_staleness_ms: 60_000,
        } : {}),
        attempt_ref: `w15-consumer-${rolloutAction}`,
        inputs: {},
      },
      env: {
        ...env(),
        LAWOS_PROGRAM_EXECUTION_ROLE: "projection-admin",
      },
      authorize: async () => w15Authorization,
      claim: async () => ({
        approval_receipt_sha256: "f".repeat(64),
        claim_sha256: "3".repeat(64),
      }),
      loadInputs: async () => ({
        predecessors: [{}, {}, {}],
        mappingManifest,
        productionInventory: { inventory_sha256: "5".repeat(64) },
        performanceAcceptance,
        validationEvidence: rolloutAction === "enable"
          ? validationEvidence
          : null,
      }),
      resolveSecret: async ({ secretId }) => {
        resolved.push(secretId);
        if (secretId === "lawos/hrx-projection") {
          return {
            username: "lawos_hrx_projection_writer",
            password: "projection-value",
          };
        }
        if (secretId === "lawos/tenant-context") {
          return {
            tenant_context_secret:
              "tenant-context-value-at-least-32-bytes",
          };
        }
        throw new Error(`unexpected secret: ${secretId}`);
      },
      createPool: () => ({
        async end() {
          ended = true;
        },
      }),
      verifyMigrations: async () => [],
      transaction: async (_pool, options, callback) => {
        transactionTenant = options.tenant_id;
        assert.equal(options.maxAttempts, 1);
        return callback({ query() {} });
      },
      activateConsumerRoute: async (_client, input) => {
        activation = input;
        return {
          enabled: true,
          authority_promoted: false,
          mapping_sha256: mappingManifest.manifest_sha256,
          validation_result_sha256: validationEvidence.result_sha256,
        };
      },
      disableConsumerRoutes: async (_client, input) => {
        disabled = input;
        return {
          disabled_route_count: 1,
          generic_ledger_fallback: true,
          projection_rows_deleted: false,
        };
      },
      writeEvidence: async ({ kind, value }) => {
        assert.equal(kind, "w15-consumer-rollout-result");
        assert.equal(value.claims.generic_ledger_authority_preserved, true);
        assert.equal(value.claims.projection_consumers_read_only, true);
        return { sha256: "9".repeat(64) };
      },
      s3Client: {},
    });
    assert.deepEqual(resolved.sort(), [
      "lawos/hrx-projection",
      "lawos/tenant-context",
    ]);
    assert.equal(transactionTenant, "tenant_amic");
    assert.equal(ended, true);
    assert.equal(result.outcome, "PASS");
    assert.equal(result.rollout_action, rolloutAction);
    assert.equal(result.safe_counts.source_authority_write_count, 0);
    assert.equal(result.safe_counts.projection_authority_promotion_count, 0);
    assert.equal(result.safe_counts.json_fallback_count, 0);
    assert.equal(result.execution_evidence_sha256, "9".repeat(64));
    return { result, activation, disabled };
  };

  const enabled = await execute("enable");
  assert.equal(enabled.activation.queryFamily, "core-employee-roster");
  assert.equal(enabled.activation.rolloutWave, 1);
  assert.equal(enabled.activation.validationEvidence, validationEvidence);
  assert.equal(enabled.result.safe_counts.consumer_route_enabled_count, 1);

  const rolledBack = await execute("disable");
  assert.deepEqual(rolledBack.disabled, { tenantId: "tenant_amic" });
  assert.equal(rolledBack.result.safe_counts.consumer_route_disabled_count, 1);
  assert.equal(rolledBack.result.claims.fallback_authority, "postgres-v2-generic-ledger");
  assert.equal(rolledBack.result.claims.rollback_deletes_projection_rows, false);
});

test("CUT-010 readback binds the database pool to the approved isolated DR endpoint", async () => {
  const approved = authorization();
  const cut009 = {
    receipt_kind: "cut-009",
    execution_state: "PASS",
    canonical_sha256: "6".repeat(64),
  };
  let poolOptions;
  let executionInput;
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      stage: "cut-010",
      phase: "w13-production-cutover",
      mode: "readback",
      inputs: {},
      dr_recovery: {},
    },
    env: env(),
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      authorityBundle: { summary: {}, record_type_catalog: {} },
      inventory: {},
      decisions: {},
      recordTypeCatalog: {},
      corpus: {},
      sourceTransformResult: {},
      dmsManifest: {},
      predecessors: [cut009],
      checkpoint: null,
      dmsCheckpoint: null,
    }),
    loadDrInputs: async () => ({
      drTarget: {
        endpoint_address: "lawos-production-dr-a123456789-1.example.ap-northeast-2.rds.amazonaws.com",
        endpoint_port: 5432,
        database_name: "lawos",
        cut009_receipt_sha256: cut009.canonical_sha256,
        migration_result_sha256: "5".repeat(64),
      },
      target: {
        dr_target_sha256: "a".repeat(64),
        rpo_ms: 1_000,
        rto_ms: 2_000,
      },
      acceptance: { acceptance_sha256: "b".repeat(64) },
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_app",
          password: "application-value",
          host: "production.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: (options) => {
      poolOptions = options;
      return { async end() {} };
    },
    verifyMigrations: async () => [],
    createAuthorityBundle: async () => ({ summary: {
      authority_manifest_sha256: "7".repeat(64),
    } }),
    prepareDmsManifest: () => ({
      manifest_sha256: approved.packet.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: "7".repeat(64),
    }),
    createDmsStorage: () => ({}),
    createDmsRuntime: () => ({}),
    runExecution: async (input) => {
      executionInput = input;
      return {
        outcome: "PASS",
        phase: "w13-production-cutover",
        mode: "readback",
        source_sha: SOURCE_SHA,
        source_tree: SOURCE_TREE,
        packet_sha256: PACKET_SHA,
        result_sha256: "8".repeat(64),
        first_write_state: "FIRST_PRODUCTION_WRITE_COMMITTED",
        safe_counts: { reviewed_item_count: 1 },
        claims: {
          real_data_read: true,
          real_data_mutated: false,
          database_write: false,
          production_contacted: true,
          production_write: false,
          raw_value_returned: false,
          pii_returned: false,
          secret_material_returned: false,
        },
      };
    },
    writeEvidence: async () => ({ sha256: "9".repeat(64), byte_size: 100 }),
    s3Client: {},
  });
  assert.match(poolOptions.connectionString, /lawos-production-dr-a123456789-1/u);
  assert.equal(executionInput.mode, "readback");
  assert.equal(result.execution_evidence_sha256, "9".repeat(64));
});

test("W12 restore readback binds the database pool to the approved isolated rehearsal endpoint", async () => {
  const approved = authorization();
  approved.packet = {
    ...approved.packet,
    phase: "w12-real-data-rehearsal",
  };
  approved.approval.phase = "w12-real-data-rehearsal";
  let poolOptions;
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      stage: "w12-restore",
      phase: "w12-real-data-rehearsal",
      mode: "readback",
      inputs: {},
      rehearsal_restore: {},
    },
    env: env(),
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      authorityBundle: { summary: {}, record_type_catalog: {} },
      inventory: {},
      decisions: {},
      recordTypeCatalog: {},
      corpus: {},
      sourceTransformResult: {},
      dmsManifest: {},
      predecessors: [],
      checkpoint: null,
      dmsCheckpoint: null,
    }),
    loadRehearsalRestoreInputs: async () => ({
      restoreTarget: {
        endpoint_address:
          "lawos-private-rehearsal-restore-a123456789-1.example.ap-northeast-2.rds.amazonaws.com",
        endpoint_port: 5432,
        database_name: "lawos_rehearsal",
        migration_result_sha256: "5".repeat(64),
      },
      target: {
        restore_target_sha256: "a".repeat(64),
        rpo_ms: 1_000,
        rto_ms: 2_000,
      },
      acceptance: { acceptance_sha256: "b".repeat(64) },
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_rehearsal_app",
          password: "application-value",
          host: "rehearsal.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos_rehearsal",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: (options) => {
      poolOptions = options;
      return { async end() {} };
    },
    verifyMigrations: async () => [],
    createAuthorityBundle: async () => ({
      summary: { authority_manifest_sha256: "7".repeat(64) },
    }),
    prepareDmsManifest: () => ({
      manifest_sha256: approved.packet.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: "7".repeat(64),
    }),
    createDmsStorage: () => ({}),
    createDmsRuntime: () => ({}),
    runExecution: async () => ({
      outcome: "PASS",
      phase: "w12-real-data-rehearsal",
      mode: "readback",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: PACKET_SHA,
      result_sha256: "8".repeat(64),
      first_write_state: "NOT_PRODUCTION",
      safe_counts: {
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        file_current_authority_count: 0,
        offline_mutation_count: 0,
        memory_fallback_count: 0,
      },
      claims: {
        real_data_read: true,
        real_data_mutated: false,
        database_write: false,
        production_contacted: false,
        production_write: false,
        authority_activated: false,
        json_authority_disabled: false,
        dms_bytes_in_evidence: false,
        release: false,
        go_live: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    }),
    writeEvidence: async ({ kind }) => ({
      sha256: kind === "execution-result"
        ? "9".repeat(64)
        : "b".repeat(64),
      byte_size: 100,
    }),
    s3Client: {},
  });
  assert.match(
    poolOptions.connectionString,
    /lawos-private-rehearsal-restore-a123456789-1/u,
  );
  assert.equal(
    poolOptions.applicationName,
    "lawos-json-postgres-w12-restore-readback",
  );
  assert.equal(
    result.rehearsal_restore_target_sha256,
    "a".repeat(64),
  );
  assert.equal(
    result.rehearsal_restore_evidence_sha256,
    "b".repeat(64),
  );
});

test("CUT-011 warm and cold smoke proves PostgreSQL write/read/audit/outbox without JSON paths", async () => {
  const approved = authorization();
  const ledger = {
    async transaction(context, callback) {
      if (context.tenant_id !== "tenant_amic") {
        throw Object.assign(new Error("PostgreSQL operation failed"), {
          code: "LAWOS_POSTGRES_ACCESS_DENIED",
          status: 403,
        });
      }
      return callback({
        async claimIdempotency() { return { replayed: false }; },
        async write() { return { state_version: 1 }; },
        async appendAudit() { return { event_id: "audit-1" }; },
        async enqueueOutbox() { return { event: { event_id: "outbox-1" } }; },
      });
    },
  };
  const result = await executeJsonPostgresRetirementSmoke({
    event: {
      action: JSON_POSTGRES_JSON_RETIREMENT_ACTION,
      stage: "cut-011",
      mode: "commit",
      startup_kind: "cold",
      runtime_generation: 2,
      retirement: {},
    },
    env: {
      ...env(),
      LAWOS_RUNTIME_GENERATION: "2",
      AWS_LAMBDA_LOG_STREAM_NAME: "2026/07/23/[$LATEST]safe",
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
      LAWOS_STAFF_AUTHORITY: "internal-password",
    },
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      deploymentManifest: {
        artifact_runtime_store_entry_count: 0,
        artifact_real_json_store_count: 0,
      },
      predecessors: [{}, {}],
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_app",
          password: "application-value",
          host: "production.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: () => ({ async end() {} }),
    createLedger: () => ledger,
    verifyMigrations: async () => [],
    writeEvidence: async () => ({ sha256: "4".repeat(64), byte_size: 100 }),
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.operational_json_path_count, 0);
  assert.equal(result.safe_counts.json_fallback_count, 0);
  assert.equal(result.safe_counts.postgres_audit_event_count, 1);
  assert.equal(result.safe_counts.postgres_outbox_event_count, 1);
  assert.equal(JSON.stringify(result).includes("application-value"), false);
});
