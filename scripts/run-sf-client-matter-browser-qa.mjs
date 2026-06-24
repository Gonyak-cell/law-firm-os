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
  clientMergeReview: `${ARTIFACT_DIR}/browser-qa-client-merge-review.png`,
  clientRecordActions: `${ARTIFACT_DIR}/browser-qa-client-record-actions.png`,
  clientImport: `${ARTIFACT_DIR}/browser-qa-client-import.png`,
  clientDataCloud: `${ARTIFACT_DIR}/browser-qa-client-data-cloud.png`,
  clientReports: `${ARTIFACT_DIR}/browser-qa-client-reports.png`,
  matterList: `${ARTIFACT_DIR}/browser-qa-matter-list.png`,
  matterRecordActions: `${ARTIFACT_DIR}/browser-qa-matter-record-actions.png`,
  matterCommand: `${ARTIFACT_DIR}/browser-qa-matter-command.png`,
  matterVault: `${ARTIFACT_DIR}/browser-qa-matter-vault.png`,
  matterBuilderEmail: `${ARTIFACT_DIR}/browser-qa-matter-builder-email.png`,
  matterImport: `${ARTIFACT_DIR}/browser-qa-matter-import.png`,
  matterTimeline: `${ARTIFACT_DIR}/browser-qa-matter-timeline.png`,
  matterCalendar: `${ARTIFACT_DIR}/browser-qa-matter-calendar.png`,
  matterChannel: `${ARTIFACT_DIR}/browser-qa-matter-channel.png`,
  peopleAdmin: `${ARTIFACT_DIR}/browser-qa-people-admin.png`
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

async function expectDisabled(page, selector, label) {
  const disabled = await page.locator(selector).first().isDisabled();
  if (!disabled) throw new Error(`${label} expected disabled control`);
  return { label, selector, disabled, passed: true };
}

async function expectTextMatch(page, selector, pattern, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    ({ selector: targetSelector, source, flags }) => {
      const element = document.querySelector(targetSelector);
      return Boolean(element && new RegExp(source, flags).test(element.textContent ?? ""));
    },
    { selector, source: pattern.source, flags: pattern.flags },
    { timeout: 15000 }
  );
  return { label, selector, expected: pattern.toString(), passed: true };
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
    await page.locator('[data-crm-account-create-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w01r-account-canonical-sync="true"]', "Client Account canonical sync marker visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w02-record-actions-panel="true"]', "Client W02R record actions panel visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w02-field-registry="true"]', "Client W02R field registry visible"));
    await page.locator('[data-sf-b-w02-field-registry="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w02-field-update-result="true"]', "Client W02R field update result visible"));
    await page.locator('[data-sf-b-w02-owner-blocked-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w02-owner-blocked-result="true"]', "Client W02R owner gate blocked result visible"));
    await page.locator('[data-sf-b-w02-account-record-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w02-account-record-action-result="true"]', "Client Account W02R record action result visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientWorkspace), fullPage: true });
    await page.screenshot({ path: join(ROOT, screenshots.clientRecordActions), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=clients&ctx=allow#client-contacts`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-crm-contacts-read="true"]', "Client contact route-backed section visible"));
    await page.locator('[data-crm-contact-create-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w01r-contact-canonical-sync="true"]', "Client Contact canonical sync marker visible"));
    await page.locator('[data-sf-b-w02-contact-record-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w02-contact-record-action-result="true"]', "Client Contact W02R record action result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w01r-merge-review="true"]', "Client merge review panel visible"));
    await page.locator('[data-sf-b-w01r-merge-review="true"] .record-action-strip button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w01r-merge-execute-guarded="true"]', "Client guarded merge execute panel visible"));
    checks.push(await expectDisabled(page, '[data-sf-b-w01r-merge-execute-guarded="true"] button', "Client merge execute remains approval gated"));
    checks.push(await expectVisible(page, '[data-sf-b-w01r-right-panel-merge-review="true"]', "Client right panel merge review marker visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientMergeReview), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=clients&ctx=allow#client-import`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-sf-b-w05-import-wizard="true"]', "Client W05R import wizard visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-target-selector="true"]', "Client W05R target selector visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-job-list="true"]', "Client W05R import job list visible"));
    await page.locator('[data-sf-b-w05-target-selector="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-job-create-result="true"]', "Client W05R import job created"));
    await page.locator('[data-sf-b-w05-source-stage-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-source-stage-result="true"]', "Client W05R source staged safely"));
    await page.locator('[data-sf-b-w05-field-mapping-stepper="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-field-mapping-result="true"]', "Client W05R field mapping saved"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-preview-safe-sample="true"]', "Client W05R safe preview visible"));
    await page.locator('[data-sf-b-w05-dry-run-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-dry-run-result="true"]', "Client W05R dry-run result visible"));
    await page.locator('[data-sf-b-w05-execute-owner-blocked-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-execute-owner-blocked-result="true"]', "Client W05R execute owner-blocked result visible"));
    await page.locator('[data-sf-b-w05-rollback-error-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-rollback-result="true"]', "Client W05R rollback blocked result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-error-report="true"]', "Client W05R safe error report visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientImport), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=clients&ctx=allow#client-data`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-data-cloud-enrichment="route-backed"]', "Client W07R data enrichment workspace visible"));
    checks.push(await expectVisible(page, '[data-enrichment-provider-admin="provider-blocked"]', "Client W07R provider admin visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-provider-list="true"]', "Client W07R provider list visible"));
    await page.locator('[data-sf-b-w07-provider-register-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w07-provider-register-result="true"]', "Client W07R provider register result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w07-provider-register-result="true"]', /외부 확인 대기/, "Client W07R provider registration remains provider-blocked"));
    await page.locator('[data-sf-b-w07-consent-record-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w07-consent-record-result="true"]', "Client W07R consent owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w07-consent-record-result="true"]', /승인 대기/, "Client W07R consent remains owner-blocked"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-enrichment-job-action="true"]', "Client W07R enrichment job action visible"));
    await page.locator('[data-sf-b-w07-enrichment-job-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w07-enrichment-job-result="true"]', "Client W07R enrichment job result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-enrichment-preview="true"]', "Client W07R safe enrichment preview visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-enrichment-execute-provider-blocked-action="true"]', "Client W07R enrichment execute action visible"));
    await page.locator('[data-sf-b-w07-enrichment-execute-provider-blocked-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w07-enrichment-execute-provider-blocked-result="true"]', "Client W07R enrichment execute provider-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w07-enrichment-execute-provider-blocked-result="true"]', /외부 확인 대기/, "Client W07R enrichment execute remains provider-blocked"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-results-list="true"]', "Client W07R enrichment result list marker visible"));
    checks.push(await expectVisible(page, '[data-identity-resolution="route-backed"]', "Client W07R identity resolution visible"));
    await page.locator('[data-sf-b-w07-identity-resolution-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w07-identity-resolution-result="true"]', "Client W07R identity resolution result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w07-identity-resolution-result="true"]', /승인 대기/, "Client W07R identity resolution remains owner-blocked"));
    checks.push(await expectVisible(page, '[data-unified-profile="route-backed"]', "Client W07R unified profile visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-unified-profile="true"]', "Client W07R unified profile marker visible"));
    checks.push(await expectVisible(page, '[data-segment-activation="provider-blocked"]', "Client W07R segment activation visible"));
    await page.locator('[data-sf-b-w07-segment-activation-provider-blocked-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w07-segment-activation-provider-blocked-result="true"]', "Client W07R segment activation provider-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w07-segment-activation-provider-blocked-result="true"]', /외부 확인 대기/, "Client W07R segment activation remains provider-blocked"));
    checks.push(await expectVisible(page, '[data-sf-b-w07-audit="true"]', "Client W07R data cloud audit visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientDataCloud), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=clients&ctx=allow#client-reports`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-report-builder="route-backed"]', "Client W08R report builder workspace visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-list="true"]', "Client W08R saved report list visible"));
    checks.push(await expectVisible(page, '[data-report-query-builder="route-backed"]', "Client W08R query builder visible"));
    await page.locator('[data-sf-b-w08-report-create-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-create-result="true"]', "Client W08R report create result visible"));
    await page.locator('[data-sf-b-w08-report-patch-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-patch-result="true"]', "Client W08R report patch result visible"));
    checks.push(await expectVisible(page, '[data-client-profitability="route-backed"]', "Client W08R client profitability visible"));
    await page.locator('[data-sf-b-w08-client-profitability-refresh-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w08-client-profitability-refresh-result="true"]', "Client W08R client profitability refresh result visible"));
    await page.locator('[data-sf-b-w08-report-run-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-run-result="true"]', "Client W08R report run result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-chart="true"]', "Client W08R report chart summary visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-result-table="true"]', "Client W08R bounded report result visible"));
    checks.push(await expectVisible(page, '[data-report-share-action="owner-blocked"]', "Client W08R report share owner gate visible"));
    await page.locator('[data-sf-b-w08-report-share-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-share-result="true"]', "Client W08R report share owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w08-report-share-result="true"]', /승인 대기/, "Client W08R report share remains owner-blocked"));
    checks.push(await expectVisible(page, '[data-sf-b-w08-report-audit="true"]', "Client W08R report audit visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w08-right-panel-report-summary="route-backed"]', "Client right panel W08R report marker visible"));
    await page.screenshot({ path: join(ROOT, screenshots.clientReports), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matters-list`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-salesforce-matter-workspace="list-detail-right-panel"]', "Matter list/detail/right-panel workspace visible"));
    checks.push(await expectVisible(page, '[data-matter-selected-record-list="true"]', "Matter selected record list visible"));
    checks.push(await expectVisible(page, '[data-matter-record-workspace="right-panel"]', "Matter right record panel visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w02-matter-record-actions="true"]', "Matter W02R record actions panel visible"));
    await page.locator('[data-sf-b-w02-matter-record-actions="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w02-matter-record-action-result="true"]', "Matter W02R field update result visible"));
    await page.locator('[data-sf-b-w02-matter-owner-blocked-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w02-matter-owner-blocked-result="true"]', "Matter W02R owner gate blocked result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w02-matter-action-audit-feed="true"]', "Matter W02R record action audit feed visible"));
    checks.push(await expectCountAtLeast(page, ".sidebar-item", 8, "Matter sidebar sections visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterList), fullPage: true });
    await page.screenshot({ path: join(ROOT, screenshots.matterRecordActions), fullPage: true });

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
    checks.push(await expectVisible(page, '[data-sf-b-w04-document-builder="true"]', "Matter W04R document builder visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w04-template-picker="true"]', "Matter W04R template picker visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w04-email-composer="true"]', "Matter W04R email composer visible"));
    await page.locator('[data-sf-b-w04-builder-draft-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w04-builder-draft-result="true"]', "Matter W04R builder draft result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w04-builder-preview="true"]', "Matter W04R builder preview visible"));
    await page.locator('[data-sf-b-w04-builder-approval-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w04-builder-approval-result="true"]', "Matter W04R builder approval result visible"));
    await page.locator('[data-sf-b-w04-builder-publish-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w04-builder-publish-blocked-result="true"]', "Matter W04R builder publish owner-blocked result visible"));
    await page.locator('[data-sf-b-w04-email-draft-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w04-email-draft-result="true"]', "Matter W04R email draft result visible"));
    await page.locator('[data-sf-b-w04-email-send-boundary-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w04-email-send-provider-blocked="true"]', "Matter W04R email provider-blocked result visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterVault), fullPage: true });
    await page.screenshot({ path: join(ROOT, screenshots.matterBuilderEmail), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-import`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-sf-b-w05-import-wizard="true"]', "Matter W05R import wizard visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-target-selector="true"]', "Matter W05R target selector visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-job-list="true"]', "Matter W05R import job list visible"));
    await page.locator('[data-sf-b-w05-target-selector="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-job-create-result="true"]', "Matter W05R import job created"));
    await page.locator('[data-sf-b-w05-source-stage-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-source-stage-result="true"]', "Matter W05R source staged safely"));
    await page.locator('[data-sf-b-w05-field-mapping-stepper="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-field-mapping-result="true"]', "Matter W05R field mapping saved"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-preview-safe-sample="true"]', "Matter W05R safe preview visible"));
    await page.locator('[data-sf-b-w05-dry-run-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-dry-run-result="true"]', "Matter W05R dry-run result visible"));
    await page.locator('[data-sf-b-w05-execute-owner-blocked-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-execute-owner-blocked-result="true"]', "Matter W05R execute owner-blocked result visible"));
    await page.locator('[data-sf-b-w05-rollback-error-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w05-rollback-result="true"]', "Matter W05R rollback blocked result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w05-error-report="true"]', "Matter W05R safe error report visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterImport), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-timeline`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, "#matter-timeline", "Matter activity section visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-activity-workspace="true"]', "Matter W03R activity workspace visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-activity-composer="true"]', "Matter W03R activity composer visible"));
    await page.locator('[data-sf-b-w03-activity-composer="true"] .record-action-strip').nth(0).locator("button").first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-activity-create-result="true"]', "Matter W03R activity create result visible"));
    await page.locator('[data-sf-b-w03-activity-composer="true"] .record-action-strip').nth(1).locator("button").first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-activity-patch-result="true"]', "Matter W03R activity patch result visible"));
    checks.push(await expectVisible(page, '[data-matter-activity-timeline="true"]', "Matter activity timeline visible"));
    checks.push(await expectVisible(page, '[data-matter-record-workspace="right-panel"]', "Matter activity right record panel visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-right-panel-deadline-highlight="true"]', "Matter W03R deadline right-panel marker visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-right-panel-channel-tab="true"]', "Matter W03R channel right-panel marker visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterTimeline), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-calendar`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, "#matter-calendar", "Matter calendar section visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-calendar-workspace="true"]', "Matter W03R calendar workspace visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-calendar-create-action="true"]', "Matter W03R calendar create action visible"));
    await page.locator('[data-sf-b-w03-calendar-create-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-calendar-create-result="true"]', "Matter W03R calendar create result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-deadline-board="true"]', "Matter W03R deadline board visible"));
    await page.locator('[data-sf-b-w03-deadline-approval-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-deadline-approval-result="true"]', "Matter W03R deadline approval result visible"));
    await page.locator('[data-sf-b-w03-deadline-confirm-action="true"] button').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-deadline-confirm-result="true"]', "Matter W03R deadline confirm result visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterCalendar), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=matters&ctx=allow#matter-channel`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, "#matter-channel", "Matter channel section visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-channel-workspace="true"]', "Matter W03R channel workspace visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-channel-composer="true"]', "Matter W03R channel composer visible"));
    await page.locator('[data-sf-b-w03-channel-composer="true"] .record-action-strip').nth(0).locator("button").first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-channel-message-result="true"]', "Matter W03R channel message result visible"));
    await page.locator('[data-sf-b-w03-channel-composer="true"] .record-action-strip').nth(1).locator("button").first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w03-provider-blocked-result="true"]', "Matter W03R channel provider blocked result visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w03-channel-provider-state="true"]', "Matter W03R channel provider state right-panel marker visible"));
    await page.screenshot({ path: join(ROOT, screenshots.matterChannel), fullPage: true });

    await page.goto(`${WEB_ORIGIN}/?view=people&ctx=allow#people-admin`, { waitUntil: "networkidle" });
    checks.push(await expectVisible(page, '[data-sf-b-w06-admin-setup="true"]', "People W06R admin setup workspace visible"));
    checks.push(await expectVisible(page, '[data-permission-set-admin="route-backed"]', "People W06R permission set panel visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w06-permission-set-list="true"]', "People W06R permission set list visible"));
    await page.locator('[data-sf-b-w06-permission-set-create-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w06-permission-set-create-result="true"]', "People W06R permission set create owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w06-permission-set-create-result="true"]', /승인 대기/, "People W06R permission set create remains owner-blocked"));
    await page.locator('[data-sf-b-w06-permission-set-patch-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w06-permission-set-patch-result="true"]', "People W06R permission set patch owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w06-permission-set-patch-result="true"]', /승인 대기/, "People W06R permission set patch remains owner-blocked"));
    checks.push(await expectVisible(page, '[data-permission-assignment-admin="route-backed"]', "People W06R permission assignment panel visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w06-assignment-list="true"]', "People W06R permission assignment list visible"));
    await page.locator('[data-sf-b-w06-assignment-owner-blocked-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w06-assignment-owner-blocked-result="true"]', "People W06R assignment owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w06-assignment-owner-blocked-result="true"]', /승인 대기/, "People W06R assignment remains owner-blocked"));
    await page.locator('[data-sf-b-w06-revoke-owner-blocked-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w06-revoke-owner-blocked-result="true"]', "People W06R revoke owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w06-revoke-owner-blocked-result="true"]', /승인 대기/, "People W06R revoke remains owner-blocked"));
    checks.push(await expectVisible(page, '[data-object-manager-admin="route-backed"]', "People W06R Object Manager visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w06-object-manager="true"]', "People W06R Object Manager marker visible"));
    await page.locator('[data-sf-b-w06-field-policy-owner-blocked-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w06-field-policy-owner-blocked-result="true"]', "People W06R field policy owner-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w06-field-policy-owner-blocked-result="true"]', /승인 대기/, "People W06R field policy remains owner-blocked"));
    checks.push(await expectVisible(page, '[data-connected-apps-admin="provider-blocked"]', "People W06R connected apps visible"));
    checks.push(await expectVisible(page, '[data-sf-b-w06-connected-app-list="true"]', "People W06R connected app list visible"));
    await page.locator('[data-sf-b-w06-connected-app-provider-blocked-action="true"]').first().click();
    checks.push(await expectVisible(page, '[data-sf-b-w06-connected-app-provider-blocked-result="true"]', "People W06R connected app provider-blocked result visible"));
    checks.push(await expectTextMatch(page, '[data-sf-b-w06-connected-app-provider-blocked-result="true"]', /외부 확인 대기/, "People W06R connected app remains provider-blocked"));
    checks.push(await expectVisible(page, '[data-sf-b-w06-admin-audit="true"]', "People W06R admin audit visible"));
    await page.screenshot({ path: join(ROOT, screenshots.peopleAdmin), fullPage: true });

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
        route_count: 13,
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
