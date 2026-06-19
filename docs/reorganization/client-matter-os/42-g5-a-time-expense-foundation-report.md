# G5-A Time Expense Foundation Report

TUWs: `LFOS-G5-W07-T001` through `LFOS-G5-W07-T006`

Branch: `codex/lawos-g5-time-expense-foundation`

Base: `codex/lawos-g5-billing-finance-entry-plan`

This slice does not claim G5 runtime readiness. G5-A adds synthetic-only
descriptor evidence proving that TimeEntry requires Matter, RateCard effective
dates are checked, FeeArrangement rate override mapping is traceable, the time
entry API submit/approve/lock workflow is represented, expense evidence document
requirements are present, and the disbursement billable flag is tested without opening runtime writes, database rows, audit appends, API handlers, invoice
calculation, GL posting, object storage reads, real client data, or revenue
runtime services.

## Scope

G5-A depends on G4-F DMS UI/audit closeout evidence and the G5 Billing/Finance
entry plan. It starts the revenue lane with Time Expense foundation descriptors
while preserving the RP11 descriptor-only no-runtime contract.

| File | Purpose |
| --- | --- |
| `packages/time-expense/src/client-matter-g5.js` | Adds G5-A descriptor factories for TimeEntry, RateCard, FeeArrangement, time-entry workflow, Expense, Disbursement, and closeout evidence. |
| `packages/time-expense/test/client-matter-g5-time-expense-foundation.test.js` | Covers Matter-required TimeEntry, RateCard effective dates, FeeArrangement rate overrides, submit/approve/lock workflow, expense evidence document, disbursement billable flag, and closeout evidence. |
| `scripts/validate-client-matter-os-g5-a.mjs` | Validates the G5-A document, source, tests, package script, G4-F dependency, RP11 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G5-W07-T001` | `createTimeExpenseG5TimeEntryDescriptor()` requires tenant, actor, Matter, role, work date, narrative, status, duration, and billable flag evidence. | Proposed |
| `LFOS-G5-W07-T002` | `createTimeExpenseG5RateCardDescriptor()` checks RateCard effective dates, currency, role rates, and positive hourly rates. | Proposed |
| `LFOS-G5-W07-T003` | `createTimeExpenseG5FeeArrangementDescriptor()` maps FeeArrangement to BillingProfile and RateCard with rate override validation. | Proposed |
| `LFOS-G5-W07-T004` | `createTimeExpenseG5TimeEntryWorkflowDescriptor()` requires submit/approve/lock workflow evidence and blocks locked mutation attempts. | Proposed |
| `LFOS-G5-W07-T005` | `createTimeExpenseG5ExpenseDescriptor()` requires expense evidence document, amount, currency, date, Matter, and billable flag evidence. | Proposed |
| `LFOS-G5-W07-T006` | `createTimeExpenseG5DisbursementDescriptor()` requires disbursement Matter, amount, currency, expense trace, and billable flag evidence. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `evaluates_runtime_permission: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `executes_time_entry_runtime: false`
- `executes_rate_card_runtime: false`
- `executes_expense_runtime: false`
- `executes_disbursement_runtime: false`
- `calculates_invoice: false`
- `posts_gl_entries: false`
- `g5_runtime_readiness_claim: "open"`
- `revenue_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g5a:validate`
- `npm --workspace @law-firm-os/time-expense run test`
- `npm run client-matter:g5:plan:validate`
- `npm run client-matter:g4f:validate`
- `npm run rp11:time-expense-core:validate`
- `npm test`

## Non-Goals

- No TimeEntry, RateCard, Expense, or Disbursement record is persisted.
- No API route is executed.
- No audit event is appended or persisted.
- No invoice, tax invoice, WIP, AR, settlement, or GL posting is calculated.
- No real client data or evidence document bytes are loaded.
- No draft PR is self-merged.
