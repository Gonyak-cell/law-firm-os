import assert from "node:assert/strict";
import test from "node:test";

import {
  createDmsDocument,
  createDmsDocumentVersion,
  createDmsG4AuditCoverageDescriptor,
  createDmsG4FDmsCloseoutDescriptor,
  createDmsG4WorkspaceUiDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g4f_validator";
const actor_id = "actor_g4f_validator";
const matter_id = "matter_g4f";
const workspace_id = "workspace_g4f";

function document(overrides = {}) {
  return createDmsDocument({
    document_id: "doc_g4f",
    tenant_id,
    matter_id,
    workspace_id,
    folder_id: "folder_g4f",
    title: "Synthetic UI document",
    status: "active",
    current_version_id: "version_g4f_v2",
    permission_envelope_id: "perm_g4f_document",
    audit_trace_id: "audit_g4f_document",
    ...overrides,
  });
}

function version(overrides = {}) {
  return createDmsDocumentVersion({
    version_id: "version_g4f_v2",
    document_id: "doc_g4f",
    tenant_id,
    matter_id,
    version_number: 2,
    status: "current",
    file_object_id: "file_g4f_v2",
    permission_envelope_id: "perm_g4f_version",
    audit_trace_id: "audit_g4f_version",
    ...overrides,
  });
}

test("G4-F DMS workspace UI descriptor requires version and privilege display without data leaks", () => {
  const descriptor = createDmsG4WorkspaceUiDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    current_version: version(),
    privilege_label: { label_id: "priv_g4f", classification: "privileged" },
    ui_state: {
      displayed_version_id: "version_g4f_v2",
      visible_privilege_label: "privileged",
      visible_fields: ["title", "version", "privilege_label"],
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.version_displayed, true);
  assert.equal(descriptor.privilege_label_displayed, true);
  assert.equal(descriptor.raw_storage_path_rendered, false);
  assert.equal(descriptor.document_bytes_rendered, false);
  assert.equal(descriptor.ui_receipt.version_privilege_display_tested, true);

  const blocked = createDmsG4WorkspaceUiDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    current_version: version(),
    privilege_label: { label_id: "priv_g4f", classification: "privileged" },
    ui_state: {
      displayed_version_id: "version_g4f_v1",
      exposes_document_bytes: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_ui_version_display_required"));
  assert.ok(blocked.blocked_claims.includes("dms_ui_privilege_display_required"));
  assert.ok(blocked.blocked_claims.includes("dms_ui_raw_storage_or_bytes_leak_blocked"));
});

test("G4-F DMS audit coverage descriptor requires view download and share events", () => {
  const descriptor = createDmsG4AuditCoverageDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    audit_events: [
      { event_type: "view", document_id: "doc_g4f", audit_ref: "audit:g4f:view" },
      { event_type: "download", document_id: "doc_g4f", audit_ref: "audit:g4f:download" },
      { event_type: "share", document_id: "doc_g4f", audit_ref: "audit:g4f:share" },
    ],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.event_coverage.view, true);
  assert.equal(descriptor.event_coverage.download, true);
  assert.equal(descriptor.event_coverage.share, true);
  assert.equal(descriptor.audit_receipt.audit_event_written, false);
  assert.equal(descriptor.sensitive_payload_exposed, false);

  const blocked = createDmsG4AuditCoverageDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    audit_events: [
      { event_type: "view", document_id: "doc_g4f", audit_ref: "audit:g4f:view" },
      { event_type: "download", document_id: "doc_g4f", document_bytes: "secret" },
    ],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_audit_share_event_required"));
  assert.ok(blocked.blocked_claims.includes("dms_audit_sensitive_payload_leak_blocked"));
});

test("G4-F DMS closeout descriptor summarizes UI and audit evidence", () => {
  const ui = createDmsG4WorkspaceUiDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    current_version: version(),
    privilege_label: { label_id: "priv_g4f", classification: "privileged" },
    ui_state: { displayed_version_id: "version_g4f_v2", visible_privilege_label: "privileged" },
  });
  const audit = createDmsG4AuditCoverageDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    audit_events: [
      { event_type: "view", document_id: "doc_g4f", audit_ref: "audit:g4f:view" },
      { event_type: "download", document_id: "doc_g4f", audit_ref: "audit:g4f:download" },
      { event_type: "share", document_id: "doc_g4f", audit_ref: "audit:g4f:share" },
    ],
  });

  const closeout = createDmsG4FDmsCloseoutDescriptor({
    tenant_id,
    descriptors: [ui, audit],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, ["LFOS-G4-W06-T014", "LFOS-G4-W06-T015", "LFOS-G4-W06-T016"]);
  assert.equal(closeout.workspace_ui_tested, true);
  assert.equal(closeout.audit_coverage_tested, true);
  assert.equal(closeout.version_privilege_display_tested, true);
  assert.equal(closeout.view_download_share_audit_tested, true);
  assert.equal(closeout.dms_runtime_evidence_recorded, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
