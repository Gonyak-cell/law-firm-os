// Law Firm OS API — zero-dependency node:http server (style: scripts/serve-progress-control-room.mjs).
//
// Binds 127.0.0.1 only. Every data route runs through the fail-closed permission
// gate (permission-kernel-contract v0.28 decision order, default deny). The only
// ungated route is GET /api/health, which returns static service-descriptor
// metadata and no tenant-scoped data.
import http from "node:http";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { types } from "node:util";

const PROCESS_INSTANCE_FINGERPRINT = randomUUID().replaceAll("-", "");
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { PEOPLE_FEATURE_FLAG_NAMES } from "../../../packages/hrx/src/people-feature-flags.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { HRX_DURABLE_CORE_TABLES, HRX_DURABLE_WORKFLOW_TABLES } from "../../../packages/hrx/src/store/port.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterTimelineCursorAuthority } from "../../../packages/matter/src/timeline-cursor-authority.js";
import { createOutlookAttachmentReceiptAuthority } from "./outlook-attachment-receipt-authority.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { M365_GRAPH_CALLBACK_MODES } from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import { createS3StorageAdapter } from "../../../packages/dms/src/storage/s3-storage-adapter.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { inspectPostgresEngagementLegacyIdempotency } from "../../../packages/intake/src/engagement-legacy-idempotency-readiness.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import {
  createClientFixedReportSnapshotTokenAuthority,
} from "../../../packages/reports/src/index.js";
import { createAiGovernanceRepository } from "../../../packages/ai-governance/src/runtime-repository.js";
import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { createUiReadinessRepository } from "../../../packages/platform/src/ui-readiness-repository.js";
import { createEnterpriseReadinessRepository } from "../../../packages/enterprise/src/enterprise-readiness-repository.js";
import { assertRuntimePersistenceStore } from "../../../packages/platform/src/persistence/store-port.js";
import {
  MASTER_DATA_RUNTIME_SEED,
  MASTER_DATA_BOUNDED_CONTEXT,
  createMasterDataRuntimeContext,
  handleClientGroupRegistrationCreate,
  handleClientGroupRegistrationReview,
  handleClientGroupResolution,
  handleRecordsSearch,
  handleRelationshipLookup,
} from "./master-data-context.js";
import { HRX_SESSION_BOUND_HEADER, authorizeHrxApiRequest } from "./middleware/hrx-authz.js";
import {
  denyPayrollStatementProviderCallback,
  handlePayrollStatementProviderCallback,
  isPayrollStatementProviderCallback,
  verifyPayrollStatementProviderCallback,
} from "./routes/hrx/payroll-statement-provider-callback.js";
import {
  LEAVE_PROVIDER_TENANT_HEADER,
  handleLeaveProviderCallback,
  isLeaveProviderCallback,
} from "./routes/hrx/leave-provider-callback.js";
import { appendHrxRouteAudit } from "./middleware/hrx-audit-write.js";
import { HRX_STEP_UP_CONTEXT_HEADER, authorizeHrxStepUpRequest } from "./middleware/hrx-step-up-context.js";
import { PERMISSION_CONTEXT_HEADER, PERMISSION_DECISION_ORDER, evaluateRouteDecision, parsePermissionContext } from "./permission-gate.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
  resolveHrxEmployeeProfileByUserId,
  seedHrxDurableRuntimeStore,
} from "./hrx-runtime-context.js";
import { findHrxMemberRosterByUserId, memberPhotoDataUrlForEmployeeId } from "./hrx-member-roster-registry.js";
import { findRegisteredAccountByUserId } from "./matter-vault-account-registry.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "./matter-vault-account-registry.js";
import {
  MATTER_BOUNDED_CONTEXT,
  MATTER_VAULT_BRIDGE_ROUTES,
  MATTER_RUNTIME_SEED,
  VAULT_BRIDGE_TOKEN_HEADER,
  createMatterRuntimeContext,
  handleMatterApiRequest,
  repairCurrentMatterInventoryClassification,
} from "./matter-runtime-context.js";
import {
  VAULT_DMS_BOUNDED_CONTEXT,
  VAULT_DMS_RUNTIME_SEED,
  createVaultDmsRuntimeContext,
  handleVaultDmsApiRequest,
} from "./vault-dms-runtime-context.js";
import {
  CRM_INTAKE_BOUNDED_CONTEXT,
  CRM_MASTER_DATA_SEED,
  CRM_RUNTIME_SEED,
  INTAKE_RUNTIME_SEED,
  createCrmIntakeRuntimeContext,
  handleCrmIntakeApiRequest,
} from "./crm-intake-runtime-context.js";
import {
  FINANCE_BOUNDED_CONTEXT,
  FINANCE_RUNTIME_SEED,
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "./finance-runtime-context.js";
import { createBankImportPreviewTokenAuthority } from "./bank-import-preview-token.js";
import {
  ANALYTICS_BOUNDED_CONTEXT,
  ANALYTICS_RUNTIME_SEED,
  createAnalyticsRuntimeContext,
  handleAnalyticsApiRequest,
} from "./analytics-runtime-context.js";
import {
  AI_BOUNDED_CONTEXT,
  AI_RUNTIME_SEED,
  createAiRuntimeContext,
  handleAiApiRequest,
} from "./ai-runtime-context.js";
import {
  PORTAL_BOUNDED_CONTEXT,
  PORTAL_RUNTIME_SEED,
  createPortalRuntimeContext,
  handlePortalApiRequest,
} from "./portal-runtime-context.js";
import {
  UI_READINESS_BOUNDED_CONTEXT,
  UI_READINESS_RUNTIME_SEED,
  createUiReadinessRuntimeContext,
  handleUiReadinessApiRequest,
} from "./ui-readiness-context.js";
import {
  HOME_DASHBOARD_BOUNDED_CONTEXT,
  createHomeDashboardSourceCollectors,
  createDefaultHomeDashboardRuntime,
  handleHomeDashboardApiRequest,
} from "./home-dashboard-runtime-context.js";
import {
  ENTERPRISE_READINESS_BOUNDED_CONTEXT,
  ENTERPRISE_READINESS_RUNTIME_SEED,
  createEnterpriseReadinessRuntimeContext,
  handleEnterpriseReadinessApiRequest,
} from "./enterprise-readiness-context.js";
import {
  RECORD_ACTIONS_BOUNDED_CONTEXT,
  handleRecordActionsApiRequest,
} from "./record-actions-runtime-context.js";
import {
  IMPORT_DATA_MAPPING_BOUNDED_CONTEXT,
  handleImportDataMappingApiRequest,
} from "./import-data-mapping-runtime-context.js";
import {
  ADMIN_PERMISSION_BOUNDED_CONTEXT,
  handleAdminPermissionApiRequest,
} from "./admin-permission-runtime-context.js";
import {
  DATA_CLOUD_BOUNDED_CONTEXT,
  handleDataCloudApiRequest,
} from "./data-cloud-runtime-context.js";
import {
  REPORTS_BOUNDED_CONTEXT,
  handleReportsApiRequest,
} from "./reports-runtime-context.js";
import {
  API_AUTH_BOUNDED_CONTEXT,
  AUTHORIZATION_HEADER,
  createApiSessionAuth,
} from "./session-auth.js";
import { createHrxStepUpAuthority } from "./hrx-step-up-token.js";
import {
  LAWOS_RUNTIME_PROFILES,
  resolveRuntimeProfile,
  resolveSessionSecret,
  runtimePreflightError,
} from "./runtime-profile.js";
import {
  assertStorePathPreflight,
} from "./store-path-manifest.js";
import {
  ensureLawosDurableStoreHome,
  lawosDurableStorePathOptions,
  readOrCreateLocalSessionSecret,
  shouldUseDurableLocalDefaults,
} from "./local-durable-store-paths.js";
import {
  OUTLOOK_ADDIN_BOUNDED_CONTEXT,
  handleClientOutlookAuthorizationCallback,
  handleOutlookAddinApiRequest,
} from "./outlook-addin-runtime-context.js";
import {
  OUTLOOK_DESKTOP_INSTALLATION_BOUNDED_CONTEXT,
  OUTLOOK_DESKTOP_INSTALLATION_MAX_BODY_BYTES,
  handleOutlookDesktopInstallationApiRequest,
  isOutlookDesktopInstallationApiPath,
  mapOutlookDesktopInstallationRequestBodyError,
} from "./outlook-desktop-installation-runtime-context.js";
import {
  OUTLOOK_DESKTOP_ACTIVATION_BOUNDED_CONTEXT,
  OUTLOOK_DESKTOP_ACTIVATION_MAX_BODY_BYTES,
  handleOutlookDesktopActivationApiRequest,
  isOutlookDesktopActivationApiPath,
  mapOutlookDesktopActivationRequestBodyError,
} from "./outlook-desktop-activation-runtime-context.js";
import {
  assertPostgresOutlookDesktopOperationalControlPorts,
  createPostgresOutlookDesktopOperationalRuntime,
} from "./outlook-desktop-operational-runtime.js";
import {
  parseOutlookDesktopAutoconnectRoster,
} from "./outlook-desktop-entitlement.js";
import {
  createPeopleOutlookDesktopCallbackLocation,
  isPeopleOutlookOAuthState,
} from "./people-outlook-oauth-callback.js";
import {
  createClientOutlookAddinCallbackLocation,
  createClientOutlookLegacyAddinCallbackLocation,
  isClientOutlookOAuthState,
  parseClientOutlookAuthorizationCallback,
} from "./client-outlook-oauth-callback.js";
import { OUTLOOK_GRAPH_WEBHOOK_PATH } from "./outlook-graph-webhook.js";
import {
  createPostgresOutlookConversationRuntime,
  LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED_ENV,
} from "./outlook-conversation-operational-runtime.js";
import {
  handleDocusignOutlookRequest,
  handleDocusignWebhook,
  isDocusignOutlookRoute,
  isDocusignWebhook,
} from "./docusign-api.js";
import {
  handleOutlookDocumentApiRequest,
  isOutlookDocumentApiPath,
} from "./outlook-document-api.js";
import { createDocusignFailClosedRuntime } from "./docusign-runtime.js";
import { createPostgresDocusignEnvelopeRepository } from "../../../packages/integrations-core/src/docusign-postgres-repository.js";
import { dispatchApiHandler, mapApiHandlerError } from "./api-handler-dispatcher.js";
import {
  LAWOS_PERSISTENCE_AUTHORITIES,
  LAWOS_OFFLINE_REJECTED_POLICY,
  preparePersistenceAuthority,
  resolvePersistenceAuthority,
} from "./persistence-authority.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { createPostgresTenantProvisioningLedger } from "../../../packages/runtime-auth/src/postgres-tenant-provisioning.js";
import {
  createHrxRelationalProjectionReader,
} from "../../../packages/hrx/src/relational-projection-reader.js";
import { createPostgresApiRuntimeAuthority } from "./postgres-api-runtime-authority.js";
import {
  createFileSessionObjectAclResolver,
  createPostgresSessionObjectAclResolver,
} from "./session-object-acl-authority.js";
import {
  resolveClientOperationsV2Enabled,
} from "./client-operations-config.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../../../packages/dms/src/postgres-consumer-storage.js";
import { createEntraOidcProviderFromSecretReference } from "./entra-oidc-provider.js";
import { resolveAwsSecretString } from "./aws-secret-reference.js";
import {
  LAWOS_STAFF_AUTH_AUTHORITIES,
  resolveStaffAuthAuthority,
} from "./staff-auth-authority.js";
import { assertTenantPinnedExternalRuntime } from "./external-tenant-provisioning.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = Number(process.env.LAWOS_API_PORT || 4180);
export const LAWOS_OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_ENV =
  "LAWOS_OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_JSON";

function resolveOutlookDesktopAutoconnectRoster(value) {
  if (value == null || value === "") return null;
  try {
    return parseOutlookDesktopAutoconnectRoster(value);
  } catch {
    return null;
  }
}

const OUTLOOK_DESKTOP_FORBIDDEN_STARTUP_OPTIONS = Object.freeze([
  "outlookDesktopRuntime",
  "outlookDesktopActivationService",
  "outlookDesktopActivationServiceFactory",
  "outlookDesktopActivationContract",
  "outlookDesktopActivationClock",
  "outlookDesktopActivationEnv",
  "outlookDesktopLifecycleService",
  "outlookDesktopLifecycleServiceFactory",
  "outlookDesktopLifecycleContract",
  "outlookDesktopLifecycleClock",
  "outlookDesktopLifecycleEnv",
]);
const API_HIDDEN_DATA_STARTUP_OPTIONS = new Set([
  "outlookDesktopAutoconnectRoster",
]);

function frozenNullPrototypeCopy(...sources) {
  const properties = new Map();
  for (const source of sources) {
    const descriptors = Object.getOwnPropertyDescriptors(source);
    for (const key of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[key];
      if (!("value" in descriptor)) {
        throw runtimePreflightError(
          "API startup snapshot must contain only data properties",
        );
      }
      properties.set(key, {
        value: descriptor.value,
        enumerable: descriptor.enumerable,
        writable: false,
        configurable: false,
      });
    }
  }
  const snapshot = Object.create(null);
  for (const [key, descriptor] of properties) {
    Object.defineProperty(snapshot, key, descriptor);
  }
  return Object.freeze(snapshot);
}

function snapshotStartupOptions(
  value,
  label,
  {
    allowHiddenDataProperties = new Set(),
    allowProcessEnv = false,
  } = {},
) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || types.isProxy(value)) {
    throw runtimePreflightError(
      `${label} must use a non-Proxy object`,
    );
  }
  let prototype;
  let descriptors;
  try {
    prototype = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw runtimePreflightError(
      `${label} must expose data properties`,
    );
  }
  if (
    !(allowProcessEnv && value === process.env)
    && prototype !== Object.prototype
    && prototype !== null
  ) {
    throw runtimePreflightError(
      `${label} must not inherit startup authority`,
    );
  }
  if (Reflect.ownKeys(descriptors).some((key) => {
    const descriptor = descriptors[key];
    return !("value" in descriptor)
      || (descriptor.enumerable !== true
        && !allowHiddenDataProperties.has(key));
  })) {
    throw runtimePreflightError(
      `${label} must expose enumerable data properties`,
    );
  }
  return frozenNullPrototypeCopy(value);
}

function prepareApiStartupOptions(options) {
  const startupOptions = snapshotStartupOptions(
    options,
    "API startup options",
    { allowHiddenDataProperties: API_HIDDEN_DATA_STARTUP_OPTIONS },
  );
  const descriptors = Object.getOwnPropertyDescriptors(startupOptions);
  if (OUTLOOK_DESKTOP_FORBIDDEN_STARTUP_OPTIONS.some((key) =>
    Object.hasOwn(descriptors, key))) {
    throw runtimePreflightError(
      "Outlook desktop service, factory, contract, clock, env, and runtime overrides are forbidden",
    );
  }
  const dataValue = (key) => {
    const descriptor = descriptors[key];
    if (!descriptor) return undefined;
    if (!("value" in descriptor)) {
      throw runtimePreflightError(
        "Outlook desktop startup authority options must use data properties",
      );
    }
    return descriptor.value;
  };
  const persistenceAuthorityEnv = snapshotStartupOptions(
    dataValue("persistenceAuthorityEnv") ?? process.env,
    "API persistence authority environment",
    { allowProcessEnv: true },
  );
  const runtimeProfile = normalizeRuntimeProfileOption(
    dataValue("runtimeProfile"),
    persistenceAuthorityEnv,
  );
  const env = {
    ...persistenceAuthorityEnv,
    LAWOS_RUNTIME_PROFILE: runtimeProfile,
  };
  const persistenceAuthority = resolvePersistenceAuthority({
    value: dataValue("persistenceAuthority"),
    env,
  });
  const activationPresent = Object.hasOwn(
    descriptors,
    "outlookDesktopActivationControlPort",
  );
  const lifecyclePresent = Object.hasOwn(
    descriptors,
    "outlookDesktopLifecycleControlPort",
  );
  const entitlementPresent = Object.hasOwn(
    descriptors,
    "outlookDesktopEntitlementEnabled",
  );
  const entitlementEnabled = dataValue("outlookDesktopEntitlementEnabled");
  if ((persistenceAuthority === LAWOS_PERSISTENCE_AUTHORITIES.postgresV2
      || activationPresent || lifecyclePresent || entitlementPresent)
      && typeof entitlementEnabled !== "boolean") {
    throw runtimePreflightError(
      "postgres-v2 startup requires an explicit primitive outlookDesktopEntitlementEnabled boolean",
    );
  }
  if (entitlementEnabled === false && (activationPresent || lifecyclePresent)) {
    throw runtimePreflightError(
      "disabled Outlook desktop entitlement forbids dormant control ports",
    );
  }
  if (entitlementEnabled === true) {
    if (persistenceAuthority !== LAWOS_PERSISTENCE_AUTHORITIES.postgresV2
        || !activationPresent || !lifecyclePresent) {
      throw runtimePreflightError(
        "enabled Outlook desktop entitlement requires postgres-v2 and both control ports",
      );
    }
    try {
      assertPostgresOutlookDesktopOperationalControlPorts({
        outlookDesktopActivationControlPort:
          dataValue("outlookDesktopActivationControlPort"),
        outlookDesktopLifecycleControlPort:
          dataValue("outlookDesktopLifecycleControlPort"),
      });
    } catch {
      throw runtimePreflightError(
        "enabled Outlook desktop entitlement requires the exact isolated control-port composition",
      );
    }
  }
  return frozenNullPrototypeCopy(startupOptions, {
    runtimeProfile,
    persistenceAuthority,
    persistenceAuthorityEnv,
  });
}

function normalizeRuntimeProfileOption(profile, env = process.env) {
  if (!profile) return resolveRuntimeProfile(env);
  return resolveRuntimeProfile({ ...env, LAWOS_RUNTIME_PROFILE: profile });
}

function startupStorePathOptions(options = {}) {
  return {
    hrxStorePath: options.hrxStorePath,
    masterDataStorePath: options.masterDataStorePath,
    matterStorePath: options.matterStorePath,
    dmsStorePath: options.dmsStorePath,
    dmsObjectStorePath: options.dmsObjectStorePath,
    crmStorePath: options.crmStorePath,
    intakeStorePath: options.intakeStorePath,
    crmMasterDataStorePath: options.crmMasterDataStorePath,
    financeStorePath: options.financeStorePath,
    analyticsStorePath: options.analyticsStorePath,
    aiStorePath: options.aiStorePath,
    portalStorePath: options.portalStorePath,
    uiReadinessStorePath: options.uiReadinessStorePath,
    enterpriseReadinessStorePath: options.enterpriseReadinessStorePath,
    securityAuditStorePath: options.securityAuditStorePath,
    authCredentialStorePath: options.authCredentialStorePath,
    authPasswordResetStorePath: options.authPasswordResetStorePath,
    objectAclStorePath: options.objectAclStorePath,
  };
}

function createPostgresDmsStorageFromEnv(env = process.env) {
  const required = (name) => {
    const value = String(env[name] ?? "").trim();
    if (!value) throw runtimePreflightError(`${name} is required for postgres-v2 DMS authority`);
    return value;
  };
  if (String(env.LAWOS_DMS_S3_OBJECT_LOCK_ENABLED ?? "").trim().toLowerCase() !== "true") {
    throw runtimePreflightError("LAWOS_DMS_S3_OBJECT_LOCK_ENABLED=true is required for postgres-v2 DMS authority");
  }
  const defaultRetentionDays = Number(env.LAWOS_DMS_S3_DEFAULT_RETENTION_DAYS);
  if (!Number.isInteger(defaultRetentionDays) || defaultRetentionDays < 1) {
    throw runtimePreflightError("LAWOS_DMS_S3_DEFAULT_RETENTION_DAYS must be a positive integer for committed objects");
  }
  return createS3StorageAdapter({
    adapter_id: "lawos-dms-s3-production",
    credential_ref: required("LAWOS_DMS_S3_CREDENTIAL_REF"),
    bucket: required("LAWOS_DMS_S3_BUCKET"),
    expected_bucket_owner: required("LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER"),
    region: required("LAWOS_DMS_S3_REGION"),
    prefix: env.LAWOS_DMS_S3_PREFIX ?? "lawos-dms",
    kms_key_id: required("LAWOS_DMS_S3_KMS_KEY_ID"),
    object_lock_enabled: true,
    default_retention_days: defaultRetentionDays,
  });
}

async function resolvePayrollArtifactSecret({ env, explicitSecret, secretsClient, resolveSecret = resolveAwsSecretString } = {}) {
  if (typeof explicitSecret === "string" || Buffer.isBuffer(explicitSecret)) {
    if (Buffer.byteLength(explicitSecret) < 32) throw runtimePreflightError("payroll artifact secret must contain at least 32 bytes");
    return explicitSecret;
  }
  if (String(env.HRX_PAYROLL_ARTIFACT_KEY ?? "").trim()) {
    throw runtimePreflightError("HRX_PAYROLL_ARTIFACT_KEY must not contain operational secret material; use LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID");
  }
  const secretId = String(env.LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID ?? "").trim();
  if (!secretId) throw runtimePreflightError("LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID is required for postgres-v2 payroll artifacts");
  const region = String(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.LAWOS_AWS_REGION ?? "ap-northeast-2").trim();
  const secret = await resolveSecret({ secretId, region, client: secretsClient });
  if (!(typeof secret === "string" || Buffer.isBuffer(secret)) || Buffer.byteLength(secret) < 32) {
    throw runtimePreflightError("payroll artifact secret reference resolved invalid material");
  }
  return secret;
}

function createEphemeralHrxStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-hrx-runtime-")), "hrx-store.json");
}

export function resolvePeopleFeatureFlagsFromEnv(env = process.env) {
  return Object.freeze(Object.fromEntries(
    PEOPLE_FEATURE_FLAG_NAMES.map((name) => [
      name,
      env[`VITE_LAWOS_${name.toUpperCase()}`],
    ]),
  ));
}

function createEphemeralMasterDataStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-master-data-runtime-")), "master-data-store.json");
}

function createEphemeralMatterStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-matter-runtime-")), "matter-store.json");
}

function createEphemeralDmsStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-dms-runtime-")), "dms-store.json");
}

function createEphemeralEmailDmsStorePath() {
  return join(
    mkdtempSync(join(tmpdir(), "lawos-email-dms-runtime-")),
    "email-dms-store.json",
  );
}

function createEphemeralCrmStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-crm-runtime-")), "crm-store.json");
}

function createEphemeralCrmMasterDataStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-crm-master-data-runtime-")), "master-data-store.json");
}

function createEphemeralIntakeStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-intake-runtime-")), "intake-store.json");
}

function createEphemeralFinanceStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-finance-runtime-")), "finance-store.json");
}

function createEphemeralAnalyticsStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-analytics-runtime-")), "analytics-store.json");
}

function createEphemeralAiStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-ai-runtime-")), "ai-store.json");
}

function createEphemeralPortalStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-portal-runtime-")), "portal-store.json");
}

function createEphemeralUiReadinessStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-ui-readiness-runtime-")), "ui-readiness-store.json");
}

function createEphemeralEnterpriseReadinessStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-enterprise-readiness-runtime-")), "enterprise-readiness-store.json");
}

function createEphemeralObjectAclStorePath() {
  return join(
    mkdtempSync(join(tmpdir(), "lawos-object-acl-runtime-")),
    "object-acl-store.json",
  );
}

export function createDefaultHrxRuntime({
  store,
  storePath,
  modelGateway,
  clock,
  runtimeProfile,
  env = process.env,
  peopleFeatureFlags,
  peopleMetricsSink = null,
  peopleProviderIdentities,
  peopleProviderIdentityRepository,
  outlookTokenVault,
  outlookConsentService,
  outlookConsentRepository,
  outlookCalendarCache,
  peopleOutlookConnections,
  peopleOutlookCalendarSource,
  outlookCalendarViewAdapter,
  outlookConsentRefresh,
  outlookSubjectAddressResolver,
  outlookStateAuthority,
  outlookOauthPort,
  offboardingAccessSource,
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled,
  payrollArtifactStorage,
  payrollArtifactSecret,
  compensationKeyMaterial,
  payrollProviders,
} = {}) {
  const resolvedRuntimeProfile = runtimeProfile ?? resolveRuntimeProfile(env);
  const allowSyntheticRuntime = resolvedRuntimeProfile !== LAWOS_RUNTIME_PROFILES.operational;
  const hrxStore = store ?? createFileHrxStore({
    filePath: storePath ?? env.LAWOS_HRX_STORE_PATH ?? createEphemeralHrxStorePath(),
  });
  runHrxMigrations(hrxStore);
  assertRuntimePersistenceStore(hrxStore, {
    bounded_context: "hrx",
    requiredTables: [...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES],
  });
  if (resolvedRuntimeProfile !== LAWOS_RUNTIME_PROFILES.operational) seedHrxDurableRuntimeStore(hrxStore);
  return createHrxRuntimeContext({
    store: hrxStore,
    modelGateway,
    clock,
    peopleFeatureFlags: peopleFeatureFlags ?? resolvePeopleFeatureFlagsFromEnv(env),
    peopleMetricsSink,
    peopleProviderIdentities,
    peopleProviderIdentityRepository,
    outlookTokenVault,
    outlookConsentService,
    outlookConsentRepository,
    outlookCalendarCache,
    peopleOutlookConnections,
    peopleOutlookCalendarSource,
    outlookCalendarViewAdapter,
    outlookConsentRefresh,
    outlookSubjectAddressResolver,
    outlookStateAuthority,
    outlookOauthPort,
    offboardingAccessSource,
    leaveIntegrationProviders,
    leaveIntegrationProviderEnabled,
    allowInMemoryOutlookTokenVault: allowSyntheticRuntime,
    ...(payrollArtifactStorage ? { payrollArtifactStorage } : {}),
    ...(payrollArtifactSecret ? { payrollArtifactSecret } : {}),
    ...(compensationKeyMaterial ? { compensationKeyMaterial } : {}),
    payrollProviders: Object.freeze({
      ...payrollProviders,
      allowSyntheticArtifactSecret: allowSyntheticRuntime,
      allowSyntheticCompensationKey: allowSyntheticRuntime,
      allowSyntheticProviders: allowSyntheticRuntime,
    }),
    allowSyntheticLeaveIntegrationProviders: allowSyntheticRuntime,
    allowSyntheticPayrollArtifactSecret: allowSyntheticRuntime,
    allowSyntheticCompensationKey: allowSyntheticRuntime,
    allowSyntheticPayrollProviders: allowSyntheticRuntime,
    seedPayrollRuntime: allowSyntheticRuntime,
    seedRuntimeFixtures: allowSyntheticRuntime,
  });
}

export function createDefaultMasterDataRuntime({
  repository,
  storePath = process.env.LAWOS_MASTER_DATA_STORE_PATH,
} = {}) {
  const masterDataRepository =
    repository ??
    createMasterDataRepository({
      filePath: storePath || createEphemeralMasterDataStorePath(),
      seedRecords: MASTER_DATA_RUNTIME_SEED.records,
    });
  return createMasterDataRuntimeContext({ repository: masterDataRepository });
}

export function createDefaultMatterRuntime({
  repository,
  storePath = process.env.LAWOS_MATTER_STORE_PATH,
  dmsRuntime = null,
  hrxRuntime = null,
  clearanceRepository = null,
} = {}) {
  const matterRepository =
    repository ??
    createMatterRepository({
      filePath: storePath || createEphemeralMatterStorePath(),
      seedRecords: MATTER_RUNTIME_SEED.records,
    });
  repairCurrentMatterInventoryClassification(matterRepository);
  return createMatterRuntimeContext({ repository: matterRepository, dmsRuntime, hrxRuntime, clearanceRepository });
}

export function createDefaultDmsRuntime({
  repository,
  storePath = process.env.LAWOS_DMS_STORE_PATH,
  storage,
  storageRootPath = process.env.LAWOS_DMS_OBJECT_STORE_PATH,
  quarantineRootPath = process.env.LAWOS_DMS_QUARANTINE_STORE_PATH,
} = {}) {
  const resolvedStorePath = storePath || createEphemeralDmsStorePath();
  const dmsRepository =
    repository ??
    createDmsRepository({
      filePath: resolvedStorePath,
      seedRecords: VAULT_DMS_RUNTIME_SEED,
    });
  const dmsStorage =
    storage ??
    createFileStorageAdapter({
      adapter_id: "vault-api-file",
      rootPath: storageRootPath || `${resolvedStorePath}.objects`,
      quarantineRootPath: quarantineRootPath || `${resolvedStorePath}.quarantine-authority`,
    });
  return createVaultDmsRuntimeContext({ repository: dmsRepository, storage: dmsStorage });
}

export function createDefaultEmailDmsRuntime({
  repository,
  storePath = process.env.LAWOS_EMAIL_DMS_STORE_PATH,
  dmsRuntime = null,
} = {}) {
  const emailDmsRepository = repository ?? createEmailDmsRepository({
    filePath: storePath || createEphemeralEmailDmsStorePath(),
  });
  return Object.freeze({
    authority: "email-dms",
    repository: emailDmsRepository,
    storage: dmsRuntime?.storage ?? null,
    upload_runtime: dmsRuntime?.upload_runtime ?? null,
    production_ready_claim: false,
  });
}

export function createDefaultCrmIntakeRuntime({
  crmRepository,
  intakeRepository,
  crmMasterDataRepository,
  emailDmsRepository,
  matterRepository,
  dmsRuntime,
  crmStorePath = process.env.LAWOS_CRM_STORE_PATH,
  intakeStorePath = process.env.LAWOS_INTAKE_STORE_PATH,
  crmMasterDataStorePath = process.env.LAWOS_CRM_MASTER_DATA_STORE_PATH,
} = {}) {
  const crmRepo =
    crmRepository ??
    createCrmRuntimeRepository({
      filePath: crmStorePath || createEphemeralCrmStorePath(),
      seedRecords: CRM_RUNTIME_SEED,
    });
  const intakeRepo =
    intakeRepository ??
    createIntakeRuntimeRepository({
      filePath: intakeStorePath || createEphemeralIntakeStorePath(),
      seedRecords: INTAKE_RUNTIME_SEED,
    });
  const masterDataRepo =
    crmMasterDataRepository ??
    createMasterDataRepository({
      filePath: crmMasterDataStorePath || createEphemeralCrmMasterDataStorePath(),
      seedRecords: CRM_MASTER_DATA_SEED,
    });
  return createCrmIntakeRuntimeContext({
    crmRepository: crmRepo,
    intakeRepository: intakeRepo,
    masterDataRepository: masterDataRepo,
    emailDmsRepository,
    matterRepository,
    dmsRuntime,
  });
}

export function createDefaultFinanceRuntime({
  repository,
  masterDataRepository = null,
  crmRepository = null,
  matterRepository = null,
  clientRecords = null,
  employees = undefined,
  bankImportPreviewTokens,
  storePath = process.env.LAWOS_FINANCE_STORE_PATH,
} = {}) {
  const financeRepository =
    repository ??
    createFinanceRepository({
      filePath: storePath || createEphemeralFinanceStorePath(),
      seedRecords: FINANCE_RUNTIME_SEED,
    });
  return createFinanceRuntimeContext({
    repository: financeRepository,
    masterDataRepository,
    crmRepository,
    matterRepository,
    clientRecords,
    employees,
    bankImportPreviewTokens,
  });
}

export function createDefaultAnalyticsRuntime({
  repository,
  storePath = process.env.LAWOS_ANALYTICS_STORE_PATH,
  financeRepository = null,
  masterDataRepository = null,
  crmRepository = null,
  matterRepository = null,
} = {}) {
  const analyticsRepository =
    repository ??
    createAnalyticsRepository({
      filePath: storePath || createEphemeralAnalyticsStorePath(),
      seedRecords: ANALYTICS_RUNTIME_SEED,
    });
  return createAnalyticsRuntimeContext({
    repository: analyticsRepository,
    financeRepository,
    masterDataRepository,
    crmRepository,
    matterRepository,
  });
}

export function createDefaultAiRuntime({
  repository,
  storePath = process.env.LAWOS_AI_STORE_PATH,
} = {}) {
  const aiRepository =
    repository ??
    createAiGovernanceRepository({
      filePath: storePath || createEphemeralAiStorePath(),
      seedRecords: AI_RUNTIME_SEED,
    });
  return createAiRuntimeContext({ repository: aiRepository });
}

export function createDefaultPortalRuntime({
  repository,
  storePath = process.env.LAWOS_PORTAL_STORE_PATH,
} = {}) {
  const portalRepository =
    repository ??
    createClientPortalRepository({
      filePath: storePath || createEphemeralPortalStorePath(),
      seedRecords: PORTAL_RUNTIME_SEED,
    });
  return createPortalRuntimeContext({ repository: portalRepository });
}

export function createDefaultUiReadinessRuntime({
  repository,
  storePath = process.env.LAWOS_UI_READINESS_STORE_PATH,
} = {}) {
  const uiReadinessRepository =
    repository ??
    createUiReadinessRepository({
      filePath: storePath || createEphemeralUiReadinessStorePath(),
      seedRecords: UI_READINESS_RUNTIME_SEED,
    });
  return createUiReadinessRuntimeContext({ repository: uiReadinessRepository });
}

export function createDefaultEnterpriseReadinessRuntime({
  repository,
  storePath = process.env.LAWOS_ENTERPRISE_READINESS_STORE_PATH,
} = {}) {
  const enterpriseReadinessRepository =
    repository ??
    createEnterpriseReadinessRepository({
      filePath: storePath || createEphemeralEnterpriseReadinessStorePath(),
      seedRecords: ENTERPRISE_READINESS_RUNTIME_SEED,
    });
  return createEnterpriseReadinessRuntimeContext({ repository: enterpriseReadinessRepository });
}

export const PROFILE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "profile",
  contract_ref: "contracts/profile-read-contract.json",
  contract_schema_version: "law-firm-os.profile-read-contract.v0.1",
  endpoints: Object.freeze(["GET /api/profile/me"]),
  data_source: "authenticated_hrx_member_projection",
  contact_policy: Object.freeze({
    visibility: "authenticated_internal",
    allowed_fields: Object.freeze(["work_email", "mobile_phone"]),
    public_renderer_literals_allowed: false,
  }),
  runtime_persistence: "read_only_session_projection",
  runtime_write_ready: false,
  production_ready_claim: false,
  fail_closed: true,
});

export const SERVICE_DESCRIPTOR = Object.freeze({
  service: "@law-firm-os/api",
  version: "0.1.0",
  bounded_contexts: Object.freeze([
    MASTER_DATA_BOUNDED_CONTEXT,
    API_AUTH_BOUNDED_CONTEXT,
    PROFILE_BOUNDED_CONTEXT,
    MATTER_BOUNDED_CONTEXT,
    VAULT_DMS_BOUNDED_CONTEXT,
    CRM_INTAKE_BOUNDED_CONTEXT,
    RECORD_ACTIONS_BOUNDED_CONTEXT,
    IMPORT_DATA_MAPPING_BOUNDED_CONTEXT,
    ADMIN_PERMISSION_BOUNDED_CONTEXT,
    DATA_CLOUD_BOUNDED_CONTEXT,
    REPORTS_BOUNDED_CONTEXT,
    FINANCE_BOUNDED_CONTEXT,
    ANALYTICS_BOUNDED_CONTEXT,
    AI_BOUNDED_CONTEXT,
    PORTAL_BOUNDED_CONTEXT,
    OUTLOOK_ADDIN_BOUNDED_CONTEXT,
    UI_READINESS_BOUNDED_CONTEXT,
    HOME_DASHBOARD_BOUNDED_CONTEXT,
    ENTERPRISE_READINESS_BOUNDED_CONTEXT,
  ]),
  permission_gate: Object.freeze({
    contract_ref: "contracts/permission-kernel-contract.json",
    contract_schema_version: "law-firm-os.permission-kernel-contract.v0.28",
    context_header: PERMISSION_CONTEXT_HEADER,
    decision_order: PERMISSION_DECISION_ORDER,
    default_decision: "deny",
    fail_closed: true,
  }),
  enrichment: Object.freeze({
    contract_ref: "contracts/matter-core-contract.json",
    contract_schema_version: "law-firm-os.matter-core-contract.v0.1",
    mode: "synthetic_crosswalk",
  }),
  synthetic_only: false,
  uses_real_client_data: true,
});

function serviceDescriptorForAuthority({ persistenceAuthority, persistenceCapabilities, dataScope } = {}) {
  if (persistenceAuthority !== LAWOS_PERSISTENCE_AUTHORITIES.postgresV2) return SERVICE_DESCRIPTOR;
  const syntheticOnly = dataScope === "synthetic-only";
  return Object.freeze({
    ...SERVICE_DESCRIPTOR,
    bounded_contexts: Object.freeze(SERVICE_DESCRIPTOR.bounded_contexts.map((context) => Object.freeze({
      ...context,
      ...(context.bounded_context === "master-data" && syntheticOnly ? { uses_real_client_data: false } : {}),
      runtime_persistence: context.bounded_context === "api-auth"
        ? "postgres-identity-ledger-v2"
        : context.bounded_context === "vault-dms"
          ? "postgres-dms-s3-v3"
          : "postgres-repository-port-v2",
      postgres_authority_active: true,
      json_fallback: false,
      dual_write: false,
      tenant_rls: true,
      optimistic_version: true,
      idempotency: true,
      audit: true,
      outbox: true,
    }))),
    synthetic_only: syntheticOnly,
    uses_real_client_data: syntheticOnly ? false : SERVICE_DESCRIPTOR.uses_real_client_data,
    persistence_authority_capabilities: persistenceCapabilities ?? null,
  });
}

const DEFAULT_CORS_ALLOWED_ORIGINS = Object.freeze([
  "matter-app://app",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5186",
]);
const CORS_BASE_HEADERS = Object.freeze({
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": [
    AUTHORIZATION_HEADER,
    "content-type",
    PERMISSION_CONTEXT_HEADER,
    VAULT_BRIDGE_TOKEN_HEADER,
    "x-lawos-tenant-id",
    "x-lawos-actor-id",
    "x-lawos-actor-role",
    "x-lawos-hrx-scopes",
    "x-lawos-hrx-step-up"
  ].join(", ")
});

export function configuredCorsAllowedOrigins({ env = process.env } = {}) {
  const configured = (env.LAWOS_API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin.toLowerCase() !== "null" && origin !== "*");
  return Object.freeze([...new Set([...DEFAULT_CORS_ALLOWED_ORIGINS, ...configured])]);
}

export function corsHeadersForRequest(req, { env = process.env } = {}) {
  const origin = req?.headers?.origin;
  if (!origin) return CORS_BASE_HEADERS;
  const headers = { ...CORS_BASE_HEADERS, vary: "origin" };
  if (configuredCorsAllowedOrigins({ env }).includes(origin)) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function sendJson(req, res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeadersForRequest(req),
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function sendHtml(req, res, status, body) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeadersForRequest(req),
  });
  res.end(body);
}

function sendExternalRedirect(req, res, location) {
  res.writeHead(302, {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    location,
    ...corsHeadersForRequest(req),
  });
  res.end();
}

function createBufferedResponse() {
  let status = null;
  let headers = null;
  let body = null;
  let ended = false;
  return Object.freeze({
    get headersSent() { return status !== null; },
    get writableEnded() { return ended; },
    writeHead(nextStatus, nextHeaders = {}) {
      if (ended) throw new Error("buffered response already ended");
      status = nextStatus;
      headers = { ...nextHeaders };
      return this;
    },
    end(chunk) {
      if (ended) throw new Error("buffered response already ended");
      if (status === null) status = 200;
      body = chunk ?? null;
      ended = true;
      return this;
    },
    commit(target) {
      if (!ended || status === null) throw new Error("API command completed without a response");
      target.writeHead(status, headers ?? {});
      target.end(body);
    },
  });
}

function requestUsesProductRuntime(req) {
  if (req.method === "OPTIONS") return false;
  const pathname = new URL(req.url || "/", `http://${HOST}`).pathname.replace(/\/+$/, "") || "/";
  return !["/api/health", "/health"].includes(pathname)
    && !pathname.startsWith("/api/auth")
    && !isOutlookDesktopInstallationApiPath(pathname);
}

function clientOutlookCallbackRuntimeTenant(req, m365GraphConfig) {
  const target = new URL(req.url || "/", `http://${HOST}`);
  if (
    req.method !== "GET"
    || target.pathname.replace(/\/+$/, "") !== "/api/outlook/connection/callback"
  ) return null;
  try {
    const callback = parseClientOutlookAuthorizationCallback(target.searchParams);
    if (!callback.code) return null;
    const resolver = m365GraphConfig?.provider
      ?.resolveDelegatedAuthorizationState;
    if (typeof resolver !== "function") return null;
    const principal = resolver({ state: callback.state });
    return principal.callback_mode === M365_GRAPH_CALLBACK_MODES.server_complete
      ? principal.tenant_id
      : null;
  } catch {
    return null;
  }
}

function publicRuntimeTenant(req, m365GraphConfig) {
  const pathname = new URL(req.url || "/", `http://${HOST}`).pathname.replace(/\/+$/, "") || "/";
  const routeKey = `${req.method} ${pathname}`;
  if (isPayrollStatementProviderCallback(req.method, pathname)) {
    return req.lawosPayrollStatementProviderAuthorization?.verified?.tenant_id ?? null;
  }
  if (isLeaveProviderCallback(req.method, pathname)) {
    const value = req.headers?.[LEAVE_PROVIDER_TENANT_HEADER];
    return String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim() || null;
  }
  const clientOutlookTenant = clientOutlookCallbackRuntimeTenant(
    req,
    m365GraphConfig,
  );
  if (clientOutlookTenant) return clientOutlookTenant;
  return MATTER_VAULT_BRIDGE_ROUTES.has(routeKey) || isPortalExternalPublicRoute(req.method, pathname)
    ? MATTER_VAULT_REGISTERED_TENANT_ID
    : null;
}

export function resolvePostgresRequestIdempotencyKey({
  method,
  explicit_key,
  body_key,
  request_occurrence_id,
  request_target_hash,
  request_body_hash,
} = {}) {
  const normalizedMethod = String(method ?? "GET").trim().toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") {
    const occurrenceId = String(request_occurrence_id ?? "").trim();
    if (!occurrenceId) throw new TypeError("PostgreSQL read request occurrence id is required");
    return `request-occurrence:${hashDomainValue({
      method: normalizedMethod,
      request_occurrence_id: occurrenceId,
    })}`;
  }
  const explicitKey = String(explicit_key ?? "").trim();
  if (explicitKey) return explicitKey;
  const bodyKey = String(body_key ?? "").trim();
  if (bodyKey) return bodyKey;
  return `request-fingerprint:${hashDomainValue({
    method: normalizedMethod,
    request_target_hash,
    request_body_hash,
  })}`;
}

function passwordResetOpenPageHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Matter 비밀번호 설정</title>
  <style>
    body{margin:0;background:#f5f4f0;color:#17212b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif}
    main{min-height:100vh;display:grid;place-items:center;padding:24px}
    section{width:min(100%,440px);background:#fff;border:1px solid #ded8cc;border-radius:8px;padding:28px;box-sizing:border-box}
    h1{margin:0 0 10px;font-size:24px;line-height:32px;letter-spacing:0}
    p{margin:0 0 18px;color:#374151;font-size:15px;line-height:24px}
    a,button{display:inline-block;background:#17212b;color:#fff;text-decoration:none;border:0;border-radius:6px;padding:12px 18px;font-size:15px;line-height:20px;font-weight:700;cursor:pointer}
    label{display:block;margin:14px 0 6px;color:#374151;font-size:13px;line-height:18px;font-weight:700}
    input{width:100%;box-sizing:border-box;border:1px solid #d8d2c7;border-radius:6px;padding:12px 13px;font:inherit;color:#17212b;background:#fff}
    button{margin-top:16px;width:100%}
    button:disabled{cursor:not-allowed;opacity:.68}
    .secondary{margin-top:16px;color:#4b5563;font-size:13px;line-height:21px}
    .divider{height:1px;background:#ece7de;margin:22px 0}
    .status{min-height:21px;margin:12px 0 0;color:#4b5563;font-size:13px;line-height:21px}
    .status[data-state="error"]{color:#b42318}
    .status[data-state="success"]{color:#067647}
    [hidden]{display:none}
  </style>
</head>
<body>
  <main>
    <section id="ready" hidden>
      <h1>비밀번호를 설정하세요</h1>
      <p>Matter 앱에서 비밀번호 설정을 계속합니다.</p>
      <a id="open-app" href="#">Matter 열기</a>
      <p class="secondary">앱이 열리지 않아도 아래에서 바로 새 비밀번호를 설정할 수 있습니다.</p>
      <div class="divider"></div>
      <form id="reset-form">
        <label for="new-password">새 비밀번호</label>
        <input id="new-password" type="password" autocomplete="new-password" minlength="12" required>
        <label for="confirm-password">새 비밀번호 확인</label>
        <input id="confirm-password" type="password" autocomplete="new-password" minlength="12" required>
        <button id="submit-reset" type="submit">비밀번호 설정</button>
        <p id="reset-status" class="status" aria-live="polite"></p>
      </form>
    </section>
    <section id="invalid" hidden>
      <h1>링크를 확인하세요</h1>
      <p>비밀번호 설정 링크가 없거나 만료되었습니다. 새 재설정 메일을 요청하세요.</p>
    </section>
  </main>
  <script>
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token") || "";
    const ready = document.getElementById("ready");
    const invalid = document.getElementById("invalid");
    const openApp = document.getElementById("open-app");
    const form = document.getElementById("reset-form");
    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("confirm-password");
    const submitReset = document.getElementById("submit-reset");
    const resetStatus = document.getElementById("reset-status");
    const setStatus = (message, state = "") => {
      resetStatus.textContent = message;
      resetStatus.dataset.state = state;
    };
    if (token) {
      const appUrl = "matter://password-reset/confirm?token=" + encodeURIComponent(token);
      openApp.href = appUrl;
      ready.hidden = false;
      openApp.addEventListener("click", () => {
        window.location.href = appUrl;
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = newPassword.value;
        const passwordConfirm = confirmPassword.value;
        if (password.length < 12) {
          setStatus("비밀번호는 12자 이상이어야 합니다.", "error");
          newPassword.focus();
          return;
        }
        if (password !== passwordConfirm) {
          setStatus("새 비밀번호가 서로 다릅니다.", "error");
          confirmPassword.focus();
          return;
        }
        submitReset.disabled = true;
        setStatus("비밀번호를 설정하는 중입니다.");
        try {
          const response = await fetch("/api/auth/password-reset/confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token, password })
          });
          const body = await response.json().catch(() => ({}));
          if (response.ok && (body.ok || body.accepted || body.activated)) {
            newPassword.value = "";
            confirmPassword.value = "";
            setStatus("비밀번호가 설정되었습니다. Matter 앱에서 새 비밀번호로 로그인하세요.", "success");
            return;
          }
          const reason = body.reason || body.error || "password_reset_failed";
          setStatus(reason === "password_too_short"
            ? "비밀번호는 12자 이상이어야 합니다."
            : "링크가 만료되었거나 이미 사용되었습니다. 새 재설정 메일을 요청하세요.", "error");
        } catch {
          setStatus("비밀번호 설정 요청을 완료하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도하세요.", "error");
        } finally {
          submitReset.disabled = false;
        }
      });
      window.setTimeout(() => {
        window.location.href = appUrl;
      }, 350);
    } else {
      invalid.hidden = false;
    }
  </script>
</body>
</html>`;
}

function sendOptions(req, res) {
  res.writeHead(204, {
    "cache-control": "no-store",
    ...corsHeadersForRequest(req),
  });
  res.end();
}

function queryToObject(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) query[key] = value;
  return query;
}

function contentTypeOf(req) {
  return String(req.headers?.["content-type"] ?? "");
}

function multipartBoundary(contentType) {
  const match = contentType.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function bufferEndsWith(buffer, suffix) {
  return buffer.length >= suffix.length && buffer.subarray(buffer.length - suffix.length).equals(suffix);
}

function stripTrailingCrlf(buffer) {
  const crlf = Buffer.from("\r\n");
  return bufferEndsWith(buffer, crlf) ? buffer.subarray(0, buffer.length - crlf.length) : buffer;
}

function parseMultipartHeaders(text) {
  const headers = {};
  for (const line of text.split(/\r\n/)) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

function dispositionValue(header, key) {
  const match = header.match(new RegExp(`${key}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function parseMultipartFormData(raw, contentType) {
  const boundary = multipartBoundary(contentType);
  if (!boundary) throw new Error("multipart boundary is required");
  const delimiter = Buffer.from(`--${boundary}`);
  const headerEndMarker = Buffer.from("\r\n\r\n");
  const payload = { files: {} };
  let offset = 0;
  while (offset < raw.length) {
    const start = raw.indexOf(delimiter, offset);
    if (start === -1) break;
    const partStart = start + delimiter.length;
    if (raw.subarray(partStart, partStart + 2).toString("utf8") === "--") break;
    const next = raw.indexOf(delimiter, partStart);
    if (next === -1) break;
    let part = raw.subarray(partStart, next);
    if (part.subarray(0, 2).toString("utf8") === "\r\n") part = part.subarray(2);
    part = stripTrailingCrlf(part);
    const headerEnd = part.indexOf(headerEndMarker);
    if (headerEnd === -1) {
      offset = next;
      continue;
    }
    const headers = parseMultipartHeaders(part.subarray(0, headerEnd).toString("utf8"));
    const disposition = headers["content-disposition"] ?? "";
    const name = dispositionValue(disposition, "name");
    if (!name) {
      offset = next;
      continue;
    }
    const value = part.subarray(headerEnd + headerEndMarker.length);
    const filename = dispositionValue(disposition, "filename");
    if (filename !== null) {
      payload.files[name] = {
        filename,
        mime_type: headers["content-type"] ?? "application/octet-stream",
        byte_size: value.byteLength,
        content_base64: value.toString("base64"),
      };
    } else {
      payload[name] = value.toString("utf8");
    }
    offset = next;
  }
  return payload;
}

export const DEFAULT_REQUEST_BODY_LIMIT_BYTES = 32 * 1024 * 1024;

function requestBodyTooLargeError() {
  const error = new Error("request body exceeds the configured byte budget");
  error.status = 413;
  error.safe_error_code = "API_REQUEST_BODY_TOO_LARGE";
  return error;
}

export async function readRequestBody(req, {
  maxBytes = DEFAULT_REQUEST_BODY_LIMIT_BYTES,
  injectAuthenticatedActor = true,
} = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError("maxBytes must be a positive safe integer");
  if (req.lawosRequestBodyParsed === true) return req.lawosParsedRequestBody;
  const declaredLength = Number(Array.isArray(req.headers?.["content-length"])
    ? req.headers["content-length"][0]
    : req.headers?.["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw requestBodyTooLargeError();
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.byteLength;
    if (totalBytes > maxBytes) throw requestBodyTooLargeError();
    chunks.push(bytes);
  }
  const raw = Buffer.concat(chunks, totalBytes);
  req.lawosRawRequestBody = raw;
  const contentType = contentTypeOf(req);
  let body = {};
  if (raw.length > 0 && contentType.toLowerCase().startsWith("multipart/form-data")) {
    body = parseMultipartFormData(raw, contentType);
  } else if (raw.length > 0) {
    const text = raw.toString("utf8").trim();
    if (text) body = JSON.parse(text);
  }
  const authenticatedActorId = String(req.lawosAuthenticatedActorId ?? "").trim();
  if (injectAuthenticatedActor && authenticatedActorId && body && typeof body === "object" && !Array.isArray(body)) {
    body = { ...body, actor_id: authenticatedActorId };
  }
  req.lawosRequestBodyHash = hashDomainValue(body);
  const bodyIdempotencyKey = String(body?.idempotency_key ?? "").trim();
  if (bodyIdempotencyKey) req.lawosRequestBodyIdempotencyKey = bodyIdempotencyKey;
  req.lawosParsedRequestBody = body;
  req.lawosRequestBodyParsed = true;
  return body;
}

function hasJsonRequestBody(method) {
  return method === "POST" || method === "PATCH" || method === "DELETE";
}

function isPortalExternalPublicRoute(method, pathname) {
  return (
    (method === "POST" && pathname === "/api/portal/invites/consume") ||
    (method === "POST" && pathname === "/api/portal/external/rfi-responses") ||
    (method === "GET" &&
      pathname.startsWith("/api/portal/external/secure-links/") &&
      pathname.endsWith("/access"))
  );
}

function hrxAuditEffect(decision = {}) {
  return ["allow", "deny", "review_required", "approval_required"].includes(decision.effect)
    ? decision.effect
    : "deny";
}

async function appendHrxDeniedRouteAudit({ runtime, context, route, policy, decision } = {}) {
  if (!runtime?.audit || !context?.tenant_id || !context?.actor_id) return null;
  return appendHrxRouteAudit({
    store: runtime.audit,
    context,
    route,
    action: policy?.action ?? decision?.action ?? "hrx.route",
    object: {
      object_type: policy?.resource_type ?? "HRXRoute",
      object_id: policy?.resource_id ?? route ?? "unknown",
    },
    decision: {
      effect: hrxAuditEffect(decision),
      reason: decision?.reason ?? "hrx_route_denied",
    },
  });
}

function handleProfileApiRequest({ pathname, method, query, context, requestId, runtime } = {}) {
  if (pathname !== "/api/profile/me") {
    return {
      status: 404,
      body: {
        request_id: requestId,
        outcome: "blocked",
        item: null,
        safe_error_codes: ["PROFILE_NOT_FOUND"],
        audit_hint_ref: query.audit_hint_ref ?? null,
        ui_state: "error",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  if (method !== "GET") {
    return {
      status: 405,
      body: {
        request_id: requestId,
        outcome: "blocked",
        item: null,
        safe_error_codes: ["PROFILE_METHOD_NOT_ALLOWED"],
        audit_hint_ref: query.audit_hint_ref ?? null,
        ui_state: "error",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }

  const tenantId = query.tenant_id ?? context?.principal?.tenant_id ?? "tenant_rp04_synthetic";
  const actorRef = context?.principal?.user_id ?? null;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: tenantId,
      resource_type: "user_profile",
      resource_id: actorRef ?? "profile_unknown",
    },
    action: "profile:read",
  });
  const auditHintRef = query.audit_hint_ref ?? "ui_profile_me_probe";

  if (decision.effect === "review_required") {
    return {
      status: 403,
      body: {
        request_id: requestId,
        outcome: "review_required",
        item: null,
        safe_error_codes: ["PROFILE_REVIEW_REQUIRED"],
        audit_hint_ref: auditHintRef,
        ui_state: "review",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  if (decision.effect !== "allow") {
    return {
      status: 403,
      body: {
        request_id: requestId,
        outcome: "denied",
        item: null,
        safe_error_codes: ["PROFILE_PERMISSION_DENIED"],
        audit_hint_ref: auditHintRef,
        ui_state: "denied",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }

  const roleIds = Array.isArray(context?.principal?.role_ids) ? context.principal.role_ids : [];
  const rosterMember = findHrxMemberRosterByUserId(actorRef);
  const registeredAccount = findRegisteredAccountByUserId(actorRef);
  const linkedEmployee = resolveHrxEmployeeProfileByUserId(runtime, {
    tenant_id: tenantId,
    user_id: actorRef,
  });
  const profileMember = {
    ...rosterMember,
    ...linkedEmployee,
    professional_profile: linkedEmployee?.professional_profile ?? rosterMember?.professional_profile ?? null,
  };
  const displayName = profileMember.display_name || registeredAccount?.display_name || "";
  const primaryRoleLabel = profileMember.title || registeredAccount?.source_title || roleIds[0] || "";
  const workEmail = profileMember.work_email || registeredAccount?.email || "";
  const mobilePhone = rosterMember?.mobile_phone ?? profileMember.mobile_phone ?? "";
  const photoUrl = memberPhotoDataUrlForEmployeeId(rosterMember?.employee_id ?? profileMember.employee_id);
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: {
        profile_ref: `profile:${actorRef}`,
        actor_ref: actorRef,
        tenant_ref: tenantId,
        display_name: displayName,
        english_name: registeredAccount?.english_name ?? "",
        primary_role_label: primaryRoleLabel,
        employee_id: profileMember.employee_id ?? null,
        work_email: workEmail,
        mobile_phone: mobilePhone,
        title: profileMember.title || registeredAccount?.source_title || "",
        department: profileMember.department ?? "",
        affiliation: profileMember.affiliation ?? "",
        organization_group: profileMember.organization_group ?? "",
        start_date: profileMember.start_date ?? "",
        country: profileMember.country ?? "",
        professional_profile: profileMember.professional_profile,
        photo_url: photoUrl,
        role_count: roleIds.length,
        contract_summary: {
          state: "connected",
          visible_contract_count: 0,
          source_ref: profileMember.source_ref ?? "session_profile_projection",
        },
        account_summary: {
          state: "connected",
          session_principal_source: context?.principal?.session_principal_source ?? "permission_context",
          session_source_ref: context?.principal?.session_source_ref ?? null,
          employee_user_link_resolved: Boolean(linkedEmployee),
        },
        contact_policy: PROFILE_BOUNDED_CONTEXT.contact_policy,
        secret_material_included: false,
        direct_identifier_included: Boolean(workEmail || mobilePhone),
        photo_included: Boolean(photoUrl),
        production_ready_claim: false,
      },
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      ui_state: "populated",
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

async function handle(req, res, { hrxRuntime, hrxRuntimeUnavailable = null, masterDataRuntime, matterRuntime, dmsRuntime, emailDmsRuntime, docusignRuntime = null, crmIntakeRuntime, financeRuntime, financeRuntimeUnavailable = null, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, homeDashboardRuntime, enterpriseReadinessRuntime, precedentSearchRuntime = null, m365GraphConfig = null, outlookConversationRuntime = null, outlookGraphSyncReadiness = null, outlookDesktopRuntime = null, sessionAuth, stepUpAuthority, outlookAttachmentReceiptAuthority, payrollStatementProviderVerifier = null, payrollStatementProviderAudit = null, leaveProviderVerifier = null, runtimeProfile = LAWOS_RUNTIME_PROFILES.localDev, persistenceAuthority = LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent, persistenceCapabilities = null, dataScope = null } = {}) {
  const url = new URL(req.url || "/", `http://${HOST}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const query = queryToObject(url.searchParams);
  const requestId = req.lawosRequestId ?? query.request_id ?? `req_${randomUUID()}`;
  req.lawosRequestId = requestId;

  if (req.method === "OPTIONS") {
    sendOptions(req, res);
    return;
  }

  const isClientGroupRegistrationReviewPath =
    pathname === "/master-data/client-groups/review";
  const isClientGroupRegistrationCreatePath =
    pathname === "/master-data/client-groups";
  const isClientGroupRegistrationPath =
    isClientGroupRegistrationReviewPath
    || isClientGroupRegistrationCreatePath;
  const clientGroupMatch = isClientGroupRegistrationReviewPath
    ? null
    : pathname.match(/^\/master-data\/client-groups\/([^/]+)$/);
  const isAuthPath = pathname.startsWith("/api/auth");
  const isHrxPath = pathname.startsWith("/api/hrx");
  const isProfilePath = pathname.startsWith("/api/profile");
  const isMatterPath = pathname.startsWith("/api/matters");
  const isVaultPath = pathname.startsWith("/api/vault");
  const isCrmIntakePath = pathname.startsWith("/api/crm") || pathname.startsWith("/api/intake");
  const isRecordActionsPath = pathname.startsWith("/api/record-actions");
  const isImportDataMappingPath = pathname.startsWith("/api/import-jobs") || pathname.startsWith("/api/import-targets");
  const isAdminPermissionPath = pathname.startsWith("/api/admin");
  const isDataCloudPath = pathname.startsWith("/api/data-cloud");
  const isReportsPath = pathname.startsWith("/api/reports");
  const isFinancePath = pathname.startsWith("/api/finance");
  const isAnalyticsPath = pathname.startsWith("/api/analytics");
  const isAiPath = pathname.startsWith("/api/ai");
  const isPortalPath = pathname.startsWith("/api/portal") || pathname.startsWith("/api/data-room");
  const isOutlookPath = pathname.startsWith("/api/outlook");
  const isOutlookDesktopActivationPath =
    outlookDesktopRuntime?.activation_enabled === true
    && isOutlookDesktopActivationApiPath(pathname);
  const isOutlookDesktopInstallationPath =
    isOutlookDesktopInstallationApiPath(pathname);
  const isOutlookDesktopPath =
    isOutlookDesktopActivationPath || isOutlookDesktopInstallationPath;
  const isUiReadinessPath = pathname.startsWith("/api/ui");
  const isHomeDashboardPath = pathname.startsWith("/home") || pathname.startsWith("/api/home");
  const isEnterpriseReadinessPath = pathname.startsWith("/api/enterprise");
  const knownPath =
    pathname === "/api/health" ||
    pathname === "/health" ||
    isAuthPath ||
    pathname === "/master-data/records" ||
    pathname === "/master-data/relationships" ||
    isClientGroupRegistrationPath ||
    clientGroupMatch !== null ||
    isHrxPath ||
    isProfilePath ||
    isMatterPath ||
    isVaultPath ||
    isCrmIntakePath ||
    isRecordActionsPath ||
    isImportDataMappingPath ||
    isAdminPermissionPath ||
    isDataCloudPath ||
    isReportsPath ||
    isFinancePath ||
    isAnalyticsPath ||
    isAiPath ||
    isPortalPath ||
    isOutlookPath ||
    isOutlookDesktopPath ||
    isUiReadinessPath ||
    isHomeDashboardPath ||
    isEnterpriseReadinessPath;

  if (!knownPath) {
    sendJson(req, res, 404, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "not_found" });
    return;
  }
  if (isClientGroupRegistrationPath && req.method !== "POST") {
    sendJson(req, res, 405, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "method_not_allowed" });
    return;
  }
  if (!isAuthPath && !isHrxPath && !isProfilePath && !isMatterPath && !isVaultPath && !isCrmIntakePath && !isRecordActionsPath && !isImportDataMappingPath && !isAdminPermissionPath && !isDataCloudPath && !isReportsPath && !isFinancePath && !isAnalyticsPath && !isAiPath && !isPortalPath && !isOutlookPath && !isOutlookDesktopPath && !isUiReadinessPath && !isHomeDashboardPath && !isEnterpriseReadinessPath && !isClientGroupRegistrationPath && req.method !== "GET") {
    sendJson(req, res, 405, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "method_not_allowed" });
    return;
  }

  if (pathname === "/api/health" || pathname === "/health") {
    sendJson(req, res, 200, {
      status: "ok",
      time: new Date().toISOString(),
      runtime_profile: runtimeProfile,
      synthetic_login_enabled: runtimeProfile !== LAWOS_RUNTIME_PROFILES.operational,
      persistence_authority: persistenceAuthority,
      runtime_safety_policy: LAWOS_OFFLINE_REJECTED_POLICY,
      auth_authority: sessionAuth.capabilities ?? null,
      outlook_desktop_installation:
        OUTLOOK_DESKTOP_INSTALLATION_BOUNDED_CONTEXT,
      ...(outlookDesktopRuntime?.activation_enabled === true
        ? {
            outlook_desktop_activation:
              OUTLOOK_DESKTOP_ACTIVATION_BOUNDED_CONTEXT,
          }
        : {}),
      ...(outlookGraphSyncReadiness
        ? { outlook_graph_sync: outlookGraphSyncReadiness }
        : {}),
      runtime_instance_fingerprint: dataScope === "synthetic-only" ? PROCESS_INSTANCE_FINGERPRINT : undefined,
      docusign: docusignRuntime?.readiness?.() ?? { status: "blocked", production_ready_claim: false },
      ...serviceDescriptorForAuthority({ persistenceAuthority, persistenceCapabilities, dataScope }),
    });
    return;
  }

  if (pathname === "/api/auth/password-reset/open") {
    if (sessionAuth.capabilities?.federated_staff_auth === true) {
      sendJson(req, res, 403, {
        request_id: requestId,
        outcome: "blocked",
        reason: "auth_password_login_disabled",
        safe_error_codes: ["AUTH_PASSWORD_LOGIN_DISABLED"],
        token_material_returned: false,
        production_ready_claim: false,
      });
      return;
    }
    if (req.method !== "GET") {
      sendJson(req, res, 405, { request_id: requestId, outcome: "blocked", reason: "auth_method_not_allowed" });
      return;
    }
    sendHtml(req, res, 200, passwordResetOpenPageHtml());
    return;
  }

  if (isAuthPath) {
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await sessionAuth.handleAuthApiRequest({ pathname, method: req.method, body, headers: req.headers, requestId });
    sendJson(req, res, result.status, result.body, result.headers);
    return;
  }

  const matterBridgeRouteKey = `${req.method} ${pathname}`;
  if (MATTER_VAULT_BRIDGE_ROUTES.has(matterBridgeRouteKey)) {
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleMatterApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      headers: req.headers,
      context: parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]),
      requestId,
      runtime: matterRuntime,
    });
    sendJson(req, res, result.status, result.body, result.headers);
    return;
  }

  if (isPortalExternalPublicRoute(req.method, pathname)) {
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handlePortalApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context: null,
      requestId,
      runtime: portalRuntime,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isPayrollStatementProviderCallback(req.method, pathname)) {
    const body = await readRequestBody(req, { maxBytes: 64 * 1024 });
    const result = await handlePayrollStatementProviderCallback({
      headers: req.headers,
      body,
      rawBody: req.lawosRawRequestBody,
      runtime: hrxRuntime,
      verifier: payrollStatementProviderVerifier,
      audit: payrollStatementProviderAudit,
      verified: req.lawosPayrollStatementProviderAuthorization,
      requestId,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  const isOutlookHttpsCallback =
    req.method === "GET"
    && pathname === "/api/outlook/connection/callback";
  if (isOutlookHttpsCallback) {
    let clientCallbackParsed = false;
    try {
      const states = url.searchParams.getAll("state");
      if (states.some(isPeopleOutlookOAuthState)) {
        sendExternalRedirect(
          req,
          res,
          createPeopleOutlookDesktopCallbackLocation(url.searchParams),
        );
        return;
      }
      if (!states.some(isClientOutlookOAuthState)) {
        throw new TypeError("Outlook callback state is invalid");
      }
      const callback = parseClientOutlookAuthorizationCallback(
        url.searchParams,
      );
      clientCallbackParsed = true;
      const resolver = m365GraphConfig?.provider
        ?.resolveDelegatedAuthorizationState;
      if (typeof resolver !== "function") {
        sendExternalRedirect(
          req,
          res,
          createClientOutlookLegacyAddinCallbackLocation(url.searchParams),
        );
        return;
      }
      const callbackPrincipal = resolver({ state: callback.state });
      if (callbackPrincipal.callback_mode !== M365_GRAPH_CALLBACK_MODES.server_complete) {
        sendExternalRedirect(
          req,
          res,
          createClientOutlookLegacyAddinCallbackLocation(url.searchParams),
        );
        return;
      }
      if (callback.error) {
        sendExternalRedirect(
          req,
          res,
          createClientOutlookAddinCallbackLocation("failed"),
        );
        return;
      }
      const result = await handleClientOutlookAuthorizationCallback({
        code: callback.code,
        state: callback.state,
        requestId,
        runtime: { emailDmsRuntime, m365GraphConfig, sessionAuth },
      });
      if (result.status !== 200) {
        throw new TypeError("Outlook callback completion failed");
      }
      sendExternalRedirect(
        req,
        res,
        createClientOutlookAddinCallbackLocation("connected"),
      );
    } catch {
      if (clientCallbackParsed) {
        sendExternalRedirect(
          req,
          res,
          createClientOutlookAddinCallbackLocation("failed"),
        );
        return;
      }
      sendJson(req, res, 400, {
        request_id: requestId,
        outcome: "blocked",
        reason: "outlook_oauth_callback_invalid",
        safe_error_codes: ["OUTLOOK_OAUTH_CALLBACK_INVALID"],
      });
    }
    return;
  }

  if (isLeaveProviderCallback(req.method, pathname)) {
    const body = await readRequestBody(req, { maxBytes: 64 * 1024 });
    const result = await handleLeaveProviderCallback({
      headers: req.headers,
      body,
      rawBody: req.lawosRawRequestBody,
      runtime: hrxRuntime,
      verifier: leaveProviderVerifier,
      requestId,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  const sessionContext = await sessionAuth.resolvePermissionContextFromHeaders(req.headers, { requestId, requireSessionToken: true });
  if (!sessionContext.ok) {
    sendJson(req, res, sessionContext.status ?? 401, sessionContext.body ?? {
      request_id: requestId,
      outcome: "blocked",
      ok: false,
      reason: "auth_session_required",
      safe_error_codes: ["AUTH_SESSION_REQUIRED"],
      token_material_returned: false,
      production_ready_claim: false,
    });
    return;
  }
  if (
    sessionContext.token_payload?.surface === "outlook_addin"
    && !isOutlookPath
  ) {
    sendJson(req, res, 403, {
      request_id: requestId,
      outcome: "blocked",
      ok: false,
      reason: "auth_session_surface_denied",
      safe_error_codes: ["AUTH_SESSION_SURFACE_DENIED"],
      production_ready_claim: false,
    });
    return;
  }
  if (pathname !== "/api/hrx/people/me/outlook-connection/complete") {
    req.lawosAuthenticatedActorId = sessionContext.principal.user_id;
  }
  const requestPermissionContext = () => sessionContext.context;
  const requestHeaders = () => {
    const principal = sessionContext.principal;
    return {
      ...req.headers,
      "x-lawos-tenant-id": principal.tenant_id,
      "x-lawos-actor-id": principal.user_id,
      "x-lawos-actor-role": (principal.role_ids ?? []).join(","),
      "x-lawos-hrx-scopes": (principal.hrx_scopes ?? principal.scopes ?? []).join(","),
      [HRX_SESSION_BOUND_HEADER]: "signed",
    };
  };

  if (isOutlookDesktopActivationPath) {
    let body = {};
    if (req.method === "POST") {
      try {
        body = await readRequestBody(req, {
          maxBytes: OUTLOOK_DESKTOP_ACTIVATION_MAX_BODY_BYTES,
          injectAuthenticatedActor: false,
        });
      } catch (error) {
        const result = mapOutlookDesktopActivationRequestBodyError(
          error,
          requestId,
        );
        sendJson(req, res, result.status, result.body);
        return;
      }
    }
    const result = await handleOutlookDesktopActivationApiRequest({
      pathname,
      method: req.method,
      body,
      headers: req.headers,
      principal: sessionContext.principal,
      context: requestPermissionContext(),
      requestId,
      runtime: outlookDesktopRuntime,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isOutlookDesktopInstallationPath) {
    let body = {};
    if (req.method === "POST") {
      try {
        body = await readRequestBody(req, {
          maxBytes: OUTLOOK_DESKTOP_INSTALLATION_MAX_BODY_BYTES,
          injectAuthenticatedActor: false,
        });
      } catch (error) {
        const result = mapOutlookDesktopInstallationRequestBodyError(
          error,
          requestId,
        );
        sendJson(req, res, result.status, result.body);
        return;
      }
    }
    const result = await handleOutlookDesktopInstallationApiRequest({
      pathname,
      method: req.method,
      body,
      principal: sessionContext.principal,
      context: requestPermissionContext(),
      requestId,
      runtime: outlookDesktopRuntime,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isHrxPath) {
    if (hrxRuntimeUnavailable) {
      sendJson(req, res, 503, {
        request_id: requestId,
        outcome: "blocked",
        ok: false,
        reason: "hrx_runtime_unavailable",
        safe_error_codes: ["HRX_RUNTIME_UNAVAILABLE"],
        runtime_profile: runtimeProfile,
        production_ready_claim: false,
      });
      return;
    }
    const hrxAuthz = authorizeHrxApiRequest({ method: req.method, pathname, query, headers: requestHeaders() });
    if (!hrxAuthz.ok) {
      await appendHrxDeniedRouteAudit({
        runtime: hrxRuntime,
        context: hrxAuthz.context,
        route: pathname,
        policy: hrxAuthz.policy,
        decision: hrxAuthz.decision ?? { effect: "deny", reason: hrxAuthz.body?.reason },
      });
      sendJson(req, res, hrxAuthz.status, { request_id: requestId, ...hrxAuthz.body });
      return;
    }
    const hrxStepUp = authorizeHrxStepUpRequest({
      action: hrxAuthz.policy.action,
      policyPurpose: hrxAuthz.policy.purpose,
      context: {
        ...hrxAuthz.context,
        session_jti: sessionContext.principal.session_jti ?? null,
      },
      headers: req.headers,
      verifier: stepUpAuthority,
      requestId,
    });
    if (!hrxStepUp.ok) {
      await appendHrxDeniedRouteAudit({
        runtime: hrxRuntime,
        context: hrxAuthz.context,
        route: pathname,
        policy: hrxAuthz.policy,
        decision: hrxStepUp.decision ?? { effect: "deny", reason: hrxStepUp.body?.reason, action: hrxAuthz.policy.action },
      });
      sendJson(req, res, hrxStepUp.status, { request_id: requestId, ...hrxStepUp.body });
      return;
    }
    if (hrxStepUp.decision?.step_up_required === true && typeof sessionAuth.validateStepUpChallenge === "function") {
      const stepUpHeader = Array.isArray(req.headers[HRX_STEP_UP_CONTEXT_HEADER])
        ? req.headers[HRX_STEP_UP_CONTEXT_HEADER][0]
        : req.headers[HRX_STEP_UP_CONTEXT_HEADER];
      const challenge = await sessionAuth.validateStepUpChallenge({
        token: stepUpHeader,
        principal: sessionContext.principal,
        purpose: hrxStepUp.decision.purpose,
      });
      if (!challenge.ok) {
        await appendHrxDeniedRouteAudit({
          runtime: hrxRuntime,
          context: hrxAuthz.context,
          route: pathname,
          policy: hrxAuthz.policy,
          decision: { effect: "deny", reason: challenge.reason, action: hrxAuthz.policy.action },
        });
        sendJson(req, res, challenge.status ?? 403, {
          request_id: requestId,
          outcome: "blocked",
          ok: false,
          reason: challenge.reason,
          safe_error_code: challenge.safe_error_code ?? "HRX_STEP_UP_CHALLENGE_INVALID",
          step_up_required: true,
          fail_closed: true,
        });
        return;
      }
    }
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const permissionContext = requestPermissionContext();
    const result = await handleHrxApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context: hrxRuntime,
      matterContext: matterRuntime,
      requestContext: {
        ...hrxAuthz.context,
        hrx_scopes: hrxAuthz.principal?.hrx_scopes ?? [],
        email: sessionContext.principal.email ?? null,
        entra_subject_id:
          sessionContext.principal.entra_subject_id ?? null,
        step_up_verified: hrxStepUp.decision?.effect === "allow" && hrxStepUp.decision?.step_up_required === true,
        step_up_purpose: hrxStepUp.decision?.purpose ?? null,
      },
      permissionContext,
    });
    sendJson(req, res, result.status, { request_id: requestId, ...result.body });
    return;
  }

  if (isProfilePath) {
    const context = requestPermissionContext();
    const result = handleProfileApiRequest({ pathname, method: req.method, query, context, requestId, runtime: hrxRuntime });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isMatterPath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleMatterApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      headers: req.headers,
      context,
      requestId,
      runtime: matterRuntime,
    });
    sendJson(req, res, result.status, result.body, result.headers);
    return;
  }

  if (isVaultPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleVaultDmsApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: dmsRuntime,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isCrmIntakePath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleCrmIntakeApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: {
        ...crmIntakeRuntime,
        emailDmsRuntime,
        m365GraphConfig,
        engagementMasterDataRepository:
          financeRuntime?.masterDataRepository
          ?? masterDataRuntime?.repository
          ?? crmIntakeRuntime?.masterDataRepository,
        financeRuntime,
      },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isRecordActionsPath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleRecordActionsApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { matterRuntime, crmIntakeRuntime, masterDataRuntime },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isImportDataMappingPath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleImportDataMappingApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { matterRuntime, crmIntakeRuntime, masterDataRuntime, financeRuntime },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isAdminPermissionPath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    if (pathname.startsWith("/api/admin/security")) {
      const result = await sessionAuth.handleSecurityAdminApiRequest({
        pathname,
        method: req.method,
        body,
        context,
        requestId,
      });
      sendJson(req, res, result.status, result.body);
      return;
    }
    const result = await handleAdminPermissionApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { matterRuntime },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isDataCloudPath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleDataCloudApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { matterRuntime },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isReportsPath) {
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleReportsApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { analyticsRuntime },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isFinancePath) {
    if (!financeRuntime) {
      sendJson(req, res, 503, {
        request_id: requestId,
        outcome: "blocked",
        safe_error_codes: ["FINANCE_RUNTIME_UNAVAILABLE"],
        reason: financeRuntimeUnavailable?.reason ?? "finance_runtime_unavailable",
        production_ready_claim: false,
      });
      return;
    }
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleFinanceApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: financeRuntime,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isAnalyticsPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleAnalyticsApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: analyticsRuntime,
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isAiPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleAiApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: aiRuntime });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isPortalPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handlePortalApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: portalRuntime });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isOutlookPath) {
    if (isOutlookDocumentApiPath(pathname)) {
      const declaredLength = Number(Array.isArray(req.headers["content-length"])
        ? req.headers["content-length"][0]
        : req.headers["content-length"]);
      const hasBody = hasJsonRequestBody(req.method)
        || (Number.isFinite(declaredLength) && declaredLength > 0)
        || req.headers["transfer-encoding"] !== undefined;
      const body = hasBody
        ? await readRequestBody(req, { maxBytes: 128 * 1024, injectAuthenticatedActor: false })
        : {};
      const result = await handleOutlookDocumentApiRequest({
        pathname,
        method: req.method,
        query,
        queryPairs: [...url.searchParams.entries()],
        body,
        context: requestPermissionContext(),
        principal: sessionContext.principal,
        requestId,
        matterRuntime,
        docusignRuntime,
      });
      sendJson(req, res, result.status, result.body);
      return;
    }
    if (isDocusignOutlookRoute(req.method, pathname)) {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = await handleDocusignOutlookRequest({
        method: req.method,
        pathname,
        query,
        body,
        principal: sessionContext.principal,
        requestId,
        runtime: docusignRuntime,
      });
      sendJson(req, res, result.status, result.body);
      return;
    }
    const context = requestPermissionContext();
    const body = hasJsonRequestBody(req.method)
      ? await readRequestBody(req, {
          injectAuthenticatedActor: pathname !== "/api/outlook/time-entry-drafts",
        })
      : {};
    const result = await handleOutlookAddinApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      headers: req.headers,
      context,
      requestId,
      runtime: {
        matterRuntime,
        dmsRuntime,
        emailDmsRuntime,
        crmIntakeRuntime,
        financeRuntime,
        precedentSearchRuntime,
        m365GraphConfig,
        conversationRuntime: outlookConversationRuntime,
        outlookDesktopRuntime,
        sessionAuth,
        attachmentReceiptAuthority: outlookAttachmentReceiptAuthority,
      },
    });
    sendJson(req, res, result.status, result.body, result.headers);
    return;
  }

  if (isUiReadinessPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleUiReadinessApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: uiReadinessRuntime });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isHomeDashboardPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleHomeDashboardApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: homeDashboardRuntime });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isEnterpriseReadinessPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleEnterpriseReadinessApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: enterpriseReadinessRuntime });
    sendJson(req, res, result.status, result.body);
    return;
  }

  const context = requestPermissionContext();

  let result;
  if (pathname === "/master-data/records") {
    result = handleRecordsSearch({ query, context, requestId, runtime: masterDataRuntime });
  } else if (pathname === "/master-data/relationships") {
    result = handleRelationshipLookup({ query, context, requestId, runtime: masterDataRuntime });
  } else if (isClientGroupRegistrationReviewPath) {
    const body = await readRequestBody(req);
    result = handleClientGroupRegistrationReview({
      body,
      context,
      requestId,
      runtime: masterDataRuntime,
    });
  } else if (isClientGroupRegistrationCreatePath) {
    const body = await readRequestBody(req);
    result = handleClientGroupRegistrationCreate({
      body,
      context,
      requestId,
      runtime: masterDataRuntime,
    });
  } else {
    result = handleClientGroupResolution({
      clientGroupId: decodeURIComponent(clientGroupMatch[1]),
      query,
      context,
      requestId,
      runtime: masterDataRuntime,
    });
  }
  sendJson(req, res, result.status, result.body);
}

export function createApiServer({
  hrxRuntime = createDefaultHrxRuntime(),
  hrxRuntimeUnavailable = null,
  masterDataRuntime = createDefaultMasterDataRuntime(),
  matterRuntime = createDefaultMatterRuntime({ hrxRuntime }),
  dmsRuntime = createDefaultDmsRuntime(),
  emailDmsRuntime = createDefaultEmailDmsRuntime({ dmsRuntime }),
  docusignRuntime = createDocusignFailClosedRuntime(),
  crmIntakeRuntime = createDefaultCrmIntakeRuntime({
    dmsRuntime,
    emailDmsRepository: emailDmsRuntime?.repository,
    crmMasterDataRepository: masterDataRuntime?.repository,
  }),
  financeRuntime = createDefaultFinanceRuntime({
    masterDataRepository: masterDataRuntime?.repository,
    crmRepository: crmIntakeRuntime?.crmRepository,
    matterRepository: matterRuntime?.repository,
  }),
  financeRuntimeUnavailable = null,
  analyticsRuntime = createDefaultAnalyticsRuntime({
    financeRepository: financeRuntime?.repository,
    masterDataRepository: masterDataRuntime?.repository,
    crmRepository: crmIntakeRuntime?.crmRepository,
    matterRepository: matterRuntime?.repository,
  }),
  aiRuntime = createDefaultAiRuntime(),
  portalRuntime = createDefaultPortalRuntime(),
  uiReadinessRuntime = createDefaultUiReadinessRuntime(),
  homeDashboardRuntime = createDefaultHomeDashboardRuntime({
    operationalRepository: analyticsRuntime?.repository,
    sourceCollectors: createHomeDashboardSourceCollectors({ hrxRuntime, matterRuntime, dmsRuntime, aiRuntime }),
  }),
  enterpriseReadinessRuntime = createDefaultEnterpriseReadinessRuntime(),
  precedentSearchRuntime = null,
  m365GraphConfig = null,
  outlookGraphWebhook = emailDmsRuntime?.outlook_graph_webhook ?? null,
  outlookConversationRuntime = null,
  outlookGraphSyncReadiness = emailDmsRuntime?.outlook_graph_sync_readiness ?? null,
  outlookDesktopRuntime = null,
  runtimeProfile = resolveRuntimeProfile(),
  persistenceAuthority = LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent,
  stepUpAuthority,
  sessionAuth,
  timelineCursorAuthority = createMatterTimelineCursorAuthority(),
  outlookAttachmentReceiptAuthority = createOutlookAttachmentReceiptAuthority(),
  sessionObjectAclResolver = null,
  requestRuntimeAuthority = null,
  payrollStatementProviderVerifier = null,
  payrollStatementProviderAudit = null,
  leaveProviderVerifier = null,
  dataScope = process.env.LAWOS_DATA_SCOPE ?? null,
} = {}) {
  const resolvedStepUpAuthority = stepUpAuthority ?? createHrxStepUpAuthority({ profile: runtimeProfile });
  const resolvedSessionAuth = sessionAuth ?? createApiSessionAuth({
    stepUpAuthority: resolvedStepUpAuthority,
    profile: runtimeProfile,
    objectAclResolver: sessionObjectAclResolver,
  });
  const resolvedPayrollStatementProviderAudit = payrollStatementProviderAudit
    ?? (typeof resolvedSessionAuth.appendProviderCallbackAudit === "function"
      ? resolvedSessionAuth.appendProviderCallbackAudit.bind(resolvedSessionAuth)
      : null);
  return http.createServer(async (req, res) => {
    try {
      const dispatchWithRuntimes = async (targetResponse, requestRuntimes = {}) => {
        const resolvedEmailDmsRuntime =
          requestRuntimes.emailDmsRuntime ?? emailDmsRuntime;
        const baseCrmIntakeRuntime =
          requestRuntimes.crmIntakeRuntime ?? crmIntakeRuntime;
        const resolvedCrmIntakeRuntime =
          baseCrmIntakeRuntime?.emailDmsRepository
            === resolvedEmailDmsRuntime?.repository
            ? baseCrmIntakeRuntime
            : Object.freeze({
                ...baseCrmIntakeRuntime,
                emailDmsRepository:
                  resolvedEmailDmsRuntime?.repository
                  ?? baseCrmIntakeRuntime?.emailDmsRepository
                  ?? null,
              });
        const baseMatterRuntime = requestRuntimes.matterRuntime ?? matterRuntime;
        const matterRuntimeWithClearanceLedger = baseMatterRuntime
          ? Object.freeze({
              ...baseMatterRuntime,
              ...(!baseMatterRuntime.clearanceRepository && resolvedCrmIntakeRuntime?.intakeRepository
                ? { clearanceRepository: resolvedCrmIntakeRuntime.intakeRepository }
                : {}),
              timelineCursorAuthority,
            })
          : baseMatterRuntime;
        return dispatchApiHandler(handle, req, targetResponse, {
          hrxRuntime: requestRuntimes.hrxRuntime ?? hrxRuntime,
          hrxRuntimeUnavailable,
          masterDataRuntime: requestRuntimes.masterDataRuntime ?? masterDataRuntime,
          matterRuntime: matterRuntimeWithClearanceLedger,
          dmsRuntime: requestRuntimes.dmsRuntime ?? dmsRuntime,
          emailDmsRuntime: resolvedEmailDmsRuntime,
          docusignRuntime: requestRuntimes.docusignRuntime ?? docusignRuntime,
          crmIntakeRuntime: resolvedCrmIntakeRuntime,
          financeRuntime: requestRuntimes.financeRuntime ?? financeRuntime,
          financeRuntimeUnavailable,
          analyticsRuntime: requestRuntimes.analyticsRuntime ?? analyticsRuntime,
          aiRuntime: requestRuntimes.aiRuntime ?? aiRuntime,
          portalRuntime: requestRuntimes.portalRuntime ?? portalRuntime,
          uiReadinessRuntime: requestRuntimes.uiReadinessRuntime ?? uiReadinessRuntime,
          homeDashboardRuntime: requestRuntimes.homeDashboardRuntime ?? homeDashboardRuntime,
          enterpriseReadinessRuntime: requestRuntimes.enterpriseReadinessRuntime ?? enterpriseReadinessRuntime,
          precedentSearchRuntime: requestRuntimes.precedentSearchRuntime ?? precedentSearchRuntime,
          m365GraphConfig,
          outlookConversationRuntime,
          outlookGraphSyncReadiness,
          outlookDesktopRuntime,
          sessionAuth: resolvedSessionAuth,
          stepUpAuthority: resolvedStepUpAuthority,
          payrollStatementProviderVerifier,
          payrollStatementProviderAudit: resolvedPayrollStatementProviderAudit,
          leaveProviderVerifier,
          runtimeProfile,
          persistenceAuthority,
          persistenceCapabilities: requestRuntimeAuthority?.capabilities ?? null,
          dataScope,
          outlookAttachmentReceiptAuthority,
        });
      };

      const requestPathname = new URL(req.url || "/", `http://${HOST}`).pathname.replace(/\/+$/, "") || "/";
      if (requestPathname === OUTLOOK_GRAPH_WEBHOOK_PATH && typeof outlookGraphWebhook?.handle === "function") {
        const requestId = String(req.headers["x-request-id"] ?? "").trim() || `req_${randomUUID()}`;
        req.lawosRequestId = requestId;
        const requestUrl = new URL(req.url || "/", `http://${HOST}`);
        let body = null;
        if (req.method === "POST" && !requestUrl.searchParams.has("validationToken") && /^application\/json(?:\s*;|$)/iu.test(String(req.headers["content-type"] ?? ""))) {
          try {
            body = await readRequestBody(req, { maxBytes: 256 * 1024 });
          } catch (error) {
            sendJson(req, res, error?.status === 413 ? 413 : 400, { request_id: requestId, outcome: "blocked", safe_error_codes: ["OUTLOOK_GRAPH_NOTIFICATION_INVALID"] });
            return;
          }
        }
        const result = await outlookGraphWebhook.handle({
          method: req.method,
          query: Object.fromEntries(requestUrl.searchParams),
          headers: req.headers,
          body,
          request_id: requestId,
        });
        if (result.headers?.["content-type"]?.startsWith("text/plain")) {
          res.writeHead(result.status, result.headers);
          res.end(result.body);
        } else {
          sendJson(req, res, result.status, result.body, result.headers);
        }
        return;
      }
      if (isDocusignWebhook(req.method, requestPathname)) {
        const requestId = String(req.headers["x-request-id"] ?? "").trim() || `req_${randomUUID()}`;
        req.lawosRequestId = requestId;
        try {
          await readRequestBody(req, { maxBytes: 256 * 1024 });
        } catch (error) {
          const result = await handleDocusignWebhook({
            headers: req.headers,
            rawBody: req.lawosRawRequestBody ?? Buffer.alloc(0),
            requestId,
            runtime: docusignRuntime,
            preflightError: error,
          });
          sendJson(req, res, result.status, result.body);
          return;
        }
        const result = await handleDocusignWebhook({
          headers: req.headers,
          rawBody: req.lawosRawRequestBody,
          requestId,
          runtime: docusignRuntime,
        });
        sendJson(req, res, result.status, result.body);
        return;
      }
      if (isPayrollStatementProviderCallback(req.method, requestPathname)) {
        const requestId = String(req.headers["x-request-id"] ?? "").trim() || `req_${randomUUID()}`;
        req.lawosRequestId = requestId;
        let body;
        try {
          body = await readRequestBody(req, { maxBytes: 64 * 1024 });
        } catch (error) {
          const denial = await denyPayrollStatementProviderCallback({
            audit: resolvedPayrollStatementProviderAudit,
            headers: req.headers,
            requestId,
            status: Number.isInteger(error?.status) ? error.status : 400,
            safeErrorCode: error?.safe_error_code ?? "HRX_PAYROLL_PROVIDER_BODY_INVALID",
          });
          sendJson(req, res, denial.status, denial.body);
          return;
        }
        const authorization = await verifyPayrollStatementProviderCallback({
          headers: req.headers,
          body,
          rawBody: req.lawosRawRequestBody,
          verifier: payrollStatementProviderVerifier,
          audit: resolvedPayrollStatementProviderAudit,
          requestId,
        });
        if (!authorization.ok) {
          sendJson(req, res, authorization.response.status, authorization.response.body);
          return;
        }
        req.lawosPayrollStatementProviderAuthorization = authorization;
      }

      if (!requestRuntimeAuthority || !requestUsesProductRuntime(req)) {
        await dispatchWithRuntimes(res);
        return;
      }

      let tenantId = publicRuntimeTenant(req, m365GraphConfig);
      if (!tenantId) {
        if (isPayrollStatementProviderCallback(req.method, requestPathname) || isLeaveProviderCallback(req.method, requestPathname)) {
          await dispatchWithRuntimes(res);
          return;
        }
        const sessionContext = await resolvedSessionAuth.resolvePermissionContextFromHeaders(req.headers, {
          requestId: req.headers["x-request-id"] ?? "req_postgres_authority",
          requireSessionToken: true,
        });
        if (!sessionContext.ok) {
          await dispatchWithRuntimes(res);
          return;
        }
        tenantId = sessionContext.principal.tenant_id;
        req.lawosActorId = sessionContext.principal.user_id ?? sessionContext.principal.actor_id ?? null;
      }
      const requestTarget = new URL(req.url || "/", `http://${HOST}`);
      const requestOccurrenceId = randomUUID();
      let bufferedResponse = null;
      await requestRuntimeAuthority.run({
        tenant_id: tenantId,
        request_context: {
          method: req.method,
          pathname: requestTarget.pathname,
          actor_id: req.lawosActorId ?? null,
          retry_idempotent_conflict:
            isPayrollStatementProviderCallback(req.method, requestPathname)
            && req.lawosPayrollStatementProviderAuthorization?.ok === true,
          get request_body_hash() {
            return req.lawosRequestBodyHash ?? hashDomainValue({});
          },
          get request_target_hash() {
            return hashDomainValue(`${requestTarget.pathname}${requestTarget.search}`);
          },
          get idempotency_key() {
            return resolvePostgresRequestIdempotencyKey({
              method: req.method,
              explicit_key: req.headers["idempotency-key"] ?? req.headers["x-idempotency-key"],
              body_key: req.lawosRequestBodyIdempotencyKey,
              request_occurrence_id: requestOccurrenceId,
              request_target_hash: hashDomainValue(`${requestTarget.pathname}${requestTarget.search}`),
              request_body_hash: req.lawosRequestBodyHash ?? hashDomainValue({}),
            });
          },
        },
        command: (requestRuntimes) => {
          bufferedResponse = createBufferedResponse();
          return dispatchWithRuntimes(bufferedResponse, requestRuntimes);
        },
      });
      if (!bufferedResponse) throw new Error("PostgreSQL API authority completed without a response attempt");
      bufferedResponse.commit(res);
    } catch (error) {
      const mapped = mapApiHandlerError(error, { requestId: req.lawosRequestId ?? req.headers["x-request-id"] ?? null });
      sendJson(req, res, mapped.status, mapped.body);
    }
  });
}

async function startApiServerImplementation({
  port = DEFAULT_PORT,
  runtimeProfile,
  persistenceAuthority,
  persistenceAuthorityEnv = process.env,
  persistenceConnectPostgres,
  persistenceSecretsClient,
  persistenceResolvePostgresSecret,
  sessionSecret,
  outlookAttachmentReceiptAuthority,
  hrxRuntime,
  hrxStore,
  hrxStorePath,
  hrxRelationalProjectionMappingManifest,
  hrxRelationalProjectionValidationResultSha256,
  masterDataRuntime,
  masterDataRepository,
  masterDataStorePath,
  matterRuntime,
  matterRepository,
  matterStorePath,
  dmsRuntime,
  dmsRepository,
  dmsStorage,
  emailDmsRuntime,
  emailDmsRepository,
  docusignRuntime,
  dmsVerifyPermanentDeleteApproval,
  payrollArtifactSecret,
  payrollProviders,
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled,
  payrollSecretsClient,
  payrollResolveArtifactSecret,
  payrollStatementProviderVerifier,
  payrollStatementProviderAudit,
  leaveProviderVerifier,
  peopleFeatureFlags,
  peopleMetricsSink,
  peopleProviderIdentities,
  peopleProviderIdentityRepository,
  outlookTokenVault,
  outlookConsentService,
  outlookConsentRepository,
  outlookCalendarCache,
  peopleOutlookConnections,
  peopleOutlookCalendarSource,
  peopleOutlookRuntimeFactory,
  outlookCalendarViewAdapter,
  outlookConsentRefresh,
  outlookSubjectAddressResolver,
  outlookStateAuthority,
  outlookOauthPort,
  offboardingAccessSource,
  dmsStorePath,
  dmsObjectStorePath,
  crmIntakeRuntime: providedCrmIntakeRuntime,
  crmRepository,
  intakeRepository,
  crmMasterDataRepository,
  crmStorePath,
  intakeStorePath,
  crmMasterDataStorePath,
  financeRuntime,
  financeRepository,
  financeStorePath,
  analyticsRuntime,
  analyticsRepository,
  analyticsStorePath,
  analyticsFinanceRepository,
  clientOperationsV2Enabled,
  aiRuntime,
  aiRepository,
  aiStorePath,
  portalRuntime,
  portalRepository,
  portalStorePath,
  uiReadinessRuntime,
  uiReadinessRepository,
  uiReadinessStorePath,
  homeDashboardRuntime,
  enterpriseReadinessRuntime,
  enterpriseReadinessRepository,
  m365GraphConfig,
  outlookGraphWebhook,
  outlookConversationRuntimeFactory = createPostgresOutlookConversationRuntime,
  outlookDesktopEntitlementEnabled,
  outlookDesktopActivationControlPort,
  outlookDesktopLifecycleControlPort,
  outlookDesktopAutoconnectRoster,
  enterpriseReadinessStorePath,
  securityAuditStorePath,
  authCredentialStorePath,
  authPasswordResetStorePath,
  objectAclStorePath,
  passwordResetEmailDelivery,
  sessionAuth,
  sessionObjectAclResolver,
  staffAuthAuthority,
  staffOidcProvider,
  entraSecretsClient,
  entraFetchFn,
  stepUpAuthority,
  hrxStepUpSecret,
  hrxStepUpTotpSecret,
} = {}) {
  const resolvedRuntimeProfile = normalizeRuntimeProfileOption(runtimeProfile);
  if ((hrxRelationalProjectionMappingManifest == null)
    !== (hrxRelationalProjectionValidationResultSha256 == null)) {
    throw runtimePreflightError(
      "HRX relational projection mapping and validation binding must be configured together",
    );
  }
  const resolvedPersistenceAuthorityEnv = {
    ...persistenceAuthorityEnv,
    LAWOS_RUNTIME_PROFILE: resolvedRuntimeProfile,
  };
  const resolvedPersistenceAuthority = resolvePersistenceAuthority({
    value: persistenceAuthority,
    env: resolvedPersistenceAuthorityEnv,
  });
  const resolvedPeopleFeatureFlags =
    peopleFeatureFlags ?? resolvePeopleFeatureFlagsFromEnv(resolvedPersistenceAuthorityEnv);
  const resolvedStaffAuthAuthority = resolveStaffAuthAuthority(
    staffAuthAuthority ?? resolvedPersistenceAuthorityEnv.LAWOS_STAFF_AUTHORITY,
  );
  const resolvedClientOperationsV2Enabled =
    resolveClientOperationsV2Enabled({
      value: clientOperationsV2Enabled,
      env: resolvedPersistenceAuthorityEnv,
    });
  const persistenceAuthorityState = await preparePersistenceAuthority({
    value: persistenceAuthority,
    env: resolvedPersistenceAuthorityEnv,
    connectPostgres: persistenceConnectPostgres,
    secretsClient: persistenceSecretsClient,
    resolvePostgresSecret: persistenceResolvePostgresSecret,
  });
  const resolvedSessionSecret = resolveSessionSecret({
    profile: resolvedRuntimeProfile,
    explicitSecret: sessionSecret,
  });
  const resolvedBankImportPreviewTokens = createBankImportPreviewTokenAuthority({
    secret: resolvedSessionSecret,
  });
  const resolvedClientFixedReportTokens =
    createClientFixedReportSnapshotTokenAuthority({
      secret: resolvedSessionSecret,
    });
  const resolvedTimelineCursorAuthority = createMatterTimelineCursorAuthority({
    secret: resolvedSessionSecret,
  });
  const resolvedOutlookAttachmentReceiptAuthority = outlookAttachmentReceiptAuthority
    ?? createOutlookAttachmentReceiptAuthority({ secret: resolvedSessionSecret });
  let resolvedStaffOidcProvider = staffOidcProvider ?? null;
  if (resolvedStaffAuthAuthority === LAWOS_STAFF_AUTH_AUTHORITIES.internalPassword && resolvedStaffOidcProvider) {
    throw runtimePreflightError("staff OIDC provider is forbidden when LAWOS_STAFF_AUTHORITY=internal-password");
  }
  if (
    resolvedStaffAuthAuthority === LAWOS_STAFF_AUTH_AUTHORITIES.entraOidc
    &&
    persistenceAuthorityState.authority === LAWOS_PERSISTENCE_AUTHORITIES.postgresV2
    && resolvedRuntimeProfile === LAWOS_RUNTIME_PROFILES.operational
    && !sessionAuth
    && !resolvedStaffOidcProvider
  ) {
    resolvedStaffOidcProvider = await createEntraOidcProviderFromSecretReference({
      env: resolvedPersistenceAuthorityEnv,
      secretsClient: entraSecretsClient,
      fetchFn: entraFetchFn,
    });
  }
  if (
    resolvedStaffAuthAuthority === LAWOS_STAFF_AUTH_AUTHORITIES.entraOidc
    && resolvedRuntimeProfile === LAWOS_RUNTIME_PROFILES.operational
    && !sessionAuth
    && !resolvedStaffOidcProvider
  ) {
    throw runtimePreflightError("LAWOS_STAFF_AUTHORITY=entra-oidc requires a configured Entra OIDC provider");
  }
  const resolvedStepUpAuthority = stepUpAuthority ?? createHrxStepUpAuthority({
    profile: resolvedRuntimeProfile,
    secret: hrxStepUpSecret,
    totpSecret: hrxStepUpTotpSecret,
    externalProviderOnly: Boolean(resolvedStaffOidcProvider),
  });
  if (persistenceAuthorityState.authority === LAWOS_PERSISTENCE_AUTHORITIES.postgresV2) {
    try {
      const postgresPool = persistenceAuthorityState.pool;
      if (!postgresPool || typeof postgresPool.connect !== "function") {
        throw runtimePreflightError("postgres-v2 authority connector must expose transaction-capable pool");
      }
      const identityRepository = createPostgresIdentityLedger({ pool: postgresPool });
      const domainLedger = createPostgresDomainLedger({
        pool: postgresPool,
      });
      const resolvedSessionObjectAclResolver =
        sessionObjectAclResolver === undefined
          ? createPostgresSessionObjectAclResolver({
              ledger: domainLedger,
            })
          : sessionObjectAclResolver;
      const configuredIdentityTenantId = String(
        resolvedPersistenceAuthorityEnv.LAWOS_IDENTITY_TENANT_ID ?? "",
      ).trim() || null;
      const resolvedSessionAuth = sessionAuth ?? createApiSessionAuth({
        profile: resolvedRuntimeProfile,
        secret: resolvedSessionSecret,
        trustedTenantId: configuredIdentityTenantId ?? undefined,
        passwordResetEmailDelivery,
        stepUpAuthority: resolvedStepUpAuthority,
        staffOidcProvider: resolvedStaffOidcProvider,
        officeSsoProvider: m365GraphConfig?.office_sso_provider ?? null,
        identityRepository,
        objectAclResolver: resolvedSessionObjectAclResolver,
      });
      const sessionAuthorityTenantId = String(
        sessionAuth == null ? "" : resolvedSessionAuth.trusted_tenant_id ?? "",
      ).trim() || null;
      if (configuredIdentityTenantId && sessionAuthorityTenantId
          && configuredIdentityTenantId !== sessionAuthorityTenantId) {
        throw runtimePreflightError(
          "LAWOS_IDENTITY_TENANT_ID must match sessionAuth.trusted_tenant_id",
        );
      }
      const startupAuthorityTenantId = configuredIdentityTenantId
        ?? sessionAuthorityTenantId;
      if (!startupAuthorityTenantId) {
        throw runtimePreflightError(
          "postgres-v2 startup requires LAWOS_IDENTITY_TENANT_ID or sessionAuth.trusted_tenant_id",
        );
      }
      await assertTenantPinnedExternalRuntime({
        tenantLedger: createPostgresTenantProvisioningLedger({ pool: postgresPool }),
        identityTenantId: startupAuthorityTenantId,
        databaseTenantId: String(resolvedPersistenceAuthorityEnv.LAWOS_DATABASE_TENANT_ID ?? "").trim() || null,
        deploymentMode: String(resolvedPersistenceAuthorityEnv.LAWOS_TENANT_DEPLOYMENT_MODE ?? "").trim() || null,
        staffAuthAuthority: resolvedStaffAuthAuthority,
        staffOidcProvider: resolvedStaffOidcProvider,
      });
      let engagementLegacyReadiness;
      try {
        engagementLegacyReadiness = await inspectPostgresEngagementLegacyIdempotency({
          ledger: domainLedger,
          tenant_id: startupAuthorityTenantId,
        });
      } catch {
        const error = runtimePreflightError(
          "Intake engagement legacy idempotency inventory scan failed",
        );
        error.safe_error_code = "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_INVENTORY_SCAN_FAILED";
        throw error;
      }
      if (!engagementLegacyReadiness.ready) {
        const error = runtimePreflightError(
          "Intake engagement legacy idempotency inventory requires manual review",
        );
        error.safe_error_code = "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_INVENTORY_NONZERO";
        error.readiness_receipt = engagementLegacyReadiness;
        throw error;
      }
      const resolvedDmsStorage = dmsStorage ?? createPostgresDmsStorageFromEnv(resolvedPersistenceAuthorityEnv);
      const dmsConsumerReadAuthority = createPostgresDmsConsumerReadAuthority({
        pool: postgresPool,
      });
      await dmsConsumerReadAuthority.probe({
        tenant_id: startupAuthorityTenantId,
        adapter_id: resolvedDmsStorage.adapter_id,
      });
      const dmsConsumerStorage = createPostgresDmsConsumerStorage({
        storage: resolvedDmsStorage,
        authority: dmsConsumerReadAuthority,
      });
      const resolvedPayrollArtifactSecret = await resolvePayrollArtifactSecret({
        env: resolvedPersistenceAuthorityEnv,
        explicitSecret: payrollArtifactSecret,
        secretsClient: payrollSecretsClient,
        resolveSecret: payrollResolveArtifactSecret,
      });
      const activeDmsUploadRuntime = createPostgresDmsUploadRuntime({
        pool: postgresPool,
        storage: resolvedDmsStorage,
        committedStorage: dmsConsumerStorage,
        completionDenyAuthority: dmsConsumerReadAuthority,
        sourceOnly: false,
        verifyPermanentDeleteApproval: dmsVerifyPermanentDeleteApproval,
      });
      const hrxRelationalProjectionReader =
        hrxRelationalProjectionMappingManifest == null
          ? null
          : createHrxRelationalProjectionReader({
              pool: postgresPool,
              mappingManifest:
                hrxRelationalProjectionMappingManifest,
              validationResultSha256:
                hrxRelationalProjectionValidationResultSha256,
            });
      const requestRuntimeAuthority = createPostgresApiRuntimeAuthority({
        ledger: domainLedger,
        dmsStorage: dmsConsumerStorage,
        payrollArtifactStorage: resolvedDmsStorage,
        inquiryEvidenceStorage: resolvedDmsStorage,
        dmsUploadRuntime: activeDmsUploadRuntime,
        payrollArtifactSecret: resolvedPayrollArtifactSecret,
        payrollProviders,
        leaveIntegrationProviders,
        leaveIntegrationProviderEnabled,
        peopleFeatureFlags: resolvedPeopleFeatureFlags,
        peopleMetricsSink,
        peopleProviderIdentities,
        peopleProviderIdentityRepository,
        outlookTokenVault,
        outlookConsentService,
        outlookConsentRepository,
        outlookCalendarCache,
        peopleOutlookConnections,
        peopleOutlookCalendarSource,
        peopleOutlookRuntimeFactory,
        outlookCalendarViewAdapter,
        outlookConsentRefresh,
        outlookSubjectAddressResolver,
        outlookStateAuthority,
        outlookOauthPort,
        offboardingAccessSource,
        hrxRelationalProjectionReader,
        bankImportPreviewTokens: resolvedBankImportPreviewTokens,
        clientFixedReportTokenAuthority:
          resolvedClientFixedReportTokens,
        clientOperationsV2Enabled:
          resolvedClientOperationsV2Enabled,
        clientOperationsSchemaPool: postgresPool,
        precedentSearchPool: postgresPool,
        precedentAuthoritySecret: resolvedSessionSecret,
        identityRepository,
        requireDmsConsumerReadAuthority: true,
      });
      const outlookConversationRuntime =
        m365GraphConfig?.provider_runtime_enabled === true
          ? await outlookConversationRuntimeFactory({
              pool: postgresPool,
              domain_ledger: domainLedger,
              tenant_id: startupAuthorityTenantId,
              entra_tenant_id: m365GraphConfig.entra_tenant_id,
              notification_url: resolvedPersistenceAuthorityEnv.LAWOS_GRAPH_NOTIFICATION_URL,
              cursor_key_material: resolvedSessionSecret,
              credential_vault: m365GraphConfig.credential_vault,
              conversation_provider: m365GraphConfig.provider,
              request_runtime_authority: requestRuntimeAuthority,
              worker_schedule_enabled:
                resolvedPersistenceAuthorityEnv[
                  LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED_ENV
                ] === "true",
            })
          : null;
      const operationalOutlookDesktopRuntime =
        createPostgresOutlookDesktopOperationalRuntime({
          pool: postgresPool,
          tenant_id: startupAuthorityTenantId,
          entra_tenant_id: m365GraphConfig?.entra_tenant_id ?? null,
          entitlement_roster: resolveOutlookDesktopAutoconnectRoster(
            outlookDesktopAutoconnectRoster
              ?? resolvedPersistenceAuthorityEnv[
                LAWOS_OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_ENV
              ],
          ),
          ...(outlookDesktopEntitlementEnabled
            ? {
                outlookDesktopActivationControlPort,
                outlookDesktopLifecycleControlPort,
              }
            : {}),
        });
      const operationalM365GraphConfig = outlookConversationRuntime
        ? Object.freeze({
            ...m365GraphConfig,
            before_revoke_connection:
              outlookConversationRuntime.before_connection_revoke,
          })
        : m365GraphConfig;
      const resolvedDocusignRuntime = docusignRuntime ?? createDocusignFailClosedRuntime({
        repository: createPostgresDocusignEnvelopeRepository({ pool: postgresPool }),
      });
      const server = createApiServer({
        hrxRuntime: null,
        masterDataRuntime: null,
        matterRuntime: null,
        dmsRuntime: null,
        emailDmsRuntime: null,
        docusignRuntime: resolvedDocusignRuntime,
        crmIntakeRuntime: null,
        financeRuntime: null,
        analyticsRuntime: null,
        aiRuntime: null,
        portalRuntime: null,
        uiReadinessRuntime: null,
        homeDashboardRuntime: null,
        enterpriseReadinessRuntime: null,
        m365GraphConfig: operationalM365GraphConfig,
        outlookGraphWebhook: outlookGraphWebhook ?? outlookConversationRuntime?.webhook,
        outlookConversationRuntime,
        outlookGraphSyncReadiness: outlookConversationRuntime?.readiness ?? null,
        outlookDesktopRuntime: operationalOutlookDesktopRuntime,
        stepUpAuthority: resolvedStepUpAuthority,
        sessionAuth: resolvedSessionAuth,
        timelineCursorAuthority: resolvedTimelineCursorAuthority,
        outlookAttachmentReceiptAuthority: resolvedOutlookAttachmentReceiptAuthority,
        requestRuntimeAuthority,
        runtimeProfile: resolvedRuntimeProfile,
        persistenceAuthority: persistenceAuthorityState.authority,
        dataScope: resolvedPersistenceAuthorityEnv.LAWOS_DATA_SCOPE ?? process.env.LAWOS_DATA_SCOPE ?? null,
        payrollStatementProviderVerifier,
        payrollStatementProviderAudit,
        leaveProviderVerifier,
      });
      server.once("close", () => {
        void persistenceAuthorityState.close?.();
      });
      return await new Promise((resolve, reject) => {
        server.once("error", async (error) => {
          await persistenceAuthorityState.close?.();
          reject(error);
        });
        server.listen(port, HOST, () => {
          resolve({
            server,
            port: server.address().port,
            host: HOST,
            sessionAuth: resolvedSessionAuth,
            persistence_authority: requestRuntimeAuthority.capabilities,
            requestRuntimeAuthority,
            outlookConversationRuntime,
          });
        });
      });
    } catch (error) {
      await persistenceAuthorityState.close?.();
      throw error;
    }
  }
  const storePreflight = assertStorePathPreflight({
    profile: resolvedRuntimeProfile,
    providedStorePaths: startupStorePathOptions({
      hrxStorePath,
      masterDataStorePath,
      matterStorePath,
      dmsStorePath,
      dmsObjectStorePath,
      crmStorePath,
      intakeStorePath,
      crmMasterDataStorePath,
      financeStorePath,
      analyticsStorePath,
      aiStorePath,
      portalStorePath,
      uiReadinessStorePath,
      enterpriseReadinessStorePath,
      securityAuditStorePath,
      authCredentialStorePath,
      authPasswordResetStorePath,
      objectAclStorePath,
    }),
  });
  const resolvedStorePaths = storePreflight.storePaths;
  let hrxRuntimeUnavailable = null;
  let runtime = hrxRuntime;
  if (!runtime) {
    try {
      runtime = createDefaultHrxRuntime({
        store: hrxStore,
        storePath: hrxStorePath ?? resolvedStorePaths.hrxStorePath,
        runtimeProfile: resolvedRuntimeProfile,
        env: resolvedPersistenceAuthorityEnv,
        peopleFeatureFlags: resolvedPeopleFeatureFlags,
        peopleMetricsSink,
        peopleProviderIdentities,
        peopleProviderIdentityRepository,
        outlookTokenVault,
        outlookConsentService,
        outlookConsentRepository,
        outlookCalendarCache,
        peopleOutlookConnections,
        peopleOutlookCalendarSource,
        outlookCalendarViewAdapter,
        outlookConsentRefresh,
        outlookSubjectAddressResolver,
        outlookStateAuthority,
        outlookOauthPort,
        offboardingAccessSource,
        payrollArtifactStorage: dmsStorage,
        payrollArtifactSecret,
        compensationKeyMaterial: payrollArtifactSecret,
        payrollProviders,
        leaveIntegrationProviders,
        leaveIntegrationProviderEnabled,
      });
    } catch (error) {
      if (resolvedRuntimeProfile !== LAWOS_RUNTIME_PROFILES.operational) throw error;
      hrxRuntimeUnavailable = {
        reason: "hrx_runtime_unavailable",
        error_name: error?.name ?? "Error",
        error_code: error?.code ?? null,
      };
      runtime = null;
    }
  }
  const masterRuntime =
    masterDataRuntime ??
    createDefaultMasterDataRuntime({
      repository: masterDataRepository,
      storePath: masterDataStorePath ?? resolvedStorePaths.masterDataStorePath,
    });
  const dmsRuntimeContext =
    dmsRuntime ??
    createDefaultDmsRuntime({
      repository: dmsRepository,
      storePath: dmsStorePath ?? resolvedStorePaths.dmsStorePath,
      storageRootPath: dmsObjectStorePath ?? resolvedStorePaths.dmsObjectStorePath,
    });
  const resolvedDmsMetadataStorePath =
    dmsStorePath ?? resolvedStorePaths.dmsStorePath;
  const resolvedEmailDmsStorePath = resolvedDmsMetadataStorePath
    ? join(dirname(resolvedDmsMetadataStorePath), "email-dms-store.json")
    : undefined;
  const emailDmsRuntimeContext =
    emailDmsRuntime
    ?? createDefaultEmailDmsRuntime({
      repository: emailDmsRepository,
      storePath: resolvedEmailDmsStorePath,
      dmsRuntime: dmsRuntimeContext,
    });
  const resolvedMatterRepository =
    matterRuntime?.repository ??
    matterRepository ??
    createMatterRepository({
      filePath: matterStorePath ?? resolvedStorePaths.matterStorePath ?? createEphemeralMatterStorePath(),
      seedRecords: MATTER_RUNTIME_SEED.records,
    });
  const crmIntakeRuntime =
    providedCrmIntakeRuntime ??
    createDefaultCrmIntakeRuntime({
      crmRepository,
      intakeRepository,
      crmMasterDataRepository:
        crmMasterDataRepository
        ?? masterRuntime?.repository,
      crmStorePath: crmStorePath ?? resolvedStorePaths.crmStorePath,
      intakeStorePath: intakeStorePath ?? resolvedStorePaths.intakeStorePath,
      crmMasterDataStorePath: crmMasterDataStorePath ?? resolvedStorePaths.crmMasterDataStorePath,
      matterRepository: resolvedMatterRepository,
      dmsRuntime: dmsRuntimeContext,
      emailDmsRepository: emailDmsRuntimeContext.repository,
    });
  const matterRuntimeContext =
    matterRuntime ??
    createDefaultMatterRuntime({
      repository: resolvedMatterRepository,
      dmsRuntime: dmsRuntimeContext,
      hrxRuntime: runtime,
      clearanceRepository: crmIntakeRuntime.intakeRepository,
    });
  let financeRuntimeUnavailable = null;
  let financeRuntimeContext = financeRuntime
    ? Object.freeze({
        ...financeRuntime,
        bankImportPreviewTokens: resolvedBankImportPreviewTokens,
      })
    : null;
  if (!financeRuntimeContext) {
    try {
      financeRuntimeContext = createDefaultFinanceRuntime({
        repository: financeRepository,
        masterDataRepository: masterRuntime?.repository ?? null,
        crmRepository: crmIntakeRuntime?.crmRepository ?? null,
        matterRepository: resolvedMatterRepository,
        bankImportPreviewTokens: resolvedBankImportPreviewTokens,
        storePath: financeStorePath ?? resolvedStorePaths.financeStorePath,
      });
    } catch (error) {
      if (resolvedRuntimeProfile !== LAWOS_RUNTIME_PROFILES.operational) throw error;
      financeRuntimeUnavailable = {
        reason: "finance_runtime_unavailable",
        error_name: error?.name ?? "Error",
        error_code: error?.code ?? null,
      };
      financeRuntimeContext = null;
    }
  }
  const baseAnalyticsRuntimeContext =
    analyticsRuntime ??
    createDefaultAnalyticsRuntime({
      repository: analyticsRepository,
      storePath: analyticsStorePath ?? resolvedStorePaths.analyticsStorePath,
      financeRepository: analyticsFinanceRepository ?? financeRuntimeContext?.repository ?? null,
      masterDataRepository: masterRuntime?.repository ?? null,
      crmRepository: crmIntakeRuntime?.crmRepository ?? null,
      matterRepository: matterRuntimeContext?.repository ?? null,
    });
  const analyticsRuntimeContext = Object.freeze({
    ...baseAnalyticsRuntimeContext,
    clientFixedReportTokenAuthority:
      baseAnalyticsRuntimeContext
        ?.clientFixedReportTokenAuthority
      ?? resolvedClientFixedReportTokens,
  });
  const aiRuntimeContext =
    aiRuntime ??
    createDefaultAiRuntime({ repository: aiRepository, storePath: aiStorePath ?? resolvedStorePaths.aiStorePath });
  const portalRuntimeContext =
    portalRuntime ??
    createDefaultPortalRuntime({
      repository: portalRepository,
      storePath: portalStorePath ?? resolvedStorePaths.portalStorePath,
    });
  const uiReadinessRuntimeContext =
    uiReadinessRuntime ??
    createDefaultUiReadinessRuntime({
      repository: uiReadinessRepository,
      storePath: uiReadinessStorePath ?? resolvedStorePaths.uiReadinessStorePath,
    });
  const homeDashboardRuntimeContext = homeDashboardRuntime ?? createDefaultHomeDashboardRuntime({
    operationalRepository: analyticsRuntimeContext?.repository,
    sourceCollectors: createHomeDashboardSourceCollectors({
      hrxRuntime: runtime,
      matterRuntime: matterRuntimeContext,
      dmsRuntime: dmsRuntimeContext,
      aiRuntime: aiRuntimeContext,
    }),
  });
  const enterpriseReadinessRuntimeContext =
    enterpriseReadinessRuntime ??
    createDefaultEnterpriseReadinessRuntime({
      repository: enterpriseReadinessRepository,
      storePath: enterpriseReadinessStorePath ?? resolvedStorePaths.enterpriseReadinessStorePath,
    });
  const resolvedSessionObjectAclResolver =
    sessionObjectAclResolver === undefined
      ? createFileSessionObjectAclResolver({
          storePath:
            objectAclStorePath
            ?? resolvedStorePaths.objectAclStorePath
            ?? createEphemeralObjectAclStorePath(),
        })
      : sessionObjectAclResolver;
  const resolvedSessionAuth = sessionAuth ?? createApiSessionAuth({
    profile: resolvedRuntimeProfile,
    secret: resolvedSessionSecret,
    securityAuditStorePath: securityAuditStorePath ?? resolvedStorePaths.securityAuditStorePath,
    credentialStorePath: authCredentialStorePath ?? resolvedStorePaths.authCredentialStorePath,
    passwordResetTokenStorePath: authPasswordResetStorePath ?? resolvedStorePaths.authPasswordResetStorePath,
    passwordResetEmailDelivery,
    stepUpAuthority: resolvedStepUpAuthority,
    objectAclResolver: resolvedSessionObjectAclResolver,
  });
  const server = createApiServer({
    hrxRuntime: runtime,
    masterDataRuntime: masterRuntime,
    matterRuntime: matterRuntimeContext,
    dmsRuntime: dmsRuntimeContext,
    emailDmsRuntime: emailDmsRuntimeContext,
    docusignRuntime,
    crmIntakeRuntime,
    financeRuntime: financeRuntimeContext,
    financeRuntimeUnavailable,
    analyticsRuntime: analyticsRuntimeContext,
    aiRuntime: aiRuntimeContext,
    portalRuntime: portalRuntimeContext,
    uiReadinessRuntime: uiReadinessRuntimeContext,
    homeDashboardRuntime: homeDashboardRuntimeContext,
    enterpriseReadinessRuntime: enterpriseReadinessRuntimeContext,
    m365GraphConfig,
    outlookGraphWebhook,
    outlookGraphSyncReadiness: null,
    outlookDesktopRuntime: null,
    stepUpAuthority: resolvedStepUpAuthority,
    sessionAuth: resolvedSessionAuth,
    timelineCursorAuthority: resolvedTimelineCursorAuthority,
    outlookAttachmentReceiptAuthority: resolvedOutlookAttachmentReceiptAuthority,
    runtimeProfile: resolvedRuntimeProfile,
    persistenceAuthority: persistenceAuthorityState.authority,
    hrxRuntimeUnavailable,
    payrollStatementProviderVerifier,
    payrollStatementProviderAudit,
    leaveProviderVerifier,
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      resolve({
        server,
        port: server.address().port,
        host: HOST,
        sessionAuth: resolvedSessionAuth,
        analyticsRuntime: analyticsRuntimeContext,
      });
    });
  });
}

export async function startApiServer(options = {}) {
  return startApiServerImplementation(prepareApiStartupOptions(options));
}

let cliApiServer = null;
let cliKeepAlive = null;

export function startCliApiServer(options = {}) {
  const cliOptions = snapshotStartupOptions(options, "CLI API startup options");
  const startupOptions = snapshotStartupOptions(
    cliOptions.startupOptions ?? {},
    "CLI API server startup options",
  );
  const {
    payrollStatementProviderVerifier,
    leaveProviderVerifier,
    startApiServerFn = startApiServer,
  } = cliOptions;
  return startApiServerFn(frozenNullPrototypeCopy(
    startupOptions,
    payrollStatementProviderVerifier === undefined
      ? {}
      : { payrollStatementProviderVerifier },
    leaveProviderVerifier === undefined ? {} : { leaveProviderVerifier },
  ));
}

function stopCliServer(signal) {
  if (cliKeepAlive) {
    clearInterval(cliKeepAlive);
    cliKeepAlive = null;
  }
  if (!cliApiServer) {
    process.exit(signal ? 0 : process.exitCode ?? 0);
  }
  cliApiServer.close(() => {
    process.exit(signal ? 0 : process.exitCode ?? 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const useDurableLocalDefaults = shouldUseDurableLocalDefaults();
  const cliStartupOptions = useDurableLocalDefaults
    ? {
        runtimeProfile: LAWOS_RUNTIME_PROFILES.localDev,
        sessionSecret: readOrCreateLocalSessionSecret(),
        ...lawosDurableStorePathOptions({ root: ensureLawosDurableStoreHome() }),
      }
    : {};
  Promise.resolve()
    .then(() => startCliApiServer({ startupOptions: cliStartupOptions }))
    .then(({ server, port }) => {
      cliApiServer = server;
      cliKeepAlive = setInterval(() => {}, 2_147_483_647);
      server.once("close", () => {
        if (cliKeepAlive) {
          clearInterval(cliKeepAlive);
          cliKeepAlive = null;
        }
      });
      console.log(`law-firm-os api listening on http://${HOST}:${port}`);
      console.log(`health: http://${HOST}:${port}/api/health`);
      if (useDurableLocalDefaults) {
        console.log("runtime stores: ~/Library/Application Support/LawFirmOS/runtime-stores");
      }
    })
    .catch((error) => {
      console.error(`api startup failed: ${error?.message ?? String(error)}`);
      process.exit(error?.exitCode ?? 1);
    });
  process.once("SIGINT", () => stopCliServer("SIGINT"));
  process.once("SIGTERM", () => stopCliServer("SIGTERM"));
}
