import { createHash } from "node:crypto";
import {
  HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
  assertHrxProviderReceiptSucceeded,
} from "../provider-receipt-contract.js";

const CALENDAR_PROVIDER_IDS = Object.freeze(["matter_calendar", "google_calendar", "outlook_calendar"]);
const COLLABORATION_PROVIDER_IDS = Object.freeze(["slack", "teams"]);
export const LEAVE_INTEGRATION_PROVIDER_KINDS = Object.freeze(["schedule", "attendance", "payroll", "notification"]);
const PRIVATE_FIELD_NAMES = Object.freeze([
  "employee_id",
  "leave_type",
  "leave_type_id",
  "reason",
  "reason_text",
  "handover_note",
  "attachment_id",
  "attachment_ids",
  "document_id",
  "document_ids",
  "access_token",
  "refresh_token",
  "client_secret",
]);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
}

function assertConnectionReference(value, field) {
  const reference = requiredString(value, field);
  if (!/^(OAuthConnection|CollaborationConnection):[A-Za-z0-9._:-]+$/.test(reference)) {
    throw new TypeError(`${field} must be an opaque connection reference`);
  }
  if (/bearer|token|secret|password/i.test(reference)) throw new TypeError(`${field} must not contain provider credentials`);
  return reference;
}

function assertNoPrivateFields(payload, label) {
  const serialized = stableStringify(payload);
  for (const field of PRIVATE_FIELD_NAMES) {
    if (serialized.includes(`"${field}"`)) throw new TypeError(`${label} must not include ${field}`);
  }
  return payload;
}

export function resolveLeaveIntegrationProviderSwitches(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("leave integration provider switches must be an object");
  }
  for (const key of Object.keys(input)) {
    if (!LEAVE_INTEGRATION_PROVIDER_KINDS.includes(key)) {
      throw new TypeError(`unsupported leave integration provider switch: ${key}`);
    }
    if (typeof input[key] !== "boolean") {
      throw new TypeError(`leave integration provider switch ${key} must be boolean`);
    }
  }
  return Object.freeze(Object.fromEntries(
    LEAVE_INTEGRATION_PROVIDER_KINDS.map((kind) => [kind, input[kind] !== false]),
  ));
}

function receipt({ input, providerId, providerKind, providerReceiptRef, deliveryState, clock }) {
  return assertHrxProviderReceiptSucceeded({
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `leave_provider_receipt_${digest(`${input.tenant_id}:${providerId}:${input.idempotency_key}`).slice(0, 28)}`,
    tenant_id: input.tenant_id,
    provider_kind: providerKind,
    provider_id: providerId,
    operation: `${providerId}.${input.payload.operation ?? input.payload.event_code}`,
    idempotency_key: input.idempotency_key,
    payload_hash: `sha256:${digest(input.payload)}`,
    state: "succeeded",
    delivery_state: deliveryState,
    requested_at: clock(),
    completed_at: clock(),
    provider_receipt_ref: requiredString(providerReceiptRef, "provider_receipt_ref"),
    error_code: null,
  });
}

function idempotentAdapter({ providerId, providerKind, mode, clock, write }) {
  const receipts = new Map();
  return Object.freeze({
    provider_id: providerId,
    mode,
    async deliver(input) {
      const key = requiredString(input?.idempotency_key, "idempotency_key");
      const payloadHash = digest(input?.payload);
      const previous = receipts.get(key);
      if (previous) {
        if (previous.payload_hash !== payloadHash) throw new TypeError("provider idempotency key was reused with a different payload");
        return Object.freeze({
          provider_receipt_ref: previous.provider_receipt_ref,
          delivery_state: previous.delivery_state,
        });
      }
      const result = await write(input);
      const providerReceiptRef = typeof result === "string" ? result : result?.provider_receipt_ref;
      const deliveryState = typeof result === "object" && result
        ? result.delivery_state
        : providerKind === "calendar"
          ? "delivered"
          : "sent";
      const validated = receipt({
        input,
        providerId,
        providerKind,
        providerReceiptRef,
        deliveryState,
        clock,
      });
      receipts.set(key, Object.freeze({
        payload_hash: payloadHash,
        provider_receipt_ref: validated.provider_receipt_ref,
        delivery_state: validated.delivery_state,
      }));
      return Object.freeze({
        provider_receipt_ref: validated.provider_receipt_ref,
        delivery_state: validated.delivery_state,
      });
    },
  });
}

export function assertLeaveCalendarProjection(payload) {
  if (!payload || typeof payload !== "object") throw new TypeError("leave calendar projection is required");
  if (!["upsert", "delete"].includes(payload.operation)) throw new TypeError("leave calendar operation must be upsert or delete");
  requiredString(payload.schedule_object_ref, "schedule_object_ref");
  requiredString(payload.owner_ref, "owner_ref");
  requiredString(payload.start_date, "start_date");
  requiredString(payload.end_date, "end_date");
  requiredString(payload.timezone, "timezone");
  if (payload.public_title !== "휴가" || payload.coworker_visibility !== "title_only") {
    throw new TypeError("leave calendar projection must expose only the public leave title");
  }
  for (const flag of ["leave_type_included", "reason_included", "attachments_included", "documents_included", "private_description_included"]) {
    if (payload[flag] !== false) throw new TypeError(`leave calendar projection must declare ${flag}=false`);
  }
  assertNoPrivateFields(payload, "leave calendar projection");
  return payload;
}

export function createMatterLeaveCalendarAdapter({ clock = () => new Date().toISOString(), write } = {}) {
  return idempotentAdapter({
    providerId: "matter_calendar",
    providerKind: "calendar",
    mode: "matter_calendar_projection",
    clock,
    async write(input) {
      const payload = assertLeaveCalendarProjection(input.payload);
      const eventId = `MatterLeaveEvent:${digest(`${input.tenant_id}:${payload.schedule_object_ref}`).slice(0, 24)}`;
      if (typeof write === "function") await write(Object.freeze({ event_id: eventId, ...payload }));
      return {
        provider_receipt_ref: `MatterCalendarReceipt:${eventId}:${payload.operation}`,
        delivery_state: "delivered",
      };
    },
  });
}

export function createExternalLeaveCalendarAdapter({ providerId, oauthReference, client, clock = () => new Date().toISOString() } = {}) {
  if (!CALENDAR_PROVIDER_IDS.includes(providerId) || providerId === "matter_calendar") throw new TypeError("external calendar provider_id is unsupported");
  const connectionReference = assertConnectionReference(oauthReference, "oauth_reference");
  if (!client || typeof client.upsertEvent !== "function" || typeof client.deleteEvent !== "function") {
    throw new TypeError("calendar sandbox client requires upsertEvent and deleteEvent");
  }
  return idempotentAdapter({
    providerId,
    providerKind: "calendar",
    mode: "sandbox_reference",
    clock,
    async write(input) {
      const payload = assertLeaveCalendarProjection(input.payload);
      const eventId = `leave-${digest(`${input.tenant_id}:${payload.schedule_object_ref}`).slice(0, 32)}`;
      const command = Object.freeze({
        connection_reference: connectionReference,
        event_id: eventId,
        title: payload.public_title,
        start_date: payload.start_date,
        end_date: payload.end_date,
        timezone: payload.timezone,
        visibility: payload.coworker_visibility,
      });
      const result = payload.operation === "delete"
        ? await client.deleteEvent(command)
        : await client.upsertEvent(command);
      return {
        provider_receipt_ref: result?.provider_receipt_ref,
        delivery_state: result?.delivery_state ?? "delivered",
      };
    },
  });
}

export function assertLeaveCollaborationProjection(payload) {
  if (!payload || typeof payload !== "object") throw new TypeError("leave collaboration projection is required");
  requiredString(payload.event_code, "event_code");
  requiredString(payload.title, "title");
  requiredString(payload.recipient_token, "recipient_token");
  requiredString(payload.route, "route");
  if (payload.private_fields_included !== false || payload.requested_dates_included !== false) {
    throw new TypeError("leave collaboration projection must exclude private fields and dates");
  }
  assertNoPrivateFields(payload, "leave collaboration projection");
  return payload;
}

export function createLeaveCollaborationAdapter({ providerId, connectionReference, client, clock = () => new Date().toISOString() } = {}) {
  if (!COLLABORATION_PROVIDER_IDS.includes(providerId)) throw new TypeError("collaboration provider_id is unsupported");
  const reference = assertConnectionReference(connectionReference, "connection_reference");
  if (!client || typeof client.sendNotification !== "function") throw new TypeError("collaboration sandbox client requires sendNotification");
  return idempotentAdapter({
    providerId,
    providerKind: "delivery",
    mode: "sandbox_reference",
    clock,
    async write(input) {
      const payload = assertLeaveCollaborationProjection(input.payload);
      const result = await client.sendNotification(Object.freeze({
        connection_reference: reference,
        notification_id: `leave-${digest(`${input.tenant_id}:${input.idempotency_key}`).slice(0, 32)}`,
        event_code: payload.event_code,
        title: payload.title,
        recipient_token: payload.recipient_token,
        route: payload.route,
      }));
      return {
        provider_receipt_ref: result?.provider_receipt_ref,
        delivery_state: result?.delivery_state ?? "sent",
      };
    },
  });
}

export function createCompositeLeaveIntegrationProvider({ providerKind, providers = [] } = {}) {
  requiredString(providerKind, "provider_kind");
  if (!Array.isArray(providers) || providers.length === 0 || providers.some((provider) => typeof provider?.deliver !== "function")) {
    throw new TypeError("composite integration provider requires deliverable providers");
  }
  return Object.freeze({
    mode: `composite:${providers.map((provider) => provider.provider_id ?? provider.mode).join(",")}`,
    async deliver(input) {
      const refs = [];
      const states = [];
      for (const provider of providers) {
        const result = await provider.deliver({ ...input, idempotency_key: `${input.idempotency_key}:${provider.provider_id ?? provider.mode}` });
        refs.push(requiredString(result?.provider_receipt_ref, "provider_receipt_ref"));
        states.push(result?.delivery_state ?? "unknown");
      }
      const deliveryState = ["unknown", "queued", "sent", "delivered", "read"]
        .find((state) => states.includes(state)) ?? "unknown";
      return Object.freeze({
        provider_receipt_ref: `LeaveProviderSet:${providerKind}:${digest(refs).slice(0, 24)}`,
        delivery_state: deliveryState,
      });
    },
  });
}
