function normalizeScopes(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",");
  return [];
}

function hasScope(principal = {}, scope) {
  return normalizeScopes(principal.hrx_scopes).map((item) => item.trim()).includes(scope);
}

function hasFreshStepUp(stepUp = {}) {
  if (stepUp.mfa !== true) return false;
  if (!stepUp.expires_at) return true;
  return new Date(stepUp.expires_at).getTime() > Date.now();
}

export function authorizeHrxAnalyticsExport({ principal = {}, step_up, classification = "aggregate" } = {}) {
  const sensitive = classification !== "aggregate";
  if (!hasScope(principal, "hrx.analytics.read")) {
    return Object.freeze({
      effect: "deny",
      safe_error_code: "HRX_ANALYTICS_EXPORT_SCOPE_REQUIRED",
      required_scope: "hrx.analytics.read",
    });
  }
  if (sensitive && !hasScope(principal, "hrx.analytics.export")) {
    return Object.freeze({
      effect: "deny",
      safe_error_code: "HRX_ANALYTICS_EXPORT_SCOPE_REQUIRED",
      required_scope: "hrx.analytics.export",
    });
  }
  if (sensitive && !hasFreshStepUp(step_up)) {
    return Object.freeze({
      effect: "deny",
      safe_error_code: "HRX_ANALYTICS_EXPORT_STEP_UP_REQUIRED",
      required_step_up: true,
    });
  }
  return Object.freeze({
    effect: "allow",
    classification,
    export_policy: sensitive ? "sensitive_step_up_required" : "aggregate_only",
  });
}

export function createHrxAnalyticsExport(input = {}) {
  const analytics = input.analytics ?? {};
  if (analytics.row_level_details_included !== false) {
    throw new TypeError("HRX analytics export requires aggregate read model");
  }
  const decision = authorizeHrxAnalyticsExport(input);
  if (decision.effect !== "allow") {
    return Object.freeze({
      status: "blocked",
      ...decision,
    });
  }
  return Object.freeze({
    status: "ready",
    export_format: input.export_format ?? "json",
    export_policy: decision.export_policy,
    row_level_details_included: false,
    analytics,
  });
}
