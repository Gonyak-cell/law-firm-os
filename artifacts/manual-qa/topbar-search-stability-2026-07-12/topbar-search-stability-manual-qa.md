# manualQa: topbar search stability

Date: 2026-07-12 Asia/Seoul
Overall verdict: **FAIL — manual browser gate blocked**. The rebuilt assets, source contract, typecheck, and 28-test regression contract pass, but no requested computed-style, overflow, input, route, or screenshot scenario could execute because Chromium and Electron were blocked before page/window creation.

## surfaceEvidence

| Scenario | Criterion | Surface | Exact invocation | Verdict | Artifact refs |
|---|---|---|---|---|---|
| SE-1440 | Forest `.global-search`: computed display/position, overlap, overflow, input | Rebuilt `apps/web/dist` at 1440 CSS px | `chromium.launch({headless:true})`; `page.setViewportSize({width:1440,height:900})`; `page.goto(file:///.../apps/web/dist/index.html?locale=ko&skin=forest&view=home&query=atlas)`; inspect `getComputedStyle(.global-search)`, bounds, `scrollWidth`, and input focus/value | FAIL — browser blocked before navigation | A1 |
| SE-1320 | Same at exact breakpoint | Rebuilt `apps/web/dist` at 1320 CSS px | Same Playwright invocation with `width:1320`; inspect Forest search computed style and bounds | FAIL — browser blocked before navigation | A1 |
| SE-1200 | Same below breakpoint | Rebuilt `apps/web/dist` at 1200 CSS px | Same Playwright invocation with `width:1200`; inspect Forest search computed style and bounds | FAIL — browser blocked before navigation | A1 |
| SE-821 | Same one pixel above mobile breakpoint | Rebuilt `apps/web/dist` at 821 CSS px | Same Playwright invocation with `width:821`; inspect Forest search computed style/position and viewport overflow | FAIL — browser blocked before navigation | A1 |
| SE-820 | Same exact mobile breakpoint | Rebuilt `apps/web/dist` at 820 CSS px | Same Playwright invocation with `width:820`; inspect Forest override, bounds, overflow, and input usability | FAIL — browser blocked before navigation | A1 |
| SE-375 | Same narrow mobile surface | Rebuilt `apps/web/dist` at 375 CSS px | Same Playwright invocation with `width:375`; inspect search visibility, input usability, and horizontal overflow | FAIL — browser blocked before navigation | A1 |
| SE-route | Route changes must not hide or overlap search | Forest topbar on rebuilt renderer | Start `?locale=ko&skin=forest&view=home&query=atlas`; after each route change to `view=clients`, `view=matters`, `view=people`, and `view=vault`, inspect `.global-search` display/position and viewport overflow | FAIL — browser blocked before navigation | A1 |
| SE-input | Input remains focusable and editable | Forest `.global-search input` | At each width, `locator('.global-search input').focus(); fill('atlas'); press('End');` then verify `document.activeElement`, value, and popover presence | FAIL — browser blocked before navigation | A1 |
| SE-static | Source/build contract and packaged parity | `apps/web/dist` and packaged `matter.app` renderer | `node --test apps/web/test/ui-regression.test.mjs`; `npm --workspace apps/web run typecheck`; compare renderer JS/CSS hashes; codesign verify | PASS (supporting evidence only; not a manual browser pass) | A1, A2, A3 |

## adversarialCases

| Scenario | Criterion | Adversarial class | Expected behavior | Verdict | Artifact refs |
|---|---|---|---|---|---|
| AC-boundary-1320 | Breakpoint correctness | Exact 1320 boundary | Search remains visible and usable without topbar overlap or horizontal overflow | FAIL — cannot compute styles | A1 |
| AC-boundary-820 | Breakpoint correctness | Exact 820 boundary | Forest override wins over generic mobile hide rule; search is in row 1 / column 1 and usable | FAIL — cannot compute styles | A1 |
| AC-one-pixel-821 | Breakpoint correctness | 821 versus 820 off-by-one | Search remains visible at 821 and layout does not jump into an invalid overlap state | FAIL — cannot compute styles | A1 |
| AC-narrow-375 | Responsive failure | Narrow viewport | Input remains editable and document has no horizontal overflow | FAIL — no live page | A1 |
| AC-route-persistence | Navigation regression | Route changes with populated query | `.global-search` remains visible and positioned correctly after Home → Client → Matter → People → Vault changes | FAIL — no live page | A1 |
| AC-package-parity | Release artifact | Web/package renderer drift | Rebuilt web and packaged renderer assets match exactly and package remains signed | PASS | A1, A2, A3 |

## artifactRefs

| ID | Kind | Description | Path |
|---|---|---|---|
| A1 | QA log | Exact static checks, browser/Electron invocations, blockers, HTTP probes, and screenshot status | `artifacts/manual-qa/topbar-search-stability-2026-07-12/01-static-and-runtime-verification.md` |
| A2 | renderer artifact | Rebuilt web renderer used as the requested test target | `apps/web/dist` |
| A3 | packaged artifact | Packaged `matter.app` renderer used as the fallback test target; codesign verified | `apps/desktop/dist/mac/matter.app` |

## Missing prerequisite

A real browser or Electron runtime with permission to launch Chromium/Electron and create a window is required to complete the six-width computed-style, input, route, overflow, and screenshot checks. No production code was edited by this QA run.
