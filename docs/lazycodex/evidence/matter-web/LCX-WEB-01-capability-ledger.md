# LCX-WEB-01 Backend Capability Ledger

Status: closed

## Closed TUWs

- W1-T00: API route inventory recorded in `apps/web/src/data/capabilityMap.js`.
- W1-T01: UI route inventory remains grounded in `apps/web/src/data/nav.js` and `apps/web/src/App.jsx`.
- W1-T02: GET and POST/action routes are separated per capability.
- W1-T03: audit endpoints are listed per capability family.
- W1-T04: uncovered capabilities fail validation instead of being hidden.

## Verification

- `npm run lcx-web:validate`: required

## Boundary

- The ledger displays capabilities; it does not execute privileged writes without backend permission.
