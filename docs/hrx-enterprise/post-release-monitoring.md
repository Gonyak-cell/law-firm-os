# HRX Post-Release Monitoring Plan

Status: PR-15 monitoring plan
Date: 2026-06-20

This monitoring plan defines the evidence owner review should require after any future approved release. It does not authorize go-live.

| Signal | Source | Alert condition | Owner |
| --- | --- | --- | --- |
| HRX route latency | `hrx.operation.latency_ms` | p95 exceeds SLO for two consecutive windows | Engineering |
| HRX route errors | `hrx.operation.error_count` | 5xx or safe-error spike above baseline | Engineering |
| Security decisions | `hrx.operation.security_count` and audit events | Missing counter for denied/step-up/cross-tenant route | Security |
| Audit integrity | HRX audit hash-chain validator | Any invalid previous hash or event hash | Security |
| Backup restore | `scripts/hrx-backup-restore-smoke.mjs` | Count mismatch or audit hash mismatch | Operations |
| UAT regression | `npm run web:e2e` | Any scenario failure | Product |

## On-Call Actions

1. Disable affected HRX feature flag.
2. Preserve audit and compliance evidence.
3. Run `npm run hrx:security:validate` and `node scripts/hrx-backup-restore-smoke.mjs --dry-run`.
4. Open owner decision record for rollback, continuation, or explicit deferral.
