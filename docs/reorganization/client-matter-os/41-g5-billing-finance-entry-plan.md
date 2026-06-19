# G5 Billing Finance Entry Plan

Status: Proposed
Gate: `G5 Revenue Gate`
Depends on: G1 implementation evidence review, G2 implementation evidence review, G3 implementation evidence review, G4 implementation evidence review
TUW range: `LFOS-G5-W07-T001` through `LFOS-G5-W08-T014`

## Purpose

G5 opens the Time, Expense, Billing, Payments, AR, Accounting Export, Tax Export,
and Settlement execution lane after the G4 Matter/DMS baseline. It turns the
descriptor evidence in RP11 through RP14 into the plan for matter-scoped
time capture, WIP, pre-bill, invoice, tax invoice, payment import and matching,
AR, accounting/VAT export, partner credit, and settlement controls.

This plan opens G5 planning only. It does not claim G5 runtime readiness while
the stacked G1 through G4 PRs are still in draft review.

This plan does not claim G5 runtime readiness.

Billing and Finance work remains prohibited unless G4 has produced valid Matter
and DMS handoff evidence. Billing must consume Party Master `BillingProfile`,
Matter, FeeTerms, and DMS evidence references without creating duplicate client
identity, editing issued invoices directly, or mutating finance source objects.

## Existing Evidence

| Surface | Current evidence | G5 treatment |
| --- | --- | --- |
| `contracts/time-expense-core-contract.json` | RP11 Time Expense Disbursement descriptor contract for TimeEntry, rate card, expense, disbursement, and evidence documents | Reuse as source contract; convert matter-required time, rate effective dates, fee mapping, approval/lock workflow, expense evidence, and disbursement controls into runtime tests. |
| `contracts/billing-core-contract.json` | RP12 Billing And Invoicing descriptor contract for proforma, invoice, TaxInvoice, write-down, and write-off | Reuse as source contract; convert WIP, pre-bill, invoice issue, invoice line reconciliation, tax invoice, correction, and billing UI controls into runtime tests. |
| `contracts/payments-core-contract.json` | RP13 Payments AR Accounting Export descriptor contract for payment matching, AR aging, journal entry, and VAT export | Reuse as source contract; convert payment import, duplicate idempotency, matching, AR aging, balanced journal, export audit, and period lock controls into runtime tests. |
| `contracts/settlement-core-contract.json` | RP14 Partner Settlement descriptor contract for origination, allocation, working credit, and settlement run lock | Reuse as source contract; convert settlement run locks, credit allocation, approval, reversal, and permission-masked finance UI controls into runtime tests. |
| `packages/time-expense/README.md` | RP11 generated pack evidence through CP00-363 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as time/expense runtime readiness proof. |
| `packages/billing/README.md` | RP12 generated pack evidence through CP00-391 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as billing runtime readiness proof. |
| `packages/payments/README.md` | RP13 generated pack evidence through CP00-425 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as payments or AR runtime readiness proof. |
| `packages/settlement/README.md` | RP14 generated pack evidence through CP00-452 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as settlement runtime readiness proof. |
| `docs/reorganization/client-matter-os/40-g4-f-dms-ui-audit-closeout-report.md` | G4-F descriptor records DMS UI, audit coverage, and DMS closeout evidence while keeping readiness open | Use as entry handoff only; G5 still requires accepted Matter/DMS evidence or fail-closed stubs before runtime writes. |
| `docs/reorganization/client-matter-os/12-risk-register.md` | R-001 duplicate client identity, R-006 issued invoice direct edit, R-013 settlement run mutation, R-014 tax invoice retry, and R-015 descriptor/runtime confusion risks | Use as G5 negative evidence requirements. |
| `docs/reorganization/client-matter-os/13-workflow-state-and-folder-checklist.md` | Time/WIP, pre-bill/invoice, collection/AR, and settlement workflow states | Use as workflow coverage map for G5 runtime evidence. |

## Runtime Evidence Still Required

G5 cannot close until the following evidence exists in implementation PRs:

1. TimeEntry requires tenant, actor, Matter, role, work date, narrative, status,
   and audit trace, and blocks entries against closed or unauthorized matters.
2. RateCard effective dates and FeeTerms-to-Billing mapping produce deterministic
   rate overrides without mutating the source engagement or Party profile.
3. Time entry submit/approve/lock transitions are role-bound and audit-bound.
4. Expense and Disbursement records require matter trace, billable flag, and DMS
   evidence references without exposing document bytes or raw storage paths.
5. WIP generation only consumes approved time/expense/disbursement rows and
   creates immutable pre-bill snapshots.
6. PreBill review requires partner approval and adjustment evidence before invoice
   issue.
7. Write-down/write-off workflows require approval and never edit issued invoice
   lines directly.
8. Invoice issue is idempotent, invoice-line generation reconciles to WIP, and
   issued invoices move through correction or credit/revised invoice flows.
9. TaxInvoice issue, transmit, retry, failure, and correction flows are idempotent
   and reconcile to invoice state.
10. Payment import is idempotent, preserves imported/unmatched state, and supports
    partial matching without duplicate cash recognition.
11. ARBalance and AR aging read models derive from invoice/payment ledger events
    and do not become editable source objects.
12. JournalEntry, accounting export, and VAT/tax export are balanced, period
    locked, tenant-scoped, and audit-bound.
13. SettlementRun, OriginationCredit, and WorkingCredit flows require allocation
    sum validation, approval, lock, reversal, and direct-edit blocking.
14. Billing and Finance UI states mask role-restricted amounts, narratives,
    payment details, export payloads, and settlement allocations.
15. R-001, R-006, R-013, R-014, and R-015 remain explicit G5 control
    requirements.
16. G5 closeout records command output, PR state, G1/G2/G3/G4 evidence
    disposition, and human review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G5-A | `LFOS-G5-W07-T001`-`LFOS-G5-W07-T006` | `codex/lawos-g5-time-expense-foundation` | TimeEntry, RateCard, FeeArrangement mapping, time-entry API, Expense, Disbursement | Matter required, effective dates, rate override, submit/approve/lock, evidence document, billable flag tests. |
| G5-B | `LFOS-G5-W07-T007`-`LFOS-G5-W07-T010` | `codex/lawos-g5-wip-prebill-adjustment` | WIP generation, WIP lock snapshot, PreBill, write-down/write-off workflow | Approved time creates WIP, immutable snapshot, partner review, adjustment approval tests. |
| G5-C | `LFOS-G5-W07-T011`-`LFOS-G5-W07-T016` | `codex/lawos-g5-invoice-tax-billing-ui` | Invoice, invoice line generation, TaxInvoice, correction workflow, Billing UI, G5 Billing closeout | Idempotent issue, WIP reconciliation, issue/transmit/fail, direct edit blocked, role masking, time-to-invoice evidence. |
| G5-D | `LFOS-G5-W08-T001`-`LFOS-G5-W08-T005` | `codex/lawos-g5-payment-ar-foundation` | Payment schema, payment import, matching, ARBalance, AR aging read model | Imported/unmatched state, duplicate import idempotency, partial match, invoice issue creates AR, aging bucket tests. |
| G5-E | `LFOS-G5-W08-T006`-`LFOS-G5-W08-T008` | `codex/lawos-g5-accounting-tax-export` | JournalEntry, accounting export, VAT/tax export | Balanced entry, export audit, period lock tests. |
| G5-F | `LFOS-G5-W08-T009`-`LFOS-G5-W08-T014` | `codex/lawos-g5-settlement-finance-ui-closeout` | SettlementRun, OriginationCredit, WorkingCredit, settlement approval, Finance UI, G5 Finance closeout | Run lock, allocation sum, role allocation, posted run direct-edit block, permission masking, invoice-to-payment evidence. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G5-W07-T001` | TimeEntry schema | Matter required test. |
| `LFOS-G5-W07-T002` | RateCard schema | Effective date test. |
| `LFOS-G5-W07-T003` | FeeArrangement integration | Rate override test. |
| `LFOS-G5-W07-T004` | Time entry API | Submit/approve/lock test. |
| `LFOS-G5-W07-T005` | Expense schema/API | Evidence document test. |
| `LFOS-G5-W07-T006` | Disbursement schema/API | Billable flag test. |
| `LFOS-G5-W07-T007` | WIP generation service | Approved time creates WIP. |
| `LFOS-G5-W07-T008` | WIP lock snapshot | PreBill snapshot immutable. |
| `LFOS-G5-W07-T009` | PreBill schema/API | Partner review test. |
| `LFOS-G5-W07-T010` | Write-down/write-off workflow | Approval required test. |
| `LFOS-G5-W07-T011` | Invoice schema/API | Idempotent issue test. |
| `LFOS-G5-W07-T012` | Invoice line generation | WIP-to-invoice reconciliation. |
| `LFOS-G5-W07-T013` | TaxInvoice schema/API | Issue/transmit/fail test. |
| `LFOS-G5-W07-T014` | Invoice correction workflow | Direct edit blocked test. |
| `LFOS-G5-W07-T015` | Billing UI | Role-based detail masking. |
| `LFOS-G5-W07-T016` | G5 Billing closeout | Time-to-invoice evidence. |
| `LFOS-G5-W08-T001` | Payment schema | Imported/unmatched state test. |
| `LFOS-G5-W08-T002` | Payment import API | Duplicate import idempotency. |
| `LFOS-G5-W08-T003` | Payment matching service | Partial match test. |
| `LFOS-G5-W08-T004` | ARBalance model | Invoice issue creates AR. |
| `LFOS-G5-W08-T005` | AR aging read model | Bucket calculation test. |
| `LFOS-G5-W08-T006` | JournalEntry model | Balanced entry test. |
| `LFOS-G5-W08-T007` | Accounting export API | Export audit test. |
| `LFOS-G5-W08-T008` | VAT/tax export | Period lock test. |
| `LFOS-G5-W08-T009` | SettlementRun model | Run lock test. |
| `LFOS-G5-W08-T010` | OriginationCredit model | Allocation sum test. |
| `LFOS-G5-W08-T011` | WorkingCredit model | Role allocation test. |
| `LFOS-G5-W08-T012` | Settlement approval workflow | Posted run direct edit blocked. |
| `LFOS-G5-W08-T013` | Finance UI | Permission masking test. |
| `LFOS-G5-W08-T014` | G5 Finance closeout | Invoice-to-payment evidence. |

## Entry Validation

```sh
npm run client-matter:g4:plan:validate
npm run client-matter:g4f:validate
npm run client-matter:g5:plan:validate
npm run rp11:time-expense-core:validate
npm run rp12:billing-core:validate
npm run rp13:payments-core:validate
npm run rp14:settlement-core:validate
npm run validate
```

The G5 plan validator confirms that all 30 G5 TUWs are represented, that
Time/Expense, Billing, Payments/AR, and Settlement descriptor evidence exists,
that R-001/R-006/R-013/R-014/R-015 controls are preserved, that G4 Matter/DMS
handoff remains required before revenue runtime, and that G5 runtime readiness
remains open.

## Gate Boundary

G5 remains open. Planning artifacts, descriptor catalogs, generated RP11/RP12/RP13/RP14 closeout packs, and contract validators are entry evidence only.

G5 must not claim Billing/Finance runtime readiness before G1, G2, G3, and G4 evidence is human-reviewed or explicitly stubbed behind fail-closed tests.
