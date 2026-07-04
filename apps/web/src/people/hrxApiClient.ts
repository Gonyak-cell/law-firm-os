import { readLawosApiSession } from "../data/apiClient.js";

const HRX_ORG_REF = "tenant_amic_matter_vault";
const LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos.session.envelope";
const LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os.desktop-web-session-envelope.v0.1";
const HRX_DEFAULT_SELF_SERVICE_USER_REF = "user_amic_yjlee";
const HRX_DEFAULT_SELF_SERVICE_ROLE = "lawos_staff";
const HRX_DEFAULT_SELF_SERVICE_SCOPES = [
  "hrx.employee.read",
  "hrx.document.read",
  "hrx.leave.read",
  "hrx.leave.write"
];
const HRX_PAYROLL_BOUNDARY_ACTIONS = ["hrx.payroll.preview", "hrx.payroll.export"];
const SAFE_SESSION_STATES = new Set(["signed_in"]);
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const FORBIDDEN_SESSION_TEXT = /(password|reset|bearer|cookie|secret|credential|authorization|token|sk-)/i;

type HrxClientRecord = Record<string, unknown>;
type HrxRequestOptions = Omit<RequestInit, "headers"> & {
  ctx?: string | null;
  headers?: Record<string, string>;
};
type HrxApiResult = {
  kind: string;
  body: HrxClientRecord;
  status?: number;
  reason?: unknown;
  action?: unknown;
  [key: string]: unknown;
};
type HrxQueryParams = Record<string, string | number | boolean | null | undefined>;
type HrxSessionEnvelope = {
  actor_ref: string;
  tenant_refs: Record<string, string>;
  role_ids: string[];
  scopes: string[];
};

declare global {
  interface Window {
    __LAWOS_SESSION_CONTEXT__?: unknown;
    matterSession?: {
      desktopApiBaseUrl?: string;
    };
  }
}

const HRX_STEP_UP_STORAGE_KEY = "lawos_hrx_step_up_token";

function desktopApiBaseUrl(): string {
  if (typeof window === "undefined" || window.location?.protocol !== "file:") return "";
  const params = new URLSearchParams(window.location.search);
  if (params.get("desktop") !== "1") return "";
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

function apiRequestUrl(input: string): string {
  if (typeof input !== "string" || !input.startsWith("/")) return input;
  const baseUrl = desktopApiBaseUrl();
  return baseUrl ? `${baseUrl}${input}` : input;
}

function plainHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  const headerLike = headers as { forEach?: (callback: (value: string, key: string) => void) => void };
  if (typeof headerLike.forEach === "function") {
    const result: Record<string, string> = {};
    headerLike.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));
}

function deleteHeader(headers: Record<string, string>, name: string): void {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) delete headers[key];
  }
}

function setHeader(headers: Record<string, string>, name: string, value: string): void {
  const existing = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  headers[existing ?? name] = value;
}

function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = plainHeaders(init.headers);
  for (const name of ["x-lawos-tenant-id", "x-lawos-actor-id", "x-lawos-actor-role", "x-lawos-hrx-scopes"]) {
    deleteHeader(headers, name);
  }
  const session = readLawosApiSession() as { session_token?: string } | null;
  if (session?.session_token) setHeader(headers, "authorization", `Bearer ${session.session_token}`);
  return fetch(apiRequestUrl(input), { ...init, headers });
}

function signedHrxStepUpToken(): string {
  if (typeof window === "undefined") return "";
  const token = window.sessionStorage?.getItem(HRX_STEP_UP_STORAGE_KEY) ?? "";
  return token.startsWith("lawos_hrx_step_up_v1.") ? token : "";
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeSessionRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ref = value.trim();
  if (!ref || ref.includes("@") || !SAFE_REF_PATTERN.test(ref) || FORBIDDEN_SESSION_TEXT.test(ref)) return null;
  return ref;
}

function safeSessionRefList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => safeSessionRef(value)).filter((value): value is string => Boolean(value)).slice(0, 32);
}

function hasForbiddenSessionKey(value: unknown): boolean {
  const record = objectRecord(value);
  if (!record) return Array.isArray(value) ? value.some((item) => hasForbiddenSessionKey(item)) : false;
  return Object.entries(record).some(([key, nested]) => FORBIDDEN_SESSION_TEXT.test(key) || hasForbiddenSessionKey(nested));
}

function safeTenantRefs(value: unknown, fallbackTenantRef: unknown): Record<string, string> {
  const tenantRefs: Record<string, string> = {};
  const source = objectRecord(value);
  for (const [key, tenantRef] of Object.entries(source ?? {})) {
    const safeKey = safeSessionRef(key);
    const safeRef = safeSessionRef(tenantRef);
    if (safeKey && safeRef) tenantRefs[safeKey] = safeRef;
  }
  const fallback = safeSessionRef(fallbackTenantRef);
  if (fallback && !tenantRefs.default) tenantRefs.default = fallback;
  return tenantRefs;
}

function readStoredHrxSessionEnvelope(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage?.getItem(LAWOS_SESSION_ENVELOPE_STORAGE_KEY);
    return raw ? objectRecord(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function readUrlHrxSessionEnvelope(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("desktop") !== "1") return null;
    const actorRef = safeSessionRef(params.get("desktop_actor_ref"));
    const tenantRef = safeSessionRef(params.get("desktop_tenant_ref"));
    if (!actorRef || !tenantRef) return null;
    return {
      schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
      state: "signed_in",
      actor_ref: actorRef,
      tenant_refs: {
        default: tenantRef,
        vault: HRX_ORG_REF,
        hrx: HRX_ORG_REF
      },
      role_ids: params.getAll("desktop_role_ref"),
      scopes: params.getAll("desktop_scope_ref"),
      expires_at: params.get("desktop_expires_at")
    };
  } catch {
    return null;
  }
}

function readHrxSessionEnvelope(): HrxSessionEnvelope | null {
  const raw = objectRecord(typeof window === "undefined" ? null : window.__LAWOS_SESSION_CONTEXT__) ?? readUrlHrxSessionEnvelope() ?? readStoredHrxSessionEnvelope();
  if (!raw || hasForbiddenSessionKey(raw)) return null;
  const schemaVersion = safeSessionRef(raw.schema_version);
  const state = typeof raw.state === "string" ? raw.state : null;
  const actorRef = safeSessionRef(raw.actor_ref ?? raw.user_ref ?? raw.user_id);
  const tenantRefs = safeTenantRefs(raw.tenant_refs, raw.tenant_ref ?? raw.tenant_id);
  const expiresAt = typeof raw.expires_at === "string" ? raw.expires_at : null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (schemaVersion !== LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION || !SAFE_SESSION_STATES.has(state ?? "") || !actorRef) return null;
  if (Object.keys(tenantRefs).length === 0) return null;
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) return null;
  return {
    actor_ref: actorRef,
    tenant_refs: tenantRefs,
    role_ids: safeSessionRefList(raw.role_ids),
    scopes: safeSessionRefList(raw.hrx_scopes ?? raw.scopes).filter((scope) => scope.startsWith("hrx."))
  };
}

function sessionHrxRuntimeHeaders(): Record<string, string> {
  const envelope = readHrxSessionEnvelope();
  const roleIds = envelope?.role_ids.length ? envelope.role_ids : [HRX_DEFAULT_SELF_SERVICE_ROLE];
  const scopes = envelope?.scopes.length ? envelope.scopes : HRX_DEFAULT_SELF_SERVICE_SCOPES;
  return {
    "x-lawos-tenant-id": envelope?.tenant_refs.hrx ?? envelope?.tenant_refs.vault ?? envelope?.tenant_refs.default ?? HRX_ORG_REF,
    "x-lawos-actor-id": envelope?.actor_ref ?? HRX_DEFAULT_SELF_SERVICE_USER_REF,
    "x-lawos-actor-role": roleIds.join(","),
    "x-lawos-hrx-scopes": scopes.join(",")
  };
}

function withQuery(path: string, params: HrxQueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function currentDateKey(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

async function requestJson(path: string, options: HrxRequestOptions = {}): Promise<HrxApiResult> {
  const { ctx: _ctx = null, headers = {}, ...fetchOptions } = options;
  let response: Response;
  let body: HrxClientRecord | null;
  const requestHeaders = {
    "content-type": "application/json",
    ...sessionHrxRuntimeHeaders(),
    ...headers,
    ...(signedHrxStepUpToken() ? { "x-lawos-hrx-step-up": signedHrxStepUpToken() } : {})
  };
  try {
    response = await apiFetch(path, {
      ...fetchOptions,
      credentials: "same-origin",
      headers: requestHeaders
    });
    body = await response.json();
  } catch {
    return { kind: "error", reason: "network_or_parse_error", body: {} };
  }
  if (!response.ok || body === null || typeof body !== "object") {
    if (body?.step_up_required === true) {
      return {
        kind: "step_up_required",
        body,
        status: response.status,
        reason: body.safe_error_code ?? body.reason ?? "HRX_STEP_UP_REQUIRED",
        action: body.action ?? null
      };
    }
    if (body?.ui_state === "denied" || body?.ui_state === "review_required") {
      return { kind: "guarded", status: response.status, body };
    }
    return { kind: "error", body: body ?? {}, status: response.status, reason: body?.safe_error_code ?? body?.error ?? "unexpected_response" };
  }
  return { kind: "data", body };
}

export async function fetchHrxEmployees(options: HrxRequestOptions = {}) {
  const result = await requestJson("/api/hrx/employees", options);
  if (result.kind === "guarded") {
    return {
      kind: "guarded",
      uiState: result.body?.ui_state ?? null,
      outcome: result.body?.outcome ?? null,
      safeErrorCodes: result.body?.safe_error_codes ?? []
    };
  }
  if (result.kind === "step_up_required") return result;
  if (result.kind !== "data" || !Array.isArray(result.body.employees)) return { kind: "error" };
  return { kind: "data", employees: result.body.employees };
}

export async function fetchHrxOrgChart(options: HrxRequestOptions = {}) {
  const result = await requestJson("/api/hrx/org-chart", options);
  if (result.kind === "guarded") {
    return {
      kind: "guarded",
      uiState: result.body?.ui_state ?? null,
      outcome: result.body?.outcome ?? null,
      org_units: [],
      employees: [],
      reporting_lines: [],
      change_events: [],
      claim_boundary: result.body?.claim_boundary ?? null
    };
  }
  if (result.kind === "step_up_required") return result;
  if (result.kind !== "data" || !Array.isArray(result.body.org_units) || !Array.isArray(result.body.employees)) return { kind: "error" };
  return {
    kind: "data",
    org_units: result.body.org_units,
    employees: result.body.employees,
    reporting_lines: Array.isArray(result.body.reporting_lines) ? result.body.reporting_lines : [],
    change_events: Array.isArray(result.body.change_events) ? result.body.change_events : [],
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function updateHrxReportingLine(employeeId: string | null | undefined, form: { org_unit_id?: string | null; manager_employee_id?: string | null } = {}) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/org-chart/employees/${encodeURIComponent(employeeId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      org_unit_id: form.org_unit_id ?? null,
      manager_employee_id: form.manager_employee_id ?? null
    })
  });
  if (result.kind !== "data" || result.body.outcome !== "updated") return { kind: "error" };
  return {
    kind: "data",
    employment_profile: result.body.employment_profile ?? null,
    org_chart: result.body.org_chart ?? null
  };
}

export async function fetchHrxEmployeeProfile(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/employees/${encodeURIComponent(employeeId)}`);
  if (result.kind !== "data" || !result.body.employee) return { kind: "error" };
  return {
    kind: "data",
    employee: result.body.employee,
    employment_profile: result.body.employment_profile ?? null,
    masked_compensation_ref: result.body.masked_compensation_ref ?? null
  };
}

export async function fetchHrxCompensationRecords(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(withQuery("/api/hrx/compensation", { employee_id: employeeId }));
  if (result.kind === "step_up_required") return result;
  if (result.kind !== "data" || !Array.isArray(result.body.compensation_records)) return { kind: "error" };
  return {
    kind: "data",
    compensation_records: result.body.compensation_records,
    masked_compensation_ref: result.body.masked_compensation_ref ?? null,
    payroll_runtime_opened: result.body.payroll_runtime_opened === true
  };
}

export async function fetchHrxAttendance(options: HrxQueryParams & { ctx?: string } = {}) {
  const { ctx = "allow", ...filters } = options;
  const result = await requestJson(withQuery("/api/hrx/attendance", filters), { ctx });
  if (result.kind === "guarded") {
    return {
      kind: "guarded" as const,
      uiState: result.body?.ui_state ?? null,
      outcome: result.body?.outcome ?? null,
      attendance: Array.isArray(result.body?.attendance) ? result.body.attendance : [],
      monthly_summary: result.body?.monthly_summary ?? null,
      permission_summary: result.body?.permission_summary ?? null,
      safeErrorCodes: result.body?.safe_error_codes ?? []
    };
  }
  if (result.kind !== "data" || !Array.isArray(result.body.attendance)) return { kind: "error" as const };
  return {
    kind: "data" as const,
    attendance: result.body.attendance,
    monthly_summary: result.body.monthly_summary ?? null
  };
}

export async function createHrxAttendanceRecord(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/attendance", {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || !result.body.attendance) {
    return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return { kind: "data" as const, attendance: result.body.attendance };
}

export async function correctHrxAttendanceRecord(attendanceId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/attendance/${encodeURIComponent(attendanceId)}/correct`, {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || !result.body.attendance) {
    return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return { kind: "data" as const, attendance: result.body.attendance };
}

export async function fetchHrxOvertimeRisk(options: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/overtime/risks", options));
  if (result.kind !== "data" || !result.body.risk_report) return { kind: "error" as const };
  return { kind: "data" as const, risk_report: result.body.risk_report };
}

function guardedLegalPeopleResult(result: HrxApiResult, collectionKey: string) {
  if (result.kind !== "guarded") return null;
  const body = result.body;
  return {
    kind: "data",
    uiState: body.ui_state,
    outcome: body.outcome,
    safeErrorCodes: body.safe_error_codes ?? [],
    [collectionKey]: Array.isArray(body[collectionKey]) ? body[collectionKey] : [],
    permission_summary: body.permission_summary ?? null,
    claim_boundary: body.claim_boundary ?? null
  };
}

export async function fetchLegalPeopleSearch({ ctx = "allow", ...filters }: HrxQueryParams & { ctx?: string } = {}) {
  const result = await requestJson(withQuery("/api/hrx/legal-people/search", filters), { ctx });
  const guarded = guardedLegalPeopleResult(result, "people");
  if (guarded) return { ...guarded, facets: result.body.facets ?? {} };
  if (result.kind !== "data" || !Array.isArray(result.body.people)) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    people: result.body.people,
    facets: result.body.facets ?? {},
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchLegalPersonDetail(personId: string | null | undefined, { ctx = "allow" }: { ctx?: string } = {}) {
  if (!personId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/legal-people/${encodeURIComponent(personId)}`, { ctx });
  if (result.kind === "guarded") {
    return {
      kind: "data",
      uiState: result.body.ui_state,
      outcome: result.body.outcome,
      person: null,
      affiliations: [],
      clients: [],
      matters: [],
      relationships: [],
      relationships_grouped: {},
      conflict_references: [],
      ethical_wall_references: [],
      audit_summary: null,
      permission_summary: result.body.permission_summary ?? null,
      claim_boundary: result.body.claim_boundary ?? null
    };
  }
  if (result.kind !== "data" || !result.body.person) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    person: result.body.person,
    affiliations: Array.isArray(result.body.affiliations) ? result.body.affiliations : [],
    clients: Array.isArray(result.body.clients) ? result.body.clients : [],
    matters: Array.isArray(result.body.matters) ? result.body.matters : [],
    relationships: Array.isArray(result.body.relationships) ? result.body.relationships : [],
    relationships_grouped: result.body.relationships_grouped ?? {},
    conflict_references: Array.isArray(result.body.conflict_references) ? result.body.conflict_references : [],
    ethical_wall_references: Array.isArray(result.body.ethical_wall_references) ? result.body.ethical_wall_references : [],
    audit_summary: result.body.audit_summary ?? null,
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchLegalPeopleRelationships({ ctx = "allow", ...filters }: HrxQueryParams & { ctx?: string } = {}) {
  const result = await requestJson(withQuery("/api/hrx/legal-people/relationships", filters), { ctx });
  const guarded = guardedLegalPeopleResult(result, "relationships");
  if (guarded) return { ...guarded, pivot: result.body.pivot ?? {}, relationships_grouped: result.body.relationships_grouped ?? {} };
  if (result.kind !== "data" || !Array.isArray(result.body.relationships)) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    pivot: result.body.pivot ?? {},
    relationships: result.body.relationships,
    relationships_grouped: result.body.relationships_grouped ?? {},
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchLegalPeopleEthics({ ctx = "allow", ...filters }: HrxQueryParams & { ctx?: string } = {}) {
  const result = await requestJson(withQuery("/api/hrx/legal-people/ethics", filters), { ctx });
  if (result.kind === "guarded") {
    return {
      kind: "data",
      uiState: result.body.ui_state,
      outcome: result.body.outcome,
      review_queue: [],
      ethical_walls: [],
      permission_links: [],
      reviewer_receipts: [],
      state_counts: {},
      permission_summary: result.body.permission_summary ?? null,
      claim_boundary: result.body.claim_boundary ?? null
    };
  }
  if (result.kind !== "data" || !Array.isArray(result.body.review_queue)) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    review_queue: result.body.review_queue,
    ethical_walls: Array.isArray(result.body.ethical_walls) ? result.body.ethical_walls : [],
    permission_links: Array.isArray(result.body.permission_links) ? result.body.permission_links : [],
    reviewer_receipts: Array.isArray(result.body.reviewer_receipts) ? result.body.reviewer_receipts : [],
    state_counts: result.body.state_counts ?? {},
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchHrxDocuments(employeeId: string | null | undefined, options: { scope?: string } = {}) {
  if (!employeeId && options.scope !== "all") return { kind: "empty" };
  const result = await requestJson(withQuery("/api/hrx/documents", { employee_id: employeeId }));
  if (result.kind !== "data" || !Array.isArray(result.body.documents)) return { kind: "error" };
  return { kind: "data", documents: result.body.documents };
}

export async function fetchHrxExpiringDocuments(options: { employee_id?: string | null; as_of?: string | null; days?: number | string | null } = {}) {
  const result = await requestJson(withQuery("/api/hrx/documents/expiring", {
    employee_id: options.employee_id,
    as_of: options.as_of ?? currentDateKey(),
    days: options.days ?? 30
  }));
  if (result.kind !== "data" || !Array.isArray(result.body.documents)) return { kind: "error" };
  return { kind: "data", documents: result.body.documents, within_days: result.body.within_days ?? 30 };
}

export async function createHrxEmploymentContractDocument(employeeId: string | null | undefined, form: { title?: string; expires_on?: string | null } = {}) {
  if (!employeeId) return { kind: "empty" };
  const stamp = Date.now();
  const documentId = `doc-contract-${employeeId}-${stamp}`;
  const sourceRef = `vault-doc:employment-contract:${employeeId}:${stamp}`;
  const result = await requestJson("/api/hrx/documents", {
    method: "POST",
    body: JSON.stringify({
      document_id: documentId,
      employee_id: employeeId,
      title: form.title || "근로계약서",
      source_ref: sourceRef,
      contract_id: `contract-${employeeId}-${stamp}`,
      expires_on: form.expires_on || null
    })
  });
  if (result.kind !== "data" || !result.body.document) return { kind: "error", reason: result.reason };
  return { kind: "data", document: result.body.document };
}

export async function signHrxEmploymentContractDocument(documentId: string | null | undefined, signatureRef: string) {
  if (!documentId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/documents/${encodeURIComponent(documentId)}/sign`, {
    method: "POST",
    body: JSON.stringify({ signature_ref: signatureRef })
  });
  if (result.kind !== "data" || !result.body.document) return { kind: "error", reason: result.reason };
  return { kind: "data", document: result.body.document };
}

export async function expireHrxEmploymentContractDocument(documentId: string | null | undefined) {
  if (!documentId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/documents/${encodeURIComponent(documentId)}/expire`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (result.kind !== "data" || !result.body.document) return { kind: "error", reason: result.reason };
  return { kind: "data", document: result.body.document };
}

export async function fetchHrxLeaveState(employeeId: string | null | undefined, policyId: string | undefined = undefined) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(withQuery("/api/hrx/leave", { employee_id: employeeId, policy_id: policyId }));
  if (result.kind !== "data") return { kind: "error" };
  return {
    kind: "data",
    balance: result.body.balance ?? null,
    requests: Array.isArray(result.body.requests) ? result.body.requests : []
  };
}

export async function submitHrxLeaveRequest(employeeId: string | null | undefined, form: HrxClientRecord) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson("/api/hrx/leave", {
    method: "POST",
    body: JSON.stringify({
      request_id: `leave-${employeeId}-${Date.now()}`,
      employee_id: employeeId,
      policy_id: String(form.policy_id ?? "").trim(),
      leave_type: String(form.leave_type ?? "").trim(),
      amount: Number(form.amount),
      start_date: form.start_date,
      end_date: form.end_date
    })
  });
  if (result.kind !== "data" || !result.body.leave_request) return { kind: "error" };
  return { kind: "data", leave_request: result.body.leave_request };
}

export async function resolveHrxLeaveRequest(requestId: string | null | undefined, action: "approve" | "reject") {
  if (!requestId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/leave/${encodeURIComponent(requestId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ decision_reason: action === "approve" ? "approved_from_leave_page" : "rejected_from_leave_page" })
  });
  if (result.kind !== "data" || !result.body.leave_request) return { kind: "error" };
  return { kind: "data", leave_request: result.body.leave_request };
}

export async function fetchHrxApprovals() {
  const result = await requestJson("/api/hrx/approvals");
  if (result.kind !== "data" || !Array.isArray(result.body.approvals)) return { kind: "error" };
  return { kind: "data", approvals: result.body.approvals };
}

export async function resolveHrxApproval(approvalId: string, action: string) {
  const result = await requestJson(`/api/hrx/approvals/${encodeURIComponent(approvalId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ decision_reason: `${action}_from_people_ui` })
  });
  if (result.kind !== "data" || !result.body.approval) return { kind: "error" };
  return { kind: "data", approval: result.body.approval };
}

export async function fetchCandidatePortal(candidateId: string | null | undefined) {
  if (!candidateId) return { kind: "error" };
  const result = await requestJson(withQuery("/api/hrx/candidate/portal", { candidate_id: candidateId }));
  if (result.kind !== "data" || !result.body.candidate || !Array.isArray(result.body.applications)) return { kind: "error" };
  return {
    kind: "data",
    candidate: result.body.candidate,
    applications: result.body.applications,
    documents: Array.isArray(result.body.documents) ? result.body.documents : []
  };
}

export async function fetchRecruitingPipeline() {
  const result = await requestJson("/api/hrx/recruiting/pipeline");
  if (result.kind !== "data" || !Array.isArray(result.body.applications)) return { kind: "error" };
  return {
    kind: "data",
    job_openings: result.body.job_openings ?? [],
    candidates: result.body.candidates ?? [],
    applications: result.body.applications,
    interviews: result.body.interviews ?? [],
    offers: result.body.offers ?? []
  };
}

export async function updateHrxApplicationStage(applicationId: string, stage: string) {
  const result = await requestJson(`/api/hrx/recruiting/applications/${encodeURIComponent(applicationId)}/stage`, {
    method: "POST",
    body: JSON.stringify({ stage, stage_reason: "people_ui_pipeline_update" })
  });
  if (result.kind !== "data" || !result.body.application) return { kind: "error" };
  return { kind: "data", application: result.body.application };
}

function formString(form: HrxClientRecord, field: string, fallback = ""): string {
  const value = form[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recruitingSuffix(): string {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function scheduledIso(date: string, time: string): string {
  return `${date || currentDateKey()}T${time || "10:00"}:00.000Z`;
}

export async function createHrxRecruitingJobOpening(form: HrxClientRecord, ids: Record<string, string>) {
  return requestJson("/api/hrx/recruiting/job-openings", {
    method: "POST",
    body: JSON.stringify({
      job_opening_id: ids.job_opening_id,
      title: formString(form, "job_title", "신규 포지션"),
      department_ref: formString(form, "department_ref", "PracticeGroup:litigation"),
      hiring_manager_employee_id: formString(form, "hiring_manager_employee_id", "emp-001"),
      position_count: Number(form.position_count ?? 1),
      state: "open",
      approval_ref: ids.approval_ref,
      opened_at: new Date().toISOString()
    })
  });
}

export async function createHrxRecruitingCandidate(form: HrxClientRecord, ids: Record<string, string>) {
  return requestJson("/api/hrx/recruiting/candidates", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: ids.candidate_id,
      legal_name: formString(form, "candidate_name", "신규 지원자"),
      email: formString(form, "candidate_email", ""),
      source_ref: formString(form, "source_ref", `ATS:lawos-ui:${ids.suffix}`),
      resume_ref: formString(form, "resume_ref", `vault-resume:${ids.suffix}`),
      retention_policy_id: formString(form, "retention_policy_id", "candidate-retention-2y"),
      consent: {
        consent_id: ids.consent_id,
        candidate_id: ids.candidate_id,
        purpose: "recruiting_processing",
        granted_at: new Date().toISOString(),
        evidence_ref: formString(form, "consent_evidence_ref", `ConsentEvidence:lawos-ui:${ids.suffix}`)
      }
    })
  });
}

export async function createHrxRecruitingApplication(form: HrxClientRecord, ids: Record<string, string>) {
  return requestJson("/api/hrx/recruiting/applications", {
    method: "POST",
    body: JSON.stringify({
      application_id: ids.application_id,
      candidate_id: ids.candidate_id,
      job_opening_id: ids.job_opening_id,
      submitted_at: new Date().toISOString()
    })
  });
}

export async function createHrxRecruitingInterview(form: HrxClientRecord, ids: Record<string, string>) {
  return requestJson("/api/hrx/recruiting/interviews", {
    method: "POST",
    body: JSON.stringify({
      interview_id: ids.interview_id,
      application_id: ids.application_id,
      candidate_id: ids.candidate_id,
      scheduled_for: scheduledIso(formString(form, "interview_date", currentDateKey()), formString(form, "interview_time", "10:00")),
      schedule_source_ref: formString(form, "schedule_source_ref", `CalendarEvent:${ids.interview_id}`),
      interviewer_employee_ids: [formString(form, "interviewer_employee_id", formString(form, "hiring_manager_employee_id", "emp-001"))]
    })
  });
}

export async function createHrxRecruitingOffer(form: HrxClientRecord, ids: Record<string, string>) {
  return requestJson("/api/hrx/recruiting/offers", {
    method: "POST",
    body: JSON.stringify({
      offer_id: ids.offer_id,
      application_id: ids.application_id,
      candidate_id: ids.candidate_id,
      compensation_ref: formString(form, "compensation_ref", `CompPackage:${ids.offer_id}`),
      document_ref: formString(form, "offer_document_ref", `vault-offer-letter:${ids.suffix}`),
      state: "sent",
      approval_ref: ids.approval_ref
    })
  });
}

export async function createHrxRecruitingPipeline(form: HrxClientRecord) {
  const suffix = recruitingSuffix();
  const ids = {
    suffix,
    approval_ref: `Approval:recruiting:${suffix}`,
    job_opening_id: `job_ui_${suffix}`,
    candidate_id: `cand_ui_${suffix}`,
    consent_id: `consent_ui_${suffix}`,
    application_id: `app_ui_${suffix}`,
    interview_id: `int_ui_${suffix}`,
    offer_id: `offer_ui_${suffix}`
  };
  const steps = [
    ["job_opening", () => createHrxRecruitingJobOpening(form, ids)],
    ["candidate", () => createHrxRecruitingCandidate(form, ids)],
    ["application", () => createHrxRecruitingApplication(form, ids)],
    ["interview", () => createHrxRecruitingInterview(form, ids)],
    ["offer", () => createHrxRecruitingOffer(form, ids)]
  ] as const;
  const created: HrxClientRecord = {};
  for (const [step, run] of steps) {
    const result = await run();
    if (result.kind !== "data") return { kind: "error", step };
    created[step] = result.body;
  }
  return { kind: "data", ids, created };
}

export async function updateHrxOfferStage(offerId: string, state: string, approvalRef?: string) {
  const result = await requestJson(`/api/hrx/recruiting/offers/${encodeURIComponent(offerId)}/stage`, {
    method: "POST",
    body: JSON.stringify({ state, approval_ref: approvalRef })
  });
  if (result.kind !== "data" || !result.body.offer) return { kind: "error" };
  return { kind: "data", offer: result.body.offer };
}

export async function convertHrxApplicationToEmployee(applicationId: string, form: HrxClientRecord, refs: HrxClientRecord = {}) {
  const suffix = String(refs.suffix ?? recruitingSuffix());
  const result = await requestJson(`/api/hrx/recruiting/applications/${encodeURIComponent(applicationId)}/convert-to-employee`, {
    method: "POST",
    body: JSON.stringify({
      approval_ref: formString(form, "conversion_approval_ref", `Approval:employee-conversion:${suffix}`),
      employee_id: formString(form, "employee_id", `emp_ui_${suffix}`),
      profile_id: formString(form, "profile_id", `profile_ui_${suffix}`),
      title: formString(form, "employee_title", formString(form, "job_title", "구성원")),
      org_unit_id: formString(form, "org_unit_id", "org_legal"),
      manager_employee_id: formString(form, "manager_employee_id", formString(form, "hiring_manager_employee_id", "emp-001")),
      effective_from: formString(form, "effective_from", currentDateKey())
    })
  });
  if (result.kind !== "data" || !result.body.conversion) return { kind: "error" };
  return { kind: "data", conversion: result.body.conversion };
}

export async function fetchHrxLifecycleBoard() {
  const [onboarding, offboarding] = await Promise.all([
    requestJson("/api/hrx/lifecycle/onboarding"),
    requestJson("/api/hrx/lifecycle/offboarding")
  ]);
  if (
    onboarding.kind !== "data" ||
    offboarding.kind !== "data" ||
    !Array.isArray(onboarding.body.onboarding) ||
    !Array.isArray(offboarding.body.offboarding)
  ) {
    return { kind: "error" as const };
  }
  return {
    kind: "data" as const,
    onboarding: onboarding.body.onboarding,
    offboarding: offboarding.body.offboarding
  };
}

export async function updateHrxOnboardingTask(onboardingId: string, taskId: string, status: string) {
  const result = await requestJson(
    `/api/hrx/lifecycle/onboarding/${encodeURIComponent(onboardingId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "POST",
      body: JSON.stringify({ status })
    }
  );
  if (result.kind !== "data" || !result.body.onboarding) return { kind: "error" };
  return { kind: "data", onboarding: result.body.onboarding };
}

export async function closeHrxOffboardingCase(offboardingId: string) {
  const result = await requestJson(`/api/hrx/lifecycle/offboarding/${encodeURIComponent(offboardingId)}/close`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (result.kind !== "data" || !result.body.offboarding) {
    return { kind: "error", reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return { kind: "data", offboarding: result.body.offboarding };
}

export async function fetchHrxRiskEvents() {
  const result = await requestJson("/api/hrx/risks");
  if (result.kind === "guarded") {
    return {
      kind: "guarded" as const,
      uiState: result.body?.ui_state ?? null,
      outcome: result.body?.outcome ?? null,
      risk_events: [],
      dashboard: result.body?.dashboard ?? null,
      safeErrorCodes: result.body?.safe_error_codes ?? []
    };
  }
  if (result.kind !== "data" || !Array.isArray(result.body.risk_events)) return { kind: "error" as const };
  return {
    kind: "data" as const,
    risk_events: result.body.risk_events,
    dashboard: result.body.dashboard ?? null
  };
}

export async function scanHrxRiskEvents(asOf = currentDateKey()) {
  const result = await requestJson("/api/hrx/risks/scan", {
    method: "POST",
    body: JSON.stringify({ as_of: asOf })
  });
  if (result.kind !== "data" || !Array.isArray(result.body.risk_events)) {
    return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return {
    kind: "data" as const,
    scan_ref: result.body.scan_ref ?? null,
    as_of: result.body.as_of ?? asOf,
    risk_events: result.body.risk_events,
    dashboard: result.body.dashboard ?? null
  };
}

export async function transitionHrxRiskEvent(riskEventId: string, status: string, resolutionRef?: string) {
  const result = await requestJson(`/api/hrx/risks/${encodeURIComponent(riskEventId)}/transition`, {
    method: "POST",
    body: JSON.stringify({
      status,
      resolution_ref: resolutionRef
    })
  });
  if (result.kind !== "data" || !result.body.risk_event) {
    return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return {
    kind: "data" as const,
    risk_event: result.body.risk_event,
    dashboard: result.body.dashboard ?? null
  };
}

export async function fetchHrxPolicies() {
  const result = await requestJson("/api/hrx/policies");
  if (result.kind !== "data" || !Array.isArray(result.body.policies)) return { kind: "error" };
  return { kind: "data", policies: result.body.policies };
}

export async function createHrxPolicyVersion(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/policies", {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || !result.body.policy) return { kind: "error" };
  return { kind: "data", policy: result.body.policy };
}

export async function fetchHrxAuditEvents() {
  const result = await requestJson("/api/hrx/audit");
  if (result.kind === "step_up_required") return result;
  if (result.kind !== "data" || !Array.isArray(result.body.events)) return { kind: "error" };
  return { kind: "data", events: result.body.events };
}

export async function fetchHrxAnalytics() {
  const result = await requestJson("/api/hrx/analytics");
  if (result.kind !== "data" || !result.body.analytics) return { kind: "error" };
  return {
    kind: "data",
    analytics: result.body.analytics,
    workload_projection: Array.isArray(result.body.workload_projection) ? result.body.workload_projection : [],
    workload_conflicts: Array.isArray(result.body.workload_conflicts) ? result.body.workload_conflicts : []
  };
}

export async function askHrxAiAssistant(question: string, options: { decision_mode?: string; decision_domain?: string | null; final_decision?: boolean } = {}) {
  const result = await requestJson("/api/hrx/ai/assistant", {
    method: "POST",
    body: JSON.stringify({
      question,
      decision_mode: options.decision_mode ?? "advisory",
      decision_domain: options.decision_domain ?? null,
      final_decision: options.final_decision === true
    })
  });
  if (result.kind !== "data") return { kind: "error" };
  return {
    kind: "data",
    outcome: result.body.outcome,
    answer: result.body.answer ?? null,
    review_item: result.body.review_item ?? null,
    citations: Array.isArray(result.body.citations) ? result.body.citations : [],
    retrieval: objectRecord(result.body.retrieval)
  };
}

export async function fetchHrxAiReviews() {
  const result = await requestJson("/api/hrx/ai/reviews");
  if (result.kind !== "data" || !Array.isArray(result.body.reviews)) return { kind: "error" };
  return { kind: "data", reviews: result.body.reviews };
}

export async function createHrxPayrollPreview(form: HrxClientRecord) {
  const employeeIds = String(form.employee_ids ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const result = await requestJson("/api/hrx/payroll/preview", {
    method: "POST",
    body: JSON.stringify({
      preview_id: `payroll-preview-${Date.now()}`,
      payroll_period: form.payroll_period,
      employee_ids: employeeIds,
      external_provider: form.external_provider || "외부 미리보기 전용"
    })
  });
  if (result.kind !== "data" || !result.body.preview) return { kind: "error" };
  return { kind: "data", preview: result.body.preview };
}

export async function approveHrxPayrollPreview(previewId: string) {
  const result = await requestJson("/api/hrx/payroll/approve", {
    method: "POST",
    body: JSON.stringify({
      preview_id: previewId,
      approval_ref: `Approval:${previewId}`
    })
  });
  if (result.kind !== "data" || !result.body.preview) return { kind: "error" };
  return { kind: "data", preview: result.body.preview };
}

export async function exportHrxPayrollArtifact(previewId: string, exportArtifactRef: string | null | undefined) {
  const result = await requestJson("/api/hrx/payroll/export", {
    method: "POST",
    body: JSON.stringify({
      preview_id: previewId,
      export_artifact_ref: exportArtifactRef || `문서:${previewId}:내보내기-파일`,
      provider_payload_ref: `ProviderDraft:${previewId}`
    })
  });
  if (result.kind !== "data" || !result.body.artifact) return { kind: "error" };
  return { kind: "data", artifact: result.body.artifact };
}

export async function fetchHrxPeopleOverview(options = {}) {
  const employees = await fetchHrxEmployees(options);
  if (employees.kind !== "data") return employees;
  const employeeRows: HrxClientRecord[] = Array.isArray(employees.employees) ? employees.employees : [];
  return {
    kind: "data",
    metrics: {
      employee_count: employeeRows.length,
      active_count: employeeRows.filter((employee: HrxClientRecord) => employee.status === "active").length,
      on_leave_count: employeeRows.filter((employee: HrxClientRecord) => employee.status === "on_leave").length
    }
  };
}
