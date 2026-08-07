const INQUIRY_ACTIONS = new Set(["new", "link_existing"]);

function requiredText(value, field, maxLength = 2048) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength) {
    throw new TypeError(`${field} is required`);
  }
  return text;
}

function hex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function stableActionKey(value, cryptoImpl) {
  if (typeof cryptoImpl?.subtle?.digest !== "function") {
    throw new Error("OUTLOOK_IDEMPOTENCY_CRYPTO_UNAVAILABLE");
  }
  const digest = await cryptoImpl.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return hex(digest);
}

export async function buildInquiryRegistrationRequest({
  action,
  rest_message_id,
  existing_lead_id,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const nextAction = requiredText(action, "action", 32);
  if (!INQUIRY_ACTIONS.has(nextAction)) {
    throw new TypeError("action must be new or link_existing");
  }
  const restMessageId = requiredText(
    rest_message_id,
    "rest_message_id",
  );
  const existingLeadId = nextAction === "link_existing"
    ? requiredText(existing_lead_id, "existing_lead_id", 512)
    : null;
  if (nextAction === "new" && existing_lead_id != null) {
    throw new TypeError(
      "existing_lead_id is only allowed for link_existing",
    );
  }
  const fingerprint = await stableActionKey(
    JSON.stringify({
      action: nextAction,
      rest_message_id: restMessageId,
      existing_lead_id: existingLeadId,
    }),
    cryptoImpl,
  );
  return Object.freeze({
    action: nextAction,
    rest_message_id: restMessageId,
    ...(existingLeadId
      ? { existing_lead_id: existingLeadId }
      : {}),
    idempotency_key:
      `outlook-inquiry:${nextAction}:${fingerprint}`,
  });
}

export function inquiryResultCopy({ action, item } = {}) {
  const replay = item?.idempotent_replay === true;
  if (action === "link_existing") {
    return Object.freeze({
      title: replay
        ? "이미 선택한 문의에 연결된 메일입니다."
        : "기존 문의에 연결했습니다.",
      detail: item?.lead_id
        ? `문의 번호 ${item.lead_id}`
        : "연결 결과를 확인해 주세요.",
      tone: "success",
    });
  }
  return Object.freeze({
    title: replay
      ? "이미 새 문의로 등록된 메일입니다."
      : "새 문의로 등록했습니다.",
    detail: item?.lead_id
      ? `문의 번호 ${item.lead_id}`
      : "등록 결과를 확인해 주세요.",
    tone: "success",
  });
}

export function outlookActionErrorMessage(error) {
  const code = error?.safe_error_code ?? error?.message;
  const messages = {
    OUTLOOK_OFFICE_JS_UNAVAILABLE:
      "Outlook에서 메일을 다시 연 뒤 시도해 주세요.",
    OUTLOOK_READ_ITEM_REQUIRED:
      "읽기 화면에서 저장된 메일을 선택해 주세요.",
    OUTLOOK_ITEM_ID_CONVERSION_UNAVAILABLE:
      "현재 Outlook에서는 이 메일을 확인할 수 없습니다.",
    OUTLOOK_ITEM_ID_CONVERSION_FAILED:
      "현재 메일을 확인할 수 없습니다. 다시 연 뒤 시도해 주세요.",
    OUTLOOK_IDEMPOTENCY_CRYPTO_UNAVAILABLE:
      "안전한 재처리 키를 만들 수 없습니다. Outlook을 다시 시작해 주세요.",
    M365_CONNECTION_NOT_FOUND:
      "Outlook 연결 설정이 필요합니다.",
    M365_CONNECTION_VALIDATION_ERROR:
      "Outlook 연결 상태를 확인해 주세요.",
    M365_CONNECTION_VERSION_CONFLICT:
      "연결 상태가 방금 바뀌었습니다. 다시 확인해 주세요.",
    M365_CONNECTION_DISCONNECT_NOT_CONFIRMED:
      "연결 해제 결과를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.",
    M365_CONNECTION_CREDENTIAL_CLEANUP_PENDING:
      "Outlook 연결은 해제됐지만 저장된 토큰을 정리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    M365_GRAPH_FEATURE_DISABLED:
      "Outlook 문의 등록 기능이 아직 켜지지 않았습니다.",
    M365_PROVIDER_RUNTIME_DISABLED:
      "Outlook 연결 설정이 필요합니다.",
    M365_EXTERNAL_READINESS_BLOCKED:
      "Outlook 연결 확인이 끝나지 않았습니다.",
    M365_SCOPE_INSUFFICIENT:
      "메일 읽기 권한을 다시 승인해 주세요.",
    M365_PROVIDER_RESPONSE_INVALID:
      "Outlook에서 메일을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    OUTLOOK_INQUIRY_RUNTIME_UNAVAILABLE:
      "문의 등록 서비스를 사용할 수 없습니다. 관리자에게 알려 주세요.",
    OUTLOOK_INQUIRY_EVIDENCE_QUARANTINED:
      "이 메일은 보안 검토가 필요하여 문의로 등록하지 않았습니다.",
    OUTLOOK_INQUIRY_IDENTITY_CONFLICT:
      "같은 사람 또는 문의 기록이 둘 이상입니다. 앱에서 먼저 확인해 주세요.",
    OUTLOOK_INQUIRY_LEAD_NOT_FOUND:
      "선택한 문의를 찾을 수 없습니다. 목록을 새로 불러와 주세요.",
    OUTLOOK_INQUIRY_LINK_CONFLICT:
      "이 메일은 다른 문의에 연결되어 있습니다.",
    OUTLOOK_INQUIRY_IDEMPOTENCY_CONFLICT:
      "같은 처리 요청의 내용이 달라 확인이 필요합니다.",
    OUTLOOK_ADDIN_PERMISSION_DENIED:
      "이 작업을 할 권한이 없습니다.",
    OUTLOOK_ADDIN_REVIEW_REQUIRED:
      "관리자 확인이 필요한 작업입니다.",
    AUTH_SESSION_REQUIRED:
      "로그인이 만료되었습니다. 다시 로그인해 주세요.",
    API_RESPONSE_INVALID:
      "서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  };
  return messages[code]
    ?? "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
