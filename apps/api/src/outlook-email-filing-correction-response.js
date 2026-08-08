import { assertOutlookOperationEvidenceSafe } from "./outlook-operation-response.js";

export function correctionResponse(status, body) {
  const result = {
    status,
    body: {
      safe_error_codes: [],
      count_leak_prevented: true,
      production_ready_claim: false,
      ...body,
    },
  };
  assertOutlookOperationEvidenceSafe(result);
  return result;
}

export function correctionBlocked(status, requestId, code) {
  return correctionResponse(status, {
    request_id: requestId,
    outcome: status === 403 ? "denied" : "blocked",
    item: null,
    safe_error_codes: [code],
  });
}

export function safeCorrectionPlacement(value) {
  return Object.freeze({
    placement_id: value.placement_id,
    correction_id: value.correction_id,
    event_kind: value.event_kind,
    email_thread_id: value.email_thread_id,
    original_receipt_id: value.original_receipt_id,
    matter_id: value.matter_id ?? value.target_matter_id,
    document_id: value.document_id,
    mime_sha256: value.mime_sha256,
    occurred_at: value.occurred_at,
    status: value.status,
    copied_mime: false,
  });
}

export function safeCorrectionTimelines(events = []) {
  return Object.freeze(events.map((event) => Object.freeze({
    event_id: event.event_id,
    matter_id: event.matter_id,
    type: event.type,
    correction_id: event.correction_id,
    reference_id: event.reference_id,
    document_id: event.document_id,
    document_version_id: event.document_version_id,
    mime_sha256: event.mime_sha256,
    copied_mime: false,
  })));
}

export function mapCorrectionError(error, requestId) {
  if (error?.status === 403) {
    return correctionBlocked(403, requestId, "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED");
  }
  if ([
    "EMAIL_FILING_CORRECTION_ORIGINAL_NOT_FOUND",
    "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
  ].includes(error?.safe_error_code)) {
    return correctionBlocked(409, requestId, "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT");
  }
  if (
    typeof error?.safe_error_code === "string"
    && /^EMAIL_FILING_CORRECTION_[A-Z0-9_]+$/u.test(error.safe_error_code)
  ) {
    return correctionBlocked(error.status ?? 409, requestId, error.safe_error_code);
  }
  if (error?.safe_error_code === "OUTLOOK_EMAIL_CORRECTION_INVALID") {
    return correctionBlocked(400, requestId, error.safe_error_code);
  }
  if (error?.safe_error_code === "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT") {
    return correctionBlocked(409, requestId, error.safe_error_code);
  }
  return correctionBlocked(500, requestId, "OUTLOOK_EMAIL_CORRECTION_FAILED");
}
