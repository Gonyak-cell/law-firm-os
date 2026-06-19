# MAT-DEC-03 Storage Decision Brief

Status: blocked_pending_storage_decision
Recorded at: 2026-06-18T10:10:01Z
Work package: LT-PRE-W03
Terminal TUW: LT-PRE-W03-T02

## Current Decision State

`workbook/absorption-package/06_오픈_결정_레지스터.md` still records MAT-DEC-03 as deferred/pending for document original storage. Codex cannot choose SharePoint/OneDrive or object storage on behalf of the launch owner.

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

`contracts/email-dms-m365-runtime-contract.json` has five storage-dependent items with `blocked_until_storage_decision: true`.

| ID | Sealed item | Why MAT-DEC-03 matters |
|---|---|---|
| M365-STOR-001 | SharePoint/OneDrive matter folder upload | Fixes whether matter file upload writes to Graph Drive or another storage layer. |
| M365-STOR-002 | email body original storage target | Fixes the evidence source of filed email body originals. |
| M365-STOR-003 | attachment binary storage target | Fixes where attachment originals live and how file digests/retention apply. |
| M365-STOR-004 | Graph files write surface | Fixes whether Graph file writes are in the runtime path. |
| M365-STOR-005 | Vault export/import storage bridge | Fixes how Obsidian/Vault export-import bridges to source document storage. |

Command count note: the raw `grep -c "blocked_until_storage_decision"` output is 6 because the contract also contains one policy flag at `m365_runtime_acceptance_criteria.files`. The sealed item count is 5 when counting `"blocked_until_storage_decision": true` rows under `storage_dependency_partition.storage_dependent`.

## Option Comparison

| Option | Permission impact | Audit/evidence impact | Retention/legal hold impact | Implementation impact |
|---|---|---|---|---|
| SharePoint/OneDrive original storage | Must reconcile SharePoint sharing state with matter ACL and fail closed on divergence. | Filing audit can point to Graph drive item/version IDs plus matter Document IDs. | Can lean on M365 retention/legal hold, but Law Firm OS must record responsibility boundaries. | Keeps Plan A M365 document flow closest to source docs; requires Graph scope/admin consent and M365 admission. |
| Object storage original storage | Law Firm OS owns object-level authorization and signed URL policy. | Filing audit must record object key/digest/version and Graph-origin metadata separately. | Law Firm OS must provide retention/legal hold mechanics or integrate WORM/retention storage. | Requires redesign of filing flow F07 and attachment flow A03 for copy-into-object-store behavior. |

## Block Record

| ID | Owner role | Required decision | Blocking scope | Status |
|---|---|---|---|---|
| ESC-LT-PRE-W03-001 | Launch owner / document storage architecture approver | Decide SharePoint/OneDrive original storage vs object storage, with basis and decision date | PRE-EXIT, M365 admission, Outlook filing, L2 document runtime, L3 M365 provisioning, R8 Vault disposition | open |

## T02 Boundary

LT-PRE-W03-T02 cannot honestly create the unseal referral or scope-revision judgment until T01 is decided. No `docs/launch/mat-dec-03-unseal-referral.md` file is created by this blocked record.

## Non-Weakening Boundary

This brief does not unseal M365 storage-dependent items, does not modify the M365 runtime contract, does not add units, does not rewrite closed CP evidence, and does not approve production data use.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
