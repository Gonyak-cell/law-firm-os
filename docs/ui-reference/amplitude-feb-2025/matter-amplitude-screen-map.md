# matter Screen Map from Amplitude

This map converts the Amplitude product surfaces into matter product surfaces. It is a planning overlay for implementation, not a claim that the current app already covers the corpus.

| Screenshots | Amplitude family | matter destination | Build phase |
| --- | --- | --- | --- |
| 0-0 | Marketing landing | Public matter marketing shell and pre-auth brand promise | P2 auth and onboarding flow |
| 1-3 | Signup modal over app preview | matter account creation and tenant-region consent | P2 auth and onboarding flow |
| 4-4 | Email verification | matter email verification and invite acceptance | P2 auth and onboarding flow |
| 5-7 | Password setup | password setup for firm users | P2 auth and onboarding flow |
| 8-10 | Organization creation | AMIC Law tenant creation | P2 auth and onboarding flow |
| 11-11 | Loading interstitial | route-level loading and data-fetch state | P1 app shell / navigation / search |
| 12-13 | Onboarding checklist | matter setup checklist for DMS, billing, audit, client portal integrations | P2 auth and onboarding flow |
| 14-15 | Home dashboard | matter home overview | P3 home dashboards and templates |
| 16-19 | Guidance overlays | guided onboarding and contextual coaching | P3 home dashboards and templates |
| 20-24 | Dashboard widgets | matter dashboard widget library | P3 home dashboards and templates |
| 25-37 | Home menus and resources | dashboard controls, resource drawer, and workspace actions | P3 home dashboards and templates |
| 38-40 | Ask Amplitude prompt gallery | Ask matter prompt gallery | P8 Ask matter, cohorts, replay, experiments, flags |
| 41-44 | Segmentation builder | matter analytics segmentation | P6 matter analytics builder |
| 45-45 | Save chart modal | save matter chart | P6 matter analytics builder |
| 46-79 | Segmentation advanced states | advanced matter analytics builder states | P6 matter analytics builder |
| 80-80 | Chart type modal | chart visualization picker | P6 matter analytics builder |
| 81-94 | Segmentation output and custom events | analytics result review and event definition sidecar | P6 matter analytics builder |
| 95-102 | Share and save modals | share/save matter analysis | P6 matter analytics builder |
| 103-104 | Chart and data table entry | saved chart route and data table empty state | P6 matter analytics builder |
| 105-111 | Funnel analysis | matter workflow funnel analysis | P6 matter analytics builder |
| 112-119 | Data table and metric setup | matter data table and KPI builder | P6 matter analytics builder |
| 120-136 | Data table heatmap | matter dimension table and heatmap analysis | P6 matter analytics builder |
| 137-147 | Retention and journey builder | retention of clients/matters and legal workflow journey analysis | P6 matter analytics builder |
| 148-155 | Dashboard builder | matter dashboard builder | P7 dashboards, notebooks, reports |
| 156-161 | Dashboard chart/report states | dashboard/report publishing | P7 dashboards, notebooks, reports |
| 162-167 | Dashboard templates and funnel dashboard | dashboard templates for legal operations | P7 dashboards, notebooks, reports |
| 168-175 | Notebook/report surface | matter narrative report/notebook | P7 dashboards, notebooks, reports |
| 176-178 | All content list | matter all content / DMS index | P4 spaces, all content, search, resource surfaces |
| 179-179 | Live events | matter live audit/event stream | P5 matter profiles, event stream, raw evidence |
| 180-181 | Guidance cards | analytics education and empty-state guidance | P8 Ask matter, cohorts, replay, experiments, flags |
| 182-191 | Ask AI | Ask matter legal analytics assistant | P8 Ask matter, cohorts, replay, experiments, flags |
| 192-195 | Product overview dashboard | matter product overview | P3 home dashboards and templates |
| 196-206 | User profiles list and cohort save | matter profile list and cohort save | P5 matter profiles, event stream, raw evidence |
| 207-209 | User profile detail | matter profile detail and audit evidence | P5 matter profiles, event stream, raw evidence |
| 210-212 | Cohorts and users | client/matter cohorts | P8 Ask matter, cohorts, replay, experiments, flags |
| 213-215 | Session replay | client portal session replay and audit playback | P8 Ask matter, cohorts, replay, experiments, flags |
| 216-222 | Experiments overview | workflow experiment and feature-test entry | P8 Ask matter, cohorts, replay, experiments, flags |
| 223-240 | Experiment builder | legal workflow flags, controlled rollout, and portal experiment builder | P8 Ask matter, cohorts, replay, experiments, flags |
| 241-248 | Resources and external preview | developer resources and integration setup | P4 spaces, all content, search, resource surfaces |
| 249-252 | Data, connections, catalog | matter data integrations and event catalog | P9 settings, team, billing, profile, notifications |
| 253-264 | Feature flags and content | workflow flags, content library and archive flow | P4 spaces, all content, search, resource surfaces |
| 265-267 | Global search | global matter search | P1 app shell / navigation / search |
| 268-271 | Invite teammates | firm user invitation | P9 settings, team, billing, profile, notifications |
| 272-274 | Notifications | matter notifications | P9 settings, team, billing, profile, notifications |
| 275-281 | Billing and plan | subscription, usage and billing admin | P9 settings, team, billing, profile, notifications |
| 282-286 | Team members | firm team management | P9 settings, team, billing, profile, notifications |
| 287-292 | Profile settings | personal account settings | P9 settings, team, billing, profile, notifications |
| 293-296 | Feedback widgets | in-product feedback | P9 settings, team, billing, profile, notifications |
| 297-302 | Theme and dark mode | light/dark matter theme parity | P10 dark theme and preference parity |
| 303-317 | Auth returning user | complete returning-user auth flow | P2 auth and onboarding flow |

## Domain Translation Rules

- User Profiles -> Matter Profiles, Client Profiles, Actor Profiles, and event-bound audit identity.
- Events -> Matter, DMS, Billing, Permission, Audit, Client Portal, and AI Evidence events.
- Charts -> Matter throughput, document activity, review queues, approval cycle time, billing/WIP, conflict checks, DMS version movement.
- Cohorts -> client cohorts, matter cohorts, risk cohorts, partner review queues, segmentable groups.
- Experiments and Flags -> workflow flags, portal rollout flags, permission experiment gates, controlled process changes.
- Session Replay -> client portal playback and user-session audit review.
- Data/Catalog/Connections -> master data, integration catalog, event definitions, and connector health.
- Billing/Plan/Admin -> firm tenant administration, usage, seats, teams, profile, notification, and subscription controls.
