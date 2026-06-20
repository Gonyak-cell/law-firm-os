import assert from "node:assert/strict";
import test from "node:test";
import { createOffer, maskOfferCompensation, transitionOffer } from "../src/recruiting/offer.js";

const offer = Object.freeze({
  tenant_id: "tenant-a",
  offer_id: "offer-001",
  application_id: "app-001",
  candidate_id: "cand-001",
  compensation_ref: "CompRef:offer-001",
  document_ref: "DocRef:offer-letter-001",
});

test("offer workflow requires approval before sent or accepted states", () => {
  const draft = createOffer(offer);
  const requested = transitionOffer(draft, { state: "approval_requested" });
  assert.throws(() => transitionOffer(requested, { state: "sent" }), /cannot transition/);
  const approved = transitionOffer(requested, { state: "approved", approval_ref: "Approval:offer-001" });
  const sent = transitionOffer(approved, { state: "sent" });
  const accepted = transitionOffer(sent, { state: "accepted" });
  assert.equal(accepted.state, "accepted");
});

test("offer stores compensation ref only and masks it when access is denied", () => {
  assert.throws(() => createOffer({ ...offer, salary: 200000 }), /raw salary/);
  const masked = maskOfferCompensation(createOffer(offer), { effect: "deny", reason: "missing_hrx_comp_scope" });
  assert.equal(masked.compensation_ref, null);
  assert.equal(masked.masked, true);
  assert.equal(masked.mask_reason, "missing_hrx_comp_scope");
});
