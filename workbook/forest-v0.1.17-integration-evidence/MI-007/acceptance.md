# MI-007 Acceptance

Verdict: `PASS`

- `INTEGRATION_SHA`: `4c81d861693472af48a680e5757b352bb9945b9b`
- integration tree: `628b370a9b09859250e91d3295a6cf4dabc05dd4`
- local annotated QA anchor: `forest-v0.1.17-integration-candidate-4c81d861`
- tag object: `55da09da4ea27342c44863f6633511c5df9b5e9f`
- tag target commit/tree: exact match
- refreshed `origin/main`: `fdd1e34a42ee11ad1e5049647048471be772f381`
- `origin/main` is the merge base and an ancestor of the integration candidate: yes
- non-`workbook/` changes since product SHA `ab7868ebad5948a1b7341fe5bcbc48d8c0181a47`: 0
- product tree digest parity: `ba5985c402f244cf717262818a8bdded65f9ad25eb0f051e0b00c03c3ab1b1f9`
- Git object integrity: PASS
- integration branch upstream: none
- matching remote tag: none
- root checkout fingerprint: `02751feb70e89afbfb00acf1dac14092cdef0c071be736a55aa6c6982b60d93c` unchanged
- canonical packaged app PID `55090` remained running from the frozen v0.1.16 release worktree

QA-001 through QA-009 must bind their source proof to the immutable local tag target above. Later evidence-only commits do not change `INTEGRATION_SHA`; any product-file change invalidates this candidate and requires a new MI-007 anchor.

## Boundaries

- This is a local integration QA anchor, not a formal release tag.
- The tag name intentionally does not use the `matter-desktop-v*` release namespace.
- The tag was not pushed. No pull request, `main` update, GitHub release, deployment, traffic change, production write, or go-live occurred.
- MI-001 live AWS truth remains `READY` because the AWS SSO device authorization expired.
- macOS formal distribution/notarization/stapling/Gatekeeper and Windows native/AuthentiCode evidence remain later QA gates.
- The candidate packages built earlier remain internal evidence only. The exact future `main` merge SHA must be rebuilt; candidate artifacts may not be promoted as final release artifacts.
