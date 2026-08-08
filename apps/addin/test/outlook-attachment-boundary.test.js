import assert from "node:assert/strict";
import test from "node:test";
import { saveOutlookAttachments } from "../src/outlook-attachment-actions.js";
import {
  MAX_OUTLOOK_ATTACHMENT_BYTES,
  OUTLOOK_ITEM_CONTENT_ERROR_CODES,
} from "../src/outlook-item-content.js";

function input(attachments) {
  return {
    currentItem: { conversation_id: "conversation-001", attachments, unsupported: [] },
    matterId: "matter-001",
    emailThreadId: "thread-001",
  };
}

test("읽힌 payload가 2MiB를 넘으면 fetch 전에 전체 요청을 닫는다", async () => {
  let requests = 0;
  const oversized = Buffer.alloc(MAX_OUTLOOK_ATTACHMENT_BYTES + 1).toString("base64");
  await assert.rejects(saveOutlookAttachments({
    ...input([{
      attachment_id: "attachment-oversized",
      name: "oversized.bin",
      content_type: "application/octet-stream",
      content_base64: oversized,
    }]),
    requestJson: async () => { requests += 1; },
  }), (error) => error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_too_large);
  assert.equal(requests, 0);
});

test("중복 attachment_id는 첫 fetch 전에 fail closed한다", async () => {
  let requests = 0;
  const duplicate = {
    attachment_id: "attachment-duplicate",
    name: "duplicate.txt",
    content_type: "text/plain",
    content_text: "same id",
  };
  await assert.rejects(saveOutlookAttachments({
    ...input([duplicate, { ...duplicate, name: "forged-second.txt" }]),
    requestJson: async () => { requests += 1; },
  }), (error) => error.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_duplicate_id);
  assert.equal(requests, 0);
});
