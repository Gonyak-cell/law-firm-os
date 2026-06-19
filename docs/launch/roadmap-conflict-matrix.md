# Roadmap Conflict Matrix

Status: t01_matrix_ready_pending_authority_decision
Work package: LT-L1-W09
Created for: LT-L1-W09-T01
Recorded at: 2026-06-18T10:56:33Z

This matrix compares the matter R0-R14 roadmap, `docs/roadmap.md` Phase 0-6 roadmap, and the repo-specific RP10 intake/conflict/engagement plan. It identifies conflicts and gaps only. It does not designate the authoritative roadmap and does not decide whether conflict check or engagement approval belongs in Wave 1.

## R0-R14 To Phase 0-6 Matrix

| Release train | matter roadmap scope | docs/roadmap.md mapping | Conflict / gap | Resolution option / authority candidate |
|---|---|---|---|---|
| R0 | Development OS Foundation | Phase 0 Product Constitution And Architecture | partial overlap: Phase 0 has architecture/MVP scope, but not TUW/Verification/Ledger/Model Routing execution OS. | Candidate: keep R0 as launch execution authority; treat docs/roadmap.md Phase 0 as product-architecture subset. |
| R1 | Matter Core Foundation | Phase 1 Matter Core And DMS Core MVP | partial overlap: Phase 1 includes Tenant/User/Client/Matter/Matter Team, but Employee separation is only explicit in matter roadmap. | Candidate: merge R1 into Phase 1 baseline and add Employee separation as launch invariant. |
| R2 | Security & Permission Foundation | Phase 0 Security model; Phase 1 Matter-team permission and Audit log; Phase 5 Governance | fragmented mapping: ACL, Ethical Wall, HR sensitivity, and Audit Event are split across phases. | Candidate: make R2 security foundation a prerequisite spanning Phase 0/1/5; do not defer HR sensitivity. |
| R3 | Microsoft DMS Foundation | Phase 1 DMS Core MVP; Phase 4 Email And Office Native DMS | conflict: matter roadmap requires OneDrive/SharePoint file_ref and permission sync; docs roadmap Phase 1 has generic DMS and Phase 4 office-native flows. | Candidate: use R3 for M365 storage/permission decisions and treat Phase 1/4 as implementation grouping. |
| R4 | Outlook Filing Foundation | Phase 4 Email And Office Native DMS | aligned but narrower: Phase 4 includes Outlook filing, Office add-in, attachment extraction, and secure sharing. | Candidate: map R4 to Phase 4, with M365 scope/admin consent dependent on L1/OQ decisions. |
| R5 | Core Workflow | Phase 1 Matter dashboard only | gap: Task, Deadline, Work Queue, Review Queue, Approval, and Notification are not explicit Phase 0-6 scope items. | Candidate: add R5 as Wave 1/2 cutline input or merge into a new workflow authority appendix. |
| R6 | Issue & Practice Core | no direct Phase 0-6 equivalent | gap: Issue Ledger and practice-specific M&A/Litigation/Corporate workflows are absent from docs roadmap. | Candidate: keep R6 as matter roadmap authority or explicitly defer practice modules by decision. |
| R7 | Portal Platform | Phase 4 Secure external sharing | conflict: docs roadmap has secure external sharing, while matter roadmap has Client/Employee/Candidate/External portals and projection boundaries. | Candidate: split external sharing from full portal platform; defer full portal unless L1/Wave cutline decides otherwise. |
| R8 | Knowledge & Obsidian Vault | Phase 6 AI Legal Knowledge Platform | gap/conflict: docs roadmap covers AI knowledge/search but not Obsidian-compatible export/import and Vault object mapping. | Candidate: keep R8 as separate export-only/Vault track, likely Wave 3 unless owner decides earlier. |
| R9 | AI & Automation | Phase 0 AI governance policy; Phase 6 AI Legal Knowledge Platform | partial overlap: docs roadmap has AI platform features, while matter roadmap requires source-linked approval and audit output. | Candidate: bind R9 to AI governance/off-by-default launch policy and Wave 2+ activation gates. |
| R10 | Drafting & Clause Intelligence | Phase 6 Clause library, markup analyzer, report generator | partial overlap: docs roadmap has clause/markup/report AI but not full template/terms/source/QC drafting gate. | Candidate: map to Phase 6 with explicit QC/source requirements or defer drafting automation. |
| R11 | Billing & ERP | Phase 2 Time, Billing, Expense MVP; Phase 5 Settlement/Analytics | aligned but split: time/billing is Phase 2, profitability/settlement analytics continue in Phase 5. | Candidate: map R11 across Phase 2 and Phase 5 with billing/settlement sub-gates. |
| R12 | Admin & Governance | Phase 0 Compliance baseline; Phase 5 Governance | partial overlap: docs roadmap includes retention/legal hold/SSO/Audit analytics, but not full policy console/ledger operations. | Candidate: merge R12 with Phase 5 governance and add admin action audit as mandatory. |
| R13 | Enterprise Hardening | Phase 5 DLP, Retention, Legal Hold, SSO/MFA | aligned but incomplete: backup, observability, recovery, and performance are explicit in matter roadmap but not all listed in docs roadmap. | Candidate: retain R13 hardening as the security/ops authority for L5/L6. |
| R14 | People & HR Operations | no direct Phase 0-6 equivalent | gap: HR core, leave, attendance, recruitment, HR risk, and HR AI guardrail are absent from docs roadmap. | Candidate: keep R14 as separate HR track; do not treat docs roadmap omission as exclusion without owner decision. |

## Repo-Side Unique Items

| Item | Appears in | Observed position | Conflict / gap | Resolution option / authority candidate |
|---|---|---|---|---|
| conflict check | `docs/roadmap.md` Phase 3; `docs/rp10-intake-conflict-engagement-detailed-microphases.md` RP10.P00-P09 | docs roadmap puts Conflict check under CRM/Intake/Conflict; RP10 expands it into contract, model, service, API, UI, fixtures, permission/audit, failure, Hermes, and review phases. | matter R0-R14 table has no explicit conflict-check train; closest anchors are R1/R2/R6/R12. | Candidate: decide in `L1-9` whether conflict check is Wave 1, Wave 2 entry, or deferred, with RP10 as detailed implementation authority. |
| engagement approval | `docs/roadmap.md` Phase 3; `docs/rp10-intake-conflict-engagement-detailed-microphases.md` RP10.P00-P09 | docs roadmap puts Engagement approval under CRM/Intake/Conflict; RP10 includes EngagementLetter, engagement issuance, fee terms, approval routing, and blocked failure cases. | matter R0-R14 table has no explicit engagement approval train; risk is silent omission from Wave cutline. | Candidate: decide in `L1-9` whether engagement approval is included with intake/conflict or separately deferred, with approval/audit gates required. |

## Conflict Row Summary

| Class | Rows | Count |
|---|---|---:|
| partial overlap / fragmented mapping | R0, R1, R2, R9, R10, R12 | 6 |
| direct gap / no equivalent | R5, R6, R8, R14 | 4 |
| scope conflict or split | R3, R7, R11, R13 | 4 |
| aligned but needs decision linkage | R4 | 1 |

## Decision Boundary

`LT-L1-W09-T02` must decide the authoritative roadmap and conflict check / engagement approval inclusion. This T01 matrix only supplies the comparison record and resolution options. No `L1-9` row has been added to `docs/launch/launch-decision-register.md`.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` in closeout evidence and is not valid review evidence.
