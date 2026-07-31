import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path: string) {
  return readFile(resolve(root, path), "utf8");
}

test("Recruiting pipeline reads pipeline data and updates stages through API", async () => {
  const component = await readWebFile("src/people/recruiting/RecruitingPipeline.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /RecruitingPipeline/);
  assert.match(component, /fetchRecruitingPipeline/);
  assert.match(component, /createHrxRecruitingPipeline/);
  assert.match(component, /fetchHrxEmployees/);
  assert.match(component, /pipeline_creation_state/);
  assert.match(component, /job_title: ""/);
  assert.match(component, /updateHrxApplicationStage/);
  assert.match(component, /updateHrxOfferStage/);
  assert.match(component, /convertHrxApplicationToEmployee/);
  assert.match(component, /면접/);
  assert.match(component, /구성원 등록/);
  assert.match(component, /합격자/);
  assert.match(api, /offers: result\.body\.offers \?\? \[\]/);
  assert.match(api, /\/api\/hrx\/recruiting\/pipeline/);
  assert.match(api, /\/api\/hrx\/recruiting\/applications\/\$\{encodeURIComponent\(applicationId\)\}\/stage/);
  assert.match(api, /convert-to-employee/);
  assert.doesNotMatch(api, /Vault:|CompPackage:|hiring_manager_employee_id: "emp-001"/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
