import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("People home is routed and loads API-backed overview state", async () => {
  const app = await readWebFile("src/App.jsx");
  const nav = await readWebFile("src/data/nav.js");
  const home = await readWebFile("src/people/PeopleHome.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(nav, /id: "people"/);
  assert.match(app, /view === "people"/);
  assert.match(home, /fetchHrxPeopleOverview/);
  assert.match(home, /data-hrx-api-backed="true"/);
  assert.match(home, /people-analytics/);
  assert.match(home, /people-ai/);
  assert.match(api, /fetchHrxPeopleOverview/);
  assert.match(api, /\/api\/hrx\/employees/);
  assert.doesNotMatch(api, /mockData|profileRows/);
});
