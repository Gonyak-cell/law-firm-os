import assert from "node:assert/strict";
import test from "node:test";
import { assertCandidateConsentAllowsProcessing, createCandidateConsent } from "../src/recruiting/consent.js";

test("candidate consent is required before recruiting processing", () => {
  const consent = createCandidateConsent({
    tenant_id: "tenant-a",
    consent_id: "consent-001",
    candidate_id: "cand-001",
    purpose: "recruiting_processing",
    granted_at: "2026-06-20T00:00:00.000Z",
    evidence_ref: "ConsentForm:cand-001",
  });
  assert.equal(
    assertCandidateConsentAllowsProcessing([consent], {
      tenant_id: "tenant-a",
      candidate_id: "cand-001",
      as_of: "2026-06-21T00:00:00.000Z",
    }).consent_id,
    "consent-001",
  );
  assert.throws(
    () =>
      assertCandidateConsentAllowsProcessing([{ ...consent, revoked_at: "2026-06-20T01:00:00.000Z" }], {
        tenant_id: "tenant-a",
        candidate_id: "cand-001",
      }),
    /consent is required/,
  );
});
