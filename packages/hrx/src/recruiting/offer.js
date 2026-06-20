export const HRX_OFFER_STATES = Object.freeze(["draft", "approval_requested", "approved", "sent", "accepted", "rejected", "withdrawn"]);

const OFFER_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["approval_requested", "withdrawn"]),
  approval_requested: Object.freeze(["approved", "rejected", "withdrawn"]),
  approved: Object.freeze(["sent", "withdrawn"]),
  sent: Object.freeze(["accepted", "rejected", "withdrawn"]),
  accepted: Object.freeze([]),
  rejected: Object.freeze([]),
  withdrawn: Object.freeze([]),
});

const RAW_COMPENSATION_FIELDS = Object.freeze(["salary", "amount", "base_pay", "bonus_amount", "equity_value"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertNoRawCompensation(input = {}) {
  for (const field of RAW_COMPENSATION_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Offer must use compensation_ref, not raw ${field}`);
  }
}

export function createOffer(input = {}) {
  assertNoRawCompensation(input);
  const state = input.state ?? "draft";
  if (!HRX_OFFER_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_OFFER_STATES.join(", ")}`);
  if (["approved", "sent", "accepted"].includes(state) && !input.approval_ref) {
    throw new TypeError("approval_ref is required before an offer can be approved, sent, or accepted");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    offer_id: requiredString(input, "offer_id"),
    application_id: requiredString(input, "application_id"),
    candidate_id: requiredString(input, "candidate_id"),
    compensation_ref: requiredString(input, "compensation_ref"),
    document_ref: requiredString(input, "document_ref"),
    state,
    approval_ref: input.approval_ref ?? null,
    compensation_restricted: true,
  });
}

export function transitionOffer(offer = {}, change = {}) {
  const current = createOffer(offer);
  const nextState = change.state ?? current.state;
  if (nextState !== current.state && !(OFFER_TRANSITIONS[current.state] ?? []).includes(nextState)) {
    throw new TypeError(`Offer cannot transition from ${current.state} to ${nextState}`);
  }
  return createOffer({ ...current, ...change });
}

export function maskOfferCompensation(offer = {}, decision = {}) {
  const current = createOffer(offer);
  if (decision.effect === "allow") return current;
  return Object.freeze({
    ...current,
    compensation_ref: null,
    masked: true,
    mask_reason: decision.reason ?? "hrx_offer_compensation_restricted",
  });
}
