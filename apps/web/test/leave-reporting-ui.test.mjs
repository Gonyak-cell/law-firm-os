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

test("LV-05 keeps usage visible to self-service and termination hidden without its granular scope", async () => {
  const server = await createServer({ configFile: false, root: webRoot, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  try {
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { canExportLeaveReport, canSettleLeaveTermination } = await server.ssrLoadModule("/src/data/hrxAccess.js");
    const staff = [{ session: { hrx_scopes: ["hrx.leave.self.read"] } }];
    const hr = [{ session: { hrx_scopes: ["hrx.leave.report.export", "hrx.leave.termination.settle"] } }];
    assert.equal(canExportLeaveReport(staff), false);
    assert.equal(canSettleLeaveTermination(staff), false);
    assert.equal(canExportLeaveReport(hr), true);
    assert.equal(canSettleLeaveTermination(hr), true);
    const staffSections = leaveSections(buildContextualNavigation({}));
    assert.ok(staffSections.includes("people-leave-usage"));
    assert.equal(staffSections.includes("people-leave-termination"), false);
    const hrSections = leaveSections(buildContextualNavigation({ canExportLeaveReport: true, canSettleLeaveTermination: true }));
    assert.ok(hrSections.includes("people-leave-usage"));
    assert.ok(hrSections.includes("people-leave-termination"));
  } finally {
    await server.close();
  }
});

test("LV-05 mounts API-backed reporting and termination surfaces without placeholders", async () => {
  const [peopleHome, catalog, usage, termination, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/peopleFeatureCatalog.js"),
    source("src/people/leave/LeaveUsagePage.tsx"),
    source("src/people/leave/LeaveTerminationPage.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css")
  ]);
  assert.match(catalog, /section: "people-leave-usage"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.self\.read"/);
  assert.match(catalog, /section: "people-leave-termination"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.termination\.settle"/);
  assert.match(peopleHome, /currentSection === "people-leave-usage"[\s\S]{0,240}<LeaveUsagePage canExport=\{canExportLeaveReport\} canProcessIntegrations=\{canManageLeavePolicy\} canAdjust=\{canAdjustLeaveLedger\}/);
  assert.match(peopleHome, /currentSection === "people-leave-termination" && canSettleLeaveTermination[\s\S]{0,180}<LeaveTerminationPage/);
  assert.match(peopleHome, /data-leave-termination-access="denied"/);
  assert.match(usage, /fetchHrxLeaveOccurrenceProjections/);
  assert.doesNotMatch(usage, /validateHrxLeaveBalances|잔액 대조|불일치|기준 없음/);
  assert.match(usage, /exportHrxLeaveOccurrences\(format, view, filters\)/);
  assert.match(usage, /download\("xlsx"\)/);
  assert.match(usage, /document\.body\.append\(anchor\)[\s\S]{0,120}anchor\.click\(\)[\s\S]{0,120}setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 1000\)/);
  assert.match(usage, /type OccurrenceView = "list" \| "month" \| "type"/);
  assert.match(usage, /\[\['list', '목록'\], \['month', '월별'\], \['type', '유형별'\]\]/);
  assert.match(usage, /수동 발생 조정안/);
  assert.match(usage, /파일 업로드 조정안/);
  assert.match(usage, />파일 업로드<\/button>/);
  assert.match(usage, /setStage\(stage === "manual" \? "" : "manual"\); setStepUpAction\(""\);/);
  assert.match(usage, /setStage\(stage === "upload" \? "" : "upload"\); setStepUpAction\(""\);/);
  assert.match(usage, /예정 발생 조정안/);
  assert.match(usage, /purpose="leave_ledger_adjustment"/);
  assert.match(usage, /schedule_only: true/);
  assert.match(usage, /min=\{offsetDate\(today, 0, 1\)\}/);
  assert.match(usage, /fetchHrxLeaveOccurrenceTemplate/);
  assert.match(usage, /fetchHrxLeaveOccurrenceTemplate\(format\)/);
  assert.match(usage, /downloadTemplate\("csv"\)/);
  assert.match(usage, /downloadTemplate\("xlsx"\)/);
  assert.match(usage, /xlsx_content_base64/);
  assert.match(usage, /accept="\.csv,text\/csv,\.xlsx,application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet"/);
  assert.doesNotMatch(usage, /CSV 업로드 조정안/);
  assert.doesNotMatch(usage, />CSV 업로드<\/button>/);
  assert.match(usage, /previewHrxLeaveOccurrenceUpload/);
  assert.match(usage, /executeHrxLeaveOccurrenceUpload/);
  assert.match(usage, /retryHrxLeaveOccurrenceUpload/);
  assert.match(usage, /updateHrxScheduledLeaveEntitlement/);
  assert.match(usage, /cancelHrxScheduledLeaveEntitlement/);
  assert.match(usage, /<details className="leave-integration-status">/);
  assert.doesNotMatch(usage, /사유와 첨부는 기본 내보내기에서 제외됩니다|현재 권한과 필터에 해당하는 원장 내역이 없습니다/);
  assert.match(termination, /previewHrxLeaveTermination/);
  assert.match(termination, /executeHrxLeaveTermination/);
  assert.match(termination, /purpose="leave_termination_settlement"/);
  assert.match(termination, /previewed: "미리보기"/);
  assert.match(termination, /급여 전달 확인 대기/);
  assert.doesNotMatch(termination, /대상을 선택하고 미리보기를 실행하면|아직 정산 이력이 없습니다|금액은 계산하지 않고 급여에서 검토할/);
  assert.match(client, /\/api\/hrx\/leave\/occurrences\/projections/);
  assert.match(client, /\/api\/hrx\/leave\/occurrences\/export/);
  assert.match(client, /\/api\/hrx\/leave\/accrual\/manual\/uploads\/preview/);
  assert.match(client, /\/api\/hrx\/leave\/entitlements\/\$\{encodeURIComponent\(entitlementId\)\}/);
  assert.match(client, /\/api\/hrx\/leave\/termination-reconciliations\/execute/);
  assert.match(styles, /\.leave-report-filters/);
  assert.match(styles, /\.leave-occurrence-table tbody tr,[\s\S]{0,100}height: 44px/);
  assert.match(styles, /\.leave-occurrence-stage[\s\S]{0,180}border-left: 3px solid var\(--am-accent\)/);
  assert.match(styles, /\.leave-integration-status > summary/);
  assert.match(styles, /\.people-surface\s*\{[^}]*container-type:\s*inline-size/);
  assert.match(styles, /@container \(max-width: 900px\)[\s\S]*\.leave-report-filters,[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@container \(max-width: 900px\)[\s\S]*\.leave-approval-row,[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-report-summary,[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-usage"[\s\S]{0,160}<PeopleFeatureStatePanel/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-termination"[\s\S]{0,160}<PeopleFeatureStatePanel/);
});
