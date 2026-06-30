# matter Desktop Real Client Data Migration Rollback Plan

Status: rollback-plan-ready

## Scope

This rollback plan applies only to the LCX VLTUI desktop named lane real client data migration verification approved by `approval:real-client-data-migration-lcx-vltui-2026-06-30-1520-kst`.

## Rollback Steps

1. Stop the migration run immediately after any unexpected mapped row, out-of-scope target, count mismatch, or audit-log mismatch.
2. Preserve the migration receipt, operator, approval ref, source inventory ref, mapping workbook ref, request IDs, and timestamps without recording secrets.
3. Use the Vault bridge lookup, Matter app API audit trail, and migration receipt to identify every row or document written under the approval ref.
4. Remove or quarantine only the rows and documents written under the approval ref and only inside the LCX VLTUI desktop named lane.
5. Re-run bridge lookup/status checks to confirm no out-of-scope migrated row remains visible in the named lane.
6. Record a rollback receipt before any further real client data migration attempt.

## Non-Scope

- This plan does not approve public release, external pilot distribution, company-wide rollout, or Windows Authenticode signing.
- This plan does not authorize migration outside the LCX VLTUI desktop named lane.
- This plan does not authorize unbounded or bulk client data migration.
