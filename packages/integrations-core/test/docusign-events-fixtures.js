import { createHash, createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { DOCX_MIME_TYPE, createDocusignEnvelopeEventService, createDocusignEnvelopeRepository, createDocusignEnvelopeService } from "../src/index.js";

export const TENANT = "tenant-amic";
export const SECRET = "test-only-connect-hmac-secret";
export const DOCUMENT_BYTES = Buffer.from("approved-docx-fixture");
export const DOCUMENT_SHA = createHash("sha256").update(DOCUMENT_BYTES).digest("hex");
export const APPROVED_ARTIFACT_ID = "builder-artifact-approved-001";
export const CONNECTION = Object.freeze({ tenant_id: TENANT, connection_id: "docusign-primary", account_id: "account-001", base_uri: "https://demo.docusign.net", credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/integration-key", service_user_id: "aws-secrets-manager:/lawos/docusign/service-user", private_key: "aws-secrets-manager:/lawos/docusign/private-key" }, hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/connect-hmac" });
export function approvedInput() {
  return { principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", tenant_id: TENANT, matter_id: "matter-001", connection_id: CONNECTION.connection_id, idempotency_key: "esign-send-001", approved_artifact_id: APPROVED_ARTIFACT_ID, explicit_human_action: true, authority_binding: { tenant_id: TENANT, matter_id: "matter-001", workspace_id: "workspace-matter-001", artifact_id: APPROVED_ARTIFACT_ID, document_id: "doc-approved-001", version_id: "version-approved-001", sha256: DOCUMENT_SHA, approval_receipt_ref: "approval:owner:001", permission_envelope_id: "perm-matter-001", audit_trace_id: "audit-matter-001" } };
}
export function approvedSource() {
  return { authority: { tenant_id: TENANT, matter_id: "matter-001", workspace_id: "workspace-matter-001", artifact_id: APPROVED_ARTIFACT_ID, document_id: "doc-approved-001", version_id: "version-approved-001", sha256: DOCUMENT_SHA, approval_receipt_ref: "approval:owner:001", permission_envelope_id: "perm-matter-001", audit_trace_id: "audit-matter-001" }, document: { artifact_id: APPROVED_ARTIFACT_ID, document_id: "doc-approved-001", version_id: "version-approved-001", sha256: DOCUMENT_SHA, filename: "agreement.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-matter-001", permission_envelope_id: "perm-matter-001", audit_trace_id: "audit-matter-001", template_version: "template-v3", template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval:owner:001", immutable: true, finalized: true, owner_approved: true }, recipients: [{ recipient_ref: "contact:signer-001", role: "client", routing_order: 1 }], anchor_manifest: { anchors: [{ role: "client", anchor: "/sig-client/" }] } };
}
export function connectBody({ status, account_id = CONNECTION.account_id, envelope_id = "envelope-001", occurred_at = "2026-08-08T01:05:00.000Z", sequence = null } = {}) {
  return Buffer.from(JSON.stringify({ event: `envelope-${status}`, generatedDateTime: occurred_at, ...(sequence == null ? {} : { sequence }), data: { accountId: account_id, envelopeId: envelope_id, envelopeSummary: { status, statusChangedDateTime: occurred_at } } }));
}
export function signature(bytes, secret = SECRET) { return createHmac("sha256", secret).update(bytes).digest("base64"); }
export async function preparedRuntime({ filePath, connection = CONNECTION, adapter: adapterOverride, artifactStore: artifactStoreOverride, receiptStore: receiptStoreOverride, resolveSecret: resolveSecretOverride, now = { value: "2026-08-08T01:00:00.000Z" } } = {}) {
  const repository = createDocusignEnvelopeRepository({ filePath });
  const downloads = [];
  const ingested = [];
  const receipts = [];
  const adapter = adapterOverride ?? { createDraft: async () => ({ envelope_id: "envelope-001" }), send: async () => ({ status: "sent" }), getStatus: async () => ({ status: "delivered" }), async downloadDocument({ document_id }) { downloads.push(document_id); return Buffer.from(`provider-${document_id}-pdf`); } };
  const artifactStore = artifactStoreOverride ?? { async ingest(input) { ingested.push(input); return { document_id: `dms:${input.request_id}:${input.kind}`, version_id: `version:${input.request_id}:${input.kind}:1`, sha256: input.sha256, ...input, immutable: true }; } };
  const receiptStore = receiptStoreOverride ?? { async put(input) { receipts.push(input); return { receipt_ref: `receipt:${input.sha256}`, sha256: input.sha256, immutable: true }; } };
  const connectionResolver = async () => connection;
  const outbox = createDocusignEnvelopeService({ repository, connectionResolver, approvedDocumentResolver: async () => approvedSource(), artifactReader: async (binding) => ({ ...binding, bytes: DOCUMENT_BYTES }), recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Test Signer", email: "signer@example.test" }), adapter, clock: () => now.value });
  await outbox.queueApprovedRequest(approvedInput());
  await outbox.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
  const events = createDocusignEnvelopeEventService({ repository, connectionResolver, resolveSecret: resolveSecretOverride ?? (async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null), adapter, receiptStore, artifactStore, clock: () => now.value });
  return { repository, outbox, events, adapter, receiptStore, artifactStore, receipts, downloads, ingested, now };
}
export async function webhook(events, body, signatureValue = signature(body)) { return events.processWebhook({ headers: { "x-docusign-signature-1": signatureValue }, raw_body: body }); }
