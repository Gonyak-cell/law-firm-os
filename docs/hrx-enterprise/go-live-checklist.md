# HRX Go-Live No-Go Checklist

Status: go-no-go-template
Date: 2026-06-20

Current boundary: `runtime_api_evidence_only__durable_persistence_open`

This checklist is a PR-15 decision template. It is not go-live authorization and it does not claim `runtime_write_ready__durable_persistence_guarded`.

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
- Any P0 item in PR-00 through PR-15 lacks current evidence.
- Feature flag default is enabled for a high-risk HRX module.
- Payroll execution is enabled.
- AI produces or stores final hire, fire, pay, evaluation, discipline, or termination decision.
- Any sensitive body, compensation amount, prompt, answer, client detail, or Matter detail leaks.
- Human release authority has not signed.

## Decision Record

| Field | Value |
| --- | --- |
| Release package | PR-00 through PR-15 |
| Prepared by | Codex implementation lane |
| Decision owner | Human release authority |
| Current decision | Not go-live authorized by automation |
