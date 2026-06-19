# G5-D Payment AR Foundation Report

TUWs: `LFOS-G5-W08-T001` through `LFOS-G5-W08-T005`

Branch: `codex/lawos-g5-payment-ar-foundation`

Base: `codex/lawos-g5-invoice-tax-billing-ui`

This slice does not claim G5 runtime readiness. G5-D adds synthetic-only
descriptor evidence proving that Payment records preserve imported/unmatched
state, payment import requires duplicate import idempotency, payment matching
supports partial match evidence without duplicate cash recognition, ARBalance
derives from issued invoice evidence, and AR aging requires aging bucket
calculation evidence without opening runtime writes, database rows, audit
appends, API handlers, payment import services, payment matching services, AR
runtime services, AR aging runtime services, invoice mutation, real client data,
or payments runtime services.

## Scope

G5-D depends on G5-C Invoice Tax Billing UI evidence and the G5 Billing/Finance
entry plan. It covers Payment schema evidence, payment import idempotency,
partial payment matching, ARBalance derivation, and AR aging read-model evidence
while preserving the RP13 descriptor-only no-runtime contract.

| File | Purpose |
| --- | --- |
| `packages/payments/src/client-matter-g5.js` | Adds G5-D descriptor factories for Payment imported/unmatched state, duplicate import idempotency, partial matching, ARBalance derivation, and AR aging bucket evidence. |
| `packages/payments/test/client-matter-g5-payment-ar-foundation.test.js` | Covers imported/unmatched state, duplicate import blocking, partial match over-allocation blocking, issued-invoice AR derivation, and aging bucket calculation evidence. |
| `scripts/validate-client-matter-os-g5-d.mjs` | Validates the G5-D document, source, tests, package script, G5-C dependency, RP13 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G5-W08-T001` | `createPaymentsG5PaymentSchemaDescriptor()` requires payment ID, import reference, positive amount, matter trace, and imported/unmatched state. | Proposed |
| `LFOS-G5-W08-T002` | `createPaymentsG5PaymentImportDescriptor()` requires import batch trace, idempotency key, duplicate import attempt evidence, and no second payment creation. | Proposed |
| `LFOS-G5-W08-T003` | `createPaymentsG5PaymentMatchingDescriptor()` requires invoice/payment trace, partial match evidence, over-allocation blocking, and duplicate cash blocking. | Proposed |
| `LFOS-G5-W08-T004` | `createPaymentsG5ARBalanceDescriptor()` requires issued invoice source evidence, amount reconciliation, and read-model non-editability. | Proposed |
| `LFOS-G5-W08-T005` | `createPaymentsG5ARAgingDescriptor()` requires ARBalance refs, aging bucket, bucket amount reconciliation, and read-model non-editability. | Proposed |

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
- `recognizes_cash: false`
- `creates_ledger_entry: false`
- `mutates_invoice: false`
- `g5_runtime_readiness_claim: "open"`
- `payments_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g5d:validate`
- `npm --workspace @law-firm-os/payments run test`
- `npm run client-matter:g5c:validate`
- `npm run client-matter:g5:plan:validate`
- `npm run rp13:payments-core:validate`
- `npm test`

## Non-Goals

- No payment, payment match, ARBalance, or AR aging record is persisted.
- No payment import service is executed.
- No payment matching service is executed.
- No cash is recognized.
- No invoice or finance source object is mutated.
- No JournalEntry, accounting export, or VAT/tax export is posted.
- No API route is executed.
- No audit event is appended or persisted.
- No real client data, bank file, receipt, or payment payload is loaded.
- No draft PR is self-merged.
