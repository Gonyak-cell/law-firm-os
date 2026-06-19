import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_PORTAL_G6F_TUW_COVERAGE,
  createClientPortalG6ExternalACLDescriptor,
  createClientPortalG6ExternalUserDescriptor,
  createClientPortalG6FPortalRfiFoundationCloseoutDescriptor,
  createClientPortalG6PortalMatterProjectionDescriptor,
  createClientPortalG6RFIRequestDescriptor,
  createClientPortalG6RFIResponseUploadDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6f_validator";
const matter_id = "matter_g6f";
const client_party_id = "party_client_g6f";
const external_user_id = "external_user_g6f";
const rfi_request_id = "rfi_g6f";

function externalUser(overrides = {}) {
  return {
    tenant_id,
    client_party_id,
    external_user_id,
    email_hash: "hash_g6f",
    ...overrides,
  };
}

function projection(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    projection_id: "projection_g6f",
    visible_sections: ["status", "shared_documents"],
    ...overrides,
  };
}

function externalAcl(overrides = {}) {
  return {
    external_acl_id: "acl_g6f",
    grants: [{ document_id: "doc_shared_g6f", shared_with_client: true, permission: "view" }],
    ...overrides,
  };
}

function rfiRequest(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    due_date: "2026-07-01",
    status: "open",
    ...overrides,
  };
}

function upload(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    upload_id: "upload_g6f",
    virus_scan_placeholder: true,
    permission_checked: true,
    ...overrides,
  };
}

test("G6-F ExternalUser descriptor keeps external identities separate", () => {
  const descriptor = createClientPortalG6ExternalUserDescriptor({
    tenant_id,
    client_party_id,
    external_user: externalUser(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.external_user_receipt.user_employee_separation_tested, true);
  assert.equal(descriptor.external_user_receipt.external_user_persisted, false);

  const blocked = createClientPortalG6ExternalUserDescriptor({
    tenant_id,
    client_party_id,
    external_user: externalUser({ internal_user_id: "user_internal", employee_id: "employee_internal", dispatched_runtime: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("external_user_internal_identity_separation_required"));
  assert.ok(blocked.blocked_claims.includes("external_user_runtime_dispatch_blocked"));
});

test("G6-F PortalMatterProjection excludes internal and non-shared details", () => {
  const descriptor = createClientPortalG6PortalMatterProjectionDescriptor({
    tenant_id,
    matter_id,
    projection: projection(),
    documents: [{ document_id: "doc_shared_g6f", shared_with_client: true }],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.portal_projection_receipt.internal_memo_excluded_tested, true);
  assert.equal(descriptor.portal_projection_receipt.shared_only_documents_tested, true);

  const blocked = createClientPortalG6PortalMatterProjectionDescriptor({
    tenant_id,
    matter_id,
    projection: projection({
      visible_sections: ["status", "internal_memo", "conflict_memo"],
      includes_privileged_material: true,
      includes_hidden_matter_details: true,
    }),
    documents: [{ document_id: "doc_internal_g6f", shared_with_client: false }],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("portal_projection_internal_memo_excluded_required"));
  assert.ok(blocked.blocked_claims.includes("portal_projection_privileged_material_excluded_required"));
  assert.ok(blocked.blocked_claims.includes("portal_projection_shared_only_documents_required"));
});

test("G6-F ExternalACL descriptor enforces shared-only access", () => {
  const descriptor = createClientPortalG6ExternalACLDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    external_acl: externalAcl(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.external_acl_receipt.shared_only_access_tested, true);
  assert.equal(descriptor.external_acl_receipt.external_acl_persisted, false);

  const blocked = createClientPortalG6ExternalACLDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    external_acl: externalAcl({
      bypasses_acl: true,
      grants: [{ document_id: "doc_internal_g6f", shared_with_client: false, internal_only: true }],
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("external_acl_shared_only_access_required"));
  assert.ok(blocked.blocked_claims.includes("external_acl_bypass_blocked"));
});

test("G6-F RFIRequest descriptor requires due date and status", () => {
  const descriptor = createClientPortalG6RFIRequestDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request: rfiRequest(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.rfi_request_receipt.due_date_status_tested, true);
  assert.equal(descriptor.rfi_request_receipt.rfi_request_persisted, false);

  const blocked = createClientPortalG6RFIRequestDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request: rfiRequest({ due_date: "", status: "stale" }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("rfi_request_due_date_status_required"));
});

test("G6-F RFIResponse upload descriptor requires security placeholders", () => {
  const descriptor = createClientPortalG6RFIResponseUploadDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    upload: upload(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.rfi_response_upload_receipt.upload_security_placeholder_tested, true);
  assert.equal(descriptor.rfi_response_upload_receipt.upload_persisted, false);

  const blocked = createClientPortalG6RFIResponseUploadDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    upload: upload({ virus_scan_placeholder: false, permission_checked: false, writes_object_storage: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("rfi_response_upload_security_placeholder_required"));
  assert.ok(blocked.blocked_claims.includes("rfi_response_upload_object_storage_write_blocked"));
});

test("G6-F closeout descriptor summarizes portal RFI foundation evidence", () => {
  const externalUserDescriptor = createClientPortalG6ExternalUserDescriptor({
    tenant_id,
    client_party_id,
    external_user: externalUser(),
  });
  const projectionDescriptor = createClientPortalG6PortalMatterProjectionDescriptor({
    tenant_id,
    matter_id,
    projection: projection(),
    documents: [{ document_id: "doc_shared_g6f", shared_with_client: true }],
  });
  const aclDescriptor = createClientPortalG6ExternalACLDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    external_acl: externalAcl(),
  });
  const rfiDescriptor = createClientPortalG6RFIRequestDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request: rfiRequest(),
  });
  const uploadDescriptor = createClientPortalG6RFIResponseUploadDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    upload: upload(),
  });

  const closeout = createClientPortalG6FPortalRfiFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [externalUserDescriptor, projectionDescriptor, aclDescriptor, rfiDescriptor, uploadDescriptor],
    ai_legal_workflows_closed: true,
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 5);
  assert.equal(closeout.external_user_separation_tested, true);
  assert.equal(closeout.internal_memo_excluded_tested, true);
  assert.equal(closeout.shared_only_access_tested, true);
  assert.equal(closeout.rfi_due_status_tested, true);
  assert.equal(closeout.upload_security_placeholder_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(CLIENT_PORTAL_G6F_TUW_COVERAGE.length, 5);
});
