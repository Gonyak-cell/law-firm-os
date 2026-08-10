import assert from "node:assert/strict";
import test from "node:test";
import { createMatterDocumentEmailBuilderService } from "../src/document-email-builder-service.js";
import {
  ACTOR_ID,
  approvedTemplate,
  canonicalInput,
  createApprovedDraft,
  createApprovePublish,
  FIXED_TIME,
  MATTER_ID,
  runtimeFixture,
  TENANT,
} from "./helpers/outm32-document-builder-fixture.js";

test("OUTM-32 owner approval finalizes one redacted immutable Vault artifact across restart", async () => {
  const fixture = runtimeFixture();
  const service = createMatterDocumentEmailBuilderService({
    repository: fixture.repository,
    dmsRuntime: fixture.dmsRuntime,
    templateVersions: [approvedTemplate()],
    clock: () => FIXED_TIME,
  });
  const { decided, published } = await createApprovePublish(service);
  assert.equal(decided.outcome, "approved");
  assert.equal(decided.approval_receipt.input_hash, published.artifact.input_hash);
  assert.equal(published.outcome, "created");
  assert.equal(published.idempotent_replay, false);
  assert.equal(published.publish_state.status, "complete");
  assert.equal(published.artifact.mime_type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.match(published.artifact.filename, /\.docx$/);
  assert.equal(published.artifact.document_bytes_included, false);
  assert.equal(JSON.stringify(published).includes("테스트 의뢰인"), false);
  assert.equal(JSON.stringify(published).includes("party:test-client"), false);
  for (const type of ["DmsDocument", "DmsDocumentVersion", "DmsFileObject"]) {
    assert.equal(fixture.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: type }).length, 1, type);
  }

  fixture.repository.close();
  fixture.dmsRuntime.repository.close();
  const reopened = fixture.reopen();
  const replayService = createMatterDocumentEmailBuilderService({
    repository: reopened.repository,
    dmsRuntime: reopened.dmsRuntime,
    templateVersions: [approvedTemplate()],
    clock: () => FIXED_TIME,
  });
  const replay = await replayService.publishBuilderDraftToVault({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_docx_001",
    actor_id: ACTOR_ID,
    idempotency_key: "publish-docx-001",
    occurred_at: FIXED_TIME,
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.idempotent_replay, true);
  for (const type of ["DmsDocument", "DmsDocumentVersion", "DmsFileObject"]) {
    assert.equal(reopened.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: type }).length, 1, type);
  }
});

test("OUTM-32 failed Vault finalization preserves approval and binds retry to actor and input", async () => {
  const fixture = runtimeFixture();
  let fail = true;
  const storage = Object.freeze({
    ...fixture.dmsRuntime.storage,
    putObject(input) {
      if (fail) { fail = false; throw new Error("synthetic Vault failure"); }
      return fixture.dmsRuntime.storage.putObject(input);
    },
  });
  const service = createMatterDocumentEmailBuilderService({
    repository: fixture.repository,
    dmsRuntime: { repository: fixture.dmsRuntime.repository, storage },
    templateVersions: [approvedTemplate()],
    clock: () => FIXED_TIME,
  });
  await assert.rejects(createApprovePublish(service, { publishKey: "publish-conflict-001" }), /Vault failure/);
  const draft = fixture.repository.get({ tenant_id: TENANT, model_type: "MatterBuilderDraft", resource_id: "builder_draft_docx_001" });
  assert.equal(draft.publish_state, "approved_unpublished");
  assert.equal(fixture.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
  await assert.rejects(
    service.publishBuilderDraftToVault({
      tenant_id: TENANT, matter_id: MATTER_ID, draft_id: draft.draft_id,
      actor_id: "different-owner", idempotency_key: "publish-conflict-001", occurred_at: FIXED_TIME,
    }),
    /idempotency/i,
  );

  service.patchBuilderDraft({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: draft.draft_id,
    actor_id: ACTOR_ID,
    occurred_at: "2026-08-08T00:01:00.000Z",
    patch: { merge_data: { ...canonicalInput().merge_data, matter_title: "변경된 Matter" } },
  });
  const requested = service.requestBuilderApproval({
    tenant_id: TENANT, matter_id: MATTER_ID, draft_id: draft.draft_id, actor_id: ACTOR_ID,
    idempotency_key: "request-approval-docx-002", occurred_at: "2026-08-08T00:02:00.000Z",
  });
  service.decideBuilderApproval({
    tenant_id: TENANT, matter_id: MATTER_ID, approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved", actor_id: ACTOR_ID, authorized_owner: true,
    idempotency_key: "approve-docx-002", occurred_at: "2026-08-08T00:03:00.000Z",
  });
  await assert.rejects(
    service.publishBuilderDraftToVault({
      tenant_id: TENANT, matter_id: MATTER_ID, draft_id: draft.draft_id, actor_id: ACTOR_ID,
      idempotency_key: "publish-conflict-001", occurred_at: "2026-08-08T00:04:00.000Z",
    }),
    /idempotency/i,
  );
});

test("OUTM-32 publish revalidates the exact owner approval receipt authority", async () => {
  const fixture = runtimeFixture();
  const service = createMatterDocumentEmailBuilderService({
    repository: fixture.repository,
    dmsRuntime: fixture.dmsRuntime,
    templateVersions: [approvedTemplate()],
    clock: () => FIXED_TIME,
  });
  const { requested } = createApprovedDraft(service);
  fixture.repository.update(
    {
      tenant_id: TENANT,
      model_type: "MatterBuilderApprovalRequest",
      resource_id: requested.approval_request.approval_request_id,
    },
    { decision_by: "tampered-owner" },
  );
  await assert.rejects(
    service.publishBuilderDraftToVault({
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      draft_id: "builder_draft_docx_001",
      actor_id: ACTOR_ID,
      idempotency_key: "publish-tampered-receipt",
      occurred_at: FIXED_TIME,
    }),
    /approval receipt/i,
  );
  assert.equal(fixture.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
});
