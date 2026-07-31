import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function withFlags(callback) {
  const server = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    return await callback(await server.ssrLoadModule("/src/people/peopleFeatureFlags.ts"));
  } finally {
    await server.close();
  }
}

test("overview flag off keeps the existing member roster fallback", async () => {
  await withFlags(({ peopleDefaultSection, peopleOverviewMode, resolvePeopleWebFeatureFlags }) => {
    assert.equal(peopleOverviewMode(resolvePeopleWebFeatureFlags()), "member_roster");
    assert.equal(peopleDefaultSection(resolvePeopleWebFeatureFlags()), "people-members");
    assert.equal(
      peopleOverviewMode(resolvePeopleWebFeatureFlags({ people_overview: true })),
      "operations_dashboard",
    );
    assert.equal(
      peopleDefaultSection(resolvePeopleWebFeatureFlags({ people_overview: true })),
      "people-overview",
    );
  });
  const source = await readFile(resolve(webRoot, "src/people/PeopleHome.tsx"), "utf8");
  assert.match(source, /peopleOverviewMode/);
  assert.match(source, /data-people-overview-fallback/);
});

test("Outlook kill switch does not disable the Matter member brief", async () => {
  await withFlags(({ peopleMemberBriefSources, resolvePeopleWebFeatureFlags }) => {
    const sources = peopleMemberBriefSources(resolvePeopleWebFeatureFlags({
      people_member_brief: true,
      outlook_calendar: false,
      people_capacity: true,
    }));
    assert.deepEqual(sources, {
      matter: true,
      outlook: false,
      capacity: true,
    });
  });
});
