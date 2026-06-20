# Matter-Vault R4 Remaining External Receipts

Status: blocked-pending-external-operator
Date: 2026-06-20

Owner release authority has been recorded for release/cutover progression. The remaining gates are external operator receipts, not repo-generated implementation evidence.

## Remaining Receipts

| Receipt | Current State | Evidence File |
| --- | --- | --- |
| External production smoke | `blocked_missing_external_environment` | `launch/external-production-smoke-receipt.json` |
| Production migration operator | `blocked_missing_operator_environment` | `launch/production-migration-operator-receipt.json` |

## Required Environment

| Variable | Purpose |
| --- | --- |
| `MATTER_VAULT_R4_PRODUCTION_BASE_URL` | Production or production-equivalent API base URL |
| `MATTER_VAULT_R4_PRODUCTION_TENANT_ID` | Tenant under operator-controlled smoke |
| `MATTER_VAULT_R4_OPERATOR_ACTOR` | Operator actor identity for audit |
| `MATTER_VAULT_R4_OPERATOR_TOKEN` | Operator credential supplied outside repo evidence |
| `MATTER_VAULT_R4_MIGRATION_WINDOW` | Migration window identifier for production migration receipt |

## Current Boundary

Repo evidence, owner release authority, local synthetic UAT, and local migration dry-runs are present. External production smoke and production migration operator receipts are absent, so actual launch/go-live completed and production-ready completed claims remain false.
