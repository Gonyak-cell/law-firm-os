import assert from "node:assert/strict";
import test from "node:test";
import { authorizeHrxAnalyticsExport, createHrxAnalyticsExport } from "../src/analytics-export.js";

const aggregateAnalytics = Object.freeze({
  tenant_id: "tenant-a",
  row_level_details_included: false,
  headcount: Object.freeze({ total: 2 }),
});

test("HRX analytics export allows aggregate exports with analytics read scope", () => {
  const exported = createHrxAnalyticsExport({
    analytics: aggregateAnalytics,
    principal: { hrx_scopes: ["hrx.analytics.read"] },
    classification: "aggregate",
  });
  assert.equal(exported.status, "ready");
  assert.equal(exported.export_policy, "aggregate_only");
  assert.equal(exported.row_level_details_included, false);
});

test("HRX analytics export requires export scope and step-up for sensitive exports", () => {
  const missingScope = authorizeHrxAnalyticsExport({
    principal: { hrx_scopes: ["hrx.analytics.read"] },
    classification: "sensitive",
  });
  assert.equal(missingScope.effect, "deny");
  assert.equal(missingScope.required_scope, "hrx.analytics.export");

  const missingStepUp = authorizeHrxAnalyticsExport({
    principal: { hrx_scopes: ["hrx.analytics.read", "hrx.analytics.export"] },
    classification: "sensitive",
  });
  assert.equal(missingStepUp.effect, "deny");
  assert.equal(missingStepUp.safe_error_code, "HRX_ANALYTICS_EXPORT_STEP_UP_REQUIRED");
});
