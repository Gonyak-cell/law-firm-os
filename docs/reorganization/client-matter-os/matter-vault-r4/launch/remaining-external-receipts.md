# Matter-Vault R4 Remaining External Receipts

Status: authorized-pending-external-environment
Date: 2026-06-21

Owner release authority and external receipt execution authorization have been recorded. The remaining gates are external operator receipts, not repo-generated implementation evidence.

## Remaining Receipts

| Receipt | Current State | Evidence File |
| --- | --- | --- |
| External production smoke | `authorized_pending_external_environment` | `launch/external-production-smoke-receipt.json` |
| Production migration operator | `authorized_pending_operator_environment` | `launch/production-migration-operator-receipt.json` |

## Required Environment

| Variable | Purpose |
| --- | --- |
| `MATTER_VAULT_R4_PRODUCTION_BASE_URL` | Production or production-equivalent API base URL |
| `MATTER_VAULT_R4_PRODUCTION_TENANT_ID` | Tenant under operator-controlled smoke |
| `MATTER_VAULT_R4_OPERATOR_ACTOR` | Operator actor identity for audit |
| `MATTER_VAULT_R4_OPERATOR_TOKEN` | Operator credential supplied outside repo evidence |
| `MATTER_VAULT_R4_MIGRATION_WINDOW` | Migration window identifier for production migration receipt |

## Local Secret File

Use `.env.matter-vault-r4.local` for local-only values. The committed `.env.matter-vault-r4.local.example` lists required keys, and `.env.matter-vault-r4.local` is ignored by Git. Validate local readiness with `npm run matter-vault:r4:local-secrets:validate`; the validator prints only present/missing status and never prints secret values.

## Current Boundary

Repo evidence, owner release authority, local synthetic UAT, and local migration dry-runs are present. External production smoke and production migration operator receipts are absent, so actual launch/go-live completed and production-ready completed claims remain false.

Execution authorization is present for production-equivalent external smoke and pilot tenant dry-run migration only. Operator environment values are still absent.
