# Topbar Search Stability

- Date: 2026-07-12
- Surface: Forest topbar global search
- Local package: `apps/desktop/dist/mac/matter.app`

## Root Cause

The search input is always rendered by `Topbar`. Its visibility changed only because responsive CSS hid `.global-search` at two width boundaries: the Forest-specific `1320px` rule and the base `820px` rule.

## Fix

- At `1320px` and below, Forest keeps a four-column topbar and preserves a 160–240px search track.
- At `820px` and below, Forest places the search input in the first row and the product axes in the second row.
- The `/` keyboard hint is hidden at narrower widths to preserve input space.
- The input has the localized search label as its explicit accessible name.

## Debugging Hypotheses

1. **Route or query state conditionally removes the input.** Rejected: `Topbar` renders the global-search label and input unconditionally; only the result popover depends on a non-empty query.
2. **The Forest 1320px breakpoint removes the input.** Confirmed as the primary cause: the previous rule set `display: none`; the current source and packaged CSS set `display: grid` and retain a dedicated search track.
3. **The base mobile rule still wins below 820px.** Rejected after the fix: the later, more-specific Forest rule restores `display: grid`, assigns row 1 / column 1, and the base product navigation remains on row 2.

## Verification

- UI regression: 28/28 PASS
- Web typecheck: PASS
- `git diff --check`: PASS
- Web renderer preparation: PASS
- Packaged CSS and JS marker checks: PASS
- Local ad-hoc code-sign verification: PASS
- Independent code review: PASS

## Manual QA Boundary

Fresh Chromium and Electron QA were attempted, but both were blocked before page creation by the managed macOS sandbox. Chromium failed at `MachPortRendezvousServer` with permission denied, and Electron reported `Process failed to launch`. No rendered breakpoint, overlap, input interaction, or screenshot PASS is claimed. The DMG step is separately blocked by the sandbox `hdiutil` device restriction.

This is local implementation and package evidence, not notarization, public release, or go-live evidence.
