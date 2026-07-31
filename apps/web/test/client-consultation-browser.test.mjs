import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = resolve(webRoot, "../../.omo/evidence/client-consultation");
const tenantId = "tenant_client_consultation_browser";
const userId = "user_client_consultation_browser";
const inquiryId = "lead-consultation-browser";
const opportunityId = "opp-consultation-browser";

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function genericCollection(pathname) {
  return {
    request_id: `ui-test-${pathname.replace(/[^a-z0-9]+/giu, "-")}`,
    outcome: "passed",
    ui_state: "empty",
    items: [],
    page_info: { returned_count: 0, omitted_item_count: null, next_cursor: null },
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function inquirySummary(version = 7, decision = "pending", workflowStatus = "in_progress") {
  return {
    tenant_id: tenantId,
    lead_id: inquiryId,
    version,
    display_name: "한빛 제조",
    visible_status: "new",
    visible_status_label: "새 문의",
    source: "manual",
    received_at: "2026-07-31T01:00:00.000Z",
    assigned_user_id: userId,
    next_action: "상담 준비",
    opportunity_id: opportunityId,
    engagement_decision: decision,
    engagement_workflow_status: workflowStatus
  };
}

function inquiryDetail(state) {
  const summary = inquirySummary(state.inquiryVersion, state.decision, state.workflowStatus);
  return {
    outcome: "passed",
    data_status: "complete",
    item: {
      ...summary,
      opportunity: {
        opportunity_id: opportunityId,
        stage: "qualified",
        engagement_decision: state.decision,
        engagement_decision_version: state.engagementVersion,
        engagement_workflow_id: "workflow-consultation-browser",
        engagement_workflow_status: state.workflowStatus,
        direct_matter_reference_included: false,
        production_ready_claim: false
      },
      consultations_access: "allowed",
      consultations: [],
      evidence: {
        access: "allowed",
        source_status: "complete",
        items: [],
        page_info: { returned_count: 0, omitted_item_count: null },
        count_leak_prevented: true
      }
    },
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete",
      email_evidence: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: []
  };
}

function activity({
  id,
  kind = "consultation",
  version = 3,
  subject = "계약 검토 초기 상담",
  lead = inquiryId,
  scheduledStart = "2026-07-31T04:00:00.000Z",
  scheduledEnd = "2026-07-31T05:00:00.000Z",
  completedAt = null,
  outcome = null,
  nextAction = "상담 준비",
  outlookState = "not_created"
} = {}) {
  const confidential = false;
  return {
    tenant_id: tenantId,
    crm_activity_id: id,
    resource_id: id,
    activity_kind: kind,
    activity_type: kind === "consultation" ? "meeting" : "note",
    subject,
    confidential,
    confidential_subject_included: !confidential,
    confidential_details_included: true,
    version,
    lead_id: lead,
    opportunity_id: kind === "consultation" ? opportunityId : null,
    party_display_name: "한빛 제조",
    scheduled_start: kind === "consultation" ? scheduledStart : null,
    scheduled_end: kind === "consultation" ? scheduledEnd : null,
    timezone: kind === "consultation" ? "Asia/Seoul" : null,
    completed_at: kind === "consultation" ? completedAt : null,
    outcome: kind === "consultation" ? outcome : null,
    next_action: kind === "consultation" ? nextAction : null,
    outlook_calendar: kind === "consultation"
      ? {
        state: outlookState,
        automatic_sync_enabled: false,
        provider_event_identifier_included: false,
        transaction_identifier_included: false,
        web_link: null,
        created_at: null,
        mailbox_scope: "me"
      }
      : null,
    status: completedAt ? "completed" : "active",
    occurred_at: null,
    created_at: "2026-07-31T00:00:00.000Z",
    updated_at: "2026-07-31T00:00:00.000Z",
    direct_matter_reference_included: false,
    production_ready_claim: false
  };
}

function activitiesBody(items) {
  return {
    outcome: "passed",
    ui_state: null,
    items,
    page_info: { returned_count: items.length, omitted_item_count: null },
    safe_error_codes: [],
    audit_hint_ref: "ui_cmp_g6_crm_activity_read_probe",
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function commandInquiry(version, nextAction = "상담 준비") {
  return { tenant_id: tenantId, lead_id: inquiryId, version, next_action: nextAction };
}

function commandActivity(item, inquiryVersion) {
  return {
    outcome: "updated",
    ui_state: null,
    item,
    inquiry: commandInquiry(inquiryVersion),
    safe_error_codes: [],
    audit_event: { action: "crm_activity_updated", decision: null },
    production_ready_claim: false,
    automatic_matter_creation: false,
    direct_matter_reference_included: false
  };
}

function engagementCommand(state, repairRequired = false) {
  const status = repairRequired ? "repair_required" : "completed";
  const safeCode = repairRequired ? "FEE_COMMITMENT_RETRY_REQUIRED" : null;
  const processing = {
    tenant_id: tenantId,
    engagement_workflow_id: "workflow-consultation-browser",
    lead_id: inquiryId,
    opportunity_id: opportunityId,
    decision: "accepted",
    workflow_status: status,
    workflow_version: state.workflowVersion,
    completed_steps: ["decision_recorded"],
    failed_step: repairRequired ? "fee_commitment_created" : null,
    safe_error_code: safeCode,
    engagement_decision_version: state.engagementVersion,
    automatic_matter_creation: false
  };
  return {
    outcome: repairRequired ? "repair_required" : "updated",
    ui_state: null,
    item: {
      tenant_id: tenantId,
      resource_id: opportunityId,
      opportunity_id: opportunityId,
      stage: "qualified",
      engagement_decision: "accepted",
      engagement_decision_version: state.engagementVersion,
      engagement_workflow_id: "workflow-consultation-browser",
      engagement_workflow_status: status,
      direct_matter_reference_included: false,
      production_ready_claim: false
    },
    inquiry: commandInquiry(state.inquiryVersion, "수임 확정 후 Matter 개설 검토"),
    processing,
    automatic_matter_creation: false,
    direct_matter_reference_included: false,
    safe_error_codes: repairRequired ? [safeCode] : [],
    audit_event: { action: "engagement_decision_recorded", decision: "accepted" }
  };
}

test("CL-P5-W02-T05 상담 일정·수임 결정·접촉 메모는 선택 맥락과 안전한 명령 계약을 지킨다", async () => {
  await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = {
    inquiryVersion: 7,
    engagementVersion: 1,
    workflowVersion: 3,
    decision: "pending",
    workflowStatus: "in_progress",
    consultation: activity({ id: "consultation-browser-1" }),
    memo: activity({ id: "memo-browser-1", kind: null, subject: "초기 문의 확인 메모" }),
    newMemo: null,
    nextConsultation: null,
    outlookAttempts: 0,
    requests: [],
    commandBodies: []
  };

  await page.addInitScript(({ expiresAt }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_consultation_browser",
      expires_at: expiresAt,
      session: { user_id: "user_client_consultation_browser", tenant_id: "tenant_client_consultation_browser" }
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify({
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session_client_consultation_browser",
      source: "api_signed_session",
      actor_ref: "user_client_consultation_browser",
      tenant_refs: {
        default: "tenant_client_consultation_browser",
        client: "tenant_client_consultation_browser",
        matter: "tenant_client_consultation_browser",
        vault: "tenant_client_consultation_browser",
        crm: "tenant_client_consultation_browser"
      },
      role_ids: ["crm_operator"],
      scopes: ["crm.inquiry.read", "crm.activity.read", "crm.activity.write"],
      review_state: "allow",
      expires_at: expiresAt
    }));
  }, { expiresAt: "2099-01-01T00:00:00.000Z" });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const method = request.method();
    const body = method === "GET" ? null : (() => {
      try { return request.postDataJSON(); } catch { return null; }
    })();
    state.requests.push({ method, pathname: url.pathname, search: url.search });
    if (url.pathname === "/api/crm/inquiries" && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        outcome: "passed",
        ui_state: null,
        data_status: "complete",
        items: [inquirySummary(state.inquiryVersion, state.decision, state.workflowStatus)],
        page_info: { returned_count: 1, omitted_item_count: null },
        source_status: { crm_consultations: "complete", crm_leads: "complete", crm_opportunities: "complete" },
        permission_filter_applied: true,
        count_leak_prevented: true,
        safe_error_codes: []
      }) });
    }
    if (url.pathname === `/api/crm/inquiries/${inquiryId}` && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(inquiryDetail(state)) });
    }
    if (url.pathname === "/api/crm/activities" && method === "GET") {
      const items = [state.consultation, state.memo, state.newMemo, state.nextConsultation].filter(Boolean);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activitiesBody(items)) });
    }
    if (url.pathname === `/api/crm/inquiries/${inquiryId}/consultations` && method === "POST") {
      state.commandBodies.push({ route: url.pathname, body });
      assert.equal(body?.expected_inquiry_version, 7);
      assert.equal(body?.consultation?.timezone, "Asia/Seoul");
      assert.equal(body?.consultation?.subject, "계약 검토 후속 상담");
      assert.equal(body?.consultation?.matter_id, undefined);
      state.nextConsultation = activity({ id: "consultation-browser-2", version: 1, subject: "계약 검토 후속 상담", scheduledStart: body.consultation.scheduled_start, scheduledEnd: body.consultation.scheduled_end });
      state.inquiryVersion += 1;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        outcome: "scheduled",
        ui_state: null,
        item: state.nextConsultation,
        inquiry: commandInquiry(state.inquiryVersion, "상담 후속 조치"),
        safe_error_codes: [],
        audit_event: { action: "crm_consultation_scheduled", decision: null },
        idempotent_replay: false,
        production_ready_claim: false,
        automatic_matter_creation: false,
        direct_matter_reference_included: false
      }) });
    }
    if (url.pathname === "/api/crm/activities/consultation-browser-1" && method === "PATCH") {
      state.commandBodies.push({ route: url.pathname, body });
      assert.equal(body?.field_updates?.matter_id, undefined);
      const updates = body?.field_updates ?? {};
      if (updates.scheduled_start) state.consultation.scheduled_start = updates.scheduled_start;
      if (updates.scheduled_end) state.consultation.scheduled_end = updates.scheduled_end;
      if (updates.timezone) state.consultation.timezone = updates.timezone;
      if (updates.completed_at) state.consultation.completed_at = updates.completed_at;
      if (updates.outcome) state.consultation.outcome = updates.outcome;
      if (updates.next_action) state.consultation.next_action = updates.next_action;
      state.consultation = { ...state.consultation, version: state.consultation.version + 1, updated_at: "2026-07-31T02:00:00.000Z" };
      if (updates.completed_at) state.inquiryVersion += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commandActivity(state.consultation, state.inquiryVersion)) });
    }
    if (url.pathname === "/api/crm/consultations/consultation-browser-1/outlook-event" && method === "POST") {
      state.commandBodies.push({ route: url.pathname, body });
      state.outlookAttempts += 1;
      if (state.outlookAttempts === 1) {
        await route.abort("failed");
        return;
      }
      state.consultation = { ...state.consultation, version: state.consultation.version + 1, outlook_calendar: { ...state.consultation.outlook_calendar, state: "linked", web_link: "https://outlook.office.com/calendar/item/consultation-browser-1", created_at: "2026-07-31T02:30:00.000Z" } };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        outcome: "linked",
        ui_state: null,
        item: {
          ...activity({ id: "consultation-browser-1", version: state.consultation.version, scheduledStart: state.consultation.scheduledStart, scheduledEnd: state.consultation.scheduledEnd, completedAt: state.consultation.completedAt, outcome: state.consultation.outcome, nextAction: state.consultation.nextAction, outlookState: "linked" }),
          outlook_calendar: { ...state.consultation.outlook_calendar, state: "linked", web_link: "https://outlook.office.com/calendar/item/consultation-browser-1", created_at: "2026-07-31T02:30:00.000Z" }
        },
        provider_call_executed: true,
        credential_material_included: false,
        production_ready_claim: false,
        direct_matter_reference_included: false,
        safe_error_codes: [],
        audit_event: { action: "outlook_event_linked", decision: null }
      }) });
    }
    if (url.pathname === "/api/crm/activities/consultation-browser-1" && method === "PATCH" && body?.field_updates?.completed_at) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commandActivity(state.consultation, state.inquiryVersion)) });
    }
    if (url.pathname === `/api/crm/inquiries/${inquiryId}/engagement-decisions` && method === "POST") {
      state.commandBodies.push({ route: url.pathname, body });
      assert.equal(body?.expected_inquiry_version, state.inquiryVersion);
      assert.equal(body?.expected_engagement_version, state.engagementVersion);
      assert.equal(body?.agreed_amount, undefined);
      assert.equal(body?.amount_unknown_confirmed, true);
      assert.equal(body?.matter_id, undefined);
      state.decision = "accepted";
      state.workflowStatus = "repair_required";
      state.workflowVersion += 1;
      state.inquiryVersion += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(engagementCommand(state, true)) });
    }
    if (url.pathname === `/api/crm/inquiries/${inquiryId}/engagement-repair` && method === "POST") {
      state.commandBodies.push({ route: url.pathname, body });
      assert.equal(body?.expected_workflow_version, state.workflowVersion);
      state.workflowStatus = "completed";
      state.workflowVersion += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(engagementCommand(state, false)) });
    }
    if (url.pathname === "/api/crm/activities" && method === "POST") {
      state.commandBodies.push({ route: url.pathname, body });
      assert.equal(body?.activity?.lead_id, inquiryId);
      assert.equal(body?.activity?.party_id, undefined);
      assert.equal(body?.activity?.opportunity_id, undefined);
      assert.equal(body?.activity?.matter_id, undefined);
      state.newMemo = activity({ id: "memo-browser-2", kind: null, subject: body.activity.subject });
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        outcome: "created",
        ui_state: null,
        item: state.newMemo,
        safe_error_codes: [],
        audit_event: { action: "crm_contact_memo_created", decision: null },
        idempotent_replay: false,
        production_ready_claim: false,
        direct_matter_reference_included: false,
        automatic_matter_creation: false
      }) });
    }
    if (url.pathname === "/api/profile/me") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "passed", ui_state: null, item: { display_name: "상담 테스트" }, safe_error_codes: [], count_leak_prevented: true }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(genericCollection(url.pathname)) });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow&tab=all#client-consultation-proposals`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-client-consultation-surface="true"]').waitFor();
    assert.equal(await page.locator('[data-client-consultation-row="true"]').count(), 1);
    assert.equal(await page.locator('[data-client-consultation-detail="true"]').count(), 0);
    await page.getByLabel("고객·상담 검색").fill("초기");
    await page.waitForFunction(() => new URL(location.href).searchParams.get("consultation_query") === "초기");
    assert.equal(new URL(page.url()).searchParams.get("query"), null);
    await page.getByLabel("고객·상담 검색").fill("");
    await page.locator('[data-client-consultation-row="true"]').first().click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("consultation_id") === "consultation-browser-1");
    await page.locator('[data-client-consultation-detail="true"]').waitFor();
    assert.match(await page.locator('[data-client-consultation-detail="true"]').innerText(), /상태\s+상담 예정/);
    assert.equal(await page.getByRole("button", { name: "상담 상세 닫기", exact: true }).evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press("Escape");
    await page.locator('[data-client-consultation-detail="true"]').waitFor({ state: "hidden" });
    assert.equal(await page.locator('[data-client-consultation-row="true"]').first().evaluate((element) => document.activeElement === element), true);
    await page.locator('[data-client-consultation-row="true"]').first().click();
    await page.getByLabel("문의 선택").selectOption(inquiryId);
    await page.getByLabel("상담 제목").fill("계약 검토 후속 상담");
    await page.getByLabel("시작", { exact: true }).fill("2026-08-01T10:00");
    await page.getByLabel("종료", { exact: true }).fill("2026-08-01T11:00");
    await page.getByRole("button", { name: "상담 일정 등록", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "상담 일정이 기록되었습니다" }).waitFor();
    assert.equal(state.commandBodies.find(({ route }) => route.endsWith("/consultations"))?.body?.consultation?.lead_id, undefined);
    await page.getByLabel("새 시작").fill("2026-08-01T12:00");
    await page.getByLabel("새 종료").fill("2026-08-01T13:00");
    await page.getByRole("button", { name: "일정 변경", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "상담 일정을 변경했습니다" }).waitFor();
    await page.getByRole("button", { name: "Outlook 연결", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Outlook 일정 연결 결과를 확인하지 못했습니다" }).waitFor();
    const firstOutlookBody = state.commandBodies.at(-1).body;
    await page.getByRole("button", { name: "Outlook 연결", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Outlook 일정이 연결되었습니다" }).waitFor();
    const secondOutlookBody = state.commandBodies.at(-1).body;
    assert.equal(secondOutlookBody.idempotency_key, firstOutlookBody.idempotency_key);
    assert.equal(secondOutlookBody.expected_version, firstOutlookBody.expected_version);
    await page.getByLabel("상담 결과").fill("요청 범위를 확인했습니다.");
    await page.getByLabel("다음 행동").fill("견적 검토 후 회신");
    await page.getByRole("button", { name: "상담 완료", exact: true }).click();
    await page.locator('[data-client-consultation-completed-summary="true"]').waitFor();
    await page.getByLabel("결정").selectOption("accepted");
    await page.getByLabel("금액 미정으로 확정").check();
    await page.getByRole("button", { name: "결정 기록", exact: true }).click();
    await page.locator('[data-client-engagement-repair="true"]').waitFor();
    const repairText = await page.locator('[data-client-engagement-repair="true"]').innerText();
    assert.match(repairText, /확인이 필요한 단계: 수임료 반영/);
    assert.equal(repairText.includes("fee_commitment_created"), false);
    await page.getByRole("button", { name: "안전하게 재시도", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "수임 결정이 기록되었습니다" }).waitFor();
    const completedDetail = page.locator('[data-client-consultation-detail="true"]');
    assert.equal(await completedDetail.locator('[data-client-consultation-completed-summary="true"]').count(), 1);
    assert.equal(await completedDetail.getByRole("button", { name: /Outlook/ }).count(), 0);
    assert.equal(await completedDetail.locator('[data-client-consultation-reschedule-form="true"]').count(), 0);
    assert.equal(await completedDetail.locator('[data-client-consultation-complete-form="true"]').count(), 0);
    assert.match(await completedDetail.locator('[data-client-consultation-completed-summary="true"]').innerText(), /요청 범위를 확인했습니다|요청 범위를 확인함/);
    assert.match(await completedDetail.locator('[data-client-consultation-completed-summary="true"]').innerText(), /견적 검토 후 회신/);
    const consultationRouteEvidence = {};
    const captureConsultationEvidence = async (width, height, detailPath, surfacePath) => {
      await page.setViewportSize({ width, height });
      const surface = page.locator('[data-client-consultation-surface="true"]');
      const detail = page.locator('[data-client-consultation-detail="true"]');
      assert.equal(await surface.count(), 1);
      assert.equal(await detail.count(), 1);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelector(".page-canvas")?.scrollTo(0, 0);
      });
      const observed = await page.evaluate(() => ({
        href: location.href,
        search: location.search,
        hash: location.hash,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        overflow: {
          document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          body: document.body.scrollWidth - document.body.clientWidth
        }
      }));
      const observedUrl = new URL(observed.href);
      assert.equal(observed.innerWidth, width);
      assert.equal(observed.innerHeight, height);
      assert.equal(observedUrl.searchParams.get("consultation_id"), "consultation-browser-1");
      assert.equal(observed.hash, "#client-consultation-proposals");
      assert.deepEqual(observed.overflow, { document: 0, body: 0 });
      assert.match(await detail.innerText(), /선택한 상담/);
      assert.match(await detail.innerText(), /상담 결과/);
      assert.match(await detail.innerText(), /다음 행동/);
      await surface.screenshot({ path: resolve(evidenceDir, surfacePath) });
      await detail.scrollIntoViewIfNeeded();
      await detail.screenshot({ path: resolve(evidenceDir, detailPath) });
      consultationRouteEvidence[String(width)] = observed;
    };
    await captureConsultationEvidence(1440, 1000, "client-consultation-1440-detail.png", "client-consultation-1440.png");
    await captureConsultationEvidence(820, 900, "client-consultation-820.png", "client-consultation-820-surface.png");
    await captureConsultationEvidence(390, 844, "client-consultation-390.png", "client-consultation-390-surface.png");

    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow&inquiry_id=${inquiryId}#client-activities`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-client-activities-connected="true"]').waitFor();
    assert.equal(await page.locator('.client-activities-list [role="listitem"]').count(), 1);
    assert.equal((await page.locator('.client-activities-list [role="listitem"]').allInnerTexts()).join(" ").includes("상담"), false);
    await page.getByLabel("메모", { exact: true }).fill("상담 후속 연락을 확인했습니다.");
    await page.getByLabel("기록 사유").fill("상담 후속 연락을 기록함");
    await page.getByRole("button", { name: "메모 기록", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "접촉 메모가 기록되었습니다" }).waitFor();
    const latestMemoCommand = [...state.commandBodies].reverse().find(({ route }) => route === "/api/crm/activities");
    assert.equal(latestMemoCommand?.body?.activity?.lead_id, inquiryId);
    assert.equal(latestMemoCommand?.body?.activity?.party_id, undefined);
    assert.equal(latestMemoCommand?.body?.activity?.opportunity_id, undefined);
    const engagementBody = state.commandBodies.find(({ route }) => route.endsWith("/engagement-decisions"))?.body;
    const repairBody = state.commandBodies.find(({ route }) => route.endsWith("/engagement-repair"))?.body;
    assert.equal(engagementBody?.expected_inquiry_version, 9);
    assert.equal(repairBody?.expected_workflow_version, 4);

    const receipt = {
      scenario: "CL-P5-W02-T05",
      invocation: "node --test apps/web/test/client-consultation-browser.test.mjs",
      binary_observables: {
        consultation_rows_without_selection: 1,
        dedicated_consultation_query: "초기",
        dedicated_consultation_id: "consultation-browser-1",
        consultation_route_evidence: consultationRouteEvidence,
        escape_returns_focus: true,
        schedule_expected_inquiry_version: 7,
        schedule_response_inquiry_version: 8,
        completion_response_inquiry_version: 9,
        engagement_expected_inquiry_version: engagementBody?.expected_inquiry_version,
        repair_expected_workflow_version: repairBody?.expected_workflow_version,
        outlook_retry_same_idempotency_key: true,
        outlook_retry_same_expected_version: true,
        memo_authoritative_lead_id: inquiryId,
        memo_has_party_or_opportunity_id: false,
        completed_detail_controls_hidden: true
      },
      artifacts: [
        "client-consultation-1440.png",
        "client-consultation-1440-detail.png",
        "client-consultation-820-surface.png",
        "client-consultation-820.png",
        "client-consultation-390-surface.png",
        "client-consultation-390.png"
      ]
    };
    await writeFile(resolve(evidenceDir, "client-consultation-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  } finally {
    await browser.close();
    await server.close();
  }
});
