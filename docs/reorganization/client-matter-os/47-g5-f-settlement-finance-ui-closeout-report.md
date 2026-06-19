# G5-F Settlement Finance UI Closeout Report

TUWs: `LFOS-G5-W08-T009` through `LFOS-G5-W08-T014`

Branch: `codex/lawos-g5-settlement-finance-ui-closeout`

Base: `codex/lawos-g5-accounting-tax-export`

This slice does not claim G5 runtime readiness. G5-F adds synthetic-only
descriptor evidence proving that SettlementRun evidence requires run lock
testing, OriginationCredit evidence requires allocation sum testing,
WorkingCredit evidence requires role allocation testing, settlement approval
evidence requires a posted run direct-edit block, Finance UI evidence requires
permission masking, and G5 Finance closeout records invoice-to-payment evidence
without opening runtime writes, database rows, audit appends, API handlers,
settlement runtime services, origination runtime services, working-credit
runtime services, allocation runtime services, finance UI runtime services,
payout creation, real client data, bank payloads, accounting files, settlement
documents, or tax gateway payloads.

## Scope

G5-F depends on G5-E Accounting Tax Export Report evidence and the G5
Billing/Finance entry plan. It covers SettlementRun lock evidence,
OriginationCredit allocation evidence, WorkingCredit role allocation evidence,
settlement approval direct-edit blocking, Finance UI permission masking, and
G5 Finance closeout evidence while preserving the RP14 descriptor-only
no-runtime contract.

| File | Purpose |
| --- | --- |
| `packages/settlement/src/client-matter-g5.js` | Adds G5-F descriptor factories for SettlementRun lock, OriginationCredit allocation, WorkingCredit role allocation, settlement approval, Finance UI masking, and closeout evidence. |
| `packages/settlement/test/client-matter-g5-settlement-finance-ui-closeout.test.js` | Covers run lock, allocation sum, role allocation, posted run direct-edit block, permission masking, invoice-to-payment evidence, and no-runtime receipts. |
| `scripts/validate-client-matter-os-g5-f.mjs` | Validates the G5-F document, source, tests, package script, G5-E dependency, RP14 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G5-W08-T009` | `createSettlementG5SettlementRunDescriptor()` requires SettlementRun period trace, lock status, and blocked mutation evidence. | Proposed |
| `LFOS-G5-W08-T010` | `createSettlementG5OriginationCreditDescriptor()` requires partner identity, Matter trace, and 100 percent allocation sum evidence. | Proposed |
| `LFOS-G5-W08-T011` | `createSettlementG5WorkingCreditDescriptor()` requires allowed working-credit role and positive allocation evidence. | Proposed |
| `LFOS-G5-W08-T012` | `createSettlementG5ApprovalWorkflowDescriptor()` requires approved posted-run evidence and blocks direct edits to posted runs. | Proposed |
| `LFOS-G5-W08-T013` | `createSettlementG5FinanceUiDescriptor()` requires role-based permission masking for settlement allocations and payouts. | Proposed |
| `LFOS-G5-W08-T014` | `createSettlementG5FinanceCloseoutDescriptor()` summarizes G5-F evidence, command evidence, draft PR state, upstream disposition, human review disposition, and invoice-to-payment evidence. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `evaluates_runtime_permission: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `dispatches_settlement_runtime: false`
- `dispatches_origination_runtime: false`
- `dispatches_working_credit_runtime: false`
- `dispatches_allocation_runtime: false`
- `dispatches_finance_ui_runtime: false`
- `locks_settlement_run: false`
- `posts_settlement_run: false`
- `mutates_posted_settlement_run: false`
- `creates_payout: false`
- `g5_runtime_readiness_claim: "open"`
- `settlement_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g5f:validate`
- `npm --workspace @law-firm-os/settlement run test`
- `npm run client-matter:g5e:validate`
- `npm run client-matter:g5:plan:validate`
- `npm run rp14:settlement-core:validate`
- `npm test`

## Non-Goals

- No SettlementRun, OriginationCredit, WorkingCredit, approval, allocation, or payout record is persisted.
- No settlement, origination, working-credit, allocation, or finance UI runtime service is executed.
- No settlement run is locked, posted, reversed, or mutated.
- No posted settlement run is directly edited.
- No payout, journal entry, accounting export, or tax export artifact is created.
- No API route is executed.
- No real client data, accounting file, bank payload, tax payload, settlement document, or invoice document bytes are loaded.
- No draft PR is self-merged.
