# G5-E Accounting Tax Export Report

TUWs: `LFOS-G5-W08-T006` through `LFOS-G5-W08-T008`

Branch: `codex/lawos-g5-accounting-tax-export`

Base: `codex/lawos-g5-payment-ar-foundation`

This slice does not claim G5 runtime readiness. G5-E adds synthetic-only
descriptor evidence proving that JournalEntry evidence requires a balanced entry
test, accounting export evidence requires export audit evidence, and VAT/tax
export evidence requires period lock evidence without opening runtime writes,
database rows, audit appends, API handlers, payment runtime services, accounting
export runtime services, tax export runtime services, journal posting, invoice
mutation, real client data, bank payloads, accounting files, or tax gateway
payloads.

## Scope

G5-E depends on G5-D Payment AR Foundation evidence and the G5 Billing/Finance
entry plan. It covers balanced JournalEntry evidence, accounting export audit
evidence, and VAT/tax export period-lock evidence while preserving the RP13
descriptor-only no-runtime contract.

| File | Purpose |
| --- | --- |
| `packages/payments/src/client-matter-g5.js` | Adds G5-E descriptor factories for JournalEntry balance, accounting export audit evidence, and VAT/tax export period lock evidence. |
| `packages/payments/test/client-matter-g5-accounting-tax-export.test.js` | Covers balanced entry, export audit evidence, runtime dispatch blocking, period-lock evidence, and tax amount reconciliation. |
| `scripts/validate-client-matter-os-g5-e.mjs` | Validates the G5-E document, source, tests, package script, G5-D dependency, RP13 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G5-W08-T006` | `createPaymentsG5JournalEntryDescriptor()` requires source event evidence, debit/credit balance, and no GL posting. | Proposed |
| `LFOS-G5-W08-T007` | `createPaymentsG5AccountingExportDescriptor()` requires balanced journal entries, export format, export audit evidence, and no runtime dispatch. | Proposed |
| `LFOS-G5-W08-T008` | `createPaymentsG5VatTaxExportDescriptor()` requires period lock evidence, invoice tax summaries, and tax total reconciliation. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `evaluates_runtime_permission: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `dispatches_payments_runtime: false`
- `dispatches_payment_import_runtime: false`
- `dispatches_payment_matching_runtime: false`
- `dispatches_ar_runtime: false`
- `dispatches_ar_aging_runtime: false`
- `dispatches_accounting_export_runtime: false`
- `dispatches_tax_export_runtime: false`
- `recognizes_cash: false`
- `creates_ledger_entry: false`
- `posts_journal_entry: false`
- `mutates_invoice: false`
- `g5_runtime_readiness_claim: "open"`
- `payments_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g5e:validate`
- `npm --workspace @law-firm-os/payments run test`
- `npm run client-matter:g5d:validate`
- `npm run client-matter:g5:plan:validate`
- `npm run rp13:payments-core:validate`
- `npm test`

## Non-Goals

- No JournalEntry, accounting export, VAT/tax export, or audit event record is persisted.
- No accounting export service is executed.
- No tax export service is executed.
- No journal entry is posted to GL.
- No invoice, payment, AR, or finance source object is mutated.
- No API route is executed.
- No real client data, accounting file, bank payload, tax payload, or invoice document bytes are loaded.
- No draft PR is self-merged.
