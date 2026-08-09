import assert from "node:assert/strict";
import test from "node:test";
import {
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
  normalizeDocusignConnection,
} from "../src/index.js";
import { APPROVED_SOURCE, approvedInput, CONNECTION, DOCX_BYTES, TENANT } from "./docusign-outbox-fixtures.js";

test("OUTM-33 binds server principal, tenant, account, approved hash, role, and anchor", async () => {
  assert.throws(() => normalizeDocusignConnection({ ...CONNECTION, credential_refs: { ...CONNECTION.credential_refs, integration_key: "00000000-0000-0000-0000-000000000000" } }), /opaque AWS Secrets Manager reference/u);
  const repository = createDocusignEnvelopeRepository();
  let connection = CONNECTION;
  let approvedSource = APPROVED_SOURCE;
  let artifactScopeOverride = {};
  let providerCalls = 0;
  const adapter = { createDraft: async () => { providerCalls += 1; return { envelope_id: "envelope" }; }, send: async () => { providerCalls += 1; return { status: "sent" }; } };
  const service = createDocusignEnvelopeService({ repository, connectionResolver: async () => connection, approvedDocumentResolver: async () => approvedSource, artifactReader: async (binding) => ({ ...binding, ...artifactScopeOverride, bytes: DOCX_BYTES }), recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "s@example.test" }), adapter, clock: () => "2026-08-08T01:00:00.000Z" });
  await assert.rejects(service.queueApprovedRequest(approvedInput({ principal: { tenant_id: "tenant-other", actor_id: "forged" } })), (error) => error?.safe_error_code === "DOCUSIGN_TENANT_MISMATCH");
  await assert.rejects(service.queueApprovedRequest(approvedInput({ document: APPROVED_SOURCE.document })), (error) => error?.safe_error_code === "DOCUSIGN_AUTHORITATIVE_SOURCE_REQUIRED");
  approvedSource = { ...APPROVED_SOURCE, document: { ...APPROVED_SOURCE.document, owner_approved: false } };
  await assert.rejects(service.queueApprovedRequest(approvedInput()), (error) => error?.safe_error_code === "DOCUSIGN_APPROVED_IMMUTABLE_DOCUMENT_REQUIRED");
  approvedSource = { ...APPROVED_SOURCE, anchor_manifest: { anchors: [{ role: "other", anchor: "/sig/" }] } };
  await assert.rejects(service.queueApprovedRequest(approvedInput()), /signature anchor is required for role client/u);
  approvedSource = APPROVED_SOURCE;
  await service.queueApprovedRequest(approvedInput());
  await assert.rejects(service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-other" }, request_id: "esign-request-001", explicit_human_action: true }), (error) => error?.safe_error_code === "DOCUSIGN_SEND_ACTOR_MISMATCH" && error?.status === 403);
  artifactScopeOverride = { matter_id: "matter-other" };
  await assert.rejects(service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true }), (error) => error?.safe_error_code === "DOCUSIGN_ARTIFACT_SCOPE_INVALID" && error?.status === 403);
  assert.equal(providerCalls, 0);
  artifactScopeOverride = {};
  connection = { ...CONNECTION, account_id: "account-changed" };
  await assert.rejects(service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true }), (error) => error?.safe_error_code === "DOCUSIGN_ACCOUNT_BINDING_CHANGED");
});
