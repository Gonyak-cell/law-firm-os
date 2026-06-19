# HRX Go-Live No-Go Checklist

Status: release-package-ready
Date: 2026-06-19

## Required Passes

| Gate | Command Or Receipt | Required State |
| --- | --- | --- |
| Runtime | `npm run hrx:runtime:validate` | Pass |
| Security negative tests | `npm run hrx:security:validate` | Pass |
| Enterprise readiness | `npm run hrx:enterprise:validate` | Pass |
| HRX UAT | `npm run web:e2e -- hrx` | Pass |
| Product contract | `npm run validate` | Pass |
| Backup/restore | `node scripts/hrx-backup-restore-smoke.mjs --dry-run` | Pass |
| Feature flags | `contracts/hrx-feature-flags.json` | Default disabled |
| Human release authority | Manual sign-off | Signed |

## Automatic No-Go

- Runtime, authz, audit, API, e2e, security, compliance, backup, or rollback gate fails.
- Any P0 item in HRX-P01 through HRX-P18 lacks current evidence.
- Feature flag default is enabled for a high-risk HRX module.
- Payroll execution is enabled.
- AI produces or stores final hire, fire, pay, evaluation, discipline, or termination decision.
- Any sensitive body, compensation amount, prompt, answer, client detail, or Matter detail leaks.
- Human release authority has not signed.

## Decision Record

| Field | Value |
| --- | --- |
| Release package | HRX-P01 through HRX-P18 |
| Prepared by | Codex implementation lane |
| Decision owner | Human release authority |
| Current decision | Not go-live authorized by automation |
