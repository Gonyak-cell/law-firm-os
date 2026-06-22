# Desktop Web Renderer Asset Receipt

Status: PASS

The canonical `apps/web` build was copied into the desktop auth shell handoff target.

## Paths

- Source: `apps/web/dist/index.html`
- Desktop renderer target: `apps/desktop/src/renderer/web/index.html`

## Boundary

- UI source of truth: `apps/web`
- Desktop `offline.html`: auth/password reset gate only
- production go-live: false
- public release: false
- owner approval: false
