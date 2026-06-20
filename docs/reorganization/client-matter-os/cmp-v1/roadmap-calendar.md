# CMP R4 Roadmap Calendar

Status: source-intake-baseline

## Source Gate Calendar

| Gate | Name | Start | End | PR | Dependencies | Primary Risk |
| --- | --- | --- | --- | --- | --- | --- |
| CMP-G0 | Product Governance & Architecture Freeze | 2026-06-22 | 2026-07-03 | PR-01 |  | Descriptor/runtime confusion |
| CMP-G1 | Trust Foundation Runtime | 2026-07-06 | 2026-08-14 | PR-02/PR-03 | CMP-G0 | Permission or audit bypass |
| CMP-G2 | Party & Client Master Runtime | 2026-08-17 | 2026-09-11 | PR-04 | CMP-G1 | Duplicate Party or conflict miss |
| CMP-G3 | People / HRX Runtime Foundation | 2026-09-14 | 2026-10-09 | PR-04 | CMP-G1, CMP-G2 | User and Employee conflation |
| CMP-G6 | CRM to Intake to Matter Conversion Runtime | 2027-01-04 | 2027-01-29 | PR-05 | CMP-G1, CMP-G2 | Conflict gate bypass |
| CMP-G4 | Matter Core & Staffing Runtime | 2026-10-12 | 2026-11-06 | PR-06 | CMP-G1, CMP-G2, CMP-G3, CMP-G6 | Employee staffing mismatch |
| CMP-G5 | Vault-backed DMS / Email / Knowledge Runtime | 2026-11-09 | 2026-12-18 | PR-07 | CMP-G1, CMP-G2, CMP-G3, CMP-G4 | Document or raw path leak |
| CMP-G7 | Time / Billing / Finance Runtime | 2027-02-01 | 2027-03-12 | PR-08 | CMP-G1, CMP-G2, CMP-G3, CMP-G4, CMP-G5, CMP-G6 | Billing and payment mismatch |
| CMP-G8 | Analytics & Profitability Read Models | 2027-03-15 | 2027-04-02 | PR-09 | CMP-G1, CMP-G2, CMP-G3, CMP-G4, CMP-G5, CMP-G7 | Masked data or freshness gap |
| CMP-G9 | AI/RAG Governance Runtime | 2027-04-05 | 2027-04-30 | PR-09 | CMP-G1, CMP-G5, CMP-G8 | AI permission or citation bypass |
| CMP-G10 | Portal / Data Room / External Projection Runtime | 2027-05-03 | 2027-05-28 | PR-09 | CMP-G1, CMP-G4, CMP-G5, CMP-G9 | External projection leak |
| CMP-G11 | Client-Matter-People UI/UX Product Console | 2027-05-31 | 2027-07-09 | PR-10 | CMP-G1-G10 | Mock fallback or misleading UI |
| CMP-G12 | Enterprise Hardening, Migration, UAT, Launch | 2027-07-12 | 2027-08-20 | PR-11/PR-12 | CMP-G1-G11 | Go-live overclaim |

## Corrected Execution Order

The source workbook lists CMP-G4 Matter before CMP-G6 CRM/Intake on the calendar, while G4 depends on CMP-G6 clearance-token evidence. Execution must therefore run CMP-G6 before any G4 R4 completion claim.

Corrected dependency order:

1. CMP-G0
2. CMP-G1
3. CMP-G2 and CMP-G3
4. CMP-G6
5. CMP-G4
6. CMP-G5
7. CMP-G7
8. CMP-G8, CMP-G9, CMP-G10
9. CMP-G11
10. CMP-G12
