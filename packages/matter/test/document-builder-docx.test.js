import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createApprovedDocumentTemplateVersion, renderAgreementDocx } from "../src/agreement-docx.js";
import { createMatterDocumentEmailBuilderService } from "../src/document-email-builder-service.js";
import { persistMatterVaultLink } from "../src/matter-vault-link-repository.js";
import { createMatterRepository } from "../src/repository.js";
import { createDmsRepository } from "../../dms/src/repository.js";
import { createFileStorageAdapter } from "../../dms/src/storage/file-storage-adapter.js";

const TENANT = "tenant_rp05_synthetic";
const MATTER_ID = "matter_docx_001";
const ACTOR_ID = "user_docx_owner";
const FIXED_TIME = "2026-08-08T00:00:00.000Z";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function approvedTemplate(overrides = {}) {
  return createApprovedDocumentTemplateVersion({
    tenant_id: TENANT,
    template_id: "matter_engagement_letter",
    template_version: "1.0.0-test",
    label: "위임계약서",
    status: "approved",
    merge_schema: [
      { key: "client_name", required: true, max_length: 120 },
      { key: "matter_title", required: true, max_length: 160 },
      { key: "responsible_attorney", required: true, max_length: 120 },
    ],
    signer_roles: [{ role_id: "client", required: true }],
    content: [
      { type: "paragraph", style: "title", runs: [{ literal: "위임계약서" }] },
      {
        type: "table",
        rows: [
          [[{ literal: "의뢰인" }], [{ merge_field: "client_name" }]],
          [[{ literal: "Matter" }], [{ merge_field: "matter_title" }]],
          [[{ literal: "담당" }], [{ merge_field: "responsible_attorney" }]],
        ],
      },
      { type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" },
    ],
    approval_receipt: {
      receipt_id: "template-approval:test:1",
      approved_by_ref: "template-owner:test",
      approved_at: FIXED_TIME,
    },
    synthetic_only: true,
    ...overrides,
  });
}

function canonicalInput(template = approvedTemplate(), overrides = {}) {
  return {
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_docx_001",
    title: "위임계약서",
    template,
    merge_data: {
      client_name: "테스트 의뢰인",
      matter_title: "테스트 Matter",
      responsible_attorney: "담당 변호사",
    },
    signer_role_refs: [{ role_id: "client", party_ref: "party:test-client" }],
    generated_at: FIXED_TIME,
    ...overrides,
  };
}

function runtimeFixture() {
  const root = mkdtempSync(join(tmpdir(), "outm32-docx-"));
  const matterStore = join(root, "matter.json");
  const dmsStore = join(root, "dms.json");
  const objectRoot = join(root, "objects");
  const repository = createMatterRepository({ filePath: matterStore });
  persistMatterVaultLink({
    repository,
    link: {
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      vault_workspace_id: "workspace_docx_001",
      default_folder_id: "folder_docx_001",
      permission_envelope_id: "permission_docx_001",
      source_transaction_id: "transaction_docx_001",
      audit_event_id: "audit_docx_001",
      created_by_actor_id: ACTOR_ID,
      created_at: FIXED_TIME,
    },
  });
  const dmsRepository = createDmsRepository({ filePath: dmsStore });
  const storage = createFileStorageAdapter({ adapter_id: "outm32-docx", rootPath: objectRoot });
  return {
    root,
    matterStore,
    dmsStore,
    objectRoot,
    repository,
    dmsRuntime: { repository: dmsRepository, storage },
    reopen() {
      return {
        repository: createMatterRepository({ filePath: matterStore }),
        dmsRuntime: {
          repository: createDmsRepository({ filePath: dmsStore }),
          storage: createFileStorageAdapter({ adapter_id: "outm32-docx", rootPath: objectRoot }),
        },
      };
    },
  };
}

async function createApprovePublish(service, { publishKey = "publish-docx-001" } = {}) {
  service.createBuilderDraft({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    actor_id: ACTOR_ID,
    occurred_at: FIXED_TIME,
    draft: {
      draft_id: "builder_draft_docx_001",
      template_id: "matter_engagement_letter",
      template_version: "1.0.0-test",
      title: "위임계약서",
      merge_data: canonicalInput().merge_data,
      signer_role_refs: canonicalInput().signer_role_refs,
    },
  });
  const requested = service.requestBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_docx_001",
    actor_id: ACTOR_ID,
    occurred_at: FIXED_TIME,
  });
  const decided = service.decideBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved",
    actor_id: ACTOR_ID,
    authorized_owner: true,
    idempotency_key: "approve-docx-001",
    occurred_at: FIXED_TIME,
  });
  const published = await service.publishBuilderDraftToVault({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_docx_001",
    actor_id: ACTOR_ID,
    idempotency_key: publishKey,
    occurred_at: FIXED_TIME,
  });
  return { requested, decided, published };
}

test("OUTM-32 renders byte-stable valid DOCX from an approved template and canonical input", async () => {
  const template = approvedTemplate();
  const first = await renderAgreementDocx(canonicalInput(template));
  const second = await renderAgreementDocx(canonicalInput(template));

  assert.ok(Buffer.isBuffer(first.bytes));
  assert.equal(first.mime_type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(first.sha256, sha256(first.bytes));
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.template_hash, template.template_hash);
  assert.equal(first.signature_anchors[0].anchor_id, "client_sign_here");
  assert.equal(first.document_bytes_included, false);

  const artifactPath = process.env.OUTM32_ARTIFACT_PATH || join(mkdtempSync(join(tmpdir(), "outm32-artifact-")), "approved-builder.docx");
  writeFileSync(artifactPath, first.bytes);
  execFileSync("unzip", ["-t", artifactPath], { stdio: "pipe" });
  const documentXml = execFileSync("unzip", ["-p", artifactPath, "word/document.xml"], { encoding: "utf8" });
  assert.match(documentXml, /amic-sign:client:client_sign_here/);
  assert.equal(existsSync(artifactPath), true);

  const changedMatter = await renderAgreementDocx(canonicalInput(template, { matter_id: "matter_docx_002" }));
  const changedSigner = await renderAgreementDocx(canonicalInput(template, {
    signer_role_refs: [{ role_id: "client", party_ref: "party:other-client" }],
  }));
  assert.notEqual(first.sha256, changedMatter.sha256);
  assert.notEqual(first.sha256, changedSigner.sha256);
});

test("OUTM-32 rejects unapproved templates, missing merge data, and invalid signature anchors", async () => {
  assert.throws(
    () => createApprovedDocumentTemplateVersion({ ...approvedTemplate(), status: "draft" }),
    /approved template/i,
  );
  await assert.rejects(
    renderAgreementDocx(canonicalInput(approvedTemplate(), { merge_data: { client_name: "테스트" } })),
    /merge field/i,
  );
  assert.throws(
    () => approvedTemplate({
      content: [{ type: "signature_anchor", signer_role: "missing", anchor_id: "bad_anchor", label: "서명" }],
    }),
    /signer role/i,
  );
});

test("OUTM-32 pins the MIT DOCX generator to the server-side Matter workspace only", () => {
  const matterPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const addinPackage = JSON.parse(readFileSync(new URL("../../../apps/addin/package.json", import.meta.url), "utf8"));
  const desktopPackage = JSON.parse(readFileSync(new URL("../../../apps/desktop/package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../../../package-lock.json", import.meta.url), "utf8"));

  assert.equal(matterPackage.dependencies.docx, "9.7.1");
  assert.equal(lock.packages["packages/matter"].dependencies.docx, "9.7.1");
  assert.equal(lock.packages["node_modules/docx"].version, "9.7.1");
  assert.equal(lock.packages["node_modules/docx"].license, "MIT");
  assert.equal(addinPackage.dependencies?.docx, undefined);
  assert.equal(addinPackage.devDependencies?.docx, undefined);
  assert.equal(desktopPackage.dependencies?.docx, undefined);
  assert.equal(desktopPackage.devDependencies?.docx, undefined);
});

test("OUTM-32 owner approval is audited and one immutable Vault artifact survives replay and restart", async () => {
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
  assert.equal(published.publish_state.status, "complete");
  assert.equal(published.publish_state.vault_document_created, true);
  assert.equal(published.artifact.mime_type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.match(published.artifact.filename, /\.docx$/);
  assert.equal(published.artifact.sha256.length, 64);
  assert.equal(published.artifact.document_bytes_included, false);
  assert.equal(JSON.stringify(published).includes("테스트 의뢰인"), false);
  assert.equal(JSON.stringify(published).includes("party:test-client"), false);

  const docs = fixture.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" });
  const versions = fixture.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" });
  const files = fixture.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" });
  assert.equal(docs.length, 1);
  assert.equal(versions.length, 1);
  assert.equal(files.length, 1);
  assert.equal(docs[0].version_safe_dms, true);
  assert.equal(versions[0].status, "current");
  assert.equal(files[0].bytes_included, false);
  assert.equal(files[0].sha256, published.artifact.sha256);

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
  assert.equal(reopened.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 1);
  assert.equal(reopened.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length, 1);
  assert.equal(reopened.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length, 1);
});

test("OUTM-32 keeps publish owner-blocked when approval, template authority, or Vault prerequisites are absent", async () => {
  const repository = createMatterRepository();
  const service = createMatterDocumentEmailBuilderService({
    repository,
    templateVersions: [approvedTemplate()],
    clock: () => FIXED_TIME,
  });
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
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_blocked",
    actor_id: ACTOR_ID,
    idempotency_key: "publish-blocked-001",
    occurred_at: FIXED_TIME,
  });
  assert.equal(blocked.outcome, "owner_blocked");
  assert.equal(blocked.publish_state.vault_document_created, false);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "MatterBuilderArtifact" }).length, 0);

  const requested = service.requestBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_blocked",
    actor_id: ACTOR_ID,
    occurred_at: FIXED_TIME,
  });
  service.decideBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved",
    actor_id: ACTOR_ID,
    authorized_owner: true,
    idempotency_key: "approve-without-vault",
    occurred_at: FIXED_TIME,
  });
  const noVault = await service.publishBuilderDraftToVault({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_blocked",
    actor_id: ACTOR_ID,
    idempotency_key: "publish-without-vault",
    occurred_at: FIXED_TIME,
  });
  assert.equal(noVault.outcome, "owner_blocked");
  assert.equal(noVault.publish_state.vault_document_created, false);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "MatterBuilderArtifact" }).length, 0);

  const repositoryWithoutTemplate = createMatterRepository();
  const serviceWithoutTemplate = createMatterDocumentEmailBuilderService({
    repository: repositoryWithoutTemplate,
    clock: () => FIXED_TIME,
  });
  assert.deepEqual(serviceWithoutTemplate.listDocumentTemplates({ tenant_id: TENANT }), []);
  assert.throws(
    () => serviceWithoutTemplate.createBuilderDraft({
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      actor_id: ACTOR_ID,
      occurred_at: FIXED_TIME,
      draft: { template_id: "matter_engagement_letter", title: "승인 템플릿 없음" },
    }),
    /approved template version not found/i,
  );

  assert.throws(
    () => service.decideBuilderApproval({
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      approval_request_id: "missing",
      decision: "approved",
      actor_id: "non-owner",
      authorized_owner: false,
      idempotency_key: "denied-owner",
      occurred_at: FIXED_TIME,
    }),
    /owner approval/i,
  );
});

test("OUTM-32 failed Vault finalization stays approved-unpublished and changed input cannot reuse its key", async () => {
  const fixture = runtimeFixture();
  let fail = true;
  const storage = Object.freeze({
    ...fixture.dmsRuntime.storage,
    putObject(input) {
      if (fail) {
        fail = false;
        throw new Error("synthetic Vault failure");
      }
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

  service.patchBuilderDraft({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_docx_001",
    actor_id: ACTOR_ID,
    occurred_at: "2026-08-08T00:01:00.000Z",
    patch: { merge_data: { ...canonicalInput().merge_data, matter_title: "변경된 Matter" } },
  });
  const requested = service.requestBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: "builder_draft_docx_001",
    actor_id: ACTOR_ID,
    occurred_at: "2026-08-08T00:02:00.000Z",
  });
  service.decideBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved",
    actor_id: ACTOR_ID,
    authorized_owner: true,
    idempotency_key: "approve-docx-002",
    occurred_at: "2026-08-08T00:03:00.000Z",
  });
  await assert.rejects(
    service.publishBuilderDraftToVault({
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      draft_id: "builder_draft_docx_001",
      actor_id: ACTOR_ID,
      idempotency_key: "publish-conflict-001",
      occurred_at: "2026-08-08T00:04:00.000Z",
    }),
    /idempotency/i,
  );
});
