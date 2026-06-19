export const TENANT_CONTEXT_HEADER = "x-lawos-tenant-id";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseTenantContext(headers = {}) {
  const tenantId = clean(headers[TENANT_CONTEXT_HEADER] ?? headers[TENANT_CONTEXT_HEADER.toLowerCase()]);
  if (!tenantId) {
    return Object.freeze({
      ok: false,
      status: 400,
      safe_error_code: "HRX_TENANT_CONTEXT_REQUIRED",
      fail_closed: true,
    });
  }
  return Object.freeze({
    ok: true,
    tenant_id: tenantId,
    source: "header",
    fail_closed: false,
  });
}

export function requireTenantContext(headers = {}) {
  const context = parseTenantContext(headers);
  if (!context.ok) {
    const error = new Error(context.safe_error_code);
    error.status = context.status;
    error.safe_error_code = context.safe_error_code;
    error.fail_closed = true;
    throw error;
  }
  return context;
}
