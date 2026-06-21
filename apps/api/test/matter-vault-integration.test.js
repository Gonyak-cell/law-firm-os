import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_matter_vault";
const MATTER_ID = "matter_mv_open_001";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_mv&audit_hint_ref=audit_hint_mv`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_mv_owner", tenant_id: TENANT, role_ids: ["matter_vault_user"] },
    rules: [{ id: `rule_matter_vault_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback) {
  const base = mkdtempSync(join(tmpdir(), "lawos-matter-vault-api-"));
  const started = await startApiServer({
    port: 0,
    matterStorePath: join(base, "matter-store.json"),
    dmsStorePath: join(base, "dms-store.json"),
  });
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

function openingPayload() {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_mv_write",
    audit_hint_ref: "audit_hint_mv_open",
    actor_id: "user_mv_owner",
    idempotency_key: "mv-open-001",
    matter_number_seed: "Matter Vault Open",
    matter: {
      matter_id: MATTER_ID,
      tenant_id: TENANT,
      legal_client_party_id: "party_mv_client",
      billing_client_party_id: "party_mv_client",
      title: "Matter Vault integrated matter",
      status: "opening",
      matter_number: "M-MV-0001",
      created_by: "user_mv_owner",
      created_at: "2026-06-20T00:00:00.000Z",
      permission_envelope_id: "perm_mv_envelope",
      audit_trace_id: "audit_mv_open",
    },
    clearance_token: {
      clearance_token_id: "clearance_mv_001",
      tenant_id: TENANT,
      intake_request_id: "intake_mv_001",
      conflict_check_id: "conflict_mv_001",
      engagement_id: "engagement_mv_001",
      snapshot_hash: "sha256:clearance-mv-001",
      token_state: "valid",
      outcome: "passed",
    },
  };
}

test("Matter-Vault opening creates a Vault workspace, link, summary, document facade, and timeline safely", async () => {
  await withServer(async (baseUrl) => {
    const opened = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(openingPayload()),
    });
    assert.equal(opened.status, 201);
    assert.equal(opened.body.item.matter_id, MATTER_ID);
    assert.equal(opened.body.matter_vault_link.matter_id, MATTER_ID);
    assert.equal(opened.body.matter_vault_link.raw_storage_path_included, false);
    assert.equal(opened.body.dms_workspace.workspace_id, `workspace:${MATTER_ID}`);
    assert.equal(opened.body.link_audit_event.action, "matter.vault_link.created");

    const summaryBefore = await json(baseUrl, `/api/matters/${MATTER_ID}/vault-summary?${BASE_QUERY}`);
    assert.equal(summaryBefore.status, 200);
    assert.equal(summaryBefore.body.item.document_count, 0);
    assert.equal(summaryBefore.body.item.omitted_denied_count, null);

    const uploaded = await json(baseUrl, `/api/matters/${MATTER_ID}/documents`, {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_mv_doc",
        audit_hint_ref: "audit_hint_mv_doc",
        actor_id: "user_mv_owner",
        idempotency_key: "mv-doc-001",
        content_text: "Matter facade delegates bytes to Vault.",
        document: {
          document_id: "doc_mv_001",
          title: "Matter Vault evidence memo",
          status: "active",
          current_version_id: "version_doc_mv_001_1",
          mime_type: "text/plain",
        },
      }),
    });
    assert.equal(uploaded.status, 201);
    assert.equal(uploaded.body.item.matter_owns_document_bytes, false);
    assert.equal(uploaded.body.item.raw_storage_path_included, false);
    assert.equal(uploaded.body.file_object.storage_pointer_ref_included, false);
    assert.equal(uploaded.body.timeline_event.type, "document.version.created");

    const summaryAfter = await json(baseUrl, `/api/matters/${MATTER_ID}/command-center?${BASE_QUERY}`);
    assert.equal(summaryAfter.status, 200);
    assert.equal(summaryAfter.body.vault_summary.document_count, 1);
    assert.equal(summaryAfter.body.matter_vault_link.document_bytes_included, false);

    const timeline = await json(baseUrl, `/api/matters/${MATTER_ID}/timeline?${BASE_QUERY}`);
    assert.equal(timeline.status, 200);
    assert.equal(timeline.body.item.visible_entries.length, 1);
    assert.equal(timeline.body.item.count_leak_prevented, true);

    const denied = await json(baseUrl, `/api/matters/${MATTER_ID}/vault-summary?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});
