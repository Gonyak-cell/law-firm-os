# QA-001 Acceptance

Verdict: `PASS`

- immutable QA anchor: `forest-v0.1.17-integration-candidate-4c81d861`
- `INTEGRATION_SHA`: `4c81d861693472af48a680e5757b352bb9945b9b`
- execution entry/exit SHA: `443e833c90432b3d6414ef730240c83b31c90715`
- non-`workbook/` changes between the QA anchor and execution SHA: 0
- HRX domain: 111 files, 571 passed, 0 failed, 0 skipped
- authz and runtime-auth: 15 files, 159 passed, 0 failed, 0 skipped
- package-defined API: 88 files, 389 passed, 0 failed, 0 skipped
- nested API audit/e2e/idempotency/perf/security: 14 files, 42 passed, 0 failed, 0 skipped
- total: 228 files, 1,161 passed, 0 failed, 0 skipped
- domain/API validators: 8 passed, 0 failed
- route policy count: 159
- leave compatibility: 49/49 TUWs, 7/7 axes, 40 test files
- payroll compatibility: 61/61 TUWs, 8/8 axes, 23 test files
- port crosswalk: 31 required, 26 retained, 5 canonical replacements, 0 unimplemented

The repository's official `apps/api` test script covers root and HRX API tests. QA-001 additionally discovered and executed all 14 nested API audit, e2e, idempotency, performance, and security files that the package script does not glob. Nothing under `apps/api/test` was omitted.

## Dependency provenance

The integration worktree had no installed dependency directory. Its `package-lock.json` SHA-256 exactly matched the frozen v0.1.16 release worktree (`17822d16955ad81780e489795791d5252cfefeb56bf16120fc7c8865ec938972`), so QA temporarily linked that worktree's `node_modules`. The link was removed after the tests and the integration worktree returned to its evidence-only state.

## Boundaries

- Every test used local synthetic fixtures or isolated temporary stores. No production employee, payroll, bank, tax, provider, or client write occurred.
- The payroll compatibility validator correctly retains `external_gate=BLOCKED`; this PASS does not claim a provider, bank, tax production execution, public release, or go-live.
- MI-001 live AWS truth remains `READY`; local API tests do not prove current Lambda configuration.
- Browser, Web/Desktop build, package, migration/privacy/security, native OS signing, and deployment claims belong to later QA/MR/DP gates.
- The frozen v0.1.16 packaged app PID `55090` was not restarted or replaced.
