import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import {
  createVaultDmsRuntimeContext,
  handleVaultDmsApiRequest
} from "../src/vault-dms-runtime-context.js";

const tenantId = "tenant_amic_matter_vault";
const query = {
  tenant_id: tenantId,
  permission_ref: "ui_search_preferences",
  audit_hint_ref: "ui_search_preferences_probe"
};

function context(userId) {
  return {
    principal: { user_id: userId, tenant_id: tenantId, role_ids: ["lawos_user"] },
    rules: [{ id: "allow_search_preferences", effect: "allow", action: "*" }],
    object_acl: []
  };
}

test("Search preferences persist by tenant and owner without result payloads or raw-query audit", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-search-preferences-")), "dms.json");
  const runtime = createVaultDmsRuntimeContext({ repository: createDmsRepository({ filePath: storePath }) });
  await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "POST",
    query: {},
    body: {
      ...query,
      operation: "remember",
      query: "계약서",
      results: ["must-not-persist"]
    },
    context: context("user-a"),
    requestId: "request-remember",
    runtime
  });
  const written = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "POST",
    query: {},
    body: { ...query, operation: "save", query: "판결문", result_payload: { secret: true } },
    context: context("user-a"),
    requestId: "request-save",
    runtime
  });

  assert.equal(written.status, 200);
  assert.equal(written.body.item.owner_user_id, "user-a");
  assert.equal(written.body.item.recent[0].query, "계약서");
  assert.equal(written.body.item.recent[0].scope, "documents-ocr");
  assert.equal("results" in written.body.item.recent[0], false);
  assert.equal("result_payload" in written.body.item.saved[0], false);
  assert.equal(written.body.item.saved[0].current_version_only, true);
  assert.equal(written.body.item.saved[0].date_from, null);

  const shared = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "POST",
    query: {},
    body: { ...query, operation: "share_authorize", query: "판결문", current_version_only: true },
    context: context("user-a"),
    requestId: "request-share",
    runtime
  });
  assert.equal(shared.status, 200);

  const sameOwner = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "GET",
    query,
    body: {},
    context: context("user-a"),
    requestId: "request-read-a",
    runtime
  });
  const otherOwner = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "GET",
    query,
    body: {},
    context: context("user-b"),
    requestId: "request-read-b",
    runtime
  });

  assert.equal(sameOwner.body.item.saved[0].query, "판결문");
  assert.deepEqual(otherOwner.body.item.recent, []);
  assert.deepEqual(otherOwner.body.item.saved, []);

  const audit = runtime.repository.listAudit({ tenant_id: tenantId });
  const event = audit.find((item) => item.action === "search.preferences.save");
  const shareEvent = audit.find((item) => item.action === "search.preferences.share_authorize");
  assert.equal(event.actor_id, "user-a");
  assert.equal(event.metadata.raw_query_included, false);
  assert.equal(JSON.stringify(event).includes("계약서"), false);
  assert.equal(JSON.stringify(event).includes("판결문"), false);
  assert.equal(shareEvent.actor_id, "user-a");
  assert.equal(shareEvent.metadata.raw_query_included, false);

  const invalid = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "POST",
    query: {},
    body: { ...query, operation: "save", saved: [{ query: "forged snapshot" }] },
    context: context("user-a"),
    requestId: "request-invalid",
    runtime
  });
  assert.equal(invalid.status, 400);

  const stored = runtime.repository.list({ tenant_id: tenantId, model_type: "VaultSearchPreferences" })[0];
  runtime.repository.upsert({
    ...stored,
    recent: [...stored.recent, { id: "expired", query: "expired query", scope: "documents-ocr", searched_at: "2020-01-01T00:00:00.000Z" }]
  });
  await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "GET",
    query,
    body: {},
    context: context("user-a"),
    requestId: "request-retention",
    runtime
  });
  const pruned = runtime.repository.list({ tenant_id: tenantId, model_type: "VaultSearchPreferences" })[0];
  assert.equal(pruned.recent.some((item) => item.query === "expired query"), false);

  runtime.repository.close();
  const reopened = createVaultDmsRuntimeContext({ repository: createDmsRepository({ filePath: storePath }) });
  const durable = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search/preferences",
    method: "GET",
    query,
    body: {},
    context: context("user-a"),
    requestId: "request-read-durable",
    runtime: reopened
  });
  assert.equal(durable.body.item.saved[0].query, "판결문");
});

test("Vault search applies URL filter contract after permission trimming", async () => {
  const runtime = createVaultDmsRuntimeContext();
  const response = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search",
    method: "GET",
    query: { ...query, q: "Synthetic", current_version: "current", date_from: "2099-01-01" },
    body: {},
    context: context("user-a"),
    requestId: "request-filtered-search",
    runtime
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 0);
  assert.equal(response.body.page_info.current_version_only, true);
  assert.equal(response.body.page_info.date_from, "2099-01-01");
  assert.equal(response.body.page_info.ocr_index_mode, "caller_supplied_sidecar");
  assert.equal(response.body.page_info.ocr_runtime_executed, false);
  const unsupportedAllVersions = await handleVaultDmsApiRequest({
    pathname: "/api/vault/search",
    method: "GET",
    query: { ...query, q: "Synthetic", current_version: "all" },
    body: {},
    context: context("user-a"),
    requestId: "request-all-versions",
    runtime
  });
  assert.equal(unsupportedAllVersions.status, 400);
  runtime.repository.close();
});
