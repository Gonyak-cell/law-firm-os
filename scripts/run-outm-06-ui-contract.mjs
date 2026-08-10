#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import {
  OUTLOOK_UI_CONTRACT,
  isOfficeManifestScope,
} from "../apps/addin/src/outlook-ui-contract.js";
import { validateOutlookUiPage } from "../apps/addin/test/outlook-ui-browser-gate.js";
import { OUTM06_POSITIVE_CASES, OUTM06_REGRESSION_CASES } from "../apps/addin/test/outlook-ui-contract-cases.js";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const FIXTURE_DIR = path.join(REPO_ROOT, "apps", "addin", "test", "fixtures", "outm06");
const PROFILES = Object.freeze([
  { profile: "matter-full", file: "matter-full.html" },
  { profile: "inquiry-only", file: "inquiry-only.html" },
]);

async function openFixture(browser, file, width) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pathToFileURL(path.join(FIXTURE_DIR, file)).href, { waitUntil: "load" });
  return page;
}

async function cleanCases(browser) {
  const cases = [];
  for (const row of PROFILES) {
    for (const width of OUTLOOK_UI_CONTRACT.viewportWidths) {
      const page = await openFixture(browser, row.file, width);
      try {
        const result = await validateOutlookUiPage(page, { profile: row.profile });
        assert.equal(result.valid, true, row.file + " at " + width + ": " + JSON.stringify(result.violations));
        cases.push({
          profile: row.profile,
          fixture: row.file,
          viewport_width: width,
          passed: result.valid,
          violations: result.violations,
          metrics: result.metrics,
        });
      } finally {
        await page.close();
      }
    }
  }
  return cases;
}

async function negativeCase(browser, file, expectedCodes) {
  const page = await openFixture(browser, file, 320);
  try {
    const result = await validateOutlookUiPage(page, { profile: "matter-full" });
    assert.equal(result.valid, false, file + " unexpectedly passed");
    const codes = [...new Set(result.violations.map(({ code }) => code))].sort();
    assert.deepEqual(codes, [...expectedCodes].sort(), file + " violation drift");
    return { fixture: file, passed: true, violation_codes: codes };
  } finally {
    await page.close();
  }
}

async function positiveCases(browser) {
  const cases = [];
  for (const { fixture, profile } of OUTM06_POSITIVE_CASES) {
    const page = await openFixture(browser, fixture, 320);
    try {
      const result = await validateOutlookUiPage(page, { profile });
      assert.equal(result.valid, true, fixture + ": " + JSON.stringify(result.violations));
      cases.push({ fixture, profile, passed: true, violations: result.violations, metrics: result.metrics });
    } finally {
      await page.close();
    }
  }
  return cases;
}

export async function runOutm06UiContract() {
  const browser = await chromium.launch();
  try {
    const clean = await cleanCases(browser);
    const positive = await positiveCases(browser);
    const regressions = [];
    for (const { fixture, expectedCodes } of OUTM06_REGRESSION_CASES) {
      regressions.push(await negativeCase(browser, fixture, expectedCodes));
    }
    assert.equal(isOfficeManifestScope({ pathName: "apps/addin/manifest.production.xml" }), true);
    assert.equal(isOfficeManifestScope({ pathName: "apps/addin/test/fixtures/outm06/office-manifest.xml" }), false);
    assert.equal(isOfficeManifestScope({ scope: "office-manifest" }), true);
    return {
      schema_version: "law-firm-os.outm06.ui_contract.v2",
      task_id: "OUTM-06",
      contract: OUTLOOK_UI_CONTRACT.id,
      verdict: "PASS",
      clean,
      positive,
      negative: { regressions },
      office_manifest_scope_exempt: true,
      browser_gate: true,
      writes_artifacts: false,
      current_legacy_ui_required_to_pass: false,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  process.stdout.write(JSON.stringify(await runOutm06UiContract(), null, 2) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    process.stderr.write(String(error?.stack || error) + "\n");
    process.exitCode = 1;
  });
}
