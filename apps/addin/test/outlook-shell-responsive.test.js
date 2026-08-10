import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import {
  assertBuiltDist,
  measureShell,
  measurePrecedentResult,
  openProfile,
} from "./helpers/outlook-shell-responsive-browser.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "../../..");
const DIST_ROOT = path.join(ROOT, "apps/addin/dist");
const SCREENSHOT_DIR = path.join(ROOT, "output/playwright/outm12-responsive");
const PROFILES = Object.freeze([
  Object.freeze({
    id: "matter-full",
    path: "/addin/",
    railSelector: "[data-feature-id='mail.save-with-attachments']",
    overlaySelectors: [
      "[data-feature-id='mail.save-with-attachments']",
      "[data-feature-id='matter.search']",
      "[data-feature-id='task.create']",
      "[data-feature-id='time-entry.draft']",
      "[data-feature-id='all-functions']",
    ],
  }),
  Object.freeze({
    id: "inquiry-only",
    path: "/outlook-addin/",
    railSelector: "[data-feature-id='inquiry.entry']",
    overlaySelectors: ["[data-feature-id='inquiry.entry']"],
  }),
]);
const NARROW_WIDTHS = Object.freeze([160, 180, 240]);
const NORMAL_WIDTHS = Object.freeze([320, 360, 480]);

async function assertPrecedentResultGeometry(page, width) {
  const matterSearch = page.locator("[data-feature-id='matter.search']");
  await matterSearch.click();
  await page.locator(".outlook-overlay-panel").waitFor({ state: "visible" });
  await page.locator("#matter-search-input").fill("responsive");
  await page.waitForFunction(() => Boolean(document.querySelector("#matter-select option[value='matter-responsive']")));
  await page.locator("#matter-select").selectOption("matter-responsive");
  await page.waitForFunction(() => document.querySelector("#matter-select")?.value === "matter-responsive");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".outlook-overlay-panel", { state: "detached" });

  const allFunctions = page.locator("[data-feature-id='all-functions']");
  await allFunctions.click();
  await page.locator(".outlook-overlay-panel").waitFor({ state: "visible" });
  await page.locator("[data-testid='precedent-search-open']").click();
  await page.locator(".outlook-precedent-panel[data-ready='true']").waitFor({ state: "visible" });
  await page.locator("[data-testid='outlook-precedent-search-input']").fill("responsive");
  await page.locator("[data-testid='outlook-precedent-search-submit']").click();
  await page.locator("[data-testid='outlook-precedent-result']").waitFor({ state: "visible" });

  const result = await measurePrecedentResult(page);
  assert.equal(result.tagName, "BUTTON", `${width}px precedent result must remain a native button`);
  assert.equal(result.type, "button", `${width}px precedent result button type changed`);
  assert.equal(result.rowScrollWidth, result.rowClientWidth, `${width}px precedent result row overflows: ${JSON.stringify(result)}`);
  assert.equal(result.lineCount, 1, `${width}px precedent title wrapped: ${JSON.stringify(result)}`);
  assert.ok(result.icon && result.text && Math.abs(result.icon.top - result.text.top) <= 1, `${width}px precedent icon/title are not on one line: ${JSON.stringify(result)}`);
  assert.ok(result.textScrollWidth >= result.textClientWidth, `${width}px precedent title did not exercise clipping semantics: ${JSON.stringify(result)}`);
  assert.deepEqual(result.textStyle, {
    flexGrow: "1",
    minWidth: "0px",
    overflowX: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }, `${width}px precedent title lost one-line ellipsis styles`);
  const row = page.locator("[data-testid='outlook-precedent-result']");
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement("span");
    document.body.append(probe);
    const resolve = (property, token) => {
      probe.style[property] = root.getPropertyValue(token).trim();
      return getComputedStyle(probe)[property];
    };
    const tokens = { blue: resolve("color", "--am-blue"), blueSoft: resolve("backgroundColor", "--am-blue-soft"), text: resolve("color", "--am-text"), fontFamily: root.fontFamily, fontSize: root.fontSize };
    probe.remove();
    return tokens;
  });
  const basePaint = await row.evaluate((element) => {
    const style = getComputedStyle(element); return { backgroundColor: style.backgroundColor, color: style.color, fontFamily: style.fontFamily, fontSize: style.fontSize, textAlign: style.textAlign };
  });
  assert.equal(basePaint.backgroundColor, "rgba(0, 0, 0, 0)", `${width}px precedent row retained UA ButtonFace background: ${JSON.stringify(basePaint)}`);
  assert.equal(basePaint.color, tokens.text, `${width}px precedent row lost the AMIC text token: ${JSON.stringify(basePaint)}`);
  assert.equal(basePaint.fontFamily, tokens.fontFamily, `${width}px precedent row lost inherited font family`);
  assert.equal(basePaint.fontSize, tokens.fontSize, `${width}px precedent row lost inherited font size`);
  assert.equal(basePaint.textAlign, "start", `${width}px precedent row lost explicit text alignment`);
  await row.hover();
  const hoverPaint = await row.evaluate((element) => {
    const style = getComputedStyle(element); return { backgroundColor: style.backgroundColor, color: style.color };
  });
  assert.equal(hoverPaint.backgroundColor, tokens.blueSoft, `${width}px precedent hover did not use --am-blue-soft`);
  assert.equal(hoverPaint.color, tokens.blue, `${width}px precedent hover did not use --am-blue`);
  await row.click();
  await page.waitForFunction(() => document.querySelector("[data-testid='outlook-precedent-result']")?.getAttribute("aria-pressed") === "true");
  const selectedPaint = await row.evaluate((element) => {
    const style = getComputedStyle(element); return { backgroundColor: style.backgroundColor, color: style.color };
  });
  assert.equal(selectedPaint.backgroundColor, tokens.blueSoft, `${width}px selected precedent row did not use --am-blue-soft`);
  assert.equal(selectedPaint.color, tokens.blue, `${width}px selected precedent row did not use --am-blue`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `matter-full-${width}-precedent-results.png`), fullPage: true });
  const panel = await page.locator(".outlook-overlay-panel").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  assert.equal(panel.scrollWidth, panel.clientWidth, `${width}px precedent panel has inaccessible overflow: ${JSON.stringify(panel)}`);
  await page.locator(".outlook-overlay-panel").evaluate((element) => element.querySelector("button, input, select, textarea")?.focus());
  await page.keyboard.press("Escape");
  await page.waitForSelector(".outlook-overlay-panel", { state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("[data-feature-id='all-functions']")), true, `${width}px precedent close did not restore all-functions focus`);
}

async function assertResponsivePage(page, profile, {
  overlay = true,
  reducedMotion = true,
  screenshotPath = "",
  scrimCheck = false,
  precedentCheck = false,
} = {}) {
  if (precedentCheck) await assertPrecedentResultGeometry(page, page.viewportSize()?.width ?? 0);
  const shell = page.locator(".outlook-compact-shell");
  const before = await measureShell(page, profile);
  assert.equal(before.document.scrollWidth, before.document.clientWidth, `${profile.id} document overflows before overlay: ${JSON.stringify(before)}`);
  assert.equal(before.body.scrollWidth, before.body.clientWidth, `${profile.id} body overflows before overlay: ${JSON.stringify(before)}`);
  assert.equal(before.root.scrollWidth, before.root.clientWidth, `${profile.id} root overflows before overlay: ${JSON.stringify(before)}`);
  assert.equal(before.shell.scrollWidth, before.shell.clientWidth, `${profile.id} shell overflows before overlay: ${JSON.stringify(before)}`);
  assert.deepEqual(before.visibleLineFailures, [], `${profile.id} has a wrapped/clipped visible command before overlay: ${JSON.stringify(before)}`);
  assert.equal(before.shell.minWidth, "0px", `${profile.id} shell retains a global minimum width`);
  assert.equal(before.rail?.width, 44, `${profile.id} rail must remain 44 CSS px`);
  assert.equal(before.railButton?.width, 44, `${profile.id} rail target must remain 44 CSS px`);
  if (!overlay) return before;

  let focused = before;
  for (const [index, selector] of profile.overlaySelectors.entries()) {
    const opener = page.locator(selector);
    assert.equal(await opener.isEnabled(), true, `${profile.id} ${selector} unexpectedly disabled at ${before.viewportWidth}px`);
    await opener.click();
    await page.locator(".outlook-overlay-panel").waitFor({ state: "visible" });
    // Measure the settled geometry, not the 160ms entrance transform. The
    // reduced-motion assertion below separately proves the transform is absent.
    await page.waitForTimeout(220);
    const panel = page.locator(".outlook-overlay-panel");
    await assert.doesNotReject(() => panel.evaluate((element) => element.querySelector("button, input, select, textarea")?.focus()));
    const open = await measureShell(page, profile, selector);
    assert.equal(open.document.scrollWidth, open.document.clientWidth, `${profile.id} ${selector} document overflows with overlay: ${JSON.stringify(open)}`);
    assert.equal(open.body.scrollWidth, open.body.clientWidth, `${profile.id} ${selector} body overflows with overlay: ${JSON.stringify(open)}`);
    assert.equal(open.root.scrollWidth, open.root.clientWidth, `${profile.id} ${selector} root overflows with overlay: ${JSON.stringify(open)}`);
    assert.equal(open.shell.scrollWidth, open.shell.clientWidth, `${profile.id} ${selector} shell overflows with overlay: ${JSON.stringify(open)}`);
    assert.equal(open.panelGeometry.scrollWidth, open.panelGeometry.clientWidth, `${profile.id} ${selector} overlay content is clipped: ${JSON.stringify(open)}`);
    assert.deepEqual(open.visibleLineFailures, [], `${profile.id} ${selector} has a wrapped/clipped visible command at ${open.viewportWidth}px: ${JSON.stringify(open)}`);
    assert.deepEqual(open.clippedControls, [], `${profile.id} ${selector} has an inaccessible overlay control at ${open.viewportWidth}px: ${JSON.stringify(open)}`);
    assert.equal(open.panel.left >= 0 && open.panel.right <= open.viewportWidth, true, `${profile.id} ${selector} overlay leaves viewport: ${JSON.stringify(open)}`);
    if (reducedMotion) {
      assert.equal(open.reducedMotion.every(({ animationName, transform, transitionDuration, scrollBehavior }) => animationName === "none" && transform === "none" && transitionDuration === "0s" && scrollBehavior !== "smooth"), true, `${profile.id} reduced-motion styles were not applied: ${JSON.stringify(open)}`);
    }
    if (screenshotPath && index === 0) await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.keyboard.press("Escape");
    await page.waitForSelector(".outlook-overlay-panel", { state: "detached" });
    const restoredOpener = await page.evaluate((openerSelector) => {
      const opener = document.querySelector(openerSelector);
      return Boolean(opener && document.activeElement === opener);
    }, selector);
    assert.equal(restoredOpener, true, `${profile.id} ${selector} Escape did not restore focus to the exact opener`);
    focused = await measureShell(page, profile, selector);
    assert.equal(focused.focusStyle?.outlineOffset, "-2px", `${profile.id} ${selector} rail focus ring must stay inside the 44px target`);
    assert.match(focused.focusStyle?.boxShadow ?? "", /inset/u, `${profile.id} ${selector} rail focus ring must not be clipped by rail overflow`);
  }

  if (scrimCheck) {
    const openerSelector = profile.overlaySelectors[0];
    await page.locator(openerSelector).click();
    await page.locator(".outlook-overlay-panel").waitFor({ state: "visible" });
    await page.waitForTimeout(220);
    await page.locator(".outlook-overlay-scrim").click({ position: { x: 4, y: 4 } });
    await page.waitForSelector(".outlook-overlay-panel", { state: "detached" });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    const restoredAfterScrim = await page.evaluate((selector) => {
      const opener = document.querySelector(selector);
      return Boolean(opener && document.activeElement === opener);
    }, openerSelector);
    assert.equal(restoredAfterScrim, true, `${profile.id} scrim close did not restore focus after the deferred frame`);
  }

  // A disconnected opener must never regain focus. The overlay cleanup should
  // choose the first remaining enabled rail action, or the shell itself when
  // the profile has no remaining action.
  const fallbackSelector = profile.overlaySelectors.at(-1);
  await page.locator(fallbackSelector).click();
  await page.locator(".outlook-overlay-panel").waitFor({ state: "visible" });
  await page.locator(fallbackSelector).evaluate((element) => element.remove());
  await page.keyboard.press("Escape");
  await page.waitForSelector(".outlook-overlay-panel", { state: "detached" });
  const fallbackFocus = await page.evaluate(() => {
    const active = document.activeElement;
    const firstRail = document.querySelector(".outlook-icon-rail button:not([disabled]):not([aria-disabled='true'])");
    const shell = document.querySelector(".outlook-compact-shell");
    return {
      fallbackKind: active === firstRail ? "rail" : active === shell ? "shell" : "other",
      activeId: active?.id ?? null,
      firstRailId: firstRail?.id ?? null,
      shellFocused: active === shell,
    };
  });
  assert.notEqual(fallbackFocus.fallbackKind, "other", `${profile.id} disconnected opener left focus outside the shell: ${JSON.stringify(fallbackFocus)}`);
  return focused;
}

test("OUTM-12 actual built profiles reflow at 200% effective widths and keep the overlay reachable", async () => {
  await assertBuiltDist(DIST_ROOT);
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const web = await startOutlookAddinStaticServer({ distRoot: DIST_ROOT });
  const browser = await chromium.launch({ headless: true });
  const evidence = [];
  try {
    for (const profile of PROFILES) {
      for (const width of [...NARROW_WIDTHS, ...NORMAL_WIDTHS]) {
        const page = await openProfile(browser, web, profile, width, true);
        try {
          evidence.push({
            profile: profile.id,
            width,
            reducedMotion: true,
            metrics: await assertResponsivePage(page, profile, {
              scrimCheck: width === 320,
              precedentCheck: profile.id === "matter-full" && (width === 160 || width === 320),
              screenshotPath: width === 160 || width === 320
                ? path.join(SCREENSHOT_DIR, `${profile.id}-${width}-reduced.png`)
                : "",
            }),
          });
        } finally {
          await page.close();
        }
      }
      for (const width of NORMAL_WIDTHS) {
        const page = await openProfile(browser, web, profile, width, false);
        try {
          evidence.push({ profile: profile.id, width, reducedMotion: false, metrics: await assertResponsivePage(page, profile, { reducedMotion: false, scrimCheck: false }) });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
  assert.equal(evidence.length, PROFILES.length * (NARROW_WIDTHS.length + NORMAL_WIDTHS.length + NORMAL_WIDTHS.length));
});
