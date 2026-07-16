# MG-004 Fresh Database Migration Evidence

## Decision

A real in-memory SQLite database accepts the complete canonical migration lineage 001-028 in order. This is execution proof, not SQL-text inspection.

- engine: SQLite 3.53.2
- lineage: 001_hrx_core.sql through 028_hrx_leave_accrual_rule_versions.sql (28/28)
- schema objects: 73 tables, 53 indexes, 12 triggers
- required/forbidden column checks: 7/7
- constraint probes: 7/7 PASS
- empty tables after probe rollback: 73/73
- integrity/foreign keys: ok/0 errors
- two independent fresh database audits are byte-identical
- the user-owned root checkout is fingerprint-identical before and after generation

## Boundary

MG-004 proves a fresh installation only. It does not claim production-data migration, upgrades from historical checkpoints, rollback, or restore; those remain MG-005 and MG-006.
