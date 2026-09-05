import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY, OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256 } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { OUTLOOK_ASSIGNMENT_MIGRATION_CATALOG_ID, createOutlookAssignmentMigrationPauseExpectation, readOutlookAssignmentBootstrapAuthority, readOutlookAssignmentMigrationPauseExpectation } from "../../../packages/email-dms/src/outlook-desktop-assignment-bootstrap-authority.js";
import { verifyOutlookAssignmentMigrationPreflight } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-readback.js";
import { verifyOutlookAssignmentMigrationPostflight } from "../../../packages/email-dms/src/outlook-desktop-assignment-migration-postflight.js";
import { configureLawosOutlookDatabaseRoles, verifyLawosOutlookApplicationRolePrecondition, verifyLawosOutlookDatabaseRoles } from "../../../packages/persistence/src/postgres/outlook-authority-roles.js";
import { assertOutlookAuthorityMigrationFailureReceipt, assertOutlookAuthorityMigrationRunReceipt, createOutlookPostgresRoleConfigurationCommitUnknownError } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { CLIENT_OPERATIONS_MIGRATION_CATALOG, selectClientOperationsMigrationTarget } from "./client-operations-schema.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { readInternalUnsignedInstallationAuthorityReadback } from "../../../packages/email-dms/src/internal-unsigned-installation-authority-readback.js";

const SHA256 = /^[a-f0-9]{64}$/u;
const TENANT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const OPTION_KEYS = Object.freeze(["approvedTenantIds", "assignmentPassword",
  "authorityManifestSha256", "controlPassword", "databaseTargetReceiptSha256",
  "lifecycleVerifierPassword", "migrationCatalogSha256", "tenantContextSecret"]);
const MIGRATION = Object.freeze({ catalog_id: AUTHORITY.bootstrap_receipt.migration_catalog_id,
  schema_version: AUTHORITY.bootstrap_receipt.migration_schema_version,
  target_schema: AUTHORITY.schema.name });
const HISTORICAL_MIGRATION_CATALOG_SHA256 = hashDomainValue({
  ...CLIENT_OPERATIONS_MIGRATION_CATALOG,
  migration_count: 79,
  migrations: CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.filter(({ id }) =>
    id !== "016_dms_corporate_workspace"
      && id !== "309_client_internal_unsigned_installation_authority"),
});

function fail(message) {
  throw Object.assign(new Error(message),
    { code: "LAWOS_OUTLOOK_AUTHORITY_MIGRATION_ADAPTER",
      safe_error_code: "OUTLOOK_AUTHORITY_MIGRATION_ADAPTER", status: 500 });
}

function exactRecord(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) {
    fail(`${label} is not exact`);
  }
}

function digest(value, label) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(`${label} is invalid`);
  return value;
}

function sameCatalog(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return actual.every((row, index) => {
    try { exactRecord(row, ["id", "source_migration_id", "file_name", "checksum"],
      "callback migration catalog row"); } catch { return false; }
    const wanted = expected[index];
    return row.id === wanted.id && row.source_migration_id === wanted.source_migration_id
      && row.file_name === wanted.file_name && row.checksum === wanted.checksum;
  });
}

function sameClientPool(client) {
  return Object.freeze({ connect: async () => Object.freeze({
    query: client.query.bind(client), release() {},
  }) });
}

export function createJsonPostgresOutlookAuthorityMigrationAdapter(options = {}) {
  const callerSecret = Buffer.isBuffer(options?.tenantContextSecret)
    ? options.tenantContextSecret : null;
  try {
    const hasHistoricalBootstrap = options != null && Object.hasOwn(options, "historicalOutlookBootstrapSha256");
    exactRecord(options, hasHistoricalBootstrap
      ? [...OPTION_KEYS, "historicalOutlookBootstrapSha256"] : OPTION_KEYS,
    "Outlook migration adapter options");
    const historicalBootstrapSha = hasHistoricalBootstrap
      ? digest(options.historicalOutlookBootstrapSha256, "historical Outlook bootstrap SHA-256")
      : undefined;
    const authoritySha = digest(options.authorityManifestSha256,
      "authority manifest SHA-256");
    const targetSha = digest(options.databaseTargetReceiptSha256,
      "database target receipt SHA-256");
    const migrationSha = digest(options.migrationCatalogSha256,
      "migration catalog SHA-256");
    if (authoritySha !== OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256) {
      fail("authority manifest does not match the reviewed catalog");
    }
    let target;
    try { target = selectClientOperationsMigrationTarget(migrationSha); } catch {
      fail("migration manifest does not match the reviewed catalog");
    }
    if (hasHistoricalBootstrap && ![80, 81].includes(target.catalog.migration_count)) {
      fail("historical Outlook bootstrap requires a reviewed append target");
    }
    const catalog = Object.freeze(target.catalog.migrations.map((row) => Object.freeze({
      id: row.id, source_migration_id: row.source_migration_id,
      file_name: row.file_name, checksum: row.checksum,
    })));
    const tenants = options.approvedTenantIds;
    const passwords = [options.controlPassword, options.assignmentPassword,
      options.lifecycleVerifierPassword];
    if (!Array.isArray(tenants) || tenants.length === 0
        || tenants.some((tenant) => typeof tenant !== "string" || !TENANT.test(tenant))
        || new Set(tenants).size !== tenants.length
        || passwords.some((value) => typeof value !== "string" || !value
          || value.trim() !== value)
        || new Set(passwords).size !== passwords.length
        || !callerSecret || callerSecret.byteLength < 32) {
      fail("Outlook migration adapter credentials or tenants are invalid");
    }
    const approvedTenantIds = Object.freeze([...tenants]);
    const authorityRow = catalog.find((row) =>
      row.id === OUTLOOK_ASSIGNMENT_MIGRATION_CATALOG_ID
        || row.source_migration_id === OUTLOOK_ASSIGNMENT_MIGRATION_CATALOG_ID);
    let phase = "before";
    let callbackClient;
    let preflight;
    let applicationRole;
    let pause;
    let readiness;
    let replay = false;
    let assignmentPostflight;
    let disposed = false;
    const assertCallback = (client, callbackCatalog, expectedPhase) => {
      if (phase !== expectedPhase || !client || typeof client.query !== "function"
          || (callbackClient && callbackClient !== client)
          || !sameCatalog(callbackCatalog, catalog)) {
        fail("Outlook migration callback boundary drifted");
      }
      callbackClient ??= client;
    };
    const runnerOptions = Object.freeze({
      authorityManifestSha256: authoritySha,
      databaseTargetReceiptSha256: targetSha,
      migrationCatalogSha256: migrationSha,
      ...(hasHistoricalBootstrap ? { historicalOutlookBootstrapSha256: historicalBootstrapSha } : {}),
      async onBeforeMigrations(client, callbackCatalog) {
        assertCallback(client, callbackCatalog, "before");
        const applied = (await client.query(
          `SELECT EXISTS (SELECT 1 FROM lawos_meta.schema_migrations
                           WHERE migration_id=$1) AS applied`,
          [authorityRow.id],
        )).rows[0]?.applied;
        if (typeof applied !== "boolean") fail("authority migration ledger is invalid");
        replay = applied;
        preflight = await verifyOutlookAssignmentMigrationPreflight(client, {
          authority_catalog: AUTHORITY,
          phase: replay ? "post_migration" : "pre_migration",
        });
        applicationRole = await verifyLawosOutlookApplicationRolePrecondition(
          client,
          { migrationAdminRole: AUTHORITY.migration_admin,
            expectedApplicationMembershipPresent:
              preflight.lawos_app_membership_present },
        );
        if (replay) {
          pause = await readOutlookAssignmentMigrationPauseExpectation(client);
          if (pause.authority_manifest_sha256 !== authoritySha
              || (hasHistoricalBootstrap
                ? hashDomainValue(pause) !== historicalBootstrapSha
                  || pause.migration_catalog_sha256 === migrationSha
                : pause.database_target_receipt_sha256 !== targetSha
                  || (pause.migration_catalog_sha256 !== migrationSha
                    && (HISTORICAL_MIGRATION_CATALOG_SHA256 !==
                      "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556"
                      || pause.migration_catalog_sha256 !==
                        HISTORICAL_MIGRATION_CATALOG_SHA256)))) {
            fail("persisted Outlook migration expectation drifted");
          }
          phase = "post";
          return pause;
        }
        if (hasHistoricalBootstrap) fail("historical Outlook bootstrap requires an existing protected receipt");
        phase = "paused";
        return undefined;
      },
      async onOutlookAuthorityPaused(client, callbackCatalog) {
        assertCallback(client, callbackCatalog, "paused");
        const createUnknown = (observed) =>
          createOutlookPostgresRoleConfigurationCommitUnknownError(
            createOutlookAssignmentMigrationPauseExpectation({
              role_bootstrap_sha256: observed.role_bootstrap_sha256,
              authority_manifest_sha256: authoritySha,
              database_target_receipt_sha256: targetSha,
              migration_catalog_sha256: migrationSha,
            }),
          );
        readiness = await configureLawosOutlookDatabaseRoles(client, {
          migrationAdminRole: AUTHORITY.migration_admin, migration: MIGRATION,
          applicationRolePrecondition: applicationRole,
          controlPassword: passwords[0], assignmentPassword: passwords[1],
          lifecycleVerifierPassword: passwords[2],
          tenantContextSecret: callerSecret, approvedTenantIds,
          createRoleConfigurationCommitUnknownError: createUnknown,
        });
        const canonical = await readOutlookAssignmentBootstrapAuthority(
          sameClientPool(client), { database_name: AUTHORITY.database.name,
            bootstrap_grantor: readiness.role_bootstrap.bootstrap_grantor.name,
            lawos_app_membership_present:
              readiness.application_membership_edge_count === 1 },
        );
        if (canonical.role_bootstrap_sha256 !== readiness.role_bootstrap_sha256) {
          fail("role bootstrap canonical digest drifted");
        }
        pause = createOutlookAssignmentMigrationPauseExpectation({
          role_bootstrap_sha256: readiness.role_bootstrap_sha256,
          authority_manifest_sha256: authoritySha,
          database_target_receipt_sha256: targetSha,
          migration_catalog_sha256: migrationSha,
        });
        phase = "post";
        return pause;
      },
      async onOutlookAuthorityPostMigration(client, callbackCatalog) {
        assertCallback(client, callbackCatalog, "post");
        readiness = await verifyLawosOutlookDatabaseRoles(client, {
          migrationAdminRole: AUTHORITY.migration_admin, migration: MIGRATION,
          approvedTenantIds,
          ...(readiness ? { expectedRoleBootstrap: readiness } : {}),
        });
        if (readiness.role_bootstrap_sha256 !== pause.role_bootstrap_sha256) {
          fail("post-migration role bootstrap digest drifted");
        }
        const result = await verifyOutlookAssignmentMigrationPostflight(client, {
          pause_expectation: pause, migration_preflight: preflight,
          authority_catalog: AUTHORITY,
          transaction_mode: replay ? "read_only" : "write",
        });
        assignmentPostflight = result;
        phase = "internal";
        return result;
      },
      async onInternalUnsignedInstallationAuthorityPostMigration(client, callbackCatalog) {
        assertCallback(client, callbackCatalog, "internal");
        const internal = await readInternalUnsignedInstallationAuthorityReadback(client);
        phase = "complete";
        return Object.freeze({
          role_bootstrap_sha256: assignmentPostflight.role_bootstrap_sha256,
          authority_postflight_sha256: hashDomainValue({
            outlook_assignment: assignmentPostflight,
            internal_unsigned_installation: internal,
          }),
        });
      },
    });
    const expectation = () => ({
      authority_manifest_sha256: authoritySha,
      database_name: AUTHORITY.database.name,
      database_target_receipt_sha256: targetSha,
      migration_catalog: catalog,
      migration_catalog_sha256: migrationSha,
      ...(hasHistoricalBootstrap ? { historical_outlook_bootstrap_sha256: historicalBootstrapSha } : {}),
      ...(pause ? { role_bootstrap_sha256: pause.role_bootstrap_sha256 } : {}),
      session_user: AUTHORITY.migration_admin,
    });
    return Object.freeze({
      runnerOptions,
      normalizeRunReceipt(value) {
        if (phase !== "complete") fail("Outlook migration run is incomplete");
        return assertOutlookAuthorityMigrationRunReceipt(value, expectation());
      },
      normalizeFailureReceipt(error) {
        const receipt = assertOutlookAuthorityMigrationFailureReceipt(
          error?.outlook_authority_failure,
          { authority_manifest_sha256: authoritySha,
            database_target_receipt_sha256: targetSha,
            migration_catalog: catalog, migration_catalog_sha256: migrationSha },
        );
        if (pause && receipt.role_bootstrap_sha256 !== null
            && receipt.role_bootstrap_sha256 !== pause.role_bootstrap_sha256) {
          fail("Outlook migration failure role digest drifted");
        }
        return receipt;
      },
      getRoleReadiness() {
        if (phase !== "complete" || !readiness) {
          fail("Outlook migration role readiness is incomplete");
        }
        return readiness;
      },
      dispose() {
        if (!disposed) callerSecret.fill(0);
        disposed = true;
      },
    });
  } catch (error) {
    callerSecret?.fill(0);
    throw error;
  }
}
