# Full TUW Catalog

Status: Proposed
Source: `Law_Firm_OS_TUW_Backlog_v1.0.xlsx`

This catalog carries the full 198-TUW goal. Individual implementation PRs should cite the TUW IDs they satisfy and link their validation evidence.

## Gate Summary

| Gate | TUW count | First TUW | Last TUW |
| --- | --- | --- | --- |
| G0 | 10 | LFOS-G0-W00-T001 현재 폴더 inventory 작성 | LFOS-G0-W00-T010 G0 closeout report 작성 |
| G1 | 16 | LFOS-G1-W01-T001 tenant boundary middleware 설계 | LFOS-G1-W01-T016 G1 trust foundation closeout |
| G2 | 14 | LFOS-G2-W02-T001 Party schema 구현 | LFOS-G2-W02-T014 G2 master data closeout |
| G3 | 26 | LFOS-G3-W03-T001 Lead schema 구현 | LFOS-G3-W04-T014 G3 Intake closeout |
| G4 | 30 | LFOS-G4-W05-T001 Matter schema runtime 구현 | LFOS-G4-W06-T016 G4 DMS closeout |
| G5 | 30 | LFOS-G5-W07-T001 TimeEntry schema | LFOS-G5-W08-T014 G5 Finance closeout |
| G6 | 32 | LFOS-G6-W09-T001 analytics event contract | LFOS-G6-W11-T010 G6 Portal closeout |
| G7 | 40 | LFOS-G7-W12-T001 tenant admin settings | LFOS-G7-W15-T012 production readiness review |

## TUW Rows

| TUW ID | Gate | Workstream Code | Workstream Name | Task No | 작업명 | 산출물 | 테스트/완료증거 | Status | Owner | Sprint | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LFOS-G0-W00-T001 | G0 | W00 | Product Governance & Reorganization | T001 | 현재 폴더 inventory 작성 | current-folder-inventory.md | 모든 기존 폴더·파일 owner 임시 지정 | Planned |  |  |  |
| LFOS-G0-W00-T002 | G0 | W00 | Product Governance & Reorganization | T002 | package inventory 작성 | package-inventory.md | 모든 package의 descriptor/runtime 상태 표시 | Planned |  |  |  |
| LFOS-G0-W00-T003 | G0 | W00 | Product Governance & Reorganization | T003 | contract inventory 작성 | contract-inventory.md | contract별 schema version 및 owner 표시 | Planned |  |  |  |
| LFOS-G0-W00-T004 | G0 | W00 | Product Governance & Reorganization | T004 | canonical glossary 초안 작성 | canonical-glossary.md | Client/Party/Matter/Contact 용어 충돌 제거 | Planned |  |  |  |
| LFOS-G0-W00-T005 | G0 | W00 | Product Governance & Reorganization | T005 | object ownership matrix 작성 | canonical-object-ownership.md | 중복 금지 객체 owner 지정 | Planned |  |  |  |
| LFOS-G0-W00-T006 | G0 | W00 | Product Governance & Reorganization | T006 | target folder skeleton 생성 | 00~14 폴더 | 각 폴더 README 존재 | Planned |  |  |  |
| LFOS-G0-W00-T007 | G0 | W00 | Product Governance & Reorganization | T007 | module boundary map 작성 | module-boundary.md | CRM/Intake/Matter/Billing 경계표 승인 | Planned |  |  |  |
| LFOS-G0-W00-T008 | G0 | W00 | Product Governance & Reorganization | T008 | runtime readiness badge 체계 정의 | runtime-readiness-standard.md | R0~R6 badge 적용 가능 | Planned |  |  |  |
| LFOS-G0-W00-T009 | G0 | W00 | Product Governance & Reorganization | T009 | migration manifest template 작성 | migration-manifest.csv | 이동 전/후 경로, owner, 상태 컬럼 포함 | Planned |  |  |  |
| LFOS-G0-W00-T010 | G0 | W00 | Product Governance & Reorganization | T010 | G0 closeout report 작성 | g0-closeout-report.md | PM/Tech Lead 승인 | Planned |  |  |  |
| LFOS-G1-W01-T001 | G1 | W01 | Platform / IAM / Audit | T001 | tenant boundary middleware 설계 | tenant-boundary-spec.md | tenant_id 누락 시 fail-closed test | Planned |  |  |  |
| LFOS-G1-W01-T002 | G1 | W01 | Platform / IAM / Audit | T002 | actor context schema 구현 | ActorContext model/API | actor 누락 시 401/403 | Planned |  |  |  |
| LFOS-G1-W01-T003 | G1 | W01 | Platform / IAM / Audit | T003 | permission context persistence 설계 | PermissionContext schema | 헤더 주입 방식 의존 제거 계획 | Planned |  |  |  |
| LFOS-G1-W01-T004 | G1 | W01 | Platform / IAM / Audit | T004 | durable audit event schema 구현 | AuditEvent table/collection | append-only migration test | Planned |  |  |  |
| LFOS-G1-W01-T005 | G1 | W01 | Platform / IAM / Audit | T005 | audit middleware 구현 | API middleware | write route audit append 필수 test | Planned |  |  |  |
| LFOS-G1-W01-T006 | G1 | W01 | Platform / IAM / Audit | T006 | sensitive read audit 구현 | read audit hook | document/conflict/billing read event test | Planned |  |  |  |
| LFOS-G1-W01-T007 | G1 | W01 | Platform / IAM / Audit | T007 | permission evaluator API wrapper | /permissions/evaluate | allow/deny/review/approval test | Planned |  |  |  |
| LFOS-G1-W01-T008 | G1 | W01 | Platform / IAM / Audit | T008 | deny-over-allow regression test | permission tests | deny rule 우선 test | Planned |  |  |  |
| LFOS-G1-W01-T009 | G1 | W01 | Platform / IAM / Audit | T009 | object ACL baseline 구현 | ObjectACL model | object allow/deny test | Planned |  |  |  |
| LFOS-G1-W01-T010 | G1 | W01 | Platform / IAM / Audit | T010 | ethical wall model 구현 | EthicalWall model | blocked user cannot list matter | Planned |  |  |  |
| LFOS-G1-W01-T011 | G1 | W01 | Platform / IAM / Audit | T011 | legal hold model 구현 | LegalHold model | held document delete blocked | Planned |  |  |  |
| LFOS-G1-W01-T012 | G1 | W01 | Platform / IAM / Audit | T012 | break-glass flow 설계 | BreakGlassAccess model | 사유/승인/audit 필수 test | Planned |  |  |  |
| LFOS-G1-W01-T013 | G1 | W01 | Platform / IAM / Audit | T013 | audit hash-chain 검증 구현 | verify audit chain job | tamper detection test | Planned |  |  |  |
| LFOS-G1-W01-T014 | G1 | W01 | Platform / IAM / Audit | T014 | audit export API 구현 | /audit/events/export | tenant-scoped export test | Planned |  |  |  |
| LFOS-G1-W01-T015 | G1 | W01 | Platform / IAM / Audit | T015 | admin permission simulator | simulator UI/API | user X can/cannot see object Y | Planned |  |  |  |
| LFOS-G1-W01-T016 | G1 | W01 | Platform / IAM / Audit | T016 | G1 trust foundation closeout | G1 report | durable audit + permission gate evidence | Planned |  |  |  |
| LFOS-G2-W02-T001 | G2 | W02 | Party & Relationship Master | T001 | Party schema 구현 | Party model | create/read/update audit test | Planned |  |  |  |
| LFOS-G2-W02-T002 | G2 | W02 | Party & Relationship Master | T002 | Person schema 구현 | Person model | duplicate email warning test | Planned |  |  |  |
| LFOS-G2-W02-T003 | G2 | W02 | Party & Relationship Master | T003 | Organization schema 구현 | Organization model | business number uniqueness test | Planned |  |  |  |
| LFOS-G2-W02-T004 | G2 | W02 | Party & Relationship Master | T004 | PartyAlias 구현 | alias model | 한글/영문/과거상호 search test | Planned |  |  |  |
| LFOS-G2-W02-T005 | G2 | W02 | Party & Relationship Master | T005 | PartyIdentifier 구현 | identifier model | 사업자번호/LEI/registration ID test | Planned |  |  |  |
| LFOS-G2-W02-T006 | G2 | W02 | Party & Relationship Master | T006 | ClientGroup 구현 | ClientGroup model | group membership test | Planned |  |  |  |
| LFOS-G2-W02-T007 | G2 | W02 | Party & Relationship Master | T007 | Relationship graph 구현 | Relationship model | direction validation test | Planned |  |  |  |
| LFOS-G2-W02-T008 | G2 | W02 | Party & Relationship Master | T008 | ContactPoint 구현 | ContactPoint model | primary/verified flag test | Planned |  |  |  |
| LFOS-G2-W02-T009 | G2 | W02 | Party & Relationship Master | T009 | BillingProfile 구현 | BillingProfile model | legal client vs billing client test | Planned |  |  |  |
| LFOS-G2-W02-T010 | G2 | W02 | Party & Relationship Master | T010 | duplicate detection service | duplicate review queue | similar name candidate test | Planned |  |  |  |
| LFOS-G2-W02-T011 | G2 | W02 | Party & Relationship Master | T011 | relationship search API | /relationships/search | related party lookup test | Planned |  |  |  |
| LFOS-G2-W02-T012 | G2 | W02 | Party & Relationship Master | T012 | Party merge/split workflow | merge/split service | merge audit + rollback evidence | Planned |  |  |  |
| LFOS-G2-W02-T013 | G2 | W02 | Party & Relationship Master | T013 | master data UI 연결 | Party search/profile UI | denied/review state test | Planned |  |  |  |
| LFOS-G2-W02-T014 | G2 | W02 | Party & Relationship Master | T014 | G2 master data closeout | G2 report | CRM/Matter/Billing 참조가능 evidence | Planned |  |  |  |
| LFOS-G3-W03-T001 | G3 | W03 | Client Growth / CRM | T001 | Lead schema 구현 | Lead model | Party reference required test | Planned |  |  |  |
| LFOS-G3-W03-T002 | G3 | W03 | Client Growth / CRM | T002 | Opportunity schema 구현 | Opportunity model | Matter 직접참조 금지 test | Planned |  |  |  |
| LFOS-G3-W03-T003 | G3 | W03 | Client Growth / CRM | T003 | CRMActivity schema 구현 | Activity model | confidential flag test | Planned |  |  |  |
| LFOS-G3-W03-T004 | G3 | W03 | Client Growth / CRM | T004 | Proposal schema 구현 | Proposal model | fee estimate ref test | Planned |  |  |  |
| LFOS-G3-W03-T005 | G3 | W03 | Client Growth / CRM | T005 | Referral schema 구현 | Referral model | referral source Party ref test | Planned |  |  |  |
| LFOS-G3-W03-T006 | G3 | W03 | Client Growth / CRM | T006 | Campaign schema 구현 | Campaign model | opt-in/out contact test | Planned |  |  |  |
| LFOS-G3-W03-T007 | G3 | W03 | Client Growth / CRM | T007 | Opportunity pipeline API | /crm/opportunities | stage transition test | Planned |  |  |  |
| LFOS-G3-W03-T008 | G3 | W03 | Client Growth / CRM | T008 | CRM activity permission trimming | CRM service | confidential activity denied test | Planned |  |  |  |
| LFOS-G3-W03-T009 | G3 | W03 | Client Growth / CRM | T009 | CRM summary screen | client/opportunity UI | no conflict memo/billing detail test | Planned |  |  |  |
| LFOS-G3-W03-T010 | G3 | W03 | Client Growth / CRM | T010 | Opportunity-to-Intake command | conversion API | Matter creation blocked test | Planned |  |  |  |
| LFOS-G3-W03-T011 | G3 | W03 | Client Growth / CRM | T011 | key client plan view | KeyClientPlan UI | AR/detail masking test | Planned |  |  |  |
| LFOS-G3-W03-T012 | G3 | W03 | Client Growth / CRM | T012 | CRM G3 partial closeout | CRM evidence report | opportunity → intake only evidence | Planned |  |  |  |
| LFOS-G3-W04-T001 | G3 | W04 | Intake / Conflict / Engagement | T001 | IntakeRequest schema 구현 | IntakeRequest model | required parties test | Planned |  |  |  |
| LFOS-G3-W04-T002 | G3 | W04 | Intake / Conflict / Engagement | T002 | ConflictCheck schema 구현 | ConflictCheck model | snapshot immutability test | Planned |  |  |  |
| LFOS-G3-W04-T003 | G3 | W04 | Intake / Conflict / Engagement | T003 | ConflictHit schema 구현 | ConflictHit model | hit source audit test | Planned |  |  |  |
| LFOS-G3-W04-T004 | G3 | W04 | Intake / Conflict / Engagement | T004 | conflict search service | search service | alias/relationship/former matter test | Planned |  |  |  |
| LFOS-G3-W04-T005 | G3 | W04 | Intake / Conflict / Engagement | T005 | conflict decision workflow | decision state machine | reviewer required test | Planned |  |  |  |
| LFOS-G3-W04-T006 | G3 | W04 | Intake / Conflict / Engagement | T006 | waiver model 구현 | Waiver model | consent document required test | Planned |  |  |  |
| LFOS-G3-W04-T007 | G3 | W04 | Intake / Conflict / Engagement | T007 | engagement model 구현 | Engagement model | scope/legal client required test | Planned |  |  |  |
| LFOS-G3-W04-T008 | G3 | W04 | Intake / Conflict / Engagement | T008 | FeeTerms model 구현 | FeeTerms model | hourly/fixed/cap/retainer test | Planned |  |  |  |
| LFOS-G3-W04-T009 | G3 | W04 | Intake / Conflict / Engagement | T009 | risk approval queue | approval UI/API | approval audit test | Planned |  |  |  |
| LFOS-G3-W04-T010 | G3 | W04 | Intake / Conflict / Engagement | T010 | Intake-to-Matter clearance token | clearance object | expired/stale token blocked | Planned |  |  |  |
| LFOS-G3-W04-T011 | G3 | W04 | Intake / Conflict / Engagement | T011 | conflict memo permission boundary | ACL rule | CRM user cannot view memo | Planned |  |  |  |
| LFOS-G3-W04-T012 | G3 | W04 | Intake / Conflict / Engagement | T012 | waiver approval UI | waiver screen | denied/review state test | Planned |  |  |  |
| LFOS-G3-W04-T013 | G3 | W04 | Intake / Conflict / Engagement | T013 | engagement approval UI | engagement screen | signed/approved state test | Planned |  |  |  |
| LFOS-G3-W04-T014 | G3 | W04 | Intake / Conflict / Engagement | T014 | G3 Intake closeout | G3 report | Opportunity cannot bypass Intake | Planned |  |  |  |
| LFOS-G4-W05-T001 | G4 | W05 | Matter Management | T001 | Matter schema runtime 구현 | Matter model | clearance required test | Planned |  |  |  |
| LFOS-G4-W05-T002 | G4 | W05 | Matter Management | T002 | Matter number service | matter numbering | idempotency duplicate test | Planned |  |  |  |
| LFOS-G4-W05-T003 | G4 | W05 | Matter Management | T003 | Matter opening transaction | opening service | ACL/DMS/Billing refs atomic test | Planned |  |  |  |
| LFOS-G4-W05-T004 | G4 | W05 | Matter Management | T004 | MatterMember schema | MatterMember model | member role permission test | Planned |  |  |  |
| LFOS-G4-W05-T005 | G4 | W05 | Matter Management | T005 | MatterTeam UI | team management screen | add/remove audit test | Planned |  |  |  |
| LFOS-G4-W05-T006 | G4 | W05 | Matter Management | T006 | MatterTask schema/API | task API | status transition test | Planned |  |  |  |
| LFOS-G4-W05-T007 | G4 | W05 | Matter Management | T007 | MatterCalendarEvent schema/API | calendar API | deadline change audit test | Planned |  |  |  |
| LFOS-G4-W05-T008 | G4 | W05 | Matter Management | T008 | critical deadline dual control | deadline workflow | 2-person confirmation test | Planned |  |  |  |
| LFOS-G4-W05-T009 | G4 | W05 | Matter Management | T009 | MatterStatusHistory | status history | immutable history test | Planned |  |  |  |
| LFOS-G4-W05-T010 | G4 | W05 | Matter Management | T010 | Client report object | MatterReport model | portal projection safe test | Planned |  |  |  |
| LFOS-G4-W05-T011 | G4 | W05 | Matter Management | T011 | Matter closing checklist | ClosingRecord model | WIP/AR open blocks closing | Planned |  |  |  |
| LFOS-G4-W05-T012 | G4 | W05 | Matter Management | T012 | silent matter support | visibility rule | unauthorized list omission test | Planned |  |  |  |
| LFOS-G4-W05-T013 | G4 | W05 | Matter Management | T013 | Matter dashboard UI | matter list/detail | ACL trimming test | Planned |  |  |  |
| LFOS-G4-W05-T014 | G4 | W05 | Matter Management | T014 | G4 Matter closeout | G4 matter report | Matter runtime evidence | Planned |  |  |  |
| LFOS-G4-W06-T001 | G4 | W06 | DMS / Email / Knowledge Workspace | T001 | DMS workspace schema | DmsWorkspace model | Matter required test | Planned |  |  |  |
| LFOS-G4-W06-T002 | G4 | W06 | DMS / Email / Knowledge Workspace | T002 | Folder schema/API | folder API | path permission test | Planned |  |  |  |
| LFOS-G4-W06-T003 | G4 | W06 | DMS / Email / Knowledge Workspace | T003 | Document schema/API | document API | upload audit test | Planned |  |  |  |
| LFOS-G4-W06-T004 | G4 | W06 | DMS / Email / Knowledge Workspace | T004 | DocumentVersion schema/API | version API | immutable version test | Planned |  |  |  |
| LFOS-G4-W06-T005 | G4 | W06 | DMS / Email / Knowledge Workspace | T005 | FileObject storage abstraction | storage adapter | no raw path leak test | Planned |  |  |  |
| LFOS-G4-W06-T006 | G4 | W06 | DMS / Email / Knowledge Workspace | T006 | document hash/lineage | lineage service | hash mismatch detection test | Planned |  |  |  |
| LFOS-G4-W06-T007 | G4 | W06 | DMS / Email / Knowledge Workspace | T007 | check-in/check-out | lock workflow | concurrent edit test | Planned |  |  |  |
| LFOS-G4-W06-T008 | G4 | W06 | DMS / Email / Knowledge Workspace | T008 | privilege label model | PrivilegeLabel | AI/search exclusion test | Planned |  |  |  |
| LFOS-G4-W06-T009 | G4 | W06 | DMS / Email / Knowledge Workspace | T009 | redaction metadata | Redaction model | redacted export test | Planned |  |  |  |
| LFOS-G4-W06-T010 | G4 | W06 | DMS / Email / Knowledge Workspace | T010 | secure link sharing | SecureLink | expiry/MFA/watermark test | Planned |  |  |  |
| LFOS-G4-W06-T011 | G4 | W06 | DMS / Email / Knowledge Workspace | T011 | email filing schema | EmailThread/Message | Matter filing test | Planned |  |  |  |
| LFOS-G4-W06-T012 | G4 | W06 | DMS / Email / Knowledge Workspace | T012 | Outlook filing placeholder API | email filing API | no credential leak test | Planned |  |  |  |
| LFOS-G4-W06-T013 | G4 | W06 | DMS / Email / Knowledge Workspace | T013 | search index ACL | permission-aware index | unauthorized search result absent | Planned |  |  |  |
| LFOS-G4-W06-T014 | G4 | W06 | DMS / Email / Knowledge Workspace | T014 | DMS workspace UI | document UI | version/privilege display test | Planned |  |  |  |
| LFOS-G4-W06-T015 | G4 | W06 | DMS / Email / Knowledge Workspace | T015 | DMS audit coverage | audit evidence | view/download/share events | Planned |  |  |  |
| LFOS-G4-W06-T016 | G4 | W06 | DMS / Email / Knowledge Workspace | T016 | G4 DMS closeout | G4 DMS report | DMS runtime evidence | Planned |  |  |  |
| LFOS-G5-W07-T001 | G5 | W07 | Time / Expense / Billing | T001 | TimeEntry schema | TimeEntry model | Matter required test | Planned |  |  |  |
| LFOS-G5-W07-T002 | G5 | W07 | Time / Expense / Billing | T002 | RateCard schema | RateCard model | effective date test | Planned |  |  |  |
| LFOS-G5-W07-T003 | G5 | W07 | Time / Expense / Billing | T003 | FeeArrangement integration | FeeTerms→Billing mapping | rate override test | Planned |  |  |  |
| LFOS-G5-W07-T004 | G5 | W07 | Time / Expense / Billing | T004 | time entry API | /time-entries | submit/approve/lock test | Planned |  |  |  |
| LFOS-G5-W07-T005 | G5 | W07 | Time / Expense / Billing | T005 | expense schema/API | Expense model/API | evidence document test | Planned |  |  |  |
| LFOS-G5-W07-T006 | G5 | W07 | Time / Expense / Billing | T006 | disbursement schema/API | Disbursement model/API | billable flag test | Planned |  |  |  |
| LFOS-G5-W07-T007 | G5 | W07 | Time / Expense / Billing | T007 | WIP generation service | WIP model | approved time creates WIP | Planned |  |  |  |
| LFOS-G5-W07-T008 | G5 | W07 | Time / Expense / Billing | T008 | WIP lock snapshot | WIP snapshot | prebill snapshot immutable | Planned |  |  |  |
| LFOS-G5-W07-T009 | G5 | W07 | Time / Expense / Billing | T009 | PreBill schema/API | PreBill model/API | partner review test | Planned |  |  |  |
| LFOS-G5-W07-T010 | G5 | W07 | Time / Expense / Billing | T010 | write-down/write-off workflow | adjustment model | approval required test | Planned |  |  |  |
| LFOS-G5-W07-T011 | G5 | W07 | Time / Expense / Billing | T011 | Invoice schema/API | Invoice model/API | idempotent issue test | Planned |  |  |  |
| LFOS-G5-W07-T012 | G5 | W07 | Time / Expense / Billing | T012 | Invoice line generation | invoice line service | WIP-to-invoice reconciliation | Planned |  |  |  |
| LFOS-G5-W07-T013 | G5 | W07 | Time / Expense / Billing | T013 | TaxInvoice schema/API | TaxInvoice model/API | issue/transmit/fail test | Planned |  |  |  |
| LFOS-G5-W07-T014 | G5 | W07 | Time / Expense / Billing | T014 | invoice correction workflow | credit/revised invoice | direct edit blocked test | Planned |  |  |  |
| LFOS-G5-W07-T015 | G5 | W07 | Time / Expense / Billing | T015 | Billing UI | time/WIP/prebill/invoice UI | role-based detail masking | Planned |  |  |  |
| LFOS-G5-W07-T016 | G5 | W07 | Time / Expense / Billing | T016 | G5 Billing closeout | Billing report | time-to-invoice evidence | Planned |  |  |  |
| LFOS-G5-W08-T001 | G5 | W08 | Finance / Payments / Settlement | T001 | Payment schema | Payment model | imported/unmatched state test | Planned |  |  |  |
| LFOS-G5-W08-T002 | G5 | W08 | Finance / Payments / Settlement | T002 | payment import API | payment feed API | duplicate import idempotency | Planned |  |  |  |
| LFOS-G5-W08-T003 | G5 | W08 | Finance / Payments / Settlement | T003 | payment matching service | match service | partial match test | Planned |  |  |  |
| LFOS-G5-W08-T004 | G5 | W08 | Finance / Payments / Settlement | T004 | ARBalance model | AR model | invoice issue creates AR | Planned |  |  |  |
| LFOS-G5-W08-T005 | G5 | W08 | Finance / Payments / Settlement | T005 | AR aging read model | aging model/API | bucket calculation test | Planned |  |  |  |
| LFOS-G5-W08-T006 | G5 | W08 | Finance / Payments / Settlement | T006 | JournalEntry model | JournalEntry | balanced entry test | Planned |  |  |  |
| LFOS-G5-W08-T007 | G5 | W08 | Finance / Payments / Settlement | T007 | accounting export API | export service | export audit test | Planned |  |  |  |
| LFOS-G5-W08-T008 | G5 | W08 | Finance / Payments / Settlement | T008 | VAT/tax export | tax export service | period lock test | Planned |  |  |  |
| LFOS-G5-W08-T009 | G5 | W08 | Finance / Payments / Settlement | T009 | SettlementRun model | SettlementRun | run lock test | Planned |  |  |  |
| LFOS-G5-W08-T010 | G5 | W08 | Finance / Payments / Settlement | T010 | OriginationCredit model | origination | allocation sum test | Planned |  |  |  |
| LFOS-G5-W08-T011 | G5 | W08 | Finance / Payments / Settlement | T011 | WorkingCredit model | working credit | role allocation test | Planned |  |  |  |
| LFOS-G5-W08-T012 | G5 | W08 | Finance / Payments / Settlement | T012 | settlement approval workflow | settlement service | posted run direct edit blocked | Planned |  |  |  |
| LFOS-G5-W08-T013 | G5 | W08 | Finance / Payments / Settlement | T013 | Finance UI | payment/AR/export/settlement UI | permission masking test | Planned |  |  |  |
| LFOS-G5-W08-T014 | G5 | W08 | Finance / Payments / Settlement | T014 | G5 Finance closeout | Finance report | invoice-to-payment evidence | Planned |  |  |  |
| LFOS-G6-W09-T001 | G6 | W09 | Analytics / BI | T001 | analytics event contract | AnalyticsEvent model | no source mutation test | Planned |  |  |  |
| LFOS-G6-W09-T002 | G6 | W09 | Analytics / BI | T002 | matter profitability read model | MatterProfitability | invoice/payment/time join test | Planned |  |  |  |
| LFOS-G6-W09-T003 | G6 | W09 | Analytics / BI | T003 | client profitability read model | ClientProfitability | client group aggregation test | Planned |  |  |  |
| LFOS-G6-W09-T004 | G6 | W09 | Analytics / BI | T004 | utilization metric | UtilizationMetric | capacity denominator test | Planned |  |  |  |
| LFOS-G6-W09-T005 | G6 | W09 | Analytics / BI | T005 | realization metric | RealizationMetric | billed vs standard value test | Planned |  |  |  |
| LFOS-G6-W09-T006 | G6 | W09 | Analytics / BI | T006 | AR aging dashboard | AR Aging UI | finance permission test | Planned |  |  |  |
| LFOS-G6-W09-T007 | G6 | W09 | Analytics / BI | T007 | client health dashboard | ClientHealth UI | conflict/matter detail omission | Planned |  |  |  |
| LFOS-G6-W09-T008 | G6 | W09 | Analytics / BI | T008 | practice P&L dashboard | Practice P&L | role-based visibility test | Planned |  |  |  |
| LFOS-G6-W09-T009 | G6 | W09 | Analytics / BI | T009 | analytics export control | export service | export audit + masking test | Planned |  |  |  |
| LFOS-G6-W09-T010 | G6 | W09 | Analytics / BI | T010 | G6 Analytics closeout | Analytics report | read-model only evidence | Planned |  |  |  |
| LFOS-G6-W10-T001 | G6 | W10 | AI Governance / Legal Workflows | T001 | AI policy schema | ModelPolicy | matter sensitivity routing test | Planned |  |  |  |
| LFOS-G6-W10-T002 | G6 | W10 | AI Governance / Legal Workflows | T002 | RetrievalRequest schema | retrieval model | Matter required test | Planned |  |  |  |
| LFOS-G6-W10-T003 | G6 | W10 | AI Governance / Legal Workflows | T003 | permission-aware retrieval service | retrieval API | unauthorized doc not retrieved | Planned |  |  |  |
| LFOS-G6-W10-T004 | G6 | W10 | AI Governance / Legal Workflows | T004 | PromptLog schema | PromptLog | prompt audit test | Planned |  |  |  |
| LFOS-G6-W10-T005 | G6 | W10 | AI Governance / Legal Workflows | T005 | AIOutput schema | AIOutput | candidate default state test | Planned |  |  |  |
| LFOS-G6-W10-T006 | G6 | W10 | AI Governance / Legal Workflows | T006 | citation ledger | Citation model | citation required for confirm | Planned |  |  |  |
| LFOS-G6-W10-T007 | G6 | W10 | AI Governance / Legal Workflows | T007 | human review queue | review UI/API | confirm/reject audit test | Planned |  |  |  |
| LFOS-G6-W10-T008 | G6 | W10 | AI Governance / Legal Workflows | T008 | AI disable switch | policy switch | dark launch off test | Planned |  |  |  |
| LFOS-G6-W10-T009 | G6 | W10 | AI Governance / Legal Workflows | T009 | legal workflow model | Workflow/Step | human approval step test | Planned |  |  |  |
| LFOS-G6-W10-T010 | G6 | W10 | AI Governance / Legal Workflows | T010 | workflow builder UI | workflow UI | no auto-final legal decision | Planned |  |  |  |
| LFOS-G6-W10-T011 | G6 | W10 | AI Governance / Legal Workflows | T011 | AI output export control | export service | privilege label inheritance | Planned |  |  |  |
| LFOS-G6-W10-T012 | G6 | W10 | AI Governance / Legal Workflows | T012 | G6 AI closeout | AI Governance report | AI cannot bypass ACL evidence | Planned |  |  |  |
| LFOS-G6-W11-T001 | G6 | W11 | Client Portal / Data Room | T001 | ExternalUser schema | ExternalUser | User/Employee separation test | Planned |  |  |  |
| LFOS-G6-W11-T002 | G6 | W11 | Client Portal / Data Room | T002 | PortalMatterProjection | projection model | internal memo excluded test | Planned |  |  |  |
| LFOS-G6-W11-T003 | G6 | W11 | Client Portal / Data Room | T003 | external ACL model | ExternalACL | shared-only access test | Planned |  |  |  |
| LFOS-G6-W11-T004 | G6 | W11 | Client Portal / Data Room | T004 | RFIRequest schema/API | RFI API | due date/status test | Planned |  |  |  |
| LFOS-G6-W11-T005 | G6 | W11 | Client Portal / Data Room | T005 | RFIResponse upload flow | response API | upload virus/permission placeholder | Planned |  |  |  |
| LFOS-G6-W11-T006 | G6 | W11 | Client Portal / Data Room | T006 | client approval flow | approval API | approval audit test | Planned |  |  |  |
| LFOS-G6-W11-T007 | G6 | W11 | Client Portal / Data Room | T007 | secure link viewer | portal viewer | expiry/watermark/MFA test | Planned |  |  |  |
| LFOS-G6-W11-T008 | G6 | W11 | Client Portal / Data Room | T008 | DataRoom schema/API | DataRoom | room-level ACL test | Planned |  |  |  |
| LFOS-G6-W11-T009 | G6 | W11 | Client Portal / Data Room | T009 | portal audit coverage | audit events | external view/upload events | Planned |  |  |  |
| LFOS-G6-W11-T010 | G6 | W11 | Client Portal / Data Room | T010 | G6 Portal closeout | Portal report | no internal data exposure evidence | Planned |  |  |  |
| LFOS-G7-W12-T001 | G7 | W12 | Admin / Operations / Commercial Readiness | T001 | tenant admin settings | settings API/UI | admin permission test | Planned |  |  |  |
| LFOS-G7-W12-T002 | G7 | W12 | Admin / Operations / Commercial Readiness | T002 | plan/usage model | CustomerPlan | plan change audit test | Planned |  |  |  |
| LFOS-G7-W12-T003 | G7 | W12 | Admin / Operations / Commercial Readiness | T003 | observability baseline | metrics/logging | route latency dashboard | Planned |  |  |  |
| LFOS-G7-W12-T004 | G7 | W12 | Admin / Operations / Commercial Readiness | T004 | incident runbook model | IncidentRunbook | incident lifecycle test | Planned |  |  |  |
| LFOS-G7-W12-T005 | G7 | W12 | Admin / Operations / Commercial Readiness | T005 | release candidate model | ReleaseCandidate | approval required test | Planned |  |  |  |
| LFOS-G7-W12-T006 | G7 | W12 | Admin / Operations / Commercial Readiness | T006 | deployment run record | DeploymentRun | rollback record test | Planned |  |  |  |
| LFOS-G7-W12-T007 | G7 | W12 | Admin / Operations / Commercial Readiness | T007 | compliance report generator | compliance evidence pack | SOC2/ISMS-P evidence checklist | Planned |  |  |  |
| LFOS-G7-W12-T008 | G7 | W12 | Admin / Operations / Commercial Readiness | T008 | admin audit viewer | audit admin UI | tenant-scoped query test | Planned |  |  |  |
| LFOS-G7-W12-T009 | G7 | W12 | Admin / Operations / Commercial Readiness | T009 | operations dashboard | ops UI | no customer data leak test | Planned |  |  |  |
| LFOS-G7-W12-T010 | G7 | W12 | Admin / Operations / Commercial Readiness | T010 | G7 Ops closeout | Ops readiness report | release readiness evidence | Planned |  |  |  |
| LFOS-G7-W13-T001 | G7 | W13 | HRX People Module | T001 | User/Employee separation spec | separation document | no conflation review | Planned |  |  |  |
| LFOS-G7-W13-T002 | G7 | W13 | HRX People Module | T002 | Employee schema | Employee model | User ref optional/controlled | Planned |  |  |  |
| LFOS-G7-W13-T003 | G7 | W13 | HRX People Module | T003 | capacity profile | CapacityProfile | utilization denominator test | Planned |  |  |  |
| LFOS-G7-W13-T004 | G7 | W13 | HRX People Module | T004 | workload read model | Workload model | matter/time aggregation test | Planned |  |  |  |
| LFOS-G7-W13-T005 | G7 | W13 | HRX People Module | T005 | HR document guardrail | HRDocument ACL | non-HR denied test | Planned |  |  |  |
| LFOS-G7-W13-T006 | G7 | W13 | HRX People Module | T006 | evaluation access control | EvaluationRecord ACL | audit on read test | Planned |  |  |  |
| LFOS-G7-W13-T007 | G7 | W13 | HRX People Module | T007 | candidate data separation | Candidate model | CRM/Party contamination test | Planned |  |  |  |
| LFOS-G7-W13-T008 | G7 | W13 | HRX People Module | T008 | HRX closeout | HRX report | HR guardrail evidence | Planned |  |  |  |
| LFOS-G7-W14-T001 | G7 | W14 | External Integrations / Migration | T001 | connector registry | IntegrationConnection | no credential exposure test | Planned |  |  |  |
| LFOS-G7-W14-T002 | G7 | W14 | External Integrations / Migration | T002 | credential reference model | CredentialRef | secret not returned test | Planned |  |  |  |
| LFOS-G7-W14-T003 | G7 | W14 | External Integrations / Migration | T003 | sync job model | SyncJob | retry/idempotency test | Planned |  |  |  |
| LFOS-G7-W14-T004 | G7 | W14 | External Integrations / Migration | T004 | sync cursor model | SyncCursor | resumable sync test | Planned |  |  |  |
| LFOS-G7-W14-T005 | G7 | W14 | External Integrations / Migration | T005 | reconciliation run | ReconciliationRun | mismatch report test | Planned |  |  |  |
| LFOS-G7-W14-T006 | G7 | W14 | External Integrations / Migration | T006 | migration batch model | MigrationBatch | import audit test | Planned |  |  |  |
| LFOS-G7-W14-T007 | G7 | W14 | External Integrations / Migration | T007 | import validation framework | import validator | duplicate Party detection | Planned |  |  |  |
| LFOS-G7-W14-T008 | G7 | W14 | External Integrations / Migration | T008 | accounting connector export | WEHAGO/Douzone export placeholder | human review before export | Planned |  |  |  |
| LFOS-G7-W14-T009 | G7 | W14 | External Integrations / Migration | T009 | migration dashboard | migration UI | failed row review test | Planned |  |  |  |
| LFOS-G7-W14-T010 | G7 | W14 | External Integrations / Migration | T010 | migration closeout | migration report | cutover readiness evidence | Planned |  |  |  |
| LFOS-G7-W15-T001 | G7 | W15 | QA / Security / Release Engineering | T001 | test strategy 작성 | test-strategy.md | PM/QA 승인 | Planned |  |  |  |
| LFOS-G7-W15-T002 | G7 | W15 | QA / Security / Release Engineering | T002 | unit test baseline | unit test suite | coverage threshold | Planned |  |  |  |
| LFOS-G7-W15-T003 | G7 | W15 | QA / Security / Release Engineering | T003 | integration test baseline | integration tests | key workflows pass | Planned |  |  |  |
| LFOS-G7-W15-T004 | G7 | W15 | QA / Security / Release Engineering | T004 | permission negative tests | ACL/deny tests | unauthorized access blocked | Planned |  |  |  |
| LFOS-G7-W15-T005 | G7 | W15 | QA / Security / Release Engineering | T005 | audit completeness tests | audit tests | every write has event | Planned |  |  |  |
| LFOS-G7-W15-T006 | G7 | W15 | QA / Security / Release Engineering | T006 | idempotency tests | idempotency suite | duplicate commands safe | Planned |  |  |  |
| LFOS-G7-W15-T007 | G7 | W15 | QA / Security / Release Engineering | T007 | state transition tests | state machine tests | invalid transition blocked | Planned |  |  |  |
| LFOS-G7-W15-T008 | G7 | W15 | QA / Security / Release Engineering | T008 | security regression suite | security tests | tenant leak absent | Planned |  |  |  |
| LFOS-G7-W15-T009 | G7 | W15 | QA / Security / Release Engineering | T009 | performance smoke | perf report | agreed latency threshold | Planned |  |  |  |
| LFOS-G7-W15-T010 | G7 | W15 | QA / Security / Release Engineering | T010 | backup/restore drill | DR evidence | restore verified | Planned |  |  |  |
| LFOS-G7-W15-T011 | G7 | W15 | QA / Security / Release Engineering | T011 | UAT script package | UAT scripts | user signoff | Planned |  |  |  |
| LFOS-G7-W15-T012 | G7 | W15 | QA / Security / Release Engineering | T012 | production readiness review | launch readiness report | G7 approval | Planned |  |  |  |

## Use in Vault-Style PRs

- One PR should normally cover one small TUW group, not an entire gate.
- PR bodies must cite covered TUW IDs.
- Validation evidence must match the TUW's test/completion evidence, not merely a broad green command.
- Draft PRs remain unmerged until human review accepts the slice.
