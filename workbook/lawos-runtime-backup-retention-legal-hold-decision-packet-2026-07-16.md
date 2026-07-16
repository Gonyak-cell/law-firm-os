# Law Firm OS runtime backup retention and legal-hold decision packet

- Prepared: 2026-07-16 KST
- Scope: `RS-BKP-007`, permission remediation and retention/legal-hold boundary
- External dependency: `EXT-RETENTION`
- Current decision state: `PENDING_HUMAN_APPROVAL`
- Production-ready claim: `false`
- Go-live claim: `false`

## Source-complete controls

1. New backup, queue, receipt, snapshot, and isolated-restore artifacts are created with directory mode `0700` and file mode `0600`.
2. The remediation command is dry-run by default, records only relative paths, refuses symlinks, and does not delete or expire any artifact.
3. Applying permission changes requires three non-empty references: operator approval, retention decision, and legal-hold review.
4. Restore refuses the current authority directory and any non-empty target by default. It validates all source bytes before materialization.

## Human decisions still required

| Decision | Owner | Required receipt | Current state |
| --- | --- | --- | --- |
| Backup retention duration by artifact class | legal/compliance owner | approved duration, jurisdiction, effective date, exception rule | pending |
| Legal-hold lookup authority and hold-release rule | legal/compliance owner | system of record, reviewer identity, release evidence | pending |
| Existing real-backup permission remediation window | security/operations owner | target inventory hash, maintenance window, rollback owner | pending |
| S3 Object Lock/versioning/lifecycle policy | infrastructure plus legal owner | bucket capability and approved retention policy receipt | pending |
| Deletion or expiry of any backup | legal plus data owner | case-specific authorization and hold-negative evidence | prohibited until approved |

## Execution gates

- Local source tests may create and repair disposable synthetic fixtures.
- A scan of existing real backups may run only as dry-run and must not record absolute paths or record content in evidence.
- `--apply` against an existing real backup is blocked until all three command references correspond to approved receipts in this packet.
- AWS bucket creation, policy changes, upload, lifecycle, Object Lock, or restore download remains a separate external action. No such action is approved by this packet.
- No release, tag, deployment, production migration, cutover, or go-live authority is granted.

## Approval receipt slots

| Receipt | Value |
| --- | --- |
| Retention decision reference | `PENDING` |
| Legal-hold review reference | `PENDING` |
| Permission remediation approval reference | `PENDING` |
| AWS backup approval reference | `PENDING` |
| Approved by | `PENDING` |
| Approved at | `PENDING` |

Until these slots are complete, the allowed claim is limited to local source and synthetic-fixture verification. `EXT-RETENTION` and `EXT-AWS-BACKUP` remain blocked external dependencies.
