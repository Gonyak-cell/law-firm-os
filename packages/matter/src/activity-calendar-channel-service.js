import { createHash } from "node:crypto";
import { changeMatterDeadline } from "./calendar-service.js";
import { confirmCriticalDeadlineChange } from "./deadline-dual-control.js";
import { createMatterCalendarEvent, createMatterTask } from "./model.js";
import { transitionMatterTask } from "./task-service.js";

const ACTIVITY_TYPES = Object.freeze(["task", "note", "email_log", "call"]);
const ACTIVITY_STATUSES = Object.freeze(["todo", "in_progress", "done", "cancelled"]);
const CALENDAR_STATUSES = Object.freeze(["scheduled", "rescheduled", "cancelled", "completed"]);
const CHANNEL_PROVIDER_STATE = Object.freeze({
  provider_configured: false,
  external_send_state: "provider_blocked",
  provider_credentials_included: false,
  raw_provider_payload_included: false,
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function safeId(value, fallback) {
  const text = String(value ?? fallback ?? "").trim();
  return text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function safeText(value, field, { min = 2, max = 160 } = {}) {
  const text = requiredString(value, field);
  if (text.length < min || text.length > max) throw new TypeError(`${field} is invalid`);
  return text;
}

function parseIso(value, field) {
  const text = requiredString(value, field);
  if (Number.isNaN(Date.parse(text))) throw new TypeError(`${field} must be ISO date`);
  return text;
}

function bodyExcerpt(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.slice(0, 80);
}

function bodyHash(value) {
  const text = String(value ?? "").trim();
  return text ? createHash("sha256").update(text).digest("hex") : null;
}

function listRecords(repository, tenantId, matterId, modelType) {
  return repository
    .list({ tenant_id: tenantId, matter_id: matterId, model_type: modelType })
    .filter((record) => record.hidden_from_actor !== true && record.silent !== true);
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
      provider_event_id_included: false,
      raw_provider_payload_included: false,
      direct_personal_contact_identifier_included: false,
    },
  });
}

function appendTimeline(repository, event) {
  return repository.create({
    model_type: "MatterTimelineEvent",
    resource_id: event.event_id,
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    matter_id: event.matter_id,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    source_ref: event.source_ref ?? null,
    source_module: event.source_module ?? "matter",
    source_object_id: event.source_object_id ?? null,
    safe_summary: Object.freeze(event.safe_summary ?? {}),
    raw_body_included: false,
    raw_provider_payload_included: false,
  });
}

function safeActivity(record) {
  const activityId = record.activity_id ?? record.task_id ?? record.event_id ?? record.resource_id;
  return Object.freeze({
    activity_id: activityId,
    matter_id: record.matter_id,
    activity_type: record.activity_type ?? (record.model_type === "MatterTask" ? "task" : "note"),
    title: record.title,
    status: record.status,
    due_at: record.due_at ?? record.starts_at ?? null,
    assigned_to_label: record.assigned_to ? "지정됨" : "미지정",
    safe_excerpt: record.safe_excerpt ?? null,
    raw_body_included: false,
    provider_event_id_included: false,
    external_send_state: record.external_send_state ?? "not_applicable",
    production_ready_claim: false,
  });
}

function safeCalendarEvent(record) {
  return Object.freeze({
    event_id: record.event_id,
    matter_id: record.matter_id,
    title: record.title,
    status: record.status,
    starts_at: record.starts_at,
    ends_at: record.ends_at ?? null,
    legal_consequence: record.legal_consequence ?? "internal",
    criticality: record.criticality ?? "standard",
    reminder_rule: record.reminder_rule ?? "none",
    provider_sync_state: record.provider_sync_state ?? "provider_blocked",
    provider_event_id_included: false,
    raw_provider_payload_included: false,
    production_ready_claim: false,
  });
}

function safeDeadline(record) {
  return Object.freeze({
    deadline_id: record.event_id ?? record.task_id ?? record.resource_id,
    matter_id: record.matter_id,
    title: record.title,
    status: record.status,
    due_at: record.starts_at ?? record.due_at ?? null,
    criticality: record.criticality ?? "standard",
    legal_consequence: record.legal_consequence ?? "internal",
    dual_control_required: (record.criticality ?? "standard") === "critical",
    source_ref_included: false,
    production_ready_claim: false,
  });
}

function safeChannelMessage(record) {
  return Object.freeze({
    message_id: record.message_id,
    thread_id: record.thread_id,
    matter_id: record.matter_id,
    author_role: record.author_role ?? "internal",
    safe_message_excerpt: record.safe_message_excerpt ?? null,
    created_at: record.created_at,
    external_send_state: record.external_send_state ?? "internal_only",
    raw_provider_payload_included: false,
    direct_personal_contact_identifier_included: false,
    production_ready_claim: false,
  });
}

export function createMatterActivityCalendarChannelService({ repository } = {}) {
  if (!repository) throw new TypeError("repository is required");

  function listActivities({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const items = [
      ...listRecords(repository, tenantId, matterId, "MatterTask"),
      ...listRecords(repository, tenantId, matterId, "MatterActivity"),
      ...listRecords(repository, tenantId, matterId, "MatterCalendarEvent").map((event) => ({
        ...event,
        activity_type: "event",
        due_at: event.starts_at,
      })),
      ...listRecords(repository, tenantId, matterId, "MatterChannelMessage").map((message) => ({
        ...message,
        activity_type: "channel_message",
        title: "Channel message",
        status: "done",
        due_at: message.created_at,
      })),
    ].map(safeActivity);
    return Object.freeze(items.sort((left, right) => String(right.due_at ?? "").localeCompare(String(left.due_at ?? ""))));
  }

  function createActivity({ tenant_id, matter_id, activity, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const type = activity?.activity_type ?? "task";
    if (!ACTIVITY_TYPES.includes(type)) throw new TypeError("activity_type is invalid");
    const now = occurred_at ?? new Date().toISOString();
    const title = safeText(activity?.title, "title");
    const dueAt = activity?.due_at ? parseIso(activity.due_at, "due_at") : null;
    let record;
    if (type === "task") {
      const taskId = safeId(activity?.activity_id, `activity_task_${Date.now().toString(36)}`);
      record = repository.upsert(createMatterTask({
        task_id: taskId,
        tenant_id: tenantId,
        matter_id: matterId,
        title,
        status: activity?.status && ACTIVITY_STATUSES.includes(activity.status) ? activity.status : "todo",
        created_by: actorId,
        assigned_to: activity?.assigned_to ?? null,
        due_at: dueAt,
        source_ref: "sf_b_w03_activity",
      }));
    } else {
      const activityId = safeId(activity?.activity_id, `activity_${type}_${Date.now().toString(36)}`);
      record = repository.upsert({
        model_type: "MatterActivity",
        resource_id: activityId,
        activity_id: activityId,
        tenant_id: tenantId,
        matter_id: matterId,
        activity_type: type,
        title,
        status: activity?.status && ACTIVITY_STATUSES.includes(activity.status) ? activity.status : "todo",
        due_at: dueAt,
        safe_excerpt: bodyExcerpt(activity?.body),
        body_hash: bodyHash(activity?.body),
        external_send_state: type === "email_log" ? "provider_blocked" : "internal_only",
        created_by: actorId,
        created_at: now,
        raw_body_included: false,
        provider_payload_included: false,
      });
    }
    const safe = safeActivity(record);
    const audit = appendAudit(repository, {
      event_id: `matter.activity.created:${tenantId}:${matterId}:${safe.activity_id}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.activity.created",
      object_type: type === "task" ? "MatterTask" : "MatterActivity",
      object_id: safe.activity_id,
      reason: "activity_created",
      occurred_at: now,
      metadata: { activity_type: type },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.activity:${tenantId}:${matterId}:${safe.activity_id}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: `matter.activity.${type}`,
      title,
      source_ref: safe.activity_id,
      source_object_id: safe.activity_id,
      safe_summary: { activity_type: type, status: safe.status },
    });
    return Object.freeze({ item: safe, audit_event: audit, timeline_event: timeline });
  }

  function patchActivity({ tenant_id, matter_id, activity_id, patch, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const activityId = requiredString(activity_id, "activity_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    let current = repository.get({ tenant_id: tenantId, model_type: "MatterTask", task_id: activityId });
    let record;
    if (current) {
      const toStatus = patch?.status && ACTIVITY_STATUSES.includes(patch.status) ? patch.status : null;
      if (toStatus && toStatus !== current.status) {
        record = transitionMatterTask({
          repository,
          task: current,
          to_status: toStatus,
          actor_id: actorId,
          reason: "activity_status_updated",
          audit: { append: (event) => repository.appendAudit({ ...event, event_id: `matter.task.transition:${tenantId}:${matterId}:${activityId}:${now}` }) },
        });
      } else {
        record = repository.update(
          { tenant_id: tenantId, model_type: "MatterTask", task_id: activityId },
          {
            title: patch?.title ? safeText(patch.title, "title") : current.title,
            due_at: patch?.due_at ? parseIso(patch.due_at, "due_at") : current.due_at,
            assigned_to: patch?.assigned_to ?? current.assigned_to,
          },
        );
      }
    } else {
      current = repository.get({ tenant_id: tenantId, model_type: "MatterActivity", resource_id: activityId });
      if (!current) throw new Error("activity not found");
      record = repository.update(
        { tenant_id: tenantId, model_type: "MatterActivity", resource_id: activityId },
        {
          title: patch?.title ? safeText(patch.title, "title") : current.title,
          status: patch?.status && ACTIVITY_STATUSES.includes(patch.status) ? patch.status : current.status,
          due_at: patch?.due_at ? parseIso(patch.due_at, "due_at") : current.due_at,
          safe_excerpt: patch?.body ? bodyExcerpt(patch.body) : current.safe_excerpt,
          body_hash: patch?.body ? bodyHash(patch.body) : current.body_hash,
          updated_at: now,
          raw_body_included: false,
        },
      );
    }
    const safe = safeActivity(record);
    const audit = appendAudit(repository, {
      event_id: `matter.activity.patched:${tenantId}:${matterId}:${activityId}:${now}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.activity.patched",
      object_type: record.model_type,
      object_id: activityId,
      reason: "activity_updated",
      occurred_at: now,
      metadata: { changed_fields: Object.keys(patch ?? {}) },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.activity_patched:${tenantId}:${matterId}:${activityId}:${now}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.activity.updated",
      title: safe.title,
      source_ref: activityId,
      source_object_id: activityId,
      safe_summary: { status: safe.status },
    });
    return Object.freeze({ item: safe, audit_event: audit, timeline_event: timeline });
  }

  function listCalendarEvents({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    return Object.freeze(
      listRecords(repository, tenantId, matterId, "MatterCalendarEvent")
        .map(safeCalendarEvent)
        .sort((left, right) => String(left.starts_at ?? "").localeCompare(String(right.starts_at ?? ""))),
    );
  }

  function createCalendarEvent({ tenant_id, matter_id, event, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const eventId = safeId(event?.event_id, `calendar_${Date.now().toString(36)}`);
    const startsAt = parseIso(event?.starts_at, "starts_at");
    const endsAt = event?.ends_at ? parseIso(event.ends_at, "ends_at") : null;
    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) throw new TypeError("ends_at must be after starts_at");
    const record = repository.upsert({
      ...createMatterCalendarEvent({
        event_id: eventId,
        tenant_id: tenantId,
        matter_id: matterId,
        title: safeText(event?.title, "title"),
        status: event?.status && CALENDAR_STATUSES.includes(event.status) ? event.status : "scheduled",
        starts_at: startsAt,
        ends_at: endsAt,
        source_ref: "sf_b_w03_calendar",
      }),
      legal_consequence: event?.legal_consequence ?? "internal",
      criticality: event?.criticality ?? "standard",
      reminder_rule: event?.reminder_rule ?? "none",
      provider_sync_state: "provider_blocked",
      provider_event_id_included: false,
      raw_provider_payload_included: false,
    });
    const safe = safeCalendarEvent(record);
    const audit = appendAudit(repository, {
      event_id: `matter.calendar.created:${tenantId}:${matterId}:${eventId}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.calendar.created",
      object_type: "MatterCalendarEvent",
      object_id: eventId,
      reason: "calendar_event_created",
      occurred_at: now,
      metadata: { criticality: safe.criticality, provider_sync_state: "provider_blocked" },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.calendar:${tenantId}:${matterId}:${eventId}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.calendar.created",
      title: safe.title,
      source_ref: eventId,
      source_object_id: eventId,
      safe_summary: { starts_at: safe.starts_at, criticality: safe.criticality },
    });
    return Object.freeze({ item: safe, audit_event: audit, timeline_event: timeline });
  }

  function patchCalendarEvent({ tenant_id, matter_id, event_id, patch, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const eventId = requiredString(event_id, "event_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterCalendarEvent", event_id: eventId });
    if (!current) throw new Error("calendar event not found");
    const changesDate = Boolean(patch?.starts_at && patch.starts_at !== current.starts_at);
    const critical = (current.criticality ?? "standard") === "critical" || patch?.criticality === "critical";
    if (critical && changesDate && patch?.dual_control_confirmed !== true) {
      const requestId = `deadline_change:${eventId}`;
      const request = repository.upsert({
        model_type: "MatterDeadlineChangeRequest",
        resource_id: requestId,
        request_id: requestId,
        tenant_id: tenantId,
        matter_id: matterId,
        event_id: eventId,
        requester_user_id: actorId,
        requested_starts_at: parseIso(patch.starts_at, "starts_at"),
        requested_ends_at: patch.ends_at ? parseIso(patch.ends_at, "ends_at") : current.ends_at ?? null,
        status: "pending_confirmation",
        created_at: now,
      });
      const audit = appendAudit(repository, {
        event_id: `matter.deadline.change_requested:${tenantId}:${matterId}:${eventId}:${now}`,
        tenant_id: tenantId,
        actor_id: actorId,
        action: "matter.deadline.change_requested",
        object_type: "MatterDeadlineChangeRequest",
        object_id: requestId,
        reason: "critical_deadline_requires_confirmation",
        occurred_at: now,
        metadata: { dual_control_required: true },
      });
      return Object.freeze({
        outcome: "approval_required",
        ui_state: "approval_required",
        item: safeCalendarEvent(current),
        deadline_change_request: Object.freeze({
          request_id: request.request_id,
          event_id: request.event_id,
          status: request.status,
          dual_control_required: true,
          requester_user_ref_included: false,
          production_ready_claim: false,
        }),
        audit_event: audit,
      });
    }
    const updated = changeMatterDeadline({
      repository,
      event: current,
      new_starts_at: patch?.starts_at ? parseIso(patch.starts_at, "starts_at") : current.starts_at,
      new_ends_at: patch?.ends_at ? parseIso(patch.ends_at, "ends_at") : current.ends_at,
      actor_id: actorId,
      reason: "calendar_event_updated",
      audit: { append: (event) => repository.appendAudit({ ...event, event_id: `matter.deadline.change:${tenantId}:${matterId}:${eventId}:${now}` }) },
    });
    const safe = safeCalendarEvent({
      ...updated,
      legal_consequence: patch?.legal_consequence ?? current.legal_consequence,
      criticality: patch?.criticality ?? current.criticality,
      reminder_rule: patch?.reminder_rule ?? current.reminder_rule,
      provider_sync_state: "provider_blocked",
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.calendar_patched:${tenantId}:${matterId}:${eventId}:${now}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.calendar.updated",
      title: safe.title,
      source_ref: eventId,
      source_object_id: eventId,
      safe_summary: { starts_at: safe.starts_at },
    });
    return Object.freeze({ outcome: "updated", item: safe, audit_event: null, timeline_event: timeline });
  }

  function listDeadlines({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    return Object.freeze(
      [
        ...listRecords(repository, tenantId, matterId, "MatterCalendarEvent").filter((event) => event.criticality === "critical" || event.legal_consequence !== "internal"),
        ...listRecords(repository, tenantId, matterId, "MatterTask").filter((task) => Boolean(task.due_at)),
      ]
        .map(safeDeadline)
        .sort((left, right) => String(left.due_at ?? "").localeCompare(String(right.due_at ?? ""))),
    );
  }

  function confirmDeadlineChange({ tenant_id, matter_id, deadline_id, confirmer_user_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const eventId = requiredString(deadline_id, "deadline_id");
    const confirmerId = requiredString(confirmer_user_id, "confirmer_user_id");
    const now = occurred_at ?? new Date().toISOString();
    const requestId = `deadline_change:${eventId}`;
    const request = repository.get({ tenant_id: tenantId, model_type: "MatterDeadlineChangeRequest", resource_id: requestId });
    if (!request || request.status !== "pending_confirmation") throw new Error("deadline change request not found");
    const confirmation = confirmCriticalDeadlineChange({
      tenant_id: tenantId,
      matter_id: matterId,
      event_id: eventId,
      requester_user_id: request.requester_user_id,
      confirmer_user_id: confirmerId,
      audit_ref: `audit:${tenantId}:${matterId}:${eventId}:${now}`,
    });
    const event = repository.get({ tenant_id: tenantId, model_type: "MatterCalendarEvent", event_id: eventId });
    const updated = changeMatterDeadline({
      repository,
      event,
      new_starts_at: request.requested_starts_at,
      new_ends_at: request.requested_ends_at ?? event.ends_at,
      actor_id: confirmerId,
      reason: "critical_deadline_confirmed",
      audit: { append: (auditEvent) => repository.appendAudit({ ...auditEvent, event_id: `matter.deadline.confirmed:${tenantId}:${matterId}:${eventId}:${now}` }) },
    });
    repository.update({ tenant_id: tenantId, model_type: "MatterDeadlineChangeRequest", resource_id: requestId }, { status: "confirmed", confirmed_at: now });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.deadline_confirmed:${tenantId}:${matterId}:${eventId}:${now}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.deadline.confirmed",
      title: updated.title,
      source_ref: eventId,
      source_object_id: eventId,
      safe_summary: { dual_control_satisfied: true },
    });
    return Object.freeze({
      item: safeDeadline({ ...updated, criticality: event.criticality, legal_consequence: event.legal_consequence }),
      confirmation: Object.freeze({
        outcome: confirmation.outcome,
        dual_control_satisfied: confirmation.dual_control_satisfied,
        requester_user_ref_included: false,
        confirmer_user_ref_included: false,
        production_ready_claim: false,
      }),
      timeline_event: timeline,
    });
  }

  function listChannel({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const messages = listRecords(repository, tenantId, matterId, "MatterChannelMessage").map(safeChannelMessage);
    return Object.freeze({
      matter_id: matterId,
      thread_id: `matter-channel:${matterId}`,
      provider_state: CHANNEL_PROVIDER_STATE,
      messages: Object.freeze(messages.sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")))),
      production_ready_claim: false,
    });
  }

  function createChannelMessage({ tenant_id, matter_id, message, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const messageId = safeId(message?.message_id, `channel_message_${Date.now().toString(36)}`);
    const threadId = safeId(message?.thread_id, `matter-channel:${matterId}`);
    const record = repository.upsert({
      model_type: "MatterChannelMessage",
      resource_id: messageId,
      message_id: messageId,
      thread_id: threadId,
      tenant_id: tenantId,
      matter_id: matterId,
      author_role: message?.author_role ?? "internal",
      safe_message_excerpt: bodyExcerpt(message?.body ?? message?.message),
      message_body_hash: bodyHash(message?.body ?? message?.message),
      created_by: actorId,
      created_at: now,
      external_send_state: "internal_only",
      raw_provider_payload_included: false,
      direct_personal_contact_identifier_included: false,
    });
    const safe = safeChannelMessage(record);
    const audit = appendAudit(repository, {
      event_id: `matter.channel.message.created:${tenantId}:${matterId}:${messageId}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.channel.message.created",
      object_type: "MatterChannelMessage",
      object_id: messageId,
      reason: "internal_channel_message_created",
      occurred_at: now,
      metadata: { external_send_state: "internal_only" },
    });
    const timeline = appendTimeline(repository, {
      event_id: `matter.timeline.channel:${tenantId}:${matterId}:${messageId}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: now,
      type: "matter.channel.message",
      title: "Channel message",
      source_ref: messageId,
      source_object_id: messageId,
      safe_summary: { external_send_state: "internal_only" },
    });
    return Object.freeze({ item: safe, audit_event: audit, timeline_event: timeline });
  }

  function providerSyncBlocked({ tenant_id, matter_id, actor_id, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const actorId = requiredString(actor_id, "actor_id");
    const now = occurred_at ?? new Date().toISOString();
    const audit = appendAudit(repository, {
      event_id: `matter.channel.provider_sync.blocked:${tenantId}:${matterId}:${now}`,
      tenant_id: tenantId,
      actor_id: actorId,
      action: "matter.channel.provider_sync.blocked",
      object_type: "MatterChannel",
      object_id: matterId,
      decision: "blocked",
      reason: "provider_receipt_required",
      occurred_at: now,
      metadata: { provider_configured: false },
    });
    return Object.freeze({
      outcome: "provider_blocked",
      ui_state: "provider_blocked",
      provider_state: CHANNEL_PROVIDER_STATE,
      audit_event: audit,
    });
  }

  return Object.freeze({
    listActivities,
    createActivity,
    patchActivity,
    listCalendarEvents,
    createCalendarEvent,
    patchCalendarEvent,
    listDeadlines,
    confirmDeadlineChange,
    listChannel,
    createChannelMessage,
    providerSyncBlocked,
  });
}
