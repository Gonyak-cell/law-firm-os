# LCX-DESK-01 Shell Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P1 desktop shell skeleton, hardened window defaults, origin policy, and startup smoke
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P1 desktop shell progress only. It does not claim file bridge readiness, auth token storage readiness, signed packaging, pilot approval, production go-live, public release, or owner approval.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P1-W01-T01 | complete | `apps/desktop/package.json`, `apps/desktop/src/main/` |
| MDT-P1-W01-T02 | complete | `apps/desktop/src/main/window.js` |
| MDT-P1-W01-T03 | pending | not started |
| MDT-P1-W01-T04 | pending | not started |
| MDT-P1-W01-T05 | pending | terminal not reached |
| MDT-P1-W02-T01 | pending | not started |
| MDT-P1-W02-T02 | pending | not started |
| MDT-P1-W02-T03 | pending | not started |
| MDT-P1-W02-T04 | pending | not started |

## MDT-P1-W01-T01 - Create apps/desktop Package Skeleton

Plan:

- Create the desktop workspace only after P0 is closed.
- Add a minimal Electron package skeleton and `src/main/` entry point.
- Keep file bridge, auth token storage, and update channel unavailable.

Do:

- Added `apps/desktop/package.json`.
- Added `apps/desktop/src/main/main.js`.
- Updated `package-lock.json` with the new workspace and Electron package metadata via package-lock-only install.

Check:

```bash
npm view electron version
npm install --package-lock-only --workspace apps/desktop
test -f apps/desktop/package.json && rg -n "electron|nodeIntegration|contextIsolation|sandbox" apps/desktop
git diff --check -- apps/desktop/package.json apps/desktop/src/main/main.js package-lock.json
```

Results:

- Current npm registry Electron version observed: `42.4.1`.
- Package-lock-only install completed with `found 0 vulnerabilities`.
- Desktop skeleton grep passed for `electron`, `nodeIntegration`, `contextIsolation`, and `sandbox`.
- `git diff --check` passed.
- No file bridge, auth token storage, or update channel implementation was added.

Act:

- `MDT-P1-W01-T01` is complete.
- Next TUW is `MDT-P1-W01-T02`.

## MDT-P1-W01-T02 - Implement Hardened BrowserWindow Defaults

Plan:

- Add a BrowserWindow option factory with hardened renderer defaults.
- Keep renderer Node, generic IPC, file bridge, token storage, and update channel authority closed.
- Make options importable from Node tests without launching Electron.

Do:

- Added `apps/desktop/src/main/window.js`.
- Defined `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`.
- Added `createMainWindow` with a delayed Electron import and `ready-to-show` display behavior.

Check:

```bash
rg -n "nodeIntegration: false|contextIsolation: true|sandbox: true|webSecurity: true" apps/desktop
node -e "const m = await import('./apps/desktop/src/main/window.js'); const prefs = m.mainWindowOptions().webPreferences; if (prefs.nodeIntegration !== false || prefs.contextIsolation !== true || prefs.sandbox !== true || prefs.webSecurity !== true) process.exit(1); console.log(JSON.stringify(prefs));"
git diff --check -- apps/desktop/src/main/window.js
```

Results:

- Security grep passed for all four required settings.
- Node import check returned `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, and `devTools: false`.
- `git diff --check` passed.

Permission/audit impact:

- Desktop renderer gets no Node, fs, shell, path, or generic IPC authority from this TUW.

Act:

- `MDT-P1-W01-T02` is complete.
- Next TUW is `MDT-P1-W01-T03`.
