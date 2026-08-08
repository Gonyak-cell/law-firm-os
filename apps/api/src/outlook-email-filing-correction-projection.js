import { correctionTrustError } from "../../../packages/email-dms/src/email-filing-correction-trust-boundary.js";

export const CORRECTION_PLACEMENT_MODEL = "EmailFilingPlacementEvent";
export const CORRECTION_REFERENCE_MODEL = "EmailFilingPlacementReference";

export function correctionReceiptKey(event) {
  return `outlook-email-correction:${event.idempotency_key}`;
}

export function correctionProjectionIds(event) {
  return Object.freeze({
    reference_id: `email-filing-placement-reference:${event.placement_id}`,
    source_timeline_event_id: `outlook.email.correction.source:${event.correction_id}`,
    target_timeline_event_id: `outlook.email.correction.target:${event.correction_id}`,
    audit_event_id: `email-filing-correction:${event.correction_id}`,
  });
}

function requireBinding(event, binding) {
  if (
    binding?.tenant_id !== event.tenant_id
    || binding.email_thread_id !== event.email_thread_id
    || binding.original_receipt_id !== event.original_receipt_id
    || binding.document_id !== event.document_id
    || binding.mime_sha256 !== event.mime_sha256
    || typeof binding.document_version_id !== "string"
    || binding.document_version_id.length === 0
    || typeof binding.file_object_id !== "string"
    || binding.file_object_id.length === 0
  ) {
    throw correctionTrustError(
      "EMAIL_FILING_CORRECTION_PROJECTION_CONFLICT",
      "correction document binding is unavailable",
    );
  }
  return binding;
}

function sharedProjection(event, binding, ids) {
  return Object.freeze({
    tenant_id: event.tenant_id,
    correction_id: event.correction_id,
    placement_id: event.placement_id,
    reference_id: ids.reference_id,
    email_thread_id: event.email_thread_id,
    original_receipt_id: event.original_receipt_id,
    original_matter_id: binding.original_matter_id,
    source_matter_id: event.source_matter_id,
    target_matter_id: event.target_matter_id,
    document_id: event.document_id,
    document_version_id: binding.document_version_id,
    file_object_id: binding.file_object_id,
    mime_sha256: event.mime_sha256,
    copied_mime: false,
  });
}

export function correctionProjectionContract(event, candidateBinding) {
  const binding = requireBinding(event, candidateBinding);
  const ids = correctionProjectionIds(event);
  const shared = sharedProjection(event, binding, ids);
  const timeline = (eventId, matterId, type) => Object.freeze({
    ...shared,
    event_id: eventId,
    matter_id: matterId,
    type,
    occurred_at: event.occurred_at,
    source_ref: event.correction_id,
    placement_reference_id: ids.reference_id,
    source_object_id: event.email_thread_id,
  });
  const timelineEvents = Object.freeze([
    timeline(
      ids.source_timeline_event_id,
      event.source_matter_id,
      "outlook.email.filing.corrected_from",
    ),
    timeline(
      ids.target_timeline_event_id,
      event.target_matter_id,
      "outlook.email.filing.corrected_to",
    ),
  ]);
  return Object.freeze({
    ids,
    binding,
    shared,
    reference: Object.freeze({
      ...shared,
      matter_id: event.target_matter_id,
      occurred_at: event.occurred_at,
      link_kind: "same_immutable_document",
      immutable_document: true,
      status: "active",
    }),
    timeline_events: timelineEvents,
    receipt: Object.freeze({
      tenant_id: event.tenant_id,
      idempotency_key: correctionReceiptKey(event),
      operation: "outlook_email_filing_correction",
      object_type: "EmailFilingCorrection",
      object_id: event.correction_id,
      actor_id: event.actor_id,
      request_fingerprint: event.payload_fingerprint,
      response: Object.freeze({
        ...shared,
        audit_event_id: ids.audit_event_id,
        timeline_event_ids: timelineEvents.map((entry) => entry.event_id),
        status: "active",
      }),
      created_at: event.occurred_at,
    }),
    audit_metadata: Object.freeze({
      email_thread_id: event.email_thread_id,
      original_receipt_id: event.original_receipt_id,
      source_matter_id: event.source_matter_id,
      target_matter_id: event.target_matter_id,
      document_id: event.document_id,
      document_version_id: binding.document_version_id,
      file_object_id: binding.file_object_id,
      mime_sha256: event.mime_sha256,
      prior_placement_id: event.prior_placement_id,
      placement_id: event.placement_id,
      reason_hash: event.reason_hash,
      placement_reference_id: ids.reference_id,
      timeline_event_ids: timelineEvents.map((entry) => entry.event_id),
      idempotency_key: event.idempotency_key,
      idempotency_receipt_key: correctionReceiptKey(event),
      copied_mime: false,
    }),
  });
}

function timelineRecord(contract) {
  return Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: contract.event_id,
    ...contract,
    title: "이메일 저장 위치 변경",
    source_module: "outlook-addin",
    safe_summary: Object.freeze({ ...contract }),
    raw_body_included: false,
    raw_provider_payload_included: false,
    document_bytes_included: false,
  });
}

export function appendCorrectionProjection(writer, event, binding) {
  const contract = correctionProjectionContract(event, binding);
  const reference = writer.create({
    model_type: CORRECTION_REFERENCE_MODEL,
    resource_id: contract.ids.reference_id,
    ...contract.reference,
  });
  const timelines = contract.timeline_events.map((entry) => (
    writer.create(timelineRecord(entry))
  ));
  writer.recordIdempotency(contract.receipt);
  return Object.freeze({ contract, reference, timelines });
}

export function correctionAuditRecord(audit, contract) {
  return Object.freeze({
    ...audit,
    metadata: Object.freeze({
      ...(audit.metadata ?? {}),
      ...contract.audit_metadata,
    }),
  });
}
