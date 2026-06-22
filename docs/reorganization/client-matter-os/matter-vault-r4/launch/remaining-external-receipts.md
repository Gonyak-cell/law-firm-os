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

## AWS Production-Equivalent Environment Packet

The AWS kickoff packet is tracked in `launch/aws-production-equivalent-environment-plan.md`. It starts the production-equivalent environment lane under AWS account `770880870480`, region `ap-northeast-2`, profile name `matter-staging-admin`, and Matter-specific role/profile and resource namespace isolation, but does not create production application infrastructure, print secrets, authorize public release, or claim actual production go-live.

The Matter IAM role/profile bootstrap is now created and STS-verified. A custom domain is not required for desktop-first internal or temporary release. A temporary synthetic Lambda runtime now exists behind AWS-generated `execute-api` URL `https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging`, with receipt `launch/aws-temporary-execute-api-receipt.json`. Operator token material is provisioned in `.env.matter-vault-r4.local` and AWS Secrets Manager `/matter/staging/operator-token`, and the Lambda verifies Bearer tokens by SHA-256 hash. Existing Vault admin profiles should not be reused directly for Matter cutover operation.

## Current Boundary

Repo evidence, owner release authority, local synthetic UAT, and local migration dry-runs are present. External production smoke and production migration operator receipts are absent, so actual launch/go-live completed and production-ready completed claims remain false.

Execution authorization is present for production-equivalent external smoke and pilot tenant dry-run migration only. The temporary runtime is synthetic and does not prove real external production smoke, real migration operation, or real M365/Graph/Vault connectivity.
