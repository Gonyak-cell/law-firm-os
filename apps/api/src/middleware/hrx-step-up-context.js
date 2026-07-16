import { evaluateHrxStepUp } from "./hrx-step-up.js";
import { createHrxStepUpAuthority } from "../hrx-step-up-token.js";

export const HRX_STEP_UP_CONTEXT_HEADER = "x-lawos-hrx-step-up";
const DEFAULT_HRX_STEP_UP_AUTHORITY = createHrxStepUpAuthority();

function headerValue(headers = {}, name) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
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

export function parseHrxStepUpContext(headers = {}, { verifier = DEFAULT_HRX_STEP_UP_AUTHORITY } = {}) {
  const value = headerValue(headers, HRX_STEP_UP_CONTEXT_HEADER);
  if (!value.trim()) {
    return Object.freeze({ ok: false, token: null, reason: "hrx_step_up_context_absent" });
  }
  const verified = verifier.verify(value);
  if (!verified.ok) {
    return Object.freeze({ ok: false, token: null, reason: verified.reason ?? "hrx_step_up_token_invalid" });
  }
  return Object.freeze({ ok: true, token: verified.token, source: verified.source ?? "signed_step_up_token" });
}

export function authorizeHrxStepUpRequest({ action, context = {}, headers = {}, now, verifier = DEFAULT_HRX_STEP_UP_AUTHORITY } = {}) {
  const parsed = parseHrxStepUpContext(headers, { verifier });
  const decision = evaluateHrxStepUp({
    action,
    context,
    token: parsed.ok ? parsed.token : null,
    now: now ?? verifier.nowIso?.(),
  });
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
