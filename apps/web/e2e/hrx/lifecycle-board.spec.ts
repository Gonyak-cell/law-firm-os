import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Lifecycle board reads onboarding and offboarding state through HRX APIs", async () => {
  const component = await readWebFile("src/people/lifecycle/LifecycleBoard.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");
  const runner = await readFile(resolve(root, "../../scripts/run-web-e2e.mjs"), "utf8");

  assert.match(home, /LifecycleBoard/);
  assert.match(component, /fetchHrxLifecycleBoard/);
  assert.match(component, /updateHrxOnboardingTask/);
  assert.match(component, /closeHrxOffboardingCase/);
  assert.match(component, /taskTitleLabel/);
  assert.match(component, /documentSummary/);
  assert.match(component, /입퇴사 관리 업무를 불러오지 못했습니다/);
  assert.doesNotMatch(component, /<strong>{task\.title}<\/strong>|plan\.employee_id|plan\.document_refs\?\.join|<strong>{caseItem\.offboarding_id}<\/strong>|caseItem\.employee_id/);
  assert.match(api, /\/api\/hrx\/lifecycle\/onboarding/);
  assert.match(api, /\/api\/hrx\/lifecycle\/offboarding/);
  assert.match(runner, /lifecycle-board/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
