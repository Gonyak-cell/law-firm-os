import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function withSearchPreferences(run) {
  const server = await createServer({
    configFile: false,
    root: webRoot,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error"
  });
  try {
    await run(await server.ssrLoadModule("/src/components/VaultSurface.jsx"));
  } finally {
    await server.close();
  }
}

test("Search preference transforms normalize, deduplicate, and preserve canonical order", async () => {
  await withSearchPreferences(async ({ normalizeSearchPreferences, rememberSearch, saveSearch }) => {
    let preferences = normalizeSearchPreferences({ recent: [], saved: [] });
    preferences = rememberSearch(preferences, "  의견서 초안  ");
    preferences = rememberSearch(preferences, "계약서");
    preferences = rememberSearch(preferences, "의견서 초안");
    preferences = saveSearch(preferences, "판결문");
    preferences = saveSearch(preferences, "판결문");
    preferences = saveSearch(preferences, "판결문", { current_version_only: false, date_from: "2026-01-01" });

    assert.deepEqual(preferences.recent.map(({ query }) => query), ["의견서 초안", "계약서"]);
    assert.deepEqual(preferences.saved.map(({ query }) => query), ["판결문", "판결문"]);
    assert.equal(preferences.saved[0].current_version_only, true);
    assert.equal(preferences.saved[0].date_from, "2026-01-01");
  });
});

test("Search preference transforms support clear and delete without browser storage", async () => {
  await withSearchPreferences(async ({ clearRecentSearches, rememberSearch, removeSavedSearch, saveSearch }) => {
    let preferences = { recent: [], saved: [] };
    preferences = rememberSearch(preferences, "증거 목록");
    preferences = saveSearch(preferences, "준비서면");
    assert.equal(preferences.saved.length, 1);
    assert.equal(clearRecentSearches(preferences).recent.length, 0);
    assert.equal(removeSavedSearch(preferences, preferences.saved[0].id).saved.length, 0);
  });
});
