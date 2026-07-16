# CTI S0 Probe Boundary Register - 2026-07-06

Status: i4_ratified_g0_s0_probe_boundary

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

## Contract Gate

The existing `contracts/production-data-policy-contract.json` remains a human-gated production-data contract. The owner has supplied CTI G0/S0-only ratification:

`approval_signature_ref=I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06`

This ratification allows only S0-T01 through S0-T07 probes, with S0-T04 before S0-T03 and PII-safe evidence. S1 or CUTOVER require separate goals and approval refs.

| CTI item | Ledger mapping | Current state | Reason |
|---|---|---|---|
| S0-T01 Lambda production configuration read | `LT-PRE-W08-T04` | ALLOWED_BY_I4_G0_S0 | Production credentials allowed for masked config receipt only. |
| S0-T02 persistence import census | `LT-PRE-W08-T03` | LOCAL_ALLOWED | Static repo inspection only. |
| S0-T03 cold-start marker write/readback | `LT-PRE-W08-T04` | ALLOWED_BY_I4_AFTER_S0_T04 | Synthetic marker write only; no migration, no password, no cutover. |
| S0-T04 production store readback snapshot | `LT-PRE-W08-T04` | ALLOWED_BY_I4_MUST_PRECEDE_S0_T03 | Touches real data; must complete before S0-T03. Evidence is counts/hashes only. |
| S0-T05 desktop seed drift diff | `LT-PRE-W08-T03` | LOCAL_ALLOWED | Static repo/package inspection only. |
| S0-T06 lead-lawyer mapping draft workbook | `LT-PRE-W08-T04` | REDACTED_TEMPLATE_ALLOWED | I1 owner-fill workbook template only; no staffing write. |
| S0-T07 `real_client_data_used` inventory | `LT-PRE-W08-T03` | LOCAL_ALLOWED | Static code and receipt-site inventory only. |
| S0-T08 production-data-policy ratification packet | `LT-PRE-W08-T02` | OWNER_RATIFIED_G0_S0_ONLY | Human-only I4 decision recorded. |

## Local Inventory Seed

Initial local-only S0-T07 hits found by static grep:

| Surface | Path | Current behavior |
|---|---|---|
| production smoke boundary | `scripts/run-lcx-vltui-production-smoke.mjs` | Emits `boundary.real_client_data_used: false`; future true requires additive schema/version branch. |
| desktop AWS runtime smoke | `scripts/smoke-matter-desktop-aws-runtime.mjs` | Emits `real_client_data_used: false`; future true requires CTI-scoped receipt version. |
| backup/restore drill | `scripts/drill-matter-vault-backup-restore.mjs` | Emits several `real_client_data_used: false` fields; future real-data backup must not reuse false boundary. |
| release preflight proof | `scripts/run-lcx-full-release-preflight-proof.mjs` | Emits `real_client_data_used: false`; future CTI receipts must be versioned. |
| external receipts validator | `scripts/validate-matter-vault-r4-external-receipts.mjs` | Hard-asserts `smoke.real_client_data_used === false`; future true must be additive by receipt schema/version. |
| AWS env plan validator | `scripts/validate-matter-vault-r4-aws-env-plan.mjs` | Errors unless temporary runtime `real_client_data_used` is false; future true belongs to CTI production-ready validator, not temporary-runtime claim. |
| final release packet validator | `scripts/validate-lcx-full-final-release-packet.mjs` | Hard-asserts release preflight false; future true must not rewrite old release proof. |
| API descriptors | `apps/api/src/server.js`, `apps/api/src/master-data-context.js` | `uses_real_client_data: true` exists in descriptors; S6 must distinguish descriptor truth from receipt boundary truth. |

## Blocked Execution Rule

S0-T04 must complete before S0-T03. No S1+ risk-A work, production migration, account password generation or distribution, CUTOVER, Entra ID/OIDC implementation, DB conversion, production_ready claim, or go-live claim may follow from this kickoff without a new goal and approval_ref.
