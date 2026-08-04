import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePeopleOutlookConnectionResult,
  presentPeopleOutlookConnectionResult,
} from "../src/people/outlookConnectionResult.js";

const connectedResult = {
  type: "outlook_connection_result",
  status: "connected",
  http_status: 200,
  safe_error_code: null,
  employee_id: "emp-1",
  connection_state: "connected",
};

test("People Outlook result accepts only the sanitized desktop contract", () => {
  assert.deepEqual(parsePeopleOutlookConnectionResult(connectedResult), connectedResult);
  for (const unsafe of [
    { ...connectedResult, authorization_code: "secret-code" },
    { ...connectedResult, state: "oauth-state" },
    { ...connectedResult, access_token: "secret-token" },
    { ...connectedResult, connection_state: "consent_pending" },
    { ...connectedResult, safe_error_code: "unsafe value" },
  ]) {
    assert.equal(parsePeopleOutlookConnectionResult(unsafe), null);
  }
});

test("People Outlook result maps every supported state to concrete Korean guidance", () => {
  const expected = {
    connected: ["status", "Outlook 일정을 연결했습니다."],
    expired: ["alert", "Outlook 연결 시간이 지났습니다. People에서 다시 연결해 주세요."],
    session_required: ["alert", "LawOS에 다시 로그인한 뒤 Outlook 연결을 완료해 주세요."],
    retryable: ["status", "Outlook 연결 확인이 지연되고 있습니다. 잠시 후 다시 확인합니다."],
    error: ["alert", "Outlook 연결을 완료하지 못했습니다. People에서 다시 연결해 주세요."],
  };
  for (const [status, [role, message]] of Object.entries(expected)) {
    const result = parsePeopleOutlookConnectionResult({
      ...connectedResult,
      status,
      connection_state: status === "connected" ? "connected" : null,
    });
    assert.ok(result);
    assert.deepEqual(
      [presentPeopleOutlookConnectionResult(result).role, presentPeopleOutlookConnectionResult(result).message],
      [role, message],
    );
  }
  assert.equal(
    presentPeopleOutlookConnectionResult({
      status: "error",
      safe_error_code: "OUTLOOK_AUTHORIZATION_DENIED",
    }).message,
    "Outlook 연결을 취소했습니다. 필요할 때 다시 연결할 수 있습니다.",
  );
  assert.equal(
    presentPeopleOutlookConnectionResult({
      status: "error",
      safe_error_code: "OUTLOOK_ACCOUNT_MISMATCH",
    }).message,
    "LawOS와 같은 Microsoft 계정으로 다시 연결해 주세요.",
  );
});
