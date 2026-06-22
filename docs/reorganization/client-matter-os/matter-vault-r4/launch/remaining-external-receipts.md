# Matter-Vault R4 Remaining External Receipts

Status: desktop-qa-complete-pending-final-go-live
Date: 2026-06-22

Owner release authority, external receipt execution authorization, production-equivalent desktop runtime smoke, pilot tenant dry-run migration operator receipt, and desktop screen QA have been recorded. The remaining gates are final go-live decision, real production app runtime business smoke, and post-cutover watch evidence.

## Remaining Receipts

| Receipt | Current State | Evidence File |
| --- | --- | --- |
| External production smoke | `passed_production_equivalent_desktop_runtime_smoke` | `launch/external-production-smoke-receipt.json` |
| Production migration operator | `passed_pilot_tenant_dry_run` | `launch/production-migration-operator-receipt.json` |
| Desktop screen QA | `passed` | `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa-result.json` |

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

The Matter IAM role/profile bootstrap is now created and STS-verified. A custom domain is not required for desktop-first internal or temporary release. A temporary synthetic Lambda runtime now exists behind AWS-generated `execute-api` URL `https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging`, with receipt `launch/aws-temporary-execute-api-receipt.json`. Operator token material is provisioned in `.env.matter-vault-r4.local` and AWS Secrets Manager `/matter/staging/operator-token`, and the Lambda verifies Bearer tokens by SHA-256 hash. Password/reset state is persisted in AWS Secrets Manager `/matter/staging/desktop-auth-state` so reset-confirm-login smoke does not depend on a single warm Lambda instance. Desktop login now requires password reset confirmation first: reset request, one-time reset confirmation, password login, `jwsuh@amic.kr` system-super-admin allow, and general-account admin denial have all passed against the temporary AWS runtime. Existing Vault admin profiles should not be reused directly for Matter cutover operation.

## Current Boundary

Repo evidence, owner release authority, local synthetic UAT, local migration dry-runs, production-equivalent desktop runtime smoke, pilot tenant dry-run migration operator receipts, and desktop screen QA are present. External production-equivalent desktop runtime smoke and pilot tenant dry-run migration operator receipts are present. Desktop screen QA is passed against the AWS temporary runtime, but actual launch/go-live completed and production-ready completed claims remain false.

Execution authorization is present for production-equivalent external smoke and pilot tenant dry-run migration only. The temporary runtime is synthetic and does not prove full R4 business smoke against a real production application runtime, real production migration operation, or real M365/Graph/Vault connectivity.
