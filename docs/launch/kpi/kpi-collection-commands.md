# KPI Collection Commands

Status: synthetic_command_draft_blocked_pending_staging_runtime_dashboard_publication_and_target_approval
Work package: LT-L6-W06
TUW: LT-L6-W06-T03
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

These commands run the local synthetic aggregate KPI collector only. They do
not query staging, do not publish an operations dashboard, do not verify 24-hour
refresh, do not set KPI targets, and do not claim LT-L6-W06-T03 completion.

## Synthetic Collection Command

```sh
node apps/ops-kpi/collect.mjs --all
```

Expected synthetic-only properties:

| Property | Expected value |
| --- | --- |
| `kpi_count` | `7` |
| `null_value_count` | `0` |
| `synthetic_only` | `true` |
| `no_real_data` | `true` |
| `aggregate_only` | `true` |
| `raw_sensitive_fields_exposed` | `false` |
| `dashboard_published` | `false` |
| `auto_refresh_24h_verified` | `false` |

## Panel Definition Check

```sh
node - <<'NODE'
const fs = require('fs');
const panels = JSON.parse(fs.readFileSync('apps/ops-kpi/panels/dashboard-panels.json', 'utf8'));
console.log(JSON.stringify({
  panel_count: panels.panels.length,
  dashboard_published: panels.dashboard_published,
  auto_refresh_24h_verified: panels.auto_refresh_24h_verified,
  aggregate_values_only: panels.raw_data_policy.aggregate_values_only
}));
NODE
```

## Future Staging Command Slot

The future staging command must keep the same output shape as
`apps/ops-kpi/collect.mjs --all`, but its input source must come from approved
staging aggregate telemetry after LT-L2-W03, LT-L3-W06, and LT-L6-W06-T02 gates
are satisfied.

```sh
node apps/ops-kpi/collect.mjs --all --input <approved-staging-aggregate-kpi-input.json>
```

## UAT Reuse Notes

| UAT use | Current state |
| --- | --- |
| L7 UAT KPI collection command reference | synthetic command ready |
| G6 KPI dashboard publication evidence | pending staging dashboard |
| Target comparison | pending LT-L6-W06-T02 owner approval |
| 24-hour refresh proof | pending monitoring/ops dashboard scheduler |
