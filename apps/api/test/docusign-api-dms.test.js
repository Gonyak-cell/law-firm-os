import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDocusignCompletionArtifactStore } from "../src/docusign-api.js";
import { createDmsRepository, createFileStorageAdapter, createHash, MATTER, TENANT, ACTOR } from "./docusign-api-fixtures.js";
import { createDocusignEnvelopeRepository } from "../../../packages/integrations-core/src/docusign-envelope-repository.js";

const SOURCE_SHA = "a".repeat(64);

function authorityFixture(requestId, kind, digest, overrides = {}, filePath = undefined) {
  const sourceDocument = { artifact_id: "builder-artifact-api", document_id: "document-api", version_id: "version-api", sha256: SOURCE_SHA, filename: "agreement.docx", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", workspace_id: "workspace-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", template_version: "template-v1", template_sha256: "b".repeat(64), input_sha256: "c".repeat(64), approval_receipt_ref: "approval-api", immutable: true, finalized: true, owner_approved: true };
  const operation = { kind: `ingest:${kind}`, permission_envelope_id: "permission-api", audit_trace_id: "audit-api", fencing_generation: 1, started_at: "2026-08-08T02:00:00.000Z", lease_expires_at: "2026-08-08T04:00:00.000Z", idempotency_key: `docusign-completion:${requestId}:${kind}:${digest}`, object_id: `object:version:docusign-completion:${requestId}:${kind}:1`, sha256: digest, status: "pending" };
  const request = { request_id: requestId, tenant_id: TENANT, matter_id: MATTER, connection_id: "docusign-primary", account_binding_ref: "account-api", document: sourceDocument, recipient_snapshot: [{ recipient_ref: "contact-api", role: "client", routing_order: 1 }], anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] }, idempotency_key: `queue:${requestId}`, payload_sha256: "d".repeat(64), provider_correlation_ref: `docusign-request:${requestId}`, requested_by_actor_id: ACTOR, state: "completed_artifacts_pending", attempt_phase: "completion_ingesting", envelope_id: "envelope-api", completion_operation: operation, completion_artifacts: { signed_pdf: null, certificate: null }, audit_lineage: [], event_hashes: [], created_at: "2026-08-08T02:00:00.000Z", updated_at: "2026-08-08T02:00:00.000Z" };
  const authorityRepository = createDocusignEnvelopeRepository({ filePath, state: { requests: [{ ...request, ...overrides }], webhook_receipts: [] } });
  if (filePath) authorityRepository.replaceState(authorityRepository.loadState());
  return { authorityRepository, source: { authority: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", artifact_id: sourceDocument.artifact_id, document_id: sourceDocument.document_id, version_id: sourceDocument.version_id, sha256: sourceDocument.sha256, approval_receipt_ref: sourceDocument.approval_receipt_ref, permission_envelope_id: sourceDocument.permission_envelope_id, audit_trace_id: sourceDocument.audit_trace_id }, document: sourceDocument, recipients: request.recipient_snapshot, anchor_manifest: request.anchor_manifest }, expected: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", request_id: requestId, kind, sha256: digest, permission_envelope_id: "permission-api", audit_trace_id: "audit-api", fencing_generation: 1, idempotency_key: operation.idempotency_key, object_id: operation.object_id } };
}

function completionInput(requestId, digest, bytes) {
  return { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", artifact_id: "builder-artifact-api", document_id: "document-api", version_id: "version-api", approval_receipt_ref: "approval-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", requested_by_actor_id: ACTOR, request_id: requestId, envelope_id: "envelope-api", kind: "signed_pdf", title: "agreement - signed.pdf", mime_type: "application/pdf", bytes, sha256: digest };
}

test("OUTM-34 completion artifact constructor fails closed without approved authority", () => {
  assert.throws(() => createDocusignCompletionArtifactStore({ dmsRuntime: { repository: createDmsRepository(), storage: createFileStorageAdapter({ rootPath: join(tmpdir(), "outm34-constructor") }) } }), /approvedDocumentResolver is required/u);
});

test("OUTM-34 DMS completion boundary writes an idempotent immutable PDF version with matching SHA", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-dms-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repository = createDmsRepository();
  const storage = createFileStorageAdapter({ rootPath: join(dir, "objects") });
  const bytes = Buffer.from("signed-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const authority = authorityFixture("request-api", "signed_pdf", digest);
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository, storage }, authorityRepository: authority.authorityRepository, approvedDocumentResolver: async () => authority.source });
  const input = completionInput("request-api", digest, bytes);
  const first = await artifactStore.ingest(input, { expected_authority: authority.expected });
  assert.deepEqual(first, await artifactStore.ingest(input, { expected_authority: authority.expected }));
  assert.equal(first.immutable, true);
  assert.equal(first.sha256, digest);
  const versions = repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion", document_id: first.document_id });
  assert.deepEqual([versions.length, versions[0].sha256, storage.getObject({ tenant_id: TENANT, object_id: `vault:${TENANT}:${MATTER}:${first.document_id}:${first.version_id}` }).sha256], [1, digest, digest]);
});

test("OUTM-34 authority drift after approved read is rejected before local DMS storage", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-dms-fence-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repository = createDmsRepository();
  const storage = createFileStorageAdapter({ rootPath: join(dir, "objects") });
  const bytes = Buffer.from("fenced-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const authority = authorityFixture("request-fenced", "signed_pdf", digest);
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let firstResolver = true;
  const approvedDocumentResolver = async () => {
    if (firstResolver) {
      firstResolver = false;
      const current = authority.authorityRepository.loadState().requests[0];
      authority.authorityRepository.replaceState({ requests: [{ ...current, document: { ...current.document, permission_envelope_id: "permission-drift", audit_trace_id: "audit-drift" } }], webhook_receipts: [] });
      entered();
      await releasePromise;
    }
    return authority.source;
  };
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository, storage }, authorityRepository: authority.authorityRepository, approvedDocumentResolver });
  const input = completionInput("request-fenced", digest, bytes);
  const ingest = artifactStore.ingest(input, { expected_authority: authority.expected });
  await enteredPromise;
  release();
  await assert.rejects(ingest, (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED");
  assert.deepEqual([repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length], [0, 0]);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: `vault:${TENANT}:${MATTER}:docusign-completion:${input.request_id}:${input.kind}:version:docusign-completion:${input.request_id}:${input.kind}:1` }), null);
});

test("OUTM-34 shared file authority lock spans async callback and releases after rejection", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-lock-barrier-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const authorityPath = join(dir, "docusign-outbox.json");
  const bytes = Buffer.from("lock-barrier-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const authority = authorityFixture("request-lock", "signed_pdf", digest, {}, authorityPath);
  const peer = createDocusignEnvelopeRepository({ filePath: authorityPath });
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let peerEntered = false;
  const first = authority.authorityRepository.withCompletionAuthority({ expected: authority.expected }, async () => {
    entered();
    await releasePromise;
    return "first";
  });
  await enteredPromise;
  const second = peer.withCompletionAuthority({ expected: authority.expected }, async () => {
    peerEntered = true;
    return "second";
  });
  await Promise.resolve();
  assert.equal(peerEntered, false);
  release();
  assert.deepEqual(await Promise.all([first, second]), ["first", "second"]);
  const safe = Object.assign(new Error("authority callback rejected"), { safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED" });
  await assert.rejects(authority.authorityRepository.withCompletionAuthority({ expected: authority.expected }, async () => { throw safe; }), (error) => error === safe);
  assert.equal(await peer.withCompletionAuthority({ expected: authority.expected }, async () => "after-rejection"), "after-rejection");
});

test("OUTM-34 shared file barrier inside storage.putObject fails closed with zero DMS writes", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-storage-barrier-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const authorityPath = join(dir, "docusign-outbox.json");
  const storageRoot = join(dir, "objects");
  const bytes = Buffer.from("storage-barrier-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const authority = authorityFixture("request-storage-barrier", "signed_pdf", digest, {}, authorityPath);
  const peer = createDocusignEnvelopeRepository({ filePath: authorityPath });
  const dmsRepository = createDmsRepository();
  const baseStorage = createFileStorageAdapter({ rootPath: storageRoot });
  let storageCalls = 0;
  const storage = Object.freeze({
    ...baseStorage,
    putObject(input) {
      storageCalls += 1;
      const current = peer.loadState().requests[0];
      peer.replaceState({ requests: [{ ...current, document: { ...current.document, permission_envelope_id: "permission-storage-drift", audit_trace_id: "audit-storage-drift" }, completion_operation: { ...current.completion_operation, fencing_generation: 2 } }], webhook_receipts: [] });
      throw Object.assign(new Error("authority changed inside storage.putObject"), { safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED" });
    },
  });
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository: dmsRepository, storage }, authorityRepository: authority.authorityRepository, approvedDocumentResolver: async () => authority.source });
  const input = completionInput("request-storage-barrier", digest, bytes);
  await assert.rejects(artifactStore.ingest(input, { expected_authority: authority.expected }), (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED");
  assert.equal(storageCalls, 1);
  assert.deepEqual([
    dmsRepository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length,
    dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length,
    dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length,
    dmsRepository.listAudit({ tenant_id: TENANT }).length,
    baseStorage.statObject({ tenant_id: TENANT, object_id: `vault:${TENANT}:${MATTER}:docusign-completion:${input.request_id}:${input.kind}:version:docusign-completion:${input.request_id}:${input.kind}:1` }),
  ], [0, 0, 0, 0, null]);
  const drifted = authority.authorityRepository.loadState().requests[0];
  assert.deepEqual([drifted.document.permission_envelope_id, drifted.document.audit_trace_id, drifted.completion_operation?.fencing_generation], ["permission-storage-drift", "audit-storage-drift", 2]);
});
