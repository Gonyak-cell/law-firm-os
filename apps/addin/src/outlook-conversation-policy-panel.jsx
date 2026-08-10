import React from "react";

const POLICY_STATUSES = new Set(["active", "paused", "revoked"]);
const ACTION_TEST_ID = "outlook-conversation-policy-action";

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function policyStatus(policy) {
  const status = object(policy) ? policy.status : "";
  return POLICY_STATUSES.has(status) ? status : "";
}

function readyState({ readiness, authoritative, runtimeReady, autoFilingEnabled }) {
  const value = object(readiness) ? readiness : null;
  return {
    authoritative: value ? value.authoritative : authoritative,
    runtime_ready: value ? value.runtime_ready : runtimeReady,
    auto_filing_enabled: value ? value.auto_filing_enabled : autoFilingEnabled,
  };
}

function failureCopy(error) {
  if (!error) return "";
  return "처리하지 못했습니다. 다시 시도해 주세요.";
}

export function OutlookConversationPolicyPanel({
  policy = null,
  readiness = null,
  authoritative,
  runtimeReady,
  autoFilingEnabled,
  connectionRequired = false,
  syncPending = false,
  filingRequired = false,
  busy = false,
  error = null,
  onEnable,
  onRevoke,
  onReconnect,
}) {
  const status = policyStatus(policy);
  const ready = (() => {
    const value = readyState({ readiness, authoritative, runtimeReady, autoFilingEnabled });
    return value.authoritative === true
      && value.runtime_ready === true
      && value.auto_filing_enabled === true;
  })();
  const reconnect = connectionRequired === true;
  const active = status === "active" || status === "paused";
  const needsSync = syncPending === true || status === "paused" || !ready;
  const actionLabel = reconnect ? "다시 연결" : active ? "끄기" : "켜기";
  const action = reconnect ? onReconnect : active ? onRevoke : onEnable;
  const filingBlocked = !active && !reconnect && filingRequired === true;
  const disabled = Boolean(busy) || typeof action !== "function" || filingBlocked || (!active && !ready && !reconnect);
  const visibleError = failureCopy(error);
  const liveMessage = busy ? "처리 중" : visibleError || (filingBlocked ? "Matter에 메일을 먼저 보관해 주세요." : needsSync ? "동기화 필요" : "");
  return (
    <section
      className="outlook-conversation-policy-panel"
      data-testid="outlook-conversation-policy-panel"
      data-ready={ready ? "true" : "false"}
      data-policy-status={status || "unknown"}
      aria-busy={busy ? "true" : "false"}
      aria-label="대화 자동 저장"
    >
      <div className="outlook-flat-action-row" data-action-row="conversation.auto-save">
        <span className="outlook-flat-action-label">{active ? "자동 저장 켬" : "자동 저장 끔"}</span>
        <button
          type="button"
          className="outlook-flat-action-button"
          data-testid={ACTION_TEST_ID}
          aria-label={actionLabel}
          disabled={disabled}
          onClick={() => {
            if (!disabled) action();
          }}
        >
          {actionLabel}
        </button>
      </div>
      {liveMessage ? (
        <p
          className="outlook-one-line"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="outlook-conversation-policy-status"
        >
          {liveMessage}
        </p>
      ) : null}
    </section>
  );
}

export default OutlookConversationPolicyPanel;
