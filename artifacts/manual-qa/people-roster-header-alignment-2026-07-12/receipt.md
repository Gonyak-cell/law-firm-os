# People roster header alignment receipt

- Scope: align the 구성원 table header height, font size, and vertical position with body rows.
- Source: `apps/web/src/styles.css`.
- Regression: `apps/web/test/ui-regression.test.mjs`.
- UI regression: 28/28 passed.
- Typecheck: passed.
- Renderer prepare: PASS.
- macOS package build: PASS, internal package `0.1.15`.
- Build receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md`.
- Runtime route: `view=people`.
- Header height: `44px`.
- Body row height: `44px`.
- Header font size: `14px`.
- Body font size: `14px`.
- Header vertical align: `middle`.
- Header content align items: `center`.
- Screenshot: `people-roster-header.png`.

## Runtime hypotheses

1. The People header keeps its old 34px/12px override. Refuted by computed styles of 44px/14px.
2. The running app uses a stale bundle. Refuted by the repo-local executable and internal package version `0.1.15`.
3. Table-cell alignment is correct but icon/text remain off-center. Refuted by `align-items: center` on `.hr-roster-header-cell` and visual inspection.

## Release boundary

This is internal package verification. `public_release=false`, `owner_approval=false`, and notarization was not requested.
