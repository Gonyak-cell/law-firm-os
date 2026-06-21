import assert from "node:assert/strict";
import test from "node:test";
import { scanRuntimeRouteAuditCoverage } from "../../audit/src/index.js";
import {
  RUNTIME_SURFACE_DEFAULT_PRINCIPAL,
  RUNTIME_SURFACE_ERROR_CODES,
  RUNTIME_SURFACE_ROUTE_CATALOG,
  createRuntimeSurfaceService
} from "../src/index.js";

test("Runtime surface fails closed without server-derived principal or permission context", () => {
  const service = createRuntimeSurfaceService();
  const noPrincipal = service.listClients({
    principal: { tenant_id: "tenant-runtime-spine", user_id: "caller" },
    permission_context_id: "ctx-a"
  });
  assert.deepEqual(noPrincipal.body.safe_error_codes, [RUNTIME_SURFACE_ERROR_CODES.server_principal_required]);
  const noPermission = service.listClients({ principal: RUNTIME_SURFACE_DEFAULT_PRINCIPAL });
  assert.deepEqual(noPermission.body.safe_error_codes, [RUNTIME_SURFACE_ERROR_CODES.permission_context_required]);
});

test("Runtime surface writes audit events and route coverage includes read write permission export", () => {
  const service = createRuntimeSurfaceService();
  const request = { principal: RUNTIME_SURFACE_DEFAULT_PRINCIPAL, permission_context_id: "audit-test" };
  service.listClients(request);
  service.createClient({ ...request, client_id: "client-a", party_id: "party-runtime-spine", display_name: "Client A" });
  service.evaluatePermission(request);
  service.exportVault({ ...request, matter_id: "matter-runtime-spine" });
  assert.equal(service.auditEvents().length, 4);
  const coverage = scanRuntimeRouteAuditCoverage(RUNTIME_SURFACE_ROUTE_CATALOG);
  assert.equal(coverage.ok, true);
  assert.deepEqual(coverage.covered_categories, ["export", "permission", "read", "write"]);
});

test("Runtime surface returns review-required and denied states without count leaks", () => {
  const service = createRuntimeSurfaceService();
  const review = service.listClients({
    principal: RUNTIME_SURFACE_DEFAULT_PRINCIPAL,
    permission_context_id: "review-test",
    decision: { effect: "review_required", reason: "human_review" }
  });
  assert.equal(review.body.outcome, "review_required");
  assert.equal(review.body.count_leak_prevented, true);
  const denied = service.createClient({
    principal: { ...RUNTIME_SURFACE_DEFAULT_PRINCIPAL, role_ids: ["member"] },
    permission_context_id: "deny-test",
    client_id: "client-denied",
    party_id: "party-runtime-spine",
    display_name: "Denied"
  });
  assert.equal(denied.body.outcome, "denied");
  assert.equal(denied.body.count_leak_prevented, true);
});
