#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  assertFocusStateDelta,
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
    `${web.origin}/?tenantId=tenant-t05&matterId=matter-t05`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector(
    "[data-outlook-addin-taskpane='true']",
  );

  assert.equal(
    writes.length,
    0,
    "화면을 열기만 해서는 쓰기 요청이 없어야 한다",
  );
  assert.equal(
    await page.getByRole("button", {
      name: "새 문의 등록",
    }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", {
      name: "기존 문의에 연결",
    }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", {
      name: "Matter에 보관",
    }).count(),
    1,
  );
  await page.getByLabel("연결할 문의").selectOption(
    "lead-existing-t05",
  );
  await page.getByLabel("보관할 Matter").selectOption(
    "matter-t05",
  );

  const newInquiry = page.getByRole("button", {
    name: "새 문의 등록",
  });
  const unfocusedSnapshot = await newInquiry.evaluate(readFocusSnapshot);
  await newInquiry.focus();
  // Move focus through the keyboard so Chromium applies :focus-visible to the
  // actual action target, then inspect the computed ring instead of merely
  // checking that a native button happens to be focusable.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focusSnapshot = await newInquiry.evaluate(readFocusSnapshot);
  assertFocusStateDelta(unfocusedSnapshot, focusSnapshot, "문의 등록 버튼");

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
      cssText: "outline: none; border: 1px solid transparent; box-shadow: 0 0 0 3px rgb(143, 194, 238); background: rgb(23, 33, 43);",
      focusCssText: "#outm36-compound-hidden-shadow-fixture:focus-visible { border-color: rgb(0, 0, 0) !important; outline-color: rgb(0, 0, 0) !important; box-shadow: 0 0 0 3px rgb(143, 194, 238) !important; }",
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
