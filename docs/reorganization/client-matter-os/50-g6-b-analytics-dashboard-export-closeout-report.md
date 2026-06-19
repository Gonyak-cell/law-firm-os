# G6-B Analytics Dashboard Export Closeout Report

TUWs: `LFOS-G6-W09-T006` through `LFOS-G6-W09-T010`

Branch: `codex/lawos-g6-analytics-dashboard-export-closeout`

Status: Proposed

## Summary

This slice does not claim G6 runtime readiness. G6-B adds synthetic-only
descriptor evidence for AR aging, client health, practice P&L, analytics
export controls, and the G6 Analytics closeout. It depends on G6-A read-model
foundation evidence and keeps all dashboard and export behavior read-model-only.

No dashboard record, export record, audit event, analytics runtime, billing
source, finance source, Matter source, Party source, or product state is
persisted by this slice.

## Scope

G6-B depends on the G6 Analytics AI Portal entry plan and the G6-A Analytics
read-model foundation. It covers AR aging dashboard finance permission,
client-health conflict and Matter detail omission, practice P&L role-based
visibility, analytics export audit and masking, and Analytics closeout
read-model-only evidence.

## Changed Files

| File | Purpose |
| --- | --- |
| `packages/analytics/src/client-matter-g6.js` | Adds G6-B descriptor factories for AR aging, client health, practice P&L, analytics export, and dashboard/export closeout evidence. |
| `packages/analytics/test/client-matter-g6-analytics-dashboard-export-closeout.test.js` | Covers finance permission, conflict/Matter detail omission, role visibility, export audit/masking/tenant scope, and no-runtime receipts. |
| `scripts/validate-client-matter-os-g6-b.mjs` | Validates the G6-B document, source, tests, package script, G6-A dependency, RP15 contract boundary, and descriptor behavior. |
| `docs/reorganization/client-matter-os/README.md` | Registers the G6-B report and validation command. |
| `package.json` | Exposes `client-matter:g6b:validate`. |

## TUW Evidence Map

| TUW | Evidence added | Runtime status |
| --- | --- | --- |
| `LFOS-G6-W09-T006` | `createAnalyticsG6ARAgingDashboardDescriptor()` requires finance AR read permission evidence and tenant-scoped AR aging rows. | Proposed |
| `LFOS-G6-W09-T007` | `createAnalyticsG6ClientHealthDashboardDescriptor()` requires conflict and Matter detail omission evidence. | Proposed |
| `LFOS-G6-W09-T008` | `createAnalyticsG6PracticePnlDashboardDescriptor()` requires role-based visibility evidence for practice P&L rows. | Proposed |
| `LFOS-G6-W09-T009` | `createAnalyticsG6AnalyticsExportControlDescriptor()` requires audit, masking, tenant scope, and read-model refs. | Proposed |
| `LFOS-G6-W09-T010` | `createAnalyticsG6BAnalyticsDashboardExportCloseoutDescriptor()` summarizes dashboard/export evidence while keeping runtime readiness open. | Proposed |

## Required Negative Evidence

- Missing finance permission blocks AR aging dashboard evidence.
- Conflict memo, conflict detail, internal Matter detail, or hidden Matter
  detail exposure blocks client-health dashboard evidence.
- Unauthorized role visibility blocks practice P&L dashboard evidence.
- Missing export audit, missing masking, missing tenant scope, missing
  read-model rows, or unmasked sensitive data blocks analytics export evidence.
- Any source mutation, dashboard runtime dispatch, or export runtime execution
  blocks G6-B evidence.

## Validation Commands

```sh
npm run client-matter:g6b:validate
npm --workspace @law-firm-os/analytics run test
npm run client-matter:g6a:validate
npm run client-matter:g6:plan:validate
npm run rp15:analytics-core:validate
npm run validate
npm test
```

## Boundary

- No AR aging, client health, practice P&L, analytics export, or closeout
  record is persisted.
- No analytics dashboard, export, Matter P&L, WIP, forecast, audit, Billing,
  Finance, Matter, Party, or product runtime service is executed.
- No source object is mutated.
- G6 runtime readiness remains open until stacked PRs are reviewed and G1
  through G5 evidence is accepted or explicitly stubbed behind fail-closed
  tests.
