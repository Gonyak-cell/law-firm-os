const RESULT_STATUSES = new Set([
  "connected",
  "expired",
  "session_required",
  "retryable",
  "error",
]);
const RESULT_KEYS = new Set([
  "type",
  "status",
  "http_status",
  "safe_error_code",
  "employee_id",
  "connection_state",
]);
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const SAFE_ERROR_CODE_PATTERN = /^[A-Z0-9_]{1,160}$/;

export function parsePeopleOutlookConnectionResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.keys(value).some((key) => !RESULT_KEYS.has(key))) return null;
  if (value.type !== "outlook_connection_result" || !RESULT_STATUSES.has(value.status)) return null;
  if (!Number.isInteger(value.http_status) || value.http_status < 0 || value.http_status > 599) return null;
  if (value.safe_error_code !== null && !SAFE_ERROR_CODE_PATTERN.test(value.safe_error_code ?? "")) return null;
  if (value.employee_id !== undefined && value.employee_id !== null && !SAFE_REF_PATTERN.test(value.employee_id)) return null;
  if (value.connection_state !== undefined && value.connection_state !== null && !SAFE_REF_PATTERN.test(value.connection_state)) return null;
  if (value.status === "connected" && value.connection_state !== "connected") return null;

  return Object.freeze({
    type: value.type,
    status: value.status,
    http_status: value.http_status,
    safe_error_code: value.safe_error_code,
    employee_id: value.employee_id ?? null,
    connection_state: value.connection_state ?? null,
  });
}

export function presentPeopleOutlookConnectionResult(result) {
  switch (result?.status) {
    case "connected":
      return { tone: "success", role: "status", message: "Outlook 일정을 연결했습니다." };
    case "expired":
      return { tone: "danger", role: "alert", message: "Outlook 연결 시간이 지났습니다. People에서 다시 연결해 주세요." };
    case "session_required":
      return { tone: "danger", role: "alert", message: "LawOS에 다시 로그인한 뒤 Outlook 연결을 완료해 주세요." };
    case "retryable":
      return { tone: "", role: "status", message: "Outlook 연결 확인이 지연되고 있습니다. 잠시 후 다시 확인합니다." };
    case "error":
      if (result.safe_error_code === "OUTLOOK_AUTHORIZATION_DENIED") {
        return { tone: "", role: "status", message: "Outlook 연결을 취소했습니다. 필요할 때 다시 연결할 수 있습니다." };
      }
      if (result.safe_error_code === "OUTLOOK_ACCOUNT_MISMATCH") {
        return { tone: "danger", role: "alert", message: "LawOS와 같은 Microsoft 계정으로 다시 연결해 주세요." };
      }
      return { tone: "danger", role: "alert", message: "Outlook 연결을 완료하지 못했습니다. People에서 다시 연결해 주세요." };
    default:
      return null;
  }
}
