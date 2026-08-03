import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import test from "node:test";

const webRoot = new URL("..", import.meta.url).pathname;
const foundationFixtureUrl = new URL("../../../packages/matter/test/fixtures/matter-small-firm-foundation.fixture.json", import.meta.url);
const uiStatesFixtureUrl = new URL("../../../packages/matter/test/fixtures/matter-small-firm-ui-states.fixture.json", import.meta.url);

const [foundation, uiStates] = await Promise.all([
  readFile(foundationFixtureUrl, "utf8").then(JSON.parse),
  readFile(uiStatesFixtureUrl, "utf8").then(JSON.parse)
]);

const viteServer = await createServer({
  configFile: false,
  root: webRoot,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true, hmr: false }
});
const shell = await viteServer.ssrLoadModule("/src/components/Shell.jsx");
const globalUtilities = await viteServer.ssrLoadModule("/src/data/globalUtilities.js");
await viteServer.close();

const canonicalRouteIds = [
  "matter-today",
  "matter-list",
  "matter-work",
  "matter-calendar",
  "matter-followups",
  "matter-time-billing"
];
const entityKeyByName = {
  people: "person_id",
  matters: "matter_id",
  tasks: "task_id",
  calendar_events: "event_id",
  followups: "followup_id",
  time_entries: "time_entry_id",
  wip: "wip_id",
  invoices: "invoice_id",
  receivables: "receivable_id"
};

function stableSeedSnapshot(seed) {
  return Object.fromEntries(Object.entries(entityKeyByName).map(([name, key]) => [
    name,
    seed[name]
      .map((record) => JSON.parse(JSON.stringify(record)))
      .toSorted((left, right) => String(left[key]).localeCompare(String(right[key])))
  ]));
}

function countBy(records, key) {
  return Object.fromEntries([...records.reduce((counts, record) => {
    const value = record[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map())]);
}

test("[TUW-01] deterministic 10-person seed keeps stable IDs, counts, and operational lanes", () => {
  const firstSeed = stableSeedSnapshot(foundation);
  const secondSeed = stableSeedSnapshot(JSON.parse(JSON.stringify(foundation)));

  assert.deepEqual(firstSeed, secondSeed);
  for (const [name, expectedCount] of Object.entries(foundation.seed_contract.expected_counts)) {
    assert.equal(foundation[name].length, expectedCount, `${name} count`);
    const key = entityKeyByName[name];
    assert.equal(new Set(foundation[name].map((record) => record[key])).size, expectedCount, `${name} IDs unique`);
    const sortedIds = [...foundation[name]]
      .toSorted((left, right) => String(left[key]).localeCompare(String(right[key])))
      .map((record) => record[key]);
    assert.deepEqual(foundation[name].map((record) => record[key]), sortedIds, `${name} sorted by ID`);
  }
  assert.deepEqual(countBy(foundation.matters, "status"), foundation.seed_contract.matter_status_counts);
  assert.deepEqual({
    overdue: foundation.tasks.filter((task) => task.lane === "overdue").length,
    today: foundation.tasks.filter((task) => task.lane === "today").length,
    waiting: foundation.tasks.filter((task) => task.lane === "waiting").length,
    blocked: foundation.tasks.filter((task) => task.lane === "blocked").length,
    unassigned: foundation.tasks.filter((task) => task.lane === "unassigned").length,
    done_or_archived: foundation.tasks.filter((task) => ["done", "archived"].includes(task.lane)).length
  }, foundation.seed_contract.task_lane_counts);
  assert.deepEqual(countBy(foundation.followups, "queue"), foundation.seed_contract.followup_queue_counts);
  assert.equal(foundation.time_entries.filter((entry) => !entry.billable).length, foundation.seed_contract.time_contract.non_billable);
  assert.equal(foundation.time_entries.filter((entry) => entry.locked).length, foundation.seed_contract.time_contract.locked);
  assert.deepEqual(foundation.seed_contract.time_contract.missing_person_ids, ["person-09", "person-10", "person-04"]);
  assert.deepEqual(countBy(foundation.invoices, "status"), foundation.seed_contract.invoice_status_counts);
  assert.equal(foundation.synthetic_only, true);
  assert.match(foundation.as_of, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("[TUW-02] Matter navigation exposes exactly six non-empty canonical purpose routes", () => {
  const navigation = shell.buildContextualNavigation();
  const routes = navigation.matters.items;

  assert.equal(routes.length, canonicalRouteIds.length);
  assert.deepEqual(routes.map((route) => route.section), canonicalRouteIds);
  assert.deepEqual(routes.map((route) => route.label), ["오늘", "사건", "업무", "일정", "연락·후속", "시간·청구"]);
  assert.equal(routes.every((route) => route.view === "matters"), true);
  assert.equal(routes.every((route) => route.surface === "MattersSurface"), true);
  assert.equal(routes.every((route) => route.icon), true);
  assert.equal(routes.every((route) => !route.children), true);
  assert.equal(routes.filter((route) => route.active).length, 1);
  assert.equal(routes[0].active, true);
});

test("[TUW-03] legacy Matter URLs resolve to one of the canonical routes or global settings", () => {
  const legacyRoutes = shell.MATTER_LEGACY_ROUTE_REDIRECTS;
  assert.equal(legacyRoutes.length >= 13, true);
  const canonical = new Set(canonicalRouteIds);

  for (const legacy of legacyRoutes) {
    const resolved = shell.resolveMatterRoute(legacy.from);
    if (legacy.targetView === "settings") {
      assert.deepEqual(resolved, {
        view: "settings",
        section: "settings-integrations",
        redirectedFrom: { view: "matters", section: legacy.from }
      });
    } else {
      assert.equal(resolved.view, "matters", legacy.from);
      assert.equal(canonical.has(resolved.section), true, legacy.from);
      assert.deepEqual(resolved.redirectedFrom, { view: "matters", section: legacy.from });
    }

    const globalResolved = globalUtilities.resolveGlobalShortcut("matters", legacy.from);
    assert.equal(globalResolved.section, resolved.section, `${legacy.from} section`);
    assert.equal(globalResolved.view, resolved.view, `${legacy.from} view`);
  }

  assert.deepEqual(globalUtilities.resolveGlobalShortcut("matters", ""), { view: "matters", section: "matter-today" });
  for (const canonicalSection of canonicalRouteIds) {
    assert.deepEqual(globalUtilities.resolveGlobalShortcut("matters", canonicalSection), { view: "matters", section: canonicalSection });
  }
});

test("[TUW-05] each canonical screen has distinct loading, empty, error, and blocked fixtures", () => {
  assert.deepEqual(uiStates.states.map((screen) => screen.route_id), canonicalRouteIds);
  for (const screen of uiStates.states) {
    assert.equal(screen.state_cases.length, 4, `${screen.route_id} state count`);
    assert.deepEqual(screen.state_cases.map((stateCase) => stateCase.state), ["loading", "empty", "error", "blocked"]);
    assert.equal(new Set(screen.state_cases.map((stateCase) => stateCase.message)).size, 4, `${screen.route_id} messages distinct`);
    for (const stateCase of screen.state_cases) {
      assert.notEqual(stateCase.message.trim(), "");
      assert.notEqual(stateCase.action.trim(), "");
      assert.doesNotMatch(stateCase.message, /성공|완료되었습니다/);
      assert.doesNotMatch(stateCase.message, /<div|<span/);
    }
    const byState = new Map(screen.state_cases.map((stateCase) => [stateCase.state, stateCase]));
    assert.notEqual(byState.get("empty").message, byState.get("error").message);
    assert.notEqual(byState.get("empty").message, byState.get("blocked").message);
  }
});
