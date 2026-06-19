# ADR-G0-001: BillingProfile Canonical Ownership

Status: Proposed
Date: 2026-06-19
Gate: `G0 Reorganization Gate`
TUW: `LFOS-G0-W00-T005`

## Context

The G0 ownership matrix left `BillingProfile` as the only explicit open
ownership decision because it sits between Party Master and Billing workflows.
The source package requires one canonical Party/Client identity model, while the
runtime roadmap also requires Billing to control WIP, pre-bill, invoice, tax
invoice, write-down, write-off, and revenue workflow states.

Current repo evidence points to Party & Relationship Master as the existing
canonical owner:

- `contracts/master-data-contract.json` includes `BillingProfile` in Master
  Data scope.
- `packages/master-data/src/registry.js` lists `BillingProfile` in
  MasterData-owned models.
- `packages/master-data/src/model.js` exposes
  `createMasterDataBillingProfile`.
- Billing package contracts and registries consume Matter, fee, WIP, invoice,
  and tax invoice workflow concepts rather than owning Party identity.

## Decision

`BillingProfile` canonical identity and billing-recipient profile ownership
belongs to `02 Party & Relationship Master`.

`07 Time / Expense / Billing` owns billing workflow state that references
`BillingProfile`, including FeeArrangement consumption, TimeEntry, WIP,
PreBill, Invoice, TaxInvoice, WriteOff, invoice line generation, and billing
adjustment workflows.

## Boundary

| Concern | Owner | Notes |
| --- | --- | --- |
| Billing recipient identity | Party & Relationship Master | One canonical profile per tenant/client context. |
| Tax/billing contact details | Party & Relationship Master | Referenced by Billing; updates audit through Master Data. |
| Legal client vs billing client distinction | Party & Relationship Master with Intake/Matter references | Engagement and Matter roles reference Parties and BillingProfile. |
| Fee terms | Intake / Engagement, consumed by Billing | FeeTerms are approved before Matter opening. |
| WIP/prebill/invoice state | Time / Expense / Billing | Billing owns revenue workflow state. |
| Payment/AR/settlement state | Finance / Payments / Settlement | Finance owns collection and settlement workflow state. |

## Options Considered

### Option A: Party Master Owns BillingProfile

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Duplicate-client risk | Low |
| Billing workflow autonomy | Medium |
| Conflict/search alignment | High |

Pros:
- Preserves single Party/Client identity.
- Prevents CRM/Billing/Conflict duplicate client drift.
- Matches current Master Data contract and model registry.
- Supports legal client, billing client, sponsor, SPC, and client group
  distinctions.

Cons:
- Billing workflows must reference BillingProfile rather than freely mutate it.
- Profile update approvals may require cross-module workflow coordination.

### Option B: Billing Owns BillingProfile

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Duplicate-client risk | High |
| Billing workflow autonomy | High |
| Conflict/search alignment | Low |

Pros:
- Billing can tune invoice-recipient data directly.
- Revenue workflow implementation may feel simpler initially.

Cons:
- Reintroduces duplicate client identity risk.
- Can drift from Party aliases, relationships, conflict data, and CRM profiles.
- Weakens the source package's single Party Master rule.

### Option C: Split Ownership

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Duplicate-client risk | Medium |
| Billing workflow autonomy | Medium |
| Conflict/search alignment | Medium |

Pros:
- Separates identity from operational state.

Cons:
- Easy to over-split into two client systems unless strictly enforced.
- Requires more reconciliation and migration rules during the first runtime
  build.

## Consequences

- BillingProfile changes require Master Data permission/audit checks.
- Billing commands reference BillingProfile by ID and snapshot selected fields
  into immutable billing artifacts only when legally/accounting-required.
- Invoice correction flows must not directly edit BillingProfile to repair an
  issued invoice.
- Migration must route duplicate billing recipients through Party duplicate
  review before invoice import.

## Validation Requirements

Later implementation PRs must include:

1. A `legal client vs billing client` test under G2 `LFOS-G2-W02-T009`.
2. A duplicate BillingProfile prevention or review-required test.
3. Billing tests proving invoices reference BillingProfile without owning Party
   identity.
4. Audit evidence for BillingProfile read/write and invoice snapshot use.

## Status Boundary

This ADR is proposed by the G0 planning lane. It does not by itself accept G0
or open any runtime write path. Human review still needs to accept or amend the
decision before G0 closeout.
