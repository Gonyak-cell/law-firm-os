import { createHash } from "node:crypto";

export const G1_DURABLE_AUDIT_TUW_IDS = Object.freeze([
  "LFOS-G1-W01-T004",
  "LFOS-G1-W01-T005",
  "LFOS-G1-W01-T006"
]);

const DEFAULT_SCHEMA_VERSION = "law-firm-os.audit-event.v0.1";
const DEFAULT_PAYLOAD_CLASSIFICATION = "metadata_plus_digest";

export function buildAuditEventInput({
  tenant_id,
  actor,
  action,
  object,
  outcome,
  decision,
  reason_code,
  source_service,
  request = {},
  payload = {},
  evidence_refs = [],
  occurred_at = null,
  received_at = null,
  event_id = null,
  matter_id = null,
  document_version_id = null,
  permission_decision_id = null,
  retention_policy_id = null
} = {}) {
  const receivedAt = received_at ?? new Date().toISOString();
  const occurredAt = occurred_at ?? receivedAt;
  const requestId = request.request_id ?? "request_unset";
  const traceId = request.trace_id ?? "trace_unset";
  const spanId = request.span_id ?? "span_unset";
  const idempotencyKey = request.idempotency_key ?? `${tenant_id}:${action}:${object?.object_id}:${requestId}`;

  return {
    event_id: event_id ?? createStableEventId({ tenant_id, action, object, requestId, idempotencyKey }),
    schema_version: DEFAULT_SCHEMA_VERSION,
    tenant_id,
    occurred_at: occurredAt,
    received_at: receivedAt,
    actor,
    action,
    object,
    outcome,
    decision,
    reason_code,
    source_service,
    request_id: requestId,
    trace_id: traceId,
    span_id: spanId,
    idempotency_key: idempotencyKey,
    payload_classification: payload.payload_classification ?? DEFAULT_PAYLOAD_CLASSIFICATION,
    payload_digest: payload.payload_digest ?? digestPayload(payload),
    evidence_refs,
    matter_id,
    document_version_id,
    permission_decision_id,
    retention_policy_id
  };
}

export function createAuditMiddleware({ ledger, source_service }) {
  if (!ledger?.append) throw new Error("createAuditMiddleware requires an append-only audit ledger");
  if (!source_service) throw new Error("createAuditMiddleware requires source_service");

  return function appendAuditEvent(input) {
    const event = ledger.append(buildAuditEventInput({ ...input, source_service }));
    return {
      ok: true,
      event_id: event.event_id,
      tenant_id: event.tenant_id,
      sequence_number: event.sequence_number,
      event_hash: event.event_hash,
      previous_event_hash: event.previous_event_hash,
      tuw_ids: ["LFOS-G1-W01-T005"]
    };
  };
}

export function recordSensitiveRead({
  ledger,
  actor,
  object,
  permissionDecision,
  request = {},
  source_service,
  evidence_refs = [],
  occurred_at = null,
  received_at = null
} = {}) {
  if (!ledger?.append) throw new Error("recordSensitiveRead requires an append-only audit ledger");
  if (!permissionDecision?.permission_decision_id) {
    throw new Error("recordSensitiveRead requires permission_decision_id");
  }

  const tenantId = permissionDecision.tenant_id ?? actor?.tenant_id;
  const event = ledger.append(
    buildAuditEventInput({
      tenant_id: tenantId,
      actor: {
        actor_id: actor?.actor_id,
        actor_type: actor?.actor_type
      },
      action: `${object?.object_type ?? "object"}.sensitive_read`,
      object: {
        object_id: object?.object_id,
        object_type: object?.object_type
      },
      outcome: permissionDecision.effect,
      decision: permissionDecision.effect,
      reason_code: permissionDecision.reason ?? "sensitive_read",
      source_service,
      request,
      payload: {
        payload_classification: DEFAULT_PAYLOAD_CLASSIFICATION,
        payload_digest: object?.payload_digest
      },
      evidence_refs,
      occurred_at,
      received_at,
      matter_id: object?.matter_id ?? null,
      document_version_id: object?.document_version_id ?? null,
      permission_decision_id: permissionDecision.permission_decision_id
    })
  );

  return {
    ok: true,
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    action: event.action,
    object_id: event.object.object_id,
    permission_decision_id: event.permission_decision_id,
    payload_digest: event.payload_digest,
    tuw_ids: ["LFOS-G1-W01-T006"]
  };
}

function digestPayload(payload) {
  const stablePayload = JSON.stringify(payload ?? {});
  return `sha256:${createHash("sha256").update(stablePayload).digest("hex")}`;
}

function createStableEventId({ tenant_id, action, object, requestId, idempotencyKey }) {
  const seed = [tenant_id, action, object?.object_type, object?.object_id, requestId, idempotencyKey].join(":");
  return `evt_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}
