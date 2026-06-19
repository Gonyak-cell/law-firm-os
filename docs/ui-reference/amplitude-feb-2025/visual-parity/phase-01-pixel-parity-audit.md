# phase-01 Pixel Parity Audit

Generated at: 2026-06-10T13:15:56.939Z

## Policy

This is a quantitative low-resolution audit for prioritizing screenshot-specific tuning. It excludes the bottom Mobbin attribution band from source screenshots and proves that all Amplitude screenshots can be compared against a reachable matter route/state, but it does not claim final per-screenshot pixel parity.

## Summary

- Screenshot rows audited: 318
- Unique matter route captures: 77
- Sample size per comparison: 160 x 110
- Mean low-resolution similarity: 0.9497
- Mean changed pixel ratio: 0.1055

| Status | Screenshot count |
| --- | ---: |
| pixel_baseline_close | 318 |

## Phase Summary

| Phase | Screenshots | Mean similarity | Mean changed ratio | Status counts |
| --- | ---: | ---: | ---: | --- |
| P2 auth and onboarding flow | 28 | 0.9575 | 0.0766 | pixel_baseline_close: 28 |
| P1 app shell / navigation / search | 4 | 0.9712 | 0.0664 | pixel_baseline_close: 4 |
| P3 home dashboards and templates | 28 | 0.947 | 0.125 | pixel_baseline_close: 28 |
| P8 Ask matter, cohorts, replay, experiments, flags | 46 | 0.9474 | 0.0962 | pixel_baseline_close: 46 |
| P6 matter analytics builder | 107 | 0.9532 | 0.1086 | pixel_baseline_close: 107 |
| P7 dashboards, notebooks, reports | 28 | 0.939 | 0.1258 | pixel_baseline_close: 28 |
| P4 spaces, all content, search, resource surfaces | 23 | 0.9602 | 0.0827 | pixel_baseline_close: 23 |
| P5 matter profiles, event stream, raw evidence | 15 | 0.9508 | 0.0856 | pixel_baseline_close: 15 |
| P9 settings, team, billing, profile, notifications | 33 | 0.9398 | 0.1179 | pixel_baseline_close: 33 |
| P10 dark theme and preference parity | 6 | 0.9298 | 0.1622 | pixel_baseline_close: 6 |

## Largest Drift Rows

| Screenshot | Flow | Phase | Route | Similarity | Changed ratio | Status |
| ---: | --- | --- | --- | ---: | ---: | --- |
| 21 | home-widgets | P3 home dashboards and templates | `/?locale=ko&view=home` | 0.8651 | 0.2338 | pixel_baseline_close |
| 171 | notebooks | P7 dashboards, notebooks, reports | `/?locale=ko&view=dashboards` | 0.873 | 0.3204 | pixel_baseline_close |
| 233 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=builder` | 0.8738 | 0.2108 | pixel_baseline_close |
| 279 | billing-plan | P9 settings, team, billing, profile, notifications | `/?locale=ko&view=admin` | 0.8785 | 0.2292 | pixel_baseline_close |
| 277 | billing-plan | P9 settings, team, billing, profile, notifications | `/?locale=ko&view=admin` | 0.8791 | 0.2306 | pixel_baseline_close |
| 238 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=expStartModal` | 0.8808 | 0.2129 | pixel_baseline_close |
| 140 | retention-and-journeys | P6 matter analytics builder | `/?locale=en&view=analytics` | 0.8809 | 0.2707 | pixel_baseline_close |
| 235 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=expGoalsConfigured` | 0.8846 | 0.2187 | pixel_baseline_close |
| 234 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=expGoalsDraft` | 0.8865 | 0.2149 | pixel_baseline_close |
| 271 | invite-teammates | P9 settings, team, billing, profile, notifications | `/?locale=ko&view=admin&modal=invite` | 0.8865 | 0.1972 | pixel_baseline_close |
| 224 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=expSiteSetup` | 0.8869 | 0.217 | pixel_baseline_close |
| 300 | theme-dark-mode | P10 dark theme and preference parity | `/?locale=en&theme=dark&view=dark&variant=darkTemplates` | 0.8877 | 0.2739 | pixel_baseline_close |
| 236 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=expDelivery` | 0.888 | 0.2151 | pixel_baseline_close |
| 225 | experiment-builder | P8 Ask matter, cohorts, replay, experiments, flags | `/?locale=en&view=experiments&variant=expVariantsDrawer` | 0.8914 | 0.198 | pixel_baseline_close |
| 166 | dashboard-templates | P7 dashboards, notebooks, reports | `/?locale=en&view=dashboards&variant=template&modal=createDashboard` | 0.8933 | 0.1997 | pixel_baseline_close |
| 298 | theme-dark-mode | P10 dark theme and preference parity | `/?locale=en&theme=dark&view=dark` | 0.8944 | 0.3002 | pixel_baseline_close |
| 105 | funnel-analysis | P6 matter analytics builder | `/?locale=en&view=analytics` | 0.8967 | 0.2317 | pixel_baseline_close |
| 268 | invite-teammates | P9 settings, team, billing, profile, notifications | `/?locale=ko&view=admin&modal=invite` | 0.8974 | 0.17 | pixel_baseline_close |
| 269 | invite-teammates | P9 settings, team, billing, profile, notifications | `/?locale=ko&view=admin&modal=invite` | 0.8974 | 0.17 | pixel_baseline_close |
| 270 | invite-teammates | P9 settings, team, billing, profile, notifications | `/?locale=ko&view=admin&modal=invite` | 0.8976 | 0.1715 | pixel_baseline_close |
| 80 | chart-type-modal | P6 matter analytics builder | `/?locale=en&view=analytics&modal=chartType` | 0.8999 | 0.1743 | pixel_baseline_close |
| 172 | notebooks | P7 dashboards, notebooks, reports | `/?locale=ko&view=dashboards` | 0.9044 | 0.2291 | pixel_baseline_close |
| 291 | profile-settings | P9 settings, team, billing, profile, notifications | `/?locale=en&view=admin&variant=profile&modal=profilePicture` | 0.9062 | 0.1955 | pixel_baseline_close |
| 138 | retention-and-journeys | P6 matter analytics builder | `/?locale=en&view=analytics` | 0.9081 | 0.1915 | pixel_baseline_close |

## Next Gate

- Use the largest-drift rows to tune auth modal placement, public/auth overlays, specific dropdowns, date pickers, heatmaps, and admin/settings panels.
- Re-run this audit after each tuning pass and promote rows only when source-to-matter visual metrics and direct screenshot inspection both pass.
