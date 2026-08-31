import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createSafeInquiryDisplayCopy,
  extractInquiryMimeAttachments,
} from "../src/inquiry-evidence-storage-service.js";

const BOUNDARY = "vault-source-extraction-boundary";
const ATTACHMENT_BYTES = Buffer.from("server-owned canonical attachment bytes\n");

function mime() {
  return Buffer.from([
    "From: sender@example.com",
    "To: lawyer@amic.kr",
    "Date: Fri, 28 Aug 2026 01:00:00 +0000",
    "Subject: Canonical attachment extraction",
    "Message-ID: <vault-source-extraction@amic.kr>",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${BOUNDARY}\"`,
    "",
    `--${BOUNDARY}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Message body",
    `--${BOUNDARY}`,
    "Content-Type: application/pdf; name=\"evidence.pdf\"",
    "Content-Disposition: attachment; filename=\"evidence.pdf\"",
    "Content-Transfer-Encoding: base64",
    "",
    ATTACHMENT_BYTES.toString("base64"),
    `--${BOUNDARY}--`,
    "",
  ].join("\r\n"));
}

test("server-only MIME extraction returns exact attachment bytes while display projection stays byte-free", () => {
  const extracted = extractInquiryMimeAttachments({
    mime_bytes: mime(),
    max_mime_bytes: 1024 * 1024,
    max_total_attachment_bytes: 1024 * 1024,
  });
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].file_name, "evidence.pdf");
  assert.equal(extracted[0].mime_type, "application/pdf");
  assert.equal(extracted[0].byte_size, ATTACHMENT_BYTES.byteLength);
  assert.equal(
    extracted[0].sha256,
    createHash("sha256").update(ATTACHMENT_BYTES).digest("hex"),
  );
  assert.equal(Buffer.isBuffer(extracted[0].content_bytes), true);
  assert.equal(extracted[0].content_bytes.equals(ATTACHMENT_BYTES), true);

  const display = createSafeInquiryDisplayCopy({
    mime_bytes: mime(),
    message_metadata: {
      subject: "Canonical attachment extraction",
      sender: { address: "sender@example.com" },
      recipients: [{ address: "lawyer@amic.kr" }],
      received_at: "2026-08-28T01:00:00.000Z",
    },
    max_display_bytes: 4096,
  });
  assert.equal(Object.hasOwn(display.attachment_manifest[0], "content_bytes"), false);
  assert.equal(JSON.stringify(display).includes(ATTACHMENT_BYTES.toString("utf8").trim()), false);
});

test("server-only MIME extraction fails closed when total decoded attachments exceed the bound", () => {
  assert.throws(
    () => extractInquiryMimeAttachments({
      mime_bytes: mime(),
      max_mime_bytes: 1024 * 1024,
      max_total_attachment_bytes: ATTACHMENT_BYTES.byteLength - 1,
    }),
    (error) => error.safe_error_code === "INQUIRY_EVIDENCE_MIME_INVALID"
      && error.status === 413,
  );
});
