# Law Firm OS Enterprise v2 + Loop Plan Upgrade

작성일: 2026-06-09

상태: planning-only upgrade. 이 문서는 기존 `docs/spec-v2-integration/*`와 `docs/loop-system-integration/*`를 엔터프라이즈급 SaaS 계획으로 합쳐 해석하기 위한 상위 계획이다. 이 문서는 구현, ledger 변경, contract 변경, validator 변경, closeout, `production_ready` 선언을 승인하지 않는다.

## 1. Executive Summary

Law Firm OS의 v2 overlay와 Loop System overlay는 서로 다른 문제를 해결한다.

| Overlay | 역할 | 비유 |
| --- | --- | --- |
| v2 overlay | Matter, document, source, citation, graph, retrieval, authority를 정리하는 knowledge/evidence spine | 로펌 업무의 기억, 자료실, 근거 체계 |
| Loop System overlay | goal, worker/verifier, DAG, budget, model routing, tool, approval, audit를 통제하는 execution/harness spine | 로펌 업무를 반복 수행하는 AI 운영 엔진 |

엔터프라이즈급 개발 순서는 v2 spine을 먼저 만들고, 그 위에 AI governance를 얹은 뒤, Loop harness를 실행 계층으로 올리는 방식이어야 한다.

```text
Foundation and active CP recovery
  -> v2 knowledge/evidence spine
  -> business domain substrate
  -> governance and AI safety
  -> Loop enterprise harness
  -> admin/integration/client operations
  -> legal depth/platform extensibility
  -> marketplace/commercial readiness
```

## 2. Enterprise Upgrade Principles

### 2.1 Evidence First

모든 AI output, graph claim, wiki section, legal authority, negotiation summary, and Loop result must be traceable to source evidence or an explicit human provenance exception.

Required enterprise behaviors:

- Product-wide Citation Ledger.
- Immutable DocumentVersion source binding.
- Source Panel and evidence UX.
- Authority freshness and supersession tracking.
- Uncited high-risk output block.

### 2.2 Permission Trimmed By Default

Knowledge and Loop context must be built from what the actor is allowed to see, not from the full Matter dataset.

Required enterprise behaviors:

- Permission envelope on Matter Wiki, LLM Wiki, graph nodes, graph edges, retrieval packets, and Loop context packages.
- Visible count and trimmed count logging.
- No hidden node labels or hidden source excerpts in client-visible output.
- Ethical wall and DLP enforcement before AI/model/tool use.

### 2.3 Worker/Verifier Separation

Loop System must not let the same worker agent perform work and certify the result as complete for high-risk legal workflows.

Required enterprise behaviors:

- Worker agent performs.
- Verifier agent checks.
- Verifier can pass, revise, block, require human review, or stop for budget.
- Completed LoopRun requires verifier pass or approved human exception.

### 2.4 Model Routing And Budget Control

Enterprise AI is not "always use the best model." It is policy-based routing by risk, cost, confidentiality, jurisdiction, task type, and latency.

Required enterprise behaviors:

- BudgetEnvelope for every LoopRun.
- ModelRoutingPolicy for every AI job.
- ModelRouteDecision persisted for audit.
- Local/private routing for confidential or sovereign jobs.
- Fallback must fail closed when policy disallows external models.

### 2.5 DAG-Based Execution

Loop workflows must be materialized as bounded DAG plans before execution.

Required enterprise behaviors:

- LoopDAGTemplate versioning.
- LoopDAGPlan materialization.
- Auditable branch decisions.
- No unbounded cycles.
- Bounded dynamic workflow expansion.
- Locks and idempotency for parallel steps.

### 2.6 Human Approval Remains Non-Delegable

AI, Hermes, Claude, verifier, or harness evidence cannot replace human approval for high-risk legal and external actions.

Required enterprise behaviors:

- Approval package with source, diff, risk, cost, scope, and recommended action.
- External action hard block without approval.
- Approval history and delegation rules.
- SLA and escalation for delayed approvals.

### 2.7 Operator And Commercial Readiness

Top-tier SaaS requires admin surfaces, monitoring, audit packages, supportability, and commercial controls.

Required enterprise behaviors:

- Admin console for Loop policies, model policies, budget limits, DLP, data region, and kill switch.
- Loop dashboard and approval inbox.
- Cost/token/time metrics.
- SOC2/ISMS-P audit evidence.
- SLA and incident response.
- Marketplace trust score and version pinning.

## 3. Improved Requirement Families

### 3.1 v2 Enterprise Requirement Families

| ID | Priority | Enterprise upgrade |
| --- | --- | --- |
| V2-MISS-KNOW | P0 | Matter Wiki and LLM Wiki must separate confirmed knowledge, AI candidates, disputed facts, open questions, and client-visible summaries. |
| V2-MISS-GRAPH | P0 | Matter Graph must support permission-trimmed traversal, named views, source-backed nodes, and no hidden label leakage. |
| V2-MISS-CITE | P0 | Citation Ledger must be product-wide and bind to immutable source versions and authority freshness. |
| V2-MISS-AI | P0 | Local AI Worker and hybrid routing must include policy, provenance, model version, cost, and fallback decisions. |
| V2-MISS-DMS | P1 | Document Register must define source lineage across upload, email filing, OCR, redline, import, and migration. |
| V2-MISS-NEG | P1 | Negotiation Ledger must connect email, redline, clause changes, positions, concessions, and risk. |
| V2-MISS-AUTH | P1 | Authority Graph must track jurisdiction, freshness, supersession, and source confidence. |
| V2-MISS-DEPLOY | P1 | Private/Sovereign deployment must affect routing, data residency, storage, observability, backup, and support. |

### 3.2 Loop Enterprise Requirement Families

| ID | Priority | Enterprise upgrade |
| --- | --- | --- |
| LOOP-MISS-CORE | P0 | LoopDefinition, LoopRun, LoopStepRun, LoopGoalContract, and status lifecycle. |
| LOOP-MISS-VERIFY | P0 | Worker/verifier split, structured verifier findings, correction instructions, high-risk block. |
| LOOP-MISS-DAG | P0 | DAG template, materialized plan, branch audit, no unbounded cycles, bounded dynamic expansion. |
| LOOP-MISS-BUDGET | P0 | Cost, token, duration, tool call, worker iteration, verifier iteration, and escalation thresholds. |
| LOOP-MISS-ROUTING | P0 | Model routing by task, risk, data boundary, model capability, cost, fallback, and region. |
| LOOP-MISS-HARNESS | P0 | Enterprise harness policy binding goal, DAG, model, budget, tool, approval, lock, audit, emergency stop. |
| LOOP-MISS-CONTEXT | P0 | Permission-trimmed Loop context packages from Matter, DMS, Search, Email, Graph, Wiki, and Citation. |
| LOOP-MISS-APPROVAL | P0 | Approval package, approval inbox, external-action hard block, SLA, delegation, audit. |
| LOOP-MISS-TOOL | P1 | Tool Gateway with permission, sandbox, credentials, rate limit, idempotency, replay protection, audit. |
| LOOP-MISS-SKILL | P1 | Skill Registry, Playbook Manager, version pinning, marketplace trust score, regression cases. |
| LOOP-MISS-OBS | P1 | Metrics for success, failure, verifier pass, user edit rate, cost, tokens, duration, approval latency. |

## 4. Planning Boundaries

### 4.1 Must Not Touch During CP00-145-CP00-176

- `contracts/*`
- `packages/*`
- `scripts/*`
- `docs/closeout-pack-plan/*`
- `docs/closeout-packs/*`
- `docs/weighted-implementation-ledger.*`

### 4.2 Allowed Planning Scope

- `docs/spec-v2-integration/*`
- `docs/loop-system-integration/*`
- `docs/enterprise-v2-loop-roadmap/*`

### 4.3 Implementation Start Points

| Start point | Meaning |
| --- | --- |
| CP00-177 | v2 knowledge/evidence spine begins |
| CP00-515 | Loop governance prerequisites begin |
| CP00-552 | Loop core harness begins |
| CP00-639 | Loop operator/admin surfaces begin |
| CP00-814 | Tool Gateway and platform workflow API begin |
| CP00-839 | Loop/Skill marketplace begins |

## 5. Exit Gates For Enterprise Readiness

| Gate | Must prove |
| --- | --- |
| Evidence gate | AI and graph outputs are source-backed or explicitly marked as provenance exceptions. |
| Permission gate | Context, graph, wiki, search, and Loop packages are permission-trimmed. |
| Governance gate | Model routing, budget, review, citation, and DLP policies are enforced. |
| Loop gate | Worker/verifier separation, bounded DAG, retries, locks, and stop conditions are enforced. |
| Approval gate | High-risk external actions require human approval and approval package. |
| Operator gate | Admin can configure limits, disable loops, inspect runs, and export audit evidence. |
| Commercial gate | SLA, observability, SOC2/ISMS-P evidence, support workflows, and cost reporting are ready. |

## 6. Updated Development Principle

Do not ask whether v2 or Loop should "replace" the existing plan. The correct approach is:

```text
Use existing CP/RP order as the execution spine.
Use v2 overlay as the knowledge/evidence spine.
Use Loop overlay as the execution/harness spine.
Consume each overlay only when its responsible RP/CP arrives.
```

