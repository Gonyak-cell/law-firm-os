import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function source(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("PY-UI-001/002 replaces the export placeholder with the persisted payroll workspace", async () => {
  const [peopleHome, workspace, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/payroll/PayrollBoundaryPanel.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css")
  ]);

  assert.match(peopleHome, /currentSection === "people-payroll"[\s\S]{0,160}<PayrollBoundaryPanel/);
  assert.match(workspace, /data-payroll-runtime="true"/);
  assert.match(workspace, /fetchHrxPayrollWorkspace/);
  assert.match(workspace, /captureHrxPayrollRun/);
  assert.match(workspace, /previewHrxPayrollRun/);
  assert.match(workspace, /approveHrxPayrollRun/);
  assert.match(workspace, /closeHrxPayrollRun/);
  assert.match(workspace, /resolveHrxPayrollIssue/);
  assert.match(workspace, /data-payroll-operation="payment"/);
  assert.match(workspace, /data-payroll-operation="filing"/);
  assert.match(workspace, /prepareHrxPayrollPayment/);
  assert.match(workspace, /approveHrxPayrollPayment/);
  assert.match(workspace, /exportHrxPayrollPayment/);
  assert.match(workspace, /reconcileHrxPayrollPayment/);
  assert.match(workspace, /createHrxPayrollFiling/);
  assert.match(workspace, /validateHrxPayrollFiling/);
  assert.match(workspace, /submitHrxPayrollFiling/);
  assert.match(workspace, /correctHrxPayrollFiling/);
  assert.match(workspace, /\["year_end", "연말정산"\]/);
  assert.match(workspace, /collectHrxPayrollYearEnd/);
  assert.match(workspace, /calculateHrxPayrollYearEnd/);
  assert.match(workspace, /reviewHrxPayrollYearEnd/);
  assert.match(workspace, /자료 수집/);
  assert.match(workspace, /정산 계산/);
  assert.match(workspace, /검토 승인/);
  assert.match(workspace, /receiptRef\.split\("\/"\)\.at\(-1\)\?\.slice\(0, 12\)/);
  assert.match(workspace, /작성자와 다른 승인자만 승인할 수 있습니다/);
  assert.match(workspace, /createPortal\(/);
  assert.match(workspace, /role="dialog"/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /급여기간/);
  assert.match(workspace, /지급총액/);
  assert.match(workspace, /실지급/);
  assert.doesNotMatch(workspace, /내보내기 전용|계산 처리는 아직 구현되지 않았습니다|지급 처리는 아직 구현되지 않았습니다|외부 급여 서비스/);

  for (const route of ["periods", "snapshot", "preview", "approve", "close", "issues"]) assert.match(client, new RegExp(`/api/hrx/payroll/[\\s\\S]{0,220}${route}`));
  for (const action of ["collect", "calculate", "review"]) assert.match(client, new RegExp(`year-end/${action}`));
  assert.match(styles, /\.payroll-table th,[\s\S]{0,100}height: 44px/);
  assert.match(styles, /\.payroll-operation-table th,[\s\S]{0,100}height: 44px/);
  assert.match(styles, /\.payroll-period-facts > span,[\s\S]{0,500}white-space: nowrap/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.payroll-toolbar[\s\S]*flex-direction: column/);
});

test("PY-UI-003/004 keeps employee detail source-bound and compact", async () => {
  const workspace = await source("src/people/payroll/PayrollBoundaryPanel.tsx");
  assert.match(workspace, /detailLines/);
  assert.match(workspace, /formula_code/);
  assert.match(workspace, /detailSnapshot/);
  assert.match(workspace, /source_refs/);
  assert.match(workspace, /detailAdjustments/);
  assert.match(workspace, /detailIssues/);
  assert.doesNotMatch(workspace, /input_json|encrypted_amount_ref|bank_account/);
});

test("PY-DOC-001/003/004 exposes one compact statement workspace for generate, export, delivery, and self download", async () => {
  const [peopleHome, workspace, client] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/payroll/PayrollStatementWorkspace.tsx"),
    source("src/people/hrxApiClient.ts"),
  ]);
  assert.match(peopleHome, /currentSection === "people-pay-statement"[\s\S]{0,180}<PayrollStatementWorkspace/);
  assert.match(workspace, /generateHrxPayrollStatements/);
  assert.match(workspace, /exportHrxPayrollRegister/);
  assert.match(workspace, /deliveryChannel/);
  assert.match(workspace, /value="email"/);
  assert.match(workspace, /value="message"/);
  assert.match(workspace, /value="self_service"/);
  assert.match(workspace, /fetchHrxPayrollStatementsSelf/);
  assert.match(workspace, /readHrxPayrollStatement/);
  for (const route of ["statements", "deliver", "export", "download"]) assert.match(client, new RegExp(`/api/hrx/payroll/[\\s\\S]{0,300}${route}`));
});
