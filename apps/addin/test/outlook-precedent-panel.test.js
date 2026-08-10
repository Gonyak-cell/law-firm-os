import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { createServer } from "vite";

const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
let vite;
let browserServer;
let browserOrigin;
let OutlookPrecedentPanel;

test.before(async () => {
  vite = await createServer({
    root: ADDIN_ROOT,
    configFile: `${ADDIN_ROOT}/vite.config.js`,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  ({ OutlookPrecedentPanel } = await vite.ssrLoadModule("/src/outlook-precedent-panel.jsx"));
  browserServer = http.createServer(async (request, response) => {
    if (request.url === "/outlook-precedent-panel-test.html") {
      const html = await vite.transformIndexHtml(request.url, `<!doctype html>
        <html lang="ko"><body><div id="root"></div>
          <script type="module">
            import React from "react";
            import { createRoot } from "react-dom/client";
            import { OutlookPrecedentPanel } from "/src/outlook-precedent-panel.jsx";
            const root = createRoot(document.getElementById("root"));
            window.__openCalls = [];
            window.__renderPanel = (props) => root.render(React.createElement(OutlookPrecedentPanel, {
              ...props,
              onQueryChange() {}, onSubmit() {}, onSelect() {}, onCopy() {},
              onOpenDeepLink: (value) => window.__openCalls.push(value),
            }));
          </script>
        </body></html>`);
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(html);
      return;
    }
    vite.middlewares(request, response, () => {
      response.statusCode = 404;
      response.end("not found");
    });
  });
  await new Promise((resolve) => browserServer.listen(0, "127.0.0.1", resolve));
  browserOrigin = `http://127.0.0.1:${browserServer.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => browserServer?.close(resolve));
  await vite?.close();
});

function render(props = {}) {
  return renderToStaticMarkup(React.createElement(OutlookPrecedentPanel, {
    authoritative: true,
    runtimeReady: true,
    query: "계약책임",
    onQueryChange() {},
    onSubmit() {},
    onSelect() {},
    onCopy() {},
    onOpenDeepLink() {},
    ...props,
  }));
}

const CASE_ITEM = Object.freeze({
  one_line: "대법원 계약책임 판결 · matter-prior-001",
  copyable: Object.freeze({
    source_id: "source-case-001",
    source_kind: "case_law_document",
    title: "대법원 계약책임 판결",
    source_matter_id: "matter-prior-001",
    document_id: "document-case-001",
    version_id: "version-case-001",
    citation: Object.freeze({ court: "대법원", case_number: "2025다54321", decision_date: "2026-06-11" }),
    source_reference: "대법원 2026. 6. 11. 선고 2025다54321 판결",
    source_url: "https://glaw.scourt.go.kr/precedent/2025da54321",
    content_sha256: "a".repeat(64),
    index_version: "lawos-precedent-fts-v2",
    deep_link: `?view=vault&matter_id=matter-prior-001&document_id=document-case-001&document_version_id=version-case-001&document_sha256=${"a".repeat(64)}#vault-search-documents`,
  }),
});

test("unready authority fails closed without search controls", () => {
  const markup = render({ authoritative: false, runtimeReady: false, authoritativeReady: false });
  assert.match(markup, /data-ready="false"/u);
  assert.match(markup, /색인 갱신 필요/u);
  assert.doesNotMatch(markup, /precedent-search-input|outlook-precedent-search-submit|검색어/iu);
  assert.doesNotMatch(markup, /<form/u);
  assert.doesNotMatch(render({ authoritative: true, runtimeReady: true, authoritativeReady: false }), /outlook-precedent-result|outlook-precedent-detail|outlook-precedent-critical|outlook-precedent-open/iu);
  assert.doesNotMatch(render({ authoritative: undefined, runtimeReady: undefined, authoritativeReady: true }), /data-ready="true"/u);
  assert.match(render({ authoritative: false, runtimeReady: false, authoritativeReady: true }), /data-ready="false"/u);
  const loadingMarkup = render({ authoritative: null, runtimeReady: null, busy: true, onRetry() {} });
  assert.match(loadingMarkup, /data-testid="outlook-precedent-index-stale"[^>]*>검색 준비 상태 확인 중</u);
  assert.doesNotMatch(loadingMarkup, /색인 갱신 필요|outlook-precedent-retry|outlook-precedent-search-input|<form/u);
});

test("populated stale or vetoed readiness removes old results and exposes a live blocked status", () => {
  for (const props of [
    { indexStale: true },
    { authoritative: false, runtimeReady: true },
    { authoritative: true, runtimeReady: true, authoritativeReady: false },
  ]) {
    const markup = render({ items: [CASE_ITEM], selectedItem: CASE_ITEM, ...props });
    assert.match(markup, /data-ready="false"/u);
    assert.match(markup, /role="status"[^>]*aria-live="polite"[^>]*tabindex="-1"/u);
    assert.doesNotMatch(markup, /outlook-precedent-search-form|outlook-precedent-result|outlook-precedent-detail|outlook-precedent-critical|outlook-precedent-open|source-case-001/iu);
  }
});

test("ready panel renders explicit search, flat case-law result, and complete critical detail", () => {
  const markup = render({ items: [CASE_ITEM], selectedItem: CASE_ITEM });
  assert.match(markup, /placeholder="검색어"/u);
  assert.match(markup, /data-testid="outlook-precedent-search-submit"/u);
  assert.match(markup, /aria-label="판례"/u);
  for (const value of [
    "대법원 계약책임 판결", "대법원", "2025다54321", "2026-06-11",
    "source-case-001", "matter-prior-001", "document-case-001", "version-case-001",
    "2025다54321 판결", "https://glaw.scourt.go.kr/precedent/2025da54321",
    "a".repeat(64), "lawos-precedent-fts-v2",
  ]) assert.match(markup, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.equal((markup.match(/Law Firm OS에서 열기/gu) ?? []).length, 1);
  assert.doesNotMatch(markup, /href=/u);
  assert.doesNotMatch(markup, /\b(?:rank|score|confidence|generated|AI)\b/iu);
});

test("empty and retry states stay one-line and do not expose raw link markup", () => {
  const emptyMarkup = render({ items: [], empty: true });
  assert.match(emptyMarkup, /data-testid="outlook-precedent-empty"[^>]*>결과 없음</u);
  const errorMarkup = render({ items: [], error: "검색을 불러오지 못했습니다.", onRetry() {} });
  assert.match(errorMarkup, /role="alert"/u);
  assert.match(errorMarkup, /data-testid="outlook-precedent-retry"/u);
  assert.match(errorMarkup, /다시 시도/u);
  assert.doesNotMatch(errorMarkup, /<a\b|href=/iu);
  assert.match(render({ busy: true }), /data-testid="outlook-precedent-busy"[^>]*>검색 중</u);
});

test("rendered readiness transition hands focus from blocked status to search, while veto returns focus to status", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${browserOrigin}/outlook-precedent-panel-test.html`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof window.__renderPanel === "function");
    await page.evaluate(() => window.__renderPanel({ authoritative: false, runtimeReady: true, indexStale: false }));
    await page.waitForFunction(() => document.activeElement?.dataset.testid === "outlook-precedent-index-stale");
    await page.evaluate(() => window.__renderPanel({ authoritative: true, runtimeReady: true, indexStale: false }));
    await page.waitForFunction(() => document.activeElement?.id === "precedent-search-input");
    assert.equal(await page.locator("#precedent-search-input").count(), 1);
    await page.evaluate(() => window.__renderPanel({ authoritative: true, runtimeReady: true, authoritativeReady: false, indexStale: false }));
    await page.waitForFunction(() => document.activeElement?.dataset.testid === "outlook-precedent-index-stale");
    assert.equal(await page.locator("#precedent-search-input").count(), 0);
  } finally {
    await page.close();
    await browser.close();
  }
});

test("rendered open action calls once with only the app-owned deep link", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${browserOrigin}/outlook-precedent-panel-test.html`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof window.__renderPanel === "function");
    await page.evaluate((item) => window.__renderPanel({
      authoritative: true,
      runtimeReady: true,
      items: [item],
      selectedItem: item,
    }), CASE_ITEM);
    await page.locator("[data-testid='outlook-precedent-open']").click();
    assert.deepEqual(await page.evaluate(() => window.__openCalls), [CASE_ITEM.copyable.deep_link]);
    assert.equal(await page.locator("a[href], [href]").count(), 0);
    assert.equal(await page.locator("[data-testid='outlook-precedent-open']").count(), 1);
  } finally {
    await page.close();
    await browser.close();
  }
});
