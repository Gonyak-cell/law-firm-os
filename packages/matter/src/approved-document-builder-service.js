import { canonicalDraftData } from "./agreement-input.js";
import { createDocumentApprovalService } from "./document-approval-service.js";
import { appendBuilderAudit, appendBuilderTimeline } from "./document-builder-events.js";
import { createDocumentPublicationService } from "./document-publication-service.js";
import { requiredString, safeId, safeText } from "./document-builder-values.js";
import { safeDraft, safeTemplate } from "./document-builder-safe-projection.js";
import {
  createApprovedDocumentTemplateVersion,
  listApprovedTemplateVersions,
  persistApprovedTemplateVersion,
  readApprovedTemplateVersion,
} from "./document-template-authority.js";

function syntheticApprovedTemplate() {
  return createApprovedDocumentTemplateVersion({
    tenant_id: "tenant_rp05_synthetic",
    template_id: "matter_engagement_letter",
    template_version: "synthetic-1.0.0",
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
    approval_receipt: { receipt_id: "template-approval:synthetic:1", approved_by_ref: "synthetic-template-owner", approved_at: "2026-08-08T00:00:00.000Z" },
    synthetic_only: true,
  });
}

export function createApprovedDocumentBuilderService({
  repository,
  dmsRuntime = null,
  templateVersions = [],
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository) throw new TypeError("repository is required");
  const hasSyntheticMatter = repository.list({ tenant_id: "tenant_rp05_synthetic", model_type: "Matter" }).length > 0;
  const configured = [...(hasSyntheticMatter && !templateVersions.length ? [syntheticApprovedTemplate()] : []), ...templateVersions];
  for (const template of configured) persistApprovedTemplateVersion(repository, template);
  const readTemplate = (input) => readApprovedTemplateVersion(repository, input);
  const approval = createDocumentApprovalService({ repository, readTemplate, clock });
  const publication = createDocumentPublicationService({ repository, dmsRuntime, readTemplate, clock });

  function listDocumentTemplates({ tenant_id } = {}) {
    return Object.freeze(listApprovedTemplateVersions(repository, tenant_id ?? "tenant_rp05_synthetic").map(safeTemplate));
  }

  function createBuilderDraft({ tenant_id, matter_id, draft, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const now = occurred_at ?? clock();
    const draftId = safeId(draft?.draft_id, `builder_draft_${Date.now().toString(36)}`);
    const template = readTemplate({
      tenant_id: tenantId,
      template_id: requiredString(draft?.template_id ?? "matter_engagement_letter", "template_id", { max: 64 }),
      template_version: requiredString(draft?.template_version, "template_version", { max: 64 }),
    });
    const title = safeText(draft?.title ?? template.label, "title", { min: 2, max: 240 });
    const canonical = canonicalDraftData({ tenantId, matterId, draftId, title, template, mergeData: draft?.merge_data ?? {}, signerRoleRefs: draft?.signer_role_refs ?? [] });
    return repository.transaction((tx) => {
      const record = tx.create({
        model_type: "MatterBuilderDraft", resource_id: draftId, draft_id: draftId,
        tenant_id: tenantId, matter_id: matterId, template_id: template.template_id,
        template_version: template.template_version, template_hash: template.template_hash,
        title, status: "draft", safe_excerpt: null, merge_data: canonical.merge_data,
        signer_role_refs: canonical.signer_role_refs, merge_field_count: Object.keys(canonical.merge_data).length,
        signer_role_count: canonical.signer_role_refs.length, input_fingerprint: canonical.input_fingerprint,
        approval_state: "approval_required", publish_state: "owner_blocked", approval_request_id: null,
        approval_receipt: null, immutable: false, created_by: actorId, created_at: now, updated_at: now,
        raw_body_included: false, raw_template_body_included: false,
        raw_contact_values_included: false, document_bytes_included: false,
      });
      const audit = appendBuilderAudit(tx, { event_id: `matter.builder.draft.created:${tenantId}:${matterId}:${draftId}`, tenant_id: tenantId, actor_id: actorId, action: "matter.builder.draft.created", object_type: "MatterBuilderDraft", object_id: draftId, reason: "document_builder_draft_created", occurred_at: now, metadata: { template_id: template.template_id, template_version: template.template_version } });
      const timeline = appendBuilderTimeline(tx, { event_id: `matter.timeline.builder_draft:${tenantId}:${matterId}:${draftId}`, tenant_id: tenantId, matter_id: matterId, occurred_at: now, type: "matter.builder.draft", title, source_ref: draftId, source_object_id: draftId, safe_summary: { template_id: template.template_id, template_version: template.template_version } });
      return Object.freeze({ item: safeDraft(record), audit_event: audit, timeline_event: timeline });
    });
  }

  function patchBuilderDraft({ tenant_id, matter_id, draft_id, patch, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(draft_id, "draft_id", { max: 128 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const now = occurred_at ?? clock();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    if (current.immutable) throw new Error("finalized builder draft is immutable");
    const template = readTemplate({ tenant_id: tenantId, template_id: current.template_id, template_version: current.template_version });
    const title = patch?.title === undefined ? current.title : safeText(patch.title, "title", { min: 2, max: 240 });
    const canonical = canonicalDraftData({ tenantId, matterId, draftId, title, template, mergeData: patch?.merge_data ?? current.merge_data, signerRoleRefs: patch?.signer_role_refs ?? current.signer_role_refs });
    return repository.transaction((tx) => {
      const updated = tx.update({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId }, {
        title, merge_data: canonical.merge_data, signer_role_refs: canonical.signer_role_refs,
        merge_field_count: Object.keys(canonical.merge_data).length, signer_role_count: canonical.signer_role_refs.length,
        input_fingerprint: canonical.input_fingerprint, status: patch?.status === "ready_for_review" ? "ready_for_review" : "draft",
        approval_state: "approval_required", publish_state: "owner_blocked", approval_request_id: null,
        approval_receipt: null, updated_by: actorId, updated_at: now,
      });
      const audit = appendBuilderAudit(tx, { event_id: `matter.builder.draft.patched:${tenantId}:${matterId}:${draftId}:${now}`, tenant_id: tenantId, actor_id: actorId, action: "matter.builder.draft.patched", object_type: "MatterBuilderDraft", object_id: draftId, reason: "document_builder_draft_updated", occurred_at: now, metadata: { changed_fields: Object.keys(patch ?? {}).sort(), approval_invalidated: true } });
      return Object.freeze({ item: safeDraft(updated), audit_event: audit });
    });
  }

  function previewBuilderDraft({ tenant_id, matter_id, draft_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(draft_id, "draft_id", { max: 128 });
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const template = readTemplate({ tenant_id: tenantId, template_id: current.template_id, template_version: current.template_version });
    return Object.freeze({ item: Object.freeze({
      draft_id: draftId, matter_id: matterId, title: current.title, template_label: template.label,
      template_version: template.template_version, preview_sections: Object.freeze(["표지", "핵심 조항", "승인 필요 항목"]),
      safe_excerpt: null, merge_field_count: current.merge_field_count, signer_role_count: current.signer_role_count,
      raw_body_included: false, raw_template_body_included: false, raw_contact_values_included: false,
      document_bytes_included: false, production_ready_claim: false,
    }) });
  }

  return Object.freeze({
    listDocumentTemplates, createBuilderDraft, patchBuilderDraft, previewBuilderDraft,
    ...approval, ...publication,
  });
}
