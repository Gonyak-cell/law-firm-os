export const HRX_OFFBOARDING_STATES = Object.freeze(["open", "ready_to_close", "closed", "blocked"]);
export const HRX_OFFBOARDING_CLOSE_BLOCKED = "HRX_OFFBOARDING_CLOSE_BLOCKED";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function normalizeItem(input = {}, idField, doneField) {
  return Object.freeze({
    [idField]: requiredString(input, idField),
    [doneField]: input[doneField] === true,
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
  const error = new TypeError("Offboarding case cannot close until access, documents, legal hold, matter reassignment, and handover checks are clear");
  error.safe_error_code = HRX_OFFBOARDING_CLOSE_BLOCKED;
  error.readiness = readiness;
  return error;
}

export function createOffboardingCase(input = {}) {
  const state = input.state ?? "open";
  if (!HRX_OFFBOARDING_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_OFFBOARDING_STATES.join(", ")}`);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    offboarding_id: requiredString(input, "offboarding_id"),
    employee_id: requiredString(input, "employee_id"),
    separation_date: requiredString(input, "separation_date"),
    state,
    access_revocations: Object.freeze((input.access_revocations ?? []).map(normalizeAccessRevocation)),
    document_returns: Object.freeze((input.document_returns ?? []).map((item) => normalizeItem(item, "document_ref", "returned"))),
    legal_hold_checks: Object.freeze(
      (input.legal_hold_checks ?? []).map((item) =>
        Object.freeze({
          hold_ref: requiredString(item, "hold_ref"),
          clear: item.clear === true,
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
  return Object.freeze({
    tenant_id: offboarding.tenant_id,
    offboarding_id: offboarding.offboarding_id,
    ready: accessClear && documentsClear && legalHoldClear && matterReassignmentClear && handoverClear,
    access_clear: accessClear,
    documents_clear: documentsClear,
    legal_hold_clear: legalHoldClear,
    matter_reassignment_clear: matterReassignmentClear,
    handover_clear: handoverClear,
  });
}

export function closeOffboardingCase(input = {}) {
  const offboarding = createOffboardingCase(input);
  const readiness = evaluateOffboardingReadiness(offboarding);
  if (!readiness.ready) throw closeBlockedError(readiness);
  return createOffboardingCase({ ...offboarding, state: "closed" });
}
