#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUTPUT_JSON = "docs/lazycodex/people-reflection/lcx-qa-08-browser-qa-receipt.json";
const OUTPUT_MD = "docs/lazycodex/people-reflection/lcx-qa-08-browser-qa-receipt.md";
const ARTIFACT_DIR = "docs/lazycodex/people-reflection/artifacts/lcx-qa-08";
const API_ORIGIN = process.env.LCX_PPL_API_ORIGIN ?? "http://127.0.0.1:4191";
const API_URL = process.env.LCX_PPL_API_HEALTH ?? `${API_ORIGIN}/api/health`;
const WEB_ORIGIN = process.env.LCX_PPL_WEB_ORIGIN ?? "http://127.0.0.1:5178";
const RECEIPT_DATE = "2026-06-24";
const TEMP_STORE_DIR = mkdtempSync(join(tmpdir(), "lawos-lcx-ppl-browser-qa-"));

const screenshots = {
  peopleDirectory: `${ARTIFACT_DIR}/browser-qa-people-directory.png`,
  peopleRelationships: `${ARTIFACT_DIR}/browser-qa-people-relationships.png`,
  peopleConflicts: `${ARTIFACT_DIR}/browser-qa-people-conflicts.png`,
  peopleAdmin: `${ARTIFACT_DIR}/browser-qa-people-admin.png`,
  clientBacklinks: `${ARTIFACT_DIR}/browser-qa-client-backlinks.png`,
  matterBacklinks: `${ARTIFACT_DIR}/browser-qa-matter-backlinks.png`
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

function urlPort(url, fallback) {
  try {
    return new URL(url).port || fallback;
  } catch {
    return fallback;
  }
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
        LAWOS_API_PORT: urlPort(API_URL, "4191"),
        LAWOS_HRX_STORE_PATH: join(TEMP_STORE_DIR, "hrx.json"),
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
    managed.push(spawnManaged("web", "npm", [
      "--workspace",
      "apps/web",
      "run",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      urlPort(WEB_ORIGIN, "5178")
    ], {
      env: {
        LAWOS_WEB_API_PROXY_TARGET: API_ORIGIN
      }
    }));
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
  await locator.waitFor({ state: "visible", timeout: 20000 });
  return { label, selector, passed: true };
}

async function expectAttribute(page, selector, name, value, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 20000 });
  const actual = await locator.getAttribute(name);
  if (actual !== value) throw new Error(`${label} expected ${name}=${value}, received ${actual}`);
  return { label, selector, attribute: name, expected: value, actual, passed: true };
}

async function expectCountAtLeast(page, selector, min, label) {
  await page.waitForFunction(
    ({ selector: targetSelector, min: minimum }) => document.querySelectorAll(targetSelector).length >= minimum,
    { selector, min },
    { timeout: 20000 }
  );
  const count = await page.locator(selector).count();
  return { label, selector, min, count, passed: true };
}

async function expectTextMatch(page, selector, pattern, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(
    ({ selector: targetSelector, source, flags }) => {
      const element = document.querySelector(targetSelector);
      return Boolean(element && new RegExp(source, flags).test(element.textContent ?? ""));
    },
    { selector, source: pattern.source, flags: pattern.flags },
    { timeout: 20000 }
  );
  return { label, selector, expected: pattern.toString(), passed: true };
}

async function visit(page, routes, path, label) {
  await page.goto(`${WEB_ORIGIN}${path}`, { waitUntil: "networkidle" });
  routes.push({ label, path });
}

function writeMarkdownReceipt(receipt) {
  const lines = [
    "# LCX-QA-08 Browser QA Receipt",
    "",
    `Date: ${receipt.receipt_date}`,
    `Program: \`${receipt.program}\``,
    "",
    "## Scope",
    "",
    "- Browser-driven local surface: true",
    "- Local runtime-ready candidate evidence: true",
    "- Production ready: false",
    "- Go-live approved: false",
    "- Enterprise trust approved: false",
    "",
    "## Summary",
    "",
    `- Route count: ${receipt.summary.route_count}`,
    `- Check count: ${receipt.summary.check_count}`,
    `- Passed count: ${receipt.summary.passed_count}`,
    `- Failed count: ${receipt.summary.failed_count}`,
    "",
    "## Routes",
    "",
    ...receipt.routes.map((route) => `- ${route.label}: \`${route.path}\``),
    "",
    "## Screenshots",
    "",
    ...Object.entries(receipt.screenshots).map(([key, path]) => `- ${key}: \`${path}\``),
    "",
    "## Claim Boundary",
    "",
    "This receipt supports only the local browser QA portion of the LCX-PPL runtime-ready candidate. It does not approve production, go-live, external provider readiness, legal owner approval, or enterprise trust."
  ];
  writeFileSync(join(ROOT, OUTPUT_MD), `${lines.join("\n")}\n`);
}

async function run() {
  mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
  const managed = await ensureServers();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const checks = [];
  const routes = [];

  try {
    await visit(page, routes, "/?view=people&ctx=allow#people-directory", "People Directory");
    checks.push(await expectAttribute(page, ".app-frame", "data-sidebar-state", "expanded", "Sidebar defaults expanded"));
    checks.push(await expectVisible(page, '[data-product-axis-nav="top-header"]', "Top product axis nav visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-05-ui="true"]', "Legal People runtime workspace visible"));
    checks.push(await expectVisible(page, "#people-directory", "People directory panel visible"));
    checks.push(await expectVisible(page, ".legal-people-type-tabs", "People type filters visible"));
    checks.push(await expectCountAtLeast(page, ".legal-people-row", 5, "Legal People directory rows visible"));
    await page.locator(".legal-people-row").nth(1).click();
    checks.push(await expectVisible(page, "#people-detail-workspace", "People detail workspace visible"));
    checks.push(await expectTextMatch(page, "#people-detail-workspace", /감사 요약|제한 관계/, "People detail renders audit and relationship fields"));
    checks.push(await expectVisible(page, "#people-relationship-panel", "People relationship panel visible"));
    checks.push(await expectCountAtLeast(page, ".legal-relationship-row", 1, "People relationship rows visible"));
    await page.screenshot({ path: join(ROOT, screenshots.peopleDirectory), fullPage: true });

    await visit(page, routes, "/?view=people&ctx=allow#people-relationships", "People Relationships");
    checks.push(await expectVisible(page, '[data-lcx-ppl-05-ui="true"]', "Relationship workspace visible"));
    checks.push(await expectTextMatch(page, "#people-directory", /관련 기록|Client·Matter/, "Relationship mode title visible"));
    checks.push(await expectCountAtLeast(page, ".legal-people-row", 2, "Relationship mode People rows visible"));
    await page.locator(".legal-people-row").nth(1).click();
    checks.push(await expectVisible(page, "#people-relationship-panel", "Relationship panel visible in relationship mode"));
    checks.push(await expectCountAtLeast(page, ".legal-relationship-row", 1, "Relationship mode rows visible"));
    await page.screenshot({ path: join(ROOT, screenshots.peopleRelationships), fullPage: true });

    await visit(page, routes, "/?view=people&ctx=allow#people-conflicts", "People Conflicts And Walls");
    checks.push(await expectVisible(page, '[data-lcx-ppl-05-ui="true"]', "Conflict workspace visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-06-conflict-review-queue="true"]', "Conflict review queue marker visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-06-ethical-wall-ui="true"]', "Ethical wall UI marker visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-06-reviewer-receipts="true"]', "Reviewer receipt marker visible"));
    checks.push(await expectCountAtLeast(page, ".legal-ethics-row", 2, "Ethics and wall rows visible"));
    checks.push(await expectTextMatch(page, "#people-conflict-review-queue", /사람 검토|검토 대기|상향 검토/, "Human review boundary visible"));
    await page.screenshot({ path: join(ROOT, screenshots.peopleConflicts), fullPage: true });

    await visit(page, routes, "/?view=people&ctx=allow#people-admin", "People Permission Linkage");
    checks.push(await expectVisible(page, '[data-sf-b-w06-admin-setup="true"]', "People permission admin workspace visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-06-permission-linkage="true"]', "People sensitivity permission linkage visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-06-permission-receipt-link="true"]', "Reviewer receipt permission linkage visible"));
    checks.push(await expectTextMatch(page, '[data-lcx-ppl-06-permission-receipt-link="true"]', /건 연결됨/, "Reviewer receipt count visible"));
    await page.screenshot({ path: join(ROOT, screenshots.peopleAdmin), fullPage: true });

    await visit(page, routes, "/?view=clients&ctx=allow#client-contacts", "Client People Backlinks");
    checks.push(await expectVisible(page, '[data-crm-contacts-read="true"]', "Client contacts route-backed section visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-client-backlink="true"]', "Client People backlink surface visible"));
    checks.push(await expectCountAtLeast(page, ".legal-people-backlink-row", 1, "Client backlink People rows visible"));
    checks.push(await expectTextMatch(page, '[data-lcx-ppl-client-backlink="true"]', /관련 인물 연결|Client 연락처/, "Client backlink copy visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientBacklinks), fullPage: true });

    await visit(page, routes, "/?view=matters&ctx=allow#matter-team", "Matter People Backlinks");
    checks.push(await expectVisible(page, "#matter-team", "Matter team section visible"));
    checks.push(await expectVisible(page, '[data-lcx-ppl-matter-backlink="true"]', "Matter People backlink surface visible"));
    checks.push(await expectCountAtLeast(page, ".legal-people-backlink-row", 1, "Matter backlink People rows visible"));
    checks.push(await expectTextMatch(page, '[data-lcx-ppl-matter-backlink="true"]', /Matter 참여자|관련 인물/, "Matter backlink copy visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterBacklinks), fullPage: true });

    for (const path of Object.values(screenshots)) {
      if (!existsSync(join(ROOT, path))) throw new Error(`screenshot missing: ${path}`);
    }

    const receipt = {
      schema_version: "lawos.lcx_ppl.browser_qa_receipt.v0.1",
      program: "LCX-PPL Full Reflection",
      receipt_date: RECEIPT_DATE,
      scope: {
        lcx_qa_08_browser_qa_complete: true,
        local_runtime_ready_candidate_evidence: true,
        browser_driven_local_surface: true,
        production_ready_claim: false,
        go_live_claim: false,
        enterprise_trust_claim: false,
        external_provider_ready_claim: false,
        legal_owner_approved_claim: false,
        ai_final_decision_allowed: false
      },
      environment: {
        web_origin: WEB_ORIGIN,
        api_origin: API_ORIGIN,
        api_health: API_URL,
        temp_store_dir: TEMP_STORE_DIR,
        managed_processes_started: managed.map((item) => item.label)
      },
      routes,
      screenshots,
      summary: {
        route_count: routes.length,
        check_count: checks.length,
        passed_count: checks.filter((check) => check.passed).length,
        failed_count: 0
      },
      checks
    };
    writeFileSync(join(ROOT, OUTPUT_JSON), `${JSON.stringify(receipt, null, 2)}\n`);
    writeMarkdownReceipt(receipt);
    console.log(JSON.stringify({
      receipt: OUTPUT_JSON,
      markdown: OUTPUT_MD,
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
