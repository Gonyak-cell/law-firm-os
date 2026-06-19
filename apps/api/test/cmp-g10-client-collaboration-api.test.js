// Deterministic in-process tests for the CMP-G10 client portal/data-room runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "external-user-cmp-g10";
const MATTER_ID = "matter-cmp-g10-runtime";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, external_user_id: ACTOR, ...params }).toString();
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G10 health descriptor exposes client collaboration after G1-G9", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const collaboration = body.bounded_contexts.find((context) => context.bounded_context === "client-collaboration");
  assert.ok(collaboration);
  assert.equal(collaboration.cmp_gate, "CMP-G10");
  assert.equal(collaboration.tuw_ids.length, 17);
  assert.equal(collaboration.tuw_ids[0], "CMP-G10-W10-T001");
  assert.equal(collaboration.tuw_ids.at(-1), "CMP-G10-W10-T017");
  assert.deepEqual(collaboration.depends_on, [
    "CMP-G1-W01",
    "CMP-G2-W02",
    "CMP-G3-W03",
    "CMP-G4-W04",
    "CMP-G5-W05",
    "CMP-G6-W06",
    "CMP-G7-W07",
    "CMP-G8-W08",
    "CMP-G9-W09",
  ]);
  assert.equal(collaboration.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G10 separates external users and projects only shared Matter content", async () => {
  const linkedInternal = await json(`/api/client-collaboration/external-users?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      external_user: {
        tenant_id: TENANT,
        client_party_id: "party-client-cmp-g10",
        external_user_id: ACTOR,
        internal_user_id: "user-internal",
      },
    }),
  });
  assert.equal(linkedInternal.status, 400);
  assert.ok(linkedInternal.body.descriptor.blocked_claims.includes("external_user_internal_identity_separation_required"));

  const externalUser = await json(`/api/client-collaboration/external-users?${query()}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(externalUser.status, 200);
  assert.equal(externalUser.body.external_user.external_user_persisted, false);

  const leakedProjection = await json(`/api/client-collaboration/matter-projections?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      projection: {
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        projection_id: "projection-leak",
        visible_sections: ["status", "internal_memo", "conflict_memo"],
      },
      documents: [{ document_id: "doc-internal", shared_with_client: false }],
    }),
  });
  assert.equal(leakedProjection.status, 400);
  assert.ok(leakedProjection.body.descriptor.blocked_claims.includes("portal_projection_internal_memo_excluded_required"));
  assert.ok(leakedProjection.body.descriptor.blocked_claims.includes("portal_projection_shared_only_documents_required"));

  const projection = await json(`/api/client-collaboration/matter-projections?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(projection.status, 200);
  assert.equal(projection.body.projection.internal_memo_visible, false);
  assert.equal(projection.body.projection.privileged_material_visible, false);
});

test("CMP-G10 enforces external ACLs and RFI upload security without storage writes", async () => {
  const aclBypass = await json(`/api/client-collaboration/external-acl-test?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      external_acl: {
        external_acl_id: "acl-bypass",
        bypasses_acl: true,
        grants: [{ document_id: "doc-internal", shared_with_client: false, internal_only: true }],
      },
    }),
  });
  assert.equal(aclBypass.status, 400);
  assert.ok(aclBypass.body.descriptor.blocked_claims.includes("external_acl_bypass_blocked"));

  const acl = await json(`/api/client-collaboration/external-acls?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(acl.status, 200);
  assert.equal(acl.body.external_acl.shared_only_access, true);

  const rfi = await json(`/api/client-collaboration/rfi-requests?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(rfi.status, 200);
  assert.equal(rfi.body.rfi_request.due_date_status_tested, true);

  const uploadBlocked = await json(`/api/client-collaboration/upload-security-test?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      upload: {
        upload_id: "upload-bad",
        virus_scan_placeholder: false,
        permission_checked: false,
        writes_object_storage: true,
      },
    }),
  });
  assert.equal(uploadBlocked.status, 400);
  assert.ok(uploadBlocked.body.descriptor.blocked_claims.includes("rfi_response_upload_security_placeholder_required"));
  assert.ok(uploadBlocked.body.descriptor.blocked_claims.includes("rfi_response_upload_object_storage_write_blocked"));

  const upload = await json(`/api/client-collaboration/rfi-response-uploads?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(upload.status, 200);
  assert.equal(upload.body.upload.object_storage_written, false);
});

test("CMP-G10 secures approvals, secure links, data rooms, and portal audit", async () => {
  const approval = await json(`/api/client-collaboration/client-approvals?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(approval.status, 200);
  assert.equal(approval.body.approval.approval_audit_tested, true);

  const insecureLink = await json(`/api/client-collaboration/secure-links?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      secure_link: {
        secure_link_id: "link-bad",
        expires_at: "",
        watermark_enabled: false,
        mfa_required: false,
      },
    }),
  });
  assert.equal(insecureLink.status, 400);
  assert.ok(insecureLink.body.descriptor.blocked_claims.includes("secure_link_expiry_required"));
  assert.ok(insecureLink.body.descriptor.blocked_claims.includes("secure_link_mfa_required"));

  const secureLink = await json(`/api/client-collaboration/secure-links?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(secureLink.status, 200);
  assert.equal(secureLink.body.secure_link.watermark_tested, true);

  const dataRoomBlocked = await json(`/api/client-collaboration/data-rooms?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      unauthorized_access: true,
      data_room: {
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        room_id: "room-bad",
        room_level_acl: false,
        grants: [{ room_id: "other", shared_with_external: false }],
      },
    }),
  });
  assert.equal(dataRoomBlocked.status, 400);
  assert.ok(dataRoomBlocked.body.descriptor.blocked_claims.includes("data_room_unauthorized_access_blocked"));

  const dataRoom = await json(`/api/client-collaboration/data-rooms?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(dataRoom.status, 200);
  assert.equal(dataRoom.body.data_room.room_level_acl_tested, true);

  const audit = await json(`/api/client-collaboration/portal-audit?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(audit.status, 200);
  assert.equal(audit.body.portal_audit.external_view_upload_events_tested, true);
});

test("CMP-G10 dashboard, shared documents, and messages expose projection-only UI state", async () => {
  const dashboard = await json(`/api/client-collaboration/ui/client-dashboard?${query({ matter_id: MATTER_ID })}`);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.dashboard.projection_only, true);
  assert.equal(dashboard.body.dashboard.internal_memo_visible, false);
  assert.equal(dashboard.body.dashboard.privileged_material_visible, false);

  const sharedDocuments = await json(`/api/client-collaboration/shared-documents?${query({ matter_id: MATTER_ID })}`);
  assert.equal(sharedDocuments.status, 200);
  assert.equal(sharedDocuments.body.documents.length, 1);
  assert.equal(sharedDocuments.body.documents[0].raw_path_visible, false);
  assert.equal(sharedDocuments.body.documents[0].internal_metadata_visible, false);

  const messages = await json(`/api/client-collaboration/message-threads?${query({ matter_id: MATTER_ID })}`);
  assert.equal(messages.status, 200);
  assert.equal(messages.body.message_thread.internal_notes_visible, false);
  assert.equal(messages.body.message_thread.message_thread_persisted, false);
});

test("CMP-G10 closeouts and runtime evidence preserve projection-only no-R4 boundary", async () => {
  const rfiCloseout = await json(`/api/client-collaboration/portal-rfi-closeout?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(rfiCloseout.status, 200);
  assert.equal(rfiCloseout.body.closeout.portal_runtime_opened, false);

  const dataRoomCloseout = await json(`/api/client-collaboration/portal-data-room-closeout?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(dataRoomCloseout.status, 200);
  assert.equal(dataRoomCloseout.body.closeout.data_room_runtime_opened, false);

  const evidence = await json(`/api/client-collaboration/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G10");
  assert.equal(evidence.body.evidence.tuw_ids.length, 17);
  assert.equal(evidence.body.evidence.projection_only_runtime, true);
  assert.equal(evidence.body.evidence.external_acl_required, true);
  assert.equal(evidence.body.evidence.internal_data_exposure_allowed, false);
  assert.equal(evidence.body.evidence.object_storage_write_allowed, false);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");
});
