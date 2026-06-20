const EVALUATION_STATUSES = Object.freeze(["draft", "submitted", "reviewed", "closed"]);
const EVALUATION_READ_SCOPES = Object.freeze(["hrx:evaluation:read", "hrx:people:admin"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function scopeAllowed(principal = {}) {
  const scopes = Array.isArray(principal.scopes) ? principal.scopes : [];
  return EVALUATION_READ_SCOPES.some((scope) => scopes.includes(scope));
}

export function createEvaluationRecord(input = {}) {
  const status = input.status ?? "draft";
  if (!EVALUATION_STATUSES.includes(status)) {
    throw new TypeError(`status must be one of ${EVALUATION_STATUSES.join(", ")}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    evaluation_id: requiredString(input, "evaluation_id"),
    employee_id: requiredString(input, "employee_id"),
    reviewer_employee_id: requiredString(input, "reviewer_employee_id"),
    period_start: requiredString(input, "period_start"),
    period_end: requiredString(input, "period_end"),
    status,
    source_ref: requiredString(input, "source_ref"),
    rating_ref: optionalString(input, "rating_ref"),
    private_notes_ref: optionalString(input, "private_notes_ref"),
  });
}

export function evaluateEvaluationRead({ evaluation, principal = {} } = {}) {
  const record = createEvaluationRecord(evaluation);
  const tenantMatches = principal.tenant_id === record.tenant_id;
  const isSubject = principal.employee_id === record.employee_id;
  const isReviewer = principal.employee_id === record.reviewer_employee_id;
  const allowed = tenantMatches && (scopeAllowed(principal) || isSubject || isReviewer);
  return Object.freeze({
    outcome: allowed ? "allow" : "deny",
    reason: allowed ? "evaluation_read_allowed" : "evaluation_read_denied",
    tenant_id: record.tenant_id,
    evaluation_id: record.evaluation_id,
    actor_id: principal.actor_id ?? null,
    audit_action: "hrx.evaluation.read",
  });
}

export function readEvaluationWithAudit({ evaluation, principal = {}, audit } = {}) {
  const record = createEvaluationRecord(evaluation);
  const decision = evaluateEvaluationRead({ evaluation: record, principal });
  const auditEvent = {
    tenant_id: record.tenant_id,
    actor_id: principal.actor_id ?? null,
    action: decision.audit_action,
    object_type: "HRXEvaluation",
    object_id: record.evaluation_id,
    decision: decision.outcome,
    reason: decision.reason,
  };
  audit?.append?.(auditEvent);
  if (decision.outcome !== "allow") {
    return Object.freeze({
      outcome: "blocked",
      safe_error_code: "HRX_EVALUATION_READ_DENIED",
      audit_event: Object.freeze(auditEvent),
    });
  }
  const { private_notes_ref: _privateNotesRef, ...customerSafe } = clone(record);
  return Object.freeze({
    outcome: "ok",
    evaluation: Object.freeze({
      ...customerSafe,
      private_notes_included: false,
    }),
    audit_event: Object.freeze(auditEvent),
  });
}
