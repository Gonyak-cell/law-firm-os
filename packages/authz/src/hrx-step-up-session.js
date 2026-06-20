import { randomUUID } from "node:crypto";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function toIso(value, field) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
}

function addSeconds(iso, seconds) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHrxStepUpSession(input = {}, { now = new Date().toISOString(), ttlSeconds = 300 } = {}) {
  const issuedAt = toIso(input.issued_at ?? now, "issued_at");
  const expiresAt = input.expires_at ? toIso(input.expires_at, "expires_at") : addSeconds(issuedAt, ttlSeconds);
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) throw new TypeError("expires_at must be after issued_at");
  if (input.mfa !== true) throw new TypeError("mfa must be true");
  const assuranceLevel = Number(input.assurance_level);
  if (!Number.isFinite(assuranceLevel) || assuranceLevel < 2) throw new TypeError("assurance_level must be at least 2");

  return Object.freeze({
    session_id: input.session_id ?? `hrx_step_up_${randomUUID()}`,
    tenant_id: requiredString(input, "tenant_id"),
    actor_id: requiredString(input, "actor_id"),
    purpose: requiredString(input, "purpose"),
    mfa: true,
    assurance_level: assuranceLevel,
    issued_at: issuedAt,
    expires_at: expiresAt,
    revoked_at: input.revoked_at ?? null,
  });
}

export function isHrxStepUpSessionFresh(session = {}, { context = {}, now = new Date().toISOString() } = {}) {
  return (
    session.mfa === true &&
    Number(session.assurance_level ?? 0) >= 2 &&
    !session.revoked_at &&
    session.tenant_id === context.tenant_id &&
    session.actor_id === context.actor_id &&
    Date.parse(session.expires_at) > Date.parse(now)
  );
}

export function createInMemoryHrxStepUpSessionStore({ clock = () => new Date().toISOString() } = {}) {
  const sessions = new Map();

  return Object.freeze({
    issue(input = {}) {
      const session = createHrxStepUpSession(input, { now: clock() });
      sessions.set(session.session_id, clone(session));
      return Object.freeze(clone(session));
    },
    get(sessionId) {
      const session = sessions.get(sessionId);
      return session ? Object.freeze(clone(session)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...sessions.values()]
          .filter((session) => !query.tenant_id || session.tenant_id === query.tenant_id)
          .filter((session) => !query.actor_id || session.actor_id === query.actor_id)
          .map((session) => Object.freeze(clone(session))),
      );
    },
    revoke(sessionId, { revoked_at = clock() } = {}) {
      const existing = sessions.get(sessionId);
      if (!existing) return undefined;
      const revoked = { ...existing, revoked_at: toIso(revoked_at, "revoked_at") };
      sessions.set(sessionId, revoked);
      return Object.freeze(clone(revoked));
    },
    verify(sessionId, input = {}) {
      const session = sessions.get(sessionId);
      return Boolean(session && isHrxStepUpSessionFresh(session, input));
    },
  });
}
