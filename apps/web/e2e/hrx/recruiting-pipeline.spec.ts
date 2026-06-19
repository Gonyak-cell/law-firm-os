import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Recruiting pipeline reads pipeline data and updates stages through API", async () => {
  const component = await readWebFile("src/people/recruiting/RecruitingPipeline.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /RecruitingPipeline/);
  assert.match(component, /fetchRecruitingPipeline/);
  assert.match(component, /updateHrxApplicationStage/);
  assert.match(api, /\/api\/hrx\/recruiting\/pipeline/);
  assert.match(api, /\/api\/hrx\/recruiting\/applications\/\$\{encodeURIComponent\(applicationId\)\}\/stage/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
