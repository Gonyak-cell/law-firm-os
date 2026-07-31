import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const evidenceDir = resolve(repositoryRoot, ".omo/evidence");
const screenshotPath = resolve(evidenceDir, "payroll-visible-actor-labels-rendered.png");
const artifactPath = resolve(evidenceDir, "payroll-visible-actor-labels-rendered.json");
const OPAQUE_EMPLOYEE_LABEL = "담당 0123456789abcdef0123456789abcdef";
const OPAQUE_ACTOR_LABEL = "payrollMemberRef20260731A1";

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function payrollFixture() {
  const run = {
    run_id: "run-label-adversarial",
    period_id: "period-label-adversarial",
    run_type: "regular",
    status: "approved",
    state_version: 4,
    approved_by_actor_id: "actor-opaque",
    approved_by_actor_display_name: OPAQUE_ACTOR_LABEL,
    approved_at: "2026-07-31T09:00:00.000Z",
  };
  const employee = {
    employee_id: "emp-1",
    display_name: OPAQUE_EMPLOYEE_LABEL,
    result_id: "result-1",
    gross_krw: 100000,
    deduction_krw: 10000,
    net_krw: 90000,
    variance_krw: 0,
    issue_count: 0,
    blocker_count: 0,
    status: "calculated",
  };
  const auditEvent = {
    event_id: "audit-event-label-adversarial",
    action: "hrx.payroll.run.approved",
    actor_id: "actor-opaque",
    actor_display_name: OPAQUE_ACTOR_LABEL,
    occurred_at: "2026-07-31T09:00:00.000Z",
  };
  return {
    workspace: {
      periods: [{
        period_id: "period-label-adversarial",
        period_code: "2026-07",
        period_start: "2026-07-01",
        period_end: "2026-07-31",
        cutoff_at: "2026-07-25T18:00:00.000Z",
        pay_date: "2026-08-05",
        runs: [run],
      }],
    },
    bundle: {
      run,
      employees: [employee],
      totals: { gross_krw: 100000, deduction_krw: 10000, net_krw: 90000, issue_count: 0 },
      snapshots: [],
      results: [],
      line_items: [],
      issues: [],
      adjustments: [],
      statements: [],
      payment_batches: [],
      filings: [],
      year_end: null,
      audit_history: [auditEvent],
    },
  };
}

test("PY-LABEL-003 renders safe employee, approval, audit, and ARIA labels in the real payroll screen", async () => {
  const harness = await startPeopleOverviewHarness();
  const fixture = payrollFixture();
  try {
    const page = await harness.browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
    await page.addInitScript(() => {
      window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
        payroll_close_precheck: true,
      };
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/hrx/payroll/periods" && request.method() === "GET") return json(route, { outcome: "ok", workspace: fixture.workspace });
      if (pathname === "/api/hrx/payroll/runs/run-label-adversarial" && request.method() === "GET") return json(route, { outcome: "ok", bundle: fixture.bundle });
      if (pathname === "/api/hrx/payroll/runs/run-label-adversarial/precheck" && request.method() === "GET") return json(route, { outcome: "ok", precheck: { ready: true, blocker_count: 0, blockers: [] } });
      return json(route, {});
    });

    await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-payroll`, { waitUntil: "networkidle" });
    const settlementPanel = page.locator('[data-payroll-runtime="true"]');
    await settlementPanel.waitFor();
    await page.getByRole("button", { name: "구성원 이름 확인 필요", exact: true }).waitFor();
    const settlementBody = await settlementPanel.innerText();
    assert.match(settlementBody, /구성원 이름 확인 필요/);
    assert.doesNotMatch(settlementBody, /0123456789abcdef0123456789abcdef|payrollMemberRef20260731A1|actor-opaque/);
    assert.equal(await page.getByRole("button", { name: "구성원 이름 확인 필요", exact: true }).count(), 1);

    await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-close`, { waitUntil: "networkidle" });
    const closePanel = page.locator('[data-payroll-runtime="true"]');
    await closePanel.waitFor();
    await closePanel.getByText("승인자 이름 확인 필요", { exact: true }).waitFor();
    await closePanel.getByRole("cell", { name: "담당자 이름 확인 필요", exact: true }).waitFor();
    const closeBody = await closePanel.innerText();
    assert.match(closeBody, /승인자\s+승인자 이름 확인 필요/);
    assert.match(closeBody, /담당자 이름 확인 필요/);
    assert.doesNotMatch(closeBody, /0123456789abcdef0123456789abcdef|payrollMemberRef20260731A1|actor-opaque/);
    assert.equal(await closePanel.getByRole("cell", { name: "담당자 이름 확인 필요", exact: true }).count(), 1);

    await mkdir(evidenceDir, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await writeFile(artifactPath, `${JSON.stringify({
      scenario: "PY-LABEL-003",
      visible_fallbacks: {
        employee: "구성원 이름 확인 필요",
        approval_actor: "승인자 이름 확인 필요",
        audit_actor: "담당자 이름 확인 필요",
      },
      employee_button_count: await page.getByRole("button", { name: "구성원 이름 확인 필요", exact: true }).count(),
      audit_cell_count: await closePanel.getByRole("cell", { name: "담당자 이름 확인 필요", exact: true }).count(),
      settlement_body_text: settlementBody,
      close_body_text: closeBody,
      opaque_tokens_absent: !/0123456789abcdef0123456789abcdef|payrollMemberRef20260731A1|actor-opaque/.test(`${settlementBody}\n${closeBody}`),
      screenshot: screenshotPath,
    }, null, 2)}\n`, "utf8");
  } finally {
    await harness.close();
  }
});
