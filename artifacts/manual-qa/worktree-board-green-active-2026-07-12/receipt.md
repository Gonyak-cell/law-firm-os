# Worktree And Matter Board Green Active State

- Date: 2026-07-12
- Surfaces: Matter 워크트리 practice tabs and 업무보드 tabs
- Local package: `apps/desktop/dist/mac/matter.app`

## Restored Contract

- Active border: `var(--am-success)`
- Active background: `color-mix(in srgb, var(--am-success) 10%, var(--am-surface))`
- Active text: `var(--am-text)`
- Inactive presentation: unchanged

The shared active selector applies this contract to both `.matter-worktree-practice-areas` and `.matter-board-tabs`.

## Debugging Hypotheses

1. **The green treatment was lost from the Worktree state handler.** Rejected: Worktree still maps the selected practice id to both `active` and `aria-pressed`; only the shared CSS declarations changed.
2. **The earlier board-style reuse overwrote the Worktree green tokens.** Confirmed: the shared active rule used `var(--am-accent)` and `var(--am-surface-subtle)` instead of the previously verified success border and 10% success mix.
3. **Restoring a Worktree-only override would leave the board inconsistent.** Rejected by the fix: the original success tokens now live in the existing shared active selector, so both menus receive identical selected-state treatment without an extra override.

## Verification

- Worktree contract and typography tests: 16/16 PASS
- UI regression: 28/28 PASS
- Web typecheck: PASS
- `git diff --check`: PASS
- Web renderer preparation: PASS
- Packaged CSS marker check: PASS for both selectors
- Local ad-hoc code-sign verification: PASS
- Independent code review: PASS

Prior known-good Worktree evidence recorded Forest border `rgb(38, 194, 96)` and the corresponding 10% pale-green mix, plus Matter border `rgb(19, 166, 107)`. The current source and package contain the same token formula for Worktree and the newly included Matter board selector.

## Manual QA Boundary

Fresh Chromium and Electron click QA were attempted but blocked before page creation by the managed macOS sandbox (`MachPortRendezvousServer` permission denied and Electron `Process failed to launch`). No fresh click, computed-style, overflow, or screenshot PASS is claimed. DMG generation remains separately blocked by the sandbox `hdiutil` device restriction.

This is local implementation and package evidence, not notarization, public release, or go-live evidence.
