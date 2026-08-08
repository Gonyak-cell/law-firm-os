import { canonicalizeAgreementInput } from "./agreement-input.js";
import { appendBuilderAudit, appendBuilderTimeline } from "./document-builder-events.js";
import {
  hashValue,
  idempotencyConflict,
  requiredString,
  safeId,
} from "./document-builder-values.js";
import { safeApproval, safeApprovalReceipt, safeDraft } from "./document-builder-safe-projection.js";

const REQUEST_OPERATION = "matter_builder_approval_request";
const DECISION_OPERATION = "matter_builder_approval_decision";

function builderReceipt(payload) {
  const canonical = {
    receipt_id: payload.receipt_id,
    approval_request_id: payload.approval_request_id,
    approved_by_ref: payload.approved_by_ref,
    approved_at: payload.approved_at,
    input_hash: payload.input_hash,
    input_fingerprint: payload.input_fingerprint,
    template_hash: payload.template_hash,
  };
  return Object.freeze({ ...canonical, receipt_hash: hashValue(canonical) });
}

export function validateBuilderApprovalReceipt(receipt, {
  approvalId,
  approvedAt,
  approvedByRef,
  inputFingerprint,
  inputHash,
  receiptId,
  templateHash,
} = {}) {
  if (!receipt || receipt.receipt_id !== receiptId
    || receipt.approval_request_id !== approvalId
    || receipt.approved_at !== approvedAt
    || receipt.approved_by_ref !== approvedByRef
    || receipt.input_fingerprint !== inputFingerprint
    || receipt.template_hash !== templateHash
    || receipt.input_hash !== inputHash) {
    throw new Error("builder approval receipt does not match approved content");
  }
  if (builderReceipt(receipt).receipt_hash !== receipt.receipt_hash) {
    throw new Error("builder approval receipt hash does not match canonical receipt");
  }
  return receipt;
}

function approvalInput(current, template, generatedAt) {
  return canonicalizeAgreementInput({
    tenant_id: current.tenant_id, matter_id: current.matter_id, draft_id: current.draft_id,
    title: current.title, template, merge_data: current.merge_data,
    signer_role_refs: current.signer_role_refs, generated_at: generatedAt,
  });
}

export function createDocumentApprovalService({ repository, readTemplate, clock }) {
  function requestBuilderApproval({ tenant_id, matter_id, draft_id, actor_id, idempotency_key, occurred_at } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    const draftId = requiredString(draft_id, "draft_id", { max: 128 });
    const actorId = requiredString(actor_id, "actor_id", { max: 160 });
    const key = requiredString(idempotency_key, "idempotency_key", { max: 200 });
    const now = occurred_at ?? clock();
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const fingerprint = hashValue({ operation: REQUEST_OPERATION, tenant_id: tenantId, matter_id: matterId, draft_id: draftId, actor_id: actorId, input_fingerprint: current.input_fingerprint, template_hash: current.template_hash });
    const replayId = `builder_approval_replay_${hashValue({ tenantId, key }).slice(0, 32)}`;
    const replay = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderApprovalReplay", resource_id: replayId });
    if (replay) {
      if (replay.operation !== REQUEST_OPERATION || replay.request_fingerprint !== fingerprint) throw idempotencyConflict();
      return Object.freeze({ ...replay.stored_response, outcome: "idempotent_replay" });
    }
    if (current.immutable || current.approval_state === "approved") throw new Error("approved builder draft cannot request approval again");
    const approvalId = safeId(`builder_approval_${draftId}_${current.input_fingerprint.slice(0, 16)}`);
    return repository.transaction((tx) => {
      const request = tx.create({
        model_type: "MatterBuilderApprovalRequest", resource_id: approvalId, approval_request_id: approvalId,
        tenant_id: tenantId, matter_id: matterId, draft_id: draftId, status: "pending_owner_approval",
        reviewer_role: "owner", input_fingerprint: current.input_fingerprint, template_hash: current.template_hash,
        approval_receipt: null, created_by: actorId, created_at: now,
        raw_body_included: false, raw_contact_values_included: false,
      });
      const updated = tx.update(
        { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: draftId },
        { status: "ready_for_review", approval_state: "approval_required", publish_state: "owner_blocked", approval_request_id: approvalId, updated_at: now },
      );
      const audit = appendBuilderAudit(tx, {
        event_id: `matter.builder.approval.requested:${tenantId}:${matterId}:${approvalId}`,
        tenant_id: tenantId, actor_id: actorId, action: "matter.builder.approval.requested",
        object_type: "MatterBuilderApprovalRequest", object_id: approvalId, decision: "blocked",
        reason: "owner_approval_required", occurred_at: now,
        metadata: { input_fingerprint: current.input_fingerprint, owner_approval_ref_included: false },
      });
      const response = Object.freeze({ outcome: "approval_required", ui_state: "owner_blocked", item: safeDraft(updated), approval_request: safeApproval(request), audit_event: audit });
      tx.create({
        model_type: "MatterBuilderApprovalReplay", resource_id: replayId, replay_id: replayId,
        tenant_id: tenantId, matter_id: matterId, draft_id: draftId, operation: REQUEST_OPERATION,
        idempotency_key_hash: hashValue(key), request_fingerprint: fingerprint, stored_response: response,
        created_at: now, raw_body_included: false, raw_contact_values_included: false,
      });
      return response;
    });
  }

  function listBuilderApprovalRequests({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(matter_id, "matter_id", { max: 128 });
    return Object.freeze(repository.list({ tenant_id: tenantId, matter_id: matterId, model_type: "MatterBuilderApprovalRequest" })
      .filter((record) => record.hidden_from_actor !== true && record.silent !== true)
      .map(safeApproval)
      .sort((left, right) => String(right.approval_request_id).localeCompare(String(left.approval_request_id))));
  }

  function decideBuilderApproval(input = {}) {
    if (!input.authorized_owner) throw new Error("owner approval authorization is required");
    const tenantId = requiredString(input.tenant_id, "tenant_id", { max: 128 });
    const matterId = requiredString(input.matter_id, "matter_id", { max: 128 });
    const approvalId = requiredString(input.approval_request_id, "approval_request_id", { max: 160 });
    const actorId = requiredString(input.actor_id, "actor_id", { max: 160 });
    const key = requiredString(input.idempotency_key, "idempotency_key", { max: 200 });
    const decision = requiredString(input.decision, "decision", { max: 16 });
    if (!["approved", "rejected"].includes(decision)) throw new TypeError("decision is invalid");
    const now = input.occurred_at ?? clock();
    const request = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderApprovalRequest", resource_id: approvalId });
    if (!request || request.matter_id !== matterId) throw new Error("builder approval request not found");
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: request.draft_id });
    if (!current || current.matter_id !== matterId) throw new Error("builder draft not found");
    const fingerprint = hashValue({ operation: DECISION_OPERATION, tenant_id: tenantId, matter_id: matterId, approval_id: approvalId, actor_id: actorId, decision, input_fingerprint: current.input_fingerprint, template_hash: current.template_hash });
    const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: key });
    if (replay) {
      if (replay.operation !== DECISION_OPERATION || replay.request_fingerprint !== fingerprint) throw idempotencyConflict("idempotency key cannot be reused for a changed approval decision");
      return Object.freeze({ ...replay.response, outcome: "idempotent_replay" });
    }
    if (request.status !== "pending_owner_approval") throw new Error("builder approval request is already decided");
    if (current.input_fingerprint !== request.input_fingerprint || current.template_hash !== request.template_hash) throw new Error("approval request is stale for the current builder draft");
    const template = readTemplate({ tenant_id: tenantId, template_id: current.template_id, template_version: current.template_version });
    const canonical = decision === "approved" ? approvalInput(current, template, now) : null;
    const receipt = canonical ? builderReceipt({
      receipt_id: `builder-approval-receipt:${approvalId}:${canonical.input_hash.slice(0, 16)}`,
      approval_request_id: approvalId, approved_by_ref: actorId, approved_at: canonical.generated_at,
      input_hash: canonical.input_hash, input_fingerprint: current.input_fingerprint, template_hash: template.template_hash,
    }) : null;
    return repository.transaction((tx) => {
      const updatedRequest = tx.update({ tenant_id: tenantId, model_type: "MatterBuilderApprovalRequest", resource_id: approvalId }, { status: decision, decision, decision_at: now, decision_by: actorId, approval_receipt: receipt });
      const updatedDraft = tx.update(
        { tenant_id: tenantId, model_type: "MatterBuilderDraft", resource_id: current.draft_id },
        decision === "approved"
          ? { status: "approved", approval_state: "approved", publish_state: "approved_unpublished", approval_receipt: receipt, updated_by: actorId, updated_at: now }
          : { status: "draft", approval_state: "rejected", publish_state: "owner_blocked", approval_receipt: null, updated_by: actorId, updated_at: now },
      );
      const audit = appendBuilderAudit(tx, { event_id: `matter.builder.approval.${decision}:${tenantId}:${matterId}:${approvalId}`, tenant_id: tenantId, actor_id: actorId, action: `matter.builder.approval.${decision}`, object_type: "MatterBuilderApprovalRequest", object_id: approvalId, decision: decision === "approved" ? "allow" : "deny", reason: `owner_${decision}`, occurred_at: now, metadata: { input_hash: receipt?.input_hash ?? null, input_fingerprint: current.input_fingerprint, template_hash: template.template_hash, approval_receipt_id: receipt?.receipt_id ?? null } });
      const timeline = appendBuilderTimeline(tx, { event_id: `matter.timeline.builder_approval:${tenantId}:${matterId}:${approvalId}`, tenant_id: tenantId, matter_id: matterId, occurred_at: now, type: `matter.builder.approval.${decision}`, title: decision === "approved" ? "문서 초안 승인" : "문서 초안 반려", source_ref: approvalId, source_object_id: current.draft_id, safe_summary: { decision, approval_receipt_id: receipt?.receipt_id ?? null, template_hash: template.template_hash } });
      const response = Object.freeze({ outcome: decision, item: safeDraft(updatedDraft), approval_request: safeApproval(updatedRequest), approval_receipt: safeApprovalReceipt(receipt), audit_event: audit, timeline_event: timeline });
      tx.recordIdempotency({ tenant_id: tenantId, idempotency_key: key, operation: DECISION_OPERATION, object_type: "MatterBuilderApprovalRequest", object_id: approvalId, actor_id: actorId, request_fingerprint: fingerprint, response, created_at: now });
      return response;
    });
  }

  return Object.freeze({ requestBuilderApproval, listBuilderApprovalRequests, decideBuilderApproval });
}
