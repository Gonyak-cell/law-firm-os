import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MATTER_SMALL_FIRM_SECTIONS,
  matterRouteFilter,
  resolveMatterSmallFirmRoute,
  writeMatterRouteFilter
} from "../src/components/matter-small-firm/routes.js";

const stateSource = await readFile(new URL("../src/components/matter-small-firm/MatterOperationsState.jsx", import.meta.url), "utf8");
const surfaceSource = await readFile(new URL("../src/components/matter-small-firm/MatterOperationsSurface.jsx", import.meta.url), "utf8");
const mattersSource = await readFile(new URL("../src/components/MattersSurface.jsx", import.meta.url), "utf8");
const apiClientSource = await readFile(new URL("../src/data/apiClient.js", import.meta.url), "utf8");

test("[TUW-03] legacy Matter routes resolve into the six daily-purpose screens without a dead route", () => {
  assert.deepEqual(MATTER_SMALL_FIRM_SECTIONS, [
    "matter-today",
    "matter-list",
    "matter-work",
    "matter-calendar",
    "matter-followups",
    "matter-time-billing"
  ]);
  const expected = {
    "matter-home": ["matter-today", null],
    "matter-analytics": ["matter-today", "report"],
    "matters-list": ["matter-list", null],
    "matter-opening": ["matter-list", "opening"],
    "matter-closeout": ["matter-list", "closeout"],
    "matter-archive": ["matter-list", "archived"],
    "matter-board": ["matter-work", "board"],
    "matter-tasks": ["matter-work", "tasks"],
    "matter-worktree": ["matter-work", "worktree"],
    "matter-external-schedule": ["matter-calendar", null],
    "matter-meetings": ["matter-followups", "meetings"],
    "matter-client-requests": ["matter-followups", "client-requests"],
    "matter-timeline": ["matter-followups", "timeline"],
    "matter-channel": ["matter-followups", "channel"],
    "matter-notes": ["matter-followups", "notes"],
    "matter-time": ["matter-time-billing", "time"],
    "matter-expenses": ["matter-time-billing", "expenses"],
    "matter-billing": ["matter-time-billing", "billing"],
    "matter-ar": ["matter-time-billing", "ar"]
  };
  for (const [legacy, [section, mode]] of Object.entries(expected)) {
    assert.deepEqual(resolveMatterSmallFirmRoute(legacy), { section, mode, redirectedFrom: legacy });
  }
  assert.equal(resolveMatterSmallFirmRoute("unknown").section, "matter-today");
});

test("saved views write a reloadable URL filter without dropping the current route", () => {
  let nextUrl = "";
  const source = {
    location: { pathname: "/app", search: "?view=matters&section=matter-work", hash: "#matter-work" },
    history: {
      state: { view: "matters", section: "matter-work" },
      replaceState(_state, _title, url) {
        nextUrl = url;
      }
    }
  };
  writeMatterRouteFilter("overdue", source);
  assert.equal(nextUrl, "/app?view=matters&section=matter-work&filter=overdue#matter-work");
});

test("legacy closeout and archive tabs replace their fallback mode instead of becoming dead controls", () => {
  for (const [legacySection, initialMode] of [["matter-closeout", "closeout"], ["matter-archive", "archived"]]) {
    const source = {
      location: { pathname: "/app", search: "?view=matters", hash: `#${legacySection}` },
      history: {
        state: null,
        replaceState(_state, _title, url) {
          const parsed = new URL(url, "https://lawos.test");
          source.location.pathname = parsed.pathname;
          source.location.search = parsed.search;
          source.location.hash = parsed.hash;
        }
      }
    };
    assert.equal(resolveMatterSmallFirmRoute(legacySection, matterRouteFilter(source.location.search)).mode, initialMode);
    writeMatterRouteFilter("active", source);
    assert.equal(resolveMatterSmallFirmRoute(legacySection, matterRouteFilter(source.location.search)).mode, "active");
  }
  assert.match(mattersSource, /setMatterListView\(view\);\s*writeMatterRouteFilter\(view\);/);
});

test("[TUW-05] every operational screen uses explicit loading, empty, error, blocked, and denied states", () => {
  for (const state of ["loading", "empty", "error", "blocked", "denied"]) {
    assert.match(stateSource, new RegExp(`data-matter-ops-state="${state}"`));
  }
  assert.match(stateSource, /role="alert"/);
  assert.match(stateSource, /다시 시도/);
  assert.match(stateSource, /onClick=\{onRetry\}/);
  for (const section of MATTER_SMALL_FIRM_SECTIONS) {
    assert.match(surfaceSource, new RegExp(`data-matter-small-firm-screen="${section}"`));
  }
});

test("Today header declares one concrete description", () => {
  const todayScreen = surfaceSource.match(/data-matter-small-firm-screen="matter-today"[\s\S]*?<ScreenHeader([\s\S]*?)\/>/)?.[1] ?? "";
  assert.equal(todayScreen.match(/\bdescription=/g)?.length ?? 0, 1);
});

test("the six screens mount real API reads instead of a static or permanent-loading result", () => {
  for (const client of [
    "fetchMatterOpsToday",
    "fetchMatterOpsTasks",
    "fetchMatterOpsCalendar",
    "fetchMatterOpsFollowups",
    "fetchMatterOpsTimeBilling",
    "fetchMatterOpsDetail"
  ]) {
    assert.match(apiClientSource, new RegExp(`export async function ${client}`));
    assert.match(mattersSource, new RegExp(`${client}\\(`));
  }
  assert.match(mattersSource, /setMatterOpsResult\(next\)/);
  assert.match(mattersSource, /setMatterOpsDetailResult\(/);
  assert.match(mattersSource, /<MatterOperationsSurface/);
});
