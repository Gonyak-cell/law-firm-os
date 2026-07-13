import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function source(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("LV-07 mounts receipt-backed integration status in the existing usage screen", async () => {
  const [peopleHome, usage, requestPage, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/leave/LeaveUsagePage.tsx"),
    source("src/people/leave/LeaveRequestPage.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css"),
  ]);
  assert.match(peopleHome, /<LeaveUsagePage canExport=\{canExportLeaveReport\} canProcessIntegrations=\{canManageLeavePolicy\}/);
  assert.match(usage, /data-leave-integration-status="true"/);
  assert.match(usage, /일정·출퇴근·급여·알림의 전달 확인 상태/);
  assert.match(usage, /외부 공급자는 전달 확인값이 기록되기 전까지 완료로 표시하지 않으며/);
  assert.match(usage, /pending_sync/);
  assert.match(usage, /공급자 미설정/);
  assert.match(client, /requestJson\("\/api\/hrx\/leave\/integrations"\)/);
  assert.match(client, /requestJson\("\/api\/hrx\/leave\/integrations\/process"/);
  assert.match(requestPage, /cancelled_after_approval/);
  assert.match(requestPage, /승인 휴가 취소/);
  assert.match(styles, /\.leave-integration-status/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-integration-head,[\s\S]*flex-direction: column/);
});
