import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPostgresDmsUploadRuntime } from "../../dms/src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../../dms/src/storage/local-storage-adapter.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createApprovedDocumentTemplateVersion } from "../src/agreement-docx.js";
import { createMatterDocumentEmailBuilderService } from "../src/document-email-builder-service.js";
import { persistMatterVaultLink } from "../src/matter-vault-link-repository.js";
import { createMatterRepository } from "../src/repository.js";

const TENANT = "tenant_outm32_postgres";
const MATTER = "matter_outm32_postgres";
const ACTOR = "owner_outm32_postgres";
const AT = "2026-08-08T02:00:00.000Z";
const DRAFT = "builder_draft_outm32_postgres";

function template() {
  return createApprovedDocumentTemplateVersion({
    tenant_id: TENANT,
    template_id: "matter_engagement_letter",
    template_version: "postgres-1.0.0",
    label: "위임계약서",
    status: "approved",
    merge_schema: [{ key: "client_name", required: true, max_length: 120 }],
    signer_roles: [{ role_id: "client", required: true }],
    content: [
      { type: "paragraph", style: "body", runs: [{ merge_field: "client_name" }] },
      { type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" },
    ],
    approval_receipt: { receipt_id: "template-approval:postgres:1", approved_by_ref: "template-owner:postgres", approved_at: AT },
  });
}

function approve(service) {
  service.createBuilderDraft({
    tenant_id: TENANT, matter_id: MATTER, actor_id: ACTOR, occurred_at: AT,
    draft: {
      draft_id: DRAFT, template_id: "matter_engagement_letter", template_version: "postgres-1.0.0",
      title: "PostgreSQL 복구 문서", merge_data: { client_name: "비공개 의뢰인" },
      signer_role_refs: [{ role_id: "client", party_ref: "party:postgres-private" }],
    },
  });
  const requested = service.requestBuilderApproval({ tenant_id: TENANT, matter_id: MATTER, draft_id: DRAFT, actor_id: ACTOR, idempotency_key: "request-postgres-reconcile", occurred_at: AT });
  service.decideBuilderApproval({
    tenant_id: TENANT, matter_id: MATTER,
    approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved", actor_id: ACTOR, authorized_owner: true,
    idempotency_key: "approve-postgres-reconcile", occurred_at: AT,
  });
}

test("OUTM-32 PostgreSQL upload receipt survives Matter commit failure and restart reconciliation", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  assert.ok(fixture, "PostgreSQL fixture is required for OUTM-32 reconciliation evidence");
  const root = mkdtempSync(join(tmpdir(), "outm32-postgres-reconcile-"));
  const matterPath = join(root, "matter.json");
  const base = createMatterRepository({ filePath: matterPath });
  persistMatterVaultLink({
    repository: base,
    link: {
      tenant_id: TENANT, matter_id: MATTER, vault_workspace_id: "workspace_outm32_postgres",
      default_folder_id: "folder_outm32_postgres", permission_envelope_id: "permission_outm32_postgres",
      source_transaction_id: "transaction_outm32_postgres", audit_event_id: "audit_outm32_postgres",
      created_by_actor_id: ACTOR, created_at: AT,
    },
  });
  const uploadRuntime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage: createLocalStorageAdapter({ adapter_id: "outm32-postgres" }),
    clock: () => new Date(AT),
    workerId: "outm32-postgres-worker",
  });
  let failMarkerUpdate = false;
  const faultingRepository = Object.freeze({
    ...base,
    update(ref, patch) {
      if (failMarkerUpdate && ref.model_type === "MatterBuilderPublicationReconciliation" && patch.status === "reconciliation_required") {
        failMarkerUpdate = false;
        throw Object.assign(new Error("injected reconciliation marker failure"), { code: "OUTM32_MARKER_FAILED" });
      }
      return base.update(ref, patch);
    },
  });
  const service = createMatterDocumentEmailBuilderService({
    repository: faultingRepository,
    dmsRuntime: { upload_runtime: uploadRuntime },
    templateVersions: [template()],
    clock: () => AT,
  });
  approve(service);
  failMarkerUpdate = true;
  const publishInput = { tenant_id: TENANT, matter_id: MATTER, draft_id: DRAFT, actor_id: ACTOR, idempotency_key: "publish-postgres-reconcile", occurred_at: AT };
  await assert.rejects(service.publishBuilderDraftToVault(publishInput), (error) => error?.code === "MATTER_PUBLICATION_RECONCILIATION_REQUIRED");

  const reconciliation = base.list({ tenant_id: TENANT, model_type: "MatterBuilderPublicationReconciliation" })[0];
  assert.equal(reconciliation.status, "reconciliation_required");
  assert.equal(reconciliation.observed_upload_identity.upload_session_id, reconciliation.upload_session_id);
  assert.equal(reconciliation.observed_upload_identity.document_id, reconciliation.document_id);
  assert.equal(reconciliation.observed_upload_identity.version_id, reconciliation.version_id);
  assert.equal(reconciliation.observed_upload_identity.file_object_id, reconciliation.file_object_id);
  assert.equal(reconciliation.observed_upload_identity.sha256, reconciliation.sha256);
  assert.equal((await uploadRuntime.getUploadSession({ tenant_id: TENANT, session_id: reconciliation.upload_session_id })).state, "finalized");
  assert.equal((await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: reconciliation.document_id })).versions.length, 1);
  for (const type of ["MatterBuilderArtifact", "MatterBuilderPublishOutbox", "MatterBuilderPublishAttempt"]) {
    assert.equal(base.list({ tenant_id: TENANT, model_type: type }).length, 0, type);
  }
  assert.equal(base.getIdempotency({ tenant_id: TENANT, idempotency_key: publishInput.idempotency_key }), undefined);
  const beforeForeignKey = base.snapshot();
  await assert.rejects(
    service.reconcileBuilderPublication({ ...publishInput, idempotency_key: "publish-postgres-foreign-key" }),
    (error) => error?.code === "MATTER_IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual(base.snapshot(), beforeForeignKey);

  base.close();
  const commitFailureBase = createMatterRepository({ filePath: matterPath });
  let transactionCount = 0;
  const commitFailureRepository = Object.freeze({
    ...commitFailureBase,
    transaction(callback) {
      transactionCount += 1;
      if (transactionCount === 2) {
        throw Object.assign(new Error("injected Matter publication commit failure"), { code: "OUTM32_MATTER_COMMIT_FAILED" });
      }
      return commitFailureBase.transaction(callback);
    },
  });
  const commitFailureService = createMatterDocumentEmailBuilderService({ repository: commitFailureRepository, dmsRuntime: { upload_runtime: uploadRuntime }, clock: () => AT });
  await assert.rejects(commitFailureService.reconcileBuilderPublication(publishInput), (error) => error?.code === "MATTER_PUBLICATION_RECONCILIATION_REQUIRED");
  assert.equal(commitFailureBase.list({ tenant_id: TENANT, model_type: "MatterBuilderPublicationReconciliation" })[0].status, "reconciliation_required");
  assert.equal(commitFailureBase.list({ tenant_id: TENANT, model_type: "MatterBuilderArtifact" }).length, 0);
  commitFailureBase.close();

  const reopened = createMatterRepository({ filePath: matterPath });
  const restarted = createMatterDocumentEmailBuilderService({ repository: reopened, dmsRuntime: { upload_runtime: uploadRuntime }, clock: () => AT });
  const recovered = await restarted.reconcileBuilderPublication(publishInput);
  assert.equal(recovered.outcome, "idempotent_replay");
  assert.equal(recovered.idempotent_replay, true);
  assert.equal(recovered.artifact.document_id, reconciliation.document_id);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "MatterBuilderArtifact" }).length, 1);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "MatterBuilderPublishOutbox" }).length, 1);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "MatterBuilderPublishAttempt" }).length, 1);
  assert.equal(reopened.listAudit({ tenant_id: TENANT, object_id: recovered.artifact.artifact_id }).length, 1);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "MatterTimelineEvent" }).filter((item) => item.type === "matter.builder.docx.finalized").length, 1);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: publishInput.idempotency_key }).request_fingerprint.length, 64);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "MatterBuilderPublicationReconciliation" })[0].status, "complete");
  const state = await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: reconciliation.document_id });
  assert.equal(state.versions.length, 1);
  assert.equal(state.file_objects.length, 1);
});
