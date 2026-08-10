import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";
import {
  createOutlookFilingCorrectionRequest,
  parseOutlookFilingCorrectionResponse,
} from "../src/outlook-filing-correction.js";

const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
const THREAD = "thread-outm22-panel";
const SOURCE = "matter-source";
const TARGET = "matter-target";
const OPERATION_CONTEXT = { item_context_key: "item-context-outm22-panel", session_generation: 7 };
const MIME = "a".repeat(64);
const ORIGINAL_PLACEMENT = {
  placement_id: "placement:original:outm22-panel",
  correction_id: "origin:outm22-panel",
  event_kind: "original",
  email_thread_id: THREAD,
  original_receipt_id: "receipt-outm22-panel",
  matter_id: SOURCE,
  document_id: "document-outm22-panel",
  mime_sha256: MIME,
  occurred_at: "2026-08-09T00:00:00.000Z",
  status: "original",
  copied_mime: false,
};

function props(overrides = {}) {
  return {
    currentPlacement: { matter_id: "matter-source" },
    currentMatter: { matter_id: "matter-source", matter_code: "SRC/001", title: "Source Matter" },
    targetMatters: [{ matter_id: "matter-target", matter_code: "TGT/002", title: "Target Matter" }],
    targetMatter: { matter_id: "matter-target", matter_code: "TGT/002", title: "Target Matter" },
    targetMatterId: "matter-target",
    targetQuery: "target",
    reason: "정정 사유",
    confirmed: true,
    onTargetQueryChange: () => {},
    onTargetMatterChange: () => {},
    onReasonChange: () => {},
    onConfirmationChange: () => {},
    onSubmit: () => {},
    onCopy: () => {},
    ...overrides,
  };
}

async function loadPanel(t) {
  const vite = await createServer({
    root: ADDIN_ROOT,
    configFile: `${ADDIN_ROOT}/vite.config.js`,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => vite.close());
  const module = await vite.ssrLoadModule("/src/outlook-filing-correction-panel.jsx");
  return module.OutlookFilingCorrectionPanel;
}

test("OUTM-22 panel stays controlled and fail-closed until confirmation is explicit", async (t) => {
  const Panel = await loadPanel(t);
  const initial = renderToStaticMarkup(React.createElement(Panel, props({ reason: "", confirmed: false })));
  assert.match(initial, /data-filing-correction-panel="true"/u);
  assert.match(initial, /placeholder="새 Matter"/u);
  assert.match(initial, /placeholder="이동 사유"/u);
  assert.match(initial, /data-testid="filing-correction-target-search"/u);
  assert.match(initial, /data-testid="filing-correction-target-select"/u);
  assert.match(initial, /data-testid="filing-correction-confirmation"/u);
  assert.match(initial, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);
  assert.match(initial, /aria-describedby="filing-correction-submit-help"/u);
  assert.match(initial, /data-testid="filing-correction-submit-help"[^>]*>[^<]*이동 사유는 한 줄로 입력해 주세요/iu);
  assert.doesNotMatch(initial, /<input[^>]*data-testid="filing-correction-confirmation"[^>]*checked/iu);
  assert.equal((initial.match(/outlook-critical-copy/gu) ?? []).length, 2);
  assert.match(initial, /SRC\/001 — Source Matter/u);
  assert.match(initial, /TGT\/002 — Target Matter/u);

  const confirmed = renderToStaticMarkup(React.createElement(Panel, props()));
  assert.doesNotMatch(confirmed, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);
  assert.match(confirmed, /<input[^>]*data-testid="filing-correction-confirmation"[^>]*checked/iu);

  const changedSelection = renderToStaticMarkup(React.createElement(Panel, props({
    targetMatterId: "matter-target-2",
    targetMatter: { matter_id: "matter-target", matter_code: "TGT/002", title: "Target Matter" },
    targetMatters: [
      { matter_id: "matter-target", matter_code: "TGT/002", title: "Target Matter" },
      { matter_id: "matter-target-2", matter_code: "TGT/003", title: "Second Target" },
    ],
  })));
  assert.match(changedSelection, /TGT\/003 — Second Target/u);
  assert.doesNotMatch(changedSelection, /<option[^>]*selected[^>]*>TGT\/002/u);

  const sameMatter = renderToStaticMarkup(React.createElement(Panel, props({
    targetMatterId: "matter-source",
    targetMatters: [{ matter_id: "matter-source", matter_code: "SRC/001", title: "Source Matter" }],
  })));
  assert.match(sameMatter, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);

  const displayOnlySource = renderToStaticMarkup(React.createElement(Panel, props({
    currentPlacement: {},
  })));
  assert.match(displayOnlySource, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);
  assert.match(displayOnlySource, /data-testid="filing-correction-submit-help"[^>]*>[^<]*현재 Matter를 확인해 주세요/iu);
  assert.doesNotMatch(displayOnlySource, /SRC\/001 — Source Matter/u);

  const revokedTarget = renderToStaticMarkup(React.createElement(Panel, props({
    targetMatterId: "matter-revoked",
    targetMatters: [],
  })));
  assert.match(revokedTarget, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);
  assert.match(revokedTarget, /data-testid="filing-correction-submit-help"[^>]*>[^<]*새 Matter를 선택해 주세요/iu);
  assert.doesNotMatch(revokedTarget, /TGT\/002 — Target Matter/u);

  for (const invalidReason of ["x".repeat(501), "한 줄\n아님", "끝\n", "제어\u0000문자"]) {
    const invalid = renderToStaticMarkup(React.createElement(Panel, props({ reason: invalidReason })));
    assert.match(invalid, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);
    assert.match(invalid, /data-testid="filing-correction-submit-help"[^>]*>[^<]*이동 사유는 한 줄로 입력해 주세요/iu);
  }

  const busy = renderToStaticMarkup(React.createElement(Panel, props({ busy: true })));
  assert.match(busy, /data-filing-correction-panel="true"[^>]*aria-busy="true"/u);
  assert.match(busy, /<button[^>]*disabled[^>]*data-testid="filing-correction-submit"/iu);
  assert.match(busy, /data-testid="filing-correction-submit-help"[^>]*>[^<]*처리 중입니다/iu);
});

async function parsedResult({ outcome = "created", current = OPERATION_CONTEXT } = {}) {
  const request = await createOutlookFilingCorrectionRequest({
    ...OPERATION_CONTEXT,
    email_thread_id: THREAD,
    current_placement: ORIGINAL_PLACEMENT,
    target_matter_id: TARGET,
    reason: "Matter 정정",
    cryptoImpl: webcrypto,
  });
  const correction = {
    ...ORIGINAL_PLACEMENT,
    placement_id: "placement:correction:outm22-panel",
    correction_id: "correction:outm22-panel",
    event_kind: "correction",
    matter_id: TARGET,
    status: "applied",
  };
  const timeline = (matter_id, type, event_id) => ({
    event_id,
    matter_id,
    type,
    correction_id: correction.correction_id,
    reference_id: "email-filing-placement-reference:" + correction.placement_id,
    document_id: correction.document_id,
    document_version_id: "version:outm22-panel",
    mime_sha256: correction.mime_sha256,
    copied_mime: false,
  });
  return parseOutlookFilingCorrectionResponse({
    status: outcome === "idempotent_replay" ? 200 : 201,
    body: {
      request_id: "request-outm22-panel",
      outcome,
      item: correction,
      timeline_events: [
        timeline(SOURCE, "outlook.email.filing.corrected_from", "event-source"),
        timeline(TARGET, "outlook.email.filing.corrected_to", "event-target"),
      ],
      idempotency_fingerprint: "b".repeat(64),
      request_binding: request.request_binding,
      idempotent_replay: outcome === "idempotent_replay",
      safe_error_codes: [],
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  }, { request, current });
}

test("OUTM-22 panel exposes only one correction action and safe replay result copy", async (t) => {
  const Panel = await loadPanel(t);
  const createdResult = await parsedResult();
  const replayResult = await parsedResult({ outcome: "idempotent_replay" });
  const lateResult = await parsedResult({ current: { item_context_key: "item-context-late", session_generation: 8 } });
  const created = renderToStaticMarkup(React.createElement(Panel, props({ result: createdResult })));
  const replay = renderToStaticMarkup(React.createElement(Panel, props({ result: replayResult })));
  const late = renderToStaticMarkup(React.createElement(Panel, props({ result: lateResult })));
  const unsupported = renderToStaticMarkup(React.createElement(Panel, props({ result: { outcome: "complete" } })));
  const alias = renderToStaticMarkup(React.createElement(Panel, props({ result: "created" })));
  const applyFalse = renderToStaticMarkup(React.createElement(Panel, props({ result: { ...createdResult, apply_to_current_view: false } })));
  assert.equal((created.match(/data-testid="filing-correction-submit"/gu) ?? []).length, 1);
  assert.equal((created.match(/>변경</gu) ?? []).length, 1);
  assert.match(created, /data-testid="filing-correction-result"[^>]*>[\s\S]*변경됨/iu);
  assert.match(replay, /data-testid="filing-correction-result"[^>]*>[\s\S]*이미 변경됨/iu);
  assert.doesNotMatch(late, /data-testid="filing-correction-result"/u);
  assert.doesNotMatch(unsupported, /data-testid="filing-correction-result"/u);
  assert.doesNotMatch(alias, /data-testid="filing-correction-result"/u);
  assert.doesNotMatch(applyFalse, /data-testid="filing-correction-result"/u);
  assert.doesNotMatch(created, /folder|security|permission|tenant|actor|delete|fetch|requestJson/iu);
  assert.equal((created.match(/새 Matter/gu) ?? []).length, 1);
  assert.equal((created.match(/이동 사유/gu) ?? []).length, 1);
});
