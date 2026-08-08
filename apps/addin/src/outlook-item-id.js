export const OUTLOOK_ITEM_ID_ERROR_CODES = Object.freeze({
  office_unavailable: "OUTLOOK_OFFICE_JS_UNAVAILABLE",
  read_item_required: "OUTLOOK_READ_ITEM_REQUIRED",
  conversion_unavailable: "OUTLOOK_ITEM_ID_CONVERSION_UNAVAILABLE",
  conversion_failed: "OUTLOOK_ITEM_ID_CONVERSION_FAILED",
  canonical_identity_mismatch: "OUTLOOK_CANONICAL_IDENTITY_MISMATCH",
});

export const OUTLOOK_CANONICAL_MESSAGE_IDENTITY_PATH =
  "/api/outlook/messages/identity";

function itemIdError(code, message) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
  });
}

function requiredId(value, code, message) {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id.length > 2048) throw itemIdError(code, message);
  return id;
}

function exactId(value, field) {
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || value.length > 2_048
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) throw new TypeError(`${field} is required`);
  return value;
}

function itemIdentity(item = {}) {
  return Object.freeze({
    rest_message_id: exactId(
      item.rest_message_id ?? item.graph_message_id,
      "rest_message_id",
    ),
    internet_message_id: exactId(
      item.internet_message_id,
      "internet_message_id",
    ),
    conversation_id: exactId(item.conversation_id, "conversation_id"),
  });
}

export function createOutlookCanonicalMessageIdentityRequest({
  item,
  matterId,
} = {}) {
  const identity = itemIdentity(item);
  const canonicalMatterId = exactId(matterId, "matter_id");
  return Object.freeze({
    path: OUTLOOK_CANONICAL_MESSAGE_IDENTITY_PATH,
    method: "POST",
    body: Object.freeze({
      matter_id: canonicalMatterId,
      ...identity,
    }),
  });
}

export function applyOutlookCanonicalMessageIdentity({
  item,
  response,
} = {}) {
  const expected = itemIdentity(item);
  const canonicalGraphMessageId = exactId(
    response?.item?.canonical_graph_message_id,
    "canonical_graph_message_id",
  );
  const actual = itemIdentity(response?.item);
  if (
    expected.rest_message_id !== actual.rest_message_id
    || expected.internet_message_id.normalize("NFKC").toLowerCase()
      !== actual.internet_message_id.normalize("NFKC").toLowerCase()
    || expected.conversation_id.normalize("NFKC")
      !== actual.conversation_id.normalize("NFKC")
  ) {
    throw itemIdError(
      OUTLOOK_ITEM_ID_ERROR_CODES.canonical_identity_mismatch,
      "canonical Outlook identity does not match the current item",
    );
  }
  return Object.freeze({
    ...item,
    rest_message_id: expected.rest_message_id,
    graph_message_id: expected.rest_message_id,
    canonical_graph_message_id: canonicalGraphMessageId,
  });
}

export function resolveCurrentOutlookRestMessageId({
  Office = globalThis.Office,
} = {}) {
  const mailbox = Office?.context?.mailbox;
  if (!mailbox) {
    throw itemIdError(
      OUTLOOK_ITEM_ID_ERROR_CODES.office_unavailable,
      "Outlook에서 다시 시도해 주세요.",
    );
  }
  const officeItemId = requiredId(
    mailbox.item?.itemId,
    OUTLOOK_ITEM_ID_ERROR_CODES.read_item_required,
    "읽기 화면에서 저장된 메일을 선택해 주세요.",
  );
  if (typeof mailbox.convertToRestId !== "function") {
    throw itemIdError(
      OUTLOOK_ITEM_ID_ERROR_CODES.conversion_unavailable,
      "현재 Outlook에서는 메일 ID 변환을 지원하지 않습니다.",
    );
  }
  const restVersion =
    Office?.MailboxEnums?.RestVersion?.v2_0 ?? "v2.0";
  let restMessageId;
  try {
    restMessageId = mailbox.convertToRestId(
      officeItemId,
      restVersion,
    );
  } catch {
    throw itemIdError(
      OUTLOOK_ITEM_ID_ERROR_CODES.conversion_failed,
      "현재 메일을 확인할 수 없습니다. 메일을 다시 연 뒤 시도해 주세요.",
    );
  }
  return Object.freeze({
    rest_message_id: requiredId(
      restMessageId,
      OUTLOOK_ITEM_ID_ERROR_CODES.conversion_failed,
      "현재 메일을 확인할 수 없습니다. 메일을 다시 연 뒤 시도해 주세요.",
    ),
    source_id_type: "restId",
    office_rest_version: "v2.0",
    raw_office_item_id_returned: false,
    production_write_claim: false,
  });
}
