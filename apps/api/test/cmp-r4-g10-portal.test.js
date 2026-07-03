import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g10_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g10_read&audit_hint_ref=audit_hint_cmp_g10_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g10_portal", tenant_id: TENANT, role_ids: ["portal_operator"] },
    rules: [{ id: `rule_portal_${effect}`, effect, action: "*" }],
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

test("G10 Portal/Data Room API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const portal = body.bounded_contexts.find((item) => item.bounded_context === "client-portal-data-room");
    assert.equal(status, 200);
    assert.equal(portal.runtime_write_ready, true);
    assert.equal(portal.r5_r6_owner_decision_ready, true);
    assert.equal(portal.production_ready_claim, false);
  });
});

test("G10 portal reads are permission gated and metadata-only", async () => {
  await withServer(async (baseUrl) => {
    const dashboard = await json(baseUrl, `/api/portal/dashboard?${BASE_QUERY}`);
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.items.length, 1);
    assert.equal(dashboard.body.items[0].document_bytes_included, false);
    assert.equal(dashboard.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/portal/dashboard?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G10 RFI response, secure link, and data room projection writes persist across restart", async () => {
  const portalStorePath = join(mkdtempSync(join(tmpdir(), "portal-api-g10-")), "portal.json");
  await withServer(async (baseUrl) => {
    const response = await json(baseUrl, "/api/portal/rfi-responses", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-rfi-response-g10-1",
        rfi_response: {
          rfi_response_id: "rfi_response_cmp_g10_api_001",
          tenant_id: TENANT,
          rfi_request_id: "rfi_cmp_g10_seed",
          dms_acl_inherited: true,
          malware_scan_passed: true,
          upload_name: "minutes.pdf",
        },
      }),
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.item.document_bytes_included, false);

    const link = await json(baseUrl, "/api/portal/secure-links", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-secure-link-g10-1",
        secure_link: {
          secure_link_id: "secure_link_cmp_g10_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          target_object_id: "document_cmp_g5_seed",
          expires_at: "2026-07-01T00:00:00.000Z",
          dms_acl_inherited: true,
          watermark_enabled: true,
          external_share_boundary_checked: true,
        },
      }),
    });
    assert.equal(link.status, 201);
    assert.equal(link.body.item.token_material_included, false);

    const projection = await json(baseUrl, "/api/data-room/projections", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-data-room-projection-g10-1",
        data_room_projection: {
          data_room_projection_id: "data_room_projection_cmp_g10_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          data_room_id: "data_room_cmp_g10_seed",
          source_document_refs: [{ object_type: "document", object_id: "document_cmp_g5_seed" }],
          dms_acl_inherited: true,
          external_acl_applied: true,
        },
      }),
    });
    assert.equal(projection.status, 201);
    assert.equal(projection.body.item.source_payload_included, false);
  }, { portalStorePath });

  await withServer(async (baseUrl) => {
    const projections = await json(baseUrl, `/api/data-room/projections?${BASE_QUERY}`);
    assert.ok(projections.body.items.some((item) => item.data_room_projection_id === "data_room_projection_cmp_g10_api_001"));
    const audit = await json(baseUrl, `/api/portal/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "portal.secure_link.create"));
    assert.ok(audit.body.items.some((event) => event.action === "data_room.projection.sync"));
  }, { portalStorePath });
});

test("G10 external write APIs reject unsafe share boundaries", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/portal/secure-links", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-secure-link-g10-blocked",
        secure_link: {
          secure_link_id: "secure_link_cmp_g10_blocked",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          target_object_id: "document_cmp_g5_seed",
          expires_at: "2026-07-01T00:00:00.000Z",
          dms_acl_inherited: true,
          watermark_enabled: false,
          external_share_boundary_checked: true,
        },
      }),
    });
    assert.equal(blocked.status, 400);
  });
});

test("C13 external portal invite flow is one-time, auditable, and byte-safe", async () => {
  const portalStorePath = join(mkdtempSync(join(tmpdir(), "portal-api-c13-")), "portal.json");
  await withServer(async (baseUrl) => {
    const secureLink = await json(baseUrl, "/api/portal/secure-links", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-secure-link-c13-1",
        secure_link: {
          secure_link_id: "secure_link_c13_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          target_object_id: "document_cmp_g5_seed",
          expires_at: "2999-01-01T00:00:00.000Z",
          dms_acl_inherited: true,
          watermark_enabled: true,
          external_share_boundary_checked: true,
        },
      }),
    });
    assert.equal(secureLink.status, 201);
    assert.equal(secureLink.body.item.token_material_included, false);
    assert.equal(secureLink.body.item.document_bytes_included, false);

    const invite = await json(baseUrl, "/api/portal/invites", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-invite-c13-1",
        base_url: "https://portal.example.invalid/client",
        invite: {
          invite_id: "portal_invite_c13_api_001",
          tenant_id: TENANT,
          external_user_id: "external_user_cmp_g10_seed",
          matter_id: "matter_rp05_synthetic_opening",
          rfi_request_id: "rfi_cmp_g10_seed",
          secure_link_id: "secure_link_c13_api_001",
          expires_at: "2999-01-02T00:00:00.000Z",
        },
      }),
    });
    assert.equal(invite.status, 201);
    assert.equal(invite.body.item.token_material_included, false);
    assert.equal(invite.body.invite_delivery.returned_once, true);
    assert.equal(invite.body.invite_delivery.token_material_persisted, false);
    const token = new URL(invite.body.invite_delivery.one_time_url).searchParams.get("portal_invite");
    assert.ok(token);

    const replay = await json(baseUrl, "/api/portal/invites", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-invite-c13-1",
        base_url: "https://portal.example.invalid/client",
        invite: {
          invite_id: "portal_invite_c13_api_001",
          tenant_id: TENANT,
          external_user_id: "external_user_cmp_g10_seed",
          matter_id: "matter_rp05_synthetic_opening",
          rfi_request_id: "rfi_cmp_g10_seed",
          secure_link_id: "secure_link_c13_api_001",
          expires_at: "2999-01-02T00:00:00.000Z",
        },
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.invite_delivery.one_time_url, null);

    const consumed = await json(baseUrl, "/api/portal/invites/consume", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
      body: JSON.stringify({ token, now: "2026-07-03T00:00:00.000Z" }),
    });
    assert.equal(consumed.status, 200);
    assert.equal(consumed.body.item.status, "active");
    assert.equal(consumed.body.item.token_material_included, false);
    const externalSessionId = consumed.body.item.external_session_id;

    const reused = await json(baseUrl, "/api/portal/invites/consume", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
      body: JSON.stringify({ token, now: "2026-07-03T00:00:01.000Z" }),
    });
    assert.equal(reused.status, 409);
    assert.deepEqual(reused.body.safe_error_codes, ["PORTAL_MAGIC_LINK_ALREADY_USED"]);

    const response = await json(baseUrl, "/api/portal/external/rfi-responses", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
      body: JSON.stringify({
        external_session_id: externalSessionId,
        idempotency_key: "api-external-rfi-c13-1",
        rfi_response: {
          rfi_response_id: "rfi_response_c13_api_001",
          tenant_id: TENANT,
          rfi_request_id: "rfi_cmp_g10_seed",
          dms_acl_inherited: true,
          malware_scan_passed: true,
          upload_name: "client-answer.pdf",
        },
      }),
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.item.upload_metadata_only, true);
    assert.equal(response.body.item.document_bytes_included, false);

    const accessed = await json(
      baseUrl,
      `/api/portal/external/secure-links/secure_link_c13_api_001/access?tenant_id=${TENANT}&external_session_id=${externalSessionId}&now=2026-07-03T00%3A00%3A00.000Z`,
      { headers: { [PERMISSION_CONTEXT_HEADER]: undefined } },
    );
    assert.equal(accessed.status, 200);
    assert.equal(accessed.body.item.document_bytes_included, false);
    assert.equal(accessed.body.item.token_material_included, false);

    const revoked = await json(baseUrl, "/api/portal/secure-links/secure_link_c13_api_001/revoke", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g10_write",
        audit_hint_ref: "audit_hint_cmp_g10_write",
        actor_id: "user_cmp_g10_portal",
        idempotency_key: "api-secure-link-c13-revoke-1",
      }),
    });
    assert.equal(revoked.status, 201);
    assert.equal(revoked.body.item.status, "revoked");

    const blockedAccess = await json(
      baseUrl,
      `/api/portal/external/secure-links/secure_link_c13_api_001/access?tenant_id=${TENANT}&external_session_id=${externalSessionId}&now=2026-07-03T00%3A00%3A00.000Z`,
      { headers: { [PERMISSION_CONTEXT_HEADER]: undefined } },
    );
    assert.equal(blockedAccess.status, 403);
    assert.deepEqual(blockedAccess.body.safe_error_codes, ["PORTAL_SECURE_LINK_REVOKED"]);

    const audit = await json(baseUrl, `/api/portal/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "portal.magic_link_invite.create"));
    assert.ok(audit.body.items.some((event) => event.action === "portal.magic_link_invite.consume"));
    assert.ok(audit.body.items.some((event) => event.action === "portal.secure_link.access"));
    assert.equal(audit.body.items.some((event) => event.token_material_included === true), false);
  }, { portalStorePath });
});
