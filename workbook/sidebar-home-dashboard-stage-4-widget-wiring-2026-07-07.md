# Sidebar IA + Home Dashboard Stage 4 Widget Wiring

Date: 2026-07-07
Stage: 4 - widget live-data wiring
Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md` §5-§7

## Scope Landed

- Wired Home W-01 approval, W-02 task, W-03 agenda, and W-04 feed widgets to the Stage 3 Home API contract through `apps/web/src/data/apiClient.js`.
- Kept W-05 system status on the existing capability probes, preserving Matter/Vault/People/sync compact pills.
- Added inline action buttons for approval and task rows using `POST /api/home/action-inbox/:id/decision`.
- Added local 5-second undo affordance from the decision response without adding a new backend contract route.
- Propagated the Home action inbox `counts.approval` through one state path:
  `HomeSurface` widget count -> `App` state -> `Topbar` approval icon -> `Sidebar` Home approval entry.

## Count Consistency Contract

| Surface | Count source |
|---|---|
| W-01 approval widget | `actionInbox.counts.approval` from `fetchHomeActionInbox` |
| Home sidebar `승인 요청` | `homeApprovalCount` derived from `homeActionCounts.approval` |
| Topbar approval icon | same `homeApprovalCount` prop |
| Home requests dedicated route marker | `data-active-home-section` plus same Home action count state |

Stage 4 regression coverage asserts that these count surfaces are not independently computed from row length, static navigation data, or notification fixtures.

## API Client Mapping

| Client function | API route used by web | Reason |
|---|---|---|
| `fetchHomeActionInbox` | `/api/home/action-inbox` | Uses Stage 3 alias so Vite dev proxy and desktop API base both resolve. |
| `decideHomeActionInboxItem` | `/api/home/action-inbox/:id/decision` | Preserves audit/idempotency behavior from Stage 3. |
| `fetchHomeAgenda` | `/api/home/agenda` | Calendar widget reads month-window agenda events. |
| `fetchHomeFeed` | `/api/home/feed` | Feed widget reads notice/news/newsletter tabs from the contract. |

The canonical contract remains `/home/*`; `/api/home/*` is the frontend transport path.

## Visual QA Ledger

| Checkpoint | Result |
|---|---|
| Grid template | Preserved `appr todo rail` / `feed feed rail`; right rail still spans both rows. |
| Card alignment | Approval, To Do, feed, calendar, and system cards retain Stage 2 placement and no card-specific fixed heights were added. |
| Count badges | Browser smoke observed widget/sidebar/topbar count `2`, after inline approve `1`, after undo `2`. |
| Inline action | Approval row `승인` calls decision endpoint, shows undo, and updates count without sidebar replacement. |
| Feed | Notice feed renders latest feature card plus list from API entries. |
| Calendar | Selected date agenda renders API event list in-place. |
| NAV invariants | Row body navigates content; inline action buttons do not replace the sidebar axis. |

Screenshot evidence:

- `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage4-home-dashboard-data-wiring-2026-07-07.png`

## Direct Verification

| Command | Exit code | Result |
|---|---:|---|
| `node --test apps/web/test/ui-regression.test.mjs` | 0 | 18 tests passed, including Stage 4 count consistency source gate. |
| `git diff --check -- apps/web/src/App.jsx apps/web/src/components/Shell.jsx apps/web/src/components/HomeSurface.jsx apps/web/src/data/apiClient.js apps/web/src/styles.css apps/web/test/ui-regression.test.mjs workbook/sidebar-home-dashboard-stage-4-widget-wiring-2026-07-07.md` | 0 | No whitespace errors. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | Existing repo-wide 127 findings reported; no Stage 4 changed-file blocker. |
| `npm --workspace apps/web run build` | 0 | Vite build passed with the existing large chunk warning. |
| Playwright route-intercept smoke against `http://127.0.0.1:5191/?view=home&skin=forest&ctx=allow#home-dashboard` | 0 | Count consistency observed `2 -> 1 -> 2`; feed and agenda rendered API data; screenshot captured. |
| `npm test` | 0 | 4157 tests passed. |
| `npm run build` | 0 | Root build passed with the existing Vite large chunk warning. |

## Notes

- `node --check` is not a valid JSX syntax gate in this repo because Node does not load `.jsx` directly; Vite build was used for JSX syntax verification.
- Lazyweb report generation was not callable in this session; Stage 4 is data wiring against an already supplied design spec, so no new design evidence was generated.
