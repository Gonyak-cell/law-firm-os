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

test("LV-04 exposes automatic and manual accrual navigation only to matching HR scopes", async () => {
  const server = await createServer({ configFile: false, root: webRoot, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  try {
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { canAdjustLeaveLedger, canExecuteLeaveAccrual } = await server.ssrLoadModule("/src/data/hrxAccess.js");
    const staff = [{ session: { hrx_scopes: ["hrx.leave.self.read"] } }];
    const hr = [{ session: { hrx_scopes: ["hrx.leave.accrual.execute", "hrx.leave.ledger.adjust"] } }];
    assert.equal(canExecuteLeaveAccrual(staff), false);
    assert.equal(canAdjustLeaveLedger(staff), false);
    assert.equal(canExecuteLeaveAccrual(hr), true);
    assert.equal(canAdjustLeaveLedger(hr), true);
    assert.equal(leaveSections(buildContextualNavigation({})).includes("people-leave-accrual-auto"), false);
    const sections = leaveSections(buildContextualNavigation({ canExecuteLeaveAccrual: true, canAdjustLeaveLedger: true }));
    assert.ok(sections.includes("people-leave-accrual-auto"));
    assert.ok(sections.includes("people-leave-accrual-manual"));
  } finally {
    await server.close();
  }
});

test("LV-04 mounts API-backed Forest accrual screens without generic placeholders", async () => {
  const [peopleHome, catalog, automatic, manual, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/peopleFeatureCatalog.js"),
    source("src/people/leave/LeaveAccrualAutoPage.tsx"),
    source("src/people/leave/LeaveAccrualManualPage.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css")
  ]);
  assert.match(catalog, /section: "people-leave-accrual-auto"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.accrual\.execute"/);
  assert.match(catalog, /section: "people-leave-accrual-manual"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.ledger\.adjust"/);
  assert.match(peopleHome, /currentSection === "people-leave-accrual-auto" && canExecuteLeaveAccrual[\s\S]{0,180}<LeaveAccrualAutoPage/);
  assert.match(peopleHome, /currentSection === "people-leave-accrual-manual" && canAdjustLeaveLedger[\s\S]{0,180}<LeaveAccrualManualPage/);
  assert.match(peopleHome, /data-leave-accrual-access="denied"/);
  assert.match(peopleHome, /data-leave-ledger-access="denied"/);
  assert.match(automatic, /previewHrxLeaveAccrual/);
  assert.match(automatic, /executeHrxLeaveAccrual/);
  assert.match(automatic, /snapshot_hash/);
  assert.match(manual, /previewHrxLeaveManualAdjustment/);
  assert.match(manual, /executeHrxLeaveManualAdjustment/);
  assert.match(manual, /approved_by_actor_id/);
  assert.match(manual, /accept="\.csv,text\/csv"/);
  assert.match(client, /requestHrxStepUpSession/);
  assert.match(styles, /\.leave-accrual-runbar/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-accrual-form,[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-accrual-auto"[\s\S]{0,160}<PeopleFeatureStatePanel/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave-accrual-manual"[\s\S]{0,160}<PeopleFeatureStatePanel/);
});
