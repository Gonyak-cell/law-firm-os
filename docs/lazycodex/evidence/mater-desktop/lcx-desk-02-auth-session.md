# LCX-DESK-02 Auth Session Evidence

Status: P2_complete
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P2 auth/session planning, main-process coordinator, preload session API, and cleanup evidence
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P2 auth/session progress only. It does not claim production IdP readiness, owner approval, production go-live, public release, file bridge readiness, or signed packaging readiness.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P2-W01-T01 | complete | `docs/desktop/mater-desktop-auth-session-plan.md` |
| MDT-P2-W01-T02 | complete | `contracts/desktop-deep-link-contract.json` |
| MDT-P2-W01-T03 | complete | `docs/desktop/mater-desktop-secure-store-policy.md` |
| MDT-P2-W01-T04 | complete | `contracts/desktop-session-cleanup-contract.json`, `scripts/validate-desktop-session-cleanup-contract.mjs` |
| MDT-P2-W02-T01 | complete | `apps/desktop/src/main/auth.js`, `apps/desktop/test/auth-coordinator.test.mjs` |
| MDT-P2-W02-T02 | complete | `apps/desktop/src/preload/session.js` |
| MDT-P2-W02-T03 | complete | `apps/desktop/test/session-cleanup.test.mjs` |
| MDT-P2-W02-T04 | complete | P2 terminal closure recorded here |

## MDT-P2-W01-T01 - Write OIDC PKCE Session Plan

Plan:

- Write the desktop auth/session authority plan.
- Ban embedded password login.
- Ban renderer storage of token material.

Do:

- Added `docs/desktop/mater-desktop-auth-session-plan.md`.

Check:

```bash
rg -n "PKCE|embedded password|renderer storage|forbidden" docs/desktop/mater-desktop-auth-session-plan.md
git diff --check -- docs/desktop/mater-desktop-auth-session-plan.md docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Auth plan grep passed for `PKCE`, `embedded password`, `renderer storage`, and `forbidden`.
- `git diff --check` passed.

Permission/audit impact:

- Session authority stays outside the renderer.

Act:

- `MDT-P2-W01-T01` is complete.
- Next TUW is `MDT-P2-W01-T02`.

## MDT-P2-W01-T02 - Reserve Auth Callback Deep Link Route

Plan:

- Reserve only the desktop auth callback route.
- Ensure the route cannot execute non-auth actions.
- Update the auth/session plan to point to the contract.

Do:

- Added `contracts/desktop-deep-link-contract.json`.
- Updated `docs/desktop/mater-desktop-auth-session-plan.md`.

Check:

```bash
rg -n "auth_callback|mutation|download|upload|ai_generate" contracts/desktop-deep-link-contract.json
git diff --check -- contracts/desktop-deep-link-contract.json docs/desktop/mater-desktop-auth-session-plan.md docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Deep link contract grep passed for `auth_callback`, `mutation`, `download`, `upload`, and `ai_generate`.
- Contract records `may_mutate_product_state: false`, `may_download: false`, `may_upload: false`, and `may_ai_generate: false`.
- `git diff --check` passed.

Permission/audit impact:

- Auth callback cannot become a general action link.

Act:

- `MDT-P2-W01-T02` is complete.
- Next TUW is `MDT-P2-W01-T03`.

## MDT-P2-W01-T03 - Define Secure Store Policy

Plan:

- Define token location, lifetime, logout deletion, tenant switch invalidation, and cache rules.
- Keep renderer token persistence forbidden.

Do:

- Added `docs/desktop/mater-desktop-secure-store-policy.md`.

Check:

```bash
rg -n "token|logout|tenant switch|cache" docs/desktop/mater-desktop-secure-store-policy.md
git diff --check -- docs/desktop/mater-desktop-secure-store-policy.md docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Secure store policy grep passed for `token`, `logout`, `tenant switch`, and `cache`.
- `git diff --check` passed.

Permission/audit impact:

- Token and tenant material are not written to renderer localStorage/sessionStorage.

Act:

- `MDT-P2-W01-T03` is complete.
- Next TUW is `MDT-P2-W01-T04`.

## MDT-P2-W01-T04 - Define Logout and Cache Wipe Contract

Plan:

- Define all cache classes that must be wiped on logout and tenant switch.
- Add a validator for the cleanup contract.
- Close only `MDT-P2-W01` because this is the work package terminal TUW.

Do:

- Added `contracts/desktop-session-cleanup-contract.json`.
- Added `scripts/validate-desktop-session-cleanup-contract.mjs`.

Check:

```bash
node scripts/validate-desktop-session-cleanup-contract.mjs
git diff --check -- contracts/desktop-session-cleanup-contract.json scripts/validate-desktop-session-cleanup-contract.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Cleanup contract validator passed with verdict `PASS`.
- Validator confirmed `9` required cache classes.
- Validator confirmed logout and tenant switch wipe all required cache classes.
- Validator confirmed renderer token storage remains disallowed.
- `git diff --check` passed.

Permission/audit impact:

- Tenant data cannot survive logout or tenant switch.

Act:

- `MDT-P2-W01` is closed at its terminal TUW, `MDT-P2-W01-T04`.
- Next ledger TUW is `MDT-P2-W02-T01`.

## MDT-P2-W02-T01 - Implement Main-Process Auth Coordinator

Plan:

- Implement a main-process PKCE coordinator.
- Keep token material in secure store only.
- Return session status only to renderer-facing callers.

Do:

- Added `apps/desktop/src/main/auth.js`.
- Added `apps/desktop/test/auth-coordinator.test.mjs`.

Check:

```bash
node apps/desktop/test/auth-coordinator.test.mjs
git diff --check -- apps/desktop/src/main/auth.js apps/desktop/test/auth-coordinator.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Auth coordinator tests passed.
- Tests prove PKCE login starts without exposing verifier or token bodies.
- Tests prove token material is stored in secure store and returned session status omits token bodies.
- Tests prove state mismatch is rejected and logout clears secure-store state.
- `git diff --check` passed.

Permission/audit impact:

- Renderer receives session status only.

Act:

- `MDT-P2-W02-T01` is complete.
- Next TUW is `MDT-P2-W02-T02`.

## MDT-P2-W02-T02 - Expose Minimal Preload Session API

Plan:

- Add a preload session API with session state and commands only.
- Use a fixed channel allowlist.
- Do not export generic `ipcRenderer` or token bodies.

Do:

- Added `apps/desktop/src/preload/session.js`.

Check:

```bash
rg -n "contextBridge|ipcRenderer|token|localStorage" apps/desktop/src/preload apps/desktop/test
git diff --check -- apps/desktop/src/preload/session.js docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Preload grep found `contextBridge` and `ipcRenderer` usage only inside the allowlisted session preload file.
- Existing auth tests keep token body assertions in tests, not in renderer API exports.
- No `localStorage` token persistence is introduced by the preload API.
- `git diff --check` passed.

Permission/audit impact:

- Renderer cannot access generic IPC or token bodies.

Act:

- `MDT-P2-W02-T02` is complete.
- Next TUW is `MDT-P2-W02-T03`.

## MDT-P2-W02-T03 - Test Token Absence and Cache Cleanup

Plan:

- Add session tests for token absence from renderer-facing status and preload source.
- Test secure-store and cache cleanup on logout.
- Add `test:session` workspace script.

Do:

- Updated `apps/desktop/src/main/auth.js`.
- Updated `apps/desktop/package.json`.
- Added `apps/desktop/test/session-cleanup.test.mjs`.

Check:

```bash
npm --workspace apps/desktop run test:session && rg -n "access_token|refresh_token" apps/desktop/src apps/web/src
git diff --check -- apps/desktop/package.json apps/desktop/src/main/auth.js apps/desktop/test/session-cleanup.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md
```

Results:

- Session tests passed.
- Tests prove token bodies are absent from renderer-facing session status and preload source.
- Tests prove logout clears secure store and registered cache stores.
- Token grep output is limited to main-process forbidden token field names and secure-store handling; no renderer token storage was introduced.
- `git diff --check` passed.

Permission/audit impact:

- No token material remains in renderer code paths.

Act:

- `MDT-P2-W02-T03` is complete.
- Next TUW is `MDT-P2-W02-T04`, the P2 terminal TUW.

## MDT-P2-W02-T04 - Close Auth/Session Evidence

Plan:

- Close P2 only at the phase terminal TUW.
- Re-run session tests, token grep, cleanup contract validator, desktop security validator, desktop smoke, and loop ledger validator.
- Record remaining blockers and non-claims.

Do:

- Reviewed `MDT-P2-W01` and `MDT-P2-W02` evidence in this file.
- Confirmed auth/session work is bounded to main-process coordinator, preload session API, cleanup contract, and tests.

Check:

```bash
npm --workspace apps/desktop run test:session && rg -n "access_token|refresh_token" apps/desktop/src apps/web/src
npm --workspace apps/desktop run test:smoke
node scripts/validate-desktop-session-cleanup-contract.mjs
node scripts/validate-mater-desktop-security.mjs
node scripts/validate-mater-desktop-loop-tuw-plan.mjs
git diff --check
```

Results:

- Session tests passed: `6` tests, `6` pass, `0` fail.
- token grep output is limited to `FORBIDDEN_RENDERER_TOKEN_FIELDS` in `apps/desktop/src/main/auth.js`.
- Desktop smoke passed: `14` tests, `14` pass, `0` fail.
- Cleanup contract validator passed with `required_cache_class_count: 9`, `logout_wipes_all_required_cache_classes: true`, and `tenant_switch_wipes_all_required_cache_classes: true`.
- Desktop security validator passed with `findings: []` and `preload_policy: preload_allowlist_checked`.
- Loop TUW ledger validator passed with `phase_count: 8`, `work_package_count: 16`, and `tuw_count: 69`.
- `git diff --check` passed.

Remaining blockers and non-claims:

- Production IdP configuration is not implemented.
- Real OS secure-store adapter is not implemented.
- Production go-live, public release, and owner approval remain false because no explicit receipt was recorded.
- File bridge remains not implemented before P4.

Act:

- P2 is closed at its terminal TUW, `MDT-P2-W02-T04`.
- Next ledger TUW is `MDT-P3-W01-T01`.
