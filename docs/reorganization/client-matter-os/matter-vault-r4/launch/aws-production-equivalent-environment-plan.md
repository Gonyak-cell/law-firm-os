# Matter-Vault R4 AWS Production-Equivalent Environment Plan

Status: temporary-synthetic-runtime-created-desktop-domain-nonblocking
Date: 2026-06-22

This packet starts the AWS production-equivalent environment lane for Matter-Vault R4 cutover evidence. It does not create production application infrastructure, print secrets, authorize public release, or claim actual production go-live. It now includes a temporary synthetic Lambda runtime behind an AWS-generated `execute-api` HTTPS URL for desktop/internal smoke only.

## Objective

Create an operator-owned AWS production-equivalent environment that can supply the two remaining external receipts:

| Receipt | Evidence File | Required State |
| --- | --- | --- |
| External production smoke | `launch/external-production-smoke-receipt.json` | PASS from production-equivalent smoke |
| Production migration operator | `launch/production-migration-operator-receipt.json` | PASS for pilot tenant dry-run migration |

## Current Boundary

Repo implementation evidence, owner release authority, and execution authorization are already present. Actual launch/go-live completed, production-ready completed, and public release claims remain false until operator receipts pass and post-cutover evidence exists.

Local AWS CLI was present during kickoff, but no default local AWS profile, access key, secret key, or default region was configured in this workspace. The existing local profiles are Vault-oriented, so this packet proceeds by creating Matter-specific IAM roles/profiles and resource namespaces inside the selected AWS account. The Matter IAM bootstrap has now been created and verified. A custom owned API domain is not required for desktop-first internal or temporary release. A temporary synthetic runtime has also been created for no-domain desktop smoke; this is not production infrastructure and uses no real client data.

## AWS Account Binding

| Item | Decision |
| --- | --- |
| AWS account | `770880870480` |
| Account strategy | Reuse the existing AWS account, but isolate Matter with dedicated IAM roles/profiles, resource names, logs, and cost tags |
| Region | `ap-northeast-2` |
| Profile | `matter-staging-admin`, created and STS-verified |
| Domain | Not required for desktop-first internal/temporary release. Placeholder only: `api.mater.example.com`; Route 53 hosted zone list was empty during preflight |
| Cost owner | `jws` or `firm/matter` |
| Deletion policy | `retained staging` |

## Matter IAM And Namespace Decisions

Use Matter-specific identities instead of reusing Vault admin profiles directly.

| Name | Purpose |
| --- | --- |
| `matter-staging-admin` | Staging/prod-equivalent provisioning and validation administration |
| `matter-prod-deploy-admin` | Production deployment administration |
| `matter-runtime-role` | Runtime service role for API, web, worker, storage, secrets, and logs |
| `matter-cutover-operator` | Cutover smoke and pilot tenant dry-run migration operator |
| `matter-readonly-auditor` | Read-only evidence, logs, cost, and configuration audit |

Recommended resource namespace:

| Namespace | Purpose |
| --- | --- |
| `/matter/staging/...` | Staging/prod-equivalent secrets and parameters |
| `/matter/prod/...` | Production secrets and parameters |
| `matter-staging-cluster` | Staging/prod-equivalent compute cluster |
| `matter-prod-cluster` | Production compute cluster |
| `matter-staging-postgres` | Staging/prod-equivalent database |
| `matter-prod-postgres` | Production database |
| `matter-api` | API service |
| `matter-web` | Web service |
| `matter-worker` | Worker service |
| `/matter/staging/api` | Staging/prod-equivalent API log group |
| `/matter/prod/api` | Production API log group |

Required tags:

| Tag | Value |
| --- | --- |
| `App` | `matter` |
| `Environment` | `staging` or `prod` |

## Matter Staging Admin Role Evidence

The `matter-staging-admin` IAM role was created in AWS account `770880870480` and the local AWS CLI profile `matter-staging-admin` was configured to assume it through the existing SSO admin source profile.

| Evidence | Value |
| --- | --- |
| Role ARN | `arn:aws:iam::770880870480:role/matter-staging-admin` |
| Source trust role | `arn:aws:iam::770880870480:role/aws-reserved/sso.amazonaws.com/ap-northeast-2/AWSReservedSSO_AdministratorAccess_d1cc17f134ec2921` |
| Local profile | `matter-staging-admin` |
| Region | `ap-northeast-2` |
| Attached policy | `arn:aws:iam::aws:policy/AdministratorAccess` |
| Tags | `App=matter`, `Environment=staging`, `CostOwner=jws`, `DeletionPolicy=retained-staging` |
| STS result | `arn:aws:sts::770880870480:assumed-role/matter-staging-admin/...` |

This is a staging/prod-equivalent provisioning role, not an application operator token. Tighten the policy before real production operation if the firm requires narrower least-privilege controls.

## Additional Matter Role Bootstrap Evidence

The remaining Matter IAM role names were also created so the AWS account no longer depends on Vault-named identities for Matter bootstrap.

| Role | ARN | Attached Policy |
| --- | --- | --- |
| `matter-prod-deploy-admin` | `arn:aws:iam::770880870480:role/matter-prod-deploy-admin` | `arn:aws:iam::aws:policy/AdministratorAccess` |
| `matter-cutover-operator` | `arn:aws:iam::770880870480:role/matter-cutover-operator` | `arn:aws:iam::aws:policy/ReadOnlyAccess` |
| `matter-readonly-auditor` | `arn:aws:iam::770880870480:role/matter-readonly-auditor` | `arn:aws:iam::aws:policy/ReadOnlyAccess` |
| `matter-runtime-role` | `arn:aws:iam::770880870480:role/matter-runtime-role` | `AWSLambdaBasicExecutionRole`, `AmazonECSTaskExecutionRolePolicy` |

Local AWS profiles were configured for `matter-prod-deploy-admin`, `matter-cutover-operator`, and `matter-readonly-auditor` with source profile `matter-staging-admin`.

These roles are bootstrap roles only. They do not create ECS, Lambda, RDS, S3, Secrets Manager, Route 53, ACM, or application runtime infrastructure by themselves.

## Temporary Synthetic Runtime Evidence

A no-domain AWS runtime now exists for desktop/internal smoke. It is intentionally synthetic: no database, storage bucket, M365/Graph connection, Vault external system connection, real client data, public release, or production go-live claim is included.

| Evidence | Value |
| --- | --- |
| Receipt | `launch/aws-temporary-execute-api-receipt.json` |
| API Gateway REST API | `matter-temp-desktop-api` |
| API ID | `73o8hpqpgl` |
| Stage | `staging` |
| Base URL | `https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging` |
| Lambda function | `matter-temp-desktop-runtime` |
| Lambda ARN | `arn:aws:lambda:ap-northeast-2:770880870480:function:matter-temp-desktop-runtime` |
| Lambda role | `arn:aws:iam::770880870480:role/matter-runtime-role` |
| Runtime mode | `aws-temporary-execute-api`, synthetic only |
| Operator token | Provisioned in `.env.matter-vault-r4.local` and AWS Secrets Manager `/matter/staging/operator-token`; token material is not printed or committed |
| Runtime auth | Bearer token required for `/api/desktop/*` and `/api/matter-vault/*`; Lambda verifies a SHA-256 hash, not plaintext token material |
| Account source | `launch/matter-vault-user-registration-seed.json` |
| Highest privilege account | `jwsuh@amic.kr` only |

Remote smoke currently passes for:

| Smoke | Result |
| --- | --- |
| `GET /health` | PASS, 9 registered accounts, custom domain not required, operator token configured |
| `POST /api/desktop/login` without token | PASS, denied with HTTP 401 |
| `POST /api/desktop/login` with invalid token | PASS, denied with HTTP 403 |
| `GET /api/desktop/accounts` with operator token | PASS, seed account list returned without token material |
| `POST /api/desktop/login` for `jwsuh@amic.kr` with operator token | PASS, `system_super_admin` returned without token material |
| `POST /api/matter-vault/smoke` for `ytkim@amic.kr` admin feature with operator token | PASS, denied with HTTP 403 |

## Read-Only AWS Preflight

Read-only STS checks confirmed that the existing Vault-oriented profiles can reach the selected AWS account and that the Matter-specific profile is now created locally.

| Profile | Read-Only Result |
| --- | --- |
| `amic-vault-staging-admin` | STS account `770880870480`, assumed role session `jws-admin` |
| `amic-vault-admin` | STS account `770880870480`, assumed role session `jws-admin` |
| `matter-staging-admin` | STS account `770880870480`, assumed role `matter-staging-admin` |

This confirms account reachability and Matter profile creation. It does not authorize using Vault admin profiles directly for Matter provisioning or cutover, and it does not supply an application `MATTER_VAULT_R4_OPERATOR_TOKEN`.

Route 53 hosted zone preflight returned an empty list for this account. A real owned API domain or external DNS delegation is still required before provisioning custom-domain HTTPS infrastructure, but it is not required for desktop-first internal release or AWS-generated staging API endpoints.

## Domain Decision For Desktop-First Release

The desktop app can be internally or temporarily released without a custom web domain. The desktop package already uses:

| Desktop Field | Value |
| --- | --- |
| Product name | `mater` |
| Internal app ID | `com.amic.mater.desktop.internal` |
| Artifact name | `mater-internal-${version}-${os}-${arch}.${ext}` |
| Publish channel | `null` |

Domain registration is required only for a custom public API or download URL. If a staging API endpoint is needed before a custom domain exists, use an AWS-generated HTTPS endpoint such as API Gateway's `execute-api` URL and keep `MATTER_VAULT_R4_PRODUCTION_BASE_URL` pointed at that temporary endpoint.

Domain availability preflight:

| Candidate | Availability |
| --- | --- |
| `mater.law` | `UNAVAILABLE` |
| `materos.com` | `UNAVAILABLE` |
| `materlegal.com` | `AVAILABLE` |
| `materlegal.io` | `AVAILABLE` |
| `usemater.com` | `AVAILABLE` |

No domain was registered. Domain registration requires a selected domain, registrant/contact details, and purchase approval.

Read-only preflight commands:

```bash
aws configure list
aws sts get-caller-identity
aws configure get region
```

Do not run custom-domain infrastructure create/update/delete AWS commands until the real owned API domain is confirmed. Non-domain staging infrastructure may use AWS-generated HTTPS endpoints.

## AWS Resources To Create

| Resource | Purpose | Receipt Input Produced |
| --- | --- | --- |
| Compute runtime, such as ECS/Fargate, Lambda, or EC2 | Runs the Matter-Vault R4 API/service surface | `MATTER_VAULT_R4_PRODUCTION_BASE_URL`; temporary synthetic Lambda already created for no-domain smoke |
| HTTPS ingress, such as ALB, API Gateway, or CloudFront | Provides TLS API endpoint | `MATTER_VAULT_R4_PRODUCTION_BASE_URL` |
| ACM certificate | TLS certificate for the API domain | HTTPS-only smoke requirement |
| Route 53 or approved DNS provider | Maps the domain to the ingress endpoint | Stable production-equivalent URL |
| RDS/Postgres or approved database | Stores tenant, matter, vault link, audit, and migration state | Tenant and migration evidence |
| S3 or approved object storage | Stores object-layer data without exposing raw storage paths to users | Document facade smoke evidence |
| Secrets Manager or SSM Parameter Store | Stores runtime credentials outside Git | Operator token and service credentials |
| CloudWatch logs and metrics | Records deployment, smoke, audit, and rollback evidence | Command/API evidence and monitoring |
| IAM roles and policies | Grants least-privilege access to runtime, DB, storage, and secrets | Operator access boundary |

## Required Matter-Vault Values

These values must be configured outside Git, either in `.env.matter-vault-r4.local` on the operator machine or in the approved secret manager:

| Variable | Source |
| --- | --- |
| `MATTER_VAULT_R4_PRODUCTION_BASE_URL` | AWS HTTPS ingress URL; currently set locally to the temporary `execute-api` base URL |
| `MATTER_VAULT_R4_PRODUCTION_TENANT_ID` | Tenant created in the production-equivalent app database; currently set locally to `tenant_amic_matter_vault` for synthetic smoke |
| `MATTER_VAULT_R4_OPERATOR_ACTOR` | Operator identity used for audit; currently set locally to `jwsuh@amic.kr` for synthetic smoke |
| `MATTER_VAULT_R4_OPERATOR_TOKEN` | Operator credential generated locally as a high-entropy secret, stored in `.env.matter-vault-r4.local` and AWS Secrets Manager `/matter/staging/operator-token`; Lambda verifies the SHA-256 hash |
| `MATTER_VAULT_R4_MIGRATION_WINDOW` | Human-approved migration window identifier; currently set locally to `internal-temporary-2026-06-22-aws-execute-api` |

The broader platform can use `MATTER_OPERATOR_TOKEN` or `MATTER_R4_OPERATOR_TOKEN` as a future naming convention, but the current repository validators expect `MATTER_VAULT_R4_OPERATOR_TOKEN`. Keep the existing key until a deliberate config migration updates validators and receipts together.

Local validation command:

```bash
npm run matter-vault:r4:local-secrets:validate
```

The validator reports only present/missing status and must not print secret values.

## Non-AWS Dependencies

AWS can host the environment, but these items must still be supplied outside AWS resource creation:

| Dependency | Owner |
| --- | --- |
| Operator actor and token | App or identity administrator |
| Production-equivalent tenant ID | Application administrator |
| M365/Graph/Vault permissions | Microsoft 365 or Azure administrator |
| Migration window approval | Cutover coordinator and owner |
| Rollback authority | Managing Partner or delegated launch owner |

## Execution Sequence

1. Bind AWS account `770880870480`, region `ap-northeast-2`, Matter profile `matter-staging-admin`, cost owner `jws` or `firm/matter`, and deletion policy `retained staging`.
2. Use the desktop-first temporary release path when no custom domain exists.
3. For API staging smoke before custom DNS, use an AWS-generated HTTPS endpoint and record it as temporary.
4. Create or map the Matter IAM roles/profiles: `matter-staging-admin`, `matter-prod-deploy-admin`, `matter-runtime-role`, `matter-cutover-operator`, and `matter-readonly-auditor`.
5. Select the AWS runtime shape and document the chosen components.
6. Provision production-equivalent infrastructure with least-privilege IAM and `App=matter` tags.
7. Deploy the current main commit to the AWS runtime.
8. Create a pilot tenant and record `MATTER_VAULT_R4_PRODUCTION_TENANT_ID`.
9. Create operator actor/token and store the token outside Git.
10. Configure `.env.matter-vault-r4.local` or the approved secret manager.
11. Run `npm run matter-vault:r4:local-secrets:validate`.
12. Run `npm run matter-vault:r4:launch:validate`.
13. Run external production smoke and attach receipt evidence.
14. Run pilot tenant dry-run migration and attach operator receipt evidence.
15. Keep actual launch/go-live completed false until cutover execution and post-launch watch evidence pass.

## Abort Conditions

Abort and record No-Go if any condition occurs:

| Condition | Required Action |
| --- | --- |
| Custom domain is requested but real owned API domain is not confirmed | Stop custom-domain provisioning |
| HTTPS endpoint is unavailable or not TLS-protected | Stop before smoke |
| Operator token cannot be stored outside Git | Stop before smoke |
| Tenant isolation fails | Stop and rollback |
| Ethical wall or legal hold bypass occurs | Stop and rollback |
| Raw document bytes or storage paths are exposed | Stop and rollback |
| Migration failed rows remain unadjudicated | Stop and rollback |
| Audit evidence is missing or mismatched | Stop and rollback |

## Completion Gate

This AWS environment lane is ready for cutover receipts only when all of the following are true:

| Gate | Required Evidence |
| --- | --- |
| AWS binding complete | Account `770880870480`, region `ap-northeast-2`, profile `matter-staging-admin`, cost owner, and deletion policy recorded |
| IAM isolation complete | Matter role/profile bootstrap verified and Vault admin profiles not reused directly |
| Infrastructure deployed | Runtime URL, commit SHA, and deployment timestamp recorded |
| Local secrets ready | `npm run matter-vault:r4:local-secrets:validate` passes |
| Launch readiness ready | `npm run matter-vault:r4:launch:validate` passes |
| External smoke receipt ready | `launch/external-production-smoke-receipt.json` records PASS |
| Migration operator receipt ready | `launch/production-migration-operator-receipt.json` records PASS |
