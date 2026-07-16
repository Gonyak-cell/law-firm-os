# QA-003 Acceptance

Verdict: `PASS`

- immutable QA anchor: `forest-v0.1.17-integration-candidate-4c81d861`
- `INTEGRATION_SHA`: `4c81d861693472af48a680e5757b352bb9945b9b`
- execution entry/exit SHA: `d1fa5bbee7ba0969615b671b4df0bb450ef282f7`
- non-`workbook/` changes between the QA anchor and execution SHA: 0
- targeted migration tests: 19 passed, 0 failed, 0 skipped across 7 files
- targeted privacy/security tests: 40 passed, 0 failed, 0 skipped across 11 files
- applicable migration/privacy/security validators: 10 passed, 0 failed
- critical findings: 0

## Migration proof

Fresh SQLite `3.53.2` applied migrations `001` through `029`. The resulting schema has the exact expected 73 tables, 54 indexes, and 12 triggers; missing, unexpected, and forbidden schema objects are zero. All 73 business tables remained empty, integrity is `ok`, and foreign-key errors are zero.

Durable databases from checkpoints `010`, `020`, and `025` upgraded to `029` with 32 seeded rows preserved. Changed, lost, and unexpected rows are zero, all 30 backfill checks pass, and reopen hashes remain exact. Idempotent rerun, injected failure rollback, tampered-backup rejection, exact backup restore, and reopen all pass with zero partial commits or external writes.

## Privacy and security proof

The generated public renderer scanned 28 files against 30 protected values and 5 protected photos without printing those values. Desktop security scanned 50 files with zero findings; HRX negative tests, trusted context hardening, tenant isolation, roster source, and public-release claim boundaries pass.

A redacted scan inspected all 19,128 repository-visible paths, including the pending QA-003 evidence: 18,897 text files and 231 binary files. Eight credential/key/token rules returned zero findings and printed no secret values. This is additive to the original Forest checkpoint scan of 222 changed files with zero secret or unapproved-PII findings.

## Operator-local secret boundary

`validate-matter-vault-r4-local-secrets.mjs` correctly exits `1` because `.env.matter-vault-r4.local` is absent. That validator checks whether an operator has supplied real production connection values; it is not a source-leak detector and is not part of QA-003 acceptance. No secret file was created and no value was printed. Production operator readiness remains `BLOCKED_PREREQUISITE` until an authorized operator supplies those values locally.

## Preservation and external boundary

The user-owned root checkout still has the exact 77-path RC-001 content manifest: path, mode, size, and SHA-256 changes are zero. Its porcelain status serialization fingerprint changed outside this worktree, but no content or path changed and no matching writer was observed. The frozen v0.1.16 packaged app PID `55090` remains running and was not restarted or replaced.

No production write, AWS traffic change, secret-file write, tag push, `main` update, deployment, release, or go-live occurred. Browser role/viewport proof, actual signed macOS proof, Windows-native proof, and renderer parity remain QA-004 through QA-007.
