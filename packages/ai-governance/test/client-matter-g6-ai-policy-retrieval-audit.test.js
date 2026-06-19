import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_GOVERNANCE_G6C_TUW_COVERAGE,
  createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor,
  createAiGovernanceG6ModelPolicyDescriptor,
  createAiGovernanceG6PermissionAwareRetrievalDescriptor,
  createAiGovernanceG6PromptLogDescriptor,
  createAiGovernanceG6RetrievalRequestDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6c_validator";
const matter_id = "matter_g6c";
const actor_id = "actor_g6c";

function modelPolicy(overrides = {}) {
  return {
    model_policy_id: "model_policy_g6c",
    tenant_id,
    matter_id,
    matter_sensitivity_routes: ["public", "confidential", "privileged"],
    privilege_label_routes: ["attorney_client", "work_product", "legal_hold"],
    disable_states: ["dark_launch_off", "disable_switch_on"],
    ...overrides,
  };
}

function retrievalRequest(overrides = {}) {
  return {
    retrieval_request_id: "retrieval_g6c",
    tenant_id,
    matter_id,
    source_refs: [{ source_type: "document", source_id: "doc_g6c_authorized" }],
    ...overrides,
  };
}

function document(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    document_id: "doc_g6c_authorized",
    privilege_label: "attorney_client",
    privilege_label_inherited: true,
    ...overrides,
  };
}

function promptLog(overrides = {}) {
  return {
    prompt_log_id: "prompt_g6c",
    tenant_id,
    matter_id,
    actor_id,
    retrieval_request_id: "retrieval_g6c",
    prompt_hash: "sha256:g6c",
    created_at: "2026-06-19T08:00:00Z",
    ...overrides,
  };
}

test("G6-C ModelPolicy descriptor routes by matter sensitivity and privilege labels", () => {
  const descriptor = createAiGovernanceG6ModelPolicyDescriptor({
    tenant_id,
    matter_id,
    model_policy: modelPolicy(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.model_policy_receipt.matter_sensitivity_routing_tested, true);
  assert.equal(descriptor.model_policy_receipt.privilege_label_routing_tested, true);
  assert.equal(descriptor.model_policy_receipt.dark_launch_disable_switch_tested, true);
  assert.equal(descriptor.model_policy_receipt.model_policy_persisted, false);

  const blocked = createAiGovernanceG6ModelPolicyDescriptor({
    tenant_id,
    matter_id,
    model_policy: modelPolicy({
      matter_sensitivity_routes: ["public"],
      privilege_label_routes: [],
      disable_states: ["dark_launch_off"],
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("model_policy_matter_sensitivity_routing_required"));
  assert.ok(blocked.blocked_claims.includes("model_policy_privilege_label_routing_required"));
  assert.ok(blocked.blocked_claims.includes("model_policy_dark_launch_or_disable_switch_required"));
  assert.ok(blocked.blocked_claims.includes("model_policy_runtime_dispatch_blocked"));
});

test("G6-C RetrievalRequest descriptor requires Matter context and source refs", () => {
  const descriptor = createAiGovernanceG6RetrievalRequestDescriptor({
    tenant_id,
    matter_id,
    retrieval_request: retrievalRequest(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.retrieval_request_receipt.matter_required_tested, true);
  assert.equal(descriptor.retrieval_request_receipt.source_refs_tested, true);
  assert.equal(descriptor.retrieval_request_receipt.retrieval_request_persisted, false);

  const blocked = createAiGovernanceG6RetrievalRequestDescriptor({
    tenant_id,
    retrieval_request: retrievalRequest({ matter_id: "other", source_refs: [], dispatched_runtime: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("retrieval_request_source_refs_required"));
  assert.ok(blocked.blocked_claims.includes("retrieval_request_runtime_dispatch_blocked"));
});

test("G6-C permission-aware retrieval excludes unauthorized documents", () => {
  const descriptor = createAiGovernanceG6PermissionAwareRetrievalDescriptor({
    tenant_id,
    matter_id,
    candidate_docs: [document()],
    authorized_doc_ids: ["doc_g6c_authorized"],
    retrieved_doc_ids: ["doc_g6c_authorized"],
    acl_evidence: [{ actor_id, document_id: "doc_g6c_authorized", permission: "read" }],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.permission_retrieval_receipt.acl_evidence_tested, true);
  assert.equal(descriptor.permission_retrieval_receipt.unauthorized_doc_excluded, true);
  assert.equal(descriptor.permission_retrieval_receipt.privilege_label_inheritance_tested, true);

  const blocked = createAiGovernanceG6PermissionAwareRetrievalDescriptor({
    tenant_id,
    matter_id,
    candidate_docs: [document(), document({ document_id: "doc_g6c_unauthorized", privilege_label_inherited: false })],
    authorized_doc_ids: ["doc_g6c_authorized"],
    retrieved_doc_ids: ["doc_g6c_authorized", "doc_g6c_unauthorized"],
    acl_evidence: [],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("permission_retrieval_acl_evidence_required"));
  assert.ok(blocked.blocked_claims.includes("permission_retrieval_unauthorized_doc_not_retrieved"));
  assert.ok(blocked.blocked_claims.includes("permission_retrieval_privilege_label_inheritance_required"));
});

test("G6-C PromptLog descriptor requires prompt audit without raw prompt exposure", () => {
  const descriptor = createAiGovernanceG6PromptLogDescriptor({
    tenant_id,
    matter_id,
    actor_id,
    prompt_log: promptLog(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.prompt_log_receipt.prompt_audit_tested, true);
  assert.equal(descriptor.prompt_log_receipt.raw_prompt_exposed, false);
  assert.equal(descriptor.prompt_log_receipt.prompt_log_persisted, false);

  const blocked = createAiGovernanceG6PromptLogDescriptor({
    tenant_id,
    matter_id,
    actor_id,
    prompt_log: promptLog({ prompt_hash: "", raw_prompt: "summarize privileged document", persisted_prompt_log: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("prompt_log_prompt_audit_required"));
  assert.ok(blocked.blocked_claims.includes("prompt_log_raw_prompt_exposure_blocked"));
  assert.ok(blocked.blocked_claims.includes("prompt_log_runtime_persist_blocked"));
});

test("G6-C closeout descriptor summarizes policy retrieval audit evidence", () => {
  const policy = createAiGovernanceG6ModelPolicyDescriptor({ tenant_id, matter_id, model_policy: modelPolicy() });
  const request = createAiGovernanceG6RetrievalRequestDescriptor({ tenant_id, matter_id, retrieval_request: retrievalRequest() });
  const retrieval = createAiGovernanceG6PermissionAwareRetrievalDescriptor({
    tenant_id,
    matter_id,
    candidate_docs: [document()],
    authorized_doc_ids: ["doc_g6c_authorized"],
    retrieved_doc_ids: ["doc_g6c_authorized"],
    acl_evidence: [{ actor_id, document_id: "doc_g6c_authorized", permission: "read" }],
  });
  const prompt = createAiGovernanceG6PromptLogDescriptor({ tenant_id, matter_id, actor_id, prompt_log: promptLog() });

  const closeout = createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor({
    tenant_id,
    descriptors: [policy, request, retrieval, prompt],
    analytics_g6b_closed: true,
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 4);
  assert.equal(closeout.matter_sensitivity_routing_tested, true);
  assert.equal(closeout.matter_required_retrieval_tested, true);
  assert.equal(closeout.unauthorized_doc_exclusion_tested, true);
  assert.equal(closeout.prompt_audit_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(AI_GOVERNANCE_G6C_TUW_COVERAGE.length, 4);
});
