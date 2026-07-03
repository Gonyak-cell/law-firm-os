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
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
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
import { HRX_SESSION_BOUND_HEADER, authorizeHrxApiRequest } from "./middleware/hrx-authz.js";
import { appendHrxRouteAudit } from "./middleware/hrx-audit-write.js";
import { authorizeHrxStepUpRequest } from "./middleware/hrx-step-up-context.js";
import { PERMISSION_CONTEXT_HEADER, PERMISSION_DECISION_ORDER, evaluateRouteDecision } from "./permission-gate.js";
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
import {
  API_AUTH_BOUNDED_CONTEXT,
  AUTHORIZATION_HEADER,
  createApiSessionAuth,
} from "./session-auth.js";
import { createHrxStepUpAuthority } from "./hrx-step-up-token.js";
import {
  OUTLOOK_ADDIN_BOUNDED_CONTEXT,
  handleOutlookAddinApiRequest,
} from "./outlook-addin-runtime-context.js";

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

export function createDefaultHrxRuntime({ store, storePath = process.env.LAWOS_HRX_STORE_PATH, modelGateway } = {}) {
  const hrxStore = store ?? createFileHrxStore({ filePath: storePath || createEphemeralHrxStorePath() });
  runHrxMigrations(hrxStore);
  assertRuntimePersistenceStore(hrxStore, {
    bounded_context: "hrx",
    requiredTables: [...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES],
  });
  seedHrxDurableRuntimeStore(hrxStore);
  return createHrxRuntimeContext({ store: hrxStore, modelGateway });
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
  return createMatterRuntimeContext({ repository: matterRepository, dmsRuntime, hrxRuntime, clearanceRepository });
}

export function createDefaultDmsRuntime({
  repository,
  storePath = process.env.LAWOS_DMS_STORE_PATH,
  storage,
  storageRootPath = process.env.LAWOS_DMS_OBJECT_STORE_PATH,
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
    });
  return createVaultDmsRuntimeContext({ repository: dmsRepository, storage: dmsStorage });
}

export function createDefaultCrmIntakeRuntime({
  crmRepository,
  intakeRepository,
  crmMasterDataRepository,
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
    matterRepository,
    dmsRuntime,
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
  financeRepository = null,
} = {}) {
  const analyticsRepository =
    repository ??
    createAnalyticsRepository({
      filePath: storePath || createEphemeralAnalyticsStorePath(),
      seedRecords: ANALYTICS_RUNTIME_SEED,
    });
  return createAnalyticsRuntimeContext({ repository: analyticsRepository, financeRepository });
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
  data_source: "session_permission_context",
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

const DEFAULT_CORS_ALLOWED_ORIGINS = Object.freeze(["null", "http://127.0.0.1:5173", "http://127.0.0.1:5186"]);
const CORS_BASE_HEADERS = Object.freeze({
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": [
    AUTHORIZATION_HEADER,
    "content-type",
    PERMISSION_CONTEXT_HEADER,
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
    .filter(Boolean);
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

function sendJson(req, res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeadersForRequest(req),
  });
  res.end(JSON.stringify(body));
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

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks);
  if (raw.length === 0) return {};
  const contentType = contentTypeOf(req);
  if (contentType.toLowerCase().startsWith("multipart/form-data")) {
    return parseMultipartFormData(raw, contentType);
  }
  const text = raw.toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function hasJsonRequestBody(method) {
  return method === "POST" || method === "PATCH" || method === "DELETE";
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

function handleProfileApiRequest({ pathname, method, query, context, requestId } = {}) {
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
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: {
        profile_ref: `profile:${actorRef}`,
        actor_ref: actorRef,
        tenant_ref: tenantId,
        display_name: "세션 사용자",
        primary_role_label: roleIds[0] ?? "role_unassigned",
        role_count: roleIds.length,
        contract_summary: {
          state: "connected",
          visible_contract_count: 0,
          source_ref: "session_profile_projection",
        },
        account_summary: {
          state: "connected",
          session_principal_source: context?.principal?.session_principal_source ?? "permission_context",
          session_source_ref: context?.principal?.session_source_ref ?? null,
        },
        secret_material_included: false,
        direct_identifier_included: false,
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

async function handle(req, res, { hrxRuntime, masterDataRuntime, matterRuntime, dmsRuntime, crmIntakeRuntime, financeRuntime, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, enterpriseReadinessRuntime, sessionAuth, stepUpAuthority } = {}) {
  const url = new URL(req.url || "/", `http://${HOST}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const query = queryToObject(url.searchParams);
  const requestId = query.request_id || `req_${randomUUID()}`;

  if (req.method === "OPTIONS") {
    sendOptions(req, res);
    return;
  }

  const clientGroupMatch = pathname.match(/^\/master-data\/client-groups\/([^/]+)$/);
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
  const isUiReadinessPath = pathname.startsWith("/api/ui");
  const isEnterpriseReadinessPath = pathname.startsWith("/api/enterprise");
  const knownPath =
    pathname === "/api/health" ||
    isAuthPath ||
    pathname === "/master-data/records" ||
    pathname === "/master-data/relationships" ||
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
    isUiReadinessPath ||
    isEnterpriseReadinessPath;

  if (!knownPath) {
    sendJson(req, res, 404, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "not_found" });
    return;
  }
  if (!isAuthPath && !isHrxPath && !isProfilePath && !isMatterPath && !isVaultPath && !isCrmIntakePath && !isRecordActionsPath && !isImportDataMappingPath && !isAdminPermissionPath && !isDataCloudPath && !isReportsPath && !isFinancePath && !isAnalyticsPath && !isAiPath && !isPortalPath && !isOutlookPath && !isUiReadinessPath && !isEnterpriseReadinessPath && req.method !== "GET") {
    sendJson(req, res, 405, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "method_not_allowed" });
    return;
  }

  if (pathname === "/api/health") {
    sendJson(req, res, 200, { status: "ok", time: new Date().toISOString(), ...SERVICE_DESCRIPTOR });
    return;
  }

  if (isAuthPath) {
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const result = sessionAuth.handleAuthApiRequest({ pathname, method: req.method, body, headers: req.headers, requestId });
    sendJson(req, res, result.status, result.body);
    return;
  }

  const sessionContext = sessionAuth.resolvePermissionContextFromHeaders(req.headers, { requestId, requireSessionToken: true });
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
  const requestPermissionContext = () => sessionContext.context;
  const requestHeaders = () => {
    const principal = sessionContext.principal;
    return {
      ...req.headers,
      "x-lawos-tenant-id": principal.tenant_id,
      "x-lawos-actor-id": principal.user_id,
      "x-lawos-actor-role": (principal.role_ids ?? []).join(","),
      "x-lawos-hrx-scopes": (principal.scopes ?? []).join(","),
      [HRX_SESSION_BOUND_HEADER]: "signed",
    };
  };

  if (isHrxPath) {
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
      context: hrxAuthz.context,
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
    const body = hasJsonRequestBody(req.method) ? await readRequestBody(req) : {};
    const permissionContext = requestPermissionContext();
    const result = await handleHrxApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context: hrxRuntime,
      requestContext: { ...hrxAuthz.context, hrx_scopes: hrxAuthz.principal?.hrx_scopes ?? [] },
      permissionContext,
    });
    sendJson(req, res, result.status, { request_id: requestId, ...result.body });
    return;
  }

  if (isProfilePath) {
    const context = requestPermissionContext();
    const result = handleProfileApiRequest({ pathname, method: req.method, query, context, requestId });
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
    sendJson(req, res, result.status, result.body);
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
      runtime: crmIntakeRuntime,
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
    const context = requestPermissionContext();
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
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleOutlookAddinApiRequest({
      pathname,
      method: req.method,
      query,
      body,
      context,
      requestId,
      runtime: { matterRuntime, dmsRuntime },
    });
    sendJson(req, res, result.status, result.body);
    return;
  }

  if (isUiReadinessPath) {
    const context = requestPermissionContext();
    const body = req.method === "POST" ? await readRequestBody(req) : {};
    const result = await handleUiReadinessApiRequest({ pathname, method: req.method, query, body, context, requestId, runtime: uiReadinessRuntime });
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
  masterDataRuntime = createDefaultMasterDataRuntime(),
  matterRuntime = createDefaultMatterRuntime({ hrxRuntime }),
  dmsRuntime = createDefaultDmsRuntime(),
  crmIntakeRuntime = createDefaultCrmIntakeRuntime({ dmsRuntime }),
  financeRuntime = createDefaultFinanceRuntime(),
  analyticsRuntime = createDefaultAnalyticsRuntime({ financeRepository: financeRuntime?.repository }),
  aiRuntime = createDefaultAiRuntime(),
  portalRuntime = createDefaultPortalRuntime(),
  uiReadinessRuntime = createDefaultUiReadinessRuntime(),
  enterpriseReadinessRuntime = createDefaultEnterpriseReadinessRuntime(),
  stepUpAuthority = createHrxStepUpAuthority(),
  sessionAuth = createApiSessionAuth({ stepUpAuthority }),
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const matterRuntimeWithClearanceLedger =
        matterRuntime?.clearanceRepository || !crmIntakeRuntime?.intakeRepository
          ? matterRuntime
          : Object.freeze({ ...matterRuntime, clearanceRepository: crmIntakeRuntime.intakeRepository });
      await handle(req, res, { hrxRuntime, masterDataRuntime, matterRuntime: matterRuntimeWithClearanceLedger, dmsRuntime, crmIntakeRuntime, financeRuntime, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, enterpriseReadinessRuntime, sessionAuth, stepUpAuthority });
    } catch (error) {
      sendJson(req, res, 500, { outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "internal_error", message: error.message });
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
  sessionAuth,
  stepUpAuthority,
} = {}) {
  const runtime = hrxRuntime ?? createDefaultHrxRuntime({ store: hrxStore, storePath: hrxStorePath });
  const masterRuntime =
    masterDataRuntime ??
    createDefaultMasterDataRuntime({ repository: masterDataRepository, storePath: masterDataStorePath });
  const dmsRuntimeContext =
    dmsRuntime ??
    createDefaultDmsRuntime({ repository: dmsRepository, storePath: dmsStorePath });
  const resolvedMatterRepository =
    matterRuntime?.repository ??
    matterRepository ??
    createMatterRepository({
      filePath: matterStorePath || createEphemeralMatterStorePath(),
      seedRecords: MATTER_RUNTIME_SEED.records,
    });
  const crmIntakeRuntime =
    providedCrmIntakeRuntime ??
    createDefaultCrmIntakeRuntime({
      crmRepository,
      intakeRepository,
      crmMasterDataRepository,
      crmStorePath,
      intakeStorePath,
      crmMasterDataStorePath,
      matterRepository: resolvedMatterRepository,
      dmsRuntime: dmsRuntimeContext,
    });
  const matterRuntimeContext =
    matterRuntime ??
    createDefaultMatterRuntime({
      repository: resolvedMatterRepository,
      dmsRuntime: dmsRuntimeContext,
      hrxRuntime: runtime,
      clearanceRepository: crmIntakeRuntime.intakeRepository,
    });
  const financeRuntimeContext =
    financeRuntime ??
    createDefaultFinanceRuntime({ repository: financeRepository, storePath: financeStorePath });
  const analyticsRuntimeContext =
    analyticsRuntime ??
    createDefaultAnalyticsRuntime({
      repository: analyticsRepository,
      storePath: analyticsStorePath,
      financeRepository: analyticsFinanceRepository ?? financeRuntimeContext.repository,
    });
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
  const resolvedStepUpAuthority = stepUpAuthority ?? createHrxStepUpAuthority();
  const resolvedSessionAuth = sessionAuth ?? createApiSessionAuth({ stepUpAuthority: resolvedStepUpAuthority });
  const server = createApiServer({
    hrxRuntime: runtime,
    masterDataRuntime: masterRuntime,
    matterRuntime: matterRuntimeContext,
    dmsRuntime: dmsRuntimeContext,
    crmIntakeRuntime,
    financeRuntime: financeRuntimeContext,
    analyticsRuntime: analyticsRuntimeContext,
    aiRuntime: aiRuntimeContext,
    portalRuntime: portalRuntimeContext,
    uiReadinessRuntime: uiReadinessRuntimeContext,
    enterpriseReadinessRuntime: enterpriseReadinessRuntimeContext,
    stepUpAuthority: resolvedStepUpAuthority,
    sessionAuth: resolvedSessionAuth,
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
