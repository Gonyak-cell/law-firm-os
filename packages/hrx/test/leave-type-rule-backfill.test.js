import assert from "node:assert/strict";
import test from "node:test";
import { createLeavePolicyService } from "../src/leave/policy-service.js";
import {
  createLeaveTypeRuleBackfillService,
  LEAVE_TYPE_RULE_BACKFILL_APPROVAL_SCHEMA_VERSION,
} from "../src/leave/type-rule-backfill.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-type-rule-backfill";
const NOW = "2026-07-15T01:00:00.000Z";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const policies = createLeavePolicyService({ store, clock: () => NOW });
  const context = { tenant_id: TENANT };
  policies.createGroup(context, { group_id: "annual", code: "ANNUAL", display_name: "연차" });
  policies.createType(context, { leave_type_id: "annual-full", group_id: "annual", code: "ANNUAL_FULL", display_name: "연차" });
  policies.createType(context, { leave_type_id: "annual-half", group_id: "annual", code: "ANNUAL_HALF", display_name: "반차" });
  policies.createPolicyVersion(context, {
    policy_version_id: "annual-v1",
    group_id: "annual",
    policy_code: "annual-kr",
    version: 1,
    effective_from: "2026-01-01",
    rules: { reserve_on_submit: true },
  });
  policies.publishPolicyVersion(context, "annual-v1");
  return { store, context, service: createLeaveTypeRuleBackfillService({ store, clock: () => NOW }) };
}

test("LV-TYPE-009 dry-run creates only inactive 1:1 draft rules and requires a matching owner approval", () => {
  const { store, context, service } = setup();
  const preview = service.preview(context, { effective_from: "2027-01-01" });
  assert.equal(preview.action_count, 1);
  assert.equal(preview.type_rule_count, 2);
  assert.deepEqual(Object.keys(preview.actions[0].type_rules), ["annual-full", "annual-half"]);
  assert.equal(store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: TENANT, policy_version_id: "annual-v1" } }).status, "active");
  assert.throws(
    () => service.execute(context, { effective_from: "2027-01-01", approval_manifest: { preview_hash: preview.preview_hash } }),
    (error) => error.safe_error_code === "HRX_LEAVE_TYPE_RULE_BACKFILL_APPROVAL_REQUIRED",
  );

  const result = service.execute(context, {
    effective_from: "2027-01-01",
    approval_manifest: {
      schema_version: LEAVE_TYPE_RULE_BACKFILL_APPROVAL_SCHEMA_VERSION,
      tenant_id: TENANT,
      preview_hash: preview.preview_hash,
      decision: "approved",
      approved_by_actor_id: "owner-001",
      approved_at: NOW,
    },
  });
  assert.equal(result.outcome, "drafts_created");
  assert.equal(result.rollback_manifest.actions[0].operation, "delete_draft");
  const draft = store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: TENANT, policy_code: "annual-kr", status: "draft" } });
  assert.equal(draft.version, 2);
  assert.equal(Object.keys(JSON.parse(draft.rules_json).type_rules).length, 2);
  assert.equal(store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: TENANT, policy_version_id: "annual-v1" } }).status, "active");
  assert.equal(service.preview(context, { effective_from: "2027-01-01" }).action_count, 0);
  store.close();
});

test("LV-TYPE-009 backfills an existing draft without replacing its policy fields", () => {
  const { store, context, service } = setup();
  const policies = createLeavePolicyService({ store, clock: () => NOW });
  policies.createNextPolicyVersion(context, "annual-v1", {
    policy_version_id: "annual-v2-owner-draft",
    effective_from: "2027-02-01",
    rules: { reserve_on_submit: false, type_rules: { "annual-full": { usage_modes: ["full_day"] } } },
  });
  const preview = service.preview(context, { effective_from: "2027-01-01" });
  assert.equal(preview.actions[0].operation, "update_draft");
  assert.deepEqual(Object.keys(preview.actions[0].type_rules), ["annual-half"]);
  const result = service.execute(context, {
    effective_from: "2027-01-01",
    approval_manifest: {
      schema_version: LEAVE_TYPE_RULE_BACKFILL_APPROVAL_SCHEMA_VERSION,
      tenant_id: TENANT,
      preview_hash: preview.preview_hash,
      decision: "approved",
      approved_by_actor_id: "owner-002",
    },
  });
  assert.equal(result.rollback_manifest.actions[0].operation, "restore_draft_rules");
  assert.equal(result.rollback_manifest.actions[0].before_rules.reserve_on_submit, false);
  const backfilledRules = JSON.parse(store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: TENANT, policy_version_id: "annual-v2-owner-draft" } }).rules_json);
  assert.equal(backfilledRules.reserve_on_submit, false);
  assert.deepEqual(backfilledRules.type_rules["annual-full"].usage_modes, ["full_day"]);
  assert.equal(backfilledRules.type_rules["annual-half"].paid_ratio_bps, 10_000);
  store.close();
});
