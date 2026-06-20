# HRX DR Runbook

Status: PR-14 DR/UAT readiness evidence
Date: 2026-06-20

This runbook defines the local evidence path for backup, restore, RPO, and RTO controls. It is not go-live approval, R4 approval, or an enterprise-ready claim.

## Recovery Targets

| Control | Target | Evidence |
| --- | --- | --- |
| RPO | 15 minutes for HRX file-backed durable store snapshots | Snapshot timestamp and restored audit hash |
| RTO | 60 minutes for restoring HRX API read/write service from the last valid snapshot | Restore smoke result and API health probe |
| Audit integrity | Last restored HRX audit event hash matches source and full hash chain validates | `scripts/hrx-backup-restore-smoke.mjs` output |
| Legal hold safety | Retention purge remains blocked for active legal holds after restore | `packages/hrx/test/retention-job.test.js` |

## Restore Procedure

1. Freeze HRX write traffic at the ingress or route policy layer.
2. Capture the latest durable HRX store snapshot and record its timestamp.
3. Restore the snapshot into an isolated HRX store.
4. Run `node scripts/hrx-backup-restore-smoke.mjs --dry-run`.
5. Verify employee, document, leave, and audit counts match the source snapshot.
6. Verify the last audit hash matches and `audit_hash_chain_valid` is true.
7. Run HRX security and enterprise validators before re-enabling writes.

## Rollback Trigger

- Any count mismatch, audit hash mismatch, invalid hash chain, failed retention legal-hold check, or failed security regression blocks restoration.
- The owner must sign a separate go/no-go receipt before any production traffic claim.
