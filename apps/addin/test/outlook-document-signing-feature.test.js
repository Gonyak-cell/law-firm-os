import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
const ARTIFACT_DIR = process.env.OUTLOOK_DOCUMENT_FEATURE_ARTIFACT_DIR || "";
const H = "a".repeat(64);
const B = "b".repeat(64);
const BASE = Object.freeze({ contextKey: "item-a:session-a", matterId: "matter-a" });
let vite, server, browser, origin;

function template(version = "v1", fields = ["client_name", "custom_party"], roles = [{ role_id: "custom_signer", required: true }], hash = H) {
  return { template_id: "template-a", template_version: version, template_hash: hash, label: "위임 계약서", category: "document", merge_field_count: fields.length, merge_fields: fields, signer_roles: roles, requires_approval: true, approval_receipt_present: true, raw_template_body_included: false, raw_contact_values_included: false, production_ready_claim: false }; }

function receipt(approvalId, values = {}) {
  return { receipt_id: values.approval_receipt_id || "receipt-a", approval_request_id: approvalId, approved_at: "2026-08-10T00:00:00.000Z", input_hash: values.input_hash || H, input_fingerprint: values.input_fingerprint || H, template_hash: values.template_hash || H, receipt_hash: H, approved_by_ref_included: false, raw_body_included: false, raw_contact_values_included: false }; }

function approval(matter, values = {}) {
  const isApproved = values.approved === true;
  const approvalId = values.approval_request_id || "approval-a";
  return { approval_request_id: approvalId, draft_id: values.draft_id || "draft-a", matter_id: matter, status: isApproved ? "approved" : "pending_owner_approval", decision: isApproved ? "approved" : null, reviewer_role: "owner", input_fingerprint: values.input_fingerprint || H, template_id: values.template_id || "template-a", template_version: values.template_version || "v1", template_hash: values.template_hash || H, approval_receipt: isApproved ? receipt(approvalId, values) : null, reviewer_user_ref_included: false, owner_approval_ref_included: false, raw_body_included: false, raw_contact_values_included: false, production_ready_claim: false }; }

function draft(matter, values = {}) {
  const finalized = values.finalized === true;
  return { draft_id: values.draft_id || "draft-a", matter_id: matter, template_id: values.template_id || "template-a", template_version: values.template_version || "v1", template_hash: values.template_hash || H, input_fingerprint: values.input_fingerprint || H, title: "위임 계약서", status: finalized ? "finalized" : values.partial ? "draft" : "ready_for_review", safe_excerpt: "입력 본문 24자", merge_field_count: 2, signer_role_count: 1, approval_state: values.approved || finalized ? "approved" : "approval_required", publish_state: finalized ? "complete" : values.approved ? "approved_unpublished" : "owner_blocked", immutable: finalized, raw_body_included: false, raw_template_body_included: false, raw_contact_values_included: false, document_bytes_included: false, production_ready_claim: false }; }

function esign(matter, requestId, values = {}) {
  const documentId = values.document_id || "document-a";
  const versionId = values.version_id || "version-a";
  const state = values.state || "draft_created";
  const completion_artifacts = state === "completed" ? {
    signed_pdf: { document_id: "signed-document", version_id: "signed-version", sha256: H, immutable: true },
    certificate: { document_id: "certificate-document", version_id: "certificate-version", sha256: H, immutable: true },
  } : null;
  return { request_id: requestId, matter_id: matter, document: { document_id: documentId, version_id: versionId, sha256: H }, recipients: [{ recipient_ref: "party-a", role: "client", routing_order: 1 }], state, canonical_document_ref: `matter://${matter}/documents/${documentId}/versions/${versionId}`, can_send: values.can_send === true, can_reconcile: values.can_reconcile === true, completion_artifacts, production_ready_claim: false }; }

function catalog(matter, values = {}) { const esignReady = values.esignReady !== false;
  return { request_id: "catalog-a", outcome: "passed", matter_id: matter, templates: values.templates || [template("v1"), template("v2", ["responsible_attorney"], [{ role_id: "client", required: true }])], approval_requests: values.approvals || [], esign_requests: values.esigns || [], readiness: { authoritative: true, builder_ready: true, esign_ready: esignReady }, safe_error_codes: esignReady ? [] : ["DOCUSIGN_RUNTIME_UNAVAILABLE"], count_leak_prevented: true, production_ready_claim: false }; }

function approvalResult(matter, values = {}) {
  return { request_id: "approval-result", outcome: values.partial ? "partial" : values.outcome || "approval_required", matter_id: matter, draft: draft(matter, values), approval_request: values.partial ? null : approval(matter, values), partial: values.partial === true, draft_replayed: values.replayed === true, approval_replayed: values.replayed === true, safe_error_codes: values.partial ? ["DOCUMENT_APPROVAL_PERSISTENCE_UNAVAILABLE"] : [], count_leak_prevented: true, production_ready_claim: false }; }

function artifact(draftId, documentId, versionId, values = {}) {
  return { artifact_id: "artifact-a", draft_id: draftId, document_id: documentId, version_id: versionId, file_object_id: "file-a", filename: "위임계약서.docx", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", byte_size: 120, sha256: H, generator_version: "generator-1", template_id: values.template_id || "template-a", template_version: values.template_version || "v1", template_hash: values.template_hash || H, input_hash: values.input_hash || H, approval_receipt_id: values.approval_receipt_id || "receipt-a", status: "finalized", immutable: true, signer_snapshot_count: 1, document_bytes_included: false, raw_body_included: false, raw_contact_values_included: false, raw_storage_path_included: false }; }

function publishResult(matter, draftId, documentId, versionId, values = {}) { const partial = values.partial === true;
  return { request_id: "publish-result", outcome: partial ? "reconciliation_required" : values.outcome || "created", matter_id: matter, draft: partial ? null : draft(matter, { ...values, draft_id: draftId, finalized: true }), artifact: partial ? null : artifact(draftId, documentId, versionId, values), canonical_document_ref: partial ? null : `matter://${matter}/documents/${documentId}/versions/${versionId}`, partial, idempotent_replay: values.replayed === true, safe_error_codes: partial ? ["DOCUMENT_PUBLICATION_CONFIRMATION_UNAVAILABLE"] : [], count_leak_prevented: true, production_ready_claim: false }; }

function actionResult(outcome, item) { return { request_id: "action-result", outcome, item, safe_error_codes: [], production_ready_claim: false }; }

test.before(async () => {
  if (ARTIFACT_DIR) mkdirSync(ARTIFACT_DIR, { recursive: true });
  vite = await createServer({ root: ADDIN_ROOT, configFile: `${ADDIN_ROOT}/vite.config.js`, appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  server = http.createServer(async (request, response) => {
    if (request.url === "/document-feature.html") {
      const html = await vite.transformIndexHtml(request.url, `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
        import React from "react"; import { createRoot } from "react-dom/client"; import "/src/styles.css"; import { OutlookDocumentSigningFeature } from "/src/outlook-document-signing-feature.jsx";
        const root = createRoot(document.getElementById("root")); const pending = []; window.__requests = []; window.__calls = []; window.__uuids = []; window.__active = {}; window.__commit = 0; window.__nextCommit = 0;
        const nativeUuid = crypto.randomUUID.bind(crypto); Object.defineProperty(crypto, "randomUUID", { value: () => { const value = nativeUuid(); window.__uuids.push(value); return value; } });
        function CommitProbe({ commit, ...props }) { React.useLayoutEffect(() => { window.__commit = commit; }, [commit]); return React.createElement(OutlookDocumentSigningFeature, props); }
        window.__render = (input) => { const { omitContextCheck, omitRequest, staleContext, requestVersion = 0, ...props } = input; const commit = ++window.__nextCommit; window.__active = { contextKey: props.contextKey, matterId: props.matterId }; const requestJson = (path, options = {}) => new Promise((resolve, reject) => { window.__requests.push({ path, options, requestVersion }); pending.push({ resolve, reject }); }); root.render(React.createElement(CommitProbe, { ...props, commit, requestJson: omitRequest ? undefined : requestJson, isContextCurrent: omitContextCheck ? undefined : (snapshot) => !staleContext && snapshot.contextKey === window.__active.contextKey && snapshot.matterId === window.__active.matterId, onCopy: (value) => window.__calls.push(["copy", value]), onOpenDocument: (value) => window.__calls.push(["open", value]) })); return commit; };
        window.__resolve = (index, value) => pending[index].resolve(value); window.__reject = (index, value) => pending[index].reject(Object.assign(new Error(value.message || "request failed"), value)); window.__unmount = () => root.unmount();
      </script></body></html>`);
      response.setHeader("content-type", "text/html; charset=utf-8"); response.end(html); return;
    }
    vite.middlewares(request, response, () => { response.statusCode = 404; response.end("not found"); });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => { await browser?.close(); await new Promise((resolve) => server?.close(resolve)); await vite?.close(); });

async function open(props = BASE, viewport = { width: 320, height: 900 }) {
  const page = await browser.newPage({ viewport }); await page.goto(`${origin}/document-feature.html`); await page.waitForFunction(() => typeof window.__render === "function");
  const commit = await page.evaluate((value) => window.__render(value), props); await page.waitForFunction((value) => window.__commit === value, commit); return page;
}

async function render(page, props) { const commit = await page.evaluate((value) => window.__render(value), props); await page.waitForFunction((value) => window.__commit === value, commit); }
async function waitRequests(page, count) { await page.waitForFunction((expected) => window.__requests.length >= expected, count); assert.equal(await page.evaluate(() => window.__requests.length), count); }
async function resolveRequest(page, index, body) { await page.evaluate(({ index, body }) => window.__resolve(index, body), { index, body }); }
async function rejectRequest(page, index, error) { await page.evaluate(({ index, error }) => window.__reject(index, error), { index, error }); }
async function waitIdle(page) { await page.locator("[data-testid=outlook-document-signing-panel][aria-busy=false]").waitFor(); }
function wire(value) { return { path: value.path, options: value.options }; }

test("catalog, versioned inputs, partial approval, exact retry, busy and keyboard contracts", { timeout: 30_000 }, async () => {
  const page = await open();
  try {
    await waitRequests(page, 1); assert.equal(await page.evaluate(() => window.__requests[0].path), "/api/outlook/documents?matter_id=matter-a");
    assert.equal(await page.getByTestId("outlook-document-signing-panel").getAttribute("aria-busy"), "true");
    assert.equal(await page.getByTestId("document-status").getAttribute("aria-live"), "polite");
    await render(page, { ...BASE, requestVersion: 1 }); assert.equal(await page.evaluate(() => window.__requests.length), 1);
    await resolveRequest(page, 0, catalog("matter-a")); await waitIdle(page);
    assert.deepEqual(await page.locator("#generated-document-template option").allTextContents(), ["승인된 서식 선택", "위임 계약서 · v1", "위임 계약서 · v2"]);
    await page.getByTestId("document-template-select").selectOption("template-a~v2");
    await page.getByText("담당 변호사").waitFor();
    await page.getByTestId("document-template-select").selectOption("template-a~v1");
    await page.getByText("병합 항목 2").waitFor(); assert.equal(await page.getByText("서명자 1").count(), 1);
    await page.getByTestId("document-template-select").focus(); await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "document-merge-0");
    await page.getByTestId("document-merge-field-0").fill("client@example.test");
    await page.getByTestId("document-merge-field-1").fill("123 Main St, Suite 4");
    await page.getByTestId("document-signer-field-0").fill("party:client");
    await page.evaluate(() => { const button = document.querySelector("[data-testid=document-request-approval]"); button.click(); button.click(); });
    await waitRequests(page, 2);
    await render(page, { ...BASE, requestVersion: 2 }); assert.equal(await page.evaluate(() => window.__requests.length), 2);
    assert.equal(await page.getByTestId("outlook-document-signing-panel").getAttribute("aria-busy"), "true");
    assert.equal(await page.getByTestId("document-merge-field-0").isDisabled(), true);
    const first = await page.evaluate(() => window.__requests[1]);
    assert.equal(first.path, "/api/outlook/documents/approval-requests");
    assert.deepEqual(Object.keys(first.options.body), ["matter_id", "template_id", "template_version", "title", "merge_data", "signer_role_refs", "idempotency_key", "explicit_human_action"]);
    assert.deepEqual(first.options.body.merge_data, { client_name: "client@example.test", custom_party: "123 Main St, Suite 4" });
    assert.equal(first.options.body.title, "위임 계약서");
    assert.equal(first.requestVersion, 1);
    assert.match(first.options.body.idempotency_key, /^outlook-document-approval:[a-f0-9]{64}$/u);
    for (const key of ["tenant_id", "actor_id", "provider", "raw_body", "document_bytes"]) assert.equal(key in first.options.body, false);
    await rejectRequest(page, 1, { message: "partial", status: 503, payload: approvalResult("matter-a", { partial: true }) });
    await page.getByTestId("document-retry").waitFor();
    assert.equal(await page.getByTestId("document-partial").textContent(), "일부 문서 상태만 확인됨");
    assert.equal((await page.locator("body").textContent()).includes("partial"), false);
    await page.getByTestId("document-retry").click(); await waitRequests(page, 3);
    const exactRetry = await page.evaluate(() => window.__requests[2]); assert.deepEqual(wire(exactRetry), wire(first)); assert.equal(exactRetry.requestVersion, 2);
    await resolveRequest(page, 2, approvalResult("matter-a", { outcome: "idempotent_replay", replayed: true })); await waitIdle(page);
    assert.equal(await page.getByTestId("document-error").count(), 0);
    await page.getByTestId("document-request-approval").click(); await waitRequests(page, 4);
    await rejectRequest(page, 3, { message: "conflict", status: 409 }); await waitRequests(page, 5);
    assert.match((await page.evaluate(() => window.__requests[4].path)), /^\/api\/outlook\/documents\?matter_id=matter-a$/u);
    await rejectRequest(page, 4, { message: "refresh failed", status: 503 }); await waitIdle(page);
    assert.equal(await page.getByTestId("document-request-approval").isDisabled(), true); await page.evaluate(() => document.querySelector("[data-testid=document-request-approval]").click()); assert.equal(await page.evaluate(() => window.__requests.length), 5);
    await page.getByTestId("document-retry").click(); await waitRequests(page, 6);
    await resolveRequest(page, 5, catalog("matter-a", { templates: [template("v1", undefined, undefined, B), template("v2", ["responsible_attorney"], [{ role_id: "client", required: true }])] })); await page.getByTestId("document-retry").waitFor({ state: "detached" }); await waitIdle(page);
    assert.equal(await page.getByTestId("document-retry").count(), 0); assert.equal(await page.getByTestId("document-error").count(), 0);
    assert.equal(await page.getByTestId("document-merge-field-0").inputValue(), "");
    await page.getByTestId("document-merge-field-0").fill("client@example.test"); await page.getByTestId("document-merge-field-1").fill("123 Main St, Suite 4"); await page.getByTestId("document-signer-field-0").fill("party:client");
    await page.getByTestId("document-request-approval").click(); await waitRequests(page, 7);
    const hashB = await page.evaluate(() => window.__requests[6]); assert.notEqual(hashB.options.body.idempotency_key, first.options.body.idempotency_key); assert.deepEqual({ ...hashB.options.body, idempotency_key: first.options.body.idempotency_key }, first.options.body);
    await resolveRequest(page, 6, approvalResult("matter-a", { template_hash: B })); await waitIdle(page); assert.equal(await page.getByTestId("document-retry").count(), 0);
    await render(page, { contextKey: "item-hash-drift:session-a", matterId: "matter-a" }); await waitRequests(page, 8);
    await resolveRequest(page, 7, catalog("matter-a", { approvals: [approval("matter-a", { approved: true, template_hash: B })] })); await waitIdle(page);
    assert.equal(await page.getByTestId("document-publish").count(), 0);
  } finally { await page.close(); }
});

test("editing visible inputs invalidates a restored approval before publish", { timeout: 30_000 }, async () => {
  const page = await open({ contextKey: "item-approved-edit:session-a", matterId: "matter-a" });
  try {
    await waitRequests(page, 1);
    await resolveRequest(page, 0, catalog("matter-a", {
      approvals: [approval("matter-a", { approved: true })],
    }));
    await waitIdle(page);
    assert.equal(await page.getByTestId("document-publish").count(), 1);
    await page.getByTestId("document-merge-field-0").fill("changed@example.test");
    assert.equal(await page.getByTestId("document-publish").count(), 0);
    await page.getByTestId("document-merge-field-1").fill("Changed address");
    await page.getByTestId("document-signer-field-0").fill("party:changed-client");
    await page.getByTestId("document-request-approval").click();
    await waitRequests(page, 2);
    const request = await page.evaluate(() => window.__requests[1]);
    assert.equal(request.path, "/api/outlook/documents/approval-requests");
    assert.deepEqual(request.options.body.merge_data, {
      client_name: "changed@example.test",
      custom_party: "Changed address",
    });
    assert.deepEqual(request.options.body.signer_role_refs, [{
      role_id: "custom_signer",
      party_ref: "party:changed-client",
    }]);
  } finally { await page.close(); }
});

test("approved readback publishes and exposes only the colon-safe canonical callbacks at 160/320", { timeout: 30_000 }, async () => {
  const matter = "matter:builder:abc123";
  const draftId = "draft:builder:abc123";
  const documentId = "document:builder:abc123";
  const versionId = "version:document:builder:abc123:1";
  const canonical = `matter://${matter}/documents/${documentId}/versions/${versionId}`;
  const page = await open({ contextKey: "item-publish:session-a", matterId: matter });
  try {
    await waitRequests(page, 1);
    await resolveRequest(page, 0, catalog(matter, { approvals: [approval(matter, { approved: true, draft_id: draftId })] })); await waitIdle(page);
    await page.getByTestId("document-publish").click(); await waitRequests(page, 2);
    const request = await page.evaluate(() => window.__requests[1]);
    assert.equal(request.path, `/api/outlook/documents/${encodeURIComponent(draftId)}/publish`);
    assert.deepEqual(Object.keys(request.options.body), ["matter_id", "idempotency_key", "explicit_human_action"]);
    assert.match(request.options.body.idempotency_key, /^outlook-document-publish:[a-f0-9]{64}$/u);
    await rejectRequest(page, 1, { message: "partial", status: 503, payload: publishResult(matter, draftId, documentId, versionId, { partial: true }) });
    await page.getByTestId("document-retry").waitFor();
    assert.equal(await page.getByTestId("document-published-reference").count(), 0);
    await page.getByTestId("document-retry").click(); await waitRequests(page, 3);
    assert.deepEqual(wire(await page.evaluate(() => window.__requests[2])), wire(request));
    await resolveRequest(page, 2, publishResult(matter, draftId, documentId, versionId, { template_id: "foreign-template", template_version: "v99", template_hash: B }));
    await page.getByTestId("document-retry").waitFor(); assert.equal(await page.getByTestId("document-published-reference").count(), 0);
    await page.getByTestId("document-retry").click(); await waitRequests(page, 4); assert.deepEqual(wire(await page.evaluate(() => window.__requests[3])), wire(request));
    await resolveRequest(page, 3, publishResult(matter, draftId, documentId, versionId, { outcome: "idempotent_replay", replayed: true })); await waitIdle(page);
    assert.equal(await page.getByTestId("document-canonical-ref").textContent(), canonical);
    await page.getByTestId("document-canonical-copy").click(); await page.getByTestId("document-canonical-open").click();
    assert.deepEqual(await page.evaluate(() => window.__calls), [["copy", canonical], ["open", canonical]]);
    await page.evaluate(() => { window.__active.contextKey = "stale-item:session-a"; }); await page.getByTestId("document-canonical-copy").click(); await page.getByTestId("document-canonical-open").click();
    assert.equal(await page.evaluate(() => window.__calls.length), 2); await page.evaluate(() => { window.__active.contextKey = "item-publish:session-a"; });
    assert.equal(await page.locator("a[href], [href], [title]").count(), 0);
    assert.doesNotMatch(await page.locator("body").textContent(), /provider|tenant|actor|raw_body|storage|document_bytes/iu);
    if (ARTIFACT_DIR) {
      for (const width of [160, 320]) {
        await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        await page.screenshot({ path: `${ARTIFACT_DIR}/document-feature-${width}.png`, fullPage: true });
      }
    }
    await page.getByTestId("document-merge-field-0").fill("client@example.test");
    await page.getByTestId("document-merge-field-1").fill("123 Main St, Suite 4");
    await page.getByTestId("document-signer-field-0").fill("party:client");
    assert.equal(await page.getByTestId("document-publish").count(), 0);
    await page.getByTestId("document-request-approval").click(); await waitRequests(page, 5);
    await rejectRequest(page, 4, { message: "partial", status: 503, payload: approvalResult(matter, { partial: true }) });
    await page.getByTestId("document-retry").waitFor(); assert.equal(await page.getByTestId("document-publish").count(), 0); assert.equal(await page.getByTestId("document-canonical-ref").textContent(), canonical);
  } finally { await page.close(); }
});

test("send and reconcile use a fresh UUID per user action and preserve exact retries", { timeout: 30_000 }, async () => {
  const page = await open({ contextKey: "item-esign:session-a", matterId: "matter-a" });
  try {
    const sendable = esign("matter-a", "esign-a", { can_send: true });
    const reconcilable = esign("matter-a", "esign-b", { state: "reconciliation_required", can_reconcile: true });
    await waitRequests(page, 1); await resolveRequest(page, 0, catalog("matter-a", { esigns: [sendable, reconcilable] })); await waitIdle(page);
    await page.getByTestId("document-esign-send").click(); await waitRequests(page, 2);
    const send = await page.evaluate(() => window.__requests[1]);
    assert.match(send.options.body.idempotency_key, /^outlook-docusign-send:[a-f0-9]{64}$/u);
    await rejectRequest(page, 1, { message: "network unavailable" }); await page.getByTestId("document-retry").click(); await waitRequests(page, 3);
    assert.deepEqual(wire(await page.evaluate(() => window.__requests[2])), wire(send));
    await resolveRequest(page, 2, actionResult("sent", esign("matter-a", "esign-a", { state: "sent", can_reconcile: true }))); await waitIdle(page);
    await page.getByTestId("document-esign-reconcile").first().click(); await waitRequests(page, 4);
    const reconcile = await page.evaluate(() => window.__requests[3]);
    assert.match(reconcile.options.body.idempotency_key, /^outlook-docusign-reconcile:[a-f0-9]{64}$/u);
    assert.notEqual(reconcile.options.body.idempotency_key, send.options.body.idempotency_key);
    await rejectRequest(page, 3, { message: "ambiguous" }); await page.getByTestId("document-retry").click(); await waitRequests(page, 5);
    assert.deepEqual(wire(await page.evaluate(() => window.__requests[4])), wire(reconcile));
    await resolveRequest(page, 4, actionResult("already_converged", esign("matter-a", "esign-a", { state: "completed" }))); await waitIdle(page);
    assert.equal(await page.getByText("서명 · 완료").count(), 1); assert.equal(await page.getByText("서명 · 상태 확인 필요").count(), 1);
    const uuids = await page.evaluate(() => window.__uuids);
    assert.equal(uuids.length, 2); assert.equal(new Set(uuids).size, 2);
    for (const value of uuids) assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
    await render(page, { contextKey: "item-provider-unavailable:session-a", matterId: "matter-a" }); await waitRequests(page, 6);
    await resolveRequest(page, 5, catalog("matter-a", { esignReady: false })); await waitIdle(page);
    assert.equal(await page.getByTestId("document-partial").textContent(), "일부 문서 상태만 확인됨");
    assert.equal(await page.locator("[data-testid=document-esign-send], [data-testid=document-esign-reconcile]").count(), 0);
    assert.doesNotMatch(await page.locator("body").textContent(), /DocuSign|provider|runtime|DOCUSIGN/iu);
  } finally { await page.close(); }
});

test("offline, context, 401 and unmount fences suppress every late completion", { timeout: 30_000 }, async () => {
  for (const props of [{ ...BASE, omitContextCheck: true }, { ...BASE, omitRequest: true }, { ...BASE, staleContext: true }, { ...BASE, contextKey: "" }, { ...BASE, matterId: "" }, { ...BASE, matterId: "unsafe/matter" }]) {
    const invalid = await open(props); const invalidErrors = []; invalid.on("pageerror", (error) => invalidErrors.push(error.message));
    await invalid.waitForFunction(() => document.querySelector("[data-testid=outlook-document-signing-panel]"));
    assert.equal(await invalid.evaluate(() => window.__requests.length), 0);
    assert.equal(await invalid.getByTestId("document-template-select").isDisabled(), true);
    assert.deepEqual(invalidErrors, []); await invalid.close();
  }

  const page = await open(); const pageErrors = []; page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await waitRequests(page, 1); await resolveRequest(page, 0, catalog("matter-a")); await waitIdle(page);
    await page.getByTestId("document-merge-field-0").fill("보존 값");
    await render(page, { ...BASE, offline: true });
    await page.waitForFunction(() => document.querySelector("[data-testid=document-merge-field-0]")?.disabled === true);
    assert.equal(await page.evaluate(() => window.__requests.length), 1); assert.equal(await page.getByTestId("document-merge-field-0").inputValue(), "보존 값");
    await render(page, BASE); await waitRequests(page, 2);
    assert.equal(await page.getByTestId("document-merge-field-0").inputValue(), "보존 값");
    await resolveRequest(page, 1, catalog("matter-a")); await waitIdle(page);

    await render(page, { contextKey: BASE.contextKey, matterId: "matter-b" }); await waitRequests(page, 3);
    await render(page, { contextKey: "item-b:session-a", matterId: "matter-b" }); await waitRequests(page, 4);
    await render(page, { contextKey: "item-b:session-b", matterId: "matter-b" }); await waitRequests(page, 5);
    await rejectRequest(page, 2, { message: "stale 401 secret", status: 401, safe_error_code: "AUTH_SESSION_REQUIRED" }); await rejectRequest(page, 3, { message: "stale GET secret", status: 503 });
    assert.equal(await page.getByTestId("outlook-document-signing-panel").getAttribute("aria-busy"), "true");
    assert.equal(await page.getByTestId("document-error").count(), 0);
    await resolveRequest(page, 4, catalog("matter-b")); await waitIdle(page);

    await render(page, { contextKey: "item-401:session-b", matterId: "matter-b" }); await waitRequests(page, 6);
    await rejectRequest(page, 5, { message: "session secret", status: 401, safe_error_code: "AUTH_SESSION_REQUIRED" });
    await waitIdle(page);
    assert.equal(await page.getByTestId("document-error").count(), 0); assert.equal((await page.locator("body").textContent()).includes("session secret"), false);
    assert.equal(await page.getByTestId("document-template-select").isDisabled(), true);

    const current = { contextKey: "item-current:session-c", matterId: "matter-b" };
    await render(page, current); await waitRequests(page, 7); await resolveRequest(page, 6, catalog("matter-b")); await waitIdle(page);
    await page.getByTestId("document-merge-field-0").fill("의뢰인"); await page.getByTestId("document-merge-field-1").fill("주소"); await page.getByTestId("document-signer-field-0").fill("party:client");
    await page.getByTestId("document-request-approval").click(); await waitRequests(page, 8);
    await rejectRequest(page, 7, { message: "expired", status: 401, safe_error_code: "AUTH_SESSION_EXPIRED" });
    await waitIdle(page); assert.equal(await page.getByTestId("document-error").count(), 0);
    assert.equal(await page.getByTestId("document-request-approval").isDisabled(), true);

    const closing = { contextKey: "item-close:session-d", matterId: "matter-b" };
    await render(page, closing); await waitRequests(page, 9); await resolveRequest(page, 8, catalog("matter-b")); await waitIdle(page);
    await page.getByTestId("document-merge-field-0").fill("의뢰인"); await page.getByTestId("document-merge-field-1").fill("주소"); await page.getByTestId("document-signer-field-0").fill("party:client");
    await page.getByTestId("document-request-approval").click(); await waitRequests(page, 10);
    await page.evaluate(() => window.__unmount()); await resolveRequest(page, 9, approvalResult("matter-b"));
    await page.waitForFunction(() => document.getElementById("root")?.textContent === "");
    assert.deepEqual(pageErrors, []);
  } finally { await page.close(); }
});
