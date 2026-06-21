# LCX-DESK-02 Auth Session Evidence

Status: in_progress
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
| MDT-P2-W01-T04 | pending | terminal not reached |
| MDT-P2-W02-T01 | pending | not started |
| MDT-P2-W02-T02 | pending | not started |
| MDT-P2-W02-T03 | pending | not started |
| MDT-P2-W02-T04 | pending | phase terminal not reached |

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
