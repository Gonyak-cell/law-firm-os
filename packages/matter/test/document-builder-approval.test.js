import assert from "node:assert/strict";
import test from "node:test";
import { createMatterDocumentEmailBuilderService } from "../src/document-email-builder-service.js";
import { createMatterRepository } from "../src/repository.js";
import {
  ACTOR_ID,
  approvedTemplate,
  canonicalInput,
  FIXED_TIME,
  MATTER_ID,
  runtimeFixture,
  TENANT,
} from "./helpers/outm32-document-builder-fixture.js";

test("OUTM-32 keeps publish owner-blocked without approval, exact template, owner, or Vault", async () => {
  const repository = createMatterRepository();
  const service = createMatterDocumentEmailBuilderService({ repository, templateVersions: [approvedTemplate()], clock: () => FIXED_TIME });
  service.createBuilderDraft({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    actor_id: ACTOR_ID,
    occurred_at: FIXED_TIME,
    draft: {
      draft_id: "builder_draft_blocked",
      template_id: "matter_engagement_letter",
      template_version: "1.0.0-test",
      title: "승인 전 초안",
      merge_data: canonicalInput().merge_data,
      signer_role_refs: canonicalInput().signer_role_refs,
    },
  });
  const blocked = await service.publishBuilderDraftToVault({
    tenant_id: TENANT, matter_id: MATTER_ID, draft_id: "builder_draft_blocked",
    actor_id: ACTOR_ID, idempotency_key: "publish-blocked-001", occurred_at: FIXED_TIME,
  });
  assert.equal(blocked.outcome, "owner_blocked");
  assert.equal(blocked.publish_state.vault_document_created, false);

  const requested = service.requestBuilderApproval({
    tenant_id: TENANT, matter_id: MATTER_ID, draft_id: "builder_draft_blocked",
    actor_id: ACTOR_ID, idempotency_key: "request-approval-without-vault", occurred_at: FIXED_TIME,
  });
  service.decideBuilderApproval({
    tenant_id: TENANT, matter_id: MATTER_ID, approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved", actor_id: ACTOR_ID, authorized_owner: true,
    idempotency_key: "approve-without-vault", occurred_at: FIXED_TIME,
  });
  const noVault = await service.publishBuilderDraftToVault({
    tenant_id: TENANT, matter_id: MATTER_ID, draft_id: "builder_draft_blocked",
    actor_id: ACTOR_ID, idempotency_key: "publish-without-vault", occurred_at: FIXED_TIME,
  });
  assert.equal(noVault.outcome, "owner_blocked");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "MatterBuilderArtifact" }).length, 0);

  const withoutTemplate = createMatterDocumentEmailBuilderService({ repository: createMatterRepository(), clock: () => FIXED_TIME });
  assert.deepEqual(withoutTemplate.listDocumentTemplates({ tenant_id: TENANT }), []);
  assert.throws(
    () => withoutTemplate.createBuilderDraft({
      tenant_id: TENANT, matter_id: MATTER_ID, actor_id: ACTOR_ID, occurred_at: FIXED_TIME,
      draft: { template_id: "matter_engagement_letter", title: "승인 템플릿 없음" },
    }),
    /template_version is required/i,
  );
  assert.throws(
    () => service.createBuilderDraft({
      tenant_id: TENANT, matter_id: MATTER_ID, actor_id: ACTOR_ID, occurred_at: FIXED_TIME,
      draft: { template_id: "matter_engagement_letter", template_version: "9.9.9-missing", title: "없는 정확 버전" },
    }),
    /approved template version not found/i,
  );
  assert.throws(
    () => service.decideBuilderApproval({
      tenant_id: TENANT, matter_id: MATTER_ID, approval_request_id: "missing", decision: "approved",
      actor_id: "non-owner", authorized_owner: false, idempotency_key: "denied-owner", occurred_at: FIXED_TIME,
    }),
    /owner approval/i,
  );
});

test("OUTM-32 approval replay never rolls approved state back and binds the original actor", () => {
  const fixture = runtimeFixture();
  const service = createMatterDocumentEmailBuilderService({
    repository: fixture.repository,
    dmsRuntime: fixture.dmsRuntime,
    templateVersions: [approvedTemplate()],
    clock: () => FIXED_TIME,
  });
  service.createBuilderDraft({
    tenant_id: TENANT, matter_id: MATTER_ID, actor_id: ACTOR_ID, occurred_at: FIXED_TIME,
    draft: {
      draft_id: "builder_draft_replay", template_id: "matter_engagement_letter",
      template_version: "1.0.0-test", title: "승인 재생",
      merge_data: canonicalInput().merge_data, signer_role_refs: canonicalInput().signer_role_refs,
    },
  });
  const requestInput = {
    tenant_id: TENANT, matter_id: MATTER_ID, draft_id: "builder_draft_replay",
    actor_id: ACTOR_ID, idempotency_key: "request-replay-001", occurred_at: FIXED_TIME,
  };
  const first = service.requestBuilderApproval(requestInput);
  const beforeReplay = fixture.repository.snapshot();
  assert.equal(service.requestBuilderApproval(requestInput).outcome, "idempotent_replay");
  assert.deepEqual(fixture.repository.snapshot(), beforeReplay);
  assert.throws(() => service.requestBuilderApproval({ ...requestInput, actor_id: "different-owner" }), /idempotency/i);
  assert.deepEqual(fixture.repository.snapshot(), beforeReplay);

  service.decideBuilderApproval({
    tenant_id: TENANT, matter_id: MATTER_ID, approval_request_id: first.approval_request.approval_request_id,
    decision: "approved", actor_id: ACTOR_ID, authorized_owner: true,
    idempotency_key: "approve-replay-001", occurred_at: FIXED_TIME,
  });
  const approvedSnapshot = fixture.repository.snapshot();
  assert.equal(service.requestBuilderApproval(requestInput).outcome, "idempotent_replay");
  assert.deepEqual(fixture.repository.snapshot(), approvedSnapshot);
  assert.throws(() => service.requestBuilderApproval({ ...requestInput, idempotency_key: "request-replay-after-approval" }), /approved builder draft/i);
  assert.deepEqual(fixture.repository.snapshot(), approvedSnapshot);

  fixture.repository.close();
  const reopened = fixture.reopen();
  const restarted = createMatterDocumentEmailBuilderService({ repository: reopened.repository, dmsRuntime: reopened.dmsRuntime, clock: () => FIXED_TIME });
  const restartSnapshot = reopened.repository.snapshot();
  assert.equal(restarted.requestBuilderApproval(requestInput).outcome, "idempotent_replay");
  assert.deepEqual(reopened.repository.snapshot(), restartSnapshot);
  assert.equal(reopened.repository.get({ tenant_id: TENANT, model_type: "MatterBuilderDraft", resource_id: "builder_draft_replay" }).approval_state, "approved");
});
