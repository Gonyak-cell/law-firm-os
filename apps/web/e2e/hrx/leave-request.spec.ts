import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Leave request page submits PTO through /api/hrx/leave and refreshes state", async () => {
  const leave = await readWebFile("src/people/leave/LeaveRequestPage.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(leave, /submitHrxLeaveRequest/);
  assert.match(leave, /fetchHrxLeaveState/);
  assert.match(api, /requestJson\(`\/api\/hrx\/leave\?\$\{query\(\)\}`/);
  assert.match(api, /policy_id: "pto-us"/);
  assert.match(leave, /onSubmitted\?\.\(\)/);
  assert.doesNotMatch(leave, /mockData|profileRows|matters/);
});
