import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGovernanceCoreNoSecretMaterialIncluded,
  GOVERNANCE_CORE_SECURE_SECRET_HANDLING_POLICY,
} from "../src/index.js";

test("Governance Core secure secret handling rejects secret material fields", () => {
  assert.deepEqual(GOVERNANCE_CORE_SECURE_SECRET_HANDLING_POLICY, {
    accepts_secret_material: false,
    credential_or_secret_included: false,
    secret_material_included: false,
    exposes_secret_material: false,
  });
  assert.equal(assertGovernanceCoreNoSecretMaterialIncluded({ policy_id: "pol_synthetic" }).forbidden_field_count, 0);
  assert.throws(
    () => assertGovernanceCoreNoSecretMaterialIncluded({ policy_id: "pol_synthetic", break_glass_token: "blocked" }),
    /Governance Core payload must not include secret material fields: break_glass_token/,
  );
});
