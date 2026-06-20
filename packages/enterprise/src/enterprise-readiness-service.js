function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function appendEnterpriseAuditEvent({ repository, event } = {}) {
  requiredString(event, "tenant_id");
  requiredString(event, "actor_id");
  requiredString(event, "action");
  requiredString(event, "object_type");
  requiredString(event, "object_id");
  const eventId =
    event.event_id ??
    `enterprise:${event.action}:${event.tenant_id}:${event.object_type}:${event.object_id}:${event.idempotency_key ?? "single"}`;
  return repository.appendAudit({
    ...event,
    event_id: eventId,
    decision: event.decision ?? "allow",
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    metadata: event.metadata ?? {},
    production_ready_claim: false,
  });
}

export function recordEnterpriseReadinessItem({ repository, enterprise_item, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(enterprise_item, "tenant_id");
  requiredString(enterprise_item, "enterprise_item_id");
  requiredString(enterprise_item, "item_type");
  requiredString(enterprise_item, "control_ref");
  if (!Array.isArray(enterprise_item.evidence_refs) || enterprise_item.evidence_refs.length === 0) throw new Error("enterprise readiness evidence refs are required");
  if (enterprise_item.production_ready_claim === true || enterprise_item.go_live_approved === true) throw new Error("enterprise readiness item cannot claim production or go-live");
  const replay = repository.getIdempotency({ tenant_id: enterprise_item.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({ ...enterprise_item, model_type: "EnterpriseReadinessItem", status: enterprise_item.status ?? "owner_decision_ready" });
    const auditEvent = appendEnterpriseAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "enterprise.readiness.item.record", object_type: "EnterpriseReadinessItem", object_id: record.enterprise_item_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", enterprise_item: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "enterprise_readiness_item_record", response });
    return response;
  });
}

export function recordReleaseCandidate({ repository, release_candidate, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(release_candidate, "tenant_id");
  requiredString(release_candidate, "release_candidate_id");
  if (!Array.isArray(release_candidate.validation_refs) || release_candidate.validation_refs.length === 0) throw new Error("release candidate validation refs are required");
  if (release_candidate.production_ready_claim === true) throw new Error("release candidate cannot claim production-ready");
  const replay = repository.getIdempotency({ tenant_id: release_candidate.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...release_candidate, model_type: "ReleaseCandidate", status: release_candidate.status ?? "owner_decision_pending" });
    const auditEvent = appendEnterpriseAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "enterprise.release_candidate.record", object_type: "ReleaseCandidate", object_id: record.release_candidate_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", release_candidate: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "enterprise_release_candidate_record", response });
    return response;
  });
}

export function recordGoNoGoDecision({ repository, go_no_go, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(go_no_go, "tenant_id");
  requiredString(go_no_go, "go_no_go_id");
  requiredString(go_no_go, "decision");
  if (go_no_go.decision === "go" && (go_no_go.owner_approved !== true || go_no_go.release_gate_passed !== true)) {
    throw new Error("go decision requires owner approval and release gate pass");
  }
  if (go_no_go.production_ready_claim === true || go_no_go.go_live_approved === true) throw new Error("go/no-go record cannot claim production-ready or go-live");
  const replay = repository.getIdempotency({ tenant_id: go_no_go.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...go_no_go, model_type: "GoNoGoDecision", status: go_no_go.status ?? "recorded" });
    const auditEvent = appendEnterpriseAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "enterprise.go_no_go.record", object_type: "GoNoGoDecision", object_id: record.go_no_go_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", go_no_go: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "enterprise_go_no_go_record", response });
    return response;
  });
}
