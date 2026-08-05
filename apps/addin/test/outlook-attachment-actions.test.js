import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ATTACHMENT_SAVE_PATH,
  saveOutlookAttachments,
} from "../src/outlook-attachment-actions.js";
import { OUTLOOK_ITEM_CONTENT_ERROR_CODES } from "../src/outlook-item-content.js";

function attachment(id, name = `${id}.pdf`) {
  return {
    attachment_id: id,
    name,
    content_type: "application/pdf",
    content_base64: "YWJj",
    confidentiality: "internal",
  };
}

function item(overrides = {}) {
  return {
    conversation_id: "conversation-001",
    attachments: [attachment("att-001"), attachment("att-002")],
    unsupported: [],
    ...overrides,
  };
}

test("지원되는 첨부마다 한 번씩 POST하고 선택 ID와 Matter/스레드를 그대로 전달한다", async () => {
  const calls = [];
  const result = await saveOutlookAttachments({
    currentItem: item(),
    matterId: "matter-001",
    emailResult: { email_thread: { email_thread_id: "thread-from-filed-email" } },
    requestJson: async (path, options) => {
      calls.push({ path, options });
      return { outcome: "attachments_saved", attachment_id: options.body.selected_attachment_ids[0] };
    },
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.path), [OUTLOOK_ATTACHMENT_SAVE_PATH, OUTLOOK_ATTACHMENT_SAVE_PATH]);
  assert.deepEqual(calls.map((call) => call.options.body), [
    {
      matter_id: "matter-001",
      email_thread_id: "thread-from-filed-email",
      selected_attachment_ids: ["att-001"],
      attachments: [attachment("att-001")],
    },
    {
      matter_id: "matter-001",
      email_thread_id: "thread-from-filed-email",
      selected_attachment_ids: ["att-002"],
      attachments: [attachment("att-002")],
    },
  ]);
  assert.equal(result.result.request_count, 2);
  assert.equal(result.result.saved_attachments.length, 2);
  assert.deepEqual(result.notices, []);
});

test("필드 이메일 스레드가 없으면 실제 conversation_id를 fallback thread ID로 사용한다", async () => {
  const calls = [];
  await saveOutlookAttachments({
    currentItem: item({ attachments: [attachment("att-001")] }),
    matterId: "matter-002",
    requestJson: async (_path, options) => {
      calls.push(options);
      return { outcome: "attachments_saved" };
    },
  });
  assert.equal(calls[0].body.email_thread_id, "thread:conversation-001");
});

test("emailThreadId를 명시하면 이메일 결과와 fallback보다 우선한다", async () => {
  const calls = [];
  await saveOutlookAttachments({
    currentItem: item({ attachments: [attachment("att-001")] }),
    matterId: "matter-003",
    emailResult: { email_thread: { email_thread_id: "thread-from-filed-email" } },
    emailThreadId: "thread-explicit",
    requestJson: async (_path, options) => {
      calls.push(options);
      return { outcome: "attachments_saved" };
    },
  });
  assert.equal(calls[0].body.email_thread_id, "thread-explicit");
});

test("일부 POST 실패는 저장 성공 결과와 실패/건너뜀 안내를 함께 반환한다", async () => {
  const calls = [];
  const result = await saveOutlookAttachments({
    currentItem: item({
      unsupported: [{
        attachment_id: "cloud-001",
        name: "공유 링크",
        message: "공유 링크는 저장할 수 없습니다.",
        safe_error_code: "OUTLOOK_ATTACHMENT_CONTENT_UNSUPPORTED",
      }],
    }),
    matterId: "matter-004",
    requestJson: async (_path, options) => {
      calls.push(options.body.selected_attachment_ids[0]);
      if (options.body.selected_attachment_ids[0] === "att-002") {
        throw Object.assign(new Error("M365_SCOPE_INSUFFICIENT"), {
          safe_error_code: "M365_SCOPE_INSUFFICIENT",
        });
      }
      return { outcome: "attachments_saved", item: { attachment_id: "att-001" } };
    },
  });

  assert.deepEqual(calls, ["att-001", "att-002"]);
  assert.equal(result.result.saved_attachments.length, 1);
  assert.equal(result.result.failed_attachments.length, 1);
  assert.equal(result.result.skipped_attachments.length, 1);
  assert.equal(result.result.failed_attachments[0].message, "메일 읽기 권한을 다시 승인해 주세요.");
  assert.deepEqual(result.notices, [
    "공유 링크는 저장할 수 없습니다.",
    "att-002.pdf (메일 읽기 권한을 다시 승인해 주세요.)",
  ]);
});

test("모든 지원 첨부 POST가 실패하면 안전 코드와 종합 안내를 던진다", async () => {
  const error = await assert.rejects(
    saveOutlookAttachments({
      currentItem: item({
        attachments: [attachment("att-001", "계약서.pdf"), attachment("att-002", "위임장.pdf")],
        unsupported: [{ message: "공유 링크는 저장할 수 없습니다." }],
      }),
      matterId: "matter-005",
      requestJson: async () => {
        throw Object.assign(new Error("M365_CONNECTION_NOT_FOUND"), {
          safe_error_code: "M365_CONNECTION_NOT_FOUND",
        });
      },
    }),
    (nextError) => {
      assert.equal(nextError.safe_error_code, "OUTLOOK_ATTACHMENT_SAVE_FAILED");
      assert.match(nextError.user_message, /공유 링크는 저장할 수 없습니다/);
      assert.match(nextError.user_message, /계약서\.pdf \(Outlook 연결 설정이 필요합니다\.\)/);
      assert.match(nextError.user_message, /위임장\.pdf \(Outlook 연결 설정이 필요합니다\.\)/);
      return true;
    },
  );
  assert.equal(error, undefined);
});

test("지원 첨부 없이 건너뛴 첨부만 있으면 원래 unsupported 오류를 유지한다", async () => {
  let requestCount = 0;
  await assert.rejects(
    saveOutlookAttachments({
      currentItem: item({
        attachments: [],
        unsupported: [{
          attachment_id: "cloud-001",
          name: "OneDrive 링크",
          message: "링크/클라우드 첨부는 현재 파일로 저장할 수 없습니다.",
          safe_error_code: OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported,
        }],
      }),
      matterId: "matter-006",
      requestJson: async () => {
        requestCount += 1;
      },
    }),
    (error) => {
      assert.equal(error.safe_error_code, OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported);
      assert.match(error.user_message, /링크\/클라우드 첨부/);
      return true;
    },
  );
  assert.equal(requestCount, 0);
});

test("첨부가 전혀 없으면 not found 오류를 던지고 API를 호출하지 않는다", async () => {
  let requestCount = 0;
  await assert.rejects(
    saveOutlookAttachments({
      currentItem: item({ attachments: [], unsupported: [] }),
      matterId: "matter-007",
      requestJson: async () => {
        requestCount += 1;
      },
    }),
    (error) => error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_not_found,
  );
  assert.equal(requestCount, 0);
});

test("안전한 표시 함수가 주입되면 API 오류 사용자 문구를 그대로 사용한다", async () => {
  const result = await saveOutlookAttachments({
    currentItem: item({ attachments: [attachment("att-001", "원문.eml")] }),
    matterId: "matter-008",
    errorMessage: () => "주입된 안전한 오류 문구",
    requestJson: async () => {
      throw new Error("raw provider detail");
    },
  }).catch((error) => error);
  assert.equal(result.safe_error_code, "OUTLOOK_ATTACHMENT_SAVE_FAILED");
  assert.match(result.user_message, /원문\.eml \(주입된 안전한 오류 문구\)/);
});
