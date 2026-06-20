import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("HRX audit viewer fetches tenant-scoped audit events through API only", async () => {
  const component = await readWebFile("src/admin/hrx/HRXAuditViewer.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /HRXAuditViewer/);
  assert.match(component, /fetchHrxAuditEvents/);
  assert.match(component, /HrxStepUpChallenge/);
  assert.match(component, /step_up_required/);
  assert.match(api, /\/api\/hrx\/audit/);
  assert.match(api, /body\?\.step_up_required === true/);
  assert.match(component, /Tenant-scoped audit events only after fresh step-up/);
  assert.doesNotMatch(component, /mockData|profileRows|matters/);
});
