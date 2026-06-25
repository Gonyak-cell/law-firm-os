import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("People payroll boundary uses API preview/export routes without payment execution", async () => {
  const component = await readWebFile("src/people/payroll/PayrollBoundaryPanel.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");
  const shell = await readWebFile("src/components/Shell.jsx");

  assert.match(shell, /급여정산/);
  assert.match(home, /PayrollBoundaryPanel/);
  assert.match(home, /people-payroll/);
  assert.match(component, /createHrxPayrollPreview/);
  assert.match(component, /approveHrxPayrollPreview/);
  assert.match(component, /exportHrxPayrollArtifact/);
  assert.match(component, /calculation_runtime/);
  assert.match(component, /disbursement_instruction_included/);
  assert.match(component, /급여정산/);
  assert.match(component, /미리보기·내보내기 전용/);
  assert.match(component, /계산·세금·지급 실행은 아직 제공하지 않습니다/);
  assert.match(component, /정산 처리/);
  assert.match(component, /송금·지급 지시는 아직 구현되지 않았습니다/);
  assert.match(api, /\/api\/hrx\/payroll\/preview/);
  assert.match(api, /\/api\/hrx\/payroll\/approve/);
  assert.match(api, /\/api\/hrx\/payroll\/export/);
  assert.match(api, /hrx\.payroll\.preview/);
  assert.match(api, /hrx\.payroll\.export/);
  assert.doesNotMatch(component, /net_pay|gross_pay|tax_withholding|["']disbursement_instruction["']|disbursement_instruction\s*:/);
  assert.doesNotMatch(component, /calculation_runtime=false|disbursement_instruction_included=false|문서 ref|external-preview-only/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
