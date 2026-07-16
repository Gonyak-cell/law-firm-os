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
import { PERMISSION_CONTEXT_HEADER, PERMISSION_DECISION_ORDER, evaluateRouteDecision, parsePermissionContext } from "./permission-gate.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
  resolveHrxEmployeeProfileByUserId,
  seedHrxDurableRuntimeStore,
} from "./hrx-runtime-context.js";
import { findHrxMemberRosterByUserId, memberPhotoDataUrlForEmployeeId } from "./hrx-member-roster-registry.js";
import { findRegisteredAccountByUserId } from "./matter-vault-account-registry.js";
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
  handleOutlookAddinApiRequest,
} from "./outlook-addin-runtime-context.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = Number(process.env.LAWOS_API_PORT || 4180);

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
  };
}

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

export function createDefaultHrxRuntime({
  store,
  storePath = process.env.LAWOS_HRX_STORE_PATH,
  modelGateway,
  runtimeProfile = resolveRuntimeProfile(),
} = {}) {
  const hrxStore = store ?? createFileHrxStore({ filePath: storePath || createEphemeralHrxStorePath() });
  runHrxMigrations(hrxStore);
  assertRuntimePersistenceStore(hrxStore, {
    bounded_context: "hrx",
    requiredTables: [...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES],
  });
  if (runtimeProfile !== LAWOS_RUNTIME_PROFILES.operational) seedHrxDurableRuntimeStore(hrxStore);
  return createHrxRuntimeContext({
    store: hrxStore,
    modelGateway,
    seedPayrollRuntime: runtimeProfile !== LAWOS_RUNTIME_PROFILES.operational,
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
  masterDataRepository = null,
  matterRepository = null,
} = {}) {
  const analyticsRepository =
    repository ??
    createAnalyticsRepository({
      filePath: storePath || createEphemeralAnalyticsStorePath(),
      seedRecords: ANALYTICS_RUNTIME_SEED,
    });
  return createAnalyticsRuntimeContext({ repository: analyticsRepository, financeRepository, masterDataRepository, matterRepository });
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

const DEFAULT_CORS_ALLOWED_ORIGINS = Object.freeze(["null", "http://127.0.0.1:5173", "http://127.0.0.1:5186"]);
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

async function handle(req, res, { hrxRuntime, hrxRuntimeUnavailable = null, masterDataRuntime, matterRuntime, dmsRuntime, crmIntakeRuntime, financeRuntime, financeRuntimeUnavailable = null, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, homeDashboardRuntime, enterpriseReadinessRuntime, sessionAuth, stepUpAuthority, runtimeProfile = LAWOS_RUNTIME_PROFILES.localDev } = {}) {
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
  const isHomeDashboardPath = pathname.startsWith("/home") || pathname.startsWith("/api/home");
  const isEnterpriseReadinessPath = pathname.startsWith("/api/enterprise");
  const knownPath =
    pathname === "/api/health" ||
    pathname === "/health" ||
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
    isHomeDashboardPath ||
    isEnterpriseReadinessPath;

  if (!knownPath) {
    sendJson(req, res, 404, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "not_found" });
    return;
  }
  if (!isAuthPath && !isHrxPath && !isProfilePath && !isMatterPath && !isVaultPath && !isCrmIntakePath && !isRecordActionsPath && !isImportDataMappingPath && !isAdminPermissionPath && !isDataCloudPath && !isReportsPath && !isFinancePath && !isAnalyticsPath && !isAiPath && !isPortalPath && !isOutlookPath && !isUiReadinessPath && !isHomeDashboardPath && !isEnterpriseReadinessPath && req.method !== "GET") {
    sendJson(req, res, 405, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "method_not_allowed" });
    return;
  }

  if (pathname === "/api/health" || pathname === "/health") {
    sendJson(req, res, 200, {
      status: "ok",
      time: new Date().toISOString(),
      runtime_profile: runtimeProfile,
      synthetic_login_enabled: runtimeProfile !== LAWOS_RUNTIME_PROFILES.operational,
      ...SERVICE_DESCRIPTOR,
    });
    return;
  }

  if (pathname === "/api/auth/password-reset/open") {
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
      requestContext: {
        ...hrxAuthz.context,
        hrx_scopes: hrxAuthz.principal?.hrx_scopes ?? [],
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
    if (pathname.startsWith("/api/admin/security")) {
      const result = sessionAuth.handleSecurityAdminApiRequest({
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
  crmIntakeRuntime = createDefaultCrmIntakeRuntime({ dmsRuntime }),
  financeRuntime = createDefaultFinanceRuntime(),
  financeRuntimeUnavailable = null,
  analyticsRuntime = createDefaultAnalyticsRuntime({ financeRepository: financeRuntime?.repository }),
  aiRuntime = createDefaultAiRuntime(),
  portalRuntime = createDefaultPortalRuntime(),
  uiReadinessRuntime = createDefaultUiReadinessRuntime(),
  homeDashboardRuntime = createDefaultHomeDashboardRuntime({
    sourceCollectors: createHomeDashboardSourceCollectors({ hrxRuntime, matterRuntime, dmsRuntime, aiRuntime }),
  }),
  enterpriseReadinessRuntime = createDefaultEnterpriseReadinessRuntime(),
  runtimeProfile = resolveRuntimeProfile(),
  stepUpAuthority,
  sessionAuth,
} = {}) {
  const resolvedStepUpAuthority = stepUpAuthority ?? createHrxStepUpAuthority({ profile: runtimeProfile });
  const resolvedSessionAuth = sessionAuth ?? createApiSessionAuth({
    stepUpAuthority: resolvedStepUpAuthority,
    profile: runtimeProfile,
  });
  return http.createServer(async (req, res) => {
    try {
      const matterRuntimeWithClearanceLedger =
        matterRuntime?.clearanceRepository || !crmIntakeRuntime?.intakeRepository
          ? matterRuntime
          : Object.freeze({ ...matterRuntime, clearanceRepository: crmIntakeRuntime.intakeRepository });
      await handle(req, res, { hrxRuntime, hrxRuntimeUnavailable, masterDataRuntime, matterRuntime: matterRuntimeWithClearanceLedger, dmsRuntime, crmIntakeRuntime, financeRuntime, financeRuntimeUnavailable, analyticsRuntime, aiRuntime, portalRuntime, uiReadinessRuntime, homeDashboardRuntime, enterpriseReadinessRuntime, sessionAuth: resolvedSessionAuth, stepUpAuthority: resolvedStepUpAuthority, runtimeProfile });
    } catch (error) {
      sendJson(req, res, 500, { outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "internal_error", message: error.message });
    }
  });
}

export function startApiServer({
  port = DEFAULT_PORT,
  runtimeProfile,
  sessionSecret,
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
  enterpriseReadinessStorePath,
  securityAuditStorePath,
  authCredentialStorePath,
  authPasswordResetStorePath,
  passwordResetEmailDelivery,
  sessionAuth,
  stepUpAuthority,
  hrxStepUpSecret,
  hrxStepUpTotpSecret,
} = {}) {
  const resolvedRuntimeProfile = normalizeRuntimeProfileOption(runtimeProfile);
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
    }),
  });
  const resolvedSessionSecret = resolveSessionSecret({
    profile: resolvedRuntimeProfile,
    explicitSecret: sessionSecret,
  });
  const resolvedStepUpAuthority = stepUpAuthority ?? createHrxStepUpAuthority({
    profile: resolvedRuntimeProfile,
    secret: hrxStepUpSecret,
    totpSecret: hrxStepUpTotpSecret,
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
      crmMasterDataRepository,
      crmStorePath: crmStorePath ?? resolvedStorePaths.crmStorePath,
      intakeStorePath: intakeStorePath ?? resolvedStorePaths.intakeStorePath,
      crmMasterDataStorePath: crmMasterDataStorePath ?? resolvedStorePaths.crmMasterDataStorePath,
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
  let financeRuntimeUnavailable = null;
  let financeRuntimeContext = financeRuntime;
  if (!financeRuntimeContext) {
    try {
      financeRuntimeContext = createDefaultFinanceRuntime({
        repository: financeRepository,
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
  const analyticsRuntimeContext =
    analyticsRuntime ??
    createDefaultAnalyticsRuntime({
      repository: analyticsRepository,
      storePath: analyticsStorePath ?? resolvedStorePaths.analyticsStorePath,
      financeRepository: analyticsFinanceRepository ?? financeRuntimeContext?.repository ?? null,
      masterDataRepository: masterRuntime?.repository ?? null,
      matterRepository: matterRuntimeContext?.repository ?? null,
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
  const resolvedSessionAuth = sessionAuth ?? createApiSessionAuth({
    profile: resolvedRuntimeProfile,
    secret: resolvedSessionSecret,
    securityAuditStorePath: securityAuditStorePath ?? resolvedStorePaths.securityAuditStorePath,
    credentialStorePath: authCredentialStorePath ?? resolvedStorePaths.authCredentialStorePath,
    passwordResetTokenStorePath: authPasswordResetStorePath ?? resolvedStorePaths.authPasswordResetStorePath,
    passwordResetEmailDelivery,
    stepUpAuthority: resolvedStepUpAuthority,
  });
  const server = createApiServer({
    hrxRuntime: runtime,
    masterDataRuntime: masterRuntime,
    matterRuntime: matterRuntimeContext,
    dmsRuntime: dmsRuntimeContext,
    crmIntakeRuntime,
    financeRuntime: financeRuntimeContext,
    financeRuntimeUnavailable,
    analyticsRuntime: analyticsRuntimeContext,
    aiRuntime: aiRuntimeContext,
    portalRuntime: portalRuntimeContext,
    uiReadinessRuntime: uiReadinessRuntimeContext,
    homeDashboardRuntime: homeDashboardRuntimeContext,
    enterpriseReadinessRuntime: enterpriseReadinessRuntimeContext,
    stepUpAuthority: resolvedStepUpAuthority,
    sessionAuth: resolvedSessionAuth,
    runtimeProfile: resolvedRuntimeProfile,
    hrxRuntimeUnavailable,
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
  const cliStartupOptions = shouldUseDurableLocalDefaults()
    ? {
        runtimeProfile: LAWOS_RUNTIME_PROFILES.operational,
        sessionSecret: readOrCreateLocalSessionSecret(),
        ...lawosDurableStorePathOptions({ root: ensureLawosDurableStoreHome() }),
      }
    : {};
  Promise.resolve()
    .then(() => startApiServer(cliStartupOptions))
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
      if (cliStartupOptions.runtimeProfile === LAWOS_RUNTIME_PROFILES.operational) {
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
