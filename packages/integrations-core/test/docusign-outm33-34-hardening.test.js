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

test("OUTM-33 in-flight provider create is fenced, correlated, and recovered after takeover", async (t) => {
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
  let sendCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; entered(); await releasePromise; return { envelope_id: "envelope-inflight" }; },
    async send() { sendCalls += 1; return { status: "sent" }; },
    async findByCorrelation({ provider_correlation_ref }) { return { envelope_id: "envelope-inflight", provider_correlation_ref, account_id: CONNECTION.account_id, status: "created" }; },
  };
  const delayed = makeService(repositoryA, adapter, () => now.value);
  await queue(delayed);
  const oldOwner = delayed.sendApprovedRequest(sendInput());
  await enteredPromise;
  const intent = repositoryA.loadState().requests[0].provider_operation;
  assert.deepEqual([intent.kind, intent.correlation_ref, intent.fencing_generation >= 1, intent.status], ["create_draft", repositoryA.loadState().requests[0].provider_correlation_ref, true, "pending"]);
  now.value = "2026-08-08T01:05:00.001Z";
  const reconciler = makeService(repositoryB, adapter, () => now.value);
  assert.equal((await reconciler.sendApprovedRequest(sendInput())).outcome, "replayed");
  assert.equal(repositoryB.loadState().requests[0].state, "reconciliation_required");
  release();
  await assert.rejects(oldOwner, (error) => error?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST");
  assert.equal(createCalls, 1);
  const restarted = makeService(createDocusignEnvelopeRepository({ filePath }), adapter, () => now.value);
  const recovered = await restarted.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  assert.deepEqual([recovered.outcome, recovered.request.state, recovered.request.can_send, recovered.request.document.document_id], ["reconciled", "draft_created", true, "document-hardening"]);
  const resumed = await restarted.sendApprovedRequest(sendInput());
  assert.deepEqual([resumed.outcome, resumed.request.state, createCalls, sendCalls], ["sent", "sent", 1, 1]);
});

test("OUTM-33 reconciliation recovers an ambiguous create by exact provider correlation without create or send", async () => {
  const repository = createDocusignEnvelopeRepository();
  let createCalls = 0;
  let sendCalls = 0;
  let findCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; throw new Error("provider timeout after unknown create"); },
    async send() { sendCalls += 1; return { status: "sent" }; },
    async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "recovered-envelope", provider_correlation_ref, account_id: CONNECTION.account_id, status: "created" }; },
  };
  const service = makeService(repository, adapter);
  await queue(service);
  await assert.rejects(service.sendApprovedRequest(sendInput()), (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS");
  const recovered = await service.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  assert.deepEqual([recovered.outcome, recovered.request.state, recovered.request.can_send, recovered.request.can_reconcile], ["reconciled", "draft_created", true, true]);
  assert.deepEqual([createCalls, sendCalls, findCalls], [1, 0, 1]);
  const restarted = makeService(createDocusignEnvelopeRepository({ state: repository.loadState() }), adapter);
  const replay = await restarted.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  assert.deepEqual([replay.outcome, replay.request.state], ["already_converged", "draft_created"]);
  await restarted.sendApprovedRequest(sendInput());
  assert.equal(findCalls, 2);
  assert.equal(sendCalls, 1);
});

test("OUTM-33 provider calls receive a caller deadline for correlation recovery", async () => {
  const repository = createDocusignEnvelopeRepository();
  const calls = [];
  const adapter = {
    async createDraft(options) { calls.push(options); return { envelope_id: "envelope-timeout-budget" }; },
    async send(options) { calls.push(options); return { status: "sent" }; },
  };
  const service = makeService(repository, adapter);
  await queue(service);
  await service.sendApprovedRequest(sendInput());
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => !call.signal && typeof call.caller_timeout_ms === "number" && call.caller_timeout_ms > 0 && call.caller_timeout_ms < 5 * 60 * 1000));
});

test("OUTM-33 ambiguous send is recovered to sent after restart without a second create", async () => {
  const repository = createDocusignEnvelopeRepository();
  let createCalls = 0;
  let sendCalls = 0;
  let findCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; return { envelope_id: "envelope-ambiguous-send" }; },
    async send() { sendCalls += 1; throw Object.assign(new Error("send response lost"), { provider_status: 408 }); },
    async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "envelope-ambiguous-send", provider_correlation_ref, account_id: CONNECTION.account_id, status: "sent" }; },
  };
  const service = makeService(repository, adapter);
  await queue(service);
  await assert.rejects(service.sendApprovedRequest(sendInput()), (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS");
  const restarted = makeService(createDocusignEnvelopeRepository({ state: repository.loadState() }), adapter);
  const recovered = await restarted.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  const replay = await restarted.reconcileRequest({ ...sendInput(), explicit_human_action: true });
  assert.deepEqual([recovered.outcome, recovered.request.state, replay.outcome, createCalls, sendCalls, findCalls], ["reconciled", "sent", "already_converged", 1, 1, 2]);
});

test("OUTM-33 permission and audit authority mismatch fail before any request row", async () => {
  const repository = createDocusignEnvelopeRepository();
  let providerCalls = 0;
  const service = makeService(repository, { createDraft: async () => { providerCalls += 1; }, send: async () => { providerCalls += 1; } });
  const forged = { ...AUTHORITY, permission_envelope_id: "permission-forged" };
  await assert.rejects(queue({ ...service, queueApprovedRequest: (input) => service.queueApprovedRequest({ ...input, authority_binding: forged }) }), (error) => error?.safe_error_code === "DOCUSIGN_APPROVED_SOURCE_MISMATCH");
  assert.deepEqual([providerCalls, repository.loadState().requests.length], [0, 0]);
});

test("OUTM-33 action idempotency is durably bound to actor, request, and action", async () => {
  const repository = createDocusignEnvelopeRepository();
  let createCalls = 0;
  let sendCalls = 0;
  const service = makeService(repository, {
    async createDraft() { createCalls += 1; return { envelope_id: "envelope-action-idempotency" }; },
    async send() { sendCalls += 1; return { status: "sent" }; },
    async findByCorrelation() { return { envelope_id: "envelope-action-idempotency", provider_correlation_ref: "unused", account_id: CONNECTION.account_id, status: "sent" }; },
  });
  await queue(service, "request-action-idempotency");
  const input = { ...sendInput("request-action-idempotency"), action_idempotency_key: "action-key-1" };
  const first = await service.sendApprovedRequest(input);
  const replay = await service.sendApprovedRequest(input);
  assert.deepEqual([first.outcome, replay.outcome, createCalls, sendCalls], ["sent", "sent", 1, 1]);
  const record = repository.loadState().requests[0].action_idempotency.find((entry) => entry.key === "action-key-1");
  assert.deepEqual([record.action, record.actor_id, record.request_id, record.status], ["send", "actor-hardening", "request-action-idempotency", "succeeded"]);
  await assert.rejects(service.reconcileRequest({ ...input, explicit_human_action: true }), (error) => error?.safe_error_code === "DOCUSIGN_ACTION_IDEMPOTENCY_CONFLICT");
});

test("OUTM-33 rejected send action replay preserves the stored failure after restart and concurrency", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "outm33-action-failed-replay-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const repositoryA = createDocusignEnvelopeRepository({ filePath });
  const repositoryB = createDocusignEnvelopeRepository({ filePath });
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let createCalls = 0;
  const adapter = {
    async createDraft() {
      createCalls += 1;
      entered();
      await releasePromise;
      throw Object.assign(new Error("provider rejected"), { provider_status: 400 });
    },
    async send() { throw new Error("send must not run"); },
  };
  const serviceA = makeService(repositoryA, adapter);
  const serviceB = makeService(repositoryB, adapter);
  await queue(serviceA, "request-action-failed-replay");
  const input = { ...sendInput("request-action-failed-replay"), action_idempotency_key: "failed-send-key" };
  const first = serviceA.sendApprovedRequest(input);
  await enteredPromise;
  const concurrent = await serviceB.sendApprovedRequest(input);
  assert.equal(concurrent.outcome, "in_progress");
  release();
  const rejected = await first;
  assert.deepEqual([rejected.outcome, rejected.safe_error_code, createCalls], ["blocked", "DOCUSIGN_PROVIDER_REJECTED", 1]);
  const restarted = makeService(createDocusignEnvelopeRepository({ filePath }), adapter);
  const replay = await restarted.sendApprovedRequest(input);
  assert.deepEqual([replay.outcome, replay.safe_error_code, createCalls], ["blocked", "DOCUSIGN_PROVIDER_REJECTED", 1]);
  const record = restarted.repository.loadState().requests[0].action_idempotency.find((entry) => entry.key === input.action_idempotency_key);
  assert.deepEqual([record.status, record.outcome, record.safe_error_code, restarted.repository.loadState().requests[0].operation_lease], ["failed", "blocked", "DOCUSIGN_PROVIDER_REJECTED", null]);
});

test("OUTM-33 unknown reconcile action replay preserves retryable error after restart without a lease", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "outm33-action-unknown-replay-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const repositoryA = createDocusignEnvelopeRepository({ filePath });
  const repositoryB = createDocusignEnvelopeRepository({ filePath });
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let findCalls = 0;
  const adapter = {
    async createDraft() { return { envelope_id: "unused" }; },
    async send() { return { status: "sent" }; },
    async findByCorrelation() {
      findCalls += 1;
      entered();
      await releasePromise;
      throw Object.assign(new Error("provider lookup ambiguous"), { provider_status: 503 });
    },
  };
  const serviceA = makeService(repositoryA, adapter);
  const serviceB = makeService(repositoryB, adapter);
  await queue(serviceA, "request-action-unknown-replay");
  repositoryA.transact({ tenant_id: TENANT }, (state) => {
    state.requests[0] = { ...state.requests[0], state: "reconciliation_required", attempt_phase: "create_failed", operation_lease: null };
  });
  const input = { ...sendInput("request-action-unknown-replay"), explicit_human_action: true, action_idempotency_key: "unknown-reconcile-key" };
  const first = serviceA.reconcileRequest(input);
  await enteredPromise;
  const concurrent = await serviceB.reconcileRequest(input);
  assert.equal(concurrent.outcome, "in_progress");
  release();
  await assert.rejects(first, (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS" && error?.status === 503 && error?.retryable === true);
  const restarted = makeService(createDocusignEnvelopeRepository({ filePath }), adapter);
  await assert.rejects(restarted.reconcileRequest(input), (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS" && error?.status === 503 && error?.retryable === true);
  assert.equal(findCalls, 1);
  const request = restarted.repository.loadState().requests[0];
  const record = request.action_idempotency.find((entry) => entry.key === input.action_idempotency_key);
  assert.deepEqual([record.status, record.outcome, record.safe_error_code, request.operation_lease], ["unknown", "retryable", "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS", null]);
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
    approvedDocumentResolver: async () => SOURCE,
    artifactStore: { async ingest(input) { ingestCalls += 1; return { ...input, document_id: "dms:forged", version_id: "version:forged", permission_envelope_id: "permission-forged", immutable: true }; } },
  }), (error) => error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING");
  assert.equal(ingestCalls, 1);
  assert.equal(repository.loadState().requests[0].completion_artifacts.signed_pdf, null);
  assert.equal(repository.loadState().requests[0].state, "completed_artifacts_pending");
});

test("OUTM-34 authority drift after provider download causes zero DMS writes", async () => {
  const repository = createDocusignEnvelopeRepository();
  let resolveDownloadEntered;
  const downloadEntered = new Promise((resolve) => { resolveDownloadEntered = resolve; });
  let releaseDownload;
  const releasePromise = new Promise((resolve) => { releaseDownload = resolve; });
  const adapter = { createDraft: async () => ({ envelope_id: "envelope-authority-barrier" }), send: async () => ({ status: "sent" }), downloadDocument: async () => { resolveDownloadEntered(); await releasePromise; return Buffer.from("signed-pdf"); } };
  const service = makeService(repository, adapter);
  await queue(service);
  await service.sendApprovedRequest(sendInput());
  repository.transact({ tenant_id: TENANT }, (state) => {
    const current = state.requests[0];
    state.requests[0] = { ...current, state: "completed_artifacts_pending", attempt_phase: "completed_pending", operation_lease: null };
  });
  let ingestCalls = 0;
  const completion = completeDocusignArtifacts({
    repository,
    request: repository.loadState().requests[0],
    connection: CONNECTION,
    adapter,
    approvedDocumentResolver: async () => SOURCE,
    artifactStore: { async ingest(input) { ingestCalls += 1; return { ...input }; } },
  });
  await downloadEntered;
  repository.transact({ tenant_id: TENANT }, (state) => {
    const current = state.requests[0];
    const document = { ...current.document, permission_envelope_id: "permission-rebound", audit_trace_id: "audit-rebound" };
    state.requests[0] = { ...current, document, audit_lineage: (current.audit_lineage ?? []).map((entry) => ({ ...entry, audit_trace_id: "audit-rebound" })) };
  });
  releaseDownload();
  await assert.rejects(completion, (error) => error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING");
  assert.equal(ingestCalls, 0);
});
