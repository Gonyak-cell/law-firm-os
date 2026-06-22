# Matter-Vault R4 Go/No-Go Checklist

Status: desktop-qa-complete-pending-final-go-live
Date: 2026-06-22

Current decision: `desktop_qa_complete_pending_final_go_live_decision`

## Required Passes

| Gate | Command Or Receipt | Required State |
| --- | --- | --- |
| R4 validator | `npm run matter-vault:r4:validate` | Pass |
| R4 readiness | `npm run matter-vault:r4:readiness` | Pass, 118 closed |
| No premature claim | `npm run matter-vault:r4:no-go` | Pass |
| Blocker audit | `npm run matter-vault:r4:blockers` | Pass |
| CMP v1 guard | `npm run client-matter:cmp-v1:validate` | Pass |
| Matter guard | `npm run client-matter:cmp-v1:g4:validate` | Pass |
| Vault/DMS guard | `npm run client-matter:cmp-v1:g5:validate` | Pass |
| API tests | `npm --workspace apps/api run test` | Pass |
| Web UI tests | `npm --workspace apps/web run test:ui` | Pass |
| Web build | `npm --workspace apps/web run build` | Pass |
| Root test | `npm test` | Pass |
| UAT | `npm run web:e2e -- matter-vault` | Pass |
| Migration dry-run | `node scripts/backfill-matter-vault-links.mjs`; `node scripts/backfill-vault-workspaces.mjs` | Pass, failed rows empty |
| Duplicate workspace audit | `node scripts/audit-duplicate-vault-workspaces.mjs` | Pass |
| Rollback rehearsal | `node scripts/drill-matter-vault-backup-restore.mjs` | Receipt recorded |
| External receipt execution authorization | `launch/external-receipt-execution-authorization.json` | Received for production-equivalent smoke and pilot tenant dry-run migration |
| External production smoke | `launch/external-production-smoke-receipt.json` | Production-equivalent desktop runtime smoke received |
| Owner release authority | `launch/owner-release-authority-receipt.json` | Received for release/cutover progression |
| Production migration operator receipt | `launch/production-migration-operator-receipt.json` | Pilot tenant dry-run received |
| Desktop screen QA | `npm run matter-desktop:screen-qa`; `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa-result.json` | Pass |

## Automatic No-Go

- Any validator or test command fails.
- Any Matter, Vault/DMS, search, AI, portal, audit, or tenant isolation guard regresses.
- Any raw storage path, denied count, document byte, internal memo, or unauthorized source appears in a user-facing projection.
- Migration dry-run produces failed rows.
- Duplicate Vault workspace audit finds duplicate workspace ownership.
- Rollback rehearsal is missing.
- Final go-live decision receipt is absent.
- R4 full business smoke for a real production app runtime is absent.

Automation cannot convert this checklist into a launch decision.
