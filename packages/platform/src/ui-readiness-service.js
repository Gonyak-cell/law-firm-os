function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function appendUiAuditEvent({ repository, event } = {}) {
  requiredString(event, "tenant_id");
  requiredString(event, "actor_id");
  requiredString(event, "action");
  requiredString(event, "object_type");
  requiredString(event, "object_id");
  const eventId =
    event.event_id ??
    `ui:${event.action}:${event.tenant_id}:${event.object_type}:${event.object_id}:${event.idempotency_key ?? "single"}`;
  return repository.appendAudit({
    ...event,
    event_id: eventId,
    decision: event.decision ?? "allow",
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    metadata: event.metadata ?? {},
    production_ready_claim: false,
  });
}

export function recordUiReadinessCheck({ repository, ui_check, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(ui_check, "tenant_id");
  requiredString(ui_check, "tuw_id");
  requiredString(ui_check, "route_id");
  requiredString(ui_check, "ui_surface_id");
  if (ui_check.api_backed_surface !== true) throw new Error("UI readiness requires API-backed surface");
  if (ui_check.permission_states_covered !== true) throw new Error("UI readiness requires permission states");
  if (ui_check.responsive_states_covered !== true) throw new Error("UI readiness requires responsive states");
  const replay = repository.getIdempotency({ tenant_id: ui_check.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({ ...ui_check, model_type: "UiReadinessCheck", status: ui_check.status ?? "passed" });
    const auditEvent = appendUiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ui.readiness.check.record", object_type: "UiReadinessCheck", object_id: record.ui_check_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", ui_check: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ui_readiness_check_record", response });
    return response;
  });
}

export function recordCriticalPathRun({ repository, critical_path_run, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(critical_path_run, "tenant_id");
  requiredString(critical_path_run, "route_id");
  if (!Array.isArray(critical_path_run.evidence_refs) || critical_path_run.evidence_refs.length === 0) throw new Error("critical path evidence refs are required");
  if (critical_path_run.permission_gate_verified !== true) throw new Error("critical path requires permission gate verification");
  const replay = repository.getIdempotency({ tenant_id: critical_path_run.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...critical_path_run, model_type: "CriticalPathRun", status: critical_path_run.status ?? "passed" });
    const auditEvent = appendUiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ui.critical_path.run.record", object_type: "CriticalPathRun", object_id: record.critical_path_run_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", critical_path_run: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ui_critical_path_run_record", response });
    return response;
  });
}

export function adjudicateUiReadiness({ repository, ui_adjudication, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(ui_adjudication, "tenant_id");
  requiredString(ui_adjudication, "ui_check_id");
  if (!["approve_with_findings", "reject", "needs_revision"].includes(ui_adjudication.decision)) throw new Error("invalid UI adjudication decision");
  const replay = repository.getIdempotency({ tenant_id: ui_adjudication.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...ui_adjudication, model_type: "UiAdjudication", status: "recorded" });
    const auditEvent = appendUiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ui.readiness.adjudicate", object_type: "UiAdjudication", object_id: record.ui_adjudication_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", ui_adjudication: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ui_readiness_adjudicate", response });
    return response;
  });
}
