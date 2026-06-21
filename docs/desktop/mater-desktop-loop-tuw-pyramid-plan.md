# mater Desktop Loop/TUW Pyramid Plan

Status: planning-only
Created: 2026-06-21
Scope: `mater` desktop Wave 1 internal pilot
Source package: `/Users/jws/Documents/Codex/matter-desktop/`
Machine-readable ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`
Validator: `scripts/validate-mater-desktop-loop-tuw-plan.mjs`

## Authority Boundary

This plan does not claim implementation completion, launch approval, production readiness, or signed desktop distribution. It decomposes the attached `mater` desktop handoff package into Loop Engineering execution slices.

Repo truth checked before this plan:

- `/Users/jws/Documents/Codex/matter-desktop` is a planning artifact folder, not a git repo.
- Law Firm OS currently has `apps/web` and `apps/api`; it does not have `apps/desktop`.
- The existing `apps/web` build and UI tests pass.
- Existing brand assets and a logo animation prototype exist under `docs/ui-reference/brand/` and `docs/ui-reference/prototypes/`.

## Pyramid

| Level | Name | Rule |
| --- | --- | --- |
| MDP0 | North Star | `mater` desktop Wave 1 internal pilot, no public release claim. |
| MDP1 | Invariants | Naming, source-of-truth, permission, audit, desktop authority, local data, and release gates. |
| MDP2 | Phases | P0 through P7 from the attached desktop handoff package. |
| MDP3 | Work Packages | One independently reviewable PR-sized work package. |
| MDP4 | TUW | Testable Unit of Work, small enough to complete with a command or manual QA receipt. |
| MDP5 | Verification Contract | Each TUW has a concrete command, grep, smoke, or manual receipt. |
| MDP6 | Evidence Record | Each phase closes only with LazyCodex evidence under `docs/lazycodex/evidence/mater-desktop/`. |

## Invariants

1. User-facing product brand is `mater`; UI brand is `mater by AMIC`.
2. `Law Firm OS`, `law-firm-os`, package names, validators, ledgers, historical evidence, `packages/matter`, and `matter_id` are not renamed for branding.
3. `apps/web` remains the renderer source of truth until a separately approved migration changes that.
4. The desktop shell is not a source of truth and cannot bypass backend permission, audit, session, or AI policy.
5. File bridge access requires explicit user gesture, backend precheck, and audit evidence.
6. Deep links and notifications are route intents only. They cannot execute mutation, download, upload, billing write, or AI generation.
7. Signed packaging and update work cannot imply public release. Pilot go/no-go remains an owner decision.

## LazyCodex Execution Lanes

| Lane | Phase | Evidence file pattern | Closure rule |
| --- | --- | --- | --- |
| LCX-DESK-00 | P0 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-00-branding.md` | Brand guardrails and splash integration are verified without machine rename. |
| LCX-DESK-01 | P1 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-01-shell.md` | Electron shell opens only approved local/dev or packaged web origins with hardened settings. |
| LCX-DESK-02 | P2 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md` | Tokens are absent from renderer storage and logout/cache wipe is observed. |
| LCX-DESK-03 | P3 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md` | Matter workspace is permission-trimmed through backend-owned decisions. |
| LCX-DESK-04 | P4 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-04-file-bridge.md` | File bridge proves picker-only access, precheck, and audit. |
| LCX-DESK-05 | P5 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md` | Deep links and notifications prove route-only behavior. |
| LCX-DESK-06 | P6 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md` | Signed internal build and rollback evidence exist, without public release claim. |
| LCX-DESK-07 | P7 | `docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md` | Pilot QA and owner go/no-go packet are complete. |

## Phase and Work Package Map

| Phase | Goal | Work packages | Terminal evidence |
| --- | --- | --- | --- |
| P0 | Branding and guardrails | `MDT-P0-W01`, `MDT-P0-W02` | `MDT-P0-W02-T05` |
| P1 | Desktop shell prototype | `MDT-P1-W01`, `MDT-P1-W02` | `MDT-P1-W02-T04` |
| P2 | Auth and session | `MDT-P2-W01`, `MDT-P2-W02` | `MDT-P2-W02-T04` |
| P3 | Permission-trimmed Matter workspace | `MDT-P3-W01`, `MDT-P3-W02` | `MDT-P3-W02-T04` |
| P4 | Document/file bridge | `MDT-P4-W01`, `MDT-P4-W02` | `MDT-P4-W02-T05` |
| P5 | Notification and deep link | `MDT-P5-W01`, `MDT-P5-W02` | `MDT-P5-W02-T04` |
| P6 | Packaging, signing, update | `MDT-P6-W01`, `MDT-P6-W02` | `MDT-P6-W02-T04` |
| P7 | Pilot QA and closeout | `MDT-P7-W01`, `MDT-P7-W02` | `MDT-P7-W02-T05` |

## Loop Rule for Every TUW

Each TUW follows the same loop:

1. Plan: read the declared source files, confirm current repo truth, and state forbidden scope.
2. Do: change only the deliverables named in the TUW.
3. Check: run the TUW verification contract.
4. Act: record the result in the matching LazyCodex evidence file and either close the TUW or block it with a named reason.

## Completion Rules

- No TUW closes without its verification contract.
- No work package closes without exactly one terminal TUW.
- No phase closes without a LazyCodex evidence file.
- No later phase starts before the previous phase terminal TUW passes, except read-only planning.
- Any risk-A TUW must include permission/audit impact evidence.
- A failed verification produces a blocker row, not a weakened acceptance criterion.

## First Safe PR

The first safe PR is `MDT-P0-W01` plus `MDT-P0-W02` only:

- Add `mater` naming rules and branding backlog.
- Centralize brand constants.
- Derive `mater` logo/splash assets from the existing `matter` assets without deleting originals.
- Integrate the first-run splash into `apps/web` loading/auth surfaces.
- Add a branding validator that proves no package/script/evidence rename occurred.

Forbidden in the first PR:

- `apps/desktop`
- auth/session implementation
- file bridge
- deep links
- package identifier rename
- public release or pilot-ready claim
