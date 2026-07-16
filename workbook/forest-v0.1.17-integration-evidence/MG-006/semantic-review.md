# MG-006 Migration Recovery Evidence

## Decision

Canonical reruns, injected migration failures, backup restore, and actual SQLite transaction failure all recover without a partial commit.

- canonical first application: 28/28
- canonical rerun applications: 0
- canonical injected-failure receipts left behind: 0
- canonical snapshot backup/restore: byte-stable before, after, and reopen
- SQLite checkpoint 25 backup/restore and 3-migration re-upgrade: exact
- SQLite failed transaction schema objects left behind: 0
- integrity: ok; foreign-key errors: 0
- two independent audit runs are byte-identical
- the user-owned root checkout is fingerprint-identical before and after generation

## Boundary

Individual historical SQL files are not all statement-idempotent because additive ALTER statements exist. Safe rerun is provided by immutable migration ID/hash receipts and skip semantics in the canonical runner. Fixtures and file databases are synthetic; production employee, payroll, bank, tax, and leave records are never read or written.
