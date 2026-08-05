const SUCCESS_STATUSES = new Set(["succeeded", 0]);

export const OUTLOOK_ITEM_CONTENT_ERROR_CODES = Object.freeze({
  body_unavailable: "OUTLOOK_ITEM_BODY_UNAVAILABLE",
  headers_unavailable: "OUTLOOK_ITEM_HEADERS_UNAVAILABLE",
  compose_field_unavailable: "OUTLOOK_COMPOSE_FIELD_UNAVAILABLE",
  attachment_content_unavailable: "OUTLOOK_ATTACHMENT_CONTENT_UNAVAILABLE",
  attachment_unsupported: "OUTLOOK_ATTACHMENT_CONTENT_UNSUPPORTED",
  attachment_missing_id: "OUTLOOK_ATTACHMENT_ID_REQUIRED",
  attachment_invalid_base64: "OUTLOOK_ATTACHMENT_BASE64_INVALID",
  item_identity_required: "OUTLOOK_ITEM_IDENTITY_REQUIRED",
  attachment_not_found: "OUTLOOK_ATTACHMENT_NOT_FOUND",
  attachment_too_large: "OUTLOOK_ATTACHMENT_TOO_LARGE",
});

export const MAX_OUTLOOK_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const DEFAULT_OUTLOOK_OFFICE_TIMEOUT_MS = 8_000;

function contentError(safeErrorCode, message, details = {}) {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  error.user_message = message;
  Object.assign(error, details);
  return error;
}

function isSuccessful(result) {
  return !result?.status || SUCCESS_STATUSES.has(result.status);
}

function officeTimeoutMs(value) {
  return Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_OUTLOOK_OFFICE_TIMEOUT_MS;
}

function callOfficeAsync(target, methodName, args, { errorCode, message, timeoutMs } = {}) {
  const method = target?.[methodName];
  if (typeof method !== "function") {
    return Promise.reject(contentError(errorCode, message));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    const finish = (callback) => (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      callback(value);
    };
    const resolveOnce = finish(resolve);
    const rejectOnce = finish(reject);
    timer = setTimeout(() => {
      rejectOnce(contentError(errorCode, message, { office_timeout: true }));
    }, officeTimeoutMs(timeoutMs));
    try {
      const maybePromise = method.call(target, ...args, (result) => {
        if (!isSuccessful(result)) {
          rejectOnce(contentError(
            errorCode,
            message,
            { office_error: result?.error ?? null },
          ));
          return;
        }
        resolveOnce(result?.value);
      });
      // A few Office.js shims return a promise in test or modern hosts. The
      // callback remains the canonical API, but accepting the promise keeps
      // the bridge deterministic without exposing provider tokens.
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolveOnce, rejectOnce);
      }
    } catch (error) {
      rejectOnce(contentError(errorCode, message, { cause: error }));
    }
  });
}

export function readOutlookItemBody({ item, Office, timeoutMs } = {}) {
  if (typeof item?.body?.getAsync !== "function") {
    return Promise.reject(contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.body_unavailable,
      "현재 Outlook 메일 본문을 읽을 수 없습니다.",
    ));
  }
  const coercionType = Office?.CoercionType?.Text ?? "text";
  return callOfficeAsync(item.body, "getAsync", [coercionType], {
    errorCode: OUTLOOK_ITEM_CONTENT_ERROR_CODES.body_unavailable,
    message: "현재 Outlook 메일 본문을 읽을 수 없습니다.",
    timeoutMs,
  }).then((value) => {
    if (typeof value !== "string") {
      throw contentError(
        OUTLOOK_ITEM_CONTENT_ERROR_CODES.body_unavailable,
        "현재 Outlook 메일 본문을 읽을 수 없습니다.",
      );
    }
    return value;
  });
}

function isoInstant(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function outlookMessageTimestamps({ dateTimeCreated, internetHeaders } = {}) {
  const receivedAt = isoInstant(dateTimeCreated);
  const unfoldedHeaders = typeof internetHeaders === "string"
    ? internetHeaders.slice(0, 512 * 1024).replace(/\r?\n[ \t]+/gu, " ")
    : "";
  const dateHeader = unfoldedHeaders
    .split(/\r?\n/gu)
    .find((line) => /^date\s*:/iu.test(line));
  const sentAt = isoInstant(dateHeader?.replace(/^date\s*:\s*/iu, ""));
  return Object.freeze({
    sent_at: sentAt ?? receivedAt,
    received_at: receivedAt ?? sentAt,
  });
}

export async function readOutlookItemTimestamps({ item, timeoutMs } = {}) {
  let internetHeaders = "";
  if (typeof item?.getAllInternetHeadersAsync === "function") {
    try {
      internetHeaders = await callOfficeAsync(
        item,
        "getAllInternetHeadersAsync",
        [],
        {
          errorCode: OUTLOOK_ITEM_CONTENT_ERROR_CODES.headers_unavailable,
          message: "현재 Outlook 메일의 발신 시각을 읽을 수 없습니다.",
          timeoutMs,
        },
      );
    } catch {
      // The mailbox creation time remains usable when headers are unavailable.
    }
  }
  return outlookMessageTimestamps({
    dateTimeCreated: item?.dateTimeCreated,
    internetHeaders,
  });
}

function safeEmailAddress(value) {
  const email = typeof value?.emailAddress === "string"
    ? value.emailAddress.trim()
    : typeof value?.email === "string"
      ? value.email.trim()
      : "";
  if (!email || email.length > 320 || !email.includes("@")) return null;
  return Object.freeze({
    name: typeof value?.displayName === "string" ? value.displayName.trim() || null : null,
    email,
  });
}

async function readComposeRecipients(recipients, { timeoutMs } = {}) {
  let values;
  if (Array.isArray(recipients)) {
    values = recipients;
  } else {
    values = await callOfficeAsync(recipients, "getAsync", [], {
      errorCode: OUTLOOK_ITEM_CONTENT_ERROR_CODES.compose_field_unavailable,
      message: "현재 Outlook 메일의 수신자를 읽을 수 없습니다.",
      timeoutMs,
    });
  }
  return Object.freeze(
    (Array.isArray(values) ? values : [])
      .map(safeEmailAddress)
      .filter(Boolean),
  );
}

async function readComposeSubject(subject, { timeoutMs } = {}) {
  if (typeof subject === "string") return subject;
  const value = await callOfficeAsync(subject, "getAsync", [], {
    errorCode: OUTLOOK_ITEM_CONTENT_ERROR_CODES.compose_field_unavailable,
    message: "현재 Outlook 메일의 제목을 읽을 수 없습니다.",
    timeoutMs,
  });
  if (typeof value !== "string") {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.compose_field_unavailable,
      "현재 Outlook 메일의 제목을 읽을 수 없습니다.",
    );
  }
  return value;
}

export async function readOutlookComposeMessage({
  item,
  Office,
  mailbox,
  allowBodyReadFailure = false,
  timeoutMs,
} = {}) {
  if (!item) return null;
  const bodyPromise = readOutlookItemBody({ item, Office, timeoutMs })
    .catch((error) => {
      if (allowBodyReadFailure) return "";
      throw error;
    });
  const [subject, to, cc, bcc, bodyText] = await Promise.all([
    readComposeSubject(item.subject, { timeoutMs }),
    readComposeRecipients(item.to, { timeoutMs }),
    readComposeRecipients(item.cc, { timeoutMs }),
    readComposeRecipients(item.bcc, { timeoutMs }),
    bodyPromise,
  ]);
  const profile = mailbox?.userProfile ?? {};
  const from = safeEmailAddress(item.from) ?? safeEmailAddress({
    displayName: profile.displayName,
    emailAddress: profile.emailAddress,
  });
  const attachments = Object.freeze(
    (Array.isArray(item.attachments) ? item.attachments : [])
      .map((attachment) => ({
        attachment_id: attachment?.id ?? null,
        name: attachment?.name ?? "첨부 파일",
        content_type: attachment?.contentType ?? "application/octet-stream",
        size: Number.isSafeInteger(attachment?.size) ? attachment.size : null,
        confidentiality: "internal",
      })),
  );
  return Object.freeze({
    from,
    to,
    cc,
    bcc,
    subject,
    body_preview: bodyText.slice(0, 500),
    attachments,
  });
}

function normalizedFormat(format) {
  return String(format ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/gu, "");
}

function formatType(Office, format) {
  const normalized = normalizedFormat(format);
  const enumValues = Office?.MailboxEnums?.AttachmentContentFormat ?? {};
  const known = new Map();
  for (const [officeValue, type] of [
    [enumValues.Base64, "base64"],
    [enumValues.Eml, "eml"],
    [enumValues.ICalendar, "icalendar"],
    [enumValues.Url, "url"],
  ]) {
    const key = normalizedFormat(officeValue);
    if (key) known.set(key, type);
  }
  return known.get(normalized) ?? ({ base64: "base64", eml: "eml", icalendar: "icalendar", url: "url" }[normalized] ?? "");
}

function validBase64(value) {
  const encoded = String(value ?? "").replace(/\s+/gu, "");
  return Boolean(encoded)
    && encoded.length % 4 === 0
    && /^[A-Za-z0-9+/]*={0,2}$/u.test(encoded);
}

function base64ByteLength(value) {
  const encoded = String(value ?? "");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}

function utf8ByteLength(value) {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(value).byteLength;
  return unescape(encodeURIComponent(value)).length;
}

function ensureAttachmentSize({ byteLength, attachment, name } = {}) {
  if (byteLength <= MAX_OUTLOOK_ATTACHMENT_BYTES) return;
  throw contentError(
    OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_too_large,
    `${name}: 첨부 파일이 2MiB를 초과해 저장할 수 없습니다. 파일을 나누거나 Outlook에서 작은 파일로 다시 첨부해 주세요.`,
    {
      attachment_id: attachment?.id ?? attachment?.attachment_id ?? null,
      attachment_name: name,
      byte_length: byteLength,
      max_bytes: MAX_OUTLOOK_ATTACHMENT_BYTES,
    },
  );
}

export function attachmentContentToPayload({ attachment, content, Office } = {}) {
  const format = formatType(Office, content?.format);
  const name = String(attachment?.name ?? "첨부 파일").trim() || "첨부 파일";
  const attachmentId = String(attachment?.id ?? attachment?.attachment_id ?? "").trim();
  if (!attachmentId) {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_missing_id,
      `${name}: 실제 첨부 식별자를 확인할 수 없어 저장하지 않았습니다.`,
    );
  }
  if (format === "url") {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported,
      `${name}: 링크/클라우드 첨부는 현재 파일로 저장할 수 없습니다. Outlook에서 파일을 직접 첨부한 뒤 다시 시도해 주세요.`,
      { attachment_id: attachmentId, attachment_name: name, format: "url" },
    );
  }
  if (!(typeof content?.content === "string" && content.content.length > 0)) {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_content_unavailable,
      `${name}: 첨부 내용을 읽지 못해 저장하지 않았습니다.`,
      { attachment_id: attachmentId, attachment_name: name, format },
    );
  }
  if (format === "base64") {
    const encoded = content.content.replace(/\s+/gu, "");
    if (!validBase64(encoded)) {
      throw contentError(
        OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_invalid_base64,
        `${name}: 첨부 데이터 형식이 올바르지 않아 저장하지 않았습니다.`,
        { attachment_id: attachmentId, attachment_name: name, format },
      );
    }
    ensureAttachmentSize({ byteLength: base64ByteLength(encoded), attachment, name });
    return Object.freeze({
      attachment_id: attachmentId,
      name,
      content_type: attachment.contentType ?? attachment.content_type ?? "application/octet-stream",
      size: Number.isSafeInteger(attachment.size) ? attachment.size : undefined,
      content_base64: encoded,
      confidentiality: "internal",
    });
  }
  if (format === "eml" || format === "icalendar") {
    ensureAttachmentSize({ byteLength: utf8ByteLength(content.content), attachment, name });
    return Object.freeze({
      attachment_id: attachmentId,
      name,
      content_type: attachment.contentType
        ?? attachment.content_type
        ?? (format === "eml" ? "message/rfc822" : "text/calendar"),
      size: Number.isSafeInteger(attachment.size) ? attachment.size : undefined,
      content_text: content.content,
      confidentiality: "internal",
    });
  }
  throw contentError(
    OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported,
    `${name}: 이 첨부 형식은 파일로 저장할 수 없습니다. Outlook에서 파일을 직접 첨부한 뒤 다시 시도해 주세요.`,
    { attachment_id: attachmentId, attachment_name: name, format: String(content?.format ?? "") },
  );
}

export async function readOutlookAttachment({ item, attachment, Office, timeoutMs } = {}) {
  const attachmentId = String(attachment?.id ?? attachment?.attachment_id ?? "").trim();
  const name = String(attachment?.name ?? "첨부 파일").trim() || "첨부 파일";
  if (!attachmentId) {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_missing_id,
      `${name}: 실제 첨부 식별자를 확인할 수 없어 저장하지 않았습니다.`,
    );
  }
  const cloudType = normalizedFormat(Office?.MailboxEnums?.AttachmentType?.Cloud ?? "cloud");
  const attachmentType = normalizedFormat(attachment?.attachmentType ?? attachment?.type);
  if (attachmentType === cloudType || attachmentType === "url" || /^https?:\/\//iu.test(attachmentId)) {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported,
      `${name}: 링크/클라우드 첨부는 현재 파일로 저장할 수 없습니다. Outlook에서 파일을 직접 첨부한 뒤 다시 시도해 주세요.`,
      { attachment_id: attachmentId, attachment_name: name, format: "url" },
    );
  }
  const content = await callOfficeAsync(item, "getAttachmentContentAsync", [attachmentId], {
    errorCode: OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_content_unavailable,
    message: `${name}: 첨부 내용을 읽지 못해 저장하지 않았습니다.`,
    timeoutMs,
  });
  return attachmentContentToPayload({ attachment, content, Office });
}

export async function readOutlookAttachments({ item, attachments, Office, timeoutMs } = {}) {
  const source = Array.isArray(attachments) ? attachments : [];
  const payloads = [];
  const unsupported = [];
  for (const attachment of source) {
    try {
      payloads.push(await readOutlookAttachment({ item, attachment, Office, timeoutMs }));
    } catch (error) {
      if (
        error?.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_missing_id
        || error?.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_content_unavailable
        || error?.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_unsupported
        || error?.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_invalid_base64
        || error?.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.attachment_too_large
      ) {
        unsupported.push({
          attachment_id: error.attachment_id ?? attachment?.id ?? attachment?.attachment_id ?? null,
          name: error.attachment_name ?? attachment?.name ?? "첨부 파일",
          message: error.user_message,
          safe_error_code: error.safe_error_code,
        });
        continue;
      }
      throw error;
    }
  }
  return Object.freeze({
    attachments: Object.freeze(payloads),
    unsupported: Object.freeze(unsupported),
  });
}

export function assertStableOutlookItemIdentity(snapshot) {
  const fields = ["graph_message_id", "internet_message_id", "conversation_id"];
  const missing = fields.filter((field) => typeof snapshot?.[field] !== "string" || snapshot[field].trim() === "");
  if (missing.length > 0) {
    throw contentError(
      OUTLOOK_ITEM_CONTENT_ERROR_CODES.item_identity_required,
      "실제 Outlook 메일 식별자를 확인할 수 없어 이 메일을 저장하지 않았습니다. Outlook에서 받은 메일을 다시 열어 주세요.",
      { missing_fields: missing },
    );
  }
  return snapshot;
}
