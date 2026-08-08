import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createPostgresPool } from "../../persistence/src/postgres/pool.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  DOCX_MIME_TYPE,
  createDocusignEnvelopeService,
  createPostgresDocusignEnvelopeRepository,
} from "../src/index.js";

const TENANT = "tenant-docusign-action-pg";
const MATTER = "matter-docusign-action-pg";
const BYTES = Buffer.from("postgres-action-idempotency-docx");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const CONNECTION = Object.freeze({ tenant_id: TENANT, connection_id: "docusign-action-pg", account_id: "account-action-pg", base_uri: "https://demo.docusign.net", credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/key", service_user_id: "aws-secrets-manager:/lawos/docusign/user", private_key: "aws-secrets-manager:/lawos/docusign/private" } });
const SOURCE = Object.freeze({
  authority: { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-action-pg", artifact_id: "artifact-action-pg", document_id: "document-action-pg", version_id: "version-action-pg", sha256: SHA, approval_receipt_ref: "approval-action-pg", permission_envelope_id: "permission-action-pg", audit_trace_id: "audit-action-pg" },
  document: { artifact_id: "artifact-action-pg", document_id: "document-action-pg", version_id: "version-action-pg", sha256: SHA, filename: "action-pg.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-action-pg", permission_envelope_id: "permission-action-pg", audit_trace_id: "audit-action-pg", template_version: "template-v1", template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval-action-pg", immutable: true, finalized: true, owner_approved: true },
  recipients: [{ recipient_ref: "recipient-action-pg", role: "client", routing_order: 1 }],
  anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
});
const AUTHORITY = SOURCE.authority;

function independentPool(fixture, applicationName) {
  const url = new URL(fixture.instance.connection_string);
  url.username = "lawos_app";
  return createPostgresPool({ connectionString: url.toString(), sslMode: "disable", allowInsecureLocal: true, applicationName, tenantContextSecret: fixture.tenantContextSecret });
}

function service(repository, adapter, connectionResolver = async () => CONNECTION) {
  return createDocusignEnvelopeService({
    repository,
    adapter,
    clock: () => "2026-08-08T09:00:00.000Z",
    connectionResolver,
    approvedDocumentResolver: async () => SOURCE,
    artifactReader: async (binding) => ({ ...binding, bytes: BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
  });
}

async function queueApproved(outbox, requestId) {
  return outbox.queueApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: requestId, tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: `queue:${requestId}`, explicit_human_action: true, authority_binding: AUTHORITY });
}

test("OUTM-33 PostgreSQL failed send action is single-winner and exact after restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const poolA = independentPool(fixture, "docusign-action-failed-a");
  const poolB = independentPool(fixture, "docusign-action-failed-b");
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let createCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; entered(); await releasePromise; throw Object.assign(new Error("provider rejected"), { provider_status: 400 }); },
    async send() { throw new Error("send must not run"); },
  };
  const repositoryA = createPostgresDocusignEnvelopeRepository({ pool: poolA });
  const repositoryB = createPostgresDocusignEnvelopeRepository({ pool: poolB });
  const serviceA = service(repositoryA, adapter);
  const serviceB = service(repositoryB, adapter);
  await queueApproved(serviceA, "request-action-failed-pg");
  const input = { principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: "request-action-failed-pg", explicit_human_action: true, action_idempotency_key: "failed-send-pg" };
  const first = serviceA.sendApprovedRequest(input);
  await enteredPromise;
  const concurrent = await serviceB.sendApprovedRequest(input);
  assert.equal(concurrent.outcome, "in_progress");
  release();
  const rejected = await first;
  assert.deepEqual([rejected.outcome, rejected.safe_error_code, createCalls], ["blocked", "DOCUSIGN_PROVIDER_REJECTED", 1]);
  const restartPool = independentPool(fixture, "docusign-action-failed-restart");
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), adapter);
  const replay = await restarted.sendApprovedRequest(input);
  assert.deepEqual([replay.outcome, replay.safe_error_code, createCalls], ["blocked", "DOCUSIGN_PROVIDER_REJECTED", 1]);
  const state = await restarted.repository.readState({ tenant_id: TENANT });
  const record = state.requests[0].action_idempotency.find((entry) => entry.key === input.action_idempotency_key);
  assert.deepEqual([record.status, record.outcome, record.safe_error_code, state.requests[0].operation_lease], ["failed", "blocked", "DOCUSIGN_PROVIDER_REJECTED", null]);
  await restartPool.end();
  await poolA.end();
  await poolB.end();
});

test("OUTM-33 PostgreSQL unknown reconcile action is retryable after restart without an orphan lease", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const poolA = independentPool(fixture, "docusign-action-unknown-a");
  const poolB = independentPool(fixture, "docusign-action-unknown-b");
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let findCalls = 0;
  const adapter = {
    async createDraft() { return { envelope_id: "unused" }; },
    async send() { return { status: "sent" }; },
    async findByCorrelation() { findCalls += 1; entered(); await releasePromise; throw Object.assign(new Error("provider lookup ambiguous"), { provider_status: 503 }); },
  };
  const repositoryA = createPostgresDocusignEnvelopeRepository({ pool: poolA });
  const repositoryB = createPostgresDocusignEnvelopeRepository({ pool: poolB });
  const serviceA = service(repositoryA, adapter);
  const serviceB = service(repositoryB, adapter);
  await queueApproved(serviceA, "request-action-unknown-pg");
  await repositoryA.transact({ tenant_id: TENANT }, (state) => { state.requests[0] = { ...state.requests[0], state: "reconciliation_required", attempt_phase: "create_failed", operation_lease: null }; });
  const input = { principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: "request-action-unknown-pg", explicit_human_action: true, action_idempotency_key: "unknown-reconcile-pg" };
  const first = serviceA.reconcileRequest(input);
  await enteredPromise;
  const concurrent = await serviceB.reconcileRequest(input);
  assert.equal(concurrent.outcome, "in_progress");
  release();
  await assert.rejects(first, (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS" && error?.status === 503 && error?.retryable === true);
  const restartPool = independentPool(fixture, "docusign-action-unknown-restart");
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), adapter);
  await assert.rejects(restarted.reconcileRequest(input), (error) => error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS" && error?.status === 503 && error?.retryable === true);
  assert.equal(findCalls, 1);
  const state = await restarted.repository.readState({ tenant_id: TENANT });
  const record = state.requests[0].action_idempotency.find((entry) => entry.key === input.action_idempotency_key);
  assert.deepEqual([record.status, record.outcome, record.safe_error_code, state.requests[0].operation_lease], ["unknown", "retryable", "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS", null]);
  await restartPool.end();
  await poolA.end();
  await poolB.end();
});

test("OUTM-33 PostgreSQL send trust-boundary 403 replay preserves status after restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const pool = independentPool(fixture, "docusign-action-result-403");
  let providerCalls = 0;
  const adapter = {
    async createDraft() { providerCalls += 1; throw new Error("provider must not run"); },
    async send() { providerCalls += 1; },
  };
  const repository = createPostgresDocusignEnvelopeRepository({ pool });
  const requestId = "request-action-result-403-pg";
  const key = "send-result-403-pg";
  await queueApproved(service(repository, adapter), requestId);
  const badResolver = async () => ({ ...CONNECTION, tenant_id: "tenant-other" });
  const input = { principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: requestId, explicit_human_action: true, action_idempotency_key: key };
  await assert.rejects(service(repository, adapter, badResolver).sendApprovedRequest(input), (error) => error?.status === 403 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_CONNECTION_SCOPE_INVALID");
  const restartPool = independentPool(fixture, "docusign-action-result-403-restart");
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), adapter, badResolver);
  await assert.rejects(restarted.sendApprovedRequest(input), (error) => error?.status === 403 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_CONNECTION_SCOPE_INVALID");
  const state = await restarted.repository.readState({ tenant_id: TENANT });
  const result = state.requests[0].action_idempotency.find((entry) => entry.key === key).result;
  assert.deepEqual([result.kind, result.outcome, result.http_status, result.retryable, result.safe_error_code, providerCalls], ["error", "blocked", 403, false, "DOCUSIGN_CONNECTION_SCOPE_INVALID", 0]);
  await restartPool.end();
  await pool.end();
});

test("OUTM-33 PostgreSQL reconcile binding 409 replay preserves status after restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const pool = independentPool(fixture, "docusign-action-result-409");
  let findCalls = 0;
  const adapter = {
    async createDraft() { throw new Error("create must not run"); },
    async send() { throw new Error("send must not run"); },
    async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "wrong-account-envelope", provider_correlation_ref, account_id: "account-other", status: "created" }; },
  };
  const repository = createPostgresDocusignEnvelopeRepository({ pool });
  const requestId = "request-action-result-409-pg";
  const key = "reconcile-result-409-pg";
  const queued = service(repository, adapter);
  await queueApproved(queued, requestId);
  await repository.transact({ tenant_id: TENANT }, (state) => { state.requests[0] = { ...state.requests[0], state: "reconciliation_required", operation_lease: null, attempt_phase: "create_failed" }; });
  const input = { principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: requestId, explicit_human_action: true, action_idempotency_key: key };
  await assert.rejects(queued.reconcileRequest(input), (error) => error?.status === 409 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_RECONCILIATION_BINDING_INVALID");
  const restartPool = independentPool(fixture, "docusign-action-result-409-restart");
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), adapter);
  await assert.rejects(restarted.reconcileRequest(input), (error) => error?.status === 409 && error?.retryable === false && error?.safe_error_code === "DOCUSIGN_RECONCILIATION_BINDING_INVALID");
  const state = await restarted.repository.readState({ tenant_id: TENANT });
  const result = state.requests[0].action_idempotency.find((entry) => entry.key === key).result;
  assert.deepEqual([result.kind, result.outcome, result.http_status, result.retryable, result.safe_error_code, findCalls], ["error", "blocked", 409, false, "DOCUSIGN_RECONCILIATION_BINDING_INVALID", 1]);
  await restartPool.end();
  await pool.end();
});

test("OUTM-33 PostgreSQL typed successful send replay preserves sent result after restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const pool = independentPool(fixture, "docusign-action-result-success-send");
  let createCalls = 0;
  let sendCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; return { envelope_id: "envelope-action-result-success-pg" }; },
    async send() { sendCalls += 1; return { status: "sent" }; },
    async findByCorrelation() { throw new Error("reconcile must not run"); },
  };
  const repository = createPostgresDocusignEnvelopeRepository({ pool });
  const requestId = "request-action-result-success-send-pg";
  const key = "send-result-success-pg";
  const firstService = service(repository, adapter);
  await queueApproved(firstService, requestId);
  const input = { principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: requestId, explicit_human_action: true, action_idempotency_key: key };
  const first = await firstService.sendApprovedRequest(input);
  const restartPool = independentPool(fixture, "docusign-action-result-success-send-restart");
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), adapter);
  const replay = await restarted.sendApprovedRequest(input);
  assert.deepEqual([first.outcome, replay.outcome, createCalls, sendCalls], ["sent", "sent", 1, 1]);
  const state = await restarted.repository.readState({ tenant_id: TENANT });
  const result = state.requests[0].action_idempotency.find((entry) => entry.key === key).result;
  assert.deepEqual([result.outcome, result.http_status, result.retryable, result.safe_error_code], ["sent", 200, false, null]);
  await assert.rejects(restarted.reconcileRequest(input), (error) => error?.status === 409 && error?.safe_error_code === "DOCUSIGN_ACTION_IDEMPOTENCY_CONFLICT");
  assert.deepEqual([createCalls, sendCalls], [1, 1]);
  await restartPool.end();
  await pool.end();
});

test("OUTM-33 PostgreSQL typed successful reconcile replay preserves reconciled result after restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const pool = independentPool(fixture, "docusign-action-result-success-reconcile");
  let findCalls = 0;
  const adapter = {
    async createDraft() { throw new Error("create must not run"); },
    async send() { throw new Error("send must not run"); },
    async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "envelope-action-result-reconcile-pg", provider_correlation_ref, account_id: CONNECTION.account_id, status: "created" }; },
  };
  const repository = createPostgresDocusignEnvelopeRepository({ pool });
  const requestId = "request-action-result-success-reconcile-pg";
  const key = "reconcile-result-success-pg";
  const firstService = service(repository, adapter);
  await queueApproved(firstService, requestId);
  await repository.transact({ tenant_id: TENANT }, (state) => { state.requests[0] = { ...state.requests[0], state: "reconciliation_required", operation_lease: null, attempt_phase: "create_failed" }; });
  const input = { principal: { tenant_id: TENANT, actor_id: "actor-action-pg" }, request_id: requestId, explicit_human_action: true, action_idempotency_key: key };
  const first = await firstService.reconcileRequest(input);
  const restartPool = independentPool(fixture, "docusign-action-result-success-reconcile-restart");
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), adapter);
  const replay = await restarted.reconcileRequest(input);
  assert.deepEqual([first.outcome, replay.outcome, first.request.state, replay.request.state, findCalls], ["reconciled", "reconciled", "draft_created", "draft_created", 1]);
  const state = await restarted.repository.readState({ tenant_id: TENANT });
  const result = state.requests[0].action_idempotency.find((entry) => entry.key === key).result;
  assert.deepEqual([result.outcome, result.http_status, result.retryable, result.safe_error_code], ["reconciled", 200, false, null]);
  await restartPool.end();
  await pool.end();
});
