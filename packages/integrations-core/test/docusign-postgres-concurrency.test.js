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
  credential_refs: { integration_key: "secret://docusign/key", service_user_id: "secret://docusign/user", private_key: "secret://docusign/private" },
  hmac_secret_ref: "secret://docusign/hmac",
});
const SOURCE = Object.freeze({
  authority: {
    tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-pg",
    artifact_id: "artifact-pg", document_id: "document-pg", version_id: "version-pg",
    sha256: SHA, approval_receipt_ref: "approval-pg",
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
});

function outbox(repository, adapter, clock) {
  return createDocusignEnvelopeService({
    repository, adapter, clock,
    connectionResolver: async () => CONNECTION,
    approvedDocumentResolver: async () => SOURCE,
    artifactReader: async () => ({ bytes: BYTES }),
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
  let createCalls = 0;
  let sendCalls = 0;
  const provider = {
    async createDraft() { createCalls += 1; await new Promise((resolve) => setTimeout(resolve, 30)); return { envelope_id: "envelope-pg" }; },
    async send() { sendCalls += 1; await new Promise((resolve) => setTimeout(resolve, 20)); return { status: "sent" }; },
  };
  const serviceA = outbox(repositoryA, provider, () => "2026-08-08T05:00:00.000Z");
  const serviceB = outbox(repositoryB, provider, () => "2026-08-08T05:00:00.000Z");
  await serviceA.queueApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg",
    tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id,
    approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: "queue-pg",
    explicit_human_action: true, authority_binding: AUTHORITY,
  });
  const sendInput = { principal: { tenant_id: TENANT, actor_id: "actor-pg" }, request_id: "request-pg", explicit_human_action: true };
  const sent = await Promise.all([serviceA.sendApprovedRequest(sendInput), serviceB.sendApprovedRequest(sendInput)]);
  assert.deepEqual(sent.map((item) => item.outcome).sort(), ["in_progress", "sent"]);
  assert.deepEqual([createCalls, sendCalls], [1, 1]);

  let polls = 0;
  const statusProvider = {
    async getStatus() { polls += 1; await new Promise((resolve) => setTimeout(resolve, 30)); return { status: "delivered", occurred_at: "2026-08-08T05:05:00.000Z", sequence: 5 }; },
    downloadDocument: async () => Buffer.from("unused"),
  };
  const events = (repository) => createDocusignEnvelopeEventService({
    repository, adapter: statusProvider, connectionResolver: async () => CONNECTION, resolveSecret: async () => "unused",
    receiptStore: { put: async () => ({}) }, artifactStore: { ingest: async () => ({}) },
    clock: () => "2026-08-08T05:05:00.000Z",
  });
  const polled = await Promise.all([
    events(repositoryA).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-a" }, request_id: "request-pg" }),
    events(repositoryB).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-b" }, request_id: "request-pg" }),
  ]);
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
