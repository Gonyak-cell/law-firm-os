import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GuardedActionButton,
  GuardedActionRow,
  GuardedReceiptRow,
  GuardedStateNotice,
  GuardedStatusBadge,
  guardedStateCopy
} from "../src/components/GuardedState.js";

test("LCX-FULL guarded state copy keeps Korean operating labels concrete", () => {
  assert.equal(guardedStateCopy("provider_blocked").label, "외부 확인 대기");
  assert.equal(guardedStateCopy("owner_blocked").label, "승인 대기");
  assert.equal(guardedStateCopy("audit_required").label, "감사 필요");
});

test("LCX-FULL guarded components render write-disabled evidence attributes", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      "div",
      null,
      React.createElement(GuardedStatusBadge, { state: "provider_blocked" }),
      React.createElement(GuardedStateNotice, {
        state: "audit_required",
        title: "감사 대상 작업입니다.",
        dataAttrs: { "data-global-audit-required": "true" }
      }),
      React.createElement(GuardedReceiptRow, { kind: "provider", state: "provider_blocked", title: "제공자 receipt" }),
      React.createElement(GuardedActionRow, { state: "owner_blocked", title: "실행 요청" }),
      React.createElement(GuardedActionButton, { state: "write_disabled" }, "실행 차단")
    )
  );
  assert.match(html, /data-lcx-full-guarded-state="provider_blocked"/);
  assert.match(html, /data-lcx-full-guarded-state="audit_required"/);
  assert.match(html, /data-global-audit-required="true"/);
  assert.match(html, /data-lcx-full-receipt-kind="provider"/);
  assert.match(html, /data-lcx-full-write-enabled="false"/);
  assert.match(html, /disabled=""/);
});
