import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createPostgresPool } from "../../persistence/src/postgres/pool.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  DOCX_MIME_TYPE,
  createDocusignEnvelopeEventService,
  createDocusignEnvelopeService,
  createPostgresDocusignEnvelopeRepository,
} from "../src/index.js";

const TENANT = "tenant-docusign-pg";
const MATTER = "matter-docusign-pg";
const BYTES = Buffer.from("postgres-approved-docx");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const CONNECTION = Object.freeze({
  tenant_id: TENANT, connection_id: "docusign-pg", account_id: "account-pg", base_uri: "https://demo.docusign.net",
  credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/key", service_user_id: "aws-secrets-manager:/lawos/docusign/user", private_key: "aws-secrets-manager:/lawos/docusign/private" },
  hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/hmac",
});
const SOURCE = Object.freeze({
  authority: {
    tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-pg",
    artifact_id: "artifact-pg", document_id: "document-pg", version_id: "version-pg",
    sha256: SHA, approval_receipt_ref: "approval-pg", permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg",
  },
  document: {
    artifact_id: "artifact-pg", document_id: "document-pg", version_id: "version-pg", sha256: SHA,
    filename: "postgres.docx", mime_type: DOCX_MIME_TYPE, workspace_id: "workspace-pg",
    permission_envelope_id: "permission-pg", audit_trace_id: "audit-pg", template_version: "template-v1",
    template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval-pg",
    immutable: true, finalized: true, owner_approved: true,
  },
  recipients: [{ recipient_ref: "recipient-pg", role: "client", routing_order: 1 }],
  anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
});
const AUTHORITY = Object.freeze({
  tenant_id: TENANT, matter_id: MATTER, workspace_id: SOURCE.document.workspace_id,
  artifact_id: SOURCE.document.artifact_id, document_id: SOURCE.document.document_id,
  version_id: SOURCE.document.version_id, sha256: SHA, approval_receipt_ref: SOURCE.document.approval_receipt_ref,
  permission_envelope_id: SOURCE.document.permission_envelope_id, audit_trace_id: SOURCE.document.audit_trace_id,
});

function outbox(repository, adapter, clock) {
  return createDocusignEnvelopeService({
    repository, adapter, clock,
    connectionResolver: async () => CONNECTION,
    approvedDocumentResolver: async () => SOURCE,
    artifactReader: async (binding) => ({ ...binding, bytes: BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
  });
}

function independentPool(fixture, applicationName) {
  const url = new URL(fixture.instance.connection_string);
  url.username = "lawos_app";
  return createPostgresPool({
    connectionString: url.toString(), sslMode: "disable", allowInsecureLocal: true,
    applicationName, tenantContextSecret: fixture.tenantContextSecret,
  });
}

test("OUTM-33/34 PostgreSQL advisory CAS serializes independent runtimes and survives pool restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const poolA = independentPool(fixture, "docusign-process-a");
  const poolB = independentPool(fixture, "docusign-process-b");
  const repositoryA = createPostgresDocusignEnvelopeRepository({ pool: poolA });
  const repositoryB = createPostgresDocusignEnvelopeRepository({ pool: poolB });
  let resolveSecondClaim;
  const secondClaim = new Promise((resolve) => { resolveSecondClaim = resolve; });
  const observedRepositoryB = {
    ...repositoryB,
    async transact(options, mutate) { const result = await repositoryB.transact(options, mutate); resolveSecondClaim(); return result; },
  };
  let createCalls = 0;
  let sendCalls = 0;
  let resolveCreateEntered;
  const createEntered = new Promise((resolve) => { resolveCreateEntered = resolve; });
  let releaseCreate;
  const createRelease = new Promise((resolve) => { releaseCreate = resolve; });
  const provider = {
    async createDraft() { createCalls += 1; resolveCreateEntered(); await createRelease; return { envelope_id: "envelope-pg" }; },
    async send() { sendCalls += 1; return { status: "sent" }; },
  };
  const serviceA = outbox(repositoryA, provider, () => "2026-08-08T05:00:00.000Z");
  const serviceB = outbox(observedRepositoryB, provider, () => "2026-08-08T05:00:00.000Z");
  await serviceA.queueApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg",
    tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id,
    approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: "queue-pg",
    explicit_human_action: true, authority_binding: AUTHORITY,
  });
  const sendInput = { principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg", explicit_human_action: true };
  const firstSend = serviceA.sendApprovedRequest(sendInput);
  await createEntered;
  const secondSend = serviceB.sendApprovedRequest(sendInput);
  await secondClaim;
  releaseCreate();
  const sent = await Promise.all([firstSend, secondSend]);
  assert.deepEqual(sent.map((item) => item.outcome).sort(), ["in_progress", "sent"]);
  assert.deepEqual([createCalls, sendCalls], [1, 1]);

  let polls = 0;
  let resolvePollEntered;
  const pollEntered = new Promise((resolve) => { resolvePollEntered = resolve; });
  let releasePoll;
  const pollRelease = new Promise((resolve) => { releasePoll = resolve; });
  const statusProvider = {
    async getStatus() { polls += 1; resolvePollEntered(); await pollRelease; return { status: "delivered", occurred_at: "2026-08-08T05:05:00.000Z", sequence: 5 }; },
    downloadDocument: async () => Buffer.from("unused"),
  };
  const events = (repository) => createDocusignEnvelopeEventService({
    repository, adapter: statusProvider, connectionResolver: async () => CONNECTION, resolveSecret: async () => "unused",
    receiptStore: { put: async () => ({}) }, artifactStore: { ingest: async () => ({}) },
    clock: () => "2026-08-08T05:05:00.000Z",
  });
  const firstPoll = events(repositoryA).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-a" }, request_id: "request-pg" });
  await pollEntered;
  let resolveSecondPoll;
  const secondPollClaim = new Promise((resolve) => { resolveSecondPoll = resolve; });
  const observedPollRepositoryB = {
    ...repositoryB,
    async transact(options, mutate) { const result = await repositoryB.transact(options, mutate); resolveSecondPoll(); return result; },
  };
  const secondPoll = events(observedPollRepositoryB).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-b" }, request_id: "request-pg" });
  await secondPollClaim;
  releasePoll();
  const polled = await Promise.all([firstPoll, secondPoll]);
  assert.deepEqual(polled.map((item) => item.outcome).sort(), ["deferred", "processed"]);
  assert.equal(polls, 1);

  const poolAfterRestart = independentPool(fixture, "docusign-process-after-restart");
  const reopened = createPostgresDocusignEnvelopeRepository({ pool: poolAfterRestart });
  const state = await reopened.readState({ tenant_id: TENANT });
  assert.deepEqual([state.requests.length, state.requests[0].state, state.requests[0].last_poll_at], [1, "delivered", "2026-08-08T05:05:00.000Z"]);
  const deferred = await events(reopened).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-restart" }, request_id: "request-pg" });
  assert.equal(deferred.outcome, "deferred");
  assert.equal(polls, 1);
  await poolAfterRestart.end();
  await poolA.end();
  await poolB.end();
});

test("OUTM-33 PostgreSQL in-flight create survives lease takeover through correlation recovery", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const poolA = independentPool(fixture, "docusign-inflight-create-a");
  const poolB = independentPool(fixture, "docusign-inflight-create-b");
  const repositoryA = createPostgresDocusignEnvelopeRepository({ pool: poolA });
  const repositoryB = createPostgresDocusignEnvelopeRepository({ pool: poolB });
  const now = { value: "2026-08-08T07:00:00.000Z" };
  let resolveEntered;
  const entered = new Promise((resolve) => { resolveEntered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  let resolveSendEntered;
  const sendEntered = new Promise((resolve) => { resolveSendEntered = resolve; });
  let releaseSend;
  const sendRelease = new Promise((resolve) => { releaseSend = resolve; });
  let createCalls = 0;
  let findStatus = "created";
  const provider = {
    async createDraft() { createCalls += 1; resolveEntered(); await releasePromise; return { envelope_id: "envelope-pg-inflight" }; },
    async send() { resolveSendEntered(); await sendRelease; return { status: "sent" }; },
    async findByCorrelation({ provider_correlation_ref }) { return { envelope_id: "envelope-pg-inflight", provider_correlation_ref, account_id: CONNECTION.account_id, status: findStatus }; },
  };
  const serviceA = outbox(repositoryA, provider, () => now.value);
  const serviceB = outbox(repositoryB, provider, () => now.value);
  await serviceA.queueApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg-inflight",
    tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id,
    approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: "queue-pg-inflight",
    explicit_human_action: true, authority_binding: AUTHORITY,
  });
  const sendInput = { principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg-inflight", explicit_human_action: true };
  const oldOwner = serviceA.sendApprovedRequest(sendInput);
  await entered;
  now.value = "2026-08-08T07:05:00.001Z";
  const takeover = await serviceB.sendApprovedRequest(sendInput);
  assert.equal(takeover.outcome, "replayed");
  assert.equal((await repositoryB.readState({ tenant_id: TENANT })).requests.find((item) => item.request_id === "request-pg-inflight")?.state, "reconciliation_required");
  release();
  await assert.rejects(oldOwner, (error) => error?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST");
  const restartPool = independentPool(fixture, "docusign-inflight-create-restart");
  const restarted = outbox(createPostgresDocusignEnvelopeRepository({ pool: restartPool }), provider, () => now.value);
  const recovered = await restarted.reconcileRequest({ ...sendInput, explicit_human_action: true });
  assert.deepEqual([recovered.outcome, recovered.request.state, recovered.request.can_send, createCalls], ["reconciled", "draft_created", true, 1]);
  now.value = "2026-08-08T07:05:00.000Z";
  const oldSend = serviceA.sendApprovedRequest(sendInput);
  await sendEntered;
  now.value = "2026-08-08T07:10:00.001Z";
  assert.equal((await serviceB.sendApprovedRequest(sendInput)).outcome, "replayed");
  findStatus = "sent";
  releaseSend();
  await assert.rejects(oldSend, (error) => error?.safe_error_code === "DOCUSIGN_SEND_LEASE_LOST");
  const sentAfterRestart = await restarted.reconcileRequest({ ...sendInput, explicit_human_action: true });
  assert.deepEqual([sentAfterRestart.outcome, sentAfterRestart.request.state, createCalls], ["reconciled", "sent", 1]);
  await restartPool.end();
  await poolA.end();
  await poolB.end();
});

test("OUTM-33 PostgreSQL expired send lease fences provider calls and survives restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const pool = independentPool(fixture, "docusign-expired-send-owner");
  const repository = createPostgresDocusignEnvelopeRepository({ pool });
  let createCalls = 0;
  let sendCalls = 0;
  const service = outbox(repository, {
    async createDraft() { createCalls += 1; return { envelope_id: "must-not-create" }; },
    async send() { sendCalls += 1; },
  }, () => "2026-08-08T06:00:00.000Z");
  await service.queueApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg-expired",
    tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id,
    approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: "queue-pg-expired",
    explicit_human_action: true, authority_binding: AUTHORITY,
  });
  await repository.transact({ tenant_id: TENANT }, (state) => {
    const request = state.requests.find((item) => item.request_id === "request-pg-expired");
    Object.assign(request, {
      state: "provider_pending", attempt_phase: "creating", operation_lease: {
        kind: "send", token: "expired-owner", acquired_at: "2026-08-08T05:00:00.000Z", expires_at: "2026-08-08T05:01:00.000Z",
      }, updated_at: "2026-08-08T05:00:00.000Z",
    });
  });
  const result = await service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg-expired", explicit_human_action: true });
  assert.deepEqual([result.outcome, createCalls, sendCalls], ["replayed", 0, 0]);
  const restartedPool = independentPool(fixture, "docusign-expired-send-restart");
  const restarted = createPostgresDocusignEnvelopeRepository({ pool: restartedPool });
  const state = await restarted.readState({ tenant_id: TENANT });
  assert.equal(state.requests.find((item) => item.request_id === "request-pg-expired")?.state, "reconciliation_required");
  await restartedPool.end();
  await pool.end();
});
