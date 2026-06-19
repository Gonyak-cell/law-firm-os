# MAT-DEC-03 Storage Decision Brief

Status: blocked_runtime_pending_owner_decision_resolved
Recorded at: 2026-06-18T10:10:01Z
Work package: LT-PRE-W03
Terminal TUW: LT-PRE-W03-T02

## Current Decision State

`workbook/absorption-package/06_오픈_결정_레지스터.md` now records MAT-DEC-03 as decided by the Managing Partner/System Admin on 2026-06-19.

Decision: SharePoint/OneDrive is approved as the Law Firm OS document original storage.

The deadline anchor in `workbook/launch-tuw/10_PRE.md` is before RP06/08 runtime contract creation and before RP22/23 start. The live repo is now after CP completion:

| Measurement | Value |
|---|---:|
| closeout_complete | true |
| live_latest_pack_id | CP00-987 |
| live_next_unit_id | null |
| remaining RP22/RP23 pack count | 0 |
| closed RP22 pack count | 28 |
| closed RP23 pack count | 28 |

## Storage-Dependent Sealed Items

`contracts/email-dms-m365-runtime-contract.json` has five storage-dependent items that are no longer blocked by storage decision. They remain gated by M365 admin consent, Graph scope, SharePoint/OneDrive provisioning, and runtime evidence.

| ID | Sealed item | Why MAT-DEC-03 matters |
|---|---|---|
| M365-STOR-001 | SharePoint/OneDrive matter folder upload | Fixes whether matter file upload writes to Graph Drive or another storage layer. |
| M365-STOR-002 | email body original storage target | Fixes the evidence source of filed email body originals. |
| M365-STOR-003 | attachment binary storage target | Fixes where attachment originals live and how file digests/retention apply. |
| M365-STOR-004 | Graph files write surface | Fixes whether Graph file writes are in the runtime path. |
| M365-STOR-005 | Vault export/import storage bridge | Fixes how Obsidian/Vault export-import bridges to source document storage. |

Contract note: `storage_decision_ref` points to `docs/launch/g1-owner-decisions-2026-06-19.md#mat-dec-03`, and each storage-dependent item retains `remaining_gate: m365_admin_graph_scope_and_runtime_evidence`.

## Option Comparison

| Option | Permission impact | Audit/evidence impact | Retention/legal hold impact | Implementation impact |
|---|---|---|---|---|
| SharePoint/OneDrive original storage | Must reconcile SharePoint sharing state with matter ACL and fail closed on divergence. | Filing audit can point to Graph drive item/version IDs plus matter Document IDs. | Can lean on M365 retention/legal hold, but Law Firm OS must record responsibility boundaries. | Keeps Plan A M365 document flow closest to source docs; requires Graph scope/admin consent and M365 admission. |
| Object storage original storage | Law Firm OS owns object-level authorization and signed URL policy. | Filing audit must record object key/digest/version and Graph-origin metadata separately. | Law Firm OS must provide retention/legal hold mechanics or integrate WORM/retention storage. | Requires redesign of filing flow F07 and attachment flow A03 for copy-into-object-store behavior. |

## Block Record

| ID | Owner role | Required decision | Blocking scope | Status |
|---|---|---|---|---|
| ESC-LT-PRE-W03-001 | Launch owner / document storage architecture approver | Decide SharePoint/OneDrive original storage vs object storage, with basis and decision date | PRE-EXIT, M365 admission, Outlook filing, L2 document runtime, L3 M365 provisioning, R8 Vault disposition | resolved_owner_decision_recorded_runtime_pending |

## T02 Boundary

LT-PRE-W03-T02 can now create `docs/launch/mat-dec-03-unseal-referral.md`. The referral removes the storage-decision blocker only; it does not claim M365 runtime readiness.

## Non-Weakening Boundary

This brief unseals the owner decision for M365 storage-dependent items, modifies only the M365 runtime decision contract, does not add units, does not rewrite closed CP evidence, and does not approve production data use.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
