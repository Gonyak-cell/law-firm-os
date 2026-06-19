# Risk Control Reality Matrix

Status: blocked_pending_human_acceptance
Work package: LT-L0-W04
Recorded at: 2026-06-18T10:22:41Z
Gate: G3, L0-EXIT

This matrix is the G3 first-pass input for function-existence evidence only. It does not assert that the controls are non-bypassable in production. 우회 불가 검증은 L5 소관.

## Matrix

| Risk | Critical control | Reality judgment | Evidence basis | G3 first-pass result | Referral required |
|---|---|---|---|---|---|
| RISK-001 | AI auto-finalization block via approval queue and source-grounded output | partial | AI policy and packages record human approval/source-grounding boundaries, but no runtime true-write or approval queue enforcement was verified. | not_ready | yes |
| RISK-002 | User/Employee/Contact/External User separation | partial | Domain has `createUser`/`MatterMember`; HRX preserves separation and keeps employee runtime closed. No `createEmployee` runtime export exists. | not_ready | yes |
| RISK-003 | SharePoint permission sync checker, audit, reconciliation job | absent | M365 contract/overlay still unresolved for storage and privilege classification; no executable sync checker/reconciliation job verified. | not_ready | yes |
| RISK-005 | Obsidian export-only before controlled import and approval sync | absent | No Obsidian/Vault package; requirements remain planning candidates linked to MAT-DEC-03. | not_ready | yes |
| RISK-006 | Client portal projection, external ACL, redaction | partial | Client portal package exists, but runtime permission evaluation/write decisions are false and opening requires human final approval. | not_ready | yes |
| RISK-007 | HR salary/evaluation/candidate AI guardrail | partial | HRX validators and registry block real HR data and preserve User/Employee separation, but HR runtime/API is not open. | not_ready | yes |
| RISK-010 | Non-bypassable audit event writer and hash-chain | partial | Hash-chain append/verify exists in memory; API routes do not call the audit ledger and no durable store is present. | not_ready | yes |

## L2-5 / L2-1 Referral List

| Referral | Risk | Target phase | Required action | Source judgment |
|---|---|---|---|---|
| L2REF-L0-W04-001 | RISK-001 | L2-5, L5 | Implement runtime approval queue enforcement, source-required validation, and AI disable switch smoke. | partial |
| L2REF-L0-W04-002 | RISK-002 | L2-5 | Promote User/Employee separation from descriptor/validator evidence into runtime schema/API admission. | partial |
| L2REF-L0-W04-003 | RISK-003 | L2-5, L3 | Implement M365 permission sync checker and reconciliation after storage/privilege decisions close. | absent |
| L2REF-L0-W04-004 | RISK-005 | L2-5, L4, L5 | Build Obsidian export-only surface, controlled import queue, and approval sync evidence after storage decision. | absent |
| L2REF-L0-W04-005 | RISK-006 | L2-5, L4, L5 | Implement portal projection runtime with external ACL, redaction tests, and customer-facing leak gates. | partial |
| L2REF-L0-W04-006 | RISK-007 | L2-5, HR separation track | Admit HR guardrail runtime before real HR data, payroll, evaluation, or candidate documents open. | partial |
| L2REF-L0-W04-007 | RISK-010 | L2-1, L2-5, L5 | Add durable audit schema/store and non-bypassable route middleware, then verify per route. | partial |

## Approval Record

| Field | Value |
|---|---|
| Approval status | pending_human_acceptance |
| Approver role | Launch owner / G3 risk-control evidence approver |
| Record date | 2026-06-18 |
| Decision | Not yet approved. Codex does not synthesize the required human acceptance. |
| Approval evidence location | `docs/launch/risk-control-reality-matrix.md#approval-record` |

## Boundary

All seven Critical risks are either `partial` or `absent`; none is marked fully production-ready by this L0 audit. The G3 first-pass result is therefore `not_ready` with mandatory L2/L5 referrals. Closed CP evidence remains read-only, and no real client/employee data was used.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
