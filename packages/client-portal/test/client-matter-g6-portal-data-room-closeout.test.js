import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_PORTAL_G6G_TUW_COVERAGE,
  createClientPortalG6ClientApprovalDescriptor,
  createClientPortalG6GPortalDataRoomCloseoutDescriptor,
  createClientPortalG6PortalAuditDescriptor,
  createClientPortalG6SecureLinkViewerDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6g_validator";
const matter_id = "matter_g6g";
const external_user_id = "external_user_g6g";

function approval(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    approval_id: "approval_g6g",
    approver_external_user_id: external_user_id,
    audit_receipt_id: "audit_approval_g6g",
    ...overrides,
  };
}

function secureLink(overrides = {}) {
  return {
    secure_link_id: "secure_link_g6g",
    expires_at: "2026-07-01T00:00:00.000Z",
    watermark_enabled: true,
    mfa_required: true,
    ...overrides,
  };
}

function auditEvent(event_type, overrides = {}) {
  return {
    tenant_id,
    matter_id,
    external_user_id,
    event_type,
    audit_receipt_id: `audit_${event_type}_g6g`,
    ...overrides,
  };
}

test("G6-G client approval descriptor requires approval audit", () => {
  const descriptor = createClientPortalG6ClientApprovalDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    approval: approval(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.client_approval_receipt.approval_audit_tested, true);
  assert.equal(descriptor.client_approval_receipt.approval_persisted, false);

  const blocked = createClientPortalG6ClientApprovalDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    approval: approval({ audit_receipt_id: "", dispatched_runtime: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("client_approval_audit_required"));
  assert.ok(blocked.blocked_claims.includes("client_approval_runtime_dispatch_blocked"));
});

test("G6-G secure link viewer descriptor requires expiry watermark and MFA", () => {
  const descriptor = createClientPortalG6SecureLinkViewerDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    secure_link: secureLink(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.secure_link_receipt.expiry_tested, true);
  assert.equal(descriptor.secure_link_receipt.watermark_tested, true);
  assert.equal(descriptor.secure_link_receipt.mfa_tested, true);

  const blocked = createClientPortalG6SecureLinkViewerDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    secure_link: secureLink({ expires_at: "", watermark_enabled: false, mfa_required: false }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("secure_link_expiry_required"));
  assert.ok(blocked.blocked_claims.includes("secure_link_watermark_required"));
  assert.ok(blocked.blocked_claims.includes("secure_link_mfa_required"));
});

test("G6-G portal audit descriptor requires external view and upload events", () => {
  const descriptor = createClientPortalG6PortalAuditDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    audit_events: [auditEvent("external_view"), auditEvent("external_upload")],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.portal_audit_receipt.external_view_upload_events_tested, true);
  assert.equal(descriptor.portal_audit_receipt.audit_event_persisted, false);

  const blocked = createClientPortalG6PortalAuditDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    audit_events: [auditEvent("external_view", { internal_payload_included: true })],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("portal_audit_external_view_upload_events_required"));
  assert.ok(blocked.blocked_claims.includes("portal_audit_internal_payload_blocked"));
});

test("G6-G closeout descriptor summarizes portal data room evidence", () => {
  const approvalDescriptor = createClientPortalG6ClientApprovalDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    approval: approval(),
  });
  const secureLinkDescriptor = createClientPortalG6SecureLinkViewerDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    secure_link: secureLink(),
  });
  const portalAuditDescriptor = createClientPortalG6PortalAuditDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    audit_events: [auditEvent("external_view"), auditEvent("external_upload")],
  });
  const dataRoomDescriptor = {
    tuw_id: "LFOS-G6-W11-T008",
    outcome: "review_required",
  };

  const closeout = createClientPortalG6GPortalDataRoomCloseoutDescriptor({
    tenant_id,
    descriptors: [
      approvalDescriptor,
      secureLinkDescriptor,
      dataRoomDescriptor,
      portalAuditDescriptor,
      { tuw_id: "LFOS-G6-W11-T010", outcome: "review_required" },
    ],
    portal_rfi_foundation_closed: true,
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 5);
  assert.equal(closeout.approval_audit_tested, true);
  assert.equal(closeout.secure_link_expiry_watermark_mfa_tested, true);
  assert.equal(closeout.data_room_acl_tested, true);
  assert.equal(closeout.external_view_upload_audit_tested, true);
  assert.equal(closeout.no_internal_data_exposure_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(CLIENT_PORTAL_G6G_TUW_COVERAGE.length, 5);
});
