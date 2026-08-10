import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED,
  createApprovedMatterBuilderSourceResolver,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
} from "../src/index.js";

test("OUTM-33 fail-closes the document authority seam until the corrected OUTM-32 contract exists", async () => {
  const repository = createDocusignEnvelopeRepository();
  const calls = { connection: 0, artifact: 0, recipient: 0, provider: 0 };
  const service = createDocusignEnvelopeService({
    repository,
    approvedDocumentResolver: createApprovedMatterBuilderSourceResolver(),
    connectionResolver: async () => {
      calls.connection += 1;
      throw new Error("connection must not resolve while document authority is blocked");
    },
    artifactReader: async () => {
      calls.artifact += 1;
      throw new Error("DMS bytes must not load while document authority is blocked");
    },
    recipientResolver: async () => {
      calls.recipient += 1;
      throw new Error("recipients must not resolve while document authority is blocked");
    },
    adapter: {
      async createDraft() {
        calls.provider += 1;
        throw new Error("provider must not run while document authority is blocked");
      },
      async send() {
        calls.provider += 1;
        throw new Error("provider must not run while document authority is blocked");
      },
    },
    clock: () => "2026-08-08T03:00:00.000Z",
  });

  await assert.rejects(
    service.queueApprovedRequest({
      principal: { tenant_id: "tenant-blocked", actor_id: "owner-blocked" },
      request_id: "request-blocked",
      tenant_id: "tenant-blocked",
      matter_id: "matter-blocked",
      connection_id: "docusign-blocked",
      idempotency_key: "send-blocked",
      approved_artifact_id: "builder-artifact-blocked",
      explicit_human_action: true,
      authority_binding: {
        tenant_id: "tenant-blocked",
        matter_id: "matter-blocked",
        workspace_id: "workspace-blocked",
        artifact_id: "builder-artifact-blocked",
        document_id: "document-blocked",
        version_id: "version-blocked",
        sha256: "a".repeat(64),
        approval_receipt_ref: "approval-blocked",
        permission_envelope_id: "permission-blocked",
        audit_trace_id: "audit-blocked",
      },
    }),
    (error) => error?.safe_error_code === DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED
      && error?.status === 503
      && error?.retryable === false,
  );
  assert.deepEqual(calls, { connection: 0, artifact: 0, recipient: 0, provider: 0 });
  assert.deepEqual(repository.loadState().requests, []);
});
