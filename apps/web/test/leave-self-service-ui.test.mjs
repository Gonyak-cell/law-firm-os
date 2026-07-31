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

test("LV-03 separates signed self service from scoped manager approval navigation", async () => {
  const server = await createServer({
    configFile: false,
    root: webRoot,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { canApproveLeave } = await server.ssrLoadModule("/src/data/hrxAccess.js");
    const staff = [{ session: { hrx_scopes: ["hrx.leave.self.read", "hrx.leave.self.write"] } }];
    const manager = [{ session: { hrx_scopes: ["hrx.leave.team.read", "hrx.leave.approve"] } }];
    assert.equal(canApproveLeave(staff), false);
    assert.equal(canApproveLeave(manager), true);
    assert.equal(leaveSections(buildContextualNavigation({ canApproveLeave: false })).includes("people-leave-requests"), false);
    assert.equal(leaveSections(buildContextualNavigation({ canApproveLeave: true })).includes("people-leave-requests"), true);
  } finally {
    await server.close();
  }
});

test("LV-03 mounts self, team, approval, reschedule, and delegation surfaces without employee impersonation controls", async () => {
  const [peopleHome, selfPage, approvalQueue, client, catalog, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/leave/LeaveRequestPage.tsx"),
    source("src/people/leave/LeaveApprovalQueue.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/people/peopleFeatureCatalog.js"),
    source("src/styles.css"),
  ]);

  assert.match(peopleHome, /currentSection === "people-leave"[\s\S]{0,160}<LeaveRequestPage canViewTeam=\{canApproveLeave\}/);
  assert.doesNotMatch(peopleHome, /currentSection === "people-leave"[\s\S]{0,240}<EmployeeList/);
  assert.match(peopleHome, /currentSection === "people-leave-requests" && canApproveLeave[\s\S]{0,180}<LeaveApprovalQueue/);
  assert.match(peopleHome, /currentSection === "people-leave-requests" && !canApproveLeave[\s\S]{0,220}data-leave-approval-access="denied"/);
  assert.match(catalog, /section: "people-leave-requests"[\s\S]{0,180}state: "active"[\s\S]{0,180}requiredScope: "hrx\.leave\.approve"/);

  assert.match(client, /requestJson\("\/api\/hrx\/leave\/me"\)/);
  assert.match(client, /withQuery\("\/api\/hrx\/leave\/team"/);
  assert.match(client, /fetchHrxActiveLeaveOptions\(onDate = currentDateKey\(\)\)/);
  assert.match(client, /requestJson\("\/api\/hrx\/leave\/requests"\)/);
  assert.match(client, /requestJson\("\/api\/hrx\/leave\/delegations\/candidates"\)/);
  assert.match(selfPage, /차감 미리보기/);
  assert.match(selfPage, /allowedDurationModes/);
  assert.match(selfPage, /preview\.economics/);
  assert.match(selfPage, /유급 \{formatMinutes/);
  assert.match(selfPage, /무급 \{formatMinutes/);
  assert.doesNotMatch(selfPage, /반반일/);
  assert.match(selfPage, /시기변경 협의 중/);
  assert.doesNotMatch(selfPage, /유형과 사유는 공개하지 않습니다|향후 7일 팀 휴가가 없습니다|absence_label/);
  assert.doesNotMatch(selfPage, /employeeId/);
  assert.doesNotMatch(selfPage, /<button[^>]*>\s*승인\s*<\/button>|<button[^>]*>\s*반려\s*<\/button>/);

  assert.match(approvalQueue, /isAnnual/);
  assert.match(approvalQueue, /시기변경 협의/);
  assert.match(approvalQueue, /위임 관리/);
  assert.match(approvalQueue, /fetchHrxLeaveDelegationCandidates/);
  assert.doesNotMatch(approvalQueue, /처리할 휴가 요청이 없습니다|승인 위임 내역이 없습니다/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.leave-approval-facts/);
  assert.match(styles, /\.leave-delegation-form/);
});
