import {
  normalizeEmailFilingPlacementEvent,
} from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { correctionTrustError } from "../../../packages/email-dms/src/email-filing-correction-trust-boundary.js";

const TRANSACTION_TAILS = new WeakMap();
const PLACEMENT_MODEL = "EmailFilingPlacementEvent";
const REFERENCE_MODEL = "EmailFilingPlacementReference";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requireRepository(repository) {
  for (const method of [
    "appendAudit", "create", "get", "getIdempotency", "list",
    "listAudit", "recordIdempotency", "transaction",
  ]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Matter repository.${method} is required`);
    }
  }
}

function placementRecords(repository, { tenant_id, email_thread_id } = {}) {
  return repository.list({ tenant_id, model_type: PLACEMENT_MODEL })
    .filter((record) => !email_thread_id || record.email_thread_id === email_thread_id)
    .map((record) => normalizeEmailFilingPlacementEvent({
      ...record,
      model_type: record.event_model_type,
    }));
}

function placementVersion(events) {
  return JSON.stringify(events
    .map((event) => [event.placement_id, event.payload_fingerprint])
    .sort((left, right) => left[0].localeCompare(right[0])));
}

function receiptKey(event) {
  return `outlook-email-correction:${event.idempotency_key}`;
}

function projectionIds(event) {
  return Object.freeze({
    reference_id: `email-filing-placement-reference:${event.placement_id}`,
    source_timeline_event_id: `outlook.email.correction.source:${event.correction_id}`,
    target_timeline_event_id: `outlook.email.correction.target:${event.correction_id}`,
  });
}

function timeline(event, { eventId, matterId, type }) {
  return Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: eventId,
    event_id: eventId,
    tenant_id: event.tenant_id,
    matter_id: matterId,
    correction_id: event.correction_id,
    occurred_at: event.occurred_at,
    type,
    title: "이메일 저장 위치 변경",
    source_ref: event.correction_id,
    source_module: "outlook-addin",
    source_object_id: event.email_thread_id,
    document_id: event.document_id,
    mime_sha256: event.mime_sha256,
    safe_summary: Object.freeze({
      correction_id: event.correction_id,
      placement_id: event.placement_id,
      email_thread_id: event.email_thread_id,
      original_receipt_id: event.original_receipt_id,
      source_matter_id: event.source_matter_id,
      target_matter_id: event.target_matter_id,
      document_id: event.document_id,
      mime_sha256: event.mime_sha256,
      copied_mime: false,
    }),
    raw_body_included: false,
    raw_provider_payload_included: false,
    document_bytes_included: false,
  });
}

function appendProjection(writer, event) {
  const ids = projectionIds(event);
  const reference = writer.create({
    model_type: REFERENCE_MODEL,
    resource_id: ids.reference_id,
    reference_id: ids.reference_id,
    tenant_id: event.tenant_id,
    matter_id: event.target_matter_id,
    source_matter_id: event.source_matter_id,
    target_matter_id: event.target_matter_id,
    correction_id: event.correction_id,
    placement_id: event.placement_id,
    email_thread_id: event.email_thread_id,
    original_receipt_id: event.original_receipt_id,
    document_id: event.document_id,
    mime_sha256: event.mime_sha256,
    link_kind: "same_immutable_document",
    immutable_document: true,
    copied_mime: false,
    status: "active",
  });
  const timelines = [
    timeline(event, {
      eventId: ids.source_timeline_event_id,
      matterId: event.source_matter_id,
      type: "outlook.email.filing.corrected_from",
    }),
    timeline(event, {
      eventId: ids.target_timeline_event_id,
      matterId: event.target_matter_id,
      type: "outlook.email.filing.corrected_to",
    }),
  ].map((record) => writer.create(record));
  writer.recordIdempotency({
    tenant_id: event.tenant_id,
    idempotency_key: receiptKey(event),
    operation: "outlook_email_filing_correction",
    object_type: "EmailFilingCorrection",
    object_id: event.correction_id,
    actor_id: event.actor_id,
    request_fingerprint: event.payload_fingerprint,
    response: {
      correction_id: event.correction_id,
      placement_id: event.placement_id,
      reference_id: reference.reference_id,
      timeline_event_ids: timelines.map((entry) => entry.event_id),
      document_id: event.document_id,
      mime_sha256: event.mime_sha256,
      copied_mime: false,
    },
    created_at: event.occurred_at,
  });
}

function serialize(repository, execute) {
  const prior = TRANSACTION_TAILS.get(repository) ?? Promise.resolve();
  const current = prior.then(execute, execute);
  TRANSACTION_TAILS.set(repository, current.then(() => undefined, () => undefined));
  return current;
}

function projectionConflict() {
  return correctionTrustError(
    "EMAIL_FILING_CORRECTION_PROJECTION_CONFLICT",
    "correction projection is incomplete",
  );
}

export function assertOutlookEmailFilingCorrectionProjection(repository, event) {
  if (event.event_kind !== "correction") return Object.freeze({ timeline_events: [] });
  const ids = projectionIds(event);
  const reference = repository.get({
    tenant_id: event.tenant_id,
    model_type: REFERENCE_MODEL,
    resource_id: ids.reference_id,
  });
  const timelines = [ids.source_timeline_event_id, ids.target_timeline_event_id].map((eventId) => (
    repository.get({
      tenant_id: event.tenant_id,
      model_type: "MatterTimelineEvent",
      resource_id: eventId,
    })
  ));
  const audit = repository.listAudit({
    tenant_id: event.tenant_id,
    object_id: event.correction_id,
  }).find((entry) => entry.event_id === `email-filing-correction:${event.correction_id}`);
  const receipt = repository.getIdempotency({
    tenant_id: event.tenant_id,
    idempotency_key: receiptKey(event),
  });
  if (
    reference?.document_id !== event.document_id
    || reference?.mime_sha256 !== event.mime_sha256
    || reference?.copied_mime !== false
    || timelines.some((entry) => !entry || entry.document_id !== event.document_id
      || entry.mime_sha256 !== event.mime_sha256)
    || !audit
    || receipt?.request_fingerprint !== event.payload_fingerprint
    || receipt?.response?.placement_id !== event.placement_id
    || JSON.stringify(receipt?.response?.timeline_event_ids) !== JSON.stringify(
      timelines.map((entry) => entry.event_id),
    )
  ) throw projectionConflict();
  return Object.freeze({ reference, timeline_events: Object.freeze(timelines), receipt });
}

export function createMatterBackedEmailFilingCorrectionRepository({ repository } = {}) {
  requireRepository(repository);
  return Object.freeze({
    durable: repository.durable === true,
    transaction(options = {}, fn) {
      if (typeof fn !== "function") throw new TypeError("transaction callback is required");
      const tenantId = String(options.tenant_id ?? "").trim();
      if (!tenantId) throw new TypeError("transaction tenant_id is required");
      return serialize(repository, async () => {
        const starting = placementRecords(repository, { tenant_id: tenantId });
        const stagedPlacements = [];
        const stagedAudits = [];
        const tx = Object.freeze({
          listPlacements(query = {}) {
            return Object.freeze([...starting, ...stagedPlacements]
              .filter((event) => event.tenant_id === query.tenant_id)
              .filter((event) => !query.email_thread_id
                || event.email_thread_id === query.email_thread_id));
          },
          getIdempotency(ref = {}) {
            const event = [...starting, ...stagedPlacements].find((candidate) => (
              candidate.event_kind === "correction"
              && candidate.tenant_id === ref.tenant_id
              && candidate.idempotency_key === ref.idempotency_key
            ));
            return event ? Object.freeze({
              tenant_id: event.tenant_id,
              idempotency_key: event.idempotency_key,
              request_fingerprint: event.payload_fingerprint,
              correction_id: event.correction_id,
              placement_id: event.placement_id,
              source_matter_id: event.source_matter_id,
              created_at: event.occurred_at,
            }) : undefined;
          },
          appendPlacement(input) {
            if (options.read_only === true) throw new TypeError("read-only correction transaction");
            const event = normalizeEmailFilingPlacementEvent(input);
            const all = [...starting, ...stagedPlacements];
            if (all.some((value) => value.tenant_id === event.tenant_id && (
              value.placement_id === event.placement_id
              || value.correction_id === event.correction_id
              || value.idempotency_key === event.idempotency_key
              || (event.prior_placement_id && value.prior_placement_id === event.prior_placement_id)
              || (event.event_kind === "original" && value.event_kind === "original"
                && value.email_thread_id === event.email_thread_id)
            ))) throw projectionConflict();
            stagedPlacements.push(event);
            return event;
          },
          appendAudit(input) {
            if (options.read_only === true) throw new TypeError("read-only correction transaction");
            stagedAudits.push(Object.freeze(clone(input)));
            return input;
          },
        });
        const result = await fn(tx);
        if (options.read_only === true || (stagedPlacements.length === 0 && stagedAudits.length === 0)) {
          return result;
        }
        repository.transaction((writer) => {
          const fresh = placementRecords(writer, { tenant_id: tenantId });
          if (placementVersion(fresh) !== placementVersion(starting)) {
            throw correctionTrustError(
              "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
              "expected placement is no longer current",
            );
          }
          for (const event of stagedPlacements) {
            writer.create({
              ...event,
              event_model_type: event.model_type,
              model_type: PLACEMENT_MODEL,
              resource_id: event.placement_id,
              matter_id: event.target_matter_id,
            });
            if (event.event_kind === "correction") appendProjection(writer, event);
          }
          for (const audit of stagedAudits) writer.appendAudit(audit);
        });
        return result;
      });
    },
  });
}
