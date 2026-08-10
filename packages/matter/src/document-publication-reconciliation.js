import { appendBuilderAudit, appendBuilderTimeline } from "./document-builder-events.js";
import { canonicalValue, DOCX_GENERATOR_VERSION, hashValue, idempotencyConflict } from "./document-builder-values.js";
import { safeApprovalReceipt, safeArtifact, safeDraft, safeOutbox } from "./document-builder-safe-projection.js";

export const PUBLICATION_OPERATION = "matter_builder_docx_publish";

export function publicationRequestFingerprint({ tenantId, matterId, draft, actorId }) {
  return hashValue({
    operation: PUBLICATION_OPERATION,
    tenant_id: tenantId,
    matter_id: matterId,
    actor_id: actorId,
    draft_id: draft.draft_id,
    input_fingerprint: draft.input_fingerprint,
    template_id: draft.template_id,
    template_version: draft.template_version,
    template_hash: draft.template_hash,
    approval_state: draft.approval_state,
    approval_request_id: draft.approval_request_id ?? null,
    approval_receipt_id: draft.approval_receipt?.receipt_id ?? null,
    approval_receipt_hash: draft.approval_receipt?.receipt_hash ?? null,
    approved_input_hash: draft.approval_receipt?.input_hash ?? null,
  });
}

function replayResponse(replay, actorId, fingerprint) {
  if (replay.operation !== PUBLICATION_OPERATION
    || replay.actor_id !== actorId
    || replay.request_fingerprint !== fingerprint) {
    throw idempotencyConflict("idempotency key cannot be reused for changed builder content or actor");
  }
  return Object.freeze({ ...replay.response, outcome: "idempotent_replay", idempotent_replay: true });
}

export function readPublicationReplay(repository, { tenantId, actorId, idempotencyKey, fingerprint }) {
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  return replay ? replayResponse(replay, actorId, fingerprint) : null;
}

export function claimPublicationKey(repository, {
  tenantId,
  matterId,
  draft,
  actorId,
  idempotencyKey,
  fingerprint,
  now,
}) {
  const claimId = `builder_publish_claim_${hashValue({ tenantId, idempotencyKey }).slice(0, 32)}`;
  return repository.transaction((tx) => {
    const replay = readPublicationReplay(tx, { tenantId, actorId, idempotencyKey, fingerprint });
    if (replay) return replay;
    const claim = tx.get({ tenant_id: tenantId, model_type: "MatterBuilderPublishKeyClaim", resource_id: claimId });
    if (claim && (claim.operation !== PUBLICATION_OPERATION
      || claim.actor_id !== actorId
      || claim.request_fingerprint !== fingerprint
      || claim.idempotency_key_hash !== hashValue(idempotencyKey))) {
      throw idempotencyConflict("idempotency key cannot be reused for changed builder content or actor");
    }
    if (!claim) tx.create({
      model_type: "MatterBuilderPublishKeyClaim", resource_id: claimId, claim_id: claimId,
      tenant_id: tenantId, matter_id: matterId, draft_id: draft.draft_id,
      operation: PUBLICATION_OPERATION, actor_id: actorId,
      idempotency_key_hash: hashValue(idempotencyKey), request_fingerprint: fingerprint,
      created_at: now, raw_payload_included: false,
    });
    return null;
  });
}

export function publicationIdentity({ tenantId, draft, rendered, idempotencyKey, fingerprint }) {
  const ref = hashValue({ tenantId, draftId: draft.draft_id, inputHash: rendered.input_hash }).slice(0, 32);
  const artifactId = `builder_artifact_${ref}`;
  const documentId = `document:builder:${ref}`;
  const versionId = `version:${documentId}:1`;
  return Object.freeze({
    fingerprint,
    sha256: rendered.sha256,
    artifact_id: artifactId,
    document_id: documentId,
    version_id: versionId,
    file_object_id: `file:${versionId}`,
    object_id: `object:${versionId}`,
    upload_session_id: `dms-upload:${artifactId}`,
    dms_idempotency_key: `matter-builder-docx:${draft.draft_id}:${rendered.input_hash}`,
    outbox_id: `matter.builder.docx.finalized:${tenantId}:${draft.draft_id}:${rendered.input_hash.slice(0, 16)}`,
    attempt_id: `builder_publish_attempt_${hashValue({ tenantId, idempotencyKey }).slice(0, 32)}`,
    reconciliation_id: `builder_reconciliation_${artifactId}`,
  });
}

function assertIdentity(record, identity) {
  for (const field of ["artifact_id", "document_id", "version_id", "file_object_id", "upload_session_id", "fingerprint", "sha256"]) {
    if (record?.[field] !== identity[field]) throw idempotencyConflict(`publication identity changed at ${field}`);
  }
}

function assertIntent(record, identity, idempotencyKey) {
  assertIdentity(record, identity);
  if (record.idempotency_key_hash !== hashValue(idempotencyKey)) {
    throw idempotencyConflict("publication reconciliation key changed");
  }
  if (record.dms_idempotency_key_hash !== hashValue(identity.dms_idempotency_key)) {
    throw idempotencyConflict("publication DMS key changed");
  }
}

export function ensurePublicationIntent(repository, context) {
  const { tenantId, matterId, draft, rendered, identity, actorId, now, idempotencyKey } = context;
  const ref = { tenant_id: tenantId, model_type: "MatterBuilderPublicationReconciliation", resource_id: identity.reconciliation_id };
  const existing = repository.get(ref);
  if (existing) { assertIntent(existing, identity, idempotencyKey); return existing; }
  return repository.create({
    model_type: "MatterBuilderPublicationReconciliation", resource_id: identity.reconciliation_id,
    reconciliation_id: identity.reconciliation_id, tenant_id: tenantId, matter_id: matterId,
    draft_id: draft.draft_id, artifact_id: identity.artifact_id, document_id: identity.document_id,
    version_id: identity.version_id, file_object_id: identity.file_object_id,
    upload_session_id: identity.upload_session_id, dms_idempotency_key_hash: hashValue(identity.dms_idempotency_key),
    idempotency_key_hash: hashValue(idempotencyKey), fingerprint: identity.fingerprint,
    sha256: rendered.sha256, byte_size: rendered.byte_size, status: "upload_pending",
    actor_id: actorId, created_at: now, updated_at: now,
    raw_payload_included: false, document_bytes_included: false, raw_storage_path_included: false,
  });
}

export function markReconciliationRequired(repository, context, upload, error = null) {
  const { tenantId, identity, now } = context;
  const observed = {
    upload_session_id: upload?.upload_session_id ?? identity.upload_session_id,
    document_id: upload?.document?.document_id ?? identity.document_id,
    version_id: upload?.version?.version_id ?? identity.version_id,
    file_object_id: upload?.file_object?.file_object_id ?? identity.file_object_id,
    sha256: upload?.file_object?.sha256 ?? context.rendered.sha256,
  };
  assertIdentity({ ...identity, ...observed }, identity);
  return repository.update(
    { tenant_id: tenantId, model_type: "MatterBuilderPublicationReconciliation", resource_id: identity.reconciliation_id },
    { status: "reconciliation_required", observed_upload_identity: observed, safe_error_code: error?.safe_error_code ?? error?.code ?? null, updated_at: now },
  );
}

export function finalizeMatterPublication(repository, context, upload) {
  const { tenantId, matterId, draft, template, rendered, identity, actorId, now, idempotencyKey } = context;
  if (upload.document?.document_id !== identity.document_id
    || upload.version?.version_id !== identity.version_id
    || upload.file_object?.file_object_id !== identity.file_object_id
    || upload.version?.sha256 !== rendered.sha256
    || upload.file_object?.sha256 !== rendered.sha256) {
    throw new Error("Vault finalized identity does not match generated DOCX");
  }
  return repository.transaction((tx) => {
    const artifact = tx.upsert({
      model_type: "MatterBuilderArtifact", resource_id: identity.artifact_id, artifact_id: identity.artifact_id,
      tenant_id: tenantId, matter_id: matterId, draft_id: draft.draft_id,
      document_id: identity.document_id, version_id: identity.version_id, file_object_id: identity.file_object_id,
      filename: rendered.filename, mime_type: rendered.mime_type, byte_size: rendered.byte_size, sha256: rendered.sha256,
      generator_version: DOCX_GENERATOR_VERSION, template_id: template.template_id,
      template_version: template.template_version, template_hash: template.template_hash,
      input_hash: rendered.input_hash, approval_receipt_id: draft.approval_receipt.receipt_id,
      signer_snapshot: canonicalValue(draft.signer_role_refs), signer_snapshot_count: draft.signer_role_refs.length,
      signature_anchor_manifest: rendered.signature_anchors, status: "finalized", immutable: true,
      generated_at: now, finalized_at: now, document_bytes_included: false,
      raw_body_included: false, raw_contact_values_included: false, raw_storage_path_included: false,
    });
    const outbox = tx.upsert({
      model_type: "MatterBuilderPublishOutbox", resource_id: identity.outbox_id, outbox_event_id: identity.outbox_id,
      aggregate_id: draft.draft_id, tenant_id: tenantId, matter_id: matterId,
      event_type: "matter.builder.docx.finalization", status: "complete", attempt_count: 1,
      artifact_id: identity.artifact_id, occurred_at: now, completed_at: now,
      raw_payload_included: false, document_bytes_included: false, raw_contact_values_included: false,
    });
    tx.upsert({
      model_type: "MatterBuilderPublishAttempt", resource_id: identity.attempt_id, attempt_id: identity.attempt_id,
      tenant_id: tenantId, matter_id: matterId, draft_id: draft.draft_id,
      idempotency_key_hash: hashValue(idempotencyKey), request_fingerprint: identity.fingerprint,
      status: "complete", artifact_id: identity.artifact_id, document_id: identity.document_id,
      upload_session_id: identity.upload_session_id, created_at: now, updated_at: now,
      raw_payload_included: false, document_bytes_included: false,
    });
    const finalizedDraft = tx.update(
      { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draft.draft_id },
      { status: "finalized", publish_state: "complete", artifact_id: identity.artifact_id, immutable: true, finalized_at: now, updated_at: now },
    );
    const audit = appendBuilderAudit(tx, { event_id: `matter.builder.docx.finalized:${tenantId}:${matterId}:${identity.artifact_id}`, tenant_id: tenantId, actor_id: actorId, action: "matter.builder.docx.finalized", object_type: "MatterBuilderArtifact", object_id: identity.artifact_id, reason: "approved_builder_docx_uploaded_to_vault", occurred_at: now, metadata: { document_id: identity.document_id, version_id: identity.version_id, file_object_id: identity.file_object_id, upload_session_id: identity.upload_session_id, sha256: rendered.sha256, template_hash: template.template_hash, input_hash: rendered.input_hash, approval_receipt_id: draft.approval_receipt.receipt_id } });
    const timeline = appendBuilderTimeline(tx, { event_id: `matter.timeline.builder_docx_finalized:${tenantId}:${matterId}:${identity.artifact_id}`, tenant_id: tenantId, matter_id: matterId, occurred_at: now, type: "matter.builder.docx.finalized", title: "승인 문서 DMS 확정", source_ref: identity.artifact_id, source_object_id: identity.document_id, safe_summary: { artifact_id: identity.artifact_id, document_id: identity.document_id, version_id: identity.version_id, sha256: rendered.sha256, approval_receipt_id: draft.approval_receipt.receipt_id } });
    const response = Object.freeze({
      outcome: upload.idempotent_replay === true ? "idempotent_replay" : "created", idempotent_replay: upload.idempotent_replay === true, ui_state: "complete",
      item: safeDraft(finalizedDraft), approval_receipt: safeApprovalReceipt(draft.approval_receipt),
      artifact: safeArtifact(artifact), outbox_event: safeOutbox(outbox),
      publish_state: Object.freeze({ status: "complete", owner_approval_ref_included: false, vault_document_created: true, immutable_document_version_created: true, document_bytes_included: false, raw_storage_path_included: false, production_ready_claim: false }),
      audit_event: audit, timeline_event: timeline,
    });
    tx.recordIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey, operation: PUBLICATION_OPERATION, object_type: "MatterBuilderArtifact", object_id: identity.artifact_id, actor_id: actorId, request_fingerprint: identity.fingerprint, response, created_at: now });
    tx.update({ tenant_id: tenantId, model_type: "MatterBuilderPublicationReconciliation", resource_id: identity.reconciliation_id }, { status: "complete", completed_at: now, updated_at: now });
    return response;
  });
}
