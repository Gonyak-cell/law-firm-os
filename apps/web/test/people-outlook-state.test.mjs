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

function peopleOutlookCallbackUrl(baseUrl, params) {
  const url = new URL("/", baseUrl);
  url.search = new URLSearchParams({
    view: "people",
    ctx: "allow",
    employee: "emp-1",
    tab: "today",
    ...params,
  }).toString();
  url.hash = "people-overview";
  return url.toString();
}

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

test("Outlook connect keeps begin DTO, returns through the People route, and completes once", async () => {
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
    await page.route("https://login.microsoftonline.com/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<script>location.replace(${JSON.stringify(peopleOutlookCallbackUrl(harness.baseUrl, {
        code: "authorization-code-1",
        state: "oauth-state-1",
      }))})</script>`,
    }));

    await page.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await page.locator('[data-outlook-connection-state="connected"]').waitFor();
    await page.locator('[data-outlook-oauth-notice="success"]').waitFor();

    assert.deepEqual(actions.map((item) => item.action), ["begin", "complete"]);
    assert.deepEqual(actions[1], {
      action: "complete",
      authorization_code: "authorization-code-1",
      state_ref: "oauth-state-1",
    });
    assert.equal(new URL(page.url()).searchParams.has("code"), false);
    assert.equal(new URL(page.url()).searchParams.has("state"), false);
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("lawos.people.outlook-oauth.pending.v1")),
      null,
    );
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook callback rejects state mismatch without completing and supports a fresh retry", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    let validState = false;
    const page = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
      outlookAuthorizeUrl: microsoftAuthorizeUrl,
    });
    const actions = outlookPostActions(page);
    await page.route("https://login.microsoftonline.com/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<script>location.replace(${JSON.stringify(peopleOutlookCallbackUrl(harness.baseUrl, {
        code: "authorization-code-2",
        state: validState ? "oauth-state-1" : "oauth-state-mismatch",
      }))})</script>`,
    }));

    await page.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await page.locator('[data-outlook-oauth-notice="error"]').waitFor();
    assert.equal(actions.filter((item) => item.action === "complete").length, 0);
    assert.equal(new URL(page.url()).searchParams.has("code"), false);
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("lawos.people.outlook-oauth.pending.v1") !== null),
      true,
    );

    const pollutedCallback = new URL(page.url());
    pollutedCallback.searchParams.set("code", "authorization-code-polluted");
    pollutedCallback.searchParams.append("state", "oauth-state-1");
    pollutedCallback.searchParams.append("state", "oauth-state-mismatch");
    await page.goto(pollutedCallback.toString(), { waitUntil: "networkidle" });
    await page.getByText("연결 요청을 확인하지 못했습니다. 다시 연결해 주세요.", { exact: true }).waitFor();
    assert.equal(actions.filter((item) => item.action === "complete").length, 0);

    validState = true;
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await page.locator('[data-outlook-connection-state="connected"]').waitFor();
    assert.equal(actions.filter((item) => item.action === "complete").length, 1);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("Outlook cancellation remains retryable and an unapproved authorization host never opens", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const cancelled = await openPeopleOverviewPage({
      ...harness,
      employeeId: "emp-1",
      tab: "today",
      outlookCalendarEnabled: true,
      outlookMode: "not_connected",
      outlookAuthorizeUrl: microsoftAuthorizeUrl,
    });
    const cancelledActions = outlookPostActions(cancelled);
    await cancelled.route("https://login.microsoftonline.com/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<script>location.replace(${JSON.stringify(peopleOutlookCallbackUrl(harness.baseUrl, {
        error: "access_denied",
        state: "oauth-state-1",
      }))})</script>`,
    }));
    await cancelled.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await cancelled.locator('[data-outlook-oauth-notice="cancelled"]').waitFor();
    assert.equal(cancelledActions.filter((item) => item.action === "complete").length, 0);
    assert.equal(await cancelled.getByRole("button", { name: "다시 시도", exact: true }).count(), 1);
    await cancelled.close();

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

test("desktop auth callback bridge completes a pending Outlook request only once", async () => {
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
        onAuthCallbackDeepLink(handler) {
          window.__deliverOutlookCallback = handler;
          return () => {
            delete window.__deliverOutlookCallback;
          };
        },
      };
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-outlook-connection-state="not_connected"]').waitFor();
    await page.locator('[data-outlook-connection-state="not_connected"]')
      .getByRole("button", { name: "연결", exact: true })
      .click();
    await page.locator('[data-outlook-connection-state="consent_pending"]').waitFor();
    assert.equal(await page.evaluate(() => window.__openedOutlookAuthorizeUrl), microsoftAuthorizeUrl);
    assert.equal(new URL(page.url()).hostname, "127.0.0.1");
    const callbackAck = await page.evaluate(async () => {
      const callback = {
        type: "auth_callback",
        routeOnly: true,
        code: "desktop-authorization-code-1",
        state: "oauth-state-1",
      };
      const completion = window.__deliverOutlookCallback(callback);
      const duplicate = window.__deliverOutlookCallback(callback);
      const returnsPromise = typeof completion?.then === "function";
      await Promise.all([completion, duplicate]);
      return { returnsPromise };
    });
    assert.deepEqual(callbackAck, { returnsPromise: true });
    await page.locator('[data-outlook-connection-state="connected"]').waitFor();
    assert.equal(actions.filter((item) => item.action === "complete").length, 1);
    assert.deepEqual(actions.map((item) => item.action), ["begin", "complete"]);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("expired Outlook callback state is cleared without calling complete", async () => {
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
    await page.evaluate(() => {
      sessionStorage.setItem("lawos.people.outlook-oauth.pending.v1", JSON.stringify({
        schema_version: "lawos.people.outlook-oauth-pending.v1",
        employee_id: "emp-1",
        state_ref: "oauth-state-1",
        started_at: Date.now() - (11 * 60 * 1000),
      }));
    });
    const callbackUrl = new URL(page.url());
    callbackUrl.searchParams.set("code", "expired-authorization-code");
    callbackUrl.searchParams.set("state", "oauth-state-1");
    await page.goto(callbackUrl.toString(), { waitUntil: "networkidle" });
    await page.getByText("연결 요청 시간이 지났습니다. 다시 연결해 주세요.", { exact: true }).waitFor();
    assert.equal(actions.filter((item) => item.action === "complete").length, 0);
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("lawos.people.outlook-oauth.pending.v1")),
      null,
    );
    assert.equal(new URL(page.url()).searchParams.has("code"), false);
    await page.close();
  } finally {
    await harness.close();
  }
});
