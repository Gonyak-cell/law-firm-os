# matter Desktop Update Policy

Status: P6 design-active
Source ledger: `docs/desktop/matter-desktop-loop-tuw-ledger.json`
Scope: `MDT-P6-W02-T01`

## Boundary

Desktop updates are internal-only unless an exact named external-pilot decision is active. Public update channels, public release downloads, and store distribution are disabled.

## Channels

| Channel | Status | Rule |
| --- | --- | --- |
| internal | enabled for local validation receipts only | Ed25519-signed update metadata must verify against a configured public key before apply. |
| external-pilot | decision-gated | Requires a trusted detached owner-approval receipt, an approved destination, exact source/tree/manifest provenance, both tenant namespaces, an active update window, and downloaded bytes matching the signed digest and size. |
| public | disabled | No public release update feed or public publish channel is allowed. |

## Rollback

- rollback metadata must point to the last verified build on the same channel.
- rollback must verify signature before switching versions.
- external-pilot rollback metadata must match the active app ID, pilot ID, and tenant-configuration digest.
- update and rollback admission require the actual downloaded bytes; missing bytes return `download_verification_required`, and signed size or digest mismatches remain blocked.
- rollback must preserve session cleanup and temp cache wipe behavior.

## Key Rotation

- update verification uses Ed25519 public keys; no shared or built-in HMAC secret is accepted.
- key rotation requires an explicit trust update before metadata signed by the new key is accepted.
- old update keys must be revoked after all internal/pilot clients have moved.
- emergency key rotation must disable public channels by default.

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- external pilot: false
