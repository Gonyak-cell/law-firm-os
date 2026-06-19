import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSettlementCoreNoSecretMaterialIncluded,
  SETTLEMENT_CORE_SECURE_SECRET_HANDLING_POLICY,
} from "../src/index.js";

test("Settlement Core secure secret handling rejects secret material fields", () => {
  assert.deepEqual(SETTLEMENT_CORE_SECURE_SECRET_HANDLING_POLICY, {
    accepts_secret_material: false,
    credential_or_secret_included: false,
    secret_material_included: false,
    exposes_secret_material: false,
  });
  assert.equal(assertSettlementCoreNoSecretMaterialIncluded({ settlement_run_id: "sr_synthetic" }).forbidden_field_count, 0);
  assert.throws(
    () => assertSettlementCoreNoSecretMaterialIncluded({ settlement_run_id: "sr_synthetic", private_key: "blocked" }),
    /Settlement Core payload must not include secret material fields: private_key/,
  );
});
