import assert from "node:assert/strict";
import test from "node:test";
import { createDocusignEnvelopeRepository } from "../src/index.js";
import { approvedInput, runtime, TENANT } from "./docusign-outbox-fixtures.js";

test("OUTM-33 ambiguous create/send results require reconciliation and are never blindly retried", async () => {
  for (const scenario of [{ phase: "create", status: 429 }, { phase: "create", status: 503 }, { phase: "send", status: 408 }]) {
    const repository = createDocusignEnvelopeRepository();
    let createCalls = 0;
    let sendCalls = 0;
    const adapter = {
      async createDraft() { createCalls += 1; if (scenario.phase === "create") throw Object.assign(new Error("provider failure"), { provider_status: scenario.status }); return { envelope_id: `envelope-${scenario.phase}` }; },
      async send() { sendCalls += 1; throw Object.assign(new Error("provider failure"), { provider_status: scenario.status }); },
    };
    const service = runtime({ repository, adapter });
    await service.queueApprovedRequest(approvedInput());
    await assert.rejects(service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true }), (error) => error?.status === 503 && error?.safe_error_code === "DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS" && error?.request?.state === "reconciliation_required");
    await service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
    assert.equal(createCalls, 1);
    assert.equal(sendCalls, scenario.phase === "send" ? 1 : 0);
  }
});

test("OUTM-33 deterministic provider rejection blocks without claiming sent", async () => {
  const repository = createDocusignEnvelopeRepository();
  const adapter = { async createDraft() { throw Object.assign(new Error("invalid recipient"), { provider_status: 400 }); }, async send() { assert.fail("send must not run after rejected create"); } };
  const service = runtime({ repository, adapter });
  await service.queueApprovedRequest(approvedInput());
  const result = await service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
  assert.deepEqual([result.request.state, result.safe_error_code], ["provider_blocked", "DOCUSIGN_PROVIDER_REJECTED"]);
});

test("OUTM-33 persistence failure after provider create never sends and restart requires reconciliation", async () => {
  const baseRepository = createDocusignEnvelopeRepository();
  let rejectEnvelopePersist = true;
  const failingRepository = { loadState: () => baseRepository.loadState(), transact(options, mutate) { return baseRepository.transact(options, (state, context) => { const result = mutate(state, context); if (rejectEnvelopePersist && state.requests.some((request) => request.envelope_id)) { rejectEnvelopePersist = false; throw new Error("simulated durable store failure"); } return result; }); } };
  let sendCalls = 0;
  const adapter = { createDraft: async () => ({ envelope_id: "envelope-orphan-risk" }), send: async () => { sendCalls += 1; } };
  const service = runtime({ repository: failingRepository, adapter });
  await service.queueApprovedRequest(approvedInput());
  await assert.rejects(service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true }), (error) => error?.safe_error_code === "DOCUSIGN_CREATE_PERSIST_FAILED");
  assert.equal(sendCalls, 0);
  const restarted = runtime({ repository: baseRepository, adapter, clock: () => "2026-08-08T01:06:00.000Z" });
  await restarted.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
  assert.equal(baseRepository.loadState().requests[0].state, "reconciliation_required");
});

test("OUTM-33 restart never blindly sends a draft persisted before process loss", async () => {
  const repository = createDocusignEnvelopeRepository();
  let sendCalls = 0;
  const adapter = { createDraft: async () => ({ envelope_id: "unused" }), send: async () => { sendCalls += 1; } };
  const service = runtime({ repository, adapter });
  await service.queueApprovedRequest(approvedInput());
  const state = repository.loadState();
  state.requests[0] = { ...state.requests[0], state: "provider_pending", attempt_phase: "draft_persisted", envelope_id: "envelope-persisted-before-loss" };
  repository.replaceState(state);
  await service.sendApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-owner" }, request_id: "esign-request-001", explicit_human_action: true });
  assert.equal(repository.loadState().requests[0].state, "reconciliation_required");
  assert.equal(sendCalls, 0);
});
