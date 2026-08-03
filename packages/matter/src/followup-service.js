import { createHash } from "node:crypto";
import { assertMatterIsoTimestamp } from "./model.js";

export const MATTER_FOLLOW_UP_STATUSES = Object.freeze([
  "open",
  "waiting_client",
  "waiting_firm",
  "snoozed",
  "done",
]);

export const MATTER_FOLLOW_UP_SAVED_VIEWS = Object.freeze([
  "due_today",
  "waiting_client",
  "stale_7d",
]);

const FOLLOW_UP_CHANNELS = Object.freeze([
  "email",
  "call",
  "meeting",
  "message",
  "portal",
  "request",
  "note",
]);
const CONTACT_KINDS = Object.freeze(["external_contact", "internal_note"]);
const CONTACT_DIRECTIONS = Object.freeze(["inbound", "outbound", "internal"]);
const CONTACT_VISIBILITIES = Object.freeze(["client", "internal"]);
const DELIVERY_STATES = Object.freeze([
  "not_applicable",
  "received",
  "manual_recorded",
  "pending",
  "sent",
  "delivered",
  "failed",
  "provider_blocked",
]);
const SUCCESSFUL_DELIVERY_STATES = new Set(["received", "manual_recorded", "sent", "delivered"]);
const FOLLOW_UP_MUTABLE_FIELDS = new Set([
  "title",
  "channel",
  "status",
  "client_id",
  "owner_id",
  "backup_owner_id",
  "next_action",
  "next_action_at",
  "snoozed_until",
  "source_ref",
]);
const DAY_MS = 24 * 60 * 60 * 1000;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function optionalString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function safeText(value, field, { max = 240, optional = false } = {}) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text && optional) return null;
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > max) throw new TypeError(`${field} must be at most ${max} characters`);
  return text;
}

function isoTimestamp(value, field) {
  const text = requiredString(value, field);
  assertMatterIsoTimestamp(text, field);
  return new Date(text).toISOString();
}

function optionalIsoTimestamp(value, field) {
  return value == null || value === "" ? null : isoTimestamp(value, field);
}

function optionalTaskDueAt(value) {
  if (value == null || value === "") return null;
  const text = requiredString(value, "task.due_at");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text) return text;
  }
  return isoTimestamp(text, "task.due_at");
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value ?? null;
}

function fingerprint(operation, objectId, payload) {
  return `matter-followup:v1:${sha256(JSON.stringify(canonical({ operation, object_id: objectId, payload })))}`;
}

function resolvedNow(clock, occurredAt) {
  const value = occurredAt ?? clock();
  return isoTimestamp(value instanceof Date ? value.toISOString() : value, "occurred_at");
}

function repositoryRef(tenantId, modelType, resourceId) {
  return { tenant_id: tenantId, model_type: modelType, resource_id: resourceId };
}

function getScopedRecord(repository, { tenantId, matterId, modelType, resourceId, label }) {
  const record = repository.get(repositoryRef(tenantId, modelType, resourceId));
  if (!record || (matterId && record.matter_id !== matterId)) {
    throw new Error(`${label} not found: ${resourceId}`);
  }
  return record;
}

function canonicalMatterClientId(matter, ...declaredClientIds) {
  const canonicalClientId = optionalString(matter?.client_id);
  if (declaredClientIds
    .map(optionalString)
    .filter(Boolean)
    .some((declaredClientId) => declaredClientId !== canonicalClientId)) {
    throw new TypeError("client_id must match the canonical Matter client_id");
  }
  return canonicalClientId;
}

function assertActiveHandoffOwner(repository, { tenantId, matterId, ownerId, field }) {
  const activePerson = repository.list({
    tenant_id: tenantId,
    model_type: "Person",
  }).some((person) =>
    (person.person_id ?? person.resource_id) === ownerId
      && person.status === "active");
  const activeMember = repository.list({
    tenant_id: tenantId,
    model_type: "MatterMember",
    matter_id: matterId,
  }).some((member) => member.user_id === ownerId && member.status === "active");
  if (!activePerson && !activeMember) {
    throw new TypeError(
      `${field} must reference an active tenant Person or same-Matter MatterMember`,
    );
  }
}

function matterDeepLink(record) {
  return `matter://matter/${encodeURIComponent(record.matter_id)}?tenant=${encodeURIComponent(record.tenant_id)}`;
}

function isFutureSnooze(record, now) {
  return record.status === "snoozed"
    && record.snoozed_until
    && Date.parse(record.snoozed_until) > Date.parse(now);
}

function projectFollowUp(record, now) {
  const overdue = record.status !== "done"
    && !isFutureSnooze(record, now)
    && Boolean(record.next_action_at)
    && Date.parse(record.next_action_at) < Date.parse(now);
  return Object.freeze({
    followup_id: record.followup_id,
    tenant_id: record.tenant_id,
    matter_id: record.matter_id,
    client_id: record.client_id ?? null,
    title: record.title,
    channel: record.channel,
    status: record.status,
    owner_id: record.owner_id ?? null,
    backup_owner_id: record.backup_owner_id ?? null,
    next_action: record.next_action ?? null,
    next_action_at: record.next_action_at ?? null,
    snoozed_until: record.snoozed_until ?? null,
    closed_at: record.closed_at ?? null,
    linked_task_id: record.linked_task_id ?? null,
    source_ref: record.source_ref ?? null,
    created_at: record.created_at,
    updated_at: record.updated_at,
    overdue,
    deep_link: matterDeepLink(record),
  });
}

function projectContact(record) {
  return Object.freeze({
    contact_id: record.contact_id,
    tenant_id: record.tenant_id,
    matter_id: record.matter_id,
    client_id: record.client_id ?? null,
    followup_id: record.followup_id ?? null,
    entry_kind: record.entry_kind,
    channel: record.channel,
    direction: record.direction,
    visibility: record.visibility,
    delivery_state: record.delivery_state,
    contact_successful: record.contact_successful,
    safe_excerpt: record.safe_excerpt ?? null,
    occurred_at: record.occurred_at,
    deep_link: matterDeepLink(record),
    raw_body_included: false,
    raw_provider_payload_included: false,
  });
}

function projectLastContact(record) {
  if (!record) return null;
  return Object.freeze({
    tenant_id: record.tenant_id,
    scope_type: record.scope_type,
    scope_id: record.scope_id,
    matter_id: record.matter_id ?? null,
    client_id: record.client_id ?? null,
    contact_id: record.contact_id,
    last_contact_at: record.last_contact_at,
  });
}

function normalizeContact({ tenantId, matterId, clientId, contact, actorId, contactId, now }) {
  const entryKind = contact?.entry_kind ?? contact?.kind ?? "external_contact";
  if (!CONTACT_KINDS.includes(entryKind)) throw new TypeError("entry_kind is invalid");
  const channel = contact?.channel ?? contact?.type ?? (entryKind === "internal_note" ? "note" : null);
  if (!FOLLOW_UP_CHANNELS.includes(channel)) throw new TypeError("channel is invalid");

  const direction = contact?.direction ?? (entryKind === "internal_note" ? "internal" : null);
  if (!CONTACT_DIRECTIONS.includes(direction)) throw new TypeError("direction is invalid");
  const visibility = contact?.visibility ?? (entryKind === "internal_note" ? "internal" : "client");
  if (!CONTACT_VISIBILITIES.includes(visibility)) throw new TypeError("visibility is invalid");

  let deliveryState = contact?.delivery_state ?? contact?.provider_state;
  if (!deliveryState) {
    deliveryState = entryKind === "internal_note"
      ? "not_applicable"
      : direction === "inbound"
        ? "received"
        : "manual_recorded";
  }
  if (!DELIVERY_STATES.includes(deliveryState)) throw new TypeError("delivery_state is invalid");
  if (entryKind === "internal_note") {
    if (direction !== "internal") throw new TypeError("internal_note direction must be internal");
    if (visibility !== "internal") throw new TypeError("internal_note visibility must be internal");
    if (deliveryState !== "not_applicable") {
      throw new TypeError("internal_note delivery_state must be not_applicable");
    }
  } else if (direction === "internal") {
    throw new TypeError("external_contact direction must be inbound or outbound");
  }

  const occurredAt = isoTimestamp(contact?.occurred_at ?? now, "contact.occurred_at");
  const summary = safeText(contact?.summary ?? contact?.note ?? contact?.body, "contact.summary", {
    max: 500,
    optional: true,
  });
  const successful = entryKind === "external_contact" && SUCCESSFUL_DELIVERY_STATES.has(deliveryState);
  return Object.freeze({
    model_type: "MatterFollowUpContact",
    resource_id: contactId,
    contact_id: contactId,
    tenant_id: tenantId,
    matter_id: matterId,
    client_id: optionalString(clientId),
    followup_id: optionalString(contact?.followup_id),
    entry_kind: entryKind,
    channel,
    direction,
    visibility,
    delivery_state: deliveryState,
    contact_successful: successful,
    safe_excerpt: summary,
    body_hash: summary ? sha256(summary) : null,
    occurred_at: occurredAt,
    created_by: actorId,
    created_at: now,
    raw_body_included: false,
    raw_provider_payload_included: false,
    direct_personal_contact_identifier_included: false,
  });
}

function localDateKey(timestamp, formatter) {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export class MatterFollowUpIdempotencyError extends Error {
  constructor() {
    super("Idempotency key was already used for another Matter follow-up request");
    this.name = "MatterFollowUpIdempotencyError";
    this.code = "MATTER_FOLLOW_UP_IDEMPOTENCY_CONFLICT";
  }
}

export function validateMatterFollowUp(input = {}, { now = new Date().toISOString() } = {}) {
  const tenantId = requiredString(input.tenant_id, "tenant_id");
  const matterId = requiredString(input.matter_id, "matter_id");
  const followupId = requiredString(input.followup_id ?? input.resource_id, "followup_id");
  const title = safeText(input.title, "title");
  const status = input.status ?? "open";
  if (!MATTER_FOLLOW_UP_STATUSES.includes(status)) throw new TypeError("status is invalid");
  const channel = input.channel ?? input.type;
  if (!FOLLOW_UP_CHANNELS.includes(channel)) throw new TypeError("channel is invalid");

  const ownerId = optionalString(input.owner_id);
  const nextActionAt = optionalIsoTimestamp(input.next_action_at, "next_action_at");
  if ((status === "waiting_client" || status === "waiting_firm") && (!ownerId || !nextActionAt)) {
    throw new TypeError(`${status} requires owner_id and next_action_at`);
  }
  const normalizedNow = isoTimestamp(now, "now");
  const snoozedUntil = status === "snoozed"
    ? optionalIsoTimestamp(input.snoozed_until, "snoozed_until")
    : null;
  if (status === "snoozed" && !snoozedUntil) {
    throw new TypeError("snoozed requires snoozed_until");
  }
  const closedAt = status === "done"
    ? optionalIsoTimestamp(input.closed_at, "closed_at") ?? normalizedNow
    : null;
  const createdAt = isoTimestamp(input.created_at ?? normalizedNow, "created_at");
  const createdBy = requiredString(input.created_by, "created_by");

  return Object.freeze({
    model_type: "MatterFollowUp",
    resource_id: followupId,
    followup_id: followupId,
    tenant_id: tenantId,
    matter_id: matterId,
    client_id: optionalString(input.client_id),
    title,
    channel,
    status,
    owner_id: ownerId,
    backup_owner_id: optionalString(input.backup_owner_id),
    next_action: safeText(input.next_action, "next_action", { max: 500, optional: true }),
    next_action_at: nextActionAt,
    snoozed_until: snoozedUntil,
    closed_at: closedAt,
    linked_task_id: optionalString(input.linked_task_id),
    source_ref: optionalString(input.source_ref),
    created_by: createdBy,
    created_at: createdAt,
    updated_by: requiredString(input.updated_by ?? createdBy, "updated_by"),
    updated_at: isoTimestamp(input.updated_at ?? createdAt, "updated_at"),
  });
}

export function createMatterFollowUpService({
  repository,
  createTask,
  clock = () => new Date().toISOString(),
  timeZone = "Asia/Seoul",
} = {}) {
  if (!repository) throw new TypeError("repository is required");
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function executeCommand({
    tenantId,
    idempotencyKey,
    operation,
    objectType,
    objectId,
    actorId,
    now,
    payload,
    auditMetadata = {},
  }, mutate) {
    const tenant_id = requiredString(tenantId, "tenant_id");
    const idempotency_key = requiredString(idempotencyKey, "idempotency_key");
    const actor_id = requiredString(actorId, "actor_id");
    const requestFingerprint = fingerprint(operation, objectId, payload);
    const existing = repository.getIdempotency({ tenant_id, idempotency_key });
    if (existing) {
      if (existing.request_fingerprint !== requestFingerprint || existing.operation !== operation) {
        throw new MatterFollowUpIdempotencyError();
      }
      return Object.freeze({ ...clone(existing.response), idempotent_replay: true });
    }

    return repository.transaction((transaction) => {
      const result = mutate(transaction);
      const keyHash = sha256(`${tenant_id}:${idempotency_key}`);
      const auditEvent = transaction.appendAudit({
        event_id: `matter.followup:${operation}:${keyHash.slice(0, 24)}`,
        tenant_id,
        actor_id,
        action: operation,
        object_type: objectType,
        object_id: objectId,
        decision: "allow",
        reason: `${operation}_accepted`,
        occurred_at: now,
        metadata: {
          ...auditMetadata,
          idempotency_key_hash: keyHash,
          raw_body_included: false,
          raw_provider_payload_included: false,
          direct_personal_contact_identifier_included: false,
        },
      });
      const response = Object.freeze({
        ...result,
        audit_event: auditEvent,
        idempotent_replay: false,
      });
      transaction.recordIdempotency({
        tenant_id,
        idempotency_key,
        operation,
        object_type: objectType,
        object_id: objectId,
        actor_id,
        request_fingerprint: requestFingerprint,
        response,
        created_at: now,
      });
      return response;
    });
  }

  function createFollowUp({
    tenant_id,
    matter_id,
    followup,
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const now = resolvedNow(clock, occurred_at);
    const followupId = optionalString(followup?.followup_id)
      ?? `followup_${sha256(`${tenantId}:${idempotency_key}`).slice(0, 20)}`;
    return executeCommand({
      tenantId,
      idempotencyKey: idempotency_key,
      operation: "matter.followup.create",
      objectType: "MatterFollowUp",
      objectId: followupId,
      actorId: actor_id,
      now,
      payload: { matter_id: matterId, followup },
      auditMetadata: { matter_id: matterId },
    }, (transaction) => {
      const matter = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "Matter",
        resourceId: matterId,
        label: "Matter",
      });
      const clientId = canonicalMatterClientId(matter, followup?.client_id);
      const record = validateMatterFollowUp({
        ...followup,
        followup_id: followupId,
        tenant_id: tenantId,
        matter_id: matterId,
        client_id: clientId,
        created_by: actor_id,
        created_at: now,
        updated_by: actor_id,
        updated_at: now,
      }, { now });
      if (record.owner_id) {
        assertActiveHandoffOwner(transaction, {
          tenantId,
          matterId,
          ownerId: record.owner_id,
          field: "owner_id",
        });
      }
      if (record.backup_owner_id) {
        assertActiveHandoffOwner(transaction, {
          tenantId,
          matterId,
          ownerId: record.backup_owner_id,
          field: "backup_owner_id",
        });
      }
      const persisted = transaction.create(record);
      return { item: projectFollowUp(persisted, now) };
    });
  }

  function updateFollowUp({
    tenant_id,
    matter_id,
    followup_id,
    patch,
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const followupId = requiredString(followup_id, "followup_id");
    const nextPatch = patch ?? {};
    for (const field of Object.keys(nextPatch)) {
      if (!FOLLOW_UP_MUTABLE_FIELDS.has(field)) throw new TypeError(`patch.${field} is not mutable`);
    }
    const now = resolvedNow(clock, occurred_at);
    return executeCommand({
      tenantId,
      idempotencyKey: idempotency_key,
      operation: "matter.followup.update",
      objectType: "MatterFollowUp",
      objectId: followupId,
      actorId: actor_id,
      now,
      payload: { matter_id: matterId, followup_id: followupId, patch: nextPatch },
      auditMetadata: { matter_id: matterId, changed_fields: Object.keys(nextPatch).sort() },
    }, (transaction) => {
      const matter = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "Matter",
        resourceId: matterId,
        label: "Matter",
      });
      const current = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "MatterFollowUp",
        resourceId: followupId,
        label: "follow-up",
      });
      const clientId = canonicalMatterClientId(
        matter,
        current.client_id,
        nextPatch.client_id,
      );
      const nextStatus = nextPatch.status ?? current.status;
      const record = validateMatterFollowUp({
        ...current,
        ...nextPatch,
        client_id: clientId,
        status: nextStatus,
        closed_at: nextStatus === "done"
          ? current.status === "done" ? current.closed_at : now
          : null,
        snoozed_until: nextStatus === "snoozed"
          ? nextPatch.snoozed_until ?? current.snoozed_until
          : null,
        updated_by: actor_id,
        updated_at: now,
      }, { now });
      if (record.owner_id) {
        assertActiveHandoffOwner(transaction, {
          tenantId,
          matterId,
          ownerId: record.owner_id,
          field: "owner_id",
        });
      }
      if (record.backup_owner_id) {
        assertActiveHandoffOwner(transaction, {
          tenantId,
          matterId,
          ownerId: record.backup_owner_id,
          field: "backup_owner_id",
        });
      }
      const persisted = transaction.update(
        repositoryRef(tenantId, "MatterFollowUp", followupId),
        record,
      );
      return { item: projectFollowUp(persisted, now) };
    });
  }

  function getFollowUp({ tenant_id, matter_id, followup_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const followupId = requiredString(followup_id, "followup_id");
    const record = getScopedRecord(repository, {
      tenantId,
      matterId,
      modelType: "MatterFollowUp",
      resourceId: followupId,
      label: "follow-up",
    });
    return projectFollowUp(record, resolvedNow(clock));
  }

  function deleteFollowUp({
    tenant_id,
    matter_id,
    followup_id,
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const followupId = requiredString(followup_id, "followup_id");
    const now = resolvedNow(clock, occurred_at);
    return executeCommand({
      tenantId,
      idempotencyKey: idempotency_key,
      operation: "matter.followup.delete",
      objectType: "MatterFollowUp",
      objectId: followupId,
      actorId: actor_id,
      now,
      payload: { matter_id: matterId, followup_id: followupId },
      auditMetadata: { matter_id: matterId },
    }, (transaction) => {
      const current = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "MatterFollowUp",
        resourceId: followupId,
        label: "follow-up",
      });
      transaction.delete(repositoryRef(tenantId, "MatterFollowUp", followupId));
      return { item: projectFollowUp(current, now), deleted: true };
    });
  }

  function listFollowUps({ tenant_id, matter_id, owner_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const now = resolvedNow(clock);
    return Object.freeze(
      repository.list({ tenant_id: tenantId, model_type: "MatterFollowUp", matter_id })
        .filter((record) => !owner_id || record.owner_id === owner_id)
        .map((record) => projectFollowUp(record, now))
        .sort((left, right) => left.followup_id.localeCompare(right.followup_id)),
    );
  }

  function upsertLastContactProjection(transaction, contactRecord, scopeType, scopeId) {
    if (!scopeId || !contactRecord.contact_successful) return null;
    const resourceId = `${scopeType}:${scopeId}`;
    const ref = repositoryRef(contactRecord.tenant_id, "MatterLastContactProjection", resourceId);
    const current = transaction.get(ref);
    if (current && Date.parse(current.last_contact_at) >= Date.parse(contactRecord.occurred_at)) {
      return current;
    }
    return transaction.upsert({
      model_type: "MatterLastContactProjection",
      resource_id: resourceId,
      tenant_id: contactRecord.tenant_id,
      scope_type: scopeType,
      scope_id: scopeId,
      matter_id: scopeType === "matter" ? scopeId : null,
      client_id: scopeType === "client" ? scopeId : null,
      contact_id: contactRecord.contact_id,
      last_contact_at: contactRecord.occurred_at,
      updated_at: contactRecord.created_at,
    });
  }

  function recordContact({
    tenant_id,
    matter_id,
    client_id,
    contact,
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const now = resolvedNow(clock, occurred_at);
    const contactId = optionalString(contact?.contact_id)
      ?? `contact_${sha256(`${tenantId}:${idempotency_key}`).slice(0, 20)}`;
    return executeCommand({
      tenantId,
      idempotencyKey: idempotency_key,
      operation: "matter.followup.contact.record",
      objectType: "MatterFollowUpContact",
      objectId: contactId,
      actorId: actor_id,
      now,
      payload: { matter_id: matterId, client_id, contact },
      auditMetadata: { matter_id: matterId },
    }, (transaction) => {
      const matter = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "Matter",
        resourceId: matterId,
        label: "matter",
      });
      const followupId = optionalString(contact?.followup_id);
      const linkedFollowUp = followupId
        ? getScopedRecord(transaction, {
          tenantId,
          matterId,
          modelType: "MatterFollowUp",
          resourceId: followupId,
          label: "follow-up",
        })
        : null;
      const canonicalClientId = canonicalMatterClientId(
        matter,
        client_id,
        contact?.client_id,
        linkedFollowUp?.client_id,
      );
      const record = normalizeContact({
        tenantId,
        matterId,
        clientId: canonicalClientId,
        contact,
        actorId: actor_id,
        contactId,
        now,
      });
      const persisted = transaction.create(record);
      const timelineEvent = transaction.upsert({
        model_type: "MatterTimelineEvent",
        resource_id: `matter.followup.contact:${contactId}`,
        event_id: `matter.followup.contact:${contactId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        occurred_at: persisted.occurred_at,
        type: persisted.entry_kind === "internal_note"
          ? "matter.followup.internal_note"
          : "matter.followup.external_contact",
        title: persisted.entry_kind === "internal_note" ? "Internal note" : "External contact",
        source_ref: persisted.followup_id
          ? `followup:${persisted.followup_id}`
          : `contact:${contactId}`,
        source_object_id: contactId,
        visibility: persisted.visibility,
        required_scope: persisted.entry_kind === "internal_note" ? "matter:internal" : null,
        safe_summary: {
          entry_kind: persisted.entry_kind,
          channel: persisted.channel,
          direction: persisted.direction,
          delivery_state: persisted.delivery_state,
          contact_successful: persisted.contact_successful,
          safe_excerpt: persisted.safe_excerpt,
        },
        raw_body_included: false,
        raw_provider_payload_included: false,
      });
      const matterProjection = upsertLastContactProjection(
        transaction,
        persisted,
        "matter",
        matterId,
      );
      const clientProjection = upsertLastContactProjection(
        transaction,
        persisted,
        "client",
        persisted.client_id,
      );
      return {
        item: projectContact(persisted),
        timeline_event: timelineEvent,
        matter_last_contact: projectLastContact(matterProjection),
        client_last_contact: projectLastContact(clientProjection),
      };
    });
  }

  function listContacts({ tenant_id, matter_id, client_id, viewer = "internal" } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    if (!["internal", "client"].includes(viewer)) throw new TypeError("viewer is invalid");
    return Object.freeze(
      repository.list({ tenant_id: tenantId, model_type: "MatterFollowUpContact", matter_id })
        .filter((record) => !client_id || record.client_id === client_id)
        .filter((record) => viewer !== "client"
          || (record.entry_kind === "external_contact" && record.visibility === "client"))
        .map(projectContact)
        .sort((left, right) =>
          right.occurred_at.localeCompare(left.occurred_at)
          || left.contact_id.localeCompare(right.contact_id)),
    );
  }

  function getLastContact({ tenant_id, matter_id, client_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = optionalString(matter_id);
    const clientId = optionalString(client_id);
    if (Boolean(matterId) === Boolean(clientId)) {
      throw new TypeError("exactly one of matter_id or client_id is required");
    }
    const scopeType = matterId ? "matter" : "client";
    const scopeId = matterId ?? clientId;
    return projectLastContact(repository.get(
      repositoryRef(tenantId, "MatterLastContactProjection", `${scopeType}:${scopeId}`),
    ));
  }

  function listSavedView({ tenant_id, view, owner_id, matter_id, now: at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    if (!MATTER_FOLLOW_UP_SAVED_VIEWS.includes(view)) throw new TypeError("view is invalid");
    const now = resolvedNow(clock, at);
    const today = localDateKey(now, dateFormatter);
    const staleThreshold = Date.parse(now) - (7 * DAY_MS);
    const lastContacts = new Map(
      repository.list({ tenant_id: tenantId, model_type: "MatterLastContactProjection" })
        .filter((record) => record.scope_type === "matter")
        .map((record) => [record.scope_id, record.last_contact_at]),
    );
    const rows = repository.list({ tenant_id: tenantId, model_type: "MatterFollowUp", matter_id })
      .filter((record) => record.status !== "done")
      .filter((record) => !owner_id || record.owner_id === owner_id)
      .filter((record) => !isFutureSnooze(record, now))
      .map((record) => Object.freeze({
        ...projectFollowUp(record, now),
        last_contact_at: lastContacts.get(record.matter_id) ?? null,
      }))
      .filter((record) => {
        if (view === "due_today") {
          return Boolean(record.next_action_at)
            && localDateKey(record.next_action_at, dateFormatter) <= today;
        }
        if (view === "waiting_client") return record.status === "waiting_client";
        return !record.last_contact_at || Date.parse(record.last_contact_at) <= staleThreshold;
      });

    rows.sort((left, right) => {
      if (view === "stale_7d") {
        return String(left.last_contact_at ?? "").localeCompare(String(right.last_contact_at ?? ""))
          || left.followup_id.localeCompare(right.followup_id);
      }
      return String(left.next_action_at ?? "").localeCompare(String(right.next_action_at ?? ""))
        || left.followup_id.localeCompare(right.followup_id);
    });
    return Object.freeze(rows);
  }

  function convertRequestToTask({
    tenant_id,
    matter_id,
    followup_id,
    task = {},
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const followupId = requiredString(followup_id, "followup_id");
    const now = resolvedNow(clock, occurred_at);
    const sourceRef = `followup:${followupId}`;
    const taskId = `task_followup_${sha256(`${tenantId}:${sourceRef}`).slice(0, 20)}`;
    return executeCommand({
      tenantId,
      idempotencyKey: idempotency_key,
      operation: "matter.followup.convert_to_task",
      objectType: "MatterFollowUp",
      objectId: followupId,
      actorId: actor_id,
      now,
      payload: { matter_id: matterId, followup_id: followupId, task },
      auditMetadata: { matter_id: matterId, task_id: taskId },
    }, (transaction) => {
      const current = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "MatterFollowUp",
        resourceId: followupId,
        label: "follow-up",
      });
      let persistedTask = current.linked_task_id
        ? transaction.get(repositoryRef(tenantId, "MatterTask", current.linked_task_id))
        : transaction.get(repositoryRef(tenantId, "MatterTask", taskId));
      if (persistedTask && persistedTask.source_ref !== sourceRef) {
        throw new Error("linked MatterTask source_ref does not match follow-up");
      }
      if (persistedTask && persistedTask.matter_id !== matterId) {
        throw new Error("linked MatterTask matter_id does not match follow-up");
      }
      if (!persistedTask) {
        if (typeof createTask !== "function") throw new TypeError("createTask is required");
        const taskInput = Object.freeze({
          task_id: taskId,
          tenant_id: tenantId,
          matter_id: matterId,
          title: safeText(task.title ?? current.next_action ?? current.title, "task.title"),
          status: task.status ?? "todo",
          created_by: actor_id,
          created_at: now,
          assigned_to: task.assigned_to ?? current.owner_id ?? null,
          due_at: optionalTaskDueAt(task.due_at ?? current.next_action_at),
          source_ref: sourceRef,
        });
        const created = createTask({
          repository: transaction,
          task: taskInput,
          actor_id,
          occurred_at: now,
        });
        const returnedTask = created?.item ?? created;
        persistedTask = transaction.get(repositoryRef(tenantId, "MatterTask", taskId));
        if (!persistedTask || returnedTask?.task_id !== taskId) {
          throw new Error("createTask must persist and return the requested MatterTask");
        }
      }
      const followupRecord = transaction.update(
        repositoryRef(tenantId, "MatterFollowUp", followupId),
        {
          linked_task_id: persistedTask.task_id,
          updated_by: actor_id,
          updated_at: now,
        },
      );
      const relation = transaction.upsert({
        model_type: "MatterTimelineEvent",
        resource_id: `matter.followup.task:${followupId}`,
        event_id: `matter.followup.task:${followupId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        occurred_at: now,
        type: "matter.followup.task_linked",
        title: followupRecord.title,
        source_ref: sourceRef,
        source_object_id: persistedTask.task_id,
        safe_summary: {
          followup_id: followupId,
          task_id: persistedTask.task_id,
        },
        raw_body_included: false,
        raw_provider_payload_included: false,
      });
      return {
        item: projectFollowUp(followupRecord, now),
        task: persistedTask,
        timeline_event: relation,
      };
    });
  }

  function handoffFollowUp({
    tenant_id,
    matter_id,
    followup_id,
    to_owner_id,
    backup_owner_id,
    reason,
    actor_id,
    idempotency_key,
    occurred_at,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = requiredString(matter_id, "matter_id");
    const followupId = requiredString(followup_id, "followup_id");
    const toOwnerId = requiredString(to_owner_id, "to_owner_id");
    const currentForValidation = getScopedRecord(repository, {
      tenantId,
      matterId,
      modelType: "MatterFollowUp",
      resourceId: followupId,
      label: "follow-up",
    });
    const nextBackupOwnerId = backup_owner_id === undefined
      ? optionalString(currentForValidation.backup_owner_id)
      : optionalString(backup_owner_id);
    assertActiveHandoffOwner(repository, {
      tenantId,
      matterId,
      ownerId: toOwnerId,
      field: "to_owner_id",
    });
    if (nextBackupOwnerId) {
      assertActiveHandoffOwner(repository, {
        tenantId,
        matterId,
        ownerId: nextBackupOwnerId,
        field: "backup_owner_id",
      });
    }
    const handoffReason = safeText(reason, "reason", { max: 500 });
    const now = resolvedNow(clock, occurred_at);
    return executeCommand({
      tenantId,
      idempotencyKey: idempotency_key,
      operation: "matter.followup.handoff",
      objectType: "MatterFollowUp",
      objectId: followupId,
      actorId: actor_id,
      now,
      payload: {
        matter_id: matterId,
        followup_id: followupId,
        to_owner_id: toOwnerId,
        backup_owner_id: nextBackupOwnerId,
        reason: handoffReason,
      },
      auditMetadata: { matter_id: matterId, to_owner_id: toOwnerId },
    }, (transaction) => {
      const current = getScopedRecord(transaction, {
        tenantId,
        matterId,
        modelType: "MatterFollowUp",
        resourceId: followupId,
        label: "follow-up",
      });
      const previous = transaction.list({
        tenant_id: tenantId,
        model_type: "MatterFollowUpHandoff",
        matter_id: matterId,
      }).find((event) => event.followup_id === followupId && event.to_owner_id === toOwnerId);
      if (current.owner_id === toOwnerId && !previous) {
        throw new Error("follow-up is already assigned to to_owner_id");
      }
      if (current.owner_id === toOwnerId && previous) {
        return {
          item: projectFollowUp(current, now),
          handoff_event: previous,
          timeline_event: transaction.get(repositoryRef(
            tenantId,
            "MatterTimelineEvent",
            `matter.followup.handoff:${previous.handoff_id}`,
          )),
        };
      }

      const recentNote = transaction.list({
        tenant_id: tenantId,
        model_type: "MatterFollowUpContact",
        matter_id: matterId,
      })
        .filter((entry) =>
          entry.followup_id === followupId
            && entry.entry_kind === "internal_note"
            && entry.safe_excerpt)
        .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))[0] ?? null;
      const next = validateMatterFollowUp({
        ...current,
        owner_id: toOwnerId,
        backup_owner_id: nextBackupOwnerId,
        updated_by: actor_id,
        updated_at: now,
      }, { now });
      const persisted = transaction.update(
        repositoryRef(tenantId, "MatterFollowUp", followupId),
        next,
      );
      const handoffId = `handoff_${sha256(`${tenantId}:${idempotency_key}`).slice(0, 20)}`;
      const handoffEvent = transaction.create({
        model_type: "MatterFollowUpHandoff",
        resource_id: handoffId,
        handoff_id: handoffId,
        tenant_id: tenantId,
        matter_id: matterId,
        followup_id: followupId,
        from_owner_id: current.owner_id ?? null,
        to_owner_id: toOwnerId,
        backup_owner_id: persisted.backup_owner_id ?? null,
        next_action: persisted.next_action ?? null,
        next_action_at: persisted.next_action_at ?? null,
        recent_note: recentNote?.safe_excerpt ?? null,
        reason: handoffReason,
        occurred_at: now,
        actor_id,
        raw_body_included: false,
      });
      const timelineEvent = transaction.upsert({
        model_type: "MatterTimelineEvent",
        resource_id: `matter.followup.handoff:${handoffId}`,
        event_id: `matter.followup.handoff:${handoffId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        occurred_at: now,
        type: "matter.followup.handed_off",
        title: persisted.title,
        source_ref: `followup:${followupId}`,
        source_object_id: handoffId,
        required_scope: "matter:internal",
        safe_summary: {
          from_owner_id: current.owner_id ?? null,
          to_owner_id: toOwnerId,
          next_action: persisted.next_action ?? null,
          next_action_at: persisted.next_action_at ?? null,
          recent_note: recentNote?.safe_excerpt ?? null,
        },
        raw_body_included: false,
        raw_provider_payload_included: false,
      });
      return {
        item: projectFollowUp(persisted, now),
        handoff_event: handoffEvent,
        timeline_event: timelineEvent,
      };
    });
  }

  return Object.freeze({
    createFollowUp,
    updateFollowUp,
    getFollowUp,
    deleteFollowUp,
    listFollowUps,
    recordContact,
    listContacts,
    getLastContact,
    listSavedView,
    convertRequestToTask,
    handoffFollowUp,
  });
}
