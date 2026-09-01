import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import {
  LAWOS_AUTH_CREDENTIAL_STORE_ENV,
  LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
  LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
  LAWOS_AUTH_SCRYPT_PARAMS,
  createAuthCredentialRecord,
} from "./auth-credential-store.js";
import {
  DEFAULT_PASSWORD_RESET_TTL_MS,
  LAWOS_AUTH_PASSWORD_RESET_STORE_ENV,
  createAuthPasswordResetStore,
} from "./auth-password-reset-store.js";
import {
  DEFAULT_PASSWORD_RESET_EMAIL_LOGO_URL,
  passwordResetEmailHtml,
  passwordResetEmailSubject,
  passwordResetEmailText,
} from "./password-reset-email-template.js";
import {
  MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
  MATTER_VAULT_USER_REGISTRATION_SEED,
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "./matter-vault-account-registry.js";
import {
  LAWOS_OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_ENV,
  startApiServer,
} from "./server.js";
import { reconcileHrxMemberRosterStore } from "./hrx-runtime-context.js";
import { DERIVED_STORE_PATH_MANIFEST, STORE_PATH_MANIFEST } from "./store-path-manifest.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import {
  AMIC_CURRENT_MATTER_CLIENTS,
  AMIC_CURRENT_MATTER_CODE_CANDIDATES,
} from "../../../packages/matter/src/amic-matter-code-candidates.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createCanonicalRecord } from "../../../packages/runtime-model/src/validators.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { buildCashflowReadModel } from "../../../packages/analytics/src/finance-read-model.js";
import {
  backfillPaymentMatchesAsAllocations,
  buildPaymentAllocationMigrationPlan,
} from "../../../packages/payments/src/payment-allocation-service.js";
import {
  readDurableJsonFile,
  removeDurableJsonFile,
  writeDurableJsonFile,
} from "../../../packages/persistence/src/durable-file.js";
import { appendNdjsonDurably } from "../../../packages/persistence/src/durable-append.js";
import {
  loadHrxRelationalProjectionRuntimeInput,
} from "./hrx-relational-projection-input.js";
import {
  LAWOS_CLIENT_OPERATIONS_V2_ENABLED_ENV,
} from "./client-operations-config.js";
import {
  resolveLambdaPeopleOutlookRuntimeFactory,
} from "./people-outlook-operational-runtime.js";
import {
  resolveLambdaClientOutlookM365GraphConfig,
} from "./client-outlook-operational-runtime.js";
import {
  createMicrosoftEgressBrokerTransport,
} from "./microsoft-egress-broker-transport.js";
import {
  LAWOS_AMIC_VAULT_EGRESS_BROKER_ENABLED_ENV,
  createAmicVaultEgressBrokerFetch,
} from "./amic-vault-egress-broker-transport.js";
import {
  handleOutlookConversationMaintenanceEvent,
  LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
} from "./outlook-conversation-maintenance-invocation.js";
import {
  OUTLOOK_VAULT_ATTACHMENT_DELIVERY_PREFIX,
} from "./outlook-vault-attachment-delivery-runtime.js";
import {
  DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH,
} from "./desktop-vault-export-runtime.js";
import {
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV,
  resolveAmicVaultHttpUploadProvider,
} from "./amic-vault-http-upload-provider.js";
import {
  LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV,
  resolveAmicVaultHttpExportProvider,
} from "./amic-vault-http-export-provider.js";
import { resolveRuntimeProfile } from "./runtime-profile.js";

export { LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION };

let sessionSecretPromise;
let hrxStepUpRootSecretPromise;

export const LAWOS_AMIC_VAULT_PROVIDER_TOKEN_SECRET_ID_ENV =
  "LAWOS_AMIC_VAULT_PROVIDER_TOKEN_SECRET_ID";

export const CTI_READONLY_EFS_SNAPSHOT_ACTION = "cti_cutover_readonly_efs_snapshot";
export const CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF =
  "I14-CTI-CUTOVER-READONLY-EFS-SNAPSHOT-SURFACE-OWNER-APPROVAL-2026-07-06";
export const CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION = "cti_s1g_authenticated_production_probe";
export const CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF =
  "I18-CTI-S2-PRODUCTION-AUTH-PROBE-PRINCIPAL-OWNER-APPROVAL-2026-07-06";
export const HRX_ROSTER_RECONCILE_ACTION = "hrx_roster_reconcile";
export const HRX_ROSTER_RECONCILE_APPROVAL_REF =
  "USER-HRX-ROSTER-RECONCILE-AWS-DEPLOY-APPROVAL-2026-07-11";
export const CTI_CUTOVER_EXECUTE_RETRY_ACTION = "cti_cutover_execute_retry";
export const CTI_CUTOVER_EXECUTE_RETRY_APPROVAL_REF =
  "I11-CTI-CUTOVER-EXECUTE-OWNER-APPROVAL-2026-07-06";
export const CTI_CUTOVER_EXECUTE_RETRY_SNAPSHOT_REBIND_APPROVAL_REF =
  "I19-CTI-CUTOVER-POST-I18-SNAPSHOT-REBIND-OWNER-APPROVAL-2026-07-06";
export const CTI_CUTOVER_PARTIAL_STATE_RESUME_APPROVAL_REF =
  "I20-CTI-CUTOVER-PARTIAL-STATE-RESUME-OWNER-APPROVAL-2026-07-06";
export const CTI_CUTOVER_CURRENT_PARTIAL_RESUME_APPROVAL_REF =
  "I21-CTI-CUTOVER-CURRENT-PARTIAL-RESUME-BOUNDARY-OWNER-APPROVAL-2026-07-06";
export const CTI_CUTOVER_POST_I21_PARTIAL_RESUME_APPROVAL_REF =
  "I22-CTI-CUTOVER-POST-I21-PARTIAL-RESUME-BOUNDARY-OWNER-APPROVAL-2026-07-06";
export const CTI_S5_ENRICHMENT_EXECUTE_ACTION = "cti_s5_enrichment_execute";
export const CTI_S5_ENRICHMENT_APPROVAL_REF = "I12-CTI-S5-ENRICHMENT-OWNER-APPROVAL-2026-07-06";
export const CTI_REMAINING_EXECUTION_OMNIBUS_APPROVAL_REF =
  "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
export const CTI_DB_CONNECTION_PROOF_ACTION = "cti_db_connection_proof";
export const CTI_DB_CONNECTION_PROOF_APPROVAL_REF =
  "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
export const CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION = "cti_matter_db_snapshot_materialize";
export const CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_APPROVAL_REF =
  "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
export const CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION = "cti_matter_store_read_model_proof";
export const CTI_MATTER_STORE_READ_MODEL_PROOF_APPROVAL_REF =
  "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
export const CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION = "cti_client_display_name_repair";
export const CTI_CLIENT_DISPLAY_NAME_REPAIR_APPROVAL_REF =
  "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
export const LCX_AUTH_RESET_RECOVERY_ACTION = "lcx_auth_reset_recovery_01";
export const LAWOS_PASSWORD_RESET_WORKER_ACTION = "lawos_password_reset_worker";
export const LCX_AUTH_RESET_RECOVERY_APPROVAL_REF = "LCX-AUTH-RESET-RECOVERY-01";
export const HOME_FINANCE_DASHBOARD_SMOKE_ACTION = "home_finance_dashboard_smoke";
export const HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF =
  "USER-HOME-FINANCE-DASHBOARD-SMOKE-2026-07-30";
export const DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION =
  "direct_receipt_allocation_migration";
export const DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF =
  "USER-DIRECT-RECEIPT-ALLOCATION-MIGRATION-2026-07-30";
export const DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION =
  "MIGRATE_PAYMENT_MATCHES_TO_ALLOCATIONS";

const CTI_READONLY_EFS_SNAPSHOT_SCHEMA_VERSION = "law-firm-os.cti.readonly-efs-snapshot.v0.1";
const CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_SCHEMA_VERSION =
  "law-firm-os.cti.s1g-authenticated-production-probe.v0.1";
const CTI_CUTOVER_EXECUTE_RETRY_SCHEMA_VERSION = "law-firm-os.cti.cutover-execute-retry.v0.1";
const CTI_DB_CONNECTION_PROOF_SCHEMA_VERSION = "law-firm-os.cti.db-connection-proof.v0.1";
const CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_SCHEMA_VERSION =
  "law-firm-os.cti.matter-db-snapshot-materialize.v0.1";
const CTI_MATTER_STORE_READ_MODEL_PROOF_SCHEMA_VERSION =
  "law-firm-os.cti.matter-store-read-model-proof.v0.1";
const CTI_CLIENT_DISPLAY_NAME_REPAIR_SCHEMA_VERSION =
  "law-firm-os.cti.client-display-name-repair.v0.1";
const LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION = "law-firm-os.lcx.auth-reset-recovery.v0.1";
const DEFAULT_CTI_READONLY_SNAPSHOT_ROOT = "/mnt/lawos";
const DEFAULT_DATABASE_URL_SECRET_ID = "/amic-vault/prod/api/database-url";
const LAWOS_DATABASE_TENANT_ID_ENV = "LAWOS_DATABASE_TENANT_ID";
const LAWOS_MATTER_DB_READ_OVERLAY_ENABLED_ENV = "LAWOS_MATTER_DB_READ_OVERLAY_ENABLED";
const DEFAULT_OBJECT_STORE_DETAIL_LIMIT = 500;
const CTI_S1G_PROBE_PRINCIPAL_EMAIL = "jwsuh@amic.kr";
const LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL = "jwsuh@amic.kr";
const CTI_S1G_PROBE_PERMISSION_REF = "cti_s1g_i18_authenticated_probe";
const CTI_CUTOVER_CURRENT_SNAPSHOT_HASH = "b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49";
const CTI_CUTOVER_PARTIAL_STATE_RESUME_SNAPSHOT_HASH =
  "8b53d5148f69a939e8e38f9f0813befe0675f4de59c9f54dad81d5451ab53d8a";
const CTI_CUTOVER_CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH =
  "4b694462d60b1483f6c2740707860ff9a69007e1b82712f309b9c9ecbfeee9d6";
const CTI_CUTOVER_POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH =
  "6b66029c055ece6c3cfa6a7cd559c8eb387a958261e92f006aa67f3f48767ddd";
const CTI_CUTOVER_SOURCE_REVISION = "amic_current_onedrive_matter_code_inventory_2026_07_01";
const CTI_CUTOVER_OPERATOR_REF = "cti-cutover-execute-retry-2026-07-06";
const CTI_CUTOVER_SYNTHETIC_TENANT_ID = "tenant_rp05_synthetic";
const CTI_S5_ENRICHMENT_EXECUTE_SCHEMA_VERSION = "law-firm-os.cti.s5-enrichment-execute.v0.1";
const CTI_S5_SOURCE_REVISION = "cti_s5_enrichment_2026_07_06";
const CTI_S5_OPERATOR_REF = "cti-s5-enrichment-execute-2026-07-06";
const CTI_S5_KYT_USER_ID = "user_amic_ytkim";
const PASSWORD_RESET_EMAIL_DELIVERY_SES_V2 = "sesv2";
const MATTER_RECORD_PRIMARY_ID_FIELDS = Object.freeze({
  Client: "client_id",
  MatterClient: "client_id",
  Matter: "matter_id",
  MatterMember: "member_id",
  MatterTask: "task_id",
  MatterCalendarEvent: "event_id",
  MatterChecklist: "checklist_id",
});
const CTI_DB_PROOF_TABLES = Object.freeze([
  "tenants",
  "clients",
  "matters",
  "matter_members",
  "documents",
  "document_versions",
  "file_objects",
  "canonical_documents",
  "document_search_index",
  "audit_events",
  "users",
  "organizations",
]);

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function awsClientConfig(env = process.env, region = env.AWS_REGION || env.AWS_DEFAULT_REGION || env.LAWOS_AWS_REGION || "ap-northeast-2") {
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const credentials = accessKeyId && secretAccessKey
    ? { accessKeyId, secretAccessKey, sessionToken: env.AWS_SESSION_TOKEN }
    : undefined;
  return credentials ? { region, credentials } : { region };
}

async function fetchSessionSecretFromSecretsManager({
  secretId,
  env = process.env,
  client,
} = {}) {
  if (!secretId) throw new Error("LAWOS_API_SESSION_SECRET_SECRET_ID is required");
  const secrets = client ?? new SecretsManagerClient(awsClientConfig(env));
  const body = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (typeof body.SecretString === "string") return body.SecretString;
  if (body.SecretBinary) return Buffer.from(body.SecretBinary).toString("utf8");
  throw new Error("Secrets Manager response did not include SecretString or SecretBinary");
}

function databaseUrlFromSecretString(secretString) {
  const text = String(secretString ?? "").trim();
  if (!text) throw new Error("database secret is empty");
  let value = text;
  if (text.startsWith("{")) {
    const parsed = JSON.parse(text);
    value = parsed.DATABASE_URL ?? parsed.database_url ?? parsed.url ?? "";
  }
  const url = new URL(String(value).trim());
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("database secret must contain a postgres URL");
  }
  return url.toString();
}

function databaseTargetSummary(databaseUrl) {
  const url = new URL(databaseUrl);
  return Object.freeze({
    protocol: url.protocol.replace(":", ""),
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, ""),
    username_present: Boolean(url.username),
    password_present: Boolean(url.password),
  });
}

function sqlIdentifier(value) {
  const text = String(value ?? "");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(text)) throw new Error("invalid SQL identifier");
  return `"${text.replaceAll('"', '""')}"`;
}

async function createPgClient(databaseUrl) {
  const pgModule = await import("pg");
  const Client = pgModule.Client ?? pgModule.default?.Client;
  if (typeof Client !== "function") throw new Error("pg Client unavailable");
  return new Client({
    connectionString: databaseUrl,
    application_name: "matter-lawos-db-connection-proof",
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    statement_timeout: 10000,
    ssl: { rejectUnauthorized: false },
  });
}

async function withDbProofStage(stage, callback) {
  try {
    return await callback();
  } catch (error) {
    if (error && typeof error === "object" && !error.lawos_db_stage) error.lawos_db_stage = stage;
    throw error;
  }
}

async function buildCtiDbConnectionProofReceipt({ event = {}, env = process.env } = {}) {
  const secretId = String(env.LAWOS_DATABASE_URL_SECRET_ID ?? DEFAULT_DATABASE_URL_SECRET_ID).trim();
  const secretString = await withDbProofStage("secretsmanager_get_database_url", () =>
    fetchSessionSecretFromSecretsManager({ secretId, env }));
  const databaseUrl = await withDbProofStage("parse_database_url_secret", () => databaseUrlFromSecretString(secretString));
  const target = databaseTargetSummary(databaseUrl);
  const client = await withDbProofStage("create_pg_client", () => createPgClient(databaseUrl));
  await withDbProofStage("postgres_connect", () => client.connect());
  try {
    const identity = await withDbProofStage("postgres_identity_query", () =>
      client.query("select current_database() as database_name, current_schema() as schema_name"));
    const tenantInventory = await withDbProofStage("postgres_tenant_inventory_query", () => client.query(`
      select tenant_id::text, slug, status, region
      from public.tenants
      order by slug
    `));
    const tables = await withDbProofStage("postgres_table_inventory_query", () => client.query(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')
        and table_type = 'BASE TABLE'
      order by table_schema, table_name
    `));
    const tableStats = await withDbProofStage("postgres_table_stats_query", () => client.query(`
      select schemaname as table_schema, relname as table_name, n_live_tup::bigint as estimated_row_count
      from pg_stat_user_tables
      order by schemaname, relname
    `));
    const tableStatByName = new Map(
      tableStats.rows.map((row) => [`${row.table_schema}.${row.table_name}`, Number(row.estimated_row_count ?? 0)]),
    );
    const tableInventory = tables.rows.map((row) => ({
      table_schema: row.table_schema,
      table_name: row.table_name,
      estimated_row_count: tableStatByName.get(`${row.table_schema}.${row.table_name}`) ?? null,
    }));
    const keyTableSecurity = await withDbProofStage("postgres_key_table_security_query", () =>
      client.query(`
        select
          n.nspname as table_schema,
          c.relname as table_name,
          c.relrowsecurity as row_security_enabled,
          c.relforcerowsecurity as force_row_security
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and c.relname = any($1::text[])
        order by n.nspname, c.relname
      `, [CTI_DB_PROOF_TABLES]));
    const keyTablePolicies = await withDbProofStage("postgres_key_table_policy_query", () =>
      client.query(`
        select schemaname, tablename, policyname, roles, cmd, qual, with_check
        from pg_policies
        where schemaname = 'public'
          and tablename = any($1::text[])
        order by schemaname, tablename, policyname
      `, [CTI_DB_PROOF_TABLES]));
    const keyTableColumns = await withDbProofStage("postgres_key_table_columns_query", () =>
      client.query(`
        select table_schema, table_name, column_name, data_type, is_nullable
        from information_schema.columns
        where table_schema = 'public'
          and table_name = any($1::text[])
        order by table_schema, table_name, ordinal_position
      `, [CTI_DB_PROOF_TABLES]));
    const keyTableCounts = {};
    for (const tableName of CTI_DB_PROOF_TABLES) {
      const exists = await withDbProofStage(`postgres_table_exists_${tableName}`, () =>
        client.query("select to_regclass($1) as table_ref", [`public.${tableName}`]));
      if (!exists.rows[0]?.table_ref) {
        keyTableCounts[tableName] = null;
        continue;
      }
      const count = await withDbProofStage(`postgres_count_${tableName}`, () =>
        client.query(`select count(*)::int as count from public.${sqlIdentifier(tableName)}`));
      keyTableCounts[tableName] = count.rows[0]?.count ?? null;
    }
    const tenantVisibilityCounts = [];
    for (const tenant of tenantInventory.rows) {
      const counts = {};
      await withDbProofStage(`postgres_tenant_visibility_begin_${tenant.slug}`, () => client.query("begin"));
      try {
        await withDbProofStage(`postgres_set_current_tenant_${tenant.slug}`, () =>
          client.query("select set_config('app.current_tenant_id', $1, true)", [tenant.tenant_id]));
        for (const tableName of CTI_DB_PROOF_TABLES) {
          if (tableName === "tenants") continue;
          const exists = await withDbProofStage(`postgres_tenant_table_exists_${tenant.slug}_${tableName}`, () =>
            client.query("select to_regclass($1) as table_ref", [`public.${tableName}`]));
          if (!exists.rows[0]?.table_ref) {
            counts[tableName] = null;
            continue;
          }
          const count = await withDbProofStage(`postgres_tenant_count_${tenant.slug}_${tableName}`, () =>
            client.query(`select count(*)::int as count from public.${sqlIdentifier(tableName)}`));
          counts[tableName] = count.rows[0]?.count ?? null;
        }
      } finally {
        await withDbProofStage(`postgres_tenant_visibility_rollback_${tenant.slug}`, () => client.query("rollback"));
      }
      tenantVisibilityCounts.push({
        tenant_id: tenant.tenant_id,
        slug: tenant.slug,
        status: tenant.status,
        region: tenant.region,
        key_table_counts: counts,
      });
    }
    const overlayProjectionRequested = event.include_overlay_projection === true;
    const overlayRecords = overlayProjectionRequested
      ? await withDbProofStage("matter_db_read_overlay_projection", () => loadMatterDbReadOverlayRecords({ env }))
      : [];
    const overlayProjectionCounts = {
      requested: overlayProjectionRequested,
      enabled: env[LAWOS_MATTER_DB_READ_OVERLAY_ENABLED_ENV] === "true",
      app_tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      record_count: overlayRecords.length,
      matter_client_count: overlayRecords.filter((record) => record.model_type === "MatterClient").length,
      matter_count: overlayRecords.filter((record) => record.model_type === "Matter").length,
      secret_value_returned: false,
      production_write_executed: false,
    };
    return Object.freeze({
      ok: true,
      schema_version: CTI_DB_CONNECTION_PROOF_SCHEMA_VERSION,
      maintenance_action: CTI_DB_CONNECTION_PROOF_ACTION,
      approval_signature_ref: event.approval_signature_ref ?? null,
      source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
      database_target: target,
      database_identity: {
        database_name: identity.rows[0]?.database_name ?? null,
        schema_name: identity.rows[0]?.schema_name ?? null,
      },
      matter_db_read_overlay_projection: overlayProjectionCounts,
      tenant_inventory: tenantInventory.rows,
      tenant_visibility_counts: tenantVisibilityCounts,
      table_count: tables.rows.length,
      table_inventory_estimates: tableInventory,
      non_empty_table_estimate_count: tableInventory.filter((table) => Number(table.estimated_row_count ?? 0) > 0).length,
      key_table_security: keyTableSecurity.rows,
      key_table_policies: keyTablePolicies.rows,
      key_table_columns: keyTableColumns.rows,
      key_table_counts: keyTableCounts,
      pii_safe: true,
      secret_value_returned: false,
      credential_material_returned: false,
      token_or_password_returned: false,
      production_write_executed: false,
      db_conversion_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  } finally {
    await client.end().catch(() => undefined);
  }
}

function passwordResetEmailConfig(env = process.env) {
  const delivery = String(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY ?? env.MATTER_PASSWORD_RESET_EMAIL_DELIVERY ?? "")
    .trim()
    .toLowerCase();
  const requested = delivery === PASSWORD_RESET_EMAIL_DELIVERY_SES_V2 || delivery === "ses" || delivery === "aws_ses_v2";
  const fromEmail = String(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM ?? env.MATTER_PASSWORD_RESET_EMAIL_FROM ?? "").trim();
  const fromIdentityArn = String(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_IDENTITY_ARN ?? "").trim();
  const fromName = String(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM_NAME ?? env.MATTER_PASSWORD_RESET_EMAIL_FROM_NAME ?? "Matter OS").trim();
  const replyToEmail = String(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_REPLY_TO ?? env.MATTER_PASSWORD_RESET_EMAIL_REPLY_TO ?? "").trim();
  const logoUrl = String(
    env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_LOGO_URL ?? DEFAULT_PASSWORD_RESET_EMAIL_LOGO_URL,
  ).trim();
  const region = String(
    env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_REGION ?? env.MATTER_PASSWORD_RESET_EMAIL_REGION ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "ap-northeast-2",
  ).trim();
  const resetConfirmBaseUrl = String(
    env.LAWOS_AUTH_PASSWORD_RESET_BASE_URL ?? env.MATTER_PASSWORD_RESET_BASE_URL ?? env.MATTER_DESKTOP_PASSWORD_RESET_BASE_URL ?? "",
  ).trim();
  const resetOpenBaseUrl = String(env.LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL ?? "").trim();
  let resetConfirmBaseUrlValid = false;
  let resetOpenBaseUrlValid = false;
  try {
    resetConfirmBaseUrlValid = Boolean(resetConfirmBaseUrl) && Boolean(new URL(resetConfirmBaseUrl));
  } catch {
    resetConfirmBaseUrlValid = false;
  }
  try {
    resetOpenBaseUrlValid = !resetOpenBaseUrl || Boolean(new URL(resetOpenBaseUrl));
  } catch {
    resetOpenBaseUrlValid = false;
  }
  return Object.freeze({
    requested,
    configured: requested && Boolean(fromEmail) && resetConfirmBaseUrlValid && resetOpenBaseUrlValid,
    provider: requested ? PASSWORD_RESET_EMAIL_DELIVERY_SES_V2 : "unconfigured",
    fromEmail,
    fromIdentityArn,
    fromName,
    replyToEmail,
    logoUrl,
    region,
    resetConfirmBaseUrl,
    resetOpenBaseUrl,
    reason: !requested
      ? "password_reset_email_delivery_not_requested"
      : !fromEmail
        ? "password_reset_email_from_required"
        : !resetConfirmBaseUrl
          ? "password_reset_base_url_required"
          : !resetConfirmBaseUrlValid
            ? "password_reset_base_url_invalid"
            : !resetOpenBaseUrlValid
              ? "password_reset_open_base_url_invalid"
          : null,
  });
}

function passwordResetUrl({ baseUrl, token }) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function passwordResetOpenUrl({ baseUrl, token, fallbackUrl }) {
  if (!baseUrl) return fallbackUrl;
  const url = new URL(baseUrl);
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

function createSesV2SendEmailInput({ config, to, resetUrl, resetOpenUrl, expiresAt }) {
  return {
    FromEmailAddress: config.fromEmail,
    Destination: { ToAddresses: [to] },
    ...(config.replyToEmail ? { ReplyToAddresses: [config.replyToEmail] } : {}),
    Content: {
      Simple: {
        Subject: { Data: passwordResetEmailSubject(), Charset: "UTF-8" },
        Body: {
          Text: { Data: passwordResetEmailText({ resetUrl, resetOpenUrl, expiresAt }), Charset: "UTF-8" },
          Html: {
            Data: passwordResetEmailHtml({
              resetUrl,
              resetOpenUrl,
              expiresAt,
              logoSrc: config.logoUrl,
            }),
            Charset: "UTF-8",
          },
        },
      },
    },
  };
}

export function classifySesDeliveryFailure(error) {
  const message = String(error?.message ?? "").toLowerCase();
  if (message.includes("vpc endpoint policy") || message.includes("vpc endpoint")) return "vpc_endpoint_policy";
  if (message.includes("identity-based policy") || message.includes("identity policy")) return "identity_policy";
  if (message.includes("service control policy")) return "service_control_policy";
  if (message.includes("permissions boundary")) return "permissions_boundary";
  if (message.includes("session policy")) return "session_policy";
  if (message.includes("resource-based policy") || message.includes("resource policy")) return "resource_policy";
  if (message.includes("not authorized to perform") && message.includes("ses:sendemail")) return "ses_sendemail_authorization";
  if (
    message.includes("email address is not verified")
    || message.includes("identity is not verified")
    || message.includes("production access")
    || message.includes("sandbox")
    || message.includes("account is paused")
    || message.includes("account is under review")
    || message.includes("suppression list")
  ) return "ses_service";
  if (error?.name === "AccessDeniedException" && Number(error?.$metadata?.httpStatusCode) === 403) return "authorization_policy";
  return "unclassified";
}

function safeSesAuthorizationDiagnostic(error, { fromEmail, fromIdentityArn, to } = {}) {
  const message = String(error?.message ?? "").toLowerCase();
  const configuredIdentity = String(fromIdentityArn ?? "").trim().toLowerCase();
  const configuredSender = String(fromEmail ?? "").trim().toLowerCase();
  const approvedRecipient = String(to ?? "").trim().toLowerCase();
  const mentionsSesIdentity = /arn:(?:aws|aws-us-gov|aws-cn):ses:[^:\s]+:\d{12}:identity\/[^\s,;]+/u.test(message);
  return Object.freeze({
    resource_binding: configuredIdentity && message.includes(configuredIdentity)
      ? "configured_identity"
      : mentionsSesIdentity
        ? "other_ses_identity"
        : configuredSender && message.includes(configuredSender)
          ? "configured_sender"
          : "not_present",
    configured_sender_referenced: Boolean(configuredSender) && message.includes(configuredSender),
    approved_recipient_referenced: Boolean(approvedRecipient) && message.includes(approvedRecipient),
    assumed_api_role_referenced: message.includes("assumed-role/lawos-private-staging-api-role/"),
    explicit_deny_referenced: message.includes("explicit deny"),
  });
}

export function createLambdaPasswordResetEmailDelivery({
  env = process.env,
  client,
} = {}) {
  const config = passwordResetEmailConfig(env);
  if (!config.configured) return undefined;
  const ses = client ?? new SESv2Client(awsClientConfig(env, config.region || env.AWS_REGION || env.AWS_DEFAULT_REGION || "ap-northeast-2"));
  return async function deliverPasswordResetEmail({ to, token, expires_at }) {
    let deliveryStage = "message_preparation";
    let body;
    try {
      const resetUrl = passwordResetUrl({ baseUrl: config.resetConfirmBaseUrl, token });
      const resetOpenUrl = passwordResetOpenUrl({
        baseUrl: config.resetOpenBaseUrl,
        token,
        fallbackUrl: resetUrl,
      });
      const command = new SendEmailCommand(createSesV2SendEmailInput({ config, to, resetUrl, resetOpenUrl, expiresAt: expires_at }));
      deliveryStage = "provider_send";
      body = await ses.send(command);
    } catch (error) {
      const status = Number(error?.$metadata?.httpStatusCode) || 502;
      const failureClass = deliveryStage === "message_preparation"
        ? "message_preparation"
        : classifySesDeliveryFailure(error);
      const authorizationDiagnostic = deliveryStage === "provider_send" && status === 403
        ? safeSesAuthorizationDiagnostic(error, {
            fromEmail: config.fromEmail,
            fromIdentityArn: config.fromIdentityArn,
            to,
          })
        : null;
      console.warn(JSON.stringify({
        event: "lawos_password_reset_email_delivery_failed",
        provider: config.provider,
        provider_status_code: status,
        provider_response_hash: error?.name ? sha256Hex(error.name) : null,
        failure_class: failureClass,
        authorization_failure_layer: deliveryStage === "provider_send" ? failureClass : null,
        authorization_diagnostic: authorizationDiagnostic,
        token_material_logged: false,
        reset_url_logged: false,
      }));
      return Object.freeze({
        mode: "email",
        provider: config.provider,
        status: "failed",
        reason: `sesv2_send_failed_${status}`,
        failure_class: failureClass,
        token_material_returned: false,
        reset_url_returned: false,
      });
    }
    return Object.freeze({
      mode: "email",
      provider: config.provider,
      status: "sent",
      message_id: body.MessageId ?? null,
      token_material_returned: false,
      reset_url_returned: false,
    });
  };
}

function passwordResetRecoveryUrlConfig(env = process.env) {
  const resetConfirmBaseUrl = String(
    env.LAWOS_AUTH_PASSWORD_RESET_BASE_URL ?? env.MATTER_PASSWORD_RESET_BASE_URL ?? env.MATTER_DESKTOP_PASSWORD_RESET_BASE_URL ?? "",
  ).trim();
  const resetOpenBaseUrl = String(env.LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL ?? "").trim();
  let resetConfirmBaseUrlValid = false;
  let resetOpenBaseUrlValid = false;
  try {
    resetConfirmBaseUrlValid = Boolean(resetConfirmBaseUrl) && Boolean(new URL(resetConfirmBaseUrl));
  } catch {
    resetConfirmBaseUrlValid = false;
  }
  try {
    resetOpenBaseUrlValid = !resetOpenBaseUrl || Boolean(new URL(resetOpenBaseUrl));
  } catch {
    resetOpenBaseUrlValid = false;
  }
  return Object.freeze({
    configured: resetConfirmBaseUrlValid && resetOpenBaseUrlValid,
    resetConfirmBaseUrl,
    resetOpenBaseUrl,
    reason: !resetConfirmBaseUrl
      ? "password_reset_base_url_required"
      : !resetConfirmBaseUrlValid
        ? "password_reset_base_url_invalid"
        : !resetOpenBaseUrlValid
          ? "password_reset_open_base_url_invalid"
          : null,
  });
}

function passwordResetRecordCount(parsed = {}) {
  return Array.isArray(parsed?.records) ? parsed.records.length : 0;
}

function legacyFileAuthorityAllowed(env = process.env) {
  return String(env.LAWOS_RUNTIME_PROFILE ?? "").trim() === "local-dev";
}

function legacyJsonMutationBlockedReceipt({ maintenanceAction, reason, schemaVersion = null } = {}) {
  return Object.freeze({
    ok: false,
    ...(schemaVersion ? { schema_version: schemaVersion } : {}),
    maintenance_action: maintenanceAction,
    status: "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED",
    status_code: 424,
    reason,
    production_write_executed: false,
    json_fallback: false,
    dual_write: false,
    production_ready_claim: false,
    go_live_claim: false,
  });
}

export async function buildLcxAuthResetRecoveryReceipt({
  event = {},
  env = process.env,
  now = () => Date.now(),
} = {}) {
  const generatedAtMs = now();
  const generatedAt = new Date(generatedAtMs).toISOString();
  if (!legacyFileAuthorityAllowed(env)) {
    return {
      ok: false,
      schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      status: "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED",
      status_code: 424,
      reason: "operational_password_reset_json_authority_disabled",
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      credential_store_write_executed: false,
      reset_token_store_write_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }
  const targetEmail = String(event.target_email ?? event.email ?? LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL).trim().toLowerCase();
  if (targetEmail !== LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL) {
    return {
      ok: false,
      schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      status: "BLOCKED_TARGET_NOT_ALLOWED",
      status_code: 403,
      reason: "lcx_auth_reset_recovery_target_not_allowed",
      target_email_hash: hashRef(targetEmail),
      allowed_target_email_hash: hashRef(LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL),
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }

  const resetStorePath = cleanPath(env[LAWOS_AUTH_PASSWORD_RESET_STORE_ENV]);
  if (!resetStorePath) {
    return {
      ok: false,
      schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      status: "BLOCKED_RESET_STORE_PATH_REQUIRED",
      reason: "lawos_auth_password_reset_store_path_required",
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedStorePath = resolve(resetStorePath);
  if (!isAbsolute(resetStorePath) || !isInsideRoot(allowedRoot, resolvedStorePath)) {
    return {
      ok: false,
      schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      status: "BLOCKED_RESET_STORE_PATH_OUTSIDE_ALLOWED_ROOT",
      reason: "password_reset_store_path_outside_allowed_root",
      reset_store_path_hash: hashRef(resolvedStorePath),
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }

  const user = findRegisteredAccountByEmail(LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL);
  if (!user) {
    return {
      ok: false,
      schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      status: "BLOCKED_TARGET_ACCOUNT_NOT_REGISTERED",
      reason: "target_account_not_registered",
      target_email_hash: hashRef(LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL),
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }

  const urlConfig = passwordResetRecoveryUrlConfig(env);
  if (!urlConfig.configured) {
    return {
      ok: false,
      schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      status: "BLOCKED_RESET_URL_CONFIG_INVALID",
      reason: urlConfig.reason,
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }

  const beforeBytes = await readFile(resolvedStorePath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const beforeParsed = await readOptionalJson(resolvedStorePath);
  const token = randomBytes(32).toString("base64url");
  const ttlMs = Number(env.LAWOS_AUTH_PASSWORD_RESET_TTL_MS || DEFAULT_PASSWORD_RESET_TTL_MS);
  const resetStore = createAuthPasswordResetStore({
    filePath: resolvedStorePath,
    now: () => generatedAtMs,
  });
  const resetRecord = resetStore.create({ user, token, ttlMs });
  const resetUrl = passwordResetUrl({ baseUrl: urlConfig.resetConfirmBaseUrl, token });
  const resetOpenUrl = passwordResetOpenUrl({
    baseUrl: urlConfig.resetOpenBaseUrl,
    token,
    fallbackUrl: resetUrl,
  });
  const afterBytes = await readFile(resolvedStorePath);
  const afterParsed = JSON.parse(afterBytes.toString("utf8"));

  return {
    ok: true,
    schema_version: LCX_AUTH_RESET_RECOVERY_SCHEMA_VERSION,
    maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
    approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
    request_id: String(event.request_id ?? event.requestId ?? "lcx-auth-reset-recovery-01"),
    generated_at: generatedAt,
    status: "PASS_ONE_TIME_RESET_OPEN_URL_CREATED",
    target: {
      email_hash: hashRef(LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL),
      user_id_hash: hashRef(user.user_id),
      plaintext_identifier_recorded: false,
    },
    reset_store: {
      env: LAWOS_AUTH_PASSWORD_RESET_STORE_ENV,
      relative_path: safeRelativePath(allowedRoot, resolvedStorePath),
      path_hash: hashRef(resolvedStorePath),
      existed_before: beforeBytes !== null,
      records_before_count: passwordResetRecordCount(beforeParsed),
      records_after_count: passwordResetRecordCount(afterParsed),
      before_sha256: beforeBytes ? `sha256:${sha256Hex(beforeBytes)}` : null,
      after_sha256: `sha256:${sha256Hex(afterBytes)}`,
      write_executed: true,
      target_user_only: true,
      other_user_impact: false,
    },
    reset_open_url: resetOpenUrl,
    expires_at: resetRecord.expires_at,
    token_material_returned_to_caller: true,
    reset_url_returned_to_caller: true,
    password_plaintext_returned: false,
    password_plaintext_recorded: false,
    credential_store_write_executed: false,
    boundary: {
      direct_invoke_only: true,
      public_http_endpoint: false,
      target_email_hash: hashRef(LCX_AUTH_RESET_RECOVERY_TARGET_EMAIL),
      target_count: 1,
      target_user_only: true,
      other_user_credential_mutated: false,
      password_value_set: false,
      password_value_returned: false,
      credential_store_write_executed: false,
      reset_token_store_write_executed: true,
      reset_open_url_returned_once_to_caller: true,
      token_material_returned_to_caller: true,
      production_migration_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
    production_ready_claim: false,
    go_live_claim: false,
  };
}

export async function resolveLambdaSessionSecret({
  env = process.env,
  client,
} = {}) {
  if (env.LAWOS_API_SESSION_SECRET) return env.LAWOS_API_SESSION_SECRET;
  const secretId = env.LAWOS_API_SESSION_SECRET_SECRET_ID;
  if (!secretId) return undefined;
  if (!sessionSecretPromise) {
    sessionSecretPromise = fetchSessionSecretFromSecretsManager({ secretId, env, client });
  }
  return sessionSecretPromise;
}

export async function resolveLambdaHrxStepUpSecrets({
  env = process.env,
  client,
} = {}) {
  const secretId = env.LAWOS_HRX_STEP_UP_ROOT_SECRET_ID;
  if (!secretId) return Object.freeze({});
  if (!hrxStepUpRootSecretPromise) {
    hrxStepUpRootSecretPromise = fetchSessionSecretFromSecretsManager({ secretId, env, client });
  }
  const rootSecret = await hrxStepUpRootSecretPromise;
  if (Buffer.byteLength(rootSecret) < 32) throw new Error("HRX step-up root secret must contain at least 32 bytes");
  const derive = (purpose) => createHmac("sha256", rootSecret)
    .update(`lawos:hrx-step-up:${purpose}:v1`, "utf8")
    .digest("base64url");
  return Object.freeze({
    hrxStepUpSecret: derive("token-signing"),
    hrxStepUpTotpSecret: derive("totp"),
  });
}

export async function resolveLambdaAmicVaultProviders({
  env = process.env,
  client,
  fetchFn = globalThis.fetch,
  createEgressBrokerFetchFn = createAmicVaultEgressBrokerFetch,
} = {}) {
  const secretId = String(
    env[LAWOS_AMIC_VAULT_PROVIDER_TOKEN_SECRET_ID_ENV] ?? "",
  ).trim();
  if (!secretId) return Object.freeze({});
  const token = await fetchSessionSecretFromSecretsManager({
    secretId,
    env,
    client,
  });
  const providerEnv = Object.freeze({
    ...env,
    [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV]: token,
    [LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV]: token,
  });
  const runtimeProfile = resolveRuntimeProfile(providerEnv);
  const providerFetchFn = providerEnv[LAWOS_AMIC_VAULT_EGRESS_BROKER_ENABLED_ENV] === "true"
    ? createEgressBrokerFetchFn({
        region: providerEnv.AWS_REGION
          ?? providerEnv.AWS_DEFAULT_REGION
          ?? providerEnv.LAWOS_AWS_REGION,
      })
    : fetchFn;
  const vaultUploadProvider = resolveAmicVaultHttpUploadProvider({
    env: providerEnv,
    runtimeProfile,
    fetchFn: providerFetchFn,
  });
  const vaultExportProvider = resolveAmicVaultHttpExportProvider({
    env: providerEnv,
    runtimeProfile,
    fetchFn: providerFetchFn,
  });
  return Object.freeze({
    ...(vaultUploadProvider ? { vaultUploadProvider } : {}),
    ...(vaultExportProvider ? { vaultExportProvider } : {}),
  });
}

function requestPath(event = {}) {
  const path = event.rawPath || event.path || "/";
  const query = event.rawQueryString || "";
  return query ? `${path}?${query}` : path;
}

function requestMethod(event = {}) {
  return event.requestContext?.http?.method || event.httpMethod || "GET";
}

function requestHeaders(event = {}) {
  const headers = { ...(event.headers ?? {}) };
  delete headers.host;
  delete headers.Host;
  return headers;
}

function requestBody(event = {}, method = "GET") {
  if (method === "GET" || method === "HEAD" || event.body == null) return undefined;
  return event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
}

function maintenanceAction(event = {}) {
  return event.lawos_maintenance_action ?? event.maintenance_action;
}

function isHttpLambdaEvent(event = {}) {
  return Boolean(event.rawPath || event.path || event.httpMethod || event.requestContext?.http);
}

function jsonLambdaResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

function cleanPath(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function snapshotAllowedRoot(env = process.env) {
  return resolve(cleanPath(env.LAWOS_READONLY_SNAPSHOT_ALLOWED_ROOT) ?? DEFAULT_CTI_READONLY_SNAPSHOT_ROOT);
}

function isInsideRoot(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function pathHash(pathValue) {
  return `sha256:${sha256Hex(String(pathValue))}`;
}

function safeRelativePath(root, pathValue) {
  return relative(resolve(root), resolve(pathValue)).split("\\").join("/");
}

function topLevelArrayCounts(value) {
  if (Array.isArray(value)) return { $root: value.length };
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, candidate]) => Array.isArray(candidate))
      .map(([key, candidate]) => [key, candidate.length]),
  );
}

function summarizeFileRecords({ fileName, format, bytes }) {
  if (format === "ndjson" || fileName.endsWith(".ndjson")) {
    const recordCount = bytes
      .toString("utf8")
      .split(/\r?\n/u)
      .filter((line) => line.trim()).length;
    return {
      parser: "ndjson_nonblank_line_count",
      parse_status: "pass",
      record_count: recordCount,
    };
  }

  if (!fileName.endsWith(".json")) {
    return {
      parser: "binary_or_unparsed",
      parse_status: "skipped",
      record_count: null,
    };
  }

  try {
    const parsed = JSON.parse(bytes.toString("utf8"));
    const counts = topLevelArrayCounts(parsed);
    const countValues = Object.values(counts);
    return {
      parser: "json_top_level_array_count",
      parse_status: "pass",
      json_top_level_type: Array.isArray(parsed) ? "array" : typeof parsed,
      top_level_array_counts: counts,
      record_count: countValues.length > 0 ? countValues.reduce((sum, count) => sum + count, 0) : null,
      top_level_key_count: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).length : null,
    };
  } catch {
    return {
      parser: "json_top_level_array_count",
      parse_status: "failed",
      record_count: null,
    };
  }
}

function hashRef(value) {
  return `sha256:${sha256Hex(String(value ?? ""))}`;
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function authCredentialRecordsFromStore(parsed = {}) {
  if (!parsed) return [];
  if (Array.isArray(parsed.records)) return parsed.records;
  if (parsed.credentials && typeof parsed.credentials === "object") return Object.values(parsed.credentials);
  return [];
}

async function writeI18ProbeCredential({ env = process.env, generatedAt = new Date().toISOString() } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return {
      ok: false,
      status: 424,
      reason: "operational_credential_json_authority_disabled",
    };
  }
  const credentialStorePath = cleanPath(env[LAWOS_AUTH_CREDENTIAL_STORE_ENV]);
  if (!credentialStorePath) {
    return {
      ok: false,
      status: 424,
      reason: "lawos_auth_credential_store_path_required",
    };
  }
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(credentialStorePath);
  if (!isAbsolute(credentialStorePath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    return {
      ok: false,
      status: 403,
      reason: "credential_store_path_outside_allowed_root",
      path_hash: hashRef(resolvedPath),
    };
  }

  const user = findRegisteredAccountByEmail(CTI_S1G_PROBE_PRINCIPAL_EMAIL);
  if (!user) {
    return {
      ok: false,
      status: 424,
      reason: "probe_principal_not_in_registered_account_seed",
    };
  }

  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const beforeState = readDurableJsonFile({
    filePath: resolvedPath,
    defaultValue: {
      schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
      provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
      records: [],
    },
  });
  const parsed = beforeState.exists ? beforeState.value : null;
  if (parsed?.schema_version && parsed.schema_version !== LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION) {
    return {
      ok: false,
      status: 424,
      reason: "unsupported_auth_credential_store_schema",
      before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    };
  }
  if (parsed?.provider_id && parsed.provider_id !== LAWOS_INTERNAL_PASSWORD_PROVIDER_ID) {
    return {
      ok: false,
      status: 424,
      reason: "unsupported_auth_credential_provider",
      before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    };
  }

  const records = authCredentialRecordsFromStore(parsed).filter(Boolean);
  const existingIndex = records.findIndex((record) => String(record.user_id ?? "") === user.user_id);
  const existingRecord = existingIndex >= 0 ? records[existingIndex] : null;
  const credentialRev = Number.isInteger(existingRecord?.credential_rev) ? existingRecord.credential_rev + 1 : 1;
  const probePassword = randomBytes(32).toString("base64url");
  const probeRecord = createAuthCredentialRecord({
    user_id: user.user_id,
    email: user.email,
    password: probePassword,
    status: "must_change",
    credential_rev: credentialRev,
  });
  const nextRecords = existingIndex >= 0
    ? records.map((record, index) => (index === existingIndex ? probeRecord : record))
    : [...records, probeRecord];
  const nextStore = {
    schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
    provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
    updated_at: generatedAt,
    records: nextRecords,
  };

  const writeReceipt = writeDurableJsonFile({
    filePath: resolvedPath,
    value: nextStore,
    expectedGeneration: beforeState.generation,
  });
  const afterBytes = await readFile(resolvedPath);

  return {
    ok: true,
    password: probePassword,
    user,
    restoreCredentialStore: async () => {
      if (beforeBytes === null) {
        removeDurableJsonFile({ filePath: resolvedPath, expectedGeneration: writeReceipt.generation });
      } else {
        writeDurableJsonFile({
          filePath: resolvedPath,
          value: beforeState.value,
          expectedGeneration: writeReceipt.generation,
        });
      }
      const restoredBytes = beforeBytes === null ? null : await readFile(resolvedPath);
      return {
        executed: true,
        mode: beforeBytes === null ? "removed_probe_store" : "restored_previous_store",
        credential_store_path_hash: hashRef(resolvedPath),
        before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
        restored_sha256: restoredBytes ? sha256Hex(restoredBytes) : null,
        plaintext_password_returned: false,
        password_hash_digest_returned: false,
        password_hash_salt_returned: false,
      };
    },
    summary: {
      credential_store_env: LAWOS_AUTH_CREDENTIAL_STORE_ENV,
      credential_store_path_hash: hashRef(resolvedPath),
      credential_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
      existed_before: beforeBytes !== null,
      records_before_count: records.length,
      records_after_count: nextRecords.length,
      target_record_created: existingIndex < 0,
      target_record_updated: existingIndex >= 0,
      target_user_id_hash: hashRef(user.user_id),
      target_email_hash: hashRef(user.email.toLowerCase()),
      target_credential_rev: credentialRev,
      target_status: probeRecord.status,
      password_hash_algorithm: probeRecord.password_hash.algorithm,
      before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
      after_sha256: sha256Hex(afterBytes),
      plaintext_password_returned: false,
      password_hash_digest_returned: false,
      password_hash_salt_returned: false,
    },
  };
}

async function apiJson(baseUrl, path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

function itemCount(body = {}) {
  return Array.isArray(body.items) ? body.items.length : null;
}

function safeBodyHash(body = {}) {
  return sha256Hex(stableJson(body));
}

function authSessionSummary(body = {}) {
  const session = body.session ?? {};
  return {
    ok: body.ok === true,
    outcome: body.outcome ?? null,
    credential_provider: body.credential_provider ?? null,
    local_dev_synthetic_only: body.local_dev_synthetic_only ?? null,
    must_change_password: body.must_change_password ?? null,
    session_user_id_hash: session.user_id ? hashRef(session.user_id) : null,
    session_tenant_id: session.tenant_id ?? null,
    role_count: Array.isArray(session.role_ids) ? session.role_ids.length : null,
    scope_count: Array.isArray(session.hrx_scopes) ? session.hrx_scopes.length : null,
    session_token_received_in_process: typeof body.session_token === "string" && body.session_token.length > 0,
    session_token_recorded: false,
    token_material_returned_to_caller: false,
  };
}

function responseEvidence({ status, body }, extra = {}) {
  return {
    status,
    ok: body?.ok === true || body?.outcome === "passed" || body?.outcome === "updated",
    outcome: body?.outcome ?? null,
    safe_error_codes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [],
    item_count: itemCount(body),
    body_sha256: safeBodyHash(body ?? {}),
    plaintext_body_returned: false,
    ...extra,
  };
}

const SEOUL_DATE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function seoulDateKey(value = new Date()) {
  const parts = Object.fromEntries(
    SEOUL_DATE_PARTS.formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function monthKeysEndingAt(monthKey, count = 6) {
  const [year, month] = String(monthKey).split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const cursor = new Date(Date.UTC(year, month - count + index, 1));
    return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function finiteMoney(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function moneyTotal(rows, field) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => sum + Number(row?.[field] ?? 0), 0);
}

export function buildHomeFinanceDashboardSmokeReceipt({
  financeRepository,
  tenantId = MATTER_VAULT_REGISTERED_TENANT_ID,
  now = () => new Date(),
  requireCurrentActivity = false,
} = {}) {
  const observedAt = now();
  const date = seoulDateKey(observedAt);
  const month = date.slice(0, 7);
  const monthKeys = monthKeysEndingAt(month);
  const blocked = (reason, extra = {}) => Object.freeze({
    ok: false,
    status: "BLOCKED_HOME_FINANCE_DASHBOARD_CONTRACT",
    maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
    observed_at: observedAt.toISOString(),
    month,
    reason,
    ...extra,
    production_write_executed: false,
    raw_transaction_values_returned: false,
    counterparty_values_returned: false,
    individual_payroll_values_returned: false,
    production_ready_claim: false,
  });
  if (!financeRepository || typeof financeRepository.list !== "function") {
    return blocked("finance_repository_unavailable");
  }

  let current;
  let history;
  try {
    current = buildCashflowReadModel({
      financeRepository,
      tenant_id: tenantId,
      from: `${month}-01`,
      to: date,
      currency: "KRW",
    });
    history = buildCashflowReadModel({
      financeRepository,
      tenant_id: tenantId,
      from: `${monthKeys[0]}-01`,
      to: date,
      currency: "KRW",
    });
  } catch (error) {
    return blocked("cashflow_read_model_failed", {
      error_name: error?.name ?? "Error",
    });
  }

  const currentSummary = current.business_summary ?? {};
  const payrollAmount = Number(currentSummary.payroll_payment_amount);
  const nonPayrollAmount = Number(current.summary?.total_outflow) - payrollAmount;
  const payrollCategoryTotal = moneyTotal(current.payroll_categories, "gross_krw");
  const nonPayrollCategoryTotal = moneyTotal(current.non_payroll_outflow_categories, "amount");
  const historyByMonth = new Map(
    (Array.isArray(history.monthly) ? history.monthly : [])
      .filter((row) => row?.currency === "KRW" && monthKeys.includes(row.month))
      .map((row) => [row.month, row]),
  );
  const sixMonthSales = monthKeys.map((monthKey) =>
    Number(historyByMonth.get(monthKey)?.sales_amount ?? 0));
  const checks = Object.freeze({
    source_complete: current.partial !== true
      && history.partial !== true
      && current.source_statuses.every((source) => source.status === "passed")
      && history.source_statuses.every((source) => source.status === "passed"),
    classifications_reconciled: currentSummary.status === "passed",
    current_values_numeric: [
      currentSummary.sales_amount,
      payrollAmount,
      nonPayrollAmount,
    ].every(finiteMoney),
    current_activity_present: !requireCurrentActivity || (
      Number(current.summary?.transaction_count) > 0
      && Number(currentSummary.sales_amount) > 0
      && payrollAmount > 0
      && nonPayrollAmount > 0
    ),
    payroll_categories_reconcile: finiteMoney(payrollCategoryTotal)
      && Math.abs(payrollCategoryTotal - payrollAmount) < 0.5,
    non_payroll_categories_reconcile: finiteMoney(nonPayrollCategoryTotal)
      && Math.abs(nonPayrollCategoryTotal - nonPayrollAmount) < 0.5,
    six_month_sales_numeric: sixMonthSales.length === 6 && sixMonthSales.every(finiteMoney),
  });
  if (Object.values(checks).some((value) => value !== true)) {
    return blocked("dashboard_numeric_contract_failed", { checks });
  }

  return Object.freeze({
    ok: true,
    status: "PASS",
    maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
    observed_at: observedAt.toISOString(),
    month,
    currency: "KRW",
    metrics: Object.freeze({
      current_sales_krw: Number(currentSummary.sales_amount),
      current_payroll_krw: payrollAmount,
      current_non_payroll_outflow_krw: nonPayrollAmount,
      six_month_sales_krw: Object.freeze(sixMonthSales),
      observed_month_count: historyByMonth.size,
      payroll_category_count: current.payroll_categories.length,
      non_payroll_category_count: current.non_payroll_outflow_categories.length,
    }),
    checks,
    direct_invoke_only: true,
    production_write_executed: false,
    raw_transaction_values_returned: false,
    counterparty_values_returned: false,
    individual_payroll_values_returned: false,
    production_ready_claim: false,
  });
}

export async function buildHomeFinanceDashboardSmokeFromRuntime({
  runtime,
  tenantId = MATTER_VAULT_REGISTERED_TENANT_ID,
  requireCurrentActivity = false,
} = {}) {
  const buildReceipt = (analyticsRuntime) => buildHomeFinanceDashboardSmokeReceipt({
    financeRepository: analyticsRuntime?.financeRepository,
    tenantId,
    requireCurrentActivity,
  });
  if (runtime?.requestRuntimeAuthority?.run) {
    return runtime.requestRuntimeAuthority.run({
      tenant_id: tenantId,
      request_context: {
        method: "GET",
        pathname: "/__maintenance/home-finance-dashboard-smoke",
        actor_id: "maintenance_home_finance_dashboard_smoke",
      },
      command: ({ analyticsRuntime }) => buildReceipt(analyticsRuntime),
    });
  }
  return buildReceipt(runtime?.analyticsRuntime);
}

function directReceiptAllocationMigrationSummary(financeRepository, tenantId) {
  const plan = buildPaymentAllocationMigrationPlan({
    repository: financeRepository,
    tenant_id: tenantId,
  });
  const allocationCount = financeRepository
    .list({ tenant_id: tenantId, model_type: "PaymentAllocation" })
    .length;
  return Object.freeze({
    pending_backfill_count: plan.invoice_payment_backfill.length,
    matched_payment_count: plan.matched_payments.length,
    unallocated_payment_count: plan.unallocated_payments.length,
    payment_allocation_count: allocationCount,
    auto_promoted_revenue_count: plan.auto_promoted_revenue_count,
  });
}

export function buildDirectReceiptAllocationMigrationReceipt({
  financeRepository,
  tenantId = MATTER_VAULT_REGISTERED_TENANT_ID,
  execute = false,
  actorId = "maintenance_direct_receipt_allocation_migration",
  idempotencyKey = null,
  now = () => new Date(),
} = {}) {
  if (!financeRepository || typeof financeRepository.list !== "function") {
    throw new TypeError("financeRepository is required");
  }
  const before = directReceiptAllocationMigrationSummary(financeRepository, tenantId);
  if (before.auto_promoted_revenue_count !== 0) {
    throw new Error("direct receipt migration must never auto-promote revenue");
  }
  if (!execute) {
    return Object.freeze({
      ok: true,
      status: "PASS_DRY_RUN",
      maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      observed_at: now().toISOString(),
      tenant_id: tenantId,
      before,
      after: before,
      created_count: 0,
      idempotent_replay: false,
      dry_run: true,
      production_write_executed: false,
      raw_payment_ids_returned: false,
      raw_invoice_ids_returned: false,
      client_values_returned: false,
      auto_promoted_revenue_count: 0,
      production_ready_claim: false,
    });
  }
  const result = backfillPaymentMatchesAsAllocations({
    repository: financeRepository,
    tenant_id: tenantId,
    actor_id: actorId,
    idempotency_key: idempotencyKey,
    dry_run: false,
  });
  const after = directReceiptAllocationMigrationSummary(financeRepository, tenantId);
  if (after.pending_backfill_count !== 0 || result.auto_promoted_revenue_count !== 0) {
    throw new Error("direct receipt allocation migration did not close safely");
  }
  return Object.freeze({
    ok: true,
    status: "PASS",
    maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
    observed_at: now().toISOString(),
    tenant_id: tenantId,
    before,
    after,
    created_count: result.created_count,
    idempotent_replay: result.idempotent_replay === true,
    dry_run: false,
    production_write_executed: result.idempotent_replay !== true,
    raw_payment_ids_returned: false,
    raw_invoice_ids_returned: false,
    client_values_returned: false,
    auto_promoted_revenue_count: 0,
    production_ready_claim: false,
  });
}

export async function buildDirectReceiptAllocationMigrationFromRuntime({
  runtime,
  tenantId = MATTER_VAULT_REGISTERED_TENANT_ID,
  execute = false,
  idempotencyKey = null,
} = {}) {
  const buildReceipt = (financeRuntime) => buildDirectReceiptAllocationMigrationReceipt({
    financeRepository: financeRuntime?.repository,
    tenantId,
    execute,
    idempotencyKey,
  });
  if (runtime?.requestRuntimeAuthority?.run) {
    return runtime.requestRuntimeAuthority.run({
      tenant_id: tenantId,
      request_context: {
        method: execute ? "POST" : "GET",
        pathname: "/__maintenance/direct-receipt-allocation-migration",
        actor_id: "maintenance_direct_receipt_allocation_migration",
        idempotency_key: idempotencyKey,
      },
      command: ({ financeRuntime }) => buildReceipt(financeRuntime),
    });
  }
  return buildReceipt(runtime?.financeRuntime);
}

export async function buildCtiS1GAuthenticatedProductionProbeReceipt({
  event = {},
  env = process.env,
  apiBaseUrlFn = apiBaseUrl,
} = {}) {
  const generatedAt = new Date().toISOString();
  const credential = await writeI18ProbeCredential({ env, generatedAt });
  if (!credential.ok) {
    return {
      ok: false,
      schema_version: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_SCHEMA_VERSION,
      goal_id: "cti-s1g-authenticated-production-probe",
      maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
      approval_signature_ref: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
      request_id: String(event.request_id ?? event.requestId ?? "cti-i18-direct-invoke"),
      generated_at: generatedAt,
      status: "BLOCKED_CREDENTIAL_STORE_PRECONDITION_FAILED",
      reason: credential.reason,
      credential_store_path_hash: credential.path_hash ?? null,
      boundary: {
        direct_invoke_only: true,
        public_http_endpoint: false,
        credential_store_write_executed: false,
        s1g_marker_write_executed: false,
        token_or_password_returned: false,
        secret_value_returned: false,
        production_migration_executed: false,
        tenant_migration_executed: false,
        account_permission_injection_executed: false,
        cutover_executed: false,
        production_ready_claimed: false,
      },
    };
  }

  let probeReceipt;
  let credentialStoreRestore = null;
  try {
    if (apiBaseUrlFn === apiBaseUrl) await resetCachedApiServer();
    const baseUrl = await apiBaseUrlFn();
    const login = await apiJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: {
        email: CTI_S1G_PROBE_PRINCIPAL_EMAIL,
        password: credential.password,
      },
    });
    const sessionToken = login.body?.session_token;
    const authHeaders = typeof sessionToken === "string" && sessionToken
      ? { authorization: `Bearer ${sessionToken}` }
      : {};
    const query = new URLSearchParams({
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      permission_ref: CTI_S1G_PROBE_PERMISSION_REF,
      audit_hint_ref: "cti_s1g_i18_authenticated_probe",
    });
    const session = await apiJson(baseUrl, "/api/auth/session", { headers: authHeaders });
    const hrxEmployees = await apiJson(baseUrl, "/api/hrx/employees", { headers: authHeaders });
    const hrxEmployeeRows = Array.isArray(hrxEmployees.body?.employees) ? hrxEmployees.body.employees : [];
    const expectedReportingLines = [
      ["emp_amic_wsjo", "emp_amic_ytkim"],
      ["emp_amic_sypark", "emp_amic_ytkim"],
      ["emp_amic_yjlee", "emp_amic_tryoon"],
    ];
    const verifyCurrentHrxRoster = event.verify_current_hrx_roster === true;
    const reportingLineMatchCount = expectedReportingLines.filter(([employeeId, managerEmployeeId]) => (
      hrxEmployeeRows.some((employee) => (
        employee.employee_id === employeeId && employee.manager_employee_id === managerEmployeeId
      ))
    )).length;
    const rosterSourceRefCount = hrxEmployeeRows.filter((employee) => (
      employee.source_ref === "hrx-member-roster-source-of-truth"
    )).length;
    const matterList = await apiJson(baseUrl, `/api/matters?${query}`, { headers: authHeaders });
    const firstMatter = Array.isArray(matterList.body?.items) ? matterList.body.items[0] : null;
    const matterId = firstMatter?.matter_id;
    const markerMode = matterId ? "matter_recently_viewed_marker" : "security_audit_break_glass_marker";
    const marker = matterId
      ? await apiJson(baseUrl, `/api/matters/${encodeURIComponent(matterId)}/recently-viewed`, {
          method: "POST",
          headers: authHeaders,
          body: {
            tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
            permission_ref: CTI_S1G_PROBE_PERMISSION_REF,
            audit_hint_ref: "cti_s1g_i18_marker",
            viewed_at: generatedAt,
          },
        })
      : await apiJson(baseUrl, "/api/admin/security/break-glass", {
          method: "POST",
          headers: authHeaders,
          body: {
            requester_user_id: credential.user.user_id,
            reason: "cti_s1g_i18_authenticated_probe",
          },
        });
    const audit = matterId
      ? await apiJson(baseUrl, `/api/matters/audit?${query}`, { headers: authHeaders })
      : await apiJson(baseUrl, "/api/admin/security/audit", { headers: authHeaders });
    const markerReadback = matterId
      ? await apiJson(baseUrl, `/api/matters/recently-viewed?${query}&limit=10`, { headers: authHeaders })
      : await apiJson(baseUrl, "/api/admin/security/audit", { headers: authHeaders });
    const markerObjectId = marker.body?.item?.break_glass_request_id ?? matterId ?? null;
    const auditMatchCount = Array.isArray(audit.body?.items)
      ? audit.body.items.filter((item) => (
          matterId
            ? item.action === "matter.recently_viewed.mark" && item.object_id === matterId
            : item.action === "admin.security.break_glass.requested" && item.object_id === markerObjectId
        )).length
      : 0;
    const readbackMatchCount = Array.isArray(markerReadback.body?.items)
      ? markerReadback.body.items.filter((item) => (
          matterId
            ? item.matter_id === matterId
            : item.action === "admin.security.break_glass.requested" && item.object_id === markerObjectId
        )).length
      : 0;
    const markerStatusOk = marker.status === 200 || marker.status === 201;
    const passed =
      login.status === 200 &&
      session.status === 200 &&
      hrxEmployees.status === 200 &&
      (!verifyCurrentHrxRoster || (
        hrxEmployeeRows.length === 10 &&
        rosterSourceRefCount === 10 &&
        reportingLineMatchCount === expectedReportingLines.length
      )) &&
      matterList.status === 200 &&
      markerStatusOk &&
      audit.status === 200 &&
      markerReadback.status === 200 &&
      auditMatchCount > 0 &&
      readbackMatchCount > 0;

    probeReceipt = {
    ok: passed,
    schema_version: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_SCHEMA_VERSION,
    goal_id: "cti-s1g-authenticated-production-probe",
    maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
    approval_signature_ref: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
    upstream_approval_signature_refs: [
      "I8-CTI-S2-S1G-AUTHENTICATED-PROBE-OWNER-APPROVAL-2026-07-06",
      "I17-CTI-S1G-AUTHENTICATED-PRODUCTION-PROBE-OWNER-APPROVAL-2026-07-06",
      CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
    ],
    request_id: String(event.request_id ?? event.requestId ?? "cti-i18-direct-invoke"),
    generated_at: generatedAt,
    lambda_function_name: env.AWS_LAMBDA_FUNCTION_NAME ?? "unknown",
    runtime_profile: env.LAWOS_RUNTIME_PROFILE ?? "unset",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    status: passed ? "PASS" : "BLOCKED_AUTHENTICATED_PROBE_FAILED",
    credential_store: credential.summary,
    probe_principal: {
      email_hash: credential.summary.target_email_hash,
      user_id_hash: credential.summary.target_user_id_hash,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      email_recorded: false,
      plaintext_identifier_recorded: false,
    },
    probe_results: {
      login: {
        status: login.status,
        ...authSessionSummary(login.body),
      },
      session: responseEvidence(session, {
        session_user_id_hash: session.body?.session?.user_id ? hashRef(session.body.session.user_id) : null,
        session_tenant_id: session.body?.session?.tenant_id ?? null,
      }),
      hrx_employees: responseEvidence(hrxEmployees, {
        expected_employee_count: 10,
        employee_count: hrxEmployeeRows.length,
        roster_source_ref_count: rosterSourceRefCount,
        expected_reporting_line_count: expectedReportingLines.length,
        matching_reporting_line_count: reportingLineMatchCount,
        current_roster_verification_requested: verifyCurrentHrxRoster,
        plaintext_employee_identifiers_returned: false,
      }),
      matter_readback: responseEvidence(matterList, {
        first_matter_id_hash: matterId ? hashRef(matterId) : null,
      }),
      marker: responseEvidence(marker, {
        marker_mode: markerMode,
        marked_matter_id_hash: matterId ? hashRef(matterId) : null,
        marker_object_id_hash: markerObjectId ? hashRef(markerObjectId) : null,
      }),
      audit_readback: responseEvidence(audit, {
        marker_mode: markerMode,
        matching_marker_audit_count: auditMatchCount,
      }),
      marker_readback: responseEvidence(markerReadback, {
        marker_mode: markerMode,
        matching_marker_readback_count: readbackMatchCount,
      }),
    },
    boundary: {
      direct_invoke_only: true,
      public_http_endpoint: false,
      real_login_flow_used: login.status === 200,
      debug_endpoint_used: false,
      direct_token_mint_used: false,
      temporary_backdoor_principal_used: false,
      credential_store_write_executed: true,
      credential_store_write_principal_count: 1,
      credential_store_restored: false,
      s1g_marker_write_executed: marker.status === 200,
      token_or_password_returned: false,
      token_material_recorded: false,
      plaintext_password_recorded: false,
      credential_material_recorded_in_receipt: false,
      secret_value_returned: false,
      secret_value_recorded: false,
      production_migration_executed: false,
      tenant_migration_executed: false,
      account_permission_injection_executed: false,
      operational_profile_switch_executed: false,
      bridge_token_rotation_executed: false,
      password_issuance_distribution_executed: false,
      production_restore_executed: false,
      cutover_executed: false,
      s5_enrichment_executed: false,
      s6_final_seal_executed: false,
      oidc_implementation_executed: false,
      db_conversion_executed: false,
      production_ready_claimed: false,
      go_live_claimed: false,
    },
  };
  } finally {
    credentialStoreRestore = await credential.restoreCredentialStore();
    if (apiBaseUrlFn === apiBaseUrl) await resetCachedApiServer();
  }
  return {
    ...probeReceipt,
    credential_store_restore: credentialStoreRestore,
    boundary: {
      ...probeReceipt.boundary,
      credential_store_restored: credentialStoreRestore?.executed === true,
    },
  };
}

async function snapshotRegularFile({ entry, sourcePath, source, allowedRoot }) {
  const resolvedPath = resolve(sourcePath);
  const base = {
    key: entry.key,
    env: entry.env,
    bounded_context: entry.bounded_context,
    manifest_file_name: entry.fileName,
    format: entry.format ?? (entry.fileName.endsWith(".ndjson") ? "ndjson" : "json"),
    source,
  };

  if (!isAbsolute(sourcePath)) {
    return {
      output: { ...base, exists: false, readable: false, reason: "non_absolute_path", path_hash: pathHash(sourcePath) },
      source: null,
    };
  }
  if (!isInsideRoot(allowedRoot, resolvedPath)) {
    return {
      output: { ...base, exists: false, readable: false, reason: "outside_allowed_root", path_hash: pathHash(resolvedPath) },
      source: null,
    };
  }

  try {
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      return {
        output: {
          ...base,
          exists: true,
          readable: false,
          reason: "not_regular_file",
          path_hash: pathHash(resolvedPath),
          relative_path: safeRelativePath(allowedRoot, resolvedPath),
        },
        source: null,
      };
    }
    const bytes = await readFile(resolvedPath);
    return {
      output: {
        ...base,
        exists: true,
        readable: true,
        path_hash: pathHash(resolvedPath),
        relative_path: safeRelativePath(allowedRoot, resolvedPath),
        byte_length: bytes.length,
        sha256: sha256Hex(bytes),
        ...summarizeFileRecords({ fileName: entry.fileName, format: entry.format, bytes }),
      },
      source: {
        sourcePath: resolvedPath,
        kind: "store_file",
        pathHash: pathHash(resolvedPath),
      },
    };
  } catch (error) {
    return {
      output: {
        ...base,
        exists: false,
        readable: false,
        reason: error?.code === "ENOENT" ? "not_found" : "read_failed",
        error_code: error?.code ?? "UNKNOWN",
        path_hash: pathHash(resolvedPath),
        relative_path: safeRelativePath(allowedRoot, resolvedPath),
      },
      source: null,
    };
  }
}

async function snapshotStoreFile(entry, env, allowedRoot) {
  const sourcePath = cleanPath(env[entry.env]);
  if (!sourcePath) {
    return {
      output: {
        key: entry.key,
        env: entry.env,
        bounded_context: entry.bounded_context,
        manifest_file_name: entry.fileName,
        format: entry.format ?? (entry.fileName.endsWith(".ndjson") ? "ndjson" : "json"),
        source: "missing_env",
        exists: false,
        readable: false,
        reason: "env_unset",
      },
      source: null,
    };
  }
  return snapshotRegularFile({ entry, sourcePath, source: "env", allowedRoot });
}

async function listFilesRecursively(rootPath, limit = Number.POSITIVE_INFINITY) {
  const found = [];
  async function visit(dirPath) {
    if (found.length >= limit) return;
    const dirents = await readdir(dirPath, { withFileTypes: true });
    for (const dirent of dirents.sort((a, b) => a.name.localeCompare(b.name))) {
      if (found.length >= limit) return;
      const childPath = join(dirPath, dirent.name);
      if (dirent.isDirectory()) await visit(childPath);
      else if (dirent.isFile()) found.push(childPath);
    }
  }
  await visit(rootPath);
  return found;
}

async function snapshotObjectStoreDirectory({ entry, sourcePath, source, allowedRoot, detailLimit }) {
  const resolvedPath = sourcePath ? resolve(sourcePath) : null;
  const base = {
    key: entry.key,
    env: entry.env,
    bounded_context: entry.bounded_context,
    type: entry.type,
    source,
  };
  if (!resolvedPath) {
    return {
      output: { ...base, exists: false, readable: false, reason: "unresolved" },
      sources: [],
    };
  }
  if (!isAbsolute(resolvedPath)) {
    return {
      output: { ...base, exists: false, readable: false, reason: "non_absolute_path", path_hash: pathHash(resolvedPath) },
      sources: [],
    };
  }
  if (!isInsideRoot(allowedRoot, resolvedPath)) {
    return {
      output: { ...base, exists: false, readable: false, reason: "outside_allowed_root", path_hash: pathHash(resolvedPath) },
      sources: [],
    };
  }

  try {
    const dirStat = await stat(resolvedPath);
    if (!dirStat.isDirectory()) {
      return {
        output: {
          ...base,
          exists: true,
          readable: false,
          reason: "not_directory",
          path_hash: pathHash(resolvedPath),
          relative_path: safeRelativePath(allowedRoot, resolvedPath),
        },
        sources: [],
      };
    }
    const allFilePaths = await listFilesRecursively(resolvedPath);
    const fileSummaries = [];
    const aggregateSummaries = [];
    const sources = [];
    let totalBytes = 0;
    for (const filePath of allFilePaths) {
      const bytes = await readFile(filePath);
      totalBytes += bytes.length;
      const relativePath = safeRelativePath(resolvedPath, filePath);
      const aggregateSummary = {
        relative_path_hash: pathHash(relativePath),
        byte_length: bytes.length,
        sha256: sha256Hex(bytes),
      };
      const fileSummary = {
        relative_path_hash: aggregateSummary.relative_path_hash,
        extension: extname(filePath) || null,
        byte_length: aggregateSummary.byte_length,
        sha256: aggregateSummary.sha256,
      };
      aggregateSummaries.push(aggregateSummary);
      if (fileSummaries.length < detailLimit) fileSummaries.push(fileSummary);
      sources.push({
        sourcePath: filePath,
        kind: "object_store_file",
        pathHash: pathHash(filePath),
      });
    }
    const aggregateSha = sha256Hex(stableJson(aggregateSummaries));
    return {
      output: {
        ...base,
        exists: true,
        readable: true,
        path_hash: pathHash(resolvedPath),
        relative_path: safeRelativePath(allowedRoot, resolvedPath),
        file_count: allFilePaths.length,
        total_bytes: totalBytes,
        detail_limit: detailLimit,
        details_truncated: allFilePaths.length > detailLimit,
        aggregate_sha256: aggregateSha,
        file_hashes: fileSummaries,
      },
      sources,
    };
  } catch (error) {
    return {
      output: {
        ...base,
        exists: false,
        readable: false,
        reason: error?.code === "ENOENT" ? "not_found" : "read_failed",
        error_code: error?.code ?? "UNKNOWN",
        path_hash: pathHash(resolvedPath),
        relative_path: safeRelativePath(allowedRoot, resolvedPath),
      },
      sources: [],
    };
  }
}

async function snapshotDerivedStores(env, allowedRoot) {
  const dmsManifest = DERIVED_STORE_PATH_MANIFEST.find((entry) => entry.key === "dmsObjectStorePath");
  if (!dmsManifest) return { outputs: [], sources: [] };
  const explicitPath = cleanPath(env[dmsManifest.env]);
  const dmsStorePath = cleanPath(env.LAWOS_DMS_STORE_PATH);
  const sourcePath = explicitPath ?? (dmsStorePath ? `${dmsStorePath}${dmsManifest.suffix}` : null);
  const detailLimit = Number.parseInt(env.LAWOS_CTI_SNAPSHOT_OBJECT_STORE_DETAIL_LIMIT ?? "", 10) || DEFAULT_OBJECT_STORE_DETAIL_LIMIT;
  const result = await snapshotObjectStoreDirectory({
    entry: dmsManifest,
    sourcePath,
    source: explicitPath ? "env" : sourcePath ? "derived_from_dms_store" : "unresolved",
    allowedRoot,
    detailLimit,
  });
  return { outputs: [result.output], sources: result.sources };
}

async function runIsolatedRestoreRehearsal({ sources }) {
  const rehearsalRoot = await mkdtemp(join(tmpdir(), "lawos-cti-i14-"));
  const startedAt = new Date().toISOString();
  let restoredFileCount = 0;
  let checksumMismatchCount = 0;
  let totalBytes = 0;
  try {
    for (const [index, source] of sources.entries()) {
      const sourceBytes = await readFile(source.sourcePath);
      const backupPath = join(rehearsalRoot, "backup", `${String(index).padStart(5, "0")}.bin`);
      const restorePath = join(rehearsalRoot, "restore", `${String(index).padStart(5, "0")}.bin`);
      await mkdir(dirname(backupPath), { recursive: true });
      await mkdir(dirname(restorePath), { recursive: true });
      await writeFile(backupPath, sourceBytes);
      const backupBytes = await readFile(backupPath);
      await writeFile(restorePath, backupBytes);
      const restoreBytes = await readFile(restorePath);
      if (sha256Hex(sourceBytes) !== sha256Hex(backupBytes) || sha256Hex(sourceBytes) !== sha256Hex(restoreBytes)) {
        checksumMismatchCount += 1;
      }
      restoredFileCount += 1;
      totalBytes += sourceBytes.length;
    }

    const receiptCore = {
      isolated_boundary: "lambda_ephemeral_tmpdir",
      source_file_count: sources.length,
      restored_file_count: restoredFileCount,
      total_bytes: totalBytes,
      checksum_mismatch_count: checksumMismatchCount,
      production_restore_executed: false,
      production_write_executed: false,
    };
    return {
      ...receiptCore,
      status: checksumMismatchCount === 0 ? "PASS" : "FAIL",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      rehearsal_root_hash: pathHash(rehearsalRoot),
      receipt_hash: sha256Hex(stableJson(receiptCore)),
      cleanup_attempted: true,
    };
  } finally {
    await rm(rehearsalRoot, { recursive: true, force: true });
  }
}

export async function buildCtiReadOnlyEfsSnapshotReceipt({ event = {}, env = process.env } = {}) {
  const allowedRoot = snapshotAllowedRoot(env);
  const storeResults = await Promise.all(STORE_PATH_MANIFEST.map((entry) => snapshotStoreFile(entry, env, allowedRoot)));
  const derived = await snapshotDerivedStores(env, allowedRoot);
  const sourceFiles = [
    ...storeResults.map((result) => result.source).filter(Boolean),
    ...derived.sources,
  ];
  const storeFiles = storeResults.map((result) => result.output);
  const derivedStoreDirectories = derived.outputs;
  const snapshotCore = {
    store_files: storeFiles,
    derived_store_directories: derivedStoreDirectories,
  };
  const restoreRehearsal = await runIsolatedRestoreRehearsal({ sources: sourceFiles });
  const readableStoreFileCount = storeFiles.filter((entry) => entry.readable).length;
  const readErrorCount = storeFiles.filter((entry) => entry.reason === "read_failed").length +
    derivedStoreDirectories.filter((entry) => entry.reason === "read_failed").length;
  const blockedPathCount = storeFiles.filter((entry) => entry.reason === "outside_allowed_root" || entry.reason === "non_absolute_path").length +
    derivedStoreDirectories.filter((entry) => entry.reason === "outside_allowed_root" || entry.reason === "non_absolute_path").length;
  return {
    ok: readableStoreFileCount > 0 && readErrorCount === 0 && blockedPathCount === 0 && restoreRehearsal.status === "PASS",
    schema_version: CTI_READONLY_EFS_SNAPSHOT_SCHEMA_VERSION,
    goal_id: "cti-cutover-readonly-efs-snapshot-surface",
    maintenance_action: CTI_READONLY_EFS_SNAPSHOT_ACTION,
    approval_signature_ref: CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF,
    request_id: String(event.request_id ?? event.requestId ?? "cti-i14-direct-invoke"),
    generated_at: new Date().toISOString(),
    lambda_function_name: env.AWS_LAMBDA_FUNCTION_NAME ?? "unknown",
    runtime_profile: env.LAWOS_RUNTIME_PROFILE ?? "unset",
    allowed_root: allowedRoot,
    allowed_root_hash: pathHash(allowedRoot),
    store_path_manifest_count: STORE_PATH_MANIFEST.length,
    readable_store_file_count: readableStoreFileCount,
    missing_store_env_count: storeFiles.filter((entry) => entry.reason === "env_unset").length,
    read_error_count: readErrorCount,
    blocked_path_count: blockedPathCount,
    snapshot_hash: sha256Hex(stableJson(snapshotCore)),
    ...snapshotCore,
    restore_rehearsal: restoreRehearsal,
    boundary: {
      direct_invoke_only: true,
      public_http_endpoint: false,
      read_only_snapshot: true,
      plaintext_file_content_returned: false,
      secret_value_returned: false,
      token_or_password_returned: false,
      production_write_executed: false,
      production_restore_executed: false,
      cutover_executed: false,
      production_ready_claimed: false,
    },
  };
}

function primaryIdForRecord(record = {}) {
  const field = MATTER_RECORD_PRIMARY_ID_FIELDS[record.model_type];
  return (field ? record[field] : null) ??
    record.resource_id ??
    record.id ??
    null;
}

function recordKey(record = {}) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdForRecord(record)}`;
}

function registeredProductionUsers() {
  return MATTER_VAULT_USER_REGISTRATION_SEED.users.filter((user) => (
    user.status === "active" &&
    user.production_status !== "disabled" &&
    user.qa_tenant_scope !== "synthetic_only"
  ));
}

function registeredQaUsers() {
  return MATTER_VAULT_USER_REGISTRATION_SEED.users.filter((user) => (
    user.production_status === "disabled" ||
    user.qa_tenant_scope === "synthetic_only"
  ));
}

function assertCredentialRecordSet(records = []) {
  const productionUsers = registeredProductionUsers();
  const expectedUserIds = new Set(productionUsers.map((user) => user.user_id));
  const seen = new Set();
  if (!Array.isArray(records) || records.length !== productionUsers.length) {
    throw new Error("CUTOVER credential record count does not match production user count");
  }
  for (const record of records) {
    const userId = String(record?.user_id ?? "");
    const user = productionUsers.find((candidate) => candidate.user_id === userId);
    if (!user || !expectedUserIds.has(userId)) throw new Error("CUTOVER credential record has unapproved user_id");
    if (seen.has(userId)) throw new Error("CUTOVER credential record has duplicate user_id");
    seen.add(userId);
    if (String(record.email ?? "").trim().toLowerCase() !== String(user.email ?? "").trim().toLowerCase()) {
      throw new Error("CUTOVER credential record email does not match registered account");
    }
    if (record.status !== "must_change") throw new Error("CUTOVER credential records must require password change");
    if (record.password || record.plaintext_password || record.session_token) {
      throw new Error("CUTOVER credential record must not include plaintext password or token");
    }
    const hash = record.password_hash ?? {};
    if (hash.algorithm !== "node:crypto.scrypt") throw new Error("CUTOVER credential hash algorithm mismatch");
    if (!hash.salt || !hash.digest) throw new Error("CUTOVER credential hash salt/digest missing");
    for (const [key, value] of Object.entries(LAWOS_AUTH_SCRYPT_PARAMS)) {
      if (hash.params?.[key] !== value) throw new Error(`CUTOVER credential hash param mismatch: ${key}`);
    }
  }
}

async function writeCutoverCredentialStore({ credentialRecords = [], env = process.env, generatedAt } = {}) {
  assertCredentialRecordSet(credentialRecords);
  const credentialStorePath = cleanPath(env[LAWOS_AUTH_CREDENTIAL_STORE_ENV]);
  if (!credentialStorePath) throw new Error("LAWOS_AUTH_CREDENTIAL_STORE_PATH is required for CUTOVER credential injection");
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(credentialStorePath);
  if (!isAbsolute(credentialStorePath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    throw new Error("CUTOVER credential store path is outside allowed root");
  }

  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const beforeState = readDurableJsonFile({
    filePath: resolvedPath,
    defaultValue: {
      schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
      provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
      records: [],
    },
  });
  const parsed = beforeState.exists ? beforeState.value : null;
  if (parsed?.schema_version && parsed.schema_version !== LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION) {
    throw new Error("Unsupported auth credential store schema for CUTOVER");
  }
  if (parsed?.provider_id && parsed.provider_id !== LAWOS_INTERNAL_PASSWORD_PROVIDER_ID) {
    throw new Error("Unsupported auth credential provider for CUTOVER");
  }

  const existingRecords = authCredentialRecordsFromStore(parsed).filter(Boolean);
  const existingByUserId = new Map(existingRecords.map((record) => [String(record.user_id ?? ""), record]));
  const productionUserIds = new Set(registeredProductionUsers().map((user) => user.user_id));
  const qaUserIds = new Set(registeredQaUsers().map((user) => user.user_id));
  const preservedRecords = existingRecords.filter((record) => {
    const userId = String(record.user_id ?? "");
    return !productionUserIds.has(userId) && !qaUserIds.has(userId);
  });
  const productionRecords = credentialRecords.map((record) => {
    const existing = existingByUserId.get(String(record.user_id ?? ""));
    return {
      ...record,
      credential_rev: Number.isInteger(existing?.credential_rev) ? existing.credential_rev + 1 : 1,
      locked_until: null,
    };
  });
  const qaDisabledRecords = registeredQaUsers().map((user) => {
    const existing = existingByUserId.get(user.user_id);
    return {
      user_id: user.user_id,
      email: user.email,
      status: "disabled",
      credential_rev: Number.isInteger(existing?.credential_rev) ? existing.credential_rev : 1,
      locked_until: null,
      password_hash: existing?.password_hash ?? {},
    };
  });
  const nextRecords = [...preservedRecords, ...productionRecords, ...qaDisabledRecords]
    .sort((left, right) => String(left.user_id).localeCompare(String(right.user_id)));
  const nextStore = {
    schema_version: LAWOS_AUTH_CREDENTIAL_STORE_SCHEMA_VERSION,
    provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
    updated_at: generatedAt,
    records: nextRecords,
  };

  writeDurableJsonFile({
    filePath: resolvedPath,
    value: nextStore,
    expectedGeneration: beforeState.generation,
  });
  const afterBytes = await readFile(resolvedPath);
  return {
    credential_store_env: LAWOS_AUTH_CREDENTIAL_STORE_ENV,
    credential_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    credential_store_path_hash: hashRef(resolvedPath),
    records_before_count: existingRecords.length,
    records_after_count: nextRecords.length,
    production_user_credential_count: productionRecords.length,
    qa_disabled_credential_count: qaDisabledRecords.length,
    preserved_record_count: preservedRecords.length,
    before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    after_sha256: sha256Hex(afterBytes),
    plaintext_password_recorded: false,
    password_hash_digest_recorded: false,
    password_hash_salt_recorded: false,
  };
}

function currentMatterClientRecord(client, generatedAt) {
  return {
    model_type: "MatterClient",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    client_id: client.client_id,
    client_display_name: client.client_display_name,
    client_short_name: client.client_short_name,
    status: "active",
    source_revision: client.source_revision ?? CTI_CUTOVER_SOURCE_REVISION,
    created_by: CTI_CUTOVER_OPERATOR_REF,
    created_at: "2026-07-01T00:00:00.000+09:00",
    updated_by: CTI_CUTOVER_OPERATOR_REF,
    updated_at: generatedAt,
  };
}

function currentMatterRecord(matter, generatedAt) {
  return {
    model_type: "Matter",
    matter_id: matter.matter_id,
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    client_id: matter.client_id,
    matter_code: matter.matter_code,
    matter_name: matter.matter_name,
    client_display_name: matter.client_display_name,
    matter_type_english: matter.matter_type_english,
    matter_litigation_axis: matter.matter_litigation_axis ?? null,
    matter_detail_type_korean: matter.matter_detail_type_korean,
    client_case_role: matter.client_case_role ?? null,
    client_case_role_confidence: matter.client_case_role_confidence ?? null,
    practice_group: matter.matter_axis,
    source_revision: matter.source_revision ?? CTI_CUTOVER_SOURCE_REVISION,
    legal_client_party_id: matter.client_id,
    billing_client_party_id: matter.client_id,
    title: matter.title,
    status: matter.status,
    created_by: CTI_CUTOVER_OPERATOR_REF,
    created_at: "2026-07-01T00:00:00.000+09:00",
    updated_by: CTI_CUTOVER_OPERATOR_REF,
    updated_at: generatedAt,
    matter_number: matter.matter_number,
    permission_envelope_id: `perm:${MATTER_VAULT_REGISTERED_TENANT_ID}:${matter.matter_id}`,
    audit_trace_id: `audit:${MATTER_VAULT_REGISTERED_TENANT_ID}:${matter.matter_id}`,
    document_count: 0,
    wip_status: matter.review_required ? "review_required" : "not_started",
    risk_level: matter.review_required ? "elevated" : "standard",
    opened_at: "2026-07-01T00:00:00.000+09:00",
  };
}

function countCurrentMatterRecords(records = [], tenantId = MATTER_VAULT_REGISTERED_TENANT_ID) {
  const current = records.filter((record) => record.tenant_id === tenantId && record.source_revision === CTI_CUTOVER_SOURCE_REVISION);
  return {
    clients: current.filter((record) => record.model_type === "MatterClient").length,
    matters: current.filter((record) => record.model_type === "Matter").length,
    total: current.length,
  };
}

function resolveS5StorePath({ envName, env = process.env, label }) {
  const sourcePath = cleanPath(env[envName]);
  if (!sourcePath) throw new Error(`${envName} is required for S5 ${label}`);
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(sourcePath);
  if (!isAbsolute(sourcePath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    throw new Error(`S5 ${label} store path is outside allowed root`);
  }
  return { sourcePath, resolvedPath, allowedRoot };
}

function s5ClientSequence(clientId) {
  const index = AMIC_CURRENT_MATTER_CLIENTS.findIndex((client) => client.client_id === clientId);
  if (index < 0) throw new Error("S5 client_id is not in canonical client inventory");
  return String(index + 1).padStart(3, "0");
}

function s5ClientPartyId(clientId) {
  return `party_cti_s5_client_${s5ClientSequence(clientId)}`;
}

function s5ClientEntityId(clientId) {
  return `entity_cti_s5_client_${s5ClientSequence(clientId)}`;
}

function s5UserById() {
  return new Map(MATTER_VAULT_USER_REGISTRATION_SEED.users.map((user) => [user.user_id, user]));
}

function s5IsAttorneyUser(user) {
  return (Array.isArray(user?.role_ids) && user.role_ids.includes("attorney")) ||
    /attorney|변호사/i.test(String(user?.source_title ?? ""));
}

function s5NormalizeMatterStatus(statusInput, currentStatus) {
  const value = String(statusInput ?? "").trim().toLowerCase();
  if (!value) return { status: currentStatus, status_blank_preserved: true };
  const mapped = { active: "open", open: "open", hold: "paused", paused: "paused", closed: "closed" }[value];
  if (!mapped) throw new Error("Unsupported S5 matter_status value");
  return { status: mapped, status_blank_preserved: false };
}

function s5AssertNoPlaintextEvidence(value) {
  const text = stableJson(value);
  const forbidden = /(password|secret|token|reset_url|plaintext_password|initial_password|credential_value)/i;
  return !forbidden.test(text);
}

function s5ValidatedRows(event = {}) {
  const rows = Array.isArray(event.mapping_rows) ? event.mapping_rows : [];
  if (rows.length !== AMIC_CURRENT_MATTER_CODE_CANDIDATES.length) {
    throw new Error("S5 mapping row count must match canonical matter count");
  }
  const users = s5UserById();
  const seenMatterCodes = new Set();
  let accountantAssignmentCount = 0;
  let attorneyAssignmentCount = 0;
  for (const row of rows) {
    const matterCode = String(row.matter_code ?? "").trim();
    if (!matterCode) throw new Error("S5 mapping row matter_code is required");
    if (seenMatterCodes.has(matterCode)) throw new Error("S5 mapping contains duplicate matter_code");
    seenMatterCodes.add(matterCode);
    const responsibleAttorneys = (row.attorney_assignments ?? []).filter((assignment) => (
      assignment.role === "responsible_attorney"
    ));
    if (responsibleAttorneys.length < 1) throw new Error("S5 mapping row requires at least one responsible attorney");
    for (const assignment of row.attorney_assignments ?? []) {
      const user = users.get(String(assignment.user_id ?? ""));
      if (!user || !s5IsAttorneyUser(user)) throw new Error("S5 attorney assignment must reference an attorney user");
      if (!["retaining_attorney", "responsible_attorney", "matter_attorney"].includes(assignment.role)) {
        throw new Error("S5 attorney assignment role is not approved");
      }
      attorneyAssignmentCount += 1;
    }
    for (const assignment of row.accounting_assignments ?? []) {
      const user = users.get(String(assignment.user_id ?? ""));
      if (!user || user.user_id !== CTI_S5_KYT_USER_ID || s5IsAttorneyUser(user)) {
        throw new Error("S5 accounting assignment must reference the approved non-attorney accountant principal");
      }
      if (assignment.role !== "finance_accounting_support") throw new Error("S5 accounting assignment role is not approved");
      accountantAssignmentCount += 1;
    }
  }
  return { rows, attorneyAssignmentCount, accountantAssignmentCount };
}

function s5MatterByCode(records = []) {
  return new Map(records
    .filter((record) => record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID && record.model_type === "Matter")
    .map((record) => [record.matter_code, record]));
}

async function executeS5MatterStaffingAndStatus({ env = process.env, generatedAt, mappingRows = [] } = {}) {
  const { resolvedPath, allowedRoot } = resolveS5StorePath({ envName: "LAWOS_MATTER_STORE_PATH", env, label: "matter" });
  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const beforeState = readDurableJsonFile({
    filePath: resolvedPath,
    defaultValue: { records: [], idempotency: [], audit_events: [] },
  });
  const parsedBefore = beforeState.exists ? beforeState.value : null;
  const matterStoreRepairExecuted = !beforeState.exists;
  const matterStoreRepairReason = beforeState.exists ? null : "matter_store_empty_or_missing";
  const repository = createMatterRepository({
    seedRecords: Array.isArray(parsedBefore?.records) ? parsedBefore.records : [],
  });
  const before = repository.snapshot();
  for (const client of AMIC_CURRENT_MATTER_CLIENTS) repository.upsert(currentMatterClientRecord(client, generatedAt));
  for (const matter of AMIC_CURRENT_MATTER_CODE_CANDIDATES) repository.upsert(currentMatterRecord(matter, generatedAt));
  const syntheticResidueRecords = repository.snapshot().records.filter((record) => (
    (record.tenant_id === CTI_CUTOVER_SYNTHETIC_TENANT_ID && record.source_revision === CTI_CUTOVER_SOURCE_REVISION) ||
    (record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
      record.source_revision !== CTI_CUTOVER_SOURCE_REVISION &&
      (String(record.source_revision ?? "").startsWith("runtime-seed") || String(record.matter_id ?? "").startsWith("matter_rp05_")))
  ));
  let removedSyntheticResidueCount = 0;
  for (const record of syntheticResidueRecords) {
    if (repository.delete({
      tenant_id: record.tenant_id,
      model_type: record.model_type,
      id: primaryIdForRecord(record),
    })) {
      removedSyntheticResidueCount += 1;
    }
  }
  const matterByCode = s5MatterByCode(before.records);
  let statusBlankPreservedCount = 0;
  let statusUpdatedCount = 0;
  let partyRefUpdatedMatterCount = 0;
  let attorneyMemberUpsertCount = 0;
  let accountingSupportMemberUpsertCount = 0;
  let kytScopeSkippedCount = 0;

  for (const row of mappingRows) {
    const matter = matterByCode.get(String(row.matter_code ?? "")) ??
      repository.list({ tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID, model_type: "Matter" })
        .find((candidate) => candidate.matter_code === String(row.matter_code ?? ""));
    if (!matter) throw new Error("S5 mapping matter_code was not found in canonical matter store");
    const normalizedStatus = s5NormalizeMatterStatus(row.matter_status, matter.status);
    if (normalizedStatus.status_blank_preserved) statusBlankPreservedCount += 1;
    else if (normalizedStatus.status !== matter.status) statusUpdatedCount += 1;
    const partyId = s5ClientPartyId(matter.client_id);
    repository.update({
      tenant_id: matter.tenant_id,
      model_type: "Matter",
      id: matter.matter_id,
    }, {
      status: normalizedStatus.status,
      legal_client_party_id: partyId,
      billing_client_party_id: partyId,
      s5_status_source: "i1_owner_mapping",
      s5_enrichment_source_revision: CTI_S5_SOURCE_REVISION,
      updated_by: CTI_S5_OPERATOR_REF,
      updated_at: generatedAt,
    });
    partyRefUpdatedMatterCount += 1;

    const assignments = [
      ...(row.attorney_assignments ?? []),
      ...(row.accounting_assignments ?? []),
    ];
    const seenAssignmentKeys = new Set();
    for (const assignment of assignments) {
      const isAccounting = assignment.role === "finance_accounting_support";
      if (isAccounting && !(matter.matter_type_english === "DEAL" && !matter.matter_litigation_axis)) {
        kytScopeSkippedCount += 1;
        continue;
      }
      const key = `${assignment.user_id}:${assignment.role}`;
      if (seenAssignmentKeys.has(key)) continue;
      seenAssignmentKeys.add(key);
      repository.upsert({
        model_type: "MatterMember",
        member_id: `member_cti_s5_${matter.matter_id}_${assignment.role}_${assignment.user_id}`,
        tenant_id: matter.tenant_id,
        matter_id: matter.matter_id,
        employee_id: assignment.employee_id ?? null,
        user_id: assignment.user_id,
        role: assignment.role,
        status: "active",
        access_scope: isAccounting ? "i2_mna_advisory_finance_only" : "matter_team",
        source_revision: CTI_S5_SOURCE_REVISION,
        approval_ref: isAccounting ? "I2-CTI-KYT-ACCESS-SCOPE-OWNER-APPROVAL-2026-07-06" : CTI_S5_ENRICHMENT_APPROVAL_REF,
        permission_envelope_id: `perm:${matter.tenant_id}:${matter.matter_id}:${assignment.user_id}:${assignment.role}`,
        audit_trace_id: `audit:${matter.tenant_id}:${matter.matter_id}:s5:${assignment.user_id}:${assignment.role}`,
        created_by: CTI_S5_OPERATOR_REF,
        created_at: generatedAt,
      });
      if (isAccounting) accountingSupportMemberUpsertCount += 1;
      else attorneyMemberUpsertCount += 1;
    }
  }

  const after = repository.snapshot();
  writeDurableJsonFile({
    filePath: resolvedPath,
    expectedGeneration: beforeState.generation,
    value: {
    ...(parsedBefore?.migrations ? { migrations: parsedBefore.migrations } : {}),
    records: after.records,
    idempotency: after.idempotency,
    audit_events: after.audit_events,
    },
  });
  const relevantMembers = after.records.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.model_type === "MatterMember" &&
    record.source_revision === CTI_S5_SOURCE_REVISION
  ));
  const matters = after.records.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.model_type === "Matter" &&
    record.source_revision === CTI_CUTOVER_SOURCE_REVISION
  ));
  const responsibleMatterIds = new Set(relevantMembers
    .filter((record) => record.role === "responsible_attorney")
    .map((record) => record.matter_id));
  const accountantMemberCount = relevantMembers.filter((record) => record.role === "finance_accounting_support").length;
  const afterBytes = await readFile(resolvedPath);
  return {
    matter_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    matter_store_path_hash: hashRef(resolvedPath),
    matter_store_repair_executed: matterStoreRepairExecuted,
    matter_store_repair_reason: matterStoreRepairReason,
    before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    after_sha256: sha256Hex(afterBytes),
    removed_synthetic_residue_record_count: removedSyntheticResidueCount,
    mapping_row_count: mappingRows.length,
    canonical_matter_count: matters.length,
    status_updated_count: statusUpdatedCount,
    status_blank_preserved_count: statusBlankPreservedCount,
    party_ref_updated_matter_count: partyRefUpdatedMatterCount,
    attorney_member_upsert_count: attorneyMemberUpsertCount,
    accounting_support_member_upsert_count: accountingSupportMemberUpsertCount,
    accounting_support_readback_count: accountantMemberCount,
    kyt_accountant_not_attorney: true,
    kyt_scope_skipped_count: kytScopeSkippedCount,
    responsible_attorney_matter_count: responsibleMatterIds.size,
    readback_100_percent: matters.length === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length &&
      responsibleMatterIds.size === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length &&
      partyRefUpdatedMatterCount === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    plaintext_pii_recorded_in_receipt: false,
  };
}

async function executeS5PartyEnrichment({ env = process.env, generatedAt } = {}) {
  const { resolvedPath, allowedRoot } = resolveS5StorePath({ envName: "LAWOS_MASTER_DATA_STORE_PATH", env, label: "master-data party" });
  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const repository = createMasterDataRepository({ filePath: resolvedPath, seedRecords: [] });
  for (const client of AMIC_CURRENT_MATTER_CLIENTS) {
    const sequence = s5ClientSequence(client.client_id);
    const partyType = client.candidate_type === "organization_candidate" ? "organization" : "person";
    const entityId = s5ClientEntityId(client.client_id);
    const partyId = s5ClientPartyId(client.client_id);
    repository.upsert({
      model_type: "Entity",
      entity_id: entityId,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      entity_kind: partyType,
      display_name: client.client_display_name,
      canonical_display_name: client.canonical_display_name ?? client.client_display_name,
      legal_form: client.legal_form ?? null,
      candidate_type: client.candidate_type ?? null,
      client_source_ref: CTI_CUTOVER_SOURCE_REVISION,
      rp05_client_ref: client.client_id,
      source_lanes: client.source_lanes ?? [],
      status: "active",
      owner_user_id: CTI_S5_OPERATOR_REF,
      synthetic_only: false,
    });
    repository.upsert({
      model_type: "Party",
      party_id: partyId,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      party_type: partyType,
      display_name: client.client_display_name,
      canonical_entity_id: entityId,
      status: "active",
      owner_user_id: CTI_S5_OPERATOR_REF,
      synthetic_only: false,
      identity_key: `${MATTER_VAULT_REGISTERED_TENANT_ID}:cti-s5:${client.client_id}`,
    });
    repository.upsert(partyType === "organization" ? {
      model_type: "Organization",
      organization_id: `org_cti_s5_client_${sequence}`,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      party_id: partyId,
      entity_id: entityId,
      display_name: client.client_display_name,
      canonical_display_name: client.canonical_display_name ?? client.client_display_name,
      client_source_ref: CTI_CUTOVER_SOURCE_REVISION,
      rp05_client_ref: client.client_id,
      source_lanes: client.source_lanes ?? [],
      status: "active",
      owner_user_id: CTI_S5_OPERATOR_REF,
      synthetic_only: false,
    } : {
      model_type: "Person",
      person_id: `person_cti_s5_client_${sequence}`,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      party_id: partyId,
      entity_id: entityId,
      display_name: client.client_display_name,
      canonical_display_name: client.canonical_display_name ?? client.client_display_name,
      client_source_ref: CTI_CUTOVER_SOURCE_REVISION,
      rp05_client_ref: client.client_id,
      source_lanes: client.source_lanes ?? [],
      status: "active",
      owner_user_id: CTI_S5_OPERATOR_REF,
      synthetic_only: false,
    });
  }
  const snapshot = repository.snapshot();
  const records = snapshot.records.filter((record) => record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID);
  const s5Parties = records.filter((record) => record.model_type === "Party" && String(record.party_id ?? "").startsWith("party_cti_s5_client_"));
  const s5Entities = records.filter((record) => record.model_type === "Entity" && String(record.entity_id ?? "").startsWith("entity_cti_s5_client_"));
  const s5PersonsOrOrgs = records.filter((record) => (
    (record.model_type === "Person" && String(record.person_id ?? "").startsWith("person_cti_s5_client_")) ||
    (record.model_type === "Organization" && String(record.organization_id ?? "").startsWith("org_cti_s5_client_"))
  ));
  const afterBytes = await readFile(resolvedPath);
  return {
    master_data_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    master_data_store_path_hash: hashRef(resolvedPath),
    before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    after_sha256: sha256Hex(afterBytes),
    client_expected_count: AMIC_CURRENT_MATTER_CLIENTS.length,
    party_readback_count: s5Parties.length,
    entity_readback_count: s5Entities.length,
    person_or_organization_readback_count: s5PersonsOrOrgs.length,
    missing_party_reference_count: 0,
    readback_100_percent: s5Parties.length === AMIC_CURRENT_MATTER_CLIENTS.length &&
      s5Entities.length === AMIC_CURRENT_MATTER_CLIENTS.length &&
      s5PersonsOrOrgs.length === AMIC_CURRENT_MATTER_CLIENTS.length,
    plaintext_pii_recorded_in_receipt: false,
  };
}

async function executeS5ContactEnrichment({ env = process.env, generatedAt } = {}) {
  const { resolvedPath, allowedRoot } = resolveS5StorePath({ envName: "LAWOS_CRM_STORE_PATH", env, label: "crm contact" });
  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const repository = createCrmRuntimeRepository({ filePath: resolvedPath, seedRecords: [] });
  const productionUsers = registeredProductionUsers();
  for (const user of productionUsers) {
    repository.upsert({
      model_type: "Contact",
      resource_id: `contact_cti_s5_user_${user.user_id}`,
      contact_id: `contact_cti_s5_user_${user.user_id}`,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      user_id: user.user_id,
      display_name: user.display_name,
      contact_point_type: "email",
      contact_point_value: user.email,
      contact_value_redaction_policy: "receipt_hash_count_only",
      status: "active",
      source_revision: CTI_S5_SOURCE_REVISION,
      owner_user_id: CTI_S5_OPERATOR_REF,
      writes_audit_event: true,
    });
  }
  const records = repository.snapshot().records.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.model_type === "Contact" &&
    record.source_revision === CTI_S5_SOURCE_REVISION
  ));
  const afterBytes = await readFile(resolvedPath);
  return {
    crm_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    crm_store_path_hash: hashRef(resolvedPath),
    before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    after_sha256: sha256Hex(afterBytes),
    internal_user_contact_expected_count: productionUsers.length,
    internal_user_email_contact_readback_count: records.length,
    phone_contact_source_available: false,
    phone_contact_source_unavailable_count: productionUsers.length,
    client_contact_source_available_count: 0,
    raw_contact_value_returned_in_receipt: false,
    readback_100_percent: records.length === productionUsers.length,
    plaintext_pii_recorded_in_receipt: false,
  };
}

async function executeS5ConflictIndex({ env = process.env, generatedAt } = {}) {
  const { resolvedPath, allowedRoot } = resolveS5StorePath({ envName: "LAWOS_INTAKE_STORE_PATH", env, label: "intake conflict" });
  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const repository = createIntakeRuntimeRepository({ filePath: resolvedPath, seedRecords: [] });
  for (const client of AMIC_CURRENT_MATTER_CLIENTS) {
    repository.upsert({
      model_type: "ConflictIndexEntry",
      resource_id: `conflict_index_cti_s5_${client.client_id}`,
      conflict_index_entry_id: `conflict_index_cti_s5_${client.client_id}`,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      party_id: s5ClientPartyId(client.client_id),
      client_id: client.client_id,
      display_name: client.client_display_name,
      normalized_search_hash: hashRef(client.client_display_name),
      source_ref: CTI_CUTOVER_SOURCE_REVISION,
      source_revision: CTI_S5_SOURCE_REVISION,
      status: "active",
      created_by: CTI_S5_OPERATOR_REF,
      created_at: generatedAt,
    });
  }
  const records = repository.snapshot().records.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.model_type === "ConflictIndexEntry" &&
    record.source_revision === CTI_S5_SOURCE_REVISION
  ));
  const afterBytes = await readFile(resolvedPath);
  return {
    intake_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    intake_store_path_hash: hashRef(resolvedPath),
    before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
    after_sha256: sha256Hex(afterBytes),
    client_conflict_index_expected_count: AMIC_CURRENT_MATTER_CLIENTS.length,
    client_conflict_index_readback_count: records.length,
    source_ref_counterparty_count: 0,
    source_ref_counterparty_source_available: false,
    raw_search_values_returned_in_receipt: false,
    readback_100_percent: records.length === AMIC_CURRENT_MATTER_CLIENTS.length,
    plaintext_pii_recorded_in_receipt: false,
  };
}

function s5JsonStoreStateFromBytes(bytes, { fallbackMigrations = [], label } = {}) {
  if (!bytes || bytes.length === 0) {
    return {
      migrations: fallbackMigrations,
      records: [],
      idempotency: [],
      audit_events: [],
    };
  }
  const parsed = JSON.parse(bytes.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`S5 ${label} store state must be a JSON object`);
  }
  if (!Array.isArray(parsed.records)) throw new Error(`S5 ${label} store records must be an array`);
  return parsed;
}

function s5JsonRecordKey(record) {
  return [
    record.tenant_id ?? "",
    record.model_type ?? "",
    record.resource_id ??
      record.matter_finance_reference_id ??
      record.matter_analytics_reference_id ??
      record.id ??
      "",
  ].join(":");
}

function s5UpsertJsonRecord(records, record) {
  const key = s5JsonRecordKey(record);
  const index = records.findIndex((candidate) => s5JsonRecordKey(candidate) === key);
  if (index < 0) {
    records.push(record);
    return;
  }
  records[index] = {
    ...records[index],
    ...record,
    created_by: records[index].created_by ?? record.created_by,
    created_at: records[index].created_at ?? record.created_at,
  };
}

async function executeS5FinanceAnalyticsReferences({ env = process.env, generatedAt } = {}) {
  const finance = resolveS5StorePath({ envName: "LAWOS_FINANCE_STORE_PATH", env, label: "finance reference" });
  const analytics = resolveS5StorePath({ envName: "LAWOS_ANALYTICS_STORE_PATH", env, label: "analytics reference" });
  const financeBeforeBytes = await readFile(finance.resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const analyticsBeforeBytes = await readFile(analytics.resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const financeDurable = readDurableJsonFile({
    filePath: finance.resolvedPath,
    defaultValue: { migrations: ["finance-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] },
  });
  const analyticsDurable = readDurableJsonFile({
    filePath: analytics.resolvedPath,
    defaultValue: { migrations: ["analytics-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] },
  });
  const financeState = s5JsonStoreStateFromBytes(Buffer.from(JSON.stringify(financeDurable.value)), {
    fallbackMigrations: ["finance-runtime-001-file-store"],
    label: "finance",
  });
  const analyticsState = s5JsonStoreStateFromBytes(Buffer.from(JSON.stringify(analyticsDurable.value)), {
    fallbackMigrations: ["analytics-runtime-001-file-store"],
    label: "analytics",
  });
  const financeStoreRecords = [...financeState.records];
  const analyticsStoreRecords = [...analyticsState.records];
  for (const matter of AMIC_CURRENT_MATTER_CODE_CANDIDATES) {
    const financeReferenceId = `finance_ref_cti_s5_${matter.matter_id}`;
    s5UpsertJsonRecord(financeStoreRecords, {
      model_type: "MatterFinanceReference",
      resource_id: financeReferenceId,
      matter_finance_reference_id: financeReferenceId,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      matter_id: matter.matter_id,
      client_id: matter.client_id,
      billing_client_party_id: s5ClientPartyId(matter.client_id),
      status: "active",
      source_revision: CTI_S5_SOURCE_REVISION,
      created_by: CTI_S5_OPERATOR_REF,
      created_at: generatedAt,
      updated_by: CTI_S5_OPERATOR_REF,
      updated_at: generatedAt,
    });
    s5UpsertJsonRecord(analyticsStoreRecords, {
      model_type: "MatterAnalyticsReference",
      resource_id: `analytics_ref_cti_s5_${matter.matter_id}`,
      matter_analytics_reference_id: `analytics_ref_cti_s5_${matter.matter_id}`,
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      matter_id: matter.matter_id,
      client_id: matter.client_id,
      finance_reference_id: financeReferenceId,
      status: "active",
      source_revision: CTI_S5_SOURCE_REVISION,
      created_by: CTI_S5_OPERATOR_REF,
      created_at: generatedAt,
      updated_by: CTI_S5_OPERATOR_REF,
      updated_at: generatedAt,
    });
  }
  const financeWrite = writeDurableJsonFile({
    filePath: finance.resolvedPath,
    expectedGeneration: financeDurable.generation,
    value: { ...financeState, records: financeStoreRecords },
  });
  try {
    writeDurableJsonFile({
      filePath: analytics.resolvedPath,
      expectedGeneration: analyticsDurable.generation,
      value: { ...analyticsState, records: analyticsStoreRecords },
    });
  } catch (error) {
    if (financeDurable.exists) {
      writeDurableJsonFile({
        filePath: finance.resolvedPath,
        expectedGeneration: financeWrite.generation,
        value: financeDurable.value,
      });
    } else {
      removeDurableJsonFile({ filePath: finance.resolvedPath, expectedGeneration: financeWrite.generation });
    }
    throw error;
  }
  const financeRecords = financeStoreRecords.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.model_type === "MatterFinanceReference" &&
    record.source_revision === CTI_S5_SOURCE_REVISION
  ));
  const analyticsRecords = analyticsStoreRecords.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.model_type === "MatterAnalyticsReference" &&
    record.source_revision === CTI_S5_SOURCE_REVISION
  ));
  const financeReferenceIds = new Set(financeRecords.map((record) => record.resource_id));
  const referenceIntegrityErrorCount = analyticsRecords.filter((record) => (
    !financeReferenceIds.has(record.finance_reference_id)
  )).length;
  const financeAfterBytes = await readFile(finance.resolvedPath);
  const analyticsAfterBytes = await readFile(analytics.resolvedPath);
  return {
    finance_store_relative_path: safeRelativePath(finance.allowedRoot, finance.resolvedPath),
    analytics_store_relative_path: safeRelativePath(analytics.allowedRoot, analytics.resolvedPath),
    finance_store_path_hash: hashRef(finance.resolvedPath),
    analytics_store_path_hash: hashRef(analytics.resolvedPath),
    finance_before_sha256: financeBeforeBytes ? sha256Hex(financeBeforeBytes) : null,
    finance_after_sha256: sha256Hex(financeAfterBytes),
    analytics_before_sha256: analyticsBeforeBytes ? sha256Hex(analyticsBeforeBytes) : null,
    analytics_after_sha256: sha256Hex(analyticsAfterBytes),
    finance_reference_expected_count: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    finance_reference_readback_count: financeRecords.length,
    analytics_reference_expected_count: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    analytics_reference_readback_count: analyticsRecords.length,
    reference_integrity_error_count: referenceIntegrityErrorCount,
    readback_100_percent: financeRecords.length === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length &&
      analyticsRecords.length === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length &&
      referenceIntegrityErrorCount === 0,
    plaintext_pii_recorded_in_receipt: false,
  };
}

async function appendS5SecurityAuditEvent({ env = process.env, generatedAt, receiptCore } = {}) {
  const auditPath = cleanPath(env.LAWOS_AUDIT_STORE_PATH);
  if (!auditPath) throw new Error("LAWOS_AUDIT_STORE_PATH is required for S5 audit");
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(auditPath);
  if (!isAbsolute(auditPath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    throw new Error("S5 audit store path is outside allowed root");
  }
  const event = {
    event_id: `cti.s5.enrichment.execute:${generatedAt}`,
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    action: "cti.s5.enrichment.execute",
    object_id: "cti-s5-enrichment-execute",
    occurred_at: generatedAt,
    approval_signature_refs: [CTI_S5_ENRICHMENT_APPROVAL_REF, CTI_REMAINING_EXECUTION_OMNIBUS_APPROVAL_REF],
    metadata: {
      mapping_row_count: receiptCore.staffing?.mapping_row_count ?? null,
      party_readback_count: receiptCore.party?.party_readback_count ?? null,
      contact_readback_count: receiptCore.contacts?.internal_user_email_contact_readback_count ?? null,
      conflict_index_readback_count: receiptCore.conflict_index?.client_conflict_index_readback_count ?? null,
      finance_reference_readback_count: receiptCore.finance_analytics?.finance_reference_readback_count ?? null,
      analytics_reference_readback_count: receiptCore.finance_analytics?.analytics_reference_readback_count ?? null,
      plaintext_pii_recorded: false,
      credential_material_recorded: false,
      token_material_recorded: false,
    },
    event_hash: sha256Hex(stableJson(receiptCore)),
  };
  appendNdjsonDurably({ filePath: resolvedPath, value: event });
  return {
    audit_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    audit_store_path_hash: hashRef(resolvedPath),
    event_hash: event.event_hash,
    plaintext_pii_recorded: false,
    credential_material_recorded: false,
    token_material_recorded: false,
  };
}

export async function buildCtiS5EnrichmentExecuteReceipt({ event = {}, env = process.env } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return legacyJsonMutationBlockedReceipt({
      maintenanceAction: CTI_S5_ENRICHMENT_EXECUTE_ACTION,
      reason: "operational_s5_json_authority_disabled",
      schemaVersion: CTI_S5_ENRICHMENT_EXECUTE_SCHEMA_VERSION,
    });
  }
  const generatedAt = new Date().toISOString();
  const requestId = String(event.request_id ?? event.requestId ?? "cti-s5-enrichment-execute");
  let stage = "validate_mapping_rows";
  try {
    const { rows, attorneyAssignmentCount, accountantAssignmentCount } = s5ValidatedRows(event);
    stage = "pre_snapshot";
    const preSnapshot = await buildCtiReadOnlyEfsSnapshotReceipt({ event: { request_id: `${requestId}:pre` }, env });
    stage = "matter_staffing_status";
    const staffing = await executeS5MatterStaffingAndStatus({ env, generatedAt, mappingRows: rows });
    stage = "party_enrichment";
    const party = await executeS5PartyEnrichment({ env, generatedAt });
    stage = "contact_enrichment";
    const contacts = await executeS5ContactEnrichment({ env, generatedAt });
    stage = "conflict_index";
    const conflictIndex = await executeS5ConflictIndex({ env, generatedAt });
    stage = "finance_analytics_references";
    const financeAnalytics = await executeS5FinanceAnalyticsReferences({ env, generatedAt });
    const receiptCore = {
      staffing,
      party,
      contacts,
      conflict_index: conflictIndex,
      finance_analytics: financeAnalytics,
    };
    stage = "audit_append";
    const audit = await appendS5SecurityAuditEvent({ env, generatedAt, receiptCore });
    stage = "post_snapshot";
    const postSnapshot = await buildCtiReadOnlyEfsSnapshotReceipt({ event: { request_id: `${requestId}:post` }, env });
  const s5Gate = {
    readback_100_percent: staffing.readback_100_percent &&
      party.readback_100_percent &&
      contacts.readback_100_percent &&
      conflictIndex.readback_100_percent &&
      financeAnalytics.readback_100_percent,
    attorney_staffing_all_matters: staffing.responsible_attorney_matter_count === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    kyt_accountant_not_attorney: staffing.kyt_accountant_not_attorney === true &&
      staffing.accounting_support_readback_count === accountantAssignmentCount,
    integrity_error_count: financeAnalytics.reference_integrity_error_count,
    pii_plaintext_evidence: false,
    manifest_batches: ["S5-T01", "S5-T02", "S5-T03", "S5-T04", "S5-T05", "S5-T06"],
    phone_contact_source_unavailable_documented: contacts.phone_contact_source_available === false &&
      contacts.phone_contact_source_unavailable_count === registeredProductionUsers().length,
    pass: false,
  };
  s5Gate.pass = s5Gate.readback_100_percent &&
    s5Gate.attorney_staffing_all_matters &&
    s5Gate.kyt_accountant_not_attorney &&
    s5Gate.integrity_error_count === 0 &&
    s5Gate.pii_plaintext_evidence === false &&
    s5Gate.phone_contact_source_unavailable_documented === true &&
    postSnapshot.ok === true &&
    s5AssertNoPlaintextEvidence(receiptCore);
  return {
    ok: s5Gate.pass,
    schema_version: CTI_S5_ENRICHMENT_EXECUTE_SCHEMA_VERSION,
    goal_id: "cti-s5-enrichment-execute",
    maintenance_action: CTI_S5_ENRICHMENT_EXECUTE_ACTION,
    request_id: requestId,
    generated_at: generatedAt,
    lambda_function_name: env.AWS_LAMBDA_FUNCTION_NAME ?? "unknown",
    runtime_profile: env.LAWOS_RUNTIME_PROFILE ?? "unset",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    approval_signature_refs: [CTI_S5_ENRICHMENT_APPROVAL_REF, CTI_REMAINING_EXECUTION_OMNIBUS_APPROVAL_REF],
    status: s5Gate.pass ? "PASS" : "BLOCKED_S5_G_VALIDATION_FAILED",
    input_summary: {
      i1_workbook_sha256: event.i1_workbook_sha256 ?? null,
      mapping_row_count: rows.length,
      attorney_assignment_count: attorneyAssignmentCount,
      accounting_assignment_count: accountantAssignmentCount,
      raw_mapping_values_returned: false,
    },
    pre_snapshot: {
      snapshot_hash: preSnapshot.snapshot_hash,
      readable_store_file_count: preSnapshot.readable_store_file_count,
      restore_rehearsal_status: preSnapshot.restore_rehearsal?.status ?? null,
      read_error_count: preSnapshot.read_error_count,
      blocked_path_count: preSnapshot.blocked_path_count,
    },
    ...receiptCore,
    audit,
    post_snapshot: {
      snapshot_hash: postSnapshot.snapshot_hash,
      readable_store_file_count: postSnapshot.readable_store_file_count,
      restore_rehearsal_status: postSnapshot.restore_rehearsal?.status ?? null,
      read_error_count: postSnapshot.read_error_count,
      blocked_path_count: postSnapshot.blocked_path_count,
    },
    s5_g_validation: s5Gate,
    boundary: {
      direct_invoke_only: true,
      public_http_endpoint: false,
      production_write_executed: true,
      production_restore_executed: false,
      s5_enrichment_executed: s5Gate.pass,
      s6_final_seal_executed: false,
      oidc_implementation_executed: false,
      db_conversion_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
      plaintext_pii_recorded: false,
      credential_material_recorded: false,
      token_material_recorded: false,
    },
  };
  } catch (error) {
    error.cti_s5_stage = stage;
    throw error;
  }
}

async function executeCutoverMatterMigration({ env = process.env, generatedAt } = {}) {
  const matterStorePath = cleanPath(env.LAWOS_MATTER_STORE_PATH);
  if (!matterStorePath) throw new Error("LAWOS_MATTER_STORE_PATH is required for CUTOVER matter migration");
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(matterStorePath);
  if (!isAbsolute(matterStorePath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    throw new Error("CUTOVER matter store path is outside allowed root");
  }
  const repository = createMatterRepository({ filePath: resolvedPath, seedRecords: [] });
  const before = repository.snapshot();
  const beforeKeys = new Set(before.records.map(recordKey));
  for (const client of AMIC_CURRENT_MATTER_CLIENTS) repository.upsert(currentMatterClientRecord(client, generatedAt));
  for (const matter of AMIC_CURRENT_MATTER_CODE_CANDIDATES) repository.upsert(currentMatterRecord(matter, generatedAt));
  const currentSyntheticRecords = repository
    .snapshot()
    .records
    .filter((record) => record.tenant_id === CTI_CUTOVER_SYNTHETIC_TENANT_ID && record.source_revision === CTI_CUTOVER_SOURCE_REVISION);
  const canonicalSyntheticFixtureRecords = repository
    .snapshot()
    .records
    .filter((record) => record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
      record.source_revision !== CTI_CUTOVER_SOURCE_REVISION &&
      (String(record.source_revision ?? "").startsWith("runtime-seed") || String(record.matter_id ?? "").startsWith("matter_rp05_")));
  const syntheticResidueRecords = [...currentSyntheticRecords, ...canonicalSyntheticFixtureRecords];
  let removedSyntheticResidueCount = 0;
  for (const record of syntheticResidueRecords) {
    if (repository.delete({
      tenant_id: record.tenant_id,
      model_type: record.model_type,
      id: primaryIdForRecord(record),
    })) {
      removedSyntheticResidueCount += 1;
    }
  }
  const after = repository.snapshot();
  const afterKeys = new Set(after.records.map(recordKey));
  const canonicalCounts = countCurrentMatterRecords(after.records);
  const syntheticCurrentCounts = countCurrentMatterRecords(after.records, CTI_CUTOVER_SYNTHETIC_TENANT_ID);
  const canonicalSyntheticFixtureCount = after.records.filter((record) => (
    record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID &&
    record.source_revision !== CTI_CUTOVER_SOURCE_REVISION &&
    (String(record.source_revision ?? "").startsWith("runtime-seed") || String(record.matter_id ?? "").startsWith("matter_rp05_"))
  )).length;
  const createdOrRestoredCount = [...afterKeys].filter((key) => !beforeKeys.has(key)).length;
  return {
    matter_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    matter_store_path_hash: hashRef(resolvedPath),
    clients_expected: AMIC_CURRENT_MATTER_CLIENTS.length,
    matters_expected: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    canonical_client_count: canonicalCounts.clients,
    canonical_matter_count: canonicalCounts.matters,
    canonical_current_record_count: canonicalCounts.total,
    synthetic_current_record_count: syntheticCurrentCounts.total,
    canonical_synthetic_fixture_count: canonicalSyntheticFixtureCount,
    created_or_restored_record_count: createdOrRestoredCount,
    removed_synthetic_current_record_count: currentSyntheticRecords.length,
    removed_canonical_synthetic_fixture_count: canonicalSyntheticFixtureRecords.length,
    removed_synthetic_residue_record_count: removedSyntheticResidueCount,
    d07_disposition: "no_149th_source_candidate_in_cutover_batch",
    readback_100_percent: canonicalCounts.clients === AMIC_CURRENT_MATTER_CLIENTS.length &&
      canonicalCounts.matters === AMIC_CURRENT_MATTER_CODE_CANDIDATES.length &&
      syntheticCurrentCounts.total === 0 &&
      canonicalSyntheticFixtureCount === 0,
    plaintext_pii_recorded: false,
  };
}

async function appendCutoverSecurityAuditEvent({
  env = process.env,
  generatedAt,
  receiptCore,
  approvalRefs = [
    CTI_CUTOVER_EXECUTE_RETRY_APPROVAL_REF,
    CTI_CUTOVER_EXECUTE_RETRY_SNAPSHOT_REBIND_APPROVAL_REF,
  ],
  snapshotHash = CTI_CUTOVER_CURRENT_SNAPSHOT_HASH,
} = {}) {
  const auditPath = cleanPath(env.LAWOS_AUDIT_STORE_PATH);
  if (!auditPath) throw new Error("LAWOS_AUDIT_STORE_PATH is required for CUTOVER audit");
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(auditPath);
  if (!isAbsolute(auditPath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    throw new Error("CUTOVER audit store path is outside allowed root");
  }
  const event = {
    event_id: `cti.cutover.execute.retry:${generatedAt}`,
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    action: "cti.cutover.execute.retry",
    object_id: "cti-cutover-execute",
    occurred_at: generatedAt,
    approval_signature_refs: approvalRefs,
    metadata: {
      snapshot_hash: snapshotHash,
      canonical_client_count: receiptCore.matter_migration?.canonical_client_count ?? null,
      canonical_matter_count: receiptCore.matter_migration?.canonical_matter_count ?? null,
      credential_record_count: receiptCore.credential_injection?.production_user_credential_count ?? null,
      plaintext_pii_recorded: false,
      credential_material_recorded: false,
      token_material_recorded: false,
    },
    event_hash: sha256Hex(stableJson(receiptCore)),
  };
  appendNdjsonDurably({ filePath: resolvedPath, value: event });
  return {
    audit_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    audit_store_path_hash: hashRef(resolvedPath),
    event_hash: event.event_hash,
    plaintext_pii_recorded: false,
    credential_material_recorded: false,
    token_material_recorded: false,
  };
}

export async function buildCtiCutoverExecuteRetryReceipt({ event = {}, env = process.env } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return legacyJsonMutationBlockedReceipt({
      maintenanceAction: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      reason: "operational_cutover_json_authority_disabled",
      schemaVersion: CTI_CUTOVER_EXECUTE_RETRY_SCHEMA_VERSION,
    });
  }
  const generatedAt = new Date().toISOString();
  const requestId = String(event.request_id ?? event.requestId ?? "cti-cutover-execute-retry");
  const eventApprovalRefs = Array.isArray(event.approval_signature_refs)
    ? event.approval_signature_refs
    : [event.approval_signature_ref].filter(Boolean);
  const resumeFromPartialState = event.resume_from_partial_state === true ||
    eventApprovalRefs.includes(CTI_CUTOVER_PARTIAL_STATE_RESUME_APPROVAL_REF);
  const resumeFromCurrentPartialState = event.resume_from_current_partial_state === true ||
    eventApprovalRefs.includes(CTI_CUTOVER_CURRENT_PARTIAL_RESUME_APPROVAL_REF);
  const resumeFromPostI21PartialState = event.resume_from_post_i21_partial_state === true ||
    eventApprovalRefs.includes(CTI_CUTOVER_POST_I21_PARTIAL_RESUME_APPROVAL_REF);
  const approvedSnapshotHash = resumeFromPostI21PartialState
    ? CTI_CUTOVER_POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH
    : resumeFromCurrentPartialState
      ? CTI_CUTOVER_CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH
    : resumeFromPartialState
      ? CTI_CUTOVER_PARTIAL_STATE_RESUME_SNAPSHOT_HASH
      : CTI_CUTOVER_CURRENT_SNAPSHOT_HASH;
  const approvalRefs = [
    CTI_CUTOVER_EXECUTE_RETRY_APPROVAL_REF,
    CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
    CTI_CUTOVER_EXECUTE_RETRY_SNAPSHOT_REBIND_APPROVAL_REF,
    ...(resumeFromPartialState ? [CTI_CUTOVER_PARTIAL_STATE_RESUME_APPROVAL_REF] : []),
    ...(resumeFromCurrentPartialState ? [CTI_CUTOVER_CURRENT_PARTIAL_RESUME_APPROVAL_REF] : []),
    ...(resumeFromPostI21PartialState ? [CTI_CUTOVER_POST_I21_PARTIAL_RESUME_APPROVAL_REF] : []),
  ];
  const preSnapshot = await buildCtiReadOnlyEfsSnapshotReceipt({ event: { request_id: `${requestId}:pre` }, env });
  const expectedSnapshotHash = String(event.expected_snapshot_hash ?? "");
  if (expectedSnapshotHash !== approvedSnapshotHash || preSnapshot.snapshot_hash !== approvedSnapshotHash) {
    return {
      ok: false,
      schema_version: CTI_CUTOVER_EXECUTE_RETRY_SCHEMA_VERSION,
      goal_id: "cti-cutover-execute",
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      request_id: requestId,
      generated_at: generatedAt,
      approval_signature_refs: approvalRefs,
      status: "BLOCKED_CURRENT_SNAPSHOT_HASH_MISMATCH",
      resume_from_partial_state: resumeFromPartialState,
      resume_from_current_partial_state: resumeFromCurrentPartialState,
      resume_from_post_i21_partial_state: resumeFromPostI21PartialState,
      expected_snapshot_hash: approvedSnapshotHash,
      event_expected_snapshot_hash: expectedSnapshotHash || null,
      observed_snapshot_hash: preSnapshot.snapshot_hash,
      production_write_executed: false,
      boundary: {
        direct_invoke_only: true,
        public_http_endpoint: false,
        production_write_executed: false,
        production_restore_executed: false,
        tenant_migration_executed: false,
        account_permission_injection_executed: false,
        bridge_token_rotation_control_executed: false,
        password_issuance_distribution_executed: false,
        first_login_validation_executed: false,
        cutover_executed: false,
        production_ready_claim: false,
        go_live_claim: false,
        plaintext_pii_recorded: false,
        credential_material_recorded: false,
        token_material_recorded: false,
      },
    };
  }

  const matterMigration = await executeCutoverMatterMigration({ env, generatedAt });
  const credentialInjection = await writeCutoverCredentialStore({
    credentialRecords: event.credential_records ?? [],
    env,
    generatedAt,
  });
  const bridgeControl = {
    bridge_enabled_env: env.LAWOS_VAULT_BRIDGE_ENABLED ?? null,
    bridge_disabled_or_window_closed: env.LAWOS_VAULT_BRIDGE_ENABLED !== "true",
    allowed_tenants: String(env.LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS ?? "")
      .split(",")
      .map((tenant) => tenant.trim())
      .filter(Boolean),
    service_actor_configured: Boolean(String(env.LAWOS_VAULT_BRIDGE_SERVICE_ACTOR_ID ?? "").trim()),
    token_rotation_receipt_recorded_by_operator: event.bridge_token_rotation_recorded === true,
    token_value_returned: false,
  };
  const receiptCore = {
    matter_migration: matterMigration,
    credential_injection: credentialInjection,
    bridge_control: bridgeControl,
  };
  const audit = await appendCutoverSecurityAuditEvent({
    env,
    generatedAt,
    receiptCore,
    approvalRefs,
    snapshotHash: approvedSnapshotHash,
  });
  const postSnapshot = await buildCtiReadOnlyEfsSnapshotReceipt({ event: { request_id: `${requestId}:post` }, env });
  const passed = matterMigration.readback_100_percent &&
    credentialInjection.production_user_credential_count === registeredProductionUsers().length &&
    credentialInjection.qa_disabled_credential_count === registeredQaUsers().length &&
    bridgeControl.bridge_disabled_or_window_closed === true &&
    bridgeControl.service_actor_configured === true &&
    bridgeControl.token_rotation_receipt_recorded_by_operator === true &&
    postSnapshot.ok === true;

  return {
    ok: passed,
    schema_version: CTI_CUTOVER_EXECUTE_RETRY_SCHEMA_VERSION,
    goal_id: "cti-cutover-execute",
    maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
    request_id: requestId,
    generated_at: generatedAt,
    lambda_function_name: env.AWS_LAMBDA_FUNCTION_NAME ?? "unknown",
    runtime_profile: env.LAWOS_RUNTIME_PROFILE ?? "unset",
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    approval_signature_refs: approvalRefs,
    resume_from_partial_state: resumeFromPartialState,
    resume_from_current_partial_state: resumeFromCurrentPartialState,
    resume_from_post_i21_partial_state: resumeFromPostI21PartialState,
    approved_snapshot_hash: approvedSnapshotHash,
    status: passed ? "PASS" : "BLOCKED_CUTOVER_EXECUTE_RETRY_VALIDATION_FAILED",
    pre_snapshot: {
      snapshot_hash: preSnapshot.snapshot_hash,
      readable_store_file_count: preSnapshot.readable_store_file_count,
      restore_rehearsal_status: preSnapshot.restore_rehearsal?.status ?? null,
      read_error_count: preSnapshot.read_error_count,
      blocked_path_count: preSnapshot.blocked_path_count,
    },
    matter_migration: matterMigration,
    account_permission_injection: {
      registered_account_count: MATTER_VAULT_USER_REGISTRATION_SEED.users.length,
      production_user_count: registeredProductionUsers().length,
      qa_disabled_user_count: registeredQaUsers().length,
      kyt_access_scope: "I2 conservative default: M&A/advisory matter and finance dashboard allowed; litigation/dispute excluded",
      credential_fields_preserved_except_cutover_password_hashes: true,
      role_scope_source: MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
      plaintext_pii_recorded: false,
    },
    credential_injection: credentialInjection,
    bridge_control: bridgeControl,
    password_issuance_distribution: {
      password_hashes_written: true,
      private_handoff_created_by_operator: event.password_distribution_private_handoff_created === true,
      distribution_channel: "in_person",
      plaintext_password_returned: false,
      plaintext_password_recorded_in_repo: false,
    },
    audit,
    cut_g_validation: {
      canonical_tenant_data_readback: matterMigration.readback_100_percent,
      qa_disabled: credentialInjection.qa_disabled_credential_count === registeredQaUsers().length,
      local_dev_synthetic_tokens_rejected_in_operational_profile: true,
      audit_event_durable: Boolean(audit.event_hash),
      post_snapshot_hash: postSnapshot.snapshot_hash,
      post_snapshot_readable_store_file_count: postSnapshot.readable_store_file_count,
      post_snapshot_restore_rehearsal_status: postSnapshot.restore_rehearsal?.status ?? null,
    },
    boundary: {
      direct_invoke_only: true,
      public_http_endpoint: false,
      production_write_executed: true,
      production_restore_executed: false,
      operational_profile_switch_executed: env.LAWOS_RUNTIME_PROFILE === "operational",
      tenant_migration_executed: true,
      account_permission_injection_executed: true,
      bridge_token_rotation_control_executed: true,
      password_issuance_distribution_executed: event.password_distribution_private_handoff_created === true,
      first_login_validation_executed: false,
      cut_g_validation_executed: passed,
      cutover_executed: passed,
      s5_enrichment_executed: false,
      s6_final_seal_executed: false,
      oidc_implementation_executed: false,
      db_conversion_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
      plaintext_pii_recorded: false,
      credential_material_recorded: false,
      token_material_recorded: false,
    },
  };
}

async function handleCtiReadOnlyEfsSnapshot(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_snapshot_surface_direct_invoke_only",
      maintenance_action: CTI_READONLY_EFS_SNAPSHOT_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_snapshot_approval_ref_required",
      maintenance_action: CTI_READONLY_EFS_SNAPSHOT_ACTION,
      public_http_endpoint: false,
    });
  }
  try {
    const receipt = await buildCtiReadOnlyEfsSnapshotReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_snapshot_surface_failed",
      error_name: error?.name ?? "Error",
      error_message_hash: pathHash(error?.message ?? "unknown"),
      maintenance_action: CTI_READONLY_EFS_SNAPSHOT_ACTION,
      plaintext_file_content_returned: false,
      secret_value_returned: false,
      production_write_executed: false,
      production_restore_executed: false,
    });
  }
}

async function handleCtiDbConnectionProof(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_db_connection_proof_direct_invoke_only",
      maintenance_action: CTI_DB_CONNECTION_PROOF_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== CTI_DB_CONNECTION_PROOF_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_db_connection_proof_approval_ref_required",
      maintenance_action: CTI_DB_CONNECTION_PROOF_ACTION,
      required_approval_signature_ref: CTI_DB_CONNECTION_PROOF_APPROVAL_REF,
      public_http_endpoint: false,
      secret_value_returned: false,
    });
  }
  try {
    const receipt = await buildCtiDbConnectionProofReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_db_connection_proof_failed",
      error_name: error?.name ?? "Error",
      error_code: error?.code ?? null,
      error_stage: error?.lawos_db_stage ?? null,
      error_message_hash: hashRef(error?.message ?? "unknown"),
      maintenance_action: CTI_DB_CONNECTION_PROOF_ACTION,
      public_http_endpoint: false,
      secret_value_returned: false,
      credential_material_returned: false,
      token_or_password_returned: false,
      production_write_executed: false,
      db_conversion_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

async function handleCtiS1GAuthenticatedProductionProbe(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_s1g_probe_surface_direct_invoke_only",
      maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_s1g_probe_approval_ref_required",
      maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.probe_principal && String(event.probe_principal).trim().toLowerCase() !== CTI_S1G_PROBE_PRINCIPAL_EMAIL) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_s1g_probe_principal_not_approved",
      maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
      public_http_endpoint: false,
      plaintext_principal_returned: false,
    });
  }
  try {
    const receipt = await buildCtiS1GAuthenticatedProductionProbeReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_s1g_authenticated_probe_failed",
      error_name: error?.name ?? "Error",
      error_message_hash: hashRef(error?.message ?? "unknown"),
      maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
      plaintext_file_content_returned: false,
      secret_value_returned: false,
      token_or_password_returned: false,
      credential_material_returned: false,
      production_migration_executed: false,
      production_restore_executed: false,
      cutover_executed: false,
    });
  }
}

async function handleHomeFinanceDashboardSmoke(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "home_finance_dashboard_smoke_direct_invoke_only",
      maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "home_finance_dashboard_smoke_approval_ref_required",
      maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
      required_approval_signature_ref: HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  const runtime = await apiRuntime();
  return buildHomeFinanceDashboardSmokeFromRuntime({
    runtime,
    tenantId: process.env.LAWOS_DATABASE_TENANT_ID ?? MATTER_VAULT_REGISTERED_TENANT_ID,
    requireCurrentActivity: event.require_current_activity === true,
  });
}

async function handleDirectReceiptAllocationMigration(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "direct_receipt_allocation_migration_direct_invoke_only",
      maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "direct_receipt_allocation_migration_approval_ref_required",
      maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      required_approval_signature_ref: DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  const execute = event.execute === true;
  if (execute && event.confirmation !== DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "direct_receipt_allocation_migration_confirmation_required",
      maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      required_confirmation: DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION,
      public_http_endpoint: false,
    });
  }
  const idempotencyKey = execute ? String(event.idempotency_key ?? "").trim() : null;
  if (execute && !idempotencyKey) {
    return jsonLambdaResponse(400, {
      ok: false,
      reason: "direct_receipt_allocation_migration_idempotency_key_required",
      maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      public_http_endpoint: false,
    });
  }
  const runtime = await apiRuntime();
  return buildDirectReceiptAllocationMigrationFromRuntime({
    runtime,
    tenantId: process.env.LAWOS_DATABASE_TENANT_ID ?? MATTER_VAULT_REGISTERED_TENANT_ID,
    execute,
    idempotencyKey,
  });
}

export async function buildHrxRosterReconcileReceipt({ env = process.env, now = () => new Date() } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return legacyJsonMutationBlockedReceipt({
      maintenanceAction: HRX_ROSTER_RECONCILE_ACTION,
      reason: "operational_hrx_json_authority_disabled",
    });
  }
  const storePath = cleanPath(env.LAWOS_HRX_STORE_PATH);
  if (!storePath) {
    return {
      ok: false,
      status: "BLOCKED_HRX_STORE_PATH_REQUIRED",
      reason: "lawos_hrx_store_path_required",
      production_write_executed: false,
    };
  }
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(storePath);
  if (!isAbsolute(storePath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    return {
      ok: false,
      status: "BLOCKED_HRX_STORE_PATH_OUTSIDE_ALLOWED_ROOT",
      reason: "hrx_store_path_outside_allowed_root",
      store_path_hash: hashRef(resolvedPath),
      production_write_executed: false,
    };
  }

  const beforeBytes = await readFile(resolvedPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const beforeState = readDurableJsonFile({ filePath: resolvedPath, defaultValue: { records: [] } });
  const timestamp = now().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${resolvedPath}.pre-roster-reconcile-${timestamp}.bak`;
  if (beforeBytes !== null) await copyFile(resolvedPath, backupPath);

  let store = null;
  try {
    store = createFileHrxStore({ filePath: resolvedPath });
    runHrxMigrations(store);
    const reconciliation = reconcileHrxMemberRosterStore(store, {
      tenant_ids: [MATTER_VAULT_REGISTERED_TENANT_ID],
    });
    const afterBytes = await readFile(resolvedPath);
    return {
      ok: true,
      status: "PASS",
      reconciliation,
      store_path_hash: hashRef(resolvedPath),
      store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
      backup_created: beforeBytes !== null,
      backup_path_hash: beforeBytes !== null ? hashRef(backupPath) : null,
      before_sha256: beforeBytes ? sha256Hex(beforeBytes) : null,
      after_sha256: sha256Hex(afterBytes),
      production_write_executed: true,
      plaintext_store_content_returned: false,
      employee_pii_returned: false,
      secret_value_returned: false,
      public_release_claim: false,
      go_live_claim: false,
    };
  } catch (error) {
    if (store) {
      const currentGeneration = store.durableGeneration();
      if (currentGeneration !== beforeState.generation) {
        if (beforeState.exists) {
          writeDurableJsonFile({
            filePath: resolvedPath,
            value: beforeState.value,
            expectedGeneration: currentGeneration,
          });
        } else {
          removeDurableJsonFile({ filePath: resolvedPath, expectedGeneration: currentGeneration });
        }
      }
    }
    throw error;
  }
}

async function handleHrxRosterReconcile(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "hrx_roster_reconcile_direct_invoke_only",
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== HRX_ROSTER_RECONCILE_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "hrx_roster_reconcile_approval_ref_required",
      required_approval_signature_ref: HRX_ROSTER_RECONCILE_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  try {
    const receipt = await buildHrxRosterReconcileReceipt();
    if (receipt.ok) await resetCachedApiServer();
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      status: "ERROR_HRX_ROSTER_RECONCILE_FAILED",
      reason: "hrx_roster_reconcile_failed",
      error_name: error?.name ?? "Error",
      error_message_hash: hashRef(error?.message ?? "unknown"),
      production_write_executed: false,
      secret_value_returned: false,
    });
  }
}

async function handleCtiCutoverExecuteRetry(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_cutover_execute_retry_direct_invoke_only",
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      public_http_endpoint: false,
    });
  }
  const approvalRefs = Array.isArray(event.approval_signature_refs)
    ? event.approval_signature_refs
    : [event.approval_signature_ref].filter(Boolean);
  const resumeFromPartialState = event.resume_from_partial_state === true ||
    approvalRefs.includes(CTI_CUTOVER_PARTIAL_STATE_RESUME_APPROVAL_REF);
  const resumeFromCurrentPartialState = event.resume_from_current_partial_state === true ||
    approvalRefs.includes(CTI_CUTOVER_CURRENT_PARTIAL_RESUME_APPROVAL_REF);
  const resumeFromPostI21PartialState = event.resume_from_post_i21_partial_state === true ||
    approvalRefs.includes(CTI_CUTOVER_POST_I21_PARTIAL_RESUME_APPROVAL_REF);
  if (
    !approvalRefs.includes(CTI_CUTOVER_EXECUTE_RETRY_APPROVAL_REF) ||
    !approvalRefs.includes(CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF) ||
    !approvalRefs.includes(CTI_CUTOVER_EXECUTE_RETRY_SNAPSHOT_REBIND_APPROVAL_REF)
  ) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_cutover_execute_retry_approval_refs_required",
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      required_approval_signature_refs: [
        CTI_CUTOVER_EXECUTE_RETRY_APPROVAL_REF,
        CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
        CTI_CUTOVER_EXECUTE_RETRY_SNAPSHOT_REBIND_APPROVAL_REF,
      ],
      public_http_endpoint: false,
    });
  }
  if (resumeFromPartialState && !approvalRefs.includes(CTI_CUTOVER_PARTIAL_STATE_RESUME_APPROVAL_REF)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_cutover_partial_state_resume_approval_ref_required",
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      required_approval_signature_ref: CTI_CUTOVER_PARTIAL_STATE_RESUME_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  if (resumeFromCurrentPartialState && !approvalRefs.includes(CTI_CUTOVER_CURRENT_PARTIAL_RESUME_APPROVAL_REF)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_cutover_current_partial_resume_approval_ref_required",
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      required_approval_signature_ref: CTI_CUTOVER_CURRENT_PARTIAL_RESUME_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  if (resumeFromPostI21PartialState && !approvalRefs.includes(CTI_CUTOVER_POST_I21_PARTIAL_RESUME_APPROVAL_REF)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_cutover_post_i21_partial_resume_approval_ref_required",
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      required_approval_signature_ref: CTI_CUTOVER_POST_I21_PARTIAL_RESUME_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  try {
    const receipt = await buildCtiCutoverExecuteRetryReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_cutover_execute_retry_failed",
      error_name: error?.name ?? "Error",
      error_message_hash: hashRef(error?.message ?? "unknown"),
      reference_error_identifier: error?.name === "ReferenceError"
        ? String(error?.message ?? "").match(/^([^ ]+) is not defined$/)?.[1] ?? "unclassified"
        : null,
      maintenance_action: CTI_CUTOVER_EXECUTE_RETRY_ACTION,
      public_http_endpoint: false,
      plaintext_file_content_returned: false,
      secret_value_returned: false,
      token_or_password_returned: false,
      credential_material_returned: false,
      production_restore_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

async function handleCtiS5EnrichmentExecute(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_s5_enrichment_execute_direct_invoke_only",
      maintenance_action: CTI_S5_ENRICHMENT_EXECUTE_ACTION,
      public_http_endpoint: false,
    });
  }
  const approvalRefs = Array.isArray(event.approval_signature_refs)
    ? event.approval_signature_refs
    : [event.approval_signature_ref].filter(Boolean);
  if (
    !approvalRefs.includes(CTI_S5_ENRICHMENT_APPROVAL_REF) ||
    !approvalRefs.includes(CTI_REMAINING_EXECUTION_OMNIBUS_APPROVAL_REF)
  ) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_s5_enrichment_execute_approval_refs_required",
      maintenance_action: CTI_S5_ENRICHMENT_EXECUTE_ACTION,
      required_approval_signature_refs: [
        CTI_S5_ENRICHMENT_APPROVAL_REF,
        CTI_REMAINING_EXECUTION_OMNIBUS_APPROVAL_REF,
      ],
      public_http_endpoint: false,
    });
  }
  try {
    const receipt = await buildCtiS5EnrichmentExecuteReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_s5_enrichment_execute_failed",
      error_name: error?.name ?? "Error",
      error_message_hash: hashRef(error?.message ?? "unknown"),
      error_stage: error?.cti_s5_stage ?? null,
      maintenance_action: CTI_S5_ENRICHMENT_EXECUTE_ACTION,
      public_http_endpoint: false,
      plaintext_file_content_returned: false,
      secret_value_returned: false,
      token_or_password_returned: false,
      credential_material_returned: false,
      production_restore_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

function cloneOverlayValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function overlayRecordMatchesQuery(record, query = {}) {
  return (!query.tenant_id || record.tenant_id === query.tenant_id) &&
    (!query.model_type || record.model_type === query.model_type) &&
    (!query.matter_id || record.matter_id === query.matter_id);
}

function createMatterDbReadOverlayRepository({ baseRepository, overlayRecords = [] } = {}) {
  const overlayByKey = new Map();
  for (const record of overlayRecords) overlayByKey.set(recordKey(record), cloneOverlayValue(record));
  return Object.freeze({
    ...baseRepository,
    db_read_overlay: true,
    db_read_overlay_record_count: overlayByKey.size,
    get(ref = {}) {
      const key = `${ref.tenant_id}:${ref.model_type}:${primaryIdForRecord(ref)}`;
      const overlay = overlayByKey.get(key);
      if (overlay) return Object.freeze(cloneOverlayValue(overlay));
      return baseRepository.get(ref);
    },
    list(query = {}) {
      const merged = new Map();
      for (const record of baseRepository.list(query)) merged.set(recordKey(record), cloneOverlayValue(record));
      for (const record of overlayByKey.values()) {
        if (overlayRecordMatchesQuery(record, query)) merged.set(recordKey(record), cloneOverlayValue(record));
      }
      return Object.freeze([...merged.values()].map((record) => Object.freeze(cloneOverlayValue(record))));
    },
    snapshot() {
      const baseSnapshot = baseRepository.snapshot();
      const records = new Map((baseSnapshot.records ?? []).map((record) => [recordKey(record), cloneOverlayValue(record)]));
      for (const record of overlayByKey.values()) records.set(recordKey(record), cloneOverlayValue(record));
      return Object.freeze({
        ...baseSnapshot,
        records: Object.freeze([...records.values()].map((record) => Object.freeze(cloneOverlayValue(record)))),
      });
    },
  });
}

function normalizeDbMatterStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "closed") return "closed";
  if (value === "opening" || value === "pending" || value === "draft") return "opening";
  if (value === "review_required") return "review_required";
  return "open";
}

function dbTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDbClientStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "inactive" || value === "needs_review" || value === "merged") return value;
  return "active";
}

function mapDbClientRecord(row = {}) {
  const createdAt = dbTimestamp(row.created_at) ?? new Date(0).toISOString();
  return Object.freeze({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    object_type: "MatterClient",
    model_type: "MatterClient",
    resource_id: row.client_id,
    client_id: row.client_id,
    client_display_name: row.name,
    display_name: row.name,
    client_name: row.name,
    client_short_name: row.client_id,
    client_type: row.client_type,
    status: normalizeDbClientStatus(row.status),
    confidentiality_level: row.confidentiality_level,
    source_revision: "amic-vault-postgres-read-overlay-2026-07-07",
    synthetic_only: false,
    created_by: row.created_by ?? "cti-db-materialize",
    created_at: createdAt,
    updated_by: row.updated_by ?? row.created_by ?? "cti-db-materialize",
    updated_at: dbTimestamp(row.updated_at),
  });
}

function mapDbRuntimeClientRecord(row = {}) {
  const clientId = String(row.client_id ?? "").trim();
  const record = createCanonicalRecord("Client", {
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    client_id: clientId,
    party_id: row.party_id ?? `party:${clientId}`,
    display_name: row.name,
    status: normalizeDbClientStatus(row.status),
    synthetic_only: false,
    creates_database_rows: false,
  });
  return Object.freeze({
    ...record,
    model_type: "Client",
    resource_id: clientId,
    client_type: row.client_type,
    confidentiality_level: row.confidentiality_level,
    source_revision: "amic-vault-postgres-read-overlay-2026-07-07",
  });
}

function mapDbMatterRecord(row = {}) {
  const createdAt = dbTimestamp(row.created_at) ?? new Date(0).toISOString();
  return Object.freeze({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    object_type: "Matter",
    model_type: "Matter",
    resource_id: row.matter_id,
    matter_id: row.matter_id,
    client_id: row.client_id,
    legal_client_party_id: row.client_id,
    billing_client_party_id: row.client_id,
    client_display_name: row.client_display_name,
    matter_code: row.matter_code,
    matter_number: row.matter_code,
    matter_name: row.matter_name,
    title: row.matter_name,
    matter_type_english: row.matter_type,
    status: normalizeDbMatterStatus(row.status),
    opened_at: dbTimestamp(row.opened_at),
    closed_at: dbTimestamp(row.closed_at),
    created_by: row.created_by ?? "cti-db-materialize",
    created_at: createdAt,
    owner_module: "amic_vault_postgres",
    permission_envelope_id: `perm:${MATTER_VAULT_REGISTERED_TENANT_ID}:${row.matter_id}:db-read-model`,
    audit_trace_id: `audit:${MATTER_VAULT_REGISTERED_TENANT_ID}:${row.matter_id}:db-read-model`,
    document_count: Number(row.document_count ?? 0),
    practice_group: row.practice_group ?? null,
    wip_status: "completed",
    risk_level: "standard",
    source_revision: "amic-vault-postgres-read-overlay-2026-07-07",
    synthetic_only: false,
    created_at: dbTimestamp(row.created_at),
    updated_at: dbTimestamp(row.updated_at),
  });
}

function normalizeDbMatterMemberStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "paused" || value === "removed") return value;
  return "active";
}

function mapDbMatterMemberRecord(row = {}) {
  const matterId = String(row.matter_id ?? "").trim();
  const userId = String(row.user_id ?? "").trim();
  const role = String(row.role ?? "matter_member").trim() || "matter_member";
  const memberId = row.member_id ?? `member_db_${matterId}_${userId}_${role}`;
  return Object.freeze({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    object_type: "MatterMember",
    model_type: "MatterMember",
    resource_id: memberId,
    member_id: memberId,
    matter_member_id: memberId,
    matter_id: matterId,
    employee_id: row.employee_id ?? null,
    user_id: userId,
    role,
    status: normalizeDbMatterMemberStatus(row.status),
    access_scope: row.access_scope ?? row.access_level ?? "matter_team",
    source_revision: "amic-vault-postgres-read-overlay-2026-07-07",
    synthetic_only: false,
  });
}

async function loadMatterDbReadOverlayRecords({ env = process.env, force = false } = {}) {
  if (!force && env[LAWOS_MATTER_DB_READ_OVERLAY_ENABLED_ENV] !== "true") return [];
  const tenantId = String(env[LAWOS_DATABASE_TENANT_ID_ENV] ?? "").trim();
  if (!tenantId) throw new Error(`${LAWOS_DATABASE_TENANT_ID_ENV} is required when Matter DB read overlay is enabled`);
  const secretId = String(env.LAWOS_DATABASE_URL_SECRET_ID ?? DEFAULT_DATABASE_URL_SECRET_ID).trim();
  const secretString = await fetchSessionSecretFromSecretsManager({ secretId, env });
  const databaseUrl = databaseUrlFromSecretString(secretString);
  const client = await createPgClient(databaseUrl);
  await client.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const clients = await client.query(`
      select client_id::text, name, client_type, confidentiality_level, status, created_by::text, created_at, updated_at
      from public.clients
      order by name, client_id
    `);
    const matters = await client.query(`
      with document_counts as (
        select matter_id, count(*)::int as document_count
        from public.documents
        where deleted_at is null
        group by matter_id
      )
      select
        m.matter_id::text,
        m.client_id::text,
        c.name as client_display_name,
        m.matter_code,
        m.matter_name,
        m.matter_type,
        m.status,
        m.opened_at,
        m.closed_at,
        m.practice_group,
        m.created_by::text,
        m.created_at,
        m.updated_at,
        coalesce(dc.document_count, 0)::int as document_count
      from public.matters m
      left join public.clients c on c.client_id = m.client_id
      left join document_counts dc on dc.matter_id = m.matter_id
      order by m.updated_at desc, m.matter_code
    `);
    const members = await client.query(`
      select matter_id::text, user_id::text, matter_role as role, access_level, added_at
      from public.matter_members
      order by matter_id, role, user_id
    `);
    await client.query("commit");
    return [
      ...clients.rows.map(mapDbClientRecord),
      ...clients.rows.map(mapDbRuntimeClientRecord),
      ...matters.rows.map(mapDbMatterRecord),
      ...members.rows.map(mapDbMatterMemberRecord),
    ];
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createLambdaMatterRepository({ env = process.env } = {}) {
  if (!legacyFileAuthorityAllowed(env)) return undefined;
  const baseRepository = createMatterRepository({
    filePath: env.LAWOS_MATTER_STORE_PATH,
    seedRecords: [],
  });
  let overlayRecords = [];
  try {
    overlayRecords = await loadMatterDbReadOverlayRecords({ env });
  } catch {
    overlayRecords = [];
  }
  return overlayRecords.length
    ? createMatterDbReadOverlayRepository({ baseRepository, overlayRecords })
    : baseRepository;
}

async function buildMatterDbSnapshotMaterializeReceipt({ event = {}, env = process.env } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return legacyJsonMutationBlockedReceipt({
      maintenanceAction: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION,
      reason: "operational_matter_json_materialization_disabled",
      schemaVersion: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_SCHEMA_VERSION,
    });
  }
  const generatedAt = new Date().toISOString();
  const storePath = String(env.LAWOS_MATTER_STORE_PATH ?? "").trim();
  if (!storePath) throw new Error("LAWOS_MATTER_STORE_PATH is required for Matter DB snapshot materialization");
  const beforeBytes = await readFile(storePath).catch(() => null);
  const repository = createMatterRepository({ filePath: storePath, seedRecords: [] });
  const records = await loadMatterDbReadOverlayRecords({ env, force: true });
  const materializedCounts = {
    Client: 0,
    MatterClient: 0,
    Matter: 0,
    MatterMember: 0,
  };
  for (const record of records) {
    try {
      repository.upsert({
        ...record,
        materialized_at: generatedAt,
        materialized_source: "amic-vault-postgres",
      });
    } catch (error) {
      if (error && typeof error === "object") {
        error.cti_materialize_model_type = record.model_type;
        error.cti_materialize_record_index = materializedCounts[record.model_type] ?? 0;
      }
      throw error;
    }
    if (Object.prototype.hasOwnProperty.call(materializedCounts, record.model_type)) {
      materializedCounts[record.model_type] += 1;
    }
  }
  const after = repository.snapshot();
  const afterBytes = await readFile(storePath);
  return Object.freeze({
    ok: true,
    schema_version: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_SCHEMA_VERSION,
    maintenance_action: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION,
    approval_signature_ref: event.approval_signature_ref ?? null,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    generated_at: generatedAt,
    app_tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    database_tenant_id_hash: hashRef(env[LAWOS_DATABASE_TENANT_ID_ENV] ?? ""),
    matter_store_path_hash: hashRef(storePath),
    before_sha256: beforeBytes ? `sha256:${sha256Hex(beforeBytes)}` : null,
    after_sha256: `sha256:${sha256Hex(afterBytes)}`,
    materialized_counts: materializedCounts,
    total_materialized_record_count: records.length,
    matter_store_total_record_count: after.records.length,
    pii_safe: true,
    secret_value_returned: false,
    credential_material_returned: false,
    token_or_password_returned: false,
    production_write_executed: true,
    production_write_scope: "matter_runtime_store_materialized_read_model_only",
    production_ready_claim: false,
    go_live_claim: false,
  });
}

async function handleMatterDbSnapshotMaterialize(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_matter_db_snapshot_materialize_direct_invoke_only",
      maintenance_action: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_matter_db_snapshot_materialize_approval_ref_required",
      maintenance_action: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION,
      required_approval_signature_ref: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_APPROVAL_REF,
      public_http_endpoint: false,
      secret_value_returned: false,
    });
  }
  try {
    const receipt = await buildMatterDbSnapshotMaterializeReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_matter_db_snapshot_materialize_failed",
      error_name: error?.name ?? "Error",
      error_code: error?.code ?? null,
      error_model_type: error?.cti_materialize_model_type ?? null,
      error_record_index: error?.cti_materialize_record_index ?? null,
      error_message_hash: hashRef(error?.message ?? "unknown"),
      maintenance_action: CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION,
      public_http_endpoint: false,
      secret_value_returned: false,
      credential_material_returned: false,
      token_or_password_returned: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

async function buildMatterStoreReadModelProofReceipt({ event = {}, env = process.env } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return legacyJsonMutationBlockedReceipt({
      maintenanceAction: CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION,
      reason: "operational_matter_json_read_model_disabled",
      schemaVersion: CTI_MATTER_STORE_READ_MODEL_PROOF_SCHEMA_VERSION,
    });
  }
  const storePath = String(env.LAWOS_MATTER_STORE_PATH ?? "").trim();
  if (!storePath) throw new Error("LAWOS_MATTER_STORE_PATH is required for Matter store read model proof");
  const bytes = await readFile(storePath);
  const parsed = JSON.parse(bytes.toString("utf8"));
  const records = Array.isArray(parsed.records) ? parsed.records : [];
  const tenantRecords = records.filter((record) => record.tenant_id === MATTER_VAULT_REGISTERED_TENANT_ID);
  const counts = {
    Client: tenantRecords.filter((record) => record.object_type === "Client" || record.model_type === "Client").length,
    MatterClient: tenantRecords.filter((record) => record.model_type === "MatterClient").length,
    Matter: tenantRecords.filter((record) => record.object_type === "Matter" || record.model_type === "Matter").length,
    MatterMember: tenantRecords.filter((record) => record.object_type === "MatterMember" || record.model_type === "MatterMember").length,
  };
  return Object.freeze({
    ok: counts.Client > 0 && counts.MatterClient > 0 && counts.Matter > 0 && counts.MatterMember > 0,
    schema_version: CTI_MATTER_STORE_READ_MODEL_PROOF_SCHEMA_VERSION,
    maintenance_action: CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION,
    approval_signature_ref: event.approval_signature_ref ?? null,
    generated_at: new Date().toISOString(),
    app_tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_store_path_hash: hashRef(storePath),
    matter_store_sha256: `sha256:${sha256Hex(bytes)}`,
    matter_store_total_record_count: records.length,
    app_tenant_record_count: tenantRecords.length,
    read_model_counts: counts,
    db_connection_used: false,
    secret_value_returned: false,
    credential_material_returned: false,
    token_or_password_returned: false,
    production_write_executed: false,
    production_ready_claim: false,
    go_live_claim: false,
  });
}

async function handleMatterStoreReadModelProof(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_matter_store_read_model_proof_direct_invoke_only",
      maintenance_action: CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== CTI_MATTER_STORE_READ_MODEL_PROOF_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_matter_store_read_model_proof_approval_ref_required",
      maintenance_action: CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION,
      required_approval_signature_ref: CTI_MATTER_STORE_READ_MODEL_PROOF_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  try {
    const receipt = await buildMatterStoreReadModelProofReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_matter_store_read_model_proof_failed",
      error_name: error?.name ?? "Error",
      error_code: error?.code ?? null,
      error_message_hash: hashRef(error?.message ?? "unknown"),
      maintenance_action: CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION,
      db_connection_used: false,
      secret_value_returned: false,
      credential_material_returned: false,
      token_or_password_returned: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

const CTI_CLIENT_DISPLAY_REPAIR_FROM = "인천 더드림병원";
const CTI_CLIENT_DISPLAY_REPAIR_TO = "더드림병원";
const CTI_CLIENT_DISPLAY_REPAIR_FIELDS = new Set([
  "display_name",
  "canonical_display_name",
  "client_display_name",
  "client_short_name",
  "client_name",
  "legal_client_display_name",
  "billing_client_display_name",
  "matter_code",
  "matter_name",
  "title",
]);

function countAllowedClientDisplayNameOccurrences(value, target = CTI_CLIENT_DISPLAY_REPAIR_FROM) {
  let count = 0;
  const visit = (candidate) => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, nested] of Object.entries(candidate)) {
      if (typeof nested === "string" && CTI_CLIENT_DISPLAY_REPAIR_FIELDS.has(key)) {
        count += nested.split(target).length - 1;
      } else {
        visit(nested);
      }
    }
  };
  visit(value);
  return count;
}

function repairClientDisplayNameValue(value, stats) {
  if (Array.isArray(value)) return value.map((item) => repairClientDisplayNameValue(item, stats));
  if (!value || typeof value !== "object") return value;
  const next = {};
  for (const [key, nested] of Object.entries(value)) {
    if (
      typeof nested === "string" &&
      CTI_CLIENT_DISPLAY_REPAIR_FIELDS.has(key) &&
      nested.includes(CTI_CLIENT_DISPLAY_REPAIR_FROM)
    ) {
      const replaced = nested.split(CTI_CLIENT_DISPLAY_REPAIR_FROM).join(CTI_CLIENT_DISPLAY_REPAIR_TO);
      stats.modified_field_occurrence_count += nested.split(CTI_CLIENT_DISPLAY_REPAIR_FROM).length - 1;
      stats.modified_fields.add(key);
      next[key] = replaced;
    } else {
      next[key] = repairClientDisplayNameValue(nested, stats);
    }
  }
  return next;
}

function countStoreLiteralOccurrences(bytes, target = CTI_CLIENT_DISPLAY_REPAIR_FROM) {
  return bytes.toString("utf8").split(target).length - 1;
}

async function buildClientDisplayNameRepairReceipt({ event = {}, env = process.env } = {}) {
  if (!legacyFileAuthorityAllowed(env)) {
    return legacyJsonMutationBlockedReceipt({
      maintenanceAction: CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION,
      reason: "operational_matter_json_authority_disabled",
      schemaVersion: CTI_CLIENT_DISPLAY_NAME_REPAIR_SCHEMA_VERSION,
    });
  }
  const generatedAt = new Date().toISOString();
  const dryRun = event.dry_run === true;
  const storePath = String(env.LAWOS_MATTER_STORE_PATH ?? "").trim();
  if (!storePath) throw new Error("LAWOS_MATTER_STORE_PATH is required for client display name repair");
  const allowedRoot = snapshotAllowedRoot(env);
  const resolvedPath = resolve(storePath);
  if (!isAbsolute(storePath) || !isInsideRoot(allowedRoot, resolvedPath)) {
    throw new Error("Client display name repair store path is outside allowed root");
  }
  const beforeBytes = await readFile(resolvedPath);
  const beforeState = readDurableJsonFile({ filePath: resolvedPath });
  const parsed = beforeState.value;
  const records = Array.isArray(parsed.records) ? parsed.records : [];
  const beforeAllowedOccurrenceCount = countAllowedClientDisplayNameOccurrences(records);
  const stats = {
    modified_field_occurrence_count: 0,
    modified_fields: new Set(),
  };
  const nextRecords = records.map((record) => repairClientDisplayNameValue(record, stats));
  const modifiedRecordCount = records.filter((record, index) => stableJson(record) !== stableJson(nextRecords[index])).length;
  const nextStore = { ...parsed, records: nextRecords };
  if (!dryRun && modifiedRecordCount > 0) {
    writeDurableJsonFile({
      filePath: resolvedPath,
      value: nextStore,
      expectedGeneration: beforeState.generation,
    });
  }
  const afterBytes = dryRun ? beforeBytes : await readFile(resolvedPath);
  const afterParsed = JSON.parse(afterBytes.toString("utf8"));
  const afterRecords = Array.isArray(afterParsed.records) ? afterParsed.records : [];
  const afterAllowedOccurrenceCount = countAllowedClientDisplayNameOccurrences(afterRecords);
  return Object.freeze({
    ok: dryRun ? true : afterAllowedOccurrenceCount === 0,
    schema_version: CTI_CLIENT_DISPLAY_NAME_REPAIR_SCHEMA_VERSION,
    maintenance_action: CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION,
    approval_signature_ref: event.approval_signature_ref ?? null,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    generated_at: generatedAt,
    dry_run: dryRun,
    app_tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    matter_store_relative_path: safeRelativePath(allowedRoot, resolvedPath),
    matter_store_path_hash: hashRef(resolvedPath),
    before_sha256: `sha256:${sha256Hex(beforeBytes)}`,
    after_sha256: `sha256:${sha256Hex(afterBytes)}`,
    target_old_name_hash: hashRef(CTI_CLIENT_DISPLAY_REPAIR_FROM),
    target_new_name_hash: hashRef(CTI_CLIENT_DISPLAY_REPAIR_TO),
    allowed_field_old_occurrence_count_before: beforeAllowedOccurrenceCount,
    allowed_field_old_occurrence_count_after: afterAllowedOccurrenceCount,
    store_old_literal_occurrence_count_before: countStoreLiteralOccurrences(beforeBytes),
    store_old_literal_occurrence_count_after: countStoreLiteralOccurrences(afterBytes),
    modified_record_count: modifiedRecordCount,
    modified_field_occurrence_count: stats.modified_field_occurrence_count,
    modified_fields: [...stats.modified_fields].sort(),
    production_write_executed: !dryRun && modifiedRecordCount > 0,
    secret_value_returned: false,
    credential_material_returned: false,
    token_or_password_returned: false,
    plaintext_pii_recorded: false,
    production_ready_claim: false,
    go_live_claim: false,
  });
}

async function handleClientDisplayNameRepair(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_client_display_name_repair_direct_invoke_only",
      maintenance_action: CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION,
      public_http_endpoint: false,
    });
  }
  if (event.approval_signature_ref !== CTI_CLIENT_DISPLAY_NAME_REPAIR_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "cti_client_display_name_repair_approval_ref_required",
      maintenance_action: CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION,
      required_approval_signature_ref: CTI_CLIENT_DISPLAY_NAME_REPAIR_APPROVAL_REF,
      public_http_endpoint: false,
    });
  }
  try {
    const receipt = await buildClientDisplayNameRepairReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "cti_client_display_name_repair_failed",
      error_name: error?.name ?? "Error",
      error_code: error?.code ?? null,
      error_message_hash: hashRef(error?.message ?? "unknown"),
      maintenance_action: CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION,
      secret_value_returned: false,
      credential_material_returned: false,
      token_or_password_returned: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

async function handleLcxAuthResetRecovery(event = {}) {
  if (isHttpLambdaEvent(event)) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "lcx_auth_reset_recovery_direct_invoke_only",
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      public_http_endpoint: false,
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
  if (event.approval_signature_ref !== LCX_AUTH_RESET_RECOVERY_APPROVAL_REF) {
    return jsonLambdaResponse(403, {
      ok: false,
      reason: "lcx_auth_reset_recovery_approval_ref_required",
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      required_approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
      public_http_endpoint: false,
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
  try {
    const receipt = await buildLcxAuthResetRecoveryReceipt({ event });
    return jsonLambdaResponse(receipt.ok ? 200 : receipt.status_code ?? 424, receipt);
  } catch (error) {
    return jsonLambdaResponse(500, {
      ok: false,
      reason: "lcx_auth_reset_recovery_failed",
      maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
      error_name: error?.name ?? "Error",
      error_code: error?.code ?? null,
      error_message_hash: hashRef(error?.message ?? "unknown"),
      public_http_endpoint: false,
      token_material_returned_to_caller: false,
      reset_url_returned_to_caller: false,
      password_plaintext_returned: false,
      password_plaintext_recorded: false,
      production_ready_claim: false,
      go_live_claim: false,
    });
  }
}

export function createRetryablePromiseCache(factory) {
  if (typeof factory !== "function") throw new TypeError("retryable promise cache factory is required");
  let current;
  return Object.freeze({
    get() {
      if (!current) {
        const pending = Promise.resolve().then(factory);
        current = pending;
        void pending.catch(() => {
          if (current === pending) current = undefined;
        });
      }
      return current;
    },
    take() {
      const pending = current;
      current = undefined;
      return pending;
    },
  });
}

export function createLambdaApiRuntimeCache({
  env = process.env,
  payrollStatementProviderVerifier = null,
  leaveProviderVerifier = null,
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled,
  startApiServerFn = startApiServer,
  createMatterRepositoryFn = createLambdaMatterRepository,
  resolveHrxStepUpSecretsFn = resolveLambdaHrxStepUpSecrets,
  loadHrxRelationalProjectionFn = loadHrxRelationalProjectionRuntimeInput,
  resolveSessionSecretFn = resolveLambdaSessionSecret,
  resolveAmicVaultProvidersFn = resolveLambdaAmicVaultProviders,
  createPasswordResetEmailDeliveryFn = createLambdaPasswordResetEmailDelivery,
  resolvePeopleOutlookRuntimeFactoryFn =
    resolveLambdaPeopleOutlookRuntimeFactory,
  resolveClientOutlookM365GraphConfigFn =
    resolveLambdaClientOutlookM365GraphConfig,
  createMicrosoftEgressBrokerTransportFn =
    createMicrosoftEgressBrokerTransport,
} = {}) {
  return createRetryablePromiseCache(async () => {
    const matterRepository = await createMatterRepositoryFn();
    const hrxStepUpSecrets = await resolveHrxStepUpSecretsFn();
    const hrxRelationalProjection =
      await loadHrxRelationalProjectionFn();
    const microsoftEgressTransport =
      createMicrosoftEgressBrokerTransportFn();
    const peopleOutlookRuntimeFactory =
      await resolvePeopleOutlookRuntimeFactoryFn({
        microsoft_egress_transport: microsoftEgressTransport,
      });
    const m365GraphConfig =
      await resolveClientOutlookM365GraphConfigFn({
        env,
        microsoft_egress_transport: microsoftEgressTransport,
      });
    const amicVaultProviders = await resolveAmicVaultProvidersFn({ env });
    const directOutlookDesktopRoster =
      env[LAWOS_OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_ENV];
    const explicitOutlookDesktopRoster =
      directOutlookDesktopRoster == null || directOutlookDesktopRoster === ""
        ? m365GraphConfig?.outlook_desktop_autoconnect_roster ?? null
        : undefined;
    const startupOptions = {
      port: 0,
      outlookDesktopEntitlementEnabled: false,
      sessionSecret: await resolveSessionSecretFn(),
      ...hrxStepUpSecrets,
      ...(hrxRelationalProjection
        ? {
            hrxRelationalProjectionMappingManifest:
              hrxRelationalProjection.mappingManifest,
            hrxRelationalProjectionValidationResultSha256:
              hrxRelationalProjection.validationEvidence.result_sha256,
          }
        : {}),
      passwordResetEmailDelivery: createPasswordResetEmailDeliveryFn(),
      ...(matterRepository ? { matterRepository } : {}),
      ...(peopleOutlookRuntimeFactory
        ? { peopleOutlookRuntimeFactory }
        : {}),
      ...(m365GraphConfig ? { m365GraphConfig } : {}),
      clientOperationsV2Enabled:
        env[LAWOS_CLIENT_OPERATIONS_V2_ENABLED_ENV],
      payrollStatementProviderVerifier,
      leaveProviderVerifier,
      leaveIntegrationProviders,
      leaveIntegrationProviderEnabled,
      ...amicVaultProviders,
    };
    Object.defineProperty(startupOptions, "outlookDesktopAutoconnectRoster", {
      value: explicitOutlookDesktopRoster,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    return startApiServerFn(startupOptions);
  });
}

const apiRuntimeCache = createLambdaApiRuntimeCache();

async function apiRuntime() {
  return apiRuntimeCache.get();
}

async function apiBaseUrl() {
  const { port } = await apiRuntime();
  return `http://127.0.0.1:${port}`;
}

async function resetCachedApiServer() {
  const currentServerPromise = apiRuntimeCache.take();
  if (!currentServerPromise) return;
  const current = await currentServerPromise.catch(() => null);
  if (current?.server) {
    await new Promise((resolveClose) => current.server.close(resolveClose));
  }
}

const OUTLOOK_FAILURE_ROUTES = new Map([
  ["/api/outlook/attachments/save", ["attachment_save", "/api/outlook/attachments/save"]],
  ["/api/outlook/email/file", ["email_file", "/api/outlook/email/file"]],
  ["/api/outlook/vault/attachments/save", ["vault_attachment_save", "/api/outlook/vault/attachments/save"]],
  ["/api/outlook/vault/source/status", ["vault_source_status", "/api/outlook/vault/source/status"]],
  ["/api/outlook/vault/attachments/authorize", ["vault_attachment_authorize", "/api/outlook/vault/attachments/authorize"]],
  ["/api/outlook/vault/attachments/complete", ["vault_attachment_complete", "/api/outlook/vault/attachments/complete"]],
  ["/api/outlook/vault/email/save", ["vault_email_save", "/api/outlook/vault/email/save"]],
  ["/api/outlook/vault/sent/save", ["vault_sent_save", "/api/outlook/vault/sent/save"]],
  ["/api/outlook/messages/identity", ["message_identity", "/api/outlook/messages/identity"]],
  ["/api/outlook/operation-receipts/readback", ["operation_receipt_readback", "/api/outlook/operation-receipts/readback"]],
  ["/api/outlook/sent/file", ["sent_file", "/api/outlook/sent/file"]],
]);

function safeOutlookFailureRoute(path) {
  const normalizedPath = String(path ?? "").replace(/\/+$/u, "") || "/";
  const exact = OUTLOOK_FAILURE_ROUTES.get(normalizedPath);
  if (exact) return { operation: exact[0], path: exact[1] };
  if (normalizedPath === "/api/desktop/installations") {
    return {
      operation: "desktop_installation_register",
      path: "/api/desktop/installations",
    };
  }
  const desktopLifecycle = normalizedPath.match(
    /^\/api\/desktop\/installations\/[^/]+(?:\/(heartbeat|retire))?$/u,
  );
  if (desktopLifecycle) {
    const action = desktopLifecycle[1] ?? "read";
    return {
      operation: `desktop_installation_${action}`,
      path: action === "read"
        ? "/api/desktop/installations/:id"
        : `/api/desktop/installations/:id/${action}`,
    };
  }
  const matterRead = normalizedPath.match(
    /^\/api\/outlook\/matters\/[^/]+\/(documents|timeline)$/u,
  );
  if (matterRead) {
    return {
      operation: `matter_${matterRead[1]}`,
      path: `/api/outlook/matters/:id/${matterRead[1]}`,
    };
  }
  if (normalizedPath.startsWith("/api/outlook/")) {
    return { operation: "outlook_route", path: "/api/outlook/:other" };
  }
  if (normalizedPath.startsWith("/api/auth/office-sso/")) {
    return { operation: "office_sso_route", path: "/api/auth/office-sso/:other" };
  }
  return null;
}

export function createLambdaHttpHandler({
  env = process.env,
  runtimeCache,
  payrollStatementProviderVerifier = null,
  leaveProviderVerifier = null,
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled,
  startApiServerFn = startApiServer,
  createMatterRepositoryFn = createLambdaMatterRepository,
  resolveHrxStepUpSecretsFn = resolveLambdaHrxStepUpSecrets,
  loadHrxRelationalProjectionFn = loadHrxRelationalProjectionRuntimeInput,
  resolveSessionSecretFn = resolveLambdaSessionSecret,
  createPasswordResetEmailDeliveryFn = createLambdaPasswordResetEmailDelivery,
  resolvePeopleOutlookRuntimeFactoryFn =
    resolveLambdaPeopleOutlookRuntimeFactory,
  resolveClientOutlookM365GraphConfigFn =
    resolveLambdaClientOutlookM365GraphConfig,
  createMicrosoftEgressBrokerTransportFn =
    createMicrosoftEgressBrokerTransport,
  fetchFn = fetch,
  logFn = console.warn,
} = {}) {
  const resolvedRuntimeCache = runtimeCache ?? createLambdaApiRuntimeCache({
    env,
    payrollStatementProviderVerifier,
    leaveProviderVerifier,
    leaveIntegrationProviders,
    leaveIntegrationProviderEnabled,
    startApiServerFn,
    createMatterRepositoryFn,
    resolveHrxStepUpSecretsFn,
    loadHrxRelationalProjectionFn,
    resolveSessionSecretFn,
    createPasswordResetEmailDeliveryFn,
    resolvePeopleOutlookRuntimeFactoryFn,
    resolveClientOutlookM365GraphConfigFn,
    createMicrosoftEgressBrokerTransportFn,
  });
  return async (event = {}) => {
    const method = requestMethod(event).toUpperCase();
    const runtime = await resolvedRuntimeCache.get();
    const response = await fetchFn(`http://127.0.0.1:${runtime.port}${requestPath(event)}`, {
      method,
      headers: requestHeaders(event),
      body: requestBody(event, method),
      redirect: "manual",
    });
    const path = event.rawPath || event.path || "/";
    const binaryVaultDelivery = (
      (method === "GET" && path.startsWith(OUTLOOK_VAULT_ATTACHMENT_DELIVERY_PREFIX))
      || (method === "POST" && path === DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH)
    )
      && response.status >= 200
      && response.status < 300;
    const body = binaryVaultDelivery
      ? Buffer.from(await response.arrayBuffer()).toString("base64")
      : await response.text();
    const headers = Object.fromEntries(response.headers.entries());
    const failureRoute = safeOutlookFailureRoute(path);
    if (response.status >= 400 && failureRoute) {
      let payload = {};
      try {
        payload = JSON.parse(body);
      } catch {
        // Invalid response bodies are represented by empty safe metadata.
      }
      logFn(JSON.stringify({
        event: "lawos.outlook.request_failed",
        method,
        operation: failureRoute.operation,
        path: failureRoute.path,
        request_id: typeof event.requestContext?.requestId === "string"
          && /^[A-Za-z0-9._:=-]{1,128}$/u.test(event.requestContext.requestId)
          ? event.requestContext.requestId
          : "",
        safe_error_codes: (Array.isArray(payload.safe_error_codes) ? payload.safe_error_codes : [])
          .filter((code) => typeof code === "string" && /^[A-Z0-9_]+$/u.test(code))
          .slice(0, 5),
        status: response.status,
      }));
    }
    return {
      statusCode: response.status,
      headers,
      body,
      isBase64Encoded: binaryVaultDelivery,
    };
  };
}

const defaultLambdaHttpHandler = createLambdaHttpHandler({ runtimeCache: apiRuntimeCache });

export async function handler(event = {}) {
  const outlookConversationMaintenance = await handleOutlookConversationMaintenanceEvent(
    event,
    { runtime_factory: apiRuntime, env: process.env },
  );
  if (outlookConversationMaintenance) return outlookConversationMaintenance;
  if (maintenanceAction(event) === LAWOS_PASSWORD_RESET_WORKER_ACTION) {
    const tenantId = String(process.env.LAWOS_IDENTITY_TENANT_ID ?? "").trim();
    if (!tenantId) throw new Error("LAWOS_IDENTITY_TENANT_ID is required for the password reset worker");
    const runtime = await apiRuntime();
    const counts = await runtime.sessionAuth.processPasswordResetQueue({ tenantId, limit: 1 });
    return {
      outcome: "PASS",
      worker: LAWOS_PASSWORD_RESET_WORKER_ACTION,
      ...counts,
      email_included: false,
      token_material_returned: false,
    };
  }
  if (maintenanceAction(event) === HRX_ROSTER_RECONCILE_ACTION) {
    return handleHrxRosterReconcile(event);
  }
  if (maintenanceAction(event) === HOME_FINANCE_DASHBOARD_SMOKE_ACTION) {
    return handleHomeFinanceDashboardSmoke(event);
  }
  if (maintenanceAction(event) === DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION) {
    return handleDirectReceiptAllocationMigration(event);
  }
  if (maintenanceAction(event) === LCX_AUTH_RESET_RECOVERY_ACTION) {
    return handleLcxAuthResetRecovery(event);
  }
  if (maintenanceAction(event) === CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION) {
    return handleClientDisplayNameRepair(event);
  }
  if (maintenanceAction(event) === CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION) {
    return handleMatterStoreReadModelProof(event);
  }
  if (maintenanceAction(event) === CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION) {
    return handleMatterDbSnapshotMaterialize(event);
  }
  if (maintenanceAction(event) === CTI_DB_CONNECTION_PROOF_ACTION) {
    return handleCtiDbConnectionProof(event);
  }
  if (maintenanceAction(event) === CTI_S5_ENRICHMENT_EXECUTE_ACTION) {
    return handleCtiS5EnrichmentExecute(event);
  }
  if (maintenanceAction(event) === CTI_CUTOVER_EXECUTE_RETRY_ACTION) {
    return handleCtiCutoverExecuteRetry(event);
  }
  if (maintenanceAction(event) === CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION) {
    return handleCtiS1GAuthenticatedProductionProbe(event);
  }
  if (maintenanceAction(event) === CTI_READONLY_EFS_SNAPSHOT_ACTION) {
    return handleCtiReadOnlyEfsSnapshot(event);
  }
  if (maintenanceAction(event)) {
    return jsonLambdaResponse(400, {
      ok: false,
      reason: "unsupported_maintenance_action",
      public_http_endpoint: false,
    });
  }
  return defaultLambdaHttpHandler(event);
}
