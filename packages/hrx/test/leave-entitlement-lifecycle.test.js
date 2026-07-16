import test from "node:test";
import assert from "node:assert/strict";
import {
  HRX_LEAVE_ENTITLEMENT_STATES,
  deriveLeaveEntitlementLifecycle,
  previewLeaveEntitlementExpirations,
} from "../src/leave/entitlement-lifecycle.js";

const entitlement = Object.freeze({
  tenant_id: "tenant-001",
  entitlement_id: "entitlement-001",
  valid_from: "2026-07-14",
  expires_on: "2026-12-31",
});

test("LV-LIFE-001 derives scheduled, active, and expired with inclusive boundaries", () => {
  assert.deepEqual(HRX_LEAVE_ENTITLEMENT_STATES, ["scheduled", "active", "expired", "cancelled"]);
  assert.equal(deriveLeaveEntitlementLifecycle({ entitlement, as_of: "2026-07-13" }).state, "scheduled");
  assert.equal(deriveLeaveEntitlementLifecycle({ entitlement, as_of: "2026-07-14" }).state, "active");
  assert.equal(deriveLeaveEntitlementLifecycle({ entitlement, as_of: "2026-12-31" }).state, "active");
  assert.equal(deriveLeaveEntitlementLifecycle({ entitlement, as_of: "2027-01-01" }).state, "expired");
});

test("LV-LIFE-001 derives the local date in the requested IANA timezone", () => {
  const at = "2026-07-13T15:30:00.000Z";
  assert.deepEqual(
    deriveLeaveEntitlementLifecycle({ entitlement, at, timezone: "Asia/Seoul" }),
    {
      entitlement_id: "entitlement-001",
      state: "active",
      as_of: "2026-07-14",
      timezone: "Asia/Seoul",
      valid_from: "2026-07-14",
      expires_on: "2026-12-31",
      cancelled_by_entry_id: null,
    },
  );
  assert.equal(deriveLeaveEntitlementLifecycle({ entitlement, at, timezone: "UTC" }).state, "scheduled");
});

test("LV-LIFE-001 gives a grant reversal priority over date state", () => {
  const ledgerEntries = [
    {
      tenant_id: "tenant-001",
      entitlement_id: "entitlement-001",
      entry_id: "earned-001",
      entry_type: "earned",
      amount_minutes: 480,
      occurred_on: "2026-07-14",
    },
    {
      tenant_id: "tenant-001",
      entitlement_id: "entitlement-001",
      entry_id: "cancel-001",
      entry_type: "adjustment",
      adjustment_direction: "debit",
      amount_minutes: 480,
      occurred_on: "2026-07-20",
      reverses_entry_id: "earned-001",
    },
  ];

  assert.equal(
    deriveLeaveEntitlementLifecycle({ entitlement, ledger_entries: ledgerEntries, as_of: "2026-07-19" }).state,
    "active",
  );
  assert.deepEqual(
    deriveLeaveEntitlementLifecycle({ entitlement, ledger_entries: ledgerEntries, as_of: "2027-01-01" }),
    {
      entitlement_id: "entitlement-001",
      state: "cancelled",
      as_of: "2027-01-01",
      timezone: "Asia/Seoul",
      valid_from: "2026-07-14",
      expires_on: "2026-12-31",
      cancelled_by_entry_id: "cancel-001",
    },
  );
});

test("LV-LIFE-001 ignores unrelated or non-opposite reversals and validates dates", () => {
  assert.equal(
    deriveLeaveEntitlementLifecycle({
      entitlement,
      as_of: "2026-07-14",
      ledger_entries: [
        {
          tenant_id: "tenant-002",
          entitlement_id: "entitlement-001",
          entry_id: "other-tenant",
          entry_type: "adjustment",
          adjustment_direction: "debit",
          amount_minutes: 480,
          reverses_entry_id: "earned-001",
        },
      ],
    }).state,
    "active",
  );
  assert.equal(
    deriveLeaveEntitlementLifecycle({
      entitlement,
      as_of: "2026-07-14",
      ledger_entries: [
        {
          tenant_id: "tenant-001",
          entitlement_id: "entitlement-001",
          entry_id: "released-001",
          entry_type: "released",
          amount_minutes: 60,
        },
        {
          tenant_id: "tenant-001",
          entitlement_id: "entitlement-001",
          entry_id: "reserved-again-001",
          entry_type: "reserved",
          amount_minutes: 60,
          reverses_entry_id: "released-001",
        },
      ],
    }).state,
    "active",
  );
  assert.throws(
    () => deriveLeaveEntitlementLifecycle({ entitlement, as_of: "2026-02-30" }),
    /valid ISO date/,
  );
  assert.throws(
    () => deriveLeaveEntitlementLifecycle({ entitlement, as_of: "2026-07-14", timezone: "Moon/Base" }),
    /valid IANA timezone/,
  );
});

test("LV-LIFE-002 previews only positive expired balances after use and reservation", () => {
  const entitlements = [
    { ...entitlement, entitlement_id: "later", employee_id: "emp-001", valid_from: "2026-01-01", expires_on: "2026-06-30" },
    { ...entitlement, entitlement_id: "earlier", employee_id: "emp-001", valid_from: "2026-01-01", expires_on: "2026-05-31" },
    { ...entitlement, entitlement_id: "depleted", employee_id: "emp-001", valid_from: "2026-01-01", expires_on: "2026-04-30" },
    { ...entitlement, entitlement_id: "active", employee_id: "emp-001", valid_from: "2026-01-01", expires_on: "2026-12-31" },
  ];
  const ledgerEntries = [
    { tenant_id: "tenant-001", entitlement_id: "later", entry_id: "later-earned", entry_type: "earned", amount_minutes: 480, occurred_on: "2026-01-01" },
    { tenant_id: "tenant-001", entitlement_id: "later", entry_id: "later-used", entry_type: "used", amount_minutes: 120, occurred_on: "2026-03-01" },
    { tenant_id: "tenant-001", entitlement_id: "later", entry_id: "later-reserved", entry_type: "reserved", amount_minutes: 60, occurred_on: "2026-06-20" },
    { tenant_id: "tenant-001", entitlement_id: "earlier", entry_id: "earlier-earned", entry_type: "earned", amount_minutes: 240, occurred_on: "2026-01-01" },
    { tenant_id: "tenant-001", entitlement_id: "depleted", entry_id: "depleted-earned", entry_type: "earned", amount_minutes: 60, occurred_on: "2026-01-01" },
    { tenant_id: "tenant-001", entitlement_id: "depleted", entry_id: "depleted-expired", entry_type: "expired", amount_minutes: 60, occurred_on: "2026-05-01" },
    { tenant_id: "tenant-001", entitlement_id: "active", entry_id: "active-earned", entry_type: "earned", amount_minutes: 600, occurred_on: "2026-01-01" },
  ];

  const preview = previewLeaveEntitlementExpirations({
    entitlements,
    ledger_entries: ledgerEntries,
    as_of: "2026-07-01",
  });

  assert.deepEqual(preview.rows.map((row) => [row.entitlement_id, row.remaining_minutes]), [
    ["earlier", 240],
    ["later", 300],
  ]);
  assert.deepEqual(preview.totals, { candidate_count: 2, expiration_minutes: 540 });
});

test("LV-LIFE-002 restores released reservations and clamps negative balances", () => {
  const entitlements = [
    { ...entitlement, entitlement_id: "released", employee_id: "emp-001", valid_from: "2026-01-01", expires_on: "2026-06-30" },
    { ...entitlement, entitlement_id: "negative", employee_id: "emp-001", valid_from: "2026-01-01", expires_on: "2026-06-30" },
  ];
  const ledgerEntries = [
    { tenant_id: "tenant-001", entitlement_id: "released", entry_id: "released-earned", entry_type: "earned", amount_minutes: 480, occurred_on: "2026-01-01" },
    { tenant_id: "tenant-001", entitlement_id: "released", entry_id: "released-reserved", entry_type: "reserved", amount_minutes: 120, occurred_on: "2026-06-10" },
    { tenant_id: "tenant-001", entitlement_id: "released", entry_id: "released-release", entry_type: "released", amount_minutes: 120, occurred_on: "2026-06-11", reverses_entry_id: "released-reserved" },
    { tenant_id: "tenant-001", entitlement_id: "released", entry_id: "released-used", entry_type: "used", amount_minutes: 60, occurred_on: "2026-06-12" },
    { tenant_id: "tenant-001", entitlement_id: "negative", entry_id: "negative-earned", entry_type: "earned", amount_minutes: 60, occurred_on: "2026-01-01" },
    { tenant_id: "tenant-001", entitlement_id: "negative", entry_id: "negative-debit", entry_type: "adjustment", adjustment_direction: "debit", amount_minutes: 90, occurred_on: "2026-06-12" },
  ];

  const preview = previewLeaveEntitlementExpirations({
    entitlements,
    ledger_entries: ledgerEntries,
    as_of: "2026-07-01",
  });

  assert.deepEqual(preview.rows.map((row) => [row.entitlement_id, row.remaining_minutes]), [["released", 420]]);
  assert.deepEqual(preview.totals, { candidate_count: 1, expiration_minutes: 420 });
});
