# LCX-VLTUI-02.01 Vault Status Panel Proof

Generated at: 2026-06-29T12:22:53.928Z

Verdict: PASS

| Scenario | HTTP | Kind | Ready | Passed | Screenshot |
| --- | ---: | --- | --- | --- | --- |
| unconfigured-missing-token | 503 | guarded | false | true | docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-screenshots/lcx-vltui-02-01-unconfigured-missing-token.png |
| ready-synthetic-matter-app-api | 200 | data | true | true | docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-screenshots/lcx-vltui-02-01-ready-synthetic-matter-app-api.png |
| projection-only-blocked | 200 | data | false | true | docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-screenshots/lcx-vltui-02-01-projection-only-blocked.png |
| stale-projection-blocked | 200 | data | false | true | docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-screenshots/lcx-vltui-02-01-stale-projection-blocked.png |
| claim-boundary-blocked | 200 | data | false | true | docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-screenshots/lcx-vltui-02-01-claim-boundary-blocked.png |

## Boundary

- Synthetic browser route interception only.
- No customer document body, storage pointer, bearer token, or external provider write is used.
- This proof observes bridge-state rendering only and does not approve production use, public release, owner approval, or go-live.
