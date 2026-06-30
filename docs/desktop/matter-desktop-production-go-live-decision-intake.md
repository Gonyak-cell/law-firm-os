# matter Desktop Production Go-Live Decision Intake

Status: pending-final-go-live-decision

## Source Release

| Field | Value |
| --- | --- |
| Release | `matter-desktop-v0.1.0-lcx-vltui-20260630` |
| Release URL | https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630 |
| Release channel | `github_prerelease_lcx_vltui_desktop` |
| Runtime target | `https://d2mthcc8vp3cr2.cloudfront.net` |
| API Lambda | `matter-lawos-api-prod` |
| Deployment commit | `0ff79586d887a950200ab091a5864a20c174bdf9` |

## Evidence Ready

- Owner approval receipt: `docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json`
- Owner approval validation: `docs/desktop/matter-desktop-owner-approval-intake-validation.json`
- HRX production smoke receipt: `docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-2026-06-30.json`
- LCX-VLTUI production smoke receipt: `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json`

## Final Decision Request

The next required input is an explicit final go-live decision for issue #144. Accepted decisions are:

- `approve_production_go_live_receipt`
- `reject_production_go_live`
- `request_changes`

Required fields:

- decision_maker
- decision
- basis
- decision_at
- approval_signature_ref
- recorded_by_human

## Boundary

- Production go-live: false
- Actual launch/go-live completed: false
- Public release: false
- Company-wide production go-live: false
- Windows Authenticode signing: false
- External pilot distribution: false
- Vault document writes: false
- Real client data migration: false
