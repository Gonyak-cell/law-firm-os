# CTI Password Reset Open Bridge Fix

Status: PASS

Generated at: 2026-07-06T13:05:50.251Z

## Root Cause

The reset email button pointed directly to `matter://password-reset/confirm?...`. Some mail clients block custom-protocol links, so the button could appear to do nothing.

## Fix

- Added `GET /api/auth/password-reset/open`.
- Changed the reset email button to open an HTTPS bridge page first.
- The reset token is carried in the URL fragment only, not as a server-side query string.
- The bridge page opens `matter://password-reset/confirm?...` from the browser and also shows a `Matter 열기` button.

## Production

- Lambda: `matter-lawos-api-prod`
- RevisionId: `a16bd482-1e5b-40dc-81ab-af9a1c629569`
- CodeSha256: `/scjpCQLqSy64jEcLIfAzBbeRuv3XlnOgIt/fUgygAk=`
- `LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL`: configured
- Open page probe: HTTP `200`
- Open page hash: `87c301cf1f15a0fbdccbba4af6de418b1d46fac9e95f3f5005aec722199efb10`

## Resend

- Target count: `1`
- Target domain: `amic.kr`
- SESv2 delivery status: `sent`
- SES message id hash: `8c840acc6009bfd8715413936a19d3bb08a3b068f8db48e66ab9274236eaa604`
- Non-jwsuh reset emails sent: no

The final production code patch after this resend only darkened the bridge-page secondary text. A second resend was not required because the email already points to the stable HTTPS open bridge URL.

No token, reset URL, password, secret value, production-ready claim, or go-live claim is recorded.
