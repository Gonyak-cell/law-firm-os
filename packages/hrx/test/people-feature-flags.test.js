import assert from "node:assert/strict";
import test from "node:test";
import {
  PEOPLE_FEATURE_FLAG_NAMES,
  createPeopleFeatureTelemetry,
  resolvePeopleFeatureFlags,
} from "../src/people-feature-flags.js";

test("People source flags are independent, boolean, and default off", () => {
  const defaults = resolvePeopleFeatureFlags();
  assert.deepEqual(Object.keys(defaults), PEOPLE_FEATURE_FLAG_NAMES);
  assert.equal(Object.values(defaults).every((enabled) => enabled === false), true);

  for (const flag of PEOPLE_FEATURE_FLAG_NAMES) {
    const flags = resolvePeopleFeatureFlags({ [flag]: true });
    assert.equal(flags[flag], true);
    assert.equal(
      PEOPLE_FEATURE_FLAG_NAMES.filter((candidate) => candidate !== flag)
        .every((candidate) => flags[candidate] === false),
      true,
    );
  }
  assert.equal(resolvePeopleFeatureFlags({ outlook_calendar: "true" }).outlook_calendar, true);
  assert.equal(resolvePeopleFeatureFlags({ outlook_calendar: "unexpected" }).outlook_calendar, false);
});

test("People telemetry records only non-identifying feature outcomes", () => {
  const metric = createPeopleFeatureTelemetry({
    tenant_id: "tenant-people",
    feature: "outlook_calendar",
    outcome: "partial",
    meeting_title: "Secret meeting",
    employee_name: "홍길동",
    token: "provider-token",
  });
  const serialized = JSON.stringify(metric);

  assert.equal(metric.metric_name, "people.feature.request_count");
  assert.deepEqual(metric.tags, {
    feature: "outlook_calendar",
    outcome: "partial",
  });
  assert.equal(serialized.includes("Secret meeting"), false);
  assert.equal(serialized.includes("홍길동"), false);
  assert.equal(serialized.includes("provider-token"), false);
  assert.throws(() => createPeopleFeatureTelemetry({
    tenant_id: "tenant-people",
    feature: "outlook_calendar",
    outcome: "provider_payload",
  }), /outcome/);
  assert.throws(() => createPeopleFeatureTelemetry({
    tenant_id: "tenant-people",
    feature: "outlook_calendar",
    outcome: "ok",
  }), /outcome/);
});
