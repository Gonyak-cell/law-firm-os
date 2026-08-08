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

function boundaryError(code, message, attachment = {}) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    user_message: message,
    attachment_id: attachment.attachment_id ?? null,
  });
}

function payloadByteLength(attachment = {}) {
  if (typeof attachment.content_base64 === "string") {
    const encoded = attachment.content_base64.replace(/\s+/gu, "");
    if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) {
      throw boundaryError(
        OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_invalid_base64,
        "첨부 데이터 형식이 올바르지 않아 저장하지 않았습니다.",
        attachment,
      );
    }
    const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
    return Math.floor((encoded.length * 3) / 4) - padding;
  }
  if (typeof attachment.content_text === "string") {
    return new TextEncoder().encode(attachment.content_text).byteLength;
  }
  return 0;
}

function assertAttachmentBoundary(attachments, maxAttachmentBytes) {
  const ids = new Set();
  for (const attachment of attachments) {
    const id = typeof attachment?.attachment_id === "string"
      ? attachment.attachment_id.trim()
      : "";
    if (!id) {
      throw boundaryError(
        OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_missing_id,
        "첨부 식별자가 없어 저장하지 않았습니다.",
        attachment,
      );
    }
    if (ids.has(id)) {
      throw boundaryError(
        OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_duplicate_id,
        "중복된 첨부 식별자가 있어 저장하지 않았습니다.",
        attachment,
      );
    }
    ids.add(id);
    if (payloadByteLength(attachment) > maxAttachmentBytes) {
      throw boundaryError(
        OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_too_large,
        "첨부 파일이 2MiB를 초과해 저장할 수 없습니다.",
        attachment,
      );
    }
  }
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
  allowAllFailedResult = false,
} = {}) {
  if (typeof requestJson !== "function") {
    throw new TypeError("requestJson is required");
  }

  const item = currentItem && typeof currentItem === "object" ? currentItem : {};
  const attachmentLimit = Number.isSafeInteger(maxAttachmentBytes) && maxAttachmentBytes > 0
    ? Math.min(maxAttachmentBytes, MAX_OUTLOOK_ATTACHMENT_BYTES)
    : MAX_OUTLOOK_ATTACHMENT_BYTES;
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
  assertAttachmentBoundary(attachments, attachmentLimit);

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

  if (!allowAllFailedResult && saved.length === 0 && failed.length > 0) {
    throw saveFailedError({ skipped: unsupported, failed });
  }

  const lastSaved = saved.at(-1)?.body ?? { outcome: "attachments_saved" };
  const result = {
    ...lastSaved,
    saved_attachments: saved,
    failed_attachments: failed,
    skipped_attachments: unsupported,
    request_count: saved.length + failed.length,
    max_attachment_bytes: attachmentLimit,
  };
  const notices = [
    ...unsupported.map((entry) => messageText(entry?.message)),
    ...failed.map((entry) => `${entry.name} (${entry.message})`),
  ];

  return { result, notices };
}
