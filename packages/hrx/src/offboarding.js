export const HRX_OFFBOARDING_STATES = Object.freeze(["open", "ready_to_close", "closed", "blocked"]);
export const HRX_LEAVE_RECONCILIATION_STATES = Object.freeze([
  "pending",
  "previewed",
  "approved_pending_sync",
  "approved_and_synced",
  "sync_failed",
]);
export const HRX_OFFBOARDING_CLOSE_BLOCKED = "HRX_OFFBOARDING_CLOSE_BLOCKED";
export const HRX_OFFBOARDING_IDENTITY_MISMATCH = "HRX_OFFBOARDING_IDENTITY_MISMATCH";
export const HRX_OFFBOARDING_EVIDENCE_MISMATCH = "HRX_OFFBOARDING_EVIDENCE_MISMATCH";
export const HRX_OFFBOARDING_LEAVE_EVIDENCE_REQUIRED =
  "HRX_OFFBOARDING_LEAVE_EVIDENCE_REQUIRED";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function normalizeItem(input = {}, idField, doneField) {
  return Object.freeze({
    [idField]: requiredString(input, idField),
    [doneField]: input[doneField] === true,
    evidence_ref: optionalString(input, "evidence_ref"),
  });
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function normalizeAccessRevocation(input = {}) {
  return Object.freeze({
    system_ref: requiredString(input, "system_ref"),
    revoked: input.revoked === true,
    confirmation_ref: optionalString(input, "confirmation_ref"),
  });
}

function normalizeMatterReassignment(input = {}) {
  return Object.freeze({
    matter_id: requiredString(input, "matter_id"),
    reassigned_to_employee_id: optionalString(input, "reassigned_to_employee_id"),
    reassigned: input.reassigned === true,
    handover_ref: optionalString(input, "handover_ref"),
  });
}

function normalizeHandoverItem(input = {}) {
  return Object.freeze({
    item_id: requiredString(input, "item_id"),
    title: requiredString(input, "title"),
    completed: input.completed === true,
    evidence_ref: optionalString(input, "evidence_ref"),
  });
}

function closeBlockedError(readiness) {
  const error = new TypeError("Offboarding case cannot close until access, documents, legal hold, matter reassignment, handover, and leave reconciliation checks are clear");
  error.safe_error_code = HRX_OFFBOARDING_CLOSE_BLOCKED;
  error.readiness = readiness;
  return error;
}

function identityMismatchError(field) {
  const error = new TypeError(`Offboarding case identity cannot change: ${field}`);
  error.safe_error_code = HRX_OFFBOARDING_IDENTITY_MISMATCH;
  return error;
}

function evidenceMismatchError(field) {
  const error = new TypeError(`Offboarding close evidence must come from the current ledger case: ${field}`);
  error.safe_error_code = HRX_OFFBOARDING_EVIDENCE_MISMATCH;
  return error;
}

export function createOffboardingCase(input = {}) {
  const state = input.state ?? "open";
  if (!HRX_OFFBOARDING_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_OFFBOARDING_STATES.join(", ")}`);
  const leaveReconciliationStatus = input.leave_reconciliation_status ?? "pending";
  if (!HRX_LEAVE_RECONCILIATION_STATES.includes(leaveReconciliationStatus)) {
    throw new TypeError(`leave_reconciliation_status must be one of ${HRX_LEAVE_RECONCILIATION_STATES.join(", ")}`);
  }
  const leaveReconciliationEvidenceRef = optionalString(
    input,
    "leave_reconciliation_evidence_ref",
  );
  if (
    (leaveReconciliationStatus === "approved_and_synced") !==
    Boolean(leaveReconciliationEvidenceRef)
  ) {
    const error = new TypeError(
      "approved_and_synced leave reconciliation and authoritative provider evidence must be recorded together",
    );
    error.safe_error_code = HRX_OFFBOARDING_LEAVE_EVIDENCE_REQUIRED;
    throw error;
  }
  const templateInstance = input.template
    ? instantiateLifecycleTemplate(input.template, { anchor_date: input.separation_date })
    : null;
  if (templateInstance && templateInstance.template_ref.lifecycle_kind !== "offboarding") {
    throw new TypeError("offboarding case requires an offboarding lifecycle template");
  }
  const templateSnapshot = templateInstance?.template_snapshot
    ?? (input.template_snapshot ? createLifecycleTemplate(input.template_snapshot) : null);
  if (templateSnapshot && templateSnapshot.lifecycle_kind !== "offboarding") {
    throw new TypeError("offboarding template_snapshot lifecycle_kind must be offboarding");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    offboarding_id: requiredString(input, "offboarding_id"),
    employee_id: requiredString(input, "employee_id"),
    separation_date: requiredString(input, "separation_date"),
    state,
    template_ref: templateInstance?.template_ref
      ?? (templateSnapshot ? lifecycleTemplateRef(templateSnapshot) : input.template_ref ?? null),
    template_snapshot: templateSnapshot,
    tasks: Object.freeze(
      (templateInstance?.tasks ?? input.tasks ?? []).map(normalizeLifecycleTaskInstance),
    ),
    leave_reconciliation_status: leaveReconciliationStatus,
    leave_reconciliation_evidence_ref: leaveReconciliationEvidenceRef,
    access_revocations: Object.freeze((input.access_revocations ?? []).map(normalizeAccessRevocation)),
    document_returns: Object.freeze((input.document_returns ?? []).map((item) => normalizeItem(item, "document_ref", "returned"))),
    legal_hold_checks: Object.freeze(
      (input.legal_hold_checks ?? []).map((item) =>
        Object.freeze({
          hold_ref: requiredString(item, "hold_ref"),
          clear: item.clear === true,
          evidence_ref: optionalString(item, "evidence_ref"),
        }),
      ),
    ),
    matter_reassignments: Object.freeze((input.matter_reassignments ?? []).map(normalizeMatterReassignment)),
    handover_items: Object.freeze((input.handover_items ?? []).map(normalizeHandoverItem)),
  });
}

export function evaluateOffboardingReadiness(input = {}) {
  const offboarding = createOffboardingCase(input);
  const accessClear = offboarding.access_revocations.every((item) => item.revoked && Boolean(item.confirmation_ref));
  const documentsClear = offboarding.document_returns.every((item) => item.returned);
  const legalHoldClear = offboarding.legal_hold_checks.every((item) => item.clear);
  const matterReassignmentClear = offboarding.matter_reassignments.every(
    (item) => item.reassigned && Boolean(item.reassigned_to_employee_id),
  );
  const handoverClear = offboarding.handover_items.every((item) => item.completed);
  const requiredTasksClear = offboarding.tasks.every(
    (task) => !task.required || task.status === "completed",
  );
  const leaveReconciliationClear =
    offboarding.leave_reconciliation_status === "approved_and_synced" &&
    Boolean(offboarding.leave_reconciliation_evidence_ref);
  return Object.freeze({
    tenant_id: offboarding.tenant_id,
    offboarding_id: offboarding.offboarding_id,
    ready: accessClear && documentsClear && legalHoldClear && matterReassignmentClear && handoverClear && requiredTasksClear && leaveReconciliationClear,
    access_clear: accessClear,
    documents_clear: documentsClear,
    legal_hold_clear: legalHoldClear,
    matter_reassignment_clear: matterReassignmentClear,
    handover_clear: handoverClear,
    required_tasks_clear: requiredTasksClear,
    leave_reconciliation_clear: leaveReconciliationClear,
    leave_reconciliation_status: offboarding.leave_reconciliation_status,
  });
}

export function closeOffboardingCase(input = {}, { current_case } = {}) {
  let offboarding;
  if (current_case) {
    const current = createOffboardingCase(current_case);
    const asserted = createOffboardingCase({ ...current, ...input });
    for (const field of ["tenant_id", "offboarding_id", "employee_id", "separation_date"]) {
      if (asserted[field] !== current[field]) throw identityMismatchError(field);
    }
    for (const field of [
      "state",
      "template_ref",
      "template_snapshot",
      "tasks",
      "leave_reconciliation_status",
      "leave_reconciliation_evidence_ref",
      "access_revocations",
      "document_returns",
      "legal_hold_checks",
      "matter_reassignments",
      "handover_items",
    ]) {
      if (input[field] !== undefined && JSON.stringify(asserted[field]) !== JSON.stringify(current[field])) {
        throw evidenceMismatchError(field);
      }
    }
    offboarding = current;
  } else {
    offboarding = createOffboardingCase(input);
  }
  const readiness = evaluateOffboardingReadiness(offboarding);
  if (!readiness.ready) throw closeBlockedError(readiness);
  return createOffboardingCase({ ...offboarding, state: "closed" });
}

export function updateOffboardingTask(offboarding = {}, taskId, patch = {}, options = {}) {
  const current = createOffboardingCase(offboarding);
  if (current.state === "closed") throw new TypeError("closed offboarding tasks are immutable");
  const tasks = updateLifecycleTaskInstances(current.tasks, taskId, patch, options);
  return createOffboardingCase({ ...current, tasks });
}
import {
  createLifecycleTemplate,
  instantiateLifecycleTemplate,
  lifecycleTemplateRef,
  normalizeLifecycleTaskInstance,
  updateLifecycleTaskInstances,
} from "./lifecycle-template.js";
