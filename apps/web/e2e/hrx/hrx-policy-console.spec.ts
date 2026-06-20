import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("HRX policy console reads and creates policy versions through API", async () => {
  const component = await readWebFile("src/admin/hrx/HRXPolicyConsole.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /HRXPolicyConsole/);
  assert.match(component, /fetchHrxPolicies/);
  assert.match(component, /createHrxPolicyVersion/);
  assert.match(api, /\/api\/hrx\/policies/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
