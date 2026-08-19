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
    "GET /api/desktop/installations/:installation_id",
  ]),
  public_transition_authority: "reference-bound-verifier-finalize-only",
  direct_authorization_body_accepted: false,
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
const INSTALLATION_STATES = new Set(["active", "expired", "retired"]);
const POSTGRES_UTC_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/u;
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

function samePrincipal(left, right) {
  return Boolean(
    left
      && right
      && left.tenant_id === right.tenant_id
      && left.user_id === right.user_id
      && left.entra_subject_id === right.entra_subject_id,
  );
}

export function evaluateOutlookDesktopLifecycleAuthority({
  principal,
  context,
  roster,
  targetId,
}) {
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

export function resolveOutlookDesktopInstallationService(runtime) {
  return runtime?.installation_service ?? null;
}

function boundedInstallation(value, expectedInstallationId) {
  const canonicalTimestamp = (candidate) => {
    const match = typeof candidate === "string"
      ? candidate.match(POSTGRES_UTC_TIMESTAMP)
      : null;
    const milliseconds = match ? Date.parse(candidate) : NaN;
    if (!match || !Number.isSafeInteger(milliseconds)) {
      throw new Error("outlook desktop service projection is invalid");
    }
    const normalized = new Date(milliseconds).toISOString();
    const inputSeconds = `${match[1]}-${match[2]}-${match[3]}`
      + `T${match[4]}:${match[5]}:${match[6]}`;
    if (normalized.slice(0, 19) !== inputSeconds) {
      throw new Error("outlook desktop service projection is invalid");
    }
    return normalized;
  };
  const leaseExpiresAt = canonicalTimestamp(value?.lease_expires_at);
  const retiredAt = value?.retired_at === null
    ? null
    : canonicalTimestamp(value?.retired_at);
  if (
    !isPlainObject(value)
    || !INSTALLATION_ID_PATTERN.test(value.installation_id ?? "")
    || value.installation_id !== expectedInstallationId
    || !INSTALLATION_STATES.has(value.status)
    || !Number.isSafeInteger(value.state_version)
    || value.state_version < 1
    || (value.status === "retired") !== (retiredAt !== null)
  ) {
    throw new Error("outlook desktop service projection is invalid");
  }
  return Object.freeze({
    installation_id: value.installation_id,
    status: value.status,
    state_version: value.state_version,
    lease_expires_at: leaseExpiresAt,
    retired_at: retiredAt,
  });
}

export function projectOutlookDesktopRegistrationAuthorityResult(
  envelope,
  expectedInstallationId,
) {
  if (
    !isPlainObject(envelope)
    || envelope.response_status !== 201
    || !isPlainObject(envelope.body)
    || envelope.body.outcome !== "registered"
  ) {
    throw new Error("outlook desktop service response is invalid");
  }
  return Object.freeze({
    response_status: 201,
    outcome: envelope.body.outcome,
    installation: boundedInstallation(
      envelope.body.installation,
      expectedInstallationId,
    ),
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
    : 503;
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
  if (matched.operation !== "read") {
    return failure(
      400,
      requestId,
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
    );
  }
  const authority = evaluateOutlookDesktopLifecycleAuthority({
    principal,
    context,
    roster: runtime?.entitlement_roster,
    targetId: matched.installation_id,
  });
  if (!authority.allowed) {
    return failure(authority.status, requestId, authority.safe_error_code);
  }
  const service = resolveOutlookDesktopInstallationService(runtime);
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
        installation: boundedInstallation(
          installation,
          matched.installation_id,
        ),
      });
    } catch (error) {
      return mappedFailure(error, requestId);
    }
  }
}
