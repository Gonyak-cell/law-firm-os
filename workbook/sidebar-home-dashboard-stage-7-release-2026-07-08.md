# Sidebar Home Dashboard Stage 7 Release Closeout (2026-07-08)

Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md`
Baseline implementation commit: `5cdbd4485 feat(web): implement sidebar home dashboard IA`
Scope: Stage 7 release gate for web + desktop Home dashboard IA.

## Claim Boundary

```json
{
  "stage_0_6_committed": true,
  "stage_7_web_accessibility_hardened": true,
  "stage_7_web_regression_verified": true,
  "stage_7_desktop_packaged_shell_smoke_verified": true,
  "stage_7_packaged_renderer_rebuilt": false,
  "owner_final_approval": false,
  "public_release": false,
  "production_go_live": false,
  "production_ready_gate_weakened": false
}
```

## Stage 7 Results

| Item | Result | Evidence |
| --- | --- | --- |
| i18n/accessibility labels | PASS | Feed tablist is `홈 피드`; Home action buttons, calendar days, feed links, sidebar group toggles, and search clear button have contextual names. |
| NAV-01 top axis current state | PASS | Web and desktop receipts show exactly one top-axis `aria-current="page"` with Home active. |
| NAV-02 sidebar replacement boundary | PASS | Utility drawer smoke keeps `data-context-sidebar="home"`; Settings/Data Import remain explicit mode exceptions. |
| NAV-03 click grammar | PASS | Sidebar leaf items route content; group toggles expose expand/collapse labels; mode return anchor is separate. |
| NAV-04 drawer behavior | PASS | Message drawer opens as modal dialog without changing the sidebar context. |
| NAV-05 mode exception | PASS | Settings/Data Import retain top bar, Home context sidebar, deep marker, and `업무로 돌아가기` anchor. |
| NAV-06 legacy/deep link compatibility | PASS | Desktop smoke verifies legacy `view=messages` resolves to `home-messages` with Home axis preserved. |
| Desktop runtime smoke | PASS | Packaged macOS executable launched with approved dev renderer at `127.0.0.1:5173`; preload bridge exposed `matterSession`. |

## Evidence Artifacts

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage7-web-accessibility-2026-07-08.json` | PASS | Browser QA receipt for Home IA accessibility and NAV invariants. |
| `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage7-web-accessibility-2026-07-08.png` | PASS | Web visual QA screenshot after closing search popover. |
| `docs/lazycodex/evidence/matter-desktop/artifacts/sidebar-stage7-desktop-smoke-2026-07-08.json` | PASS | Packaged desktop shell smoke with approved dev renderer. |
| `docs/lazycodex/evidence/matter-desktop/artifacts/sidebar-stage7-desktop-smoke-2026-07-08.png` | PASS | Desktop visual QA screenshot. |
| `docs/desktop/matter-desktop-home-dashboard-ia-release-note-2026-07-08.md` | READY | Release-boundary note for owner review. |

## Direct Rerun Verification

| Command | Exit | Result |
| --- | ---: | --- |
| `git diff --check` | 0 | PASS, no whitespace errors in current diff. |
| `node --test apps/web/test/ui-regression.test.mjs` | 0 | PASS, 21/21 tests. |
| `node --input-type=module <web Stage 7 Playwright evidence>` | 0 | PASS, web receipt written. |
| `node --input-type=module <desktop Stage 7 packaged-shell Playwright evidence>` | 0 | PASS, desktop receipt written. |
| `node --test apps/api/test/home-dashboard-api.test.js` | 0 | PASS, 6/6 tests. |
| `npm --workspace apps/desktop run test:smoke` | 0 | PASS, 77/77 tests. |
| `npm test` | 0 | PASS, 4157/4157 tests. |
| `npm run build` | 0 | PASS, Vite production build completed. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | PASS exit with 97 findings in broad dirty changed-file set; Stage 7 screenshots and diff reviewed, no new blocker introduced. |
| `if rg -n "Bearer|AWS_SECRET_ACCESS_KEY|password=.*|reset_token|operator_token|matter://password-reset/confirm\\?token=" ...; then exit 1; else exit 0; fi` | 0 | PASS, Stage 7 web/desktop evidence has no secret-pattern matches. |

## Desktop Boundary

Stage 7 smoke exercised the actual packaged macOS executable shell and preload bridge:

- executable: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`
- renderer override: `MATTER_DESKTOP_RENDERER_URL=http://127.0.0.1:5173/?desktop=1&view=home&data=live&ctx=allow&splash=0#home-dashboard`
- approved origin: `apps/desktop/src/main/origin-policy.js` allows `http://127.0.0.1:5173`
- bridge proof: `window.matterSession.status`, `window.matterSession.smoke`, and `window.matterSession.api` were present in the packaged shell

This is a packaged shell smoke with the latest dev renderer. It is not a notarized package rebuild, not a store distribution, not a public release, and not production go-live.

## Owner Decisions

| ID | Status | Stage 7 handling |
| --- | --- | --- |
| O-01 | Confirmed | News sources are Bloter, Lawtimes, Dealsite, and Invest Chosun; no Stage 7 contract change. |
| O-02 | Default applied | Newsletter source remains Vault tag-based collection pending owner confirmation. |
| O-03 | Default applied | Company status remains admin-role gated pending owner confirmation. |
| O-04 | Default applied | Inline decisions remain low-risk only pending owner confirmation. |
| O-05 | Not opened | No new owner decision was introduced in Stage 7. |

## Unverified / Not Claimed

| Item | Reason |
| --- | --- |
| Owner final approval | Awaiting owner review of this packet and screenshots. |
| Public release | No owner approval, publishing command, notarized release, or public distribution was run. |
| Production go-live | Local/dev smoke only; no production deploy or customer rollout command was run. |
| Packaged renderer rebuild | Stage 7 smoke used packaged shell with approved dev renderer; no desktop build artifact was rebuilt for this commit. |
| `npm run matter-desktop:screen-qa` | Not run for Stage 7 final gate because it is a broad AWS/password-reset screen QA and the current script still carries the pre-Stage-7 Portal-excluded top-axis expectation. Focused Stage 7 packaged-shell smoke above is the direct desktop evidence for this release gate. |
