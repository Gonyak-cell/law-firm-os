# Risk Control Existence Audit

Status: blocked_pending_human_acceptance
Work package: LT-L0-W04
Recorded at: 2026-06-18T10:22:41Z

Scope: read-only first-pass code existence audit for Critical risks RISK-001, RISK-002, RISK-003, RISK-005, RISK-006, RISK-007, and RISK-010. This record checks whether a control exists as code or executable policy surface. It does not claim non-bypassable operation. 우회 불가 검증은 L5 소관.

## Method

The audit used the source risk register at `workbook/matter_dev_docs/23_Risk_Register_Open_Questions.md` and then inspected the current repository for concrete packages, exported functions, descriptor flags, runtime opening flags, and API wiring. Uncertain findings are downgraded to `partial`. Descriptor-only, planning-only, or closed-runtime evidence is not counted as full runtime control.

## Permission Boundary Controls

| Risk | Control | Judgment | Code or source basis | Existence command | Follow-up |
|---|---|---|---|---|---|
| RISK-002 | User/Employee/Contact/External User separation | partial | `packages/domain/src/entities.js` exports `createUser` and `createMatterMember`, but no `createEmployee`; HRX registry preserves `user_employee_separation_preserved: true` and keeps `employee_api_runtime_opened: false`. | `rg -n "createUser|createMatter|MatterMember|CONFIDENTIALITY_LEVELS" packages/domain/src/entities.js`; `rg -n "user_employee_separation_preserved|employee_api_runtime_opened|real_employee_candidate_payroll_document_data_allowed|user_account_conflated" packages/hrx/src/registry.js packages/hrx/src/validators.js` | L2-5: promote descriptor separation into runtime schema/API admission before real HR data opens. |
| RISK-003 | SharePoint permission sync checker, audit, reconciliation job | absent | M365 runtime contract and overlay still have `storage_decision_resolved: false`; `privilege_classification_decision_resolved: false`; SharePoint/Graph write items are listed as blocked surfaces, not an executable sync checker or reconciliation job. | `rg -n "permission sync|reconciliation|SharePoint|Graph|storage_decision_resolved|privilege_classification_decision_resolved" contracts/email-dms-m365-runtime-contract.json docs/matter-pack-integration/m365 packages/email-dms/src/service.js` | L2-5/L3: implement M365 permission sync checker only after MAT-DEC-03 and privilege classification decisions are closed. |
| RISK-006 | Portal projection model, external ACL, redaction | partial | `packages/client-portal/src/service.js` exists, but 27 rows keep `evaluates_runtime_permission: false`, `writes_permission_decision: false`, `permission_bypass_detected: false`, and require human final approval for runtime opening. | `rg -n "portal_projection|projection|redaction|evaluates_runtime_permission|writes_permission_decision|permission_bypass_detected|human_final_approval_required_for_runtime_opening" packages/client-portal/src/service.js` | L2-5/L4/L5: open portal projection with external ACL and redaction tests before any customer-facing runtime. |

## AI, HR, And Vault Controls

| Risk | Control | Judgment | Code or source basis | Existence command | Follow-up |
|---|---|---|---|---|---|
| RISK-001 | Lawyer/HR-in-control approval queue and source-grounded output | partial | AI policy requires source scope, approval/write-back gating, and a disable switch; AI governance and AI legal workflow packages record human final approval requirements. Runtime true-write flags were not found in those packages. | `rg -n "approval_required|source|human|disable|dark|final|write-back|grounded|auto-final|auto final|lawyer|review" packages/ai-governance packages/ai-legal-workflows workbook/matter_dev_docs/07_AI_자동화_모델라우팅_검증정책.md` | L2-5/L5: implement runtime approval queue enforcement, source-required validation, and disable switch smoke before AI dark launch. |
| AI-OFF | Wave 1 AI disable switch | partial | The policy document requires `rollback 및 disable switch 제공`, but no runtime switch wiring was found in API/server code during this audit. | Same command as RISK-001 plus runtime summary command in closeout evidence. | L1/L2-5: keep AI off until a runtime disable switch and smoke evidence exist. |
| RISK-005 | Obsidian export-only -> controlled import -> approval sync | absent | No `packages/obsidian` or `packages/vault` directory exists. Vault requirements are planning candidates, and MAT-DEC-03 remains relevant to storage origin. | `find packages -maxdepth 2 -type d -iname '*vault*' -o -iname '*obsidian*'`; `rg -n "export-only|controlled import|approval sync|Vault|Obsidian|obsidian" packages docs workbook/matter_dev_docs/09_Obsidian_Matter_Vault_Spec.md` | L2-5/L4/L5: build export-only surface and import approval workflow after storage decision. |
| RISK-007 | HR guardrail for salary/evaluation/candidate exposure | partial | HRX registry and validators repeatedly assert `real_employee_candidate_payroll_document_data_allowed: false` and separation preservation, but HR runtime/API remains closed. | `rg -n "user_employee_separation_preserved|employee_api_runtime_opened|real_employee_candidate_payroll_document_data_allowed|user_account_conflated" packages/hrx/src/registry.js packages/hrx/src/validators.js` | L2-5 plus HR separation track: runtime guardrail must be admitted before real HR data, payroll, evaluation, or candidate documents are used. |

## Audit Control

| Risk | Control | Judgment | Code or source basis | Existence command | Follow-up |
|---|---|---|---|---|---|
| RISK-010 | Audit middleware and non-bypassable event writer | partial | `packages/audit/src/append-only-ledger.js` exports `createAuditLedger` and `verifyHashChain`; the ledger has `append` and `correction`, but stores events in an in-memory array. `apps/api/src/server.js` does not import or call `createAuditLedger` and does not append audit events in the measured data routes. | `rg -n "verifyHashChain|append\\(|correction\\(|createAuditLedger|hash" packages/audit/src/append-only-ledger.js`; `rg -n "createAuditLedger|append\\(|audit" apps/api/src packages/authz/src packages/audit/src -g '*.js'` | L2-1: durable audit event schema/store and non-bypassable middleware; L2-5/L5: route-by-route append verification. |

### Persistence And Missing Append Summary

| Item | Result |
|---|---|
| Hash-chain verify function | present, exported as `verifyHashChain` |
| Append writer | present, in-memory only |
| Correction writer | present, in-memory only |
| Durable audit store | absent in inspected file |
| API audit ledger wiring | absent in `apps/api/src/server.js` |
| API data-route audit append count | 0 in `apps/api/src/server.js` |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
