import { evaluateHrxStepUp } from "./hrx-step-up.js";

export const HRX_STEP_UP_CONTEXT_HEADER = "x-lawos-hrx-step-up";

function headerValue(headers = {}, name) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function parseJsonOrBase64(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  }
}

function blocked(status, safeErrorCode, reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status,
    body: Object.freeze({
      outcome: "blocked",
      safe_error_code: safeErrorCode,
      reason,
      ...extra,
    }),
  });
}

export function parseHrxStepUpContext(headers = {}) {
  const value = headerValue(headers, HRX_STEP_UP_CONTEXT_HEADER);
  if (!value.trim()) {
    return Object.freeze({ ok: false, token: null, reason: "hrx_step_up_context_absent" });
  }
  try {
    return Object.freeze({ ok: true, token: Object.freeze(parseJsonOrBase64(value)), source: "trusted_header" });
  } catch {
    return Object.freeze({ ok: false, token: null, reason: "hrx_step_up_context_malformed" });
  }
}

export function authorizeHrxStepUpRequest({ action, context = {}, headers = {}, now } = {}) {
  const parsed = parseHrxStepUpContext(headers);
  const decision = evaluateHrxStepUp({ action, context, token: parsed.ok ? parsed.token : null, now });
  if (decision.effect === "allow") {
    return Object.freeze({
      ok: true,
      status: 200,
      decision,
      token: parsed.ok ? parsed.token : null,
    });
  }
  return blocked(decision.status ?? 403, decision.safe_error_code ?? "HRX_STEP_UP_REQUIRED", parsed.ok ? decision.reason : parsed.reason, {
    step_up_required: true,
    fail_closed: true,
    action,
  });
}
