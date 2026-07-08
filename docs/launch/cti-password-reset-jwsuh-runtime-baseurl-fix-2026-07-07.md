# CTI Password Reset JWSUH Runtime Base URL Fix

Status: `PASS_PATCHED_DESKTOP_RUNTIME_BASEURL_AND_RESENT_JWSUH`

Recorded at: `2026-07-07T00:13:16+09:00`

Root cause: the desktop app was still loading the ignored local Matter-Vault `execute-api /staging` runtime URL from `.env.matter-vault-r4.local`, while the reset email was issued by the production auth Lambda URL. The app was therefore opening the correct email link but posting the password-confirm request to the wrong server path.

Patched files:

- `.env.matter-vault-r4.local`
- `apps/desktop/src/main/aws-runtime.js`
- `apps/desktop/test/aws-runtime-client.test.mjs`

Verification:

- Loaded desktop config now resolves to `https://43whkpla74oln46xkmjar4jgae0ebzba.lambda-url.ap-northeast-2.on.aws`
- Runtime mode is `production-auth-http`
- Invalid-token confirm probe against the selected base URL returns JSON `401 invalid_reset_token`
- `node --test apps/desktop/test/aws-runtime-client.test.mjs apps/desktop/test/renderer-runtime-ui.test.mjs apps/desktop/test/auth-coordinator.test.mjs apps/desktop/test/shell-smoke.test.mjs apps/api/test/session-auth-api.test.js apps/api/test/lambda-session-secret.test.js`: PASS, 54/54
- `npm --workspace apps/desktop run build:mac`: PASS
- Running app bundle: `apps/desktop/dist/mac/matter.app`

Latest live-send receipt:

- Sent at: `2026-07-07T00:13:06+09:00`
- Target: `jwsuh@amic.kr`
- Provider: `sesv2`
- Delivery status: `sent`
- Message id hash: `93268590fc3e1add39e0af9eb9ab77a4730cced24aebbb2d560523950ac3287d`
- Token material returned: `false`
- Reset URL returned: `false`

Operator instruction: use only the newest reset email sent at or after `2026-07-07 00:13 KST`.

Safety boundary:

- No token/password/secret values were committed.
- No plaintext password distribution was performed.
- No reset email was sent to users other than `jwsuh@amic.kr`.
- No `production_ready` or go-live claim is made by this receipt.
