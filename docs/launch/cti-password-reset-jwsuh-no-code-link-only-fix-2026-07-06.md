# CTI Password Reset JWSUH No-Code Link-Only Fix

Status: `PASS_PATCHED_LINK_ONLY_RESET_UI_AND_RESENT_JWSUH`

Recorded at: `2026-07-06T14:27:13Z`

The password reset flow now uses the email link only. The desktop reset-confirm screen no longer exposes a setting-code input or manual token path, and the packaged temporary desktop runtime email/open-page template no longer displays reset token material as a user-entered code.

Patched files:

- `apps/desktop/src/renderer/offline.html`
- `apps/desktop/test/renderer-runtime-ui.test.mjs`
- `apps/api/src/matter-temp-desktop-runtime-lambda.mjs`
- `apps/api/test/matter-temp-desktop-runtime-lambda.test.js`

Verification:

- `node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js apps/api/test/lambda-session-secret.test.js apps/desktop/test/renderer-runtime-ui.test.mjs apps/desktop/test/aws-runtime-client.test.mjs apps/desktop/test/auth-coordinator.test.mjs apps/desktop/test/shell-smoke.test.mjs`: PASS, 45/45
- `npm --workspace apps/desktop run build:mac`: PASS, internal macOS bundle rebuilt at `apps/desktop/dist/mac/matter.app`
- Bundle/source grep for setting-code/manual-token UI strings: PASS, no matches
- Manual surface QA: PASS, `/tmp/matter-reset-link-only-final.png`
- `git diff --check -- apps/desktop/src/renderer/offline.html apps/desktop/test/renderer-runtime-ui.test.mjs apps/api/src/matter-temp-desktop-runtime-lambda.mjs apps/api/test/matter-temp-desktop-runtime-lambda.test.js`: PASS

Latest live-send receipt:

- Target: `jwsuh@amic.kr`
- Provider: `sesv2`
- Delivery status: `sent`
- Message id hash: `2c5fb585c65ab6f163bea1070978a939dedda8f81c5a3c3a54e86dcbc3e76b33`
- Token material returned: `false`
- Reset URL returned: `false`

Safety boundary:

- No token/password/secret values were printed or committed.
- No plaintext password distribution was performed.
- No reset email was sent to users other than `jwsuh@amic.kr`.
- No `production_ready` or go-live claim is made by this receipt.
