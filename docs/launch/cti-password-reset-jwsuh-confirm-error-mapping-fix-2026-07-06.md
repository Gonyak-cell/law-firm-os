# CTI Password Reset JWSUH Confirm Error Mapping Fix

Status: `PASS_PATCHED_CONFIRM_ERROR_MAPPING_AND_RESENT_JWSUH`

Recorded at: `2026-07-06T15:02:48Z`

Observed symptom: the reset-confirm screen showed `비밀번호 설정을 완료하지 못했습니다.` even after a 12-character password was entered.

Diagnosis:

- The 12-character minimum rule is correct.
- A production invalid-token probe returned JSON with `reason=invalid_reset_token` and `AUTH_PASSWORD_RESET_TOKEN_INVALID`.
- The likely user path is an older reset email link: each new reset request revokes previous links, and several retries were sent during remediation.
- The desktop UI still needed stronger handling for 401, transport, and non-JSON failures so the user sees the actionable reason.

Patched files:

- `apps/desktop/src/main/aws-runtime.js`
- `apps/desktop/src/renderer/offline.html`
- `apps/desktop/test/aws-runtime-client.test.mjs`
- `apps/desktop/test/renderer-runtime-ui.test.mjs`

Verification:

- `node --test apps/desktop/test/aws-runtime-client.test.mjs apps/desktop/test/renderer-runtime-ui.test.mjs apps/desktop/test/auth-coordinator.test.mjs apps/desktop/test/shell-smoke.test.mjs apps/api/test/session-auth-api.test.js apps/api/test/lambda-session-secret.test.js`: PASS, 54/54
- `npm --workspace apps/desktop run build:mac`: PASS
- Patched strings are present in `apps/desktop/dist/mac/matter.app`
- Manual surface QA screenshot: `/tmp/matter-reset-confirm-error-mapping-fix.png`

Latest live-send receipt:

- Target: `jwsuh@amic.kr`
- Provider: `sesv2`
- Delivery status: `sent`
- Message id hash: `c950283b79c011f98b8f1bd251b37b43a219cdeea6e1218b780a5d805d1356be`
- Token material returned: `false`
- Reset URL returned: `false`

Operator instruction: use only the newest reset email sent after this receipt. Older reset links were revoked by later reset requests.

Safety boundary:

- No token/password/secret values were printed or committed.
- No plaintext password distribution was performed.
- No reset email was sent to users other than `jwsuh@amic.kr`.
- No `production_ready` or go-live claim is made by this receipt.
