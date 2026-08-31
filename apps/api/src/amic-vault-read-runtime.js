import { createHash } from "node:crypto";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const ACCOUNT_LEDGER_ID = /^[a-z0-9][a-z0-9._-]{1,78}[a-z0-9]$/u;
const READ_PATHS = new Set(["/api/vault/documents", "/api/vault/search"]);
const MAX_PAGE = 1_000;
const MAX_PAGE_SIZE = 50;

function errorResponse(status, requestId, code, auditHintRef = null) {
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: requestId,
      outcome: "blocked",
      items: Object.freeze([]),
      safe_error_codes: Object.freeze([code]),
      audit_hint_ref: auditHintRef,
      ui_state: status === 403 ? "denied" : "blocked",
      count_leak_prevented: true,
      production_ready_claim: false,
    }),
  });
}

function calendarDate(value) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "string"
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(Number.NaN);
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/u.test(value)
    && !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

function pageNumber(value, fallback, maximum) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

function principalBinding(principal) {
  const tenantId = typeof principal?.tenant_id === "string" && SAFE_ID.test(principal.tenant_id)
    ? principal.tenant_id
    : null;
  const userId = typeof principal?.user_id === "string"
    ? principal.user_id.trim().toLowerCase()
    : "";
  if (!tenantId || !ACCOUNT_LEDGER_ID.test(userId) || !Array.isArray(principal?.scopes)) {
    return null;
  }
  return Object.freeze({ tenant_id: tenantId, user_id: userId });
}

function capabilityRequestId(requestId) {
  return `vault-read-cap-${createHash("sha256").update(String(requestId)).digest("hex").slice(0, 32)}`;
}

function providerError(error, requestId, auditHintRef) {
  const status = Number(error?.status);
  const code = String(error?.safe_error_code ?? "");
  if (status === 400) {
    return errorResponse(400, requestId, "VAULT_READ_REQUEST_INVALID", auditHintRef);
  }
  if (status === 403 || status === 404) {
    return errorResponse(403, requestId, "VAULT_READ_DENIED", auditHintRef);
  }
  if (status === 409) {
    return errorResponse(409, requestId, "VAULT_READ_PROVIDER_CONFLICT", auditHintRef);
  }
  if (code.includes("RESPONSE_INVALID")) {
    return errorResponse(502, requestId, "VAULT_READ_PROVIDER_RESPONSE_INVALID", auditHintRef);
  }
  return errorResponse(503, requestId, "VAULT_READ_PROVIDER_UNAVAILABLE", auditHintRef);
}

function commonInput(query, principal, requestId) {
  const binding = principalBinding(principal);
  if (!binding) return { error: errorResponse(403, requestId, "VAULT_SESSION_PRINCIPAL_INVALID", query?.audit_hint_ref ?? null) };
  if (!principal.scopes.includes("vault.read")) {
    return { error: errorResponse(403, requestId, "VAULT_SCOPE_NOT_GRANTED", query?.audit_hint_ref ?? null) };
  }
  // The legacy tenant query is a UI compatibility hint, never authority. The
  // signed session and Vault account-ledger binding select the actual tenant.
  const matterId = query?.matter_id == null || query.matter_id === ""
    ? null
    : typeof query.matter_id === "string" && SAFE_ID.test(query.matter_id)
      ? query.matter_id
      : undefined;
  const page = pageNumber(query?.page, 1, MAX_PAGE);
  const pageSize = pageNumber(query?.page_size, MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  if (matterId === undefined || page === null || pageSize === null) {
    return { error: errorResponse(400, requestId, "VAULT_READ_REQUEST_INVALID", query?.audit_hint_ref ?? null) };
  }
  return {
    binding,
    matterId,
    page,
    pageSize,
    auditHintRef: typeof query?.audit_hint_ref === "string" ? query.audit_hint_ref : null,
  };
}

function searchInput(query, common, requestId) {
  const rawQuery = typeof query?.q === "string"
    ? query.q
    : typeof query?.query === "string"
      ? query.query
      : "";
  const normalizedQuery = rawQuery.trim();
  const dateFrom = calendarDate(query?.date_from);
  const dateTo = calendarDate(query?.date_to);
  if (normalizedQuery.length > 2_000
      || (query?.current_version != null && query.current_version !== "current")
      || dateFrom === undefined
      || dateTo === undefined
      || (dateFrom && dateTo && dateFrom > dateTo)) {
    return { error: errorResponse(400, requestId, "VAULT_READ_REQUEST_INVALID", common.auditHintRef) };
  }
  return { normalizedQuery, dateFrom, dateTo };
}

function providerAuthority(result) {
  return Object.freeze({
    authority_kind: result.authority_kind,
    authority_ref: result.authority_ref,
    provider_revision: result.provider_revision,
  });
}

export function isAmicVaultProviderReadPath(pathname, method = "GET") {
  return method === "GET" && READ_PATHS.has(pathname);
}

export async function handleAmicVaultProviderRead({
  pathname,
  query = {},
  principal,
  requestId = "req_unset",
  provider,
} = {}) {
  if (!isAmicVaultProviderReadPath(pathname)) {
    return errorResponse(404, requestId, "VAULT_READ_ROUTE_NOT_FOUND", query?.audit_hint_ref ?? null);
  }
  if (typeof provider?.resolveCapabilities !== "function"
      || typeof provider?.listDocuments !== "function"
      || typeof provider?.searchDocuments !== "function") {
    return errorResponse(503, requestId, "VAULT_READ_PROVIDER_UNAVAILABLE", query?.audit_hint_ref ?? null);
  }
  const common = commonInput(query, principal, requestId);
  if (common.error) return common.error;
  let search = null;
  if (pathname === "/api/vault/search") {
    search = searchInput(query, common, requestId);
    if (search.error) return search.error;
  }
  try {
    const capabilities = await provider.resolveCapabilities({
      ...common.binding,
      request_id: capabilityRequestId(requestId),
    });
    if (capabilities?.authoritative !== true
        || capabilities?.provider_state !== "ready"
        || capabilities?.tenant_binding_state !== "bound"
        || capabilities?.user_binding_state !== "bound") {
      return errorResponse(503, requestId, "VAULT_READ_PROVIDER_UNAVAILABLE", common.auditHintRef);
    }
    if (capabilities.capabilities?.read !== true) {
      return errorResponse(403, requestId, "VAULT_CAPABILITY_NOT_GRANTED", common.auditHintRef);
    }
    const base = {
      principal: common.binding,
      lawos_matter_id: common.matterId,
      page: common.page,
      page_size: common.pageSize,
    };
    const result = search
      ? await provider.searchDocuments({
          ...base,
          query: search.normalizedQuery,
          current_version_only: true,
          date_from: search.dateFrom,
          date_to: search.dateTo,
        })
      : await provider.listDocuments(base);
    const authority = providerAuthority(result);
    const items = Object.freeze([...result.items]);
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "passed",
        items,
        page_info: Object.freeze(search
          ? {
              query: search.normalizedQuery,
              returned_count: items.length,
              omitted_result_count: null,
              current_version_only: true,
              date_from: search.dateFrom,
              date_to: search.dateTo,
              page: common.page,
              page_size: common.pageSize,
              search_backend: "amic-vault-authoritative",
              body_text_indexed: items.some((item) => item.match_fields.includes("body_text")),
              ocr_index_mode: "vault-authoritative",
              ocr_runtime_executed: false,
              authority: result.authority_ref,
              provider_revision: result.provider_revision,
            }
          : {
              returned_count: items.length,
              omitted_document_count: null,
              registered_account_count: null,
              page: common.page,
              page_size: common.pageSize,
              authority: result.authority_ref,
              provider_revision: result.provider_revision,
            }),
        provider_authority: authority,
        safe_error_codes: Object.freeze([]),
        audit_hint_ref: common.auditHintRef,
        ui_state: items.length === 0 ? "empty" : null,
        count_leak_prevented: true,
        raw_bytes_included: false,
        storage_locator_returned: false,
        local_dms_read_used: false,
        production_ready_claim: false,
      }),
    });
  } catch (error) {
    return providerError(error, requestId, common.auditHintRef);
  }
}
