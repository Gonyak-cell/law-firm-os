import assert from "node:assert/strict";
import test from "node:test";
import {
  LCX_FULL_MODEL_DECLARATIONS,
  LCX_FULL_SAFE_READINESS_FIXTURES,
  assertNoForbiddenProjection,
  projectReadinessRecord,
  redactLcxFullValue,
  transitionReadinessState,
  validateLcxFullReadinessModel
} from "../src/data/readinessModel.js";

test("LCX-FULL state model declares all shared projections without enabling writes", () => {
  const validation = validateLcxFullReadinessModel();
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.deepEqual(Object.keys(LCX_FULL_MODEL_DECLARATIONS), [
    "feature_readiness",
    "approval_request",
    "connector_receipt",
    "execution_run",
    "audit_event",
    "field_policy_rule",
    "document_policy_rule"
  ]);
  for (const descriptor of Object.values(LCX_FULL_MODEL_DECLARATIONS)) {
    assert.equal(descriptor.writes_enabled_by_model, false);
    assert.equal(descriptor.production_go_live_claim, false);
    assert.equal(descriptor.public_release_claim, false);
  }
});

test("LCX-FULL readiness transitions reject skipped approval provider and preflight states", () => {
  assert.equal(transitionReadinessState({ from: "not_configured", to: "configured" }).allowed, true);
  assert.equal(transitionReadinessState({ from: "configured", to: "approval_requested" }).reason, "state_skip_blocked");
  assert.equal(transitionReadinessState({ from: "preflight_passed", to: "owner_approved" }).reason, "state_skip_blocked");
  assert.equal(transitionReadinessState({ from: "owner_approved", to: "execution_requested" }).reason, "state_skip_blocked");
  assert.equal(transitionReadinessState({ from: "owner_approved", to: "provider_receipt_recorded" }).allowed, true);
});

test("LCX-FULL redaction removes provider URLs tokens raw rows and storage paths", () => {
  const redacted = redactLcxFullValue({
    provider_url: "https://provider.example.com/raw",
    nested: {
      bearer_token: "Bearer abc",
      raw_rows: [{ storage_pointer: "s3://bucket/path", value: "safe" }]
    }
  });
  assert.match(JSON.stringify(redacted), /\[lcx-full-redacted\]/);
  assert.equal(assertNoForbiddenProjection(redacted).valid, true);
});

test("LCX-FULL synthetic readiness fixtures stay safe for UI projection", () => {
  for (const fixture of LCX_FULL_SAFE_READINESS_FIXTURES) {
    const projection = projectReadinessRecord(fixture);
    assert.equal(assertNoForbiddenProjection(projection).valid, true);
    assert.equal(projection.writes_enabled, false);
    assert.equal(projection.provider_production_write_claim, false);
  }
});
