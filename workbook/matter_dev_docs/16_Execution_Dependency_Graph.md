# matter Execution Dependency Graph 설계

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Edge 유형

| Edge | 의미 | 예시 |
|---|---|---|
| Dependency Edge | 선행 구현 필요 | Document는 Matter가 있어야 생성 가능 |
| Blocking Edge | 미완료 시 후속작업 차단 | ACL 미완료 시 Portal/AI/Vault export 차단 |
| Parallel Edge | 병렬 가능 | Matter UI와 Party UI는 Core schema 이후 병렬 가능 |
| Conflict Edge | 동시진행 시 충돌 가능 | Document metadata schema와 AI extraction schema 병행 변경 |
| Verification Edge | 검증이 후속조건 | 권한검증 통과 후 Client Portal 개발 |
| Regression Edge | 변경 시 기존 기능 회귀검증 | Issue state 변경 시 Matter Home, AI, Vault 회귀 |
| Escalation Edge | 위험 발생 시 상위검토 | AI 법률결론 후보 발생 시 Governor 검토 |
| Feedback Edge | 사용자피드백 반영 | RFI tracker 사용 후 field 개선 |
| Loop Edge | 반복개선 | AI extraction 실패 → Learning Ledger → prompt/schema 개선 |

## 2. 선행 Node

| Node | 이유 |
|---|---|
| Product Constitution | 기준 없는 구현 방지 |
| Core Object ID System | 모든 관계의 기반 |
| User/Employee Separation | HR 및 권한 충돌 방지 |
| Matter Schema | 시스템 중심 객체 |
| Permission Model | DMS, Portal, AI, HR의 전제 |
| Audit Event Schema | 나중에 소급구현 불가 |
| Document Metadata Schema | DMS, AI, Search, Vault의 기반 |
| Issue State Model | Practice pack의 핵심 |
| Task/Deadline State Model | Workflow의 핵심 |
| AI Output State Model | AI 승인흐름의 기반 |
| Verification Contract Template | TUW 완료기준 통일 |

## 3. 후행 Node

| Node | 후행 이유 |
|---|---|
| AI legal research assistant | source, authority, review queue 선행 필요 |
| Bidirectional Obsidian sync | export/import/diff 안정화 후 |
| Client Portal full release | ACL, projection, audit 선행 필요 |
| Billing automation | activity signal 및 time entry 안정화 후 |
| Clause recommendation | clause library와 knowledge 축적 후 |
| Smart Alerts hard block | Outlook MVP와 policy 안정화 후 |
| HR advanced AI | HR rule engine 및 guardrail 선행 필요 |
| Enterprise DLP | core data classification 이후 |

## 4. 주요 Dependency Chain

Chain A: Product Constitution → Core Object → ACL → Audit → Portal/AI/Vault.

Chain B: Matter → Document → SharePoint file_ref → Search Index → AI RAG → Legal QC.

Chain C: Outlook Add-in shell → Auth → Matter lookup → Email metadata → Email filing → Attachment saving → Audit → AI candidates.

Chain D: User/Employee separation → HR sensitivity → HR Document → HR Rule Engine → HR Assistant → HR Risk Copilot.

Chain E: Issue object → Issue relation → M&A RFI/DD → Closing checklist → Matter Closing Knowledge Pack.

## 5. Regression Map

| 변경 | 회귀검증 대상 |
|---|---|
| Matter state 변경 | Matter Home, Work Queue, Portal, Analytics |
| Document metadata 변경 | DMS, Search, AI extraction, Vault export, QC |
| Permission policy 변경 | UI, API, Search, Portal, AI, Vault, HR |
| Issue state 변경 | Issue Ledger, Matter Home, Practice Pack, Knowledge Pack |
| Employee model 변경 | HR, User/Role, Billing, Workload, Matter team |
| AI prompt/routing 변경 | AI output quality, guardrail, audit, regression set |
