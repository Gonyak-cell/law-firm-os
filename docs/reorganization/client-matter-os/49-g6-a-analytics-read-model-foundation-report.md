# G6-A Analytics Read Model Foundation Report

TUWs: `LFOS-G6-W09-T001` through `LFOS-G6-W09-T005`

Branch: `codex/lawos-g6-analytics-read-model-foundation`

Base: `codex/lawos-g6-analytics-ai-portal-entry-plan`

This slice does not claim G6 runtime readiness. G6-A adds synthetic-only
descriptor evidence proving that AnalyticsEvent evidence requires no source
mutation, MatterProfitability evidence requires invoice/payment/time join
evidence, ClientProfitability evidence requires Party Master client group
aggregation, UtilizationMetric evidence requires capacity denominator evidence,
and RealizationMetric evidence requires billed versus standard value evidence
without opening runtime writes, database rows, audit appends, API handlers,
analytics runtime services, Matter P&L runtime services, WIP runtime services,
forecast runtime services, Billing source writes, Finance source writes,
Matter source writes, Party source writes, real client data, HR payroll data,
or analytics export files.

## Scope

G6-A depends on the G6 Analytics AI Portal entry plan and G5-F Finance closeout
evidence. It covers AnalyticsEvent, MatterProfitability, ClientProfitability,
UtilizationMetric, RealizationMetric, and read-model foundation closeout
evidence while preserving the RP15 descriptor-only no-runtime contract.

| File | Purpose |
| --- | --- |
| `packages/analytics/src/client-matter-g6.js` | Adds G6-A descriptor factories for AnalyticsEvent, MatterProfitability, ClientProfitability, UtilizationMetric, RealizationMetric, and read-model closeout evidence. |
| `packages/analytics/test/client-matter-g6-analytics-read-model-foundation.test.js` | Covers no source mutation, invoice/payment/time join, client group aggregation, capacity denominator, billed-versus-standard value, and no-runtime receipts. |
| `scripts/validate-client-matter-os-g6-a.mjs` | Validates the G6-A document, source, tests, package script, G6 plan dependency, RP15 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G6-W09-T001` | `createAnalyticsG6AnalyticsEventDescriptor()` requires source references and no source object mutation. | Proposed |
| `LFOS-G6-W09-T002` | `createAnalyticsG6MatterProfitabilityDescriptor()` requires invoice, payment, and time join evidence without source writes. | Proposed |
| `LFOS-G6-W09-T003` | `createAnalyticsG6ClientProfitabilityDescriptor()` requires Party Master ClientGroup aggregation and blocks duplicate client creation. | Proposed |
| `LFOS-G6-W09-T004` | `createAnalyticsG6UtilizationMetricDescriptor()` requires capacity denominator evidence and blocks HR payroll leakage. | Proposed |
| `LFOS-G6-W09-T005` | `createAnalyticsG6RealizationMetricDescriptor()` requires billed versus standard value evidence. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `evaluates_runtime_permission: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `dispatches_analytics_runtime: false`
- `dispatches_matter_pnl_runtime: false`
- `dispatches_wip_runtime: false`
- `dispatches_forecast_runtime: false`
- `mutates_source_object: false`
- `writes_billing_source: false`
- `writes_finance_source: false`
- `writes_matter_source: false`
- `writes_party_source: false`
- `g6_runtime_readiness_claim: "open"`
- `analytics_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g6a:validate`
- `npm --workspace @law-firm-os/analytics run test`
- `npm run client-matter:g6:plan:validate`
- `npm run rp15:analytics-core:validate`
- `npm run validate`
- `npm test`

## Non-Goals

- No AnalyticsEvent, profitability, utilization, realization, dashboard, or export record is persisted.
- No analytics, Matter P&L, WIP, forecast, or export runtime service is executed.
- No Billing, Finance, Matter, Party, DMS, HRX, or source object is mutated.
- No permission decision or audit event is written.
- No real client data, HR payroll data, analytics file, invoice document, payment payload, or time narrative is loaded.
- No draft PR is self-merged.
