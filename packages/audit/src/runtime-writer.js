import { createAuditLedger } from "./append-only-ledger.js";
import { RUNTIME_AUDIT_EVENT_SCHEMA_VERSION } from "./runtime-taxonomy.js";

function requireServerPrincipal(principal = {}) {
  if (principal.source !== "server-derived" || principal.header_only_trust_allowed !== false) {
    throw new Error("runtime audit requires server-derived principal");
  }
  return principal;
}

function objectFromResource(resource = {}) {
  const object_id = resource.resource_id ?? resource.object_id ?? resource.document_id ?? resource.matter_id;
  const object_type = resource.resource_type ?? resource.object_type;
  if (!object_id || !object_type) throw new TypeError("runtime audit resource object_id and object_type are required");
  return { object_id, object_type };
}

export function buildRuntimeAuditEventInput({
  principal,
  resource,
  action,
  decision = {},
  permission_context_id,
  request = {},
  evidence_refs = []
} = {}) {
  requireServerPrincipal(principal);
  if (!permission_context_id) throw new TypeError("permission_context_id is required before audit append");
  const request_id = request.request_id ?? principal.request_id ?? "request_unset";
  return Object.freeze({
    event_id: request.event_id ?? `${principal.tenant_id}:${request_id}:${action}`,
    schema_version: RUNTIME_AUDIT_EVENT_SCHEMA_VERSION,
    tenant_id: principal.tenant_id,
    occurred_at: request.occurred_at ?? new Date(0).toISOString(),
    received_at: request.received_at ?? new Date(0).toISOString(),
    actor: { actor_id: principal.user_id, actor_type: principal.actor_type ?? "user" },
    action,
    object: objectFromResource(resource),
    outcome: decision.effect ?? "unknown",
    decision: decision.effect ?? "unknown",
    reason_code: decision.reason ?? "runtime_audit",
    source_service: request.source_service ?? "runtime-spine",
    request_id,
    trace_id: request.trace_id ?? "trace_unset",
    span_id: request.span_id ?? "span_unset",
    idempotency_key: request.idempotency_key ?? request_id,
    payload_classification: request.payload_classification ?? resource.data_classification ?? "metadata_plus_digest",
    payload_digest: request.payload_digest ?? "sha256:runtime-audit-redacted",
    evidence_refs: Object.freeze([...evidence_refs]),
    matter_id: resource.matter_id ?? null,
    document_version_id: resource.document_version_id ?? null,
    permission_decision_id: permission_context_id,
    retention_policy_id: action === "retention.evaluate" ? (request.retention_policy_id ?? "runtime-retention-standard") : null
  });
}

export function createRuntimeAuditWriter({ ledger = createAuditLedger() } = {}) {
  return Object.freeze({
    append(input = {}) {
      return ledger.append(buildRuntimeAuditEventInput(input));
    },
    correction(originalEvent, input = {}) {
      return ledger.correction(originalEvent, buildRuntimeAuditEventInput({ ...input, action: "audit.correction.append" }));
    },
    list: ledger.list,
    verify: ledger.verify
  });
}
