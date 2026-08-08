import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

export function matterRuntimeFingerprint(operation, input) {
  return createHash("sha256").update(JSON.stringify(canonical({ operation, input }))).digest("hex");
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

export function matterRuntimeReplay(repository, query, idempotencyKey, requestId, operation, input) {
  const requestFingerprint = matterRuntimeFingerprint(operation, input);
  const replay = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (!replay?.response) return Object.freeze({ response: null, requestFingerprint });
  if (replay.operation !== operation || replay.request_fingerprint !== requestFingerprint) {
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
        production_ready_claim: false,
      },
    },
  });
}

export function recordMatterRuntimeReplay(repository, query, idempotencyKey, operation, requestFingerprint, response) {
  const existing = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (existing) {
    if (existing.operation !== operation || existing.request_fingerprint !== requestFingerprint) {
      throw Object.assign(new Error("Matter idempotency key conflicts with existing operation"), { code: "MATTER_IDEMPOTENCY_CONFLICT", status: 409 });
    }
    return existing;
  }
  return repository?.recordIdempotency?.({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation,
    request_fingerprint: requestFingerprint,
    response,
    created_at: new Date().toISOString(),
  });
}
