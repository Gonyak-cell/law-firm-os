import { isDeepStrictEqual } from "node:util";
import { correctionTrustError } from "../../../packages/email-dms/src/email-filing-correction-trust-boundary.js";
import {
  CORRECTION_REFERENCE_MODEL,
  correctionProjectionContract,
} from "./outlook-email-filing-correction-projection.js";

export function correctionProjectionConflict() {
  return correctionTrustError(
    "EMAIL_FILING_CORRECTION_PROJECTION_CONFLICT",
    "correction projection is incomplete",
  );
}

function exactFields(actual, expected, fields) {
  return actual && fields.every((field) => (
    isDeepStrictEqual(actual[field], expected[field])
  ));
}

const REFERENCE_FIELDS = Object.freeze([
  "tenant_id", "matter_id", "source_matter_id", "target_matter_id",
  "correction_id", "placement_id", "reference_id", "email_thread_id",
  "original_receipt_id", "original_matter_id", "document_id",
  "document_version_id", "file_object_id", "mime_sha256", "occurred_at",
  "link_kind", "immutable_document", "copied_mime", "status",
]);

const TIMELINE_FIELDS = Object.freeze([
  "tenant_id", "event_id", "matter_id", "type", "correction_id",
  "placement_id", "reference_id", "placement_reference_id", "email_thread_id",
  "original_receipt_id", "original_matter_id", "source_matter_id",
  "target_matter_id", "document_id", "document_version_id", "file_object_id",
  "mime_sha256", "occurred_at", "source_ref", "source_object_id", "copied_mime",
]);

const RECEIPT_FIELDS = Object.freeze([
  "tenant_id", "idempotency_key", "operation", "object_type", "object_id",
  "actor_id", "request_fingerprint", "response", "created_at",
]);

const AUDIT_FIELDS = Object.freeze([
  "tenant_id", "event_id", "actor_id", "action", "object_type", "object_id",
]);

function exactAudit(actual, expected, metadata) {
  if (!exactFields(actual, expected, AUDIT_FIELDS)) return false;
  const rich = actual?.decision !== undefined
    || actual?.reason !== undefined
    || actual?.occurred_at !== undefined
    || actual?.metadata !== undefined;
  if (!rich) {
    return actual?.payload?.source_payload_included === false
      && /^[a-f0-9]{64}$/u.test(actual.payload?.imported_event_hash ?? "");
  }
  return exactFields(actual, expected, ["decision", "reason", "occurred_at"])
    && exactFields(actual.metadata, metadata, Object.keys(metadata));
}

function exactProjectionCounts(repository, event, contract) {
  const references = repository.list({
    tenant_id: event.tenant_id,
    model_type: CORRECTION_REFERENCE_MODEL,
  }).filter((entry) => entry.correction_id === event.correction_id);
  const timelines = repository.list({
    tenant_id: event.tenant_id,
    model_type: "MatterTimelineEvent",
  }).filter((entry) => entry.correction_id === event.correction_id);
  const audits = repository.listAudit({
    tenant_id: event.tenant_id,
    object_id: event.correction_id,
  });
  return references.length === 1
    && timelines.length === contract.timeline_events.length
    && audits.length === 1;
}

export function assertOutlookEmailFilingCorrectionProjection(
  repository,
  event,
  documentBinding,
) {
  if (event.event_kind !== "correction") {
    return Object.freeze({ timeline_events: [] });
  }
  const contract = correctionProjectionContract(event, documentBinding);
  const reference = repository.get({
    tenant_id: event.tenant_id,
    model_type: CORRECTION_REFERENCE_MODEL,
    resource_id: contract.ids.reference_id,
  });
  const timelines = contract.timeline_events.map((expected) => repository.get({
    tenant_id: event.tenant_id,
    model_type: "MatterTimelineEvent",
    resource_id: expected.event_id,
  }));
  const audit = repository.listAudit({
    tenant_id: event.tenant_id,
    object_id: event.correction_id,
  }).find((entry) => entry.event_id === contract.ids.audit_event_id);
  const receipt = repository.getIdempotency({
    tenant_id: event.tenant_id,
    idempotency_key: contract.receipt.idempotency_key,
  });
  const auditExpected = {
    event_id: contract.ids.audit_event_id,
    tenant_id: event.tenant_id,
    actor_id: event.actor_id,
    action: "dms.email.filing.correct",
    object_type: "EmailFilingCorrection",
    object_id: event.correction_id,
    decision: "allow",
    reason: "email_filing_placement_corrected",
    occurred_at: event.occurred_at,
  };
  const valid = exactProjectionCounts(repository, event, contract)
    && exactFields(reference, contract.reference, REFERENCE_FIELDS)
    && timelines.every((entry, index) => (
      exactFields(entry, contract.timeline_events[index], TIMELINE_FIELDS)
      && exactFields(entry.safe_summary, contract.timeline_events[index], TIMELINE_FIELDS)
    ))
    && exactAudit(audit, auditExpected, contract.audit_metadata)
    && exactFields(receipt, contract.receipt, RECEIPT_FIELDS);
  if (!valid) throw correctionProjectionConflict();
  return Object.freeze({
    reference,
    timeline_events: Object.freeze(timelines),
    audit,
    receipt,
  });
}
