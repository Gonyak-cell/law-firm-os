import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function epoch(value) {
  return new Date(value).getTime();
}

export function validateClearanceToken(token = {}, { now = new Date().toISOString() } = {}) {
  const errors = [];
  for (const field of ["clearance_token_id", "tenant_id", "intake_request_id", "conflict_check_id", "engagement_id", "snapshot_hash"]) {
    if (!token[field]) errors.push(`missing:${field}`);
  }
  if (token.token_state !== "active") errors.push(`invalid_state:${token.token_state}`);
  if (token.expires_at && epoch(token.expires_at) <= epoch(now)) errors.push("expired");
  if (token.snapshot_stale === true) errors.push("stale_snapshot");
  if (token.blocked_claims?.length > 0) errors.push("blocked_claims_present");
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    token_state: errors.includes("expired") ? "expired" : errors.includes("stale_snapshot") ? "stale" : token.token_state,
    production_ready_claim: false,
  });
}

export function issueClearanceToken({ repository, token, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(token, "tenant_id");
  requiredString(token, "intake_request_id");
  requiredString(token, "conflict_check_id");
  requiredString(token, "engagement_id");
  requiredString(token, "snapshot_hash");
  const replay = repository.getIdempotency({ tenant_id: token.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...token,
      model_type: "ClearanceToken",
      clearance_token_id: token.clearance_token_id,
      token_state: "active",
      status: "active",
      issued_at: token.issued_at ?? new Date().toISOString(),
      expires_at: token.expires_at ?? "2026-06-27T00:00:00.000Z",
      outcome: "cleared",
      blocked_claims: Object.freeze([]),
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "clearance.token.issue",
        object_type: "ClearanceToken",
        object_id: record.clearance_token_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", clearance_token: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "clearance_token_issue", response });
    return response;
  });
}
