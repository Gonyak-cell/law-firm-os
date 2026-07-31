import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { handleHrxApiRequest } from "../../api/src/hrx-runtime-context.js";
import {
  openPeopleOverviewPage,
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

async function scrollIntoVisibleViewport(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible" });
  const metrics = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      visible_width: Math.max(0, Math.round(Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0))),
      visible_height: Math.max(0, Math.round(Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0))),
    };
  });
  assert.ok(metrics.visible_width > 0, "timeline evidence must intersect the viewport horizontally");
  assert.ok(metrics.visible_height > 0, "timeline evidence must intersect the viewport vertically");
  return metrics;
}

async function browserConfiguration(page) {
  const config = await page.evaluate(() => ({
    navigator_language: navigator.language,
    formatter_locale: new Intl.DateTimeFormat().resolvedOptions().locale,
    timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
  assert.equal(config.navigator_language, "ko-KR");
  assert.equal(config.timezone, "Asia/Seoul");
  return config;
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function actualCrossMidnightPeopleEnvelope() {
  const tenantId = "tenant-cross-midnight-browser";
  const employeeId = "emp-cross-midnight";
  const userId = "user-cross-midnight";
  const matterId = "matter-cross-midnight";
  const context = {
    repository: createInMemoryHrxRepository({
      employees: [{
        tenant_id: tenantId,
        employee_id: employeeId,
        display_name: "김교차",
        status: "active",
        title: "변호사",
      }],
      employee_user_links: [{
        tenant_id: tenantId,
        link_id: "link-cross-midnight",
        employee_id: employeeId,
        user_id: userId,
        purpose: "login_mapping",
        source_ref: "test:cross-midnight-browser",
      }],
    }),
    audit: createHrxAuditEventStore(),
    clock: () => "2026-07-30T00:30:00.000Z",
    peopleTimezone: "Asia/Seoul",
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: false,
      outlook_calendar: false,
      people_capacity: false,
      leave_projection: false,
    },
  };
  const records = [
    {
      model_type: "Matter",
      tenant_id: tenantId,
      matter_id: matterId,
      matter_code: "L-CROSS",
      matter_name: "교차일 사건",
      title: "교차일 사건",
      status: "open",
    },
    {
      model_type: "MatterMember",
      tenant_id: tenantId,
      matter_id: matterId,
      member_id: "member-cross-midnight",
      employee_id: employeeId,
      user_id: userId,
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    },
    {
      model_type: "MatterTask",
      tenant_id: tenantId,
      matter_id: matterId,
      task_id: "task-previous-day-overlap",
      title: "전날부터 이어진 업무",
      status: "todo",
      assigned_to_user_id: userId,
      starts_at: "2026-07-29T12:50:00.000Z",
      ends_at: "2026-07-29T22:20:00.000Z",
    },
    {
      model_type: "MatterTask",
      tenant_id: tenantId,
      matter_id: matterId,
      task_id: "task-exact-midnight-end",
      title: "자정에 끝난 업무",
      status: "todo",
      assigned_to_user_id: userId,
      starts_at: "2026-07-29T12:00:00.000Z",
      ends_at: "2026-07-29T15:00:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: tenantId,
      matter_id: matterId,
      event_id: "hearing-previous-day-overlap",
      title: "전날부터 이어진 재판 일정",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-29T14:50:00.000Z",
      ends_at: "2026-07-29T15:20:00.000Z",
    },
  ];
  const result = handleHrxApiRequest({
    pathname: "/api/hrx/people/team-operations",
    method: "GET",
    context,
    matterContext: {
      repository: {
        list({ tenant_id, model_type }) {
          return records.filter((record) => (
            record.tenant_id === tenant_id && record.model_type === model_type
          ));
        },
      },
    },
    requestContext: {
      tenant_id: tenantId,
      actor_id: userId,
      actor_role: "people_ops",
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: {
      principal: {
        user_id: userId,
        tenant_id: tenantId,
        role_ids: ["people_ops"],
      },
      rules: [
        { id: "allow-employee-read", effect: "allow", action: "hrx.employee.read" },
        { id: "allow-matter-read", effect: "allow", action: "matter:read" },
      ],
      object_acl: [],
    },
  });
  assert.equal(result.status, 200);
  return result.body;
}

async function timelineBlockPresentation(locator) {
  return locator.evaluate((element) => {
    const title = element.querySelector("strong");
    const time = element.querySelector("span");
    return {
      duration_minutes: Number(element.getAttribute("data-duration-minutes")),
      geometry: {
        left: element.style.left,
        width: element.style.width,
        top: element.style.top,
      },
      title_font_size: Number.parseFloat(getComputedStyle(title).fontSize),
      time_font_size: Number.parseFloat(getComputedStyle(time).fontSize),
    };
  });
}

async function assertReadableTimelineDetail(page, {
  locator,
  title,
  time,
  interaction,
}) {
  const detail = page.locator('[data-people-timeline-detail="active"]');
  const before = await timelineBlockPresentation(locator);
  if (interaction === "focus") {
    await locator.focus();
  } else {
    await locator.click();
  }
  await detail.waitFor();
  const detailText = await detail.innerText();
  assert.match(detailText, new RegExp(title));
  assert.match(detailText, new RegExp(time));
  const detailFontSizes = await detail.locator("span, strong, time").evaluateAll((elements) => (
    elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  ));
  assert.ok(detailFontSizes.every((fontSize) => fontSize >= 12));
  const after = await timelineBlockPresentation(locator);
  assert.deepEqual(after.geometry, before.geometry, "detail interaction must not change timeline geometry");
  assert.ok(after.title_font_size >= 12);
  assert.ok(after.time_font_size >= 12);
  return after;
}

test("timeline range, minute placement, and overlap lanes are deterministic", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const {
      getPeopleTimelineRange,
      layoutPeopleTimelineIntervals,
    } = await harness.server.ssrLoadModule("/src/people/overview/PeopleOverview.tsx");
    const members = [{
      today_intervals: [
        { title: "10분 업무", starts_at: "2026-07-30T08:10:00+09:00", ends_at: "2026-07-30T08:20:00+09:00" },
        { title: "20분 업무", starts_at: "2026-07-30T09:10:00+09:00", ends_at: "2026-07-30T09:30:00+09:00" },
        { title: "겹친 일정", starts_at: "2026-07-30T09:20:00+09:00", ends_at: "2026-07-30T10:00:00+09:00" },
      ],
    }];
    assert.deepEqual(getPeopleTimelineRange(members, "Asia/Seoul"), {
      startMinute: 480,
      endMinute: 1080,
    });
    const layout = layoutPeopleTimelineIntervals(members[0].today_intervals, "Asia/Seoul", 480, 1080);
    assert.equal(layout[0].startMinute, 490);
    assert.equal(layout[0].endMinute, 500);
    assert.ok(Math.abs(layout[0].widthPercent - (10 / 600 * 100)) < 0.000001);
    assert.deepEqual(layout.slice(1).map(({ lane }) => lane), [0, 1]);
    assert.equal(layout[1].laneCount, 2);
    assert.equal(layout[2].laneCount, 2);
  } finally {
    await harness.close();
  }
});

test("timeline clips cross-midnight intervals to the requested tenant date with half-open bounds", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const {
      getPeopleTimelineRange,
      layoutPeopleTimelineIntervals,
    } = await harness.server.ssrLoadModule("/src/people/overview/PeopleOverview.tsx");
    const intervals = [
      {
        title: "전날부터 이어진 업무",
        starts_at: "2026-07-29T12:50:00.000Z",
        ends_at: "2026-07-29T22:20:00.000Z",
      },
      {
        title: "자정에 끝난 일정",
        starts_at: "2026-07-29T12:00:00.000Z",
        ends_at: "2026-07-29T15:00:00.000Z",
      },
      {
        title: "다음 날까지 이어지는 일정",
        starts_at: "2026-07-30T12:50:00.000Z",
        ends_at: "2026-07-30T15:20:00.000Z",
      },
    ];
    const members = [{ today_intervals: intervals }];
    const asOf = "2026-07-30T00:30:00.000Z";

    const range = getPeopleTimelineRange(members, "Asia/Seoul", asOf);
    assert.deepEqual(range, {
      startMinute: 360,
      endMinute: 1320,
    });
    const layout = layoutPeopleTimelineIntervals(
      intervals,
      "Asia/Seoul",
      360,
      1320,
      asOf,
    );
    assert.deepEqual(
      layout.map(({ interval, startMinute, endMinute }) => ({
        title: interval.title,
        startMinute,
        endMinute,
      })),
      [
        { title: "전날부터 이어진 업무", startMinute: 360, endMinute: 440 },
        { title: "다음 날까지 이어지는 일정", startMinute: 1310, endMinute: 1320 },
      ],
    );
  } finally {
    await harness.close();
  }
});

test("actual team-operations API renders the same clipped cross-midnight time in Today and timeline", async () => {
  const envelope = actualCrossMidnightPeopleEnvelope();
  const queueRows = envelope.data.action_queues.today_tasks.rows;
  const queueTask = queueRows.find(({ queue_id }) => queue_id === "task:task-previous-day-overlap");
  const timelineTask = envelope.data.team_members[0].today_intervals
    .find(({ task_id }) => task_id === "task-previous-day-overlap");
  assert.deepEqual(
    {
      sort_at: queueTask.sort_at,
      starts_at: queueTask.starts_at,
      ends_at: queueTask.ends_at,
    },
    {
      sort_at: "2026-07-29T15:00:00.000Z",
      starts_at: "2026-07-29T15:00:00.000Z",
      ends_at: "2026-07-29T22:20:00.000Z",
    },
  );
  assert.deepEqual(
    {
      starts_at: timelineTask.starts_at,
      ends_at: timelineTask.ends_at,
    },
    {
      starts_at: queueTask.starts_at,
      ends_at: queueTask.ends_at,
    },
  );

  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-FIX-TODAY-CROSS-MIDNIGHT");
  const evidencePath = join(evidenceDir, "cross-midnight-api-browser.json");
  const screenshotPath = join(evidenceDir, "cross-midnight-people-overview.png");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      viewport: { width: 1024, height: 900 },
      teamOperationsResponse: envelope,
    });
    try {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator(".people-operations-overview").waitFor();
      const queueRow = page
        .locator('[data-people-action-queue="today_tasks"] li')
        .filter({ hasText: "전날부터 이어진 업무" });
      assert.equal(await queueRow.count(), 1);
      const queueText = await queueRow.innerText();
      assert.match(queueText, /7\. 30\./);
      assert.match(queueText, /00:00/);
      assert.doesNotMatch(queueText, /7\. 29\./);
      assert.equal(await page.getByText("자정에 끝난 업무", { exact: true }).count(), 0);

      const timelineBlock = page.locator(
        '.people-timeline-block[title^="전날부터 이어진 업무"]',
      );
      await timelineBlock.waitFor();
      const timelineTitle = await timelineBlock.getAttribute("title");
      assert.equal(timelineTitle, "전날부터 이어진 업무 / 00:00–07:20");
      assert.equal(await timelineBlock.getAttribute("data-duration-minutes"), "80");
      assert.equal(await timelineBlock.evaluate((element) => element.style.left), "0%");
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });

      const browser = await browserConfiguration(page);
      const receipt = {
        schema_version: "lawos.people-v2.cross-midnight-api-browser-evidence.v2",
        capture_mode: "deterministic_api_browser_contract",
        runtime: process.version,
        timezone: "Asia/Seoul",
        as_of: envelope.as_of,
        half_open_interval_semantics: "[start,end)",
        api: {
          status: 200,
          today_queue_row: {
            queue_id: queueTask.queue_id,
            sort_at: queueTask.sort_at,
            starts_at: queueTask.starts_at,
            ends_at: queueTask.ends_at,
          },
          timeline_interval: {
            task_id: timelineTask.task_id,
            starts_at: timelineTask.starts_at,
            ends_at: timelineTask.ends_at,
          },
          exact_midnight_end_absent: queueRows.every(({ queue_id }) => (
            queue_id !== "task:task-exact-midnight-end"
          )),
        },
        browser: {
          ...browser,
          viewport: { width: 1024, height: 900 },
          today_row_text: queueText,
          timeline_title: timelineTitle,
          timeline_visible_duration_minutes: 80,
          timeline_left: "0%",
          screenshot: "artifacts/people-v2/PEO-FIX-TODAY-CROSS-MIDNIGHT/cross-midnight-people-overview.png",
          screenshot_sha256: await sha256(screenshotPath),
        },
        assertions: {
          api_queue_and_timeline_match: (
            queueTask.starts_at === timelineTask.starts_at
            && queueTask.ends_at === timelineTask.ends_at
          ),
          today_uses_tenant_midnight: /7\. 30\.[\s\S]*00:00/.test(queueText),
          previous_day_time_absent: !/7\. 29\./.test(queueText),
          rendered_timeline_uses_clipped_interval: (
            timelineTitle === "전날부터 이어진 업무 / 00:00–07:20"
          ),
        },
        source_sha256: Object.fromEntries(await Promise.all([
          "packages/hrx/src/people-action-queues.js",
          "apps/api/src/hrx-runtime-context.js",
          "apps/web/src/people/overview/PeopleOverview.tsx",
          "apps/web/test/people-overview-test-support.mjs",
          "apps/web/test/people-intraday-timeline.test.mjs",
        ].map(async (file) => [file, await sha256(join(repoRoot, file))]))),
      };
      await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`);
      const recorded = JSON.parse(await readFile(evidencePath, "utf8"));
      assert.deepEqual(recorded.assertions, {
        api_queue_and_timeline_match: true,
        today_uses_tenant_midnight: true,
        previous_day_time_absent: true,
        rendered_timeline_uses_clipped_interval: true,
      });
    } finally {
      await page.close();
    }
  } finally {
    await harness.close();
  }
});

test("timeline renders one row per member, 30-minute grid, keyboard detail, and contained mobile scroll", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-023");
  await mkdir(evidenceDir, { recursive: true });
  const receipt = {
    schema_version: "lawos.people-v2.intraday-timeline-visual-evidence.v1",
    captured_at: null,
    browser: {
      locale: "ko-KR",
      timezone: "Asia/Seoul",
    },
    source_files: [],
    desktop: null,
    mobile: null,
    ten_member_density: null,
  };
  try {
    const desktop = await openPeopleOverviewPage({
      ...harness,
      teamSize: 10,
    });
    const desktopBrowser = await browserConfiguration(desktop);
    assert.equal(await desktop.locator("[data-people-timeline-member]").count(), 10);
    assert.equal(
      await desktop.locator('[data-people-timeline-member="emp-1"] .people-timeline-gridline').count(),
      21,
    );
    const shortBlock = desktop.locator('.people-timeline-block[title^="준비서면 검토"]').first();
    const twentyMinuteBlock = desktop.locator('.people-timeline-block[title^="증거목록 확인"]').first();
    assert.match(await shortBlock.getAttribute("title"), /08:10–08:20/);
    const desktopTenMinute = await assertReadableTimelineDetail(desktop, {
      locator: shortBlock,
      title: "준비서면 검토",
      time: "08:10–08:20",
      interaction: "focus",
    });
    assert.equal(desktopTenMinute.duration_minutes, 10);
    await shortBlock.press("Enter");
    assert.match(
      await desktop.locator('[data-people-timeline-detail="active"]').innerText(),
      /준비서면 검토[\s\S]*08:10–08:20/,
    );
    assert.equal(await desktop.locator('[data-people-detail-panel="open"]').count(), 0);
    const desktopTwentyMinute = await assertReadableTimelineDetail(desktop, {
      locator: twentyMinuteBlock,
      title: "증거목록 확인",
      time: "09:10–09:30",
      interaction: "click",
    });
    assert.equal(desktopTwentyMinute.duration_minutes, 20);
    assert.equal(await desktop.locator('[data-people-detail-panel="open"]').count(), 0);
    const desktopPanel = desktop.locator("#people-intraday-timeline");
    const desktopIntersection = await scrollIntoVisibleViewport(desktopPanel);
    const desktopRows = await desktop.locator("[data-people-timeline-member]").evaluateAll((rows) => (
      rows.map((row) => ({
        employee_id: row.getAttribute("data-people-timeline-member"),
        height: Math.round(row.getBoundingClientRect().height),
      }))
    ));
    assert.equal(desktopRows.length, 10);
    assert.ok(desktopRows.every(({ height }) => height >= 42));
    const desktopPath = join(evidenceDir, "timeline-desktop.png");
    await desktopPanel.screenshot({ path: desktopPath });
    const desktopOverlap = await desktop.locator('[data-people-timeline-member="emp-1"] .people-timeline-block').evaluateAll((blocks) => (
      blocks.map((block) => {
        const rect = block.getBoundingClientRect();
        return {
          title: block.getAttribute("title"),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
        };
      })
    ));
    assert.notEqual(desktopOverlap[1].top, desktopOverlap[2].top);
    receipt.desktop = {
      file: "artifacts/people-v2/PEO-TUW-023/timeline-desktop.png",
      sha256: await sha256(desktopPath),
      browser: desktopBrowser,
      viewport_intersection: desktopIntersection,
      member_count: 10,
      member_rows: desktopRows,
      half_hour_gridline_count: 21,
      overlap_blocks: desktopOverlap.slice(1),
      keyboard_detail_opened: true,
      short_schedule_readability: {
        ten_minute_focus: desktopTenMinute,
        twenty_minute_click: desktopTwentyMinute,
      },
    };
    await desktop.close();

    const mobile = await openPeopleOverviewPage({
      ...harness,
      viewport: { width: 390, height: 844 },
      teamSize: 10,
    });
    const mobileBrowser = await browserConfiguration(mobile);
    const mobilePanel = mobile.locator("#people-intraday-timeline");
    await scrollIntoVisibleViewport(mobilePanel);
    assert.equal(await mobile.locator("[data-people-timeline-member]").count(), 10);
    const mobileTenMinute = await assertReadableTimelineDetail(mobile, {
      locator: mobile.locator('.people-timeline-block[title^="준비서면 검토"]').first(),
      title: "준비서면 검토",
      time: "08:10–08:20",
      interaction: "focus",
    });
    assert.equal(mobileTenMinute.duration_minutes, 10);
    const mobileTwentyMinute = await assertReadableTimelineDetail(mobile, {
      locator: mobile.locator('.people-timeline-block[title^="증거목록 확인"]').first(),
      title: "증거목록 확인",
      time: "09:10–09:30",
      interaction: "click",
    });
    assert.equal(mobileTwentyMinute.duration_minutes, 20);
    assert.equal(await mobile.locator('[data-people-detail-panel="open"]').count(), 0);
    const mobileIntersection = await scrollIntoVisibleViewport(mobilePanel);
    const timelineScroll = mobile.locator(".people-timeline-scroll");
    assert.match(await timelineScroll.getAttribute("aria-label"), /좌우로 이동/);
    assert.equal(await timelineScroll.getAttribute("tabindex"), "0");
    const containment = await timelineScroll.evaluate(async (element) => {
      element.scrollLeft = Math.min(80, element.scrollWidth - element.clientWidth);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      return {
        scroll_width: element.scrollWidth,
        client_width: element.clientWidth,
        scroll_left: element.scrollLeft,
        right: element.getBoundingClientRect().right,
        viewport: window.innerWidth,
      };
    });
    assert.ok(containment.scroll_width > containment.client_width);
    assert.ok(containment.scroll_left > 0);
    assert.ok(containment.right <= containment.viewport + 1);
    const visibleOverlap = await mobile.locator('[data-people-timeline-member="emp-1"] .people-timeline-block').evaluateAll((blocks) => {
      const scroll = document.querySelector(".people-timeline-scroll");
      const scrollRect = scroll?.getBoundingClientRect();
      return blocks
        .map((block) => {
          const rect = block.getBoundingClientRect();
          return {
            title: block.getAttribute("title"),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            visible: Boolean(
              scrollRect
              && rect.right > scrollRect.left + 156
              && rect.left < scrollRect.right
              && rect.bottom > scrollRect.top
              && rect.top < scrollRect.bottom
              && rect.bottom > 0
              && rect.top < window.innerHeight
            ),
          };
        })
        .filter((block) => /증거목록 확인|변론기일/.test(block.title ?? ""));
    });
    assert.equal(visibleOverlap.length, 2);
    assert.ok(visibleOverlap.every((block) => block.visible));
    assert.notEqual(visibleOverlap[0].top, visibleOverlap[1].top);
    const mobilePath = join(evidenceDir, "timeline-mobile.png");
    await mobilePanel.screenshot({ path: mobilePath });
    const lastMember = mobile.locator('[data-people-timeline-member="emp-10"]');
    await lastMember.scrollIntoViewIfNeeded();
    const densityScroll = await mobile.locator(".page-canvas").evaluate((element) => {
      const lastRow = document.querySelector('[data-people-timeline-member="emp-10"]');
      const rect = lastRow?.getBoundingClientRect();
      return {
        scroll_height: element.scrollHeight,
        client_height: element.clientHeight,
        scroll_top: element.scrollTop,
        last_member_visible: Boolean(
          rect
          && rect.bottom > 0
          && rect.top < window.innerHeight
          && rect.right > 0
          && rect.left < window.innerWidth
        ),
      };
    });
    assert.ok(densityScroll.scroll_height > densityScroll.client_height);
    assert.ok(densityScroll.scroll_top > 0);
    assert.equal(densityScroll.last_member_visible, true);
    receipt.mobile = {
      file: "artifacts/people-v2/PEO-TUW-023/timeline-mobile.png",
      sha256: await sha256(mobilePath),
      browser: mobileBrowser,
      viewport: { width: 390, height: 844 },
      viewport_intersection: mobileIntersection,
      horizontal_scroll: containment,
      scroll_affordance: {
        keyboard_focusable: true,
        accessible_instruction: "구성원별 오늘 시간표. 좌우로 이동할 수 있습니다.",
      },
      short_schedule_readability: {
        ten_minute_focus: mobileTenMinute,
        twenty_minute_click: mobileTwentyMinute,
      },
      visible_overlap_blocks: visibleOverlap,
    };
    receipt.ten_member_density = {
      member_count: 10,
      desktop_row_heights: desktopRows,
      mobile_vertical_scroll: densityScroll,
      last_member: "emp-10",
    };
    await mobile.close();
    receipt.captured_at = new Date().toISOString();
    receipt.source_files = await Promise.all([
      "apps/web/src/people/PeopleHome.tsx",
      "apps/web/src/people/overview/PeopleOverview.tsx",
      "apps/web/src/styles.css",
      "apps/web/test/people-overview-test-support.mjs",
      "apps/web/test/people-intraday-timeline.test.mjs",
    ].map(async (file) => ({
      file,
      sha256: await sha256(join(repoRoot, file)),
    })));
    await writeFile(
      join(evidenceDir, "visual-evidence-receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  } finally {
    await harness.close();
  }
});
