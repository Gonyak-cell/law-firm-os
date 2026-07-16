# Client sidebar menu removal receipt

- Scope: remove `데이터`, `데이터 가져오기`, and `설정` from Client > 운영; retain `청구` and `리포트`.
- Source: `apps/web/src/components/Shell.jsx`
- Regression: `apps/web/test/ui-regression.test.mjs` loads the JSX module through Vite SSR and asserts the exact 운영 child mapping.
- UI regression: 28/28 passed twice in parallel with HMR disabled.
- Typecheck: passed.
- Renderer prepare: PASS.
- macOS package build: PASS, internal package `0.1.15`.
- Runtime bundle: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`.
- Runtime route: `view=clients`.
- Runtime sidebar labels: `고객 관리`, `수임 전 업무`, `운영`, `청구`, `리포트`.
- Forbidden label count: 0.
- Screenshot: `client-sidebar-expanded-final.png`.

## Runtime hypotheses

1. Source navigation still contains a removed item. Refuted by the executed `buildContextualNavigation()` assertion.
2. The running app uses a stale or different bundle. Refuted by the repo-local executable path and bundle version `0.1.15`.
3. The correct Client group is not the inspected surface. Refuted by navigating to `view=clients`, expanding `운영`, and reading the live renderer DOM.

## Manual QA matrix

| Scenario | Expected | Observed | Result |
| --- | --- | --- | --- |
| Open Client and expand 운영 | Only 청구 and 리포트 are shown | Live DOM returned those two children | PASS |
| Scan removed labels | No 데이터, 데이터 가져오기, or 설정 | Forbidden label count was 0 | PASS |
| Launch rebuilt package | Repo-local internal 0.1.15 starts | Exact executable path and local API listener verified | PASS |
| Run UI regression concurrently | No shared HMR port | Two 28-test suites passed with project Vite config disabled | PASS |

## Review

- Slop review: the menu deletion introduces no visual styling, generated copy, motion, glow, or decorative pattern.
- Overfit review: the regression executes the exported navigation builder and checks its returned data instead of parsing source text.
- Security boundary: this removes navigation visibility only; it does not claim authorization revocation or remove direct route handling.

## Release boundary

This is an internal package verification. `public_release=false`, `owner_approval=false`, and notarization was not requested.
