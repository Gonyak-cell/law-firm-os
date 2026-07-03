import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Leave request page renders API leave values and submits selected policy through /api/hrx/leave", async () => {
  const leave = await readWebFile("src/people/leave/LeaveRequestPage.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(leave, /submitHrxLeaveRequest/);
  assert.match(leave, /fetchHrxLeaveState/);
  assert.match(leave, /formatLeaveHours/);
  assert.match(leave, /request\.request_id/);
  assert.match(leave, /request\.policy_id/);
  assert.match(leave, /formatLeavePeriod/);
  assert.doesNotMatch(leave, /요청 \$\{index \+ 1\}/);
  assert.doesNotMatch(leave, /신청됨/);
  assert.match(api, /requestJson\("\/api\/hrx\/leave"/);
  assert.match(api, /withQuery\("\/api\/hrx\/leave"/);
  assert.match(api, /"x-lawos-tenant-id"/);
  assert.match(api, /"x-lawos-actor-id"/);
  assert.doesNotMatch(api, /HRX_PERMISSION_CONTEXT/);
  assert.doesNotMatch(api, /policy_id: "pto-us"/);
  assert.match(api, /policy_id: String\(form\.policy_id/);
  assert.match(api, /leave_type: String\(form\.leave_type/);
  assert.match(leave, /onSubmitted\?\.\(\)/);
  assert.doesNotMatch(leave, /mockData|profileRows|matters/);
});
