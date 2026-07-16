# Sidebar IA + Home Dashboard Stage 6 Mode Exception

Date: 2026-07-08
Stage: 6 - mode transition exception
Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md` §3 NAV-05 and §7

## Scope Landed

- Added a mode-return target in `apps/web/src/App.jsx`.
- When entering `settings` or `data-import`, the app stores the previous returnable route.
- Direct entry into a mode exception route falls back to `home#home-dashboard`.
- Added a top-of-sidebar `업무로 돌아가기` anchor for mode exception sidebars only.
- Added mode exception data markers:
  - `data-mode-exception-sidebar="true"`
  - `data-mode-exception-depth="deep"`
  - `data-mode-return-anchor="true"`
  - `data-mode-return-view`
  - `data-mode-return-section`

## NAV-05 Checklist

| Condition | Evidence |
|---|---|
| Topbar remains mounted | `Topbar` stays outside the contextual shell and is rendered for `settings` and `data-import`. Playwright observed the top product-axis nav while Settings/Data Import were open. |
| Sidebar top return anchor | Mode exception sidebars render `업무로 돌아가기` before the workspace card. The anchor stores the target route in data attributes. |
| Deeper hierarchy only | Only `modeExceptionUtilityViewIds` (`settings`, `data-import`) render the mode exception sidebar and `GlobalUtilitySurface`; everyday Home utilities remain Home sections or drawers. |

## Browser Smoke Results

| Flow | Result |
|---|---|
| `home#home-requests` -> Settings -> return | Settings opened with topbar retained, Home axis active, sidebar marker `data-mode-exception-sidebar="true"`, return target `home#home-requests`; clicking anchor returned to `home#home-requests`. |
| `home#home-dashboard` -> Data Import -> return | Data Import opened with return target `home#home-dashboard`; clicking anchor returned to Home dashboard. |
| Direct `settings#settings-theme` -> return | Direct deep link used fallback target `home#home-dashboard`; clicking anchor returned to Home dashboard. |

Screenshot evidence:

- `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage6-mode-return-anchor-2026-07-08.png`

## Direct Verification

| Command | Exit code | Result |
|---|---:|---|
| `node --test apps/web/test/ui-regression.test.mjs` | 0 | 20 tests passed, including Stage 6 NAV-05 invariant coverage. |
| `npm --workspace apps/web run build` | 0 | Vite build passed with the existing large chunk warning. |
| `git diff --check -- apps/web/src/App.jsx apps/web/src/components/Shell.jsx apps/web/src/styles.css apps/web/test/ui-regression.test.mjs workbook/sidebar-home-dashboard-stage-6-mode-exception-2026-07-08.md` | 0 | No whitespace errors in Stage 6 files. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | Completed with existing repo findings; Stage 6 only adds the scoped return anchor and no new visual/copy blocker. |
| `npm test` | 0 | 4157 tests passed. |
| `npm run build` | 0 | Root build delegated to `apps/web`; Vite build passed with the existing large chunk warning. |
| Playwright smoke against `http://127.0.0.1:5193` | 0 | Verified Settings/Data Import return anchor behavior, topbar preservation, mode depth marker, and direct-link fallback. |

## Notes

- Lazyweb report generation was not callable in this session; Stage 6 did not introduce a new visual direction and only implements the existing NAV-05 spec.
- Browser/IAB was not available, so Playwright Chromium was used for the manual QA gate.
