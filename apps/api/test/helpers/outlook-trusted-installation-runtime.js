import { createHash } from "node:crypto";

import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../../src/outlook-desktop-entitlement.js";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const ROSTER_SIZE = 10;

function digest(value, length = 24) {
  return createHash("sha256")
    .update(String(value))
    .digest("hex")
    .slice(0, length);
}

function identifier(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!IDENTIFIER.test(normalized)) {
    throw new TypeError(`${label} must be a valid Outlook installation identifier`);
  }
  return normalized;
}

function normalizePrincipal(principal) {
  if (!principal || typeof principal !== "object") {
    throw new TypeError("Outlook installation test principal is required");
  }
  const tenantId = identifier(principal.tenant_id, "tenant_id");
  const userId = identifier(
    principal.user_id ?? principal.actor_id,
    "user_id",
  );
  const subjectId = identifier(
    principal.entra_subject_id
      ?? `test-subject-${digest(`${tenantId}:${userId}`)}`,
    "entra_subject_id",
  );
  const scopes = Array.isArray(principal.scopes)
    ? [...principal.scopes]
    : [];
  if (!scopes.includes(OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE)) {
    scopes.push(OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE);
  }
  return Object.freeze({
    ...principal,
    tenant_id: tenantId,
    user_id: userId,
    entra_subject_id: subjectId,
    scopes: Object.freeze(scopes),
  });
}

function tupleKey(principal) {
  return [
    principal.tenant_id,
    principal.user_id,
    principal.entra_subject_id,
  ].join("\0");
}

function installationProjection(principal) {
  return Object.freeze({
    installation_id: `odi_${digest(tupleKey(principal), 32)}`,
    status: "active",
    state_version: 1,
    lease_expires_at: "2099-12-31T23:59:59.000Z",
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: "2099-01-01T00:00:00.000Z",
  });
}

export function createTrustedOutlookInstallationTestAuthority(
  rawPrincipals,
) {
  if (!Array.isArray(rawPrincipals) || rawPrincipals.length < 1) {
    throw new TypeError("At least one Outlook installation test principal is required");
  }
  const normalized = rawPrincipals.map(normalizePrincipal);
  const tenantIds = new Set(normalized.map(({ tenant_id }) => tenant_id));
  const userIds = new Set(normalized.map(({ user_id }) => user_id));
  const subjectIds = new Set(normalized.map(({ entra_subject_id }) => entra_subject_id));
  if (tenantIds.size !== 1 || userIds.size !== normalized.length
      || subjectIds.size !== normalized.length || normalized.length > ROSTER_SIZE) {
    throw new TypeError("Outlook installation test principals must be one-tenant and unique");
  }

  const tenantId = normalized[0].tenant_id;
  const seed = digest(normalized.map(tupleKey).sort().join("|"), 16);
  const entries = normalized.map((principal) => ({
    tenant_id: principal.tenant_id,
    user_id: principal.user_id,
    entra_subject_id: principal.entra_subject_id,
    enabled: true,
  }));
  for (let index = entries.length; index < ROSTER_SIZE; index += 1) {
    const suffix = String(index + 1).padStart(2, "0");
    entries.push({
      tenant_id: tenantId,
      user_id: `test-user-${seed}-${suffix}`,
      entra_subject_id: `test-subject-${seed}-${suffix}`,
      enabled: true,
    });
  }
  const roster = parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: `test-${seed}`,
    entries,
  });
  const principalsByUser = new Map(
    normalized.map((principal) => (
      [`${principal.tenant_id}\0${principal.user_id}`, principal]
    )),
  );
  const projections = new Map(
    normalized.map((principal) => (
      [tupleKey(principal), installationProjection(principal)]
    )),
  );

  const bindPrincipal = (principal) => {
    const candidate = normalizePrincipal(principal);
    const approved = principalsByUser.get(
      `${candidate.tenant_id}\0${candidate.user_id}`,
    );
    if (!approved || approved.entra_subject_id !== candidate.entra_subject_id) {
      return candidate;
    }
    return Object.freeze({
      ...candidate,
      entra_subject_id: approved.entra_subject_id,
    });
  };
  const runtime = Object.freeze({
    entitlement_roster: roster,
    installation_service: Object.freeze({
      async readTrustedCurrent({ principal }) {
        return projections.get(tupleKey(principal)) ?? null;
      },
    }),
  });

  return Object.freeze({
    principals: Object.freeze(normalized),
    runtime,
    bindPrincipal,
    bindContext(context, principal = context?.principal) {
      const boundPrincipal = bindPrincipal(principal);
      return Object.freeze({ ...context, principal: boundPrincipal });
    },
    wrapSessionAuth(sessionAuth) {
      return Object.freeze({
        ...sessionAuth,
        async resolvePermissionContextFromHeaders(...args) {
          const resolved = await sessionAuth.resolvePermissionContextFromHeaders(...args);
          if (resolved?.ok !== true) return resolved;
          const principal = bindPrincipal(resolved.principal);
          return Object.freeze({
            ...resolved,
            principal,
            context: Object.freeze({ ...resolved.context, principal }),
          });
        },
      });
    },
  });
}
