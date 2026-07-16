import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HRX_COMPANY_POLICY_DECISION_IDS,
  HRX_COMPANY_POLICY_PROVIDER_KEYS,
  assertCompanyTimePayrollPolicyProductionReady,
  createCompanyTimePayrollPolicyManifest,
  validateCompanyTimePayrollPolicyManifest,
} from "../src/company-policy-manifest.js";

const syntheticFixture = JSON.parse(readFileSync(new URL("../fixtures/company-time-payroll-policy.synthetic.json", import.meta.url), "utf8"));

function approvedProductionManifest() {
  return {
    ...syntheticFixture,
    manifest_id: "company_time_payroll_policy_amic_2026_07",
    tenant_id: "tenant_amic_matter",
    environment: "production",
    status: "approved",
    source_document_hash: `sha256:${"a".repeat(64)}`,
    payroll: { frequency: "monthly", cutoff_day: 20, pay_day: 25, non_business_day_rule: "previous_business_day" },
    provider_ids: Object.fromEntries(HRX_COMPANY_POLICY_PROVIDER_KEYS.map((key) => [key, `amic-${key}-v1`])),
    decisions: HRX_COMPANY_POLICY_DECISION_IDS.map((decisionId) => ({
      decision_id: decisionId,
      status: "approved",
      source_ref: `policy-register:${decisionId.toLowerCase()}:v1`,
    })),
  };
}

test("synthetic company policy manifest is structurally valid and immutable", () => {
  const manifest = createCompanyTimePayrollPolicyManifest(syntheticFixture);
  assert.equal(manifest.standard_work.daily_minutes, 480);
  assert.equal(manifest.leave.default_expiration_months, 12);
  assert.equal(manifest.payroll.cutoff_day, null);
  assert.deepEqual(manifest.employment_types, ["full_time", "part_time", "contractor", "intern"]);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.provider_ids), true);
});

test("production validation rejects synthetic, unapproved, missing calendar and provider values", () => {
  const validation = validateCompanyTimePayrollPolicyManifest(syntheticFixture, { production: true });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.includes("production manifest environment must be production"));
  assert.ok(validation.errors.includes("production manifest status must be approved"));
  assert.ok(validation.errors.includes("production payroll.cutoff_day is required"));
  assert.ok(validation.errors.includes("production payroll.pay_day is required"));
  assert.ok(validation.errors.includes("production provider_ids.bank_transfer must be a real provider identifier"));
  assert.ok(validation.errors.includes("production decision PAYROLL_CALENDAR must be approved"));
});

test("approved production policy manifest passes the production gate", () => {
  const manifest = assertCompanyTimePayrollPolicyProductionReady(approvedProductionManifest());
  assert.equal(manifest.environment, "production");
  assert.equal(manifest.status, "approved");
  assert.equal(manifest.payroll.pay_day, 25);
});

test("production gate rejects placeholder provider IDs and decision evidence", () => {
  const input = approvedProductionManifest();
  input.provider_ids = { ...input.provider_ids, tax_filing: "test-provider" };
  input.decisions = input.decisions.map((decision) => decision.decision_id === "PROVIDER_IDENTIFIERS"
    ? { ...decision, source_ref: "pending-owner" }
    : decision);
  assert.throws(() => assertCompanyTimePayrollPolicyProductionReady(input), /tax_filing.*real provider identifier/);
  assert.throws(() => assertCompanyTimePayrollPolicyProductionReady(input), /PROVIDER_IDENTIFIERS.*non-placeholder source_ref/);
});

test("manifest validator rejects invalid rounding, duplicate employment types and incomplete decisions", () => {
  const input = {
    ...syntheticFixture,
    standard_work: { ...syntheticFixture.standard_work, rounding_minutes: 30 },
    employment_types: ["full_time", "full_time"],
    decisions: syntheticFixture.decisions.slice(0, -1),
  };
  const validation = validateCompanyTimePayrollPolicyManifest(input);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.includes("standard_work.rounding_minutes must be 1 when rounding_mode is none"));
  assert.ok(validation.errors.includes("employment_types must not contain duplicates"));
  assert.ok(validation.errors.includes("decisions is missing decision_id: PROVIDER_IDENTIFIERS"));
});
