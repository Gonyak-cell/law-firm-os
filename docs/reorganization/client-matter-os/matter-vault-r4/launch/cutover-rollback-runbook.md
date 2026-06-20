# Matter-Vault R4 Cutover And Rollback Runbook

Status: cutover-template
Date: 2026-06-20

This runbook is a release-control template. It is not a production traffic receipt or launch authorization.

## Preconditions

- `npm run matter-vault:r4:launch:validate` passes.
- `npm run matter-vault:r4:no-go` passes.
- `npm run web:e2e -- matter-vault` passes.
- Migration dry-run receipts show zero failed rows.
- Duplicate workspace audit passes.
- External production smoke receipt has been attached by the operator.
- Owner release authority has signed a separate receipt.

## Cutover Steps

1. Freeze the release branch and record the commit SHA.
2. Run MatterVaultLink backfill with dry-run first.
3. Run Vault workspace backfill with dry-run first.
4. Run duplicate workspace audit.
5. Run pilot tenant migration under operator supervision.
6. Run Matter opening to Vault workspace orchestration smoke.
7. Run document upload facade smoke and verify raw path suppression.
8. Run legal hold and privilege inheritance smoke.
9. Run AI/search/portal projection guard smoke.
10. Record audit and timeline projection evidence.
11. Owner release authority makes the launch decision outside automation.

## Rollback Steps

1. Stop further Matter opening to Vault workspace orchestration for pilot tenants.
2. Disable Matter-Vault panel exposure for affected tenant routes.
3. Preserve MatterVaultLink, Vault workspace, document metadata, and audit logs.
4. Restore from the latest verified snapshot if operator-directed.
5. Re-run duplicate workspace audit.
6. Re-run `npm run matter-vault:r4:validate`.
7. Re-run `npm run matter-vault:r4:no-go`.

## Rollback Triggers

- Tenant isolation failure.
- Ethical wall bypass.
- Legal hold bypass.
- Raw storage path or document byte exposure.
- Denied count leak.
- AI/search permission bypass.
- Portal projection exposes internal memo, raw payload, or non-projection data.
- Migration failed rows or duplicate workspace ownership.
