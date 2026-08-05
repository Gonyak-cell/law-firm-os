import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInquiryRegistrationRequest,
  inquiryResultCopy,
  outlookActionErrorMessage,
} from "../src/inquiry-actions.js";

const INPUT = Object.freeze({
  rest_message_id: "rest-message-sensitive-identifier",
});

test("CL-P3-W01-T05 같은 메일과 행동은 원본 ID가 드러나지 않는 같은 재처리 키를 만든다", async () => {
  const first = await buildInquiryRegistrationRequest({
    ...INPUT,
    action: "new",
  });
  const replay = await buildInquiryRegistrationRequest({
    ...INPUT,
    action: "new",
  });
  assert.deepEqual(replay, first);
  assert.match(
    first.idempotency_key,
    /^outlook-inquiry:new:[a-f0-9]{64}$/u,
  );
  assert.equal(
    first.idempotency_key.includes(INPUT.rest_message_id),
    false,
  );
  assert.deepEqual(Object.keys(first).sort(), [
    "action",
    "idempotency_key",
    "rest_message_id",
  ]);
});

test("CL-P3-W01-T05 기존 문의 연결 키는 선택한 문의별로 안정적이고 새 문의 요청과 충돌하지 않는다", async () => {
  const first = await buildInquiryRegistrationRequest({
    ...INPUT,
    action: "link_existing",
    existing_lead_id: "lead-existing-001",
  });
  const replay = await buildInquiryRegistrationRequest({
    ...INPUT,
    action: "link_existing",
    existing_lead_id: "lead-existing-001",
  });
  const other = await buildInquiryRegistrationRequest({
    ...INPUT,
    action: "link_existing",
    existing_lead_id: "lead-existing-002",
  });
  assert.deepEqual(replay, first);
  assert.notEqual(other.idempotency_key, first.idempotency_key);
  assert.equal(first.existing_lead_id, "lead-existing-001");
  await assert.rejects(
    buildInquiryRegistrationRequest({
      ...INPUT,
      action: "link_existing",
    }),
    /existing_lead_id is required/u,
  );
});
test("CL-P3-W01-T05 처리 결과와 실패 사유를 자연스러운 한국어로 안내한다", () => {
  assert.deepEqual(inquiryResultCopy({
    action: "new",
    item: {
      lead_id: "lead-new",
      idempotent_replay: false,
    },
  }), {
    title: "새 문의로 등록했습니다.",
    detail: "문의 번호 lead-new",
    tone: "success",
  });
  assert.equal(inquiryResultCopy({
    action: "link_existing",
    item: {
      lead_id: "lead-existing",
      idempotent_replay: true,
    },
  }).title, "이미 선택한 문의에 연결된 메일입니다.");
  assert.equal(
    outlookActionErrorMessage({
      safe_error_code: "M365_CONNECTION_NOT_FOUND",
    }),
    "Outlook 연결 설정이 필요합니다.",
  );
  assert.equal(
    outlookActionErrorMessage({
      message: "OUTLOOK_READ_ITEM_REQUIRED",
    }),
    "읽기 화면에서 저장된 메일을 선택해 주세요.",
  );
});
