import {
  buildClientDepositReallocationCommand,
  buildClientReceivablesModel,
  buildFeeCommitmentCommand
} from "../components/ClientReceivablesModel.js";
import {
  buildClientFixedReportsModel,
  selectClientFixedReport
} from "../components/ClientFixedReportsModel.js";

const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const VAULT_BRIDGE_TOKEN_HEADER = "x-lawos-vault-bridge-token";
const runtimeTenant = (...parts) => parts.join("_");
const TENANT_ID = runtimeTenant("tenant", "rp04", "synthetic");
const VAULT_TENANT_ID = "tenant_amic_matter_vault";
const MATTER_TENANT_ID = VAULT_TENANT_ID;
const CRM_INTAKE_TENANT_ID = runtimeTenant("tenant", "cmp", "g6", "synthetic");
const FINANCE_TENANT_ID = runtimeTenant("tenant", "cmp", "g7", "synthetic");
const ANALYTICS_TENANT_ID = runtimeTenant("tenant", "cmp", "g8", "synthetic");
const AI_TENANT_ID = "matter-runtime-tenant";
const PORTAL_TENANT_ID = runtimeTenant("tenant", "cmp", "g10", "synthetic");
const UI_READINESS_TENANT_ID = "matter-runtime-tenant";
const ENTERPRISE_TENANT_ID = "matter-runtime-tenant";
const ADMIN_PERMISSION_TENANT_ID = runtimeTenant("tenant", "sf", "b", "w06", "synthetic");
const DATA_CLOUD_TENANT_ID = runtimeTenant("tenant", "sf", "b", "w07", "synthetic");
const DEFAULT_PERMISSION_REF = "ui_cmp_r4_master_data_live";
const DEFAULT_AUDIT_HINT_REF = "ui_cmp_r4_master_data_probe";
const CLIENT_GROUP_REVIEW_PERMISSION_REF = "ui_cmp_g2_client_group_review";
const CLIENT_GROUP_REVIEW_AUDIT_HINT_REF = "ui_cmp_g2_client_group_review_probe";
const CLIENT_GROUP_CREATE_PERMISSION_REF = "ui_cmp_g2_client_group_create";
const CLIENT_GROUP_CREATE_AUDIT_HINT_REF = "ui_cmp_g2_client_group_create_probe";
const DEFAULT_MATTER_PERMISSION_REF = "ui_cmp_g4_matter_live";
const DEFAULT_MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_probe";
const DEFAULT_VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const DEFAULT_VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";
const DEFAULT_CRM_INTAKE_PERMISSION_REF = "ui_cmp_g6_crm_intake_live";
const DEFAULT_CRM_INTAKE_AUDIT_HINT_REF = "ui_cmp_g6_crm_intake_probe";
const CRM_INQUIRY_PERMISSION_REF = "ui_cmp_g6_crm_inquiry_read";
const CRM_INQUIRY_AUDIT_HINT_REF = "ui_cmp_g6_crm_inquiry_read_probe";
const CRM_INQUIRY_EVIDENCE_PERMISSION_REF = "ui_cmp_g6_crm_inquiry_evidence_read";
const CRM_INQUIRY_EVIDENCE_AUDIT_HINT_REF = "ui_cmp_g6_crm_inquiry_evidence_read_probe";
const DEFAULT_FINANCE_PERMISSION_REF = "ui_cmp_g7_finance_live";
const DEFAULT_FINANCE_AUDIT_HINT_REF = "ui_cmp_g7_finance_probe";
const CLIENT_DEPOSIT_PERMISSION_REF = "ui_client_deposit_operations";
const CLIENT_DEPOSIT_AUDIT_HINT_REF = "ui_client_deposit_operations_probe";
const CLIENT_RECEIVABLES_PERMISSION_REF = "ui_client_receivables";
const CLIENT_RECEIVABLES_AUDIT_HINT_REF = "ui_client_receivables_probe";
const CLIENT_FIXED_REPORT_PERMISSION_REF = "ui_client_fixed_reports";
const CLIENT_FIXED_REPORT_AUDIT_HINT_REF = "ui_client_fixed_reports_probe";
const DEFAULT_ANALYTICS_PERMISSION_REF = "ui_cmp_g8_analytics_live";
const DEFAULT_ANALYTICS_AUDIT_HINT_REF = "ui_cmp_g8_analytics_probe";
const DEFAULT_AI_PERMISSION_REF = "ui_cmp_g9_ai_live";
const DEFAULT_AI_AUDIT_HINT_REF = "ui_cmp_g9_ai_probe";
const DEFAULT_PORTAL_PERMISSION_REF = "ui_cmp_g10_portal_live";
const DEFAULT_PORTAL_AUDIT_HINT_REF = "ui_cmp_g10_portal_probe";
const DEFAULT_UI_READINESS_PERMISSION_REF = "ui_cmp_g11_readiness_live";
const DEFAULT_UI_READINESS_AUDIT_HINT_REF = "ui_cmp_g11_readiness_probe";
const DEFAULT_ENTERPRISE_PERMISSION_REF = "ui_cmp_g12_enterprise_live";
const DEFAULT_ENTERPRISE_AUDIT_HINT_REF = "ui_cmp_g12_enterprise_probe";
const DEFAULT_ADMIN_PERMISSION_REF = "ui_sf_b_w06_permission_admin";
const DEFAULT_ADMIN_AUDIT_HINT_REF = "ui_sf_b_w06_permission_admin_probe";
const DEFAULT_DATA_CLOUD_PERMISSION_REF = "ui_sf_b_w07_data_cloud_enrichment";
const DEFAULT_DATA_CLOUD_AUDIT_HINT_REF = "ui_sf_b_w07_data_cloud_probe";
const DEFAULT_REPORT_PERMISSION_REF = "ui_sf_b_w08_report_builder";
const DEFAULT_REPORT_AUDIT_HINT_REF = "ui_sf_b_w08_report_builder_probe";
const DEFAULT_PROFILE_PERMISSION_REF = "ui_profile_me";
const DEFAULT_PROFILE_AUDIT_HINT_REF = "ui_profile_me_probe";
const DEFAULT_HOME_PERMISSION_REF = "ui_home_dashboard_live";
const DEFAULT_HOME_AUDIT_HINT_REF = "ui_home_dashboard_probe";
const ENGAGEMENT_SIGNED_PDF_BYTES_BASE64 = "JVBERi0xLjQKTGF3IEZpcm0gT1Mgc2lnbmVkIGVuZ2FnZW1lbnQgYnJvd3NlciBwcm9vZgolJUVPRgo=";
const ENGAGEMENT_SIGNED_PDF_SHA256 = "fcd3cf8ecefd324d0ef0772f3a86057241458e797a5d5373712041d3933b96ba";
const ENGAGEMENT_SIGNED_PDF_BYTE_SIZE = 59;
export const LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos.session.envelope";
export const LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os.desktop-web-session-envelope.v0.1";
export const LAWOS_API_SESSION_STORAGE_KEY = "lawos.api.session";
export {
  advanceExecutionRun,
  createApprovalRequest,
  createExecutionRun,
  decideApprovalRequest,
  evaluateProviderReceipt,
  projectConnectorReceipt
} from "./approvalProviderRunKernel.js";
export {
  IMPORT_FIELD_ALLOWLISTS,
  activateSegment as activateLcxFullSegment,
  assertImportEnrichmentSafe as assertLcxFullImportEnrichmentSafe,
  createConsentCoverage as createLcxFullConsentCoverage,
  createEnrichmentJob as createLcxFullEnrichmentJob,
  createIdentityCandidates as createLcxFullIdentityCandidates,
  dryRunImport as dryRunLcxFullImport,
  executeImportSynthetic as executeLcxFullImportSynthetic,
  rollbackImport as rollbackLcxFullImport,
  stageImportSource as stageLcxFullImportSource,
  validateImportMapping as validateLcxFullImportMapping
} from "./importEnrichmentKernel.js";
export {
  assertExternalProviderWorkflowSafe as assertLcxFullExternalProviderWorkflowSafe,
  createBillingReconciliation as createLcxFullBillingReconciliation,
  createContractDraftPackage as createLcxFullContractDraftPackage,
  createESignSendRequest as createLcxFullESignSendRequest,
  createInvoiceIssueRequest as createLcxFullInvoiceIssueRequest,
  createMatterCommsSendRequest as createLcxFullMatterCommsSendRequest,
  createMatterMessageDraft as createLcxFullMatterMessageDraft,
  createPaymentSendRequest as createLcxFullPaymentSendRequest,
  createTaxInvoiceIssueRequest as createLcxFullTaxInvoiceIssueRequest,
  validateContractSigners as validateLcxFullContractSigners,
  validateMatterRecipients as validateLcxFullMatterRecipients
} from "./externalProviderWorkflowKernel.js";
export {
  assertPeopleWorkflowSafe as assertLcxFullPeopleWorkflowSafe,
  buildPeopleReadinessCatalog as buildLcxFullPeopleReadinessCatalog,
  configurePeopleSetupRows as configureLcxFullPeopleSetupRows,
  createPeopleGovernancePacket as createLcxFullPeopleGovernancePacket,
  createPeopleIntegrationRequest as createLcxFullPeopleIntegrationRequest
} from "./peopleWorkflowKernel.js";
export {
  assertGlobalDecisionAuditSafe as assertLcxFullGlobalDecisionAuditSafe,
  buildAuditRequiredAction as buildLcxFullAuditRequiredAction,
  buildGlobalDecisionPackets as buildLcxFullGlobalDecisionPackets,
  buildReceiptReconciliation as buildLcxFullReceiptReconciliation,
  listGlobalAuditSurfaces as listLcxFullGlobalAuditSurfaces
} from "./globalDecisionAuditKernel.js";
export {
  LCX_FULL_AUDIT_STATES,
  LCX_FULL_MODEL_DECLARATIONS,
  LCX_FULL_PROVIDER_RECEIPT_STATES,
  LCX_FULL_READINESS_STATES,
  LCX_FULL_SAFE_READINESS_FIXTURES,
  assertNoForbiddenProjection,
  projectReadinessRecord,
  redactLcxFullValue,
  transitionReadinessState,
  validateLcxFullReadinessModel
} from "./readinessModel.js";

const SESSION_DOMAINS = ["client", "matter", "vault", "crm", "default"];
const SAFE_SESSION_STATES = new Set(["signed_in"]);
const SAFE_REVIEW_STATES = new Set(["allow", "review", "denied"]);
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_ACTOR_REF_PATTERN = /^[A-Za-z0-9._:@+-]{1,200}$/;
const FORBIDDEN_SESSION_TEXT = /(password|reset|bearer|cookie|secret|credential|authorization|token|sk-)/i;

export function isDesktopRendererLocation(location) {
  if (!location || !["file:", "matter-app:"].includes(location.protocol)) return false;
  if (location.protocol === "matter-app:" && (
    location.hostname !== "app" || location.port || location.username || location.password
  )) return false;
  try {
    return new URLSearchParams(location.search ?? "").get("desktop") === "1";
  } catch {
    return false;
  }
}

function desktopApiBaseUrl() {
  if (typeof window === "undefined" || !isDesktopRendererLocation(window.location)) return "";
  const params = new URLSearchParams(window.location.search);
  const sessionBaseUrl = window.matterSession?.desktopApiBaseUrl;
  const rawBaseUrl = typeof sessionBaseUrl === "string" && sessionBaseUrl.trim()
    ? sessionBaseUrl
    : params.get("desktop_api_base_url");
  if (typeof rawBaseUrl !== "string" || !rawBaseUrl.trim()) return "";
  try {
    const url = new URL(rawBaseUrl);
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function apiRequestUrl(input) {
  if (typeof input !== "string" || !input.startsWith("/")) return input;
  const baseUrl = desktopApiBaseUrl();
  return baseUrl ? `${baseUrl}${input}` : input;
}

function desktopReadBridge() {
  if (typeof window === "undefined" || !isDesktopRendererLocation(window.location)) return null;
  return typeof window.matterSession?.api === "function" ? window.matterSession.api : null;
}

function sessionStorageFor(source = globalThis) {
  try {
    return source?.sessionStorage ?? globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function plainHeaders(headers = {}) {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const result = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...(headers ?? {}) };
}

function setHeader(headers, name, value) {
  const existing = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  headers[existing ?? name] = value;
}

function deleteHeader(headers, name) {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) delete headers[key];
  }
}

export function readLawosApiSession(source = globalThis) {
  const storage = sessionStorageFor(source);
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(LAWOS_API_SESSION_STORAGE_KEY) ?? "null");
    const token = typeof parsed?.session_token === "string" ? parsed.session_token : "";
    const expiresAt = typeof parsed?.expires_at === "string" ? parsed.expires_at : null;
    const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    if (!token.startsWith("lawos_session_v1.")) return null;
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      storage.removeItem(LAWOS_API_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function readDesktopMatterSessionStatus(source = globalThis) {
  const bridge = source?.matterSession ?? source?.window?.matterSession;
  if (typeof bridge?.status !== "function") return null;
  try {
    const status = await bridge.status();
    if (status?.state !== "signed_in") return null;
    writeLawosDesktopSession({ session: status, expires_at: status.expires_at }, source);
    return status;
  } catch {
    return null;
  }
}

function writeSessionEnvelopeFromApiSession(body, source = globalThis) {
  const storage = sessionStorageFor(source);
  const session = body?.session;
  if (!storage || !session?.user_id || !session?.tenant_id) return;
  const envelope = {
    schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    state: "signed_in",
    session_ref: session.session_id ?? `api:${session.user_id}`,
    source: "api_signed_session",
    actor_ref: session.user_id,
    user_id: session.user_id,
    email: session.email ?? null,
    display_name: session.display_name ?? null,
    tenant_refs: {
      default: session.tenant_id,
      client: session.tenant_id,
      matter: session.tenant_id,
      vault: session.tenant_id,
      crm: session.tenant_id,
      hrx: session.tenant_id
    },
    role_ids: Array.isArray(session.role_ids) ? session.role_ids : [],
    scopes: [...(Array.isArray(session.scopes) ? session.scopes : []), ...(Array.isArray(session.hrx_scopes) ? session.hrx_scopes : [])],
    review_state: "allow",
    expires_at: body.expires_at ?? session.expires_at ?? null
  };
  storage.setItem(LAWOS_SESSION_ENVELOPE_STORAGE_KEY, JSON.stringify(envelope));
}

function desktopSessionBridge(method, source = globalThis) {
  const windowLike = source?.window ?? source;
  const location = windowLike?.location ?? source?.location;
  if (!isDesktopRendererLocation(location)) return null;
  const bridge = windowLike?.matterSession ?? source?.matterSession;
  return typeof bridge?.[method] === "function" ? bridge[method].bind(bridge) : null;
}

function writeLawosDesktopSession(body, source = globalThis) {
  const session = body?.session;
  if (session?.state !== "signed_in" || !session.user_id || !session.tenant_id) return false;
  writeSessionEnvelopeFromApiSession(body, source);
  return Boolean(readLawosSessionEnvelope(source));
}

function writeLawosApiSession(body, source = globalThis) {
  const storage = sessionStorageFor(source);
  const token = typeof body?.session_token === "string" ? body.session_token : "";
  if (!storage || !token.startsWith("lawos_session_v1.")) return false;
  storage.setItem(LAWOS_API_SESSION_STORAGE_KEY, JSON.stringify({
    token_type: body.token_type ?? "Bearer",
    session_token: token,
    expires_at: body.expires_at ?? null,
    session: body.session ?? null
  }));
  writeSessionEnvelopeFromApiSession(body, source);
  return true;
}

export async function loginLawosApiSession({ email, password } = {}, { source = globalThis } = {}) {
  const desktopLogin = desktopSessionBridge("login", source);
  if (desktopLogin) {
    try {
      const body = await desktopLogin({ email, password });
      const stored = body?.ok ? writeLawosDesktopSession(body, source) : false;
      return {
        ok: Boolean(body?.ok && stored),
        status: Number(body?.http_status ?? body?.status ?? (body?.ok ? 200 : 0)) || 0,
        body
      };
    } catch {
      return { ok: false, status: 0, body: { reason: "desktop_login_bridge_failed" } };
    }
  }
  let response;
  let body;
  try {
    response = await fetch(apiRequestUrl("/api/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    body = await response.json();
  } catch {
    return { ok: false, status: 0, body: { reason: "network_or_parse_error" } };
  }
  const stored = response.ok ? writeLawosApiSession(body, source) : false;
  return { ok: response.ok && stored, status: response.status, body };
}

function passwordResetResult(body, status, { confirmation = false } = {}) {
  const accepted = body?.ok === true || body?.accepted === true || (confirmation && body?.activated === true);
  const normalizedStatus = Number(status ?? body?.http_status ?? body?.status ?? (accepted ? 200 : 0)) || 0;
  return Object.freeze({
    ok: normalizedStatus >= 200 && normalizedStatus < 300 && accepted,
    status: normalizedStatus,
    reason: typeof body?.reason === "string" ? body.reason : ""
  });
}

export async function requestLawosPasswordReset({ email } = {}, { source = globalThis } = {}) {
  const desktopRequest = desktopSessionBridge("requestPasswordReset", source);
  if (desktopRequest) {
    try {
      const body = await desktopRequest({ email });
      return passwordResetResult(body, body?.http_status ?? body?.status);
    } catch {
      return passwordResetResult({ reason: "desktop_password_reset_bridge_failed" }, 0);
    }
  }
  try {
    const response = await fetch(apiRequestUrl("/api/auth/password-reset/request"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    return passwordResetResult(await response.json(), response.status);
  } catch {
    return passwordResetResult({ reason: "network_or_parse_error" }, 0);
  }
}

export async function confirmLawosPasswordReset({ token, password } = {}, { source = globalThis } = {}) {
  const desktopConfirm = desktopSessionBridge("confirmPasswordReset", source);
  if (desktopConfirm) {
    try {
      const body = await desktopConfirm({ token, password });
      return passwordResetResult(body, body?.http_status ?? body?.status, { confirmation: true });
    } catch {
      return passwordResetResult({ reason: "desktop_password_reset_bridge_failed" }, 0, { confirmation: true });
    }
  }
  try {
    const response = await fetch(apiRequestUrl("/api/auth/password-reset/confirm"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    return passwordResetResult(await response.json(), response.status, { confirmation: true });
  } catch {
    return passwordResetResult({ reason: "network_or_parse_error" }, 0, { confirmation: true });
  }
}

function sessionAuthorizedHeaders(headers = {}) {
  const requestHeaders = plainHeaders(headers);
  for (const name of [
    "x-lawos-tenant-id",
    "x-lawos-actor-id",
    "x-lawos-actor-role",
    "x-lawos-hrx-scopes"
  ]) {
    deleteHeader(requestHeaders, name);
  }
  const session = readLawosApiSession();
  if (session?.session_token) setHeader(requestHeaders, "authorization", `Bearer ${session.session_token}`);
  return requestHeaders;
}

async function apiFetch(input, init = {}) {
  const headers = sessionAuthorizedHeaders(init.headers);
  const bound = bindApiRequestToSignedSession(input, { ...init, headers });
  const bridge = desktopReadBridge();
  if (bridge && typeof bound.input === "string" && bound.input.startsWith("/")) {
    const response = await bridge({
      path: bound.input,
      method: bound.init.method ?? "GET",
      headers: bound.init.headers,
      body: bound.init.body ?? null
    });
    const status = Number(response?.http_status ?? response?.status ?? 0) || 500;
    const body = response?.body ?? response ?? {};
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", ...(response?.headers ?? {}) }
    });
  }
  return fetch(apiRequestUrl(bound.input), {
    ...bound.init,
    headers: bound.init.headers
  });
}

const PRINCIPAL = {
  user_id: "matter_client_operator",
  tenant_id: TENANT_ID,
  role_ids: ["master_data_reader"]
};

const MATTER_PRINCIPAL = {
  user_id: "matter_matter_operator",
  tenant_id: MATTER_TENANT_ID,
  role_ids: ["matter_runtime_user"]
};

const VAULT_PRINCIPAL = {
  user_id: "matter_vault_operator",
  tenant_id: VAULT_TENANT_ID,
  role_ids: ["system_super_admin", "tenant_owner", "managing_partner", "security_admin", "matter_vault_admin", "matter_vault_user", "dms_reader"]
};

const CRM_INTAKE_PRINCIPAL = {
  user_id: "matter_client_intake_operator",
  tenant_id: CRM_INTAKE_TENANT_ID,
  role_ids: ["crm_intake_user", "conflict_reviewer", "crm_contact_value_reader"]
};

const FINANCE_PRINCIPAL = {
  user_id: "matter_finance_operator",
  tenant_id: FINANCE_TENANT_ID,
  role_ids: ["finance_user"]
};

const ANALYTICS_PRINCIPAL = {
  user_id: "matter_analytics_operator",
  tenant_id: ANALYTICS_TENANT_ID,
  role_ids: ["analytics_user"]
};

const AI_PRINCIPAL = {
  user_id: "matter_ai_review_operator",
  tenant_id: AI_TENANT_ID,
  role_ids: ["ai_reviewer"]
};

const PORTAL_PRINCIPAL = {
  user_id: "matter_client_portal_operator",
  tenant_id: PORTAL_TENANT_ID,
  role_ids: ["portal_operator", "data_room_operator"]
};

const UI_READINESS_PRINCIPAL = {
  user_id: "matter_readiness_operator",
  tenant_id: UI_READINESS_TENANT_ID,
  role_ids: ["ui_readiness_reviewer"]
};

const ENTERPRISE_PRINCIPAL = {
  user_id: "matter_enterprise_operator",
  tenant_id: ENTERPRISE_TENANT_ID,
  role_ids: ["enterprise_operator"]
};

const ADMIN_PERMISSION_PRINCIPAL = {
  user_id: "matter_admin_operator",
  tenant_id: ADMIN_PERMISSION_TENANT_ID,
  role_ids: ["security_admin", "people_admin"]
};

const DATA_CLOUD_PRINCIPAL = {
  user_id: "matter_data_cloud_operator",
  tenant_id: DATA_CLOUD_TENANT_ID,
  role_ids: ["data_cloud_operator"]
};

const REPORT_PRINCIPAL = {
  user_id: "matter_report_builder_operator",
  tenant_id: ANALYTICS_TENANT_ID,
  role_ids: ["report_builder", "analytics_user"]
};

const PERMISSION_CONTEXTS = {
  allow: {
    principal: PRINCIPAL,
    rules: [{ id: "rule_allow_read", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: PRINCIPAL,
    rules: [{ id: "rule_review", effect: "review_required", action: "search" }],
    object_acl: []
  }
};

const MATTER_PERMISSION_CONTEXTS = {
  allow: {
    principal: MATTER_PRINCIPAL,
    rules: [{ id: "rule_matter_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: MATTER_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: MATTER_PRINCIPAL,
    rules: [{ id: "rule_matter_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const VAULT_PERMISSION_CONTEXTS = {
  allow: {
    principal: VAULT_PRINCIPAL,
    rules: [{ id: "rule_vault_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: VAULT_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: VAULT_PRINCIPAL,
    rules: [{ id: "rule_vault_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

function safeSessionRef(value) {
  if (typeof value !== "string") return null;
  const ref = value.trim();
  if (!ref || ref.includes("@") || !SAFE_REF_PATTERN.test(ref) || FORBIDDEN_SESSION_TEXT.test(ref)) return null;
  return ref;
}

function safeActorRef(value) {
  if (typeof value !== "string") return null;
  const ref = value.trim();
  if (!ref || !SAFE_ACTOR_REF_PATTERN.test(ref) || FORBIDDEN_SESSION_TEXT.test(ref)) return null;
  return ref;
}

function safeSessionRefList(values, limit = 24) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => safeSessionRef(value)).filter(Boolean).slice(0, limit);
}

function safeTenantRefs(value, fallbackTenantRef = null) {
  const tenantRefs = {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  for (const domain of SESSION_DOMAINS) {
    const ref = safeSessionRef(source[domain]);
    if (ref) tenantRefs[domain] = ref;
  }
  const fallback = safeSessionRef(fallbackTenantRef);
  if (fallback && !tenantRefs.default) tenantRefs.default = fallback;
  return tenantRefs;
}

function readStoredSessionEnvelope(source) {
  try {
    const storage = source?.sessionStorage ?? globalThis.sessionStorage;
    const raw = storage?.getItem?.(LAWOS_SESSION_ENVELOPE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readUrlSessionEnvelope(source) {
  try {
    const location = source?.location ?? globalThis.location;
    const search = typeof location?.search === "string" ? location.search : "";
    const params = new URLSearchParams(search);
    if (params.get("desktop") !== "1") return null;

    const actorRef = safeActorRef(params.get("desktop_actor_ref"));
    const tenantRef = safeSessionRef(params.get("desktop_tenant_ref"));
    if (!actorRef || !tenantRef) return null;

    const sessionRef = safeSessionRef(params.get("desktop_session_ref")) ?? `desktop:${actorRef}:0`;
    const sourceRef = safeSessionRef(params.get("desktop_source_ref")) ?? "desktop_offline_login";
    return {
      schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
      state: "signed_in",
      session_ref: sessionRef,
      source: sourceRef,
      actor_ref: actorRef,
      tenant_refs: {
        default: tenantRef,
        client: tenantRef,
        matter: tenantRef,
        vault: tenantRef,
        crm: tenantRef
      },
      role_ids: params.getAll("desktop_role_ref"),
      scopes: params.getAll("desktop_scope_ref"),
      review_state: SAFE_REVIEW_STATES.has(params.get("desktop_review_state")) ? params.get("desktop_review_state") : "allow",
      expires_at: params.get("desktop_expires_at")
    };
  } catch {
    return null;
  }
}

function hasForbiddenSessionKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenSessionKey(item));
  return Object.entries(value).some(([key, nested]) => {
    if (FORBIDDEN_SESSION_TEXT.test(key)) return true;
    return hasForbiddenSessionKey(nested);
  });
}

export function readLawosSessionEnvelope(source = globalThis) {
  const raw = source?.__LAWOS_SESSION_CONTEXT__ ?? readUrlSessionEnvelope(source) ?? readStoredSessionEnvelope(source);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (hasForbiddenSessionKey(raw)) return null;

  const schemaVersion = safeSessionRef(raw.schema_version);
  const state = typeof raw.state === "string" ? raw.state : null;
  const actorRef = safeActorRef(raw.actor_ref ?? raw.user_ref ?? raw.user_id);
  const sessionRef = safeSessionRef(raw.session_ref);
  const sourceRef = safeSessionRef(raw.source ?? raw.source_ref);
  const tenantRefs = safeTenantRefs(raw.tenant_refs, raw.tenant_ref ?? raw.tenant_id);
  const reviewState = SAFE_REVIEW_STATES.has(raw.review_state) ? raw.review_state : "allow";
  const expiresAt = typeof raw.expires_at === "string" ? raw.expires_at : null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;

  if (schemaVersion !== LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION) return null;
  if (!SAFE_SESSION_STATES.has(state) || !actorRef) return null;
  if (Object.keys(tenantRefs).length === 0) return null;
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) return null;

  return {
    schema_version: schemaVersion,
    state,
    session_ref: sessionRef,
    source: sourceRef ?? "desktop_session",
    actor_ref: actorRef,
    tenant_refs: tenantRefs,
    role_ids: safeSessionRefList(raw.role_ids),
    scopes: safeSessionRefList(raw.scopes, 96),
    review_state: reviewState,
    expires_at: expiresAt
  };
}

function tenantRefForDomain(envelope, domain, fallbackTenantId) {
  if (!envelope) return fallbackTenantId;
  return envelope.tenant_refs[domain] ?? envelope.tenant_refs.default ?? fallbackTenantId;
}

function tenantIdForDomain(domain, fallbackTenantId) {
  return tenantRefForDomain(readLawosSessionEnvelope(), domain, fallbackTenantId);
}

function requestTenantDomain(pathname = "") {
  if (pathname.startsWith("/api/crm") || pathname.startsWith("/api/intake")) return "crm";
  if (pathname.startsWith("/api/finance")) return "finance";
  if (pathname.startsWith("/api/analytics")) return "analytics";
  if (pathname.startsWith("/api/ai")) return "ai";
  if (pathname.startsWith("/api/portal") || pathname.startsWith("/api/data-room")) return "portal";
  if (pathname.startsWith("/api/hrx") || pathname.startsWith("/api/profile")) return "hrx";
  if (pathname.startsWith("/api/vault")) return "vault";
  if (pathname.startsWith("/api/matters")) return "matter";
  if (pathname.startsWith("/master-data")) return "client";
  return "default";
}

function bindJsonTenant(value, tenantId) {
  if (Array.isArray(value)) return value.map((entry) => bindJsonTenant(entry, tenantId));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === "tenant_id" ? tenantId : bindJsonTenant(entry, tenantId)
    ])
  );
}

export function bindApiRequestToSignedSession(input, init = {}, source = globalThis) {
  if (typeof input !== "string") return { input, init };
  const envelope = readLawosSessionEnvelope(source);
  if (!envelope || envelope.state !== "signed_in") return { input, init };
  const absolute = /^[a-z][a-z0-9+.-]*:\/\//iu.test(input);
  const url = new URL(input, "http://lawos.session.local");
  const tenantId = tenantRefForDomain(
    envelope,
    requestTenantDomain(url.pathname),
    envelope.tenant_refs.default
  );
  if (!tenantId) return { input, init };
  if (url.searchParams.has("tenant_id")) url.searchParams.set("tenant_id", tenantId);
  let body = init.body;
  const headers = plainHeaders(init.headers);
  const contentType = Object.entries(headers)
    .find(([key]) => key.toLowerCase() === "content-type")?.[1];
  if (typeof body === "string" && String(contentType ?? "").toLowerCase().includes("application/json")) {
    try {
      body = JSON.stringify(bindJsonTenant(JSON.parse(body), tenantId));
    } catch {
      // Preserve malformed input so the API remains the validation authority.
    }
  }
  return {
    input: absolute ? url.href : `${url.pathname}${url.search}${url.hash}`,
    init: body === init.body ? init : { ...init, body }
  };
}

function principalWithSession(basePrincipal, domain, envelope = readLawosSessionEnvelope()) {
  if (!envelope) return basePrincipal;
  return {
    ...basePrincipal,
    user_id: envelope.actor_ref,
    tenant_id: tenantRefForDomain(envelope, domain, basePrincipal.tenant_id),
    role_ids: envelope.role_ids.length > 0 ? envelope.role_ids : basePrincipal.role_ids,
    session_context_ref: envelope.session_ref,
    session_source_ref: envelope.source,
    session_principal_source: "desktop_web_session_envelope"
  };
}

function actorRefForDomain(_domain, fallbackActorId) {
  return readLawosSessionEnvelope()?.actor_ref ?? fallbackActorId;
}

function permissionContextFor(ctx, contexts, domain) {
  const envelope = readLawosSessionEnvelope();
  const requestedMode = SAFE_REVIEW_STATES.has(ctx) ? ctx : "allow";
  const effectiveMode =
    envelope && requestedMode === "allow" && envelope.review_state !== "allow"
      ? envelope.review_state
      : requestedMode;
  const baseContext = contexts[effectiveMode] ?? contexts.allow;
  return {
    ...baseContext,
    principal: principalWithSession(baseContext.principal, domain, envelope),
    rules: [...(baseContext.rules ?? [])],
    object_acl: [...(baseContext.object_acl ?? [])]
  };
}

const CRM_INTAKE_PERMISSION_CONTEXTS = {
  allow: {
    principal: CRM_INTAKE_PRINCIPAL,
    rules: [{ id: "rule_crm_intake_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: CRM_INTAKE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: CRM_INTAKE_PRINCIPAL,
    rules: [{ id: "rule_crm_intake_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const FINANCE_PERMISSION_CONTEXTS = {
  allow: {
    principal: FINANCE_PRINCIPAL,
    rules: [{ id: "rule_finance_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: FINANCE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: FINANCE_PRINCIPAL,
    rules: [{ id: "rule_finance_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

function financePermissionContext(ctx = "allow", roleIds = null) {
  const base = FINANCE_PERMISSION_CONTEXTS[ctx] ?? FINANCE_PERMISSION_CONTEXTS.allow;
  if (!Array.isArray(roleIds) || roleIds.length === 0) return base;
  return {
    ...base,
    principal: {
      ...base.principal,
      role_ids: roleIds
    }
  };
}

const ANALYTICS_PERMISSION_CONTEXTS = {
  allow: {
    principal: ANALYTICS_PRINCIPAL,
    rules: [{ id: "rule_analytics_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: ANALYTICS_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: ANALYTICS_PRINCIPAL,
    rules: [{ id: "rule_analytics_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const AI_PERMISSION_CONTEXTS = {
  allow: {
    principal: AI_PRINCIPAL,
    rules: [{ id: "rule_ai_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: AI_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: AI_PRINCIPAL,
    rules: [{ id: "rule_ai_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const PORTAL_PERMISSION_CONTEXTS = {
  allow: {
    principal: PORTAL_PRINCIPAL,
    rules: [{ id: "rule_portal_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: PORTAL_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: PORTAL_PRINCIPAL,
    rules: [{ id: "rule_portal_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const UI_READINESS_PERMISSION_CONTEXTS = {
  allow: {
    principal: UI_READINESS_PRINCIPAL,
    rules: [{ id: "rule_ui_readiness_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: UI_READINESS_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: UI_READINESS_PRINCIPAL,
    rules: [{ id: "rule_ui_readiness_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const ENTERPRISE_PERMISSION_CONTEXTS = {
  allow: {
    principal: ENTERPRISE_PRINCIPAL,
    rules: [{ id: "rule_enterprise_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: ENTERPRISE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: ENTERPRISE_PRINCIPAL,
    rules: [{ id: "rule_enterprise_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const ADMIN_PERMISSION_CONTEXTS = {
  allow: {
    principal: ADMIN_PERMISSION_PRINCIPAL,
    rules: [{ id: "rule_admin_permission_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: ADMIN_PERMISSION_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: ADMIN_PERMISSION_PRINCIPAL,
    rules: [{ id: "rule_admin_permission_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const DATA_CLOUD_PERMISSION_CONTEXTS = {
  allow: {
    principal: DATA_CLOUD_PRINCIPAL,
    rules: [{ id: "rule_data_cloud_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: DATA_CLOUD_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: DATA_CLOUD_PRINCIPAL,
    rules: [{ id: "rule_data_cloud_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const REPORT_PERMISSION_CONTEXTS = {
  allow: {
    principal: REPORT_PRINCIPAL,
    rules: [{ id: "rule_report_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: REPORT_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: REPORT_PRINCIPAL,
    rules: [{ id: "rule_report_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

function clientFixedReportPermissionContexts(operation) {
  const actions = operation === "export"
    ? ["analytics:client:read", "analytics:client:export"]
    : ["analytics:client:read"];
  return {
    allow: {
      principal: REPORT_PRINCIPAL,
      rules: actions.map((action, index) => ({
        id: `rule_client_fixed_report_allow_${index + 1}`,
        effect: "allow",
        action
      })),
      object_acl: []
    },
    denied: {
      principal: REPORT_PRINCIPAL,
      rules: [],
      object_acl: []
    },
    review: {
      principal: REPORT_PRINCIPAL,
      rules: actions.map((action, index) => ({
        id: `rule_client_fixed_report_review_${index + 1}`,
        effect: "review_required",
        action
      })),
      object_acl: []
    }
  };
}

// Gated master-data responses (200/403/...) share this 8-key shape. Other
// statuses (404 unknown route, 405, 500) use a smaller shape and must parse
// to an explicit error — never assume the full shape unconditionally.
const GATED_RESPONSE_KEYS = [
  "request_id",
  "outcome",
  "items",
  "page_info",
  "safe_error_codes",
  "omitted_fields",
  "audit_hint_ref",
  "ui_state"
];

export async function fetchMasterDataRecords({
  ctx = "allow",
  modelType = null,
  filters = null,
  limit = 25,
  cursor = null,
  permissionRef = DEFAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, PERMISSION_CONTEXTS, "client");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("client", TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });
  if (modelType) params.set("model_type", modelType);
  if (cursor) params.set("cursor", String(cursor));
  if (filters && typeof filters === "object" && !Array.isArray(filters)) {
    params.set("filters", JSON.stringify(filters));
  }

  let body;
  try {
    const response = await apiFetch(`/master-data/records?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasGatedShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    GATED_RESPONSE_KEYS.every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasGatedShape) {
    return { kind: "error" };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item ?? null,
    items: body.items,
    summary: body.summary ?? null,
    pageInfo: body.page_info,
    safeErrorCodes: body.safe_error_codes,
    omittedFields: body.omitted_fields,
    auditHintRef: body.audit_hint_ref
  };
}

const CLIENT_GROUP_CLIENT_TYPES = new Set(["person", "organization"]);

function clientGroupText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clientGroupClientPayload(client) {
  if (!client || typeof client !== "object" || Array.isArray(client)) return null;
  const clientType = clientGroupText(client.client_type);
  const displayName = clientGroupText(client.display_name);
  if (!CLIENT_GROUP_CLIENT_TYPES.has(clientType) || !displayName) return null;
  const payload = {
    client_type: clientType,
    display_name: displayName
  };
  for (const key of [
    "legal_form",
    "registration_number",
    "email",
    "phone",
    "depositor_alias"
  ]) {
    const value = clientGroupText(client[key]);
    if (value) payload[key] = value;
  }
  return payload;
}

function clientGroupSafeErrorCodes(body) {
  return Array.isArray(body?.safe_error_codes)
    && body.safe_error_codes.every((code) => typeof code === "string")
    ? body.safe_error_codes
    : null;
}

function clientGroupGuardedUiState(response, body) {
  const uiState = clientGroupText(body?.ui_state);
  const outcome = clientGroupText(body?.outcome);
  if (uiState === "review" || uiState === "review_required" || outcome === "review_required") {
    return "review_required";
  }
  if (response?.status === 403 || uiState === "denied" || outcome === "denied") {
    return "denied";
  }
  return "error";
}

function clientGroupGuardedResult(response, body, safeErrorCodes) {
  return {
    kind: "guarded",
    status: Number(response?.status ?? 0) || 0,
    outcome: clientGroupText(body?.outcome) || "blocked",
    uiState: clientGroupGuardedUiState(response, body),
    item: null,
    safeErrorCodes,
    auditHintRef: clientGroupText(body?.audit_hint_ref) || null
  };
}

function validClientGroupReviewItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (typeof item.review_digest !== "string" || !item.review_digest.trim()) return false;
  if (!Array.isArray(item.candidates)) return false;
  if (typeof item.has_restricted_candidates !== "boolean") return false;
  if (typeof item.can_create !== "boolean") return false;
  if (typeof item.requires_distinct_confirmation !== "boolean") return false;
  return item.candidates.every((candidate) => (
    candidate
    && typeof candidate === "object"
    && !Array.isArray(candidate)
    && typeof candidate.client_group_id === "string"
    && candidate.client_group_id.trim()
    && typeof candidate.display_name === "string"
    && candidate.display_name.trim()
    && CLIENT_GROUP_CLIENT_TYPES.has(candidate.client_type)
    && Array.isArray(candidate.reasons)
    && candidate.reasons.every((reason) => typeof reason === "string" && reason.trim())
  ));
}

function validClientGroupCreateItem(item) {
  return Boolean(
    item
    && typeof item === "object"
    && !Array.isArray(item)
    && typeof item.client_group_id === "string"
    && item.client_group_id.trim()
    && typeof item.display_name === "string"
    && item.display_name.trim()
    && CLIENT_GROUP_CLIENT_TYPES.has(item.client_type)
    && typeof item.depositor_alias_saved === "boolean"
    && typeof item.registration_number_saved === "boolean"
    && typeof item.contact_saved === "boolean"
  );
}

async function postClientGroupMutation({
  path,
  client,
  reviewDigest = null,
  confirmDistinctClient = null,
  idempotencyKey,
  permissionRef,
  auditHintRef,
  ctx = "allow"
} = {}) {
  const normalizedClient = clientGroupClientPayload(client);
  if (!normalizedClient) return { kind: "error", status: 0, safeErrorCodes: [] };
  const context = permissionContextFor(ctx, PERMISSION_CONTEXTS, "client");
  const payload = {
    tenant_id: tenantIdForDomain("client", TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    idempotency_key: clientGroupText(idempotencyKey) || `ui:client-group:${Date.now()}`,
    client: normalizedClient
  };
  if (reviewDigest !== null) payload.review_digest = clientGroupText(reviewDigest);
  if (confirmDistinctClient !== null) payload.confirm_distinct_client = confirmDistinctClient === true;

  let response;
  let body;
  try {
    response = await apiFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error", status: 0, safeErrorCodes: [] };
  }

  const safeErrorCodes = clientGroupSafeErrorCodes(body);
  const outcome = clientGroupText(body?.outcome);
  if (!body || typeof body !== "object" || Array.isArray(body) || !outcome || !safeErrorCodes) {
    return { kind: "error", status: Number(response?.status ?? 0) || 0, safeErrorCodes: safeErrorCodes ?? [] };
  }
  if (!response.ok || !["passed", "review_required"].includes(outcome)) {
    return clientGroupGuardedResult(response, body, safeErrorCodes);
  }

  // A permission-context review gate may intentionally withhold the review
  // item. Preserve that review state without treating the gated response as
  // a malformed success payload.
  if (outcome === "review_required" && (!body.item || !validClientGroupReviewItem(body.item))) {
    return clientGroupGuardedResult(response, body, safeErrorCodes);
  }

  if (path.endsWith("/review")) {
    if (!validClientGroupReviewItem(body.item)) {
      return { kind: "error", status: Number(response.status) || 0, safeErrorCodes };
    }
    return {
      kind: "data",
      status: Number(response.status) || 0,
      outcome,
      uiState: body.ui_state ?? null,
      item: body.item,
      safeErrorCodes,
      auditHintRef: clientGroupText(body.audit_hint_ref) || null,
      requestId: clientGroupText(body.request_id) || null
    };
  }

  if (outcome !== "passed") {
    return clientGroupGuardedResult(response, body, safeErrorCodes);
  }
  if (typeof body.replayed !== "boolean" || !validClientGroupCreateItem(body.item)) {
    return { kind: "error", status: Number(response.status) || 0, safeErrorCodes };
  }
  return {
    kind: "data",
    status: Number(response.status) || 0,
    outcome,
    uiState: body.ui_state ?? null,
    item: body.item,
    replayed: body.replayed,
    safeErrorCodes,
    auditHintRef: clientGroupText(body.audit_hint_ref) || null,
    requestId: clientGroupText(body.request_id) || null
  };
}

export function reviewClientGroup({
  client,
  idempotencyKey,
  ctx = "allow",
  permissionRef = CLIENT_GROUP_REVIEW_PERMISSION_REF,
  auditHintRef = CLIENT_GROUP_REVIEW_AUDIT_HINT_REF
} = {}) {
  return postClientGroupMutation({
    path: "/master-data/client-groups/review",
    client,
    idempotencyKey,
    permissionRef,
    auditHintRef,
    ctx
  });
}

export function createClientGroup({
  client,
  reviewDigest,
  confirmDistinctClient = false,
  idempotencyKey,
  ctx = "allow",
  permissionRef = CLIENT_GROUP_CREATE_PERMISSION_REF,
  auditHintRef = CLIENT_GROUP_CREATE_AUDIT_HINT_REF
} = {}) {
  if (!clientGroupText(reviewDigest)) return Promise.resolve({ kind: "error", status: 0, safeErrorCodes: [] });
  return postClientGroupMutation({
    path: "/master-data/client-groups",
    client,
    reviewDigest,
    confirmDistinctClient,
    idempotencyKey,
    permissionRef,
    auditHintRef,
    ctx
  });
}

export async function fetchUserProfile({
  ctx = "allow",
  permissionRef = DEFAULT_PROFILE_PERMISSION_REF,
  auditHintRef = DEFAULT_PROFILE_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, PERMISSION_CONTEXTS, "client");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("client", TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let response;
  let body;
  try {
    response = await apiFetch(`/api/profile/me?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error" };
  }

  const hasProfileShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.safe_error_codes);
  if (!hasProfileShape) return { kind: "error", uiState: "error" };

  if (!response.ok || body.outcome !== "passed") {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      uiState: guardedApiUiState(response, body),
      item: null,
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref,
      countLeakPrevented: body.count_leak_prevented === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: body.item ? "data" : "empty",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.item ? body.ui_state : "empty",
    item: body.item ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

const EXPLICIT_PERMISSION_DENIAL_CODES = new Set([
  "HOME_UNAUTHORIZED_OMISSION",
  "PROFILE_PERMISSION_DENIED"
]);

export function guardedApiUiState(response, body) {
  const status = Number(response?.status ?? 0);
  const uiState = typeof body?.ui_state === "string" ? body.ui_state : "";
  const outcome = typeof body?.outcome === "string" ? body.outcome : "";
  const safeErrorCodes = Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [];

  if (
    status >= 200 &&
    status < 500 &&
    (uiState === "review" || uiState === "review_required" || outcome === "review_required")
  ) {
    return uiState === "review" ? "review" : "review_required";
  }
  if (
    status === 403 &&
    uiState === "denied" &&
    safeErrorCodes.some((code) => EXPLICIT_PERMISSION_DENIAL_CODES.has(code))
  ) {
    return "denied";
  }
  return "error";
}

function homeDashboardQuery({
  ctx = "allow",
  permissionRef = DEFAULT_HOME_PERMISSION_REF,
  auditHintRef = DEFAULT_HOME_AUDIT_HINT_REF,
  extra = {}
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("vault", VAULT_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return { context, params };
}

function guardedHomeResult(response, body) {
  return {
    kind: "guarded",
    status: response?.status ?? 0,
    requestId: body?.request_id ?? null,
    outcome: body?.outcome ?? "blocked",
    uiState: guardedApiUiState(response, body),
    items: [],
    events: [],
    entries: [],
    counts: body?.counts ?? { approval: 0, task_late: 0, task_today: 0 },
    safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [],
    auditHintRef: body?.audit_hint_ref ?? null,
    countLeakPrevented: body?.count_leak_prevented === true,
    productionReadyClaim: body?.production_ready_claim === true
  };
}

export async function fetchHomeActionInbox({
  type = "approval",
  role = null,
  ctx = "allow",
  permissionRef = DEFAULT_HOME_PERMISSION_REF,
  auditHintRef = DEFAULT_HOME_AUDIT_HINT_REF
} = {}) {
  const { context, params } = homeDashboardQuery({
    ctx,
    permissionRef,
    auditHintRef,
    extra: { type, role }
  });
  let response;
  let body;
  try {
    response = await apiFetch(`/api/home/action-inbox?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", items: [], counts: { approval: 0, task_late: 0, task_today: 0 } };
  }

  const hasActionInboxShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "counts", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasActionInboxShape) return guardedHomeResult(response, body);
  if (!response.ok || body.outcome !== "passed") return guardedHomeResult(response, body);
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state ?? "populated",
    items: body.items,
    counts: body.counts,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function decideHomeActionInboxItem({
  id,
  action,
  reason = null,
  idempotencyKey = null,
  ctx = "allow",
  permissionRef = DEFAULT_HOME_PERMISSION_REF,
  auditHintRef = DEFAULT_HOME_AUDIT_HINT_REF
} = {}) {
  const { context } = homeDashboardQuery({ ctx, permissionRef, auditHintRef });
  const bodyPayload = {
    tenant_id: tenantIdForDomain("vault", VAULT_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    action,
    reason,
    idempotency_key: idempotencyKey ?? `home-${id}-${action}`
  };
  let response;
  let body;
  try {
    response = await apiFetch(`/api/home/action-inbox/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(bodyPayload)
    });
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error" };
  }
  const hasDecisionShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "safe_error_codes", "audit_hint_ref", "production_ready_claim"].every((key) => key in body);
  if (!hasDecisionShape) return { kind: "error", uiState: "error" };
  if (!response.ok) return guardedHomeResult(response, body);
  return {
    kind: "data",
    status: response.status,
    requestId: body.request_id,
    outcome: body.outcome,
    item: body.item ?? null,
    decision: body.decision ?? null,
    auditEvent: body.audit_event ?? null,
    undoExpiresAt: body.undo_expires_at ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchHomeAgenda({
  from,
  to,
  ctx = "allow",
  permissionRef = DEFAULT_HOME_PERMISSION_REF,
  auditHintRef = DEFAULT_HOME_AUDIT_HINT_REF
} = {}) {
  const { context, params } = homeDashboardQuery({
    ctx,
    permissionRef,
    auditHintRef,
    extra: { from, to }
  });
  let response;
  let body;
  try {
    response = await apiFetch(`/api/home/agenda?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", events: [] };
  }
  const hasAgendaShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "events", "safe_error_codes", "audit_hint_ref", "production_ready_claim"].every((key) => key in body) &&
    Array.isArray(body.events);
  if (!hasAgendaShape) return guardedHomeResult(response, body);
  if (!response.ok || body.outcome !== "passed") return guardedHomeResult(response, body);
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    events: body.events,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchHomeFeed({
  tab = "notice",
  ctx = "allow",
  permissionRef = DEFAULT_HOME_PERMISSION_REF,
  auditHintRef = DEFAULT_HOME_AUDIT_HINT_REF
} = {}) {
  const { context, params } = homeDashboardQuery({
    ctx,
    permissionRef,
    auditHintRef,
    extra: { tab }
  });
  let response;
  let body;
  try {
    response = await apiFetch(`/api/home/feed?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", entries: [] };
  }
  const hasFeedShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "entries", "safe_error_codes", "audit_hint_ref", "production_ready_claim"].every((key) => key in body) &&
    Array.isArray(body.entries);
  if (!hasFeedShape) return guardedHomeResult(response, body);
  if (!response.ok) return guardedHomeResult(response, body);
  return {
    kind: body.entries.length > 0 ? "data" : "empty",
    requestId: body.request_id,
    outcome: body.outcome,
    entries: body.entries,
    sourceStatuses: body.source_statuses ?? [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterRecords({
  ctx = "allow",
  limit = 100,
  maxPages = 20,
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const items = [];
  let body = null;
  let cursor = null;
  let pageCount = 0;
  try {
    do {
      const params = new URLSearchParams({
        tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
        permission_ref: permissionRef,
        audit_hint_ref: auditHintRef,
        limit: String(limit)
      });
      if (cursor) params.set("cursor", cursor);
      const response = await apiFetch(`/api/matters?${params.toString()}`, {
        headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
      });
      body = await response.json();
      const hasMatterShape =
        body !== null &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
          .every((key) => key in body) &&
        Array.isArray(body.items);
      if (!hasMatterShape) return { kind: "error" };
      items.push(...body.items);
      cursor = body.page_info?.next_cursor ?? null;
      pageCount += 1;
    } while (cursor && pageCount < maxPages);
  } catch {
    return { kind: "error" };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items,
    pageInfo: body.page_info ? { ...body.page_info, returned_count: items.length } : null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterClients({
  ctx = "allow",
  limit = 100,
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const items = [];
  let body = null;
  let cursor = null;
  let pageCount = 0;
  try {
    do {
      const params = new URLSearchParams({
        tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
        permission_ref: permissionRef,
        audit_hint_ref: auditHintRef,
        limit: String(limit)
      });
      if (cursor) params.set("cursor", cursor);
      const response = await apiFetch(`/api/matters/clients?${params.toString()}`, {
        headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
      });
      body = await response.json();
      const hasClientShape =
        body !== null &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
          .every((key) => key in body) &&
        Array.isArray(body.items);
      if (!hasClientShape) return { kind: "error" };
      items.push(...body.items);
      cursor = body.page_info?.next_cursor ?? null;
      pageCount += 1;
    } while (cursor && pageCount < 20);
  } catch {
    return { kind: "error" };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items,
    pageInfo: body.page_info ? { ...body.page_info, returned_count: items.length } : null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterListViews({
  ctx = "allow",
  limit = 10,
  permissionRef = "ui_sf_b_w02_list_views",
  auditHintRef = "ui_sf_b_w02_list_views_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });

  let body;
  try {
    const response = await apiFetch(`/api/matters/list-views?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasListViewShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasListViewShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterRecentlyViewed({
  ctx = "allow",
  limit = 5,
  permissionRef = "ui_sf_b_w02_recently_viewed",
  auditHintRef = "ui_sf_b_w02_recently_viewed_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });

  let body;
  try {
    const response = await apiFetch(`/api/matters/recently-viewed?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasRecentShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasRecentShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export const MATTER_WORKTREE_UI_STATES = Object.freeze({
  loading: "loading",
  data: "data",
  empty: "empty",
  denied: "denied",
  error: "error",
  conflict: "conflict"
});

export function createMatterWorktreeUiState() {
  return { kind: MATTER_WORKTREE_UI_STATES.loading };
}

function matterWorktreeResult(response, body) {
  const status = Number(response?.status ?? 0);
  const etag = response?.headers?.get?.("etag") ?? body?.etag ?? null;
  const etagVersion = Number.parseInt(String(etag ?? "").replaceAll('"', ""), 10);
  const base = {
    status,
    safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [],
    countLeakPrevented: body?.count_leak_prevented === true,
    requestId: body?.request_id ?? null
  };
  if ([401, 403, 404].includes(status)) return { kind: MATTER_WORKTREE_UI_STATES.denied, ...base };
  if (status === 409) {
    return {
      kind: MATTER_WORKTREE_UI_STATES.conflict,
      ...base,
      currentVersion: body?.current_version ?? null,
      item: body?.item ?? null
    };
  }
  if (!response?.ok || !body || typeof body !== "object" || Array.isArray(body)) {
    return { kind: MATTER_WORKTREE_UI_STATES.error, ...base };
  }
  const item = body.item ?? null;
  const kind = item === null ? MATTER_WORKTREE_UI_STATES.empty : MATTER_WORKTREE_UI_STATES.data;
  return {
    kind,
    ...base,
    item,
    items: Array.isArray(body.items) ? body.items : [],
    etag,
    currentVersion: body.current_version ?? body.worktree_version ?? item?.version ?? (Number.isInteger(etagVersion) ? etagVersion : null),
    idempotentReplay: body.idempotent_replay === true,
    archivedNodeIds: Array.isArray(body.archived_node_ids) ? body.archived_node_ids : []
  };
}

async function matterWorktreeRequest({ method = "GET", path, payload, ctx = "allow", query = false } = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
    permission_ref: payload?.permission_ref ?? DEFAULT_MATTER_PERMISSION_REF,
    audit_hint_ref: payload?.audit_hint_ref ?? DEFAULT_MATTER_AUDIT_HINT_REF
  });
  try {
    const response = await apiFetch(query ? `${path}?${params.toString()}` : path, {
      method,
      headers: {
        ...(method === "GET" ? {} : { "content-type": "application/json" }),
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(payload ?? {}) })
    });
    return matterWorktreeResult(response, await response.json());
  } catch {
    return { kind: MATTER_WORKTREE_UI_STATES.error, status: 0, safeErrorCodes: [] };
  }
}

export function fetchMatterWorktree({ matterId, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ path: `/api/matters/${encodeURIComponent(matterId)}/worktree`, ctx, query: true });
}

export function fetchMatterWorktreeTemplates({ matterId, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ path: `/api/matters/${encodeURIComponent(matterId)}/worktree/templates`, ctx, query: true });
}

export function createMatterWorktree({ matterId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "POST", path: `/api/matters/${encodeURIComponent(matterId)}/worktree`, payload, ctx });
}

export function applyMatterWorktreeTemplate({ matterId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "POST", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/template-applications`, payload, ctx });
}

export function createMatterWorktreeNode({ matterId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "POST", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/nodes`, payload, ctx });
}

export function patchMatterWorktreeNode({ matterId, nodeId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "PATCH", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/nodes/${encodeURIComponent(nodeId)}`, payload, ctx });
}

export function deleteMatterWorktreeNode({ matterId, nodeId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "DELETE", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/nodes/${encodeURIComponent(nodeId)}`, payload, ctx });
}

export function completeMatterWorktreeTask({ matterId, taskId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "POST", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/tasks/${encodeURIComponent(taskId)}/complete`, payload, ctx });
}

export function reopenMatterWorktreeTask({ matterId, taskId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "POST", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/tasks/${encodeURIComponent(taskId)}/reopen`, payload, ctx });
}

export function unblockMatterWorktreeTask({ matterId, taskId, payload, ctx = "allow" } = {}) {
  return matterWorktreeRequest({ method: "POST", path: `/api/matters/${encodeURIComponent(matterId)}/worktree/tasks/${encodeURIComponent(taskId)}/unblock`, payload, ctx });
}

async function writeMatterRuntime({ method = "POST", path, payload, ctx = "allow", contextOverride = null } = {}) {
  const context = contextOverride ?? permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  let body;
  try {
    const response = await apiFetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    statusOutcome: body.outcome,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    matter: body.matter ?? null,
    matterParties: body.matter_parties ?? [],
    adverseParties: body.adverse_parties ?? [],
    ownerAssignment: body.owner_assignment ?? null,
    fieldPatch: body.field_patch ?? null,
    transition: body.transition ?? null,
    bulkAction: body.bulk_action ?? null,
    auditEvent: body.audit_event ?? null,
    timelineEvent: body.timeline_event ?? null,
    deadlineChangeRequest: body.deadline_change_request ?? null,
    confirmation: body.confirmation ?? null,
    providerState: body.provider_state ?? null,
    approvalRequest: body.approval_request ?? null,
    publishState: body.publish_state ?? null,
    preview: body.preview ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    message: body.message ?? null,
    onboardingGate: body.onboarding_gate ?? null,
    idempotentReplay: body.idempotent_replay === true,
    stateIdempotent: body.state_idempotent === true,
    uiState: body.ui_state ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function postMatterRuntime({ path, payload, ctx = "allow", contextOverride = null } = {}) {
  return writeMatterRuntime({ method: "POST", path, payload, ctx, contextOverride });
}

function patchMatterRuntime({ path, payload, ctx = "allow" } = {}) {
  return writeMatterRuntime({ method: "PATCH", path, payload, ctx });
}

async function fetchMatterRuntimeCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.items)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchMatterRuntimeItem({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("item" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function adminPermissionPayload(overrides = {}) {
  return {
    tenant_id: ADMIN_PERMISSION_TENANT_ID,
    permission_ref: DEFAULT_ADMIN_PERMISSION_REF,
    audit_hint_ref: DEFAULT_ADMIN_AUDIT_HINT_REF,
    actor_id: ADMIN_PERMISSION_PRINCIPAL.user_id,
    ...overrides
  };
}

function normalizeAdminPermissionBody(body = {}) {
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome ?? null,
    statusOutcome: body.outcome ?? null,
    uiState: body.ui_state ?? null,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    idempotentReplay: body.idempotent_replay === true,
    physicalSchemaMutated: body.physical_schema_mutated === true,
    physicalSchemaMutationAllowed: body.physical_schema_mutation_allowed === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchAdminPermissionCollection({ path, ctx = "allow" } = {}) {
  const context = ADMIN_PERMISSION_CONTEXTS[ctx] ?? ADMIN_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ADMIN_PERMISSION_TENANT_ID,
    permission_ref: DEFAULT_ADMIN_PERMISSION_REF,
    audit_hint_ref: DEFAULT_ADMIN_AUDIT_HINT_REF
  });

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeAdminPermissionBody(body);
}

async function writeAdminPermissionRuntime({ method = "POST", path, payload, ctx = "allow" } = {}) {
  const context = ADMIN_PERMISSION_CONTEXTS[ctx] ?? ADMIN_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await apiFetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(adminPermissionPayload(payload))
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeAdminPermissionBody(body);
}

export function fetchPermissionSets({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/permission-sets", ctx });
}

export function createPermissionSet({
  permissionSetId = `permission_set_ui_${Date.now()}`,
  label = "Client Matter 검토 권한",
  description = "Client와 Matter 작업면 검토 권한",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    path: "/api/admin/permission-sets",
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-set:create:${permissionSetId}`,
      permission_set_id: permissionSetId,
      label,
      description,
      rule_refs: ["client:read", "matter:read", "audit:read"],
      object_acl_refs: ["Client", "Matter"]
    }
  });
}

export function patchPermissionSet({
  permissionSetId = "permission_set_client_matter_reviewer",
  label = "Client Matter 검토 권한 갱신",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    method: "PATCH",
    path: `/api/admin/permission-sets/${encodeURIComponent(permissionSetId)}`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-set:patch:${permissionSetId}:${Date.now()}`,
      patch: {
        label,
        description: "승인 검토가 필요한 권한 세트 변경",
        rule_refs: ["client:read", "matter:read", "audit:read"]
      }
    }
  });
}

export function fetchPermissionAssignments({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/permission-assignments", ctx });
}

export function assignPermissionSet({
  permissionSetId = "permission_set_client_matter_reviewer",
  targetLabel = "Client Matter 검토 그룹",
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  return writeAdminPermissionRuntime({
    path: "/api/admin/permission-assignments",
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-assignment:${permissionSetId}:${stamp}`,
      assignment_id: `permission_assignment_ui_${stamp}`,
      permission_set_id: permissionSetId,
      target_actor_ref: "actor:ui-review-group",
      target_label: targetLabel
    }
  });
}

export function revokePermissionSetAssignment({
  assignmentId = "permission_assignment_reviewer_seed",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    method: "DELETE",
    path: `/api/admin/permission-assignments/${encodeURIComponent(assignmentId)}`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-assignment:revoke:${assignmentId}:${Date.now()}`
    }
  });
}

export function fetchObjectManagerObjects({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/object-manager/objects", ctx });
}

export function fetchObjectManagerFields({ objectName = "Client", ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({
    path: `/api/admin/object-manager/objects/${encodeURIComponent(objectName)}/fields`,
    ctx
  });
}

export function patchObjectFieldPolicy({
  objectName = "Client",
  fieldName = "status",
  visibility = "visible",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    method: "PATCH",
    path: `/api/admin/object-manager/objects/${encodeURIComponent(objectName)}/fields/${encodeURIComponent(fieldName)}`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:field-policy:${objectName}:${fieldName}:${Date.now()}`,
      visibility,
      owner_approval_required: true
    }
  });
}

export function fetchConnectedApps({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/connected-apps", ctx });
}

export function createConnectedApp({
  appId = `connected_app_ui_${Date.now()}`,
  label = "외부 캘린더 연결",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    path: "/api/admin/connected-apps",
    ctx,
    payload: {
      idempotency_key: `ui:admin:connected-app:create:${appId}`,
      app_id: appId,
      label
    }
  });
}

export function disableConnectedApp({ appId = "connected_app_microsoft_graph", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: `/api/admin/connected-apps/${encodeURIComponent(appId)}/disable`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:connected-app:disable:${appId}:${Date.now()}`
    }
  });
}

export function fetchAdminPermissionAudit({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/audit", ctx });
}

export function fetchAdminSecurityUsers({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/security/users", ctx });
}

export function disableAdminSecurityUser({ userId, reason = "관리자 비활성화", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: `/api/admin/security/users/${encodeURIComponent(userId)}/disable`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:security-user:disable:${userId}:${Date.now()}`,
      confirmed: true,
      reason,
    },
  });
}

export function reactivateAdminSecurityUser({ userId, reason = "관리자 재활성화", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: `/api/admin/security/users/${encodeURIComponent(userId)}/reactivate`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:security-user:reactivate:${userId}:${Date.now()}`,
      reason,
    },
  });
}

export function fetchAdminBreakGlassRequests({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/security/break-glass", ctx });
}

export function requestAdminBreakGlass({ requesterUserId, reason = "긴급 접근 요청", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: "/api/admin/security/break-glass",
    ctx,
    payload: {
      idempotency_key: `ui:admin:break-glass:request:${requesterUserId}:${Date.now()}`,
      requester_user_id: requesterUserId,
      reason,
    },
  });
}

export function approveAdminBreakGlass({ requestId, reason = "관리자 승인", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: `/api/admin/security/break-glass/${encodeURIComponent(requestId)}/approve`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:break-glass:approve:${requestId}:${Date.now()}`,
      reason,
    },
  });
}

export function revokeAdminBreakGlass({ requestId, reason = "관리자 철회", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: `/api/admin/security/break-glass/${encodeURIComponent(requestId)}/revoke`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:break-glass:revoke:${requestId}:${Date.now()}`,
      reason,
    },
  });
}

export function fetchAdminSecurityAudit({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/security/audit", ctx });
}

function dataCloudPayload(overrides = {}) {
  return {
    tenant_id: DATA_CLOUD_TENANT_ID,
    permission_ref: DEFAULT_DATA_CLOUD_PERMISSION_REF,
    audit_hint_ref: DEFAULT_DATA_CLOUD_AUDIT_HINT_REF,
    actor_id: DATA_CLOUD_PRINCIPAL.user_id,
    ...overrides
  };
}

function normalizeDataCloudBody(body = {}) {
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome ?? null,
    statusOutcome: body.outcome ?? null,
    uiState: body.ui_state ?? null,
    item: body.item ?? null,
    result: body.result ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    idempotentReplay: body.idempotent_replay === true,
    providerPayloadIncluded: body.provider_payload_included === true,
    rawIdentifiersIncluded: body.raw_identifiers_included === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchDataCloudCollection({ path, ctx = "allow" } = {}) {
  const context = DATA_CLOUD_PERMISSION_CONTEXTS[ctx] ?? DATA_CLOUD_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: DATA_CLOUD_TENANT_ID,
    permission_ref: DEFAULT_DATA_CLOUD_PERMISSION_REF,
    audit_hint_ref: DEFAULT_DATA_CLOUD_AUDIT_HINT_REF
  });

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !(("outcome" in body) && ("safe_error_codes" in body))) {
    return { kind: "error" };
  }
  return normalizeDataCloudBody(body);
}

async function writeDataCloudRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = DATA_CLOUD_PERMISSION_CONTEXTS[ctx] ?? DATA_CLOUD_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await apiFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(dataCloudPayload(payload))
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !(("outcome" in body) && ("safe_error_codes" in body))) {
    return { kind: "error" };
  }
  return normalizeDataCloudBody(body);
}

export function fetchDataCloudProviders({ ctx = "allow" } = {}) {
  return fetchDataCloudCollection({ path: "/api/data-cloud/providers", ctx });
}

export function createDataCloudProvider({
  providerId = `provider_ui_${Date.now()}`,
  label = "검토 대상 외부 연동",
  ctx = "allow"
} = {}) {
  return writeDataCloudRuntime({
    path: "/api/data-cloud/providers",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:provider:${providerId}`,
      provider_id: providerId,
      label,
      data_categories: ["firmographic", "relationship"]
    }
  });
}

export function createDataCloudConsentRecord({ ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeDataCloudRuntime({
    path: "/api/data-cloud/consent-records",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:consent:${stamp}`,
      consent_record_id: `consent_ui_${stamp}`,
      subject_label: "Client 보강 대상",
      data_categories: ["firmographic", "relationship"],
      lawful_basis: "owner_review_required",
      retention_policy_ref: "retention_owner_review"
    }
  });
}

export function createEnrichmentJob({ jobId = `data_cloud_job_ui_${Date.now()}`, ctx = "allow" } = {}) {
  return writeDataCloudRuntime({
    path: "/api/data-cloud/enrichment-jobs",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:job:${jobId}`,
      job_id: jobId,
      provider_id: "provider_salesforce_data_cloud",
      target_object: "Client",
      target_refs: [{ object_type: "Client", record_ref: "client-ui-record", label: "Client" }],
      data_categories: ["firmographic", "relationship"]
    }
  });
}

export function fetchEnrichmentPreview({ jobId, ctx = "allow" } = {}) {
  return fetchDataCloudCollection({
    path: `/api/data-cloud/enrichment-jobs/${encodeURIComponent(jobId)}/preview`,
    ctx
  });
}

export function executeEnrichmentJob({ jobId, ctx = "allow" } = {}) {
  return writeDataCloudRuntime({
    path: `/api/data-cloud/enrichment-jobs/${encodeURIComponent(jobId)}/execute`,
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:execute:${jobId}:${Date.now()}`
    }
  });
}

export function fetchEnrichmentResults({ ctx = "allow" } = {}) {
  return fetchDataCloudCollection({ path: "/api/data-cloud/enrichment-results", ctx });
}

export function runIdentityResolution({ ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeDataCloudRuntime({
    path: "/api/data-cloud/identity-resolution",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:identity:${stamp}`,
      identity_resolution_id: `identity_resolution_ui_${stamp}`
    }
  });
}

export function fetchUnifiedCustomerProfile({ profileId = "unified_profile_client_seed", ctx = "allow" } = {}) {
  return fetchDataCloudCollection({
    path: `/api/data-cloud/unified-profiles/${encodeURIComponent(profileId)}`,
    ctx
  });
}

export function activateDataCloudSegment({ ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeDataCloudRuntime({
    path: "/api/data-cloud/segment-activations",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:segment:${stamp}`,
      activation_id: `segment_activation_ui_${stamp}`,
      segment_label: "Client 검토 세그먼트",
      destination_label: "외부 연동 대상"
    }
  });
}

export function fetchDataCloudAudit({ ctx = "allow" } = {}) {
  return fetchDataCloudCollection({ path: "/api/data-cloud/audit", ctx });
}

function importDataPayload(overrides = {}) {
  return {
    tenant_id: MATTER_TENANT_ID,
    permission_ref: "ui_sf_b_w05_import_data_mapping",
    audit_hint_ref: "ui_sf_b_w05_import_data_mapping_probe",
    actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
    ...overrides
  };
}

async function fetchImportDataCollection({ path, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("matter", MATTER_TENANT_ID),
    permission_ref: "ui_sf_b_w05_import_data_mapping",
    audit_hint_ref: "ui_sf_b_w05_import_data_mapping_probe"
  });

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.items)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: body.items,
    blockedTargets: Array.isArray(body.blocked_targets) ? body.blocked_targets : [],
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchClientMatterImportTargets({ ctx = "allow" } = {}) {
  return fetchImportDataCollection({ path: "/api/import-targets", ctx });
}

export function fetchClientMatterImportJobs({ ctx = "allow" } = {}) {
  return fetchImportDataCollection({ path: "/api/import-jobs", ctx });
}

export function createClientMatterImportJob({ targetObject = "crm_account_facade", jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: "/api/import-jobs",
    ctx,
    payload: importDataPayload({
      idempotency_key: `ui-sf-b-w05-create-${jobId}`,
      job_id: jobId,
      target_object: targetObject,
      source_type: "csv_manifest"
    })
  });
}

function importSourceColumns(targetObject) {
  if (targetObject === "matter_runtime_patch") {
    return {
      columns: [
        { source_field: "matter_title", label: "Matter 제목" },
        { source_field: "matter_risk", label: "위험도" }
      ],
      sample_rows: [{ matter_title: "redacted by API", matter_risk: "standard" }]
    };
  }
  return {
    columns: [
      { source_field: "company_name", label: "회사명" },
      { source_field: "account_status", label: "상태" }
    ],
    sample_rows: [{ company_name: "redacted by API", account_status: "active" }]
  };
}

function importFieldMappings(targetObject) {
  if (targetObject === "matter_runtime_patch") {
    return [
      { source_field: "matter_title", target_field: "title" },
      { source_field: "matter_risk", target_field: "risk_level" }
    ];
  }
  return [
    { source_field: "company_name", target_field: "display_name" },
    { source_field: "account_status", target_field: "status" }
  ];
}

export function stageImportSourceFile({ jobId = "import_job_ui_sf_b_w05", targetObject = "crm_account_facade", ctx = "allow" } = {}) {
  const source = importSourceColumns(targetObject);
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/source-files`,
    ctx,
    payload: importDataPayload({
      idempotency_key: `ui-sf-b-w05-stage-${jobId}`,
      source_file: {
        file_name: "client-matter-import.csv",
        mime_type: "text/csv",
        row_count: 12,
        columns: source.columns,
        sample_rows: source.sample_rows
      }
    })
  });
}

export function fetchClientMatterImportPreview({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return fetchMatterRuntimeItem({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/preview`,
    ctx,
    permissionRef: "ui_sf_b_w05_import_data_mapping",
    auditHintRef: "ui_sf_b_w05_import_data_mapping_probe"
  });
}

export function saveImportFieldMapping({ jobId = "import_job_ui_sf_b_w05", targetObject = "crm_account_facade", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/field-mappings`,
    ctx,
    payload: importDataPayload({
      idempotency_key: `ui-sf-b-w05-mapping-${jobId}`,
      field_mappings: importFieldMappings(targetObject)
    })
  });
}

export function dryRunClientMatterImport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/dry-run`,
    ctx,
    payload: importDataPayload({ idempotency_key: `ui-sf-b-w05-dry-run-${jobId}` })
  });
}

export function executeClientMatterImport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/execute`,
    ctx,
    payload: importDataPayload({ idempotency_key: `ui-sf-b-w05-execute-${jobId}` })
  });
}

export function rollbackClientMatterImport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/rollback`,
    ctx,
    payload: importDataPayload({ idempotency_key: `ui-sf-b-w05-rollback-${jobId}` })
  });
}

export function fetchClientMatterImportErrorReport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return fetchImportDataCollection({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/error-report`,
    ctx
  });
}

function normalizeRecordActionObject(objectName) {
  const key = String(objectName ?? "").trim().toLowerCase().replace(/[-\s]/g, "_");
  if (["matter", "matters"].includes(key)) return "matter";
  if (["client", "clients", "client_group", "clientgroup"].includes(key)) return "client";
  if (["account", "accounts"].includes(key)) return "account";
  if (["contact", "contacts"].includes(key)) return "contact";
  return "matter";
}

function recordActionRuntime(objectName, ctx = "allow") {
  const normalized = normalizeRecordActionObject(objectName);
  if (normalized === "matter") {
    return {
      objectName: normalized,
      tenantId: tenantIdForDomain("matter", MATTER_TENANT_ID),
      principal: MATTER_PRINCIPAL,
      context: permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter"),
      permissionRef: "ui_sf_b_w02_record_actions_matter",
      auditHintRef: "ui_sf_b_w02_record_actions_matter_probe"
    };
  }
  if (normalized === "client") {
    return {
      objectName: normalized,
      tenantId: tenantIdForDomain("client", TENANT_ID),
      principal: PRINCIPAL,
      context: permissionContextFor(ctx, PERMISSION_CONTEXTS, "client"),
      permissionRef: "ui_sf_b_w02_record_actions_client",
      auditHintRef: "ui_sf_b_w02_record_actions_client_probe"
    };
  }
  return {
    objectName: normalized,
    tenantId: CRM_INTAKE_TENANT_ID,
    principal: CRM_INTAKE_PRINCIPAL,
    context: permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm"),
    permissionRef: "ui_sf_b_w02_record_actions_client",
    auditHintRef: "ui_sf_b_w02_record_actions_client_probe"
  };
}

function recordActionActorDomain(objectName) {
  const normalized = normalizeRecordActionObject(objectName);
  if (normalized === "matter") return "matter";
  if (normalized === "client") return "client";
  return "crm";
}

function normalizeRecordActionBody(body = {}) {
  return {
    kind: "data",
    statusOutcome: body.outcome ?? null,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    fieldPatch: body.field_patch ?? null,
    bulkAction: body.bulk_action ?? null,
    auditEvent: body.audit_event ?? null,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    stateIdempotent: body.state_idempotent === true,
    uiState: body.ui_state ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchRecordActionRuntime({ objectName, suffix, ctx = "allow" } = {}) {
  const runtime = recordActionRuntime(objectName, ctx);
  const params = new URLSearchParams({
    tenant_id: runtime.tenantId,
    permission_ref: runtime.permissionRef,
    audit_hint_ref: runtime.auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/record-actions/${runtime.objectName}${suffix}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(runtime.context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeRecordActionBody(body);
}

async function writeRecordActionRuntime({ objectName, suffix, payload, ctx = "allow" } = {}) {
  const runtime = recordActionRuntime(objectName, ctx);
  let body;
  try {
    const response = await apiFetch(`/api/record-actions/${runtime.objectName}${suffix}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(runtime.context)
      },
      body: JSON.stringify({
        tenant_id: runtime.tenantId,
        permission_ref: runtime.permissionRef,
        audit_hint_ref: runtime.auditHintRef,
        actor_id: actorRefForDomain(recordActionActorDomain(objectName), runtime.principal.user_id),
        ...payload
      })
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeRecordActionBody(body);
}

export function fetchRecordActionFields({ objectName = "matter", ctx = "allow" } = {}) {
  return fetchRecordActionRuntime({ objectName, suffix: "/fields", ctx });
}

export function fetchRecordBulkActions({ objectName = "matter", ctx = "allow" } = {}) {
  return fetchRecordActionRuntime({ objectName, suffix: "/bulk-actions", ctx });
}

export function fetchRecordActionAudit({ objectName = "matter", recordId, ctx = "allow" } = {}) {
  return fetchRecordActionRuntime({ objectName, suffix: `/${encodeURIComponent(recordId)}/audit`, ctx });
}

export function updateRecordActionField({ objectName = "matter", recordId, fieldUpdates = {}, ctx = "allow" } = {}) {
  const safeRecordId = String(recordId ?? "record").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return writeRecordActionRuntime({
    objectName,
    suffix: `/${encodeURIComponent(recordId)}/field-update`,
    payload: {
      idempotency_key: `ui:record-action:${normalizeRecordActionObject(objectName)}:${safeRecordId}:field:${stamp}`,
      field_updates: fieldUpdates,
      reason: "record_field_update"
    },
    ctx
  });
}

export function bulkUpdateRecordActions({ objectName = "matter", recordIds = [], actionType = "field_update", fieldUpdates = {}, targetStatus = null, ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeRecordActionRuntime({
    objectName,
    suffix: "/bulk-updates",
    payload: {
      idempotency_key: `ui:record-action:${normalizeRecordActionObject(objectName)}:bulk:${actionType}:${stamp}`,
      record_ids: recordIds,
      action_type: actionType,
      field_updates: fieldUpdates,
      target_status: targetStatus,
      bulk_action_ref: `ui_bulk_${normalizeRecordActionObject(objectName)}_${stamp}`,
      reason: actionType === "owner_change" ? "owner_decision_required" : "bulk_record_action"
    },
    ctx
  });
}

function normalizeMatterTeamMemberPayload(payload = {}) {
  const safeMember = payload.member ?? {};
  return {
    ...payload,
    tenant_id: MATTER_TENANT_ID,
    permission_ref: payload.permission_ref ?? "ui_cmp_g4_matter_team",
    audit_hint_ref: payload.audit_hint_ref ?? "ui_cmp_g4_matter_team_probe",
    actor_id: payload.actor_id ?? actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
    member: {
      ...safeMember,
      tenant_id: MATTER_TENANT_ID
    }
  };
}

function normalizeMatterOpeningPayload(payload = {}) {
  return {
    ...payload,
    tenant_id: MATTER_TENANT_ID,
    matter: payload.matter
      ? {
          ...payload.matter,
          tenant_id: MATTER_TENANT_ID
        }
      : payload.matter,
    clearance_token: payload.clearance_token
      ? {
          ...payload.clearance_token,
          tenant_id: payload.clearance_token.tenant_id ?? MATTER_TENANT_ID
        }
      : payload.clearance_token
  };
}

export function createMatterOpening({ payload, ctx = "allow" } = {}) {
  return postMatterRuntime({ path: "/api/matters/openings", payload: normalizeMatterOpeningPayload(payload), ctx });
}

export function openMatterFromIntakeClearance({
  intakeRequest,
  clearanceToken,
  clientPartyId,
  title = "상담 Matter",
  ctx = "allow"
} = {}) {
  const matterId = uiRuntimeId("matter_intake_ui");
  const tenantId = MATTER_TENANT_ID;
  const actorId = actorRefForDomain("matter", MATTER_PRINCIPAL.user_id);
  const partyId = clientPartyId ?? intakeRequest?.requesting_party_id ?? "party_cmp_g6_client_001";
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  return postMatterRuntime({
    path: "/api/matters/openings",
    ctx,
    contextOverride: {
      ...context,
      principal: {
        ...context.principal,
        tenant_id: tenantId
      }
    },
    payload: {
      tenant_id: tenantId,
      permission_ref: "ui_cmp_g6_intake_matter_open",
      audit_hint_ref: "ui_cmp_g6_intake_matter_open_probe",
      actor_id: actorId,
      idempotency_key: `ui:intake:matter-open:${matterId}`,
      matter_number_seed: "CMP-G6-INTAKE",
      matter: {
        matter_id: matterId,
        tenant_id: tenantId,
        legal_client_party_id: partyId,
        billing_client_party_id: partyId,
        title,
        status: "opening",
        created_by: actorId,
        created_at: "2026-06-20T00:00:00.000Z",
        permission_envelope_id: `perm:${tenantId}:${matterId}`,
        audit_trace_id: `audit:${tenantId}:${matterId}`
      },
      clearance_token: clearanceToken
    }
  });
}

export function addMatterTeamMember({ matterId, payload, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/team-members`,
    payload: normalizeMatterTeamMemberPayload(payload),
    ctx
  });
}

export function registerMatterParty({ matterId, displayName, partyRole = "adverse_party", partyKind = "organization", retroactiveEntry = true, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/parties`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_upl_c01_matter_party_write",
      audit_hint_ref: "ui_upl_c01_matter_party_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:party:${stamp}`,
      matter_party: {
        tenant_id: MATTER_TENANT_ID,
        matter_id: matterId,
        display_name: displayName,
        party_kind: partyKind,
        party_role: partyRole,
        retroactive_entry: retroactiveEntry
      }
    },
    ctx
  });
}

export function updateMatterProfile({ matterId, profile = {}, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/profile`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_matter_profile_write",
      audit_hint_ref: "ui_matter_profile_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:profile:${stamp}`,
      profile
    },
    ctx
  });
}

export function registerMatterStakeholder({ matterId, stakeholder = {}, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/stakeholders`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_matter_stakeholder_write",
      audit_hint_ref: "ui_matter_stakeholder_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:stakeholder:${stamp}`,
      stakeholder
    },
    ctx
  });
}

export function saveMatterListView({ label = "개시 Matter", status = "opening", listViewId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: "/api/matters/list-views",
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_list_views_write",
      audit_hint_ref: "ui_sf_b_w02_list_views_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      list_view_id: listViewId,
      label,
      filter: { status },
      sort: "updated_desc"
    },
    ctx
  });
}

export function bulkCompleteMatterStatus({ matterIds = [], ctx = "allow" } = {}) {
  const safeMatterIds = [...new Set(matterIds.map((matterId) => String(matterId ?? "").trim()).filter(Boolean))];
  const stamp = Date.now();
  return postMatterRuntime({
    path: "/api/matters/bulk/status-transitions",
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_bulk_status_transition",
      audit_hint_ref: "ui_sf_b_w02_matter_bulk_status_transition_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:bulk:status:closed:${stamp}`,
      matter_ids: safeMatterIds,
      target_status: "closed",
      reason: "bulk_status_complete"
    },
    ctx
  });
}

export function changeMatterOwner({ matterId, employeeId = "emp-001", ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/owner-change`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_owner_change",
      audit_hint_ref: "ui_sf_b_w02_matter_owner_change_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:owner:${employeeId}:${stamp}`,
      owner: {
        employee_id: employeeId
      },
      reason: "record_owner_changed"
    },
    ctx
  });
}

export function updateMatterInlineFields({
  matterId,
  fieldUpdates = { wip_status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_inline_patch",
      audit_hint_ref: "ui_sf_b_w02_matter_inline_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:inline:${stamp}`,
      field_updates: fieldUpdates,
      reason: "inline_field_edit"
    },
    ctx
  });
}

export function createMatterDocumentFacade({ matterId, title, contentText, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/documents`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_mv_matter_document_facade",
      audit_hint_ref: "ui_mv_matter_document_facade_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:document:${stamp}`,
      content_text: contentText ?? "Matter 문서 연결 기록",
      document: {
        document_id: `doc_${safeMatterId}_${stamp}`,
        title: title ?? "Matter 문서 연결 기록",
        status: "active",
        current_version_id: `version_doc_${safeMatterId}_${stamp}_1`,
        mime_type: "text/plain"
      }
    },
    ctx
  });
}

export function fetchMatterDocumentTemplates({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/document-templates`,
    ctx,
    permissionRef: "ui_sf_b_w04_document_template_read",
    auditHintRef: "ui_sf_b_w04_document_template_read_probe"
  });
}

export function createMatterBuilderDraft({
  matterId,
  draftId,
  title = "위임계약서 초안",
  body = "문서 초안 본문",
  templateId = "matter_engagement_letter",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const safeDraftId = draftId ?? `builder_draft_${safeMatterId}_${stamp}`;
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_draft_create",
      audit_hint_ref: "ui_sf_b_w04_builder_draft_create_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:builder:${safeDraftId}:${stamp}`,
      draft: {
        draft_id: safeDraftId,
        template_id: templateId,
        title,
        body
      }
    },
    ctx
  });
}

export function patchMatterBuilderDraft({
  matterId,
  draftId,
  patch = { status: "ready_for_review", body: "검토 요청 전 초안 정리" },
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDraftId = String(draftId ?? "builder_draft").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_draft_patch",
      audit_hint_ref: "ui_sf_b_w04_builder_draft_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:builder:${safeDraftId}:patch:${stamp}`,
      patch
    },
    ctx
  });
}

export function fetchMatterBuilderDraftPreview({ matterId, draftId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeItem({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}/preview`,
    ctx,
    permissionRef: "ui_sf_b_w04_builder_preview",
    auditHintRef: "ui_sf_b_w04_builder_preview_probe"
  });
}

export function requestMatterBuilderApproval({ matterId, draftId, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDraftId = String(draftId ?? "builder_draft").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}/approval-requests`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_approval_request",
      audit_hint_ref: "ui_sf_b_w04_builder_approval_request_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:builder:${safeDraftId}:approval:${stamp}`
    },
    ctx
  });
}

export function fetchMatterBuilderApprovalRequests({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-approval-requests`,
    ctx,
    permissionRef: "ui_sf_b_w04_builder_approval_read",
    auditHintRef: "ui_sf_b_w04_builder_approval_read_probe"
  });
}

export function publishMatterBuilderDraftToVault({ matterId, draftId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}/publish-to-vault`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_publish",
      audit_hint_ref: "ui_sf_b_w04_builder_publish_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id)
    },
    ctx
  });
}

export function createMatterEmailDraft({
  matterId,
  draftId,
  subject = "Matter 진행상황 안내",
  body = "이메일 초안 본문",
  templateId = "matter_status_update_email",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const safeDraftId = draftId ?? `email_draft_${safeMatterId}_${stamp}`;
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/email-drafts`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_email_draft_create",
      audit_hint_ref: "ui_sf_b_w04_email_draft_create_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:email:${safeDraftId}:${stamp}`,
      draft: {
        draft_id: safeDraftId,
        template_id: templateId,
        subject,
        body,
        recipient_refs: ["client_contact_ref"]
      }
    },
    ctx
  });
}

export function patchMatterEmailDraft({
  matterId,
  draftId,
  patch = { subject: "Matter 진행상황 안내 업데이트", body: "이메일 초안 정리" },
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDraftId = String(draftId ?? "email_draft").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/email-drafts/${encodeURIComponent(draftId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_email_draft_patch",
      audit_hint_ref: "ui_sf_b_w04_email_draft_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:email:${safeDraftId}:patch:${stamp}`,
      patch
    },
    ctx
  });
}

export function requestMatterEmailDraftSendBoundary({ matterId, draftId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/email-drafts/${encodeURIComponent(draftId)}/send`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_email_send_boundary",
      audit_hint_ref: "ui_sf_b_w04_email_send_boundary_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id)
    },
    ctx
  });
}

export function completeMatterStatus({ matterId, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/status-transitions`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_status_transition",
      audit_hint_ref: "ui_sf_b_w02_matter_status_transition_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:status:closed:${stamp}`,
      target_status: "closed",
      reason: "status_complete"
    },
    ctx
  });
}

export function markMatterRecentlyViewed({ matterId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/recently-viewed`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_recently_viewed",
      audit_hint_ref: "ui_sf_b_w02_recently_viewed_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      viewed_at: new Date().toISOString()
    },
    ctx
  });
}

export function fetchMatterActivities({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/activities`,
    ctx,
    permissionRef: "ui_sf_b_w03_activity_read",
    auditHintRef: "ui_sf_b_w03_activity_read_probe"
  });
}

export function createMatterActivity({
  matterId,
  activityType = "task",
  title = "검토 작업",
  status = "todo",
  dueAt,
  bodyText,
  assignedToUserId,
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const assigneeUserId = String(assignedToUserId ?? "").trim() || null;
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/activities`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_activity_write",
      audit_hint_ref: "ui_sf_b_w03_activity_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:activity:${stamp}`,
      activity: {
        activity_id: `activity_${safeMatterId}_${stamp}`,
        activity_type: activityType,
        title,
        status,
        due_at: dueAt ?? new Date(Date.now() + 86400000).toISOString(),
        body: bodyText,
        ...(activityType === "task" ? { assigned_to_user_id: assigneeUserId } : {})
      }
    },
    ctx
  });
}

export function patchMatterActivity({ matterId, activityId, patch = { status: "in_progress" }, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeActivityId = String(activityId ?? "activity").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/activities/${encodeURIComponent(activityId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_activity_patch",
      audit_hint_ref: "ui_sf_b_w03_activity_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:activity:${safeActivityId}:patch:${stamp}`,
      patch
    },
    ctx
  });
}

export function fetchMatterCalendarEvents({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/calendar-events`,
    ctx,
    permissionRef: "ui_sf_b_w03_calendar_read",
    auditHintRef: "ui_sf_b_w03_calendar_read_probe"
  });
}

export function createMatterCalendarEvent({
  matterId,
  title = "주요 기한",
  startsAt,
  endsAt,
  criticality = "critical",
  legalConsequence = "court_deadline",
  eventKind = "deadline",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const starts = startsAt ?? new Date(Date.now() + 172800000).toISOString();
  const ends = endsAt ?? new Date(new Date(starts).getTime() + 3600000).toISOString();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/calendar-events`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_calendar_write",
      audit_hint_ref: "ui_sf_b_w03_calendar_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:calendar:${stamp}`,
      event: {
        event_id: `calendar_${safeMatterId}_${stamp}`,
        title,
        status: "scheduled",
        event_kind: eventKind,
        starts_at: starts,
        ends_at: ends,
        criticality,
        legal_consequence: legalConsequence,
        reminder_rule: "two_business_days"
      }
    },
    ctx
  });
}

export function patchMatterCalendarEvent({ matterId, eventId, patch = {}, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeEventId = String(eventId ?? "event").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const starts = patch.starts_at ?? new Date(Date.now() + 259200000).toISOString();
  const ends = patch.ends_at ?? new Date(new Date(starts).getTime() + 3600000).toISOString();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/calendar-events/${encodeURIComponent(eventId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_calendar_patch",
      audit_hint_ref: "ui_sf_b_w03_calendar_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:calendar:${safeEventId}:patch:${stamp}`,
      patch: {
        ...patch,
        starts_at: starts,
        ends_at: ends
      }
    },
    ctx
  });
}

export function fetchMatterDeadlines({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/deadlines`,
    ctx,
    permissionRef: "ui_sf_b_w03_deadline_read",
    auditHintRef: "ui_sf_b_w03_deadline_read_probe"
  });
}

export function confirmMatterDeadlineChange({
  matterId,
  deadlineId,
  confirmerUserId = runtimeTenant("user", "rp05", "associate"),
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDeadlineId = String(deadlineId ?? "deadline").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/deadlines/${encodeURIComponent(deadlineId)}/confirm-change`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_deadline_confirm",
      audit_hint_ref: "ui_sf_b_w03_deadline_confirm_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      confirmer_user_id: confirmerUserId,
      idempotency_key: `ui:${safeMatterId}:deadline:${safeDeadlineId}:confirm:${stamp}`
    },
    ctx
  });
}

export function fetchMatterChannel({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeItem({
    path: `/api/matters/${encodeURIComponent(matterId)}/channel`,
    ctx,
    permissionRef: "ui_sf_b_w03_channel_read",
    auditHintRef: "ui_sf_b_w03_channel_read_probe"
  });
}

export function createMatterChannelMessage({
  matterId,
  message = "내부 준비 메모",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/channel/messages`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_channel_message",
      audit_hint_ref: "ui_sf_b_w03_channel_message_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:channel:${stamp}`,
      message: {
        message_id: `channel_message_${safeMatterId}_${stamp}`,
        body: message
      }
    },
    ctx
  });
}

export function syncMatterChannelProvider({ matterId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/channel/provider-sync`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_channel_provider_sync",
      audit_hint_ref: "ui_sf_b_w03_channel_provider_sync_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id)
    },
    ctx
  });
}

export async function fetchMatterCommandCenter({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_command_center",
  auditHintRef = "ui_mv_matter_command_center_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`/api/matters/${encodeURIComponent(matterId)}/command-center?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasCommandShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body);
  if (!hasCommandShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item,
    team: body.team ?? [],
    matterProfile: body.matter_profile ?? null,
    matterStakeholders: body.matter_stakeholders ?? [],
    matterParties: body.matter_parties ?? [],
    adverseParties: body.adverse_parties ?? [],
    clientReport: body.client_report ?? null,
    vaultSummary: body.vault_summary ?? null,
    vaultLink: body.matter_vault_link ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterVaultSummary({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_vault_summary",
  auditHintRef = "ui_mv_matter_vault_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`/api/matters/${encodeURIComponent(matterId)}/vault-summary?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasSummaryShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body);
  if (!hasSummaryShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterTimeline({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_timeline",
  auditHintRef = "ui_mv_matter_timeline_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`/api/matters/${encodeURIComponent(matterId)}/timeline?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("item" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    item: body.item,
    uiState: body.ui_state,
    safeErrorCodes: body.safe_error_codes ?? [],
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterAudit({
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`/api/matters/audit?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultDocuments({
  ctx = "allow",
  matterId = "",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: VAULT_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  if (matterId) params.set("matter_id", matterId);

  let body;
  try {
    const response = await apiFetch(`/api/vault/documents?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasVaultShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasVaultShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item ?? null,
    items: body.items,
    summary: body.summary ?? null,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultSearch({
  query = "",
  currentVersionOnly = true,
  dateFrom = "",
  dateTo = "",
  ctx = "allow",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: VAULT_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  const normalizedQuery = String(query ?? "").trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  params.set("current_version", currentVersionOnly ? "current" : "all");
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  let body;
  try {
    const response = await apiFetch(`/api/vault/search?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasVaultSearchShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasVaultSearchShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultSearchPreferences({
  ctx = "allow",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("vault", VAULT_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/vault/search/preferences?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (body && typeof body === "object" && ["denied", "review_required"].includes(body.ui_state)) {
    return { kind: "guarded", uiState: body.ui_state, outcome: body.outcome, safeErrorCodes: body.safe_error_codes ?? [] };
  }
  if (!body || typeof body !== "object" || body.outcome !== "passed" || !body.item || !Array.isArray(body.item.recent) || !Array.isArray(body.item.saved)) {
    return { kind: "error" };
  }
  return { kind: "data", item: body.item, requestId: body.request_id, productionReadyClaim: body.production_ready_claim === true };
}

export async function writeVaultSearchPreferences({
  operation,
  query = "",
  id = "",
  current_version_only = true,
  date_from = null,
  date_to = null,
  ctx = "allow",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  let body;
  try {
    const response = await apiFetch("/api/vault/search/preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify({
        tenant_id: tenantIdForDomain("vault", VAULT_TENANT_ID),
        permission_ref: permissionRef,
        audit_hint_ref: auditHintRef,
        operation,
        query,
        id,
        current_version_only,
        date_from,
        date_to
      })
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (body && typeof body === "object" && ["denied", "review_required"].includes(body.ui_state)) {
    return { kind: "guarded", uiState: body.ui_state, outcome: body.outcome, safeErrorCodes: body.safe_error_codes ?? [] };
  }
  if (!body || typeof body !== "object" || body.outcome !== "passed" || !body.item || !Array.isArray(body.item.recent) || !Array.isArray(body.item.saved)) {
    return { kind: "error" };
  }
  return { kind: "data", item: body.item, requestId: body.request_id, productionReadyClaim: body.production_ready_claim === true };
}

export async function fetchVaultBridgeStatus({ ctx = "allow", bridgeToken = null } = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const headers = { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) };
  if (bridgeToken) headers[VAULT_BRIDGE_TOKEN_HEADER] = bridgeToken;

  let response;
  let body;
  try {
    response = await apiFetch("/api/matters/vault-bridge/status", { headers });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasStatusShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "state_idempotent", "count_leak_prevented", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.safe_error_codes);
  if (!hasStatusShape) return { kind: "error" };

  if (!response.ok) {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref ?? null,
      countLeakPrevented: body.count_leak_prevented === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    sourceMode: body.item?.source_mode ?? null,
    clientUpsertPath: body.item?.client_upsert_path ?? null,
    matterUpsertPath: body.item?.matter_upsert_path ?? null,
    runtimeWriteReady: body.item?.runtime_write_ready === true,
    repositoryDurable: body.item?.repository_durable === true,
    safeErrorCodes: body.safe_error_codes,
    stateIdempotent: body.state_idempotent === true,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultMatterLookup({ ctx = "allow", query = "", bridgeToken = null } = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const headers = { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) };
  if (bridgeToken) headers[VAULT_BRIDGE_TOKEN_HEADER] = bridgeToken;
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: DEFAULT_VAULT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_VAULT_AUDIT_HINT_REF,
    q: query
  });

  let response;
  let body;
  try {
    response = await apiFetch(`/api/matters/vault-bridge/matter-lookup?${params.toString()}`, { headers });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasLookupShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "count_leak_prevented", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items) &&
    Array.isArray(body.safe_error_codes);
  if (!hasLookupShape) return { kind: "error" };

  if (!response.ok) {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      uiState: body.ui_state,
      items: [],
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref,
      countLeakPrevented: body.count_leak_prevented === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultUploadPreflight({
  ctx = "allow",
  selectedMatter = null,
  bridgeStatus = null,
  bridgeToken = null
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const headers = { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) };
  if (bridgeToken) headers[VAULT_BRIDGE_TOKEN_HEADER] = bridgeToken;
  const payload = {
    tenant_id: MATTER_TENANT_ID,
    permission_ref: DEFAULT_VAULT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_VAULT_AUDIT_HINT_REF,
    action: "upload_preflight",
    selected_matter_ref: selectedMatter?.selected_ref ?? "",
    matter_id: selectedMatter?.matter_id ?? "",
    matter_code: selectedMatter?.matter_code ?? "",
    source_mode: bridgeStatus?.sourceMode ?? null,
    runtime_write_ready: bridgeStatus?.runtimeWriteReady === true,
    repository_durable: bridgeStatus?.repositoryDurable === true,
    production_ready_claim: bridgeStatus?.productionReadyClaim === true,
    permission_check_only: true
  };

  let response;
  let body;
  try {
    response = await apiFetch("/api/matters/vault-bridge/upload-preflight", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasPreflightShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "state_idempotent", "count_leak_prevented", "vault_document_write_enabled", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.safe_error_codes);
  if (!hasPreflightShape) return { kind: "error" };

  if (!response.ok || body.item === null || body.outcome !== "preflight_passed") {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      uiState: body.ui_state,
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref ?? null,
      stateIdempotent: body.state_idempotent === true,
      countLeakPrevented: body.count_leak_prevented === true,
      vaultDocumentWriteEnabled: body.vault_document_write_enabled === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item,
    preflightRef: body.item.preflight_ref,
    selectedMatterRef: body.item.selected_matter_ref,
    allowedNextStep: body.item.allowed_next_step,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref ?? null,
    stateIdempotent: body.state_idempotent === true,
    countLeakPrevented: body.count_leak_prevented === true,
    vaultDocumentWriteEnabled: body.vault_document_write_enabled === true || body.item?.vault_document_write_enabled === true,
    productionReadyClaim: body.production_ready_claim === true || body.item?.production_ready_claim === true
  };
}

function vaultUploadIdSegment(value) {
  return String(value ?? "document")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "document";
}

export async function uploadVaultDocumentFile({
  file,
  selectedMatter = null,
  title = "",
  ctx = "allow",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  if (!file) return { kind: "error" };
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const fileName = file.name || "uploaded-document";
  const baseId = `${Date.now()}_${vaultUploadIdSegment(fileName)}`;
  const documentId = `doc_ui_upload_${baseId}`;
  const form = new FormData();
  const document = {
    document_id: documentId,
    tenant_id: VAULT_TENANT_ID,
    matter_id: selectedMatter?.matter_id ?? "matter_rp05_synthetic_opening",
    workspace_id: selectedMatter?.workspace_id ?? "workspace_rp07_synthetic",
    title: title.trim() || fileName,
    status: "active",
    current_version_id: `version_${documentId}_1`,
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_rp07_vault",
    mime_type: file.type || "application/octet-stream"
  };
  form.set("tenant_id", VAULT_TENANT_ID);
  form.set("permission_ref", permissionRef);
  form.set("audit_hint_ref", auditHintRef);
  form.set("idempotency_key", `ui-vault-upload:${documentId}`);
  form.set("matter_id", document.matter_id);
  form.set("workspace_id", document.workspace_id);
  form.set("title", document.title);
  form.set("mime_type", document.mime_type);
  form.set("document", JSON.stringify(document));
  form.set("file", file, fileName);

  let response;
  let body;
  try {
    response = await apiFetch("/api/vault/documents/upload", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) },
      body: form
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return { kind: "error" };
  if (!response.ok) {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id ?? null,
      outcome: body.outcome ?? "blocked",
      uiState: body.ui_state ?? "blocked",
      safeErrorCodes: body.safe_error_codes ?? [],
      auditHintRef: body.audit_hint_ref ?? null,
      productionReadyClaim: body.production_ready_claim === true
    };
  }
  if (!body.item || !body.file_object) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    item: body.item,
    version: body.version ?? null,
    fileObject: body.file_object,
    uploadFile: body.upload_file ?? null,
    sha256: body.file_object.sha256 ?? null,
    byteSize: body.file_object.byte_size ?? null,
    mimeType: body.file_object.mime_type ?? document.mime_type,
    storagePointerRefIncluded: body.file_object.storage_pointer_ref_included === true,
    documentBytesIncluded: body.item.document_bytes_included === true,
    auditHintRef: body.audit_hint_ref ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchMatterVaultCollection({
  path,
  matterId,
  ctx = "allow",
  permissionRef,
  auditHintRef
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: VAULT_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  const items = matterId ? body.items.filter((item) => item.matter_id === matterId) : body.items;
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: items.length === 0 ? "empty" : body.ui_state,
    outcome: body.outcome,
    items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchMatterVaultDocuments({ matterId, ctx = "allow" } = {}) {
  return fetchMatterVaultCollection({
    path: "/api/vault/documents",
    matterId,
    ctx,
    permissionRef: "ui_mv_matter_vault_documents",
    auditHintRef: "ui_mv_matter_vault_documents_probe"
  });
}

export function fetchMatterVaultSearch({ matterId, ctx = "allow" } = {}) {
  return fetchMatterVaultCollection({
    path: "/api/vault/search",
    matterId,
    ctx,
    permissionRef: "ui_mv_matter_vault_search",
    auditHintRef: "ui_mv_matter_vault_search_probe"
  });
}

export function fetchMatterVaultAudit({ matterId, ctx = "allow" } = {}) {
  return fetchMatterVaultCollection({
    path: "/api/vault/audit",
    matterId,
    ctx,
    permissionRef: "ui_mv_matter_vault_audit",
    auditHintRef: "ui_mv_matter_vault_audit_probe"
  });
}

async function fetchCrmIntakeCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_CRM_INTAKE_PERMISSION_REF,
  auditHintRef = DEFAULT_CRM_INTAKE_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  const params = new URLSearchParams({
    tenant_id: CRM_INTAKE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function uiRuntimeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function uiStableId(prefix, value) {
  // Keep the complete canonical value. Replacing punctuation or truncating a
  // prefix makes distinct CRM IDs share a retry key (for example `opp:a`,
  // `opp.a`, and `opp/a`). RFC 3986 percent encoding is synchronous, reversible,
  // and safe to carry in a JSON idempotency/intake identifier without Web Crypto.
  const canonicalValue = String(value ?? "record");
  const encodedValue = encodeURIComponent(canonicalValue);
  const safeValue = encodedValue.replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
  return `${prefix}_${safeValue || "record"}`;
}

async function postCrmIntakeRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  let body;
  try {
    const response = await apiFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    statusOutcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    conflictSearch: body.conflict_search ?? null,
    conflictHits: body.conflict_hits ?? [],
    hitCount: body.hit_count ?? body.conflict_search?.hit_count ?? null,
    conflictDecision: body.conflict_decision ?? null,
    conflictCheck: body.conflict_check ?? null,
    waiver: body.waiver ?? null,
    engagement: body.engagement ?? null,
    templateDocument: body.template_document ?? null,
    signedDocumentUpload: body.signed_document_upload ?? null,
    engagementReady: body.engagement_ready === true,
    templateDocumentId:
      body.template_document_id ??
      body.template_document?.template_document_id ??
      body.engagement?.template_document_id ??
      null,
    signedDocumentUploadId:
      body.signed_document_upload_id ??
      body.signed_document_upload?.signed_document_upload_id ??
      body.engagement?.signed_document_upload_id ??
      null,
    signedUploadVerified: body.signed_upload_verified === true || body.engagement?.signed_upload_verified === true,
    clearanceLinkReady: body.clearance_link_ready === true,
    conflictReview: body.conflict_review ?? null,
    engagementReview: body.engagement_review ?? null,
    opportunity: body.opportunity ?? null,
    validation: body.validation ?? null,
    mergeCandidates: body.merge_candidates ?? [],
    canonicalWriteStatus: body.canonical_write_status ?? null,
    canonicalRecordTypes: body.canonical_record_types ?? [],
    rollbackMetadataRef: body.rollback_metadata_ref ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function patchCrmIntakeRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  let body;
  try {
    const response = await apiFetch(path, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    statusOutcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    opportunity: body.opportunity ?? null,
    validation: body.validation ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

const CRM_INQUIRY_STATUS_LABELS = Object.freeze({
  new: "새 문의",
  reviewing: "확인 중",
  consultation_scheduled: "상담 예정",
  engagement_review: "수임 검토 중",
  engaged: "수임 확정",
  not_engaged: "수임하지 않음"
});
const CRM_INQUIRY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CRM_INQUIRY_SHA256_PATTERN = /^[a-f0-9]{64}$/iu;
const CRM_INQUIRY_DECISIONS = new Set(["pending", "accepted", "declined"]);
const CRM_INQUIRY_WORKFLOW_STATUSES = new Set(["completed", "in_progress", "repair_required"]);

function safeCrmInquiryId(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return CRM_INQUIRY_ID_PATTERN.test(normalized) ? normalized : null;
}

function safeCrmInquiryDate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  return Number.isNaN(Date.parse(value)) ? null : value.trim();
}

function safeCrmInquirySource(value) {
  return value === "outlook_addin" || value === "manual" ? value : null;
}

function safeCrmInquiryVersion(value) {
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function safeCrmInquiryDecision(value) {
  if (value === null || value === undefined) return null;
  return CRM_INQUIRY_DECISIONS.has(value) ? value : null;
}

function safeCrmInquiryWorkflowStatus(value) {
  if (value === null || value === undefined) return null;
  return CRM_INQUIRY_WORKFLOW_STATUSES.has(value) ? value : null;
}

function safeCrmInquiryOpportunity(item, expectedOpportunityId) {
  if (item === null || item === undefined) return null;
  if (typeof item !== "object" || Array.isArray(item)) return null;
  const opportunityId = safeCrmInquiryId(item.opportunity_id);
  const stage = typeof item.stage === "string" ? item.stage.trim() : "";
  const decision = safeCrmInquiryDecision(item.engagement_decision);
  const decisionVersion = safeCrmInquiryVersion(item.engagement_decision_version);
  const workflowId = item.engagement_workflow_id === null || item.engagement_workflow_id === undefined
    ? null
    : safeCrmInquiryId(item.engagement_workflow_id);
  const workflowStatus = safeCrmInquiryWorkflowStatus(item.engagement_workflow_status);
  const hasWorkflowId = Object.prototype.hasOwnProperty.call(item, "engagement_workflow_id");
  const hasWorkflowStatus = Object.prototype.hasOwnProperty.call(item, "engagement_workflow_status");
  if (
    !opportunityId
    || expectedOpportunityId === null
    || opportunityId !== expectedOpportunityId
    || !stage
    || !Object.prototype.hasOwnProperty.call(item, "engagement_decision")
    || (item.engagement_decision !== null && item.engagement_decision !== undefined && decision === null)
    || !decisionVersion
    || (hasWorkflowId && item.engagement_workflow_id !== null && item.engagement_workflow_id !== undefined && !workflowId)
    || (hasWorkflowStatus && item.engagement_workflow_status !== null && item.engagement_workflow_status !== undefined && !workflowStatus)
    || item.direct_matter_reference_included !== false
    || item.production_ready_claim !== false
  ) return null;
  return {
    opportunity_id: opportunityId,
    stage,
    engagement_decision: decision,
    engagement_decision_version: decisionVersion,
    engagement_workflow_id: workflowId,
    engagement_workflow_status: workflowStatus,
    direct_matter_reference_included: false,
    production_ready_claim: false
  };
}

function safeCrmInquirySummary(item, { expectedTenantId = null } = {}) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const leadId = safeCrmInquiryId(item.lead_id);
  const version = safeCrmInquiryVersion(item.version);
  const displayName = typeof item.display_name === "string" ? item.display_name.trim() : "";
  const visibleStatus = typeof item.visible_status === "string" ? item.visible_status.trim() : "";
  const visibleStatusLabel = typeof item.visible_status_label === "string" ? item.visible_status_label.trim() : "";
  const source = safeCrmInquirySource(item.source);
  const opportunityId = item.opportunity_id === null || item.opportunity_id === undefined
    ? null
    : safeCrmInquiryId(item.opportunity_id);
  const engagementDecision = safeCrmInquiryDecision(item.engagement_decision);
  const engagementWorkflowStatus = safeCrmInquiryWorkflowStatus(item.engagement_workflow_status);
  if (
    !leadId
    || !version
    || (expectedTenantId !== null && item.tenant_id !== expectedTenantId)
    || !displayName
    || !Object.prototype.hasOwnProperty.call(CRM_INQUIRY_STATUS_LABELS, visibleStatus)
    || visibleStatusLabel !== CRM_INQUIRY_STATUS_LABELS[visibleStatus]
    || !source
    || (item.received_at !== null && item.received_at !== undefined && safeCrmInquiryDate(item.received_at) === null)
    || (item.next_action !== null && item.next_action !== undefined && typeof item.next_action !== "string")
    || !Object.prototype.hasOwnProperty.call(item, "assigned_user_id")
    || (item.assigned_user_id !== null && typeof item.assigned_user_id !== "string")
    || (item.opportunity_id !== null && item.opportunity_id !== undefined && !opportunityId)
    || (item.engagement_decision !== null && item.engagement_decision !== undefined && engagementDecision === null)
    || (item.engagement_workflow_status !== null && item.engagement_workflow_status !== undefined && engagementWorkflowStatus === null)
    || (opportunityId === null && (engagementDecision !== null || engagementWorkflowStatus !== null))
    || Object.prototype.hasOwnProperty.call(item, "assigned")
  ) return null;
  const assigned = typeof item.assigned_user_id === "string" && item.assigned_user_id.trim().length > 0;
  return {
    lead_id: leadId,
    version,
    display_name: displayName,
    visible_status: visibleStatus,
    visible_status_label: visibleStatusLabel,
    source,
    received_at: safeCrmInquiryDate(item.received_at),
    assigned,
    opportunity_id: opportunityId,
    engagement_decision: engagementDecision,
    engagement_workflow_status: engagementWorkflowStatus,
    next_action: item.next_action === null || item.next_action === undefined
      ? null
      : item.next_action.trim()
  };
}

function safeCrmInquiryConsultation(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  if (typeof item.confidential !== "boolean") return null;
  const confidential = item.confidential;
  if (typeof item.confidential_details_included !== "boolean") return null;
  if (confidential) {
    if (
      item.subject !== "보호된 상담"
      || item.outcome !== null
      || item.next_action !== null
      || item.confidential_details_included !== false
    ) return null;
  } else if (item.confidential_details_included !== true) {
    return null;
  }
  const validOptionalDate = (value) => value === null || value === undefined || safeCrmInquiryDate(value) !== null;
  const safeDate = (value) => value === null || value === undefined ? null : safeCrmInquiryDate(value);
  const validOptionalString = (value) => value === null || value === undefined || typeof value === "string";
  if (
    !validOptionalDate(item.scheduled_start)
    || !validOptionalDate(item.scheduled_at)
    || !validOptionalDate(item.scheduled_end)
    || !validOptionalDate(item.completed_at)
    || !validOptionalString(item.subject)
    || !validOptionalString(item.outcome)
    || !validOptionalString(item.next_action)
  ) return null;
  return {
    scheduled_start: safeDate(item.scheduled_start ?? item.scheduled_at),
    scheduled_end: safeDate(item.scheduled_end),
    timezone: typeof item.timezone === "string" ? item.timezone.trim() || null : null,
    completed_at: safeDate(item.completed_at),
    subject: confidential ? "보호된 상담" : typeof item.subject === "string" ? item.subject.trim() || null : null,
    outcome: confidential ? null : typeof item.outcome === "string" ? item.outcome.trim() || null : null,
    next_action: confidential ? null : typeof item.next_action === "string" ? item.next_action.trim() || null : null,
    confidential,
    confidential_details_included: item.confidential_details_included,
    status: typeof item.status === "string" ? item.status.trim() || null : null
  };
}

function safeCrmInquiryEvidence(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const evidenceId = safeCrmInquiryId(item.inquiry_email_evidence_id);
  const captureStatus = typeof item.capture_status === "string" ? item.capture_status.trim() : "";
  if (
    !evidenceId
    || !captureStatus
    || item.raw_content_included !== false
    || item.mailbox_address_included !== false
    || item.provider_message_identifiers_included !== false
    || item.storage_object_identifiers_included !== false
    || (item.received_at !== null && item.received_at !== undefined && safeCrmInquiryDate(item.received_at) === null)
    || (item.subject !== null && item.subject !== undefined && typeof item.subject !== "string")
    || (item.sender_display_name !== null && item.sender_display_name !== undefined && typeof item.sender_display_name !== "string")
  ) return null;
  const prefix = `/api/outlook/inquiries/evidence/${encodeURIComponent(evidenceId)}/content`;
  const displayPath = item.display_content_path === null || item.display_content_path === undefined
    ? null
    : item.display_content_path;
  const originalPath = item.original_content_path === null || item.original_content_path === undefined
    ? null
    : item.original_content_path;
  if (
    (displayPath !== null && displayPath !== `${prefix}?kind=display`)
    || (originalPath !== null && originalPath !== `${prefix}?kind=original`)
  ) return null;
  return {
    inquiry_email_evidence_id: evidenceId,
    received_at: safeCrmInquiryDate(item.received_at),
    subject: typeof item.subject === "string" ? item.subject.trim() : "",
    sender_display_name: item.sender_display_name === null || item.sender_display_name === undefined
      ? null
      : typeof item.sender_display_name === "string" ? item.sender_display_name.trim() || null : null,
    capture_status: captureStatus,
    display_content_path: displayPath,
    original_content_path: originalPath,
    raw_content_included: false,
    mailbox_address_included: false,
    provider_message_identifiers_included: false,
    storage_object_identifiers_included: false,
    production_ready_claim: false
  };
}

function inquirySourceStatusesValid(value, expectedKeys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("|") === expectedKeys.slice().sort().join("|")
    && Object.values(value).every((status) => ["complete", "partial", "permission_denied", "unavailable", "error"].includes(status));
}

function inquiryPermissionResult(response, body) {
  const outcome = typeof body?.outcome === "string" ? body.outcome : "blocked";
  const uiState = body?.ui_state === "review" || body?.ui_state === "review_required" || outcome === "review_required"
    ? "review_required"
    : response?.status === 403 || body?.ui_state === "denied" || outcome === "denied"
      ? "denied"
      : body?.ui_state === "blocked" || outcome === "blocked"
        ? "blocked"
        : "error";
  return {
    kind: "guarded",
    status: Number(response?.status ?? 0) || 0,
    outcome,
    uiState: uiState === "blocked" && outcome === "review_required" ? "review_required" : uiState,
    items: [],
    item: null,
    safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes.filter((code) => typeof code === "string") : [],
    countLeakPrevented: body?.count_leak_prevented === true
  };
}

function inquiryReadParams(permissionRef, auditHintRef) {
  return new URLSearchParams({
    tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
}

export async function fetchCrmInquiries({ ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  const params = inquiryReadParams(CRM_INQUIRY_PERMISSION_REF, CRM_INQUIRY_AUDIT_HINT_REF);
  let response;
  let body;
  try {
    response = await apiFetch(`/api/crm/inquiries?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error", items: [] };
  }
  if (response.status >= 500) return { kind: "error", status: response.status, uiState: "error", items: [] };
  if (!response.ok || body?.outcome === "denied" || body?.outcome === "review_required" || body?.ui_state === "denied" || body?.ui_state === "review_required") {
    return inquiryPermissionResult(response, body);
  }
  const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
  const items = Array.isArray(body?.items)
    ? body.items.map((item) => safeCrmInquirySummary(item, { expectedTenantId }))
    : null;
  const hasPageInfo = body?.page_info && typeof body.page_info === "object";
  const valid = (
    body
    && typeof body === "object"
    && !Array.isArray(body)
    && body.outcome === "passed"
    && Array.isArray(body.items)
    && items
    && items.every(Boolean)
    && new Set(items.map((item) => item.lead_id)).size === items.length
    && (body.count_leak_prevented === true)
    && Array.isArray(body.safe_error_codes)
    && body.permission_filter_applied === true
    && ["complete", "partial"].includes(body.data_status)
    && inquirySourceStatusesValid(body.source_status, ["crm_consultations", "crm_leads", "crm_opportunities"])
    && hasPageInfo
    && body.page_info.returned_count === items.length
    && body.page_info.omitted_item_count === null
  );
  if (!valid) return { kind: "error", uiState: "error", items: [] };
  return {
    kind: "data",
    status: response.status,
    outcome: body.outcome,
    uiState: body.ui_state ?? (body.data_status === "partial" ? "partial" : items.length === 0 ? "empty" : null),
    items,
    pageInfo: { returnedCount: items.length, omittedItemCount: null },
    sourceStatus: body.source_status,
    safeErrorCodes: body.safe_error_codes,
    countLeakPrevented: true,
    permissionFilterApplied: body.permission_filter_applied === true
  };
}

export async function fetchCrmInquiryDetail({ inquiryId, ctx = "allow" } = {}) {
  const normalizedId = safeCrmInquiryId(inquiryId);
  if (!normalizedId) return { kind: "empty", status: 404, uiState: "empty", item: null, countLeakPrevented: true };
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  const params = inquiryReadParams(CRM_INQUIRY_PERMISSION_REF, CRM_INQUIRY_AUDIT_HINT_REF);
  let response;
  let body;
  try {
    response = await apiFetch(`/api/crm/inquiries/${encodeURIComponent(normalizedId)}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error", item: null };
  }
  if (response.status === 404 || body?.ui_state === "empty") {
    return { kind: "empty", status: response.status, outcome: "empty", uiState: "empty", item: null, countLeakPrevented: body?.count_leak_prevented === true };
  }
  if (response.status >= 500) return { kind: "error", status: response.status, uiState: "error", item: null };
  if (!response.ok || body?.outcome === "denied" || body?.outcome === "review_required" || body?.ui_state === "denied" || body?.ui_state === "review_required") {
    return inquiryPermissionResult(response, body);
  }
  const item = body?.item;
  const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
  const summary = safeCrmInquirySummary(item, { expectedTenantId });
  const hasOpportunity = Boolean(item && Object.prototype.hasOwnProperty.call(item, "opportunity"));
  const opportunity = hasOpportunity
    ? safeCrmInquiryOpportunity(item.opportunity, summary?.opportunity_id ?? null)
    : null;
  const consultations = Array.isArray(item?.consultations) ? item.consultations.map(safeCrmInquiryConsultation) : null;
  const consultationsAccess = item?.consultations_access;
  const evidence = item?.evidence;
  const evidenceItems = Array.isArray(evidence?.items) ? evidence.items.map(safeCrmInquiryEvidence) : null;
  const evidenceValid = (
    evidence
    && typeof evidence === "object"
    && ["allowed", "denied", "unavailable"].includes(evidence.access)
    && ["complete", "partial", "permission_denied", "unavailable", "error"].includes(evidence.source_status)
    && evidence.count_leak_prevented === true
    && evidence.page_info
    && typeof evidence.page_info === "object"
    && evidence.page_info.omitted_item_count === null
    && evidenceItems
    && evidenceItems.every(Boolean)
    && (evidence.access === "allowed" || evidenceItems.length === 0)
    && new Set(evidenceItems.map((entry) => entry.inquiry_email_evidence_id)).size === evidenceItems.length
    && (
      evidence.access === "allowed"
        ? evidence.source_status === "complete" || evidence.source_status === "partial"
        : evidence.access === "denied"
          ? evidence.source_status === "permission_denied"
          : ["unavailable", "error"].includes(evidence.source_status)
    )
    && (
      evidence.access === "allowed"
        ? evidence.page_info.returned_count === evidenceItems.length
        : evidence.page_info.returned_count === null
    )
  );
  const valid = (
    body
    && typeof body === "object"
    && body.outcome === "passed"
    && summary
    && summary.lead_id === normalizedId
    && hasOpportunity
    && (summary.opportunity_id === null ? opportunity === null : opportunity !== null)
    && consultations
    && consultations.every(Boolean)
    && ["allowed", "denied", "unavailable"].includes(consultationsAccess)
    && (consultationsAccess === "allowed" || consultations.length === 0)
    && evidenceValid
    && ["complete", "partial"].includes(body.data_status)
    && inquirySourceStatusesValid(body.source_status, ["crm_consultations", "crm_leads", "crm_opportunities", "email_evidence"])
    && body.permission_filter_applied === true
    && body.count_leak_prevented === true
    && Array.isArray(body.safe_error_codes)
  );
  if (!valid) return { kind: "error", uiState: "error", item: null };
  return {
    kind: "data",
    status: response.status,
    outcome: body.outcome,
    uiState: body.data_status === "partial" ? "partial" : null,
    item: {
      ...summary,
      opportunity,
      consultations,
      consultations_access: consultationsAccess,
      evidence: {
        access: evidence.access,
        source_status: evidence.source_status,
        items: evidenceItems,
        page_info: evidence.page_info,
        count_leak_prevented: true
      }
    },
    sourceStatus: body.source_status,
    safeErrorCodes: body.safe_error_codes,
    countLeakPrevented: true
  };
}

function base64ByteLength(value) {
  const normalized = typeof value === "string" ? value.replace(/\s+/gu, "") : "";
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(normalized)) return null;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return (normalized.length * 3) / 4 - padding;
}

function bytesFromBase64(value) {
  const normalized = typeof value === "string" ? value.replace(/\s+/gu, "") : "";
  if (typeof atob === "function") {
    try {
      const binary = atob(normalized);
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      return null;
    }
  }
  if (globalThis.Buffer?.from) {
    try {
      return Uint8Array.from(globalThis.Buffer.from(normalized, "base64"));
    } catch {
      return null;
    }
  }
  return null;
}

async function contentDigestMatches(bytes, expectedSha256) {
  if (!(bytes instanceof Uint8Array) || !globalThis.crypto?.subtle) return false;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return actual === expectedSha256.toLowerCase();
  } catch {
    return false;
  }
}

async function safeInquiryContentItem(item, kind, expectedEvidenceId) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const evidenceId = safeCrmInquiryId(item.inquiry_email_evidence_id);
  const expectedObjectKind = kind === "display" ? "sanitized_display" : "original_mime";
  const expectedEncoding = kind === "display" ? "utf8" : "base64";
  const expectedMime = kind === "display" ? /^text\/plain(?:;|$)/iu : /^message\/rfc822$/iu;
  if (
    !evidenceId
    || evidenceId !== expectedEvidenceId
    || item.object_kind !== expectedObjectKind
    || item.encoding !== expectedEncoding
    || typeof item.mime_type !== "string"
    || !expectedMime.test(item.mime_type)
    || item.scan_status !== "clean"
    || item.raw_path_exposed !== false
    || item.storage_pointer_ref_included !== false
    || item.executable_preview_enabled !== false
    || item.external_resources_loaded !== false
    || typeof item.content_sha256 !== "string"
    || !CRM_INQUIRY_SHA256_PATTERN.test(item.content_sha256)
    || !Number.isSafeInteger(item.byte_size)
    || item.byte_size < 0
  ) return null;
  if (kind === "display") {
    if (typeof item.content_text !== "string" || item.content_base64 !== null) return null;
    const bytes = new TextEncoder().encode(item.content_text);
    const byteLength = bytes.byteLength;
    if (byteLength !== item.byte_size) return null;
    if (!(await contentDigestMatches(bytes, item.content_sha256))) return null;
    return {
      objectKind: expectedObjectKind,
      encoding: expectedEncoding,
      contentText: item.content_text,
      contentBase64: null,
      contentSha256: item.content_sha256.toLowerCase(),
      byteSize: item.byte_size,
      mimeType: item.mime_type,
      scanStatus: item.scan_status
    };
  }
  if (typeof item.content_base64 !== "string" || item.content_text !== null || base64ByteLength(item.content_base64) !== item.byte_size) return null;
  const bytes = bytesFromBase64(item.content_base64);
  if (!bytes || !(await contentDigestMatches(bytes, item.content_sha256))) return null;
  return {
    objectKind: expectedObjectKind,
    encoding: expectedEncoding,
    contentText: null,
    contentBase64: item.content_base64.replace(/\s+/gu, ""),
    contentSha256: item.content_sha256.toLowerCase(),
    byteSize: item.byte_size,
    mimeType: item.mime_type,
    scanStatus: item.scan_status
  };
}

export async function fetchCrmInquiryEvidenceContent({ evidenceId, kind, ctx = "allow" } = {}) {
  const normalizedId = safeCrmInquiryId(evidenceId);
  if (!normalizedId || !["display", "original"].includes(kind)) {
    return { kind: "error", uiState: "blocked", item: null };
  }
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  const params = inquiryReadParams(CRM_INQUIRY_EVIDENCE_PERMISSION_REF, CRM_INQUIRY_EVIDENCE_AUDIT_HINT_REF);
  params.set("kind", kind);
  let response;
  let body;
  try {
    response = await apiFetch(`/api/outlook/inquiries/evidence/${encodeURIComponent(normalizedId)}/content?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "unavailable", item: null };
  }
  if (response.status === 423 || body?.safe_error_codes?.includes?.("INQUIRY_EVIDENCE_QUARANTINED")) {
    return { kind: "data", outcome: "blocked", uiState: "quarantined", item: null, safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [] };
  }
  if (response.status >= 500) return { kind: "error", status: response.status, uiState: "error", item: null };
  if (!response.ok || body?.outcome === "denied" || body?.outcome === "review_required" || body?.ui_state === "denied" || body?.ui_state === "review" || body?.ui_state === "review_required") {
    return inquiryPermissionResult(response, body);
  }
  if (body?.ui_state === "blocked" || body?.outcome === "blocked") {
    return { kind: "data", outcome: "blocked", uiState: "blocked", item: null, safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [] };
  }
  const item = await safeInquiryContentItem(body?.item, kind, normalizedId);
  if (!response.ok || body?.outcome !== "passed" || !item || !Array.isArray(body?.safe_error_codes)) {
    return { kind: "error", uiState: "error", item: null };
  }
  return {
    kind: "data",
    status: response.status,
    outcome: body.outcome,
    uiState: null,
    item,
    safeErrorCodes: body.safe_error_codes
  };
}

// Client 상담·접촉 이력 명령은 기존 generic CRM write helper와 분리한다.
// 이 경계에서는 요청키·사유·기대 version을 호출자가 반드시 주고, 응답은
// 허용된 canonical 필드만 남긴다. Matter 생성/선택 필드는 이 계층에서 받지 않는다.
const CRM_CLIENT_CONSULTATION_PERMISSION_REF = "ui_cmp_g6_crm_consultation_write";
const CRM_CLIENT_CONSULTATION_AUDIT_HINT_REF = "ui_cmp_g6_crm_consultation_write_probe";
const CRM_CLIENT_CONSULTATION_CALENDAR_PERMISSION_REF = "ui_cmp_g6_crm_consultation_calendar";
const CRM_CLIENT_CONSULTATION_CALENDAR_AUDIT_HINT_REF = "ui_cmp_g6_crm_consultation_calendar_probe";
const CRM_CLIENT_ENGAGEMENT_PERMISSION_REF = "ui_cmp_g6_crm_engagement_write";
const CRM_CLIENT_ENGAGEMENT_AUDIT_HINT_REF = "ui_cmp_g6_crm_engagement_write_probe";
const CRM_CLIENT_ACTIVITY_PERMISSION_REF = "ui_cmp_g6_crm_activity_write";
const CRM_CLIENT_ACTIVITY_AUDIT_HINT_REF = "ui_cmp_g6_crm_activity_write_probe";
const CRM_CLIENT_ACTIVITY_READ_PERMISSION_REF = "ui_cmp_g6_crm_activity_read";
const CRM_CLIENT_ACTIVITY_READ_AUDIT_HINT_REF = "ui_cmp_g6_crm_activity_read_probe";
const CRM_COMMAND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const CRM_COMMAND_SAFE_CODE_PATTERN = /^[A-Z0-9_:-]{1,160}$/u;
const CRM_CLIENT_ACTIVITY_TYPES = new Set(["call", "email", "meeting", "note", "task"]);
const CRM_OUTLOOK_WEB_HOSTS = new Set([
  "outlook.office.com",
  "outlook.office365.com"
]);
const CRM_CONSULTATION_UPDATE_FIELDS = new Set([
  "scheduled_start",
  "scheduled_end",
  "timezone",
  "completed_at",
  "outcome",
  "next_action",
  "subject",
  "confidential"
]);
const CRM_MATTER_REFERENCE_FIELDS = new Set([
  "matter_id",
  "matter_ref",
  "matter_number",
  "matter_create_command",
  "matter_open_command"
]);
const CRM_WRITE_SUCCESS_OUTCOMES = new Set([
  "created",
  "scheduled",
  "updated",
  "completed",
  "outlook_event_created",
  "linked",
  "already_linked",
  "idempotent_replay",
  "repair_required"
]);
const CRM_WORKFLOW_STEPS = new Set([
  "decision_recorded",
  "client_group_resolved",
  "fee_commitment_created",
  "fee_commitment_cancelled"
]);

function requiredCrmCommandText(value, field, maxLength = 500) {
  if (typeof value !== "string") throw new TypeError(`${field} is required`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(`${field} is required`);
  return normalized;
}

function requiredCrmCommandId(value, field) {
  const normalized = requiredCrmCommandText(value, field, 200);
  if (!CRM_COMMAND_ID_PATTERN.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function requiredCrmCommandVersion(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${field} is required`);
  return value;
}

function optionalCrmCommandText(value, field, maxLength = 500) {
  if (value === undefined || value === null || value === "") return null;
  return requiredCrmCommandText(value, field, maxLength);
}

function assertNoCrmMatterReference(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  if (Object.keys(value).some((key) => CRM_MATTER_REFERENCE_FIELDS.has(key))) {
    throw new TypeError("Matter references are not accepted by Client 상담 명령");
  }
}

function commandInputError(code = "CRM_CLIENT_COMMAND_INVALID") {
  return {
    kind: "error",
    status: 400,
    outcome: "blocked",
    uiState: "blocked",
    item: null,
    safeErrorCodes: [code]
  };
}

function commandSafeId(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return CRM_COMMAND_ID_PATTERN.test(normalized) ? normalized : null;
}

function commandSafeDate(value, { required = false } = {}) {
  if (value === undefined || value === null || value === "") return required ? null : null;
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) return null;
  return value.trim();
}

function commandSafeVersion(value) {
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function commandSafeString(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function commandSafeOutcomeCodes(value) {
  return Array.isArray(value)
    && value.every((code) => typeof code === "string" && CRM_COMMAND_SAFE_CODE_PATTERN.test(code))
    ? value
    : null;
}

function commandSafeOutlookCalendar(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = ["not_created", "linked", "update_required"].includes(value.state)
    ? value.state
    : null;
  if (!state || value.automatic_sync_enabled !== false || value.provider_event_identifier_included !== false || value.transaction_identifier_included !== false) return null;
  const webLink = value.web_link === null || value.web_link === undefined
    ? null
    : commandSafeString(value.web_link, 2_048);
  const createdAt = commandSafeDate(value.created_at);
  const mailboxScope = value.mailbox_scope === "me" ? "me" : null;
  if (webLink !== null) {
    try {
      const parsed = new URL(webLink);
      const hostname = parsed.hostname.toLowerCase();
      const allowedHost = [...CRM_OUTLOOK_WEB_HOSTS].some((host) => hostname === host || hostname.endsWith(`.${host}`));
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || !allowedHost) return null;
    } catch {
      return null;
    }
  }
  // A linked event is actionable only when the server returned a complete,
  // mailbox-scoped Outlook receipt.  A not-created consultation intentionally
  // has no link or creation timestamp yet, but still carries the safe mailbox
  // scope and the three disabled/omitted provider flags above.
  if (state === "not_created") {
    if (webLink !== null || createdAt !== null || mailboxScope !== "me") return null;
  } else if (webLink === null || createdAt === null || mailboxScope !== "me") {
    return null;
  }
  return {
    state,
    webLink,
    createdAt,
    mailboxScope,
    automaticSyncEnabled: false
  };
}

function commandSafeActivity(item, { expectedId = null, expectedLeadId = null, expectedTenantId = null } = {}) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const resourceId = item.resource_id === null || item.resource_id === undefined ? null : commandSafeId(item.resource_id);
  const activityId = item.crm_activity_id === null || item.crm_activity_id === undefined ? null : commandSafeId(item.crm_activity_id);
  const consultationId = activityId ?? resourceId;
  const activityKind = item.activity_kind === null || item.activity_kind === undefined
    ? null
    : item.activity_kind === "consultation" ? "consultation" : "__invalid__";
  const activityType = commandSafeString(item.activity_type, 80);
  const confidential = item.confidential === true;
  const version = commandSafeVersion(item.version);
  const subject = commandSafeString(item.subject, 160);
  const confidentialSubjectIncluded = item.confidential_subject_included;
  const confidentialDetailsIncluded = item.confidential_details_included;
  if (
    !consultationId
    || (item.resource_id !== null && item.resource_id !== undefined && !resourceId)
    || (item.crm_activity_id !== null && item.crm_activity_id !== undefined && !activityId)
    || (resourceId !== null && activityId !== null && resourceId !== activityId)
    || (expectedId !== null && consultationId !== expectedId)
    || (expectedTenantId !== null && item.tenant_id !== expectedTenantId)
    || activityKind === "__invalid__"
    || !activityType
    || !CRM_CLIENT_ACTIVITY_TYPES.has(activityType)
    || (activityKind === "consultation" && activityType !== "meeting")
    || !version
    || typeof item.confidential !== "boolean"
    || typeof confidentialSubjectIncluded !== "boolean"
    || typeof confidentialDetailsIncluded !== "boolean"
    || confidentialSubjectIncluded !== !confidential
    || subject === null
  ) return null;
  if (item.direct_matter_reference_included !== false || item.production_ready_claim !== false) return null;
  if (confidential) {
    if (!["보호된 상담", "보호된 이력"].includes(subject) || confidentialDetailsIncluded !== false) return null;
  } else if (confidentialDetailsIncluded !== true) {
    return null;
  }
  const leadId = item.lead_id === null || item.lead_id === undefined ? null : commandSafeId(item.lead_id);
  const opportunityId = item.opportunity_id === null || item.opportunity_id === undefined ? null : commandSafeId(item.opportunity_id);
  if (item.lead_id !== null && item.lead_id !== undefined && !leadId) return null;
  if (item.opportunity_id !== null && item.opportunity_id !== undefined && !opportunityId) return null;
  if (expectedLeadId !== null && leadId !== expectedLeadId) return null;
  const partyDisplayName = item.party_display_name === null || item.party_display_name === undefined
    ? null
    : commandSafeString(item.party_display_name, 240);
  if (item.party_display_name !== null && item.party_display_name !== undefined && partyDisplayName === null) return null;
  const outcome = confidential ? null : optionalCrmCommandText(item.outcome, "outcome", 2_000);
  const nextAction = confidential ? null : optionalCrmCommandText(item.next_action, "next_action", 500);
  if (!confidential && ((item.outcome !== null && item.outcome !== undefined && outcome === null) || (item.next_action !== null && item.next_action !== undefined && nextAction === null))) return null;
  const scheduledStart = commandSafeDate(item.scheduled_start);
  const scheduledEnd = commandSafeDate(item.scheduled_end);
  const completedAt = commandSafeDate(item.completed_at);
  if ((item.scheduled_start !== null && item.scheduled_start !== undefined && scheduledStart === null) || (item.scheduled_end !== null && item.scheduled_end !== undefined && scheduledEnd === null) || (item.completed_at !== null && item.completed_at !== undefined && completedAt === null)) return null;
  const status = commandSafeString(item.status, 64);
  if (!status) return null;
  const outlookCalendar = activityKind === "consultation" ? commandSafeOutlookCalendar(item.outlook_calendar) : null;
  if (activityKind === "consultation" && !outlookCalendar) return null;
  return {
    consultationId,
    activityId: consultationId,
    leadId,
    opportunityId,
    activityKind,
    activityType,
    partyDisplayName,
    subject,
    confidential,
    confidentialSubjectIncluded,
    confidentialDetailsIncluded,
    scheduledStart,
    scheduledEnd,
    timezone: commandSafeString(item.timezone, 80),
    completedAt,
    outcome,
    nextAction,
    outlookCalendar,
    version,
    status,
    occurredAt: commandSafeDate(item.occurred_at),
    createdAt: commandSafeDate(item.created_at),
    updatedAt: commandSafeDate(item.updated_at)
  };
}

function commandSafeInquiry(item, { expectedLeadId = null, expectedTenantId = null } = {}) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const leadId = commandSafeId(item.lead_id);
  const version = commandSafeVersion(item.version);
  if (!leadId || !version || (expectedLeadId !== null && leadId !== expectedLeadId) || (expectedTenantId !== null && item.tenant_id !== expectedTenantId)) return null;
  const nextAction = item.next_action === null || item.next_action === undefined
    ? null
    : commandSafeString(item.next_action, 500);
  if (item.next_action !== null && item.next_action !== undefined && nextAction === null) return null;
  return { leadId, version, nextAction };
}

function commandSafeEngagement(item, { expectedOpportunityId = null, expectedTenantId = null } = {}) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const resourceId = item.resource_id === null || item.resource_id === undefined ? null : commandSafeId(item.resource_id);
  const opportunityRef = item.opportunity_id === null || item.opportunity_id === undefined ? null : commandSafeId(item.opportunity_id);
  const opportunityId = opportunityRef ?? resourceId;
  const workflowId = commandSafeId(item.engagement_workflow_id);
  const stage = commandSafeString(item.stage, 64);
  const decision = ["pending", "accepted", "declined"].includes(item.engagement_decision)
    ? item.engagement_decision
    : null;
  const decisionVersion = commandSafeVersion(item.engagement_decision_version);
  const workflowStatus = ["completed", "in_progress", "repair_required"].includes(item.engagement_workflow_status)
    ? item.engagement_workflow_status
    : null;
  if (
    !opportunityId
    || (item.resource_id !== null && item.resource_id !== undefined && !resourceId)
    || (item.opportunity_id !== null && item.opportunity_id !== undefined && !opportunityRef)
    || (resourceId !== null && opportunityRef !== null && resourceId !== opportunityRef)
    || !workflowId
    || !stage
    || !decision
    || !decisionVersion
    || !workflowStatus
  ) return null;
  if (expectedOpportunityId !== null && opportunityId !== expectedOpportunityId) return null;
  if (expectedTenantId !== null && item.tenant_id !== expectedTenantId) return null;
  if (item.direct_matter_reference_included !== false || item.production_ready_claim !== false) return null;
  return {
    opportunityId,
    engagementWorkflowId: workflowId,
    stage,
    engagementDecision: decision,
    engagementDecisionVersion: decisionVersion,
    engagementWorkflowStatus: workflowStatus
  };
}

function commandSafeProcessing(value, { expectedInquiryId = null, expectedOpportunityId = null, expectedTenantId = null } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const workflowId = commandSafeId(value.engagement_workflow_id);
  const leadId = commandSafeId(value.lead_id);
  const opportunityId = commandSafeId(value.opportunity_id);
  const decision = ["pending", "accepted", "declined"].includes(value.decision)
    ? value.decision
    : null;
  const workflowStatus = ["completed", "in_progress", "repair_required"].includes(value.workflow_status)
    ? value.workflow_status
    : null;
  const workflowVersion = commandSafeVersion(value.workflow_version);
  const completedSteps = Array.isArray(value.completed_steps)
    ? value.completed_steps.filter((step) => CRM_WORKFLOW_STEPS.has(step))
    : null;
  const failedStep = value.failed_step === null || value.failed_step === undefined
    ? null
    : CRM_WORKFLOW_STEPS.has(value.failed_step) ? value.failed_step : "__invalid__";
  const safeErrorCode = value.safe_error_code === null || value.safe_error_code === undefined
    ? null
    : typeof value.safe_error_code === "string" && CRM_COMMAND_SAFE_CODE_PATTERN.test(value.safe_error_code)
      ? value.safe_error_code
      : "__invalid__";
  const engagementDecisionVersion = value.engagement_decision_version === null || value.engagement_decision_version === undefined
    ? null
    : commandSafeVersion(value.engagement_decision_version);
  if (
    !workflowId
    || !leadId
    || !opportunityId
    || !decision
    || !workflowStatus
    || !workflowVersion
    || !completedSteps
    || completedSteps.length !== (value.completed_steps ?? []).length
    || new Set(completedSteps).size !== completedSteps.length
    || failedStep === "__invalid__"
    || safeErrorCode === "__invalid__"
    || (value.engagement_decision_version !== null && value.engagement_decision_version !== undefined && !engagementDecisionVersion)
    || (workflowStatus === "repair_required" && (!failedStep || !safeErrorCode))
    || (workflowStatus !== "repair_required" && (failedStep !== null || safeErrorCode !== null))
    || (expectedInquiryId !== null && leadId !== expectedInquiryId)
    || (expectedOpportunityId !== null && opportunityId !== expectedOpportunityId)
    || (expectedTenantId !== null && value.tenant_id !== undefined && value.tenant_id !== expectedTenantId)
  ) return null;
  return {
    workflowId,
    leadId,
    opportunityId,
    decision,
    engagementDecisionVersion,
    workflowStatus,
    workflowVersion,
    completedSteps,
    failedStep,
    safeErrorCode,
    automaticMatterCreation: value.automatic_matter_creation === false ? false : null
  };
}

function engagementProcessingConsistent(item, inquiry, processing) {
  if (!item || !inquiry || !processing) return false;
  if (
    item.engagementWorkflowId !== processing.workflowId
    || item.engagementWorkflowStatus !== processing.workflowStatus
    || item.engagementDecision !== processing.decision
    || item.opportunityId !== processing.opportunityId
    || processing.leadId !== inquiry.leadId
  ) return false;
  return processing.engagementDecisionVersion === null
    || item.engagementDecisionVersion === processing.engagementDecisionVersion;
}

function engagementProcessingReceiptConsistent(processing, safeErrorCodes) {
  if (!processing || !Array.isArray(safeErrorCodes)) return false;
  if (processing.workflowStatus === "repair_required") {
    return processing.failedStep !== null
      && processing.safeErrorCode !== null
      && safeErrorCodes.length === 1
      && safeErrorCodes[0] === processing.safeErrorCode;
  }
  return processing.failedStep === null
    && processing.safeErrorCode === null
    && safeErrorCodes.length === 0;
}

function commandSafeAuditEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const action = commandSafeString(value.action, 160);
  if (!action) return null;
  const decision = value.decision === undefined || value.decision === null
    ? null
    : commandSafeString(value.decision, 80);
  return { action, decision };
}

function classifyCrmCommandResponse(response, body) {
  const status = Number(response?.status ?? 0) || 0;
  const outcome = typeof body?.outcome === "string" ? body.outcome : null;
  const uiState = typeof body?.ui_state === "string" ? body.ui_state : null;
  const safeErrorCodes = commandSafeOutcomeCodes(body?.safe_error_codes);
  if (!body || typeof body !== "object" || Array.isArray(body) || !outcome || !safeErrorCodes) {
    return { kind: "error", status, outcome: "error", uiState: "error", item: null, safeErrorCodes: [] };
  }
  if (status === 403 || outcome === "denied" || uiState === "denied") {
    return { kind: "denied", status, outcome, uiState: "denied", item: null, safeErrorCodes };
  }
  if (outcome === "review_required" || outcome === "approval_required" || uiState === "review" || uiState === "review_required" || uiState === "approval_required") {
    return { kind: "review_required", status, outcome, uiState: "review_required", item: null, safeErrorCodes };
  }
  const conflict = status === 409 || uiState === "conflict" || safeErrorCodes.some((code) => /CONFLICT|VERSION|STALE|ACTIVE_EXISTS|TRANSITION_INVALID|UPDATE_INVALID/iu.test(code));
  if (conflict) {
    return { kind: "conflict", status, outcome, uiState: "conflict", item: null, safeErrorCodes };
  }
  if (status >= 500 || !response?.ok || !CRM_WRITE_SUCCESS_OUTCOMES.has(outcome)) {
    return { kind: "error", status, outcome: outcome ?? "error", uiState: "error", item: null, safeErrorCodes };
  }
  return { kind: "data", status, outcome, uiState: uiState ?? null, safeErrorCodes, body };
}

async function crmClientWriteRequest({ path, payload, ctx, permissionRef, auditHintRef, parse } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  let response;
  let body;
  try {
    response = await apiFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error", status: 0, outcome: "error", uiState: "error", item: null, safeErrorCodes: [] };
  }
  const classified = classifyCrmCommandResponse(response, body);
  if (classified.kind !== "data") return classified;
  try {
    return parse(classified, body, { permissionRef, auditHintRef });
  } catch {
    return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
  }
}

async function crmClientActivityPatchRequest({ activityId, payload, ctx, permissionRef, auditHintRef } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  let response;
  let body;
  try {
    response = await apiFetch(`/api/crm/activities/${encodeURIComponent(activityId)}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error", status: 0, outcome: "error", uiState: "error", item: null, safeErrorCodes: [] };
  }
  const classified = classifyCrmCommandResponse(response, body);
  if (classified.kind !== "data") return classified;
  let item;
  let inquiry;
  try {
    const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
    item = commandSafeActivity(body.item, { expectedId: activityId, expectedTenantId });
    inquiry = body.inquiry === null || body.inquiry === undefined ? null : commandSafeInquiry(body.inquiry, { expectedTenantId });
  } catch {
    return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
  }
  if (!item || (body.inquiry !== null && body.inquiry !== undefined && (!inquiry || (item.leadId !== null && inquiry.leadId !== item.leadId)))) {
    return { kind: "error", status: response.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
  }
  return {
    kind: "data",
    status: response.status,
    outcome: classified.outcome,
    uiState: classified.uiState,
    item,
    inquiry,
    auditEvent: commandSafeAuditEvent(body.audit_event),
    idempotentReplay: body.idempotent_replay === true,
    safeErrorCodes: classified.safeErrorCodes,
    automaticMatterCreation: false,
    directMatterReferenceIncluded: false
  };
}

function buildCrmCommandResult(error) {
  return error instanceof TypeError || error instanceof Error
    ? commandInputError()
    : commandInputError();
}

export async function createCrmConsultation({
  inquiryId,
  expectedInquiryVersion,
  consultation = {},
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_CONSULTATION_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_CONSULTATION_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const normalizedInquiryId = requiredCrmCommandId(inquiryId, "inquiryId");
    const expectedVersion = requiredCrmCommandVersion(expectedInquiryVersion, "expectedInquiryVersion");
    const key = requiredCrmCommandId(idempotencyKey, "idempotencyKey");
    const changeReason = requiredCrmCommandText(reason, "reason");
    const safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    const safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
    assertNoCrmMatterReference(consultation);
    if (!consultation || typeof consultation !== "object" || Array.isArray(consultation)) throw new TypeError("consultation is required");
    const allowed = ["subject", "scheduled_start", "scheduled_end", "timezone", "assigned_user_id", "confidential", "next_action"];
    if (Object.keys(consultation).some((field) => !allowed.includes(field))) throw new TypeError("consultation contains unsupported fields");
    if (consultation.confidential !== undefined && typeof consultation.confidential !== "boolean") throw new TypeError("confidential is invalid");
    for (const field of ["scheduled_start", "scheduled_end", "timezone"]) {
      if (typeof consultation[field] !== "string" || !consultation[field].trim()) throw new TypeError(`${field} is required`);
    }
    const tenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
    const payload = {
      tenant_id: tenantId,
      permission_ref: safePermissionRef,
      audit_hint_ref: safeAuditHintRef,
      expected_inquiry_version: expectedVersion,
      reason: changeReason,
      idempotency_key: key,
      consultation: {
        scheduled_start: consultation.scheduled_start,
        scheduled_end: consultation.scheduled_end,
        timezone: consultation.timezone,
        ...(consultation.subject === undefined ? {} : { subject: consultation.subject }),
        ...(consultation.assigned_user_id === undefined ? {} : { assigned_user_id: consultation.assigned_user_id }),
        ...(consultation.confidential === undefined ? {} : { confidential: consultation.confidential }),
        ...(consultation.next_action === undefined ? {} : { next_action: consultation.next_action })
      }
    };
    return await crmClientWriteRequest({
      path: `/api/crm/inquiries/${encodeURIComponent(normalizedInquiryId)}/consultations`,
      payload,
      ctx,
      permissionRef: safePermissionRef,
      auditHintRef: safeAuditHintRef,
      parse: (classified, body) => {
        const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
        const item = commandSafeActivity(body.item, { expectedLeadId: normalizedInquiryId, expectedTenantId });
        const inquiry = body.inquiry === null || body.inquiry === undefined ? null : commandSafeInquiry(body.inquiry, { expectedLeadId: normalizedInquiryId, expectedTenantId });
        if (!item || item.activityKind !== "consultation" || !inquiry) return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
        return {
          kind: "data",
          status: classified.status,
          outcome: classified.outcome,
          uiState: classified.uiState,
          item,
          inquiry,
          auditEvent: commandSafeAuditEvent(body.audit_event),
          idempotentReplay: body.idempotent_replay === true,
          safeErrorCodes: classified.safeErrorCodes,
          automaticMatterCreation: false,
          directMatterReferenceIncluded: false
        };
      }
    });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export const scheduleCrmConsultation = createCrmConsultation;

export async function updateCrmConsultation({
  consultationId,
  expectedVersion,
  fieldUpdates,
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_CONSULTATION_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_CONSULTATION_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const normalizedId = requiredCrmCommandId(consultationId, "consultationId");
    const version = requiredCrmCommandVersion(expectedVersion, "expectedVersion");
    const key = requiredCrmCommandId(idempotencyKey, "idempotencyKey");
    const changeReason = requiredCrmCommandText(reason, "reason");
    const safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    const safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
    if (!fieldUpdates || typeof fieldUpdates !== "object" || Array.isArray(fieldUpdates) || Object.keys(fieldUpdates).length === 0) throw new TypeError("fieldUpdates is required");
    assertNoCrmMatterReference(fieldUpdates);
    if (Object.keys(fieldUpdates).some((field) => !CRM_CONSULTATION_UPDATE_FIELDS.has(field))) throw new TypeError("fieldUpdates contains unsupported fields");
    if (Object.hasOwn(fieldUpdates, "confidential") && typeof fieldUpdates.confidential !== "boolean") throw new TypeError("confidential is invalid");
    const payload = {
      tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
      permission_ref: safePermissionRef,
      audit_hint_ref: safeAuditHintRef,
      expected_version: version,
      field_updates: { ...fieldUpdates },
      reason: changeReason,
      idempotency_key: key
    };
    return await crmClientActivityPatchRequest({ activityId: normalizedId, payload, ctx, permissionRef: safePermissionRef, auditHintRef: safeAuditHintRef });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export async function completeCrmConsultation({
  consultationId,
  expectedVersion,
  completedAt,
  outcome,
  nextAction,
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_CONSULTATION_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_CONSULTATION_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const normalizedCompletedAt = requiredCrmCommandText(completedAt, "completedAt", 80);
    if (commandSafeDate(normalizedCompletedAt) === null) throw new TypeError("completedAt is invalid");
    const normalizedOutcome = requiredCrmCommandText(outcome, "outcome", 2_000);
    const normalizedNextAction = requiredCrmCommandText(nextAction, "nextAction", 500);
    return await updateCrmConsultation({
      consultationId,
      expectedVersion,
      fieldUpdates: { completed_at: normalizedCompletedAt, outcome: normalizedOutcome, next_action: normalizedNextAction },
      idempotencyKey,
      reason,
      permissionRef,
      auditHintRef,
      ctx
    });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export const completeClientConsultation = completeCrmConsultation;

export async function linkCrmConsultationOutlookEvent({
  consultationId,
  expectedVersion,
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_CONSULTATION_CALENDAR_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_CONSULTATION_CALENDAR_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const normalizedId = requiredCrmCommandId(consultationId, "consultationId");
    const version = requiredCrmCommandVersion(expectedVersion, "expectedVersion");
    const key = requiredCrmCommandId(idempotencyKey, "idempotencyKey");
    const changeReason = requiredCrmCommandText(reason, "reason");
    const safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    const safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
    const payload = {
      tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
      permission_ref: safePermissionRef,
      audit_hint_ref: safeAuditHintRef,
      expected_version: version,
      reason: changeReason,
      idempotency_key: key
    };
    return await crmClientWriteRequest({
      path: `/api/crm/consultations/${encodeURIComponent(normalizedId)}/outlook-event`,
      payload,
      ctx,
      permissionRef: safePermissionRef,
      auditHintRef: safeAuditHintRef,
      parse: (classified, body) => {
        const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
        const item = commandSafeActivity(body.item, { expectedId: normalizedId, expectedTenantId });
        if (
          !item
          || item.activityKind !== "consultation"
          || typeof body.provider_call_executed !== "boolean"
          || body.credential_material_included !== false
          || body.production_ready_claim !== false
        ) return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
        return {
          kind: "data",
          status: classified.status,
          outcome: classified.outcome,
          uiState: classified.uiState,
          item,
          outlookCalendarState: item.outlookCalendar.state,
          providerCallExecuted: body.provider_call_executed === true,
          credentialMaterialIncluded: body.credential_material_included === true,
          auditEvent: commandSafeAuditEvent(body.audit_event),
          idempotentReplay: body.idempotent_replay === true,
          safeErrorCodes: classified.safeErrorCodes,
          automaticMatterCreation: false,
          directMatterReferenceIncluded: false
        };
      }
    });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export const createCrmConsultationOutlookEvent = linkCrmConsultationOutlookEvent;

export async function decideCrmEngagement({
  inquiryId,
  engagementDecision,
  expectedInquiryVersion,
  expectedEngagementVersion,
  agreedAmount,
  amountUnknownConfirmed,
  dueDate,
  closeReason,
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_ENGAGEMENT_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_ENGAGEMENT_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const normalizedInquiryId = requiredCrmCommandId(inquiryId, "inquiryId");
    const decision = requiredCrmCommandText(engagementDecision, "engagementDecision", 32);
    if (!["pending", "accepted", "declined"].includes(decision)) throw new TypeError("engagementDecision is invalid");
    const inquiryVersion = requiredCrmCommandVersion(expectedInquiryVersion, "expectedInquiryVersion");
    const engagementVersion = requiredCrmCommandVersion(expectedEngagementVersion, "expectedEngagementVersion");
    const key = requiredCrmCommandId(idempotencyKey, "idempotencyKey");
    const changeReason = requiredCrmCommandText(reason, "reason");
    const safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    const safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
    assertNoCrmMatterReference({ closeReason });
    if (decision === "declined" && !requiredCrmCommandText(closeReason, "closeReason")) throw new TypeError("closeReason is required");
    if (decision === "accepted") {
      const hasAmount = agreedAmount !== undefined && agreedAmount !== null;
      if (hasAmount && (!Number.isSafeInteger(agreedAmount) || agreedAmount < 0)) throw new TypeError("agreedAmount is invalid");
      if (!hasAmount && amountUnknownConfirmed !== true) throw new TypeError("amountUnknownConfirmed is required");
      if (hasAmount && amountUnknownConfirmed === true) throw new TypeError("amountUnknownConfirmed is invalid");
    }
    const payload = {
      tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
      permission_ref: safePermissionRef,
      audit_hint_ref: safeAuditHintRef,
      engagement_decision: decision,
      expected_inquiry_version: inquiryVersion,
      expected_engagement_version: engagementVersion,
      reason: changeReason,
      idempotency_key: key,
      ...(agreedAmount === undefined ? {} : { agreed_amount: agreedAmount }),
      ...(amountUnknownConfirmed === undefined ? {} : { amount_unknown_confirmed: amountUnknownConfirmed }),
      ...(dueDate === undefined ? {} : { due_date: dueDate }),
      ...(closeReason === undefined ? {} : { close_reason: closeReason })
    };
    return await crmClientWriteRequest({
      path: `/api/crm/inquiries/${encodeURIComponent(normalizedInquiryId)}/engagement-decisions`,
      payload,
      ctx,
      permissionRef: safePermissionRef,
      auditHintRef: safeAuditHintRef,
      parse: (classified, body) => {
        const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
        const processing = commandSafeProcessing(body.processing, {
          expectedInquiryId: normalizedInquiryId,
          expectedTenantId
        });
        const item = commandSafeEngagement(body.item, {
          expectedOpportunityId: processing?.opportunityId ?? null,
          expectedTenantId
        });
        const inquiry = commandSafeInquiry(body.inquiry, {
          expectedLeadId: normalizedInquiryId,
          expectedTenantId
        });
        if (!item || !inquiry || !processing || !engagementProcessingConsistent(item, inquiry, processing) || !engagementProcessingReceiptConsistent(processing, classified.safeErrorCodes) || body.automatic_matter_creation !== false || body.direct_matter_reference_included !== false || processing.automaticMatterCreation !== false) return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
        return {
          kind: "data",
          status: classified.status,
          outcome: classified.outcome,
          uiState: classified.uiState,
          item,
          inquiry,
          processing,
          repairCommand: processing.workflowStatus === "completed"
            ? null
            : { inquiryId: normalizedInquiryId, expectedWorkflowVersion: processing.workflowVersion },
          auditEvent: commandSafeAuditEvent(body.audit_event),
          idempotentReplay: body.idempotent_replay === true,
          safeErrorCodes: classified.safeErrorCodes,
          automaticMatterCreation: false,
          directMatterReferenceIncluded: false
        };
      }
    });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export async function repairCrmEngagement({
  inquiryId,
  expectedWorkflowVersion,
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_ENGAGEMENT_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_ENGAGEMENT_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const normalizedInquiryId = requiredCrmCommandId(inquiryId, "inquiryId");
    const workflowVersion = requiredCrmCommandVersion(expectedWorkflowVersion, "expectedWorkflowVersion");
    const key = requiredCrmCommandId(idempotencyKey, "idempotencyKey");
    const changeReason = requiredCrmCommandText(reason, "reason");
    const safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    const safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
    const payload = {
      tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
      permission_ref: safePermissionRef,
      audit_hint_ref: safeAuditHintRef,
      expected_workflow_version: workflowVersion,
      reason: changeReason,
      idempotency_key: key
    };
    return await crmClientWriteRequest({
      path: `/api/crm/inquiries/${encodeURIComponent(normalizedInquiryId)}/engagement-repair`,
      payload,
      ctx,
      permissionRef: safePermissionRef,
      auditHintRef: safeAuditHintRef,
      parse: (classified, body) => {
        const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
        const processing = commandSafeProcessing(body.processing, {
          expectedInquiryId: normalizedInquiryId,
          expectedTenantId
        });
        const item = commandSafeEngagement(body.item, {
          expectedOpportunityId: processing?.opportunityId ?? null,
          expectedTenantId
        });
        const inquiry = commandSafeInquiry(body.inquiry, {
          expectedLeadId: normalizedInquiryId,
          expectedTenantId
        });
        if (!item || !inquiry || !processing || !engagementProcessingConsistent(item, inquiry, processing) || !engagementProcessingReceiptConsistent(processing, classified.safeErrorCodes) || body.automatic_matter_creation !== false || body.direct_matter_reference_included !== false || processing.automaticMatterCreation !== false) return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
        return {
          kind: "data",
          status: classified.status,
          outcome: classified.outcome,
          uiState: classified.uiState,
          item,
          inquiry,
          processing,
          repairCommand: processing.workflowStatus === "completed"
            ? null
            : { inquiryId: normalizedInquiryId, expectedWorkflowVersion: processing.workflowVersion },
          auditEvent: commandSafeAuditEvent(body.audit_event),
          idempotentReplay: body.idempotent_replay === true,
          safeErrorCodes: classified.safeErrorCodes,
          automaticMatterCreation: false,
          directMatterReferenceIncluded: false
        };
      }
    });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export async function createCrmContactActivityMemo({
  inquiryId,
  activityId,
  partyId,
  opportunityId,
  subject,
  confidential = false,
  idempotencyKey,
  reason,
  permissionRef = CRM_CLIENT_ACTIVITY_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_ACTIVITY_AUDIT_HINT_REF,
  ctx = "allow"
} = {}) {
  try {
    const safeInquiryId = requiredCrmCommandId(inquiryId, "inquiryId");
    const key = requiredCrmCommandId(idempotencyKey, "idempotencyKey");
    const changeReason = requiredCrmCommandText(reason, "reason");
    const memoSubject = requiredCrmCommandText(subject, "subject", 2_000);
    if (typeof confidential !== "boolean") throw new TypeError("confidential is invalid");
    const safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    const safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
    const safeActivityId = activityId === undefined || activityId === null ? null : requiredCrmCommandId(activityId, "activityId");
    if (partyId !== undefined || opportunityId !== undefined) throw new TypeError("partyId/opportunityId are not accepted; inquiryId is authoritative");
    assertNoCrmMatterReference({ activityId, inquiryId, partyId, opportunityId });
    const activity = {
      tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
      ...(safeActivityId ? { crm_activity_id: safeActivityId } : {}),
      lead_id: safeInquiryId,
      activity_type: "note",
      subject: memoSubject,
      confidential,
      status: "active"
    };
    const payload = {
      tenant_id: tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID),
      permission_ref: safePermissionRef,
      audit_hint_ref: safeAuditHintRef,
      reason: changeReason,
      idempotency_key: key,
      activity
    };
    return await crmClientWriteRequest({
      path: "/api/crm/activities",
      payload,
      ctx,
      permissionRef: safePermissionRef,
      auditHintRef: safeAuditHintRef,
      parse: (classified, body) => {
        const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
        const item = commandSafeActivity(body.item, {
          expectedId: safeActivityId,
          expectedLeadId: safeInquiryId,
          expectedTenantId
        });
        if (!item || item.activityKind !== null || item.activityType !== "note" || body.item?.direct_matter_reference_included !== false) return { kind: "error", status: classified.status, outcome: "error", uiState: "error", item: null, safeErrorCodes: classified.safeErrorCodes };
        return {
          kind: "data",
          status: classified.status,
          outcome: classified.outcome,
          uiState: classified.uiState,
          item,
          auditEvent: commandSafeAuditEvent(body.audit_event),
          idempotentReplay: body.idempotent_replay === true,
          safeErrorCodes: classified.safeErrorCodes,
          automaticMatterCreation: false,
          directMatterReferenceIncluded: false
        };
      }
    });
  } catch (error) {
    return buildCrmCommandResult(error);
  }
}

export const createClientActivityMemo = createCrmContactActivityMemo;

// GET /api/crm/activities is the signed-session read boundary for the Client
// 상담 화면.  The server serializer intentionally includes tenant/party/owner
// identifiers for authorization and audit purposes; this adapter validates the
// complete response and returns only the display-safe activity projection.
export async function fetchCrmClientActivities({
  ctx = "allow",
  permissionRef = CRM_CLIENT_ACTIVITY_READ_PERMISSION_REF,
  auditHintRef = CRM_CLIENT_ACTIVITY_READ_AUDIT_HINT_REF
} = {}) {
  let safePermissionRef;
  let safeAuditHintRef;
  try {
    safePermissionRef = requiredCrmCommandText(permissionRef, "permissionRef", 160);
    safeAuditHintRef = requiredCrmCommandText(auditHintRef, "auditHintRef", 160);
  } catch {
    return { kind: "error", status: 400, outcome: "blocked", uiState: "blocked", items: [], contactActivities: [] };
  }
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  const params = inquiryReadParams(safePermissionRef, safeAuditHintRef);
  let response;
  let body;
  try {
    response = await apiFetch(`/api/crm/activities?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", status: 0, outcome: "error", uiState: "error", items: [], contactActivities: [] };
  }
  if (response.status >= 500) {
    return { kind: "error", status: response.status, outcome: "error", uiState: "error", items: [], contactActivities: [] };
  }
  if (!response.ok || body?.outcome === "denied" || body?.outcome === "review_required" || body?.ui_state === "denied" || body?.ui_state === "review" || body?.ui_state === "review_required") {
    const guarded = inquiryPermissionResult(response, body);
    const guardedKind = guarded.uiState === "denied"
      ? "denied"
      : guarded.uiState === "review_required"
        ? "review_required"
        : "guarded";
    return { ...guarded, kind: guardedKind, contactActivities: [] };
  }
  let safeItems;
  let safeErrorCodes;
  try {
    const expectedTenantId = tenantIdForDomain("crm", CRM_INTAKE_TENANT_ID);
    safeItems = Array.isArray(body?.items)
      ? body.items.map((item) => item?.tenant_id === expectedTenantId ? commandSafeActivity(item) : null)
      : null;
    safeErrorCodes = Array.isArray(body?.safe_error_codes)
      && body.safe_error_codes.every((code) => typeof code === "string" && CRM_COMMAND_SAFE_CODE_PATTERN.test(code))
      ? body.safe_error_codes
      : null;
  } catch {
    return { kind: "error", status: response.status, outcome: "error", uiState: "error", items: [], contactActivities: [] };
  }
  const pageInfo = body?.page_info;
  const valid = (
    body
    && typeof body === "object"
    && !Array.isArray(body)
    && body.outcome === "passed"
    && body.audit_hint_ref === safeAuditHintRef
    && body.production_ready_claim === false
    && body.count_leak_prevented === true
    && Array.isArray(body.items)
    && safeItems
    && safeItems.every(Boolean)
    && safeErrorCodes
    && pageInfo
    && typeof pageInfo === "object"
    && !Array.isArray(pageInfo)
    && pageInfo.returned_count === safeItems.length
    && pageInfo.omitted_item_count === null
  );
  if (!valid) {
    return { kind: "error", status: response.status, outcome: "error", uiState: "error", items: [], contactActivities: [] };
  }
  const ids = safeItems.map((item) => item.activityId);
  if (new Set(ids).size !== ids.length) {
    return { kind: "error", status: response.status, outcome: "error", uiState: "error", items: [], contactActivities: [] };
  }
  const consultations = safeItems.filter((item) => item.activityKind === "consultation");
  const contactActivities = safeItems.filter((item) => item.activityKind === null);
  return {
    kind: "data",
    status: response.status,
    outcome: body.outcome,
    uiState: body.ui_state ?? (safeItems.length === 0 ? "empty" : null),
    // Keep the complete safe activity list for contact-history consumers while
    // exposing typed collections so consultation screens never treat a memo as
    // a scheduled consultation.
    items: safeItems,
    consultations,
    contactActivities,
    pageInfo: { returnedCount: safeItems.length, omittedItemCount: null },
    safeErrorCodes,
    auditHintRef: safeAuditHintRef,
    countLeakPrevented: true,
    productionReadyClaim: false
  };
}

export const fetchCrmConsultationActivities = fetchCrmClientActivities;
export const fetchClientActivities = fetchCrmClientActivities;

export function fetchCrmOpportunities(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/opportunities" });
}

export function fetchCrmLeads(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/leads" });
}

export function fetchCrmActivities(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_lcx_vltui_05_activity_read",
    auditHintRef: "ui_lcx_vltui_05_activity_read_probe",
    ...options,
    path: "/api/crm/activities"
  });
}

export function createCrmActivity({
  activityId,
  partyId = "party_cmp_g6_client_001",
  opportunityId = "opp_cmp_g6_synthetic_001",
  activityType = "note",
  subject = "Client 후속 조치",
  confidential = false,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeActivityId = activityId ?? `activity_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/activities",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_activity_write",
      audit_hint_ref: "ui_lcx_vltui_05_activity_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:activity:${safeActivityId}:${stamp}`,
      reason: "client_activity_created",
      activity: {
        crm_activity_id: safeActivityId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        party_id: partyId,
        opportunity_id: opportunityId,
        activity_type: activityType,
        subject,
        confidential,
        status: "active"
      }
    }
  });
}

export function patchCrmActivity({
  activityId,
  fieldUpdates = { status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeActivityId = String(activityId ?? "activity").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/activities/${encodeURIComponent(activityId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_activity_patch",
      audit_hint_ref: "ui_lcx_vltui_05_activity_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:activity:${safeActivityId}:patch:${stamp}`,
      reason: "client_activity_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmProposals(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_lcx_vltui_05_proposal_read",
    auditHintRef: "ui_lcx_vltui_05_proposal_read_probe",
    ...options,
    path: "/api/crm/proposals"
  });
}

export function createCrmProposal({
  proposalId,
  opportunityId = "opp_cmp_g6_synthetic_001",
  partyId = "party_cmp_g6_client_001",
  displayName = "Client 제안 초안",
  vaultDocumentRef = "vault_doc_cmp_g6_proposal_ui",
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeProposalId = proposalId ?? `proposal_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/proposals",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_proposal_write",
      audit_hint_ref: "ui_lcx_vltui_05_proposal_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:proposal:${safeProposalId}:${stamp}`,
      reason: "client_proposal_created",
      proposal: {
        proposal_id: safeProposalId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        opportunity_id: opportunityId,
        party_id: partyId,
        fee_estimate_ref: `fee_estimate:${safeProposalId}`,
        display_name: displayName,
        status: "draft",
        proposal_status: "draft",
        approval_state: "review_required",
        vault_document_ref: vaultDocumentRef
      }
    }
  });
}

export function patchCrmProposal({
  proposalId,
  fieldUpdates = { approval_state: "review_required" },
  ctx = "allow"
} = {}) {
  const safeProposalId = String(proposalId ?? "proposal").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/proposals/${encodeURIComponent(proposalId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_proposal_patch",
      audit_hint_ref: "ui_lcx_vltui_05_proposal_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:proposal:${safeProposalId}:patch:${stamp}`,
      reason: "client_proposal_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmAccounts(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/accounts" });
}

export function createCrmAccount({
  displayName = "신규 계정",
  accountId,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeAccountId = accountId ?? `account_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/accounts",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_account_write",
      audit_hint_ref: "ui_sf_b_w01_account_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:account:${safeAccountId}:${stamp}`,
      reason: "account_created",
      account: {
        account_id: safeAccountId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        display_name: displayName,
        status: "active"
      }
    }
  });
}

export function patchCrmAccount({
  accountId,
  fieldUpdates = { status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeAccountId = String(accountId ?? "account").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/accounts/${encodeURIComponent(accountId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_account_patch",
      audit_hint_ref: "ui_sf_b_w01_account_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:account:${safeAccountId}:patch:${stamp}`,
      reason: "account_inline_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmContacts(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_upl_c07_contact_value_read",
    auditHintRef: "ui_upl_c07_contact_value_read_probe",
    ...options,
    path: "/api/crm/contacts"
  });
}

export function createCrmContact({
  displayName = "신규 연락처",
  contactId,
  accountId,
  email,
  phone,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeContactId = contactId ?? `contact_ui_${stamp}`;
  const contactPhone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
  const contactEmail = typeof email === "string" && email.trim()
    ? email.trim()
    : contactPhone
      ? null
      : `contact.${stamp.toString(36)}@example.invalid`;
  return postCrmIntakeRuntime({
    path: "/api/crm/contacts",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_upl_c07_contact_value_write",
      audit_hint_ref: "ui_upl_c07_contact_value_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:contact:${safeContactId}:${stamp}`,
      reason: "contact_created",
      contact: {
        contact_id: safeContactId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        account_id: accountId ?? null,
        display_name: displayName,
        status: "active",
        ...(contactEmail ? { email: contactEmail } : {}),
        ...(contactPhone ? { phone: contactPhone } : {}),
        primary_contact_fingerprint: `ui-contact-fingerprint-${safeContactId}`
      }
    }
  });
}

export function patchCrmContact({
  contactId,
  fieldUpdates = { status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeContactId = String(contactId ?? "contact").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/contacts/${encodeURIComponent(contactId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_upl_c07_contact_value_patch",
      audit_hint_ref: "ui_upl_c07_contact_value_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:contact:${safeContactId}:patch:${stamp}`,
      reason: "contact_inline_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmAccountContacts({ accountId, ...options } = {}) {
  if (!accountId) {
    return Promise.resolve({ kind: "data", uiState: "empty", outcome: "passed", items: [], safeErrorCodes: [] });
  }
  return fetchCrmIntakeCollection({
    permissionRef: "ui_upl_c07_contact_value_read",
    auditHintRef: "ui_upl_c07_contact_value_read_probe",
    ...options,
    path: `/api/crm/accounts/${encodeURIComponent(accountId)}/contacts`
  });
}

export function fetchCrmMergeProposals(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_sf_b_w01_merge_read",
    auditHintRef: "ui_sf_b_w01_merge_read_probe",
    ...options,
    path: "/api/crm/duplicate-merge-proposals"
  });
}

export function fetchCrmClientSettings(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_lcx_vltui_05_client_settings_read",
    auditHintRef: "ui_lcx_vltui_05_client_settings_read_probe",
    ...options,
    path: "/api/crm/client-settings"
  });
}

export function patchCrmClientSetting({
  policyId,
  fieldUpdates = { duplicate_review_required: true },
  ctx = "allow"
} = {}) {
  const safePolicyId = String(policyId ?? "client_policy").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/client-settings/${encodeURIComponent(policyId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_client_settings_patch",
      audit_hint_ref: "ui_lcx_vltui_05_client_settings_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:client-setting:${safePolicyId}:patch:${stamp}`,
      reason: "client_policy_patch",
      field_updates: fieldUpdates
    }
  });
}

export function createCrmMergeProposal({
  proposalId,
  displayName = "CMP G6 synthetic",
  sourcePartyId,
  targetPartyId,
  ownerApprovalRef,
  dualControlApproverId,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeProposalId = proposalId ?? `dup_merge_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/duplicate-merge-proposals",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_merge_write",
      audit_hint_ref: "ui_sf_b_w01_merge_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:merge:${safeProposalId}:${stamp}`,
      proposal: {
        proposal_id: safeProposalId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        display_name: displayName,
        identifier_type: "business_number",
        identifier_value: "cmp-g6-001",
        source_party_id: sourcePartyId ?? null,
        target_party_id: targetPartyId ?? null,
        owner_decision: ownerApprovalRef ? "approved" : "review_required",
        owner_approval_ref: ownerApprovalRef ?? null,
        dual_control_approver_id: dualControlApproverId ?? null,
        reason: "duplicate_merge_proposal_created"
      }
    }
  });
}

export function executeCrmMergeProposal({ proposalId, ctx = "allow" } = {}) {
  const stamp = Date.now();
  return postCrmIntakeRuntime({
    path: `/api/crm/duplicate-merge-proposals/${encodeURIComponent(proposalId)}/execute`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_merge_execute",
      audit_hint_ref: "ui_sf_b_w01_merge_execute_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:merge:${proposalId}:execute:${stamp}`,
      reason: "duplicate_merge_execute_requested"
    }
  });
}

export function fetchIntakeRequests(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/requests" });
}

export function fetchIntakeClearanceTokens(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/clearance-tokens" });
}

export function fetchIntakeAudit(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/audit" });
}

export function createCrmOpportunity({
  opportunityId,
  partyId,
  displayName = "신규 의뢰",
  requestedScopeSummary = "신규 의뢰 수임 검토",
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeOpportunityId = opportunityId ?? `opp_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/opportunities",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_upl_c08_intake_completion_write",
      audit_hint_ref: "ui_upl_c08_intake_completion_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:opportunity:${safeOpportunityId}:${stamp}`,
      reason: "intake_pipeline_opportunity_created",
      opportunity: {
        opportunity_id: safeOpportunityId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        party_id: partyId ?? "party_cmp_g6_client_001",
        display_name: displayName,
        requested_scope_summary: requestedScopeSummary,
        stage: "new",
        status: "active",
        owner_user_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id)
      }
    }
  });
}

export function handoffCrmOpportunityToIntake({
  opportunityId,
  requestedScopeSummary = "Client 상담 요청",
  intakeRequestId,
  idempotencyKey,
  ctx = "allow"
} = {}) {
  const stableOpportunityKey = uiStableId("opportunity", opportunityId);
  const stableIntakeRequestId = intakeRequestId ?? uiStableId("intake_ui", opportunityId);
  const stableIdempotencyKey = idempotencyKey ?? `handoff:${stableOpportunityKey}`;
  return postCrmIntakeRuntime({
    path: `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/handoff`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: stableIdempotencyKey,
      intake_request_id: stableIntakeRequestId,
      requested_scope_summary: requestedScopeSummary
    }
  });
}

export function createIntakeConflictCheck({ intakeRequest, ctx = "allow" } = {}) {
  const conflictId = uiRuntimeId("conflict_ui");
  const partyIds = Array.isArray(intakeRequest?.party_ids)
    ? intakeRequest.party_ids
    : [intakeRequest?.requesting_party_id].filter(Boolean);
  return postCrmIntakeRuntime({
    path: "/api/intake/conflict-checks",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `conflict:${conflictId}`,
      conflict_check: {
        conflict_check_id: conflictId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        party_snapshot: { party_ids: partyIds },
        status: "snapshot_recorded",
        owner_user_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id)
      }
    }
  });
}

export function recordIntakeConflictDecision({ conflictCheck, conflictHits = [], decision = "clear", ctx = "allow" } = {}) {
  const decisionId = uiRuntimeId("decision_ui");
  const conflictHitIds = conflictHits.map((hit) => hit?.conflict_hit_id).filter(Boolean);
  return postCrmIntakeRuntime({
    path: "/api/intake/conflict-decisions",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `decision:${decisionId}`,
      conflict_decision: {
        conflict_decision_id: decisionId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        conflict_check_id: conflictCheck?.conflict_check_id,
        conflict_hit_ids: conflictHitIds,
        reviewer_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
        decision,
        rationale: "ui_conflict_review"
      }
    }
  });
}

export function approveIntakeConflictWaiver({ intakeRequest, conflictCheck, conflictHits = [], ctx = "allow" } = {}) {
  const waiverId = uiRuntimeId("waiver_ui");
  const conflictHitIds = conflictHits.map((hit) => hit?.conflict_hit_id).filter(Boolean);
  return postCrmIntakeRuntime({
    path: "/api/intake/waivers",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `waiver:${waiverId}`,
      waiver: {
        waiver_id: waiverId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        conflict_check_id: conflictCheck?.conflict_check_id,
        conflict_hit_ids: conflictHitIds,
        consent_document_id: `consent:${waiverId}`,
        approver_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
        approval_reason: "ui_conflict_waiver"
      }
    }
  });
}

export function approveIntakeEngagement({ intakeRequest, ctx = "allow" } = {}) {
  const engagementId = uiRuntimeId("engagement_ui");
  const signedDocumentId = `signed_doc:${engagementId}`;
  const templateDocumentId = `template_doc:${engagementId}`;
  const signatureRef = `signature:${signedDocumentId}`;
  return postCrmIntakeRuntime({
    path: "/api/intake/engagements",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `engagement:${engagementId}`,
      engagement: {
        engagement_id: engagementId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        template_id: "matter_engagement_letter",
        signed_document_id: signedDocumentId,
        signature_ref: signatureRef,
        template_document: {
          template_document_id: templateDocumentId,
          template_id: "matter_engagement_letter",
          document_title: "위임계약서",
          generation_state: "generated",
          merge_field_count: 3,
          document_payload_included: false,
          template_payload_included: false
        },
        signed_document_upload: {
          signed_document_upload_id: `signed_upload:${engagementId}`,
          document_id: signedDocumentId,
          signed_document_id: signedDocumentId,
          template_document_id: templateDocumentId,
          signature_ref: signatureRef,
          content_sha256: ENGAGEMENT_SIGNED_PDF_SHA256,
          bytes_base64: ENGAGEMENT_SIGNED_PDF_BYTES_BASE64,
          byte_size: ENGAGEMENT_SIGNED_PDF_BYTE_SIZE,
          mime_type: "application/pdf",
          upload_state: "uploaded",
          lx_registry_ref: "LX-06",
          bytes_included: false,
          storage_pointer_ref_included: false
        },
        approver_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id)
      }
    }
  });
}

export function issueIntakeClearanceToken({ intakeRequest, conflictCheck, engagement, ctx = "allow" } = {}) {
  const clearanceId = uiRuntimeId("clearance_ui");
  return postCrmIntakeRuntime({
    path: "/api/intake/clearance-tokens",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `clearance:${clearanceId}`,
      token: {
        clearance_token_id: clearanceId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        conflict_check_id: conflictCheck?.conflict_check_id,
        engagement_id: engagement?.engagement_id,
        snapshot_hash: conflictCheck?.snapshot_hash
      }
    }
  });
}

async function fetchFinanceCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_FINANCE_PERMISSION_REF,
  auditHintRef = DEFAULT_FINANCE_AUDIT_HINT_REF,
  query = {}
} = {}) {
  const context = FINANCE_PERMISSION_CONTEXTS[ctx] ?? FINANCE_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: FINANCE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }

  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item ?? null,
    items: body.items,
    summary: body.summary ?? null,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function postFinanceRuntime({ path, payload, ctx = "allow", roleIds = null } = {}) {
  const context = financePermissionContext(ctx, roleIds);
  let body;
  try {
    const response = await apiFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    invoice: body.invoice ?? null,
    payment: body.payment ?? null,
    paymentAllocation: body.payment_allocation ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchFinanceTimeEntries(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/time-entries" });
}

export function fetchFinanceInvoices(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/invoices" });
}

export function fetchFinanceArAging(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/ar-aging" });
}

export function fetchFinanceAudit(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/audit" });
}

export async function fetchFinanceAccountingExport({
  fromDate = "2026-07-01",
  toDate = "2026-07-31",
  ctx = "allow",
  permissionRef = DEFAULT_FINANCE_PERMISSION_REF,
  auditHintRef = DEFAULT_FINANCE_AUDIT_HINT_REF
} = {}) {
  const context = FINANCE_PERMISSION_CONTEXTS[ctx] ?? FINANCE_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: FINANCE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    from_date: fromDate,
    to_date: toDate,
    idempotency_key: `ui-accounting-export:${fromDate}:${toDate}`,
    accounting_export_id: uiStableId("accounting_export_ui", `${fromDate}_${toDate}`)
  });
  let body;
  try {
    const response = await apiFetch(`/api/finance/accounting-export.csv?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) return { kind: "error" };
  return {
    kind: "data",
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.outcome === "idempotent_replay",
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function createFinanceTimeEntry({
  matterId,
  durationMinutes = 30,
  roleId = "partner",
  workDate = "2026-06-20",
  narrative = "Matter billing time",
  billable = true,
  ctx = "allow"
} = {}) {
  const timeEntryId = uiRuntimeId("time_ui");
  return postFinanceRuntime({
    path: "/api/finance/time-entries",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: timeEntryId,
      time_entry: {
        time_entry_id: timeEntryId,
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        role_id: roleId,
        work_date: workDate,
        narrative,
        duration_minutes: durationMinutes,
        billable
      }
    }
  });
}

export function createFinanceExpense({
  matterId,
  expenseDate = new Date().toISOString().slice(0, 10),
  amount = 25000,
  receiptDocumentId = null,
  currency = "KRW",
  ctx = "allow"
} = {}) {
  const expenseId = uiRuntimeId("expense_ui");
  return postFinanceRuntime({
    path: "/api/finance/expenses",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: expenseId,
      expense: {
        expense_id: expenseId,
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        expense_date: expenseDate,
        receipt_document_id: receiptDocumentId || uiStableId("receipt_ui", expenseId),
        amount: Number(amount),
        currency,
        billable: true,
        status: "approved"
      }
    }
  });
}

export function createFinanceDisbursement({
  matterId,
  disbursedAt = new Date().toISOString().slice(0, 10),
  amount = 15000,
  vendorRef = null,
  currency = "KRW",
  ctx = "allow"
} = {}) {
  const disbursementId = uiRuntimeId("disbursement_ui");
  return postFinanceRuntime({
    path: "/api/finance/disbursements",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: disbursementId,
      disbursement: {
        disbursement_id: disbursementId,
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        disbursed_at: disbursedAt,
        vendor_ref: vendorRef || uiStableId("vendor_ui", disbursementId),
        amount: Number(amount),
        currency,
        billable: true,
        recoverable: true
      }
    }
  });
}

export function generateFinanceWip({ matterId, ctx = "allow" } = {}) {
  return postFinanceRuntime({
    path: "/api/finance/wip",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-wip:${matterId}`,
      matter_id: matterId
    }
  });
}

export function lockFinanceWipSnapshot({ matterId, wipItems = [], ctx = "allow" } = {}) {
  const wipItemIds = wipItems.map((item) => item?.wip_item_id).filter(Boolean);
  if (!matterId || wipItemIds.length === 0) return Promise.resolve({ kind: "error" });
  return postFinanceRuntime({
    path: "/api/finance/wip-snapshots",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-wip-snapshot:${matterId}`,
      matter_id: matterId,
      wip_snapshot_id: uiStableId("wip_snapshot_ui", matterId),
      wip_item_ids: wipItemIds
    }
  });
}

export function createFinancePreBill({ matterId, wipSnapshotId, ctx = "allow" } = {}) {
  if (!matterId || !wipSnapshotId) return Promise.resolve({ kind: "error" });
  return postFinanceRuntime({
    path: "/api/finance/prebills",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-prebill:${matterId}`,
      prebill: {
        prebill_id: uiStableId("prebill_ui", matterId),
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        wip_snapshot_id: wipSnapshotId,
        partner_reviewer_id: "matter_finance_partner",
        currency: "KRW"
      }
    }
  });
}

export function approveFinancePreBill({ prebillId, ctx = "allow" } = {}) {
  if (!prebillId) return Promise.resolve({ kind: "error" });
  return postFinanceRuntime({
    path: "/api/finance/prebills/approve",
    ctx,
    roleIds: ["partner"],
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: "matter_finance_partner",
      idempotency_key: `ui-prebill-approve:${prebillId}`,
      prebill_id: prebillId
    }
  });
}

export function issueFinanceInvoice({ matterId, prebillId, billingClientPartyId = "party_cmp_g6_client_001", ctx = "allow" } = {}) {
  if (!matterId || !prebillId) return Promise.resolve({ kind: "error" });
  return postFinanceRuntime({
    path: "/api/finance/invoices",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-invoice:${matterId}`,
      invoice: {
        invoice_id: uiStableId("invoice_ui", matterId),
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        prebill_id: prebillId,
        billing_client_party_id: billingClientPartyId,
        currency: "KRW"
      }
    }
  });
}

export function importFinancePayment({
  matterId,
  clientGroupId = null,
  amount = 100000,
  currency = "KRW",
  receivedAt = null,
  paymentKey = null,
  ctx = "allow"
} = {}) {
  if (!matterId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return Promise.resolve({ kind: "error" });
  }
  const paymentId = uiStableId("payment_ui", paymentKey ?? `${matterId}_${receivedAt ?? "undated"}_${amount}_${currency}`);
  return postFinanceRuntime({
    path: "/api/finance/payments",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-payment:${paymentId}`,
      payment: {
        payment_id: paymentId,
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        client_group_id: clientGroupId,
        bank_reference: `ui-payment:${paymentId}`,
        amount: Number(amount),
        currency,
        received_at: receivedAt
      }
    }
  });
}

export function matchFinancePayment({ paymentId, invoiceId, amount, matchKey = null, ctx = "allow" } = {}) {
  if (!paymentId || !invoiceId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return Promise.resolve({ kind: "error" });
  }
  const paymentMatchId = uiStableId("payment_match_ui", matchKey ?? `${paymentId}_${invoiceId}`);
  return postFinanceRuntime({
    path: "/api/finance/payment-matches",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-payment-match:${paymentMatchId}`,
      match: {
        payment_match_id: paymentMatchId,
        tenant_id: FINANCE_TENANT_ID,
        payment_id: paymentId,
        invoice_id: invoiceId,
        amount: Number(amount)
      }
    }
  });
}

export function allocateFinancePayment({
  paymentId,
  allocationType,
  matterId = null,
  clientGroupId = null,
  invoiceId = null,
  amount,
  currency = "KRW",
  allocatedAt = null,
  allocationKey = null,
  ctx = "allow"
} = {}) {
  if (
    !paymentId
    || !["invoice_payment", "direct_fee", "client_advance", "trust_deposit", "other_non_revenue"].includes(allocationType)
    || !Number.isFinite(Number(amount))
    || Number(amount) <= 0
  ) {
    return Promise.resolve({ kind: "error" });
  }
  const paymentAllocationId = uiStableId(
    "payment_allocation_ui",
    allocationKey ?? `${paymentId}_${allocationType}_${invoiceId ?? matterId ?? "unlinked"}_${amount}`
  );
  return postFinanceRuntime({
    path: "/api/finance/payment-allocations",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-payment-allocation:${paymentAllocationId}`,
      allocation: {
        payment_allocation_id: paymentAllocationId,
        tenant_id: FINANCE_TENANT_ID,
        payment_id: paymentId,
        allocation_type: allocationType,
        matter_id: matterId,
        client_group_id: clientGroupId,
        invoice_id: allocationType === "invoice_payment" ? invoiceId : null,
        amount: Number(amount),
        currency,
        allocated_at: allocatedAt
      }
    }
  });
}

export async function fetchAnalyticsDashboards({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await apiFetch(`/api/analytics/dashboards?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function analyticsClientReadParams({
  permissionRef,
  auditHintRef
}) {
  return new URLSearchParams({
    tenant_id: tenantIdForDomain("client", ANALYTICS_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
}

function analyticsClientGuardedResult(response, body) {
  const uiState = body?.ui_state;
  const reviewRequired = (
    uiState === "review"
    || uiState === "review_required"
    || body?.outcome === "review_required"
  );
  const permissionDenied = response.status === 403;
  return {
    kind: permissionDenied || reviewRequired ? "guarded" : "error",
    status: response.status,
    outcome: body?.outcome ?? "blocked",
    uiState: permissionDenied
      ? "denied"
      : reviewRequired
        ? "review_required"
        : "error",
    safeErrorCodes: Array.isArray(body?.safe_error_codes)
      ? body.safe_error_codes
      : [],
    countLeakPrevented: body?.count_leak_prevented === true
  };
}

function safeClientDirectoryItem(item) {
  if (
    typeof item?.client_group_id !== "string"
    || item.client_group_id.trim() === ""
    || typeof item?.display_name !== "string"
    || item.display_name.trim() === ""
  ) {
    return null;
  }
  return {
    client_group_id: item.client_group_id.trim(),
    display_name: item.display_name.trim(),
    status: typeof item.status === "string" ? item.status : null,
    legal_form: typeof item.legal_form === "string"
      ? item.legal_form
      : null,
    member_count: Number.isInteger(item.member_count)
      && item.member_count >= 0
      ? item.member_count
      : null,
    primary_record_present: item.primary_record_present === true
  };
}

export async function fetchAnalyticsClientDirectory({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(
    ctx,
    ANALYTICS_PERMISSION_CONTEXTS,
    "client"
  );
  const params = analyticsClientReadParams({
    permissionRef,
    auditHintRef
  });
  let response;
  let body;
  try {
    response = await apiFetch(
      `/api/analytics/clients?${params.toString()}`,
      {
        headers: {
          [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
        }
      }
    );
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error" };
  }
  if (!response.ok) {
    return analyticsClientGuardedResult(response, body);
  }
  const items = Array.isArray(body?.items)
    ? body.items.map(safeClientDirectoryItem)
    : [];
  const hasShape = (
    body !== null
    && typeof body === "object"
    && !Array.isArray(body)
    && Array.isArray(body.items)
    && items.every(Boolean)
    && Array.isArray(body.safe_error_codes)
    && body.count_leak_prevented === true
    && body.permission_prefilter_applied === true
    && body.raw_source_payload_included === false
  );
  if (!hasShape) return { kind: "error", uiState: "error" };
  return {
    kind: "data",
    status: response.status,
    outcome: body.outcome,
    uiState: body.ui_state ?? null,
    items,
    pageInfo: {
      returnedCount: items.length,
      omittedItemCount: null
    },
    sourceStatuses: Array.isArray(body.source_statuses)
      ? body.source_statuses
      : [],
    safeErrorCodes: body.safe_error_codes,
    countLeakPrevented: true,
    permissionPrefilterApplied: true
  };
}

const CLIENT_DETAIL_SECTION_STATUSES = new Set([
  "available",
  "no_data",
  "partial",
  "permission_denied",
  "error"
]);

function safeClientDetailSection(section, itemMapper) {
  if (
    !section
    || !CLIENT_DETAIL_SECTION_STATUSES.has(section.status)
  ) {
    return null;
  }
  if (["permission_denied", "error"].includes(section.status)) {
    return section.data === null
      ? { status: section.status, data: null }
      : null;
  }
  if (!Array.isArray(section.data?.items)) return null;
  const items = section.data.items.map(itemMapper);
  if (items.some((item) => item === null)) return null;
  return {
    status: section.status,
    data: { items }
  };
}

function safeClientDetailContactPoint(item) {
  if (
    !item
    || typeof item !== "object"
    || item.contact_point_value_included !== false
  ) {
    return null;
  }
  return {
    contact_type: typeof item.contact_type === "string"
      ? item.contact_type
      : null,
    contact_point_value_included: false,
    contact_value_masked: item.contact_value_masked === true,
    is_primary: item.is_primary === true,
    status: typeof item.status === "string" ? item.status : null
  };
}

function safeClientDetailContact(item) {
  if (
    typeof item?.contact_id !== "string"
    || typeof item?.display_name !== "string"
    || item.contact_point_value_included !== false
  ) {
    return null;
  }
  const contactPoints = Array.isArray(item.contact_points)
    ? item.contact_points.map(safeClientDetailContactPoint)
    : [];
  if (contactPoints.some((point) => point === null)) return null;
  return {
    contact_id: item.contact_id,
    display_name: item.display_name,
    primary_contact_type:
      typeof item.primary_contact_type === "string"
      ? item.primary_contact_type
      : null,
    contact_point_value_included: false,
    contact_value_masked: item.contact_value_masked === true,
    contact_points: contactPoints,
    status: typeof item.status === "string" ? item.status : null
  };
}

function safeClientDetailMatter(item) {
  if (
    typeof item?.matter_id !== "string"
    || typeof item?.display_name !== "string"
  ) {
    return null;
  }
  return {
    matter_id: item.matter_id,
    matter_code: typeof item.matter_code === "string"
      ? item.matter_code
      : null,
    display_name: item.display_name,
    status: typeof item.status === "string" ? item.status : null,
    opened_at: typeof item.opened_at === "string"
      ? item.opened_at
      : null
  };
}

function safeClientDetailInquiry(item) {
  if (
    typeof item?.lead_id !== "string"
    || typeof item?.display_name !== "string"
  ) {
    return null;
  }
  return {
    lead_id: item.lead_id,
    display_name: item.display_name,
    visible_status: typeof item.visible_status === "string"
      ? item.visible_status
      : null,
    visible_status_label:
      typeof item.visible_status_label === "string"
        ? item.visible_status_label
        : "상태 확인 필요",
    source: typeof item.source === "string" ? item.source : null,
    received_at: typeof item.received_at === "string"
      ? item.received_at
      : null,
    next_action: typeof item.next_action === "string"
      ? item.next_action
      : null,
    assigned: item.assigned === true
  };
}

export async function fetchAnalyticsClientOperationsDetail({
  clientId,
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const normalizedClientId = typeof clientId === "string"
    ? clientId.trim()
    : "";
  if (!normalizedClientId) {
    return { kind: "error", uiState: "error" };
  }
  const context = permissionContextFor(
    ctx,
    ANALYTICS_PERMISSION_CONTEXTS,
    "client"
  );
  const params = analyticsClientReadParams({
    permissionRef,
    auditHintRef
  });
  let response;
  let body;
  try {
    response = await apiFetch(
      `/api/analytics/clients/${encodeURIComponent(normalizedClientId)}/operations?${params.toString()}`,
      {
        headers: {
          [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
        }
      }
    );
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error" };
  }
  if (response.status === 404) {
    return {
      kind: "empty",
      status: 404,
      uiState: "empty",
      countLeakPrevented: body?.count_leak_prevented === true
    };
  }
  if (!response.ok) {
    return analyticsClientGuardedResult(response, body);
  }
  const item = body?.item;
  const contacts = safeClientDetailSection(
    item?.sections?.contacts,
    safeClientDetailContact
  );
  const matters = safeClientDetailSection(
    item?.sections?.matters,
    safeClientDetailMatter
  );
  const inquiries = safeClientDetailSection(
    item?.sections?.inquiries,
    safeClientDetailInquiry
  );
  const hasShape = (
    item !== null
    && typeof item === "object"
    && item.client?.client_group_id === normalizedClientId
    && typeof item.client?.display_name === "string"
    && contacts !== null
    && matters !== null
    && inquiries !== null
    && Array.isArray(item.source_statuses)
    && Array.isArray(item.safe_error_codes)
    && item.count_leak_prevented === true
    && item.raw_contact_values_included === false
    && item.raw_source_payload_included === false
    && body.count_leak_prevented === true
    && body.raw_source_payload_included === false
  );
  if (!hasShape) return { kind: "error", uiState: "error" };
  return {
    kind: "data",
    status: response.status,
    outcome: item.outcome,
    uiState: item.ui_state ?? null,
    item: {
      client: safeClientDirectoryItem(item.client),
      sections: { contacts, matters, inquiries },
      sourceStatuses: item.source_statuses.map((source) => ({
        sourceId: source.source_id ?? null,
        label: source.label ?? null,
        status: source.status ?? "error",
        itemCount: ["partial", "permission_denied", "error"].includes(
          source.status
        )
          ? null
          : Number.isInteger(source.item_count)
            ? source.item_count
            : null,
        safeErrorCode: source.safe_error_code ?? null
      }))
    },
    safeErrorCodes: item.safe_error_codes,
    countLeakPrevented: true,
    permissionPrefilterApplied: true
  };
}

export async function fetchAnalyticsClientOperationsDashboard({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF,
  asOf = null,
  timezone = "Asia/Seoul",
  revenueRankingPeriod = "year"
} = {}) {
  const context = permissionContextFor(
    ctx,
    ANALYTICS_PERMISSION_CONTEXTS,
    "client"
  );
  const params = new URLSearchParams({
    tenant_id: tenantIdForDomain("client", ANALYTICS_TENANT_ID),
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    timezone,
    revenue_ranking_period: revenueRankingPeriod
  });
  if (asOf) params.set("as_of", asOf);

  let response;
  let body;
  try {
    response = await apiFetch(
      `/api/analytics/clients/dashboard?${params.toString()}`,
      {
        headers: {
          [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
        }
      }
    );
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error" };
  }

  const safeErrorCodes = Array.isArray(body?.safe_error_codes)
    ? body.safe_error_codes
    : [];
  const sourceStatuses = Array.isArray(body?.source_statuses)
    ? body.source_statuses
    : [];
  if (!response.ok) {
    const permissionDenied = response.status === 403 && (
      body?.ui_state === "permission_denied"
      || body?.ui_state === "denied"
      || body?.outcome === "permission_denied"
      || body?.outcome === "denied"
    );
    const reviewRequired = (
      body?.ui_state === "review"
      || body?.ui_state === "review_required"
      || body?.outcome === "review_required"
    );
    return {
      kind: permissionDenied || reviewRequired
        ? "guarded"
        : "error",
      status: response.status,
      requestId: body?.request_id ?? null,
      outcome: body?.outcome ?? "blocked",
      uiState: permissionDenied
        ? "denied"
        : reviewRequired
          ? "review_required"
          : "error",
      sourceStatuses,
      safeErrorCodes,
      countLeakPrevented:
        body?.count_leak_prevented === true,
      productionReadyClaim:
        body?.production_ready_claim === true
    };
  }

  const sectionIds = [
    "kpis",
    "attention_items",
    "monthly_deposit_revenue",
    "inquiry_status",
    "revenue_ranking",
    "receivables_ranking"
  ];
  const hasShape = (
    body !== null
    && typeof body === "object"
    && !Array.isArray(body)
    && body.sections !== null
    && typeof body.sections === "object"
    && !Array.isArray(body.sections)
    && sectionIds.every((sectionId) => (
      body.sections[sectionId] !== null
      && typeof body.sections[sectionId] === "object"
    ))
    && Array.isArray(body.source_statuses)
    && Array.isArray(body.safe_error_codes)
  );
  if (!hasShape) return { kind: "error", uiState: "error" };

  return {
    kind: "data",
    status: response.status,
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: body.ui_state ?? null,
    generatedAt: body.generated_at ?? null,
    asOf: body.as_of ?? null,
    timezone: body.timezone ?? null,
    sections: body.sections,
    sourceStatuses,
    safeErrorCodes,
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented:
      body.count_leak_prevented === true,
    permissionPrefilterApplied:
      body.permission_prefilter_applied === true,
    rawBankSourceIncluded:
      body.raw_bank_source_included === true,
    rawSourcePayloadIncluded:
      body.raw_source_payload_included === true,
    credentialMaterialIncluded:
      body.credential_material_included === true,
    productionReadyClaim:
      body.production_ready_claim === true
  };
}

async function fetchAnalyticsFinanceReadModel({
  kind,
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF,
  from = null,
  to = null,
  currency = null,
  clientGroupId = null,
  matterId = null,
  recognitionBasis = "billed"
} = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: FINANCE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    recognition_basis: recognitionBasis
  });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (currency) params.set("currency", currency);
  if (clientGroupId) params.set("client_group_id", clientGroupId);
  if (matterId) params.set("matter_id", matterId);

  let body;
  try {
    const response = await apiFetch(`/api/analytics/finance/${kind}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
    if (!response.ok) {
      const uiState = guardedApiUiState(response, body);
      return {
        kind: ["denied", "review", "review_required"].includes(uiState) ? "guarded" : "error",
        status: response.status,
        outcome: body?.outcome ?? "blocked",
        uiState: uiState === "review" ? "review_required" : uiState,
        safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : []
      };
    }
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: body.ui_state ?? null,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    sourceStatuses: Array.isArray(body.source_statuses) ? body.source_statuses : [],
    filters: body.filters ?? null,
    safeErrorCodes: Array.isArray(body.safe_error_codes) ? body.safe_error_codes : [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    rawSourcePayloadIncluded: body.raw_source_payload_included === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchAnalyticsFinanceOverview(options = {}) {
  return fetchAnalyticsFinanceReadModel({ ...options, kind: "overview" });
}

export function fetchAnalyticsFinanceMonthly(options = {}) {
  return fetchAnalyticsFinanceReadModel({ ...options, kind: "monthly" });
}

export function fetchAnalyticsFinanceClients(options = {}) {
  return fetchAnalyticsFinanceReadModel({ ...options, kind: "clients" });
}

export function fetchAnalyticsFinanceCashflow(options = {}) {
  return fetchAnalyticsFinanceReadModel({ ...options, kind: "cashflow" });
}

export function fetchFinanceBankTransactions(options = {}) {
  const {
    from = null,
    to = null,
    direction = null,
    limit = 100,
    accountRef = null,
    ...rest
  } = options;
  return fetchFinanceCollection({
    ...rest,
    path: "/api/finance/bank-transactions",
    query: {
      from,
      to,
      direction,
      limit,
      account_ref: accountRef,
    },
  });
}

export function fetchFinanceBankClassifications(options = {}) {
  const {
    from = null,
    to = null,
    direction = null,
    status = null,
    category = null,
    limit = 620,
    ...rest
  } = options;
  return fetchFinanceCollection({
    ...rest,
    path: "/api/finance/bank-classifications",
    query: { from, to, direction, status, category, limit },
  });
}

export function fetchFinanceBankClassificationOptions(options = {}) {
  return fetchFinanceCollection({
    ...options,
    path: "/api/finance/bank-classification-options",
  });
}

const CLIENT_DEPOSIT_SOURCE_TYPES = new Set(["xlsx", "pdf"]);
const CLIENT_DEPOSIT_DIRECTIONS = new Set(["inflow", "outflow"]);
const CLIENT_DEPOSIT_STATUSES = new Set(["confirmed", "review_required", "unreviewed"]);
const CLIENT_DEPOSIT_IMPORT_STATUSES = new Set(["new", "duplicate", "error"]);
const CLIENT_DEPOSIT_HASH = /^[a-f0-9]{64}$/u;
const CLIENT_DEPOSIT_PREVIEW_ID = /^bank_import_preview_[a-f0-9]{24}$/u;
const CLIENT_DEPOSIT_IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9:_-]{7,127}$/u;
const CLIENT_DEPOSIT_CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const CLIENT_DEPOSIT_MAX_FILE_BYTES = Object.freeze({
  xlsx: 16 * 1024 * 1024,
  pdf: 8 * 1024 * 1024
});
const CLIENT_DEPOSIT_COMMAND_PATHS = Object.freeze({
  auto_classify: "/api/finance/bank-classifications/auto",
  manual_client_link: "/api/finance/bank-classifications/review",
  refund_link: "/api/finance/bank-classifications/review"
});

function clientDepositText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clientDepositFileSourceType(filename, mimeType) {
  const normalizedName = clientDepositText(filename).split(/[\\/]/u).at(-1);
  const normalizedMime = clientDepositText(mimeType).toLowerCase();
  if (
    normalizedName?.toLowerCase().endsWith(".xlsx")
    && [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream"
    ].includes(normalizedMime)
  ) return { filename: normalizedName, mimeType: normalizedMime, sourceType: "xlsx" };
  if (
    normalizedName?.toLowerCase().endsWith(".pdf")
    && normalizedMime === "application/pdf"
  ) return { filename: normalizedName, mimeType: normalizedMime, sourceType: "pdf" };
  return null;
}

function clientDepositCanonicalBase64ByteLength(value) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length % 4 !== 0
    || !CLIENT_DEPOSIT_CANONICAL_BASE64.test(value)
  ) return null;
  try {
    if (typeof globalThis.atob === "function" && typeof globalThis.btoa === "function") {
      const decoded = globalThis.atob(value);
      return globalThis.btoa(decoded) === value ? decoded.length : null;
    }
    if (globalThis.Buffer?.from) {
      const decoded = globalThis.Buffer.from(value, "base64");
      return decoded.toString("base64") === value ? decoded.byteLength : null;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeClientDepositEncodedFile(file) {
  if (!file || typeof file !== "object" || Array.isArray(file)) return null;
  const metadata = clientDepositFileSourceType(file.filename, file.mime_type);
  const byteSize = file.byte_size;
  const contentBase64 = file.content_base64;
  if (
    !metadata
    || !Number.isSafeInteger(byteSize)
    || byteSize < 1
    || byteSize > CLIENT_DEPOSIT_MAX_FILE_BYTES[metadata.sourceType]
    || typeof contentBase64 !== "string"
    || contentBase64.length !== 4 * Math.ceil(byteSize / 3)
    || clientDepositCanonicalBase64ByteLength(contentBase64) !== byteSize
  ) return null;
  return {
    filename: metadata.filename,
    mime_type: metadata.mimeType,
    byte_size: byteSize,
    content_base64: contentBase64
  };
}

function clientDepositSafeCodes(body) {
  return Array.isArray(body?.safe_error_codes)
    ? body.safe_error_codes.filter((value) => typeof value === "string").slice(0, 24)
    : [];
}

function clientDepositUnavailable(code = "SIGNED_SESSION_REQUIRED") {
  return {
    kind: "blocked",
    status: 0,
    outcome: "blocked",
    uiState: "blocked",
    items: [],
    safeErrorCodes: [code],
    countLeakPrevented: true,
    permissionPrefilterApplied: true,
    rawSourcePayloadIncluded: false,
    productionReadyClaim: false
  };
}

export function getClientDepositRouteContext({
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF,
  source = globalThis
} = {}) {
  const envelope = readLawosSessionEnvelope(source);
  if (!envelope) return null;
  const defaultTenant = clientDepositText(envelope.tenant_refs.default);
  const clientTenant = clientDepositText(envelope.tenant_refs.client);
  if (defaultTenant && clientTenant && defaultTenant !== clientTenant) return null;
  const tenantId = defaultTenant || clientTenant;
  if (!tenantId || !clientDepositText(permissionRef) || !clientDepositText(auditHintRef)) return null;
  const context = permissionContextFor(ctx, FINANCE_PERMISSION_CONTEXTS, "client");
  if (clientDepositText(context?.principal?.tenant_id) !== tenantId) return null;
  return {
    tenant_id: tenantId,
    permission_ref: clientDepositText(permissionRef),
    audit_hint_ref: clientDepositText(auditHintRef),
    permissionContext: context
  };
}

function clientDepositGuardedResult(response, body) {
  const status = Number(response?.status ?? 0);
  const uiState = clientDepositText(body?.ui_state);
  const outcome = clientDepositText(body?.outcome) || "blocked";
  const kind = status === 409
    ? "conflict"
    : status === 403 && (!uiState || uiState === "denied")
      ? "guarded"
      : ["review", "review_required"].includes(uiState) || outcome === "review_required"
        ? "guarded"
        : status === 404 && uiState === "empty"
          ? "empty"
          : "error";
  return {
    kind,
    status,
    requestId: body?.request_id ?? null,
    outcome: status === 409 ? "conflict" : outcome,
    uiState: status === 409
      ? "conflict"
      : status === 403 && !uiState
        ? "denied"
        : uiState || (kind === "empty" ? "empty" : "error"),
    item: null,
    items: [],
    safeErrorCodes: clientDepositSafeCodes(body),
    countLeakPrevented: body?.count_leak_prevented === true,
    permissionPrefilterApplied: body?.permission_prefilter_applied === true,
    rawSourcePayloadIncluded: false,
    productionReadyClaim: false
  };
}

async function clientDepositJsonRequest(path, {
  method = "GET",
  payload = null,
  routeContext
} = {}) {
  if (!routeContext) return { unavailable: clientDepositUnavailable() };
  const init = {
    method,
    headers: {
      [PERMISSION_CONTEXT_HEADER]: JSON.stringify(routeContext.permissionContext)
    }
  };
  if (payload !== null) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(payload);
  }
  let response;
  try {
    response = await apiFetch(path, init);
  } catch {
    return { unavailable: { ...clientDepositUnavailable("NETWORK_ERROR"), kind: "error", uiState: "error" } };
  }
  let body;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      return {
        response,
        body: {
          outcome: "blocked",
          ui_state: response.status === 409
            ? "conflict"
            : response.status === 403
              ? "denied"
              : "error",
          safe_error_codes: ["INVALID_ERROR_RESPONSE"]
        }
      };
    }
    return {
      unavailable: {
        ...clientDepositUnavailable("INVALID_RESPONSE"),
        kind: "error",
        status: response.status,
        uiState: "error"
      }
    };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      unavailable: {
        ...clientDepositUnavailable("INVALID_RESPONSE"),
        kind: "error",
        status: response.status,
        uiState: "error"
      }
    };
  }
  return { response, body };
}

const CLIENT_RECEIVABLES_BOUNDARY = Object.freeze({
  count_leak_prevented: true,
  permission_prefilter_applied: true,
  unauthorized_count_included: false,
  raw_bank_source_included: false,
  raw_source_payload_included: false,
  source_metadata_included: false,
  raw_account_included: false,
  raw_counterparty_included: false,
  raw_memo_included: false,
  transaction_fingerprint_included: false,
  bank_reference_included: false,
  credential_material_included: false,
  invoice_required: false,
  matter_required: false,
  production_ready_claim: false
});
const CLIENT_RECEIVABLES_ROW_FIELDS = Object.freeze({
  fee_commitments: Object.freeze([
    "fee_commitment_id", "client_group_id", "agreed_amount",
    "active_allocated_amount", "receivable_amount", "due_date", "accepted_at",
    "status", "state_version"
  ]),
  deposits: Object.freeze([
    "bank_transaction_id", "client_group_id", "gross_amount",
    "linked_refund_amount", "net_amount", "active_allocated_amount",
    "overpayment_amount", "occurred_at"
  ]),
  allocations: Object.freeze([
    "client_deposit_allocation_id", "client_group_id", "bank_transaction_id",
    "fee_commitment_id", "allocated_amount", "reversed_amount", "active_amount",
    "allocation_source", "manual_lock", "state_version"
  ]),
  clients: Object.freeze(["client_group_id", "display_name"]),
  ranking: Object.freeze([
    "rank", "client_group_id", "display_name", "agreed_amount",
    "active_allocated_amount", "receivable_amount", "earliest_due_date"
  ]),
  client_summaries: Object.freeze([
    "client_group_id", "agreed_amount", "active_allocated_amount",
    "receivable_amount", "unknown_amount_count", "overpayment_amount"
  ])
});

function clientReceivablesUnavailable(code = "SIGNED_SESSION_REQUIRED", {
  kind = "blocked",
  status = 0,
  uiState = "blocked"
} = {}) {
  return {
    ...clientDepositUnavailable(code),
    kind,
    status,
    uiState,
    invoiceRequired: false,
    matterRequired: false
  };
}

function clientReceivablesSafeCodes(body) {
  const codes = body?.safe_error_codes;
  return Array.isArray(codes)
    && codes.length <= 24
    && codes.every((code) => typeof code === "string" && code.trim() && code.length <= 160)
    ? [...codes]
    : null;
}

function clientReceivablesBoundaryIsSafe(body) {
  return Object.entries(CLIENT_RECEIVABLES_BOUNDARY)
    .every(([key, value]) => body?.[key] === value);
}

function projectClientReceivablesRows(rows, fields, limit) {
  if (
    !Array.isArray(rows)
    || rows.length > limit
    || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))
  ) return null;
  return rows.map((row) => Object.fromEntries(
    fields.filter((field) => Object.hasOwn(row, field)).map((field) => [field, row[field]])
  ));
}

function projectClientReceivablesReconciliation(value, {
  totalReceivables,
  totalOverpayment
}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const projected = {
    status: value.status,
    ranking_total: value.ranking_total,
    commitment_detail_total: value.commitment_detail_total,
    client_summary_total: value.client_summary_total,
    overpayment_detail_total: value.overpayment_detail_total
  };
  const totals = [
    projected.ranking_total,
    projected.commitment_detail_total,
    projected.client_summary_total,
    projected.overpayment_detail_total
  ];
  return (
    projected.status === "passed"
    && totals.every((amount) => Number.isSafeInteger(amount) && amount >= 0)
    && projected.ranking_total === totalReceivables
    && projected.commitment_detail_total === totalReceivables
    && projected.client_summary_total === totalReceivables
    && projected.overpayment_detail_total === totalOverpayment
  ) ? projected : null;
}

function clientReceivablesGuardedResult(response, body) {
  const status = Number(response?.status ?? 0);
  const safeErrorCodes = clientReceivablesSafeCodes(body);
  const nonJsonConflict = status === 409 && safeErrorCodes?.includes("INVALID_ERROR_RESPONSE");
  const safeMutationError = status >= 400
    && body?.count_leak_prevented === true
    && body?.production_ready_claim === false;
  if (
    !safeErrorCodes
    || (!nonJsonConflict && !safeMutationError && !clientReceivablesBoundaryIsSafe(body))
  ) {
    return clientReceivablesUnavailable("INVALID_RESPONSE", { kind: "error", status, uiState: "error" });
  }
  const review = ["review", "review_required"].includes(body.ui_state)
    || body.outcome === "review_required";
  const denied = status === 403 || ["denied", "permission_denied"].includes(body.ui_state);
  const partial = body.ui_state === "partial" || body.outcome === "partial";
  const conflict = status === 409;
  return {
    ...clientReceivablesUnavailable(safeErrorCodes[0] ?? "REQUEST_BLOCKED", {
      kind: conflict ? "conflict" : partial ? "partial" : denied || review ? "guarded" : "error",
      status,
      uiState: conflict ? "conflict" : partial ? "partial" : denied ? "denied" : review ? "review_required" : "error"
    }),
    requestId: typeof body.request_id === "string" ? body.request_id : null,
    outcome: conflict ? "conflict" : body.outcome ?? "blocked",
    safeErrorCodes,
    ...(partial ? {
      clients: [],
      ranking: [],
      client_summaries: [],
      details: { fee_commitments: [], deposits: [], allocations: [] }
    } : {})
  };
}

function projectClientReceivablesSuccess(body, routeContext, status) {
  const details = Object.fromEntries(["fee_commitments", "deposits", "allocations"].map((key) => [
    key,
    projectClientReceivablesRows(
      body.details?.[key],
      CLIENT_RECEIVABLES_ROW_FIELDS[key],
      5_000
    )
  ]));
  const clients = projectClientReceivablesRows(
    body.clients,
    CLIENT_RECEIVABLES_ROW_FIELDS.clients,
    500
  );
  const ranking = projectClientReceivablesRows(
    body.ranking,
    CLIENT_RECEIVABLES_ROW_FIELDS.ranking,
    500
  );
  const clientSummaries = projectClientReceivablesRows(
    body.client_summaries,
    CLIENT_RECEIVABLES_ROW_FIELDS.client_summaries,
    500
  );
  const safeErrorCodes = clientReceivablesSafeCodes(body);
  const reconciliation = projectClientReceivablesReconciliation(
    body.reconciliation,
    {
      totalReceivables: body.total_receivables,
      totalOverpayment: body.total_overpayment
    }
  );
  const clientIds = new Set(clients?.map((row) => row.client_group_id));
  const clientRows = [
    ...(ranking ?? []),
    ...(clientSummaries ?? []),
    ...(details.fee_commitments ?? []),
    ...(details.deposits ?? []),
    ...(details.allocations ?? [])
  ];
  const empty = body.ui_state === "empty";
  const valid = (
    status === 200
    && body.outcome === "passed"
    && [null, "empty"].includes(body.ui_state)
    && body.audit_hint_ref === routeContext.audit_hint_ref
    && body.basis === "fee_commitment_and_bank_deposit"
    && body.currency === "KRW"
    && body.unallocated_amount_basis === "same_as_total_overpayment"
    && body.unallocated_amount === body.total_overpayment
    && safeErrorCodes?.length === 0
    && clientReceivablesBoundaryIsSafe(body)
    && clients && ranking && clientSummaries
    && reconciliation
    && Object.values(details).every(Boolean)
    && Object.values(details).reduce((count, rows) => count + rows.length, 0) <= 10_000
    && clients.every((row) => (
      typeof row.client_group_id === "string" && row.client_group_id.trim()
      && typeof row.display_name === "string" && row.display_name.trim()
    ))
    && new Set(clients.map((row) => row.client_group_id)).size === clients.length
    && clientRows.every((row) => clientIds.has(row.client_group_id))
    && details.fee_commitments.every((row) => (
      row.status === "active"
      && Number.isSafeInteger(row.state_version) && row.state_version > 0
    ))
    && details.allocations.every((row) => (
      Number.isSafeInteger(row.state_version) && row.state_version > 0
    ))
    && (!empty || (
      Object.values(details).every((rows) => rows.length === 0)
      && body.total_receivables === 0
      && body.unknown_amount_count === 0
      && body.total_overpayment === 0
    ))
  );
  if (!valid) return null;
  const projected = {
    kind: "data",
    status,
    requestId: typeof body.request_id === "string" ? body.request_id : null,
    outcome: "passed",
    uiState: body.ui_state,
    basis: body.basis,
    currency: body.currency,
    as_of: body.as_of,
    total_receivables: body.total_receivables,
    unknown_amount_count: body.unknown_amount_count,
    total_overpayment: body.total_overpayment,
    unallocated_amount: body.unallocated_amount,
    clients,
    ranking: empty ? [] : ranking,
    client_summaries: empty ? [] : clientSummaries,
    details,
    reconciliation,
    safeErrorCodes,
    auditHintRef: body.audit_hint_ref,
    ...CLIENT_RECEIVABLES_BOUNDARY
  };
  const model = buildClientReceivablesModel({
    receivablesResult: projected,
    clientsResult: projected
  });
  return model.state === (empty ? "empty" : "data") ? projected : null;
}

export function getClientReceivablesRouteContext(options = {}) {
  const {
    ctx = "allow",
    permissionRef = CLIENT_RECEIVABLES_PERMISSION_REF,
    auditHintRef = CLIENT_RECEIVABLES_AUDIT_HINT_REF,
    source = globalThis
  } = options;
  const envelope = readLawosSessionEnvelope(source);
  if (!envelope) return null;
  const defaultTenant = clientDepositText(envelope.tenant_refs.default);
  const clientTenant = clientDepositText(envelope.tenant_refs.client);
  if (defaultTenant && clientTenant && defaultTenant !== clientTenant) return null;
  const tenantId = defaultTenant || clientTenant;
  if (!tenantId || !clientDepositText(permissionRef) || !clientDepositText(auditHintRef)) return null;
  const context = permissionContextFor(ctx, FINANCE_PERMISSION_CONTEXTS, "client");
  if (clientDepositText(context?.principal?.tenant_id) !== tenantId) return null;
  return {
    tenant_id: tenantId,
    permission_ref: clientDepositText(permissionRef),
    audit_hint_ref: clientDepositText(auditHintRef),
    permissionContext: context
  };
}

export async function fetchClientReceivables({
  ctx = "allow",
  permissionRef = CLIENT_RECEIVABLES_PERMISSION_REF,
  auditHintRef = CLIENT_RECEIVABLES_AUDIT_HINT_REF
} = {}) {
  const routeContext = getClientReceivablesRouteContext({ ctx, permissionRef, auditHintRef });
  const params = routeContext && new URLSearchParams({
    tenant_id: routeContext.tenant_id,
    permission_ref: routeContext.permission_ref,
    audit_hint_ref: routeContext.audit_hint_ref
  });
  const result = await clientDepositJsonRequest(
    params ? `/api/finance/client-receivables?${params}` : "",
    { routeContext }
  );
  if (result.unavailable) return result.unavailable;
  if (!result.response.ok || result.body.outcome !== "passed") {
    return clientReceivablesGuardedResult(result.response, result.body);
  }
  return projectClientReceivablesSuccess(result.body, routeContext, result.response.status)
    ?? clientReceivablesUnavailable("INVALID_RESPONSE", {
      kind: "error",
      status: result.response.status,
      uiState: "error"
    });
}

function clientReceivablesMutationResult(response, body, routeContext, {
  outcome,
  targetField,
  targetId,
  expectedStateVersion = null
}) {
  const replay = body?.idempotent_replay === true;
  const acceptedOutcomes = Array.isArray(outcome) ? outcome : [outcome];
  const valid = (
    response.status === 200
    && clientReceivablesSafeCodes(body)?.length === 0
    && body.audit_hint_ref === routeContext.audit_hint_ref
    && body.production_ready_claim === false
    && typeof body.idempotent_replay === "boolean"
    && (replay
      ? body.outcome === "idempotent_replay"
      : acceptedOutcomes.includes(body.outcome))
    && body.item?.[targetField] === targetId
    && (expectedStateVersion === null
      || body.item.state_version === expectedStateVersion + 1)
  );
  const item = targetField === "fee_commitment_id"
    ? {
      fee_commitment_id: targetId,
      state_version: body.item?.state_version,
      status: body.item?.status
    }
    : {
      bank_transaction_id: targetId,
      active_allocated_amount: body.item?.active_allocated_amount,
      unallocated_amount: body.item?.unallocated_amount
    };
  return valid ? {
    kind: "data",
    status: 200,
    outcome: body.outcome,
    item,
    items: [],
    idempotentReplay: replay,
    safeErrorCodes: [],
    productionReadyClaim: false
  } : null;
}

export async function patchClientFeeCommitment({
  ctx = "allow",
  operation = "edit",
  feeCommitmentId,
  expectedStateVersion,
  changes = null,
  reason,
  idempotencyKey,
  permissionRef = CLIENT_RECEIVABLES_PERMISSION_REF,
  auditHintRef = CLIENT_RECEIVABLES_AUDIT_HINT_REF
} = {}) {
  const routeContext = getClientReceivablesRouteContext({ ctx, permissionRef, auditHintRef });
  if (!routeContext) return clientReceivablesUnavailable();
  let command;
  try {
    command = buildFeeCommitmentCommand({
      operation,
      tenantId: routeContext.tenant_id,
      feeCommitmentId,
      expectedStateVersion,
      ...(operation === "cancel" ? {} : { changes }),
      reason,
      idempotencyKey
    });
  } catch {
    return clientReceivablesUnavailable("INVALID_COMMAND", { kind: "error", uiState: "error" });
  }
  const result = await clientDepositJsonRequest(
    `/api/finance/fee-commitments/${encodeURIComponent(command.fee_commitment_id)}`,
    {
      method: "PATCH",
      routeContext,
      payload: {
        tenant_id: command.tenant_id,
        permission_ref: routeContext.permission_ref,
        audit_hint_ref: routeContext.audit_hint_ref,
        expected_state_version: command.expected_state_version,
        changes: command.changes,
        reason: command.reason,
        idempotency_key: command.idempotency_key
      }
    }
  );
  if (result.unavailable) return result.unavailable;
  if (!result.response.ok) return clientReceivablesGuardedResult(result.response, result.body);
  const projected = clientReceivablesMutationResult(result.response, result.body, routeContext, {
    outcome: operation === "cancel" ? "cancelled" : "updated",
    targetField: "fee_commitment_id",
    targetId: command.fee_commitment_id,
    expectedStateVersion: command.expected_state_version
  });
  if (projected && operation === "cancel" && projected.item.status !== "cancelled") {
    return clientReceivablesUnavailable("INVALID_RESPONSE", {
      kind: "error", status: result.response.status, uiState: "error"
    });
  }
  return projected ?? clientReceivablesUnavailable("INVALID_RESPONSE", {
    kind: "error", status: result.response.status, uiState: "error"
  });
}

export async function reallocateClientReceivableDeposit({
  ctx = "allow",
  bankTransactionId,
  clientGroupId,
  depositNetAmount,
  expectedAllocations,
  targets,
  reason,
  idempotencyKey,
  permissionRef = CLIENT_RECEIVABLES_PERMISSION_REF,
  auditHintRef = CLIENT_RECEIVABLES_AUDIT_HINT_REF
} = {}) {
  const routeContext = getClientReceivablesRouteContext({ ctx, permissionRef, auditHintRef });
  if (!routeContext) return clientReceivablesUnavailable();
  const selectedClientId = clientDepositText(clientGroupId);
  if (
    !selectedClientId
    || !Number.isSafeInteger(depositNetAmount)
    || depositNetAmount < 0
  ) {
    return clientReceivablesUnavailable("INVALID_COMMAND", { kind: "error", uiState: "error" });
  }
  let command;
  try {
    command = buildClientDepositReallocationCommand({
      tenantId: routeContext.tenant_id,
      bankTransactionId,
      expectedAllocations,
      targets,
      reason,
      idempotencyKey
    });
  } catch {
    return clientReceivablesUnavailable("INVALID_COMMAND", { kind: "error", uiState: "error" });
  }
  const result = await clientDepositJsonRequest(
    "/api/finance/client-deposit-allocations/reallocate",
    {
      method: "POST",
      routeContext,
      payload: {
        ...command,
        permission_ref: routeContext.permission_ref,
        audit_hint_ref: routeContext.audit_hint_ref
      }
    }
  );
  if (result.unavailable) return result.unavailable;
  if (!result.response.ok) return clientReceivablesGuardedResult(result.response, result.body);
  const projected = clientReceivablesMutationResult(result.response, result.body, routeContext, {
    outcome: ["reallocated", "unchanged"],
    targetField: "bank_transaction_id",
    targetId: command.bank_transaction_id
  });
  const expected = new Map(command.expected_allocations.map((row) => [
    row.client_deposit_allocation_id,
    row.state_version
  ]));
  const targetsByFee = new Map(command.targets.map((row) => [
    row.fee_commitment_id,
    row.active_amount
  ]));
  const items = projectClientReceivablesRows(
    result.body.items,
    CLIENT_RECEIVABLES_ROW_FIELDS.allocations,
    200
  );
  const responseVersions = new Map(items?.map((row) => [
    row.client_deposit_allocation_id,
    row.state_version
  ]));
  const responseFees = new Set(items?.map((row) => row.fee_commitment_id));
  const returnedTotal = items?.reduce((sum, row) => (
    Number.isSafeInteger(row.active_amount) && Number.isSafeInteger(sum + row.active_amount)
      ? sum + row.active_amount
      : Number.NaN
  ), 0);
  const targetTotal = command.targets.reduce((sum, row) => sum + row.active_amount, 0);
  const valid = projected
    && result.body.raw_source_payload_included === false
    && items
    && items.length === targetsByFee.size
    && responseVersions.size === items.length
    && responseFees.size === targetsByFee.size
    && Number.isSafeInteger(projected.item.active_allocated_amount)
    && projected.item.active_allocated_amount >= 0
    && Number.isSafeInteger(projected.item.unallocated_amount)
    && projected.item.unallocated_amount >= 0
    && Number.isSafeInteger(targetTotal)
    && returnedTotal === targetTotal
    && projected.item.active_allocated_amount === targetTotal
    && projected.item.unallocated_amount === depositNetAmount - targetTotal
    && items.every((row) => (
      row.client_group_id === selectedClientId
      && row.bank_transaction_id === command.bank_transaction_id
      && targetsByFee.get(row.fee_commitment_id) === row.active_amount
      && Number.isSafeInteger(row.allocated_amount) && row.allocated_amount >= 0
      && Number.isSafeInteger(row.reversed_amount) && row.reversed_amount >= 0
      && row.allocated_amount - row.reversed_amount === row.active_amount
      && row.allocation_source === "manual"
      && row.manual_lock === true
      && Number.isSafeInteger(row.state_version) && row.state_version > 0
    ))
    && [...expected].every(([id, version]) => (
      Number.isSafeInteger(responseVersions.get(id))
      && responseVersions.get(id) >= version
      && responseVersions.get(id) <= version + 1
    ))
    && items.every((row) => (
      expected.has(row.client_deposit_allocation_id)
      || row.state_version === 1
    ));
  return valid ? {
    ...projected,
    items,
    rawSourcePayloadIncluded: false
  } : clientReceivablesUnavailable("INVALID_RESPONSE", {
    kind: "error", status: result.response.status, uiState: "error"
  });
}

function projectClientDepositItem(item, tenantId) {
  const id = clientDepositText(item?.bank_transaction_id);
  const classificationId = clientDepositText(item?.bank_transaction_classification_id);
  const direction = clientDepositText(item?.transaction_direction);
  const status = clientDepositText(item?.status);
  if (
    item?.model_type !== "ClientDeposit"
    || clientDepositText(item.tenant_id) !== tenantId
    || !id
    || !classificationId
    || !CLIENT_DEPOSIT_DIRECTIONS.has(direction)
    || !Number.isSafeInteger(item.amount)
    || item.amount < 0
    || item.currency !== "KRW"
    || !CLIENT_DEPOSIT_STATUSES.has(status)
    || !Number.isSafeInteger(item.state_version)
    || item.state_version < 1
    || item.source_metadata_included !== false
    || item.raw_source_payload_included !== false
    || item.raw_account_included !== false
    || item.raw_counterparty_included !== false
    || item.raw_memo_included !== false
    || item.transaction_fingerprint_included !== false
    || item.credential_material_included !== false
    || item.production_ready_claim !== false
  ) {
    return null;
  }
  const availableCommands = Array.isArray(item.available_commands)
    ? item.available_commands.filter((command) => Object.hasOwn(CLIENT_DEPOSIT_COMMAND_PATHS, command))
    : [];
  return {
    model_type: "ClientDeposit",
    resource_id: id,
    tenant_id: tenantId,
    bank_transaction_id: id,
    bank_transaction_classification_id: classificationId,
    transaction_date: clientDepositText(item.transaction_date) || null,
    occurred_at: clientDepositText(item.occurred_at) || null,
    transaction_direction: direction,
    amount: item.amount,
    currency: "KRW",
    category: clientDepositText(item.category),
    category_label: clientDepositText(item.category_label) || null,
    primary_type: clientDepositText(item.primary_type) || null,
    client_group_id: clientDepositText(item.client_group_id) || null,
    client_group_label: clientDepositText(item.client_group_label) || null,
    status,
    confidence: clientDepositText(item.confidence),
    classification_source: clientDepositText(item.classification_source),
    rationale_code: clientDepositText(item.rationale_code),
    manual_lock: item.manual_lock === true,
    refund_of_bank_transaction_id:
      clientDepositText(item.refund_of_bank_transaction_id) || null,
    state_version: item.state_version,
    source_type: CLIENT_DEPOSIT_SOURCE_TYPES.has(clientDepositText(item.source_type))
      ? clientDepositText(item.source_type)
      : null,
    source_file_sha256: CLIENT_DEPOSIT_HASH.test(clientDepositText(item.source_file_sha256))
      ? clientDepositText(item.source_file_sha256)
      : null,
    source_row_number: Number.isSafeInteger(item.source_row_number) && item.source_row_number > 0
      ? item.source_row_number
      : null,
    source_page_number: Number.isSafeInteger(item.source_page_number) && item.source_page_number > 0
      ? item.source_page_number
      : null,
    bank_reference_hash: CLIENT_DEPOSIT_HASH.test(clientDepositText(item.bank_reference_hash))
      ? clientDepositText(item.bank_reference_hash)
      : null,
    available_commands: availableCommands,
    source_metadata_included: false,
    raw_source_payload_included: false,
    raw_account_included: false,
    raw_counterparty_included: false,
    raw_memo_included: false,
    transaction_fingerprint_included: false,
    credential_material_included: false,
    production_ready_claim: false
  };
}

function projectClientDepositCommands(commands) {
  if (!Array.isArray(commands)) return null;
  const projected = commands.map((entry) => {
    const command = clientDepositText(entry?.command);
    const path = clientDepositText(entry?.path);
    if (
      entry?.method !== "POST"
      || !Object.hasOwn(CLIENT_DEPOSIT_COMMAND_PATHS, command)
      || CLIENT_DEPOSIT_COMMAND_PATHS[command] !== path
      || !Array.isArray(entry.required_body_fields)
      || !Array.isArray(entry.response_binding_fields)
    ) return null;
    return { command, method: "POST", path };
  });
  return projected.every(Boolean) && projected.length === 3 ? projected : null;
}

export async function fetchClientDeposits({
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF,
  from = null,
  to = null,
  direction = null,
  status = null,
  clientGroupId = null,
  limit = 100,
  cursor = null
} = {}) {
  const routeContext = getClientDepositRouteContext({ ctx, permissionRef, auditHintRef });
  if (!routeContext) return clientDepositUnavailable();
  const params = new URLSearchParams({
    tenant_id: routeContext.tenant_id,
    permission_ref: routeContext.permission_ref,
    audit_hint_ref: routeContext.audit_hint_ref,
    limit: String(limit)
  });
  for (const [key, value] of Object.entries({
    from,
    to,
    direction,
    status,
    client_group_id: clientGroupId,
    cursor
  })) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  const result = await clientDepositJsonRequest(
    `/api/finance/client-deposits?${params.toString()}`,
    { routeContext }
  );
  if (result.unavailable) return result.unavailable;
  const { response, body } = result;
  if (!response.ok) return clientDepositGuardedResult(response, body);
  const page = body.page_info;
  const commands = projectClientDepositCommands(body.supported_commands);
  const items = Array.isArray(body.items)
    ? body.items.map((item) => projectClientDepositItem(item, routeContext.tenant_id))
    : null;
  const valid = (
    ["passed", "partial"].includes(body.outcome)
    && Array.isArray(items)
    && items.every(Boolean)
    && new Set(items.map((item) => item.bank_transaction_id)).size === items.length
    && commands
    && page
    && page.returned_count === items.length
    && page.omitted_item_count === null
    && typeof page.has_more === "boolean"
    && (
      (page.has_more && clientDepositText(page.next_cursor))
      || (!page.has_more && page.next_cursor === null)
    )
    && body.permission_prefilter_applied === true
    && body.count_leak_prevented === true
    && body.unauthorized_count_included === false
    && body.raw_source_payload_included === false
    && body.production_ready_claim === false
    && Array.isArray(body.safe_error_codes)
  );
  if (!valid) {
    return {
      ...clientDepositUnavailable("INVALID_RESPONSE"),
      kind: "error",
      status: response.status,
      uiState: "error"
    };
  }
  const state = body.outcome === "partial"
    ? "partial"
    : items.length === 0
      ? "empty"
      : "data";
  return {
    kind: state,
    status: response.status,
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: state === "data" ? null : state,
    items,
    supportedCommands: commands,
    pageInfo: {
      returnedCount: page.returned_count,
      omittedItemCount: null,
      hasMore: page.has_more,
      nextCursor: page.next_cursor
    },
    safeErrorCodes: clientDepositSafeCodes(body),
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: true,
    permissionPrefilterApplied: true,
    unauthorizedCountIncluded: false,
    rawSourcePayloadIncluded: false,
    productionReadyClaim: false
  };
}

export async function fetchClientDepositDetail({
  transactionId,
  expectedClassificationId = null,
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF
} = {}) {
  const routeContext = getClientDepositRouteContext({ ctx, permissionRef, auditHintRef });
  const id = clientDepositText(transactionId);
  if (!routeContext || !id) return clientDepositUnavailable();
  const params = new URLSearchParams({
    tenant_id: routeContext.tenant_id,
    permission_ref: routeContext.permission_ref,
    audit_hint_ref: routeContext.audit_hint_ref
  });
  const result = await clientDepositJsonRequest(
    `/api/finance/client-deposits/${encodeURIComponent(id)}?${params.toString()}`,
    { routeContext }
  );
  if (result.unavailable) return result.unavailable;
  const { response, body } = result;
  if (!response.ok) return clientDepositGuardedResult(response, body);
  const item = projectClientDepositItem(body.item, routeContext.tenant_id);
  const commands = projectClientDepositCommands(body.supported_commands);
  const valid = (
    body.outcome === "passed"
    && item?.bank_transaction_id === id
    && (!expectedClassificationId
      || item.bank_transaction_classification_id === expectedClassificationId)
    && commands
    && body.permission_prefilter_applied === true
    && body.count_leak_prevented === true
    && body.unauthorized_count_included === false
    && body.raw_source_payload_included === false
    && body.production_ready_claim === false
  );
  if (!valid) {
    return {
      ...clientDepositUnavailable("INVALID_RESPONSE"),
      kind: "error",
      status: response.status,
      uiState: "error"
    };
  }
  return {
    kind: "data",
    status: response.status,
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: null,
    item,
    supportedCommands: commands,
    safeErrorCodes: clientDepositSafeCodes(body),
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: true,
    permissionPrefilterApplied: true,
    rawSourcePayloadIncluded: false,
    productionReadyClaim: false
  };
}

export async function encodeClientDepositBankFile(file) {
  const metadata = clientDepositFileSourceType(
    file?.name ?? file?.filename,
    file?.type ?? file?.mime_type
  );
  if (!metadata || typeof file?.arrayBuffer !== "function") return null;
  const buffer = await file.arrayBuffer();
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 1
      || buffer.byteLength > CLIENT_DEPOSIT_MAX_FILE_BYTES[metadata.sourceType]
      || (file?.size !== undefined
        && (!Number.isSafeInteger(file.size) || file.size !== buffer.byteLength))) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : globalThis.Buffer?.from(bytes)?.toString("base64");
  if (!base64) return null;
  return normalizeClientDepositEncodedFile({
    filename: metadata.filename,
    mime_type: metadata.mimeType,
    byte_size: buffer.byteLength,
    content_base64: base64
  });
}

function projectClientDepositPreviewItem(item) {
  const id = clientDepositText(item?.bank_transaction_id);
  const status = clientDepositText(item?.status);
  if (
    !id
    || !CLIENT_DEPOSIT_IMPORT_STATUSES.has(status)
    || item.source_metadata_included !== false
    || item.transaction_fingerprint_included !== false
    || item.raw_source_payload_included !== false
  ) return null;
  return {
    bank_transaction_id: id,
    row_number: Number.isSafeInteger(item.row_number) && item.row_number > 0
      ? item.row_number
      : null,
    status,
    direction: CLIENT_DEPOSIT_DIRECTIONS.has(clientDepositText(item.direction))
      ? clientDepositText(item.direction)
      : null,
    amount: Number.isSafeInteger(item.amount) && item.amount >= 0 ? item.amount : null,
    currency: item.currency === "KRW" ? "KRW" : null,
    date: clientDepositText(item.date) || null,
    occurred_at: clientDepositText(item.occurred_at) || null,
    balance_after: Number.isSafeInteger(item.balance_after) && item.balance_after >= 0
      ? item.balance_after
      : null,
    source_type: CLIENT_DEPOSIT_SOURCE_TYPES.has(clientDepositText(item.source_type))
      ? clientDepositText(item.source_type)
      : null,
    safe_error_code: clientDepositText(item.safe_error_code) || null,
    source_metadata_included: false,
    transaction_fingerprint_included: false,
    raw_source_payload_included: false
  };
}

export async function previewClientDepositBankImport({
  file,
  accountRef,
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF
} = {}) {
  const routeContext = getClientDepositRouteContext({ ctx, permissionRef, auditHintRef });
  if (!routeContext) return clientDepositUnavailable();
  const preparedFile = typeof file?.content_base64 === "string"
    ? normalizeClientDepositEncodedFile(file)
    : await encodeClientDepositBankFile(file);
  if (!preparedFile || !clientDepositText(accountRef)) {
    return { ...clientDepositUnavailable("SOURCE_FILE_INVALID"), kind: "error", uiState: "error" };
  }
  const payload = {
    tenant_id: routeContext.tenant_id,
    permission_ref: routeContext.permission_ref,
    audit_hint_ref: routeContext.audit_hint_ref,
    account_ref: clientDepositText(accountRef),
    file: preparedFile
  };
  const result = await clientDepositJsonRequest(
    "/api/finance/bank-imports/preview",
    { method: "POST", payload, routeContext }
  );
  if (result.unavailable) return result.unavailable;
  const { response, body } = result;
  if (!response.ok) return clientDepositGuardedResult(response, body);
  const preview = body.preview;
  const counts = preview?.counts;
  const items = Array.isArray(preview?.items)
    ? preview.items.map(projectClientDepositPreviewItem)
    : null;
  const valid = (
    body.outcome === "preview_ready"
    && CLIENT_DEPOSIT_PREVIEW_ID.test(clientDepositText(preview?.preview_id))
    && CLIENT_DEPOSIT_HASH.test(clientDepositText(preview?.preview_manifest_sha256))
    && CLIENT_DEPOSIT_HASH.test(clientDepositText(preview?.source_file_sha256))
    && CLIENT_DEPOSIT_SOURCE_TYPES.has(clientDepositText(preview?.source_type))
    && clientDepositText(preview?.account_ref) === clientDepositText(accountRef)
    && counts
    && ["total", "new", "duplicate", "error"].every((key) => (
      Number.isSafeInteger(counts[key]) && counts[key] >= 0
    ))
    && counts.total === counts.new + counts.duplicate + counts.error
    && Array.isArray(items)
    && items.every(Boolean)
    && items.length === counts.total
    && new Set(items.map((item) => item.bank_transaction_id)).size === items.length
    && items.filter((item) => item.status === "new").length === counts.new
    && items.filter((item) => item.status === "duplicate").length === counts.duplicate
    && items.filter((item) => item.status === "error").length === counts.error
    && clientDepositText(preview.preview_confirmation_token)
    && Number.isFinite(Date.parse(preview.confirmation_expires_at))
    && preview.confirmation_token_included === true
    && preview.product_records_mutated === false
    && preview.raw_source_payload_included === false
    && body.count_leak_prevented === true
    && body.production_ready_claim === false
  );
  if (!valid) {
    return {
      ...clientDepositUnavailable("INVALID_RESPONSE"),
      kind: "error",
      status: response.status,
      uiState: "error"
    };
  }
  return {
    kind: "data",
    status: response.status,
    adapter_capability: "finance-bank-import-preview-v1",
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: null,
    preview: {
      preview_id: preview.preview_id,
      preview_manifest_sha256: preview.preview_manifest_sha256,
      source_file_sha256: preview.source_file_sha256,
      source_type: preview.source_type,
      account_ref: preview.account_ref,
      counts: {
        total: counts.total,
        new: counts.new,
        duplicate: counts.duplicate,
        error: counts.error
      },
      items,
      extracted_page_count: Number.isSafeInteger(preview.extracted_page_count)
        ? preview.extracted_page_count
        : null,
      extracted_character_count: Number.isSafeInteger(preview.extracted_character_count)
        ? preview.extracted_character_count
        : null,
      preview_confirmation_token: preview.preview_confirmation_token,
      confirmation_expires_at: preview.confirmation_expires_at,
      confirmation_token_included: true,
      product_records_mutated: false,
      raw_source_payload_included: false
    },
    preparedFile,
    safeErrorCodes: clientDepositSafeCodes(body),
    countLeakPrevented: true,
    permissionPrefilterApplied: true,
    rawSourcePayloadIncluded: false,
    productionReadyClaim: false
  };
}

function validClientDepositCommandContext(command, routeContext) {
  return (
    command
    && typeof command === "object"
    && !Array.isArray(command)
    && command.tenant_id === routeContext?.tenant_id
    && clientDepositText(command.permission_ref) === routeContext.permission_ref
    && clientDepositText(command.audit_hint_ref) === routeContext.audit_hint_ref
    && CLIENT_DEPOSIT_IDEMPOTENCY_KEY.test(clientDepositText(command.idempotency_key))
    && command.transactions === undefined
    && command.matter_id === undefined
    && command.invoice_id === undefined
  );
}

export async function confirmClientDepositBankImport({
  command,
  expectedPreview,
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF
} = {}) {
  const routeContext = getClientDepositRouteContext({ ctx, permissionRef, auditHintRef });
  const expectedId = clientDepositText(expectedPreview?.previewId ?? expectedPreview?.preview_id);
  const expectedNew = expectedPreview?.counts?.new;
  const preparedFile = normalizeClientDepositEncodedFile(command?.file);
  if (
    !routeContext
    || !validClientDepositCommandContext(command, routeContext)
    || !expectedId
    || !Number.isSafeInteger(expectedNew)
    || command.production_import_approved !== true
    || !clientDepositText(command.preview_confirmation_token)
    || !preparedFile
  ) {
    return { ...clientDepositUnavailable("INVALID_COMMAND"), kind: "error", uiState: "error" };
  }
  const payload = { ...command, file: preparedFile };
  const result = await clientDepositJsonRequest(
    "/api/finance/bank-imports",
    { method: "POST", payload, routeContext }
  );
  if (result.unavailable) return result.unavailable;
  const { response, body } = result;
  if (!response.ok) return clientDepositGuardedResult(response, body);
  const item = body.item;
  const replay = body.outcome === "idempotent_replay";
  const valid = (
    ["created", "idempotent_replay"].includes(body.outcome)
    && body.idempotent_replay === replay
    && body.confirmed_preview_id === expectedId
    && body.transaction_count === expectedNew
    && item
    && item.model_type === "BankImportBatch"
    && item.tenant_id === routeContext.tenant_id
    && item.preview_id === expectedId
    && item.transaction_count === expectedNew
    && item.source_hashes_included === false
    && item.raw_source_payload_included === false
    && item.credential_material_included === false
    && item.production_ready_claim === false
    && body.confirmation_token_included === false
    && body.raw_source_payload_included === false
    && body.production_ready_claim === false
  );
  if (!valid) {
    return {
      ...clientDepositUnavailable("INVALID_RESPONSE"),
      kind: "conflict",
      status: response.status,
      uiState: "conflict",
      outcome: "conflict"
    };
  }
  return {
    kind: "data",
    status: response.status,
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: null,
    item: {
      bank_import_batch_id: item.bank_import_batch_id,
      tenant_id: routeContext.tenant_id,
      preview_id: expectedId,
      source_file_sha256: item.source_file_sha256 ?? null,
      source_type: item.source_type,
      account_ref: item.account_ref,
      transaction_count: expectedNew,
      raw_source_payload_included: false,
      production_ready_claim: false
    },
    transactionCount: expectedNew,
    confirmedPreviewId: expectedId,
    sourceFileSha256: item.source_file_sha256 ?? null,
    idempotentReplay: replay,
    safeErrorCodes: clientDepositSafeCodes(body),
    rawSourcePayloadIncluded: false,
    productionReadyClaim: false
  };
}

function projectClientDepositReceipt(receipt) {
  if (
    !receipt
    || typeof receipt !== "object"
    || Array.isArray(receipt)
    || !clientDepositText(receipt.bank_transaction_id)
    || !clientDepositText(receipt.bank_transaction_classification_id)
    || !Number.isSafeInteger(receipt.state_version)
    || receipt.state_version < 1
    || !clientDepositText(receipt.category)
    || !clientDepositText(receipt.status)
    || !CLIENT_DEPOSIT_IDEMPOTENCY_KEY.test(clientDepositText(receipt.idempotency_key))
    || !CLIENT_DEPOSIT_HASH.test(clientDepositText(receipt.request_fingerprint))
    || !Object.hasOwn(receipt, "client_group_id")
    || !Object.hasOwn(receipt, "refund_of_bank_transaction_id")
    || receipt.raw_source_payload_included !== false
    || receipt.production_ready_claim !== false
  ) return null;
  return {
    bank_transaction_id: receipt.bank_transaction_id,
    bank_transaction_classification_id: receipt.bank_transaction_classification_id,
    state_version: receipt.state_version,
    category: receipt.category,
    status: receipt.status,
    client_group_id: clientDepositText(receipt.client_group_id) || null,
    refund_of_bank_transaction_id:
      clientDepositText(receipt.refund_of_bank_transaction_id) || null,
    idempotency_key: receipt.idempotency_key,
    request_fingerprint: receipt.request_fingerprint,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

async function postClientDepositClassification({
  path,
  command,
  binding,
  ctx,
  permissionRef,
  auditHintRef
}) {
  const routeContext = getClientDepositRouteContext({ ctx, permissionRef, auditHintRef });
  if (!routeContext || !validClientDepositCommandContext(command, routeContext) || !binding) {
    return { ...clientDepositUnavailable("INVALID_COMMAND"), kind: "error", uiState: "error" };
  }
  const result = await clientDepositJsonRequest(
    path,
    { method: "POST", payload: command, routeContext }
  );
  if (result.unavailable) return result.unavailable;
  const { response, body } = result;
  if (!response.ok) return clientDepositGuardedResult(response, body);
  const receipts = Array.isArray(body.command_receipts)
    ? body.command_receipts.map(projectClientDepositReceipt)
    : [];
  const itemReceipt = projectClientDepositReceipt(body.item?.command_receipt);
  const receipt = receipts[0];
  const expectedClient = Object.hasOwn(binding, "expected_client_group_id")
    ? clientDepositText(binding.expected_client_group_id) || null
    : receipt?.client_group_id;
  const expectedRefund = Object.hasOwn(binding, "expected_refund_of_bank_transaction_id")
    ? clientDepositText(binding.expected_refund_of_bank_transaction_id) || null
    : receipt?.refund_of_bank_transaction_id;
  const replay = body.outcome === "idempotent_replay";
  const valid = (
    ["classified", "idempotent_replay"].includes(body.outcome)
    && body.idempotent_replay === replay
    && receipts.length === 1
    && receipt
    && itemReceipt
    && JSON.stringify(receipt) === JSON.stringify(itemReceipt)
    && receipt.bank_transaction_id === binding.selected_transaction_id
    && receipt.bank_transaction_classification_id === binding.selected_classification_id
    && receipt.state_version >= binding.expected_state_version
    && receipt.idempotency_key === command.idempotency_key
    && body.idempotency_key === command.idempotency_key
    && receipt.request_fingerprint === body.request_fingerprint
    && (!Object.hasOwn(binding, "expected_category")
      || receipt.category === binding.expected_category)
    && (!Object.hasOwn(binding, "expected_status")
      || receipt.status === binding.expected_status)
    && receipt.client_group_id === expectedClient
    && receipt.refund_of_bank_transaction_id === expectedRefund
    && body.raw_source_payload_included === false
    && body.production_ready_claim === false
  );
  if (!valid) {
    return {
      ...clientDepositUnavailable("RECEIPT_BINDING_FAILED"),
      kind: "blocked",
      status: response.status,
      uiState: "blocked"
    };
  }
  return {
    kind: "data",
    status: response.status,
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: null,
    tenant_id: routeContext.tenant_id,
    item: { command_receipt: receipt },
    command_receipts: [receipt],
    idempotency_key: body.idempotency_key,
    request_fingerprint: body.request_fingerprint,
    idempotent_replay: replay,
    safeErrorCodes: clientDepositSafeCodes(body),
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

export function autoClassifyClientDeposit({
  command,
  binding,
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF
} = {}) {
  return postClientDepositClassification({
    path: "/api/finance/bank-classifications/auto",
    command,
    binding,
    ctx,
    permissionRef,
    auditHintRef
  });
}

export function reviewClientDepositClassification({
  command,
  binding,
  ctx = "allow",
  permissionRef = CLIENT_DEPOSIT_PERMISSION_REF,
  auditHintRef = CLIENT_DEPOSIT_AUDIT_HINT_REF
} = {}) {
  return postClientDepositClassification({
    path: "/api/finance/bank-classifications/review",
    command,
    binding,
    ctx,
    permissionRef,
    auditHintRef
  });
}

export function autoClassifyFinanceBankTransactions({ ctx = "allow" } = {}) {
  return postFinanceRuntime({
    path: "/api/finance/bank-classifications/auto",
    ctx,
    roleIds: ["system_super_admin"],
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      idempotency_key: `ui:finance:bank-classification:auto:${Date.now()}`,
    },
  });
}

export function reviewFinanceBankClassifications({ decisions, ctx = "allow" } = {}) {
  return postFinanceRuntime({
    path: "/api/finance/bank-classifications/review",
    ctx,
    roleIds: ["system_super_admin"],
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      idempotency_key: `ui:finance:bank-classification:review:${Date.now()}`,
      decisions,
    },
  });
}

function normalizeAnalyticsCollectionBody(body) {
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function postAnalyticsRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  let body;
  try {
    const response = await apiFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchAnalyticsClientProfitability({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/analytics/client-profitability?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeAnalyticsCollectionBody(body);
}

export async function fetchAnalyticsMatterProfitability({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/analytics/matter-profitability?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchAnalyticsRealization({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/analytics/realization?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeAnalyticsCollectionBody(body);
}

export async function fetchAnalyticsUtilization({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, ANALYTICS_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/analytics/utilization?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeAnalyticsCollectionBody(body);
}

export function refreshAnalyticsDashboards({ ctx = "allow" } = {}) {
  return postAnalyticsRuntime({
    path: "/api/analytics/refresh",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", ANALYTICS_PRINCIPAL.user_id),
      idempotency_key: "ui-analytics-refresh"
    }
  });
}

export function refreshMatterProfitability({ matterId, wipItems = [], invoices = [], payments = [], ctx = "allow" } = {}) {
  return postAnalyticsRuntime({
    path: "/api/analytics/matter-profitability",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: `ui-profitability:${matterId}`,
      matter_id: matterId,
      time_entries: wipItems.map((item) => ({ standard_value: Number(item.amount ?? item.standard_value ?? 0) })),
      invoices: invoices.map((item) => ({ amount_due: Number(item.amount_due ?? item.invoice_total ?? 0) })),
      payments: payments.map((item) => ({ amount: Number(item.amount ?? item.payment_total ?? 0) }))
    }
  });
}

export function refreshClientProfitability({
  clientGroupId = "client_group_ui",
  clientGroupLabel = "Client 그룹",
  ctx = "allow"
} = {}) {
  return postAnalyticsRuntime({
    path: "/api/analytics/client-profitability",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: `ui-client-profitability:${clientGroupId}`,
      client_group_id: clientGroupId,
      client_group_label: clientGroupLabel
    }
  });
}

export function createAnalyticsExport({ dashboardId, ctx = "allow" } = {}) {
  const safeDashboardId = dashboardId ?? "dashboard";
  return postAnalyticsRuntime({
    path: "/api/analytics/exports",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: `ui-analytics-export:${safeDashboardId}`,
      analytics_export: {
        tenant_id: ANALYTICS_TENANT_ID,
        analytics_export_id: `analytics_export_${String(safeDashboardId).replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        dashboard_id: safeDashboardId,
        export_format: "csv",
        permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF
      }
    }
  });
}

const CLIENT_FIXED_REPORT_IDS = new Set([
  "monthly_deposit_revenue",
  "inquiry_status",
  "revenue_ranking",
  "receivables_ranking"
]);
const CLIENT_FIXED_REPORT_COLUMNS = Object.freeze({
  monthly_deposit_revenue: Object.freeze([
    Object.freeze({ key: "month", label: "월" }),
    Object.freeze({ key: "net_deposit_revenue", label: "입금 매출" })
  ]),
  inquiry_status: Object.freeze([
    Object.freeze({ key: "status", label: "상태" }),
    Object.freeze({ key: "count", label: "건수" })
  ]),
  revenue_ranking: Object.freeze([
    Object.freeze({ key: "rank", label: "순위" }),
    Object.freeze({ key: "client_name", label: "고객" }),
    Object.freeze({ key: "matched_inflow_amount", label: "연결 입금" }),
    Object.freeze({ key: "linked_refund_amount", label: "환불" }),
    Object.freeze({ key: "net_deposit_revenue", label: "입금 매출" }),
    Object.freeze({ key: "latest_deposit_date", label: "최근 입금일" })
  ]),
  receivables_ranking: Object.freeze([
    Object.freeze({ key: "rank", label: "순위" }),
    Object.freeze({ key: "client_name", label: "고객" }),
    Object.freeze({ key: "agreed_amount", label: "약정 수임료" }),
    Object.freeze({ key: "active_allocated_amount", label: "반영 입금" }),
    Object.freeze({ key: "receivable_amount", label: "미수금" }),
    Object.freeze({ key: "earliest_due_date", label: "가장 이른 지급기한" })
  ])
});
const CLIENT_FIXED_REPORT_CONTRACT_VERSION = "client-fixed-reports.v1";
const CLIENT_FIXED_REPORT_SNAPSHOT_VERSION = 1;
const CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES = 16 * 1024;
const CLIENT_FIXED_REPORT_MAX_CSV_BYTES = 16 * 1024;
const CLIENT_FIXED_REPORT_TIMEZONES = new Set(["Asia/Seoul"]);
const CLIENT_FIXED_REPORT_REVENUE_PERIODS = new Set(["month", "quarter", "year"]);
const CLIENT_FIXED_REPORT_SOURCE_STATUSES = new Set([
  "available",
  "no_data",
  "partial"
]);
const CLIENT_FIXED_REPORT_IDEMPOTENCY_KEY = /^[A-Za-z0-9._:~-]{1,200}$/u;
const CLIENT_FIXED_REPORT_SHA256 = /^[a-f0-9]{64}$/u;
const CLIENT_FIXED_REPORT_SAFE_CODE = /^[A-Z][A-Z0-9_]{1,159}$/u;
const CLIENT_FIXED_REPORT_SAFE_REF = /^[A-Za-z0-9._:-]{1,200}$/u;

function clientFixedReportText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clientFixedReportSafeRef(value) {
  const text = clientFixedReportText(value);
  return CLIENT_FIXED_REPORT_SAFE_REF.test(text) ? text : null;
}

function clientFixedReportSafeErrorCodes(body) {
  return Array.isArray(body?.safe_error_codes)
    ? body.safe_error_codes
      .filter((code) => (
        typeof code === "string"
        && CLIENT_FIXED_REPORT_SAFE_CODE.test(code)
      ))
      .slice(0, 24)
    : [];
}

function clientFixedReportByteLength(value) {
  return typeof value === "string"
    ? new TextEncoder().encode(value).byteLength
    : 0;
}

function clientFixedReportSourceStatus(value) {
  const status = clientFixedReportText(value);
  return CLIENT_FIXED_REPORT_SOURCE_STATUSES.has(status) ? status : null;
}

function clientFixedReportUnavailable({
  status = 0,
  code = "SIGNED_SESSION_REQUIRED",
  kind = "error",
  uiState = "error",
  outcome = "blocked",
  auditRecorded = false
} = {}) {
  return {
    kind,
    status,
    outcome,
    uiState,
    safeErrorCodes: [code],
    auditRecorded,
    countLeakPrevented: true,
    productionReadyClaim: false
  };
}

function clientFixedReportGuardedResult(response, body, fallbackCode) {
  const status = Number(response?.status ?? 0);
  const codes = clientFixedReportSafeErrorCodes(body);
  const outcome = clientFixedReportText(body?.outcome) || "blocked";
  const state = clientFixedReportText(body?.ui_state);
  const denied = status === 403
    || ["denied", "permission_denied"].includes(state)
    || ["denied", "permission_denied"].includes(outcome);
  const review = ["review", "review_required"].includes(state)
    || outcome === "review_required";
  const partial = state === "partial" || outcome === "partial";
  const kind = status === 409
    ? "conflict"
    : denied || review
      ? "guarded"
      : partial
        ? "partial"
        : "error";
  return {
    kind,
    status,
    outcome,
    uiState: denied
      ? "denied"
      : review
        ? "review_required"
        : partial
          ? "partial"
          : "error",
    safeErrorCodes: codes.length > 0 ? codes : [fallbackCode],
    auditRecorded: body?.audit_recorded === true,
    countLeakPrevented: body?.count_leak_prevented === true,
    productionReadyClaim: false
  };
}

async function clientFixedReportJsonRequest(path, {
  method = "GET",
  routeContext,
  payload
} = {}) {
  if (!routeContext || !path) {
    return {
      unavailable: clientFixedReportUnavailable(),
      response: null,
      body: null
    };
  }
  let response;
  let text;
  try {
    response = await apiFetch(path, {
      method,
      headers: {
        ...(payload === undefined ? {} : { "content-type": "application/json" }),
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(
          routeContext.permissionContext
        )
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
    });
    text = await response.text();
  } catch {
    return {
      unavailable: clientFixedReportUnavailable({
        code: "NETWORK_OR_PARSE_ERROR"
      }),
      response: null,
      body: null
    };
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return {
      unavailable: clientFixedReportUnavailable({
        status: response.status,
        code: "INVALID_ERROR_RESPONSE",
        kind: response.status === 409 ? "conflict" : "error"
      }),
      response,
      body: null
    };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      unavailable: clientFixedReportUnavailable({
        status: response.status,
        code: "INVALID_ERROR_RESPONSE",
        kind: response.status === 409 ? "conflict" : "error"
      }),
      response,
      body: null
    };
  }
  return { unavailable: null, response, body };
}

function clientFixedReportAuditEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = {
    event_id: clientFixedReportText(value.event_id),
    action: clientFixedReportText(value.action),
    decision: clientFixedReportText(value.decision),
    tenant_authority: value.tenant_authority,
    actor_id_included: value.actor_id_included,
    tenant_id_included: value.tenant_id_included,
    raw_rows_included: value.raw_rows_included,
    source_values_included: value.source_values_included,
    production_ready_claim: value.production_ready_claim
  };
  return (
    CLIENT_FIXED_REPORT_SAFE_REF.test(event.event_id)
    && ["allow", "replay"].includes(event.decision)
    && event.tenant_authority === "signed_session"
    && event.actor_id_included === false
    && event.tenant_id_included === false
    && event.raw_rows_included === false
    && event.source_values_included === false
    && event.production_ready_claim === false
  ) ? event : null;
}

function clientFixedReportColumnsAndRows(reportId, columns, rows) {
  const expected = CLIENT_FIXED_REPORT_COLUMNS[reportId];
  if (
    !expected
    || !Array.isArray(columns)
    || columns.length !== expected.length
    || !columns.every((column, index) => (
      column
      && typeof column === "object"
      && !Array.isArray(column)
      && column.key === expected[index].key
      && column.label === expected[index].label
    ))
    || !Array.isArray(rows)
  ) return null;
  return {
    columns: expected.map(({ key, label }) => ({ key, label })),
    rows: rows.map((row) => (
      row && typeof row === "object" && !Array.isArray(row)
        ? Object.fromEntries(expected.map(({ key }) => [key, row[key]]))
        : null
    ))
  };
}

function clientFixedReportScreenItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reportId = clientFixedReportText(value.report_id);
  const table = clientFixedReportColumnsAndRows(
    reportId,
    value.columns,
    value.rows
  );
  const snapshot = value.snapshot;
  const sourceStatus = clientFixedReportSourceStatus(value.source_status);
  if (
    !table
    || table.rows.some((row) => row === null)
    || !snapshot
    || typeof snapshot !== "object"
    || Array.isArray(snapshot)
    || !clientFixedReportText(snapshot.token)
    || clientFixedReportByteLength(snapshot.token) > CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES
    || snapshot.version !== CLIENT_FIXED_REPORT_SNAPSHOT_VERSION
    || !Number.isFinite(Date.parse(snapshot.expires_at))
    || sourceStatus === null
  ) return null;
  const item = {
    report_id: reportId,
    columns: table.columns,
    rows: table.rows,
    row_count: value.row_count,
    row_limit: value.row_limit,
    as_of: value.as_of,
    timezone: value.timezone,
    source_status: sourceStatus,
    snapshot: {
      token: snapshot.token,
      version: snapshot.version,
      expires_at: snapshot.expires_at
    },
    print_contract: {
      rows_source: value.print_contract?.rows_source,
      server_pdf_required: value.print_contract?.server_pdf_required
    },
    bounded_result: value.bounded_result,
    permission_prefilter_applied: value.permission_prefilter_applied,
    count_leak_prevented: value.count_leak_prevented,
    raw_bank_source_included: value.raw_bank_source_included,
    raw_source_payload_included: value.raw_source_payload_included,
    contact_pii_included: value.contact_pii_included,
    internal_ids_included: value.internal_ids_included,
    source_digest_included: value.source_digest_included,
    production_ready_claim: value.production_ready_claim
  };
  return (
    CLIENT_FIXED_REPORT_IDS.has(item.report_id)
    && Number.isSafeInteger(item.row_count)
    && Number.isSafeInteger(item.row_limit)
    && item.row_count >= 0
    && item.row_limit > 0
    && item.row_count <= item.row_limit
    && Number.isFinite(Date.parse(item.as_of))
    && CLIENT_FIXED_REPORT_TIMEZONES.has(item.timezone)
    && item.print_contract.rows_source === "screen_snapshot"
    && item.print_contract.server_pdf_required === false
    && item.bounded_result === true
    && item.permission_prefilter_applied === true
    && item.count_leak_prevented === true
    && item.raw_bank_source_included === false
    && item.raw_source_payload_included === false
    && item.contact_pii_included === false
    && item.internal_ids_included === false
    && item.source_digest_included === false
    && item.production_ready_claim === false
  ) ? item : null;
}

function clientFixedReportCsvItem(value, {
  reportId,
  snapshotVersion
}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const table = clientFixedReportColumnsAndRows(
    clientFixedReportText(value.report_id),
    value.columns,
    value.rows
  );
  if (!table || table.rows.some((row) => row === null)) return null;
  const item = {
    report_id: clientFixedReportText(value.report_id),
    columns: table.columns,
    rows: table.rows,
    row_count: value.row_count,
    snapshot_version: value.snapshot_version,
    as_of: value.as_of,
    source_status: clientFixedReportSourceStatus(value.source_status),
    csv_text: value.csv_text,
    csv_sha256: value.csv_sha256,
    csv_byte_size: value.csv_byte_size,
    mime_type: value.mime_type,
    permission_prefilter_applied: value.permission_prefilter_applied,
    count_leak_prevented: value.count_leak_prevented,
    formula_injection_escaped: value.formula_injection_escaped,
    raw_bank_source_included: value.raw_bank_source_included,
    raw_source_payload_included: value.raw_source_payload_included,
    contact_pii_included: value.contact_pii_included,
    internal_ids_included: value.internal_ids_included,
    production_ready_claim: value.production_ready_claim
  };
  return (
    item.report_id === reportId
    && item.snapshot_version === snapshotVersion
    && Array.isArray(item.columns)
    && Array.isArray(item.rows)
    && Number.isSafeInteger(item.row_count)
    && item.row_count === item.rows.length
    && item.source_status !== null
    && Number.isFinite(Date.parse(item.as_of))
    && typeof item.csv_text === "string"
    && item.csv_text.length > 0
    && Number.isSafeInteger(item.csv_byte_size)
    && item.csv_byte_size === clientFixedReportByteLength(item.csv_text)
    && item.csv_byte_size <= CLIENT_FIXED_REPORT_MAX_CSV_BYTES
    && CLIENT_FIXED_REPORT_SHA256.test(item.csv_sha256)
    && item.mime_type === "text/csv; charset=utf-8"
    && item.permission_prefilter_applied === true
    && item.count_leak_prevented === true
    && item.formula_injection_escaped === true
    && item.raw_bank_source_included === false
    && item.raw_source_payload_included === false
    && item.contact_pii_included === false
    && item.internal_ids_included === false
    && item.production_ready_claim === false
  ) ? item : null;
}

export function getClientFixedReportRouteContext({
  ctx = "allow",
  operation = "read",
  permissionRef = CLIENT_FIXED_REPORT_PERMISSION_REF,
  auditHintRef = CLIENT_FIXED_REPORT_AUDIT_HINT_REF,
  source = globalThis
} = {}) {
  const envelope = readLawosSessionEnvelope(source);
  if (!envelope) return null;
  const defaultTenant = clientFixedReportText(envelope.tenant_refs.default);
  const clientTenant = clientFixedReportText(envelope.tenant_refs.client);
  if (defaultTenant && clientTenant && defaultTenant !== clientTenant) return null;
  const tenantId = defaultTenant || clientTenant;
  const context = permissionContextFor(
    ctx,
    clientFixedReportPermissionContexts(operation),
    "client"
  );
  if (
    !tenantId
    || !clientFixedReportText(permissionRef)
    || !clientFixedReportText(auditHintRef)
    || clientFixedReportText(context?.principal?.tenant_id) !== tenantId
  ) return null;
  return {
    tenant_id: tenantId,
    permission_ref: clientFixedReportText(permissionRef),
    audit_hint_ref: clientFixedReportText(auditHintRef),
    permissionContext: context
  };
}

export async function fetchClientFixedReport({
  reportId,
  ctx = "allow",
  permissionRef = CLIENT_FIXED_REPORT_PERMISSION_REF,
  auditHintRef = CLIENT_FIXED_REPORT_AUDIT_HINT_REF,
  asOf = null,
  timezone = "Asia/Seoul",
  revenueRankingPeriod = "year"
} = {}) {
  const normalizedReportId = clientFixedReportText(reportId);
  const routeContext = getClientFixedReportRouteContext({
    ctx,
    operation: "read",
    permissionRef,
    auditHintRef
  });
  if (
    !CLIENT_FIXED_REPORT_IDS.has(normalizedReportId)
    || !CLIENT_FIXED_REPORT_TIMEZONES.has(timezone)
    || !CLIENT_FIXED_REPORT_REVENUE_PERIODS.has(revenueRankingPeriod)
    || (asOf !== null && !Number.isFinite(Date.parse(asOf)))
  ) {
    return clientFixedReportUnavailable({
      code: "CLIENT_FIXED_REPORT_REQUEST_INVALID"
    });
  }
  const params = routeContext && new URLSearchParams({
    tenant_id: routeContext.tenant_id,
    permission_ref: routeContext.permission_ref,
    audit_hint_ref: routeContext.audit_hint_ref,
    timezone,
    revenue_ranking_period: revenueRankingPeriod
  });
  if (params && asOf) params.set("as_of", new Date(asOf).toISOString());
  const result = await clientFixedReportJsonRequest(
    params
      ? `/api/reports/clients/fixed/${encodeURIComponent(normalizedReportId)}?${params}`
      : "",
    { routeContext }
  );
  if (result.unavailable) return result.unavailable;
  const outcome = result.body.outcome;
  const partial = outcome === "partial";
  const acceptedOutcome = ["passed", "empty", "partial"].includes(outcome);
  const stateMismatch = partial
    ? result.body.ui_state !== "partial"
    : result.body.ui_state !== (outcome === "empty" ? "no_data" : null);
  if (
    !result.response.ok
    || !acceptedOutcome
  ) {
    return clientFixedReportGuardedResult(
      result.response,
      result.body,
      "CLIENT_FIXED_REPORT_READ_FAILED"
    );
  }
  if (stateMismatch) {
    return clientFixedReportUnavailable({
      status: result.response.status,
      code: "CLIENT_FIXED_REPORT_RESPONSE_INVALID"
    });
  }
  const item = clientFixedReportScreenItem(result.body.item);
  const auditEvent = clientFixedReportAuditEvent(result.body.audit_event);
  const empty = result.body.outcome === "empty";
  const sourceStatus = item?.source_status;
  const projected = {
    kind: "data",
    status: result.response.status,
    requestId: clientFixedReportSafeRef(result.body.request_id),
    outcome: result.body.outcome,
    uiState: partial ? "partial" : empty ? "empty" : null,
    item,
    sourceStatus,
    exportSnapshot: item?.snapshot ?? null,
    safeErrorCodes: clientFixedReportSafeErrorCodes(result.body),
    auditHintRef: result.body.audit_hint_ref,
    auditEvent,
    countLeakPrevented: result.body.count_leak_prevented === true,
    permissionPrefilterApplied: item?.permission_prefilter_applied === true,
    rawBankSourceIncluded: false,
    rawSourcePayloadIncluded: false,
    credentialMaterialIncluded: false,
    productionReadyClaim: result.body.production_ready_claim === true
  };
  const model = item && buildClientFixedReportsModel(projected);
  const report = model && selectClientFixedReport(model, normalizedReportId);
  const valid = (
    result.response.status === 200
    && result.body.audit_hint_ref === routeContext.audit_hint_ref
    && result.body.raw_sql_included === false
    && result.body.raw_query_payload_included === false
    && result.body.source_payload_included === false
    && result.body.production_ready_claim === false
    && projected.safeErrorCodes.length === 0
    && auditEvent?.action === "report.client_fixed.screen.read"
    && auditEvent.decision === "allow"
    && item?.report_id === normalizedReportId
    && item.row_count === item.rows?.length
    && sourceStatus === (partial ? "partial" : empty ? "no_data" : "available")
    && report?.state === (partial ? "partial" : empty ? "empty" : "data")
  );
  return valid ? projected : clientFixedReportUnavailable({
    status: result.response.status,
    code: "CLIENT_FIXED_REPORT_RESPONSE_INVALID"
  });
}

export async function exportClientFixedReportCsv({
  reportId,
  contractVersion,
  snapshotToken,
  snapshotVersion,
  idempotencyKey,
  ctx = "allow",
  permissionRef = CLIENT_FIXED_REPORT_PERMISSION_REF,
  auditHintRef = CLIENT_FIXED_REPORT_AUDIT_HINT_REF
} = {}) {
  const normalizedReportId = clientFixedReportText(reportId);
  const normalizedToken = typeof snapshotToken === "string" ? snapshotToken : "";
  const normalizedKey = clientFixedReportText(idempotencyKey);
  const routeContext = getClientFixedReportRouteContext({
    ctx,
    operation: "export",
    permissionRef,
    auditHintRef
  });
  if (
    !CLIENT_FIXED_REPORT_IDS.has(normalizedReportId)
    || contractVersion !== CLIENT_FIXED_REPORT_CONTRACT_VERSION
    || !normalizedToken
    || clientFixedReportByteLength(normalizedToken) > CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES
    || snapshotVersion !== CLIENT_FIXED_REPORT_SNAPSHOT_VERSION
    || !CLIENT_FIXED_REPORT_IDEMPOTENCY_KEY.test(normalizedKey)
  ) {
    return clientFixedReportUnavailable({
      code: "CLIENT_FIXED_REPORT_EXPORT_REQUEST_INVALID"
    });
  }
  const result = await clientFixedReportJsonRequest(
    routeContext
      ? `/api/reports/clients/fixed/${encodeURIComponent(normalizedReportId)}.csv`
      : "",
    {
      method: "POST",
      routeContext,
      payload: routeContext ? {
        tenant_id: routeContext.tenant_id,
        permission_ref: routeContext.permission_ref,
        audit_hint_ref: routeContext.audit_hint_ref,
        snapshot_token: normalizedToken,
        snapshot_version: snapshotVersion,
        idempotency_key: normalizedKey
      } : undefined
    }
  );
  if (result.unavailable) return result.unavailable;
  const replay = result.body.idempotent_replay === true;
  const outcome = result.body.outcome;
  const partial = outcome === "partial";
  const acceptedOutcome = ["created", "idempotent_replay", "partial"].includes(outcome)
    && (!replay || ["idempotent_replay", "partial"].includes(outcome))
    && (replay || ["created", "partial"].includes(outcome));
  const knownOutcome = ["created", "idempotent_replay", "partial"].includes(outcome);
  const stateMismatch = partial
    ? result.body.ui_state !== "partial"
    : result.body.ui_state !== null;
  if (
    !result.response.ok
    || !knownOutcome
  ) {
    return clientFixedReportGuardedResult(
      result.response,
      result.body,
      "CLIENT_FIXED_REPORT_EXPORT_FAILED"
    );
  }
  if (!acceptedOutcome || stateMismatch) {
    return clientFixedReportUnavailable({
      status: result.response.status,
      code: "CLIENT_FIXED_REPORT_RESPONSE_INVALID"
    });
  }
  const item = clientFixedReportCsvItem(result.body.item, {
    reportId: normalizedReportId,
    snapshotVersion
  });
  const auditEvent = clientFixedReportAuditEvent(result.body.audit_event);
  const safeErrorCodes = clientFixedReportSafeErrorCodes(result.body);
  const valid = (
    result.response.status === (replay ? 200 : 201)
    && result.body.audit_hint_ref === routeContext.audit_hint_ref
    && result.body.idempotent_replay === replay
    && result.body.count_leak_prevented === true
    && result.body.raw_sql_included === false
    && result.body.raw_query_payload_included === false
    && result.body.source_payload_included === false
    && result.body.production_ready_claim === false
    && safeErrorCodes.length === 0
    && item
    && item.source_status === (partial ? "partial" : "available")
    && auditEvent?.action === (
      replay
        ? "report.client_fixed.csv.replay"
        : "report.client_fixed.csv.export"
    )
    && auditEvent.decision === (replay ? "replay" : "allow")
  );
  return valid ? {
    kind: "data",
    status: result.response.status,
    requestId: clientFixedReportSafeRef(result.body.request_id),
    outcome: result.body.outcome,
    uiState: partial ? "partial" : null,
    item,
    auditEvent,
    safeErrorCodes,
    auditHintRef: result.body.audit_hint_ref,
    countLeakPrevented: true,
    rawSqlIncluded: false,
    rawQueryPayloadIncluded: false,
    sourcePayloadIncluded: false,
    idempotentReplay: replay,
    sourceStatus: item.source_status,
    productionReadyClaim: false
  } : clientFixedReportUnavailable({
    status: result.response.status,
    code: "CLIENT_FIXED_REPORT_RESPONSE_INVALID"
  });
}

function reportPayload(overrides = {}) {
  return {
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: DEFAULT_REPORT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_REPORT_AUDIT_HINT_REF,
    actor_id: REPORT_PRINCIPAL.user_id,
    ...overrides
  };
}

function normalizeReportBody(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    rawSqlIncluded: body.raw_sql_included === true,
    rawQueryPayloadIncluded: body.raw_query_payload_included === true,
    sourcePayloadIncluded: body.source_payload_included === true,
    arbitrarySqlExecuted: body.arbitrary_sql_executed === true,
    sourceObjectMutated: body.source_object_mutated === true,
    countLeakPrevented: body.count_leak_prevented === true,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchReportRuntime({ path, ctx = "allow" } = {}) {
  const context = REPORT_PERMISSION_CONTEXTS[ctx] ?? REPORT_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: DEFAULT_REPORT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_REPORT_AUDIT_HINT_REF
  });
  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeReportBody(body);
}

async function writeReportRuntime({ path, payload, method = "POST", ctx = "allow" } = {}) {
  const context = REPORT_PERMISSION_CONTEXTS[ctx] ?? REPORT_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await apiFetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(reportPayload(payload))
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeReportBody(body);
}

export function fetchReportDefinitions({ ctx = "allow" } = {}) {
  return fetchReportRuntime({ path: "/api/reports", ctx });
}

export function createReportDefinition({ reportId = `report_ui_${Date.now()}`, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: "/api/reports",
    ctx,
    payload: {
      idempotency_key: `ui-report:create:${reportId}`,
      report_id: reportId,
      name: "Client 손익 보고서",
      object_scope: "Client",
      column_refs: ["client_group", "matter_count", "profitability_amount"],
      filter_manifest: [{ field: "period", operator: "current", value_label: "현재" }],
      grouping_manifest: ["client_group"],
      chart_manifest: { type: "bar", metric: "profitability_amount" }
    }
  });
}

export function patchReportDefinition({ reportId, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: `/api/reports/${encodeURIComponent(reportId)}`,
    method: "PATCH",
    ctx,
    payload: {
      idempotency_key: `ui-report:patch:${reportId}`,
      name: "Client 손익 검토 보고서",
      chart_manifest: { type: "line", metric: "profitability_amount" }
    }
  });
}

export function runReportQuery({ reportId, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: `/api/reports/${encodeURIComponent(reportId)}/run`,
    ctx,
    payload: {
      idempotency_key: `ui-report:run:${reportId}:${Date.now()}`
    }
  });
}

export function shareReportDefinition({ reportId, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: `/api/reports/${encodeURIComponent(reportId)}/share`,
    ctx,
    payload: {
      idempotency_key: `ui-report:share:${reportId}:${Date.now()}`,
      target_type: "role",
      target_ref_label: "검토 대상 역할"
    }
  });
}

export function fetchReportAudit({ reportId, ctx = "allow" } = {}) {
  const path = reportId ? `/api/reports/${encodeURIComponent(reportId)}/audit` : "/api/reports/audit";
  return fetchReportRuntime({ path, ctx });
}

export async function fetchAiReviewQueue({
  ctx = "allow",
  permissionRef = DEFAULT_AI_PERMISSION_REF,
  auditHintRef = DEFAULT_AI_AUDIT_HINT_REF
} = {}) {
  const context = AI_PERMISSION_CONTEXTS[ctx] ?? AI_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: AI_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/ai/review-queue?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchPortalCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_PORTAL_PERMISSION_REF,
  auditHintRef = DEFAULT_PORTAL_AUDIT_HINT_REF
} = {}) {
  const context = PORTAL_PERMISSION_CONTEXTS[ctx] ?? PORTAL_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: PORTAL_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchPortalDashboard(options = {}) {
  return fetchPortalCollection({ ...options, path: "/api/portal/dashboard" });
}

export function fetchPortalRfi(options = {}) {
  return fetchPortalCollection({ ...options, path: "/api/portal/rfi" });
}

export function fetchDataRoomProjections(options = {}) {
  return fetchPortalCollection({ ...options, path: "/api/data-room/projections" });
}

async function portalExternalJson(path, options = {}) {
  let body;
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers ?? {})
      }
    });
    body = await response.json();
    if (!response.ok) {
      return {
        kind: "error",
        status: response.status,
        safeErrorCodes: Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [],
        body
      };
    }
  } catch {
    return { kind: "error", status: 0, safeErrorCodes: [] };
  }
  return { kind: "data", status: 200, body };
}

export function consumePortalInvite({ token } = {}) {
  return portalExternalJson("/api/portal/invites/consume", {
    method: "POST",
    body: JSON.stringify({ token })
  });
}

export function submitPortalExternalRfiResponse({ externalSessionId, tenantId, rfiRequestId, responseId, uploadName, idempotencyKey } = {}) {
  return portalExternalJson("/api/portal/external/rfi-responses", {
    method: "POST",
    body: JSON.stringify({
      external_session_id: externalSessionId,
      idempotency_key: idempotencyKey,
      rfi_response: {
        rfi_response_id: responseId,
        tenant_id: tenantId,
        rfi_request_id: rfiRequestId,
        dms_acl_inherited: true,
        malware_scan_passed: true,
        upload_name: uploadName
      }
    })
  });
}

export function accessPortalExternalSecureLink({ tenantId, secureLinkId, externalSessionId } = {}) {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    external_session_id: externalSessionId
  });
  return portalExternalJson(`/api/portal/external/secure-links/${encodeURIComponent(secureLinkId)}/access?${params.toString()}`);
}

export async function fetchUiReadinessChecks({
  ctx = "allow",
  routeId = null,
  permissionRef = DEFAULT_UI_READINESS_PERMISSION_REF,
  auditHintRef = DEFAULT_UI_READINESS_AUDIT_HINT_REF
} = {}) {
  const context = UI_READINESS_PERMISSION_CONTEXTS[ctx] ?? UI_READINESS_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: UI_READINESS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  if (routeId) params.set("route_id", routeId);
  let body;
  try {
    const response = await apiFetch(`/api/ui/readiness?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchEnterpriseReadinessItems({
  ctx = "allow",
  permissionRef = DEFAULT_ENTERPRISE_PERMISSION_REF,
  auditHintRef = DEFAULT_ENTERPRISE_AUDIT_HINT_REF
} = {}) {
  const context = ENTERPRISE_PERMISSION_CONTEXTS[ctx] ?? ENTERPRISE_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ENTERPRISE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await apiFetch(`/api/enterprise/readiness?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim", "go_live_approved"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true,
    goLiveApproved: body.go_live_approved === true
  };
}
