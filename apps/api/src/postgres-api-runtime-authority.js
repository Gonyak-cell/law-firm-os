import {
  HRX_DOMAIN_ID,
  assertHrxPostgresAuthorityReady,
  createHrxOperationalDomainSnapshot,
  getHrxMaterializedBaseline,
  materializeHrxStoreFromPostgres,
  materializeHrxStoreWithProjection,
} from "../../../packages/hrx/src/postgres-store-v2.js";
import { createHrxRuntimeContext } from "./hrx-runtime-context.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../../../packages/master-data/src/central-ledger.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../packages/matter/src/central-ledger.js";
import {
  DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
  createDmsAuxiliaryRepository,
} from "../../../packages/dms/src/central-ledger.js";
import {
  EMAIL_DMS_DOMAIN_DESCRIPTOR,
} from "../../../packages/email-dms/src/central-ledger.js";
import {
  createEmailDmsRepository,
} from "../../../packages/email-dms/src/repository.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { FINANCE_DOMAIN_DESCRIPTOR } from "../../../packages/billing/src/central-ledger.js";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { ANALYTICS_DOMAIN_DESCRIPTOR } from "../../../packages/analytics/src/central-ledger.js";
import { createAiGovernanceRepository } from "../../../packages/ai-governance/src/runtime-repository.js";
import { AI_GOVERNANCE_DOMAIN_DESCRIPTOR } from "../../../packages/ai-governance/src/central-ledger.js";
import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { PORTAL_DOMAIN_DESCRIPTOR } from "../../../packages/client-portal/src/central-ledger.js";
import { createUiReadinessRepository } from "../../../packages/platform/src/ui-readiness-repository.js";
import { UI_READINESS_DOMAIN_DESCRIPTOR } from "../../../packages/platform/src/ui-readiness-central-ledger.js";
import { createEnterpriseReadinessRepository } from "../../../packages/enterprise/src/enterprise-readiness-repository.js";
import { ENTERPRISE_READINESS_DOMAIN_DESCRIPTOR } from "../../../packages/enterprise/src/central-ledger.js";
import {
  compareDomainSnapshotWithLedgerReadback,
  flushDomainSnapshotToScopedLedger,
  materializeRecordRepositoryFromDomainLedger,
  runRecordRepositoryMultiDomainCommand,
} from "../../../packages/persistence/src/record-domain-adapter.js";
import { createMasterDataRuntimeContext } from "./master-data-context.js";
import { createMatterRuntimeContext } from "./matter-runtime-context.js";
import { createVaultDmsRuntimeContext } from "./vault-dms-runtime-context.js";
import { createCrmIntakeRuntimeContext } from "./crm-intake-runtime-context.js";
import { createFinanceRuntimeContext } from "./finance-runtime-context.js";
import { createAnalyticsRuntimeContext } from "./analytics-runtime-context.js";
import { createAiRuntimeContext } from "./ai-runtime-context.js";
import { createPortalRuntimeContext } from "./portal-runtime-context.js";
import { createUiReadinessRuntimeContext } from "./ui-readiness-context.js";
import {
  createDefaultHomeDashboardRuntime,
  createHomeDashboardSourceCollectors,
} from "./home-dashboard-runtime-context.js";
import { createEnterpriseReadinessRuntimeContext } from "./enterprise-readiness-context.js";
import { LAWOS_OFFLINE_REJECTED_POLICY } from "./persistence-authority.js";
import {
  selectClientOperationsReadPath,
} from "./client-operations-migration.js";
import {
  createClientOperationsPostgresReadProvider,
} from "./client-operations-read-providers.js";
import { createPostgresPayrollReconciliationCheckpoint } from "./hrx-payroll-reconciliation-checkpoint.js";
import {
  createPostgresEmailDmsCompletionCheckpoint,
  createPostgresPeopleOutlookCompletionCheckpoint,
} from "./people-outlook-completion-checkpoint.js";
import {
  createPostgresPrecedentRepository,
  derivePrecedentAuthorityKeys,
} from "../../../packages/dms/src/search/postgres-precedent-repository.js";

const PRODUCT_DOMAINS = Object.freeze([
  Object.freeze({ key: "masterDataRepository", descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR, create_repository: createMasterDataRepository }),
  Object.freeze({ key: "matterRepository", descriptor: MATTER_DOMAIN_DESCRIPTOR, create_repository: createMatterRepository }),
  Object.freeze({ key: "dmsRepository", descriptor: DMS_AUXILIARY_DOMAIN_DESCRIPTOR, create_repository: createDmsAuxiliaryRepository }),
  Object.freeze({ key: "emailDmsRepository", descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR, create_repository: createEmailDmsRepository }),
  Object.freeze({ key: "crmRepository", descriptor: CRM_DOMAIN_DESCRIPTOR, create_repository: createCrmRuntimeRepository }),
  Object.freeze({ key: "intakeRepository", descriptor: INTAKE_DOMAIN_DESCRIPTOR, create_repository: createIntakeRuntimeRepository }),
  Object.freeze({ key: "financeRepository", descriptor: FINANCE_DOMAIN_DESCRIPTOR, create_repository: createFinanceRepository }),
  Object.freeze({ key: "analyticsRepository", descriptor: ANALYTICS_DOMAIN_DESCRIPTOR, create_repository: createAnalyticsRepository }),
  Object.freeze({ key: "aiRepository", descriptor: AI_GOVERNANCE_DOMAIN_DESCRIPTOR, create_repository: createAiGovernanceRepository }),
  Object.freeze({ key: "portalRepository", descriptor: PORTAL_DOMAIN_DESCRIPTOR, create_repository: createClientPortalRepository }),
  Object.freeze({ key: "uiReadinessRepository", descriptor: UI_READINESS_DOMAIN_DESCRIPTOR, create_repository: createUiReadinessRepository }),
  Object.freeze({ key: "enterpriseReadinessRepository", descriptor: ENTERPRISE_READINESS_DOMAIN_DESCRIPTOR, create_repository: createEnterpriseReadinessRepository }),
]);
const POSTGRES_READ_RETRY_LIMIT = 5;
const PEOPLE_OUTLOOK_SELF_COMPLETION_PATH =
  "/api/hrx/people/me/outlook-connection/complete";
const CLIENT_OUTLOOK_HTTPS_CALLBACK_PATH =
  "/api/outlook/connection/callback";
const POSTGRES_READ_RETRYABLE_CONFLICTS = new Set([
  "DOMAIN_BASELINE_CONFLICT",
  "DOMAIN_SHADOW_DIFFERENCE",
  "HRX_POSTGRES_BASELINE_CONFLICT",
  "REPOSITORY_VERSION_CONFLICT",
  "POSTGRES_UNIQUE_CONFLICT",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function createIdentityUserDirectorySnapshot(users = []) {
  const rows = Object.freeze((Array.isArray(users) ? users : []).map((user) => {
    const membershipActive = user.tenant_memberships?.some((membership) => (
      membership?.tenant_id === user.tenant_id
        && membership?.status === "active"
    ));
    const status = user.status === "active" && membershipActive ? "active" : "inactive";
    return Object.freeze({
      tenant_id: user.tenant_id,
      user_id: user.user_id,
      display_name: user.display_name ?? null,
      email: user.email ?? null,
      source_title: user.source_title ?? null,
      status,
      login_allowed: status === "active"
        && (!user.credential_status || ["active", "must_change"].includes(user.credential_status))
        && user.profile?.login_allowed !== false,
      source_ref: "postgres-v2-identity-ledger",
    });
  }));
  return Object.freeze({
    listUsers({ tenant_id, user_id } = {}) {
      return Object.freeze(rows.filter((user) => (
        (!tenant_id || user.tenant_id === tenant_id)
        && (!user_id || user.user_id === user_id)
      )));
    },
  });
}

function isPayrollReconciliationMutation(method, pathname) {
  return String(method ?? "").toUpperCase() === "POST"
    && /^\/api\/hrx\/payroll\/payment-batches\/[^/]+\/(?:reconcile|retry-failed)$/u
      .test(String(pathname ?? ""));
}

function isPeopleOutlookSelfCompletion(method, pathname) {
  return String(method ?? "").toUpperCase() === "POST"
    && String(pathname ?? "") === PEOPLE_OUTLOOK_SELF_COMPLETION_PATH;
}

function isPeopleOutlookDisconnect(method, pathname) {
  return String(method ?? "").toUpperCase() === "DELETE"
    && /^\/api\/hrx\/people\/members\/[^/]+\/outlook-connection\/?$/u
      .test(String(pathname ?? ""));
}

const OUTLOOK_IDEMPOTENT_MUTATION_PATHS = new Set([
  "/api/outlook/email/file",
  "/api/outlook/sent/file",
  "/api/outlook/attachments/save",
  "/api/outlook/followups",
]);

function isOutlookIdempotentMutation(method, pathname) {
  return String(method ?? "").toUpperCase() === "POST"
    && OUTLOOK_IDEMPOTENT_MUTATION_PATHS.has(
      String(pathname ?? "").replace(/\/+$/u, "") || "/",
    );
}

export function isRetryablePostgresReadConflict(error, method, {
  allowIdempotentWriteRetry = false,
  pathname = "",
} = {}) {
  if (error?.request_compensation_failed === true) return false;
  const normalizedMethod = String(method ?? "").toUpperCase();
  if (
    normalizedMethod === "GET"
    && (String(pathname ?? "").replace(/\/+$/u, "") || "/")
      === CLIENT_OUTLOOK_HTTPS_CALLBACK_PATH
  ) return false;
  return (["GET", "HEAD"].includes(normalizedMethod)
      || (
        allowIdempotentWriteRetry
        && ["POST", "DELETE"].includes(normalizedMethod)
      ))
    && POSTGRES_READ_RETRYABLE_CONFLICTS.has(error?.safe_error_code);
}

export async function runWithRequestFailureCompensation(execute) {
  if (typeof execute !== "function") {
    throw new TypeError("PostgreSQL request callback is required");
  }
  const compensations = [];
  const postCommitActions = [];
  let sealed = false;
  const requestFailureCompensator = Object.freeze({
    register(compensation) {
      if (sealed || typeof compensation !== "function") {
        throw new TypeError("PostgreSQL request compensation is invalid");
      }
      compensations.push(compensation);
    },
    registerPostCommit(action) {
      if (sealed || typeof action !== "function") {
        throw new TypeError("PostgreSQL post-commit action is invalid");
      }
      postCommitActions.push(action);
    },
  });
  try {
    const result = await execute(requestFailureCompensator);
    sealed = true;
    for (const action of postCommitActions) {
      try {
        await action();
      } catch {
        // The durable cleanup marker is retried by the next Microsoft request.
      }
    }
    return result;
  } catch (error) {
    sealed = true;
    for (const compensation of compensations.reverse()) {
      try {
        await compensation();
      } catch {
        if (error && typeof error === "object") {
          error.request_compensation_failed = true;
        }
      }
    }
    throw error;
  }
}

export async function runPostgresReadWithBaselineRetry({
  method,
  pathname = "",
  execute,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  retryLimit = POSTGRES_READ_RETRY_LIMIT,
  allowIdempotentWriteRetry = false,
} = {}) {
  if (typeof execute !== "function" || typeof wait !== "function") {
    throw new TypeError("PostgreSQL request execution and wait callbacks are required");
  }
  if (!Number.isInteger(retryLimit) || retryLimit < 0 || retryLimit > POSTGRES_READ_RETRY_LIMIT) {
    throw new TypeError(`PostgreSQL read retry limit must be between zero and ${POSTGRES_READ_RETRY_LIMIT}`);
  }
  if (typeof allowIdempotentWriteRetry !== "boolean") {
    throw new TypeError("allowIdempotentWriteRetry must be a boolean");
  }
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await execute({ attempt: attempt + 1 });
    } catch (error) {
      if (!isRetryablePostgresReadConflict(error, method, {
        allowIdempotentWriteRetry,
        pathname,
      }) || attempt >= retryLimit) throw error;
      await wait(5 * (2 ** attempt));
    }
  }
}

export function createPostgresPrecedentSearchRuntime({ pool, authoritySecret } = {}) {
  if (!pool?.connect || !pool?.query) throw new TypeError("Precedent search requires a PostgreSQL pool");
  if (!(typeof authoritySecret === "string" || Buffer.isBuffer(authoritySecret))
      || Buffer.byteLength(authoritySecret) < 32) {
    throw new TypeError("Precedent search requires server-held authority secret material");
  }
  const keys = derivePrecedentAuthorityKeys(authoritySecret);
  return Object.freeze({ authority: "postgres-v2",
    repository: createPostgresPrecedentRepository({ pool,
      cursorSecret: keys.cursor, extractionReceiptSecret: keys.extraction_receipt }),
    production_ready_claim: false });
}

function createHrxDomainParticipant(requestContext, projectionReader) {
  const projectionRead =
    ["GET", "HEAD"].includes(
      String(requestContext?.method ?? "").toUpperCase(),
    ) && projectionReader != null;
  return Object.freeze({
    key: "hrxStore",
    domain_id: HRX_DOMAIN_ID,
    async materialize({ ledger, tenant_id }) {
      const store = projectionRead
        ? await materializeHrxStoreWithProjection({
            ledger,
            tenant_id,
            projectionReader,
          })
        : await materializeHrxStoreFromPostgres({ ledger, tenant_id });
      try {
        assertHrxPostgresAuthorityReady({ store, tenant_id });
        return store;
      } catch (error) {
        store.close();
        throw error;
      }
    },
    create_snapshot({ value, tenant_id }) {
      return createHrxOperationalDomainSnapshot({
        store: value,
        tenant_id,
        request_context: requestContext,
      });
    },
    get_baseline({ value }) {
      return getHrxMaterializedBaseline(value);
    },
    flush(input) {
      return flushDomainSnapshotToScopedLedger(input);
    },
    compare(input) {
      return compareDomainSnapshotWithLedgerReadback(input);
    },
    close({ value }) {
      value.close();
    },
  });
}

function createRequestRuntimes({
  repositories,
  hrxStore,
  identityUserDirectory,
  dmsStorage,
  dmsUploadRuntime,
  payrollArtifactSecret,
  payrollProviders,
  bankImportPreviewTokens,
  clientFixedReportTokenAuthority,
  clientOperationsReadPathSelector,
  clientOperationsV2ReadProvider,
  precedentSearchRuntime,
  bankReconciliationCheckpoint,
  peopleOutlookCompletionCheckpoint,
  clientOutlookCompletionCheckpoint,
  requestFailureCompensator,
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled,
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
} = {}) {
  const operationalPeopleOutlook =
    typeof peopleOutlookRuntimeFactory === "function"
      ? peopleOutlookRuntimeFactory({
          repository: repositories.emailDmsRepository,
          completion_checkpoint: peopleOutlookCompletionCheckpoint,
          require_durable_completion: true,
        })
      : null;
  const hrxRuntime = createHrxRuntimeContext({
    store: hrxStore,
    payrollArtifactStorage: dmsStorage,
    payrollArtifactSecret,
    compensationKeyMaterial: payrollArtifactSecret,
    leaveIntegrationProviders,
    leaveIntegrationProviderEnabled,
    allowSyntheticLeaveIntegrationProviders: false,
    allowSyntheticPayrollArtifactSecret: false,
    allowSyntheticCompensationKey: false,
    allowSyntheticPayrollProviders: false,
    payrollProviders: Object.freeze({
      ...payrollProviders,
      bankReconciliationCheckpoint,
      allowSyntheticArtifactSecret: false,
      allowSyntheticCompensationKey: false,
      allowSyntheticProviders: false,
    }),
    peopleFeatureFlags,
    peopleMetricsSink,
    peopleProviderIdentities,
    peopleProviderIdentityRepository,
    outlookTokenVault,
    outlookConsentService,
    outlookConsentRepository,
    outlookCalendarCache,
    peopleOutlookConnections:
      peopleOutlookConnections ?? operationalPeopleOutlook?.connections,
    peopleOutlookCalendarSource:
      peopleOutlookCalendarSource ?? operationalPeopleOutlook?.calendarSource,
    outlookCalendarViewAdapter,
    outlookConsentRefresh,
    outlookSubjectAddressResolver,
    outlookStateAuthority,
    outlookOauthPort,
    offboardingAccessSource,
    allowInMemoryOutlookTokenVault: false,
    seedPayrollRuntime: false,
    seedRuntimeFixtures: false,
  });
  const masterDataRuntime = createMasterDataRuntimeContext({ repository: repositories.masterDataRepository });
  const dmsRuntime = Object.freeze({
    ...createVaultDmsRuntimeContext({
      repository: repositories.dmsRepository,
      storage: dmsStorage,
    }),
    authority: "postgres-v2",
    upload_runtime: dmsUploadRuntime,
    precedent_search_runtime: precedentSearchRuntime,
  });
  const emailDmsRuntime = Object.freeze({
    authority: "postgres-v2",
    repository: repositories.emailDmsRepository,
    storage: dmsStorage,
    upload_runtime: dmsUploadRuntime,
    request_failure_compensator: requestFailureCompensator,
    client_outlook_completion_checkpoint:
      clientOutlookCompletionCheckpoint,
    production_ready_claim: false,
  });
  const crmIntakeRuntime = createCrmIntakeRuntimeContext({
    crmRepository: repositories.crmRepository,
    intakeRepository: repositories.intakeRepository,
    masterDataRepository: repositories.masterDataRepository,
    emailDmsRepository: repositories.emailDmsRepository,
    matterRepository: repositories.matterRepository,
    dmsRuntime,
  });
  const matterRuntime = createMatterRuntimeContext({
    repository: repositories.matterRepository,
    dmsRuntime,
    hrxRuntime,
    ...(identityUserDirectory ? { userDirectory: identityUserDirectory } : {}),
    clearanceRepository: repositories.intakeRepository,
  });
  const financeRuntime = createFinanceRuntimeContext({
    repository: repositories.financeRepository,
    masterDataRepository: repositories.masterDataRepository,
    crmRepository: repositories.crmRepository,
    matterRepository: repositories.matterRepository,
    employeeRepository: hrxRuntime.repository,
    bankImportPreviewTokens,
  });
  const analyticsRuntime = Object.freeze({
    ...createAnalyticsRuntimeContext({
      repository: repositories.analyticsRepository,
      financeRepository: repositories.financeRepository,
      masterDataRepository: repositories.masterDataRepository,
      crmRepository: repositories.crmRepository,
      matterRepository: repositories.matterRepository,
      clientOperationsReadPathSelector,
      clientOperationsV2ReadProvider,
    }),
    clientFixedReportTokenAuthority,
  });
  const aiRuntime = createAiRuntimeContext({ repository: repositories.aiRepository });
  const portalRuntime = createPortalRuntimeContext({ repository: repositories.portalRepository });
  const uiReadinessRuntime = createUiReadinessRuntimeContext({ repository: repositories.uiReadinessRepository });
  const enterpriseReadinessRuntime = createEnterpriseReadinessRuntimeContext({
    repository: repositories.enterpriseReadinessRepository,
  });
  const homeDashboardRuntime = createDefaultHomeDashboardRuntime({
    operationalRepository: repositories.analyticsRepository,
    sourceCollectors: createHomeDashboardSourceCollectors({
      hrxRuntime,
      matterRuntime,
      dmsRuntime,
      aiRuntime,
    }),
  });
  return Object.freeze({
    hrxRuntime,
    masterDataRuntime,
    matterRuntime,
    dmsRuntime,
    emailDmsRuntime,
    crmIntakeRuntime,
    financeRuntime,
    analyticsRuntime,
    aiRuntime,
    portalRuntime,
    uiReadinessRuntime,
    homeDashboardRuntime,
    enterpriseReadinessRuntime,
    precedentSearchRuntime,
  });
}

export function createPostgresApiRuntimeAuthority({
  ledger,
  dmsStorage,
  dmsUploadRuntime,
  payrollArtifactSecret,
  payrollProviders = Object.freeze({}),
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled = Object.freeze({}),
  peopleFeatureFlags = Object.freeze({}),
  peopleMetricsSink = null,
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
  hrxRelationalProjectionReader = null,
  bankImportPreviewTokens,
  clientFixedReportTokenAuthority = null,
  clientOperationsV2Enabled = false,
  clientOperationsSchemaPool = null,
  precedentSearchPool = null,
  precedentAuthoritySecret = null,
  identityRepository = null,
} = {}) {
  if (!ledger || typeof ledger.transactionMany !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required");
  }
  if (!dmsStorage || typeof dmsStorage.stageObject !== "function") {
    throw new TypeError("DMS provider storage is required for PostgreSQL API authority");
  }
  if (dmsUploadRuntime?.source_only !== false || typeof dmsUploadRuntime?.finalizeUpload !== "function") {
    throw new TypeError("active PostgreSQL DMS upload runtime is required for PostgreSQL API authority");
  }
  if (!(typeof payrollArtifactSecret === "string" || Buffer.isBuffer(payrollArtifactSecret)) || Buffer.byteLength(payrollArtifactSecret) < 32) {
    throw new TypeError("PostgreSQL API authority requires injected payroll artifact secret material");
  }
  if (typeof bankImportPreviewTokens?.issue !== "function"
      || typeof bankImportPreviewTokens?.verify !== "function") {
    throw new TypeError("PostgreSQL API authority requires bank import preview token authority");
  }
  if (
    clientFixedReportTokenAuthority != null
    && (
      typeof clientFixedReportTokenAuthority.issue !== "function"
      || typeof clientFixedReportTokenAuthority.verify !== "function"
    )
  ) {
    throw new TypeError(
      "Client fixed report token authority is invalid",
    );
  }
  if (typeof clientOperationsV2Enabled !== "boolean") {
    throw new TypeError(
      "Client operations v2 feature switch must be boolean",
    );
  }
  if (
    clientOperationsV2Enabled
    && (
      typeof clientOperationsSchemaPool?.query !== "function"
      || typeof clientOperationsSchemaPool?.connect !== "function"
    )
  ) {
    throw new TypeError(
      "Client operations v2 requires the verified PostgreSQL schema pool",
    );
  }
  if (precedentSearchPool != null
      && (typeof precedentSearchPool.query !== "function"
        || typeof precedentSearchPool.connect !== "function")) {
    throw new TypeError("Precedent search requires a PostgreSQL pool");
  }
  if (precedentSearchPool != null
      && (!(typeof precedentAuthoritySecret === "string" || Buffer.isBuffer(precedentAuthoritySecret))
        || Buffer.byteLength(precedentAuthoritySecret) < 32)) {
    throw new TypeError("Precedent search requires server-held authority secret material");
  }
  if (hrxRelationalProjectionReader != null
    && (hrxRelationalProjectionReader.authority !== "read-model-only"
      || hrxRelationalProjectionReader.fallback_authority
        !== "postgres-v2-generic-ledger"
      || typeof hrxRelationalProjectionReader.materializeSnapshot
        !== "function")) {
    throw new TypeError("HRX relational projection reader contract is invalid");
  }
  const clientOperationsV2ReadProvider =
    createClientOperationsPostgresReadProvider({ ledger });
  const bankReconciliationCheckpoint =
    createPostgresPayrollReconciliationCheckpoint({ ledger });
  const peopleOutlookCompletionCheckpoint =
    createPostgresPeopleOutlookCompletionCheckpoint({ ledger });
  const clientOutlookCompletionCheckpoint =
    createPostgresEmailDmsCompletionCheckpoint({
      ledger,
      workflow: "client-outlook",
    });
  const precedentSearchRuntime = precedentSearchPool == null ? null
    : createPostgresPrecedentSearchRuntime({
      pool: precedentSearchPool,
      authoritySecret: precedentAuthoritySecret,
    });

  async function run({ tenant_id, command, request_context = null } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    if (typeof command !== "function") throw new TypeError("PostgreSQL API command callback is required");
    const method = String(request_context?.method ?? "").toUpperCase();
    const peopleOutlookSelfCompletion = isPeopleOutlookSelfCompletion(
      method,
      request_context?.pathname,
    );
    const clientOutlookSelfCompletion = method === "GET"
      && String(request_context?.pathname ?? "")
        === CLIENT_OUTLOOK_HTTPS_CALLBACK_PATH;
    const emailDmsSelfCompletion = peopleOutlookSelfCompletion
      || clientOutlookSelfCompletion;
    const allowIdempotentWriteRetry = request_context?.retry_idempotent_conflict === true
      || isPayrollReconciliationMutation(method, request_context?.pathname)
      || peopleOutlookSelfCompletion
      || isPeopleOutlookDisconnect(method, request_context?.pathname)
      || isOutlookIdempotentMutation(method, request_context?.pathname);
    return runPostgresReadWithBaselineRetry({
      method,
      pathname: request_context?.pathname,
      allowIdempotentWriteRetry,
      ...(allowIdempotentWriteRetry ? { retryLimit: 2 } : {}),
      execute: async () => runWithRequestFailureCompensation(async (
        requestFailureCompensator,
      ) => {
        const identityUsers = identityRepository?.listDirectoryUsers
          ? await identityRepository.listDirectoryUsers({ tenant_id: tenantId })
          : [];
        const detachedEmailDmsRepository = emailDmsSelfCompletion
          ? await materializeRecordRepositoryFromDomainLedger({
              ledger,
              descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
              tenant_id: tenantId,
              create_repository: createEmailDmsRepository,
            })
          : null;
        try {
          const productCommand = await runRecordRepositoryMultiDomainCommand({
            ledger,
            tenant_id: tenantId,
            domains: emailDmsSelfCompletion
              ? PRODUCT_DOMAINS.filter(
                  ({ key }) => key !== "emailDmsRepository",
                )
              : PRODUCT_DOMAINS,
            additional_domains: [
              createHrxDomainParticipant(
                request_context,
                hrxRelationalProjectionReader,
              ),
            ],
            command: (repositories) => command(createRequestRuntimes({
              repositories: detachedEmailDmsRepository
                ? Object.freeze({
                    ...repositories,
                    emailDmsRepository: detachedEmailDmsRepository,
                  })
                : repositories,
              hrxStore: repositories.hrxStore,
              ...(identityRepository?.listDirectoryUsers
                ? { identityUserDirectory: createIdentityUserDirectorySnapshot(identityUsers) }
                : {}),
              dmsStorage,
              dmsUploadRuntime,
              payrollArtifactSecret,
              payrollProviders,
              bankImportPreviewTokens,
              clientFixedReportTokenAuthority,
              clientOperationsV2ReadProvider,
              precedentSearchRuntime,
              clientOperationsReadPathSelector: ({ tenant_id }) =>
                selectClientOperationsReadPath({
                  enabled: clientOperationsV2Enabled,
                  ledger,
                  pool: clientOperationsSchemaPool,
                  tenant_id,
                }),
              bankReconciliationCheckpoint,
              peopleOutlookCompletionCheckpoint,
              clientOutlookCompletionCheckpoint,
              requestFailureCompensator,
              leaveIntegrationProviders,
              leaveIntegrationProviderEnabled,
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
            })),
          });
          return productCommand.result;
        } finally {
          detachedEmailDmsRepository?.close();
        }
      }),
    });
  }

  return Object.freeze({
    kind: "postgres-api-runtime-authority",
    capabilities: Object.freeze({
      authority: "postgres-v2",
      tenant_rls: true,
      optimistic_version: true,
      idempotency: true,
      audit: true,
      outbox: true,
      hrx_relational_read_projection:
        hrxRelationalProjectionReader != null,
      hrx_relational_projection_authority: "read-model-only",
      hrx_relational_projection_fallback:
        "postgres-v2-generic-ledger",
      client_operations_v2_enabled:
        clientOperationsV2Enabled,
      json_fallback: false,
      dual_write: false,
      offline_mutation: false,
      offline_policy: LAWOS_OFFLINE_REJECTED_POLICY,
      production_ready_claim: false,
    }),
    domain_ids: Object.freeze(PRODUCT_DOMAINS.map((domain) => domain.descriptor.domain_id).concat("hrx")),
    run,
  });
}
