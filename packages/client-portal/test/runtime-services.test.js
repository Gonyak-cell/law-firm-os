import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createClientApproval,
  createClientPortalRepository,
  createExternalAcl,
  createExternalUser,
  accessExternalSecureLink,
  consumeMagicLinkInvite,
  createMagicLinkInvite,
  createPortalDashboardProjection,
  createPortalProjection,
  createRfiRequest,
  createRfiResponse,
  createSecureLink,
  revokeMagicLinkInvite,
  revokeSecureLink,
  submitExternalRfiResponse,
} from "../src/index.js";
import { createDataRoom, syncDataRoomProjection } from "../../data-room/src/index.js";

const TENANT = "tenant-cmp-g10";
const MATTER = "matter-cmp-g10";
const ACTOR = "user-cmp-g10";
const EXTERNAL_USER = "external-user-g10";

function createPortalChain(repository) {
  const user = createExternalUser({
    repository,
    external_user: {
      external_user_id: EXTERNAL_USER,
      tenant_id: TENANT,
      client_group_id: "client-group-g10",
      email: "client@example.invalid",
    },
    actor_id: ACTOR,
    idempotency_key: "external-user-1",
  });
  const acl = createExternalAcl({
    repository,
    external_acl: {
      external_acl_id: "external-acl-g10-001",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      allowed_object_refs: [{ object_type: "document", object_id: "doc-g10-001" }],
      dms_acl_inherited: true,
    },
    actor_id: ACTOR,
    idempotency_key: "external-acl-1",
  });
  const projection = createPortalProjection({
    repository,
    portal_projection: {
      portal_projection_id: "portal-projection-g10-001",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      visible_object_refs: [{ object_type: "document", object_id: "doc-g10-001" }],
      dms_acl_inherited: true,
    },
    actor_id: ACTOR,
    idempotency_key: "portal-projection-1",
  });
  const rfi = createRfiRequest({
    repository,
    rfi_request: {
      rfi_request_id: "rfi-g10-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      external_user_id: EXTERNAL_USER,
      title: "Upload diligence schedule",
    },
    actor_id: ACTOR,
    idempotency_key: "rfi-1",
  });
  const response = createRfiResponse({
    repository,
    rfi_response: {
      rfi_response_id: "rfi-response-g10-001",
      tenant_id: TENANT,
      rfi_request_id: rfi.rfi_request.rfi_request_id,
      dms_acl_inherited: true,
      malware_scan_passed: true,
      upload_name: "schedule.pdf",
    },
    actor_id: ACTOR,
    idempotency_key: "rfi-response-1",
  });
  const approval = createClientApproval({
    repository,
    client_approval: {
      client_approval_id: "approval-g10-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      external_user_id: EXTERNAL_USER,
      decision: "approved",
    },
    actor_id: ACTOR,
    idempotency_key: "approval-1",
  });
  const link = createSecureLink({
    repository,
    secure_link: {
      secure_link_id: "secure-link-g10-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      target_object_id: "doc-g10-001",
      expires_at: "2026-07-01T00:00:00.000Z",
      dms_acl_inherited: true,
      watermark_enabled: true,
      external_share_boundary_checked: true,
    },
    actor_id: ACTOR,
    idempotency_key: "secure-link-1",
  });
  const dashboard = createPortalDashboardProjection({
    repository,
    dashboard_projection: {
      dashboard_projection_id: "dashboard-g10-001",
      tenant_id: TENANT,
      client_group_id: "client-group-g10",
      matter_count: 1,
      open_rfi_count: 1,
    },
    actor_id: ACTOR,
    idempotency_key: "dashboard-1",
  });
  const room = createDataRoom({
    repository,
    data_room: {
      data_room_id: "data-room-g10-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      name: "Diligence room",
      external_acl_required: true,
    },
    actor_id: ACTOR,
    idempotency_key: "data-room-1",
  });
  const dataRoomProjection = syncDataRoomProjection({
    repository,
    data_room_projection: {
      data_room_projection_id: "data-room-projection-g10-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      data_room_id: room.data_room.data_room_id,
      source_document_refs: [{ object_type: "document", object_id: "doc-g10-001" }],
      dms_acl_inherited: true,
      external_acl_applied: true,
    },
    actor_id: ACTOR,
    idempotency_key: "data-room-projection-1",
  });
  return { user, acl, projection, rfi, response, approval, link, dashboard, room, dataRoomProjection };
}

test("G10 portal/data-room runtime persists external writes, audit, and idempotency", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "portal-g10-")), "portal.json");
  const repository = createClientPortalRepository({ filePath: storePath });
  const result = createPortalChain(repository);
  assert.equal(result.link.secure_link.document_bytes_included, false);
  assert.equal(result.response.rfi_response.upload_metadata_only, true);
  assert.equal(result.dataRoomProjection.data_room_projection.projection_metadata_only, true);
  repository.close();

  const reopened = createClientPortalRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "ExternalUser" }).length, 1);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "DataRoomProjection" }).length, 1);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "secure-link-1" }).operation, "portal_secure_link_create");
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).some((event) => event.action === "data_room.projection.sync"), true);
});

test("G10 external portal blocks unsafe uploads, secure links, and ACL drift", () => {
  const repository = createClientPortalRepository();
  assert.throws(
    () =>
      createExternalAcl({
        repository,
        external_acl: {
          external_acl_id: "acl-unsafe",
          tenant_id: TENANT,
          external_user_id: EXTERNAL_USER,
          matter_id: MATTER,
          allowed_object_refs: [{ object_type: "document", object_id: "doc" }],
          dms_acl_inherited: true,
          cross_tenant_access_allowed: true,
        },
        actor_id: ACTOR,
        idempotency_key: "acl-unsafe",
      }),
    /cross-tenant/,
  );
  assert.throws(
    () =>
      createRfiResponse({
        repository,
        rfi_response: {
          rfi_response_id: "rfi-response-unsafe",
          tenant_id: TENANT,
          rfi_request_id: "rfi-unsafe",
          dms_acl_inherited: true,
          malware_scan_passed: false,
        },
        actor_id: ACTOR,
        idempotency_key: "rfi-response-unsafe",
      }),
    /malware scan/,
  );
  assert.throws(
    () =>
      createSecureLink({
        repository,
        secure_link: {
          secure_link_id: "link-unsafe",
          tenant_id: TENANT,
          matter_id: MATTER,
          target_object_id: "doc",
          expires_at: "2026-07-01T00:00:00.000Z",
          dms_acl_inherited: true,
          watermark_enabled: false,
          external_share_boundary_checked: true,
        },
        actor_id: ACTOR,
        idempotency_key: "link-unsafe",
      }),
    /watermark/,
  );
});

test("C13 magic-link invite is one-time, auditable, revocable, and metadata-only", () => {
  const repository = createClientPortalRepository();
  createPortalChain(repository);

  const secureLink = createSecureLink({
    repository,
    secure_link: {
      secure_link_id: "secure-link-c13-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      target_object_id: "doc-g10-001",
      expires_at: "2999-01-01T00:00:00.000Z",
      dms_acl_inherited: true,
      watermark_enabled: true,
      external_share_boundary_checked: true,
    },
    actor_id: ACTOR,
    idempotency_key: "c13-secure-link-1",
  });

  const invite = createMagicLinkInvite({
    repository,
    invite: {
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: "rfi-g10-001",
      secure_link_id: secureLink.secure_link.secure_link_id,
      expires_at: "2999-01-02T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "c13-invite-1",
    base_url: "https://portal.example.invalid/client",
  });

  assert.equal(invite.invite.token_material_included, false);
  assert.equal(invite.invite_delivery.returned_once, true);
  assert.match(invite.invite_delivery.one_time_url, /portal_invite=/);
  const token = new URL(invite.invite_delivery.one_time_url).searchParams.get("portal_invite");
  assert.ok(token);
  assert.equal(repository.getIdempotency({ tenant_id: TENANT, idempotency_key: "c13-invite-1" }).response.invite_delivery.one_time_url, null);

  const consumed = consumeMagicLinkInvite({ repository, token, clock: () => "2026-07-03T00:00:00.000Z" });
  assert.equal(consumed.external_session.status, "active");
  assert.equal(consumed.external_session.token_material_included, false);
  assert.throws(() => consumeMagicLinkInvite({ repository, token, clock: () => "2026-07-03T00:00:01.000Z" }), /already used/);

  const response = submitExternalRfiResponse({
    repository,
    external_session_id: consumed.external_session.external_session_id,
    rfi_response: {
      rfi_response_id: "rfi-response-c13-001",
      tenant_id: TENANT,
      rfi_request_id: "rfi-g10-001",
      dms_acl_inherited: true,
      malware_scan_passed: true,
      upload_name: "external-response.pdf",
    },
    idempotency_key: "c13-external-rfi-1",
  });
  assert.equal(response.rfi_response.upload_metadata_only, true);
  assert.equal(response.rfi_response.external_session_id, consumed.external_session.external_session_id);

  const access = accessExternalSecureLink({
    repository,
    tenant_id: TENANT,
    secure_link_id: secureLink.secure_link.secure_link_id,
    external_session_id: consumed.external_session.external_session_id,
    clock: () => "2026-07-03T00:00:00.000Z",
  });
  assert.equal(access.secure_link.document_bytes_included, false);
  assert.equal(access.secure_link.token_material_included, false);

  const revokedLink = revokeSecureLink({
    repository,
    tenant_id: TENANT,
    secure_link_id: secureLink.secure_link.secure_link_id,
    actor_id: ACTOR,
    idempotency_key: "c13-secure-link-revoke-1",
  });
  assert.equal(revokedLink.secure_link.status, "revoked");
  assert.equal(revokedLink.revoked_session_count, 1);
  assert.equal(repository.get({ tenant_id: TENANT, model_type: "PortalExternalSession", resource_id: consumed.external_session.external_session_id }).status, "revoked");
  assert.throws(
    () => submitExternalRfiResponse({
      repository,
      external_session_id: consumed.external_session.external_session_id,
      rfi_response: {
        rfi_response_id: "rfi-response-c13-after-revoke",
        tenant_id: TENANT,
        rfi_request_id: "rfi-g10-001",
      },
      idempotency_key: "c13-external-rfi-after-revoke",
    }),
    (error) => error.safe_error_code === "PORTAL_EXTERNAL_SESSION_INACTIVE",
  );
  assert.throws(
    () =>
      accessExternalSecureLink({
        repository,
        tenant_id: TENANT,
        secure_link_id: secureLink.secure_link.secure_link_id,
        external_session_id: consumed.external_session.external_session_id,
        clock: () => "2026-07-03T00:00:00.000Z",
      }),
    /not active/,
  );

  const revocable = createMagicLinkInvite({
    repository,
    invite: {
      invite_id: "portal-invite-c13-revocable",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: "rfi-g10-001",
      secure_link_id: secureLink.secure_link.secure_link_id,
      expires_at: "2999-01-02T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "c13-invite-revocable",
  });
  const revokedInvite = revokeMagicLinkInvite({
    repository,
    tenant_id: TENANT,
    invite_id: revocable.invite.invite_id,
    actor_id: ACTOR,
    idempotency_key: "c13-invite-revoke-1",
  });
  assert.equal(revokedInvite.invite.status, "revoked");
  assert.equal(repository.listAudit({ tenant_id: TENANT }).some((event) => event.action === "portal.magic_link_invite.create"), true);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).some((event) => event.action === "portal.magic_link_invite.consume"), true);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).some((event) => event.action === "portal.secure_link.access"), true);
});

test("consumed portal sessions expire and are revoked with their invite", () => {
  const repository = createClientPortalRepository();
  createPortalChain(repository);
  const secureLink = createSecureLink({
    repository,
    secure_link: {
      secure_link_id: "secure-link-session-lifecycle",
      tenant_id: TENANT,
      matter_id: MATTER,
      target_object_id: "doc-g10-001",
      expires_at: "2999-01-01T00:00:00.000Z",
      dms_acl_inherited: true,
      watermark_enabled: true,
      external_share_boundary_checked: true,
    },
    actor_id: ACTOR,
    idempotency_key: "secure-link-session-lifecycle",
  });
  const invite = createMagicLinkInvite({
    repository,
    invite: {
      invite_id: "invite-session-lifecycle",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: "rfi-g10-001",
      secure_link_id: secureLink.secure_link.secure_link_id,
      expires_at: "2026-07-10T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invite-session-lifecycle",
  });
  const token = new URL(invite.invite_delivery.one_time_url).searchParams.get("portal_invite");
  const consumed = consumeMagicLinkInvite({ repository, token, clock: () => "2026-07-03T00:00:00.000Z" });

  assert.throws(
    () => submitExternalRfiResponse({
      repository,
      external_session_id: consumed.external_session.external_session_id,
      rfi_response: {
        rfi_response_id: "rfi-response-expired-session",
        tenant_id: TENANT,
        rfi_request_id: "rfi-g10-001",
      },
      idempotency_key: "rfi-response-expired-session",
      clock: () => "2026-07-11T00:00:00.000Z",
    }),
    (error) => error.safe_error_code === "PORTAL_EXTERNAL_SESSION_EXPIRED",
  );

  const revoked = revokeMagicLinkInvite({
    repository,
    tenant_id: TENANT,
    invite_id: invite.invite.invite_id,
    actor_id: ACTOR,
    idempotency_key: "invite-session-lifecycle-revoke",
    clock: () => "2026-07-04T00:00:00.000Z",
  });
  assert.equal(revoked.revoked_session_count, 1);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "PortalExternalSession",
    resource_id: consumed.external_session.external_session_id,
  }).status, "revoked");
});

test("public expiry decisions use the service clock instead of caller timestamps", () => {
  const repository = createClientPortalRepository();
  createPortalChain(repository);
  const expiredLink = createSecureLink({
    repository,
    secure_link: {
      secure_link_id: "secure-link-expired-clock",
      tenant_id: TENANT,
      matter_id: MATTER,
      target_object_id: "doc-g10-001",
      expires_at: "2026-07-01T00:00:00.000Z",
      dms_acl_inherited: true,
      watermark_enabled: true,
      external_share_boundary_checked: true,
    },
    actor_id: ACTOR,
    idempotency_key: "secure-link-expired-clock",
  });
  const expiredInvite = createMagicLinkInvite({
    repository,
    invite: {
      invite_id: "invite-expired-clock",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: "rfi-g10-001",
      secure_link_id: expiredLink.secure_link.secure_link_id,
      expires_at: "2026-07-02T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invite-expired-clock",
  });
  const expiredToken = new URL(expiredInvite.invite_delivery.one_time_url).searchParams.get("portal_invite");
  assert.throws(
    () => consumeMagicLinkInvite({ repository, token: expiredToken, clock: () => "2026-07-18T00:00:00.000Z" }),
    (error) => error.safe_error_code === "PORTAL_MAGIC_LINK_EXPIRED",
  );

  const activeInvite = createMagicLinkInvite({
    repository,
    invite: {
      invite_id: "invite-active-clock",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: "rfi-g10-001",
      secure_link_id: expiredLink.secure_link.secure_link_id,
      expires_at: "2999-01-01T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invite-active-clock",
  });
  const activeToken = new URL(activeInvite.invite_delivery.one_time_url).searchParams.get("portal_invite");
  const session = consumeMagicLinkInvite({ repository, token: activeToken, clock: () => "2026-07-18T00:00:00.000Z" });
  assert.throws(
    () => accessExternalSecureLink({
      repository,
      tenant_id: TENANT,
      secure_link_id: expiredLink.secure_link.secure_link_id,
      external_session_id: session.external_session.external_session_id,
      clock: () => "2026-07-18T00:00:00.000Z",
    }),
    (error) => error.safe_error_code === "PORTAL_SECURE_LINK_EXPIRED",
  );
});
