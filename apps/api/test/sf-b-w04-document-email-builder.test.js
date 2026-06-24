import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp05_synthetic";
const MATTER_ID = "matter_rp05_synthetic_opening";
const ACTOR_ID = "user_rp05_owner";

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["matter_builder_user"] },
    rules: [{ id: `rule_sf_b_w04_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...headers,
  };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function query(permission = "read") {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: `perm_ref_sf_b_w04_${permission}`,
    audit_hint_ref: `audit_hint_sf_b_w04_${permission}`,
  }).toString();
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_sf_b_w04_write",
    audit_hint_ref: "audit_hint_sf_b_w04_write",
    actor_id: ACTOR_ID,
    ...overrides,
  };
}

test("SF-B-W04R health exposes document/email builder route descriptors", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const matter = health.body.bounded_contexts.find((item) => item.bounded_context === "matter-core");
    assert.equal(health.status, 200);
    assert.ok(matter);
    assert.equal(matter.production_ready_claim, false);
    assert.ok(matter.endpoints.includes("GET /api/matters/:matter_id/document-templates"));
    assert.ok(matter.endpoints.includes("POST /api/matters/:matter_id/builder-drafts"));
    assert.ok(matter.endpoints.includes("POST /api/matters/:matter_id/email-drafts/:draft_id/send"));
  });
});

test("SF-B-W04R document templates and builder draft routes are safe and idempotent", async () => {
  await withServer(async (baseUrl) => {
    const templates = await json(baseUrl, `/api/matters/${MATTER_ID}/document-templates?${query("template_read")}`);
    assert.equal(templates.status, 200);
    assert.equal(templates.body.items.some((item) => item.template_id === "matter_engagement_letter"), true);
    assert.equal(templates.body.items[0].raw_template_body_included, false);
    assert.equal(templates.body.items[0].raw_contact_values_included, false);

    const created = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w04-builder-draft-create",
        draft: {
          draft_id: "builder_draft_sf_b_w04",
          template_id: "matter_engagement_letter",
          title: "Engagement letter draft",
          body: "client-secret-value full legal clause should not be returned in the response",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.draft_id, "builder_draft_sf_b_w04");
    assert.equal(created.body.item.raw_body_included, false);
    assert.equal(created.body.item.raw_contact_values_included, false);
    assert.equal(created.body.item.document_bytes_included, false);
    assert.equal(JSON.stringify(created.body).includes("client-secret-value"), false);

    const replay = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w04-builder-draft-create",
        draft: {
          draft_id: "builder_draft_sf_b_w04",
          template_id: "matter_engagement_letter",
          title: "Engagement letter draft",
        },
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const patched = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts/builder_draft_sf_b_w04`, {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w04-builder-draft-patch",
        patch: { status: "ready_for_review", body: "updated raw body still hashes only" },
      }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.item.status, "ready_for_review");
    assert.equal(patched.body.audit_event.metadata.raw_body_included, false);

    const preview = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts/builder_draft_sf_b_w04/preview?${query("preview")}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.outcome, "passed");
    assert.equal(preview.body.item.raw_body_included, false);
    assert.equal(preview.body.item.document_bytes_included, false);
    assert.equal(Array.isArray(preview.body.item.preview_sections), true);
  });
});

test("SF-B-W04R approval and publish expose owner-blocked states without fake Vault publish", async () => {
  await withServer(async (baseUrl) => {
    await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w04-builder-draft-approval-create",
        draft: {
          draft_id: "builder_draft_sf_b_w04_approval",
          template_id: "matter_engagement_letter",
          title: "Owner approval draft",
        },
      }),
    });

    const approval = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts/builder_draft_sf_b_w04_approval/approval-requests`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w04-builder-approval" }),
    });
    assert.equal(approval.status, 200);
    assert.equal(approval.body.outcome, "approval_required");
    assert.equal(approval.body.ui_state, "owner_blocked");
    assert.equal(approval.body.approval_request.owner_approval_ref_included, false);
    assert.equal(approval.body.approval_request.reviewer_user_ref_included, false);

    const approvals = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-approval-requests?${query("approval_list")}`);
    assert.equal(approvals.status, 200);
    assert.equal(approvals.body.items.some((item) => item.draft_id === "builder_draft_sf_b_w04_approval"), true);

    const publish = await json(baseUrl, `/api/matters/${MATTER_ID}/builder-drafts/builder_draft_sf_b_w04_approval/publish-to-vault`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w04-builder-publish" }),
    });
    assert.equal(publish.status, 200);
    assert.equal(publish.body.outcome, "owner_blocked");
    assert.equal(publish.body.ui_state, "owner_blocked");
    assert.equal(publish.body.publish_state.vault_document_created, false);
    assert.equal(publish.body.publish_state.document_bytes_included, false);
    assert.equal(publish.body.production_ready_claim, false);
  });
});

test("SF-B-W04R email drafts are internal draft-only and external send stays provider-blocked", async () => {
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, `/api/matters/${MATTER_ID}/email-drafts`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w04-email-draft-create",
        draft: {
          draft_id: "email_draft_sf_b_w04",
          template_id: "matter_status_update_email",
          subject: "Matter status update",
          body: "email body should hash only and never include direct address",
          recipient_refs: ["client-contact-ref"],
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.draft_id, "email_draft_sf_b_w04");
    assert.equal(created.body.item.provider_state.external_send_state, "provider_blocked");
    assert.equal(created.body.item.direct_personal_contact_identifier_included, false);
    assert.equal(created.body.item.raw_provider_payload_included, false);
    assert.equal(JSON.stringify(created.body).includes("email body should hash"), false);

    const patched = await json(baseUrl, `/api/matters/${MATTER_ID}/email-drafts/email_draft_sf_b_w04`, {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w04-email-draft-patch",
        patch: { subject: "Updated Matter status update", body: "raw email patch body" },
      }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.item.subject, "Updated Matter status update");
    assert.equal(patched.body.audit_event.metadata.raw_body_included, false);

    const send = await json(baseUrl, `/api/matters/${MATTER_ID}/email-drafts/email_draft_sf_b_w04/send`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w04-email-provider-send" }),
    });
    assert.equal(send.status, 200);
    assert.equal(send.body.outcome, "provider_blocked");
    assert.equal(send.body.ui_state, "provider_blocked");
    assert.equal(send.body.provider_state.provider_configured, false);
    assert.equal(send.body.provider_state.raw_provider_payload_included, false);
    assert.equal(send.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/matters/${MATTER_ID}/document-templates?${query("denied")}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});
