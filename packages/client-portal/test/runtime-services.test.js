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
  createPortalDashboardProjection,
  createPortalProjection,
  createRfiRequest,
  createRfiResponse,
  createSecureLink,
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
