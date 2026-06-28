# LCX-HRX-SFT Baseline Receipt

Date: 2026-06-28

Branch: `codex/hrx-member-roster-source-of-truth`

Head: `807e781c2`

Scope: implement the Shiftee-style People/HRX adoption plan without losing the roster Source of Truth or exposing unproven payroll, e-contract, provider integration, production, or go-live claims.

## Current Inputs

- Planning packet: `docs/lazycodex/people-reflection/lcx-hrx-shiftee-full-adoption-plan-2026-06-28.md`
- Roster Source of Truth: `docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json`
- Roster API registry: `apps/api/src/hrx-member-roster-registry.js`
- People runtime shell: `apps/web/src/components/Shell.jsx`
- People section router: `apps/web/src/people/PeopleHome.tsx`

## Non-Negotiables

- Keep the user-facing person noun as `구성원`.
- Do not expose removed People labels: `법률 People`, `관계망`, `충돌·윤리벽`, `활동 기록`, `인사 현황`, `권한 관리`.
- Put court, prosecutor, post office, tax office, and agency visit schedules under `People > 근무일정 > 외부일정`.
- Treat Matter permissions, legal-person relationship graphs, and conflict-wall concepts as non-People surfaces.
- Keep branchless law-firm operation as the default: `지점` is not a primary menu item.
- Mark unimplemented Shiftee-style modules as setup, integration, or audit states instead of pretending they are live.

## Lazyweb Gate

Lazyweb MCP health was `healthy` on version `0.13.7`. The attached temporary screenshots were no longer readable from their `/var/folders/...` paths, so the existing-screen report path could not be grounded with a screenshot. `lazyweb_generate_report` with `objective=create` returned a greenfield redirect to the Lazyweb design-create workflow. That workflow was fetched and recorded as the design evidence gate for future visual report work.

## Initial Status

- Local worktree started with the plan packet untracked and one unrelated prototype untracked.
- This batch adds a task ledger and then implements the shared People feature catalog used by navigation and section fallback rendering.
- Runtime/API/browser validation is required before any task row can move from local implementation to validated completion.
