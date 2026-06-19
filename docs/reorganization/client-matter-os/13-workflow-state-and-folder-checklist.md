# Workflow, State Machines, and Folder Checklist

Status: Proposed
Source: `Law_Firm_OS_TUW_Backlog_v1.0.xlsx`

## End-to-End Workflow

| 단계 | 업무 | 주관 모듈 | 산출물 | 다음 단계 조건 |
| --- | --- | --- | --- | --- |
| 1 | 관계 형성 | CRM | Lead, Activity, Client Touchpoint | Opportunity 생성 가능 |
| 2 | 영업기회 | CRM | Opportunity, Proposal, RFP/Pitch record | IntakeRequest 생성 |
| 3 | 수임검토 요청 | Intake | IntakeRequest | ConflictCheck 실행 |
| 4 | Conflict Check | Intake / Conflict | ConflictCheck, ConflictHit | Conflict decision |
| 5 | Waiver / Risk Approval | Intake | Waiver, Risk Approval | Engagement/FeeTerms 작성 |
| 6 | Engagement / Fee Terms | Intake + Billing | Engagement, FeeTerms | Matter opening 가능 |
| 7 | Matter Opening | Matter | Matter, Team, ACL, DMS workspace | 사건수행 시작 |
| 8 | 사건수행 | Matter + DMS | Task, Deadline, Document, Client Report | Time/Expense 기록 |
| 9 | Time / WIP | Billing | TimeEntry, Expense, WIP | PreBill 생성 |
| 10 | Pre-bill / Invoice | Billing | PreBill, Invoice, TaxInvoice | Payment matching |
| 11 | 수금 / AR | Finance | Payment, AR, JournalExport | Settlement |
| 12 | 정산 | Finance | SettlementRun | Matter profitability 확정 |
| 13 | 종결 | Matter | ClosingRecord, Retention | CRM feedback/cross-sell |
| 14 | 관계확장 | CRM + Analytics | Client review, KeyClientPlan | 관계확장 |

## State Machines

| 객체 | 상태 |
| --- | --- |
| Opportunity | draft, qualified, intake_requested, conflict_pending, proposal_sent, won, lost, declined |
| IntakeRequest | draft, submitted, under_review, conflict_checking, waiver_required, approved, rejected |
| Engagement | draft, client_review, approved, signed, superseded, terminated |
| Matter | opening_pending, open, active, on_hold, closing, closed, archived, legal_hold |
| DocumentVersion | draft, internal_review, client_sent, counterparty_sent, filed, accepted, superseded |
| TimeEntry | draft, submitted, approved, locked, adjusted, written_off |
| PreBill | draft, partner_review, revised, approved, rejected |
| Invoice | draft, approved, issued, sent, partially_paid, paid, credited, cancelled |
| TaxInvoice | pending, issued, transmitted, failed, corrected, voided |
| Payment | imported, unmatched, matched, partially_matched, reversed |
| SettlementRun | draft, locked, approved, posted, reversed |
| AIOutput | generated, candidate, under_review, revised_by_human, confirmed, rejected, superseded |

## Folder Checklist

| 체크 | 폴더 | 필수 문서 |
| --- | --- | --- |
| ☐ | 00 Product Governance & Architecture | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 01 Platform / IAM / Audit | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 02 Party & Relationship Master | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 03 Client Growth / CRM | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 04 Intake / Conflict / Engagement | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 05 Matter Management | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 06 DMS / Email / Knowledge Workspace | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 07 Time / Expense / Billing | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 08 Finance / Payments / Settlement | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 09 Analytics / BI | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 10 AI Governance / Legal Workflows | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 11 Client Portal / Data Room | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 12 Admin / Operations / Commercial Readiness | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 13 HRX People Module | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |
| ☐ | 14 External Integrations / Migration | README.md / owned-objects.md / api-surface.md / permission-boundary.md / audit-events.md / runtime-readiness.md |

## Prohibited Shortcut

Opportunity cannot become Matter directly. The allowed path is Opportunity -> IntakeRequest -> ConflictCheck -> Waiver/Risk Approval -> Engagement/FeeTerms -> MatterOpening.
