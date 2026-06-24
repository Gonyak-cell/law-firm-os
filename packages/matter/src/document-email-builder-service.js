import { createHash } from "node:crypto";

const TEMPLATE_REGISTRY = Object.freeze([
  Object.freeze({
    template_id: "matter_engagement_letter",
    label: "위임계약서",
    category: "document",
    merge_fields: Object.freeze(["client_name", "matter_title", "responsible_attorney"]),
    requires_approval: true,
  }),
  Object.freeze({
    template_id: "matter_status_update_email",
    label: "진행상황 안내 메일",
    category: "email",
    merge_fields: Object.freeze(["client_name", "matter_title", "next_deadline"]),
    requires_approval: true,
  }),
]);

const PROVIDER_BLOCKED_STATE = Object.freeze({
  provider_configured: false,
  external_send_state: "provider_blocked",
  provider_credentials_included: false,
  raw_provider_payload_included: false,
});

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function safeId(value, fallback) {
  const text = String(value ?? fallback ?? "").trim();
  return text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function safeText(value, field, { min = 2, max = 240 } = {}) {
  const text = requiredString(value, field);
  if (text.length < min || text.length > max) throw new TypeError(`${field} is invalid`);
  if (/<script\b|javascript:/i.test(text)) throw new TypeError(`${field} includes unsafe content`);
  return text;
}

function bodyHash(value) {
  const text = String(value ?? "").trim();
  return text ? createHash("sha256").update(text).digest("hex") : null;
}

function bodyExcerpt(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  return `입력 본문 ${Math.min(text.length, 999)}자`;
}

function templateById(templateId) {
  const normalized = requiredString(templateId, "template_id");
  const template = TEMPLATE_REGISTRY.find((item) => item.template_id === normalized);
  if (!template) throw new Error("template not found");
  return template;
}

function safeTemplate(template) {
  return Object.freeze({
    template_id: template.template_id,
    label: template.label,
    category: template.category,
    merge_field_count: template.merge_fields.length,
    merge_fields: Object.freeze([...template.merge_fields]),
    requires_approval: template.requires_approval === true,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
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
    occurred_at: event.occurred_at ?? new Date().toISOString(),
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
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    source_ref: event.source_ref ?? null,
    source_module: "matter-builder",
    source_object_id: event.source_object_id ?? null,
    safe_summary: Object.freeze(event.safe_summary ?? {}),
    raw_body_included: false,
    raw_provider_payload_included: false,
  });
}

function safeDraft(record) {
  return Object.freeze({
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    template_id: record.template_id,
    title: record.title,
    status: record.status,
    safe_excerpt: record.safe_excerpt ?? null,
    merge_field_count: record.merge_field_count ?? 0,
    approval_state: record.approval_state ?? "approval_required",
    publish_state: record.publish_state ?? "owner_blocked",
    raw_body_included: false,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
    production_ready_claim: false,
  });
}

function safeApproval(record) {
  return Object.freeze({
    approval_request_id: record.approval_request_id,
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    status: record.status,
    reviewer_role: record.reviewer_role ?? "owner",
    reviewer_user_ref_included: false,
    owner_approval_ref_included: false,
    raw_body_included: false,
    production_ready_claim: false,
  });
}

function safeEmailDraft(record) {
  return Object.freeze({
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    template_id: record.template_id,
    subject: record.subject,
    status: record.status,
    safe_excerpt: record.safe_excerpt ?? null,
    recipient_count: record.recipient_count ?? 0,
    provider_state: PROVIDER_BLOCKED_STATE,
    direct_personal_contact_identifier_included: false,
    raw_body_included: false,
    raw_provider_payload_included: false,
    production_ready_claim: false,
  });
}

function safePreview(record, template) {
  return Object.freeze({
    draft_id: record.draft_id,
    matter_id: record.matter_id,
    title: record.title,
    template_label: template.label,
    preview_sections: Object.freeze([
      "표지",
      template.category === "email" ? "본문 요약" : "핵심 조항",
      "승인 필요 항목",
    ]),
    safe_excerpt: record.safe_excerpt ?? null,
    merge_field_count: record.merge_field_count ?? template.merge_fields.length,
    raw_body_included: false,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    document_bytes_included: false,
    production_ready_claim: false,
  });
}

export function createMatterDocumentEmailBuilderService({ repository } = {}) {
  if (!repository) throw new TypeError("repository is required");

  function listDocumentTemplates() {
    return Object.freeze(TEMPLATE_REGISTRY.map(safeTemplate));
  }

  function createBuilderDraft({ tenant_id, matter_id, draft, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const template = templateById(draft?.template_id ?? "matter_engagement_letter");
    if (template.category !== "document") throw new TypeError("template category is invalid");
    const draftId = safeId(draft?.draft_id, `builder_draft_${Date.now().toString(36)}`);
    const body = draft?.body ?? draft?.content ?? `Draft from ${template.label}`;
    const record = repository.upsert({
      model_type: "MatterBuilderDraft",
      resource_id: draftId,
      draft_id: draftId,
      tenant_id: tenantId,
      matter_id: matterId,
      template_id: template.template_id,
      title: safeText(draft?.title ?? template.label, "title"),
      status: "draft",
      safe_excerpt: bodyExcerpt(body),
      body_hash: bodyHash(body),
      merge_field_count: template.merge_fields.length,
      approval_state: "approval_required",
      publish_state: "owner_blocked",
      created_by: actorId,
      created_at: now,
      updated_at: now,
      raw_body_included: false,
      raw_template_body_included: false,
      raw_contact_values_included: false,
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
      metadata: { template_id: template.template_id, approval_state: "approval_required" },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.builder_draft:${tenantId}:${matterId}:${draftId}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.builder.draft",
      title: record.title,
      source_ref: draftId,
      source_object_id: draftId,
      safe_summary: { template_id: template.template_id, approval_state: "approval_required" },
    });
    return Object.freeze({ item: safeDraft(record), audit_event: audit, timeline_event: timeline });
  }

  function patchBuilderDraft({ tenant_id, matter_id, draft_id, patch, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const draftId = requiredString(draft_id, "draft_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const body = patch?.body ?? patch?.content ?? null;
    const updated = repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
      {
        title: patch?.title ? safeText(patch.title, "title") : current.title,
        safe_excerpt: body ? bodyExcerpt(body) : current.safe_excerpt,
        body_hash: body ? bodyHash(body) : current.body_hash,
        status: patch?.status === "ready_for_review" ? "ready_for_review" : current.status,
        approval_state: "approval_required",
        publish_state: "owner_blocked",
        updated_by: actorId,
        updated_at: now,
        raw_body_included: false,
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
      metadata: { changed_fields: Object.keys(patch ?? {}) },
    });
    return Object.freeze({ item: safeDraft(updated), audit_event: audit });
  }

  function previewBuilderDraft({ tenant_id, matter_id, draft_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const draftId = requiredString(draft_id, "draft_id");
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    return Object.freeze({ item: safePreview(current, templateById(current.template_id)) });
  }

  function requestBuilderApproval({ tenant_id, matter_id, draft_id, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const draftId = requiredString(draft_id, "draft_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const approvalId = safeId(`builder_approval_${draftId}`, `builder_approval_${Date.now().toString(36)}`);
    const request = repository.upsert({
      model_type: "MatterBuilderApprovalRequest",
      resource_id: approvalId,
      approval_request_id: approvalId,
      tenant_id: tenantId,
      matter_id: matterId,
      draft_id: draftId,
      status: "pending_owner_approval",
      reviewer_role: "owner",
      created_by: actorId,
      created_at: now,
      raw_body_included: false,
    });
    repository.update(
      { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
      { status: "ready_for_review", approval_state: "approval_required", publish_state: "owner_blocked", updated_at: now },
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
      metadata: { owner_approval_ref_included: false },
    });
    return Object.freeze({
      outcome: "approval_required",
      ui_state: "owner_blocked",
      item: safeDraft(current),
      approval_request: safeApproval(request),
      audit_event: audit,
    });
  }

  function listBuilderApprovalRequests({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    return Object.freeze(
      repository
        .list({ tenant_id: tenantId, matter_id: matterId, model_type: "MatterBuilderApprovalRequest" })
        .filter((record) => record.hidden_from_actor !== true && record.silent !== true)
        .map(safeApproval)
        .sort((left, right) => String(right.approval_request_id).localeCompare(String(left.approval_request_id))),
    );
  }

  function publishBuilderDraftToVault({ tenant_id, matter_id, draft_id, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const draftId = requiredString(draft_id, "draft_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const audit = appendAudit(repository, {
      event_id: `matter.builder.publish.blocked:${tenantId}:${matterId}:${draftId}:${now}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.builder.publish.blocked",
      object_type: "MatterBuilderDraft",
      object_id: draftId,
      decision: "blocked",
      reason: "owner_approval_receipt_required",
      occurred_at: now,
      metadata: { owner_approval_ref_included: false, vault_document_created: false },
    });
    return Object.freeze({
      outcome: "owner_blocked",
      ui_state: "owner_blocked",
      item: safeDraft(current),
      publish_state: Object.freeze({
        status: "owner_blocked",
        owner_approval_ref_included: false,
        vault_document_created: false,
        document_bytes_included: false,
        production_ready_claim: false,
      }),
      audit_event: audit,
    });
  }

  function createEmailDraft({ tenant_id, matter_id, draft, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const template = templateById(draft?.template_id ?? "matter_status_update_email");
    if (template.category !== "email") throw new TypeError("template category is invalid");
    const draftId = safeId(draft?.draft_id, `email_draft_${Date.now().toString(36)}`);
    const body = draft?.body ?? "Matter status update";
    const record = repository.upsert({
      model_type: "MatterEmailDraft",
      resource_id: draftId,
      draft_id: draftId,
      tenant_id: tenantId,
      matter_id: matterId,
      template_id: template.template_id,
      subject: safeText(draft?.subject ?? template.label, "subject"),
      status: "draft",
      safe_excerpt: bodyExcerpt(body),
      body_hash: bodyHash(body),
      recipient_count: Array.isArray(draft?.recipient_refs) ? draft.recipient_refs.length : 0,
      created_by: actorId,
      created_at: now,
      updated_at: now,
      raw_body_included: false,
      raw_provider_payload_included: false,
      direct_personal_contact_identifier_included: false,
    });
    const audit = appendAudit(repository, {
      event_id: `matter.email_draft.created:${tenantId}:${matterId}:${draftId}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.email_draft.created",
      object_type: "MatterEmailDraft",
      object_id: draftId,
      reason: "email_draft_created_provider_blocked",
      occurred_at: now,
      metadata: { external_send_state: "provider_blocked" },
    });
    return Object.freeze({ item: safeEmailDraft(record), audit_event: audit });
  }

  function patchEmailDraft({ tenant_id, matter_id, draft_id, patch, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const draftId = requiredString(draft_id, "draft_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterEmailDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("email draft not found");
    const body = patch?.body ?? null;
    const updated = repository.update(
      { tenant_id: tenantId, model_type: "MatterEmailDraft", resource_id: draftId },
      {
        subject: patch?.subject ? safeText(patch.subject, "subject") : current.subject,
        safe_excerpt: body ? bodyExcerpt(body) : current.safe_excerpt,
        body_hash: body ? bodyHash(body) : current.body_hash,
        recipient_count: Array.isArray(patch?.recipient_refs) ? patch.recipient_refs.length : current.recipient_count,
        updated_by: actorId,
        updated_at: now,
        raw_body_included: false,
        raw_provider_payload_included: false,
      },
    );
    const audit = appendAudit(repository, {
      event_id: `matter.email_draft.patched:${tenantId}:${matterId}:${draftId}:${now}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.email_draft.patched",
      object_type: "MatterEmailDraft",
      object_id: draftId,
      reason: "email_draft_updated_provider_blocked",
      occurred_at: now,
      metadata: { changed_fields: Object.keys(patch ?? {}) },
    });
    return Object.freeze({ item: safeEmailDraft(updated), audit_event: audit });
  }

  function sendEmailDraftBlocked({ tenant_id, matter_id, draft_id, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const draftId = requiredString(draft_id, "draft_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterEmailDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("email draft not found");
    const audit = appendAudit(repository, {
      event_id: `matter.email_draft.send.blocked:${tenantId}:${matterId}:${draftId}:${now}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.email_draft.send.blocked",
      object_type: "MatterEmailDraft",
      object_id: draftId,
      decision: "blocked",
      reason: "external_provider_receipt_required",
      occurred_at: now,
      metadata: { provider_configured: false, external_send_state: "provider_blocked" },
    });
    return Object.freeze({
      outcome: "provider_blocked",
      ui_state: "provider_blocked",
      item: safeEmailDraft(current),
      provider_state: PROVIDER_BLOCKED_STATE,
      audit_event: audit,
    });
  }

  return Object.freeze({
    listDocumentTemplates,
    createBuilderDraft,
    patchBuilderDraft,
    previewBuilderDraft,
    requestBuilderApproval,
    listBuilderApprovalRequests,
    publishBuilderDraftToVault,
    createEmailDraft,
    patchEmailDraft,
    sendEmailDraftBlocked,
  });
}
