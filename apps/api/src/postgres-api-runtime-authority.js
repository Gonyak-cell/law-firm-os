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
const POSTGRES_READ_RETRYABLE_CONFLICTS = new Set([
  "DOMAIN_BASELINE_CONFLICT",
  "DOMAIN_SHADOW_DIFFERENCE",
  "HRX_POSTGRES_BASELINE_CONFLICT",
  "REPOSITORY_VERSION_CONFLICT",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function isRetryablePostgresReadConflict(error, method) {
  return ["GET", "HEAD"].includes(String(method ?? "").toUpperCase())
    && POSTGRES_READ_RETRYABLE_CONFLICTS.has(error?.safe_error_code);
}

export async function runPostgresReadWithBaselineRetry({
  method,
  execute,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  retryLimit = POSTGRES_READ_RETRY_LIMIT,
} = {}) {
  if (typeof execute !== "function" || typeof wait !== "function") {
    throw new TypeError("PostgreSQL request execution and wait callbacks are required");
  }
  if (!Number.isInteger(retryLimit) || retryLimit < 0 || retryLimit > POSTGRES_READ_RETRY_LIMIT) {
    throw new TypeError(`PostgreSQL read retry limit must be between zero and ${POSTGRES_READ_RETRY_LIMIT}`);
  }
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await execute({ attempt: attempt + 1 });
    } catch (error) {
      if (!isRetryablePostgresReadConflict(error, method) || attempt >= retryLimit) throw error;
      await wait(5 * (2 ** attempt));
    }
  }
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
  dmsStorage,
  dmsUploadRuntime,
  payrollArtifactSecret,
  payrollProviders,
  bankImportPreviewTokens,
} = {}) {
  const hrxRuntime = createHrxRuntimeContext({
    store: hrxStore,
    payrollArtifactStorage: dmsStorage,
    payrollArtifactSecret,
    compensationKeyMaterial: payrollArtifactSecret,
    allowSyntheticLeaveIntegrationProviders: false,
    allowSyntheticPayrollArtifactSecret: false,
    allowSyntheticCompensationKey: false,
    allowSyntheticPayrollProviders: false,
    payrollProviders,
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
  });
  const emailDmsRuntime = Object.freeze({
    authority: "postgres-v2",
    repository: repositories.emailDmsRepository,
    storage: dmsStorage,
    upload_runtime: dmsUploadRuntime,
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
  const analyticsRuntime = createAnalyticsRuntimeContext({
    repository: repositories.analyticsRepository,
    financeRepository: repositories.financeRepository,
    masterDataRepository: repositories.masterDataRepository,
    crmRepository: repositories.crmRepository,
    matterRepository: repositories.matterRepository,
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
  });
}

export function createPostgresApiRuntimeAuthority({
  ledger,
  dmsStorage,
  dmsUploadRuntime,
  payrollArtifactSecret,
  payrollProviders = Object.freeze({}),
  hrxRelationalProjectionReader = null,
  bankImportPreviewTokens,
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
  if (hrxRelationalProjectionReader != null
    && (hrxRelationalProjectionReader.authority !== "read-model-only"
      || hrxRelationalProjectionReader.fallback_authority
        !== "postgres-v2-generic-ledger"
      || typeof hrxRelationalProjectionReader.materializeSnapshot
        !== "function")) {
    throw new TypeError("HRX relational projection reader contract is invalid");
  }

  async function run({ tenant_id, command, request_context = null } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    if (typeof command !== "function") throw new TypeError("PostgreSQL API command callback is required");
    const method = String(request_context?.method ?? "").toUpperCase();
    return runPostgresReadWithBaselineRetry({
      method,
      execute: async () => {
        const productCommand = await runRecordRepositoryMultiDomainCommand({
          ledger,
          tenant_id: tenantId,
          domains: PRODUCT_DOMAINS,
          additional_domains: [
            createHrxDomainParticipant(
              request_context,
              hrxRelationalProjectionReader,
            ),
          ],
          command: (repositories) => command(createRequestRuntimes({
            repositories,
            hrxStore: repositories.hrxStore,
            dmsStorage,
            dmsUploadRuntime,
            payrollArtifactSecret,
            payrollProviders,
            bankImportPreviewTokens,
          })),
        });
        return productCommand.result;
      },
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
