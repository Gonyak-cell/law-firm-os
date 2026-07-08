# CTI Password Reset Email Template Restoration

Status: PASS

Generated at: 2026-07-06T12:51:53.000Z

## Root Cause

The production LAWOS password reset delivery path was routed through a newly added SESv2 Simple email body instead of the existing designed raw MIME reset email template. That caused the live reset email to lose the designed card, internal security notice, button treatment, and inline logo surface.

## Fix

- Restored `apps/api/src/lambda.js` password reset delivery to SESv2 Raw MIME.
- Preserved the designed email surface: Korean reset heading, AMIC internal security notice, button, app-link fallback, expiry copy, and optional inline logo.
- Added regression assertions in `apps/api/test/lambda-session-secret.test.js` so the LAWOS path cannot silently fall back to `Content.Simple`.
- Added `apps/desktop/build/icon-source-mark.png` to CTI Lambda deployment zips used by password reset, CUTOVER retry, and S5 enrichment scripts.

## Production Deploy

- Lambda: `matter-lawos-api-prod`
- Region: `ap-northeast-2`
- RevisionId: `db3f384a-a750-4326-b6fe-a72a9f94f5ae`
- CodeSha256: `al2D6gNHIIGrylgW8RRqftyJL2ThVfqHG2pyGw/egKs=`
- LastModified: `2026-07-06T12:51:53.000+0000`
- Scope: code-only deploy
- Reset email sent during restoration: no

## Verification

- `node --check apps/api/src/lambda.js`: PASS
- `node --check scripts/run-cti-password-reset-jwsuh-live-send.mjs`: PASS
- `node --check scripts/run-cti-s5-enrichment-execute.mjs`: PASS
- `node --check scripts/run-cti-cutover-execute-retry.mjs`: PASS
- `node --test apps/api/test/lambda-session-secret.test.js apps/api/test/matter-temp-desktop-runtime-lambda.test.js`: PASS, 16/16
- `git diff --check -- apps/api/src/lambda.js apps/api/test/lambda-session-secret.test.js scripts/run-cti-password-reset-jwsuh-live-send.mjs scripts/run-cti-s5-enrichment-execute.mjs scripts/run-cti-cutover-execute-retry.mjs`: PASS

## Safety

- Token/password/secret/reset URL values printed or committed: no
- Plaintext PII evidence committed: no
- Non-jwsuh reset emails sent: no
- `production_ready` or go-live claim: no

LSP diagnostics were attempted, but the LSP transport returned `Transport closed`; syntax and targeted behavioral tests passed instead.
