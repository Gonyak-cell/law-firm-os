# CTI CUTOVER Snapshot/Restore Rehearsal Blocker Register

Goal: `cti-cutover-snapshot-restore-rehearsal`

Status: `BLOCKED_NO_APPROVED_EFS_FILE_READ_SURFACE`

| ID | Status | Finding | Required unblock |
|---|---|---|---|
| SNAP-B01 | ACTIVE | AWS/EFS metadata is readable, but EFS file content cannot be enumerated or hashed through an approved read-only surface. | Approve and implement a no-write Lambda maintenance snapshot endpoint or an isolated AWS restore/mount path that emits PII-safe hash/count only. |
| SNAP-B02 | ACTIVE | Product API readback requires an authenticated production session; S1-G/I8 remains blocked. | Complete S1-G authenticated production probe prerequisites or use a separately approved non-product-state EFS snapshot surface. |
| SNAP-B03 | ACTIVE | Snapshot-bound restore rehearsal has no current snapshot hash input. | Produce current snapshot hash/count receipt first, then run isolated restore rehearsal against that snapshot. |

No CUTOVER execution is allowed from this blocker register.
