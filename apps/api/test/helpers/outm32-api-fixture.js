import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDmsRepository } from "../../../../packages/dms/src/repository.js";
import { createFileStorageAdapter } from "../../../../packages/dms/src/storage/file-storage-adapter.js";
import { createApprovedDocumentTemplateVersion } from "../../../../packages/matter/src/agreement-docx.js";
import { getMatterVaultLink, persistMatterVaultLink } from "../../../../packages/matter/src/matter-vault-link-repository.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext } from "../../src/matter-runtime-context.js";

export const OUTM32_TENANT = "tenant_outm32_api";
export const OUTM32_MATTER = "matter_outm32_api";
export const OUTM32_ACTOR = "owner_outm32_api";
export const OUTM32_AT = "2026-08-08T01:00:00.000Z";

export function outm32Context(actorId = OUTM32_ACTOR) {
  return Object.freeze({
    principal: Object.freeze({ user_id: actorId, tenant_id: OUTM32_TENANT, role_ids: Object.freeze(["tenant_owner"]) }),
    rules: Object.freeze([{ id: `outm32-allow-${actorId}`, effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
}

export function outm32Template(overrides = {}) {
  return createApprovedDocumentTemplateVersion({
    tenant_id: OUTM32_TENANT,
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
    approval_receipt: { receipt_id: "template-approval:outm32-api:1", approved_by_ref: "template-owner:outm32-api", approved_at: OUTM32_AT },
    synthetic_only: true,
    ...overrides,
  });
}

export function outm32Body(overrides = {}) {
  return {
    tenant_id: OUTM32_TENANT,
    permission_ref: "permission_outm32_api",
    audit_hint_ref: "audit_outm32_api",
    occurred_at: OUTM32_AT,
    ...overrides,
  };
}

export function outm32Draft(overrides = {}) {
  return {
    draft_id: "builder_draft_outm32_api",
    template_id: "matter_engagement_letter",
    template_version: "api-1.0.0",
    title: "위임계약서",
    merge_data: { client_name: "비공개 의뢰인", matter_title: "비공개 Matter" },
    signer_role_refs: [{ role_id: "client", party_ref: "party:outm32-private" }],
    ...overrides,
  };
}

export function createOutm32ApiRuntime(options = {}) {
  const repository = options.repository ?? createMatterRepository();
  if (!getMatterVaultLink({ repository, tenant_id: OUTM32_TENANT, matter_id: OUTM32_MATTER })) {
    persistMatterVaultLink({
      repository,
      link: {
        tenant_id: OUTM32_TENANT, matter_id: OUTM32_MATTER,
        vault_workspace_id: "workspace_outm32_api", default_folder_id: "folder_outm32_api",
        permission_envelope_id: "permission_outm32_api", source_transaction_id: "transaction_outm32_api",
        audit_event_id: "audit_outm32_api", created_by_actor_id: OUTM32_ACTOR, created_at: OUTM32_AT,
      },
    });
  }
  const root = mkdtempSync(join(tmpdir(), "outm32-api-"));
  const dmsRuntime = Object.hasOwn(options, "dmsRuntime") ? options.dmsRuntime : {
    repository: createDmsRepository(),
    storage: createFileStorageAdapter({ adapter_id: "outm32-api", rootPath: join(root, "objects") }),
  };
  return createMatterRuntimeContext({
    repository,
    dmsRuntime,
    documentTemplateVersions: [outm32Template()],
    clock: () => OUTM32_AT,
  });
}
