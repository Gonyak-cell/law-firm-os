import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  openPeopleOverviewPage,
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

const overviewBlocks = [
  { id: "people-action-queues", slug: "action-queues" },
  { id: "people-intraday-timeline", slug: "intraday-timeline" },
  { id: "people-workload-stage-one", slug: "workload-stage-one" },
  { id: "people-attention-window", slug: "attention-window" },
  { id: "people-deadline-staffing", slug: "deadline-staffing" },
];

async function scrollIntoVisibleViewport(page, locator) {
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
  assert.ok(metrics.visible_width > 0, "dashboard block must intersect the viewport horizontally");
  assert.ok(metrics.visible_height > 0, "dashboard block must intersect the viewport vertically");
  return metrics;
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

test("People overview distinguishes loading, empty, error, denied, partial, and stale states", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const expected = {
      loading: "loading",
      empty: "empty",
      error: "error",
      denied: "denied",
      partial: "partial",
      stale: "stale",
    };
    for (const [mode, state] of Object.entries(expected)) {
      const page = await openPeopleOverviewPage({ ...harness, mode });
      try {
        await page.locator(`[data-people-overview-state="${state}"]`).first().waitFor();
        if (mode === "partial") {
          assert.ok(await page.locator('[data-people-overview-block-state="partial"]').count() >= 4);
          assert.ok(await page.locator('[data-source-state="blocked"]').count() >= 1);
        }
        if (mode === "stale") {
          assert.ok(await page.getByText("업데이트 지연", { exact: true }).count() >= 1);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await harness.close();
  }
});

test("People overview renders five operational blocks without dead actions and records three viewports", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-020");
  await mkdir(evidenceDir, { recursive: true });
  const receipt = {
    schema_version: "lawos.people-v2.overview-visual-evidence.v1",
    captured_at: null,
    browser: {
      locale: "ko-KR",
      timezone: "Asia/Seoul",
    },
    nested_scroll_container: ".page-canvas",
    source_files: [],
    cases: [],
  };
  try {
    const cases = [
      { name: "desktop-1440", viewport: { width: 1440, height: 1000 } },
      { name: "desktop-1024", viewport: { width: 1024, height: 900 } },
      { name: "mobile-390", viewport: { width: 390, height: 844 } },
    ];
    for (const item of cases) {
      const page = await openPeopleOverviewPage({ ...harness, viewport: item.viewport });
      try {
        await page.locator(".people-operations-overview").waitFor();
        const browserConfig = await page.evaluate(() => ({
          navigator_language: navigator.language,
          formatter_locale: new Intl.DateTimeFormat().resolvedOptions().locale,
          timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));
        assert.equal(browserConfig.navigator_language, "ko-KR");
        assert.equal(browserConfig.timezone, "Asia/Seoul");
        assert.equal(await page.locator(".people-overview-panel").count(), 5);
        assert.equal(await page.locator(".people-operations-overview button:disabled").count(), 0);
        assert.equal(await page.locator("#people-action-queues .people-source-status").count(), 1);
        assert.equal(await page.locator("#people-intraday-timeline .people-source-status").count(), 1);
        assert.equal(await page.locator("#people-workload-stage-one .people-source-status").count(), 1);
        assert.equal(await page.locator("#people-attention-window .people-source-status").count(), 1);
        assert.equal(await page.locator("#people-deadline-staffing .people-source-status").count(), 1);
        await scrollIntoVisibleViewport(page, page.locator(".people-overview-heading"));
        const overviewPath = join(evidenceDir, `${item.name}.png`);
        await page.screenshot({
          path: overviewPath,
          fullPage: false,
        });
        const blockEvidence = [];
        for (const block of overviewBlocks) {
          const locator = page.locator(`#${block.id}`);
          const viewportIntersection = await scrollIntoVisibleViewport(page, locator);
          const path = join(evidenceDir, `${item.name}-${block.slug}.png`);
          let interaction = null;
          if (item.name === "desktop-1024" && block.id === "people-intraday-timeline") {
            const rightEdgeEvent = page.locator('.people-timeline-block[title^="의견서 작성"]').first();
            await rightEdgeEvent.focus();
            await rightEdgeEvent.click();
            const detail = page.locator('[data-people-timeline-detail="active"]');
            await detail.waitFor({ state: "visible" });
            const detailText = await detail.innerText();
            assert.match(detailText, /의견서 작성/);
            assert.match(detailText, /14:00–15:30/);
            interaction = {
              event_title: await rightEdgeEvent.getAttribute("title"),
              interaction: ["focus", "click"],
              detail_selector: '[data-people-timeline-detail="active"]',
              detail_text: detailText,
              detail_title: "의견서 작성",
              detail_time: "14:00–15:30",
            };
          }
          await locator.screenshot({ path });
          blockEvidence.push({
            block_id: block.id,
            file: `artifacts/people-v2/PEO-TUW-020/${item.name}-${block.slug}.png`,
            sha256: await sha256(path),
            viewport_intersection: viewportIntersection,
            ...(interaction ? { interaction } : {}),
          });
        }
        receipt.cases.push({
          name: item.name,
          viewport: item.viewport,
          browser: browserConfig,
          overview_file: `artifacts/people-v2/PEO-TUW-020/${item.name}.png`,
          overview_sha256: await sha256(overviewPath),
          blocks: blockEvidence,
        });
      } finally {
        await page.close();
      }
    }
    receipt.captured_at = new Date().toISOString();
    receipt.source_files = await Promise.all([
      "apps/web/src/people/PeopleHome.tsx",
      "apps/web/src/people/overview/PeopleOverview.tsx",
      "apps/web/src/styles.css",
      "apps/web/test/people-overview-test-support.mjs",
      "apps/web/test/people-overview-ui.test.mjs",
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
