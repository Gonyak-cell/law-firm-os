import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp07_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_rp07_read&audit_hint_ref=audit_hint_rp07_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_rp07_dms", tenant_id: TENANT, role_ids: ["dms_reader"] },
    rules: [{ id: `rule_vault_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function uploadPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp07_write",
    audit_hint_ref: "audit_hint_rp07_write",
    actor_id: "user_rp07_dms",
    idempotency_key: "vault-api-upload-001",
    content_text: "Vault API upload",
    document: {
      document_id: "doc_api_upload_001",
      tenant_id: TENANT,
      matter_id: "matter_rp05_synthetic_opening",
      workspace_id: "workspace_rp07_synthetic",
      title: "API uploaded vault document",
      status: "active",
      current_version_id: "version_doc_api_upload_001_1",
      permission_envelope_id: "perm_rp07_vault",
      audit_trace_id: "audit_rp07_vault",
      mime_type: "text/plain",
    },
    ...overrides,
  };
}

test("G5 Vault API health descriptor exposes vault-dms runtime without production-ready claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const vault = body.bounded_contexts.find((context) => context.bounded_context === "vault-dms");
    assert.equal(status, 200);
    assert.equal(vault.runtime_write_ready, true);
    assert.equal(vault.r5_r6_owner_decision_ready, true);
    assert.equal(vault.production_ready_claim, false);
  });
});

test("G5 Vault document list is permission gated and never leaks raw storage fields", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`);
    assert.equal(status, 200);
    assert.equal(body.outcome, "passed");
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].storage_pointer_ref_included, false);
    assert.equal(body.items[0].document_bytes_included, false);
    assert.equal(body.page_info.omitted_document_count, null);

    const denied = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.items.length, 0);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G5 Vault upload persists metadata, replays idempotently, and survives restart", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-vault-api-g5-")), "dms-store.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload()),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.document_id, "doc_api_upload_001");
    assert.equal(created.body.file_object.storage_pointer_ref_included, false);
    assert.equal(created.body.audit_event.action, "dms.document.upload");

    const replay = await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
  }, { dmsStorePath: storePath });

  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`);
    assert.ok(list.body.items.some((item) => item.document_id === "doc_api_upload_001"));
  }, { dmsStorePath: storePath });
});

test("G5 Vault search and audit stay safe-source and tenant scoped", async () => {
  await withServer(async (baseUrl) => {
    await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload({ idempotency_key: "vault-api-upload-search" })),
    });
    const search = await json(baseUrl, `/api/vault/search?${BASE_QUERY}`);
    assert.equal(search.status, 200);
    assert.equal(search.body.items[0].raw_text_included, false);
    assert.equal(search.body.production_ready_claim, false);

    const audit = await json(baseUrl, `/api/vault/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "dms.document.upload"));
  });
});
