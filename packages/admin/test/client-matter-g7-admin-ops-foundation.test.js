import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_G7A_TUW_COVERAGE,
  createAdminG7AAdminOpsFoundationCloseoutDescriptor,
  createAdminG7PlanUsageModelDescriptor,
  createAdminG7TenantAdminSettingsDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7a_admin";
const actor_id = "actor_g7a_admin";

function settings(overrides = {}) {
  return {
    tenant_id,
    settings_id: "settings_g7a",
    admin_role: "tenant_admin",
    permission_checked: true,
    changed_fields: ["matter_numbering", "portal_default_acl"],
    ...overrides,
  };
}

function planUsage(overrides = {}) {
  return {
    tenant_id,
    plan_id: "plan_g7a",
    usage_period_id: "2026-06",
    change_audit_ref: "audit_plan_change_g7a",
    billing_workflow_ref: "billing_review_g7a",
    ...overrides,
  };
}

test("G7-A tenant admin settings descriptor requires admin permission and tenant scope", () => {
  const descriptor = createAdminG7TenantAdminSettingsDescriptor({
    tenant_id,
    actor_id,
    settings: settings(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.tenant_admin_settings_receipt.admin_permission_tested, true);
  assert.equal(descriptor.tenant_admin_settings_receipt.tenant_scope_tested, true);
  assert.equal(descriptor.tenant_admin_settings_receipt.settings_persisted, false);
  assert.equal(descriptor.g7_runtime_readiness_claim, "open");

  const blocked = createAdminG7TenantAdminSettingsDescriptor({
    tenant_id,
    actor_id,
    settings: settings({
      tenant_id: "tenant_other",
      admin_role: "viewer",
      permission_checked: false,
      writes_product_state: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("tenant_admin_settings_cross_tenant_blocked"));
  assert.ok(blocked.blocked_claims.includes("tenant_admin_settings_admin_permission_required"));
  assert.ok(blocked.blocked_claims.includes("tenant_admin_settings_product_write_blocked"));
  assert.ok(blocked.blocked_claims.includes("tenant_admin_settings_runtime_dispatch_blocked"));
});

test("G7-A plan usage descriptor requires audit and reviewed billing workflow", () => {
  const descriptor = createAdminG7PlanUsageModelDescriptor({
    tenant_id,
    actor_id,
    plan_usage: planUsage(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.plan_usage_receipt.plan_change_audit_tested, true);
  assert.equal(descriptor.plan_usage_receipt.billing_workflow_review_required, true);
  assert.equal(descriptor.plan_usage_receipt.billing_state_mutated, false);

  const blocked = createAdminG7PlanUsageModelDescriptor({
    tenant_id,
    actor_id,
    plan_usage: planUsage({
      change_audit_ref: "",
      billing_workflow_ref: "",
      direct_billing_write: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("plan_usage_change_audit_required"));
  assert.ok(blocked.blocked_claims.includes("plan_usage_billing_workflow_review_required"));
  assert.ok(blocked.blocked_claims.includes("plan_usage_direct_billing_write_blocked"));
  assert.ok(blocked.blocked_claims.includes("plan_usage_runtime_dispatch_blocked"));
});

test("G7-A admin ops closeout keeps enterprise trust and go-live claims open", () => {
  const adminSettings = createAdminG7TenantAdminSettingsDescriptor({
    tenant_id,
    actor_id,
    settings: settings(),
  });
  const planUsageDescriptor = createAdminG7PlanUsageModelDescriptor({
    tenant_id,
    actor_id,
    plan_usage: planUsage(),
  });
  const observability = { tuw_id: "LFOS-G7-W12-T003", outcome: "review_required" };
  const incident = { tuw_id: "LFOS-G7-W12-T004", outcome: "review_required" };
  const release = { tuw_id: "LFOS-G7-W12-T005", outcome: "review_required" };

  const closeout = createAdminG7AAdminOpsFoundationCloseoutDescriptor({
    tenant_id,
    g7_entry_plan_validated: true,
    g6_handoff_validated: true,
    descriptors: [adminSettings, planUsageDescriptor, observability, incident, release],
  });

  assert.deepEqual(closeout.tuw_coverage, ADMIN_G7A_TUW_COVERAGE);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(closeout.closeout_receipt.enterprise_trust_claimed, false);
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createAdminG7AAdminOpsFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [adminSettings],
    claims_enterprise_trust: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("g7_admin_ops_requires_g7_entry_plan_handoff"));
  assert.ok(blocked.blocked_claims.includes("g7_admin_ops_foundation_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("g7_admin_ops_enterprise_trust_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("g7_admin_ops_go_live_claim_blocked"));
});
