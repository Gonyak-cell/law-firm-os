import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDocusignEnvelopeRepository, normalizeDocusignOutboxState } from "../src/index.js";
import { approvedInput, runtime, DOCX_SHA, TENANT } from "./docusign-outbox-fixtures.js";

test("OUTM-33 creates a draft, persists envelope identity, then sends exactly once", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm33-happy-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "docusign-outbox.json");
  const repository = createDocusignEnvelopeRepository({ filePath });
  const calls = [];
  const adapter = {
    async createDraft(input) { calls.push({ operation: "create", input }); return { envelope_id: "envelope-001" }; },
    async send(input) { const persisted = repository.loadState().requests[0]; assert.equal(persisted.envelope_id, "envelope-001"); assert.equal(persisted.attempt_phase, "sending"); calls.push({ operation: "send", input }); return { status: "sent" }; },
  };
  const service = runtime({ repository, adapter });
  const queued = await service.queueApprovedRequest(approvedInput());
  assert.deepEqual([queued.outcome, queued.request.state], ["created", "approved"]);
  const sent = await service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
  assert.deepEqual([sent.outcome, sent.request.state], ["sent", "sent"]);
  assert.deepEqual(calls.map((call) => call.operation), ["create", "send"]);
  assert.equal(calls[0].input.document.sha256, DOCX_SHA);
  assert.deepEqual(calls[0].input.signers.map(({ recipient_ref, role }) => ({ recipient_ref, role })), [{ recipient_ref: "contact:signer-001", role: "client" }]);
  const replay = await service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
  assert.equal(replay.outcome, "replayed");
  assert.equal(calls.length, 2);
  const rawStore = readFileSync(filePath, "utf8");
  assert.doesNotMatch(rawStore, /signer@example|Test Signer|documentBase64|approved-docx-fixture|BEGIN PRIVATE KEY|access_token|aws-secrets-manager/u);
  assert.equal(createDocusignEnvelopeRepository({ filePath }).loadState().requests[0].state, "sent");
});

test("OUTM-33 idempotency and payload fingerprint prevent duplicate active envelopes", async () => {
  const repository = createDocusignEnvelopeRepository();
  const service = runtime({ repository, adapter: { createDraft: async () => ({ envelope_id: "unused" }), send: async () => ({ status: "sent" }) } });
  const first = await service.queueApprovedRequest(approvedInput());
  const replay = await service.queueApprovedRequest(approvedInput());
  const fingerprintReplay = await service.queueApprovedRequest(approvedInput({ request_id: "esign-request-002", idempotency_key: "esign-send-002" }));
  assert.deepEqual([first.outcome, replay.outcome, fingerprintReplay.outcome], ["created", "replayed", "replayed"]);
  await assert.rejects(service.queueApprovedRequest(approvedInput({ matter_id: "matter-changed" })), (error) => error?.safe_error_code === "DOCUSIGN_APPROVED_SOURCE_MISMATCH");
  assert.equal(repository.loadState().requests.length, 1);
  const durableState = repository.loadState();
  assert.throws(() => normalizeDocusignOutboxState({ ...durableState, schema_version: "amic-os.docusign-envelope-outbox.v999" }), (error) => error?.safe_error_code === "DOCUSIGN_OUTBOX_SCHEMA_UNSUPPORTED" && error?.status === 503);
  assert.throws(() => normalizeDocusignOutboxState({ ...durableState, requests: [{ ...durableState.requests[0], state: "sent", envelope_id: null }] }), /sent request requires a provider envelope/u);
});
