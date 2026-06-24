# LCX-PPL Gap Ledger

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
Goal: `People Legal Relationship Runtime-Ready Candidate`

## Boundary

This ledger maps the attached Law Firm OS critique into current repo evidence.
It is a current-state implementation ledger, not a production approval or
enterprise trust claim. It keeps `production`, `go_live`, and
`enterprise_trust` false unless separate external receipts prove otherwise.

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `reflected` | Current repo evidence proves the requirement is implemented or superseded by a stronger implementation. |
| `partial` | Some current implementation exists, but the requirement is not fully satisfied. |
| `open` | Required implementation is missing or materially incomplete. |
| `external_gate` | Implementation or completion depends on owner/provider/legal/security evidence outside this local repo. |
| `obsolete` | The attached critique described an older state that current repo evidence has superseded. |

## Requirement Ledger

| ID | Attached Requirement / Critique | Current Evidence | Status | Next TUW |
| --- | --- | --- | --- | --- |
| `PPL-GAP-001` | Top-level IA should expose Client, Matter, and People as first-class modules instead of analytics/profile shell. | `apps/web/src/data/nav.js`, `apps/web/src/App.jsx`, and `apps/web/src/components/Shell.jsx` now expose `clients`, `matters`, `people`, and `vault`. | `reflected` | none |
| `PPL-GAP-002` | Client module needs list/detail/account/contact/data/report/import surfaces instead of client strings and dashboard cards. | `apps/web/src/components/ClientsSurface.jsx` and `docs/goal-closeout/sf-client-matter-parity/evidence.md` record Client list, leads, opportunities, intake, accounts, contacts, data, reports, import, account/contact create/patch, merge review, and guarded actions. | `reflected` | none |
| `PPL-GAP-003` | Client contacts should exist as first-class records connected to Client workspace. | Client contact UI and runtime routes are reflected in SF evidence, but the People-side legal relationship directory does not yet unify Client contacts with broader People records. | `partial` | `LCX-PPL-02.04`, `LCX-PPL-05.05` |
| `PPL-GAP-004` | Client relationship map should cover affiliates, beneficial owners, board/executives, counterparties, and related parties. | Client data/report surfaces exist, but legal relationship graph coverage across Client, People, counterparties, and ethical walls is not yet implemented as a People relationship workspace. | `open` | `LCX-PPL-02.02`, `LCX-PPL-03.01`, `LCX-PPL-05.04` |
| `PPL-GAP-005` | Matter should be a real workspace with list/detail/command/vault/activity/calendar/channel/opening/team/billing/analytics surfaces. | `apps/web/src/components/MattersSurface.jsx` and SF evidence record route-backed Matter list, command, vault, timeline, calendar, channel, opening, team, billing, analytics, record actions, saved views, bulk status, owner assignment, and audit surfaces. | `reflected` | none |
| `PPL-GAP-006` | Matter package descriptor-only state should not be overclaimed as production runtime. | SF evidence records runtime route-backed UI for many Matter surfaces while production/go-live/trust claims remain false. Legacy descriptor-only model flags still exist and must not be used as production evidence. | `partial` | `LCX-PPL-00.03`, `LCX-QA-08.04` |
| `PPL-GAP-007` | People should not be a product-analytics profile surface; it must be a legal People Directory. | Current `PeopleHome.tsx` is HRX/employee-centered: members, documents, leave, approvals, recruiting, lifecycle, policy, audit, analytics, AI, payroll, admin. It does not yet expose legal person types beyond HRX employees/candidates. | `open` | `LCX-PPL-02.01`, `LCX-PPL-05.01`, `LCX-PPL-05.02` |
| `PPL-GAP-008` | People must include internal lawyers, staff/paralegals, client contacts, counterparties, opposing counsel, experts/witnesses, judges/arbitrators/regulators. | HRX employee and candidate surfaces exist. Client contacts exist in Client surface. Unified legal taxonomy and directory are missing. | `open` | `LCX-PPL-02.01`, `LCX-PPL-03.04` |
| `PPL-GAP-009` | People must include relationship graph across people, clients, matters, documents, counterparties, and organizations. | Master Data and Client/Matter route surfaces provide adjacent records, but no People relationship ledger/API/UI currently proves this graph. | `open` | `LCX-PPL-03.01`, `LCX-PPL-04.03`, `LCX-PPL-05.04` |
| `PPL-GAP-010` | People must include permission and ethical-wall membership. | Matter/People admin and permission surfaces exist, and SF evidence includes People permission admin owner/provider-blocked routes. Ethical-wall membership as a People relationship surface remains missing. | `partial` | `LCX-PPL-03.02`, `LCX-PPL-06.01`, `LCX-PPL-06.03` |
| `PPL-GAP-011` | People staffing/availability/utilization should support matter assignment. | HRX analytics and employee profile surfaces exist, but legal staffing availability and matter assignment matching are not yet a unified People workflow. | `partial` | `LCX-PPL-02.03`, `LCX-HRO-07.02` |
| `PPL-GAP-012` | Dashboard/analytics should drill down to records and actions. | Client/Matter Track B surfaces now connect dashboards and actions to runtime routes for many Client/Matter workflows. People legal relationship drill-down remains missing. | `partial` | `LCX-PPL-05.02`, `LCX-PPL-05.03`, `LCX-QA-08.02` |
| `PPL-GAP-013` | Mock/descriptor-only data must be separated from runtime-backed evidence. | Current SF evidence separates local runtime evidence from production/trust claims. HRO crosswalk also blocks runtime/UI parity claims. The People legal relationship lane needs its own claim boundary and evidence receipts. | `partial` | `LCX-PPL-00.02`, `LCX-PPL-00.03`, `LCX-QA-08.03` |
| `PPL-GAP-014` | HRO/Deel-inspired HR surfaces must not create fake working UI before backend contracts and owner decisions. | `docs/hro-deel-parity/backend-contract-register.md` and `backend-contract-registry.json` block workforce/bulk, engagement/learning/performance, IT/app/admin, benefits/equity/immigration/background sections. | `reflected` | `LCX-HRO-07.01` |
| `PPL-GAP-015` | AI/automatic People review must not make final HR/legal decisions without human review. | HRX AI routes and UI exist, but current HRO validator fails before proving menu parity. Human review boundaries still need to be carried into People legal relationship conflict review. | `partial` | `LCX-PPL-01.02`, `LCX-PPL-06.02`, `LCX-PPL-06.04` |

## Current Open Work

1. Stabilize HRO People menu label parity so current validators can pass.
2. Add legal People contracts for person types, organizations, affiliations,
   matter roles, client contacts, and representation sides.
3. Add a relationship ledger and permission-aware APIs before exposing new UI.
4. Reframe People UI as a legal relationship workspace with HRX embedded inside
   it, not the whole concept.
5. Add browser QA and evidence receipts proving local runtime-ready candidate
   status only.

