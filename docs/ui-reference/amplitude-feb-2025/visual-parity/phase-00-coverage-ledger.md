# matter Amplitude Coverage Ledger

Generated at: 2026-06-09T16:05:13.807Z

## Status Policy

This ledger is conservative: representative_verified means a phase-level surface has screenshot evidence; it does not mean every individual screenshot in that phase is pixel-verified.

## Summary

| Status | Screenshot count |
| --- | ---: |
| representative_verified | 314 |
| componentized_foundation | 4 |

## Route Verification Summary

| Status | Screenshot count |
| --- | ---: |
| screenshot_state_route_verified | 318 |

## Phase Summary

| Phase | Screenshots | Status counts | Captures |
| --- | ---: | --- | --- |
| P2 auth and onboarding flow | 28 | representative_verified: 28 | phase-p2-auth-desktop-ko.png, phase-p2-signup-modal-desktop-en.png, phase-p2-login-desktop-en.png, phase-p2-verify-desktop-ko.png, phase-p2-onboarding-desktop-en.png |
| P1 app shell / navigation / search | 4 | componentized_foundation: 4 | phase-00-render-desktop-ko.png, phase-00-render-desktop-en.png, phase-00-render-mobile-ko.png, phase-p1-global-search-desktop-ko.png, phase-p1-loading-desktop-ko.png |
| P3 home dashboards and templates | 28 | representative_verified: 28 | phase-00-render-desktop-ko.png, phase-00-render-desktop-en.png, phase-00-render-mobile-ko.png, phase-00-render-mobile-en.png, phase-p3-home-tour-desktop-en.png, phase-p3-annotation-modal-desktop-en.png |
| P8 Ask matter, cohorts, replay, experiments, flags | 46 | representative_verified: 46 | phase-p8-ask-desktop-ko.png, phase-p8-ask-retention-desktop-en.png, phase-p8-ask-feedback-modal-desktop-en.png, phase-p8-cohorts-replay-desktop-en.png, phase-p8-experiments-desktop-en.png, phase-p8-experiment-overview-cards-desktop-en.png, phase-p8-experiment-builder-desktop-en.png, phase-p8-new-experiment-modal-desktop-en.png, phase-p8-opening-tab-modal-desktop-en.png |
| P6 matter analytics builder | 107 | representative_verified: 107 | phase-p6-analytics-desktop-en.png, phase-p6-data-table-empty-desktop-en.png, phase-p6-data-table-picker-desktop-en.png, phase-p6-save-modal-desktop-en.png, phase-p6-chart-type-modal-desktop-en.png, phase-p6-share-modal-desktop-en.png |
| P7 dashboards, notebooks, reports | 28 | representative_verified: 28 | phase-p7-dashboards-desktop-ko.png, phase-p7-dashboard-template-desktop-en.png, phase-p7-create-dashboard-modal-desktop-en.png, phase-p7-generate-chart-modal-desktop-en.png |
| P4 spaces, all content, search, resource surfaces | 23 | representative_verified: 23 | phase-p4-content-desktop-ko.png, phase-p4-content-archive-modal-desktop-en.png, phase-p1-global-search-desktop-ko.png |
| P5 matter profiles, event stream, raw evidence | 15 | representative_verified: 15 | phase-p5-profiles-desktop-ko.png, phase-p5-user-profiles-list-desktop-en.png, phase-p5-save-cohort-modal-desktop-en.png |
| P9 settings, team, billing, profile, notifications | 33 | representative_verified: 33 | phase-p9-admin-desktop-ko.png, phase-p9-profile-settings-desktop-en.png, phase-p9-profile-picture-modal-desktop-en.png, phase-p9-remove-member-modal-desktop-en.png, phase-p9-feedback-modal-desktop-en.png |
| P10 dark theme and preference parity | 6 | representative_verified: 6 | phase-p10-dark-desktop-en.png |

## Next Gate

- Promote representative surfaces into screenshot-specific verified states.
- Add exact dropdown, date picker, modal, side panel, table, and dark-mode variants per screenshot family.
- Keep `amplitude-screenshot-inventory.json` immutable as the source catalog; use this ledger to track implementation proof.
