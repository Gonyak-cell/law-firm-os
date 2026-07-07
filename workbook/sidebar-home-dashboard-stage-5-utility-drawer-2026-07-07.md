# Sidebar IA + Home Dashboard Stage 5 Utility Drawer

Date: 2026-07-07
Stage: 5 - top utility drawer
Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md` §3, §4.3, §7

## Scope Landed

- Generalized the existing notification drawer pattern into `UtilityDrawer` for topbar utilities.
- Changed topbar notification, message, and approval buttons to open an overlay drawer instead of changing the sidebar route directly.
- Kept approval count on the Stage 4 Home action inbox path:
  `HomeSurface` -> `App.homeActionCounts.approval` -> topbar approval icon + Home sidebar approval row.
- Added a message utility icon and drawer shell with a Home `home-messages` "전체 보기" link.
- Implemented NAV-04 topbar reduction behavior for notifications: opening the notification drawer marks the topbar unread indicator as viewed.
- Preserved the Stage 5 gate invariant: opening any topbar utility drawer does not change `data-context-sidebar`, product axis active state, or URL.

## New Owner Decision Logged

| ID | Item | Default applied |
|---|---|---|
| O-05 | Home message unread source for topbar badge and drawer list is not defined in §6 and no current web/API unread-count route was found. | Do not invent local message rows. Ship the message utility drawer with a 0-count empty state and `전체 보기 -> home#home-messages`; wire reduction logic only when a real unread source is introduced. |

## Drawer Contract

| Utility | Topbar click | Drawer count source | Reduction rule | `전체 보기` |
|---|---|---|---|---|
| Notifications | Opens `UtilityDrawer(type="notifications")` | `notificationUnreadCount` in `App` | Opening the drawer sets the topbar unread count to 0. | Not exposed in v1; notifications remain a drawer-only utility. |
| Messages | Opens `UtilityDrawer(type="messages")` | 0 until O-05 is resolved | Not observable in v1 because no real unread message source exists. | `home#home-messages` |
| Approvals | Opens `UtilityDrawer(type="approvals")` | `homeApprovalCount` from Stage 4 action inbox counts | Still reduced only by approval decision handling, not by viewing. | `home#home-requests` |

## NAV Invariant Evidence

| Checkpoint | Result |
|---|---|
| Approval icon open | `data-context-sidebar` stayed `home`; active product axis count stayed 1; URL stayed `view=home#home-dashboard`. |
| Approval "전체 보기" | Drawer closed and route changed to `view=home#home-requests`; sidebar stayed Home. |
| Message icon open | Drawer opened with count 0 empty state; sidebar stayed Home; URL did not change. |
| Message "전체 보기" | Drawer closed and route changed to `view=home#home-messages`; sidebar stayed Home. |
| Notification icon open | Drawer opened and topbar notification aria-label changed to `알림 0건`; badge disappeared; sidebar stayed Home. |

Screenshot evidence:

- `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage5-utility-drawer-2026-07-07.png`

## Direct Verification

| Command | Exit code | Result |
|---|---:|---|
| `node --test apps/web/test/ui-regression.test.mjs` | 0 | 19 tests passed, including Stage 5 drawer/sidebar invariants. |
| `git diff --check -- apps/web/src/App.jsx apps/web/src/components/Shell.jsx apps/web/src/styles.css apps/web/test/ui-regression.test.mjs workbook/sidebar-home-dashboard-stage-5-utility-drawer-2026-07-07.md` | 0 | No whitespace errors. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | Existing repo-wide 127 findings reported; Stage 5 kept the existing drawer pattern and did not add a new visual direction. |
| `npm --workspace apps/web run build` | 0 | Vite build passed with the existing large chunk warning. |
| Playwright smoke against `http://127.0.0.1:5192/?view=home&skin=forest&ctx=allow#home-dashboard` | 0 | Verified topbar approval/message/notification drawer behavior, URL stability, Home sidebar preservation, and `전체 보기` routing. |
| `npm test` | 0 | 4157 tests passed. |
| `npm run build` | 0 | Root build passed with the existing Vite large chunk warning. |

## Notes

- Lazyweb report generation was not callable in this session; Stage 5 reuses the supplied execution plan and existing drawer pattern rather than adding a new visual direction.
- Browser/IAB was not available, so Playwright Chromium was used for the manual QA gate.
- The Stage 5 screenshot intentionally shows the message empty state because O-05 blocks a real unread message data source.
