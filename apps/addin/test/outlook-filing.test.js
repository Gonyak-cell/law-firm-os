import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_EMAIL_FILING_PATH,
  OUTLOOK_SENT_FILING_PATH,
  createOutlookFilingRequest,
} from "../src/outlook-filing.js";
import {
  handleOutlookMessageSend,
  OUTLOOK_SMART_ALERTS_PATH,
} from "../src/outlook-send-events.js";

const email = {
  graph_message_id: "graph-message-001",
  internet_message_id: "<message-001@example.invalid>",
  conversation_id: "conversation-001",
};

test("일반 Matter 보관과 명시적 보낸 메일 보관은 서로 다른 API 경로를 사용한다", () => {
  const ordinary = createOutlookFilingRequest({ matterId: "matter-001", email });
  const sent = createOutlookFilingRequest({
    matterId: "matter-001",
    email,
    mode: "sent",
  });

  assert.equal(ordinary.path, OUTLOOK_EMAIL_FILING_PATH);
  assert.equal(sent.path, OUTLOOK_SENT_FILING_PATH);
});

test("OnMessageSend는 발송 전 경고만 평가하고 메일 보관 API를 호출하지 않는다", async () => {
  const paths = [];
  let completion = null;
  await handleOutlookMessageSend({
    event: { completed: (value) => { completion = value; } },
    readMessage: async () => email,
    requestJson: async (path) => {
      paths.push(path);
      return { item: { warnings: [], warning_count: 0, send_blocked: false } };
    },
  });

  assert.deepEqual(paths, [OUTLOOK_SMART_ALERTS_PATH]);
  assert.equal(paths.includes(OUTLOOK_EMAIL_FILING_PATH), false);
  assert.equal(paths.includes(OUTLOOK_SENT_FILING_PATH), false);
  assert.deepEqual(completion, { allowEvent: true });
});
