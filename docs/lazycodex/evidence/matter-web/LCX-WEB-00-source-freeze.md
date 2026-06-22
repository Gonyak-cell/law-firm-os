# LCX-WEB-00 Source Freeze

Status: closed

## Closed TUWs

- W0-T00: `apps/web` declared as the only canonical product UI.
- W0-T01: external research folders, archived prototype UI folders, static reference screens, third-party product-style parity packs, and screenshot-parity packs excluded from UI source decisions.
- W0-T02: `apps/desktop/src/renderer/offline.html` scoped to auth/password-reset gate only.
- W0-T03: `npm run lcx-web:validate` validates the source freeze.

## Verification

- `npm run lcx-web:validate`: required

## Boundary

- production go-live: false
- public release: false
- owner approval: false
