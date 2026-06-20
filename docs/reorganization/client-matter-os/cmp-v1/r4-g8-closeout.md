# CMP R4 G8 Closeout

Gate: CMP-G8 Analytics Runtime.

Scope implemented:
- AnalyticsEvent contract, Matter profitability, Client profitability, Employee utilization, Realization metric.
- AR aging, Client health, Practice P&L dashboards, Analytics export control, read model refresh job.
- Analytics API contracts, live Analytics UI panel, tests, validator, and 14 evidence artifacts.

Verification targets:
- `node --test packages/analytics/test/runtime-services.test.js`
- `node --test apps/api/test/cmp-r4-g8-analytics.test.js`
- `npm --workspace apps/web run test:ui`
- `npm run client-matter:cmp-v1:g8:validate`

Claim boundary:
- G8 can claim R4 runtime-write-ready and R5/R6 owner-decision-ready evidence.
- G8 cannot claim production-ready, final go-live, or dashboard release approval before owner approval and release gates pass.
