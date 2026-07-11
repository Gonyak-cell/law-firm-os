# Matter Worktree runtime debugging audit

## Hypothesis 1: stale or wrong packaged app is being exercised

- Runtime evidence: process `33933` resolves to `/Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`.
- Executable SHA-256: `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`, identical to `WT-04-07/packaged-restart-receipt.json`.
- Two-launch QA used the same exact bundle and restored `1/1` progress.
- Result: rejected.

## Hypothesis 2: an older Matter request can overwrite a newer selection

- Runtime evidence: actual Chromium QA changed practice area and Matter selection, then completed add/rename/archive/template exactly once each.
- Automated boundary evidence: `only the latest Matter selection may commit after out-of-order responses` and `a mutation response cannot commit after the user selects another Matter` passed.
- Result: rejected for current read and mutation paths.

## Hypothesis 3: Worktree duplicates completion state or audit writes across restart

- Runtime evidence: first launch changed the Task from `todo` to `done`; second launch restored `MatterTask.status=done`, checked UI, and `1/1 완료`.
- Durable audit count remained exactly 1 after the idempotent write path.
- Repository/API tests confirm no separate Worktree completion field and one audit event per idempotency key.
- Result: rejected.

## Current runtime conclusion

- Matching surface: actual Chromium plus exact packaged `matter.app`.
- Browser and package manual QA: PASS.
- Full repository regression: 4,244/4,244 PASS.
- Remaining open condition is not a runtime defect: G0 named-owner approval is absent.
