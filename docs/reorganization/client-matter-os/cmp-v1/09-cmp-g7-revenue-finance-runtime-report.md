# CMP-G7 Revenue/Finance Runtime Report

Status: Implemented runtime API evidence
Date: 2026-06-20

## Scope

CMP-G7 implements 26 new CMP TUWs as a Revenue/Finance bounded context. This is
not a planning-only extension. It wires `revenue-finance` into the API service
descriptor and exposes executable synthetic runtime routes for time/expense,
WIP, PreBill, invoice, payment, AR, finance exports, settlement, UI masking, and
audit evidence.

The runtime keeps the durable-persistence boundary open:
`runtime_api_evidence_only__durable_persistence_open`.

## Runtime Routes

| Route | Purpose |
| --- | --- |
| `/api/revenue/runtime/evidence` | Returns CMP-G7 TUW coverage, dependency, guardrail, and descriptor evidence. |
| `/api/revenue/time-entries` | Creates time entries only with Employee+Matter cost basis evidence. |
| `/api/revenue/time-entries/:id/workflow` | Submits, approves, and locks a time entry workflow. |
| `/api/revenue/rate-cards` | Creates effective-dated role rate cards. |
| `/api/revenue/fee-arrangements` | Maps Matter billing profile and rate-card overrides. |
| `/api/revenue/expenses` | Creates billable expense evidence with DMS document reference. |
| `/api/revenue/disbursements` | Creates billable disbursement evidence linked to expense evidence. |
| `/api/revenue/wip/generate` | Generates WIP from approved billable source rows. |
| `/api/revenue/wip/lock-snapshots` | Locks immutable WIP snapshot evidence for PreBill. |
| `/api/revenue/prebills` | Creates partner-reviewed PreBill evidence. |
| `/api/revenue/adjustments` | Records approved write-down/write-off evidence. |
| `/api/revenue/invoices` | Issues invoices with idempotency and line reconciliation evidence. |
| `/api/revenue/tax-invoices` | Records issue/transmit/failure tax invoice evidence. |
| `/api/revenue/invoice-corrections` | Records correction evidence without direct issued-invoice mutation. |
| `/api/revenue/ui/billing` | Masks billing detail for unauthorized roles. |
| `/api/revenue/payments/import` | Imports payments with duplicate-import idempotency evidence. |
| `/api/revenue/payments/:id/match` | Matches payments partially without duplicate cash recognition. |
| `/api/revenue/ar/balances` | Creates AR balance evidence from issued invoices. |
| `/api/revenue/ar/aging` | Creates AR aging bucket evidence. |
| `/api/revenue/journal-entries` | Creates balanced journal-entry evidence without GL posting claim. |
| `/api/revenue/accounting-exports` | Creates accounting export evidence with audit reference. |
| `/api/revenue/vat-tax-exports` | Creates VAT/tax export evidence only for locked periods. |
| `/api/revenue/settlement-runs` | Creates locked settlement run evidence. |
| `/api/revenue/settlement-runs/:id/credits/origination` | Records origination allocation evidence. |
| `/api/revenue/settlement-runs/:id/credits/working` | Records working-credit role allocation evidence. |
| `/api/revenue/settlement-runs/:id/approval` | Approves posted settlement runs while blocking direct edits. |
| `/api/revenue/ui/finance` | Masks settlement allocation and payout detail for unauthorized roles. |
| `/api/revenue/audit` | Returns audit hash-chain verification and idempotency receipts. |

## TUW Coverage

| CMP TUW | Runtime coverage |
| --- | --- |
| `CMP-G7-W07-T001` | TimeEntry write with Matter and Employee cost basis guard. |
| `CMP-G7-W07-T002` | RateCard write with effective date and role-rate validation. |
| `CMP-G7-W07-T003` | FeeArrangement write with Matter billing profile and rate-card override trace. |
| `CMP-G7-W07-T004` | TimeEntry workflow submit, approve, lock ordering. |
| `CMP-G7-W07-T005` | Expense write with DMS evidence document reference. |
| `CMP-G7-W07-T006` | Disbursement write linked to expense evidence and billable flag. |
| `CMP-G7-W07-T007` | WIP generation from approved billable source rows. |
| `CMP-G7-W07-T008` | Immutable WIP lock snapshot. |
| `CMP-G7-W07-T009` | Partner-reviewed PreBill creation. |
| `CMP-G7-W07-T010` | Approved write-down/write-off adjustment. |
| `CMP-G7-W07-T011` | Idempotent invoice issue with duplicate side-effect block. |
| `CMP-G7-W07-T012` | WIP-to-invoice line reconciliation. |
| `CMP-G7-W07-T013` | Tax invoice issue, transmit, and failure evidence. |
| `CMP-G7-W07-T014` | Invoice correction without direct issued-invoice mutation. |
| `CMP-G7-W07-T015` | Billing UI role-based amount/detail masking. |
| `CMP-G7-W07-T016` | Billing closeout and audit/idempotency evidence boundary. |
| `CMP-G7-W07-T017` | Payment schema imported/unmatched state evidence. |
| `CMP-G7-W07-T018` | Payment import duplicate idempotency evidence. |
| `CMP-G7-W07-T019` | Payment matching partial-match evidence without duplicate cash. |
| `CMP-G7-W07-T020` | AR balance derived from issued invoice evidence. |
| `CMP-G7-W07-T021` | AR aging bucket calculation evidence. |
| `CMP-G7-W07-T022` | Balanced journal-entry evidence without GL posting claim. |
| `CMP-G7-W07-T023` | Accounting export evidence with export audit reference. |
| `CMP-G7-W07-T024` | VAT/tax export evidence with locked period guard. |
| `CMP-G7-W07-T025` | Locked settlement run evidence. |
| `CMP-G7-W07-T026` | Settlement credits, approval, finance UI masking, and settlement closeout evidence. |

## Dependency And Guardrails

- CMP-G7 depends on `CMP-G1-W01`, `CMP-G2-W02`, `CMP-G3-W03`,
  `CMP-G4-W04`, `CMP-G5-W05`, and `CMP-G6-W06`.
- Time and expense writes require Employee+Matter cost basis before WIP can be
  generated.
- Finance write/audit/idempotency evidence is required on runtime write routes.
- The validator also checks the exact lowercase guardrail phrase:
  finance write/audit/idempotency.
- Invoice issue and payment import expose duplicate side-effect blocking.
- Billing UI and finance UI mask restricted amounts, allocations, payout
  detail, and raw payloads for unauthorized roles.
- Settlement run evidence requires lock tests and posted-run direct-edit
  blocking.

## Files

| File | Purpose |
| --- | --- |
| `apps/api/src/revenue-finance-runtime-context.js` | Implements CMP-G7 runtime routes, descriptors, guardrails, audit, and idempotency receipts. |
| `apps/api/src/server.js` | Registers `REVENUE_FINANCE_BOUNDED_CONTEXT` and routes `/api/revenue/*`. |
| `apps/api/test/cmp-g7-revenue-finance-api.test.js` | Verifies cost basis, WIP/PreBill/invoice, payment/AR/export, settlement/UI, evidence, and audit behavior. |
| `scripts/validate-client-matter-os-cmp-g7-runtime.mjs` | Validates route coverage, TUW traceability, guardrail markers, no premature R4 claim, server wiring, and package script. |

## Validation

Expected commands:

```sh
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm run client-matter:cmp-g2:validate
npm run client-matter:cmp-g3:validate
npm run client-matter:cmp-g4:validate
npm run client-matter:cmp-g5:validate
npm run client-matter:cmp-g6:validate
npm run client-matter:cmp-g7:validate
npm --workspace apps/api run test
npm test
git diff --check
```

## Runtime Claim Boundary

The CMP-G7 implementation is executable API evidence with audit/idempotency
receipts. It does not claim durable persistence, production finance posting,
GL posting, customer billing readiness, settlement payout readiness, R4, or
go-live approval.
