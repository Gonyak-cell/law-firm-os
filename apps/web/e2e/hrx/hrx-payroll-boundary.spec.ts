import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path: string) {
  return readFile(resolve(root, path), "utf8");
}

test("People payroll boundary reuses the persisted run state machine for settlement and close", async () => {
  const component = await readWebFile("src/people/payroll/PayrollBoundaryPanel.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");
  const shell = await readWebFile("src/components/Shell.jsx");
  const catalog = await readWebFile("src/people/peopleFeatureCatalog.js");

  assert.match(shell, /급여정산/);
  assert.match(catalog, /label: "마감 관리"[\s\S]*section: "people-close"/);
  assert.match(home, /PayrollBoundaryPanel/);
  assert.match(home, /people-payroll/);
  assert.match(home, /currentSection === "people-close"[\s\S]*payroll_close_precheck[\s\S]*mode="close"/);
  assert.match(component, /fetchHrxPayrollWorkspace/);
  assert.match(component, /fetchHrxPayrollClosePrecheck/);
  assert.match(component, /captureHrxPayrollRun/);
  assert.match(component, /previewHrxPayrollRun/);
  assert.match(component, /approveHrxPayrollRun/);
  assert.match(component, /closeHrxPayrollRun/);
  assert.match(component, /createHrxPayrollPeriod/);
  assert.match(component, /createHrxPayrollRun/);
  assert.match(component, /급여정산/);
  assert.match(component, /마감 관리/);
  assert.match(component, /마감 전 확인/);
  assert.match(component, /처리 화면 열기/);
  assert.match(component, /마감 이력/);
  assert.match(component, /작성자와 다른 승인자만 승인할 수 있습니다/);
  assert.match(api, /\/api\/hrx\/payroll\/periods/);
  assert.match(api, /\/api\/hrx\/payroll\/runs\/.*\/precheck/);
  assert.match(api, /\/api\/hrx\/payroll\/runs\/.*\/approve/);
  assert.match(api, /\/api\/hrx\/payroll\/runs\/.*\/close/);
  assert.doesNotMatch(component, /net_pay|gross_pay|tax_withholding|["']disbursement_instruction["']|disbursement_instruction\s*:/);
  assert.doesNotMatch(component, /마감 취소|원본 수정/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
