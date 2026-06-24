# matter Internal CloudFront Desktop TUW Breakdown

Status: detailed-execution-plan
Date: 2026-06-24
Program ID: `MATTER-INTERNAL-DESKTOP-CF-LAMBDA`
Parent plan: [matter-internal-cloudfront-desktop-production-plan.md](matter-internal-cloudfront-desktop-production-plan.md)

This document decomposes the internal production model into testable units of work. The scope is the no-custom-domain internal desktop path. Company-internal users consume the packaged `matter` desktop app, so a brand-name custom domain is not required:

- CloudFront temporary domain: `https://d2mthcc8vp3cr2.cloudfront.net`
- General app API: `matter-lawos-api-prod`
- Desktop auth runtime: `matter-temp-desktop-api` -> `matter-temp-desktop-runtime`
- Desktop app: `matter` Electron internal package
- Login model: internal account email/password, with operator token retained in the desktop main process only

## LazyCodex / OMO CodeGraph Grounding

LazyCodex CodeGraph was used to map the executable surfaces before decomposition.

| Evidence | Source Surface | Planning Impact |
| --- | --- | --- |
| `createMatterVaultAwsRuntimeClient` | `apps/desktop/src/main/aws-runtime.js` | Defines the exact CloudFront runtime calls: `/health`, `/api/desktop/accounts`, password reset, login, `/api/matter-vault/features`, `/api/matter-vault/smoke`. |
| `MainProcessAuthCoordinator` | `apps/desktop/src/main/auth.js` | Owns main-process session state, account login, reset calls, feature smoke, logout, and renderer sanitization. |
| `registerSessionIpcHandlers` | `apps/desktop/src/main/session-ipc.js` | Exposes bounded desktop IPC entrypoints that must never leak token/operator/password material. |
| `matter-temp-desktop-runtime-lambda` | `apps/api/src/matter-temp-desktop-runtime-lambda.mjs` | Owns internal account roster, reset state, password login, feature decisions, and operator-token enforcement. |
| `smoke-matter-desktop-aws-runtime.mjs` | `scripts/smoke-matter-desktop-aws-runtime.mjs` | Provides the production-equivalent CloudFront runtime smoke for account roster, reset, login, admin allow, and general-account deny. |
| `release-matter-desktop-temporary.mjs` | `scripts/release-matter-desktop-temporary.mjs` | Regenerates internal release manifest and receipt while preserving no-public-release boundaries. |

Blast radius from CodeGraph:

- `login` in `apps/desktop/src/main/auth.js` is used by `apps/desktop/src/main/session-ipc.js`, `scripts/smoke-matter-desktop-aws-runtime.mjs`, `apps/web/src/components/AuthSurface.jsx`, and desktop auth/runtime tests.
- `smoke` in `apps/desktop/src/main/auth.js` is used by session IPC, runtime smoke, and screen QA.
- `createMatterVaultAwsRuntimeClient` is used by desktop main startup and the AWS runtime smoke scripts.

## Pyramid

| Level | Naming | Purpose |
| --- | --- | --- |
| Program | `MATTER-INTERNAL-DESKTOP-CF-LAMBDA` | Internal production model under CloudFront temporary domain. |
| Work Package | `MDCF-W01` to `MDCF-W09` | Observable rollout lane. |
| TUW | `MDCF-Wxx-Tyy` | Smallest independently testable implementation or operations unit. |
| Verification Case | `MDCF-VC-xxx` | Test, smoke, query, or manual QA receipt proving the TUW. |
| Evidence | receipt, command output, screenshot, AWS config, release manifest | Stored proof that survives handoff. |

## W01 CloudFront Edge And Origin Routing

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W01-T01 | Snapshot CloudFront distribution identity | Distribution id, domain, ETag, origins, and behavior order are captured before changes. | `MDCF-VC-CF-001`: `aws cloudfront get-distribution-config --profile matter-staging-admin --id E3MVAKX2DIR3CS` | `docs/launch/aws-temporary-production-web-receipt.json` |
| MDCF-W01-T02 | Lock default web origin | Default behavior stays on private S3 origin and does not route app shell traffic to API. | `MDCF-VC-CF-002`: CloudFront config query confirms default target origin. | AWS config excerpt |
| MDCF-W01-T03 | Lock general API origin | `api*` and `api/health` target `lawos-api-gateway-origin`. | `MDCF-VC-CF-003`: CloudFront behavior order query. | AWS config excerpt |
| MDCF-W01-T04 | Lock desktop runtime origin | `health`, `api/desktop*`, and `api/matter-vault*` target `matter-temp-desktop-api-origin`. | `MDCF-VC-CF-004`: CloudFront behavior order query. | AWS config excerpt |
| MDCF-W01-T05 | Preserve behavior precedence | Desktop runtime behaviors precede `api*`, preventing `/api/desktop*` from falling into the general API. | `MDCF-VC-CF-005`: sorted behavior query shows `health`, `api/desktop*`, `api/matter-vault*`, `api/health`, `api*`. | AWS config excerpt |
| MDCF-W01-T06 | Validate public health split | `/api/health` returns app API descriptor and `/health` returns desktop runtime health. | `MDCF-VC-CF-006`: bounded Node smoke over both endpoints. | production smoke receipt |
| MDCF-W01-T07 | Validate no custom domain dependency | All CloudFront smoke runs use `d2mthcc8vp3cr2.cloudfront.net`; no custom domain variable, brand-name domain, Route 53 hosted zone, ACM certificate, or owned DNS delegation is required. | `MDCF-VC-CF-007`: env-based smoke with CloudFront domain only. | production smoke receipt |

## W02 App API Lambda Runtime

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W02-T01 | Freeze deploy commit | `origin/main` SHA, latest runtime-bearing app/API SHA, and `LAWOS_DEPLOYMENT_COMMIT` are recorded with the Lambda config. | `MDCF-VC-API-001`: `git rev-parse origin/main`; `aws lambda get-function-configuration`. | launch receipt |
| MDCF-W02-T02 | Build Lambda package from repo source | Zip includes `apps/api/src`, `packages`, package manifests, and required seed JSON. | `MDCF-VC-API-002`: package listing and checksum. | deploy receipt |
| MDCF-W02-T03 | Deploy `matter-lawos-api-prod` | Lambda is `Active` and `LastUpdateStatus=Successful`. | `MDCF-VC-API-003`: Lambda waiter and config query. | launch receipt |
| MDCF-W02-T04 | Validate API health | CloudFront `/api/health` returns `status=ok` and bounded contexts. | `MDCF-VC-API-004`: Node fetch smoke. | launch receipt |
| MDCF-W02-T05 | Validate HRX People read | CloudFront HRX employees list returns 9 internal accounts with trusted HRX headers. | `MDCF-VC-API-005`: Node fetch smoke for `/api/hrx/employees`. | production smoke receipt |
| MDCF-W02-T06 | Validate HRX analytics | CloudFront HRX analytics returns aggregate headcount 9 without row-level leakage. | `MDCF-VC-API-006`: Node fetch smoke for `/api/hrx/analytics`. | production smoke receipt |
| MDCF-W02-T07 | Validate HRX AI advisory boundary | HRX AI returns `outcome=answered` and approved `source_refs`, without final-decision execution. | `MDCF-VC-API-007`: Node fetch smoke for `/api/hrx/ai/assistant`. | production smoke receipt |
| MDCF-W02-T08 | Validate Matter list permission path | CloudFront Matter list returns `outcome=passed` only with permission context. | `MDCF-VC-API-008`: Node fetch smoke for `/api/matters`. | production smoke receipt |
| MDCF-W02-T09 | Run app API regression | API suite passes without removing or weakening tests. | `MDCF-VC-API-009`: `npm --workspace apps/api test`. | terminal evidence |

## W03 Desktop Auth Runtime API

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W03-T01 | Confirm desktop runtime health | `/health` returns `service=matter-temp-desktop-runtime`, `registered_account_count=9`, and synthetic-only boundary. | `MDCF-VC-DTR-001`: CloudFront `/health` fetch. | launch receipt |
| MDCF-W03-T02 | Enforce operator token for runtime routes | `/api/desktop/accounts` without bearer returns 401 and no token material. | `MDCF-VC-DTR-002`: unauthenticated curl or runtime test. | smoke receipt |
| MDCF-W03-T03 | List internal account roster safely | Authenticated `/api/desktop/accounts` returns safe user refs and no password/token/operator fields. | `MDCF-VC-DTR-003`: runtime smoke and secret-field scan. | runtime smoke receipt |
| MDCF-W03-T04 | Request password reset | Reset request is accepted for known users without returning reset token material. | `MDCF-VC-DTR-004`: `requestPasswordReset` smoke. | runtime smoke receipt |
| MDCF-W03-T05 | Retrieve synthetic reset email | Latest reset email is available for internal smoke and uses `matter://password-reset/confirm`. | `MDCF-VC-DTR-005`: `latestResetEmail` smoke. | runtime smoke receipt |
| MDCF-W03-T06 | Confirm password reset | One-time reset token activates a password and returns no credential material. | `MDCF-VC-DTR-006`: `confirmPasswordReset` smoke. | runtime smoke receipt |
| MDCF-W03-T07 | Login highest-privilege account | `jwsuh@amic.kr` logs in with email/password and includes `system_super_admin`. | `MDCF-VC-DTR-007`: runtime smoke. | runtime smoke receipt |
| MDCF-W03-T08 | Login general internal account | A non-super-admin account logs in with email/password. | `MDCF-VC-DTR-008`: runtime smoke. | runtime smoke receipt |
| MDCF-W03-T09 | Deny general account admin feature | General account receives 403 deny for `matter_vault_admin`. | `MDCF-VC-DTR-009`: runtime smoke. | runtime smoke receipt |
| MDCF-W03-T10 | Bound reset state storage | Reset token/outbox state remains bounded for AWS Secrets Manager limits. | `MDCF-VC-DTR-010`: `apps/api/test/matter-temp-desktop-runtime-lambda.test.js`. | API test output |

## W04 Desktop Main Process Runtime Client

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W04-T01 | Load CloudFront runtime config | `loadMatterVaultRuntimeConfig` accepts CloudFront base URL and tenant id from env/local file. | `MDCF-VC-DMC-001`: `apps/desktop/test/aws-runtime-client.test.mjs`. | desktop test output |
| MDCF-W04-T02 | Require operator token in main process | Missing operator token disables runtime client; token is not exposed to renderer. | `MDCF-VC-DMC-002`: config error test and session IPC test. | desktop test output |
| MDCF-W04-T03 | Call desktop health through CloudFront | client `health()` calls `/health` with `authRequired=false`. | `MDCF-VC-DMC-003`: runtime client unit test plus CloudFront smoke. | desktop test output |
| MDCF-W04-T04 | Call account roster through CloudFront | client `accounts()` calls `/api/desktop/accounts` with bearer token. | `MDCF-VC-DMC-004`: runtime client unit test. | desktop test output |
| MDCF-W04-T05 | Call reset/login routes through CloudFront | client uses request/latest/confirm/login routes and sanitizes response. | `MDCF-VC-DMC-005`: `apps/desktop/test/aws-runtime-client.test.mjs`. | desktop test output |
| MDCF-W04-T06 | Call feature/smoke routes through CloudFront | client uses `/api/matter-vault/features` and `/api/matter-vault/smoke` with actor email. | `MDCF-VC-DMC-006`: runtime client test and smoke script. | desktop test output |
| MDCF-W04-T07 | Reject secret-bearing runtime response | Any forbidden field or operator token substring throws before renderer exposure. | `MDCF-VC-DMC-007`: runtime response guard test. | desktop test output |

## W05 Desktop Session IPC And Renderer Boundary

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W05-T01 | Expose runtime status safely | `session:runtime` returns configured base URL and `operatorTokenMaterialExposed=false`. | `MDCF-VC-IPC-001`: `apps/desktop/test/session-ipc.test.mjs`. | desktop test output |
| MDCF-W05-T02 | Expose account roster safely | `session:accounts` returns users without secret fields. | `MDCF-VC-IPC-002`: session IPC test. | desktop test output |
| MDCF-W05-T03 | Expose password reset request | renderer can request reset by email only. | `MDCF-VC-IPC-003`: session IPC test. | desktop test output |
| MDCF-W05-T04 | Expose reset confirmation | renderer can submit token/password; response remains sanitized. | `MDCF-VC-IPC-004`: session IPC test. | desktop test output |
| MDCF-W05-T05 | Expose email/password login | renderer submits `{ email, password }`; session state updates without token material. | `MDCF-VC-IPC-005`: auth coordinator and session IPC tests. | desktop test output |
| MDCF-W05-T06 | Expose feature smoke safely | renderer can request bounded feature smoke; admin denial remains visible as denial, not success. | `MDCF-VC-IPC-006`: session IPC and runtime smoke. | desktop test output |
| MDCF-W05-T07 | Clear session on logout | secure store and cache stores are wiped. | `MDCF-VC-IPC-007`: `apps/desktop/test/session-cleanup.test.mjs`. | desktop test output |
| MDCF-W05-T08 | Keep renderer API allowlisted | preload exposes no token storage or raw operator APIs. | `MDCF-VC-IPC-008`: preload source test. | desktop test output |

## W06 Desktop Packaging And Release Artifacts

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W06-T01 | Prepare packaged renderer | Desktop package uses approved renderer bundle, not an arbitrary remote URL. | `MDCF-VC-PKG-001`: `npm --workspace apps/desktop run prepare:web-renderer`. | build output |
| MDCF-W06-T02 | Build macOS app bundle | macOS `.app`, DMG, and ZIP are generated under `apps/desktop/dist`. | `MDCF-VC-PKG-002`: `npm --workspace apps/desktop run build:mac`. | release manifest |
| MDCF-W06-T03 | Verify macOS signing | Developer ID signing, strict codesign, Gatekeeper, and notarization evidence are present when credentials exist. | `MDCF-VC-PKG-003`: `node scripts/validate-matter-desktop-release-boundary.mjs`. | release boundary receipt |
| MDCF-W06-T04 | Build Windows internal manifest | Windows manifest and detached signature are generated without store-publication claims. | `MDCF-VC-PKG-004`: `npm --workspace apps/desktop run build:win`. | release manifest |
| MDCF-W06-T05 | Regenerate temporary release manifest | Release manifest records artifact checksums and no-public-release boundaries. | `MDCF-VC-PKG-005`: `node scripts/release-matter-desktop-temporary.mjs`. | `apps/desktop/dist/release/...` |
| MDCF-W06-T06 | Validate temporary release plan | Existing temporary release plan remains internally consistent. | `MDCF-VC-PKG-006`: `npm run matter-desktop:temporary-release:validate`. | validator output |
| MDCF-W06-T07 | Validate release bundle | Bundle metadata, checksums, and expected files are present. | `MDCF-VC-PKG-007`: `node scripts/validate-matter-desktop-temporary-release-bundle.mjs`. | validator output |
| MDCF-W06-T08 | Validate no public release claim | Docs and release receipt do not claim public release, go-live, or owner approval. | `MDCF-VC-PKG-008`: `node scripts/validate-matter-desktop-no-public-release-claim.mjs`. | validator output |

## W07 Desktop Product Surface QA

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W07-T01 | Launch packaged app on maintainer Mac | App starts, splash resolves, and login surface appears. | `MDCF-VC-QA-001`: manual screenshot receipt. | `docs/lazycodex/evidence/matter-desktop/` |
| MDCF-W07-T02 | Login highest-privilege account in app | Email/password login succeeds through packaged desktop UI. | `MDCF-VC-QA-002`: manual screenshot and redacted account ref. | QA receipt |
| MDCF-W07-T03 | Login general account in app | General account login succeeds without admin feature elevation. | `MDCF-VC-QA-003`: manual screenshot and feature deny receipt. | QA receipt |
| MDCF-W07-T04 | Verify Client surface | Client surface loads through packaged desktop renderer or approved CloudFront renderer. | `MDCF-VC-QA-004`: `matter-desktop:screen-qa` or manual screenshot. | QA receipt |
| MDCF-W07-T05 | Verify Matter surface | Matter workspace, command center, timeline, and Vault sections are reachable. | `MDCF-VC-QA-005`: screen QA or manual screenshot. | QA receipt |
| MDCF-W07-T06 | Verify People surface | People surface shows the 9 registered internal accounts. | `MDCF-VC-QA-006`: screen QA or manual screenshot. | QA receipt |
| MDCF-W07-T07 | Verify Vault surface | Vault document surface loads without raw storage field exposure. | `MDCF-VC-QA-007`: screen QA or manual screenshot. | QA receipt |
| MDCF-W07-T08 | Verify logout UX | Logout clears session and returns to login state. | `MDCF-VC-QA-008`: manual screenshot and session test. | QA receipt |
| MDCF-W07-T09 | Verify no scroll-page regression | Main app keeps SaaS shell layout rather than stacked scroll-only sections. | `MDCF-VC-QA-009`: screenshot comparison. | QA receipt |

## W08 File Bridge And Local Desktop Security

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W08-T01 | Keep arbitrary path reads blocked | Renderer cannot read arbitrary local paths. | `MDCF-VC-FB-001`: `npm --workspace apps/desktop run test:file-bridge`. | test output |
| MDCF-W08-T02 | Keep arbitrary path writes blocked | Renderer cannot write arbitrary local paths. | `MDCF-VC-FB-002`: file bridge tests. | test output |
| MDCF-W08-T03 | Require user gesture for picker | File picker opens only with scoped gesture token. | `MDCF-VC-FB-003`: file picker gesture tests. | test output |
| MDCF-W08-T04 | Keep upload metadata-only | Upload bridge returns backend-safe metadata, not raw bytes. | `MDCF-VC-FB-004`: upload bridge tests. | test output |
| MDCF-W08-T05 | Keep save-as main-process bounded | Main process fetches bytes only after permission precheck and user-selected destination. | `MDCF-VC-FB-005`: save-as tests. | test output |
| MDCF-W08-T06 | Clear temp previews | Temp preview cache is scoped and cleared on logout, tenant switch, and app quit. | `MDCF-VC-FB-006`: temp preview cleanup tests. | test output |
| MDCF-W08-T07 | Validate bridge contract | Contract allowlist matches implementation and forbidden actions are absent. | `MDCF-VC-FB-007`: `node scripts/validate-desktop-file-bridge-contract.mjs`. | validator output |
| MDCF-W08-T08 | Validate no silent scan | Directory watch, recursive scan, arbitrary path probes remain blocked or controlled. | `MDCF-VC-FB-008`: `node scripts/validate-matter-desktop-file-bridge.mjs`. | validator output |

## W09 Operations, Monitoring, And Rollback

| TUW | Work | Acceptance | Verification Case | Evidence Target |
| --- | --- | --- | --- | --- |
| MDCF-W09-T01 | Record app API rollback pointer | Previous `matter-lawos-api-prod` zip, commit, and Lambda revision are recorded before deploy. | `MDCF-VC-OPS-001`: deploy receipt. | launch receipt |
| MDCF-W09-T02 | Record desktop runtime rollback pointer | Previous `matter-temp-desktop-runtime` package and API Gateway stage are recorded before deploy. | `MDCF-VC-OPS-002`: desktop runtime receipt. | launch receipt |
| MDCF-W09-T03 | Record CloudFront rollback pointer | Previous distribution ETag and behavior list are captured before updates. | `MDCF-VC-OPS-003`: CloudFront config snapshot. | launch receipt |
| MDCF-W09-T04 | Run post-deploy smoke bundle | CloudFront API smoke, desktop runtime smoke, desktop session tests, and release boundary validators pass. | `MDCF-VC-OPS-004`: post-deploy command bundle. | launch receipt |
| MDCF-W09-T05 | Monitor Lambda errors | Lambda invocation errors and CloudFront 5xx remain within internal pilot threshold. | `MDCF-VC-OPS-005`: AWS metrics query. | monitoring receipt |
| MDCF-W09-T06 | Monitor auth denials | Missing/invalid operator token routes deny with 401/403 and no token material. | `MDCF-VC-OPS-006`: runtime smoke denial cases. | monitoring receipt |
| MDCF-W09-T07 | Test account offboarding | Revoked/disabled account cannot login, and feature access remains denied. | `MDCF-VC-OPS-007`: account lifecycle smoke. | account receipt |
| MDCF-W09-T08 | Test rollback drill | Prior app/runtime package can be restored and current package can be removed. | `MDCF-VC-OPS-008`: rollback drill receipt. | rollback receipt |
| MDCF-W09-T09 | Re-run claim boundary scan | No docs or release files claim public release, go-live, enterprise trust, app-store distribution, or real-client-data production. | `MDCF-VC-OPS-009`: release boundary validators. | validator output |

## Execution Order

1. `MDCF-W01` first, because all smoke paths depend on CloudFront behavior order.
2. `MDCF-W02` next, because Client/Matter/People/Vault app APIs depend on `matter-lawos-api-prod`.
3. `MDCF-W03` and `MDCF-W04` together, because desktop login requires both AWS runtime routes and the desktop main-process client.
4. `MDCF-W05` after `W04`, because IPC must expose only already-bounded main-process behavior.
5. `MDCF-W06` after runtime smoke, because packages should embed a known-good runtime target.
6. `MDCF-W07` after packaging, because manual QA must drive the packaged app surface.
7. `MDCF-W08` before internal distribution, because file bridge controls are local desktop risk controls.
8. `MDCF-W09` throughout every deploy and before any internal pilot expansion.

## Minimum Green Bundle Per Change

For any change touching this program, run at least:

```bash
npm --workspace apps/api test
npm --workspace apps/desktop run test:session
npm --workspace apps/desktop run test:smoke
npm --workspace apps/desktop run test:file-bridge
MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net MATTER_DESKTOP_RUNTIME_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net MATTER_VAULT_R4_PRODUCTION_TENANT_ID=tenant_amic_matter_vault npm run matter-desktop:aws-runtime:smoke
npm run matter-desktop:temporary-release:validate
node scripts/validate-matter-desktop-release-boundary.mjs
node scripts/validate-matter-desktop-no-public-release-claim.mjs
```

Add `npm --workspace apps/desktop run build:mac`, `npm --workspace apps/desktop run build:win`, and `node scripts/release-matter-desktop-temporary.mjs` when packaging or release artifacts change.

## Completion Boundary

This program can be called internally production-routed only when every required TUW above has evidence. It still must not claim:

- custom domain requirement
- brand-name custom domain requirement
- public web launch
- external customer access
- real client data migration
- enterprise trust certification
- App Store distribution
- Microsoft Store distribution
- final go-live approval
