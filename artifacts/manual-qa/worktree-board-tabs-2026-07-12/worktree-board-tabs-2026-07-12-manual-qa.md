# Manual QA: Worktree top-menu parity

- Goal: apply the Matter 업무보드 top-menu style to the Worktree top menu.
- Attempt directory: `artifacts/manual-qa/worktree-board-tabs-2026-07-12/`
- Verdict scope: local packaged `matter.app` QA only.
- Public release, notarization, go-live, and DMG distribution are not claimed.
- Product source/build files were not edited during this QA pass.
- Independent oracle subagents were unavailable in this session; direct artifact inspection and fresh read-only checks were used instead.

## Surface evidence

| Scenario id | Criterion reference | Surface | Exact invocation | Verdict | artifactRefs |
|---|---|---|---|---|---|
| WT-TM-DESKTOP-ACTIVE | Matter board top-menu active-state parity at desktop | Packaged Chromium renderer, Worktree practice-area menu at 1280x720, active control | Load the packaged renderer from `apps/desktop/dist/mac/matter.app`, set Chromium viewport to `1280x720`, render `.matter-board-tabs.matter-worktree-practice-areas`, compare the active button against `.matter-board-tabs` active computed style, capture `1280.png` | PASS | A1, A2, A3 |
| WT-TM-DESKTOP-INACTIVE | Matter board top-menu inactive-state parity at desktop | Packaged Chromium renderer, Worktree practice-area menu at 1280x720, inactive controls | Same packaged Chromium invocation at `1280x720`; compare an inactive Worktree button against the Matter board inactive computed style and inspect the four rendered labels | PASS | A1, A2, A3 |
| WT-TM-TABLET-ACTIVE | Matter board top-menu active-state parity at tablet | Packaged Chromium renderer, Worktree practice-area menu at 768x720, active control | Load the packaged renderer, set Chromium viewport to `768x720`, render the Worktree menu with one active practice area, compare active computed styles, capture `768.png` | PASS | A1, A2, A4 |
| WT-TM-TABLET-INACTIVE | Matter board top-menu inactive-state parity at tablet | Packaged Chromium renderer, Worktree practice-area menu at 768x720, inactive controls | Same packaged Chromium invocation at `768x720`; compare inactive computed styles and verify all four practice areas remain laid out in four columns | PASS | A1, A2, A4 |
| WT-TM-MOBILE-ACTIVE | Matter board top-menu active-state parity at mobile | Packaged Chromium renderer, Worktree practice-area menu at 375x720, active control | Load the packaged renderer, set Chromium viewport to `375x720`, render the Worktree menu with one active practice area, compare active computed styles, capture `375.png` | PASS | A1, A2, A5 |
| WT-TM-MOBILE-INACTIVE | Matter board top-menu inactive-state parity at mobile | Packaged Chromium renderer, Worktree practice-area menu at 375x720, inactive controls | Same packaged Chromium invocation at `375x720`; compare inactive computed styles and verify the Worktree menu follows the Matter board’s horizontal continuation rather than the removed one-column override | PASS | A1, A2, A5 |
| PKG-REL-BOUNDARY | Local package QA must remain distinct from distributable release QA | Desktop distribution package boundary | Run `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app`, then `find apps/desktop/dist -maxdepth 3 -type f -iname '*.dmg'`; inspect the release boundary in `receipt.md` | PARTIAL | A1, A2, A7 |

## Adversarial cases

| Scenario id | Criterion reference | Adversarial class | Expected behavior | Verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-WT-CASCADE | Shared Matter board styling must win over Worktree-specific styling | CSS cascade / stale override | No `.matter-worktree-practice-areas button` or `.matter-worktree-practice-areas button.active` rule remains; active and inactive computed styles match the Matter board styles | PASS | A1, A2, A6 |
| ADV-WT-MOBILE | Mobile must not diverge through the old Worktree one-column media rule | Responsive breakpoint / overflow | At 375px the Worktree menu keeps the same horizontal continuation and no Worktree-specific `grid-template-columns: 1fr` override; at 768px and 1280px all four controls render in the four-column layout | PASS | A1, A3, A5, A6 |
| ADV-WT-PACKAGE | The packaged renderer must not contain stale source CSS | Packaged asset freshness | The CSS embedded in `matter.app` contains `.matter-board-tabs`, the 48px shared button anatomy, and `repeat(4,minmax(116px,1fr))` for Worktree | PASS | A1, A6 |
| ADV-WT-CJK | Korean practice-area labels must remain usable at each breakpoint | CJK / no-wrap / label continuation | At tablet and desktop all four labels are visible without semantic wrapping; at mobile labels use the same horizontal continuation behavior as the Matter board and do not trigger a one-column collapse | PASS | A1, A3, A4, A5 |
| ADV-WT-BUNDLE | Local package verification must not be represented as public release | Release-boundary confusion | Local codesign may pass, while missing/blocked DMG creation remains explicit; do not claim Developer ID signing, notarization, public release, or go-live | PASS | A1, A7 |

## Artifact references

| id | kind | description | path |
|---|---|---|---|
| A1 | receipt | Executor’s packaged Chromium computed-style evidence and release-boundary notes | `artifacts/manual-qa/worktree-board-tabs-2026-07-12/receipt.md` |
| A2 | verification-log | Fresh contract, regression, typecheck, packaged-CSS, codesign, freshness, and non-empty artifact checks | `artifacts/manual-qa/worktree-board-tabs-2026-07-12/fresh-verification-2026-07-12.md` |
| A3 | screenshot | Desktop packaged-renderer capture at 1280x720 | `artifacts/manual-qa/worktree-board-tabs-2026-07-12/1280.png` |
| A4 | screenshot | Tablet packaged-renderer capture at 768x720 | `artifacts/manual-qa/worktree-board-tabs-2026-07-12/768.png` |
| A5 | screenshot | Mobile packaged-renderer capture at 375x720 | `artifacts/manual-qa/worktree-board-tabs-2026-07-12/375.png` |
| A6 | packaged-css | CSS asset directly inspected inside the local packaged app | `apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web/assets/index-C89Jsh0D.css` |
| A7 | packaged-app | Locally codesigned unpacked app; DMG not produced in this sandbox | `apps/desktop/dist/mac/matter.app` |

## Final QA boundary

Local packaged surface: PASS for desktop, tablet, and mobile active/inactive states. The DMG sandbox restriction is a packaging blocker only; this file does not make a public-release, notarization, or go-live claim.
