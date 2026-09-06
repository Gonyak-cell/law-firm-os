import { hydrateAuthenticatedProfilePhoto, isDesktopRendererLocation, readLawosApiSession } from "../data/apiClient.js";

const HRX_ORG_REF = "tenant_hrx_synthetic";
const LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos.session.envelope";
const LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os.desktop-web-session-envelope.v0.1";
const HRX_PAYROLL_BOUNDARY_ACTIONS = ["hrx.payroll.preview", "hrx.payroll.export"];
const PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION = "lawos.people-source-envelope.v1";
const SAFE_SESSION_STATES = new Set(["signed_in"]);
const PEOPLE_SOURCE_STATES = new Set(["ok", "partial", "blocked", "stale"]);
const PEOPLE_SOURCE_ITEM_STATES = new Set(["ok", "blocked", "stale"]);
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const PEOPLE_OUTLOOK_STATE_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const FORBIDDEN_SESSION_TEXT = /(password|reset|bearer|cookie|secret|credential|authorization|token|sk-)/i;
const PEOPLE_OUTLOOK_AUTHORIZE_HOST = "login.microsoftonline.com";
export const PEOPLE_REQUEST_TIMEOUT_MS = 20_000;

type HrxClientRecord = Record<string, unknown>;
export const HRX_STEP_UP_PURPOSES = Object.freeze([
  "compensation_access",
  "evaluation_review",
  "payroll_export_review",
  "payroll_payment_processing",
  "payroll_filing_processing",
  "payroll_statement_self_service",
  "payroll_year_end_processing",
  "payroll_year_end_review",
  "security_audit",
  "people_ai_final_decision",
  "leave_policy_administration",
  "leave_accrual_execute",
  "leave_ledger_adjustment",
  "leave_termination_settlement",
] as const);
export type HrxStepUpPurpose = typeof HRX_STEP_UP_PURPOSES[number];

const HRX_STEP_UP_PURPOSE_SET = new Set<string>(HRX_STEP_UP_PURPOSES);
const PAYROLL_EXPORT_REVIEW = "payroll_export_review" satisfies HrxStepUpPurpose;
const PAYROLL_PAYMENT_PROCESSING = "payroll_payment_processing" satisfies HrxStepUpPurpose;
const PAYROLL_FILING_PROCESSING = "payroll_filing_processing" satisfies HrxStepUpPurpose;
const PAYROLL_STATEMENT_SELF_SERVICE = "payroll_statement_self_service" satisfies HrxStepUpPurpose;
const PAYROLL_YEAR_END_PROCESSING = "payroll_year_end_processing" satisfies HrxStepUpPurpose;
const PAYROLL_YEAR_END_REVIEW = "payroll_year_end_review" satisfies HrxStepUpPurpose;

type HrxRequestOptions = Omit<RequestInit, "headers"> & {
  ctx?: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number | null;
  /** Purpose-bound step-up token to attach at this trust boundary. */
  stepUpPurpose?: HrxStepUpPurpose | null;
};
type HrxApiResult = {
  kind: string;
  body: HrxClientRecord;
  status?: number;
  reason?: unknown;
  action?: unknown;
  requiredPurpose?: HrxStepUpPurpose | null;
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
      onOutlookConnectionResult?: (handler: (result: {
        type?: unknown;
        status?: unknown;
        http_status?: unknown;
        safe_error_code?: unknown;
        employee_id?: unknown;
        connection_state?: unknown;
      }) => void | Promise<void>) => (() => void) | void;
      openOutlookAuthorization?: (authorizeUrl: string) => Promise<{
        opened?: boolean;
        reason?: unknown;
      }>;
      copyOutlookAuthorization?: (authorizeUrl: string) => Promise<{
        copied?: boolean;
        reason?: unknown;
      }>;
      api?: (input: {
        path?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: BodyInit | null;
      }) => Promise<{
        http_status?: number;
        status?: number;
        body?: unknown;
        [key: string]: unknown;
      }>;
    };
  }
}

const HRX_STEP_UP_STORAGE_KEY = "lawos_hrx_step_up_token";

function hrxStepUpStorageKey(purpose: string | null | undefined): string {
  const normalizedPurpose = typeof purpose === "string" ? purpose.trim() : "";
  return normalizedPurpose ? `${HRX_STEP_UP_STORAGE_KEY}:${normalizedPurpose}` : HRX_STEP_UP_STORAGE_KEY;
}

function desktopApiBaseUrl(): string {
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

function apiRequestUrl(input: string): string {
  if (typeof input !== "string" || !input.startsWith("/")) return input;
  const baseUrl = desktopApiBaseUrl();
  return baseUrl ? `${baseUrl}${input}` : input;
}

function desktopReadBridge() {
  if (typeof window === "undefined" || !isDesktopRendererLocation(window.location)) return null;
  return typeof window.matterSession?.api === "function" ? window.matterSession.api : null;
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

type RequestSignal = {
  signal?: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
};

function requestSignal(signal: AbortSignal | null | undefined, timeoutMs: number | null | undefined): RequestSignal {
  if (!Number.isFinite(timeoutMs) || Number(timeoutMs) <= 0 || typeof AbortController === "undefined") {
    return { signal: signal ?? undefined, cleanup: () => {}, didTimeout: () => false };
  }
  if (!signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    const timeoutSignal = AbortSignal.timeout(Number(timeoutMs));
    return {
      signal: timeoutSignal,
      cleanup: () => {},
      didTimeout: () => timeoutSignal.aborted,
    };
  }
  const controller = new AbortController();
  let timedOut = false;
  const timer = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Number(timeoutMs));
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) forwardAbort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", forwardAbort);
    },
    didTimeout: () => timedOut,
  };
}

function abortReason(signal: AbortSignal): unknown {
  if (signal.reason) return signal.reason;
  const error = new Error("The request was aborted");
  error.name = "AbortError";
  return error;
}

function abortablePromise<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortReason(signal));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function safeDesktopTransportReason(value: unknown): string | null {
  return value === "runtime_request_timeout" || value === "runtime_request_failed"
    ? value
    : null;
}

function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = plainHeaders(init.headers);
  for (const name of ["x-lawos-tenant-id", "x-lawos-actor-id", "x-lawos-actor-role", "x-lawos-hrx-scopes"]) {
    deleteHeader(headers, name);
  }
  const session = readLawosApiSession() as { session_token?: string } | null;
  if (session?.session_token) setHeader(headers, "authorization", `Bearer ${session.session_token}`);
  const bridge = desktopReadBridge();
  if (bridge && typeof input === "string" && input.startsWith("/")) {
    const bridgeRequest = Promise.resolve().then(() => bridge({
      path: input,
      method: init.method ?? "GET",
      headers,
      body: init.body ?? null
    }));
    return abortablePromise(bridgeRequest, init.signal).then((response) => {
      const status = Number(response?.http_status ?? response?.status ?? 0) || 500;
      const body = response?.body ?? response ?? {};
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    });
  }
  return fetch(apiRequestUrl(input), { ...init, headers });
}

function signedHrxStepUpToken(purpose?: string | null): string {
  if (typeof window === "undefined") return "";
  const token = window.sessionStorage?.getItem(hrxStepUpStorageKey(purpose)) ?? "";
  return token.startsWith("lawos_hrx_step_up_v1.") ? token : "";
}

export function safeHrxStepUpPurpose(value: unknown): HrxStepUpPurpose | null {
  return typeof value === "string" && HRX_STEP_UP_PURPOSE_SET.has(value)
    ? value as HrxStepUpPurpose
    : null;
}

export async function requestHrxStepUpSession(purpose: HrxStepUpPurpose, totpCode: string) {
  const safePurpose = safeHrxStepUpPurpose(purpose);
  if (!safePurpose) {
    return { kind: "error" as const, reason: "HRX_STEP_UP_PURPOSE_UNSUPPORTED" };
  }
  const result = await requestJson("/api/auth/step-up", {
    method: "POST",
    body: JSON.stringify({ purpose: safePurpose, totp_code: totpCode })
  });
  const token = result.kind === "data" ? result.body.step_up_token : null;
  if (typeof token !== "string" || !token.startsWith("lawos_hrx_step_up_v1.")) {
    return { kind: "error" as const, reason: result.reason ?? "HRX_STEP_UP_FAILED" };
  }
  // Keep a purpose-bound token for routes that have a distinct step-up
  // purpose. The legacy key remains for older callers that do not declare a
  // purpose, but is never used as a fallback for an explicit purpose.
  window.sessionStorage?.setItem(hrxStepUpStorageKey(safePurpose), token);
  window.sessionStorage?.setItem(HRX_STEP_UP_STORAGE_KEY, token);
  return { kind: "data" as const, expires_at: result.body.expires_at ?? null };
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
  if (!envelope) return { "x-lawos-tenant-id": HRX_ORG_REF };
  return {
    "x-lawos-tenant-id": envelope.tenant_refs.hrx ?? envelope.tenant_refs.vault ?? envelope.tenant_refs.default ?? HRX_ORG_REF,
    "x-lawos-actor-id": envelope.actor_ref,
    "x-lawos-actor-role": envelope.role_ids.join(","),
    "x-lawos-hrx-scopes": envelope.scopes.join(",")
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
  const { ctx: _ctx = null, headers = {}, stepUpPurpose = null, timeoutMs = null, ...fetchOptions } = options;
  const request = requestSignal(fetchOptions.signal, timeoutMs);
  let response: Response;
  let body: HrxClientRecord | null;
  const requestHeaders = {
    "content-type": "application/json",
    ...sessionHrxRuntimeHeaders(),
    ...headers,
    ...(signedHrxStepUpToken(stepUpPurpose) ? { "x-lawos-hrx-step-up": signedHrxStepUpToken(stepUpPurpose) } : {})
  };
  try {
    response = await apiFetch(path, {
      ...fetchOptions,
      signal: request.signal,
      credentials: "same-origin",
      headers: requestHeaders
    });
    body = await response.json();
  } catch (error) {
    return {
      kind: "error",
      status: null,
      reason: request.didTimeout() || error?.name === "TimeoutError"
        ? "request_timeout"
        : error?.name === "AbortError"
          ? "request_aborted"
          : "network_or_parse_error",
      body: {}
    };
  } finally {
    request.cleanup();
  }
  if (!response.ok || body === null || typeof body !== "object") {
    if (body?.step_up_required === true) {
      const declaredPurpose = body.required_purpose;
      const requiredPurpose = safeHrxStepUpPurpose(declaredPurpose);
      if (declaredPurpose !== undefined && declaredPurpose !== null && !requiredPurpose) {
        return {
          kind: "error",
          body,
          status: response.status,
          reason: "HRX_STEP_UP_PURPOSE_UNSUPPORTED"
        };
      }
      if (stepUpPurpose && requiredPurpose !== stepUpPurpose) {
        return {
          kind: "error",
          body,
          status: response.status,
          reason: "HRX_STEP_UP_PURPOSE_MISMATCH"
        };
      }
      return {
        kind: "step_up_required",
        body,
        status: response.status,
        reason: body.safe_error_code ?? body.reason ?? "HRX_STEP_UP_REQUIRED",
        action: body.action ?? null,
        requiredPurpose
      };
    }
    if (body?.ui_state === "denied" || body?.ui_state === "review_required") {
      return { kind: "guarded", status: response.status, body };
    }
    return {
      kind: "error",
      body: body ?? {},
      status: response.status,
      reason: body?.safe_error_code
        ?? body?.error
        ?? safeDesktopTransportReason(body?.reason)
        ?? "unexpected_response"
    };
  }
  return { kind: "data", body };
}

export async function fetchHrxEmployees(options: HrxRequestOptions = {}) {
  const result = await requestJson("/api/hrx/employees", options);
  if (result.kind === "guarded") {
    return {
      kind: "guarded" as const,
      uiState: result.body?.ui_state ?? null,
      outcome: result.body?.outcome ?? null,
      safeErrorCodes: result.body?.safe_error_codes ?? []
    };
  }
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind !== "data" || !Array.isArray(result.body.employees)) {
    return { kind: "error" as const, reason: result.reason ?? "unexpected_response" };
  }
  const employees: HrxClientRecord[] = [];
  const headers = sessionHrxRuntimeHeaders();
  for (let offset = 0; offset < result.body.employees.length; offset += 4) {
    employees.push(...await Promise.all(result.body.employees.slice(offset, offset + 4).map(employee =>
      hydrateAuthenticatedProfilePhoto(employee, headers))));
  }
  return { kind: "data" as const, employees };
}

export async function createHrxEmployee(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/employees", {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || result.body.outcome !== "created" || !result.body.employee) {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYEE_CREATE_FAILED",
      status: result.status ?? null
    };
  }
  const employeeId = String((result.body.employee as HrxClientRecord).employee_id ?? "");
  const readback = await fetchHrxEmployeeProfile(employeeId);
  if (readback.kind !== "data") {
    return { kind: "error" as const, reason: "HRX_EMPLOYEE_READBACK_FAILED", status: null };
  }
  return { kind: "data" as const, employee: readback.employee };
}

export async function updateHrxEmployee(employeeId: string | null | undefined, form: HrxClientRecord) {
  if (!employeeId) return { kind: "empty" as const };
  const result = await requestJson(`/api/hrx/employees/${encodeURIComponent(employeeId)}`, {
    method: "PATCH",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || result.body.outcome !== "updated" || !result.body.employee) {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYEE_UPDATE_FAILED",
      status: result.status ?? null
    };
  }
  const readback = await fetchHrxEmployeeProfile(employeeId);
  if (readback.kind !== "data") {
    return { kind: "error" as const, reason: "HRX_EMPLOYEE_READBACK_FAILED", status: null };
  }
  return { kind: "data" as const, employee: readback.employee };
}

export async function fetchHrxOrgChart(options: HrxRequestOptions & { asOf?: string | null } = {}) {
  const { asOf, ...requestOptions } = options;
  const result = await requestJson(withQuery("/api/hrx/org-chart", { as_of: asOf }), requestOptions);
  if (result.kind === "guarded") {
    return {
      kind: "guarded" as const,
      uiState: result.body?.ui_state ?? null,
      outcome: result.body?.outcome ?? null,
      org_units: [],
      employees: [],
      reporting_lines: [],
      change_events: [],
      scheduled_changes: [],
      claim_boundary: result.body?.claim_boundary ?? null
    };
  }
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind !== "data" || !Array.isArray(result.body.org_units) || !Array.isArray(result.body.employees)) {
    return { kind: "error" as const, reason: result.reason ?? "unexpected_response" };
  }
  return {
    kind: "data" as const,
    org_units: result.body.org_units,
    employees: result.body.employees,
    reporting_lines: Array.isArray(result.body.reporting_lines) ? result.body.reporting_lines : [],
    change_events: Array.isArray(result.body.change_events) ? result.body.change_events : [],
    scheduled_changes: Array.isArray(result.body.scheduled_changes) ? result.body.scheduled_changes : [],
    as_of: result.body.as_of ?? asOf ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function updateHrxReportingLine(employeeId: string | null | undefined, form: { org_unit_id?: string | null; manager_employee_id?: string | null; effective_from?: string | null } = {}) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/org-chart/employees/${encodeURIComponent(employeeId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      org_unit_id: form.org_unit_id ?? null,
      manager_employee_id: form.manager_employee_id ?? null,
      effective_from: form.effective_from ?? currentDateKey()
    })
  });
  if (result.kind !== "data" || result.body.outcome !== "updated") {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_ORG_UPDATE_FAILED",
      status: result.status ?? null
    };
  }
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
  const employee = result.body.employee && typeof result.body.employee === "object" && !Array.isArray(result.body.employee)
    ? result.body.employee as HrxClientRecord
    : {};
  return {
    kind: "data",
    employee,
    employment_profile: result.body.employment_profile ?? null,
    professional_profile: result.body.professional_profile ?? employee.professional_profile ?? null,
    masked_compensation_ref: result.body.masked_compensation_ref ?? null
  };
}

export async function fetchHrxEmploymentProfiles(employeeId: string | null | undefined, asOf = currentDateKey()) {
  if (!employeeId) return { kind: "empty" as const };
  const result = await requestJson(withQuery(
    `/api/hrx/employees/${encodeURIComponent(employeeId)}/employment-profiles`,
    { as_of: asOf }
  ));
  if (result.kind !== "data" || !Array.isArray(result.body.employment_profiles)) {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYMENT_PROFILES_READ_FAILED",
      status: result.status ?? null
    };
  }
  return {
    kind: "data" as const,
    as_of: result.body.as_of ?? asOf,
    current: result.body.current ?? null,
    past: Array.isArray(result.body.past) ? result.body.past : [],
    scheduled: Array.isArray(result.body.scheduled) ? result.body.scheduled : [],
    employment_profiles: result.body.employment_profiles
  };
}

export async function createHrxEmploymentProfile(
  employeeId: string | null | undefined,
  form: HrxClientRecord,
  asOf = currentDateKey()
) {
  if (!employeeId) return { kind: "empty" as const };
  const result = await requestJson(withQuery(
    `/api/hrx/employees/${encodeURIComponent(employeeId)}/employment-profiles`,
    { as_of: asOf }
  ), {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || result.body.outcome !== "created") {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYMENT_PROFILE_CREATE_FAILED",
      status: result.status ?? null
    };
  }
  return fetchHrxEmploymentProfiles(employeeId, asOf);
}

export async function fetchHrxEmployeeUserLinks(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "empty" as const };
  const result = await requestJson(withQuery("/api/hrx/employee-user-links", { employee_id: employeeId }));
  if (result.kind !== "data" || !Array.isArray(result.body.links)) {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYEE_USER_LINKS_READ_FAILED",
      status: result.status ?? null
    };
  }
  return {
    kind: "data" as const,
    links: result.body.links,
    candidates: Array.isArray(result.body.candidates) ? result.body.candidates : [],
    can_manage: result.body.can_manage === true
  };
}

export async function createHrxEmployeeUserLink(
  employeeId: string | null | undefined,
  userId: string,
  linkId?: string
) {
  if (!employeeId) return { kind: "empty" as const };
  const generatedLinkId = linkId || `hrx_link_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`}`;
  const result = await requestJson("/api/hrx/employee-user-links", {
    method: "POST",
    body: JSON.stringify({
      link_id: generatedLinkId,
      employee_id: employeeId,
      user_id: userId,
      purpose: "login_mapping"
    })
  });
  if (result.kind !== "data" || result.body.outcome !== "created") {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYEE_USER_LINK_CREATE_FAILED",
      status: result.status ?? null
    };
  }
  return fetchHrxEmployeeUserLinks(employeeId);
}

export async function revokeHrxEmployeeUserLink(
  employeeId: string | null | undefined,
  linkId: string
) {
  if (!employeeId || !linkId) return { kind: "empty" as const };
  const result = await requestJson(`/api/hrx/employee-user-links/${encodeURIComponent(linkId)}/revoke`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (result.kind !== "data" || result.body.outcome !== "revoked") {
    return {
      kind: "error" as const,
      reason: result.reason ?? "HRX_EMPLOYEE_USER_LINK_REVOKE_FAILED",
      status: result.status ?? null
    };
  }
  return fetchHrxEmployeeUserLinks(employeeId);
}

export async function fetchHrxCompensationRecords(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(withQuery("/api/hrx/compensation", { employee_id: employeeId }), {
    stepUpPurpose: "compensation_access",
  });
  if (result.kind === "step_up_required") return result;
  if (result.kind === "guarded") return result;
  if (result.kind !== "data" || !Array.isArray(result.body.compensation_records)) {
    return { kind: "error" as const, reason: result.reason ?? "HRX_COMPENSATION_READ_FAILED", status: result.status };
  }
  return {
    kind: "data" as const,
    compensation_records: result.body.compensation_records as HrxCompensationRecord[],
    masked_compensation_ref: result.body.masked_compensation_ref ?? null,
    payroll_runtime_opened: result.body.payroll_runtime_opened === true,
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
      self_employee_id: result.body?.self_employee_id ?? null,
      permission_summary: result.body?.permission_summary ?? null,
      safeErrorCodes: result.body?.safe_error_codes ?? []
    };
  }
  if (result.kind !== "data" || !Array.isArray(result.body.attendance)) return { kind: "error" as const };
  return {
    kind: "data" as const,
    attendance: result.body.attendance,
    monthly_summary: result.body.monthly_summary ?? null,
    self_employee_id: result.body.self_employee_id ?? null
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

export async function fetchHrxAttendanceCorrectionRequests(employeeId?: string | null) {
  const result = await requestJson(withQuery("/api/hrx/attendance/correction-requests", {
    employee_id: employeeId
  }));
  if (result.kind !== "data" || !Array.isArray(result.body.correction_requests)) {
    return {
      kind: "error" as const,
      reason: result.reason ?? null,
      body: result.body ?? {},
      status: result.status
    };
  }
  return {
    kind: "data" as const,
    correctionRequests: result.body.correction_requests
  };
}

export async function requestHrxAttendanceCorrection(attendanceId: string, form: HrxClientRecord) {
  const result = await requestJson(
    `/api/hrx/attendance/${encodeURIComponent(attendanceId)}/correction-requests`,
    {
      method: "POST",
      body: JSON.stringify(form)
    }
  );
  if (result.kind !== "data" || !result.body.correction_request) {
    return {
      kind: "error" as const,
      reason: result.reason ?? null,
      body: result.body ?? {},
      status: result.status
    };
  }
  return {
    kind: "data" as const,
    correctionRequest: result.body.correction_request
  };
}

export async function decideHrxAttendanceCorrection(
  correctionRequestId: string,
  decision: "approve" | "reject",
  form: HrxClientRecord
) {
  const result = await requestJson(
    `/api/hrx/attendance/correction-requests/${encodeURIComponent(correctionRequestId)}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify(form)
    }
  );
  if (result.kind !== "data" || !result.body.correction_request) {
    return {
      kind: "error" as const,
      reason: result.reason ?? null,
      body: result.body ?? {},
      status: result.status
    };
  }
  return {
    kind: "data" as const,
    correctionRequest: result.body.correction_request,
    attendance: result.body.attendance ?? null
  };
}

export async function fetchHrxOvertimeRisk(options: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/overtime/risks", options));
  if (result.kind !== "data" || !result.body.risk_report) return { kind: "error" as const };
  return { kind: "data" as const, risk_report: result.body.risk_report };
}

export async function fetchHrxOvertime(options: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/overtime", options));
  if (result.kind === "guarded") {
    return {
      kind: "guarded" as const,
      uiState: result.body?.ui_state ?? "denied",
      overtime: Array.isArray(result.body?.overtime) ? result.body.overtime : [],
    };
  }
  if (result.kind !== "data" || !Array.isArray(result.body.overtime)) {
    return { kind: "error" as const, reason: result.reason ?? null, status: result.status };
  }
  return { kind: "data" as const, overtime: result.body.overtime };
}

export async function createHrxOvertimeRequest(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/overtime", {
    method: "POST",
    body: JSON.stringify(form),
  });
  if (result.kind !== "data" || !result.body.overtime) {
    return { kind: "error" as const, reason: result.reason ?? null, status: result.status };
  }
  return { kind: "data" as const, overtime: result.body.overtime };
}

export async function decideHrxOvertimeRequest(
  overtimeId: string,
  decision: "approve" | "reject",
  form: HrxClientRecord,
) {
  const result = await requestJson(
    `/api/hrx/overtime/${encodeURIComponent(overtimeId)}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify(form),
    },
  );
  if (result.kind !== "data" || !result.body.overtime) {
    return { kind: "error" as const, reason: result.reason ?? null, status: result.status };
  }
  return { kind: "data" as const, overtime: result.body.overtime };
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

export async function renewHrxEmploymentContractDocument(documentId: string | null | undefined, expiresOn: string | null | undefined) {
  if (!documentId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/documents/${encodeURIComponent(documentId)}/renew`, {
    method: "POST",
    body: JSON.stringify({ expires_on: expiresOn || null })
  });
  if (result.kind !== "data" || !result.body.document) return { kind: "error", reason: result.reason };
  return { kind: "data", document: result.body.document };
}

export async function terminateHrxEmploymentContractDocument(documentId: string | null | undefined) {
  if (!documentId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/documents/${encodeURIComponent(documentId)}/terminate`, {
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

export async function fetchHrxLeaveSelfState() {
  const result = await requestJson("/api/hrx/leave/me");
  if (result.kind !== "data" || !Array.isArray(result.body.balances) || !Array.isArray(result.body.requests)) {
    return { kind: "error" as const, reason: result.reason ?? null };
  }
  return {
    kind: "data" as const,
    employee_id: result.body.employee_id,
    balances: result.body.balances,
    requests: result.body.requests
  };
}

export async function fetchHrxLeaveTeamState(from?: string, to?: string) {
  const result = await requestJson(withQuery("/api/hrx/leave/team", { from, to }));
  if (result.kind !== "data" || !Array.isArray(result.body.employees) || !Array.isArray(result.body.absences)) {
    return { kind: "error" as const, reason: result.reason ?? null };
  }
  return {
    kind: "data" as const,
    range: result.body.range,
    employees: result.body.employees,
    absences: result.body.absences,
    today_absence_count: result.body.today_absence_count,
    pending_approval_count: result.body.pending_approval_count
  };
}

export async function fetchHrxActiveLeaveOptions(onDate = currentDateKey()) {
  const result = await requestJson(withQuery("/api/hrx/leave/types/active", { on_date: onDate }));
  if (result.kind !== "data" || !Array.isArray(result.body.groups) || !Array.isArray(result.body.types) || !Array.isArray(result.body.policies)) {
    return { kind: "error" as const, reason: result.reason ?? null };
  }
  return { kind: "data" as const, groups: result.body.groups, types: result.body.types, policies: result.body.policies };
}

export async function previewHrxLeaveRequest(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/me/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.preview
    ? { kind: "data" as const, preview: result.body.preview }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveEvidenceDocuments() {
  const result = await requestJson("/api/hrx/leave/me/evidence-documents");
  return result.kind === "data" && Array.isArray(result.body.documents)
    ? { kind: "data" as const, documents: result.body.documents }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function submitHrxLeaveSelfRequest(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/me/requests", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.leave_request
    ? { kind: "data" as const, leave_request: result.body.leave_request }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function amendHrxLeaveSelfRequest(requestId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/me/requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.leave_request
    ? { kind: "data" as const, leave_request: result.body.leave_request }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function cancelHrxLeaveSelfRequest(requestId: string, idempotencyKey: string) {
  const result = await requestJson(`/api/hrx/leave/me/requests/${encodeURIComponent(requestId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ idempotency_key: idempotencyKey })
  });
  return result.kind === "data" && result.body.leave_request
    ? { kind: "data" as const, leave_request: result.body.leave_request }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function respondHrxLeaveReschedule(requestId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/me/requests/${encodeURIComponent(requestId)}/reschedule-response`, {
    method: "POST",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.leave_request && result.body.proposal
    ? { kind: "data" as const, leave_request: result.body.leave_request, proposal: result.body.proposal }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function provideHrxLeaveAdditionalInformation(requestId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/me/requests/${encodeURIComponent(requestId)}/additional-information`, {
    method: "POST",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.leave_request
    ? { kind: "data" as const, leave_request: result.body.leave_request }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveApprovalQueue() {
  const result = await requestJson("/api/hrx/leave/requests");
  return result.kind === "data" && Array.isArray(result.body.approvals)
    ? { kind: "data" as const, approvals: result.body.approvals }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function resolveHrxLeaveApproval(requestId: string, command: "approve" | "reject" | "reschedule" | "request-info", form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/requests/${encodeURIComponent(requestId)}/${command}`, {
    method: "POST",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.leave_request
    ? { kind: "data" as const, leave_request: result.body.leave_request, proposal: result.body.proposal ?? null }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveDelegations() {
  const result = await requestJson("/api/hrx/leave/delegations");
  return result.kind === "data" && Array.isArray(result.body.delegations)
    ? { kind: "data" as const, delegations: result.body.delegations }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveDelegationCandidates() {
  const result = await requestJson("/api/hrx/leave/delegations/candidates");
  return result.kind === "data" && Array.isArray(result.body.candidates)
    ? { kind: "data" as const, candidates: result.body.candidates }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function createHrxLeaveDelegation(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/delegations", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.delegation
    ? { kind: "data" as const, delegation: result.body.delegation }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function closeHrxLeaveDelegation(delegationId: string, command: "revoke" | "expire") {
  const result = await requestJson(`/api/hrx/leave/delegations/${encodeURIComponent(delegationId)}/${command}`, {
    method: "POST",
    body: JSON.stringify({})
  });
  return result.kind === "data" && result.body.delegation
    ? { kind: "data" as const, delegation: result.body.delegation }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveConfiguration() {
  const result = await requestJson("/api/hrx/leave/configuration");
  if (
    result.kind !== "data" ||
    !Array.isArray(result.body.groups) ||
    !Array.isArray(result.body.types) ||
    !Array.isArray(result.body.policies)
  ) {
    return { kind: "error" as const, reason: result.reason ?? null };
  }
  return {
    kind: "data" as const,
    groups: result.body.groups,
    types: result.body.types,
    policies: result.body.policies
  };
}

export async function fetchHrxLeaveAccrualRules() {
  const result = await requestJson("/api/hrx/leave/accrual/rules");
  return result.kind === "data" && Array.isArray(result.body.rules)
    ? { kind: "data" as const, rules: result.body.rules }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function createHrxLeaveAccrualRule(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/rules", { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.rule
    ? { kind: "data" as const, rule: result.body.rule }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function updateHrxLeaveAccrualRule(ruleId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/accrual/rules/${encodeURIComponent(ruleId)}`, { method: "PATCH", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.rule
    ? { kind: "data" as const, rule: result.body.rule }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function deactivateHrxLeaveAccrualRule(ruleId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/accrual/rules/${encodeURIComponent(ruleId)}/deactivate`, { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.rule
    ? { kind: "data" as const, rule: result.body.rule }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function previewHrxLeaveAccrual(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.run
    ? { kind: "data" as const, run: result.body.run }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function executeHrxLeaveAccrual(previewRunId: string) {
  const result = await requestJson("/api/hrx/leave/accrual/execute", {
    method: "POST",
    body: JSON.stringify({ preview_run_id: previewRunId })
  });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.run
    ? { kind: "data" as const, run: result.body.run }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function previewHrxLeaveAccrualBatch(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/batches/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveAccrualBatch(batchId: string) {
  const result = await requestJson(`/api/hrx/leave/accrual/batches/${encodeURIComponent(batchId)}`);
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function executeHrxLeaveAccrualBatch(previewBatchId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/accrual/batches/${encodeURIComponent(previewBatchId)}/execute`, {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function retryHrxLeaveAccrualBatch(batchId: string) {
  const result = await requestJson(`/api/hrx/leave/accrual/batches/${encodeURIComponent(batchId)}/retry`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function exportHrxLeaveAccrualBatch(batchId: string, format: "csv" | "xlsx") {
  const result = await requestJson(withQuery(`/api/hrx/leave/accrual/batches/${encodeURIComponent(batchId)}/export`, { format }));
  return result.kind === "data" && result.body.export
    ? { kind: "data" as const, export: result.body.export }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveAccrualRuns() {
  const result = await requestJson("/api/hrx/leave/accrual/runs");
  return result.kind === "data" && Array.isArray(result.body.runs)
    ? { kind: "data" as const, runs: result.body.runs }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveManualAdjustmentSupport() {
  const [approvers, documents] = await Promise.all([
    requestJson("/api/hrx/leave/accrual/manual/approvers"),
    requestJson("/api/hrx/leave/accrual/manual/evidence-documents")
  ]);
  if (approvers.kind !== "data" || documents.kind !== "data" || !Array.isArray(approvers.body.approvers) || !Array.isArray(documents.body.documents)) {
    return { kind: "error" as const, reason: approvers.reason ?? documents.reason ?? null };
  }
  return { kind: "data" as const, approvers: approvers.body.approvers, documents: documents.body.documents };
}

export async function previewHrxLeaveManualAdjustment(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/manual/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.preview
    ? { kind: "data" as const, preview: result.body.preview }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function approveHrxLeaveManualAdjustment(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/manual/approve", { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.approval_receipt
    ? { kind: "data" as const, approval_receipt: result.body.approval_receipt }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function executeHrxLeaveManualAdjustment(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/manual/execute", { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.result
    ? { kind: "data" as const, result: result.body.result }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveOccurrenceProjections(filters: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/leave/occurrences/projections", filters));
  return result.kind === "data" && result.body.projections
    ? { kind: "data" as const, projections: result.body.projections }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function exportHrxLeaveOccurrences(format: "csv" | "xlsx", view: "list" | "month" | "type", filters: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/leave/occurrences/export", { ...filters, format, view }));
  return result.kind === "data" && result.body.export
    ? { kind: "data" as const, export: result.body.export }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function updateHrxScheduledLeaveEntitlement(entitlementId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/entitlements/${encodeURIComponent(entitlementId)}`, { method: "PATCH", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.entitlement
    ? { kind: "data" as const, entitlement: result.body.entitlement }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function cancelHrxScheduledLeaveEntitlement(entitlementId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/entitlements/${encodeURIComponent(entitlementId)}/cancel`, { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.entitlement
    ? { kind: "data" as const, entitlement: result.body.entitlement }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveOccurrenceTemplate(format: "csv" | "xlsx" = "csv") {
  const result = await requestJson(withQuery("/api/hrx/leave/accrual/manual/template", { format }));
  return result.kind === "data" && result.body.template
    ? { kind: "data" as const, template: result.body.template }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function previewHrxLeaveOccurrenceUpload(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/accrual/manual/uploads/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function approveHrxLeaveOccurrenceUpload(batchId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/accrual/manual/uploads/${encodeURIComponent(batchId)}/approve`, { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.approval_receipt
    ? { kind: "data" as const, approval_receipt: result.body.approval_receipt }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function executeHrxLeaveOccurrenceUpload(batchId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/accrual/manual/uploads/${encodeURIComponent(batchId)}/execute`, { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function retryHrxLeaveOccurrenceUpload(batchId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/accrual/manual/uploads/${encodeURIComponent(batchId)}/retry`, { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function fetchHrxLeaveUsage(filters: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/leave/ledger", filters));
  return result.kind === "data" && result.body.report
    ? { kind: "data" as const, report: result.body.report }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function validateHrxLeaveBalances(asOf?: string) {
  const result = await requestJson(withQuery("/api/hrx/leave/ledger/validate", { as_of: asOf }));
  return result.kind === "data" && result.body.validation
    ? { kind: "data" as const, validation: result.body.validation }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function captureHrxLeaveBalanceSnapshot(asOf?: string) {
  const result = await requestJson("/api/hrx/leave/ledger/snapshots", { method: "POST", body: JSON.stringify({ as_of: asOf }) });
  return result.kind === "data" && result.body.snapshot
    ? { kind: "data" as const, snapshot: result.body.snapshot }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function exportHrxLeaveUsage(format: "csv" | "xlsx", filters: HrxQueryParams = {}) {
  const result = await requestJson(withQuery("/api/hrx/leave/reports/export", { ...filters, format }));
  return result.kind === "data" && result.body.export
    ? { kind: "data" as const, export: result.body.export }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function fetchHrxLeaveIntegrations() {
  const result = await requestJson("/api/hrx/leave/integrations");
  const integration = result.body.integration as HrxClientRecord | undefined;
  return result.kind === "data" && integration && Array.isArray(integration.rows)
    ? { kind: "data" as const, integration }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function processHrxLeaveIntegrations() {
  const result = await requestJson("/api/hrx/leave/integrations/process", { method: "POST", body: JSON.stringify({ limit: 50 }) });
  const envelope = result.body.integration as HrxClientRecord | undefined;
  const integration = envelope?.status as HrxClientRecord | undefined;
  return result.kind === "data" && integration && Array.isArray(integration.rows)
    ? { kind: "data" as const, integration, processed_count: Number(envelope?.processed_count ?? 0) }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function retryHrxLeaveIntegrationDeadLetter(deadLetterId: string) {
  const result = await requestJson(`/api/hrx/leave/integrations/dead-letters/${encodeURIComponent(deadLetterId)}/retry`, { method: "POST", body: "{}" });
  const integration = result.body.integration as HrxClientRecord | undefined;
  return result.kind === "data" && integration && Array.isArray(integration.rows)
    ? { kind: "data" as const, integration }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function fetchHrxLeavePromotionWorkspace() {
  const result = await requestJson("/api/hrx/leave/promotion-campaigns");
  if (result.kind !== "data" || !Array.isArray(result.body.campaigns) || !Array.isArray(result.body.schedule_profiles) || !Array.isArray(result.body.policies)) {
    return { kind: "error" as const, reason: result.reason ?? null, status: result.status };
  }
  return { kind: "data" as const, campaigns: result.body.campaigns, schedule_profiles: result.body.schedule_profiles, policies: result.body.policies };
}

export async function previewHrxLeavePromotion(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/promotion-campaigns/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.preview
    ? { kind: "data" as const, preview: result.body.preview }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function createHrxLeavePromotionCampaign(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/promotion-campaigns", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.campaign
    ? { kind: "data" as const, campaign: result.body.campaign }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function issueHrxLeavePromotionNotice(recipientId: string, stage: "first" | "second", documentVersion: string) {
  const result = await requestJson(`/api/hrx/leave/promotion-recipients/${encodeURIComponent(recipientId)}/${stage}-notice`, { method: "POST", body: JSON.stringify({ document_version: documentVersion }) });
  return result.kind === "data" && result.body.recipient
    ? { kind: "data" as const, recipient: result.body.recipient }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function issueHrxLeavePromotionBatch(campaignId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/promotion-campaigns/${encodeURIComponent(campaignId)}/issue-batch`, { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.batch
    ? { kind: "data" as const, batch: result.body.batch }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function recordHrxLeavePromotionEvidence(recipientId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/promotion-recipients/${encodeURIComponent(recipientId)}/evidence`, { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.recipient
    ? { kind: "data" as const, recipient: result.body.recipient }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function revokeHrxLeavePromotionEvidence(recipientId: string, receiptId: string, reasonCode: string) {
  const result = await requestJson(`/api/hrx/leave/promotion-recipients/${encodeURIComponent(recipientId)}/evidence/${encodeURIComponent(receiptId)}/revoke`, { method: "POST", body: JSON.stringify({ reason_code: reasonCode }) });
  return result.kind === "data" && result.body.recipient
    ? { kind: "data" as const, recipient: result.body.recipient }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function recordHrxLeavePromotionResponse(recipientId: string, selectedDates: string[]) {
  const result = await requestJson(`/api/hrx/leave/promotion-recipients/${encodeURIComponent(recipientId)}/response`, { method: "POST", body: JSON.stringify({ selected_dates: selectedDates }) });
  return result.kind === "data" && result.body.recipient
    ? { kind: "data" as const, recipient: result.body.recipient }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function fetchHrxLeaveTerminationWorkspace() {
  const [candidates, approvers, reconciliations] = await Promise.all([
    requestJson("/api/hrx/leave/termination-reconciliations/candidates"),
    requestJson("/api/hrx/leave/termination-reconciliations/approvers"),
    requestJson("/api/hrx/leave/termination-reconciliations")
  ]);
  if (
    candidates.kind !== "data" || approvers.kind !== "data" || reconciliations.kind !== "data" ||
    !Array.isArray(candidates.body.candidates) || !Array.isArray(approvers.body.approvers) || !Array.isArray(reconciliations.body.reconciliations)
  ) {
    return { kind: "error" as const, reason: candidates.reason ?? approvers.reason ?? reconciliations.reason ?? null };
  }
  return { kind: "data" as const, candidates: candidates.body.candidates, approvers: approvers.body.approvers, reconciliations: reconciliations.body.reconciliations };
}

export async function previewHrxLeaveTermination(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/termination-reconciliations/preview", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.reconciliation
    ? { kind: "data" as const, reconciliation: result.body.reconciliation }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function approveHrxLeaveTermination(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/termination-reconciliations/approve", { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.approval_receipt
    ? { kind: "data" as const, approval_receipt: result.body.approval_receipt }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function executeHrxLeaveTermination(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/termination-reconciliations/execute", { method: "POST", body: JSON.stringify(form) });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  return result.kind === "data" && result.body.reconciliation
    ? { kind: "data" as const, reconciliation: result.body.reconciliation }
    : { kind: "error" as const, reason: result.reason ?? null, status: result.status };
}

export async function createHrxLeaveGroup(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/groups", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.group
    ? { kind: "data" as const, group: result.body.group }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function updateHrxLeaveGroup(groupId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/groups/${encodeURIComponent(groupId)}`, {
    method: "PATCH",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.group
    ? { kind: "data" as const, group: result.body.group }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function createHrxLeaveType(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/types", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.leave_type
    ? { kind: "data" as const, leave_type: result.body.leave_type }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function updateHrxLeaveType(leaveTypeId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/types/${encodeURIComponent(leaveTypeId)}`, {
    method: "PATCH",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.leave_type
    ? { kind: "data" as const, leave_type: result.body.leave_type }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function createHrxLeavePolicy(form: HrxClientRecord) {
  const result = await requestJson("/api/hrx/leave/policies", { method: "POST", body: JSON.stringify(form) });
  return result.kind === "data" && result.body.policy
    ? { kind: "data" as const, policy: result.body.policy }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function updateHrxLeavePolicy(policyVersionId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/policies/${encodeURIComponent(policyVersionId)}`, {
    method: "PATCH",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.policy
    ? { kind: "data" as const, policy: result.body.policy }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function publishHrxLeavePolicy(policyVersionId: string) {
  const result = await requestJson(`/api/hrx/leave/policies/${encodeURIComponent(policyVersionId)}/publish`, {
    method: "POST",
    body: JSON.stringify({})
  });
  return result.kind === "data" && result.body.policy
    ? { kind: "data" as const, policy: result.body.policy }
    : { kind: "error" as const, reason: result.reason ?? null };
}

export async function createNextHrxLeavePolicyVersion(policyVersionId: string, form: HrxClientRecord) {
  const result = await requestJson(`/api/hrx/leave/policies/${encodeURIComponent(policyVersionId)}/versions`, {
    method: "POST",
    body: JSON.stringify(form)
  });
  return result.kind === "data" && result.body.policy
    ? { kind: "data" as const, policy: result.body.policy }
    : { kind: "error" as const, reason: result.reason ?? null };
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
    capabilities: result.body.capabilities ?? {},
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

export async function createHrxRecruitingPipeline(form: HrxClientRecord, idempotencyKey: string) {
  const result = await requestJson("/api/hrx/recruiting/pipeline", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      job_title: form.job_title,
      department_ref: form.department_ref,
      position_count: Number(form.position_count),
      hiring_manager_employee_id: form.hiring_manager_employee_id,
      candidate_name: form.candidate_name,
      candidate_email: form.candidate_email,
      interviewer_employee_id: form.interviewer_employee_id,
      interview_date: form.interview_date,
      interview_time: form.interview_time,
      consent_expires_at: form.consent_expires_at,
      retention_expires_at: form.retention_expires_at
    })
  });
  if (result.kind !== "data" || !result.body.ids) {
    return {
      kind: "error" as const,
      reason: result.kind === "error" ? result.reason ?? null : null
    };
  }
  return { kind: "data" as const, ids: result.body.ids };
}

export async function updateHrxOfferStage(offerId: string, state: string) {
  const result = await requestJson(`/api/hrx/recruiting/offers/${encodeURIComponent(offerId)}/stage`, {
    method: "POST",
    body: JSON.stringify({ state })
  });
  if (result.kind !== "data" || !result.body.offer) return { kind: "error" };
  return { kind: "data", offer: result.body.offer };
}

export async function convertHrxApplicationToEmployee(applicationId: string, form: HrxClientRecord) {
  const effectiveFrom = typeof form.effective_from === "string" ? form.effective_from.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { kind: "error" as const, reason: "HRX_CANDIDATE_CONVERSION_EFFECTIVE_DATE_REQUIRED" };
  }
  const result = await requestJson(`/api/hrx/recruiting/applications/${encodeURIComponent(applicationId)}/convert-to-employee`, {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `candidate-conversion:${applicationId}`,
      effective_from: effectiveFrom
    })
  });
  if (result.kind !== "data" || !result.body.conversion) return { kind: "error" };
  return {
    kind: "data",
    conversion: result.body.conversion,
    receipt: result.body.receipt ?? null,
    replayed: result.body.replayed === true
  };
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
    return { kind: "data" as const, onboarding: [], offboarding: [], source: "app_roster" };
  }
  return {
    kind: "data" as const,
    onboarding: onboarding.body.onboarding,
    offboarding: offboarding.body.offboarding
  };
}

export async function updateHrxOnboardingTask(
  onboardingId: string,
  taskId: string,
  patch: string | HrxClientRecord
) {
  const result = await requestJson(
    `/api/hrx/lifecycle/onboarding/${encodeURIComponent(onboardingId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "POST",
      body: JSON.stringify(typeof patch === "string" ? { status: patch } : patch)
    }
  );
  if (result.kind !== "data" || !result.body.onboarding) return { kind: "error" };
  return { kind: "data", onboarding: result.body.onboarding };
}

export async function updateHrxOffboardingTask(
  offboardingId: string,
  taskId: string,
  patch: string | HrxClientRecord
) {
  const result = await requestJson(
    `/api/hrx/lifecycle/offboarding/${encodeURIComponent(offboardingId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "POST",
      body: JSON.stringify(typeof patch === "string" ? { status: patch } : patch)
    }
  );
  if (result.kind !== "data" || !result.body.offboarding) return { kind: "error" };
  return { kind: "data", offboarding: result.body.offboarding };
}

export async function closeHrxOffboardingCase(offboardingId: string) {
  const result = await requestJson(`/api/hrx/lifecycle/offboarding/${encodeURIComponent(offboardingId)}/close`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (result.kind !== "data" || !result.body.offboarding) {
    return { kind: "error", reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return {
    kind: "data",
    offboarding: result.body.offboarding,
    operationalClose: result.body.operational_close ?? null,
    accountRevocation: result.body.account_revocation ?? null
  };
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
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
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
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
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
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    body: JSON.stringify({
      preview_id: previewId,
      export_artifact_ref: exportArtifactRef || `문서:${previewId}:내보내기-파일`,
      provider_payload_ref: `ProviderDraft:${previewId}`
    })
  });
  if (result.kind !== "data" || !result.body.artifact) return { kind: "error" };
  return { kind: "data", artifact: result.body.artifact };
}

function payrollRuntimeResult(result: HrxApiResult, field: "workspace" | "bundle") {
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind === "guarded") {
    const safeCodes = Array.isArray(result.body.safe_error_codes) ? result.body.safe_error_codes : [];
    return {
      kind: "error" as const,
      reason: result.body.safe_error_code ?? safeCodes[0] ?? "HRX_AUTHZ_DENIED",
      body: result.body,
      status: result.status,
    };
  }
  if (result.kind !== "data" || !result.body[field]) {
    return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return { kind: "data" as const, [field]: result.body[field] };
}

function payrollDashboardSummaryResult(result: HrxApiResult) {
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind === "guarded") {
    return {
      kind: "guarded" as const,
      uiState: result.body?.ui_state ?? "denied",
      outcome: result.body?.outcome ?? "denied",
      safeErrorCodes: result.body?.safe_error_codes ?? [],
    };
  }
  if (result.kind !== "data") return { kind: "error" as const, reason: result.reason ?? null, status: result.status };
  if (!result.body.summary) return { kind: "empty" as const, summary: null };
  return { kind: "data" as const, summary: result.body.summary };
}

export type HrxPayrollItem = {
  item_id: string;
  code: string;
  display_name: string;
  kind: "earning" | "deduction";
  tax_treatment: "taxable" | "non_taxable";
  value_mode: "fixed" | "variable";
  calculation_order: number;
  effective_from: string;
  effective_to: string | null;
  status: "active" | "inactive";
  state_version: number;
};

export type HrxCompensationRecord = {
  compensation_id: string;
  employee_id: string;
  masked_compensation_ref: string;
  encrypted_amount_ref_included: false;
  raw_amount_included: false;
  currency_ref: string | null;
  effective_from: string;
  effective_to: string | null;
};

export type HrxPayrollItemAssignment = {
  assignment_id: string;
  payroll_profile_id: string;
  employee_id: string;
  item_id: string;
  version: number;
  masked_compensation_ref: string;
  encrypted_amount_ref_included: false;
  raw_amount_included: false;
  effective_from: string;
  effective_to: string | null;
  status: "active" | "inactive";
};

export type HrxPayrollProfile = {
  payroll_profile_id: string;
  employee_id: string;
  employment_type: "monthly" | "hourly" | "daily" | "freelancer";
  pay_group_code: string;
  currency: "KRW";
  compensation_unit: "period" | "hour" | "day" | "contract" | "deliverable";
  compensation_quantity: number;
  effective_from: string;
  effective_to: string | null;
  status: "active" | "inactive";
  state_version: number;
  assignments: HrxPayrollItemAssignment[];
};

function payrollCatalogResult(result: HrxApiResult, field: "items" | "item" | "profiles" | "profile" | "assignment" | "approval_receipt") {
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind === "guarded") {
    const safeCodes = Array.isArray(result.body.safe_error_codes) ? result.body.safe_error_codes : [];
    return {
      kind: "guarded" as const,
      uiState: result.body.ui_state ?? "denied",
      reason: result.body.safe_error_code ?? safeCodes[0] ?? "HRX_AUTHZ_DENIED",
      status: result.status,
    };
  }
  if (result.kind !== "data" || !result.body[field]) {
    return {
      kind: "error" as const,
      reason: result.reason ?? result.body?.safe_error_code ?? "HRX_PAYROLL_CATALOG_REQUEST_FAILED",
      status: result.status,
    };
  }
  return { kind: "data" as const, [field]: result.body[field] };
}

export async function fetchHrxPayrollItems(includeInactive = false) {
  return payrollCatalogResult(await requestJson(withQuery("/api/hrx/payroll/items", { include_inactive: includeInactive }), {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "items");
}

export async function createHrxPayrollItem(form: HrxClientRecord) {
  return payrollCatalogResult(await requestJson("/api/hrx/payroll/items", {
    method: "POST",
    body: JSON.stringify(form),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "item");
}

export async function updateHrxPayrollItem(itemId: string, form: HrxClientRecord) {
  return payrollCatalogResult(await requestJson(`/api/hrx/payroll/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify(form),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "item");
}

export async function fetchHrxPayrollSelfProfile() {
  return payrollCatalogResult(await requestJson("/api/hrx/payroll/me/profile", {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "profiles");
}

export async function fetchHrxPayrollProfile(employeeId: string, onDate?: string, includeHistory = false) {
  return payrollCatalogResult(await requestJson(withQuery(`/api/hrx/payroll/profiles/${encodeURIComponent(employeeId)}`, {
    on_date: onDate,
    include_history: includeHistory,
  }), { stepUpPurpose: PAYROLL_EXPORT_REVIEW }), "profiles");
}

export async function createHrxPayrollProfile(form: HrxClientRecord) {
  return payrollCatalogResult(await requestJson("/api/hrx/payroll/profiles", {
    method: "POST",
    body: JSON.stringify(form),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "profile");
}

export async function updateHrxPayrollProfile(profileId: string, form: HrxClientRecord) {
  return payrollCatalogResult(await requestJson(`/api/hrx/payroll/profiles/${encodeURIComponent(profileId)}`, {
    method: "PATCH",
    body: JSON.stringify(form),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "profile");
}

export async function assignHrxPayrollItem(profileId: string, form: HrxClientRecord) {
  return payrollCatalogResult(await requestJson(`/api/hrx/payroll/profiles/${encodeURIComponent(profileId)}/assignments`, {
    method: "POST",
    body: JSON.stringify(form),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "assignment");
}

export async function retireHrxPayrollItemAssignment(profileId: string, assignmentId: string, expectedVersion: number) {
  return payrollCatalogResult(await requestJson(`/api/hrx/payroll/profiles/${encodeURIComponent(profileId)}/assignments/${encodeURIComponent(assignmentId)}/retire`, {
    method: "POST",
    body: JSON.stringify({ expected_version: expectedVersion }),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "assignment");
}

export async function approveHrxPayrollAttendance(form: HrxClientRecord) {
  return payrollCatalogResult(await requestJson("/api/hrx/payroll/attendance-approvals", {
    method: "POST",
    body: JSON.stringify(form),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "approval_receipt");
}

export async function fetchHrxPayrollWorkspace() {
  return payrollRuntimeResult(await requestJson("/api/hrx/payroll/periods", {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "workspace");
}

export async function createHrxPayrollPeriod(form: HrxClientRecord) {
  return payrollOperationResult(
    await requestJson("/api/hrx/payroll/periods", {
      method: "POST",
      body: JSON.stringify(form),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "period",
  );
}

export async function createHrxPayrollRun(form: HrxClientRecord) {
  return payrollOperationResult(
    await requestJson("/api/hrx/payroll/runs", {
      method: "POST",
      body: JSON.stringify(form),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "run",
  );
}

export async function createHrxPayrollAdjustmentRun(form: HrxClientRecord) {
  return payrollOperationResult(
    await requestJson("/api/hrx/payroll/runs", {
      method: "POST",
      body: JSON.stringify({ ...form, run_type: "adjustment" }),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "run",
  );
}

export async function fetchHrxPayrollDashboardSummary(month: string) {
  return payrollDashboardSummaryResult(await requestJson(
    withQuery("/api/hrx/payroll/dashboard-summary", { month }),
    { stepUpPurpose: PAYROLL_EXPORT_REVIEW },
  ));
}

export async function fetchHrxPayrollRun(runId: string) {
  return payrollRuntimeResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}`, {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "bundle");
}

export async function fetchHrxPayrollClosePrecheck(runId: string) {
  return payrollOperationResult(
    await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/precheck`, {
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "precheck",
  );
}

export async function captureHrxPayrollRun(runId: string) {
  return payrollRuntimeResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/snapshot`, {
    method: "POST",
    body: JSON.stringify({}),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "bundle");
}

export async function previewHrxPayrollRun(runId: string) {
  return payrollRuntimeResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/preview`, {
    method: "POST",
    body: JSON.stringify({}),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "bundle");
}

export async function resolveHrxPayrollIssue(issueId: string, expectedVersion: number) {
  const result = await requestJson(`/api/hrx/payroll/issues/${encodeURIComponent(issueId)}/resolve`, {
    method: "POST",
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    body: JSON.stringify({
      expected_version: expectedVersion,
      state: "resolved",
      resolution_code: "REVIEWED_SOURCE_EVIDENCE"
    })
  });
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind !== "data" || !result.body.issue) {
    return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  }
  return { kind: "data" as const, issue: result.body.issue };
}

export async function approveHrxPayrollRun(runId: string) {
  return payrollRuntimeResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "bundle");
}

export async function closeHrxPayrollRun(runId: string) {
  return payrollRuntimeResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/close`, {
    method: "POST",
    body: JSON.stringify({}),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "bundle");
}

function payrollOperationResult(result: HrxApiResult, field: string) {
  if (result.kind === "step_up_required") return { ...result, kind: "step_up_required" as const };
  if (result.kind !== "data" || !result.body[field]) return { kind: "error" as const, reason: result.reason ?? null, body: result.body ?? {}, status: result.status };
  return { kind: "data" as const, [field]: result.body[field] };
}

export async function fetchHrxPayrollAllowanceRules() {
  return payrollOperationResult(await requestJson("/api/hrx/payroll/rules", {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "rules");
}

export async function createHrxPayrollAllowanceRule(form: HrxClientRecord) {
  return payrollOperationResult(
    await requestJson("/api/hrx/payroll/rules", {
      method: "POST",
      body: JSON.stringify(form),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "rule",
  );
}

export async function reviewHrxPayrollAllowanceRule(ruleVersionId: string, expectedVersion: number) {
  return payrollOperationResult(
    await requestJson(`/api/hrx/payroll/rules/${encodeURIComponent(ruleVersionId)}/review`, {
      method: "POST",
      body: JSON.stringify({ expected_version: expectedVersion }),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "rule",
  );
}

export async function publishHrxPayrollAllowanceRule(ruleVersionId: string, expectedVersion: number) {
  return payrollOperationResult(
    await requestJson(`/api/hrx/payroll/rules/${encodeURIComponent(ruleVersionId)}/publish`, {
      method: "POST",
      body: JSON.stringify({ expected_version: expectedVersion }),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "rule",
  );
}

export async function fetchHrxMinimumWageStandards() {
  const result = await requestJson("/api/hrx/payroll/minimum-wage", {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  });
  const operation = payrollOperationResult(result, "standards");
  if (operation.kind !== "data") return operation;
  return {
    kind: "data" as const,
    standards: result.body.standards,
    permissions: objectRecord(result.body.permissions) ?? {},
  };
}

export async function createHrxMinimumWageStandard(form: HrxClientRecord) {
  return payrollOperationResult(
    await requestJson("/api/hrx/payroll/minimum-wage", {
      method: "POST",
      body: JSON.stringify(form),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "standard",
  );
}

export async function legallyApproveHrxMinimumWageStandard(ruleVersionId: string, expectedVersion: number, legalReviewRef: string) {
  return payrollOperationResult(
    await requestJson(`/api/hrx/payroll/minimum-wage/${encodeURIComponent(ruleVersionId)}/legal-approve`, {
      method: "POST",
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
      body: JSON.stringify({
        expected_version: expectedVersion,
        legal_review_ref: legalReviewRef,
      }),
    }),
    "standard",
  );
}

export async function reviewHrxMinimumWageStandard(ruleVersionId: string, expectedVersion: number) {
  return payrollOperationResult(
    await requestJson(`/api/hrx/payroll/minimum-wage/${encodeURIComponent(ruleVersionId)}/review`, {
      method: "POST",
      body: JSON.stringify({ expected_version: expectedVersion }),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "standard",
  );
}

export async function publishHrxMinimumWageStandard(ruleVersionId: string, expectedVersion: number) {
  return payrollOperationResult(
    await requestJson(`/api/hrx/payroll/minimum-wage/${encodeURIComponent(ruleVersionId)}/publish`, {
      method: "POST",
      body: JSON.stringify({ expected_version: expectedVersion }),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "standard",
  );
}

export async function previewHrxMinimumWageImpact(asOf: string) {
  return payrollOperationResult(
    await requestJson("/api/hrx/payroll/minimum-wage/preview", {
      method: "POST",
      body: JSON.stringify({ as_of: asOf }),
      stepUpPurpose: PAYROLL_EXPORT_REVIEW,
    }),
    "impact",
  );
}

export async function fetchHrxPayrollStatements(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/statements`, {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "statements");
}

export async function generateHrxPayrollStatements(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/statements/generate`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "generated");
}

export async function deliverHrxPayrollStatements(runId: string, channel: "email" | "message" | "self_service") {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/statements/deliver`, {
    method: "POST",
    body: JSON.stringify({ channel }),
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "delivery");
}

export async function exportHrxPayrollRegister(runId: string, format: "csv" | "xlsx") {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/export?format=${format}`, {
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "artifact");
}

export async function fetchHrxPayrollStatementsSelf() {
  return payrollOperationResult(await requestJson("/api/hrx/payroll/statements/self", {
    stepUpPurpose: PAYROLL_STATEMENT_SELF_SERVICE,
  }), "statements");
}

export async function readHrxPayrollStatement(statementId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/statements/${encodeURIComponent(statementId)}/download`, {
    stepUpPurpose: PAYROLL_STATEMENT_SELF_SERVICE,
  }), "artifact");
}

export async function revokeHrxPayrollStatement(statementId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/statements/${encodeURIComponent(statementId)}/revoke`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_EXPORT_REVIEW,
  }), "statement");
}

export async function prepareHrxPayrollPayment(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/payments/prepare`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_PAYMENT_PROCESSING,
  }), "payment");
}

export async function fetchHrxPayrollPayment(batchId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}`, {
    stepUpPurpose: PAYROLL_PAYMENT_PROCESSING,
  }), "payment");
}

export async function approveHrxPayrollPayment(batchId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}/approve`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_PAYMENT_PROCESSING,
  }), "payment");
}

export async function exportHrxPayrollPayment(batchId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}/export`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_PAYMENT_PROCESSING,
  }), "artifact");
}

export async function reconcileHrxPayrollPayment(batchId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}/reconcile`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_PAYMENT_PROCESSING,
  }), "payment");
}

export async function retryFailedHrxPayrollPayment(batchId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}/retry-failed`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_PAYMENT_PROCESSING,
  }), "payment");
}

export async function fetchHrxPayrollFilings(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/filings`, {
    stepUpPurpose: PAYROLL_FILING_PROCESSING,
  }), "filings");
}

export async function createHrxPayrollFiling(runId: string, filingKind: "withholding" | "payment_statement" | "social_insurance" | "year_end") {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/filings`, {
    method: "POST",
    body: JSON.stringify({ filing_kind: filingKind }),
    stepUpPurpose: PAYROLL_FILING_PROCESSING,
  }), "filing");
}

export async function validateHrxPayrollFiling(filingJobId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/filings/${encodeURIComponent(filingJobId)}/validate`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_FILING_PROCESSING,
  }), "filing");
}

export async function submitHrxPayrollFiling(filingJobId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/filings/${encodeURIComponent(filingJobId)}/submit`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_FILING_PROCESSING,
  }), "submission");
}

export async function correctHrxPayrollFiling(filingJobId: string, replacementRunId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/filings/${encodeURIComponent(filingJobId)}/correct`, {
    method: "POST",
    body: JSON.stringify({ replacement_run_id: replacementRunId }),
    stepUpPurpose: PAYROLL_FILING_PROCESSING,
  }), "filing");
}

export async function collectHrxPayrollYearEnd(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/year-end/collect`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_YEAR_END_PROCESSING,
  }), "year_end");
}

export async function calculateHrxPayrollYearEnd(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/year-end/calculate`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_YEAR_END_PROCESSING,
  }), "year_end");
}

export async function reviewHrxPayrollYearEnd(runId: string) {
  return payrollOperationResult(await requestJson(`/api/hrx/payroll/runs/${encodeURIComponent(runId)}/year-end/review`, {
    method: "POST",
    body: "{}",
    stepUpPurpose: PAYROLL_YEAR_END_REVIEW,
  }), "year_end");
}

export function parsePeopleSourceEnvelope(value: unknown) {
  const envelope = objectRecord(value);
  const data = objectRecord(envelope?.data);
  const sourceStatus = Array.isArray(envelope?.source_status) ? envelope.source_status : null;
  if (
    envelope?.schema_version !== PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION
    || typeof envelope.as_of !== "string"
    || !Number.isFinite(Date.parse(envelope.as_of))
    || typeof envelope.timezone !== "string"
    || !PEOPLE_SOURCE_STATES.has(String(envelope.state))
    || !sourceStatus
    || !data
  ) {
    return { kind: "error" as const, reason: "PEOPLE_SOURCE_ENVELOPE_INVALID" };
  }
  const normalizedStatus = sourceStatus.map((item) => {
    const status = objectRecord(item);
    if (
      !status
      || typeof status.source !== "string"
      || !status.source.trim()
      || !PEOPLE_SOURCE_ITEM_STATES.has(String(status.state))
    ) return null;
    return {
      source: status.source,
      state: status.state,
      last_success_at: typeof status.last_success_at === "string" ? status.last_success_at : null,
      stale_after: typeof status.stale_after === "string" ? status.stale_after : null,
      safe_error_code: typeof status.safe_error_code === "string" ? status.safe_error_code : null
    };
  });
  if (normalizedStatus.some((item) => item === null)) {
    return { kind: "error" as const, reason: "PEOPLE_SOURCE_ENVELOPE_INVALID" };
  }
  return {
    kind: "data" as const,
    envelope: {
      schema_version: PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION,
      state: envelope.state,
      as_of: envelope.as_of,
      timezone: envelope.timezone,
      source_status: normalizedStatus,
      data
    }
  };
}

export async function fetchPeopleDailyBrief(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "empty" as const };
  const result = await requestJson(`/api/hrx/people/members/${encodeURIComponent(employeeId)}/daily-brief`, {
    timeoutMs: PEOPLE_REQUEST_TIMEOUT_MS,
  });
  if (result.kind !== "data") {
    return {
      kind: "error" as const,
      status: result.status ?? null,
      reason: result.reason ?? "PEOPLE_DAILY_BRIEF_REQUEST_FAILED"
    };
  }
  return parsePeopleSourceEnvelope(result.body);
}

function parsePeopleOutlookConnection(result: HrxApiResult) {
  if (result.kind !== "data") {
    return {
      kind: "error" as const,
      status: result.status ?? null,
      reason: result.reason ?? "OUTLOOK_CONNECTION_REQUEST_FAILED"
    };
  }
  const connection = objectRecord(result.body.connection);
  if (
    !connection
    || connection.provider !== "microsoft_graph"
    || typeof connection.connection_state !== "string"
    || connection.delegated_scope !== "Calendars.ReadBasic"
    || Object.keys(connection).some((key) => /(access|refresh)?_?token|secret|credential/i.test(key))
  ) {
    return { kind: "error" as const, status: null, reason: "OUTLOOK_CONNECTION_RESPONSE_INVALID" };
  }
  const authorizeUrl = connection.authorize_url;
  const stateRef = connection.state_ref;
  const hasAuthorization = authorizeUrl !== undefined || stateRef !== undefined;
  if (hasAuthorization && !isAllowedPeopleOutlookAuthorizeUrl(authorizeUrl)) {
    return { kind: "error" as const, status: null, reason: "OUTLOOK_AUTHORIZE_URL_NOT_ALLOWED" };
  }
  if (
    hasAuthorization
    && (
      connection.connection_state !== "consent_pending"
      || typeof stateRef !== "string"
      || !PEOPLE_OUTLOOK_STATE_PATTERN.test(stateRef)
    )
  ) {
    return { kind: "error" as const, status: null, reason: "OUTLOOK_AUTHORIZATION_RESPONSE_INVALID" };
  }
  const {
    authorize_url: _authorizeUrl,
    state_ref: _stateRef,
    ...publicConnection
  } = connection;
  return {
    kind: "data" as const,
    connection: publicConnection,
    authorization: hasAuthorization
      ? { authorize_url: authorizeUrl as string, state_ref: stateRef as string }
      : null
  };
}

export function isAllowedPeopleOutlookAuthorizeUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 8192) return false;
  try {
    const url = new URL(value);
    const hasSecretParameter = [...url.searchParams.keys()].some((key) => (
      /^(?:access_token|refresh_token|id_token|client_secret)$/i.test(key)
    ));
    return url.protocol === "https:"
      && url.hostname === PEOPLE_OUTLOOK_AUTHORIZE_HOST
      && url.username === ""
      && url.password === ""
      && (url.port === "" || url.port === "443")
      && /^\/[^/]+\/oauth2\/v2\.0\/authorize\/?$/.test(url.pathname)
      && url.hash === ""
      && !hasSecretParameter;
  } catch {
    return false;
  }
}

export async function fetchPeopleOutlookConnection(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "error" as const, status: null, reason: "PEOPLE_MEMBER_ID_REQUIRED" };
  return parsePeopleOutlookConnection(await requestJson(
    `/api/hrx/people/members/${encodeURIComponent(employeeId)}/outlook-connection`,
    { timeoutMs: PEOPLE_REQUEST_TIMEOUT_MS }
  ));
}

export async function updatePeopleOutlookConnection(
  employeeId: string | null | undefined,
  action: "begin" | "retry",
) {
  if (!employeeId) return { kind: "error" as const, status: null, reason: "PEOPLE_MEMBER_ID_REQUIRED" };
  const body = { action, idempotency_key: globalThis.crypto.randomUUID() };
  return parsePeopleOutlookConnection(await requestJson(
    `/api/hrx/people/members/${encodeURIComponent(employeeId)}/outlook-connection`,
    {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: PEOPLE_REQUEST_TIMEOUT_MS,
    }
  ));
}

export async function disconnectPeopleOutlookConnection(employeeId: string | null | undefined) {
  if (!employeeId) return { kind: "error" as const, status: null, reason: "PEOPLE_MEMBER_ID_REQUIRED" };
  const body = { idempotency_key: globalThis.crypto.randomUUID() };
  return parsePeopleOutlookConnection(await requestJson(
    `/api/hrx/people/members/${encodeURIComponent(employeeId)}/outlook-connection`,
    {
      method: "DELETE",
      body: JSON.stringify(body),
      timeoutMs: PEOPLE_REQUEST_TIMEOUT_MS,
    }
  ));
}

export async function fetchPeopleTeamOperations() {
  const result = await requestJson("/api/hrx/people/team-operations");
  if (result.kind !== "data") {
    return {
      kind: "error" as const,
      status: result.status ?? null,
      reason: result.reason ?? "PEOPLE_TEAM_OPERATIONS_REQUEST_FAILED"
    };
  }
  return parsePeopleSourceEnvelope(result.body);
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
