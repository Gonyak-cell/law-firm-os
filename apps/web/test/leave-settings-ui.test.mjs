import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function source(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

function leaveSections(navigation) {
  return navigation.people.items.flatMap((group) => group.children ?? []).map((item) => item.section);
}

test("LV-02 exposes leave policy settings only to signed principals with policy read scope", async () => {
  const server = await createServer({
    configFile: false,
    root: webRoot,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { canManageLeavePolicy, listCurrentHrxScopes } = await server.ssrLoadModule("/src/data/hrxAccess.js");
    const staffRecords = [{ session: { hrx_scopes: ["hrx.leave.self.read", "hrx.leave.self.write"] } }];
    const hrRecords = [{ principal: true, scopes: ["hrx.leave.policy.read", "hrx.leave.policy.write"] }];

    assert.equal(canManageLeavePolicy(staffRecords), false);
    assert.equal(canManageLeavePolicy(hrRecords), true);
    assert.deepEqual(listCurrentHrxScopes(hrRecords), ["hrx.leave.policy.read", "hrx.leave.policy.write"]);
    assert.equal(leaveSections(buildContextualNavigation({ canManageLeavePolicy: false })).includes("people-leave-types"), false);
    assert.equal(leaveSections(buildContextualNavigation({ canManageLeavePolicy: true })).includes("people-leave-types"), true);
  } finally {
    await server.close();
  }
});

test("LV-02 mounts an API-backed Forest settings screen and denies direct non-HR routes", async () => {
  const [peopleHome, settings, client, catalog, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/leave/LeaveTypeSettingsPage.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/people/peopleFeatureCatalog.js"),
    source("src/styles.css"),
  ]);

  assert.match(catalog, /section: "people-leave-types"[\s\S]{0,180}state: "active"[\s\S]{0,180}requiredScope: "hrx\.leave\.policy\.read"/);
  assert.match(peopleHome, /currentSection === "people-leave-types" && canManageLeavePolicy[\s\S]{0,180}<LeaveTypeSettingsPage/);
  assert.match(peopleHome, /currentSection === "people-leave-types" && !canManageLeavePolicy[\s\S]{0,220}data-leave-policy-access="denied"/);
  assert.match(settings, /fetchHrxLeaveConfiguration/);
  assert.match(settings, /createHrxLeaveGroup/);
  assert.match(settings, /createHrxLeaveType/);
  assert.match(settings, /createHrxLeavePolicy/);
  assert.match(settings, /publishHrxLeavePolicy/);
  assert.match(settings, /createNextHrxLeavePolicyVersion/);
  assert.match(settings, /규칙 정책/);
  assert.match(settings, /규칙 편집/);
  assert.match(settings, /usage_modes/);
  assert.match(settings, /paid_ratio_bps/);
  assert.match(settings, /deduction_ratio_bps/);
  assert.match(settings, /rounding_mode/);
  assert.match(client, /export async function updateHrxLeavePolicy/);
  assert.match(client, /method: "PATCH"/);
  assert.match(settings, /role="tablist"/);
  assert.match(styles, /\.leave-settings-tabs/);
  assert.match(styles, /\.leave-type-rule-table table/);
  assert.match(styles, /\.leave-type-rule-edit-row form/);
  assert.match(styles, /@media \(max-width: 980px\)[\s\S]*\.leave-settings-form,[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-types"[\s\S]{0,160}<PeopleFeatureStatePanel/);
});
