import { createHash, randomBytes } from "node:crypto";
import { appendPortalAuditEvent } from "./audit.js";
import { createRfiResponse } from "./rfi-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeTimestamp(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError("expires_at must be a valid timestamp");
  return timestamp;
}

function nowIso() {
  return new Date().toISOString();
}

function createOneTimeToken() {
  return randomBytes(32).toString("base64url");
}

function inviteUrl(baseUrl, token) {
  const url = new URL(baseUrl || "https://portal.local.example.invalid/client");
  url.searchParams.set("view", "portal");
  url.searchParams.set("portal_invite", token);
  return url.toString();
}

function activeSession(repository, { tenant_id, external_session_id } = {}) {
  const session = repository.get({ tenant_id, model_type: "PortalExternalSession", resource_id: external_session_id });
  if (!session || session.status !== "active") {
    const error = new Error("external portal session is not active");
    error.safe_error_code = "PORTAL_EXTERNAL_SESSION_INACTIVE";
    throw error;
  }
  return session;
}

function blocked(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

export function createMagicLinkInvite({ repository, invite, actor_id, idempotency_key, base_url } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(invite, "tenant_id");
  requiredString(invite, "external_user_id");
  requiredString(invite, "matter_id");
  requiredString(invite, "rfi_request_id");
  requiredString(invite, "secure_link_id");
  requiredString(invite, "expires_at");
  safeTimestamp(invite.expires_at);
  const replay = repository.getIdempotency({ tenant_id: invite.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const token = createOneTimeToken();
  return repository.transaction((tx) => {
    const inviteId = invite.invite_id ?? `portal_invite_${sha256(`${invite.tenant_id}:${invite.external_user_id}:${idempotency_key}`).slice(0, 16)}`;
    const record = tx.create({
      ...invite,
      model_type: "PortalMagicLinkInvite",
      resource_id: inviteId,
      invite_id: inviteId,
      status: "active",
      one_time: true,
      token_hash: sha256(token),
      token_material_included: false,
      invite_url_returned_once: true,
      used_at: null,
      revoked_at: null,
    });
    const auditEvent = appendPortalAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "portal.magic_link_invite.create",
        object_type: "PortalMagicLinkInvite",
        object_id: record.invite_id,
        idempotency_key,
        metadata: {
          external_user_id: record.external_user_id,
          rfi_request_id: record.rfi_request_id,
          secure_link_id: record.secure_link_id,
          token_material_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      invite: record,
      invite_delivery: Object.freeze({
        one_time_url: inviteUrl(base_url, token),
        returned_once: true,
        token_material_persisted: false,
      }),
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: record.tenant_id,
      idempotency_key,
      operation: "portal_magic_link_invite_create",
      response: Object.freeze({
        ...response,
        invite_delivery: Object.freeze({
          one_time_url: null,
          returned_once: false,
          token_material_persisted: false,
        }),
      }),
    });
    return response;
  });
}

export function consumeMagicLinkInvite({ repository, token, now = nowIso() } = {}) {
  requiredString({ token }, "token");
  const tokenHash = sha256(token);
  const invite = repository.list({ model_type: "PortalMagicLinkInvite" }).find((record) => record.token_hash === tokenHash);
  if (!invite) throw blocked("PORTAL_MAGIC_LINK_NOT_FOUND", "magic link invite was not found");
  if (invite.status === "revoked") throw blocked("PORTAL_MAGIC_LINK_REVOKED", "magic link invite was revoked");
  if (invite.status === "used" || invite.used_at) throw blocked("PORTAL_MAGIC_LINK_ALREADY_USED", "magic link invite was already used");
  if (safeTimestamp(now) > safeTimestamp(invite.expires_at)) throw blocked("PORTAL_MAGIC_LINK_EXPIRED", "magic link invite is expired");
  return repository.transaction((tx) => {
    const usedAt = nowIso();
    const updatedInvite = tx.update(
      { tenant_id: invite.tenant_id, model_type: "PortalMagicLinkInvite", resource_id: invite.invite_id },
      { status: "used", used_at: usedAt },
    );
    const sessionId = `portal_session_${sha256(`${invite.invite_id}:${usedAt}`).slice(0, 16)}`;
    const session = tx.create({
      model_type: "PortalExternalSession",
      resource_id: sessionId,
      external_session_id: sessionId,
      tenant_id: invite.tenant_id,
      invite_id: invite.invite_id,
      external_user_id: invite.external_user_id,
      matter_id: invite.matter_id,
      rfi_request_id: invite.rfi_request_id,
      secure_link_id: invite.secure_link_id,
      status: "active",
      token_material_included: false,
      document_bytes_included: false,
    });
    const auditEvent = appendPortalAuditEvent({
      repository: tx,
      event: {
        tenant_id: invite.tenant_id,
        actor_id: invite.external_user_id,
        action: "portal.magic_link_invite.consume",
        object_type: "PortalMagicLinkInvite",
        object_id: invite.invite_id,
        idempotency_key: sessionId,
        metadata: { external_session_id: sessionId, token_material_included: false },
      },
    });
    return Object.freeze({ outcome: "consumed", invite: updatedInvite, external_session: session, audit_event: auditEvent });
  });
}

export function revokeMagicLinkInvite({ repository, tenant_id, invite_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ invite_id }, "invite_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const invite = tx.update(
      { tenant_id, model_type: "PortalMagicLinkInvite", resource_id: invite_id },
      { status: "revoked", revoked_at: nowIso() },
    );
    const auditEvent = appendPortalAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "portal.magic_link_invite.revoke",
        object_type: "PortalMagicLinkInvite",
        object_id: invite.invite_id,
        idempotency_key,
        metadata: { token_material_included: false },
      },
    });
    const response = Object.freeze({ outcome: "revoked", invite, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "portal_magic_link_invite_revoke", response });
    return response;
  });
}

export function submitExternalRfiResponse({ repository, external_session_id, rfi_response, idempotency_key } = {}) {
  requiredString(rfi_response, "tenant_id");
  requiredString({ external_session_id }, "external_session_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const session = activeSession(repository, { tenant_id: rfi_response.tenant_id, external_session_id });
  if (session.rfi_request_id !== rfi_response.rfi_request_id) {
    throw blocked("PORTAL_EXTERNAL_SESSION_RFI_MISMATCH", "RFI response does not match the external session");
  }
  return createRfiResponse({
    repository,
    rfi_response: {
      ...rfi_response,
      external_session_id,
      external_user_id: session.external_user_id,
      matter_id: session.matter_id,
      upload_metadata_only: true,
    },
    actor_id: session.external_user_id,
    idempotency_key,
  });
}

export function accessExternalSecureLink({ repository, tenant_id, secure_link_id, external_session_id, now = nowIso() } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ secure_link_id }, "secure_link_id");
  requiredString({ external_session_id }, "external_session_id");
  const session = activeSession(repository, { tenant_id, external_session_id });
  if (session.secure_link_id !== secure_link_id) throw blocked("PORTAL_SECURE_LINK_SESSION_MISMATCH", "secure link does not match the external session");
  const link = repository.get({ tenant_id, model_type: "SecureLink", secure_link_id });
  if (!link) throw blocked("PORTAL_SECURE_LINK_NOT_FOUND", "secure link was not found");
  if (link.status !== "active") throw blocked("PORTAL_SECURE_LINK_REVOKED", "secure link is not active");
  if (safeTimestamp(now) > safeTimestamp(link.expires_at)) throw blocked("PORTAL_SECURE_LINK_EXPIRED", "secure link is expired");
  appendPortalAuditEvent({
    repository,
    event: {
      tenant_id,
      actor_id: session.external_user_id,
      action: "portal.secure_link.access",
      object_type: "SecureLink",
      object_id: secure_link_id,
      idempotency_key: `access:${external_session_id}:${secure_link_id}`,
      metadata: { document_bytes_included: false, token_material_included: false },
    },
  });
  return Object.freeze({ outcome: "passed", secure_link: link });
}

export function revokeSecureLink({ repository, tenant_id, secure_link_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ secure_link_id }, "secure_link_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const secureLink = tx.update(
      { tenant_id, model_type: "SecureLink", secure_link_id },
      { status: "revoked", revoked_at: nowIso() },
    );
    const auditEvent = appendPortalAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "portal.secure_link.revoke",
        object_type: "SecureLink",
        object_id: secure_link_id,
        idempotency_key,
        metadata: { document_bytes_included: false, token_material_included: false },
      },
    });
    const response = Object.freeze({ outcome: "revoked", secure_link: secureLink, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "portal_secure_link_revoke", response });
    return response;
  });
}
