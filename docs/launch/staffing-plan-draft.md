# LT-L1-W08 Staffing Plan Draft

Status: draft_completed_pending_l0_w02_approval
Work package: LT-L1-W08
TUW: LT-L1-W08-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Purpose

This draft turns the launch-plan staffing risk into a decision-ready staffing
input. It does not approve staffing, name real people, or close
`LT-L1-W08-T02`.

The launch plan flags the current execution model as a single owner plus agent
execution model while L2 is effectively a new backend build. The runtime gap
report reinforces that staffing need: the implementation-layer ledger reports
987 descriptor packs and 0 runtime-ready packs, and the Wave 1 runtime matrix
contains 35 RTG cells with 2 satisfied, 19 partial, and 14 absent.

## Source Basis

| Source | Staffing implication |
| --- | --- |
| `workbook/matter-post-cp-launch-plan.md` §5 L1-8 | Requires staffing/role planning for tenant admin, on-call/support, DBA, security, AI reviewer, and pilot champion; current model is single owner plus agents. |
| `workbook/matter-post-cp-launch-plan.md` §8-9 | Identifies single execution subject as a risk because L2 is team-scale backend work. |
| `docs/launch/runtime-gap-report.md` | Provides L0 runtime gap input: 987 descriptor packs, 0 runtime-ready packs, and 14 absent RTG cells. |
| `workbook/matter_dev_docs/24_개발팀_착수_지시서.md` | Defines the intended development-team work principles and Sprint 0-6 scope, but does not prove a staffed team exists. |

## Development Team Premise Check

| Check | Finding |
| --- | --- |
| Document premise | Document 24 is written as a development-team kickoff instruction. |
| Repo evidence of staffed team | not_evidenced_in_repo |
| Current operating assumption | single_owner_plus_agents_until_owner_confirms_staffing |
| Staffing decision state | pending_human_decision_in_LT-L1-W08-T02 |
| Risk implication | L2/L3 runtime, infrastructure, support, and security duties should not be assigned to one accountable human without named backup coverage. |

## Role Gap Matrix

| Role | Current status | Concurrent workload risk | Dual-hat candidate profile | Hire option | Outsource option | Draft recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| 테넌트 관리자 | vacant_or_unconfirmed | M365 tenant, Entra, Graph consent, Outlook add-in, SharePoint/OneDrive provisioning cannot be ownerless. | Existing IT/admin owner with M365 tenant rights. | Part-time M365 administrator if internal rights are unavailable. | M365 tenant setup specialist for L1/L3/L6 windows. | Name one accountable tenant admin and one backup before L3-W07 starts. |
| 온콜·지원 | vacant_or_unconfirmed | Pilot users need support during filing, matter creation, permission denials, and rollback windows. | Operations lead who can triage app/support issues and route technical incidents. | Support engineer for pilot period. | Managed helpdesk coverage during pilot and go-live week. | Define pilot-hours support rota before L6 training and L7 pilot. |
| DBA | vacant_or_unconfirmed | L2 persistence, migration runner, tenant isolation, rollback, backup, and restore work needs database ownership. | Backend lead with DB migration and backup experience. | Contract/part-time DBA for schema, migration, and backup gates. | DB platform specialist for L2/L3 storage setup and L5 validation. | Assign DBA coverage before LT-L2-W01 and LT-L3-W04 execution. |
| 보안 담당 | vacant_or_unconfirmed | Permission boundary, secret storage, audit store, incident response, and hardening gates require independent security ownership. | Security-minded engineer or admin who can review access, secrets, and audit controls. | Security engineer with SaaS/M365 experience. | External security assessor for hardening, pentest prep, and policy review. | Assign security owner before L2 trust-boundary implementation and L3 vault work. |
| AI 리뷰어 | vacant_or_unconfirmed | Wave 1 AI is dark-launch, but Wave 2 requires high-risk output reviewer, SLA, disable switch authority, and policy signoff. | Senior lawyer or designated reviewer with privilege/confidentiality judgment. | Dedicated legal AI reviewer if workload exceeds pilot capacity. | External legal AI policy reviewer for OQ-003/OQ-014 alignment. | Keep AI product actions off until named reviewer and reviewer SLA exist. |
| 파일럿 챔피언 | vacant_or_unconfirmed | Pilot adoption, feedback triage, time allocation, and practice-priority arbitration need a business owner. | Partner-level or senior practice lead with M&A pilot authority. | Not primary hiring path; should be internal business ownership. | Pilot facilitation support only; ownership should remain internal. | Identify one partner-level owner and backup before LT-L1-W10 and L7 pilot gates. |

## Staffing Options Summary

| Option | Advantages | Risks | Best fit |
| --- | --- | --- | --- |
| Internal dual-hat coverage | Fastest if roles already exist; keeps legal context inside AMIC. | Overloads current single-owner model; weak backup coverage. | Tenant admin, pilot champion, AI reviewer where internal authority is required. |
| Targeted hiring | Durable ownership for runtime operations and security. | Slow relative to launch path; may block L2/L3 if started late. | DBA, support, security if launch becomes recurring operation. |
| Specialist outsourcing | Fast capacity for M365, DBA, security, and pentest preparation. | Needs tight scope, access limits, and audit trail. | L3 infra, backup/restore, vault, security validation, external reviews. |

## Decision Inputs For LT-L1-W08-T02

| Decision input | Required owner evidence |
| --- | --- |
| Named primary and backup for each of the 6 roles | real owner evidence; Codex cannot synthesize names |
| Coverage model per role | one of dual-hat, hire, outsource, or deferred with date |
| AI reviewer identity or appointment date | owner-approved reviewer or signed appointment deadline |
| Pilot support rota | named owner, dates, support hours, escalation path |
| L2/L3 critical-role start dates | approved start dates aligned to runtime and infra gates |

## Dependency Note

`LT-L1-W08-T01` is prepared against the current L0 runtime gap report, whose
T04 rebaseline input remains `pending_human_approval`. If the L0 approver
changes the runtime gap basis, this draft must be rechecked before
`LT-L1-W08-T02` approval.
