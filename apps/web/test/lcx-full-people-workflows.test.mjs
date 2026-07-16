import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertPeopleWorkflowSafe,
  buildPeopleReadinessCatalog,
  configurePeopleSetupRows,
  createPeopleGovernancePacket,
  createPeopleIntegrationRequest
} from "../src/data/peopleWorkflowKernel.js";

const ownerReceiptRef = "owner:receipt:people-local";
const providerReceipt = Object.freeze({
  environment: "production",
  production_receipt_ref: "provider:receipt:people-local",
  scopes: ["people.e-contract.send", "people.payroll.export", "people.message.send", "people.integration.register"],
  expires_at: "2999-01-01T00:00:00.000Z"
});

test("people setup derives readiness from catalog and configures selected rows", () => {
  const catalog = buildPeopleReadinessCatalog();
  const setup = configurePeopleSetupRows();

  assert.equal(catalog.catalog_state, "derived_from_people_feature_catalog");
  assert.ok(catalog.total_features >= 70);
  assert.ok(catalog.state_counts.setup_required >= 1);
  assert.equal(catalog.count_source_hard_coded, false);
  assert.equal(setup.setup_state, "configured");
  assert.equal(setup.payroll_calculation_claim, false);
  assert.equal(assertPeopleWorkflowSafe({ catalog, setup }).valid, true);
});

test("people governance keeps approval, permission, field policy, and connected app guarded", () => {
  const packet = createPeopleGovernancePacket();
  const readyPacket = createPeopleGovernancePacket({
    connectedAppProviderReceipt: {
      environment: "production",
      production_receipt_ref: "provider:receipt:connected-app",
      scopes: ["people.connected-app.write"],
      expires_at: "2999-01-01T00:00:00.000Z"
    }
  });

  assert.equal(packet.approval_type_state, "configured");
  assert.equal(packet.permission_action_state, "owner-audit-required");
  assert.equal(packet.field_policy_state, "sensitive-field-guarded");
  assert.equal(packet.connected_app_state, "provider-blocked");
  assert.equal(readyPacket.connected_app_state, "request-ready");
  assert.equal(packet.direct_permission_mutation_performed, false);
  assert.equal(assertPeopleWorkflowSafe({ packet, readyPacket }).valid, true);
});

test("people integrations are request-ready only and never send/payroll-disburse", () => {
  const blockedContract = createPeopleIntegrationRequest({ integrationKind: "e_contract", ownerReceiptRef });
  const contract = createPeopleIntegrationRequest({ integrationKind: "e_contract", providerReceipt, ownerReceiptRef });
  const payroll = createPeopleIntegrationRequest({ integrationKind: "payroll", providerReceipt, ownerReceiptRef });
  const message = createPeopleIntegrationRequest({ integrationKind: "message", providerReceipt, ownerReceiptRef });
  const registry = createPeopleIntegrationRequest({ integrationKind: "company_registry", providerReceipt, ownerReceiptRef });

  assert.equal(blockedContract.request_state, "provider-blocked");
  assert.equal(contract.request_state, "request-ready");
  assert.equal(payroll.request_state, "request-ready");
  assert.equal(message.request_state, "request-ready");
  assert.equal(registry.request_state, "request-ready");
  assert.equal(contract.external_send_performed, false);
  assert.equal(payroll.payroll_disbursement_performed, false);
  assert.equal(message.external_send_performed, false);
  assert.equal(assertPeopleWorkflowSafe({ contract, payroll, message, registry }).valid, true);
});
