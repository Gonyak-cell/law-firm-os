import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function signedActor(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("signed actor_id is required for Matter replay");
  return value.trim();
}

export function matterRuntimeFingerprint(operation, actorId, input) {
  return createHash("sha256").update(JSON.stringify(canonical({
    operation,
    actor_id: signedActor(actorId),
    input,
  }))).digest("hex");
}

function conflictResponse(requestId, auditHintRef) {
  return {
    status: 409,
    body: {
      request_id: requestId,
      outcome: "blocked",
      ui_state: "blocked",
      safe_error_codes: ["MATTER_IDEMPOTENCY_CONFLICT"],
      audit_hint_ref: auditHintRef,
      idempotent_replay: false,
      state_idempotent: true,
      production_ready_claim: false,
    },
  };
}

export function matterRuntimeReplay(repository, query, idempotencyKey, requestId, operation, actorId, input) {
  const actor = signedActor(actorId);
  const requestFingerprint = matterRuntimeFingerprint(operation, actor, input);
  const replay = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (!replay?.response) return Object.freeze({ response: null, requestFingerprint });
  if (replay.operation !== operation || replay.actor_id !== actor || replay.request_fingerprint !== requestFingerprint) {
    return Object.freeze({ response: conflictResponse(requestId, query.audit_hint_ref), requestFingerprint });
  }
  return Object.freeze({
    requestFingerprint,
    response: {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        state_idempotent: true,
        safe_error_codes: replay.response.safe_error_codes ?? [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    },
  });
}

export function recordMatterRuntimeReplay(repository, query, idempotencyKey, operation, actorId, requestFingerprint, response) {
  const actor = signedActor(actorId);
  const existing = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (existing) {
    if (existing.operation !== operation || existing.actor_id !== actor || existing.request_fingerprint !== requestFingerprint) {
      throw Object.assign(new Error("Matter idempotency key conflicts with existing operation"), { code: "MATTER_IDEMPOTENCY_CONFLICT", status: 409 });
    }
    return existing;
  }
  return repository?.recordIdempotency?.({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation,
    actor_id: actor,
    request_fingerprint: requestFingerprint,
    response,
    created_at: new Date().toISOString(),
  });
}
