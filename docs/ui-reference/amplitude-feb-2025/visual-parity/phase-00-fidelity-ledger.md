# phase-00 Fidelity Ledger

## Captures

- `phase-00-render-desktop-ko.png`: Korean home dashboard, 1920 x 1320.
- `phase-00-render-desktop-en.png`: English home dashboard, 1920 x 1320.
- `phase-00-render-mobile-ko.png`: Korean mobile home shell, 390 x 844.
- `phase-00-render-mobile-en.png`: English mobile home shell, 390 x 844.
- `phase-p2-auth-desktop-ko.png`: Korean auth/onboarding representative, 1920 x 1320.
- `phase-p1-loading-desktop-ko.png`: Korean loading interstitial representative, 1920 x 1320.
- `phase-p2-login-desktop-en.png`: English login representative, 1920 x 1320.
- `phase-p2-verify-desktop-ko.png`: Korean verification representative, 1920 x 1320.
- `phase-p2-onboarding-desktop-en.png`: English onboarding/source-selection representative, 1920 x 1320.
- `phase-p1-global-search-desktop-ko.png`: Korean global search popover representative, 1920 x 1320.
- `phase-p4-content-desktop-ko.png`: Korean all-content/resources representative, 1920 x 1320.
- `phase-p4-content-archive-modal-desktop-en.png`: English archive-confirmation modal representative, 1920 x 1320.
- `phase-p5-profiles-desktop-ko.png`: Korean profile/event detail representative, 1920 x 1320.
- `phase-p6-analytics-desktop-en.png`: English analytics builder representative, 1920 x 1320.
- `phase-p6-save-modal-desktop-en.png`: English save-chart modal representative, 1920 x 1320.
- `phase-p6-chart-type-modal-desktop-en.png`: English chart-type modal representative, 1920 x 1320.
- `phase-p6-share-modal-desktop-en.png`: English share-analysis modal representative, 1920 x 1320.
- `phase-p7-dashboards-desktop-ko.png`: Korean dashboard/notebook representative, 1920 x 1320.
- `phase-p7-generate-chart-modal-desktop-en.png`: English generate-chart-with-AI modal representative, 1920 x 1320.
- `phase-p8-ask-desktop-ko.png`: Korean Ask matter representative, 1920 x 1320.
- `phase-p8-ask-feedback-modal-desktop-en.png`: English Ask feedback modal representative, 1920 x 1320.
- `phase-p8-cohorts-replay-desktop-en.png`: English cohorts and session-replay representative, 1920 x 1320.
- `phase-p8-experiments-desktop-en.png`: English experiments representative, 1920 x 1320.
- `phase-p8-opening-tab-modal-desktop-en.png`: English experiment opening-tab modal representative, 1920 x 1320.
- `phase-p9-admin-desktop-ko.png`: Korean admin/billing representative, 1920 x 1320.
- `phase-p9-remove-member-modal-desktop-en.png`: English remove-member modal representative, 1920 x 1320.
- `phase-p9-feedback-modal-desktop-en.png`: English feedback modal representative, 1920 x 1320.
- `phase-p10-dark-desktop-en.png`: English dark theme representative, 1920 x 1320.
- `phase-00-runtime-verification.md`: Playwright runtime smoke verification for 71 route/state combinations.
- `screenshot-state-route-verification.md`: Playwright screenshot-state verification for all 318 Amplitude screenshot rows through 91 unique matter route/state checks.
- `phase-01-pixel-parity-audit.md`: Low-resolution source-to-matter pixel audit across all 318 screenshot rows and 75 unique matter route captures.

## Comparison Checks

| Check | Result | Notes |
| --- | --- | --- |
| Shell dimensions | Pass for foundation | Uses 48px topbar, 56px icon rail, 216px sidebar, and compact left-navigation density from `amplitude-layout-metrics.csv`. |
| Canvas and surface color | Pass for foundation | Uses `--am-canvas`, `--am-canvas-muted`, `--am-surface`, `--am-border`, and `--am-blue` from `amplitude-visual-tokens.json`. |
| Radius and borders | Pass for foundation | Panels, controls, modals, tables, and nav states use 1px borders with 2px/4px/6px token radius scale. |
| Table density | Pass for foundation | Data tables use 32px headers and 34px rows, matching the compact Amplitude table-first surfaces. |
| Auth flow coverage | Componentized | Marketing, signup, login, password, organization, verification, reset, and sent states are reachable through the auth segmented control. |
| Loading and onboarding | Representative verified | Dedicated captures cover loading interstitial and onboarding/source-selection states from the Amplitude corpus. |
| Global search | Representative verified | Query parameter capture opens the Amplitude-style command/search popover and result list. |
| Modal anatomy | Representative verified | Save, chart-type, share, invite, confirm, and feedback states are represented through route/state checks; save, chart-type, share, and feedback have visual captures. |
| Analytics builder anatomy | Componentized | Preserves analysis rail, query blocks, toolbar, chart, result table, and right recommendation panel. |
| Dashboard/Ask/Experiment surfaces | Representative verified | Dedicated captures cover dashboard cards, Ask prompt/answer/input, cohorts, session replay, experiment table, variant editor, and rollout action entry. |
| Profile/event evidence anatomy | Componentized | Preserves profile card, pinned properties, event stream, and raw JSON side panel. |
| Korean font rule | Pass for foundation | Korean uses local SUITE headings/navigation and local Pretendard body/table/form text. |
| English font rule | Pass for foundation | English uses Comfortaa to match the matter logo wordmark rule. |
| Dark mode | Componentized | Dark canvas, sidebars, panels, borders, and chart surfaces are implemented for representative theme screens. |
| Mobile collapse | Pass for foundation | Mobile screenshot no longer has compact-logo overlap; shell collapses to horizontal rail and stacked cards. |
| Runtime flow smoke test | Pass | `phase-00-runtime-verification.md` verifies 71 routes including home, auth signup/login/verify, content, profiles, analytics, dashboards, Ask, experiments, admin, dark theme, search, save, archive, generate-chart, Ask feedback, opening-tab, invite, remove, feedback widgets, subscription, visual labeling, theme, and experiment builder modal routes. |
| Screenshot state-route verification | Pass | `screenshot-state-route-verification.md` verifies all 318 Amplitude screenshot rows through 91 unique matter route/text checks with zero console errors. |
| Low-resolution pixel audit | Pass | `phase-01-pixel-parity-audit.md` compares all 318 source screenshots against 75 matter route captures after excluding the Mobbin attribution footer; 311 are `pixel_baseline_close`, 7 are `layout_baseline_aligned`, and 0 require screenshot-specific tuning under the current thresholds. |

## Fixed During QA

- Compact rail logo originally rendered the wordmark and overlapped with sidebar/mobile navigation. The rail now displays only the matter mark while auth cards and public marketing surfaces keep the wordmark.
- Sidebar coverage badges originally clipped long status text. Badges now use compact `rep`/`comp` labels and all ten phases are visible.

## Coverage Ledger

- Generated `matter-amplitude-coverage-ledger.json`, `matter-amplitude-coverage-ledger.csv`, and `phase-00-coverage-ledger.md`.
- Current conservative status: `representative_verified` 314 screenshots, `componentized_foundation` 4 screenshots.
- Route verification status: `screenshot_state_route_verified` 318 screenshots.
- This does not claim per-screenshot pixel parity for all 318 screenshots; it proves the phase-level code-native surfaces and representative captures are in place.
- Runtime verification: PASS across 71 route/state checks with no console errors and no mobile horizontal overflow.
- Pixel audit: PASS as measurement coverage across all 318 screenshot rows; current mean low-resolution similarity is 0.9491, with 0 rows requiring screenshot-specific tuning under the current thresholds.
- Full repository validation: `npm test` PASS, 1251 tests passed and 0 failed.

## Remaining Drift / Next Pass

- The current implementation is a code-native full-system foundation with complete screenshot-state coverage and no `needs_pixel_tuning` rows under the current low-resolution parity thresholds.
- The 7 `layout_baseline_aligned` rows remain as a polish queue for future high-resolution inspection, not as uncovered or unrepresented screenshots.
- English Comfortaa is intentionally applied globally per product instruction, even though it is rounder than Amplitude's original UI font.
