# Outdated Document Update Plan

Date: 2026-07-06 KST
Scope: `/Users/jws/Documents/Codex/Law Firm OS`
Mode: update plan only. This document does not edit, delete, move, or archive
existing project documents.

## Purpose

The previous hygiene pass identified documents that may be superseded,
historical, or evidence-only. This plan covers the opposite operation from
deletion: update the documents that now mislead readers because the repo moved
forward after they were written.

The update target is not "make every old file look current." Some documents are
historical evidence and should remain frozen. The target is to make the current
state discoverable, with clear successor links and conservative production
claims.

## Current Truth Anchors

Use these as the 2026-07-06 baseline before updating any document:

| Anchor | Current meaning |
|---|---|
| `workbook/enterprise-audit-2026-07/17-reverification-decision-ledger.md` | Latest repo-local V Track input: C0-C8 implemented, direct local gates recorded, production claim still false |
| `workbook/enterprise-audit-2026-07/remediation-v3-executable/03-codex-implementation-assessment.md` | Codex implementation assessment for the enterprise remediation units |
| `workbook/document-hygiene/summary-2026-07-06.md` | Full document inventory and review queue counts |
| `workbook/document-hygiene/review-queue-2026-07-06.csv` | Candidate queue for superseded/update review |
| `docs/runbooks/aws-sso-role-chain.md` and `AGENTS.md` AWS section | Current Matter AWS SSO/profile chain |
| `docs/runbooks/store-env-catalog.md` | Current STORE_PATH/env catalog and preflight surface |
| `docs/desktop/matter-desktop-v0.1.9-final-package-release-notes-2026-07-05.md` | Current desktop packaged candidate after v0.1.8 |
| `docs/lazycodex/evidence/matter-web/artifacts/matter-lambda-redeploy-2026-07-05.md` | Matter Lambda redeploy receipt |
| `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.md` | Refreshed production smoke evidence after v0.1.9 updates |

Current state phrases to propagate into living docs:

- `production_ready_claim` remains `false`.
- Repo-local C0-C8 remediation implementation is complete as V Track input,
  not as production approval.
- Local gates recorded on 2026-07-05: `npm run api:test` pass 265/265,
  `npm test` pass 4155/4155, web build pass, UI regression pass 16/16,
  web typecheck pass, `store-path-preflight:validate` pass 5 scenarios.
- External/provider gates remain separate: AWS/Lambda smoke is refreshed, but
  OIDC/SCIM/SOC2/M365/Popbill/owner production approval remain outside the
  repo-local green state.
- Historical W0-W7 audit files are evidence snapshots unless explicitly marked
  as living reports.

## Outdated Definition

A document is `OUTDATED_UPDATE_REQUIRED` only when it would cause a reader to
make a wrong current decision.

Examples:

- It says root/API tests are failing without pointing to the 2026-07-05 V Track
  ledger.
- It says Matter opening is blocked by the old 400 sample without pointing to
  the C1 remediation proof route.
- It treats `DEFAULT_SESSION_SECRET` or temp STORE_PATH as unresolved without
  linking to the fail-closed/session and store preflight work.
- It describes v0.1.8 as latest desktop package without mentioning v0.1.9.
- It says AWS SSO is unavailable or assumes the default AWS profile is the
  Matter authority.
- It makes production, enterprise, or external-provider claims stronger than
  the current evidence allows.

A document is not automatically outdated just because it is older. It may be
`HISTORICAL_SNAPSHOT` and should stay immutable.

## Update Classes

| Class | Meaning | Action |
|---|---|---|
| `LIVE_REFRESH` | Current reader-facing doc | Update body to current truth and add evidence links |
| `SUCCESSOR_NOTE` | Historical doc with obsolete current-state claims | Add a short top note pointing to the current anchor; preserve original body |
| `CANONICAL_INDEX` | Index, README, or roadmap entrypoint | Add a "Current State As Of 2026-07-06" section and successor map |
| `EVIDENCE_FREEZE` | Receipt, command output, review result, manual QA proof | Do not rewrite body; only index from elsewhere |
| `PLAN_REBASE` | Plan still useful but now partially implemented | Add status column: `done`, `still-open`, `external-gated`, `superseded` |
| `ARCHIVE_AFTER_UPDATE` | Superseded plan with no unique current value | Add replacement link in an index, then handle via archive plan later |

## Priority Plan

### P0 - Current-State Entry Points

Goal: make the latest state easy to find before touching hundreds of older
files.

Update or create a small canonical map under `workbook/document-hygiene/`:

- `current-state-doc-map-2026-07-06.md`
- `outdated-update-ledger-2026-07-06.csv`

Required map sections:

- latest repo-local remediation status,
- current release/package status,
- current AWS/production smoke status,
- current production-readiness boundary,
- current external/provider gates,
- historical snapshot rule.

Candidate entrypoint files to inspect first:

| File | Expected update |
|---|---|
| `README.md` | Add a short link to the current-state map if README is used as an entrypoint |
| `docs/architecture.md` | Check whether runtime/store/auth architecture mentions old assumptions |
| `docs/desktop/matter-desktop-formal-release-receipt.md` | Confirm it points from v0.1.8/v0.1.9 state to latest package receipt |
| `docs/desktop/matter-desktop-current-state-audit.md` | Add successor note if it predates v0.1.9 and C0-C8 remediation |
| `docs/launch/final-go-live-decision.md` | Ensure no production-ready claim exceeds current evidence |
| `docs/launch/go-no-go-decision.md` | Ensure owner/external gates remain separate from repo-local green |
| `workbook/enterprise-audit-2026-07/08-report.md` | Preserve as W7 snapshot; add successor note to `17-reverification-decision-ledger.md` if needed |

Exit criteria:

- A reader can start from README or the current-state map and find the latest
  truth without reading stale W7 text first.
- No production-ready or enterprise-ready claim is strengthened.

### P1 - Audit And Remediation Workbook Refresh

Goal: reconcile W0-W7 snapshot docs with the 2026-07-05 V Track implementation
ledger.

Do not rewrite W0-W7 historical sections in place unless they are explicitly
living docs. Prefer successor notes.

Candidate files:

- `workbook/enterprise-audit-2026-07/00-charter.md`
- `workbook/enterprise-audit-2026-07/05-gaps.md`
- `workbook/enterprise-audit-2026-07/07-bottlenecks-verdict.md`
- `workbook/enterprise-audit-2026-07/08-report.md`
- `workbook/enterprise-audit-2026-07/09-plan-306090.md`
- `workbook/enterprise-audit-2026-07/remediation-v3-spec.md`

Required update pattern:

- top note: "Historical W0-W7 snapshot; latest repo-local V Track input is
  `17-reverification-decision-ledger.md`."
- status table for old blockers:
  - Matter opening 400 -> C1 implemented, requires V re-run proof before final
    W7 verdict promotion.
  - API/root test failures -> C2 local gates recorded green, still not
    production approval.
  - session secret / STORE_PATH -> C4/store preflight surfaces exist, still
    needs profile-specific deployment proof for stronger claims.
  - dead surfaces -> C7 implemented locally, browser/UI proof remains the V
    ledger source.
  - external provider receipts -> still external-gated.

Exit criteria:

- A W7 reader sees both the original failure state and the current remediation
  status without confusing local implementation with production approval.

### P2 - Release, Desktop, And AWS Docs

Goal: update documents that may still name v0.1.8 or pre-SSO/pre-redeploy state
as the latest operational state.

Candidate folders:

- `docs/desktop/**`
- `docs/lazycodex/evidence/matter-web/**`
- `docs/runbooks/**`
- `docs/launch/**`

Required checks:

- v0.1.8 documents should either stay as release receipts or point to v0.1.9 as
  the newer package candidate.
- AWS docs should use the Matter role chain:
  `amic-vault-staging-admin` -> `matter-staging-admin` ->
  `matter-prod-deploy-admin`.
- Production smoke docs should distinguish Lambda/API smoke from public
  production readiness.
- Launch docs should not collapse repo-local green, AWS smoke, and owner
  go-live approval into one state.

Exit criteria:

- "Latest package" and "latest smoke" references are discoverable.
- Default AWS profile emptiness is not described as lack of Matter AWS access.

### P3 - Planning Ledgers And Generated Roadmaps

Goal: keep large planning docs useful without manually rewriting thousands of
microphase rows.

Candidate groups from `review-queue-2026-07-06.csv`:

- `docs/lazycodex/**` - 630 rows
- `docs/reorganization/**` - 583 rows
- root `docs/rp*-detailed-microphases.*`
- `docs/full-spec-microphase-ledger.*`
- `docs/closeout-pack-plan/**`
- `docs/hrx-enterprise/*-plan.md`

Required update pattern:

- Do not bulk-edit generated JSON/ledger rows.
- Add one `CURRENT_STATUS.md` or `README` in each folder with:
  - current anchor,
  - stale claim patterns,
  - replacement path,
  - whether the folder is active, frozen evidence, or archive review.
- If a plan has partially landed, add a compact status overlay rather than
  rewriting the source plan.

Exit criteria:

- Large generated planning surfaces are navigable.
- No generated ledger is hand-mutated in a way that breaks validators.

### P4 - Evidence And Attempt Files

Goal: keep proof intact while making stale attempts understandable.

Candidate groups:

- `artifacts/closeout-pack-claude-review/**/invalid-attempt*`
- `artifacts/closeout-pack-claude-review/**/raw-output-invalid-attempt*`
- `docs/matter-pack-integration/**/raw/*attempt*`
- `docs/ldip-integration/**/invalid-attempt*`
- `artifacts/backups/**-restored/**`

Action:

- Do not edit evidence body.
- Add index rows that say whether a final receipt exists.
- If final receipt exists, mark stale attempts as `EVIDENCE_FREEZE` and
  `ARCHIVE_REVIEW`, not `DELETE_READY`.

Exit criteria:

- Raw/invalid attempts are understandable from the index without losing audit
  trail.

## Execution Steps

1. Generate `outdated-update-ledger-2026-07-06.csv` from
   `inventory-2026-07-06.csv` and `review-queue-2026-07-06.csv`.
2. Add `current-state-doc-map-2026-07-06.md` with the truth anchors above.
3. Update only P0 entrypoints first.
4. Add successor notes to P1 audit workbook files.
5. Refresh P2 release/AWS/launch entrypoints.
6. Add folder-level `CURRENT_STATUS.md` overlays for P3 planning groups.
7. Add evidence index status for P4 raw/invalid attempts.
8. Re-run reference checks:

```bash
rg -n "v0\\.1\\.8|400 validation|64 fail|3 fail|DEFAULT_SESSION_SECRET|STORE_PATH|production_ready|SSO|SCIM|SOC2|Popbill|Outlook|M365" docs workbook README.md
```

9. Validate markdown/diff hygiene:

```bash
git diff --check -- docs workbook README.md
```

10. If UI or user-facing copy was touched, run:

```bash
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

## Do Not Do

- Do not rewrite historical receipts to make them look current.
- Do not mark `production_ready_claim` true from local gates.
- Do not delete stale documents as part of the update pass.
- Do not hand-edit generated JSON ledgers unless their generator and validator
  are part of the same change.
- Do not hide external-provider gaps behind local smoke success.

## First Implementation Slice

The smallest safe first slice is:

1. Create `current-state-doc-map-2026-07-06.md`.
2. Create `outdated-update-ledger-2026-07-06.csv`.
3. Add successor notes to:
   - `workbook/enterprise-audit-2026-07/08-report.md`
   - `workbook/enterprise-audit-2026-07/09-plan-306090.md`
   - `docs/desktop/matter-desktop-formal-release-receipt.md`
4. Verify no production-ready claim changed.

This gives readers the current state immediately while leaving evidence files
and large generated ledgers untouched.
