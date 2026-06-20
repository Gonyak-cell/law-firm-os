# HRX Cutover And Rollback Runbook

Status: cutover-template
Date: 2026-06-20

Current boundary: `runtime_api_evidence_only__durable_persistence_open`

This runbook is a PR-15 release-control template. It is not a deployment receipt, go-live authorization, or current `runtime_write_ready__durable_persistence_guarded` claim.

## Preconditions

- `npm run hrx:runtime:validate` passes.
- `npm run hrx:security:validate` passes.
- `npm run hrx:enterprise:validate` passes.
- `npm run hrx:release:validate` passes.
- `npm run hrx:r4-claim:validate` passes with claim allowed false.
- `npm run hrx:launch-blockers:validate` passes.
- `npm run web:e2e -- hrx` passes.
- Feature flags in `contracts/hrx-feature-flags.json` remain disabled by default.
- Human release authority has reviewed the go-live no-go checklist.

## Cutover Steps

1. Freeze the release branch and record commit SHA.
2. Run migration rehearsal for HRX schema and confirm non-destructive migration behavior.
3. Enable `hrx_runtime_core` for the pilot tenant only.
4. Enable `hrx_people_portal` after employee, document, leave, approval, candidate, recruiting, policy, and audit API checks pass.
5. Enable `hrx_ai_analytics` only after AI review queue, source citation, and no-final-decision guard checks pass.
6. Keep `hrx_payroll_execution` disabled; payroll remains preview/export review only.
7. Run UAT smoke using `npm run web:e2e -- hrx`.
8. Record audit and compliance evidence.
9. Human release authority decides go/no-go.

Automation does not authorize go-live. The release authority must record a separate signed owner receipt before any production traffic, R4, or enterprise-ready claim.

## Rollback Steps

1. Disable `hrx_ai_analytics`.
2. Disable `hrx_people_portal`.
3. Disable `hrx_runtime_core`.
4. Preserve audit events and compliance report output.
5. Restore from the latest verified backup snapshot and compare record counts plus audit hash.
6. Run `node scripts/hrx-backup-restore-smoke.mjs --dry-run`.
7. Re-run `npm run hrx:runtime:validate` and `npm run validate`.

## No-Go Rollback Triggers

- Tenant isolation failure.
- Step-up challenge bypass for compensation, evaluation, payroll, audit, or final AI decision action.
- HR document body, prompt, answer, compensation amount, client, or Matter detail leakage.
- Any AI final decision for hire, fire, pay, evaluation, discipline, or termination.
- Backup/restore hash mismatch.
