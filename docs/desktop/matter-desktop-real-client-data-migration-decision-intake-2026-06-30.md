# matter Desktop Real Client Data Migration Decision Intake

Status: owner-decision-recorded

## Decision Gate

| Field | Value |
| --- | --- |
| Gate | `real_client_data_migration` |
| Release | `matter-desktop-v0.1.0-lcx-vltui-20260630` |
| Tracker | https://github.com/Gonyak-cell/law-firm-os/issues/160 |
| Upstream write gate | `vault_document_writes` |
| Upstream write approval | `docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.json` |
| Approval receipt | `docs/desktop/matter-desktop-real-client-data-migration-approval-receipt-2026-06-30.json` |

## Required Owner Response

Accepted decisions:

- `approve_real_client_data_migration`
- `reject_real_client_data_migration`
- `request_changes`

Required fields:

- decision_maker
- decision
- migration_scope
- client_population
- source_inventory_ref
- mapping_workbook_ref
- dry_run_receipt_ref
- vault_write_approval_ref
- rollback_plan_ref
- communications_owner
- decision_at
- approval_signature_ref
- recorded_by_human

## Minimum Evidence Before Approval

- Client population and exclusions named.
- Source inventory and mapping workbook referenced.
- Dry-run receipt reviewed with zero unexpected mutations.
- Separate Vault document write approval referenced.
- Rollback plan and communications owner named.

## Boundary

- Real client data migration: true
- Real client rows migrated: 0
- Vault document writes approved by this file: false
- Vault document write execution authorized by this file: false
- Public release: false
- Company-wide production rollout: false
- External pilot distribution: false
- Windows Authenticode signing: false
