import assert from "node:assert/strict";
import test from "node:test";

import {
  createDmsDocument,
  createDmsG4CheckoutLockDescriptor,
  createDmsG4EmailFilingDescriptor,
  createDmsG4ESecurityEmailSearchCloseoutDescriptor,
  createDmsG4OutlookPlaceholderDescriptor,
  createDmsG4PrivilegeLabelDescriptor,
  createDmsG4RedactionMetadataDescriptor,
  createDmsG4SearchAclDescriptor,
  createDmsG4SecureLinkDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g4e_validator";
const actor_id = "actor_g4e_validator";
const matter_id = "matter_g4e";

function document(overrides = {}) {
  return createDmsDocument({
    document_id: "doc_g4e",
    tenant_id,
    matter_id,
    workspace_id: "workspace_g4e",
    folder_id: "folder_g4e",
    title: "Synthetic privileged document",
    status: "active",
    current_version_id: "version_g4e_v1",
    permission_envelope_id: "perm_g4e_document",
    audit_trace_id: "audit_g4e_document",
    ...overrides,
  });
}

test("G4-E checkout lock descriptor blocks concurrent edits", () => {
  const descriptor = createDmsG4CheckoutLockDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    lock_request: { lock_id: "lock_g4e", requested_by: actor_id },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.lock_receipt.concurrent_edit_tested, true);
  assert.equal(descriptor.lock_receipt.checkout_lock_acquired, false);

  const blocked = createDmsG4CheckoutLockDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    lock_request: { lock_id: "lock_g4e", requested_by: actor_id },
    existing_lock: { lock_id: "lock_existing", locked_by: "other_actor", status: "active" },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_checkout_concurrent_edit_blocked"));
});

test("G4-E privilege label descriptor enforces AI and search exclusion", () => {
  const descriptor = createDmsG4PrivilegeLabelDescriptor({
    tenant_id,
    document: document(),
    privilege_label: {
      label_id: "priv_g4e",
      classification: "privileged",
      ai_search_excluded: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.ai_search_excluded, true);
  assert.equal(descriptor.search_index_allowed, false);
  assert.equal(descriptor.privilege_receipt.search_index_updated, false);

  const blocked = createDmsG4PrivilegeLabelDescriptor({
    tenant_id,
    document: document(),
    privilege_label: {
      label_id: "priv_g4e",
      classification: "privileged",
      ai_search_excluded: false,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_privilege_ai_search_exclusion_required"));
});

test("G4-E redaction metadata descriptor requires redacted export", () => {
  const descriptor = createDmsG4RedactionMetadataDescriptor({
    tenant_id,
    document: document(),
    redactions: [{ redaction_id: "redact_g4e", page: 1, reason: "privilege" }],
    export_redacted: true,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.redaction_receipt.redacted_export_tested, true);
  assert.equal(descriptor.redaction_receipt.original_bytes_exposed, false);
  assert.equal(descriptor.redaction_receipt.redacted_export_generated, false);

  const blocked = createDmsG4RedactionMetadataDescriptor({
    tenant_id,
    document: document(),
    redactions: [{ redaction_id: "redact_g4e", page: 1, reason: "privilege" }],
    export_redacted: false,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_redacted_export_required"));
});

test("G4-E secure link descriptor requires expiry MFA and watermark", () => {
  const descriptor = createDmsG4SecureLinkDescriptor({
    tenant_id,
    document: document(),
    link_policy: {
      expires_at: "2026-07-01T00:00:00.000Z",
      mfa_required: true,
      watermark_required: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.secure_link_receipt.expiry_tested, true);
  assert.equal(descriptor.secure_link_receipt.secure_link_created, false);
  assert.equal(descriptor.secure_link_receipt.document_bytes_served, false);

  const blocked = createDmsG4SecureLinkDescriptor({
    tenant_id,
    document: document(),
    link_policy: { mfa_required: false, watermark_required: false },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_secure_link_expiry_required"));
  assert.ok(blocked.blocked_claims.includes("dms_secure_link_mfa_required"));
  assert.ok(blocked.blocked_claims.includes("dms_secure_link_watermark_required"));
});

test("G4-E email filing descriptor requires Matter trace", () => {
  const descriptor = createDmsG4EmailFilingDescriptor({
    tenant_id,
    matter_id,
    email_thread: {
      email_thread_id: "thread_g4e",
      tenant_id,
      matter_id,
      message_ids: ["message_g4e_1"],
    },
    dms_document_ref: "DmsDocument:doc_g4e",
    filing_audit_ref: "audit:g4e:email-filing",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.email_filing_receipt.matter_filing_tested, true);
  assert.equal(descriptor.email_filing_receipt.email_runtime_executed, false);

  const blocked = createDmsG4EmailFilingDescriptor({
    tenant_id,
    matter_id,
    email_thread: {
      email_thread_id: "thread_g4e",
      tenant_id,
      matter_id: "other_matter",
      message_ids: ["message_g4e_1"],
    },
    dms_document_ref: "DmsDocument:doc_g4e",
    filing_audit_ref: "audit:g4e:email-filing",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_email_filing_matter_trace_mismatch"));
});

test("G4-E Outlook placeholder descriptor blocks credential leaks", () => {
  const descriptor = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id,
    actor_id,
    placeholder_request: {
      mailbox_ref: "mailbox:g4e",
      folder_hint: "Matter filing",
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.credentials_exposed, false);
  assert.equal(descriptor.outlook_receipt.outlook_api_called, false);

  const blocked = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id,
    actor_id,
    placeholder_request: {
      mailbox_ref: "mailbox:g4e",
      access_token: "secret-token",
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_outlook_credential_leak_blocked"));
});

test("G4-E search ACL descriptor omits unauthorized results", () => {
  const descriptor = createDmsG4SearchAclDescriptor({
    tenant_id,
    actor_id,
    query: "merger agreement",
    search_results: [
      {
        document_id: "doc_allowed",
        version_id: "version_allowed",
        title: "Allowed result",
        snippet: "Safe snippet",
        actor_can_view: true,
      },
      {
        document_id: "doc_denied",
        version_id: "version_denied",
        title: "Denied result",
        snippet: "Do not show",
        actor_can_view: false,
        permission_decision: "deny",
      },
    ],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.deepEqual(
    descriptor.visible_results.map((result) => result.document_id),
    ["doc_allowed"],
  );
  assert.equal(descriptor.unauthorized_result_count_exposed, null);
  assert.equal(descriptor.unauthorized_result_absent, true);
  assert.equal(descriptor.search_receipt.search_index_queried, false);

  const blocked = createDmsG4SearchAclDescriptor({
    tenant_id,
    actor_id,
    query: "merger agreement",
    search_results: [],
    include_unauthorized_results: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_search_unauthorized_result_blocked"));
});

test("G4-E closeout descriptor summarizes DMS security email search evidence", () => {
  const checkout = createDmsG4CheckoutLockDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    lock_request: { lock_id: "lock_g4e", requested_by: actor_id },
  });
  const privilege = createDmsG4PrivilegeLabelDescriptor({
    tenant_id,
    document: document(),
    privilege_label: { label_id: "priv_g4e", classification: "privileged", ai_search_excluded: true },
  });
  const redaction = createDmsG4RedactionMetadataDescriptor({
    tenant_id,
    document: document(),
    redactions: [{ redaction_id: "redact_g4e", page: 1, reason: "privilege" }],
    export_redacted: true,
  });
  const secureLink = createDmsG4SecureLinkDescriptor({
    tenant_id,
    document: document(),
    link_policy: { expires_at: "2026-07-01T00:00:00.000Z", mfa_required: true, watermark_required: true },
  });
  const emailFiling = createDmsG4EmailFilingDescriptor({
    tenant_id,
    matter_id,
    email_thread: { email_thread_id: "thread_g4e", tenant_id, matter_id, message_ids: ["message_g4e_1"] },
    dms_document_ref: "DmsDocument:doc_g4e",
    filing_audit_ref: "audit:g4e:email-filing",
  });
  const outlook = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id,
    actor_id,
    placeholder_request: { mailbox_ref: "mailbox:g4e" },
  });
  const search = createDmsG4SearchAclDescriptor({
    tenant_id,
    actor_id,
    query: "merger agreement",
    search_results: [{ document_id: "doc_allowed", title: "Allowed", actor_can_view: true }],
  });

  const closeout = createDmsG4ESecurityEmailSearchCloseoutDescriptor({
    tenant_id,
    descriptors: [checkout, privilege, redaction, secureLink, emailFiling, outlook, search],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G4-W06-T007",
    "LFOS-G4-W06-T008",
    "LFOS-G4-W06-T009",
    "LFOS-G4-W06-T010",
    "LFOS-G4-W06-T011",
    "LFOS-G4-W06-T012",
    "LFOS-G4-W06-T013",
  ]);
  assert.equal(closeout.checkout_lock_tested, true);
  assert.equal(closeout.privilege_search_exclusion_tested, true);
  assert.equal(closeout.redacted_export_tested, true);
  assert.equal(closeout.secure_link_policy_tested, true);
  assert.equal(closeout.email_filing_tested, true);
  assert.equal(closeout.outlook_placeholder_tested, true);
  assert.equal(closeout.search_acl_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
