# mater Desktop Update Policy

Status: P6 design-active
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`
Scope: `MDT-P6-W02-T01`

## Boundary

Desktop updates are internal-only until an explicit owner approval receipt exists. Public update channels, public release downloads, and store distribution are disabled.

## Channels

| Channel | Status | Rule |
| --- | --- | --- |
| internal | enabled for local validation receipts only | Signed update metadata must verify before apply. |
| pilot | policy-defined, not opened | Requires owner approval and tenant-scoped pilot receipt. |
| public | disabled | No public release update feed or public publish channel is allowed. |

## Rollback

- rollback metadata must point to the last verified internal build.
- rollback must verify signature before switching versions.
- rollback must preserve session cleanup and temp cache wipe behavior.

## Key Rotation

- key rotation requires dual-sign metadata during the transition window.
- old update keys must be revoked after all internal/pilot clients have moved.
- emergency key rotation must disable public channels by default.

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- external pilot: false
