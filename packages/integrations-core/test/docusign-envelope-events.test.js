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

function approvedInput() {
  return {
    principal: { tenant_id: TENANT, actor_id: "actor-owner" },
    request_id: "esign-request-001",
    tenant_id: TENANT,
    matter_id: "matter-001",
    connection_id: CONNECTION.connection_id,
    idempotency_key: "esign-send-001",
    document: {
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
      approval_receipt_ref: "approval:owner:001",
      immutable: true,
      finalized: true,
      owner_approved: true,
    },
    recipients: [{ recipient_ref: "contact:signer-001", role: "client", routing_order: 1 }],
    anchor_manifest: { anchors: [{ role: "client", anchor: "/sig-client/" }] },
  };
}

function connectBody({ status, account_id = CONNECTION.account_id, occurred_at = "2026-08-08T01:05:00.000Z" } = {}) {
  return Buffer.from(JSON.stringify({
    event: `envelope-${status}`,
    generatedDateTime: occurred_at,
    data: {
      accountId: account_id,
      envelopeId: "envelope-001",
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
    artifactReader: async () => ({ bytes: DOCUMENT_BYTES }),
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
    resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null,
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
  const pending = await webhook(runtime.events, body);
  assert.deepEqual([pending.outcome, pending.request.state], ["artifacts_pending", "completed_artifacts_pending"]);
  assert.ok(pending.request.completion_artifacts.signed_pdf);
  assert.equal(pending.request.completion_artifacts.certificate, null);
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
  const failed = await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" });
  assert.deepEqual([failed.outcome, failed.request.state], ["blocked", "sent"]);
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

test("OUTM-34 protected receipt store is content-addressed and rejects a storage hash mismatch", async () => {
  const objects = new Map();
  const storage = {
    async statObject({ object_id }) { return objects.get(object_id) ?? null; },
    async putObject({ object_id, bytes }) {
      const receipt = { sha256: createHash("sha256").update(bytes).digest("hex") };
      objects.set(object_id, receipt);
      return receipt;
    },
  };
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
