# Amplitude UI Elements Catalog

The matter UI should not copy screenshots as static images. Each Amplitude element below becomes a reusable code-native component or state family.

| Element family | Extracted UI elements | Reference screenshots | matter usage |
| --- | --- | --- | --- |
| App shell | topbar, left nav, workspace selector, global search, invite chip, upgrade link, icon actions | 14-37, 41-317 | Shared matter app frame |
| Auth cards | signup, login, password setup, reset password, verification, org creation | 1-10, 303-317 | Complete matter auth and tenant setup |
| Modals | save chart, share, embed, invite, archive, delete/remove, feedback, profile photo, experiment confirmation | 1-3, 26-27, 45, 80, 95-102, 115-118, 157-161, 166, 188-190, 201-205, 219-222, 238, 244, 261, 268-271, 283-285, 290-291, 297-298 | matter modal system |
| Dropdowns and popovers | property menus, resource menus, date pickers, chart selectors, search suggestions, guided tooltips | 15, 17-19, 25, 28-37, 52-57, 60, 64, 69-74, 83-86, 92, 106-111, 120-131, 141-143, 148, 153, 214, 228-230, 265-267, 293-296 | matter controls and contextual overlays |
| Dashboard cards | metric cards, chart cards, templates, gauges, maps, session replay cards, empty cards | 14, 20-24, 148-167, 192-195, 253-258, 264, 299-300 | Home and dashboard surfaces |
| Analysis builder | analysis tabs, event block, measure grid, segment cards, date controls, chart toolbar, result table | 41-79, 103-147 | matter analytics builder |
| Data tables | all content, user profiles, live events, feature flags, team members, event definitions, cohorts | 119-136, 176-179, 196-213, 249, 255, 259-263, 278, 282, 286 | Dense operational tables |
| Event and profile detail | profile card, pinned properties, activity tabs, event stream, raw JSON panel | 196-209 | Matter profile and audit evidence detail |
| Ask AI | prompt gallery, chat input, chart response, follow-up, feedback | 38-40, 182-191, 302 | Ask matter assistant |
| Experiment builder | overview, target controls, variants, preview editor, theme/color controls, rollout confirmation | 216-240 | Workflow flag and experiment system |
| Admin and billing | settings side nav, notifications, profile, team, plan, pricing, checkout, usage | 272-292 | Firm administration |
| Dark mode | theme modal, dark dashboard, dark content, dark ask surface | 297-302 | Dark theme parity |

## Non-negotiable Element Rules

- Use Amplitude-style product density: compact typography, 1px borders, white panels on a pale gray canvas, and strong blue active states.
- Use the extracted visual contract in `amplitude-visual-tokens.json`, `amplitude-layout-metrics.csv`, and `matter-amplitude-visual-parity-plan.md`. Layout, padding, radius, colors, shadows, and gradients must resolve through shared `--am-*` tokens.
- Preserve the bilingual typography system: Korean uses SUITE for headings/navigation and Pretendard for body/table/form text; English uses Comfortaa to match the matter logo font.
- Preserve table-first workflows for operational surfaces; do not convert dense tables into marketing-style cards.
- Preserve modal anatomy: dim overlay, compact title, dismiss icon, gray notice band where present, footer action row.
- Preserve chart-builder anatomy: left analysis rail, top chart toolbar, central graph, bottom result table.
- Preserve side panels and dropdowns as first-class states, not hidden implementation details.
- Preserve dark-mode parity after light-mode surfaces are stable.
