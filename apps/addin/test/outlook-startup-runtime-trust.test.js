import assert from "node:assert/strict";
import test from "node:test";

import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";
import {
  OTHER_PRINCIPAL_REF,
  connectionResponse,
  readyStore,
  startupFixture,
  signedSession,
  storage,
  subject,
} from "./helpers/outlook-startup-runtime-fixture.js";

for (const mismatch of [
  {
    name: "Office mailbox",
    patch: { connection: connectionResponse({ mailbox_address: "other@example.invalid" }) },
    reason: "account_mismatch",
  },
  {
    name: "signed principal",
    patch: { readiness: readyOutlookReadinessResponse({ principalRef: OTHER_PRINCIPAL_REF }) },
    reason: "account_mismatch",
  },
  {
    name: "delegated state version",
    patch: { readiness: readyOutlookReadinessResponse({ delegatedConnectionStateVersion: 8 }) },
    reason: "account_mismatch",
  },
]) {
  test(`${mismatch.name} mismatch invalidates old READY without prepare`, async () => {
    const store = await readyStore();
    const fixture = startupFixture({ store, ...mismatch.patch });
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(fixture.input);
    assert.deepEqual([result.state, result.reason], ["revoked", mismatch.reason]);
    assert.equal(fixture.events.includes("/api/outlook/bootstrap"), false);
    assert.equal(store.raw(), null);
  });
}

test("installation revocation invalidates READY and never runs bootstrap", async () => {
  const store = await readyStore();
  const readiness = readyOutlookReadinessResponse();
  readiness.item.installation.release_trusted = false;
  const fixture = startupFixture({ store, readiness });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual([result.state, result.reason], ["revoked", "installation_revoked"]);
  assert.equal(fixture.events.includes("/api/outlook/bootstrap"), false);
  assert.equal(store.raw(), null);
});

test("missing session exposes a login seam without requests, exchange, or dialog", async () => {
  const store = await readyStore();
  const fixture = startupFixture({ store, session: { authenticated: false, safe_error_code: "LAWOS_INTERACTION_REQUIRED" } });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual([result.state, result.reason], ["login_required", "interaction_required"]);
  assert.deepEqual(fixture.events, ["session"]);
  assert.equal(store.raw(), null);
});

test("disconnected authority is typed connection_required and invalidates old READY", async () => {
  const store = await readyStore();
  const fixture = startupFixture({ store, connection: connectionResponse({
    status: "not_connected",
    active: false,
    connection_id: null,
    state_version: 0,
    mailbox_address: null,
  }) });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual([result.state, result.reason], ["connection_required", "connection_required"]);
  assert.equal(store.raw(), null);
  assert.equal(fixture.events.includes("/api/outlook/bootstrap"), false);
});

for (const failedPath of [
  "/api/outlook/connection",
  "/api/outlook/readiness",
  "/api/outlook/bootstrap",
]) {
  test(`${failedPath} startup 401 is unauthenticated and never retried`, async () => {
    const store = failedPath === "/api/outlook/bootstrap" ? storage() : await readyStore();
    const fixture = startupFixture({ store, failPath: failedPath, failStatus: 401 });
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(fixture.input);
    assert.deepEqual(
      [result.state, result.reason, result.authenticated],
      ["login_required", "no_credential", false],
    );
    assert.equal(fixture.requests.filter(({ path }) => path === failedPath).length, 1);
    assert.equal(fixture.events.includes("/api/auth/office-sso/exchange"), false);
    assert.equal(store.raw(), null);
  });
}

test("transient startup failure is deferred without bootstrap", async () => {
  const store = await readyStore();
  const fixture = startupFixture({ store, failPath: "/api/outlook/readiness" });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual([result.state, result.reason], ["deferred", "transient_failure"]);
  assert.equal(fixture.events.includes("/api/outlook/bootstrap"), false);
  assert.equal(store.raw(), null);
});

test("canonical session record is required even when top-level principal looks valid", async () => {
  const fixture = startupFixture({ session: signedSession({ outlook_desktop_principal_ref: null }) });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual([result.state, result.reason], ["login_required", "no_credential"]);
  assert.deepEqual(fixture.events, ["session"]);
});

test("unsupported storage is surfaced instead of hiding failed invalidation", async () => {
  const fixture = startupFixture({ store: null, session: { authenticated: false } });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual(
    [result.state, result.reason, result.supported],
    ["deferred", "storage_unavailable", false],
  );
});

test("signed startup with unavailable storage is typed and never bootstraps", async () => {
  const fixture = startupFixture({ store: null });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual(
    [result.state, result.reason, result.supported],
    ["deferred", "storage_unavailable", false],
  );
  assert.deepEqual(fixture.events, [
    "session",
    "/api/outlook/connection",
    "/api/outlook/readiness",
  ]);
});

test("throwing window storage acquisition resolves to an unavailable capability", async () => {
  const host = {};
  Object.defineProperty(host, "localStorage", {
    get() { throw new DOMException("blocked", "SecurityError"); },
  });
  const runtime = await subject();
  assert.equal(runtime.resolveOutlookStartupStorage(host), null);
});

for (const build of ["todo9-test", "addin@todo9 test", " addin@todo9-test", "addin@todo9-test "]) {
  test(`unsealed build identity ${JSON.stringify(build)} is rejected before authority reads`, async () => {
    const fixture = startupFixture();
    fixture.input.build = build;
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(fixture.input);
    assert.deepEqual([result.state, result.reason], ["login_required", "no_credential"]);
    assert.deepEqual(fixture.events, ["session"]);
  });
}

test("external accessors are never executed at session or readiness boundaries", async () => {
  let reads = 0;
  const session = { authenticated: true };
  Object.defineProperty(session, "session", { get() { reads += 1; return signedSession().session; } });
  const sessionFixture = startupFixture({ session });
  const first = await subject();
  assert.equal((await first.startOutlookStartup(sessionFixture.input)).state, "login_required");

  const readiness = readyOutlookReadinessResponse();
  Object.defineProperty(readiness.item, "installation", {
    configurable: true,
    get() { reads += 1; return readyOutlookReadinessResponse().item.installation; },
  });
  const readinessFixture = startupFixture({ readiness });
  const second = await subject();
  assert.equal((await second.startOutlookStartup(readinessFixture.input)).state, "deferred");
  assert.equal(reads, 0);
});

test("bootstrap data is snapshotted into an immutable published result", async () => {
  const bootstrap = { item: { ready: true, nested: { marker: "original" } } };
  const fixture = startupFixture({ bootstrap });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  bootstrap.item.nested.marker = "mutated";
  assert.equal(result.bootstrap.nested.marker, "original");
  assert.equal(Object.isFrozen(result.bootstrap), true);
  assert.equal(Object.isFrozen(result.bootstrap.nested), true);
});

test("bootstrap accessors are rejected without execution", async () => {
  let reads = 0;
  const bootstrap = {};
  Object.defineProperty(bootstrap, "item", { get() { reads += 1; return { ready: true }; } });
  const fixture = startupFixture({ bootstrap });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual([result.state, result.reason], ["deferred", "transient_failure"]);
  assert.equal(reads, 0);
});
