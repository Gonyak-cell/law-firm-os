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
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { HRX_DURABLE_CORE_TABLES, HRX_DURABLE_WORKFLOW_TABLES } from "../../../packages/hrx/src/store/port.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { createAiGovernanceRepository } from "../../../packages/ai-governance/src/runtime-repository.js";
import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { createUiReadinessRepository } from "../../../packages/platform/src/ui-readiness-repository.js";
import { createEnterpriseReadinessRepository } from "../../../packages/enterprise/src/enterprise-readiness-repository.js";
import { assertRuntimePersistenceStore } from "../../../packages/platform/src/persistence/store-port.js";
import {
  MASTER_DATA_RUNTIME_SEED,
  MASTER_DATA_BOUNDED_CONTEXT,
  createMasterDataRuntimeContext,
  handleClientGroupResolution,
  handleRecordsSearch,
  handleRelationshipLookup,
} from "./master-data-context.js";
import { authorizeHrxApiRequest } from "./middleware/hrx-authz.js";
import { authorizeHrxStepUpRequest } from "./middleware/hrx-step-up-context.js";
import { PERMISSION_CONTEXT_HEADER, PERMISSION_DECISION_ORDER, parsePermissionContext } from "./permission-gate.js";
import { createHrxRuntimeContext, handleHrxApiRequest, seedHrxDurableRuntimeStore } from "./hrx-runtime-context.js";
import {
  MATTER_BOUNDED_CONTEXT,
  MATTER_RUNTIME_SEED,
  createMatterRuntimeContext,
  handleMatterApiRequest,
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

const HOST = "127.0.0.1";
const DEFAULT_PORT = Number(process.env.LAWOS_API_PORT || 4180);

function createEphemeralHrxStorePath() {
  return join(mkdtempSync(join(tmpdir(), "lawos-hrx-runtime-")), "hrx-store.json");
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

export function createDefaultHrxRuntime({ store, storePath = process.env.LAWOS_HRX_STORE_PATH } = {}) {
  const hrxStore = store ?? createFileHrxStore({ filePath: storePath || createEphemeralHrxStorePath() });
  runHrxMigrations(hrxStore);
  assertRuntimePersistenceStore(hrxStore, {
    bounded_context: "hrx",
    requiredTables: [...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES],
  });
  seedHrxDurableRuntimeStore(hrxStore);
  return createHrxRuntimeContext({ store: hrxStore });
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
} = {}) {
  const matterRepository =
    repository ??
    createMatterRepository({
      filePath: storePath || createEphemeralMatterStorePath(),
      seedRecords: MATTER_RUNTIME_SEED.records,
    });
  return createMatterRuntimeContext({ repository: matterRepository, dmsRuntime });
}

export function createDefaultDmsRuntime({
  repository,
  storePath = process.env.LAWOS_DMS_STORE_PATH,
} = {}) {
  const dmsRepository =
    repository ??
    createDmsRepository({
      filePath: storePath || createEphemeralDmsStorePath(),
      seedRecords: VAULT_DMS_RUNTIME_SEED,
    });
  return createVaultDmsRuntimeContext({ repository: dmsRepository });
}

export function createDefaultCrmIntakeRuntime({
  crmRepository,
  intakeRepository,
  crmMasterDataRepository,
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
  });
}

export function createDefaultFinanceRuntime({
  repository,
  storePath = process.env.LAWOS_FINANCE_STORE_PATH,
} = {}) {
  const financeRepository =
    repository ??
    createFinanceRepository({
      filePath: storePath || createEphemeralFinanceStorePath(),
      seedRecords: FINANCE_RUNTIME_SEED,
    });
  return createFinanceRuntimeContext({ repository: financeRepository });
}

export function createDefaultAnalyticsRuntime({
  repository,
  storePath = process.env.LAWOS_ANALYTICS_STORE_PATH,
} = {}) {
  const analyticsRepository =
    repository ??
    createAnalyticsRepository({
      filePath: storePath || createEphemeralAnalyticsStorePath(),
      seedRecords: ANALYTICS_RUNTIME_SEED,
    });
  return createAnalyticsRuntimeContext({ repository: analyticsRepository });
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

export const SERVICE_DESCRIPTOR = Object.freeze({
  service: "@law-firm-os/api",
  version: "0.1.0",
  bounded_contexts: Object.freeze([
    MASTER_DATA_BOUNDED_CONTEXT,
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
    UI_READINESS_BOUNDED_CONTEXT,
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
  synthetic_only: true,
  uses_real_client_data: false,
});

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function queryToObject(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) query[key] = value;
  return query;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function hasJsonRequestBody(method) {
  return method === "POST" || method === "PATCH" || method === "DELETE";
}

async function handle(req, res, { hrxRuntime, masterDataRuntime, matterRuntime, dmsRuntime, crmIntakeRuntime, financeRuntime, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, enterpriseReadinessRuntime } = {}) {
  const url = new URL(req.url || "/", `http://${HOST}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const query = queryToObject(url.searchParams);
  const requestId = query.request_id || `req_${randomUUID()}`;

  const clientGroupMatch = pathname.match(/^\/master-data\/client-groups\/([^/]+)$/);
  const isHrxPath = pathname.startsWith("/api/hrx");
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
  const isUiReadinessPath = pathname.startsWith("/api/ui");
  const isEnterpriseReadinessPath = pathname.startsWith("/api/enterprise");
  const knownPath =
    pathname === "/api/health" ||
    pathname === "/master-data/records" ||
    pathname === "/master-data/relationships" ||
    clientGroupMatch !== null ||
    isHrxPath ||
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
    isUiReadinessPath ||
    isEnterpriseReadinessPath;

  if (!knownPath) {
    sendJson(res, 404, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "not_found" });
    return;
  }
  if (!isHrxPath && !isMatterPath && !isVaultPath && !isCrmIntakePath && !isRecordActionsPath && !isImportDataMappingPath && !isAdminPermissionPath && !isDataCloudPath && !isReportsPath && !isFinancePath && !isAnalyticsPath && !isAiPath && !isPortalPath && !isUiReadinessPath && !isEnterpriseReadinessPath && req.method !== "GET") {
    sendJson(res, 405, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "method_not_allowed" });
    return;
  }

  if (pathname === "/api/health") {
    sendJson(res, 200, { status: "ok", time: new Date().toISOString(), ...SERVICE_DESCRIPTOR });
    return;
  }

  if (isHrxPath) {
    const hrxAuthz = authorizeHrxApiRequest({ method: req.method, pathname, query, headers: req.headers });
    if (!hrxAuthz.ok) {
      sendJson(res, hrxAuthz.status, { request_id: requestId, ...hrxAuthz.body });
      return;
    }
    const hrxStepUp = authorizeHrxStepUpRequest({ action: hrxAuthz.policy.action, context: hrxAuthz.context, headers: req.headers });
    if (!hrxStepUp.ok) {
      sendJson(res, hrxStepUp.status, { request_id: requestId, ...hrxStepUp.body });
      return;
    }
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleHrxApiRequest({ pathname, method: req.method, query, body, context: hrxRuntime, requestContext: hrxAuthz.context });
    sendJson(res, result.status, { request_id: requestId, ...result.body });
    return;
  }

  if (isMatterPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isVaultPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isCrmIntakePath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleCrmIntakeApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: crmIntakeRuntime,
    });
    sendJson(res, result.status, result.body);
    return;
  }

  if (isRecordActionsPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isImportDataMappingPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isAdminPermissionPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = await handleAdminPermissionApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { matterRuntime },
    });
    sendJson(res, result.status, result.body);
    return;
  }

  if (isDataCloudPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isReportsPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isFinancePath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleFinanceApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: financeRuntime,
    });
    sendJson(res, result.status, result.body);
    return;
  }

  if (isAnalyticsPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
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
    sendJson(res, result.status, result.body);
    return;
  }

  if (isAiPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleAiApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: aiRuntime });
    sendJson(res, result.status, result.body);
    return;
  }

  if (isPortalPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handlePortalApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: portalRuntime });
    sendJson(res, result.status, result.body);
    return;
  }

  if (isUiReadinessPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleUiReadinessApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: uiReadinessRuntime });
    sendJson(res, result.status, result.body);
    return;
  }

  if (isEnterpriseReadinessPath) {
    const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleEnterpriseReadinessApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: enterpriseReadinessRuntime });
    sendJson(res, result.status, result.body);
    return;
  }

  // Fail-closed gate input: absent/malformed header parses to null and the gate denies.
  const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);

  let result;
  if (pathname === "/master-data/records") {
    result = handleRecordsSearch({ query, context, requestId, runtime: masterDataRuntime });
  } else if (pathname === "/master-data/relationships") {
    result = handleRelationshipLookup({ query, context, requestId, runtime: masterDataRuntime });
  } else {
    result = handleClientGroupResolution({
      clientGroupId: decodeURIComponent(clientGroupMatch[1]),
      query,
      context,
      requestId,
      runtime: masterDataRuntime,
    });
  }
  sendJson(res, result.status, result.body);
}

export function createApiServer({
  hrxRuntime = createDefaultHrxRuntime(),
  masterDataRuntime = createDefaultMasterDataRuntime(),
  matterRuntime = createDefaultMatterRuntime(),
  dmsRuntime = createDefaultDmsRuntime(),
  crmIntakeRuntime = createDefaultCrmIntakeRuntime(),
  financeRuntime = createDefaultFinanceRuntime(),
  analyticsRuntime = createDefaultAnalyticsRuntime(),
  aiRuntime = createDefaultAiRuntime(),
  portalRuntime = createDefaultPortalRuntime(),
  uiReadinessRuntime = createDefaultUiReadinessRuntime(),
  enterpriseReadinessRuntime = createDefaultEnterpriseReadinessRuntime(),
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      await handle(req, res, { hrxRuntime, masterDataRuntime, matterRuntime, dmsRuntime, crmIntakeRuntime, financeRuntime, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, enterpriseReadinessRuntime });
    } catch (error) {
      sendJson(res, 500, { outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "internal_error", message: error.message });
    }
  });
}

export function startApiServer({
  port = DEFAULT_PORT,
  hrxRuntime,
  hrxStore,
  hrxStorePath,
  masterDataRuntime,
  masterDataRepository,
  masterDataStorePath,
  matterRuntime,
  matterRepository,
  matterStorePath,
  dmsRuntime,
  dmsRepository,
  dmsStorePath,
  crmIntakeRuntime,
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
  aiRuntime,
  aiRepository,
  aiStorePath,
  portalRuntime,
  portalRepository,
  portalStorePath,
  uiReadinessRuntime,
  uiReadinessRepository,
  uiReadinessStorePath,
  enterpriseReadinessRuntime,
  enterpriseReadinessRepository,
  enterpriseReadinessStorePath,
} = {}) {
  const runtime = hrxRuntime ?? createDefaultHrxRuntime({ store: hrxStore, storePath: hrxStorePath });
  const masterRuntime =
    masterDataRuntime ??
    createDefaultMasterDataRuntime({ repository: masterDataRepository, storePath: masterDataStorePath });
  const dmsRuntimeContext =
    dmsRuntime ??
    createDefaultDmsRuntime({ repository: dmsRepository, storePath: dmsStorePath });
  const matterRuntimeContext =
    matterRuntime ??
    createDefaultMatterRuntime({ repository: matterRepository, storePath: matterStorePath, dmsRuntime: dmsRuntimeContext });
  const crmIntakeRuntimeContext =
    crmIntakeRuntime ??
    createDefaultCrmIntakeRuntime({
      crmRepository,
      intakeRepository,
      crmMasterDataRepository,
      crmStorePath,
      intakeStorePath,
      crmMasterDataStorePath,
    });
  const financeRuntimeContext =
    financeRuntime ??
    createDefaultFinanceRuntime({ repository: financeRepository, storePath: financeStorePath });
  const analyticsRuntimeContext =
    analyticsRuntime ??
    createDefaultAnalyticsRuntime({ repository: analyticsRepository, storePath: analyticsStorePath });
  const aiRuntimeContext =
    aiRuntime ??
    createDefaultAiRuntime({ repository: aiRepository, storePath: aiStorePath });
  const portalRuntimeContext =
    portalRuntime ??
    createDefaultPortalRuntime({ repository: portalRepository, storePath: portalStorePath });
  const uiReadinessRuntimeContext =
    uiReadinessRuntime ??
    createDefaultUiReadinessRuntime({ repository: uiReadinessRepository, storePath: uiReadinessStorePath });
  const enterpriseReadinessRuntimeContext =
    enterpriseReadinessRuntime ??
    createDefaultEnterpriseReadinessRuntime({ repository: enterpriseReadinessRepository, storePath: enterpriseReadinessStorePath });
  const server = createApiServer({
    hrxRuntime: runtime,
    masterDataRuntime: masterRuntime,
    matterRuntime: matterRuntimeContext,
    dmsRuntime: dmsRuntimeContext,
    crmIntakeRuntime: crmIntakeRuntimeContext,
    financeRuntime: financeRuntimeContext,
    analyticsRuntime: analyticsRuntimeContext,
    aiRuntime: aiRuntimeContext,
    portalRuntime: portalRuntimeContext,
    uiReadinessRuntime: uiReadinessRuntimeContext,
    enterpriseReadinessRuntime: enterpriseReadinessRuntimeContext,
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      resolve({ server, port: server.address().port, host: HOST });
    });
  });
}

let cliApiServer = null;
let cliKeepAlive = null;

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
  startApiServer().then(({ server, port }) => {
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
  });
  process.once("SIGINT", () => stopCliServer("SIGINT"));
  process.once("SIGTERM", () => stopCliServer("SIGTERM"));
}
