#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { hrxScopesForRoleProfile } from "../apps/api/src/hrx-role-scope-matrix.js";

const ROOT = process.cwd();
const BASE_URL = process.env.LAWOS_QA_WEB_URL ?? "http://127.0.0.1:4173";
const EVIDENCE_DIR = resolve(ROOT, "docs/lazycodex/evidence/matter-web/payroll-browser-qa-2026-07-15");
const RECEIPT_PATH = resolve(ROOT, "docs/lazycodex/evidence/matter-web/artifacts/payroll-browser-qa-2026-07-15.json");
const TENANT_ID = "tenant_amic_matter_vault";

const VIEWPORTS = Object.freeze([
  { width: 1512, height: 864 },
  { width: 1280, height: 820 },
  { width: 1024, height: 768 },
  { width: 820, height: 800 },
  { width: 720, height: 800 },
]);

const ROLE_CASES = Object.freeze([
  { role: "employee", policy_role: "lawos_staff", actor_id: "user_amic_jwsuh", payroll_allowed: false },
  { role: "manager", policy_role: "lawos_attorney", actor_id: "user_amic_tryoon", payroll_allowed: false },
  { role: "hr", policy_role: "lawos_hr", actor_id: "user_amic_ytkim", payroll_allowed: false },
  { role: "payroll_preparer", policy_role: "lawos_staff", actor_id: "user_amic_jwsuh", payroll_allowed: true },
  { role: "payroll_approver", policy_role: "lawos_partner", actor_id: "user_amic_tryoon", payroll_allowed: true },
  { role: "auditor", policy_role: "lawos_staff", actor_id: "user_amic_jwsuh", payroll_allowed: false },
]);

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function roleUrl(roleCase, section) {
  const params = new URLSearchParams({
    locale: "ko",
    view: "people",
    ctx: "allow",
    desktop: "1",
    desktop_actor_ref: roleCase.actor_id,
    desktop_tenant_ref: TENANT_ID,
    desktop_role_ref: roleCase.policy_role,
    desktop_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  for (const scope of hrxScopesForRoleProfile(roleCase.role)) params.append("desktop_scope_ref", scope);
  return `${BASE_URL}/?${params.toString()}#${section}`;
}

function expectedDenial(entry, roleCase) {
  if (roleCase.payroll_allowed) return false;
  const url = entry.url ?? entry.location?.url ?? "";
  return url.includes("/api/hrx/payroll/periods") && (entry.status === 403 || String(entry.text).includes("403"));
}

async function metrics(page, selector) {
  return page.evaluate((target) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const panel = document.querySelector(target);
    const rows = [...(panel?.querySelectorAll("table tbody tr") ?? [])].filter(visible);
    const buttons = [...document.querySelectorAll("button")].filter(visible);
    const controls = [...(panel?.querySelectorAll("input, select, textarea") ?? [])].filter(visible);
    const main = document.querySelector("main");
    return {
      panel_visible: Boolean(panel && visible(panel)),
      root_client_width: document.documentElement.clientWidth,
      root_scroll_width: document.documentElement.scrollWidth,
      main_client_width: main?.clientWidth ?? 0,
      main_scroll_width: main?.scrollWidth ?? 0,
      broken_images: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      empty_buttons: buttons.filter((button) => !(button.innerText || button.getAttribute("aria-label") || button.getAttribute("title"))?.trim()).length,
      unlabeled_controls: controls.filter((control) => !control.closest("label") && !control.getAttribute("aria-label") && !control.id).length,
      row_heights: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
      non_44px_rows: rows.filter((row) => Math.abs(row.getBoundingClientRect().height - 44) > 1).length,
      employee_rows: panel?.querySelectorAll("[data-payroll-employee]").length ?? 0,
      filing_rows: panel?.querySelectorAll('[data-payroll-operation="filing"] tbody tr').length ?? 0,
    };
  }, selector);
}

async function waitForRoleSurface(page, roleCase) {
  await page.locator("#people-payroll").waitFor({ state: "visible", timeout: 15_000 });
  if (roleCase.payroll_allowed) {
    await page.locator("[data-payroll-employee]").first().waitFor({ state: "visible", timeout: 15_000 });
  } else {
    await page.getByText("급여정산 권한이 없습니다.", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  }
  await page.waitForTimeout(100);
}

async function exercisePayrollDetails(page) {
  const opener = page.locator("[data-payroll-employee] .payroll-employee-button").first();
  await opener.click();
  const dialog = page.getByRole("dialog", { name: /급여 상세$/ });
  await dialog.waitFor({ state: "visible" });
  const focusedClose = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "급여 상세 닫기");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  const focusRestored = await opener.evaluate((element) => document.activeElement === element);

  await page.getByRole("tab", { name: "지급" }).click();
  await page.locator('[data-payroll-operation="payment"]').waitFor({ state: "visible" });
  const paymentText = await page.locator('[data-payroll-operation="payment"]').innerText();
  await page.getByRole("tab", { name: "신고" }).click();
  await page.locator('[data-payroll-operation="filing"]').waitFor({ state: "visible" });
  const filingText = await page.locator('[data-payroll-operation="filing"]').innerText();
  const filingRowHeights = await page.locator('[data-payroll-operation="filing"] tbody tr').evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().height)));
  await page.getByRole("tab", { name: "정산" }).click();
  return {
    close_button_initial_focus: focusedClose,
    escape_closed_dialog: true,
    opener_focus_restored: focusRestored,
    payment_reconciled_visible: paymentText.includes("대사 완료"),
    filing_kinds_visible: ["원천세", "지급명세", "4대보험", "연말정산"].every((label) => filingText.includes(label)),
    filing_accepted_visible: (filingText.match(/접수/g) ?? []).length >= 4,
    filing_row_heights: filingRowHeights,
  };
}

mkdirSync(EVIDENCE_DIR, { recursive: true });
mkdirSync(resolve(RECEIPT_PATH, ".."), { recursive: true });

const browser = await chromium.launch({ headless: true });
const roleResults = [];
const screenshots = [];
let details = null;
let employeeStatement = null;
let preparerStatements = null;

try {
  for (const roleCase of ROLE_CASES) {
    const context = await browser.newContext({ viewport: VIEWPORTS[0] });
    await context.route(/\/api\/(?:matters|home\/feed)(?:\?|$)/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "ok", items: [] }) }));
    const page = await context.newPage();
    let consoleErrors = [];
    let pageErrors = [];
    let httpErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push({ text: message.text(), location: message.location() });
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("response", (response) => {
      if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() });
    });

    const viewportResults = [];
    for (const viewport of VIEWPORTS) {
      consoleErrors = [];
      pageErrors = [];
      httpErrors = [];
      await page.setViewportSize(viewport);
      await page.goto(roleUrl(roleCase, "people-payroll"), { waitUntil: "networkidle" });
      await waitForRoleSurface(page, roleCase);
      const text = await page.locator("#people-payroll").innerText();
      const measured = await metrics(page, "#people-payroll");
      const expectedConsoleErrors = consoleErrors.filter((entry) => expectedDenial(entry, roleCase));
      const expectedHttpErrors = httpErrors.filter((entry) => expectedDenial(entry, roleCase));
      const unexpectedConsoleErrors = consoleErrors.filter((entry) => !expectedDenial(entry, roleCase));
      const unexpectedHttpErrors = httpErrors.filter((entry) => !expectedDenial(entry, roleCase));
      const rowContractPassed = roleCase.payroll_allowed ? measured.employee_rows === 10 && measured.non_44px_rows === 0 : measured.employee_rows === 0;
      const surfaceContractPassed = roleCase.payroll_allowed
        ? text.includes("10명") && text.includes("₩35,401,323") && !text.includes("권한이 없습니다")
        : text.includes("급여정산 권한이 없습니다.") && !text.includes("₩35,401,323");

      if (roleCase.role === "payroll_preparer" && viewport.width === 1280) details = await exercisePayrollDetails(page);

      if ([1280, 720].includes(viewport.width)) {
        const filePath = join(EVIDENCE_DIR, `${roleCase.role}-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        screenshots.push({ path: filePath.replace(`${ROOT}/`, ""), sha256: sha256(filePath), role: roleCase.role, viewport });
      }

      viewportResults.push({
        viewport,
        surface_contract_passed: surfaceContractPassed,
        row_contract_passed: rowContractPassed,
        metrics: measured,
        expected_denial_http_errors: expectedHttpErrors,
        expected_denial_console_errors: expectedConsoleErrors.length,
        unexpected_http_errors: unexpectedHttpErrors,
        unexpected_console_errors: unexpectedConsoleErrors,
        page_errors: pageErrors,
      });
    }

    if (roleCase.role === "employee") {
      consoleErrors = [];
      pageErrors = [];
      httpErrors = [];
      await page.setViewportSize({ width: 1280, height: 820 });
      await page.goto(roleUrl(roleCase, "people-pay-statement"), { waitUntil: "networkidle" });
      await page.locator("#people-pay-statement").waitFor({ state: "visible" });
      await page.getByText("내 명세서", { exact: true }).waitFor({ state: "visible" });
      employeeStatement = {
        self_statement_rows: await page.locator("#people-pay-statement tbody tr").count(),
        management_toolbar_hidden: await page.locator(".payroll-statement-toolbar").count() === 0,
        metrics: await metrics(page, "#people-pay-statement"),
        unexpected_http_errors: httpErrors.filter((entry) => !entry.url.includes("/api/hrx/payroll/periods")),
        unexpected_console_errors: consoleErrors.filter((entry) => !entry.location?.url?.includes("/api/hrx/payroll/periods")),
        page_errors: pageErrors,
      };
    }

    if (roleCase.role === "payroll_preparer") {
      consoleErrors = [];
      pageErrors = [];
      httpErrors = [];
      await page.setViewportSize({ width: 1280, height: 820 });
      await page.goto(roleUrl(roleCase, "people-pay-statement"), { waitUntil: "networkidle" });
      await page.locator("#people-pay-statement tbody tr").first().waitFor({ state: "visible" });
      preparerStatements = {
        statement_rows: await page.locator("#people-pay-statement tbody tr").count(),
        management_toolbar_visible: await page.locator(".payroll-statement-toolbar").isVisible(),
        export_buttons_visible: await page.getByRole("button", { name: "CSV", exact: true }).isVisible() && await page.getByRole("button", { name: "XLSX", exact: true }).isVisible(),
        metrics: await metrics(page, "#people-pay-statement"),
        unexpected_http_errors: httpErrors,
        unexpected_console_errors: consoleErrors,
        page_errors: pageErrors,
      };
    }

    roleResults.push({ role: roleCase.role, policy_role: roleCase.policy_role, actor_id: roleCase.actor_id, payroll_allowed: roleCase.payroll_allowed, scopes: hrxScopesForRoleProfile(roleCase.role), viewports: viewportResults });
    await context.close();
  }
} finally {
  await browser.close();
}

const allViewports = roleResults.flatMap((role) => role.viewports);
const receipt = {
  schema_version: "law-firm-os.payroll.browser-qa.v0.1",
  generated_at: new Date().toISOString(),
  runtime: { web_base_url: BASE_URL, endpoint_kind: "current_running_loopback", api_base_url: "http://127.0.0.1:4180" },
  checks: {
    six_role_matrix_complete: roleResults.length === 6,
    five_viewports_each_complete: roleResults.every((role) => role.viewports.length === 5),
    role_surface_contracts_passed: allViewports.every((entry) => entry.surface_contract_passed),
    row_density_contracts_passed: allViewports.every((entry) => entry.row_contract_passed && entry.metrics.non_44px_rows === 0),
    root_overflow_count: allViewports.filter((entry) => entry.metrics.root_scroll_width > entry.metrics.root_client_width).length,
    main_overflow_count: allViewports.filter((entry) => entry.metrics.main_scroll_width > entry.metrics.main_client_width).length,
    broken_image_count: allViewports.reduce((sum, entry) => sum + entry.metrics.broken_images, 0),
    empty_button_count: allViewports.reduce((sum, entry) => sum + entry.metrics.empty_buttons, 0),
    unlabeled_control_count: allViewports.reduce((sum, entry) => sum + entry.metrics.unlabeled_controls, 0),
    unexpected_http_error_count: allViewports.reduce((sum, entry) => sum + entry.unexpected_http_errors.length, 0),
    unexpected_console_error_count: allViewports.reduce((sum, entry) => sum + entry.unexpected_console_errors.length, 0),
    page_error_count: allViewports.reduce((sum, entry) => sum + entry.page_errors.length, 0),
    detail_drawer_accessibility_passed: Boolean(details?.close_button_initial_focus && details?.escape_closed_dialog && details?.opener_focus_restored),
    payment_and_filing_views_passed: Boolean(details?.payment_reconciled_visible && details?.filing_kinds_visible && details?.filing_accepted_visible && details?.filing_row_heights.every((height) => height === 44)),
    employee_self_statement_passed: Boolean(employeeStatement?.self_statement_rows === 1 && employeeStatement?.management_toolbar_hidden && employeeStatement?.unexpected_http_errors.length === 0 && employeeStatement?.unexpected_console_errors.length === 0 && employeeStatement?.page_errors.length === 0),
    preparer_statement_management_passed: Boolean(preparerStatements?.statement_rows === 10 && preparerStatements?.management_toolbar_visible && preparerStatements?.export_buttons_visible && preparerStatements?.unexpected_http_errors.length === 0 && preparerStatements?.unexpected_console_errors.length === 0 && preparerStatements?.page_errors.length === 0),
  },
  detail_drawer: details,
  employee_statement: employeeStatement,
  preparer_statements: preparerStatements,
  roles: roleResults,
  screenshots,
  boundary: {
    synthetic_runtime_only: true,
    external_provider_write_claim: false,
    production_approved_claim: false,
    public_release_claim: false,
    go_live_claim: false,
  },
};

writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
const failed = Object.entries(receipt.checks).filter(([, value]) => value !== true && value !== 0);
if (failed.length > 0) throw new Error(`Payroll browser QA failed: ${JSON.stringify({ failed, receipt: RECEIPT_PATH }, null, 2)}`);
process.stdout.write(`${JSON.stringify({ outcome: "passed", receipt: RECEIPT_PATH.replace(`${ROOT}/`, ""), checks: receipt.checks, screenshots: screenshots.length }, null, 2)}\n`);
