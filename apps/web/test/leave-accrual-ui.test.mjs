import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import { repoRoot, startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function source(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

function leaveSections(navigation) {
  return navigation.people.items.flatMap((group) => group.children ?? []).map((item) => item.section);
}

test("LV-04 exposes automatic accrual and keeps manual adjustment inside usage", async () => {
  const server = await createServer({ configFile: false, root: webRoot, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  try {
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { canAdjustLeaveLedger, canExecuteLeaveAccrual } = await server.ssrLoadModule("/src/data/hrxAccess.js");
    const staff = [{ session: { hrx_scopes: ["hrx.leave.self.read"] } }];
    const hr = [{ session: { hrx_scopes: ["hrx.leave.accrual.execute", "hrx.leave.ledger.adjust"] } }];
    assert.equal(canExecuteLeaveAccrual(staff), false);
    assert.equal(canAdjustLeaveLedger(staff), false);
    assert.equal(canExecuteLeaveAccrual(hr), true);
    assert.equal(canAdjustLeaveLedger(hr), true);
    assert.equal(leaveSections(buildContextualNavigation({})).includes("people-leave-accrual-auto"), false);
    const sections = leaveSections(buildContextualNavigation({ canExecuteLeaveAccrual: true, canAdjustLeaveLedger: true }));
    assert.ok(sections.includes("people-leave-accrual-auto"));
    assert.ok(sections.includes("people-leave-usage"));
    assert.equal(sections.includes("people-leave-accrual-manual"), false);
  } finally {
    await server.close();
  }
});

test("LV-04 mounts API-backed Forest accrual screens without generic placeholders", async () => {
  const [peopleHome, shell, catalog, automatic, manual, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/components/Shell.jsx"),
    source("src/people/peopleFeatureCatalog.js"),
    source("src/people/leave/LeaveAccrualAutoPage.tsx"),
    source("src/people/leave/LeaveAccrualManualPage.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css")
  ]);
  assert.match(catalog, /section: "people-leave-accrual-auto"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.accrual\.execute"/);
  assert.match(catalog, /section: "people-leave-accrual-manual"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.ledger\.adjust"/);
  const sidebarEnabledSections = catalog.match(/const PEOPLE_SIDEBAR_ENABLED_SECTIONS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
  assert.doesNotMatch(sidebarEnabledSections, /people-leave-accrual-manual/);
  assert.match(shell, /getPeopleNavigationGroups/);
  assert.match(peopleHome, /currentSection === "people-leave-accrual-auto" && canExecuteLeaveAccrual[\s\S]{0,180}<LeaveAccrualAutoPage/);
  assert.match(peopleHome, /<LeaveAccrualAutoPage canExport=\{canExportLeaveReport\}/);
  assert.match(peopleHome, /currentSection === "people-leave-accrual-manual" && canAdjustLeaveLedger[\s\S]{0,180}<LeaveAccrualManualPage/);
  assert.match(peopleHome, /data-leave-accrual-access="denied"/);
  assert.match(peopleHome, /data-leave-ledger-access="denied"/);
  assert.match(automatic, /previewHrxLeaveAccrual/);
  assert.match(automatic, /executeHrxLeaveAccrual/);
  assert.match(automatic, /updateHrxLeaveAccrualRule/);
  assert.match(automatic, /deactivateHrxLeaveAccrualRule/);
  assert.match(automatic, /value="tenure_table"/);
  assert.match(automatic, /새 버전/);
  assert.match(automatic, /number\(rule, "version"\) \|\| 1/);
  assert.match(automatic, /규칙 중지/);
  assert.match(automatic, /previewHrxLeaveAccrualBatch/);
  assert.match(automatic, /executeHrxLeaveAccrualBatch/);
  assert.match(automatic, /retryHrxLeaveAccrualBatch/);
  assert.match(automatic, /exportHrxLeaveAccrualBatch/);
  assert.match(automatic, /한 번에 실행할 수 있는 기간은 최대 10년입니다/);
  assert.match(automatic, /aria-label="실행 방식"/);
  assert.match(automatic, /aria-label="배치 시작일"/);
  assert.match(automatic, /aria-label="배치 종료일"/);
  assert.match(automatic, /data-compact-record="true"/);
  assert.match(automatic, /import \{ safeEmployeeLabel \} from "\.\.\/peoplePresentation\.ts"/);
  assert.match(automatic, /return safeEmployeeLabel\(\{/);
  assert.match(automatic, /<td>\{employeeDisplayName\(row\)\}<\/td>/);
  assert.doesNotMatch(automatic, /<td>\{text\(row, "display_name"\) \|\| text\(row, "employee_id"\)\}<\/td>/);
  assert.match(automatic, /실패 기간 재시도/);
  assert.match(automatic, /CSV/);
  assert.match(automatic, /XLSX/);
  assert.match(automatic, /snapshot_hash/);
  assert.match(automatic, /runs\.length > 0 &&/);
  assert.doesNotMatch(automatic, /meta="HR 전용"|미리보기 이후 원천 버전|규칙과 기간을 선택한 뒤 미리보기를 실행하세요|스냅샷 <strong>/);
  assert.match(manual, /previewHrxLeaveManualAdjustment/);
  assert.match(manual, /executeHrxLeaveManualAdjustment/);
  assert.match(manual, /fetchHrxLeaveOccurrenceTemplate/);
  assert.match(manual, /approved_by_actor_id/);
  assert.match(manual, /CSV 양식/);
  assert.match(manual, /XLSX 양식/);
  assert.match(manual, /xlsx_content_base64/);
  assert.match(manual, /accept="\.csv,text\/csv,\.xlsx,application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet"/);
  assert.doesNotMatch(manual, /검증 완료/);
  assert.doesNotMatch(manual, /입력 행을 검증하면 결과가 여기에 표시됩니다/);
  assert.match(client, /requestHrxStepUpSession/);
  assert.match(client, /\/api\/hrx\/leave\/accrual\/batches\/preview/);
  assert.match(client, /\/batches\/\$\{encodeURIComponent\(previewBatchId\)\}\/execute/);
  assert.match(client, /\/batches\/\$\{encodeURIComponent\(batchId\)\}\/retry/);
  assert.match(client, /\/batches\/\$\{encodeURIComponent\(batchId\)\}\/export/);
  assert.match(styles, /\.leave-accrual-runbar/);
  assert.match(styles, /\.leave-accrual-batch-table \.data-table/);
  assert.match(styles, /\.leave-accrual-batch-table \.data-table th,[\s\S]{0,120}height: 44px/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-accrual-form,[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-accrual-auto"[\s\S]{0,160}<PeopleFeatureStatePanel/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-accrual-manual"[\s\S]{0,160}<PeopleFeatureStatePanel/);
});

test("LV-04 renders automatic accrual results with human names and a fail-closed fallback", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, ".omo/evidence/leave-accrual-auto-employee-labels");
  await mkdir(evidenceDir, { recursive: true });
  const page = await harness.browser.newPage({
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  const rule = {
    accrual_rule_id: "rule-annual-2026",
    rule_code: "annual-2026",
    display_name: "2026년 연차",
    policy_version_id: "annual-2026-v1",
    status: "active",
    effective_from: "2026-01-01",
    version: 1,
    rule_json: JSON.stringify({ basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "01-01", amount_minutes: 480, minutes_per_day: 480, expiration_months: 12 }),
  };
  const rows = [
    { employee_id: "emp-human", display_name: "김아민", status: "ready", reason_code: "eligible", amount_minutes: 480, valid_from: "2026-01-01", expires_on: "2026-12-31" },
    { employee_id: "emp-missing", display_name: "", status: "error", reason_code: "employment_profile_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-server-fallback", display_name: "emp-server-fallback", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "EMP-SUBSTRING", display_name: "직원 emp-substring 기록", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-uuid", display_name: "참조 550e8400-e29b-41d4-a716-446655440000 기록", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-opaque", display_name: "회원 opaque-9f2a4c7b8d1e", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-generic-uuid", display_name: "550e8400-e29b-01d4-0716-446655440000", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-email", display_name: "lawyer@example.com", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-hex", display_name: "0123456789abcdef0123456789abcdef", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "emp-x", display_name: "prefixEMP-Xpost", status: "error", reason_code: "work_schedule_missing", amount_minutes: 0, valid_from: "", expires_on: "" },
    { employee_id: "lee", display_name: "Leena Kim", status: "ready", reason_code: "eligible", amount_minutes: 480, valid_from: "2026-01-01", expires_on: "2026-12-31" },
  ];
  try {
    await page.route("**/__leave_accrual_auto_render__.html", (route) => route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"ko\"><body><main id=\"root\"></main></body></html>",
    }));
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/hrx/leave/accrual/rules" && request.method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "ok", rules: [rule] }) });
      }
      if (pathname === "/api/hrx/leave/configuration" && request.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ outcome: "ok", groups: [], types: [], policies: [{ policy_version_id: "annual-2026-v1", policy_code: "ANNUAL-2026", version: 1, status: "active" }] }),
        });
      }
      if (pathname === "/api/hrx/leave/accrual/runs" && request.method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "ok", runs: [] }) });
      }
      if (pathname === "/api/hrx/leave/accrual/preview" && request.method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ outcome: "ok", run: { accrual_run_id: "run-auto-labels", mode: "preview", snapshot_hash: "sha256:auto-labels", result: { rows, counts: { ready: 1, errors: 2 } } } }),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "ok" }) });
    });
    await page.goto(`${harness.baseUrl}/__leave_accrual_auto_render__.html`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      const [ReactModule, ReactDomModule, automaticModule] = await Promise.all([
        import("/node_modules/.vite/deps/react.js"),
        import("/node_modules/.vite/deps/react-dom_client.js"),
        import("/src/people/leave/LeaveAccrualAutoPage.tsx"),
      ]);
      const React = ReactModule.default ?? ReactModule;
      const ReactDom = ReactDomModule.default ?? ReactDomModule;
      const root = ReactDom.createRoot(document.getElementById("root"));
      root.render(React.createElement(automaticModule.LeaveAccrualAutoPage, { canExport: false }));
    });
    const panel = page.locator("#people-leave-accrual-auto");
    await panel.getByText("휴가 자동 발생", { exact: true }).waitFor();
    await panel.getByLabel("실행 방식").selectOption("single");
    const runSection = panel.getByRole("region", { name: "미리보기와 실행" });
    await runSection.getByLabel("발생 규칙").selectOption(rule.accrual_rule_id);
    await runSection.getByRole("button", { name: "미리보기", exact: true }).click();
    const resultRows = runSection.locator(".data-table tbody tr");
    await resultRows.nth(0).getByText("김아민", { exact: true }).waitFor();
    await resultRows.nth(1).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(2).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(3).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(4).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(5).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(6).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(7).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(8).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(9).getByText("구성원 이름 확인 필요", { exact: true }).waitFor();
    await resultRows.nth(10).getByText("Leena Kim", { exact: true }).waitFor();
    assert.equal(await panel.getByText("emp-human", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-missing", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-server-fallback", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("EMP-SUBSTRING", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-uuid", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-opaque", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-generic-uuid", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-email", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-hex", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("emp-x", { exact: true }).count(), 0);
    assert.equal(await panel.getByText("lee", { exact: true }).count(), 0);
    const screenshotPath = join(evidenceDir, "automatic-accrual-result-employee-labels.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const proofPath = join(evidenceDir, "automatic-accrual-result-employee-labels.json");
    await writeFile(proofPath, `${JSON.stringify({
      schema_version: "law-firm-os.people.leave-accrual-auto-employee-labels-web-proof.v1",
      captured_at: new Date().toISOString(),
      invocation: "node --test apps/web/test/leave-accrual-ui.test.mjs",
      scenario: "single automatic accrual preview with valid names and missing, embedded-ID, UUID, email, hex, and opaque-token rows",
      displayed_labels: ["김아민", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "Leena Kim"],
      raw_employee_ids_visible: false,
      screenshot: screenshotPath,
      validation_artifacts: {
        focused_node22: join(evidenceDir, "focused-node22.tap"),
        typecheck_node22: join(evidenceDir, "typecheck-node22.tap"),
        diff_check: join(evidenceDir, "diff-check.tap"),
      },
    }, null, 2)}\n`, "utf8");
  } finally {
    await page.close();
    await harness.close();
  }
});
