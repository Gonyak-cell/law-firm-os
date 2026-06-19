import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("HR AI assistant uses API route and human review queue without local fallback answers", async () => {
  const component = await readWebFile("src/people/ai/HRAIAssistant.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /HRAIAssistant/);
  assert.match(component, /askHrxAiAssistant/);
  assert.match(component, /fetchHrxAiReviews/);
  assert.match(api, /\/api\/hrx\/ai\/assistant/);
  assert.match(api, /\/api\/hrx\/ai\/reviews/);
  assert.match(component, /human review queue/);
  assert.match(component, /No local assistant fallback is rendered/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
