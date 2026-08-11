import {
  evaluateOutlookDesktopEntitlement,
} from "./outlook-desktop-entitlement.js";
import { evaluateRouteDecision } from "./permission-gate.js";

export const OUTLOOK_DESKTOP_INSTALLATION_MAX_BODY_BYTES = 8 * 1024;
export const OUTLOOK_DESKTOP_INSTALLATION_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "outlook-desktop-installation",
  contract_schema_version:
    "lawos.outlook-desktop-installation-runtime.v1",
  endpoints: Object.freeze([
    "POST /api/desktop/installations",
    "GET /api/desktop/installations/:installation_id",
    "POST /api/desktop/installations/:installation_id/heartbeat",
    "POST /api/desktop/installations/:installation_id/retire",
  ]),
  runtime_persistence: "postgres-tenant-rls",
  user_connection_revoke_on_retire: false,
  token_material_returned: false,
  production_ready_claim: false,
  fail_closed: true,
});

const INSTALLATION_ID_PATTERN = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const ROUTE_PATTERN =
  /^\/api\/desktop\/installations\/(odi_[A-Za-z0-9_-]{20,128})\/(heartbeat|retire)$/u;
const READ_ROUTE_PATTERN =
  /^\/api\/desktop\/installations\/(odi_[A-Za-z0-9_-]{20,128})$/u;
const REGISTRATION_PATH = "/api/desktop/installations";
const PROOF_FIELDS = Object.freeze([
  "expires_at",
  "idempotency_key",
  "issued_at",
  "nonce",
  "signature",
]);
const SEMANTIC_FIELDS = Object.freeze({
  register: Object.freeze([
    "app_version",
    "device_public_key",
    "platform",
    "source_sha",
  ]),
  heartbeat: Object.freeze(["expected_state_version"]),
  retire: Object.freeze(["expected_state_version", "retire_reason"]),
});
const SUCCESS_OUTCOMES = new Set([
  "registered",
  "heartbeat",
  "resumed",
  "retired",
  "already_retired",
]);
const INSTALLATION_STATES = new Set(["active", "expired", "retired"]);
const PUBLIC_ERROR_CODE_PATTERN = /^(?:AUTH_SESSION_REQUIRED|OUTLOOK_DESKTOP_[A-Z0-9_]+|POSTGRES_[A-Z0-9_]+)$/u;
const PUBLIC_ERROR_STATUSES = new Set([400, 401, 403, 404, 409, 413, 503]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function response(status, requestId, {
  outcome = "blocked",
  safeErrorCodes = [],
  installation,
} = {}) {
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: String(requestId ?? "request-outlook-desktop"),
      outcome,
      ...(installation === undefined ? {} : { installation }),
      safe_error_codes: Object.freeze([...safeErrorCodes]),
      token_material_returned: false,
      production_ready_claim: false,
    }),
  });
}

function failure(status, requestId, safeErrorCode) {
  return response(status, requestId, {
    safeErrorCodes: [safeErrorCode],
  });
}

function route(pathname) {
  if (pathname === REGISTRATION_PATH) {
    return Object.freeze({
      operation: "register",
      installation_id: "NEW",
    });
  }
  const match = typeof pathname === "string" ? pathname.match(ROUTE_PATTERN) : null;
  if (match) {
    return Object.freeze({
      operation: match[2],
      installation_id: match[1],
    });
  }
  const readMatch = typeof pathname === "string"
    ? pathname.match(READ_ROUTE_PATTERN)
    : null;
  return readMatch ? Object.freeze({
    operation: "read",
    installation_id: readMatch[1],
  }) : null;
}

export function isOutlookDesktopInstallationApiPath(pathname) {
  return route(pathname) !== null;
}

export function isOutlookDesktopInstallationId(value) {
  return typeof value === "string" && INSTALLATION_ID_PATTERN.test(value);
}

function exactFields(value, expected) {
  return isPlainObject(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...expected].sort());
}

function requestBodyBytes(body) {
  try {
    return Buffer.byteLength(JSON.stringify(body), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function proofValue(body, field, maxLength) {
  const value = body[field];
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength;
}

function validEnvelope(operation, body) {
  const semanticFields = SEMANTIC_FIELDS[operation];
  const expected = [...semanticFields, ...PROOF_FIELDS];
  if (!exactFields(body, expected)) return false;
  if (
    !proofValue(body, "idempotency_key", 200)
    || !proofValue(body, "nonce", 128)
    || !proofValue(body, "issued_at", 32)
    || !proofValue(body, "expires_at", 32)
    || !proofValue(body, "signature", 256)
  ) return false;
  if (operation === "register") {
    return proofValue(body, "platform", 32)
      && proofValue(body, "app_version", 64)
      && proofValue(body, "source_sha", 64)
      && proofValue(body, "device_public_key", 512);
  }
  if (
    !Number.isSafeInteger(body.expected_state_version)
    || body.expected_state_version < 1
  ) return false;
  return operation !== "retire" || proofValue(body, "retire_reason", 100);
}

function samePrincipal(left, right) {
  return Boolean(
    left
      && right
      && left.tenant_id === right.tenant_id
      && left.user_id === right.user_id
      && left.entra_subject_id === right.entra_subject_id,
  );
}

function lifecycleAuthority({ principal, context, roster, targetId }) {
  const entitlement = evaluateOutlookDesktopEntitlement({
    principal,
    roster,
  });
  if (!entitlement.eligible) {
    return Object.freeze({
      allowed: false,
      status: entitlement.status === "unknown" ? 503 : 403,
      safe_error_code: entitlement.safe_error_code,
    });
  }
  if (!samePrincipal(principal, context?.principal)) {
    return Object.freeze({
      allowed: false,
      status: 403,
      safe_error_code: "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
    });
  }
  const permission = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: principal.tenant_id,
      resource_type: "OutlookDesktopInstallation",
      resource_id: targetId,
    },
    action: "outlook:connection:manage",
  });
  return permission.effect === "allow"
    ? Object.freeze({ allowed: true, status: 200, safe_error_code: null })
    : Object.freeze({
        allowed: false,
        status: 403,
        safe_error_code: "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
      });
}

function commandFor({ pathname, operation, installationId, body, principal, requestId }) {
  const semanticBody = Object.fromEntries(
    SEMANTIC_FIELDS[operation].map((field) => [field, body[field]]),
  );
  return Object.freeze({
    principal: Object.freeze({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
    }),
    request_id: requestId,
    request: Object.freeze({
      method: "POST",
      path: pathname,
      body: Object.freeze(semanticBody),
      installation_id: installationId,
      idempotency_key: body.idempotency_key,
      nonce: body.nonce,
      issued_at: body.issued_at,
      expires_at: body.expires_at,
    }),
    signature: body.signature,
  });
}

export async function resolveOutlookDesktopInstallationService(
  runtime,
  tenantId,
) {
  if (runtime?.installation_service) return runtime.installation_service;
  if (typeof runtime?.installation_service_factory === "function") {
    return runtime.installation_service_factory({ tenant_id: tenantId });
  }
  return null;
}

function boundedInstallation(value) {
  if (
    !isPlainObject(value)
    || !INSTALLATION_ID_PATTERN.test(value.installation_id ?? "")
    || !INSTALLATION_STATES.has(value.status)
    || !Number.isSafeInteger(value.state_version)
    || value.state_version < 1
    || typeof value.lease_expires_at !== "string"
    || !(
      value.retired_at === null
      || typeof value.retired_at === "string"
    )
  ) {
    throw new Error("outlook desktop service projection is invalid");
  }
  return Object.freeze({
    installation_id: value.installation_id,
    status: value.status,
    state_version: value.state_version,
    lease_expires_at: value.lease_expires_at,
    retired_at: value.retired_at,
  });
}

function boundedSuccess(envelope, requestId) {
  if (
    !isPlainObject(envelope)
    || !new Set([200, 201]).has(envelope.response_status)
    || !isPlainObject(envelope.body)
    || !SUCCESS_OUTCOMES.has(envelope.body.outcome)
  ) {
    throw new Error("outlook desktop service response is invalid");
  }
  return response(envelope.response_status, requestId, {
    outcome: envelope.body.outcome,
    installation: boundedInstallation(envelope.body.installation),
  });
}

function mappedFailure(error, requestId) {
  const candidateCode = String(error?.safe_error_code ?? "");
  const safeErrorCode = PUBLIC_ERROR_CODE_PATTERN.test(candidateCode)
    ? candidateCode
    : "OUTLOOK_DESKTOP_INSTALLATION_FAILED";
  const candidateStatus = Number(error?.status);
  const status = PUBLIC_ERROR_STATUSES.has(candidateStatus)
    ? candidateStatus
    : 500;
  return failure(status, requestId, safeErrorCode);
}

export function mapOutlookDesktopInstallationRequestBodyError(
  error,
  requestId,
) {
  return error?.status === 413
    ? failure(
        413,
        requestId,
        "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_TOO_LARGE",
      )
    : failure(
        400,
        requestId,
        "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
      );
}

export async function handleOutlookDesktopInstallationApiRequest({
  pathname,
  method,
  body = {},
  principal,
  context,
  requestId,
  runtime,
} = {}) {
  const matched = route(pathname);
  if (!matched) {
    return failure(
      404,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_NOT_FOUND",
    );
  }
  const expectedMethod = matched.operation === "read" ? "GET" : "POST";
  if (method !== expectedMethod) {
    return failure(
      405,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_METHOD_NOT_ALLOWED",
    );
  }
  if (!principal) return failure(401, requestId, "AUTH_SESSION_REQUIRED");
  if (matched.operation === "read" && !exactFields(body, [])) {
    return failure(
      400,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
    );
  }
  if (requestBodyBytes(body) > OUTLOOK_DESKTOP_INSTALLATION_MAX_BODY_BYTES) {
    return failure(
      413,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_TOO_LARGE",
    );
  }
  if (matched.operation !== "read" && !validEnvelope(matched.operation, body)) {
    return failure(
      400,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
    );
  }
  const authority = lifecycleAuthority({
    principal,
    context,
    roster: runtime?.entitlement_roster,
    targetId: matched.installation_id,
  });
  if (!authority.allowed) {
    return failure(authority.status, requestId, authority.safe_error_code);
  }
  const service = await resolveOutlookDesktopInstallationService(
    runtime,
    principal.tenant_id,
  );
  if (!service || typeof service[matched.operation] !== "function") {
    return failure(
      503,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
    );
  }
  if (matched.operation === "read") {
    try {
      const installation = await service.read({
        principal: Object.freeze({
          tenant_id: principal.tenant_id,
          user_id: principal.user_id,
          entra_subject_id: principal.entra_subject_id,
        }),
        installation_id: matched.installation_id,
      }, {
        authorize: async () => lifecycleAuthority({
          principal,
          context,
          roster: runtime?.entitlement_roster,
          targetId: matched.installation_id,
        }).allowed,
      });
      if (!installation) {
        return failure(
          404,
          requestId,
          "OUTLOOK_DESKTOP_INSTALLATION_NOT_FOUND",
        );
      }
      return response(200, requestId, {
        outcome: "read",
        installation: boundedInstallation(installation),
      });
    } catch (error) {
      return mappedFailure(error, requestId);
    }
  }
  const command = commandFor({
    pathname,
    operation: matched.operation,
    installationId: matched.installation_id,
    body,
    principal,
    requestId,
  });
  try {
    const result = await service[matched.operation](command, {
      authorize: async () => lifecycleAuthority({
        principal,
        context,
        roster: runtime?.entitlement_roster,
        targetId: matched.installation_id,
      }).allowed,
    });
    return boundedSuccess(result, requestId);
  } catch (error) {
    return mappedFailure(error, requestId);
  }
}
