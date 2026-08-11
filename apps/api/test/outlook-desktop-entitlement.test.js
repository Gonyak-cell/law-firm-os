import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  evaluateOutlookDesktopEntitlement,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";

function syntheticEntries(count = 10) {
  return Array.from({ length: count }, (_, index) => ({
    tenant_id: "tenant-synthetic-a",
    user_id: `user-synthetic-${String(index + 1).padStart(2, "0")}`,
    entra_subject_id: `subject-synthetic-${String(index + 1).padStart(2, "0")}`,
    enabled: true,
  }));
}

function syntheticRoster(entries = syntheticEntries()) {
  return {
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "synthetic-v1",
    entries,
  };
}

function principal(index = 1, overrides = {}) {
  return {
    tenant_id: "tenant-synthetic-a",
    user_id: `user-synthetic-${String(index).padStart(2, "0")}`,
    entra_subject_id: `subject-synthetic-${String(index).padStart(2, "0")}`,
    scopes: [OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE],
    ...overrides,
  };
}

test("exact-ten composite roster approves a matching server principal", () => {
  const roster = parseOutlookDesktopAutoconnectRoster(
    JSON.stringify(syntheticRoster()),
  );
  const decision = evaluateOutlookDesktopEntitlement({
    principal: principal(),
    roster,
  });

  assert.equal(roster.entries.length, 10);
  assert.equal(Object.isFrozen(roster), true);
  assert.equal(Object.isFrozen(roster.entries), true);
  assert.deepEqual(decision, {
    status: "approved",
    eligible: true,
    safe_error_code: null,
    roster_version: "synthetic-v1",
  });
});

test("roster parser fails closed unless there are exactly ten unique complete tuples", () => {
  const duplicate = syntheticEntries();
  duplicate[9] = { ...duplicate[0] };
  const invalidRosters = [
    syntheticRoster(syntheticEntries(9)),
    syntheticRoster(syntheticEntries(11)),
    syntheticRoster(duplicate),
    syntheticRoster(syntheticEntries().map((entry, index) => (
      index === 0 ? { ...entry, entra_subject_id: "" } : entry
    ))),
    { ...syntheticRoster(), schema_version: "lawos.invalid.v1" },
    { ...syntheticRoster(), entries: syntheticEntries().map((entry, index) => (
      index === 0 ? { ...entry, email: "must-not-be-authority.invalid" } : entry
    )) },
  ];

  for (const value of invalidRosters) {
    assert.throws(
      () => parseOutlookDesktopAutoconnectRoster(value),
      (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_ROSTER_INVALID",
    );
  }
});

test("an absent or eleventh principal is denied without returning roster identity", () => {
  const roster = parseOutlookDesktopAutoconnectRoster(syntheticRoster());
  const decision = evaluateOutlookDesktopEntitlement({
    principal: principal(11),
    roster,
  });

  assert.deepEqual(decision, {
    status: "disabled",
    eligible: false,
    safe_error_code: "OUTLOOK_DESKTOP_NOT_ENTITLED",
    roster_version: "synthetic-v1",
  });
  assert.doesNotMatch(JSON.stringify(decision), /tenant|user-synthetic|subject-synthetic/iu);
});

test("tenant user and Entra subject cross-products are all denied", () => {
  const roster = parseOutlookDesktopAutoconnectRoster(syntheticRoster());
  const mismatches = [
    principal(1, { tenant_id: "tenant-synthetic-b" }),
    principal(1, { user_id: "user-synthetic-02" }),
    principal(1, { entra_subject_id: "subject-synthetic-02" }),
  ];

  for (const candidate of mismatches) {
    assert.equal(
      evaluateOutlookDesktopEntitlement({ principal: candidate, roster }).eligible,
      false,
    );
  }
});

test("email-like client data cannot substitute for the Entra subject binding", () => {
  const roster = parseOutlookDesktopAutoconnectRoster(syntheticRoster());
  const decision = evaluateOutlookDesktopEntitlement({
    principal: principal(1, {
      entra_subject_id: null,
      email: "user-synthetic-01@example.invalid",
    }),
    roster,
  });

  assert.deepEqual(decision, {
    status: "disabled",
    eligible: false,
    safe_error_code: "OUTLOOK_DESKTOP_IDENTITY_BINDING_REQUIRED",
    roster_version: "synthetic-v1",
  });
});

test("missing or disabled roster membership fails closed before entitlement evaluation", () => {
  for (const entries of [
    syntheticEntries().map((entry, index) => (
      index === 0 ? { ...entry, enabled: false } : entry
    )),
    syntheticEntries().map((entry, index) => {
      if (index !== 0) return entry;
      const { enabled: _enabled, ...withoutEnabled } = entry;
      return withoutEnabled;
    }),
  ]) {
    assert.throws(
      () => parseOutlookDesktopAutoconnectRoster(syntheticRoster(entries)),
      (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_ROSTER_INVALID",
    );
  }

  const enabledRoster = parseOutlookDesktopAutoconnectRoster(syntheticRoster());

  assert.equal(
    evaluateOutlookDesktopEntitlement({
      principal: principal(1, { scopes: [] }),
      roster: enabledRoster,
    }).safe_error_code,
    "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
  );
});

test("missing or malformed runtime roster is unknown and fail closed", () => {
  for (const roster of [null, undefined, { entries: [] }]) {
    const decision = evaluateOutlookDesktopEntitlement({
      principal: principal(),
      roster,
    });
    assert.deepEqual(decision, {
      status: "unknown",
      eligible: false,
      safe_error_code: "OUTLOOK_DESKTOP_ROSTER_UNAVAILABLE",
      roster_version: null,
    });
  }
});

test("entitlement ignores installation-count hints", () => {
  const roster = parseOutlookDesktopAutoconnectRoster(syntheticRoster());
  const baseline = evaluateOutlookDesktopEntitlement({
    principal: principal(),
    roster,
  });

  for (let installationCount = 0; installationCount <= 11; installationCount += 1) {
    assert.deepEqual(
      evaluateOutlookDesktopEntitlement({
        principal: principal(),
        roster,
        installation_count: installationCount,
      }),
      baseline,
    );
  }
});
