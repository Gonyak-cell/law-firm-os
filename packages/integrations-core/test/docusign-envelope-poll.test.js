import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DOCUSIGN_MIN_POLL_INTERVAL_MS, createDocusignEnvelopeEventService, createDocusignEnvelopeRepository, createDocusignWebhookReceiptStore } from "../src/index.js";
import { approvedSource, connectBody, CONNECTION, preparedRuntime, SECRET, TENANT, webhook } from "./docusign-events-fixtures.js";

test("OUTM-34 poll guard survives repository restart and never polls more often than 15 minutes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-poll-"));
  try {
    const filePath = join(dir, "outbox.json");
    let calls = 0;
    const adapter = { createDraft: async () => ({ envelope_id: "envelope-001" }), send: async () => ({ status: "sent" }), async getStatus() { calls += 1; return { status: calls === 1 ? "delivered" : "sent" }; }, downloadDocument: async () => Buffer.from("unused") };
    const now = { value: "2026-08-08T01:00:00.000Z" };
    let runtime = await preparedRuntime({ filePath, adapter, now });
    assert.equal((await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" })).request.state, "delivered");
    now.value = new Date(Date.parse(now.value) + DOCUSIGN_MIN_POLL_INTERVAL_MS - 1).toISOString();
    assert.equal((await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" })).outcome, "deferred");
    assert.equal(calls, 1);
    now.value = new Date(Date.parse("2026-08-08T01:00:00.000Z") + DOCUSIGN_MIN_POLL_INTERVAL_MS).toISOString();
    const reopenedRepository = createDocusignEnvelopeRepository({ filePath });
    runtime = { ...runtime, events: createDocusignEnvelopeEventService({ repository: reopenedRepository, connectionResolver: async () => CONNECTION, resolveSecret: async () => SECRET, adapter, receiptStore: runtime.receiptStore, artifactStore: runtime.artifactStore, approvedDocumentResolver: async () => approvedSource(), clock: () => now.value }) };
    const afterRestart = await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" });
    assert.deepEqual([calls, afterRestart.request.state], [2, "delivered"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("OUTM-34 provider poll outage preserves state and consumes the 15 minute poll slot", async () => {
  let calls = 0;
  const runtime = await preparedRuntime({ adapter: { createDraft: async () => ({ envelope_id: "envelope-001" }), send: async () => ({ status: "sent" }), async getStatus() { calls += 1; throw new Error("provider unavailable"); }, downloadDocument: async () => Buffer.from("unused") } });
  await assert.rejects(runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" }), (error) => error?.status === 503 && error?.retryable === true && error?.safe_error_code === "DOCUSIGN_POLL_PROVIDER_UNAVAILABLE");
  assert.equal(runtime.repository.loadState().requests[0].state, "sent");
  assert.equal((await runtime.events.pollRequest({ principal: { tenant_id: TENANT, actor_id: "scheduler" }, request_id: "esign-request-001" })).outcome, "deferred");
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
  const runtime = await preparedRuntime({ artifactStore: { async readback() { return null; }, async ingest(input, options = {}) { await options.validateAuthority?.({ phase: "fixture_dms_ingest" }); if (input.kind === "certificate" && rejectCertificate) throw new Error("synthetic DMS outage"); return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}`, sha256: input.sha256, ...input, immutable: true }; } } });
  await webhook(runtime.events, connectBody({ status: "delivered", occurred_at: "2026-08-08T01:08:00.000Z", sequence: 8 }));
  await assert.rejects(webhook(runtime.events, connectBody({ status: "completed", occurred_at: "2026-08-08T01:10:00.000Z", sequence: 10 })), (error) => error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING");
  assert.equal(runtime.repository.loadState().requests[0].state, "completed_artifacts_pending");
  const oldDeclined = await webhook(runtime.events, connectBody({ status: "declined", occurred_at: "2026-08-08T01:09:00.000Z", sequence: 9 }));
  const olderVoided = await webhook(runtime.events, connectBody({ status: "voided", occurred_at: "2026-08-08T01:08:00.000Z", sequence: 7 }));
  assert.deepEqual([oldDeclined.outcome, olderVoided.outcome], ["ignored", "ignored"]);
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

test("OUTM-34 reconciliation uses the webhook first-terminal lattice for every terminal pair", async () => {
  const providerStatuses = ["declined", "voided", "created", "sent", "delivered", "completed"];
  for (const localState of ["completed_artifacts_pending", "completed", "declined", "voided"]) {
    for (const providerStatus of providerStatuses) {
      let findCalls = 0;
      const adapter = {
        createDraft: async () => ({ envelope_id: "envelope-001" }),
        send: async () => ({ status: "sent" }),
        getStatus: async () => ({ status: "delivered" }),
        downloadDocument: async () => Buffer.from("unused"),
        async findByCorrelation({ provider_correlation_ref }) { findCalls += 1; return { envelope_id: "envelope-001", provider_correlation_ref, account_id: CONNECTION.account_id, status: providerStatus, occurred_at: "2026-08-08T03:00:00.000Z", sequence: 20 }; },
      };
      const runtime = await preparedRuntime({ adapter });
      runtime.repository.transact({ tenant_id: TENANT }, (state) => {
        const request = state.requests[0];
        const artifacts = localState === "completed"
          ? { signed_pdf: { document_id: "dms:signed", version_id: "version:signed", sha256: "a".repeat(64), permission_envelope_id: request.document.permission_envelope_id, audit_trace_id: request.document.audit_trace_id, immutable: true }, certificate: { document_id: "dms:certificate", version_id: "version:certificate", sha256: "b".repeat(64), permission_envelope_id: request.document.permission_envelope_id, audit_trace_id: request.document.audit_trace_id, immutable: true } }
          : { signed_pdf: null, certificate: null };
        state.requests[0] = { ...request, state: localState, attempt_phase: localState === "completed_artifacts_pending" ? "completed_pending" : localState, completion_artifacts: artifacts, operation_lease: null, provider_operation: null };
      });
      const result = await runtime.outbox.reconcileRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
      assert.equal(result.request.state, localState);
      if (localState === "completed_artifacts_pending") assert.equal(findCalls, 1);
      else assert.equal(findCalls, 0);
    }
  }
});

test("OUTM-34 protected receipt store is content-addressed and rejects a storage hash mismatch", async () => {
  const objects = new Map();
  const storage = { protected: true, immutable: true, content_addressed: true, async statObject({ object_id }) { return objects.get(object_id) ?? null; }, async putObject({ tenant_id, object_id, bytes, content_type }) { const receipt = { tenant_id, object_id, content_type, immutable: true, sha256: createHash("sha256").update(bytes).digest("hex") }; objects.set(object_id, receipt); return receipt; } };
  assert.throws(() => createDocusignWebhookReceiptStore({ storage: { ...storage, immutable: false } }), /protected immutable content-addressed/u);
  const store = createDocusignWebhookReceiptStore({ storage });
  const bytes = Buffer.from("raw-connect-json");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const first = await store.put({ tenant_id: TENANT, request_id: "request-1", bytes, sha256: digest });
  assert.deepEqual(first, await store.put({ tenant_id: TENANT, request_id: "request-1", bytes, sha256: digest }));
  assert.equal(objects.size, 1);
  await assert.rejects(store.put({ tenant_id: TENANT, request_id: "request-1", bytes, sha256: "0".repeat(64) }), (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH");
});
