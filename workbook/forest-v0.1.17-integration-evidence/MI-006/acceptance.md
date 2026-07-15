# MI-006 Acceptance

Verdict: `PASS`

- entry SHA: `cc2db0b29200c50c2499c99a049b12f62c4a5177`
- entry tree: `ba5dd8ce5fb4e9142ffb1ae27834d661b3389688`
- refreshed `origin/main`: `fdd1e34a42ee11ad1e5049647048471be772f381`
- `origin/main` is an ancestor of the integration branch: yes
- audited critical paths: 155
- byte-identical paths: 121
- modified and semantically reviewed paths: 34
- missing or deleted critical paths: 0
- unresolved non-weakening decisions: 0
- targeted tests: 268 passed, 0 failed
- source/runtime validators: all final runs passed
- root checkout fingerprint: `02751feb70e89afbfb00acf1dac14092cdef0c071be736a55aa6c6982b60d93c` unchanged
- canonical packaged app PID `55090` remained running from the frozen v0.1.16 release worktree

The 34 changed paths do not silently replace `origin/main` controls. They either preserve the same guard with more coverage, strengthen the trust boundary, replace generic release paths with exact-SHA artifacts, or supersede an unsafe/retired contract with an explicitly documented safer contract. The per-path proof is `main-only-matrix.tsv`; the rationale is `semantic-review.md`.

## Boundaries

- The initial public-renderer PII command exited 1 because this clean integration worktree intentionally had no generated renderer. It was rerun against the PV-007 renderer built from product SHA `ab7868ebad5948a1b7341fe5bcbc48d8c0181a47`; there are zero non-`workbook/` changes between that product SHA and this entry SHA. The final result was PASS over 28 files. The temporary dependency/build symlinks were removed before evidence was written.
- `scripts/smoke-hrx-production.mjs` no longer treats caller-supplied role/scope headers as authenticated access. The public smoke now proves forged and missing sessions return 401. Authenticated roster validation is not claimed by MI-006 and remains a later staging/production evidence task.
- AWS live Lambda state was not refreshed because the device authorization expired. MI-001 remains `READY`; historical deployment receipts are not promoted to live truth.
- No production smoke that writes remote state, no production traffic change, no tag/release publication, and no employee/provider/bank/tax write was executed.
- macOS notarization and Windows native/AuthentiCode claims remain outside MI-006.
