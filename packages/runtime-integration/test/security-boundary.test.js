import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeIntegrationHarness, createRuntimeIntegrationFixture } from "../src/index.js";

test("RS-6 AuthN/AuthZ and safe error suites fail closed without count or secret leaks", () => {
  const fixture = createRuntimeIntegrationFixture({ run_id: "rs6-security-test" });
  const harness = createRuntimeIntegrationHarness({ fixture });
  const authz = harness.runAuthzE2E();
  const safeErrors = harness.runSafeErrorLeakSuite();
  assert.equal(authz.status, "passed");
  assert.equal(safeErrors.status, "passed");
});

test("RS-6 locked future domains remain locked or export-only", () => {
  const fixture = createRuntimeIntegrationFixture({ run_id: "rs6-feature-lock-test" });
  const harness = createRuntimeIntegrationHarness({ fixture });
  const locks = harness.runFeatureLockedDomainSuite();
  assert.equal(locks.status, "passed");
  assert.equal(locks.details.domains, 5);
});
