import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DOCX_MIME_TYPE,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
} from "../src/index.js";
import { completeDocusignArtifacts } from "../src/docusign-completion-artifacts.js";

const TENANT = "tenant-hardening";
const MATTER = "matter-hardening";
const BYTES = Buffer.from("hardening-approved-docx");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const CONNECTION = Object.freeze({
  tenant_id: TENANT, connection_id: "docusign-hardening", account_id: "account-hardening", base_uri: "https://demo.docusign.net",
  credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/key", service_user_id: "aws-secrets-manager:/lawos/docusign/user", private_key: "aws-secrets-manager:/lawos/docusign/private" },
});
const SOURCE = Object.freeze({
  authority: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-hardening", artifact_id: "artifact-hardening", document_id: "document-hardening", version_id: "version-hardening", sha256: SHA, approval_receipt_ref: "approval-hardening", permission_envelope_id: "permission-hardening", audit_trace_id: "audit-hardening" },
  document: { artifact_id: "artifact-hardening", document_id: "document-hardening", version_id: "version-hardening", sha256: SHA, filename: "hardening.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-hardening", permission_envelope_id: "permission-hardening", audit_trace_id: "audit-hardening", template_version: "template-v1", template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval-hardening", immutable: true, finalized: true, owner_approved: true },
  recipients: [{ recipient_ref: "recipient-hardening", role: "client", routing_order: 1 }],
  anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
});
const AUTHORITY = { ...SOURCE.authority };

function makeService(repository, adapter, now = () => "2026-08-08T01:00:00.000Z", artifactReader = async (binding) => ({ ...binding, bytes: BYTES })) {
  return createDocusignEnvelopeService({
    repository, adapter, clock: now,
    connectionResolver: async () => CONNECTION,
    approvedDocumentResolver: async () => SOURCE,
    artifactReader,
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
  });
}

async function queue(service, requestId = "request-hardening") {
  return service.queueApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-hardening" }, request_id: requestId, tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: `idempotency:${requestId}`, explicit_human_action: true, authority_binding: AUTHORITY });
}

const sendInput = (request_id = "request-hardening") => ({ principal: { tenant_id: TENANT, actor_id: "actor-hardening" }, request_id, explicit_human_action: true });

test("OUTM-33 expired send owner is fenced before provider create and remains fenced after restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "outm33-fence-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const repositoryA = createDocusignEnvelopeRepository({ filePath });
  const repositoryB = createDocusignEnvelopeRepository({ filePath });
  const now = { value: "2026-08-08T01:00:00.000Z" };
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let createCalls = 0;
  const adapter = { async createDraft() { createCalls += 1; return { envelope_id: "must-not-create" }; }, async send() { throw new Error("must-not-send"); } };
  const delayed = makeService(repositoryA, adapter, () => now.value, async (binding) => { entered(); await releasePromise; return { ...binding, bytes: BYTES }; });
  await queue(delayed);
  const oldOwner = delayed.sendApprovedRequest(sendInput());
  await enteredPromise;
  now.value = "2026-08-08T01:05:00.001Z";
  const reconciler = makeService(repositoryB, adapter, () => now.value);
  assert.equal((await reconciler.sendApprovedRequest(sendInput())).outcome, "replayed");
  assert.equal(repositoryB.loadState().requests[0].state, "reconciliation_required");
  release();
  await assert.rejects(oldOwner, (error) => error?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST");
  assert.equal(createCalls, 0);
  const restarted = makeService(createDocusignEnvelopeRepository({ filePath }), adapter, () => now.value);
  assert.equal((await restarted.sendApprovedRequest(sendInput())).outcome, "replayed");
  assert.equal(createDocusignEnvelopeRepository({ filePath }).loadState().requests[0].state, "reconciliation_required");
});

test("OUTM-33 reconciliation recovers an ambiguous create by exact provider correlation without create or send", async () => {
  const repository = createDocusignEnvelopeRepository();
  let createCalls = 0;
  let sendCalls = 0;
  let findCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; throw new Error("provider timeout after unknown create"); },
    async send() { sendCalls += 1; },
    async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "recovered-envelope", provider_correlation_ref, account_id: CONNECTION.account_id, status: "created" }; },
  };
  const service = makeService(repository, adapter);
  await queue(service);
  await assert.rejects(service.sendApprovedRequest(sendInput()), (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS");
  const recovered = await service.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  assert.deepEqual([recovered.outcome, recovered.request.state, recovered.request.can_reconcile], ["reconciled", "reconciliation_required", true]);
  assert.deepEqual([createCalls, sendCalls, findCalls], [1, 0, 1]);
  const restarted = makeService(createDocusignEnvelopeRepository({ state: repository.loadState() }), adapter);
  const replay = await restarted.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  assert.equal(replay.request.document.document_id, "document-hardening");
  assert.equal(findCalls, 2);
});

test("OUTM-33 permission and audit authority mismatch fail before any request row", async () => {
  const repository = createDocusignEnvelopeRepository();
  let providerCalls = 0;
  const service = makeService(repository, { createDraft: async () => { providerCalls += 1; }, send: async () => { providerCalls += 1; } });
  const forged = { ...AUTHORITY, permission_envelope_id: "permission-forged" };
  await assert.rejects(queue({ ...service, queueApprovedRequest: (input) => service.queueApprovedRequest({ ...input, authority_binding: forged }) }), (error) => error?.safe_error_code === "DOCUSIGN_APPROVED_SOURCE_MISMATCH");
  assert.deepEqual([providerCalls, repository.loadState().requests.length], [0, 0]);
});

test("OUTM-34 completion rejects a DMS readback whose permission or audit lineage changed", async () => {
  const repository = createDocusignEnvelopeRepository();
  const adapter = { createDraft: async () => ({ envelope_id: "envelope-completion" }), send: async () => ({ status: "sent" }), downloadDocument: async () => Buffer.from("signed-pdf") };
  const service = makeService(repository, adapter);
  await queue(service);
  await service.sendApprovedRequest(sendInput());
  repository.transact({ tenant_id: TENANT }, (state) => {
    state.requests[0] = { ...state.requests[0], state: "completed_artifacts_pending", attempt_phase: "completed_pending", operation_lease: null };
  });
  let ingestCalls = 0;
  await assert.rejects(completeDocusignArtifacts({
    repository,
    request: repository.loadState().requests[0],
    connection: CONNECTION,
    adapter,
    artifactStore: { async ingest(input) { ingestCalls += 1; return { ...input, document_id: "dms:forged", version_id: "version:forged", permission_envelope_id: "permission-forged", immutable: true }; } },
  }), (error) => error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING");
  assert.equal(ingestCalls, 1);
  assert.equal(repository.loadState().requests[0].completion_artifacts.signed_pdf, null);
  assert.equal(repository.loadState().requests[0].state, "completed_artifacts_pending");
});
