import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { preparedRuntime, webhook, connectBody } from "./docusign-events-fixtures.js";

test("OUTM-34 completes only after combined PDF and certificate are separately immutable in DMS", async () => {
  const runtime = await preparedRuntime();
  const result = await webhook(runtime.events, connectBody({ status: "completed" }));
  assert.deepEqual([result.outcome, result.request.state], ["completed", "completed"]);
  assert.deepEqual(runtime.downloads, ["combined", "certificate"]);
  assert.deepEqual(runtime.ingested.map(({ kind }) => kind), ["signed_pdf", "certificate"]);
  assert.equal(result.request.completion_artifacts.signed_pdf.immutable, true);
  assert.equal(result.request.completion_artifacts.certificate.immutable, true);
  assert.equal(runtime.repository.loadState().requests[0].audit_lineage.length, 4);
});

test("OUTM-34 remains artifacts-pending on partial DMS failure and retries only the missing artifact", async () => {
  let failCertificate = true;
  const ingested = [];
  const artifactStore = { async readback() { return null; }, async ingest(input, options = {}) { await options.validateAuthority?.({ phase: "fixture_dms_ingest" }); ingested.push(input.kind); if (input.kind === "certificate" && failCertificate) throw new Error("simulated DMS outage"); return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}:1`, sha256: input.sha256, ...input, immutable: true }; } };
  const runtime = await preparedRuntime({ artifactStore });
  const body = connectBody({ status: "completed" });
  await assert.rejects(webhook(runtime.events, body), (error) => error?.status === 503 && error?.safe_error_code === "DOCUSIGN_COMPLETION_ARTIFACT_PENDING" && error?.request?.state === "completed_artifacts_pending");
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
  assert.throws(() => runtime.repository.replaceState(state), /completed request requires both immutable completion artifacts/u);
  state.requests[0] = { ...state.requests[0], state: "completed_artifacts_pending", completion_artifacts: { signed_pdf: { document_id: "doc", version_id: "v1", sha256: "a".repeat(64), immutable: false }, certificate: null } };
  assert.throws(() => runtime.repository.replaceState(state), /completion artifact must be immutable/u);
});

test("OUTM-34 concurrent completion polls have one durable ingest winner per request", async () => {
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  const ingested = [];
  let first = true;
  const artifactStore = {
    async ingest(input, options = {}) {
      await options.validateAuthority?.({ phase: "fixture_dms_ingest" });
      ingested.push(input.kind);
      if (first) { first = false; entered(); await releasePromise; }
      return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}:1`, sha256: input.sha256, ...input, immutable: true };
    },
  };
  const runtime = await preparedRuntime({ artifactStore });
  runtime.repository.transact({ tenant_id: "tenant-amic" }, (state) => {
    state.requests[0] = { ...state.requests[0], state: "completed_artifacts_pending", attempt_phase: "completed_pending", operation_lease: null };
  });
  const firstPoll = runtime.events.pollRequest({ principal: { tenant_id: "tenant-amic", actor_id: "scheduler-a" }, request_id: "esign-request-001" });
  await enteredPromise;
  const secondPoll = runtime.events.pollRequest({ principal: { tenant_id: "tenant-amic", actor_id: "scheduler-b" }, request_id: "esign-request-001" });
  release();
  const results = await Promise.all([firstPoll, secondPoll]);
  assert.deepEqual(results.map((item) => item.outcome).sort(), ["completed", "in_progress"]);
  assert.deepEqual(ingested, ["signed_pdf", "certificate"]);
  assert.equal(runtime.repository.loadState().requests[0].state, "completed");
});

test("OUTM-34 expired completion takeover reads deterministic DMS correlation before ingest", async () => {
  const combined = Buffer.from("provider-combined-pdf");
  const signedSha = createHash("sha256").update(combined).digest("hex");
  const ingested = [];
  const artifactStore = {
    async readback(input) {
      if (input.kind !== "signed_pdf") return null;
      const documentId = `docusign-completion:${input.request_id}:signed_pdf`;
      return { document_id: documentId, version_id: `version:${documentId}:1`, sha256: signedSha, tenant_id: input.tenant_id, matter_id: input.matter_id, workspace_id: input.workspace_id, permission_envelope_id: input.permission_envelope_id, audit_trace_id: input.audit_trace_id, request_id: input.request_id, envelope_id: input.envelope_id, immutable: true };
    },
    async ingest(input, options = {}) { await options.validateAuthority?.({ phase: "fixture_dms_ingest" }); ingested.push(input.kind); return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}`, sha256: input.sha256, ...input, immutable: true }; },
  };
  const runtime = await preparedRuntime({ artifactStore });
  runtime.repository.transact({ tenant_id: "tenant-amic" }, (state) => {
    const request = state.requests[0];
    state.requests[0] = { ...request, state: "completed_artifacts_pending", attempt_phase: "completed_pending", operation_lease: null, completion_operation: { kind: "ingest:signed_pdf", permission_envelope_id: request.document.permission_envelope_id, audit_trace_id: request.document.audit_trace_id, fencing_generation: 2, started_at: "2026-08-08T00:55:00.000Z", lease_expires_at: "2026-08-08T00:59:00.000Z", idempotency_key: `docusign-completion:${request.request_id}:signed_pdf:${signedSha}`, object_id: `object:version:docusign-completion:${request.request_id}:signed_pdf:1`, sha256: signedSha, status: "unknown" } };
  });
  const result = await runtime.events.pollRequest({ principal: { tenant_id: "tenant-amic", actor_id: "scheduler" }, request_id: "esign-request-001" });
  assert.deepEqual([result.outcome, result.request.state, ingested], ["completed", "completed", ["certificate"]]);
});
