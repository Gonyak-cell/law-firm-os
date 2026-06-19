import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAiGovernanceCoreNoSecretMaterialIncluded,
  AI_GOVERNANCE_CORE_SECURE_SECRET_HANDLING_POLICY,
} from "../src/index.js";

test("AI Governance Core secure secret handling rejects secret material fields", () => {
  assert.deepEqual(AI_GOVERNANCE_CORE_SECURE_SECRET_HANDLING_POLICY, {
    accepts_secret_material: false,
    credential_or_secret_included: false,
    secret_material_included: false,
    exposes_secret_material: false,
  });
  assert.equal(assertAiGovernanceCoreNoSecretMaterialIncluded({ ai_job_id: "job_synthetic" }).forbidden_field_count, 0);
  assert.throws(
    () => assertAiGovernanceCoreNoSecretMaterialIncluded({ ai_job_id: "job_synthetic", tool_token: "blocked" }),
    /AI Governance Core payload must not include secret material fields: tool_token/,
  );
});
