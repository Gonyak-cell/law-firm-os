# LCX-PPL Full Reflection TUW Plan

## Recommended Goal

`LCX-PPL Full Reflection: People Legal Relationship Runtime-Ready Candidate`

Korean goal statement:

> Law Firm OS의 People 축을 HRX 직원 관리 중심에서 Client-Matter-People 법률 관계망 중심으로 확장하고, 미반영 요구사항을 runtime-backed UI/contract/evidence까지 반영하되 production/go-live/trust claim은 별도 게이트로 남긴다.

## Goal Boundary

- This plan targets local repo reflection and runtime-ready candidate evidence.
- It does not claim production readiness, go-live approval, enterprise trust approval, or external owner acceptance.
- People remains an embedded Law Firm OS product axis, not a separate HR product.
- HRX remains inside the People boundary but must not swallow the legal People directory, relationship graph, Client/Matter contacts, conflict, or ethical-wall surfaces.

## Current Baseline To Reconfirm Before Implementation

- `npm run sf:client-matter-parity:validate` previously passed on local evidence.
- `npm run hro:deel-parity:validate` previously failed on the People menu label drift: expected `AI 검토`, UI showed `자동 검토`.
- Client and Matter top-level UI exposure is substantially reflected.
- The remaining critical gap is People as a legal relationship workspace, beyond HRX employee management.
- HRO blocked surfaces must remain blocked or contract-only until backend contracts, authz, audit, and evidence exist.

## Source Anchors

- `apps/web/src/people/PeopleHome.tsx`
- `apps/web/src/components/Shell.jsx`
- `docs/hro-deel-parity/crosswalk-ledger.md`
- `docs/hro-deel-parity/backend-contract-register.md`
- `docs/goal-closeout/sf-client-matter-parity/evidence.md`

## Lazyweb Pattern Inputs

Use Lazyweb again before UI implementation if the visual/product surface changes materially.

Initial evidence patterns already identified:

- Legal relationship/contact systems favor record-centric people profiles, relationship timelines, reminders, notes, and linked lists.
- Enterprise HRIS navigation favors lifecycle areas, employee profiles, onboarding, roles, permissions, analytics, and payroll/export boundaries.
- Legal matter workspaces favor matter dashboards, task lists, documents, workflows, search, chat/activity, and analytics.
- Permission admin references support explicit role matrices, security surfaces, and admin settings rather than hidden permission behavior.

## TUW Plan

### LCX-PPL-00: Gap Freeze And Claim Boundary

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-00.01` | Attachment Gap Ledger Freeze | Map the attached critique/planning text to current repo truth. | `docs/lazycodex/people-reflection/gap-ledger.md`; optional `gap-ledger.json`. | Every source requirement is classified as `reflected`, `partial`, `open`, `external_gate`, or `obsolete`. |
| `LCX-PPL-00.02` | Current Evidence Baseline | Freeze the current validator and evidence state before edits. | Baseline note with HEAD, working tree status, validator outputs, and known failures. | SF validator state, HRO validator failure, browser QA state, and production/trust false boundary are recorded. |
| `LCX-PPL-00.03` | Claim Boundary Register | Prevent overclaiming during the People expansion. | `claim-boundary.md`. | `local evidence`, `runtime-ready candidate`, `production`, `go-live`, and `enterprise trust` are separated. |

### LCX-PPL-01: Validator Drift Repair

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-01.01` | People Label Drift Decision | Decide whether the canonical Korean label is `AI 검토` or `자동 검토`. | Decision note in the People reflection docs. | Shell menu, crosswalk ledger, and validator expectation have one canonical label. |
| `LCX-PPL-01.02` | HRO Validator Repair | Repair the currently failing HRO parity validator. | Minimal menu or ledger alignment. | `npm run hro:deel-parity:validate` exits 0. |
| `LCX-PPL-01.03` | Regression Guard | Prevent future menu/crosswalk drift. | Menu-label parity check or validator assertion. | A label mismatch fails locally with an actionable message. |

### LCX-PPL-02: Legal People Domain Contracts

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-02.01` | Legal Person Taxonomy | Expand People beyond employees. | Contract definitions for `Person`, `Employee`, `ClientContact`, `OpposingCounsel`, `ExpertWitness`, `CourtActor`, `RegulatorContact`. | Each type has required fields, display labels, sensitivity rules, and allowed relationships. |
| `LCX-PPL-02.02` | Organization And Affiliation Contract | Model external and internal organizations. | `Organization`, `Affiliation`, `RoleHistory` contract. | One person can hold multiple current or historical affiliations. |
| `LCX-PPL-02.03` | Matter Participation Contract | Model people in matter context. | `MatterParticipant`, `MatterRole`, `RepresentationSide` contract. | Internal team, client-side actors, opposing-side actors, and external experts are distinguishable. |
| `LCX-PPL-02.04` | Client Contact Contract | Link Client records to People. | Client contact ledger contract. | Client detail can back-reference related People records. |

### LCX-PPL-03: Relationship Ledger Runtime

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-03.01` | Relationship Ledger Repository | Store and retrieve People relationships through runtime-backed code. | Relationship repository and fixtures. | Relationship reads/writes do not rely only on descriptor files. |
| `LCX-PPL-03.02` | Conflict And Ethical Wall References | Add conflict and wall references without overclaiming final review. | Conflict marker and wall membership reference model. | Person, organization, Client, and Matter can expose restricted or review-needed state. |
| `LCX-PPL-03.03` | Audit Event Mapping | Make relationship mutations auditable. | Audit event mapping for create, update, link, unlink, restrict, review. | Relationship changes emit receipt/audit evidence. |
| `LCX-PPL-03.04` | Seed Fixture Expansion | Make QA scenarios visible. | Fixture data for court actors, opposing counsel, experts, witnesses, client contacts, and regulators. | Each People type is visible in local QA data. |

### LCX-PPL-04: Runtime Routes And Permission-Aware APIs

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-04.01` | People Search API | Provide unified People search. | Search route or existing route extension. | Type, organization, Client, Matter, and status filters work. |
| `LCX-PPL-04.02` | People Detail API | Provide complete profile payloads. | Detail route returning profile, affiliations, clients, matters, relationships, audit summary. | People detail UI can render from a single runtime payload. |
| `LCX-PPL-04.03` | Relationship API | Provide graph/list relationship data. | Relationship grouped-list or graph endpoint. | Person, Client, Matter, and Organization relationship pivots work. |
| `LCX-PPL-04.04` | Permission-Aware Response | Enforce restricted fields and ethical-wall state. | Permission-aware response shaping. | Unauthorized users cannot see sensitive relationship details. |

### LCX-PPL-05: People UI Reflection

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-05.01` | People Navigation IA | Reframe People as legal relationship workspace plus embedded HRX. | People IA update: Directory, Relationships, Conflicts, HR, Admin. | HRX remains accessible but is no longer the whole People concept. |
| `LCX-PPL-05.02` | Legal People Directory UI | Expose non-employee People records. | Record-first directory with type tabs, filters, saved view, search. | Employee and non-employee People types are visible and navigable. |
| `LCX-PPL-05.03` | People Detail Workspace | Render profile and related records. | Detail workspace with affiliations, related Clients/Matters, activity, audit. | A selected person can be inspected without leaving People. |
| `LCX-PPL-05.04` | Relationship Panel | Show relationship context. | Relationship panel or graph-style summary. | The user can see how a person connects to Clients, Matters, and organizations. |
| `LCX-PPL-05.05` | Client/Matter Backlinks | Link existing Client/Matter UI back to People. | Client contact and Matter participant panels. | Existing Client/Matter surfaces expose related People records. |

### LCX-PPL-06: Ethics, Conflict, And Permission Surfaces

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-PPL-06.01` | Ethical Wall UI | Show wall status with evidence. | Wall badge, restricted notice, source/reviewer state. | Wall status is visible with reason and receipt context. |
| `LCX-PPL-06.02` | Conflict Review Queue | Make conflict review operational. | Pending, reviewed, escalated, blocked states. | AI/automatic review output is never shown as final without human review. |
| `LCX-PPL-06.03` | Permission Admin Linkage | Connect People sensitivity to admin controls. | Role matrix and sensitive-field visibility controls. | Existing permission admin and People restrictions agree. |
| `LCX-PPL-06.04` | Reviewer Receipt Model | Record human decisions. | Reviewer, timestamp, decision, notes, rollback pointer. | Sensitive People/conflict decisions have human review evidence. |

### LCX-HRO-07: Blocked HRO Contract Backlog

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRO-07.01` | Blocked HRO Surface Registry | Keep unimplemented HR domains honest. | Updated blocked-surface registry. | Missing domains do not appear as working product UI. |
| `LCX-HRO-07.02` | Workforce/Bulk Contract Stub | Prepare workforce and bulk operations without pretending implementation. | Contract-only docs/tests. | Backend-missing UI is blocked or clearly marked not implemented. |
| `LCX-HRO-07.03` | Performance/Learning Contract Stub | Split HRX growth from legal People expansion. | Contract register entries. | Performance, learning, engagement, and survey domains remain separately gated. |
| `LCX-HRO-07.04` | External Owner Gate Pack | Gate external-owner domains. | Owner-decision checklist for benefits, equity, immigration, background checks. | No completion claim exists without owner decision evidence. |

### LCX-QA-08: Validation, Browser QA, And Closeout

| TUW | Name | Purpose | Deliverables | Done Criteria |
| --- | --- | --- | --- | --- |
| `LCX-QA-08.01` | Validator Suite Update | Add People relationship validation. | Updated parity, relationship, and claim-boundary validators. | Old and new validators pass locally. |
| `LCX-QA-08.02` | Browser QA Scenario | Drive the visible product surface. | Browser receipt for People Directory, detail, relationship, wall, Client/Matter backlinks. | Route/check count receipt is generated and linked. |
| `LCX-QA-08.03` | Evidence Closeout | Record local implementation evidence. | Updated evidence doc, current validation receipt, browser receipt. | Evidence supports local runtime-ready candidate only. |
| `LCX-QA-08.04` | Final Boundary Review | Audit claims before closeout. | Final claim audit. | `production`, `go_live`, and `enterprise_trust` remain false unless separate external evidence exists. |

## Recommended Start Order

1. `LCX-PPL-00.01`
2. `LCX-PPL-00.02`
3. `LCX-PPL-00.03`
4. `LCX-PPL-01.01`
5. `LCX-PPL-01.02`
6. `LCX-PPL-01.03`
7. `LCX-PPL-02.01`

Do not start UI work before the gap ledger, label drift, and claim boundary are stable.

## Suggested Branch Name For Implementation

`codex/lcx-ppl-legal-relationship-runtime-ready`

## Closeout Phrase

Use this exact claim shape unless production evidence is separately supplied:

`LCX-PPL local runtime-ready candidate complete; production, go-live, and enterprise trust claims remain false.`
