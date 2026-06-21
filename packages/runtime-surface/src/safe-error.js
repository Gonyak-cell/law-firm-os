export const RUNTIME_SURFACE_ERROR_CODES = Object.freeze({
  tenant_required: "RUNTIME_SURFACE_TENANT_REQUIRED",
  server_principal_required: "RUNTIME_SURFACE_SERVER_PRINCIPAL_REQUIRED",
  permission_context_required: "RUNTIME_SURFACE_PERMISSION_CONTEXT_REQUIRED",
  permission_denied: "RUNTIME_SURFACE_PERMISSION_DENIED",
  review_required: "RUNTIME_SURFACE_REVIEW_REQUIRED",
  validation_error: "RUNTIME_SURFACE_VALIDATION_ERROR",
  not_found: "RUNTIME_SURFACE_NOT_FOUND",
  feature_locked: "RUNTIME_SURFACE_FEATURE_LOCKED"
});

export function createRuntimeSurfaceResponse({
  outcome = "allowed",
  item = null,
  items = [],
  audit_event = null,
  safe_error_codes = [],
  ui_state = "data",
  status = 200,
  extra = {}
} = {}) {
  return Object.freeze({
    status,
    body: Object.freeze({
      outcome,
      item,
      items: Object.freeze([...(items ?? [])]),
      audit_event,
      safe_error_codes: Object.freeze([...safe_error_codes]),
      ui_state,
      count_leak_prevented: outcome !== "allowed",
      production_ready_claim: false,
      runtime_ready_candidate: false,
      ...extra
    })
  });
}

export function createRuntimeSurfaceError({ code, status = 403, ui_state = "denied", outcome = "denied", extra = {} } = {}) {
  return createRuntimeSurfaceResponse({
    outcome,
    status,
    ui_state,
    safe_error_codes: [code],
    items: [],
    extra
  });
}
