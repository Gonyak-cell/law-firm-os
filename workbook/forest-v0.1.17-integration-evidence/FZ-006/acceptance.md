# FZ-006 Acceptance

- status: DONE
- entry_sha: `411d07e9a3bd6f4ffdabc04de3741480e2a4e8da`
- verification_commit_sha: `873ca9cc05c30f6df1475f3c9ffb9918e10fa667`
- Forest content checkpoint: `fbf7062398da1157ee1322d7440194c1b13f7e0f`
- tested patch SHA-256: `f09e58bb6671ae91fcd75d3e39fa1cd717a1452457a2a2c9ed0491c0e0a2a181`
- reproducible leave, migration, and route-authz suite: `193/193 PASS`
- isolated HRX runtime API suite: `27/27 PASS`
- unique leave/runtime scope: `220/220 PASS`
- payroll domain: `54/54 PASS`
- payroll API and canonical role matrix: `7/7 PASS`
- payroll Web UI: `3/3 PASS`
- Desktop AWS bridge and renderer runtime: `26/26 PASS`
- Desktop shell smoke, additional coverage: `18/18 PASS`
- global UI regression: `31/31 PASS`
- Web TypeScript: PASS
- desktop renderer preparation: PASS
- public renderer PII validation: PASS, protected values printed `false`
- renderer SHA-256: `ffd5dacef10d95ba000cf1b9c6937de6028a881eded91f79c642153757c27df4`
- historical renderer SHA-256: `ffd5dacef10d95ba000cf1b9c6937de6028a881eded91f79c642153757c27df4`
- renderer parity: byte-identical
- AI slop review: pass; changed-file lint reports no auto-detectable signals
- manual QA: no renderer source changed after the ended-session screen proof; exact renderer parity preserves that packaged surface for this checkpoint. Role and viewport browser QA is intentionally assigned to the later QA TUWs.
- external_blockers: none for FZ checkpoint

## Adjudication

The ended session reported `340/340` leave regression tests, but it did not preserve one authoritative command manifest that can reproduce that number without double-counting. FZ-006 therefore records the smaller, auditable unique scope: 193 leave/migration/route-authz tests plus 27 isolated HRX runtime API tests, for 220 unique tests with zero failures. This is a provenance correction, not a test regression.

The isolated runtime API originally failed because the old assertion expected one compensation row. The current runtime intentionally exposes two masked, reference-safe records (`comp-001` and the synthetic payroll record). The test now uses an isolated temporary store and asserts both exact IDs while rejecting raw amount and encrypted reference leakage.
