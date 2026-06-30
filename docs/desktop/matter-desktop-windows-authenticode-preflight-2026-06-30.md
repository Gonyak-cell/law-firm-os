# matter Desktop Windows Authenticode Preflight

Status: blocked-pending-authenticode-provider-and-windows-host

Issue: https://github.com/Gonyak-cell/law-firm-os/issues/145

Release: https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630

## Current Packaging Answer

- GitHub release Windows installer asset: false
- GitHub release Windows manifest asset: true
- Local Windows package candidate created: true
- Local Windows package candidate uploaded to release: false

The current GitHub prerelease has Windows manifest/signature evidence, but no `.exe`, `.msi`, `.msix`, `.appx`, or Windows package zip asset.

## Local Package Candidate

| Field | Value |
| --- | --- |
| Build command | `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win` |
| Package directory | `apps/desktop/dist/win/matter-0.1.0-win32-x64` |
| Executable | `apps/desktop/dist/win/matter-0.1.0-win32-x64/matter.exe` |
| Executable SHA-256 | `30fd02e82aa5835cb82992fbce5a2738da1861773f1184f4f9d8f9d128db11fc` |
| Unsigned package ZIP | `apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip` |
| Unsigned package ZIP SHA-256 | `cecbf33a8fc2f42e1923339b245a725fd9de17fa5b1f7119d94ca1c0ec78e005` |
| Installer manifest | `apps/desktop/dist/win/matter-0.1.0-win-installer-manifest.json` |
| Installer manifest SHA-256 | `843ad93b77937dc3155d4acfbfb27693183a7e3293dc6b54ebe4207d010e3ade` |

## Required To Close #145

- Authenticode certificate or provider selected: false
- Sanitized signing command recorded: false
- Certificate fingerprint recorded: false
- Authenticode verification output attached: false
- Windows native install smoke passed: false

## Boundary

- Windows package candidate created: true
- Windows Authenticode signing: false
- Windows native install smoke: not_run_on_darwin
- Public release: false
- Company-wide production rollout: false
- Microsoft Store distribution: false
- External pilot distribution: false
