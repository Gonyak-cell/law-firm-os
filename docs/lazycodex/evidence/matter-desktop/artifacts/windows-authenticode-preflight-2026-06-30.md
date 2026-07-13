# Windows Authenticode Preflight

Status: blocked-pending-authenticode-provider-and-windows-host

Issue: https://github.com/Gonyak-cell/law-firm-os/issues/145

Release: `matter-desktop-v0.1.0-lcx-vltui-20260630`

## Current Packaging Answer

- GitHub release Windows installer asset: false
- GitHub release Windows package ZIP asset: true
- GitHub release Windows manifest asset: true
- Local Windows package candidate created: true
- Local Windows package candidate uploaded to release: true

## Local Package Candidate

- Executable: `apps/desktop/dist/win/matter-0.1.0-win32-x64/matter.exe`
- Executable SHA-256: `30fd02e82aa5835cb82992fbce5a2738da1861773f1184f4f9d8f9d128db11fc`
- Unsigned package ZIP: `apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip`
- Unsigned package ZIP SHA-256: `cecbf33a8fc2f42e1923339b245a725fd9de17fa5b1f7119d94ca1c0ec78e005`

## Boundary

- Windows unsigned package ZIP uploaded to release: true
- Windows Authenticode signing: false
- Windows native install smoke: not_run_on_darwin
- Public release: false
- Company-wide production rollout: false
