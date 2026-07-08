# Current State Document Map

Date: 2026-07-06 KST
Scope: `/Users/jws/Documents/Codex/Law Firm OS`

This map is the entrypoint for reading older Law Firm OS documents without
mistaking historical evidence for the current state.

## Current Baseline

| Area | Current anchor | Reader guidance |
|---|---|---|
| Enterprise audit V Track | `workbook/enterprise-audit-2026-07/17-reverification-decision-ledger.md` | Use as the latest repo-local remediation input. W0-W7 files remain historical snapshot evidence unless this ledger has promoted them. |
| C0-C8 implementation assessment | `workbook/enterprise-audit-2026-07/remediation-v3-executable/03-codex-implementation-assessment.md` | C0-C8 are recorded as repo-local implemented inputs, not production approval. |
| Document hygiene inventory | `workbook/document-hygiene/summary-2026-07-06.md` | Use for document counts, review queue size, and cleanup/update routing. |
| Document update plan | `workbook/document-hygiene/outdated-document-update-plan-2026-07-06.md` | Use for the update class taxonomy and execution order. |
| AWS SSO and Matter role chain | `docs/runbooks/aws-sso-role-chain.md`, `AGENTS.md` | Default AWS credentials may be empty. Matter production deploy commands use the documented SSO role chain. |
| STORE_PATH/env catalog | `docs/runbooks/store-env-catalog.md` | Current operational path and startup-preflight reference. |
| Desktop package candidate | `docs/desktop/matter-desktop-v0.1.9-final-package-release-notes-2026-07-05.md` | Latest formal package candidate reference after v0.1.8. Not a public release or owner go-live claim. |
| Desktop formal receipt | `docs/desktop/matter-desktop-formal-release-receipt.md` | Formal release-candidate receipt for v0.1.9, with explicit non-claims. |
| Matter Lambda redeploy | `docs/lazycodex/evidence/matter-web/artifacts/matter-lambda-redeploy-2026-07-05.md` | AWS/Lambda redeploy evidence. It is not a broad production-ready claim. |
| Refreshed production smoke | `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.md` | Smoke evidence refreshed after v0.1.9 work. Treat as smoke, not final go-live approval. |

## Current State Rules

- `production_ready_claim` remains `false` unless a separate owner and
  production gate explicitly changes it.
- Repo-local green is not the same as external provider approval.
- C0-C8 remediation is current repo-local implementation input for V Track.
- Historical W0-W7 audit files should preserve their original snapshot claims;
  add successor notes instead of rewriting the original evidence.
- AWS profile checks must use the Matter SSO role chain before concluding that
  Matter AWS access is unavailable.
- Desktop v0.1.8 files are receipts for v0.1.8. The current package candidate
  anchor is v0.1.9.

## 2026-07-05 Repo-Local Gates

These gates are recorded in `17-reverification-decision-ledger.md` as V Track
inputs:

| Gate | Recorded result |
|---|---|
| `git diff --check` | pass |
| `npm run api:test` | pass, 265/265 |
| `npm test` | pass, 4155/4155 |
| `npm --prefix apps/web run build` | pass, Vite large chunk warning only |
| `node --test apps/web/test/ui-regression.test.mjs` | pass, 16/16 |
| `npm run store-path-preflight:validate` | pass, 5 scenarios |
| `npm run typecheck:web` | pass, strict exit 0 with no diagnostics |
| AI slop changed-copy check | exit 0; weak findings only in generated audit prose |

## Still Separate From Repo-Local Green

| Gate | Status |
|---|---|
| OIDC/SSO production login | external/provider/owner gate remains open |
| SCIM and seat billing | enterprise-readiness work remains open |
| SOC2/ISO readiness | evidence model remains open |
| M365/Outlook provider receipts | external receipt gate remains open |
| Popbill production/sandbox approval | owner/provider receipt gate remains open |
| Owner production go-live approval | not granted by local remediation or smoke evidence |

## How To Update Older Docs

| Document type | Update method |
|---|---|
| Living entrypoint docs | Update body with current anchor links and current-state boundary language. |
| Historical audit snapshots | Add a successor note at the top; preserve the original body. |
| Release receipts | Preserve receipt facts; point to newer package candidates when relevant. |
| Evidence and raw outputs | Do not rewrite body. Index from `workbook/document-hygiene/` instead. |
| Generated ledgers | Add folder-level status overlays rather than hand-editing generated rows. |

## First Slice Applied

The first update slice creates this map, creates
`workbook/document-hygiene/outdated-update-ledger-2026-07-06.csv`, and adds
successor notes to:

- `workbook/enterprise-audit-2026-07/08-report.md`
- `workbook/enterprise-audit-2026-07/09-plan-306090.md`
- `docs/desktop/matter-desktop-formal-release-receipt.md`
