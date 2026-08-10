import assert from "node:assert/strict";
import test from "node:test";

import {
  createOutlookAuthOwnerChangedError,
  createOutlookAuthOwnerFence,
  createOutlookBusyFence,
} from "../src/outlook-session-fence.js";

function deferred() {
  let resolve;
  const promise = new Promise((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function startRequest(fence, token, pending, effects) {
  const start = fence.capture();
  const owner = fence.bindToken(start, token);
  assert.ok(owner);
  return pending.promise.then(({ status, body }) => {
    if (!fence.isCurrent(owner)) return { applied: false };
    if (status === 401) {
      const recoveryOwner = fence.begin();
      effects.unauthorized += 1;
      effects.clear.push(owner.token);
      return { applied: false, recoveryOwner, body };
    }
    effects.success.push(body);
    return { applied: true, body };
  });
}

for (const body of [
  { name: "bodyless", value: null },
  { name: "HTML", value: "<html>expired</html>" },
  { name: "JSON", value: { safe_error_code: "AUTH_SESSION_INVALID" } },
]) {
  test(`late A ${body.name} 401 is inert after B authenticates`, async () => {
    const fence = createOutlookAuthOwnerFence();
    const pending = deferred();
    const effects = { unauthorized: 0, clear: [], success: [] };
    const request = startRequest(fence, "lawos_session_v1.owner-a", pending, effects);

    const bOwner = fence.begin({ token: "lawos_session_v1.owner-b" });
    assert.equal(fence.isCurrent(bOwner), true);
    pending.resolve({ status: 401, body: body.value });
    assert.deepEqual(await request, { applied: false });
    assert.equal(effects.unauthorized, 0);
    assert.deepEqual(effects.clear, []);
    assert.deepEqual(effects.success, []);
    assert.equal(fence.currentToken(), "lawos_session_v1.owner-b");
  });
}

test("stale silent recovery cannot install a token after a newer interactive owner", () => {
  const fence = createOutlookAuthOwnerFence();
  const ownerA = fence.begin({ token: "lawos_session_v1.owner-a" });
  const recoveryA = fence.begin();
  assert.equal(fence.isCurrent(recoveryA), true);
  const ownerB = fence.begin({ token: "lawos_session_v1.owner-b" });
  assert.equal(fence.isCurrent(recoveryA), false);
  assert.equal(fence.setToken(recoveryA, "lawos_session_v1.recovery-a"), false);
  assert.equal(fence.currentToken(), "lawos_session_v1.owner-b");
  assert.equal(fence.isCurrent(ownerA), false);
  assert.equal(fence.isCurrent(ownerB), true);
  assert.equal(createOutlookAuthOwnerChangedError().safe_error_code, "AUTH_SESSION_OWNER_CHANGED");
});

test("an owner cannot replace a token already installed in the same epoch", () => {
  const fence = createOutlookAuthOwnerFence();
  const owner = fence.begin();
  assert.equal(fence.setToken(owner, "lawos_session_v1.owner-a"), true);
  assert.equal(fence.setToken(owner, "lawos_session_v1.owner-b"), false);
  assert.equal(fence.currentToken(), "lawos_session_v1.owner-a");
});

test("lifecycle restart preserves bound tokens and pending adoption, but auth loss drops both", () => {
  const fence = createOutlookAuthOwnerFence();
  const initial = fence.capture();
  const restarted = fence.restart();
  const adopted = fence.bindToken(restarted, "lawos_session_v1.owner-a");
  assert.equal(adopted?.token, "lawos_session_v1.owner-a");
  assert.equal(fence.currentToken(), "lawos_session_v1.owner-a");
  const boundRestart = fence.restart();
  assert.equal(fence.bindToken(boundRestart, "lawos_session_v1.owner-a")?.token, "lawos_session_v1.owner-a");

  const authLoss = fence.begin();
  assert.equal(fence.currentToken(), "");
  assert.equal(fence.bindToken(authLoss, "lawos_session_v1.owner-a"), null);
  const postLossRestart = fence.restart();
  assert.equal(fence.bindToken(postLossRestart, "lawos_session_v1.owner-a"), null);
});

test("a non-adopting auth boundary skips stale persisted-token validation", () => {
  const fence = createOutlookAuthOwnerFence();
  const owner = fence.begin();
  assert.equal(fence.canUsePersistedToken(owner), false);
  assert.equal(fence.bindToken(owner, ""), null);
  assert.equal(fence.setToken(owner, ""), false);
  assert.equal(fence.bindToken(owner, "lawos_session_v1.stale"), null);
  const restarted = fence.restart();
  assert.equal(fence.canUsePersistedToken(restarted), false);
  assert.equal(fence.bindToken(restarted, "lawos_session_v1.stale"), null);

  const adoptingOwner = fence.begin({ allowTokenAdoption: true });
  assert.equal(fence.canUsePersistedToken(adoptingOwner), true);
  assert.equal(fence.bindToken(adoptingOwner, "lawos_session_v1.current")?.token, "lawos_session_v1.current");
});

test("busy completion from an old owner cannot clear newer sign-in or connection work", () => {
  const busy = createOutlookBusyFence();
  const connect = busy.begin("connect");
  const signIn = busy.begin("login");
  assert.equal(busy.end(connect), false);
  assert.equal(busy.isCurrent(signIn), true);
  assert.equal(busy.end(signIn), true);
  const disconnect = busy.begin("disconnect");
  busy.invalidate();
  assert.equal(busy.end(disconnect), false);
});
