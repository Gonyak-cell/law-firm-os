import assert from "node:assert/strict";
import test from "node:test";
import {
  createRegistrationLatch,
  OFFICE_READY_TIMEOUT_MS,
  startOfficeTaskPane,
  waitForOfficeReady,
} from "../src/office-ready.js";

test("Office 준비 신호가 끝나지 않아도 제한 시간 뒤 초기화를 계속하고 늦은 준비를 알린다", async () => {
  let readyCallback;
  let timeoutCallback;
  let lateReadyCount = 0;
  const cleared = [];
  const pending = waitForOfficeReady({
    Office: {
      onReady(callback) {
        readyCallback = callback;
        return new Promise(() => {});
      },
    },
    timeoutMs: 25,
    setTimeoutImpl(callback, delay) {
      assert.equal(delay, 25);
      timeoutCallback = callback;
      return 7;
    },
    clearTimeoutImpl(id) {
      cleared.push(id);
    },
    onLateReady() {
      lateReadyCount += 1;
    },
  });

  assert.equal(OFFICE_READY_TIMEOUT_MS, 5_000);
  timeoutCallback();
  assert.deepEqual(await pending, { status: "timed_out" });
  readyCallback();
  readyCallback();
  assert.equal(lateReadyCount, 1);
  assert.deepEqual(cleared, [7]);
});

test("Office 준비 콜백이 먼저 오면 제한 시간을 취소한다", async () => {
  let readyCallback;
  let timeoutCallback;
  const cleared = [];
  const pending = waitForOfficeReady({
    Office: {
      onReady(callback) {
        readyCallback = callback;
        return undefined;
      },
    },
    setTimeoutImpl(callback) {
      timeoutCallback = callback;
      return 9;
    },
    clearTimeoutImpl(id) {
      cleared.push(id);
    },
  });

  readyCallback();
  timeoutCallback();
  assert.deepEqual(await pending, { status: "ready" });
  assert.deepEqual(cleared, [9]);
});

test("작업창은 Office 준비가 끝나지 않아도 첫 화면을 즉시 렌더링한다", () => {
  const calls = [];
  startOfficeTaskPane({
    render() {
      calls.push("render");
    },
    waitForReady() {
      calls.push("wait");
      return new Promise(() => {});
    },
    register() {
      calls.push("register");
    },
  });

  assert.deepEqual(calls, ["render", "wait"]);
});

test("Office 작업 등록은 실패하면 늦은 준비 시 재시도하고 성공 후에는 중복하지 않는다", () => {
  const outcomes = [false, true];
  let calls = 0;
  const registerOnce = createRegistrationLatch(() => {
    const outcome = outcomes[calls];
    calls += 1;
    return outcome;
  });

  assert.equal(registerOnce(), false);
  assert.equal(registerOnce(), true);
  assert.equal(registerOnce(), true);
  assert.equal(calls, 2);
});
