# matter Desktop LCX VLTUI Post-Release Kickoff

Status: post-release-gates-started
Local date: 2026-06-30

## Source Release

| Field | Value |
| --- | --- |
| GitHub release | `matter-desktop-v0.1.0-lcx-vltui-20260630` |
| Release URL | https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630 |
| Release type | GitHub prerelease |
| Tag target | `ef493451a1d070412d3d24d4474493afbca3f1a4` |
| Merge PR | https://github.com/Gonyak-cell/law-firm-os/pull/143 |
| Release receipt | `docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json` |

## Started Workstreams

| Workstream | Tracker | Started State | Completion Gate |
| --- | --- | --- | --- |
| Owner approval evidence | https://github.com/Gonyak-cell/law-firm-os/issues/146 | Open | Explicit owner approval or rejection receipt recorded. |
| Production go-live receipt | https://github.com/Gonyak-cell/law-firm-os/issues/144 | Open, blocked by owner approval | Go-live receipt committed after owner approval and final decision validation. |
| Windows Authenticode signing | https://github.com/Gonyak-cell/law-firm-os/issues/145 | Open, blocked by signing provider/certificate and Windows host verification | Sanitized Authenticode receipt plus Windows native install smoke. |

## Current Evidence

- macOS Developer ID signing: applied
- macOS strict codesign: pass
- macOS Gatekeeper assessment: pass
- macOS notarization: submitted and accepted by notarytool
- GitHub release assets: 14 uploaded
- Desktop smoke: PASS 59/59
- Web UI regression: PASS 17/17
- Web build: PASS
- File bridge smoke: PASS 17/17
- AWS runtime smoke: PASS
- Formal release validate: PASS
- Desktop screen QA: PASS
- No-public-release guard: PASS

## Active Boundaries

- GitHub prerelease: true
- Public release: false
- Production go-live: false
- Actual launch/go-live completed: false
- Owner final approval: false
- External pilot: false
- App Store distribution: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false

## Next Receipt Requirements

1. Owner approval evidence must name the reviewed artifact, release URL, decision maker, decision, and timestamp.
2. Production go-live receipt must cite the owner approval receipt and final go-live decision validator output before any true claim.
3. Windows Authenticode receipt must include certificate/provider identity, sanitized signing command evidence, verification output, and Windows native install smoke output.
