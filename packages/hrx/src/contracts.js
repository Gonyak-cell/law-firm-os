export const HRX_CONTRACT_STATES = Object.freeze(["draft", "approved", "signed", "renewed", "terminated", "expired"]);

const CONTRACT_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["approved", "terminated"]),
  approved: Object.freeze(["signed", "terminated"]),
  signed: Object.freeze(["renewed", "terminated", "expired"]),
  renewed: Object.freeze(["signed", "terminated", "expired"]),
  terminated: Object.freeze([]),
  expired: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createEmploymentContract(input = {}) {
  const state = input.state ?? "draft";
  if (!HRX_CONTRACT_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_CONTRACT_STATES.join(", ")}`);
  if (state === "signed" && !input.signature_ref) throw new TypeError("signature_ref is required for signed contract");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    contract_id: requiredString(input, "contract_id"),
    employee_id: requiredString(input, "employee_id"),
    profile_id: requiredString(input, "profile_id"),
    state,
    document_ref: requiredString(input, "document_ref"),
    signature_ref: input.signature_ref ?? null,
    renewal_of_contract_id: input.renewal_of_contract_id ?? null,
  });
}

export function transitionEmploymentContract(contract = {}, change = {}) {
  const nextState = change.state ?? contract.state;
  if (nextState !== contract.state && !(CONTRACT_TRANSITIONS[contract.state] ?? []).includes(nextState)) {
    throw new TypeError(`EmploymentContract cannot transition from ${contract.state} to ${nextState}`);
  }
  return createEmploymentContract({ ...contract, ...change });
}
