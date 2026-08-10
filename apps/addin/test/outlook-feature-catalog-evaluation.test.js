import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_FEATURE_CATALOG,
  evaluateOutlookFeatureCatalog,
  getOutlookFeatureById,
} from "../src/outlook-feature-catalog.js";

const ITEM = Object.freeze({
  itemContextKey: "item-context-1",
  immutableMessageId: "immutable-message-1",
  internetMessageId: "<message-1@example.test>",
  conversationId: "conversation-1",
  filedThreadId: "filed-thread-1",
  subject: "검토 요청",
  recipients: ["recipient@example.test"],
  bodyPreview: "검토 의견을 보냅니다.",
  isInSentItems: true,
  isDraft: false,
  senderMatchesMailbox: true,
});

function context(overrides = {}) {
  return {
    profile: "matter-full",
    host: "Mailbox",
    form: "read",
    surface: "taskpane",
    item: ITEM,
    itemFresh: true,
    matterId: "matter-1",
    connection: "connected",
    online: true,
    ...overrides,
  };
}

const READY_RUNTIME = Object.freeze({
  precedent_search: Object.freeze({ authoritative: true, runtime_ready: true }),
});

function ids(result, field) {
  return result.filter((entry) => field == null || entry[field]).map(({ feature }) => feature.id);
}

test("matter task pane exposes the exact read and compose actions", () => {
  const read = evaluateOutlookFeatureCatalog(context({ runtimeReadiness: READY_RUNTIME }));
  assert.deepEqual(ids(read, "visible"), [
    "matter.search",
    "mail.save-with-attachments",
    "filing.correct-placement",
    "conversation.auto-save",
    "mail.save-sent",
    "task.create",
    "time-entry.draft",
    "activity.recent",
    "precedent.search",
    "document.create-and-sign-status",
  ]);
  assert.deepEqual(ids(read, "actionable"), ids(read, "visible"));

  const compose = evaluateOutlookFeatureCatalog(context({ form: "compose", runtimeReadiness: READY_RUNTIME }));
  assert.deepEqual(ids(compose, "visible"), [
    "matter.search",
    "time-entry.draft",
    "activity.recent",
    "precedent.search",
    "document.create-and-sign-status",
  ]);
  assert.deepEqual(ids(compose, "actionable"), ids(compose, "visible"));
});

test("sent filing is visible only for a non-draft own-mailbox Sent Items message", () => {
  for (const itemOverride of [
    { isInSentItems: false },
    { isDraft: true },
    { senderMatchesMailbox: false },
  ]) {
    const result = evaluateOutlookFeatureCatalog(context({ item: { ...ITEM, ...itemOverride } }));
    const sent = result.find(({ feature }) => feature.id === "mail.save-sent");
    assert.equal(sent.visible, false);
    assert.equal(sent.actionable, false);
  }

  assert.equal(
    evaluateOutlookFeatureCatalog(context({ form: "compose" }))
      .some(({ feature }) => feature.id === "mail.save-sent"),
    false,
  );
});

test("inquiry-only exposes only its two read actions and never Matter actions", () => {
  const read = evaluateOutlookFeatureCatalog(context({ profile: "inquiry-only", matterId: undefined }));
  assert.deepEqual(ids(read, "visible"), ["inquiry.create", "inquiry.link-existing"]);
  assert.deepEqual(ids(read, "actionable"), ["inquiry.create", "inquiry.link-existing"]);
  assert.deepEqual(
    evaluateOutlookFeatureCatalog(context({ profile: "inquiry-only", form: "compose" })),
    [],
  );
  assert.equal(read.some(({ feature }) => feature.profile === "matter-full"), false);
  assert.equal(
    evaluateOutlookFeatureCatalog(context()).some(({ feature }) => feature.id.startsWith("inquiry.")),
    false,
  );
});

test("no item and stale item discard current-item actions", () => {
  for (const [item, itemFresh] of [[null, false], [[], true]]) {
    const noItem = evaluateOutlookFeatureCatalog(context({ item, itemFresh }));
    assert.ok(noItem.length > 0);
    assert.ok(noItem.every(({ visible, actionable }) => visible === false && actionable === false));
  }
  const blankKey = evaluateOutlookFeatureCatalog(context({ item: { ...ITEM, itemContextKey: "   " } }));
  assert.ok(blankKey
    .filter(({ feature }) => feature.requiredItemFields.includes("itemContextKey"))
    .every(({ visible, actionable }) => !visible && !actionable));
  const stale = evaluateOutlookFeatureCatalog(context({ itemFresh: false, runtimeReadiness: READY_RUNTIME }));
  assert.ok(stale.filter(({ feature }) => feature.implementationState === "active")
    .every(({ feature, visible, actionable, response }) => (
    !visible && !actionable && response === feature.staleItemResponse
  )));
});

test("Matter, disconnected, and offline prerequisites gate only dependent rows", () => {
  const withoutMatter = evaluateOutlookFeatureCatalog(context({ matterId: undefined, runtimeReadiness: READY_RUNTIME }));
  assert.deepEqual(ids(withoutMatter, "actionable"), ["matter.search"]);
  assert.ok(withoutMatter
    .filter(({ feature }) => feature.matterPrerequisite && feature.implementationState === "active")
    .every(({ visible, actionable, response }) => visible && !actionable && /Matter/u.test(response)));
  assert.deepEqual(ids(evaluateOutlookFeatureCatalog(context({ matterId: "   ", runtimeReadiness: READY_RUNTIME })), "actionable"), ["matter.search"]);

  const disconnected = evaluateOutlookFeatureCatalog(context({ connection: "disconnected", runtimeReadiness: READY_RUNTIME }));
  assert.deepEqual(ids(disconnected, "actionable"), [
    "matter.search",
    "filing.correct-placement",
    "task.create",
    "time-entry.draft",
    "activity.recent",
    "precedent.search",
    "document.create-and-sign-status",
  ]);
  assert.ok(disconnected
    .filter(({ feature }) => feature.connectionPrerequisite
      && feature.implementationState === "active")
    .every(({ feature, response }) => response === feature.offlineReconnectResponse.reconnect));

  const offline = evaluateOutlookFeatureCatalog(context({ online: false, runtimeReadiness: READY_RUNTIME }));
  assert.deepEqual(ids(offline, "visible"), ids(evaluateOutlookFeatureCatalog(context({ runtimeReadiness: READY_RUNTIME })), "visible"));
  assert.deepEqual(ids(offline, "actionable"), []);
  assert.ok(offline.filter(({ feature }) => feature.implementationState === "active")
    .every(({ feature, response }) => response === feature.offlineReconnectResponse.offline));
});

test("precedent requires ready runtime, remains usable across Graph disconnect, and fails closed offline or stale", () => {
  const ready = evaluateOutlookFeatureCatalog(context({ runtimeReadiness: READY_RUNTIME }));
  const precedent = ready.find(({ feature }) => feature.id === "precedent.search");
  assert.equal(precedent.visible, true);
  assert.equal(precedent.actionable, true);
  assert.equal(precedent.response, null);

  for (const runtimeReadiness of [
    undefined,
    { precedent_search: { authoritative: false, runtime_ready: true } },
    { precedent_search: { authoritative: true, runtime_ready: false } },
  ]) {
    const row = evaluateOutlookFeatureCatalog(context({ runtimeReadiness }))
      .find(({ feature }) => feature.id === "precedent.search");
    assert.equal(row.visible, false);
    assert.equal(row.actionable, false);
    assert.equal(row.response, "검색 준비 중입니다.");
  }

  const disconnected = evaluateOutlookFeatureCatalog(context({
    connection: "disconnected",
    runtimeReadiness: READY_RUNTIME,
  })).find(({ feature }) => feature.id === "precedent.search");
  assert.equal(disconnected.visible, true);
  assert.equal(disconnected.actionable, true);

  const offline = evaluateOutlookFeatureCatalog(context({ online: false, runtimeReadiness: READY_RUNTIME }))
    .find(({ feature }) => feature.id === "precedent.search");
  assert.equal(offline.visible, true);
  assert.equal(offline.actionable, false);
  assert.equal(offline.response, offline.feature.offlineReconnectResponse.offline);

  const stale = evaluateOutlookFeatureCatalog(context({ itemFresh: false, runtimeReadiness: READY_RUNTIME }))
    .find(({ feature }) => feature.id === "precedent.search");
  assert.equal(stale.visible, false);
  assert.equal(stale.actionable, false);
  assert.equal(stale.response, stale.feature.staleItemResponse);
});

test("unknown context fails closed and lookup is exact", () => {
  for (const invalid of [
    { profile: "matter" },
    { host: "Document" },
    { form: "appointment" },
    { surface: "dialog" },
    { surface: "event", form: "compose", event: "OnNewMessageCompose" },
    { surface: "taskpane", event: "OnMessageSend" },
  ]) assert.deepEqual(evaluateOutlookFeatureCatalog(context(invalid)), []);

  assert.equal(getOutlookFeatureById("matter.search"), OUTLOOK_FEATURE_CATALOG[0]);
  assert.equal(getOutlookFeatureById("Matter.Search"), null);
  assert.equal(getOutlookFeatureById(" matter.search"), null);
  assert.equal(getOutlookFeatureById({ id: "matter.search" }), null);
});

test("OnMessageSend evaluates only the non-visible Smart Alert capability", () => {
  const result = evaluateOutlookFeatureCatalog(context({
    form: "compose",
    surface: "event",
    event: "OnMessageSend",
    matterId: undefined,
  }));
  assert.deepEqual(ids(result), ["smart-alert.on-message-send"]);
  assert.equal(result[0].visible, false);
  assert.equal(result[0].actionable, true);
  assert.equal(result[0].feature.opener, "event");
  assert.equal(result[0].feature.mutation, false);
  assert.doesNotMatch(result[0].feature.endpoint, /filing|conversation/iu);
  assert.deepEqual(evaluateOutlookFeatureCatalog(context({
    profile: "inquiry-only",
    form: "compose",
    surface: "event",
    event: "OnMessageSend",
  })), []);
});
