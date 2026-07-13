# matter Desktop Vault Document Writes Rollback Plan

Status: rollback-plan-ready

## Scope

This rollback plan applies only to the LCX VLTUI desktop named lane Vault document write verification approved by `docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.json`.

## Rollback Steps

1. Stop expanding the write run immediately after any failed write, unexpected target, unexpected count, or audit-log mismatch.
2. Preserve the write receipt, operator, request IDs, target descriptors, and timestamps without recording secrets.
3. Use the Vault bridge lookup and audit log to identify every document written under the approval ref `approval:vault-document-writes-lcx-vltui-2026-06-30-1310-kst`.
4. Remove or quarantine only the documents written by that approval ref, up to the approved maximum of 10 documents.
5. Re-run bridge lookup/status checks to confirm no out-of-scope document remains visible in the named lane.
6. Record a rollback receipt before any further Vault document write attempt.

## Non-Scope

- This plan does not approve real client data migration.
- This plan does not approve public release, external pilot distribution, company-wide rollout, or Windows Authenticode signing.
- This plan does not authorize writes outside the LCX VLTUI desktop named lane.
