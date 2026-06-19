# matter Amplitude Visual Parity Plan

## Purpose

This gate turns the Amplitude Feb 2025 corpus into a measurable visual contract for the matter rebuild. The implementation must not stop at an Amplitude-like mood: layout, spacing, radius, color, elevation, density, modal/dropdown states, and dark theme all need traceable parity evidence.

## Source Contract

- Corpus: `Law Firm OS UI/Amplitude web Feb 2025`
- Screenshot count: 318
- Native viewport: 1920 x 1320
- Existing mapping: `amplitude-screenshot-inventory.json`, `amplitude-coverage-matrix.csv`
- Token source: `amplitude-visual-tokens.json`
- Layout source: `amplitude-layout-metrics.csv`

## Required Token Families

- Color: canvas, sidebars, panels, table headers, borders, text, muted text, active blue, soft blue, success, warning, danger, dark theme.
- Spacing: 4px base grid, topbar, rail, sidebar, page gutters, panel padding, table row/header heights, controls, modal/body/footer paddings.
- Shape: 2px micro radius, 4px default radius, 6px larger surface radius, pill radius only for chips.
- Elevation: mostly flat surfaces, 1px borders first, floating/modal shadows only for overlays.
- Gradients: only on surfaces where the screenshots show actual gradient/illustration treatment. No decorative gradient backgrounds in app chrome.
- State: hover, active, selected, disabled, focus, validation, empty, loading, dimmed overlay, dark mode.

## Implementation Rule

All app chrome and reusable UI must consume CSS custom properties prefixed with `--am-`. Hardcoded hex, one-off padding, one-off radius, and non-token shadows fail the parity gate unless the fidelity ledger records a deliberate exception.

## Per-Phase Evidence

For every implementation phase:

1. List reference screenshot IDs in `phase-XX-reference-list.md`.
2. Capture Korean and English at 1920 x 1320.
3. Capture Korean and English at mobile width.
4. Write `phase-XX-fidelity-ledger.md` with at least these checks:
   - shell dimensions
   - page gutter and panel spacing
   - table/header row density
   - control height/radius/colors
   - modal/dropdown/side-panel anatomy
   - font loading and bilingual overflow
   - dark-mode behavior when applicable

## Acceptance

A screenshot moves from `planned` to `verified` only when the corresponding component, flow state, and visual parity evidence exist. A screenshot can be `componentized` when its exact state is represented by a reusable component family and documented in the fidelity ledger.
