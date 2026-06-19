// Deterministic in-process tests for the CMP-G9 AI/RAG governance runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g9-ai-reviewer";
const MATTER_ID = "matter-cmp-g9-runtime";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G9 health descriptor exposes AI/RAG governance after G1-G8", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const aiRag = body.bounded_contexts.find((context) => context.bounded_context === "ai-rag-governance");
  assert.ok(aiRag);
  assert.equal(aiRag.cmp_gate, "CMP-G9");
  assert.equal(aiRag.tuw_ids.length, 18);
  assert.equal(aiRag.tuw_ids[0], "CMP-G9-W09-T001");
  assert.equal(aiRag.tuw_ids.at(-1), "CMP-G9-W09-T018");
  assert.deepEqual(aiRag.depends_on, [
    "CMP-G1-W01",
    "CMP-G2-W02",
    "CMP-G3-W03",
    "CMP-G4-W04",
    "CMP-G5-W05",
    "CMP-G6-W06",
    "CMP-G7-W07",
    "CMP-G8-W08",
  ]);
  assert.equal(aiRag.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G9 blocks direct model dispatch and enforces permission-before-AI retrieval", async () => {
  const directModel = await json(`/api/ai-rag-governance/rag-answer?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      dispatches_ai_model_runtime: true,
    }),
  });
  assert.equal(directModel.status, 400);
  assert.equal(directModel.body.safe_error_code, "CMP_G9_MODEL_DISPATCH_BLOCKED");
  assert.equal(directModel.body.ai_model_dispatched, false);

  const unauthorized = await json(`/api/ai-rag-governance/permission-before-ai?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      candidate_docs: [
        {
          tenant_id: TENANT,
          matter_id: MATTER_ID,
          document_id: "doc-denied",
          privilege_label: "work_product",
          privilege_label_inherited: true,
        },
      ],
      authorized_doc_ids: [],
      retrieved_doc_ids: ["doc-denied"],
      acl_evidence: [{ permission_decision_id: "perm-deny", document_id: "doc-denied", decision: "deny" }],
    }),
  });
  assert.equal(unauthorized.status, 400);
  assert.ok(unauthorized.body.descriptor.blocked_claims.includes("permission_retrieval_unauthorized_doc_not_retrieved"));

  const allowed = await json(`/api/ai-rag-governance/permission-before-ai?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.permission_before_ai, true);
  assert.equal(allowed.body.ai_model_dispatched, false);
});

test("CMP-G9 model policy, retrieval request, and prompt log remain review-only", async () => {
  const policy = await json(`/api/ai-rag-governance/model-policies?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(policy.status, 200);
  assert.equal(policy.body.descriptor.outcome, "review_required");
  assert.equal(policy.body.descriptor.model_policy_receipt.runtime_dispatched, false);

  const retrieval = await json(`/api/ai-rag-governance/retrieval-requests?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(retrieval.status, 200);
  assert.equal(retrieval.body.descriptor.retrieval_request_receipt.source_refs_tested, true);
  assert.equal(retrieval.body.retrieval_request.ai_model_dispatched, false);

  const prompt = await json(`/api/ai-rag-governance/prompt-logs?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(prompt.status, 200);
  assert.equal(prompt.body.prompt_log.raw_prompt_visible, false);
  assert.equal(prompt.body.descriptor.prompt_log_receipt.prompt_log_persisted, false);

  const closeout = await json(`/api/ai-rag-governance/policy-retrieval-closeout?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(closeout.status, 200);
  assert.equal(closeout.body.closeout.permission_before_ai_closed, true);
});

test("CMP-G9 AI output requires candidate state, citations, human review, and disable switch evidence", async () => {
  const finalOutput = await json(`/api/ai-rag-governance/ai-outputs?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      ai_output: {
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        actor_id: ACTOR,
        ai_output_id: "ai-final",
        prompt_log_id: "prompt-final",
        retrieval_request_id: "retrieval-final",
        state: "final",
      },
    }),
  });
  assert.equal(finalOutput.status, 400);
  assert.ok(finalOutput.body.descriptor.blocked_claims.includes("ai_output_candidate_default_state_required"));

  const aiOutput = await json(`/api/ai-rag-governance/ai-outputs?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(aiOutput.status, 200);
  assert.equal(aiOutput.body.ai_output.state, "candidate");
  assert.equal(aiOutput.body.ai_output.ai_output_persisted, false);

  const citation = await json(`/api/ai-rag-governance/citations?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID, confirm_requested: true }),
  });
  assert.equal(citation.status, 200);
  assert.equal(citation.body.citation.citation_required_for_confirm, true);

  const directApproval = await json(`/api/ai-rag-governance/human-review?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID, direct_final_approval: true }),
  });
  assert.equal(directApproval.status, 400);
  assert.ok(directApproval.body.descriptor.blocked_claims.includes("human_review_direct_final_approval_blocked"));

  const review = await json(`/api/ai-rag-governance/human-review?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(review.status, 200);
  assert.equal(review.body.human_review.review_required, true);

  const disable = await json(`/api/ai-rag-governance/disable-switch?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(disable.status, 200);
  assert.equal(disable.body.disable_switch.dark_launch_off_tested, true);

  const closeout = await json(`/api/ai-rag-governance/ai-output-review-closeout?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(closeout.status, 200);
  assert.equal(closeout.body.closeout.human_review_required, true);
});

test("CMP-G9 legal workflow and AI output export block auto-final and ACL bypass paths", async () => {
  const workflowBlocked = await json(`/api/ai-rag-governance/legal-workflows?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      legal_workflow: {
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        workflow_id: "workflow-auto-final",
        steps: [{ step_id: "auto", action: "final_legal_decision", auto_final_legal_decision: true }],
      },
    }),
  });
  assert.equal(workflowBlocked.status, 400);
  assert.equal(workflowBlocked.body.safe_error_code, "CMP_G9_MODEL_DISPATCH_BLOCKED");

  const workflow = await json(`/api/ai-rag-governance/legal-workflows?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(workflow.status, 200);
  assert.equal(workflow.body.legal_workflow.human_approval_step_required, true);

  const builder = await json(`/api/ai-rag-governance/workflow-builder?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(builder.status, 200);
  assert.equal(builder.body.workflow_builder.auto_final_legal_decision_allowed, false);

  const exportBlocked = await json(`/api/ai-rag-governance/ai-output-exports?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      export_request: {
        export_request_id: "export-bypass",
        privilege_label_inherited: false,
        dms_acl_inherited: false,
        permission_inherited: false,
        external_share_boundary_checked: false,
        bypasses_acl: true,
      },
    }),
  });
  assert.equal(exportBlocked.status, 400);
  assert.ok(exportBlocked.body.descriptor.blocked_claims.includes("ai_output_export_acl_bypass_blocked"));

  const outputExport = await json(`/api/ai-rag-governance/ai-output-exports?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(outputExport.status, 200);
  assert.equal(outputExport.body.ai_output_export.export_persisted, false);

  const legalCloseout = await json(`/api/ai-rag-governance/legal-workflows-closeout?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(legalCloseout.status, 200);
  assert.equal(legalCloseout.body.closeout.final_legal_decision_automated, false);
});

test("CMP-G9 RAG answer, review console, and runtime evidence preserve no-R4 boundary", async () => {
  const rag = await json(`/api/ai-rag-governance/rag-answer?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(rag.status, 200);
  assert.equal(rag.body.outcome, "review_required");
  assert.equal(rag.body.rag_answer.state, "candidate");
  assert.equal(rag.body.rag_answer.human_review_required, true);
  assert.equal(rag.body.rag_answer.ai_model_dispatched, false);
  assert.equal(rag.body.rag_answer.final_legal_decision_automated, false);

  const consoleView = await json(`/api/ai-rag-governance/ui/review-console?${query()}`);
  assert.equal(consoleView.status, 200);
  assert.equal(consoleView.body.review_console.raw_prompt_visible, false);
  assert.equal(consoleView.body.review_console.unauthorized_result_count_visible, false);
  assert.equal(consoleView.body.review_console.cards.length, 3);

  const evidence = await json(`/api/ai-rag-governance/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G9");
  assert.equal(evidence.body.evidence.tuw_ids.length, 18);
  assert.equal(evidence.body.evidence.permission_before_ai_required, true);
  assert.equal(evidence.body.evidence.citation_required_for_confirm, true);
  assert.equal(evidence.body.evidence.human_review_required, true);
  assert.equal(evidence.body.evidence.ai_model_dispatch_allowed, false);
  assert.equal(evidence.body.evidence.auto_final_legal_decision_allowed, false);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");
});
