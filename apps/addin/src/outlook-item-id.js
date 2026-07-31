export const OUTLOOK_ITEM_ID_ERROR_CODES = Object.freeze({
  office_unavailable: "OUTLOOK_OFFICE_JS_UNAVAILABLE",
  read_item_required: "OUTLOOK_READ_ITEM_REQUIRED",
  conversion_unavailable: "OUTLOOK_ITEM_ID_CONVERSION_UNAVAILABLE",
  conversion_failed: "OUTLOOK_ITEM_ID_CONVERSION_FAILED",
});

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
