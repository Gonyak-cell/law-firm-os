import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_G6B_TUW_COVERAGE,
  createAnalyticsG6ARAgingDashboardDescriptor,
  createAnalyticsG6AnalyticsExportControlDescriptor,
  createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor,
  createAnalyticsG6ClientHealthDashboardDescriptor,
  createAnalyticsG6PracticePnlDashboardDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6b_validator";
const actor_id = "actor_g6b";
const client_group_id = "client_group_g6b";
const practice_id = "practice_g6b";
const role_id = "role_finance_partner";

function arRow(overrides = {}) {
  return { tenant_id, matter_id: "matter_ar_g6b", overdue_amount: 1200, bucket: "61-90", ...overrides };
}

function healthRow(overrides = {}) {
  return { tenant_id, client_group_id, health_score: 88, visible_summary: "healthy", ...overrides };
}

function pnlRow(overrides = {}) {
  return { tenant_id, practice_id, visible_to_role: role_id, pnl_amount: 5000, ...overrides };
}

function exportRow(overrides = {}) {
  return { tenant_id, read_model_id: "read_model_g6b", masked_client_ref: "client_hash_001", amount: 900, ...overrides };
}

test("G6-B AR aging dashboard descriptor requires finance permission evidence", () => {
  const descriptor = createAnalyticsG6ARAgingDashboardDescriptor({
    tenant_id,
    actor_id,
    permissions: ["finance:ar:read"],
    ar_aging_rows: [arRow()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.ar_aging_receipt.finance_permission_tested, true);
  assert.equal(descriptor.ar_aging_receipt.dashboard_persisted, false);

  const blocked = createAnalyticsG6ARAgingDashboardDescriptor({
    tenant_id,
    actor_id,
    permissions: [],
    ar_aging_rows: [arRow({ tenant_id: "other" })],
    source_object_mutated: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("ar_aging_finance_permission_required"));
  assert.ok(blocked.blocked_claims.includes("ar_aging_cross_tenant_blocked"));
  assert.ok(blocked.blocked_claims.includes("ar_aging_source_mutation_blocked"));
});

test("G6-B client health dashboard descriptor omits conflict and matter details", () => {
  const descriptor = createAnalyticsG6ClientHealthDashboardDescriptor({
    tenant_id,
    client_group_id,
    client_health_rows: [healthRow()],
    conflict_detail_omitted: true,
    matter_detail_omitted: true,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.client_health_receipt.conflict_detail_omission_tested, true);
  assert.equal(descriptor.client_health_receipt.matter_detail_omission_tested, true);

  const blocked = createAnalyticsG6ClientHealthDashboardDescriptor({
    tenant_id,
    client_group_id,
    client_health_rows: [healthRow({ conflict_memo: "hidden conflict", internal_matter_detail: "internal" })],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("client_health_conflict_matter_detail_omission_required"));
  assert.ok(blocked.blocked_claims.includes("client_health_conflict_detail_exposure_blocked"));
  assert.ok(blocked.blocked_claims.includes("client_health_matter_detail_exposure_blocked"));
});

test("G6-B practice P&L dashboard descriptor requires role-based visibility", () => {
  const descriptor = createAnalyticsG6PracticePnlDashboardDescriptor({
    tenant_id,
    practice_id,
    role_id,
    permissions: ["analytics:practice-pnl:read"],
    practice_pnl_rows: [pnlRow()],
    role_visibility_tested: true,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.pnl_total, 5000);
  assert.equal(descriptor.practice_pnl_receipt.role_visibility_tested, true);

  const blocked = createAnalyticsG6PracticePnlDashboardDescriptor({
    tenant_id,
    practice_id,
    role_id,
    permissions: ["analytics:practice-pnl:read"],
    practice_pnl_rows: [pnlRow({ visible_to_role: "unauthorized_role" })],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("practice_pnl_role_visibility_required"));
  assert.ok(blocked.blocked_claims.includes("practice_pnl_unauthorized_visibility_blocked"));
});

test("G6-B analytics export descriptor requires audit, masking, and tenant scope", () => {
  const descriptor = createAnalyticsG6AnalyticsExportControlDescriptor({
    tenant_id,
    actor_id,
    export_id: "export_g6b",
    read_model_refs: [{ read_model_type: "MatterProfitability", read_model_id: "read_model_g6b" }],
    export_rows: [exportRow()],
    audit_receipt: { tenant_id, audit_event_id: "audit_g6b", export_id: "export_g6b" },
    masking_tested: true,
    tenant_scoped: true,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.analytics_export_receipt.export_audit_tested, true);
  assert.equal(descriptor.analytics_export_receipt.masking_tested, true);
  assert.equal(descriptor.analytics_export_receipt.tenant_scope_tested, true);

  const blocked = createAnalyticsG6AnalyticsExportControlDescriptor({
    tenant_id,
    actor_id,
    export_id: "export_g6b",
    read_model_refs: [],
    export_rows: [exportRow({ privileged_text: "unmasked" })],
    audit_receipt: { tenant_id: "other", audit_event_id: "audit_g6b", export_id: "export_g6b" },
    tenant_scoped: false,
    source_object_mutated: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("analytics_export_read_model_rows_required"));
  assert.ok(blocked.blocked_claims.includes("analytics_export_audit_masking_required"));
  assert.ok(blocked.blocked_claims.includes("analytics_export_tenant_scope_required"));
  assert.ok(blocked.blocked_claims.includes("analytics_export_unmasked_sensitive_data_blocked"));
  assert.ok(blocked.blocked_claims.includes("analytics_export_source_mutation_blocked"));
});

test("G6-B closeout descriptor summarizes dashboard export read-model-only evidence", () => {
  const ar = createAnalyticsG6ARAgingDashboardDescriptor({
    tenant_id,
    actor_id,
    permissions: ["finance:ar:read"],
    ar_aging_rows: [arRow()],
  });
  const health = createAnalyticsG6ClientHealthDashboardDescriptor({
    tenant_id,
    client_group_id,
    client_health_rows: [healthRow()],
    conflict_detail_omitted: true,
    matter_detail_omitted: true,
  });
  const pnl = createAnalyticsG6PracticePnlDashboardDescriptor({
    tenant_id,
    practice_id,
    role_id,
    permissions: ["analytics:practice-pnl:read"],
    practice_pnl_rows: [pnlRow()],
    role_visibility_tested: true,
  });
  const exportControl = createAnalyticsG6AnalyticsExportControlDescriptor({
    tenant_id,
    actor_id,
    export_id: "export_g6b",
    read_model_refs: [{ read_model_type: "MatterProfitability", read_model_id: "read_model_g6b" }],
    export_rows: [exportRow()],
    audit_receipt: { tenant_id, audit_event_id: "audit_g6b", export_id: "export_g6b" },
    masking_tested: true,
    tenant_scoped: true,
  });

  const closeout = createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor({
    tenant_id,
    descriptors: [ar, health, pnl, exportControl],
    read_model_foundation_closed: true,
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 5);
  assert.equal(closeout.finance_permission_tested, true);
  assert.equal(closeout.conflict_matter_detail_omission_tested, true);
  assert.equal(closeout.role_visibility_tested, true);
  assert.equal(closeout.export_audit_masking_tested, true);
  assert.equal(closeout.read_model_only_evidence_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(ANALYTICS_G6B_TUW_COVERAGE.length, 5);
});
