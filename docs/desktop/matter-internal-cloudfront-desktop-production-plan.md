# matter Internal Desktop Production Plan

Status: cloudfront-desktop-runtime-routed
Date: 2026-06-24
Program ID: `MATTER-INTERNAL-DESKTOP-CF-LAMBDA`

This plan makes the no-custom-domain operating model explicit: internal users run the `matter` desktop app, the app talks to the AWS generated CloudFront HTTPS endpoint, and API requests are routed to AWS Lambda-backed runtimes. It does not claim public web launch, customer-data production readiness, enterprise trust certification, App Store distribution, Microsoft Store distribution, or custom-domain readiness.

Detailed TUW ledger: [matter-internal-cloudfront-desktop-tuw-breakdown.md](matter-internal-cloudfront-desktop-tuw-breakdown.md)

## Target Architecture

| Layer | Target |
| --- | --- |
| User surface | `matter` Electron desktop app |
| Web fallback | CloudFront temporary domain `https://d2mthcc8vp3cr2.cloudfront.net` |
| Runtime base URL | `MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net` |
| API edge | CloudFront behavior `api*` for app APIs, plus `health`, `api/desktop*`, and `api/matter-vault*` for desktop runtime |
| App API runtime | Lambda Function URL behind CloudFront, function `matter-lawos-api-prod` |
| Desktop auth runtime | API Gateway `matter-temp-desktop-api` stage `staging` behind CloudFront origin `matter-temp-desktop-api-origin`, Lambda function `matter-temp-desktop-runtime` |
| Static assets | Private S3 bucket `matter-lawos-web-prod-770880870480-apne2` |
| Internal account source | packaged Matter/Vault registered account seed plus HRX compatibility seed |
| Desktop session authority | Electron main process and OS secure store |
| Renderer authority | bounded session status only; no token or operator-token material |
| Custom domain | not required for internal desktop operation |

## Current Applied Baseline

| Area | Current State |
| --- | --- |
| CloudFront domain | `https://d2mthcc8vp3cr2.cloudfront.net` |
| Distribution | `E3MVAKX2DIR3CS`, status `Deployed` after desktop behavior routing |
| General API | `api*` and `api/health` route to Lambda Function URL `matter-lawos-api-prod` |
| Desktop runtime | `health`, `api/desktop*`, and `api/matter-vault*` route to API Gateway `73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging` |
| Desktop login smoke | PASS through CloudFront: 9 accounts, `jwsuh@amic.kr` super-admin login allow, `ytkim@amic.kr` login allow, admin restriction deny |
| Data boundary | synthetic-only; no real client data migrated or used |

## Completion Definition

Internal production is acceptable only when all of these are true:

| Gate | Required Evidence |
| --- | --- |
| CloudFront web/API endpoint | `GET /` and `GET /api/health` return 200 from `https://d2mthcc8vp3cr2.cloudfront.net` |
| Lambda runtime | `matter-lawos-api-prod` is `Active` and `LastUpdateStatus=Successful` with `LAWOS_DEPLOYMENT_COMMIT` equal to the latest runtime-bearing app/API commit, or current `origin/main` when runtime code changed |
| Internal account login | Desktop runtime supports email and password login through main-process IPC without returning secret fields to renderer |
| Account roster | Registered internal accounts are visible through `session:accounts`, and sensitive token/operator material is absent |
| Desktop package | macOS internal artifact and Windows internal manifest are generated under `apps/desktop/dist` |
| Desktop smoke | `npm --workspace apps/desktop run test:smoke`, `test:session`, and `test:file-bridge` pass |
| Runtime smoke | `npm run matter-desktop:aws-runtime:smoke` passes against the CloudFront base URL |
| API regression | `npm --workspace apps/api test` passes with 0 failures |
| Product smoke | Client/Matter/People/Vault route smoke passes through CloudFront |
| Boundary scan | no public release, store distribution, enterprise trust, custom-domain, or real-client-data claims are added |

## WP/TUW Plan

### WP01 CloudFront And Lambda Production Baseline

| TUW | Work | Acceptance | Verification |
| --- | --- | --- | --- |
| WP01-T01 | Freeze current deploy identity | `origin/main`, latest runtime-bearing commit, Lambda env commit, CloudFront distribution, S3 bucket, and Lambda Function URL are recorded | `git rev-parse origin/main`; `aws lambda get-function-configuration`; `aws cloudfront get-distribution` |
| WP01-T02 | Repackage Lambda from current main | zip includes `apps/api/src`, `packages`, package manifests, and packaged account seed | local package listing and Lambda update receipt |
| WP01-T03 | Redeploy Lambda | `matter-lawos-api-prod` reports `Active/Successful` | `aws lambda wait function-updated`; config query |
| WP01-T04 | Validate CloudFront API routing | CloudFront `/api/health`, HRX smoke, Client/Matter API examples pass | `curl`; bounded Node smoke script |
| WP01-T05 | Update production receipt | [aws-temporary-production-web-receipt.json](../launch/aws-temporary-production-web-receipt.json) references the final main commit | JSON parse and launch validators |
| WP01-T06 | Route desktop runtime through CloudFront | `health`, `api/desktop*`, and `api/matter-vault*` precede `api*` and target `matter-temp-desktop-api-origin` | `aws cloudfront get-distribution-config`; CloudFront desktop runtime smoke |

### WP02 Desktop Runtime Configuration

| TUW | Work | Acceptance | Verification |
| --- | --- | --- | --- |
| WP02-T01 | Define internal runtime env file | `.env.matter-vault-r4.local` points to CloudFront base URL, not API Gateway staging | `loadMatterVaultRuntimeConfig` smoke |
| WP02-T02 | Keep operator token main-process only | renderer never receives `operator_token`, `access_token`, `refresh_token`, password, or secret fields | `apps/desktop/test/auth-coordinator.test.mjs`; `aws-runtime-client.test.mjs` |
| WP02-T03 | Expose safe runtime status | `session:runtime` returns configured mode and base URL with `operatorTokenMaterialExposed=false` | `apps/desktop/test/session-ipc.test.mjs` |
| WP02-T04 | Add CloudFront smoke mode | runtime smoke verifies CloudFront `/api/desktop/*` and `/api/matter-vault/*` through the desktop runtime origin | `npm run matter-desktop:aws-runtime:smoke` with CloudFront env |

### WP03 Internal Account Login

| TUW | Work | Acceptance | Verification |
| --- | --- | --- | --- |
| WP03-T01 | Confirm account roster | all registered internal users are listable as safe public refs | `session:accounts`; no secret fields |
| WP03-T02 | Email/password login path | `session:login` accepts `{ email, password }` and returns bounded session state | `apps/desktop/test:session` plus runtime smoke |
| WP03-T03 | Password reset/setup path | reset request, latest reset email, confirm password reset, and login are tested for the highest-privilege account | `npm run matter-desktop:aws-runtime:smoke` |
| WP03-T04 | Negative account boundary | general/internal non-admin account cannot pass highest-privilege smoke | runtime smoke denial case |
| WP03-T05 | Session cleanup | logout clears secure store and renderer caches | `apps/desktop/test/session-cleanup.test.mjs` |

### WP04 Desktop App Packaging

| TUW | Work | Acceptance | Verification |
| --- | --- | --- | --- |
| WP04-T01 | Prepare packaged renderer | renderer bundle is prepared for desktop offline shell | `npm --workspace apps/desktop run prepare:web-renderer` |
| WP04-T02 | macOS internal package | DMG/ZIP/app bundle are generated and signed where credentials exist | `npm --workspace apps/desktop run build:mac` or notarized command |
| WP04-T03 | Windows internal manifest | Windows manifest and detached signature are generated | `npm --workspace apps/desktop run build:win` |
| WP04-T04 | Release manifest | `apps/desktop/dist/release/matter-desktop-internal-0.1.0/release-manifest.json` is regenerated | `node scripts/release-matter-desktop-temporary.mjs` |
| WP04-T05 | Release boundary | no public channel or store publishing is exposed | `node scripts/validate-matter-desktop-release-boundary.mjs`; `node scripts/validate-matter-desktop-no-public-release-claim.mjs` |

### WP05 Internal Pilot QA

| TUW | Work | Acceptance | Verification |
| --- | --- | --- | --- |
| WP05-T01 | Install smoke on maintainer Mac | app opens, login screen loads, sidebar/workspace renders, logout works | manual screenshot receipt |
| WP05-T02 | Internal account smoke | at least one highest-privilege account and one standard account are tested | smoke receipt with redacted account refs |
| WP05-T03 | Desktop workspace smoke | Client, Matter, People, and Vault surfaces load through packaged desktop renderer or approved CloudFront renderer | `matter-desktop:screen-qa` or manual pilot checklist |
| WP05-T04 | File bridge negative smoke | arbitrary path access is blocked; picker-only access remains | `npm --workspace apps/desktop run test:file-bridge` |
| WP05-T05 | Rollback drill | prior internal release artifact remains installable and current package can be removed | update rollback receipt |

### WP06 Operations And Rollback

| TUW | Work | Acceptance | Verification |
| --- | --- | --- | --- |
| WP06-T01 | Runtime rollback | previous Lambda zip and env commit are recorded before each deploy | deploy receipt |
| WP06-T02 | Desktop rollback | prior macOS ZIP/DMG and Windows manifest checksums stay in release manifest history | release manifest/checksums |
| WP06-T03 | Monitoring baseline | CloudFront health, Lambda invocation errors, and API smoke are checked after deploy | AWS CLI metrics or smoke commands |
| WP06-T04 | Account offboarding | disabled user cannot login; revoked account remains absent from allowed features | account smoke |
| WP06-T05 | Production boundary review | internal production remains distinct from public go-live and real-client-data readiness | launch validators and receipt non-claims |

## Runbook

1. Rebase or detach to `origin/main`.
2. Run API regression: `npm --workspace apps/api test`.
3. Build and upload web only when `apps/web` changed: `npm --workspace apps/web run build`, then S3 sync and CloudFront invalidation.
4. Repackage Lambda from main and update `matter-lawos-api-prod`.
5. Confirm Lambda `Active/Successful` and CloudFront `/api/health`.
6. Confirm CloudFront desktop behaviors route before `api*`:

```bash
aws cloudfront get-distribution-config --profile matter-staging-admin --id E3MVAKX2DIR3CS
```

Required behavior order includes `health`, `api/desktop*`, `api/matter-vault*`, then `api/health`, then `api*`.

7. Set desktop env for internal users:

```bash
MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net
MATTER_DESKTOP_RUNTIME_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net
MATTER_VAULT_R4_PRODUCTION_TENANT_ID=tenant_amic_matter_vault
```

8. Run desktop session/runtime smoke:

```bash
npm --workspace apps/desktop run test:session
npm --workspace apps/desktop run test:smoke
npm --workspace apps/desktop run test:file-bridge
npm run matter-desktop:aws-runtime:smoke
```

9. Build internal artifacts:

```bash
npm --workspace apps/desktop run build:mac
npm --workspace apps/desktop run build:win
node scripts/release-matter-desktop-temporary.mjs
```

10. Validate release boundaries:

```bash
npm run matter-desktop:temporary-release:validate
node scripts/validate-matter-desktop-temporary-release-bundle.mjs
node scripts/validate-matter-desktop-release-boundary.mjs
node scripts/validate-matter-desktop-no-public-release-claim.mjs
```

11. Record internal pilot evidence in [matter-desktop-temporary-release-receipt.md](matter-desktop-temporary-release-receipt.md) or a dated receipt under `docs/lazycodex/evidence/matter-desktop/`.

## Rollback Triggers

| Trigger | Action |
| --- | --- |
| CloudFront `/api/health` fails twice in a row | revert Lambda to previous zip/env commit |
| Login returns token/operator material to renderer | stop distribution, revoke package, fix sanitizer before retry |
| `tenant-b` or unrelated tenant sees `tenant-a` fixture rows | stop runtime, investigate seed isolation, redeploy previous Lambda |
| Desktop app cannot logout or clear session state | stop internal pilot package |
| macOS Gatekeeper or signing fails | hold package; do not distribute unsigned artifact |
| Windows manifest signature missing | hold Windows package |

## Non-Claims

- Custom domain required: false
- Public web launch: false
- External customer access: false
- Real client data migration: false
- Enterprise trust certification: false
- App Store distribution: false
- Microsoft Store distribution: false
- Final go-live approval: false
