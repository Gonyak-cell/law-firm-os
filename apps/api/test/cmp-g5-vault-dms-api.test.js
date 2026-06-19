// Deterministic in-process tests for the CMP-G5 Vault/DMS runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g5-vault-ops";
const MATTER_ID = "matter-cmp-g4-runtime";
const WORKSPACE_ID = "workspace-cmp-g5-runtime";
const FOLDER_ID = "folder-cmp-g5-runtime";
const DOC_ID = "doc-cmp-g5-runtime";
const VERSION_ID = "version-doc-cmp-g5-runtime-001";
const FILE_OBJECT_ID = "file-doc-cmp-g5-runtime-001";

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
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

async function createVaultDocument() {
  await json(`/api/vault/workspaces?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: WORKSPACE_ID,
      matter_id: MATTER_ID,
      name: "CMP G5 Runtime Workspace",
    }),
  });
  await json(`/api/vault/folders?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: WORKSPACE_ID,
      folder_id: FOLDER_ID,
      name: "Evidence",
      path_segments: ["Matters", MATTER_ID, "Evidence"],
    }),
  });
  return json(`/api/vault/documents/upload?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: WORKSPACE_ID,
      folder_id: FOLDER_ID,
      document_id: DOC_ID,
      version_id: VERSION_ID,
      file_object_id: FILE_OBJECT_ID,
      title: "CMP G5 Runtime Document",
      storage_pointer_ref: `object-store-ref:cmp-g5/${FILE_OBJECT_ID}`,
      sha256: "cmp-g5-runtime-sha256",
      byte_size: 4096,
      upload_audit_ref: "audit-cmp-g5-upload",
    }),
  });
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G5 health descriptor exposes Vault/DMS after G1-G4", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const vault = body.bounded_contexts.find((context) => context.bounded_context === "vault-dms");
  assert.ok(vault);
  assert.equal(vault.cmp_gate, "CMP-G5");
  assert.deepEqual(vault.depends_on, ["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04"]);
  assert.equal(vault.tuw_ids.length, 32);
  assert.equal(vault.tuw_ids[0], "CMP-G5-W05-T001");
  assert.equal(vault.tuw_ids.at(-1), "CMP-G5-W05-T032");
  assert.equal(vault.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G5 creates workspace, folder, upload metadata, immutable version, storage descriptor, and lineage without raw bytes", async () => {
  const uploaded = await createVaultDocument();
  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.body.document.document_id, DOC_ID);
  assert.equal(uploaded.body.document.raw_storage_path_exposed, false);
  assert.equal(uploaded.body.file_object.raw_storage_path_exposed, false);
  assert.equal(uploaded.body.file_object.document_bytes_exposed, false);
  assert.equal(uploaded.body.storage.raw_storage_pointer_exposed, false);
  assert.equal(uploaded.body.descriptor.upload_receipt.object_storage_written, false);

  const blockedRawPath = await json(`/api/vault/documents/upload?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: WORKSPACE_ID,
      document_id: "doc-cmp-g5-raw-path",
      title: "Raw path",
      storage_pointer_ref: "/tmp/raw/path.pdf",
    }),
  });
  assert.equal(blockedRawPath.status, 400);
  assert.equal(blockedRawPath.body.safe_error_code, "CMP_G5_DOCUMENT_UPLOAD_BLOCKED");
  assert.ok(blockedRawPath.body.descriptor.blocked_claims.includes("dms_file_object_raw_storage_pointer_blocked"));

  const secondVersion = await json(`/api/vault/documents/${DOC_ID}/versions?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      version_id: "version-doc-cmp-g5-runtime-002",
      file_object_id: "file-doc-cmp-g5-runtime-002",
      version_number: 2,
      storage_pointer_ref: "object-store-ref:cmp-g5/file-doc-cmp-g5-runtime-002",
      sha256: "cmp-g5-runtime-sha256-v2",
    }),
  });
  assert.equal(secondVersion.status, 201);
  assert.equal(secondVersion.body.descriptor.version_receipt.immutable_version_tested, true);

  const storage = await json(`/api/vault/file-objects/file-doc-cmp-g5-runtime-002/storage?${query()}`);
  assert.equal(storage.status, 200);
  assert.equal(storage.body.storage.storage_receipt.document_bytes_loaded, false);
  assert.equal(storage.body.file_object.sanitized_storage_pointer_ref, "dms-file-object:tenant-a:file-doc-cmp-g5-runtime-002");

  const lineage = await json(`/api/vault/documents/${DOC_ID}/lineage?${query()}`);
  assert.equal(lineage.status, 200);
  assert.equal(lineage.body.lineage.lineage_entries.length, 2);
  assert.ok(lineage.body.lineage.lineage_entries.every((entry) => entry.hash_matches_expected));
});

test("CMP-G5 enforces checkout, privilege, redaction, and secure-link controls", async () => {
  const lock = await json(`/api/vault/documents/${DOC_ID}/checkout-locks?${query()}`, {
    method: "POST",
    body: JSON.stringify({ lock_id: "lock-cmp-g5-runtime" }),
  });
  assert.equal(lock.status, 200);
  assert.equal(lock.body.descriptor.lock_receipt.concurrent_edit_tested, true);

  const blockedPrivilege = await json(`/api/vault/documents/${DOC_ID}/privilege-label?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      label_id: "priv-cmp-g5-blocked",
      classification: "privileged",
      ai_search_excluded: false,
    }),
  });
  assert.equal(blockedPrivilege.status, 400);
  assert.ok(blockedPrivilege.body.descriptor.blocked_claims.includes("dms_privilege_ai_search_exclusion_required"));

  const privilege = await json(`/api/vault/documents/${DOC_ID}/privilege-label?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      label_id: "priv-cmp-g5-runtime",
      classification: "public",
      ai_search_excluded: false,
    }),
  });
  assert.equal(privilege.status, 200);
  assert.equal(privilege.body.descriptor.search_index_allowed, true);

  const blockedRedaction = await json(`/api/vault/documents/${DOC_ID}/redactions?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      redactions: [{ redaction_id: "redaction-cmp-g5-runtime", page: 1, reason: "privilege" }],
      export_redacted: false,
    }),
  });
  assert.equal(blockedRedaction.status, 400);
  assert.ok(blockedRedaction.body.descriptor.blocked_claims.includes("dms_redacted_export_required"));

  const redaction = await json(`/api/vault/documents/${DOC_ID}/redactions?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      redactions: [{ redaction_id: "redaction-cmp-g5-runtime", page: 1, reason: "privilege" }],
      export_redacted: true,
    }),
  });
  assert.equal(redaction.status, 200);
  assert.equal(redaction.body.descriptor.redaction_receipt.original_bytes_exposed, false);

  const blockedLink = await json(`/api/vault/documents/${DOC_ID}/secure-links?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      expires_at: "2030-01-01T00:00:00.000Z",
      mfa_required: false,
      watermark_required: true,
    }),
  });
  assert.equal(blockedLink.status, 400);
  assert.ok(blockedLink.body.descriptor.blocked_claims.includes("dms_secure_link_mfa_required"));

  const link = await json(`/api/vault/documents/${DOC_ID}/secure-links?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      secure_link_id: "secure-link-cmp-g5-runtime",
      expires_at: "2030-01-01T00:00:00.000Z",
      mfa_required: true,
      watermark_required: true,
    }),
  });
  assert.equal(link.status, 201);
  assert.equal(link.body.secure_link.document_bytes_served, false);
});

test("CMP-G5 files email metadata and blocks Outlook credential leakage", async () => {
  const filing = await json(`/api/vault/email/filings?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      dms_document_ref: DOC_ID,
      email_thread: {
        email_thread_id: "email-thread-cmp-g5-runtime",
        matter_id: MATTER_ID,
        message_ids: ["message-cmp-g5-runtime"],
        subject: "CMP G5 runtime filing",
      },
    }),
  });
  assert.equal(filing.status, 201);
  assert.equal(filing.body.filing.email_filing_receipt.email_runtime_executed, false);

  const blockedOutlook = await json(`/api/vault/outlook/placeholders?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      placeholder_request: {
        placeholder_id: "outlook-placeholder-blocked",
        matter_id: MATTER_ID,
        access_token: "secret",
      },
    }),
  });
  assert.equal(blockedOutlook.status, 400);
  assert.ok(blockedOutlook.body.descriptor.blocked_claims.includes("dms_outlook_credential_leak_blocked"));

  const placeholder = await json(`/api/vault/outlook/placeholders?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      placeholder_request: {
        placeholder_id: "outlook-placeholder-cmp-g5-runtime",
        matter_id: MATTER_ID,
        document_id: DOC_ID,
      },
    }),
  });
  assert.equal(placeholder.status, 201);
  assert.equal(placeholder.body.placeholder.credentials_exposed, false);
});

test("CMP-G5 blocks search before permission evidence and hides unauthorized result counts", async () => {
  const blockedSearch = await json(`/api/vault/search?${query()}`, {
    method: "POST",
    body: JSON.stringify({ query: "Runtime" }),
  });
  assert.equal(blockedSearch.status, 400);
  assert.equal(blockedSearch.body.safe_error_code, "CMP_G5_PERMISSION_BEFORE_SEARCH_REQUIRED");

  const search = await json(`/api/vault/search?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      query: "Runtime",
      permission_decision_id: "permission-cmp-g5-search",
      permission_effect: "allow",
      denied_document_ids: ["doc-cmp-g5-denied"],
    }),
  });
  assert.equal(search.status, 200);
  assert.equal(search.body.permission_before_search_enforced, true);
  assert.equal(search.body.search.unauthorized_result_count_exposed, null);
  assert.ok(search.body.search.visible_results.some((result) => result.document_id === DOC_ID));
  assert.ok(search.body.tuw_ids.includes("CMP-G5-W05-T028"));
});

test("CMP-G5 UI state, audit coverage, runtime evidence, and audit preserve safety boundaries", async () => {
  const ui = await json(`/api/vault/documents/${DOC_ID}/ui-state?${query()}`);
  assert.equal(ui.status, 200);
  assert.equal(ui.body.ui_state.raw_storage_path_rendered, false);
  assert.equal(ui.body.ui_state.document_bytes_rendered, false);
  assert.equal(ui.body.ui_state.unauthorized_count_exposed, false);

  const auditCoverage = await json(`/api/vault/documents/${DOC_ID}/audit-coverage?${query()}`);
  assert.equal(auditCoverage.status, 200);
  assert.equal(auditCoverage.body.audit_coverage.audit_receipt.view_event_tested, true);
  assert.equal(auditCoverage.body.audit_coverage.audit_receipt.download_event_tested, true);
  assert.equal(auditCoverage.body.audit_coverage.audit_receipt.share_event_tested, true);
  assert.equal(auditCoverage.body.audit_coverage.sensitive_payload_exposed, false);

  const evidence = await json(`/api/vault/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G5");
  assert.equal(evidence.body.evidence.tuw_ids.length, 32);
  assert.equal(evidence.body.evidence.permission_before_search_enforced, true);
  assert.equal(evidence.body.evidence.raw_storage_path_exposed, false);
  assert.equal(evidence.body.evidence.document_bytes_exposed, false);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");

  const audit = await json(`/api/vault/audit?${query()}`);
  assert.equal(audit.status, 200);
  assert.equal(audit.body.verification.ok, true);
  assert.ok(audit.body.events.length >= 8);
  assert.ok(audit.body.events.every((event) => event.tenant_id === TENANT));
});
