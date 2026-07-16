# Matter Lambda Redeploy Receipt

Recorded at: 2026-07-05T08:25:31Z

Verdict: PASS

Deployment commit: `45b5fa374b294477c66f80197a426625ff9ba847`

## Lambda Targets

| Function | Runtime | Profile | Result | CodeSha256 |
| --- | --- | --- | --- | --- |
| `matter-lawos-api-prod` | `nodejs22.x` | `matter-prod-deploy-admin` | `Active`, `LastUpdateStatus=Successful` | `jkl9xM/hKo2p7Lkkw73Ubu7Tm+IZvh5wF7y0NxtN4b8=` |
| `matter-lawos-api-staging` | `nodejs22.x` | `matter-staging-admin` | `Active`, `LastUpdateStatus=Successful` | `jkl9xM/hKo2p7Lkkw73Ubu7Tm+IZvh5wF7y0NxtN4b8=` |
| `matter-temp-desktop-runtime` | `nodejs20.x` | `matter-staging-admin` | `Active`, `LastUpdateStatus=Successful` | `U0sKbsiUgnWhuf9eXITonGiFjUsemVaaSp3iHO1Imv0=` |

## Packages

| Package | Zip | SHA-256 | Bytes | Applied to |
| --- | --- | --- | --- | --- |
| API Lambda | `/tmp/matter-lawos-api-prod-45b5fa37-enterprise-remediation.zip` | `8e497dc4cfe12a8da9ecb924c3bdd46eeed39be219be1e7017bcb4371b4de1bf` | 3624254 | prod API, staging API |
| Desktop runtime | `/tmp/matter-temp-desktop-runtime-45b5fa37-seed11-v2.zip` | `534b0a6ec8948275a1b9ff5e5c84e89c68858d4b1e99569a4a9de21ced489afd` | 23343 | desktop temporary runtime |

The first desktop runtime package missed `matter-vault-account-registry.js` and returned `/health` 502. It was immediately replaced with the v2 package listed above before this receipt was recorded.

## Verification

| Check | Result |
| --- | --- |
| AWS Lambda inventory | Matter/LawOS functions in `ap-northeast-2`: `matter-lawos-api-prod`, `matter-lawos-api-staging`, `matter-temp-desktop-runtime` |
| Production CloudFront `/api/health` | PASS, `service=@law-firm-os/api`, bounded contexts 18 |
| Staging Function URL `/api/health` | PASS, `service=@law-firm-os/api`, bounded contexts 18 |
| Desktop execute-api `/health` | PASS, `service=matter-temp-desktop-runtime`, registered accounts 11 |
| Production smoke | PASS, 16 checks |

Evidence:

- `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.md`

## Boundary

- Lambda code and deployment-commit environment variables are updated.
- Bridge writes in the smoke are synthetic and idempotent only.
- Vault document write remains disabled and preflight-only.
- No secret values, real client data, public release, owner final approval, or company-wide go-live are claimed.
