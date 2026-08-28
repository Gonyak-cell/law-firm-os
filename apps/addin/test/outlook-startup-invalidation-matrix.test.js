import assert from "node:assert/strict";
import test from "node:test";

import { OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS } from "../src/outlook-startup-preparation-record.js";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";
import {
  OTHER_PRINCIPAL_REF,
  PREPARATION_KEY,
  connectionResponse,
  readyStore,
  signedSession,
  startupFixture,
  subject,
} from "./helpers/outlook-startup-runtime-fixture.js";

function installationInvalidReadiness(state) {
  const readiness = readyOutlookReadinessResponse();
  readiness.item.installation.state = state;
  readiness.item.installation.release_trusted = false;
  readiness.item.installation.lease_expires_at = "2026-08-11T02:59:59.000Z";
  readiness.item.next_action = "heartbeat";
  readiness.item.safe_error_codes = [
    state === "expired"
      ? "OUTLOOK_DESKTOP_INSTALLATION_EXPIRED"
      : "OUTLOOK_DESKTOP_RELEASE_UNTRUSTED",
  ];
  return readiness;
}

const TERMINAL_INVALIDATORS = Object.freeze([
  Object.freeze({
    id: "logout",
    fixture: () => ({
      session: { authenticated: false, safe_error_code: "LAWOS_INTERACTION_REQUIRED" },
    }),
    expected: ["login_required", "interaction_required", false],
  }),
  Object.freeze({
    id: "account-mismatch",
    fixture: () => ({
      session: signedSession({ outlook_desktop_principal_ref: OTHER_PRINCIPAL_REF }),
    }),
    expected: ["revoked", "account_mismatch", true],
  }),
  Object.freeze({
    id: "startup-401",
    fixture: () => ({ failPath: "/api/outlook/readiness", failStatus: 401 }),
    expected: ["login_required", "no_credential", false],
  }),
  Object.freeze({
    id: "startup-403",
    fixture: () => ({ failPath: "/api/outlook/readiness", failStatus: 403 }),
    expected: ["deferred", "transient_failure", true],
  }),
  Object.freeze({
    id: "release-revoked",
    fixture: () => ({ readiness: installationInvalidReadiness("active") }),
    expected: ["revoked", "installation_revoked", true],
  }),
  Object.freeze({
    id: "lease-expired",
    fixture: () => ({ readiness: installationInvalidReadiness("expired") }),
    expected: ["revoked", "installation_revoked", true],
  }),
]);

test("terminal startup invalidators clear an old READY and never reach bootstrap", async () => {
  assert.deepEqual(TERMINAL_INVALIDATORS.map(({ id }) => id), [
    "logout",
    "account-mismatch",
    "startup-401",
    "startup-403",
    "release-revoked",
    "lease-expired",
  ]);
  for (const invalidator of TERMINAL_INVALIDATORS) {
    const store = await readyStore();
    assert.notEqual(store.raw(), null, `${invalidator.id}: precondition`);
    const fixture = startupFixture({ store, ...invalidator.fixture() });
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(fixture.input);
    assert.deepEqual(
      [result.state, result.reason, result.authenticated],
      invalidator.expected,
      invalidator.id,
    );
    assert.equal(
      fixture.events.includes("/api/outlook/bootstrap"),
      false,
      invalidator.id,
    );
    assert.equal(store.raw(), null, invalidator.id);
  }
});

function installationVersionReadiness(stateVersion) {
  const readiness = readyOutlookReadinessResponse();
  readiness.item.installation.state_version = stateVersion;
  readiness.item.snapshot.version_vector.installation_state_version = stateVersion;
  return readiness;
}

function expiredReady(store) {
  const record = JSON.parse(store.raw());
  record.prepared_at = 0;
  record.expires_at = OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS;
  store.values.set(PREPARATION_KEY, JSON.stringify(record));
}

const REFRESH_INVALIDATORS = Object.freeze([
  Object.freeze({ id: "matching-control", fixture: () => ({}) }),
  Object.freeze({
    id: "account-switch",
    fixture: () => ({
      session: signedSession({
        tenant_id: "todo18-tenant-b",
        user_id: "todo18-user-b",
        outlook_desktop_principal_ref: OTHER_PRINCIPAL_REF,
      }),
      readiness: readyOutlookReadinessResponse({ principalRef: OTHER_PRINCIPAL_REF }),
    }),
  }),
  Object.freeze({ id: "build-change", fixture: () => ({ build: "addin@todo18-build-b" }) }),
  Object.freeze({ id: "ready-expiry", fixture: () => ({ expireReady: true }) }),
  Object.freeze({
    id: "installation-state-version-change",
    fixture: () => ({ readiness: installationVersionReadiness(5) }),
  }),
  Object.freeze({
    id: "connection-state-version-change",
    fixture: () => ({
      connection: connectionResponse({ state_version: 8 }),
      readiness: readyOutlookReadinessResponse({ delegatedConnectionStateVersion: 8 }),
    }),
  }),
]);

test("binding, build, READY expiry, and authority versions cannot reuse cached preparation", async () => {
  assert.deepEqual(REFRESH_INVALIDATORS.map(({ id }) => id), [
    "matching-control",
    "account-switch",
    "build-change",
    "ready-expiry",
    "installation-state-version-change",
    "connection-state-version-change",
  ]);
  for (const invalidator of REFRESH_INVALIDATORS) {
    const store = await readyStore();
    const options = invalidator.fixture();
    if (options.expireReady) expiredReady(store);
    const before = store.raw();
    const fixture = startupFixture({
      store,
      ...(options.session ? { session: options.session } : {}),
      ...(options.connection ? { connection: options.connection } : {}),
      ...(options.readiness ? { readiness: options.readiness } : {}),
    });
    const input = options.build
      ? { ...fixture.input, build: options.build }
      : fixture.input;
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(input);
    const control = invalidator.id === "matching-control";
    assert.deepEqual(
      [result.state, result.reason, result.cache_hit],
      ["ready", null, control],
      invalidator.id,
    );
    assert.equal(
      fixture.events.filter((event) => event === "/api/outlook/bootstrap").length,
      control ? 0 : 1,
      invalidator.id,
    );
    assert.equal(store.raw() === before, control, invalidator.id);
  }
});
