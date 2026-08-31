import assert from "node:assert/strict";
import test from "node:test";

import { startupFixture, storage, subject } from "./helpers/outlook-startup-runtime-fixture.js";

const READY_EVENT = "lawos:office-ready";

function officeHost(address = null) {
  const host = new EventTarget();
  host.Office = { context: {} };
  if (address) host.Office.context.mailbox = { userProfile: { emailAddress: address } };
  return host;
}

function setOfficeMailbox(host, address = "qa@example.invalid") {
  host.Office.context.mailbox = { userProfile: { emailAddress: address } };
}

test("one module generation shares the exact Promise across callers and remount subscribers", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fixture = startupFixture({ holdSession: gate });
  const runtime = await subject();
  const seenA = [];
  const seenB = [];
  const unsubscribeA = runtime.subscribeOutlookStartup((value) => seenA.push(value));
  const first = runtime.startOutlookStartup(fixture.input);
  const second = runtime.startOutlookStartup(fixture.input);
  assert.equal(first, second);
  unsubscribeA();
  runtime.subscribeOutlookStartup((value) => seenB.push(value));
  release();
  const result = await first;
  assert.equal(runtime.startOutlookStartup(fixture.input), first);
  assert.deepEqual(seenA, []);
  assert.deepEqual(seenB, [result]);
  const remount = [];
  runtime.subscribeOutlookStartup((value) => remount.push(value));
  assert.deepEqual(remount, [result]);
});

test("cold startup uses canonical session fields and exact non-retrying request order", async () => {
  const fixture = startupFixture();
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  assert.deepEqual(fixture.events, [
    "session",
    "/api/outlook/connection",
    "/api/outlook/readiness",
    "/api/outlook/bootstrap",
  ]);
  assert.deepEqual(fixture.requests.map(({ path, options }) => [path, options]), [
    ["/api/outlook/connection", { retryAfterUnauthorized: false }],
    ["/api/outlook/readiness", { retryAfterUnauthorized: false }],
    ["/api/outlook/bootstrap", { retryAfterUnauthorized: false }],
  ]);
  assert.equal(result.state, "ready");
  assert.equal(result.cache_hit, false);
  assert.equal(result.binding.tenant_id, "todo9-tenant");
  assert.equal(result.binding.user_id, "todo9-user");
  assert.equal(Object.isFrozen(result.connection.missingScopes), true);
});

test("a new module generation revalidates binding but a warm cache skips bootstrap", async () => {
  const store = storage();
  const cold = startupFixture({ store });
  const firstRuntime = await subject();
  assert.equal((await firstRuntime.startOutlookStartup(cold.input)).cache_hit, false);
  const warm = startupFixture({ store });
  const secondRuntime = await subject();
  const result = await secondRuntime.startOutlookStartup(warm.input);
  assert.equal(result.state, "ready");
  assert.equal(result.cache_hit, true);
  assert.deepEqual(warm.events, ["session", "/api/outlook/connection", "/api/outlook/readiness"]);
});

test("tokenized auth-handler ownership lets A cleanup preserve newer B", async () => {
  const runtime = await subject();
  const seen = [];
  const removeA = runtime.registerOutlookStartupAuthHandlers({
    unauthorized: () => { seen.push("A-unauthorized"); return "A"; },
    recovered: () => { seen.push("A-recovered"); return true; },
  });
  const removeB = runtime.registerOutlookStartupAuthHandlers({
    unauthorized: () => { seen.push("B-unauthorized"); return "B"; },
    recovered: () => { seen.push("B-recovered"); return true; },
  });
  removeA();
  assert.equal(runtime.notifyOutlookStartupUnauthorized({}), "B");
  assert.equal(runtime.notifyOutlookStartupRecovered({}), true);
  removeB();
  assert.equal(runtime.notifyOutlookStartupUnauthorized({}), null);
  assert.equal(runtime.notifyOutlookStartupRecovered({}), null);
  assert.deepEqual(seen, ["B-unauthorized", "B-recovered"]);
});

test("throwing auth handlers cannot escape the notifier boundary", async () => {
  const runtime = await subject();
  runtime.registerOutlookStartupAuthHandlers({
    unauthorized: () => { throw new Error("unauthorized consumer failed"); },
    recovered: () => { throw new Error("recovered consumer failed"); },
  });
  assert.equal(runtime.notifyOutlookStartupUnauthorized({}), null);
  assert.equal(runtime.notifyOutlookStartupRecovered({}), false);
});

test("the shared startup flight waits for the authoritative Office mailbox", async () => {
  let releaseMailbox;
  const officeMailboxAddress = new Promise((resolve) => { releaseMailbox = resolve; });
  const fixture = startupFixture();
  fixture.input.officeMailboxAddress = officeMailboxAddress;
  const runtime = await subject();
  const first = runtime.startOutlookStartup(fixture.input);
  try {
    assert.equal(runtime.startOutlookStartup(fixture.input), first);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(fixture.events, ["session"]);
  } finally {
    releaseMailbox("qa@example.invalid");
  }
  assert.equal((await first).state, "ready");
  assert.deepEqual(fixture.events, [
    "session",
    "/api/outlook/connection",
    "/api/outlook/readiness",
    "/api/outlook/bootstrap",
  ]);
});

test("mailbox dependency shares one Promise and ignores a spurious ready event", async () => {
  let releaseReady;
  const ready = new Promise((resolve) => { releaseReady = resolve; });
  const host = officeHost();
  const runtime = await subject();
  const first = runtime.waitForOutlookStartupMailbox({ host, waitForReady: () => ready, readyEvent: READY_EVENT });
  assert.equal(runtime.waitForOutlookStartupMailbox({ host, waitForReady: () => ready, readyEvent: READY_EVENT }), first);
  let settled = false;
  void first.then(() => { settled = true; });
  host.dispatchEvent(new Event(READY_EVENT));
  await Promise.resolve();
  assert.equal(settled, false);
  setOfficeMailbox(host);
  releaseReady({ status: "ready" });
  assert.equal(await first, "qa@example.invalid");
});

test("mailbox dependency resolves an immediate authoritative address", async () => {
  const host = officeHost("qa@example.invalid");
  const runtime = await subject();
  assert.equal(await runtime.waitForOutlookStartupMailbox({
    host,
    waitForReady: async () => ({ status: "ready" }),
    readyEvent: READY_EVENT,
  }), "qa@example.invalid");
});

test("mailbox dependency stays pending after timeout until the late ready event", async () => {
  const host = officeHost();
  const runtime = await subject();
  const pending = runtime.waitForOutlookStartupMailbox({
    host,
    waitForReady: async () => ({ status: "timed_out" }),
    readyEvent: READY_EVENT,
  });
  let settled = false;
  void pending.then(() => { settled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  setOfficeMailbox(host);
  host.dispatchEvent(new Event(READY_EVENT));
  assert.equal(await pending, "qa@example.invalid");
});

for (const unavailable of [
  { name: "unavailable", waitForReady: async () => ({ status: "unavailable" }) },
  { name: "synchronous failure", waitForReady: () => { throw new Error("Office failed"); } },
]) {
  test(`mailbox dependency settles null on ${unavailable.name}`, async () => {
    const host = officeHost();
    const runtime = await subject();
    const result = runtime.waitForOutlookStartupMailbox({
      host,
      waitForReady: unavailable.waitForReady,
      readyEvent: READY_EVENT,
    });
    assert.equal(await result, null);
    setOfficeMailbox(host);
    host.dispatchEvent(new Event(READY_EVENT));
    assert.equal(runtime.waitForOutlookStartupMailbox({ host }), result);
  });
}

test("invalid build revision bytes fail at the Vite boundary", async () => {
  const previous = process.env.LAWOS_OUTLOOK_ADDIN_BUILD_REVISION;
  try {
    for (const [index, revision] of [
      "secret/revision with spaces",
      "",
      "   ",
      " revision",
      "revision ",
    ].entries()) {
      process.env.LAWOS_OUTLOOK_ADDIN_BUILD_REVISION = revision;
      for (const config of ["vite.config.js", "vite.inquiry.config.js"]) {
        await assert.rejects(
          import(`../${config}?invalid-revision=${Date.now()}-${index}`),
          /LAWOS_OUTLOOK_ADDIN_BUILD_REVISION/u,
        );
      }
    }
  } finally {
    if (previous === undefined) delete process.env.LAWOS_OUTLOOK_ADDIN_BUILD_REVISION;
    else process.env.LAWOS_OUTLOOK_ADDIN_BUILD_REVISION = previous;
  }
});
