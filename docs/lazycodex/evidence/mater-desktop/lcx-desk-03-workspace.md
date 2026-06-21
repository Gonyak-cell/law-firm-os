# LCX-DESK-03 Workspace Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P3 permission-trimmed Matter workspace, route adapter, denied state, and desktop context
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P3 workspace progress only. It does not claim file bridge readiness, production go-live, public release, owner approval, or any desktop authority beyond presentation context and permission-checked routes.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P3-W01-T01 | complete | `docs/desktop/mater-desktop-route-map.md` |
| MDT-P3-W01-T02 | complete | `apps/web/src/components/DesktopDeniedState.jsx`, `VaultSurface.jsx`, `MattersSurface.jsx` |
| MDT-P3-W01-T03 | complete | `apps/web/src/desktop/runtimeContext.js`, `apps/desktop/src/preload/runtime.js` |
| MDT-P3-W02-T01 | complete | `apps/web/test/desktop-permission.test.mjs` |
| MDT-P3-W02-T02 | pending | not started |
| MDT-P3-W02-T03 | pending | not started |
| MDT-P3-W02-T04 | pending | phase terminal not reached |

## MDT-P3-W01-T01 - Map Desktop Route Intents to Web Routes

Plan:

- Map desktop matter, document, task, auth, denied, and fallback routes.
- Keep all route intents presentation-only until backend permission recheck.

Do:

- Added `docs/desktop/mater-desktop-route-map.md`.

Check:

```bash
rg -n "matter|document|task|auth|denied|fallback" docs/desktop/mater-desktop-route-map.md
git diff --check -- docs/desktop/mater-desktop-route-map.md docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Route map grep passed for `matter`, `document`, `task`, `auth`, `denied`, and `fallback`.
- `git diff --check` passed.

Act:

- `MDT-P3-W01-T01` is complete.
- Next TUW is `MDT-P3-W01-T02`.

## MDT-P3-W01-T02 - Implement Denied-State Adapter

Plan:

- Add a shared desktop denied state.
- Use it in Matter and Vault denied paths.
- Hide metric grids on denied Matter/Vault responses so row counts and metadata are not displayed.

Do:

- Added `apps/web/src/components/DesktopDeniedState.jsx`.
- Updated `apps/web/src/components/VaultSurface.jsx`.
- Updated `apps/web/src/components/MattersSurface.jsx`.

Check:

```bash
npm --workspace apps/web run test:ui
git diff --check -- apps/web/src/components/DesktopDeniedState.jsx apps/web/src/components/VaultSurface.jsx apps/web/src/components/MattersSurface.jsx docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- UI tests passed.
- Matter and Vault denied states use `DesktopDeniedState`.
- Matter and Vault metric grids are not rendered when `result.uiState === "denied"`.
- `git diff --check` passed.

Permission/audit impact:

- UI reflects backend denial without leaking hidden metadata.

Act:

- `MDT-P3-W01-T02` is complete.
- Next TUW is `MDT-P3-W01-T03`.

## MDT-P3-W01-T03 - Expose Desktop Runtime Context Without Authority

Plan:

- Expose desktop mode and route source as presentation-only context.
- Keep mutation, file bridge, auth, audit, and billing authority false.
- Close only `MDT-P3-W01` because this is the work package terminal TUW.

Do:

- Added `apps/web/src/desktop/runtimeContext.js`.
- Added `apps/desktop/src/preload/runtime.js`.

Check:

```bash
rg -n "desktopMode|routeSource|mutate|fileBridge|billing" apps/web/src/desktop apps/desktop/src/preload
node scripts/validate-mater-desktop-security.mjs
git diff --check -- apps/web/src/desktop/runtimeContext.js apps/desktop/src/preload/runtime.js docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Runtime context grep passed for `desktopMode`, `routeSource`, `mutate`, `fileBridge`, and `billing`.
- Desktop security validator passed.
- Context exposes presentation state only and no desktop authority.
- `git diff --check` passed.

Permission/audit impact:

- Desktop context is presentation-only.

Act:

- `MDT-P3-W01` is closed at its terminal TUW, `MDT-P3-W01-T03`.
- Next ledger TUW is `MDT-P3-W02-T01`.

## MDT-P3-W02-T01 - Add Unauthorized Matter Visibility Tests

Plan:

- Add a focused desktop permission test for denied Matter/Vault visibility.
- Prove non-member matter row, count, snippet, citation, and document metadata are absent from denied state.

Do:

- Added `apps/web/test/desktop-permission.test.mjs`.

Check:

```bash
node --test apps/web/test/desktop-permission.test.mjs
git diff --check -- apps/web/test/desktop-permission.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Desktop permission test passed.
- Test checks `DesktopDeniedState` copy and Matter/Vault denied rendering gates.
- `git diff --check` passed.

Permission/audit impact:

- Permission trimming is visible in UI tests.

Act:

- `MDT-P3-W02-T01` is complete.
- Next TUW is `MDT-P3-W02-T02`.
