# CTI Password Reset JWSUH After 12-Char UI Fix

Status: `PASS_PATCHED_DESKTOP_AND_RESENT_RESET_EMAIL`

Recorded at: `2026-07-06T14:15:12Z`

Root cause:

- Production auth requires a minimum password length of `12`.
- Desktop reset UI still said `8` and only blocked passwords shorter than `8`.
- Desktop reset failure copy did not distinguish token used, token expired, token invalid, token missing, or production minimum-length responses.

Desktop patch:

- Updated reset copy and client-side validation to `12` characters.
- Added safe error mapping for `AUTH_PASSWORD_TOO_SHORT`, `AUTH_PASSWORD_RESET_TOKEN_INVALID`, `AUTH_PASSWORD_RESET_TOKEN_USED`, `AUTH_PASSWORD_RESET_TOKEN_EXPIRED`, and `AUTH_PASSWORD_RESET_TOKEN_REQUIRED`.
- Rebuilt `apps/desktop/dist/mac/matter.app`.
- Verified the current running app process is the rebuilt package.
- Verified the reset screen shows the `12` character requirement.
- Verified an 8-character fake-password attempt is blocked client-side with the `12` character message.
- Restored the app to the login screen.

Live-send evidence:

- Target email hash: `4443b93fddf0b956b9c0788da3e9e07ea69999cac2246a2b835f5f5cd48cc38e`
- Target domain: `amic.kr`
- Target count: `1`
- Lambda invoke status: `200`
- HTTP status: `200`
- Outcome: `accepted`
- Delivery provider/status: `sesv2` / `sent`
- Message id hash: `83c4bda39ca50a02741757144d38065801932c8f0cd59cd14e7991810e86d909`

Safety boundary:

- No non-jwsuh reset email sent.
- No password value recorded.
- No token value recorded.
- No reset URL recorded.
- No secret value recorded.
- No production_ready or go-live claim.

Next action: use the newest reset email generated after this patch, and choose a password of at least 12 characters.
