# HRO-DEEL-PARITY Backend Contract Register

Date: 2026-06-23  
Program: `HRO-DEEL-PARITY`

## Boundary

This register covers Deel-visible People capabilities that must not be
presented as working Law Firm OS UI until a backend route contract, route
authorization policy, audit receipt model, verification case and evidence gate
exist. Korean SaaS feature names may still be used in status or planning UI,
but missing behavior must be marked as `구현 안됨` and must not expose working
forms, execution buttons, success states or provider-readiness claims.

The register is intentionally not a product menu. Current People UI exposure
remains limited to the implemented sections in `crosswalk-ledger.json`.

## Contract-Required Domains

| Feature | Status | Next TUW | UI Exposure |
| --- | --- | --- | --- |
| Workforce planning and bulk edit | backend contract required | `HRO-L3-W01-T01` | blocked |
| Engagement, learning and performance | backend contract required | `HRO-L3-W01-T02` | blocked |
| IT assets, apps and notification/admin settings | backend contract required | `HRO-L3-W01-T03` | blocked |

## External Owner-Decision Domains

| Feature | Status | Next TUW | Missing Receipts |
| --- | --- | --- | --- |
| Equity, benefits, immigration and background checks | external owner decision required | `HRO-L4-W01-T01` | legal owner approval, provider diligence, jurisdiction matrix, employee consent, retention/deletion policy, DPA |

## No-Fake-Working-UI Gate

The validator blocks the following People section ids as working menu/router/API
entrypoints until their matching contracts or owner receipts exist. If these
domains are shown in a planning/status surface, they must use the real Korean
SaaS feature name and show `구현 안됨` or owner-decision state.

- `people-workforce-planning`
- `people-bulk-operations`
- `people-job-requests`
- `people-referrals`
- `people-benefits`
- `people-equity`
- `people-immigration`
- `people-background-checks`
- `people-engagement`
- `people-learning`
- `people-performance`
- `people-surveys`
- `people-it-assets`
- `people-apps`
- `people-notification-admin`

## Verification

Run:

```bash
npm run hro:deel-parity:validate
```

That validator proves the register is present, every backend-missing or
external-owner feature is covered, and blocked People sections are absent from
the live menu, People router and HRX UI API client.
