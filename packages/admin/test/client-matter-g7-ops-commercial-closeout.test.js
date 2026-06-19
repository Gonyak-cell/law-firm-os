import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_G7B_TUW_COVERAGE,
  createAdminG7AdminAuditViewerDescriptor,
  createAdminG7BOpsCommercialCloseoutDescriptor,
  createAdminG7OperationsDashboardDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7b_admin";
const actor_id = "actor_g7b_admin";

function auditViewer(overrides = {}) {
  return {
    viewer_id: "audit_viewer_g7b",
    tenant_scoped: true,
    query: { tenant_id, event_type: "admin_change" },
    ...overrides,
  };
}

function operationsDashboard(overrides = {}) {
  return {
    tenant_id,
    dashboard_id: "ops_dashboard_g7b",
    tenant_scoped: true,
    widgets: [
      { widget_id: "latency", redacted: true, customer_payload_included: false },
      { widget_id: "deploy", redacted: true, customer_payload_included: false },
    ],
    ...overrides,
  };
}

test("G7-B admin audit viewer descriptor requires tenant-scoped query", () => {
  const descriptor = createAdminG7AdminAuditViewerDescriptor({
    tenant_id,
    actor_id,
    audit_viewer: auditViewer(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.admin_audit_viewer_receipt.tenant_scoped_query_tested, true);
  assert.equal(descriptor.admin_audit_viewer_receipt.unauthorized_rows_omitted, true);

  const blocked = createAdminG7AdminAuditViewerDescriptor({
    tenant_id,
    actor_id,
    audit_viewer: auditViewer({
      tenant_scoped: false,
      query: { tenant_id: "tenant_other" },
      exposes_unauthorized_admin_rows: true,
      exposes_hidden_policy_internals: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("admin_audit_viewer_tenant_scoped_query_required"));
  assert.ok(blocked.blocked_claims.includes("admin_audit_viewer_unauthorized_rows_blocked"));
  assert.ok(blocked.blocked_claims.includes("admin_audit_viewer_hidden_policy_internals_blocked"));
  assert.ok(blocked.blocked_claims.includes("admin_audit_viewer_runtime_dispatch_blocked"));
});

test("G7-B operations dashboard descriptor blocks customer data and count leaks", () => {
  const descriptor = createAdminG7OperationsDashboardDescriptor({
    tenant_id,
    actor_id,
    operations_dashboard: operationsDashboard(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.operations_dashboard_receipt.tenant_scope_tested, true);
  assert.equal(descriptor.operations_dashboard_receipt.no_customer_data_leak_tested, true);

  const blocked = createAdminG7OperationsDashboardDescriptor({
    tenant_id,
    actor_id,
    operations_dashboard: operationsDashboard({
      tenant_scoped: false,
      widgets: [{ widget_id: "leaky", redacted: false, customer_payload_included: true }],
      customer_data_leak: true,
      unauthorized_count_leak: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("operations_dashboard_tenant_scope_required"));
  assert.ok(blocked.blocked_claims.includes("operations_dashboard_customer_data_leak_blocked"));
  assert.ok(blocked.blocked_claims.includes("operations_dashboard_unauthorized_count_leak_blocked"));
  assert.ok(blocked.blocked_claims.includes("operations_dashboard_runtime_dispatch_blocked"));
});

test("G7-B ops commercial closeout summarizes five TUWs without release readiness claim", () => {
  const deployment = { tuw_id: "LFOS-G7-W12-T006", outcome: "review_required" };
  const compliance = { tuw_id: "LFOS-G7-W12-T007", outcome: "review_required" };
  const audit = createAdminG7AdminAuditViewerDescriptor({
    tenant_id,
    actor_id,
    audit_viewer: auditViewer(),
  });
  const dashboard = createAdminG7OperationsDashboardDescriptor({
    tenant_id,
    actor_id,
    operations_dashboard: operationsDashboard(),
  });
  const opsCloseout = { tuw_id: "LFOS-G7-W12-T010", outcome: "review_required" };

  const closeout = createAdminG7BOpsCommercialCloseoutDescriptor({
    tenant_id,
    g7a_handoff_validated: true,
    g7_entry_plan_validated: true,
    descriptors: [deployment, compliance, audit, dashboard, opsCloseout],
  });

  assert.deepEqual(closeout.tuw_coverage, ADMIN_G7B_TUW_COVERAGE);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.release_readiness_claim, "open");
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createAdminG7BOpsCommercialCloseoutDescriptor({
    tenant_id,
    descriptors: [deployment],
    claims_release_readiness: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("g7_ops_closeout_requires_g7a_handoff"));
  assert.ok(blocked.blocked_claims.includes("g7_ops_closeout_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("g7_ops_closeout_release_readiness_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("g7_ops_closeout_go_live_claim_blocked"));
});
