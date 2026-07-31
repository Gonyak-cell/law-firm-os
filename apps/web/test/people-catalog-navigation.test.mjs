import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PEOPLE_FEATURE_ITEMS,
  getPeopleFeatureBySection,
  getPeopleNavigationGroups,
  resolvePeopleRoute
} from "../src/people/peopleFeatureCatalog.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../..");
const evidenceDir = path.join(repoRoot, "artifacts/people-v2/PEO-TUW-002");

const generalAccess = Object.freeze({});
const fullAccess = Object.freeze({
  canManageLeavePolicy: true,
  canApproveLeave: true,
  canExecuteLeaveAccrual: true,
  canAdjustLeaveLedger: true,
  canSettleLeaveTermination: true,
  canManageLeavePromotion: true
});

function flatten(groups) {
  return groups.flatMap((group) =>
    group.children.map((item) => ({
      group: group.label,
      label: item.label,
      route: item.section
    }))
  );
}

function readSnapshot(name) {
  return JSON.parse(readFileSync(path.join(evidenceDir, name), "utf8"));
}

test("PEO-TUW-002 freezes the 11 and 16 item People sidebar contracts", () => {
  const general = flatten(getPeopleNavigationGroups(generalAccess));
  const full = flatten(getPeopleNavigationGroups(fullAccess));

  assert.equal(general.length, 11);
  assert.equal(full.length, 16);
  assert.equal(new Set(general.map((item) => item.route)).size, general.length);
  assert.equal(new Set(full.map((item) => item.route)).size, full.length);
  assert.deepEqual(general, readSnapshot("sidebar-general.json").items);
  assert.deepEqual(full, readSnapshot("sidebar-all-permissions.json").items);
});

test("PEO-TUW-002 keeps hidden features disabled in both sidebar and direct routes", () => {
  const overview = getPeopleFeatureBySection("people-overview");
  assert.ok(overview);
  assert.equal(overview.sidebar_visibility, false);
  assert.equal(overview.route_enabled, true);
  assert.equal(overview.availability, "enabled");

  const enabledSidebarRoutes = new Set(flatten(getPeopleNavigationGroups(fullAccess)).map((item) => item.route));
  for (const feature of PEOPLE_FEATURE_ITEMS) {
    assert.ok(["existing", "extend", "new", "provider-gated"].includes(feature.implementation_state));
    assert.ok(["enabled", "disabled"].includes(feature.availability));
    assert.equal(typeof feature.sidebar_visibility, "boolean");
    assert.equal(typeof feature.route_enabled, "boolean");
    assert.equal(feature.requiredScope === null || typeof feature.requiredScope === "string", true);
    if (enabledSidebarRoutes.has(feature.section)) {
      assert.equal(feature.sidebar_visibility, true, `${feature.section}: sidebar must stay visible`);
      assert.equal(feature.route_enabled, true, `${feature.section}: route must stay enabled`);
      continue;
    }
    assert.equal(feature.sidebar_visibility, false, `${feature.section}: hidden item leaked into the sidebar`);
    assert.equal(feature.route_enabled, false, `${feature.section}: hidden direct route must be disabled`);
    assert.equal(
      resolvePeopleRoute("people", feature.section),
      "people-overview",
      `${feature.section}: hidden direct route must return to overview`
    );
  }

  for (const route of enabledSidebarRoutes) {
    assert.equal(resolvePeopleRoute("people", route), route);
  }
  assert.equal(resolvePeopleRoute("clients", "clients-home"), "clients-home");
  assert.equal(resolvePeopleRoute("people", "unknown-people-route"), "people-overview");
});
