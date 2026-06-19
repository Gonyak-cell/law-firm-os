# matter Amplitude Implementation Plan

## Objective

Implement the matter app so the complete Amplitude Feb 2025 corpus is represented as a coherent matter-native SaaS UI system. The current app shell is only a starter and must be treated as replaceable during this plan.

## Build Phases

| Phase | Reference screenshots | Count | Screen families |
| --- | --- | --- | --- |
| P1 app shell / navigation / search | 11, 265-267 | 4 | Loading interstitial; Global search |
| P2 auth and onboarding flow | 0-10, 12-13, 303-317 | 28 | Marketing landing; Signup modal over app preview; Email verification; Password setup; Organization creation; Onboarding checklist; Auth returning user |
| P3 home dashboards and templates | 14-37, 192-195 | 28 | Home dashboard; Guidance overlays; Dashboard widgets; Home menus and resources; Product overview dashboard |
| P4 spaces, all content, search, resource surfaces | 176-178, 241-248, 253-264 | 23 | All content list; Resources and external preview; Feature flags and content |
| P5 matter profiles, event stream, raw evidence | 179, 196-209 | 15 | Live events; User profiles list and cohort save; User profile detail |
| P6 matter analytics builder | 41-147 | 107 | Segmentation builder; Save chart modal; Segmentation advanced states; Chart type modal; Segmentation output and custom events; Share and save modals; Chart and data table entry; Funnel analysis; Data table and metric setup; Data table heatmap; Retention and journey builder |
| P7 dashboards, notebooks, reports | 148-175 | 28 | Dashboard builder; Dashboard chart/report states; Dashboard templates and funnel dashboard; Notebook/report surface |
| P8 Ask matter, cohorts, replay, experiments, flags | 38-40, 180-191, 210-240 | 46 | Ask Amplitude prompt gallery; Guidance cards; Ask AI; Cohorts and users; Session replay; Experiments overview; Experiment builder |
| P9 settings, team, billing, profile, notifications | 249-252, 268-296 | 33 | Data, connections, catalog; Invite teammates; Notifications; Billing and plan; Team members; Profile settings; Feedback widgets |
| P10 dark theme and preference parity | 297-302 | 6 | Theme and dark mode |

## Execution Gates

1. Inventory gate: `amplitude-screenshot-inventory.json` must contain exactly 318 rows.
2. Mapping gate: every row in `amplitude-coverage-matrix.csv` must have a matter destination and implementation phase.
3. Component gate: each UI element family in `amplitude-ui-elements.md` must have a code-native component or documented state.
4. Flow gate: each flow in `amplitude-flow-map.md` must be reachable or intentionally staged in the matter navigation model.
5. Visual token gate: `amplitude-visual-tokens.json`, `amplitude-layout-metrics.csv`, and `matter-amplitude-visual-parity-plan.md` are the implementation contract for layout, padding, radius, colors, shadows, gradients, density, and dark mode. Shared app UI must use `--am-*` tokens instead of one-off hardcoded values.
6. Visual capture gate: for each implemented phase, capture Playwright screenshots at 1920 x 1320 and compare against the reference ranges.
7. Locale/font gate: each implemented phase must support Korean and English. Korean uses SUITE + Pretendard from the supplied local font folders; English uses Comfortaa to match the matter logo font.
8. State gate: modals, dropdowns, side panels, toasts, empty states, and dark-mode states count as required UI states, not optional polish.
9. Coverage gate: no screenshot may remain unassigned. Later implementation status may change from `planned` to `implemented`, `componentized`, or `deferred_with_reason`, but never `ignored`.

## Recommended Next Implementation Order

1. Establish visual-token foundation from `amplitude-visual-tokens.json` and `amplitude-layout-metrics.csv`.
2. Establish bilingual typography foundation: locale dictionaries, `ko`/`en` mode, SUITE/Pretendard font loading for Korean, and Comfortaa loading for English.
3. Rebuild shared shell: topbar, sidebar, workspace selector, global search, invite chip, resource menu, usage card.
4. Build full auth/onboarding state set from 0-13 and 303-317.
5. Build home dashboard and widget system from 14-37 and 192-195.
6. Build all content/search/resources from 176-178, 241-248, 253-264, and global search states from 265-267.
7. Build matter profiles and event evidence from 179, 196-209.
8. Build analytics builder from 41-147, including segmentation, funnel, data table, retention, journey, date/chart controls, export, save/share states.
9. Build dashboards, notebooks, and reports from 148-175.
10. Build Ask matter, cohorts, replay, experiments, flags from 38-40 and 182-240.
11. Build admin, team, billing, notifications, profile, feedback from 268-296.
12. Build dark-mode parity from 297-302.

## Verification Artifacts to Produce Per Phase

- `phase-XX-reference-list.md`: reference screenshot IDs used.
- `phase-XX-render-desktop-ko.png`: Playwright 1920 x 1320 Korean capture.
- `phase-XX-render-desktop-en.png`: Playwright 1920 x 1320 English capture.
- `phase-XX-render-mobile-ko.png`: Korean mobile capture.
- `phase-XX-render-mobile-en.png`: English mobile capture.
- `phase-XX-fidelity-ledger.md`: explicit comparison notes for shell, spacing, table density, controls, modal/dropdown states, locale text fit, font loading, and flow continuity.
- `phase-XX-token-drift.md`: any intentional deviation from `--am-*` tokens, with reason and target follow-up.
