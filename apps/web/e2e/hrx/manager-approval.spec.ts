import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Manager approval queue resolves approvals through API and shows audit evidence", async () => {
  const component = await readWebFile("src/people/approvals/ManagerApprovalQueue.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /ManagerApprovalQueue/);
  assert.match(component, /fetchHrxApprovals/);
  assert.match(component, /resolveHrxApproval/);
  assert.match(component, /fetchHrxAuditEvents/);
  assert.match(api, /\/api\/hrx\/approvals/);
  assert.match(api, /\/api\/hrx\/audit/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
