import assert from "node:assert/strict";
import test from "node:test";
import { assertPayrollReadinessStage, evaluatePayrollReadiness } from "../src/payroll-boundary.js";

const HASH = "a".repeat(64);
const internal = Object.freeze({
  tenant_id: "tenant-ready",
  domain_suite_hash: HASH,
  golden_fixture_hash: HASH,
  parallel_comparison_hash: HASH,
  unexplained_variance_count: 0,
  api_suite_hash: HASH,
  authz_suite_hash: HASH,
  migration_reconciliation_hash: HASH,
  forest_browser_qa_ref: "artifact:qa/payroll-browser",
});

test("GATE-001 separates calculation, internal, package, production approval, and go-live claims", () => {
  const readiness = evaluatePayrollReadiness(internal);
  assert.deepEqual([readiness.calculation_runtime, readiness.internal_runtime, readiness.package_verified, readiness.production_approved, readiness.go_live], [true, true, false, false, false]);
  assert.equal(assertPayrollReadinessStage(internal, "internal_runtime").internal_runtime, true);
  assert.throws(() => assertPayrollReadinessStage(internal, "package_verified"), (error) => error.safe_error_code === "HRX_PAYROLL_READINESS_EVIDENCE_MISSING" && error.missing.includes("package_verified.macos_package_hash"));
});

test("GATE-001 refuses production and go-live claims without separate approvals and environment receipts", () => {
  const packaged = { ...internal, macos_package_hash: HASH, windows_package_hash: HASH, package_qa_ref: "artifact:qa/payroll-packages" };
  assert.equal(assertPayrollReadinessStage(packaged, "package_verified").package_verified, true);
  const approved = {
    ...packaged,
    owner_approval_ref: "document:approval/owner",
    legal_signoff_ref: "document:approval/legal",
    labor_signoff_ref: "document:approval/labor",
    tax_signoff_ref: "document:approval/tax",
    provider_receipts: ["delivery", "bank", "filing"].map((provider_kind) => ({ provider_kind, environment: "sandbox", state: "succeeded", provider_receipt_ref: `provider:sandbox/${provider_kind}/receipt` })),
  };
  const readiness = assertPayrollReadinessStage(approved, "production_approved");
  assert.deepEqual([readiness.production_approved, readiness.go_live], [true, false]);
  assert.throws(() => assertPayrollReadinessStage(approved, "go_live"), (error) => error.missing.includes("go_live.go_live_approval_ref") && error.missing.includes("go_live.bank_production_receipt"));
});
