import {
  createAiGovernanceG6AIOutputDescriptor,
  createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor,
  createAiGovernanceG6CitationDescriptor,
  createAiGovernanceG6DAIOutputReviewCloseoutDescriptor,
  createAiGovernanceG6DisableSwitchDescriptor,
  createAiGovernanceG6HumanReviewQueueDescriptor,
  createAiGovernanceG6ModelPolicyDescriptor,
  createAiGovernanceG6PermissionAwareRetrievalDescriptor,
  createAiGovernanceG6PromptLogDescriptor,
  createAiGovernanceG6RetrievalRequestDescriptor,
} from "../../../packages/ai-governance/src/index.js";
import {
  createAiLegalWorkflowsG6AIOutputExportDescriptor,
  createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor,
  createAiLegalWorkflowsG6LegalWorkflowModelDescriptor,
  createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor,
} from "../../../packages/ai-legal-workflows/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const AI_RAG_PREFIXES = Object.freeze([
  "/api/ai-rag-governance/runtime/evidence",
  "/api/ai-rag-governance/model-policies",
  "/api/ai-rag-governance/retrieval-requests",
  "/api/ai-rag-governance/permission-retrieval",
  "/api/ai-rag-governance/prompt-logs",
  "/api/ai-rag-governance/policy-retrieval-closeout",
  "/api/ai-rag-governance/ai-outputs",
  "/api/ai-rag-governance/citations",
  "/api/ai-rag-governance/human-review",
  "/api/ai-rag-governance/disable-switch",
  "/api/ai-rag-governance/ai-output-review-closeout",
  "/api/ai-rag-governance/legal-workflows",
  "/api/ai-rag-governance/workflow-builder",
  "/api/ai-rag-governance/ai-output-exports",
  "/api/ai-rag-governance/legal-workflows-closeout",
  "/api/ai-rag-governance/permission-before-ai",
  "/api/ai-rag-governance/rag-answer",
  "/api/ai-rag-governance/ui/review-console",
]);

export const CMP_G9_TUW_IDS = Object.freeze(
  Array.from({ length: 18 }, (_, index) => `CMP-G9-W09-T${String(index + 1).padStart(3, "0")}`),
);

export const AI_RAG_GOVERNANCE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "ai-rag-governance",
  cmp_gate: "CMP-G9",
  cmp_work_package: "CMP-G9-W09",
  depends_on: Object.freeze([
    "CMP-G1-W01",
    "CMP-G2-W02",
    "CMP-G3-W03",
    "CMP-G4-W04",
    "CMP-G5-W05",
    "CMP-G6-W06",
    "CMP-G7-W07",
    "CMP-G8-W08",
  ]),
  package_ref: "packages/ai-governance; packages/ai-legal-workflows; packages/search; apps/web/src",
  runtime_routes: AI_RAG_PREFIXES,
  tuw_ids: CMP_G9_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G6-W10-T001",
    "LFOS-G6-W10-T002",
    "LFOS-G6-W10-T003",
    "LFOS-G6-W10-T004",
    "LFOS-G6-W10-T005",
    "LFOS-G6-W10-T006",
    "LFOS-G6-W10-T007",
    "LFOS-G6-W10-T008",
    "LFOS-G6-W10-T009",
    "LFOS-G6-W10-T010",
    "LFOS-G6-W10-T011",
    "LFOS-G6-W10-T012",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isAiRagGovernancePath(pathname) {
  return AI_RAG_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function createAiRagGovernanceRuntimeContext() {
  return Object.freeze({
    permission_before_ai_required: true,
    retrieval_authorization_required: true,
    citation_required_for_confirm: true,
    human_review_required: true,
    ai_model_dispatch_allowed: false,
    auto_final_legal_decision_allowed: false,
    prompt_log_persistence: false,
    ai_output_persistence: false,
    human_review_queue_persistence: false,
    legal_workflow_persistence: false,
    export_persistence: false,
  });
}

function response(status, body) {
  return { status, body };
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("AI/RAG governance synthetic tenant is required");
    error.safe_error_code = "CMP_G9_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "ai-rag-governance-runtime-actor",
    actor_type: "user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G9_VALIDATION_ERROR",
    reason: error.message,
    ai_model_dispatched: false,
    final_legal_decision_automated: false,
  });
}

function fail(message, safeErrorCode = "CMP_G9_VALIDATION_ERROR") {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  throw error;
}

function hasModelDispatch(value = {}) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (
      current.dispatches_ai_model_runtime === true ||
      current.dispatched_model_runtime === true ||
      current.model_invoked === true ||
      current.invokes_model === true ||
      current.executes_ai_model === true ||
      current.auto_final_legal_decision === true ||
      current.final_legal_decision === true
    ) {
      return true;
    }
    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") stack.push(nested);
    }
  }
  return false;
}

function requireNoModelDispatch(body = {}) {
  if (hasModelDispatch(body)) {
    fail("CMP-G9 blocks direct model dispatch and auto-final legal decisions", "CMP_G9_MODEL_DISPATCH_BLOCKED");
  }
}

function requireDescriptor(descriptor, code) {
  if (descriptor.outcome === "blocked") {
    return response(400, {
      outcome: "blocked",
      safe_error_code: code,
      descriptor,
      ai_model_dispatched: false,
      final_legal_decision_automated: false,
    });
  }
  return null;
}

function defaultAiSources({ tenantId, matterId = "matter-cmp-g9-runtime", actorId = "ai-rag-governance-runtime-actor" } = {}) {
  const authorizedDocId = "doc-cmp-g9-authorized";
  const deniedDocId = "doc-cmp-g9-denied";
  const aiOutputId = "ai-output-cmp-g9-runtime";
  const retrievalRequestId = "retrieval-cmp-g9-runtime";
  const promptLogId = "prompt-log-cmp-g9-runtime";
  return Object.freeze({
    tenantId,
    matterId,
    actorId,
    modelPolicy: {
      tenant_id: tenantId,
      matter_id: matterId,
      model_policy_id: "model-policy-cmp-g9-runtime",
      matter_sensitivity_routes: ["public", "confidential", "privileged"],
      privilege_label_routes: ["attorney_client", "work_product", "legal_hold"],
      disable_states: ["dark_launch_off", "disable_switch_on"],
    },
    sourceRefs: [{ source_type: "vault-document", source_id: authorizedDocId }],
    retrievalRequest: {
      tenant_id: tenantId,
      matter_id: matterId,
      retrieval_request_id: retrievalRequestId,
      source_refs: [{ source_type: "vault-document", source_id: authorizedDocId }],
    },
    candidateDocs: [
      {
        tenant_id: tenantId,
        matter_id: matterId,
        document_id: authorizedDocId,
        privilege_label: "attorney_client",
        privilege_label_inherited: true,
        permission_inherited: true,
      },
      {
        tenant_id: tenantId,
        matter_id: matterId,
        document_id: deniedDocId,
        privilege_label: "work_product",
        privilege_label_inherited: true,
        permission_inherited: false,
      },
    ],
    authorizedDocIds: [authorizedDocId],
    retrievedDocIds: [authorizedDocId],
    aclEvidence: [
      {
        permission_decision_id: "perm-cmp-g9-allow",
        tenant_id: tenantId,
        matter_id: matterId,
        actor_id: actorId,
        document_id: authorizedDocId,
        decision: "allow",
      },
    ],
    promptLog: {
      tenant_id: tenantId,
      matter_id: matterId,
      actor_id: actorId,
      prompt_log_id: promptLogId,
      prompt_hash: "sha256:cmp-g9-synthetic-prompt",
      retrieval_request_id: retrievalRequestId,
      created_at: "2026-06-20T00:00:00.000Z",
    },
    aiOutput: {
      tenant_id: tenantId,
      matter_id: matterId,
      actor_id: actorId,
      ai_output_id: aiOutputId,
      prompt_log_id: promptLogId,
      retrieval_request_id: retrievalRequestId,
      state: "candidate",
      privilege_label: "attorney_client_privileged",
    },
    citations: [
      {
        tenant_id: tenantId,
        matter_id: matterId,
        document_id: authorizedDocId,
        span_ref: "span-cmp-g9-authorized-001",
        permission_inherited: true,
        privilege_label_inherited: true,
      },
    ],
    reviewActions: [
      {
        tenant_id: tenantId,
        matter_id: matterId,
        reviewer_id: "reviewer-cmp-g9-human",
        audit_receipt_id: "audit-cmp-g9-review-confirm",
        action: "confirm",
      },
    ],
    switchState: {
      tenant_id: tenantId,
      switch_id: "switch-cmp-g9-disable",
      dark_launch_enabled: false,
      ai_disabled: true,
    },
    legalWorkflow: {
      tenant_id: tenantId,
      matter_id: matterId,
      workflow_id: "workflow-cmp-g9-human-approval",
      steps: [
        { step_id: "draft", type: "draft" },
        { step_id: "partner_review", type: "human_approval", requires_human_approval: true },
      ],
    },
    builderConfig: {
      human_approval_step_locked: true,
      allows_auto_final_legal_decision: false,
      steps: [{ step_id: "partner_review", type: "human_approval", requires_human_approval: true }],
    },
    exportRequest: {
      export_request_id: "export-cmp-g9-ai-output",
      privilege_label_inherited: true,
      dms_acl_inherited: true,
      permission_inherited: true,
      external_share_boundary_checked: true,
    },
  });
}

function createPolicyDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiGovernanceG6ModelPolicyDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    model_policy: body.model_policy ?? source.modelPolicy,
  });
}

function createRetrievalDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiGovernanceG6RetrievalRequestDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    retrieval_request: body.retrieval_request ?? source.retrievalRequest,
    source_refs: body.source_refs ?? source.sourceRefs,
  });
}

function createPermissionRetrievalDescriptor({ tenantId, matterId, actorId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId });
  return createAiGovernanceG6PermissionAwareRetrievalDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    candidate_docs: body.candidate_docs ?? source.candidateDocs,
    authorized_doc_ids: body.authorized_doc_ids ?? source.authorizedDocIds,
    retrieved_doc_ids: body.retrieved_doc_ids ?? source.retrievedDocIds,
    acl_evidence: body.acl_evidence ?? source.aclEvidence,
  });
}

function createPromptLogDescriptor({ tenantId, matterId, actorId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId });
  return createAiGovernanceG6PromptLogDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    actor_id: body.actor_id ?? actorId,
    prompt_log: body.prompt_log ?? source.promptLog,
    retrieval_request_id: body.retrieval_request_id ?? source.retrievalRequest.retrieval_request_id,
  });
}

function createAiOutputDescriptor({ tenantId, matterId, actorId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId });
  return createAiGovernanceG6AIOutputDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    actor_id: body.actor_id ?? actorId,
    ai_output: body.ai_output ?? source.aiOutput,
    final_state_requested: body.final_state_requested,
  });
}

function createCitationDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiGovernanceG6CitationDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    ai_output_id: body.ai_output_id ?? source.aiOutput.ai_output_id,
    citations: body.citations ?? source.citations,
    confirm_requested: body.confirm_requested ?? true,
  });
}

function createHumanReviewDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiGovernanceG6HumanReviewQueueDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    ai_output_id: body.ai_output_id ?? source.aiOutput.ai_output_id,
    review_actions: body.review_actions ?? source.reviewActions,
    direct_final_approval: body.direct_final_approval,
  });
}

function createDisableDescriptor({ tenantId, body }) {
  const source = defaultAiSources({ tenantId, actorId: body.actor_id });
  return createAiGovernanceG6DisableSwitchDescriptor({
    tenant_id: tenantId,
    switch_state: body.switch_state ?? source.switchState,
  });
}

function createLegalWorkflowDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiLegalWorkflowsG6LegalWorkflowModelDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    legal_workflow: body.legal_workflow ?? source.legalWorkflow,
  });
}

function createBuilderDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    workflow_id: body.workflow_id ?? source.legalWorkflow.workflow_id,
    builder_config: body.builder_config ?? source.builderConfig,
  });
}

function createAiOutputExportDescriptor({ tenantId, matterId, body }) {
  const source = defaultAiSources({ tenantId, matterId: matterId ?? body.matter_id, actorId: body.actor_id });
  return createAiLegalWorkflowsG6AIOutputExportDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    ai_output_id: body.ai_output_id ?? source.aiOutput.ai_output_id,
    ai_output: body.ai_output ?? source.aiOutput,
    export_request: body.export_request ?? source.exportRequest,
  });
}

function createAiRagGovernanceEvidenceDescriptors(tenantId, actorId = "ai-rag-governance-runtime-actor") {
  const source = defaultAiSources({ tenantId, actorId });
  const modelPolicy = createPolicyDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const retrievalRequest = createRetrievalDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const permissionRetrieval = createPermissionRetrievalDescriptor({ tenantId, matterId: source.matterId, actorId, body: {} });
  const promptLog = createPromptLogDescriptor({ tenantId, matterId: source.matterId, actorId, body: {} });
  const policyCloseout = createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor({
    tenant_id: tenantId,
    descriptors: [modelPolicy, retrievalRequest, permissionRetrieval, promptLog],
    analytics_g6b_closed: true,
  });
  const aiOutput = createAiOutputDescriptor({ tenantId, matterId: source.matterId, actorId, body: {} });
  const citation = createCitationDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const humanReview = createHumanReviewDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const disableSwitch = createDisableDescriptor({ tenantId, body: {} });
  const outputReviewCloseout = createAiGovernanceG6DAIOutputReviewCloseoutDescriptor({
    tenant_id: tenantId,
    descriptors: [aiOutput, citation, humanReview, disableSwitch],
    policy_retrieval_audit_closed: true,
  });
  const legalWorkflow = createLegalWorkflowDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const workflowBuilder = createBuilderDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const aiOutputExport = createAiOutputExportDescriptor({ tenantId, matterId: source.matterId, body: {} });
  const legalWorkflowCloseout = createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor({
    tenant_id: tenantId,
    descriptors: [legalWorkflow, workflowBuilder, aiOutputExport, { tuw_id: "LFOS-G6-W10-T012", outcome: "review_required" }],
    ai_output_review_closed: true,
  });
  return Object.freeze({
    source,
    descriptors: Object.freeze({
      model_policy: modelPolicy,
      retrieval_request: retrievalRequest,
      permission_retrieval: permissionRetrieval,
      prompt_log: promptLog,
      policy_retrieval_closeout: policyCloseout,
      ai_output: aiOutput,
      citation,
      human_review: humanReview,
      disable_switch: disableSwitch,
      ai_output_review_closeout: outputReviewCloseout,
      legal_workflow: legalWorkflow,
      workflow_builder: workflowBuilder,
      ai_output_export: aiOutputExport,
      legal_workflows_closeout: legalWorkflowCloseout,
    }),
  });
}

export function createAiRagGovernanceCmpG9RuntimeEvidence(context, tenantId, actorId = "ai-rag-governance-runtime-actor") {
  const evidence = createAiRagGovernanceEvidenceDescriptors(tenantId, actorId);
  return Object.freeze({
    cmp_gate: "CMP-G9",
    cmp_work_package: "CMP-G9-W09",
    bounded_context: "ai-rag-governance",
    tuw_ids: CMP_G9_TUW_IDS,
    depends_on: AI_RAG_GOVERNANCE_BOUNDED_CONTEXT.depends_on,
    implemented_runtime_routes: AI_RAG_PREFIXES,
    permission_before_ai_required: context.permission_before_ai_required,
    retrieval_authorization_required: context.retrieval_authorization_required,
    citation_required_for_confirm: context.citation_required_for_confirm,
    human_review_required: context.human_review_required,
    ai_model_dispatch_allowed: context.ai_model_dispatch_allowed,
    auto_final_legal_decision_allowed: context.auto_final_legal_decision_allowed,
    prompt_log_persistence: context.prompt_log_persistence,
    ai_output_persistence: context.ai_output_persistence,
    human_review_queue_persistence: context.human_review_queue_persistence,
    legal_workflow_persistence: context.legal_workflow_persistence,
    export_persistence: context.export_persistence,
    ai_model_dispatched: false,
    final_legal_decision_automated: false,
    runtime_readiness: RUNTIME_READINESS,
    durable_persistence_open: true,
    descriptor_evidence: evidence.descriptors,
  });
}

export async function handleAiRagGovernanceApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });
    const source = defaultAiSources({ tenantId, actorId: actor.actor_id, matterId: body.matter_id });

    if (pathname === "/api/ai-rag-governance/runtime/evidence" && method === "GET") {
      return response(200, {
        outcome: "ok",
        evidence: createAiRagGovernanceCmpG9RuntimeEvidence(context, tenantId, actor.actor_id),
        tuw_ids: CMP_G9_TUW_IDS,
        route_tuw_ids: ["CMP-G9-W09-T018"],
      });
    }
    if (pathname === "/api/ai-rag-governance/ui/review-console" && method === "GET") {
      return response(200, {
        outcome: "ok",
        review_console: {
          actor_id: actor.actor_id,
          tenant_id: tenantId,
          review_required: true,
          raw_prompt_visible: false,
          unauthorized_result_count_visible: false,
          final_legal_decision_automated: false,
          cards: [
            { card_id: "policy", title: "Model policy", status: "review_required" },
            { card_id: "retrieval", title: "Permission retrieval", status: "review_required" },
            { card_id: "citation", title: "Citation and human review", status: "review_required" },
          ],
        },
        tuw_ids: ["CMP-G9-W09-T017"],
      });
    }

    if (method !== "POST") {
      return response(405, { outcome: "blocked", safe_error_code: "CMP_G9_METHOD_NOT_ALLOWED", reason: "method_not_allowed" });
    }

    requireNoModelDispatch(body);

    if (pathname === "/api/ai-rag-governance/model-policies") {
      return okDescriptor(createPolicyDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_MODEL_POLICY_BLOCKED", {
        model_policy: { policy_persisted: false, ai_model_dispatched: false },
        tuw_ids: ["CMP-G9-W09-T001"],
      });
    }
    if (pathname === "/api/ai-rag-governance/retrieval-requests") {
      return okDescriptor(createRetrievalDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_RETRIEVAL_REQUEST_BLOCKED", {
        retrieval_request: { retrieval_request_persisted: false, ai_model_dispatched: false },
        tuw_ids: ["CMP-G9-W09-T002"],
      });
    }
    if (pathname === "/api/ai-rag-governance/permission-retrieval") {
      return okDescriptor(
        createPermissionRetrievalDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body }),
        "CMP_G9_PERMISSION_RETRIEVAL_BLOCKED",
        {
          retrieval_result: {
            permission_before_ai: true,
            unauthorized_doc_excluded: true,
            retrieved_doc_ids: body.retrieved_doc_ids ?? source.retrievedDocIds,
            ai_model_dispatched: false,
          },
          tuw_ids: ["CMP-G9-W09-T003"],
        },
      );
    }
    if (pathname === "/api/ai-rag-governance/prompt-logs") {
      return okDescriptor(createPromptLogDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body }), "CMP_G9_PROMPT_LOG_BLOCKED", {
        prompt_log: { prompt_log_persisted: false, raw_prompt_visible: false, ai_model_dispatched: false },
        tuw_ids: ["CMP-G9-W09-T004"],
      });
    }
    if (pathname === "/api/ai-rag-governance/policy-retrieval-closeout") {
      const descriptors = body.descriptors ?? [
        createPolicyDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        createRetrievalDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        createPermissionRetrievalDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body: {} }),
        createPromptLogDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body: {} }),
      ];
      return okDescriptor(
        createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor({
          tenant_id: tenantId,
          descriptors,
          analytics_g6b_closed: body.analytics_g6b_closed ?? true,
        }),
        "CMP_G9_POLICY_RETRIEVAL_CLOSEOUT_BLOCKED",
        { closeout: { permission_before_ai_closed: true, ai_model_dispatched: false }, tuw_ids: ["CMP-G9-W09-T005"] },
      );
    }
    if (pathname === "/api/ai-rag-governance/ai-outputs") {
      return okDescriptor(createAiOutputDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body }), "CMP_G9_AI_OUTPUT_BLOCKED", {
        ai_output: { ai_output_id: body.ai_output?.ai_output_id ?? source.aiOutput.ai_output_id, state: "candidate", ai_output_persisted: false },
        tuw_ids: ["CMP-G9-W09-T006"],
      });
    }
    if (pathname === "/api/ai-rag-governance/citations") {
      return okDescriptor(createCitationDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_CITATION_BLOCKED", {
        citation: { citation_required_for_confirm: true, citation_persisted: false, privilege_label_inherited: true },
        tuw_ids: ["CMP-G9-W09-T007"],
      });
    }
    if (pathname === "/api/ai-rag-governance/human-review") {
      return okDescriptor(createHumanReviewDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_HUMAN_REVIEW_BLOCKED", {
        human_review: { review_required: true, direct_final_approval_blocked: true, review_queue_persisted: false },
        tuw_ids: ["CMP-G9-W09-T008"],
      });
    }
    if (pathname === "/api/ai-rag-governance/disable-switch") {
      return okDescriptor(createDisableDescriptor({ tenantId, body }), "CMP_G9_DISABLE_SWITCH_BLOCKED", {
        disable_switch: { dark_launch_off_tested: true, ai_disabled_tested: true, switch_state_persisted: false },
        tuw_ids: ["CMP-G9-W09-T009"],
      });
    }
    if (pathname === "/api/ai-rag-governance/ai-output-review-closeout") {
      const descriptors = body.descriptors ?? [
        createAiOutputDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body: {} }),
        createCitationDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        createHumanReviewDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        createDisableDescriptor({ tenantId, body: {} }),
      ];
      return okDescriptor(
        createAiGovernanceG6DAIOutputReviewCloseoutDescriptor({
          tenant_id: tenantId,
          descriptors,
          policy_retrieval_audit_closed: body.policy_retrieval_audit_closed ?? true,
        }),
        "CMP_G9_AI_OUTPUT_REVIEW_CLOSEOUT_BLOCKED",
        { closeout: { human_review_required: true, ai_output_persisted: false }, tuw_ids: ["CMP-G9-W09-T010"] },
      );
    }
    if (pathname === "/api/ai-rag-governance/legal-workflows") {
      return okDescriptor(createLegalWorkflowDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_LEGAL_WORKFLOW_BLOCKED", {
        legal_workflow: { human_approval_step_required: true, workflow_model_persisted: false },
        tuw_ids: ["CMP-G9-W09-T011"],
      });
    }
    if (pathname === "/api/ai-rag-governance/workflow-builder") {
      return okDescriptor(createBuilderDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_WORKFLOW_BUILDER_BLOCKED", {
        workflow_builder: { human_approval_step_locked: true, auto_final_legal_decision_allowed: false },
        tuw_ids: ["CMP-G9-W09-T012"],
      });
    }
    if (pathname === "/api/ai-rag-governance/ai-output-exports") {
      return okDescriptor(createAiOutputExportDescriptor({ tenantId, matterId: source.matterId, body }), "CMP_G9_AI_OUTPUT_EXPORT_BLOCKED", {
        ai_output_export: { privilege_label_inherited: true, acl_inherited: true, export_persisted: false },
        tuw_ids: ["CMP-G9-W09-T013"],
      });
    }
    if (pathname === "/api/ai-rag-governance/legal-workflows-closeout") {
      const descriptors = body.descriptors ?? [
        createLegalWorkflowDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        createBuilderDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        createAiOutputExportDescriptor({ tenantId, matterId: source.matterId, body: {} }),
        { tuw_id: "LFOS-G6-W10-T012", outcome: "review_required" },
      ];
      return okDescriptor(
        createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor({
          tenant_id: tenantId,
          descriptors,
          ai_output_review_closed: body.ai_output_review_closed ?? true,
        }),
        "CMP_G9_LEGAL_WORKFLOWS_CLOSEOUT_BLOCKED",
        { closeout: { final_legal_decision_automated: false, export_persisted: false }, tuw_ids: ["CMP-G9-W09-T014"] },
      );
    }
    if (pathname === "/api/ai-rag-governance/permission-before-ai") {
      const descriptor = createPermissionRetrievalDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body });
      const blocked = requireDescriptor(descriptor, "CMP_G9_PERMISSION_BEFORE_AI_BLOCKED");
      if (blocked) return blocked;
      return response(200, {
        outcome: "ok",
        permission_before_ai: true,
        unauthorized_doc_excluded: true,
        ai_model_dispatched: false,
        descriptor,
        tuw_ids: ["CMP-G9-W09-T015"],
      });
    }
    if (pathname === "/api/ai-rag-governance/rag-answer") {
      const permission = createPermissionRetrievalDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body });
      const blockedPermission = requireDescriptor(permission, "CMP_G9_RAG_PERMISSION_BLOCKED");
      if (blockedPermission) return blockedPermission;
      const output = createAiOutputDescriptor({ tenantId, matterId: source.matterId, actorId: actor.actor_id, body });
      const blockedOutput = requireDescriptor(output, "CMP_G9_RAG_OUTPUT_BLOCKED");
      if (blockedOutput) return blockedOutput;
      const citation = createCitationDescriptor({ tenantId, matterId: source.matterId, body });
      const blockedCitation = requireDescriptor(citation, "CMP_G9_RAG_CITATION_BLOCKED");
      if (blockedCitation) return blockedCitation;
      return response(200, {
        outcome: "review_required",
        rag_answer: {
          state: "candidate",
          answer_preview: "Synthetic CMP-G9 answer preview requires human review before use.",
          retrieved_doc_ids: body.retrieved_doc_ids ?? source.retrievedDocIds,
          citations: body.citations ?? source.citations,
          human_review_required: true,
          ai_model_dispatched: false,
          final_legal_decision_automated: false,
        },
        descriptors: { permission, output, citation },
        tuw_ids: ["CMP-G9-W09-T016"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G9_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}

function okDescriptor(descriptor, code, extra = {}) {
  const blocked = requireDescriptor(descriptor, code);
  if (blocked) return blocked;
  return response(200, {
    outcome: "review_required",
    descriptor,
    ai_model_dispatched: false,
    final_legal_decision_automated: false,
    ...extra,
  });
}
