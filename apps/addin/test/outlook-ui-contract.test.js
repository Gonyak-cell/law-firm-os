import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import {
  OUTLOOK_UI_CONTRACT,
  isOfficeManifestScope,
} from "../src/outlook-ui-contract.js";
import { validateOutlookUiPage } from "./outlook-ui-browser-gate.js";
import { OUTM06_POSITIVE_CASES, OUTM06_REGRESSION_CASES } from "./outlook-ui-contract-cases.js";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "outm06");

async function fixturePage(browser, file, width) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pathToFileURL(path.join(FIXTURE_DIR, file)).href, { waitUntil: "load" });
  return page;
}

test("OUTM-06 browser contract runs in the normal add-in Node test path", async () => {
  assert.deepEqual(OUTLOOK_UI_CONTRACT.profiles, ["matter-full", "inquiry-only"]);
  assert.deepEqual(OUTLOOK_UI_CONTRACT.viewportWidths, [320, 360, 390]);
  assert.equal(OUTLOOK_UI_CONTRACT.requirements.criticalScrollerOnlySemanticMarker, true);
  assert.equal(OUTLOOK_UI_CONTRACT.requirements.officeManifestMetadataExempt, true);

  const browser = await chromium.launch();
  try {
    for (const row of [
      ["matter-full", "matter-full.html"],
      ["inquiry-only", "inquiry-only.html"],
    ]) {
      for (const width of OUTLOOK_UI_CONTRACT.viewportWidths) {
        const page = await fixturePage(browser, row[1], width);
        try {
          const result = await validateOutlookUiPage(page, { profile: row[0] });
          assert.equal(result.valid, true, row[1] + " at " + width + ": " + JSON.stringify(result.violations));
          assert.equal(result.viewportWidth, width);
          assert.ok(result.metrics.ariaSnapshots.length > 0);
          if (row[0] === "matter-full") {
            assert.equal(result.metrics.ariaSnapshots.some(({ snapshot }) => snapshot.includes('button "도움말"')), true);
          }
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
});

async function assertRejected(browser, file, expectedCodes) {
  const page = await fixturePage(browser, file, 320);
  try {
    const result = await validateOutlookUiPage(page, { profile: "matter-full" });
    const codes = [...new Set(result.violations.map(({ code }) => code))].sort();
    assert.equal(result.valid, false, file + " unexpectedly passed");
    assert.deepEqual(codes, [...expectedCodes].sort(), file + " violation drift");
    return codes;
  } finally {
    await page.close();
  }
}

test("isolated browser regressions use Playwright accessibility and rendered geometry", async () => {
  const browser = await chromium.launch();
  try {
    const unnamedPage = await fixturePage(browser, "unnamed-control.html", 320);
    const unnamed = unnamedPage.getByRole("button").first();
    assert.equal(await unnamed.ariaSnapshot(), "- button");
    await unnamedPage.close();
    for (const { fixture, expectedCodes } of OUTM06_REGRESSION_CASES.filter(({ fixture }) => fixture !== "legacy.html")) {
      const codes = await assertRejected(browser, fixture, expectedCodes);
      if (fixture === "renamed-surfaces.html") assert.equal(codes.includes("legacy_surface"), false);
    }
  } finally {
    await browser.close();
  }
});

test("explicit positive browser fixtures remain valid", async () => {
  const browser = await chromium.launch();
  try {
    for (const { fixture, profile } of OUTM06_POSITIVE_CASES) {
      const page = await fixturePage(browser, fixture, 320);
      try {
        const result = await validateOutlookUiPage(page, { profile });
        assert.equal(result.valid, true, fixture + ": " + JSON.stringify(result.violations));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("legacy surface remains rejected by the shared exact regression matrix", async () => {
  const browser = await chromium.launch();
  try {
    const legacy = OUTM06_REGRESSION_CASES.find(({ fixture }) => fixture === "legacy.html");
    await assertRejected(browser, legacy.fixture, legacy.expectedCodes);
  } finally {
    await browser.close();
  }
});

test("Office manifest metadata is exempt by path or explicit scope, never XML parsing", () => {
  assert.equal(isOfficeManifestScope({ pathName: "apps/addin/manifest.xml" }), true);
  assert.equal(isOfficeManifestScope({ pathName: "apps/addin/manifest.production.xml" }), true);
  assert.equal(isOfficeManifestScope({ pathName: "apps/addin/test/fixtures/outm06/office-manifest.xml" }), false);
  assert.equal(isOfficeManifestScope({ scope: "office-manifest" }), true);
});
