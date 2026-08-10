import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const ADDIN_ROOT = new URL("../", import.meta.url).pathname;
let OutlookFilingOverview;
let vite;

test.before(async () => {
  vite = await createServer({
    root: ADDIN_ROOT,
    configFile: `${ADDIN_ROOT}/vite.config.js`,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ OutlookFilingOverview } = await vite.ssrLoadModule("/src/outlook-filing-overview.jsx"));
});

test.after(async () => {
  await vite?.close();
});

function render(props = {}) {
  return renderToStaticMarkup(React.createElement(OutlookFilingOverview, {
    item: {
      mode: "read",
      provenance: "received",
      subject: "계약서 검토 요청",
      from: { name: "의뢰인", email: "client@example.invalid" },
    },
    ...props,
  }));
}

test("filing overview puts bounded message and explicit Matter selection ahead of actions", () => {
  const empty = render();
  assert.match(empty, /계약서 검토 요청/u);
  assert.match(empty, /의뢰인/u);
  assert.match(empty, /저장되지 않음/u);
  assert.match(empty, /Matter를 선택해 주세요\./u);

  const selected = render({ selectedMatterDisplay: "M-2026-010 · 자문 · AMIC", filed: true });
  assert.match(selected, /M-2026-010 · 자문 · AMIC/u);
  assert.match(selected, /저장됨/u);
  assert.doesNotMatch(selected, /client@example\.invalid/u);
});

test("filing overview distinguishes compose and in-flight filing without claiming completion", () => {
  assert.match(render({ item: { mode: "compose", subject: "답신 작성" } }), /작성 중/u);
  const saving = render({ busy: "file", filed: false });
  assert.match(saving, /저장 중/u);
  assert.doesNotMatch(saving, /저장됨/u);
});
