import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DOCX_MIME_TYPE,
  createDocusignEnvelopeAdapter,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
} from "../src/index.js";

const TENANT = "tenant-amic";
const MATTER = "matter-approved";
const DOCX_BYTES = Buffer.from("approved-docx-fixture");
const DOCX_SHA = createHash("sha256").update(DOCX_BYTES).digest("hex");
const APPROVED_ARTIFACT_ID = "builder-artifact-approved-001";
const CONNECTION = Object.freeze({
  tenant_id: TENANT,
  connection_id: "docusign-primary",
  account_id: "account-001",
  base_uri: "https://demo.docusign.net",
  credential_refs: {
    integration_key: "secret://docusign/integration-key",
    service_user_id: "secret://docusign/service-user",
    private_key: "secret://docusign/private-key",
  },
  hmac_secret_ref: "secret://docusign/connect-hmac",
});

const APPROVED_SOURCE = Object.freeze({
  document: Object.freeze({
    artifact_id: APPROVED_ARTIFACT_ID,
    document_id: "doc-approved-001",
    version_id: "version-approved-001",
    sha256: DOCX_SHA,
    filename: "agreement.docx",
    mime_type: DOCX_MIME_TYPE,
    workspace_id: "workspace-matter-approved",
    permission_envelope_id: "perm-approved-001",
    audit_trace_id: "audit-approved-001",
    template_version: "template-v3",
    template_sha256: "a".repeat(64),
    input_sha256: "b".repeat(64),
    approval_receipt_ref: "approval:owner:001",
    immutable: true,
    finalized: true,
    owner_approved: true,
  }),
  recipients: Object.freeze([{ recipient_ref: "contact:signer-001", role: "client", routing_order: 1 }]),
  anchor_manifest: Object.freeze({ anchors: Object.freeze([{ role: "client", anchor: "/sig-client/" }]) }),
});

function approvedInput(overrides = {}) {
  return {
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    tenant_id: TENANT,
    matter_id: MATTER,
    connection_id: CONNECTION.connection_id,
    idempotency_key: "esign-send-001",
    approved_artifact_id: APPROVED_ARTIFACT_ID,
    ...overrides,
  };
}

function runtime({ repository, adapter, connection = CONNECTION, approvedSource = APPROVED_SOURCE, clock } = {}) {
  return createDocusignEnvelopeService({
    repository,
    connectionResolver: async () => connection,
    approvedDocumentResolver: async () => approvedSource,
    artifactReader: async () => ({ bytes: DOCX_BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({
      tenant_id,
      recipient_ref,
      name: "Test Signer",
      email: "signer@example.test",
    }),
    adapter,
    clock: clock ?? (() => "2026-08-08T01:00:00.000Z"),
  });
}

test("OUTM-33 creates a draft, persists envelope identity, then sends exactly once", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm33-happy-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "docusign-outbox.json");
  const repository = createDocusignEnvelopeRepository({ filePath });
  const calls = [];
  const adapter = {
    async createDraft(input) {
      calls.push({ operation: "create", input });
      return { envelope_id: "envelope-001" };
    },
    async send(input) {
      const persisted = repository.loadState().requests[0];
      assert.equal(persisted.envelope_id, "envelope-001", "provider ID must persist before send");
      assert.equal(persisted.attempt_phase, "sending");
      calls.push({ operation: "send", input });
      return { status: "sent" };
    },
  };
  const service = runtime({ repository, adapter });

  const queued = await service.queueApprovedRequest(approvedInput());
  assert.deepEqual([queued.outcome, queued.request.state], ["created", "approved"]);
  const sent = await service.sendApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    explicit_human_action: true,
  });
  assert.deepEqual([sent.outcome, sent.request.state], ["sent", "sent"]);
  assert.deepEqual(calls.map((call) => call.operation), ["create", "send"]);
  assert.equal(calls[0].input.document.sha256, DOCX_SHA);
  assert.deepEqual(calls[0].input.signers.map(({ recipient_ref, role }) => ({ recipient_ref, role })), [
    { recipient_ref: "contact:signer-001", role: "client" },
  ]);

  const replay = await service.sendApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    explicit_human_action: true,
  });
  assert.equal(replay.outcome, "replayed");
  assert.equal(calls.length, 2);

  const rawStore = readFileSync(filePath, "utf8");
  assert.doesNotMatch(rawStore, /signer@example|Test Signer|documentBase64|approved-docx-fixture|BEGIN PRIVATE KEY|access_token/u);
  const reopened = createDocusignEnvelopeRepository({ filePath });
  assert.equal(reopened.loadState().requests[0].state, "sent");
});

test("OUTM-33 idempotency and payload fingerprint prevent duplicate active envelopes", async () => {
  const repository = createDocusignEnvelopeRepository();
  const adapter = { createDraft: async () => ({ envelope_id: "unused" }), send: async () => ({ status: "sent" }) };
  const service = runtime({ repository, adapter });
  const first = await service.queueApprovedRequest(approvedInput());
  const replay = await service.queueApprovedRequest(approvedInput());
  const fingerprintReplay = await service.queueApprovedRequest(approvedInput({
    request_id: "esign-request-002",
    idempotency_key: "esign-send-002",
  }));
  assert.deepEqual([first.outcome, replay.outcome, fingerprintReplay.outcome], ["created", "replayed", "replayed"]);
  await assert.rejects(
    service.queueApprovedRequest(approvedInput({ matter_id: "matter-changed" })),
    (error) => error?.safe_error_code === "DOCUSIGN_IDEMPOTENCY_CONFLICT",
  );
  assert.equal(repository.loadState().requests.length, 1);
});

test("OUTM-33 binds server principal, tenant, account, approved hash, role, and anchor", async () => {
  const repository = createDocusignEnvelopeRepository();
  let connection = CONNECTION;
  let approvedSource = APPROVED_SOURCE;
  const adapter = { createDraft: async () => ({ envelope_id: "envelope" }), send: async () => ({ status: "sent" }) };
  const service = createDocusignEnvelopeService({
    repository,
    connectionResolver: async () => connection,
    approvedDocumentResolver: async () => approvedSource,
    artifactReader: async () => ({ bytes: DOCX_BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "s@example.test" }),
    adapter,
    clock: () => "2026-08-08T01:00:00.000Z",
  });
  await assert.rejects(
    service.queueApprovedRequest(approvedInput({ principal: { tenant_id: "tenant-other", actor_id: "forged" } })),
    (error) => error?.safe_error_code === "DOCUSIGN_TENANT_MISMATCH",
  );
  await assert.rejects(
    service.queueApprovedRequest(approvedInput({ document: APPROVED_SOURCE.document })),
    (error) => error?.safe_error_code === "DOCUSIGN_AUTHORITATIVE_SOURCE_REQUIRED",
  );
  approvedSource = {
    ...APPROVED_SOURCE,
    document: { ...APPROVED_SOURCE.document, owner_approved: false },
  };
  await assert.rejects(
    service.queueApprovedRequest(approvedInput()),
    (error) => error?.safe_error_code === "DOCUSIGN_APPROVED_IMMUTABLE_DOCUMENT_REQUIRED",
  );
  approvedSource = {
    ...APPROVED_SOURCE,
    anchor_manifest: { anchors: [{ role: "other", anchor: "/sig/" }] },
  };
  await assert.rejects(
    service.queueApprovedRequest(approvedInput()),
    /signature anchor is required for role client/u,
  );
  approvedSource = APPROVED_SOURCE;
  await service.queueApprovedRequest(approvedInput());
  await assert.rejects(
    service.sendApprovedRequest({
      principal: { tenant_id: TENANT, actor_id: "actor-other" },
      request_id: "esign-request-001",
      explicit_human_action: true,
    }),
    (error) => error?.safe_error_code === "DOCUSIGN_SEND_ACTOR_MISMATCH" && error?.status === 403,
  );
  connection = { ...CONNECTION, account_id: "account-changed" };
  await assert.rejects(
    service.sendApprovedRequest({
      principal: { tenant_id: TENANT, actor_id: "actor-owner" },
      request_id: "esign-request-001",
      explicit_human_action: true,
    }),
    (error) => error?.safe_error_code === "DOCUSIGN_ACCOUNT_BINDING_CHANGED",
  );
});

test("OUTM-33 ambiguous create/send results require reconciliation and are never blindly retried", async () => {
  for (const scenario of [
    { phase: "create", status: 429 },
    { phase: "create", status: 503 },
    { phase: "send", status: 408 },
  ]) {
    const repository = createDocusignEnvelopeRepository();
    let createCalls = 0;
    let sendCalls = 0;
    const adapter = {
      async createDraft() {
        createCalls += 1;
        if (scenario.phase === "create") throw Object.assign(new Error("provider failure"), { provider_status: scenario.status });
        return { envelope_id: `envelope-${scenario.phase}` };
      },
      async send() {
        sendCalls += 1;
        throw Object.assign(new Error("provider failure"), { provider_status: scenario.status });
      },
    };
    const service = runtime({ repository, adapter });
    await service.queueApprovedRequest(approvedInput());
    const failed = await service.sendApprovedRequest({
      principal: { tenant_id: TENANT, actor_id: "actor-owner" },
      request_id: "esign-request-001",
      explicit_human_action: true,
    });
    assert.deepEqual([failed.outcome, failed.request.state, failed.safe_error_code], [
      "blocked",
      "reconciliation_required",
      "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS",
    ]);
    await service.sendApprovedRequest({
      principal: { tenant_id: TENANT, actor_id: "actor-owner" },
      request_id: "esign-request-001",
      explicit_human_action: true,
    });
    assert.equal(createCalls, 1);
    assert.equal(sendCalls, scenario.phase === "send" ? 1 : 0);
  }
});

test("OUTM-33 deterministic provider rejection blocks without claiming sent", async () => {
  const repository = createDocusignEnvelopeRepository();
  const adapter = {
    async createDraft() {
      throw Object.assign(new Error("invalid recipient"), { provider_status: 400 });
    },
    async send() {
      assert.fail("send must not run after rejected create");
    },
  };
  const service = runtime({ repository, adapter });
  await service.queueApprovedRequest(approvedInput());
  const result = await service.sendApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    explicit_human_action: true,
  });
  assert.deepEqual([result.request.state, result.safe_error_code], ["provider_blocked", "DOCUSIGN_PROVIDER_REJECTED"]);
});

test("OUTM-33 persistence failure after provider create never sends and restart requires reconciliation", async () => {
  const baseRepository = createDocusignEnvelopeRepository();
  let rejectEnvelopePersist = true;
  const failingRepository = {
    loadState: () => baseRepository.loadState(),
    replaceState(nextState) {
      if (rejectEnvelopePersist && nextState.requests.some((request) => request.envelope_id)) {
        rejectEnvelopePersist = false;
        throw new Error("simulated durable store failure");
      }
      return baseRepository.replaceState(nextState);
    },
  };
  let sendCalls = 0;
  const adapter = {
    createDraft: async () => ({ envelope_id: "envelope-orphan-risk" }),
    send: async () => { sendCalls += 1; },
  };
  const service = runtime({ repository: failingRepository, adapter });
  await service.queueApprovedRequest(approvedInput());
  await assert.rejects(
    service.sendApprovedRequest({
      principal: { tenant_id: TENANT, actor_id: "actor-owner" },
      request_id: "esign-request-001",
      explicit_human_action: true,
    }),
    (error) => error?.safe_error_code === "DOCUSIGN_CREATE_PERSIST_FAILED",
  );
  assert.equal(sendCalls, 0);
  runtime({ repository: baseRepository, adapter });
  assert.equal(baseRepository.loadState().requests[0].state, "reconciliation_required");
});

test("OUTM-33 restart never blindly sends a draft persisted before process loss", async () => {
  const repository = createDocusignEnvelopeRepository();
  let sendCalls = 0;
  const adapter = {
    createDraft: async () => ({ envelope_id: "unused" }),
    send: async () => { sendCalls += 1; },
  };
  const service = runtime({ repository, adapter });
  await service.queueApprovedRequest(approvedInput());
  const state = repository.loadState();
  state.requests[0] = {
    ...state.requests[0],
    state: "provider_pending",
    attempt_phase: "draft_persisted",
    envelope_id: "envelope-persisted-before-loss",
  };
  repository.replaceState(state);
  runtime({ repository, adapter });
  assert.equal(repository.loadState().requests[0].state, "reconciliation_required");
  await service.sendApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    explicit_human_action: true,
  });
  assert.equal(sendCalls, 0);
});

test("OUTM-33 official SDK adapter creates status=created before a separate send transition", async () => {
  const calls = [];
  class FakeApiClient {
    setBasePath(value) { calls.push(["base", value]); }
    requestJWTUserToken(...args) {
      const callback = args.at(-1);
      calls.push(["jwt", args.slice(0, -1)]);
      callback(null, { body: { access_token: "provider-access-token" } });
    }
    addDefaultHeader(name, value) { calls.push(["header", name, value]); }
  }
  class FakeEnvelopesApi {
    createEnvelope(accountId, options, callback) {
      calls.push(["create", accountId, options]);
      callback(null, { envelopeId: "sdk-envelope-001" });
    }
    update(accountId, envelopeId, options, callback) {
      calls.push(["update", accountId, envelopeId, options]);
      callback(null, { envelopeId });
    }
    getEnvelope(accountId, envelopeId, callback) {
      calls.push(["get", accountId, envelopeId]);
      callback(null, { status: "delivered" });
    }
    getDocument(accountId, envelopeId, documentId, callback) {
      calls.push(["download", accountId, envelopeId, documentId]);
      callback(null, Buffer.from("signed-pdf"));
    }
  }
  const secrets = new Map([
    [CONNECTION.credential_refs.integration_key, "integration-key-value"],
    [CONNECTION.credential_refs.service_user_id, "service-user-value"],
    [CONNECTION.credential_refs.private_key, "private-key-value"],
  ]);
  const adapter = createDocusignEnvelopeAdapter({
    sdk: { ApiClient: FakeApiClient, EnvelopesApi: FakeEnvelopesApi },
    resolveSecret: async ({ ref }) => secrets.get(ref),
  });
  const created = await adapter.createDraft({
    connection: CONNECTION,
    document: { bytes: DOCX_BYTES, sha256: DOCX_SHA, filename: "agreement.docx", mime_type: DOCX_MIME_TYPE },
    signers: [{ recipient_ref: "contact:1", role: "client", routing_order: 1, name: "Signer", email: "s@example.test" }],
    anchor_manifest: { anchors: [{ role: "client", anchor: "/sig-client/" }] },
  });
  await adapter.send({ connection: CONNECTION, envelope_id: created.envelope_id });
  assert.equal(created.envelope_id, "sdk-envelope-001");
  const create = calls.find((call) => call[0] === "create");
  assert.equal(create[2].envelopeDefinition.status, "created");
  assert.equal(create[2].envelopeDefinition.eventNotification, undefined);
  assert.equal(create[2].envelopeDefinition.customFields, undefined);
  const update = calls.find((call) => call[0] === "update");
  assert.equal(update[3].envelope.status, "sent");
});
