import { createHash } from "node:crypto";
import { createApprovedDocumentBuilderService } from "./approved-document-builder-service.js";

const EMAIL_TEMPLATES = Object.freeze([
  Object.freeze({
    template_id: "matter_status_update_email",
    label: "진행상황 안내 메일",
    category: "email",
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
  return String(value ?? fallback ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
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
  return text ? `입력 본문 ${Math.min(text.length, 999)}자` : null;
}

function templateById(templateId) {
  const normalized = requiredString(templateId, "template_id");
  const template = EMAIL_TEMPLATES.find((item) => item.template_id === normalized);
  if (!template) throw new Error("template not found");
  return template;
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

export function createMatterDocumentEmailBuilderService({
  repository,
  dmsRuntime = null,
  templateVersions = [],
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository) throw new TypeError("repository is required");
  const approvedDocumentBuilder = createApprovedDocumentBuilderService({ repository, dmsRuntime, templateVersions, clock });

  function createEmailDraft({ tenant_id, matter_id, draft, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? clock();
    const template = templateById(draft?.template_id ?? "matter_status_update_email");
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
    const now = occurred_at ?? clock();
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
    const now = occurred_at ?? clock();
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
    ...approvedDocumentBuilder,
    createEmailDraft,
    patchEmailDraft,
    sendEmailDraftBlocked,
  });
}
