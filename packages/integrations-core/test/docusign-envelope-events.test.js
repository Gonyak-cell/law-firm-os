import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DOCUSIGN_CONNECT_SIGNATURE_HEADER,
  DOCUSIGN_MIN_POLL_INTERVAL_MS,
  DOCX_MIME_TYPE,
  createDocusignEnvelopeEventService,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
  createDocusignWebhookReceiptStore,
} from "../src/index.js";

const TENANT = "tenant-amic";
const SECRET = "test-only-connect-hmac-secret";
const DOCUMENT_BYTES = Buffer.from("approved-docx-fixture");
const DOCUMENT_SHA = createHash("sha256").update(DOCUMENT_BYTES).digest("hex");
const APPROVED_ARTIFACT_ID = "builder-artifact-approved-001";
const CONNECTION = Object.freeze({
  tenant_id: TENANT,
  connection_id: "docusign-primary",
  account_id: "account-001",
  base_uri: "https://demo.docusign.net",
  credential_refs: {
    integration_key: "aws-secrets-manager:/lawos/docusign/integration-key",
    service_user_id: "aws-secrets-manager:/lawos/docusign/service-user",
    private_key: "aws-secrets-manager:/lawos/docusign/private-key",
  },
  hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/connect-hmac",
});

function approvedInput() {
  return {
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    tenant_id: TENANT,
    matter_id: "matter-001",
    connection_id: CONNECTION.connection_id,
    idempotency_key: "esign-send-001",
    approved_artifact_id: APPROVED_ARTIFACT_ID,
    explicit_human_action: true,
    authority_binding: {
      tenant_id: TENANT,
      matter_id: "matter-001",
      workspace_id: "workspace-matter-001",
      artifact_id: APPROVED_ARTIFACT_ID,
      document_id: "doc-approved-001",
      version_id: "version-approved-001",
      sha256: DOCUMENT_SHA,
      approval_receipt_ref: "approval:owner:001",
    },
  };
}

function approvedSource() {
  return {
    authority: {
      tenant_id: TENANT,
      matter_id: "matter-001",
      workspace_id: "workspace-matter-001",
      artifact_id: APPROVED_ARTIFACT_ID,
      document_id: "doc-approved-001",
      version_id: "version-approved-001",
      sha256: DOCUMENT_SHA,
      approval_receipt_ref: "approval:owner:001",
    },
    document: {
      artifact_id: APPROVED_ARTIFACT_ID,
      document_id: "doc-approved-001",
      version_id: "version-approved-001",
      sha256: DOCUMENT_SHA,
      filename: "agreement.docx",
      mime_type: DOCX_MIME_TYPE,
      workspace_id: "workspace-matter-001",
      permission_envelope_id: "perm-matter-001",
      audit_trace_id: "audit-matter-001",
      template_version: "template-v3",
      template_sha256: "a".repeat(64),
      input_sha256: "b".repeat(64),
      approval_receipt_ref: "approval:owner:001",
      immutable: true,
      finalized: true,
      owner_approved: true,
    },
    recipients: [{ recipient_ref: "contact:signer-001", role: "client", routing_order: 1 }],
    anchor_manifest: { anchors: [{ role: "client", anchor: "/sig-client/" }] },
  };
}

function connectBody({ status, account_id = CONNECTION.account_id, envelope_id = "envelope-001", occurred_at = "2026-08-08T01:05:00.000Z", sequence = null } = {}) {
  return Buffer.from(JSON.stringify({
    event: `envelope-${status}`,
    generatedDateTime: occurred_at,
    ...(sequence == null ? {} : { sequence }),
    data: {
      accountId: account_id,
      envelopeId: envelope_id,
      envelopeSummary: { status, statusChangedDateTime: occurred_at },
    },
  }));
}

function signature(bytes, secret = SECRET) {
  return createHmac("sha256", secret).update(bytes).digest("base64");
}

async function preparedRuntime({
  filePath,
  connection = CONNECTION,
  adapter: adapterOverride,
  artifactStore: artifactStoreOverride,
  receiptStore: receiptStoreOverride,
  resolveSecret: resolveSecretOverride,
  now = { value: "2026-08-08T01:00:00.000Z" },
} = {}) {
  const repository = createDocusignEnvelopeRepository({ filePath });
  const downloads = [];
  const ingested = [];
  const receipts = [];
  const adapter = adapterOverride ?? {
    createDraft: async () => ({ envelope_id: "envelope-001" }),
    send: async () => ({ status: "sent" }),
    getStatus: async () => ({ status: "delivered" }),
    async downloadDocument({ document_id }) {
      downloads.push(document_id);
      return Buffer.from(`provider-${document_id}-pdf`);
    },
  };
  const artifactStore = artifactStoreOverride ?? {
    async ingest(input) {
      ingested.push(input);
      return {
        document_id: `dms:${input.request_id}:${input.kind}`,
        version_id: `version:${input.request_id}:${input.kind}:1`,
        sha256: input.sha256,
        immutable: true,
      };
    },
  };
  const receiptStore = receiptStoreOverride ?? {
    async put(input) {
      receipts.push(input);
      return { receipt_ref: `receipt:${input.sha256}`, sha256: input.sha256, immutable: true };
    },
  };
  const connectionResolver = async () => connection;
  const outbox = createDocusignEnvelopeService({
    repository,
    connectionResolver,
    approvedDocumentResolver: async () => approvedSource(),
    artifactReader: async (binding) => ({ ...binding, bytes: DOCUMENT_BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({
      tenant_id,
      recipient_ref,
      name: "Test Signer",
      email: "signer@example.test",
    }),
    adapter,
    clock: () => now.value,
  });
  await outbox.queueApprovedRequest(approvedInput());
  await outbox.sendApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    explicit_human_action: true,
  });
  const events = createDocusignEnvelopeEventService({
    repository,
    connectionResolver,
    resolveSecret: resolveSecretOverride ?? (async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null),
    adapter,
    receiptStore,
    artifactStore,
    clock: () => now.value,
  });
  return { repository, outbox, events, adapter, receiptStore, artifactStore, receipts, downloads, ingested, now };
}

async function webhook(events, body, signatureValue = signature(body)) {
  return events.processWebhook({
    headers: { [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: signatureValue },
    raw_body: body,
  });
}

test("OUTM-34 verifies HMAC against exact raw bytes before receipt or projection mutation", async () => {
  const runtime = await preparedRuntime();
  const body = connectBody({ status: "delivered" });
  const alteredBody = Buffer.from(`${body.toString("utf8")} `);
  await assert.rejects(
    webhook(runtime.events, alteredBody, signature(body)),
    (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_SIGNATURE_INVALID" && error?.status === 401,
  );
  await assert.rejects(
    runtime.events.processWebhook({ raw_body: body, headers: {} }),
    (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_SIGNATURE_INVALID" && error?.status === 401,
  );
  const state = runtime.repository.loadState();
  assert.equal(state.requests[0].state, "sent");
  assert.deepEqual(state.requests[0].event_hashes, []);
  assert.deepEqual(state.webhook_receipts, []);
  assert.equal(runtime.receipts.length, 0);
});

test("OUTM-34 secret-vault outage is a retryable redacted 503 and mutates neither receipt nor projection", async () => {
  const runtime = await preparedRuntime({
    resolveSecret: async () => { throw new Error("secret://raw-provider-hmac-value"); },
  });
  const body = connectBody({ status: "delivered" });
  await assert.rejects(
    webhook(runtime.events, body),
    (error) => error?.status === 503
      && error?.retryable === true
      && error?.safe_error_code === "DOCUSIGN_SECRET_UNAVAILABLE"
      && !JSON.stringify(error).includes("raw-provider-hmac-value"),
  );
  const state = runtime.repository.loadState();
  assert.deepEqual([state.requests[0].state, state.webhook_receipts.length, runtime.receipts.length], ["sent", 0, 0]);
});

test("OUTM-34 stores a protected raw receipt reference and exposes only the safe Outlook projection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-receipt-"));
  try {
    const filePath = join(dir, "outbox.json");
    const runtime = await preparedRuntime({ filePath });
    const body = connectBody({ status: "delivered" });
    const result = await webhook(runtime.events, body);
    assert.deepEqual([result.outcome, result.request.state], ["processed", "delivered"]);
    assert.equal(runtime.receipts.length, 1);
    assert.deepEqual(runtime.receipts[0].bytes, body);
    const persisted = readFileSync(filePath, "utf8");
    assert.doesNotMatch(persisted, /account-001|demo\.docusign|signer@example|envelopeSummary|provider-access|test-only-connect/u);
    assert.doesNotMatch(JSON.stringify(result.request), /tenant-amic|account-001|demo\.docusign|envelope-001/u);
    assert.equal(runtime.repository.loadState().webhook_receipts[0].receipt_ref.startsWith("receipt:"), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("OUTM-34 deduplicates canonical events and rejects out-of-order status regression", async () => {
  const runtime = await preparedRuntime();
  const delivered = connectBody({ status: "delivered" });
  const sentLate = connectBody({ status: "sent", occurred_at: "2026-08-08T01:06:00.000Z" });
  assert.equal((await webhook(runtime.events, delivered)).request.state, "delivered");
  assert.equal((await webhook(runtime.events, delivered)).outcome, "replayed");
  const late = await webhook(runtime.events, sentLate);
  assert.deepEqual([late.outcome, late.request.state], ["ignored", "delivered"]);
  const state = runtime.repository.loadState();
  assert.equal(state.requests[0].event_hashes.length, 2);
  assert.equal(state.webhook_receipts.length, 2);
});

test("OUTM-34 rejects a signed event from a different DocuSign account before receipt storage", async () => {
  const runtime = await preparedRuntime();
  const body = connectBody({ status: "delivered", account_id: "account-other" });
  await assert.rejects(
    webhook(runtime.events, body),
    (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_REJECTED" && error?.status === 401,
  );
  assert.equal(runtime.receipts.length, 0);
  assert.equal(runtime.repository.loadState().requests[0].state, "sent");
});

test("OUTM-34 rejects a same-account cross-envelope locator before receipt, projection, or artifact writes and after restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-cross-envelope-"));
  try {
    const filePath = join(dir, "outbox.json");
    const runtime = await preparedRuntime({ filePath });
    const before = runtime.repository.loadState();
    const requestA = before.requests[0];
    const requestB = {
      ...requestA,
      request_id: "esign-request-002",
      envelope_id: "envelope-002",
      idempotency_key: "esign-send-002",
      payload_sha256: "c".repeat(64),
      provider_correlation_ref: "docusign-correlation:request-002",
      event_hashes: [],
    };
    runtime.repository.replaceState({ ...before, requests: [requestA, requestB] });
    const locatedB = runtime.repository.loadState().requests[1];
    const baseline = runtime.repository.loadState();
    const resolver = async () => locatedB;
    const eventService = createDocusignEnvelopeEventService({
      repository: runtime.repository,
      connectionResolver: async () => CONNECTION,
      webhookRequestResolver: resolver,
      resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null,
      adapter: runtime.adapter,
      receiptStore: runtime.receiptStore,
      artifactStore: runtime.artifactStore,
      clock: () => runtime.now.value,
    });
    const body = connectBody({ status: "completed", envelope_id: requestA.envelope_id });
    await assert.rejects(
      webhook(eventService, body),
      (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_REJECTED" && error?.status === 401,
    );
    const after = runtime.repository.loadState();
    assert.deepEqual(after, baseline);
    assert.equal(runtime.receipts.length, 0);
    assert.equal(runtime.ingested.length, 0);

    const reopenedRepository = createDocusignEnvelopeRepository({ filePath });
    const reopened = createDocusignEnvelopeEventService({
      repository: reopenedRepository,
      connectionResolver: async () => CONNECTION,
      webhookRequestResolver: resolver,
      resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null,
      adapter: runtime.adapter,
      receiptStore: runtime.receiptStore,
      artifactStore: runtime.artifactStore,
      clock: () => runtime.now.value,
    });
    await assert.rejects(
      webhook(reopened, body),
      (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_REJECTED" && error?.status === 401,
    );
    assert.deepEqual(reopenedRepository.loadState(), after);
    assert.equal(runtime.receipts.length, 0);
    assert.equal(runtime.ingested.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("OUTM-34 completes only after combined PDF and certificate are separately immutable in DMS", async () => {
  const runtime = await preparedRuntime();
  const result = await webhook(runtime.events, connectBody({ status: "completed" }));
  assert.deepEqual([result.outcome, result.request.state], ["completed", "completed"]);
  assert.deepEqual(runtime.downloads, ["combined", "certificate"]);
  assert.deepEqual(runtime.ingested.map(({ kind }) => kind), ["signed_pdf", "certificate"]);
  assert.equal(result.request.completion_artifacts.signed_pdf.immutable, true);
  assert.equal(result.request.completion_artifacts.certificate.immutable, true);
});

test("OUTM-34 remains artifacts-pending on partial DMS failure and retries only the missing artifact", async () => {
  let failCertificate = true;
  const ingested = [];
  const artifactStore = {
    async ingest(input) {
      ingested.push(input.kind);
      if (input.kind === "certificate" && failCertificate) throw new Error("simulated DMS outage");
      return {
        document_id: `dms:${input.kind}`,
        version_id: `version:${input.kind}:1`,
        sha256: input.sha256,
        immutable: true,
      };
    },
  };
  const runtime = await preparedRuntime({ artifactStore });
  const body = connectBody({ status: "completed" });
  await assert.rejects(
    webhook(runtime.events, body),
    (error) => error?.status === 503
      && error?.retryable === true
      && error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING"
      && error?.request?.state === "completed_artifacts_pending",
  );
  assert.ok(runtime.repository.loadState().requests[0].completion_artifacts.signed_pdf);
  assert.equal(runtime.repository.loadState().requests[0].completion_artifacts.certificate, null);
  failCertificate = false;
  const completed = await webhook(runtime.events, body);
  assert.deepEqual([completed.outcome, completed.request.state], ["completed", "completed"]);
  assert.deepEqual(runtime.downloads, ["combined", "certificate", "certificate"]);
  assert.deepEqual(ingested, ["signed_pdf", "certificate", "certificate"]);
});

test("OUTM-34 repository rejects a false completed state without both immutable artifacts", async () => {
  const runtime = await preparedRuntime();
  const state = runtime.repository.loadState();
  state.requests[0] = { ...state.requests[0], state: "completed" };
  assert.throws(
    () => runtime.repository.replaceState(state),
    /completed request requires both immutable completion artifacts/u,
  );
  state.requests[0] = {
    ...state.requests[0],
    state: "completed_artifacts_pending",
    completion_artifacts: {
      signed_pdf: { document_id: "doc", version_id: "v1", sha256: "a".repeat(64), immutable: false },
      certificate: null,
    },
  };
  assert.throws(() => runtime.repository.replaceState(state), /completion artifact must be immutable/u);
});

test("OUTM-34 poll guard survives repository restart and never polls more often than 15 minutes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-poll-"));
  try {
    const filePath = join(dir, "outbox.json");
    let calls = 0;
    const adapter = {
      createDraft: async () => ({ envelope_id: "envelope-001" }),
      send: async () => ({ status: "sent" }),
      async getStatus() { calls += 1; return { status: calls === 1 ? "delivered" : "sent" }; },
      downloadDocument: async () => Buffer.from("unused"),
    };
    const now = { value: "2026-08-08T01:00:00.000Z" };
    let runtime = await preparedRuntime({ filePath, adapter, now });
    assert.equal((await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" })).request.state, "delivered");
    now.value = new Date(Date.parse(now.value) + DOCUSIGN_MIN_POLL_INTERVAL_MS - 1).toISOString();
    assert.equal((await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" })).outcome, "deferred");
    assert.equal(calls, 1);
    now.value = new Date(Date.parse("2026-08-08T01:00:00.000Z") + DOCUSIGN_MIN_POLL_INTERVAL_MS).toISOString();
    const reopenedRepository = createDocusignEnvelopeRepository({ filePath });
    runtime = {
      ...runtime,
      events: createDocusignEnvelopeEventService({
        repository: reopenedRepository,
        connectionResolver: async () => CONNECTION,
        resolveSecret: async () => SECRET,
        adapter,
        receiptStore: runtime.receiptStore,
        artifactStore: runtime.artifactStore,
        clock: () => now.value,
      }),
    };
    const afterRestart = await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" });
    assert.equal(calls, 2);
    assert.equal(afterRestart.request.state, "delivered", "late sent status must not regress delivered");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("OUTM-34 provider poll outage preserves state and consumes the 15 minute poll slot", async () => {
  let calls = 0;
  const runtime = await preparedRuntime({
    adapter: {
      createDraft: async () => ({ envelope_id: "envelope-001" }),
      send: async () => ({ status: "sent" }),
      async getStatus() { calls += 1; throw new Error("provider unavailable"); },
      downloadDocument: async () => Buffer.from("unused"),
    },
  });
  await assert.rejects(
    runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" }),
    (error) => error?.status === 503 && error?.retryable === true && error?.safe_error_code === "DOCUSIGN_POLL_PROVIDER_UNAVAILABLE",
  );
  assert.equal(runtime.repository.loadState().requests[0].state, "sent");
  const deferred = await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" });
  assert.equal(deferred.outcome, "deferred");
  assert.equal(calls, 1);
});

test("OUTM-34 declined and voided states are terminal against later delivery or completion", async () => {
  for (const terminal of ["declined", "voided"]) {
    const runtime = await preparedRuntime();
    assert.equal((await webhook(runtime.events, connectBody({ status: terminal }))).request.state, terminal);
    assert.equal((await webhook(runtime.events, connectBody({ status: "completed", occurred_at: "2026-08-08T01:10:00.000Z" }))).request.state, terminal);
    assert.deepEqual(runtime.downloads, []);
  }
});

test("OUTM-34 provider time and sequence reject older terminal events without overwriting completion-pending", async () => {
  let rejectCertificate = true;
  const runtime = await preparedRuntime({
    artifactStore: {
      async ingest(input) {
        if (input.kind === "certificate" && rejectCertificate) throw new Error("synthetic DMS outage");
        return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}`, sha256: input.sha256, immutable: true };
      },
    },
  });
  await webhook(runtime.events, connectBody({ status: "delivered", occurred_at: "2026-08-08T01:08:00.000Z", sequence: 8 }));
  await assert.rejects(
    webhook(runtime.events, connectBody({ status: "completed", occurred_at: "2026-08-08T01:10:00.000Z", sequence: 10 })),
    (error) => error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING",
  );
  assert.equal(runtime.repository.loadState().requests[0].state, "completed_artifacts_pending");
  const oldDeclined = await webhook(runtime.events, connectBody({ status: "declined", occurred_at: "2026-08-08T01:09:00.000Z", sequence: 9 }));
  const olderVoided = await webhook(runtime.events, connectBody({ status: "voided", occurred_at: "2026-08-08T01:08:00.000Z", sequence: 7 }));
  assert.deepEqual([oldDeclined.outcome, olderVoided.outcome], ["ignored", "ignored"]);
  assert.equal(runtime.repository.loadState().requests[0].state, "completed_artifacts_pending");
  rejectCertificate = false;
  const completed = await webhook(runtime.events, connectBody({ status: "completed", occurred_at: "2026-08-08T01:10:00.000Z", sequence: 10 }));
  assert.equal(completed.request.state, "completed");
});

test("OUTM-34 a valid newer terminal may end only a non-terminal request; first terminal remains immutable", async () => {
  const runtime = await preparedRuntime();
  assert.equal((await webhook(runtime.events, connectBody({ status: "delivered", occurred_at: "2026-08-08T01:05:00.000Z", sequence: 5 }))).request.state, "delivered");
  assert.equal((await webhook(runtime.events, connectBody({ status: "declined", occurred_at: "2026-08-08T01:06:00.000Z", sequence: 6 }))).request.state, "declined");
  assert.equal((await webhook(runtime.events, connectBody({ status: "voided", occurred_at: "2026-08-08T01:07:00.000Z", sequence: 7 }))).request.state, "declined");
});

test("OUTM-34 protected receipt store is content-addressed and rejects a storage hash mismatch", async () => {
  const objects = new Map();
  const storage = {
    protected: true,
    immutable: true,
    content_addressed: true,
    async statObject({ object_id }) { return objects.get(object_id) ?? null; },
    async putObject({ tenant_id, object_id, bytes, content_type }) {
      const receipt = { tenant_id, object_id, content_type, immutable: true, sha256: createHash("sha256").update(bytes).digest("hex") };
      objects.set(object_id, receipt);
      return receipt;
    },
  };
  assert.throws(
    () => createDocusignWebhookReceiptStore({ storage: { ...storage, immutable: false } }),
    /protected immutable content-addressed/u,
  );
  const store = createDocusignWebhookReceiptStore({ storage });
  const bytes = Buffer.from("raw-connect-json");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const first = await store.put({ tenant_id: TENANT, request_id: "request-1", bytes, sha256: digest });
  const replay = await store.put({ tenant_id: TENANT, request_id: "request-1", bytes, sha256: digest });
  assert.deepEqual(first, replay);
  assert.equal(objects.size, 1);
  await assert.rejects(
    store.put({ tenant_id: TENANT, request_id: "request-1", bytes, sha256: "0".repeat(64) }),
    (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH",
  );
});
