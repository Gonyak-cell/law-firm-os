# CTI Password Reset JWSUH User Retry

Status: `PASS_RESET_EMAIL_RESENT_AND_CURRENT_DESKTOP_HANDLER_READY`

Recorded at: `2026-07-06T14:07:26Z`

Reason: user reported that login failed because the prior password reset had not completed.

Actions completed:

- Removed stale `matter://` handler registrations for old release-main and temporary desktop packages.
- Registered and launched the current app at `/Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app`.
- Verified the running process path is the current package, not `law-firm-os-release-main-c52`.
- Verified `matter://password-reset/confirm?...` opens the current reset-confirm screen using a fake token only.
- Restored the app to the normal login screen after the fake-token surface check.
- Sent one new password reset email to the approved jwsuh target.

Live-send evidence:

- Target email hash: `4443b93fddf0b956b9c0788da3e9e07ea69999cac2246a2b835f5f5cd48cc38e`
- Target domain: `amic.kr`
- Target count: `1`
- Lambda invoke status: `200`
- HTTP status: `200`
- Outcome: `accepted`
- Delivery provider/status: `sesv2` / `sent`
- Message id hash: `08839e6f28c3a4d0cf2ff553353ce5c4fcedafc368ac9bd8e0247a96d638d7f0`

Safety boundary:

- No non-jwsuh reset email sent.
- No password value recorded.
- No token value recorded.
- No reset URL recorded.
- No secret value recorded.
- No production_ready or go-live claim.

Next action: open the newest password reset email, click the button, set the new password in the current desktop app, and then log in with that new password.
