# CMP R4 G7 Closeout

Gate: CMP-G7 Time / Billing / Finance Runtime.

Scope implemented:
- TimeEntry, RateCard, FeeArrangement, Expense, Disbursement runtime writes.
- WIP generation, WIP lock snapshot, PreBill, write-down/off, Invoice, InvoiceLine, TaxInvoice, InvoiceCorrection runtime.
- Payment import, payment matching, AR balance, AR aging, journal entry, accounting export, VAT/tax export.
- SettlementRun and origination/working credit runtime.
- File-backed persistence, idempotency, audit, finance API contracts, live Finance UI, tests, validator, and evidence.

Verification targets:
- `node --test packages/billing/test/runtime-services.test.js`
- `node --test apps/api/test/cmp-r4-g7-finance.test.js`
- `npm --workspace apps/web run test:ui`
- `npm run client-matter:cmp-v1:g7:validate`

Claim boundary:
- G7 can claim R4 runtime-write-ready and R5/R6 owner-decision-ready evidence.
- G7 cannot claim go-live, production-ready, final release readiness, or finance connector live approval before owner approval and release gates pass.
