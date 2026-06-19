export const HRX_OFFBOARDING_STATES = Object.freeze(["open", "ready_to_close", "closed", "blocked"]);

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

export function createOffboardingCase(input = {}) {
  const state = input.state ?? "open";
  if (!HRX_OFFBOARDING_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_OFFBOARDING_STATES.join(", ")}`);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    offboarding_id: requiredString(input, "offboarding_id"),
    employee_id: requiredString(input, "employee_id"),
    separation_date: requiredString(input, "separation_date"),
    state,
    access_revocations: Object.freeze((input.access_revocations ?? []).map((item) => normalizeItem(item, "system_ref", "revoked"))),
    document_returns: Object.freeze((input.document_returns ?? []).map((item) => normalizeItem(item, "document_ref", "returned"))),
    legal_hold_checks: Object.freeze(
      (input.legal_hold_checks ?? []).map((item) =>
        Object.freeze({
          hold_ref: requiredString(item, "hold_ref"),
          clear: item.clear === true,
        }),
      ),
    ),
  });
}

export function evaluateOffboardingReadiness(input = {}) {
  const offboarding = createOffboardingCase(input);
  const accessClear = offboarding.access_revocations.every((item) => item.revoked);
  const documentsClear = offboarding.document_returns.every((item) => item.returned);
  const legalHoldClear = offboarding.legal_hold_checks.every((item) => item.clear);
  return Object.freeze({
    tenant_id: offboarding.tenant_id,
    offboarding_id: offboarding.offboarding_id,
    ready: accessClear && documentsClear && legalHoldClear,
    access_clear: accessClear,
    documents_clear: documentsClear,
    legal_hold_clear: legalHoldClear,
  });
}

export function closeOffboardingCase(input = {}) {
  const offboarding = createOffboardingCase(input);
  const readiness = evaluateOffboardingReadiness(offboarding);
  if (!readiness.ready) throw new TypeError("Offboarding case cannot close until access, documents, and legal hold checks are clear");
  return createOffboardingCase({ ...offboarding, state: "closed" });
}
