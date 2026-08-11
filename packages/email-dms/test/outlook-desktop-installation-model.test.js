import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_DESKTOP_INSTALLATION_LEASE_MS,
  assertOutlookDesktopInstallationBinding,
  createOutlookDesktopInstallation,
  heartbeatOutlookDesktopInstallation,
  projectOutlookDesktopInstallation,
  retireOutlookDesktopInstallation,
} from "../src/outlook-desktop-installation-model.js";

const REGISTERED_AT = "2026-08-11T00:00:00.000Z";
const PUBLIC_KEY = `MCowBQYDK2VwAyEA${"a".repeat(44)}`;
const FINGERPRINT = "1".repeat(64);

function input(overrides = {}) {
  return {
    tenant_id: "tenant-install-a",
    user_id: "user-install-a",
    entra_subject_id: "subject-install-a",
    device_public_key: PUBLIC_KEY,
    device_key_fingerprint: FINGERPRINT,
    platform: "darwin",
    app_version: "0.1.26",
    source_sha: "2".repeat(40),
    ...overrides,
  };
}

function create(overrides = {}) {
  return createOutlookDesktopInstallation(input(overrides), {
    now: REGISTERED_AT,
    installation_id_factory: () => "odi_1234567890abcdefghijklmn",
  });
}

test("registration creates an active server-issued seven-day lease", () => {
  const installation = create();
  const projection = projectOutlookDesktopInstallation(installation, {
    now: REGISTERED_AT,
  });

  assert.equal(OUTLOOK_DESKTOP_INSTALLATION_LEASE_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(installation.installation_id, "odi_1234567890abcdefghijklmn");
  assert.equal(installation.registered_at, REGISTERED_AT);
  assert.equal(installation.last_seen_at, REGISTERED_AT);
  assert.equal(installation.lease_expires_at, "2026-08-18T00:00:00.000Z");
  assert.equal(installation.state_version, 1);
  assert.equal(Object.isFrozen(installation), true);
  assert.deepEqual(projection, {
    installation_id: installation.installation_id,
    status: "active",
    state_version: 1,
    lease_expires_at: "2026-08-18T00:00:00.000Z",
    retired_at: null,
  });
});

test("several devices for one approved principal receive separate installation IDs", () => {
  const ids = ["odi_1234567890abcdefghijklmn", "odi_abcdefghijklmnopqrstuvwx"];
  const installations = ids.map((installationId, index) => (
    createOutlookDesktopInstallation(
      input({ device_key_fingerprint: String(index + 1).repeat(64) }),
      {
        now: REGISTERED_AT,
        installation_id_factory: () => installationId,
      },
    )
  ));

  assert.equal(installations[0].user_id, installations[1].user_id);
  assert.notEqual(installations[0].installation_id, installations[1].installation_id);
});

test("expired is derived at the exact server-time lease boundary", () => {
  const installation = create();

  assert.equal(
    projectOutlookDesktopInstallation(installation, {
      now: "2026-08-17T23:59:59.999Z",
    }).status,
    "active",
  );
  assert.equal(
    projectOutlookDesktopInstallation(installation, {
      now: "2026-08-18T00:00:00.000Z",
    }).status,
    "expired",
  );
  assert.equal(installation.retired_at, null);
});

test("same-bound principal and key resume an expired installation", () => {
  const installation = create();
  const result = heartbeatOutlookDesktopInstallation(
    installation,
    {
      ...input(),
      expected_state_version: 1,
    },
    { now: "2026-08-20T00:00:00.000Z" },
  );

  assert.equal(result.transition, "resumed");
  assert.equal(result.installation.installation_id, installation.installation_id);
  assert.equal(result.installation.device_key_fingerprint, FINGERPRINT);
  assert.equal(result.installation.last_seen_at, "2026-08-20T00:00:00.000Z");
  assert.equal(result.installation.lease_expires_at, "2026-08-27T00:00:00.000Z");
  assert.equal(result.installation.state_version, 2);
});

test("active heartbeat renews from server time and increments state version once", () => {
  const installation = create();
  const result = heartbeatOutlookDesktopInstallation(
    installation,
    { ...input(), expected_state_version: 1 },
    { now: "2026-08-12T00:00:00.000Z" },
  );

  assert.equal(result.transition, "heartbeat");
  assert.equal(result.installation.lease_expires_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.installation.state_version, 2);
});

test("retirement is terminal and repeated retirement does not advance version", () => {
  const installation = create();
  const retired = retireOutlookDesktopInstallation(
    installation,
    {
      ...input(),
      expected_state_version: 1,
      retire_reason: "device_disconnect",
    },
    { now: "2026-08-12T00:00:00.000Z" },
  );

  assert.equal(retired.transition, "retired");
  assert.equal(retired.installation.retired_at, "2026-08-12T00:00:00.000Z");
  assert.equal(retired.installation.retire_reason, "device_disconnect");
  assert.equal(retired.installation.state_version, 2);
  assert.equal(
    projectOutlookDesktopInstallation(retired.installation, {
      now: "2026-08-30T00:00:00.000Z",
    }).status,
    "retired",
  );
  const repeated = retireOutlookDesktopInstallation(
    retired.installation,
    {
      ...input(),
      expected_state_version: 2,
      retire_reason: "device_disconnect",
    },
    { now: "2026-08-13T00:00:00.000Z" },
  );
  assert.equal(repeated.transition, "already_retired");
  assert.equal(repeated.installation.state_version, 2);
  assert.throws(
    () => heartbeatOutlookDesktopInstallation(
      retired.installation,
      { ...input(), expected_state_version: 2 },
      { now: "2026-08-13T00:00:00.000Z" },
    ),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_INSTALLATION_RETIRED",
  );
});

test("stale state versions fail before heartbeat or retire transition", () => {
  const installation = create();
  for (const transition of [
    () => heartbeatOutlookDesktopInstallation(
      installation,
      { ...input(), expected_state_version: 2 },
      { now: "2026-08-12T00:00:00.000Z" },
    ),
    () => retireOutlookDesktopInstallation(
      installation,
      {
        ...input(),
        expected_state_version: 2,
        retire_reason: "device_disconnect",
      },
      { now: "2026-08-12T00:00:00.000Z" },
    ),
  ]) {
    assert.throws(
      transition,
      (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
    );
  }
});

test("tenant user subject and key fingerprint are an indivisible binding", () => {
  const installation = create();
  const mismatches = [
    input({ tenant_id: "tenant-install-b" }),
    input({ user_id: "user-install-b" }),
    input({ entra_subject_id: "subject-install-b" }),
    input({ device_key_fingerprint: "3".repeat(64) }),
  ];

  assert.equal(assertOutlookDesktopInstallationBinding(installation, input()), true);
  for (const candidate of mismatches) {
    assert.throws(
      () => assertOutlookDesktopInstallationBinding(installation, candidate),
      (error) => error?.safe_error_code
        === "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
    );
  }
});

test("invalid identity platform version source key and retire reason fail closed", () => {
  const invalidInputs = [
    input({ tenant_id: "" }),
    input({ user_id: "user@example.invalid" }),
    input({ entra_subject_id: null }),
    input({ device_public_key: "short" }),
    input({ device_key_fingerprint: "not-a-fingerprint" }),
    input({ platform: "linux" }),
    input({ app_version: "latest" }),
    input({ source_sha: "4".repeat(39) }),
  ];
  for (const candidate of invalidInputs) {
    assert.throws(
      () => createOutlookDesktopInstallation(candidate, {
        now: REGISTERED_AT,
        installation_id_factory: () => "odi_1234567890abcdefghijklmn",
      }),
      (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_INSTALLATION_INVALID",
    );
  }
  assert.throws(
    () => retireOutlookDesktopInstallation(
      create(),
      { ...input(), expected_state_version: 1, retire_reason: "delete_everything" },
      { now: "2026-08-12T00:00:00.000Z" },
    ),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_RETIRE_REASON_INVALID",
  );
});

test("default installation IDs are opaque and unique", () => {
  const first = createOutlookDesktopInstallation(input(), { now: REGISTERED_AT });
  const second = createOutlookDesktopInstallation(
    input({ device_key_fingerprint: "5".repeat(64) }),
    { now: REGISTERED_AT },
  );

  assert.match(first.installation_id, /^odi_[A-Za-z0-9_-]{20,128}$/u);
  assert.match(second.installation_id, /^odi_[A-Za-z0-9_-]{20,128}$/u);
  assert.notEqual(first.installation_id, second.installation_id);
});
