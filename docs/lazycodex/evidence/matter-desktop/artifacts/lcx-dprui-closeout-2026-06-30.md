# LCX-DPRUI Closeout

Status: desktop_runtime_ui_ready
Date: 2026-06-30
Scope: packaged desktop login/reset surface only

## Implemented

- Added desktop auth modes: `sign_in`, `reset_requested`, `reset_confirm`, `reset_success`.
- Wired visible reset request and reset confirm UI through existing desktop session IPC/preload bridges.
- Added `matter://password-reset/confirm` route-only parser support and main-to-renderer reset handoff.
- Added packaged screen QA for sign-in, reset request, reset confirm empty, reset confirm deep-link, reset success, sign-in-after-success, and successful sign-in after password reset.
- Added LCX-DPRUI source trace, 20-click button matrix, secret-material grep, screen QA receipt, and closeout receipt.

## Verification

- `npm --workspace apps/desktop run test:smoke`: passed, 62/62.
- `npm --workspace apps/desktop run build:mac`: passed as internal package.
- `node scripts/run-lcx-dprui-packaged-screen-qa.mjs`: passed, 20 button clicks.
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`: passed.
- Secret-material grep over LCX-DPRUI artifacts: passed.

## Evidence

- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-00-source-trace.json`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-00-button-matrix.json`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-05-secret-material-grep.json`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-screen-qa-result.json`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-sign-in.png`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-reset-requested.png`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-reset-confirm-empty.png`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-reset-confirm-deeplink.png`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-reset-success.png`
- `docs/lazycodex/evidence/matter-desktop/artifacts/lcx-dprui-06-sign-in-after-success.png`

## Boundary

- Only the QA script calls `latestResetEmail`; the visible renderer does not call it.
- No reset URL, reset token value, password value, operator token, bearer token, or cookie material is rendered or logged in LCX-DPRUI artifacts.
- The internal mac build rebuilt from the current desktop and embedded web renderer sources. Formal release remains fail-closed.
- Production go-live: false.
- Public release: false.
- Owner final approval: false.
- Real external email delivery: false.
- OS protocol runtime receipt: false.
- Distribution signing/notarization approval: false.
