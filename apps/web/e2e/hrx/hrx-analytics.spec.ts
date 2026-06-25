import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("People summary panel fetches workspace API without static fallback cards", async () => {
  const component = await readWebFile("src/people/analytics/HRAnalytics.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /HRAnalytics/);
  assert.match(home, /people-analytics/);
  assert.match(component, /fetchHrxAnalytics/);
  assert.match(api, /\/api\/hrx\/analytics/);
  assert.match(component, /리포트/);
  assert.match(component, /실시간 리포트/);
  assert.match(component, /요약/);
  assert.match(component, /개별 상세/);
  assert.match(component, /리포트를 불러올 수 없습니다/);
  assert.doesNotMatch(component, /People 현황|People 업무 요약|인사 현황|구성원 인사이트|인력 현황/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
