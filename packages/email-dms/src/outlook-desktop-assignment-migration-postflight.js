import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  normalizeOutlookAuthorityMigrationPauseExpectation,
} from "../../persistence/src/postgres/migration-runner.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY,
  assertOutlookDesktopAssignmentAuthorityCatalog,
} from "./outlook-desktop-assignment-authority-catalog.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_PROTECTED_OBJECT_FACTS_SHA256,
  assertOutlookAssignmentMigrationPreflightReceipt,
  readOutlookAssignmentProtectedObjectFacts,
  readOutlookAssignmentTenantContextAuthorityFacts,
} from "./outlook-desktop-assignment-authority-readback.js";

const POSTFLIGHT_SCHEMA_VERSION =
  "lawos.outlook-authority-migration-postflight.v1";

function fail() {
  throw Object.assign(new Error("Outlook authority postflight failed"), {
    code: "LAWOS_OUTLOOK_AUTHORITY_POSTFLIGHT_FAILED",
    safe_error_code: "OUTLOOK_AUTHORITY_POSTFLIGHT_FAILED",
    status: 500,
  });
}

function stableDependencyIdentity(material) {
  return {
    current_tenant: {
      oid: material.current_tenant.oid,
      signature: material.current_tenant.signature,
      owner: material.current_tenant.owner,
      body_sha256: material.current_tenant.body_sha256,
    },
    lawos_security_schema: {
      oid: material.lawos_security_schema.oid,
      name: material.lawos_security_schema.name,
      owner: material.lawos_security_schema.owner,
    },
    authority_table: {
      oid: material.authority_table.oid,
      name: material.authority_table.name,
      owner: material.authority_table.owner,
    },
    hmac: {
      oid: material.hmac.oid,
      signature: material.hmac.signature,
      owner: material.hmac.owner,
      extension_oid: material.hmac.extension_oid,
      extension: material.hmac.extension,
      extension_version: material.hmac.extension_version,
    },
    public_schema: {
      oid: material.public_schema.oid,
      name: material.public_schema.name,
      owner: material.public_schema.owner,
    },
  };
}

export async function verifyOutlookAssignmentMigrationPostflight(
  client,
  {
    pause_expectation: pauseExpectation,
    migration_preflight: migrationPreflight,
    authority_catalog: authorityCatalog = AUTHORITY,
    transaction_mode: transactionMode = "write",
  } = {},
) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL migration client is required");
  }
  const expected = normalizeOutlookAuthorityMigrationPauseExpectation(
    pauseExpectation,
  );
  const authority = assertOutlookDesktopAssignmentAuthorityCatalog(
    authorityCatalog,
    { database_name: authorityCatalog?.database?.name },
  );
  const authorityCatalogSha256 = hashDomainValue(authority);
  const preflight = assertOutlookAssignmentMigrationPreflightReceipt(
    migrationPreflight,
  );
  if (!new Set(["read_only", "write"]).has(transactionMode)) fail();
  const identity = (await client.query(
    `SELECT session_user,current_user,current_database() AS database_name,
            (SELECT oid::text FROM pg_database
              WHERE datname=current_database()) AS database_oid,
            pg_backend_pid() AS backend_pid,
            current_setting('transaction_isolation') AS isolation_level,
            current_setting('transaction_read_only')::boolean AS read_only,
            NOT EXISTS (
              SELECT 1 FROM pg_auth_members
               WHERE roleid='lawos_outlook_authority_owner'::regrole
                 AND member='lawos_admin'::regrole
                 AND grantor='lawos_admin'::regrole
            ) AS self_set_absent`,
  )).rows[0];
  const receiptRows = (await client.query(
    `SELECT schema_version,migration_catalog_id,role_bootstrap_sha256,
            authority_manifest_sha256,database_target_receipt_sha256,
            migration_catalog_sha256
       FROM lawos_meta.outlook_authority_bootstrap_receipts
      WHERE database_oid=(SELECT oid FROM pg_database
                            WHERE datname=current_database())
        AND migration_catalog_id=$1`,
    [authority.bootstrap_receipt.migration_catalog_id],
  )).rows;
  const receipt = receiptRows[0];
  if (identity?.session_user !== authority.migration_admin
      || identity.current_user !== authority.migration_admin
      || identity.database_name !== authority.database.name
      || identity.isolation_level !== "serializable"
      || identity.read_only !== (transactionMode === "read_only")
      || identity.self_set_absent !== true
      || receiptRows.length !== 1
      || receipt.schema_version !== expected.schema_version
      || receipt.role_bootstrap_sha256 !== expected.role_bootstrap_sha256
      || receipt.authority_manifest_sha256 !== expected.authority_manifest_sha256
      || receipt.database_target_receipt_sha256 !==
        expected.database_target_receipt_sha256
      || receipt.migration_catalog_sha256 !== expected.migration_catalog_sha256
      || expected.authority_manifest_sha256 !== authorityCatalogSha256
      || preflight.material.authority_catalog_sha256 !== authorityCatalogSha256
      || preflight.material.identity.session_user !== identity.session_user
      || preflight.material.identity.current_user !== identity.current_user
      || preflight.material.identity.database_name !== identity.database_name
      || preflight.material.identity.database_oid !== identity.database_oid
      || preflight.material.identity.backend_pid !== identity.backend_pid) {
    fail();
  }
  const facts = await readOutlookAssignmentProtectedObjectFacts(client);
  const tenantContextFacts =
    await readOutlookAssignmentTenantContextAuthorityFacts(client, {
      authority_catalog: authority,
      phase: "post_migration",
    });
  if (JSON.stringify(stableDependencyIdentity(
    preflight.material.tenant_context,
  )) !== JSON.stringify(stableDependencyIdentity(
    tenantContextFacts.material,
  ))) {
    fail();
  }
  if (facts.protected_table_count !== AUTHORITY.tables.length
      || facts.protected_function_count !== AUTHORITY.functions.length
      || facts.protected_object_facts_sha256 !==
        OUTLOOK_DESKTOP_ASSIGNMENT_PROTECTED_OBJECT_FACTS_SHA256) {
    fail();
  }
  const material = Object.freeze({
    schema_version: POSTFLIGHT_SCHEMA_VERSION,
    database: Object.freeze({
      oid: String(identity.database_oid),
      name: identity.database_name,
    }),
    backend_pid: identity.backend_pid,
    transaction_mode: transactionMode,
    receipt: Object.freeze({ ...receipt }),
    authority_catalog_sha256:
      authorityCatalogSha256,
    protected_table_count: facts.protected_table_count,
    protected_function_count: facts.protected_function_count,
    protected_object_facts_sha256: facts.protected_object_facts_sha256,
    migration_preflight_sha256: preflight.migration_preflight_sha256,
    preflight_tenant_context_authority_facts_sha256:
      preflight.tenant_context_authority_facts_sha256,
    tenant_context_authority_facts_sha256:
      tenantContextFacts.tenant_context_authority_facts_sha256,
  });
  return Object.freeze({
    role_bootstrap_sha256: receipt.role_bootstrap_sha256,
    authority_postflight_sha256: hashDomainValue(material),
  });
}
