import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateLeaveTypeEconomics,
  normalizeLeavePolicyRules,
  normalizeLeaveTypeEconomics,
} from "../src/leave/type-economics.js";
import { createLeavePolicyService } from "../src/leave/policy-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

test("leave type economics calculates full, half, quarter, and rounded hourly usage in integer minutes", () => {
  const rules = normalizeLeavePolicyRules({
    reserve_on_submit: true,
    type_rules: {
      "type-annual": {
        usage_modes: ["full_day", "half_day", "quarter_day", "hours"],
        standard_day_minutes: 480,
        paid_ratio_bps: 10_000,
        deduction_ratio_bps: 10_000,
        rounding_minutes: 30,
        rounding_mode: "ceil",
      },
    },
  });

  for (const [durationMode, requestedMinutes] of [
    ["full_day", 480],
    ["half_day", 240],
    ["quarter_day", 120],
  ]) {
    assert.deepEqual(calculateLeaveTypeEconomics({
      rules,
      leave_type_id: "type-annual",
      duration_mode: durationMode,
      requested_minutes: requestedMinutes,
    }), {
      requested_minutes: requestedMinutes,
      rounded_requested_minutes: requestedMinutes,
      paid_minutes: requestedMinutes,
      unpaid_minutes: 0,
      deduction_minutes: requestedMinutes,
      standard_day_minutes: 480,
      duration_mode: durationMode,
    });
  }

  assert.deepEqual(calculateLeaveTypeEconomics({
    rules,
    leave_type_id: "type-annual",
    duration_mode: "hours",
    requested_minutes: 95,
  }), {
    requested_minutes: 95,
    rounded_requested_minutes: 120,
    paid_minutes: 120,
    unpaid_minutes: 0,
    deduction_minutes: 120,
    standard_day_minutes: 480,
    duration_mode: "hours",
  });
});

test("leave type economics separates paid time from balance deduction", () => {
  const result = calculateLeaveTypeEconomics({
    rules: {
      type_rules: {
        "type-unpaid": {
          usage_modes: ["hours"],
          standard_day_minutes: 480,
          paid_ratio_bps: 0,
          deduction_ratio_bps: 5_000,
          rounding_minutes: 15,
          rounding_mode: "nearest",
        },
      },
    },
    leave_type_id: "type-unpaid",
    duration_mode: "hours",
    requested_minutes: 62,
  });
  assert.equal(result.rounded_requested_minutes, 60);
  assert.equal(result.paid_minutes, 0);
  assert.equal(result.unpaid_minutes, 60);
  assert.equal(result.deduction_minutes, 30);
});

test("leave type economics rejects unsupported modes, ratios, rounding, and fields", () => {
  assert.throws(() => normalizeLeaveTypeEconomics({ usage_modes: ["full_day", "full_day"] }), /duplicates/);
  assert.throws(() => normalizeLeaveTypeEconomics({ paid_ratio_bps: 10_001 }), /paid_ratio_bps/);
  assert.throws(() => normalizeLeaveTypeEconomics({ rounding_minutes: 30, rounding_mode: "none" }), /rounding_minutes/);
  assert.throws(() => normalizeLeaveTypeEconomics({ unsupported: true }), /unsupported field/);
  assert.throws(() => calculateLeaveTypeEconomics({
    rules: { type_rules: { "type-annual": { usage_modes: ["day"] } } },
    leave_type_id: "type-annual",
    duration_mode: "full_day",
    requested_minutes: 480,
  }), /invalid mode/);
});

test("leave policy service persists only normalized type economics in draft versions", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const service = createLeavePolicyService({ store, clock: () => "2026-07-14T00:00:00.000Z" });
  const context = { tenant_id: "tenant-type-economics" };
  service.createGroup(context, { group_id: "group-annual", code: "ANNUAL", display_name: "연차" });

  const policy = service.createPolicyVersion(context, {
    policy_version_id: "policy-annual-v1",
    group_id: "group-annual",
    policy_code: "ANNUAL-KR",
    version: 1,
    effective_from: "2026-01-01",
    rules: {
      type_rules: {
        "type-annual": {
          usage_modes: ["full_day", "half_day"],
          paid_ratio_bps: 10_000,
          deduction_ratio_bps: 10_000,
        },
      },
    },
  });
  assert.deepEqual(policy.rules.type_rules["type-annual"], {
    usage_modes: ["full_day", "half_day"],
    standard_day_minutes: 480,
    paid_ratio_bps: 10_000,
    deduction_ratio_bps: 10_000,
    rounding_minutes: 1,
    rounding_mode: "none",
  });
  assert.throws(() => service.updatePolicyDraft(context, "policy-annual-v1", {
    rules: { type_rules: { "type-annual": { paid_ratio_bps: -1 } } },
  }), /paid_ratio_bps/);
  store.close();
});

