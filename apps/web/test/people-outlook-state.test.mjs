import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  openPeopleOverviewPage,
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

const microsoftAuthorizeUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=lawos-test";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function outlookPostActions(page) {
  const actions = [];
  page.on("request", (request) => {
    if (
      request.method() !== "POST"
      || !/\/api\/hrx\/people\/members\/[^/]+\/outlook-connection$/.test(new URL(request.url()).pathname)
    ) return;
    actions.push(request.postDataJSON());
  });
  return actions;
}

test("connected Outlook adds required meetings to Today, keeps optional meetings as schedule, and disconnect hides both", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-038");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "connected",
    });
    const connection = page.locator('[data-outlook-connection-state="connected"]');
    const memberDetail = page.locator('[data-member-detail-employee="emp-1"]');
    const todayTasks = memberDetail.locator('[data-member-today-section="tasks"]');
    const todaySchedule = memberDetail.locator('[data-member-today-section="schedule"]');
    await connection.waitFor();
    await todayTasks.getByRole("heading", { name: "오늘 할 일", exact: true }).waitFor();
    await todaySchedule.getByRole("heading", { name: "오늘 일정", exact: true }).waitFor();
    assert.equal(await todayTasks.getByText("고객 전략 회의", { exact: true }).count(), 1);
    assert.equal(await todaySchedule.getByText("고객 전략 회의", { exact: true }).count(), 0);
    assert.equal(await todayTasks.getByText("필수 참석 회의", { exact: true }).count(), 1);
    assert.equal(await todayTasks.getByText("선택 참석 회의", { exact: true }).count(), 0);
    assert.equal(await todaySchedule.getByText("선택 참석 회의", { exact: true }).count(), 1);
    assert.equal(await todaySchedule.getByText("Outlook 일정", { exact: true }).count(), 1);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: join(evidenceDir, "member-today-connected.png"),
      fullPage: true,
    });

    await connection.getByRole("button", { name: "연결 해제" }).click();
    await page.locator('[data-outlook-connection-state="not_connected"]').waitFor();
    await memberDetail.getByText("고객 전략 회의", { exact: true }).waitFor({ state: "detached" });
    assert.equal(await memberDetail.getByText("선택 참석 회의", { exact: true }).count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook connection panel distinguishes approval, reauthorization, error, and feature-off states", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const cases = [
      {
        mode: "admin_consent_required",
        selector: '[data-outlook-connection-state="admin_consent_required"]',
        copy: "관리자 승인 필요",
        action: "승인 상태 확인",
      },
      {
        mode: "reauthorization_required",
        selector: '[data-outlook-connection-state="reauthorization_required"]',
        copy: "다시 연결 필요",
        action: "다시 연결",
      },
      {
        mode: "error",
        selector: '[data-outlook-connection-state="error"]',
        copy: "Outlook 상태를 확인하지 못했습니다",
        action: "다시 확인",
      },
    ];
    for (const item of cases) {
      const page = await openPeopleOverviewPage({
        ...harness,
        employeeId: "emp-1",
        tab: "today",
        outlookCalendarEnabled: true,
        outlookMode: item.mode,
      });
      await page.locator(item.selector).waitFor();
      assert.equal(await page.getByText(item.copy, { exact: true }).count(), 1);
      assert.equal(await page.getByRole("button", { name: item.action }).count(), 1);
      await page.close();
    }

    const featureOff = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: false,
    });
    assert.equal(await featureOff.locator(".member-outlook-connection").count(), 0);
    assert.equal(await featureOff.locator('[data-source="outlook"]').count(), 0);
    await featureOff.close();
  } finally {
    await harness.close();
  }
});

test("member request failures settle the panels and expose only safe Korean status details", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      dailyMode: "error",
      outlookCalendarEnabled: true,
      outlookMode: "error",
    });
    await page.locator('[data-member-detail-tab="today"] .live-data-state.live-data-error').waitFor();
    await page.locator('[data-outlook-connection-state="error"]').waitFor();
    assert.equal(
      await page.locator('[data-member-detail-tab="today"] .live-data-state.live-data-error')
        .getByText("잠시 후 다시 확인해 주세요.", { exact: true }).count(),
      1,
    );
    assert.equal(
      await page.locator('[data-outlook-connection-state="error"]')
        .getByText("잠시 후 다시 확인해 주세요.", { exact: true }).count(),
      1,
    );
    assert.equal(await page.getByText("HTTP 500", { exact: false }).count(), 0);
    assert.equal(await page.getByText("PEOPLE_DAILY_BRIEF_FAILED", { exact: false }).count(), 0);
    assert.equal(await page.getByText("OUTLOOK_CONNECTION_READ_FAILED", { exact: false }).count(), 0);
    assert.equal(await page.locator('[data-member-detail-tab="today"] .live-data-loading').count(), 0);
    assert.equal(await page.locator('[data-outlook-connection-state="loading"]').count(), 0);
    await page.close();

    const rejected = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
    });
    await rejected.route("**/api/hrx/people/members/*/daily-brief", (route) => route.abort());
    await rejected.route("**/api/hrx/people/members/*/outlook-connection", (route) => route.abort());
    await rejected.reload({ waitUntil: "networkidle" });
    await rejected.locator('[data-member-detail-tab="today"] .live-data-state.live-data-error').waitFor();
    await rejected.locator('[data-outlook-connection-state="error"]').waitFor();
    assert.equal(await rejected.getByText("연결이 원활하지 않습니다. 잠시 후 다시 확인해 주세요.", { exact: true }).count(), 2);
    assert.equal(await rejected.locator('[data-member-detail-tab="today"] .live-data-loading').count(), 0);
    assert.equal(await rejected.locator('[data-outlook-connection-state="loading"]').count(), 0);
    await rejected.close();
  } finally {
    await harness.close();
  }
});

test("team Outlook queue and timeline use source status and open the matching member", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      outlookCalendarEnabled: true,
      outlookMode: "connected",
    });
    await page.locator('[data-source="outlook"][data-source-state="ok"]').first().waitFor();
    assert.equal(
      await page.locator('.people-timeline-legend [data-kind="outlook_calendar"]')
        .getByText("Outlook 일정", { exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page.locator('[data-people-timeline-member="emp-1"] [data-kind="outlook_calendar"]').count(),
      1,
    );
    const queueButton = page.locator('[data-people-action-queue="today_tasks"]').getByRole("button", {
      name: "고객 전략 회의 열기",
    });
    await queueButton.click();
    await page.locator('[data-member-detail-employee="emp-1"]').waitFor();
    assert.equal(new URL(page.url()).searchParams.get("employee"), "emp-1");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook authorization URL allowlist accepts only the Microsoft HTTPS login host", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await harness.browser.newPage();
    await page.goto(harness.baseUrl);
    const decisions = await page.evaluate(async () => {
      const { isAllowedPeopleOutlookAuthorizeUrl } = await import("/src/people/hrxApiClient.ts");
      return [
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "https://login.microsoftonline.com:443/organizations/oauth2/v2.0/authorize",
        "http://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "https://login.microsoftonline.com.evil.example/oauth2/v2.0/authorize",
        "https://evil.example@login.microsoftonline.com/oauth2/v2.0/authorize",
        "https://login.microsoftonline.com:444/oauth2/v2.0/authorize",
        "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_secret=must-not-open",
        "javascript:alert(1)",
      ].map((url) => isAllowedPeopleOutlookAuthorizeUrl(url));
    });
    assert.deepEqual(decisions, [true, true, false, false, false, false, false, false, false]);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook connect keeps the begin DTO while desktop completion exposes only a safe result", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
      outlookAuthorizeUrl: microsoftAuthorizeUrl,
    });
    const actions = outlookPostActions(page);
    await page.addInitScript(() => {
      window.matterSession = {
        async openOutlookAuthorization(authorizeUrl) {
          window.__openedOutlookAuthorizeUrl = authorizeUrl;
          return { opened: true };
        },
        onOutlookConnectionResult(handler) {
          window.__deliverOutlookConnectionResult = handler;
          return () => delete window.__deliverOutlookConnectionResult;
        },
      };
    });
    await page.reload({ waitUntil: "networkidle" });

    await page.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await page.locator('[data-outlook-connection-state="consent_pending"]').waitFor();
    await page.evaluate(() => window.__deliverOutlookConnectionResult({
      type: "outlook_connection_result",
      status: "connected",
      http_status: 200,
      safe_error_code: null,
      employee_id: "emp-1",
      connection_state: "connected",
    }));
    await page.locator('[data-outlook-connection-result="connected"]').waitFor();

    assert.deepEqual(actions.map((item) => item.action), ["begin"]);
    assert.deepEqual(Object.keys(actions[0]).sort(), ["action", "idempotency_key"]);
    assert.match(actions[0].idempotency_key, uuidPattern);
    assert.equal(await page.evaluate(() => window.__openedOutlookAuthorizeUrl), microsoftAuthorizeUrl);
    assert.equal(await page.getByText("Outlook 일정을 연결했습니다.", { exact: true }).count(), 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook consent pending reopens the same authorization without another begin", async () => {
  const harness = await startPeopleOverviewHarness();
  const authorizeUrl = microsoftAuthorizeUrl;
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
      outlookAuthorizeUrl: authorizeUrl,
    });
    const actions = outlookPostActions(page);
    await page.addInitScript(() => {
      window.matterSession = {
        async openOutlookAuthorization(url) {
          window.__openedOutlookAuthorizeUrls = [
            ...(window.__openedOutlookAuthorizeUrls ?? []),
            url,
          ];
          return { opened: true };
        },
      };
    });
    await page.reload({ waitUntil: "networkidle" });

    const connection = page.locator('[data-outlook-connection-state="not_connected"]');
    await connection.getByRole("button", { name: "연결", exact: true }).click();
    const pending = page.locator('[data-outlook-connection-state="consent_pending"]');
    await pending.waitFor();
    await pending.getByRole("button", { name: "Microsoft 로그인 다시 열기", exact: true }).click();

    assert.deepEqual(actions.map((item) => item.action), ["begin"]);
    assert.deepEqual(
      await page.evaluate(() => window.__openedOutlookAuthorizeUrls),
      [authorizeUrl, authorizeUrl],
    );
    assert.equal(await page.getByRole("button", { name: "연결 다시 시작", exact: true }).count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook callback success clears the pending reopen action and missing authorization offers a fresh retry", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
      outlookAuthorizeUrl: microsoftAuthorizeUrl,
    });
    await page.addInitScript(() => {
      window.matterSession = {
        async openOutlookAuthorization() {
          return { opened: true };
        },
        onOutlookConnectionResult(handler) {
          window.__deliverOutlookConnectionResult = handler;
          return () => delete window.__deliverOutlookConnectionResult;
        },
      };
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    const pending = page.locator('[data-outlook-connection-state="consent_pending"]');
    await pending.waitFor();
    assert.equal(await pending.getByRole("button", { name: "Microsoft 로그인 다시 열기", exact: true }).count(), 1);

    let callbackConnectionState = null;
    await page.route("**/api/hrx/people/members/*/outlook-connection", async (route) => {
      if (route.request().method() !== "GET" || callbackConnectionState === null) return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ok",
          connection: {
            provider: "microsoft_graph",
            connection_state: callbackConnectionState,
            can_manage: true,
            delegated_scope: "Calendars.ReadBasic",
            connected_at: callbackConnectionState === "connected" ? "2026-07-30T09:00:00+09:00" : null,
            expires_at: callbackConnectionState === "connected" ? "2026-07-30T18:00:00+09:00" : null,
          },
        }),
      });
    });
    callbackConnectionState = "connected";
    await page.evaluate(() => window.__deliverOutlookConnectionResult({
      type: "outlook_connection_result",
      status: "connected",
      http_status: 200,
      safe_error_code: null,
      employee_id: "emp-1",
      connection_state: "connected",
    }));
    await page.locator('[data-outlook-connection-state="connected"]').waitFor();
    assert.equal(await page.getByRole("button", { name: "Microsoft 로그인 다시 열기", exact: true }).count(), 0);

    callbackConnectionState = "consent_pending";
    await page.evaluate(() => window.__deliverOutlookConnectionResult({
      type: "outlook_connection_result",
      status: "connected",
      http_status: 200,
      safe_error_code: null,
      employee_id: "emp-1",
      connection_state: "connected",
    }));
    const pendingWithoutAuthorization = page.locator('[data-outlook-connection-state="consent_pending"]');
    await pendingWithoutAuthorization.waitFor();
    assert.equal(await pendingWithoutAuthorization.getByRole("button", { name: "연결 다시 시작", exact: true }).count(), 1);
    assert.equal(await pendingWithoutAuthorization.getByRole("button", { name: "Microsoft 로그인 다시 열기", exact: true }).count(), 0);

    await page.close();

    const recoveryPage = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "consent_pending",
    });
    const actions = outlookPostActions(recoveryPage);
    const recovery = recoveryPage.locator('[data-outlook-connection-state="consent_pending"]');
    await recovery.waitFor();
    await recovery.getByRole("button", { name: "연결 다시 시작", exact: true }).click();
    await recovery.getByRole("button", { name: "연결 다시 시작", exact: true }).click();
    assert.equal(actions.length, 2);
    assert.equal(actions[0].action, "retry");
    assert.equal(actions[1].action, "retry");
    assert.match(actions[0].idempotency_key, uuidPattern);
    assert.match(actions[1].idempotency_key, uuidPattern);
    assert.notEqual(actions[0].idempotency_key, actions[1].idempotency_key);
    await recoveryPage.close();
  } finally {
    await harness.close();
  }
});

test("Outlook result bridge rejects raw OAuth fields and presents safe terminal errors", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
    });
    const actions = outlookPostActions(page);
    await page.addInitScript(() => {
      window.matterSession = {
        onOutlookConnectionResult(handler) {
          window.__deliverOutlookConnectionResult = handler;
          return () => delete window.__deliverOutlookConnectionResult;
        },
      };
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => window.__deliverOutlookConnectionResult({
      type: "outlook_connection_result",
      status: "connected",
      http_status: 200,
      safe_error_code: null,
      employee_id: "emp-1",
      connection_state: "connected",
      authorization_code: "must-not-reach-renderer",
    }));
    assert.equal(await page.locator("[data-outlook-connection-result]").count(), 0);

    await page.evaluate(() => window.__deliverOutlookConnectionResult({
      type: "outlook_connection_result",
      status: "expired",
      http_status: 400,
      safe_error_code: "OUTLOOK_OAUTH_STATE_EXPIRED",
      employee_id: null,
      connection_state: null,
    }));
    const notice = page.locator('[data-outlook-connection-result="expired"]');
    await notice.waitFor();
    assert.equal(await notice.getAttribute("role"), "alert");
    assert.equal(await notice.getByText("Outlook 연결 시간이 지났습니다. People에서 다시 연결해 주세요.", { exact: true }).count(), 1);
    assert.equal(actions.length, 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook idempotency conflict stays retryable and explains the failed connection attempt", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
    });
    let requestBody = null;
    await page.route("**/api/hrx/people/members/*/outlook-connection", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      requestBody = route.request().postDataJSON();
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ safe_error_code: "DOMAIN_IDEMPOTENCY_REQUIRED" }),
      });
    });

    await page.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await page.getByText("이전 연결 요청과 충돌했습니다. 다시 연결해 주세요.", { exact: true }).waitFor();

    assert.equal(requestBody.action, "begin");
    assert.match(requestBody.idempotency_key, uuidPattern);
    assert.equal(await page.getByRole("button", { name: "다시 시도", exact: true }).count(), 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("an unapproved Outlook authorization host never opens", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const unsafe = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
      outlookAuthorizeUrl: "https://login.microsoftonline.com.evil.example/oauth2/v2.0/authorize",
    });
    const initialUrl = unsafe.url();
    await unsafe.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await unsafe.getByText("허용되지 않은 Microsoft 로그인 주소가 차단되었습니다.", { exact: true }).waitFor();
    assert.equal(unsafe.url(), initialUrl);
    assert.equal(
      await unsafe.evaluate(() => sessionStorage.getItem("lawos.people.outlook-oauth.pending.v1")),
      null,
    );
    await unsafe.close();
  } finally {
    await harness.close();
  }
});

test("Outlook disconnect failure keeps the active connection visible", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "connected",
    });
    await page.route("**/api/hrx/people/members/*/outlook-connection", (route) => (
      route.request().method() === "DELETE"
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ safe_error_code: "OUTLOOK_DISCONNECT_FAILED" }),
          })
        : route.fallback()
    ));
    const connection = page.locator('[data-outlook-connection-state="connected"]');
    await connection.getByRole("button", { name: "연결 해제", exact: true }).click();
    await page.getByText("Outlook 연결을 해제하지 못했습니다. 기존 연결은 유지됩니다.", { exact: true }).waitFor();
    assert.equal(await connection.count(), 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("desktop Outlook result stays visible when the member detail is not mounted", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
    });
    const actions = outlookPostActions(page);
    await page.addInitScript(() => {
      window.matterSession = {
        onOutlookConnectionResult(handler) {
          window.__deliverOutlookConnectionResult = handler;
          return () => delete window.__deliverOutlookConnectionResult;
        },
      };
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "home");
      url.hash = "home-dashboard";
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.locator('[data-member-detail-employee="emp-1"]').waitFor({ state: "detached" });
    await page.evaluate(() => window.__deliverOutlookConnectionResult({
      type: "outlook_connection_result",
      status: "session_required",
      http_status: 401,
      safe_error_code: "SESSION_REQUIRED",
      employee_id: null,
      connection_state: null,
    }));
    const notice = page.locator('[data-outlook-connection-result="session_required"]');
    await notice.waitFor();
    assert.equal(await notice.getByText("LawOS에 다시 로그인한 뒤 Outlook 연결을 완료해 주세요.", { exact: true }).count(), 1);
    assert.equal(actions.length, 0);
    await notice.getByRole("button", { name: "Outlook 연결 알림 닫기", exact: true }).click();
    await notice.waitFor({ state: "detached" });
    await page.close();
  } finally {
    await harness.close();
  }
});
