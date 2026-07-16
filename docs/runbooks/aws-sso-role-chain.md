# AWS SSO Role Chain

This repo already has a Matter AWS SSO/role-chain setup. Do not treat a default
profile `NoCredentials` response as proof that AWS SSO has never been configured.

## Current Local Profiles

As verified on 2026-07-05, the local AWS config uses this chain:

| Profile | Type | Account | Role | Source |
|---|---|---|---|---|
| `amic-vault-staging-admin` | SSO source | `770880870480` | `AdministratorAccess` | SSO session `amic-vault-staging` |
| `amic-vault-admin` | SSO source | `770880870480` | `AdministratorAccess` | SSO session `amic-vault` |
| `matter-staging-admin` | assume-role | `770880870480` | `matter-staging-admin` | `amic-vault-staging-admin` |
| `matter-prod-deploy-admin` | assume-role | `770880870480` | `matter-prod-deploy-admin` | `matter-staging-admin` |
| `matter-cutover-operator` | assume-role | `770880870480` | `matter-cutover-operator` | `matter-staging-admin` |
| `matter-readonly-auditor` | assume-role | `770880870480` | `matter-readonly-auditor` | `matter-staging-admin` |

The role ARNs are:

```text
arn:aws:iam::770880870480:role/matter-staging-admin
arn:aws:iam::770880870480:role/matter-prod-deploy-admin
arn:aws:iam::770880870480:role/matter-cutover-operator
arn:aws:iam::770880870480:role/matter-readonly-auditor
```

## Login And Verification

The Matter profiles do not login directly with `aws sso login --profile
matter-prod-deploy-admin`; they assume roles through the SSO source profile.

Use:

```bash
aws sso login --profile amic-vault-staging-admin
aws sts get-caller-identity --profile matter-prod-deploy-admin --no-cli-pager
```

Expected identity shape:

```text
arn:aws:sts::770880870480:assumed-role/matter-prod-deploy-admin/...
```

If the default command fails:

```bash
aws sts get-caller-identity
```

that only means the default profile is empty. Retry with the Matter profile:

```bash
aws sts get-caller-identity --profile matter-prod-deploy-admin --no-cli-pager
```

If SSO is expired, login the source profile:

```bash
aws sso login --profile amic-vault-staging-admin
```

Do not run `aws configure sso` or rewrite `~/.aws/config` unless the profile
chain is actually missing.

## Production Matter API

Use:

```bash
AWS_PROFILE=matter-prod-deploy-admin
AWS_REGION=ap-northeast-2
LAWOS_API_LAMBDA_FUNCTION_NAME=matter-lawos-api-prod
```

Check the Lambda without exposing secrets:

```bash
AWS_PROFILE=matter-prod-deploy-admin aws lambda get-function-configuration \
  --function-name matter-lawos-api-prod \
  --region ap-northeast-2 \
  --query '{FunctionName:FunctionName,LastModified:LastModified,State:State,LastUpdateStatus:LastUpdateStatus,Runtime:Runtime,CodeSha256:CodeSha256,RevisionId:RevisionId,DeploymentCommit:Environment.Variables.LAWOS_DEPLOYMENT_COMMIT,DeploymentMode:Environment.Variables.LAWOS_DEPLOYMENT_MODE,BridgeTokenPresent:Environment.Variables.LAWOS_VAULT_BRIDGE_TOKEN}' \
  --output json --no-cli-pager
```

Mask `BridgeTokenPresent` to a boolean before sharing output. Do not print or
persist `LAWOS_VAULT_BRIDGE_TOKEN`, AWS SSO tokens, access keys, cookies, or
session cache contents.

## Production Smoke Boundary

`npm run lcx:vltui:production-smoke` reads the bridge token from the production
Lambda environment through `scripts/lib/aws-sso-lambda-env.mjs` when credentials
are available. It also performs synthetic bridge upserts, so run it only after
confirming the deployed API commit supports the current bridge header contract.

The production Lambda is:

```text
matter-lawos-api-prod
```

The production CloudFront base URL used by the smoke script is:

```text
https://d2mthcc8vp3cr2.cloudfront.net
```

Keep the boundary explicit: AWS SSO login and STS assume-role success are
credential evidence; Lambda deploy and production smoke receipts are separate
write/verification steps.
