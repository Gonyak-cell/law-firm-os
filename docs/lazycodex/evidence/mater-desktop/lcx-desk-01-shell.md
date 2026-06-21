# LCX-DESK-01 Shell Evidence

Status: P1_complete
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
| MDT-P1-W01-T05 | complete | `apps/desktop/test/shell-smoke.test.mjs` |
| MDT-P1-W02-T01 | complete | `apps/desktop/src/main/splash.js` |
| MDT-P1-W02-T02 | complete | `apps/desktop/src/main/splash.js`, `apps/desktop/src/main/window.js`, `apps/desktop/test/splash-handoff.test.mjs` |
| MDT-P1-W02-T03 | complete | `apps/desktop/src/main/splash.js`, `apps/desktop/src/renderer/offline.html` |
| MDT-P1-W02-T04 | complete | P1 terminal closure recorded here |

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

## MDT-P1-W01-T05 - Smoke Desktop Shell Startup

Plan:

- Add a desktop shell startup smoke test.
- Prove the shell loads only an approved renderer target.
- Close only `MDT-P1-W01` because this is the work package terminal TUW.

Do:

- Updated `apps/desktop/src/main/main.js` with `startDesktopShell`.
- Added `apps/desktop/test/shell-smoke.test.mjs`.
- The smoke test uses a fake `BrowserWindow` so CI can verify startup policy without launching a GUI.

Check:

```bash
npm --workspace apps/desktop run test:smoke
node scripts/validate-mater-desktop-security.mjs
git diff --check -- apps/desktop/src/main/main.js apps/desktop/test/shell-smoke.test.mjs
```

Results:

- Desktop smoke passed: `5` tests, `5` pass, `0` fail.
- Smoke proves the shell loads `http://127.0.0.1:5173` by default.
- Smoke proves unapproved renderer target and remote navigation/window-open are blocked.
- Desktop security validator passed with `findings: []`.
- `git diff --check` passed.

Act:

- `MDT-P1-W01` is closed at its terminal TUW, `MDT-P1-W01-T05`.
- Next ledger TUW is `MDT-P1-W02-T01`.

## MDT-P1-W02-T01 - Create Native Splash Window

Plan:

- Add a native Electron splash window source.
- Display `mater by AMIC` before main renderer readiness.
- Defer handoff/fallback behavior to the next TUWs.

Do:

- Added `apps/desktop/src/main/splash.js`.
- Defined `SPLASH_BRAND`, splash HTML, data URL generation, and `createSplashWindow`.

Check:

```bash
rg -n "splash|mater by AMIC|ready-to-show" apps/desktop/src/main
node -e "const m = await import('./apps/desktop/src/main/splash.js'); if (!m.splashHtml().includes('mater by AMIC')) process.exit(1); if (!m.splashDataUrl().startsWith('data:text/html')) process.exit(1); console.log(m.SPLASH_BRAND);"
git diff --check -- apps/desktop/src/main/splash.js
```

Results:

- Splash source grep passed for `splash`, `mater by AMIC`, and `ready-to-show`.
- Node import check confirmed `mater by AMIC` and a data URL splash document.
- `git diff --check` passed.

Act:

- `MDT-P1-W02-T01` is complete.
- Next TUW is `MDT-P1-W02-T02`.

## MDT-P1-W02-T02 - Implement Splash to Main-Window Handoff

Plan:

- Keep the splash open until the main renderer emits `ready-to-show`.
- Close the splash on main readiness.
- Show a bounded fallback on startup timeout or renderer load failure.

Do:

- Updated `apps/desktop/src/main/splash.js` with `wireSplashToMainWindow`, timeout handling, and fallback document generation.
- Updated `apps/desktop/src/main/window.js` to centralize the main ready event.
- Added `apps/desktop/test/splash-handoff.test.mjs`.

Check:

```bash
node apps/desktop/test/splash-handoff.test.mjs
npm --workspace apps/desktop run test:smoke
git diff --check -- apps/desktop/src/main/splash.js apps/desktop/src/main/window.js apps/desktop/test/splash-handoff.test.mjs
```

Results:

- Splash handoff tests passed: `3` tests, `3` pass, `0` fail.
- Desktop smoke passed: `8` tests, `8` pass, `0` fail.
- Tests prove splash closes only after main renderer ready.
- Tests prove bounded fallback appears on timeout and renderer load failure.
- `git diff --check` passed.

Act:

- `MDT-P1-W02-T02` is complete.
- Next TUW is `MDT-P1-W02-T03`.

## MDT-P1-W02-T03 - Add Reduced-Motion and Offline Fallback Handling

Plan:

- Add reduced-motion handling to splash startup.
- Add a non-sensitive offline fallback renderer page.
- Keep fallback free of client, matter, file, token, and account data.

Do:

- Updated `apps/desktop/src/main/splash.js` with `prefers-reduced-motion` CSS and offline startup fallback copy.
- Added `apps/desktop/src/renderer/offline.html`.
- Updated splash handoff test expected fallback copy.

Check:

```bash
rg -n "reduced|offline|fallback" apps/desktop
npm --workspace apps/desktop run test:smoke
git diff --check -- apps/desktop/src/main/splash.js apps/desktop/src/renderer/offline.html apps/desktop/test/splash-handoff.test.mjs
```

Results:

- Fallback grep passed for `reduced`, `offline`, and `fallback`.
- Desktop smoke passed: `8` tests, `8` pass, `0` fail.
- Offline fallback states that no client, matter, file, token, or account data is shown.
- `git diff --check` passed.

Act:

- `MDT-P1-W02-T03` is complete.
- Next TUW is `MDT-P1-W02-T04`, the P1 terminal TUW.

## MDT-P1-W02-T04 - Close Shell Prototype Evidence

Plan:

- Close P1 only at the phase terminal TUW.
- Re-run desktop smoke, desktop security validator, and loop ledger validator.
- Record shell startup, security settings, and non-claims.

Do:

- Reviewed `MDT-P1-W01` and `MDT-P1-W02` evidence in this file.
- Confirmed shell startup smoke, origin guard, splash handoff, reduced-motion behavior, and offline fallback are covered.

Check:

```bash
npm --workspace apps/desktop run test:smoke
node scripts/validate-mater-desktop-security.mjs
node scripts/validate-mater-desktop-loop-tuw-plan.mjs
git diff --check
```

Results:

- Desktop smoke passed: `8` tests, `8` pass, `0` fail.
- Desktop security validator passed with `findings: []` and `checked_files: 9`.
- Loop TUW ledger validator passed with `phase_count: 8`, `work_package_count: 16`, and `tuw_count: 69`.
- `git diff --check` passed.

Security settings:

- `nodeIntegration=false`
- `contextIsolation=true`
- `sandbox=true`
- `webSecurity=true`
- No preload bridge surface is present.
- Approved renderer targets remain limited to `http://127.0.0.1:5173` and packaged `file:` origin.

non-claims:

- P1 shell prototype does not implement file bridge.
- P1 shell prototype does not implement auth token storage.
- P1 shell prototype does not implement signed packaging or update channels.
- P1 shell prototype does not claim pilot approval, production go-live, public release, or owner approval.

Act:

- P1 is closed at its terminal TUW, `MDT-P1-W02-T04`.
- Next ledger TUW is `MDT-P2-W01-T01`.
