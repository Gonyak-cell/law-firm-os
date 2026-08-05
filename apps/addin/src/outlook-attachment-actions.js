import { outlookActionErrorMessage } from "./inquiry-actions.js";
import {
  MAX_OUTLOOK_ATTACHMENT_BYTES,
  OUTLOOK_ITEM_CONTENT_ERROR_CODES,
} from "./outlook-item-content.js";

export const OUTLOOK_ATTACHMENT_SAVE_PATH = "/api/outlook/attachments/save";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function messageText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "저장하지 못했습니다.";
}

function unsupportedError({ unsupported } = {}) {
  const firstSkipped = unsupported[0];
  return Object.assign(new Error("OUTLOOK_ATTACHMENT_CONTENT_UNSUPPORTED"), {
    safe_error_code:
      firstSkipped?.safe_error_code
      ?? OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported,
    user_message: unsupported.map((entry) => entry?.message).join(" "),
  });
}

function missingAttachmentError() {
  return Object.assign(new Error("OUTLOOK_ATTACHMENT_NOT_FOUND"), {
    safe_error_code: OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_not_found,
    user_message: "현재 Outlook 메일에 저장할 첨부 파일이 없습니다.",
  });
}

function saveFailedError({ skipped, failed } = {}) {
  const skippedMessages = skipped.map((entry) => entry?.message);
  const failedMessages = failed.map((entry) => `${entry.name} (${entry.message})`);
  return Object.assign(new Error("OUTLOOK_ATTACHMENT_SAVE_FAILED"), {
    safe_error_code: "OUTLOOK_ATTACHMENT_SAVE_FAILED",
    user_message: `첨부를 저장하지 못했습니다: ${[...skippedMessages, ...failedMessages].join(", ")}`,
  });
}

/**
 * Save the bounded attachment payloads read from an Outlook item.
 *
 * The helper deliberately owns only the per-attachment API orchestration.
 * Office.js reads, React state, and matter refreshes stay outside this module
 * and are supplied by the caller. This keeps one attachment per broker
 * request and makes partial-success behavior deterministic and testable.
 */
export async function saveOutlookAttachments({
  currentItem,
  matterId,
  emailResult,
  emailThreadId,
  requestJson,
  errorMessage = outlookActionErrorMessage,
  maxAttachmentBytes = MAX_OUTLOOK_ATTACHMENT_BYTES,
} = {}) {
  if (typeof requestJson !== "function") {
    throw new TypeError("requestJson is required");
  }

  const item = currentItem && typeof currentItem === "object" ? currentItem : {};
  const attachments = asArray(item.attachments);
  const unsupported = asArray(item.unsupported);
  const threadId = emailThreadId
    ?? emailResult?.email_thread?.email_thread_id
    ?? `thread:${item.conversation_id}`;

  if (unsupported.length > 0 && attachments.length === 0) {
    throw unsupportedError({ unsupported });
  }
  if (attachments.length === 0) {
    throw missingAttachmentError();
  }

  const saved = [];
  const failed = [];
  // Keep every Lambda request below the existing broker envelope: one
  // attachment and at most 2 MiB of raw content per POST.
  for (const attachment of attachments) {
    try {
      const body = await requestJson(OUTLOOK_ATTACHMENT_SAVE_PATH, {
        method: "POST",
        body: {
          matter_id: matterId,
          email_thread_id: threadId,
          selected_attachment_ids: [attachment.attachment_id],
          attachments: [attachment],
        },
      });
      saved.push({
        attachment_id: attachment.attachment_id,
        name: attachment.name,
        outcome: body.outcome,
        body,
      });
    } catch (nextError) {
      failed.push({
        attachment_id: attachment.attachment_id,
        name: attachment.name,
        message: nextError?.user_message
          ?? errorMessage(nextError),
      });
    }
  }

  if (saved.length === 0 && failed.length > 0) {
    throw saveFailedError({ skipped: unsupported, failed });
  }

  const lastSaved = saved.at(-1)?.body ?? { outcome: "attachments_saved" };
  const result = {
    ...lastSaved,
    saved_attachments: saved,
    failed_attachments: failed,
    skipped_attachments: unsupported,
    request_count: saved.length + failed.length,
    max_attachment_bytes: maxAttachmentBytes,
  };
  const notices = [
    ...unsupported.map((entry) => messageText(entry?.message)),
    ...failed.map((entry) => `${entry.name} (${entry.message})`),
  ];

  return { result, notices };
}
