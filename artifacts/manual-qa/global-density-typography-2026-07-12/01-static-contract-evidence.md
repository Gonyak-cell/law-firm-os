# Global density typography QA — static evidence

Date: 2026-07-12 (Asia/Seoul)
Scope: read-only review of `apps/web/src/styles.css`, `apps/web/test/global-density-contract.test.mjs`, `DESIGN.md`, and rebuilt renderer CSS.

## Invocations and results

- `node --test apps/web/test/global-density-contract.test.mjs` — PASS, 3/3 subtests.
- `npm --workspace apps/web run typecheck` — PASS (`tsc --project tsconfig.json --noEmit`).
- `git diff --check -- apps/web/src/styles.css` — PASS.
- `node --check apps/web/test/global-density-contract.test.mjs` — PASS.
- `codesign --verify --deep --strict apps/desktop/dist/mac/matter.app` — PASS.

The focused contract test independently verifies the requested 40px/34px hero sizes, 16px section/tab text, 14px body text, 12px metadata, 44px table geometry, 42px tabs, 20px/16px page padding, responsive spacing tokens, and absence of viewport-unit/clamp/min/max font sizing in the source contract.

Both rebuilt CSS copies were inspected:

- `apps/web/dist/assets/index-2xwYvvq_.css`
- `apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web/assets/index-2xwYvvq_.css`

Each contains the requested token markers (`40px`, `34px`, `16px`, `14px`, `12px`, `42px`, `44px`, `20px`, `16px`), the Forest hero token rule, and explicit narrow-table `overflow-x:auto`. No `font-size` declaration containing `vw`, `vh`, `vmin`, `vmax`, `clamp()`, `min()`, or `max()` was found in either packaged CSS. The one existing `font-size:calc(var(--matter-splash-size) * .82)` is based on a splash-size variable, not viewport units.

## Review finding

The shared density declarations are duplicated in `apps/web/src/styles.css`: one block begins around line 3168, and a second copy, explicitly titled `Shared application density contract, anchored to the People directory.`, begins at line 3387. This is a low-severity maintainability/override-ambiguity finding. It did not fail the focused test, but it increases the chance that a future edit updates only one copy.
