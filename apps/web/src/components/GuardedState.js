import React from "react";

export const GUARDED_STATE_COPY = Object.freeze({
  not_configured: Object.freeze({ label: "설정 필요", tone: "review", detail: "운영 기준을 정한 뒤 진행합니다." }),
  preflight_required: Object.freeze({ label: "사전검사 필요", tone: "review", detail: "권한과 대상 범위를 먼저 확인합니다." }),
  owner_blocked: Object.freeze({ label: "승인 대기", tone: "review", detail: "책임자 승인 전에는 실행하지 않습니다." }),
  provider_blocked: Object.freeze({ label: "외부 확인 대기", tone: "review", detail: "제공자 receipt 없이는 실행하지 않습니다." }),
  audit_required: Object.freeze({ label: "감사 필요", tone: "review", detail: "사유와 권한 기록이 필요합니다." }),
  write_disabled: Object.freeze({ label: "쓰기 차단", tone: "empty", detail: "이 화면은 상태 확인만 허용합니다." }),
  ready_read_only: Object.freeze({ label: "확인됨", tone: "empty", detail: "읽기 또는 요청 패키지만 가능합니다." })
});

export function guardedStateCopy(state = "write_disabled") {
  return GUARDED_STATE_COPY[state] ?? GUARDED_STATE_COPY.write_disabled;
}

export function GuardedStatusBadge({ state = "write_disabled", label }) {
  const copy = guardedStateCopy(state);
  return React.createElement(
    "span",
    {
      className: `status-label guarded-state-badge guarded-state-badge-${state}`,
      "data-lcx-full-guarded-state": state,
      "data-lcx-full-write-enabled": "false"
    },
    label ?? copy.label
  );
}

export function GuardedStateNotice({ state = "write_disabled", title, children, dataAttrs = {} }) {
  const copy = guardedStateCopy(state);
  return React.createElement(
    "div",
    {
      className: `live-data-state live-data-${copy.tone}`,
      role: "status",
      "data-lcx-full-guarded-state": state,
      "data-lcx-full-write-enabled": "false",
      ...dataAttrs
    },
    React.createElement("strong", null, title ?? copy.label),
    children ?? copy.detail
  );
}

export function GuardedReceiptRow({ kind, state = "write_disabled", title, detail, receiptRef = "" }) {
  const copy = guardedStateCopy(state);
  return React.createElement(
    "div",
    {
      className: "vault-action-boundary-row guarded-receipt-row",
      "data-lcx-full-guarded-state": state,
      "data-lcx-full-receipt-kind": kind,
      "data-lcx-full-receipt-ref": receiptRef,
      "data-lcx-full-write-enabled": "false"
    },
    React.createElement(
      "div",
      { className: "vault-action-boundary-main" },
      React.createElement("strong", null, title ?? copy.label),
      React.createElement("span", null, detail ?? copy.detail)
    ),
    React.createElement(
      "div",
      { className: "vault-action-boundary-meta" },
      React.createElement("span", null, kind),
      React.createElement("span", null, receiptRef || "receipt 없음")
    )
  );
}

export function GuardedActionButton({ state = "write_disabled", children, disabled = true, ...props }) {
  const copy = guardedStateCopy(state);
  return React.createElement(
    "button",
    {
      type: "button",
      className: "secondary-button guarded-action-button",
      disabled: disabled !== false,
      "aria-disabled": disabled !== false ? "true" : undefined,
      "data-lcx-full-guarded-state": state,
      "data-lcx-full-write-enabled": "false",
      ...props
    },
    children ?? copy.label
  );
}

export function GuardedActionRow({ state = "write_disabled", title, detail, actionLabel }) {
  const copy = guardedStateCopy(state);
  return React.createElement(
    "div",
    {
      className: "vault-action-boundary-row guarded-action-row",
      "data-lcx-full-guarded-state": state,
      "data-lcx-full-write-enabled": "false"
    },
    React.createElement(
      "div",
      { className: "vault-action-boundary-main" },
      React.createElement("strong", null, title ?? copy.label),
      React.createElement("span", null, detail ?? copy.detail)
    ),
    React.createElement(GuardedActionButton, { state }, actionLabel ?? copy.label)
  );
}
