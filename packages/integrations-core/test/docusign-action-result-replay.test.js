import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DOCX_MIME_TYPE, createDocusignEnvelopeRepository, createDocusignEnvelopeService } from "../src/index.js";

const TENANT = "tenant-action-result";
const MATTER = "matter-action-result";
const ACTOR = "actor-action-result";
const BYTES = Buffer.from("action-result-approved-docx");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const CONNECTION = Object.freeze({ tenant_id: TENANT, connection_id: "docusign-action-result", account_id: "account-action-result", base_uri: "https://demo.docusign.net", credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/key", service_user_id: "aws-secrets-manager:/lawos/docusign/user", private_key: "aws-secrets-manager:/lawos/docusign/private" } });
const SOURCE = Object.freeze({
  authority: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-action-result", artifact_id: "artifact-action-result", document_id: "document-action-result", version_id: "version-action-result", sha256: SHA, approval_receipt_ref: "approval-action-result", permission_envelope_id: "permission-action-result", audit_trace_id: "audit-action-result" },
  document: { artifact_id: "artifact-action-result", document_id: "document-action-result", version_id: "version-action-result", sha256: SHA, filename: "action-result.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-action-result", permission_envelope_id: "permission-action-result", audit_trace_id: "audit-action-result", template_version: "template-v1", template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval-action-result", immutable: true, finalized: true, owner_approved: true },
  recipients: [{ recipient_ref: "recipient-action-result", role: "client", routing_order: 1 }],
  anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
});
function makeService(repository, adapter, { connectionResolver = async () => CONNECTION } = {}) {
  return createDocusignEnvelopeService({
    repository, adapter, clock: () => "2026-08-09T01:00:00.000Z", connectionResolver,
    approvedDocumentResolver: async () => SOURCE,
    artifactReader: async (binding) => ({ ...binding, bytes: BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
  });
}

async function queue(service, requestId) {
  return service.queueApprovedRequest({ principal: { tenant_id: TENANT, actor_id: ACTOR }, request_id: requestId, tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: `queue:${requestId}`, explicit_human_action: true, authority_binding: SOURCE.authority });
}

const sendInput = (requestId, key) => ({ principal: { tenant_id: TENANT, actor_id: ACTOR }, request_id: requestId, explicit_human_action: true, action_idempotency_key: key });
const reconcileInput = (requestId, key) => ({ ...sendInput(requestId, key), explicit_human_action: true });

test("OUTM-33 file action replay preserves first connection-scope 403 across restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "docusign-action-result-send-403-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  let providerCalls = 0;
  const adapter = { async createDraft() { providerCalls += 1; throw new Error("must not call provider"); }, async send() { providerCalls += 1; } };
  const requestId = "request-send-403";
  const key = "send-403";
  await queue(makeService(createDocusignEnvelopeRepository({ filePath }), adapter), requestId);
  const badResolver = async () => ({ ...CONNECTION, tenant_id: "tenant-other" });
  const firstService = makeService(createDocusignEnvelopeRepository({ filePath }), adapter, { connectionResolver: badResolver });
  await assert.rejects(firstService.sendApprovedRequest(sendInput(requestId, key)), (error) => error?.status === 403 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_CONNECTION_SCOPE_INVALID");
  const restarted = makeService(createDocusignEnvelopeRepository({ filePath }), adapter, { connectionResolver: badResolver });
  await assert.rejects(restarted.sendApprovedRequest(sendInput(requestId, key)), (error) => error?.status === 403 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_CONNECTION_SCOPE_INVALID");
  const state = restarted.repository.loadState();
  const result = state.requests[0].action_idempotency.find((entry) => entry.key === key).result;
  assert.deepEqual([result.kind, result.outcome, result.http_status, result.retryable, result.safe_error_code, providerCalls], ["error", "blocked", 403, false, "DOCUSIGN_CONNECTION_SCOPE_INVALID", 0]);
});

test("OUTM-33 file action replay preserves deterministic reconcile 409 across restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "docusign-action-result-reconcile-409-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  let findCalls = 0;
  const adapter = {
    async createDraft() { return { envelope_id: "unused" }; },
    async send() { return { status: "sent" }; },
    async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "envelope-wrong-account", provider_correlation_ref, account_id: "account-other", status: "created" }; },
  };
  const requestId = "request-reconcile-409";
  const key = "reconcile-409";
  const repository = createDocusignEnvelopeRepository({ filePath });
  const service = makeService(repository, adapter);
  await queue(service, requestId);
  repository.transact({ tenant_id: TENANT }, (state) => { state.requests[0] = { ...state.requests[0], state: "reconciliation_required", operation_lease: null, attempt_phase: "create_failed" }; });
  await assert.rejects(service.reconcileRequest(reconcileInput(requestId, key)), (error) => error?.status === 409 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_RECONCILIATION_BINDING_INVALID");
  const restarted = makeService(createDocusignEnvelopeRepository({ filePath }), adapter);
  await assert.rejects(restarted.reconcileRequest(reconcileInput(requestId, key)), (error) => error?.status === 409 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_RECONCILIATION_BINDING_INVALID");
  const state = restarted.repository.loadState();
  const result = state.requests[0].action_idempotency.find((entry) => entry.key === key).result;
  assert.deepEqual([result.kind, result.outcome, result.http_status, result.retryable, result.safe_error_code, findCalls], ["error", "blocked", 409, false, "DOCUSIGN_RECONCILIATION_BINDING_INVALID", 1]);
});
