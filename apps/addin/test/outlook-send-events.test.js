import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_SEND_HANDLER_NAME,
  OUTLOOK_SMART_ALERT_TIMEOUT_MS,
  OUTLOOK_SMART_ALERTS_PATH,
  handleOutlookMessageSend,
  registerOutlookSendHandler,
} from "../src/outlook-send-events.js";

function eventDouble() {
  const calls = [];
  return {
    event: { completed: (payload) => calls.push(payload) },
    calls,
  };
}

test("스마트 알림 경고는 PromptUser를 한 번 표시하고 평가 결과를 기록한다", async () => {
  const { event, calls } = eventDouble();
  const requests = [];
  const notifications = [];
  const records = [];
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async (options) => {
      assert.deepEqual(options, { allowBodyReadFailure: true });
      return { graph_message_id: "rest-message-001", body_preview: "본문 미리보기" };
    },
    requestJson: async (path, options) => {
      requests.push({ path, options });
      return {
        outcome: "warning",
        item: {
          warnings: [{ code: "deadline_near" }],
          warning_count: 1,
          send_blocked: false,
          provider_runtime_executed: true,
        },
      };
    },
    addWarningNotification: async (body) => notifications.push(body),
    record: (key, value) => records.push({ key, value }),
  });

  assert.equal(result.allowEvent, false);
  assert.match(result.errorMessage, /확인할 내용이 1건/);
  assert.equal(result.cancelLabel, "확인 후 다시 보내기");
  assert.equal(result.commandId, "msgComposeOpenPaneButton");
  assert.deepEqual(calls, [result]);
  assert.deepEqual(requests, [{
    path: OUTLOOK_SMART_ALERTS_PATH,
    options: {
      method: "POST",
      body: { message: { graph_message_id: "rest-message-001", body_preview: "본문 미리보기" } },
      timeoutMs: OUTLOOK_SMART_ALERT_TIMEOUT_MS,
    },
  }]);
  assert.equal(notifications.length, 1);
  assert.deepEqual(records, [{
    key: "last_send_handler_result",
    value: {
      outcome: "warning",
      warning_count: 1,
      send_blocked: false,
      provider_runtime_executed: true,
      allowEvent: false,
      raw_body_written: false,
      attachment_bytes_written: false,
    },
  }]);
});

test("send_blocked 응답은 PromptUser용 오류 메시지와 함께 전송을 멈춘다", async () => {
  const { event, calls } = eventDouble();
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async () => ({ graph_message_id: "rest-message-blocked" }),
    requestJson: async () => ({ item: { warnings: [], warning_count: 0, send_blocked: true } }),
  });
  assert.equal(result.allowEvent, false);
  assert.match(result.errorMessage, /확인할 내용이 1건/);
  assert.deepEqual(calls, [result]);
});

test("경고 배열이 없어도 서버 warning_count가 있으면 전송을 멈춘다", async () => {
  const { event, calls } = eventDouble();
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async () => ({ graph_message_id: "rest-message-warning-count" }),
    requestJson: async () => ({ item: { warnings: [], warning_count: 2, send_blocked: false } }),
  });
  assert.equal(result.allowEvent, false);
  assert.match(result.errorMessage, /확인할 내용이 2건/);
  assert.deepEqual(calls, [result]);
});

test("현재 메일을 읽을 수 없으면 API 없이 발송을 한 번 허용한다", async () => {
  const { event, calls } = eventDouble();
  let requestCalled = false;
  const records = [];
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async () => null,
    requestJson: async () => { requestCalled = true; },
    record: (key, value) => records.push({ key, value }),
  });
  assert.deepEqual(result, { allowEvent: true });
  assert.deepEqual(calls, [{ allowEvent: true }]);
  assert.equal(requestCalled, false);
  assert.equal(records[0].value.outcome, "no_item");
});

test("본문 읽기 또는 평가 요청 실패 시 경고를 시도하고 발송을 한 번 허용한다", async () => {
  const { event, calls } = eventDouble();
  const notifications = [];
  const records = [];
  const failure = Object.assign(new Error("body_read_failed"), { safe_error_code: "OUTLOOK_BODY_READ_FAILED" });
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async () => { throw failure; },
    requestJson: async () => { throw new Error("must_not_run"); },
    addWarningNotification: async (body) => notifications.push(body),
    record: (key, value) => records.push({ key, value }),
  });
  assert.deepEqual(result, { allowEvent: true });
  assert.deepEqual(calls, [{ allowEvent: true }]);
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0].item.warnings, [{
    code: "smart_alert_evaluation_failed",
    safe_error_code: "OUTLOOK_BODY_READ_FAILED",
  }]);
  assert.deepEqual(records[0], {
    key: "last_send_handler_result",
    value: {
      outcome: "allowed_after_local_alert_error",
      safe_error_code: "OUTLOOK_BODY_READ_FAILED",
      allowEvent: true,
      raw_body_written: false,
      attachment_bytes_written: false,
    },
  });
});

test("스마트 알림 API 오류도 요청 오류를 기록하고 발송을 한 번 허용한다", async () => {
  const { event, calls } = eventDouble();
  const notifications = [];
  const records = [];
  const failure = Object.assign(new Error("provider_unavailable"), { safe_error_code: "M365_PROVIDER_UNAVAILABLE" });
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async () => ({ graph_message_id: "rest-message-003" }),
    requestJson: async () => { throw failure; },
    addWarningNotification: async (body) => notifications.push(body),
    record: (key, value) => records.push({ key, value }),
  });
  assert.deepEqual(result, { allowEvent: true });
  assert.deepEqual(calls, [{ allowEvent: true }]);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].item.warnings[0].safe_error_code, "M365_PROVIDER_UNAVAILABLE");
  assert.equal(records[0].value.safe_error_code, "M365_PROVIDER_UNAVAILABLE");
});

test("경고 알림 자체가 실패해도 Office 이벤트를 두 번 완료하지 않는다", async () => {
  const { event, calls } = eventDouble();
  const records = [];
  const result = await handleOutlookMessageSend({
    event,
    readMessage: async () => ({ graph_message_id: "rest-message-002" }),
    requestJson: async () => ({ outcome: "ok", item: { warnings: [] } }),
    addWarningNotification: async () => { throw new Error("notification_failed"); },
    record: (key, value) => records.push({ key, value }),
  });
  assert.deepEqual(result, { allowEvent: true });
  assert.deepEqual(calls, [{ allowEvent: true }]);
  assert.equal(records[0].value.notification_error, "notification_failed");
});

test("점검 API가 응답하지 않아도 제한 시간 뒤 발송을 허용한다", async () => {
  const { event, calls } = eventDouble();
  const records = [];
  await handleOutlookMessageSend({
    event,
    readMessage: async () => ({ graph_message_id: "rest-message-timeout" }),
    requestJson: async () => new Promise(() => {}),
    addWarningNotification: async () => {},
    record: (key, value) => records.push({ key, value }),
    requestTimeoutMs: 5,
    notificationTimeoutMs: 5,
  });
  assert.deepEqual(calls, [{ allowEvent: true }]);
  assert.equal(records[0].value.safe_error_code, "OUTLOOK_SMART_ALERT_TIMEOUT");
});

test("Outlook 경고 표시 콜백이 멈춰도 발송 이벤트를 완료한다", async () => {
  const { event, calls } = eventDouble();
  const records = [];
  await handleOutlookMessageSend({
    event,
    readMessage: async () => ({ graph_message_id: "rest-message-notification-timeout" }),
    requestJson: async () => ({ outcome: "warning", item: { warnings: [{ code: "review" }] } }),
    addWarningNotification: async () => new Promise(() => {}),
    record: (key, value) => records.push({ key, value }),
    requestTimeoutMs: 5,
    notificationTimeoutMs: 5,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].allowEvent, false);
  assert.match(calls[0].errorMessage, /확인할 내용이 1건/);
  assert.equal(records[0].value.notification_error, "OUTLOOK_WARNING_NOTIFICATION_TIMEOUT");
});

test("Office.actions에는 매니페스트와 같은 정확한 함수명을 등록한다", () => {
  const calls = [];
  const handler = () => {};
  const Office = { actions: { associate: (...args) => calls.push(args) } };
  assert.equal(registerOutlookSendHandler({ Office, handler }), true);
  assert.deepEqual(calls, [[OUTLOOK_SEND_HANDLER_NAME, handler]]);
  assert.equal(OUTLOOK_SEND_HANDLER_NAME, "onMessageSendHandler");
  assert.equal(registerOutlookSendHandler({ Office: {} }), false);
});
