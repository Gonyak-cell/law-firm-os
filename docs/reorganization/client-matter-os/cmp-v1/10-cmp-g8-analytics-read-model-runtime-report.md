# CMP-G8 Analytics Read Model Runtime Report

Status: Implemented runtime API evidence
Date: 2026-06-20

## Scope

CMP-G8 implements 14 new CMP TUWs as an Analytics read-model bounded context.
It exposes executable synthetic read-model routes for profitability,
utilization, realization, dashboard, export, and KPI console projections while
proving no source mutation.

The runtime is read-model-only and projection-only. It does not persist source
objects, dashboard rows, read-model rows, export files, or source-system writes.
The durable-persistence boundary remains
`runtime_api_evidence_only__durable_persistence_open`.

## Runtime Routes

| Route | Purpose |
| --- | --- |
| `/api/analytics-read-models/runtime/evidence` | Returns CMP-G8 TUW coverage, dependency, guardrail, and descriptor evidence. |
| `/api/analytics-read-models/events` | Projects AnalyticsEvent evidence from source references without source mutation. |
| `/api/analytics-read-models/matter-profitability` | Projects MatterProfitability from time, invoice, and payment rows. |
| `/api/analytics-read-models/client-profitability` | Projects ClientProfitability by Party Master client group. |
| `/api/analytics-read-models/utilization` | Projects utilization from capacity denominator and time rows without HR payroll data. |
| `/api/analytics-read-models/realization` | Projects realization from billed versus standard value rows. |
| `/api/analytics-read-models/dashboards/ar-aging` | Projects AR aging dashboard with finance permission evidence. |
| `/api/analytics-read-models/dashboards/client-health` | Projects client health while omitting conflict and internal Matter detail. |
| `/api/analytics-read-models/dashboards/practice-pnl` | Projects practice P&L with role-visibility evidence. |
| `/api/analytics-read-models/exports` | Projects masked analytics export preview with audit reference and no export file write. |
| `/api/analytics-read-models/ui/kpi-console` | Projects KPI console tiles from read models without dashboard persistence. |
| `/api/analytics-read-models/source-mutation-test` | Negative test route proving source mutation attempts are blocked. |

## TUW Coverage

| CMP TUW | Runtime coverage |
| --- | --- |
| `CMP-G8-W08-T001` | AnalyticsEvent read-model evidence with source refs and no source mutation. |
| `CMP-G8-W08-T002` | MatterProfitability read model from time, invoice, and payment join evidence. |
| `CMP-G8-W08-T003` | ClientProfitability read model aggregated by client group without creating client identity. |
| `CMP-G8-W08-T004` | Utilization read model using capacity denominator without HR payroll data. |
| `CMP-G8-W08-T005` | Realization read model from billed versus standard value evidence. |
| `CMP-G8-W08-T006` | AR aging dashboard projection with finance permission evidence. |
| `CMP-G8-W08-T007` | Client health dashboard projection with conflict and Matter detail omission. |
| `CMP-G8-W08-T008` | Practice P&L dashboard projection with role visibility evidence. |
| `CMP-G8-W08-T009` | Analytics export control with audit reference, masking, tenant scope, and no file write. |
| `CMP-G8-W08-T010` | Dashboard/export closeout read-model-only evidence. |
| `CMP-G8-W08-T011` | KPI console projection tile coverage. |
| `CMP-G8-W08-T012` | Launch KPI reference projection for analytics dashboard handoff. |
| `CMP-G8-W08-T013` | Source mutation negative test coverage. |
| `CMP-G8-W08-T014` | Runtime evidence and no-premature-R4 boundary coverage. |

## Dependency And Guardrails

- CMP-G8 depends on `CMP-G1-W01` through `CMP-G7-W07`.
- All routes are read-model-only and projection-only.
- Source mutation negative tests block `mutates_source_object`,
  `writes_billing_source`, `writes_finance_source`, `writes_matter_source`,
  `writes_party_source`, and related source write attempts.
- Dashboard routes prove permission, detail omission, and role visibility
  without persisting dashboard rows.
- Export route proves masking, tenant scope, and audit reference without
  writing export files.
- KPI console route projects tiles only; it does not persist UI/dashboard state.

## Files

| File | Purpose |
| --- | --- |
| `apps/api/src/analytics-read-model-runtime-context.js` | Implements CMP-G8 read-model routes, source mutation guardrails, descriptor evidence, and KPI console projection. |
| `apps/api/src/server.js` | Registers `ANALYTICS_READ_MODEL_BOUNDED_CONTEXT` and routes `/api/analytics-read-models/*`. |
| `apps/api/test/cmp-g8-analytics-read-model-api.test.js` | Verifies health descriptor, source mutation blocking, read-model projections, dashboard guards, export masking, KPI console, and no R4 claim. |
| `scripts/validate-client-matter-os-cmp-g8-runtime.mjs` | Validates route coverage, TUW traceability, read-model-only markers, source mutation negative tests, no R4 claim, server wiring, and package script. |

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
npm run client-matter:cmp-g8:validate
npm --workspace apps/api run test
npm test
git diff --check
```

## Runtime Claim Boundary

The CMP-G8 implementation is executable API evidence for read models. It does
not claim source persistence, dashboard persistence, analytics database writes,
export file generation, source-system mutation, R4, production KPI readiness, or
go-live approval.
