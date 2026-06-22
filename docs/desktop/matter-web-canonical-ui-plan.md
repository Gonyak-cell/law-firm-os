# LCX-WEB Canonical UI Plan

Status: implementation-active
Branch: `codex/lcx-web-apps-web-canonical-ui-38-tuw`
Goal: `LCX-WEB apps/web canonical product UI 38 TUW full implementation`

## Source Of Truth

The only product UI source of truth for this lane is `apps/web`.

Excluded from product UI decision-making:

- external design-research folders
- archived prototype UI folders
- static HTML reference screens
- third-party product-style parity packs
- screenshot-parity reference packs
- `apps/desktop/src/renderer/offline.html` after authentication

`apps/desktop/src/renderer/offline.html` remains only an auth and password-reset gate. After login, it hands off to the canonical `apps/web` renderer at `web/index.html?desktop=1&view=home&data=live&ctx=allow`.

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false

## TUW Pyramid

| Phase | TUWs | Terminal rule |
| --- | --- | --- |
| W0 Source Freeze | W0-T00 through W0-T03 | `apps/web` source-of-truth and forbidden references are validated. |
| W1 Backend Capability Ledger | W1-T00 through W1-T04 | Backend read/action/audit route inventory is visible in `apps/web`. |
| W2 Desktop Post-login Handoff | W2-T00 through W2-T04 | Desktop login opens `apps/web` as product UI. |
| W3 Live Command Center | W3-T00 through W3-T04 | Home route shows every backend capability status without mock fallback. |
| W4 Core Client/Matter/Vault Coverage | W4-T00 through W4-T04 | Client, Matter, and Vault read/action/audit capabilities are surfaced. |
| W5 Intake/Finance/Analytics/AI/Portal Coverage | W5-T00 through W5-T05 | Intake, Finance, Analytics, AI, Portal, and Data Room capabilities are surfaced. |
| W6 People/Admin/Ops Coverage | W6-T00 through W6-T05 | HRX, UI readiness, and enterprise operations capabilities are surfaced. |
| W7 Verification Closeout | W7-T00 through W7-T05 | Build, UI tests, flow verification, desktop handoff, screenshots, and release-boundary checks close. |

Total: 38 TUWs.

## Loop Rule

Every TUW closes through Plan -> Do -> Check -> Act. A TUW that lacks passing verification remains open.
