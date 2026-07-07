# LCX Sidebar Home Dashboard Stage 7 Release TUW Plan

Status: completed
Date: 2026-07-08
Scope: remaining Stage 7 release work for Sidebar IA + Home dashboard, web and desktop
Planning mode: LazyCodex TUW, Plan -> Do -> Check -> Act
Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md`
Baseline commit: `5cdbd4485 feat(web): implement sidebar home dashboard IA`
Production execution: false
Public release: false
Go-live approved: false
Owner final approval: false

## Goal

Close the remaining Stage 7 release gate without weakening `production_ready` boundaries:

1. Finish i18n, keyboard focus, and `aria-current` checks for the new Home IA.
2. Prove the web Home dashboard and sidebar invariants still hold after final accessibility cleanup.
3. Prove the packaged desktop runtime lands on the new Home dashboard and preserves legacy route compatibility.
4. Update only necessary release/offline/evidence docs.
5. Produce an owner review packet that separates implementation-complete, desktop smoke pass, owner approval, public release, and production go-live.

## Current Truth

| Area | Current state | Planning implication |
| --- | --- | --- |
| Stage 0-6 | Landed in `5cdbd4485` | Stage 7 starts from this commit. Do not reopen Stage 0-6 except for release-blocking defects. |
| Web IA | Home dashboard, utility drawers, NAV-05 mode exception implemented | Stage 7 should test and harden labels/focus, not redesign the IA. |
| API contract | Home dashboard runtime and tests committed | Stage 7 may verify but should not expand the contract without a new owner decision. |
| Desktop | Worktree has existing desktop changes outside this lane | Use explicit pathspecs and do not stage unrelated desktop/icon/runtime changes. |
| Shared root | `package.json` and `package-lock.json` remain dirty outside this lane | Do not edit or stage shared root unless the owner explicitly authorizes a separate dependency/script commit. |
| Owner decisions | O-01 fixed; O-02..O-04 defaulted per execution plan | Owner packet must mark unresolved owner confirmations as pending/default-applied, not approved. |

## Claim Boundary

```json
{
  "implementation_stage_0_6_committed": true,
  "stage_7_planned": true,
  "stage_7_implemented": true,
  "web_release_candidate_verified": true,
  "desktop_smoke_verified": true,
  "owner_review_packet_ready": true,
  "owner_final_approval": false,
  "public_release": false,
  "production_go_live": false,
  "production_ready_gate_weakened": false
}
```

## Non-Negotiable Rules

1. Preserve NAV-01..NAV-06, especially NAV-02 and NAV-03.
2. Do not change the Stage 0-6 data contract except to fix a release-blocking mismatch with a documented owner decision.
3. Do not stage CP-owned paths: `contracts/**`, `packages/**`, `scripts/validate-*.mjs`, `docs/closeout-packs/**`, `docs/closeout-pack-plan/**`, `artifacts/**`, `docs/ldip-integration/**`.
4. Do not stage shared root files unless the owner gives a separate explicit override for that commit.
5. Do not claim public release, production go-live, owner approval, store distribution, notarization success, or customer-wide rollout from local smoke evidence.
6. Desktop smoke must exercise the actual desktop renderer/runtime path, not only the web dev server.
7. Screenshots and receipts must not expose secrets, tokens, cookies, real private payloads, or raw RSS article bodies.

## TUW Execution Order

| TUW | Layer | Primary scope | Depends on | Exit evidence | Allowed claim | Blocked claim |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-SHD-70 | boundary | dirty worktree and pathspec inventory | `5cdbd4485` | staged/unstaged boundary note | Stage 7 paths identified | workspace clean |
| LCX-SHD-71 | web a11y | ko/en labels, focus order, `aria-current`, top-axis state | 70 | source diff + focused browser proof | web accessibility pass candidate | certified accessibility |
| LCX-SHD-72 | web regression | NAV-01..06, legacy redirects, utility drawers, mode exception | 71 | `ui-regression` output + screenshot/JSON | web release candidate verified | desktop verified |
| LCX-SHD-73 | desktop source truth | identify active desktop renderer URL, packaged app path, bridge/session truth | 70 | source/runtime trace note | desktop smoke path fixed | packaged smoke pass |
| LCX-SHD-74 | desktop smoke | Home landing, old route redirects, Settings/Data Import return anchor, offline fallback | 73 | desktop screenshot/JSON receipt | desktop smoke pass | owner approval/go-live |
| LCX-SHD-75 | release docs | Stage 7 workbook, release note, offline doc delta if needed | 72, 74 | docs diff + claim-boundary checklist | owner packet ready | owner approved |
| LCX-SHD-76 | final gate | full tests, build, sloplint, secret grep, cached diff review | 75 | command table with exit codes | Stage 7 ready for owner review | public release |

## Expected Artifacts

| Artifact | Purpose |
| --- | --- |
| `workbook/sidebar-home-dashboard-stage-7-release-2026-07-08.md` | Stage 7 closeout table, verification, unverified items, owner decision status. |
| `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage7-web-accessibility-2026-07-08.json` | Browser QA receipt for labels, focus, `aria-current`, and NAV invariants. |
| `docs/lazycodex/evidence/matter-web/artifacts/sidebar-stage7-web-accessibility-2026-07-08.png` | Web screenshot evidence. |
| `docs/lazycodex/evidence/matter-desktop/artifacts/sidebar-stage7-desktop-smoke-2026-07-08.json` | Desktop smoke receipt. |
| `docs/lazycodex/evidence/matter-desktop/artifacts/sidebar-stage7-desktop-smoke-2026-07-08.png` | Desktop screenshot evidence. |
| `docs/desktop/matter-desktop-home-dashboard-ia-release-note-2026-07-08.md` | Release note or explicit no-change note for the desktop release boundary. |

## Verification Bundle

Run these before the Stage 7 commit:

```bash
git diff --check
node --test apps/web/test/ui-regression.test.mjs
node --test apps/api/test/home-dashboard-api.test.js
npm --workspace apps/desktop run test:smoke
npm run matter-desktop:screen-qa
npm test
npm run build
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
rg -n "Bearer|AWS_SECRET_ACCESS_KEY|password=.*|reset_token|operator_token|matter://password-reset/confirm\\?token=" docs/lazycodex/evidence/matter-web/artifacts docs/lazycodex/evidence/matter-desktop/artifacts
git diff --cached --name-only
```

If `matter-desktop:screen-qa` is too broad for the Stage 7 lane, write a narrower Stage 7 desktop smoke script first and record why the broader QA remains unverified.

## Recommended Goal Setup

> Execute `LCX-SHD-70..76` for the Sidebar IA + Home dashboard Stage 7 release gate, changing only Stage 7 web accessibility/i18n fixes, focused desktop smoke or evidence scripts if needed, LazyCodex evidence, workbook closeout, and release-boundary docs. Preserve NAV-01..NAV-06, do not stage CP-owned paths or shared root files without explicit override, verify with web regression, desktop runtime smoke, `npm test`, `npm run build`, AI slop review, secret grep, and cached path review. Stop and ask only if desktop runtime cannot be reached, owner approval is required to proceed, a production-ready gate would need weakening, or unrelated dirty files block a safe pathspec commit.

## Stop Conditions

Stop and report `BLOCKED` if:

1. The actual desktop runtime cannot be opened or authenticated enough to verify Home landing and route behavior.
2. Desktop smoke requires staging unrelated desktop/runtime files already dirty before Stage 7.
3. Any NAV invariant fails and cannot be fixed without reopening Stage 0-6 architecture.
4. Any evidence artifact contains secret material or private raw payloads that cannot be safely redacted.
5. O-02..O-04 owner confirmations become necessary for release wording beyond the defaults already applied.
6. A requested change would imply production go-live, public release, or owner final approval without a real owner receipt.
