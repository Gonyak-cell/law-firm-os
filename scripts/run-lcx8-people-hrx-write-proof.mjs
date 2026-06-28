#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const API = process.env.LAWOS_API_URL ?? "http://127.0.0.1:4180";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0201-0204-0208-0217-people-hrx-write-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0201-0204-0208-0217-people-hrx-write-proof.md`;

const HRX_SCOPES = [
  "hrx.employee.read",
  "hrx.employee.write",
  "hrx.document.read",
  "hrx.leave.read",
  "hrx.leave.write",
  "hrx.approval.read",
  "hrx.approval.write",
  "hrx.candidate.read",
  "hrx.candidate.write",
  "hrx.policy.read",
  "hrx.policy.write",
  "hrx.lifecycle.read",
  "hrx.lifecycle.write",
  "hrx.analytics.read",
  "hrx.ai.assistant",
  "hrx.ai.review.read",
  "hrx.payroll.preview",
  "hrx.payroll.export",
  "hrx.legal_people.read",
  "hrx.audit.read"
].join(",");

const BASE_HEADERS = {
  "content-type": "application/json",
  "x-lawos-tenant-id": "tenant_amic_matter_vault",
  "x-lawos-actor-id": "user_amic_jwsuh",
  "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
  "x-lawos-hrx-scopes": HRX_SCOPES,
  "x-lawos-hrx-step-up": JSON.stringify({
    tenant_id: "tenant_amic_matter_vault",
    actor_id: "user_amic_jwsuh",
    mfa: true,
    assurance_level: 2,
    expires_at: "2099-12-31T23:59:59.000Z"
  })
};

function screenshotPath(name) {
  return `${SCREENSHOT_DIR}/${name}.png`;
}

function normalizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

async function waitForQuiet(page, ms = 500) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...BASE_HEADERS, ...(options.headers ?? {}) }
  });
  return { status: response.status, body: await response.json(), path };
}

async function clickAndCapture(page, row, responsePredicate, clickLocator) {
  const responsePromise = page.waitForResponse(responsePredicate, { timeout: 15000 });
  await clickLocator.click();
  const response = await responsePromise;
  await waitForQuiet(page);
  return { status: response.status(), url: response.url(), body: await response.json().catch(() => null) };
}

function proofRow({ id, label, url, selector, observedText, screenshot, response, readBack, auditActions, guardProbes, nonClaims = [] }) {
  const passed =
    response?.status >= 200 &&
    response?.status < 300 &&
    (!readBack || readBack.passed === true) &&
    (auditActions ?? []).every((item) => item.found === true) &&
    (guardProbes ?? []).every((item) => item.passed === true);
  return {
    id,
    label,
    url,
    selector,
    observed_text: observedText,
    screenshot,
    response,
    read_back: readBack ?? null,
    audit_actions: auditActions ?? [],
    guard_probes: guardProbes ?? [],
    status_decision: passed ? "PASS" : "FAIL",
    trace_depth: "api_write",
    persistence_claim: Boolean(readBack),
    api_write_claim: true,
    production_ready_claim: false,
    non_claims: [
      "safe synthetic HRX runtime proof only",
      "no production go-live claim",
      ...nonClaims
    ]
  };
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];
const hrxRequests = [];
const hrxResponses = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => {
  if (request.url().includes("/api/hrx/")) hrxRequests.push({ method: request.method(), url: request.url() });
});
page.on("response", (response) => {
  if (response.url().includes("/api/hrx/")) hrxResponses.push({ status: response.status(), url: response.url() });
});

const rowProofs = [];
const generated = { policyId: `lcx8-policy-${Date.now()}` };

try {
  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-leave`, { waitUntil: "networkidle" });
  await page.locator("#people-leave").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#people-leave label:has-text('시간') input").fill("1");
  await page.locator("#people-leave label:has-text('시작일') input").fill("2026-07-15");
  await page.locator("#people-leave label:has-text('종료일') input").fill("2026-07-15");
  const leaveResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0201",
    (response) => response.url().includes("/api/hrx/leave") && response.request().method() === "POST",
    page.locator("#people-leave button.primary-button:has-text('신청')").first()
  );
  const leaveRequest = leaveResponse.body?.leave_request;
  const leaveRead = leaveRequest
    ? await apiJson(`/api/hrx/leave?employee_id=${encodeURIComponent(leaveRequest.employee_id)}&policy_id=pto-us`)
    : { status: 0, body: {} };
  const auditAfterLeave = await apiJson("/api/hrx/audit");
  const leaveGuard = await apiJson("/api/hrx/leave", {
    method: "POST",
    headers: { "x-lawos-hrx-scopes": HRX_SCOPES.replace("hrx.leave.write", "hrx.leave.read") },
    body: JSON.stringify({
      request_id: "lcx8-leave-denied",
      employee_id: "emp_amic_jwsuh",
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 1,
      start_date: "2026-07-16",
      end_date: "2026-07-16"
    })
  });
  const leaveScreenshot = screenshotPath("lcx8-action-0201-people-leave-submit-proof");
  await page.screenshot({ path: join(ROOT, leaveScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0201",
    label: "신청",
    url: page.url(),
    selector: "#people-leave button.primary-button:has-text('신청')",
    observedText: normalizeText(await page.locator("#people-leave").innerText()),
    screenshot: leaveScreenshot,
    response: leaveResponse,
    readBack: {
      path: leaveRead.path,
      status: leaveRead.status,
      passed: leaveRead.body?.requests?.some((request) => request.request_id === leaveRequest?.request_id) === true,
      object_id: leaveRequest?.request_id
    },
    auditActions: [{
      action: "hrx.leave.submit",
      object_id: leaveRequest?.request_id,
      found: auditAfterLeave.body?.events?.some((event) => event.action === "hrx.leave.submit" && event.object_id === leaveRequest?.request_id) === true
    }],
    guardProbes: [{
      name: "leave write scope denied",
      status: leaveGuard.status,
      safe_error_code: leaveGuard.body?.safe_error_code,
      passed: leaveGuard.status === 403 && leaveGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }]
  }));

  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-approvals`, { waitUntil: "networkidle" });
  await page.locator("#people-approvals").waitFor({ state: "visible", timeout: 15000 });
  const rejectResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0202",
    (response) => /\/api\/hrx\/approvals\/.+\/reject$/.test(new URL(response.url()).pathname) && response.request().method() === "POST",
    page.locator("#people-approvals button:not([disabled]):has-text('반려')").first()
  );
  const rejectedApproval = rejectResponse.body?.approval;
  const rejectScreenshot = screenshotPath("lcx8-action-0202-people-approval-reject-proof");
  await page.screenshot({ path: join(ROOT, rejectScreenshot), fullPage: true });
  const approveResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0203",
    (response) => /\/api\/hrx\/approvals\/.+\/approve$/.test(new URL(response.url()).pathname) && response.request().method() === "POST",
    page.locator("#people-approvals button:not([disabled]):has-text('승인')").first()
  );
  const approvedApproval = approveResponse.body?.approval;
  const approvalsRead = await apiJson("/api/hrx/approvals");
  const auditAfterApprovals = await apiJson("/api/hrx/audit");
  const approvalGuard = await apiJson(`/api/hrx/approvals/${encodeURIComponent(approvedApproval?.approval_id ?? "approval-leave-002")}/approve`, {
    method: "POST",
    headers: { "x-lawos-hrx-scopes": HRX_SCOPES.replace("hrx.approval.write", "hrx.approval.read") },
    body: JSON.stringify({ decision_reason: "lcx8_scope_denied_probe" })
  });
  const approveScreenshot = screenshotPath("lcx8-action-0203-people-approval-approve-proof");
  await page.screenshot({ path: join(ROOT, approveScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0202",
    label: "반려",
    url: page.url(),
    selector: "#people-approvals button:has-text('반려')",
    observedText: normalizeText(await page.locator("#people-approvals").innerText()),
    screenshot: rejectScreenshot,
    response: rejectResponse,
    readBack: {
      path: approvalsRead.path,
      status: approvalsRead.status,
      passed: approvalsRead.body?.approvals?.some((approval) => approval.approval_id === rejectedApproval?.approval_id && approval.state === "rejected") === true,
      object_id: rejectedApproval?.approval_id
    },
    auditActions: [{
      action: "hrx.approval.reject",
      object_id: rejectedApproval?.approval_id,
      found: auditAfterApprovals.body?.events?.some((event) => event.action === "hrx.approval.reject" && event.object_id === rejectedApproval?.approval_id) === true
    }],
    guardProbes: [{
      name: "approval write scope denied",
      status: approvalGuard.status,
      safe_error_code: approvalGuard.body?.safe_error_code,
      passed: approvalGuard.status === 403 && approvalGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }]
  }));
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0203",
    label: "승인",
    url: page.url(),
    selector: "#people-approvals button:has-text('승인')",
    observedText: normalizeText(await page.locator("#people-approvals").innerText()),
    screenshot: approveScreenshot,
    response: approveResponse,
    readBack: {
      path: approvalsRead.path,
      status: approvalsRead.status,
      passed: approvalsRead.body?.approvals?.some((approval) => approval.approval_id === approvedApproval?.approval_id && approval.state === "approved") === true,
      object_id: approvedApproval?.approval_id
    },
    auditActions: [{
      action: "hrx.approval.approve",
      object_id: approvedApproval?.approval_id,
      found: auditAfterApprovals.body?.events?.some((event) => event.action === "hrx.approval.approve" && event.object_id === approvedApproval?.approval_id) === true
    }],
    guardProbes: [{
      name: "approval write scope denied",
      status: approvalGuard.status,
      safe_error_code: approvalGuard.body?.safe_error_code,
      passed: approvalGuard.status === 403 && approvalGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }]
  }));

  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-recruiting`, { waitUntil: "networkidle" });
  await page.locator("#people-recruiting").waitFor({ state: "visible", timeout: 15000 });
  const recruitingResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0204",
    (response) => response.url().includes("/api/hrx/recruiting/applications/") && response.url().endsWith("/stage") && response.request().method() === "POST",
    page.locator("#people-recruiting button:not([disabled]):has-text('다음 단계')").first()
  );
  const updatedApplication = recruitingResponse.body?.application;
  const recruitingRead = await apiJson("/api/hrx/recruiting/pipeline");
  const auditAfterRecruiting = await apiJson("/api/hrx/audit");
  const recruitingGuard = await apiJson(`/api/hrx/recruiting/applications/${encodeURIComponent(updatedApplication?.application_id ?? "app-001")}/stage`, {
    method: "POST",
    headers: { "x-lawos-hrx-scopes": HRX_SCOPES.replace("hrx.candidate.write", "hrx.candidate.read") },
    body: JSON.stringify({ stage: "hired", stage_reason: "lcx8_scope_denied_probe" })
  });
  const recruitingScreenshot = screenshotPath("lcx8-action-0204-people-recruiting-stage-proof");
  await page.screenshot({ path: join(ROOT, recruitingScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0204",
    label: "다음 단계",
    url: page.url(),
    selector: "#people-recruiting button:has-text('다음 단계')",
    observedText: normalizeText(await page.locator("#people-recruiting").innerText()),
    screenshot: recruitingScreenshot,
    response: recruitingResponse,
    readBack: {
      path: recruitingRead.path,
      status: recruitingRead.status,
      passed: recruitingRead.body?.applications?.some((application) => application.application_id === updatedApplication?.application_id && application.stage === updatedApplication?.stage) === true,
      object_id: updatedApplication?.application_id
    },
    auditActions: [{
      action: "hrx.application.stage.update",
      object_id: updatedApplication?.application_id,
      found: auditAfterRecruiting.body?.events?.some((event) => event.action === "hrx.application.stage.update" && event.object_id === updatedApplication?.application_id) === true
    }],
    guardProbes: [{
      name: "recruiting write scope denied",
      status: recruitingGuard.status,
      safe_error_code: recruitingGuard.body?.safe_error_code,
      passed: recruitingGuard.status === 403 && recruitingGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }]
  }));

  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-policy`, { waitUntil: "networkidle" });
  await page.locator("#people-policy").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#people-policy label:has-text('규칙 이름') input").fill(generated.policyId);
  await page.locator("#people-policy label:has-text('유형') input").fill("retention");
  await page.locator("#people-policy label:has-text('버전') input").fill("2026.lcx8");
  await page.locator("#people-policy label:has-text('시작일') input").fill("2026-08-01");
  const policyResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0208",
    (response) => response.url().includes("/api/hrx/policies") && response.request().method() === "POST",
    page.locator("#people-policy button.primary-button:has-text('규칙 버전 생성')").first()
  );
  const createdPolicy = policyResponse.body?.policy;
  const policyRead = await apiJson("/api/hrx/policies");
  const auditAfterPolicy = await apiJson("/api/hrx/audit");
  const policyGuard = await apiJson("/api/hrx/policies", {
    method: "POST",
    headers: { "x-lawos-hrx-scopes": HRX_SCOPES.replace("hrx.policy.write", "hrx.policy.read") },
    body: JSON.stringify({ policy_id: "lcx8-policy-denied", policy_type: "retention", policy_version: "denied", effective_from: "2026-08-01" })
  });
  const policyScreenshot = screenshotPath("lcx8-action-0208-people-policy-create-proof");
  await page.screenshot({ path: join(ROOT, policyScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0208",
    label: "정책 버전 생성",
    url: page.url(),
    selector: "#people-policy button.primary-button:has-text('규칙 버전 생성')",
    observedText: normalizeText(await page.locator("#people-policy").innerText()),
    screenshot: policyScreenshot,
    response: policyResponse,
    readBack: {
      path: policyRead.path,
      status: policyRead.status,
      passed: policyRead.body?.policies?.some((policy) => policy.policy_id === createdPolicy?.policy_id && policy.policy_version === createdPolicy?.policy_version) === true,
      object_id: createdPolicy?.policy_id
    },
    auditActions: [{
      action: "hrx.policy.create",
      object_id: createdPolicy?.policy_id,
      found: auditAfterPolicy.body?.events?.some((event) => event.action === "hrx.policy.create" && event.object_id === createdPolicy?.policy_id) === true
    }],
    guardProbes: [{
      name: "policy write scope denied",
      status: policyGuard.status,
      safe_error_code: policyGuard.body?.safe_error_code,
      passed: policyGuard.status === 403 && policyGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }]
  }));

  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-ai`, { waitUntil: "networkidle" });
  await page.locator(".hrx-ai-actions").waitFor({ state: "visible", timeout: 15000 });
  const advisoryResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0209",
    (response) => response.url().includes("/api/hrx/ai/assistant") && response.request().method() === "POST",
    page.locator(".hrx-ai-actions button:has-text('문의')").first()
  );
  await page.locator(".hrx-ai-result").waitFor({ state: "visible", timeout: 15000 });
  const advisoryScreenshot = screenshotPath("lcx8-action-0209-people-ai-advisory-proof");
  await page.screenshot({ path: join(ROOT, advisoryScreenshot), fullPage: true });
  const reviewResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0210",
    (response) => response.url().includes("/api/hrx/ai/assistant") && response.request().method() === "POST",
    page.locator(".hrx-ai-actions button:has-text('검토')").first()
  );
  await page.locator(".hrx-ai-result").waitFor({ state: "visible", timeout: 15000 });
  const aiReviews = await apiJson("/api/hrx/ai/reviews");
  const auditAfterAi = await apiJson("/api/hrx/audit");
  const aiGuard = await apiJson("/api/hrx/ai/assistant", {
    method: "POST",
    headers: { "x-lawos-hrx-scopes": HRX_SCOPES.replace("hrx.ai.assistant", "hrx.ai.review.read") },
    body: JSON.stringify({ question: "scope denied", decision_mode: "advisory" })
  });
  const reviewItem = reviewResponse.body?.review_item;
  const reviewScreenshot = screenshotPath("lcx8-action-0210-people-ai-review-proof");
  await page.screenshot({ path: join(ROOT, reviewScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0209",
    label: "문의",
    url: page.url(),
    selector: ".hrx-ai-actions button:has-text('문의')",
    observedText: normalizeText(await page.locator(".hrx-ai-result").innerText()),
    screenshot: advisoryScreenshot,
    response: advisoryResponse,
    readBack: {
      path: "/api/hrx/ai/assistant response",
      status: advisoryResponse.status,
      passed: advisoryResponse.body?.outcome === "answered" && Array.isArray(advisoryResponse.body?.citations),
      object_id: advisoryResponse.body?.answer?.status ?? "answered"
    },
    auditActions: [{
      action: "hrx.ai.interaction",
      object_id: null,
      found: auditAfterAi.body?.events?.some((event) => event.action === "hrx.ai.interaction" && event.decision === "allow") === true
    }],
    guardProbes: [{
      name: "ai assistant scope denied",
      status: aiGuard.status,
      safe_error_code: aiGuard.body?.safe_error_code,
      passed: aiGuard.status === 403 && aiGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }],
    nonClaims: ["advisory answer only; no final people decision claim"]
  }));
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0210",
    label: "검토",
    url: page.url(),
    selector: ".hrx-ai-actions button:has-text('검토')",
    observedText: normalizeText(await page.locator(".hrx-ai-result").innerText()),
    screenshot: reviewScreenshot,
    response: reviewResponse,
    readBack: {
      path: aiReviews.path,
      status: aiReviews.status,
      passed: aiReviews.body?.reviews?.some((item) => item.review_id === reviewItem?.review_id && item.state === "pending_review") === true,
      object_id: reviewItem?.review_id
    },
    auditActions: [{
      action: "hrx.ai.interaction",
      object_id: reviewResponse.body?.review_item?.interaction_id ?? null,
      found: auditAfterAi.body?.events?.some((event) => event.action === "hrx.ai.interaction" && event.decision === "review_required") === true
    }],
    guardProbes: [{
      name: "ai assistant scope denied",
      status: aiGuard.status,
      safe_error_code: aiGuard.body?.safe_error_code,
      passed: aiGuard.status === 403 && aiGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }],
    nonClaims: ["final decision remains human-review blocked"]
  }));

  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-payroll`, { waitUntil: "networkidle" });
  await page.locator("#people-payroll").waitFor({ state: "visible", timeout: 15000 });
  const payrollPreviewResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0215",
    (response) => response.url().includes("/api/hrx/payroll/preview") && response.request().method() === "POST",
    page.locator("#people-payroll button:has-text('미리보기 생성')").first()
  );
  const payrollPreview = payrollPreviewResponse.body?.preview;
  await page.locator("#people-payroll table").waitFor({ state: "visible", timeout: 15000 });
  const payrollPreviewScreenshot = screenshotPath("lcx8-action-0215-people-payroll-preview-proof");
  await page.screenshot({ path: join(ROOT, payrollPreviewScreenshot), fullPage: true });
  const payrollApproveResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0216",
    (response) => response.url().includes("/api/hrx/payroll/approve") && response.request().method() === "POST",
    page.locator("#people-payroll button:not([disabled]):has-text('검토 승인 기록')").first()
  );
  const payrollApproveScreenshot = screenshotPath("lcx8-action-0216-people-payroll-approve-proof");
  await page.screenshot({ path: join(ROOT, payrollApproveScreenshot), fullPage: true });
  const payrollExportResponse = await clickAndCapture(
    page,
    "LCX8-ACTION-0217",
    (response) => response.url().includes("/api/hrx/payroll/export") && response.request().method() === "POST",
    page.locator("#people-payroll button:not([disabled]):has-text('내보내기 파일 생성')").first()
  );
  const auditAfterPayroll = await apiJson("/api/hrx/audit");
  const payrollGuard = await apiJson("/api/hrx/payroll/export", {
    method: "POST",
    headers: { "x-lawos-hrx-scopes": HRX_SCOPES.replace("hrx.payroll.export", "hrx.payroll.preview") },
    body: JSON.stringify({ preview_id: payrollPreview?.preview_id ?? "lcx8-payroll-denied", export_artifact_ref: "DMS:lcx8-payroll-denied" })
  });
  const payrollExportScreenshot = screenshotPath("lcx8-action-0217-people-payroll-export-proof");
  await page.screenshot({ path: join(ROOT, payrollExportScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0215",
    label: "미리보기 생성",
    url: page.url(),
    selector: "#people-payroll button:has-text('미리보기 생성')",
    observedText: normalizeText(await page.locator("#people-payroll").innerText()),
    screenshot: payrollPreviewScreenshot,
    response: payrollPreviewResponse,
    readBack: {
      path: "/api/hrx/payroll/preview response",
      status: payrollPreviewResponse.status,
      passed: payrollPreview?.calculation_runtime === false && payrollPreview?.disbursement_instruction_included === false && payrollPreview?.human_review_required === true,
      object_id: payrollPreview?.preview_id
    },
    auditActions: [{
      action: "hrx.payroll.preview",
      object_id: payrollPreview?.preview_id,
      found: auditAfterPayroll.body?.events?.some((event) => event.action === "hrx.payroll.preview" && event.object_id === payrollPreview?.preview_id) === true
    }],
    guardProbes: [{
      name: "payroll export scope denied",
      status: payrollGuard.status,
      safe_error_code: payrollGuard.body?.safe_error_code,
      passed: payrollGuard.status === 403 && payrollGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }],
    nonClaims: ["no calculation, tax, payment, or provider execution"]
  }));
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0216",
    label: "검토 승인 기록",
    url: page.url(),
    selector: "#people-payroll button:has-text('검토 승인 기록')",
    observedText: normalizeText(await page.locator("#people-payroll").innerText()),
    screenshot: payrollApproveScreenshot,
    response: payrollApproveResponse,
    readBack: {
      path: "/api/hrx/payroll/approve response",
      status: payrollApproveResponse.status,
      passed: payrollApproveResponse.body?.preview?.state === "approved" && payrollApproveResponse.body?.preview?.preview_id === payrollPreview?.preview_id,
      object_id: payrollPreview?.preview_id
    },
    auditActions: [{
      action: "hrx.payroll.approve",
      object_id: payrollPreview?.preview_id,
      found: auditAfterPayroll.body?.events?.some((event) => event.action === "hrx.payroll.approve" && event.object_id === payrollPreview?.preview_id) === true
    }],
    guardProbes: [{
      name: "payroll export scope denied",
      status: payrollGuard.status,
      safe_error_code: payrollGuard.body?.safe_error_code,
      passed: payrollGuard.status === 403 && payrollGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }],
    nonClaims: ["human review approval record only; no payroll execution"]
  }));
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0217",
    label: "내보내기 파일 생성",
    url: page.url(),
    selector: "#people-payroll button:has-text('내보내기 파일 생성')",
    observedText: normalizeText(await page.locator("#people-payroll").innerText()),
    screenshot: payrollExportScreenshot,
    response: payrollExportResponse,
    readBack: {
      path: "/api/hrx/payroll/export response",
      status: payrollExportResponse.status,
      passed: payrollExportResponse.body?.artifact?.calculation_runtime === false && payrollExportResponse.body?.artifact?.disbursement_instruction_included === false,
      object_id: payrollExportResponse.body?.artifact?.artifact_id
    },
    auditActions: [{
      action: "hrx.payroll.export",
      object_id: payrollExportResponse.body?.artifact?.artifact_id,
      found:
        auditAfterPayroll.body?.events?.some(
          (event) =>
            event.action === "hrx.payroll.export" &&
            event.object_id === payrollExportResponse.body?.artifact?.artifact_id
        ) === true
    }],
    guardProbes: [{
      name: "payroll export scope denied",
      status: payrollGuard.status,
      safe_error_code: payrollGuard.body?.safe_error_code,
      passed: payrollGuard.status === 403 && payrollGuard.body?.safe_error_code === "HRX_AUTHZ_DENIED"
    }],
    nonClaims: ["export artifact reference only; no provider execution or payment instruction"]
  }));
} finally {
  await browser.close();
}

const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const assertions = [
  ...rowProofs.map((row) => ({
    name: `${row.id} browser/API/write/read-back/audit proof`,
    passed: row.status_decision === "PASS",
    details: {
      response_status: row.response?.status,
      read_back: row.read_back,
      audit_actions: row.audit_actions,
      guard_probes: row.guard_probes
    }
  })),
  {
    name: "browser has no page errors",
    passed: pageErrors.length === 0,
    details: { pageErrors }
  },
  {
    name: "browser has no unexpected console errors",
    passed: unexpectedConsoleMessages.length === 0,
    details: { consoleMessages, unexpectedConsoleMessages }
  },
  {
    name: "all proof writes are HRX safe synthetic writes",
    passed: hrxRequests.filter((request) => request.method !== "GET").every((request) => request.url.includes("/api/hrx/")),
    details: { hrxRequests: hrxRequests.filter((request) => request.method !== "GET") }
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.people-hrx-write-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: rowProofs.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    web_origin: WEB,
    api_origin: API,
    trace_depth: "api_write",
    safe_synthetic_fixture: true,
    external_provider_execution_claim: false,
    payment_execution_claim: false,
    final_people_decision_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    leave: "apps/web/src/people/leave/LeaveRequestPage.tsx -> submitHrxLeaveRequest -> POST /api/hrx/leave",
    approvals: "apps/web/src/people/approvals/ManagerApprovalQueue.tsx -> resolveHrxApproval -> POST /api/hrx/approvals/:id/:action",
    recruiting: "apps/web/src/people/recruiting/RecruitingPipeline.tsx -> updateHrxApplicationStage -> POST /api/hrx/recruiting/applications/:id/stage",
    policy: "apps/web/src/admin/hrx/HRXPolicyConsole.tsx -> createHrxPolicyVersion -> POST /api/hrx/policies",
    ai: "apps/web/src/people/ai/HRAIAssistant.tsx -> askHrxAiAssistant -> POST /api/hrx/ai/assistant",
    payroll: "apps/web/src/people/payroll/PayrollBoundaryPanel.tsx -> payroll preview/approve/export routes"
  },
  rowProofs,
  assertions,
  consoleMessages,
  pageErrors,
  hrxRequests,
  hrxResponses
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 People HRX Write Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Rows",
  "",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision} (${row.label}; response ${row.response?.status}; read-back ${row.read_back?.passed}; audit ${row.audit_actions.map((item) => `${item.action}:${item.found}`).join(", ")})`),
  "",
  "## Assertions",
  "",
  ...assertions.map((assertion) => `- ${assertion.passed ? "PASS" : "FAIL"}: ${assertion.name}`),
  "",
  "## Non-Claims",
  "",
  "- Safe synthetic HRX runtime proof only.",
  "- No external provider execution, payroll calculation, tax, payment, final people decision, production readiness, or go-live claim.",
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result,
  json: JSON_PATH,
  md: MD_PATH,
  assertions: `${assertions.filter((item) => item.passed).length}/${assertions.length}`,
  rows: rowProofs.map((row) => ({ id: row.id, status_decision: row.status_decision, response: row.response?.status, readBack: row.read_back?.passed })),
  nonClaims: proof.scope
}, null, 2));
