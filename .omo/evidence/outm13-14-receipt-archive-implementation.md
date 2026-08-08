# OUTM-13/14 receipt archive implementation evidence

Date: 2026-08-08
Base: `7c1fb381580b4f35863021950df6a9eee1597bb6`

## Production changes

- `apps/addin/src/outlook-operation-receipts.js` is a 248-line bounded archive. It stores only sanitized summaries, deduplicates on immutable item-context hash + Matter + operation/outcome/durable refs, applies deterministic count eviction, and uses local insertion-time `cachedAtMs`/`verifiedAtMs` for TTL while retaining immutable `completed_at` for provenance/order.
- `apps/addin/src/outlook-operation-receipt-controller.js` is a 125-line production controller. It owns an opaque hashed session-generation scope, quarantines completion against the current item/Matter, performs signed-session readback with one canonical `{ matter_id, current_item }` body, and restores only exact server summaries into the bounded archive.
- `apps/addin/src/outlook-operation-receipt-readback.js` accepts only the safe readback index fields and rejects unknown fields such as subject/body/participants/tokens/nested payloads.
- `apps/addin/src/main.jsx` delegates completion/recovery to the controller, quarantines stale completion without rollback, rotates/clears the archive on login/session recovery/401/logout/disconnect/unmount, and on reselect posts a signed-session readback assertion then restores only exact sanitized summaries before timeline/document intersection.
- `apps/api/src/outlook-addin-runtime-context.js` adds read-only `POST /api/outlook/operation-receipts/readback`. It accepts exactly one canonical nested `{ matter_id, current_item }` schema (flat fields, `item` aliases, mixed, and unknown fields fail closed), revalidates the signed tenant, Matter read permission and open gate, resolves canonical Graph identity through the existing M365 mail port, and reads persisted `DmsEmailThread`, DMS document, and Matter timeline refs. Raw IDs are accepted only in the assertion body; they are not returned, put in a URL, or logged. The route is absent from the idempotent mutation allowlist.

## Behavioral proof

1. `node --test apps/addin/test/outlook-operation-receipts.test.js`: **PASS 10/10** — ItemChanged A→B completion remains under A, B cannot read it, A+Matter durable ref intersection discovers it, replay is deterministic, count/TTL eviction is deterministic, rehydrated old `completed_at` receives a fresh injected-clock TTL, scope rotation has no token/tenant carryover, summaries contain no PII, and a fresh controller remount restores only exact sanitized readback data.
2. `node --test apps/api/test/outlook-operation-receipt-readback.test.js`: **PASS 3/3** — canonical nested captured-item assertions revalidate identity; flat, alias, mixed, and unknown schemas are safe empty; provider mismatch is safe empty, permission is deny without denied counts, and successful readback returns only item-context hash, Matter, operation/outcome, thread/document/timeline refs, and completed_at without mutating the repository.
3. `node --test --test-name-pattern='Outlook add-in routes' apps/api/test/outlook-addin-api.test.js`: **PASS 31/31** — existing canonical identity and filing/attachment/follow-up regression coverage remains green after factoring the resolver.
4. `npm --workspace apps/addin test`: **PASS 166/166**.
5. `npm --workspace apps/addin run build`: **PASS** — full/event/inquiry Vite builds and 2/2 artifact tests; existing >500 kB warning remains.
6. `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`: **PASS** — no auto-detectable AI slop signals.
7. `git diff --check 7c1fb381`: **PASS**.

The prior reviewer report at `.omo/evidence/outm13-14-final-code-review.md` was checked before this follow-up; its H1 write-only/unbounded/PII cache blocker and M1 source/comment wiring concern are addressed by the bounded controller/archive, actual controller behavior test, canonical route tests, and production build/test evidence above.
