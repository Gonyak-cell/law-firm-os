# Locked-Domain Unlock Packets

Status: blocked_pending_owner_external_receipts
Date: 2026-06-21
Prepared for: LCX6

## Boundary

This document prepares unlock packets for launch domains that cannot be closed
by repo code alone. It does not approve production persistence, real tenant
data, external identity, Microsoft 365 access, WORM storage, staging cutover,
owner deferrals, or go-live.

Current repo state supports a runtime-ready candidate. Launch remains blocked
until owner decisions and external receipts are recorded in the launch evidence
system.

## Current Source Of Truth

| Source | Current state |
| --- | --- |
| `docs/runtime-spine/runtime-spine-ledger.json` | `runtime_ready_candidate_claim: true`; `actual_launch_go_live_claim: false` |
| `docs/runtime-spine/launch-tuw-crosswalk.md` | LT-L2-W01, LT-L2-W02, LT-L2-W03, and LT-L2-W07 remain blocked launch packets |
| `docs/runtime-spine/evidence/g6-runtime-ready-evidence.json` | RS-6/RTG-001 through RTG-005 passed for repo runtime-ready candidate only |
| `docs/launch/launch-owner-approval-receipt-ledger.md` | 4 pending receipt slots; 0 real owner receipts |
| `docs/launch/launch-evidence-acceptance-matrix.md` | 36 pending acceptance rows; `go_live_all_pass: false` |
| `docs/launch/launch-no-go-claim-policy-audit.md` | No-go policy is active; no forbidden true go-live claims |

## Unlock Sequence

1. Owner decision intake for hosting, DB, WORM, RPO/RTO, tenant model, auth
   provider, Graph scope, and launch authority.
2. Production persistence and WORM store receipts.
3. External trust boundary receipts: SSO/MFA, tenant isolation, server-derived
   principal, and network boundary.
4. Production-equivalent write path and audit chain receipts.
5. Runtime integration receipts in staging or the approved equivalent.
6. Locked future-domain receipts for Portal, M365, HR real data, AI, and Vault
   import/sync.
7. Owner approval receipt ledger update, launch decision register import, and
   go/no-go decision.

## Packet LCX6-UP-01 - Production Persistence And Store Family

| Field | Value |
| --- | --- |
| Primary blockers | LT-L2-W01, LT-L3-W04, LT-L3-W05 |
| Runtime Spine relation | RS-1 supports persistence shape; does not close launch persistence |
| Decision refs | DEC-RS-001, LT-L1-W06, MAT-DEC-03 |
| Unlock authority | Architecture Owner, Product Owner, Security Owner, Operations Owner |
| Current state | Blocked pending hosting, DB, WORM, RPO/RTO, backup, migration, and restore decisions |

Required receipts:

- Owner-approved hosting model, region, relational DB, index/search/vector
  store, object/document-original boundary, and monitoring stack.
- WORM-equivalent audit store with append proof, overwrite denial, mutation
  block, and legal-hold purge block evidence.
- Approved RPO/RTO values for DB, audit, index, and document-original boundary.
- Migration up/down receipt, rollback receipt, backup/restore rehearsal, and
  tenant-scoped store smoke output.
- Secret-free data-layer responsibility map.

Post-receipt verification:

- `npm run runtime-spine:rs1:persistence:validate`
- `npm run runtime-spine:rs1:tenant-data:validate`
- `npm run runtime-spine:readiness:validate`
- Future staging store smoke and restore rehearsal commands recorded with
  timestamps and operator/verifier.

Non-claims:

- This packet does not select a DB or WORM provider.
- This packet does not authorize real tenant data.

## Packet LCX6-UP-02 - Trust Boundary And Identity

| Field | Value |
| --- | --- |
| Primary blockers | LT-L2-W02, LT-L3-W03, LT-L3-W10 |
| Runtime Spine relation | RS-2 supports trust-boundary shape; does not close launch AuthN/AuthZ |
| Decision refs | DEC-RS-002, DEC-RS-003 |
| Unlock authority | Security Owner, Product Owner, Microsoft 365 Owner |
| Current state | Blocked pending tenant model, auth provider, SSO/MFA, network boundary, and server-derived identity receipts |

Required receipts:

- Owner-approved tenant deployment model and production auth provider.
- OIDC/SAML/SCIM/MFA/passkey scope decision or explicit exclusion.
- Entra/IdP SSO E2E report covering authenticated 200, unauthenticated 401/403,
  expired-token denial, and cross-tenant rejection.
- User-to-Employee mapping bootstrap and reconciliation with mismatch count 0.
- Reverse proxy/TLS/domain/CORS/security-header receipt and vault secret
  inventory without secret values.
- Server-derived principal/role/permission context evidence for production
  routes.

Post-receipt verification:

- `npm run runtime-spine:rs2:trust-boundary:validate`
- HRX authz/tenant-isolation route tests.
- Future SSO/MFA E2E and mapping reconciliation command receipts.

Non-claims:

- This packet does not grant IdP access or admin consent.
- Synthetic/local auth evidence does not count as production identity approval.

## Packet LCX6-UP-03 - Write Path And Non-Bypassable Audit

| Field | Value |
| --- | --- |
| Primary blockers | LT-L2-W03 plus LT-L2-W01 and LT-L2-W02 prerequisites |
| Runtime Spine relation | RS-3 and RS-5 support write/audit shape; launch write path remains predecessor-blocked |
| Unlock authority | Architecture Owner, Security Owner, Product Owner |
| Current state | Repo-local write/runtime evidence exists; production-equivalent write path receipts remain external/owner blocked |

Required receipts:

- Approved Wave 1 production write API/event surface.
- Unit-of-work proof for domain write plus audit append.
- Idempotency store proof and replay/duplicate prevention receipt.
- Event outbox or equivalent durable event dispatch receipt.
- Permission-before-write and classification-before-share proof.
- Rollback/fault-injection receipt proving no partial unauthorized state.
- Audit chain verification over the approved persistent audit store.

Post-receipt verification:

- `npm run runtime-spine:rs3:audit:validate`
- `npm run runtime-spine:rs5:app-surface:validate`
- API regression tests for Client, Matter, People, and cross-context write
  paths.
- Future staging write-path smoke receipts.

Non-claims:

- LCX5 local API smoke does not prove production write cutover.
- This packet does not approve bypassing W01 or W02 prerequisites.

## Packet LCX6-UP-04 - Runtime Integration And Launch Evidence

| Field | Value |
| --- | --- |
| Primary blockers | LT-L2-W07, launch evidence acceptance rows G2-E01 through G10-E03 |
| Runtime Spine relation | RS-6 harness/RTG evidence supports repo runtime-ready candidate; does not close launch terminal packets |
| Unlock authority | Verification Owner, Operations Owner, Security Owner, Product Owner |
| Current state | Repo RTG evidence exists; staging/external receipts and owner launch approval are absent |

Required receipts:

- Runtime integration run against staging or owner-approved equivalent.
- RTG-001 through RTG-005 links that resolve to current evidence.
- Production rerun receipt for verification gate and regression commands.
- Ethical wall, pentest/PIPA, bypass matrix, backup/restore, WORM, rollback,
  performance, SLO, support, and runbook tabletop receipts as required by the
  launch evidence acceptance matrix.
- Launch decision register entries imported only after real owner receipts.

Post-receipt verification:

- `npm run runtime-spine:rs6:integration:validate`
- `npm run runtime-spine:launch-crosswalk:validate`
- `npm run runtime-spine:readiness:validate`
- Future launch evidence acceptance and owner receipt validators.

Non-claims:

- Runtime integration PASS in repo does not equal go-live.
- Generated audit PASS files are not launch approval.

## Packet LCX6-UP-05 - Locked Future Domains

| Domain | Current lock | Required unlock receipt |
| --- | --- | --- |
| Portal | Locked until external ACL gate | Tenant/client ACL receipt, share boundary receipt, client-visible smoke |
| Outlook/M365 | Locked until Graph admin consent gate | Tenant admin confirmation, approved Graph scope register, Entra app registration, admin consent export |
| HR real data | Locked until HR owner and identity gate | HR owner approval, identity mapping reconciliation, HR sensitive store count policy, privacy/PIPA receipt |
| AI | Synthetic-only until external AI policy gate | AI policy approval, source/citation policy, human-review routing, no-final-decision guard receipt |
| Vault import/sync | Locked until export-only and source-boundary gate | MAT-DEC-03 storage decision, source-of-truth receipt, import/sync reconciliation, rollback-ready attestation |

Post-receipt verification:

- Domain-specific route/API/UI tests.
- Launch acceptance rows for G5, G7, and G8 where applicable.
- No real-data smoke until the relevant owner gate is recorded.

Non-claims:

- This packet keeps each domain locked until its own receipt is present.
- One domain unlock does not unlock the others.

## Packet LCX6-UP-06 - Owner Approval And Go/No-Go

| Field | Value |
| --- | --- |
| Primary blockers | Pending owner receipts, blocked PRE-L9 phase exits, pending launch evidence acceptance rows |
| Current state | 4 pending owner receipt slots; 0 real owner receipts |
| Unlock authority | Named owner(s) in receipt ledger and final go/no-go approvers |

Required receipts:

- Real owner responses for `COVERAGE-ALL-GO-LIVE`,
  `COVERAGE-L9-STABILIZATION`, `COVERAGE-ALL-BLOCKED-WP`, and
  `COVERAGE-ALL-PHASE-EXITS`.
- Required fields: owner, decision, basis, date or revisit gate,
  approval signature reference, received at, recorded by human.
- Launch decision register import after receipt validation passes.
- Joint signoff artifact and go/no-go decision table.

Post-receipt verification:

- Owner approval receipt ledger validation.
- Launch decision register import validation.
- Launch authority traceability audit.
- Final go/no-go decision check.

Non-claims:

- Pending request cards are not approval.
- Owner deferrals are not approved until real receipt evidence is present.
- Go-live remains blocked while `actual_launch_go_live_claim` is false.

## LCX6 Disposition

| Claim | Disposition |
| --- | --- |
| Unlock packets prepared | Complete |
| Repo runtime-ready candidate | Supported by current Runtime Spine evidence |
| LT-L2-W01/W02/W03/W07 launch terminal closeout | Still blocked |
| External receipts | Still required |
| Owner approvals | Still required |
| Production/go-live | Still blocked |
