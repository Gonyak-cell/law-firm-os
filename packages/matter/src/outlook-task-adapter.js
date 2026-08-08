import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createMatterActivityCalendarChannelService } from "./activity-calendar-channel-service.js";
import { MATTER_TASK_STATUSES } from "./registry.js";

export const OUTLOOK_TASK_ERROR_CODES = Object.freeze({
  idempotency_conflict: "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT",
  not_found: "OUTLOOK_TASK_NOT_FOUND",
  version_conflict: "OUTLOOK_TASK_VERSION_CONFLICT",
});

const CREATE_FIELDS = Object.freeze(["assigned_to_user_id", "due_at", "estimated_minutes", "status", "title"]);
const PATCH_FIELDS = Object.freeze(["assigned_to_user_id", "due_at", "estimated_minutes", "status", "title"]);

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function plainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function onlyFields(value, allowed, field) {
  const object = plainObject(value, field);
  const unexpected = Object.keys(object).find((key) => !allowed.includes(key));
  if (unexpected) throw new TypeError(`${field}.${unexpected} is not supported`);
  return object;
}

function oneLineTitle(value) {
  const title = requiredString(value, "title");
  if (/\r|\n/u.test(title)) throw new TypeError("title must be one line");
  return title;
}

function optionalSourceEmailThreadId(value) {
  if (value == null || value === "") return null;
  return requiredString(value, "source_email_thread_id");
}

function positiveVersion(value, field = "expected_version") {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function taskId(value) {
  const id = requiredString(value, "task_id");
  if (!/^[a-zA-Z0-9_-]{1,96}$/u.test(id)) throw new TypeError("task_id is invalid");
  return id;
}

function taskError(message, safeErrorCode, status = 409) {
  return Object.assign(new Error(message), { safe_error_code: safeErrorCode, status });
}

function assertMatter(repository, tenantId, matterId) {
  const matter = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!matter) throw taskError("Matter task not found", OUTLOOK_TASK_ERROR_CODES.not_found, 404);
}

function replayFor(repository, { tenantId, idempotencyKey, operation, fingerprint }) {
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (!replay) return null;
  if (
    replay.operation !== operation
    || replay.request_fingerprint !== fingerprint
    || !replay.response?.item
    || !replay.response?.audit_event
    || !replay.response?.timeline_event
  ) {
    throw taskError(
      "Outlook task idempotency entry conflicts with the request",
      OUTLOOK_TASK_ERROR_CODES.idempotency_conflict,
    );
  }
  return Object.freeze({ ...replay.response, outcome: "idempotent_replay", idempotent_replay: true });
}

export function createOutlookMatterTask({
  repository,
  peopleAssignmentAuthority = null,
  clock = () => new Date().toISOString(),
  tenant_id,
  matter_id,
  actor_id,
  idempotency_key,
  source_email_thread_id = null,
  task,
} = {}) {
  if (!repository) throw new TypeError("repository is required");
  const tenantId = requiredString(tenant_id, "tenant_id");
  const matterId = requiredString(matter_id, "matter_id");
  const actorId = requiredString(actor_id, "actor_id");
  const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
  const input = onlyFields(task, CREATE_FIELDS, "task");
  const title = oneLineTitle(input.title);
  const sourceEmailThreadId = optionalSourceEmailThreadId(source_email_thread_id);
  if (input.status != null && !MATTER_TASK_STATUSES.includes(input.status)) {
    throw new TypeError("status is invalid");
  }
  assertMatter(repository, tenantId, matterId);
  const resolvedTaskId = taskId(`outlook_task_${hashDomainValue({ tenantId, matterId, idempotencyKey }).slice(0, 24)}`);
  const normalizedTask = {
    task_id: resolvedTaskId,
    title,
    status: input.status ?? "todo",
    assigned_to_user_id: input.assigned_to_user_id ?? null,
    due_at: input.due_at ?? null,
    estimated_minutes: input.estimated_minutes ?? null,
  };
  const fingerprint = hashDomainValue({
    tenant_id: tenantId,
    matter_id: matterId,
    source_email_thread_id: sourceEmailThreadId,
    task: normalizedTask,
  });
  const replay = replayFor(repository, {
    tenantId,
    idempotencyKey,
    operation: "outlook_task_create",
    fingerprint,
  });
  if (replay) return replay;
  if (repository.get({ tenant_id: tenantId, model_type: "MatterTask", task_id: resolvedTaskId })) {
    throw taskError("Outlook task identity already exists", OUTLOOK_TASK_ERROR_CODES.idempotency_conflict);
  }
  if (typeof repository.transaction !== "function") {
    throw new Error("Outlook task creation requires an atomic repository transaction");
  }

  return repository.transaction((transaction) => {
    const result = createMatterActivityCalendarChannelService({
      repository: transaction,
      peopleAssignmentAuthority,
      clock,
    }).createActivity({
      tenant_id: tenantId,
      matter_id: matterId,
      actor_id: actorId,
      occurred_at: clock(),
      activity: {
        activity_id: resolvedTaskId,
        activity_type: "task",
        ...normalizedTask,
        source_ref: sourceEmailThreadId ? `DmsEmailThread:${sourceEmailThreadId}` : "OutlookTask",
      },
    });
    const response = Object.freeze({
      outcome: "task_created",
      item: result.item,
      audit_event: result.audit_event,
      timeline_event: result.timeline_event,
      source_email_thread_id: sourceEmailThreadId,
      idempotent_replay: false,
    });
    transaction.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "outlook_task_create",
      object_type: "MatterTask",
      object_id: resolvedTaskId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: result.timeline_event.occurred_at,
    });
    return response;
  });
}

export function updateOutlookMatterTask({
  repository,
  peopleAssignmentAuthority = null,
  clock = () => new Date().toISOString(),
  tenant_id,
  matter_id,
  task_id,
  actor_id,
  idempotency_key,
  expected_version,
  patch,
} = {}) {
  if (!repository) throw new TypeError("repository is required");
  const tenantId = requiredString(tenant_id, "tenant_id");
  const matterId = requiredString(matter_id, "matter_id");
  const resolvedTaskId = taskId(task_id);
  const actorId = requiredString(actor_id, "actor_id");
  const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
  const expectedVersion = positiveVersion(expected_version);
  const normalizedPatch = { ...onlyFields(patch, PATCH_FIELDS, "patch") };
  if (Object.hasOwn(normalizedPatch, "title")) normalizedPatch.title = oneLineTitle(normalizedPatch.title);
  if (normalizedPatch.status != null && !MATTER_TASK_STATUSES.includes(normalizedPatch.status)) {
    throw new TypeError("status is invalid");
  }
  if (Object.keys(normalizedPatch).length === 0) throw new TypeError("patch must change at least one field");
  assertMatter(repository, tenantId, matterId);
  const fingerprint = hashDomainValue({
    tenant_id: tenantId,
    matter_id: matterId,
    task_id: resolvedTaskId,
    expected_version: expectedVersion,
    patch: normalizedPatch,
  });
  const replay = replayFor(repository, {
    tenantId,
    idempotencyKey,
    operation: "outlook_task_update",
    fingerprint,
  });
  if (replay) return replay;
  const current = repository.get({ tenant_id: tenantId, model_type: "MatterTask", task_id: resolvedTaskId });
  if (!current || current.matter_id !== matterId) {
    throw taskError("Matter task not found", OUTLOOK_TASK_ERROR_CODES.not_found, 404);
  }
  if (typeof repository.transaction !== "function") {
    throw new Error("Outlook task update requires an atomic repository transaction");
  }

  return repository.transaction((transaction) => {
    const result = createMatterActivityCalendarChannelService({
      repository: transaction,
      peopleAssignmentAuthority,
      clock,
    }).patchActivity({
      tenant_id: tenantId,
      matter_id: matterId,
      activity_id: resolvedTaskId,
      actor_id: actorId,
      occurred_at: clock(),
      expected_version: expectedVersion,
      patch: normalizedPatch,
    });
    const response = Object.freeze({
      outcome: "task_updated",
      item: result.item,
      audit_event: result.audit_event,
      timeline_event: result.timeline_event,
      idempotent_replay: false,
    });
    transaction.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "outlook_task_update",
      object_type: "MatterTask",
      object_id: resolvedTaskId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: result.timeline_event.occurred_at,
    });
    return response;
  });
}
