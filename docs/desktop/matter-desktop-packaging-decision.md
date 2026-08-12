# matter Desktop Packaging Decision

Status: P6 design-active
Source ledger: `docs/desktop/matter-desktop-loop-tuw-ledger.json`
Scope: `MDT-P6-W01-T01`

## Decision

The internal desktop app ID is `com.amic.matter.desktop.internal`.

This app ID is for internal validation, pilot packaging, and signing smoke work only. It is not a public release app ID and does not imply App Store, Microsoft Store, public download, production go-live, or owner approval.

## Boundary

- Internal app ID: `com.amic.matter.desktop.internal`
- Product name: `matter`
- UI brand: `matter by AMIC`
- Public release app ID: not decided
- Owner decision: not recorded
- Public release approval: false
- Production go-live approval: false

## External named-pilot decision

The supported external-pilot identity strategy reuses the exact notarized formal candidate with app ID `com.amic.matter.desktop`. The distribution manifest records `external-pilot`, but the application bytes and embedded `formal` build manifest remain unchanged. This preserves notarization evidence and prevents a manifest-only app ID substitution.

A separate signed tenant configuration binds the generic app to one firm, tenant, and HTTPS runtime endpoint during approved onboarding. The generic binary does not infer that the AMIC runtime supports another tenant.

See `docs/desktop/matter-desktop-external-pilot-release.md`. Its decision template is unapproved by default, and the preparation path performs no upload.

## Future public-release decision required

A future owner decision is required before any public release app ID, public publish channel, store listing, or public stable distribution can be claimed. A named external-pilot approval does not grant any of those scopes.
