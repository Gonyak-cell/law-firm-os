import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("People inquiry panel uses API routes and reviewed guidance without local fallback answers", async () => {
  const component = await readWebFile("src/people/ai/HRAIAssistant.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /HRAIAssistant/);
  assert.match(home, /people-ai/);
  assert.match(component, /askHrxAiAssistant/);
  assert.match(component, /fetchHrxAiReviews/);
  assert.match(api, /\/api\/hrx\/ai\/assistant/);
  assert.match(api, /\/api\/hrx\/ai\/reviews/);
  assert.match(component, /인사 문의/);
  assert.doesNotMatch(component, /People 문의/);
  assert.match(component, /참고 자료 .*건 확인|검토 대기/);
  assert.match(component, /검토 상태:/);
  assert.match(component, /답변을 준비할 수 없습니다/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
