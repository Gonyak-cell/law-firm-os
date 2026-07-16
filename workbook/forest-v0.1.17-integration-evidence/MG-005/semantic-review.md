# MG-005 Checkpoint Upgrade Evidence

## Decision

The 010, 020, and 025 historical checkpoints each upgrade to 028 on a durable SQLite file without changing or losing any pre-existing value.

- checkpoints: 10, 20, 25
- upgrade migrations: 10=>18, 20=>8, 25=>3
- synthetic golden coverage: 32 tables / 32 rows
- backfill checks: 30/30 PASS
- existing rows changed/lost: 0/0
- unexpected new rows: 0
- durable close/reopen proofs: 3/3
- integrity failures and foreign-key errors: 0/0
- all final schemas equal fresh schema: c0756d870967adf0ab79e4b6716a947ea4fb2a921a3418195a489cee9e8798b6
- two independent audit runs are byte-identical
- the user-owned root checkout is fingerprint-identical before and after generation

## Boundary

The fixtures are synthetic and repository-safe. MG-005 does not read or write production employee, payroll, bank, or leave data. Idempotency, injected failure rollback, backup, and restore remain MG-006.
