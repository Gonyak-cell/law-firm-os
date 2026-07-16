import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path: string) {
  return readFile(resolve(root, path), "utf8");
}

test("Leave request page renders signed self-service values and submits selected policy through /api/hrx/leave/me", async () => {
  const leave = await readWebFile("src/people/leave/LeaveRequestPage.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(leave, /submitHrxLeaveSelfRequest/);
  assert.match(leave, /fetchHrxLeaveSelfState/);
  assert.match(leave, /formatMinutes/);
  assert.match(leave, /text\(request, "request_id"\)/);
  assert.match(leave, /policy_version_id: form\.policy_version_id/);
  assert.match(leave, /period\(request\)/);
  assert.doesNotMatch(leave, /요청 \$\{index \+ 1\}/);
  assert.doesNotMatch(leave, /신청됨/);
  assert.match(api, /requestJson\("\/api\/hrx\/leave\/me\/requests"/);
  assert.match(api, /requestJson\("\/api\/hrx\/leave\/me"\)/);
  assert.match(api, /"x-lawos-tenant-id"/);
  assert.match(api, /"x-lawos-actor-id"/);
  assert.doesNotMatch(api, /HRX_PERMISSION_CONTEXT/);
  assert.doesNotMatch(api, /policy_id: "pto-us"/);
  assert.match(leave, /leave_type_id: form\.leave_type_id/);
  assert.match(leave, /await load\(\)/);
  assert.doesNotMatch(leave, /mockData|profileRows|matters/);
});
