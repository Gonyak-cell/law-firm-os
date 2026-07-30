import assert from "node:assert/strict";
import test from "node:test";
import {
  loadClientOperationsFixture,
  validateClientOperationsFixture,
} from "../validate-client-operations-fixture.mjs";

const fixture = loadClientOperationsFixture();
const result = validateClientOperationsFixture({ data: fixture });

test("Client operations fixture contract covers all 32 planned verification scenarios", () => {
  assert.equal(result.verdict, "PASS", result.errors.join("\n"));
  assert.equal(result.verification_level, "fixture-contract");
  assert.equal(result.scenario_count, 32);
  assert.deepEqual(result.scenario_ids, fixture.contract.verification_scenario_ids);
  assert.deepEqual(result.totals, {
    deposit_revenue_month: 33000000,
    receivables: 9000000,
    overpayment: 2000000,
    new_inquiries: 1,
    consultations_today: 1,
    engagement_reviews: 1,
  });
});

for (const scenario of fixture.scenarios.scenarios) {
  test(`${scenario.id} fixture contract is registered for its planned runtime test`, () => {
    assert.ok(result.scenario_ids.includes(scenario.id));
    assert.match(scenario.planned_test_file, /\.(?:js|mjs)$/u);
    assert.ok(scenario.area);
    assert.ok(Object.keys(scenario.expected).length > 0);
  });
}

test("Client operations fixture validator fails closed when a scenario is omitted", () => {
  const invalid = structuredClone(fixture);
  invalid.scenarios.scenarios.pop();
  const invalidResult = validateClientOperationsFixture({ data: invalid });
  assert.equal(invalidResult.verdict, "FAIL");
  assert.ok(invalidResult.errors.some((error) => error.includes("exactly 32")));
  assert.ok(invalidResult.errors.some((error) => error.includes("contract scenario IDs")));
});
