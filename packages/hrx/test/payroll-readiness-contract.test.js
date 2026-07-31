import assert from "node:assert/strict";
import test from "node:test";
import { resolveHrxRoutePolicy } from "../../../apps/api/src/routes/hrx/route-policy-map.js";
import {
  extractPayrollCapabilityInventory,
  hashPayrollCapabilityInventory,
} from "../../../scripts/extract-payroll-capabilities.mjs";
import { assertPayrollReadinessStage, evaluatePayrollReadiness } from "../src/payroll-boundary.js";
import {
  PAYROLL_CAPABILITY_AUDIT,
  PAYROLL_CAPABILITY_LEDGER,
  PAYROLL_INFRASTRUCTURE_INVENTORY,
} from "./payroll-capability-ledger.fixture.js";

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

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

test("PEO-TUW-060 keeps the ledger and every registered payroll route policy equal in both directions", async () => {
  const inventory = await extractPayrollCapabilityInventory();
  assert.equal(new Set(PAYROLL_CAPABILITY_LEDGER.map((entry) => entry.capability_id)).size, PAYROLL_CAPABILITY_LEDGER.length);
  assert.deepEqual(
    sortedUnique(PAYROLL_CAPABILITY_LEDGER.map((entry) => entry.route_policy_id)),
    inventory.route_policies.map((policy) => policy.id).sort(),
    "a registered server payroll route policy is absent from the ledger, or the ledger names a policy that is not registered",
  );
  for (const entry of PAYROLL_CAPABILITY_LEDGER) {
    const registered = inventory.route_policies.find((policy) => policy.id === entry.route_policy_id);
    assert.ok(registered, `${entry.route_policy_id} is not registered by the server`);
    assert.equal(registered.registered, true, `${entry.route_policy_id} is declared but not wired into the server`);
    if (registered.authentication === "session_scope") {
      const policy = resolveHrxRoutePolicy({ method: entry.method, pathname: entry.path });
      assert.ok(policy, `${entry.method} ${entry.path} is missing a session route policy`);
      assert.equal(policy.id, entry.route_policy_id, `${entry.capability_id} resolved to the wrong policy`);
    } else {
      assert.equal(entry.method, registered.method, `${entry.capability_id} uses the wrong external route method`);
      assert.equal(entry.path, registered.pathname, `${entry.capability_id} uses the wrong external route path`);
    }
    assert.equal(entry.production_ready_claim, false);
    assert.ok(PAYROLL_CAPABILITY_AUDIT.classification_values.includes(entry.classification));
  }
});

test("PEO-TUW-060 keeps client exports and the global infrastructure inventory equal in both directions", async () => {
  const inventory = await extractPayrollCapabilityInventory();
  assert.equal(inventory.inventory_sha256, hashPayrollCapabilityInventory(inventory));
  assert.deepEqual(
    sortedUnique(PAYROLL_CAPABILITY_LEDGER.map((entry) => entry.client_function).filter(Boolean)),
    inventory.client_functions,
    "the payroll web client and capability ledger differ",
  );
  for (const entry of PAYROLL_CAPABILITY_LEDGER.filter((candidate) => candidate.client_function)) {
    const clientCapability = inventory.client_capabilities.find(
      (candidate) => candidate.client_function === entry.client_function,
    );
    assert.ok(clientCapability, `${entry.client_function} was not extracted from the web client`);
    assert.equal(clientCapability.method, entry.method, `${entry.client_function} uses a different HTTP method`);
    const policy = resolveHrxRoutePolicy({
      method: clientCapability.method,
      pathname: clientCapability.pathname_sample,
    });
    assert.equal(
      policy?.id,
      entry.route_policy_id,
      `${entry.client_function} calls a route governed by ${policy?.id ?? "no policy"}, not ${entry.route_policy_id}`,
    );
  }
  assert.deepEqual(
    PAYROLL_INFRASTRUCTURE_INVENTORY.migration_ids,
    inventory.migrations.map((migration) => migration.migration_id),
    "the audited payroll migration inventory and loaded HRX migrations differ",
  );
  assert.deepEqual(
    PAYROLL_INFRASTRUCTURE_INVENTORY.schema_identifiers,
    inventory.schema_identifiers,
    "the audited global schema inventory and extracted payroll migration schemas differ",
  );
  assert.deepEqual(
    PAYROLL_INFRASTRUCTURE_INVENTORY.provider_ports,
    inventory.provider_ports,
    "the audited global provider-port inventory and payroll runtime injection ports differ",
  );
  assert.equal(PAYROLL_INFRASTRUCTURE_INVENTORY.attribution, "global_extracted_inventory");
  assert.equal(PAYROLL_INFRASTRUCTURE_INVENTORY.production_ready_claim, false);
  assert.ok(inventory.authority_source_hashes.source_count > 0);
  for (const [name, hash] of Object.entries(inventory.authority_source_hashes)) {
    if (name !== "source_count") assert.match(hash, /^[a-f0-9]{64}$/, `${name} must bind the extracted source set`);
  }
  for (const migration of inventory.migrations) {
    assert.ok(migration.schema_identifiers.length > 0, `${migration.migration_id} has no extracted schema identifier`);
  }
});

test("PEO-TUW-060 records the exact server-endpoint-without-active-UI list and active UI gap", () => {
  const apiWithoutActiveUi = PAYROLL_CAPABILITY_LEDGER
    .filter((entry) => entry.ui_surfaces.length === 0)
    .map((entry) => entry.capability_id)
    .sort();
  assert.deepEqual(apiWithoutActiveUi, [
    "dashboard.summary",
    "filing.list",
    "legacy.approve",
    "legacy.export",
    "legacy.preview",
    "payment.read",
    "profile.self",
    "statement.provider_callback",
  ]);
  assert.deepEqual(
    PAYROLL_CAPABILITY_LEDGER.filter((entry) => entry.classification === "ui_gap").map((entry) => entry.capability_id),
    ["profile.self"],
  );
});

test("PEO-TUW-060 keeps production readiness false until package, approvals, and provider receipts exist", () => {
  assert.equal(PAYROLL_CAPABILITY_AUDIT.production_ready_claim, false);
  assert.ok(PAYROLL_CAPABILITY_AUDIT.evidence_missing.includes("delivery_production_receipt"));
  assert.ok(PAYROLL_CAPABILITY_AUDIT.evidence_missing.includes("bank_production_receipt"));
  assert.ok(PAYROLL_CAPABILITY_AUDIT.evidence_missing.includes("filing_production_receipt"));
  assert.equal(evaluatePayrollReadiness(internal).production_approved, false);
  assert.equal(evaluatePayrollReadiness(internal).go_live, false);
});
