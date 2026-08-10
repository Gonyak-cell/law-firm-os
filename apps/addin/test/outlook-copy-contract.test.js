import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as uiContract from "../src/outlook-ui-contract.js";
import {
  OUTLOOK_OPERATION_STATES,
  normalizeOutlookOperationError,
} from "../src/outlook-operation-state.js";

const MAIN_SOURCE = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const INQUIRY_SOURCE = readFileSync(new URL("../src/inquiry-entry.jsx", import.meta.url), "utf8");
const STYLES_SOURCE = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const COMPACT_SHELL_SOURCE = readFileSync(new URL("../src/outlook-compact-shell.jsx", import.meta.url), "utf8");
const MATTER_SHELL_SOURCE = readFileSync(new URL("../src/outlook-matter-shell.jsx", import.meta.url), "utf8");
const INQUIRY_SHELL_SOURCE = readFileSync(new URL("../src/outlook-inquiry-shell.jsx", import.meta.url), "utf8");

// These are the stacked-surface signals explicitly rejected by OUTM-12.  The
// production contract must list them, but the source assertions ensure the
// contract is not merely a documentation copy of an unchanged legacy pane.
const FORBIDDEN_VISIBLE_COPY = [
  "메일 처리",
  "확인 후 저장",
  "연결 상태",
  "연결 설정",
  "현재 메일",
  "이 메일 처리",
  "추가 작업",
  "최근 기록",
  "연결 정보 정리 다시 시도",
];

const FORBIDDEN_SURFACE_SELECTORS = [
  ".eyebrow",
  ".mode-badge",
  ".pane-header",
  ".status-stack",
  ".status-line",
  ".pane-section",
  ".action-list",
  ".action-item",
  ".operation-summary",
];

function copyContract() {
  const contract = uiContract.OUTLOOK_UI_CONTRACT;
  assert.ok(contract && typeof contract === "object", "OUTM-12 requires the UI contract");
  assert.ok(contract.forbiddenVisibleCopy && typeof contract.forbiddenVisibleCopy === "object",
    "OUTM-12 requires OUTLOOK_UI_CONTRACT.forbiddenVisibleCopy");
  return contract.forbiddenVisibleCopy;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

test("OUTM-12 contract rejects the long title/status/configuration surfaces", () => {
  const contract = copyContract();
  assert.deepEqual(contract.strings, FORBIDDEN_VISIBLE_COPY);
  assert.deepEqual(contract.selectors, FORBIDDEN_SURFACE_SELECTORS);
  assert.equal(contract.visibleStatusLines, 1);
  assert.equal(contract.fullRecoveryCopyHidden, true);
});

test("OUTM-12 production sources remove forbidden visible copy and legacy stacked classes", () => {
  copyContract();
  const source = `${MAIN_SOURCE}\n${INQUIRY_SOURCE}`;
  for (const text of FORBIDDEN_VISIBLE_COPY) {
    assert.doesNotMatch(source, new RegExp(escapeRegExp(text), "u"),
      `forbidden visible copy remains: ${text}`);
  }
  for (const selector of FORBIDDEN_SURFACE_SELECTORS) {
    const className = selector.slice(1);
    assert.doesNotMatch(source, new RegExp(
      `className\\s*=\\s*["']${escapeRegExp(className)}["']|class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["']`,
      "isu",
    ),
      `legacy stacked class remains in JSX: ${selector}`);
    assert.doesNotMatch(STYLES_SOURCE, new RegExp(`\\.${escapeRegExp(className)}\\s*\\{`, "u"),
      `legacy stacked selector remains in CSS: ${selector}`);
  }
  assert.match(MAIN_SOURCE, /OutlookInlineOperationState/iu, "main must use the shared compact status primitive");
  assert.match(INQUIRY_SOURCE, /OutlookInlineOperationState/iu, "inquiry must use the shared compact status primitive");
  const hiddenLiveRegions = COMPACT_SHELL_SOURCE.match(/className=["']outlook-visually-hidden["'][^>]*aria-live=["']polite["']/gu) ?? [];
  assert.equal(hiddenLiveRegions.length, 1, "shared compact status primitive must own exactly one hidden live region");
});

test("OUTM-12 canonicalizes recoverable and error outcomes to short copy plus hidden recovery guidance", () => {
  copyContract();
  const cases = [
    ["OUTLOOK_OPERATION_DUPLICATE", OUTLOOK_OPERATION_STATES.duplicate],
    ["OUTLOOK_ITEM_CHANGED_DURING_ACTION", OUTLOOK_OPERATION_STATES.staleItem],
    ["ADDIN_API_REQUEST_TIMEOUT", OUTLOOK_OPERATION_STATES.offline],
    ["AUTH_SESSION_REQUIRED", OUTLOOK_OPERATION_STATES.reconnectRequired],
    ["OUTLOOK_ADDIN_PERMISSION_DENIED", OUTLOOK_OPERATION_STATES.permissionChanged],
    ["M365_PROVIDER_RUNTIME_DISABLED", OUTLOOK_OPERATION_STATES.providerBlocked],
    ["OUTLOOK_UNRECOGNIZED_FAILURE", OUTLOOK_OPERATION_STATES.failed],
  ];
  for (const [errorCode, expectedState] of cases) {
    const next = normalizeOutlookOperationError({
      safe_error_code: errorCode,
      request_id: "request-outm12",
      idempotency_key: "idempotency-outm12",
    });
    assert.equal(next.state, expectedState, errorCode);
    assert.equal(typeof next.visible_action, "string", errorCode);
    assert.ok(next.visible_action.length <= 96, `${errorCode} visible status is not concise`);
    assert.equal(next.recovery?.preserve_request_id, true, errorCode);
    assert.equal(next.recovery?.preserve_idempotency, true, errorCode);
    assert.ok(typeof next.recovery?.hidden_message === "string" && next.recovery.hidden_message.length > 0, errorCode);
  }
});

test("OUTM-12 does not expose status dashboards or raw error payloads", () => {
  const contract = copyContract();
  assert.equal(contract.statusDashboard, false);
  assert.equal(contract.rawErrorCopyVisible, false);
  assert.match(MAIN_SOURCE, /OutlookInlineOperationState/iu);
  const uiSources = `${COMPACT_SHELL_SOURCE}\n${MATTER_SHELL_SOURCE}\n${INQUIRY_SHELL_SOURCE}\n${INQUIRY_SOURCE}`;
  assert.doesNotMatch(uiSources, /provider_message|raw_provider|access_token|refresh_token|email_body|raw_body/iu);
});
