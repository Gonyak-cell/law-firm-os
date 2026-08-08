import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createDocusignCompletionArtifactStore } from "../src/docusign-api.js";
import { createPostgresDocusignEnvelopeRepository } from "../../../packages/integrations-core/src/docusign-postgres-repository.js";
import { normalizeDocusignOutboxState } from "../../../packages/integrations-core/src/docusign-envelope-model.js";
import { createPostgresDmsUploadRuntime, createLocalStorageAdapter } from "../../../packages/dms/src/index.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";

const TENANT = "tenant-docusign-completion-pg";
const MATTER = "matter-docusign-completion-pg";
const ACTOR = "actor-docusign-completion-pg";
const SOURCE_SHA = "a".repeat(64);
const SOURCE_DOCUMENT = Object.freeze({ artifact_id: "builder-artifact-pg", document_id: "document-pg", version_id: "version-pg", sha256: SOURCE_SHA, filename: "agreement.docx", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", workspace_id: "workspace-pg", permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg", template_version: "template-v1", template_sha256: "b".repeat(64), input_sha256: "c".repeat(64), approval_receipt_ref: "approval-pg", immutable: true, finalized: true, owner_approved: true });
const APPROVED_SOURCE = Object.freeze({ authority: { tenant_id: TENANT, matter_id: MATTER, workspace_id: SOURCE_DOCUMENT.workspace_id, artifact_id: SOURCE_DOCUMENT.artifact_id, document_id: SOURCE_DOCUMENT.document_id, version_id: SOURCE_DOCUMENT.version_id, sha256: SOURCE_DOCUMENT.sha256, approval_receipt_ref: SOURCE_DOCUMENT.approval_receipt_ref, permission_envelope_id: SOURCE_DOCUMENT.permission_envelope_id, audit_trace_id: SOURCE_DOCUMENT.audit_trace_id }, document: SOURCE_DOCUMENT, recipients: [{ recipient_ref: "contact-pg", role: "client", routing_order: 1 }], anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] } });

function authorityRequest(requestId, kind, digest) {
  return {
    request_id: requestId, tenant_id: TENANT, matter_id: MATTER, connection_id: "docusign-primary", account_binding_ref: "account-pg", document: SOURCE_DOCUMENT,
    recipient_snapshot: APPROVED_SOURCE.recipients, anchor_manifest: APPROVED_SOURCE.anchor_manifest, idempotency_key: `queue:${requestId}`, payload_sha256: "d".repeat(64), provider_correlation_ref: `docusign-request:${requestId}`, requested_by_actor_id: ACTOR,
    state: "completed_artifacts_pending", attempt_phase: "completion_ingesting", envelope_id: "envelope-pg", completion_operation: { kind: `ingest:${kind}`, permission_envelope_id: SOURCE_DOCUMENT.permission_envelope_id, audit_trace_id: SOURCE_DOCUMENT.audit_trace_id, fencing_generation: 1, started_at: "2026-08-08T02:00:00.000Z", lease_expires_at: "2026-08-08T04:00:00.000Z", idempotency_key: `docusign-completion:${requestId}:${kind}:${digest}`, object_id: `object:version:docusign-completion:${requestId}:${kind}:1`, sha256: digest, status: "pending" },
    completion_artifacts: { signed_pdf: null, certificate: null }, audit_lineage: [], event_hashes: [], created_at: "2026-08-08T02:00:00.000Z", updated_at: "2026-08-08T02:00:00.000Z",
  };
}

test("OUTM-34 PostgreSQL metadata transaction fences authority drift before DMS rows", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityRepository = createPostgresDocusignEnvelopeRepository({ pool: fixture.appPool });
  const bytes = Buffer.from("postgres-fenced-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const requestId = "request-pg-fenced";
  const kind = "signed_pdf";
  await authorityRepository.transact({ tenant_id: TENANT }, (state) => {
    state.requests.push(authorityRequest(requestId, kind, digest));
  });
  const storage = createLocalStorageAdapter({ adapter_id: "docusign-pg-fence" });
  const uploadRuntime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date("2026-08-08T02:00:00.000Z") });
  let metadataEntered;
  const metadataEnteredPromise = new Promise((resolve) => { metadataEntered = resolve; });
  let releaseMetadata;
  const metadataRelease = new Promise((resolve) => { releaseMetadata = resolve; });
  let drifted = false;
  const approvedDocumentResolver = async ({ phase } = {}) => {
    if (phase === "before_metadata" && !drifted) {
      drifted = true;
      await authorityRepository.transact({ tenant_id: TENANT }, (state) => {
        const current = state.requests[0];
        state.requests[0] = { ...current, document: { ...current.document, permission_envelope_id: "permission-pg-drift", audit_trace_id: "audit-pg-drift" } };
      });
      metadataEntered();
      await metadataRelease;
    }
    return APPROVED_SOURCE;
  };
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { upload_runtime: uploadRuntime }, authorityRepository, approvedDocumentResolver });
  const input = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-pg", artifact_id: SOURCE_DOCUMENT.artifact_id, document_id: SOURCE_DOCUMENT.document_id, version_id: SOURCE_DOCUMENT.version_id, approval_receipt_ref: SOURCE_DOCUMENT.approval_receipt_ref, permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg", requested_by_actor_id: ACTOR, request_id: requestId, envelope_id: "envelope-pg", kind, title: "agreement - signed.pdf", mime_type: "application/pdf", bytes, sha256: digest };
  const expected = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-pg", request_id: requestId, kind, sha256: digest, permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg", fencing_generation: 1, idempotency_key: `docusign-completion:${requestId}:${kind}:${digest}`, object_id: `object:version:docusign-completion:${requestId}:${kind}:1` };
  const ingest = artifactStore.ingest(input, { expected_authority: expected });
  await metadataEnteredPromise;
  releaseMetadata();
  await assert.rejects(ingest, (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED");
  const state = await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: `docusign-completion:${requestId}:${kind}` });
  assert.equal(state, null);
  const rows = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query("SELECT (SELECT count(*) FROM lawos_dms.documents WHERE tenant_id = $1)::int AS documents, (SELECT count(*) FROM lawos_dms.document_versions WHERE tenant_id = $1)::int AS versions, (SELECT count(*) FROM lawos_dms.file_objects WHERE tenant_id = $1)::int AS files, (SELECT count(*) FROM lawos_dms.audit_events WHERE tenant_id = $1 AND object_id = $2)::int AS audits", [TENANT, `docusign-completion:${requestId}:${kind}`]));
  assert.deepEqual(rows.rows[0], { documents: 0, versions: 0, files: 0, audits: 0 });
});

test("OUTM-34 PostgreSQL completion readback is deterministic after restart-shaped authority state", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityRepository = createPostgresDocusignEnvelopeRepository({ pool: fixture.appPool });
  const bytes = Buffer.from("postgres-readback-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const requestId = "request-pg-readback";
  const kind = "signed_pdf";
  await authorityRepository.transact({ tenant_id: TENANT }, (state) => { state.requests.push(authorityRequest(requestId, kind, digest)); });
  const storage = createLocalStorageAdapter({ adapter_id: "docusign-pg-readback" });
  const uploadRuntime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date("2026-08-08T02:00:00.000Z") });
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { upload_runtime: uploadRuntime }, authorityRepository, approvedDocumentResolver: async () => APPROVED_SOURCE });
  const input = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-pg", artifact_id: SOURCE_DOCUMENT.artifact_id, document_id: SOURCE_DOCUMENT.document_id, version_id: SOURCE_DOCUMENT.version_id, approval_receipt_ref: SOURCE_DOCUMENT.approval_receipt_ref, permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg", requested_by_actor_id: ACTOR, request_id: requestId, envelope_id: "envelope-pg", kind, title: "agreement - signed.pdf", mime_type: "application/pdf", bytes, sha256: digest };
  const expected = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-pg", request_id: requestId, kind, sha256: digest, permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg", fencing_generation: 1, idempotency_key: `docusign-completion:${requestId}:${kind}:${digest}`, object_id: `object:version:docusign-completion:${requestId}:${kind}:1` };
  const stored = await artifactStore.ingest(input, { expected_authority: expected });
  const restartedAuthorityRepository = createPostgresDocusignEnvelopeRepository({ pool: fixture.appPool });
  const restartedUploadRuntime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date("2026-08-08T02:00:00.000Z") });
  const restartedArtifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { upload_runtime: restartedUploadRuntime }, authorityRepository: restartedAuthorityRepository, approvedDocumentResolver: async () => APPROVED_SOURCE });
  const readback = await restartedArtifactStore.readback(input);
  assert.deepEqual([stored.document_id, stored.version_id, readback?.document_id, readback?.version_id, readback?.sha256], [readback?.document_id, readback?.version_id, readback?.document_id, readback?.version_id, digest]);
});
