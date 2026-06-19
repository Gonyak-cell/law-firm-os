import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMatterCoreNoSecretMaterialIncluded,
  MATTER_CORE_SECURE_SECRET_HANDLING_POLICY,
} from "../src/index.js";

test("Matter Core secure secret handling rejects secret material fields", () => {
  assert.deepEqual(MATTER_CORE_SECURE_SECRET_HANDLING_POLICY, {
    accepts_secret_material: false,
    credential_or_secret_included: false,
    secret_material_included: false,
    exposes_secret_material: false,
  });
  assert.equal(assertMatterCoreNoSecretMaterialIncluded({ matter_id: "m_synthetic" }).forbidden_field_count, 0);
  assert.throws(
    () => assertMatterCoreNoSecretMaterialIncluded({ matter_id: "m_synthetic", access_token: "blocked" }),
    /Matter Core payload must not include secret material fields: access_token/,
  );
});
