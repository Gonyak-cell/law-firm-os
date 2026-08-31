import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createApiServer } from "../src/server.js";
import {
  ACTOR,
  TENANT,
  createEmployeeFixture,
  createMatterFixture,
  financeSeed,
  invoke,
  permissionContext,
  requestBody,
  runtime,
} from "./helpers/outlook-time-entry-draft-fixture.js";
import { createTrustedOutlookInstallationTestAuthority } from "./helpers/outlook-trusted-installation-runtime.js";

test("Outlook draft uses the existing finance writer, replays after restart, and never approves WIP", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-outlook-time-entry-"));
  const filePath = join(directory, "finance.json");
  const matters = createMatterFixture();
  const employeeRepository = createEmployeeFixture();
  let finance = createFinanceRepository({ filePath, seedRecords: financeSeed(), preserveSeedRecords: true });
  t.after(() => {
    try { finance.close(); } catch {}
    matters.close();
  });
  const routeRuntime = () => runtime({ finance, matters, employeeRepository });

  const first = await invoke({ runtime: routeRuntime() });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.deepEqual(Object.keys(first.body.item).sort(), ["draft_ref", "status", "version"]);
  assert.equal(first.body.item.status, "draft");
  assert.equal(first.body.item.version, 1);

  const stored = finance.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: first.body.item.draft_ref,
  });
  assert.equal(stored.actor_id, ACTOR);
  assert.equal(stored.status, "draft");
  assert.equal(stored.approved_for_wip, false);
  assert.match(stored.source_ref, /^OutlookMatter:[a-f0-9]{64}$/u);
  for (const rawField of ["item_context_key", "internet_message_id", "conversation_id", "source_email_ref"]) {
    assert.equal(stored[rawField], undefined);
  }
  assert.equal(JSON.stringify(stored).includes("outlook-item-context-001"), false);
  assert.deepEqual(
    finance.listAudit({ tenant_id: TENANT, object_id: stored.time_entry_id }).map(({ action }) => action),
    ["time.entry.create"],
  );
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "WipItem" }).length, 0);

  const replay = await invoke({ runtime: routeRuntime() });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(replay.body.item, first.body.item);
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 1);

  finance.close();
  finance = createFinanceRepository({ filePath, seedRecords: financeSeed(), preserveSeedRecords: true });
  const restarted = await invoke({ runtime: routeRuntime() });
  assert.equal(restarted.status, 200);
  assert.deepEqual(restarted.body.item, first.body.item);
  assert.equal(finance.listAudit({ tenant_id: TENANT, object_id: stored.time_entry_id }).length, 1);
});

test("HTTP route rejects browser actor_id instead of accepting it as finance authority", async (t) => {
  const matters = createMatterFixture();
  const finance = createFinanceRepository({ seedRecords: financeSeed() });
  const context = permissionContext();
  const routeRuntime = runtime({ finance, matters });
  const installationAuthority = createTrustedOutlookInstallationTestAuthority([
    context.principal,
  ]);
  const server = createApiServer({
    matterRuntime: routeRuntime.matterRuntime,
    financeRuntime: routeRuntime.financeRuntime,
    outlookDesktopRuntime: installationAuthority.runtime,
    sessionAuth: installationAuthority.wrapSessionAuth({
      async resolvePermissionContextFromHeaders() {
        return { ok: true, principal: context.principal, context, token_payload: { surface: "outlook_addin" } };
      },
    }),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const started = { server, host: "127.0.0.1", port: server.address().port };
  t.after(async () => {
    await new Promise((resolve) => started.server.close(resolve));
    finance.close();
    matters.close();
  });
  const response = await fetch(`http://${started.host}:${started.port}/api/outlook/time-entry-drafts`, {
    method: "POST",
    headers: { authorization: "Bearer session", connection: "close", "content-type": "application/json" },
    body: JSON.stringify(requestBody({ actor_id: "browser-spoofed-actor" })),
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.deepEqual(body.safe_error_codes, ["OUTLOOK_TIME_ENTRY_DRAFT_INVALID"]);
  assert.equal(finance.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 0);
});
