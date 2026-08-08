import { createHash } from "node:crypto";
import { DOCX_MIME_TYPE, createDocusignEnvelopeService } from "../src/index.js";

export const TENANT = "tenant-amic";
export const MATTER = "matter-approved";
export const DOCX_BYTES = Buffer.from("approved-docx-fixture");
export const DOCX_SHA = createHash("sha256").update(DOCX_BYTES).digest("hex");
export const APPROVED_ARTIFACT_ID = "builder-artifact-approved-001";
export const CONNECTION = Object.freeze({
  tenant_id: TENANT, connection_id: "docusign-primary", account_id: "account-001", base_uri: "https://demo.docusign.net",
  credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/integration-key", service_user_id: "aws-secrets-manager:/lawos/docusign/service-user", private_key: "aws-secrets-manager:/lawos/docusign/private-key" },
  hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/connect-hmac",
});
export const APPROVED_SOURCE = Object.freeze({
  authority: Object.freeze({ tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-matter-approved", artifact_id: APPROVED_ARTIFACT_ID, document_id: "doc-approved-001", version_id: "version-approved-001", sha256: DOCX_SHA, approval_receipt_ref: "approval:owner:001", permission_envelope_id: "perm-approved-001", audit_trace_id: "audit-approved-001" }),
  document: Object.freeze({ artifact_id: APPROVED_ARTIFACT_ID, document_id: "doc-approved-001", version_id: "version-approved-001", sha256: DOCX_SHA, filename: "agreement.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-matter-approved", permission_envelope_id: "perm-approved-001", audit_trace_id: "audit-approved-001", template_version: "template-v3", template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval:owner:001", immutable: true, finalized: true, owner_approved: true }),
  recipients: Object.freeze([{ recipient_ref: "contact:signer-001", role: "client", routing_order: 1 }]),
  anchor_manifest: Object.freeze({ anchors: Object.freeze([{ role: "client", anchor: "/sig-client/" }]) }),
});
export function approvedInput(overrides = {}) {
  return {
    principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, idempotency_key: "esign-send-001", approved_artifact_id: APPROVED_ARTIFACT_ID, explicit_human_action: true,
    authority_binding: { tenant_id: TENANT, matter_id: MATTER, workspace_id: APPROVED_SOURCE.document.workspace_id, artifact_id: APPROVED_ARTIFACT_ID, document_id: APPROVED_SOURCE.document.document_id, version_id: APPROVED_SOURCE.document.version_id, sha256: DOCX_SHA, approval_receipt_ref: APPROVED_SOURCE.document.approval_receipt_ref, permission_envelope_id: APPROVED_SOURCE.document.permission_envelope_id, audit_trace_id: APPROVED_SOURCE.document.audit_trace_id },
    ...overrides,
  };
}
export function runtime({ repository, adapter, connection = CONNECTION, approvedSource = APPROVED_SOURCE, clock } = {}) {
  return createDocusignEnvelopeService({
    repository, connectionResolver: async () => connection, approvedDocumentResolver: async () => approvedSource,
    artifactReader: async (binding) => ({ ...binding, bytes: DOCX_BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Test Signer", email: "signer@example.test" }),
    adapter, clock: clock ?? (() => "2026-08-08T01:00:00.000Z"),
  });
}
