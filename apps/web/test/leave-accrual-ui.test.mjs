import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

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
  assert.match(shell, /hiddenPeopleSidebarSections = new Set\([\s\S]{0,360}"people-leave-accrual-manual"/);
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
