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
  assert.match(peopleHome, /currentSection === "people-leave-usage"[\s\S]{0,180}<LeaveUsagePage canExport=\{canExportLeaveReport\}/);
  assert.match(peopleHome, /currentSection === "people-leave-termination" && canSettleLeaveTermination[\s\S]{0,180}<LeaveTerminationPage/);
  assert.match(peopleHome, /data-leave-termination-access="denied"/);
  assert.match(usage, /fetchHrxLeaveUsage/);
  assert.match(usage, /validateHrxLeaveBalances/);
  assert.match(usage, /exportHrxLeaveUsage\(format, filters\)/);
  assert.match(usage, /download\("xlsx"\)/);
  assert.match(usage, /document\.body\.append\(anchor\)[\s\S]{0,120}anchor\.click\(\)[\s\S]{0,120}setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 1000\)/);
  assert.match(usage, /사유와 첨부는 기본 내보내기에서 제외됩니다/);
  assert.match(termination, /previewHrxLeaveTermination/);
  assert.match(termination, /executeHrxLeaveTermination/);
  assert.match(termination, /purpose="leave_termination_settlement"/);
  assert.match(termination, /급여 시스템의 전달 확인/);
  assert.match(client, /\/api\/hrx\/leave\/ledger/);
  assert.match(client, /\/api\/hrx\/leave\/reports\/export/);
  assert.match(client, /\/api\/hrx\/leave\/termination-reconciliations\/execute/);
  assert.match(styles, /\.leave-report-filters/);
  assert.match(styles, /\.people-surface\s*\{[^}]*container-type:\s*inline-size/);
  assert.match(styles, /@container \(max-width: 900px\)[\s\S]*\.leave-report-filters,[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@container \(max-width: 900px\)[\s\S]*\.leave-approval-row,[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-report-summary,[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-usage"[\s\S]{0,160}<PeopleFeatureStatePanel/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-termination"[\s\S]{0,160}<PeopleFeatureStatePanel/);
});
