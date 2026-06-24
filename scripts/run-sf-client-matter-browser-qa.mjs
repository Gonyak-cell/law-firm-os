#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUTPUT_PATH = "docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json";
const ARTIFACT_DIR = "docs/goal-closeout/sf-client-matter-parity/artifacts";
const API_URL = "http://127.0.0.1:4180/api/health";
const WEB_ORIGIN = "http://127.0.0.1:5176";
const TEMP_STORE_DIR = mkdtempSync(join(tmpdir(), "lawos-sf-browser-qa-"));

const screenshots = {
  clientWorkspace: `${ARTIFACT_DIR}/browser-qa-client-workspace.png`,
  matterList: `${ARTIFACT_DIR}/browser-qa-matter-list.png`,
  matterCommand: `${ARTIFACT_DIR}/browser-qa-matter-command.png`,
  matterVault: `${ARTIFACT_DIR}/browser-qa-matter-vault.png`,
  matterTimeline: `${ARTIFACT_DIR}/browser-qa-matter-timeline.png`
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForReachable(url, label, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(url)) return true;
    await delay(500);
  }
  throw new Error(`${label} was not reachable at ${url}`);
}

function spawnManaged(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
    env: {
      ...process.env,
      ...options.env
    }
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(`${label}: ${chunk.toString()}`));
  child.stderr.on("data", (chunk) => logs.push(`${label}: ${chunk.toString()}`));
  return { label, child, logs };
}

async function ensureServers() {
  const managed = [];
  if (!(await isReachable(API_URL))) {
    managed.push(spawnManaged("api", "npm", ["--workspace", "apps/api", "run", "start"], {
      env: {
        LAWOS_API_PORT: "4180",
        LAWOS_MASTER_DATA_STORE_PATH: join(TEMP_STORE_DIR, "master-data.json"),
        LAWOS_MATTER_STORE_PATH: join(TEMP_STORE_DIR, "matter.json"),
        LAWOS_DMS_STORE_PATH: join(TEMP_STORE_DIR, "dms.json"),
        LAWOS_CRM_STORE_PATH: join(TEMP_STORE_DIR, "crm.json"),
        LAWOS_INTAKE_STORE_PATH: join(TEMP_STORE_DIR, "intake.json"),
        LAWOS_CRM_MASTER_DATA_STORE_PATH: join(TEMP_STORE_DIR, "crm-master-data.json"),
        LAWOS_FINANCE_STORE_PATH: join(TEMP_STORE_DIR, "finance.json"),
        LAWOS_ANALYTICS_STORE_PATH: join(TEMP_STORE_DIR, "analytics.json")
      }
    }));
  }
  if (!(await isReachable(WEB_ORIGIN))) {
    managed.push(spawnManaged("web", "npm", ["--workspace", "apps/web", "run", "dev", "--", "--port", "5176"]));
  }
  await waitForReachable(API_URL, "API");
  await waitForReachable(WEB_ORIGIN, "Web");
  return managed;
}

function stopManaged(managed) {
  for (const item of managed) {
    if (!item.child.killed) item.child.kill("SIGTERM");
  }
}

async function expectVisible(page, selector, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 15000 });
  return { label, selector, passed: true };
}

async function expectCountAtLeast(page, selector, min, label) {
  const count = await page.locator(selector).count();
  if (count < min) throw new Error(`${label} expected at least ${min}, received ${count}`);
  return { label, selector, min, count, passed: true };
}

async function expectAttribute(page, selector, name, value, label) {
  const actual = await page.locator(selector).first().getAttribute(name);
  if (actual !== value) throw new Error(`${label} expected ${name}=${value}, received ${actual}`);
  return { label, selector, attribute: name, expected: value, actual, passed: true };
}

async function run() {
  mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
  const managed = await ensureServers();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const checks = [];

  try {
    await page.goto(`${WEB_ORIGIN}/?view=clients&ctx=allow#client-accounts`, { waitUntil: "networkidle" });
    checks.push(await expectAttribute(page, ".app-frame", "data-sidebar-state", "expanded", "Sidebar defaults expanded"));
    checks.push(await expectVisible(page, '[data-product-axis-nav="top-header"]', "Top product axis nav visible"));
    checks.push(await expectVisible(page, '[data-salesforce-client-workspace="list-detail-right-panel"]', "Client list/detail/right-panel workspace visible"));
    checks.push(await expectVisible(page, '[data-client-record-workspace="right-panel"]', "Client right record panel visible"));
    checks.push(await expectVisible(page, '[data-crm-accounts-read="true"]', "Client account route-backed section visible"));
    checks.push(await expectCountAtLeast(page, ".sidebar-item", 6, "Client sidebar sections visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientWorkspace), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matters-list`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-salesforce-matter-workspace="list-detail-right-panel"]', "Matter list/detail/right-panel workspace visible"));
    checks.push(await expectVisible(page, '[data-matter-selected-record-list="true"]', "Matter selected record list visible"));
    checks.push(await expectVisible(page, '[data-matter-record-workspace="right-panel"]', "Matter right record panel visible"));
    checks.push(await expectCountAtLeast(page, ".sidebar-item", 8, "Matter sidebar sections visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterList), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-command`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-salesforce-matter-workspace="list-detail-right-panel"]', "Matter list/detail/right-panel workspace visible"));
    checks.push(await expectVisible(page, "#matter-command", "Matter command section visible"));
    checks.push(await expectVisible(page, '[data-matter-record-workspace="right-panel"]', "Matter command right record panel visible"));
    checks.push(await expectCountAtLeast(page, ".sidebar-item", 8, "Matter sidebar sections visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterCommand), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-vault`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-mv-matter-vault-panel="true"]', "Matter Vault embedded panel visible"));
    checks.push(await expectVisible(page, '[data-matter-vault-record-workspace="true"]', "Matter Vault record workspace visible"));
    checks.push(await expectVisible(page, '[data-matter-document-facade-action="true"]', "Matter document facade action visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterVault), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-timeline`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, "#matter-timeline", "Matter activity section visible"));
    checks.push(await expectVisible(page, '[data-matter-activity-timeline="true"]', "Matter activity timeline visible"));
    checks.push(await expectVisible(page, '[data-matter-record-workspace="right-panel"]', "Matter activity right record panel visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterTimeline), fullPage: true });

    const receipt = {
      schema_version: "law-firm-os.sf-client-matter-parity.browser-qa-receipt.v0.1",
      program: "SF-CLIENT-MATTER-PARITY",
      receipt_date: "2026-06-24",
      scope: {
        browser_driven_local_surface: true,
        client_matter_only: true,
        production_ready_claim: false,
        go_live_claim: false,
        enterprise_trust_claim: false
      },
      environment: {
        web_origin: WEB_ORIGIN,
        api_health: API_URL,
        temp_store_dir: TEMP_STORE_DIR,
        managed_processes_started: managed.map((item) => item.label)
      },
      screenshots,
      summary: {
        route_count: 5,
        check_count: checks.length,
        passed_count: checks.filter((check) => check.passed).length,
        failed_count: 0
      },
      checks
    };
    writeFileSync(join(ROOT, OUTPUT_PATH), `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({
      receipt: OUTPUT_PATH,
      route_count: receipt.summary.route_count,
      check_count: receipt.summary.check_count,
      passed_count: receipt.summary.passed_count,
      screenshots
    }, null, 2));
  } finally {
    await browser.close();
    stopManaged(managed);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
