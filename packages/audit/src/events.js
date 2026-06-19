import { createHash } from "node:crypto";

export function canonicalize(value) {
  return JSON.stringify(sortCanonical(value));
}

export function hashEventBody(body) {
  return createHash("sha256").update(canonicalize(body)).digest("hex");
}

export function createAuditEvent(input, previousEvent = null) {
  const required = [
    "event_id",
    "schema_version",
    "tenant_id",
    "occurred_at",
    "received_at",
    "actor",
    "action",
    "object",
    "outcome",
    "decision",
    "reason_code",
    "source_service",
    "request_id",
    "trace_id",
    "span_id",
    "idempotency_key",
    "payload_classification",
    "payload_digest",
    "evidence_refs",
  ];
  const missing = required.filter((field) => !input[field]);
  if (missing.length > 0) throw new Error(`AuditEvent missing required fields: ${missing.join(", ")}`);
  if (!Array.isArray(input.evidence_refs)) throw new Error("AuditEvent evidence_refs must be an array");
  requireNestedFields("AuditEvent actor", input.actor, ["actor_id", "actor_type"]);
  requireNestedFields("AuditEvent object", input.object, ["object_id", "object_type"]);
  requireConditionalFields(input);

  const sequence_number = previousEvent ? previousEvent.sequence_number + 1 : 1;
  const previous_event_hash = previousEvent?.event_hash ?? "GENESIS";
  const body = {
    event_id: input.event_id,
    schema_version: input.schema_version,
    tenant_id: input.tenant_id,
    occurred_at: input.occurred_at,
    received_at: input.received_at,
    sequence_number,
    actor: input.actor,
    action: input.action,
    object: input.object,
    outcome: input.outcome,
    decision: input.decision,
    reason_code: input.reason_code,
    source_service: input.source_service,
    request_id: input.request_id,
    trace_id: input.trace_id,
    span_id: input.span_id,
    idempotency_key: input.idempotency_key,
    payload_classification: input.payload_classification,
    payload_digest: input.payload_digest,
    evidence_refs: [...input.evidence_refs],
    previous_event_hash,
    correction_of_event_id: input.correction_of_event_id ?? null,
    matter_id: input.matter_id ?? null,
    document_version_id: input.document_version_id ?? null,
    permission_decision_id: input.permission_decision_id ?? null,
    retention_policy_id: input.retention_policy_id ?? null,
  };

  return deepFreeze({
    ...body,
    event_hash: hashEventBody(body),
    hash_algorithm: "sha256",
  });
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map((item) => sortCanonical(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortCanonical(value[key])]));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function requireNestedFields(entityName, value, fields) {
  const missing = fields.filter((field) => !value?.[field]);
  if (missing.length > 0) throw new Error(`${entityName} missing required fields: ${missing.join(", ")}`);
}

function requireConditionalFields(input) {
  const objectType = input.object?.object_type;
  const matterScopedObjects = new Set([
    "Matter",
    "Document",
    "DocumentVersion",
    "Invoice",
    "Payment",
    "SettlementRun",
    "AIJob",
    "AIRetrievalSet",
    "SecureLink",
    "DataRoom",
  ]);
  if (matterScopedObjects.has(objectType) && !input.matter_id) {
    throw new Error("AuditEvent missing conditionally required field: matter_id");
  }
  if (["Document", "DocumentVersion", "AIRetrievalSet", "DataRoom"].includes(objectType) && !input.document_version_id) {
    throw new Error("AuditEvent missing conditionally required field: document_version_id");
  }
  if (["allow", "deny", "approval_required", "review_required"].includes(input.decision) && !input.permission_decision_id) {
    throw new Error("AuditEvent missing conditionally required field: permission_decision_id");
  }
  if (["retention.evaluate", "retention.purge.request", "legal_hold.apply", "legal_hold.release"].includes(input.action) && !input.retention_policy_id) {
    throw new Error("AuditEvent missing conditionally required field: retention_policy_id");
  }
}
