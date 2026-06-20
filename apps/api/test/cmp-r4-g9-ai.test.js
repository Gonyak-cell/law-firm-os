import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g9_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g9_read&audit_hint_ref=audit_hint_cmp_g9_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g9_ai", tenant_id: TENANT, role_ids: ["ai_reviewer"] },
    rules: [{ id: `rule_ai_${effect}`, effect, action: "*" }],
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

test("G9 AI API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const ai = body.bounded_contexts.find((item) => item.bounded_context === "ai-governance");
    assert.equal(status, 200);
    assert.equal(ai.runtime_write_ready, true);
    assert.equal(ai.r5_r6_owner_decision_ready, true);
    assert.equal(ai.production_ready_claim, false);
  });
});

test("G9 review queue is permission gated and count-leak safe", async () => {
  await withServer(async (baseUrl) => {
    const queue = await json(baseUrl, `/api/ai/review-queue?${BASE_QUERY}`);
    assert.equal(queue.status, 200);
    assert.equal(queue.body.items.length, 1);
    assert.equal(queue.body.items[0].raw_output_included, false);
    assert.equal(queue.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/ai/review-queue?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G9 retrieval API enforces permission-before-AI and omits raw payloads", async () => {
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/ai/retrieval", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g9_write",
        audit_hint_ref: "audit_hint_cmp_g9_write",
        actor_id: "user_cmp_g9_ai",
        idempotency_key: "api-retrieval-g9-1",
        ai_policy_id: "ai_policy_cmp_g9_seed",
        candidate_docs: [
          { document_id: "doc-g9-api-allowed", privilege_label: "attorney_client", privilege_label_inherited: true },
          { document_id: "doc-g9-api-denied", privilege_label: "work_product", privilege_label_inherited: true },
        ],
        authorized_doc_ids: ["doc-g9-api-allowed"],
        retrieval_request: {
          retrieval_request_id: "retrieval-g9-api-001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          source_refs: [{ source_type: "dms_document", source_id: "doc-g9-api-allowed" }],
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.permission.retrieved_doc_ids, ["doc-g9-api-allowed"]);
    assert.equal(created.body.item.raw_payload_included, false);
    assert.equal(created.body.production_ready_claim, false);
  });
});

test("G9 output write creates human review task and persists audit across restart", async () => {
  const aiStorePath = join(mkdtempSync(join(tmpdir(), "ai-api-g9-")), "ai.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/ai/outputs", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g9_write",
        audit_hint_ref: "audit_hint_cmp_g9_write",
        actor_id: "user_cmp_g9_ai",
        idempotency_key: "api-output-g9-1",
        prompt_log: {
          prompt_log_id: "prompt-g9-api-001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          retrieval_request_id: "retrieval-g9-api-001",
          raw_prompt: "Draft an answer from reviewed sources.",
        },
        ai_output: {
          ai_output_id: "output-g9-api-001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          raw_output: "Draft answer requiring review",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.raw_output_included, false);
    assert.equal(created.body.review_task.status, "open");
  }, { aiStorePath });

  await withServer(async (baseUrl) => {
    const queue = await json(baseUrl, `/api/ai/review-queue?${BASE_QUERY}`);
    assert.ok(queue.body.items.some((item) => item.ai_output_id === "output-g9-api-001"));
    const audit = await json(baseUrl, `/api/ai/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "ai.output.create"));
  }, { aiStorePath });
});

test("G9 export API requires inherited privilege, ACL, and share-boundary checks", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/ai/exports", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g9_export",
        audit_hint_ref: "audit_hint_cmp_g9_write",
        actor_id: "user_cmp_g9_ai",
        idempotency_key: "api-export-g9-blocked",
        ai_output_export: {
          ai_output_export_id: "export-g9-blocked",
          tenant_id: TENANT,
          ai_output_id: "output-g9-api-001",
          privilege_label_inherited: true,
          dms_acl_inherited: false,
          external_share_boundary_checked: true,
        },
      }),
    });
    assert.equal(blocked.status, 400);

    const created = await json(baseUrl, "/api/ai/exports", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g9_export",
        audit_hint_ref: "audit_hint_cmp_g9_write",
        actor_id: "user_cmp_g9_ai",
        idempotency_key: "api-export-g9-1",
        ai_output_export: {
          ai_output_export_id: "export-g9-api-001",
          tenant_id: TENANT,
          ai_output_id: "output-g9-api-001",
          privilege_label_inherited: true,
          dms_acl_inherited: true,
          external_share_boundary_checked: true,
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.raw_output_included, false);
    assert.equal(created.body.production_ready_claim, false);
  });
});
