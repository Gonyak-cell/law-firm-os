import { createHash } from "node:crypto";
import { uploadDocument } from "../../dms/src/document-service.js";
import {
  canonicalizeAgreementInput,
  createApprovedDocumentTemplateVersion,
  DOCX_GENERATOR_VERSION,
  renderAgreementDocx,
} from "./agreement-docx.js";
import { getMatterVaultLink } from "./matter-vault-link-repository.js";

const OWNER_BLOCKED_PUBLISH_STATE = Object.freeze({
  status: "owner_blocked",
  owner_approval_ref_included: false,
  vault_document_created: false,
  document_bytes_included: false,
  production_ready_claim: false,
});

function requiredString(value, field, { max = 240 } = {}) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > max) throw new TypeError(`${field} is too long`);
  return text;
}

function safeText(value, field, { min = 2, max = 240 } = {}) {
  const text = requiredString(value, field, { max }).normalize("NFKC");
  if (text.length < min) throw new TypeError(`${field} is invalid`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) {
    throw new TypeError(`${field} includes unsupported control characters`);
  }
  return text;
}

function safeId(value, fallback) {
  const text = requiredString(value ?? fallback, "identifier", { max: 160 });
  return text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

function hashObject(value) {
  return createHash("sha256").update(JSON.stringify(canonicalValue(value))).digest("hex");
}

function appendAudit(repository, event) {
  return repository.appendAudit({
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    actor_id: event.actor_id,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason,
    occurred_at: event.occurred_at,
    metadata: {
      ...(event.metadata ?? {}),
      raw_body_included: false,
      raw_template_body_included: false,
      raw_provider_payload_included: false,
      raw_contact_values_included: false,
      document_bytes_included: false,
    },
  });
}

function appendTimeline(repository, event) {
  return repository.upsert({
    model_type: "MatterTimelineEvent",
    resource_id: event.event_id,
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    matter_id: event.matter_id,
    occurred_at: event.occurred_at,
    type: event.type,
    title: event.title,
    source_ref: event.source_ref,
    source_module: "matter-builder",
    source_object_id: event.source_object_id,
    safe_summary: event.safe_summary,
    raw_body_included: false,
    raw_provider_payload_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
  });
}

function safeTemplate(template) {
  return Object.freeze({
    template_id: template.template_id,
    template_version: template.template_version,
    template_hash: template.template_hash,
    label: template.label,
    category: "document",
    merge_field_count: template.merge_schema.length,
    merge_fields: Object.freeze(template.merge_schema.map((field) => field.key)),
    signer_roles: Object.freeze(template.signer_roles.map((role) => Object.freeze({
      role_id: role.role_id,
      required: role.required,
    }))),
    requires_approval: true,
    approval_receipt_present: true,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

function safeDraft(record) {
  return Object.freeze({
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    template_id: record.template_id,
    template_version: record.template_version,
    template_hash: record.template_hash,
    input_fingerprint: record.input_fingerprint,
    title: record.title,
    status: record.status,
    safe_excerpt: record.safe_excerpt ?? null,
    merge_field_count: record.merge_field_count,
    signer_role_count: record.signer_role_count,
    approval_state: record.approval_state,
    publish_state: record.publish_state,
    immutable: record.immutable === true,
    raw_body_included: false,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
    production_ready_claim: false,
  });
}

function safeApprovalReceipt(receipt) {
  if (!receipt) return null;
  return Object.freeze({
    receipt_id: receipt.receipt_id,
    approval_request_id: receipt.approval_request_id,
    approved_at: receipt.approved_at,
    input_hash: receipt.input_hash,
    input_fingerprint: receipt.input_fingerprint,
    template_hash: receipt.template_hash,
    approved_by_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
  });
}

function safeApproval(record) {
  return Object.freeze({
    approval_request_id: record.approval_request_id,
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    status: record.status,
    reviewer_role: "owner",
    input_fingerprint: record.input_fingerprint,
    template_hash: record.template_hash,
    approval_receipt: safeApprovalReceipt(record.approval_receipt),
    reviewer_user_ref_included: false,
    owner_approval_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

function safeArtifact(record) {
  if (!record) return null;
  return Object.freeze({
    artifact_id: record.artifact_id,
    draft_id: record.draft_id,
    document_id: record.document_id ?? null,
    version_id: record.version_id ?? null,
    file_object_id: record.file_object_id ?? null,
    filename: record.filename,
    mime_type: record.mime_type,
    byte_size: record.byte_size,
    sha256: record.sha256,
    generator_version: record.generator_version,
    template_id: record.template_id,
    template_version: record.template_version,
    template_hash: record.template_hash,
    input_hash: record.input_hash,
    approval_receipt_id: record.approval_receipt_id,
    status: record.status,
    immutable: record.status === "finalized",
    signer_snapshot_count: record.signer_snapshot_count,
    document_bytes_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
    raw_storage_path_included: false,
  });
}

function safeOutbox(record) {
  if (!record) return null;
  return Object.freeze({
    outbox_event_id: record.outbox_event_id,
    aggregate_id: record.aggregate_id,
    event_type: record.event_type,
    status: record.status,
    attempt_count: record.attempt_count,
    artifact_id: record.artifact_id,
    occurred_at: record.occurred_at,
    raw_payload_included: false,
    document_bytes_included: false,
    raw_contact_values_included: false,
  });
}

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
      receipt_id: "template-approval:synthetic:1",
      approved_by_ref: "synthetic-template-owner",
      approved_at: "2026-08-08T00:00:00.000Z",
    },
    synthetic_only: true,
  });
}

function normalizeTemplate(input) {
  if (input?.model_type === "MatterDocumentTemplateVersion" && input?.template_hash) return input;
  return createApprovedDocumentTemplateVersion(input);
}

function persistTemplate(repository, template) {
  const existing = repository.get({
    tenant_id: template.tenant_id,
    model_type: "MatterDocumentTemplateVersion",
    resource_id: template.resource_id,
  });
  if (existing) {
    if (existing.template_hash !== template.template_hash) {
      throw new Error(`approved template version is immutable: ${template.resource_id}`);
    }
    return existing;
  }
  return repository.create(template);
}

function canonicalDraftData({ tenantId, matterId, draftId, title, template, mergeData, signerRoleRefs }) {
  const canonical = canonicalizeAgreementInput({
    tenant_id: tenantId,
    matter_id: matterId,
    draft_id: draftId,
    title,
    template,
    merge_data: mergeData,
    signer_role_refs: signerRoleRefs,
    generated_at: "1980-01-01T00:00:00.000Z",
  }, { requireComplete: false });
  return Object.freeze({
    merge_data: canonical.merge_data,
    signer_role_refs: canonical.signer_role_refs,
    input_fingerprint: hashObject({
      ...canonical,
      generated_at: undefined,
      input_hash: undefined,
    }),
  });
}

function approvalInput({ current, template, generatedAt }) {
  return canonicalizeAgreementInput({
    tenant_id: current.tenant_id,
    matter_id: current.matter_id,
    draft_id: current.draft_id,
    title: current.title,
    template,
    merge_data: current.merge_data,
    signer_role_refs: current.signer_role_refs,
    generated_at: generatedAt,
  });
}

function lookupTemplate(repository, { tenantId, templateId, version }) {
  const matches = repository
    .list({ tenant_id: tenantId, model_type: "MatterDocumentTemplateVersion" })
    .filter((template) => template.template_id === templateId && template.status === "approved")
    .filter((template) => !version || template.template_version === version)
    .sort((left, right) => String(right.template_version).localeCompare(String(left.template_version)));
  if (!matches[0]) throw new Error("approved template version not found");
  return matches[0];
}

function blockedPublish({ repository, current, actorId, now, reason }) {
  const audit = appendAudit(repository, {
    event_id: `matter.builder.publish.blocked:${current.tenant_id}:${current.matter_id}:${current.draft_id}:${now}`,
    tenant_id: current.tenant_id,
    actor_id: actorId,
    action: "matter.builder.publish.blocked",
    object_type: "MatterBuilderDraft",
    object_id: current.draft_id,
    decision: "blocked",
    reason,
    occurred_at: now,
    metadata: { owner_approval_ref_included: false, vault_document_created: false },
  });
  return Object.freeze({
    outcome: "owner_blocked",
    ui_state: "owner_blocked",
    item: safeDraft(current),
    publish_state: OWNER_BLOCKED_PUBLISH_STATE,
    audit_event: audit,
  });
}

export function createApprovedDocumentBuilderService({
  repository,
  dmsRuntime = null,
  templateVersions = [],
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository) throw new TypeError("repository is required");
  const hasSyntheticMatter = repository
    .list({ tenant_id: "tenant_rp05_synthetic", model_type: "Matter" })
    .length > 0;
  const configuredTemplates = [
    ...(hasSyntheticMatter && templateVersions.length === 0 ? [syntheticApprovedTemplate()] : []),
    ...templateVersions.map(normalizeTemplate),
  ];
  for (const template of configuredTemplates) persistTemplate(repository, template);

  function listDocumentTemplates({ tenant_id } = {}) {
    const tenantId = requiredString(tenant_id ?? "tenant_rp05_synthetic", "tenant_id", { max: 128 });
    return Object.freeze(
      repository
        .list({ tenant_id: tenantId, model_type: "MatterDocumentTemplateVersion" })
        .filter((template) => template.status === "approved" && template.approval_receipt?.template_hash === template.template_hash)
        .map(safeTemplate),
    );
  }

  function createBuilderDraft({ tenant_id, matter_id, draft, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const now = occurred_at ?? clock();
    const draftId = safeId(draft?.draft_id, `builder_draft_${Date.now().toString(36)}`);
    const template = lookupTemplate(repository, {
      tenantId,
      templateId: requiredString(draft?.template_id ?? "matter_engagement_letter", "template_id", { max: 64 }),
      version: draft?.template_version,
    });
    const title = safeText(draft?.title ?? template.label, "title");
    const canonicalDraft = canonicalDraftData({
      tenantId,
      matterId,
      draftId,
      title,
      template,
      mergeData: draft?.merge_data ?? {},
      signerRoleRefs: draft?.signer_role_refs ?? [],
    });
    const record = repository.create({
      model_type: "MatterBuilderDraft",
      resource_id: draftId,
      draft_id: draftId,
      tenant_id: tenantId,
      matter_id: matterId,
      template_id: template.template_id,
      template_version: template.template_version,
      template_hash: template.template_hash,
      title,
      status: "draft",
      safe_excerpt: null,
      merge_data: canonicalDraft.merge_data,
      signer_role_refs: canonicalDraft.signer_role_refs,
      merge_field_count: Object.keys(canonicalDraft.merge_data).length,
      signer_role_count: canonicalDraft.signer_role_refs.length,
      input_fingerprint: canonicalDraft.input_fingerprint,
      approval_state: "approval_required",
      publish_state: "owner_blocked",
      approval_request_id: null,
      approval_receipt: null,
      immutable: false,
      created_by: actorId,
      created_at: now,
      updated_at: now,
      raw_body_included: false,
      raw_template_body_included: false,
      raw_contact_values_included: false,
      document_bytes_included: false,
    });
    const audit = appendAudit(repository, {
      event_id: `matter.builder.draft.created:${tenantId}:${matterId}:${draftId}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.builder.draft.created",
      object_type: "MatterBuilderDraft",
      object_id: draftId,
      reason: "document_builder_draft_created",
      occurred_at: now,
      metadata: { template_id: template.template_id, template_version: template.template_version },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.builder_draft:${tenantId}:${matterId}:${draftId}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.builder.draft",
      title,
      source_ref: draftId,
      source_object_id: draftId,
      safe_summary: { template_id: template.template_id, template_version: template.template_version },
    });
    return Object.freeze({ item: safeDraft(record), audit_event: audit, timeline_event: timeline });
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
    const template = lookupTemplate(repository, {
      tenantId,
      templateId: current.template_id,
      version: current.template_version,
    });
    const title = patch?.title === undefined ? current.title : safeText(patch.title, "title");
    const mergeData = patch?.merge_data === undefined ? current.merge_data : patch.merge_data;
    const signerRoleRefs = patch?.signer_role_refs === undefined ? current.signer_role_refs : patch.signer_role_refs;
    const canonicalDraft = canonicalDraftData({ tenantId, matterId, draftId, title, template, mergeData, signerRoleRefs });
    const updated = repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
      {
        title,
        merge_data: canonicalDraft.merge_data,
        signer_role_refs: canonicalDraft.signer_role_refs,
        merge_field_count: Object.keys(canonicalDraft.merge_data).length,
        signer_role_count: canonicalDraft.signer_role_refs.length,
        input_fingerprint: canonicalDraft.input_fingerprint,
        status: patch?.status === "ready_for_review" ? "ready_for_review" : "draft",
        approval_state: "approval_required",
        publish_state: "owner_blocked",
        approval_request_id: null,
        approval_receipt: null,
        updated_by: actorId,
        updated_at: now,
      },
    );
    const audit = appendAudit(repository, {
      event_id: `matter.builder.draft.patched:${tenantId}:${matterId}:${draftId}:${now}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.builder.draft.patched",
      object_type: "MatterBuilderDraft",
      object_id: draftId,
      reason: "document_builder_draft_updated",
      occurred_at: now,
      metadata: { changed_fields: Object.keys(patch ?? {}).sort(), approval_invalidated: true },
    });
    return Object.freeze({ item: safeDraft(updated), audit_event: audit });
  }

  function previewBuilderDraft({ tenant_id, matter_id, draft_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(draft_id, "draft_id", { max: 128 });
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const template = lookupTemplate(repository, { tenantId, templateId: current.template_id, version: current.template_version });
    return Object.freeze({
      item: Object.freeze({
        draft_id: current.draft_id,
        matter_id: current.matter_id,
        title: current.title,
        template_label: template.label,
        template_version: template.template_version,
        preview_sections: Object.freeze(["표지", "핵심 조항", "승인 필요 항목"]),
        safe_excerpt: null,
        merge_field_count: current.merge_field_count,
        signer_role_count: current.signer_role_count,
        raw_body_included: false,
        raw_template_body_included: false,
        raw_contact_values_included: false,
        document_bytes_included: false,
        production_ready_claim: false,
      }),
    });
  }

  function requestBuilderApproval({ tenant_id, matter_id, draft_id, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(draft_id, "draft_id", { max: 128 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const now = occurred_at ?? clock();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    if (current.immutable) throw new Error("finalized builder draft is immutable");
    const approvalId = safeId(`builder_approval_${draftId}_${current.input_fingerprint.slice(0, 16)}`);
    const existing = repository.get({
      tenant_id: tenantId,
      model_type: "MatterBuilderApprovalRequest",
      resource_id: approvalId,
    });
    const request = existing ?? repository.create({
      model_type: "MatterBuilderApprovalRequest",
      resource_id: approvalId,
      approval_request_id: approvalId,
      tenant_id: tenantId,
      matter_id: matterId,
      draft_id: draftId,
      status: "pending_owner_approval",
      reviewer_role: "owner",
      input_fingerprint: current.input_fingerprint,
      template_hash: current.template_hash,
      approval_receipt: null,
      created_by: actorId,
      created_at: now,
      raw_body_included: false,
      raw_contact_values_included: false,
    });
    const updated = repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
      {
        status: "ready_for_review",
        approval_state: "approval_required",
        publish_state: "owner_blocked",
        approval_request_id: approvalId,
        updated_at: now,
      },
    );
    const audit = appendAudit(repository, {
      event_id: `matter.builder.approval.requested:${tenantId}:${matterId}:${approvalId}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.builder.approval.requested",
      object_type: "MatterBuilderApprovalRequest",
      object_id: approvalId,
      decision: "blocked",
      reason: "owner_approval_required",
      occurred_at: now,
      metadata: { input_fingerprint: current.input_fingerprint, owner_approval_ref_included: false },
    });
    return Object.freeze({
      outcome: existing ? "idempotent_replay" : "approval_required",
      ui_state: "owner_blocked",
      item: safeDraft(updated),
      approval_request: safeApproval(request),
      audit_event: audit,
    });
  }

  function listBuilderApprovalRequests({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    return Object.freeze(
      repository
        .list({ tenant_id: tenantId, matter_id: matterId, model_type: "MatterBuilderApprovalRequest" })
        .filter((record) => record.hidden_from_actor !== true && record.silent !== true)
        .map(safeApproval)
        .sort((left, right) => String(right.approval_request_id).localeCompare(String(left.approval_request_id))),
    );
  }

  function decideBuilderApproval({
    tenant_id,
    matter_id,
    approval_request_id,
    decision,
    actor_id,
    authorized_owner = false,
    idempotency_key,
    occurred_at,
  } = {}) {
    if (!authorized_owner) throw new Error("owner approval authorization is required");
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const approvalId = requiredString(approval_request_id, "approval_request_id", { max: 160 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const key = requiredString(idempotency_key, "idempotency_key", { max: 200 });
    const normalizedDecision = requiredString(decision, "decision", { max: 16 });
    if (!new Set(["approved", "rejected"]).has(normalizedDecision)) throw new TypeError("decision is invalid");
    const now = occurred_at ?? clock();
    const request = repository.get({
      tenant_id: tenantId,
      model_type: "MatterBuilderApprovalRequest",
      resource_id: approvalId,
    });
    if (!request || request.matter_id !== matterId) throw new Error("builder approval request not found");
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: request.draft_id });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    if (current.input_fingerprint !== request.input_fingerprint || current.template_hash !== request.template_hash) {
      throw new Error("approval request is stale for the current builder draft");
    }
    const fingerprint = hashObject({ approvalId, decision: normalizedDecision, input_fingerprint: current.input_fingerprint });
    const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: key });
    if (replay) {
      if (replay.operation !== "matter_builder_approval_decision" || replay.request_fingerprint !== fingerprint) {
        throw new Error("idempotency key cannot be reused for a changed approval decision");
      }
      return Object.freeze({ ...replay.response, outcome: "idempotent_replay" });
    }
    const template = lookupTemplate(repository, { tenantId, templateId: current.template_id, version: current.template_version });
    let receipt = null;
    if (normalizedDecision === "approved") {
      const canonical = approvalInput({ current, template, generatedAt: now });
      receipt = Object.freeze({
        receipt_id: `builder-approval-receipt:${approvalId}:${canonical.input_hash.slice(0, 16)}`,
        approval_request_id: approvalId,
        approved_by_ref: actorId,
        approved_at: canonical.generated_at,
        input_hash: canonical.input_hash,
        input_fingerprint: current.input_fingerprint,
        template_hash: template.template_hash,
      });
    }
    return repository.transaction((tx) => {
      const updatedRequest = tx.update(
        { tenant_id: tenantId, model_type: "MatterBuilderApprovalRequest", resource_id: approvalId },
        {
          status: normalizedDecision,
          decision: normalizedDecision,
          decision_at: now,
          decision_by: actorId,
          approval_receipt: receipt,
        },
      );
      const updatedDraft = tx.update(
        { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: current.draft_id },
        normalizedDecision === "approved"
          ? {
              status: "approved",
              approval_state: "approved",
              publish_state: "approved_unpublished",
              approval_receipt: receipt,
              updated_by: actorId,
              updated_at: now,
            }
          : {
              status: "draft",
              approval_state: "rejected",
              publish_state: "owner_blocked",
              approval_receipt: null,
              updated_by: actorId,
              updated_at: now,
            },
      );
      const audit = appendAudit(tx, {
        event_id: `matter.builder.approval.${normalizedDecision}:${tenantId}:${matterId}:${approvalId}`,
        tenant_id: tenantId,
        actor_id: actorId,
        action: `matter.builder.approval.${normalizedDecision}`,
        object_type: "MatterBuilderApprovalRequest",
        object_id: approvalId,
        decision: normalizedDecision === "approved" ? "allow" : "deny",
        reason: `owner_${normalizedDecision}`,
        occurred_at: now,
        metadata: {
          input_hash: receipt?.input_hash ?? null,
          input_fingerprint: current.input_fingerprint,
          template_hash: template.template_hash,
          approval_receipt_id: receipt?.receipt_id ?? null,
        },
      });
      const timeline = appendTimeline(tx, {
        event_id: `matter.timeline.builder_approval:${tenantId}:${matterId}:${approvalId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        occurred_at: now,
        type: `matter.builder.approval.${normalizedDecision}`,
        title: normalizedDecision === "approved" ? "문서 초안 승인" : "문서 초안 반려",
        source_ref: approvalId,
        source_object_id: current.draft_id,
        safe_summary: {
          decision: normalizedDecision,
          approval_receipt_id: receipt?.receipt_id ?? null,
          template_hash: template.template_hash,
        },
      });
      const response = Object.freeze({
        outcome: normalizedDecision,
        item: safeDraft(updatedDraft),
        approval_request: safeApproval(updatedRequest),
        approval_receipt: safeApprovalReceipt(receipt),
        audit_event: audit,
        timeline_event: timeline,
      });
      tx.recordIdempotency({
        tenant_id: tenantId,
        idempotency_key: key,
        operation: "matter_builder_approval_decision",
        object_type: "MatterBuilderApprovalRequest",
        object_id: approvalId,
        actor_id: actorId,
        request_fingerprint: fingerprint,
        response,
        created_at: now,
      });
      return response;
    });
  }

  async function publishBuilderDraftToVault({
    tenant_id,
    matter_id,
    draft_id,
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(draft_id, "draft_id", { max: 128 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const key = requiredString(idempotency_key, "idempotency_key", { max: 200 });
    const now = occurred_at ?? clock();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const template = (() => {
      try {
        return lookupTemplate(repository, { tenantId, templateId: current.template_id, version: current.template_version });
      } catch {
        return null;
      }
    })();
    const approval = current.approval_request_id
      ? repository.get({
          tenant_id: tenantId,
          model_type: "MatterBuilderApprovalRequest",
          resource_id: current.approval_request_id,
        })
      : null;
    const vaultLink = getMatterVaultLink({ repository, tenant_id: tenantId, matter_id: matterId });
    if (
      current.approval_state !== "approved"
      || !current.approval_receipt
      || approval?.status !== "approved"
      || approval.approval_receipt?.receipt_id !== current.approval_receipt.receipt_id
      || approval.input_fingerprint !== current.input_fingerprint
      || current.approval_receipt.input_fingerprint !== current.input_fingerprint
      || current.approval_receipt.template_hash !== current.template_hash
      || !template
      || !vaultLink
      || !dmsRuntime
    ) {
      return blockedPublish({
        repository,
        current,
        actorId,
        now,
        reason: !template
          ? "approved_template_version_required"
          : !vaultLink || !dmsRuntime
            ? "vault_runtime_required"
            : "owner_approval_receipt_required",
      });
    }
    const canonical = approvalInput({ current, template, generatedAt: current.approval_receipt.approved_at });
    if (canonical.input_hash !== current.approval_receipt.input_hash) throw new Error("approved input hash does not match builder draft");
    const fingerprint = hashObject({
      draft_id: draftId,
      input_hash: canonical.input_hash,
      template_hash: template.template_hash,
      approval_receipt_id: current.approval_receipt.receipt_id,
    });
    const attemptId = `builder_publish_attempt_${hashObject({ tenantId, key }).slice(0, 32)}`;
    const existingAttempt = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderPublishAttempt", resource_id: attemptId });
    if (existingAttempt && existingAttempt.request_fingerprint !== fingerprint) {
      throw new Error("idempotency key cannot be reused for changed builder content");
    }
    const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: key });
    if (replay) {
      if (replay.operation !== "matter_builder_docx_publish" || replay.request_fingerprint !== fingerprint) {
        throw new Error("idempotency key cannot be reused for changed builder content");
      }
      return Object.freeze({ ...replay.response, outcome: "idempotent_replay" });
    }
    const rendered = await renderAgreementDocx({
      tenant_id: tenantId,
      matter_id: matterId,
      draft_id: draftId,
      title: current.title,
      template,
      merge_data: current.merge_data,
      signer_role_refs: current.signer_role_refs,
      generated_at: current.approval_receipt.approved_at,
    });
    const artifactId = `builder_artifact_${hashObject({ tenantId, draftId, inputHash: rendered.input_hash }).slice(0, 32)}`;
    const documentId = `document:builder:${hashObject({ tenantId, draftId, inputHash: rendered.input_hash }).slice(0, 32)}`;
    const versionId = `version:${documentId}:1`;
    const fileObjectId = `file:${versionId}`;
    const outboxId = `matter.builder.docx.finalized:${tenantId}:${draftId}:${rendered.input_hash.slice(0, 16)}`;
    const existingArtifact = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderArtifact", resource_id: artifactId });
    if (existingArtifact?.sha256 && existingArtifact.sha256 !== rendered.sha256) {
      throw new Error("deterministic DOCX hash does not match the generated artifact record");
    }
    const artifact = existingArtifact ?? repository.create({
      model_type: "MatterBuilderArtifact",
      resource_id: artifactId,
      artifact_id: artifactId,
      tenant_id: tenantId,
      matter_id: matterId,
      draft_id: draftId,
      document_id: null,
      version_id: null,
      file_object_id: null,
      filename: rendered.filename,
      mime_type: rendered.mime_type,
      byte_size: rendered.byte_size,
      sha256: rendered.sha256,
      generator_version: DOCX_GENERATOR_VERSION,
      template_id: template.template_id,
      template_version: template.template_version,
      template_hash: template.template_hash,
      input_hash: rendered.input_hash,
      approval_receipt_id: current.approval_receipt.receipt_id,
      signer_snapshot: canonicalValue(current.signer_role_refs),
      signer_snapshot_count: current.signer_role_refs.length,
      signature_anchor_manifest: rendered.signature_anchors,
      status: "generated",
      immutable: false,
      generated_at: now,
      document_bytes_included: false,
      raw_body_included: false,
      raw_contact_values_included: false,
      raw_storage_path_included: false,
    });
    const outbox = repository.upsert({
      model_type: "MatterBuilderPublishOutbox",
      resource_id: outboxId,
      outbox_event_id: outboxId,
      aggregate_id: draftId,
      tenant_id: tenantId,
      matter_id: matterId,
      event_type: "matter.builder.docx.finalization",
      status: "pending",
      attempt_count: Number(repository.get({ tenant_id: tenantId, model_type: "MatterBuilderPublishOutbox", resource_id: outboxId })?.attempt_count ?? 0) + 1,
      artifact_id: artifactId,
      occurred_at: now,
      raw_payload_included: false,
      document_bytes_included: false,
      raw_contact_values_included: false,
    });
    repository.upsert({
      model_type: "MatterBuilderPublishAttempt",
      resource_id: attemptId,
      attempt_id: attemptId,
      tenant_id: tenantId,
      matter_id: matterId,
      draft_id: draftId,
      idempotency_key_hash: hashObject(key),
      request_fingerprint: fingerprint,
      status: "pending",
      artifact_id: artifactId,
      created_at: existingAttempt?.created_at ?? now,
      updated_at: now,
      raw_payload_included: false,
      document_bytes_included: false,
    });
    const upload = dmsRuntime.upload_runtime?.uploadDocument
      ? (args) => dmsRuntime.upload_runtime.uploadDocument(args)
      : dmsRuntime.uploadDocument
        ? (args) => dmsRuntime.uploadDocument(args)
        : (args) => uploadDocument({ repository: dmsRuntime.repository, storage: dmsRuntime.storage, ...args });
    let uploaded;
    try {
      uploaded = await upload({
        document: {
          tenant_id: tenantId,
          matter_id: matterId,
          document_id: documentId,
          current_version_id: versionId,
          version_number: 1,
          workspace_id: vaultLink.vault_workspace_id,
          folder_id: vaultLink.default_folder_id,
          title: current.title,
          status: "active",
          mime_type: rendered.mime_type,
          permission_envelope_id: vaultLink.permission_envelope_id,
          audit_trace_id: `matter.builder.docx:${draftId}:${rendered.input_hash.slice(0, 16)}`,
          source_policy: "source_required",
          source_module: "matter-builder",
          source_artifact_id: artifactId,
          template_id: template.template_id,
          template_version: template.template_version,
          template_hash: template.template_hash,
          input_hash: rendered.input_hash,
          approval_receipt_id: current.approval_receipt.receipt_id,
          signer_snapshot_count: current.signer_role_refs.length,
          immutable_original: true,
        },
        bytes: rendered.bytes,
        actor_id: actorId,
        idempotency_key: `matter-builder-docx:${draftId}:${rendered.input_hash}`,
        object_id: `object:${versionId}`,
        session_id: `dms-upload:${artifactId}`,
        version_number: 1,
      });
    } catch (error) {
      repository.update(
        { tenant_id: tenantId, model_type: "MatterBuilderPublishOutbox", resource_id: outboxId },
        { status: "failed", failed_at: now, safe_error_code: error?.code ?? "DMS_UPLOAD_FAILED" },
      );
      repository.update(
        { tenant_id: tenantId, model_type: "MatterBuilderPublishAttempt", resource_id: attemptId },
        { status: "failed", updated_at: now, safe_error_code: error?.code ?? "DMS_UPLOAD_FAILED" },
      );
      repository.update(
        { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
        { publish_state: "approved_unpublished", updated_at: now },
      );
      throw error;
    }
    if (uploaded.file_object?.sha256 !== rendered.sha256 || uploaded.version?.sha256 !== rendered.sha256) {
      throw new Error("Vault finalized hash does not match generated DOCX hash");
    }
    const finalizedArtifact = repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderArtifact", resource_id: artifactId },
      {
        document_id: uploaded.document.document_id,
        version_id: uploaded.version.version_id,
        file_object_id: uploaded.file_object.file_object_id,
        status: "finalized",
        immutable: true,
        finalized_at: now,
      },
    );
    const completedOutbox = repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderPublishOutbox", resource_id: outboxId },
      { status: "complete", completed_at: now },
    );
    const finalizedDraft = repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
      {
        status: "finalized",
        publish_state: "complete",
        artifact_id: artifactId,
        immutable: true,
        finalized_at: now,
        updated_at: now,
      },
    );
    repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderPublishAttempt", resource_id: attemptId },
      { status: "complete", updated_at: now, document_id: uploaded.document.document_id },
    );
    const audit = appendAudit(repository, {
      event_id: `matter.builder.docx.finalized:${tenantId}:${matterId}:${artifactId}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.builder.docx.finalized",
      object_type: "MatterBuilderArtifact",
      object_id: artifactId,
      reason: "approved_builder_docx_uploaded_to_vault",
      occurred_at: now,
      metadata: {
        document_id: uploaded.document.document_id,
        version_id: uploaded.version.version_id,
        file_object_id: uploaded.file_object.file_object_id,
        sha256: rendered.sha256,
        template_hash: template.template_hash,
        input_hash: rendered.input_hash,
        approval_receipt_id: current.approval_receipt.receipt_id,
      },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.builder_docx_finalized:${tenantId}:${matterId}:${artifactId}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.builder.docx.finalized",
      title: "승인 문서 DMS 확정",
      source_ref: artifactId,
      source_object_id: uploaded.document.document_id,
      safe_summary: {
        artifact_id: artifactId,
        document_id: uploaded.document.document_id,
        version_id: uploaded.version.version_id,
        sha256: rendered.sha256,
        approval_receipt_id: current.approval_receipt.receipt_id,
      },
    });
    const response = Object.freeze({
      outcome: uploaded.idempotent_replay ? "idempotent_replay" : "created",
      ui_state: "complete",
      item: safeDraft(finalizedDraft),
      approval_receipt: safeApprovalReceipt(current.approval_receipt),
      artifact: safeArtifact(finalizedArtifact),
      outbox_event: safeOutbox(completedOutbox),
      publish_state: Object.freeze({
        status: "complete",
        owner_approval_ref_included: false,
        vault_document_created: true,
        immutable_document_version_created: true,
        document_bytes_included: false,
        raw_storage_path_included: false,
        production_ready_claim: false,
      }),
      audit_event: audit,
      timeline_event: timeline,
    });
    repository.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: key,
      operation: "matter_builder_docx_publish",
      object_type: "MatterBuilderArtifact",
      object_id: artifactId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: now,
    });
    return response;
  }

  return Object.freeze({
    listDocumentTemplates,
    createBuilderDraft,
    patchBuilderDraft,
    previewBuilderDraft,
    requestBuilderApproval,
    listBuilderApprovalRequests,
    decideBuilderApproval,
    publishBuilderDraftToVault,
  });
}
