import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Employee list fetches /api/hrx/employees without a static fallback", async () => {
  const list = await readWebFile("src/people/employees/EmployeeList.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(list, /fetchHrxEmployees/);
  assert.match(api, /requestJson\("\/api\/hrx\/employees"\)/);
  assert.match(api, /"x-lawos-tenant-id"/);
  assert.match(api, /"x-lawos-actor-id"/);
  assert.doesNotMatch(api, /HRX_PERMISSION_CONTEXT/);
  assert.match(list, /구성원 정보를 불러오지 못했습니다/);
  assert.match(list, /권한이 있는 구성원 정보만 표시됩니다/);
  assert.doesNotMatch(list, /mockData|profileRows|matters/);
});
