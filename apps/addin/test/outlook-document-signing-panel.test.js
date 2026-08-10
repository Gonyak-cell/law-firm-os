import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEMPLATE = Object.freeze({
  template_id: "template-v1", template_version: "v1", label: "위임 계약서", merge_fields: ["client_name", "matter_title"],
  signer_roles: [{ role_id: "client", required: true }, { role_id: "attorney", required: false }],
});
const REQUEST = Object.freeze({
  request_id: "esign-request-1", state: "sent", canonical_document_ref: "matter://matter-1/documents/doc-1/versions/ver-1", can_send: false, can_reconcile: true, completion_artifacts: null,
});
const APPROVED_REQUEST = Object.freeze({
  request_id: "esign-approved", matter_id: "matter-1", document: { document_id: "doc-1", version_id: "ver-1", sha256: "a".repeat(64) },
  recipients: [{ recipient_ref: "party:client", role: "client", routing_order: 1 }], state: "approved",
  canonical_document_ref: "matter://matter-1/documents/doc-1/versions/ver-1", can_send: true, can_reconcile: false,
  completion_artifacts: { signed_pdf: null, certificate: null }, production_ready_claim: false,
});
const PUBLISHED_REF = "matter://matter-1/documents/doc-published/versions/ver-published";
const REAL_PUBLISHED_REF = "matter://matter:builder:abc123/documents/document:builder:abc123/versions/version:document:builder:abc123:1";
const baseProps = Object.freeze({
  templates: [TEMPLATE], templateId: "template-v1", templateVersion: "v1", mergeValues: { client_name: "김 의뢰인", matter_title: "위임 계약" }, signerValues: { client: "party:test-client" }, requests: [REQUEST],
});

let vite;
let browserServer;
let browserOrigin;
let Panel;
let normalizePublishedRef;

test.before(async () => {
  vite = await createServer({ root: ADDIN_ROOT, configFile: `${ADDIN_ROOT}/vite.config.js`, appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  ({ OutlookDocumentSigningPanel: Panel, normalizeOutlookPublishedDocumentRef: normalizePublishedRef } = await vite.ssrLoadModule("/src/outlook-document-signing-panel.jsx"));
  browserServer = http.createServer(async (request, response) => {
    if (request.url === "/document-panel.html") {
      const html = await vite.transformIndexHtml(request.url, `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
        import React from "react"; import { createRoot } from "react-dom/client"; import { OutlookDocumentSigningPanel } from "/src/outlook-document-signing-panel.jsx";
        const root = createRoot(document.getElementById("root")); window.__calls = [];
        window.__renderPanel = (props) => root.render(React.createElement(OutlookDocumentSigningPanel, { ...props,
          onTemplateChange: (value) => window.__calls.push(["template", value]), onMergeValueChange: (key, value) => window.__calls.push(["merge", key, value]),
          onSignerValueChange: (key, value) => window.__calls.push(["signer", key, value]), onRequestApproval: (value) => window.__calls.push(["approval", value]),
          onPublish: (value) => window.__calls.push(["publish", value]), onSend: (value) => window.__calls.push(["send", value]), onReconcile: (value) => window.__calls.push(["reconcile", value]),
          onCopy: (value) => window.__calls.push(["copy", value]), onOpenDocument: (value) => window.__calls.push(["open", value]), onRetry: () => window.__calls.push(["retry"]),
        }));
      </script></body></html>`);
      response.setHeader("content-type", "text/html; charset=utf-8"); response.end(html); return;
    }
    vite.middlewares(request, response, () => { response.statusCode = 404; response.end("not found"); });
  });
  await new Promise((resolve) => browserServer.listen(0, "127.0.0.1", resolve));
  browserOrigin = `http://127.0.0.1:${browserServer.address().port}`;
});

test.after(async () => { await new Promise((resolve) => browserServer?.close(resolve)); await vite?.close(); });

test("OUTM-32/34 panel renders safe controlled fields and exact action surface", () => {
  const markup = renderToStaticMarkup(React.createElement(Panel, {
    ...baseProps, onTemplateChange() {}, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {}, onSend() {}, onReconcile() {}, onCopy() {}, onOpenDocument() {},
  }));
  assert.match(markup, /data-testid="outlook-document-signing-panel"/u);
  assert.match(markup, /data-testid="document-template-select"/u);
  assert.match(markup, /의뢰인 이름|Matter 제목|담당 변호사/u);
  assert.match(markup, /승인 필요/u);
  assert.match(markup, /승인 요청/u);
  assert.match(markup, /상태 확인/u);
  assert.match(markup, /matter:\/\/matter-1\/documents\/doc-1\/versions\/ver-1/u);
  assert.doesNotMatch(markup, /<a\b|href=/iu);
  assert.doesNotMatch(markup, /queue|provider|tenant|credential|raw_body|bytes/iu);

  const publishedMarkup = renderToStaticMarkup(React.createElement(Panel, {
    ...baseProps, requests: [], publishedDocumentRef: PUBLISHED_REF, onCopy() {}, onOpenDocument() {},
  }));
  assert.match(publishedMarkup, /data-testid="document-published-reference"/u);
  assert.match(publishedMarkup, new RegExp(PUBLISHED_REF.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.match(publishedMarkup, /data-testid="document-canonical-copy"/u);
  assert.match(publishedMarkup, /data-testid="document-canonical-open"/u);
  assert.doesNotMatch(publishedMarkup, /<a\b|href=/iu);

  const approvedMarkup = renderToStaticMarkup(React.createElement(Panel, {
    ...baseProps, requests: [], draft: { draft_id: "draft-1", approval_state: "approved", immutable: false }, publishedDocumentRef: PUBLISHED_REF, onPublish() {}, onCopy() {}, onOpenDocument() {},
  }));
  assert.ok(approvedMarkup.indexOf('data-action-row="document.publish"') < approvedMarkup.indexOf('data-testid="document-published-reference"'));
});

test("template selection preserves duplicate IDs by exact version and uses safe ordinal labels", () => {
  const markup = renderToStaticMarkup(React.createElement(Panel, {
    templates: [
      { template_id: "template-versioned", template_version: "v1", label: "위임 계약서", merge_fields: ["custom_party_name"], signer_roles: [{ role_id: "custom_signer", required: true }] },
      { template_id: "template-versioned", template_version: "v2", label: "위임 계약서", merge_fields: ["responsible_attorney"], signer_roles: [{ role_id: "client", required: true }] },
    ], templateId: "template-versioned", templateVersion: "v2", mergeValues: { responsible_attorney: "담당자" }, signerValues: { client: "party:client" }, onTemplateChange() {}, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {},
  }));
  assert.match(markup, /위임 계약서 · v1/u);
  assert.match(markup, /위임 계약서 · v2/u);
  assert.match(markup, /담당 변호사/u);
  assert.doesNotMatch(markup, /custom_party_name|custom_signer/u);
  assert.match(markup, /value="[^"]*v2[^"]*" selected/u);
});

test("published ref normalizer accepts only the exact canonical contract", () => {
  assert.equal(normalizePublishedRef(PUBLISHED_REF), PUBLISHED_REF);
  assert.equal(normalizePublishedRef(REAL_PUBLISHED_REF), REAL_PUBLISHED_REF);
  for (const value of [
    null,
    "matter://matter-1/documents/doc-1",
    "matter://matter-1/documents/doc-1/versions/ver-1?raw=true",
    "matter://matter-1/documents/doc-1/versions/ver-1#hash",
    "matter://user@matter-1/documents/doc-1/versions/ver-1",
    "document://matter-1/documents/doc-1/versions/ver-1",
    "matter://matter-1/documents/doc-1/versions/ver-1/extra",
    " matter://matter-1/documents/doc-1/versions/ver-1",
    "matter://matter-1/documents/doc-1/versions/ver-1 ",
  ]) assert.equal(normalizePublishedRef(value), null);
});

test("integration-shaped approved eSign request remains actionable with explicit empty artifacts", () => {
  const markup = renderToStaticMarkup(React.createElement(Panel, { requests: [APPROVED_REQUEST], onSend() {} }));
  assert.match(markup, /서명 · 승인됨/u);
  assert.match(markup, /data-testid="document-esign-send"[^>]*>보내기/u);
  assert.doesNotMatch(markup, /queue|provider_payload|recipient_ref|sha256/u);
});

test("eSign completion requires distinct immutable signed PDF and certificate artifacts", () => {
  const canonical = "matter://matter-1/documents/doc-1/versions/ver-1";
  const artifact = (document_id, version_id, sha256, immutable = true) => ({ document_id, version_id, sha256, immutable });
  const validArtifacts = {
    signed_pdf: artifact("doc-pdf", "ver-pdf", "a".repeat(64)),
    certificate: artifact("doc-certificate", "ver-certificate", "b".repeat(64)),
  };
  const renderRequest = (request) => renderToStaticMarkup(React.createElement(Panel, { requests: [request] }));
  const valid = renderRequest({ request_id: "completed-valid", state: "completed", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts: validArtifacts });
  assert.match(valid, /서명 · 완료/u);

  for (const completion_artifacts of [
    null,
    { signed_pdf: null, certificate: null },
    { signed_pdf: validArtifacts.signed_pdf, certificate: null },
    { signed_pdf: artifact("doc-pdf", "ver-pdf", "a".repeat(64), false), certificate: validArtifacts.certificate },
    { signed_pdf: artifact("doc-pdf", "ver-pdf", "a".repeat(64)), certificate: artifact("doc-pdf", "ver-pdf", "a".repeat(64)) },
    { signed_pdf: artifact("doc-pdf", "ver-pdf", "a".repeat(64)), certificate: artifact("doc-pdf", "ver-pdf", "b".repeat(64)) },
    { signed_pdf: artifact("doc-pdf", "ver-pdf", "a".repeat(64)), certificate: artifact("doc-pdf", "ver-certificate", "b".repeat(64)) },
    { signed_pdf: artifact("doc-pdf", "ver-pdf", "not-a-sha"), certificate: validArtifacts.certificate },
  ]) {
    const malformed = renderRequest({ request_id: "completed-invalid", state: "completed", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts });
    assert.doesNotMatch(malformed, /document-esign-request|서명 · 완료/u);
  }

  const pending = renderRequest({ request_id: "pending-artifacts", state: "completed_artifacts_pending", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts: { signed_pdf: null, certificate: null } });
  assert.match(pending, /서명 · 완료 자료 확인 중/u);
  const pendingOneArtifact = renderRequest({ request_id: "pending-one-artifact", state: "completed_artifacts_pending", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts: { signed_pdf: validArtifacts.signed_pdf, certificate: null } });
  assert.match(pendingOneArtifact, /서명 · 완료 자료 확인 중/u);
  const pendingSameIdentity = renderRequest({ request_id: "pending-same-identity", state: "completed_artifacts_pending", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts: { signed_pdf: artifact("doc-pending", "ver-pending", "a".repeat(64)), certificate: artifact("doc-pending", "ver-pending", "b".repeat(64)) } });
  assert.doesNotMatch(pendingSameIdentity, /document-esign-request|서명 · 완료 자료 확인 중/u);
  const pendingSameDocument = renderRequest({ request_id: "pending-same-document", state: "completed_artifacts_pending", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts: { signed_pdf: artifact("doc-pending", "ver-pending", "a".repeat(64)), certificate: artifact("doc-pending", "ver-certificate", "b".repeat(64)) } });
  assert.doesNotMatch(pendingSameDocument, /document-esign-request|서명 · 완료 자료 확인 중/u);
  const inconsistent = renderRequest({ request_id: "sent-artifacts", state: "sent", canonical_document_ref: canonical, can_send: false, can_reconcile: false, completion_artifacts: { signed_pdf: null, certificate: null } });
  assert.match(inconsistent, /document-esign-request|서명 · 전송됨/u);
  const missing = renderRequest({ request_id: "sent-missing-artifacts", state: "sent", canonical_document_ref: canonical, can_send: false, can_reconcile: false });
  assert.doesNotMatch(missing, /document-esign-request|서명 · 전송됨/u);
});

test("authorized contact fields remain usable while unsafe projections fail closed", () => {
  const markup = renderToStaticMarkup(React.createElement(Panel, {
    templates: [{ template_id: "template-safe", template_version: "v1", label: "안전 서식", merge_fields: ["client_contact_authorization", "contact_email", "client_address", "client_name"], signer_roles: [{ role_id: "client", required: true }] }],
    templateId: "template-safe", templateVersion: "v1", mergeValues: { client_contact_authorization: "승인됨", contact_email: "client@example.test", client_address: "123 Main St, Suite 4", client_name: "안전 값" }, signerValues: { client: { recipient_ref: "contact-secret" } },
    requests: [{ request_id: "request-safe", state: "unknown", canonical_document_ref: "matter://matter-1/documents/doc-1/versions/ver-1", can_send: true }],
  }));
  assert.match(markup, /안전 서식|안전 값|의뢰인 연락처 권한|연락처 이메일|의뢰인 주소|client@example\.test|123 Main St, Suite 4/u);
  assert.doesNotMatch(markup, /client_contact_authorization|contact_email|client_address|contact-secret|request-safe|unknown|doc-1|ver-1/u);
  assert.doesNotMatch(markup, /document-esign-send|document-canonical-copy|document-canonical-open/u);
  assert.match(markup, /data-testid="document-approval-state"[^>]*>승인 필요/u);

  const bounded = renderToStaticMarkup(React.createElement(Panel, {
    requests: Array.from({ length: 12 }, (_, index) => ({ request_id: `esign-${index}`, state: "sent", canonical_document_ref: `matter://matter-1/documents/doc-${index}/versions/ver-${index}`, can_reconcile: true, completion_artifacts: null })),
    onReconcile() {}, onCopy() {}, onOpenDocument() {},
  }));
  assert.equal((bounded.match(/data-testid="document-esign-request"/gu) ?? []).length, 8);

  const ordinaryText = renderToStaticMarkup(React.createElement(Panel, {
    ...baseProps, mergeValues: { client_name: "client@example.test", matter_title: "123 Main St, Suite 4" }, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {},
  }));
  assert.match(ordinaryText, /client@example\.test|123 Main St, Suite 4/u);
});

test("unsafe response keys and object shapes are rejected structurally", () => {
  const unsafeTemplate = renderToStaticMarkup(React.createElement(Panel, {
    templates: [{ template_id: "template-unsafe", template_version: "v1", label: "노출 금지", merge_fields: ["client_name"], signer_roles: [{ role_id: "client", required: true }], provider_payload: "secret" }],
    templateId: "template-unsafe", templateVersion: "v1", mergeValues: { client_name: "safe value" }, signerValues: { client: "party:client" }, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {},
  }));
  assert.match(unsafeTemplate, /승인된 서식 없음/u);
  assert.doesNotMatch(unsafeTemplate, /노출 금지|safe value|secret|provider_payload|document-merge/u);

  const unsafeNested = renderToStaticMarkup(React.createElement(Panel, {
    templates: [{ template_id: "template-nested", template_version: "v1", label: "안전 서식", merge_fields: [{ key: "client_name", raw_body: "secret" }, "matter_title", "custom_field"], signer_roles: [{ role_id: "client", required: true, provider_payload: "secret" }, { role_id: "custom_signer", required: true }] }],
    templateId: "template-nested", templateVersion: "v1", mergeValues: { client_name: "safe value", matter_title: "안전 제목", custom_field: "사용자 값" }, signerValues: { client: "party:client", custom_signer: "party:custom" }, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {},
  }));
  assert.doesNotMatch(unsafeNested, /provider_payload|raw_body|secret|safe value/u);
  assert.match(unsafeNested, /승인된 서식 없음/u);

  const safeUnknown = renderToStaticMarkup(React.createElement(Panel, {
    templates: [{ template_id: "template-unknown", template_version: "v1", label: "안전 서식", merge_fields: ["matter_title", "custom_field"], signer_roles: [{ role_id: "custom_signer", required: true }] }],
    templateId: "template-unknown", templateVersion: "v1", mergeValues: { matter_title: "안전 제목", custom_field: "사용자 값" }, signerValues: { custom_signer: "party:custom" }, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {},
  }));
  assert.match(safeUnknown, /안전 제목|병합 항목 2|서명자 1/u);
  assert.doesNotMatch(safeUnknown, /custom_field|custom_signer/u);

  const unsafeValues = renderToStaticMarkup(React.createElement(Panel, {
    ...baseProps, mergeValues: { client_name: "safe value", matter_title: "안전 제목", raw_body: "secret" }, onMergeValueChange() {}, onSignerValueChange() {}, onRequestApproval() {},
  }));
  assert.doesNotMatch(unsafeValues, /safe value|secret/u);
});

test("browser behavior keeps keyboard focus/live states, exact callbacks, busy gates, and no href", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${browserOrigin}/document-panel.html`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof window.__renderPanel === "function");
    await page.evaluate((props) => window.__renderPanel(props), { ...baseProps });
    await page.locator("#generated-document-template").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "document-merge-0");
    await page.locator("[data-testid='document-request-approval']").click();
    await page.locator("[data-testid='document-esign-reconcile']").click();
    await page.locator("[data-testid='document-canonical-copy']").click();
    await page.locator("[data-testid='document-canonical-open']").click();
    const calls = await page.evaluate(() => window.__calls);
    assert.deepEqual(calls[0], ["approval", { template_id: "template-v1", template_version: "v1", merge_data: { client_name: "김 의뢰인", matter_title: "위임 계약" }, signer_role_refs: [{ role_id: "client", party_ref: "party:test-client" }] }]);
    assert.deepEqual(calls.slice(1), [["reconcile", "esign-request-1"], ["copy", baseProps.requests[0].canonical_document_ref], ["open", baseProps.requests[0].canonical_document_ref]]);
    assert.equal(await page.locator("a[href], [href]").count(), 0);
    await page.evaluate(() => { window.__calls = []; });
    await page.evaluate((props) => window.__renderPanel({ ...props, requests: [], publishedDocumentRef: props.publishedRef }), { ...baseProps, publishedRef: REAL_PUBLISHED_REF });
    await page.waitForSelector("[data-testid='document-published-reference']");
    assert.equal(await page.locator("[data-testid='document-canonical-ref']").innerText(), REAL_PUBLISHED_REF);
    await page.locator("[data-testid='document-canonical-copy']").click();
    await page.locator("[data-testid='document-canonical-open']").click();
    assert.deepEqual(await page.evaluate(() => window.__calls), [["copy", REAL_PUBLISHED_REF], ["open", REAL_PUBLISHED_REF]]);
    await page.evaluate((props) => window.__renderPanel({ ...props, busy: true, partial: true, error: "잠시 후 다시 확인해 주세요." }), { ...baseProps });
    await page.waitForSelector("[data-testid='document-status']");
    assert.equal(await page.locator("[data-testid='document-request-approval']").isDisabled(), true);
    assert.match(await page.locator("[data-testid='document-status']").innerText(), /처리 중/u);
    assert.match(await page.locator("[data-testid='document-partial']").innerText(), /일부 문서 상태만 확인됨/u);
    await page.evaluate((props) => window.__renderPanel({ ...props, partial: true, error: "잠시 후 다시 확인해 주세요." }), { ...baseProps });
    await page.waitForSelector("[data-testid='document-retry']:not([disabled])");
    await page.locator("[data-testid='document-retry']").click();
    assert.deepEqual((await page.evaluate(() => window.__calls)).at(-1), ["retry"]);
  } finally { await page.close(); await browser.close(); }
});
