# RS-IDN terminal acceptance

- Terminal: `RS-IDN-010`
- Gate: `G7-IDN`
- Source SHA: `81593387661b40046fcdd91482397d74dbd6c3df`
- Verdict: `PASS`
- Allowed claim: `IDENTITY_LEDGER_SOURCE_VERIFIED`

## Accepted source behavior

1. The PostgreSQL identity migration creates tenant-scoped account, active-JTI session, expiring challenge, break-glass and append-only security-audit state under forced RLS.
2. The async identity repository uses v2 tenant transactions. It rejects invalid account state, stale credential revisions and secret-like audit or challenge metadata.
3. Concurrent failed-login updates reach the threshold exactly, produce one lock transition and do not lose a count.
4. Break-glass request, approval and revocation are state-checked, durable and audit-bound. Restart observation retained the approved state.
5. Session verification requires an active JTI, current account status and current credential revision. A second process observes revocation without restart.
6. Password-reset and step-up lifecycle state is hash-only, expiring, revocable and one-time. The provider-neutral step-up boundary fails closed and the local/internal adapter is explicit rather than an operational default.
7. Server logout commits session and challenge revocation before success and is idempotent: the first call reports `replayed=false`, a replay reports `replayed=true`, and the token then fails with `AUTH_SESSION_REVOKED`.
8. Desktop logout attempts server revocation and all local cleanup operations even when independent steps fail. It exposes neither tokens nor raw server errors and renders a bounded Korean warning for partial outcomes.
9. Exact-SHA browser QA observed both warning paths at 1440x900 and 1024x768 with warning tone, readable text and no horizontal overflow. This was current-source browser QA, not packaged-app or release evidence.
10. Exact-SHA validation passed VC-AUTH 24/24, PostgreSQL 10/10, persistence 66/66, Matter 191/191, API authority 8/8, API security 6/6, runtime-auth 18/18, desktop 44/44, security validators, writer coverage, 147-TUW governance, isolated preflight, web build, changed-surface sloplint and live disposable-PostgreSQL HTTP QA.

## Broad regression classification

The repository-wide suite passed 4513/4516 at the committed source SHA. The three failures are the existing clean-worktree Popbill external-receipt requirement (`.env.popbill.local` absent) and its two Wave-1 receipt cascades. The same failure family existed before the RS-IDN source commit. No credential file, test, receipt or production claim was added or weakened to hide that boundary. Test-generated tracked manual-QA artifacts were restored exactly to the source commit.

The isolated store-path preflight passed all five scenarios. Its first concurrent attempt only saw a temporary store owned by another still-running test process; that parallel-interference observation is retained separately and is not classified as a source failure.

## Boundary retained

This acceptance verifies the local source identity ledger only. `EXT-IDP` remains pending, and the IdP/MFA/passkey decision packet deliberately leaves provider, tenant, protocol, recovery, credential-transition and cutover decisions unapproved. It does not claim that an identity provider has been selected, configured or cut over.

No production database or provider was contacted. No real-client-data transfer, release, tag, package distribution, Windows signing, AWS mutation, staging or production migration, cutover or go-live action was executed. `idp_cutover_complete`, `production_ready` and `go_live` remain false.
