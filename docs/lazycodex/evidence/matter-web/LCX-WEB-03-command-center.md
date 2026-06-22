# LCX-WEB-03 Live Command Center

Status: closed

## Closed TUWs

- W3-T00: `HomeSurface` is now the matter command center.
- W3-T01: every backend capability appears as a status card.
- W3-T02: cards expose live, unavailable, denied, review, guarded, and loading states.
- W3-T03: cards deep-link into the canonical `apps/web` route.
- W3-T04: no new mock metric source is used.

## Verification

- `npm --workspace apps/web run test:ui`: required
- `npm run lcx-web:validate`: required

## Boundary

- The command center displays backend state; it does not claim production readiness.
