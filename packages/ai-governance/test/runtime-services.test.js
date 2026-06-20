import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  adjudicateAiOutput,
  assertPermissionBeforeAi,
  createAiGovernanceRepository,
  createAiOutput,
  createAiOutputExport,
  createAiPolicy,
  createCitationLedger,
  createPromptLog,
  createRetrievalRequest,
  invokeModelGateway,
  setAiDisableSwitch,
} from "../src/index.js";
import { createLegalWorkflow } from "../../ai-legal-workflows/src/index.js";

const TENANT = "tenant-cmp-g9";
const MATTER = "matter-cmp-g9";
const ACTOR = "user-cmp-g9";

function createPolicy(repository) {
  return createAiPolicy({
    repository,
    policy: {
      ai_policy_id: "policy-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      matter_sensitivity_routes: ["public", "confidential", "privileged"],
      privilege_label_routes: ["attorney_client", "work_product", "legal_hold"],
    },
    actor_id: ACTOR,
    idempotency_key: "policy-1",
  });
}

function createAiChain(repository) {
  const { ai_policy: policy } = createPolicy(repository);
  const permission = assertPermissionBeforeAi({
    policy,
    candidate_docs: [
      { document_id: "doc-g9-allowed", privilege_label: "attorney_client", privilege_label_inherited: true },
      { document_id: "doc-g9-denied", privilege_label: "work_product", privilege_label_inherited: true },
    ],
    authorized_doc_ids: ["doc-g9-allowed"],
  });
  assert.deepEqual(permission.retrieved_doc_ids, ["doc-g9-allowed"]);

  const retrieval = createRetrievalRequest({
    repository,
    retrieval_request: {
      retrieval_request_id: "retrieval-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      ai_policy_id: policy.ai_policy_id,
      source_refs: [{ source_type: "dms_document", source_id: "doc-g9-allowed" }],
      retrieved_doc_ids: permission.retrieved_doc_ids,
    },
    actor_id: ACTOR,
    idempotency_key: "retrieval-1",
  });

  const prompt = createPromptLog({
    repository,
    prompt_log: {
      prompt_log_id: "prompt-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      retrieval_request_id: retrieval.retrieval_request.retrieval_request_id,
      raw_prompt: "Summarize the privileged evidence.",
    },
    actor_id: ACTOR,
    idempotency_key: "prompt-1",
  });

  const gateway = invokeModelGateway({
    repository,
    invocation: {
      gateway_invocation_id: "gateway-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      model_ref: "cmp-g9-synthetic-model",
      policy_checked: true,
      retrieval_request_id: retrieval.retrieval_request.retrieval_request_id,
    },
    actor_id: ACTOR,
    idempotency_key: "gateway-1",
  });

  const output = createAiOutput({
    repository,
    ai_output: {
      ai_output_id: "output-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      prompt_log_id: prompt.prompt_log.prompt_log_id,
      gateway_invocation_id: gateway.model_gateway_invocation.gateway_invocation_id,
      raw_output: "Privileged legal answer",
    },
    actor_id: ACTOR,
    idempotency_key: "output-1",
  });

  const citation = createCitationLedger({
    repository,
    citation_ledger: {
      citation_ledger_id: "citation-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      ai_output_id: output.ai_output.ai_output_id,
      sources: [{ source_type: "dms_document", source_id: "doc-g9-allowed", page_ref: "1" }],
    },
    actor_id: ACTOR,
    idempotency_key: "citation-1",
  });

  const adjudication = adjudicateAiOutput({
    repository,
    tenant_id: TENANT,
    review_task_id: output.review_task.review_task_id,
    decision: "approve_with_findings",
    reviewer_id: "attorney-g9",
    actor_id: ACTOR,
    idempotency_key: "adjudication-1",
  });

  const exported = createAiOutputExport({
    repository,
    ai_output_export: {
      ai_output_export_id: "export-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      ai_output_id: output.ai_output.ai_output_id,
      privilege_label_inherited: true,
      dms_acl_inherited: true,
      external_share_boundary_checked: true,
    },
    actor_id: ACTOR,
    idempotency_key: "export-1",
  });

  return { policy, retrieval, prompt, output, citation, adjudication, exported };
}

test("G9 AI governance runtime persists AI write chain, audit, and idempotency", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "ai-g9-")), "ai-governance.json");
  const repository = createAiGovernanceRepository({ filePath: storePath });
  const result = createAiChain(repository);
  assert.equal(result.prompt.prompt_log.raw_prompt_included, false);
  assert.equal(result.output.ai_output.status, "needs_human_review");
  assert.equal(result.output.ai_output.promotes_ai_output_to_final, false);
  assert.equal(result.citation.citation_ledger.citation_source_validation, true);
  assert.equal(result.exported.ai_output_export.raw_output_included, false);
  repository.close();

  const reopened = createAiGovernanceRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "AiOutput" }).length, 1);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "HumanReviewTask" })[0].status, "closed");
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "output-1" }).operation, "ai_output_create");
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).some((event) => event.action === "ai.output.create"), true);
});

test("G9 AI governance blocks unsafe retrieval, export, and final legal automation", () => {
  const repository = createAiGovernanceRepository();
  const { ai_policy: policy } = createPolicy(repository);

  assert.throws(
    () =>
      assertPermissionBeforeAi({
        policy,
        candidate_docs: [{ document_id: "doc-unsafe", privilege_label: "attorney_client", privilege_label_inherited: false }],
        authorized_doc_ids: ["doc-unsafe"],
      }),
    /privilege label inheritance/,
  );

  assert.throws(
    () =>
      createAiOutputExport({
        repository,
        ai_output_export: {
          ai_output_export_id: "export-unsafe",
          tenant_id: TENANT,
          ai_output_id: "output-unsafe",
          privilege_label_inherited: true,
          dms_acl_inherited: false,
          external_share_boundary_checked: true,
        },
        actor_id: ACTOR,
        idempotency_key: "export-unsafe",
      }),
    /privilege and ACL inheritance/,
  );

  assert.throws(
    () =>
      createLegalWorkflow({
        repository,
        legal_workflow: {
          workflow_id: "workflow-unsafe",
          tenant_id: TENANT,
          matter_id: MATTER,
          auto_final_legal_decision: true,
          steps: [{ type: "retrieval" }, { type: "human_approval" }],
        },
        actor_id: ACTOR,
        idempotency_key: "workflow-unsafe",
      }),
    /auto final legal decision/,
  );
});

test("G9 AI disable switch and legal workflow remain review-owned", () => {
  const repository = createAiGovernanceRepository();
  const { ai_policy: policy } = createPolicy(repository);
  const disabled = setAiDisableSwitch({
    repository,
    tenant_id: TENANT,
    ai_policy_id: policy.ai_policy_id,
    disable_switch_on: true,
    actor_id: ACTOR,
    idempotency_key: "disable-1",
  });
  assert.equal(disabled.ai_policy.disable_switch_on, true);
  assert.throws(() => assertPermissionBeforeAi({ policy: disabled.ai_policy, candidate_docs: [], authorized_doc_ids: [] }), /disable switch/);

  const workflow = createLegalWorkflow({
    repository,
    legal_workflow: {
      workflow_id: "workflow-g9-001",
      tenant_id: TENANT,
      matter_id: MATTER,
      steps: [{ type: "retrieval" }, { type: "human_approval", owner_role: "attorney_reviewer" }],
    },
    actor_id: ACTOR,
    idempotency_key: "workflow-1",
  });
  assert.equal(workflow.legal_workflow.auto_final_legal_decision, false);
  assert.equal(workflow.legal_workflow.status, "draft");
});
