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

function permissionContextHeaders(tenant = TENANT) {
  return {
    "x-lawos-permission-context": JSON.stringify({
      principal: {
        user_id: "vault-lookup-tester",
        tenant_id: tenant,
        role_ids: ["matter_runtime_user"],
      },
      rules: [{ id: "allow-matter-lookup", effect: "allow", action: "*" }],
      object_acl: [],
    }),
  };
}

function lookupPath(query = "Alpha") {
  const params = new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: "ui_cmp_g5_vault_lookup",
    audit_hint_ref: "ui_cmp_g5_vault_lookup_probe",
    q: query,
  });
  return `/api/matters/vault-bridge/matter-lookup?${params.toString()}`;
}

function preflightRequest(matterId = "matter_alpha", overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "ui_cmp_g5_vault_upload_preflight",
    audit_hint_ref: "ui_cmp_g5_vault_upload_preflight_probe",
    action: "upload_preflight",
    selected_matter_ref: `matter:${matterId}`,
    matter_id: matterId,
    matter_code: "Alpha/LIT/계약분쟁",
    source_mode: "matter_app_api",
    runtime_write_ready: true,
    repository_durable: true,
    production_ready_claim: false,
    permission_check_only: true,
    idempotency_key_hash: "hash-upload-preflight-alpha",
    ...overrides,
  };
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
    matterCode: "Alpha/LIT/계약분쟁",
    matterName: "Alpha/LIT/계약분쟁",
    matterTypeEnglish: "LIT",
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

test("Vault bridge rejects missing bearer auth and invalid canonical upsert payloads", async () => {
  process.env.LAWOS_VAULT_BRIDGE_TOKEN = TOKEN;
  await withServer(async (baseUrl) => {
    const status = await json(baseUrl, "/api/matters/vault-bridge/status");
    assert.equal(status.status, 403);
    assert.deepEqual(status.body.safe_error_codes, ["MATTER_VAULT_BRIDGE_BLOCKED"]);
    assert.equal(status.body.production_ready_claim, false);

    const invalidClient = await json(baseUrl, "/api/matters/vault-bridge/clients/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(clientRequest({ migrationApprovalRef: "", sourceRevision: "" })),
    });
    assert.equal(invalidClient.status, 400);
    assert.deepEqual(invalidClient.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);

    const client = await json(baseUrl, "/api/matters/vault-bridge/clients/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(clientRequest()),
    });
    assert.equal(client.status, 201);

    const invalidMatter = await json(baseUrl, "/api/matters/vault-bridge/matters/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(matterRequest(client.body, { matterCode: "Alpha/LIT/불일치" })),
    });
    assert.equal(invalidMatter.status, 400);
    assert.deepEqual(invalidMatter.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);
    assert.equal(invalidMatter.body.count_leak_prevented, true);
    assert.equal(invalidMatter.body.production_ready_claim, false);
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
    assert.equal(matter.body.matterCode, "Alpha/LIT/계약분쟁");
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

test("Vault bridge matter lookup is permission-scoped and rejects UUID-shaped normal input", async () => {
  process.env.LAWOS_VAULT_BRIDGE_TOKEN = TOKEN;
  await withServer(async (baseUrl) => {
    const missingBearer = await json(baseUrl, lookupPath(), {
      headers: permissionContextHeaders(),
    });
    assert.equal(missingBearer.status, 403);
    assert.deepEqual(missingBearer.body.safe_error_codes, ["MATTER_VAULT_BRIDGE_BLOCKED"]);
    assert.deepEqual(missingBearer.body.items, []);
    assert.equal(missingBearer.body.count_leak_prevented, true);

    const uuidInput = await json(baseUrl, lookupPath("9f13f7c6-3a9d-4d6d-9412-88db09548c11"), {
      headers: { ...authHeaders(), ...permissionContextHeaders() },
    });
    assert.equal(uuidInput.status, 400);
    assert.deepEqual(uuidInput.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);
    assert.deepEqual(uuidInput.body.items, []);
    assert.equal(uuidInput.body.production_ready_claim, false);

    const client = await json(baseUrl, "/api/matters/vault-bridge/clients/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(clientRequest()),
    });
    assert.equal(client.status, 201);
    const matter = await json(baseUrl, "/api/matters/vault-bridge/matters/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(matterRequest(client.body)),
    });
    assert.equal(matter.status, 201);

    const lookup = await json(baseUrl, lookupPath("Alpha/LIT"), {
      headers: { ...authHeaders(), ...permissionContextHeaders() },
    });
    assert.equal(lookup.status, 200);
    assert.equal(lookup.body.outcome, "passed");
    assert.equal(lookup.body.items.length, 1);
    assert.equal(lookup.body.items[0].matter_code, "Alpha/LIT/계약분쟁");
    assert.equal(lookup.body.items[0].client_display_name, "Alpha Client");
    assert.equal(lookup.body.items[0].selected_ref, `matter:${matter.body.matterAppMatterId}`);
    assert.equal("document_bytes" in lookup.body.items[0], false);
    assert.equal("storage_pointer" in lookup.body.items[0], false);
    assert.equal(lookup.body.count_leak_prevented, true);
    assert.equal(lookup.body.production_ready_claim, false);
  });
});

test("Vault bridge upload preflight is guarded and returns reference-only permission check refs", async () => {
  process.env.LAWOS_VAULT_BRIDGE_TOKEN = TOKEN;
  await withServer(async (baseUrl) => {
    const missingBearer = await json(baseUrl, "/api/matters/vault-bridge/upload-preflight", {
      method: "POST",
      headers: permissionContextHeaders(),
      body: JSON.stringify(preflightRequest()),
    });
    assert.equal(missingBearer.status, 403);
    assert.deepEqual(missingBearer.body.safe_error_codes, ["MATTER_VAULT_BRIDGE_BLOCKED"]);
    assert.equal(missingBearer.body.item, null);
    assert.equal(missingBearer.body.vault_document_write_enabled, false);

    const projectionOnly = await json(baseUrl, "/api/matters/vault-bridge/upload-preflight", {
      method: "POST",
      headers: { ...authHeaders(), ...permissionContextHeaders() },
      body: JSON.stringify(preflightRequest("matter_projection_only", {
        source_mode: "vault_projection_only",
        runtime_write_ready: false,
      })),
    });
    assert.equal(projectionOnly.status, 409);
    assert.deepEqual(projectionOnly.body.safe_error_codes, ["MATTER_VAULT_UPLOAD_PREFLIGHT_SOURCE_BLOCKED"]);
    assert.equal(projectionOnly.body.ui_state, "source_blocked");
    assert.equal(projectionOnly.body.vault_document_write_enabled, false);

    const client = await json(baseUrl, "/api/matters/vault-bridge/clients/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(clientRequest()),
    });
    assert.equal(client.status, 201);
    const matter = await json(baseUrl, "/api/matters/vault-bridge/matters/upsert", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(matterRequest(client.body)),
    });
    assert.equal(matter.status, 201);

    const preflight = await json(baseUrl, "/api/matters/vault-bridge/upload-preflight", {
      method: "POST",
      headers: { ...authHeaders(), ...permissionContextHeaders() },
      body: JSON.stringify(preflightRequest(matter.body.matterAppMatterId)),
    });
    assert.equal(preflight.status, 200);
    assert.equal(preflight.body.outcome, "preflight_passed");
    assert.match(preflight.body.item.preflight_ref, new RegExp(`^vault-preflight:${matter.body.matterAppMatterId}:`));
    assert.equal(preflight.body.item.selected_matter_ref, `matter:${matter.body.matterAppMatterId}`);
    assert.equal(preflight.body.item.allowed_next_step, "permission_check_only");
    assert.equal(preflight.body.item.permission_checked, true);
    assert.equal(preflight.body.item.ethical_wall_clear, true);
    assert.equal(preflight.body.item.lifecycle_eligible, true);
    assert.equal(preflight.body.item.vault_document_write_enabled, false);
    assert.equal(preflight.body.vault_document_write_enabled, false);
    assert.equal(preflight.body.state_idempotent, true);
    assert.equal(preflight.body.count_leak_prevented, true);
    assert.equal(preflight.body.production_ready_claim, false);
    assert.equal("document_bytes" in preflight.body.item, false);
    assert.equal("storage_pointer" in preflight.body.item, false);
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
