import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDmsRepository } from "../../../dms/src/repository.js";
import { createFileStorageAdapter } from "../../../dms/src/storage/file-storage-adapter.js";
import { createApprovedDocumentTemplateVersion } from "../../src/agreement-docx.js";
import { persistMatterVaultLink } from "../../src/matter-vault-link-repository.js";
import { createMatterRepository } from "../../src/repository.js";

export const TENANT = "tenant_rp05_synthetic";
export const MATTER_ID = "matter_docx_001";
export const ACTOR_ID = "user_docx_owner";
export const FIXED_TIME = "2026-08-08T00:00:00.000Z";

export function approvedTemplate(overrides = {}) {
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
      { type: "table", rows: [
        [[{ literal: "의뢰인" }], [{ merge_field: "client_name" }]],
        [[{ literal: "Matter" }], [{ merge_field: "matter_title" }]],
        [[{ literal: "담당" }], [{ merge_field: "responsible_attorney" }]],
      ] },
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

export function canonicalInput(template = approvedTemplate(), overrides = {}) {
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

export function runtimeFixture() {
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
  const dmsRuntime = {
    repository: createDmsRepository({ filePath: dmsStore }),
    storage: createFileStorageAdapter({ adapter_id: "outm32-docx", rootPath: objectRoot }),
  };
  return {
    repository,
    dmsRuntime,
    reopen: () => ({
      repository: createMatterRepository({ filePath: matterStore }),
      dmsRuntime: {
        repository: createDmsRepository({ filePath: dmsStore }),
        storage: createFileStorageAdapter({ adapter_id: "outm32-docx", rootPath: objectRoot }),
      },
    }),
  };
}

export function createApprovedDraft(service, {
  approvalKey = "approve-docx-001",
  draftId = "builder_draft_docx_001",
  requestKey = "request-approval-docx-001",
} = {}) {
  const input = canonicalInput();
  service.createBuilderDraft({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    actor_id: ACTOR_ID,
    occurred_at: FIXED_TIME,
    draft: {
      draft_id: draftId,
      template_id: input.template.template_id,
      template_version: input.template.template_version,
      title: input.title,
      merge_data: input.merge_data,
      signer_role_refs: input.signer_role_refs,
    },
  });
  const requested = service.requestBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    draft_id: draftId,
    actor_id: ACTOR_ID,
    idempotency_key: requestKey,
    occurred_at: FIXED_TIME,
  });
  const decided = service.decideBuilderApproval({
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    approval_request_id: requested.approval_request.approval_request_id,
    decision: "approved",
    actor_id: ACTOR_ID,
    authorized_owner: true,
    idempotency_key: approvalKey,
    occurred_at: FIXED_TIME,
  });
  return { requested, decided };
}

export async function createApprovePublish(service, { publishKey = "publish-docx-001" } = {}) {
  const { requested, decided } = createApprovedDraft(service);
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
