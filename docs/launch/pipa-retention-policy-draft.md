# PIPA Retention Policy Draft

Status: blocked_pending_external_legal_review_result
Work package: LT-L1-W03
TUW: LT-L1-W03-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Legal Review Result Reference

Required external dependency: EXT-LEGAL-AI.

External legal review result artifact id: not_supplied_pending_EXT_LEGAL_AI_result.

This draft is a policy candidate package only. It does not ratify AMIC policy,
does not update `docs/launch/launch-decision-register.md`, and does not approve
external AI processing, cross-border transfer, attorney-confidentiality terms,
or production personal-data handling.

## Source Basis

| Source | Use in this draft |
| --- | --- |
| `workbook/matter_dev_docs/06_권한_보안_감사_거버넌스.md` §8 | Local source rows for final documents, draft documents, audit logs, HR documents, candidate data, and AI prompts/outputs. |
| `workbook/matter_dev_docs/05_도메인_객체_데이터모델.md` §4 | Lifecycle states: Archive, Retain/Hold, Purge. |
| `docs/launch/external-leadtime/ai-legal-review-scope.md` | Shows EXT-LEGAL-AI scope exists but result is not supplied. |
| Personal Information Protection Act Article 21, National Law Information Center | Destruction trigger, exception for legal retention, separation of retained data. |
| Enforcement Decree of the Personal Information Protection Act Article 16, National Law Information Center | Destruction method should make personal information unrecoverable. |
| Labor Standards Act Article 42 and Enforcement Decree Article 22, National Law Information Center | Candidate baseline for HR employment record retention: 3 years for important labor-contract records. |
| Fair Hiring Procedure Act Article 11 and Enforcement Decree Article 4, National Law Information Center | Candidate baseline for hiring documents: return request period set within 14 to 180 days after hiring decision confirmation, then destruction under the Personal Information Protection Act. |

Official reference links checked on 2026-06-18:

| Reference | URL |
| --- | --- |
| Personal Information Protection Act Article 21 | https://www.law.go.kr/LSW//lsLinkCommonInfo.do?ancYnChk=&chrClsCd=010202&lsJoLnkSeq=1020398651 |
| Enforcement Decree of the Personal Information Protection Act Article 16 | https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&lsId=011468 |
| Labor Standards Act Article 42 | https://www.law.go.kr/lsInfoP.do?lsiSeq=122686 |
| Labor Standards Act Enforcement Decree record-retention trigger rule | https://law.go.kr/LSW//lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=70870 |
| Fair Hiring Procedure Act Article 11 | https://www.law.go.kr/lsInfoP.do?lsiSeq=208371 |
| Fair Hiring Procedure Act Enforcement Decree Article 4 | https://www.law.go.kr/LSW/lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82077 |

## Retention

Candidate policy:

| Data class | Proposed retention period or condition | Destruction trigger | Hold override |
| --- | --- | --- | --- |
| Matter final documents | 10 years after Matter close, then owner re-approval for extension or destruction | Matter close date + 10 years and no active legal hold | Active legal hold blocks destruction until release is recorded. |
| Draft documents | 2 years after final version approval or Matter close, whichever is later | Later of final approval date + 2 years or Matter close date + 2 years | Active legal hold blocks destruction until release is recorded. |
| Audit logs | 10 years after event timestamp, stored append-only or WORM-equivalent | Event timestamp + 10 years and no active investigation or legal hold | Active investigation or legal hold blocks destruction until release is recorded. |
| HR documents | 3 years after employment relationship end or statutory trigger date, aligned to Labor Standards Act retention baseline | Applicable trigger date + 3 years and no active dispute or legal hold | Active dispute, HR investigation, or legal hold blocks destruction until release is recorded. |

## Legal Hold

Candidate policy:

| Step | Proposed rule |
| --- | --- |
| Hold creation | A hold record must include Matter or HR scope, reason, requester role, approver role, start date, affected repositories, and review date. |
| Hold effect | While a hold is active, deletion, purge, irreversible anonymization, and retention-expiry jobs are blocked for the scoped records. |
| Review cadence | Active holds are reviewed every 90 days until release. |
| Release | A hold release requires approver role, release date, scope, reason, and audit event. After release, expired records move to destruction queue within 30 days. |
| Audit | Create, update, and release actions are audit events and must preserve before/after scope. |

## Candidate Destruction

Candidate policy:

| Candidate data class | Proposed retention period or condition | Destruction trigger |
| --- | --- | --- |
| Portal application profile | 180 days after hiring decision confirmation unless the candidate becomes an employee or gives separate talent-pool consent | Decision confirmation date + 180 days with no employee conversion and no separate consent |
| Submitted hiring documents | Return-request period set at 30 days after hiring decision confirmation; if not returned or if return does not apply, destroy within 14 days after that period ends | Decision confirmation date + 44 days, unless employee conversion or a separate legal basis is recorded |
| Interview notes and evaluations | 180 days after hiring decision confirmation | Decision confirmation date + 180 days, unless dispute hold is active |
| Talent-pool consent records | 1 year from consent date | Consent date + 1 year unless renewed by explicit consent |

Electronic deletion must remove active copies and queue backup expiry according to the approved backup lifecycle. Manual destruction records must include dataset, count, execution date, operator role, reviewer role, and audit event id.

## AI Prompt And Output Retention

Candidate policy for Wave 1:

| Data class | Proposed retention period or condition | Destruction trigger | Boundary |
| --- | --- | --- | --- |
| External AI prompts | 0 days for production personal, client, Matter, privileged, HR, or confidential information because Wave 1 external AI is off | Prompt submission is blocked, so no production prompt store is created | External provider use remains disabled until EXT-LEGAL-AI result and OQ-014 decision are recorded. |
| External AI outputs | 0 days for production personal, client, Matter, privileged, HR, or confidential information because Wave 1 external AI is off | Output generation is blocked, so no production output store is created | No legal or HR conclusion may be final without human approval and source-linked evidence. |
| Local/internal AI prep artifacts | 30 days for synthetic or redacted test artifacts only | Artifact creation date + 30 days | No real personal data or client confidential material until production-data-policy gates allow it. |
| Approval/audit metadata | 10 years after approval or rejection event | Event timestamp + 10 years and no active legal hold | Store metadata, not prompt payload, when payload retention is disallowed. |

## Comparison To Document 06 Section 8

| Document 06 row | Original proposed policy | Draft change | Rationale |
| --- | --- | --- | --- |
| Matter final documents | 장기보존, 삭제 전 승인 | Proposes 10 years after Matter close, followed by owner re-approval or destruction | Converts open-ended long-term retention into a reviewable period while keeping deletion approval. |
| Draft documents | retention policy에 따라 보관·정리 | Proposes 2 years after final approval or Matter close, whichever is later | Adds a concrete clock and ties drafts to finalization or close. |
| Audit logs | 장기보존, 변경불가 저장소 권장 | Proposes 10 years after event timestamp, append-only or WORM-equivalent | Adds a measurable period and preserves audit-first invariant. |
| HR documents | 법정·내부 보존기간에 따라 관리 | Proposes 3 years after employment relationship end or statutory trigger date, subject to legal review | Aligns to labor-record retention baseline without ratifying final HR policy. |
| Candidate data | 채용 목적 종료 후 보존·파기 정책 필요 | Proposes 30-day return request period, destruction within 14 days after that period, and 180-day maximum candidate-workflow retention | Converts the open item into explicit clocks for legal review. |
| AI prompts/outputs | 민감도별 저장기간 및 마스킹 필요 | Proposes Wave 1 external AI prompt/output retention of 0 days for production sensitive data; synthetic/redacted prep artifacts 30 days | Preserves Wave 1 AI-off boundary and blocks external AI processing until EXT-LEGAL-AI and OQ-014 are decided. |

## Privacy Policy Amendment Inputs

If ratified by humans later, the privacy-policy amendment must include:

| Item | Draft input |
| --- | --- |
| Retention and use periods | The data-class periods in this draft, as approved or revised by legal review. |
| Destruction procedure | Scheduled expiry job, manual hold review, destruction queue, reviewer approval, audit event, and backup expiry queue. |
| Destruction method | Electronic records: irreversible deletion or cryptographic erasure; paper records: shredding or incineration-equivalent vendor certificate. |
| Separate retention under other law | Separate store or separated logical controls for records retained under another statute, with access logging and purpose limitation. |
| Legal hold | Disclosure that destruction is suspended for records under lawful dispute, investigation, litigation, regulatory, or client-instruction hold. |

## Open Items For Ratification

| Open item | Required human/legal output |
| --- | --- |
| EXT-LEGAL-AI result | External legal review result artifact id and conclusion for processing delegation, cross-border transfer, and attorney confidentiality. |
| OQ-014 | AI prompt/output retention and masking decision in the launch decision register. |
| L1-3 ratification | Decision register row with owner role, decision, basis, date, and approval signature reference. |
| HR scope | Confirmation that HR statutory periods and candidate handling match AMIC employment and recruiting practice. |
| Backup lifecycle | Approved backup expiry rule and evidence that destruction records reconcile active stores and backups. |
