#!/usr/bin/env node
import assert from "node:assert/strict";
import { createPeopleIntegrationRequest } from "../apps/web/src/data/peopleWorkflowKernel.js";
import {
  PEOPLE_INTEGRATIONS_PROOF_PATH,
  PEOPLE_INTEGRATIONS_RECEIPT_MD_PATH,
  PEOPLE_INTEGRATIONS_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:people-integrations:validate"], "node scripts/validate-lcx-full-people-integrations.mjs");
assert.equal(packageJson.scripts?.["lcx:full:people-integrations-browser-proof"], "node scripts/run-lcx-full-people-integrations-browser-proof.mjs");
const proof = readJson(PEOPLE_INTEGRATIONS_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const ownerReceiptRef = "owner:receipt:people-integrations-local";
const productionReceipt = {
  environment: "production",
  production_receipt_ref: "provider:receipt:people-integrations",
  scopes: ["people.e-contract.send", "people.payroll.export", "people.message.send", "people.integration.register"],
  expires_at: "2999-01-01T00:00:00.000Z"
};
const sandboxReceipt = {
  environment: "sandbox",
  sandbox_receipt_ref: "provider:sandbox:people-integrations",
  scopes: ["people.integration.register"],
  expires_at: "2999-01-01T00:00:00.000Z"
};

const eContractBlocked = createPeopleIntegrationRequest({ integrationKind: "e_contract", ownerReceiptRef });
const eContractReady = createPeopleIntegrationRequest({ integrationKind: "e_contract", providerReceipt: productionReceipt, ownerReceiptRef });
const payrollReady = createPeopleIntegrationRequest({ integrationKind: "payroll", providerReceipt: productionReceipt, ownerReceiptRef });
const messageReady = createPeopleIntegrationRequest({ integrationKind: "message", providerReceipt: productionReceipt, ownerReceiptRef });
const registryReady = createPeopleIntegrationRequest({ integrationKind: "company_registry", providerReceipt: productionReceipt, ownerReceiptRef });
const sandboxRegistry = createPeopleIntegrationRequest({ integrationKind: "company_registry", providerReceipt: sandboxReceipt, ownerReceiptRef });

assert.equal(eContractBlocked.request_state, "provider-blocked");
assert.equal(eContractReady.request_state, "request-ready");
assert.equal(payrollReady.request_state, "request-ready");
assert.equal(messageReady.request_state, "request-ready");
assert.equal(registryReady.request_state, "request-ready");
assert.equal(sandboxRegistry.request_state, "provider-blocked");
assert.equal(eContractReady.external_send_performed, false);
assert.equal(messageReady.external_send_performed, false);
assert.equal(payrollReady.payroll_calculation_performed, false);
assert.equal(payrollReady.payroll_disbursement_performed, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.people_integrations_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-16.01", "LCX-FULL-16.02", "LCX-FULL-16.03", "LCX-FULL-16.04", "LCX-FULL-16.05"],
  verdict: "PASS",
  browser_proof: PEOPLE_INTEGRATIONS_PROOF_PATH,
  e_contract_missing_provider_state: eContractBlocked.request_state,
  e_contract_request_state: eContractReady.request_state,
  payroll_request_state: payrollReady.request_state,
  message_request_state: messageReady.request_state,
  company_registry_request_state: registryReady.request_state,
  sandbox_registry_state: sandboxRegistry.request_state,
  boundary: {
    external_send_performed: false,
    payroll_calculation_performed: false,
    payroll_disbursement_performed: false,
    sandbox_receipt_promoted_to_production: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PEOPLE_INTEGRATIONS_RECEIPT_PATH, receipt);
writeText(
  PEOPLE_INTEGRATIONS_RECEIPT_MD_PATH,
  `# LCX-FULL-16 People Integrations Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "e-contract missing provider", Result: eContractBlocked.request_state }, { Check: "e-contract request", Result: eContractReady.request_state }, { Check: "payroll request", Result: payrollReady.request_state }, { Check: "message request", Result: messageReady.request_state }, { Check: "company registry", Result: registryReady.request_state }, { Check: "sandbox registry", Result: sandboxRegistry.request_state }], ["Check", "Result"])}\n\nBoundary: People integrations are provider-gated request evidence only; no external send, payroll calculation/disbursement, sandbox promotion, provider production write, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: PEOPLE_INTEGRATIONS_RECEIPT_PATH }, null, 2));
