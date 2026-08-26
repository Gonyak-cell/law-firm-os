import { types } from "node:util";

import {
  evaluateOutlookDesktopEntitlement,
} from "./outlook-desktop-entitlement.js";
import {
  resolveOutlookDesktopInstallationService,
} from "./outlook-desktop-installation-runtime-context.js";
import {
  OUTLOOK_INSTALLATION_ROUTE_CLASSES,
  classifyOutlookInstallationRoute,
} from "./outlook-installation-route-policy.js";
import {
  parseOutlookTrustedCurrentInstallation,
} from "./outlook-trusted-current-installation.js";

export const OUTLOOK_INSTALLATION_GUARD_ERROR_CODES = Object.freeze({
  routePolicyRequired: "OUTLOOK_INSTALLATION_ROUTE_POLICY_REQUIRED",
  identityBindingRequired: "OUTLOOK_DESKTOP_IDENTITY_BINDING_REQUIRED",
  bindingMismatch: "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
  trustedInstallationRequired: "OUTLOOK_DESKTOP_TRUSTED_INSTALLATION_REQUIRED",
  runtimeUnavailable: "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
});

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;

function dataValue(record, key) {
  if (!record || typeof record !== "object" || types.isProxy(record)) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    return descriptor && Object.hasOwn(descriptor, "value")
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

function identifier(record, key) {
  const value = dataValue(record, key);
  return typeof value === "string" && IDENTIFIER.test(value)
    ? value
    : null;
}

function scopeSnapshot(principal) {
  const value = dataValue(principal, "scopes");
  if (!Array.isArray(value) || types.isProxy(value)) return null;
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    return null;
  }
  const length = descriptors.length?.value;
  if (!Number.isSafeInteger(length) || length < 0
      || Reflect.ownKeys(descriptors).length !== length + 1) return null;
  const scopes = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !Object.hasOwn(descriptor, "value")
        || typeof descriptor.value !== "string") return null;
    scopes.push(descriptor.value);
  }
  return Object.freeze(scopes);
}

function principalSnapshot(principal, { includeScopes = false } = {}) {
  const tenantId = identifier(principal, "tenant_id");
  const userId = identifier(principal, "user_id");
  const subjectId = identifier(principal, "entra_subject_id");
  const scopes = includeScopes ? scopeSnapshot(principal) : Object.freeze([]);
  if (!tenantId || !userId || !subjectId || scopes === null) return null;
  return Object.freeze({
    tenant_id: tenantId,
    user_id: userId,
    entra_subject_id: subjectId,
    ...(includeScopes ? { scopes } : {}),
  });
}

function blocked(policy, status, safeErrorCode) {
  return Object.freeze({
    allowed: false,
    status,
    safe_error_code: safeErrorCode,
    classification: policy.classification,
    policy_id: policy.policy_id ?? null,
    installation: null,
    fail_closed: true,
  });
}

function allowed(policy, installation = null, authoritySnapshotAt = null) {
  return Object.freeze({
    allowed: true,
    status: 200,
    safe_error_code: null,
    classification: policy.classification,
    policy_id: policy.policy_id ?? null,
    installation,
    authority_snapshot_at: authoritySnapshotAt,
    fail_closed: true,
  });
}

function protectedPolicy(policy) {
  return policy.requires_active_installation === true;
}

function serviceMethod(runtime) {
  let service;
  try {
    service = resolveOutlookDesktopInstallationService(runtime);
    if (!service || typeof service !== "object" || types.isProxy(service)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(service, "readTrustedCurrent");
    if (!descriptor || !Object.hasOwn(descriptor, "value")
        || typeof descriptor.value !== "function") return null;
    return Object.freeze({ service, readTrustedCurrent: descriptor.value });
  } catch {
    return null;
  }
}

export async function authorizeOutlookInstallationProtectedRoute({
  method,
  pathname,
  principal,
  context,
  runtime,
} = {}) {
  const policy = classifyOutlookInstallationRoute(method, pathname);
  if (policy.classification === OUTLOOK_INSTALLATION_ROUTE_CLASSES.notApplicable) {
    return allowed(policy);
  }
  if (!policy.known) {
    return blocked(
      policy,
      404,
      OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.routePolicyRequired,
    );
  }
  if (!protectedPolicy(policy)) return allowed(policy);

  const signedPrincipal = principalSnapshot(principal, { includeScopes: true });
  const permissionPrincipal = principalSnapshot(dataValue(context, "principal"));
  if (!signedPrincipal || !permissionPrincipal) {
    return blocked(
      policy,
      403,
      OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.identityBindingRequired,
    );
  }
  if (signedPrincipal.tenant_id !== permissionPrincipal.tenant_id
      || signedPrincipal.user_id !== permissionPrincipal.user_id
      || signedPrincipal.entra_subject_id !== permissionPrincipal.entra_subject_id) {
    return blocked(
      policy,
      403,
      OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.bindingMismatch,
    );
  }

  let entitlement;
  try {
    entitlement = evaluateOutlookDesktopEntitlement({
      principal: signedPrincipal,
      roster: dataValue(runtime, "entitlement_roster"),
    });
  } catch {
    entitlement = null;
  }
  if (!entitlement?.eligible) {
    return blocked(
      policy,
      entitlement?.status === "disabled" ? 403 : 503,
      typeof entitlement?.safe_error_code === "string"
        ? entitlement.safe_error_code
        : OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.runtimeUnavailable,
    );
  }

  const authority = serviceMethod(runtime);
  if (!authority) {
    return blocked(
      policy,
      503,
      OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.runtimeUnavailable,
    );
  }
  const authorityPrincipal = Object.freeze({
    tenant_id: signedPrincipal.tenant_id,
    user_id: signedPrincipal.user_id,
    entra_subject_id: signedPrincipal.entra_subject_id,
  });
  let trusted;
  try {
    const result = await Reflect.apply(
      authority.readTrustedCurrent,
      authority.service,
      [Object.freeze({ principal: authorityPrincipal })],
    );
    trusted = parseOutlookTrustedCurrentInstallation(result);
  } catch (error) {
    const mismatch = dataValue(error, "safe_error_code")
      === OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.bindingMismatch;
    return blocked(
      policy,
      mismatch ? 403 : 503,
      mismatch
        ? OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.bindingMismatch
        : OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.runtimeUnavailable,
    );
  }
  if (!trusted) {
    return blocked(
      policy,
      403,
      OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.trustedInstallationRequired,
    );
  }
  return allowed(
    policy,
    trusted.installation,
    trusted.authority_snapshot_at,
  );
}

export function outlookInstallationProtectedRouteResponse(decision, requestId) {
  if (decision?.allowed === true) return null;
  const status = [403, 404, 503].includes(decision?.status)
    ? decision.status
    : 503;
  const safeErrorCode = typeof decision?.safe_error_code === "string"
    && /^[A-Z0-9_]+$/u.test(decision.safe_error_code)
    ? decision.safe_error_code
    : OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.runtimeUnavailable;
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: String(requestId ?? "request-outlook-installation-guard"),
      outcome: "blocked",
      safe_error_codes: Object.freeze([safeErrorCode]),
      token_material_returned: false,
      production_ready_claim: false,
    }),
  });
}
