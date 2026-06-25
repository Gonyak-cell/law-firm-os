import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("HRX step-up challenge is rendered from server-required state without local token fabrication", async () => {
  const challenge = await readWebFile("src/people/security/HrxStepUpChallenge.tsx");
  const auditViewer = await readWebFile("src/admin/hrx/HRXAuditViewer.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const runner = await readFile(resolve(root, "../../scripts/run-web-e2e.mjs"), "utf8");

  assert.match(auditViewer, /HrxStepUpChallenge/);
  assert.match(auditViewer, /result\.kind === "step_up_required"/);
  assert.match(api, /body\?\.step_up_required === true/);
  assert.match(challenge, /data-hrx-step-up-challenge="true"/);
  assert.match(challenge, /권한 확인/);
  assert.match(challenge, /인사기록/);
  assert.doesNotMatch(challenge, /활동 기록/);
  assert.match(runner, /hrx-step-up-challenge/);
  assert.doesNotMatch(challenge, /x-lawos-hrx-step-up|assurance_level|mfa: true|tenant-a|actor_id/);
  assert.match(api, /"x-lawos-tenant-id"/);
  assert.match(api, /"x-lawos-actor-id"/);
  assert.match(api, /"x-lawos-hrx-scopes"/);
  assert.doesNotMatch(api, /HRX_PERMISSION_CONTEXT/);
});
