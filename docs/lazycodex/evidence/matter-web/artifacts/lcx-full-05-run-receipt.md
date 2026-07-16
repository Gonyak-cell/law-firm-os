# LCX-FULL-05 Run Receipt

Generated at: 2026-06-30T12:32:23.050Z

Verdict: PASS

| Step | State |
| --- | --- |
| create | not_started |
| dry-run | dry_run_passed |
| execute without provider | execute_blocked |
| synthetic execute | executed |
| duplicate | duplicate_idempotency_key |
| rollback | rolled_back |

## Boundary

- Duplicate execute is blocked by idempotency key.
- Safe snapshots are redacted and hashed.
- Synthetic execution does not perform external mutation or claim production readiness.
