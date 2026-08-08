import assert from "node:assert/strict";
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
  const artifactStore = { async ingest(input) { ingested.push(input.kind); if (input.kind === "certificate" && failCertificate) throw new Error("simulated DMS outage"); return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}:1`, sha256: input.sha256, ...input, immutable: true }; } };
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
