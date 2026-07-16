# Sidebar IA and Home Dashboard R1 Owner Review Packet

Date: 2026-07-08
Branch: `codex/lcx-vltui-owner-approval-intake`
Status: owner approved for Stage 7 owner-confirmation gate
Owner confirmation recorded: true
Public release or go-live claim: false

## Scope

R1 remediation followed `workbook/sidebar-home-dashboard-remediation-r1-2026-07-08.md` in WP order.

| WP | Commit | Summary |
| --- | --- | --- |
| WP-1 | `da103cb15` | Wired Home dashboard runtime aggregation sources without changing existing API contracts or news connector contracts. |
| WP-2 | `18fa89549` | Restored dedicated Home utility screens and legacy route context. |
| WP-3 | `1ec0e9df3` | Wired Home message threads and unread count behavior. |
| WP-4 | `7dca3e1b3` | Gated company status with admin role access and fallback notice. |
| WP-5 | `cdce6c266` | Completed widget rules, view-all links, calendar/feed behavior, and delayed undo window. |
| WP-6 | `22c5289b1` | Applied notification dot behavior and sidebar/topbar/Home i18n coverage. |
| WP-7 | `ec05883b4` | Added runtime count equality gates, exhaustive legacy route loop, and client telemetry events. |
| WP-8 | `2cd8eed8d` | Added profile mode exception handling and normalized Home fallback to `home-dashboard`. |

## Screenshots

| Evidence | Path |
| --- | --- |
| Home dashboard counts and widget layout | `docs/lazycodex/evidence/matter-web/artifacts/sidebar-home-dashboard-r1-dashboard-2026-07-08.png` |
| Dedicated Home requests count view | `docs/lazycodex/evidence/matter-web/artifacts/sidebar-home-dashboard-r1-requests-counts-2026-07-08.png` |
| Profile mode exception with return anchor | `docs/lazycodex/evidence/matter-web/artifacts/sidebar-home-dashboard-r1-profile-mode-exception-2026-07-08.png` |
| Unknown route fallback to Home dashboard | `docs/lazycodex/evidence/matter-web/artifacts/sidebar-home-dashboard-r1-fallback-home-dashboard-2026-07-08.png` |
| QA receipt JSON | `docs/lazycodex/evidence/matter-web/artifacts/sidebar-home-dashboard-r1-owner-qa-receipt-2026-07-08.json` |

Observed screenshot receipt values:

| Check | Observed |
| --- | --- |
| Dashboard hero action count | `8` |
| Approval count equality | widget `5`, sidebar `5`, topbar `5` |
| Dedicated request rows | `5` approval rows |
| Profile return anchor | `matters#matter-calendar` |
| Fallback route | `home#home-dashboard` |

## Direct Rerun Verification

| Command | Exit | Result |
| --- | --- | --- |
| `node --check apps/web/src/data/homeTelemetry.js` | 0 | WP-7 telemetry helper parsed. |
| `node --check apps/web/test/home-dashboard-r1.test.mjs` | 0 | R1 runtime test file parsed. |
| `node --check apps/web/test/ui-regression.test.mjs` | 0 | UI regression test file parsed. |
| `git diff --check -- apps/web/src/App.jsx apps/web/src/components/Shell.jsx apps/web/src/data/globalUtilities.js apps/web/src/data/homeTelemetry.js apps/web/src/components/HomeSurface.jsx apps/web/test/home-dashboard-r1.test.mjs apps/web/test/ui-regression.test.mjs` | 0 | No whitespace errors in changed files. |
| `npm --workspace apps/web run test:ui` | 0 | 56/56 web UI tests passed. |
| `npm test` | 0 | 4157/4157 repo tests passed. |
| `npm run build` | 0 | Vite production build passed. Chunk-size warning unchanged by this packet. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | 55 findings remained outside the R1 changed files. |
| Owner packet screenshot generation script | 0 | Four screenshots and one JSON receipt written under `docs/lazycodex/evidence/matter-web/artifacts/`. |

## Not Verified

| Item | Reason |
| --- | --- |
| Public release or go-live | Out of scope for this packet and not claimed. |
| Production_ready gate weakening | Not requested and not approved. |

## Owner Approval

Recorded at: 2026-07-08 10:57:15 KST
Approval receipt: `workbook/sidebar-home-dashboard-remediation-r1-owner-approval-receipt-2026-07-08.md`
Machine-readable receipt: `docs/lazycodex/evidence/matter-web/artifacts/sidebar-home-dashboard-r1-owner-approval-receipt-2026-07-08.json`

Owner approved:

```text
R1 오너 검수 승인합니다.

검수 대상:
- workbook/sidebar-home-dashboard-remediation-r1-owner-review-packet-2026-07-08.md
- WP-1~WP-8 커밋: da103cb15, 18fa89549, 1ec0e9df3, 7dca3e1b3, cdce6c266, 22c5289b1, ec05883b4, 2cd8eed8d
- 오너 검수 패킷 커밋: 4e5e2a498

확인 사항:
- R1 보완 범위 승인
- 첨부 스크린샷 및 QA receipt 확인
- [직접 재실행] 검증 표 확인
- Stage 7 게이트의 오너 확인 항목 충족 승인

단, 이 승인은 public release/go-live 승인이 아니며, production_ready 게이트 완화도 승인하지 않습니다.
```

Gate statement: Stage 7 owner-confirmation item is satisfied by this approval. This does not approve public release, go-live, or any production_ready gate weakening.
