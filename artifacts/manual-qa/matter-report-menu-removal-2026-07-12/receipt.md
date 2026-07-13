# Matter report menu removal receipt

- Scope: remove `검색`, `사건 위험`, `감사 이력`, and `사건 설정` from Matter > 리포트; retain `사건 리포트` and `연동`.
- Source: `apps/web/src/components/Shell.jsx`.
- Regression: `apps/web/test/ui-regression.test.mjs` executes `buildContextualNavigation()` and asserts the exact 리포트 child mapping.
- UI regression: 28/28 passed.
- Typecheck: passed.
- Renderer prepare: PASS.
- macOS package build: PASS, internal package `0.1.15`.
- Build receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md`.
- Runtime route: `view=matters`.
- Runtime sidebar labels: `업무 관리`, `사건 운영`, `소통`, `리포트`, `사건 리포트`, `연동`.
- Forbidden label count: 0.
- Screenshot: `matter-report-sidebar-expanded.png`.

## Runtime hypotheses

1. Source navigation still contains a removed item. Refuted by the executed navigation assertion.
2. The running app uses a stale or different bundle. Refuted by the repo-local executable path and version `0.1.15`.
3. The inspected group is not the Matter 리포트 surface. Refuted by navigating to `view=matters`, expanding `리포트`, and reading the live renderer DOM.

## Manual QA matrix

| Scenario | Expected | Observed | Result |
| --- | --- | --- | --- |
| Open Matter and expand 리포트 | Only 사건 리포트 and 연동 | Live renderer returned the exact pair | PASS |
| Scan removed labels | No 검색, 사건 위험, 감사 이력, or 사건 설정 | Forbidden label count was 0 | PASS |
| Launch rebuilt package | Repo-local internal 0.1.15 starts | Exact executable path verified | PASS |

## Release boundary

This is internal package verification. `public_release=false`, `owner_approval=false`, and notarization was not requested.
