import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Employee profile is scoped and keeps compensation masked by default", async () => {
  const profile = await readWebFile("src/people/employees/EmployeeProfile.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(profile, /fetchHrxEmployeeProfile/);
  assert.match(api, /\/api\/hrx\/employees\/\$\{encodeURIComponent\(employeeId\)\}/);
  assert.match(profile, /masked_compensation_ref/);
  assert.match(profile, /Masked by scope/);
  assert.doesNotMatch(profile, /salary|base_pay|bonus_amount/);
});
