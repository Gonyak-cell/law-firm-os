# QA-002 Acceptance

Verdict: `PASS`

- immutable QA anchor: `forest-v0.1.17-integration-candidate-4c81d861`
- `INTEGRATION_SHA`: `4c81d861693472af48a680e5757b352bb9945b9b`
- execution entry/exit SHA: `11fe96abe19a99fdf7ac5b79276c7bed7f52b8bb`
- non-`workbook/` changes between the QA anchor and execution SHA: 0
- Web UI: 143 passed, 0 failed, 1 skipped
- Web typecheck: PASS
- Web production build: PASS, 1,719 modules, 28 output files
- Desktop full smoke: 102 passed, 0 failed, 0 skipped
- Desktop file bridge entrypoint: 17 passed plus 2 validators, all PASS
- Desktop session entrypoint: 37 passed
- Desktop update entrypoint: 3 passed

The unique product test set is Web UI 144 cases plus Desktop smoke 102 cases: 245 passed, 0 failed, and 1 skipped. File bridge, session, and update are explicit package entrypoints whose test files are already included in Desktop smoke, so their 57 passing executions are reported separately and are not inflated as unique cases.

## Web entrypoint normalization

The official parallel `npm --workspace apps/web run test:ui` entrypoint returned 143 PASS, 0 fail, 1 skip, but concurrent per-file Vite shutdown produced 9 port-24678 messages and 276 dependency-scan close messages. The identical 32-file suite was rerun serially with `--test-concurrency=1`; it returned the same TAP result with zero `WebSocket server error`, dependency-scan close, or `not ok` lines. The clean serial TAP is the acceptance log. The official entrypoint's transient raw log was 829,710 bytes and is summarized in `web-ui-package-entrypoint-summary.txt` rather than committed.

The single skip is `apps/web/test/matter-profile-browser.test.mjs`, which requires `MATTER_PROFILE_BASE_URL`. It is an actual browser contract and is deliberately deferred to QA-004 rather than fabricated in this source-level gate.

## Build boundary

- production renderer file-set digest: `79eab1e4615c82a65ba1e4cebbb58069530f710cff21ee6579260e401a22e7a1`
- the existing Vite chunk-size warning remains: the primary minified JavaScript chunk is 1,133.54 kB; it is non-failing performance debt, not a correctness failure
- the generated `apps/web/dist` is ignored build output and remains available for QA-003/QA-007; it is not a release artifact or source mutation

## Dependency and external boundaries

The lock-matched v0.1.16 dependency directory was linked only during execution and removed afterward. No production write, AWS traffic change, tag push, `main` update, deployment, package signing, release, or go-live occurred. The frozen v0.1.16 packaged app PID `55090` was not restarted or replaced. Browser/manual visual proof, package proof, native signing, and deployment remain later gates.
