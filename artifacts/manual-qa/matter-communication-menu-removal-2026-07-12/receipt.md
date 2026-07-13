# Matter communication menu removal receipt

- Scope: remove `메시지`, `공지`, and `팀` from Matter > 소통; retain `회의 기록` and `의뢰인 요청`.
- Source: `apps/web/src/components/Shell.jsx`.
- Regression: `apps/web/test/ui-regression.test.mjs` executes `buildContextualNavigation()` and asserts the exact 소통 child mapping.
- UI regression: 28/28 passed.
- Typecheck: passed.
- Renderer prepare: PASS.
- macOS package build: PASS, internal package `0.1.15`.
- Build receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md`.
- Runtime route: `view=matters`.
- Runtime sidebar labels: `업무 관리`, `사건 운영`, `소통`, `회의 기록`, `의뢰인 요청`, `리포트`.
- Forbidden label count: 0.
- Screenshot: `matter-sidebar-expanded.png`.

## Runtime hypotheses

1. Source navigation still contains a removed item. Refuted by the executed navigation assertion.
2. The running app uses a stale or different bundle. Refuted by the repo-local executable path and version `0.1.15`.
3. The inspected group is not the Matter 소통 surface. Refuted by navigating to `view=matters`, expanding `소통`, and reading the live renderer DOM.

## Manual QA matrix

| Scenario | Expected | Observed | Result |
| --- | --- | --- | --- |
| Open Matter and expand 소통 | Only 회의 기록 and 의뢰인 요청 | Live renderer returned the exact pair | PASS |
| Scan removed labels | No 메시지, 공지, or 팀 | Forbidden label count was 0 | PASS |
| Launch rebuilt package | Repo-local internal 0.1.15 starts | Exact executable path and local API listener verified | PASS |

## Release boundary

This is internal package verification. `public_release=false`, `owner_approval=false`, and notarization was not requested.
