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
| Owner approval evidence | https://github.com/Gonyak-cell/law-firm-os/issues/146 | Closed, owner approval gate recorded | Explicit owner approval receipt recorded through `docs/desktop/matter-desktop-owner-approval-intake.json` and `npm run matter-desktop:owner-approval:intake:validate`. |
| Production go-live receipt | https://github.com/Gonyak-cell/law-firm-os/issues/144 | Ready to close after receipt merge | Go-live receipt committed after final decision validation and explicit final decision input. |
| Windows Authenticode signing | https://github.com/Gonyak-cell/law-firm-os/issues/145 | Open, package candidate created but blocked by signing provider/certificate and Windows host verification | Sanitized Authenticode receipt plus Windows native install smoke. |

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
- PR #147 merge: `0ff79586d887a950200ab091a5864a20c174bdf9`
- Post-merge HRX production smoke: PASS
- Post-merge LCX-VLTUI production bridge smoke: PASS 15/15
- Owner approval gate: recorded in `docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json`
- LCX VLTUI desktop prerelease lane go-live receipt: recorded in `docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json`
- Windows package candidate: created locally as `apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip`

## Active Boundaries

- GitHub prerelease: true
- Public release: false
- LCX VLTUI desktop prerelease lane go-live receipt: committed
- Company-wide production rollout: false
- Owner review gate: recorded
- Final go-live decision receipt: recorded
- External pilot: false
- App Store distribution: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
- Windows package candidate uploaded to release: false

## Next Receipt Requirements

1. Owner approval evidence must name the reviewed artifact, release URL, decision maker, decision, and timestamp.
2. Production go-live receipt must cite the owner approval receipt and final go-live decision validator output before any true claim.
3. Windows Authenticode receipt must include certificate/provider identity, sanitized signing command evidence, verification output, and Windows native install smoke output.
4. Post-merge production smoke receipts prove route operability only; they do not replace owner final approval, public release approval, Windows signing, external pilot approval, or real client data migration receipts.
5. The committed go-live receipt remains scoped to the LCX VLTUI desktop prerelease lane and does not approve public release, company-wide rollout, Windows Authenticode signing, external pilot distribution, Vault document writes, or real client data migration.

## Owner Approval Intake

- Intake template: `docs/desktop/matter-desktop-owner-approval-intake.json`
- Reader copy: `docs/desktop/matter-desktop-owner-approval-intake.md`
- Validator: `npm run matter-desktop:owner-approval:intake:validate`
- Validation receipt: `docs/desktop/matter-desktop-owner-approval-intake-validation.json`
- Owner approval gate receipt: `docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json`

## Production Go-Live Decision Intake

- Intake: `docs/desktop/matter-desktop-production-go-live-decision-intake.json`
- Reader copy: `docs/desktop/matter-desktop-production-go-live-decision-intake.md`
- Validator: `npm run matter-desktop:production-go-live:decision:validate`
- Validation receipt: `docs/desktop/matter-desktop-production-go-live-decision-validation.json`
- Final decision input was recorded in `docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json`.

## Production Go-Live Receipt

- Receipt: `docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json`
- Reader copy: `docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.md`
- Validator: `npm run matter-desktop:production-go-live:receipt:validate`
- Validation receipt: `docs/desktop/matter-desktop-production-go-live-receipt-validation.json`
- Remaining boundaries: public release, company-wide rollout, Windows Authenticode signing, external pilot distribution, Vault document writes, and real client data migration are still false.

## Windows Authenticode Preflight

- Preflight: `docs/desktop/matter-desktop-windows-authenticode-preflight-2026-06-30.json`
- Reader copy: `docs/desktop/matter-desktop-windows-authenticode-preflight-2026-06-30.md`
- Validator: `npm run matter-desktop:windows-authenticode:preflight:validate`
- Validation receipt: `docs/desktop/matter-desktop-windows-authenticode-preflight-validation.json`
- Current state: local unsigned Windows package candidate exists, but current GitHub release still has no Windows installer/package asset and #145 remains blocked by Authenticode provider plus Windows-host verification.
