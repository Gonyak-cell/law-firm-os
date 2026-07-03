# UPL-E-08 Wave-2 LX Skeleton Mapping

Generated: 2026-07-03

Strict result: PASS for UPL-E-08 planning-artifact scope only.

This artifact maps the internal Wave-1 loosening register to concrete Wave-2 TUW skeletons for LX-01 through LX-12. It does not claim any external vendor, Outlook, model, tax-invoice, SES, pentest, or production-readiness receipt.

Source register: `workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md`

## Coverage

| LX | Area | Wave-2 skeletons | Owner/external gate |
|---|---|---|---|
| LX-01 | auth | W2-LX-01-T01 Entra OIDC SSO adapter cutover; W2-LX-01-T02 SCIM user provisioning sync | Entra tenant, app registration, admin consent, SCIM secret storage |
| LX-02 | multi-tenancy | W2-LX-02-T01 Tenant provisioning and isolation roundtrip | Owner commercial multi-tenancy decision and durable DB target |
| LX-03 | ethical-wall | W2-LX-03-T01 Monthly ethical-wall screening | Ethics owner approves monthly screening and exception policy |
| LX-04 | dlp-retention | W2-LX-04-T01 DLP scanner and retention enforcement job | Records owner approves DLP pattern set and disposal hold policy |
| LX-05 | hr-approval | W2-LX-05-T01 Multi-step HR approval lines | HR owner approves manager/HR approval-line policy |
| LX-06 | e-sign | W2-LX-06-T01 E-sign envelope adapter | E-sign vendor and sandbox credentials |
| LX-07 | external-portal-auth | W2-LX-07-T01 External ID portal authentication | External ID provider and guest lifecycle policy |
| LX-08 | accounting-integration | W2-LX-08-T01 Accounting API connector | Accounting provider, sandbox, chart-of-accounts mapping |
| LX-09 | excluded-scope | W2-LX-09-T01 Excluded-scope decomposition register | Owner selects which excluded scope enters Wave-2 |
| LX-10 | observability-notifications | W2-LX-10-T01 APM and SLO observability layer | APM/log provider, SLO targets, escalation owner |
| LX-11 | account-revocation | W2-LX-11-T01 SCIM deprovisioning close gate | Security owner approves IdP/SCIM revocation SLA |
| LX-12 | performance-scale | W2-LX-12-T01 Multi-instance scale and lock proof | Scale target, hosting topology, DB lock strategy |

## Required UPL-E-08 Keywords

| Required topic | Covered by |
|---|---|
| SSO | LX-01 / W2-LX-01-T01 |
| SCIM | LX-01 / W2-LX-01-T02 and LX-11 / W2-LX-11-T01 |
| DLP | LX-04 / W2-LX-04-T01 |
| monthly screening | LX-03 / W2-LX-03-T01 |
| multi-tenancy | LX-02 / W2-LX-02-T01 |
| pentest | W2-XC-PENTEST-01 cross-cutting leadtime gate |

## Cross-Cutting Pentest Gate

`W2-XC-PENTEST-01` applies before Wave-2 commercial or multi-tenant exposure. Minimum scope: authorization bypass, tenant isolation, authentication session, prompt injection, portal token replay, and DLP/retention bypass. Acceptance evidence requires signed rules of engagement, staging account issue log, final report, P0/P1 adjudication, and retest evidence map.

## Strict Boundary

UPL-E-08 closes only the skeleton mapping requirement. It does not upgrade A12, B13, C09, E06, or any other row that needs external runtime/provider evidence.
