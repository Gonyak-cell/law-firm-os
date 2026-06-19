# G5-B WIP PreBill Adjustment Report

TUWs: `LFOS-G5-W07-T007` through `LFOS-G5-W07-T010`

Branch: `codex/lawos-g5-wip-prebill-adjustment`

Base: `codex/lawos-g5-time-expense-foundation`

This slice does not claim G5 runtime readiness. G5-B adds synthetic-only
descriptor evidence proving that approved time creates WIP, PreBill snapshot immutable evidence is present, partner review is required before invoice creation, and write-down/write-off approval is required without opening runtime writes, database rows, audit appends, API handlers, invoice issue, invoice-line generation, GL posting, issued-invoice mutation, real client data, or billing runtime services.

## Scope

G5-B depends on G5-A Time Expense foundation evidence and the G5 Billing/Finance
entry plan. It covers WIP, pre-bill review, and adjustment controls while
preserving the RP12 descriptor-only no-runtime contract.

| File | Purpose |
| --- | --- |
| `packages/billing/src/client-matter-g5.js` | Adds G5-B descriptor factories for WIP generation, WIP lock snapshot, PreBill partner review, adjustment approval workflow, and closeout evidence. |
| `packages/billing/test/client-matter-g5-wip-prebill-adjustment.test.js` | Covers approved-source WIP generation, immutable snapshot evidence, partner review requirements, adjustment approval, issued-invoice mutation blocking, and closeout evidence. |
| `scripts/validate-client-matter-os-g5-b.mjs` | Validates the G5-B document, source, tests, package script, G5-A dependency, RP12 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G5-W07-T007` | `createBillingG5WipGenerationDescriptor()` requires approved billable source rows and blocks unapproved source rows from WIP generation evidence. | Proposed |
| `LFOS-G5-W07-T008` | `createBillingG5WipLockSnapshotDescriptor()` requires locked snapshot ID/time/item refs and blocks source-item mutation. | Proposed |
| `LFOS-G5-W07-T009` | `createBillingG5PreBillDescriptor()` requires PreBill snapshot trace and partner review evidence before invoice creation. | Proposed |
| `LFOS-G5-W07-T010` | `createBillingG5AdjustmentWorkflowDescriptor()` requires write-down/write-off amount, reason, approval, and issued-invoice mutation blocking. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `evaluates_runtime_permission: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `dispatches_billing_runtime: false`
- `dispatches_proforma_runtime: false`
- `dispatches_write_down_runtime: false`
- `dispatches_invoice_runtime: false`
- `generates_invoice_line: false`
- `calculates_invoice: false`
- `mutates_issued_invoice: false`
- `posts_gl_entries: false`
- `g5_runtime_readiness_claim: "open"`
- `billing_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g5b:validate`
- `npm --workspace @law-firm-os/billing run test`
- `npm run client-matter:g5a:validate`
- `npm run client-matter:g5:plan:validate`
- `npm run rp12:billing-core:validate`
- `npm test`

## Non-Goals

- No WIP, PreBill, adjustment, invoice, or invoice-line record is persisted.
- No API route is executed.
- No audit event is appended or persisted.
- No invoice is issued and no issued invoice is mutated.
- No real client data or billing document bytes are loaded.
- No draft PR is self-merged.
