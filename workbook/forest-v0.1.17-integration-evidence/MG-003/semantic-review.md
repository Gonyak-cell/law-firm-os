# MG-003 Forward Migration Evidence

## Decision

The 71 approved MG-001 contracts are implemented once as additive migrations 026-028. Forest 001-025 remains the canonical history.

- migration lineage: 001_hrx_core.sql through 028_hrx_leave_accrual_rule_versions.sql
- loader/disk migrations: 28/28
- forward contracts: 71/71
- per migration: 026_hrx_payroll_catalog_assignments.sql=49, 027_hrx_attendance_approval_receipts.sql=18, 028_hrx_leave_accrual_rule_versions.sql=4
- missing, unexpected, or definition-mismatched contracts: 0
- forbidden duplicate schema/runtime contracts: 0

## Canonical ownership

1. Forest payroll profiles remain mutable through the existing optimistic state-version repository.
2. Payroll items and append-only employee item assignments are added without recreating payroll profiles.
3. Attendance approval receipts are projected into the existing canonical payroll input snapshot; no parallel snapshot tables are added.
4. Leave rule lineage and run as-of fields extend the existing Forest accrual model without importing root usage-unit or entitlement-lifecycle columns.
5. The root source checkout is fingerprint-identical before and after evidence generation.

## Next gates

MG-004 must prove a fresh 001-028 database install. MG-005 and MG-006 separately prove upgrades, data preservation, idempotency, rollback, and restore.
