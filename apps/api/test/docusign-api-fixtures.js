import { createHash, createHmac } from "node:crypto";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import { DOCUSIGN_CONNECT_SIGNATURE_HEADER, DOCX_MIME_TYPE, createDocusignEnvelopeEventService, createDocusignEnvelopeRepository, createDocusignEnvelopeService } from "../../../packages/integrations-core/src/index.js";
import { DOCUSIGN_OUTLOOK_REQUESTS_PATH, DOCUSIGN_WEBHOOK_PATH } from "../src/docusign-api.js";
import { createDocusignFailClosedRuntime } from "../src/docusign-runtime.js";
import { createApiServer } from "../src/server.js";

export const TENANT = "tenant-api";
export const MATTER = "matter-api";
export const ACTOR = "actor-api";
export const HMAC_SECRET = "test-only-docusign-connect-secret";
export const DOCUMENT_BYTES = Buffer.from("approved-docusign-source");
export const DOCUMENT_SHA = createHash("sha256").update(DOCUMENT_BYTES).digest("hex");
export const APPROVED_ARTIFACT_ID = "builder-artifact-api";
export const AUTHORITY_BINDING = Object.freeze({ tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", artifact_id: APPROVED_ARTIFACT_ID, document_id: "document-api", version_id: "version-api", sha256: DOCUMENT_SHA, approval_receipt_ref: "approval-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api" });
export const CONNECTION = Object.freeze({ tenant_id: TENANT, connection_id: "docusign-primary", account_id: "account-api", base_uri: "https://demo.docusign.net", credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/integration-key", service_user_id: "aws-secrets-manager:/lawos/docusign/service-user", private_key: "aws-secrets-manager:/lawos/docusign/private-key" }, hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/connect-hmac" });
const APPROVED_SOURCE = Object.freeze({ authority: AUTHORITY_BINDING, document: { artifact_id: APPROVED_ARTIFACT_ID, document_id: "document-api", version_id: "version-api", sha256: DOCUMENT_SHA, filename: "agreement.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", template_version: "template-v1", template_sha256: "b".repeat(64), input_sha256: "c".repeat(64), approval_receipt_ref: "approval-api", immutable: true, finalized: true, owner_approved: true }, recipients: [{ recipient_ref: "contact-api", role: "client", routing_order: 1 }], anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] } });

export function sessionAuth() {
  const principal = Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: ["lawos_staff"] });
  return Object.freeze({ capabilities: Object.freeze({}), async resolvePermissionContextFromHeaders() { return Object.freeze({ ok: true, principal, context: Object.freeze({ principal, rules: [], object_acl: [] }), token_payload: Object.freeze({ surface: "outlook_addin" }) }); } });
}

export async function docusignRuntime({ authorizeMatter = async () => ({ allowed: true, authority_binding: AUTHORITY_BINDING }), prepare = true, webhookRequestResolver, repository: providedRepository, adapter: providedAdapter, connectionResolver: providedConnectionResolver } = {}) {
  const repository = providedRepository ?? createDocusignEnvelopeRepository();
  const adapter = providedAdapter ?? { createDraft: async () => ({ envelope_id: "envelope-api" }), send: async () => ({ status: "sent" }), findByCorrelation: async ({ provider_correlation_ref }) => ({ envelope_id: "envelope-api-recovered", provider_correlation_ref, account_id: CONNECTION.account_id, status: "created" }), getStatus: async () => ({ status: "delivered" }), downloadDocument: async ({ document_id }) => Buffer.from(`pdf-${document_id}`) };
  const connectionResolver = providedConnectionResolver ?? (async () => CONNECTION);
  const envelopeService = createDocusignEnvelopeService({ repository, connectionResolver, approvedDocumentResolver: async () => ({ authority: AUTHORITY_BINDING, document: { artifact_id: APPROVED_ARTIFACT_ID, document_id: "document-api", version_id: "version-api", sha256: DOCUMENT_SHA, filename: "agreement.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", template_version: "template-v1", template_sha256: "b".repeat(64), input_sha256: "c".repeat(64), approval_receipt_ref: "approval-api", immutable: true, finalized: true, owner_approved: true }, recipients: [{ recipient_ref: "contact-api", role: "client", routing_order: 1 }], anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] } }), artifactReader: async (binding) => ({ ...binding, bytes: DOCUMENT_BYTES }), recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }), adapter, clock: () => "2026-08-08T02:00:00.000Z" });
  if (prepare) {
    await envelopeService.queueApprovedRequest({ principal: { tenant_id: TENANT, actor_id: ACTOR }, request_id: "request-api", tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, idempotency_key: "send-api", approved_artifact_id: APPROVED_ARTIFACT_ID, explicit_human_action: true, authority_binding: AUTHORITY_BINDING });
    await envelopeService.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: ACTOR }, request_id: "request-api", explicit_human_action: true });
  }
  const eventService = createDocusignEnvelopeEventService({ repository, connectionResolver, webhookRequestResolver, resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? HMAC_SECRET : null, adapter, receiptStore: { async put(input) { return { receipt_ref: `receipt:${input.sha256}`, sha256: input.sha256, immutable: true }; } }, artifactStore: { async readback() { return null; }, async ingest(input) { return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}`, sha256: input.sha256, ...input, immutable: true }; } }, approvedDocumentResolver: async () => APPROVED_SOURCE, clock: () => "2026-08-08T02:05:00.000Z" });
  return Object.freeze({ repository, envelope_service: envelopeService, event_service: eventService, authorizeMatter });
}

export async function withServer(runtime, callback) {
  const server = createApiServer({ hrxRuntime: null, masterDataRuntime: null, matterRuntime: null, dmsRuntime: null, emailDmsRuntime: null, crmIntakeRuntime: null, financeRuntime: null, analyticsRuntime: null, aiRuntime: null, portalRuntime: null, uiReadinessRuntime: null, homeDashboardRuntime: null, enterpriseReadinessRuntime: null, docusignRuntime: runtime, sessionAuth: sessionAuth() });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try { return await callback(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections?.(); }); }
}
export function connectBody(status = "delivered") { return Buffer.from(JSON.stringify({ event: `envelope-${status}`, generatedDateTime: "2026-08-08T02:05:00.000Z", data: { accountId: CONNECTION.account_id, envelopeId: "envelope-api", envelopeSummary: { status, statusChangedDateTime: "2026-08-08T02:05:00.000Z" } } })); }
export { createDmsRepository, createFileStorageAdapter, createDocusignFailClosedRuntime, createHash, createHmac, DOCUSIGN_CONNECT_SIGNATURE_HEADER, DOCUSIGN_OUTLOOK_REQUESTS_PATH, DOCUSIGN_WEBHOOK_PATH };
