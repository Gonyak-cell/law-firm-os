import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function epoch(value) {
  return new Date(value).getTime();
}

export const CLEARANCE_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

function trustedTimestamp(value, field) {
  const timestamp = epoch(value);
  if (!Number.isFinite(timestamp)) throw new TypeError(`${field} must be a valid timestamp`);
  return timestamp;
}

function latestByDate(records, field) {
  return [...records].sort((left, right) => epoch(right?.[field] ?? 0) - epoch(left?.[field] ?? 0))[0] ?? null;
}

export function conflictReviewLedgerState({ repository, token } = {}) {
  const tenantId = token?.tenant_id;
  const conflictCheckId = token?.conflict_check_id;
  if (!tenantId || !conflictCheckId) {
    return Object.freeze({
      review_satisfied: false,
      reason: "missing_conflict_check_ref",
      production_ready_claim: false,
    });
  }
  const conflictCheck = repository.get?.({
    tenant_id: tenantId,
    model_type: "ConflictCheck",
    conflict_check_id: conflictCheckId,
  });
  const hits = repository.list?.({ tenant_id: tenantId, model_type: "ConflictHit", conflict_check_id: conflictCheckId }) ?? [];
  const decisions = repository.list?.({ tenant_id: tenantId, model_type: "ConflictDecision", conflict_check_id: conflictCheckId }) ?? [];
  const waivers = repository.list?.({ tenant_id: tenantId, model_type: "Waiver", conflict_check_id: conflictCheckId }) ?? [];
  const clearDecision = latestByDate(
    decisions.filter((decision) => decision.decision === "clear" && decision.status === "cleared"),
    "decided_at",
  );
  const blockDecision = latestByDate(
    decisions.filter((decision) => decision.decision === "block" || decision.status === "blocked"),
    "decided_at",
  );
  const approvedWaiver = latestByDate(waivers.filter((waiver) => waiver.status === "approved"), "approved_at");
  const snapshotMatches = !conflictCheck?.snapshot_hash || !token?.snapshot_hash || conflictCheck.snapshot_hash === token.snapshot_hash;
  const reviewSatisfied = Boolean(conflictCheck) && snapshotMatches && !blockDecision && Boolean(clearDecision || approvedWaiver);
  return Object.freeze({
    review_satisfied: reviewSatisfied,
    reason: !conflictCheck
      ? "missing_conflict_check"
      : !snapshotMatches
        ? "snapshot_hash_mismatch"
        : blockDecision
          ? "blocked_conflict_decision"
          : clearDecision
            ? "clear_decision_recorded"
            : approvedWaiver
              ? "approved_waiver_recorded"
              : "missing_clear_decision_or_waiver",
    conflict_check_id: conflictCheckId,
    conflict_check_status: conflictCheck?.status ?? null,
    conflict_decision_id: clearDecision?.conflict_decision_id ?? blockDecision?.conflict_decision_id ?? null,
    waiver_id: approvedWaiver?.waiver_id ?? null,
    hit_count: hits.length,
    snapshot_hash_matches: snapshotMatches,
    production_ready_claim: false,
  });
}

export function engagementLedgerState({ repository, token } = {}) {
  const tenantId = token?.tenant_id;
  const engagementId = token?.engagement_id;
  if (!tenantId || !engagementId) {
    return Object.freeze({
      engagement_satisfied: false,
      reason: "missing_engagement_ref",
      production_ready_claim: false,
    });
  }
  const engagement = repository.get?.({
    tenant_id: tenantId,
    model_type: "Engagement",
    engagement_id: engagementId,
  });
  const intakeMatches = Boolean(engagement) && engagement.intake_request_id === token?.intake_request_id;
  const approved = engagement?.status === "approved";
  const hasSignedDocument = typeof engagement?.signed_document_id === "string" && engagement.signed_document_id.trim() !== "";
  const hasSignatureRef = typeof engagement?.signature_ref === "string" && engagement.signature_ref.trim() !== "";
  const templateDocument =
    typeof engagement?.template_document_id === "string" && engagement.template_document_id.trim() !== ""
      ? repository.get?.({
          tenant_id: tenantId,
          model_type: "EngagementTemplateDocument",
          template_document_id: engagement.template_document_id,
        })
      : null;
  const signedUpload =
    typeof engagement?.signed_document_upload_id === "string" && engagement.signed_document_upload_id.trim() !== ""
      ? repository.get?.({
          tenant_id: tenantId,
          model_type: "EngagementSignedDocumentUpload",
          signed_document_upload_id: engagement.signed_document_upload_id,
        })
      : null;
  const hasTemplateDocument =
    Boolean(templateDocument) &&
    templateDocument.intake_request_id === token?.intake_request_id &&
    templateDocument.engagement_id === engagementId &&
    templateDocument.generation_state === "generated";
  const hasSignedUpload =
    Boolean(signedUpload) &&
    signedUpload.intake_request_id === token?.intake_request_id &&
    signedUpload.engagement_id === engagementId &&
    signedUpload.document_id === engagement?.signed_document_id &&
    signedUpload.signature_ref === engagement?.signature_ref &&
    typeof signedUpload.content_sha256 === "string" &&
    signedUpload.content_sha256.trim() !== "" &&
    signedUpload.upload_state === "uploaded" &&
    signedUpload.lx_registry_ref === "LX-06" &&
    engagement?.signed_upload_verified === true &&
    engagement?.lx06_upload_verified === true;
  const engagementSatisfied =
    Boolean(engagement) && intakeMatches && approved && hasSignedDocument && hasSignatureRef && hasTemplateDocument && hasSignedUpload;
  return Object.freeze({
    engagement_satisfied: engagementSatisfied,
    reason: !engagement
      ? "missing_approved_engagement"
      : !intakeMatches
        ? "engagement_intake_mismatch"
        : !approved
          ? "engagement_not_approved"
          : !hasSignedDocument
            ? "missing_signed_document"
            : !hasSignatureRef
              ? "missing_signature_ref"
              : !hasTemplateDocument
                ? "missing_template_document"
                : !hasSignedUpload
                  ? "missing_signed_document_upload"
                  : "approved_engagement_recorded",
    engagement_id: engagementId,
    intake_request_id: engagement?.intake_request_id ?? null,
    signed_document_id: engagement?.signed_document_id ?? null,
    signature_ref: engagement?.signature_ref ?? null,
    template_id: engagement?.template_id ?? null,
    template_document_id: engagement?.template_document_id ?? null,
    signed_document_upload_id: engagement?.signed_document_upload_id ?? null,
    signed_document_sha256: engagement?.signed_document_sha256 ?? signedUpload?.content_sha256 ?? null,
    signed_upload_verified: engagement?.signed_upload_verified === true,
    lx06_upload_verified: engagement?.lx06_upload_verified === true,
    production_ready_claim: false,
  });
}

export function validateClearanceToken(token = {}, { now = new Date().toISOString() } = {}) {
  const errors = [];
  for (const field of ["clearance_token_id", "tenant_id", "intake_request_id", "conflict_check_id", "engagement_id", "snapshot_hash"]) {
    if (!token[field]) errors.push(`missing:${field}`);
  }
  if (token.token_state !== "active") errors.push(`invalid_state:${token.token_state}`);
  if (token.expires_at && epoch(token.expires_at) <= epoch(now)) errors.push("expired");
  if (token.snapshot_stale === true) errors.push("stale_snapshot");
  if (token.blocked_claims?.length > 0) errors.push("blocked_claims_present");
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    token_state: errors.includes("expired") ? "expired" : errors.includes("stale_snapshot") ? "stale" : token.token_state,
    production_ready_claim: false,
  });
}

export function issueClearanceToken({
  repository,
  token,
  actor_id,
  idempotency_key,
  now = new Date().toISOString(),
  lifetime_ms = CLEARANCE_TOKEN_LIFETIME_MS,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(token, "tenant_id");
  requiredString(token, "intake_request_id");
  requiredString(token, "conflict_check_id");
  requiredString(token, "engagement_id");
  requiredString(token, "snapshot_hash");
  const issuedAtEpoch = trustedTimestamp(now, "now");
  if (!Number.isSafeInteger(lifetime_ms) || lifetime_ms <= 0) throw new TypeError("lifetime_ms must be a positive safe integer");
  const issuedAt = new Date(issuedAtEpoch).toISOString();
  const expiresAt = new Date(issuedAtEpoch + lifetime_ms).toISOString();
  const reviewState = conflictReviewLedgerState({ repository, token });
  if (!reviewState.review_satisfied) {
    throw new Error(`Clearance requires conflict review ledger proof: ${reviewState.reason}`);
  }
  const engagementState = engagementLedgerState({ repository, token });
  if (!engagementState.engagement_satisfied) {
    throw new Error(`Clearance requires approved engagement ledger proof: ${engagementState.reason}`);
  }
  const replay = repository.getIdempotency({ tenant_id: token.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...token,
      model_type: "ClearanceToken",
      clearance_token_id: token.clearance_token_id,
      token_state: "active",
      status: "active",
      issued_at: issuedAt,
      expires_at: expiresAt,
      outcome: "cleared",
      blocked_claims: Object.freeze([]),
      conflict_review_state: reviewState.reason,
      conflict_decision_id: reviewState.conflict_decision_id,
      waiver_id: reviewState.waiver_id,
      conflict_review_satisfied: true,
      engagement_review_state: engagementState.reason,
      engagement_signed_document_id: engagementState.signed_document_id,
      engagement_signature_ref: engagementState.signature_ref,
      engagement_template_document_id: engagementState.template_document_id,
      engagement_signed_document_upload_id: engagementState.signed_document_upload_id,
      engagement_signed_document_sha256: engagementState.signed_document_sha256,
      engagement_signed_upload_verified: engagementState.signed_upload_verified,
      engagement_review_satisfied: true,
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "clearance.token.issue",
        object_type: "ClearanceToken",
        object_id: record.clearance_token_id,
        idempotency_key,
        metadata: {
          conflict_check_id: record.conflict_check_id,
          conflict_review_state: reviewState.reason,
          conflict_decision_id: reviewState.conflict_decision_id,
          waiver_id: reviewState.waiver_id,
          hit_count: reviewState.hit_count,
          engagement_id: record.engagement_id,
          engagement_review_state: engagementState.reason,
          engagement_signed_document_id: engagementState.signed_document_id,
          engagement_signature_ref: engagementState.signature_ref,
          engagement_template_document_id: engagementState.template_document_id,
          engagement_signed_document_upload_id: engagementState.signed_document_upload_id,
          engagement_signed_document_sha256: engagementState.signed_document_sha256,
          engagement_signed_upload_verified: engagementState.signed_upload_verified,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      clearance_token: record,
      conflict_review: reviewState,
      engagement_review: engagementState,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "clearance_token_issue", response });
    return response;
  });
}
