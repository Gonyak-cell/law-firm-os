import { createHash } from "node:crypto";

export const PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH = "/api/hrx/payroll/provider-callbacks/statement-delivery";
export const PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER = "x-lawos-provider-tenant-id";
export const PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY = Object.freeze({
  id: "hrx.payroll.statement.provider_callback",
  method: "POST",
  pathname: PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH,
  action: "hrx.payroll.statement.provider_event.ingest",
  sensitivity: "payroll",
  authentication: "provider_signature",
  tenant_source: "verified_signature_claim",
  raw_payload_persisted: false,
  denied_audit_required: true,
  denied_audit_failure: "fail_closed_before_mutation",
  fail_closed: true,
});
export const PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION =
  "hrx.payroll.statement.provider_callback.denied";

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
    error.safe_error_code = "HRX_PAYROLL_PROVIDER_EVENT_INVALID";
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

function blockedResponse(status, safeErrorCode, requestId) {
  return response(status, {
    request_id: requestId,
    outcome: "blocked",
    safe_error_code: safeErrorCode,
    fail_closed: true,
    production_ready_claim: false,
  });
}

function identifierHash(kind, value) {
  if (typeof value !== "string" || !value.trim()) return null;
  return createHash("sha256").update(`${kind}\0${value.trim()}`).digest("hex");
}

function deniedAuditEvent({ headers, body, verified, requestId, safeErrorCode }) {
  const event = body?.event ?? body ?? {};
  return Object.freeze({
    action: PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
    policy_id: PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY.id,
    request_id: requestId,
    outcome: "denied",
    safe_error_code: safeErrorCode,
    claimed_tenant_identifier_hash: identifierHash(
      "claimed_tenant",
      headerValue(headers, PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER),
    ),
    verified_tenant_identifier_hash: identifierHash("verified_tenant", verified?.tenant_id),
    provider_identifier_hash: identifierHash("provider", verified?.provider_id),
    provider_event_identifier_hash: identifierHash("provider_event", event?.provider_event_id),
    provider_receipt_identifier_hash: identifierHash("provider_receipt", event?.provider_receipt_ref),
    raw_payload_included: false,
    payroll_amounts_included: false,
    employee_identifier_included: false,
    mutation_applied: false,
  });
}

async function appendDeniedAudit(audit, event) {
  const append = typeof audit === "function"
    ? audit
    : typeof audit?.appendDenied === "function"
      ? audit.appendDenied.bind(audit)
      : typeof audit?.append === "function"
        ? audit.append.bind(audit)
        : null;
  if (!append) throw new TypeError("Payroll provider denied audit sink is required");
  await append(event);
}

async function deny({
  audit,
  headers,
  body,
  verified,
  requestId,
  status,
  safeErrorCode,
}) {
  try {
    await appendDeniedAudit(audit, deniedAuditEvent({
      headers,
      body,
      verified,
      requestId,
      safeErrorCode,
    }));
  } catch {
    return blockedResponse(
      503,
      "HRX_PAYROLL_PROVIDER_AUDIT_UNAVAILABLE",
      requestId,
    );
  }
  return blockedResponse(status, safeErrorCode, requestId);
}

export async function denyPayrollStatementProviderCallback({
  audit,
  headers = {},
  body = {},
  requestId,
  status,
  safeErrorCode,
} = {}) {
  return deny({
    audit,
    headers,
    body,
    requestId,
    status,
    safeErrorCode,
  });
}

export function isPayrollStatementProviderCallback(method, pathname) {
  return String(method ?? "").toUpperCase() === PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY.method
    && pathname === PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH;
}

async function verifyClaims({
  headers = {},
  body = {},
  verified,
  audit,
  requestId,
}) {
  const claimedTenantId = headerValue(headers, PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER);
  if (!claimedTenantId) {
    return {
      ok: false,
      response: await deny({
        audit,
        headers,
        body,
        verified,
        requestId,
        status: 400,
        safeErrorCode: "HRX_PAYROLL_PROVIDER_TENANT_REQUIRED",
      }),
    };
  }
  try {
    const verifiedTenantId = requiredString(verified, "tenant_id");
    const verifiedProviderId = requiredString(verified, "provider_id");
    const bodyTenantId = requiredString(body, "tenant_id");
    if (claimedTenantId !== verifiedTenantId || bodyTenantId !== verifiedTenantId) {
      return {
        ok: false,
        response: await deny({
          audit,
          headers,
          body,
          verified: { tenant_id: verifiedTenantId, provider_id: verifiedProviderId },
          requestId,
          status: 403,
          safeErrorCode: "HRX_PAYROLL_PROVIDER_TENANT_MISMATCH",
        }),
      };
    }
    return {
      ok: true,
      verified: Object.freeze({
        tenant_id: verifiedTenantId,
        provider_id: verifiedProviderId,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      response: await deny({
        audit,
        headers,
        body,
        verified,
        requestId,
        status: Number.isInteger(error?.status) ? error.status : 400,
        safeErrorCode: error?.safe_error_code ?? "HRX_PAYROLL_PROVIDER_EVENT_INVALID",
      }),
    };
  }
}

export async function verifyPayrollStatementProviderCallback({
  headers = {},
  body = {},
  rawBody = null,
  verifier,
  audit,
  requestId,
} = {}) {
  const claimedTenantId = headerValue(headers, PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER);
  if (!claimedTenantId) {
    return Object.freeze({
      ok: false,
      response: await deny({
        audit,
        headers,
        body,
        requestId,
        status: 400,
        safeErrorCode: "HRX_PAYROLL_PROVIDER_TENANT_REQUIRED",
      }),
    });
  }
  if (typeof verifier?.verify !== "function") {
    return Object.freeze({
      ok: false,
      response: await deny({
        audit,
        headers,
        body,
        requestId,
        status: 503,
        safeErrorCode: "HRX_PAYROLL_PROVIDER_VERIFIER_REQUIRED",
      }),
    });
  }

  let verified;
  try {
    verified = await verifier.verify({
      policy: PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY,
      headers,
      body,
      raw_body: rawBody,
      request_id: requestId,
    });
  } catch {
    verified = null;
  }
  if (verified?.ok !== true) {
    return Object.freeze({
      ok: false,
      response: await deny({
        audit,
        headers,
        body,
        requestId,
        status: 401,
        safeErrorCode: "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID",
      }),
    });
  }

  const claims = await verifyClaims({
    headers,
    body,
    verified,
    audit,
    requestId,
  });
  return Object.freeze(claims);
}

export async function handlePayrollStatementProviderCallback({
  headers = {},
  body = {},
  rawBody = null,
  runtime,
  verifier,
  audit,
  verified = null,
  requestId,
} = {}) {
  const authorization = verified
    ? await verifyClaims({
        headers,
        body,
        verified: verified?.verified ?? verified,
        audit,
        requestId,
      })
    : await verifyPayrollStatementProviderCallback({
        headers,
        body,
        rawBody,
        verifier,
        audit,
        requestId,
      });
  if (!authorization.ok) return authorization.response;

  if (!runtime?.payrollRuntime?.documentService) {
    return blockedResponse(
      503,
      "HRX_PAYROLL_RUNTIME_UNAVAILABLE",
      requestId,
    );
  }

  const verifiedIdentity = authorization.verified;
  try {
    const event = body.event ?? body;
    const result = await runtime.payrollRuntime.documentService.ingestProviderStatus(
      {
        tenant_id: verifiedIdentity.tenant_id,
        actor_id: `provider:${verifiedIdentity.provider_id}`,
      },
      {
        provider_event_id: requiredString(event, "provider_event_id"),
        provider_id: verifiedIdentity.provider_id,
        provider_receipt_ref: requiredString(event, "provider_receipt_ref"),
        provider_event_state: requiredString(event, "provider_event_state"),
        event_occurred_at: requiredString(event, "event_occurred_at"),
        payload_hash: payloadHash(rawBody, body),
      },
    );
    return response(200, {
      request_id: requestId,
      ...result,
    });
  } catch (error) {
    return deny({
      audit,
      headers,
      body,
      verified: verifiedIdentity,
      requestId,
      status: Number.isInteger(error?.status) ? error.status : 503,
      safeErrorCode: error?.safe_error_code ?? "HRX_PAYROLL_PROVIDER_CALLBACK_UNAVAILABLE",
    });
  }
}
