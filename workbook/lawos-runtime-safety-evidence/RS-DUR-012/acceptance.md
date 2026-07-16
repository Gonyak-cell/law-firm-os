# RS-DUR terminal acceptance

- Terminal: `RS-DUR-012`
- Gate: `G3-DUR`
- Source SHA: `90e241bf4f06004974e7a97592f07309873f0131`
- Verdict: `PASS`
- Allowed claim: `DURABLE_WRITER_PRIMITIVE_VERIFIED`

## Accepted primitive behavior

1. Durable JSON files carry additive `__lawos_store` metadata with schema version, generation, previous generation, canonical content hash, write time and lock-bound writer identity. Legacy JSON reads as generation `0` without dropping unknown root fields.
2. `withStoreWriteLock()` creates a private exclusive lock with PID, host, token and acquisition time, waits for a bounded interval, releases only a matching token, and recovers only an old dead same-host owner. Live, remote and unknown owners fail closed.
3. Disk generation is re-read inside the lock. A stale `expected_generation` returns `LAWOS_STORE_CONFLICT` before backup or authority-write side effects.
4. JSON, backup, queue, append and binary paths use private local permissions. Atomic replacement follows temp creation, file fsync, rename and directory fsync; generation backups include a UUID and prune without timestamp collision.
5. The append helper uses an exclusive append lock, `O_APPEND`, fsync and sequence/hash continuity. The binary helper performs temp/rename, digest readback, optional sidecar creation and a post-rename compensation hook.
6. Actual Matter- and HRX-labelled processes racing from generation `0` produced one successful generation `1` write, one explicit conflict and zero lost writes. Kill-before-write, mid-temp, post-rename, ENOSPC and actual killed-owner cases left a valid committed generation.

## Boundary retained

This acceptance verifies the reusable primitive only. Existing operational stores have not yet all been migrated to it; that is the separate `RS-STO` workstream. Backup processing, AWS access, real-data migration, staging, production migration, cutover, release, tag, signing, distribution and go-live remain unapproved and unexecuted.
