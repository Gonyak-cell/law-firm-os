# Law Firm OS Loop System Enterprise Harness Update

작성일: 2026-06-09

상태: planning-only update. 이 문서는 Loop System 사양에 worker/verifier, DAG, budget control, model routing, and harness 운영 개념을 반영하기 위한 설계 업데이트다. 이 문서는 구현, ledger 변경, contract 변경, validator 변경, closeout, `production_ready` 선언을 승인하지 않는다.

## 1. Update Summary

기존 Loop System 사양은 AI 기반 workflow orchestration engine의 큰 틀을 잘 잡고 있다. 다만 엔터프라이즈 실무형 Loop로 쓰려면 "AI가 반복한다"가 아니라 아래 구조로 재정의해야 한다.

```text
Loop Engineering =
  goal을 받은 뒤,
  worker agent와 verifier agent를 분리하고,
  DAG/workflow 안에서 tool과 model을 라우팅하며,
  budget, retry, stop condition, human gate, audit으로 통제하는
  enterprise AI work harness 설계
```

따라서 Loop System은 단순한 AI legal workflow 기능이 아니라, Law Firm OS 안에서 AI 조직을 운영하는 harness layer가 된다.

## 2. Revised Core Definition

### 2.1 Previous Definition

Loop System은 하나 이상의 목표, 상태, 컨텍스트, 도구, 정책, 검증 규칙, 종료 조건을 입력받아 업무 수행을 반복적으로 계획, 실행, 검토, 보정하는 상태 기반 workflow engine이다.

### 2.2 Updated Definition

Loop System은 Law Firm OS의 Matter, document, email, task, calendar, billing, knowledge, and approval 상태를 입력받아, 목표 달성까지 worker/verifier agent를 반복 실행하고, DAG 기반 workflow, model routing, budget control, tool gateway, human approval, and audit evidence로 통제하는 enterprise AI workflow harness다.

### 2.3 Four-Layer Model

| Layer | Meaning | Law Firm OS responsibility |
| --- | --- | --- |
| Goal | 사람이 달성하려는 업무 목표 | Matter/user/admin이 승인한 objective, risk, scope, done criteria |
| Loop | 목표 달성까지 반복 실행하는 구조 | LoopRun, LoopStepRun, state machine, retry, stop condition |
| Verifier | worker 결과를 검증하고 재작업을 지시하는 agent | VerificationResult, correction instruction, blocked claim, review route |
| Harness | 비용, 모델, 도구, DAG, 승인, 중단, 감사 운영 시스템 | ModelRoutingPolicy, BudgetEnvelope, ToolGateway, DAGPlan, HumanApproval, AuditLog |

## 3. New Required Concepts

### 3.1 Worker And Verifier Separation

Loop System must not rely on a worker agent self-certifying its own output.

Required behavior:

- Worker agent performs the task.
- Verifier agent reviews the worker output against explicit criteria.
- Verifier can return `pass`, `revise`, `human_review_required`, `blocked`, or `budget_stop`.
- Worker receives verifier feedback as a structured correction instruction.
- A LoopRun cannot reach `completed` only because the worker says it is done.

Required entities:

| Entity | Required fields |
| --- | --- |
| LoopAgentRole | `role_id`, `role_type`, `model_policy_id`, `allowed_tools`, `verification_scope`, `risk_limit` |
| VerificationResult | `verification_id`, `loop_run_id`, `step_run_id`, `verifier_role_id`, `status`, `checked_rules`, `findings`, `correction_instruction`, `confidence`, `requires_human_approval` |
| CorrectionInstruction | `instruction_id`, `verification_id`, `target_step_run_id`, `reason`, `required_changes`, `forbidden_changes`, `max_rework_attempts` |

Blocking conditions:

- Worker output marked final without verifier result.
- Worker and verifier use the same unrestricted prompt/context for high-risk legal output.
- Verifier result lacks checked rules or source references.
- Verifier correction instruction can expand scope beyond the approved goal.

### 3.2 DAG And Dynamic Workflow

Loop System should support deterministic workflow graphs before runtime execution.

Required behavior:

- Each LoopDefinition defines a DAG template or bounded dynamic DAG rule.
- Each LoopRun materializes a `DAGPlan` from the definition, goal, and context.
- DAG nodes represent worker steps, verifier steps, tool calls, approvals, and branching decisions.
- Cycles are not allowed unless represented as bounded retry loops.
- Dynamic DAG expansion must be limited by budget, max depth, and allowed node types.

Required entities:

| Entity | Required fields |
| --- | --- |
| LoopDAGTemplate | `template_id`, `loop_definition_id`, `version`, `nodes`, `edges`, `branch_rules`, `max_depth`, `max_parallelism` |
| LoopDAGPlan | `dag_plan_id`, `loop_run_id`, `template_version`, `materialized_nodes`, `materialized_edges`, `dynamic_expansions`, `policy_decision_id` |
| LoopDAGNodeRun | `node_run_id`, `dag_plan_id`, `node_type`, `role_id`, `status`, `input_refs`, `output_refs`, `started_at`, `completed_at` |

Blocking conditions:

- DAG contains unbounded cycle.
- Dynamic expansion can add arbitrary tool/action nodes.
- Parallel nodes can mutate the same Matter/document without lock policy.
- DAG branch decision is not auditable.

### 3.3 Budget Control

Loop System must treat cost, tokens, time, tool calls, verifier passes, and retry attempts as first-class controls.

Required behavior:

- Every LoopDefinition must define a default BudgetEnvelope.
- Every LoopRun must receive a runtime budget envelope.
- Budget consumption must be checked before model calls and tool calls.
- Budget thresholds can downgrade model, stop the loop, or require human approval.
- Verifier iterations have separate limits from worker retries.

Required entities:

| Entity | Required fields |
| --- | --- |
| BudgetEnvelope | `budget_id`, `loop_definition_id`, `max_cost`, `max_tokens`, `max_duration_ms`, `max_tool_calls`, `max_worker_iterations`, `max_verifier_iterations`, `escalation_thresholds` |
| BudgetUsage | `usage_id`, `loop_run_id`, `step_run_id`, `model_cost`, `token_count`, `tool_call_count`, `elapsed_ms`, `budget_remaining`, `threshold_events` |
| BudgetDecision | `decision_id`, `loop_run_id`, `decision_type`, `reason`, `previous_route`, `next_route`, `requires_approval` |

Blocking conditions:

- LoopRun without budget envelope.
- Retry path ignores budget.
- High-cost model can be selected without policy reason.
- Budget overrun silently continues.

### 3.4 Model Routing

Loop System must route model calls by task difficulty, risk, data sensitivity, cost, latency, and jurisdiction.

Required behavior:

- Planner/verifier can use higher-capability models when justified.
- Low-risk classification, formatting, summarization, and style checks can use cheaper models.
- Confidential or sovereign jobs must respect local/private model policy.
- Model choice must be logged with task reason, cost expectation, and fallback policy.
- Model fallback must fail closed when policy disallows external routing.

Required entities:

| Entity | Required fields |
| --- | --- |
| ModelRoutingPolicy | `policy_id`, `tenant_id`, `matter_type`, `task_type`, `risk_level`, `data_classification`, `allowed_models`, `preferred_model`, `fallback_models`, `max_cost`, `requires_human_review` |
| ModelRouteDecision | `decision_id`, `loop_run_id`, `step_run_id`, `selected_model`, `reason`, `policy_id`, `cost_class`, `fallback_used`, `data_boundary` |

Blocking conditions:

- User can bypass model policy by directly selecting a disallowed model.
- Confidential local-only job routes to external model.
- Model fallback loses source/citation/audit context.
- High-risk verifier uses a model not allowed for legal review.

### 3.5 Enterprise Harness Controls

The harness is the operational shell around agents and tools.

Required controls:

- Goal contract.
- Worker/verifier role separation.
- DAG materialization and validation.
- Tool gateway permission.
- Model routing.
- Budget envelope.
- Locking and idempotency.
- Human approval gates.
- Audit and observability.
- Emergency stop and kill switch.
- Regression and golden case evaluation.

Required entities:

| Entity | Required fields |
| --- | --- |
| LoopHarnessPolicy | `policy_id`, `tenant_id`, `allowed_loop_types`, `default_budget_id`, `model_policy_refs`, `tool_policy_refs`, `approval_policy_refs`, `emergency_stop_enabled` |
| LoopGoalContract | `goal_contract_id`, `loop_run_id`, `objective`, `done_criteria`, `scope_limits`, `risk_level`, `human_owner_id`, `approved_at` |
| LoopLock | `lock_id`, `scope_type`, `scope_id`, `loop_run_id`, `expires_at`, `conflict_policy` |
| LoopRegressionCase | `case_id`, `loop_definition_id`, `input_fixture_refs`, `expected_verifier_findings`, `expected_budget_class`, `expected_blocked_claims` |

## 4. Contract Review Loop Example

Goal:

```text
상대방 수정본이 기존 계약 체계에 부합하는지 검토하고,
필요한 수정안을 원문 문체에 맞게 제시한다.
```

Suggested DAG:

```text
1. Parse redline
2. Extract changed clauses
3. Classify legal/commercial/operational risk
4. Check defined terms, conditions precedent, termination, indemnity, liability consistency
5. Draft proposed edits in original style
6. Verify citation and source linkage
7. Verify internal contract consistency
8. Verify style and tone
9. Route high-risk findings to human approval
10. Produce final review package
```

Agent routing:

| Step | Role | Model class |
| --- | --- | --- |
| Parse and extract | worker | low/medium-cost model or deterministic parser |
| Legal effect analysis | worker | high-capability model |
| Draft proposed edits | worker | high-capability model |
| Citation/source verification | verifier | medium/high-capability model plus deterministic checks |
| Contract consistency verification | verifier | high-capability model |
| Style verification | verifier | low/medium-cost model |
| Final risk judgment | verifier + human | high-capability model and attorney approval |

Budget behavior:

- If extraction is stable, do not re-run expensive legal analysis.
- If verifier finds style-only issue, route to cheap style worker.
- If verifier finds legal conflict, route to high-capability legal worker.
- If max verifier iterations is reached, stop and require human review.
- If budget threshold is reached, produce partial result with missing checks clearly listed.

## 5. CP/RP Integration

| CP range | RP | Loop update role |
| --- | --- | --- |
| CP00-177-CP00-299 | RP05-RP08 | Provide Matter, document, citation, search, email, and negotiation source inputs for future Loop context. No Loop engine implementation yet. |
| CP00-481-CP00-514 | RP16 | Add DLP, retention, ethical wall, legal hold, and data boundary policy required by Loop harness. |
| CP00-515-CP00-551 | RP17 | Add AI governance prerequisites: model routing, retrieval scope, AIJob, citation validation, AIApproval, budget and policy checks. |
| CP00-552-CP00-583 | RP18 | Implement core Loop harness: LoopDefinition, LoopRun, DAG plan, worker/verifier split, execution, verification, approval routing. |
| CP00-639-CP00-659 | RP21 | Add Loop dashboard, approval inbox, budget/admin controls, kill switch, metrics. |
| CP00-660-CP00-715 | RP22-RP23 | Add integration triggers and external tool constraints. |
| CP00-814-CP00-838 | RP27 | Add Tool Gateway, workflow API, extension permission, webhook callback, idempotency. |
| CP00-839-CP00-866 | RP28 | Add Skill Registry, Playbook Manager, Loop marketplace, regression/golden case publishing. |
| CP00-867-CP00-890 | RP29 | Add SLA, commercial observability, audit package, cost reporting, enterprise support readiness. |

## 6. Updated Missing Requirement Families

| Requirement ID | Priority | First implementation anchor | Requirement |
| --- | --- | --- | --- |
| LOOP-MISS-VERIFY-002 | P0 | RP18 / CP00-552 | Separate worker and verifier roles; no worker self-certification for high-risk output. |
| LOOP-MISS-DAG-001 | P0 | RP18 / CP00-552 | Materialized DAG plan with bounded dynamic expansion and auditable branch decisions. |
| LOOP-MISS-BUDGET-001 | P0 | RP17 / CP00-515 | BudgetEnvelope and BudgetUsage must gate model/tool calls, retries, and verifier iterations. |
| LOOP-MISS-ROUTING-001 | P0 | RP17 / CP00-515 | ModelRoutingPolicy and ModelRouteDecision must route by task, risk, data boundary, cost, and fallback policy. |
| LOOP-MISS-HARNESS-001 | P0 | RP18 / CP00-552 | LoopHarnessPolicy must bind goal, DAG, model routing, budget, tool gateway, approval, lock, audit, and emergency stop. |
| LOOP-MISS-REGRESSION-001 | P1 | RP28 / CP00-839 | Loop definitions and skills must have regression/golden cases before marketplace or firm-wide deployment. |
| LOOP-MISS-CONCURRENCY-001 | P1 | RP18 / CP00-552 | Parallel loop nodes and multiple LoopRuns must respect locks, idempotency, and mutation conflict policy. |
| LOOP-MISS-PARTIAL-001 | P1 | RP18 / CP00-552 | Budget-stopped or verifier-stopped runs must produce partial result packages with missing checks and next actions. |

## 7. Validation Surfaces

| Validator | First expected RP | Purpose |
| --- | --- | --- |
| `loop-harness-overlay:validate` | planning-only | Ensure this overlay maps every harness update to RP/CP anchors. |
| `loop-worker-verifier:validate` | RP18 | Ensure worker outputs cannot self-certify and verifier findings are structured. |
| `loop-dag-plan:validate` | RP18 | Ensure DAG has no unbounded cycles, unsafe dynamic expansion, or unaudited branch decision. |
| `loop-budget:validate` | RP17/RP18 | Ensure model calls, tool calls, retries, and verifier iterations are budget-gated. |
| `loop-model-routing:validate` | RP17 | Ensure model route decisions obey tenant, risk, data boundary, and cost policy. |
| `loop-tool-gateway:validate` | RP27 | Ensure all tools are permissioned, sandboxed, rate-limited, idempotent, and audited. |
| `loop-regression:validate` | RP28 | Ensure published Loop skills have golden cases, regression checks, and verifier expectations. |

## 8. Non-Goals

- This update does not implement runtime agents.
- This update does not change current CP00-145-CP00-176 work.
- This update does not replace Hermes, Claude review, or human approval.
- This update does not authorize autonomous final legal decisions.
- This update does not turn external systems or models into product authority sources.

## 9. Planning Completion Criteria

This update is planning-complete when:

1. Every new `LOOP-MISS-*` requirement has RP/CP anchor, priority, and blocking condition.
2. Worker/verifier split is treated as mandatory for high-risk legal work.
3. Budget and model routing are mandatory before model/tool execution.
4. DAG dynamic expansion is bounded and auditable.
5. CP00-145-CP00-176 remains untouched.
6. First implementation anchors remain CP00-515 for AI governance prerequisites and CP00-552 for core Loop harness.
