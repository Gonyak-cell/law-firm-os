import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSED_OUTLOOK_OVERLAY_STATE,
  OUTLOOK_OVERLAY_EVENT,
  closeOutlookOverlay,
  createOutlookOverlayState,
  invalidateOutlookOverlayForItemChange,
  isOutlookOverlayMutationActive,
  isOutlookOverlayOperationTerminal,
  openOutlookOverlay,
  outlookOverlayFocusTarget,
  reduceOutlookOverlayState,
  startOutlookOverlayOperation,
  updateOutlookOverlayOperation,
} from "../src/outlook-overlay-state.js";
import { OUTLOOK_OPERATION_STATES } from "../src/outlook-operation-state.js";

test("the overlay is a single controlled layer with an exact opener target", () => {
  const opened = openOutlookOverlay(CLOSED_OUTLOOK_OVERLAY_STATE, {
    featureId: "matter.search",
    openerId: "outlook-rail-matter-search",
    itemContextKey: "item-context-1",
  });
  assert.equal(opened.open, true);
  assert.equal(opened.featureId, "matter.search");
  assert.equal(outlookOverlayFocusTarget(opened), "outlook-rail-matter-search");
  assert.equal(Object.isFrozen(opened), true);

  const closedByEscape = reduceOutlookOverlayState(opened, {
    type: OUTLOOK_OVERLAY_EVENT.escape,
  });
  assert.equal(closedByEscape.open, false);
  assert.equal(closedByEscape.closeReason, "escape");
  assert.equal(outlookOverlayFocusTarget(closedByEscape), "outlook-rail-matter-search");

  const reopened = openOutlookOverlay(closedByEscape, {
    featureId: "matter.search",
    openerId: "outlook-rail-matter-search",
    itemContextKey: "item-context-1",
  });
  assert.equal(reopened.open, true);
  assert.equal(reopened.generation, opened.generation + 1);
});

test("outside close and close button preserve a working server operation", () => {
  const started = startOutlookOverlayOperation(
    openOutlookOverlay(createOutlookOverlayState(), {
      featureId: "mail.save-with-attachments",
      openerId: "outlook-rail-mail-save-with-attachments",
      itemContextKey: "item-context-1",
    }),
    { key: "operation-1" },
  );
  assert.equal(isOutlookOverlayMutationActive(started), true);
  assert.equal(started.operation.status, OUTLOOK_OPERATION_STATES.working);
  const closed = closeOutlookOverlay(started, "outside");
  assert.equal(closed.open, false);
  assert.equal(closed.closeReason, "outside");
  assert.deepEqual(closed.operation, started.operation);
  const retained = updateOutlookOverlayOperation(closed, {
    key: "operation-1",
    featureId: started.operation.featureId,
    itemContextKey: started.operation.itemContextKey,
    generation: started.operation.generation,
    status: "complete",
    visibleMessage: "저장됨",
    fullMessage: "메일 원본과 첨부 저장이 완료되었습니다.",
  });
  assert.equal(retained.operation.status, "complete");
  assert.equal(isOutlookOverlayOperationTerminal(retained), true);
  assert.equal(retained.operation.fullMessage.includes("원본"), true);
});

test("operation identity is fenced: missing, reused, and late keys cannot overwrite a newer operation", () => {
  const opened = openOutlookOverlay(createOutlookOverlayState(), {
    featureId: "mail.save-with-attachments",
    openerId: "outlook-rail-mail-save-with-attachments",
    itemContextKey: "item-context-1",
  });
  const missingKey = startOutlookOverlayOperation(opened, {});
  assert.equal(missingKey.operation, null);
  const first = startOutlookOverlayOperation(opened, { key: "operation-old" });
  const stillFirst = startOutlookOverlayOperation(first, { key: "operation-new" });
  assert.equal(stillFirst.operation.key, "operation-old");
  const firstComplete = updateOutlookOverlayOperation(first, {
    key: "operation-old",
    featureId: first.operation.featureId,
    itemContextKey: first.operation.itemContextKey,
    generation: first.operation.generation,
    status: "complete",
  });
  const second = startOutlookOverlayOperation(firstComplete, { key: "operation-new" });
  assert.equal(second.operation.key, "operation-new");
  assert.equal(second.operation.featureId, "mail.save-with-attachments");
  assert.equal(second.operation.itemContextKey, "item-context-1");
  assert.equal(second.operation.generation, second.generation);
  assert.deepEqual(
    updateOutlookOverlayOperation(second, {
      key: "operation-old",
      status: "complete",
      featureId: second.operation.featureId,
      itemContextKey: second.operation.itemContextKey,
      generation: second.operation.generation,
    }),
    second,
  );
  assert.deepEqual(
    updateOutlookOverlayOperation(second, {
      key: "operation-new",
      featureId: "task.create",
      itemContextKey: second.operation.itemContextKey,
      generation: second.operation.generation,
      status: "complete",
    }),
    second,
  );
  const complete = updateOutlookOverlayOperation(second, {
    key: "operation-new",
    featureId: second.operation.featureId,
    itemContextKey: second.operation.itemContextKey,
    generation: second.operation.generation,
    status: "complete",
    visibleMessage: "저장됨",
  });
  assert.equal(complete.operation.key, "operation-new");
  assert.equal(complete.operation.featureId, "mail.save-with-attachments");
  assert.equal(complete.operation.itemContextKey, "item-context-1");
  assert.equal(complete.operation.visibleMessage, "저장됨");
  assert.deepEqual(
    updateOutlookOverlayOperation(complete, {
      key: "operation-new",
      featureId: complete.operation.featureId,
      itemContextKey: complete.operation.itemContextKey,
      generation: complete.operation.generation,
      status: "working",
    }),
    complete,
  );
  assert.deepEqual(
    updateOutlookOverlayOperation(second, {
      key: "operation-new",
      status: "failed",
    }),
    second,
  );
  assert.deepEqual(
    updateOutlookOverlayOperation(second, {
      key: "operation-new",
      featureId: second.operation.featureId,
      itemContextKey: second.operation.itemContextKey,
      generation: second.operation.generation + 1,
      status: "failed",
    }),
    second,
  );
  assert.deepEqual(
    updateOutlookOverlayOperation(second, {
      key: "operation-new",
      featureId: second.operation.featureId,
      itemContextKey: second.operation.itemContextKey,
      generation: second.operation.generation,
      status: "pending",
    }),
    second,
  );
});

test("an Outlook item change closes the overlay while retaining the original operation context", () => {
  const started = startOutlookOverlayOperation(
    openOutlookOverlay(createOutlookOverlayState(), {
      featureId: "task.create",
      openerId: "outlook-rail-task-create",
      itemContextKey: "item-context-1",
    }),
    { key: "operation-2" },
  );
  const changed = invalidateOutlookOverlayForItemChange(started, "item-context-2");
  assert.equal(changed.open, false);
  assert.equal(changed.invalidated, true);
  assert.equal(changed.closeReason, "item-changed");
  assert.equal(changed.featureId, null);
  assert.equal(changed.itemContextKey, "item-context-2");
  assert.equal(changed.operation.status, OUTLOOK_OPERATION_STATES.staleItem);
  const completedAfterItemChange = updateOutlookOverlayOperation(changed, {
    key: "operation-2",
    featureId: changed.operation.featureId,
    itemContextKey: changed.operation.itemContextKey,
    generation: changed.operation.generation,
    status: "complete",
    visibleMessage: "완료됨",
  });
  assert.equal(completedAfterItemChange.operation.status, "complete");
  assert.equal(completedAfterItemChange.operation.itemContextKey, "item-context-1");
  assert.equal(completedAfterItemChange.itemContextKey, "item-context-2");
  assert.deepEqual(
    updateOutlookOverlayOperation(completedAfterItemChange, {
      key: "operation-old",
      featureId: completedAfterItemChange.operation.featureId,
      itemContextKey: completedAfterItemChange.operation.itemContextKey,
      generation: completedAfterItemChange.operation.generation,
      status: "failed",
    }),
    completedAfterItemChange,
  );
  assert.equal(outlookOverlayFocusTarget(changed), "outlook-rail-task-create");
});

test("same item changes are ignored and unknown events are inert", () => {
  const state = openOutlookOverlay(createOutlookOverlayState(), {
    featureId: "matter.search",
    openerId: "opener",
    itemContextKey: "same",
  });
  assert.deepEqual(invalidateOutlookOverlayForItemChange(state, "same"), state);
  assert.equal(reduceOutlookOverlayState(state, { type: "not-an-event" }), state);
});
