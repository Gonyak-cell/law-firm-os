# L3 SharePoint OneDrive File Ref Blocker Survey

Status: blocked_pending_storage_decision_m365_admin_and_sharepoint_provisioning

Work package: LT-L3-W08

Terminal TUW: LT-L3-W08-T04

Gate binding: G5, L3-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:24:29Z

## Boundary

This survey records why LT-L3-W08 cannot close from current repo evidence. It
does not decide MAT-DEC-03, does not choose SharePoint/OneDrive storage, does
not create sites or libraries, does not call Graph, and does not validate a
runtime file_ref round trip.

## Dependency State

| Dependency | Current audit status | Impact on W08 |
| --- | --- | --- |
| LT-PRE-W03 | `blocked_pending_storage_decision` / `command_evidence_only_blocked` | MAT-DEC-03 document-original storage decision is not owner-approved. |
| LT-L1-W02 | `decision_round_brief_blocked_pending_owner_decisions` / `command_evidence_only_blocked` | OQ-001 SharePoint topology decision is not approved. |
| LT-L3-W07 | `blocked_pending_m365_admin_graph_scope_entra_registration_and_admin_consent` / `standard_five_blocked` | M365 admin, Graph scopes, Entra apps, and consent are absent. |

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| file_ref convention | absent | `docs/launch/l3/file-ref-convention.md` is missing |
| SharePoint provisioning record | absent | `docs/launch/l3/sharepoint-provisioning-record.md` is missing |
| file_ref roundtrip report | absent | `docs/launch/l3/file-ref-roundtrip-report.md` is missing |
| W08 evidence files | absent | W08 file-ref/provisioning evidence search returned `0` |
| Runtime integration files | absent | SharePoint/OneDrive/Graph/file-ref runtime file search returned `0` |
| MAT-DEC-03 | blocked | Storage decision brief says Codex cannot choose SharePoint/OneDrive or object storage |
| M365 runtime contract | storage sealed | contract has `storage_decision_resolved=false` and five storage-dependent items blocked |

## G5 Basis

LT-L3-W08 contributes the G5 M365 storage/provisioning proof. Current evidence
has no approved storage topology, no file_ref schema, no site/library
provisioning export, no Graph folder create/read output, no permission-inheritance
export, and no upload interruption partial-state test.

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L3-W08-T01 | file_ref convention and matter folder structure reflecting OQ-001 | MAT-DEC-03 and OQ-001 are not approved | blocked |
| LT-L3-W08-T02 | SharePoint/OneDrive site and matter folder provisioning across environments | W07 admin consent and T01 convention are absent | blocked |
| LT-L3-W08-T03 | file_ref upload/resolve/download round trip and partial-state prevention | Provisioned site/library and file_ref runtime are absent | blocked |
| LT-L3-W08-T04 | W08 provisioning and G5 evidence bundle | T01-T03 evidence and provisioning record are absent | blocked |

## Next Required Actions

1. Close MAT-DEC-03 and OQ-001 with owner-approved storage/topology decisions.
2. Close L3-W07 admin consent before any Graph provisioning claim.
3. Create the file_ref convention and validate sample instances.
4. Provision test site/library and run Graph/file_ref roundtrip checks using synthetic data only.
