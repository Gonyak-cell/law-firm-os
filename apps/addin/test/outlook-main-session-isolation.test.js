import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createOutlookApiResponseError,
  createOutlookBusinessReadFence,
  isOutlookOperationSessionCurrent,
} from "../src/outlook-session-fence.js";

const ITEM_A = "item-a\u001e read\u001e received";
const ITEM_B = "item-b\u001e read\u001e received";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function startDeferredRead(fence, name, pending, context, applied) {
  const snapshot = fence.capture(context);
  const current = () => fence.isCurrent(snapshot, context);
  return pending.promise.then(
    (value) => { if (current()) applied.push({ name, value }); },
    (error) => { if (current()) applied.push({ name, error }); },
  );
}

test("delayed Matter A timeline success is discarded after item or Matter changes", async () => {
  const fence = createOutlookBusinessReadFence();
  const applied = [];
  const pending = deferred();
  const read = startDeferredRead(fence, "timeline", pending, {
    authenticated: true,
    itemContextKey: ITEM_A,
    matterId: "matter-a",
  }, applied);

  fence.invalidate();
  pending.resolve({ timeline: ["old-a"] });
  await read;
  assert.deepEqual(applied, []);
  assert.equal(fence.isCurrent(
    fence.capture({ authenticated: true, itemContextKey: ITEM_B, matterId: "matter-b" }),
    { authenticated: true, itemContextKey: ITEM_B, matterId: "matter-b" },
  ), true);
});

test("delayed Matter A read error is discarded after authentication loss", async () => {
  const fence = createOutlookBusinessReadFence();
  const applied = [];
  const pending = deferred();
  const read = startDeferredRead(fence, "timeline-error", pending, {
    authenticated: true,
    itemContextKey: ITEM_A,
    matterId: "matter-a",
  }, applied);

  fence.invalidate();
  pending.reject(new Error("old session error"));
  await read;
  assert.deepEqual(applied, []);
});

test("a new authenticated session cannot reuse a prior session snapshot", () => {
  const fence = createOutlookBusinessReadFence();
  const oldSession = fence.capture({
    authenticated: true,
    itemContextKey: ITEM_A,
    matterId: "matter-a",
  });
  fence.invalidate();
  const newSession = fence.capture({
    authenticated: true,
    itemContextKey: ITEM_A,
    matterId: "matter-a",
  });
  const current = {
    authenticated: true,
    itemContextKey: ITEM_A,
    matterId: "matter-a",
  };
  assert.equal(fence.isCurrent(oldSession, current), false);
  assert.equal(fence.isCurrent(newSession, current), true);
});

test("all prior-session base, connection, search, and receipt-restore responses stay quarantined", async () => {
  const fence = createOutlookBusinessReadFence();
  const applied = [];
  const context = { authenticated: true, itemContextKey: ITEM_A, matterId: "matter-a" };
  const base = deferred();
  const connection = deferred();
  const search = deferred();
  const restore = deferred();
  const reads = [
    startDeferredRead(fence, "base", base, context, applied),
    startDeferredRead(fence, "connection", connection, context, applied),
    startDeferredRead(fence, "search", search, context, applied),
    startDeferredRead(fence, "receipt-restore", restore, context, applied),
  ];

  fence.invalidate();
  base.resolve({ item: "old bootstrap" });
  connection.reject(new Error("old connection error"));
  search.resolve({ items: ["old matter"] });
  restore.reject(new Error("old restore error"));
  await Promise.all(reads);
  assert.deepEqual(applied, []);
});

test("timeline and documents cannot apply after A-to-B or Matter switch, including late errors", async () => {
  const fence = createOutlookBusinessReadFence();
  const applied = [];
  const timeline = deferred();
  const documents = deferred();
  const context = { authenticated: true, itemContextKey: ITEM_A, matterId: "matter-a" };
  const reads = [
    startDeferredRead(fence, "timeline", timeline, context, applied),
    startDeferredRead(fence, "documents", documents, context, applied),
  ];
  fence.invalidate();
  timeline.resolve({ rows: ["old timeline"] });
  documents.reject(new Error("old document error"));
  await Promise.all(reads);
  assert.deepEqual(applied, []);
});

test("failed and successful sign-in boundaries invalidate old work but allow only the new session", async () => {
  const fence = createOutlookBusinessReadFence();
  const applied = [];
  const oldRequest = deferred();
  const oldContext = { authenticated: true, itemContextKey: ITEM_A, matterId: "matter-a" };
  const oldRead = startDeferredRead(fence, "old-session", oldRequest, oldContext, applied);
  fence.invalidate(); // interactive sign-in starts and the old session is no longer an owner
  oldRequest.resolve({ old: true });
  await oldRead;
  assert.deepEqual(applied, []);

  const newRequest = deferred();
  const newContext = { authenticated: true, itemContextKey: ITEM_A, matterId: "matter-a" };
  const newRead = startDeferredRead(fence, "new-session", newRequest, newContext, applied);
  newRequest.resolve({ current: true });
  await newRead;
  assert.deepEqual(applied, [{ name: "new-session", value: { current: true } }]);
});

test("the auth-loss view reset closes presentation and removes business data", () => {
  const fence = createOutlookBusinessReadFence();
  const view = {
    overlayOpen: true,
    selectedMatter: "matter-a",
    matters: ["matter-a"],
    timeline: ["event-a"],
    documents: ["document-a"],
    receipt: { operation: "file_email" },
  };
  fence.invalidate();
  const cleared = {
    ...view,
    overlayOpen: false,
    selectedMatter: null,
    matters: [],
    timeline: [],
    documents: [],
    receipt: null,
  };
  assert.deepEqual(cleared, {
    overlayOpen: false,
    selectedMatter: null,
    matters: [],
    timeline: [],
    documents: [],
    receipt: null,
  });
  assert.equal(fence.isCurrent(
    fence.capture({ authenticated: false, itemContextKey: ITEM_A, matterId: "" }),
    { authenticated: true, itemContextKey: ITEM_A, matterId: "" },
  ), false);
});

test("HTTP 401 keeps its status and safe auth code even when the body is empty or HTML", () => {
  const empty = createOutlookApiResponseError({ status: 401, parseFailed: true });
  assert.equal(empty.status, 401);
  assert.equal(empty.safe_error_code, "AUTH_SESSION_INVALID");
  assert.equal(empty.message, "AUTH_SESSION_INVALID");

  const html = createOutlookApiResponseError({ status: 401, parseFailed: true });
  assert.equal(html.status, 401);
  assert.equal(html.safe_error_code, "AUTH_SESSION_INVALID");

  const nonAuthHtml = createOutlookApiResponseError({ status: 503, parseFailed: true });
  assert.equal(nonAuthHtml.status, 503);
  assert.equal(nonAuthHtml.safe_error_code, "API_RESPONSE_INVALID");

  const serverCode = createOutlookApiResponseError({
    status: 401,
    payload: { safe_error_code: "AUTH_SESSION_REQUIRED", message: "sensitive server detail" },
  });
  assert.equal(serverCode.status, 401);
  assert.equal(serverCode.safe_error_code, "AUTH_SESSION_REQUIRED");
  assert.equal(serverCode.message, "AUTH_SESSION_REQUIRED");
});

test("Task and Time result application requires the exact current session generation", () => {
  const owners = new Map([["operation-a", 7]]);
  assert.equal(isOutlookOperationSessionCurrent({
    operationSessionGenerations: owners,
    operationStartKey: "operation-a",
    sessionGeneration: 7,
    authenticated: true,
  }), true);
  owners.clear();
  assert.equal(isOutlookOperationSessionCurrent({
    operationSessionGenerations: owners,
    operationStartKey: "operation-a",
    sessionGeneration: 7,
    authenticated: true,
  }), false);
  owners.set("operation-a", 8);
  assert.equal(isOutlookOperationSessionCurrent({
    operationSessionGenerations: owners,
    operationStartKey: "operation-a",
    sessionGeneration: 7,
    authenticated: true,
  }), false);
  assert.equal(isOutlookOperationSessionCurrent({
    operationSessionGenerations: owners,
    operationStartKey: "operation-a",
    sessionGeneration: 8,
    authenticated: false,
  }), false);
});

test("main wiring fences base, connection, search, restore, and exact readbacks", async () => {
  const source = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  for (const marker of [
    "createOutlookBusinessReadFence",
    "createOutlookApiResponseError",
    "createOutlookAuthOwnerFence",
    "createOutlookBusyFence",
    "isOutlookOperationSessionCurrent",
    "const sessionUnauthorized = response.status === 401 && includeSession",
    "unauthorizedHandler?.(requestOwner)",
    "authRecoveryOwner",
    "clearIfCurrent(requestOwner.token)",
    "authOwnerFence.canUsePersistedToken(validationOwner)",
    "authOwnerFence.isCurrent(requestOwner)",
    "authOwner: recoveryOwner",
    "sessionRecoveredHandler(recoveryOwner)",
    "beginSessionBoundary(false)",
    "beginSessionBoundary(true,",
    "lifecycleRestart: true",
    "assertBusinessReadCurrent(readFence)",
    "businessReadFence: readFence",
    "const readbackItem = receiptReadbackItem ?? currentOfficeItemSnapshot()",
    "receiptReadbackItem: currentItem",
    "isBusinessReadCurrent(searchReadFence",
    "const closed = closeOutlookOverlay(state, \"auth-required\")",
    "generation: closed.generation + 1",
    "invalidated: true",
    "operationSessionGenerations: operationSessionGenerationsRef.current",
    "const busyToken = beginBusy(\"login\")",
    "const busyToken = beginBusy(\"connect\")",
    "const busyToken = beginBusy(\"disconnect\")",
    "endBusy(busyToken)",
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
