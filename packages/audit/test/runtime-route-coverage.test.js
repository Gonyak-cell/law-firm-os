import assert from "node:assert/strict";
import test from "node:test";
import { scanRuntimeRouteAuditCoverage } from "../src/index.js";

test("Runtime route audit coverage scanner covers read, write, permission, and export categories", () => {
  const coverage = scanRuntimeRouteAuditCoverage([
    { route: "GET /api/matters", audit_required: true, audit_action: "runtime.read" },
    { route: "POST /api/matters", audit_required: true, audit_action: "runtime.write" },
    { route: "POST /api/permission", audit_required: true, audit_action: "permission.evaluate" },
    { route: "POST /api/vault/export", audit_required: true, audit_action: "runtime.export" }
  ]);
  assert.equal(coverage.ok, true);
  assert.deepEqual(coverage.covered_categories, ["export", "permission", "read", "write"]);
});

test("Runtime route audit coverage scanner fails when route audit is bypassable", () => {
  const coverage = scanRuntimeRouteAuditCoverage([
    { route: "GET /api/matters", audit_required: true, audit_action: "runtime.read" },
    { route: "POST /api/matters", audit_required: false, audit_action: "runtime.write" }
  ]);
  assert.equal(coverage.ok, false);
  assert.equal(coverage.missing[0].reason, "audit_required_false");
  assert.ok(coverage.missing_categories.includes("permission"));
});
