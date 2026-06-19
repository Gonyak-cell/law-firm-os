import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function readWebFile(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("sample UI regression harness preserves current routable surfaces", async () => {
  const navSource = await readWebFile("src/data/nav.js");
  const appSource = await readWebFile("src/App.jsx");
  const expectedViews = [
    "auth",
    "home",
    "content",
    "profiles",
    "analytics",
    "dashboards",
    "ask",
    "experiments",
    "admin",
    "dark"
  ];

  for (const view of expectedViews) {
    assert.match(navSource, new RegExp(`id: "${view}"`));
    assert.match(appSource, new RegExp(`view === "${view}"`));
  }
});

test("sample UI regression harness keeps live mode explicit and fail-closed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");
  const profilesSource = await readWebFile("src/components/ProfilesSurface.jsx");

  assert.match(appSource, /initialDataMode = initialParams\.get\("data"\) === "live" \? "live" : "mock"/);
  assert.match(apiClientSource, /GATED_RESPONSE_KEYS\.every/);
  assert.match(apiClientSource, /return \{ kind: "error" \}/);
  assert.match(profilesSource, /Live mode has no mock fallback/);
});
