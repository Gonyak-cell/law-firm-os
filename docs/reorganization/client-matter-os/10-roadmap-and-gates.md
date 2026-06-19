# Roadmap and Gates

Status: Proposed
Source: `Law_Firm_OS_TUW_Backlog_v1.0.xlsx`

This file preserves the full G0-G7 target so the active goal is not narrowed to the first planning PR. Dates are source-package assumptions and must be replanned against real velocity before execution commitments.

## Roadmap

| Phase | 기간 | 목표 | 주요 산출물 | Gate |
| --- | --- | --- | --- | --- |
| Phase 0 | 2026. 6. 22. ~ 2026. 7. 3. | 재구성 baseline 및 문서체계 확정 | 폴더 구조, glossary, ownership matrix | G0 |
| Phase 1 | 2026. 7. 6. ~ 2026. 8. 28. | Platform/IAM/Audit + Party Master runtime | durable audit, permission middleware, Party APIs | G1/G2 |
| Phase 2 | 2026. 8. 31. ~ 2026. 10. 9. | CRM + Intake/Conflict gate runtime | Opportunity, conflict search, engagement gate | G3 |
| Phase 3 | 2026. 10. 12. ~ 2026. 12. 11. | Matter Management + DMS baseline | Matter opening, team, task, deadline, document workspace | G4 |
| Phase 4 | 2026. 12. 14. ~ 2027. 2. 19. | Time/Billing/Finance baseline | TimeEntry, WIP, pre-bill, invoice, payment, AR | G5 |
| Phase 5 | 2027. 2. 22. ~ 2027. 4. 16. | Analytics + AI Governance + Client Portal | BI read model, AI retrieval control, portal projection | G6 |
| Phase 6 | 2027. 4. 19. ~ 2027. 6. 11. | Enterprise hardening, UAT, release readiness | security test, performance, DR, compliance evidence | G7 |
| Phase 7 | 2027. 6. 14. ~ 2027. 6. 30. | Pilot closeout 및 production cutover | pilot report, final risk acceptance, launch | Launch |

## Quality Gates

| Gate | 명칭 | 통과 조건 | 주요 폴더 |
| --- | --- | --- | --- |
| G0 | Reorganization Gate | 폴더/문서/owner 재구성 완료 | 00 Product Governance |
| G1 | Trust Foundation Gate | IAM, permission, durable audit runtime 준비 | 01 Platform/IAM/Audit |
| G2 | Master Data Gate | Party/Relationship Master persistence 준비 | 02 Party Master |
| G3 | Intake-to-Matter Gate | CRM → Intake → Matter 전환이 gate로 작동 | 03 CRM / 04 Intake |
| G4 | DMS/Matter Execution Gate | Matter, DMS, deadline, task runtime 작동 | 05 Matter / 06 DMS |
| G5 | Revenue Gate | Time/WIP/PreBill/Invoice/Payment/AR runtime 작동 | 07 Billing / 08 Finance |
| G6 | AI/Portal Gate | AI retrieval과 Portal이 ACL/audit 기반으로 작동 | 09/10/11 |
| G7 | Enterprise Hardening Gate | UAT, security test, performance, DR, compliance evidence 완료 | 12/13/14/15 |

## Execution Rule

Each gate must close with evidence before the next runtime gate claims readiness. Planning-only and descriptor-only artifacts are not enough to claim runtime, enterprise, or production readiness.
