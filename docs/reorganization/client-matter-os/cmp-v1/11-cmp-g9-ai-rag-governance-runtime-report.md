# CMP-G9 AI/RAG Governance Runtime Report

## Scope

CMP-G9-W09 implements the AI/RAG governance runtime slice for the new CMP v1.0 TUW baseline. It promotes the LFOS G6-W10 descriptor set into executable API evidence while preserving the runtime boundary: no direct model dispatch, no automatic final legal decision, no raw prompt exposure, and no R4 claim before durable persistence evidence.

Runtime readiness remains `runtime_api_evidence_only__durable_persistence_open`.

## TUW Trace

- CMP-G9-W09-T001: ModelPolicy runtime descriptor.
- CMP-G9-W09-T002: RetrievalRequest runtime descriptor.
- CMP-G9-W09-T003: PermissionAwareRetrieval runtime descriptor.
- CMP-G9-W09-T004: PromptLog runtime descriptor.
- CMP-G9-W09-T005: Policy/retrieval/audit closeout runtime evidence.
- CMP-G9-W09-T006: AIOutput candidate-state runtime descriptor.
- CMP-G9-W09-T007: Citation runtime descriptor.
- CMP-G9-W09-T008: HumanReviewQueue runtime descriptor.
- CMP-G9-W09-T009: DisableSwitch runtime descriptor.
- CMP-G9-W09-T010: AI output review closeout runtime evidence.
- CMP-G9-W09-T011: LegalWorkflow model runtime descriptor.
- CMP-G9-W09-T012: WorkflowBuilder UI control runtime descriptor.
- CMP-G9-W09-T013: AIOutputExport ACL/privilege inheritance runtime descriptor.
- CMP-G9-W09-T014: Legal workflows closeout runtime evidence.
- CMP-G9-W09-T015: Permission-before-AI negative/positive runtime route.
- CMP-G9-W09-T016: RAG answer candidate projection route.
- CMP-G9-W09-T017: AI review console projection route.
- CMP-G9-W09-T018: Runtime evidence aggregate route.

## Runtime Routes

| Route | Evidence |
| --- | --- |
| `/api/ai-rag-governance/runtime/evidence` | Aggregates all G9 descriptors and boundary flags. |
| `/api/ai-rag-governance/model-policies` | Requires matter sensitivity, privilege label, and disable-state routing evidence. |
| `/api/ai-rag-governance/retrieval-requests` | Requires Matter-scoped source refs before retrieval. |
| `/api/ai-rag-governance/permission-retrieval` | Excludes unauthorized documents before any AI answer path. |
| `/api/ai-rag-governance/prompt-logs` | Stores prompt hash evidence only; raw prompts stay hidden. |
| `/api/ai-rag-governance/policy-retrieval-closeout` | Closes the policy/retrieval/prompt audit descriptor set. |
| `/api/ai-rag-governance/ai-outputs` | Keeps AIOutput in candidate state. |
| `/api/ai-rag-governance/citations` | Requires citations with permission and privilege inheritance. |
| `/api/ai-rag-governance/human-review` | Requires confirm/reject audit evidence and blocks direct final approval. |
| `/api/ai-rag-governance/disable-switch` | Verifies dark-launch off and AI-disabled state. |
| `/api/ai-rag-governance/ai-output-review-closeout` | Closes candidate output/citation/review/disable evidence. |
| `/api/ai-rag-governance/legal-workflows` | Requires human approval steps and blocks auto-final legal decisions. |
| `/api/ai-rag-governance/workflow-builder` | Locks human approval in the workflow builder projection. |
| `/api/ai-rag-governance/ai-output-exports` | Requires DMS ACL and privilege label inheritance before export preview. |
| `/api/ai-rag-governance/legal-workflows-closeout` | Closes legal workflow/export evidence. |
| `/api/ai-rag-governance/permission-before-ai` | Proves permission-before-AI with blocked unauthorized retrieval. |
| `/api/ai-rag-governance/rag-answer` | Emits candidate RAG answer projection with citation and human-review requirement. |
| `/api/ai-rag-governance/ui/review-console` | Projects review state without raw prompts or unauthorized counts. |

## Guardrails

- Permission-before-AI is required before candidate answer projection.
- Unauthorized retrieval is blocked and unauthorized result counts are not exposed.
- Citation is required for confirm paths and inherits DMS permission/privilege labels.
- Human review is required; direct final approval and auto-final legal decisions are blocked.
- Direct AI model dispatch flags are rejected before route execution.
- Prompt logs expose hashes/refs only, not raw prompts.
- AI output, prompt log, review queue, workflow, and export persistence remain open.

## Validation

- `npm run client-matter:cmp-g9:validate`
- `npm --workspace apps/api run test -- cmp-g9-ai-rag-governance-api.test.js`
- Full cumulative validation remains required before merge.
