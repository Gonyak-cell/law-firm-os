import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path: string) {
  return readFile(resolve(root, path), "utf8");
}

test("HR risk dashboard is API-backed and covers the legal five scan workflow", async () => {
  const component = await readWebFile("src/people/security/HrxRiskDashboard.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");
  const catalog = await readWebFile("src/people/peopleFeatureCatalog.js");
  const runner = await readFile(resolve(root, "../../scripts/run-web-e2e.mjs"), "utf8");

  assert.match(home, /people-risk/);
  assert.match(home, /HrxRiskDashboard/);
  assert.match(catalog, /section: "people-risk"/);
  assert.match(catalog, /label: "HR 리스크"/);
  assert.match(api, /\/api\/hrx\/risks/);
  assert.match(api, /\/api\/hrx\/risks\/scan/);
  assert.match(api, /transitionHrxRiskEvent/);
  for (const label of ["근로계약 미체결", "연차촉진 대상", "법정교육 미이수", "초과근로 위험", "퇴사자 권한 미회수"]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /data-hrx-risk-dashboard="true"/);
  assert.match(component, /data-hrx-risk-scan="true"/);
  assert.match(component, /data-hrx-risk-event-list="true"/);
  assert.match(component, /acknowledged/);
  assert.match(runner, /risk-dashboard/);
  assert.doesNotMatch(component, /mockData|staticRisk|sampleRisk|faker/);
});
