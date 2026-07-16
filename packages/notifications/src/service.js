import { createHash } from "node:crypto";

export const LAWOS_NOTIFICATION_EVENT_CLASSES = Object.freeze([
  "approval_pending",
  "deadline_approaching",
  "contract_expiring",
  "risk_detected",
]);

const DEFAULT_FROM_EMAIL = "notifications@lawos.example.invalid";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function normalizeEvent(input = {}, { now = () => new Date().toISOString() } = {}) {
  const eventClass = requiredString(input, "event_class");
  if (!LAWOS_NOTIFICATION_EVENT_CLASSES.includes(eventClass)) {
    throw new TypeError(`event_class must be one of ${LAWOS_NOTIFICATION_EVENT_CLASSES.join(", ")}`);
  }
  return Object.freeze({
    event_id: requiredString(input, "event_id"),
    event_class: eventClass,
    tenant_id: requiredString(input, "tenant_id"),
    actor_id: requiredString(input, "actor_id"),
    recipient_user_id: requiredString(input, "recipient_user_id"),
    recipient_email: requiredString(input, "recipient_email"),
    title: requiredString(input, "title"),
    body_hash: sha256(requiredString(input, "body")),
    resource_ref: optionalString(input, "resource_ref"),
    occurred_at: input.occurred_at ?? now(),
    payload_body_included: false,
    production_ready_claim: false,
  });
}

function normalizeInAppDelivery(event, { now = () => new Date().toISOString() } = {}) {
  return Object.freeze({
    delivery_id: `inapp:${event.event_id}:${event.recipient_user_id}`,
    event_id: event.event_id,
    event_class: event.event_class,
    tenant_id: event.tenant_id,
    recipient_user_id: event.recipient_user_id,
    title: event.title,
    resource_ref: event.resource_ref,
    state: "delivered",
    fired_at: now(),
    payload_body_included: false,
  });
}

export function createInMemoryNotificationStore(seed = {}) {
  const events = new Map();
  const inAppDeliveries = new Map();
  const sesSendRecords = new Map();

  for (const event of seed.events ?? []) events.set(event.event_id, clone(event));
  for (const delivery of seed.in_app_deliveries ?? []) inAppDeliveries.set(delivery.delivery_id, clone(delivery));
  for (const record of seed.ses_send_records ?? []) sesSendRecords.set(record.send_record_id, clone(record));

  return Object.freeze({
    recordEvent(event) {
      if (events.has(event.event_id)) return Object.freeze(clone(events.get(event.event_id)));
      events.set(event.event_id, clone(event));
      return Object.freeze(clone(event));
    },
    recordInAppDelivery(delivery) {
      inAppDeliveries.set(delivery.delivery_id, clone(delivery));
      return Object.freeze(clone(delivery));
    },
    recordSesSend(record) {
      sesSendRecords.set(record.send_record_id, clone(record));
      return Object.freeze(clone(record));
    },
    listEvents(query = {}) {
      return Object.freeze(
        [...events.values()]
          .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
          .filter((event) => !query.event_class || event.event_class === query.event_class)
          .map((event) => Object.freeze(clone(event))),
      );
    },
    listInAppDeliveries(query = {}) {
      return Object.freeze(
        [...inAppDeliveries.values()]
          .filter((delivery) => !query.tenant_id || delivery.tenant_id === query.tenant_id)
          .filter((delivery) => !query.event_class || delivery.event_class === query.event_class)
          .map((delivery) => Object.freeze(clone(delivery))),
      );
    },
    listSesSendRecords(query = {}) {
      return Object.freeze(
        [...sesSendRecords.values()]
          .filter((record) => !query.tenant_id || record.tenant_id === query.tenant_id)
          .filter((record) => !query.event_class || record.event_class === query.event_class)
          .map((record) => Object.freeze(clone(record))),
      );
    },
  });
}

export function createLocalSesSendRecorder({
  now = () => new Date().toISOString(),
  messageIdPrefix = "ses-local",
  requestIdPrefix = "ses-request-local",
} = {}) {
  let sequence = 0;
  return Object.freeze({
    async sendEmail(input = {}) {
      const destination = requiredString(input, "destination");
      const subject = requiredString(input, "subject");
      const tenantId = requiredString(input, "tenant_id");
      const eventId = requiredString(input, "event_id");
      const eventClass = requiredString(input, "event_class");
      sequence += 1;
      return Object.freeze({
        send_record_id: `ses:${eventId}:${sequence}`,
        provider: "aws-ses",
        transport: "local-ses-send-recorder",
        tenant_id: tenantId,
        event_id: eventId,
        event_class: eventClass,
        destination,
        from_email: requiredString(input, "from_email"),
        subject,
        body_hash: sha256(requiredString(input, "body")),
        message_id: `${messageIdPrefix}-${sequence}`,
        request_id: `${requestIdPrefix}-${sequence}`,
        state: "accepted",
        sent_at: now(),
        external_network_call_made: false,
        credential_material_included: false,
        payload_body_included: false,
        production_ready_claim: false,
      });
    },
  });
}

export function createNotificationFiringService({
  store = createInMemoryNotificationStore(),
  ses = createLocalSesSendRecorder(),
  fromEmail = DEFAULT_FROM_EMAIL,
  now = () => new Date().toISOString(),
} = {}) {
  return Object.freeze({
    async fireEvent(input = {}) {
      const event = normalizeEvent(input, { now });
      const inAppDelivery = normalizeInAppDelivery(event, { now });
      const sesSendRecord = await ses.sendEmail({
        tenant_id: event.tenant_id,
        event_id: event.event_id,
        event_class: event.event_class,
        destination: event.recipient_email,
        from_email: fromEmail,
        subject: event.title,
        body: input.body,
      });

      const recordedEvent = store.recordEvent(event);
      const recordedInApp = store.recordInAppDelivery(inAppDelivery);
      const recordedSes = store.recordSesSend(sesSendRecord);
      return Object.freeze({
        outcome: "fired",
        event: recordedEvent,
        in_app_delivery: recordedInApp,
        ses_send_record: recordedSes,
        all_channels_recorded: true,
        production_ready_claim: false,
      });
    },
    async fireRequiredEventClasses(events = []) {
      const receipts = [];
      for (const event of events) receipts.push(await this.fireEvent(event));
      const firedClasses = new Set(receipts.map((receipt) => receipt.event.event_class));
      return Object.freeze({
        outcome: firedClasses.size === LAWOS_NOTIFICATION_EVENT_CLASSES.length ? "passed" : "incomplete",
        required_event_classes: LAWOS_NOTIFICATION_EVENT_CLASSES,
        fired_event_classes: Object.freeze([...firedClasses]),
        receipts: Object.freeze(receipts),
        in_app_count: store.listInAppDeliveries().length,
        ses_send_count: store.listSesSendRecords().length,
        external_ses_network_call_made: store.listSesSendRecords().some((record) => record.external_network_call_made === true),
        production_ready_claim: false,
      });
    },
    store,
  });
}
