# Worktree Top Menu QA

- Date: 2026-07-12
- Source menu: Matter 업무 보드 `.matter-board-tabs`
- Target menu: 워크트리 `.matter-board-tabs.matter-worktree-practice-areas`
- Packaged app: `apps/desktop/dist/mac/matter.app`

## Runtime Evidence

The packaged renderer CSS was loaded in Chromium at 375px, 768px, and 1280px.
Computed styles were compared for active and inactive buttons.

- Active computed styles equal: `true`
- Inactive computed styles equal: `true`
- Minimum size: `116px x 48px`
- Padding: `0 18px`
- Border: `0`, `none`
- Radius: `4px`
- Font: `16px`, weight `400`
- Letter spacing: `0.32px`
- Active background: `rgb(247, 248, 250)`
- Inactive background: transparent

Screenshots:

- `375.png`
- `768.png`
- `1280.png`

## Debugging Hypotheses

1. **A Worktree-specific rule may still override the board button style.** Rejected: the dedicated Worktree button and active-button blocks were removed, and Chromium reported equal active and inactive computed styles.
2. **The old mobile one-column override may make the menus diverge below 768px.** Rejected: the Worktree practice-area selector was removed from that override; the 375px capture preserves the same horizontal continuation as the board tabs.
3. **The desktop package may contain stale CSS.** Rejected: the rebuilt package contains both shared class markers and the four-column `repeat(4,minmax(116px,1fr))` layout rule; strict ad-hoc code-sign verification passed.

## Boundaries

- `matter.app` was rebuilt and ad-hoc signed for local QA.
- DMG creation remains blocked by the managed sandbox's `hdiutil` device restriction.
- This is local package evidence, not Developer ID signing, notarization, public release, or go-live evidence.
