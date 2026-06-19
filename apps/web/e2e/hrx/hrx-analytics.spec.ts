import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("HR analytics panel fetches tenant-scoped analytics API without static fallback metrics", async () => {
  const component = await readWebFile("src/people/analytics/HRAnalytics.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /HRAnalytics/);
  assert.match(component, /fetchHrxAnalytics/);
  assert.match(api, /\/api\/hrx\/analytics/);
  assert.match(component, /Tenant-scoped analytics read model/);
  assert.match(component, /No static metric fallback is rendered/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
