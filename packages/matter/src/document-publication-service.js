import { uploadDocument } from "../../dms/src/document-service.js";
import { canonicalizeAgreementInput } from "./agreement-input.js";
import { renderAgreementDocx } from "./agreement-docx-renderer.js";
import { validateBuilderApprovalReceipt } from "./document-approval-service.js";
import { appendBuilderAudit } from "./document-builder-events.js";
import { idempotencyConflict, requiredString } from "./document-builder-values.js";
import { OWNER_BLOCKED_PUBLISH_STATE, safeDraft } from "./document-builder-safe-projection.js";
import {
  claimPublicationKey,
  ensurePublicationIntent,
  finalizeMatterPublication,
  markReconciliationRequired,
  PUBLICATION_OPERATION,
  publicationIdentity,
  publicationRequestFingerprint,
  readPublicationReplay,
} from "./document-publication-reconciliation.js";
import { getMatterVaultLink } from "./matter-vault-link-repository.js";

function blockedPublish({ repository, current, actorId, idempotencyKey, fingerprint, now, reason }) {
  return repository.transaction((tx) => {
    const replay = tx.getIdempotency({ tenant_id: current.tenant_id, idempotency_key: idempotencyKey });
    if (replay) {
      if (replay.operation !== PUBLICATION_OPERATION
        || replay.actor_id !== actorId
        || replay.request_fingerprint !== fingerprint) throw idempotencyConflict();
      return Object.freeze({ ...replay.response, outcome: "idempotent_replay" });
    }
    const audit = appendBuilderAudit(tx, {
      event_id: `matter.builder.publish.blocked:${current.tenant_id}:${current.matter_id}:${current.draft_id}:${fingerprint.slice(0, 24)}`,
      tenant_id: current.tenant_id, actor_id: actorId, action: "matter.builder.publish.blocked",
      object_type: "MatterBuilderDraft", object_id: current.draft_id, decision: "blocked",
      reason, occurred_at: now, metadata: { owner_approval_ref_included: false, vault_document_created: false },
    });
    const response = Object.freeze({ outcome: "owner_blocked", ui_state: "owner_blocked", item: safeDraft(current), publish_state: OWNER_BLOCKED_PUBLISH_STATE, audit_event: audit });
    tx.recordIdempotency({
      tenant_id: current.tenant_id,
      idempotency_key: idempotencyKey,
      operation: PUBLICATION_OPERATION,
      object_type: "MatterBuilderDraft",
      object_id: current.draft_id,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: now,
    });
    return response;
  });
}

function uploader(dmsRuntime) {
  if (dmsRuntime?.upload_runtime?.uploadDocument) return (args) => dmsRuntime.upload_runtime.uploadDocument(args);
  if (dmsRuntime?.uploadDocument) return (args) => dmsRuntime.uploadDocument(args);
  if (dmsRuntime?.repository && dmsRuntime?.storage) {
    return (args) => uploadDocument({ repository: dmsRuntime.repository, storage: dmsRuntime.storage, ...args });
  }
  return null;
}

function safePersistenceError(error) {
  if (error?.code && /^[A-Z0-9_]+$/u.test(error.code)) return error.code;
  return "MATTER_PUBLICATION_RECONCILIATION_REQUIRED";
}

export function createDocumentPublicationService({ repository, dmsRuntime, readTemplate, clock }) {
  async function publishBuilderDraftToVault(input = {}) {
    const tenantId = requiredString(input.tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(input.matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(input.draft_id, "draft_id", { max: 128 });
    const actorId = requiredString(input.actor_id, "actor_id", { max: 160 });
    const idempotencyKey = requiredString(input.idempotency_key, "idempotency_key", { max: 200 });
    const now = input.occurred_at ?? clock();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const fingerprint = publicationRequestFingerprint({ tenantId, matterId, draft: current, actorId });
    const replay = readPublicationReplay(repository, { tenantId, actorId, idempotencyKey, fingerprint });
    if (replay) return replay;
    let template;
    try {
      template = readTemplate({ tenant_id: tenantId, template_id: current.template_id, template_version: current.template_version });
    } catch (error) {
      if (error.message !== "approved template version not found") throw error;
    }
    const approval = current.approval_request_id
      ? repository.get({ tenant_id: tenantId, model_type: "MatterBuilderApprovalRequest", resource_id: current.approval_request_id })
      : null;
    const vaultLink = getMatterVaultLink({ repository, tenant_id: tenantId, matter_id: matterId });
    const upload = uploader(dmsRuntime);
    if (current.approval_state !== "approved" || !current.approval_receipt
      || approval?.status !== "approved" || approval?.decision !== "approved"
      || approval.approval_receipt?.receipt_id !== current.approval_receipt.receipt_id
      || approval.input_fingerprint !== current.input_fingerprint
      || approval.template_hash !== current.template_hash
      || template?.template_hash !== current.template_hash || !vaultLink || !upload) {
      const claimedReplay = claimPublicationKey(repository, {
        tenantId, matterId, draft: current, actorId, idempotencyKey, fingerprint, now,
      });
      if (claimedReplay) return claimedReplay;
      return blockedPublish({
        repository, current, actorId, idempotencyKey, fingerprint, now,
        reason: !template ? "approved_template_version_required" : !vaultLink || !upload ? "vault_runtime_required" : "owner_approval_receipt_required",
      });
    }
    const canonical = canonicalizeAgreementInput({
      tenant_id: tenantId, matter_id: matterId, draft_id: draftId, title: current.title,
      template, merge_data: current.merge_data, signer_role_refs: current.signer_role_refs,
      generated_at: current.approval_receipt.approved_at,
    });
    const expectedReceipt = {
      approvalId: current.approval_request_id,
      approvedAt: approval.decision_at,
      approvedByRef: approval.decision_by,
      inputFingerprint: current.input_fingerprint,
      templateHash: template.template_hash,
      inputHash: canonical.input_hash,
      receiptId: `builder-approval-receipt:${current.approval_request_id}:${canonical.input_hash.slice(0, 16)}`,
    };
    validateBuilderApprovalReceipt(current.approval_receipt, expectedReceipt);
    validateBuilderApprovalReceipt(approval.approval_receipt, expectedReceipt);
    const rendered = await renderAgreementDocx({ ...canonical, template });
    const identity = publicationIdentity({ tenantId, draft: current, rendered, idempotencyKey, fingerprint });
    const context = { tenantId, matterId, draft: current, template, rendered, identity, actorId, now, idempotencyKey };
    const preparedReplay = repository.transaction((tx) => {
      const claimedReplay = claimPublicationKey(tx, {
        tenantId, matterId, draft: current, actorId, idempotencyKey, fingerprint, now,
      });
      if (claimedReplay) return claimedReplay;
      const attempt = tx.get({ tenant_id: tenantId, model_type: "MatterBuilderPublishAttempt", resource_id: identity.attempt_id });
      if (attempt && attempt.request_fingerprint !== identity.fingerprint) throw idempotencyConflict("idempotency key cannot be reused for changed builder content");
      ensurePublicationIntent(tx, context);
      return null;
    });
    if (preparedReplay) return preparedReplay;
    let uploaded;
    try {
      uploaded = await upload({
        document: {
          tenant_id: tenantId, matter_id: matterId, document_id: identity.document_id,
          current_version_id: identity.version_id, version_number: 1,
          workspace_id: vaultLink.vault_workspace_id, folder_id: vaultLink.default_folder_id,
          title: current.title, status: "active", mime_type: rendered.mime_type,
          permission_envelope_id: vaultLink.permission_envelope_id,
          audit_trace_id: `matter.builder.docx:${draftId}:${rendered.input_hash.slice(0, 16)}`,
          source_policy: "source_required", source_module: "matter-builder", source_artifact_id: identity.artifact_id,
          template_id: template.template_id, template_version: template.template_version,
          template_hash: template.template_hash, input_hash: rendered.input_hash,
          approval_receipt_id: current.approval_receipt.receipt_id,
          signer_snapshot_count: current.signer_role_refs.length, immutable_original: true,
        },
        bytes: rendered.bytes, actor_id: actorId, idempotency_key: identity.dms_idempotency_key,
        object_id: identity.object_id, session_id: identity.upload_session_id, version_number: 1,
      });
    } catch (error) {
      repository.transaction((tx) => {
        tx.update({ tenant_id: tenantId, model_type: "MatterBuilderPublicationReconciliation", resource_id: identity.reconciliation_id }, { status: "upload_failed", safe_error_code: error?.safe_error_code ?? error?.code ?? "DMS_UPLOAD_FAILED", updated_at: now });
        tx.update({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId }, { publish_state: "approved_unpublished", updated_at: now });
      });
      throw error;
    }
    try {
      markReconciliationRequired(repository, context, uploaded);
      return finalizeMatterPublication(repository, context, uploaded);
    } catch (error) {
      try { markReconciliationRequired(repository, context, uploaded, error); } catch {}
      throw Object.assign(new Error("DMS upload completed; Matter publication reconciliation is required"), {
        code: "MATTER_PUBLICATION_RECONCILIATION_REQUIRED", safe_error_code: "MATTER_PUBLICATION_RECONCILIATION_REQUIRED",
        status: 503, cause: error, persistence_error_code: safePersistenceError(error),
      });
    }
  }

  return Object.freeze({
    publishBuilderDraftToVault,
    reconcileBuilderPublication: publishBuilderDraftToVault,
  });
}
