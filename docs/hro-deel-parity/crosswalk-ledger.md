# HRO-DEEL-PARITY Crosswalk Ledger

Status: active baseline  
Date: 2026-06-23  
Program: `HRO-DEEL-PARITY`

## Boundary

This ledger turns the Deel web Jan 2026 screenshot set into an execution
crosswalk for the Law Firm OS People surface. It proves the current baseline
and the next TUW sequence. It does not claim full Deel parity, production
approval, payroll execution, or external provider readiness.

Hermes MCP is used as a check-only gate. The latest observed Hermes surfaces
passed, but write, deployment, final approval, and enterprise trust claims
remain closed.

## Source Set

| Source | Value |
| --- | --- |
| Screenshot folder | `Law Firm OS UI/Deel web Jan 2026` |
| Image count | 476 |
| Visual source | `Deel web Jan 2026 *.png` |
| Inventory state | 476 screenshot rows OCR-classified into feature/status crosswalk |
| Inventory file | `docs/hro-deel-parity/screenshot-inventory.json` |
| Inventory summary | `docs/hro-deel-parity/screenshot-inventory.md` |
| People-related OCR rows | 461 |
| Non-People reference rows | 15 |

Lazyweb design research used `enterprise HRIS people navigation` on desktop.
Useful external reference patterns were employee profiles, onboarding,
roles/permissions, people analytics, payroll, benefits, and compliance.
The contract-registration pass also checked Deel desktop references for HR
people settings, integrations, payroll and benefits. Coverage was moderate and
used only to reinforce that benefits, payroll, hiring and compliance surfaces
stay gated until backend/provider evidence exists.

## Current People Menu

| Label | Section | Status |
| --- | --- | --- |
| 구성원 | `people-members` | implemented UI entrypoint |
| 인사 문서 | `people-documents` | implemented UI entrypoint |
| 휴가 | `people-leave` | implemented UI entrypoint |
| 승인 | `people-approvals` | implemented UI entrypoint |
| 채용 | `people-recruiting` | implemented UI entrypoint |
| 입퇴사 | `people-lifecycle` | implemented UI entrypoint |
| 인사 정책 | `people-policy` | implemented UI entrypoint |
| 활동 기록 | `people-audit` | implemented UI entrypoint |
| 인사 현황 | `people-analytics` | implemented UI entrypoint |
| AI 검토 | `people-ai` | implemented UI entrypoint |
| 급여정산 | `people-payroll` | implemented UI entrypoint |

## Feature Crosswalk

| Feature | Deel Evidence | Law OS Status | Next TUW | Risk |
| --- | --- | --- | --- | --- |
| People directory/profile | People, Add people, Profile, Groups | implemented UI entrypoint | `HRO-L1-W02-T01` | B |
| Documents/compliance | Documents, Compliance documents, Templates | implemented UI entrypoint | `HRO-L1-W03-T01` | A |
| Time off/attendance/approvals | Time off, Approvals, Tracker | implemented UI entrypoint | `HRO-L1-W04-T01` | B |
| Recruiting/lifecycle/candidate | Deel Talent, Jobs, Onboarding, Offboarding | implemented UI entrypoint | `HRO-L1-W05-T01` | B |
| People analytics/AI | Dashboards, Reports, Custom AI agents, Workforce insights | implemented UI entrypoint | `HRO-L1-W06-T01` | A |
| Payroll export boundary | Global payroll, Pay your team, Tax documents | implemented UI entrypoint | `HRO-L2-W01-T03` | A |
| Workforce planning/bulk edit | Workforce planning, Job requests, Referrals, Bulk edit | backend contract required | `HRO-L3-W01-T01` | B |
| Equity/benefits/immigration/background | Equity, Benefits, Immigration, Background checks | external owner decision required | `HRO-L4-W01-T01` | A |
| Engagement/learning/performance | Learning, Reviews, Goals, Career, Surveys | backend contract required | `HRO-L3-W01-T02` | B |
| IT assets/apps/admin settings | IT assets, Apps, Slack, Notifications, Roles | backend contract required | `HRO-L3-W01-T03` | B |

## Backend Contract Register

Backend-missing and external-owner domains are registered in:

- `docs/hro-deel-parity/backend-contract-registry.json`
- `docs/hro-deel-parity/backend-contract-register.md`

These files define required route contracts, domain objects, auth scopes, audit
events, verification cases, evidence gates and blocked People section ids. They
are not UI entrypoints.

## Work Packages

| WP | Lane | Terminal TUW |
| --- | --- | --- |
| `HRO-L0-W01` | Crosswalk baseline | `HRO-L0-W01-T04` |
| `HRO-L1-W01` | Existing HRX backend UI reflection | `HRO-L1-W01-T03` |
| `HRO-L2-W01` | 급여정산 미리보기 | `HRO-L2-W01-T03` |
| `HRO-L3-W01` | Backend-missing Deel contracts | `HRO-L3-W01-T03` |
| `HRO-L4-W01` | External provider/owner decisions | `HRO-L4-W01-T03` |

## Validator

Run:

```bash
npm run hro:deel-parity:validate
```

The validator checks screenshot count, current People menu wiring, feature
status coverage, terminal TUW structure, payroll preview/export-only boundary,
OCR screenshot inventory coverage, backend contract registry coverage,
fake-working-UI section blocking, Korean SaaS label/state separation, and Hermes
check-only claim limits.
