# Law Firm OS Loop System RP Anchor Map

작성일: 2026-06-09

상태: planning-only anchor map. 이 문서는 Loop System과 enterprise harness 업데이트를 기존 Law Firm OS RP/CP 실행 구조에 연결한다. 이 문서는 구현, ledger 변경, contract 변경, validator 변경, closeout, `production_ready` 선언을 승인하지 않는다.

## 1. Live Boundary

- 병렬 개발 세션 범위: `CP00-145-CP00-176`
- 이 문서의 안전 범위: `docs/loop-system-integration/*`
- Loop System의 첫 governance 소비 지점: `CP00-515` / `RP17 AI Governance`
- Loop System core의 첫 구현 소비 지점: `CP00-552` / `RP18 AI Legal Workflows`

다른 세션이 `CP00-145-CP00-176`을 진행하는 동안 이 문서는 planning reference로만 사용한다.

## 2. Anchor Rules

1. 기존 closeout pack 순서를 대체하지 않는다.
2. `CP00-145-CP00-176`에는 직접 요구사항을 삽입하지 않는다.
3. `v2 overlay`는 knowledge/evidence/source spine이다.
4. `Loop System overlay`는 enterprise workflow harness spine이다.
5. Loop engine은 Matter/DMS/Search/Email spine이 준비된 뒤 구현한다.
6. Model routing, budget, verification, and approval governance는 Loop engine보다 먼저 고정한다.
7. 고위험 법률 output은 worker self-certification으로 완료될 수 없다.

## 3. RP/CP Ranges Used

| RP | CP range | Role in Loop overlay |
| --- | --- | --- |
| RP05 Matter Core | CP00-177-CP00-197 | Matter context input, Matter Wiki, Matter Graph references |
| RP06 DMS Core | CP00-198-CP00-234 | Document source, version, Citation Ledger inputs |
| RP07 Search OCR And Index | CP00-235-CP00-271 | LLM Wiki, retrieval packet, GraphRAG context |
| RP08 Email And Office Native DMS | CP00-272-CP00-299 | Email, attachment, negotiation, calendar/task triggers |
| RP16 Governance DLP Retention | CP00-481-CP00-514 | DLP, retention, ethical wall, legal hold, data boundary |
| RP17 AI Governance | CP00-515-CP00-551 | Model routing, budget policy, retrieval scope, citation, AIApproval |
| RP18 AI Legal Workflows | CP00-552-CP00-583 | LoopDefinition, LoopRun, DAG plan, worker/verifier, execution, verification |
| RP21 Admin Console | CP00-639-CP00-659 | Loop dashboard, approval inbox, budget admin, kill switch |
| RP22 External Integrations I | CP00-660-CP00-687 | Microsoft 365, Google, Slack/Teams, e-sign triggers |
| RP23 External Integrations II | CP00-688-CP00-715 | Bank, card, tax, DART and billing/accounting triggers |
| RP24 Korean Legal Depth | CP00-716-CP00-749 | Authority freshness, Korean legal verifier constraints |
| RP26 Enterprise SaaS Hardening | CP00-782-CP00-813 | Private/sovereign routing, local model boundary, reliability |
| RP27 Platform Extensibility | CP00-814-CP00-838 | Tool Gateway, workflow API, webhook callback, extension permission |
| RP28 Marketplace And Custom AI Apps | CP00-839-CP00-866 | Skill Registry, Playbook Manager, Loop marketplace, regression cases |
| RP29 Commercial Readiness | CP00-867-CP00-890 | Observability, SLA, audit package, cost reporting, support readiness |

## 4. Requirement Anchor Matrix

| Requirement ID | Priority | First CP | Primary RP | Secondary RPs | Decision | Implementation intent |
| --- | --- | --- | --- | --- | --- | --- |
| LOOP-MISS-CORE-001 | P0 | CP00-552 | RP18 | RP17, RP21, RP27 | mapped | Define LoopDefinition, LoopRun, LoopStepRun lifecycle |
| LOOP-MISS-GOAL-001 | P0 | CP00-552 | RP18 | RP05, RP17 | mapped | Define LoopGoalContract with objective, scope, risk, done criteria |
| LOOP-MISS-VERIFY-001 | P0 | CP00-515 | RP17 | RP18 | mapped | Define verification gates for citation, policy, hallucination, completion |
| LOOP-MISS-VERIFY-002 | P0 | CP00-552 | RP18 | RP17 | mapped | Separate worker and verifier roles; block worker self-certification |
| LOOP-MISS-DAG-001 | P0 | CP00-552 | RP18 | RP21, RP27 | mapped | Materialize bounded DAG plan and auditable branch decisions |
| LOOP-MISS-BUDGET-001 | P0 | CP00-515 | RP17 | RP18, RP21, RP29 | mapped | Gate model calls, tool calls, retries, and verifier iterations by budget |
| LOOP-MISS-ROUTING-001 | P0 | CP00-515 | RP17 | RP18, RP26, RP27 | mapped | Route models by task, risk, data boundary, cost, and fallback policy |
| LOOP-MISS-HARNESS-001 | P0 | CP00-552 | RP18 | RP17, RP21, RP27 | mapped | Bind goal, DAG, model, budget, tool, approval, lock, audit, emergency stop |
| LOOP-MISS-TRIGGER-001 | P1 | CP00-660 | RP22 | RP08, RP21, RP23, RP27 | mapped | Event, schedule, manual, conditional, webhook triggers |
| LOOP-MISS-CONTEXT-001 | P0 | CP00-515 | RP17 | RP05, RP06, RP07, RP08, RP18 | mapped | Build permission-trimmed Matter context packages |
| LOOP-MISS-APPROVAL-001 | P0 | CP00-515 | RP17 | RP18, RP21 | mapped | Human approval workflow and approval package for high-risk actions |
| LOOP-MISS-MEMORY-001 | P1 | CP00-552 | RP18 | RP05, RP17, RP27 | mapped | Separate Matter/User/Client/Playbook/Firm memory proposals and confirmations |
| LOOP-MISS-SKILL-001 | P1 | CP00-839 | RP28 | RP18, RP21, RP27 | mapped | Skill Registry, Playbook Manager, version pinning, trust score |
| LOOP-MISS-TOOL-001 | P1 | CP00-814 | RP27 | RP17, RP18, RP21 | mapped | Tool Gateway permission, sandbox, credentials, idempotency, rate limit |
| LOOP-MISS-CONCURRENCY-001 | P1 | CP00-552 | RP18 | RP05, RP06, RP21, RP27 | mapped | Locks, idempotency, parallel DAG conflict policy |
| LOOP-MISS-REGRESSION-001 | P1 | CP00-839 | RP28 | RP18, RP21, RP29 | mapped | Golden cases and regression expectations before deployment/marketplace |
| LOOP-MISS-OBS-001 | P1 | CP00-639 | RP21 | RP18, RP29 | mapped | Metrics for cost, token, success, failure, verifier pass, approval latency |
| LOOP-MISS-PARTIAL-001 | P1 | CP00-552 | RP18 | RP21, RP29 | mapped | Partial result package when budget/verifier/approval stops execution |

## 5. First-Use Entry Points

### 5.1 CP00-177 Entry: Matter Core

Required decision:

- Matter records must expose stable context references for future Loop context building.
- Matter Wiki and Matter Graph must not create autonomous Loop behavior.
- Hidden Matter fields must remain unavailable to future Loop context.

### 5.2 CP00-198 Entry: DMS Core

Required decision:

- DocumentVersion and Citation Ledger must support future verifier source checks.
- Document source lineage must survive redline, email filing, OCR, import, and migration.

### 5.3 CP00-235 Entry: Search OCR And Index

Required decision:

- RetrievalContextPacket must record permission trimming before AI or Loop use.
- Candidate and confirmed knowledge must stay separate.

### 5.4 CP00-515 Entry: AI Governance

Required decision:

- ModelRoutingPolicy and BudgetEnvelope are prerequisites for Loop execution.
- AIJob, Citation, RetrievalScope, and AIApproval are the governance layer for Loop.
- High-risk uncited output must route to verifier/human review or block.

### 5.5 CP00-552 Entry: AI Legal Workflows

Required decision:

- LoopDefinition and LoopRun are core runtime objects.
- Worker and verifier roles are separate.
- DAGPlan is materialized before execution.
- Budget and model route decisions are recorded before model/tool calls.
- Completed state requires verifier pass or approved human exception.

## 6. Validation Anchors

| Validation surface | First expected RP | Purpose |
| --- | --- | --- |
| `loop-harness-overlay:validate` | planning-only | Ensure every Loop overlay requirement has decision and RP anchor |
| `loop-model-routing:validate` | RP17 | Validate route decisions and data boundary policy |
| `loop-budget:validate` | RP17/RP18 | Validate cost/token/time/tool/retry/verifier budget gates |
| `loop-context-permission:validate` | RP17/RP18 | Validate permission-trimmed context packages |
| `loop-worker-verifier:validate` | RP18 | Validate worker/verifier separation and correction loop |
| `loop-dag-plan:validate` | RP18 | Validate bounded DAG, branch audit, and cycle prevention |
| `loop-harness-policy:validate` | RP18/RP21 | Validate goal, model, budget, tool, approval, audit, emergency stop binding |
| `loop-tool-gateway:validate` | RP27 | Validate tool sandbox, credentials, rate limit, idempotency, audit |
| `loop-regression:validate` | RP28 | Validate golden cases and marketplace readiness |

## 7. Completion Criteria

This anchor map is complete when:

1. Every `LOOP-MISS-*` requirement has primary RP, first CP, dependent RPs, and decision.
2. Every P0 requirement has blocking conditions and validation surface.
3. `CP00-145-CP00-176` remains untouched by this planning layer.
4. CP00-515 and CP00-552 have explicit entry decisions.
5. Worker/verifier, DAG, budget, model routing, and harness controls are represented as first-class requirements.
