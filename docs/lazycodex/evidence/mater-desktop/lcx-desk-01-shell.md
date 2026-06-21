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
| MDT-P1-W01-T03 | complete | `apps/desktop/src/main/origin-policy.js`, `apps/desktop/test/origin-policy.test.mjs` |
| MDT-P1-W01-T04 | complete | `scripts/validate-mater-desktop-security.mjs` |
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

## MDT-P1-W01-T03 - Define Dev and Packaged Load Policy

Plan:

- Allow only the approved local dev renderer URL and packaged `file:` origin.
- Deny remote HTTP(S), alternate local ports, and hostname aliases by default.
- Add Node tests for origin checks and navigation guards.

Do:

- Added `apps/desktop/src/main/origin-policy.js`.
- Added `apps/desktop/test/origin-policy.test.mjs`.
- Implemented `installNavigationGuards` for `will-navigate` and `setWindowOpenHandler`.

Check:

```bash
node apps/desktop/test/origin-policy.test.mjs
git diff --check -- apps/desktop/src/main/origin-policy.js apps/desktop/test/origin-policy.test.mjs
```

Results:

- Origin policy tests passed: `3` tests, `3` pass, `0` fail.
- Tests prove approved dev URL and packaged `file:` origin are allowed.
- Tests prove `localhost`, alternate port, remote HTTPS, malformed URL, unapproved navigation, and unapproved window open are blocked.
- `git diff --check` passed.

Permission/audit impact:

- Navigation cannot load untrusted remote content into the desktop shell.

Act:

- `MDT-P1-W01-T03` is complete.
- Next TUW is `MDT-P1-W01-T04`.

## MDT-P1-W01-T04 - Add Desktop Security Validator

Plan:

- Add a desktop security validator that checks actual shell files.
- Include detection probes for insecure BrowserWindow settings, missing preload allowlist, and non-allowlisted navigation.
- Keep current no-preload state valid because no preload bridge surface exists yet.

Do:

- Added `scripts/validate-mater-desktop-security.mjs`.

Check:

```bash
node --check scripts/validate-mater-desktop-security.mjs
node scripts/validate-mater-desktop-security.mjs
git diff --check -- scripts/validate-mater-desktop-security.mjs
```

Results:

- Syntax check passed.
- Desktop security validator passed with verdict `PASS`.
- Validator checked `5` desktop files and reported `findings: []`.
- Preload policy reported `no_preload_surface_present`.
- Detection probes reported `insecure_browser_window: detected`, `missing_preload_allowlist: detected`, and `non_allowlisted_navigation: detected`.
- `git diff --check` passed.

Permission/audit impact:

- Validator prevents authority widening before later phases.

Act:

- `MDT-P1-W01-T04` is complete.
- Next TUW is `MDT-P1-W01-T05`, the terminal TUW for `MDT-P1-W01`.
