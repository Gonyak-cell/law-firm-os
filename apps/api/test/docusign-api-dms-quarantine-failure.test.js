import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createDocusignCompletionArtifactStore } from "../src/docusign-api.js";
import { createDmsRepository, createFileStorageAdapter, MATTER, TENANT, ACTOR } from "./docusign-api-fixtures.js";
import { createDocusignEnvelopeRepository } from "../../../packages/integrations-core/src/docusign-envelope-repository.js";

const SOURCE_SHA = "a".repeat(64);

async function authorityFixture(requestId, digest, filePath) {
  const sourceDocument = {
    artifact_id: "builder-artifact-quarantine",
    document_id: "document-quarantine",
    version_id: "version-quarantine",
    sha256: SOURCE_SHA,
    filename: "agreement.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    workspace_id: "workspace-api",
    permission_envelope_id: "permission-api",
    audit_trace_id: "audit-api",
    template_version: "template-v1",
    template_sha256: "b".repeat(64),
    input_sha256: "c".repeat(64),
    approval_receipt_ref: "approval-api",
    immutable: true,
    finalized: true,
    owner_approved: true,
  };
  const operation = {
    kind: "ingest:signed_pdf",
    permission_envelope_id: "permission-api",
    audit_trace_id: "audit-api",
    fencing_generation: 1,
    started_at: "2026-08-08T02:00:00.000Z",
    lease_expires_at: "2026-08-08T04:00:00.000Z",
    idempotency_key: `docusign-completion:${requestId}:signed_pdf:${digest}`,
    object_id: `object:version:docusign-completion:${requestId}:signed_pdf:1`,
    sha256: digest,
    status: "pending",
  };
  const request = {
    request_id: requestId,
    tenant_id: TENANT,
    matter_id: MATTER,
    connection_id: "docusign-primary",
    account_binding_ref: "account-api",
    document: sourceDocument,
    recipient_snapshot: [{ recipient_ref: "contact-api", role: "client", routing_order: 1 }],
    anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
    idempotency_key: `queue:${requestId}`,
    payload_sha256: "d".repeat(64),
    provider_correlation_ref: `docusign-request:${requestId}`,
    requested_by_actor_id: ACTOR,
    state: "completed_artifacts_pending",
    attempt_phase: "completion_ingesting",
    envelope_id: "envelope-api",
    completion_operation: operation,
    completion_artifacts: { signed_pdf: null, certificate: null },
    audit_lineage: [],
    event_hashes: [],
    created_at: "2026-08-08T02:00:00.000Z",
    updated_at: "2026-08-08T02:00:00.000Z",
  };
  const authorityRepository = createDocusignEnvelopeRepository({ filePath, state: { requests: [request], webhook_receipts: [] } });
  await authorityRepository.replaceState(authorityRepository.loadState());
  return {
    authorityRepository,
    source: {
      authority: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", artifact_id: sourceDocument.artifact_id, document_id: sourceDocument.document_id, version_id: sourceDocument.version_id, sha256: sourceDocument.sha256, approval_receipt_ref: sourceDocument.approval_receipt_ref, permission_envelope_id: sourceDocument.permission_envelope_id, audit_trace_id: sourceDocument.audit_trace_id },
      document: sourceDocument,
      recipients: request.recipient_snapshot,
      anchor_manifest: request.anchor_manifest,
    },
    expected: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", request_id: requestId, kind: "signed_pdf", sha256: digest, permission_envelope_id: "permission-api", audit_trace_id: "audit-api", fencing_generation: 1, idempotency_key: operation.idempotency_key, object_id: operation.object_id },
  };
}

function completionInput(requestId, digest, bytes) {
  return { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", artifact_id: "builder-artifact-quarantine", document_id: "document-quarantine", version_id: "version-quarantine", approval_receipt_ref: "approval-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", requested_by_actor_id: ACTOR, request_id: requestId, envelope_id: "envelope-api", kind: "signed_pdf", title: "agreement - signed.pdf", mime_type: "application/pdf", bytes, sha256: digest };
}

test("OUTM-34 both local cleanup paths fail closed with durable quarantine and later convergence", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-durable-quarantine-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const authorityPath = join(dir, "docusign-outbox.json");
  const authorityAlias = join(dir, "docusign-outbox-alias.json");
  const storageRoot = join(dir, "objects");
  const bytes = Buffer.from("durable-quarantine-cleanup-failure-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const authority = await authorityFixture("request-durable-quarantine", digest, authorityPath);
  symlinkSync(authorityPath, authorityAlias);
  const peer = createDocusignEnvelopeRepository({ filePath: authorityAlias });
  const dmsRepository = createDmsRepository();
  const baseStorage = createFileStorageAdapter({ rootPath: storageRoot });
  const childRepositoryModule = fileURLToPath(new URL("../../../packages/integrations-core/src/docusign-envelope-repository.js", import.meta.url));
  const childMutation = `import { createDocusignEnvelopeRepository } from ${JSON.stringify(childRepositoryModule)}; const repository = createDocusignEnvelopeRepository({ filePath: process.argv[1] }); const state = repository.loadState(); const current = state.requests[0]; await repository.replaceState({ requests: [{ ...current, document: { ...current.document, permission_envelope_id: "permission-durable-drift", audit_trace_id: "audit-durable-drift" }, completion_operation: { ...current.completion_operation, fencing_generation: 2 } }], webhook_receipts: [] });`;
  const storage = Object.freeze({
    ...baseStorage,
    putObject(input) {
      const receipt = baseStorage.putObject(input);
      const child = spawnSync(process.execPath, ["--input-type=module", "-e", childMutation, authorityAlias], { encoding: "utf8" });
      assert.equal(child.status, 0, child.stderr);
      assert.equal(peer.loadState().requests[0].document.permission_envelope_id, "permission-durable-drift");
      return receipt;
    },
    deleteCommittedObject() {
      throw Object.assign(new Error("committed delete unavailable"), { safe_error_code: "DMS_TEST_COMMITTED_DELETE_UNAVAILABLE" });
    },
    quarantineCommittedObject() {
      throw Object.assign(new Error("committed quarantine unavailable"), { safe_error_code: "DMS_TEST_COMMITTED_QUARANTINE_UNAVAILABLE" });
    },
  });
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository: dmsRepository, storage }, authorityRepository: authority.authorityRepository, approvedDocumentResolver: async () => authority.source });
  const input = completionInput("request-durable-quarantine", digest, bytes);
  await assert.rejects(artifactStore.ingest(input, { expected_authority: authority.expected }), (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED"
    && error?.cleanup_state === "durably_quarantined"
    && error?.cleanup_error_code === "DMS_TEST_COMMITTED_QUARANTINE_UNAVAILABLE"
    && typeof error?.cleanup_record_ref === "string");
  const objectId = `vault:${TENANT}:${MATTER}:docusign-completion:${input.request_id}:${input.kind}:version:docusign-completion:${input.request_id}:${input.kind}:1`;
  assert.deepEqual([
    dmsRepository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length,
    dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length,
    dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length,
    dmsRepository.listAudit({ tenant_id: TENANT }).length,
  ], [0, 0, 0, 0]);
  const committedBytes = readdirSync(storageRoot).filter((name) => name.endsWith(".bin"));
  assert.equal(committedBytes.length, 1);
  assert.deepEqual(readFileSync(join(storageRoot, committedBytes[0])), bytes);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: objectId }), null);
  assert.throws(() => storage.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
  const record = storage.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: objectId });
  assert.deepEqual([record.schema_version, record.state, record.tenant_id, record.object_id, record.expected_sha256, record.audit_trace_id, record.permission_envelope_id], ["law-firm-os.dms-object-quarantine.v1", "quarantined", TENANT, objectId, digest, "audit-api", "permission-api"]);
  const restarted = createFileStorageAdapter({ rootPath: storageRoot });
  assert.deepEqual(restarted.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: objectId }), record);
  assert.equal(restarted.statObject({ tenant_id: TENANT, object_id: objectId }), null);
  assert.throws(() => restarted.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
  assert.equal(restarted.quarantineCommittedObject({ tenant_id: TENANT, object_id: objectId, expected_sha256: digest }).quarantined, true);
  assert.equal(readdirSync(storageRoot).some((name) => name.endsWith(".bin")), false);
  assert.equal(restarted.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: objectId }).state, "quarantined");
  assert.throws(() => restarted.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
});
