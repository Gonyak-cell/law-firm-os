# RS-BKP terminal acceptance

- Terminal: `RS-BKP-008`
- Gate: `G5-BKP`
- Source SHA: `79025ea354b4e7009f916e74eba21713ae927a6d`
- Verdict: `PASS`
- Allowed claim: `BACKUP_SOURCE_LOCAL_VERIFIED`

## Accepted local backup behavior

1. Durable writes enqueue private, PII-free events that bind the pseudonymous device and store references to generation, content hash, reason and profile.
2. The local processor provides idempotent receipts, exponential retry, exact attempt-limit dead-lettering, poison isolation and an exclusive processor lock.
3. A snapshot inventories all 16 operational manifest stores and derived DMS object bytes with hashes and counts. Persisted manifests omit absolute source and backup paths.
4. Restore validates manifest coverage, checksum, parse state, durable hash and generation, record count and DMS sidecar JSON before writing any restored file. It refuses the current authority and non-empty targets.
5. Backup, processor, restore and permission commands default to local or read-only behavior. AWS upload, S3 download and chmod application require explicit approvals; bucket mutation requires a separate infrastructure approval reference.
6. Exact-SHA evidence passed: VC-BKP 10/10, persistence 56/56, legacy backup and permissions 5/5, writer coverage, runtime-safety governance and isolated store-path preflight.
7. Manual CLI QA observed a one-file synthetic snapshot and isolated restore, all four help paths, and rejection of four unsafe or unapproved command forms.

## Boundary retained

This acceptance verifies the local backup source, queue and isolated restore implementation only. It does not activate or verify an off-device AWS backup, scheduler, production bucket, retention lifecycle, legal-hold policy, provider restore, or production RPO/RTO.

No AWS API call, AWS mutation, release, tag, package distribution, staging or production migration, real-client-data transfer, production write or go-live action was executed. `production_ready`, `aws_backup_active`, `rpo_rto_met` and `go_live` remain false.
