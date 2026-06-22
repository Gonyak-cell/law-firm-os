# LCX-WEB-02 Desktop Post-login Handoff

Status: closed

## Closed TUWs

- W2-T00: Desktop session bridge remains main-process owned.
- W2-T01: login success triggers handoff to `web/index.html?desktop=1&view=home&data=live&ctx=allow`.
- W2-T02: `apps/web` build is prepared as `apps/desktop/src/renderer/web`.
- W2-T03: session material is not stored in localStorage, sessionStorage, indexedDB, or renderer token stores.
- W2-T04: desktop post-login product surface is `apps/web`, not the smoke shell.

## Verification

- `npm --workspace apps/desktop run test:smoke`: required
- `npm --workspace apps/desktop run prepare:web-renderer`: required

## Boundary

- The desktop auth shell is not product UI.
