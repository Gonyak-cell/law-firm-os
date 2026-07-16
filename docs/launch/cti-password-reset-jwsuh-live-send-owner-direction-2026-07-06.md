# CTI Password Reset JWSUH Live Send Owner Direction

Direction ref: `I23-SCOPE-NARROWING-JWSUH-LIVE-SEND-ONLY-2026-07-06`

Recorded at: `2026-07-06T12:01:58.810Z`

Live reset email verification is narrowed to exactly one recipient: `jwsuh@amic.kr`.

The remaining 8 production users are logic-ready only: no production reset email send and no credential mutation under this direction.

This direction does not authorize plaintext password distribution, S5/S6, OIDC, DB conversion, production-ready claim, or go-live claim.
