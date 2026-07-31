import { createHash } from "node:crypto";

export const LEAVE_PROVIDER_CALLBACK_PATH = "/api/hrx/leave/provider-callbacks/delivery";
export const LEAVE_PROVIDER_TENANT_HEADER = "x-lawos-provider-tenant-id";
export const LEAVE_PROVIDER_CALLBACK_POLICY = Object.freeze({
  id: "hrx.leave.integration.provider_callback",
  method: "POST",
  pathname: LEAVE_PROVIDER_CALLBACK_PATH,
  action: "hrx.leave.integration.provider_event.ingest",
  sensitivity: "leave",
  authentication: "provider_signature",
  tenant_source: "verified_signature_claim",
  raw_payload_persisted: false,
  fail_closed: true,
});

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function headerValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) {
    const error = new TypeError(`${field} is required`);
    error.safe_error_code = "HRX_LEAVE_PROVIDER_EVENT_INVALID";
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function payloadHash(rawBody, body) {
  const bytes = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(JSON.stringify(body ?? {}), "utf8");
  return createHash("sha256").update(bytes).digest("hex");
}

function safeError(error, requestId) {
  const status = Number.isInteger(error?.status) ? error.status : 503;
  return response(status, {
    request_id: requestId,
    outcome: "blocked",
    safe_error_code: error?.safe_error_code ?? "HRX_LEAVE_PROVIDER_CALLBACK_UNAVAILABLE",
    fail_closed: true,
    production_ready_claim: false,
  });
}

export function isLeaveProviderCallback(method, pathname) {
  return String(method ?? "").toUpperCase() === LEAVE_PROVIDER_CALLBACK_POLICY.method
    && pathname === LEAVE_PROVIDER_CALLBACK_PATH;
}

export async function handleLeaveProviderCallback({
  headers = {},
  body = {},
  rawBody = null,
  runtime,
  verifier,
  requestId,
} = {}) {
  const claimedTenantId = headerValue(headers, LEAVE_PROVIDER_TENANT_HEADER);
  if (!claimedTenantId) {
    return response(400, {
      request_id: requestId,
      outcome: "blocked",
      safe_error_code: "HRX_LEAVE_PROVIDER_TENANT_REQUIRED",
      fail_closed: true,
      production_ready_claim: false,
    });
  }
  if (!runtime?.leaveIntegrationService?.applyProviderEvent) {
    return response(503, {
      request_id: requestId,
      outcome: "blocked",
      safe_error_code: "HRX_LEAVE_INTEGRATION_RUNTIME_UNAVAILABLE",
      fail_closed: true,
      production_ready_claim: false,
    });
  }
  if (typeof verifier?.verify !== "function") {
    return response(503, {
      request_id: requestId,
      outcome: "blocked",
      safe_error_code: "HRX_LEAVE_PROVIDER_VERIFIER_REQUIRED",
      fail_closed: true,
      production_ready_claim: false,
    });
  }

  let verified;
  try {
    verified = await verifier.verify({
      policy: LEAVE_PROVIDER_CALLBACK_POLICY,
      headers,
      body,
      raw_body: rawBody,
      request_id: requestId,
    });
  } catch {
    verified = null;
  }
  if (verified?.ok !== true) {
    return response(401, {
      request_id: requestId,
      outcome: "blocked",
      safe_error_code: "HRX_LEAVE_PROVIDER_SIGNATURE_INVALID",
      fail_closed: true,
      production_ready_claim: false,
    });
  }

  try {
    const verifiedTenantId = requiredString(verified, "tenant_id");
    const verifiedProviderId = requiredString(verified, "provider_id");
    const bodyTenantId = requiredString(body, "tenant_id");
    if (claimedTenantId !== verifiedTenantId || bodyTenantId !== verifiedTenantId) {
      return response(403, {
        request_id: requestId,
        outcome: "blocked",
        safe_error_code: "HRX_LEAVE_PROVIDER_TENANT_MISMATCH",
        fail_closed: true,
        production_ready_claim: false,
      });
    }
    const event = body.event ?? body;
    const result = runtime.leaveIntegrationService.applyProviderEvent(
      {
        tenant_id: verifiedTenantId,
        actor_id: `provider:${verifiedProviderId}`,
      },
      {
        provider_event_id: requiredString(event, "provider_event_id"),
        provider_id: verifiedProviderId,
        provider_receipt_ref: requiredString(event, "provider_receipt_ref"),
        provider_event_state: requiredString(event, "provider_event_state"),
        event_occurred_at: requiredString(event, "event_occurred_at"),
        payload_hash: payloadHash(rawBody, body),
        ...(event.error_code ? { error_code: requiredString(event, "error_code") } : {}),
      },
    );
    return response(200, {
      request_id: requestId,
      ...result,
    });
  } catch (error) {
    return safeError(error, requestId);
  }
}
