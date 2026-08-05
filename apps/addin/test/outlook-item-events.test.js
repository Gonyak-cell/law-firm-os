import assert from "node:assert/strict";
import test from "node:test";
import {
  isFiledEmailContextCurrent,
  isOutlookActionContextCurrent,
  isSameOutlookItem,
  outlookItemIdentityKey,
  subscribeToOutlookItemChanges,
} from "../src/outlook-item-events.js";

function item(suffix) {
  return {
    graph_message_id: `graph-${suffix}`,
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
