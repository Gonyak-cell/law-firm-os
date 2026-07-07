# Matter Desktop Home Dashboard IA Release Note (2026-07-08)

Status: ready for owner review
Public release: false
Production go-live: false
Owner final approval: false

## Included

- Home is the default post-login landing for the new Sidebar IA.
- The top product axis remains Home, Client, Matter, People, Vault, Portal.
- The left sidebar stays contextual to the active product axis.
- Messages and approvals open as topbar utility drawers without replacing the sidebar.
- Settings and Data Import remain the only sidebar-replacement mode exceptions, with `업무로 돌아가기` return anchors.
- Home dashboard widgets are visible in desktop runtime: approval, today To Do, feed, calendar, and system status.

## Desktop Smoke

Stage 7 verified the packaged macOS shell with the latest approved dev renderer:

- executable: `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`
- renderer: `http://127.0.0.1:5173/?desktop=1&view=home&data=live&ctx=allow&splash=0#home-dashboard`
- receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/sidebar-stage7-desktop-smoke-2026-07-08.json`
- screenshot: `docs/lazycodex/evidence/matter-desktop/artifacts/sidebar-stage7-desktop-smoke-2026-07-08.png`

The smoke confirms the packaged shell, approved renderer origin, `matterSession` preload bridge, Home dashboard, legacy messages redirect, and Data Import return anchor.

## Boundary

This note does not claim a notarized package rebuild, production deployment, public release, or owner approval. Those require a separate release command and owner receipt.
