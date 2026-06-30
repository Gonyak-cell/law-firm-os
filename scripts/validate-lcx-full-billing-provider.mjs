#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createBillingReconciliation,
  createInvoiceIssueRequest,
  createPaymentSendRequest,
  createTaxInvoiceIssueRequest
} from "../apps/web/src/data/externalProviderWorkflowKernel.js";
import {
  BILLING_PROOF_PATH,
  BILLING_RECEIPT_MD_PATH,
  BILLING_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:billing-provider:validate"], "node scripts/validate-lcx-full-billing-provider.mjs");
assert.equal(packageJson.scripts?.["lcx:full:billing-browser-proof"], "node scripts/run-lcx-full-billing-browser-proof.mjs");
const proof = readJson(BILLING_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const approval = { approval_state: "approved", owner_receipt_ref: "owner:receipt:billing-local" };
const providerReceipt = {
  environment: "production",
  production_receipt_ref: "provider:receipt:billing-local",
  scopes: ["invoice.issue", "payment.collect", "tax-invoice.issue"],
  expires_at: "2999-01-01T00:00:00.000Z"
};
const invoiceBlocked = createInvoiceIssueRequest({
  requestRef: "invoice:lcx-full-12",
  objectRef: "matter:lcx-full-12",
  amountCents: 300000,
  approval
});
const invoiceReady = createInvoiceIssueRequest({
  requestRef: "invoice:lcx-full-12",
  objectRef: "matter:lcx-full-12",
  amountCents: 300000,
  providerReceipt,
  approval
});
const paymentReady = createPaymentSendRequest({
  requestRef: "payment:lcx-full-12",
  objectRef: "invoice:lcx-full-12",
  amountCents: 300000,
  providerReceipt,
  approval
});
const taxInvoiceReady = createTaxInvoiceIssueRequest({
  requestRef: "tax-invoice:lcx-full-12",
  objectRef: "invoice:lcx-full-12",
  amountCents: 300000,
  providerReceipt,
  approval
});
const reconciliation = createBillingReconciliation({
  invoiceRefs: ["invoice:lcx-full-12"],
  paymentRefs: ["payment:lcx-full-12"],
  arSnapshotRef: "ar:lcx-full-12"
});

assert.equal(invoiceBlocked.request_state, "provider-blocked");
assert.equal(invoiceReady.request_state, "request-ready");
assert.equal(invoiceReady.external_mutation_performed, false);
assert.equal(paymentReady.request_state, "request-ready");
assert.equal(paymentReady.money_movement_performed, false);
assert.equal(taxInvoiceReady.request_state, "request-ready");
assert.equal(taxInvoiceReady.tax_invoice_issued_external, false);
assert.equal(reconciliation.reconciliation_state, "readback-safe");
assert.equal(reconciliation.external_mutation_performed, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.billing_provider_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-12.01", "LCX-FULL-12.02", "LCX-FULL-12.03", "LCX-FULL-12.04", "LCX-FULL-12.05"],
  verdict: "PASS",
  browser_proof: BILLING_PROOF_PATH,
  invoice_blocked_state: invoiceBlocked.request_state,
  invoice_request_state: invoiceReady.request_state,
  payment_request_state: paymentReady.request_state,
  tax_invoice_request_state: taxInvoiceReady.request_state,
  reconciliation_state: reconciliation.reconciliation_state,
  boundary: {
    invoice_issue_complete_claim: false,
    money_movement_performed: false,
    tax_invoice_issued_external: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(BILLING_RECEIPT_PATH, receipt);
writeText(
  BILLING_RECEIPT_MD_PATH,
  `# LCX-FULL-12 Billing Provider Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "invoice missing provider", Result: invoiceBlocked.request_state }, { Check: "invoice request", Result: invoiceReady.request_state }, { Check: "payment request", Result: paymentReady.request_state }, { Check: "tax invoice request", Result: taxInvoiceReady.request_state }, { Check: "reconciliation", Result: reconciliation.reconciliation_state }], ["Check", "Result"])}\n\nBoundary: billing requests are request-ready/readback-safe only; no external invoice issue, money movement, tax invoice external issue, provider production write, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: BILLING_RECEIPT_PATH }, null, 2));
