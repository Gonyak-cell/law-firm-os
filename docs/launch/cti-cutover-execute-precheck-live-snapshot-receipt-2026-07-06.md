# CTI CUTOVER Execute Precheck Live Snapshot Receipt

Status: `BLOCKED_SNAPSHOT_HASH_MISMATCH`

Goal: `cti-cutover-execute`

Expected I15 snapshot hash: `2ce798915fccf16aff5c25746e8db4478dc5f160b7ebe7ca430833ce7735cffb`

Live snapshot hash: `b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49`

Live snapshot generated at: 2026-07-06T08:07:43.898Z

Readable store files: 15

Restore rehearsal: `PASS` (15 source / 15 restored / 0 mismatches)

## Decision

CUTOVER execute stopped before production mutation because the live snapshot hash does not match the I15-bound preflight snapshot hash.

## Boundary

The precheck was direct-invoke read-only evidence. It did not execute operational profile switch, tenant migration, account/permission injection, bridge token rotation, password issuance/distribution, first-login validation, CUT-G, production restore, S5/S6, OIDC, DB conversion, production_ready, or go-live.
