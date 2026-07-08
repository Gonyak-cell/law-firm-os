# CTI Password Reset Remediation Evidence

Status: `BLOCKED_MAIL_PROVIDER_AND_RESET_STORE_ENV_MISSING`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

## What Changed Locally

- Added production auth reset routes: `POST /api/auth/password-reset/request` and `POST /api/auth/password-reset/confirm`.
- Added `LAWOS_AUTH_PASSWORD_RESET_STORE_PATH` as a required durable operational store path for hash-only reset tokens.
- Added Lambda SESv2 reset email delivery adapter. It returns only delivery metadata, never token/reset URL material.
- Updated desktop runtime reset calls to use `/api/auth/password-reset/*`; the old latest synthetic email token surface now returns unavailable.
- Hardened production-disabled QA accounts so reset request and login remain rejected in operational auth.

## Verification

- `node --check apps/api/src/lambda.js && node --test apps/api/test/lambda-session-secret.test.js` PASS.
- `node --test scripts/test/matter-vault-backup-restore.test.mjs apps/api/test/session-auth-api.test.js apps/desktop/test/aws-runtime-client.test.mjs` PASS.
- `node scripts/validate-store-path-preflight.mjs` PASS.
- `node scripts/validate-cti-password-reset-remediation.mjs` PASS.

## Production Precheck

Checked `matter-lawos-api-prod` via `matter-prod-deploy-admin` without printing env values.

- `LAWOS_AUTH_PASSWORD_RESET_STORE_PATH`: missing.
- `LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY`: missing.
- `LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM`: missing.
- `LAWOS_AUTH_PASSWORD_RESET_BASE_URL`: missing.

## Boundary

No production code deploy, Lambda env mutation, production credential mutation, reset email send, S5, S6, OIDC, DB conversion, production-ready claim, or go-live claim was executed.

The prior private handoff/password distribution authority is treated as superseded for this remediation path. Plaintext temporary password distribution remains disallowed.

## Next Approval Needed

`I23` should approve the concrete production reset email delivery surface and env mutation:

- `LAWOS_AUTH_PASSWORD_RESET_STORE_PATH`, expected `/mnt/lawos/auth/password-reset-store.json`.
- SESv2 delivery enablement.
- Approved sender address.
- Approved reset base URL or deep link.
- Lambda IAM permission for `ses:SendEmail` scoped to the approved sender identity.
