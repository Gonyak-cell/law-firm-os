# Amplitude Feb 2025 UI Reference for matter

This folder is the source-of-truth planning pack for applying the complete Amplitude screenshot corpus to the matter app UI.

## Corpus

- Source folder: `Law Firm OS UI/Amplitude web Feb 2025/`
- Screenshots covered: `Amplitude web Feb 2025 0.png` through `Amplitude web Feb 2025 317.png`
- Count: 318
- Dimensions: 1920 x 1320 for every numbered screenshot
- Rule: no numbered screenshot may be ignored. Each screenshot must be implemented directly, componentized into the matter design system, or explicitly deferred with a reason during later build phases.

## Generated Files

- `amplitude-screenshot-inventory.json`: one row per screenshot with flow, screen family, UI elements, and matter destination.
- `amplitude-coverage-matrix.csv`: spreadsheet-ready coverage tracker for all 318 screenshots.
- `amplitude-flow-map.md`: flow-level grouping and matter adaptation target.
- `amplitude-ui-elements.md`: reusable component catalog extracted from the corpus.
- `amplitude-visual-tokens.json`: sampled Amplitude palette plus matter token contract.
- `amplitude-layout-metrics.csv`: Amplitude-derived layout, spacing, radius, and density targets.
- `matter-amplitude-visual-parity-plan.md`: visual fidelity gate for exact layout/padding/radius/color/shadow/gradient parity.
- `matter-amplitude-screen-map.md`: Amplitude screen families mapped to matter product surfaces.
- `matter-amplitude-implementation-plan.md`: build order and verification gates.
- `matter-amplitude-coverage-ledger.json`: conservative implementation/evidence ledger for all 318 screenshots.
- `matter-amplitude-coverage-ledger.csv`: spreadsheet-ready version of the implementation/evidence ledger.
- `matter-amplitude-screenshot-state-registry.json`: one row per screenshot mapped to a concrete matter route/state and expected UI text.
- `matter-amplitude-screenshot-state-registry.csv`: spreadsheet-ready route/state registry for all 318 screenshots.
- `matter-amplitude-screenshot-state-registry.md`: readable route/state registry summary.
- `matter-amplitude-screenshot-state-verification.json`: Playwright verification output proving every screenshot row has a reachable matter state.
- `matter-amplitude-screenshot-state-verification.csv`: spreadsheet-ready route verification result for all 318 screenshots.
- `matter-amplitude-pixel-parity-audit.json`: low-resolution source-to-matter pixel audit for all 318 screenshots.
- `matter-amplitude-pixel-parity-audit.csv`: spreadsheet-ready pixel audit output.
- `matter-bilingual-font-plan.md`: Korean/English locale and typography rules for the rebuilt matter UI.
- `contact-sheets/`: visual audit sheets covering every numbered screenshot.

## Language And Font Rule

- Build two product-language versions: Korean and English.
- Korean version: use local SUITE for headings/navigation and local Pretendard for body, forms, tables, modals, and dense operational text.
- English version: use Comfortaa, the same font used by `docs/ui-reference/prototypes/matter-by-amic-logo-animation.html` for the matter logo wordmark.
- The font rule is cross-cutting. Every screenshot phase must be implemented and verified in both language modes unless a phase is explicitly marked locale-neutral.

## Current Verification State

- `node scripts/generate-matter-amplitude-screenshot-state-registry.mjs`: PASS, 318 screenshot rows, 50 flow groups.
- `node scripts/verify-matter-amplitude-screenshot-states.mjs`: PASS, 318 screenshot rows route-verified through 91 unique route/text checks.
- `node scripts/capture-matter-amplitude-parity.mjs`: PASS, 76 visual parity PNG artifacts covering 75 route/state captures across desktop, mobile, auth, signup modal, loading, home tour, annotation, search, analytics/data-table modals, dashboards, Ask, experiments, admin, profile, feedback, archive, remove, opening-tab, generate-chart, and dark mode.
- `node scripts/audit-matter-amplitude-pixel-parity.mjs`: PASS, 318 screenshot rows compared against 75 reachable matter route captures after excluding the Mobbin attribution footer; mean low-resolution similarity 0.9491; 311 `pixel_baseline_close`, 7 `layout_baseline_aligned`, 0 `needs_pixel_tuning`.
- `node scripts/verify-matter-ui-flows.mjs`: PASS, 71 runtime route/state checks, no console errors, no mobile horizontal overflow.
- Policy: this proves complete screenshot-to-state coverage, representative visual implementation, and a quantitative pixel audit with no remaining `needs_pixel_tuning` rows under the current baseline thresholds.

## Flow Summary

| Flow | Screenshots | Count | Family | Implementation phase |
| --- | --- | --- | --- | --- |
| marketing-entry | 0-0 | 1 | Marketing landing | P2 auth and onboarding flow |
| signup-start | 1-3 | 3 | Signup modal over app preview | P2 auth and onboarding flow |
| email-verification | 4-4 | 1 | Email verification | P2 auth and onboarding flow |
| password-setup | 5-7 | 3 | Password setup | P2 auth and onboarding flow |
| organization-create | 8-10 | 3 | Organization creation | P2 auth and onboarding flow |
| loading | 11-11 | 1 | Loading interstitial | P1 app shell / navigation / search |
| onboarding-source-selection | 12-13 | 2 | Onboarding checklist | P2 auth and onboarding flow |
| home-dashboard | 14-15 | 2 | Home dashboard | P3 home dashboards and templates |
| home-guidance | 16-19 | 4 | Guidance overlays | P3 home dashboards and templates |
| home-widgets | 20-24 | 5 | Dashboard widgets | P3 home dashboards and templates |
| home-actions | 25-37 | 13 | Home menus and resources | P3 home dashboards and templates |
| ask-entry | 38-40 | 3 | Ask Amplitude prompt gallery | P8 Ask matter, cohorts, replay, experiments, flags |
| segmentation-basic | 41-44 | 4 | Segmentation builder | P6 matter analytics builder |
| save-chart-modal | 45-45 | 1 | Save chart modal | P6 matter analytics builder |
| segmentation-advanced | 46-79 | 34 | Segmentation advanced states | P6 matter analytics builder |
| chart-type-modal | 80-80 | 1 | Chart type modal | P6 matter analytics builder |
| segmentation-output | 81-94 | 14 | Segmentation output and custom events | P6 matter analytics builder |
| share-save-modals | 95-102 | 8 | Share and save modals | P6 matter analytics builder |
| chart-page-empty-table | 103-104 | 2 | Chart and data table entry | P6 matter analytics builder |
| funnel-analysis | 105-111 | 7 | Funnel analysis | P6 matter analytics builder |
| data-table-and-metric | 112-119 | 8 | Data table and metric setup | P6 matter analytics builder |
| data-table-heatmap | 120-136 | 17 | Data table heatmap | P6 matter analytics builder |
| retention-and-journeys | 137-147 | 11 | Retention and journey builder | P6 matter analytics builder |
| dashboard-create | 148-155 | 8 | Dashboard builder | P7 dashboards, notebooks, reports |
| dashboard-chart-report | 156-161 | 6 | Dashboard chart/report states | P7 dashboards, notebooks, reports |
| dashboard-templates | 162-167 | 6 | Dashboard templates and funnel dashboard | P7 dashboards, notebooks, reports |
| notebooks | 168-175 | 8 | Notebook/report surface | P7 dashboards, notebooks, reports |
| all-content-initial | 176-178 | 3 | All content list | P4 spaces, all content, search, resource surfaces |
| live-events | 179-179 | 1 | Live events | P5 matter profiles, event stream, raw evidence |
| analysis-card-guidance | 180-181 | 2 | Guidance cards | P8 Ask matter, cohorts, replay, experiments, flags |
| ask-ai | 182-191 | 10 | Ask AI | P8 Ask matter, cohorts, replay, experiments, flags |
| product-overview | 192-195 | 4 | Product overview dashboard | P3 home dashboards and templates |
| user-profiles-list | 196-206 | 11 | User profiles list and cohort save | P5 matter profiles, event stream, raw evidence |
| user-profile-detail | 207-209 | 3 | User profile detail | P5 matter profiles, event stream, raw evidence |
| cohorts-users | 210-212 | 3 | Cohorts and users | P8 Ask matter, cohorts, replay, experiments, flags |
| session-replay | 213-215 | 3 | Session replay | P8 Ask matter, cohorts, replay, experiments, flags |
| experiments-overview | 216-222 | 7 | Experiments overview | P8 Ask matter, cohorts, replay, experiments, flags |
| experiment-builder | 223-240 | 18 | Experiment builder | P8 Ask matter, cohorts, replay, experiments, flags |
| resources-and-external-preview | 241-248 | 8 | Resources and external preview | P4 spaces, all content, search, resource surfaces |
| data-connections-catalog | 249-252 | 4 | Data, connections, catalog | P9 settings, team, billing, profile, notifications |
| flags-and-content | 253-264 | 12 | Feature flags and content | P4 spaces, all content, search, resource surfaces |
| global-search | 265-267 | 3 | Global search | P1 app shell / navigation / search |
| invite-teammates | 268-271 | 4 | Invite teammates | P9 settings, team, billing, profile, notifications |
| notifications | 272-274 | 3 | Notifications | P9 settings, team, billing, profile, notifications |
| billing-plan | 275-281 | 7 | Billing and plan | P9 settings, team, billing, profile, notifications |
| team-members | 282-286 | 5 | Team members | P9 settings, team, billing, profile, notifications |
| profile-settings | 287-292 | 6 | Profile settings | P9 settings, team, billing, profile, notifications |
| feedback | 293-296 | 4 | Feedback widgets | P9 settings, team, billing, profile, notifications |
| theme-dark-mode | 297-302 | 6 | Theme and dark mode | P10 dark theme and preference parity |
| auth-returning-user | 303-317 | 15 | Auth returning user | P2 auth and onboarding flow |
