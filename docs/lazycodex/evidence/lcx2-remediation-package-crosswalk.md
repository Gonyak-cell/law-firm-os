# LCX2 Remediation Package Crosswalk Evidence

Status: passed
Date: 2026-06-21
Branch: codex/runtime-spine-launch-tuw-crosswalk

## Source Package

Attached package path:

```text
/Users/jws/Documents/Codex/law firm os runtime/law_firm_os_remediation_package_v1_0/
```

Primary files reviewed:

- `00_PACKAGE_README.md`
- `02_P0_Runtime_Foundation_Spec.md`
- `03_Client_Remediation_PRD_SRS.md`
- `04_Matter_Remediation_PRD_SRS.md`
- `05_People_HRX_Remediation_PRD_SRS.md`
- `09_TUW_Backlog_and_Sprint_Plan.md`
- `13_Traceability_Matrix.md`
- `runtime_evidence_baseline.json`
- `claim_evidence_taxonomy.json`
- `missing_requested_files.json`

## Package Claim Boundary

The package itself states that descriptor, plan, and synthetic fixture evidence
do not support runtime-ready claims. It also states that go-live or
production-ready wording must not be used until the UAT/go-live gate pack is
closed.

That boundary remains valid for LCX2.

## Current Repo Validation Snapshot

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run final-product-completion-gate:validate` | PASS | `commit_evidence_count: 987`; `missing_pack_count: 0`; no findings |
| `npm run runtime-spine:plan:validate` | PASS | 124 TUWs; `runtime_ready_candidate_claim: true`; `actual_launch_go_live_claim: false` |
| `npm run runtime-spine:readiness:validate` | PASS | 121 closed TUWs; launch blockers remain `LT-L2-W01,LT-L2-W02,LT-L2-W03,LT-L2-W07` |
| `npm run runtime-spine:launch-crosswalk:validate` | PASS | 7 mapped spines; go-live claim remains false |
| `npm run runtime-spine:rs1:persistence-ready:validate` | PASS | RS-1 ready-candidate validator passed |
| `npm run runtime-spine:rs1:persistence:validate` | EXPECTED FAIL-CLOSED | `RS-1A must not claim runtime_ready candidate` |
| `npm run runtime-spine:rs1:tenant-data:validate` | EXPECTED FAIL-CLOSED | RTG-002/RTG-003 partial and RS-1B no ready-candidate guard |
| `npm run runtime-spine:rs2:trust-boundary:validate` | PASS | RS-2 trust-boundary ready candidate |
| `npm run runtime-spine:rs3:audit:validate` | PASS | RS-3 audit ready candidate |
| `npm run runtime-spine:rs4:canonical-model:validate` | PASS | RS-4 Client-Matter-People canonical model ready candidate |
| `npm run runtime-spine:rs5:app-surface:validate` | PASS | RS-5 app surface ready candidate |
| `npm run runtime-spine:rs6:integration:validate` | PASS | RS-6 integration ready candidate; go-live claim false |
| `npm run client-matter:cmp-v1:validate` | PASS | 316 TUWs; 13 gates; `claim_boundary: not_r4_ready` |
| `npm run client-matter:cmp-v1:g2:validate` | PASS | G2 runtime TUWs with evidence `19/19` |
| `npm run client-matter:cmp-v1:g3:validate` | PASS | G3 runtime TUWs with evidence `24/24` |
| `npm run client-matter:cmp-v1:g4:validate` | PASS | G4 runtime TUWs with evidence `23/23` |
| `npm run client-matter:cmp-v1:g7:validate` | PASS | G7 runtime TUWs with evidence `26/26` |
| `npm run client-matter:cmp-v1:g11:validate` | PASS | G11 runtime TUWs with evidence `48/48` |
| `npm run rp04:master-data:validate` | PASS | RP04 contract export snapshot repaired; current pack `CP00-176` |
| `npm run rp05:matter-core:validate` | PASS | Matter core production-ready candidate true; current pack `CP00-197` |
| `npm run rp09:crm-core:validate` | PASS | CRM core production-ready candidate true; current pack `CP00-320` |
| `npm run rp30:hrx:validate` | PASS | HRX People contract passed; current pack `CP00-987` |
| `npm run hrx:runtime:validate` | PASS | HRX runtime readiness validation passed |
| `npm run matter-vault:r4:readiness` | PASS | 118 closed TUWs; go-live claim false |

## Crosswalk

| Package TUW | Package concern | Current repo status | LCX disposition |
| --- | --- | --- | --- |
| LFO-COM-P0-001 | Evidence taxonomy and source hierarchy | Package taxonomy exists; final-product gate and Runtime Spine validators enforce several claim boundaries | Covered for LCX2; keep taxonomy as reference, not a new runtime claim |
| LFO-COM-P0-002 | Durable persistence and migration harness | `runtime-spine:rs1:persistence-ready:validate` passes, but RS-1A/RS-1B subvalidators intentionally fail closed against premature ready claims | Partially covered; move production persistence decision to LCX3 |
| LFO-COM-P0-003 | Non-bypassable durable audit | `runtime-spine:rs3:audit:validate` passes | Covered as ready-candidate; LCX5 still needs observable QA |
| LFO-COM-P0-004 | Authentication and tenant trust boundary | `runtime-spine:rs2:trust-boundary:validate` passes | Covered as ready-candidate; LCX5 must still exercise route behavior |
| LFO-COM-P0-005 | Runtime permission store and deny-over-allow tests | RS-2/RS-4/CMP G4/G7 validators pass | Covered as repo evidence; manual denied-path QA remains LCX5 |
| LFO-CLI-P0-001 | Client/Party durable master runtime | CMP G2 passes `19/19`; RP04 passes after contract export snapshot sync | Covered for current repo; Client manual flow moves to LCX4/LCX5 |
| LFO-CLI-P0-002 | Duplicate merge/split workbench | CMP G2 and RP04 pass, including Master Data service/export surface | Covered as repo evidence; UI/API observable check remains LCX5 |
| LFO-CLI-P1-001 | CRM lead/opportunity/activity runtime | CMP G3 and RP09 pass | Covered as repo evidence; CRM/intake flow drive remains LCX4 |
| LFO-CLI-P1-002 | Intake/conflict/engagement boundary | CMP G3/G4 and Matter validators pass | Covered as repo evidence; Matter opening flow drive remains LCX4 |
| LFO-MAT-P0-001 | Matter opening, numbering, clearance token runtime | CMP G4 passes `23/23`; RP05 passes | Covered as repo evidence; LCX4 must drive the opening flow |
| LFO-MAT-P0-002 | Matter team, roles, permissions, ethical wall | CMP G4 and Runtime Spine RS-4/RS-5 pass | Covered as repo evidence; denied-path QA remains LCX5 |
| LFO-MAT-P1-001 | Task/deadline/workflow/review queue | CMP G4/G11 and Runtime Spine RS-5 pass | Covered as repo evidence; observable UI/API evidence remains LCX5 |
| LFO-MAT-P1-002 | DMS workspace and email filing sandbox | Matter-Vault R4 readiness passes; launch go-live claim false | Covered as repo readiness; external/storage receipts remain LCX6 when applicable |
| LFO-BIL-P1-001 | Time/WIP/invoice/AR/profitability MVP | CMP and Runtime Spine evidence covers billing-adjacent readiness, but production accounting/ERP receipts are not owner-approved | Partial; keep production finance/ERP unlock in LCX6 |
| LFO-PEO-P0-001 | Employee registry and User/Employee split | CMP G7, RP30, and HRX runtime validation pass | Covered for current repo; People flow drive remains LCX4 |
| LFO-PEO-P0-002 | HR sensitive data guard | CMP G7 and HRX runtime validation pass | Covered as repo evidence; denied-path QA remains LCX5 |
| LFO-PEO-P1-001 | HR document, consent, retention workspace | HRX runtime and RP30 pass | Covered as repo evidence; external HR owner/data approvals remain LCX6 |
| LFO-PEO-P1-002 | Leave/attendance/overtime deterministic rule engine | HRX runtime validation passes | Covered as repo evidence; manual scenario evidence remains LCX5 |
| LFO-COM-P2-001 | UAT, DR, observability, go-live gate pack | Runtime Spine readiness preserves launch blockers and false go-live claim | Not closed by LCX2; split across LCX5 and LCX6 |

## Stale Package Findings

The package baseline says Master Data is read-only/synthetic, Matter core is
descriptor-only, and HRX runtime is closed. Current repo evidence has advanced:

- CMP v1 validates 316 TUWs with `claim_boundary: not_r4_ready`.
- RP04, RP05, RP09, RP30 validators pass after RP04 export snapshot sync.
- HRX runtime readiness now passes.
- Matter-Vault R4 readiness passes with go-live claim false.

Therefore the package is useful as a remediation taxonomy, but not as the final
truth for current repo readiness.

## Repo Repair Made During LCX2

`contracts/master-data-contract.json` had a stale `public_exports` snapshot. The
validator compares that array to `Object.keys(packageExports).sort()`, and the
contract was missing current exports such as `MASTER_DATA_AUDIT_SOURCE`,
`MASTER_DATA_REPOSITORY_MIGRATIONS`, `appendMasterDataAuditEvent`,
`createMasterDataRepository`, service factories, and reference-integrity exports.

The snapshot was regenerated from `packages/master-data/src/index.js`, and
`npm run rp04:master-data:validate` now passes.

## Residual Work

| LCX | Residual |
| --- | --- |
| LCX3 | Resolve production persistence decisions and RS-1 fail-closed subvalidator boundaries. |
| LCX4 | Drive Client, Matter, and People flows through code surfaces. |
| LCX5 | Capture local UI/API manual QA, including denied paths. |
| LCX6 | Prepare locked-domain external receipt and owner approval packets. |

## Boundary

LCX2 reconciles the remediation package with current repo truth and repairs one
contract/export drift. It does not claim production go-live, external receipt
completion, or owner approval.
