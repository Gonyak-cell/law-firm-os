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

function sections(navigation) {
  return navigation.people.items.flatMap((group) => group.children ?? []).map((item) => item.section);
}

test("LV-06 hides annual leave promotion from staff and shows it only with the granular scope", async () => {
  const server = await createServer({ configFile: false, root: webRoot, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  try {
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { canManageLeavePromotion } = await server.ssrLoadModule("/src/data/hrxAccess.js");
    assert.equal(canManageLeavePromotion([{ session: { hrx_scopes: ["hrx.leave.self.read"] } }]), false);
    assert.equal(canManageLeavePromotion([{ session: { hrx_scopes: ["hrx.leave.promotion.manage"] } }]), true);
    assert.equal(sections(buildContextualNavigation({})).includes("people-annual-leave-notices"), false);
    assert.equal(sections(buildContextualNavigation({ canManageLeavePromotion: true })).includes("people-annual-leave-notices"), true);
  } finally {
    await server.close();
  }
});

test("LV-06 mounts the API-backed campaign surface and keeps deadlines separate from evidence timestamps", async () => {
  const [peopleHome, catalog, promotion, client, risk, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/peopleFeatureCatalog.js"),
    source("src/people/leave/LeavePromotionPage.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/people/security/HrxRiskDashboard.tsx"),
    source("src/styles.css")
  ]);
  assert.match(catalog, /section: "people-annual-leave-notices"[\s\S]{0,180}state: "active"[\s\S]{0,120}requiredScope: "hrx\.leave\.promotion\.manage"/);
  assert.match(peopleHome, /currentSection === "people-annual-leave-notices" && canManageLeavePromotion[\s\S]{0,180}<LeavePromotionPage/);
  assert.match(peopleHome, /data-leave-promotion-access="denied"/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-annual-leave-notices"[\s\S]{0,160}<PeopleFeatureStatePanel/);
  assert.match(promotion, /fetchHrxLeavePromotionWorkspace/);
  assert.match(promotion, /previewHrxLeavePromotion/);
  assert.match(promotion, /recordHrxLeavePromotionEvidence/);
  assert.match(promotion, /전달 실패·미열람·미응답은 완료로 합치지 않습니다/);
  assert.match(promotion, /법률 검토 전에는 보상 면제 완료로 표시하지 않습니다/);
  assert.match(client, /\/api\/hrx\/leave\/promotion-campaigns\/preview/);
  assert.match(client, /\/api\/hrx\/leave\/promotion-recipients/);
  assert.match(risk, /people-annual-leave-notices/);
  assert.match(styles, /\.leave-promotion-timeline/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-promotion-summary,[\s\S]*grid-template-columns: 1fr/);
});
