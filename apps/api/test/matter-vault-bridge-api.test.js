import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_vault_bridge";
const TOKEN = "test-vault-bridge-token";

async function withServer(callback) {
  const previousToken = process.env.LAWOS_VAULT_BRIDGE_TOKEN;
  const base = mkdtempSync(join(tmpdir(), "lawos-vault-bridge-api-"));
  const started = await startApiServer({
    port: 0,
    matterStorePath: join(base, "matter-store.json"),
  });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    if (previousToken === undefined) delete process.env.LAWOS_VAULT_BRIDGE_TOKEN;
    else process.env.LAWOS_VAULT_BRIDGE_TOKEN = previousToken;
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function authHeaders(token = TOKEN) {
  return { authorization: `Bearer ${token}` };
}

function clientRequest(overrides = {}) {
  return {
    tenantRef: TENANT,
    idempotencyKeyHash: "hash-client-alpha",
    clientDisplayName: "Alpha Client",
    clientShortName: "Alpha",
    approvalRef: "approval-ref-alpha",
    migrationApprovalRef: "approval-ref-alpha",
    supportingEvidenceRefs: ["evidence-ref-alpha"],
    migrationOperatorRef: "vault-operator-ref",
    ...overrides,
  };
}

function matterRequest(client, overrides = {}) {
  return {
    tenantRef: TENANT,
    idempotencyKeyHash: "hash-matter-alpha",
    clientId: client.clientId,
    clientDisplayName: client.clientDisplayName,
    clientShortName: client.clientShortName,
    matterCode: "Alpha/Civil/계약분쟁",
    matterName: "Alpha/Civil/계약분쟁",
    matterTypeEnglish: "Civil",
    matterDetailTypeKorean: "계약분쟁",
    approvalRef: "approval-ref-alpha",
    migrationApprovalRef: "approval-ref-alpha",
    supportingEvidenceRefs: ["evidence-ref-alpha"],
    migrationOperatorRef: "vault-operator-ref",
    status: "opening",
    ...overrides,
  };
}

test("Vault bridge endpoints fail closed unless the bridge token is configured", async () => {
  delete process.env.LAWOS_VAULT_BRIDGE_TOKEN;
  await withServer(async (baseUrl) => {
    const status = await json(baseUrl, "/api/matters/vault-bridge/status");
    assert.equal(status.status, 503);
    assert.deepEqual(status.body.safe_error_codes, ["MATTER_VAULT_BRIDGE_REQUIRED"]);
  });
});

test("Vault bridge upserts Matter app client and matter with idempotent replay", async () => {
  process.env.LAWOS_VAULT_BRIDGE_TOKEN = TOKEN;
  await withServer(async (baseUrl) => {
    const status = await json(baseUrl, "/api/matters/vault-bridge/status", {
      headers: authHeaders(),
    });
    assert.equal(status.status, 200);
    assert.equal(status.body.item.source_mode, "matter_app_api");
    assert.equal(status.body.item.runtime_write_ready, true);

    const client = await json(baseUrl, "/api/matters/vault-bridge/clients/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(clientRequest()),
    });
    assert.equal(client.status, 201);
    assert.equal(client.body.clientShortName, "Alpha");
    assert.equal(client.body.sourceRevision, "approval-ref-alpha");
    assert.equal(client.body.production_ready_claim, false);

    const matter = await json(baseUrl, "/api/matters/vault-bridge/matters/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(matterRequest(client.body)),
    });
    assert.equal(matter.status, 201);
    assert.equal(matter.body.matterCode, "Alpha/Civil/계약분쟁");
    assert.equal(matter.body.clientId, client.body.clientId);
    assert.equal(matter.body.sourceRevision, "approval-ref-alpha");

    const replay = await json(baseUrl, "/api/matters/vault-bridge/matters/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(matterRequest(client.body)),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.action, "skipped_idempotent");
    assert.equal(replay.body.idempotent_replay, true);
  });
});

test("Vault bridge rejects invalid bearer tokens", async () => {
  process.env.LAWOS_VAULT_BRIDGE_TOKEN = TOKEN;
  await withServer(async (baseUrl) => {
    const response = await json(baseUrl, "/api/matters/vault-bridge/status", {
      headers: authHeaders("wrong-token"),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(response.body.safe_error_codes, ["MATTER_VAULT_BRIDGE_BLOCKED"]);
  });
});
