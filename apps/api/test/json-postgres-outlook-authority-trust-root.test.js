import assert from "node:assert/strict";
import test from "node:test";

import {
  loadJsonPostgresProgramAuthorization,
} from "../src/json-postgres-program-inputs.js";
import {
  environment,
  operationEvent,
} from "./json-postgres-outlook-authority-fixtures.js";

test("absent fixed schema governance blocks before locator reads", async () => {
  const event = operationEvent();
  const env = {
    ...environment(),
    LAWOS_DEPLOYMENT_COMMIT: event.source_sha,
    LAWOS_DEPLOYMENT_TREE: event.source_tree,
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: event.artifact_sha256,
    LAWOS_PROGRAM_INPUT_BUCKET: environment().LAWOS_APPROVAL_AUDIT_BUCKET,
    LAWOS_OWNER_TRUST_REGISTRY_SHA256: "a".repeat(64),
  };
  let readCount = 0;
  let failure;
  try {
    await loadJsonPostgresProgramAuthorization({
      event,
      env,
      readBytes: async () => {
        readCount += 1;
        return Buffer.from("{}");
      },
    });
  } catch (error) {
    failure = error;
  }
  assert.equal(
    failure?.code,
    "SCHEMA_GOVERNANCE_NOT_INSTALLED",
    `locator read count before trust-root failure: ${readCount}`,
  );
  assert.equal(readCount, 0);
});
