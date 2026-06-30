import { createApprovalRequest, evaluateProviderReceipt } from "./approvalProviderRunKernel.js";
import { assertNoForbiddenProjection, redactLcxFullValue } from "./readinessModel.js";

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;

function safeRef(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const ref = value.trim();
  return SAFE_REF_PATTERN.test(ref) ? ref : fallback;
}

function safeRefs(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(values.map((value) => safeRef(value)).filter(Boolean).slice(0, 24));
}

function safeHash(value) {
  const source = JSON.stringify(redactLcxFullValue(value));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function approvalReady(approval) {
  return approval?.approval_state === "approved" && Boolean(approval.owner_receipt_ref);
}

function actionAudit({ action, objectRef, actorRef = "actor:lcx-full" }) {
  const request = createApprovalRequest({
    actor_ref: actorRef,
    object_ref: objectRef,
    reason_ref: `reason:${action}`,
    approval_scope: `scope:${action}`
  });
  return Object.freeze({
    audit_events: request.audit_events,
    audit_required: true,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function createContractDraftPackage({
  proposalRef = "proposal:lcx-full",
  clientRef = "client:lcx-full",
  vaultDocumentRefs = [],
  actorRef = "actor:client-contracts"
} = {}) {
  const documentRefs = safeRefs(vaultDocumentRefs);
  const draftId = `contract-draft:${safeHash({ proposalRef, clientRef, documentRefs }).slice(0, 12)}`;
  return Object.freeze({
    draft_id: draftId,
    proposal_ref: safeRef(proposalRef, "proposal:lcx-full"),
    client_ref: safeRef(clientRef, "client:lcx-full"),
    draft_state: documentRefs.length > 0 ? "drafted" : "vault_document_required",
    vault_document_refs: documentRefs,
    vault_document_ref_present: documentRefs.length > 0,
    document_payload_included: false,
    signer_roles_required: Object.freeze(["client_signer", "firm_signer"]),
    ...actionAudit({ action: "contract_draft", objectRef: draftId, actorRef })
  });
}

export function validateContractSigners({ draft, signers = [] } = {}) {
  const roles = new Set();
  const safeSigners = signers.map((signer) => {
    const role = safeRef(signer?.role);
    const signerRef = safeRef(signer?.signer_ref);
    const fieldPacketRef = safeRef(signer?.field_packet_ref);
    if (role) roles.add(role);
    return Object.freeze({
      role,
      signer_ref: signerRef,
      field_packet_ref: fieldPacketRef,
      signing_order: Number.isSafeInteger(signer?.signing_order) ? signer.signing_order : 0,
      contact_value_included: false
    });
  });
  const missingRoles = (draft?.signer_roles_required ?? []).filter((role) => !roles.has(role));
  const missingFields = safeSigners
    .filter((signer) => !signer.role || !signer.signer_ref || !signer.field_packet_ref || signer.signing_order <= 0)
    .map((signer) => signer.role || "unknown_role");
  return Object.freeze({
    signer_state: missingRoles.length === 0 && missingFields.length === 0 ? "valid" : "blocked",
    signers: Object.freeze(safeSigners),
    missing_roles: Object.freeze(missingRoles),
    missing_required_fields: Object.freeze(missingFields),
    contact_values_included: false
  });
}

export function createESignSendRequest({ draft, signerValidation, providerReceipt, approval, actorRef = "actor:client-contracts" } = {}) {
  const provider = evaluateProviderReceipt({ receipt: providerReceipt, requiredScope: "esign.send" });
  const draftReady = draft?.draft_state === "drafted";
  const signersReady = signerValidation?.signer_state === "valid";
  const ownerReady = approvalReady(approval);
  const requestState = !draftReady
    ? "draft-blocked"
    : !signersReady
      ? "signer-fields-blocked"
      : !ownerReady
        ? "owner-blocked"
        : !provider.allowed
          ? "provider-blocked"
          : "request-ready";
  return Object.freeze({
    request_id: `esign-send:${safeHash({ draft, signerValidation, provider }).slice(0, 12)}`,
    draft_id: safeRef(draft?.draft_id, "contract-draft:missing"),
    request_state: requestState,
    provider_reason: provider.reason,
    provider_receipt_state: provider.receipt.receipt_state,
    envelope_sent: false,
    external_signature_request_performed: false,
    provider_payload_included: false,
    ...actionAudit({ action: "esign_send_request", objectRef: safeRef(draft?.draft_id, "contract-draft:missing"), actorRef })
  });
}

function createProviderRequest({
  requestKind,
  requestRef,
  objectRef,
  providerScope,
  providerReceipt,
  approval,
  amountCents = 0,
  currency = "KRW",
  actorRef = "actor:billing"
} = {}) {
  const provider = evaluateProviderReceipt({ receipt: providerReceipt, requiredScope: providerScope });
  const ownerReady = approvalReady(approval);
  return Object.freeze({
    request_id: `${requestKind}:${safeHash({ requestRef, objectRef, providerScope }).slice(0, 12)}`,
    request_kind: requestKind,
    request_ref: safeRef(requestRef, `${requestKind}:lcx-full`),
    object_ref: safeRef(objectRef, "object:lcx-full"),
    request_state: !ownerReady ? "owner-blocked" : provider.allowed ? "request-ready" : "provider-blocked",
    provider_reason: provider.reason,
    provider_receipt_state: provider.receipt.receipt_state,
    amount_cents: Number.isSafeInteger(amountCents) ? amountCents : 0,
    currency: safeRef(currency, "KRW"),
    external_mutation_performed: false,
    provider_payload_included: false,
    ...actionAudit({ action: requestKind, objectRef: safeRef(objectRef, "object:lcx-full"), actorRef })
  });
}

export function createInvoiceIssueRequest(input = {}) {
  return createProviderRequest({ ...input, requestKind: "invoice_issue", providerScope: "invoice.issue" });
}

export function createPaymentSendRequest(input = {}) {
  return Object.freeze({
    ...createProviderRequest({ ...input, requestKind: "payment_collect", providerScope: "payment.collect" }),
    money_movement_performed: false
  });
}

export function createTaxInvoiceIssueRequest(input = {}) {
  return Object.freeze({
    ...createProviderRequest({ ...input, requestKind: "tax_invoice_issue", providerScope: "tax-invoice.issue" }),
    tax_invoice_issued_external: false
  });
}

export function createBillingReconciliation({ invoiceRefs = [], paymentRefs = [], arSnapshotRef = "ar:snapshot" } = {}) {
  return Object.freeze({
    reconciliation_id: `billing-recon:${safeHash({ invoiceRefs, paymentRefs, arSnapshotRef }).slice(0, 12)}`,
    invoice_refs: safeRefs(invoiceRefs),
    payment_refs: safeRefs(paymentRefs),
    ar_snapshot_ref: safeRef(arSnapshotRef, "ar:snapshot"),
    reconciliation_state: "readback-safe",
    external_mutation_performed: false,
    provider_payload_included: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function createMatterMessageDraft({
  matterRef = "matter:lcx-full",
  channelRef = "channel:email",
  bodyRef = "body:safe-template",
  attachmentRefs = [],
  actorRef = "actor:matter-comms"
} = {}) {
  const attachments = safeRefs(attachmentRefs);
  const draftId = `matter-message-draft:${safeHash({ matterRef, channelRef, bodyRef, attachments }).slice(0, 12)}`;
  return Object.freeze({
    draft_id: draftId,
    matter_ref: safeRef(matterRef, "matter:lcx-full"),
    channel_ref: safeRef(channelRef, "channel:email"),
    body_ref: safeRef(bodyRef, "body:safe-template"),
    attachment_refs: attachments,
    draft_state: "drafted",
    message_body_included: false,
    attachment_paths_included: false,
    ...actionAudit({ action: "matter_message_draft", objectRef: draftId, actorRef })
  });
}

export function validateMatterRecipients({ recipientRefs = [] } = {}) {
  const accepted = safeRefs(recipientRefs);
  return Object.freeze({
    recipient_policy_state: accepted.length > 0 && accepted.length === recipientRefs.length ? "valid" : "blocked",
    recipient_refs: accepted,
    rejected_count: Math.max(0, recipientRefs.length - accepted.length),
    contact_values_included: false
  });
}

export function createMatterCommsSendRequest({ draft, recipientPolicy, providerReceipt, approval, actorRef = "actor:matter-comms" } = {}) {
  const provider = evaluateProviderReceipt({ receipt: providerReceipt, requiredScope: "message.send" });
  const requestState = draft?.draft_state !== "drafted"
    ? "draft-blocked"
    : recipientPolicy?.recipient_policy_state !== "valid"
      ? "recipient-policy-blocked"
      : !approvalReady(approval)
        ? "owner-blocked"
        : !provider.allowed
          ? "provider-blocked"
          : "send-requested";
  return Object.freeze({
    request_id: `matter-comms-send:${safeHash({ draft, recipientPolicy, provider }).slice(0, 12)}`,
    draft_id: safeRef(draft?.draft_id, "matter-message-draft:missing"),
    request_state: requestState,
    provider_reason: provider.reason,
    provider_receipt_state: provider.receipt.receipt_state,
    external_message_sent: false,
    provider_payload_included: false,
    ...actionAudit({ action: "matter_comms_send_request", objectRef: safeRef(draft?.draft_id, "matter-message-draft:missing"), actorRef })
  });
}

export function assertExternalProviderWorkflowSafe(value) {
  return assertNoForbiddenProjection(redactLcxFullValue(value));
}
