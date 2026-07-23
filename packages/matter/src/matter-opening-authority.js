import { createHash } from "node:crypto";

function canonical(value) {
  if (typeof value === "function") return "[function]";
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value ?? null;
}

export function matterOpeningRequestFingerprint({
  operation,
  idempotency_key,
  actor_id,
  matter,
  client,
  clearance,
  matter_number_seed,
  require_canonical_matter_code,
} = {}) {
  const bytes = JSON.stringify(canonical({
    operation,
    idempotency_key,
    actor_id,
    tenant_id: matter?.tenant_id,
    matter,
    client: client ?? null,
    clearance: clearance
      ? {
          tenant_id: clearance.tenant_id,
          clearance_token_id: clearance.clearance_token_id,
          intake_request_id: clearance.intake_request_id,
          conflict_check_id: clearance.conflict_check_id,
          engagement_id: clearance.engagement_id,
          snapshot_hash: clearance.snapshot_hash,
          token_state: clearance.token_state,
          outcome: clearance.outcome,
          expires_at: clearance.expires_at,
        }
      : null,
    matter_number_seed,
    require_canonical_matter_code: require_canonical_matter_code === true,
  }));
  return createHash("sha256").update(bytes).digest("hex");
}

export class MatterOpeningIdempotencyConflictError extends Error {
  constructor() {
    super("Matter opening idempotency key was reused with a different authorization or request");
    this.name = "MatterOpeningIdempotencyConflictError";
    this.code = "MATTER_OPENING_IDEMPOTENCY_CONFLICT";
    this.safe_error_code = "MATTER_OPENING_IDEMPOTENCY_CONFLICT";
    this.status = 409;
  }
}

export function assertMatterOpeningReplay(replay, { operation, actor_id, object_id, request_fingerprint } = {}) {
  if (!replay) return null;
  if (replay.operation !== operation
    || replay.actor_id !== actor_id
    || replay.object_id !== object_id
    || replay.request_fingerprint !== request_fingerprint) {
    throw new MatterOpeningIdempotencyConflictError();
  }
  return replay;
}
