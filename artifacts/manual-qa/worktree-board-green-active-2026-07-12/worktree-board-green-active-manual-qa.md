# manualQa: Worktree and Matter 업무보드 green active state

Date: 2026-07-12 Asia/Seoul
Overall verdict: **FAIL — live click QA blocked**. Current package markers and non-browser contracts pass, but no current Chromium/Electron runtime reached a page/window, so every click, computed-style, and responsive overflow scenario is recorded as blocked rather than inferred.

AI slop lint exception: the `ai-buzzword-stack` matches in this evidence table come from reproducible browser commands, CSS selectors, ARIA attributes, and test labels. They are QA metadata rather than product UI or user-facing copy, so the exact evidence strings are retained.

## surfaceEvidence

| Scenario | Criterion | Surface | Exact invocation | Verdict | artifactRefs |
|---|---|---|---|---|---|
| SE-WT-375 | Worktree: click every practice tab; exactly one active/aria state; green active border/background; inactive unchanged; no clipping/overflow | Current packaged/web renderer at 375x720 | Chromium all-tab harness: `chromium.launch`; `page.setViewportSize({width:375,height:720})`; click all `.matter-worktree-practice-areas button`; inspect class, `aria-pressed`, computed styles, inactive snapshots, `scrollWidth` | FAIL — Chromium blocked before page creation | A1 |
| SE-WT-768 | Same Worktree checks at 768x720 | Current packaged/web renderer at 768x720 | Same harness with `width:768` | FAIL — Chromium blocked before page creation | A1 |
| SE-WT-1280 | Same Worktree checks at 1280x720 | Current packaged/web renderer at 1280x720 | Same harness with `width:1280` | FAIL — Chromium blocked before page creation | A1 |
| SE-MB-375 | Matter 업무보드: click every board tab; exactly one active/aria state; green active border/background; inactive unchanged; no clipping/overflow | Current packaged/web renderer at 375x720 | Same harness; click all `.matter-board-tabs button`; inspect class, `aria-selected`, computed styles, inactive snapshots, `scrollWidth` | FAIL — Chromium blocked before page creation | A1 |
| SE-MB-768 | Same board checks at 768x720 | Current packaged/web renderer at 768x720 | Same harness with `width:768` | FAIL — Chromium blocked before page creation | A1 |
| SE-MB-1280 | Same board checks at 1280x720 | Current packaged/web renderer at 1280x720 | Same harness with `width:1280` | FAIL — Chromium blocked before page creation | A1 |
| SE-PKG-MARKERS | Shared active-state rule and package parity | Web and packaged CSS assets | Read both `index-C4vA0Tax.css` assets; assert shared selector, success border, 10% success mix, success tokens, responsive selectors, and no standalone Worktree active override | PASS (supporting evidence only; not a click pass) | A1, A2 |
| SE-CONTRACT | Tab counts and aria contracts | Current source/tests | `node --test apps/web/test/matter-worktree-ui-contract.test.mjs apps/web/test/matter-worktree-typography.test.mjs`; `node --test apps/web/test/ui-regression.test.mjs`; typecheck | PASS (supporting evidence only) | A1, A3 |

## adversarialCases

| Scenario | Criterion | Adversarial class | Expected behavior | Verdict | artifactRefs |
|---|---|---|---|---|---|
| AC-WT-ALL | Worktree all-tab coverage | Every tab, not only default | 송무, 기업 자문, 분쟁, 트랜잭션 each becomes the sole active tab with `aria-pressed=true` | FAIL — click harness blocked | A1 |
| AC-MB-ALL | Board all-tab coverage | Every tab, not only default | 홈, 송무, 기업 자문, 분쟁, 트랜잭션 each becomes the sole active tab with `aria-selected=true` | FAIL — click harness blocked | A1 |
| AC-GREEN-FOREST | Green active state | Forest skin token/color mix | Active border matches `rgb(38, 194, 96)` baseline and background matches the prior 10% mix | PASS for current package markers; runtime color unverified | A1, A2, A4 |
| AC-GREEN-MATTER | Green active state | Matter skin token/color mix | Active border matches `rgb(19, 166, 107)` baseline and background matches the prior 10% mix | PASS for current package markers; runtime color unverified | A1, A2, A4 |
| AC-INACTIVE | Inactive preservation | Active-only selector leakage | Inactive tabs retain surface background, border, and muted text after every click | FAIL — computed styles unavailable | A1 |
| AC-RESPONSIVE | Responsive layout | 375/768/1280 clipping or overflow | All tab labels remain usable and `document.documentElement.scrollWidth <= clientWidth` | FAIL — no live page | A1 |
| AC-PACKAGE | Release artifact | Stale packaged CSS | Web and packaged CSS contain the same current shared rule and signed package | PASS | A1, A2, A3 |

## artifactRefs

| ID | Kind | Description | Path |
|---|---|---|---|
| A1 | QA log | Current package marker checks, prior-color comparison, exact browser/Electron invocations, blockers, and screenshot status | `artifacts/manual-qa/worktree-board-green-active-2026-07-12/01-static-and-runtime-verification.md` |
| A2 | packaged-css | Current rebuilt web and packaged CSS assets with shared active-state markers | `apps/web/dist/assets/index-C4vA0Tax.css` |
| A3 | packaged-app | Current packaged `matter.app`; codesign verified | `apps/desktop/dist/mac/matter.app` |
| A4 | prior-runtime-baseline | Prior Worktree computed-color receipt and screenshots used only as the known-good color baseline | `artifacts/manual-qa/matter-worktree-practice-active-2026-07-12/receipt.md` |

## Missing prerequisite

A macOS browser/Electron runtime with permission to launch Chromium/Electron and create a page/window is required to complete the requested all-tab click, computed-style, and responsive screenshot checks. No production code was edited by this QA run.
