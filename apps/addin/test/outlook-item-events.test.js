import assert from "node:assert/strict";
import test from "node:test";
import {
  createOutlookOperationSnapshot,
  isFiledEmailContextCurrent,
  isOutlookActionContextCurrent,
  isOutlookOperationSnapshotContextCurrent,
  isOutlookOperationSnapshotCurrent,
  isSameOutlookItem,
  outlookItemChangeDisposition,
  outlookItemContextKey,
  outlookItemIdentityKey,
  outlookOperationReceiptCanonicalGraphMessageId,
  reconcileOutlookOperationResult,
  subscribeToOutlookItemChanges,
} from "../src/outlook-item-events.js";

function item(suffix) {
  return {
    graph_message_id: `graph-${suffix}`,
    canonical_graph_message_id: `immutable-${suffix}`,
    internet_message_id: `<internet-${suffix}@example.invalid>`,
    conversation_id: `conversation-${suffix}`,
  };
}

test("실제 Outlook 식별자 세 개가 모두 같은 경우에만 같은 메일로 본다", () => {
  assert.ok(outlookItemIdentityKey(item("001")));
  assert.equal(isSameOutlookItem(item("001"), { ...item("001") }), true);
  assert.equal(isSameOutlookItem(item("001"), item("002")), false);
  assert.equal(isSameOutlookItem(item("001"), { ...item("001"), conversation_id: "" }), false);
  assert.equal(isSameOutlookItem(null, null), false);
});

test("첨부와 후속 업무는 같은 메일을 같은 Matter에 먼저 보관한 결과만 사용한다", () => {
  const currentItem = item("001");
  const emailResult = {
    local_outlook_item_key: outlookItemIdentityKey(currentItem),
    local_matter_id: "matter-001",
  };
  assert.equal(isFiledEmailContextCurrent({ emailResult, currentItem, matterId: "matter-001" }), true);
  assert.equal(isFiledEmailContextCurrent({ emailResult, currentItem: item("002"), matterId: "matter-001" }), false);
  assert.equal(isFiledEmailContextCurrent({ emailResult, currentItem, matterId: "matter-002" }), false);
  assert.equal(isFiledEmailContextCurrent({ emailResult: null, currentItem, matterId: "matter-001" }), false);
});

test("비동기 처리 결과는 시작할 때와 같은 메일 및 Matter에만 반영한다", () => {
  const sourceItem = item("001");
  assert.equal(isOutlookActionContextCurrent({
    sourceItem,
    currentItem: { ...sourceItem },
    sourceMatterId: "matter-001",
    currentMatterId: "matter-001",
  }), true);
  assert.equal(isOutlookActionContextCurrent({
    sourceItem,
    currentItem: item("002"),
    sourceMatterId: "matter-001",
    currentMatterId: "matter-001",
  }), false);
  assert.equal(isOutlookActionContextCurrent({
    sourceItem,
    currentItem: { ...sourceItem },
    sourceMatterId: "matter-001",
    currentMatterId: "matter-002",
  }), false);
});

test("메일·모드·발신 provenance를 합친 item context key는 결정적이다", () => {
  const restIdentity = {
    rest_message_id: "rest-001",
    internet_message_id: "<internet-001@example.invalid>",
    conversation_id: "conversation-001",
  };
  const first = outlookItemContextKey({
    item: restIdentity,
    mode: "read",
    provenance: "received",
  });
  assert.ok(first);
  assert.equal(first, outlookItemContextKey({
    item: { ...restIdentity },
    mode: "read",
    provenance: "received",
  }));
  assert.notEqual(first, outlookItemContextKey({
    item: restIdentity,
    mode: "compose",
    provenance: "draft",
  }));
  assert.equal(
    outlookItemIdentityKey(restIdentity),
    outlookItemIdentityKey({ ...restIdentity, graph_message_id: restIdentity.rest_message_id }),
  );
});

test("mutating action은 PII 본문 없이 불변 item/Matter/operation snapshot을 만든다", () => {
  const sourceItem = {
    ...item("001"),
    rest_message_id: "graph-001",
    canonical_graph_message_id: "immutable-001",
    subject: "snapshot에 들어가면 안 되는 제목",
    body_preview: "snapshot에 들어가면 안 되는 본문",
  };
  const snapshot = createOutlookOperationSnapshot({
    item: sourceItem,
    mode: "read",
    provenance: "received",
    matterId: "matter-001",
    operationStartKey: "operation-start-001",
  });
  sourceItem.graph_message_id = "mutated-after-snapshot";

  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.item_identity), true);
  assert.equal(snapshot.item_identity.rest_message_id, "graph-001");
  assert.equal(snapshot.item_identity.canonical_graph_message_id, "immutable-001");
  assert.equal(snapshot.matter_id, "matter-001");
  assert.equal(snapshot.operation_start_key, "operation-start-001");
  assert.equal("subject" in snapshot.item_identity, false);
  assert.equal("body_preview" in snapshot.item_identity, false);

  const differentOperation = createOutlookOperationSnapshot({
    item: item("001"),
    mode: "read",
    provenance: "received",
    matterId: "matter-001",
    operationStartKey: "operation-start-002",
  });
  assert.notEqual(snapshot.operation_context_key, differentOperation.operation_context_key);
});

test("item·mode·Matter·canonical Graph identity 변경은 결과를 현재 화면에서 격리한다", () => {
  const sourceItem = {
    ...item("001"),
    canonical_graph_message_id: "immutable-001",
  };
  const snapshot = createOutlookOperationSnapshot({
    item: sourceItem,
    mode: "read",
    provenance: "received",
    matterId: "matter-001",
    operationStartKey: "operation-start-001",
  });
  const current = {
    snapshot,
    currentItem: { ...sourceItem },
    currentMode: "read",
    currentProvenance: "received",
    currentMatterId: "matter-001",
    currentOperationStartKey: "operation-start-001",
    currentCanonicalGraphMessageId: "immutable-001",
    actualCanonicalGraphMessageId: "immutable-001",
  };
  assert.equal(isOutlookOperationSnapshotCurrent(current), true);
  for (const changed of [
    { currentItem: item("002") },
    { currentMode: "compose" },
    { currentProvenance: "draft" },
    { currentMatterId: "matter-002" },
    { currentOperationStartKey: "operation-start-002" },
    { currentCanonicalGraphMessageId: "immutable-002" },
    { actualCanonicalGraphMessageId: "immutable-002" },
  ]) {
    assert.equal(isOutlookOperationSnapshotCurrent({ ...current, ...changed }), false);
  }
});

test("canonical Graph expected/current/actual identity가 하나라도 없으면 fail closed한다", () => {
  assert.throws(
    () => createOutlookOperationSnapshot({
      item: {
        graph_message_id: "graph-missing-canonical",
        internet_message_id: "<missing@example.invalid>",
        conversation_id: "conversation-missing",
      },
      mode: "read",
      provenance: "received",
      matterId: "matter-001",
      operationStartKey: "operation-start-missing",
    }),
    /canonical Graph identity is required/u,
  );

  const snapshot = createOutlookOperationSnapshot({
    item: item("001"),
    mode: "read",
    provenance: "received",
    matterId: "matter-001",
    operationStartKey: "operation-start-001",
  });
  const current = {
    snapshot,
    currentItem: item("001"),
    currentMode: "read",
    currentProvenance: "received",
    currentMatterId: "matter-001",
    currentOperationStartKey: "operation-start-001",
    currentCanonicalGraphMessageId: "immutable-001",
    actualCanonicalGraphMessageId: "immutable-001",
  };
  assert.equal(isOutlookOperationSnapshotCurrent(current), true);
  for (const missing of [
    { currentItem: { ...item("001"), canonical_graph_message_id: "" }, currentCanonicalGraphMessageId: "" },
    { actualCanonicalGraphMessageId: "" },
  ]) {
    assert.equal(isOutlookOperationSnapshotCurrent({ ...current, ...missing }), false);
  }
  assert.equal(isOutlookOperationSnapshotContextCurrent({
    ...current,
    actualCanonicalGraphMessageId: undefined,
  }), true);
});

test("A→B→A 전환은 같은 item key로 돌아와도 operation generation을 재사용하지 않는다", () => {
  const snapshot = createOutlookOperationSnapshot({
    item: item("001"),
    mode: "read",
    provenance: "received",
    matterId: "matter-001",
    operationStartKey: "generation-before-item-change",
  });
  assert.equal(isOutlookOperationSnapshotContextCurrent({
    snapshot,
    currentItem: item("001"),
    currentMode: "read",
    currentProvenance: "received",
    currentMatterId: "matter-001",
    currentOperationStartKey: "generation-after-item-change",
    currentCanonicalGraphMessageId: "immutable-001",
  }), false);
});

test("production receipts expose one canonical Graph identity or fail closed", () => {
  assert.equal(outlookOperationReceiptCanonicalGraphMessageId({
    email_thread: { graph_message_id: "immutable-file-001" },
  }), "immutable-file-001");
  assert.equal(outlookOperationReceiptCanonicalGraphMessageId({
    source_identity: { canonical_graph_message_id: "immutable-source-001" },
  }), "immutable-source-001");
  assert.equal(outlookOperationReceiptCanonicalGraphMessageId({}), "");
});

test("서버 완료 receipt는 원래 context에 남고 stale 화면에는 적용하거나 rollback하지 않는다", () => {
  const sourceItem = item("001");
  const snapshot = createOutlookOperationSnapshot({
    item: sourceItem,
    mode: "read",
    provenance: "received",
    matterId: "matter-001",
    operationStartKey: "operation-start-001",
  });
  const receipt = Object.freeze({ request_id: "request-001", outcome: "created" });
  const result = reconcileOutlookOperationResult({
    snapshot,
    currentItem: sourceItem,
    currentMode: "read",
    currentProvenance: "received",
    currentMatterId: "matter-002",
    currentOperationStartKey: "operation-start-001",
    actualCanonicalGraphMessageId: "immutable-001",
    receipt,
  });

  assert.equal(result.state, "stale_item");
  assert.equal(result.apply_to_current_view, false);
  assert.equal(result.server_write_completed, true);
  assert.equal(result.rollback_requested, false);
  assert.equal(result.recovery_action, "reselect_matter");
  assert.equal(result.receipt, receipt);
  assert.equal(result.original_operation, snapshot);

  const complete = reconcileOutlookOperationResult({
    snapshot,
    currentItem: sourceItem,
    currentMode: "read",
    currentProvenance: "received",
    currentMatterId: "matter-001",
    currentOperationStartKey: "operation-start-001",
    actualCanonicalGraphMessageId: "immutable-001",
    receipt,
  });
  assert.equal(complete.state, "complete");
  assert.equal(complete.apply_to_current_view, true);
});

test("ItemChanged disposition은 overlay를 닫고 정확한 opener에 focus를 복원한다", () => {
  assert.deepEqual(outlookItemChangeDisposition({
    previousContext: { item: item("001"), mode: "read", provenance: "received" },
    currentContext: { item: item("002"), mode: "read", provenance: "received" },
    openerId: "matter-search-opener",
  }), {
    context_changed: true,
    close_overlay: true,
    clear_matter_selection: true,
    restore_focus_to: "matter-search-opener",
    result_state: "stale_item",
  });
});

test("고정 작업창은 ItemChanged를 구독하고 해제 후 이전 handler를 실행하지 않는다", () => {
  const registrations = [];
  const removals = [];
  let changeCount = 0;
  const Office = {
    EventType: { ItemChanged: "itemChanged" },
    context: {
      mailbox: {
        addHandlerAsync: (...args) => registrations.push(args),
        removeHandlerAsync: (...args) => removals.push(args),
      },
    },
  };
  const dispose = subscribeToOutlookItemChanges({
    Office,
    onChange: () => { changeCount += 1; },
  });
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0][0], "itemChanged");
  registrations[0][1]();
  assert.equal(changeCount, 1);

  dispose();
  registrations[0][1]();
  assert.equal(changeCount, 1);
  assert.deepEqual(removals, [["itemChanged", { handler: registrations[0][1] }]]);
});

test("ItemChanged를 지원하지 않는 Outlook host에서도 정리 함수는 안전하다", () => {
  const dispose = subscribeToOutlookItemChanges({ Office: {}, onChange: () => {} });
  assert.equal(typeof dispose, "function");
  assert.doesNotThrow(dispose);
  assert.throws(() => subscribeToOutlookItemChanges({ Office: {} }), /onChange is required/u);
});
