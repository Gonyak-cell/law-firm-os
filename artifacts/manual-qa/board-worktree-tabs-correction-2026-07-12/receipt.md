# Board Tabs From Worktree Style Correction

- Date: 2026-07-12
- Source style: Worktree practice-area top menu
- Target surface: Matter 업무보드 top menu
- Local package: `apps/desktop/dist/mac/matter.app`

## Result

- Worktree restored to its independent `matter-worktree-practice-areas` class.
- Worktree keeps four equal columns on desktop and one column at the mobile breakpoint.
- Matter board keeps five equal columns on desktop.
- Both surfaces share the same 52px button height, border, background, typography, radius, and active border/background rules.
- The previous 632px width cap, horizontal continuation, 116px minimum, 48px height, and borderless board-tab rules are absent.

## Verification

- Worktree contract and typography tests: 16/16 PASS
- UI regression tests: 28/28 PASS
- Web typecheck: PASS
- `git diff --check`: PASS
- Web renderer preparation: PASS
- Local macOS app build: PASS
- Packaged CSS direction and stale-rule scan: PASS
- Local ad-hoc code-sign verification: PASS

## Visual QA Boundary

Fresh Playwright Chromium and Node browser launches were attempted against the rebuilt renderer. Both were blocked before page creation by the managed macOS sandbox with `MachPortRendezvousServer ... Permission denied (1100)`. No screenshot or computed-style runtime result is claimed from those failed attempts.

This is a local package correction. It is not Developer ID signing, notarization, public release, or go-live evidence.
