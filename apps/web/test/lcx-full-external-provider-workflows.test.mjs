import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertExternalProviderWorkflowSafe,
  createBillingReconciliation,
  createContractDraftPackage,
  createESignSendRequest,
  createInvoiceIssueRequest,
  createMatterCommsSendRequest,
  createMatterMessageDraft,
  createPaymentSendRequest,
  createTaxInvoiceIssueRequest,
  validateContractSigners,
  validateMatterRecipients
} from "../src/data/externalProviderWorkflowKernel.js";

const approved = Object.freeze({
  approval_state: "approved",
  owner_receipt_ref: "owner:receipt:local-proof"
});

const receipt = Object.freeze({
  environment: "production",
  production_receipt_ref: "provider:receipt:local-proof",
  scopes: ["esign.send", "invoice.issue", "payment.collect", "tax-invoice.issue", "message.send"],
  expires_at: "2999-01-01T00:00:00.000Z"
});

test("contract draft and signer validation reach request-ready without sending", () => {
  const draft = createContractDraftPackage({
    proposalRef: "proposal:001",
    clientRef: "client:001",
    vaultDocumentRefs: ["vault-doc:001"]
  });
  const missing = validateContractSigners({ draft, signers: [{ role: "client_signer", signer_ref: "party:client", signing_order: 1 }] });
  const valid = validateContractSigners({
    draft,
    signers: [
      { role: "client_signer", signer_ref: "party:client", field_packet_ref: "fields:client", signing_order: 1 },
      { role: "firm_signer", signer_ref: "party:firm", field_packet_ref: "fields:firm", signing_order: 2 }
    ]
  });
  const blocked = createESignSendRequest({ draft, signerValidation: valid, approval: approved });
  const ready = createESignSendRequest({ draft, signerValidation: valid, providerReceipt: receipt, approval: approved });

  assert.equal(draft.draft_state, "drafted");
  assert.equal(draft.document_payload_included, false);
  assert.equal(missing.signer_state, "blocked");
  assert.equal(valid.signer_state, "valid");
  assert.equal(blocked.request_state, "provider-blocked");
  assert.equal(ready.request_state, "request-ready");
  assert.equal(ready.envelope_sent, false);
  assert.equal(assertExternalProviderWorkflowSafe(ready).valid, true);
});

test("billing, payment, tax invoice requests stay provider gated and non-mutating", () => {
  const invoiceBlocked = createInvoiceIssueRequest({ requestRef: "invoice:001", objectRef: "matter:001", amountCents: 100000, approval: approved });
  const invoiceReady = createInvoiceIssueRequest({ requestRef: "invoice:001", objectRef: "matter:001", amountCents: 100000, providerReceipt: receipt, approval: approved });
  const payment = createPaymentSendRequest({ requestRef: "payment:001", objectRef: "invoice:001", amountCents: 100000, providerReceipt: receipt, approval: approved });
  const taxInvoice = createTaxInvoiceIssueRequest({ requestRef: "tax-invoice:001", objectRef: "invoice:001", amountCents: 100000, providerReceipt: receipt, approval: approved });
  const reconciliation = createBillingReconciliation({ invoiceRefs: ["invoice:001"], paymentRefs: ["payment:001"], arSnapshotRef: "ar:2026-06" });

  assert.equal(invoiceBlocked.request_state, "provider-blocked");
  assert.equal(invoiceReady.request_state, "request-ready");
  assert.equal(payment.money_movement_performed, false);
  assert.equal(payment.external_mutation_performed, false);
  assert.equal(taxInvoice.tax_invoice_issued_external, false);
  assert.equal(reconciliation.reconciliation_state, "readback-safe");
  assert.equal(assertExternalProviderWorkflowSafe({ invoiceReady, payment, taxInvoice, reconciliation }).valid, true);
});

test("matter comms draft validates recipients and never performs external send", () => {
  const draft = createMatterMessageDraft({
    matterRef: "matter:001",
    bodyRef: "template:matter-update",
    attachmentRefs: ["vault-doc:001"]
  });
  const invalidRecipients = validateMatterRecipients({ recipientRefs: ["party:client", "client@example.com"] });
  const validRecipients = validateMatterRecipients({ recipientRefs: ["party:client"] });
  const blocked = createMatterCommsSendRequest({ draft, recipientPolicy: validRecipients, approval: approved });
  const requested = createMatterCommsSendRequest({ draft, recipientPolicy: validRecipients, providerReceipt: receipt, approval: approved });

  assert.equal(draft.draft_state, "drafted");
  assert.equal(draft.message_body_included, false);
  assert.equal(invalidRecipients.recipient_policy_state, "blocked");
  assert.equal(validRecipients.recipient_policy_state, "valid");
  assert.equal(blocked.request_state, "provider-blocked");
  assert.equal(requested.request_state, "send-requested");
  assert.equal(requested.external_message_sent, false);
  assert.equal(assertExternalProviderWorkflowSafe(requested).valid, true);
});
