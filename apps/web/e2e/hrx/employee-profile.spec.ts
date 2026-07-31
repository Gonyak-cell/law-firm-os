import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path: string) {
  return readFile(resolve(root, path), "utf8");
}

test("Employee profile is scoped and keeps compensation masked by default", async () => {
  const profile = await readWebFile("src/people/employees/EmployeeProfile.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(profile, /fetchHrxEmployeeProfile/);
  assert.match(api, /\/api\/hrx\/employees\/\$\{encodeURIComponent\(employeeId\)\}/);
  assert.match(profile, /권한 필요/);
  assert.match(profile, /label="소속" value=\{displayValue\(employee\.affiliation\)\}/);
  assert.match(profile, /label="부서" value=\{displayValue\(employee\.department\)\}/);
  assert.match(profile, /label="조직" value=\{displayValue\(employee\.organization_group\)\}/);
  assert.match(profile, /fetchHrxCompensationRecords/);
  assert.match(profile, /HrxStepUpChallenge/);
  assert.match(profile, /label="보상 정보" value=\{compensationStatus\(compensationResult\)\}/);
  assert.match(profile, /data-hrx-compensation-records="true"/);
  assert.match(profile, /급여 금액 비공개/);
  assert.doesNotMatch(profile, /마스킹 참조/);
  assert.match(profile, /masked_compensation_ref/);
  assert.match(profile, /contract_document_ref/);
  assert.doesNotMatch(profile, /현재 조직/);
  assert.doesNotMatch(profile, /salary|base_pay|bonus_amount/);
});
