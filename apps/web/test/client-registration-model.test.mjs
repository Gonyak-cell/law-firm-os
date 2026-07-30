import assert from "node:assert/strict";
import test from "node:test";

import {
  clientRegistrationFingerprint,
  hasReviewCandidates,
  normalizeClientRegistrationForm,
  reviewAllowsCreate,
  reviewMatchesForm,
  safeReasonLabel,
  validateClientRegistrationForm
} from "../src/components/ClientRegistrationModel.js";

const person = {
  client_type: "person",
  display_name: "김민수",
  legal_form: "주식회사",
  registration_number: "123-45-67890",
  email: "minsu@example.test",
  phone: "010-1234-5678",
  depositor_alias: "김민수"
};

function reviewFor(form, overrides = {}) {
  return {
    kind: "data",
    outcome: "passed",
    fingerprint: clientRegistrationFingerprint(form),
    item: {
      review_digest: "digest-test",
      candidates: [],
      has_restricted_candidates: false,
      can_create: true,
      requires_distinct_confirmation: false,
      ...overrides
    }
  };
}

test("client registration model normalizes fields for the selected type", () => {
  const normalizedPerson = normalizeClientRegistrationForm(person);
  assert.equal(normalizedPerson.legal_form, "");
  assert.equal(normalizedPerson.registration_number, "");
  const normalizedOrganization = normalizeClientRegistrationForm({
    ...person,
    client_type: "organization",
    legal_form: "주식회사",
    registration_number: "123"
  });
  assert.equal(normalizedOrganization.email, "");
  assert.equal(normalizedOrganization.phone, "");
  assert.equal(normalizedOrganization.legal_form, "주식회사");
});
test("client registration requires a name and an organization legal form", () => {
  assert.equal(validateClientRegistrationForm({ client_type: "person" }).valid, false);
  assert.equal(validateClientRegistrationForm({
    client_type: "organization",
    display_name: "새봄테크"
  }).errors.legal_form, "법인·단체 형태를 선택해 주세요.");
  assert.equal(validateClientRegistrationForm({
    client_type: "organization",
    display_name: "새봄테크",
    legal_form: "주식회사"
  }).valid, true);
});

test("review is bound to the exact form and duplicate candidates require confirmation", () => {
  const review = reviewFor(person, {
    candidates: [{
      client_group_id: "client-existing",
      display_name: "김민수",
      client_type: "person",
      reasons: ["exact_display_name"]
    }],
    requires_distinct_confirmation: true
  });
  assert.equal(hasReviewCandidates(review), true);
  assert.equal(reviewMatchesForm(review, person), true);
  assert.equal(reviewAllowsCreate(review, person, false), false);
  assert.equal(reviewAllowsCreate(review, person, true), true);
  assert.equal(reviewAllowsCreate(review, { ...person, display_name: "김민수2" }, true), false);
  assert.equal(safeReasonLabel("exact_display_name"), "고객명이 같습니다");
  assert.equal(safeReasonLabel("unknown-safe-code"), "유사 정보가 있습니다");
});
