Internal member photos moved
============================

Authenticated profile photos are stored under
`apps/api/src/hrx-member-photos/` using a SHA-256 asset key derived from the
employee reference. The public renderer must not bundle these originals.
