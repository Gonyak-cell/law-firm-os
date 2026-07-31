import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

const SESSION_SCHEMA = "law-firm-os.desktop-web-session-envelope.v0.1";

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function leaveOptions() {
  return {
    groups: [{
      group_id: "annual",
      code: "PAID_TIME",
      display_name: "연차",
      status: "active",
    }],
    types: [{
      leave_type_id: "annual-standard",
      group_id: "annual",
      code: "ANNUAL",
      display_name: "연차",
      request_unit: "minutes",
      evidence_rule: {},
      status: "active",
    }],
    policies: [{
      policy_version_id: "annual-2026-v1",
      group_id: "annual",
      policy_code: "ANNUAL-2026",
      version: 1,
      effective_from: "2026-01-01",
      status: "active",
      rules: {
        type_rules: {
          "annual-standard": {
            usage_modes: ["full_day", "half_day", "quarter_day", "hours"],
          },
        },
      },
    }],
  };
}

function workflowState() {
  return {
    availableMinutes: 960,
    usedMinutes: 0,
    requests: [],
    requestLog: [],
  };
}

function selfState(state) {
  return {
    outcome: "ok",
    employee_id: "emp-1",
    balances: [{
      group: {
        group_id: "annual",
        code: "PAID_TIME",
        display_name: "연차",
      },
      balance: {
        available_minutes: state.availableMinutes,
        reserved_minutes: state.requests.some((request) => request.state === "submitted") ? 120 : 0,
        used_minutes: state.usedMinutes,
      },
      earliest_expiry: "2026-12-31",
    }],
    requests: structuredClone(state.requests),
  };
}

function occurrenceProjection(state) {
  const row = {
    entitlement_id: "entitlement-annual-2026",
    employee_id: "emp-1",
    employee_display_name: "김아민",
    group_id: "annual",
    group_display_name: "연차",
    valid_from: "2026-01-01",
    expires_on: "2026-12-31",
    lifecycle_state: "active",
    total_minutes: 960,
    used_minutes: state.usedMinutes,
    reserved_minutes: state.requests.some((request) => request.state === "submitted") ? 120 : 0,
    expired_minutes: 0,
    remaining_minutes: state.availableMinutes,
  };
  const rows = [row, ...(Array.isArray(state.additionalOccurrenceRows) ? state.additionalOccurrenceRows : [])];
  return {
    list: { rows },
    by_month: [],
    by_type: [],
    totals: {
      row_count: rows.length,
      total_minutes: 960,
      used_minutes: state.usedMinutes,
      reserved_minutes: row.reserved_minutes,
      expired_minutes: 0,
      remaining_minutes: state.availableMinutes,
    },
  };
}

async function installLeaveRoutes(page, state, { mode = "data" } = {}) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();
    state.requestLog.push({ pathname, method });

    if (mode === "error" && pathname.startsWith("/api/hrx/leave/")) {
      return json(route, 500, { safe_error_code: "HRX_LEAVE_READ_FAILED" });
    }
    if (pathname === "/api/hrx/leave/me" && method === "GET") {
      return json(route, 200, mode === "empty"
        ? { outcome: "ok", employee_id: "emp-1", balances: [], requests: [] }
        : selfState(state));
    }
    if (pathname === "/api/hrx/leave/types/active" && method === "GET") {
      return json(route, 200, leaveOptions());
    }
    if (pathname === "/api/hrx/leave/configuration" && method === "GET" && state.leaveConfiguration) {
      return json(route, 200, state.leaveConfiguration);
    }
    if (pathname === "/api/hrx/leave/accrual/manual/approvers" && method === "GET" && state.leaveManualSupport) {
      return json(route, 200, { outcome: "ok", approvers: state.leaveManualSupport.approvers ?? [] });
    }
    if (pathname === "/api/hrx/leave/accrual/manual/evidence-documents" && method === "GET" && state.leaveManualSupport) {
      return json(route, 200, { outcome: "ok", documents: state.leaveManualSupport.documents ?? [] });
    }
    if (pathname === "/api/hrx/leave/accrual/manual/preview" && method === "POST" && (state.manualPreview || state.manualPreviewSequence)) {
      const sequence = Array.isArray(state.manualPreviewSequence) ? state.manualPreviewSequence : [state.manualPreview];
      const cursor = Number(state.manualPreviewCursor ?? 0);
      const preview = sequence[Math.min(cursor, sequence.length - 1)];
      state.manualPreviewCursor = cursor + 1;
      return json(route, 200, { outcome: "ok", preview });
    }
    if (pathname === "/api/hrx/leave/accrual/manual/uploads/preview" && method === "POST" && state.uploadBatch) {
      return json(route, 200, { outcome: "ok", batch: state.uploadBatch });
    }
    if (pathname === "/api/hrx/leave/me/evidence-documents" && method === "GET") {
      return json(route, 200, { outcome: "ok", documents: [] });
    }
    if (pathname === "/api/hrx/leave/me/preview" && method === "POST") {
      const body = request.postDataJSON();
      assert.equal(body.duration_mode, "hours");
      assert.equal(body.requested_minutes, 120);
      return json(route, 200, {
        outcome: "ok",
        preview: {
          schedule: {
            requested_minutes: 120,
            included_dates: ["2026-08-03"],
            non_working_dates: [],
            segments: [{
              date: "2026-08-03",
              leave_periods: [{ start: "09:00", end: "11:00", minutes: 120 }],
            }],
          },
          economics: {
            deduction_minutes: 120,
            paid_minutes: 120,
            unpaid_minutes: 0,
          },
          available_after_minutes: 840,
          approval_plan: {
            approver: { actor_id: "manager-1", display_name: "박승인" },
            step_count: 1,
          },
          allocations: [{ expires_on: "2026-12-31", amount_minutes: 120 }],
        },
      });
    }
    if (pathname === "/api/hrx/leave/me/requests" && method === "POST") {
      const body = request.postDataJSON();
      assert.equal(body.requested_minutes, 120);
      const leaveRequest = {
        request_id: body.request_id,
        leave_type_id: body.leave_type_id,
        leave_type_display_name: "연차",
        policy_version_id: body.policy_version_id,
        requested_minutes: 120,
        start_date: body.start_date,
        end_date: body.end_date,
        state: "submitted",
        state_version: 1,
      };
      state.requests = [leaveRequest];
      state.availableMinutes = 840;
      return json(route, 201, { outcome: "submitted", leave_request: leaveRequest });
    }
    if (pathname === "/api/hrx/leave/occurrences/projections" && method === "GET") {
      return json(route, 200, {
        outcome: "ok",
        projections: mode === "empty"
          ? {
              list: { rows: [] },
              by_month: [],
              by_type: [],
              totals: {
                row_count: 0,
                total_minutes: 0,
                used_minutes: 0,
                reserved_minutes: 0,
                expired_minutes: 0,
                remaining_minutes: 0,
              },
            }
          : occurrenceProjection(state),
      });
    }
    if (pathname === "/api/hrx/leave/promotion-campaigns" && method === "GET" && state.promotionWorkspace) {
      return json(route, 200, state.promotionWorkspace);
    }
    if (pathname === "/api/hrx/leave/promotion-campaigns/preview" && method === "POST" && state.promotionPreview) {
      return json(route, 200, { outcome: "ok", preview: state.promotionPreview });
    }
    if (pathname === "/api/hrx/leave/termination-reconciliations/candidates" && method === "GET" && state.terminationWorkspace) {
      return json(route, 200, { outcome: "ok", candidates: state.terminationWorkspace.candidates });
    }
    if (pathname === "/api/hrx/leave/termination-reconciliations/approvers" && method === "GET" && state.terminationWorkspace) {
      return json(route, 200, { outcome: "ok", approvers: state.terminationWorkspace.approvers ?? [] });
    }
    if (pathname === "/api/hrx/leave/termination-reconciliations" && method === "GET" && state.terminationWorkspace) {
      return json(route, 200, { outcome: "ok", reconciliations: state.terminationWorkspace.reconciliations ?? [] });
    }
    if (pathname === "/api/hrx/leave/integrations" && method === "GET") {
      return json(route, 200, {
        outcome: "ok",
        integration: state.integration ?? {
          rows: [],
          summary: {
            pending_sync: 0,
            delivered: 0,
            failed_deliveries: 0,
            not_configured: 0,
            dead_lettered: 0,
          },
        },
      });
    }
    return json(route, 200, {});
  });
}

async function openLeavePage({
  browser,
  baseUrl,
  state,
  section = "people-leave",
  mode = "data",
  scopes = [],
  ctx = "allow",
  actorRef = "actor-leave-workflow",
  sessionDisplayName = null,
  viewport = { width: 1440, height: 1000 },
}) {
  const page = await browser.newPage({ viewport });
  if (scopes.length) {
    await page.addInitScript(({ schemaVersion, grantedScopes, actorRef, sessionDisplayName }) => {
      window.__LAWOS_SESSION_CONTEXT__ = {
        schema_version: schemaVersion,
        state: "signed_in",
        session_ref: "session:leave-workflow",
        source: "browser_receipt",
        actor_ref: actorRef,
        ...(sessionDisplayName ? { display_name: sessionDisplayName } : {}),
        tenant_refs: { default: "tenant-leave-workflow" },
        role_ids: ["employee"],
        scopes: grantedScopes,
        review_state: "allow",
        expires_at: "2030-01-01T00:00:00.000Z",
      };
    }, { schemaVersion: SESSION_SCHEMA, grantedScopes: scopes, actorRef, sessionDisplayName });
  }
  await installLeaveRoutes(page, state, { mode });
  await page.goto(`${baseUrl}/?view=people&ctx=${ctx}#${section}`, { waitUntil: "networkidle" });
  await page.locator("#people-home").waitFor();
  return page;
}

test("minute leave request survives submit, approval, ledger, and usage readback", async () => {
  const harness = await startPeopleOverviewHarness();
  const state = workflowState();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-053");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const legacyReferencePage = await openLeavePage({
      ...harness,
      state,
      actorRef: "kim",
      sessionDisplayName: "KIM",
      scopes: ["hrx.leave.self.read", "hrx.leave.self.write"],
    });
    const legacySidebarProfile = legacyReferencePage.locator(".forest-sidebar-user");
    await legacySidebarProfile.getByText("사용자", { exact: true }).waitFor();
    assert.equal(await legacySidebarProfile.getByText("KIM", { exact: true }).count(), 0);
    assert.doesNotMatch(await legacyReferencePage.locator("body").innerText(), /\bKIM\b/);
    await legacyReferencePage.close();

    const page = await openLeavePage({
      ...harness,
      state,
      scopes: ["hrx.leave.self.read", "hrx.leave.self.write"],
    });
    const sidebarProfile = page.locator(".forest-sidebar-user");
    await sidebarProfile.getByText("사용자", { exact: true }).waitFor();
    assert.equal((await page.locator("body").innerText()).includes("actor-leave-workflow"), false);
    const sidebarExposure = await sidebarProfile.evaluate((node) => [
      node.textContent ?? "",
      ...[...node.querySelectorAll("[aria-label], [aria-describedby], [title]")]
        .flatMap((element) => ["aria-label", "aria-describedby", "title"].map((name) => element.getAttribute(name) ?? "")),
    ].join(" "));
    assert.equal(sidebarExposure.includes("actor-leave-workflow"), false);
    const form = page.locator(".leave-self-request-form");
    await form.getByLabel("시작일").fill("2026-08-03");
    await form.getByLabel("종료일").fill("2026-08-03");
    await form.getByLabel("사용 단위").selectOption("hours");
    await form.getByRole("spinbutton", { name: "시간", exact: true }).fill("2");
    await form.getByRole("button", { name: "차감 미리보기" }).click();
    await page.locator('[data-leave-preview="ready"]').getByText("2시간 차감").waitFor();
    await form.getByRole("button", { name: "신청", exact: true }).click();
    await page.locator(".leave-request-row").getByText("승인 대기", { exact: true }).waitFor();
    assert.equal(state.requests[0].state, "submitted");
    assert.equal(
      state.requestLog.some((entry) => entry.pathname === "/api/hrx/leave/me/requests" && entry.method === "POST"),
      true,
    );

    state.requests[0] = {
      ...state.requests[0],
      state: "approved",
      state_version: 2,
    };
    state.usedMinutes = 120;
    state.availableMinutes = 840;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".leave-request-row").getByText("승인", { exact: true }).waitFor();
    await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-leave-usage`, {
      waitUntil: "networkidle",
    });
    const usage = page.locator("#people-leave-usage");
    await usage.getByText("휴가 사용 내역", { exact: true }).waitFor();
    const row = usage.locator("tbody tr").filter({ hasText: "김아민" });
    await row.waitFor();
    assert.match(await row.innerText(), /120분/);
    assert.match(await row.innerText(), /1일 360분/);
    assert.equal(await usage.getByRole("button", { name: "CSV" }).count(), 0);
    assert.equal(
      state.requestLog.some((entry) => entry.pathname === "/api/hrx/leave/occurrences/projections"),
      true,
    );
    await page.screenshot({
      path: join(evidenceDir, "request-approved-usage-readback.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("leave integration status uses one evidence-aware result vocabulary", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-059");
  await mkdir(evidenceDir, { recursive: true });
  const state = workflowState();
  const aggregateReferences = [
    "550e8400-e29b-41d4-a716-446655440000",
    "0123456789abcdef0123456789abcdef",
    "opaque-aggregate-reference-2026",
    "internal-leave-aggregate-04",
    "aggregate-ref-05",
    "aggregate-ref-06",
  ];
  const resultStates = [
    ["queued", "schedule", "일정 · 처리 대기"],
    ["sent", "notification", "알림 · 발송됨"],
    ["delivered", "payroll", "급여 · 전달 확인"],
    ["read", "notification", "알림 · 열람 확인"],
    ["failed", "attendance", "출퇴근 · 실패"],
    ["unknown", "mystery-provider", "외부 연동 · 확인 필요"],
  ];
  state.integration = {
    rows: resultStates.map(([providerResultState, providerKind], index) => ({
      outbox_event_id: `outbox-${index}`,
      aggregate_id: aggregateReferences[index],
      event_type: "leave.request.approved",
      state: ["failed", "unknown", "queued"].includes(providerResultState) ? "pending_sync" : "delivered",
      created_at: `2026-07-14T0${index}:15:00+09:00`,
      deliveries: [{
        delivery_id: `delivery-${index}`,
        provider_kind: providerKind,
        state: providerResultState === "failed"
          ? "failed"
          : providerResultState === "unknown"
            ? "not_configured"
            : providerResultState === "queued"
              ? "pending_sync"
              : "delivered",
        provider_result_state: providerResultState,
        dead_letter: null,
      }],
    })),
    summary: {
      pending_sync: 1,
      delivered: 3,
      failed_deliveries: 1,
      not_configured: 1,
      dead_lettered: 0,
      provider_results: {
        queued: 1,
        sent: 1,
        delivered: 1,
        read: 1,
        failed: 1,
        unknown: 1,
      },
    },
  };
  try {
    const page = await openLeavePage({
      ...harness,
      state,
      section: "people-leave-usage",
      scopes: ["hrx.leave.self.read", "hrx.leave.report.export"],
    });
    await page.getByText("업무 시스템 연동", { exact: true }).click();
    for (const [, , expected] of resultStates) {
      await page.getByText(expected, { exact: true }).first().waitFor();
    }
    for (const [resultState] of resultStates) {
      assert.equal(
        await page.locator(`[data-delivery-result-state="${resultState}"]`).count(),
        1,
      );
    }
    const repeatedTitleRows = page.locator(".leave-integration-row", { hasText: "승인 휴가 반영" });
    assert.equal(await repeatedTitleRows.count(), resultStates.length);
    const firstRowText = await repeatedTitleRows.nth(0).innerText();
    const secondRowText = await repeatedTitleRows.nth(1).innerText();
    assert.match(firstRowText, /2026.*7.*14.*00:15/);
    assert.match(firstRowText, /재처리 대기/);
    assert.match(secondRowText, /2026.*7.*14.*01:15/);
    assert.match(secondRowText, /연동 완료/);
    assert.doesNotMatch(firstRowText, /참조/);
    assert.doesNotMatch(secondRowText, /참조/);
    assert.notEqual(firstRowText, secondRowText);
    const renderedIntegration = await page.locator("#people-leave-usage").evaluate((root) => ({
      text: root.textContent ?? "",
      html: root.innerHTML,
      labelledAttributes: [...root.querySelectorAll("[aria-label], [aria-describedby], [title]")]
        .flatMap((element) => ["aria-label", "aria-describedby", "title"].map((name) => element.getAttribute(name) ?? ""))
        .join(" "),
    }));
    for (const reference of aggregateReferences) {
      assert.equal(renderedIntegration.text.includes(reference), false, `aggregate ref rendered as text: ${reference}`);
      assert.equal(renderedIntegration.html.includes(reference), false, `aggregate ref rendered in markup: ${reference}`);
      assert.equal(renderedIntegration.labelledAttributes.includes(reference), false, `aggregate ref rendered in ARIA/title: ${reference}`);
    }
    assert.equal(renderedIntegration.text.includes("mystery-provider"), false);
    assert.equal(renderedIntegration.html.includes("mystery-provider"), false);
    assert.equal(renderedIntegration.labelledAttributes.includes("mystery-provider"), false);
    const rowTexts = await repeatedTitleRows.allInnerTexts();
    assert.equal(new Set(rowTexts).size, resultStates.length);
    await page.screenshot({
      path: join(evidenceDir, "provider-result-states.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const contextMenu = page.locator('[data-context-sidebar-trigger="true"]');
    if (await contextMenu.getAttribute("aria-expanded") === "true") await contextMenu.click();
    assert.equal(await page.locator(".app-frame").getAttribute("data-sidebar-state"), "contextual");
    await page.waitForFunction(() => {
      const sidebar = document.querySelector("#context-sidebar");
      return !sidebar || getComputedStyle(sidebar).visibility === "hidden";
    });
    await repeatedTitleRows.first().scrollIntoViewIfNeeded();
    const mobileLayout = await repeatedTitleRows.first().evaluate((row) => {
      const meta = row.querySelector(".leave-integration-row-meta");
      return {
        rowFits: row.scrollWidth <= row.clientWidth,
        metaFits: Boolean(meta) && meta.scrollWidth <= meta.clientWidth,
        metaWrap: meta ? getComputedStyle(meta).flexWrap : "",
        rowHeight: row.getBoundingClientRect().height,
      };
    });
    assert.equal(mobileLayout.rowFits, true);
    assert.equal(mobileLayout.metaFits, true);
    assert.equal(mobileLayout.metaWrap, "wrap");
    assert.ok(mobileLayout.rowHeight < 120, `mobile integration row is ${mobileLayout.rowHeight}px tall`);
    await page.screenshot({
      path: join(evidenceDir, "provider-result-states-mobile.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("leave usage accrual results resolve employee names and fail closed for unsafe mappings", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, ".omo/evidence/leave-usage-employee-labels");
  await mkdir(evidenceDir, { recursive: true });
  const state = {
    ...workflowState(),
    additionalOccurrenceRows: [
      {
        entitlement_id: "entitlement-substring",
        employee_id: "emp-substring",
        employee_display_name: "구성원 emp-substring",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-01-01",
        expires_on: "2026-12-31",
        lifecycle_state: "active",
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
      {
        entitlement_id: "entitlement-uuid",
        employee_id: "emp-uuid",
        employee_display_name: "550e8400-e29b-41d4-a716-446655440000",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-01-01",
        expires_on: "2026-12-31",
        lifecycle_state: "active",
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
      {
        entitlement_id: "entitlement-hex",
        employee_id: "emp-hex",
        employee_display_name: "0123456789abcdef0123456789abcdef",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-01-01",
        expires_on: "2026-12-31",
        lifecycle_state: "active",
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
      {
        entitlement_id: "entitlement-unknown-state",
        employee_id: "emp-unknown-state",
        employee_display_name: "강상태",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-01-01",
        expires_on: "2026-12-31",
        lifecycle_state: "internal-lifecycle-state-opaque",
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
      {
        entitlement_id: "550e8400-e29b-41d4-a716-446655440001",
        employee_id: "emp-scheduled-uuid",
        employee_display_name: "박예정",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-09-01",
        expires_on: "2026-12-31",
        lifecycle_state: "scheduled",
        state_version: 1,
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
      {
        entitlement_id: "0123456789abcdef0123456789abcdef",
        employee_id: "emp-scheduled-hex",
        employee_display_name: "최예정",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-10-01",
        expires_on: "2026-12-31",
        lifecycle_state: "scheduled",
        state_version: 1,
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
      {
        entitlement_id: "opaque-entitlement-reference-2026",
        employee_id: "emp-scheduled-opaque",
        employee_display_name: "이예정",
        group_id: "annual",
        group_display_name: "연차",
        valid_from: "2026-11-01",
        expires_on: "2026-12-31",
        lifecycle_state: "scheduled",
        state_version: 1,
        total_minutes: 480,
        used_minutes: 0,
        reserved_minutes: 0,
        expired_minutes: 0,
        remaining_minutes: 480,
      },
    ],
    leaveConfiguration: leaveOptions(),
    leaveManualSupport: {
      approvers: [{ actor_id: "manager-1", display_name: "박승인" }],
      documents: [{
        document_id: "doc-annual-2026",
        employee_id: "emp-1",
        employee_display_name: "김아민",
        title: "근로계약서"
      }, {
        document_id: "doc-document-only-2026",
        employee_id: "emp-document-only",
        employee_display_name: "이문서",
        title: "휴가 증빙"
      }],
    },
    manualPreviewSequence: [
      {
        rows: [{
          row_number: 1,
          employee_id: "emp-1",
          amount_minutes: 480,
          status: "ready",
          error_message: "",
        }],
        counts: { ready: 1, errors: 0 },
      },
      {
        rows: [{
          row_number: 1,
          employee_id: "emp-substring",
          amount_minutes: 480,
          status: "error",
          error_message: "구성원 확인 필요",
        }],
        counts: { ready: 0, errors: 1 },
      },
      {
        rows: [{
          row_number: 1,
          employee_id: "emp-uuid",
          amount_minutes: 480,
          status: "error",
          error_message: "구성원 확인 필요",
        }],
        counts: { ready: 0, errors: 1 },
      },
      {
        rows: [{
          row_number: 1,
          employee_id: "emp-document-only",
          amount_minutes: 480,
          status: "ready",
          error_message: "",
        }],
        counts: { ready: 1, errors: 0 },
      },
    ],
    uploadBatch: {
      upload_batch_id: "upload-batch-employee-labels",
      preview_hash: "hash-employee-labels",
      status: "previewed",
      rows: [
        {
          row_number: 1,
          row_key: "mapped",
          employee_id: "emp-1",
          preview_status: "ready",
          execution_status: "pending",
          error_message: "",
          attempt_count: 0,
        },
        {
          row_number: 2,
          row_key: "unmapped",
          employee_id: "emp-substring",
          preview_status: "error",
          execution_status: "pending",
          error_message: "구성원 확인 필요",
          attempt_count: 0,
        },
        {
          row_number: 3,
          row_key: "uuid",
          employee_id: "emp-uuid",
          preview_status: "error",
          execution_status: "pending",
          error_message: "구성원 확인 필요",
          attempt_count: 0,
        },
        {
          row_number: 4,
          row_key: "document-only",
          employee_id: "emp-document-only",
          preview_status: "ready",
          execution_status: "pending",
          error_message: "",
          attempt_count: 0,
        },
      ],
      counts: { ready: 2, preview_errors: 2, duplicates: 0 },
    },
  };
  try {
    const page = await openLeavePage({
      ...harness,
      state,
      section: "people-leave-usage",
      scopes: ["hrx.leave.self.read", "hrx.leave.ledger.adjust"],
    });
    const usage = page.locator("#people-leave-usage");
    const unsafeEmployeeReferences = [
      "550e8400-e29b-41d4-a716-446655440000",
      "0123456789abcdef0123456789abcdef",
      "internal-lifecycle-state-opaque",
    ];
    const initialUsageMarkup = await usage.evaluate((root) => ({
      text: root.textContent ?? "",
      html: root.innerHTML,
      labelledAttributes: [...root.querySelectorAll("[aria-label], [aria-describedby], [title]")]
        .flatMap((element) => ["aria-label", "aria-describedby", "title"].map((name) => element.getAttribute(name) ?? ""))
        .join(" "),
    }));
    for (const reference of unsafeEmployeeReferences) {
      assert.equal(initialUsageMarkup.text.includes(reference), false, `unsafe employee ref rendered as text: ${reference}`);
      assert.equal(initialUsageMarkup.html.includes(reference), false, `unsafe employee ref rendered in markup: ${reference}`);
      assert.equal(initialUsageMarkup.labelledAttributes.includes(reference), false, `unsafe employee ref rendered in ARIA/title: ${reference}`);
    }
    assert.ok(initialUsageMarkup.text.includes("상태 확인 필요"));
    await usage.getByRole("button", { name: "수동 발생", exact: true }).click();
    await usage.getByLabel("사유").fill("근거 확인");
    await usage.getByRole("button", { name: "미리보기", exact: true }).click();
    const manualResult = usage.locator(".leave-occurrence-stage-result");
    const manualStage = usage.locator('section[aria-label="수동 발생 조정안"]');
    await manualResult.getByText("김아민", { exact: true }).waitFor();
    assert.equal(await manualResult.getByText("emp-1", { exact: true }).count(), 0);
    await manualStage.screenshot({
      path: join(evidenceDir, "manual-accrual-result-employee-label.png"),
    });
    await usage.getByRole("button", { name: "미리보기", exact: true }).click();
    await manualResult.getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    assert.equal(await manualResult.getByText("emp-substring", { exact: true }).count(), 0);
    await manualStage.screenshot({
      path: join(evidenceDir, "manual-accrual-result-substring-fallback.png"),
    });
    await usage.getByRole("button", { name: "미리보기", exact: true }).click();
    await manualResult.getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    assert.equal(await manualResult.getByText("emp-uuid", { exact: true }).count(), 0);
    assert.equal(await manualStage.getByText("550e8400-e29b-41d4-a716-446655440000", { exact: true }).count(), 0);
    await manualStage.screenshot({
      path: join(evidenceDir, "manual-accrual-result-uuid-fallback.png"),
    });
    await usage.getByRole("button", { name: "미리보기", exact: true }).click();
    await manualResult.getByText("이문서", { exact: true }).waitFor();
    assert.equal(await manualResult.getByText("emp-document-only", { exact: true }).count(), 0);
    await manualStage.screenshot({
      path: join(evidenceDir, "manual-accrual-result-document-only-employee.png"),
    });

    await usage.getByRole("button", { name: "파일 업로드", exact: true }).click();
    await usage.getByLabel("휴가 발생 파일").setInputFiles({
      name: "leave-occurrences.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("employee_id,amount_minutes\nemp-1,480\nemp-substring,480\nemp-uuid,480\nemp-document-only,480\n"),
    });
    await usage.getByRole("button", { name: "미리보기", exact: true }).click();
    const uploadRows = usage.locator(".leave-occurrence-upload-table tbody tr");
    const uploadStage = usage.locator('section[aria-label="파일 업로드 조정안"]');
    await uploadRows.nth(0).getByText("김아민", { exact: true }).waitFor();
    await uploadRows.nth(1).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await uploadRows.nth(2).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await uploadRows.nth(3).getByText("이문서", { exact: true }).waitFor();
    assert.equal(await usage.getByText("emp-1", { exact: true }).count(), 0);
    for (const [rowIndex, employeeId] of [[1, "emp-substring"], [2, "emp-uuid"]]) {
      assert.equal(await uploadRows.nth(rowIndex).getByText(employeeId, { exact: true }).count(), 0);
    }
    assert.equal(await uploadStage.getByText("550e8400-e29b-41d4-a716-446655440000", { exact: true }).count(), 0);
    await uploadStage.screenshot({
      path: join(evidenceDir, "accrual-results-resolve-employee-labels.png"),
    });
    for (const [employee, reference, fileStem] of [
      ["박예정", "550e8400-e29b-41d4-a716-446655440001", "uuid"],
      ["최예정", "0123456789abcdef0123456789abcdef", "hex"],
      ["이예정", "opaque-entitlement-reference-2026", "opaque"],
    ]) {
      const scheduledRow = usage.locator(".leave-occurrence-table tbody tr").filter({ hasText: employee });
      await scheduledRow.getByRole("button", { name: "관리", exact: true }).click();
      const editSection = usage.locator('section[aria-label="예정 발생 조정안"]');
      const editHeader = editSection.locator(".leave-occurrence-stage-head");
      await editHeader.getByText("기간과 취소 사유를 조정할 수 있습니다", { exact: true }).waitFor();
      assert.equal(await editSection.getByLabel("예정 발생 취소 코드").count(), 0);
      const cancelReason = editSection.getByLabel("예정 발생 취소 사유");
      await cancelReason.waitFor();
      assert.deepEqual(await cancelReason.locator("option").allTextContents(), ["관리자 요청", "정책 변경", "근무 일정 변경"]);
      const editMarkup = await editHeader.evaluate((element) => ({
        text: element.textContent ?? "",
        html: element.innerHTML,
        labelledAttributes: [...element.querySelectorAll("[aria-label], [aria-describedby], [title]")]
          .flatMap((node) => ["aria-label", "aria-describedby", "title"].map((name) => node.getAttribute(name) ?? ""))
          .join(" "),
      }));
      assert.equal(editMarkup.text.includes(reference), false, `entitlement ref rendered as text: ${reference}`);
      assert.equal(editMarkup.html.includes(reference), false, `entitlement ref rendered in markup: ${reference}`);
      assert.equal(editMarkup.labelledAttributes.includes(reference), false, `entitlement ref rendered in ARIA/title: ${reference}`);
      assert.equal(await usage.getByText(reference, { exact: true }).count(), 0);
      await editHeader.screenshot({
        path: join(evidenceDir, `scheduled-edit-safe-copy-${fileStem}.png`),
      });
    }
    await page.close();
  } finally {
    await harness.close();
  }
});

test("leave direct routes distinguish loading, empty, error, denied, and export permission", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const loadingState = workflowState();
    const loading = await harness.browser.newPage();
    await loading.route("**/api/**", (route) => {
      if (new URL(route.request().url()).pathname === "/api/hrx/leave/me") return;
      return json(route, 200, leaveOptions());
    });
    await loading.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-leave`, {
      waitUntil: "domcontentloaded",
    });
    await loading.getByText("휴가 정보를 불러오는 중입니다", { exact: true }).waitFor();
    await loading.close();

    const empty = await openLeavePage({
      ...harness,
      state: workflowState(),
      mode: "empty",
    });
    await empty.getByText("신청 내역 없음", { exact: true }).waitFor();
    await empty.close();

    const error = await openLeavePage({
      ...harness,
      state: workflowState(),
      mode: "error",
    });
    await error.getByRole("alert").getByText("휴가 정보를 불러오지 못했습니다.", { exact: true }).waitFor();
    await error.close();

    const denied = await openLeavePage({
      ...harness,
      state: loadingState,
      ctx: "denied",
    });
    await denied.getByText("접근 권한이 없습니다", { exact: true }).waitFor();
    await denied.close();

    const exportPage = await openLeavePage({
      ...harness,
      state: workflowState(),
      section: "people-leave-usage",
      scopes: ["hrx.leave.self.read", "hrx.leave.report.export"],
    });
    const usage = exportPage.locator("#people-leave-usage");
    await usage.getByRole("button", { name: "CSV" }).waitFor();
    await usage.getByRole("button", { name: "XLSX" }).waitFor();
    await exportPage.close();
  } finally {
    await harness.close();
  }
});
