# LCX-DESK-03 Workspace Evidence

Status: P3_complete
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
| MDT-P3-W02-T02 | complete | `apps/desktop/test/deep-link-permission.test.mjs` |
| MDT-P3-W02-T03 | complete | `apps/web/test/ui-regression.test.mjs` |
| MDT-P3-W02-T04 | complete | P3 terminal closure recorded in this file |

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

## MDT-P3-W02-T02 - Smoke Deep-Link Permission Recheck

Plan:

- Add a desktop deep-link resolver for route intent mapping.
- Test that `mater://matter` rechecks permission before screen entry.
- Test denied route when permission fails.

Do:

- Added `apps/desktop/src/main/deep-link.js`.
- Added `apps/desktop/test/deep-link-permission.test.mjs`.

Check:

```bash
node apps/desktop/test/deep-link-permission.test.mjs
git diff --check -- apps/desktop/src/main/deep-link.js apps/desktop/test/deep-link-permission.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Deep-link permission tests passed.
- Tests prove `mater://matter` calls `canReadMatter` before returning Matter screen entry.
- Tests prove denied result is returned when permission fails.
- `git diff --check` passed.

Permission/audit impact:

- Deep link cannot bypass server-owned authorization.

Act:

- `MDT-P3-W02-T02` is complete.
- Next TUW is `MDT-P3-W02-T03`.

## MDT-P3-W02-T03 - Run Desktop Workspace UI Regression

Plan:

- Add workspace regression coverage for Matter, Vault, denied, and desktop mode surfaces.
- Run web build and UI regression.

Do:

- Updated `apps/web/test/ui-regression.test.mjs`.

Check:

```bash
npm --workspace apps/web run build && npm --workspace apps/web run test:ui
git diff --check -- apps/web/test/ui-regression.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Web build passed.
- UI regression passed.
- Regression covers Matter route, Vault route, `DesktopDeniedState`, `desktopMode`, and `routeSource`.
- `git diff --check` passed.

Act:

- `MDT-P3-W02-T03` is complete.
- Next TUW is `MDT-P3-W02-T04`, the P3 terminal TUW.

## MDT-P3-W02-T04 - Close Workspace Evidence

Plan:

- Close P3 only after every P3 TUW verification has passed in ledger order.
- Record happy path, denied path, and no desktop authority evidence.
- Keep file bridge, production go-live, public release, and owner approval claims false.

Do:

- Updated this LCX-DESK-03 evidence file as the P3 terminal closeout.

Check:

```bash
node scripts/validate-mater-desktop-loop-tuw-plan.mjs
npm --workspace apps/web run build && npm --workspace apps/web run test:ui
node --test apps/web/test/desktop-permission.test.mjs
node apps/desktop/test/deep-link-permission.test.mjs
npm --workspace apps/desktop run test:smoke
node scripts/validate-mater-desktop-security.mjs
rg -n "MDT-P3|denied path|no desktop authority" docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
git diff --check -- docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Happy path: Matter and Vault route entries remain present, and the workspace UI regression keeps Matter, Vault, denied, and desktop mode surfaces routable.
- denied path: `DesktopDeniedState` is used by Matter and Vault denied states, unauthorized Matter/Vault visibility is covered by `apps/web/test/desktop-permission.test.mjs`, and `mater://matter` rechecks permission before screen entry.
- no desktop authority: desktop runtime context is presentation-only; `mutate`, `fileBridge`, `authMutation`, `auditMutation`, and `billing` remain false.
- Non-claims remain false: file bridge readiness, production go-live, public release, and owner approval.

Act:

- `MDT-P3-W02` is closed at its terminal TUW, `MDT-P3-W02-T04`.
- P3 is complete.
- Next ledger TUW is `MDT-P4-W01-T01`.
