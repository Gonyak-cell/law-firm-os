import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import { createApprovedDocumentTemplateVersion } from "../../../packages/matter/src/agreement-docx.js";
import { persistMatterVaultLink } from "../../../packages/matter/src/matter-vault-link-repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const TENANT = "tenant_outm32_api";
const MATTER = "matter_outm32_api";
const ACTOR = "owner_outm32_api";
const AT = "2026-08-08T01:00:00.000Z";
const context = Object.freeze({
  principal: Object.freeze({ user_id: ACTOR, tenant_id: TENANT, role_ids: Object.freeze(["tenant_owner"]) }),
  rules: Object.freeze([{ id: "outm32-allow", effect: "allow", action: "*" }]),
  object_acl: Object.freeze([]),
});

function template() {
  return createApprovedDocumentTemplateVersion({
    tenant_id: TENANT,
    template_id: "matter_engagement_letter",
    template_version: "api-1.0.0",
    label: "위임계약서",
    status: "approved",
    merge_schema: [
      { key: "client_name", required: true, max_length: 120 },
      { key: "matter_title", required: true, max_length: 160 },
    ],
    signer_roles: [{ role_id: "client", required: true }],
    content: [
      { type: "paragraph", style: "title", runs: [{ literal: "위임계약서" }] },
      { type: "paragraph", style: "body", runs: [{ merge_field: "client_name" }, { literal: " / " }, { merge_field: "matter_title" }] },
      { type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" },
    ],
    approval_receipt: {
      receipt_id: "template-approval:outm32-api:1",
      approved_by_ref: "template-owner:outm32-api",
      approved_at: AT,
    },
    synthetic_only: true,
  });
}

function runtime() {
  const root = mkdtempSync(join(tmpdir(), "outm32-api-"));
  const repository = createMatterRepository();
  persistMatterVaultLink({
    repository,
    link: {
      tenant_id: TENANT,
      matter_id: MATTER,
      vault_workspace_id: "workspace_outm32_api",
      default_folder_id: "folder_outm32_api",
      permission_envelope_id: "permission_outm32_api",
      source_transaction_id: "transaction_outm32_api",
      audit_event_id: "audit_outm32_api",
      created_by_actor_id: ACTOR,
      created_at: AT,
    },
  });
  const dmsRuntime = {
    repository: createDmsRepository(),
    storage: createFileStorageAdapter({ adapter_id: "outm32-api", rootPath: join(root, "objects") }),
  };
  return createMatterRuntimeContext({
    repository,
    dmsRuntime,
    documentTemplateVersions: [template()],
    clock: () => AT,
  });
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "permission_outm32_api",
    audit_hint_ref: "audit_outm32_api",
    occurred_at: AT,
    ...overrides,
  };
}

test("OUTM-32 API owner approval finalizes one redacted immutable DOCX artifact", async () => {
  const matterRuntime = runtime();
  const created = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts`,
    method: "POST",
    body: body({
      idempotency_key: "outm32-api-create",
      draft: {
        draft_id: "builder_draft_outm32_api",
        template_id: "matter_engagement_letter",
        template_version: "api-1.0.0",
        title: "위임계약서",
        merge_data: { client_name: "비공개 의뢰인", matter_title: "비공개 Matter" },
        signer_role_refs: [{ role_id: "client", party_ref: "party:outm32-private" }],
      },
    }),
    context,
    requestId: "outm32-create",
    runtime: matterRuntime,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.outcome, "created");
  assert.equal(created.body.idempotent_replay, false);

  const requested = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts/builder_draft_outm32_api/approval-requests`,
    method: "POST",
    body: body({ idempotency_key: "outm32-api-request" }),
    context,
    requestId: "outm32-request",
    runtime: matterRuntime,
  });
  assert.equal(requested.status, 200);
  assert.equal(requested.body.outcome, "approval_required");
  assert.equal(requested.body.idempotent_replay, false);

  const requestedReplay = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts/builder_draft_outm32_api/approval-requests`,
    method: "POST",
    body: body({ idempotency_key: "outm32-api-request" }),
    context,
    requestId: "outm32-request-replay",
    runtime: matterRuntime,
  });
  assert.equal(requestedReplay.status, 200);
  assert.equal(requestedReplay.body.outcome, "idempotent_replay");
  assert.equal(requestedReplay.body.idempotent_replay, true);

  const approvalId = requested.body.approval_request.approval_request_id;
  const decided = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-approval-requests/${approvalId}/decision`,
    method: "POST",
    body: body({ decision: "approved", idempotency_key: "outm32-api-approve" }),
    context,
    requestId: "outm32-approve",
    runtime: matterRuntime,
  });
  assert.equal(decided.status, 200);
  assert.equal(decided.body.outcome, "approved");
  assert.equal(decided.body.idempotent_replay, false);
  assert.equal(decided.body.approval_receipt.approved_by_ref_included, false);

  const decisionReplay = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-approval-requests/${approvalId}/decision`,
    method: "POST",
    body: body({ decision: "approved", idempotency_key: "outm32-api-approve" }),
    context,
    requestId: "outm32-approve-replay",
    runtime: matterRuntime,
  });
  assert.equal(decisionReplay.status, 200);
  assert.equal(decisionReplay.body.outcome, "idempotent_replay");
  assert.equal(decisionReplay.body.idempotent_replay, true);

  const published = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts/builder_draft_outm32_api/publish-to-vault`,
    method: "POST",
    body: body({ idempotency_key: "outm32-api-publish" }),
    context,
    requestId: "outm32-publish",
    runtime: matterRuntime,
  });
  assert.equal(published.status, 200);
  assert.equal(published.body.outcome, "created");
  assert.equal(published.body.idempotent_replay, false);
  assert.equal(published.body.artifact.immutable, true);
  assert.equal(published.body.artifact.document_bytes_included, false);
  assert.equal(published.body.outbox_event.status, "complete");
  assert.equal(published.body.publish_state.immutable_document_version_created, true);
  const serialized = JSON.stringify(published.body);
  assert.equal(serialized.includes("비공개 의뢰인"), false);
  assert.equal(serialized.includes("party:outm32-private"), false);
  assert.equal(serialized.includes("storage_pointer"), false);
  assert.equal(matterRuntime.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 1);
  assert.equal(matterRuntime.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length, 1);
  assert.equal(matterRuntime.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length, 1);

  const publishedReplay = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts/builder_draft_outm32_api/publish-to-vault`,
    method: "POST",
    body: body({ idempotency_key: "outm32-api-publish" }),
    context,
    requestId: "outm32-publish-replay",
    runtime: matterRuntime,
  });
  assert.equal(publishedReplay.status, 200);
  assert.equal(publishedReplay.body.outcome, "idempotent_replay");
  assert.equal(publishedReplay.body.idempotent_replay, true);
});

test("OUTM-32 API denies an approval decision without an owner role", async () => {
  const matterRuntime = runtime();
  const denied = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-approval-requests/missing/decision`,
    method: "POST",
    body: body({ decision: "approved", idempotency_key: "outm32-api-denied" }),
    context: {
      ...context,
      principal: { user_id: "non_owner_outm32", tenant_id: TENANT, role_ids: ["lawos_attorney"] },
    },
    requestId: "outm32-denied",
    runtime: matterRuntime,
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.safe_error_codes, ["MATTER_APPROVAL_REQUIRED"]);
  assert.equal(denied.body.ui_state, "owner_blocked");
});

test("OUTM-32 builder-draft replay key binds operation, Matter, template, draft and canonical input", async () => {
  const matterRuntime = runtime();
  const base = body({
    idempotency_key: "outm32-api-generic-replay",
    draft: {
      draft_id: "builder_draft_generic_replay",
      template_id: "matter_engagement_letter",
      template_version: "api-1.0.0",
      title: "재생 고정",
      merge_data: { client_name: "의뢰인", matter_title: "Matter" },
      signer_role_refs: [{ role_id: "client", party_ref: "party:generic-replay" }],
    },
  });
  const create = (matterId, requestBody, requestId) => handleMatterApiRequest({
    pathname: `/api/matters/${matterId}/builder-drafts`, method: "POST",
    body: requestBody, context, requestId, runtime: matterRuntime,
  });
  assert.equal((await create(MATTER, base, "generic-create")).status, 201);
  const exact = await create(MATTER, base, "generic-exact-replay");
  assert.equal(exact.status, 200);
  assert.equal(exact.body.outcome, "idempotent_replay");
  for (const [label, matterId, changed] of [
    ["input", MATTER, { ...base, draft: { ...base.draft, title: "변경됨" } }],
    ["matter", "matter_outm32_other", base],
    ["template", MATTER, { ...base, draft: { ...base.draft, template_version: "api-2.0.0" } }],
    ["draft", MATTER, { ...base, draft: { ...base.draft, draft_id: "builder_draft_other" } }],
  ]) {
    const conflict = await create(matterId, changed, `generic-${label}-conflict`);
    assert.equal(conflict.status, 409, label);
    assert.deepEqual(conflict.body.safe_error_codes, ["MATTER_IDEMPOTENCY_CONFLICT"], label);
  }
  const operationConflict = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts/builder_draft_generic_replay`, method: "PATCH",
    body: body({ idempotency_key: "outm32-api-generic-replay", patch: { title: "다른 연산" } }),
    context, requestId: "generic-operation-conflict", runtime: matterRuntime,
  });
  assert.equal(operationConflict.status, 409);
  assert.deepEqual(operationConflict.body.safe_error_codes, ["MATTER_IDEMPOTENCY_CONFLICT"]);
});

test("OUTM-32 builder-draft replay survives repository restart without mutation", async () => {
  const root = mkdtempSync(join(tmpdir(), "outm32-api-restart-"));
  const filePath = join(root, "matter.json");
  const firstRepository = createMatterRepository({ filePath });
  const first = createMatterRuntimeContext({ repository: firstRepository, documentTemplateVersions: [template()], clock: () => AT });
  const requestBody = body({
    idempotency_key: "outm32-api-restart-key",
    draft: {
      draft_id: "builder_draft_api_restart", template_id: "matter_engagement_letter",
      template_version: "api-1.0.0", title: "재시작 재생",
      merge_data: { client_name: "의뢰인", matter_title: "Matter" },
      signer_role_refs: [{ role_id: "client", party_ref: "party:restart" }],
    },
  });
  const initial = await handleMatterApiRequest({ pathname: `/api/matters/${MATTER}/builder-drafts`, method: "POST", body: requestBody, context, requestId: "restart-initial", runtime: first });
  assert.equal(initial.status, 201);
  firstRepository.close();
  const reopenedRepository = createMatterRepository({ filePath });
  const restarted = createMatterRuntimeContext({ repository: reopenedRepository, clock: () => AT });
  const before = reopenedRepository.snapshot();
  const replay = await handleMatterApiRequest({ pathname: `/api/matters/${MATTER}/builder-drafts`, method: "POST", body: requestBody, context, requestId: "restart-replay", runtime: restarted });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.idempotent_replay, true);
  assert.deepEqual(reopenedRepository.snapshot(), before);
});
