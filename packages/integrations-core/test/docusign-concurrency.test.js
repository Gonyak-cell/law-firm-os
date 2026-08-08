import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DOCX_MIME_TYPE,
  createDocusignEnvelopeEventService,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
} from "../src/index.js";

const TENANT = "tenant-concurrency";
const MATTER = "matter-concurrency";
const BYTES = Buffer.from("approved-concurrent-docx");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const CONNECTION = Object.freeze({
  tenant_id: TENANT, connection_id: "docusign-concurrency", account_id: "account-concurrency",
  base_uri: "https://demo.docusign.net",
  credential_refs: { integration_key: "aws-secrets-manager:/lawos/docusign/key", service_user_id: "aws-secrets-manager:/lawos/docusign/user", private_key: "aws-secrets-manager:/lawos/docusign/private" },
  hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/hmac",
});
const SOURCE = Object.freeze({
  authority: {
    tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-concurrency",
    artifact_id: "artifact-concurrency", document_id: "document-concurrency", version_id: "version-concurrency",
    sha256: SHA, approval_receipt_ref: "approval-concurrency", permission_envelope_id: "permission-concurrency", audit_trace_id: "audit-concurrency",
  },
  document: {
    artifact_id: "artifact-concurrency", document_id: "document-concurrency", version_id: "version-concurrency",
    sha256: SHA, filename: "concurrency.docx", mime_type: DOCX_MIME_TYPE,
    workspace_id: "workspace-concurrency", permission_envelope_id: "permission-concurrency", audit_trace_id: "audit-concurrency",
    template_version: "template-v1", template_sha256: "a".repeat(64), input_sha256: "b".repeat(64), approval_receipt_ref: "approval-concurrency",
    immutable: true, finalized: true, owner_approved: true,
  },
  recipients: [{ recipient_ref: "recipient-concurrency", role: "client", routing_order: 1 }],
  anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
});
const AUTHORITY = Object.freeze({
  tenant_id: TENANT, matter_id: MATTER, workspace_id: SOURCE.document.workspace_id,
  artifact_id: SOURCE.document.artifact_id, document_id: SOURCE.document.document_id,
  version_id: SOURCE.document.version_id, sha256: SHA, approval_receipt_ref: SOURCE.document.approval_receipt_ref,
  permission_envelope_id: SOURCE.document.permission_envelope_id, audit_trace_id: SOURCE.document.audit_trace_id,
});

function service(repository, adapter, clock = () => "2026-08-08T04:00:00.000Z") {
  return createDocusignEnvelopeService({
    repository, adapter, clock,
    connectionResolver: async () => CONNECTION,
    approvedDocumentResolver: async () => SOURCE,
    artifactReader: async (binding) => ({ ...binding, bytes: BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
  });
}

async function queue(outbox) {
  return outbox.queueApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-concurrency" }, request_id: "request-concurrency",
    tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id,
    approved_artifact_id: SOURCE.document.artifact_id, idempotency_key: "queue-concurrency",
    explicit_human_action: true, authority_binding: AUTHORITY,
  });
}

const sendInput = Object.freeze({
  principal: { tenant_id: TENANT, actor_id: "actor-concurrency" },
  request_id: "request-concurrency", explicit_human_action: true,
});

test("OUTM-33 durable CAS lease lets Promise.all create and send exactly one provider envelope", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "outm33-concurrent-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const repositoryA = createDocusignEnvelopeRepository({ filePath });
  const repositoryB = createDocusignEnvelopeRepository({ filePath });
  let createCalls = 0;
  let sendCalls = 0;
  let resolveCreateEntered;
  const createEntered = new Promise((resolve) => { resolveCreateEntered = resolve; });
  let releaseCreate;
  const createRelease = new Promise((resolve) => { releaseCreate = resolve; });
  const adapter = {
    async createDraft() { createCalls += 1; resolveCreateEntered(); await createRelease; return { envelope_id: "envelope-concurrency" }; },
    async send() { sendCalls += 1; return { status: "sent" }; },
  };
  const first = service(repositoryA, adapter);
  const second = service(repositoryB, adapter);
  await queue(first);
  const firstSend = first.sendApprovedRequest(sendInput);
  await createEntered;
  const secondSend = second.sendApprovedRequest(sendInput);
  releaseCreate();
  const outcomes = await Promise.all([firstSend, secondSend]);
  assert.deepEqual(outcomes.map((item) => item.outcome).sort(), ["in_progress", "sent"]);
  assert.deepEqual([createCalls, sendCalls], [1, 1]);
  assert.equal(createDocusignEnvelopeRepository({ filePath }).loadState().requests[0].state, "sent");
});

test("OUTM-34 durable CAS poll slot lets Promise.all call provider once per 15 minute slot", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "outm34-concurrent-poll-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const repositoryA = createDocusignEnvelopeRepository({ filePath });
  const sendAdapter = { createDraft: async () => ({ envelope_id: "envelope-concurrency" }), send: async () => ({ status: "sent" }) };
  await queue(service(repositoryA, sendAdapter));
  await service(repositoryA, sendAdapter).sendApprovedRequest(sendInput);
  let polls = 0;
  let resolvePollEntered;
  const pollEntered = new Promise((resolve) => { resolvePollEntered = resolve; });
  let releasePoll;
  const pollRelease = new Promise((resolve) => { releasePoll = resolve; });
  const adapter = {
    getStatus: async () => { polls += 1; resolvePollEntered(); await pollRelease; return { status: "delivered", occurred_at: "2026-08-08T04:05:00.000Z", sequence: 2 }; },
    downloadDocument: async () => Buffer.from("unused"),
  };
  const makeEvents = (repository) => createDocusignEnvelopeEventService({
    repository, adapter, connectionResolver: async () => CONNECTION, resolveSecret: async () => "unused",
    receiptStore: { put: async () => ({}) }, artifactStore: { ingest: async (input) => ({ ...input }) }, approvedDocumentResolver: async () => SOURCE,
    clock: () => "2026-08-08T04:05:00.000Z",
  });
  const firstPoll = makeEvents(repositoryA).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-a" }, request_id: "request-concurrency" });
  await pollEntered;
  const secondPoll = makeEvents(createDocusignEnvelopeRepository({ filePath })).pollRequest({ principal: { tenant_id: TENANT, actor_id: "worker-b" }, request_id: "request-concurrency" });
  releasePoll();
  const results = await Promise.all([firstPoll, secondPoll]);
  assert.equal(polls, 1);
  assert.deepEqual(results.map((item) => item.outcome).sort(), ["deferred", "processed"]);
  assert.equal(createDocusignEnvelopeRepository({ filePath }).loadState().requests[0].state, "delivered");
});

test("OUTM-33 authority mismatch makes zero repository rows and zero provider calls", async () => {
  const repository = createDocusignEnvelopeRepository();
  let connectionCalls = 0;
  let providerCalls = 0;
  const outbox = createDocusignEnvelopeService({
    repository,
    approvedDocumentResolver: async () => ({ ...SOURCE, authority: { ...SOURCE.authority, tenant_id: "tenant-forged" } }),
    connectionResolver: async () => { connectionCalls += 1; return CONNECTION; },
    artifactReader: async (binding) => ({ ...binding, bytes: BYTES }),
    recipientResolver: async () => ({}),
    adapter: { createDraft: async () => { providerCalls += 1; }, send: async () => { providerCalls += 1; } },
  });
  await assert.rejects(queue(outbox), (error) => error?.safe_error_code === "DOCUSIGN_APPROVED_SOURCE_MISMATCH");
  assert.deepEqual({ connectionCalls, providerCalls, rows: repository.loadState().requests.length }, { connectionCalls: 0, providerCalls: 0, rows: 0 });
});
