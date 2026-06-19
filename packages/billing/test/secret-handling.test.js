import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBillingCoreNoSecretMaterialIncluded,
  BILLING_CORE_SECURE_SECRET_HANDLING_POLICY,
} from "../src/index.js";

test("Billing Core secure secret handling rejects secret material fields", () => {
  assert.deepEqual(BILLING_CORE_SECURE_SECRET_HANDLING_POLICY, {
    accepts_secret_material: false,
    credential_or_secret_included: false,
    secret_material_included: false,
    exposes_secret_material: false,
  });
  assert.equal(assertBillingCoreNoSecretMaterialIncluded({ invoice_id: "inv_synthetic" }).forbidden_field_count, 0);
  assert.throws(
    () => assertBillingCoreNoSecretMaterialIncluded({ invoice_id: "inv_synthetic", client_secret: "blocked" }),
    /Billing Core payload must not include secret material fields: client_secret/,
  );
});
