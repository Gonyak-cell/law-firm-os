#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  assertFocusStateDelta,
  assertPositiveFocusFixture,
  assertNegativeFocusFixture,
  readFocusSnapshot,
} from "./lib/outlook-addin-focus-proof.mjs";
import { setupOutlookInquiryProofPage } from "./lib/outlook-addin-browser-proof-fixture.mjs";
import { startOutlookAddinStaticServer } from "./lib/outlook-addin-static-server.mjs";
const ROOT = process.cwd();
const SCREENSHOT_PATH = process.env.LAWOS_OUTLOOK_ADDIN_SCREENSHOT
  ?? "/tmp/lawos-client-outlook-addin-t05.png";
async function serveDist() {
  return startOutlookAddinStaticServer({
    distRoot: resolve(ROOT, "apps/addin/dist"),
  });
}
const web = await serveDist();
const browser = await chromium.launch({ headless: true });
const writes = [];
const inquiryResults = new Map();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 980 },
  });
  await setupOutlookInquiryProofPage({
    page,
    web,
    writes,
    inquiryResults,
  });
  await page.goto(
    `${web.origin}/addin/index.html?tenantId=tenant-t05&matterId=matter-t05`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector(
    "[data-outlook-addin-taskpane='true']",
  );
  const fullProfile = await page.evaluate(() => window.__LAWOS_OUTLOOK_SURFACE_PROFILE);
  assert.deepEqual(fullProfile, { key: "matter-full", productId: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101", profile: { key: "matter-full", productId: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101" }, productionSourceLocation: "/addin/index.html", productionBase: "/addin/" });
  assert.equal(
    writes.length,
    0,
    "화면을 열기만 해서는 쓰기 요청이 없어야 한다",
  );
  assert.deepEqual(
    await Promise.all(["새 문의 등록", "기존 문의에 연결", "Matter에 보관"]
      .map((name) => page.getByRole("button", { name }).count())),
    [1, 1, 1],
  );
  await page.getByLabel("연결할 문의").selectOption(
    "lead-existing-t05",
  );
  await page.getByRole("button", {
    name: "Matter 찾기",
  }).click();
  const matterSearch = page.getByLabel("Matter 검색");
  await matterSearch.fill("A-2026-014");
  const matterSelect = page.getByLabel("보관할 Matter");
  await page.waitForFunction(() => (
    document.querySelector("#matter-select option[value='matter-t05']")
  ));
  const matterResponses = Promise.all(["/timeline", "/documents"].map((suffix) => page.waitForResponse((response) => response.request().method() === "GET" && response.status() === 200 && new URL(response.url()).pathname.endsWith(suffix))));
  await matterSelect.selectOption(
    "matter-t05",
  );
  await matterResponses;
  assert.equal(await page.locator("[data-testid='error-state']").count(), 0);
  const newInquiry = page.getByRole("button", {
    name: "새 문의 등록",
  });
  const unfocusedSnapshot = await newInquiry.evaluate(readFocusSnapshot);
  await newInquiry.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focusSnapshot = await newInquiry.evaluate(readFocusSnapshot);
  assertFocusStateDelta(unfocusedSnapshot, focusSnapshot, "문의 등록 버튼");
  assert.deepEqual(focusSnapshot.outline.color, [11, 101, 229, 1]);
  assert.equal(focusSnapshot.outline.width, 3);
  assert.ok(focusSnapshot.outline.contrast >= 4.8);
  const unfocusedSelectSnapshot = await matterSelect.evaluate(readFocusSnapshot);
  await matterSelect.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focusedSelectSnapshot = await matterSelect.evaluate(readFocusSnapshot);
  assertFocusStateDelta(
    unfocusedSelectSnapshot,
    focusedSelectSnapshot,
    "Matter 선택 필드",
  );
  assert.deepEqual(focusedSelectSnapshot.outline.color, [11, 101, 229, 1]);
  assert.equal(focusedSelectSnapshot.outline.width, 3);
  assert.ok(focusedSelectSnapshot.outline.contrast >= 4.8);
  await assertPositiveFocusFixture(
    page,
    {
      id: "outm36-product-color-gray-surface",
      label: "product focus outline on gray surface",
      cssText: "outline: none; border: 0; background: transparent;",
      focusCssText: "#outm36-product-color-gray-surface:focus-visible { outline: 3px solid rgb(11, 101, 229) !important; outline-offset: 2px; }",
      expectedColor: [11, 101, 229, 1],
      minimumContrast: 4.8,
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-low-contrast-legacy-color",
      label: "legacy low-contrast focus outline",
      cssText: "outline: 3px solid rgb(143, 194, 238); outline-offset: 2px; border: 0; background: transparent;",
      focusCssText: "#outm36-low-contrast-legacy-color:focus-visible { outline: 3px solid rgb(143, 194, 238) !important; outline-offset: 2px; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-background-only-outline-decoy",
      label: "background-only outline decoy",
      cssText: "outline: 3px solid rgb(143, 194, 238); outline-offset: 2px; border: 0; background: transparent;",
      focusCssText: "body:has(#outm36-background-only-outline-decoy:focus-visible) { background: rgb(0, 0, 0) !important; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-negative-focus-fixture",
      label: "negative focus fixture",
      cssText: "outline: none; border: 1px solid transparent; box-shadow: none;",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-permanent-shadow-border-change",
      label: "permanent shadow with 1px focus border fixture",
      cssText: "outline: none; border: 1px solid transparent; box-shadow: 0 0 0 3px rgb(143, 194, 238); background: rgb(23, 33, 43);",
      focusCssText: "#outm36-permanent-shadow-border-change:focus-visible { border-color: rgb(0, 0, 0) !important; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-permanent-border-outline-color",
      label: "permanent border with hidden outline-color fixture",
      cssText: "outline: none; border: 3px solid rgb(143, 194, 238); box-shadow: none; background: rgb(23, 33, 43);",
      focusCssText: "#outm36-permanent-border-outline-color:focus-visible { outline-color: rgb(0, 0, 0) !important; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-compound-hidden-shadow-fixture",
      label: "compound hidden-outline shadow fixture",
      cssText: "outline: none; border: 1px solid transparent; box-shadow: 0 0 0 3px rgb(143, 194, 238), inset 0 0 0 1px rgba(0, 0, 0, 0.35); background: rgb(23, 33, 43);",
      focusCssText: "#outm36-compound-hidden-shadow-fixture:focus-visible { border-color: rgb(0, 0, 0) !important; outline-color: rgb(0, 0, 0) !important; box-shadow: 0 0 0 3px rgb(143, 194, 238), inset 0 0 0 1px rgba(0, 0, 0, 0.35) !important; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-pixel-identical-focus-fixture",
      label: "pixel-identical focus fixture",
      cssText: "outline: none; border: 3px solid rgb(143, 194, 238); box-shadow: none; background: rgb(23, 33, 43);",
    },
  );
  await newInquiry.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='inquiry-status']")
      ?.getAttribute("data-lead-id") === "lead-new-t05"
  ));
  const firstLeadId = await page.locator(
    "[data-testid='inquiry-status']",
  ).getAttribute("data-lead-id");
  await newInquiry.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='inquiry-status']")
      ?.getAttribute("data-replay") === "true"
  ));
  assert.equal(
    await page.locator("[data-testid='inquiry-status']")
      .getAttribute("data-lead-id"),
    firstLeadId,
  );
  const linkInquiry = page.getByRole("button", {
    name: "기존 문의에 연결",
  });
  await linkInquiry.focus();
  await linkInquiry.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='inquiry-status']")
      ?.getAttribute("data-action") === "link_existing"
  ));
  const fileMatter = page.getByRole("button", {
    name: "Matter에 보관",
  });
  await fileMatter.focus();
  await fileMatter.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='email-status']")
      ?.getAttribute("data-outcome") === "created"
  ));

  const inquiryWrites = writes.filter(
    (entry) => entry.pathname === "/api/outlook/inquiries",
  );
  assert.equal(inquiryWrites.length, 3);
  assert.equal(
    inquiryWrites[0].body.idempotency_key,
    inquiryWrites[1].body.idempotency_key,
  );
  assert.equal(
    JSON.stringify(inquiryWrites)
      .includes("ews-id-must-not-enter-request"),
    false,
  );
  assert.equal(
    writes.filter(
      (entry) => entry.pathname === "/api/outlook/email/file",
    ).length,
    1,
  );
  const visibleText = await page.locator("body").innerText();
  assert.doesNotMatch(
    visibleText,
    /filing|provider-gated|timeline|warning|matter 연결/iu,
  );
  assert.equal(await page.locator("[data-testid='error-state']").count(), 0);
  await page.screenshot({
    path: SCREENSHOT_PATH,
    fullPage: true,
  });
  console.log(JSON.stringify({
    pass: true,
    no_click_writes: 0,
    inquiry_writes: inquiryWrites.length,
    replay_lead_id: firstLeadId,
    keyboard_actions_verified: 3,
    screenshot_path: SCREENSHOT_PATH,
    external_provider_executed: false,
    production_write_claim: false,
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolvePromise) => (
    web.server.close(resolvePromise)
  ));
}
